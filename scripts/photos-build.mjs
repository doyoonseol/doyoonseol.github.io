/**
 * Turns the `photos/` folder into the site's gallery. No code involved.
 *
 * Drop image files into `photos/` and run `npm run photos` — or just commit them,
 * because CI runs this during every deploy. For each source image this script:
 *
 *   - generates WebP renditions at up to five widths (never upscaling)
 *   - reads EXIF for camera, lens, focal length, aperture, shutter, ISO and date
 *   - reads IPTC/XMP for title, caption and alt text, so metadata written in
 *     Lightroom or Capture One is picked up with no extra effort
 *   - builds a tiny inline blur placeholder
 *   - writes src/data/photos.generated.json, which the site reads
 *
 * Conventions, all optional:
 *
 *   01-harbour.jpg        numeric prefix sets the order (stripped from the title)
 *   01-harbour-raw.jpg    pairs as the unprocessed version of 01-harbour.jpg
 *   01-harbour.json       overrides any field the file's own metadata got wrong
 *
 * Everything it writes is gitignored. `photos/` is the only thing in version
 * control, so the repository never accumulates generated artefacts.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import exifr from "exifr";
import sharp from "sharp";

const ROOT = join(import.meta.dirname, "..");
const SRC_DIR = join(ROOT, "photos");
const OUT_DIR = join(ROOT, "public", "img");
const DATA_DIR = join(ROOT, "src", "data");
const DATA_FILE = join(DATA_DIR, "photos.generated.json");
const CACHE_FILE = join(ROOT, ".photo-cache.json");

/**
 * WebP only, and no JPEG fallback. Every browser this design already targets
 * supports it — Tailwind v4 requires Safari 16.4+, and WebP landed in Safari 14 — so
 * a fallback ladder would double both encode time and published bytes to serve nobody.
 *
 * WebP over AVIF was measured, not assumed: across these five widths AVIF took
 * 5037ms against WebP's 754ms, for 26% fewer bytes. Since this runs in CI, that 6.7x
 * is time the owner waits after uploading a photograph, and the bytes saved buy
 * nothing against a 1 GB limit that still leaves ~950 photographs of headroom.
 */
const WIDTHS = [480, 960, 1440, 1920, 2560];
const QUALITY = 78;
const LQIP_WIDTH = 24;

const SOURCE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".avif"]);
const RAW_SUFFIX = "-raw";

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const log = (...a) => console.log(...a);
const warn = (...a) => console.warn("  !", ...a);

/* ---------------------------------------------------------------------------
 * Metadata helpers
 * ------------------------------------------------------------------------ */

/** "01-reykjavik-harbour" -> "Reykjavik Harbour" */
function titleFromSlug(slug) {
  return slug
    .replace(/^\d+[-_.\s]*/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const clean = (v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
};

/** Cameras report Make and Model separately, and often redundantly. */
function cameraName(tags) {
  const make = clean(tags.Make);
  const model = clean(tags.Model);
  if (!make) return model;
  if (!model) return make;
  // "NIKON CORPORATION" + "NIKON Z 6" must not become "NIKON CORPORATION NIKON Z 6".
  const firstWord = make.split(/\s+/)[0].toLowerCase();
  if (model.toLowerCase().startsWith(firstWord)) return model;
  return `${make} ${model}`;
}

/** EXIF stores shutter as a fraction of a second. Photographers read "1/250". */
function shutterLabel(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  if (seconds >= 1) return String(Number(seconds.toFixed(1)));
  return `1/${Math.round(1 / seconds)}`;
}

function monthYear(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/**
 * Pulls what it can from the file's own metadata.
 *
 * IPTC and XMP are requested explicitly — exifr does not read them by default, and
 * they are where Lightroom and Capture One put the title and caption. That is the
 * whole reason this workflow needs no code: the fields a photographer already fills
 * in while editing arrive with the file.
 */
async function readEmbedded(buffer, file) {
  let tags = {};
  try {
    tags =
      (await exifr.parse(buffer, {
        tiff: true,
        ifd0: true,
        exif: true,
        gps: false, // Deliberately never read. See docs/decisions/0003.
        iptc: true,
        xmp: true,
        translateKeys: true,
        translateValues: true,
        reviveValues: true,
      })) ?? {};
  } catch (error) {
    warn(`${file}: could not read metadata (${error.message}). Continuing without it.`);
  }

  const focal = tags.FocalLength;
  const aperture = tags.FNumber ?? tags.ApertureValue;
  const iso = tags.ISO ?? tags.ISOSpeedRatings ?? tags.PhotographicSensitivity;

  return {
    // IPTC "Object Name" is Lightroom's Title box; XMP dc:title is the same field
    // under a different standard.
    title: clean(tags.ObjectName ?? tags.title ?? tags.Headline),
    caption: clean(tags.Caption ?? tags.description ?? tags.ImageDescription),
    // IPTC gained a dedicated accessibility field in 2021; few tools write it yet.
    alt: clean(tags.AltTextAccessibility ?? tags.AltText),
    location: clean(
      [clean(tags.City), clean(tags.Country ?? tags.CountryName)].filter(Boolean).join(", "),
    ),
    date: monthYear(tags.DateTimeOriginal ?? tags.CreateDate),
    shot: {
      camera: cameraName(tags),
      lens: clean(tags.LensModel ?? tags.Lens ?? tags.LensID),
      focalLength: typeof focal === "number" ? String(Math.round(focal)) : clean(focal),
      aperture:
        typeof aperture === "number" ? String(Number(aperture.toFixed(1))) : clean(aperture),
      shutter: shutterLabel(tags.ExposureTime),
      iso: typeof iso === "number" ? iso : clean(iso),
    },
  };
}

/* ---------------------------------------------------------------------------
 * Rendition building
 * ------------------------------------------------------------------------ */

/**
 * Writes the WebP ladder for one source file and returns what the site needs.
 *
 * `.rotate()` is applied before resizing, so a portrait frame recorded on a rotated
 * sensor is not delivered on its side. Dimensions are then taken from the encoder's
 * own output rather than from the source header, which is the only way to be certain
 * they describe the file actually being served.
 */
async function buildRendition(buffer, stem, hash) {
  const meta = await sharp(buffer).metadata();
  const sideways = typeof meta.orientation === "number" && meta.orientation >= 5;
  const sourceWidth = sideways ? meta.height : meta.width;

  /**
   * Largest width worth publishing: the source's own, or the 2560 ceiling.
   *
   * The ceiling is what keeps full-resolution files off the site even when one is
   * uploaded by mistake. The `0.9` guard drops any standard width that sits close to
   * the cap — a 2000px source should get 1440 and 2000, not 1440, 1920 and 2000,
   * which would encode two near-identical files.
   *
   * The cap is always appended rather than only taken from WIDTHS, because filtering
   * alone under-serves small sources: a 900px original would otherwise top out at the
   * 480 rendition and be displayed at half the detail it actually has.
   */
  const cap = Math.min(sourceWidth, Math.max(...WIDTHS));
  const widths = [...WIDTHS.filter((w) => w <= cap * 0.9), cap];

  const candidates = [];
  for (const width of widths) {
    const name = `${stem}.${hash}-${width}.webp`;
    const info = await sharp(buffer)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(join(OUT_DIR, name));
    candidates.push({ name, width: info.width, height: info.height });
  }

  const largest = candidates.reduce((a, b) => (b.width > a.width ? b : a));

  const lqip = await sharp(buffer)
    .rotate()
    .resize({ width: LQIP_WIDTH })
    .webp({ quality: 40 })
    .toBuffer();

  return {
    src: `/img/${largest.name}`,
    srcSet: candidates.map((c) => `/img/${c.name} ${c.width}w`).join(", "),
    width: largest.width,
    height: largest.height,
    lqip: `data:image/webp;base64,${lqip.toString("base64")}`,
    files: candidates.map((c) => c.name),
  };
}

/** `files` is bookkeeping for pruning; the site never needs it. */
function stripFiles(rendition) {
  const { files, ...rest } = rendition;
  void files;
  return rest;
}

/**
 * Deletes renditions no longer referenced by any source file.
 *
 * Called on every path, including when `photos/` is empty — removing the last
 * photograph has to clear its renditions too, or the export would keep shipping
 * images nothing links to.
 */
async function prune(keep) {
  let removed = 0;
  for (const name of await readdir(OUT_DIR)) {
    if (!keep.has(name)) {
      await rm(join(OUT_DIR, name), { force: true });
      removed += 1;
    }
  }
  return removed;
}

/* ---------------------------------------------------------------------------
 * Main
 * ------------------------------------------------------------------------ */

async function listSources() {
  let entries;
  try {
    entries = await readdir(SRC_DIR, { withFileTypes: true });
  } catch {
    return null; // folder absent
  }

  const images = [];
  const sidecars = new Map();

  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith(".")) continue;
    const ext = extname(entry.name).toLowerCase();
    if (ext === ".json") {
      sidecars.set(basename(entry.name, ext), entry.name);
    } else if (SOURCE_EXTS.has(ext)) {
      images.push(entry.name);
    }
  }

  images.sort(collator.compare);
  return { images, sidecars };
}

async function loadCache() {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf8"));
  } catch {
    return {};
  }
}

async function main() {
  const listing = await listSources();
  if (listing === null) {
    await mkdir(SRC_DIR, { recursive: true });
    log("Created photos/ — drop image files in there.");
  }

  const { images = [], sidecars = new Map() } = listing ?? {};

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });

  if (images.length === 0) {
    await writeFile(DATA_FILE, "[]\n", "utf8");
    await writeFile(CACHE_FILE, "{}\n", "utf8");
    const removed = await prune(new Set());
    log(
      "photos/ is empty — wrote an empty gallery, so the site falls back to placeholders." +
        (removed ? ` Removed ${removed} stale rendition(s).` : ""),
    );
    return;
  }

  // Split the unprocessed variants out; they attach to their edited counterpart.
  const rawFor = new Map();
  const mains = [];
  for (const name of images) {
    const stem = basename(name, extname(name));
    if (stem.toLowerCase().endsWith(RAW_SUFFIX)) {
      rawFor.set(stem.slice(0, -RAW_SUFFIX.length), name);
    } else {
      mains.push(name);
    }
  }

  const cache = await loadCache();
  const nextCache = {};
  const manifest = [];
  const keep = new Set();
  let built = 0;
  let reused = 0;

  const renditionFor = async (fileName) => {
    const buffer = await readFile(join(SRC_DIR, fileName));
    const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 8);
    const stem = basename(fileName, extname(fileName));
    const key = `${fileName}:${hash}`;

    let rendition = cache[key];
    if (rendition) {
      reused += 1;
    } else {
      rendition = await buildRendition(buffer, stem, hash);
      built += 1;
    }
    nextCache[key] = rendition;
    for (const f of rendition.files) keep.add(f);
    return { rendition, buffer, stem };
  };

  for (const fileName of mains) {
    const { rendition, buffer, stem } = await renditionFor(fileName);
    const embedded = await readEmbedded(buffer, fileName);

    let override = {};
    const sidecar = sidecars.get(stem);
    if (sidecar) {
      try {
        override = JSON.parse(await readFile(join(SRC_DIR, sidecar), "utf8"));
      } catch (error) {
        warn(`${sidecar}: not valid JSON (${error.message}). Ignoring it.`);
      }
    }

    const title = clean(override.title) ?? embedded.title ?? titleFromSlug(stem);
    const caption = clean(override.caption) ?? embedded.caption;
    const location = clean(override.location) ?? embedded.location;
    const date = clean(override.date) ?? embedded.date;

    // Alt text, best available. A photograph with no description is invisible to a
    // screen reader, so there is always *something* — but a title is a poor
    // substitute for a description, and saying so is better than failing the build
    // and blocking the whole no-code workflow.
    const alt = clean(override.alt) ?? embedded.alt ?? caption;
    if (!alt) {
      warn(
        `${fileName}: no alt text — falling back to the title. ` +
          `Fill the Caption field on export, or add "alt" to ${stem}.json.`,
      );
    }

    const shot = { ...embedded.shot, ...(override.metadata ?? {}) };
    const hasShot = Object.values(shot).some((v) => v !== undefined && v !== "");

    const rawName = rawFor.get(stem);
    const raw = rawName ? stripFiles((await renditionFor(rawName)).rendition) : undefined;

    manifest.push({
      id: stem,
      alt: alt ?? title,
      title,
      ...(caption ? { caption } : {}),
      ...(location ? { location } : {}),
      ...(date ? { date } : {}),
      image: stripFiles(rendition),
      ...(raw ? { raw } : {}),
      ...(hasShot ? { metadata: shot } : {}),
    });
  }

  await writeFile(DATA_FILE, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(CACHE_FILE, `${JSON.stringify(nextCache, null, 2)}\n`, "utf8");

  const pruned = await prune(keep);

  log(
    `${manifest.length} photograph${manifest.length === 1 ? "" : "s"} — ` +
      `${built} rendition set(s) built, ${reused} from cache` +
      `${pruned ? `, ${pruned} stale file(s) removed` : ""}.`,
  );
  for (const p of manifest) {
    const bits = [p.title];
    if (p.raw) bits.push("RAW");
    if (p.metadata?.camera) bits.push(p.metadata.camera);
    log(`  ${p.id.padEnd(24)} ${p.image.width}x${p.image.height}  ${bits.join(" · ")}`);
  }
}

await main();

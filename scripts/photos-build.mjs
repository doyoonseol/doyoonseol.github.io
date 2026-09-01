/**
 * Turns the `photos/` folder into the site's gallery. No code involved.
 *
 * Drop image files and matching `.json` sidecar metadata files into `photos/` and
 * run `npm run photos` — or just commit them, because CI runs this during every deploy.
 * For each source image this script:
 *
 *   - generates WebP renditions at up to five widths (never upscaling)
 *   - reads metadata exclusively from the matching `<name>.json` sidecar file
 *     (camera, focal length, aperture, shutter speed, ISO, and location)
 *   - builds a tiny inline blur placeholder
 *   - writes src/data/photos.generated.json, which the site reads
 *
 * Conventions:
 *
 *   01-harbour.jpg        numeric prefix sets the order (stripped from the title)
 *   01-harbour-raw.jpg    pairs as the unprocessed version of 01-harbour.jpg
 *   01-harbour.json       sidecar text file containing title, caption, alt, location, and shot metadata
 *
 * Everything it writes is gitignored. `photos/` is the only thing in version
 * control, so the repository never accumulates generated artefacts.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

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
    const { rendition, stem } = await renditionFor(fileName);

    let sidecarData = {};
    const sidecar = sidecars.get(stem);
    if (sidecar) {
      try {
        sidecarData = JSON.parse(await readFile(join(SRC_DIR, sidecar), "utf8"));
      } catch (error) {
        warn(`${sidecar}: not valid JSON (${error.message}). Ignoring it.`);
      }
    } else {
      warn(`${fileName}: no .json sidecar file found (${stem}.json).`);
    }

    const title = clean(sidecarData.title) ?? titleFromSlug(stem);
    const caption = clean(sidecarData.caption);
    const location = clean(sidecarData.location ?? sidecarData.metadata?.location);

    const alt = clean(sidecarData.alt) ?? caption ?? title;
    if (!alt) {
      warn(
        `${fileName}: no alt text — falling back to the title. ` +
          `Add "alt" to ${stem}.json.`,
      );
    }

    const m = sidecarData.metadata ?? sidecarData;
    const camera = clean(m.camera);
    const focalLength = clean(m.focalLength ?? m.focal);
    const aperture = clean(m.aperture ?? m.fNumber ?? m["F number"]);
    const shutter = clean(m.shutter ?? m.shutterSpeed ?? m["shutter speed"] ?? m.exposure);
    const iso = m.iso !== undefined && m.iso !== "" ? clean(m.iso) : undefined;

    const shot = {};
    if (camera) shot.camera = camera;
    if (focalLength) shot.focalLength = focalLength;
    if (aperture) shot.aperture = aperture;
    if (shutter) shot.shutter = shutter;
    if (iso !== undefined) shot.iso = iso;

    const hasShot = Object.keys(shot).length > 0;

    const rawName = rawFor.get(stem);
    const raw = rawName ? stripFiles((await renditionFor(rawName)).rendition) : undefined;

    manifest.push({
      id: stem,
      alt: alt ?? title,
      title,
      ...(caption ? { caption } : {}),
      ...(location ? { location } : {}),
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

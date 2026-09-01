/**
 * Turns the `photos/` folder into the site's gallery. No code involved.
 *
 * Drop an image and a matching `.json` file into `photos/` and commit them — CI runs
 * this during every deploy. For each image this script:
 *
 *   - generates WebP renditions at up to five widths (never upscaling)
 *   - builds a tiny inline blur placeholder
 *   - reads the accompanying `.json` for the title, alt text and shot details
 *   - writes src/data/photos.generated.json, which the site reads
 *
 * Conventions:
 *
 *   01-harbour.jpg        numeric prefix sets the running order
 *   01-harbour.json       its title, alt text and shot details
 *
 * ── Metadata comes only from the .json ─────────────────────────────────────
 * The file's own EXIF and IPTC are deliberately never read. An earlier version did,
 * and it was the wrong call: embedded metadata is inconsistent across cameras,
 * absent from scans, and mangled by some export pipelines, so what appeared on the
 * site depended on details the owner could not see or control. One hand-written file
 * per photograph is explicit and predictable instead.
 *
 * Only the fields listed in FIELDS are ever displayed. Anything absent is simply not
 * rendered.
 *
 * Everything this writes is gitignored. `photos/` is the only thing in version
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
 * nothing against a 1 GB limit that still leaves room for ~950 photographs.
 */
const WIDTHS = [480, 960, 1440, 1920, 2560];
const QUALITY = 78;
const LQIP_WIDTH = 24;

const SOURCE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".avif"]);

/**
 * The complete set of shot details the site will display, in display order.
 *
 * Adding a key here is all it takes to surface a new field; nothing else needs to
 * change. Removing one hides it everywhere.
 */
const FIELDS = ["camera", "focalLength", "aperture", "shutter", "iso", "location"];

/** Keys accepted in the sidecar beyond FIELDS. */
const CONTENT_FIELDS = ["title", "alt", "caption"];

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const log = (...a) => console.log(...a);
const warn = (...a) => console.warn("  !", ...a);

const clean = (v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
};

/** "01-reykjavik-harbour" -> "Reykjavik Harbour" */
function titleFromSlug(slug) {
  return slug
    .replace(/^\d+[-_.\s]*/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ---------------------------------------------------------------------------
 * Rendition building
 * ------------------------------------------------------------------------ */

/**
 * Writes the WebP ladder for one source file and returns what the site needs.
 *
 * `.rotate()` runs before resizing so a portrait frame shot on a rotated sensor is
 * not delivered on its side. This is the one thing still read from the file's EXIF —
 * the orientation flag — because it describes the pixels rather than the photograph.
 *
 * Dimensions come from the encoder's own output rather than the source header, which
 * is the only way to be certain they describe the file actually being served.
 */
async function buildRendition(buffer, stem, hash) {
  const meta = await sharp(buffer).metadata();
  const sideways = typeof meta.orientation === "number" && meta.orientation >= 5;
  const sourceWidth = (sideways ? meta.height : meta.width) ?? WIDTHS.at(-1);

  const widths = WIDTHS.filter((w) => w <= sourceWidth);
  if (widths.length === 0) widths.push(sourceWidth);

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

/** `files` is bookkeeping for pruning; the site never needs it in the manifest. */
function stripFiles(rendition) {
  const rest = { ...rendition };
  delete rest.files;
  return rest;
}

/* ---------------------------------------------------------------------------
 * Sources
 * ------------------------------------------------------------------------ */

async function listSources() {
  let entries;
  try {
    entries = await readdir(SRC_DIR, { withFileTypes: true });
  } catch {
    return null;
  }

  const images = [];
  const sidecars = new Set();

  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith(".")) continue;
    const ext = extname(entry.name).toLowerCase();
    if (ext === ".json") sidecars.add(basename(entry.name, ext));
    else if (SOURCE_EXTS.has(ext)) images.push(entry.name);
  }

  images.sort(collator.compare);
  return { images, sidecars };
}

async function readSidecar(stem) {
  const file = `${stem}.json`;
  let text;
  try {
    text = await readFile(join(SRC_DIR, file), "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      warn(`${file}: expected a JSON object. Ignoring it.`);
      return {};
    }
    for (const key of Object.keys(parsed)) {
      if (!FIELDS.includes(key) && !CONTENT_FIELDS.includes(key)) {
        warn(`${file}: "${key}" is not a field the site shows. Ignoring it.`);
      }
    }
    return parsed;
  } catch (error) {
    // A trailing comma should not silently blank a photograph's details.
    warn(`${file}: not valid JSON (${error.message}). Treating it as absent.`);
    return {};
  }
}

/**
 * Deletes anything in the output folder that the current set of photographs does not
 * claim. Renditions are content-hashed, so an edited photograph leaves its previous
 * files behind and a deleted one leaves all of them — and `public/` is copied
 * verbatim into the export, which would keep publishing both.
 */
async function prune(keep) {
  let removed = 0;
  let names = [];
  try {
    names = await readdir(OUT_DIR);
  } catch {
    return 0;
  }
  for (const name of names) {
    if (keep.has(name)) continue;
    await rm(join(OUT_DIR, name), { force: true });
    removed += 1;
  }
  return removed;
}

/* ---------------------------------------------------------------------------
 * Main
 * ------------------------------------------------------------------------ */

async function main() {
  const listing = await listSources();
  if (listing === null) {
    await mkdir(SRC_DIR, { recursive: true });
    log("Created photos/ — drop image files in there.");
  }

  const { images = [], sidecars = new Set() } = listing ?? {};

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });

  if (images.length === 0) {
    await writeFile(DATA_FILE, "[]\n", "utf8");
    await writeFile(CACHE_FILE, "{}\n", "utf8");
    // Still prune. Returning early here left renditions of deleted photographs in
    // public/img, and since public/ is copied into the export they would stay
    // published and keep counting against the 1 GB budget.
    const removed = await prune(new Set());
    log(
      "photos/ is empty — wrote an empty gallery. The site falls back to placeholders." +
        (removed ? ` Removed ${removed} stale file(s).` : ""),
    );
    return;
  }

  const mains = images;

  let cache = {};
  try {
    cache = JSON.parse(await readFile(CACHE_FILE, "utf8"));
  } catch {
    /* first run, or the cache was cleared */
  }

  const nextCache = {};
  const manifest = [];
  const keep = new Set();
  let built = 0;
  let reused = 0;

  /** Content-hashed, so an edited file re-encodes and an unchanged one never does. */
  const renditionFor = async (fileName) => {
    const buffer = await readFile(join(SRC_DIR, fileName));
    const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 8);
    const stem = basename(fileName, extname(fileName));
    const key = `${fileName}:${hash}`;

    let rendition = cache[key];
    if (rendition) reused += 1;
    else {
      rendition = await buildRendition(buffer, stem, hash);
      built += 1;
    }

    nextCache[key] = rendition;
    for (const f of rendition.files) keep.add(f);
    return rendition;
  };

  for (const fileName of mains) {
    const stem = basename(fileName, extname(fileName));
    const rendition = await renditionFor(fileName);

    const sidecar = await readSidecar(stem);
    if (sidecar === null) {
      warn(`${fileName}: no ${stem}.json, so no details will be shown for it.`);
    }
    const data = sidecar ?? {};

    const title = clean(data.title) ?? titleFromSlug(stem);
    const caption = clean(data.caption);

    // A photograph with no description is invisible to a screen reader, so there is
    // always something. But a title is a poor substitute for a description, and that
    // is worth saying out loud rather than failing the build and blocking the whole
    // point of this folder.
    const alt = clean(data.alt) ?? caption;
    if (!alt) {
      warn(`${fileName}: no "alt" in ${stem}.json. Using the title, which is weaker.`);
    }

    const details = {};
    for (const field of FIELDS) {
      const value = clean(data[field]);
      if (value !== undefined) details[field] = value;
    }


    manifest.push({
      id: stem,
      alt: alt ?? title,
      title,
      ...(caption ? { caption } : {}),
      image: stripFiles(rendition),
      ...(Object.keys(details).length > 0 ? { details } : {}),
    });
  }

  await writeFile(DATA_FILE, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(CACHE_FILE, `${JSON.stringify(nextCache, null, 2)}\n`, "utf8");

  const pruned = await prune(keep);

  log(
    `${manifest.length} photograph${manifest.length === 1 ? "" : "s"} — ` +
      `${built} built, ${reused} from cache${pruned ? `, ${pruned} stale file(s) removed` : ""}.`,
  );
  for (const p of manifest) {
    const shown = FIELDS.filter((f) => p.details?.[f]).length;
    log(
      `  ${p.id.padEnd(26)} ${String(p.image.width).padStart(4)}x${String(p.image.height).padEnd(4)}` +
        `  ${shown}/${FIELDS.length} details`,
    );
  }
  void sidecars;
}

await main();

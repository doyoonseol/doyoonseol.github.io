import generated from "@/data/photos.generated.json";

/**
 * Photograph data.
 *
 * Nothing in this file is edited to add a photograph. Images are dropped into
 * `photos/` and `scripts/photos-build.mjs` produces
 * `src/data/photos.generated.json`, which is imported above. See
 * docs/03-adding-photos.md.
 *
 * While `photos/` is empty the site falls back to the placeholder set at the bottom,
 * so the layout is still reviewable.
 */

/** One image at every width the pipeline produced. */
export type Rendition = {
  /** Largest rendition. Used as the `src` fallback for browsers ignoring srcSet. */
  src: string;
  /** Candidate list, e.g. "/img/a.480.webp 480w, /img/a.960.webp 960w". */
  srcSet: string;
  /** Intrinsic size of `src`, post-rotation. Reserves layout before bytes arrive. */
  width: number;
  height: number;
  /** Inline base64 blur, painted while the real file loads. Empty for placeholders. */
  lqip: string;
};

/**
 * Shot metadata. Every field is optional by design — scanned film carries no EXIF, a
 * manual lens on an adapter reports nothing to the body, borrowed glass goes
 * unrecorded. The UI renders whichever fields exist and stays silent about the rest,
 * so a photograph with only a camera name looks deliberate rather than broken.
 *
 * Values are strings so they survive whatever the camera wrote. Formatting is
 * normalised at render time by `shotDetails()`, so "2.8", "f/2.8" and "F2.8" all
 * display identically.
 */
export type PhotoMetadata = {
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutter?: string;
  iso?: number | string;
};

export type Photo = {
  /** Derived from the filename. Stable as long as the file is not renamed. */
  id: string;
  /**
   * Required, never optional. A photograph without a description is invisible to
   * anyone using a screen reader. The pipeline fills it from IPTC alt text, then the
   * caption, then the title, warning when it has to fall back that far.
   */
  alt: string;
  title?: string;
  caption?: string;
  location?: string;
  /** Human-facing, e.g. "March 2026". Never parsed. */
  date?: string;
  image: Rendition;
  /** Present when an unprocessed version was supplied; drives the RAW pager. */
  raw?: Rendition;
  metadata?: PhotoMetadata;
};

/**
 * Width hints for the browser's srcSet selection.
 *
 * Expressed in vw rather than vh even though the cap in `photo-figure.tsx` is a
 * height: `sizes` accepts viewport units, but vh support is inconsistent and a wrong
 * guess here means fetching the wrong rendition. These slightly over-estimate, which
 * costs a little bandwidth and never costs sharpness.
 */
export const IMAGE_SIZES = "(min-width: 1280px) 75vw, (min-width: 640px) 88vw, 94vw";

/* ---------------------------------------------------------------------------
 * Formatting
 * ------------------------------------------------------------------------ */

const withUnit = (raw: string, test: RegExp, format: (s: string) => string) => {
  const value = raw.trim();
  return test.test(value) ? value : format(value);
};

/**
 * Flattens metadata into ordered label/value pairs, omitting anything absent or
 * blank. Returns an empty array when there is nothing to show, so callers can skip
 * the panel rather than render an empty container.
 */
export function shotDetails(photo: Photo): ReadonlyArray<{ label: string; value: string }> {
  const m = photo.metadata;
  if (!m) return [];

  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value?: string | number) => {
    const text = typeof value === "number" ? String(value) : value?.trim();
    if (text) rows.push({ label, value: text });
  };

  push("Camera", m.camera);
  push("Lens", m.lens);
  if (m.focalLength) {
    push("Focal", withUnit(String(m.focalLength), /mm$/i, (s) => `${s}mm`));
  }
  if (m.aperture) {
    push("Aperture", withUnit(String(m.aperture), /^f\//i, (s) => `f/${s.replace(/^f/i, "")}`));
  }
  if (m.shutter) {
    push("Shutter", withUnit(String(m.shutter), /s$/i, (s) => `${s}s`));
  }
  if (m.iso !== undefined && m.iso !== "") {
    push("ISO", withUnit(String(m.iso), /^iso/i, (s) => `ISO ${s}`));
  }

  return rows;
}

/* ---------------------------------------------------------------------------
 * Placeholders — used only while photos/ is empty
 * ------------------------------------------------------------------------ */

const placeholder = (file: string, width: number, height: number): Rendition => ({
  src: `/placeholders/${file}`,
  srcSet: `/placeholders/${file} ${width}w`,
  width,
  height,
  lqip: "",
});

const PLACEHOLDERS: ReadonlyArray<Photo> = [
  {
    id: "frame-01",
    image: placeholder("frame-01.svg", 3000, 2000),
    raw: placeholder("frame-01-raw.svg", 3000, 2000),
    alt: "Placeholder frame 01.",
    title: "Untitled I",
    location: "Location pending",
    date: "2026",
    metadata: {
      camera: "Fujifilm X-T5",
      lens: "XF 35mm f/1.4 R",
      focalLength: "35",
      aperture: "2",
      shutter: "1/500",
      iso: 320,
    },
  },
  {
    id: "frame-02",
    image: placeholder("frame-02.svg", 2000, 3000),
    alt: "Placeholder frame 02.",
    title: "Untitled II",
    date: "2026",
    metadata: { camera: "Fujifilm X-T5", aperture: "5.6", shutter: "1/125", iso: 640 },
  },
  {
    id: "frame-03",
    image: placeholder("frame-03.svg", 3000, 2000),
    raw: placeholder("frame-03-raw.svg", 3000, 2000),
    alt: "Placeholder frame 03.",
    title: "Untitled III",
    caption:
      "Filler caption. A sentence or two of context sits here when a photograph needs it, and is omitted when it does not.",
    // Camera and lens only — the usual case for a scanned negative.
    metadata: { camera: "Pentax 67", lens: "SMC 105mm f/2.4" },
  },
  {
    id: "frame-04",
    image: placeholder("frame-04.svg", 2400, 2400),
    alt: "Placeholder frame 04.",
    title: "Untitled IV",
    location: "Location pending",
    date: "2025",
    metadata: {
      camera: "Sony A7 IV",
      lens: "FE 24-70mm f/2.8 GM II",
      focalLength: "50",
      aperture: "4",
      shutter: "1/60",
      iso: 1250,
    },
  },
  {
    id: "frame-05",
    image: placeholder("frame-05.svg", 3840, 2160),
    raw: placeholder("frame-05-raw.svg", 3840, 2160),
    alt: "Placeholder frame 05.",
    title: "Untitled V",
    date: "2025",
    metadata: { camera: "Sony A7 IV", shutter: "30", aperture: "8", iso: 100 },
  },
  {
    id: "frame-06",
    image: placeholder("frame-06.svg", 2000, 2500),
    alt: "Placeholder frame 06.",
    title: "Untitled VI",
    metadata: { camera: "Yashica T4" },
  },
  {
    id: "frame-07",
    image: placeholder("frame-07.svg", 3000, 2000),
    alt: "Placeholder frame 07.",
    title: "Untitled VII",
    location: "Location pending",
    date: "2024",
    metadata: {
      camera: "Fujifilm X100V",
      lens: "23mm f/2",
      focalLength: "23",
      aperture: "2.8",
      shutter: "1/1000",
      iso: 160,
    },
  },
  {
    id: "frame-08",
    image: placeholder("frame-08.svg", 3900, 1440),
    alt: "Placeholder frame 08.",
    title: "Untitled VIII",
    // No metadata at all — proves the slide reads correctly with nothing to show.
  },
];

/**
 * The generated file's shape is guaranteed by the pipeline, not by TypeScript, so it
 * is asserted rather than inferred — its literal contents change with every build and
 * inferring from them would make unrelated edits fail to compile.
 */
const FROM_FOLDER = generated as unknown as ReadonlyArray<Photo>;

export const USING_PLACEHOLDERS = FROM_FOLDER.length === 0;

export const PHOTOS: ReadonlyArray<Photo> = USING_PLACEHOLDERS ? PLACEHOLDERS : FROM_FOLDER;

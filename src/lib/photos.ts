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
 * The complete set of shot details the site displays, and the only one.
 *
 * These come from the hand-written `.json` beside each image — never from the file's
 * own EXIF, which is inconsistent across cameras, absent from scans and silently
 * rewritten by some export pipelines. One explicit file per photograph is
 * predictable; embedded metadata is not.
 *
 * Every field is optional. Anything absent is simply not rendered, so a photograph
 * with only a camera name reads as deliberate rather than broken — which matters,
 * because that is exactly what a film scan looks like.
 *
 * Values are strings so they survive being typed by hand. Formatting is normalised at
 * render time by `shotDetails()`, so "2.8", "f/2.8" and "F2.8" all display identically.
 */
export type PhotoDetails = {
  camera?: string;
  focalLength?: string;
  aperture?: string;
  shutter?: string;
  iso?: number | string;
  location?: string;
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
  image: Rendition;
  /** Present when an unprocessed version was supplied; drives the RAW pager. */
  raw?: Rendition;
  details?: PhotoDetails;
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
  const d = photo.details;
  if (!d) return [];

  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value?: string | number) => {
    const text = typeof value === "number" ? String(value) : value?.trim();
    if (text) rows.push({ label, value: text });
  };

  push("Camera", d.camera);
  if (d.focalLength) {
    push("Focal length", withUnit(String(d.focalLength), /mm$/i, (s) => `${s}mm`));
  }
  if (d.aperture) {
    push("Aperture", withUnit(String(d.aperture), /^f\//i, (s) => `f/${s.replace(/^f/i, "")}`));
  }
  if (d.shutter) {
    push("Shutter", withUnit(String(d.shutter), /s$/i, (s) => `${s}s`));
  }
  if (d.iso !== undefined && d.iso !== "") {
    push("ISO", withUnit(String(d.iso), /^iso/i, (s) => `ISO ${s}`));
  }
  push("Location", d.location);

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

/**
 * Completeness is varied on purpose. Frame 03 carries only a camera, frame 06 only a
 * location, frame 08 nothing at all. If the layout holds across all of these it will
 * hold for whatever the real archive turns out to contain.
 */
const PLACEHOLDERS: ReadonlyArray<Photo> = [
  {
    id: "frame-01",
    image: placeholder("frame-01.svg", 3000, 2000),
    raw: placeholder("frame-01-raw.svg", 3000, 2000),
    alt: "Placeholder frame 01.",
    title: "Untitled I",
    details: {
      camera: "Fujifilm X-T5",
      focalLength: "35",
      aperture: "2",
      shutter: "1/500",
      iso: 320,
      location: "Location pending",
    },
  },
  {
    id: "frame-02",
    image: placeholder("frame-02.svg", 2000, 3000),
    alt: "Placeholder frame 02.",
    title: "Untitled II",
    details: { camera: "Fujifilm X-T5", aperture: "5.6", shutter: "1/125", iso: 640 },
  },
  {
    id: "frame-03",
    image: placeholder("frame-03.svg", 3000, 2000),
    raw: placeholder("frame-03-raw.svg", 3000, 2000),
    alt: "Placeholder frame 03.",
    title: "Untitled III",
    caption:
      "Filler caption. A sentence or two of context sits here when a photograph needs it, and is omitted when it does not.",
    // Camera only — the usual case for a scanned negative.
    details: { camera: "Pentax 67" },
  },
  {
    id: "frame-04",
    image: placeholder("frame-04.svg", 2400, 2400),
    alt: "Placeholder frame 04.",
    title: "Untitled IV",
    details: {
      camera: "Sony A7 IV",
      focalLength: "50",
      aperture: "4",
      shutter: "1/60",
      iso: 1250,
      location: "Location pending",
    },
  },
  {
    id: "frame-05",
    image: placeholder("frame-05.svg", 3840, 2160),
    raw: placeholder("frame-05-raw.svg", 3840, 2160),
    alt: "Placeholder frame 05.",
    title: "Untitled V",
    details: { camera: "Sony A7 IV", shutter: "30", aperture: "8", iso: 100 },
  },
  {
    id: "frame-06",
    image: placeholder("frame-06.svg", 2000, 2500),
    alt: "Placeholder frame 06.",
    title: "Untitled VI",
    details: { location: "Location pending" },
  },
  {
    id: "frame-07",
    image: placeholder("frame-07.svg", 3000, 2000),
    alt: "Placeholder frame 07.",
    title: "Untitled VII",
    details: {
      camera: "Fujifilm X100V",
      focalLength: "23",
      aperture: "2.8",
      shutter: "1/1000",
      iso: 160,
      location: "Location pending",
    },
  },
  {
    id: "frame-08",
    image: placeholder("frame-08.svg", 3900, 1440),
    alt: "Placeholder frame 08.",
    title: "Untitled VIII",
    // Nothing at all — proves the slide reads correctly with no details to show.
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

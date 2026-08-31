/**
 * Generates placeholder images for layout review.
 *
 * These stand in for real photographs so the slide deck can be judged on
 * composition, aspect-ratio handling and metadata placement before any actual
 * work is supplied. They are deliberately obvious placeholders — soft gradient
 * fields with a frame number — rather than stock photos, because stock would
 * flatter the layout dishonestly.
 *
 * Frames marked `hasRaw` also get a `-raw` variant: flatter, lower contrast and
 * slightly green, the way an unprocessed file actually looks. That exists so the
 * RAW/edited comparison slider can be evaluated with a visible difference.
 *
 * SVG rather than raster: a few hundred bytes each, resolution independent, and
 * no image-processing dependency needed this early.
 *
 * Run with:  node scripts/make-placeholders.mjs
 * Delete public/placeholders/ once real photographs land.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT_DIR = join(import.meta.dirname, "..", "public", "placeholders");

/**
 * A realistic spread of shapes: 3:2 from a 35mm body, 4:5 and 2:3 portraits,
 * a square, 16:9, and a panoramic crop. Exercising all of them now means the
 * layout cannot quietly assume every photograph is landscape.
 *
 * `hasRaw` is set on a subset on purpose — the slider must only appear on frames
 * that actually have two versions.
 */
const FRAMES = [
  { w: 3000, h: 2000, from: [42, 38, 34], to: [92, 84, 74], hasRaw: true },
  { w: 2000, h: 3000, from: [30, 32, 36], to: [78, 80, 82] },
  { w: 3000, h: 2000, from: [58, 44, 34], to: [200, 176, 150], hasRaw: true },
  { w: 2400, h: 2400, from: [36, 36, 33], to: [140, 132, 120] },
  { w: 3840, h: 2160, from: [24, 28, 32], to: [96, 104, 108], hasRaw: true },
  { w: 2000, h: 2500, from: [64, 48, 40], to: [214, 190, 164] },
  { w: 3000, h: 2000, from: [28, 30, 28], to: [118, 122, 112] },
  { w: 3900, h: 1440, from: [34, 32, 38], to: [104, 96, 104] },
];

const clamp = (c) => Math.max(0, Math.min(255, Math.round(c)));
const rgb = ([r, g, b]) => `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;

/**
 * Approximates an unprocessed file: contrast pulled toward mid-grey, a slight
 * green cast from the unbalanced sensor response, highlights not yet recovered.
 */
const asRaw = ([r, g, b]) => {
  const toward = (c) => c + (132 - c) * 0.55;
  return [toward(r), toward(g) + 7, toward(b) - 5];
};

function svg({ w, h, from, to }, index, variant) {
  const isRaw = variant === "raw";
  const label = String(index + 1).padStart(2, "0");
  const angle = 25 + index * 13;

  const [c1, c2] = isRaw ? [asRaw(from), asRaw(to)] : [from, to];
  const caption = isRaw ? `PLACEHOLDER ${label} — RAW` : `PLACEHOLDER ${w}×${h}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Placeholder frame ${label}${isRaw ? ", unprocessed" : ""}">
  <defs>
    <linearGradient id="g" gradientTransform="rotate(${angle} 0.5 0.5)">
      <stop offset="0%" stop-color="${rgb(c1)}"/>
      <stop offset="100%" stop-color="${rgb(c2)}"/>
    </linearGradient>
    <radialGradient id="v" cx="50%" cy="45%" r="75%">
      <stop offset="55%" stop-color="rgb(0,0,0)" stop-opacity="0"/>
      <stop offset="100%" stop-color="rgb(0,0,0)" stop-opacity="${isRaw ? 0.08 : 0.34}"/>
    </radialGradient>
  </defs>

  <!-- No feTurbulence grain here on purpose. Rasterising a fractal-noise filter
       across a 3000px canvas, eight times over, makes scrolling feel sluggish —
       which would give a false impression of the site's real performance, since
       actual photographs cost nothing to composite. -->
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect width="${w}" height="${h}" fill="url(#v)"/>

  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="Georgia, 'EB Garamond', serif"
        font-size="${Math.round(Math.min(w, h) * 0.2)}"
        fill="rgb(255,255,255)" fill-opacity="${isRaw ? 0.14 : 0.2}">${label}</text>

  <text x="50%" y="${h - Math.round(Math.min(w, h) * 0.055)}" text-anchor="middle"
        font-family="Georgia, 'EB Garamond', serif"
        font-size="${Math.round(Math.min(w, h) * 0.032)}"
        letter-spacing="${Math.round(Math.min(w, h) * 0.006)}"
        fill="rgb(255,255,255)" fill-opacity="0.42">${caption}</text>
</svg>
`;
}

await mkdir(OUT_DIR, { recursive: true });

const written = [];

await Promise.all(
  FRAMES.flatMap((frame, i) => {
    const stem = `frame-${String(i + 1).padStart(2, "0")}`;
    const jobs = [
      writeFile(join(OUT_DIR, `${stem}.svg`), svg(frame, i, "edited"), "utf8"),
    ];
    written.push(`${stem}.svg`);

    if (frame.hasRaw) {
      jobs.push(writeFile(join(OUT_DIR, `${stem}-raw.svg`), svg(frame, i, "raw"), "utf8"));
      written.push(`${stem}-raw.svg`);
    }
    return jobs;
  }),
);

console.log(`Wrote ${written.length} placeholder files to public/placeholders/`);
for (const [i, f] of FRAMES.entries()) {
  const stem = `frame-${String(i + 1).padStart(2, "0")}`;
  const ratio = (f.w / f.h).toFixed(2);
  console.log(
    `  ${stem}  ${f.w}×${f.h}  (${ratio}:1)${f.hasRaw ? "  + RAW variant" : ""}`,
  );
}

import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Front elevation of a camera, built from layered CSS on real Z offsets so that
 * tilting produces genuine parallax between the lens barrel and the body rather
 * than a flat image being skewed.
 *
 * ── PLACEHOLDER ────────────────────────────────────────────────────────────
 * This stands in for the 3D render the owner will supply. Pass `renderSrc` to
 * swap in that asset — the tilt, the depth layering and the lens-zoom target
 * all keep working, because the zoom scales from the centre of this box and the
 * lens is deliberately centred within it.
 *
 *   <CameraModel renderSrc="/camera.png" />
 *
 * If the asset arrives as a true 3D model (.glb) rather than a rendered image,
 * this is the single component to replace, and the only place where a
 * react-three-fiber canvas would need to be introduced.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Body lightness sits near 30% so the camera reads as the same dark object in
 * both themes — light enough to separate from the near-black dark background,
 * dark enough to hold its form against warm paper.
 */

const LAYER = {
  backplate: -14,
  body: 0,
  hump: 8,
  controls: 16,
  barrelBase: 20,
  barrelMid: 34,
  barrelFront: 46,
  glass: 50,
  sheen: 56,
} as const;

const z = (depth: number) => ({ transform: `translateZ(${depth}px)` });

export function CameraModel({
  renderSrc,
  className,
}: {
  renderSrc?: string;
  className?: string;
}) {
  if (renderSrc) {
    return (
      <div
        className={cn("relative aspect-[3/2] w-full", className)}
        style={{ transformStyle: "preserve-3d" }}
      >
        <Image
          src={renderSrc}
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 560px, 90vw"
          className="object-contain drop-shadow-2xl"
        />
      </div>
    );
  }

  return (
    <div
      className={cn("relative aspect-[3/2] w-full select-none", className)}
      style={{ transformStyle: "preserve-3d" }}
      aria-hidden="true"
    >
      {/* Contact shadow. Sits behind everything and does not tilt with the body,
          which keeps the camera feeling anchored to a surface. */}
      <div
        className="absolute inset-x-[12%] bottom-[6%] h-[10%] rounded-[50%] blur-2xl"
        style={{
          ...z(LAYER.backplate),
          background: "oklch(20% 0.01 60 / 0.42)",
        }}
      />

      {/* Viewfinder hump */}
      <div
        className="absolute left-1/2 top-[9%] h-[16%] w-[26%] -translate-x-1/2 rounded-t-[14px]"
        style={{
          ...z(LAYER.hump),
          background: "linear-gradient(175deg, oklch(41% 0.006 60), oklch(26% 0.006 60))",
          boxShadow: "inset 0 1px 0 oklch(72% 0.006 60 / 0.34)",
        }}
      />

      {/* Body */}
      <div
        className="absolute inset-x-0 top-[20%] h-[70%] rounded-[22px]"
        style={{
          ...z(LAYER.body),
          background:
            "linear-gradient(168deg, oklch(40% 0.006 60) 0%, oklch(31% 0.006 60) 46%, oklch(23% 0.005 60) 100%)",
          boxShadow: [
            "inset 0 1px 0 oklch(78% 0.006 60 / 0.3)",
            "inset 0 -1px 0 oklch(12% 0.004 60 / 0.7)",
            "0 30px 60px -20px oklch(20% 0.01 60 / 0.5)",
          ].join(", "),
        }}
      >
        {/* Grip texture, right side */}
        <div
          className="absolute right-[3%] top-[8%] h-[84%] w-[17%] rounded-[16px]"
          style={{
            background:
              "repeating-linear-gradient(92deg, oklch(24% 0.005 60) 0 2px, oklch(33% 0.006 60) 2px 4px)",
            opacity: 0.75,
          }}
        />

        {/* Wordmark plate — a natural home for a name once the render lands */}
        <div
          className="absolute left-[6%] top-[16%] h-[9%] w-[18%] rounded-[3px]"
          style={{
            background: "linear-gradient(180deg, oklch(62% 0.006 60 / 0.5), transparent)",
          }}
        />
      </div>

      {/* Shutter release */}
      <div
        className="absolute right-[19%] top-[15%] size-[5.5%] rounded-full"
        style={{
          ...z(LAYER.controls),
          background: "radial-gradient(circle at 32% 28%, oklch(80% 0.02 70), oklch(46% 0.02 60))",
          boxShadow: "0 3px 6px oklch(15% 0.01 60 / 0.55)",
        }}
      />

      {/* Control dial */}
      <div
        className="absolute right-[31%] top-[16%] size-[7%] rounded-full"
        style={{
          ...z(LAYER.controls - 4),
          background:
            "repeating-conic-gradient(oklch(52% 0.006 60) 0deg 6deg, oklch(34% 0.006 60) 6deg 12deg)",
          boxShadow: "inset 0 0 0 2px oklch(24% 0.005 60), 0 2px 5px oklch(15% 0.01 60 / 0.5)",
        }}
      />

      {/* ── Lens assembly ──────────────────────────────────────────────────
          Centred in the box on both axes. The scroll zoom simply scales this
          whole component from its centre, so a centred lens is what makes the
          transition land on the glass instead of drifting off it. */}
      <div
        className="absolute left-1/2 top-1/2 aspect-square w-[42%] -translate-x-1/2 -translate-y-1/2"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Barrel base */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            ...z(LAYER.barrelBase),
            background:
              "conic-gradient(from 210deg, oklch(43% 0.006 60), oklch(24% 0.005 60), oklch(38% 0.006 60), oklch(22% 0.005 60), oklch(43% 0.006 60))",
            boxShadow: "0 12px 30px -6px oklch(14% 0.01 60 / 0.65)",
          }}
        />

        {/* Focus ring, ridged */}
        <div
          className="absolute inset-[9%] rounded-full"
          style={{
            ...z(LAYER.barrelMid),
            background:
              "repeating-conic-gradient(oklch(38% 0.006 60) 0deg 3deg, oklch(26% 0.005 60) 3deg 6deg)",
            boxShadow: "inset 0 0 0 1px oklch(58% 0.006 60 / 0.28)",
          }}
        />

        {/* Front element retaining ring */}
        <div
          className="absolute inset-[19%] rounded-full"
          style={{
            ...z(LAYER.barrelFront),
            background: "linear-gradient(160deg, oklch(50% 0.006 60), oklch(27% 0.005 60))",
            boxShadow: "inset 0 0 0 1px oklch(70% 0.006 60 / 0.3)",
          }}
        />

        {/* Glass. The faint teal is a coating reflection — the one place a hint
            of chroma is welcome, since this is a depicted object rather than
            interface furniture. */}
        <div
          data-lens-glass
          className="absolute inset-[26%] rounded-full"
          style={{
            ...z(LAYER.glass),
            background: [
              "radial-gradient(circle at 34% 28%, oklch(78% 0.05 200 / 0.5) 0%, transparent 36%)",
              "radial-gradient(circle at 68% 74%, oklch(56% 0.09 268 / 0.34) 0%, transparent 44%)",
              "radial-gradient(circle at 50% 50%, oklch(17% 0.02 250) 42%, oklch(9% 0.015 260) 100%)",
            ].join(", "),
            boxShadow:
              "inset 0 0 22px oklch(4% 0.01 260 / 0.9), inset 0 0 0 2px oklch(60% 0.01 60 / 0.22)",
          }}
        >
          {/* Aperture blades, visible once the zoom gets close */}
          <div
            className="absolute inset-[26%] rounded-full"
            style={{
              background:
                "conic-gradient(from 12deg, oklch(24% 0.01 250) 0deg 40deg, oklch(13% 0.01 250) 40deg 80deg, oklch(22% 0.01 250) 80deg 120deg, oklch(12% 0.01 250) 120deg 160deg, oklch(25% 0.01 250) 160deg 200deg, oklch(13% 0.01 250) 200deg 240deg, oklch(21% 0.01 250) 240deg 280deg, oklch(12% 0.01 250) 280deg 320deg, oklch(24% 0.01 250) 320deg 360deg)",
              clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
            }}
          />
          {/* Pupil — the centre the zoom drives toward */}
          <div
            className="absolute inset-[42%] rounded-full"
            style={{ background: "oklch(6% 0.008 260)" }}
          />
        </div>

        {/* Specular sheen. Inherits the parent tilt, so it slides across the
            glass as the camera turns. */}
        <div
          className="absolute inset-[26%] rounded-full mix-blend-screen"
          style={{
            ...z(LAYER.sheen),
            background:
              "linear-gradient(128deg, oklch(96% 0.01 220 / 0.32) 0%, transparent 34%, transparent 66%, oklch(90% 0.01 220 / 0.12) 100%)",
          }}
        />
      </div>
    </div>
  );
}

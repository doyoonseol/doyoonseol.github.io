"use client";

import { motion, useTransform } from "motion/react";

import { useDeck } from "@/components/deck/deck-provider";
import { PhotoFigure, SLIDE_LAYOUT } from "@/components/gallery/photo-figure";
import { PHOTOS } from "@/lib/photos";

/**
 * The first photograph, seen through the camera lens.
 *
 * A full-viewport layer holding the first slide, masked by a circle centred where
 * the lens is. The deck's `reveal` value drives the aperture, and it runs in both
 * directions:
 *
 *   0 → 1   the circle opens, the photograph comes out of the glass
 *   1 → 0   the circle closes, the photograph retreats back into it
 *
 * The reverse is not a separate animation — the controller simply runs the same
 * value the other way while the camera scales back down, so leaving the landing
 * page and returning to it are exact mirrors.
 *
 * ── Always mounted, on purpose ─────────────────────────────────────────────
 * Visibility is driven by a `useTransform` off `reveal` rather than by React state.
 * Mounting on state would cost a render cycle, and the reverse sequence sets
 * `reveal` to 1 and starts closing immediately — so that one dropped frame would
 * show the magnified camera with no photograph in it before the overlay appeared.
 * Driving `visibility` from a motion value writes straight to the DOM with no
 * render, so there is no such gap.
 *
 * The photograph costs nothing extra: the real first slide fetches it eagerly, so
 * this hits the browser cache.
 */
export function LensReveal() {
  const { reveal } = useDeck();
  const first = PHOTOS[0];

  // vmax so the circle clears the corners at any aspect ratio. It bottoms out at
  // 10 rather than 0 so it reads as an aperture rather than a dot — at the moment
  // it appears, the magnified glass is roughly this size on screen.
  const clipPath = useTransform(reveal, (v) => `circle(${10 + v * 145}vmax at 50% 50%)`);

  // Because the circle never shrinks to zero, the layer has to fade at the very
  // ends of the range or a disc of photograph would pop in and out. This matters
  // most in reverse: without it, the closing aperture would vanish abruptly
  // instead of dissolving back into the lens.
  const opacity = useTransform(reveal, [0, 0.07], [0, 1]);

  // Removed from the compositor entirely while idle.
  const visibility = useTransform(reveal, (v) => (v > 0.001 ? "visible" : "hidden"));

  if (!first) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ clipPath, opacity, visibility }}
      className="pointer-events-none fixed inset-0 z-[45] bg-background"
    >
      <div className={SLIDE_LAYOUT}>
        <PhotoFigure photo={first} priority />
      </div>
    </motion.div>
  );
}

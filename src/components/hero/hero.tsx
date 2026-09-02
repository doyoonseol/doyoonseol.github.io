"use client";

import { motion, useTransform } from "motion/react";

import { useDeck } from "@/components/deck/deck-provider";
import { DeckSection } from "@/components/deck/deck-section";
import { FIRST_PHOTO_SECTION, INTRO_ID } from "@/lib/deck";
import { SITE } from "@/lib/site";
import { LeafShutter } from "@/components/hero/leaf-shutter";
import { BioReveal } from "@/components/hero/bio-reveal";

/**
 * Landing panel: introduction and a camera that tracks the pointer.
 *
 * This component owns none of the transition. It reads the deck's `zoom` value and
 * renders whatever that value says, which is what lets the same code serve both
 * directions: the controller runs `zoom` 0 → 1 to go into the lens, and 1 → 0 to
 * come back out of it. There is no forward-only animation to reverse.
 *
 * `CameraModel` centres the lens in its box and this wrapper centres that box in the
 * viewport, so a plain centre-origin scale lands on the glass with no measurement.
 */
export function Hero() {
  const { zoom, goTo, reduce } = useDeck();

  // Text stays solid until the shutter is completely closed (0.55)
  const introOpacity = useTransform(zoom, [0, 0.55, 0.60], [1, 1, 0]);
  const cueOpacity = useTransform(zoom, [0, 0.12], [1, 0]);

  // Shutter holds open until text fades (0.25), closes from 0.25→0.55, holds closed from 0.55→0.70, opens from 0.70→1.0
  // The hold period lets the background swap happen invisibly behind closed blades
  const shutterOpenness = useTransform(zoom, [0, 0.25, 0.55, 0.7, 1], [1, 1, 0, 0, 1]);

  // Apple-style: gentle, confident scale-up over the final 20%
  // Feels like the camera is slowly pulling you into the photograph
  const shutterScale = useTransform(zoom, [0, 0.8, 1], [1, 1, 5]);

  // Background crossfade during the hold period — not instant, but a brief dissolve
  const bgOpacity = useTransform(zoom, [0, 0.58, 0.67, 1], [1, 1, 0, 0]);

  return (
    <DeckSection index={0} id={INTRO_ID} label="Introduction">
      {/* 
        This solid background covers the pinned first photograph initially. 
        It vanishes while the shutter is closed, swapping the "world" behind the aperture. 
      */}
      <motion.div
        className="absolute inset-0 bg-background"
        style={reduce ? undefined : { opacity: bgOpacity }}
      />

      {/* The animated leaf shutter blades */}
      {!reduce && <LeafShutter openness={shutterOpenness} shutterScale={shutterScale} />}

      {/* Foreground text layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          style={reduce ? undefined : { opacity: introOpacity }}
          className="absolute inset-x-0 top-1/2 z-0 mx-auto max-w-xl -translate-y-1/2 px-6 text-center"
        >
          <h1 className="text-[clamp(2.5rem,7vw,4.25rem)] leading-[1.05]">{SITE.name}</h1>

          <BioReveal
            zoom={zoom}
            className="mt-5 text-xl leading-relaxed text-muted-foreground"
          />

        </motion.div>

        {/* A real button, so the transition is reachable by keyboard and by anyone
            who would rather click than discover it by scrolling. */}
        <motion.button
          type="button"
          onClick={() => goTo(FIRST_PHOTO_SECTION)}
          style={reduce ? undefined : { opacity: cueOpacity }}
          className="absolute inset-x-0 bottom-8 z-20 mx-auto flex w-fit cursor-pointer flex-col items-center gap-2 rounded-sm px-4 py-2 pointer-events-auto"
        >
          <span className="label text-muted-foreground/80">
            {reduce ? "View photographs" : "Scroll"}
          </span>
          <span
            aria-hidden="true"
            className="h-10 w-px bg-gradient-to-b from-muted-foreground/50 to-transparent"
          />
        </motion.button>
      </div>
    </DeckSection>
  );
}

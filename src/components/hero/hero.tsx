"use client";

import { motion, useTransform } from "motion/react";

import { useDeck } from "@/components/deck/deck-provider";
import { DeckSection } from "@/components/deck/deck-section";
import { FIRST_PHOTO_SECTION, INTRO_ID } from "@/lib/deck";
import { SITE } from "@/lib/site";

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

  const introOpacity = useTransform(zoom, [0, 0.28], [1, 0]);
  const introLift = useTransform(zoom, [0, 0.28], [0, -40]);
  const cueOpacity = useTransform(zoom, [0, 0.15], [1, 0]);


  return (
    <DeckSection index={0} id={INTRO_ID} label="Introduction">
      {/* Clipping wrapper: the magnified camera must not widen the page. */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          style={reduce ? undefined : { opacity: introOpacity, y: introLift }}
          className="absolute inset-x-0 top-[11vh] z-20 mx-auto max-w-xl px-6 text-center"
        >
          <h1 className="text-[clamp(2.5rem,7vw,4.25rem)] leading-[1.05]">{SITE.name}</h1>

          <p className="mt-5 text-balance text-[1.05rem] leading-relaxed text-muted-foreground">
            {SITE.bio}
          </p>

        </motion.div>

        {/* A real button, so the transition is reachable by keyboard and by anyone
            who would rather click than discover it by scrolling. */}
        <motion.button
          type="button"
          onClick={() => goTo(FIRST_PHOTO_SECTION)}
          style={reduce ? undefined : { opacity: cueOpacity }}
          className="absolute inset-x-0 bottom-8 z-20 mx-auto flex w-fit cursor-pointer flex-col items-center gap-2 rounded-sm px-4 py-2"
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

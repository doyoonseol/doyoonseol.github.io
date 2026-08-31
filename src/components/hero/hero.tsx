"use client";

import { motion, useTransform } from "motion/react";

import { useDeck } from "@/components/deck/deck-provider";
import { DeckSection } from "@/components/deck/deck-section";
import { CameraModel } from "@/components/hero/camera-model";
import { usePointerTilt } from "@/hooks/use-pointer-tilt";
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
  const { rotateX, rotateY } = usePointerTilt({ maxTilt: 9 });

  const introOpacity = useTransform(zoom, [0, 0.28], [1, 0]);
  const introLift = useTransform(zoom, [0, 0.28], [0, -40]);
  const cueOpacity = useTransform(zoom, [0, 0.15], [1, 0]);

  // 6× is enough: the expanding aperture fills the screen from here, so the camera
  // only needs to come close enough that the photograph looks like it opens out of
  // the glass.
  const cameraScale = useTransform(zoom, [0, 1], [1, 6]);

  // Relax the tilt as the zoom takes over; a magnified camera should not also skew.
  const tiltFade = useTransform(zoom, [0.1, 0.7], [1, 0]);
  const tiltX = useTransform(() => rotateX.get() * tiltFade.get());
  const tiltY = useTransform(() => rotateY.get() * tiltFade.get());

  // The body falls away late, so the eye is left with glass just as the aperture
  // takes over. The range matters more for the reverse than the forward: coming
  // back out of the lens, the camera has to be visible again by the time the
  // aperture has closed, or the photograph would shrink into empty background.
  const bodyFade = useTransform(zoom, [0.55, 1], [1, 0]);

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

          <p className="label mt-6 text-muted-foreground/70">{SITE.location}</p>
        </motion.div>

        {/* Perspective sits on this wrapper, outside the scaling element, so the
            3D space itself is not scaled along with its contents. */}
        <div className="scene-3d absolute left-1/2 top-1/2 z-10 w-[min(34rem,86vw)]">
          <motion.div
            // Positioning goes through motion's own x/y rather than Tailwind's
            // -translate utilities: both write `transform` and would clobber each other.
            style={
              reduce
                ? { x: "-50%", y: "-50%" }
                : { x: "-50%", y: "-50%", scale: cameraScale }
            }
            className="origin-center"
          >
            <motion.div
              style={
                reduce ? undefined : { rotateX: tiltX, rotateY: tiltY, opacity: bodyFade }
              }
              className="[transform-style:preserve-3d]"
            >
              {/* Swap in the owner's asset: <CameraModel renderSrc="/camera.png" /> */}
              <CameraModel />
            </motion.div>
          </motion.div>
        </div>

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

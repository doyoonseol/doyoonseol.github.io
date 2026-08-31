"use client";

import { useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useCallback, useEffect } from "react";

/**
 * Tracks the pointer and returns spring-damped rotation values for a CSS 3D tilt.
 *
 * Two details make this feel like an object rather than a slider:
 *
 * 1. The springs are low-stiffness and fairly heavily damped, so the camera
 *    keeps drifting briefly after the cursor stops. Mapping rotation directly
 *    to pointer position feels mechanical and cheap.
 * 2. Tilt is driven from the *whole viewport*, not just the element's own box.
 *    The camera therefore responds while the cursor is anywhere on the page,
 *    which reads as awareness rather than as a hover effect.
 *
 * The handler does no layout reads and triggers no React re-render — pointer
 * position goes into motion values, which write to the compositor directly.
 *
 * Returns zeroed, non-animating values when the user has asked for reduced
 * motion, or when the device has no fine pointer to track.
 */
export function usePointerTilt({ maxTilt = 9 }: { maxTilt?: number } = {}) {
  const prefersReduced = useReducedMotion();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const spring = { stiffness: 90, damping: 22, mass: 0.9 };
  const rotateY = useSpring(rawX, spring);
  const rotateX = useSpring(rawY, spring);

  const handleMove = useCallback(
    (event: PointerEvent) => {
      // -1 .. 1 from viewport centre.
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = (event.clientY / window.innerHeight) * 2 - 1;

      // Positive rotateY turns the object's left edge away from the viewer, so
      // following the cursor horizontally needs nx directly. Vertically the
      // sign inverts: a cursor below centre should tip the top of the object
      // toward the viewer.
      rawX.set(nx * maxTilt);
      rawY.set(-ny * maxTilt);
    },
    [maxTilt, rawX, rawY],
  );

  useEffect(() => {
    if (prefersReduced) return;

    // Coarse pointers have no hover position to track, and attaching this on a
    // phone would only cost battery for an effect nobody can see.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [handleMove, prefersReduced]);

  return { rotateX, rotateY, prefersReduced } as const;
}

"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import { useDeck } from "@/components/deck/deck-provider";
import { FIRST_PHOTO_SECTION } from "@/lib/deck";

/**
 * How many sections either side of the current one stay mounted.
 *
 * One is enough for two independent reasons. Images in a mounted-but-transparent
 * section are still inside the viewport rectangle, so the browser fetches them and
 * the next transition has nothing to wait for. And the reverse lens sequence needs
 * the intro and the first photograph mounted at the same time.
 *
 * Mounting all of them instead would put every photograph in the viewport at once
 * and defeat lazy loading entirely — the whole archive would download on first
 * paint.
 */
const WINDOW = 1;

/**
 * One full-viewport section of the deck.
 *
 * Every section is `fixed inset-0` and stacked; exactly one is opaque. This is what
 * enforces the one-photograph-at-a-time rule — there is no scroll position, so
 * there is no arrangement in which two photographs share the screen.
 *
 * The active section's opacity is the deck's `fade` value, which the controller
 * animates down and back up around the swap. Inactive sections are pinned at 0.
 *
 * Inactive sections are also `aria-hidden` and `inert`, so a screen reader is not
 * offered eight photographs at once and Tab cannot land inside an invisible one.
 */
export function DeckSection({
  index,
  id,
  label,
  children,
  className,
}: {
  index: number;
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const { index: active, fade } = useDeck();

  const isActive = index === active;
  const distance = Math.abs(index - active);

  // The first photograph is kept mounted whenever the intro is on stage: the lens
  // overlay renders it, and unmounting it here would drop it from cache.
  const pinned = index === FIRST_PHOTO_SECTION && active === 0;

  if (distance > WINDOW && !pinned) return null;

  return (
    <motion.section
      id={id}
      aria-label={label}
      aria-hidden={!isActive}
      inert={!isActive}
      data-deck-section=""
      style={{ opacity: isActive || pinned ? fade : 0 }}
      className={`fixed inset-0 ${isActive ? "z-20" : pinned ? "z-10" : "pointer-events-none z-0"} ${className ?? ""}`}
    >
      {children}
    </motion.section>
  );
}

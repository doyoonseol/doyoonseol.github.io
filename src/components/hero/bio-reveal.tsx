"use client";

import { motion, MotionValue, useTransform } from "motion/react";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

function Word({
  word,
  zoom,
  appearStart,
  appearEnd,
  revealStart,
  revealEnd,
}: {
  word: string;
  zoom: MotionValue<number>;
  appearStart: number;
  appearEnd: number;
  revealStart: number;
  revealEnd: number;
}) {
  // Rectangle fades in quickly, holds, then fades out slowly
  const rectOpacity = useTransform(
    zoom,
    [appearStart, appearEnd, revealStart, revealEnd],
    [0, 1, 1, 0]
  );
  
  // Text remains invisible until the rectangle starts to fade out
  const textOpacity = useTransform(
    zoom,
    [revealStart, revealEnd],
    [0, 1]
  );

  return (
    <span className="relative inline-block leading-none">
      <motion.span
        style={{ opacity: rectOpacity }}
        className="absolute inset-0 bg-foreground rounded-md"
      />
      <motion.span
        style={{ opacity: textOpacity }}
        className="relative text-foreground"
      >
        {word}
      </motion.span>
    </span>
  );
}

interface BioRevealProps {
  zoom: MotionValue<number>;
  className?: string;
}

export function BioReveal({ zoom, className }: BioRevealProps) {
  // Split the bio text into individual words
  const words = SITE.bio.split(" ");
  const N = words.length;

  // Rectangles appear in a tight sequence early in the scroll (0.0 to 0.08)
  const appearPhaseStart = 0.0;
  const appearPhaseEnd = 0.08;

  // Rectangles fade out and text reveals in a wider sequence (0.02 to 0.14)
  // Shifted earlier so text reveals closer to the appearance of rectangles
  const revealPhaseStart = 0.02;
  const revealPhaseEnd = 0.14;

  return (
    <p className={cn("text-balance", className)}>
      {words.map((word, i) => {
        const appearStart = appearPhaseStart + (i / N) * (appearPhaseEnd - appearPhaseStart);
        const appearEnd = appearStart + 0.01; // Quick appearance

        const revealStart = revealPhaseStart + (i / N) * (revealPhaseEnd - revealPhaseStart);
        const revealEnd = revealStart + 0.03; // Slower, smoother fade out

        return (
          <span key={i}>
            <Word 
              word={word} 
              zoom={zoom} 
              appearStart={appearStart}
              appearEnd={appearEnd}
              revealStart={revealStart}
              revealEnd={revealEnd}
            />
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </p>
  );
}

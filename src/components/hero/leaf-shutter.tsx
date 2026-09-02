"use client";

import { motion, MotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

export function LeafShutter({
  openness,
  shutterScale,
}: {
  openness: MotionValue<number>;
  shutterScale: MotionValue<number>;
}) {
  // 5 blades for a curved pentagonal -> circular aperture
  const blades = Array.from({ length: 5 });

  // When openness is 0 (closed), the blades meet at the center (x=0).
  // When openness is 1 (open), the blades are pulled back to radius 500.
  // 500 keeps blade edges just visible at the viewport borders, so the
  // very first scroll tick produces an immediately visible change.
  const distance = useTransform(openness, [0, 1], [0, 500]);

  // A mechanical twist as it opens and closes
  // When closed (openness=0), twist is 60deg. When open (openness=1), twist is 0deg.
  // This means it rotates +60 to close, and -60 to open.
  const twist = useTransform(openness, [0, 1], [60, 0]);

  const groupRef = useRef<SVGGElement>(null);
  useEffect(() => {
    return twist.on("change", (v) => {
      if (groupRef.current) {
        groupRef.current.setAttribute("transform", `rotate(${v} 0 0)`);
      }
    });
  }, [twist]);

  return (
    <motion.div
      className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
      style={{ scale: shutterScale }}
    >
      <svg
        viewBox="-300 -300 600 600"
        className="absolute inset-0 w-full h-full min-w-[100vw] min-h-[100vh]"
        preserveAspectRatio="xMidYMid slice"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="blade-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" className="text-foreground" stopColor="currentColor" />
            <stop offset="100%" className="text-foreground/70" stopColor="currentColor" />
          </linearGradient>
          <filter id="blade-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="-20" dy="10" stdDeviation="30" floodColor="black" floodOpacity="0.6" />
          </filter>
        </defs>

        <g ref={groupRef}>
          {blades.map((_, i) => {
            // 5 blades separated by 72 degrees
            const angle = i * 72;
            return (
              <g key={i} transform={`rotate(${angle})`}>
                <motion.g style={{ x: distance }}>
                  {/* The blade body using a curved inner edge */}
                  <path
                    d="M -800,-3000 L -800,-800 A 800 800 0 0 1 -800,800 L -800,3000 L 3000,3000 L 3000,-3000 Z"
                    fill="url(#blade-gradient)"
                    filter="url(#blade-shadow)"
                    stroke="hsl(var(--background) / 0.5)"
                    strokeWidth="3"
                  />
                </motion.g>
              </g>
            );
          })}
        </g>
      </svg>
    </motion.div>
  );
}

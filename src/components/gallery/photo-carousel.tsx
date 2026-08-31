"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

import { lqipStyle } from "@/components/gallery/photo-figure";
import { IMAGE_SIZES, type Photo } from "@/lib/photos";
import { cn } from "@/lib/utils";

/* Plain <img> rather than next/image — see photo-slide.tsx for the reasoning. */
/* eslint-disable @next/next/no-img-element */

/**
 * Edited and RAW as two full frames, paged like an Instagram post: the finished
 * photograph first, an arrow to step right to the unprocessed version.
 *
 * ── Layout ─────────────────────────────────────────────────────────────────
 * The edited image sits in normal flow and defines the box; the RAW is absolutely
 * positioned on top of it at the same size. Paging just translates both by 100%.
 * Doing it this way avoids the circular sizing problem of a percentage-width flex
 * track inside a shrink-to-fit container, and it means the finished photograph is
 * what determines the slide's dimensions.
 *
 * Both files must be exported at identical pixel dimensions or the two frames
 * will not line up.
 *
 * ── Gestures ───────────────────────────────────────────────────────────────
 * Horizontal swipes are handled here and stop at this component, so they never
 * reach the deck controller that owns vertical paging. Arrow keys work because
 * the buttons take focus, and the deck deliberately ignores key events
 * originating from a focused control.
 */

const VIEWS = ["edited", "raw"] as const;

export function PhotoCarousel({
  photo,
  imageClassName,
  priority = false,
}: {
  photo: Photo;
  imageClassName?: string;
  /** Fetch the finished photograph eagerly. Set on the frame the lens reveals. */
  priority?: boolean;
}) {
  const [view, setView] = useState(0);
  const touchX = useRef<number | null>(null);

  if (!photo.raw) return null;

  const atEdited = view === 0;
  const step = (dir: number) => setView((v) => Math.max(0, Math.min(VIEWS.length - 1, v + dir)));

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-fit overflow-hidden"
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const travel = touchX.current - (e.changedTouches[0]?.clientX ?? touchX.current);
          touchX.current = null;
          if (Math.abs(travel) > 40) step(travel > 0 ? 1 : -1);
        }}
      >
        {/* Finished photograph — in flow, so it sizes the frame. */}
        <img
          src={photo.image.src}
          srcSet={photo.image.srcSet}
          sizes={IMAGE_SIZES}
          alt={photo.alt}
          width={photo.image.width}
          height={photo.image.height}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          aria-hidden={!atEdited}
          className={cn(
            imageClassName,
            "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          )}
          style={{
            ...lqipStyle(photo.image.lqip),
            transform: `translateX(${-view * 100}%)`,
          }}
        />

        {/* Unprocessed — overlaid at the same size, waiting off to the right.
            Always lazy: the comparison is opt-in and must not compete with the
            finished photograph for bandwidth. */}
        <img
          src={photo.raw.src}
          srcSet={photo.raw.srcSet}
          sizes={IMAGE_SIZES}
          alt={`${photo.alt} — unprocessed`}
          width={photo.raw.width}
          height={photo.raw.height}
          loading="lazy"
          decoding="async"
          aria-hidden={atEdited}
          className={cn(
            "absolute inset-0 h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            imageClassName,
          )}
          style={{ transform: `translateX(${(1 - view) * 100}%)` }}
        />

        {/* Which frame is showing. */}
        <span className="label pointer-events-none absolute left-2 top-2 z-10 rounded-sm bg-black/40 px-1.5 py-1 text-white/90 backdrop-blur-sm">
          {atEdited ? "Edited" : "RAW"}
        </span>

        {!atEdited && (
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Show the edited version"
            className="glass absolute left-2 top-1/2 z-10 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full transition-opacity hover:opacity-80"
          >
            <ChevronLeft className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}

        {atEdited && (
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Show the unprocessed RAW version"
            className="glass absolute right-2 top-1/2 z-10 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full transition-opacity hover:opacity-80"
          >
            <ChevronRight className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Page dots, as on a post with more than one image. */}
      <div className="flex items-center gap-1.5" role="group" aria-label="Versions">
        {VIEWS.map((name, i) => (
          <button
            key={name}
            type="button"
            onClick={() => setView(i)}
            aria-label={name === "edited" ? "Edited version" : "Unprocessed RAW version"}
            aria-current={view === i ? "true" : undefined}
            className="cursor-pointer p-1.5"
          >
            <span
              aria-hidden="true"
              className={cn(
                "block size-1.5 rounded-full transition-colors duration-300",
                view === i ? "bg-accent" : "bg-muted-foreground/35",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

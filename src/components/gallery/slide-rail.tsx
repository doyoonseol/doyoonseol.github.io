"use client";

import { useDeck } from "@/components/deck/deck-provider";
import { photoIndexToSection, sectionToPhotoIndex } from "@/lib/deck";
import type { Photo } from "@/lib/photos";
import { cn } from "@/lib/utils";

/**
 * Vertical index of tick marks, one per photograph.
 *
 * Position comes straight from the deck controller rather than from an
 * IntersectionObserver. The controller already knows which section it is on, and
 * an observer would lag behind it during a transition and could disagree with it
 * outright while the first photograph is being revealed through the lens — that
 * move changes the scroll position instantly, behind a covering overlay, so
 * there is no gradual intersection to observe.
 *
 * The active tick is longer *and* takes the accent colour. Length carries the
 * signal independently of hue, so position stays readable for anyone who cannot
 * distinguish the accent from the muted foreground.
 */
export function SlideRail({ photos }: { photos: ReadonlyArray<Photo> }) {
  const { index, goTo } = useDeck();
  const activePhoto = sectionToPhotoIndex(index);

  return (
    <nav
      aria-label="Photographs"
      className={cn(
        "fixed right-1 top-1/2 z-40 -translate-y-1/2 transition-opacity duration-500 sm:right-3",
        activePhoto >= 0 ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <ol className="flex flex-col items-end">
        {photos.map((photo, i) => {
          const active = i === activePhoto;
          return (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => goTo(photoIndexToSection(i))}
                aria-current={active ? "true" : undefined}
                aria-label={`Photograph ${i + 1}${photo.title ? `, ${photo.title}` : ""}`}
                title={photo.title ?? `Photograph ${i + 1}`}
                className="group flex cursor-pointer items-center justify-end gap-2 py-[7px] pl-6 pr-2"
              >
                {/* Frame number, on hover or keyboard focus only. */}
                <span
                  aria-hidden="true"
                  className="label tabular text-muted-foreground/0 transition-colors duration-200 group-hover:text-muted-foreground group-focus-visible:text-muted-foreground"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span
                  aria-hidden="true"
                  className={cn(
                    "block rounded-full transition-all duration-500",
                    active
                      ? "h-[2px] w-7 bg-accent"
                      : "h-px w-3 bg-muted-foreground/40 group-hover:w-5 group-hover:bg-muted-foreground",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

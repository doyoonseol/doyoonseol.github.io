"use client";

import { PhotoMeta } from "@/components/gallery/photo-meta";
import { IMAGE_SIZES, type Photo } from "@/lib/photos";

/* Plain <img> rather than next/image, deliberately. Image Optimization is
 * unavailable in a static export, so next/image would run `unoptimized` and add
 * a wrapper for no benefit. The planned build-time pipeline emits explicit
 * srcset/sizes, which is simpler to attach to a bare element.
 * See docs/decisions/0003-precomputed-image-pipeline.md */
/* eslint-disable @next/next/no-img-element */

/**
 * Inner layout of a slide. Shared, because the lens-reveal overlay has to render
 * the first photograph at *exactly* the position and size the real slide will,
 * or the handoff at the end of the transition would visibly jump.
 *
 * `h-full`, not `h-dvh`: sections are `fixed inset-0`, so the parent already is
 * the viewport. Using `h-dvh` here would double up and, on mobile, disagree with
 * the fixed box as the URL bar collapses.
 */
export const SLIDE_LAYOUT =
  "flex h-full flex-col items-center justify-center gap-6 px-6 py-12 sm:px-10";

/**
 * The photograph is capped below full height so the caption always sits inside
 * the viewport, whatever the aspect ratio. That cap tightens on small screens,
 * where the same caption occupies a much larger share of the available space — a
 * slide is exactly one viewport and can never be scrolled internally, so anything
 * overflowing would be unreachable.
 */
export const IMAGE_CLASS =
  "max-h-[52vh] w-auto max-w-full object-contain sm:max-h-[60vh] lg:max-h-[70vh]";

/**
 * The blur placeholder is painted as a background behind the image, so a slow
 * connection shows the photograph's colours rather than an empty box. It is inline
 * base64 in the HTML, so it costs no extra request. Placeholder frames have no LQIP,
 * hence the guard.
 */
export function lqipStyle(lqip: string) {
  if (!lqip) return undefined;
  return {
    backgroundImage: `url("${lqip}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as const;
}

/**
 * A photograph with its wall label. Used by the real slide and by the lens-reveal
 * overlay, which is why it takes no positioning of its own.
 */
export function PhotoFigure({
  photo,
  priority = false,
}: {
  photo: Photo;
  priority?: boolean;
}) {
  return (
    <figure className="flex min-h-0 flex-col items-center gap-5">
      <div className="relative isolate inline-flex items-center justify-center">
        {/* Ambient background glow using the image's own colors */}
        {photo.image.lqip && (
          <div
            className="absolute -inset-16 -z-10 opacity-50 blur-xl saturate-150 transition-opacity duration-1000 dark:opacity-40"
            style={{
              ...lqipStyle(photo.image.lqip),
              WebkitMaskImage:
                "linear-gradient(to top, transparent, black 4rem, black calc(100% - 4rem), transparent), linear-gradient(to left, transparent, black 4rem, black calc(100% - 4rem), transparent)",
              WebkitMaskComposite: "source-in",
              maskImage:
                "linear-gradient(to top, transparent, black 4rem, black calc(100% - 4rem), transparent), linear-gradient(to left, transparent, black 4rem, black calc(100% - 4rem), transparent)",
              maskComposite: "intersect",
            }}
            aria-hidden="true"
          />
        )}
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
          style={lqipStyle(photo.image.lqip)}
          className={IMAGE_CLASS}
        />
      </div>

      <figcaption className="flex flex-col items-center gap-3">
        {/* Wall label: frame number, then title. One line, so the caption never
            competes with the photograph for attention. */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-muted-foreground tracking-widest uppercase text-sm sm:text-base">
          {photo.title && (
            <h2 className="text-foreground">{photo.title}</h2>
          )}
          {photo.details?.location && (
            <>
              {photo.title && (
                <span aria-hidden="true" className="text-muted-foreground/30">
                  ·
                </span>
              )}
              <span className="text-muted-foreground">{photo.details.location}</span>
            </>
          )}

        </div>

        {/* Everything else — camera, focal length, aperture, shutter, ISO, location —
            lives in one line below, rendered only where a value was supplied. */}

        <PhotoMeta photo={photo} />

        {photo.caption && (
          <p className="mt-1 max-w-prose text-balance text-center text-[0.95rem] italic leading-relaxed text-muted-foreground">
            {photo.caption}
          </p>
        )}
      </figcaption>
    </figure>
  );
}

"use client";

import { PhotoCarousel } from "@/components/gallery/photo-carousel";
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
  "gallery-spotlight flex h-full flex-col items-center justify-center gap-6 px-6 py-12 sm:px-10";

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
  index,
  total,
  priority = false,
}: {
  photo: Photo;
  index: number;
  total: number;
  priority?: boolean;
}) {
  return (
    <figure className="relative z-10 flex min-h-0 flex-col items-center gap-5">
      {photo.raw ? (
        <PhotoCarousel photo={photo} imageClassName={IMAGE_CLASS} priority={priority} />
      ) : (
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
      )}

      <figcaption className="flex flex-col items-center gap-3">
        {/* Wall label: frame number, then title. One line, so the caption never
            competes with the photograph for attention. */}
        <div className="label flex flex-wrap items-center justify-center gap-3 text-muted-foreground">
          <span className="tabular text-muted-foreground/60">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>

          {photo.title && (
            <>
              <span aria-hidden="true" className="text-muted-foreground/30">
                ·
              </span>
              <h2 className="label text-foreground">{photo.title}</h2>
            </>
          )}

          {photo.location && (
            <>
              <span aria-hidden="true" className="text-muted-foreground/30">
                ·
              </span>
              <span>{photo.location}</span>
            </>
          )}
        </div>

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

# 0003 — Precompute every image derivative at build time

**Status:** superseded by [0010](./0010-folder-driven-gallery.md)
**Date:** 2026-08-30

> **Still current:** precomputing every rendition ahead of time, capping published
> output at 2560px, never upscaling, keeping generated and authored metadata separate,
> stripping GPS, and inline LQIP.
>
> **Superseded:** where it runs and what it emits. This record has the pipeline running
> **locally** with derivatives **committed**, and AVIF as the primary format. The owner
> needs to add photographs without a terminal, so it now runs in **CI**, derivatives are
> **gitignored**, and the format is **WebP** — AVIF measured 6.7× slower to encode for
> 26% fewer bytes, which is the wrong trade once that time is someone waiting on a
> deploy. The intention here to *fail* the build on missing alt text was also softened
> to a warning, for the reasons in [0010](./0010-folder-driven-gallery.md).

## Context

Static export removes `next/image`'s optimization entirely — it is on the
unsupported list, because the default loader needs a server. Meanwhile GitHub
Pages caps a **published site at 1 GB**, which for a photography portfolio is the
binding constraint on the whole project.

The obvious approach — drop full-resolution files in `public/` and point
`next/image` at them with `unoptimized` — fails on three counts. Originals become
publicly downloadable at a guessable URL. Every visitor downloads a
multi-megabyte file regardless of their screen. And the 1 GB ceiling arrives after
roughly 100 photographs.

## Decision

Precompute everything with `sharp` and `exifr` in `scripts/photos-build.ts`, run
locally on demand rather than in CI.

```
_originals/                     full-resolution files, gitignored, never published
        |
        |  npm run photos:build
        v
public/img/<hash>.avif          committed derivatives, 5 widths
public/img/<hash>.jpg           one mid-size fallback
src/data/photos.generated.json  dimensions, EXIF, LQIP, dominant colour
```

For each original: AVIF at 480 / 960 / 1440 / 1920 / 2560px, one JPEG at 1200px as
a floor, a 20px inline base64 LQIP, dominant colour, exact intrinsic dimensions,
and EXIF.

### AVIF-primary rather than a full AVIF + WebP ladder

A complete second WebP ladder would roughly double published size for a
diminishing-returns fallback. AVIF support is effectively universal in the browsers
this design already requires — Tailwind v4 itself targets Safari 16.4+, and AVIF
landed in 16.4. One JPEG covers anything older.

Rough budget: **0.75–1.3 MB per photograph** across all variants, so the 1 GB
ceiling lands somewhere around **750–1300 photographs**. Comfortable, and the
number is knowable in advance rather than discovered on a failed deploy.
`scripts/verify-export.sh` fails at 950 MB to leave headroom.

### Generated and authored data are separate files

`photos.generated.json` holds only machine-derived facts. Anything a human typed —
title, caption, alt text, collection, sort order — lives in a hand-edited file and
wins on conflict.

This is the single most important property of the pipeline. Re-running it after
adding fifty photographs must never overwrite a caption someone wrote. Merging by
photo id, with authored data taking precedence, is what makes the script safe to
run casually.

### GPS is stripped by default

EXIF location data in a published image is a real privacy leak, and most
photographers do not know it is there. Coordinates are read at build time and
discarded unless a collection explicitly opts in.

### Derivatives are committed

The tradeoff: repository size grows, in exchange for deployment staying trivial —
Pages builds straight from git, with no external storage and no credentials.

Past roughly 400 photographs this should move to Git LFS (set `lfs: true` on the
checkout step in both workflows) or to object storage with generation moved into
CI.

## Consequences

- **Zero image transformations at request time.** No quota, no cold start, no
  per-image cost.
- **Originals never leave the owner's machine.** The largest published file is
  2560px.
- **Layout shift of exactly zero.** Dimensions are known at build time, so every
  image reserves its box before a byte arrives.
- **LQIP is inline in the HTML**, so the blur paints on the first frame with no
  extra request.
- The pipeline is a manual step. Adding photographs means running one command
  before committing — documented in [04-adding-photos.md](../04-adding-photos.md).

## Why not run it in CI

It could be. It is deliberately local so that image processing is not on the
critical path of every deploy, and so the owner sees the output — including size
warnings — at the moment they add work, rather than in a CI log afterwards.

## Alternatives considered

**Cloudinary or imgix with a custom `next/image` loader.** Documented and
supported. Rejected: it reintroduces a third-party dependency and an account with
quotas, for a site whose entire premise is that it has no backend.

**Ship full-resolution originals and let the browser scale.** Simplest possible
approach, and unusable — a 12 MB file per slide on a phone.

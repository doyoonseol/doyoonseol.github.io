# 0010 — The gallery is a folder, and CI builds it

**Status:** accepted
**Date:** 2026-08-31
**Supersedes:** [0003](./0003-precomputed-image-pipeline.md) — the pipeline is built,
but it runs in CI rather than locally, and emits WebP rather than AVIF

## Context

The owner asked to add photographs without touching code. Until now the gallery was a
hand-written TypeScript array in `src/lib/photos.ts`: every new photograph meant
editing a typed literal, getting the pixel dimensions right by hand, and knowing what
a `Photo` object looks like.

[0003](./0003-precomputed-image-pipeline.md) had planned a pipeline, but explicitly
run **locally** — reasoning that image processing should stay off the deploy critical
path and that the owner would see size warnings as they worked. That reasoning assumed
a terminal. It is exactly what the request rules out.

## Decision

**`photos/` is the gallery.** Drop files in, and the site follows.

```
photos/
  01-harbour.jpg        numeric prefix sets order, stripped from the title
  01-harbour-raw.jpg    pairs as the unprocessed version
  01-harbour.json       optional overrides
        |
        |  scripts/photos-build.mjs   (runs in CI on every deploy)
        v
public/img/*.webp                  renditions, gitignored
src/data/photos.generated.json     manifest, gitignored
```

`photos/` is the only image source in version control. Everything derived is
gitignored, so the repository never accumulates generated artefacts — a reversal of
0003, which committed derivatives.

### It runs in CI, which is the whole point

Because generation happens during the deploy, adding a photograph is a **file upload
on github.com**. No clone, no Node, no terminal. That single change is what turns this
from "a pipeline" into "no code".

Renditions are cached with `actions/cache`, keyed on a hash of `photos/` with a
`restore-keys` prefix fallback. Adding one photograph re-encodes that one photograph
rather than the whole archive.

### Metadata comes from the files themselves

This is what makes the no-code claim hold up. A gallery still needs titles, captions
and camera details, and asking for them in a form would just be a different editor.

But photographers already produce this data. EXIF carries camera, lens, focal length,
aperture, shutter, ISO and capture date. **IPTC carries title and caption, and is
exactly what Lightroom's Title and Caption boxes write.** So `exifr` is asked for IPTC
and XMP as well as EXIF — neither is read by default — and the fields filled in during
editing arrive with the file.

Resolution order per field: sidecar `.json` → embedded IPTC/XMP → EXIF → filename.

A `.json` sidecar is the escape hatch for anything wrong or missing. It is data, not
code: a few quoted keys, and only the fields being changed.

### WebP, not AVIF

0003 chose AVIF-primary. Measured on real encode work across the five widths:

| Format | Time | Bytes |
|---|---|---|
| WebP | 754ms | 1039 KB |
| AVIF | 5037ms | 765 KB |

AVIF is **6.7× slower for 26% fewer bytes**. Once generation moved into CI that time
became the owner's wait after uploading, and the bytes buy nothing: at ~1 MB per
photograph the 1 GB Pages ceiling still allows around 950 of them. WebP.

No JPEG fallback either. Tailwind v4 already requires Safari 16.4+, and WebP landed in
Safari 14, so a fallback ladder would double both encode time and published bytes to
serve nobody.

### Alt text warns rather than fails

0003 intended the build to **fail** on a photograph without alt text. That is
incompatible with this workflow: a failed build after a web upload would leave the
owner with a broken deploy and no obvious fix.

So alt text falls back — IPTC alt → caption → title — and the build prints a warning
naming every photograph that fell all the way to the title. A title is a poor
description, and the log says so, but the site stays deployable. This is a genuine
weakening of the accessibility guarantee and is recorded as such in
[05-accessibility.md](../05-accessibility.md).

## Consequences

- Adding photographs no longer requires a developer, a checkout, or a terminal.
- **`photos/` is publicly readable**, because the repository is public. The published
  site caps renditions at 2560px, but the uploaded file is served as-is from GitHub, so
  the guide asks for ~2560px exports rather than full-resolution originals. This is the
  main cost of not committing derivatives, and it is a documentation-and-discipline fix
  rather than a technical one. A private repository would need GitHub Pro for Pages.
- Dimensions are read from the encoder's own output, after `.rotate()`, so a portrait
  frame on a rotated sensor is neither sideways nor mis-sized. Hand-entered dimensions
  were a standing source of stretched images; they are now impossible.
- Renditions cap at the source width and never upscale. The width ladder appends the
  source's own width rather than only filtering the standard list — filtering alone
  under-served small files, and a 900px original topped out at the 480px rendition,
  displayed at half the detail it had.
- `src/lib/photos.ts` keeps a placeholder set, used automatically while `photos/` is
  empty, so the layout stays reviewable before any real work exists.
- The generated manifest is gitignored, so `npm run photos` is chained ahead of `dev`,
  `typecheck` and `build`. A fresh clone therefore works with no extra step, at the
  cost of the pipeline running more than strictly necessary. Committing the manifest
  would avoid that and would mean a routinely stale generated file in git; keeping
  generated output entirely out of version control was judged the clearer rule.

## Alternatives considered

**A git-based CMS — Decap, Sveltia, Tina.** A real admin UI with drag-and-drop and
form fields, committing to the repository. Rejected for now: each needs a hosted OAuth
proxy or a paid cloud tier to authenticate against GitHub, which adds a service
dependency and a second thing that can break, for a single-author site whose only
content type is "a photograph". Worth revisiting if the sidecar files prove annoying —
the data model here would not need to change, only how the sidecars get written.

**A hosted CMS — Sanity, Contentful.** Content leaves the repository, needs API keys
and a rebuild webhook, and puts the archive behind someone else's free tier. Against
the brief's no-backend premise.

**Keep generation local, commit the derivatives** (0003 as written). Faster deploys and
keeps originals off GitHub entirely. Rejected: it requires a terminal for every new
photograph, which is the thing being removed.

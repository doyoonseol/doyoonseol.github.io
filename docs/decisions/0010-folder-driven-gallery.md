# 0010 — The gallery is a folder, and metadata is a sidecar

**Status:** accepted
**Date:** 2026-08-31
**Supersedes:** [0003](./0003-precomputed-image-pipeline.md) (local pipeline, committed
derivatives, EXIF extraction) and the authored-data half of
[0005](./0005-partial-metadata.md)

## Context

The owner asked to be able to add photographs "without having to manipulate any code",
and to keep adding more later. Until now a photograph meant hand-editing a TypeScript
array in `src/lib/photos.ts` — which is exactly the wrong shape for that.

[0003](./0003-precomputed-image-pipeline.md) had planned a pipeline run **locally**,
with derivatives committed and originals gitignored. Reasonable on its own terms, and
incompatible with this requirement: it needs a terminal, a Node install and a git
client before a single photograph can be published.

## Decision

**`photos/` is the gallery.** Drop in an image and a matching `.json`, commit, done.
No code is touched.

```
photos/01-harbour.jpg          the image                      ← committed
photos/01-harbour.json         its details                    ← committed

        |
        |  scripts/photos-build.mjs   (runs in CI on every deploy)
        v
public/img/01-harbour.<hash>-{480..2560}.webp                 ← gitignored
src/data/photos.generated.json                                ← gitignored
```

`photos/` is the only thing in version control. Everything derived is gitignored, so
the repository never accumulates build output.

### The pipeline runs in CI, not locally

This is the reversal that makes the whole thing work. Because generation happens
during the deploy, adding a photograph is a **file upload on github.com** — no
terminal, no local Node, no git client. That single change is what turns this from a
developer workflow into one the owner can use from any browser.

### Metadata comes only from the sidecar

The first implementation read camera settings from EXIF and title/caption from IPTC,
so a Lightroom export needed no sidecar at all. The owner rejected it, and was right
to: embedded metadata differs between bodies, is absent from scans, is stripped or
rewritten by some export pipelines, and is invisible in a file browser. What appeared
on the published site would depend on data that could not be seen or corrected without
special tools.

A hand-written `.json` is more typing and completely predictable. `exifr` was removed
as a dependency.

The one exception is the EXIF **orientation** flag, still honoured when resizing so a
portrait frame shot on a rotated sensor is not served sideways. That describes the
pixels, not the photograph.

### Exactly six details are displayed

`camera`, `focalLength`, `aperture`, `exposure`, `iso`, `location` — defined once as
`FIELDS` in the pipeline and as `PhotoDetails` in `src/lib/photos.ts`. `lens` and
`date` were dropped; they were not on the list.

Absent fields are not rendered at all: no dashes, no empty rows. This keeps the
principle from [0005](./0005-partial-metadata.md) — partial detail is the normal case,
not an edge case — while narrowing where the values come from.

Unrecognised keys are warned about and ignored, so a typo cannot silently change the
page.

### WebP, not AVIF

Measured rather than assumed. Across the five widths, for one 4000×2667 source:

| Format | Encode | Output |
|---|---|---|
| WebP q78 | **754ms** | 1039 KB |
| AVIF q58 | 5037ms | 765 KB |

AVIF is 6.7× slower for 26% fewer bytes. Since encoding now sits in the deploy path,
that multiple is time the owner waits after uploading, and the bytes saved buy nothing
against a 1 GB ceiling that still leaves room for roughly 950 photographs. No JPEG
fallback either: WebP has been supported since Safari 14, and this design already
requires Safari 16.4+ via Tailwind v4.

### Renditions are cached across CI runs

`actions/cache` keyed on `hashFiles('photos/**')`, with a `photos-` `restore-keys`
prefix so a changed key still restores the previous cache. Combined with
content-hashed filenames, uploading one photograph re-encodes one photograph rather
than the archive.

## Consequences

- Adding photographs needs no code, no terminal and no local environment.
- **Source files are public.** The repository is public, so anything in `photos/` is
  downloadable at the size uploaded. The site never serves above 2560px, but the
  source is whatever was provided — hence the standing advice to export at ~2560px
  rather than uploading full-resolution originals. This is the real cost of the
  decision and is documented everywhere the owner will look.
- Deploys are slower, proportional to how many photographs changed.
- Alt text can no longer be enforced at build time. [0005](./0005-partial-metadata.md)
  intended the build to fail without it; failing a deploy over a missing caption would
  defeat the purpose of the folder, so the pipeline warns loudly and falls back to the
  caption, then the title. **This is a genuine weakening of an accessibility
  guarantee**, recorded rather than glossed over.
- Deleting a photograph must prune its renditions. Skipping that on the empty-folder
  path was a real bug found in testing: `public/` is copied verbatim into the export,
  so orphaned files stayed published and kept counting against the size budget.
- `photos/` being empty is a supported state — the site falls back to the generated
  placeholder set, so the layout stays reviewable before any real work exists.

## Alternatives considered

**A git-based CMS** (Decap, Sveltia) at `/admin`, giving a real form-based editor with
drag-and-drop upload. Genuinely nicer for typing metadata. Rejected for now: it needs
an OAuth broker, which means either a hosted service or a Cloudflare Worker to
maintain, for a single-author site where the same job is done by uploading two files.
Worth revisiting if editing JSON by hand becomes the friction point.

**A hosted CMS** (Sanity, Contentful). Adds an account, API keys and a rebuild webhook,
and moves the content out of the repository — which loses the property that the whole
site is one self-contained thing.

**Keep generation local, commit derivatives** ([0003](./0003-precomputed-image-pipeline.md)).
Faster deploys and originals never published. Requires a terminal, so it fails the
actual requirement.

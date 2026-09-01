# Adding photographs

Written for the owner. **No code, no terminal, no local setup.**

The short version lives in [`photos/README.md`](../photos/README.md), which sits next
to the files themselves so it is visible on GitHub at the moment it is needed. This
document is the same workflow with the reasoning attached.

## The workflow

Each photograph is two files in `photos/`:

```
01-harbour.jpg          the image
01-harbour.json         its title, alt text and shot details
```

Entirely in a browser:

1. Open `photos/` on GitHub.
2. **Add file → Upload files**, drag both files in.
3. **Commit changes.**

GitHub Actions rebuilds and republishes. A couple of minutes, tracked on the
**Actions** tab.

Locally instead, if preferred: drop the files in `photos/`, then
`npm run dev` to look at it or `npm run verify` to check everything.
`npm run photos` alone regenerates just the images.

## Ordering

The numeric prefix sets the running order and is stripped from the title, so
`01-harbour.jpg` displays as **Harbour**. Without prefixes, files sort
alphabetically. Reordering later means renaming files — nothing else.

## The `.json` file

```json
{
  "title": "Harbour, Reykjavík",
  "alt": "Fishing boats moored against a concrete quay under an overcast sky.",
  "camera": "Fujifilm X-T5",
  "focalLength": "35mm",
  "aperture": "f/2",
  "shutter": "1/500",
  "iso": 320,
  "location": "Reykjavík, Iceland"
}
```

Six details are displayed and no others: **camera, focal length, aperture, shutter,
ISO, location**. Plus `title`, optional `caption`, and `alt`.

**Omit anything you do not have.** Absent fields are not rendered — no dashes, no
empty rows. A photograph with only a camera name reads as deliberate, which matters
because that is exactly what a film scan looks like. One with no details at all is
also fine.

Unrecognised keys are ignored with a warning in the build log, so a stray field
cannot quietly change the page.

### Formatting is forgiving

Values are normalised at render time, so they can be typed the way you would say them.

| Written | Displayed |
|---|---|
| `"aperture": "2.8"` or `"f/2.8"` | f/2.8 |
| `"shutter": "1/250"` | 1/250s |
| `"iso": 320` or `"320"` | ISO 320 |
| `"focalLength": "35"` or `"35mm"` | 35mm |

## Why nothing is read from the image itself

An earlier version read camera settings from EXIF and the title from IPTC, so a
Lightroom export needed no sidecar at all. That was removed deliberately.

Embedded metadata is not dependable enough to build a public page on. It differs
between camera bodies, is absent entirely from scans, gets stripped or rewritten by
some export pipelines, and is invisible in a file browser — so what appeared on the
site depended on details that could not be seen or corrected without special tools.
One hand-written file per photograph is more typing and completely predictable.

The single exception is the EXIF **orientation** flag, which is still honoured when
resizing so a portrait frame shot on a rotated sensor is not served on its side. That
describes the pixels rather than the photograph.

## RAW alongside the edit

```
01-harbour.jpg          the finished photograph
01-harbour-raw.jpg      the unprocessed version
01-harbour.json         one details file covers both
```

That slide gains an arrow to page between the two. Export both at **identical pixel
dimensions** or the frames will not line up.

`src` is always the finished work: it is shown first and sizes the slide. The RAW is
loaded lazily, so it costs nothing unless somebody looks at it.

## What happens on upload

`scripts/photos-build.mjs` runs, and for each image:

- writes WebP renditions at up to 480 / 960 / 1440 / 1920 / 2560px, never upscaling
- builds a 24px inline blur shown while the real file loads
- reads the `.json` for details
- writes `src/data/photos.generated.json`, which the site imports

Renditions are content-hashed and cached between CI runs, so uploading one photograph
re-encodes one photograph rather than the archive. Deleting a photograph removes its
renditions on the next build.

Everything generated is gitignored. `photos/` is the only thing in version control,
so the repository never fills up with build output.

## Editing the introduction and contact details

`src/lib/site.ts` — name, bio, location, email, social links. This one *is* a code
file; anything marked `FILLER` is waiting to be replaced.

## Things worth knowing

**Alt text is the one field to always fill in.** It is the description read aloud to
someone who cannot see the photograph. Left out, the caption is used, then the title —
better than silence but not a description. The build warns but never fails, because
blocking a deploy over a missing caption would defeat the point of this folder.

**The repository is public.** Whatever is uploaded to `photos/` can be downloaded
from GitHub at the size uploaded. The site never serves anything larger than 2560px,
but the source file is exactly what was provided — so export at around 2560px rather
than uploading full-resolution originals.

**Keep an eye on the size warning.** `npm run verify` and the CI log both report the
published size against the 1 GB GitHub Pages ceiling, and fail at 950 MB. At current
settings that is roughly 950 photographs.

**Fewer, better.** Forty frames where every one earns its place will outperform two
hundred with a soft middle.

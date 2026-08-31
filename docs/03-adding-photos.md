# Adding photographs

Written for the owner. **No code, and no terminal.**

## The whole workflow

1. Open the `photos/` folder on GitHub.
2. **Add file → Upload files**, drag your images in.
3. **Commit changes.**

That is it. The site rebuilds and publishes itself in a couple of minutes; progress
is on the repository's **Actions** tab. There is a copy of these instructions in
[`photos/README.md`](../photos/README.md) so they are visible from the folder itself.

Nothing else needs editing. The build reads the folder, generates every size the site
serves, pulls the camera details out of each file, and assembles the gallery.

## Ordering

A number in front sets the running order, and is stripped from the title:

```
01-harbour.jpg      ->  "Harbour"
02-rooftops.jpg     ->  "Rooftops"
03-late-light.jpg   ->  "Late Light"
```

Without numbers, files are ordered alphabetically. To reorder later, rename the
files — no other change.

## Titles, captions and camera details

Picked up automatically, from the files themselves:

| Shown on the site | Comes from |
|---|---|
| Camera, lens, focal length, aperture, shutter, ISO | EXIF, written by your camera |
| Date | EXIF capture date, shown as "March 2026" |
| Title | IPTC Title — Lightroom's **Title** box |
| Caption, and alt text | IPTC Caption — Lightroom's **Caption** box |
| Location | IPTC City and Country |

So filling in Title and Caption on export is all that is needed. Anything absent is
simply left out: a scanned negative showing only a camera name is fine, and so is a
photograph with no details at all.

## Correcting anything

If a field is wrong or missing, add a small text file beside the image with the same
name and a `.json` extension. Include only what you want to change.

`01-harbour.json`

```json
{
  "title": "Harbour, Reykjavík",
  "caption": "Fishing boats under flat grey light.",
  "alt": "Fishing boats moored against a concrete quay under an overcast sky.",
  "location": "Iceland",
  "date": "March 2026",
  "metadata": { "camera": "Pentax 67", "lens": "SMC 105mm f/2.4" }
}
```

These always win over what is embedded in the file. Values are formatted for you —
`"2.8"` displays as `f/2.8`, `"1/250"` as `1/250s`, `400` as `ISO 400`.

## Showing the RAW next to the edit

Add a second file with `-raw` on the end of the name:

```
01-harbour.jpg        the finished photograph
01-harbour-raw.jpg    the unprocessed version
```

That slide gains an arrow to page between the two. Export both at the **same pixel
dimensions** or they will not line up.

## Removing or replacing

Delete the file on GitHub, or upload a replacement with the same name. Old renditions
are cleaned up automatically on the next build.

## Two things worth knowing

**Export at about 2560px on the long edge.** The site never serves anything larger,
so bigger files buy nothing — and **this repository is public**, so whatever you
upload can be downloaded from GitHub at the size you uploaded it. Uploading
full-resolution originals would publish them.

**Alt text matters.** It is what someone using a screen reader receives instead of
the photograph. The Caption field covers it. If nothing is available the title is used
instead, which is better than silence but is not a description — the build prints a
warning in the Actions log naming any photograph in that state.

## For anyone working locally

```bash
npm run photos     # rebuild renditions and the manifest
npm run dev        # runs the above first, then the dev server
npm run verify     # typecheck, lint, build, validate the export
```

`photos/` is the only image source in version control. Renditions
(`public/img/`), the manifest (`src/data/photos.generated.json`) and the encode cache
are all generated and gitignored. Encoding is cached by file content, so re-runs only
touch what changed.

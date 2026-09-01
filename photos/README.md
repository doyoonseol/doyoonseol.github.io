# Put photographs here

Each photograph is two files: the image, and a small text file with its details.
No code, no commands.

The quickest way, entirely in a browser:

1. Open this folder on GitHub.
2. **Add file → Upload files**, then drag both files in.
3. **Commit changes.**

The site rebuilds itself and the new photograph is live in a couple of minutes.
Progress is on the repository's **Actions** tab.

## Naming

```
01-harbour.jpg          a number in front sets the running order
01-harbour.json         its details — same name, .json on the end
02-rooftops.jpg
02-rooftops.json
```

The number is stripped from the title, so `01-harbour.jpg` becomes **Harbour**.
Without numbers, files are ordered alphabetically. To reorder later, just rename.

## The .json file

Copy this, delete any line you do not have, and fill in the rest.

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

Those six details — **camera, focal length, aperture, shutter, ISO, location** — are
the only ones the site ever shows. **Leave out anything you do not have** and it
simply will not appear. A photograph with only a camera name is fine. So is one with
no details at all.

Write the values however you say them. All of these work:

| You write | It shows |
|---|---|
| `"aperture": "2.8"` or `"f/2.8"` | f/2.8 |
| `"shutter": "1/250"` | 1/250s |
| `"iso": 320` or `"320"` | ISO 320 |
| `"focalLength": "35"` or `"35mm"` | 35mm |

Two optional extras: `"caption"` for a sentence of context below the photograph, and
`"alt"`, described below.

Nothing is read from the image file itself. The camera's own embedded data is
ignored on purpose — it varies between bodies, is missing from scans, and gets
rewritten by some export tools, so what appeared on the site would depend on things
you cannot see. This file is the single source of truth.

## Showing the RAW alongside the edit

Add a second image with `-raw` on the end of the name:

```
01-harbour.jpg          the finished photograph
01-harbour-raw.jpg      the unprocessed version
01-harbour.json         one details file covers both
```

That slide then gets an arrow to page between the two. Export both at the **same
pixel dimensions**, or they will not line up.

## Two things worth knowing

**Alt text.** `"alt"` is the description read aloud to someone who cannot see the
photograph — say what is in the frame, plainly. If you leave it out, the caption is
used, and failing that the title, which is better than silence but not a real
description. This is the one field worth always filling in.

**This repository is public.** Whatever you upload here can be downloaded from
GitHub at the size you uploaded it. The published website never serves anything
larger than 2560px on the long edge, but the file in this folder is the file you
provided — so export at around 2560px rather than uploading full-resolution
originals.

## If something looks wrong

The **Actions** tab shows the build log. The pipeline prints a line per photograph
and warns about anything it could not use — a malformed `.json`, a missing `alt`, a
field name it does not recognise. It never fails the build over content, so the site
stays up either way.

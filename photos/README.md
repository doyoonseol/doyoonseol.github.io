# Put photographs here

Drop image files into this folder and the site picks them up. No code, no commands.

The quickest way, entirely in a browser:

1. Open this folder on GitHub.
2. **Add file → Upload files**, then drag your images in.
3. **Commit changes.**

The site rebuilds itself and the new photographs are live in a couple of minutes.
Progress is on the repository's **Actions** tab.

## Naming

```
01-harbour.jpg          a number in front sets the running order
02-rooftops.jpg
03-late-light.jpg
```

The number is stripped from the title, so `01-harbour.jpg` becomes **Harbour**.
Without numbers, files are ordered alphabetically.

## Titles, captions, camera details

All picked up automatically.

Camera, lens, focal length, aperture, shutter and ISO come from the file's EXIF —
your camera already wrote them. Title and caption come from the file's IPTC fields,
which is what Lightroom's **Title** and **Caption** boxes write. Fill those in when
exporting and there is nothing else to do.

Missing details are simply left out. A scanned negative showing only a camera name
is fine; so is a photograph with no details at all.

## Overriding anything

If a field is wrong or absent, add a small text file next to the image with the same
name and a `.json` extension. Only include what you want to change.

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

## Showing the RAW alongside the edit

Add a second file with `-raw` on the end of the name:

```
01-harbour.jpg          the finished photograph
01-harbour-raw.jpg      the unprocessed version
```

That slide then gets an arrow to page between the two. Export both at the **same
pixel dimensions**, or they will not line up.

## Two things worth knowing

**Alt text.** This is the description read aloud to someone who cannot see the
photograph. The Caption field covers it. If nothing is available the title is used
instead, which is better than silence but not a real description.

**This repository is public.** Whatever you upload here can be downloaded from
GitHub at the size you uploaded it. The published website never serves anything
larger than 2560px, but the file in this folder is the file you provided — so export
at around 2560px rather than uploading full-resolution originals.

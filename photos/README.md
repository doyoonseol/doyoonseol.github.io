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

## Metadata via .json sidecar files

Metadata is **not read from the photo files themselves**. Instead, include a `.json` text file alongside each photo image with the exact same name (e.g. `01-harbour.json` for `01-harbour.jpg`).

The supported metadata fields shown on the website are:
- `camera`
- `focalLength` (or `focal`)
- `aperture` (F number, e.g. `"2.8"`)
- `shutter` (shutter speed, e.g. `"1/250"`)
- `iso`
- `location`

You can also include `title`, `caption`, and `alt` text in the JSON file.

### Example: `01-harbour.json`

```json
{
  "title": "Harbour, Reykjavík",
  "caption": "Fishing boats under flat grey light.",
  "alt": "Fishing boats moored against a concrete quay under an overcast sky.",
  "location": "Iceland",
  "metadata": {
    "camera": "Fujifilm X-T5",
    "focalLength": "35",
    "aperture": "2.8",
    "shutter": "1/500",
    "iso": 320
  }
}
```

If not all listed metadata fields are provided in the `.json` file, they are assumed not present and will not be displayed on the website.

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

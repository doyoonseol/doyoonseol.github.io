# Product

A photography portfolio for Doyoon Seol at **https://doyoonseol.github.io**.
Its only job is to show photographs as well as a browser can.

## Priorities, in order

1. Someone who wants to look at the work. Every decision serves this reader first.
2. Someone evaluating the photographer — editor, gallery, client.
3. The owner, who must be able to add photographs without touching code.

## The experience

One continuous scroll. A landing panel with the name, a short bio and a camera
that tracks the pointer; the first scroll zooms into the camera's lens and hands
off to the photographs, each occupying its own full-viewport slide.

## Art direction

Museum minimalism for structure, a darkroom for the dark mode, a warm palette
throughout. **EB Garamond for everything.** Light and dark, following the OS by
default with a manual override.

The governing rule: **the photograph is the only thing on screen that gets to be
interesting.** Interface recedes. If a change would make photographs harder to
look at, it is the wrong change however good it looks in isolation.

## Non-goals

Do not add these without being asked:

- CMS, database, or any backend
- Accounts, comments, social features
- E-commerce (prints would be hosted payment links)
- **Right-click blocking or download obfuscation.** It does not work, it breaks
  legitimate browser behaviour, and it reads as amateurish. Resolution capping is
  the effective control.
- Analytics requiring a cookie banner
- Autoplaying motion the reader did not ask for

## Content status

**Photographs are added by dropping files into `photos/` — never by editing code.**
The build reads that folder, generates every rendition, and pulls titles, captions and
camera details out of EXIF/IPTC. Do not reintroduce a hand-maintained photo list, and
do not ask the owner to run a command to publish. See
`docs/decisions/0010-folder-driven-gallery.md`.

While `photos/` is empty the site falls back to placeholder frames, so the layout stays
reviewable.

Site copy is still **filler**, marked `FILLER` in `src/lib/site.ts`. The owner is
supplying real content, including a 3D camera render, incrementally.

When content is missing, add a clearly-marked placeholder in the right position rather
than removing the element — the owner reviews placement before supplying the real thing.

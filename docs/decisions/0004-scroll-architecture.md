# 0004 — Single-page scroll narrative, and why not intercepting routes

**Status:** partially superseded by [0006](./0006-mandatory-snap-and-timed-zoom.md)
**Date:** 2026-08-30

> **Still current:** the single-route narrative, and everything below about
> intercepting routes and deep links.
>
> **Superseded:** the snap type and the hero timeline. This record describes
> `scroll-snap-type: y proximity` and a 260vh scroll-scrubbed hero. Owner feedback
> required hard snapping between photographs, which is incompatible with a
> scrubbed hero — see [0006](./0006-mandatory-snap-and-timed-zoom.md) for what
> replaced it and why the two could not coexist.

## Context

The brief calls for a specific experience: a landing panel with an introduction
and a camera that tracks the pointer, where the first scroll zooms into the
camera's lens and hands off to the photographs, each of which occupies its own
full-viewport slide with fluid scrolling between them.

Two hard constraints shape how this can be built:

1. `output: 'export'` — no server, and **intercepting routes are unsupported**.
   They appear on the official unsupported list in
   `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`, because they
   depend on runtime URL rewriting.
2. A scroll-scrubbed animation needs scroll distance to scrub against, and it
   must survive being interleaved with scroll-snapping slides.

## Decision

**One route (`/`) carrying the whole narrative: hero, then slides.**

A route change would end the scroll timeline and force a document transition,
which is exactly the seam the lens zoom exists to hide. Keeping it on a single
document is what makes the transition possible at all.

### The zoom

The hero's outer element is `260vh` and does nothing but provide scroll distance.
Its child is `sticky top-0 h-dvh`, so it holds still while that distance is
consumed. `useScroll` maps that span to progress 0 → 1, which drives everything:

| Progress | What happens |
|---|---|
| 0.00–0.16 | Introduction fades and lifts away |
| 0.00–0.90 | Camera scales 1× → 3.4× → 17× |
| 0.30–0.90 | Tilt relaxes to zero |
| 0.45–0.78 | Lens interior darkens over the viewport |
| 0.86–1.00 | Darkness resolves to `--background` |

Three details are load-bearing:

**The lens is centred inside `CameraModel`, and the model is centred in the
viewport.** A plain centre-origin scale therefore lands on the glass. No
measuring, no per-frame layout reads, nothing to recalculate on resize.

**Scale is non-linear** (1 → 3.4 → 17). A single linear ramp reads mechanical;
easing in slowly makes the camera feel like it is being approached.

**The final stage resolves to `--background`, not to black.** Ending on black
would mean a hard cut into a light-mode gallery. Resolving to the page background
means the first photograph rises out of a surface the site already uses, in either
theme. This is the difference between the transition feeling designed and feeling
like two animations bolted together.

**Perspective sits on a wrapper outside the scaling element**, so the 3D space
itself is not scaled along with its contents.

### Scroll snap

`scroll-snap-type: y proximity` on `<html>`, with `snap-start snap-always` on
each slide.

`proximity` rather than `mandatory` is the important part, and it is not a
preference — `mandatory` is actively incompatible with the pinned hero. Mandatory
snapping refuses to let the viewport rest anywhere that is not a snap point, so it
would jump straight past the 160vh of scrub the zoom depends on. Proximity still
snaps crisply once a slide is near.

`snap-always` prevents a fast trackpad flick from skipping several photographs at
once, which is the behaviour that makes a deck feel like a deck.

## Consequences

- No per-photograph URL yet. Nothing can be linked to or shared individually.
  This is the real cost, and it is deferred rather than dismissed — see below.
- Adding photographs lengthens the document. At a few dozen this is fine, since
  slides below the fold are lazily loaded. Past roughly 60 the initial HTML
  starts to get heavy and collections should be split across routes.
- `prefers-reduced-motion` collapses the scroll zone to one viewport and skips
  the scrub entirely. The site remains completely usable, just not cinematic.

## When deep links are wanted

The lightbox pattern originally planned for this project used intercepting routes,
which static export forbids. The replacement, when per-photograph links are
needed:

- Generate real `/p/[slug]` pages with `generateStaticParams()`. Fully supported,
  and a pasted link renders a genuine indexable page.
- From the deck, call `window.history.pushState` to sync the URL as slides pass,
  and listen for `popstate`. Next 16 supports the native History API, so this
  reproduces the user-facing behaviour of intercepting routes without needing a
  server rewrite.

This is deliberately not built yet. It should follow the owner's feedback on the
draft, because how photographs are grouped will determine what a shareable unit
even is.

## Alternatives considered

**Scroll-driven CSS animations** (`animation-timeline: scroll()`) — would remove
the JavaScript entirely. Rejected for now: support is still uneven across
browsers for something this central, and the fallback would be no transition at
all rather than a degraded one. Worth revisiting.

**A horizontal filmstrip** — considered during art direction and not chosen. It
would have made the lens zoom incoherent, since the zoom establishes a forward
axis and the gallery would then move sideways.

**Snap `mandatory` with the hero as its own snap point** — kills the scrub. See above.

# 0008 — No scrolling at all: a pinned stage

**Status:** accepted
**Date:** 2026-08-30
**Supersedes:** the scrolling mechanics in [0007](./0007-js-driven-deck.md)
(the *commit-on-intent* principle from 0007 still holds)

## Context

Owner feedback on draft 3:

> But now, multiple photographs can be seen at the same time, which I do not want.
> Make it so that only one photograph is visible at all times.

And separately:

> when scrolling back up to the landing page, the camera should zoom out from the
> lens to the full camera instead of scrolling up.

Draft 3 already committed on intent rather than waiting for the browser, and it
already prevented free scrolling. But it still *animated the scroll position* over
620ms to move between sections — and for the whole of those 620ms, two full-height
sections share the viewport. That is unavoidable: moving a viewport from one section
to the next necessarily has both on screen in between. Animating it only controls
how long two are visible, never whether.

This is the third revision of navigation, and each one narrowed the same problem:

| Draft | Mechanism | Why it failed |
|---|---|---|
| 2 | CSS `scroll-snap: mandatory` | Snapped too late; browser waits for momentum to decay |
| 3 | JS-animated scroll, commit on intent | Immediate, but two photographs visible during the scroll |
| 4 | **Pinned stage, no scrolling** | — |

## Decision

**Nothing scrolls.** `html` and the stage are `overflow: hidden`. Every section is
`fixed inset-0`, stacked, and exactly one is opaque. There is no scroll position, so
there is no arrangement in which two photographs share the screen.

### Transitions are sequential, not cross-dissolved

Changing section fades the outgoing one out over 200ms, swaps, then fades the
incoming one in over 280ms.

A cross-dissolve was the first instinct and is wrong here: at the midpoint it has two
photographs on screen simultaneously at partial opacity. The two fades therefore do
not overlap. The brief dip through the page background is the price of the guarantee,
and at 480ms total it reads as deliberate rather than slow.

`WHEEL_THRESHOLD` also dropped from 26 to 18, as asked.

> Superseded: that single threshold became a pair, plus a scroll-rate gate, and the
> values are no longer these. 18 proved far too sensitive on a trackpad once gestures
> could chain. See [0009](./0009-queued-continuous-paging.md).

### The reverse lens is the same animation run backwards

This is the part worth noting. `Hero` does not implement a transition — it reads the
deck's `zoom` value and renders whatever that value currently says. `LensReveal` does
the same with `reveal`. Neither has a direction baked in.

So going back to the landing page needed no new animation. The controller
reconstructs the "inside the lens" state (`zoom = 1`, `reveal = 1`, intro on stage)
and runs both values down instead of up. Forward and reverse are exact mirrors
because they are the same code.

Two details had to be corrected for the reverse to read properly, and both were
found by tracing the values rather than by watching it:

- **The aperture bottoms out at `10vmax`, not 0**, so that it reads as a lens rather
  than a dot. Closing to a non-zero radius would leave a visible disc of photograph
  that pops out of existence at the end. The layer therefore also fades over the
  first 7% of the range.
- **The camera body now fades out over `zoom` 0.55 → 1**, not 0.15 → 0.8. On the way
  in it makes no difference, since the aperture covers the camera anyway. On the way
  out it is essential: with the old range the camera was still invisible when the
  aperture finished closing, so the photograph would have shrunk into empty
  background instead of back into a lens.

### Only a window of sections is mounted

`DeckSection` renders nothing when a section is more than one step from the current
one. This is not premature optimisation. Every section is `fixed inset-0`, so a
mounted section is inside the viewport rectangle as far as the browser is concerned,
and `loading="lazy"` would not defer anything — mounting all of them would download
the entire archive on first paint. A window of one either side keeps the next
transition instant while loading nothing else.

The first photograph is additionally pinned while the intro is on stage, because the
lens overlay renders it.

## Consequences

Accepted knowingly, because the one-photograph rule cannot be met otherwise:

- **No document scroll offset.** Browser scroll restoration and find-in-page no
  longer traverse the deck. [0007](./0007-js-driven-deck.md) listed exactly this as
  the reason to prefer animated scroll over a transform pager; the requirement has
  now overruled it.
- **No JavaScript means no navigation**, so the pinned stage would strand a reader on
  the landing panel. A `<noscript>` style block in `layout.tsx` unpins the sections
  and restores document scrolling. It has to be `<noscript>` rather than a `.no-js`
  class, because a class would need removing by the very JavaScript whose absence it
  describes. The fallback is degraded — only a window of sections is in the HTML —
  but reachable.
- **The controller now always installs**, including under `prefers-reduced-motion`,
  where it previously stood down and left the work to CSS snap. With no scrolling to
  fall back on, standing down would mean no navigation at all. Reduced motion instead
  makes transitions instant swaps and skips the lens sequence entirely. Reduced
  motion means less movement, not less function.
- `SLIDE_LAYOUT` changed from `h-dvh` to `h-full`: the section is already the
  viewport, and doubling up would disagree with the fixed box as a mobile URL bar
  collapses.
- Sections are `aria-hidden` and `inert` when inactive, so a screen reader is not
  offered every photograph at once and Tab cannot land inside an invisible one.

## Alternatives considered

**Cross-dissolve between sections.** Prettier, and it puts two photographs on screen
together. Rejected on the explicit requirement.

**Keep scrolling but make it very fast.** Reduces the window in which two are visible
without closing it. The requirement is absolute, so this does not satisfy it.

**A translated track** (all sections in a row, `transform: translateY`). Same defect
as scrolling — during the translation two sections are on screen.

**Scroll with each section clipped to `overflow: hidden`.** Would hide the neighbour
geometrically, but the neighbour still occupies the viewport during the move, so the
outgoing photograph would slide out of its own frame. Worse than either.

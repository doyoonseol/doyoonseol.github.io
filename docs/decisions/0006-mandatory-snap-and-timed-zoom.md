# 0006 — Mandatory snap, and a timed lens zoom

**Status:** partially superseded by [0007](./0007-js-driven-deck.md)
**Date:** 2026-08-30
**Supersedes:** the snap and hero-timeline parts of [0004](./0004-scroll-architecture.md)

> **Still current:** the requirement itself — no resting position between two
> photographs, never two visible at once — and every section being exactly one
> viewport. Also still current: why a scroll-*scrubbed* hero is impossible here.
>
> **Superseded:** the mechanism. CSS mandatory snap turned out to snap too late,
> because the browser waits for trackpad momentum to decay before deciding
> scrolling has stopped, and that delay is not configurable. Scrolling is now
> driven by a JavaScript controller that commits on intent; CSS snap remains only
> as the no-JavaScript and reduced-motion fallback. The lens sequence also no longer
> ends in a curtain and a scroll — the first photograph now opens out of the lens
> itself. See [0007](./0007-js-driven-deck.md).

## Context

Owner feedback on the first draft, verbatim in substance:

> I do not want a case where you are scrolling and you can stay in the space
> between photographs. So always snap to the closer photograph slide. There
> should not be any case where two photographs are visible at the same time.

Also: the gap between the landing panel and the first photograph was too long.

[0004](./0004-scroll-architecture.md) had chosen `scroll-snap-type: y proximity`
precisely so a **260vh pinned hero** could be used as a scroll-scrubbed animation
timeline for the lens zoom. Both of those choices are now wrong, and they fail
together rather than separately.

## The conflict

`scroll-snap-type: y mandatory` requires the scroll container to rest at a snap
point whenever it is not being actively scrolled. A scrubbed animation is built
entirely out of resting at intermediate positions. The two cannot coexist: with
mandatory snapping, the browser would refuse to settle anywhere inside the hero's
scrub zone and would jump straight from the top of the hero to the first
photograph, skipping the animation.

So the requirement to snap hard is also, unavoidably, a requirement to stop
driving the zoom from scroll position.

## Decision

**Every section is exactly one viewport and its own snap point.**

- `scroll-snap-type: y mandatory` on `<html>`.
- Hero, every photograph, and the closing panel: `h-dvh snap-start snap-always`.
- The closing panel changed from `min-h-[60vh]` to `h-dvh` — at 60vh it allowed a
  resting position showing the last photograph and the footer together, which is
  the same defect the feedback was about.

**The lens zoom runs on its own clock**, triggered by the first downward scroll
intent while the hero is in view. Implemented at the time in a
`useLensTransition` hook — since removed, its role absorbed by `DeckProvider`:

| Step | What happens |
|---|---|
| 1 | `zoom` 0 → 1 over 1.05s — camera scales onto the lens, barrel interior darkens |
| 2 | `curtain` 0 → 1 over 0.28s — viewport covered in `--background` |
| 3 | Instant jump to the gallery, while nothing is visible |
| 4 | `curtain` 1 → 0 over 0.55s — the first photograph fades up |

Steps 2–4 are what hide the seam. Covering in `--background` rather than black
means the reveal reads correctly in either theme, and jumping while covered means
the scroll position change is never seen.

### The listeners must not be passive

This is the subtle part, and it was a real bug in the first attempt.

The gesture that starts the transition has to be cancelled with
`preventDefault()`. Under mandatory snapping, an uncancelled wheel event or swipe
carries the page straight to the first slide — so the reader would arrive at the
photograph and only *then* see the camera animate behind the curtain. A passive
listener is not permitted to call `preventDefault`, so the trigger listeners are
registered `{ passive: false }`.

Scroll is suppressed for the ~1.4s the sequence lasts and released in a `finally`,
so a failure cannot leave the page stuck.

## Consequences

- **The dead gap is gone.** The hero went from 260vh to 100vh, which was the
  second half of the feedback.
- **The zoom is no longer scrubbable.** The reader cannot half-enter the lens and
  hold there. Given the snapping requirement, that state should not have existed
  anyway.
- **Timing is now tunable** rather than a function of how fast someone scrolls,
  which is a genuine improvement — the previous version played at wildly different
  speeds on a trackpad versus a mouse wheel.
- Briefly intercepting scroll is a real cost. It is bounded to one short sequence,
  happens at most once per visit to the top, re-arms only when the reader returns
  to the hero, and is skipped entirely under `prefers-reduced-motion`.
- Slides can never scroll internally, so their content **must** fit one viewport.
  This is why the photograph cap tightens on small screens
  (`52vh → 60vh → 70vh`): the caption takes a much larger share of a phone screen,
  and overflow would be unreachable.

## Alternatives considered

**Keep proximity snapping.** Rejected — it is what the feedback was about. With
proximity, a slow scroll can rest between two photographs.

**Mandatory snap with extra snap points through the hero.** The zoom would advance
in discrete jumps between snap positions. Steppy and worse than either extreme.

**Put the slides in their own nested scroll container** with mandatory snap, hero
outside it. Technically satisfies both, but nested scrolling is poor on trackpads,
breaks the page's natural scrollbar, and makes anchor links unreliable.

**Scroll-driven CSS animations** (`animation-timeline: scroll()`). Same fundamental
conflict — still driven by scroll position, still incompatible with mandatory snap.

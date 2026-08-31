# 0007 — JavaScript-driven deck, and the lens as the first photograph's entrance

**Status:** partially superseded by [0008](./0008-no-scroll-stage.md)
**Date:** 2026-08-30

> **Still current:** committing on *intent* rather than waiting for the browser to
> decide scrolling has stopped, the gesture thresholds and the re-arm rule, and the
> whole approach of revealing the first photograph through the lens instead of
> scrolling to it.
>
> **Superseded:** the transition itself. This record animates the document scroll
> position between sections, which means two photographs are on screen for the
> duration of every move. The deck no longer scrolls at all — sections are pinned and
> faded. See [0008](./0008-no-scroll-stage.md). The note below about preferring
> animated scroll over a transform pager, in order to keep scroll restoration and
> find-in-page working, was overruled by that requirement.
**Supersedes:** the transition mechanics in [0006](./0006-mandatory-snap-and-timed-zoom.md)
(the *requirement* from 0006 — no resting position between photographs — still holds)

## Context

Two pieces of owner feedback on draft 2.

**The snap was late.** With `scroll-snap-type: y mandatory`, the page scrolls
freely and only snaps once the browser decides scrolling has finished — which means
after trackpad momentum decays. That delay is not exposed to CSS or JavaScript and
cannot be shortened. Asked for instead: *"if the scroll amount reaches a threshold,
the page should smoothly transition to the next slide"*, referencing
[i30101.github.io](https://i30101.github.io/) for the feel.

Inspecting that site settled the question: it registers a `wheel` listener and
drives `scrollIntoView` / `scrollTo` itself, on top of Tailwind snap utilities. So
the reference achieves its feel with a JavaScript controller, not with CSS.

**The first photograph should not be scrolled to.** It should appear *from inside
the camera lens* — the reader scrolls through the glass and the photograph comes
out of it.

## Decision

### Scrolling is owned by `DeckProvider`

The page is a fixed, ordered list of full-viewport sections (`src/lib/deck.ts`).
A single controller intercepts `wheel`, touch and keys, and commits on **intent**
rather than on rest:

| Parameter | Value | Note |
|---|---|---|
| `WHEEL_THRESHOLD` | 26 | Small enough that one wheel tick commits immediately |
| `SWIPE_THRESHOLD` | 44px | Touch travel to commit |
| `TRANSITION_S` | 0.62s | Fixed, so the feel does not depend on scroll speed |
| `REARM_QUIET_MS` | 110ms | Quiet period before a new gesture counts |

The re-arm rule is what delivers **one section per flick**. After a transition the
controller refuses new gestures until the pointer has been quiet for 110ms.
Without it, trackpad momentum keeps producing wheel events after the animation
ends and the deck would run away several sections.

> **The re-arm rule was removed in [0009](./0009-queued-continuous-paging.md).** It
> was never requested — it was added here on the implementer's own judgement, and it
> forced the reader to pause between sections. Momentum runaway is now handled by a
> two-tier wheel threshold and a bounded queue instead.

CSS snap is still declared and is still correct — it is the fallback with no
JavaScript, and the path taken under reduced motion. The controller sets
`data-deck="js"` on `<html>`, and `html[data-deck="js"] { scroll-snap-type: none }`
switches CSS snapping off so the two never fight over the scroll position.

`overscroll-behavior-y: contain` stops vertical gestures chaining into the
browser's own overscroll.

### The first photograph comes out of the lens

Intro → section 1 does not scroll. It plays a sequence:

1. `zoom` 0 → 1 over 0.85s — the camera scales to 6× onto its centred lens, the
   introduction fades, and the camera body fades away so the eye is left with glass.
2. From 0.42s, `reveal` 0 → 1 over 0.7s — `LensReveal`, a fixed full-viewport layer
   holding the first slide, is masked by `circle(6vmax → 155vmax at 50% 50%)`. The
   photograph opens out of the aperture.
3. Once covered, the scroll position jumps to that section instantly.
4. On the next frame `reveal` and `zoom` drop to 0. The overlay vanishes.

The overlap in step 2 is what makes it read as *emerging from* the glass rather
than replacing it.

Step 4 is invisible for one reason: the overlay renders `PhotoFigure` with the same
`SLIDE_LAYOUT` constant as the real slide, so once the circle exceeds the viewport
the two are pixel-identical. **This is why the figure and its layout were extracted
into a shared component** — if the overlay and the slide could drift apart, the
handoff would visibly jump.

The camera only reaches 6×, down from 17×. The old value existed to fill the screen
with glass; the expanding aperture now does that, so the camera only needs to come
close enough for the circle to look like it opens out of the lens.

Reverse (section 1 → intro) is a plain animated scroll. Reversing the sequence
would be pretty and is not worth the state machine.

### Consequences

- The tick rail now reads position from the controller instead of an
  `IntersectionObserver`. It had to: the lens move changes the scroll position
  instantly behind a covering overlay, so there is no gradual intersection to
  observe and an observer would disagree with the controller outright.
- `SiteChrome`'s navigation became buttons calling `goTo` rather than fragment
  links. A fragment link moves the scroll position behind the controller's back,
  and for the first photograph it would skip the lens reveal entirely.
- Slide entry animations were removed. Under the controller a section is either on
  screen or it is not, so a scroll-triggered fade would be invisible or would fight
  the transition.
- Native scrolling no longer happens while the controller is installed, so the
  scrollbar does not move under the reader's own gesture. Position is still a real
  document scroll offset, so deep links, browser restore and find-in-page keep
  working — a `transform`-based pager would have broken all three.
- Reduced motion stands the controller down entirely: no interception, CSS snap
  active, no lens sequence, first photograph is an ordinary section.

## Alternatives considered

**Shorten the CSS snap delay.** Not possible. It is browser-internal.

**`scroll-snap-stop: always` with a shorter duration.** Does not help; the delay is
in scroll-end detection, not the snap animation.

**A `transform`-based full-page pager** (translate a fixed container). Total control
over timing, and it breaks the scrollbar, fragment links, find-in-page and browser
scroll restoration. Rejected — animated document scroll gets the same feel while
staying a real scroll position.

**Render the first photograph literally inside the lens element**, nested in the
camera's transformed subtree. It would inherit the 6× scale and every parent
transform, so the photograph would need to be counter-scaled by a factor derived
from the animation each frame. An expanding circular mask on an untransformed
full-screen layer achieves the same read with no such coupling.

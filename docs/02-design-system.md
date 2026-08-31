# Design system and style guide

Every value here lives in `src/app/globals.css`. That file is the source of
truth; this document explains the reasoning so the values can be changed
confidently rather than nervously.

## The direction in one paragraph

A white-cube gallery that can turn the lights off. Structure and restraint come
from museum minimalism — generous space, hairline rules, captions set like wall
labels. The dark mode comes from a screening room, deep enough that photographs
appear self-illuminated. The palette in both modes is warm rather than neutral,
so neither reads as clinical. Interaction is quiet and physical: things respond
to the pointer, nothing demands attention, and the only saturated colour on any
screen belongs to the photograph.

## Colour

All colour is authored in `oklch(L C H)`. Two reasons this is not fussiness:
lightness is perceptually uniform, so 55% reads as the same visual weight at any
hue; and hue is one number, so warming the whole palette is a single
find-and-replace instead of re-picking twenty hex values.

Structural hues sit between **55 and 90** — the warm quadrant, toward paper and
clay. Chroma stays under **0.01** for anything structural.

### Light — warm paper

| Token | Value | Role |
|---|---|---|
| `--background` | `oklch(98.6% 0.005 85)` | Page. Warm off-white, never `#fff` |
| `--foreground` | `oklch(23% 0.008 60)` | Body text, warm near-black |
| `--muted-foreground` | `oklch(52% 0.009 65)` | Captions, metadata. 4.6:1 on background |
| `--hairline` | `oklch(93.5% 0.005 82)` | Wall-label rules, lighter than `--border` |
| `--accent` | `oklch(60% 0.055 55)` | Muted clay. Focus rings, selection |

### Dark — warm darkroom

| Token | Value | Role |
|---|---|---|
| `--background` | `oklch(13.5% 0.004 60)` | Deep enough that photographs glow |
| `--foreground` | `oklch(92% 0.006 85)` | Warm off-white |
| `--muted-foreground` | `oklch(66% 0.008 70)` | 5.9:1 on background |
| `--accent` | `oklch(73% 0.06 65)` | Lifted; the same clay reads muddy on black |

Pure white on a photography site is a mistake worth naming. Next to a print it
reads as a blown highlight, and it makes every photograph look slightly muddy by
comparison. Warm paper flatters the work instead of competing with it.

Dark mode lifts `--accent` rather than reusing the light value. Identical chroma
at low background lightness looks dull; it needs more lightness to read as the
same colour.

### Rules

- Never hard-code a colour in a component. If a value is needed, it belongs in
  `globals.css` as a token first.
- Token names follow shadcn/ui, so components added via its CLI inherit the
  palette with no modification.
- The camera in the hero is the one exception: it uses literal `oklch()` values
  because it depicts a physical object rather than interface, and it must read as
  the same dark object in both themes. Its body sits near 30% lightness, which
  separates from both warm paper and near-black.

## Typography

**EB Garamond, everywhere.** Headings, body, captions, metadata. One face, no
mono, no secondary sans. It ships as a variable font via `next/font/google`,
self-hosted at build time — no request to Google, no layout shift.

| Context | Treatment |
|---|---|
| Body | `1.0625rem` / `1.65`. Garamond has a small x-height for its size and needs more room than a grotesque |
| Headings | Weight **400**, `line-height: 1.15`, `letter-spacing: -0.011em` |
| Labels (`.label`) | `0.6875rem`, uppercase, `0.14em` tracking |
| Figures (`.tabular`) | `tabular-nums lining-nums` |

Two deliberate choices:

**Headings are not bold.** Garamond establishes hierarchy through size and
space. Bolding it thickens the strokes and loses the thing worth having.

**Figures switch context.** Body copy uses oldstyle numerals, which sit within
the x-height and read as text. Metadata uses `.tabular` for lining tabular
figures, so `f/2.8` and `1/500s` align in a column instead of dancing. Applying
either globally would be wrong in half the cases.

Small caps at 11px in a Garamond is near the legibility floor. `.label` is for
short, known strings — field names, frame numbers — never for anything a reader
must parse carefully.

## Space and shape

- `--radius: 0.5rem`, with `sm/md/lg/xl` derived from it.
- Photographs are never rounded or shadowed. A print has square corners.
- Hairlines for structure; borders only where something must be contained.

## Motion

`--ease-gallery: cubic-bezier(0.22, 1, 0.36, 1)` — a decisive out-ease. Nothing
on this site snaps.

| Interaction | Duration |
|---|---|
| Section to section | 200ms out, then 280ms in |
| Into the lens | 850ms zoom, aperture opening 420ms → 1120ms |
| Out of the lens | 620ms aperture close, 800ms zoom out from 180ms |
| RAW pager step | 500ms |
| Tick mark change | 500ms |
| Hover, colour | 300ms |
| Chrome and rail fade | 500–700ms |
| Camera tilt | spring: stiffness 90, damping 22, mass 0.9 |

All of the deck's timing constants sit together at the top of
`deck-provider.tsx` rather than being scattered through the component.

The camera tilt is a spring rather than a duration on purpose. It keeps drifting
briefly after the cursor stops, which is what makes it read as an object with
mass rather than a value bound to a slider.

**`prefers-reduced-motion` is enforced globally** in `globals.css`, not
per-component: animations and transitions collapse to ~0ms, and smooth scrolling
and scroll snap are disabled. On top of that floor, the lens zoom is not installed
at all — no scroll interception, no animation, and the hero becomes a static panel.
Pointer tilt is not attached either. This is a floor no component can accidentally
bypass.

## Navigation

**Nothing scrolls.** Every section is `fixed inset-0`, stacked, and exactly one is
opaque. There is no scroll position, which is what guarantees that exactly one
photograph is on screen at any moment — any scrolled transition, however brief, puts
two there. Full reasoning in
[decisions/0008](./decisions/0008-no-scroll-stage.md).

`DeckProvider` commits on **intent**: as soon as accumulated wheel delta crosses the
threshold, or a swipe travels 40px. Not when the browser decides scrolling has
stopped, which is unconfigurable and late.

| Step | Duration |
|---|---|
| Outgoing section fades out | 200ms |
| Swap | — |
| Incoming section fades in | 280ms |

The two fades are **sequential, not overlapping**. A cross-dissolve would put two
photographs on screen at partial opacity. The brief dip through the page background
is the price of the guarantee.

### Continuous scrolling

Gestures are queued, never rejected. A request that arrives mid-transition adds to a
desired index, and the next transition starts the instant the current one ends — so
scrolling continuously keeps advancing with no pause between sections.

Four constants shape this, and they interact:

| Constant | Value | Role |
|---|---|---|
| `WHEEL_FIRST` | 60 | First section of a gesture. One wheel notch still commits at once |
| `WHEEL_CHAIN` | 220 | Delta needed for each section after that |
| `MIN_CHAIN_RATE` | 1.0 px/ms | Chained sections require the reader to still be driving |
| `QUEUE_CAP` | 1 | How far ahead of reality the queue may run |

**`MIN_CHAIN_RATE` is the one doing the real work.** Accumulated delta cannot tell a
deliberate gesture from trackpad coasting — macOS momentum emits events for over a
second after the fingers lift, and a delta threshold high enough to absorb that also
destroys the mouse wheel, where 100px is one deliberate notch. Rate separates them:
momentum decays exponentially so its rate collapses quickly, while a reader still
moving their fingers holds a steady rate.

`QUEUE_CAP` is the secondary throttle and the easiest thing here to misread. Requests
arriving while the backlog is full are clamped away rather than banked, so total travel
is bounded by roughly (gesture duration ÷ transition duration) + the cap, not by how
much delta was produced.

Calibrated against simulated gesture profiles — measurements and the tuning knob are in
[decisions/0009](./decisions/0009-queued-continuous-paging.md).

Three consequences worth holding onto:

- **A section can never scroll internally**, so its content must fit one viewport.
  That is why the photograph cap tightens on small screens (52vh → 60vh → 70vh) —
  the caption takes a much larger share of a phone screen and anything overflowing
  would be unreachable.
- **No scroll-triggered entry animations.** A section is either on stage or it is
  invisible.
- **Only a window of one section either side is mounted.** A pinned section is inside
  the viewport rectangle as far as the browser is concerned, so `loading="lazy"`
  defers nothing — mounting all of them would download the whole archive on first
  paint.

## Signature interactions

### Pointer-tracked camera

`usePointerTilt` reads pointer position across the **whole viewport**, not just
the camera's own box, so the camera responds while the cursor is anywhere on the
page. That reads as awareness rather than as a hover effect.

Pointer position goes into motion values, which write to the compositor directly.
The handler does no layout reads and triggers no React re-render.

Skipped entirely on coarse pointers. There is no hover position on a phone.

### The lens, both ways

The landing panel does not move to the first photograph — the photograph comes out of
the camera lens, and going back puts it away again.

**In.** The camera scales to 6× onto its centred lens over 850ms while the
introduction fades. From 420ms in, a full-viewport layer holding the first slide is
unmasked by a circle growing from `10vmax` to `155vmax` at the viewport centre, which
is where the lens is.

**Out.** The same two values run the other way: the aperture closes over 620ms and
the camera scales back over 800ms. Neither `Hero` nor `LensReveal` implements a
transition — each renders whatever the deck's `zoom` and `reveal` currently say — so
the reverse required no new animation and is an exact mirror by construction.

Two calibrations are load-bearing and easy to break:

- The aperture bottoms out at `10vmax`, not 0, so it reads as a lens rather than a
  dot. Because of that the layer must also fade over the first 7% of the range, or a
  disc of photograph pops in and out at the extremes.
- The camera body fades over `zoom` 0.55 → 1, deliberately late. Going in it makes no
  difference. Coming out, the camera has to be visible again by the time the aperture
  finishes closing, or the photograph shrinks into empty background instead of back
  into a lens.

The handoff at the end of the forward sequence is invisible because the overlay
renders the same `PhotoFigure` with the same `SLIDE_LAYOUT` as the real slide. **If
those two ever diverge, it will visibly jump** — which is the whole reason the figure
is a shared component.

### RAW comparison

Photographs carrying a `raw` version become a two-frame pager, like a post with
more than one image: the finished photograph first, an arrow to step right to the
unprocessed version, with page dots below.

The edited image sits in normal flow and defines the box; the RAW is absolutely
positioned over it at the same size. Paging translates both by 100%. Sizing this way
avoids the circular-dependency problem of a percentage-width flex track inside a
shrink-to-fit container, and means the finished photograph determines the slide's
dimensions.

Horizontal swipes are handled inside the carousel and never reach the deck
controller, which only claims vertical intent.

### Slide rail

A vertical index of tick marks, one per photograph, on the right edge. The active
frame's tick is longer *and* takes the accent colour — length carries the signal
independently of hue, so position stays readable for anyone who cannot distinguish
the accent from the muted foreground. Hit areas are padded well beyond the hairline
mark they draw. Clicking scrolls smoothly to that frame; the rail retires in the
hero and closing panel rather than pointing at a stale frame.

## Photograph presentation

- Capped at `74vh`, not full-bleed, so the caption always sits within the
  viewport regardless of aspect ratio. A panorama and a portrait land with the
  same optical weight.
- `width` and `height` always set, so the box is reserved before any bytes
  arrive and layout shift is zero.
- Metadata renders as one dot-separated line, and only the fields that exist.
  See [decisions/0005](./decisions/0005-partial-metadata.md).
- Captions are optional and italic. Most photographs should not have one.

## Adding to this system

1. New colour, spacing or motion value → add a token to `globals.css`.
2. New repeated pattern → add a utility in the `@layer utilities` block.
3. Only then reach for a component.

If a change to one of these values would make photographs harder to look at, it
is the wrong change regardless of how it looks in isolation.

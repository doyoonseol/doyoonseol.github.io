# 0009 — Queued paging, so continuous scrolling advances continuously

**Status:** accepted
**Date:** 2026-08-30
**Supersedes:** the re-arm rule in [0007](./0007-js-driven-deck.md)

## Context

Owner feedback on draft 4:

> I do not like how you have to pause your scroll to go down multiple slides. I want
> to keep the same transition you have currently but allow for multiple slides to be
> scrolled if the mouse is scrolled continuously without having to pause.

The cause was `REARM_QUIET_MS`, introduced in [0007](./0007-js-driven-deck.md): after
each transition the controller refused new gestures until the pointer had been quiet
for 110ms. Sustained scrolling therefore produced exactly one section change and then
nothing until you stopped and started again.

Worth naming plainly: **that rule was never asked for.** It was added on the
implementer's own judgement to stop trackpad momentum from running the deck away, and
it solved that at the cost of a behaviour the owner disliked. The underlying problem
is real; the fix was too blunt.

## Decision

Gestures are **queued, never rejected.** A request that arrives mid-transition updates
a desired index, and a pump advances one section at a time toward it, starting the next
transition the instant the previous one ends. Scrolling continuously keeps advancing
with no pause.

The transition itself is unchanged, as asked: 200ms out, swap, 280ms in.

### Momentum is handled by thresholds and a rate gate, not a lock

| Constant | Value | Role |
|---|---|---|
| `WHEEL_FIRST` | 60 | First section of a gesture. One wheel notch (100px) still commits at once |
| `WHEEL_CHAIN` | 220 | Delta needed for each section after that |
| `MIN_CHAIN_RATE` | 1.0 px/ms | Chained sections also require the reader to still be *driving* |
| `RATE_WINDOW_MS` | 120 | Window the rate is measured over |
| `GESTURE_GAP_MS` | 260 | Silence after which the next event starts a fresh gesture |
| `SWIPE_THRESHOLD` | 56px | Touch travel to commit |
| `QUEUE_CAP` | 1 | How far ahead of reality the queue may run |

Keeping the first step cheap preserves the immediate response
[0007](./0007-js-driven-deck.md) was about. Everything after it is where a gesture runs
away, so it is gated much harder.

**The rate gate is the part that actually worked**, and it was reached only after the
delta-only approach was shown to be a dead end. Accumulated delta cannot distinguish
intent from coasting: macOS momentum keeps emitting events for over a second after the
fingers lift, and raising the delta threshold high enough to absorb that also destroys
the mouse wheel, where 100px is one deliberate notch. Simulation showed
`WHEEL_CHAIN = 300` reducing three deliberate notches to a single section.

Rate separates the two cleanly. Momentum decays exponentially, so its rate collapses
within a few hundred milliseconds, while a reader still moving their fingers holds a
roughly constant rate. Gating chained steps on ≥ 1.0 px/ms over a 120ms window took a
slight flick from three sections to one without making deliberate scrolling feel
unresponsive.

### `QUEUE_CAP` is the real throttle, and it is easy to misread

Requests arriving while the backlog is full are **clamped away, not banked**. Total
travel is therefore bounded by roughly

```
(gesture duration ÷ transition duration) + QUEUE_CAP
```

not by how much delta the gesture produced. Simulating the pump alongside the
accumulator showed a hard ~900px flick landing about three sections on, where counting
raw step requests had predicted eight. The first version of that simulation counted
requests and was wrong by more than a factor of two — the clamp, not the threshold,
does most of the work.

Simulated behaviour at the chosen values, against the earlier settings that the owner
reported as too sensitive:

| Gesture | Total delta | Was | Now |
|---|---|---|---|
| One mouse notch | 100px | 1 | **1** |
| Three notches, 120ms apart | 300px | 3 | **1** |
| Eight notches, 100ms apart | 800px | 3 | **2** |
| Slight trackpad flick | 231px | 3 | **1** |
| Small trackpad swipe | 459px | 3 | **1** |
| Normal trackpad swipe | 882px | 3 | **2** |
| Hard trackpad flick | 1736px | 4 | **2** |
| Sustained drag, 1.5s | 1643px | 5 | **3** |
| Long drag, 3s | 2980px | 8 | **5** |

Roughly half the travel across the board, with continuous scrolling still advancing for
as long as it continues.

The one regression is the mouse wheel: three deliberate notches now advance one section
rather than three. That is the direct cost of calming the trackpad, and it was accepted
because the owner works on a trackpad. If it needs correcting, `WHEEL_CHAIN` is the knob
— but note that lowering it re-sensitises the trackpad, since it is the same number.
A genuine fix would mean classifying the input device rather than sharing one threshold.

### Stepping and jumping are now distinct

`step(dir)` nudges the desired index by one and lets the pump walk there a section at
a time, so scrolling past several photographs shows each of them. `goTo(index)` — the
tick rail and the corner wordmark — jumps straight to the target without visiting
anything between. Previously there was one path and the rail would have had to fade
through every intervening section.

## Consequences

- Scrolling continuously advances continuously. The reported problem is gone.
- Direction reversal mid-chain is handled for free: it moves the desired index, and the
  pump simply turns around.
- A gesture can still overshoot by a section or two on unfamiliar hardware, since
  momentum profiles vary. `WHEEL_CHAIN` is the single knob for that, and the numbers
  above are the baseline to compare against.
- The pump and the transition runner are mutually recursive, so the pump is reached
  through a ref. Without that indirection the runner would be redefined on every render
  and the listeners rebound with it.

## Alternatives considered

**Lower `REARM_QUIET_MS` instead of removing it.** Any non-zero value still requires a
pause; the objection was to the pause existing at all.

**Bank every step request and drain the whole queue.** This is what the naive reading
of "allow multiple slides" suggests, and it is unusable — a hard flick would commit to
eight transitions the reader cannot cancel, roughly four seconds of unstoppable
animation.

**Detect the momentum phase and ignore it.** No browser exposes it. Heuristics on
decaying delta magnitude are unreliable across trackpad drivers.

**Jump straight to the desired index instead of walking to it.** Faster, and it skips
the intervening photographs entirely — which defeats scrolling *through* a collection.
Retained only for direct jumps from the rail.

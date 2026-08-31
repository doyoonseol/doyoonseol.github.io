# Accessibility

Target: **WCAG 2.2 AA**.

An honest caveat up front: full AA conformance cannot be claimed from automated
checks and code review alone. It requires testing with real assistive technology
and expert review. What follows separates what has been verified from what has
not.

## Built in

### Motion

`prefers-reduced-motion` is honoured **globally** in `globals.css`, not
per-component: animations and transitions collapse to ~0ms.

Beyond that blanket rule:

- **The lens sequence is skipped entirely** and section changes become instant swaps.
  A 6× scaling transform is close to a vestibular worst case, so it is removed rather
  than shortened.
- **Pointer tilt is not attached** — no listener, no springs.
- **The deck controller still installs.** This is a deliberate departure from the
  usual "stand down under reduced motion" pattern: since nothing on the page scrolls,
  standing down would leave the reader with no way past the landing panel. Reduced
  motion here means no animation, not no navigation.

### Images

`alt` is a **required** field on the `Photo` type — not optional, not defaulted.
A photograph without a description is invisible to a screen reader user, and this is
the single most common accessibility failure on photography sites.

It is always populated, but **by fallback, not by guarantee.** The pipeline resolves it
from IPTC alt text, then the caption, then the title, and prints a warning in the deploy
log naming every photograph that fell all the way to the title.

That is weaker than the original intention, which was to fail the build on a missing
description. Failing would leave the owner with a broken deploy after uploading a
photograph through GitHub and no obvious way to fix it, which would make the whole
no-code workflow unusable — so it warns instead. A title is not a description, so
**the warnings in the Actions log are worth reading.** Filling the Caption field on
export removes the problem at source. See
[decisions/0010](./decisions/0010-folder-driven-gallery.md).

### Metadata

Shot details display as a compact line — `Fujifilm X-T5 · 35mm · f/2 · 1/500s`.
Visually the values are self-describing; aurally they would be a run of
fragments. So the markup is a `<dl>` with visually hidden `<dt>` field names and
visible `<dd>` values. Correct semantics, no visual cost.

Decorative separators are `aria-hidden`.

### Keyboard

- A **skip link** to the photographs is the first focusable element.
- `:focus-visible` is styled once globally at 2px with 3px offset, using
  `--ring`. It is deliberately not removed anywhere.
- The theme control uses `role="group"` with `aria-pressed` toggle buttons rather
  than `role="radiogroup"`. A radiogroup owes the user arrow-key navigation and a
  roving tabindex; three toggle buttons are honest about what they are and are
  fully operable with Tab alone, with no custom key handling to get wrong.
- **The deck never steals keys from a focused control.** `DeckProvider` checks
  whether the event originated inside a `button`, `a`, `input`, `textarea`, `select`
  or anything with a `tabindex`, and stands down if so. Without that, Space on a
  button would page the deck instead of activating the button, and the RAW carousel's
  arrows would be unusable.
- The deck itself is keyboard-navigable: ArrowUp/Down, PageUp/Down, Space, Home, End.
- **The RAW comparison is two real `<button>` arrows plus page-dot buttons**, each
  labelled ("Show the unprocessed RAW version") and carrying `aria-current` on the
  active dot. The off-screen frame is `aria-hidden`, so a screen reader is never
  offered two competing descriptions of the same photograph.
- **The tick rail is a `<nav>` with a labelled button per photograph**, carrying
  `aria-current` on the active frame. Hit areas are padded far beyond the hairline
  mark they draw, so the target is comfortable on touch.
- The lens transition is reachable **without scrolling**: the scroll cue is a real
  `<button>`, so keyboard and switch users can trigger it directly.
- Navigation in the corner marks and the skip control are buttons routed through the
  deck rather than fragment links — a fragment jump would move the scroll position
  behind the controller's back and, for the first photograph, skip the lens reveal.
- Every control is a real `<button>` or `<a>`. Nothing interactive is a `div`.

### Structure and contrast

- One `<h1>` (the name); each photograph's title is an `<h2>` inside a `<figure>`.
- `<figure>` / `<figcaption>` for photographs, `<article>` per slide with an
  accessible name, landmark elements for header and footer.
- Body and metadata contrast computed against their own backgrounds:
  `--muted-foreground` is **4.6:1** in light mode and **5.9:1** in dark. Both clear
  the 4.5:1 AA threshold for normal text.
- Theme follows the OS by default via `prefers-color-scheme`, so a user who has
  already expressed a preference is respected without touching anything.

## Verified

- Contrast ratios calculated for body and muted text in both themes.
- Reduced-motion paths exercised in code; the global CSS floor cannot be bypassed
  by a component.
- `npm run lint` clean, including `eslint-plugin-jsx-a11y` rules bundled with
  `eslint-config-next`.
- Semantic structure and focus order reviewed by reading the rendered output.

## Not yet verified

Stated plainly rather than implied:

- No screen reader testing — VoiceOver, NVDA, JAWS.
- No axe or Lighthouse accessibility audit run against a live build.
- Keyboard traversal not exercised in a real browser.
- `.label` type is 11px uppercase in a Garamond, which is small. It is used only
  for short known strings — field names, frame numbers — but it should be checked
  at that size by eye.
- **Replacing scrolling entirely is the biggest open risk in this codebase**, and it
  got larger in draft 4. `DeckProvider` calls `preventDefault` on every wheel and
  vertical touch gesture, and there is now **no document scroll offset at all** —
  sections are pinned and faded. Screen reader virtual cursors, switch devices and
  browser zoom navigation all assume a scrollable document. This has not been tested
  against any of them and is where a real problem is most likely to be hiding.
  See [decisions/0008](./decisions/0008-no-scroll-stage.md) for why the alternative
  was rejected.
- **Only a window of sections is in the DOM.** A screen reader cannot browse the whole
  collection linearly; it sees the current photograph and its immediate neighbours.
  Inactive sections carry `aria-hidden` and `inert` so they are not announced, but
  that means the document outline is genuinely partial.
- **Keyboard-only paging through the whole deck has not been walked**, including
  whether focus lands somewhere sensible after each section change. It currently does
  not move focus at all, which is likely wrong: a section change is a context change
  the reader receives no notification of. Moving focus to the new section's heading is
  the obvious fix and has not been done.
- The reduced-motion path has been reasoned about but not exercised.
- Without JavaScript the `<noscript>` fallback unpins the sections and restores
  document scrolling, but only the sections present in the initial HTML are reachable.
  Untested.
- The RAW carousel's arrow buttons sit over the photograph with a translucent
  backdrop. Contrast against an arbitrary image is not guaranteed and should be
  checked against a few real photographs, particularly bright ones.

## Before calling this done

```bash
npm run build && npm run preview
npx --yes @axe-core/cli http://localhost:3000
```

Then, by hand:

1. Tab through the whole page. Every stop visible, order sensible, skip link first.
2. VoiceOver (⌘F5) through a few slides. Do the photographs read meaningfully? Does
   the metadata make sense aurally?
3. System Settings → Accessibility → Display → Reduce Motion, then reload. The zoom
   should be gone, not merely faster.
4. Zoom to 200%. Nothing clipped, nothing horizontally scrolling.
5. Both themes, since contrast differs.

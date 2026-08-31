# Technical constraints

Next.js 16.3.3 · React 19.2.8 · Tailwind 4 · TypeScript strict · shadcn/ui ·
`motion` 13 · `next-themes` · **npm** · static export → GitHub Pages.

## Commands

```bash
npm run dev            # a server may already be running on :3000
npm run verify         # typecheck + lint + build + verify:export — run before finishing
npm run preview        # serve out/ as Pages would
```

`npm run verify` is the gate. If it passes, the deploy passes.

## NOTHING ON THIS PAGE SCROLLS

`DeckProvider` (`src/components/deck/deck-provider.tsx`) owns all navigation. Every
section is `fixed inset-0`, stacked, and exactly one is opaque; the controller fades
between them. `html` and the stage are `overflow: hidden`.

This is not a style preference. Exactly one photograph must be visible at any moment,
and **any** scrolled or translated transition puts two on screen while it runs. Three
earlier designs failed on this; read
`docs/decisions/0008-no-scroll-stage.md` before changing any of it.

- **Do not reintroduce scrolling, CSS scroll-snap, `scrollIntoView` or fragment
  links.** They are all gone deliberately.
- Section fades are **sequential, never overlapping** — a cross-dissolve shows two
  photographs at partial opacity.
- Gestures are **queued, never rejected**, so continuous scrolling keeps advancing with
  no pause. Do not add a lock or cooldown that blocks input during a transition; that
  was tried and the owner rejected it.
- Momentum runaway is handled by `MIN_CHAIN_RATE` (a minimum scroll *rate* for chained
  sections), plus a large `WHEEL_CHAIN` and `QUEUE_CAP`. **Delta thresholds alone cannot
  do this** — enough delta to absorb trackpad coasting also destroys the mouse wheel.
  Sensitivity has already been calibrated down once; raise `MIN_CHAIN_RATE` before
  `WHEEL_CHAIN` if it needs to be calmer still.
  See `docs/decisions/0009-queued-continuous-paging.md`.
- `step()` walks one section at a time so intervening photographs are seen; `goTo()`
  jumps directly and is for the rail and corner marks. Keep them distinct.
- Deck listeners must stay `{ passive: false }`; they need `preventDefault`.
- The deck ignores key events originating from a focused control, so buttons and the
  RAW carousel keep their own keyboard behaviour.
- Sections are declared once in `src/lib/deck.ts`. Derive position from there, never
  by counting DOM nodes.
- `DeckSection` mounts only a window of ±1. A pinned section counts as in-viewport, so
  `loading="lazy"` defers nothing and mounting all of them would fetch the entire
  archive on first paint.
- The first photograph is **not navigated to** — it opens out of the camera lens.
  `Hero` and `LensReveal` render whatever `zoom` and `reveal` currently say and have
  no direction baked in, which is what makes the reverse an exact mirror. Keep it that
  way rather than writing a second animation.
- `PhotoFigure` and `SLIDE_LAYOUT` are shared between `LensReveal` and the real slide
  so the handoff is invisible. **Keep them shared.**
- The reduced-motion path still installs the controller — with nothing scrolling,
  standing down would strand the reader on the landing panel.
- Sections cannot scroll internally; content must fit one viewport.

## Hard constraints from `output: 'export'`

No server exists in production. These fail the build:

- Middleware/proxy, `rewrites`, `redirects`, `headers`
- Server Actions, `cookies()`, `headers()`
- ISR, Draft Mode
- **Intercepting routes** — this is why the lightbox is a single-page scroll deck
- `next/image` with the default loader
- Dynamic routes without `generateStaticParams()`

Route Handlers work only as `GET` with `export const dynamic = 'force-static'`.

Authoritative list: `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`.

## Things that will waste your time

- **`public/.nojekyll` is load-bearing.** Without it GitHub runs Jekyll, which
  strips `_next/`; the deploy succeeds and the site renders unstyled. Guarded by
  `scripts/verify-export.sh`.
- **No `basePath`, and that is correct.** `doyoonseol.github.io` is a *user* site
  served from the domain root. Adding one breaks every URL.
- **GitHub Pages caps the published site at 1 GB.** The real limit on how many
  photographs can ship. `verify-export.sh` fails at 950 MB.
- **`shadcn init` hangs** even with `-y`. `components.json` and `lib/utils.ts`
  already exist — use `shadcn add <component>`, never `init`.
- **Next 16 removed the `eslint` key** from `next.config.ts`. Adding it is a
  build-failing type error.
- **`params` / `searchParams` are Promises.** Await them.
- **`turbopack.root` is pinned deliberately.** Without it Turbopack finds an
  unrelated lockfile outside the repo.
- **React 19 forbids the `useState` + `useEffect` "mounted" idiom**
  (`react-hooks/set-state-in-effect`). Use `useSyncExternalStore` with distinct
  server/client snapshots — see `theme-toggle.tsx`.
- **Tailwind transform utilities clobber `motion` transforms.** Both write
  `transform`. Anything motion animates must position via motion's own `x`/`y`.
- `motion` imports from `motion/react`.

## Conventions

- Colour, spacing and motion are **tokens in `src/app/globals.css`** under
  `@theme`. Never hard-code a colour in a component. The hero camera is the one
  documented exception, because it depicts a physical object.
- Token names follow shadcn/ui so CLI-added components inherit the palette.
- Anything appearing twice goes in `src/lib/site.ts`.
- **The gallery is generated from `photos/`.** `scripts/photos-build.mjs` produces
  `public/img/` and `src/data/photos.generated.json`; both are gitignored, and
  `npm run photos` is chained ahead of `dev`, `typecheck` and `build`. Never hand-edit
  the manifest, never commit generated renditions, and never require a terminal step to
  publish a photograph — that is the whole point. See
  `docs/decisions/0010-folder-driven-gallery.md`.
- WebP only; no AVIF, no JPEG fallback. AVIF measured 6.7x slower to encode for 26%
  fewer bytes, and encode time is now the owner's wait after uploading.
- Renditions never upscale and cap at 2560px. The width ladder appends the source's own
  width rather than only filtering the standard list, or small files get under-served.
- `alt` is **required** on every photograph. Never make it optional.
- **Every shot-metadata field is optional.** Partial EXIF is the normal case, not
  an edge case. Render what exists, stay silent about the rest.
- `prefers-reduced-motion` is enforced globally in `globals.css`. Do not add
  motion that bypasses it.
- Animate only `transform` and `opacity`.
- Default to server components; reach for `"use client"` only when scroll,
  pointer or storage is genuinely needed.
- Never call `getBoundingClientRect()` inside a pointermove handler. Cache it.

## Verification expectations

Run `npm run verify` before reporting work complete. A clean exit is necessary but
not sufficient — check the rendered output actually contains what you intended.
State plainly what was and was not verified; do not claim visual or screen-reader
confirmation that has not happened.

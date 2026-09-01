# Current state

**Last updated:** 2026-08-30
**Phase:** first draft built, awaiting owner feedback and real content.

This file is the handoff point between sessions. Update it in the same commit as
the work it describes. If it disagrees with the code, the code wins and this file
is a bug.

---

## Built and verified

`npm run verify` (typecheck + lint + build + export validation) exits 0.
Export: **53 files, 2 MB**.

| Area | Status |
|---|---|
| Next.js 16.3.3 + React 19 + Tailwind 4 + TypeScript strict | done |
| Static export configured for GitHub Pages | done |
| `deploy.yml` (push to main) and `ci.yml` (PRs) | written, **never yet run** |
| `verify-export.sh` artifact guard | done, tested in both directions |
| Design tokens, light + dark, warm palette | done |
| EB Garamond throughout, self-hosted | done |
| Theme toggle: light / system / dark | done |
| Landing hero: name, bio | done |
| Pinned stage, no scrolling; exactly one photograph visible | done |
| Commits on intent; continuous scrolling chains sections with no pause | done |
| Lens: first photograph opens out of it, and closes back into it | done |
| Photo sections, one per viewport | done |
| Partial-metadata rendering | done |
| Removed RAW image support to reduce data usage | done |
| Vertical tick rail with click-to-jump | done |
| **Folder-driven gallery: drop files in `photos/`, no code** | done, verified with real files |
| WebP renditions, srcset, LQIP, metadata strictly driven by JSON sidecars | done |
| Documentation and steering | done |

## Not built

- Nothing on the image side. **The pipeline is built** — see
  [decisions/0010](./decisions/0010-folder-driven-gallery.md).
- **shadcn/ui components.** `components.json` and `cn()` exist; no component has
  been added yet. Use `shadcn add <name>` — **never `init`, it hangs.**
- Routes beyond `/` and the 404. No `/work/[collection]`, no `/p/[slug]`, no
  separate about or contact page.
- `sitemap.xml`, `robots.txt`, OG images, JSON-LD.
- Analytics (none; Vercel Analytics is unavailable on Pages).

## Waiting on the owner

| Item | Notes |
|---|---|
| **The photographs** | `photos/` is empty, so the 8 placeholder frames are showing. Upload into `photos/` — nothing else needed. See [03-adding-photos.md](./03-adding-photos.md) |

| Bio, tagline, location, email, social | `FILLER` in `src/lib/site.ts` |
| Titles, captions, alt text, metadata | `FILLER` in `src/lib/photos.ts` |
| Whether a custom domain is wanted | Would need `public/CNAME` + `SITE.url` |

## Open questions for feedback

All deck timing constants are together at the top of `deck-provider.tsx`.

- Scroll sensitivity was calibrated down once already, after the owner reported a slight
  trackpad motion advancing four sections. Current values are `WHEEL_FIRST` 60,
  `WHEEL_CHAIN` 220, `MIN_CHAIN_RATE` 1.0 px/ms, `QUEUE_CAP` 1 — roughly half the travel
  of the first attempt.
  **To calm it further, raise `MIN_CHAIN_RATE` first** (1.15 and 1.3 were both simulated
  and are safe); it suppresses coasting without making a deliberate scroll feel dead,
  which raising `WHEEL_CHAIN` does. Baselines in
  [decisions/0009](./decisions/0009-queued-continuous-paging.md).
- Known cost of that calibration: three mouse-wheel notches now advance one section
  rather than three. Acceptable while the owner is on a trackpad; a real fix means
  classifying the input device instead of sharing one threshold.
- Section change is `FADE_OUT_S` 0.2 then `FADE_IN_S` 0.28 — sequential, so there is a
  brief dip through the page background. That dip is what guarantees two photographs
  are never on screen together. A cross-dissolve would be smoother and would break the
  guarantee.
- The camera scales to 6× before the aperture opens, and the aperture starts at
  `10vmax`. These two want tuning together against the real camera render, since its
  lens proportions will differ from the CSS placeholder's.
- Tick rail is on the right, vertically centred. Left is equally easy.
- Section changes do not move keyboard focus. Probably wrong for screen reader users —
  see [05-accessibility.md](./05-accessibility.md).

## Not verified

Being explicit, because a green build proves less than it appears to:

- **Nothing has been looked at in a browser.** No visual confirmation of the
  camera, the zoom, the wipe, the rail, or either theme.
- The deploy workflow has never executed. Pages **Source** must be set to
  **GitHub Actions** first (see [04-deployment.md](./04-deployment.md)) — until
  then it builds green and publishes nothing.
- No Lighthouse run, no axe audit, no screen reader testing, no real-device
  testing. See [05-accessibility.md](./05-accessibility.md).
- Client-side runtime behaviour is unconfirmed: the checks used `curl`, which does
  not execute JavaScript. Server prerender succeeds and lint/typecheck are clean,
  but hydration warnings would not have surfaced.

## Resuming work

1. Read this file, then [01-architecture.md](./01-architecture.md), then
   [decisions/](./decisions/).
2. `npm install && npm run verify` — confirm green before changing anything.
3. `npm run dev` — **a dev server may already be running on :3000.** Next 16
   refuses a second one for the same directory; reuse it.
4. Log what you did here before finishing.

## Gotchas that will cost you an hour

- **`public/.nojekyll` is load-bearing.** Without it Pages runs Jekyll, which
  strips `_next/`; the deploy reports success and the site serves unstyled HTML.
  Guarded by `verify-export.sh`.
- **No `basePath`, and that is correct.** `doyoonseol.github.io` is a *user* site
  served from the domain root. Adding one breaks every URL.
- **GitHub Pages caps the published site at 1 GB.** The real limit on the archive.
  `verify-export.sh` fails at 950 MB.
- **Nothing scrolls, on purpose.** Do not reintroduce scrolling, CSS scroll-snap,
  `scrollIntoView` or fragment links. Navigation has been redesigned three times to
  reach this; [0008](./decisions/0008-no-scroll-stage.md) records what each earlier
  approach was and exactly why it failed.
- **Section fades must stay sequential.** Overlapping them into a cross-dissolve puts
  two photographs on screen at partial opacity, which is the thing being avoided.
- **Do not add a lock or cooldown that rejects gestures during a transition.** That was
  tried (`REARM_QUIET_MS`) and rejected — it forced a pause between sections. Gestures
  queue instead; momentum is handled by the two-tier wheel threshold and `QUEUE_CAP`.
  See [0009](./decisions/0009-queued-continuous-paging.md).
- **The deck's listeners must stay `{ passive: false }`.** They have to
  `preventDefault()`, or the browser acts on the gesture too.
- **`PhotoFigure` and `SLIDE_LAYOUT` are shared with `LensReveal` on purpose.** If the
  overlay and the real slide ever render differently, the end of the lens transition
  will visibly jump.
- **`Hero` and `LensReveal` have no direction baked in.** They render whatever `zoom`
  and `reveal` say, which is why the reverse lens needed no second animation. Do not
  add one.
- **The aperture bottoms out at `10vmax`, not 0**, so the overlay must also fade at the
  ends of the range — otherwise a disc of photograph pops in and out.
- **The camera body fades late (`zoom` 0.55 → 1) for the reverse's benefit.** Widen it
  and the photograph will shrink into empty background on the way out.
- **`DeckSection` mounts only ±1.** A pinned section counts as in-viewport, so lazy
  loading defers nothing; mounting all of them fetches the whole archive at once.
- **Sections cannot scroll internally.** Content must fit one viewport, which is why
  the photograph cap is responsive (52/60/70vh).
- **The reduced-motion path still installs the controller.** With nothing scrolling,
  standing down would strand the reader on the landing panel.
- **Intercepting routes are unsupported** with `output: 'export'`. Deep links need
  `generateStaticParams` + `history.pushState`.
- **Next 16 removed the `eslint` key** from `next.config.ts`; `params`/`searchParams`
  are Promises; `turbopack.root` is pinned deliberately.
- **React 19 rejects the `useState` + `useEffect` "mounted" idiom.** Use
  `useSyncExternalStore` — see `theme-toggle.tsx`.
- **Tailwind transform utilities clobber `motion` transforms.** Both write
  `transform`. Position via motion's own `x`/`y`.
- **`shadcn init` hangs** even with `-y`. Config already exists; use `add`.
- **`create-next-app` cannot run in this directory** — the folder name
  `Photo Website` has a space and capitals, which npm rejects as a package name.

# Performance

## Budgets

| Metric | Target |
|---|---|
| Largest Contentful Paint | < 1.5s on 4G |
| Cumulative Layout Shift | **0** |
| Interaction to Next Paint | < 200ms |
| First-load JS | < 120 KB gzipped |
| Lighthouse | 95+ across all four categories |
| Published site | < 950 MB (Pages caps at 1 GB) |

CLS is 0 rather than "under 0.1" because on an image-led site there is no excuse
for it. Every dimension is known at build time.

## What is already measured

Current export: **50 files, 2 MB**, of which the placeholders are 32 KB. The real
figure will be dominated by photographs.

Verified:

- `npm run verify` passes: typecheck, lint, build, export validation.
- EB Garamond is self-hosted as woff2 in `_next/static/media/` — no request to
  Google, no third-party connection.
- Placeholder SVGs serve correctly; dev server logs no errors.

Not yet measured, and worth being clear about: **no Lighthouse run, no field data,
no real-device testing.** The budgets above are targets, not results.

## Techniques in place

### Zero layout shift

Every `<img>` carries explicit `width` and `height`, so the browser computes the
aspect ratio and reserves the exact box before any bytes arrive. This is also why
`Photo.width` and `Photo.height` are required rather than optional.

### Fonts

`next/font/google` self-hosts EB Garamond at build time with `display: swap`. One
variable font file covers the entire 400–800 weight axis, so there is no
per-weight request. No render-blocking stylesheet from a third party, and no
layout shift from a late-arriving face.

### Images

The first slide is marked `priority` — eager, `fetchpriority="high"`, synchronous
decode. It is the image waiting at the end of the lens zoom, and arriving late
would undercut the whole transition. Everything below is `loading="lazy"` with
async decode.

Plain `<img>` rather than `next/image`: with static export there is no
optimization API, so `next/image` would run `unoptimized` and add a wrapper for no
benefit. See [decisions/0003](./decisions/0003-precomputed-image-pipeline.md) for
where the real gains come from.

### Animation

Only `transform` and `opacity` are animated — both compositor properties, so they
never trigger layout or paint. No animation touches `width`, `top`, or anything
else that would.

The pointer handler is registered `passive: true` and writes CSS custom properties
**directly to the DOM**, bypassing React entirely. No component re-renders on
pointer move.

The element rect used by that handler is **cached** and refreshed on resize and
scroll. Calling `getBoundingClientRect()` inside a pointermove handler forces a
synchronous layout on every event; at 120Hz on a trackpad that is the difference
between a smooth tilt and a stuttering one. This was a deliberate fix, not an
accident of the first draft.

Pointer tracking is skipped entirely on coarse pointers — no listener, no springs,
no battery cost for an effect nobody can see on a phone.

### Placeholder grain, removed

The generated placeholders originally carried an `feTurbulence` grain filter.
Rasterising fractal noise across a 3000px canvas, eight times over, made scrolling
sluggish — and would have given a false impression of the site's real performance,
since actual photographs cost nothing to composite. Removed deliberately; there is
a note in `scripts/make-placeholders.mjs` so nobody adds it back.

## Known risks

**Document length.** Every photograph is a full-viewport slide in one HTML
document. At a few dozen this is fine; past roughly 60 the initial HTML gets heavy
and collections should be split across routes.

**The lens zoom on low-end hardware.** Scaling a layered 3D subtree to 17× is
cheap in principle — it is a single composited transform — but it has not been
tested on an older phone. Since it is skipped under reduced motion, there is
already a safety valve; a hardware-based fallback would need real device data
first.

**`motion` bundle cost.** Roughly 30–40 KB gzipped for the subset in use. Justified
by the scroll and spring primitives, but it is the largest single dependency and
worth re-examining if the budget gets tight.

## How to measure

```bash
npm run build && npm run preview
npx --yes lighthouse http://localhost:3000 --view --preset=desktop
```

Test the **preview** build, never `npm run dev` — the dev server is unminified,
unbundled, and its numbers are meaningless.

Real-device checks that matter more than any lab score: a mid-range Android on
throttled 4G, and a laptop trackpad for scroll smoothness through the zoom.

## Deliberate non-goals

- **No analytics in the draft.** Vercel Analytics needs Vercel hosting. If it is
  wanted, Cloudflare Web Analytics or GoatCounter are free and cookieless, so no
  consent banner is required.
- **No service worker.** A static site on a CDN with immutable assets gets most of
  the benefit already, at none of the cache-invalidation cost.

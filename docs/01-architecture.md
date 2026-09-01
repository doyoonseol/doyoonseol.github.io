# Architecture

## Stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Framework | Next.js, App Router | 16.3.3 | Static export |
| UI runtime | React | 19.2.8 | |
| Styling | Tailwind CSS | 4.x | CSS-first `@theme`; tokens in `globals.css` |
| Components | shadcn/ui | CLI v4, Radix base | Set up by hand — `init` hangs. See [0001](./decisions/0001-stack-nextjs-tailwind-shadcn.md) |
| Animation | `motion` | 13.1.1 | Imports from `motion/react` |
| Theming | `next-themes` | 0.4.6 | Class strategy, system default |
| Icons | `lucide-react` | 1.37.0 | |
| Language | TypeScript strict | 5.x | |
| Package manager | npm | | Lockfile committed; `pnpm` not on the owner's machine |
| Host | GitHub Pages via Actions | | |

Type, colour and motion decisions are in [02-design-system.md](./02-design-system.md).

## Rendering model

`output: 'export'`. Every route renders to static HTML at build time. There is no
server, no runtime rendering, and no request context in production.

Enforced by the build — these cannot be used:

- Middleware / proxy, `rewrites`, `redirects`, `headers`
- Server Actions, `cookies()`, `headers()`
- Incremental Static Regeneration, Draft Mode
- **Intercepting routes** (shaped the scroll architecture — see [0004](./decisions/0004-scroll-architecture.md))
- `next/image` with the default loader
- Dynamic routes without `generateStaticParams()`

Route Handlers *do* work, but only `GET` and only with
`export const dynamic = 'force-static'`.

The authoritative list ships with the framework at
`node_modules/next/dist/docs/01-app/02-guides/static-exports.md`. **Read it there.**
Next 16 diverges from older documentation enough that the framework ships its own
agent warning.

## Routes

| Route | Status | Purpose |
|---|---|---|
| `/` | **built** | The entire experience: hero, lens zoom, photo slides, closing panel |
| `404.html` | **built** | From `not-found.tsx`; Pages serves it automatically |
| `/work/[collection]` | planned | Per-collection galleries, once there is more than one body of work |
| `/p/[slug]` | planned | Per-photograph pages for deep links |
| `/about`, `/contact` | planned | Currently folded into `/` |

The whole site is deliberately one route today. A route change would break the
scroll timeline the lens zoom depends on. `trailingSlash: true`, so future routes
export as `about/index.html`, which Pages resolves without host rewrites.

## Composition

```
app/layout.tsx          EB Garamond, metadata, ThemeProvider, <noscript> fallback
  └── app/page.tsx
        └── DeckProvider           owns ALL navigation; nothing scrolls
              ├── SiteChrome         corner marks, theme toggle, skip button
              ├── main               the stage: h-dvh, overflow hidden
              │     ├── Hero                    → DeckSection 0
              │     │     └── CameraModel         CSS 3D camera, lens centred
              │     └── SlideDeck
              │           ├── SlideRail           tick index; reads index, calls goTo
              │           ├── PhotoSlide × N      → DeckSection 1…N
              │           │     └── PhotoFigure
              │           │           ├── PhotoCarousel  when photo.raw exists
              │           │           └── PhotoMeta      only present EXIF fields
              │           └── closing panel       → DeckSection N+1
              └── LensReveal         first photograph, seen through the aperture
```

**Nothing scrolls.** Every `DeckSection` is `fixed inset-0`, stacked, and exactly one
is opaque; the controller fades between them. That is what guarantees only one
photograph is ever on screen — see
[0008](./decisions/0008-no-scroll-stage.md). `html` and the stage are
`overflow: hidden`, and a `<noscript>` style block in `layout.tsx` unpins everything
for readers without JavaScript.

Sections are declared once in `src/lib/deck.ts` as `SECTION_IDS`
(`intro`, each photo id, `closing`). Everything that reasons about position derives it
from there rather than counting DOM nodes.

`DeckSection` mounts nothing more than one step from the current section. A pinned
section counts as in-viewport, so lazy loading defers nothing and mounting all of them
would fetch the whole archive at once.

`PhotoFigure` and its `SLIDE_LAYOUT` are shared between `PhotoSlide` and `LensReveal`
deliberately — the overlay must be pixel-identical to the real slide or the end of the
lens transition would visibly jump.

Client components: `DeckProvider`, `DeckSection`, `LensReveal`, `Hero`, `PhotoFigure`,
`PhotoCarousel`, `SlideRail`, `SiteChrome`, `ThemeToggle`, `ThemeProvider`.
`PhotoSlide`, `SlideDeck`, `PhotoMeta` and `CameraModel` are server components with no
client cost of their own.

Hooks: `usePointerTilt` (camera tilt).

## Data flow

No runtime data fetching. Content is compiled in.

**The gallery is a folder.** Adding a photograph requires no code — see
[0010](./decisions/0010-folder-driven-gallery.md) and
[03-adding-photos.md](./03-adding-photos.md).

```
photos/                            THE ONLY image source in version control
  01-harbour.jpg                   numeric prefix sets order
  01-harbour-raw.jpg               pairs as the unprocessed version
  01-harbour.json                  optional metadata overrides
        |
        |  scripts/photos-build.mjs   (sharp; runs in CI every deploy)
        v
public/img/*.webp                  renditions, up to 5 widths — gitignored
src/data/photos.generated.json     manifest: sizes, metadata, LQIP — gitignored
        |
        v
src/lib/photos.ts                  types + accessors; placeholder fallback
```

Metadata is read exclusively from sidecar `.json` text files provided alongside each image (camera, focal length, F number/aperture, shutter speed, ISO, location, title, caption, alt). Metadata is not read from actual photo files. If any metadata field is omitted from the JSON file, it is assumed not present and omitted from the site.

`src/lib/photos.ts` falls back to a placeholder set while `photos/` is empty, so the
layout stays reviewable before real work exists. `src/lib/site.ts` holds site-level
strings, still marked `FILLER`.

Everything generated is gitignored, so `npm run photos` is chained ahead of `dev`,
`typecheck` and `build`; a fresh clone needs no extra step.

## Deploy pipeline

```
push to main → .github/workflows/deploy.yml
  checkout → Node 24 → configure-pages
  npm ci → typecheck → lint → build → verify:export
  upload-pages-artifact (out/) → deploy-pages → live
```

Pull requests run `ci.yml`: identical checks, publishes nothing, no Pages
permissions. Details and the one manual setup step in
[04-deployment.md](./04-deployment.md).

## Directory layout

```
.github/workflows/     deploy.yml, ci.yml
docs/                  documentation; decisions/ holds ADRs
public/
  .nojekyll            load-bearing — disables Jekyll on Pages
  placeholders/        generated stand-in frames (delete once real work lands)
scripts/
  verify-export.sh     artifact validation, runs in CI and locally
  make-placeholders.mjs
src/
  app/                 routes, root layout, globals.css
  components/
    deck/              deck-provider.tsx (owns navigation), deck-section.tsx,
                       lens-reveal.tsx
    hero/              hero.tsx, camera-model.tsx
    gallery/           slide-deck.tsx, photo-slide.tsx, photo-figure.tsx,
                       photo-carousel.tsx, photo-meta.tsx, slide-rail.tsx
    ui/                shadcn components (none added yet)
  hooks/               use-pointer-tilt.ts
  lib/                 deck.ts, site.ts, photos.ts, utils.ts
_originals/            planned: source photographs, gitignored
```

## Conventions

- **Tokens over values.** Colour, spacing and motion live in `globals.css` under
  `@theme`. No hard-coded colours in components. The camera is the one documented
  exception.
- **`src/lib/site.ts` for anything appearing twice.**
- Path alias `@/*` → `src/*`.
- `typedRoutes: true` — a mistyped `href` is a build error.
- `alt` is required on every photograph, never optional.
- Client components only where genuinely needed; default to server.

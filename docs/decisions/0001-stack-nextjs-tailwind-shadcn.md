# 0001 — Next.js, Tailwind, shadcn/ui

**Status:** accepted
**Date:** 2026-08-30

## Context

Stack specified by the owner: Next.js, shadcn/ui, Tailwind. No backend required.
This record captures the versions, the two decisions that were genuinely open,
and the Next 16 details that will otherwise be rediscovered painfully.

## Decision

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js, App Router | 16.3.3 |
| UI | React | 19.2.8 |
| Styling | Tailwind CSS | 4.x, CSS-first `@theme` |
| Components | shadcn/ui | CLI v4, Radix base |
| Language | TypeScript strict | 5.x |
| Animation | `motion` | 13.1.1 |
| Theming | `next-themes` | 0.4.6 |
| Package manager | **npm** | lockfile committed |

### npm, not pnpm

`pnpm` is not installed on the owner's machine. Since they will be running
`npm run dev` and editing content themselves, requiring a package manager they
would first have to install is a needless obstacle. CI uses `npm ci`, which
installs strictly from the committed lockfile.

### shadcn/ui set up by hand

`shadcn init` **hangs on an interactive prompt even with `-y`** (CLI v4.19.0).
Rather than fight it, the two things it produces for an existing project were
created directly: `components.json` and `src/lib/utils.ts` with the `cn()` helper.
Its peer dependencies (`clsx`, `tailwind-merge`, `class-variance-authority`,
`tw-animate-css`) were installed explicitly.

`shadcn add <component>` works fine now that `components.json` exists. **Do not
retry `init`.**

This turned out to be the better order anyway: it meant the token layer in
`globals.css` was authored deliberately rather than generated and then overridden.
Token *names* still follow shadcn conventions, so CLI-added components inherit the
palette untouched.

Note that shadcn v4 requires Tailwind v4. Tailwind v3 would pin the project to
`shadcn@2.3.0`.

## Next 16 details that differ from older knowledge

Next 16 diverges enough from earlier versions that the framework now ships its own
agent warning. The authoritative docs are vendored at
`node_modules/next/dist/docs/` — read them there rather than relying on memory.

- **No `eslint` key in `next.config.ts`.** `next lint` was removed; linting is a
  separate step. Leaving the key in place is a build-failing type error.
- **`params` and `searchParams` are Promises.** They must be awaited.
- **`typedRoutes` is stable** and enabled. `href` values are checked against real
  routes, so a mistyped link fails the build. Global `PageProps<'/route'>` and
  `LayoutProps<'/'>` helpers are generated.
- **Turbopack is the default bundler**, and `turbopack.root` must be pinned.
  Without it, Turbopack walks up the filesystem looking for a lockfile and can
  latch onto an unrelated one outside the repository, making builds
  non-deterministic across machines. It is set to `import.meta.dirname`.
- **Scroll behaviour is no longer overridden** during navigation. `data-scroll-behavior="smooth"`
  on `<html>` restores the old behaviour if it is ever wanted.

## React 19 lint rules worth knowing

`react-hooks/set-state-in-effect` rejects the familiar
`const [mounted, setMounted] = useState(false)` plus `useEffect(() => setMounted(true))`
idiom used to avoid hydration mismatches.

The replacement, used in `theme-toggle.tsx`, is `useSyncExternalStore` with
distinct server and client snapshots. It is the purpose-built primitive: React is
told the value legitimately differs across environments and resolves it during
hydration, instead of being forced through a second render pass.

## A Tailwind and motion interaction

Tailwind's transform utilities (`-translate-x-1/2`) and `motion`'s animated
transforms both write to the `transform` property and **silently clobber each
other**. Anything animated by motion must do its positioning through motion's own
`x` / `y` values.

## Alternatives considered

**Astro** — arguably a better fit for a mostly-static image site, with less
JavaScript by default. Not chosen: the owner specified Next.js, and the scroll
choreography benefits from React's ecosystem.

**No animation library.** The lens zoom and pointer tilt could be hand-rolled
with `requestAnimationFrame`. `motion` was chosen for `useScroll`, `useTransform`
and spring physics, which are exactly the primitives this design needs and are
tedious and easy to get subtly wrong by hand. It is client-only and works fine
with static export.

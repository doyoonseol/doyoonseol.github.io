<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
---

# Photography portfolio — doyoonseol.github.io

> The block above is managed by `next dev`. Leave it in place.
>
> Kiro sessions load `.kiro/steering/*.md` automatically and do not need this
> file. It exists so other agentic tools get the same context.

## Read first

1. **`docs/STATE.md`** — what is built, what is not, what is blocked on the owner.
2. `docs/01-architecture.md` — stack, routing, data flow.
3. `docs/decisions/` — ADRs. Read before overriding a design choice; most of what
   looks odd here is deliberate and explained.

## What this is

A photography portfolio: one continuous scroll from an introduction, through a
zoom into a camera lens, into full-viewport photograph slides. Museum-minimal
light mode, darkroom dark mode, warm palette, **EB Garamond throughout**.

Next.js 16 · React 19 · Tailwind 4 · shadcn/ui · `motion` · **npm** ·
static export → GitHub Pages.

Governing rule: **the photograph is the only thing on screen that gets to be
interesting.** If a change makes photographs harder to look at, it is wrong
however good it looks alone.

## Before you finish

```bash
npm run verify   # typecheck + lint + build + verify:export
```

A clean exit is necessary, not sufficient. Confirm the output contains what you
intended, and state plainly what you did and did not verify.

## Traps

- **`public/.nojekyll` is load-bearing.** Without it GitHub runs Jekyll, strips
  `_next/`, and the site deploys "successfully" as unstyled HTML.
- **No `basePath`** — this is a GitHub *user* site served from the domain root.
- **1 GB published-site cap** on GitHub Pages. The real limit on the archive.
- **`output: 'export'`** forbids middleware, rewrites, redirects, headers, ISR,
  Server Actions, intercepting routes, and `next/image`'s default loader.
- **`shadcn init` hangs.** Use `shadcn add <component>`; `components.json` exists.
- **Next 16:** no `eslint` key in `next.config.ts`; `params`/`searchParams` are
  Promises; Turbopack default with `turbopack.root` pinned deliberately.
- **React 19** rejects the `useState`+`useEffect` "mounted" idiom — use
  `useSyncExternalStore`.
- **Tailwind transform utilities clobber `motion` transforms.** Position via
  motion's own `x`/`y`.
- Never call `getBoundingClientRect()` in a pointermove handler.

## Content

Most copy and every photograph is **filler**, marked `FILLER` in `src/lib/site.ts`
and `src/lib/photos.ts`. When content is missing, add a clearly-marked placeholder
in the correct position rather than deleting the element — the owner reviews
placement before supplying the real thing.

**Every shot-metadata field is optional.** Partial EXIF is normal, not an edge
case. `alt` is the one required field and must stay required.

## Keep docs in step

Update `docs/STATE.md` in the same change as the work it describes. Add an ADR
under `docs/decisions/` for anything expensive to reverse.

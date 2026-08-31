# 0002 — GitHub Pages via static export

**Status:** accepted
**Date:** 2026-08-30
**Supersedes:** an earlier plan to host on Vercel

## Context

The remote `doyoonseol/doyoonseol.github.io` was already configured, and the
owner requires deployment to GitHub Pages with GitHub Actions compiling the
Next.js project to static files on every change.

Two facts about that repository name determine a lot:

- It matches the `<username>.github.io` pattern, so it is a GitHub **user** site
  and is served from the **domain root** — `https://doyoonseol.github.io/`.
- A *project* repo would instead serve from `/<repo>/` and would require
  `basePath` and `assetPrefix`.

## Decision

Build with `output: 'export'` and publish `out/` to GitHub Pages from a custom
GitHub Actions workflow.

Configuration that follows directly:

| Setting | Value | Reason |
|---|---|---|
| `output` | `'export'` | Emit static HTML; no server exists in production |
| `trailingSlash` | `true` | Exports `about/index.html`; Pages resolves directory URLs without rewrites, which static export cannot provide |
| `images.unoptimized` | `true` | No Image Optimization API without a server |
| `basePath` / `assetPrefix` | **unset** | User site is served from the root; setting these would break every URL |
| `public/.nojekyll` | present | Without it Jekyll strips `_next/` |

## Consequences

### Lost, and what replaces it

| Unavailable | Replacement |
|---|---|
| Runtime image optimization | Precompute every derivative at build time — [0003](./0003-precomputed-image-pipeline.md). Turns out better: no quota, no cold start, originals never published |
| Intercepting routes | `history.pushState` for the lightbox — [0004](./0004-lightbox-without-intercepting-routes.md) |
| `next/og` at request time | Generate OG images as static files during the photo pipeline |
| Server Actions, form handling | `mailto:` contact link; a hosted form service if that proves insufficient |
| Rewrites, redirects, headers | None needed. Redirects, if ever required, via static HTML meta refresh |
| Vercel Analytics and Speed Insights | Cloudflare Web Analytics or GoatCounter — both free and cookieless. Open choice; none installed |
| Middleware / proxy | Not needed for a portfolio |

### Limits that now bind

From [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits):

- **Published site ≤ 1 GB.** This is the hard ceiling on how many photographs can
  ship, and the single most important number in this project.
  `scripts/verify-export.sh` fails the build at 950 MB to leave headroom.
- **100 GB/month bandwidth (soft).** Roughly 50,000 page views at ~2 MB each.
  If that is ever a problem, putting Cloudflare's free tier in front of Pages
  removes it.
- **10 builds/hour (soft)** — explicitly does **not** apply to custom Actions
  workflows, which is what we use.
- The Pages artifact must contain **no symbolic or hard links**. Checked by
  `verify-export.sh`.

### Manual step that cannot be automated

Repo **Settings → Pages → Build and deployment → Source** must be set to
**GitHub Actions**. Until then the workflow builds successfully and publishes
nothing, with no error to explain why. This is the most likely reason for a
"green build, dead site".

## Alternatives considered

**Vercel** — better DX, runtime image optimization, real OG generation. Rejected:
the owner requires GitHub Pages, and the repo was already pointed there. Worth
noting the image-optimization quota on Vercel's free tier would have pushed us
toward a precomputed pipeline anyway.

**Pages with the legacy Jekyll builder** — cannot build a Next.js app. Non-starter.

**Deploying a prebuilt `out/` committed to a `gh-pages` branch** — works, but
makes the repository history unreadable and invites publishing a stale build.
Rejected in favour of building in CI from source.

## Reversal cost

Moving to a server-rendered host later is cheap: drop `output: 'export'`, delete
the workflow. Nothing in the application code assumes a static host except the
image pipeline, which remains a performance win regardless.

Moving to a *project* repo is the change most likely to bite, because it requires
`basePath` and `assetPrefix` and every hard-coded absolute path becomes a bug.
`src/lib/site.ts` centralises the origin to limit the blast radius.

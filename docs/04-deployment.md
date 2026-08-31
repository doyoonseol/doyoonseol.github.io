# Deployment

Static export built by GitHub Actions, published to GitHub Pages at
**https://doyoonseol.github.io**.

## One-time setup that cannot be automated

**Settings → Pages → Build and deployment → Source: "GitHub Actions"**

Until this is set, `deploy.yml` builds successfully, uploads its artifact, and
publishes nothing — with no error explaining why. If a build is green and the site
is dead or stale, check this first.

## How it runs

`.github/workflows/deploy.yml`, on push to `main` or manually from the Actions tab.

```
checkout → setup Node 24 (npm cache) → configure-pages
npm ci                 install strictly from the lockfile
npm run typecheck
npm run lint
npm run build          next build → out/
npm run verify:export  validate the artifact
upload-pages-artifact  out/
      ↓
deploy job → actions/deploy-pages → live
```

Pull requests run `.github/workflows/ci.yml` instead: identical checks, publishes
nothing, holds no Pages permissions and no OIDC token. It should stay that way.

`concurrency: github-pages` with `cancel-in-progress: false` — an in-flight deploy
is allowed to finish, because cancelling a half-published Pages deployment can
leave the live site inconsistent.

Action versions are pinned to majors verified against the GitHub API:
`checkout@v7`, `setup-node@v7`, `configure-pages@v6`, `upload-pages-artifact@v5`,
`deploy-pages@v5`.

## What `verify:export` checks

`scripts/verify-export.sh`, runnable locally after a build. Each check maps to a
failure that is either silent or miserable to diagnose:

| Check | Why |
|---|---|
| `index.html` exists | Pages would serve nothing at `/` |
| `404.html` exists | Unmatched URLs would show GitHub's default error page |
| `_next/` exists | Build produced no assets |
| **`.nojekyll` exists** | The important one — see below |
| No symlinks | GitHub rejects a Pages artifact containing links |
| Size under 950 MB | Pages hard-caps a published site at 1 GB |

### The `.nojekyll` failure mode

Without `.nojekyll`, GitHub runs the output through Jekyll, which ignores any
directory whose name begins with an underscore. That silently deletes `_next/`, so
every stylesheet and script 404s and the site renders as unstyled HTML. The deploy
reports success.

The file lives at `public/.nojekyll` and is copied into the export automatically
(verified — Next 16 does copy dotfiles from `public/`). The CI check exists because
the consequence of someone tidying it away is so disproportionate.

## Configuration that must not drift

| Setting | Value | Why |
|---|---|---|
| `output` | `'export'` | No server in production |
| `trailingSlash` | `true` | Exports `about/index.html`; Pages resolves directory URLs without rewrites |
| `images.unoptimized` | `true` | No Image Optimization API without a server |
| `basePath` | **unset** | User site is served from the domain root |

`basePath` is worth understanding. `doyoonseol.github.io` matches the
`<username>.github.io` pattern, making it a **user site** served from `/`. A
*project* repository is served from `/<repo>/` and would require both `basePath`
and `assetPrefix`. Setting them here would break every URL on the site.

## Limits

From [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits):

- **1 GB published site.** Hard. The real constraint on the archive's size.
- **100 GB/month bandwidth**, soft. Roughly 50,000 page views at ~2 MB each. If it
  ever becomes a problem, Cloudflare's free tier in front of Pages removes it.
- **10 builds/hour**, soft — and explicitly does *not* apply to custom Actions
  workflows, which is what this is.

## Adding a custom domain

1. Add `public/CNAME` containing only the bare domain, e.g. `doyoonseol.com`.
2. Point DNS at GitHub Pages (`A` records to GitHub's IPs, or `CNAME` to
   `doyoonseol.github.io`).
3. Set the domain in Settings → Pages and enable **Enforce HTTPS**.
4. Update `SITE.url` in `src/lib/site.ts` — it is what makes OG and canonical URLs
   absolute.

## Rollback

Deployments are immutable artifacts, so reverting content means reverting the
commit:

```bash
git revert <sha>
git push
```

Alternatively, re-run an earlier successful **Deploy to GitHub Pages** workflow
from the Actions tab to republish that build as-is.

## Local equivalence

```bash
npm run verify    # exactly what CI runs
npm run preview   # serve out/ on :3000, as Pages would
```

`npm run preview` is worth using before pushing anything structural. It serves the
real static output rather than the dev server, so it catches the class of problem
that only appears once there is no server — broken relative paths, missing
trailing-slash routes, and assets that only resolved because dev was rewriting
them.

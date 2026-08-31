import type { NextConfig } from "next";

/**
 * Build target: static export -> GitHub Pages.
 *
 * The repository is `doyoonseol/doyoonseol.github.io`, a GitHub *user* site, so it
 * is served from the domain root (https://doyoonseol.github.io/). That is why there
 * is no `basePath` / `assetPrefix` here. If this project were ever moved to a
 * *project* repo (served from /<repo>/), both would need to be set to `/<repo>`
 * or every asset and link would 404. See docs/decisions/0002-github-pages-static-export.md
 *
 * Constraints this imposes (enforced by `output: "export"`):
 *   no middleware/proxy, no rewrites, redirects or headers, no ISR,
 *   no Server Actions, no intercepting routes, no runtime image optimization.
 * Full list: node_modules/next/dist/docs/01-app/02-guides/static-exports.md
 */
const nextConfig: NextConfig = {
  output: "export",

  // Emits `about/index.html` rather than `about.html`. GitHub Pages resolves
  // directory-style URLs cleanly, so this avoids relying on host-level rewrites
  // (which static export cannot provide).
  trailingSlash: true,

  // There is no server to run the Image Optimization API. We do not need one:
  // every derivative is precomputed at build time by scripts/photos-build.ts,
  // so images ship as ready-to-serve AVIF/JPEG with explicit dimensions.
  images: {
    unoptimized: true,
  },

  // Stable in Next 16. Makes `href` and `params` type-checked against real routes,
  // which matters here because collection and photo routes are generated from data.
  typedRoutes: true,

  reactStrictMode: true,

  // Pin the Turbopack workspace root to this directory. Without it, Turbopack
  // walks upward looking for a lockfile and can latch onto an unrelated one
  // outside the repository, which makes builds non-deterministic across machines.
  turbopack: {
    root: import.meta.dirname,
  },

  // Fail the build on type errors rather than shipping a broken site. This is
  // the default; stated explicitly so nobody "fixes" CI by flipping it.
  // Note: there is no `eslint` key in Next 16 — `next lint` was removed, so
  // linting is a separate CI step (`npm run lint`), not part of `next build`.
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;

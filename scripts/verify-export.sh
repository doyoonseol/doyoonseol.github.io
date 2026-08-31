#!/usr/bin/env bash
#
# Validates the static export before it is handed to GitHub Pages.
#
# Every check here corresponds to a failure mode that is either silent or
# extremely annoying to diagnose after the fact. Run locally with:
#
#   npm run build && npm run verify:export
#
set -euo pipefail

OUT_DIR="${1:-out}"

# GitHub Pages refuses to publish sites larger than 1 GB (1024 MiB).
# Fail well short of it so there is room to add photographs without surprise.
readonly HARD_LIMIT_MB=950
readonly WARN_LIMIT_MB=700

fail() {
  printf '\033[31mFAIL\033[0m  %s\n' "$1" >&2
  exit 1
}
pass() { printf '\033[32mok\033[0m    %s\n' "$1"; }
warn() { printf '\033[33mwarn\033[0m  %s\n' "$1"; }

printf '\nVerifying static export in "%s"\n\n' "$OUT_DIR"

# --- structure -------------------------------------------------------------

[[ -d "$OUT_DIR" ]] || fail "'$OUT_DIR' does not exist. Did 'next build' run with output: 'export'?"
pass "export directory exists"

[[ -f "$OUT_DIR/index.html" ]] || fail "no index.html at the export root; Pages would serve nothing at /"
pass "index.html present"

# Static export writes not-found.tsx to 404.html. GitHub Pages picks this up
# automatically for unmatched paths.
[[ -f "$OUT_DIR/404.html" ]] || fail "no 404.html; unmatched URLs would show GitHub's default error page"
pass "404.html present"

[[ -d "$OUT_DIR/_next" ]] || fail "no _next/ directory; the build produced no assets"
pass "_next/ present"

# The single most destructive and least obvious failure mode: without .nojekyll,
# GitHub Pages runs the output through Jekyll, which ignores any directory whose
# name begins with an underscore. That silently drops _next/ entirely, so every
# stylesheet and script 404s and the site renders as unstyled HTML.
if [[ ! -f "$OUT_DIR/.nojekyll" ]]; then
  fail ".nojekyll is missing. Jekyll would strip _next/ and break every asset.
        Fix: restore the empty file at public/.nojekyll (it is copied into the export)."
fi
pass ".nojekyll present (Jekyll processing disabled)"

# --- artifact constraints --------------------------------------------------

# GitHub's Pages artifact must not contain symbolic or hard links.
link_count=$(find "$OUT_DIR" -type l | wc -l | tr -d '[:space:]')
if [[ "$link_count" -ne 0 ]]; then
  find "$OUT_DIR" -type l >&2
  fail "found $link_count symlink(s); the Pages artifact must not contain links"
fi
pass "no symlinks in artifact"

# --- size ------------------------------------------------------------------

size_mb=$(du -sm "$OUT_DIR" | cut -f1)
file_count=$(find "$OUT_DIR" -type f | wc -l | tr -d '[:space:]')

if [[ "$size_mb" -ge "$HARD_LIMIT_MB" ]]; then
  fail "export is ${size_mb} MB, at or past the ${HARD_LIMIT_MB} MB ceiling (Pages hard limit is 1024 MB).
        Reduce the image variant matrix or move originals out of the published output.
        See docs/decisions/0003-image-pipeline.md"
elif [[ "$size_mb" -ge "$WARN_LIMIT_MB" ]]; then
  warn "export is ${size_mb} MB, approaching the 1024 MB GitHub Pages limit. Plan headroom now."
else
  pass "export size ${size_mb} MB, within the 1024 MB Pages limit"
fi

printf '\n%s files, %s MB total\n' "$file_count" "$size_mb"
printf '\033[32mExport is valid for GitHub Pages.\033[0m\n\n'

# Structure

```
.github/workflows/     deploy.yml (push to main → Pages), ci.yml (PRs, no publish)
docs/                  START AT docs/STATE.md
  decisions/           ADRs — read before overriding a design choice
.kiro/steering/        this context, loaded into every session
public/
  .nojekyll            load-bearing, do not delete
  placeholders/        generated stand-in frames; delete when real work lands
scripts/
  verify-export.sh     artifact validation (CI + local)
  make-placeholders.mjs
src/
  app/                 layout.tsx, page.tsx, not-found.tsx, globals.css
  components/
    deck/              deck-provider.tsx (OWNS NAVIGATION - nothing scrolls),
                       deck-section.tsx (pins + fades one section), lens-reveal.tsx
    hero/              hero.tsx, camera-model.tsx (CSS 3D camera)
    gallery/           slide-deck.tsx, photo-slide.tsx, photo-figure.tsx,
                       photo-carousel.tsx, photo-meta.tsx, slide-rail.tsx
    ui/                shadcn components (none yet)
    site-chrome.tsx    corner marks, skip control
    theme-provider.tsx, theme-toggle.tsx
  hooks/               use-pointer-tilt.ts
  lib/                 deck.ts (section order), site.ts (strings),
                       photos.ts (data + types), utils.ts (cn)
```

## Where things belong

| Change | File |
|---|---|
| Colour, type, spacing, motion | `src/app/globals.css` — tokens under `@theme` |
| Name, bio, email, social | `src/lib/site.ts` |
| Photographs and their metadata | `src/lib/photos.ts` |
| Navigation feel: thresholds, durations | `deck-provider.tsx` — constants at the top |
| Section order | `src/lib/deck.ts` |
| How many sections stay mounted | `deck-section.tsx` — `WINDOW` |
| The camera's appearance | `src/components/hero/camera-model.tsx` |
| Camera scale and fades during the zoom | `src/components/hero/hero.tsx` |
| The aperture, both directions | `src/components/deck/lens-reveal.tsx` |
| Slide layout, caption placement | `src/components/gallery/photo-figure.tsx` |

## Where documentation belongs

- **`docs/STATE.md`** — current state, what is blocked, gotchas. **Update it in the
  same change as the work it describes.** It is the handoff point between sessions.
- `docs/decisions/` — a new ADR when a choice is expensive to reverse. Never edit a
  superseded one; add a new record and mark the old one superseded.
- `docs/02-design-system.md` — when tokens change.
- `docs/03-adding-photos.md` — when the owner's workflow changes.
- Code comments — for *why*, never *what*.

## Conventions

- Path alias `@/*` → `src/*`.
- Components in kebab-case files, PascalCase exports.
- Feature folders (`hero/`, `gallery/`) rather than type folders.
- Filler content is marked `FILLER` or `TODO(pending …)` so it is greppable.

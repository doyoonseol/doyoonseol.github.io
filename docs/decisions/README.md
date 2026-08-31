# Architecture decision records

One file per decision that is expensive to reverse or that a reasonable person
would otherwise undo by accident.

Each record states the context, the decision, the alternatives that were
genuinely considered, and the consequences we accepted. The point is not
ceremony — it is that six months from now "why is this done the hard way?" costs
thirty seconds to answer instead of an hour to re-derive.

| # | Decision | Status |
|---|---|---|
| [0001](./0001-stack-nextjs-tailwind-shadcn.md) | Next.js 16 + Tailwind 4 + shadcn/ui; npm; Next 16 and React 19 gotchas | accepted |
| [0002](./0002-github-pages-static-export.md) | GitHub Pages via static export, and everything that cascades from it | accepted |
| [0003](./0003-precomputed-image-pipeline.md) | Precompute every image derivative at build time | superseded by 0010 |
| [0004](./0004-scroll-architecture.md) | Single-page scroll narrative; why not intercepting routes | partially superseded by 0006 |
| [0005](./0005-partial-metadata.md) | Treat partial shot metadata as the normal case | accepted |
| [0006](./0006-mandatory-snap-and-timed-zoom.md) | Mandatory snap between photographs; lens zoom on its own clock | partially superseded by 0007 |
| [0007](./0007-js-driven-deck.md) | Deck commits on intent; first photograph opens out of the lens | partially superseded by 0008, 0009 |
| [0008](./0008-no-scroll-stage.md) | No scrolling at all: pinned stage, sequential fades, reversible lens | accepted |
| [0009](./0009-queued-continuous-paging.md) | Queued paging, so continuous scrolling advances continuously | accepted |
| [0010](./0010-folder-driven-gallery.md) | The gallery is a folder; CI builds it, so adding photographs needs no code | accepted |

Navigation has been revised four times (0006 → 0007 → 0008 → 0009), each narrowing the
same requirement: exactly one photograph visible at any moment, an immediate response
to a gesture, and continuous scrolling that keeps advancing. **0008 and 0009 together
are the current design.** The earlier records are kept because they document which
approaches were tried and precisely why each failed — CSS snap being too slow, animated
scroll inherently showing two photographs at once, and a re-arm lock forcing the reader
to pause.

## Adding one

Copy the shape of an existing record. Number sequentially. Never edit a decision
that has been superseded — add a new record and mark the old one
`superseded by 000N`. The history is the value.

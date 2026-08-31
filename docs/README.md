# Project documentation

Documentation for the photography portfolio at **https://doyoonseol.github.io**.

## Read this first

If you are a new contributor or a coding agent picking this project up, read in
this order. It takes about ten minutes and will stop you from contradicting
decisions that were made deliberately.

| # | Document | What it answers |
|---|---|---|
| 1 | **[STATE.md](./STATE.md)** | What is built, what is not, what is blocked. **Always start here.** |
| 2 | [00-brief.md](./00-brief.md) | What this site is for, who it is for, what it deliberately is not |
| 3 | [01-architecture.md](./01-architecture.md) | Stack, routing, data flow, build and deploy pipeline |
| 4 | [02-design-system.md](./02-design-system.md) | The style guide: colour, type, motion, and the rules for changing them |
| 5 | [03-adding-photos.md](./03-adding-photos.md) | How to publish new work. Written for the owner, no code required |
| 6 | [04-deployment.md](./04-deployment.md) | GitHub Actions, Pages setup, custom domains, rollback |
| 7 | [05-accessibility.md](./05-accessibility.md) | Standards held to, and how to verify them |
| 8 | [06-performance.md](./06-performance.md) | Budgets and the techniques that keep us inside them |

[decisions/](./decisions/) holds architecture decision records — one file per
choice that is expensive to reverse, each with the reasoning that produced it.
**When you disagree with something in this codebase, look there before changing
it.** In particular, [0002](./decisions/0002-github-pages-static-export.md)
explains constraints that are not obvious from the code and
[0004](./decisions/0004-scroll-architecture.md) explains why the scroll setup is
shaped the way it is.

## Conventions for these docs

- **STATE.md is the only file that goes stale by design.** Update it in the same
  commit as the work it describes.
- Record *why*, not *what*. The code already says what it does.
- A decision that took real argument belongs in `decisions/`, not buried in a
  code comment.
- If a document describes something that does not exist yet, it must say so
  explicitly at the top. Aspirational docs written in the present tense are
  worse than no docs.

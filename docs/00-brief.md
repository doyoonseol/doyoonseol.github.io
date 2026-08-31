# Brief

## What this is

A photography portfolio for Doyoon Seol, published at
**https://doyoonseol.github.io**. Its single job is to show photographs as well
as a browser can show them.

## Who it is for

In priority order:

1. **Someone who wants to look at the work.** They arrive, they look, they leave
   with an impression. Every decision serves this reader first.
2. **Someone evaluating the photographer** — an editor, a gallery, a client.
   They need to see a body of work, understand its range, and find contact
   details without hunting.
3. **The owner**, who needs to add new photographs without touching code or
   asking anyone for help.

## What good looks like

- The photographs are the only thing that draws attention. Interface recedes.
- A photograph is visible almost immediately. Nothing shifts once it loads.
- Any single frame can be linked to, and that link renders correctly for someone
  who has never visited the site.
- Adding a new photograph is a copy, a caption, and a commit.
- It works on a phone as well as it works on a 27-inch display.
- It works with a keyboard, with a screen reader, and with motion disabled.

## Non-goals

Stated so nobody re-litigates them later.

- **No CMS, no database, no server.** The site is static files. This is a
  constraint of the hosting choice and also a feature: nothing to maintain,
  nothing to patch, nothing to go down.
- **No user accounts, comments, or social features.**
- **No e-commerce in v1.** If prints are sold later it will be through hosted
  payment links, not a cart.
- **No right-click blocking or download obfuscation.** It does not work, it
  breaks legitimate browser behaviour, and it signals amateurism to exactly the
  audience worth impressing. Resolution capping is the effective control and the
  image pipeline already provides it.
- **No carousel on the homepage that moves before the reader asks it to**, unless
  the owner explicitly chooses the slideshow treatment.
- **No analytics that require a cookie banner.**

## Constraints inherited from hosting

GitHub Pages, deployed from GitHub Actions. See
[decisions/0002](./decisions/0002-github-pages-static-export.md) for the full
cascade, but the load-bearing facts are:

- Published site must stay under **1 GB**. This is the real ceiling on how many
  photographs can ship.
- Soft bandwidth limit of **100 GB/month**.
- No server-side anything: no image optimization API, no form handling, no
  redirects, no middleware.

/**
 * Single source of truth for site-level content and constants.
 *
 * ── FILLER CONTENT ─────────────────────────────────────────────────────────
 * Anything marked FILLER is placeholder text, present so the layout can be
 * reviewed in position. Replace the strings; no component changes are needed.
 * ───────────────────────────────────────────────────────────────────────────
 */

export const SITE = {
  /**
   * Canonical origin. This is a GitHub *user* site, so it is served from the
   * domain root with no base path.
   *
   * Adding a custom domain later: change this value, add `public/CNAME`
   * containing the bare domain, and set the domain in Settings → Pages.
   */
  url: "https://doyoonseol.github.io",

  name: "Doyoon Seol",

  /** FILLER — one line, appears in the browser tab and OG title. */
  tagline: "Photography",

  /** FILLER — used for search results and link previews. Aim for ~155 chars. */
  description:
    "Selected photographs by Doyoon Seol. A work in progress.",

  /**
   * FILLER — the short introduction on the landing page, beneath the name and
   * above the camera. Two or three sentences reads best here; the measure is
   * deliberately narrow so it stays a paragraph rather than becoming a wall.
   */
  bio: "I am a student at the University of Pennsylvania studying neuroscience. But outside of class, I spend my time exploring the world and the colors it offers. I like to try different styles of photography - landscape, cityscape, and astrophotography. Still very much a novice, but always working to improve.",



  /** FILLER — a mailto: link is used; there is no server to accept a form post. */
  email: "doyoon.seol@gmail.com",

  /** FILLER — remove any entry that does not apply. */
  social: [
    { label: "Instagram", href: "https://instagram.com/ds_lr779" },
  ],
} as const;

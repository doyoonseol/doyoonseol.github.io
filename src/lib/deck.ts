import { PHOTOS } from "@/lib/photos";

/**
 * The deck is a fixed, ordered list of full-viewport sections. Everything that
 * needs to reason about position — the scroll controller, the tick rail, the lens
 * reveal — derives it from here rather than counting DOM nodes.
 *
 *   0                 intro (the landing panel)
 *   1 … PHOTOS.length photographs, in order
 *   last              closing panel
 */
export const INTRO_ID = "intro";
export const CLOSING_ID = "closing";

export const SECTION_IDS: ReadonlyArray<string> = [
  INTRO_ID,
  ...PHOTOS.map((p) => p.id),
  CLOSING_ID,
];

export const SECTION_COUNT = SECTION_IDS.length;

/** Deck index of a given photograph. Photographs start at 1; index 0 is the intro. */
export const photoIndexToSection = (photoIndex: number) => photoIndex + 1;

/** Inverse of the above. Returns -1 for the intro and closing panels. */
export const sectionToPhotoIndex = (section: number) =>
  section >= 1 && section <= PHOTOS.length ? section - 1 : -1;

/**
 * The first photograph is a special case: it is not scrolled to. It is revealed
 * through the camera lens, so the intro → section 1 transition runs the lens
 * animation instead of a scroll.
 */
export const FIRST_PHOTO_SECTION = 1;

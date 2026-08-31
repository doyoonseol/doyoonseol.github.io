"use client";

import { useDeck } from "@/components/deck/deck-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { FIRST_PHOTO_SECTION } from "@/lib/deck";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Corner marks: wordmark top-left, theme control top-right. No bar, no background,
 * nothing spanning the viewport — the interface is two small anchors and otherwise
 * absent.
 *
 * The wordmark stays hidden on the landing panel, because the hero already sets the
 * name at full size and repeating it two inches away is noise.
 *
 * Both navigation controls are buttons routed through the deck rather than fragment
 * links. A fragment link would move the scroll position behind the controller's
 * back, and in the case of the first photograph it would also skip the lens reveal
 * entirely — the very transition the site is built around.
 */
export function SiteChrome() {
  const { index, goTo } = useDeck();
  const onIntro = index === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => goTo(FIRST_PHOTO_SECTION)}
        className="glass sr-only rounded-full px-4 py-2 focus:not-sr-only focus:fixed focus:left-5 focus:top-5 focus:z-50"
      >
        Skip to photographs
      </button>

      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-between p-5 sm:p-6">
        <button
          type="button"
          onClick={() => goTo(0)}
          aria-label={`${SITE.name} — back to the beginning`}
          className={cn(
            "label pointer-events-auto cursor-pointer rounded-sm px-1 py-1 transition-opacity duration-700",
            onIntro ? "pointer-events-none opacity-0" : "opacity-100",
          )}
        >
          {SITE.name}
        </button>

        <ThemeToggle className="pointer-events-auto" />
      </header>
    </>
  );
}

import { DeckProvider } from "@/components/deck/deck-provider";
import { SlideDeck } from "@/components/gallery/slide-deck";
import { Hero } from "@/components/hero/hero";
import { SiteChrome } from "@/components/site-chrome";

/**
 * The whole site is one document and one viewport.
 *
 * Sections are stacked and pinned rather than laid out in a scrollable column, so
 * exactly one photograph is on screen at any moment. `DeckProvider` owns moving
 * between them. See docs/decisions/0008-no-scroll-stage.md
 *
 * `main` is the stage: it establishes the containing block the sections pin to, and
 * carries no scroll of its own.
 */
export default function HomePage() {
  return (
    <DeckProvider>
      <SiteChrome />
      <main className="relative h-dvh overflow-hidden">
        <Hero />
        <SlideDeck />
      </main>
    </DeckProvider>
  );
}

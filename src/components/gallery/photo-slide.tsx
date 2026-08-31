import { DeckSection } from "@/components/deck/deck-section";
import { PhotoFigure, SLIDE_LAYOUT } from "@/components/gallery/photo-figure";
import { photoIndexToSection } from "@/lib/deck";
import type { Photo } from "@/lib/photos";

/**
 * One photograph, one section of the deck.
 *
 * There is no scrolling and no scroll-triggered entry animation: `DeckSection`
 * pins this to the viewport and the controller fades it in and out. A section is
 * either the one on stage or it is invisible.
 */
export function PhotoSlide({
  photo,
  index,
  total,
  priority = false,
}: {
  photo: Photo;
  index: number;
  total: number;
  priority?: boolean;
}) {
  return (
    <DeckSection
      index={photoIndexToSection(index)}
      id={photo.id}
      label={photo.title ?? `Frame ${index + 1}`}
      className={SLIDE_LAYOUT}
    >
      <PhotoFigure photo={photo} index={index} total={total} priority={priority} />
    </DeckSection>
  );
}

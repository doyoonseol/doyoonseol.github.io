import { DeckSection } from "@/components/deck/deck-section";
import { PhotoSlide } from "@/components/gallery/photo-slide";
import { SlideRail } from "@/components/gallery/slide-rail";
import { CLOSING_ID, SECTION_COUNT } from "@/lib/deck";
import { PHOTOS } from "@/lib/photos";
import { SITE } from "@/lib/site";

/**
 * The photographs, and the closing panel.
 *
 * Nothing here scrolls. `DeckProvider` owns navigation and `DeckSection` pins each
 * section to the viewport, so exactly one is ever visible. See
 * docs/decisions/0008-no-scroll-stage.md
 *
 * The first frame is priority: it is the photograph that opens out of the camera
 * lens, it is also rendered by the reveal overlay, and it needs to be in cache
 * before that transition runs.
 */
export function SlideDeck() {
  return (
    <>
      <SlideRail photos={PHOTOS} />

      {PHOTOS.map((photo, i) => (
        <PhotoSlide
          key={photo.id}
          photo={photo}
          index={i}
          priority={i === 0}
        />
      ))}

      {/* Closing panel. FILLER — contact details and any closing statement. */}
      <DeckSection
        index={SECTION_COUNT - 1}
        id={CLOSING_ID}
        label="Contact"
        className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center"
      >
        <p className="label text-muted-foreground">End of selection</p>



        <a
          href={`mailto:${SITE.email}`}
          className="border-b border-foreground/25 pb-0.5 transition-colors hover:border-foreground"
        >
          {SITE.email}
        </a>

        {SITE.social.length > 0 && (
          <ul className="label mt-2 flex items-center gap-5 text-muted-foreground">
            {SITE.social.map(({ label, href }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="transition-colors hover:text-foreground"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        )}

        <p className="label mt-8 text-muted-foreground/50">
          © {new Date().getFullYear()} {SITE.name}
        </p>
      </DeckSection>
    </>
  );
}

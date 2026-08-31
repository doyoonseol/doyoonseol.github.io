import { shotDetails, type Photo } from "@/lib/photos";
import { cn } from "@/lib/utils";

/**
 * Shot metadata as a single quiet line: "Fujifilm X-T5 · 35mm · f/2 · 1/500s · ISO 320".
 *
 * Inline rather than a labelled table, for two reasons. It stays a caption
 * instead of becoming a data panel, which is the point of a minimal slide; and
 * it degrades cleanly, because a photograph carrying only a camera name renders
 * as one item rather than as a table full of gaps.
 *
 * The values are self-describing to a sighted reader — f/2 and ISO 320 need no
 * heading — but not to a screen reader, which would hear a bare list of
 * fragments. So the field names are present as visually hidden <dt> elements:
 * correct semantics, zero visual cost.
 *
 * Renders nothing at all when there is no metadata.
 */
export function PhotoMeta({ photo, className }: { photo: Photo; className?: string }) {
  const details = shotDetails(photo);
  if (details.length === 0) return null;

  return (
    <dl
      className={cn(
        "label flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-muted-foreground",
        className,
      )}
    >
      {details.map(({ label, value }, i) => (
        <div key={label} className="flex items-center gap-3">
          {i > 0 && (
            <span aria-hidden="true" className="text-muted-foreground/40">
              ·
            </span>
          )}
          <dt className="sr-only">{label}</dt>
          <dd className="tabular">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

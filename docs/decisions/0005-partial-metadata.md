# 0005 — Treat partial shot metadata as the normal case

**Status:** accepted
**Date:** 2026-08-30

## Context

The owner supplies metadata by hand — camera, lens, shutter, aperture, ISO — and
stated plainly that some photographs will not have all of it.

This is not an edge case, it is the norm. A scanned negative carries no EXIF at
all. A manual lens on an adapter reports nothing to the body. A borrowed lens goes
unrecorded. Any design that treats complete metadata as the default will look
broken across a real archive.

## Decision

**Every metadata field is optional in the type, and the UI renders only what
exists.**

```ts
export type PhotoMetadata = {
  camera?: string;
  focalLength?: string;
  aperture?: string;
  shutter?: string;
  iso?: number | string;
};
```

Metadata is read exclusively from `.json` sidecar files (e.g. `01-harbour.json`), never from photo files. The supported metadata fields are `camera`, `focalLength`, `aperture`, `shutter`, `iso`, and `location`. Any field not provided in the sidecar file is assumed not present and omitted from display.

Three consequences follow.

### Values are strings, normalised at render

The fields are free-form so they can be typed the way a photographer would say
them. `shotDetails()` in `src/lib/photos.ts` normalises at render time, so
`"2.8"`, `"f/2.8"` and `"F2.8"` all display as `f/2.8`; `"1/250"` becomes
`1/250s`; `400` becomes `ISO 400`.

The alternative — a strict schema with numbers and units — would mean the owner
has to remember the format, and a typo becomes a build error rather than something
that just works. Being tolerant at the boundary is the whole point.

### Presentation is an inline list, not a table

Metadata renders as one line: `Fujifilm X-T5 · 35mm · f/2 · 1/500s · ISO 320`.

A labelled table was the obvious first instinct and is the wrong answer here.
With partial data it renders full of gaps, drawing attention to what is missing.
An inline list simply gets shorter. A photograph with only a camera name reads as
deliberate rather than incomplete — which matters, because that is what a film
scan will always look like.

It is also more minimal, which the brief asked for, and the values are
self-describing to a sighted reader: `f/2` and `ISO 320` need no heading.

### Field names exist for screen readers

Self-describing to a *sighted* reader is not the same as accessible. A screen
reader would otherwise announce a bare run of fragments. So the markup is a
`<dl>` with visually hidden `<dt>` field names and visible `<dd>` values:
correct semantics, zero visual cost.

`PhotoMeta` returns `null` when there is nothing to show, so the container never
renders empty.

## Alternatives considered

**Extract EXIF automatically at build time with `exifr`.** Still planned for the
image pipeline ([0003](./0003-precomputed-image-pipeline.md)) and it does not
conflict with this: extracted values will populate the same optional fields, with
hand-authored values winning on conflict. It does not remove the need for
tolerance, because scans will still have nothing to extract.

**Show placeholders like "—" for missing fields.** Rejected. It advertises
absence, and a grid of em dashes is worse than a short line.

**Require alt text but nothing else.** Adopted, and worth stating explicitly:
`alt` is the one field that is *not* optional. A photograph without a description
is invisible to anyone using a screen reader. The intent is for the build to fail
on a missing one once the pipeline lands.

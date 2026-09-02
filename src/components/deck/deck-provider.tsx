"use client";

import {
  animate,
  useMotionValue,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { FIRST_PHOTO_SECTION, SECTION_COUNT } from "@/lib/deck";

/* ---------------------------------------------------------------------------
 * Tuning. All of the feel lives here.
 * ------------------------------------------------------------------------ */

/**
 * Wheel delta needed to commit the *first* section of a gesture. Small enough that
 * one mouse-wheel notch (100px) commits at once, large enough that a stray twitch
 * of the trackpad does not.
 */
const WHEEL_FIRST = 60;
/**
 * Delta needed for each *subsequent* section while the same gesture continues.
 * Deliberately far higher than the first, because everything after the first
 * section is where a gesture runs away.
 */
const WHEEL_CHAIN = 220;

/**
 * Chained sections additionally require the reader to still be *driving* the
 * trackpad, measured as scroll rate in px per ms over `RATE_WINDOW_MS`.
 *
 * This is the part that actually tamed the sensitivity, and it exists because
 * accumulated delta alone cannot distinguish intent from coasting. macOS momentum
 * keeps emitting events for over a second after the fingers lift, and raising the
 * delta threshold high enough to absorb that also breaks the mouse wheel, where
 * 100px is one deliberate notch.
 *
 * Rate separates them cleanly: momentum decays exponentially, so its rate falls
 * away within a few hundred milliseconds, while a reader still moving their fingers
 * holds a roughly constant rate. Gating on it took a slight flick from three
 * sections down to one without making a deliberate scroll feel unresponsive.
 */
const MIN_CHAIN_RATE = 1.0;
const RATE_WINDOW_MS = 120;

/** Silence, in ms, after which the next wheel event starts a fresh gesture. */
const GESTURE_GAP_MS = 260;
/** Touch travel needed to commit, in px. */
const SWIPE_THRESHOLD = 56;
/**
 * How far ahead of the current section the queue may run.
 *
 * Requests arriving while the backlog is full are clamped away rather than banked,
 * so total travel is bounded by roughly (gesture duration / transition duration) +
 * this cap — not by the raw amount of delta.
 */
const QUEUE_CAP = 1;

/** Dip between sections: out, then in. Deliberately sequential — see below. */
const FADE_OUT_S = 0.25;
const FADE_IN_S = 0.35;

/** The lens sequence, intro ↔ first photograph. */
const ZOOM_S = 1.7;
const REVEAL_S = 0.7;
const REVEAL_DELAY_S = 0.42;
const CLOSE_S = 0.62;
const ZOOM_OUT_S = 1.6;
const ZOOM_OUT_DELAY_S = 0.18;

type Deck = {
  index: number;
  count: number;
  /** Jump straight to a section, skipping anything between. */
  goTo: (index: number) => void;
  /** Opacity of the section currently on stage. */
  fade: MotionValue<number>;
  /** Camera magnification, 0–1. Drives the hero. */
  zoom: MotionValue<number>;
  /** Lens aperture, 0–1. Drives the first-photograph overlay. */
  reveal: MotionValue<number>;
  busy: boolean;
  reduce: boolean;
};

const DeckContext = createContext<Deck | null>(null);

export function useDeck() {
  const deck = useContext(DeckContext);
  if (!deck) throw new Error("useDeck must be used inside <DeckProvider>");
  return deck;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const wait = (seconds: number) => new Promise((r) => setTimeout(r, seconds * 1000));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

/**
 * Owns navigation for the whole page. **Nothing here scrolls.**
 *
 * ── Why there is no scrolling at all ───────────────────────────────────────
 * Exactly one photograph must be visible at any moment, and moving a viewport from
 * one full-height section to the next necessarily puts both on screen while it
 * moves. So every section is `fixed inset-0`, stacked, and only one is opaque.
 * Changing section fades the outgoing one out and the incoming one in
 * *sequentially* — a cross-dissolve would show two photographs at partial opacity.
 * See docs/decisions/0008-no-scroll-stage.md
 *
 * ── Queue, not a lock ──────────────────────────────────────────────────────
 * Gestures are never rejected because a transition is already running. They add to
 * a desired index, and a pump moves one section at a time toward it, starting the
 * next transition the instant the previous one ends. Scrolling continuously
 * therefore keeps advancing with no pause between sections.
 *
 * Runaway is prevented by three things rather than by a lock: a much larger delta
 * threshold for chained sections than for the first, a minimum scroll *rate* for
 * chained sections, and a cap on how far the queue may run ahead. The rate gate is
 * the important one — it is what distinguishes a reader still moving their fingers
 * from trackpad momentum that is merely coasting.
 *
 * ── Reduced motion ─────────────────────────────────────────────────────────
 * The controller always installs, because navigation is the only way through the
 * site. Under `prefers-reduced-motion` transitions become instant swaps and the
 * lens sequence is skipped. Reduced motion means less movement, not less function.
 */
export function DeckProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion() === true;

  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const fade = useMotionValue(1);
  const zoom = useMotionValue(0);
  const reveal = useMotionValue(0);

  const indexRef = useRef(0);
  const busyRef = useRef(false);

  /** Where the reader has asked to end up. The pump chases this. */
  const desiredRef = useRef(0);
  /** True when the target was chosen directly (rail, chrome) rather than stepped. */
  const directRef = useRef(false);

  const accumRef = useRef(0);
  const stepsInGestureRef = useRef(0);
  const lastWheelAt = useRef(0);
  /** Recent wheel magnitudes within RATE_WINDOW_MS, for the scroll-rate gate. */
  const recentRef = useRef<Array<{ at: number; mag: number }>>([]);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  /** Generation counter to invalidate stale rAF callbacks from forward cuts. */
  const scrubGenRef = useRef(0);
  /** Shock absorber: completely ignores scroll events until this timestamp. */
  const shockAbsorberRef = useRef(0);

  // The pump and the transition runner call each other. A ref breaks the cycle
  // without either of them needing to be redefined on every render.
  const pumpRef = useRef<() => void>(() => {});

  const commit = useCallback((next: number) => {
    indexRef.current = next;
    setIndex(next);
  }, []);

  const runTransition = useCallback(
    (target: number) => {
      const to = clamp(target, 0, SECTION_COUNT - 1);
      if (busyRef.current || to === indexRef.current) return;

      const from = indexRef.current;
      busyRef.current = true;
      setBusy(true);

      const finish = () => {
        busyRef.current = false;
        setBusy(false);
        // Chain straight into whatever is queued. This is what removes the pause.
        pumpRef.current();
      };

      if (reduce) {
        zoom.set(0);
        reveal.set(0);
        fade.set(1);
        commit(to);
        finish();
        return;
      }

      // ── Intro → first photograph: out of the lens ─────────────────────────
      if (from === 0 && to === FIRST_PHOTO_SECTION) {
        void (async () => {
          try {
            zoom.set(0);
            reveal.set(0);

            const zooming = animate(zoom, 1, {
              duration: ZOOM_S,
              ease: [0.5, 0, 0.6, 1],
            }).finished;

            // Open the aperture before the zoom finishes. The overlap is what
            // makes the photograph feel like it comes out of the glass rather
            // than replacing it.
            await wait(REVEAL_DELAY_S);
            const opening = animate(reveal, 1, {
              duration: REVEAL_S,
              ease: [0.32, 0, 0.24, 1],
            }).finished;

            await Promise.all([zooming, opening]);

            // The overlay covers everything, so the swap underneath is unseen.
            fade.set(1);
            commit(to);

            await nextFrame();
            reveal.set(0);
            zoom.set(0);
          } finally {
            finish();
          }
        })();
        return;
      }

      // ── First photograph → intro: back out through the lens ──────────────
      if (from === FIRST_PHOTO_SECTION && to === 0) {
        void (async () => {
          try {
            // Reconstruct the "inside the lens" state: hero on stage with the
            // camera already magnified, photograph filling the frame via the
            // overlay. Then run the forward sequence backwards.
            fade.set(1);
            zoom.set(1);
            reveal.set(1);
            commit(0);

            // Let that paint before animating out of it, otherwise the first
            // frame of the close would be dropped.
            await nextFrame();
            await nextFrame();

            const closing = animate(reveal, 0, {
              duration: CLOSE_S,
              ease: [0.32, 0, 0.24, 1],
            }).finished;

            await wait(ZOOM_OUT_DELAY_S);
            const pullingBack = animate(zoom, 0, {
              duration: ZOOM_OUT_S,
              ease: [0.4, 0, 0.5, 1],
            }).finished;

            await Promise.all([closing, pullingBack]);
          } finally {
            finish();
          }
        })();
        return;
      }

      // ── Everything else: dip out, swap, dip in ───────────────────────────
      void (async () => {
        try {
          zoom.set(0);
          reveal.set(0);

          await animate(fade, 0, { duration: FADE_OUT_S, ease: [0.22, 1, 0.36, 1] }).finished;
          commit(to);
          await animate(fade, 1, { duration: FADE_IN_S, ease: [0.22, 1, 0.36, 1] }).finished;
        } finally {
          finish();
        }
      })();
    },
    [commit, fade, reduce, reveal, zoom],
  );

  /**
   * Advance one section toward `desiredRef`, if anything is outstanding and the
   * stage is free. Called on every new request and again at the end of every
   * transition, which is what makes them chain.
   */
  const pump = useCallback(() => {
    if (busyRef.current) return;

    const desired = desiredRef.current;
    const current = indexRef.current;
    if (desired === current) return;

    // A direct jump goes straight there. A stepped one advances a section at a
    // time, so scrolling past several photographs shows each of them.
    const target = directRef.current ? desired : current + Math.sign(desired - current);
    runTransition(target);
  }, [runTransition]);

  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  /** One section further in `dir`, queued if a transition is already running. */
  const step = useCallback(
    (dir: number) => {
      directRef.current = false;
      desiredRef.current = clamp(
        clamp(
          desiredRef.current + dir,
          indexRef.current - QUEUE_CAP,
          indexRef.current + QUEUE_CAP,
        ),
        0,
        SECTION_COUNT - 1,
      );
      pump();
    },
    [pump],
  );

  /** Jump straight to a section. Used by the tick rail and the corner marks. */
  const goTo = useCallback(
    (to: number) => {
      if (busyRef.current) return;
      directRef.current = true;
      desiredRef.current = clamp(to, 0, SECTION_COUNT - 1);
      pump();
    },
    [pump],
  );

  useEffect(() => {
    // Non-passive: the page must not also try to scroll or rubber-band.
    //
    // Note there is no `busy` guard here. Delta accumulated during a transition is
    // exactly what lets continuous scrolling chain into the next section.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();

      const now = performance.now();
      if (now < shockAbsorberRef.current) return;

      if (now - lastWheelAt.current > GESTURE_GAP_MS) {
        if (indexRef.current !== 0) {
          accumRef.current = 0;
        }
        stepsInGestureRef.current = 0;
        recentRef.current.length = 0;
      }
      lastWheelAt.current = now;

      // Rolling scroll rate over the last RATE_WINDOW_MS. The window holds only a
      // handful of events at 60–120Hz, so trimming from the front is cheap.
      const recent = recentRef.current;
      recent.push({ at: now, mag: Math.abs(event.deltaY) });
      while (recent.length > 0 && now - recent[0]!.at > RATE_WINDOW_MS) recent.shift();
      const rate = recent.reduce((sum, r) => sum + r.mag, 0) / RATE_WINDOW_MS;

      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }

      // ── Linear Scrubbing for Hero ──────────────────────────────────────────
      if (indexRef.current === 0) {
        if (busyRef.current) return;
        
        // Trackpad/mouse wheel scrubs the zoom linearly over 2500px of delta
        accumRef.current = clamp(accumRef.current + event.deltaY, 0, 2500);
        
        const z = accumRef.current / 2500;
        
        // Immediate linear mapping — no lag
        zoom.set(z);

        if (z >= 1 && event.deltaY > 0) {
          // Cut to the first photograph. No busy gate — we want scroll-up
          // events to still be accepted immediately for the reverse scrub.
          fade.set(1);
          commit(FIRST_PHOTO_SECTION);
          
          // ABSORB MOMENTUM: Set an 800ms "shock absorber" so that leftover trackpad
          // momentum is completely ignored. The user must physically stop scrolling
          // and wait a moment before they can proceed to the second photograph.
          shockAbsorberRef.current = performance.now() + 800;
          
          // Reset gesture state so the next real swipe starts clean
          stepsInGestureRef.current = 0;
          recentRef.current.length = 0;
          accumRef.current = 0;
          
          // Two frames to let the photo section render+paint before resetting.
          // A generation counter ensures this callback is invalidated if the
          // reverse handler fires before it runs.
          const gen = ++scrubGenRef.current;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (scrubGenRef.current !== gen) return; // stale, reverse took over
              zoom.set(0);
              accumRef.current = 0;
            });
          });
        }
        return;
      }

      if (indexRef.current === FIRST_PHOTO_SECTION && event.deltaY < 0) {
        // Scrolled up on the first photograph: swap to Hero immediately and
        // start scrubbing from the first event — no busy gate, no dropped frames.
        if (busyRef.current) return;
        
        // Invalidate any pending forward-cut rAF reset
        scrubGenRef.current++;
        
        fade.set(1);
        zoom.set(1);
        accumRef.current = 2500;
        commit(0);
        
        // Apply this first scroll delta immediately so the shutter moves right away
        accumRef.current = clamp(accumRef.current + event.deltaY, 0, 2500);
        const z = accumRef.current / 2500;
        zoom.set(z);
        return;
      }
      // ───────────────────────────────────────────────────────────────────────

      accumRef.current += event.deltaY;

      const isFirst = stepsInGestureRef.current === 0;
      if (Math.abs(accumRef.current) < (isFirst ? WHEEL_FIRST : WHEEL_CHAIN)) return;

      // Past the first section, only advance while the reader is still driving.
      // Coasting momentum fails this even though it is still producing delta.
      if (!isFirst && rate < MIN_CHAIN_RATE) return;

      const dir = accumRef.current > 0 ? 1 : -1;
      accumRef.current = 0;
      stepsInGestureRef.current += 1;
      step(dir);
    };

    let touchY: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (touchY === null) return;
      const y = event.touches[0]?.clientY ?? touchY;
      // Only claim vertical intent, so horizontal swipes inside the RAW carousel
      // still reach it.
      if (Math.abs(touchY - y) > 8) event.preventDefault();
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (touchY === null) return;
      const travel = touchY - (event.changedTouches[0]?.clientY ?? touchY);
      touchY = null;
      if (Math.abs(travel) < SWIPE_THRESHOLD) return;
      step(travel > 0 ? 1 : -1);
    };

    const onKey = (event: KeyboardEvent) => {
      // Never steal keys from a focused control — Space on a button, or arrows
      // inside the RAW carousel.
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, [tabindex]")) return;

      switch (event.key) {
        case "ArrowDown":
        case "PageDown":
        case " ":
          event.preventDefault();
          step(1);
          break;
        case "ArrowUp":
        case "PageUp":
          event.preventDefault();
          step(-1);
          break;
        case "Home":
          event.preventDefault();
          goTo(0);
          break;
        case "End":
          event.preventDefault();
          goTo(SECTION_COUNT - 1);
          break;
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
    };
  }, [goTo, step, commit, fade, zoom]);

  const value = useMemo<Deck>(
    () => ({ index, count: SECTION_COUNT, goTo, fade, zoom, reveal, busy, reduce }),
    [index, goTo, fade, zoom, reveal, busy, reduce],
  );

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>;
}

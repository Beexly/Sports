"use client";

/**
 * CinematicEntrance — the calm galaxy cold-open for Galaxy Sports Edge.
 *
 * Rebuilt 2026-06 for calm + clarity + zero lag. The previous version flew the
 * visitor through a real-time WebGL warp tunnel (16k Three.js particles) past
 * ten waypoints that swept by faster than they could be read, over a saturated
 * cyan / violet / plasma field. It looked busy, the copy was unreadable, and it
 * stuttered on laptops and integrated GPUs.
 *
 * This version is a held, readable ARRIVAL — not a warp:
 *  - A single still deep-space plate (Higgsfield, committed under
 *    /public/immersive, registered as the `intro-galaxy` plate) drifts almost
 *    imperceptibly. No WebGL, no 72 animated streaks — near-zero GPU cost and
 *    no per-frame repaint. That is the lag fix.
 *  - A short sequence of doctrine lines appears ONE AT A TIME, each held long
 *    enough to actually read, then the identity resolves and hands off to the
 *    live world behind it.
 *  - Restrained palette: obsidian + soft cyan, a whisper of violet. No plasma,
 *    no stacked neon glows, no flashing.
 *
 * Modes:
 *  - First visit  → calm ~15s sequence (arrival → 3 doctrine beats → identity → handoff).
 *  - Return visit → compressed ~3s (localStorage flag): arrival → identity → handoff.
 *  - Opted out    → "Don't show again" sets gse-intro-disabled; bypassed after.
 *  - Reduced motion → static identity + entry choices, instant, no motion.
 *  - #enter deep-link or ?intro=skip → bypass entirely.
 *
 * Accessibility: role="dialog", focus-managed Skip, Escape to skip, body scroll
 * locked while open, polite live-region announce. No audio. Skip and "don't
 * show again" are always one action away. All motion rides .gse-cine-anim, so
 * prefers-reduced-motion removes it wholesale.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import Link from "next/link";
import { BRAND_COLORS, BRAND_NAME, BRAND_MONOGRAM } from "@/lib/brand";
import { GeneratedPlate } from "@/components/immersive/generated-plate";

const SEEN_KEY = "gse-entrance-seen-v1";
/** Set via "Don't show this intro again" on the handoff — full bypass. */
const DISABLED_KEY = "gse-intro-disabled";

type Phase = "intro" | "identity" | "handoff" | "done";

/* ── Calm, readable cadence ───────────────────────────────────────────────
 * Each doctrine line OWNS the screen for LINE_MS so it can be read without
 * rushing; lines run back-to-back with no gaps, then the identity holds before
 * the handoff. First-visit total ≈ 15.6s, with Skip always one click away. */
const BACKDROP_FADE_MS = 1200;
const LINE_MS = 3800;
const IDENTITY_HOLD_MS = 3000;

/** Doctrine beats — the brand's honest thesis, paced one line at a time. */
const DOCTRINE = [
  "The market is mostly noise.",
  "We turn it into signal you can check.",
  "Every edge earns a receipt.",
] as const;

const cyan = BRAND_COLORS.orbitalCyan;
const uv = BRAND_COLORS.softUltraviolet;
const white = BRAND_COLORS.ionWhite;

/** A few slow, faint stars layered over the plate (deterministic positions —
 * server and client agree, no hydration drift). */
const STARS: readonly { left: number; top: number; size: number; delay: number; dur: number }[] =
  Array.from({ length: 18 }, (_, i) => ({
    left: (((i * 137.508) % 100) + 100) % 100,
    top: (((i * 61.803) % 100) + 100) % 100,
    size: i % 6 === 0 ? 2 : 1,
    delay: -((i * 0.7) % 7),
    dur: 6 + (i % 5),
  }));

export function CinematicEntrance() {
  const [phase, setPhase] = useState<Phase>("intro");
  // -1 = no doctrine line yet (backdrop still settling); 0..n index into DOCTRINE.
  const [step, setStep] = useState(-1);
  const [tour, setTour] = useState(true);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const startedRef = useRef(false);

  const finish = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setPhase("done");
  }, []);

  const disableForever = useCallback(() => {
    try {
      localStorage.setItem(DISABLED_KEY, "1");
    } catch {
      /* ignore */
    }
    finish();
  }, [finish]);

  // Boot the sequence (once).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    let disabled = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
      disabled = localStorage.getItem(DISABLED_KEY) === "1";
    } catch {
      /* ignore */
    }

    if (
      disabled ||
      window.location.hash === "#enter" ||
      window.location.search.includes("intro=skip")
    ) {
      setPhase("done");
      return;
    }
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }

    const push = (fn: () => void, at: number) =>
      timers.current.push(window.setTimeout(fn, at));

    // Reduced motion → land straight on the identity + choices, no motion.
    if (reduced) {
      setTour(false);
      setPhase("identity");
      push(() => setPhase("handoff"), 500);
      return;
    }

    // Return visit → brief calm arrival, no doctrine beats.
    if (seen) {
      setTour(false);
      push(() => setPhase("identity"), BACKDROP_FADE_MS + 700);
      push(() => setPhase("handoff"), BACKDROP_FADE_MS + 700 + 1400);
      return;
    }

    // First visit → paced doctrine beats (each readable), then identity, handoff.
    setTour(true);
    for (let i = 0; i < DOCTRINE.length; i += 1) {
      push(() => setStep(i), BACKDROP_FADE_MS + i * LINE_MS);
    }
    const identityAt = BACKDROP_FADE_MS + DOCTRINE.length * LINE_MS;
    push(() => setPhase("identity"), identityAt);
    push(() => setPhase("handoff"), identityAt + IDENTITY_HOLD_MS);
  }, []);

  // Focus skip; lock scroll; Escape to skip.
  useEffect(() => {
    if (phase === "done") return;
    skipRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, finish]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // Subtle parallax — CSS variables written straight (rAF-throttled), so a
  // high-polling mouse never outpaces the compositor and React never re-renders.
  const steerRaf = useRef(0);
  const steerXY = useRef<[number, number]>([0, 0]);
  const onMove = (e: ReactMouseEvent) => {
    steerXY.current = [
      (e.clientX / window.innerWidth - 0.5) * 2,
      (e.clientY / window.innerHeight - 0.5) * 2,
    ];
    if (steerRaf.current) return;
    steerRaf.current = requestAnimationFrame(() => {
      steerRaf.current = 0;
      const el = rootRef.current;
      if (!el) return;
      el.style.setProperty("--par-x", String(steerXY.current[0]));
      el.style.setProperty("--par-y", String(steerXY.current[1]));
    });
  };
  useEffect(() => () => cancelAnimationFrame(steerRaf.current), []);

  if (phase === "done") return null;

  const showIntro = phase === "intro";
  const showIdentity = phase === "identity" || phase === "handoff";
  const showHandoff = phase === "handoff";

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Entering ${BRAND_NAME}`}
      onMouseMove={onMove}
      className="fixed inset-0 z-[70] overflow-hidden"
      style={{ background: BRAND_COLORS.obsidianBlack }}
    >
      <span className="sr-only" role="status">
        Entering {BRAND_NAME}. Find the signal before the market moves.
      </span>

      {/* Backdrop: still galaxy plate (no WebGL) with a near-imperceptible drift
          and a gentle parallax lean. GeneratedPlate paints the gradient base
          first, so it degrades to a calm gradient if the image ever fails. */}
      <div
        aria-hidden
        className="gse-cine-anim absolute inset-0"
        style={{
          animation: "gse-backdrop-drift 26s ease-in-out infinite alternate",
          willChange: "transform",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform:
              "translate3d(calc(var(--par-x, 0) * 8px), calc(var(--par-y, 0) * 8px), 0)",
          }}
        >
          <GeneratedPlate assetId="intro-galaxy" className="opacity-100" />
        </div>
      </div>

      {/* faint slow stars — a little parallax depth over the plate */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          transform:
            "translate3d(calc(var(--par-x, 0) * 16px), calc(var(--par-y, 0) * 16px), 0)",
        }}
      >
        {STARS.map((s, i) => (
          <span
            key={i}
            className="gse-cine-anim absolute rounded-full"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              background: white,
              opacity: 0.45,
              animation: `gse-star-breathe ${s.dur}s ease-in-out infinite`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* atmosphere — vignette + film grain (grain also dithers any banding) */}
      <div aria-hidden className="gse-vignette" />
      <div aria-hidden className="gse-grain" />

      {/* ── INTRO — doctrine beats, one readable line at a time ─────────── */}
      {showIntro && tour && step >= 0 && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <p
            key={step}
            className="gse-cine-anim max-w-2xl font-display text-balance"
            style={{
              animation: `gse-line-cycle ${LINE_MS}ms ease-in-out both`,
              color: white,
              fontSize: "clamp(1.6rem, 4.5vw, 3rem)",
              lineHeight: 1.15,
              textShadow: "0 2px 24px rgba(0,0,0,0.7)",
            }}
          >
            {DOCTRINE[Math.min(step, DOCTRINE.length - 1)]}
          </p>
        </div>
      )}

      {/* ── IDENTITY + HANDOFF ─────────────────────────────────────────── */}
      {showIdentity && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="gse-cine-anim" style={{ animation: "gse-soft-rise 900ms ease-out both" }}>
            <p
              className="font-arch tabular-nums"
              style={{
                fontSize: "clamp(3.5rem, 12vw, 8rem)",
                lineHeight: 0.9,
                color: white,
                letterSpacing: "0.02em",
              }}
            >
              {BRAND_MONOGRAM}
            </p>
            <p className="eyebrow mt-3 justify-center" style={{ color: cyan }}>
              {BRAND_NAME}
            </p>
          </div>

          <p
            className="gse-cine-anim mt-7 max-w-xl font-display text-balance text-white"
            style={{
              animation: "gse-soft-rise 1000ms ease-out both",
              animationDelay: "350ms",
              fontSize: "clamp(1.35rem, 3.6vw, 2.25rem)",
              lineHeight: 1.12,
              textShadow: "0 2px 24px rgba(0,0,0,0.7)",
            }}
          >
            Find the signal{" "}
            <span className="gse-editorial" style={{ fontSize: "1.06em" }}>
              before
            </span>{" "}
            the market moves.
          </p>

          {showHandoff && (
            <div
              className="gse-cine-anim mt-10 flex flex-col items-center gap-4"
              style={{ animation: "gse-soft-rise 700ms ease-out both" }}
            >
              <button
                type="button"
                onClick={finish}
                className="group relative inline-flex items-center gap-3 rounded-full px-9 py-4 text-base font-semibold transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none"
                style={{
                  color: BRAND_COLORS.obsidianBlack,
                  background: `linear-gradient(110deg, ${cyan}, ${uv})`,
                  boxShadow: `0 0 30px -6px ${cyan}66`,
                }}
              >
                <span
                  aria-hidden
                  className="gse-enter-ring absolute inset-0 rounded-full"
                  style={{ border: `1px solid ${cyan}80` }}
                />
                Enter the system
                <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
                  ▸
                </span>
              </button>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
                <Link href="/board" onClick={finish} className="text-ink-300 underline-offset-4 transition-colors hover:text-white hover:underline">
                  Today&apos;s board
                </Link>
                <span aria-hidden className="text-ink-500">·</span>
                <Link href="/observatory" onClick={finish} className="text-ink-300 underline-offset-4 transition-colors hover:text-white hover:underline">
                  Galaxy Twin
                </Link>
                <span aria-hidden className="text-ink-500">·</span>
                <Link href="/fantasy" onClick={finish} className="text-ink-300 underline-offset-4 transition-colors hover:text-white hover:underline">
                  Fantasy Galaxy
                </Link>
                <span aria-hidden className="text-ink-500">·</span>
                <Link href="/the-beat" onClick={finish} className="text-ink-300 underline-offset-4 transition-colors hover:text-white hover:underline">
                  The Beat
                </Link>
              </div>

              <button
                type="button"
                onClick={disableForever}
                className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-500 underline-offset-4 transition-colors hover:text-ink-300 hover:underline"
              >
                don&apos;t show this intro again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Skip — always available */}
      <button
        ref={skipRef}
        type="button"
        onClick={finish}
        className="absolute right-5 top-5 z-10 rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-ink-400 transition-colors hover:text-white focus-visible:outline-none"
        style={{ borderColor: BRAND_COLORS.steelGray }}
      >
        Skip ▸
      </button>
    </div>
  );
}

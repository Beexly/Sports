"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * SignalBreachIntro — the cold open.
 *
 * A signal-breach sequence that plays the doctrine instead of explaining it:
 * the market moved, the engine read it, one weak read was held, one survived,
 * and the receipt stayed attached. It resolves *into* the live hero (the
 * galaxy is already behind it), so there is no hard cut from "video" to page.
 *
 * Product rules (deliberate, see docs/experience-director-audit-2026.md):
 *   - Plays at most ONCE per browser session. Replaying on every navigation
 *     is hostile; the cinematic is a greeting, not a toll booth.
 *   - prefers-reduced-motion: never shows. The command surface is already
 *     there; we do not gate it behind motion.
 *   - Always skippable: a focusable Skip control, Escape, click, scroll, or
 *     touch all dismiss it. It also auto-dismisses.
 *   - No audio. No external libs. No canvas. Pure CSS motion tokens so the
 *     global reduced-motion neutraliser and the rest of the system apply.
 *
 * It is a post-hydration enhancement layered over server-rendered content, so
 * it never blocks first paint or the crawlable DOM.
 */

const SESSION_KEY = "gse:intro:v1";

type IntroMode = "pending" | "play" | "off";

/**
 * Decides whether the breach should play. SSR and the first client render
 * return "pending" (renders nothing) to avoid a hydration mismatch; the real
 * decision is made in an effect using sessionStorage + the reduced-motion
 * query, both of which are client-only.
 */
function useIntroMode(): [IntroMode, () => void] {
  const [mode, setMode] = useState<IntroMode>("pending");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alreadySeen = false;
    try {
      alreadySeen = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // Private mode / disabled storage — treat as not-seen but don't persist.
      alreadySeen = false;
    }

    if (reduced || alreadySeen) {
      setMode("off");
      return;
    }

    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* non-fatal */
    }
    setMode("play");
  }, []);

  const end = useCallback(() => setMode("off"), []);
  return [mode, end];
}

// The breach script. Each line is a beat in the loop; `tone` drives the
// visual state via motion tokens (acquire = a read clears, hold = a read is
// held). Cumulative reveal — earlier lines stay on screen.
const BEATS: ReadonlyArray<{ text: string; tone: "read" | "hold" | "acquire" }> = [
  { text: "Price moved.", tone: "read" },
  { text: "News broke.", tone: "read" },
  { text: "The model disagreed.", tone: "read" },
  { text: "No edge, no pick.", tone: "hold" },
  { text: "Signal acquired.", tone: "acquire" },
  { text: "The receipt stays attached.", tone: "acquire" },
];

const BEAT_MS = 640; // cadence between beats
const HOLD_MS = 900; // dwell on the final command before auto-dismiss
const FADE_MS = 360; // resolve-into-page fade

export function SignalBreachIntro(): JSX.Element | null {
  const [mode, end] = useIntroMode();
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const timers = useRef<number[]>([]);
  const skipRef = useRef<HTMLButtonElement | null>(null);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }, []);

  const dismiss = useCallback(() => {
    clearTimers();
    setClosing(true);
    timers.current.push(window.setTimeout(end, FADE_MS));
  }, [clearTimers, end]);

  // Drive the timeline once we're in play mode.
  useEffect(() => {
    if (mode !== "play") return;

    // Lock body scroll for the brief duration; restored on cleanup.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Reveal beats one at a time.
    for (let i = 1; i <= BEATS.length; i++) {
      timers.current.push(window.setTimeout(() => setStep(i), i * BEAT_MS));
    }
    // After the last beat dwells, resolve into the page.
    timers.current.push(
      window.setTimeout(dismiss, BEATS.length * BEAT_MS + HOLD_MS),
    );

    // Move focus to the skip control for keyboard users.
    skipRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") dismiss();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", dismiss, { passive: true, once: true });
    window.addEventListener("touchmove", dismiss, { passive: true, once: true });

    return () => {
      clearTimers();
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("touchmove", dismiss);
    };
  }, [mode, dismiss, clearTimers]);

  if (mode !== "play") return null;

  const complete = step >= BEATS.length;

  return (
    <div
      role="dialog"
      aria-label="Galaxy Sports Edge — signal breach intro"
      data-testid="signal-breach-intro"
      onClick={dismiss}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-carbon px-6"
      style={{
        opacity: closing ? 0 : 1,
        transition: `opacity ${FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`,
      }}
    >
      {/* Atmosphere — faint tactical grid + glow, reused from the system. */}
      <div className="grid-overlay" aria-hidden="true" />
      <div className="atmo-glow" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(0,229,255,0.35),transparent)]"
      />

      {/* Skip control. */}
      <button
        ref={skipRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        className="absolute right-4 top-4 z-[2] rounded-ds-sm border border-mineral px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ion-1 transition-colors hover:border-orbital-cyan hover:text-ion-white sm:right-6 sm:top-6"
      >
        Skip intro →
      </button>

      <div className="relative z-[1] mx-auto w-full max-w-2xl">
        {/* Kicker */}
        <div className="flex items-center gap-3 animate-breach">
          <span className="live-dot" aria-hidden="true" />
          <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-orbital-cyan">
            Galaxy Sports Edge · Signal breach
          </span>
        </div>

        {/* Beats — cumulative terminal reveal. */}
        <ul className="mt-8 flex flex-col gap-3">
          {BEATS.map((beat, i) => {
            const shown = step > i;
            const toneClass =
              beat.tone === "hold"
                ? "text-ion-1"
                : beat.tone === "acquire"
                  ? "text-orbital-cyan"
                  : "text-ion-white";
            return (
              <li
                key={beat.text}
                className={`font-mono text-lg sm:text-2xl ${toneClass}`}
                style={{
                  opacity: shown ? 1 : 0,
                  transform: shown ? "translateY(0)" : "translateY(8px)",
                  transition:
                    "opacity 420ms cubic-bezier(0.16,1,0.3,1), transform 420ms cubic-bezier(0.16,1,0.3,1)",
                }}
              >
                <span aria-hidden="true" className="mr-2 text-ion-3">
                  {beat.tone === "hold" ? "✕" : beat.tone === "acquire" ? "▸" : "·"}
                </span>
                {beat.text}
              </li>
            );
          })}
        </ul>

        {/* Resolve — the way in. */}
        <div
          className="mt-10"
          style={{
            opacity: complete ? 1 : 0,
            transform: complete ? "translateY(0)" : "translateY(10px)",
            transition:
              "opacity 520ms cubic-bezier(0.16,1,0.3,1), transform 520ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <p className="font-display text-3xl font-semibold text-ion-white sm:text-5xl">
            Enter the slate.
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ion-2">
            The engine is already reading.
          </p>
        </div>
      </div>
    </div>
  );
}

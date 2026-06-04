"use client";

/**
 * ReasoningShowcase — the "watch the engine run" explainer.
 *
 * Replaces a static card grid with an auto-advancing spotlight: one step at a
 * time, animating in, with a live progress bar that fills over its dwell and
 * trips to the next. It reads like a short looping how-it-works film built from
 * motion, not an embedded video. Visitors can pause, or jump via the step rail.
 *
 * Accessibility: the live region is polite, each step is reachable by the rail
 * buttons (real <button>s with aria-current), play/pause is labelled, and
 * reduced-motion disables auto-advance and the fill animation entirely — the
 * visitor drives it by click.
 */

import { useEffect, useRef, useState } from "react";

export type ShowcaseStep = {
  readonly step: string;
  readonly title: string;
  readonly body: string;
  readonly accent: string;
};

const DWELL_MS = 4600;

export function ReasoningShowcase({ steps }: { steps: readonly ShowcaseStep[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedRef.current) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing || reducedRef.current) return;
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % steps.length);
    }, DWELL_MS);
    return () => window.clearTimeout(id);
  }, [index, playing, steps.length]);

  const active = steps[index]!;
  const counter = `${String(index + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`;

  return (
    <div
      className="surface-card relative overflow-hidden p-6 sm:p-9"
      style={{ minHeight: "clamp(360px, 46vh, 460px)" }}
    >
      {/* Ambient accent wash that recolors with the active step. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl transition-colors duration-700"
        style={{ background: `${active.accent}22` }}
      />

      {/* Header: label · counter · play-pause */}
      <div className="relative flex items-center justify-between gap-4">
        <p className="eyebrow flex items-center gap-2" style={{ color: active.accent }}>
          <span className="live-dot" />
          How the engine works
        </p>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs tabular-nums text-ink-500">{counter}</span>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause walkthrough" : "Play walkthrough"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-white transition-colors hover:bg-white/5 focus-visible:outline-none"
            style={{ borderColor: `${active.accent}66` }}
          >
            {playing ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                <rect x="1.5" y="1" width="3" height="10" rx="1" />
                <rect x="7.5" y="1" width="3" height="10" rx="1" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                <path d="M2 1.3v9.4a.6.6 0 0 0 .92.5l7.2-4.7a.6.6 0 0 0 0-1L2.92.8A.6.6 0 0 0 2 1.3Z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Spotlight — re-keyed per index so it re-animates in. */}
      <div
        key={index}
        aria-live="polite"
        className="relative mt-8 grid gap-6 motion-safe:animate-[gse-step_600ms_cubic-bezier(0.22,0.61,0.36,1)] sm:grid-cols-[auto_1fr] sm:items-start sm:gap-9"
      >
        <div
          aria-hidden="true"
          className="font-display text-7xl leading-none tabular-nums sm:text-8xl"
          style={{ color: active.accent, textShadow: `0 0 40px ${active.accent}66` }}
        >
          {active.step}
        </div>
        <div>
          <h3 className="font-display text-2xl text-white sm:text-3xl">{active.title}</h3>
          <span
            aria-hidden="true"
            className="mt-3 block h-px w-24 origin-left"
            style={{ background: `linear-gradient(90deg, ${active.accent}, transparent)` }}
          />
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-300">{active.body}</p>
        </div>
      </div>

      {/* Step rail — segmented progress; active segment fills over the dwell. */}
      <div className="relative mt-9 flex gap-2 sm:absolute sm:inset-x-9 sm:bottom-7">
        {steps.map((s, i) => {
          const isActive = i === index;
          const isPast = i < index;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Step ${s.step}: ${s.title}`}
              aria-current={isActive ? "step" : undefined}
              className="group relative h-1.5 flex-1 overflow-hidden rounded-full focus-visible:outline-none"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <span
                className="absolute inset-0 origin-left rounded-full"
                style={{
                  background: s.accent,
                  transform: isPast ? "scaleX(1)" : "scaleX(0)",
                  ...(isActive
                    ? {
                        animation:
                          playing && !reducedRef.current
                            ? `gse-fill ${DWELL_MS}ms linear forwards`
                            : "none",
                        transform: playing && !reducedRef.current ? undefined : "scaleX(1)",
                      }
                    : {}),
                }}
              />
              {/* taller hit target */}
              <span className="absolute -inset-y-3 inset-x-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

/**
 * AgentWarRoom — the visible council of specialist agents, playing back one
 * illustrative escalation cascade so you can SEE which agent moved the verdict
 * and why. Auto-advances; pausable; jump via the rail. Reduced-motion disables
 * auto-advance and the fill (the visitor drives it). aria-live narration; the
 * rail buttons are real, labelled controls. Illustrative — explicitly badged.
 */

import { useEffect, useRef, useState } from "react";
import {
  AGENTS, CASCADE, VERDICT_HEX, LEVEL_HEX, statesAtStep,
  type AgentLevel,
} from "@/lib/war-room/agents";
import { BRAND_COLORS } from "@/lib/brand";

const DWELL_MS = 4600;
const LEVEL_LABEL: Record<AgentLevel, string> = {
  calm: "calm", watching: "watching", elevated: "elevated", alert: "alert",
};

export function AgentWarRoom() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedRef.current) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing || reducedRef.current) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % CASCADE.steps.length), DWELL_MS);
    return () => window.clearTimeout(id);
  }, [index, playing]);

  const step = CASCADE.steps[index]!;
  const states = statesAtStep(index);
  const verdictColor = VERDICT_HEX[step.verdict];
  const counter = `${String(index + 1).padStart(2, "0")} / ${String(CASCADE.steps.length).padStart(2, "0")}`;

  return (
    <div className="surface-card relative overflow-hidden p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl transition-colors duration-700"
        style={{ background: `${verdictColor}1f` }}
      />

      {/* header */}
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <p className="eyebrow flex items-center gap-2" style={{ color: verdictColor }}>
            <span className="live-dot" />
            The council
          </p>
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-300"
            style={{ borderColor: BRAND_COLORS.steelGray }}
          >
            Illustrative
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs tabular-nums text-ink-500">{counter}</span>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause cascade" : "Play cascade"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-white transition-colors hover:bg-white/5 focus-visible:outline-none"
            style={{ borderColor: `${verdictColor}66` }}
          >
            {playing ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden><rect x="1.5" y="1" width="3" height="10" rx="1" /><rect x="7.5" y="1" width="3" height="10" rx="1" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden><path d="M2 1.3v9.4a.6.6 0 0 0 .92.5l7.2-4.7a.6.6 0 0 0 0-1L2.92.8A.6.6 0 0 0 2 1.3Z" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* verdict + narration */}
      <div className="relative mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="shrink-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">{CASCADE.matchup}</p>
          <div
            key={step.verdict}
            className="motion-safe:animate-[gse-step_500ms_ease-out] mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-bold"
            style={{ color: verdictColor, background: `${verdictColor}14`, border: `1px solid ${verdictColor}55` }}
          >
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: verdictColor, boxShadow: `0 0 10px ${verdictColor}` }} />
            {step.verdict}
          </div>
        </div>
        <p key={index} aria-live="polite" className="motion-safe:animate-[gse-step_500ms_ease-out] text-sm leading-relaxed text-ink-200 sm:pt-1">
          <span className="font-semibold text-white">{step.title}.</span> {step.narration}
        </p>
      </div>

      {/* agent council grid */}
      <div className="relative mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AGENTS.map((a) => {
          const st = states[a.key]!;
          const color = LEVEL_HEX[st.level];
          const active = step.changed === a.key;
          return (
            <div
              key={a.key}
              className="surface-lifted relative overflow-hidden p-4 transition-all duration-500"
              style={{ boxShadow: active ? `inset 0 0 0 1px ${color}, 0 0 24px ${color}33` : "none" }}
            >
              {active && (
                <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
              )}
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white">{a.name}</p>
                <span
                  aria-hidden
                  className="mt-0.5 h-2 w-2 shrink-0 rounded-full transition-colors duration-500"
                  style={{ background: color, boxShadow: st.level !== "calm" ? `0 0 8px ${color}` : "none" }}
                />
              </div>
              <p className="mt-1 text-[11px] leading-snug text-ink-500">{a.role}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-medium transition-colors duration-500" style={{ color }}>{st.label}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-600">{LEVEL_LABEL[st.level]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* rail */}
      <div className="relative mt-7 flex gap-2">
        {CASCADE.steps.map((s, i) => {
          const isActive = i === index;
          const isPast = i < index;
          return (
            <button
              key={s.title}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Step ${i + 1}: ${s.title}`}
              aria-current={isActive ? "step" : undefined}
              className="group relative h-1.5 flex-1 overflow-hidden rounded-full focus-visible:outline-none"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <span
                className="absolute inset-0 origin-left rounded-full"
                style={{
                  background: verdictColor,
                  transform: isPast ? "scaleX(1)" : "scaleX(0)",
                  ...(isActive
                    ? {
                        animation: playing && !reducedRef.current ? `gse-fill ${DWELL_MS}ms linear forwards` : "none",
                        transform: playing && !reducedRef.current ? undefined : "scaleX(1)",
                      }
                    : {}),
                }}
              />
              <span className="absolute -inset-y-3 inset-x-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

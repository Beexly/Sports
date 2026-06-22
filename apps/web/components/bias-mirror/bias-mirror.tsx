"use client";

/**
 * BiasMirror — a private decision-behaviour self-reflection.
 *
 * Rate a few honest tendencies; the Mirror returns your profile, the patterns
 * worth watching, your genuine strengths, protective guidance, and a recommended
 * mode. Everything is computed locally from your own inputs — nothing is sent or
 * stored. Calm and protective by design, never shaming. Fully keyboard-operable.
 */

import { useMemo, useState } from "react";
import {
  DIMENSIONS, DEFAULT_ANSWERS, MODE_HEX, computeProfile,
  type BiasKey,
} from "@/lib/bias-mirror/mirror";
import { BRAND_COLORS } from "@/lib/brand";

function riskColor(v: number) {
  return v < 0.4 ? BRAND_COLORS.orbitalCyan : v < 0.7 ? BRAND_COLORS.softUltraviolet : BRAND_COLORS.ionMagenta;
}
function qual(v: number) {
  return v < 0.3 ? "Rarely" : v < 0.6 ? "Sometimes" : v < 0.8 ? "Often" : "Almost always";
}

export function BiasMirror() {
  const [answers, setAnswers] = useState<Record<BiasKey, number>>({ ...DEFAULT_ANSWERS });
  const profile = useMemo(() => computeProfile(answers), [answers]);
  const modeColor = MODE_HEX[profile.mode];

  const set = (key: BiasKey, v: number) => setAnswers((p) => ({ ...p, [key]: v }));
  const reset = () => setAnswers({ ...DEFAULT_ANSWERS });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
      {/* ── The reflection ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Rate yourself honestly</p>
          <button type="button" onClick={reset} className="text-[11px] uppercase tracking-wider text-ink-400 transition-colors hover:text-white focus-visible:outline-none">
            Reset
          </button>
        </div>
        <div className="space-y-4">
          {DIMENSIONS.map((d) => {
            const v = answers[d.key];
            const c = riskColor(v);
            return (
              <div key={d.key} className="surface-card p-4">
                <label htmlFor={`bias-${d.key}`} className="block text-sm text-ink-200">{d.prompt}</label>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    id={`bias-${d.key}`}
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={v}
                    onChange={(e) => set(d.key, Number(e.target.value))}
                    aria-valuetext={qual(v)}
                    className="flex-1"
                    style={{ accentColor: c }}
                  />
                  <span className="w-28 shrink-0 text-right text-xs font-medium" style={{ color: c }}>{qual(v)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── The mirror ── */}
      <div className="space-y-4">
        {/* mode */}
        <div className="surface-card relative overflow-hidden p-6">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full blur-3xl transition-colors duration-500" style={{ background: `${modeColor}1f` }} />
          <div className="relative flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Recommended mode</p>
            <span aria-live="polite" className="rounded-full px-3 py-1 text-sm font-bold transition-colors" style={{ color: modeColor, background: `${modeColor}14`, border: `1px solid ${modeColor}55` }}>
              {profile.mode}
            </span>
          </div>
          <p className="relative mt-3 text-sm leading-relaxed text-ink-200">{profile.modeBlurb}</p>

          {/* dimension profile */}
          <div className="relative mt-5 space-y-2">
            {DIMENSIONS.map((d) => {
              const v = answers[d.key];
              const c = riskColor(v);
              return (
                <div key={d.key} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-[11px] text-ink-400">{d.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.round(v * 100)}%`, background: c }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* patterns to watch */}
        {profile.patterns.length > 0 && (
          <div className="surface-card p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.16em]" style={{ color: BRAND_COLORS.ionMagenta }}>Worth watching</p>
            <ul className="space-y-2.5">
              {profile.patterns.map((p) => (
                <li key={p.key} className="flex gap-2 text-sm leading-relaxed text-ink-200">
                  <span aria-hidden style={{ color: BRAND_COLORS.ionMagenta }}>•</span>
                  <span>{p.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* strengths */}
        {profile.strengths.length > 0 && (
          <div className="surface-card p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.16em]" style={{ color: BRAND_COLORS.orbitalCyan }}>Your strengths</p>
            <ul className="space-y-2.5">
              {profile.strengths.map((s) => (
                <li key={s.key} className="flex gap-2 text-sm leading-relaxed text-ink-300">
                  <span aria-hidden style={{ color: BRAND_COLORS.orbitalCyan }}>✓</span>
                  <span>{s.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* protective guidance */}
        <div className="surface-card p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-ink-500">Protective moves</p>
          <ul className="space-y-2.5">
            {profile.guidance.map((g, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-200">
                <span aria-hidden style={{ color: BRAND_COLORS.softUltraviolet }}>↳</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t pt-3 text-[11px] leading-relaxed text-ink-500" style={{ borderColor: BRAND_COLORS.steelGray }}>
            🔒 Private by design — this reflection is computed on your device from your own
            answers. Nothing is sent, saved, or tied to your account.
          </p>
        </div>
      </div>
    </div>
  );
}

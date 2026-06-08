/**
 * dataviz — a tiny, dependency-light kit of accessible editorial data-viz
 * primitives for the UNIFIED DARK data surfaces (boards, Player Lab, engines).
 *
 * Aesthetic: bold editorial data-viz (The Athletic / FiveThirtyEight) — the
 * number is the hero, the bar is quiet and precise. "Data is the color":
 * vivid grades/bars pop on the dark canvas, chrome stays restrained.
 *
 * These are PURE presentational components: no hooks, no state, no time-of-day
 * or randomness, and NO server-only imports. There is intentionally no
 * "use client" directive so they compose inside BOTH server and client
 * components (the flagship viz files are already "use client").
 *
 * ── ACCESSIBILITY RULE (WCAG AA), non-negotiable ───────────────────────────
 *  • Viz is NEVER color-only. Every bar/chip ALSO renders the underlying number
 *    or a text label, so meaning survives without color.
 *  • Tones are distinguishable by SHAPE/TEXT too, not just hue (SignalChip uses
 *    a leading glyph: ▲ good / ▼ bad / ◆ neutral).
 *  • Pure-graphic elements (the SVG Sparkline) carry role="img" + a descriptive
 *    aria-label; decorative bars are aria-hidden because the number beside them
 *    is the text alternative.
 *  • Text stays AA on dark: only ion-white / ion-1 / ion-2 and emerald-300 /
 *    rose-300 are used for TEXT. emerald-400/500 & rose-400/500 (the brighter
 *    dark fills) are used only for non-text bars/dots (3:1 is enough for
 *    graphics). Bar TRACKS use the dark sunken surface, never a paper tint.
 *
 * Width/scale math is deterministic (Math.min/Math.max only).
 */

import type { ReactNode } from "react";
import type { SignalTone } from "@/lib/intelligence/colors";
import { toneClass } from "@/lib/intelligence/colors";

const EM_DASH = "—";

/** Clamp `value` into [lo, hi]. Pure + deterministic. */
export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

/**
 * Normalize `value` from [lo, hi] into [0, 1], clamped. Degenerate ranges
 * (lo >= hi) collapse to 0 so callers never divide by zero. Pure helper —
 * unit-tested in dataviz.test.ts.
 */
export function normalize(value: number, lo: number, hi: number): number {
  if (hi <= lo) return 0;
  return clamp((value - lo) / (hi - lo), 0, 1);
}

/** Non-text bar FILL class for a tone (>=3:1 graphic contrast on dark). */
function toneFill(tone: SignalTone): string {
  if (tone === "good") return "bg-emerald-500";
  if (tone === "bad") return "bg-rose-500";
  return "bg-data-neutral";
}

// ── 1) ShareBar ───────────────────────────────────────────────────────────
// Compact right-anchored proportional bar for a 0..1 share. The formatted
// number sits on top; a thin bar fills underneath. The number is the text alt.
export function ShareBar({
  value,
  tone = "neutral",
  format,
  widthPx = 56,
}: {
  value: number | null;
  tone?: SignalTone;
  format?: (v: number) => string;
  widthPx?: number;
}): ReactNode {
  if (value == null) {
    return <span className="font-mono tabular-nums text-ion-2">{EM_DASH}</span>;
  }
  const pct = clamp(value, 0, 1) * 100;
  const text = format ? format(value) : `${Math.round(pct)}%`;
  return (
    <span className="inline-flex flex-col items-end" style={{ width: widthPx }}>
      <span className="font-mono tabular-nums text-ion-white leading-tight">{text}</span>
      <span aria-hidden className="mt-0.5 h-1.5 w-full rounded-full bg-surface-sunken">
        <span className={`block h-full rounded-full ${toneFill(tone)}`} style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

// ── 2) PercentileBar ──────────────────────────────────────────────────────
// 0..100 percentile / grade as a track + fill, number to the right. Default
// tone keys off the value (>=67 good, <=33 bad); an explicit tone overrides.
export function PercentileBar({
  pct,
  tone,
  widthPx = 44,
}: {
  pct: number | null;
  tone?: SignalTone;
  widthPx?: number;
}): ReactNode {
  if (pct == null) {
    return <span className="font-mono tabular-nums text-ion-2">{EM_DASH}</span>;
  }
  const v = clamp(pct, 0, 100);
  const fill =
    tone === undefined
      ? v >= 67
        ? "bg-emerald-500"
        : v <= 33
          ? "bg-rose-400"
          : "bg-data-neutral"
      : toneFill(tone);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="h-2 rounded-full bg-surface-sunken overflow-hidden"
        style={{ width: widthPx }}
      >
        <span className={`block h-full rounded-full ${fill}`} style={{ width: `${v}%` }} />
      </span>
      <span className="font-mono tabular-nums text-ion-1 min-w-[2ch] text-right">{Math.round(v)}</span>
    </span>
  );
}

// ── 3) DivergingBar ───────────────────────────────────────────────────────
// Signed value centered at 0. Bar grows RIGHT (emerald) for positive, LEFT
// (rose) for negative; magnitude scaled by `domain`. An explicit `tone`
// overrides the sign→color default (e.g. xFP diff where positive == sell).
export function DivergingBar({
  value,
  domain = 1,
  tone,
  digits = 2,
  widthPx = 56,
}: {
  value: number | null;
  domain?: number;
  tone?: SignalTone;
  digits?: number;
  widthPx?: number;
}): ReactNode {
  if (value == null || value === 0) {
    return (
      <span className="inline-flex items-center gap-1.5" style={{ width: widthPx + 28 }}>
        <span aria-hidden className="relative h-2 rounded-full bg-surface-sunken" style={{ width: widthPx }}>
          <span className="absolute inset-y-0 left-1/2 w-px bg-surface-line" />
        </span>
        <span className="font-mono tabular-nums text-ion-2 min-w-[3ch] text-right">
          {value == null ? EM_DASH : "0"}
        </span>
      </span>
    );
  }
  const safeDomain = domain > 0 ? domain : 1;
  const positive = value > 0;
  const mag = Math.min(Math.abs(value) / safeDomain, 1) * 50; // % of half-width
  const effTone: SignalTone = tone ?? (positive ? "good" : "bad");
  const textClass = toneClass(effTone);
  const sign = positive ? "+" : "−"; // U+2212 minus for legible signed text
  return (
    <span className="inline-flex items-center gap-1.5" style={{ width: widthPx + 28 }}>
      <span aria-hidden className="relative h-2 rounded-full bg-surface-sunken" style={{ width: widthPx }}>
        <span className="absolute inset-y-0 left-1/2 w-px bg-surface-line" />
        <span
          className={`absolute inset-y-0 rounded-full ${toneFill(effTone)}`}
          style={
            positive
              ? { left: "50%", width: `${mag}%` }
              : { right: "50%", width: `${mag}%` }
          }
        />
      </span>
      <span className={`font-mono tabular-nums min-w-[3ch] text-right ${textClass}`}>
        {sign}
        {Math.abs(value).toFixed(digits)}
      </span>
    </span>
  );
}

// ── 4) Sparkline ──────────────────────────────────────────────────────────
// Tiny SVG line + area for a numeric series. Pure graphic → role="img" + the
// REQUIRED aria-label is the text alternative. <2 points returns null so the
// caller can fall back to an honest single-value micro-bar.
export function Sparkline({
  values,
  tone = "neutral",
  widthPx = 64,
  heightPx = 18,
  ariaLabel,
}: {
  values: readonly number[];
  tone?: SignalTone;
  widthPx?: number;
  heightPx?: number;
  ariaLabel: string;
}): ReactNode {
  if (values.length < 2) return null;
  const pad = 2;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const innerW = widthPx - pad * 2;
  const innerH = heightPx - pad * 2;
  const stepX = innerW / (values.length - 1);
  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - normalize(v, lo, hi)) * innerH;
    return { x, y };
  });
  const linePts = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1] ?? { x: pad, y: pad };
  const first = points[0] ?? { x: pad, y: pad };
  const areaPts = `${first.x.toFixed(1)},${(heightPx - pad).toFixed(1)} ${linePts} ${last.x.toFixed(1)},${(heightPx - pad).toFixed(1)}`;
  const stroke = tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-rose-400" : "text-ion-1";
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={widthPx}
      height={heightPx}
      viewBox={`0 0 ${widthPx} ${heightPx}`}
      className={`inline-block align-middle ${stroke}`}
      preserveAspectRatio="none"
    >
      <polygon points={areaPts} fill="currentColor" opacity={0.1} />
      <polyline
        points={linePts}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r={1.6} fill="currentColor" />
    </svg>
  );
}

// ── 5) SignalChip ─────────────────────────────────────────────────────────
// Categorical read as a pill. NOT color-only: a leading direction glyph
// (▲ good / ▼ bad / ◆ neutral) encodes the tone by shape, plus the text label.
export function SignalChip({
  label,
  tone,
  title,
}: {
  label: string;
  tone: SignalTone;
  title?: string;
}): ReactNode {
  const glyph = tone === "good" ? "▲" : tone === "bad" ? "▼" : "◆";
  const pill =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : tone === "bad"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
        : "border-surface-line bg-surface-raised text-ion-2";
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs ${pill}`}
    >
      <span aria-hidden className="text-[0.6rem] leading-none">
        {glyph}
      </span>
      {label}
    </span>
  );
}

// ── 6) MiniLollipop ───────────────────────────────────────────────────────
// Single-value horizontal lollipop (line + dot) for a correlation/lift
// magnitude, with the number. Tiny by design. The number is the text alt.
export function MiniLollipop({
  value,
  domain = 1,
  tone = "neutral",
}: {
  value: number | null;
  domain?: number;
  tone?: SignalTone;
}): ReactNode {
  if (value == null) {
    return <span className="font-mono tabular-nums text-ion-2">{EM_DASH}</span>;
  }
  const safeDomain = domain > 0 ? domain : 1;
  const frac = Math.min(Math.abs(value) / safeDomain, 1) * 100;
  const dotColor = tone === "good" ? "bg-emerald-500" : tone === "bad" ? "bg-rose-500" : "bg-data-neutral";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="relative h-2 w-10 self-center">
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-surface-sunken" />
        <span
          className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${dotColor}`}
          style={{ left: `calc(${frac}% - 4px)` }}
        />
      </span>
      <span className={`font-mono tabular-nums ${toneClass(tone)}`}>{value.toFixed(2)}</span>
    </span>
  );
}

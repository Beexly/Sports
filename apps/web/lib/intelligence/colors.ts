/**
 * Centralized signal -> className helpers for the LIGHT "paper" data surfaces.
 *
 * Every board page (~14 of them) was hand-rolling its own buy-low / sell-high /
 * in-line / agree / diverge / lift / hit-rate color logic, and most of them
 * reached for the dark cosmic accents (text-orbital-cyan / text-plasma /
 * text-ion-2). On a light paper surface those fail contrast and read wrong.
 *
 * This module is the single source of truth. It returns Tailwind classes built
 * from the AA-verified on-light accents and the ink scale:
 *   - positive / "good" signal  -> verify green, darkened for light  (emerald-700)
 *   - negative / "risk" signal  -> alert red, darkened for light     (rose-700)
 *   - neutral / unknown         -> text-ink-1 / text-ink-2 (muted, still AA)
 *
 * No helper here may emit text-ion-2 or text-ion-3 (the dark failing grays).
 * Numeric/semantic helpers are pure so they are trivially unit-testable.
 */

// ── Palette constants (Tailwind utility classes, paper-surface safe) ──────────
// Green / red are chosen to clear WCAG AA (>=4.5:1) on bg-paper (#F7F8FB) and
// bg-paper-sunken (#F0F2F6). emerald-700 (#047857 ~ 4.9:1) and rose-700
// (#BE123C ~ 6.0:1) both pass; we keep `font-semibold` paired in callers.
export const SIGNAL_GOOD_CLASS = "text-emerald-700" as const;
export const SIGNAL_BAD_CLASS = "text-rose-700" as const;
export const SIGNAL_NEUTRAL_CLASS = "text-ink-1" as const;
export const SIGNAL_MUTED_CLASS = "text-ink-2" as const;

// Dark-surface (cosmic) analogs. The paper greens/reds above (emerald-700 /
// rose-700) are darkened for white backgrounds and drop to ~2:1 on eclipse/
// carbon. The semantic tokens `verify` (#5FD9A3) and `alert` (#FF6470) are the
// AA-on-dark pair; neutral falls back to text-ion-1. Row tints use a 10% wash of
// the same tokens instead of the bright bg-emerald-50 / bg-rose-50 pastels,
// which read as glaring bars on a dark table.
export const SIGNAL_GOOD_CLASS_DARK = "text-verify" as const;
export const SIGNAL_BAD_CLASS_DARK = "text-alert" as const;
export const SIGNAL_NEUTRAL_CLASS_DARK = "text-ion-1" as const;

/** Tri-state direction a signal can carry on a data surface. */
export type SignalTone = "good" | "bad" | "neutral";

/** Which data surface a tone renders on. Defaults to the light "paper" surface. */
export type ToneVariant = "paper" | "dark";

/** Map a tone to its surface-safe text class. */
export function toneClass(tone: SignalTone, variant: ToneVariant = "paper"): string {
  if (variant === "dark") {
    switch (tone) {
      case "good":
        return SIGNAL_GOOD_CLASS_DARK;
      case "bad":
        return SIGNAL_BAD_CLASS_DARK;
      default:
        return SIGNAL_NEUTRAL_CLASS_DARK;
    }
  }
  switch (tone) {
    case "good":
      return SIGNAL_GOOD_CLASS;
    case "bad":
      return SIGNAL_BAD_CLASS;
    default:
      return SIGNAL_NEUTRAL_CLASS;
  }
}

/** Subtle row-tint background classes for an accented row (e.g. a top signal). */
export function toneRowClass(tone: SignalTone, variant: ToneVariant = "paper"): string {
  if (variant === "dark") {
    switch (tone) {
      case "good":
        return "bg-verify/10";
      case "bad":
        return "bg-alert/10";
      default:
        return "";
    }
  }
  switch (tone) {
    case "good":
      return "bg-emerald-50";
    case "bad":
      return "bg-rose-50";
    default:
      return "";
  }
}

// ── Buy-low / Sell-high / In-line ─────────────────────────────────────────────
// Used by edge-signals, scoring-zone, opportunity-transfer, dfs, props, etc.
export type BuySellSignal = "buy" | "sell" | "in-line";

export function buySellTone(signal: BuySellSignal): SignalTone {
  if (signal === "buy") return "good";
  if (signal === "sell") return "bad";
  return "neutral";
}

export function buySellClass(signal: BuySellSignal, variant: ToneVariant = "paper"): string {
  return toneClass(buySellTone(signal), variant);
}

export const BUY_SELL_LABEL: Record<BuySellSignal, string> = {
  buy: "Buy-low",
  sell: "Sell-high",
  "in-line": "In-line",
};

// ── Agree / Diverge (consensus between two estimators) ────────────────────────
// qb-forward, engines, metrics. Agreement is a clean read (good); divergence is
// a "second look" — neutral, not bad. We surface disagreement, not punish it.
export type ConsensusSignal = "agree" | "diverge";

/** Classify by an agreement score (0..1) against a threshold (default 0.8). */
export function agreementSignal(agreement: number, threshold = 0.8): ConsensusSignal {
  return agreement >= threshold ? "agree" : "diverge";
}

export function consensusTone(signal: ConsensusSignal): SignalTone {
  return signal === "agree" ? "good" : "neutral";
}

export function consensusClass(signal: ConsensusSignal, variant: ToneVariant = "paper"): string {
  return toneClass(consensusTone(signal), variant);
}

export const CONSENSUS_LABEL: Record<ConsensusSignal, string> = {
  agree: "Agree",
  diverge: "Diverge",
};

// ── Confidence (high / medium / low) ──────────────────────────────────────────
// opportunity-transfer and friends. High = clean signal (good), low = negligible
// (bad / negative call), medium = open-but-unclear (neutral).
export type ConfidenceLevel = "high" | "medium" | "low";

export function confidenceTone(level: ConfidenceLevel): SignalTone {
  if (level === "high") return "good";
  if (level === "low") return "bad";
  return "neutral";
}

export function confidenceClass(level: ConfidenceLevel, variant: ToneVariant = "paper"): string {
  return toneClass(confidenceTone(level), variant);
}

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

// ── Lift over a baseline (signed; does the model beat raw production?) ─────────
// proof / predictiveness. Positive lift past a deadband is good, negative is bad,
// within the band is neutral (no edge proven).
export function liftTone(lift: number | null, deadband = 0.02): SignalTone {
  if (lift == null) return "neutral";
  if (lift > deadband) return "good";
  if (lift < -deadband) return "bad";
  return "neutral";
}

export function liftClass(lift: number | null, deadband = 0.02, variant: ToneVariant = "paper"): string {
  return toneClass(liftTone(lift, deadband), variant);
}

// ── Hit-rate vs the coin flip (0..1) ──────────────────────────────────────────
// proof. Above the upper band = signal (good); below the lower band = noise/worse
// (bad); in between = indistinguishable from 50/50 (neutral).
export function hitRateTone(rate: number | null, upper = 0.55, lower = 0.45): SignalTone {
  if (rate == null) return "neutral";
  if (rate > upper) return "good";
  if (rate < lower) return "bad";
  return "neutral";
}

export function hitRateClass(rate: number | null, upper = 0.55, lower = 0.45, variant: ToneVariant = "paper"): string {
  return toneClass(hitRateTone(rate, upper, lower), variant);
}

// ── Generic signed value (deltas, z-gaps, +/- columns) ────────────────────────
// edge-signals gap, yac+/-, etc. Positive is good, negative is bad, zero neutral.
// `invert` flips the meaning (e.g. a "risk" metric where lower is better).
export function signedTone(value: number | null, invert = false): SignalTone {
  if (value == null || value === 0) return "neutral";
  const positiveIsGood = !invert;
  if (value > 0) return positiveIsGood ? "good" : "bad";
  return positiveIsGood ? "bad" : "good";
}

export function signedClass(value: number | null, invert = false, variant: ToneVariant = "paper"): string {
  return toneClass(signedTone(value, invert), variant);
}

/** Format a number with a leading sign for +/- columns. */
export function formatSigned(value: number | null, digits = 2): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

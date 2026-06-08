/**
 * Centralized signal -> className helpers for the UNIFIED DARK data surfaces.
 *
 * Every board page (~14 of them) was hand-rolling its own buy-low / sell-high /
 * in-line / agree / diverge / lift / hit-rate color logic, and most of them
 * reached for inconsistent accents. This module is the single source of truth.
 *
 * Re-themed from the old LIGHT "paper" scale to the unified dark canvas. It
 * returns Tailwind classes built from the AA-verified dark data palette:
 *   - positive / "good" signal  -> bright AA green text  (emerald-300, ~9:1 on dark)
 *   - negative / "risk" signal  -> bright AA red text    (rose-300,   ~8:1 on dark)
 *   - neutral / unknown         -> ion-1 / ion-2 (muted, still AA on dark)
 *
 * No helper here may emit text-ink / text-ink-1 / text-ink-2 (those were the
 * light-only ink scale). Numeric/semantic helpers are pure so they are
 * trivially unit-testable.
 */

/** GSE Rating tier band — a result-framed read of the 0-100 score. */
export type RatingTierLabel = "Elite" | "High" | "Solid" | "Watch" | "Risk";

/**
 * Classify a GSE Rating (0-100) into its branded tier + display tone. Thresholds:
 * Elite >=85, High 70-84, Solid 55-69, Watch 40-54, Risk <40. Pure + client-safe
 * (no server/node imports) so it composes inside client components.
 */
export function ratingTier(grade: number): { label: RatingTierLabel; tone: SignalTone } {
  if (grade >= 85) return { label: "Elite", tone: "good" };
  if (grade >= 70) return { label: "High", tone: "good" };
  if (grade >= 55) return { label: "Solid", tone: "neutral" };
  if (grade >= 40) return { label: "Watch", tone: "bad" };
  return { label: "Risk", tone: "bad" };
}

// ── Palette constants (Tailwind utility classes, DARK-surface safe) ───────────
// Green / red are chosen to clear WCAG AA (>=4.5:1) on the dark canvas
// (#0D1117) and the raised/sunken surfaces. emerald-300 (#6EE7B7) and
// rose-300 (#FDA4AF) both pass comfortably and pop against dark; we keep
// `font-semibold` paired in callers. ion-1 / ion-2 carry the muted reads.
export const SIGNAL_GOOD_CLASS = "text-emerald-300" as const;
export const SIGNAL_BAD_CLASS = "text-rose-300" as const;
export const SIGNAL_NEUTRAL_CLASS = "text-ion-1" as const;
export const SIGNAL_MUTED_CLASS = "text-ion-2" as const;

/** Tri-state direction a signal can carry on a data surface. */
export type SignalTone = "good" | "bad" | "neutral";

/** Map a tone to its dark-safe AA text class. */
export function toneClass(tone: SignalTone): string {
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
// Dark washes: a faint emerald / rose veil over the surface, never a light
// paper tint. /10 alpha keeps the row legible while flagging the accent.
export function toneRowClass(tone: SignalTone): string {
  switch (tone) {
    case "good":
      return "bg-emerald-500/10";
    case "bad":
      return "bg-rose-500/10";
    default:
      return "";
  }
}

// ── GSE Rating tier (the branded 0-100 score) ─────────────────────────────────
// Dark-AA text + chip classes for the flagship rating. Elite/High read green
// (emerald-300 / -400), Solid stays muted ion-1 (via the neutral tone), Watch
// flags amber-300, Risk reads rose-300. All clear AA on the dark canvas. The
// tier band itself is owned by ratingTier() so thresholds live in one place.
export function ratingTierClass(grade: number): string {
  const { label, tone } = ratingTier(grade);
  switch (label) {
    case "Elite":
      return SIGNAL_GOOD_CLASS; // emerald-300
    case "High":
      return "text-emerald-400";
    case "Watch":
      return "text-amber-300";
    case "Risk":
      return SIGNAL_BAD_CLASS; // rose-300
    default:
      // Solid → the neutral tone (ion-1).
      return toneClass(tone);
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

export function buySellClass(signal: BuySellSignal): string {
  return toneClass(buySellTone(signal));
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

export function consensusClass(signal: ConsensusSignal): string {
  return toneClass(consensusTone(signal));
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

export function confidenceClass(level: ConfidenceLevel): string {
  return toneClass(confidenceTone(level));
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

export function liftClass(lift: number | null, deadband = 0.02): string {
  return toneClass(liftTone(lift, deadband));
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

export function hitRateClass(rate: number | null, upper = 0.55, lower = 0.45): string {
  return toneClass(hitRateTone(rate, upper, lower));
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

export function signedClass(value: number | null, invert = false): string {
  return toneClass(signedTone(value, invert));
}

/** Format a number with a leading sign for +/- columns. */
export function formatSigned(value: number | null, digits = 2): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

/**
 * Pick display analytics — pure formatting utilities.
 *
 * Human-readable summaries and display helpers for picks, CLV grades,
 * confidence tiers, and record displays. Used in pick cards and
 * track-record surfaces.
 *
 * All data must come from loaders — never fabricate values here.
 */

import type { Outcome } from "@/lib/analytics/streak";

/** Confidence tier thresholds (display-only; matches pricing-phases.ts logic) */
const CONFIDENCE_TIERS = [
  { min: 0, max: 57, label: "Signal", color: "text-ink-400" },
  { min: 57, max: 70, label: "Edge", color: "text-blue-400" },
  { min: 70, max: 92, label: "Sharp", color: "text-ultraviolet" },
  { min: 92, max: 101, label: "Apex", color: "text-amber-400" },
] as const;

export type ConfidenceTier = "Signal" | "Edge" | "Sharp" | "Apex";

/**
 * Resolve a confidence score (0–100) to its display tier.
 */
export function confidenceTier(confidence: number): ConfidenceTier {
  for (const tier of CONFIDENCE_TIERS) {
    if (confidence >= tier.min && confidence < tier.max) {
      return tier.label as ConfidenceTier;
    }
  }
  return "Signal";
}

/**
 * CSS color class for a confidence tier.
 */
export function tierColorClass(tier: ConfidenceTier): string {
  return CONFIDENCE_TIERS.find((t) => t.label === tier)?.color ?? "text-ink-400";
}

/**
 * Format a confidence score for display: "74%" not "74.1234%".
 */
export function formatConfidence(confidence: number): string {
  if (!isFinite(confidence)) return "—";
  return `${Math.round(confidence)}%`;
}

/** CLV verdict grade → human label */
const CLV_VERDICT_LABELS: Record<string, string> = {
  BEAT_CLOSE: "Beat Close",
  AT_CLOSE: "At Close",
  MISSED_CLOSE: "Missed Close",
  NO_CLOSE: "No Close",
};

/**
 * Human-readable CLV verdict label.
 */
export function clvVerdictLabel(verdict: string | null | undefined): string {
  if (!verdict) return "Unknown";
  return CLV_VERDICT_LABELS[verdict] ?? verdict;
}

/**
 * Grade a CLV value (closing line value in American odds units).
 * Returns a letter grade for the quality of price capture.
 *
 * @param clvValue CLV in American odds units (positive = beat close)
 */
export function clvGrade(clvValue: number | null): "A" | "B" | "C" | "D" | "F" | null {
  if (clvValue === null || !isFinite(clvValue)) return null;
  if (clvValue >= 5) return "A";
  if (clvValue >= 2) return "B";
  if (clvValue >= -2) return "C";
  if (clvValue >= -5) return "D";
  return "F";
}

/**
 * Short narrative for a CLV grade.
 */
export function clvNarrative(clvValue: number | null): string {
  const grade = clvGrade(clvValue);
  if (grade === null) return "CLV data unavailable";
  const narratives: Record<string, string> = {
    A: "Excellent price capture — well ahead of the closing line",
    B: "Good price — beat the closing line",
    C: "Near the close — price was roughly fair",
    D: "Missed the close — late or mispriced entry",
    F: "Well behind the close — value leaked significantly",
  };
  return narratives[grade] ?? "Unknown";
}

/**
 * Format a win/loss/push outcome for display.
 */
export function outcomeLabel(outcome: Outcome): string {
  switch (outcome) {
    case "win": return "Win";
    case "loss": return "Loss";
    case "push": return "Push";
    case "no-action": return "No Action";
  }
}

/**
 * Color class for an outcome chip.
 */
export function outcomeColorClass(outcome: Outcome): string {
  switch (outcome) {
    case "win": return "text-green-400 bg-green-400/10";
    case "loss": return "text-red-400 bg-red-400/10";
    case "push": return "text-amber-400 bg-amber-400/10";
    case "no-action": return "text-ink-500 bg-ink-500/10";
  }
}

/**
 * Format a win rate for display.
 * 0.567 → "56.7%" with a W-L record appended.
 */
export function formatWinRate(wins: number, losses: number): string {
  const settled = wins + losses;
  if (settled === 0) return "—";
  const rate = (wins / settled) * 100;
  return `${rate.toFixed(1)}% (${wins}-${losses})`;
}

/**
 * Format a W-L-P record string.
 * "12-8-1"
 */
export function formatRecord(wins: number, losses: number, pushes?: number): string {
  if (pushes !== undefined && pushes > 0) return `${wins}-${losses}-${pushes}`;
  return `${wins}-${losses}`;
}

/**
 * Returns a short summary like "Going 3-2 over last 5" or "2-6 over last 8".
 */
export function recentFormSummary(outcomes: readonly Outcome[], window = 10): string {
  const settled = outcomes.filter((o) => o === "win" || o === "loss");
  const recent = settled.slice(-window);
  if (recent.length === 0) return "No recent results";
  const wins = recent.filter((o) => o === "win").length;
  const losses = recent.length - wins;
  const label = recent.length < window ? `last ${recent.length}` : `last ${window}`;
  return `${wins}-${losses} over ${label}`;
}

/**
 * Convert a confidence score to a star rating (1–5 stars).
 * 0–40 → 1, 40–55 → 2, 55–65 → 3, 65–80 → 4, 80–100 → 5
 */
export function confidenceToStars(confidence: number): 1 | 2 | 3 | 4 | 5 {
  if (confidence >= 80) return 5;
  if (confidence >= 65) return 4;
  if (confidence >= 55) return 3;
  if (confidence >= 40) return 2;
  return 1;
}

/**
 * Return a human label for a pick tier/subscription gate.
 */
export function pickTierLabel(tier: string): string {
  switch (tier.toUpperCase()) {
    case "FREE": return "Free";
    case "PRO": return "Pro";
    case "ELITE": return "Elite";
    default: return tier;
  }
}

/**
 * Build a short pick headline: "Chiefs -3.5 vs Chargers (NFL)".
 */
export function pickHeadline(params: {
  pick: string;
  homeTeam?: string;
  awayTeam?: string;
  sport?: string;
}): string {
  const { pick, homeTeam, awayTeam, sport } = params;
  const matchup = homeTeam && awayTeam ? ` — ${awayTeam} @ ${homeTeam}` : "";
  const sportTag = sport ? ` (${sport.toUpperCase()})` : "";
  return `${pick}${matchup}${sportTag}`;
}

/**
 * Format an American odds value for display with a +/- prefix.
 * 150 → "+150", -110 → "-110", 0 → "EV"
 */
export function formatPickOdds(odds: number): string {
  if (!isFinite(odds)) return "—";
  if (odds === 0) return "EV";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

/**
 * Status chip text and color for a pick's lifecycle.
 */
export interface PickStatusDisplay {
  readonly label: string;
  readonly colorClass: string;
}

export function pickStatusDisplay(status: string): PickStatusDisplay {
  switch (status.toUpperCase()) {
    case "PENDING": return { label: "Pending", colorClass: "text-amber-400 bg-amber-400/10" };
    case "WON": return { label: "Won", colorClass: "text-green-400 bg-green-400/10" };
    case "LOST": return { label: "Lost", colorClass: "text-red-400 bg-red-400/10" };
    case "PUSH": return { label: "Push", colorClass: "text-blue-400 bg-blue-400/10" };
    case "CANCELLED": return { label: "Cancelled", colorClass: "text-ink-500 bg-ink-500/10" };
    case "UPCOMING": return { label: "Upcoming", colorClass: "text-purple-400 bg-purple-400/10" };
    default: return { label: status, colorClass: "text-ink-400 bg-ink-400/10" };
  }
}

/**
 * Format a profit/loss value with a sign and $ prefix.
 * +120.50 → "+$120.50", -50 → "-$50.00"
 */
export function formatProfitLoss(value: number, decimals = 2): string {
  if (!isFinite(value)) return "—";
  const abs = Math.abs(value).toFixed(decimals);
  return value >= 0 ? `+$${abs}` : `-$${abs}`;
}

/**
 * Compute ROI string from net profit and total wagered.
 * roi(120, 1000) → "+12.0%"
 */
export function formatRoi(netProfit: number, totalWagered: number): string {
  if (totalWagered === 0 || !isFinite(netProfit)) return "—";
  const pct = (netProfit / totalWagered) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

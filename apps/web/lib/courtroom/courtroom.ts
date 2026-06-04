/**
 * The Signal Courtroom — a structured-argument primitive for every signal.
 *
 * The doctrine made tangible: a signal is not a confidence badge, it is a CASE.
 * The engine must state a claim, marshal evidence FOR it, marshal the
 * counter-evidence AGAINST it, name the falsifiers that would invalidate it, and
 * return a verdict — including the honest verdict of NO-BET. "We grade the
 * thinking, not the scoreboard."
 *
 * This module is the shared shape. The live engine populates `CourtroomBrief`
 * from real estimators/sources; marketing surfaces render illustrative briefs
 * that are explicitly flagged `illustrative: true` so nothing is ever passed off
 * as a live, real-money signal.
 */

export type Verdict = "PLAY" | "WATCHLIST" | "NO-BET" | "FRAGILE EDGE";

export type Weight = "low" | "moderate" | "high";

export type Argument = {
  /** The point being made, in plain language. */
  readonly point: string;
  /** Where it comes from (a referee, a market read, a source class). */
  readonly source: string;
  /** How much it moves the case. */
  readonly weight: Weight;
};

export type RiskFlag = {
  readonly label: string;
  readonly level: "low" | "elevated" | "high";
};

/** Qualitative confidence — never a fabricated track-record percentage. */
export type ConfidenceBand = "Lean" | "Moderate" | "Strong";

export type CourtroomBrief = {
  /** TRUE for marketing/demo briefs — surfaces must label these. */
  readonly illustrative: boolean;
  /** A generic, non-attributed matchup label for illustrative briefs. */
  readonly matchupLabel: string;
  readonly claim: string;
  readonly prosecution: readonly Argument[];
  readonly defense: readonly Argument[];
  readonly falsifiers: readonly string[];
  readonly risks: readonly RiskFlag[];
  readonly verdict: Verdict;
  readonly confidence: ConfidenceBand;
  /** Data-freshness note, e.g. "Inputs current · 11s ago". */
  readonly freshness: string;
  /** The single change that would flip the verdict. */
  readonly whatWouldChange: string;
};

export const VERDICT_META: Record<
  Verdict,
  { tone: "go" | "watch" | "stop" | "fragile"; blurb: string }
> = {
  PLAY: { tone: "go", blurb: "The case survives its own cross-examination." },
  WATCHLIST: { tone: "watch", blurb: "Real edge, but a falsifier is still in play." },
  "NO-BET": { tone: "stop", blurb: "The honest verdict when nothing independent survives." },
  "FRAGILE EDGE": { tone: "fragile", blurb: "Edge exists, but one shock breaks it." },
};

/**
 * An illustrative brief — a methodology demonstration, NOT a live signal.
 * Deliberately abstract: a generic line, no real team or real odds claimed.
 */
export const ILLUSTRATIVE_BRIEF: CourtroomBrief = {
  illustrative: true,
  matchupLabel: "Illustrative matchup · Home −3.5",
  claim: "Home −3.5 carries a measurable edge over the closing price.",
  prosecution: [
    { point: "Two independent estimators land short of the market line and agree on direction.", source: "Consensus engine", weight: "high" },
    { point: "Rest and travel sit in the home side's favour this window.", source: "Schedule model", weight: "moderate" },
    { point: "The number drifted toward the thesis without a public surge behind it.", source: "Line-movement read", weight: "moderate" },
  ],
  defense: [
    { point: "Public exposure on the favourite is heavy — some of the value may already be priced.", source: "Public-pressure read", weight: "moderate" },
    { point: "A single questionable injury status sits upstream of the edge.", source: "Roster-shock agent", weight: "high" },
    { point: "Closing-line history on this matchup type is thin.", source: "Calibration check", weight: "low" },
  ],
  falsifiers: [
    "The questionable status is downgraded to OUT before lock.",
    "The number moves past −4.5 on public action, not new information.",
    "Book consensus breaks against the thesis in the final hour.",
  ],
  risks: [
    { label: "Roster shock", level: "elevated" },
    { label: "Public overexposure", level: "elevated" },
    { label: "Stale-data", level: "low" },
  ],
  verdict: "WATCHLIST",
  confidence: "Moderate",
  freshness: "Inputs current · re-checked 11s ago",
  whatWouldChange: "Confirm the injury status and the edge upgrades to PLAY; downgrade it and the case collapses to NO-BET.",
};

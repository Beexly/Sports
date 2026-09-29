/**
 * The nine families that enter the week-3 edge.
 * narrative_contract cleared both honesty bars on the 2025 holdout
 * (roster-level: n=285, r=+0.112232, slope=+0.051235, se=+0.026966)
 * and gained its week-3 row from the published 2026 roster (STORED -> LIVE).
 * A new grain in one of these families is a duplicate, not a tenth part.
 * Priors are the engine priors. This file does not add one.
 */

export interface LiveEdgePart {
  readonly family:
    | "on_field_efficiency"
    | "scheme_play_design"
    | "availability"
    | "schedule_and_body"
    | "historical_strength"
    | "trench_personnel"
    | "chemistry"
    | "airwave"
    | "narrative_contract";
  readonly grain: string;
  readonly sibling: string | null;
  readonly siblingCap: number | null;
  readonly prior: number;
  readonly reason: string;
}

export const LIVE_EDGE_PARTS: readonly LiveEdgePart[] = [
  {
    family: "on_field_efficiency",
    grain: "week3-split-efficiency.efficiency_signed",
    sibling: "week3-ngs-st-pace.ngs_st_signed",
    siblingCap: 0.15,
    prior: 0.14,
    reason: "Opponent-adjusted blend of pass EPA residual, rush EPA residual, CPOE, explosive-pass rate, and interception luck. A second CPOE is the same family.",
  },
  {
    family: "scheme_play_design",
    grain: "charted motion, play-action, RPO, and shotgun rates",
    sibling: "week3-drive-start.helper_signed",
    siblingCap: 0.15,
    prior: 0.12,
    reason: "Drive-start field position is the helper. It is not the MOVE-37 sin formula.",
  },
  {
    family: "availability",
    grain: "injury-report out list",
    sibling: null,
    siblingCap: null,
    prior: 0.12,
    reason: "Outs are availability. Questionable skill players are airwave.",
  },
  {
    family: "schedule_and_body",
    grain: "games.rest_diff",
    sibling: null,
    siblingCap: null,
    prior: 0.08,
    reason: "Rest days. 2024-2025 margin slope +0.4108, se 0.2535, n=544.",
  },
  {
    family: "historical_strength",
    grain: "elo probability on game_id",
    sibling: null,
    siblingCap: null,
    prior: 0.08,
    reason: "One strength premise.",
  },
  {
    family: "trench_personnel",
    grain: "qb_hit per dropback",
    sibling: null,
    siblingCap: null,
    prior: 0.05,
    reason: "2025 walk-forward r=0.241 on 250 games. Tackle-out drag is not a second trench part.",
  },
  {
    family: "chemistry",
    grain: "quarterback this week versus the weeks 1-2 snap leader",
    sibling: null,
    siblingCap: null,
    prior: 0.04,
    reason: "A different quarterback is a disruption. The same quarterback is zero, and zero is still the part.",
  },
  {
    family: "airwave",
    grain: "questionable and doubtful skill wire",
    sibling: null,
    siblingCap: null,
    prior: 0.05,
    reason: "SiriusXM audio is not this row.",
  },
  {
    family: "narrative_contract",
    grain: "mean roster APY gap, BUF minus LAC",
    sibling: null,
    siblingCap: null,
    prior: 0.03,
    reason: "2025 walk-forward cleared both honesty bars (n=285, r=+0.112232, slope=+0.051235, se=+0.026966). Week-3 row from the published 2026 roster.",
  },
];

/** LAC at BUF parts from week3-engine-readings.jsonl. Home-positive. They sum to the edge. */
export const LAC_BUF_EDGE = 0.30384082052641725;

export const LAC_BUF_PARTS: readonly { family: LiveEdgePart["family"]; signed: number; points: number }[] = [
  { family: "on_field_efficiency", signed: 1, points: 0.14 },
  { family: "scheme_play_design", signed: 0.033708224093976474, points: 0.004044986891277177 },
  { family: "availability", signed: 0.6666666666666666, points: 0.07999999999999999 },
  { family: "schedule_and_body", signed: 0.08802857142857143, points: 0.0070422857142857145 },
  { family: "historical_strength", signed: 0.5560780554178324, points: 0.044486244433426594 },
  { family: "trench_personnel", signed: 0.7486746146729814, points: 0.03743373073364907 },
  { family: "chemistry", signed: 0, points: 0 },
  { family: "airwave", signed: -0.2083, points: -0.010415 },
  { family: "narrative_contract", signed: 0.04161909179262402, points: 0.0012485727537787205 },
];

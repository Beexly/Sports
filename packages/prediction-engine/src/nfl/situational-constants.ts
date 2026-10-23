/**
 * SITUATIONAL CONSTANT REGISTRY — what survived measurement, what died, and the
 * weight the build may use.
 *
 * Two nights, 36 preregistered cycles, 2026-10-22/23. Every entry names the
 * evidence. Read this before adding a situational term; most of the obvious ones
 * are already here with a verdict and a reason.
 *
 * Rule: `weight: 0` means KEEP THE CODE PATH, ZERO THE COEFFICIENT. Nothing is
 * deleted on a null, because a null under one outcome is not proof under another
 * (the OL family needed four outcomes before it was closed).
 */

export type ConstantVerdict = "FITTED" | "REVERSED" | "REFUTED" | "PARKED" | "PARTIAL";

export interface SituationalConstant {
  readonly key: string;
  readonly verdict: ConstantVerdict;
  /** Multiplier the engine may apply. 0 = documented but inert. */
  readonly weight: number;
  /** One-line evidence with n and statistic. */
  readonly evidence: string;
  /** Cycle id in the nfl-farm ledger. */
  readonly cycle: string;
}

export const SITUATIONAL_CONSTANTS: readonly SituationalConstant[] = [
  {
    key: "kneeldown_haircut",
    verdict: "FITTED",
    weight: 1,
    evidence:
      "-1.059 yd mean mass (sd .498) over n=1,694 kicks; apply via P(victory formation), not a flat -2.5. Aggregate -2.27/game follows from a 2.03 rate.",
    cycle: "c1",
  },
  {
    key: "market_fair_prob_ranking",
    verdict: "FITTED",
    weight: 1,
    evidence:
      "Beats confidence on ranking (+.1845 CI .1408-.2280 vs -.0171), ECE (.0202 vs .1079) and Brier (.2364 vs .2744) over n=1,697.",
    cycle: "c15",
  },
  {
    key: "confidence_move_risk",
    verdict: "FITTED",
    weight: 1,
    evidence:
      "Confidence predicts beating the close (+.1528; tercile 40.2%->53.9%) while contributing nothing to Brier. Tag, do not rank or blend.",
    cycle: "c23/c25",
  },
  {
    key: "sgp_qb_wr_dependence",
    verdict: "FITTED",
    weight: 1,
    evidence: "Kendall tau +.385 (CI .359-.408), Clayton theta .788, n=2,009. TE same sign (+.307, n=73).",
    cycle: "c9/c10",
  },
  {
    key: "sgp_qb_rb_dependence",
    verdict: "REFUTED",
    weight: 0,
    evidence: "QB pass x RB rush is flat/substitutive: joint .221 vs .231 independence, lambda_U -.020 (p=.084).",
    cycle: "c9",
  },
  {
    key: "copula_family_branch",
    verdict: "REFUTED",
    weight: 0,
    evidence:
      "No family wins on holdout PIT (KS .024 vs .027, .035 vs .0348); theta is stable out-of-sample (.81/.84). One positive copula, no branching.",
    cycle: "c11",
  },
  {
    key: "fourth_down_aggression",
    verdict: "FITTED",
    weight: 1,
    evidence:
      "GO +.1113 wp vs FG -.0837 (n=706/295, 19.5-point gap); staff go-rate spans .51-.94. Punt branch is 17 plays, quote the FG comparison.",
    cycle: "c29",
  },
  {
    key: "pressure_timing_weight",
    verdict: "FITTED",
    weight: 1,
    evidence:
      "Sub-2s pressure converts 15.8% vs 10.1% at 2.5-2.9s (p=.043, n=3,644). Weight pressure by arrival time; flat counting understates fast fronts.",
    cycle: "c35",
  },
  {
    key: "safety_out_explosive",
    verdict: "REVERSED",
    weight: 0.5,
    evidence:
      "Safety out CUTS explosives 18.2%->15.6% (p=.033, 109 defence-games) — deeper shells. Reversed sign, low weight, no CB counterpart (p=.70).",
    cycle: "c27",
  },
  {
    key: "interior_ol_penalty",
    verdict: "REFUTED",
    weight: 0,
    evidence:
      "Dead on points across four controls (+.23/+1.00/+1.72, none significant) AND at the mechanism: pressure 10.37%->10.41% (p=.86), graded load p=.094.",
    cycle: "c16/c17/c18/c21/c22",
  },
  {
    key: "mutual_ilb_cb_override",
    verdict: "PARKED",
    weight: 0.25,
    evidence:
      "The 2-ILB + CB1 + calm trigger fires ~once a season: 1 of 576 team-weeks had two ILBs out, 0 of 272 games qualified. Keep as a small nudge, never a gate.",
    cycle: "c7",
  },
  {
    key: "red_zone_stall_prior",
    verdict: "REFUTED",
    weight: 0,
    evidence:
      "RZ TD% has no year-over-year carryover (off .081 / def -.047), index p=.83, James-Stein lambda 0. Current-season and heavily shrunk only.",
    cycle: "c4",
  },
  {
    key: "scheme_fingerprint",
    verdict: "REFUTED",
    weight: 0,
    evidence:
      "Menu alignment has no forward value (partial rho .032, p=.81); the defence's own baseline separation (.408) dominates it.",
    cycle: "c3",
  },
  {
    key: "nickel_suppression",
    verdict: "REFUTED",
    weight: 0,
    evidence:
      "A slot corner on the field RAISES slot target share +6.18 pp (p=1.8e-10) via personnel matching; per-target separation is null (+.127, p=.28).",
    cycle: "c12/c6",
  },
  {
    key: "te_funnel_on_ilb_loss",
    verdict: "REFUTED",
    weight: 0,
    evidence: "TE target share +0.18 pp, p=.863 across 1,637 affected plays.",
    cycle: "c12",
  },
  {
    key: "rookie_bocpd_breakpoint",
    verdict: "REFUTED",
    weight: 0,
    evidence:
      "A per-player breakpoint beats its own null only 27.4% of the time and early share predicts later gain at r=-.054. Pool a position curve, predict level not delta.",
    cycle: "c13",
  },
  {
    key: "wind_axis_term",
    verdict: "REFUTED",
    weight: 0,
    evidence:
      "Along-axis wind looked real on grid data (p=.0096) and died on station data (p=.475); airport ASOS also mis-measures. Keep the distance-only surface.",
    cycle: "c31/c32/c33/c34",
  },
  {
    key: "offensive_crew_bias",
    verdict: "PARKED",
    weight: 0,
    evidence:
      "6x apparent DPI spread is noise: chi-square p=.50, split-half r=-.186. Needs 2023+ penalties and a game-id bridge before it can be tested.",
    cycle: "c30",
  },
  {
    key: "cross_book_dispersion",
    verdict: "REFUTED",
    weight: 0,
    evidence:
      "Books agree (mean spread 0.90 pt, median 0.0), so dispersion is not an uncertainty measure and shopping is worth under a point. Habit, not a gate.",
    cycle: "c28",
  },
  {
    key: "steam_following",
    verdict: "REFUTED",
    weight: 0,
    evidence:
      "Movement carries no directional information (r=.005, p=.948, n=193). Publish-early survives on timing alone; there is nothing to fade.",
    cycle: "c26",
  },
];

export function constantWeight(key: string): number {
  return SITUATIONAL_CONSTANTS.find((c) => c.key === key)?.weight ?? 0;
}

/** Weights at or above this are allowed to move a projection materially. */
export const MATERIAL_WEIGHT = 0.75;

export function isMaterial(key: string): boolean {
  return constantWeight(key) >= MATERIAL_WEIGHT;
}

/** Counts by verdict, for the metrics endpoint. */
export function verdictCensus(): Readonly<Record<ConstantVerdict, number>> {
  const out: Record<ConstantVerdict, number> = { FITTED: 0, REVERSED: 0, REFUTED: 0, PARKED: 0, PARTIAL: 0 };
  for (const c of SITUATIONAL_CONSTANTS) out[c.verdict] += 1;
  return out;
}

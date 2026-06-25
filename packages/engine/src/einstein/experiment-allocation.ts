/**
 * EINSTEIN LAYER — Experiment Allocation Engine (Invention 21).
 *
 * Backtesting asks "did this work historically?" Experiment design asks "what is the cheapest next
 * observation that would most reduce uncertainty?" This ranks research experiments by expected
 * information gain per unit cost/risk, gated by source rights and the decision they unlock — so
 * research capital flows to where it buys the most knowledge, not where it is most fun.
 *
 * Pure + deterministic. The default catalogue encodes the experiments named in the directive.
 */

export interface ExperimentSpec {
  readonly id: string;
  readonly hypothesis: string;
  readonly dataRequired: string;
  readonly expectedFalsifier: string;
  readonly minimumSample: number;
  /** Estimated Odds-API (or other) credit cost; 0 if free. */
  readonly estimatedCreditCost: number;
  readonly runtimeMin: number;
  /** Source-rights status: "cleared" | "needs_review" | "blocked". */
  readonly sourceRights: "cleared" | "needs_review" | "blocked";
  readonly gateUnlocked: string;
  /** 0..1 expected information gain (how much it reduces uncertainty about a decision). */
  readonly expectedInfoGain: number;
  readonly risk: number; // 0..1
}

export interface RankedExperiment extends ExperimentSpec {
  readonly score: number;
  readonly rationale: string;
}

/** The catalogue of candidate experiments (the directive's list). */
export const DEFAULT_EXPERIMENTS: readonly ExperimentSpec[] = [
  { id: "dense_nfl_week", hypothesis: "Book-DNA lead/lag and absorption half-lives are measurable across one dense NFL week", dataRequired: "15-20m timestamped snapshots, final 6h, one slate", expectedFalsifier: "no consistent lead/lag structure across books", minimumSample: 200, estimatedCreditCost: 4000, runtimeMin: 30, sourceRights: "cleared", gateUnlocked: "book-DNA lag map", expectedInfoGain: 0.9, risk: 0.2 },
  { id: "injury_shock_replay", hypothesis: "Derivative props lag a confirmed injury shock by a measurable window", dataRequired: "shock timelines + per-market snapshots around 20 injuries", expectedFalsifier: "derivatives absorb as fast as sides", minimumSample: 20, estimatedCreditCost: 2500, runtimeMin: 25, sourceRights: "needs_review", gateUnlocked: "shock absorption half-life by family", expectedInfoGain: 0.85, risk: 0.4 },
  { id: "alt_ladder_curvature", hypothesis: "Alt ladders carry mispriced tails vs their own/consensus geometry", dataRequired: "historical event-odds alt ladders for one prop family", expectedFalsifier: "ladders are coherent within liquidity noise", minimumSample: 150, estimatedCreditCost: 3000, runtimeMin: 20, sourceRights: "cleared", gateUnlocked: "alt-line geometry breakpoints", expectedInfoGain: 0.7, risk: 0.3 },
  { id: "dfs_salary_mismatch", hypothesis: "DFS salary expectation diverges from prop-implied role for some players", dataRequired: "DFS salaries + prop lines for one slate", expectedFalsifier: "DFS and props imply the same role", minimumSample: 100, estimatedCreditCost: 500, runtimeMin: 15, sourceRights: "needs_review", gateUnlocked: "cross-surface role conservation", expectedInfoGain: 0.55, risk: 0.5 },
  { id: "fantasy_addrop_velocity", hypothesis: "Fantasy add/drop velocity leads prop role re-pricing after shocks", dataRequired: "Sleeper trending + prop snapshots", expectedFalsifier: "no lead relationship", minimumSample: 80, estimatedCreditCost: 200, runtimeMin: 15, sourceRights: "needs_review", gateUnlocked: "attention-state lead signal", expectedInfoGain: 0.4, risk: 0.6 },
  { id: "false_rumor_quarantine_audit", hypothesis: "Quarantining unconfirmed rumors avoids correction-driven losses", dataRequired: "rumor timelines + correction events", expectedFalsifier: "rumors are usually true and quarantine costs edge", minimumSample: 30, estimatedCreditCost: 0, runtimeMin: 10, sourceRights: "cleared", gateUnlocked: "rumor-quarantine policy validation", expectedInfoGain: 0.5, risk: 0.2 },
];

/**
 * Rank experiments by expected information gain per unit (cost + runtime + risk), with a hard
 * penalty for blocked rights. Returns the catalogue sorted best-first.
 */
export function rankExperiments(specs: readonly ExperimentSpec[] = DEFAULT_EXPERIMENTS): RankedExperiment[] {
  return specs
    .map((s) => {
      const rightsPenalty = s.sourceRights === "blocked" ? 0 : s.sourceRights === "needs_review" ? 0.7 : 1;
      // Normalize cost to a 0..1-ish scale (credits + runtime), avoid divide-by-zero.
      const costUnit = 1 + s.estimatedCreditCost / 4000 + s.runtimeMin / 60;
      const score = (s.expectedInfoGain * rightsPenalty * (1 - 0.5 * s.risk)) / costUnit;
      return {
        ...s,
        score,
        rationale: `infoGain ${s.expectedInfoGain} × rights ${rightsPenalty} × (1-½·risk ${s.risk}) ÷ cost ${costUnit.toFixed(2)} = ${score.toFixed(3)}`,
      };
    })
    .sort((a, b) => b.score - a.score);
}

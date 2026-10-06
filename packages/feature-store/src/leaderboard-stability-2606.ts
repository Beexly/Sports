/**
 * Pluralistic-leaderboard stability audit for the weekly pick sheet
 *
 * Research port: arXiv:2606.02547
 * Normalized lane: team_ratings | Doctrine: PROPRIETARY_EDGE
 *
 * Pure port of the paper's stability audit: games are grouped into
 * matchup-context clusters (cluster labels supplied by the operator), the
 * weekly pick sheet is ranked by the engine, and for each top-k prefix the
 * audit computes gamma-hat — the maximum over clusters of the cluster's
 * realized pick profitability minus the prefix's overall profitability. A
 * gamma-hat > 1 means a cohesive game-type subgroup systematically preferred
 * the excluded picks, i.e. the sheet is unstable for that subgroup. Standing
 * weekly check adoption follows the paper's >=15%-of-weeks rule.
 *
 * ACCEPTANCE GATE: Adopt the stability audit as a standing weekly check if
 * the backtest finds gamma-hat > 1 violations in >= 15% of weeks at any
 * k <= 5 (2022-2024).
 */

export interface RankedPick {
  /** matchup-context cluster label, e.g. "divisional-home-dog" */
  cluster: string;
  /** realized profit of the pick in units */
  profit: number;
}

export interface GammaHatResult {
  k: number;
  gammaHat: number;
  /** cluster attaining the maximum */
  cluster: string;
  violated: boolean;
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, v) => s + v, 0) / xs.length;
}

/**
 * gamma-hat for one top-k prefix: max over clusters of
 * (cluster mean profit within prefix) - (prefix mean profit).
 * Picks must be pre-sorted by sheet rank (best first).
 */
export function gammaHat(picks: RankedPick[], k: number): GammaHatResult {
  const prefix = picks.slice(0, Math.max(0, k));
  if (prefix.length === 0) return { k, gammaHat: 0, cluster: "", violated: false };
  const overall = mean(prefix.map((p) => p.profit));
  const byCluster = new Map<string, number[]>();
  for (const p of prefix) {
    const list = byCluster.get(p.cluster);
    if (list) list.push(p.profit);
    else byCluster.set(p.cluster, [p.profit]);
  }
  let gamma = 0;
  let cluster = "";
  for (const [c, profits] of byCluster) {
    const excess = mean(profits) - overall;
    if (excess > gamma) {
      gamma = excess;
      cluster = c;
    }
  }
  return { k, gammaHat: gamma, cluster, violated: gamma > 1 };
}

export interface WeeklyAudit {
  week: string;
  /** per-k gamma-hat for k = 1..5 */
  byK: GammaHatResult[];
  /** violation at any k <= 5 */
  violated: boolean;
}

/** Audit one week across k = 1..5. */
export function auditWeek(week: string, picks: RankedPick[]): WeeklyAudit {
  const byK = [1, 2, 3, 4, 5].map((k) => gammaHat(picks, k));
  return { week, byK, violated: byK.some((r) => r.violated) };
}

export interface StabilityAdopt {
  weeks: number;
  violations: number;
  violationShare: number;
  adopt: boolean;
}

/** Standing-check rule: adopt if >=15% of backtest weeks violate. */
export function stabilityAuditAdopt(audits: WeeklyAudit[]): StabilityAdopt {
  const violations = audits.filter((a) => a.violated).length;
  const share = audits.length === 0 ? 0 : violations / audits.length;
  return { weeks: audits.length, violations, violationShare: share, adopt: share >= 0.15 };
}

export const GSE_LEADERBOARD_STABILITY_ENABLED = false;

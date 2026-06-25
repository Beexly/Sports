/**
 * DISCOVERY LAYER — Sensor Placement Engine (Invention 38).
 *
 * Decides which feed, snapshot cadence, market family, or historical replay would most improve the
 * Discovery Layer — the data-acquisition analogue of optimal sensor placement. It ranks candidate
 * "sensors" by the discovery improvement they buy per unit cost + rights risk, given the current
 * knowledge gaps. Pure + deterministic.
 */

export interface SensorCandidate {
  readonly id: string;
  readonly description: string;
  /** Which knowledge gap this sensor would fill. */
  readonly targetGap: string;
  /** 0..1 expected improvement to discovery capability if added. */
  readonly expectedDiscoveryImprovement: number;
  readonly cost: number; // normalized
  readonly rightsRisk: number;
  readonly cadence?: string;
  readonly marketFamily?: string;
}

export interface SensorRecommendation extends SensorCandidate {
  readonly score: number;
  readonly rationale: string;
}

/** Rank candidate sensors by expected discovery improvement per unit cost/rights, best-first. */
export function recommendSensors(candidates: readonly SensorCandidate[], openGaps: readonly string[] = []): SensorRecommendation[] {
  const gapSet = new Set(openGaps);
  return candidates
    .map((c) => {
      const gapBonus = gapSet.size === 0 || gapSet.has(c.targetGap) ? 1 : 0.5;
      const score = (c.expectedDiscoveryImprovement * gapBonus) / (1 + c.cost + c.rightsRisk);
      return { ...c, score: Number(score.toFixed(4)), rationale: `improvement ${c.expectedDiscoveryImprovement} × gap ${gapBonus} ÷ (1+cost ${c.cost}+rights ${c.rightsRisk})` };
    })
    .sort((a, b) => b.score - a.score);
}

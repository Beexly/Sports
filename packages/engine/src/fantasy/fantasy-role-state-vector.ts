/**
 * FANTASY DISCOVERY LAYER — Fantasy Role State Vector (Invention F16).
 *
 * A player is not a name and not a box score — a player is a ROLE STATE. Two players with the same
 * fantasy points can have opposite futures: 24 points on bad role quality is a sell; 6 points on
 * elite role quality is a buy. This types the role and scores its QUALITY (opportunity that
 * actually creates fantasy value), then detects role-vs-production divergence — the silent-breakout
 * / box-score-fraud signal that the crowd reads backwards. Pure + deterministic.
 */

export type FantasyPosition = "QB" | "RB" | "WR" | "TE";

export interface FantasyRoleStateVector {
  readonly snapProbability: number;      // 0..1
  readonly routeRate: number;            // 0..1 (routes / dropbacks)
  readonly targetShare: number;          // 0..1
  readonly airYardShare: number;         // 0..1
  readonly carryShare: number;           // 0..1
  readonly highValueTouchShare: number;  // 0..1 (RZ + goal-line + 3rd-down + first-read)
  readonly redZoneShare: number;         // 0..1
  readonly goalLineShare: number;        // 0..1
  readonly twoMinuteRole: number;        // 0..1
  readonly thirdDownRole: number;        // 0..1
  readonly passBlockRisk: number;        // 0..1 (higher = more snaps lost to blocking)
  readonly explosiveTail: number;        // 0..1 (ceiling / big-play propensity)
  readonly gameScriptElasticity: number; // 0..1 (role holds across scripts)
  readonly injuryFragility: number;      // 0..1
  readonly coachingTrust: number;        // 0..1
  readonly teammateDependency: number;   // 0..1 (value depends on a fragile teammate state)
  readonly replacementPressure: number;  // 0..1 (someone is pushing for the role)
  readonly marketAttention: number;      // 0..1 (how much the fantasy crowd is watching)
}

// Position-specific weighting of what creates fantasy value (each row sums to 1).
const WEIGHTS: Record<FantasyPosition, Partial<Record<keyof FantasyRoleStateVector, number>>> = {
  QB: { snapProbability: 0.25, twoMinuteRole: 0.1, explosiveTail: 0.2, gameScriptElasticity: 0.2, coachingTrust: 0.15, carryShare: 0.1 },
  RB: { carryShare: 0.2, highValueTouchShare: 0.2, goalLineShare: 0.2, thirdDownRole: 0.15, routeRate: 0.1, snapProbability: 0.15 },
  WR: { targetShare: 0.28, routeRate: 0.18, airYardShare: 0.18, redZoneShare: 0.16, explosiveTail: 0.1, snapProbability: 0.1 },
  TE: { targetShare: 0.3, routeRate: 0.22, redZoneShare: 0.22, snapProbability: 0.13, explosiveTail: 0.13 },
};

// Realistic per-field ceilings so a "share" (target share tops ~0.32) and a "rate" (route rate ~1)
// are normalized to comparable 0..1 eliteness before weighting.
const CEILINGS: Partial<Record<keyof FantasyRoleStateVector, number>> = {
  snapProbability: 1, routeRate: 1, targetShare: 0.32, airYardShare: 0.45, carryShare: 0.75,
  highValueTouchShare: 0.5, redZoneShare: 0.4, goalLineShare: 0.6, twoMinuteRole: 1, thirdDownRole: 1,
  explosiveTail: 1, gameScriptElasticity: 1, coachingTrust: 1,
};

export type RoleTier = "feature" | "starter" | "rotational" | "fringe" | "decoy";

export interface RoleQuality {
  readonly index: number; // 0..1 weighted opportunity quality
  readonly tier: RoleTier;
  readonly note: string;
}

/** Score the value-creating quality of a role (NOT the points it produced). */
export function roleQualityIndex(v: FantasyRoleStateVector, position: FantasyPosition): RoleQuality {
  const w = WEIGHTS[position];
  let raw = 0;
  for (const [k, weight] of Object.entries(w)) {
    const key = k as keyof FantasyRoleStateVector;
    const norm = Math.min(1, v[key] / (CEILINGS[key] ?? 1));
    raw += norm * (weight as number);
  }
  // Penalties that suppress value regardless of opportunity.
  let index = raw * (1 - 0.3 * v.passBlockRisk) * (1 - 0.25 * v.injuryFragility);
  index = Math.max(0, Math.min(1, index));
  const tier: RoleTier =
    index >= 0.7 ? "feature" : index >= 0.5 ? "starter" : index >= 0.32 ? "rotational" : index >= 0.15 ? "fringe" : "decoy";
  return { index: Number(index.toFixed(4)), tier, note: `Role quality ${index.toFixed(2)} → ${tier} (${position}).` };
}

export type RoleProductionSignal = "silent_breakout" | "box_score_fraud" | "aligned" | "neutral";

export interface RoleProductionDivergence {
  readonly divergence: number; // roleQuality − normalizedProduction, [-1,1]
  readonly signal: RoleProductionSignal;
  readonly note: string;
}

/**
 * Compare role quality to realized fantasy production (both normalized 0..1). High role + low
 * production = silent breakout (buy before the points arrive). Low role + high production =
 * box-score fraud (sell before the crowd's hype fades).
 */
export function roleVsProduction(roleQuality: number, normalizedProduction: number, opts: { threshold?: number } = {}): RoleProductionDivergence {
  const t = opts.threshold ?? 0.25;
  const divergence = Number((roleQuality - normalizedProduction).toFixed(4));
  const signal: RoleProductionSignal =
    divergence >= t ? "silent_breakout" : divergence <= -t ? "box_score_fraud" : Math.abs(divergence) < 0.1 ? "aligned" : "neutral";
  return {
    divergence,
    signal,
    note:
      signal === "silent_breakout" ? "Role quality outruns production — candidate buy before the points arrive."
      : signal === "box_score_fraud" ? "Production outruns role quality — likely TD/variance fraud; sell-high candidate."
      : signal === "aligned" ? "Role and production agree — fairly valued."
      : "Mild role/production gap — monitor.",
  };
}

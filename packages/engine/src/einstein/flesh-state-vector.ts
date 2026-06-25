/**
 * EINSTEIN LAYER — Flesh State Vector (Invention 16).
 *
 * Sportsbooks do not price players; they price expected ROLE DISTRIBUTIONS. This is the typed
 * latent state of a player's role reality — usage, health, trust, script elasticity, replacement
 * pressure, attention — used by Shock Calculus and the Conservation Law Engine. It is NOT a
 * projection model; it is a state representation. The edge claim it enables is not "over 48.5"
 * but "the book still prices Role State 2 while reality has transitioned to Role State 4, and
 * sibling markets confirm only partial absorption."
 *
 * Pure + deterministic. Fixtures only; no live ingestion here.
 */

export interface FleshStateVector {
  readonly player: string;
  readonly team: string;
  readonly position: "QB" | "RB" | "WR" | "TE";
  /** All shares/rates in [0,1]. */
  readonly snapProbability: number;
  readonly routeProbability: number;
  readonly targetEarningRate: number;
  readonly carryShare: number;
  readonly redZoneShare: number;
  /** Probability mass in the explosive/ceiling tail [0,1]. */
  readonly explosiveTail: number;
  /** How much the role swings with game script [0,1]. */
  readonly gameScriptElasticity: number;
  /** Injury fragility [0,1] (higher = more fragile). */
  readonly injuryFragility: number;
  /** Coaching trust [0,1]. */
  readonly coachingTrust: number;
  /** Pressure from a backup/committee [0,1] (higher = more replaceable). */
  readonly replacementPressure: number;
  readonly publicAttention: number;
}

/** Position-appropriate usage weighting → a 0..1 role magnitude. */
function roleMagnitude(v: FleshStateVector): number {
  const w =
    v.position === "RB"
      ? 0.4 * v.carryShare + 0.2 * v.targetEarningRate + 0.2 * v.snapProbability + 0.2 * v.redZoneShare
      : v.position === "QB"
        ? 0.6 * v.snapProbability + 0.4 * v.coachingTrust
        : 0.4 * v.routeProbability + 0.4 * v.targetEarningRate + 0.2 * v.redZoneShare; // WR/TE
  return Math.max(0, Math.min(1, w));
}

/** Discretize the role into a 1 (fringe) → 5 (alpha) state level. */
export function roleStateLevel(v: FleshStateVector): number {
  return Math.max(1, Math.min(5, Math.ceil(roleMagnitude(v) * 5)));
}

export interface FleshStateDelta {
  readonly player: string;
  readonly fromLevel: number;
  readonly toLevel: number;
  readonly transitioned: boolean;
  /** Per-dimension deltas (after − before). */
  readonly deltas: Readonly<Record<string, number>>;
  /** The dimensions that moved most, ranked. */
  readonly drivers: ReadonlyArray<{ field: string; delta: number }>;
  /** Composite magnitude 0..1. */
  readonly magnitude: number;
}

const NUMERIC_FIELDS: Array<keyof FleshStateVector> = [
  "snapProbability", "routeProbability", "targetEarningRate", "carryShare", "redZoneShare",
  "explosiveTail", "gameScriptElasticity", "injuryFragility", "coachingTrust", "replacementPressure", "publicAttention",
];

/**
 * Compute the role-state transition between two flesh-state snapshots of the same player. A
 * transition is detected when the discretized role level changes; `drivers` ranks the usage
 * dimensions that moved most. This is the object the market may not have re-priced yet.
 */
export function fleshStateDelta(before: FleshStateVector, after: FleshStateVector): FleshStateDelta {
  const deltas: Record<string, number> = {};
  for (const f of NUMERIC_FIELDS) deltas[f] = (after[f] as number) - (before[f] as number);
  const fromLevel = roleStateLevel(before);
  const toLevel = roleStateLevel(after);
  const drivers = Object.entries(deltas)
    .map(([field, delta]) => ({ field, delta }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);
  const magnitude = Math.min(1, Math.abs(roleMagnitude(after) - roleMagnitude(before)) + Math.abs(toLevel - fromLevel) / 5);
  return { player: after.player, fromLevel, toLevel, transitioned: toLevel !== fromLevel, deltas, drivers, magnitude };
}

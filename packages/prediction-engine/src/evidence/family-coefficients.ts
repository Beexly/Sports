/**
 * Situational family coefficient registry.
 *
 * Every coefficient that can move a probability is declared here with its
 * provenance. `HAND_SET` means a human chose the number and it has not been
 * fitted on history; such a family runs in shadow with weight zero. `FITTED`
 * means it was estimated on a purged, embargoed split and carries a weight.
 *
 * There are no FITTED coefficients yet. That is the honest state of the engine,
 * and it is why tonight's posterior equals the market prior.
 */

export type CoefficientProvenance = "HAND_SET" | "FITTED";

export interface FamilyCoefficient {
  readonly family: string;
  /** Multiplier applied to the family's raw delta. */
  readonly coefficient: number;
  readonly provenance: CoefficientProvenance;
  /** Weight in the posterior. Zero until provenance is FITTED. */
  readonly weight: number;
  /** Where the number came from, in words. Never a bare number. */
  readonly basis: string;
  /** Training window, when fitted. Null for hand-set. */
  readonly fittedOn: { readonly from: string; readonly to: string } | null;
}

/**
 * The registry. All eight families are present so the wiring is complete, and
 * all eight are HAND_SET with weight zero so nothing unproven moves a number.
 */
export const FAMILY_COEFFICIENTS: readonly FamilyCoefficient[] = [
  {
    family: "pressure",
    coefficient: 0,
    provenance: "HAND_SET",
    weight: 0,
    basis: "no fitted estimate; the trends file has no pressure-rate column, only sack and hit rates",
    fittedOn: null,
  },
  {
    family: "weather",
    coefficient: 0,
    provenance: "HAND_SET",
    weight: 0,
    basis: "no fitted estimate; NWS reading carries no wind direction, so the mechanism is under-specified",
    fittedOn: null,
  },
  {
    family: "rest",
    coefficient: 0,
    provenance: "HAND_SET",
    weight: 0,
    basis: "no fitted estimate; rest days are present in the games table but never regressed on outcome",
    fittedOn: null,
  },
  {
    family: "market",
    coefficient: 0,
    provenance: "HAND_SET",
    weight: 0,
    basis: "the market is the prior, not a delta; a market family would double-count it",
    fittedOn: null,
  },
  {
    family: "coverage",
    coefficient: 0,
    provenance: "HAND_SET",
    weight: 0,
    basis: "coverage_shells_w1_w7 exists in trends but has no fitted effect on margin",
    fittedOn: null,
  },
  {
    family: "fourthDown",
    coefficient: 0,
    provenance: "HAND_SET",
    weight: 0,
    basis: "fourth-down aggression is in the staff record but the staff source is not yet resolved",
    fittedOn: null,
  },
  {
    family: "script",
    coefficient: 0,
    provenance: "HAND_SET",
    weight: 0,
    basis: "game-script families are the most over-fitted idea in the literature; nothing fitted here",
    fittedOn: null,
  },
  {
    family: "home",
    coefficient: 0,
    provenance: "HAND_SET",
    weight: 0,
    basis: "home-field advantage is already inside the market price",
    fittedOn: null,
  },
];

export function coefficientFor(family: string): FamilyCoefficient | null {
  return FAMILY_COEFFICIENTS.find((c) => c.family === family) ?? null;
}

/** Total weight currently live in the posterior. Zero until something is fitted. */
export function liveWeightTotal(): number {
  return FAMILY_COEFFICIENTS.reduce((s, c) => s + c.weight, 0);
}

/** Families that may move a number. Empty today, by design. */
export function liveFamilies(): readonly FamilyCoefficient[] {
  return FAMILY_COEFFICIENTS.filter((c) => c.provenance === "FITTED" && c.weight > 0);
}

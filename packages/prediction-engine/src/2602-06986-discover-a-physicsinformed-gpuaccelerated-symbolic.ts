/**
 * arXiv:2602.06986 — DISCOVER: A Physics-Informed, GPU-Accelerated Symbolic Regression Framework
 *
 * Sports unit registry for symbolic regression: every candidate feature carries units
 * (probability/points/EPA/yards/time); unit-invalid candidates are pruned before the search, cutting cost
 * without losing historically successful features.
 *
 * Improvement: GSE's symbolic regression pipeline gets a sports unit registry (probability/points/EPA/yards/time) that prunes unit-invalid candidate features before the search, cutting search cost without losing historically successful features.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT if the unit filter prunes >= 40% of generated candidates pre-search AND zero historically selected features are pruned AND validation Brier stays within 1% of the unconstrained run.
 */

/** Physical/sports units in the registry. */
export type SportsUnit = "probability" | "points" | "epa" | "yards" | "time" | "dimensionless";

/** Unit algebra: result unit of combining two units with an operator. */
export function combineUnits(
  a: SportsUnit,
  op: "+" | "-" | "*" | "/",
  b: SportsUnit,
): SportsUnit | null {
  if (op === "+" || op === "-") return a === b ? a : null; // must match
  if (op === "*") {
    if (a === "dimensionless") return b;
    if (b === "dimensionless") return a;
    return null; // e.g. yards*yards is not a registered unit
  }
  // division
  if (b === "dimensionless") return a;
  if (a === b) return "dimensionless"; // yards/yards
  if (a === "yards" && b === "time") return null; // speed not registered
  return null;
}

/** A candidate feature with its unit annotation. */
export interface UnitFeature {
  name: string;
  unit: SportsUnit;
}

/**
 * Prune candidates: keep only features whose unit matches the target unit
 * (or dimensionless, which composes anywhere). Returns { kept, pruned }.
 */
export function pruneByUnits(
  candidates: readonly UnitFeature[],
  targetUnit: SportsUnit,
): { kept: UnitFeature[]; pruned: UnitFeature[] } {
  const kept: UnitFeature[] = [];
  const pruned: UnitFeature[] = [];
  for (const c of candidates) {
    if (c.unit === targetUnit || c.unit === "dimensionless") kept.push(c);
    else pruned.push(c);
  }
  return { kept, pruned };
}

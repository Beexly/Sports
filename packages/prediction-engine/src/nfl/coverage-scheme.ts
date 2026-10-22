/**
 * Coverage-scheme measurements from the NGS and PFF writeups.
 *
 * NFL and AWS, 2023: eight classes, defender-minus-offense features,
 * 10 Hz tracking, and a mean of model outputs. Their 88.9% test accuracy
 * was not re-run here.
 *
 * Gordeev and Singer, 2020: replace reported speed with displacement times 10.
 *
 * Seth and Weisman, 2021: uniqueness is distance from the origin in the
 * PCA plane of coverage frequencies. Their 2020 team ranking was not remeasured.
 */

export const COVERAGE_SCHEMES = [
  "cover-0-man",
  "cover-1-man",
  "cover-2-man",
  "cover-2-zone",
  "cover-3-zone",
  "cover-4-zone",
  "cover-6-zone",
  "prevent",
] as const;

export type CoverageScheme = (typeof COVERAGE_SCHEMES)[number];

export function coverageFamily(scheme: CoverageScheme): "man" | "zone" {
  if (scheme.endsWith("-man")) return "man";
  return "zone";
}

export function defenderOffenseDelta(
  defender: { x: number; y: number; sx: number; sy: number },
  offense: { x: number; y: number; sx: number; sy: number },
): { dx: number; dy: number; dsx: number; dsy: number } {
  const values = [defender.x, defender.y, defender.sx, defender.sy, offense.x, offense.y, offense.sx, offense.sy];
  if (values.some((v) => !Number.isFinite(v))) throw new Error("pair features must be finite");
  return {
    dx: defender.x - offense.x,
    dy: defender.y - offense.y,
    dsx: defender.sx - offense.sx,
    dsy: defender.sy - offense.sy,
  };
}

/** Zoo correction: reported speed is replaced by displacement times the 10 Hz rate. */
export function speedFromDisplacement(displacementYards: number): number {
  if (!Number.isFinite(displacementYards) || displacementYards < 0) {
    throw new Error("displacement must be finite and non-negative");
  }
  return displacementYards * 10;
}

export function meanClassProbabilities(models: readonly (readonly number[])[]): number[] {
  if (models.length === 0) throw new Error("at least one model output is required");
  const width = models[0].length;
  if (width === 0 || models.some((row) => row.length !== width || row.some((p) => !Number.isFinite(p) || p < 0))) {
    throw new Error("model outputs must be finite non-negative rows of equal length");
  }
  return Array.from({ length: width }, (_, i) => models.reduce((sum, row) => sum + row[i], 0) / models.length);
}

/** PFF: Euclidean distance from the origin in the coverage PCA plane. */
export function coverageSchemeUniqueness(pc1: number, pc2: number): number {
  if (!Number.isFinite(pc1) || !Number.isFinite(pc2)) throw new Error("PCA coordinates must be finite");
  return Math.hypot(pc1, pc2);
}

/** Share of neighbors whose label differs. A high share is a review flag, not a relabel. */
export function neighborLabelMismatch(own: string, neighbors: readonly string[]): number {
  if (neighbors.length === 0) throw new Error("at least one neighbor is required");
  return neighbors.filter((label) => label !== own).length / neighbors.length;
}

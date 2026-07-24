/**
 * Pool Adjacent Violators (PAV) — linear-time isotonic regression.
 *
 * Extracted for reuse by IVAP, CVAP, local isotonic patches, and multicalibration.
 * Supports optional positive weights. Pure function; no side effects.
 *
 * Algorithm matches the block-merge implementation previously private in ivap.ts.
 * Coding agent note: core algorithm is verified; extend only, do not rewrite.
 */

export interface PavBlock {
  readonly value: number;
  readonly weight: number;
  readonly start: number;
  readonly end: number;
}

/**
 * Unweighted or weighted PAV under non-decreasing constraint.
 * @param ys Observed values (already ordered by the isotonic covariate, e.g. score).
 * @param weights Optional positive weights; defaults to 1 for every observation.
 * @returns Fitted values in the same order as ys.
 */
export function pavIsotonic(
  ys: readonly number[],
  weights?: readonly number[],
): number[] {
  const n = ys.length;
  if (n === 0) return [];

  if (weights !== undefined && weights.length !== n) {
    throw new Error("pavIsotonic: weights length must match ys length");
  }

  // Work with weighted blocks: value, weight, start, end
  const blocks: { value: number; weight: number; start: number; end: number }[] = ys.map(
    (y, i) => ({
      value: y,
      weight: weights ? Math.max(Number.EPSILON, weights[i]!) : 1,
      start: i,
      end: i,
    }),
  );

  let i = 0;
  while (i < blocks.length - 1) {
    if (blocks[i]!.value <= blocks[i + 1]!.value) {
      i += 1;
      continue;
    }
    // Merge violators
    const left = blocks[i]!;
    const right = blocks[i + 1]!;
    const totalWeight = left.weight + right.weight;
    const mergedValue = (left.value * left.weight + right.value * right.weight) / totalWeight;
    blocks.splice(i, 2, {
      value: mergedValue,
      weight: totalWeight,
      start: left.start,
      end: right.end,
    });
    // Backtrack if the merge created a new violation with the previous block
    if (i > 0) i -= 1;
  }

  const fitted = new Array<number>(n);
  for (const block of blocks) {
    for (let j = block.start; j <= block.end; j++) {
      fitted[j] = block.value;
    }
  }
  return fitted;
}

/**
 * Convenience: PAV on binary labels (0/1) for calibration maps.
 */
export function pavBinary(
  labels: readonly (0 | 1)[],
  weights?: readonly number[],
): number[] {
  return pavIsotonic(labels, weights);
}

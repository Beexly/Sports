/**
 * SLOT `bh-fdr` — multiplicity control for the mining engine.
 *
 * `benjaminiHochberg` answers the first of the two questions that decide
 * whether a "discovered" edge is real: of the many hypotheses in a
 * pre-registered grid, which survive multiplicity control at a stated
 * false-discovery rate?
 *
 * The second question — how much INDEPENDENT evidence do the surviving rows
 * actually carry, once clustering (many rows from one player-season) is
 * accounted for — is `effectiveSampleSize`, which now lives in its own file
 * (`./ess.js`) alongside the m₀ unbalanced-design proof and its degenerate-case
 * policy. The contract heads this section "SLOT `bh-fdr` + `ess`", which is why
 * both once lived here; the split follows the one-slot-per-file rule the rest of
 * `slots/` obeys. It is re-exported below so existing importers are unaffected,
 * and so there is exactly ONE implementation of the frozen type rather than two
 * that can drift apart.
 *
 * ── 1. BENJAMINI–HOCHBERG (1995) STEP-UP ────────────────────────────────────
 *
 * Order the m p-values p_(1) <= … <= p_(m). The step-up rule finds
 *
 *     k = max { i : p_(i) <= alpha · i / m }
 *
 * and rejects H_(1) … H_(k) (nothing if no such i exists). Under independence
 * or PRDS this controls FDR at alpha · m0/m <= alpha.
 *
 * The adjusted q-values are the cumulative minimum taken from the LARGEST rank
 * downward:
 *
 *     q_(m) = min( 1, p_(m) · m / m )
 *     q_(i) = min( q_(i+1), p_(i) · m / i ),   clamped to <= 1
 *
 * The clamp to 1 is not cosmetic and is not a silent coercion: p_(i)·m/i is an
 * estimated false-discovery RATE, and a rate above 1 is meaningless — the
 * standard definition of the BH-adjusted p-value is min(1, ·). It is applied
 * only at the output, and because min-with-a-constant commutes with the running
 * minimum, clamping the output is identical to clamping every raw term.
 *
 * Two properties fall out of the step-down cumulative minimum and are asserted
 * in the tests rather than assumed:
 *   - q_(i) >= p_(i) always (every term in the minimum over j >= i satisfies
 *     p_(j)·m/j >= p_(i)·1);
 *   - { i : q_(i) <= alpha } is exactly { 1 … k }, so the q-value ordering and
 *     the step-up decision never disagree.
 * Tied p-values therefore receive identical q-values automatically (for
 * p_(i) = p_(i+1) the term at rank i is the larger of the two, so the running
 * minimum simply carries through).
 *
 * ALIGNMENT: `qValues` and `rejected` are returned in INPUT order. The ranking
 * is done over an index permutation and every write is indexed by the original
 * position — returning sorted-order output is the classic BH bug and the test
 * suite pins it with a deliberately unsorted input.
 *
 * FAIL-CLOSED: empty input throws EMPTY (BH over an empty grid is a caller bug —
 * a pre-registered grid always has at least one hypothesis, and silently
 * returning an empty result would let a mis-wired filter look like "nothing to
 * correct"). Non-finite alpha or p-value throws NOT_FINITE; alpha outside (0,1]
 * or a p-value outside [0,1] throws DOMAIN.
 *
 * ── 2. CLUSTER-ADJUSTED EFFECTIVE SAMPLE SIZE ───────────────────────────────
 *
 * Lives in `./ess.js` and is re-exported at the bottom of this file. Its own
 * header carries the estimator, the m0 unbalanced-design correction with the
 * Cauchy-Schwarz argument for why the naive mean cluster size always overstates
 * ess, and the degenerate-case policy for k = 1, n = k, and zero total variance.
 * That documentation is deliberately NOT duplicated here: a second copy of a
 * numeric policy is a second thing to forget to update.
 */

import {
  KernelError,
  assertFinite,
  assertNonEmpty,
  assertProbability,
  type BenjaminiHochbergFn,
  type FdrResult,
} from "../contract.js";

// ─────────────────────────────────────────────────────────────────────────────
// Benjamini–Hochberg
// ─────────────────────────────────────────────────────────────────────────────

export const benjaminiHochberg: BenjaminiHochbergFn = (pValues, alpha): FdrResult => {
  assertNonEmpty(pValues, "pValues");
  assertFinite(alpha, "alpha");
  if (alpha <= 0 || alpha > 1) {
    throw new KernelError("DOMAIN", `alpha must be in (0,1], received ${alpha}`);
  }

  const m = pValues.length;
  for (let i = 0; i < m; i += 1) {
    assertProbability(pValues[i] as number, `pValues[${i}]`);
  }

  // Rank by p-value; ties broken by input index so the permutation is stable
  // and the result is deterministic (the q-values of tied p-values coincide
  // regardless, see the header).
  const order: number[] = new Array<number>(m);
  for (let i = 0; i < m; i += 1) order[i] = i;
  order.sort((a, b) => {
    const pa = pValues[a] as number;
    const pb = pValues[b] as number;
    return pa === pb ? a - b : pa - pb;
  });

  // q-values: cumulative minimum of p_(i) · m / i walking from rank m down to 1,
  // written back at the ORIGINAL index.
  const qValues: number[] = new Array<number>(m);
  let running = Number.POSITIVE_INFINITY;
  for (let rank = m; rank >= 1; rank -= 1) {
    const idx = order[rank - 1] as number;
    const raw = ((pValues[idx] as number) * m) / rank;
    if (raw < running) running = raw;
    qValues[idx] = running < 1 ? running : 1;
  }

  // Step-up threshold: the largest rank whose p-value clears the BH line.
  let cut = 0;
  for (let rank = m; rank >= 1; rank -= 1) {
    const idx = order[rank - 1] as number;
    if ((pValues[idx] as number) <= (alpha * rank) / m) {
      cut = rank;
      break;
    }
  }

  const rejected: boolean[] = new Array<boolean>(m).fill(false);
  let threshold = 0;
  for (let rank = 1; rank <= cut; rank += 1) {
    const idx = order[rank - 1] as number;
    rejected[idx] = true;
    const p = pValues[idx] as number;
    if (p > threshold) threshold = p;
  }

  return { qValues, rejected, threshold };
};


// ─────────────────────────────────────────────────────────────────────────────
// Cluster-adjusted effective sample size — implementation moved to `./ess.js`
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Re-exported so the two halves of the contract's combined "SLOT `bh-fdr` +
 * `ess`" section stay importable from one place, WITHOUT a second copy of the
 * algorithm existing. Two implementations of a frozen type is the failure mode
 * this re-export exists to prevent: they start identical, one gets a fix, and
 * from then on the gate a caller hits depends on which file they happened to
 * import from.
 */
export { effectiveSampleSize } from "./ess.js";

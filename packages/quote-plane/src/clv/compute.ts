/**
 * Closing Line Value — pure math on self-owned archive.
 * CLV is free forever once we store quotes (P3).
 */

export interface ClvInput {
  readonly openQ: number;
  readonly closeQ: number;
  /** If bet side was yes/home at open */
  readonly side: "long" | "short";
}

export interface ClvResult {
  readonly ok: true;
  readonly clv: number;
  readonly openQ: number;
  readonly closeQ: number;
  readonly interpretation: string;
}

export type ClvRefuse =
  | { ok: false; code: "prob_out_of_range"; error: string }
  | { ok: false; code: "same_price"; error: string };

/**
 * Long (bet yes at open): positive CLV when closeQ > openQ (market moved toward you)
 * equivalently beat close if you locked better price.
 *
 * We report clv = closeQ - openQ for long (positive = market moved your way after open).
 * For short: openQ - closeQ.
 *
 * This matches "beat the close" in probability space for the selection.
 */
export function computeClvPoints(input: ClvInput): ClvResult | ClvRefuse {
  const { openQ, closeQ, side } = input;
  if (
    ![openQ, closeQ].every(
      (x) => Number.isFinite(x) && x > 0 && x < 1,
    )
  ) {
    return {
      ok: false,
      code: "prob_out_of_range",
      error: "openQ,closeQ must be in (0,1)",
    };
  }
  if (openQ === closeQ) {
    return { ok: false, code: "same_price", error: "no movement" };
  }
  const clv = side === "long" ? closeQ - openQ : openQ - closeQ;
  return {
    ok: true,
    clv,
    openQ,
    closeQ,
    interpretation:
      clv > 0
        ? "beat_close"
        : clv < 0
          ? "lost_to_close"
          : "flat",
  };
}

/** Batch mean CLV for a book of observations (research only until cohort N) */
export function meanClv(
  rows: readonly { clv: number }[],
): { ok: true; mean: number; n: number } | { ok: false; code: string } {
  if (rows.length === 0) return { ok: false, code: "empty" };
  const mean = rows.reduce((a, r) => a + r.clv, 0) / rows.length;
  return { ok: true, mean, n: rows.length };
}

/**
 * Wilson-style honesty: never publish mean CLV as edge without nMin.
 */
export function publishableClvSummary(
  rows: readonly { clv: number }[],
  nMin = 50,
): {
  publishable: boolean;
  n: number;
  mean?: number;
  reason: string;
} {
  if (rows.length < nMin) {
    return {
      publishable: false,
      n: rows.length,
      reason: `n=${rows.length} < nMin=${nMin} — refuse public CLV claim`,
    };
  }
  const m = meanClv(rows);
  if (!m.ok) return { publishable: false, n: 0, reason: "empty" };
  return {
    publishable: true,
    n: m.n,
    mean: m.mean,
    reason: "cohort_ok",
  };
}

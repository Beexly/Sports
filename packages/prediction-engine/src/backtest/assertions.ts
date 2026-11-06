/**
 * Per-bucket calibration assertions for the backtest harness.
 *
 * These do not enforce a "model must hit X% win rate" target — the
 * model has not been validated yet. They enforce invariants of the
 * harness itself: deterministic outputs, well-formed buckets, no
 * double-counting, push handling.
 */

import type { BacktestBucket, BacktestSummary } from "./types.js";

const BUCKET_ORDER: ReadonlyArray<BacktestBucket["bucket"]> = [
  "<50",
  "50-59",
  "60-69",
  "70-79",
  "80-89",
  "90-100",
];

export function assertSummaryInvariants(summary: BacktestSummary): void {
  // 1. Counts add up
  if (summary.wins + summary.losses + summary.pushes !== summary.settled) {
    throw new Error(
      `Settled count mismatch: settled=${summary.settled} wins+losses+pushes=${summary.wins + summary.losses + summary.pushes}`,
    );
  }
  if (summary.settled > summary.picks) {
    throw new Error(`Settled (${summary.settled}) cannot exceed picks (${summary.picks})`);
  }

  // 2. Win rate is consistent
  if (summary.winRate !== null) {
    const denom = summary.wins + summary.losses;
    if (denom === 0) {
      throw new Error("winRate is non-null but settled non-push count is zero");
    }
    const expected = summary.wins / denom;
    if (Math.abs(summary.winRate - expected) > 1e-9) {
      throw new Error(`winRate mismatch: got ${summary.winRate}, expected ${expected}`);
    }
  }

  // 3. Brier is in [0, 1] when present
  if (summary.brier !== null && (summary.brier < 0 || summary.brier > 1)) {
    throw new Error(`brier out of range: ${summary.brier}`);
  }

  // 4. Buckets are in canonical order and exhaustive
  if (summary.buckets.length !== BUCKET_ORDER.length) {
    throw new Error(
      `bucket count mismatch: got ${summary.buckets.length}, expected ${BUCKET_ORDER.length}`,
    );
  }
  summary.buckets.forEach((bucket, idx) => {
    if (bucket.bucket !== BUCKET_ORDER[idx]) {
      throw new Error(
        `bucket order mismatch at ${idx}: got ${bucket.bucket}, expected ${BUCKET_ORDER[idx]}`,
      );
    }
    if (bucket.wins + bucket.losses + bucket.pushes !== bucket.settled) {
      throw new Error(`bucket ${bucket.bucket} settled count mismatch`);
    }
  });

  // 5. Sum of bucket settled equals top-level settled
  const bucketSum = summary.buckets.reduce((acc, b) => acc + b.settled, 0);
  if (bucketSum !== summary.settled) {
    throw new Error(
      `bucket settled sum (${bucketSum}) mismatches top-level settled (${summary.settled})`,
    );
  }
}

export { BUCKET_ORDER };

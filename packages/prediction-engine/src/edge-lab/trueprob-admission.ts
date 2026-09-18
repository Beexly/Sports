/**
 * Trainer admission for independent trueProb.
 *
 * The write path is already tagged (as_of_mint vs post_settlement_backfill).
 * This is the read path: every fold that wants to fit on trueProb comes
 * through here, and refusals are COUNTED, never silently dropped. The count
 * is the measurement of how much historical sample was contaminated.
 *
 * Missing basis is refusal. post_settlement_backfill is refusal. A trainer
 * that bypasses this and reads `.trueProb` directly is fitting on the answer.
 */
import {
  tryReadTrainableTrueProb,
  type TrainableTrueProbRefusal,
} from "@sports/types";

export type TrueProbRefusalReason = TrainableTrueProbRefusal;

export type AdmittedTrueProbRow<T> = {
  readonly row: T;
  readonly trueProb: number;
};

export type RefusedTrueProbRow<T> = {
  readonly row: T;
  readonly reason: TrueProbRefusalReason;
};

export type TrueProbAdmission<T> = {
  readonly admitted: readonly AdmittedTrueProbRow<T>[];
  readonly refused: readonly RefusedTrueProbRow<T>[];
  readonly refusalCounts: Readonly<Record<TrueProbRefusalReason, number>>;
  readonly admittedCount: number;
  readonly refusedCount: number;
};

function emptyCounts(): Record<TrueProbRefusalReason, number> {
  return {
    trueProbBasis_required: 0,
    trueProbBasis_not_trainable: 0,
    trueProb_not_trainable: 0,
  };
}

/**
 * Split rows into trainable trueProb and a refusal census.
 * `readEdge` extracts the independent-edge object (or the row itself).
 */
export function admitTrainableTrueProbRows<T>(
  rows: readonly T[],
  readEdge: (row: T) => unknown = (row) => row,
): TrueProbAdmission<T> {
  const admitted: AdmittedTrueProbRow<T>[] = [];
  const refused: RefusedTrueProbRow<T>[] = [];
  const refusalCounts = emptyCounts();
  for (const row of rows) {
    const read = tryReadTrainableTrueProb(readEdge(row));
    if (read.ok) {
      admitted.push({ row, trueProb: read.trueProb });
    } else {
      refused.push({ row, reason: read.reason });
      refusalCounts[read.reason] += 1;
    }
  }
  return {
    admitted,
    refused,
    refusalCounts,
    admittedCount: admitted.length,
    refusedCount: refused.length,
  };
}

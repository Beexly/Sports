/**
 * Turns one holdout schedule row plus stored bridge premises into a trace.
 * Premises come from the caller. This file does not invent a probability,
 * and it does not pass scores or home_win into the trace.
 */
import { reasonAbout, type ReasoningEval } from "../reasoning-trace.js";

export interface HoldoutScheduleRow {
  readonly game_id: string;
  readonly season: number;
  readonly week: number;
  readonly home_team: string;
  readonly away_team: string;
  readonly rest_diff: number | null;
  readonly roof: string | null;
}

export interface StoredBridgePremise {
  readonly game_id: string;
  readonly signal_id: string;
  readonly outcome: string;
  readonly probability: number;
  readonly sample_count: number;
  readonly method: string;
}

export function traceHoldoutGame(row: HoldoutScheduleRow, premises: readonly StoredBridgePremise[] = []): ReasoningEval {
  const mine = premises.filter((premise) => premise.game_id === row.game_id);
  const inputs = [
    {
      id: "rest",
      readingKind: "PHYSICAL_MODIFIER" as const,
      claim: `rest_diff ${String(row.rest_diff)} is context, not a probability`,
    },
    {
      id: "roof",
      readingKind: "CATEGORICAL" as const,
      claim: `roof ${String(row.roof)} is context, not a probability`,
    },
    ...(mine.length > 0
      ? mine.map((premise) => ({
          id: premise.signal_id,
          readingKind: "PROBABILITY" as const,
          probability: premise.probability,
          sampleCount: premise.sample_count,
          outcome: premise.outcome,
          claim: premise.method,
        }))
      : [
          {
            id: "bridge",
            readingKind: "PROBABILITY" as const,
            claim: "no bridge payload is stored on this holdout row",
            refused: `${row.game_id} has no bridge result`,
          },
        ]),
  ];
  return reasonAbout(
    {
      question: `What do the stored bridge results say about ${row.away_team} at ${row.home_team}?`,
      unit: "game",
      interference: "UNKNOWN",
      targetFitOnQuestionSample: false,
      blockedKernels: [{ name: "glmf", reason: "Gaussian ALS on a binomial matrix, mu is the sample mean" }],
    },
    inputs,
  );
}

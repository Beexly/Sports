/**
 * Turns one holdout schedule row into a reasoning trace.
 * The row has no bridge payload. This does not invent one, and it does not
 * pass scores or home_win into the trace.
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

export function traceHoldoutGame(row: HoldoutScheduleRow): ReasoningEval {
  return reasonAbout(
    {
      question: `What do the stored bridge results say about ${row.away_team} at ${row.home_team}?`,
      unit: "game",
      interference: "UNKNOWN",
      targetFitOnQuestionSample: false,
      blockedKernels: [
        { name: "glmf", reason: "Gaussian ALS on a binomial matrix, mu is the sample mean" },
      ],
    },
    [
      {
        id: "rest",
        readingKind: "PHYSICAL_MODIFIER",
        claim: `rest_diff ${String(row.rest_diff)} is context, not a probability`,
      },
      {
        id: "roof",
        readingKind: "CATEGORICAL",
        claim: `roof ${String(row.roof)} is context, not a probability`,
      },
      {
        id: "bridge",
        readingKind: "PROBABILITY",
        claim: "no bridge payload is stored on this holdout row",
        refused: `${row.game_id} has no bridge result`,
      },
    ],
  );
}

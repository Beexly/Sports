import { db, Prisma } from "@sports/db";
import { evaluateCorrelationQuery, type CorrelationEvaluation, type CorrelationPickRow } from "@/lib/correlation/evaluate";
import type { CorrelationQuery } from "@/lib/correlation/query-schema";

const CORRELATION_HISTORY_LIMIT = 5000;

const settledPickSelect = Prisma.validator<Prisma.PickSelect>()({
  id: true,
  pickType: true,
  riskLevel: true,
  pickGrade: true,
  confidence: true,
  edgeScore: true,
  consensusPct: true,
  bookmakerCount: true,
  result: true,
  modelVersion: true,
  game: {
    select: {
      sport: {
        select: {
          name: true,
          key: true,
        },
      },
    },
  },
});

export type CorrelationSettledPick = Prisma.PickGetPayload<{
  select: typeof settledPickSelect;
}>;

function settledResult(value: CorrelationSettledPick["result"]): CorrelationPickRow["result"] {
  if (value === "WIN" || value === "LOSS" || value === "PUSH") return value;
  throw new Error(`Unsupported correlation pick result: ${value}`);
}

export function mapSettledPickToCorrelationRow(pick: CorrelationSettledPick): CorrelationPickRow {
  return {
    sport: pick.game.sport.name || pick.game.sport.key,
    pickType: pick.pickType,
    riskLevel: pick.riskLevel,
    pickGrade: pick.pickGrade,
    confidence: pick.confidence,
    edgeScore: pick.edgeScore,
    consensusPct: pick.consensusPct,
    bookmakerCount: pick.bookmakerCount,
    result: settledResult(pick.result),
    modelVersion: pick.modelVersion,
  };
}

export async function loadSettledCorrelationRows(limit = CORRELATION_HISTORY_LIMIT): Promise<CorrelationPickRow[]> {
  const take = Math.min(Math.max(Math.round(limit), 1), CORRELATION_HISTORY_LIMIT);
  const picks = await db.pick.findMany({
    where: {
      isPublished: true,
      isBootstrap: false,
      result: { in: ["WIN", "LOSS", "PUSH"] },
      NOT: { modelVersion: "v5.0.0-seed" },
      signalSnapshot: {
        is: {
          eligibleForLearning: true,
          isBootstrap: false,
        },
      },
    },
    orderBy: { settledAt: "desc" },
    take,
    select: settledPickSelect,
  });

  return picks.map(mapSettledPickToCorrelationRow);
}

export async function runCorrelationQuery(query: CorrelationQuery): Promise<CorrelationEvaluation> {
  const rows = await loadSettledCorrelationRows();
  return evaluateCorrelationQuery(query, rows);
}

import { db as defaultDb } from "@sports/db";
import {
  rollupGroupedByCreditPool,
  type CreditPoolTotals,
} from "@/lib/claude-api/credit-pool";
import { getUtcMonthWindow, type MonthWindow } from "@/lib/claude-api/usage-store";

/**
 * DB-backed credit-pool spend reader. Uses a groupBy over the Claude call ledger
 * (one row per distinct model id) so the read stays O(distinct-models), not
 * O(calls), then attributes each model's spend to its credit pool. Injectable
 * client mirrors usage-store.ts so it is testable without a real database.
 */

type DecimalLike = { readonly toString: () => string };

interface GroupByRow {
  readonly modelName: string;
  readonly _count: { readonly _all: number } | number;
  readonly _sum: {
    readonly estimatedCostUsd?: DecimalLike | number | string | null;
    readonly inputTokens?: number | null;
    readonly outputTokens?: number | null;
  };
}

export interface CreditPoolStoreDb {
  readonly claudeApiCallRecord: {
    readonly groupBy: (args: {
      readonly by: readonly ["modelName"];
      readonly where: { readonly observedAt: { readonly gte: Date; readonly lt: Date } };
      readonly _sum: {
        readonly estimatedCostUsd: true;
        readonly inputTokens: true;
        readonly outputTokens: true;
      };
      readonly _count: { readonly _all: true };
    }) => Promise<readonly GroupByRow[]>;
  };
}

function callCount(row: GroupByRow): number {
  return typeof row._count === "number" ? row._count : row._count._all;
}

/**
 * Spend rolled up by credit pool for a time window (default: current UTC month).
 * Empty pools are omitted; sorted biggest-burn-first.
 */
export async function getCreditPoolBreakdown(
  now = new Date(),
  client: CreditPoolStoreDb = defaultDb as unknown as CreditPoolStoreDb,
  window: MonthWindow = getUtcMonthWindow(now),
): Promise<CreditPoolTotals[]> {
  const groups = await client.claudeApiCallRecord.groupBy({
    by: ["modelName"],
    where: { observedAt: { gte: window.start, lt: window.end } },
    _sum: { estimatedCostUsd: true, inputTokens: true, outputTokens: true },
    _count: { _all: true },
  });

  return rollupGroupedByCreditPool(
    groups.map((row) => ({
      modelName: row.modelName,
      calls: callCount(row),
      estimatedCostUsd: row._sum.estimatedCostUsd ?? 0,
      inputTokens: row._sum.inputTokens ?? 0,
      outputTokens: row._sum.outputTokens ?? 0,
    })),
  );
}

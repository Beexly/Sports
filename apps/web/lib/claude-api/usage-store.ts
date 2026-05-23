import { db as defaultDb } from "@sports/db";
import type { ClaudeApiSurface } from "@/lib/claude-api/cost-monitor";

type DecimalLike = {
  readonly toString: () => string;
};

type SumResult = {
  readonly _sum: {
    readonly estimatedCostUsd?: DecimalLike | number | string | null;
  };
};

export interface ClaudeUsageStoreDb {
  readonly claudeApiCallRecord: {
    readonly aggregate: (args: {
      readonly _sum: { readonly estimatedCostUsd: true };
      readonly where: {
        readonly surface: ClaudeApiSurface;
        readonly observedAt: {
          readonly gte: Date;
          readonly lt: Date;
        };
      };
    }) => Promise<SumResult>;
    readonly create: (args: {
      readonly data: {
        readonly surface: ClaudeApiSurface;
        readonly modelName: string;
        readonly inputTokens: number;
        readonly outputTokens: number;
        readonly estimatedCostUsd: number;
        readonly userId: string | null;
        readonly gameId: string | null;
        readonly templateKind: string | null;
        readonly durationMs: number;
        readonly success: boolean;
        readonly errorKind: string | null;
        readonly observedAt: Date;
      };
    }) => Promise<unknown>;
  };
}

export interface MonthWindow {
  readonly start: Date;
  readonly end: Date;
}

export function getUtcMonthWindow(now = new Date()): MonthWindow {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

export async function getCurrentMonthClaudeSpendUsd(
  surface: ClaudeApiSurface,
  now = new Date(),
  client: ClaudeUsageStoreDb = defaultDb as unknown as ClaudeUsageStoreDb
): Promise<number> {
  const window = getUtcMonthWindow(now);
  const aggregate = await client.claudeApiCallRecord.aggregate({
    _sum: { estimatedCostUsd: true },
    where: {
      surface,
      observedAt: {
        gte: window.start,
        lt: window.end,
      },
    },
  });

  return toUsdNumber(aggregate._sum.estimatedCostUsd);
}

export interface ClaudeApiCallRecordInput {
  readonly surface: ClaudeApiSurface;
  readonly modelName: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly estimatedCostUsd: number;
  readonly userId?: string | null;
  readonly gameId?: string | null;
  readonly templateKind?: string | null;
  readonly durationMs: number;
  readonly success: boolean;
  readonly errorKind?: string | null;
  readonly observedAt?: Date;
}

export async function recordClaudeApiCall(
  input: ClaudeApiCallRecordInput,
  client: ClaudeUsageStoreDb = defaultDb as unknown as ClaudeUsageStoreDb
): Promise<void> {
  await client.claudeApiCallRecord.create({
    data: {
      surface: input.surface,
      modelName: input.modelName,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      estimatedCostUsd: input.estimatedCostUsd,
      userId: input.userId ?? null,
      gameId: input.gameId ?? null,
      templateKind: input.templateKind ?? null,
      durationMs: input.durationMs,
      success: input.success,
      errorKind: input.errorKind ?? null,
      observedAt: input.observedAt ?? new Date(),
    },
  });
}

function toUsdNumber(value: DecimalLike | number | string | null | undefined): number {
  if (value === null || typeof value === "undefined") return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number(value.toString());
}

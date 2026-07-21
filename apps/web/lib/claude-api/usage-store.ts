import { db as defaultDb } from "@sports/db";
import type { ClaudeApiSurface } from "@/lib/claude-api/cost-monitor";
import type { LlmDispatchRecord } from "@/lib/claude-api/cost-policy";

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
        readonly costMode: string | null;
        readonly providerRequested: string | null;
        readonly providerUsed: string | null;
        readonly billingPool: string | null;
        readonly fallbackReason: string | null;
      };
    }) => Promise<unknown>;
    readonly count?: (args: {
      readonly where: {
        readonly surface?: ClaudeApiSurface;
        readonly providerUsed: string;
        readonly providerRequested: { readonly in: readonly string[] };
        readonly observedAt: { readonly gte: Date; readonly lt: Date };
      };
    }) => Promise<number>;
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
  /**
   * Dispatch telemetry from callClaude's onDispatch hook (cost-policy.ts).
   * Optional — omit at call sites not yet wired to onDispatch; existing rows
   * with no dispatch record stay null, same as before this field existed.
   */
  readonly dispatch?: LlmDispatchRecord | null;
}

/** Log-level alert: cash was billed while a credit provider was selected. This is the
 * exact "believed credits were paying, actually billed cash" scenario the cost-policy
 * layer exists to prevent in credits-only/zero-cash mode — in normal mode it can still
 * happen via fallback, so it's worth a signal even though normal mode allows it. */
function maybeAlertOnUnexpectedCashBilling(input: ClaudeApiCallRecordInput): void {
  const dispatch = input.dispatch;
  if (!dispatch) return;
  if (dispatch.providerRequested === "anthropic") return; // no credit provider was ever selected
  if (dispatch.providerUsed !== "anthropic") return; // routed to the credit provider as intended
  // eslint-disable-next-line no-console -- deliberate log-level alert, see docstring
  console.warn(
    `[claude-api] cash billed to Anthropic while ${dispatch.providerRequested} was selected ` +
      `(surface=${dispatch.surface ?? input.surface}, costMode=${dispatch.costMode}, reason=${dispatch.fallbackReason ?? "unknown"})`,
  );
}

export async function recordClaudeApiCall(
  input: ClaudeApiCallRecordInput,
  client: ClaudeUsageStoreDb = defaultDb as unknown as ClaudeUsageStoreDb
): Promise<void> {
  maybeAlertOnUnexpectedCashBilling(input);
  const dispatch = input.dispatch;
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
      costMode: dispatch?.costMode ?? null,
      providerRequested: dispatch?.providerRequested ?? null,
      providerUsed: dispatch?.providerUsed ?? null,
      billingPool: dispatch?.billingPool ?? null,
      fallbackReason: dispatch?.fallbackReason ?? null,
    },
  });
}

export interface ProviderFallbackStats {
  readonly surface: ClaudeApiSurface;
  readonly fallbackCount: number;
}

/**
 * Count of calls in the window where a credit provider was requested but the
 * bill landed on direct Anthropic anyway (fallback in "normal" mode, or a
 * pre-cost-policy call site with no dispatch record wouldn't count here since
 * providerUsed would be null, not "anthropic" — only wired call sites surface).
 */
export async function getProviderFallbackCount(
  surface: ClaudeApiSurface,
  now = new Date(),
  client: ClaudeUsageStoreDb = defaultDb as unknown as ClaudeUsageStoreDb,
): Promise<number> {
  if (!client.claudeApiCallRecord.count) return 0;
  const window = getUtcMonthWindow(now);
  return client.claudeApiCallRecord.count({
    where: {
      surface,
      providerUsed: "anthropic",
      providerRequested: { in: ["bedrock", "vertex"] }, // excludes deliberate direct-Anthropic calls
      observedAt: { gte: window.start, lt: window.end },
    },
  });
}

function toUsdNumber(value: DecimalLike | number | string | null | undefined): number {
  if (value === null || typeof value === "undefined") return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number(value.toString());
}

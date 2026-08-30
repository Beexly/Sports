import { db as defaultDb } from "@sports/db";
import {
  DEFAULT_CLAUDE_API_BUDGETS,
  type ClaudeApiBudgetPolicy,
  type ClaudeApiSurface,
} from "@/lib/claude-api/cost-monitor";

type DecimalLike = {
  readonly toString: () => string;
};

interface ClaudeApiBudgetRecord {
  readonly monthlyBudgetUsd: DecimalLike | number | string;
  readonly alertThresholds: unknown;
  readonly overrideActive: boolean;
  readonly overrideExpiresAt: Date | null;
}

export interface ClaudeBudgetStoreDb {
  readonly claudeApiBudget: {
    readonly findUnique: (args: {
      readonly where: { readonly surface: ClaudeApiSurface };
    }) => Promise<ClaudeApiBudgetRecord | null>;
  };
}

export interface LoadedClaudeBudgetPolicy {
  readonly policy: ClaudeApiBudgetPolicy;
  readonly overrideActive: boolean;
}

export async function loadClaudeBudgetPolicy(
  surface: ClaudeApiSurface,
  now = new Date(),
  client: ClaudeBudgetStoreDb = defaultDb as unknown as ClaudeBudgetStoreDb
): Promise<LoadedClaudeBudgetPolicy> {
  const fallback = DEFAULT_CLAUDE_API_BUDGETS[surface];
  const record = await client.claudeApiBudget.findUnique({ where: { surface } });
  if (!record) {
    return { policy: fallback, overrideActive: false };
  }

  const policy: ClaudeApiBudgetPolicy = {
    surface,
    monthlyBudgetUsd: toUsdNumber(record.monthlyBudgetUsd),
    thresholds: coerceThresholds(record.alertThresholds, fallback.thresholds),
  };
  const overrideActive =
    record.overrideActive && (!record.overrideExpiresAt || record.overrideExpiresAt.getTime() > now.getTime());

  return { policy, overrideActive };
}

function coerceThresholds(
  value: unknown,
  fallback: ClaudeApiBudgetPolicy["thresholds"]
): ClaudeApiBudgetPolicy["thresholds"] {
  if (!value || typeof value !== "object") return fallback;
  const record = value as Record<string, unknown>;
  const yellow = numericThreshold(record["yellow"], fallback.yellow);
  const orange = numericThreshold(record["orange"], fallback.orange);
  const red = numericThreshold(record["red"], fallback.red);
  const hardCap = numericThreshold(record["hardCap"], fallback.hardCap);
  return { yellow, orange, red, hardCap };
}

function numericThreshold(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toUsdNumber(value: DecimalLike | number | string): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number(value.toString());
}

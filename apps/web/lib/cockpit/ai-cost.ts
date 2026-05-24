/**
 * AI cost estimator.
 *
 * Reads telemetry rows (the structured JSON from `withTelemetry` in
 * `apps/web/lib/ai/telemetry.ts`) and converts them into dollar amounts
 * using current Anthropic published per-million-token rates.
 *
 * Rates here mirror https://www.anthropic.com/pricing (Sonnet 4.6 +
 * Haiku 4.5 columns). Cache reads are charged at 0.1x the input rate;
 * cache creation at 1.25x the input rate. Update the table when
 * Anthropic publishes a new price.
 */

import type { TelemetryRow } from "./telemetry-summary.js";

export interface ModelPricing {
  /** USD per 1M input tokens (non-cache). */
  readonly inputPer1m: number;
  /** USD per 1M cache-read input tokens (typically input * 0.1). */
  readonly cacheReadPer1m: number;
  /** USD per 1M cache-write input tokens (typically input * 1.25). */
  readonly cacheCreationPer1m: number;
  /** USD per 1M output tokens. */
  readonly outputPer1m: number;
}

/**
 * Published rates as of 2026-05. Keep in sync with anthropic.com/pricing.
 * Unknown models fall through to UNKNOWN_PRICING (conservative — assume
 * Sonnet-tier so the ceiling errs toward safety).
 */
export const MODEL_PRICING: Readonly<Record<string, ModelPricing>> = {
  "claude-opus-4-7": {
    inputPer1m: 15,
    cacheReadPer1m: 1.5,
    cacheCreationPer1m: 18.75,
    outputPer1m: 75,
  },
  "claude-sonnet-4-6": {
    inputPer1m: 3,
    cacheReadPer1m: 0.3,
    cacheCreationPer1m: 3.75,
    outputPer1m: 15,
  },
  "claude-haiku-4-5": {
    inputPer1m: 1,
    cacheReadPer1m: 0.1,
    cacheCreationPer1m: 1.25,
    outputPer1m: 5,
  },
};

export const UNKNOWN_PRICING: ModelPricing = MODEL_PRICING["claude-sonnet-4-6"]!;

export interface RowCostBreakdown {
  readonly inputUsd: number;
  readonly cacheReadUsd: number;
  readonly cacheCreationUsd: number;
  readonly outputUsd: number;
  readonly totalUsd: number;
}

export interface DailyCostEntry {
  readonly date: string; // YYYY-MM-DD UTC
  readonly calls: number;
  readonly totalUsd: number;
  readonly byModel: ReadonlyArray<{
    readonly model: string;
    readonly calls: number;
    readonly totalUsd: number;
  }>;
  readonly bySite: ReadonlyArray<{
    readonly callSite: string;
    readonly calls: number;
    readonly totalUsd: number;
  }>;
}

/** Resolve the pricing tier for a model alias, falling back to UNKNOWN_PRICING (Sonnet-tier — conservative). */
export function pricingFor(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? UNKNOWN_PRICING;
}

/** Estimate a single telemetry row's USD cost, broken into the four token-class buckets. */
export function estimateRowCost(row: TelemetryRow): RowCostBreakdown {
  const p = pricingFor(row.model);
  const inputUsd = (row.inputTokens * p.inputPer1m) / 1_000_000;
  const cacheReadUsd = (row.cacheReadInputTokens * p.cacheReadPer1m) / 1_000_000;
  const cacheCreationUsd =
    (row.cacheCreationInputTokens * p.cacheCreationPer1m) / 1_000_000;
  const outputUsd = (row.outputTokens * p.outputPer1m) / 1_000_000;
  return {
    inputUsd,
    cacheReadUsd,
    cacheCreationUsd,
    outputUsd,
    totalUsd: inputUsd + cacheReadUsd + cacheCreationUsd + outputUsd,
  };
}

function dateKey(iso: string): string | null {
  // YYYY-MM-DD slice. Tolerate non-ISO ts values.
  if (typeof iso !== "string" || iso.length < 10) return null;
  const slice = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : null;
}

/**
 * Aggregate row-level costs into per-day buckets. Stable order:
 * dates ascending, model + site sub-arrays by cost descending.
 */
export function aggregateDailyCost(
  rows: readonly TelemetryRow[]
): readonly DailyCostEntry[] {
  const byDay = new Map<
    string,
    {
      calls: number;
      total: number;
      byModel: Map<string, { calls: number; total: number }>;
      bySite: Map<string, { calls: number; total: number }>;
    }
  >();

  for (const row of rows) {
    const day = dateKey(row.ts);
    if (!day) continue;
    const cost = estimateRowCost(row).totalUsd;
    if (!byDay.has(day)) {
      byDay.set(day, {
        calls: 0,
        total: 0,
        byModel: new Map(),
        bySite: new Map(),
      });
    }
    const bucket = byDay.get(day)!;
    bucket.calls += 1;
    bucket.total += cost;
    const m = bucket.byModel.get(row.model) ?? { calls: 0, total: 0 };
    m.calls += 1;
    m.total += cost;
    bucket.byModel.set(row.model, m);
    const s = bucket.bySite.get(row.callSite) ?? { calls: 0, total: 0 };
    s.calls += 1;
    s.total += cost;
    bucket.bySite.set(row.callSite, s);
  }

  const out: DailyCostEntry[] = [];
  const days = Array.from(byDay.keys()).sort();
  for (const day of days) {
    const b = byDay.get(day)!;
    out.push({
      date: day,
      calls: b.calls,
      totalUsd: b.total,
      byModel: Array.from(b.byModel.entries())
        .map(([model, v]) => ({ model, calls: v.calls, totalUsd: v.total }))
        .sort((a, z) => z.totalUsd - a.totalUsd),
      bySite: Array.from(b.bySite.entries())
        .map(([callSite, v]) => ({ callSite, calls: v.calls, totalUsd: v.total }))
        .sort((a, z) => z.totalUsd - a.totalUsd),
    });
  }
  return out;
}

/**
 * Returns the days that exceeded the per-day ceiling (USD). Empty
 * array means clean. Used by the daily-cost guardrail.
 */
export function findCeilingBreaches(
  daily: readonly DailyCostEntry[],
  ceilingUsd: number
): readonly DailyCostEntry[] {
  return daily.filter((d) => d.totalUsd > ceilingUsd);
}

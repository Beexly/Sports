import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  MODEL_PRICING,
  aggregateDailyCost,
  estimateRowCost,
  findCeilingBreaches,
  pricingFor,
  UNKNOWN_PRICING,
} from "@/lib/cockpit/ai-cost";
import type { TelemetryRow } from "@/lib/cockpit/telemetry-summary";

function row(partial: Partial<TelemetryRow> & { ts: string; model: string }): TelemetryRow {
  return {
    callSite: "test",
    inputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    outputTokens: 0,
    latencyMs: 0,
    status: "ok",
    ...partial,
  };
}

describe("pricingFor", () => {
  it("returns the published rate for known model aliases", () => {
    expect(pricingFor("claude-haiku-4-5").inputPer1m).toBe(1);
    expect(pricingFor("claude-sonnet-4-6").inputPer1m).toBe(3);
    expect(pricingFor("claude-opus-4-7").inputPer1m).toBe(15);
  });

  it("falls back to UNKNOWN_PRICING for unknown models (Sonnet-tier — conservative)", () => {
    expect(pricingFor("claude-future-model")).toBe(UNKNOWN_PRICING);
    expect(UNKNOWN_PRICING).toBe(MODEL_PRICING["claude-sonnet-4-6"]);
  });

  it("cache-read rate is 10% of input rate for every tier", () => {
    for (const model of Object.keys(MODEL_PRICING)) {
      const p = MODEL_PRICING[model]!;
      expect(p.cacheReadPer1m).toBeCloseTo(p.inputPer1m * 0.1, 5);
    }
  });

  it("cache-creation rate is 125% of input rate for every tier", () => {
    for (const model of Object.keys(MODEL_PRICING)) {
      const p = MODEL_PRICING[model]!;
      expect(p.cacheCreationPer1m).toBeCloseTo(p.inputPer1m * 1.25, 5);
    }
  });
});

describe("estimateRowCost", () => {
  it("computes Haiku-tier input cost at $1/M", () => {
    const c = estimateRowCost(
      row({ ts: "2026-05-23T00:00:00Z", model: "claude-haiku-4-5", inputTokens: 1_000_000 })
    );
    expect(c.inputUsd).toBeCloseTo(1, 5);
    expect(c.totalUsd).toBeCloseTo(1, 5);
  });

  it("computes Sonnet-tier output cost at $15/M", () => {
    const c = estimateRowCost(
      row({ ts: "x", model: "claude-sonnet-4-6", outputTokens: 1_000_000 })
    );
    expect(c.outputUsd).toBeCloseTo(15, 5);
  });

  it("sums all four buckets", () => {
    const c = estimateRowCost(
      row({
        ts: "x",
        model: "claude-haiku-4-5",
        inputTokens: 100_000,           // $0.10
        cacheReadInputTokens: 100_000,  // $0.01
        cacheCreationInputTokens: 100_000, // $0.125
        outputTokens: 100_000,          // $0.50
      })
    );
    expect(c.totalUsd).toBeCloseTo(0.10 + 0.01 + 0.125 + 0.50, 5);
  });
});

describe("aggregateDailyCost", () => {
  it("buckets rows by UTC date and totals USD per day", () => {
    const days = aggregateDailyCost([
      row({ ts: "2026-05-22T05:00:00Z", model: "claude-haiku-4-5", inputTokens: 1_000_000 }),
      row({ ts: "2026-05-22T23:00:00Z", model: "claude-haiku-4-5", inputTokens: 1_000_000 }),
      row({ ts: "2026-05-23T00:00:00Z", model: "claude-haiku-4-5", inputTokens: 1_000_000 }),
    ]);
    expect(days).toHaveLength(2);
    expect(days[0]!.date).toBe("2026-05-22");
    expect(days[0]!.calls).toBe(2);
    expect(days[0]!.totalUsd).toBeCloseTo(2, 5);
    expect(days[1]!.date).toBe("2026-05-23");
    expect(days[1]!.totalUsd).toBeCloseTo(1, 5);
  });

  it("breaks down per model + per call site within each day, sorted by cost desc", () => {
    const days = aggregateDailyCost([
      row({ ts: "2026-05-23T00:00:00Z", model: "claude-haiku-4-5", callSite: "draft-reviewer", inputTokens: 1_000_000 }),
      row({ ts: "2026-05-23T00:00:00Z", model: "claude-sonnet-4-6", callSite: "content-generator", outputTokens: 100_000 }),
    ]);
    expect(days[0]!.byModel[0]!.model).toBe("claude-sonnet-4-6"); // $1.50 > $1.00
    expect(days[0]!.bySite[0]!.callSite).toBe("content-generator");
  });

  it("drops rows with malformed timestamps", () => {
    const days = aggregateDailyCost([
      row({ ts: "not-a-date", model: "claude-haiku-4-5", inputTokens: 1_000_000 }),
      row({ ts: "2026-05-23T00:00:00Z", model: "claude-haiku-4-5", inputTokens: 1_000_000 }),
    ]);
    expect(days).toHaveLength(1);
    expect(days[0]!.date).toBe("2026-05-23");
  });

  it("returns empty array for empty input", () => {
    expect(aggregateDailyCost([])).toEqual([]);
  });
});

describe("findCeilingBreaches", () => {
  const sample = aggregateDailyCost([
    row({ ts: "2026-05-22T00:00:00Z", model: "claude-sonnet-4-6", outputTokens: 200_000 }), // $3
    row({ ts: "2026-05-23T00:00:00Z", model: "claude-haiku-4-5", outputTokens: 200_000 }),  // $1
  ]);

  it("returns days strictly above the ceiling", () => {
    const breaches = findCeilingBreaches(sample, 2);
    expect(breaches).toHaveLength(1);
    expect(breaches[0]!.date).toBe("2026-05-22");
  });

  it("returns empty when no day breaches", () => {
    expect(findCeilingBreaches(sample, 5)).toEqual([]);
  });
});

// ── Guardrail script source-level invariants ─────────────────────────
const repoRoot = resolve(__dirname, "..", "..", "..");
const SCRIPT = resolve(repoRoot, "scripts/guardrails/ai-daily-cost.mjs");

describe("scripts/guardrails/ai-daily-cost.mjs", () => {
  const src = readFileSync(SCRIPT, "utf8");

  it("reads _logs/claude-usage.log and is tolerant of missing file (exit 0)", () => {
    expect(src).toMatch(/claude-usage\.log/);
    expect(src).toMatch(/exit\(0\)/);
  });

  it("exits 1 on ceiling breach and 2 on config / IO failure", () => {
    expect(src).toMatch(/process\.exit\(1\)/);
    expect(src).toMatch(/process\.exit\(2\)/);
  });

  it("honors AI_DAILY_COST_CEILING_USD + AI_DAILY_COST_WINDOW_DAYS env vars", () => {
    expect(src).toMatch(/AI_DAILY_COST_CEILING_USD/);
    expect(src).toMatch(/AI_DAILY_COST_WINDOW_DAYS/);
  });

  it("emits structured JSON for parsing in CI logs / Slack pickers", () => {
    expect(src).toMatch(/JSON\.stringify\(/);
    expect(src).toMatch(/ceilingUsd/);
    expect(src).toMatch(/breachCount/);
  });

  it("inline pricing table matches the published rates in MODEL_PRICING", () => {
    // Cross-check the duplicated inline rates against the TS module.
    expect(src).toMatch(/"claude-haiku-4-5":\s*\{\s*in:\s*1\b/);
    expect(src).toMatch(/"claude-sonnet-4-6":\s*\{\s*in:\s*3\b/);
    expect(src).toMatch(/"claude-opus-4-7":\s*\{\s*in:\s*15\b/);
  });

  it("never writes a file, never POSTs (read-only guardrail)", () => {
    expect(src).not.toMatch(/writeFile|appendFile/);
    expect(src).not.toMatch(/method:\s*["']POST["']/);
  });

  it("caps log read at MAX_LOG_BYTES so a runaway log can't OOM CI", () => {
    expect(src).toMatch(/MAX_LOG_BYTES/);
  });
});

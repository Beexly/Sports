import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  parseTelemetryLog,
  summarizeTelemetry,
  type TelemetryRow,
} from "@/lib/cockpit/telemetry-summary";

function row(
  callSite: string,
  partial: Partial<TelemetryRow> = {}
): TelemetryRow {
  return {
    ts: "2026-05-23T20:00:00Z",
    callSite,
    model: "claude-haiku-4-5",
    inputTokens: 100,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    outputTokens: 50,
    latencyMs: 200,
    status: "ok",
    ...partial,
  };
}

describe("parseTelemetryLog", () => {
  it("parses one JSON object per line", () => {
    const log = [
      JSON.stringify(row("draft-reviewer")),
      JSON.stringify(row("content-generator", { inputTokens: 50 })),
    ].join("\n");
    expect(parseTelemetryLog(log)).toHaveLength(2);
  });

  it("silently drops malformed lines", () => {
    const log = [
      JSON.stringify(row("ok")),
      "not json at all",
      "{ not closed",
      JSON.stringify(row("ok2")),
    ].join("\n");
    const out = parseTelemetryLog(log);
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.callSite)).toEqual(["ok", "ok2"]);
  });

  it("drops lines missing callSite or model", () => {
    const log = [
      JSON.stringify({ ts: "x", inputTokens: 1 }), // no callSite/model
      JSON.stringify(row("real")),
    ].join("\n");
    expect(parseTelemetryLog(log)).toHaveLength(1);
  });

  it("defaults numeric fields when missing / NaN", () => {
    const log = JSON.stringify({
      ts: "x",
      callSite: "c",
      model: "m",
      inputTokens: "not-a-number",
      latencyMs: NaN,
    });
    const out = parseTelemetryLog(log);
    expect(out[0]!.inputTokens).toBe(0);
    expect(out[0]!.latencyMs).toBe(0);
  });

  it("ignores blank / whitespace-only lines", () => {
    const log = `\n${JSON.stringify(row("real"))}\n   \n\n`;
    expect(parseTelemetryLog(log)).toHaveLength(1);
  });
});

describe("summarizeTelemetry", () => {
  it("returns empty summary for an empty input", () => {
    const s = summarizeTelemetry([]);
    expect(s.totalCalls).toBe(0);
    expect(s.bySite).toEqual([]);
    expect(s.windowStart).toBeNull();
    expect(s.windowEnd).toBeNull();
  });

  it("groups by call site, totals + averages + p95 are correct", () => {
    const rows = [
      row("draft-reviewer", { latencyMs: 100, inputTokens: 100, outputTokens: 30 }),
      row("draft-reviewer", { latencyMs: 200, inputTokens: 100, outputTokens: 30 }),
      row("draft-reviewer", { latencyMs: 300, inputTokens: 100, outputTokens: 30 }),
      row("draft-reviewer", { latencyMs: 400, inputTokens: 100, outputTokens: 30 }),
      row("draft-reviewer", { latencyMs: 500, inputTokens: 100, outputTokens: 30 }),
      row("content-generator", { latencyMs: 1000, inputTokens: 1000, outputTokens: 500 }),
    ];
    const s = summarizeTelemetry(rows);
    const byName = Object.fromEntries(s.bySite.map((b) => [b.callSite, b]));
    expect(byName["draft-reviewer"]!.calls).toBe(5);
    expect(byName["draft-reviewer"]!.avgLatencyMs).toBe(300);
    expect(byName["draft-reviewer"]!.p95LatencyMs).toBe(500);
    expect(byName["draft-reviewer"]!.inputTokensTotal).toBe(500);
    expect(byName["content-generator"]!.calls).toBe(1);
    // Most-called first
    expect(s.bySite[0]!.callSite).toBe("draft-reviewer");
  });

  it("cacheHitRate uses cache_read / (cache_read + input)", () => {
    const rows = [
      row("r", { cacheReadInputTokens: 800, inputTokens: 200 }),
      row("r", { cacheReadInputTokens: 800, inputTokens: 200 }),
    ];
    const s = summarizeTelemetry(rows);
    expect(s.bySite[0]!.cacheHitRate).toBeCloseTo(0.8, 5);
  });

  it("cacheHitRate is 0 when no cache reads recorded", () => {
    const rows = [row("r", { cacheReadInputTokens: 0, inputTokens: 100 })];
    const s = summarizeTelemetry(rows);
    expect(s.bySite[0]!.cacheHitRate).toBe(0);
  });

  it("counts errors + tallies errorClasses sorted by frequency", () => {
    const rows = [
      row("r", { status: "error", errorClass: "APIError" }),
      row("r", { status: "error", errorClass: "APIError" }),
      row("r", { status: "error", errorClass: "TimeoutError" }),
      row("r"),
    ];
    const s = summarizeTelemetry(rows);
    expect(s.totalErrors).toBe(3);
    expect(s.errorClasses[0]).toEqual({ errorClass: "APIError", count: 2 });
    expect(s.errorClasses[1]).toEqual({ errorClass: "TimeoutError", count: 1 });
  });

  it("respects sinceMs to clip the window", () => {
    const now = new Date("2026-05-23T20:00:00Z");
    const rows = [
      row("old", { ts: "2026-05-22T20:00:00Z" }),  // 24h ago
      row("recent", { ts: "2026-05-23T19:45:00Z" }), // 15min ago
    ];
    const s = summarizeTelemetry(rows, { sinceMs: 60 * 60 * 1000, now }); // 1h
    expect(s.totalCalls).toBe(1);
    expect(s.bySite[0]!.callSite).toBe("recent");
  });

  it("modelsSeen is deduped + sorted", () => {
    const s = summarizeTelemetry([
      row("a", { model: "claude-haiku-4-5" }),
      row("b", { model: "claude-sonnet-4-6" }),
      row("c", { model: "claude-haiku-4-5" }),
    ]);
    expect(s.modelsSeen).toEqual(["claude-haiku-4-5", "claude-sonnet-4-6"]);
  });
});

// ── Route + page source-level invariants ───────────────────────────────
const repoRoot = resolve(__dirname, "..");
const ROUTE = resolve(repoRoot, "app/api/cockpit/telemetry/route.ts");
const PAGE = resolve(repoRoot, "app/cockpit/telemetry/page.tsx");
const LAYOUT = resolve(repoRoot, "app/cockpit/layout.tsx");

describe("/api/cockpit/telemetry route", () => {
  const src = readFileSync(ROUTE, "utf8");

  it("dynamic + admin 403 + delegates to parseTelemetryLog + summarizeTelemetry", () => {
    expect(src).toMatch(/dynamic\s*=\s*["']force-dynamic["']/);
    expect(src).toMatch(/role\s*!==\s*["']ADMIN["']/);
    expect(src).toMatch(/403/);
    expect(src).toMatch(/parseTelemetryLog/);
    expect(src).toMatch(/summarizeTelemetry/);
  });

  it("reads _logs/claude-usage.log (only) and is tolerant of missing file", () => {
    expect(src).toMatch(/claude-usage\.log/);
    expect(src).toMatch(/readFile/);
    expect(src).toMatch(/catch\s*\{[\s\S]*0/);
  });

  it("Cache-Control: no-store + no DB writes + no write to the log", () => {
    expect(src).toMatch(/Cache-Control[^"']*no-store/);
    expect(src).not.toMatch(/db\.\w+\.(create|update|delete|upsert)\b/);
    expect(src).not.toMatch(/writeFile|appendFile/);
  });

  it("caps log read at MAX_LOG_BYTES so the dashboard can't OOM", () => {
    expect(src).toMatch(/MAX_LOG_BYTES/);
  });
});

describe("/cockpit/telemetry page", () => {
  const src = readFileSync(PAGE, "utf8");
  const layout = readFileSync(LAYOUT, "utf8");

  it("declares robots: index false (cockpit pattern)", () => {
    expect(src).toMatch(/robots:[\s\S]*index:\s*false/);
  });

  it("fetches /api/cockpit/telemetry with cache: no-store and forwards cookies", () => {
    expect(src).toMatch(/\/api\/cockpit\/telemetry/);
    expect(src).toMatch(/cache:\s*["']no-store["']/);
    expect(src).toMatch(/cookie/);
  });

  it("renders window + by-site table + handles error envelope", () => {
    expect(src).toMatch(/data-testid="telemetry-window"/);
    expect(src).toMatch(/data-testid="telemetry-bysite"/);
    expect(src).toMatch(/data-testid="telemetry-error"/);
  });

  it("layout nav includes /cockpit/telemetry entry", () => {
    expect(layout).toMatch(/href:\s*["']\/cockpit\/telemetry["']/);
    expect(layout).toMatch(/label:\s*["']Telemetry["']/);
  });
});

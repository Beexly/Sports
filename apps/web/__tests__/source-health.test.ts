import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  __setClientForTests,
  assessSourceHealth,
  resolveThresholds,
  type SourceProbe,
} from "@/lib/cockpit/source-health";

const NOW = new Date("2026-05-23T20:00:00Z");
const MIN = 60_000;

function probe(
  provider: string,
  ageMin: number,
  sourceKind = "ODDS"
): SourceProbe {
  return {
    provider,
    sourceKind,
    fetchedAt: new Date(NOW.getTime() - ageMin * MIN),
  };
}

function makeFakeClient(narrative: string): {
  client: Anthropic;
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn(async () => ({
    content: [{ type: "text" as const, text: narrative }],
  }));
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

describe("assessSourceHealth", () => {
  beforeEach(() => {
    process.env["ANTHROPIC_API_KEY"] = "sk-ant-test";
    process.env["VERCEL"] = "1";
  });
  afterEach(() => {
    __setClientForTests(undefined);
    delete process.env["ANTHROPIC_API_KEY"];
    delete process.env["VERCEL"];
  });

  it("returns an empty report (and skips the Claude call) when probes is empty", async () => {
    const create = vi.fn();
    __setClientForTests({ messages: { create } } as unknown as Anthropic);

    const report = await assessSourceHealth({ probes: [], now: NOW });

    expect(report.sources).toEqual([]);
    expect(report.alerts).toEqual([]);
    expect(report.narrative).toMatch(/no source probes/i);
    expect(report.model).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("classifies FRESH/AGING/STALE by age relative to the defaults", async () => {
    __setClientForTests(makeFakeClient("Mostly fresh; one aging.").client);

    const report = await assessSourceHealth({
      probes: [
        probe("the-odds-api", 5),         // 5min  → FRESH
        probe("schedule-internal", 60),   // 1h    → AGING (>30min fresh threshold)
        probe("blocked-feed", 60 * 6),    // 6h    → STALE (>4h aging threshold)
      ],
      now: NOW,
    });

    const byProvider = Object.fromEntries(
      report.sources.map((s) => [s.provider, s.status])
    );
    expect(byProvider["the-odds-api"]).toBe("FRESH");
    expect(byProvider["schedule-internal"]).toBe("AGING");
    expect(byProvider["blocked-feed"]).toBe("STALE");
  });

  it("emits HIGH alerts for STALE and MEDIUM for AGING; none for FRESH", async () => {
    __setClientForTests(makeFakeClient("Mixed.").client);

    const report = await assessSourceHealth({
      probes: [
        probe("fresh-1", 5),
        probe("aging-1", 60),
        probe("stale-1", 60 * 6),
      ],
      now: NOW,
    });

    const severities = report.alerts.map((a) => a.severity).sort();
    expect(severities).toEqual(["HIGH", "MEDIUM"]);
    const stale = report.alerts.find((a) => a.severity === "HIGH");
    expect(stale!.provider).toBe("stale-1");
  });

  it("dedupes to the latest probe per provider+sourceKind", async () => {
    __setClientForTests(makeFakeClient("Latest is fresh.").client);

    const report = await assessSourceHealth({
      probes: [
        probe("the-odds-api", 60 * 6, "ODDS"),
        probe("the-odds-api", 5, "ODDS"),
      ],
      now: NOW,
    });

    expect(report.sources).toHaveLength(1);
    expect(report.sources[0]!.status).toBe("FRESH");
  });

  it("sorts sources by age desc (trouble at the top)", async () => {
    __setClientForTests(makeFakeClient("Order check.").client);

    const report = await assessSourceHealth({
      probes: [probe("a", 5), probe("b", 60 * 12), probe("c", 60)],
      now: NOW,
    });
    expect(report.sources.map((s) => s.provider)).toEqual(["b", "c", "a"]);
  });

  it("uses Claude's narrative when the SDK returns text", async () => {
    const { client } = makeFakeClient("All five tracked sources are fresh.");
    __setClientForTests(client);

    const report = await assessSourceHealth({
      probes: [probe("a", 5)],
      now: NOW,
    });

    expect(report.narrative).toBe("All five tracked sources are fresh.");
    expect(report.model).toBe("claude-haiku-4-5");
  });

  it("falls back to a deterministic narrative when Claude throws", async () => {
    const create = vi.fn(async () => {
      throw new Error("network down");
    });
    __setClientForTests({ messages: { create } } as unknown as Anthropic);

    const report = await assessSourceHealth({
      probes: [probe("stale-1", 60 * 6)],
      now: NOW,
    });
    expect(report.narrative).toMatch(/STALE/);
    expect(report.model).toBeNull();
  });

  it("ages in minutes appear in the alert messages", async () => {
    __setClientForTests(makeFakeClient("x").client);
    const report = await assessSourceHealth({
      probes: [probe("aging-1", 90)],
      now: NOW,
    });
    expect(report.alerts[0]!.message).toMatch(/90 minutes ago/);
  });

  it("uses per-category FRESHNESS_BUDGETS when probe.category is set (PLATFORM_POLICY is days-long)", async () => {
    __setClientForTests(makeFakeClient("ok").client);
    const report = await assessSourceHealth({
      probes: [
        {
          provider: "policy-feed",
          sourceKind: "POLICY",
          fetchedAt: new Date(NOW.getTime() - 24 * 60 * MIN), // 24h old
          category: "PLATFORM_POLICY",
        },
      ],
      now: NOW,
    });
    // 24h is well within PLATFORM_POLICY's 30d soft TTL → still FRESH
    expect(report.sources[0]!.status).toBe("FRESH");
  });

  it("inline freshThresholdMs / agingThresholdMs override category + global defaults", async () => {
    __setClientForTests(makeFakeClient("ok").client);
    const report = await assessSourceHealth({
      probes: [
        {
          provider: "custom",
          sourceKind: "WHATEVER",
          fetchedAt: new Date(NOW.getTime() - 10 * MIN),
          category: "PLATFORM_POLICY", // would normally say FRESH for days
          freshThresholdMs: 5 * MIN, // override to 5 min
          agingThresholdMs: 6 * MIN, // override to 6 min
        },
      ],
      now: NOW,
    });
    // 10min > both overrides → STALE
    expect(report.sources[0]!.status).toBe("STALE");
  });
});

describe("resolveThresholds", () => {
  const baseProbe = {
    provider: "x",
    sourceKind: "y",
    fetchedAt: new Date(),
  };

  it("returns global defaults when no category + no override", () => {
    const { freshMs, agingMs } = resolveThresholds(baseProbe);
    expect(freshMs).toBe(30 * 60 * 1000);
    expect(agingMs).toBe(4 * 60 * 60 * 1000);
  });

  it("returns category budget when category is supplied (ODDS = 30min/4h)", () => {
    const { freshMs, agingMs } = resolveThresholds({
      ...baseProbe,
      category: "ODDS",
    });
    expect(freshMs).toBe(30 * 60 * 1000);
    expect(agingMs).toBe(4 * 60 * 60 * 1000);
  });

  it("returns category budget for INJURY_NEWS (6h/24h)", () => {
    const { freshMs, agingMs } = resolveThresholds({
      ...baseProbe,
      category: "INJURY_NEWS",
    });
    expect(freshMs).toBe(6 * 60 * 60 * 1000);
    expect(agingMs).toBe(24 * 60 * 60 * 1000);
  });

  it("inline override wins over both category + global defaults", () => {
    const { freshMs, agingMs } = resolveThresholds({
      ...baseProbe,
      category: "INJURY_NEWS",
      freshThresholdMs: 1000,
      agingThresholdMs: 2000,
    });
    expect(freshMs).toBe(1000);
    expect(agingMs).toBe(2000);
  });
});

// ── Route + page invariants (source-level scans, no fetch / no DB) ──
const repoRoot = resolve(__dirname, "..");
const ROUTE = resolve(repoRoot, "app/api/cockpit/source-health/route.ts");
const PAGE = resolve(repoRoot, "app/cockpit/source-health/page.tsx");
const LAYOUT = resolve(repoRoot, "app/cockpit/layout.tsx");

describe("/api/cockpit/source-health route", () => {
  const src = readFileSync(ROUTE, "utf8");

  it("dynamic = force-dynamic + admin-gated 403 + delegates to assessSourceHealth", () => {
    expect(src).toMatch(/dynamic\s*=\s*["']force-dynamic["']/);
    expect(src).toMatch(/role\s*!==\s*["']ADMIN["']/);
    expect(src).toMatch(/403/);
    expect(src).toMatch(/assessSourceHealth/);
  });

  it("rate-limits via checkRateLimit (10/min, fail-closed)", () => {
    expect(src).toMatch(/checkRateLimit/);
    expect(src).toMatch(/cockpit-source-health/);
    expect(src).toMatch(/failureMode:\s*["']fail-closed["']/);
    expect(src).toMatch(/maxRequests:\s*10/);
  });

  it("Cache-Control: no-store + no DB writes + no publishedAt anywhere", () => {
    expect(src).toMatch(/Cache-Control[^"']*no-store/);
    expect(src).not.toMatch(/db\.\w+\.(create|update|delete|upsert)\b/);
    expect(src).not.toMatch(/publishedAt\s*[:=]\s*new\s+Date/);
  });

  it("wraps the agent call in try/catch with a 500 envelope (no internal leak)", () => {
    expect(src).toMatch(/try\s*\{[\s\S]*assessSourceHealth[\s\S]*\}\s*catch/);
    expect(src).toMatch(/source-health-failed/);
    expect(src).toMatch(/500/);
  });

  it("DB read is opt-in on DATABASE_URL and tolerant of stub envs", () => {
    expect(src).toMatch(/DATABASE_URL/);
    expect(src).toMatch(/try\s*\{[\s\S]*sourceSnapshot[\s\S]*\}\s*catch/);
  });
});

describe("/cockpit/source-health page", () => {
  const src = readFileSync(PAGE, "utf8");
  const layout = readFileSync(LAYOUT, "utf8");

  it("declares metadata.robots.index = false (cockpit pattern)", () => {
    expect(src).toMatch(/robots:[\s\S]*index:\s*false/);
  });

  it("renders narrative + alerts + sources table from the API report", () => {
    expect(src).toMatch(/data-testid="source-health-narrative"/);
    expect(src).toMatch(/data-testid="source-health-alerts"/);
    expect(src).toMatch(/data-testid="source-health-table"/);
  });

  it("fetches the API with cache: no-store and forwards cookies", () => {
    expect(src).toMatch(/cache:\s*["']no-store["']/);
    expect(src).toMatch(/cookie/);
  });

  it("renders an error envelope without crashing when the API returns non-2xx", () => {
    expect(src).toMatch(/data-testid="source-health-error"/);
  });

  it("layout nav has the new /cockpit/source-health entry", () => {
    expect(layout).toMatch(/href:\s*["']\/cockpit\/source-health["']/);
    expect(layout).toMatch(/label:\s*["']Source health["']/);
  });
});

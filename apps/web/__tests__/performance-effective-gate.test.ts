import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * G2 — Effective performance gate on the PUBLIC headline surfaces.
 *
 * Defect class (Dispatch 3, queue item 2 — HONESTY BLOCKER): /performance and
 * /api/performance publish real win/loss/win-rate behind the bare
 * PERFORMANCE_STATS_ENABLED env flag, while the CalibrationPanel DIRECTLY
 * BELOW the headline numbers goes through resolveEffectivePerformanceGate()
 * (published ∩ eligibility GREEN). Once the env flag is on, the headline
 * numbers keep publishing after eligibility flips RED and
 * calibration-publish-policy auto-unpublish fires — the page would contradict
 * its own panel.
 *
 * Tripwire: with the env-flag gate ON and the effective gate RED, the
 * headline numbers MUST be suppressed (503 on the API; bootstrap state on the
 * page). Proven RED first against the pre-fix code, per Dispatch 3.
 *
 * Mocking pattern mirrors performance-min-sample-floor.test.ts
 * (executed-handler + vi.mock("@sports/db"), via its own cited precedent
 * picks-stale-kill-switch.test.ts).
 */

const mocks = vi.hoisted(() => ({
  minSettledPicksForLearning: 100,
  queryRaw: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  effective: vi.fn<
    () => Promise<{
      canExposePerformanceStats: boolean;
      calibrationPublished: boolean;
      eligibilityStatus: "GREEN" | "RED" | "UNKNOWN";
      operatorHint: string;
    }>
  >(),
}));

vi.mock("@sports/db", () => ({
  db: {
    $queryRaw: mocks.queryRaw,
  },
}));

vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@sports/prediction-engine")
  >();
  return {
    ...actual,
    getReadinessGates: () => ({
      ...actual.getReadinessGates(),
      canExposePerformanceStats: true, // env-flag gate ON — the defect precondition
      minSettledPicksForLearning: mocks.minSettledPicksForLearning,
      isBootstrapMode: false,
    }),
  };
});

vi.mock("@/lib/ops/effective-performance-gate", () => ({
  resolveEffectivePerformanceGate: mocks.effective,
}));

function gateClosed(): {
  canExposePerformanceStats: boolean;
  calibrationPublished: boolean;
  eligibilityStatus: "RED";
  operatorHint: string;
} {
  return {
    canExposePerformanceStats: false,
    calibrationPublished: false,
    eligibilityStatus: "RED",
    operatorHint: "Eligibility RED — performance claims stay dark.",
  };
}

/** Pre-aggregated (sport, result, count) rows — the shape db.$queryRaw returns. */
function aggRows(
  wins: number,
  losses: number,
  pushes: number,
  sportName = "NFL"
): Array<{ sport: string; result: string; count: number }> {
  const rows: Array<{ sport: string; result: string; count: number }> = [];
  if (wins > 0) rows.push({ sport: sportName, result: "WIN", count: wins });
  if (losses > 0) rows.push({ sport: sportName, result: "LOSS", count: losses });
  if (pushes > 0) rows.push({ sport: sportName, result: "PUSH", count: pushes });
  return rows;
}

async function callPerformance(): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  vi.resetModules();
  const mod = await import("@/app/api/performance/route");
  const req = {
    url: "https://example.com/api/performance?period=all-time",
    headers: { get: () => null },
  };
  const res = await mod.GET(req as unknown as Parameters<typeof mod.GET>[0]);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("G2 — /api/performance routes through the effective gate", () => {
  it("suppresses the numbers (503) when the env-flag gate is ON but eligibility is RED", async () => {
    mocks.effective.mockResolvedValue(gateClosed());
    mocks.queryRaw.mockResolvedValue(aggRows(66, 34, 0)); // numbers exist and would publish pre-fix

    const { status, body } = await callPerformance();

    expect(status).toBe(503);
    expect(body["eligibilityStatus"]).toBe("RED");
    expect(String(body["operatorHint"])).toContain("Eligibility RED");
    // The rates must not appear anywhere in the suppressed response.
    expect(JSON.stringify(body)).not.toMatch(/winRate/);
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it("still publishes when the effective gate is GREEN (env flag ON, eligibility GREEN)", async () => {
    mocks.effective.mockResolvedValue({
      canExposePerformanceStats: true,
      calibrationPublished: true,
      eligibilityStatus: "GREEN",
      operatorHint: "",
    });
    mocks.queryRaw.mockResolvedValue(aggRows(660, 340, 0)); // 1000 decided, well above the floor

    const { status, body } = await callPerformance();

    expect(status).toBe(200);
    const data = body["data"] as
      | { overall?: { winRate: number | null } }
      | undefined;
    expect(data?.overall).toBeDefined();
    expect(data?.overall?.winRate).not.toBeNull();
  });

  it("checks the effective gate BEFORE rate limiting and any data query (source-level)", () => {
    const routeSource = readFileSync(
      resolve(__dirname, "..", "app", "api", "performance", "route.ts"),
      "utf8"
    );
    const effectiveIdx = routeSource.indexOf("await resolveEffectivePerformanceGate()");
    const rateLimitIdx = routeSource.indexOf('consumeRateLimit("public-performance"');
    expect(effectiveIdx).toBeGreaterThan(-1);
    expect(rateLimitIdx).toBeGreaterThan(-1);
    expect(effectiveIdx).toBeLessThan(rateLimitIdx);
  });
});

describe("G2 — /performance page routes through the effective gate", () => {
  const pageSource = readFileSync(
    resolve(__dirname, "..", "app", "performance", "page.tsx"),
    "utf8"
  );

  it("imports resolveEffectivePerformanceGate", () => {
    expect(pageSource).toMatch(
      /import\s+\{[^}]*resolveEffectivePerformanceGate[^}]*\}\s+from\s+["']@\/lib\/ops\/effective-performance-gate["']/
    );
  });

  it("applies the effective gate before the headline data fetch (gate check precedes getPerformanceSummaries)", () => {
    const effectiveIdx = pageSource.indexOf("await resolveEffectivePerformanceGate()");
    const summariesIdx = pageSource.indexOf("getPerformanceSummaries(");
    expect(effectiveIdx).toBeGreaterThan(-1);
    expect(summariesIdx).toBeGreaterThan(-1);
    expect(effectiveIdx).toBeLessThan(summariesIdx);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function callRoute(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  vi.doMock("@/lib/data-sources/live-evidence", () => ({
    loadSourceLiveEvidence: async () => ({
      generatedAt: "2026-06-06T00:00:00.000Z",
      status: "live",
      summary: {
        liveDatasets: 5,
        requiredDatasets: 5,
        totalSourceRows: 196_809,
        usagePlayerStatsRows: 134_470,
        latestUsageSeason: 2024,
        latestUsageWeek: 18,
        latestWeekPlayerRows: 316,
        qbAgeRows: 16,
        cohortObservations: 12_490,
        qbAge34Sample: 1_979,
        qbAge34Lift: 0.078,
        qbAge34PValue: 0.000000003582,
        birthdayUsageObservations: 46_790,
        birthdayWindowObservations: 887,
        birthdayUsagePValue: 0.574723719331,
        careerMilestone50Observations: 640,
        careerMilestone50PValue: 0.260406112796,
        birthdayUsageConclusion: "not-publishable",
      },
      gates: {
        databaseWritesScheduled: false,
        scoringEnabled: false,
        publicationEnabled: false,
      },
      datasets: [
        {
          key: "player_stats_week",
          status: "live",
          rowCount: 134_470,
          scope: "all seasons",
          route: "/api/nflverse/usage-pulse",
        },
      ],
      routes: {
        usagePulse: "/api/nflverse/usage-pulse",
        qbAgeTrend: "/api/nflverse/qb-age-rb-trend",
        birthdayUsageTrend: "/api/nflverse/birthday-usage-trend",
        trendReadiness: "/api/trends/nflverse-readiness",
      },
      errors: [],
    }),
  }));
  const mod = await import("@/app/api/sources/catalog/route");
  const res = (await mod.GET()) as Response;
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/sources/catalog", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns the public source ledger without leaking configured env values", async () => {
    process.env["THE_ODDS_API_KEY"] = "super-secret-test-value";

    const { status, body } = await callRoute();
    expect(status).toBe(200);
    expect(body["success"]).toBe(true);

    const data = body["data"] as Record<string, unknown>;
    const summary = data["summary"] as Record<string, unknown>;
    const sources = data["sources"] as Array<Record<string, unknown>>;
    const providers = data["providers"] as Array<Record<string, unknown>>;
    const policy = data["policy"] as Record<string, unknown>;
    const liveEvidence = data["liveEvidence"] as Record<string, unknown>;
    const evidenceSummary = liveEvidence["summary"] as Record<string, unknown>;

    expect(summary["totalSources"]).toBe(sources.length);
    expect(summary["contextSources"]).toBeGreaterThan(0);
    expect(sources.some((source) => source["key"] === "scores24-reference")).toBe(true);
    expect(sources.some((source) => source["status"] === "permission-required")).toBe(true);
    expect(policy["exposesSecretValues"]).toBe(false);
    expect(policy["rowCountsIncluded"]).toBe(true);
    expect(policy["rowCountsDoNotMean"]).toMatch(/Database writes/);
    expect(evidenceSummary["usagePlayerStatsRows"]).toBe(134_470);
    expect(evidenceSummary["cohortObservations"]).toBe(12_490);
    expect(evidenceSummary["birthdayUsageConclusion"]).toBe("not-publishable");

    const oddsProvider = providers.find((provider) => provider["envVar"] === "THE_ODDS_API_KEY");
    expect(oddsProvider?.["configured"]).toBe(true);
    expect(JSON.stringify(body)).not.toContain("super-secret-test-value");
  });
});

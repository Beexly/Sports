import { beforeEach, describe, expect, it, vi } from "vitest";

describe("source live evidence", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("composes nflverse row proof without opening scoring or publication gates", async () => {
    vi.doMock("@/lib/trends/nflverse-readiness", () => ({
      loadNflverseTrendReadiness: async () => ({
        liveDatasetCount: 5,
        requiredDatasetCount: 5,
        totalSourceRows: 196_809,
        datasets: [
          {
            key: "snap_counts",
            status: "live",
            rowCount: 26_612,
            scope: "2025",
          },
        ],
      }),
    }));
    vi.doMock("@/lib/nflverse/usage-pulse", () => ({
      loadNflverseUsagePulse: async () => ({
        status: "live",
        sourceRows: 134_470,
        season: 2024,
        week: 18,
        latestWeekRows: 316,
        qbAgeRows: Array.from({ length: 16 }),
      }),
    }));
    vi.doMock("@/lib/nflverse/qb-age-rb-trend", () => ({
      loadQbAgeRbTrendReport: async () => ({
        status: "live",
        sourceRows: {
          playerStats: 134_470,
          players: 25_042,
          schedules: 7_548,
        },
        quality: {
          observationsUsed: 12_490,
        },
        trends: [
          {
            cohort: "QB age 34+",
            n: 1_979,
            relativeDelta: 0.077986,
            pValue: 0.0000000035816287713430484,
          },
        ],
      }),
    }));
    vi.doMock("@/lib/nflverse/birthday-usage-trend", () => ({
      loadBirthdayUsageTrendReport: async () => ({
        status: "live",
        quality: {
          observationsUsed: 46_790,
          birthdayWindowObservations: 887,
          careerMilestone50Observations: 640,
        },
        result: {
          pValue: 0.5747237193309958,
        },
        milestoneResult: {
          pValue: 0.26040611279596115,
        },
        conclusion: "not-publishable",
      }),
    }));

    const { loadSourceLiveEvidence } = await import("@/lib/data-sources/live-evidence");
    const evidence = await loadSourceLiveEvidence({ timeoutMs: 10 });

    expect(evidence.status).toBe("live");
    expect(evidence.summary.usagePlayerStatsRows).toBe(134_470);
    expect(evidence.summary.cohortObservations).toBe(12_490);
    expect(evidence.summary.qbAge34Sample).toBe(1_979);
    expect(evidence.summary.birthdayUsageObservations).toBe(46_790);
    expect(evidence.summary.birthdayWindowObservations).toBe(887);
    expect(evidence.summary.careerMilestone50Observations).toBe(640);
    expect(evidence.summary.birthdayUsageConclusion).toBe("not-publishable");
    expect(evidence.gates.databaseWritesScheduled).toBe(false);
    expect(evidence.gates.scoringEnabled).toBe(false);
    expect(evidence.gates.publicationEnabled).toBe(false);
    expect(evidence.datasets.some((dataset) => dataset.key === "player_stats_week")).toBe(true);
    expect(evidence.routes.qbAgeTrend).toBe("/api/nflverse/qb-age-rb-trend");
    expect(evidence.routes.birthdayUsageTrend).toBe("/api/nflverse/birthday-usage-trend");
  });
});

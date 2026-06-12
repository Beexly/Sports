import { describe, expect, it } from "vitest";
import { NFLVERSE_CATALOG, type NflverseDatasetKey } from "./nflverse-source.js";
import {
  STAT_DISTRIBUTION,
  datasetsForSystem,
  gatedModelDatasets,
  liveEdges,
  systemsForDataset,
  type StatSystem,
} from "./stat-distribution.js";

/**
 * LIVE edges verified by codebase audit (2026-06-12). Every LIVE claim in
 * STAT_DISTRIBUTION must appear here, and vice versa, so a new LIVE edge can
 * only land together with its audit evidence:
 *
 * PLAYERS_LAB (apps/web/lib/players/views.tsx → /players):
 *   player_stats_week — lib/nflverse/player-lab.ts, edge-signals.ts,
 *                       lib/intelligence/receiving-opportunity.ts
 *   rosters           — lib/nflverse/player-lab.ts
 *   snap_counts       — lib/nflverse/snap-share.ts
 *   ngs               — lib/nflverse/next-gen-stats.ts
 *   pfr_advstats      — lib/nflverse/pressure-coverage.ts
 *   combine           — lib/nflverse/combine.ts
 *   espn_qbr_week     — lib/nflverse/qbr.ts
 *   injuries          — lib/nflverse/injury-report.ts
 *
 * TRENDS (apps/web/app/trends/page.tsx):
 *   player_stats_week, players, schedules — lib/nflverse/qb-age-rb-trend.ts,
 *                       lib/nflverse/birthday-usage-trend.ts
 *   rosters, snap_counts — lib/trends/nflverse-readiness.ts default-plan probe
 *
 * SIGNALS, CONTENT, GALAXY_TWIN, PREDICTION_MODEL: zero nflverse consumers
 * found — no LIVE edges permitted.
 */
const VERIFIED_LIVE_EDGES: ReadonlyArray<readonly [NflverseDatasetKey, StatSystem]> = [
  ["player_stats_week", "PLAYERS_LAB"],
  ["rosters", "PLAYERS_LAB"],
  ["snap_counts", "PLAYERS_LAB"],
  ["ngs", "PLAYERS_LAB"],
  ["pfr_advstats", "PLAYERS_LAB"],
  ["combine", "PLAYERS_LAB"],
  ["espn_qbr_week", "PLAYERS_LAB"],
  ["injuries", "PLAYERS_LAB"],
  ["player_stats_week", "TRENDS"],
  ["players", "TRENDS"],
  ["schedules", "TRENDS"],
  ["rosters", "TRENDS"],
  ["snap_counts", "TRENDS"],
];

const ALL_SYSTEMS: ReadonlyArray<StatSystem> = [
  "PLAYERS_LAB",
  "TRENDS",
  "SIGNALS",
  "CONTENT",
  "GALAXY_TWIN",
  "PREDICTION_MODEL",
];

describe("stat distribution contract", () => {
  const catalogKeys = Object.keys(NFLVERSE_CATALOG) as NflverseDatasetKey[];

  it("covers EVERY nflverse catalog dataset — no stat is orphaned", () => {
    for (const key of catalogKeys) {
      expect(STAT_DISTRIBUTION[key], `missing distribution entry for ${key}`).toBeDefined();
    }
    // And no stale keys that fell out of the catalog.
    for (const key of Object.keys(STAT_DISTRIBUTION)) {
      expect(catalogKeys).toContain(key);
    }
    expect(Object.keys(STAT_DISTRIBUTION).length).toBe(catalogKeys.length);
  });

  it("gives every dataset at least one consuming system", () => {
    for (const key of catalogKeys) {
      expect(STAT_DISTRIBUTION[key].length, `${key} has no consuming systems`).toBeGreaterThanOrEqual(1);
    }
  });

  it("declares only known systems and statuses, with no duplicate system per dataset", () => {
    for (const key of catalogKeys) {
      const seen = new Set<StatSystem>();
      for (const edge of STAT_DISTRIBUTION[key]) {
        expect(ALL_SYSTEMS).toContain(edge.system);
        expect(["LIVE", "AVAILABLE", "FOUNDER_GATED"]).toContain(edge.status);
        expect(seen.has(edge.system), `${key} declares ${edge.system} twice`).toBe(false);
        seen.add(edge.system);
      }
    }
  });

  it("founder-gates EVERY prediction-model edge — never LIVE or AVAILABLE", () => {
    for (const key of catalogKeys) {
      for (const edge of STAT_DISTRIBUTION[key]) {
        if (edge.system === "PREDICTION_MODEL") {
          expect(edge.status, `${key} → PREDICTION_MODEL must be FOUNDER_GATED`).toBe("FOUNDER_GATED");
        }
      }
    }
  });

  it("claims LIVE only for audit-verified edges, and all verified edges are claimed", () => {
    const claimed = liveEdges().map((edge) => `${edge.dataset}→${edge.system}`).sort();
    const verified = VERIFIED_LIVE_EDGES.map(([dataset, system]) => `${dataset}→${system}`).sort();
    expect(claimed).toEqual(verified);
  });

  it("never claims a LIVE edge into SIGNALS, CONTENT, GALAXY_TWIN, or PREDICTION_MODEL (none exist today)", () => {
    for (const system of ["SIGNALS", "CONTENT", "GALAXY_TWIN", "PREDICTION_MODEL"] as const) {
      const live = datasetsForSystem(system).filter((entry) => entry.status === "LIVE");
      expect(live, `${system} has no verified live nflverse consumer`).toEqual([]);
    }
  });

  describe("helpers", () => {
    it("systemsForDataset returns the declared edges for snap_counts", () => {
      const result = systemsForDataset("snap_counts");
      expect(result).toBe(STAT_DISTRIBUTION.snap_counts);
      const systems = result.map((edge) => edge.system);
      expect(systems).toContain("PLAYERS_LAB");
      expect(systems).toContain("TRENDS");
      expect(systems).toContain("PREDICTION_MODEL");
      expect(result.find((edge) => edge.system === "PLAYERS_LAB")?.status).toBe("LIVE");
    });

    it("datasetsForSystem(PLAYERS_LAB) includes live player_stats_week and available depth_charts", () => {
      const lab = datasetsForSystem("PLAYERS_LAB");
      expect(lab.find((entry) => entry.dataset === "player_stats_week")?.status).toBe("LIVE");
      expect(lab.find((entry) => entry.dataset === "depth_charts")?.status).toBe("AVAILABLE");
      expect(lab.find((entry) => entry.dataset === "officials")).toBeUndefined();
    });

    it("gatedModelDatasets covers every dataset with a PREDICTION_MODEL edge", () => {
      const gated = gatedModelDatasets();
      const expected = catalogKeys.filter((key) =>
        STAT_DISTRIBUTION[key].some((edge) => edge.system === "PREDICTION_MODEL"),
      );
      expect([...gated].sort()).toEqual([...expected].sort());
      // Every catalog dataset is at least a gated model candidate.
      expect(gated.length).toBe(catalogKeys.length);
    });

    it("liveEdges entries all carry an evidence note", () => {
      for (const edge of liveEdges()) {
        expect(edge.note, `${edge.dataset}→${edge.system} LIVE edge missing evidence note`).toBeTruthy();
      }
    });
  });
});

/**
 * NFL STAT UNIVERSE — acceptance A–J.
 *
 * The manifest is trustworthy only if these invariants hold AND the guards bite on bad input. The
 * positive battery runs over the seeded manifest; the negative cases prove each rule actually rejects.
 */

import { describe, it, expect } from "vitest";
import { type TemporalFact, entityRef } from "@sports/data-intelligence";
import {
  type NflStatDefinition,
  SOURCES,
  NFL_STAT_MANIFEST,
  DERIVED_GSE_STATS,
  runFullAudit,
  forbiddenCantSatisfyProduction,
  roleStatsNeedUsage,
  dfsActionNeedsLicensedSalary,
  statsRequiringAcquisition,
  everyCategoryRepresented,
  compileStatAtDecision,
  PROVIDER_PORTFOLIOS,
  planCadence,
} from "../index.js";

describe("NFL Stat Universe — A–I invariants hold on the seeded manifest", () => {
  it("the full audit battery passes", () => {
    for (const result of runFullAudit()) {
      expect(result.ok, `${result.check} offenders: ${result.offenders.join(", ")}`).toBe(true);
    }
  });

  it("every one of the 28 categories is represented", () => {
    expect(everyCategoryRepresented().ok).toBe(true);
  });

  it("(D) paid-only stats are flagged for acquisition; free-backed stats are not", () => {
    const acq = statsRequiringAcquisition();
    expect(acq).toContain("pass_block_win_rate"); // only sportradar (paid)
    expect(acq).toContain("dfs_salary"); // fantasydata + sportsdataio (both paid)
    expect(acq).not.toContain("platform_projection"); // has sleeper (free)
  });

  it("(E) every derived GSE stat lists its required inputs", () => {
    expect(DERIVED_GSE_STATS.length).toBeGreaterThan(0);
    for (const s of DERIVED_GSE_STATS) expect((s.requiredInputs ?? []).length).toBeGreaterThan(0);
  });
});

describe("NFL Stat Universe — the guards bite on bad input", () => {
  it("(C) a production stat backed only by a forbidden source is rejected", () => {
    const bad: NflStatDefinition = {
      statKey: "scraped_role", displayName: "Scraped role", category: "ROLE_STATE", factTypes: ["snap_share"],
      grain: "player-week", legalSourceOptions: [SOURCES.draftkings_unofficial!], derivableByGSE: false,
      latencyNeed: "daily", decisionStatesSupported: [], maxAuthority: "PUBLIC_CARD", blockedSurfacesIfMissing: [], proofRisk: 0.3,
    };
    expect(forbiddenCantSatisfyProduction([bad]).ok).toBe(false);
  });

  it("(F) a public role stat with no usage fact type is rejected", () => {
    const bad: NflStatDefinition = {
      statKey: "role_no_usage", displayName: "Role w/o usage", category: "ROLE_STATE", factTypes: ["beat_report"],
      grain: "player-week", legalSourceOptions: [SOURCES.nflverse!], derivableByGSE: false,
      latencyNeed: "daily", decisionStatesSupported: [], maxAuthority: "PUBLIC_CARD", blockedSurfacesIfMissing: [], proofRisk: 0.3,
    };
    expect(roleStatsNeedUsage([bad]).ok).toBe(false);
  });

  it("(G) a DFS action stat with no licensed salary feed is rejected", () => {
    const bad: NflStatDefinition = {
      statKey: "dfs_no_license", displayName: "DFS w/o license", category: "DFS_MARKET", factTypes: ["dfs_salary"],
      grain: "fantasy-league-event", legalSourceOptions: [SOURCES.nflverse!], derivableByGSE: false,
      latencyNeed: "intraday", decisionStatesSupported: [], maxAuthority: "ACTION_RECOMMENDATION", blockedSurfacesIfMissing: [], proofRisk: 0.3,
    };
    expect(dfsActionNeedsLicensedSalary([bad]).ok).toBe(false);
  });
});

describe("NFL Stat Universe — (J) the compiler fails closed", () => {
  const DECISION = "2026-09-14T17:00:00Z";
  const base = {
    entityIds: [entityRef("player", "x")],
    endpointId: "ep",
    observedAt: "2026-09-14T15:00:00Z",
    fetchedAt: "2026-09-14T15:30:00Z",
    sourcePayloadHash: "h",
    confidence: 0.9,
  };

  it("credits a knowable, rights-clear, declared-type, production source", () => {
    const fact: TemporalFact = { ...base, factId: "ok", factType: "snap_share", value: { x: 1 }, sourceId: "nflverse", firstSeenByGseAt: "2026-09-14T15:30:00Z", rightsStatus: "FREE_OPEN" };
    expect(compileStatAtDecision("snap_share", fact, DECISION).credited).toBe(true);
  });

  it("refuses a fact first knowable AFTER the decision (future leakage)", () => {
    const fact: TemporalFact = { ...base, factId: "future", factType: "snap_share", value: { x: 1 }, sourceId: "nflverse", firstSeenByGseAt: "2026-09-14T18:30:00Z", rightsStatus: "FREE_OPEN" };
    expect(compileStatAtDecision("snap_share", fact, DECISION).credited).toBe(false);
  });

  it("refuses a forbidden source even when the fact is knowable", () => {
    const fact: TemporalFact = { ...base, factId: "dk", factType: "player_prop", value: { line: 50 }, sourceId: "draftkings_unofficial", firstSeenByGseAt: "2026-09-14T15:30:00Z", rightsStatus: "LICENSED" };
    expect(compileStatAtDecision("receiving_prop", fact, DECISION).credited).toBe(false);
  });

  it("refuses a fact whose type the stat does not declare", () => {
    const fact: TemporalFact = { ...base, factId: "wrong", factType: "weather", value: {}, sourceId: "nflverse", firstSeenByGseAt: "2026-09-14T15:30:00Z", rightsStatus: "FREE_OPEN" };
    expect(compileStatAtDecision("snap_share", fact, DECISION).credited).toBe(false);
  });
});

describe("NFL Stat Universe — portfolios + cadence are plans, never purchases", () => {
  it("Bootstrap Free is not owner-gated; spending tiers are", () => {
    const free = PROVIDER_PORTFOLIOS.find((p) => p.name === "Bootstrap Free")!;
    const market = PROVIDER_PORTFOLIOS.find((p) => p.name === "Market-Calibration Minimum")!;
    expect(free.ownerGated).toBe(false);
    expect(market.ownerGated).toBe(true);
  });

  it("shock cadence observes more often than a normal week", () => {
    expect(planCadence("shock").intervalMinutes).toBeLessThan(planCadence("normal_week").intervalMinutes);
  });
});

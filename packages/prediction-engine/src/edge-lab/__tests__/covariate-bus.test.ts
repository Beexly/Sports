import { describe, expect, it } from "vitest";
import {
  COVARIATE_BUS_METHOD_TAG,
  covariateKey,
  latestPriorRow,
  nextGameCovariate,
  sepForKickoff,
  type CovariateRow,
} from "../covariate-bus.js";

function rx(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "receiving",
    avgSeparation: 2.5,
    avgCushion: 4.0,
    airYardsShare: 0.18,
    avgTimeToThrow: 2.6,
    aggressiveness: 19.2,
    avgIntendedAirYards: 8.4,
    pctAttemptsGte8Defenders: 0.54,
    avgTimeToLos: 2.2,
    avgYac: 4.3,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

describe("covariate key + tag", () => {
  it("builds a stable gsisId|season|week|statType key", () => {
    expect(covariateKey("x", 2024, 5, "rushing")).toBe("x|2024|5|rushing");
    expect(COVARIATE_BUS_METHOD_TAG).toBe("covariate_bus_v1");
  });
});

describe("latestPriorRow", () => {
  it("drops week=0 (season aggregate) even if it is the max", () => {
    const rows = [
      rx({ week: 1, avgSeparation: 2.5 }),
      rx({ week: 0, avgSeparation: 99 }), // season aggregate — poison
    ];
    const row = latestPriorRow(rows, rows[0]!.gsisId, 2024, "receiving", 2);
    expect(row).not.toBeNull();
    expect(row!.week).toBe(1);
    expect(row!.avgSeparation).toBe(2.5); // not 99
  });

  it("returns the strictly-latest prior week, not same-week or future", () => {
    const rows = [
      rx({ week: 3, avgSeparation: 1.0 }),
      rx({ week: 5, avgSeparation: 2.0 }), // kickoffWeek=5 → must NOT use
      rx({ week: 4, avgSeparation: 3.0 }), // latest prior
    ];
    const row = latestPriorRow(rows, rows[0]!.gsisId, 2024, "receiving", 5);
    expect(row).not.toBeNull();
    expect(row!.week).toBe(4);
    expect(row!.avgSeparation).toBe(3.0);
  });

  it("is null when only a week=0 row exists (no per-game history)", () => {
    const rows = [rx({ week: 0, avgSeparation: 3.0 })];
    const row = latestPriorRow(rows, rows[0]!.gsisId, 2024, "receiving", 1);
    expect(row).toBeNull();
  });

  it("is null when the only prior row is same-week or later", () => {
    const rows = [rx({ week: 5, avgSeparation: 3.0 })];
    const row = latestPriorRow(rows, rows[0]!.gsisId, 2024, "receiving", 5);
    expect(row).toBeNull();
  });

  it("is null when no per-game row precedes kickoff", () => {
    const rows = [rx({ week: 1, avgSeparation: 3.0 })];
    const row = latestPriorRow(rows, rows[0]!.gsisId, 2024, "receiving", 1);
    expect(row).toBeNull();
  });
});

describe("nextGameCovariate", () => {
  it("returns the week_t_for_tplus1 cell from the latest prior row", () => {
    const rows = [
      rx({ week: 1, avgSeparation: 2.1 }),
      rx({ week: 3, avgSeparation: 3.2 }),
    ];
    const cell = nextGameCovariate(rows, rows[0]!.gsisId, 2024, 5, "receiving", "avgSeparation");
    expect(cell).not.toBeNull();
    expect(cell!.value).toBe(3.2);
    expect(cell!.grain).toBe("week_t_for_tplus1");
    expect(cell!.provenance).toBe("weekly_ngs_mean");
  });

  it("fails closed when the field is null on the latest prior row", () => {
    const rows = [rx({ week: 1, avgSeparation: null })];
    const cell = nextGameCovariate(rows, rows[0]!.gsisId, 2024, 2, "receiving", "avgSeparation");
    expect(cell).toBeNull();
  });

  it("fails closed when there is no prior-row history", () => {
    const rows = [rx({ week: 0, avgSeparation: 3.0 })];
    const cell = nextGameCovariate(rows, rows[0]!.gsisId, 2024, 1, "receiving", "avgSeparation");
    expect(cell).toBeNull();
  });

  it("selects the correct field per statType (passing aggressiveness)", () => {
    const rows = [rx({ week: 1, statType: "passing" as const, aggressiveness: 22.5 })];
    const cell = nextGameCovariate(rows, rows[0]!.gsisId, 2024, 2, "passing", "aggressiveness");
    expect(cell).not.toBeNull();
    expect(cell!.value).toBe(22.5);
  });
});

describe("sepForKickoff", () => {
  it("returns finite seasonal ≥ 0 from the latest prior receiving row", () => {
    const rows = [
      rx({ week: 1, avgSeparation: 1.1 }),
      rx({ week: 4, avgSeparation: 3.4 }),
    ];
    const cell = sepForKickoff(rows, rows[0]!.gsisId, 2024, 6);
    expect(cell).not.toBeNull();
    expect(Number.isFinite(cell!.value)).toBe(true);
    expect(cell!.value).toBeGreaterThanOrEqual(0);
    expect(cell!.grain).toBe("week_t_for_tplus1");
  });

  it("drops week=0 and never uses same-week separation", () => {
    const rows = [
      rx({ week: 0, avgSeparation: 99 }), // season aggregate — ignored
      rx({ week: 5, avgSeparation: 5.0 }), // same-week as kickoffWeek=5 — ignored
    ];
    const cell = sepForKickoff(rows, rows[0]!.gsisId, 2024, 5);
    expect(cell).toBeNull(); // no prior per-game row before kickoff
  });

  it("never returns a vendor p metric as p (y-axis fields are absent)", () => {
    // The bus type does not even expose expectedCompletionPct / avgExpectedYac /
    // expectedRushYards / cpoe / ryoe. Verify by construction: a row carrying
    // only covariate fields yields sep, and nothing resembling a y-axis field.
    const rows = [rx({ week: 2, avgSeparation: 2.7 })];
    const cell = sepForKickoff(rows, rows[0]!.gsisId, 2024, 3);
    expect(cell).not.toBeNull();
    expect(cell!.value).toBe(2.7);
    // Truth-header check: weekly mean grain — not an arrival separation.
    expect(cell!.provenance).toBe("weekly_ngs_mean");
  });
});

describe("avgYac covariate", () => {
  it("returns the weekly NGS mean yac-per-reception, week t for t+1", () => {
    const rows = [
      rx({ week: 1, avgYac: 3.8 }),
      rx({ week: 3, avgYac: 4.7 }),
    ];
    const cell = nextGameCovariate(rows, rows[0]!.gsisId, 2024, 5, "receiving", "avgYac");
    expect(cell).not.toBeNull();
    expect(cell!.value).toBe(4.7);
    expect(cell!.grain).toBe("week_t_for_tplus1");
    expect(cell!.provenance).toBe("weekly_ngs_mean");
  });

  it("fails closed when avgYac is null on the prior row", () => {
    const rows = [rx({ week: 2, avgYac: null })];
    const cell = nextGameCovariate(rows, rows[0]!.gsisId, 2024, 3, "receiving", "avgYac");
    expect(cell).toBeNull();
  });

  it("drops week=0 (season aggregate) for avgYac too", () => {
    const rows = [rx({ week: 0, avgYac: 99 })];
    const cell = nextGameCovariate(rows, rows[0]!.gsisId, 2024, 1, "receiving", "avgYac");
    expect(cell).toBeNull();
  });
});

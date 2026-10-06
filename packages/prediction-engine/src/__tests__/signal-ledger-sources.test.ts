import { describe, it, expect } from "vitest";
import {
  projectPlayerGameStats,
  projectSnapCounts,
  projectNextGenStats,
  projectInjuries,
  projectAllSources,
  explainProjection,
  type AnchorTable,
  type PlayerGameStatRow,
  type SnapCountRow,
  type NextGenStatRow,
  type InjuryRow,
} from "../signal-ledger-sources.js";

const AT = new Date("2026-09-20T12:00:00.000Z");
const OLD = new Date("2025-09-20T12:00:00.000Z");

// Anchors are MEASURED league baselines, supplied by the caller. anchor 0 /
// spread 1 makes the expected normalized value trivially checkable without
// hiding the arithmetic: normalizeReading divides by 2*spread.
const ANCHORS: AnchorTable = {
  "pgs.target_share": { anchor: 0.2, spread: 0.1 },
  "pgs.fantasy_ppr": { anchor: 10, spread: 5 },
  "pgs.passing_epa": { anchor: 0, spread: 0.1 },
  "pgs.rushing_epa": { anchor: 0, spread: 0.05 },
  "pgs.receiving_epa": { anchor: 0, spread: 0.05 },
  "snap.offense_pct": { anchor: 0.5, spread: 0.3 },
  "snap.st_pct": { anchor: 0.1, spread: 0.1 },
  "snap.defense_pct": { anchor: 0, spread: 0.3 },
  "ngs.receiving.cpoe": { anchor: 0, spread: 0.1 },
  "ngs.receiving.avg_separation": { anchor: 1.5, spread: 0.5 },
  "injury.availability": { anchor: 5, spread: 2 },
};

const pgs = (over: Partial<PlayerGameStatRow> = {}): PlayerGameStatRow => ({
  playerId: "p1",
  season: 2026,
  week: 1,
  targetShare: 0.3,
  fantasyPointsPpr: 20,
  passingEpa: null,
  rushingEpa: null,
  receivingEpa: 0.1,
  fetchedAt: AT,
  ...over,
});

const snap = (over: Partial<SnapCountRow> = {}): SnapCountRow => ({
  playerId: "p1",
  season: 2026,
  week: 1,
  offensePct: 0.8,
  stPct: 0.2,
  defensePct: null,
  fetchedAt: AT,
  ...over,
});

const ngs = (over: Partial<NextGenStatRow> = {}): NextGenStatRow => ({
  gsisId: "g1",
  season: 2026,
  week: 1,
  statType: "receiving",
  cpoe: 0.05,
  avgSeparation: 2.0,
  avgYacAboveExpectation: null,
  expectedCompletionPct: null,
  completionPct: null,
  avgAirYardsToSticks: null,
  fetchedAt: AT,
  ...over,
});

const inj = (over: Partial<InjuryRow> = {}): InjuryRow => ({
  playerId: "p1",
  gsisId: null,
  season: 2026,
  week: 1,
  reportStatus: "Questionable",
  practiceStatus: null,
  fetchedAt: AT,
  ...over,
});

describe("projectPlayerGameStats", () => {
  it("emits one candidate per non-null metric, keyed and anchored separately", () => {
    const out = projectPlayerGameStats([pgs()], ANCHORS);
    const keys = out.map((c) => c.key).sort();
    expect(keys).toEqual(["pgs.fantasy_ppr", "pgs.receiving_epa", "pgs.target_share"]);
  });

  it("normalizes against the supplied anchor, not a hardcoded league average", () => {
    const out = projectPlayerGameStats([pgs({ targetShare: 0.3 })], ANCHORS);
    const ts = out.find((c) => c.key === "pgs.target_share");
    // (0.3 - 0.2) / (2 * 0.1) = 0.5
    expect(ts?.value).toBeCloseTo(0.5, 10);
  });

  it("refuses to emit a metric with no measured anchor rather than voting neutral", () => {
    // Drop the one anchor this row would need; the metric has a real value.
    const { "pgs.passing_epa": _dropped, ...partial } = ANCHORS;
    const out = projectPlayerGameStats([pgs({ passingEpa: 0.2 })], partial);
    expect(out.map((c) => c.key)).not.toContain("pgs.passing_epa");
  });

  it("still emits the anchored metrics from that same row", () => {
    const { "pgs.passing_epa": _dropped, ...partial } = ANCHORS;
    const out = projectPlayerGameStats([pgs({ passingEpa: 0.2 })], partial);
    expect(out.map((c) => c.key)).toContain("pgs.receiving_epa");
  });

  it("DROPS everything when the anchor table is empty — never defaults an anchor", () => {
    expect(projectPlayerGameStats([pgs()], {})).toEqual([]);
  });

  it("skips null metrics instead of coercing them to zero", () => {
    const out = projectPlayerGameStats([pgs({ targetShare: null, fantasyPointsPpr: null, receivingEpa: null })], ANCHORS);
    expect(out).toEqual([]);
  });

  it("carries the row's own fetchedAt as capturedAt, never the wall clock", () => {
    const out = projectPlayerGameStats([pgs({ fetchedAt: OLD })], ANCHORS);
    expect(out[0]?.capturedAt).toBe(OLD.toISOString());
  });

  it("propagates season/week so a caller can scope by game", () => {
    const out = projectPlayerGameStats([pgs({ season: 2025, week: 4 })], ANCHORS);
    expect(out[0]?.season).toBe(2025);
    expect(out[0]?.week).toBe(4);
  });
});

describe("projectSnapCounts", () => {
  it("DROPS a row with no resolved player instead of keying on a display name", () => {
    const out = projectSnapCounts([snap({ playerId: null })], ANCHORS);
    expect(out).toEqual([]);
  });

  it("anchors offense and special-teams shares independently", () => {
    const out = projectSnapCounts([snap()], ANCHORS);
    const off = out.find((c) => c.key === "snap.offense_pct");
    const st = out.find((c) => c.key === "snap.st_pct");
    expect(off?.value).toBeCloseTo(0.5, 10); // (0.8-0.5)/(2*0.3)
    expect(st?.value).toBeCloseTo(0.5, 10); // (0.2-0.1)/(2*0.1)
  });
});

describe("projectNextGenStats", () => {
  it("namespaces the key by statType so two populations never share one scale", () => {
    const out = projectNextGenStats([ngs({ statType: "receiving" })], ANCHORS);
    expect(out[0]?.key).toBe("ngs.receiving.cpoe");
  });

  it("emits nothing for a statType with no measured anchors", () => {
    const out = projectNextGenStats([ngs({ statType: "passing" })], ANCHORS);
    expect(out).toEqual([]);
  });

  it("uses gsisId as the entity", () => {
    const out = projectNextGenStats([ngs({ gsisId: "00-0033873" })], ANCHORS);
    expect(out[0]?.entityId).toBe("00-0033873");
  });
});

describe("projectInjuries", () => {
  it("prefers practice status over the earlier report", () => {
    // Out = 0, Full = 5. Practice wins, so this is the healthy reading.
    const out = projectInjuries([inj({ reportStatus: "Out", practiceStatus: "Full" })], ANCHORS);
    expect(out[0]?.value).toBeCloseTo(0, 10); // (5-5)/(2*2) = 0
  });

  it("falls back to report status when practice is absent", () => {
    const out = projectInjuries([inj({ reportStatus: "Out", practiceStatus: null })], ANCHORS);
    expect(out[0]?.value).toBeCloseTo(-1, 10); // (0-5)/(2*2) = -1.25 clamped to -1
  });

  it("DROPS an unrecognized status instead of treating it as healthy", () => {
    expect(projectInjuries([inj({ reportStatus: "Sidelined for business", practiceStatus: null })], ANCHORS)).toEqual([]);
  });

  it("DROPS a row with neither playerId nor gsisId rather than keying on name", () => {
    expect(projectInjuries([inj({ playerId: null, gsisId: null })], ANCHORS)).toEqual([]);
  });

  it("resolves gsisId when playerId is null", () => {
    const out = projectInjuries([inj({ playerId: null, gsisId: "g9" })], ANCHORS);
    expect(out[0]?.entityId).toBe("g9");
  });

  it("carries the highest-confidence category of the four, since a report is a fact", () => {
    const out = projectInjuries([inj()], ANCHORS);
    expect(out[0]?.confidence).toBeGreaterThan(0.9);
  });
});

describe("projectAllSources", () => {
  it("concatenates every populated source", () => {
    const out = projectAllSources(
      { playerGameStats: [pgs()], snapCounts: [snap()], nextGenStats: [ngs()], injuries: [inj()] },
      ANCHORS,
    );
    expect(out.length).toBe(3 + 2 + 2 + 1);
  });

  it("treats an absent source as empty, not as an error", () => {
    expect(projectAllSources({}, ANCHORS)).toEqual([]);
  });
});

describe("explainProjection", () => {
  it("names the key that has rows but no measured anchor", () => {
    const { "pgs.receiving_epa": _dropped, ...partial } = ANCHORS;
    const out = projectPlayerGameStats([pgs()], partial);
    const report = explainProjection(out, { "pgs.receiving_epa": 500 }, partial);
    expect(report.missingAnchors).toEqual(["pgs.receiving_epa"]);
    expect(report.emitted).toBe(2); // target_share + fantasy_ppr survived
  });

  it("reports an empty table as empty, not as a missing anchor", () => {
    // The distinction that matters: zero rows and zero anchors have identical
    // output, so the reason has to come from the INPUT counts.
    const report = explainProjection([], { "pgs.receiving_epa": 0 }, ANCHORS);
    expect(report.missingAnchors).toEqual([]);
    expect(report.inputCounts["pgs.receiving_epa"]).toBe(0);
  });

  it("does not name an anchored key even when the table is full", () => {
    const out = projectPlayerGameStats([pgs()], ANCHORS);
    const report = explainProjection(out, { "pgs.target_share": 5000 }, ANCHORS);
    expect(report.missingAnchors).toEqual([]);
    expect(report.emitted).toBe(3);
  });
});

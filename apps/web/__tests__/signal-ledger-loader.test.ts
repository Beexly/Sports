import { describe, it, expect } from "vitest";
import { loadSignalLedger, LEDGER_KEYS } from "@/lib/ops/signal-ledger-loader";
import {
  projectPlayerGameStats,
  projectSnapCounts,
  projectNextGenStats,
  projectInjuries,
  type AnchorTable,
} from "@sports/prediction-engine";

/**
 * Two jobs. One pins the loader against fakes; the other pins the KEYS.
 *
 * The key test is the one that matters. A census driven by a key the adapter
 * never emits reports "insufficient-rows" forever, which in the ops report is
 * indistinguishable from a dead producer. That failure is silent and would
 * survive every other test in this file — and it already happened once:
 * `ngs.cpoe` in the loader versus `ngs.passing.cpoe` in the adapter.
 */

/** A fresh instant per row: no shared mutable Date crosses a test boundary. */
const now = (): Date => new Date("2026-09-27T12:00:00.000Z");
const ramp = (n: number, base: number, step: number): number[] =>
  Array.from({ length: n }, (_, i) => base + i * step);

function fakeDb(overrides: Record<string, unknown> = {}) {
  return {
    playerGameStat: {
      findMany: async () =>
        ramp(40, 0.2, 0.01).map((v, i) => ({
          playerId: `p${i % 8}`,
          season: 2026,
          week: 1,
          targetShare: v,
          fantasyPointsPpr: 5 + v,
          passingEpa: null,
          rushingEpa: null,
          receivingEpa: 0.05 + v / 100,
          fetchedAt: now(),
        })),
    },
    snapCount: {
      findMany: async () =>
        ramp(40, 0.4, 0.01).map((v, i) => ({
          playerId: `p${i % 8}`,
          pfrPlayerId: `x${i % 8}`,
          season: 2026,
          week: 1,
          offensePct: v,
          stPct: v / 2,
          defensePct: null,
          fetchedAt: now(),
        })),
    },
    nextGenStat: {
      findMany: async () =>
        ramp(40, 0, 0.01).map((v) => ({
          gsisId: `g${v}`,
          season: 2026,
          week: 1,
          statType: "passing",
          cpoe: v,
          avgSeparation: null,
          avgYacAboveExpectation: null,
          avgAirYardsToSticks: 8 + v,
          fetchedAt: now(),
        })),
    },
    injury: {
      findMany: async () => [
        { playerId: "p1", gsisId: null, season: 2026, week: 1, reportStatus: "Out", practiceStatus: null, fetchedAt: now() },
        { playerId: "p2", gsisId: null, season: 2026, week: 1, reportStatus: null, practiceStatus: "Full", fetchedAt: now() },
      ],
    },
    ...overrides,
  } as never;
}

describe("loadSignalLedger", () => {
  it("reports rows read per table", async () => {
    const r = await loadSignalLedger(fakeDb());
    expect(r.rowsRead).toEqual({
      playerGameStats: 40,
      snapCounts: 40,
      nextGenStats: 40,
      injuries: 2,
    });
  });

  it("projects candidates once the census supports the keys", async () => {
    const r = await loadSignalLedger(fakeDb(), { minCensusRows: 30 });
    expect(r.candidates.length).toBeGreaterThan(0);
  });

  it("produces ZERO measured candidates below the census floor", async () => {
    const r = await loadSignalLedger(fakeDb(), { minCensusRows: 10_000 });
    const measured = Object.keys(r.anchors).filter((k) => k !== "injury.availability");
    expect(measured).toEqual([]);
    // Injury is the one DECLARED scale, so it still yields rows.
    expect(r.candidates.every((c) => c.key === "injury.availability")).toBe(true);
  });

  it("labels a below-floor key as a MEASURED shortage, not a dead producer", async () => {
    const r = await loadSignalLedger(fakeDb(), { minCensusRows: 10_000 });
    const target = r.census.entries.find((e) => e.key === "pgs.target_share");
    expect(target?.status).toBe("insufficient-rows");
    expect(target?.n).toBe(40); // it WAS observed — the floor refused it
  });

  it("never writes: the loader exposes no mutation surface", async () => {
    const r = await loadSignalLedger(fakeDb());
    expect(Object.keys(r).sort()).toEqual([
      "anchors",
      "candidates",
      "census",
      "censusText",
      "observations",
      "rowsRead",
    ]);
  });
});

describe("LEDGER_KEYS matches what the adapters actually emit", () => {
  const everything = new Proxy({} as Record<string, { anchor: number; spread: number }>, {
    get: () => ({ anchor: 0, spread: 1 }),
  }) as AnchorTable;

  it("covers every key the four adapters can emit", () => {
    const emitted = new Set<string>();

    for (const c of projectPlayerGameStats(
      [{ playerId: "p1", season: 2026, week: 1, targetShare: 0.2, fantasyPointsPpr: 5, passingEpa: 0.1, rushingEpa: null, receivingEpa: 0.1, fetchedAt: now().toISOString() }],
      everything,
    )) emitted.add(c.key);

    for (const c of projectSnapCounts(
      [{ playerId: "p1", pfrPlayerId: null, season: 2026, week: 1, offensePct: 0.5, stPct: 0.2, defensePct: 0.3, fetchedAt: now().toISOString() }],
      everything,
    )) emitted.add(c.key);

    for (const c of projectNextGenStats(
      [
        { gsisId: "g1", season: 2026, week: 1, statType: "passing", cpoe: 0.1, avgSeparation: null, avgYacAboveExpectation: null, avgAirYardsToSticks: 8, fetchedAt: now().toISOString() },
        { gsisId: "g2", season: 2026, week: 1, statType: "receiving", cpoe: null, avgSeparation: 2.1, avgYacAboveExpectation: 0.4, avgAirYardsToSticks: null, fetchedAt: now().toISOString() },
        { gsisId: "g3", season: 2026, week: 1, statType: "rushing", cpoe: null, avgSeparation: null, avgYacAboveExpectation: 0.2, avgAirYardsToSticks: null, fetchedAt: now().toISOString() },
      ],
      everything,
    )) emitted.add(c.key);

    for (const c of projectInjuries(
      [{ playerId: "p1", gsisId: null, season: 2026, week: 1, reportStatus: "Out", practiceStatus: null, fetchedAt: now().toISOString() }],
      everything,
    )) emitted.add(c.key);

    expect([...emitted].filter((k) => !LEDGER_KEYS.includes(k))).toEqual([]);
  });

  it("lists no key the loader can never feed", () => {
    const feedable = new Set([
      "pgs.target_share", "pgs.fantasy_ppr", "pgs.passing_epa", "pgs.rushing_epa", "pgs.receiving_epa",
      "snap.offense_pct", "snap.st_pct", "snap.defense_pct",
      "ngs.passing.cpoe", "ngs.passing.avg_separation", "ngs.passing.yac_above_expectation", "ngs.passing.air_yards_to_sticks",
      "ngs.receiving.cpoe", "ngs.receiving.avg_separation", "ngs.receiving.yac_above_expectation", "ngs.receiving.air_yards_to_sticks",
      "ngs.rushing.cpoe", "ngs.rushing.avg_separation", "ngs.rushing.yac_above_expectation", "ngs.rushing.air_yards_to_sticks",
      "injury.availability",
    ]);;
    expect(LEDGER_KEYS.filter((k) => !feedable.has(k))).toEqual([]);
  });
});

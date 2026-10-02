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
          passingEpa: 0.1 + v,
          rushingEpa: 0.05 + v,
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
          defensePct: 0.3 + v,
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

  it("lists no key the loader can never feed", async () => {
    // DERIVED, NOT TYPED BY HAND. The previous version declared its own
    // `feedable` set inline, so it compared LEDGER_KEYS against a list a human
    // typed — and passed 7/7 while `ngs.rushing.*` (four keys) was emitted by
    // nothing in the repo. It could catch a typo; it could never catch a key
    // the loader lists but does not produce, which is the exact failure its own
    // header says this file exists to prevent.
    //
    // This drives the REAL loader with a fixture large enough to clear
    // `censusAnchors`' own MIN_CENSUS_ROWS floor (30). That floor is the reason a
    // small fixture emits no NGS key at all: `emit()` returns null without a
    // measured anchor, and the census only builds one past 30 rows. So the
    // fixture supplies 40 per statType. `minCensusRows` is NOT lowered to make
    // this pass — that would be loosening a floor to satisfy a test.
    const perType = ramp(40, 0, 0.001);
    const r = await loadSignalLedger(
      fakeDb({
        nextGenStat: {
          findMany: async () =>
            (["passing", "receiving", "rushing"] as const).flatMap((statType) =>
              perType.map((v) => ({
                gsisId: `g-${statType}-${v}`,
                season: 2026,
                week: 1,
                statType,
                cpoe: v,
                avgSeparation: 0.1 + v,
                avgYacAboveExpectation: 0.2 + v,
                avgAirYardsToSticks: 8 + v,
                fetchedAt: now(),
              })),
            ),
        },
      }),
    );
    const emitted = new Set(r.candidates.map((c) => c.key));
    // Negative control: this must FAIL on an empty projection, or the assertion
    // below is vacuous — which is how the line-archive suite passed for a month.
    expect(emitted.size).toBeGreaterThan(10);
    expect(LEDGER_KEYS.filter((k) => !emitted.has(k))).toEqual([]);
  });
});

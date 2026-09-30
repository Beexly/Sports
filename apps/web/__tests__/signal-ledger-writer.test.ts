/**
 * The `signals` writer: it must persist MEASURED values, refuse to invent
 * magnitudes, and never silently truncate.
 *
 * WHY. The `signals` table is the prop pipeline's fuel (spec item 4) and had
 * zero writers in the entire repo. A writer for it is only acceptable if every
 * value it persists is a real column from a real source row, because a
 * fabricated reading here would flow into a published projection later.
 */

import { describe, it, expect } from "vitest";
import {
  projectSignalCandidates,
  writeSignalCandidates,
  encodeInjuryAvailability,
} from "@/lib/ops/signal-ledger-writer";
import { normalizeWithScale } from "@sports/prediction-engine/src/signal-scale-fit";
import { signalScaleFor } from "@sports/prediction-engine/src/signal-scale-table";
import type { SignalWriteCandidate } from "@/lib/ops/signal-ledger-writer-types";

/** The candidate rows, unwrapped from the projection's { candidates, dropped }. */
const candidates = (i: Parameters<typeof projectSignalCandidates>[0]) =>
  projectSignalCandidates(i).candidates;

const NOW = new Date("2026-09-27T12:00:00.000Z");

function input(over: Partial<Parameters<typeof projectSignalCandidates>[0]> = {}) {
  return {
    playerGameStats: [
      {
        playerId: "p1",
        season: 2025,
        week: 3,
        targetShare: 0.284,
        fantasyPointsPpr: 18.5,
        passingEpa: null,
        rushingEpa: 0.041,
        receivingEpa: 0.077,
        fetchedAt: NOW,
      },
    ],
    snapCounts: [
      { playerId: "p1", season: 2025, week: 3, offensePct: 0.91, stPct: 0.33, defensePct: 0.02, fetchedAt: NOW },
    ],
    nextGenStats: [
      {
        gsisId: "00-003485",
        season: 2025,
        week: 3,
        statType: "receiving",
        cpoe: 0.051,
        avgSeparation: 3.2,
        avgYacAboveExpectation: 0.31,
        avgAirYardsToSticks: 9.4,
        fetchedAt: NOW,
      },
    ],
    injuries: [
      { playerId: "p1", gsisId: "00-003485", season: 2025, week: 3, reportStatus: "Out", practiceStatus: "DNP", fetchedAt: NOW },
      { playerId: null, gsisId: null, season: 2025, week: 3, reportStatus: "Out", practiceStatus: "DNP", fetchedAt: NOW },
    ],
    ...over,
  };
}

describe("projectSignalCandidates", () => {
  it("emits one row per MEASURED column and none for a null", () => {
    const out = candidates(input());
    const keys = out.map((c) => c.key).sort();

    // passingEpa is null on p1, so it must NOT appear. Everything else does.
    expect(keys).toContain("pgs.target_share");
    expect(keys).toContain("pgs.fantasy_ppr");
    expect(keys).toContain("pgs.receiving_epa");
    expect(keys).toContain("snap.offense_pct");
    expect(keys).toContain("ngs.cpoe");
    expect(keys).toContain("injury.availability");
    expect(keys.some((k) => k === "pgs.passing_epa")).toBe(false);
  });

  it("keeps valueRaw as the source column VERBATIM and normalizes value from it", () => {
    const out = candidates(input());
    const target = out.find((c) => c.key === "pgs.target_share");
    expect(target).toBeDefined();
    // The anti-fabrication property survives the normalization: valueRaw is
    // still byte-identical to the column that exists in the source row, so the
    // transformation stays auditable and reversible.
    expect(target!.valueRaw).toBe(0.284);
    // `value` is now the shared-scale reading, derived from that same column
    // with the key's measured anchor/spread. (It used to be the raw 0.284,
    // which is what made a composite over ten different units meaningless.)
    expect(target!.value).not.toBe(0.284);
    expect(target!.value).toBeCloseTo(
      normalizeWithScale(0.284, signalScaleFor("pgs.target_share")),
      12,
    );
    // And it lands on the shared scale, not on the raw unit.
    expect(Math.abs(target!.value)).toBeLessThanOrEqual(1);
  });

  it("carries the FITTED per-key weight, not a uniform 1", () => {
    const out = candidates(input());
    expect(out.length).toBeGreaterThan(0);
    const weights = new Set(out.map((c) => c.weight));
    // The whole point: weights must DIFFER across keys. A single shared value
    // here is the regression this test exists to catch.
    expect(weights.size).toBeGreaterThan(1);
    for (const c of out) {
      expect(c.weight).toBe(signalScaleFor(c.key)!.weight);
      // 1.0 means "this is a real measurement", NOT "this is proven predictive".
      expect(c.confidence).toBe(1);
    }
  });

  it("encodes injury availability as a documented ordinal, not a severity", () => {
    const out = candidates(input());
    const inj = out.filter((c) => c.key === "injury.availability");
    expect(inj.length).toBe(1);
    expect(inj[0]!.valueRaw).toBe(-1); // Out
    // The ordinal scale for this key is declared (anchor 0, spread 1), so
    // normalizeReading is the identity on it and the -1 survives intact.
    expect(inj[0]!.value).toBe(-1);
  });

  it("skips an injury row that identifies no player rather than writing a null entity", () => {
    const out = candidates(input());
    expect(out.every((c) => c.entityId.length > 0)).toBe(true);
  });

  it("records the rights snapshot the schema requires", () => {
    const out = candidates(input());
    expect(out.length).toBeGreaterThan(0);
    for (const c of out) {
      expect(c.rightsSnapshot).toBeDefined();
    }
  });

  it("sets fetchedAt on EVERY row — the schema rejects the write without it", () => {
    // Measured in production 2026-09-28: omitting `fetchedAt` (DateTime, no
    // default) fails every single upsert with "Argument `fetchedAt` is
    // missing", so the table stays at 0 rows. A missing field here is the
    // difference between a populated table and an empty one, so it is pinned
    // per-row across every source table rather than assumed.
    const out = candidates(input());
    expect(out.length).toBeGreaterThan(0);
    for (const c of out) {
      expect(c.fetchedAt).toBeInstanceOf(Date);
    }
  });

  it("DROPS and COUNTS a key with no fitted scale instead of writing a raw value", () => {
    // The snap.* keys have no scale entry that can normalize a row with an
    // entity. On prod all 31,100 snap_counts rows have a NULL playerId, so they
    // are exactly this case, and the drop has to be visible rather than silent.
    // This IS the prod shape: all 31,100 snap_counts rows carry a NULL playerId,
    // so the writer has no entity to attach the reading to.
    const projection = projectSignalCandidates(
      input({
        playerGameStats: [],
        nextGenStats: [],
        injuries: [],
        snapCounts: [
          {
            playerId: null,
            season: 2025,
            week: 3,
            offensePct: 0.91,
            stPct: 0.33,
            defensePct: 0.02,
            fetchedAt: NOW,
          },
        ],
      }),
    );
    expect(projection.candidates).toEqual([]);
    // Counted, not silent: a key that stops appearing has to be visible.
    expect(projection.dropped["snap.offense_pct"]).toBe(1);
    expect(projection.dropped["snap.st_pct"]).toBe(1);
    expect(projection.dropped["snap.defense_pct"]).toBe(1);
  });

  it("never writes a value outside the shared -1..1 scale", () => {
    for (const c of candidates(input())) {
      expect(Math.abs(c.value)).toBeLessThanOrEqual(1);
    }
  });

  it("returns an empty list rather than throwing when every source is empty", () => {
    const projection = projectSignalCandidates(
      input({ playerGameStats: [], snapCounts: [], nextGenStats: [], injuries: [] }),
    );
    expect(projection.candidates).toEqual([]);
  });
});

describe("encodeInjuryAvailability", () => {
  // The bug this pins: the previous encoder was
  // `(reportStatus ?? practiceStatus ?? "").toUpperCase()`, and `??` does not
  // fall through on an EMPTY STRING. On prod every one of the 6,812 injuries
  // rows stores `reportStatus` as '' rather than NULL, so `??` never fired, the
  // encoder saw "", and 2,955 rows whose practiceStatus was "Full Participation
  // in Practice" — the healthiest reading in the table — were dropped. The
  // persisted key could report bad news and never good news.
  const BLANK: string[] = ["", "   "];

  it("reads practice participation when reportStatus is a BLANK string, not just null", () => {
    for (const blank of [...BLANK, null]) {
      expect(encodeInjuryAvailability(blank, "Full Participation in Practice")).toBe(1);
      expect(encodeInjuryAvailability(blank, "Limited Participation in Practice")).toBe(1);
      expect(encodeInjuryAvailability(blank, "Did Not Participate In Practice")).toBe(-1);
    }
  });

  it("restores the +1 case, which had never once been written to prod", () => {
    // Every persisted injury.availability value measured on prod was -1 or 0.
    expect(encodeInjuryAvailability("", "Full Participation in Practice")).toBe(1);
    expect(encodeInjuryAvailability(null, "Full Participation in Practice")).toBe(1);
  });

  it("still encodes the out / doubtful cases", () => {
    expect(encodeInjuryAvailability("Out", "Full Participation in Practice")).toBe(-1);
    expect(encodeInjuryAvailability("Questionable", "Full Participation in Practice")).toBe(0);
    expect(encodeInjuryAvailability("Doubtful", "Did Not Participate In Practice")).toBe(-1);
  });

  it("returns null when the source says nothing readable, rather than a default", () => {
    expect(encodeInjuryAvailability("", "")).toBeNull();
    expect(encodeInjuryAvailability(null, null)).toBeNull();
    expect(encodeInjuryAvailability("", "N/A")).toBeNull();
  });
});

describe("writeSignalCandidates", () => {
  function fakeDb(behaviour: (args: unknown) => void = () => {}) {
    const calls: unknown[] = [];
    return {
      calls,
      db: {
        signal: {
          async upsert(args: unknown) {
            calls.push(args);
            behaviour(args);
            return {};
          },
        },
      },
    };
  }

  const one: SignalWriteCandidate = {
    entityType: "player",
    entityId: "p1",
    key: "pgs.target_share",
    category: "PRODUCTION",
    value: 0.284,
    valueRaw: 0.284,
    weight: 1,
    confidence: 1,
    capturedAt: NOW,
    season: 2025,
    week: 3,
    sourceId: "nflverse",
  } as SignalWriteCandidate;

  it("upserts on the schema's unique tuple so a re-run cannot double-vote", async () => {
    const { db, calls } = fakeDb();
    await writeSignalCandidates(db, [one]);
    const where = (calls[0] as { where: Record<string, unknown> }).where;
    expect(where.entityType_entityId_key_season_week).toEqual({
      entityType: "player",
      entityId: "p1",
      key: "pgs.target_share",
      season: 2025,
      week: 3,
    });
  });

  it("reports a partial failure instead of silently truncating", async () => {
    const { db } = fakeDb((args) => {
      if ((args as { create: { key: string } }).create.key === "bad") {
        throw new Error("unique violation");
      }
    });
    const bad = { ...one, key: "bad" } as SignalWriteCandidate;
    const report = await writeSignalCandidates(db, [one, bad]);
    expect(report.candidates).toBe(2);
    expect(report.written).toBe(1);
    expect(report.skipped).toBe(1);
    expect(report.errors.length).toBe(1);
    // A half-populated table must be visible: the prop pipeline treats a
    // populated table as fuel, so a silent partial write reads as a quiet gap.
    expect(report.errors[0]).toContain("bad");
  });

  it("stops at the deadline and REPORTS the remainder — never truncates silently", async () => {
    // This is the production bug, pinned. The route's first live tick returned
    // 504 because it upserts one row at a time over the full candidate set.
    // The fix is a deadline; the risk that fix introduces is a write that
    // quietly stops and reads as complete. So the remainder must be REPORTED.
    let calls = 0;
    const slowDb = {
      signal: {
        upsert: async () => {
          calls += 1;
          return {};
        },
      },
    } as never;
    const rows = Array.from({ length: 1200 }, (_, i) => ({
      entityType: "player" as const,
      entityId: `p${i}`,
      key: "pgs.target_share",
      category: "PRODUCTION",
      value: 0.5,
      valueRaw: 0.5,
      season: 2026,
      week: 1,
      capturedAt: new Date("2026-09-28T00:00:00Z"),
      fetchedAt: new Date("2026-09-28T00:00:00Z"),
      sourceId: "nflverse",
      rightsSnapshot: { source: "nflverse", dataset: "pgs.target_share", measured: true },
    }));
    // A deadline already in the past: the first batch check trips.
    const report = await writeSignalCandidates(slowDb, rows, {
      deadline: new Date(Date.now() - 1000),
    });
    expect(calls).toBe(0);
    expect(report.written).toBe(0);
    expect(report.errors.join(" ")).toMatch(/deadline reached/i);
    // The number that matters: it says how much was NOT done.
    expect(report.errors.join(" ")).toMatch(/1200/);
  });

  it("writes every row when the deadline has not passed", async () => {
    let calls = 0;
    const okDb = {
      signal: {
        upsert: async () => {
          calls += 1;
          return {};
        },
      },
    } as never;
    const rows = Array.from({ length: 3 }, (_, i) => ({
      entityType: "player" as const,
      entityId: `p${i}`,
      key: "pgs.target_share",
      category: "PRODUCTION",
      value: 0.5,
      valueRaw: 0.5,
      season: 2026,
      week: 1,
      capturedAt: new Date("2026-09-28T00:00:00Z"),
      fetchedAt: new Date("2026-09-28T00:00:00Z"),
      sourceId: "nflverse",
      rightsSnapshot: { source: "nflverse", dataset: "pgs.target_share", measured: true },
    }));
    const report = await writeSignalCandidates(okDb, rows, {
      deadline: new Date(Date.now() + 60_000),
    });
    expect(calls).toBe(3);
    expect(report.written).toBe(3);
    expect(report.errors).toHaveLength(0);
  });

  it("writes nothing and reports zero for an empty candidate set", async () => {
    const { db, calls } = fakeDb();
    const report = await writeSignalCandidates(db, []);
    expect(report.written).toBe(0);
    expect(report.candidates).toBe(0);
    expect(calls.length).toBe(0);
  });
});

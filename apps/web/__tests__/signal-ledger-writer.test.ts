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
import { projectSignalCandidates, writeSignalCandidates } from "@/lib/ops/signal-ledger-writer";
import type { SignalWriteCandidate } from "@/lib/ops/signal-ledger-writer-types";

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
    const out = projectSignalCandidates(input());
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

  it("carries the source column verbatim into BOTH value and valueRaw", () => {
    const out = projectSignalCandidates(input());
    const target = out.find((c) => c.key === "pgs.target_share");
    expect(target).toBeDefined();
    // This is the anti-fabrication property: nothing is normalized, scaled, or
    // smoothed on the way in. A future normalizer must keep valueRaw so the
    // original reading is still recoverable.
    expect(target!.value).toBe(0.284);
    expect(target!.valueRaw).toBe(0.284);
  });

  it("gives every signal weight 1 and confidence 1 — no invented priors", () => {
    const out = projectSignalCandidates(input());
    expect(out.length).toBeGreaterThan(0);
    for (const c of out) {
      expect(c.weight).toBe(1);
      // 1.0 means "this is a real measurement", NOT "this is proven predictive".
      expect(c.confidence).toBe(1);
    }
  });

  it("encodes injury availability as a documented ordinal, not a severity", () => {
    const out = projectSignalCandidates(input());
    const inj = out.filter((c) => c.key === "injury.availability");
    expect(inj.length).toBe(1);
    expect(inj[0]!.value).toBe(-1); // Out
  });

  it("skips an injury row that identifies no player rather than writing a null entity", () => {
    const out = projectSignalCandidates(input());
    expect(out.every((c) => c.entityId.length > 0)).toBe(true);
  });

  it("records the rights snapshot the schema requires", () => {
    const out = projectSignalCandidates(input()) as unknown as Array<Record<string, unknown>>;
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
    const out = projectSignalCandidates(input()) as unknown as Array<Record<string, unknown>>;
    expect(out.length).toBeGreaterThan(0);
    for (const c of out) {
      expect(c.fetchedAt).toBeInstanceOf(Date);
    }
  });

  it("returns an empty list rather than throwing when every source is empty", () => {
    const out = projectSignalCandidates(
      input({ playerGameStats: [], snapCounts: [], nextGenStats: [], injuries: [] }),
    );
    expect(out).toEqual([]);
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

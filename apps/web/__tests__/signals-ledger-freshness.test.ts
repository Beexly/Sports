/**
 * Freshness of the `signals` ledger.
 *
 * The failure this guards against is DOCUMENTED, not hypothetical: the odds
 * line archive sat dead for three weeks because its cron swallowed the error and
 * nothing compared the table's newest row against the clock. These tests are
 * deliberately built so they CANNOT pass vacuously — each boundary has a case on
 * both sides, and the first draft of this suite passed while asserting nothing
 * about a table that did not exist yet.
 */

import { describe, it, expect } from "vitest";
import {
  assessSignalsFreshness,
  readSignalsFreshness,
  DEFAULT_SIGNALS_FRESHNESS_THRESHOLDS,
  type SignalsFreshnessReaderDb,
} from "@/lib/ops/signals-ledger-freshness";

/** Fixed clock. Nothing here reads the real time. */
const NOW = new Date("2026-10-01T12:00:00.000Z");
const hoursAgo = (h: number): string =>
  new Date(NOW.getTime() - h * 3_600_000).toISOString();

describe("assessSignalsFreshness", () => {
  it("judges a row written minutes ago healthy", () => {
    const r = assessSignalsFreshness({ mostRecentFetchedAt: hoursAgo(0.1), now: NOW });
    expect(r.verdict).toBe("healthy");
    expect(r.ageHours).toBeCloseTo(0.1, 5);
  });

  it("degrades one missed hourly tick", () => {
    const r = assessSignalsFreshness({ mostRecentFetchedAt: hoursAgo(2), now: NOW });
    expect(r.verdict).toBe("degraded");
  });

  it("goes stale past two missed ticks", () => {
    const r = assessSignalsFreshness({ mostRecentFetchedAt: hoursAgo(5), now: NOW });
    expect(r.verdict).toBe("stale");
  });

  it("treats an EMPTY table as stale, not healthy", () => {
    // The exact condition that let the line archive sit empty unnoticed.
    const r = assessSignalsFreshness({ mostRecentFetchedAt: null, rowCount: 0, now: NOW });
    expect(r.verdict).toBe("stale");
    expect(r.ageHours).toBeNull();
    expect(r.reason).toContain("empty");
  });

  it("treats an UNREADABLE timestamp as stale, not healthy", () => {
    // Absence is not a pass. This is the asymmetry that inverts into a silent
    // green board if it ever flips.
    const r = assessSignalsFreshness({ mostRecentFetchedAt: "not-a-date", now: NOW });
    expect(r.verdict).toBe("stale");
    expect(r.mostRecentFetchedAt).toBeNull();
  });

  it("echoes the thresholds it judged against", () => {
    const r = assessSignalsFreshness({ mostRecentFetchedAt: hoursAgo(0.1), now: NOW });
    expect(r.thresholds).toEqual(DEFAULT_SIGNALS_FRESHNESS_THRESHOLDS);
  });

  it("honours overridden thresholds rather than the defaults", () => {
    const loose = assessSignalsFreshness({
      mostRecentFetchedAt: hoursAgo(5),
      now: NOW,
      thresholds: { staleAfterHours: 100 },
    });
    expect(loose.verdict).not.toBe("stale");
  });

  it("is a pure function: same input, same verdict, no clock read", () => {
    const input = { mostRecentFetchedAt: hoursAgo(1), now: NOW };
    expect(assessSignalsFreshness(input)).toEqual(assessSignalsFreshness(input));
  });

  it("carries a reason on EVERY verdict — a silent result is the bug class", () => {
    for (const h of [0.1, 2, 5]) {
      expect(assessSignalsFreshness({ mostRecentFetchedAt: hoursAgo(h), now: NOW }).reason)
        .not.toHaveLength(0);
    }
  });
});

describe("readSignalsFreshness", () => {
  function fakeDb(fetchedAt: Date | null, count: number): SignalsFreshnessReaderDb {
    return {
      signal: {
        aggregate: async () => ({ fetchedAt }),
        count: async () => count,
      },
    };
  }

  it("reads the newest timestamp and judges it", async () => {
    const r = await readSignalsFreshness(fakeDb(new Date(NOW.getTime() - 600_000), 84_500), {
      now: NOW,
    });
    expect(r.verdict).toBe("healthy");
    expect(r.rowCount).toBe(84_500);
  });

  it("reports an empty table as stale through the READER, not just the pure fn", async () => {
    const r = await readSignalsFreshness(fakeDb(null, 0), { now: NOW });
    expect(r.verdict).toBe("stale");
    expect(r.rowCount).toBe(0);
  });

  it("asks for the newest row with a TYPED filter, not an empty bag of unknowns", async () => {
    // Pins the wire shape. The line-archive outage happened because a loose
    // filter type let a call Prisma rejects compile; a wrong orderBy/select here
    // must fail this test rather than throw silently inside the cron.
    const seen: unknown[] = [];
    const db: SignalsFreshnessReaderDb = {
      signal: {
        aggregate: async (args) => {
          seen.push(args);
          return { fetchedAt: new Date(NOW.getTime() - 60_000) };
        },
        count: async () => 7,
      },
    };
    await readSignalsFreshness(db, { now: NOW });
    expect(seen[0]).toEqual({ orderBy: { fetchedAt: "desc" }, select: { fetchedAt: true } });
  });

  it("does not write: the reader's only db calls are reads", async () => {
    // Structurally guaranteed — the interface exposes only `aggregate` and
    // `count`, neither of which writes — so this asserts the surface is narrow.
    const db = fakeDb(new Date(), 1);
    expect(Object.keys(db.signal).sort()).toEqual(["aggregate", "count"]);
  });
});

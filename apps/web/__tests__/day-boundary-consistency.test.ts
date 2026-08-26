import { describe, expect, it } from "vitest";
import { startOfDay, endOfDay } from "date-fns";

/**
 * WHAT "TODAY" MEANS IN THE DATA LAYER — pinned.
 *
 * "Per day" is a billing and entitlement boundary here, not a cosmetic one:
 * the FREE tier is sold as "2 picks/day". At least five things depend on a day
 * definition — the free teaser window, the daily-slate counts, the public
 * No-Bet pass list, settled-result grouping, and the operator "published
 * today" counts — and if any two of them disagree, the paywall either resets
 * twice or locks a viewer out early.
 *
 * The convention is the UTC calendar day (lib/time/day-boundary.ts), which is
 * what production already runs (Vercel functions default to TZ=UTC) and what
 * the commit-reveal layer already published on disk: `dailySlateKey()` freezes
 * one immutable Merkle root per (sport, UTC game-day).
 *
 * Every test below evaluates the SAME logic at instants that straddle midnight
 * in different zones — 03:30Z is 23:30 the PREVIOUS day in New York and 20:30
 * the previous day in Los Angeles — and, where the ambient zone could leak in,
 * pins the answer under an explicitly-set TZ. A midday-UTC timestamp would
 * pass against every broken variant and prove nothing.
 */

import {
  PLATFORM_DAY_ZONE,
  utcDayKey,
  utcDayWindow,
} from "@/lib/time/day-boundary";
import { parseDateParam } from "@/lib/parse-date-param";
import { dailySlateKey } from "@sports/prediction-engine";

/** 2026-09-07 03:30 UTC === Sun Sep 6, 11:30pm ET === Sun Sep 6, 8:30pm PT. */
const STRADDLE = new Date("2026-09-07T03:30:00.000Z");
/** The last instant of the same UTC day. */
const LAST_MS = new Date("2026-09-07T23:59:59.999Z");
/** The first instant of the next UTC day. */
const NEXT_DAY = new Date("2026-09-08T00:00:00.000Z");

/** Run `fn` with an explicit process timezone, restoring the previous one. */
function withTZ<T>(tz: string, fn: () => T): T {
  const prev = process.env.TZ;
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.TZ;
    else process.env.TZ = prev;
  }
}

describe("the platform day boundary is UTC, stated once", () => {
  it("declares UTC as the anchor", () => {
    expect(PLATFORM_DAY_ZONE).toBe("UTC");
  });

  it("keys a late-US-evening kickoff to the UTC day, not the local one", () => {
    // 11:30pm Sunday in New York. The UTC day has already rolled to Monday.
    expect(utcDayKey(STRADDLE)).toBe("2026-09-07");
    const win = utcDayWindow(STRADDLE);
    expect(win.start.toISOString()).toBe("2026-09-07T00:00:00.000Z");
    expect(win.end.toISOString()).toBe("2026-09-08T00:00:00.000Z");
    expect(win.endInclusive.toISOString()).toBe("2026-09-07T23:59:59.999Z");
    expect(win.key).toBe("2026-09-07");
  });

  it("is half-open: the last millisecond is in, the next midnight is out", () => {
    const win = utcDayWindow(STRADDLE);
    expect(LAST_MS.getTime()).toBeLessThan(win.end.getTime());
    expect(LAST_MS.getTime()).toBeLessThanOrEqual(win.endInclusive.getTime());
    expect(NEXT_DAY.getTime()).toBeGreaterThanOrEqual(win.end.getTime());
    expect(utcDayKey(NEXT_DAY)).toBe("2026-09-08");
  });

  it("shifts by whole UTC days across month and year edges", () => {
    expect(utcDayWindow(new Date("2026-09-01T00:30:00.000Z"), -1).key).toBe("2026-08-31");
    expect(utcDayWindow(new Date("2026-12-31T23:30:00.000Z"), 1).key).toBe("2027-01-01");
    // Yesterday-of-a-straddle is the day before the UTC day, not before the
    // local one: 2026-09-07T03:30Z is still "Sunday night" in the US.
    expect(utcDayWindow(STRADDLE, -1).key).toBe("2026-09-06");
  });

  it("does not move when the host timezone moves — the whole point", () => {
    // The reference answer, computed with no TZ games played.
    const utcAnswer = {
      key: utcDayKey(STRADDLE),
      start: utcDayWindow(STRADDLE).start.toISOString(),
      end: utcDayWindow(STRADDLE).end.toISOString(),
    };

    for (const tz of ["UTC", "America/New_York", "America/Los_Angeles", "Australia/Sydney"]) {
      const got = withTZ(tz, () => ({
        key: utcDayKey(STRADDLE),
        start: utcDayWindow(STRADDLE).start.toISOString(),
        end: utcDayWindow(STRADDLE).end.toISOString(),
      }));
      expect(got, `day boundary drifted under TZ=${tz}`).toEqual(utcAnswer);
    }
  });

  it("refuses an invalid instant rather than silently answering for a different day", () => {
    expect(() => utcDayKey(new Date("not-a-date"))).toThrow(RangeError);
    expect(() => utcDayWindow(new Date(Number.NaN))).toThrow(RangeError);
    expect(() => utcDayWindow(STRADDLE, 1.5)).toThrow(RangeError);
  });

  it("agrees with the immutable UTC game-day already published on disk", () => {
    // packages/prediction-engine/src/slate-commitment.ts freezes one Merkle
    // root per (sport, UTC game-day). Those roots are public and immutable, so
    // the app layer's day key MUST be the same day key.
    expect(dailySlateKey("nfl", STRADDLE.toISOString())).toBe(`NFL:${utcDayKey(STRADDLE)}`);
    expect(dailySlateKey("nba", NEXT_DAY.toISOString())).toBe(`NBA:${utcDayKey(NEXT_DAY)}`);
  });
});

describe("the FREE-tier '2 picks/day' window does not follow the ambient timezone", () => {
  /**
   * /api/picks resolves the teaser window from `parseDateParam(?date=)`. It
   * used to feed that Date to date-fns `startOfDay`/`endOfDay`, which anchor on
   * the PROCESS timezone. Under TZ=UTC that is the UTC day; under any other
   * zone the same request silently returns a different day's board — and with
   * it a different two picks. This pins the entitlement window to the stated
   * convention so a TZ change can never move a live paywall.
   */
  it("returns the requested UTC day for ?date= regardless of TZ", () => {
    for (const tz of ["UTC", "America/New_York", "America/Los_Angeles", "Australia/Sydney"]) {
      const win = withTZ(tz, () => utcDayWindow(parseDateParam("2026-09-07")));
      expect(win.key, `?date=2026-09-07 resolved to ${win.key} under TZ=${tz}`).toBe("2026-09-07");
      expect(win.start.toISOString()).toBe("2026-09-07T00:00:00.000Z");
      expect(win.endInclusive.toISOString()).toBe("2026-09-07T23:59:59.999Z");
    }
  });

  it("demonstrates the runtime-local idiom it replaced actually diverges", () => {
    // Not a claim about our code — a demonstration that the OLD idiom is
    // zone-dependent, which is why the shared definition had to exist. If this
    // ever stops diverging, date-fns changed semantics and the guard above
    // stops meaning anything.
    const anchor = parseDateParam("2026-09-07"); // 2026-09-07T00:00:00.000Z
    const utcDays = withTZ("UTC", () => startOfDay(anchor).toISOString());
    const nyDays = withTZ("America/New_York", () => startOfDay(anchor).toISOString());
    expect(utcDays).toBe("2026-09-07T00:00:00.000Z");
    expect(nyDays).not.toBe(utcDays);
    expect(withTZ("UTC", () => endOfDay(anchor).toISOString())).toBe(
      utcDayWindow(anchor).endInclusive.toISOString(),
    );
  });
});

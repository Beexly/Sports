import { describe, expect, it, vi } from "vitest";
import {
  DAILY_BUDGET,
  HOURLY_BUDGET,
  MONTHLY_CREDITS,
  PAID_CALL_PURPOSES,
  buildOddsCreditTruth,
  decidePaidOddsCall,
  emptyOddsCreditTruth,
  evaluatePaidOddsCall,
  hoursToMonthEnd,
  projectCreditExhaustion,
  reservePaceOk,
  zeroObservationIsStale,
} from "../odds-credit-governor";
import {
  CREDIT_OBSERVATION_WINDOW_LIMIT,
  ODDS_CREDITS_SCOPE,
  ODDS_PAID_CALL_SCOPE,
  loadCreditObservationsSince,
  loadLatestCreditObservation,
  loadLatestPaidCallAnyPurposeAt,
  loadLatestPaidCallAt,
  loadOddsCreditTruth,
  paidCallMutexKey,
  recordCreditObservation,
  recordPaidCall,
  resetPaidCallReservationWarning,
  reservePaidCallSlot,
  type OddsCreditLedgerDb,
  type OddsCreditLedgerRows,
  type OddsCreditLedgerTx,
} from "../odds-credit-ledger";

/**
 * C-109 credit governor. Every number below is a test fixture, not a product
 * claim: the constants under test are the plan the founder holds (20K a month)
 * and the budget the plan section 3f set (600 a day).
 */

const SEP_6 = new Date("2026-09-06T12:00:00.000Z");

describe("constants", () => {
  it("pins the plan and the daily budget from plan section 3f", () => {
    expect(MONTHLY_CREDITS).toBe(20000);
    expect(DAILY_BUDGET).toBe(600);
    expect(HOURLY_BUDGET).toBe(25);
  });
});

describe("hoursToMonthEnd (UTC)", () => {
  it("counts to the first instant of the next UTC month", () => {
    // Sep 6 12:00 UTC to Oct 1 00:00 UTC = 24 days 12 hours.
    expect(hoursToMonthEnd(SEP_6)).toBeCloseTo(24 * 24 + 12, 6);
  });

  it("wraps the year end", () => {
    expect(hoursToMonthEnd(new Date("2026-12-31T23:00:00.000Z"))).toBeCloseTo(1, 6);
  });

  it("handles a leap February", () => {
    expect(hoursToMonthEnd(new Date("2028-02-28T00:00:00.000Z"))).toBeCloseTo(48, 6);
  });

  it("never returns zero at the exact boundary (finite pace math)", () => {
    // 23:59:59.999 on the last day: a hair over zero, floored to one minute.
    expect(hoursToMonthEnd(new Date("2026-09-30T23:59:59.999Z"))).toBeCloseTo(1 / 60, 6);
  });

  it("uses UTC, not the local calendar", () => {
    // 2026-09-30T23:30Z is still September in UTC even where local time is October 1.
    expect(hoursToMonthEnd(new Date("2026-09-30T23:30:00.000Z"))).toBeCloseTo(0.5, 6);
  });
});

describe("decidePaidOddsCall", () => {
  const base = {
    now: SEP_6,
    purpose: "odds" as const,
    hasEventWithin48h: true,
    freeCoversPurpose: false,
    lastPaidCallAt: null,
  };

  it("refuses when a free source covers the purpose, before anything else", () => {
    const d = decidePaidOddsCall({ ...base, remaining: 19000, freeCoversPurpose: true });
    expect(d.allow).toBe(false);
    expect(d.reason).toMatch(/free source covers odds/);
  });

  it("refuses an odds call for a sport with no event within 48h", () => {
    const d = decidePaidOddsCall({ ...base, remaining: 19000, hasEventWithin48h: false });
    expect(d.allow).toBe(false);
    expect(d.reason).toMatch(/no event within 48h/);
  });

  it("a scoreboard read failure (null) is never a reason to skip odds", () => {
    const d = decidePaidOddsCall({ ...base, remaining: 19000, hasEventWithin48h: null });
    expect(d.allow).toBe(true);
  });

  it("unknown remaining allows with reason 'no observation yet'", () => {
    const d = decidePaidOddsCall({ ...base, remaining: null });
    expect(d).toEqual({ allow: true, reason: "no observation yet" });
  });

  it("zero remaining holds while the reading is fresh (5 minutes old)", () => {
    const fiveMinutesAgo = new Date(SEP_6.getTime() - 5 * 60_000).toISOString();
    const d = decidePaidOddsCall({ ...base, remaining: 0, observedAt: fiveMinutesAgo });
    expect(d).toEqual({ allow: false, reason: "zero credits remaining" });
  });

  it("a stale zero reading (2h old) allows one probe per sport per hour, for both purposes", () => {
    const twoHoursAgo = new Date(SEP_6.getTime() - 2 * 60 * 60_000).toISOString();
    for (const purpose of ["odds", "scores"] as const) {
      const probe = decidePaidOddsCall({ ...base, purpose, remaining: 0, observedAt: twoHoursAgo });
      expect(probe).toEqual({ allow: true, reason: "probe: zero-credit observation is stale" });
      const second = decidePaidOddsCall({
        ...base,
        purpose,
        remaining: 0,
        observedAt: twoHoursAgo,
        lastPaidCallAt: new Date(SEP_6.getTime() - 10 * 60_000),
      });
      expect(second.allow).toBe(false);
      expect(second.reason).toMatch(/already probed this hour|within the hour/);
    }
  });

  it("a zero dated before the current UTC month is stale even when read a minute ago by the clock", () => {
    // Reading stamped Aug 31 23:59:30Z, now Sep 1 00:00:00Z: the vendor cycle may have reset.
    const d = decidePaidOddsCall({
      ...base,
      now: new Date("2026-09-01T00:00:00.000Z"),
      remaining: 0,
      observedAt: "2026-08-31T23:59:30.000Z",
    });
    expect(d.allow).toBe(true);
    expect(d.reason).toMatch(/probe/);
  });

  it("a zero with no usable timestamp never holds forever", () => {
    expect(decidePaidOddsCall({ ...base, remaining: 0 }).allow).toBe(true);
    expect(decidePaidOddsCall({ ...base, remaining: 0, observedAt: null }).allow).toBe(true);
    expect(decidePaidOddsCall({ ...base, remaining: 0, observedAt: "not a date" }).allow).toBe(true);
  });

  it("zeroObservationIsStale: fresh in-month readings are the only non-stale ones", () => {
    expect(zeroObservationIsStale(new Date(SEP_6.getTime() - 59 * 60_000).toISOString(), SEP_6)).toBe(false);
    expect(zeroObservationIsStale(new Date(SEP_6.getTime() - 60 * 60_000).toISOString(), SEP_6)).toBe(true);
    expect(zeroObservationIsStale("2026-08-31T23:59:59.999Z", new Date("2026-09-01T00:00:00.000Z"))).toBe(true);
    expect(zeroObservationIsStale(null, SEP_6)).toBe(true);
    expect(zeroObservationIsStale(undefined, SEP_6)).toBe(true);
  });

  it("allows every cycle while the pace funds the hourly budget to month end", () => {
    // 19000 credits / 588h = 32.3/h, above the 25/h floor.
    const d = decidePaidOddsCall({ ...base, remaining: 19000 });
    expect(d.allow).toBe(true);
    expect(d.reason).toMatch(/pace ok/);
  });

  it("reserve mode: below the pace floor, one odds call per sport per hour with an event within 48h", () => {
    // 5000 credits / 588h = 8.5/h, below the floor.
    const first = decidePaidOddsCall({ ...base, remaining: 5000 });
    expect(first.allow).toBe(true);
    expect(first.reason).toMatch(/reserve/);
    const withinHour = decidePaidOddsCall({
      ...base,
      remaining: 5000,
      lastPaidCallAt: new Date(SEP_6.getTime() - 15 * 60_000),
    });
    expect(withinHour.allow).toBe(false);
    expect(withinHour.reason).toMatch(/already made a odds call this hour/);
    const hourLater = decidePaidOddsCall({
      ...base,
      remaining: 5000,
      lastPaidCallAt: new Date(SEP_6.getTime() - 61 * 60_000),
    });
    expect(hourLater.allow).toBe(true);
  });

  it("reserve mode still refuses a sport with no event (the exception is for live sports only)", () => {
    const d = decidePaidOddsCall({ ...base, remaining: 5000, hasEventWithin48h: false });
    expect(d.allow).toBe(false);
  });

  it("month-end boundary: the same remaining count is 'pace ok' early and reserve late", () => {
    // 700 credits: on Sep 29 12:00 there are 36h left (19.4/h, reserve);
    // on Sep 30 20:00 there are 4h left (175/h, pace ok).
    const early = decidePaidOddsCall({
      ...base,
      remaining: 700,
      now: new Date("2026-09-29T12:00:00.000Z"),
    });
    expect(early.reason).toMatch(/reserve/);
    const late = decidePaidOddsCall({
      ...base,
      remaining: 700,
      now: new Date("2026-09-30T20:00:00.000Z"),
    });
    expect(late.allow).toBe(true);
    expect(late.reason).toMatch(/pace ok/);
  });

  it("scores: at most one paid call per sport per hour regardless of pace", () => {
    const d = decidePaidOddsCall({
      ...base,
      purpose: "scores",
      remaining: 19000,
      hasEventWithin48h: null,
      lastPaidCallAt: new Date(SEP_6.getTime() - 20 * 60_000),
    });
    expect(d.allow).toBe(false);
    expect(d.reason).toMatch(/within the hour/);
  });

  it("scores: allowed after the hour even with no observation yet", () => {
    const d = decidePaidOddsCall({
      ...base,
      purpose: "scores",
      remaining: null,
      hasEventWithin48h: null,
      lastPaidCallAt: new Date(SEP_6.getTime() - 60 * 60_000),
    });
    expect(d).toEqual({ allow: true, reason: "no observation yet" });
  });

  it("scores: a first call is allowed even when the free scoreboard shows no event (settlement looks backward)", () => {
    const d = decidePaidOddsCall({
      ...base,
      purpose: "scores",
      remaining: 19000,
      hasEventWithin48h: false,
    });
    expect(d.allow).toBe(true);
  });

  it("a future-dated last call (clock skew) does not count as within the hour", () => {
    const d = decidePaidOddsCall({
      ...base,
      purpose: "scores",
      remaining: 19000,
      lastPaidCallAt: new Date(SEP_6.getTime() + 5 * 60_000),
    });
    expect(d.allow).toBe(true);
  });

  it("steady state with the observed inputs stays at or below 600 credits a day", () => {
    // Simulation with the 2026-09-06 schedule: 4 in-season sports, refresh-odds
    // every 15 minutes at 3 credits a call, settle-picks paid scores capped at
    // 1 call an hour per sport at 2 credits (only when justified, assumed every
    // hour here as the worst case). Start with the full plan on Sep 1.
    let remaining = MONTHLY_CREDITS;
    const lastOdds = new Map<string, Date>();
    const sports = ["a", "b", "c", "d"];
    const start = Date.UTC(2026, 8, 1, 0, 0, 0);
    const end = Date.UTC(2026, 9, 1, 0, 0, 0);
    const spentPerDay = new Map<number, number>();
    for (let t = start; t < end; t += 15 * 60_000) {
      const now = new Date(t);
      const day = Math.floor((t - start) / 86_400_000);
      for (const s of sports) {
        const d = decidePaidOddsCall({
          remaining,
          now,
          purpose: "odds",
          hasEventWithin48h: true,
          freeCoversPurpose: false,
          lastPaidCallAt: lastOdds.get(s) ?? null,
        });
        if (d.allow) {
          remaining -= 3;
          lastOdds.set(s, now);
          spentPerDay.set(day, (spentPerDay.get(day) ?? 0) + 3);
        }
      }
      if (now.getUTCMinutes() === 0) {
        for (const _s of sports) {
          remaining -= 2;
          spentPerDay.set(day, (spentPerDay.get(day) ?? 0) + 2);
        }
      }
    }
    const days = [...spentPerDay.values()];
    // Warm-up days spend the pace-ok surplus; the steady state (day 3 onward)
    // is at or below the daily budget and the plan lasts the month.
    for (const spent of days.slice(3)) expect(spent).toBeLessThanOrEqual(DAILY_BUDGET);
    expect(remaining).toBeGreaterThan(0);
  });
});

describe("reservePaceOk", () => {
  it("is the same threshold the decision uses", () => {
    expect(reservePaceOk(19000, SEP_6)).toBe(true);
    expect(reservePaceOk(5000, SEP_6)).toBe(false);
  });
});

describe("projectCreditExhaustion", () => {
  const obs = (remaining: number, iso: string) => ({
    remaining,
    used: null,
    observedAt: iso,
    source: "test",
  });

  it("returns null with fewer than two observations", () => {
    expect(projectCreditExhaustion([], SEP_6)).toBeNull();
    expect(projectCreditExhaustion([obs(100, "2026-09-06T10:00:00.000Z")], SEP_6)).toBeNull();
  });

  it("projects linearly from first to last observation", () => {
    // 120 credits an hour: 2400 at 10:00, 2280 at 11:00 -> zero 19h after 11:00.
    const at = projectCreditExhaustion(
      [obs(2400, "2026-09-06T10:00:00.000Z"), obs(2280, "2026-09-06T11:00:00.000Z")],
      SEP_6,
    );
    expect(at).toBe("2026-09-07T06:00:00.000Z");
  });

  it("returns null when the count did not fall (reset or flat)", () => {
    expect(
      projectCreditExhaustion(
        [obs(100, "2026-09-06T10:00:00.000Z"), obs(20000, "2026-09-06T11:00:00.000Z")],
        SEP_6,
      ),
    ).toBeNull();
    expect(
      projectCreditExhaustion(
        [obs(100, "2026-09-06T10:00:00.000Z"), obs(100, "2026-09-06T11:00:00.000Z")],
        SEP_6,
      ),
    ).toBeNull();
  });

  it("sorts unordered input and never projects before now", () => {
    const at = projectCreditExhaustion(
      [obs(10, "2026-09-06T11:00:00.000Z"), obs(2000, "2026-09-05T11:00:00.000Z")],
      SEP_6,
    );
    // 1990 credits fell over 24h (82.9/h); the last 10 exhaust about 7 minutes
    // after 11:00, which is before now (12:00), so the projection clamps to now.
    expect(at).toBe(SEP_6.toISOString());
  });

  it("segments at the last upward step: a reset inside the window is fitted only on the post-reset run", () => {
    // 100 left at 10:00, the monthly reset lands 20000 at 11:00, 19880 at 12:00:
    // the slope is 120/h from the reset onward (19880/120 = 165h40m after 12:00),
    // never the 100 -> 20000 jump nor anything before it.
    const at = projectCreditExhaustion(
      [
        obs(100, "2026-09-06T10:00:00.000Z"),
        obs(20000, "2026-09-06T11:00:00.000Z"),
        obs(19880, "2026-09-06T12:00:00.000Z"),
      ],
      SEP_6,
    );
    expect(at).toBe("2026-09-13T09:40:00.000Z");
  });

  it("ignores the pre-reset burn entirely, however steep", () => {
    const at = projectCreditExhaustion(
      [
        obs(20000, "2026-09-06T08:00:00.000Z"),
        obs(100, "2026-09-06T10:00:00.000Z"), // 9950/h before the reset
        obs(20000, "2026-09-06T11:00:00.000Z"),
        obs(19880, "2026-09-06T12:00:00.000Z"),
      ],
      SEP_6,
    );
    expect(at).toBe("2026-09-13T09:40:00.000Z");
  });

  it("returns null when the post-reset segment holds a single point", () => {
    expect(
      projectCreditExhaustion(
        [
          obs(2400, "2026-09-06T10:00:00.000Z"),
          obs(100, "2026-09-06T10:30:00.000Z"),
          obs(20000, "2026-09-06T11:00:00.000Z"),
        ],
        SEP_6,
      ),
    ).toBeNull();
  });
});

/**
 * C-109 review: the pure evaluation also names the hourly slot an allowed call
 * must reserve atomically before spending, and the stale-zero probe is capped
 * across purposes (an odds probe AND a scores probe used to both fire in one
 * hour for the same sport).
 */
describe("evaluatePaidOddsCall: hourly slot and the cross-purpose probe cap", () => {
  const base = {
    now: SEP_6,
    hasEventWithin48h: true,
    freeCoversPurpose: false,
    remaining: 19000,
    observedAt: SEP_6.toISOString(),
  } as const;
  const twoHoursAgo = new Date(SEP_6.getTime() - 2 * 60 * 60_000).toISOString();

  it("decidePaidOddsCall is the evaluation's decision", () => {
    const input = { ...base, purpose: "odds" as const };
    expect(decidePaidOddsCall(input)).toEqual(evaluatePaidOddsCall(input).decision);
  });

  it("odds while the pace funds the budget: allowed, no hourly slot binds ('none')", () => {
    const e = evaluatePaidOddsCall({ ...base, purpose: "odds" });
    expect(e.decision.allow).toBe(true);
    expect(e.slot).toBe("none");
  });

  it("odds in reserve mode: one call per sport per hour ('purpose')", () => {
    const e = evaluatePaidOddsCall({ ...base, purpose: "odds", remaining: 3000 });
    expect(e.decision.allow).toBe(true);
    expect(e.decision.reason).toMatch(/reserve/);
    expect(e.slot).toBe("purpose");
  });

  it("scores always carry the per-purpose hourly slot, pace ok or not, observation or not", () => {
    expect(evaluatePaidOddsCall({ ...base, purpose: "scores" }).slot).toBe("purpose");
    expect(evaluatePaidOddsCall({ ...base, purpose: "scores", remaining: null }).slot).toBe("purpose");
    expect(evaluatePaidOddsCall({ ...base, purpose: "scores", remaining: 3000 }).slot).toBe("purpose");
  });

  it("a stale-zero probe reserves across every purpose ('any-purpose')", () => {
    for (const purpose of PAID_CALL_PURPOSES) {
      const e = evaluatePaidOddsCall({ ...base, purpose, remaining: 0, observedAt: twoHoursAgo });
      expect(e.decision).toEqual({ allow: true, reason: "probe: zero-credit observation is stale" });
      expect(e.slot).toBe("any-purpose");
    }
  });

  it("a held call reports slot 'none'", () => {
    const e = evaluatePaidOddsCall({ ...base, purpose: "odds", hasEventWithin48h: false });
    expect(e.decision.allow).toBe(false);
    expect(e.slot).toBe("none");
  });

  it("at most ONE probe per sport per hour across purposes: a scores probe ten minutes ago holds the odds probe", () => {
    const held = decidePaidOddsCall({
      ...base,
      purpose: "odds",
      remaining: 0,
      observedAt: twoHoursAgo,
      lastPaidCallAt: null, // no odds call this hour...
      lastPaidCallAnyPurposeAt: new Date(SEP_6.getTime() - 10 * 60_000), // ...but a scores probe was
    });
    expect(held.allow).toBe(false);
    expect(held.reason).toMatch(/already probed this hour/);

    const heldScores = decidePaidOddsCall({
      ...base,
      purpose: "scores",
      remaining: 0,
      observedAt: twoHoursAgo,
      lastPaidCallAt: null,
      lastPaidCallAnyPurposeAt: new Date(SEP_6.getTime() - 10 * 60_000),
    });
    expect(heldScores.allow).toBe(false);
  });

  it("the cross-purpose marker releases after the hour", () => {
    const d = decidePaidOddsCall({
      ...base,
      purpose: "odds",
      remaining: 0,
      observedAt: twoHoursAgo,
      lastPaidCallAt: null,
      lastPaidCallAnyPurposeAt: new Date(SEP_6.getTime() - 70 * 60_000),
    });
    expect(d).toEqual({ allow: true, reason: "probe: zero-credit observation is stale" });
  });

  it("the cross-purpose marker only affects the probe: pace-ok odds and normal scores ignore it", () => {
    const tenMinutesAgo = new Date(SEP_6.getTime() - 10 * 60_000);
    expect(
      evaluatePaidOddsCall({ ...base, purpose: "odds", lastPaidCallAnyPurposeAt: tenMinutesAgo }).decision.allow,
    ).toBe(true);
    expect(
      evaluatePaidOddsCall({ ...base, purpose: "scores", lastPaidCallAnyPurposeAt: tenMinutesAgo }).decision.allow,
    ).toBe(true);
  });
});

describe("buildOddsCreditTruth", () => {
  it("is the empty block with no observation", () => {
    expect(buildOddsCreditTruth({ latest: null, last24h: [], now: SEP_6 })).toEqual(
      emptyOddsCreditTruth(),
    );
    expect(emptyOddsCreditTruth().dailyBudget).toBe(600);
    expect(emptyOddsCreditTruth().paceOk).toBeNull();
  });

  it("reports the latest reading, pace and projection", () => {
    const latest = { remaining: 2280, used: 17720, observedAt: "2026-09-06T11:00:00.000Z", source: "refresh-odds" };
    const t = buildOddsCreditTruth({
      latest,
      last24h: [{ ...latest, remaining: 2400, observedAt: "2026-09-06T10:00:00.000Z" }, latest],
      now: SEP_6,
    });
    expect(t).toEqual({
      remaining: 2280,
      used: 17720,
      observedAt: "2026-09-06T11:00:00.000Z",
      dailyBudget: 600,
      projectedExhaustionAt: "2026-09-07T06:00:00.000Z",
      paceOk: false,
    });
  });
});

describe("ledger (append-only JarvisMemoryEvent rows)", () => {
  function fakeDb() {
    const create = vi.fn(async () => ({}));
    const findFirst = vi.fn(async () => null as { full_text: string | null; metadata: unknown } | null);
    const findMany = vi.fn(async () => [] as { full_text: string | null; metadata: unknown }[]);
    const db: OddsCreditLedgerDb = { jarvisMemoryEvent: { create, findFirst, findMany } };
    return { db, create, findFirst, findMany };
  }

  it("records an observation as a confirmed episodic row in the credits scope", async () => {
    const { db, create } = fakeDb();
    const res = await recordCreditObservation(db, {
      remaining: 1234,
      used: 18766,
      observedAt: "2026-09-06T11:00:00.000Z",
      source: "settle-sport",
    });
    expect(res).toBe("ok");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scope: ODDS_CREDITS_SCOPE,
          memory_type: "episodic",
          metadata: expect.objectContaining({ remaining: 1234, used: 18766 }),
        }),
      }),
    );
  });

  it("does not record a remaining 0 / used 0 pair (a header-less response, not a reading)", async () => {
    const { db, create } = fakeDb();
    const res = await recordCreditObservation(db, {
      remaining: 0,
      used: 0,
      observedAt: "2026-09-06T11:00:00.000Z",
      source: "settle-sport",
    });
    expect(res).toBe("skipped");
    expect(create).not.toHaveBeenCalled();
    // A real zero (used carries the plan size, or is unknown from an error) is recorded.
    expect(
      await recordCreditObservation(db, { remaining: 0, used: 20000, observedAt: "2026-09-06T11:00:00.000Z", source: "t" }),
    ).toBe("ok");
    expect(
      await recordCreditObservation(db, { remaining: 0, used: null, observedAt: "2026-09-06T11:00:00.000Z", source: "t" }),
    ).toBe("ok");
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("records a paid call marker keyed by sport in source_ref, per purpose scope", async () => {
    const { db, create } = fakeDb();
    await recordPaidCall(db, { sport: "baseball_mlb", purpose: "scores", at: "2026-09-06T11:00:00.000Z" });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scope: ODDS_PAID_CALL_SCOPE.scores,
          source_ref: "baseball_mlb",
        }),
      }),
    );
    expect(ODDS_PAID_CALL_SCOPE.odds).not.toBe(ODDS_PAID_CALL_SCOPE.scores);
  });

  it("reads the latest observation and marker back (metadata first, full_text fallback)", async () => {
    const { db, findFirst } = fakeDb();
    findFirst.mockResolvedValueOnce({
      full_text: null,
      metadata: { remaining: 50, used: null, observedAt: "2026-09-06T11:00:00.000Z", source: "x" },
    });
    expect(await loadLatestCreditObservation(db)).toMatchObject({ remaining: 50 });
    findFirst.mockResolvedValueOnce({
      full_text: JSON.stringify({ sport: "baseball_mlb", purpose: "odds", at: "2026-09-06T11:00:00.000Z" }),
      metadata: null,
    });
    expect(await loadLatestPaidCallAt(db, "odds", "baseball_mlb")).toEqual(
      new Date("2026-09-06T11:00:00.000Z"),
    );
    expect(findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { scope: ODDS_PAID_CALL_SCOPE.odds, memory_type: "episodic", source_ref: "baseball_mlb" },
      }),
    );
  });

  it("is failure-isolated: a ledger outage reads as null / empty / error, never a throw", async () => {
    const db: OddsCreditLedgerDb = {
      jarvisMemoryEvent: {
        create: vi.fn(async () => {
          throw new Error("db down");
        }),
        findFirst: vi.fn(async () => {
          throw new Error("db down");
        }),
        findMany: vi.fn(async () => {
          throw new Error("db down");
        }),
      },
    };
    expect(await loadLatestCreditObservation(db)).toBeNull();
    expect(await loadLatestPaidCallAt(db, "scores", "x")).toBeNull();
    expect(await loadCreditObservationsSince(db, SEP_6)).toEqual([]);
    expect(
      await recordCreditObservation(db, { remaining: 1, used: null, observedAt: SEP_6.toISOString(), source: "t" }),
    ).toBe("error");
    expect(await recordPaidCall(db, { sport: "x", purpose: "odds", at: SEP_6.toISOString() })).toBe("error");
  });

  it("loadOddsCreditTruth assembles the truth block from the latest reading and the 24h window", async () => {
    const { db, findFirst, findMany } = fakeDb();
    const latest = { remaining: 2280, used: 17720, observedAt: "2026-09-06T11:00:00.000Z", source: "refresh-odds" };
    findFirst.mockResolvedValueOnce({ full_text: null, metadata: latest });
    findMany.mockResolvedValueOnce([
      { full_text: null, metadata: { ...latest, remaining: 2400, observedAt: "2026-09-06T10:00:00.000Z" } },
      { full_text: null, metadata: latest },
    ]);
    const truth = await loadOddsCreditTruth(db, SEP_6);
    expect(truth).toEqual({
      remaining: 2280,
      used: 17720,
      observedAt: "2026-09-06T11:00:00.000Z",
      dailyBudget: 600,
      projectedExhaustionAt: "2026-09-07T06:00:00.000Z",
      paceOk: false,
    });
    // The window query starts 24h before now.
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ created_at: { gte: new Date("2026-09-05T12:00:00.000Z") } }),
      }),
    );
  });

  it("loadOddsCreditTruth is the empty block before any observation and on a ledger outage", async () => {
    const { db } = fakeDb();
    expect(await loadOddsCreditTruth(db, SEP_6)).toEqual(emptyOddsCreditTruth());
    const broken: OddsCreditLedgerDb = {
      jarvisMemoryEvent: {
        create: vi.fn(async () => ({})),
        findFirst: vi.fn(async () => {
          throw new Error("db down");
        }),
        findMany: vi.fn(async () => {
          throw new Error("db down");
        }),
      },
    };
    expect(await loadOddsCreditTruth(broken, SEP_6)).toEqual(emptyOddsCreditTruth());
  });

  it("drops malformed rows from the 24h window", async () => {
    const { db, findMany } = fakeDb();
    findMany.mockResolvedValueOnce([
      { full_text: null, metadata: { remaining: 10, used: null, observedAt: "2026-09-06T10:00:00.000Z", source: "t" } },
      { full_text: "not json", metadata: null },
      { full_text: null, metadata: { nope: true } },
    ]);
    const rows = await loadCreditObservationsSince(db, SEP_6);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.remaining).toBe(10);
  });

  it("loadCreditObservationsSince reads the NEWEST 500 of a busy window, returned chronological", async () => {
    // 600 readings a minute apart. Ascending + take 500 returned the OLDEST
    // 500 and anchored the projection on stale rows; the ledger now reads
    // newest-first and reverses.
    const stored = Array.from({ length: 600 }, (_, i) => ({
      full_text: null,
      metadata: {
        remaining: 20000 - i,
        used: i,
        observedAt: new Date(Date.UTC(2026, 8, 6, 0, i)).toISOString(),
        source: "t",
      },
    }));
    const findMany = vi.fn(async (args: { orderBy: { created_at: "asc" | "desc" }; take: number }) => {
      const ordered = args.orderBy.created_at === "desc" ? [...stored].reverse() : stored;
      return ordered.slice(0, args.take);
    });
    const db: OddsCreditLedgerDb = {
      jarvisMemoryEvent: { create: vi.fn(async () => ({})), findFirst: vi.fn(async () => null), findMany },
    };

    const rows = await loadCreditObservationsSince(db, SEP_6);

    expect(CREDIT_OBSERVATION_WINDOW_LIMIT).toBe(500);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { created_at: "desc" }, take: 500 }),
    );
    expect(rows).toHaveLength(500);
    // Oldest of the newest 500 first, the very latest reading last.
    expect(rows[0]!.remaining).toBe(20000 - 100);
    expect(rows[499]!.remaining).toBe(20000 - 599);
    for (let i = 1; i < rows.length; i++) {
      expect(Date.parse(rows[i]!.observedAt)).toBeGreaterThan(Date.parse(rows[i - 1]!.observedAt));
    }
  });

  it("loadLatestPaidCallAnyPurposeAt is the newest marker across odds and scores; null when none; null on outage", async () => {
    type Row = { full_text: string | null; metadata: unknown } | null;
    const findFirst = vi.fn<(args: { where: { scope: string } }) => Promise<Row>>(async (args) => {
      if (args.where.scope === ODDS_PAID_CALL_SCOPE.odds) {
        return { full_text: null, metadata: { sport: "baseball_mlb", purpose: "odds", at: "2026-09-06T11:00:00.000Z" } };
      }
      if (args.where.scope === ODDS_PAID_CALL_SCOPE.scores) {
        return { full_text: null, metadata: { sport: "baseball_mlb", purpose: "scores", at: "2026-09-06T11:30:00.000Z" } };
      }
      return null;
    });
    const db: OddsCreditLedgerDb = {
      jarvisMemoryEvent: { create: vi.fn(async () => ({})), findFirst, findMany: vi.fn(async () => []) },
    };
    expect(await loadLatestPaidCallAnyPurposeAt(db, "baseball_mlb")).toEqual(new Date("2026-09-06T11:30:00.000Z"));
    const scopes = findFirst.mock.calls.map((c) => c[0].where.scope).sort();
    expect(scopes).toEqual([ODDS_PAID_CALL_SCOPE.odds, ODDS_PAID_CALL_SCOPE.scores].sort());

    const empty = fakeDb();
    expect(await loadLatestPaidCallAnyPurposeAt(empty.db, "baseball_mlb")).toBeNull();

    const broken = fakeDb();
    broken.findFirst.mockRejectedValue(new Error("db down"));
    expect(await loadLatestPaidCallAnyPurposeAt(broken.db, "baseball_mlb")).toBeNull();
  });
});

/**
 * C-109 review: the hourly slot is an ATOMIC reservation. Two overlapping
 * executions for the same sport used to both read the same latest marker
 * before either wrote one, both pass the hourly limit and both spend.
 */
describe("reservePaidCallSlot (atomic hourly slot)", () => {
  const HOUR = 60 * 60_000;
  type StoredMarker = { scope: string; source_ref: string; at: string; created: number };

  /** In-memory marker store; `rows()` is the delegate view a transaction or the client sees. */
  function markerStore() {
    const markers: StoredMarker[] = [];
    let seq = 0;
    const rows = (): OddsCreditLedgerRows => ({
      jarvisMemoryEvent: {
        findFirst: async (args) => {
          const { scope, source_ref } = args.where;
          const hit = markers
            .filter((m) => m.scope === scope && (source_ref === undefined || m.source_ref === source_ref))
            .sort((a, b) => b.created - a.created)[0];
          if (!hit) return null;
          const purpose = hit.scope === ODDS_PAID_CALL_SCOPE.scores ? "scores" : "odds";
          return { full_text: null, metadata: { sport: hit.source_ref, purpose, at: hit.at } };
        },
        findMany: async () => [],
        create: async (args) => {
          const d = args.data;
          markers.push({
            scope: String(d["scope"]),
            source_ref: String(d["source_ref"]),
            at: String((d["metadata"] as { at: string }).at),
            created: ++seq,
          });
          return {};
        },
      },
    });
    return { markers, rows };
  }

  /** A real-client-shaped fake: $transaction serializes callbacks (what the advisory mutex does in Postgres). */
  function atomicFakeDb() {
    const store = markerStore();
    const mutexKeys: string[] = [];
    let chain: Promise<unknown> = Promise.resolve();
    const db: OddsCreditLedgerDb = {
      ...store.rows(),
      $transaction: <T>(fn: (tx: OddsCreditLedgerTx) => Promise<T>): Promise<T> => {
        const run = chain.then(() =>
          fn({
            ...store.rows(),
            $executeRaw: async (_query, ...values) => {
              mutexKeys.push(String(values[0]));
              return 1;
            },
          }),
        );
        chain = run.catch(() => undefined);
        return run;
      },
      $executeRaw: async () => 1,
    };
    return { db, markers: store.markers, mutexKeys };
  }

  it("two concurrent reservations for the same sport within the hour yield exactly one reserved:true, under the per-sport advisory mutex", async () => {
    const { db, markers, mutexKeys } = atomicFakeDb();
    const input = { sport: "baseball_mlb", purpose: "scores" as const, now: SEP_6, intervalMs: HOUR };

    const [a, b] = await Promise.all([reservePaidCallSlot(db, input), reservePaidCallSlot(db, input)]);

    expect([a.reserved, b.reserved].filter(Boolean)).toHaveLength(1);
    expect(a.atomic).toBe(true);
    expect(b.atomic).toBe(true);
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({ scope: ODDS_PAID_CALL_SCOPE.scores, source_ref: "baseball_mlb" });
    const loser = a.reserved ? b : a;
    expect(loser.reserved === false && loser.lastAt.toISOString()).toBe(SEP_6.toISOString());
    expect(mutexKeys).toEqual([paidCallMutexKey("baseball_mlb"), paidCallMutexKey("baseball_mlb")]);
    expect(paidCallMutexKey("baseball_mlb")).toBe("odds-paid:baseball_mlb");
  });

  it("reserves again once the interval has passed; intervalMs 0 records without ever holding", async () => {
    const { db, markers } = atomicFakeDb();
    const first = await reservePaidCallSlot(db, { sport: "x", purpose: "odds", now: SEP_6, intervalMs: HOUR });
    expect(first.reserved).toBe(true);
    const within = await reservePaidCallSlot(db, {
      sport: "x",
      purpose: "odds",
      now: new Date(SEP_6.getTime() + 59 * 60_000),
      intervalMs: HOUR,
    });
    expect(within.reserved).toBe(false);
    const later = await reservePaidCallSlot(db, {
      sport: "x",
      purpose: "odds",
      now: new Date(SEP_6.getTime() + 61 * 60_000),
      intervalMs: HOUR,
    });
    expect(later.reserved).toBe(true);
    const unpaced = await reservePaidCallSlot(db, {
      sport: "x",
      purpose: "odds",
      now: new Date(SEP_6.getTime() + 62 * 60_000),
      intervalMs: 0,
    });
    expect(unpaced.reserved).toBe(true);
    expect(markers).toHaveLength(3);
  });

  it("a cross-purpose check (the stale-zero probe) is held by the OTHER purpose's fresh marker; the per-purpose default is not", async () => {
    const { db } = atomicFakeDb();
    expect(
      (await reservePaidCallSlot(db, { sport: "x", purpose: "odds", now: SEP_6, intervalMs: HOUR })).reserved,
    ).toBe(true);
    const tenMinutesLater = new Date(SEP_6.getTime() + 10 * 60_000);
    const probe = await reservePaidCallSlot(db, {
      sport: "x",
      purpose: "scores",
      now: tenMinutesLater,
      intervalMs: HOUR,
      checkPurposes: PAID_CALL_PURPOSES,
    });
    expect(probe.reserved).toBe(false);
    const scoresOnly = await reservePaidCallSlot(db, {
      sport: "x",
      purpose: "scores",
      now: tenMinutesLater,
      intervalMs: HOUR,
    });
    expect(scoresOnly.reserved).toBe(true);
  });

  it("different sports never block each other", async () => {
    const { db } = atomicFakeDb();
    const [a, b] = await Promise.all([
      reservePaidCallSlot(db, { sport: "a", purpose: "scores", now: SEP_6, intervalMs: HOUR }),
      reservePaidCallSlot(db, { sport: "b", purpose: "scores", now: SEP_6, intervalMs: HOUR }),
    ]);
    expect(a.reserved && b.reserved).toBe(true);
  });

  it("without $transaction/$executeRaw it falls back to read-then-write, warns once, and still enforces the interval for sequential calls", async () => {
    resetPaidCallReservationWarning();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = markerStore();
    const db: OddsCreditLedgerDb = store.rows();

    const first = await reservePaidCallSlot(db, { sport: "x", purpose: "scores", now: SEP_6, intervalMs: HOUR });
    const second = await reservePaidCallSlot(db, {
      sport: "x",
      purpose: "scores",
      now: new Date(SEP_6.getTime() + 20 * 60_000),
      intervalMs: HOUR,
    });

    expect(first).toEqual({ reserved: true, atomic: false });
    expect(second).toEqual({ reserved: false, atomic: false, lastAt: SEP_6 });
    expect(store.markers).toHaveLength(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("non-atomic"));
    warn.mockRestore();
  });

  it("atomicCapable:false (the @sports/db stub client) never enters the transaction even though the client LOOKS capable: non-atomic, warned once, marker still written", async () => {
    // The stub client is a Proxy whose $transaction / $executeRaw are no-op
    // functions, so the shape check alone would report atomic:true while no
    // mutex was ever taken. The caller that knows (isStubMode) says so.
    resetPaidCallReservationWarning();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = markerStore();
    const transaction = vi.fn(async <T,>(fn: (tx: OddsCreditLedgerTx) => Promise<T>): Promise<T> =>
      fn({ ...store.rows(), $executeRaw: async () => 1 }),
    );
    const db: OddsCreditLedgerDb = { ...store.rows(), $transaction: transaction, $executeRaw: async () => 1 };

    const first = await reservePaidCallSlot(db, {
      sport: "x",
      purpose: "odds",
      now: SEP_6,
      intervalMs: HOUR,
      atomicCapable: false,
    });
    const second = await reservePaidCallSlot(db, {
      sport: "x",
      purpose: "odds",
      now: new Date(SEP_6.getTime() + 20 * 60_000),
      intervalMs: HOUR,
      atomicCapable: false,
    });

    expect(first).toEqual({ reserved: true, atomic: false });
    expect(second).toEqual({ reserved: false, atomic: false, lastAt: SEP_6 });
    expect(transaction).not.toHaveBeenCalled();
    expect(store.markers).toHaveLength(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("stub Prisma client"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("non-atomic"));

    // atomicCapable:true (or omitted) on the same client takes the transaction.
    const third = await reservePaidCallSlot(db, {
      sport: "y",
      purpose: "odds",
      now: SEP_6,
      intervalMs: HOUR,
      atomicCapable: true,
    });
    expect(third).toEqual({ reserved: true, atomic: true });
    expect(transaction).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("a transaction that throws falls back to read-then-write (marker still written) and says so", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = markerStore();
    const db: OddsCreditLedgerDb = {
      ...store.rows(),
      $transaction: async () => {
        throw new Error("advisory mutex unavailable");
      },
      $executeRaw: async () => 1,
    };
    const r = await reservePaidCallSlot(db, { sport: "x", purpose: "odds", now: SEP_6, intervalMs: HOUR });
    expect(r).toEqual({ reserved: true, atomic: false });
    expect(store.markers).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("atomic slot reservation failed"));
    warn.mockRestore();
  });

  it("a ledger outage reads as reserved (fail open, like every other ledger function)", async () => {
    const db: OddsCreditLedgerDb = {
      jarvisMemoryEvent: {
        create: vi.fn(async () => {
          throw new Error("db down");
        }),
        findFirst: vi.fn(async () => {
          throw new Error("db down");
        }),
        findMany: vi.fn(async () => []),
      },
    };
    expect(await reservePaidCallSlot(db, { sport: "x", purpose: "odds", now: SEP_6, intervalMs: HOUR })).toEqual({
      reserved: true,
      atomic: false,
    });
  });
});

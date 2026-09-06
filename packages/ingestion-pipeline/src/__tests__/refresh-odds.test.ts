import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Behavioral tests for refreshOdds — the trigger-agnostic odds-refresh core
 * shared by the Vercel cron route (and any other trigger). It is a 1:1
 * extraction of the loop that used to be inlined in the cron route, so these
 * pin the behavior the route depended on:
 *
 *   - iterates the in-season sports by default (getInSeasonSports)
 *   - iterates exactly one sport when given an explicit key
 *   - aggregates per-sport results into the documented envelope
 *   - a single sport throwing does NOT abort the remaining sports
 *   - soft-fails only on ODDS_PROVIDER=offline (refuses invent)
 *   - when no Odds/Rundown keys → ESPN free path sentinel (espn-free-path)
 *   - throws only on an unsupported explicit sport
 *
 * Mocks follow the existing process-sport.test.ts / settle-sport.test.ts
 * pattern: hoisted vi.fn()s wired through vi.mock for processSport, the sport
 * list, and the readiness gates.
 */

const hoisted = vi.hoisted(() => {
  const SPORTS = [
    { key: "americanfootball_nfl", name: "NFL", displayName: "NFL" },
    { key: "basketball_nba", name: "NBA", displayName: "NBA" },
    { key: "baseball_mlb", name: "MLB", displayName: "MLB" },
  ] as const;
  return {
    SPORTS,
    processSport: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    getInSeasonSports:
      vi.fn<() => Array<{ key: string; name: string; displayName: string }>>(),
    getReadinessGates: vi.fn<() => unknown>(),
    freezeSlateCommitments: vi.fn<(...args: unknown[]) => Promise<unknown[]>>(),
    // C-109: the ledger-backed factory refreshOdds uses to build its DEFAULT
    // governor, and the sentinel Prisma client it must hand to it.
    buildPaidOddsGovernor: vi.fn<(deps: unknown) => unknown>(),
    DB: { sentinel: "prisma-client" },
    // @sports/db's stub-mode probe: the default governor tells the ledger when
    // the shared client is the stub (no advisory mutex possible there).
    isStubMode: vi.fn<() => boolean>(() => false),
  };
});

const SPORTS = hoisted.SPORTS;
const mocks = {
  processSport: hoisted.processSport,
  getInSeasonSports: hoisted.getInSeasonSports,
  getReadinessGates: hoisted.getReadinessGates,
  freezeSlateCommitments: hoisted.freezeSlateCommitments,
  buildPaidOddsGovernor: hoisted.buildPaidOddsGovernor,
};

vi.mock("../process-sport.js", () => ({
  processSport: hoisted.processSport,
}));

vi.mock("../freeze-slate-commitments.js", () => ({
  freezeSlateCommitments: hoisted.freezeSlateCommitments,
}));

vi.mock("@sports/db", () => ({ db: hoisted.DB, isStubMode: hoisted.isStubMode }));

vi.mock("@sports/data-ingestion", () => ({
  SUPPORTED_SPORTS: hoisted.SPORTS,
  getInSeasonSports: hoisted.getInSeasonSports,
  buildPaidOddsGovernor: hoisted.buildPaidOddsGovernor,
  resolveOddsApiKey: () =>
    process.env["THE_ODDS_API_KEY"]?.trim() ||
    process.env["ODDS_API_KEY"]?.trim() ||
    process.env["FREE_ODDS_API_KEY"]?.trim() ||
    "",
  resolveRundownApiKey: () =>
    process.env["RUNDOWN_API_KEY"]?.trim() ||
    process.env["RUNDOWN_KEY"]?.trim() ||
    process.env["FREE_RUNDOWN_API_KEY"]?.trim() ||
    "",
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: hoisted.getReadinessGates,
}));

import {
  refreshOdds,
  UnsupportedSportError,
  CREDIT_GOVERNOR_SKIP_NOTE,
  ODDS_API_LOW_QUOTA_THRESHOLD,
  governedDecision,
  isLowQuota,
  paidRequestCountOf,
  recordPaidRunAccounting,
} from "../refresh-odds.js";

const GATES = { isBootstrapMode: false } as const;

/** A PaidOddsGovernor stub: holds the listed sports, allows every other one. */
function stubGovernor(decisions: Record<string, { allow: boolean; reason: string }>) {
  return {
    decide: vi.fn(async (sport: string) => decisions[sport] ?? { allow: true, reason: "pace ok" }),
    recordCall: vi.fn(async (_sport: string, _at: Date) => undefined),
    recordCredits: vi.fn(
      async (_obs: { remaining: number; used?: number | null; observedAt: Date }) => undefined,
    ),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  for (const m of Object.values(mocks)) m.mockReset();
  hoisted.isStubMode.mockReset().mockReturnValue(false);
  process.env["THE_ODDS_API_KEY"] = "test-key";
  mocks.getReadinessGates.mockReturnValue(GATES);
  mocks.getInSeasonSports.mockReturnValue([SPORTS[0], SPORTS[1]]);
  mocks.processSport.mockResolvedValue({ status: "success" });
  mocks.freezeSlateCommitments.mockResolvedValue([]);
  // The default governor (built when a test injects none) allows everything,
  // so the loop-behaviour tests above are unaffected by pacing.
  mocks.buildPaidOddsGovernor.mockImplementation(() => stubGovernor({}));
});

afterEach(() => {
  vi.useRealTimers();
});

/** Run the async fn while flushing the inter-sport setTimeout pauses. */
async function runWithTimers<T>(p: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return p;
}

describe("refreshOdds", () => {
  it("iterates the in-season sports and aggregates a success envelope", async () => {
    const result = await runWithTimers(refreshOdds());

    expect(mocks.getInSeasonSports).toHaveBeenCalledTimes(1);
    expect(mocks.processSport).toHaveBeenCalledTimes(2);
    // Same call signature the route used: (sport, apiKey, gates, logPrefix).
    expect(mocks.processSport).toHaveBeenNthCalledWith(
      1,
      SPORTS[0],
      "test-key",
      GATES,
      "[cron:refresh-odds]",
    );

    expect(result.ok).toBe(true);
    expect(result.okCount).toBe(2);
    expect(result.totalCount).toBe(2);
    expect(result.results).toEqual([
      expect.objectContaining({ sport: "americanfootball_nfl", ok: true }),
      expect.objectContaining({ sport: "basketball_nba", ok: true }),
    ]);
    expect(typeof result.elapsedMs).toBe("number");
  });

  it("processes only the requested sport and never calls getInSeasonSports", async () => {
    const result = await runWithTimers(refreshOdds({ sport: "baseball_mlb" }));

    expect(mocks.getInSeasonSports).not.toHaveBeenCalled();
    expect(mocks.processSport).toHaveBeenCalledTimes(1);
    expect(mocks.processSport).toHaveBeenCalledWith(
      SPORTS[2],
      "test-key",
      GATES,
      "[cron:refresh-odds]",
    );
    expect(result).toMatchObject({
      ok: true,
      okCount: 1,
      totalCount: 1,
      results: [{ sport: "baseball_mlb", ok: true }],
    });
  });

  it("records a per-sport failure WITHOUT aborting the remaining sports", async () => {
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0], SPORTS[1], SPORTS[2]]);
    mocks.processSport
      .mockResolvedValueOnce({ status: "success" }) // nfl ok
      .mockRejectedValueOnce(new Error("quota exhausted")) // nba throws
      .mockResolvedValueOnce({ status: "success" }); // mlb still runs

    const result = await runWithTimers(refreshOdds());

    // All three were attempted — the throw did not stop the loop.
    expect(mocks.processSport).toHaveBeenCalledTimes(3);
    expect(result.ok).toBe(false);
    expect(result.okCount).toBe(2);
    expect(result.totalCount).toBe(3);
    expect(result.results).toEqual([
      expect.objectContaining({ sport: "americanfootball_nfl", ok: true }),
      expect.objectContaining({
        sport: "basketball_nba",
        ok: false,
        error: "quota exhausted",
      }),
      expect.objectContaining({ sport: "baseball_mlb", ok: true }),
    ]);
  });

  it("stops starting new sports once the Odds API reports a near-exhausted credit budget", async () => {
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0], SPORTS[1], SPORTS[2]]);
    mocks.processSport.mockResolvedValueOnce({
      status: "success",
      oddsApiRemainingRequests: 5, // below the 10-credit safety threshold
    });
    // Only ONE mocked resolution is provided on purpose — if the loop wrongly
    // called processSport again for nba/mlb, that call would hang on an
    // unconfigured mock and this test would time out, catching the regression.

    const result = await runWithTimers(refreshOdds());

    expect(mocks.processSport).toHaveBeenCalledTimes(1);
    expect(result.results).toEqual([
      expect.objectContaining({ sport: "americanfootball_nfl", ok: true }),
      expect.objectContaining({
        sport: "basketball_nba",
        ok: false,
        note: "odds_api_low_quota_skip",
      }),
      expect.objectContaining({
        sport: "baseball_mlb",
        ok: false,
        note: "odds_api_low_quota_skip",
      }),
    ]);
  });

  it("does NOT stop early when remaining credits are comfortably above the threshold", async () => {
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0], SPORTS[1]]);
    mocks.processSport
      .mockResolvedValueOnce({ status: "success", oddsApiRemainingRequests: 400 })
      .mockResolvedValueOnce({ status: "success", oddsApiRemainingRequests: 397 });

    const result = await runWithTimers(refreshOdds());

    expect(mocks.processSport).toHaveBeenCalledTimes(2);
    expect(result.results.every((r) => r.ok)).toBe(true);
  });

  it("honors a RESOLVED { status: 'failed' } result (processSport never throws on provider failure)", async () => {
    // processSport catches provider/normalization failures internally and
    // RESOLVES { status: "failed", error } — it does not throw. The loop must
    // still mark that sport ok:false so the success ping cannot fire falsely.
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0], SPORTS[1]]);
    mocks.processSport
      .mockResolvedValueOnce({ status: "success" }) // nfl ok
      .mockResolvedValueOnce({ status: "failed", error: "odds provider 502" }); // nba failed (resolved, not thrown)

    const result = await runWithTimers(refreshOdds());

    expect(mocks.processSport).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(false); // overall not ok
    expect(result.okCount).toBe(1); // only nfl counted
    expect(result.totalCount).toBe(2);
    expect(result.results).toEqual([
      expect.objectContaining({ sport: "americanfootball_nfl", ok: true }),
      expect.objectContaining({
        sport: "basketball_nba",
        ok: false,
        error: "odds provider 502",
      }),
    ]);
  });

  it("falls back to a default error when a failed result carries no message", async () => {
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
    mocks.processSport.mockResolvedValueOnce({ status: "failed" }); // no error field

    const result = await runWithTimers(refreshOdds());

    expect(result.ok).toBe(false);
    expect(result.okCount).toBe(0);
    expect(result.results).toEqual([
      expect.objectContaining({
        sport: "americanfootball_nfl",
        ok: false,
        error: "ingestion failed",
      }),
    ]);
  });

  it("returns an empty success envelope when no sports are in season", async () => {
    mocks.getInSeasonSports.mockReturnValue([]);

    const result = await runWithTimers(refreshOdds());

    expect(mocks.processSport).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, okCount: 0, totalCount: 0, results: [] });
  });

  it("freezes slate commitments AFTER the sport loop, for exactly the processed sports", async () => {
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0], SPORTS[1]]);

    await runWithTimers(refreshOdds());

    expect(mocks.freezeSlateCommitments).toHaveBeenCalledTimes(1);
    expect(mocks.freezeSlateCommitments).toHaveBeenCalledWith(
      ["americanfootball_nfl", "basketball_nba"],
      expect.any(Date),
      expect.any(Function),
      "[cron:refresh-odds]",
    );
    // Invoked strictly after every per-sport processSport call completed.
    const freezeOrder = mocks.freezeSlateCommitments.mock.invocationCallOrder[0]!;
    for (const order of mocks.processSport.mock.invocationCallOrder) {
      expect(freezeOrder).toBeGreaterThan(order);
    }
    // The injected hash is a real SHA-256 hex fn (the proof spine's HashFn).
    const hash = mocks.freezeSlateCommitments.mock.calls[0]![2] as (s: string) => string;
    expect(hash("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("does not fail the refresh cycle when the freeze pass rejects (non-fatal)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.freezeSlateCommitments.mockRejectedValue(new Error("freeze exploded"));

    const result = await runWithTimers(refreshOdds());

    expect(result.ok).toBe(true); // the odds refresh itself still succeeded
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("freeze exploded"));
    warn.mockRestore();
  });

  describe("soft-fails instead of inventing quotes when the paid provider is unavailable", () => {
    // Neither branch may throw: a cron caller that doesn't catch would crash
    // the whole invocation over a billing/config problem, and — the actual
    // risk this guards — nothing here may substitute a fabricated quote to
    // keep the loop looking healthy. `ok:false` with a named reason is the
    // only honest response to "there is no real price to report."
    afterEach(() => {
      delete process.env["ODDS_PROVIDER"];
    });

    it("uses ESPN free path when no Odds/Rundown keys (never invents; processSport soft-fails empty)", async () => {
      for (const k of [
        "THE_ODDS_API_KEY","ODDS_API_KEY","THEODDS_API_KEY","THE_ODDS_API",
        "ODDS_API_KEY_FREE","FREE_ODDS_API_KEY","ODDSAPI_KEY","ODDS_API_IO_KEY",
        "ODDS_KEY","THE_ODDS_KEY","ODDSAPI","THEODDSAPI_KEY","THE_ODDS_API_TOKEN",
        "ODDS_API_TOKEN","THEODDS_KEY","API_KEY_ODDS","ODDSAPIKEY",
        "RUNDOWN_API_KEY","RUNDOWN_KEY","THERUNDOWN_API_KEY","THE_RUNDOWN_API_KEY",
        "THERUNDOWN_KEY","THE_RUNDOWN_KEY","RUNDOWN_API_TOKEN","FREE_RUNDOWN_API_KEY",
        "THERUNDOWN_API","RUNDOWN","THERUNDOWN","THE_RUNDOWN","RUNDOWN_TOKEN",
        "THERUNDOWN_TOKEN","RUNDOWN_IO_KEY","THERUNDOWN_IO_KEY",
      ]) delete process.env[k];

      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
      mocks.getReadinessGates.mockReturnValue(GATES);
      mocks.processSport.mockResolvedValue({
        sport: SPORTS[0].key,
        status: "success",
        oddsInserted: 3,
        provider: "espn_public",
        eventsCount: 2,
        games: 2,
        picks: 1,
      });
      mocks.freezeSlateCommitments.mockResolvedValue([]);

      const resultPromise = refreshOdds();
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.ok).toBe(true);
      expect(mocks.processSport).toHaveBeenCalled();
      // Sentinel key for ESPN tertiary free path
      expect(mocks.processSport.mock.calls[0]![1]).toBe("espn-free-path");
      expect(result.results[0]!.provider).toBe("espn_public");
    });

    it("soft-fails with a named reason when ODDS_PROVIDER=offline, even with a valid key present", async () => {
      // The explicit operator override takes priority over having a key at
      // all — this is the founder's documented way to force offline mode
      // (e.g. while the subscription is unpaid) without having to also unset
      // the key.
      process.env["ODDS_PROVIDER"] = "offline";

      const result = await refreshOdds();

      expect(result.ok).toBe(false);
      expect(result.results).toEqual([
        { sport: "_", ok: false, error: "ODDS_PROVIDER=offline — refusing to invent quotes" },
      ]);
      expect(mocks.processSport).not.toHaveBeenCalled();
    });

    it("is case-insensitive and trims ODDS_PROVIDER, so 'Offline'/' offline ' also soft-fail", async () => {
      process.env["ODDS_PROVIDER"] = " Offline ";

      const result = await refreshOdds();

      expect(result.ok).toBe(false);
    });
  });

  it("throws UnsupportedSportError for an unknown explicit sport", async () => {
    await expect(refreshOdds({ sport: "cricket_ipl" })).rejects.toBeInstanceOf(
      UnsupportedSportError,
    );
    expect(mocks.processSport).not.toHaveBeenCalled();
  });

  /**
   * C-109: the paid odds path consults the injected credit governor per
   * sport. A held sport is reported, not dropped; a governor outage fails
   * open; the free paths (no Odds key) are never gated.
   */
  describe("credit governor (C-109)", () => {
    const governor = stubGovernor;

    it("skips a sport the governor holds and reports it with a note, running the others", async () => {
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0], SPORTS[1], SPORTS[2]]);
      const info = vi.spyOn(console, "info").mockImplementation(() => {});
      const gov = governor({
        basketball_nba: { allow: false, reason: "no event within 48h on the free scoreboard" },
      });

      const result = await runWithTimers(refreshOdds({ governor: gov }));

      expect(mocks.processSport).toHaveBeenCalledTimes(2);
      expect(mocks.processSport.mock.calls.map((c) => (c[0] as { key: string }).key)).toEqual([
        "americanfootball_nfl",
        "baseball_mlb",
      ]);
      expect(result.ok).toBe(true);
      expect(result.results).toEqual([
        expect.objectContaining({ sport: "americanfootball_nfl", ok: true }),
        {
          sport: "basketball_nba",
          ok: true,
          oddsInserted: 0,
          note: `${CREDIT_GOVERNOR_SKIP_NOTE}: no event within 48h on the free scoreboard`,
        },
        expect.objectContaining({ sport: "baseball_mlb", ok: true }),
      ]);
      expect(info).toHaveBeenCalledWith(
        expect.stringContaining("basketball_nba: paid odds fetch skipped, credit governor"),
      );
      // Every sport was put to the governor: decide() reserves the hourly slot
      // and writes the marker for the first paid request. No run made an
      // additional paid request, so no extra marker was appended.
      expect(gov.decide.mock.calls.map((c) => c[0])).toEqual([
        "americanfootball_nfl",
        "basketball_nba",
        "baseball_mlb",
      ]);
      expect(gov.recordCall).not.toHaveBeenCalled();
      info.mockRestore();
    });

    it("reserves the slot (decide) before the paid fetch and records the credit headers after it; one request needs no extra marker", async () => {
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
      mocks.processSport.mockResolvedValueOnce({ status: "success", oddsApiRemainingRequests: 18000 });
      const gov = governor({});

      await runWithTimers(refreshOdds({ governor: gov }));

      expect(gov.decide).toHaveBeenCalledWith("americanfootball_nfl");
      expect(gov.decide.mock.invocationCallOrder[0]!).toBeLessThan(
        mocks.processSport.mock.invocationCallOrder[0]!,
      );
      expect(gov.recordCall).not.toHaveBeenCalled();
      expect(gov.recordCredits).toHaveBeenCalledWith({ remaining: 18000, used: null, observedAt: expect.any(Date) });
    });

    it("carries x-requests-used from the envelope into the credit observation (null when the run did not see it)", async () => {
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
      mocks.processSport.mockResolvedValueOnce({
        status: "success",
        oddsApiRemainingRequests: 17995,
        oddsApiUsedRequests: 2005,
      });
      const gov = governor({});

      await runWithTimers(refreshOdds({ governor: gov }));

      expect(gov.recordCredits).toHaveBeenCalledWith({ remaining: 17995, used: 2005, observedAt: expect.any(Date) });
    });

    it("does not record credits when processSport reported none", async () => {
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
      const gov = governor({});
      await runWithTimers(refreshOdds({ governor: gov }));
      expect(gov.recordCredits).not.toHaveBeenCalled();
      expect(gov.recordCall).not.toHaveBeenCalled();
    });

    /**
     * Review finding: one run can make several paid requests (a preseason leg,
     * the Pinnacle archive request) and processSport reports how many in
     * `paidRequestCount`. The reservation covered the first; every additional
     * request gets its own marker, so the ledger counts every spend.
     */
    it("appends one marker per ADDITIONAL paid request (paidRequestCount 3 -> two extra markers, one quota reading)", async () => {
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
      mocks.processSport.mockResolvedValueOnce({
        status: "success",
        oddsApiRemainingRequests: 17990,
        oddsApiUsedRequests: 2010,
        paidRequestCount: 3,
      });
      const gov = governor({});

      await runWithTimers(refreshOdds({ governor: gov }));

      expect(gov.recordCall).toHaveBeenCalledTimes(2);
      for (const call of gov.recordCall.mock.calls) {
        expect(call).toEqual(["americanfootball_nfl", expect.any(Date)]);
      }
      // Extra markers are appended AFTER the run (the count is only known then).
      for (const order of gov.recordCall.mock.invocationCallOrder) {
        expect(order).toBeGreaterThan(mocks.processSport.mock.invocationCallOrder[0]!);
      }
      expect(gov.recordCredits).toHaveBeenCalledTimes(1);
      expect(gov.recordCredits).toHaveBeenCalledWith({ remaining: 17990, used: null, observedAt: expect.any(Date) });
    });

    it("a paid response without paidRequestCount counts as one request (older envelope): no extra marker", async () => {
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
      mocks.processSport.mockResolvedValueOnce({ status: "success", oddsApiRemainingRequests: 18000 });
      const gov = governor({});

      await runWithTimers(refreshOdds({ governor: gov }));

      expect(gov.recordCall).not.toHaveBeenCalled();
      expect(gov.recordCredits).toHaveBeenCalledTimes(1);
    });

    it("records the quota reading and the extra markers from a FAILED envelope: a request that spent a credit but failed to persist", async () => {
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
      mocks.processSport.mockResolvedValueOnce({
        status: "failed",
        error: "persist failed",
        oddsApiRemainingRequests: 17000,
        paidRequestCount: 2,
      });
      const gov = governor({});

      const result = await runWithTimers(refreshOdds({ governor: gov }));

      expect(result.ok).toBe(false);
      expect(gov.recordCredits).toHaveBeenCalledWith({ remaining: 17000, used: null, observedAt: expect.any(Date) });
      expect(gov.recordCall).toHaveBeenCalledTimes(1);
    });

    it("a run that made no paid request (paidRequestCount 0, no header) records nothing", async () => {
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
      mocks.processSport.mockResolvedValueOnce({ status: "success", note: "quiet_board", paidRequestCount: 0 });
      const gov = governor({});

      await runWithTimers(refreshOdds({ governor: gov }));

      expect(gov.recordCall).not.toHaveBeenCalled();
      expect(gov.recordCredits).not.toHaveBeenCalled();
    });

    it("paidRequestCountOf reads the envelope defensively", () => {
      // A real envelope; the contract field is `paidRequestCount?: number` on
      // ProcessSportResult, and a malformed value is still read defensively.
      const base: import("../process-sport.js").ProcessSportResult = {
        sport: "x",
        status: "success",
        games: 0,
        picks: 0,
      };
      // Attached through Object.assign so a non-number value can be handed to
      // the reader without an excess-property check on the literal.
      const withCount = (paidRequestCount: unknown) => Object.assign({ ...base }, { paidRequestCount });
      expect(paidRequestCountOf(base)).toBeNull();
      expect(paidRequestCountOf(withCount(3))).toBe(3);
      expect(paidRequestCountOf(withCount(2.7))).toBe(2);
      expect(paidRequestCountOf(withCount(-1))).toBeNull();
      expect(paidRequestCountOf(withCount(Number.NaN))).toBeNull();
      expect(paidRequestCountOf(withCount("3"))).toBeNull();
    });

    it("a governor that throws fails open: the sport is still refreshed", async () => {
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
      const gov = {
        decide: vi.fn(async () => {
          throw new Error("ledger down");
        }),
        recordCall: vi.fn(async () => {
          throw new Error("ledger down");
        }),
        recordCredits: vi.fn(async () => {
          throw new Error("ledger down");
        }),
      };
      mocks.processSport.mockResolvedValueOnce({ status: "success", oddsApiRemainingRequests: 17000 });

      const result = await runWithTimers(refreshOdds({ governor: gov }));

      expect(mocks.processSport).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(true);
    });

    it("governedDecision reports whether the slot was RESERVED: true only when the governor itself allowed", async () => {
      const allowing = governor({});
      expect(await governedDecision(allowing, "americanfootball_nfl")).toEqual({
        allow: true,
        reserved: true,
        reason: "pace ok",
      });
      const holding = governor({ americanfootball_nfl: { allow: false, reason: "zero credits remaining" } });
      expect(await governedDecision(holding, "americanfootball_nfl")).toEqual({
        allow: false,
        reserved: false,
        reason: "zero credits remaining",
      });
      const throwing = {
        ...governor({}),
        decide: vi.fn(async () => {
          throw new Error("ledger down");
        }),
      };
      expect(await governedDecision(throwing, "americanfootball_nfl")).toEqual({
        allow: true,
        reserved: false,
        reason: "governor unavailable, proceeding: ledger down",
      });
    });

    it("when decide() threw (fail-open, nothing reserved) the run's FIRST paid request is marked too, so it is never missing from the ledger", async () => {
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
      const gov = {
        ...governor({}),
        decide: vi.fn(async () => {
          throw new Error("ledger down");
        }),
      };
      mocks.processSport.mockResolvedValueOnce({
        status: "success",
        oddsApiRemainingRequests: 17000,
        paidRequestCount: 2,
      });

      await runWithTimers(refreshOdds({ governor: gov }));

      // Two paid requests, none reserved by decide(): two markers, not one.
      expect(gov.recordCall).toHaveBeenCalledTimes(2);
      expect(gov.recordCredits).toHaveBeenCalledTimes(1);
    });

    it("recordPaidRunAccounting marks every request when nothing was reserved, and only the extras when the first was", async () => {
      const base: import("../process-sport.js").ProcessSportResult = {
        sport: "americanfootball_nfl",
        status: "success",
        games: 0,
        picks: 0,
        oddsApiRemainingRequests: 17000,
        paidRequestCount: 2,
      };
      const reserved = governor({});
      await recordPaidRunAccounting(reserved, "americanfootball_nfl", base, { reserved: true });
      expect(reserved.recordCall).toHaveBeenCalledTimes(1);

      const unreserved = governor({});
      await recordPaidRunAccounting(unreserved, "americanfootball_nfl", base, { reserved: false });
      expect(unreserved.recordCall).toHaveBeenCalledTimes(2);

      // An older envelope (no paidRequestCount) with one paid response is one request.
      const single = governor({});
      await recordPaidRunAccounting(
        single,
        "americanfootball_nfl",
        { ...base, paidRequestCount: undefined },
        { reserved: false },
      );
      expect(single.recordCall).toHaveBeenCalledTimes(1);
    });

    it("recordPaidRunAccounting never throws: a governor whose recordCall / recordCredits throw SYNCHRONOUSLY is swallowed", async () => {
      const gov = {
        decide: vi.fn(async () => ({ allow: true, reason: "pace ok" })),
        // Not async: the throw happens before any promise exists.
        recordCall: vi.fn((): Promise<void> => {
          throw new Error("sync ledger failure");
        }),
        recordCredits: vi.fn((): Promise<void> => {
          throw new Error("sync ledger failure");
        }),
      };
      const res: import("../process-sport.js").ProcessSportResult = {
        sport: "americanfootball_nfl",
        status: "success",
        games: 0,
        picks: 0,
        oddsApiRemainingRequests: 17000,
        paidRequestCount: 3,
      };

      await expect(recordPaidRunAccounting(gov, "americanfootball_nfl", res)).resolves.toBeUndefined();
      expect(gov.recordCall).toHaveBeenCalledTimes(2);
      expect(gov.recordCredits).toHaveBeenCalledTimes(1);

      // Through the loop as well: the cycle completes and the sport is ok.
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
      mocks.processSport.mockResolvedValueOnce(res);
      const result = await runWithTimers(refreshOdds({ governor: gov }));
      expect(result.ok).toBe(true);
    });

    it("isLowQuota is the shared cutoff: below the threshold only, never on a header-less reading", () => {
      expect(ODDS_API_LOW_QUOTA_THRESHOLD).toBe(10);
      expect(isLowQuota({ oddsApiRemainingRequests: 9 })).toBe(true);
      expect(isLowQuota({ oddsApiRemainingRequests: 10 })).toBe(false);
      expect(isLowQuota({ oddsApiRemainingRequests: null })).toBe(false);
      expect(isLowQuota({})).toBe(false);
    });

    it("never gates the free paths: without an Odds key the governor is not consulted", async () => {
      process.env["THE_ODDS_API_KEY"] = "";
      delete process.env["ODDS_API_KEY"];
      delete process.env["FREE_ODDS_API_KEY"];
      delete process.env["RUNDOWN_API_KEY"];
      delete process.env["RUNDOWN_KEY"];
      delete process.env["FREE_RUNDOWN_API_KEY"];
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
      const gov = governor({ americanfootball_nfl: { allow: false, reason: "zero credits remaining" } });

      await runWithTimers(refreshOdds({ governor: gov }));

      expect(gov.decide).not.toHaveBeenCalled();
      expect(mocks.processSport).toHaveBeenCalledTimes(1);
      expect(mocks.processSport.mock.calls[0]![1]).toBe("espn-free-path");
    });
  });

  /**
   * C-109 review finding: pacing used to apply only when the caller passed a
   * governor, so board-fill (4x/h), free-spine-health and the traffic
   * heartbeat ran paid refreshes outside the ledger budget. Now refreshOdds
   * builds the default ledger-backed governor itself whenever the paid path is
   * active and nothing was injected; `governor: null` is the only, test-only,
   * way to switch pacing off.
   */
  describe("default governor: every production caller is paced (C-109)", () => {
    it("builds the ledger-backed default from the shared Prisma client when none is injected, and honors its hold", async () => {
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0], SPORTS[1], SPORTS[2]]);
      const info = vi.spyOn(console, "info").mockImplementation(() => {});
      const gov = stubGovernor({
        basketball_nba: { allow: false, reason: "no event within 48h on the free scoreboard" },
      });
      mocks.buildPaidOddsGovernor.mockReturnValue(gov);

      // Exactly what board-fill / free-spine-health / the heartbeat do: no governor option.
      const result = await runWithTimers(refreshOdds());

      expect(mocks.buildPaidOddsGovernor).toHaveBeenCalledTimes(1);
      expect(mocks.buildPaidOddsGovernor).toHaveBeenCalledWith({ db: hoisted.DB, atomicCapable: true });
      expect(gov.decide.mock.calls.map((c) => c[0])).toEqual([
        "americanfootball_nfl",
        "basketball_nba",
        "baseball_mlb",
      ]);
      expect(mocks.processSport.mock.calls.map((c) => (c[0] as { key: string }).key)).toEqual([
        "americanfootball_nfl",
        "baseball_mlb",
      ]);
      expect(result.ok).toBe(true);
      expect(result.results[1]).toEqual({
        sport: "basketball_nba",
        ok: true,
        oddsInserted: 0,
        note: `${CREDIT_GOVERNOR_SKIP_NOTE}: no event within 48h on the free scoreboard`,
      });
      // Single-request runs: the reservation inside decide() is the marker.
      expect(gov.recordCall).not.toHaveBeenCalled();
      expect(info).toHaveBeenCalledWith(
        expect.stringContaining("basketball_nba: paid odds fetch skipped, credit governor"),
      );
      info.mockRestore();
    });

    it("tells the ledger the shared client is the STUB when @sports/db is in stub mode (no advisory mutex there)", async () => {
      hoisted.isStubMode.mockReturnValue(true);
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);

      await runWithTimers(refreshOdds());

      expect(mocks.buildPaidOddsGovernor).toHaveBeenCalledWith({ db: hoisted.DB, atomicCapable: false });
    });

    it("the default is built once per cycle, not once per sport", async () => {
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0], SPORTS[1], SPORTS[2]]);

      await runWithTimers(refreshOdds());

      expect(mocks.buildPaidOddsGovernor).toHaveBeenCalledTimes(1);
      expect(mocks.processSport).toHaveBeenCalledTimes(3);
    });

    it("an explicit `sport` still goes through the default governor", async () => {
      const gov = stubGovernor({ baseball_mlb: { allow: false, reason: "zero credits remaining" } });
      mocks.buildPaidOddsGovernor.mockReturnValue(gov);
      const info = vi.spyOn(console, "info").mockImplementation(() => {});

      const result = await runWithTimers(refreshOdds({ sport: "baseball_mlb" }));

      expect(mocks.processSport).not.toHaveBeenCalled();
      expect(result.results).toEqual([
        {
          sport: "baseball_mlb",
          ok: true,
          oddsInserted: 0,
          note: `${CREDIT_GOVERNOR_SKIP_NOTE}: zero credits remaining`,
        },
      ]);
      info.mockRestore();
    });

    it("an injected governor takes precedence: the default is never built", async () => {
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
      const injected = stubGovernor({
        americanfootball_nfl: { allow: false, reason: "reserve: held by the injected stub" },
      });
      const info = vi.spyOn(console, "info").mockImplementation(() => {});

      const result = await runWithTimers(refreshOdds({ governor: injected }));

      expect(mocks.buildPaidOddsGovernor).not.toHaveBeenCalled();
      expect(injected.decide).toHaveBeenCalledWith("americanfootball_nfl");
      expect(mocks.processSport).not.toHaveBeenCalled();
      expect(result.results[0]!.note).toBe(
        `${CREDIT_GOVERNOR_SKIP_NOTE}: reserve: held by the injected stub`,
      );
      info.mockRestore();
    });

    it("`governor: null` is the test-only off switch: no default is built and nothing is paced", async () => {
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0], SPORTS[1]]);
      mocks.buildPaidOddsGovernor.mockReturnValue(
        stubGovernor({ americanfootball_nfl: { allow: false, reason: "would hold" } }),
      );

      const result = await runWithTimers(refreshOdds({ governor: null }));

      expect(mocks.buildPaidOddsGovernor).not.toHaveBeenCalled();
      expect(mocks.processSport).toHaveBeenCalledTimes(2);
      expect(result.results.every((r) => r.ok && r.note === undefined)).toBe(true);
    });

    it("never builds the default on the free paths (no Odds key: nothing to pace)", async () => {
      process.env["THE_ODDS_API_KEY"] = "";
      delete process.env["ODDS_API_KEY"];
      delete process.env["FREE_ODDS_API_KEY"];
      delete process.env["RUNDOWN_API_KEY"];
      delete process.env["RUNDOWN_KEY"];
      delete process.env["FREE_RUNDOWN_API_KEY"];
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);

      await runWithTimers(refreshOdds());

      expect(mocks.buildPaidOddsGovernor).not.toHaveBeenCalled();
      expect(mocks.processSport).toHaveBeenCalledTimes(1);
      expect(mocks.processSport.mock.calls[0]![1]).toBe("espn-free-path");
    });

    it("a default governor that cannot be built fails open: the refresh still runs, with a warning", async () => {
      mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      mocks.buildPaidOddsGovernor.mockImplementation(() => {
        throw new Error("ledger client not initialised");
      });

      const result = await runWithTimers(refreshOdds());

      expect(mocks.processSport).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(true);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("default credit governor unavailable, proceeding unpaced: ledger client not initialised"),
      );
      warn.mockRestore();
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * C-109 review: the data-refresh worker drove processSport with the paid key
 * OUTSIDE the credit governor (it never went through refreshOdds). The cycle
 * now builds the pipeline's default ledger-backed governor once per cycle,
 * honors decide() per sport, and runs the pipeline's own paid-run accounting
 * after each call. Mocks follow the refresh-odds.test.ts pattern: hoisted
 * vi.fn()s for the paid fetch, the sport list, the gates and the governor
 * FACTORY; the decision and accounting helpers are the real ones.
 */

const hoisted = vi.hoisted(() => {
  const SPORTS = [
    { key: "americanfootball_nfl", name: "NFL", displayName: "NFL" },
    { key: "basketball_nba", name: "NBA", displayName: "NBA" },
  ] as const;
  type Envelope = {
    status: "success" | "failed";
    error?: string;
    oddsApiRemainingRequests?: number | null;
    oddsApiUsedRequests?: number | null;
    paidRequestCount?: number;
  };
  return {
    SPORTS,
    processSport: vi.fn<(...args: unknown[]) => Promise<Envelope>>(),
    getInSeasonSports: vi.fn<() => Array<{ key: string; name: string; displayName: string }>>(),
    getReadinessGates: vi.fn<() => unknown>(),
    resolvePaidOddsGovernor: vi.fn<(injected: unknown, logPrefix?: string) => unknown>(),
  };
});

const SPORTS = hoisted.SPORTS;
const mocks = {
  processSport: hoisted.processSport,
  getInSeasonSports: hoisted.getInSeasonSports,
  getReadinessGates: hoisted.getReadinessGates,
  resolvePaidOddsGovernor: hoisted.resolvePaidOddsGovernor,
};

vi.mock("@sports/data-ingestion", () => ({
  getInSeasonSports: hoisted.getInSeasonSports,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: hoisted.getReadinessGates,
}));

vi.mock("@sports/ingestion-pipeline", async () => {
  // The worker's decision and accounting must be the pipeline's own helpers
  // (real, dependency-free module); only the paid fetch and the governor
  // factory are stubbed.
  const accounting = await vi.importActual<
    typeof import("@sports/ingestion-pipeline/src/paid-run-accounting.js")
  >("@sports/ingestion-pipeline/src/paid-run-accounting.js");
  return {
    processSport: hoisted.processSport,
    resolvePaidOddsGovernor: hoisted.resolvePaidOddsGovernor,
    governedDecision: accounting.governedDecision,
    recordPaidRunAccounting: accounting.recordPaidRunAccounting,
  };
});

import { runRefreshCycle } from "../refresh-cycle.js";

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

/** Run the cycle while flushing the inter-sport setTimeout pauses. */
async function runWithTimers<T>(p: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return p;
}

let logSpy: ReturnType<typeof vi.spyOn>;
let infoSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  for (const m of Object.values(mocks)) m.mockReset();
  process.env["THE_ODDS_API_KEY"] = "test-key";
  mocks.getReadinessGates.mockReturnValue(GATES);
  mocks.getInSeasonSports.mockReturnValue([SPORTS[0], SPORTS[1]]);
  mocks.processSport.mockResolvedValue({ status: "success" });
  mocks.resolvePaidOddsGovernor.mockImplementation(() => stubGovernor({}));
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  logSpy.mockRestore();
  infoSpy.mockRestore();
  errorSpy.mockRestore();
  delete process.env["THE_ODDS_API_KEY"];
});

describe("runRefreshCycle (data-refresh worker, C-109 governed)", () => {
  it("refuses to run without THE_ODDS_API_KEY (this worker is the paid path)", async () => {
    delete process.env["THE_ODDS_API_KEY"];
    await expect(runRefreshCycle()).rejects.toThrow(/THE_ODDS_API_KEY not set/);
    expect(mocks.processSport).not.toHaveBeenCalled();
    expect(mocks.resolvePaidOddsGovernor).not.toHaveBeenCalled();
  });

  it("builds the default governor once per cycle (worker log prefix) and runs every allowed sport through processSport", async () => {
    const summary = await runWithTimers(runRefreshCycle());

    expect(mocks.resolvePaidOddsGovernor).toHaveBeenCalledTimes(1);
    expect(mocks.resolvePaidOddsGovernor).toHaveBeenCalledWith(undefined, "[data-refresh]");
    expect(mocks.processSport).toHaveBeenCalledTimes(2);
    expect(mocks.processSport).toHaveBeenNthCalledWith(1, SPORTS[0], "test-key", GATES, "[data-refresh]");
    expect(mocks.processSport).toHaveBeenNthCalledWith(2, SPORTS[1], "test-key", GATES, "[data-refresh]");
    expect(summary).toEqual({ total: 2, failed: 0, held: 0, skipped: 0 });
  });

  it("skips a sport the governor holds, logs the governor's reason, and still runs the others", async () => {
    const gov = stubGovernor({
      basketball_nba: { allow: false, reason: "no event within 48h on the free scoreboard" },
    });
    mocks.resolvePaidOddsGovernor.mockReturnValue(gov);

    const summary = await runWithTimers(runRefreshCycle());

    expect(gov.decide.mock.calls.map((c) => c[0])).toEqual(["americanfootball_nfl", "basketball_nba"]);
    expect(mocks.processSport).toHaveBeenCalledTimes(1);
    expect(mocks.processSport).toHaveBeenCalledWith(SPORTS[0], "test-key", GATES, "[data-refresh]");
    expect(infoSpy).toHaveBeenCalledWith(
      "[data-refresh] basketball_nba: paid odds fetch skipped, credit governor: no event within 48h on the free scoreboard",
    );
    // A held sport is neither processed nor failed; it is reported as held.
    expect(summary).toEqual({ total: 1, failed: 0, held: 1, skipped: 0 });
    // The held sport spent nothing, so nothing was recorded for it.
    expect(gov.recordCall).not.toHaveBeenCalled();
    expect(gov.recordCredits).not.toHaveBeenCalled();
  });

  it("decide() runs before the paid fetch; an allowed sport's quota reading is recorded after it", async () => {
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
    mocks.processSport.mockResolvedValueOnce({ status: "success", oddsApiRemainingRequests: 18000 });
    const gov = stubGovernor({});
    mocks.resolvePaidOddsGovernor.mockReturnValue(gov);

    await runWithTimers(runRefreshCycle());

    expect(gov.decide).toHaveBeenCalledWith("americanfootball_nfl");
    expect(gov.decide.mock.invocationCallOrder[0]!).toBeLessThan(mocks.processSport.mock.invocationCallOrder[0]!);
    expect(gov.recordCredits).toHaveBeenCalledTimes(1);
    expect(gov.recordCredits).toHaveBeenCalledWith({ remaining: 18000, used: null, observedAt: expect.any(Date) });
    expect(gov.recordCredits.mock.invocationCallOrder[0]!).toBeGreaterThan(
      mocks.processSport.mock.invocationCallOrder[0]!,
    );
    // One paid request: the reservation inside decide() is its marker; no extra.
    expect(gov.recordCall).not.toHaveBeenCalled();
  });

  it("records one extra marker per additional paid request (paidRequestCount 3 -> two), same accounting as refreshOdds", async () => {
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
    mocks.processSport.mockResolvedValueOnce({
      status: "success",
      oddsApiRemainingRequests: 17990,
      paidRequestCount: 3,
    });
    const gov = stubGovernor({});
    mocks.resolvePaidOddsGovernor.mockReturnValue(gov);

    await runWithTimers(runRefreshCycle());

    expect(gov.recordCall).toHaveBeenCalledTimes(2);
    for (const call of gov.recordCall.mock.calls) {
      expect(call).toEqual(["americanfootball_nfl", expect.any(Date)]);
    }
    expect(gov.recordCredits).toHaveBeenCalledWith({ remaining: 17990, used: null, observedAt: expect.any(Date) });
  });

  it("carries x-requests-used from the envelope into the credit observation", async () => {
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
    mocks.processSport.mockResolvedValueOnce({
      status: "success",
      oddsApiRemainingRequests: 17985,
      oddsApiUsedRequests: 2015,
    });
    const gov = stubGovernor({});
    mocks.resolvePaidOddsGovernor.mockReturnValue(gov);

    await runWithTimers(runRefreshCycle());

    expect(gov.recordCredits).toHaveBeenCalledWith({ remaining: 17985, used: 2015, observedAt: expect.any(Date) });
  });

  it("a failed envelope still records the quota reading it carried and counts as failed", async () => {
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
    mocks.processSport.mockResolvedValueOnce({
      status: "failed",
      error: "persist failed",
      oddsApiRemainingRequests: 17000,
    });
    const gov = stubGovernor({});
    mocks.resolvePaidOddsGovernor.mockReturnValue(gov);

    const summary = await runWithTimers(runRefreshCycle());

    expect(gov.recordCredits).toHaveBeenCalledWith({ remaining: 17000, used: null, observedAt: expect.any(Date) });
    expect(summary).toEqual({ total: 1, failed: 1, held: 0, skipped: 0 });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("1/1 in-season sports FAILED"));
  });

  it("a processSport REJECTION (the ingestion-run insert failing before its handler) counts that sport as failed, logs it, and the cycle continues to the next sport with a summary", async () => {
    mocks.processSport
      .mockRejectedValueOnce(new Error("ingestionRun.create: connection refused"))
      .mockResolvedValueOnce({ status: "success", oddsApiRemainingRequests: 17900 });
    const gov = stubGovernor({});
    mocks.resolvePaidOddsGovernor.mockReturnValue(gov);

    const summary = await runWithTimers(runRefreshCycle());

    expect(mocks.processSport).toHaveBeenCalledTimes(2);
    expect(mocks.processSport).toHaveBeenNthCalledWith(2, SPORTS[1], "test-key", GATES, "[data-refresh]");
    expect(summary).toEqual({ total: 2, failed: 1, held: 0, skipped: 0 });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("americanfootball_nfl: processSport threw — ingestionRun.create: connection refused"),
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("1/2 in-season sports FAILED"));
    // No envelope for the thrown sport, so nothing was recorded for it; the
    // second sport's reading still lands.
    expect(gov.recordCredits).toHaveBeenCalledTimes(1);
    expect(gov.recordCredits).toHaveBeenCalledWith({ remaining: 17900, used: null, observedAt: expect.any(Date) });
  });

  it("stops starting new sports once a response reports fewer than the low-quota threshold (same cutoff as refreshOdds) and reports them as skipped", async () => {
    const MLB = { key: "baseball_mlb", name: "MLB", displayName: "MLB" };
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0], SPORTS[1], MLB]);
    // Only ONE resolution on purpose: a second processSport call would hang on
    // the unconfigured mock and time this test out, catching the regression.
    mocks.processSport.mockResolvedValueOnce({ status: "success", oddsApiRemainingRequests: 5 });
    const gov = stubGovernor({});
    mocks.resolvePaidOddsGovernor.mockReturnValue(gov);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const summary = await runWithTimers(runRefreshCycle());

    expect(mocks.processSport).toHaveBeenCalledTimes(1);
    // The governor is not even asked for the skipped sports: no slot is reserved for them.
    expect(gov.decide).toHaveBeenCalledTimes(1);
    expect(summary).toEqual({ total: 1, failed: 0, held: 0, skipped: 2 });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("only 5 Odds API credits left — skipping the remaining 2 in-season sport(s)"),
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("2 skipped on low quota"));
    warnSpy.mockRestore();
  });

  it("does NOT cut off at exactly the threshold or on a header-less (null) reading", async () => {
    mocks.processSport
      .mockResolvedValueOnce({ status: "success", oddsApiRemainingRequests: 10 })
      .mockResolvedValueOnce({ status: "success", oddsApiRemainingRequests: null });

    const summary = await runWithTimers(runRefreshCycle());

    expect(mocks.processSport).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({ total: 2, failed: 0, held: 0, skipped: 0 });
  });

  it("no paid response: nothing is recorded", async () => {
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
    const gov = stubGovernor({});
    mocks.resolvePaidOddsGovernor.mockReturnValue(gov);

    await runWithTimers(runRefreshCycle());

    expect(gov.recordCall).not.toHaveBeenCalled();
    expect(gov.recordCredits).not.toHaveBeenCalled();
  });

  it("a governor whose decide() throws fails open: the sport is still refreshed", async () => {
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
    const gov = {
      decide: vi.fn(async () => {
        throw new Error("ledger down");
      }),
      recordCall: vi.fn(async () => undefined),
      recordCredits: vi.fn(async () => undefined),
    };
    mocks.resolvePaidOddsGovernor.mockReturnValue(gov);

    const summary = await runWithTimers(runRefreshCycle());

    expect(mocks.processSport).toHaveBeenCalledTimes(1);
    expect(summary).toEqual({ total: 1, failed: 0, held: 0, skipped: 0 });
  });

  it("when decide() threw (fail-open, no slot reserved) the run's FIRST paid request is marked too, so it is never missing from the ledger", async () => {
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
    const gov = {
      decide: vi.fn(async () => {
        throw new Error("ledger down");
      }),
      recordCall: vi.fn(async () => undefined),
      recordCredits: vi.fn(async () => undefined),
    };
    mocks.resolvePaidOddsGovernor.mockReturnValue(gov);
    mocks.processSport.mockResolvedValueOnce({
      status: "success",
      oddsApiRemainingRequests: 17500,
      paidRequestCount: 2,
    });

    await runWithTimers(runRefreshCycle());

    // Two paid requests, none reserved by decide(): two markers, not one.
    expect(gov.recordCall).toHaveBeenCalledTimes(2);
    expect(gov.recordCredits).toHaveBeenCalledWith({ remaining: 17500, used: null, observedAt: expect.any(Date) });
  });

  it("a governor whose recordCall throws SYNCHRONOUSLY never breaks the cycle (the accounting contract is never-throws)", async () => {
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0], SPORTS[1]]);
    const gov = {
      decide: vi.fn(async () => ({ allow: true, reason: "pace ok" })),
      // Not async: throws before any promise exists, so a trailing .catch could never attach.
      recordCall: vi.fn((): Promise<void> => {
        throw new Error("sync ledger failure");
      }),
      recordCredits: vi.fn(async () => undefined),
    };
    mocks.resolvePaidOddsGovernor.mockReturnValue(gov);
    mocks.processSport
      .mockResolvedValueOnce({ status: "success", oddsApiRemainingRequests: 17400, paidRequestCount: 3 })
      .mockResolvedValueOnce({ status: "success", oddsApiRemainingRequests: 17397 });

    const summary = await runWithTimers(runRefreshCycle());

    expect(summary).toEqual({ total: 2, failed: 0, held: 0, skipped: 0 });
    expect(gov.recordCall).toHaveBeenCalledTimes(2);
    expect(gov.recordCredits).toHaveBeenCalledTimes(2);
  });

  it("when the default governor cannot be built (factory yields undefined, already warned by the pipeline) the cycle runs unpaced", async () => {
    mocks.resolvePaidOddsGovernor.mockReturnValue(undefined);

    const summary = await runWithTimers(runRefreshCycle());

    expect(mocks.processSport).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({ total: 2, failed: 0, held: 0, skipped: 0 });
  });
});

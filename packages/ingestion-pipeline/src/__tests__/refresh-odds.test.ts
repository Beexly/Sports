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
 *   - SOFT-FAILS (ok:false, never a throw) on a missing API key or
 *     ODDS_PROVIDER=offline — refuses to invent quotes rather than crash the
 *     caller; throws only on an unsupported explicit sport
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
  };
});

const SPORTS = hoisted.SPORTS;
const mocks = {
  processSport: hoisted.processSport,
  getInSeasonSports: hoisted.getInSeasonSports,
  getReadinessGates: hoisted.getReadinessGates,
  freezeSlateCommitments: hoisted.freezeSlateCommitments,
};

vi.mock("../process-sport.js", () => ({
  processSport: hoisted.processSport,
}));

vi.mock("../freeze-slate-commitments.js", () => ({
  freezeSlateCommitments: hoisted.freezeSlateCommitments,
}));

vi.mock("@sports/data-ingestion", () => ({
  SUPPORTED_SPORTS: hoisted.SPORTS,
  getInSeasonSports: hoisted.getInSeasonSports,
  resolveRundownApiKey: () =>
    process.env["RUNDOWN_API_KEY"]?.trim() ||
    process.env["RUNDOWN_KEY"]?.trim() ||
    "",
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: hoisted.getReadinessGates,
}));

import { refreshOdds, UnsupportedSportError } from "../refresh-odds.js";

const GATES = { isBootstrapMode: false } as const;

beforeEach(() => {
  vi.useFakeTimers();
  for (const m of Object.values(mocks)) m.mockReset();
  process.env["THE_ODDS_API_KEY"] = "test-key";
  mocks.getReadinessGates.mockReturnValue(GATES);
  mocks.getInSeasonSports.mockReturnValue([SPORTS[0], SPORTS[1]]);
  mocks.processSport.mockResolvedValue({ status: "success" });
  mocks.freezeSlateCommitments.mockResolvedValue([]);
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
      { sport: "americanfootball_nfl", ok: true },
      { sport: "basketball_nba", ok: true },
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
      { sport: "americanfootball_nfl", ok: true },
      { sport: "basketball_nba", ok: false, error: "quota exhausted" },
      { sport: "baseball_mlb", ok: true },
    ]);
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
      { sport: "americanfootball_nfl", ok: true },
      { sport: "basketball_nba", ok: false, error: "odds provider 502" },
    ]);
  });

  it("falls back to a default error when a failed result carries no message", async () => {
    mocks.getInSeasonSports.mockReturnValue([SPORTS[0]]);
    mocks.processSport.mockResolvedValueOnce({ status: "failed" }); // no error field

    const result = await runWithTimers(refreshOdds());

    expect(result.ok).toBe(false);
    expect(result.okCount).toBe(0);
    expect(result.results).toEqual([
      { sport: "americanfootball_nfl", ok: false, error: "ingestion failed" },
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

    it("soft-fails with a named reason when no odds keys configured", async () => {
      delete process.env["THE_ODDS_API_KEY"];
      delete process.env["RUNDOWN_API_KEY"];
      delete process.env["RUNDOWN_KEY"];

      const result = await refreshOdds();

      expect(result).toEqual({
        ok: false,
        elapsedMs: expect.any(Number),
        okCount: 0,
        totalCount: 0,
        results: [
          {
            sport: "_",
            ok: false,
            error: "No odds key — set THE_ODDS_API_KEY and/or RUNDOWN_API_KEY (free dual-path)",
          },
        ],
        freeze: [],
      });
      // Never reaches the per-sport loop at all — there is nothing to fetch
      // odds FOR without a key, so no sport should appear to have been tried.
      expect(mocks.processSport).not.toHaveBeenCalled();
      expect(mocks.getInSeasonSports).not.toHaveBeenCalled();
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
});

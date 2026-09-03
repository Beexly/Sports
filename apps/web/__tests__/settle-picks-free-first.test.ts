import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { backfillStaleSettlement } from "@/lib/data-sources/settle-backfill";

/**
 * Tripwire for the settlement law (2026-09-02): the FREE grader runs first on
 * every settle-picks cycle; a present THE_ODDS_API_KEY only adds a paid
 * supplement afterwards, and a failing supplement never makes the cycle red
 * or stops the free pass from grading. This is the structural fix for the
 * 2026-08-24 → 09-02 outage, where a dead key made the paid branch run alone
 * and throw every hour while ESPN had every final.
 *
 * Everything below the route is mocked; this never touches the network or DB.
 */

const calls: string[] = [];

vi.mock("@/lib/cron/authorize", () => ({ cronAuthError: () => null }));
vi.mock("@/lib/observability/sentry", () => ({ captureError: vi.fn() }));
vi.mock("@sports/db", () => ({ db: {} }));
vi.mock("@sports/data-ingestion", () => ({
  SUPPORTED_SPORTS: [
    { key: "baseball_mlb", name: "MLB" },
    { key: "americanfootball_nfl", name: "NFL" },
  ],
}));
vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({ isBootstrapMode: false }),
}));
vi.mock("@sports/ingestion-pipeline", () => ({
  settleSport: vi.fn(),
  freezeSlateCommitments: vi.fn(async () => []),
  computeScheduledWindow: () => ({ from: new Date(0), to: new Date(0) }),
  drainPendingTeamGameLogs: vi.fn(async () => ({ attempted: 0, done: 0, failed: 0 })),
}));
vi.mock("@/lib/settlement-outbox/worker", () => ({
  drainSettlementOutbox: vi.fn(async () => null),
}));
vi.mock("@/lib/data-sources/free-settlement-runner", () => ({
  runFreePathSettlement: vi.fn(),
}));
vi.mock("@/lib/data-sources/free-score-persist", () => ({
  persistFreeScores: vi.fn(async () => {
    calls.push("persistFreeScores");
    return { persisted: 0 };
  }),
}));
vi.mock("@/lib/data-sources/settle-backfill", () => ({
  backfillStaleSettlement: vi.fn(async () => {
    calls.push("backfillStaleSettlement");
    return { scanned: 0, settled: 0, unresolved: [] };
  }),
}));
vi.mock("@/lib/performance/settlement-health", () => ({
  loadSettlementHealth: vi.fn(async () => ({ overduePending: 3 })),
  SETTLEMENT_DEFAULT_GRACE_HOURS: 6,
}));
vi.mock("@/lib/settlement/free-path-clv", () => ({
  drainPendingClvGrades: vi.fn(async () => ({ attempted: 0, graded: 0, noClose: 0, failed: 0 })),
}));
vi.mock("@/lib/settlement/free-path-snapshot", () => ({
  drainPendingSnapshotOutcomes: vi.fn(async () => ({ attempted: 0, done: 0, failed: 0 })),
}));

import { GET } from "@/app/api/cron/settle-picks/route";
import { settleSport } from "@sports/ingestion-pipeline";
import { runFreePathSettlement } from "@/lib/data-sources/free-settlement-runner";
import { captureError } from "@/lib/observability/sentry";

function freeResult(ok = true) {
  return {
    sports: [
      { sport: "baseball_mlb", ok },
      { sport: "americanfootball_nfl", ok },
    ],
    picksSettled: 4,
    picksHeld: 1,
    clvRepair: null,
    snapshotRepair: null,
    teamGameLogRepair: null,
    scoreDates: [],
    rca: null,
  };
}

function paidResult(sport: { key: string }, status: "success" | "failed", error?: string) {
  return {
    sport: sport.key,
    status,
    gamesSettled: status === "success" ? 1 : 0,
    picksSettled: status === "success" ? 2 : 0,
    observationsRecorded: 0,
    anomaliesOpened: 0,
    anomaliesPromoted: 0,
    anomaliesResolved: 0,
    outboxAppended: 0,
    ...(error ? { error } : {}),
  };
}

type Body = {
  ok: boolean;
  path: string;
  plan: { primary: string; paidSupplement: boolean };
  picksSettled: number;
  paidSupplement: null | { ok: boolean; failedSports: string[]; totalCount: number; picksSettled: number };
  advisories: string[];
  oddsApiRequired: boolean;
};

describe("GET /api/cron/settle-picks — free-first law", () => {
  beforeEach(() => {
    calls.length = 0;
    (settleSport as Mock).mockReset();
    (runFreePathSettlement as Mock).mockReset();
    (captureError as Mock).mockReset();
    (runFreePathSettlement as Mock).mockImplementation(async () => {
      calls.push("runFreePathSettlement");
      return freeResult();
    });
    (settleSport as Mock).mockImplementation(async (sport: { key: string }) => {
      calls.push(`settleSport:${sport.key}`);
      return paidResult(sport, "success");
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("with a key present: free pass runs before any paid call, then the paid supplement grades the rest", async () => {
    vi.stubEnv("THE_ODDS_API_KEY", "sk_live_present");
    const res = await GET(new Request("http://x/api/cron/settle-picks"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Body;

    expect(calls.indexOf("runFreePathSettlement")).toBeGreaterThan(-1);
    expect(calls.indexOf("runFreePathSettlement")).toBeLessThan(calls.indexOf("settleSport:baseball_mlb"));
    expect(calls.indexOf("persistFreeScores")).toBeLessThan(calls.indexOf("runFreePathSettlement"));
    expect(calls.filter((c) => c.startsWith("settleSport:"))).toEqual([
      "settleSport:baseball_mlb",
      "settleSport:americanfootball_nfl",
    ]);

    expect(body.ok).toBe(true);
    expect(body.path).toBe("free+odds-api");
    expect(body.plan).toEqual({ primary: "free", paidSupplement: true, label: "free+odds-api" });
    expect(body.oddsApiRequired).toBe(false);
    expect(body.paidSupplement?.ok).toBe(true);
    expect(body.paidSupplement?.totalCount).toBe(2);
    // free 4 + paid 2 per sport
    expect(body.picksSettled).toBe(8);
    expect(body.advisories).toEqual([]);
  });

  it("a dead key never makes the cycle red: free pass ok, supplement failure reported and captured", async () => {
    vi.stubEnv("THE_ODDS_API_KEY", "deactivated-token");
    (settleSport as Mock).mockImplementation(async (sport: { key: string }) => {
      calls.push(`settleSport:${sport.key}`);
      return paidResult(sport, "failed", "401 Unauthorized");
    });
    const res = await GET(new Request("http://x/api/cron/settle-picks"));
    const body = (await res.json()) as Body;

    expect(body.ok).toBe(true);
    expect(body.paidSupplement?.ok).toBe(false);
    expect(body.paidSupplement?.failedSports).toEqual(["baseball_mlb", "americanfootball_nfl"]);
    expect(body.picksSettled).toBe(4);
    expect(body.advisories.join(" ")).toMatch(/THE_ODDS_API_KEY/);
    expect(captureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ path: "settle-picks", stage: "paid:supplement-failed" }),
    );
    expect(runFreePathSettlement).toHaveBeenCalledTimes(1);
  });

  it("a paid pass that throws still leaves the free result intact", async () => {
    vi.stubEnv("THE_ODDS_API_KEY", "sk_live_present");
    (settleSport as Mock).mockImplementation(async (sport: { key: string }) => {
      if (sport.key === "baseball_mlb") throw new Error("provider exploded");
      return paidResult(sport, "success");
    });
    const res = await GET(new Request("http://x/api/cron/settle-picks"));
    const body = (await res.json()) as Body;
    expect(body.ok).toBe(true);
    expect(body.paidSupplement?.failedSports).toEqual(["baseball_mlb"]);
    expect(body.picksSettled).toBe(6);
  });

  it("without a key: free only, settleSport is never called", async () => {
    vi.stubEnv("THE_ODDS_API_KEY", "");
    const res = await GET(new Request("http://x/api/cron/settle-picks"));
    const body = (await res.json()) as Body;
    expect(settleSport).not.toHaveBeenCalled();
    expect(body.path).toBe("free");
    expect(body.paidSupplement).toBeNull();
    expect(body.plan.paidSupplement).toBe(false);
    expect(body.ok).toBe(true);
  });

  it("?path=free skips the supplement even with a key present", async () => {
    vi.stubEnv("THE_ODDS_API_KEY", "sk_live_present");
    const res = await GET(new Request("http://x/api/cron/settle-picks?path=free"));
    const body = (await res.json()) as Body;
    expect(settleSport).not.toHaveBeenCalled();
    expect(body.path).toBe("free");
    expect(body.paidSupplement).toBeNull();
  });

  it("?sport= narrows both passes and rejects unsupported sports before any grading", async () => {
    vi.stubEnv("THE_ODDS_API_KEY", "sk_live_present");
    const bad = await GET(new Request("http://x/api/cron/settle-picks?sport=quidditch"));
    expect(bad.status).toBe(400);
    expect(runFreePathSettlement).not.toHaveBeenCalled();
    expect(settleSport).not.toHaveBeenCalled();

    const res = await GET(new Request("http://x/api/cron/settle-picks?sport=americanfootball_nfl"));
    expect(res.status).toBe(200);
    expect(runFreePathSettlement).toHaveBeenCalledWith(
      expect.objectContaining({ sportKey: "americanfootball_nfl", graceHours: 6, priorOverdueCount: 3 }),
    );
    expect(calls.filter((c) => c.startsWith("settleSport:"))).toEqual(["settleSport:americanfootball_nfl"]);
  });

  it("a cycle that grades and holds nothing while picks are overdue is red (starved), not ok", async () => {
    vi.stubEnv("THE_ODDS_API_KEY", "");
    (runFreePathSettlement as Mock).mockImplementation(async () => ({
      ...freeResult(true),
      picksSettled: 0,
      picksHeld: 0,
    }));
    const res = await GET(new Request("http://x/api/cron/settle-picks"));
    const body = (await res.json()) as Body & { starved: boolean; priorOverdueCount: number | null };
    // loadSettlementHealth is mocked to 3 overdue going in.
    expect(body.priorOverdueCount).toBe(3);
    expect(body.starved).toBe(true);
    expect(body.ok).toBe(false);
    expect(body.advisories.join(" ")).toMatch(/no usable finals/);
    expect(captureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ path: "settle-picks", stage: "starved-cycle" }),
    );
  });

  it("a cycle that only HOLDS overdue picks (with reasons) is work, not starvation", async () => {
    vi.stubEnv("THE_ODDS_API_KEY", "");
    (runFreePathSettlement as Mock).mockImplementation(async () => ({
      ...freeResult(true),
      picksSettled: 0,
      picksHeld: 2,
    }));
    const res = await GET(new Request("http://x/api/cron/settle-picks"));
    const body = (await res.json()) as Body & { starved: boolean };
    expect(body.starved).toBe(false);
    expect(body.ok).toBe(true);
  });

  it("a cycle where only the stale backfill grades overdue picks is work, not starvation", async () => {
    vi.stubEnv("THE_ODDS_API_KEY", "");
    (runFreePathSettlement as Mock).mockImplementation(async () => ({
      ...freeResult(true),
      picksSettled: 0,
      picksHeld: 0,
    }));
    (backfillStaleSettlement as Mock).mockImplementationOnce(async () => ({
      scanned: 2,
      settled: 2,
      unresolved: [],
    }));
    const res = await GET(new Request("http://x/api/cron/settle-picks"));
    const body = (await res.json()) as Body & { starved: boolean; picksSettled: number };
    expect(body.starved).toBe(false);
    expect(body.ok).toBe(true);
    // The backfill's settlements are this cycle's work and are reported as such.
    expect(body.picksSettled).toBe(2);
    expect(captureError).not.toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ stage: "starved-cycle" }),
    );
  });

  it("the cycle is red only when the free pass itself fails", async () => {
    vi.stubEnv("THE_ODDS_API_KEY", "sk_live_present");
    (runFreePathSettlement as Mock).mockImplementation(async () => freeResult(false));
    const res = await GET(new Request("http://x/api/cron/settle-picks"));
    const body = (await res.json()) as Body;
    expect(body.ok).toBe(false);
    expect(body.paidSupplement?.ok).toBe(true);
  });
});

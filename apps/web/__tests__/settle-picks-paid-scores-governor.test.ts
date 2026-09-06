import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * C-109 (a): the settle-picks route hands settleSport the sports whose free
 * pass left overdue picks with no final, built from the free pass RCA. Every
 * other sport reaches settleSport with no justification and is refused there
 * by the spend guard (tested in packages/ingestion-pipeline). Same mock set as
 * settle-picks-free-first.test.ts; nothing below touches the network or DB.
 */

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
  computeScheduledWindow: () => "2026-09-06T12Z",
  drainPendingTeamGameLogs: vi.fn(async () => ({ attempted: 0, done: 0, failed: 0 })),
}));
vi.mock("@/lib/settlement-outbox/worker", () => ({
  drainSettlementOutbox: vi.fn(async () => null),
}));
vi.mock("@/lib/data-sources/free-settlement-runner", () => ({
  runFreePathSettlement: vi.fn(),
}));
vi.mock("@/lib/data-sources/free-score-persist", () => ({
  persistFreeScores: vi.fn(async () => ({ persisted: 0 })),
}));
vi.mock("@/lib/data-sources/settle-backfill", () => ({
  backfillStaleSettlement: vi.fn(async () => ({ scanned: 0, settled: 0, unresolved: [] })),
}));
vi.mock("@/lib/performance/settlement-health", () => ({
  loadSettlementHealth: vi.fn(async () => ({ overduePending: 0 })),
  SETTLEMENT_DEFAULT_GRACE_HOURS: 6,
}));
vi.mock("@/lib/settlement/free-path-clv", () => ({
  drainPendingClvGrades: vi.fn(async () => ({ attempted: 0, graded: 0, noClose: 0, failed: 0 })),
}));
vi.mock("@/lib/settlement/free-path-snapshot", () => ({
  drainPendingSnapshotOutcomes: vi.fn(async () => ({ attempted: 0, done: 0, failed: 0 })),
}));
vi.mock("@/lib/settlement/zero-sit-lane", async () => {
  // The lane is replaced; the route's deadline helper and its reserve stay
  // real (same shape as settle-picks-free-first.test.ts).
  const actual = await vi.importActual<typeof import("@/lib/settlement/zero-sit-lane")>(
    "@/lib/settlement/zero-sit-lane",
  );
  return {
    zeroSitDeadline: actual.zeroSitDeadline,
    ZERO_SIT_ROUTE_TAIL_RESERVE_MS: actual.ZERO_SIT_ROUTE_TAIL_RESERVE_MS,
    runZeroSitLane: vi.fn(async () => ({
      stale: { unpublished: 0 },
      voids: { voided: 0 },
    })),
  };
});

import { GET } from "@/app/api/cron/settle-picks/route";
import { settleSport } from "@sports/ingestion-pipeline";
import { runFreePathSettlement } from "@/lib/data-sources/free-settlement-runner";

function freeResult(findings: Array<{ sportKey: string; code: string; overdue: boolean }>) {
  return {
    sports: [
      { sport: "baseball_mlb", ok: true },
      { sport: "americanfootball_nfl", ok: true },
    ],
    picksSettled: 1,
    picksHeld: 0,
    clvRepair: null,
    snapshotRepair: null,
    teamGameLogRepair: null,
    scoreDates: [],
    rca: { findings },
  };
}

function skippedResult(sport: { key: string }) {
  return {
    sport: sport.key,
    status: "success",
    gamesSettled: 0,
    picksSettled: 0,
    observationsRecorded: 0,
    anomaliesOpened: 0,
    anomaliesPromoted: 0,
    anomaliesResolved: 0,
    outboxAppended: 0,
    note: "spend_guard",
  };
}

type Body = {
  paidSupplement: null | {
    justifiedSports: string[];
    results: Array<{ sport: string; note?: string }>;
  };
};

describe("GET /api/cron/settle-picks: paid scores justification (C-109)", () => {
  beforeEach(() => {
    (settleSport as Mock).mockReset();
    (runFreePathSettlement as Mock).mockReset();
    (settleSport as Mock).mockImplementation(async (sport: { key: string }) => skippedResult(sport));
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("passes only the sports with overdue no-final picks as justified, and reports them", async () => {
    vi.stubEnv("THE_ODDS_API_KEY", "sk_live_present");
    (runFreePathSettlement as Mock).mockResolvedValue(
      freeResult([
        { sportKey: "baseball_mlb", code: "OVERDUE_NO_SCORE", overdue: true },
        { sportKey: "americanfootball_nfl", code: "WITHIN_GRACE", overdue: false },
      ]),
    );

    const res = await GET(new Request("http://x/api/cron/settle-picks"));
    const body = (await res.json()) as Body;

    expect(settleSport).toHaveBeenCalledTimes(2);
    for (const call of (settleSport as Mock).mock.calls) {
      const options = call[4] as { paidScoresJustifiedSports: ReadonlySet<string>; scheduledWindow: string };
      expect(options.scheduledWindow).toBe("2026-09-06T12Z");
      expect([...options.paidScoresJustifiedSports]).toEqual(["baseball_mlb"]);
    }
    expect(body.paidSupplement?.justifiedSports).toEqual(["baseball_mlb"]);
    // The per-sport skip note from settleSport rides on the response.
    expect(body.paidSupplement?.results.map((r) => r.note)).toEqual(["spend_guard", "spend_guard"]);
  });

  it("with no RCA report nothing is justified (the paid feed is never spent blind)", async () => {
    vi.stubEnv("THE_ODDS_API_KEY", "sk_live_present");
    (runFreePathSettlement as Mock).mockResolvedValue({ ...freeResult([]), rca: null });

    const res = await GET(new Request("http://x/api/cron/settle-picks"));
    const body = (await res.json()) as Body;

    const options = (settleSport as Mock).mock.calls[0]![4] as { paidScoresJustifiedSports: ReadonlySet<string> };
    expect(options.paidScoresJustifiedSports.size).toBe(0);
    expect(body.paidSupplement?.justifiedSports).toEqual([]);
  });
});

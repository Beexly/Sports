import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/ops/settlement-rca: the operator's answer to "why is this pick still
 * PENDING". Everything below the route is mocked except the matcher and grader,
 * which run for real (settlePendingPicks is pure). Never touches the network or DB.
 */

const mocks = vi.hoisted(() => ({
  findMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  fetchScores: vi.fn<(sport: string, opts: unknown) => Promise<unknown>>(),
}));

vi.mock("@sports/db", () => ({ db: { pick: { findMany: mocks.findMany } } }));
// @sports/prediction-engine is NOT mocked: the matcher and grader run for real.
vi.mock("@/lib/data-sources/free-settlement-runner", () => ({
  ODDS_KEY_TO_FREE: { soccer_usa_mls: "mls", americanfootball_ncaaf: "ncaaf" },
}));
vi.mock("@/lib/data-sources/multi-source-scores", () => ({
  fetchScoresMultiSource: mocks.fetchScores,
}));

import { GET, candidateFinalsFor } from "@/app/api/ops/settlement-rca/route";

const NOW_ISH = new Date();
const hoursAgo = (h: number) => new Date(NOW_ISH.getTime() - h * 60 * 60 * 1000);

function espnFinal(sport: string, id: string, startTime: Date, home: [string, string, number], away: [string, string, number]) {
  return {
    sourceId: "espn-public-api",
    sport,
    gameId: id,
    startTime: startTime.toISOString(),
    state: "post",
    completed: true,
    statusDetail: "Final",
    venue: null,
    home: { team: home[0], abbreviation: home[1], score: home[2] },
    away: { team: away[0], abbreviation: away[1], score: away[2] },
    attribution: "Scores data via ESPN",
  };
}

const MLS_KICKOFF = hoursAgo(30);
const CFB_KICKOFF = hoursAgo(20);

const ROWS = [
  {
    id: "pick-mls",
    pickType: "MONEYLINE",
    selection: "Portland Timbers ML (model signal)",
    line: 0,
    clvLockLine: null,
    modelVersion: "v5.2.7",
    bookmakerCount: 0,
    game: {
      id: "g-mls",
      externalId: "espn:mls:761768",
      homeTeamName: "Portland Timbers",
      awayTeamName: "Austin FC",
      commenceTime: MLS_KICKOFF,
      sport: { key: "soccer_usa_mls" },
    },
  },
  {
    id: "pick-cfb",
    pickType: "SPREAD",
    selection: "Buffalo Bulls -24.5",
    line: -24.5,
    clvLockLine: -23.5,
    modelVersion: "v5.2.7",
    bookmakerCount: 6,
    game: {
      id: "g-cfb",
      externalId: "abc123",
      homeTeamName: "Buffalo Bulls",
      awayTeamName: "Saint Francis Red Flash",
      commenceTime: CFB_KICKOFF,
      sport: { key: "americanfootball_ncaaf" },
    },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
  mocks.findMany.mockResolvedValue(ROWS);
  mocks.fetchScores.mockImplementation(async (sport: string) => {
    if (sport === "mls") {
      return {
        sport,
        primary: "espn-public-api",
        used: "espn-public-api",
        attempted: ["espn-public-api"],
        failover: false,
        oddsApiRequired: false,
        datesRequested: [],
        errors: [],
        games: [espnFinal("mls", "761768", MLS_KICKOFF, ["Portland Timbers", "POR", 1], ["Austin FC", "ATX", 2])],
      };
    }
    // The CFB board is the truncated one: only the colliding "Bulls" game is present.
    return {
      sport,
      primary: "espn-public-api",
      used: "espn-public-api",
      attempted: ["espn-public-api"],
      failover: false,
      oddsApiRequired: false,
      datesRequested: [],
      errors: ["espn 20250906: HTTP 503"],
      games: [espnFinal("ncaaf", "401", CFB_KICKOFF, ["Florida Gators", "FLA", 18], ["South Florida Bulls", "USF", 16])],
    };
  });
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("GET /api/ops/settlement-rca", () => {
  it("refuses without the operator bearer and never touches the database", async () => {
    const res = await GET(new Request("https://www.galaxysportsedge.com/api/ops/settlement-rca"));
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.fetchScores).not.toHaveBeenCalled();
  });

  it("refuses when no secret is configured (fails closed)", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(
      new Request("https://www.galaxysportsedge.com/api/ops/settlement-rca", { headers: { authorization: "Bearer anything" } }),
    );
    expect(res.status).toBe(401);
  });

  it("names the reason for each overdue pick from a dry run of the production grader", async () => {
    const res = await GET(
      new Request("https://www.galaxysportsedge.com/api/ops/settlement-rca", { headers: { authorization: "Bearer test-secret" } }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = (await res.json()) as {
      ok: boolean;
      readOnly: boolean;
      overdue: number;
      truncated: boolean;
      bySport: Array<{ sport: string; freeSport: string | null; overdue: number; finalsOnBoard: number; sourceErrors: string[]; reasons: Record<string, number>; boardDates: string[] }>;
      picks: Array<{ pickId: string; reason: string; gradingLine: number; ageHours: number; candidateFinals: Array<{ home: string; away: string; score: string }> }>;
    };
    expect(body.ok).toBe(true);
    expect(body.readOnly).toBe(true);
    expect(body.overdue).toBe(2);
    expect(body.truncated).toBe(false);

    const mls = body.picks.find((p) => p.pickId === "pick-mls")!;
    expect(mls.reason).toBe("WOULD_SETTLE");
    expect(mls.candidateFinals[0]).toMatchObject({ home: "Portland Timbers", away: "Austin FC", score: "1-2" });
    expect(mls.ageHours).toBeGreaterThan(29);

    const cfb = body.picks.find((p) => p.pickId === "pick-cfb")!;
    expect(cfb.reason).toBe("NO_FINAL");
    // The stricter matcher does not grade Buffalo off South Florida, but the
    // diagnostic still shows the operator the colliding "Bulls" final on the board.
    expect(cfb.candidateFinals.map((c) => c.away)).toEqual(["South Florida Bulls"]);
    expect(cfb.gradingLine).toBe(-23.5); // the lock line, as the real grader uses

    const cfbSport = body.bySport.find((s) => s.sport === "americanfootball_ncaaf")!;
    expect(cfbSport.freeSport).toBe("ncaaf");
    expect(cfbSport.reasons).toEqual({ NO_FINAL: 1 });
    expect(cfbSport.sourceErrors).toEqual(["espn 20250906: HTTP 503"]);
    expect(cfbSport.boardDates.length).toBeGreaterThan(0);

    // One board fetch per sport, dated (never the undated "now" board for overdue rows).
    expect(mocks.fetchScores).toHaveBeenCalledTimes(2);
    for (const call of mocks.fetchScores.mock.calls) {
      const opts = call[1] as { espnDateKeys: string[] };
      expect(opts.espnDateKeys.length).toBeGreaterThan(0);
    }
  });

  it("honours ?sport= and reports NO_FREE_SPORT_MAP for sports without a free adapter", async () => {
    mocks.findMany.mockResolvedValue([
      { ...ROWS[0]!, id: "pick-x", game: { ...ROWS[0]!.game, sport: { key: "cricket_ipl" } } },
    ]);
    const res = await GET(
      new Request("https://www.galaxysportsedge.com/api/ops/settlement-rca?sport=cricket_ipl", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    const body = (await res.json()) as { picks: Array<{ reason: string }>; bySport: Array<{ freeSport: string | null }> };
    expect(body.picks[0]?.reason).toBe("NO_FREE_SPORT_MAP");
    expect(body.bySport[0]?.freeSport).toBeNull();
    expect(mocks.fetchScores).not.toHaveBeenCalled();
    const where = (mocks.findMany.mock.calls[0]?.[0] as { where: { game: { sport?: { key: string } } } }).where;
    expect(where.game.sport).toEqual({ key: "cricket_ipl" });
  });
});

describe("candidateFinalsFor", () => {
  it("lists finals that touch either team within two days, in board order", () => {
    const finals = [
      { date: "2026-08-29", startIso: "2026-08-29T23:30:00Z", home: { name: "Toronto FC", abbr: "TOR", score: 1 }, away: { name: "New York City FC", abbr: "NYC", score: 1 }, confirmation: "SINGLE_SOURCE" as const, sources: ["espn-public-api"] },
      { date: "2026-08-30", startIso: "2026-08-30T02:30:00Z", home: { name: "Portland Timbers", abbr: "POR", score: 1 }, away: { name: "Austin FC", abbr: "ATX", score: 2 }, confirmation: "SINGLE_SOURCE" as const, sources: ["espn-public-api"] },
    ];
    const out = candidateFinalsFor(
      { pickId: "p", pickType: "MONEYLINE", selection: "Austin FC ML", line: 0, homeTeam: "Portland Timbers", awayTeam: "Austin FC", sportKey: "soccer_usa_mls", gameDateIso: "2026-08-30T02:30:00.000Z" },
      finals,
    );
    expect(out).toEqual([{ home: "Portland Timbers", away: "Austin FC", score: "1-2", startIso: "2026-08-30T02:30:00Z", confirmation: "SINGLE_SOURCE" }]);
  });
});

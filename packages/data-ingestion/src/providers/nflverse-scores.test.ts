import { describe, it, expect, vi } from "vitest";
import {
  nflverseScoreProvider,
  parseNflverseScores,
  NFLVERSE_SCORES_SOURCE_ID,
} from "./nflverse-scores";
import { parseCsv } from "../nflverse-source";
import type {
  CheckClearanceFn,
  ScoreRightsSnapshot,
} from "../score-provider";

const SNAPSHOT: ScoreRightsSnapshot = {
  source_id: NFLVERSE_SCORES_SOURCE_ID,
  source_url: "https://github.com/nflverse/nflverse-data",
  status: "approved_open_license",
  automation_allowed: true,
  public_logged_off_allowed: true,
  commercial_display_allowed: true,
  storage_allowed: true,
  derived_analytics_allowed: true,
  model_training_allowed: true,
  attribution_required: true,
  attribution_text: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0",
  reviewed_at: "2026-06-01T00:00:00.000Z",
  snapshotted_at: "2026-06-19T00:00:00.000Z",
};

const allow: CheckClearanceFn = () => ({ allowed: true, rightsSnapshot: SNAPSHOT });
const deny: CheckClearanceFn = () => ({ allowed: false, rightsSnapshot: null });

/** YYYY-MM-DD `daysAgo` days before `now`. */
function gameday(daysAgo: number, now: Date): string {
  const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function gamesCsv(rows: Array<Record<string, string>>): string {
  const header = "game_id,gameday,gametime,home_team,away_team,home_score,away_score";
  const lines = rows.map((r) =>
    [r.game_id ?? "", r.gameday ?? "", r.gametime ?? "", r.home_team ?? "", r.away_team ?? "", r.home_score ?? "", r.away_score ?? ""].join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}

/** Build a text Response the provider's fetchFn returns. */
function textResponse(body: string, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: async () => body,
  } as unknown as Response;
}

describe("parseNflverseScores (pure)", () => {
  const NOW = new Date("2026-06-19T00:00:00Z");

  it("normalizes an in-window completed game", () => {
    const table = parseCsv(
      gamesCsv([
        {
          game_id: "2025_18_KC_DEN",
          gameday: gameday(1, NOW),
          gametime: "13:00",
          home_team: "DEN",
          away_team: "KC",
          home_score: "17",
          away_score: "31",
        },
      ]),
    );
    const scores = parseNflverseScores(table, 2, NOW);
    expect(scores).toHaveLength(1);
    expect(scores[0]).toMatchObject({
      gameKey: "2025_18_KC_DEN",
      homeTeam: "DEN",
      awayTeam: "KC",
      homeScore: 17,
      awayScore: 31,
      completed: true,
    });
    expect(scores[0]!.commenceTime).toMatch(/T13:00:00Z$/);
  });

  it("filters out games outside the lookback window", () => {
    const table = parseCsv(
      gamesCsv([
        { game_id: "old", gameday: gameday(30, NOW), home_team: "A", away_team: "B", home_score: "1", away_score: "2" },
      ]),
    );
    expect(parseNflverseScores(table, 2, NOW)).toEqual([]);
  });

  it("marks an unplayed in-window game as not completed (null scores)", () => {
    const table = parseCsv(
      gamesCsv([
        { game_id: "future-ish", gameday: gameday(0, NOW), home_team: "A", away_team: "B", home_score: "", away_score: "" },
      ]),
    );
    const [s] = parseNflverseScores(table, 2, NOW);
    expect(s).toMatchObject({ homeScore: null, awayScore: null, completed: false });
  });
});

describe("nflverseScoreProvider.fetchScores", () => {
  it("HAPPY PATH: clearance granted + valid CSV → healthy, normalized, snapshot attached", async () => {
    const now = new Date();
    const csv = gamesCsv([
      {
        game_id: "g1",
        gameday: gameday(1, now),
        gametime: "13:00",
        home_team: "DEN",
        away_team: "KC",
        home_score: "17",
        away_score: "31",
      },
    ]);
    const fetchFn = vi.fn(async (_url: string) => textResponse(csv));
    const res = await nflverseScoreProvider.fetchScores("americanfootball_nfl", 3, {
      fetchFn: fetchFn as unknown as typeof fetch,
      checkClearance: allow,
    });

    expect(res.healthy).toBe(true);
    expect(res.provider).toBe(NFLVERSE_SCORES_SOURCE_ID);
    expect(res.rightsSnapshot).toEqual(SNAPSHOT);
    expect(res.scores).toHaveLength(1);
    expect(res.scores[0]).toMatchObject({ homeTeam: "DEN", awayTeam: "KC", completed: true });
    const url = fetchFn.mock.calls[0]![0] as string;
    expect(url).toContain("nflverse-data");
    expect(url).toContain("games.csv");
  });

  it("CLEARANCE DENIED → healthy:false, extracts NOTHING, no fetch attempted", async () => {
    const fetchFn = vi.fn(async () => textResponse(gamesCsv([])));
    const res = await nflverseScoreProvider.fetchScores("americanfootball_nfl", 2, {
      fetchFn: fetchFn as unknown as typeof fetch,
      checkClearance: deny,
    });
    expect(res.healthy).toBe(false);
    expect(res.scores).toEqual([]);
    expect(res.error).toBe("clearance-denied");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("NO clearance fn → fail-closed healthy:false, no fetch", async () => {
    const fetchFn = vi.fn(async () => textResponse(gamesCsv([])));
    const res = await nflverseScoreProvider.fetchScores("americanfootball_nfl", 2, {
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(res.healthy).toBe(false);
    expect(res.error).toBe("clearance-fn-not-injected");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("unsupported sport (not NFL) → healthy:false, no fetch", async () => {
    const fetchFn = vi.fn(async () => textResponse(gamesCsv([])));
    const res = await nflverseScoreProvider.fetchScores("basketball_nba", 2, {
      fetchFn: fetchFn as unknown as typeof fetch,
      checkClearance: allow,
    });
    expect(res.healthy).toBe(false);
    expect(res.error).toContain("unsupported-sport");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("FETCH ERROR → healthy:false, never throws", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("dns failure");
    });
    const res = await nflverseScoreProvider.fetchScores("americanfootball_nfl", 2, {
      fetchFn: fetchFn as unknown as typeof fetch,
      checkClearance: allow,
    });
    expect(res.healthy).toBe(false);
    expect(res.error).toContain("fetch-failed");
  });

  it("non-2xx → healthy:false with http status reason", async () => {
    const fetchFn = vi.fn(async () => textResponse("", false, 404));
    const res = await nflverseScoreProvider.fetchScores("americanfootball_nfl", 2, {
      fetchFn: fetchFn as unknown as typeof fetch,
      checkClearance: allow,
    });
    expect(res.healthy).toBe(false);
    expect(res.error).toBe("http-404");
  });

  it("empty CSV (header only) → healthy:false (empty-csv)", async () => {
    const fetchFn = vi.fn(async () => textResponse(gamesCsv([])));
    const res = await nflverseScoreProvider.fetchScores("americanfootball_nfl", 2, {
      fetchFn: fetchFn as unknown as typeof fetch,
      checkClearance: allow,
    });
    expect(res.healthy).toBe(false);
    expect(res.error).toBe("empty-csv");
  });
});

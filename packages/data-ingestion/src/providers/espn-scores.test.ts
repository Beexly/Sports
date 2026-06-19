import { describe, it, expect, vi } from "vitest";
import {
  espnScoreProvider,
  parseEspnScores,
  ESPN_SCORES_SOURCE_ID,
} from "./espn-scores";
import type {
  CheckClearanceFn,
  ScoreClearanceResult,
  ScoreRightsSnapshot,
} from "../score-provider";

const SNAPSHOT: ScoreRightsSnapshot = {
  source_id: ESPN_SCORES_SOURCE_ID,
  source_url: "https://site.api.espn.com",
  status: "approved_public_logged_off",
  automation_allowed: true,
  public_logged_off_allowed: true,
  commercial_display_allowed: false,
  storage_allowed: false,
  derived_analytics_allowed: true,
  model_training_allowed: false,
  attribution_required: true,
  attribution_text: "Scores data via ESPN",
  reviewed_at: "2026-06-01T00:00:00.000Z",
  snapshotted_at: "2026-06-19T00:00:00.000Z",
};

const allow: CheckClearanceFn = () => ({ allowed: true, rightsSnapshot: SNAPSHOT });
const deny: CheckClearanceFn = () => ({ allowed: false, rightsSnapshot: null });

/** A minimal ESPN scoreboard payload with one completed game. */
function scoreboardPayload() {
  return {
    events: [
      {
        id: "401547439",
        date: "2026-06-19T17:00:00Z",
        competitions: [
          {
            status: { type: { completed: true } },
            competitors: [
              { homeAway: "home", score: "27", team: { displayName: "Kansas City Chiefs" } },
              { homeAway: "away", score: "20", team: { displayName: "Buffalo Bills" } },
            ],
          },
        ],
      },
    ],
  };
}

/** Build a Response-like object the provider's fetchFn returns. */
function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("parseEspnScores (pure)", () => {
  it("normalizes a completed game with both teams + scores", () => {
    const scores = parseEspnScores(scoreboardPayload());
    expect(scores).toEqual([
      {
        gameKey: "401547439",
        homeTeam: "Kansas City Chiefs",
        awayTeam: "Buffalo Bills",
        homeScore: 27,
        awayScore: 20,
        completed: true,
        commenceTime: "2026-06-19T17:00:00Z",
      },
    ]);
  });

  it("skips events missing a team and tolerates a garbage/empty payload", () => {
    expect(parseEspnScores({} as never)).toEqual([]);
    expect(parseEspnScores({ events: [] })).toEqual([]);
    const halfRecord = {
      events: [
        {
          id: "x",
          competitions: [{ competitors: [{ homeAway: "home", team: { displayName: "Only Home" } }] }],
        },
      ],
    };
    expect(parseEspnScores(halfRecord)).toEqual([]);
  });

  it("coerces a not-yet-final score to null and reports completed:false", () => {
    const payload = {
      events: [
        {
          id: "p1",
          date: "2026-06-19T20:00:00Z",
          competitions: [
            {
              status: { type: { completed: false } },
              competitors: [
                { homeAway: "home", score: undefined, team: { displayName: "Home" } },
                { homeAway: "away", score: undefined, team: { displayName: "Away" } },
              ],
            },
          ],
        },
      ],
    };
    const [s] = parseEspnScores(payload);
    expect(s).toMatchObject({ homeScore: null, awayScore: null, completed: false });
  });
});

describe("espnScoreProvider.fetchScores", () => {
  it("HAPPY PATH: clearance granted + valid payload → healthy, normalized, snapshot attached", async () => {
    const fetchFn = vi.fn(async (_url: string) => jsonResponse(scoreboardPayload()));
    const res = await espnScoreProvider.fetchScores("americanfootball_nfl", 0, {
      fetchFn: fetchFn as unknown as typeof fetch,
      checkClearance: allow,
    });

    expect(res.healthy).toBe(true);
    expect(res.provider).toBe(ESPN_SCORES_SOURCE_ID);
    expect(res.rightsSnapshot).toEqual(SNAPSHOT);
    expect(res.scores).toHaveLength(1);
    expect(res.scores[0]).toMatchObject({ homeScore: 27, awayScore: 20, completed: true });
    // GET-style call, no auth header, real network never used.
    expect(fetchFn).toHaveBeenCalled();
    const url = fetchFn.mock.calls[0]![0] as string;
    expect(url).toContain("site.api.espn.com");
    expect(url).toContain("football/nfl/scoreboard");
  });

  it("CLEARANCE DENIED → healthy:false, extracts NOTHING, no fetch attempted", async () => {
    const fetchFn = vi.fn(async () => jsonResponse(scoreboardPayload()));
    const res = await espnScoreProvider.fetchScores("americanfootball_nfl", 0, {
      fetchFn: fetchFn as unknown as typeof fetch,
      checkClearance: deny,
    });

    expect(res.healthy).toBe(false);
    expect(res.scores).toEqual([]);
    expect(res.error).toBe("clearance-denied");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("NO clearance fn injected → fail-closed healthy:false, no fetch", async () => {
    const fetchFn = vi.fn(async () => jsonResponse(scoreboardPayload()));
    const res = await espnScoreProvider.fetchScores("americanfootball_nfl", 0, {
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(res.healthy).toBe(false);
    expect(res.error).toBe("clearance-fn-not-injected");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("unsupported sport → healthy:false (snapshot retained), no fetch", async () => {
    const fetchFn = vi.fn(async () => jsonResponse(scoreboardPayload()));
    const res = await espnScoreProvider.fetchScores("cricket_ipl", 0, {
      fetchFn: fetchFn as unknown as typeof fetch,
      checkClearance: allow,
    });
    expect(res.healthy).toBe(false);
    expect(res.error).toContain("unsupported-sport");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("FETCH ERROR (every date) → healthy:false, never throws", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });
    const res = await espnScoreProvider.fetchScores("americanfootball_nfl", 0, {
      fetchFn: fetchFn as unknown as typeof fetch,
      checkClearance: allow,
    });
    expect(res.healthy).toBe(false);
    expect(res.scores).toEqual([]);
    expect(res.error).toBe("all-date-fetches-failed");
  });

  it("non-2xx (every date) → healthy:false (treated as all-failed)", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({}, false, 503));
    const res = await espnScoreProvider.fetchScores("americanfootball_nfl", 0, {
      fetchFn: fetchFn as unknown as typeof fetch,
      checkClearance: allow,
    });
    expect(res.healthy).toBe(false);
    expect(res.error).toBe("all-date-fetches-failed");
  });
});

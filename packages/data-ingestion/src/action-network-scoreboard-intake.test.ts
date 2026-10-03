import { describe, expect, it } from "vitest";
import {
  ACTION_NETWORK_BOOK_IDS,
  ACTION_NETWORK_SCOREBOARD_BASE,
  actionNetworkScoreboardIntakeEnabled,
  ingestActionNetworkScoreboard,
} from "./action-network-scoreboard-intake.js";

const enabledEnv = { ACTION_NETWORK_SCOREBOARD_INTAKE_ENABLED: "true" } as NodeJS.ProcessEnv;
const disabledEnv = {} as NodeJS.ProcessEnv;
const asOf = "2026-09-25T22:00:00.000Z";

const game = {
  id: 9001,
  status: "scheduled",
  start_time: "2026-09-27T17:00:00.000Z",
  season: "2026",
  week: 3,
  league_name: "nfl",
  teams: [{ abbr: "ATL" }, { abbr: "CAR" }],
  odds: [
    {
      book_id: 15,
      ml_away: 205,
      ml_home: -250,
      spread_away: 4.5,
      spread_home: -4.5,
      spread_away_line: -104,
      spread_home_line: -115,
      total: 43.5,
      over: -102,
      under: -116,
      line_status: "open",
    },
    { book_id: 30, ml_away: 200, ml_home: -240 },
  ],
};

describe("actionNetworkScoreboardIntakeEnabled", () => {
  it("is disabled by default", () => {
    expect(actionNetworkScoreboardIntakeEnabled(disabledEnv)).toBe(false);
  });

  it("enables on explicit true", () => {
    expect(actionNetworkScoreboardIntakeEnabled(enabledEnv)).toBe(true);
  });
});

describe("ingestActionNetworkScoreboard", () => {
  it("fails closed when disabled", () => {
    const res = ingestActionNetworkScoreboard({ games: [] }, asOf, disabledEnv);
    expect(res.ok).toBe(false);
  });

  it("accepts per-book odds rows for a future game", () => {
    const res = ingestActionNetworkScoreboard({ games: [game] }, asOf, enabledEnv);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(2);
    const dk = res.data.accepted[0]!;
    expect(dk.bookId).toBe(15);
    expect(dk.awayAbbr).toBe("ATL");
    expect(dk.homeAbbr).toBe("CAR");
    expect(dk.moneylineHome).toBe(-250);
    expect(dk.spreadHome).toBe(-4.5);
    expect(dk.total).toBe(43.5);
    expect(dk.source).toBe("action-network-scoreboard-api");
  });

  it("rejects games that already started (stale board)", () => {
    const res = ingestActionNetworkScoreboard(
      { games: [{ ...game, start_time: "2026-09-20T17:00:00.000Z" }] },
      asOf,
      enabledEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(0);
    expect(res.data.rejected).toHaveLength(1);
  });

  it("rejects games missing teams", () => {
    const res = ingestActionNetworkScoreboard(
      { games: [{ ...game, teams: [] }] },
      asOf,
      enabledEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(0);
  });

  it("knows the DraftKings and FanDuel book ids", () => {
    expect(ACTION_NETWORK_BOOK_IDS["DRAFTKINGS"]).toBe(15);
    expect(ACTION_NETWORK_BOOK_IDS["FANDUEL"]).toBe(30);
    expect(ACTION_NETWORK_SCOREBOARD_BASE).toBe("https://api.actionnetwork.com");
  });

  it("accepts numeric season values (current payloads ship season as a number)", () => {
    const res = ingestActionNetworkScoreboard(
      { games: [{ ...game, season: 2026 }] },
      asOf,
      enabledEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted[0]!.season).toBe("2026");
  });

  it("preserves object line_status payloads without inventing semantics", () => {
    const res = ingestActionNetworkScoreboard(
      {
        games: [
          {
            ...game,
            odds: [{ book_id: 15, line_status: { over: 0, under: 0, ml_home: 1 } }],
          },
        ],
      },
      asOf,
      enabledEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted[0]!.lineStatus).toBe(
      JSON.stringify({ over: 0, under: 0, ml_home: 1 }),
    );
  });

  it("resolves away/home via team ids when teams are not in [away, home] order", () => {
    const res = ingestActionNetworkScoreboard(
      {
        games: [
          {
            ...game,
            away_team_id: 129,
            home_team_id: 134,
            teams: [
              { id: 134, abbr: "JAC" },
              { id: 129, abbr: "NE" },
            ],
          },
        ],
      },
      asOf,
      enabledEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted[0]!.awayAbbr).toBe("NE");
    expect(res.data.accepted[0]!.homeAbbr).toBe("JAC");
  });
});

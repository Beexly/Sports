/**
 * Seal + paging tests for the public feed parsers.
 * - The public espn.jsonl row carries NO market fields. Importing it into the
 *   coach path (assertCoachInputs) must throw the moment an odds key rides along.
 * - The coach fence rejects spread, odds, and mr_*.
 * - 365Scores fixtures (competition 352) page via paging.nextPage; -1 is
 *   unplayed; a Final game keeps its real score (Stanford 31, NC State 28
 *   lives on the sports=6 board and is NCAAF/CFL, never tagged NFL).
 * - Anchor events: 401873010 home CHI 30, away NE 24, final.
 *   401873012 home BAL, away CIN, scheduled (state "pre", score "0" -> null).
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { assertCoachInputs, CoachFenceError } from "./fence.js"
import { parseEspnScoreboard } from "./espn.js"
import { fixturesWindow, parseScores365, NFL_COMPETITION_ID } from "./scores365.js"

// A public espn.jsonl row exactly as the nfl-farm runner writes it: no odds.
const PUBLIC_ESPN_ROW = {
  event_id: 401873010,
  season: 2026,
  week: 8,
  kickoff: "2026-10-19T23:15:00Z",
  status: "Final",
  home: { name: "Chicago Bears", abbr: "CHI", score: 30, home_away: "home", winner: true },
  away: { name: "New England Patriots", abbr: "NE", score: 24, home_away: "away", winner: false },
}

// The same row after someone naively merges the sealed odds file into it.
const MARKET_CONTAMINATED_ROW = { ...PUBLIC_ESPN_ROW, odds: "CHI -3.0", spread: -3 }

describe("espn seal", () => {
  it("accepts the public row into the coach path", () => {
    const { odds: _odds, spread: _spread, ...clean } = MARKET_CONTAMINATED_ROW
    assert.doesNotThrow(() => assertCoachInputs(clean))
  })

  it("throws when an odds key rides into the coach path", () => {
    assert.throws(() => assertCoachInputs(MARKET_CONTAMINATED_ROW), CoachFenceError)
  })

  it("throws on a spread key too", () => {
    assert.throws(
      () => assertCoachInputs({ ...PUBLIC_ESPN_ROW, spread: -3 }),
      (e: unknown) => e instanceof CoachFenceError && (e as CoachFenceError).key === "spread",
    )
  })

  it("public espn.jsonl rows contain no market keys at all", () => {
    const keys = Object.keys(PUBLIC_ESPN_ROW)
    for (const key of keys) assert.ok(!/odds|spread|mr_/i.test(key), key)
  })
})

describe("espn homeAway parsing", () => {
  it("401873010 is home CHI 30, away NE 24, final — from homeAway, not array order", () => {
    const payload = {
      season: { year: 2026 },
      week: { number: 8 },
      events: [
        {
          id: "401873010",
          date: "2026-10-19T23:15:00Z",
          competitions: [
            {
              status: { type: { state: "post", shortDetail: "Final" } },
              // array order is deliberately AWAY-first here
              competitors: [
                { homeAway: "away", winner: false, score: "24", team: { displayName: "New England Patriots", abbreviation: "NE" } },
                { homeAway: "home", winner: true, score: "30", team: { displayName: "Chicago Bears", abbreviation: "CHI" } },
              ],
            },
          ],
        },
      ],
    }
    const board = parseEspnScoreboard(payload)
    const game = board.games[0]
    assert.equal(game.home.abbr, "CHI")
    assert.equal(game.home.score, 30)
    assert.equal(game.away.abbr, "NE")
    assert.equal(game.away.score, 24)
  })

  it("401873012 scheduled: state pre plus score 0 is unplayed (null, not 0)", () => {
    const payload = {
      events: [
        {
          id: "401873012",
          date: "2026-10-25T17:00:00Z",
          competitions: [
            {
              status: { type: { state: "pre", shortDetail: "Sun 12:00 CT" } },
              competitors: [
                { homeAway: "home", score: "0", team: { displayName: "Baltimore Ravens", abbreviation: "BAL" } },
                { homeAway: "away", score: "0", team: { displayName: "Cincinnati Bengals", abbreviation: "CIN" } },
              ],
            },
          ],
        },
      ],
    }
    const board = parseEspnScoreboard(payload)
    const game = board.games[0]
    assert.equal(game.home.abbr, "BAL")
    assert.equal(game.home.score, null)
    assert.equal(game.away.abbr, "CIN")
    assert.equal(game.away.score, null)
  })
})

describe("365Scores fixtures paging (competition 352)", () => {
  const page1 = {
    ttl: 300,
    lastUpdateId: 1,
    paging: { previousPage: null, nextPage: "/web/games/?competitions=352&aftergame=4714179&direction=1" },
    games: [
      {
        id: 4714179,
        competitionId: 352,
        competitionDisplayName: "NFL",
        startTime: "2026-10-25T13:30:00-05:00",
        statusText: "Scheduled",
        homeCompetitor: { name: "New Orleans Saints", symbolicName: "NO", score: -1.0 },
        awayCompetitor: { name: "Chicago Bears", symbolicName: "CHI", score: -1.0 },
      },
    ],
  }
  const page2 = {
    ttl: 300,
    lastUpdateId: 2,
    paging: { previousPage: "/web/games/?competitions=352&aftergame=4714179&direction=-1", nextPage: null },
    games: [
      {
        id: 4715000,
        competitionId: 352,
        competitionDisplayName: "NFL",
        startTime: "2026-10-19T23:15:00-05:00",
        statusText: "Final",
        homeCompetitor: { name: "Chicago Bears", symbolicName: "CHI", score: 30 },
        awayCompetitor: { name: "New England Patriots", symbolicName: "NE", score: 24 },
      },
    ],
  }

  it("parses competitionId and paging, and -1 stays unplayed", () => {
    const board = parseScores365(page1)
    const g = board.games[0]
    assert.equal(g.competitionId, NFL_COMPETITION_ID)
    assert.equal(g.home.score, null)
    assert.equal(board.paging.nextPage, "/web/games/?competitions=352&aftergame=4714179&direction=1")
  })

  it("a Final game keeps its real score (no null)", () => {
    const board = parseScores365(page2)
    const g = board.games[0]
    assert.equal(g.status, "Final")
    assert.equal(g.home.score, 30)
    assert.equal(g.away.score, 24)
  })

  it("windows follow nextPage until the wanted ids are covered", async () => {
    const calls: string[] = []
    const boards = [page1, page2]
    const result = await fixturesWindow(
      async (url) => {
        calls.push(url)
        return parseScores365(boards[calls.length - 1])
      },
      new Set([4714179, 4715000]),
    )
    assert.equal(result.covered, true)
    assert.equal(result.pages, 2)
    assert.equal(result.games.length, 2)
    assert.ok(calls[0].includes("competitions=352"))
  })

  it("stops at maxPages and reports uncovered", async () => {
    const endless = {
      ttl: 300,
      lastUpdateId: 9,
      paging: { previousPage: null, nextPage: "/web/games/?competitions=352&aftergame=9999999&direction=1" },
      games: [],
    }
    const result = await fixturesWindow(
      async () => parseScores365(endless),
      new Set([401873010]),
      3,
    )
    assert.equal(result.covered, false)
    assert.equal(result.pages, 3)
  })
})

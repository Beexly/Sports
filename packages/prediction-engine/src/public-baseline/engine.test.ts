import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { absDeltaMultiplier, HFA, K, movMultiplier, publicPrior, replay, REVERSIONS, winProb } from "./elo538.js"
import { assertCoachInputs, CoachFenceError } from "./fence.js"
import { positivePartJamesStein } from "./jamesStein.js"
import { KILLED_EDGES, mayReopen } from "./killed.js"
import { ANCHOR_MOTION_PA_SINGLE, computeGseDwp, computeGseQptsr, computeGseSii, computeGseSpese, computeGseSva, computeGseTor } from "./metrics.js"
import { SOURCE_REGISTRY } from "./registry.js"
import { captainPoints, captainSalary, SHOWDOWN_CAP, underCap, withinTeamLimit } from "./lineup.js"
import { multiplicativeDevig, powerDevig } from "./devig.js"
import { parseEspnScoreboard } from "./espn.js"
import { NFL_COMPETITION_ID, fixturesUrl, homeAwayScore, homeVsAway, parseScores365 } from "./scores365.js"
import { bestTeamTitleRate, brierScore, pageCusum, reliabilityBins, seriesWinProb } from "./research.js"
import { SHIFT_FLOOR, shouldWithhold, situationalShift } from "./withhold.js"

describe("538 team Elo", () => {
  it("matches the published win probability at home field", () => {
    const p = winProb(HFA)
    assert.ok(Math.abs(p - 1 / (10 ** (-65 / 400) + 1)) < 1e-15)
    assert.ok(p > 0.59 && p < 0.6)
  })

  it("uses a winner-signed margin multiplier, and the absolute form disagrees on an upset", () => {
    const upset = movMultiplier(14, 120, 0)
    const wrong = absDeltaMultiplier(14, 120)
    assert.notEqual(upset, wrong)
    assert.ok(upset > wrong)
    const favorite = movMultiplier(14, 120, 1)
    assert.ok(Math.abs(favorite - wrong) < 1e-12)
  })

  it("uses denominator 1 on a tie", () => {
    const tie = movMultiplier(0, 40, 0.5)
    assert.equal(tie, Math.log(1 + 1) * 2.2)
  })

  it("replays a season boundary, a pinned reversion, and the K update", () => {
    assert.equal(Object.keys(REVERSIONS).length, 11)
    const rows = replay(
      [
        { team1: "CLE", team2: "PIT", season: 1998, score1: 21, score2: 7, result1: 1 },
        { team1: "CLE", team2: "BAL", season: 1999, score1: null, score2: null, result1: null },
      ],
      { CLE: 1600, PIT: 1500, BAL: 1400 },
    )
    const firstDiff = 1600 - 1500 + HFA
    const firstP = winProb(firstDiff)
    const mult = movMultiplier(14, firstDiff, 1)
    const shift = K * mult * (1 - firstP)
    assert.ok(Math.abs(rows[0]!.prob1 - firstP) < 1e-12)
    assert.ok(Math.abs(rows[0]!.shift - shift) < 1e-9)
    assert.equal(rows[1]!.elo1, 1300)
    assert.equal(rows[1]!.elo2, 1400)
  })

  it("does not pretend equal ratings are a team projection", () => {
    const prior = publicPrior({ site: "CIN" })
    assert.ok(Math.abs(prior.pHome - winProb(HFA)) < 1e-12)
    assert.ok(prior.pBal < 0.5)
    assert.match(prior.note, /Not the coach projection/)
  })
})

describe("shrinkage, withhold, metrics, fence", () => {
  it("positive-part James-Stein zeros a tiny vector and barely moves a large one", () => {
    assert.deepEqual(positivePartJamesStein([1, 0, 0], 1), [0, 0, 0])
    const big = positivePartJamesStein([10, 0, 0], 1)
    assert.ok(Math.abs(big[0]! - 9.9) < 1e-12)
    assert.deepEqual(positivePartJamesStein([3, 4], 1), [3, 4])
  })

  it("withholds a quiet shift and keeps a measured one", () => {
    assert.equal(shouldWithhold(0), true)
    assert.equal(shouldWithhold(situationalShift([{ lean: 0 }])), true)
    const loud = situationalShift(
      [
        { lean: 0.62, freshness: 0.9, trust: 0.95 },
        { lean: 0.55, freshness: 0.95, trust: 0.8 },
      ],
      7,
    )
    assert.ok(loud > SHIFT_FLOOR)
    assert.equal(shouldWithhold(loud), false)
    assert.ok(Math.abs(7 * 0.025 - 0.175) < 1e-12)
  })

  it("rejects unstable cells and computes the seven from counted cells", () => {
    const single = { n: ANCHOR_MOTION_PA_SINGLE.n, epaSum: ANCHOR_MOTION_PA_SINGLE.epa * ANCHOR_MOTION_PA_SINGLE.n, signStable: true }
    const split = { n: 4000, epaSum: 0.064 * 4000, signStable: true }
    const sii = computeGseSii(single, split)
    assert.ok(sii != null && Math.abs(sii - (0.167 - 0.064)) < 1e-12)
    assert.equal(computeGseSii(single, { ...split, signStable: false }), null)
    const q = computeGseQptsr({ n: 100, epaSum: -42, signStable: true }, { n: 100, epaSum: 0, signStable: true })
    assert.ok(q != null && Math.abs(q - -0.42) < 1e-12)
    assert.equal(computeGseSpese([0.5, 0.5], [1, 0]), 1)
    assert.ok((computeGseTor({ n: 10, epaSum: 2, signStable: true }, { n: 10, epaSum: -1, signStable: true }) ?? 0) > 0)
    assert.equal(computeGseSva([{ epa: 1, leverage: 2 }, { epa: -1, leverage: 2 }]), 0)
    assert.equal(computeGseSva([{ epa: 1, leverage: -1 }]), null)
    assert.ok(Math.abs((computeGseDwp([{ wpChosen: 0.4, wpBest: 0.55 }]) ?? 0) - -0.15) < 1e-12)
  })

  it("refuses a book price and keeps the steam result dead", () => {
    assert.throws(() => assertCoachInputs({ homeSpread: -3 }), CoachFenceError)
    assert.throws(() => assertCoachInputs({ mr_mid: 0.2 }), CoachFenceError)
    assert.doesNotThrow(() => assertCoachInputs({ flowersTarget: 0.28, olOut: 2 }))
    const steam = KILLED_EDGES.find((e) => e.id === "steam")
    assert.ok(steam)
    assert.equal(mayReopen(steam!, { r: 0.02, n: 400, preregistered: true }), false)
    assert.equal(mayReopen(steam!, { r: 0.08, n: 400, preregistered: false }), false)
    assert.equal(mayReopen(steam!, { r: 0.08, n: 400, preregistered: true }), true)
  })

  it("does not list a gated product as public code", () => {
    const pff = SOURCE_REGISTRY.find((row) => row.id === "pff")
    assert.equal(pff?.status, "IDENTITY-GATED")
    assert.equal(SOURCE_REGISTRY.find((row) => row.id === "fivethirtyeight-nfl-elo")?.status, "PUBLIC-CODE")
    assert.equal(SOURCE_REGISTRY.find((row) => row.id === "pydfs-lineup-optimizer")?.status, "PUBLIC-CODE")
    assert.equal(SOURCE_REGISTRY.find((row) => row.id === "the-odds-api")?.status, "IDENTITY-GATED")
  })

  it("enforces the showdown cap the commercial tools resell", () => {
    assert.equal(captainSalary(10000), 15000)
    assert.equal(captainPoints(10), 15)
    assert.equal(underCap(40000, 10000, SHOWDOWN_CAP), true)
    assert.equal(underCap(40000, 10001, SHOWDOWN_CAP), false)
    assert.equal(withinTeamLimit({ CIN: 4 }, "CIN", 4), false)
    assert.equal(withinTeamLimit({ CIN: 3 }, "CIN", 4), true)
  })

  it("reads a 365Scores game and treats -1 as unplayed", () => {
    const board = parseScores365({
      ttl: 300,
      lastUpdateId: 7,
      games: [
        {
          id: 1,
          competitionDisplayName: "NFL",
          startTime: "2026-10-25T12:00:00-05:00",
          statusText: "Scheduled",
          homeCompetitor: { name: "Baltimore Ravens", symbolicName: "BAL", score: -1 },
          awayCompetitor: { name: "Cincinnati Bengals", symbolicName: "CIN", score: -1 },
        },
      ],
    })
    assert.equal(board.games.length, 1)
    assert.equal(board.games[0]!.home.score, null)
    assert.equal(board.games[0]!.away.abbr, "CIN")
    assert.equal(homeVsAway(board.games[0]!), "BAL vs CIN")
    assert.equal(homeAwayScore(board.games[0]!), "—–—")
    assert.equal(board.ttl, 300)
    assert.match(fixturesUrl(NFL_COMPETITION_ID), /competitions=352/)
    assert.equal(parseScores365({ ttl: 5, games: [] }).games.length, 0)
  })

  it("reads ESPN home vs away and ignores a scheduled zero", () => {
    const board = parseEspnScoreboard({
      season: { year: 2026 },
      week: { number: 7 },
      events: [
        {
          id: "401873010",
          date: "2026-10-23T00:15:00Z",
          competitions: [
            {
              status: { type: { state: "post", shortDetail: "Final" } },
              competitors: [
                { homeAway: "away", score: "24", team: { abbreviation: "NE", displayName: "New England Patriots" } },
                { homeAway: "home", score: "30", team: { abbreviation: "CHI", displayName: "Chicago Bears" } },
              ],
            },
          ],
        },
        {
          id: "401873012",
          date: "2026-10-25T17:00:00Z",
          competitions: [
            {
              status: { type: { state: "pre", shortDetail: "Sun 12:00" } },
              competitors: [
                { homeAway: "home", score: "0", team: { abbreviation: "BAL", displayName: "Baltimore Ravens" } },
                { homeAway: "away", score: "0", team: { abbreviation: "CIN", displayName: "Cincinnati Bengals" } },
              ],
            },
          ],
        },
      ],
    })
    assert.equal(board.week, 7)
    assert.equal(homeVsAway(board.games[0]!), "CHI vs NE")
    assert.equal(homeAwayScore(board.games[0]!), "30–24")
    assert.equal(board.games[1]!.home.score, null)
    assert.equal(homeVsAway(board.games[1]!), "BAL vs CIN")
  })

  it("de-vigs -150/+130 without raising the favorite", () => {
    const mult = multiplicativeDevig([-150, 130])
    const power = powerDevig([-150, 130])
    assert.ok(Math.abs(mult[0]! - 0.5798319328) < 1e-9)
    assert.ok(Math.abs(mult[1]! - 0.4201680672) < 1e-9)
    assert.ok(Math.abs(power[0]! - 0.583982635) < 1e-6)
    assert.ok(Math.abs(power[1]! - 0.416017365) < 1e-6)
    assert.ok(power[0]! < 0.6)
    assert.ok(Math.abs(0.584 + 0.4202 - 1) > 0.004)
    assert.ok(0.6557 > 0.6)
  })

  it("scores calibration, finds a break, and shows the best team does not always win", () => {
    assert.equal(brierScore([{ p: 1, y: 1 }, { p: 0, y: 0 }]), 0)
    assert.equal(brierScore([{ p: 0.5, y: 1 }, { p: 0.5, y: 0 }]), 0.25)
    assert.equal(brierScore([]), null)
    const bins = reliabilityBins(
      [
        { p: 0.2, y: 0 },
        { p: 0.8, y: 1 },
      ],
      5,
    )
    assert.equal(bins?.length, 2)
    assert.equal(seriesWinProb(0.6, 1), 0.6)
    const series = seriesWinProb(0.6, 7)
    assert.ok(series != null && series > 0.6 && series < 1)
    assert.equal(pageCusum([0, 0, 0, 0], 0, 1).breakAt, null)
    assert.equal(pageCusum([0, 0, 3, 3], 0, 4).breakAt, 3)
    const games = [
      { home: 0, away: 1, pHome: 0.9 },
      { home: 1, away: 0, pHome: 0.1 },
    ]
    const rate = bestTeamTitleRate(games, 2, 0, 200, 7)
    assert.ok(rate != null && rate > 0.7)
    const coin = bestTeamTitleRate(
      [
        { home: 0, away: 1, pHome: 0.5 },
        { home: 1, away: 0, pHome: 0.5 },
      ],
      2,
      0,
      400,
      11,
    )
    assert.ok(coin != null && coin < 0.7)
  })
})

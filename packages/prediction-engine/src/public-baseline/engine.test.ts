import { describe, it, expect } from "vitest"
import { absDeltaMultiplier, HFA, K, movMultiplier, publicPrior, replay, REVERSIONS, winProb } from "./elo538.js"
import { assertCoachInputs, CoachFenceError } from "./fence.js"
import { positivePartJamesStein } from "./jamesStein.js"
import { KILLED_EDGES, mayReopen } from "./killed.js"
import { ANCHOR_MOTION_PA_SINGLE, computeGseDwp, computeGseQptsr, computeGseSii, computeGseSpese, computeGseSva, computeGseTor } from "./metrics.js"
import { SOURCE_REGISTRY } from "./registry.js"
import { captainPoints, captainSalary, SHOWDOWN_CAP, underCap, withinTeamLimit } from "./lineup.js"
import { additiveDevig, compareDevig, multiplicativeDevig, powerDevig, shinDevig } from "./devig.js"
import { parseEspnScoreboard } from "./espn.js"
import { NFL_COMPETITION_ID, fixturesUrl, homeAwayScore, homeVsAway, parseScores365 } from "./scores365.js"
import { bestTeamTitleRate, brierScoreRows, pageCusum, reliabilityBins, seriesWinProb } from "./research.js"
import { SHIFT_FLOOR, shouldWithhold, situationalShift } from "./withhold.js"

describe("538 team Elo", () => {
  it("matches the published win probability at home field", () => {
    const p = winProb(HFA)
    expect(Math.abs(p - 1 / (10 ** (-65 / 400) + 1)) < 1e-15).toBeTruthy()
    expect(p > 0.59 && p < 0.6).toBeTruthy()
  })

  it("uses a winner-signed margin multiplier, and the absolute form disagrees on an upset", () => {
    const upset = movMultiplier(14, 120, 0)
    const wrong = absDeltaMultiplier(14, 120)
    expect(upset).not.toBe(wrong)
    expect(upset > wrong).toBeTruthy()
    const favorite = movMultiplier(14, 120, 1)
    expect(Math.abs(favorite - wrong) < 1e-12).toBeTruthy()
  })

  it("uses denominator 1 on a tie", () => {
    const tie = movMultiplier(0, 40, 0.5)
    expect(tie).toBe(Math.log(1 + 1) * 2.2)
  })

  it("replays a season boundary, a pinned reversion, and the K update", () => {
    expect(Object.keys(REVERSIONS).length).toBe(11)
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
    expect(Math.abs(rows[0]!.prob1 - firstP) < 1e-12).toBeTruthy()
    expect(Math.abs(rows[0]!.shift - shift) < 1e-9).toBeTruthy()
    expect(rows[1]!.elo1).toBe(1300)
    expect(rows[1]!.elo2).toBe(1400)
  })

  it("does not pretend equal ratings are a team projection", () => {
    const prior = publicPrior({ site: "CIN" })
    expect(Math.abs(prior.pHome - winProb(HFA)) < 1e-12).toBeTruthy()
    expect(prior.pBal < 0.5).toBeTruthy()
    expect(prior.note).toMatch(/Not the coach projection/)
  })
})

describe("shrinkage, withhold, metrics, fence", () => {
  it("positive-part James-Stein zeros a tiny vector and barely moves a large one", () => {
    expect(positivePartJamesStein([1, 0, 0], 1)).toEqual([0, 0, 0])
    const big = positivePartJamesStein([10, 0, 0], 1)
    expect(Math.abs(big[0]! - 9.9) < 1e-12).toBeTruthy()
    expect(positivePartJamesStein([3, 4], 1)).toEqual([3, 4])
  })

  it("withholds a quiet shift and keeps a measured one", () => {
    expect(shouldWithhold(0)).toBe(true)
    expect(shouldWithhold(situationalShift([{ lean: 0 }]))).toBe(true)
    const loud = situationalShift(
      [
        { lean: 0.62, freshness: 0.9, trust: 0.95 },
        { lean: 0.55, freshness: 0.95, trust: 0.8 },
      ],
      7,
    )
    expect(loud > SHIFT_FLOOR).toBeTruthy()
    expect(shouldWithhold(loud)).toBe(false)
    expect(Math.abs(7 * 0.025 - 0.175) < 1e-12).toBeTruthy()
  })

  it("rejects unstable cells and computes the seven from counted cells", () => {
    const single = { n: ANCHOR_MOTION_PA_SINGLE.n, epaSum: ANCHOR_MOTION_PA_SINGLE.epa * ANCHOR_MOTION_PA_SINGLE.n, signStable: true }
    const split = { n: 4000, epaSum: 0.064 * 4000, signStable: true }
    const sii = computeGseSii(single, split)
    expect(sii != null && Math.abs(sii - (0.167 - 0.064)) < 1e-12).toBeTruthy()
    expect(computeGseSii(single, { ...split, signStable: false })).toBe(null)
    const q = computeGseQptsr({ n: 100, epaSum: -42, signStable: true }, { n: 100, epaSum: 0, signStable: true })
    expect(q != null && Math.abs(q - -0.42) < 1e-12).toBeTruthy()
    expect(computeGseSpese([0.5, 0.5], [1, 0])).toBe(1)
    expect((computeGseTor({ n: 10, epaSum: 2, signStable: true }, { n: 10, epaSum: -1, signStable: true }) ?? 0) > 0).toBeTruthy()
    expect(computeGseSva([{ epa: 1, leverage: 2 }, { epa: -1, leverage: 2 }])).toBe(0)
    expect(computeGseSva([{ epa: 1, leverage: -1 }])).toBe(null)
    expect(Math.abs((computeGseDwp([{ wpChosen: 0.4, wpBest: 0.55 }]) ?? 0) - -0.15) < 1e-12).toBeTruthy()
  })

  it("refuses a book price and keeps the steam result dead", () => {
    expect(() => assertCoachInputs({ homeSpread: -3 })).toThrow(CoachFenceError)
    expect(() => assertCoachInputs({ mr_mid: 0.2 })).toThrow(CoachFenceError)
    expect(() => assertCoachInputs({ flowersTarget: 0.28, olOut: 2 })).not.toThrow()
    const steam = KILLED_EDGES.find((e) => e.id === "steam")
    expect(steam).toBeTruthy()
    expect(mayReopen(steam!, { r: 0.02, n: 400, preregistered: true })).toBe(false)
    expect(mayReopen(steam!, { r: 0.08, n: 400, preregistered: false })).toBe(false)
    expect(mayReopen(steam!, { r: 0.08, n: 400, preregistered: true })).toBe(true)
  })

  it("does not list a gated product as public code", () => {
    const pff = SOURCE_REGISTRY.find((row) => row.id === "pff")
    expect(pff?.status).toBe("IDENTITY-GATED")
    expect(SOURCE_REGISTRY.find((row) => row.id === "fivethirtyeight-nfl-elo")?.status).toBe("PUBLIC-CODE")
    expect(SOURCE_REGISTRY.find((row) => row.id === "pydfs-lineup-optimizer")?.status).toBe("PUBLIC-CODE")
    expect(SOURCE_REGISTRY.find((row) => row.id === "the-odds-api")?.status).toBe("IDENTITY-GATED")
  })

  it("enforces the showdown cap the commercial tools resell", () => {
    expect(captainSalary(10000)).toBe(15000)
    expect(captainPoints(10)).toBe(15)
    expect(underCap(40000, 10000, SHOWDOWN_CAP)).toBe(true)
    expect(underCap(40000, 10001, SHOWDOWN_CAP)).toBe(false)
    expect(withinTeamLimit({ CIN: 4 }, "CIN", 4)).toBe(false)
    expect(withinTeamLimit({ CIN: 3 }, "CIN", 4)).toBe(true)
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
    expect(board.games.length).toBe(1)
    expect(board.games[0]!.home.score).toBe(null)
    expect(board.games[0]!.away.abbr).toBe("CIN")
    expect(homeVsAway(board.games[0]!)).toBe("BAL vs CIN")
    expect(homeAwayScore(board.games[0]!)).toBe("—–—")
    expect(board.ttl).toBe(300)
    expect(fixturesUrl(NFL_COMPETITION_ID)).toMatch(/competitions=352/)
    expect(parseScores365({ ttl: 5, games: [] }).games.length).toBe(0)
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
    expect(board.week).toBe(7)
    expect(homeVsAway(board.games[0]!)).toBe("CHI vs NE")
    expect(homeAwayScore(board.games[0]!)).toBe("30–24")
    expect(board.games[1]!.home.score).toBe(null)
    expect(homeVsAway(board.games[1]!)).toBe("BAL vs CIN")
  })

  it("de-vigs -150/+130 without raising the favorite", () => {
    const mult = multiplicativeDevig([-150, 130])
    const power = powerDevig([-150, 130])
    expect(Math.abs(mult[0]! - 0.5798319328) < 1e-9).toBeTruthy()
    expect(Math.abs(mult[1]! - 0.4201680672) < 1e-9).toBeTruthy()
    expect(Math.abs(power[0]! - 0.583982635) < 1e-6).toBeTruthy()
    expect(Math.abs(power[1]! - 0.416017365) < 1e-6).toBeTruthy()
    expect(power[0]! < 0.6).toBeTruthy()
    expect(Math.abs(0.584 + 0.4202 - 1) > 0.004).toBeTruthy()
    expect(0.6557 > 0.6).toBeTruthy()
    const book = compareDevig([-150, 130])
    expect(Math.abs(book.additive[0]! - 0.5826086957) < 1e-9).toBeTruthy()
    expect(Math.abs(book.shin[0]! - book.additive[0]!) < 1e-9).toBeTruthy()
    expect(Math.abs(book.powerK - 1.05297) < 1e-4).toBeTruthy()
    const three = [-100, 700 / 3, 300]
    const shin = shinDevig(three)
    const add = additiveDevig(three)
    expect(Math.abs(shin[0]! - add[0]!) > 0.001).toBeTruthy()
    expect(Math.abs(shin.reduce((s, p) => s + p, 0) - 1) < 1e-8).toBeTruthy()
  })

  it("scores calibration, finds a break, and shows the best team does not always win", () => {
    expect(brierScoreRows([{ p: 1, y: 1 }, { p: 0, y: 0 }])).toBe(0)
    expect(brierScoreRows([{ p: 0.5, y: 1 }, { p: 0.5, y: 0 }])).toBe(0.25)
    expect(brierScoreRows([])).toBe(null)
    const bins = reliabilityBins(
      [
        { p: 0.2, y: 0 },
        { p: 0.8, y: 1 },
      ],
      5,
    )
    expect(bins?.length).toBe(2)
    expect(seriesWinProb(0.6, 1)).toBe(0.6)
    const series = seriesWinProb(0.6, 7)
    expect(series != null && series > 0.6 && series < 1).toBeTruthy()
    expect(pageCusum([0, 0, 0, 0], 0, 1).breakAt).toBe(null)
    expect(pageCusum([0, 0, 3, 3], 0, 4).breakAt).toBe(3)
    const games = [
      { home: 0, away: 1, pHome: 0.9 },
      { home: 1, away: 0, pHome: 0.1 },
    ]
    const rate = bestTeamTitleRate(games, 2, 0, 200, 7)
    expect(rate != null && rate > 0.7).toBeTruthy()
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
    expect(coin != null && coin < 0.7).toBeTruthy()
  })
})

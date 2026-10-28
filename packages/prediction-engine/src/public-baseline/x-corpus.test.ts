import { describe, it, expect } from "vitest"
import { advanceWithCorpus, loadCoachCorpus, personnelOnField, requireCorpus } from "./x-corpus.js"
import type { MarkovState } from "../markov-simulator.js"
import { CORPUS_PATH } from "./corpus-path.js"

const CORPUS = CORPUS_PATH

const stable = (n: number, epaSum: number) => ({
  n,
  epaSum,
  signStable: { 2023: true as const, 2024: true as const, 2025: true as const },
})

const STATE: MarkovState = {
  quarter: 1,
  clockSeconds: 900,
  timeouts: 3,
  scoreDiff: 0,
  posteam: "SF",
  down: 1,
  distance: 10,
  yardline: 25,
}

describe("X pull is the coach corpus", () => {
  const brief = loadCoachCorpus(CORPUS)

  it("reads all 300 posts as coach input", () => {
    expect(brief.posts.length).toBe(300)
    expect(brief.coachInput).toBe(true)
    expect(brief.ticket ?? null).toBe(null)
    for (const post of brief.posts) {
      expect(post.coachInput).toBe(true)
      expect(post.postId.length > 0).toBeTruthy()
    }
  })

  it("takes Evans and Samuel off the field and leaves the four who are up", () => {
    expect(personnelOnField(brief, "SF", "WR")).toEqual([
      "Christian Kirk",
      "Brandin Cooks",
      "Jordan Watkins",
      "Jacob Cowing",
    ])
    expect(brief.personnel.SF.wrOut).toEqual(["Mike Evans", "Deebo Samuel"])
    const evans = brief.availability.find((row) => row.player === "Mike Evans")
    const deebo = brief.availability.find((row) => row.player === "Deebo Samuel")
    expect(evans?.status).toBe("out")
    expect(evans?.detail).toBe("Achilles")
    expect(evans?.team).toBe("SF")
    expect(deebo?.status).toBe("out")
    expect(deebo?.detail).toBe("hamstring")
    const cooksBefore = brief.measurements.find((row) => row.label === "SF:Cooks:routeShareBefore")
    const cooksAfter = brief.measurements.find((row) => row.label === "SF:Cooks:routeShareAfter")
    const kittle = brief.measurements.find((row) => row.label === "SF:Kittle:targetShareAfterEvansExit")
    expect(cooksBefore?.value).toBe(0.23)
    expect(cooksAfter?.value).toBe(0.83)
    expect(kittle?.value).toBe(0.44)
  })

  it("puts Lamar's ankle on BAL@CIN and mixes the Bengals blitz rate into the Ravens dropback", () => {
    const game = brief.games["401873012"]
    expect(game.lamar.status).toBe("questionable")
    expect(game.lamar.detail).toBe("ankle")
    expect(game.lamar.team).toBe("BAL")
    expect(Math.abs(game.bengalsBlitzRate - 0.178) < 1e-12).toBeTruthy()
    expect(Math.abs(game.bengalsPressureRate - 0.393) < 1e-12).toBeTruthy()
    expect(game.ravensEpaWhenBlitzed).toBe(0.292)
    expect(game.ravensEpaWithoutBlitz).toBe(-0.028)
    const expected = 0.178 * 0.292 + (1 - 0.178) * -0.028
    expect(Math.abs(game.ravensExpectedEpaPerDropback - expected) < 1e-12).toBeTruthy()
  })

  it("reads the Thursday film on 401873010 and does not mint a ticket", () => {
    const game = brief.games["401873010"]
    expect(game.mayeEpaPerDropback).toBe(0.33)
    expect(game.williamsEpaPerDropback).toBe(0.38)
    expect(game.santosFieldGoalYards).toBe(58)
    expect(game.santosPostId).toBe("2113659549790163195")
    expect(game.ticket ?? null).toBe(null)
  })

  it("refuses a step that did not read the corpus", () => {
    expect(() => requireCorpus(null)).toThrow(/X corpus was not read/)
  })

  it("will not advance a 49ers snap without the corpus, and with it the WR room is the corpus room", () => {
    expect(() => advanceWithCorpus(STATE, {
      packageCell: stable(10, 1),
      shellBoxCell: stable(10, 1),
      pressureCell: stable(10, 1),
      routeCell: stable(10, 1),
      outcomeCell: stable(10, 1),
      rawSituationalEpa: 0.2,
    }, null)).toThrow(/X corpus was not read/)
    const step = advanceWithCorpus(STATE, {
      packageCell: stable(10, 1),
      shellBoxCell: stable(10, 1),
      pressureCell: stable(10, 1),
      routeCell: stable(10, 1),
      outcomeCell: stable(10, 1),
      rawSituationalEpa: 0.2,
    }, brief)
    expect(step.coachInput).toBe(true)
    expect(step.corpusPosts).toBe(300)
    expect(step.wrOnField).toEqual(["Christian Kirk", "Brandin Cooks", "Jordan Watkins", "Jacob Cowing"])
    expect(step.ok).toBe(true)
  })

  it("uses the blitz mix as the Ravens number when the posteam is BAL", () => {
    const step = advanceWithCorpus({ ...STATE, posteam: "BAL" }, {
      packageCell: stable(10, 1),
      shellBoxCell: stable(10, 1),
      pressureCell: stable(10, 1),
      routeCell: stable(10, 1),
      outcomeCell: stable(10, 1),
      rawSituationalEpa: 0.2,
    }, brief)
    expect(step.balCinEpa).toBe(brief.games["401873012"].ravensExpectedEpaPerDropback)
    expect(step.balCinEpa != null && step.balCinEpa > 0 && step.balCinEpa < 0.05).toBeTruthy()
  })
})

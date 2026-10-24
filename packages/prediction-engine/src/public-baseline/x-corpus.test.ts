import assert from "node:assert/strict"
import { join } from "node:path"
import { describe, it } from "node:test"
import { advanceWithCorpus, loadCoachCorpus, personnelOnField, requireCorpus } from "./x-corpus.js"
import type { MarkovState } from "../markov-simulator.js"

const CORPUS = join(process.cwd(), "docs/engine/corpus/x-pull-2026-10-24.md")

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
    assert.equal(brief.posts.length, 300)
    assert.equal(brief.coachInput, true)
    assert.equal(brief.ticket, null)
    for (const post of brief.posts) {
      assert.equal(post.coachInput, true)
      assert.ok(post.postId.length > 0)
    }
  })

  it("takes Evans and Samuel off the field and leaves the four who are up", () => {
    assert.deepEqual(personnelOnField(brief, "SF", "WR"), [
      "Christian Kirk",
      "Brandin Cooks",
      "Jordan Watkins",
      "Jacob Cowing",
    ])
    assert.deepEqual(brief.personnel.SF.wrOut, ["Mike Evans", "Deebo Samuel"])
    const evans = brief.availability.find((row) => row.player === "Mike Evans")
    const deebo = brief.availability.find((row) => row.player === "Deebo Samuel")
    assert.equal(evans?.status, "out")
    assert.equal(evans?.detail, "Achilles")
    assert.equal(evans?.team, "SF")
    assert.equal(deebo?.status, "out")
    assert.equal(deebo?.detail, "hamstring")
    const cooksBefore = brief.measurements.find((row) => row.label === "SF:Cooks:routeShareBefore")
    const cooksAfter = brief.measurements.find((row) => row.label === "SF:Cooks:routeShareAfter")
    const kittle = brief.measurements.find((row) => row.label === "SF:Kittle:targetShareAfterEvansExit")
    assert.equal(cooksBefore?.value, 0.23)
    assert.equal(cooksAfter?.value, 0.83)
    assert.equal(kittle?.value, 0.44)
  })

  it("puts Lamar's ankle on BAL@CIN and mixes the Bengals blitz rate into the Ravens dropback", () => {
    const game = brief.games["401873012"]
    assert.equal(game.lamar.status, "questionable")
    assert.equal(game.lamar.detail, "ankle")
    assert.equal(game.lamar.team, "BAL")
    assert.ok(Math.abs(game.bengalsBlitzRate - 0.178) < 1e-12)
    assert.ok(Math.abs(game.bengalsPressureRate - 0.393) < 1e-12)
    assert.equal(game.ravensEpaWhenBlitzed, 0.292)
    assert.equal(game.ravensEpaWithoutBlitz, -0.028)
    const expected = 0.178 * 0.292 + (1 - 0.178) * -0.028
    assert.ok(Math.abs(game.ravensExpectedEpaPerDropback - expected) < 1e-12)
  })

  it("reads the Thursday film on 401873010 and does not mint a ticket", () => {
    const game = brief.games["401873010"]
    assert.equal(game.mayeEpaPerDropback, 0.33)
    assert.equal(game.williamsEpaPerDropback, 0.38)
    assert.equal(game.santosFieldGoalYards, 58)
    assert.equal(game.santosPostId, "2113659549790163195")
    assert.equal(game.ticket, null)
  })

  it("refuses a step that did not read the corpus", () => {
    assert.throws(() => requireCorpus(null), /X corpus was not read/)
  })

  it("will not advance a 49ers snap without the corpus, and with it the WR room is the corpus room", () => {
    assert.throws(() => advanceWithCorpus(STATE, {
      packageCell: stable(10, 1),
      shellBoxCell: stable(10, 1),
      pressureCell: stable(10, 1),
      routeCell: stable(10, 1),
      outcomeCell: stable(10, 1),
      rawSituationalEpa: 0.2,
    }, null), /X corpus was not read/)
    const step = advanceWithCorpus(STATE, {
      packageCell: stable(10, 1),
      shellBoxCell: stable(10, 1),
      pressureCell: stable(10, 1),
      routeCell: stable(10, 1),
      outcomeCell: stable(10, 1),
      rawSituationalEpa: 0.2,
    }, brief)
    assert.equal(step.coachInput, true)
    assert.equal(step.corpusPosts, 300)
    assert.deepEqual(step.wrOnField, ["Christian Kirk", "Brandin Cooks", "Jordan Watkins", "Jacob Cowing"])
    assert.equal(step.ok, true)
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
    assert.equal(step.balCinEpa, brief.games["401873012"].ravensExpectedEpaPerDropback)
    assert.ok(step.balCinEpa != null && step.balCinEpa > 0 && step.balCinEpa < 0.05)
  })
})

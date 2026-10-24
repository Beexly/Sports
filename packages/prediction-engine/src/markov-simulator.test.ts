/**
 * Markov simulator tests: cell gate refuses unstable/missing cells, the seven
 * metrics go null with them, the anchors are constants (never refit), the
 * NegBin/FG/kneeldown step parameters hold, and the coach path stays odds-free.
 *
 * James-Stein: a single cell is not shrunk (d < 3 returns the raw lean).
 * |lean| < 0.03 withholds. A d >= 3 vector with a sampling variance does shrink.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  advanceOutcome,
  ANCHORS,
  checkdownSubstitution,
  COPULA_TAUS,
  FG_RATES,
  gateCell,
  kneeldownYards,
  KNEELDOWN,
  redZoneTdDistribution,
  REDZONE_TD_VARIANCE_TO_MEAN,
  sevenMetrics,
  SHADOW_HAIRCUT_MIN,
  shrinkSituational,
  sinkhorn,
  type Cube,
  type MarkovState,
} from "./markov-simulator.js"
import { shouldWithhold } from "./public-baseline/withhold.js"

const stable = (n: number, epaSum: number) => ({
  n,
  epaSum,
  signStable: { 2023: true, 2024: true, 2025: true },
})
const unstable = (n: number, epaSum: number) => ({
  n,
  epaSum,
  signStable: { 2023: true, 2024: false, 2025: true },
})

const BASE_STATE: MarkovState = {
  quarter: 4,
  clockSeconds: 300,
  timeouts: 2,
  scoreDiff: -4,
  posteam: "CHI",
  down: 3,
  distance: 4,
  yardline: 45,
}

const cells = {
  packageCell: stable(500, 10),
  shellBoxCell: stable(500, 10),
  pressureCell: stable(500, 10),
  routeCell: stable(500, 10),
  outcomeCell: stable(1000, 40),
}

describe("markov cell gate", () => {
  it("accepts a reported, sign-stable cell", () => {
    const cube: Cube = { "outcome|3|1|9": stable(5656, 944.6) }
    const g = gateCell(cube, "outcome|3|1|9")
    assert.ok("cell" in g)
  })

  it("refuses an unstable cell with a receipt", () => {
    const cube: Cube = { "outcome|3|1|9": unstable(100, 5) }
    const g = gateCell(cube, "outcome|3|1|9")
    assert.ok("receipt" in g)
    if ("receipt" in g) assert.equal(g.receipt.reason, "unstable-cell")
  })

  it("refuses a missing cell with a missing-cell receipt", () => {
    const g = gateCell({}, "outcome|3|1|9")
    assert.ok("receipt" in g)
    if ("receipt" in g) assert.equal(g.receipt.reason, "missing-cell")
  })
})

describe("advanceOutcome", () => {
  it("draws no EPA and emits a receipt when the outcome cell is unstable", () => {
    const r = advanceOutcome(BASE_STATE, {
      ...cells,
      outcomeCell: unstable(50, -2),
      rawSituationalEpa: 0.4,
    })
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.receipt.reason, "unstable-cell")
  })

  it("emits missing-cell receipts for each absent step cell", () => {
    const r = advanceOutcome(BASE_STATE, { outcomeCell: stable(100, 3), rawSituationalEpa: 0.2 })
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.receipt.module, "personnel-package")
  })

  it("withholds a single cell under 0.03 and does not inflate it", () => {
    const raw = 0.02
    assert.equal(shrinkSituational(raw), raw)
    const r = advanceOutcome(BASE_STATE, { ...cells, rawSituationalEpa: raw })
    assert.equal(r.ok, true)
    if (r.ok) {
      assert.equal(r.withheld, shouldWithhold(raw))
      assert.equal(r.epa, 0)
    }
  })

  it("moves the projection when a single cell clears the floor", () => {
    const raw = 0.9
    const r = advanceOutcome(BASE_STATE, { ...cells, rawSituationalEpa: raw })
    assert.equal(r.ok, true)
    if (r.ok) {
      assert.equal(r.withheld, false)
      assert.equal(r.epa, raw)
    }
  })

  it("does not shrink d = 2 even when sigma2 is supplied", () => {
    assert.equal(shrinkSituational(0.9, [0.1], 0.083), 0.9)
  })

  it("shrinks a d >= 3 vector by the positive-part factor", () => {
    const raw = 0.9
    const siblings = [0.1, 0.1] as const
    const sigma2 = 0.083
    const expected = shrinkSituational(raw, siblings, sigma2)
    assert.ok(Math.abs(expected - 0.81) < 1e-12)
    const r = advanceOutcome(BASE_STATE, {
      ...cells,
      rawSituationalEpa: raw,
      siblingEpas: siblings,
      sigma2,
    })
    assert.equal(r.ok, true)
    if (r.ok) {
      assert.equal(r.withheld, false)
      assert.ok(Math.abs(r.epa - expected) < 1e-12)
    }
  })

  it("positive-part zeros a dominated vector and then withholds", () => {
    const r = advanceOutcome(BASE_STATE, {
      ...cells,
      rawSituationalEpa: 0.01,
      siblingEpas: [0.01, 0.01],
      sigma2: 0.01,
    })
    assert.equal(r.ok, true)
    if (r.ok) {
      assert.equal(r.withheld, true)
      assert.equal(r.epa, 0)
    }
  })
})

describe("measured anchors (constants, never refit)", () => {
  it("carries the work-order anchors verbatim", () => {
    assert.equal(ANCHORS.MOTION_PA_VS_SINGLE_HIGH, 0.167)
    assert.equal(ANCHORS.MOTION_PA_VS_SINGLE_HIGH_N, 5656)
    assert.equal(ANCHORS.PRESSURE_HELD_TAX, 0.42)
    assert.equal(ANCHORS.SACK_CONVERSION_UNDER_2S, 0.158)
    assert.equal(ANCHORS.SACK_CONVERSION_2_5_2_9, 0.101)
    assert.equal(ANCHORS.TWO_HIGH_EXPLOSIVES_WITH_SAFETY_OUT, 0.182)
    assert.equal(ANCHORS.TWO_HIGH_EXPLOSIVES_TWO_HIGH_COMP, 0.156)
  })

  it("step 6: kneeldown is the published point mass", () => {
    assert.equal(kneeldownYards(), -1.06)
    assert.equal(KNEELDOWN.sd, 0.5)
  })

  it("step 6: trailing inside two minutes substitutes the checkdown", () => {
    assert.equal(checkdownSubstitution({ ...BASE_STATE, clockSeconds: 90, scoreDiff: -4 }), true)
    assert.equal(checkdownSubstitution({ ...BASE_STATE, clockSeconds: 90, scoreDiff: 4 }), false)
  })

  it("step 7: calm field-goal make rates by band", () => {
    assert.equal(FG_RATES.find((b) => b.band[0] === 40)?.rate, 0.826)
    assert.equal(FG_RATES.find((b) => b.band[0] === 45)?.rate, 0.677)
    assert.equal(FG_RATES.find((b) => b.band[0] === 50)?.rate, 0.682)
    assert.equal(FG_RATES.find((b) => b.band[0] === 55)?.rate, 0.571)
    assert.equal(FG_RATES.find((b) => b.band[0] === 35), undefined)
  })

  it("step 7: red-zone touchdowns are negative binomial in the variance window", () => {
    const [lo, hi] = REDZONE_TD_VARIANCE_TO_MEAN
    assert.ok(lo >= 1.82 && hi <= 1.92)
    const dist = redZoneTdDistribution(2.0)
    const variance = 2.0 + (2.0 * 2.0) / dist.r
    const vm = variance / 2.0
    assert.ok(vm >= 1.82 && vm <= 1.92)
  })
})

describe("seven metrics go null on an unstable cell", () => {
  it("GSE-SII is null when the split-safety cell is unstable, and a number when stable", () => {
    const cubeUnstable: Cube = {
      "sii|single": stable(300, 45),
      "sii|split": unstable(300, 30),
    }
    const cubeStable: Cube = {
      "sii|single": stable(300, 45),
      "sii|split": stable(300, 30),
    }
    const input = { sii: { single: stable(300, 45), split: stable(300, 30) } }
    assert.equal(sevenMetrics(cubeUnstable, input)["GSE-SII"], null)
    assert.equal(sevenMetrics(cubeStable, input)["GSE-SII"], 45 / 300 - 30 / 300)
  })

  it("all seven keys exist and default to null", () => {
    const out = sevenMetrics({}, {})
    for (const k of ["GSE-SII", "GSE-QPTSR", "GSE-RLS", "GSE-SPESE", "GSE-TOR", "GSE-SVA", "GSE-DWP"]) {
      assert.equal(out[k], null)
    }
  })
})

describe("sinkhorn on stable cells", () => {
  it("returns unit row and column sums", () => {
    const K = [
      [1.2, 0.4, 0.9],
      [0.5, 1.1, 0.3],
      [0.8, 0.6, 1.0],
    ]
    const P = sinkhorn(K)
    for (const row of P) {
      assert.ok(Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-9)
    }
    for (let j = 0; j < 3; j++) {
      const col = P.reduce((a, r) => a + r[j]!, 0)
      assert.ok(Math.abs(col - 1) < 1e-9)
    }
  })
})

describe("coach fence: the markov module imports no price", () => {
  it("markov-simulator.ts source contains no odds/spread/market import", () => {
    const src = readFileSync(join(process.cwd(), "packages/prediction-engine/src/markov-simulator.ts"), "utf-8")
    assert.ok(!/from\s+["'][^"']*(odds|spread|market)/i.test(src), "market import found in coach path")
    assert.ok(!/\bimport\b[^;]*\b(SportsLine|OddsJam|PFF)\b/.test(src))
  })

  it("copula taus and shadow haircut carry the work-order values", () => {
    assert.equal(COPULA_TAUS["QB-WR1"], 0.385)
    assert.equal(COPULA_TAUS["QB-TE1"], 0.307)
    assert.equal(COPULA_TAUS["QB-RB1"], -0.02)
    assert.equal(SHADOW_HAIRCUT_MIN, 0.55)
  })
})

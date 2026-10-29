/**
 * GSE 7-step Markov simulator over the public EPA cube.
 *
 * A cell is usable only when n and epa_sum are reported and the EPA sign is
 * stable across 2023, 2024, and 2025. Otherwise the step emits a NamedGapReceipt
 * and does not draw an EPA.
 *
 * James-Stein runs only for d >= 3. A single cell is not a vector. The withhold
 * gate reads the shrunk value, which is the centered lean. |lean| < 0.03 withholds.
 *
 * The coach path imports zero odds.
 */
import { positivePartJamesStein } from "./public-baseline/jamesStein.js"
import { shouldWithhold } from "./public-baseline/withhold.js"
import {
  computeGseDwp,
  computeGseDwpBleed,
  computeGseQptsr,
  computeGseQptsrCell,
  computeGseRls,
  computeGseRlsCell,
  computeGseSii,
  computeGseSiiCell,
  computeGseSpese,
  computeGseSpeseCell,
  computeGseSva,
  computeGseTor,
  computeGseTorCell,
  type MetricResult,
  type SeparationTendency,
  type SiiCell,
  type SiiFlag,
} from "./metrics/gse-proprietary-seven.js"
import type { PressureBucket } from "./nfl/pressure-timing.js"
import type { FourthDownDecision } from "./nfl/fourth-down-aggression.js"

export type NamedGapReceipt = {
  module: string
  reason: "named-gap" | "missing-cell" | "unstable-cell"
  publicSource: string
}

export type CubeCell = {
  n: number
  epaSum: number
  signStable: { 2023: boolean; 2024: boolean; 2025: boolean }
}

export type Cube = Record<string, CubeCell>

export type MarkovState = {
  quarter: number
  clockSeconds: number
  timeouts: number
  scoreDiff: number
  posteam: string
  down: number
  distance: number
  yardline: number
}

export const ANCHORS = {
  MOTION_PA_VS_SINGLE_HIGH: 0.167,
  MOTION_PA_VS_SINGLE_HIGH_N: 5656,
  PRESSURE_HELD_TAX: 0.42,
  SACK_CONVERSION_UNDER_2S: 0.158,
  SACK_CONVERSION_2_5_2_9: 0.101,
  TWO_HIGH_EXPLOSIVES_WITH_SAFETY_OUT: 0.182,
  TWO_HIGH_EXPLOSIVES_TWO_HIGH_COMP: 0.156,
} as const

export const KNEELDOWN = { meanYards: -1.06, sd: 0.5 } as const

export const FG_RATES: { band: [number, number]; rate: number }[] = [
  { band: [40, 44], rate: 0.826 },
  { band: [45, 49], rate: 0.677 },
  { band: [50, 54], rate: 0.682 },
  { band: [55, 59], rate: 0.571 },
]

export const REDZONE_TD_VARIANCE_TO_MEAN: [number, number] = [1.82, 1.92]

export const COPULA_TAUS = { "QB-WR1": 0.385, "QB-TE1": 0.307, "QB-RB1": -0.02 } as const

export const SHADOW_HAIRCUT_MIN = 0.55

export function clampShadowHaircut(multiplier: number): number {
  if (multiplier < SHADOW_HAIRCUT_MIN) return SHADOW_HAIRCUT_MIN
  return Math.min(1, multiplier)
}

export function fgRate(yards: number): number | null {
  for (const b of FG_RATES) {
    if (yards >= b.band[0] && yards <= b.band[1]) return b.rate
  }
  return null
}

export function negBinParams(mean: number, variance: number): { r: number; p: number } {
  const r = (mean * mean) / (variance - mean)
  const p = r / (r + mean)
  return { r, p }
}

export function sinkhorn(K: number[][], iterations = 50): number[][] {
  const n = K.length
  const u = new Array(n).fill(1)
  const v = new Array(n).fill(1)
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < n; i++) {
      const rowI = K[i] ?? []
      const s = rowI.reduce((acc, k, j) => acc + k * (v[j] ?? 1), 0)
      u[i] = s > 0 ? 1 / s : (u[i] ?? 1)
    }
    for (let j = 0; j < n; j++) {
      const s = K.reduce((acc, row, i) => acc + (row[j] ?? 0) * (u[i] ?? 1), 0)
      v[j] = s > 0 ? 1 / s : (v[j] ?? 1)
    }
  }
  return K.map((row, i) => row.map((k, j) => k * (u[i] ?? 1) * (v[j] ?? 1)))
}

export function cellKey(parts: (string | number)[]): string {
  return parts.join("|")
}

function distanceBand(d: number): number {
  return Math.floor(d / 3)
}

function yardlineBand(y: number): number {
  return Math.floor(y / 5)
}

export type StepResult =
  | { ok: true; state: MarkovState; epa: number; cellKey: string; withheld: boolean }
  | { ok: false; receipt: NamedGapReceipt }

export function gateCell(cube: Cube, key: string): { cell: CubeCell } | { receipt: NamedGapReceipt } {
  const cell = cube[key]
  if (!cell || typeof cell.n !== "number" || typeof cell.epaSum !== "number") {
    return { receipt: { module: `cube:${key}`, reason: "missing-cell", publicSource: "nflverse play-by-play 2023-2025 join" } }
  }
  const s = cell.signStable
  if (!s || !s[2023] || !s[2024] || !s[2025]) {
    return { receipt: { module: `cube:${key}`, reason: "unstable-cell", publicSource: "nflverse play-by-play 2023-2025 join" } }
  }
  return { cell }
}

export type SituationInputs = {
  packageCell?: CubeCell
  shellBoxCell?: CubeCell
  pressureCell?: CubeCell
  routeCell?: CubeCell
  outcomeCell: CubeCell
  rawSituationalEpa: number
  /** Sibling cell means. James-Stein requires three or more, counting this cell. */
  siblingEpas?: readonly number[]
  /** Sampling variance of those means. Required before any shrink. Not a fitted constant. */
  sigma2?: number
}

/**
 * Shrink only when the vector has dimension >= 3 and a sampling variance is supplied.
 * A single cell is returned unchanged. d < 3 is not a James-Stein problem.
 */
export function shrinkSituational(raw: number, siblings: readonly number[] = [], sigma2?: number): number {
  const vector = [raw, ...siblings]
  if (vector.length < 3 || typeof sigma2 !== "number" || !(sigma2 >= 0)) return raw
  return positivePartJamesStein(vector, sigma2)[0] ?? raw
}

export function advanceOutcome(state: MarkovState, inputs: SituationInputs): StepResult {
  if (!inputs.packageCell) {
    return { ok: false, receipt: { module: "personnel-package", reason: "missing-cell", publicSource: "nflverse package counts" } }
  }
  if (!inputs.shellBoxCell) {
    return { ok: false, receipt: { module: "shell-box", reason: "missing-cell", publicSource: "4fecd26 snap-state cube" } }
  }
  if (!inputs.pressureCell) {
    return { ok: false, receipt: { module: "pressure-bucket", reason: "missing-cell", publicSource: "nflverse play-by-play" } }
  }
  if (!inputs.routeCell) {
    return { ok: false, receipt: { module: "route-conditional", reason: "missing-cell", publicSource: "public play-by-play" } }
  }
  const key = cellKey(["outcome", state.down, distanceBand(state.distance), yardlineBand(state.yardline)])
  const gated = gateCell({ [key]: inputs.outcomeCell }, key)
  if ("receipt" in gated) return { ok: false, receipt: gated.receipt }
  const shrunk = shrinkSituational(inputs.rawSituationalEpa, inputs.siblingEpas, inputs.sigma2)
  const withheld = shouldWithhold(shrunk)
  return { ok: true, state: { ...state }, epa: withheld ? 0 : shrunk, cellKey: key, withheld }
}

export function kneeldownYards(): number {
  return KNEELDOWN.meanYards
}

export function checkdownSubstitution(state: MarkovState): boolean {
  return state.clockSeconds <= 120 && state.scoreDiff < 0
}

export function redZoneTdDistribution(mean: number): { r: number; p: number } {
  const [lo, hi] = REDZONE_TD_VARIANCE_TO_MEAN
  const vm = (lo + hi) / 2
  return negBinParams(mean, mean * vm)
}

export type SevenMetricsInput = {
  sii?: { single: CubeCell; split: CubeCell }
  qptsr?: { quickPressure: CubeCell; checkdown: CubeCell }
  rls?: { onShell: CubeCell; otherShell: CubeCell }
  spese?: { betweenTwenties: readonly number[]; redZone: readonly number[] }
  tor?: { lightBox: CubeCell; loadedBox: CubeCell }
  sva?: { plays: readonly { epa: number; leverage: number }[] }
  dwp?: { decisions: readonly { wpChosen: number; wpBest: number }[] }
}

export function sevenMetrics(cube: Cube, input: SevenMetricsInput): Record<string, number | null> {
  const gate = (key: string): boolean => "cell" in gateCell(cube, key)
  const out: Record<string, number | null> = {
    "GSE-SII": null,
    "GSE-QPTSR": null,
    "GSE-RLS": null,
    "GSE-SPESE": null,
    "GSE-TOR": null,
    "GSE-SVA": null,
    "GSE-DWP": null,
  }
  if (input.sii && gate("sii|single") && gate("sii|split")) {
    out["GSE-SII"] = computeGseSiiCell(input.sii.single, input.sii.split)
  }
  if (input.qptsr && gate("qptsr|quick") && gate("qptsr|checkdown")) {
    out["GSE-QPTSR"] = computeGseQptsrCell(input.qptsr.quickPressure, input.qptsr.checkdown)
  }
  if (input.rls && gate("rls|on") && gate("rls|other")) {
    out["GSE-RLS"] = computeGseRlsCell(input.rls.onShell, input.rls.otherShell)
  }
  if (input.tor && gate("tor|light") && gate("tor|loaded")) {
    out["GSE-TOR"] = computeGseTorCell(input.tor.lightBox, input.tor.loadedBox)
  }
  if (input.spese) {
    out["GSE-SPESE"] = computeGseSpeseCell(input.spese.betweenTwenties, input.spese.redZone)
  }
  if (input.sva) out["GSE-SVA"] = computeGseSva(input.sva.plays)
  if (input.dwp) out["GSE-DWP"] = computeGseDwpBleed(input.dwp.decisions)
  return out
}

export interface DerivedSevenMetrics2026Input {
  readonly qptsrPressuresByBucket?: Readonly<Record<PressureBucket, number>>
  readonly dwpDecision?: FourthDownDecision
  readonly siiInput?: {
    readonly cells: readonly SiiCell[]
    readonly flag: SiiFlag
    readonly marginalEpa?: number
    readonly minN?: number
  }
  readonly rlsTendency?: SeparationTendency
  readonly speseInput?: {
    readonly stEpa: number
    readonly stPlays: number
    readonly minPlays?: number
  }
  readonly torInput?: {
    readonly fumbles: number
    readonly lost: number
    readonly minFumbles?: number
    readonly leagueRate?: number
  }
}

/**
 * Evaluates the rich 2026 derived `MetricResult<T>` kernels from `gse-proprietary-seven.ts`
 * (NGS 2026 receiving separation tendencies, FTN 2026 scheme x box EPA lift, pressure buckets,
 * special-teams EPA, and fumble lost regret) alongside the cell-based simulator.
 */
export function evaluateDerivedSevenMetrics2026(
  input: DerivedSevenMetrics2026Input,
): Record<string, MetricResult<number | null>> {
  return {
    "GSE-QPTSR": computeGseQptsr({
      pressuresByBucket: input.qptsrPressuresByBucket ?? {
        immediate: 0,
        fast: 0,
        mid: 0,
        late: 0,
      },
    }),
    "GSE-DWP": computeGseDwp(input.dwpDecision ?? "go"),
    "GSE-SII": computeGseSii(
      input.siiInput ?? {
        cells: [],
        flag: "motion",
      },
    ),
    "GSE-RLS": computeGseRls({ tendency: input.rlsTendency }),
    "GSE-SPESE": computeGseSpese(
      input.speseInput ?? {
        stEpa: Number.NaN,
        stPlays: 0,
      },
    ),
    "GSE-TOR": computeGseTor(
      input.torInput ?? {
        fumbles: 0,
        lost: 0,
      },
    ),
  }
}


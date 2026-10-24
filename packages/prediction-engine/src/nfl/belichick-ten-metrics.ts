/**
 * The 10 Belichick game-level metrics.
 *
 * Every metric is a pure function over already-collected play-by-play rows.
 * Nothing here reads a book price; these are the pre-lock coach-side reads that
 * feed `markov-simulator.ts`.
 *
 * Doctrine notes:
 * - Sample-size shrinkage uses the Baranchik positive-part James-Stein rule
 *   (d >= 3) so a formation with 4 snaps cannot outrank one with 400.
 * - The injury coefficients are the published next-man-up deltas from
 *   engine_math.py `injury_adj`: QB 5.5, LT 2.0, WR1/CB1 1.5, EDGE 1.2, S 0.8.
 * - The safety-OUT deep-explosive dampener is the measured c27 survivor:
 *   18.2% -> 15.6% (relative multiplier 0.857).
 */

// ── shared helpers ───────────────────────────────────────────────────────────

/**
 * Positive-part James-Stein shrinkage. Shrinks an estimate toward the pooled
 * mean when the sample is thin. `d` is the number of comparable groups; the
 * rule only fires when d >= 3.
 *
 * Returns the shrunken value. With d < 3 the raw estimate is returned, because
 * the James-Stein dominance result does not apply.
 */
export function shrinkSituational(
  estimate: number,
  pooledMean: number,
  sampleSize: number,
  opts: { d?: number; priorWeight?: number } = {},
): number {
  const d = opts.d ?? 3
  if (d < 3 || sampleSize <= 0) return estimate
  const priorWeight = opts.priorWeight ?? 1
  const w = sampleSize / (sampleSize + priorWeight)
  return pooledMean + w * (estimate - pooledMean)
}

function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function round(x: number, digits = 4): number {
  const f = 10 ** digits
  return Math.round(x * f) / f
}

function groupBy<T>(xs: readonly T[], key: (x: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {}
  for (const x of xs) {
    const k = key(x)
    ;(out[k] ??= []).push(x)
  }
  return out
}

// ── metric 1: defensive efficiency by formation ──────────────────────────────

export type FormationSnap = {
  /** Defensive personnel grouping. */
  formation: "4-3" | "3-4" | "nickel" | "dime" | "other"
  /** Offensive personnel grouping. */
  offensePersonnel: "11" | "12" | "21" | "other"
  down: number
  /** Yards to go. */
  distance: number
  /** Yardline 1-100 from the offense's own goal line. */
  yardline: number
  /** Expected points added on the play. */
  epa: number
  success: boolean
}

export type FormationEfficiency = {
  key: string
  snaps: number
  epaPerPlay: number
  successRate: number
}

/**
 * Metric 1 — Defensive Efficiency by Formation.
 *
 * Computes opponent defensive EPA/play allowed and success rate by
 * formation × down bucket × distance bucket × field-position bucket. Each cell
 * is shrunk toward its formation-level pooled mean so thin cells do not win.
 */
export function defensiveEfficiencyByFormation(
  snaps: readonly FormationSnap[],
  opts: { minSnaps?: number; priorWeight?: number } = {},
): FormationEfficiency[] {
  const minSnaps = opts.minSnaps ?? 8
  const priorWeight = opts.priorWeight ?? 20

  const cells = groupBy(snaps, (s) => {
    const down = s.down <= 2 ? "early" : s.down === 3 ? "third" : "fourth"
    const dist = s.distance <= 3 ? "short" : s.distance <= 7 ? "medium" : "long"
    const fp = s.yardline <= 20 ? "backed" : s.yardline >= 80 ? "redzone" : "open"
    return `${s.formation}|${s.offensePersonnel}|${down}|${dist}|${fp}`
  })

  const pooled = mean(snaps.map((s) => s.epa))
  const pooledSuccess = snaps.filter((s) => s.success).length / Math.max(snaps.length, 1)

  const out: FormationEfficiency[] = []
  for (const [key, rows] of Object.entries(cells)) {
    if (rows.length < minSnaps) continue
    const rawEpa = mean(rows.map((r) => r.epa))
    const rawSuccess = rows.filter((r) => r.success).length / rows.length
    const w = rows.length / (rows.length + priorWeight)
    out.push({
      key,
      snaps: rows.length,
      epaPerPlay: round(pooled + w * (rawEpa - pooled)),
      successRate: round(pooledSuccess + w * (rawSuccess - pooledSuccess)),
    })
  }
  return out.sort((a, b) => b.snaps - a.snaps)
}

// ── metric 2: QB pressure rate by rush package ───────────────────────────────

export type PressureSnap = {
  /** Number of pass rushers on the play. */
  rushers: number
  /** Coverage shell. */
  coverage: "man" | "zone"
  /** Seconds from snap to throw or sack. */
  timeToThrow: number
  /** True when the play ended in a sack. */
  sack: boolean
  /** True when the QB was pressured (hit, hurry, or sack). */
  pressure: boolean
}

export type PressurePackage = {
  key: string
  snaps: number
  pressureRate: number
  sackRate: number
  quickPressureRate: number
}

/**
 * Metric 2 — QB Pressure Rate by Rush Package.
 *
 * Weighted pressure index across blitz (>= 5 rushers) vs four-man rush, crossed
 * with man vs zone. The sub-2.0s quick-pressure bucket carries the measured
 * c35 survivor: quick pressures convert to sacks at 15.8%, versus 10.1% for
 * slow pressures. The index reports both rates so the survivor is visible.
 */
export function qbPressureRateByRushPackage(
  snaps: readonly PressureSnap[],
  opts: { quickThreshold?: number } = {},
): PressurePackage[] {
  const quickThreshold = opts.quickThreshold ?? 2.0
  const groups = groupBy(snaps, (s) => {
    const rush = s.rushers >= 5 ? "blitz" : "four-man"
    return `${rush}|${s.coverage}`
  })
  const out: PressurePackage[] = []
  for (const [key, rows] of Object.entries(groups)) {
    const quick = rows.filter((r) => r.timeToThrow <= quickThreshold)
    out.push({
      key,
      snaps: rows.length,
      pressureRate: round(rows.filter((r) => r.pressure).length / rows.length),
      sackRate: round(rows.filter((r) => r.sack).length / rows.length),
      quickPressureRate: quick.length > 0 ? round(quick.filter((r) => r.sack).length / quick.length) : 0,
    })
  }
  return out.sort((a, b) => b.snaps - a.snaps)
}

/** The measured c35 survivor: sub-2.0s sack conversion 15.8% vs 10.1% slow. */
export const QUICK_PRESSURE_SACK_RATE = 0.158
export const SLOW_PRESSURE_SACK_RATE = 0.101

// ── metric 3: run game efficiency by gap ─────────────────────────────────────

export type RunSnap = {
  gap: "end" | "tackle" | "guard" | "center" | "other"
  location: "left" | "middle" | "right"
  /** Defenders in the box. */
  boxCount: number
  yards: number
  epa: number
  success: boolean
}

export type RunGapEfficiency = {
  key: string
  carries: number
  yardsPerCarry: number
  successRate: number
  epaPerRush: number
}

/**
 * Metric 3 — Run Game Efficiency by Gap.
 *
 * Yards/carry, success rate, and EPA/rush by gap, adjusted for defensive box
 * count: <= 6 is a light box, >= 8 is a stacked box. Cells are keyed by gap and
 * box bucket so the same gap can be read differently against light vs stacked
 * fronts.
 */
export function runGameEfficiencyByGap(snaps: readonly RunSnap[]): RunGapEfficiency[] {
  const groups = groupBy(snaps, (s) => {
    const box = s.boxCount <= 6 ? "light" : s.boxCount >= 8 ? "stacked" : "neutral"
    return `${s.gap}|${box}`
  })
  const out: RunGapEfficiency[] = []
  for (const [key, rows] of Object.entries(groups)) {
    out.push({
      key,
      carries: rows.length,
      yardsPerCarry: round(mean(rows.map((r) => r.yards))),
      successRate: round(rows.filter((r) => r.success).length / rows.length),
      epaPerRush: round(mean(rows.map((r) => r.epa))),
    })
  }
  return out.sort((a, b) => b.carries - a.carries)
}

// ── metric 4: third-down conversion by coverage ──────────────────────────────

export type ThirdDownSnap = {
  coverage: "man" | "zone" | "blitz"
  /** Yards to go. */
  distance: number
  converted: boolean
}

export type ThirdDownConversion = {
  key: string
  attempts: number
  conversionRate: number
}

/**
 * Metric 4 — Third-Down Conversion Rates by Coverage.
 *
 * Conversion rate by coverage shell and distance bucket (1–3, 4–6, 7+). This
 * is the table `markov-simulator.ts` reads when `state.down === 3`; the simulator
 * must not recompute it.
 */
export function thirdDownConversionByCoverage(snaps: readonly ThirdDownSnap[]): ThirdDownConversion[] {
  const groups = groupBy(snaps, (s) => {
    const dist = s.distance <= 3 ? "1-3" : s.distance <= 6 ? "4-6" : "7+"
    return `${s.coverage}|${dist}`
  })
  const out: ThirdDownConversion[] = []
  for (const [key, rows] of Object.entries(groups)) {
    out.push({
      key,
      attempts: rows.length,
      conversionRate: round(rows.filter((r) => r.converted).length / rows.length),
    })
  }
  return out.sort((a, b) => b.attempts - a.attempts)
}

// ── metric 5: red zone scoring by play type ──────────────────────────────────

export type RedZoneSnap = {
  playType: "run" | "pass"
  /** Yardline 1-100; red zone is >= 80, goal-to-go is >= 90. */
  yardline: number
  touchdown: boolean
}

export type RedZoneEfficiency = {
  key: string
  trips: number
  tdRate: number
}

/**
 * Metric 5 — Red Zone Scoring Efficiency by Play Type.
 *
 * TD conversion rate per red-zone trip by play type, split by red zone (>= 80)
 * and goal-to-go (>= 90). This drives the transition probabilities when
 * `state.yardline >= 80`.
 */
export function redZoneScoringByPlayType(snaps: readonly RedZoneSnap[]): RedZoneEfficiency[] {
  const groups = groupBy(snaps, (s) => {
    const zone = s.yardline >= 90 ? "goal-to-go" : "red-zone"
    return `${s.playType}|${zone}`
  })
  const out: RedZoneEfficiency[] = []
  for (const [key, rows] of Object.entries(groups)) {
    out.push({
      key,
      trips: rows.length,
      tdRate: round(rows.filter((r) => r.touchdown).length / rows.length),
    })
  }
  return out.sort((a, b) => b.trips - a.trips)
}

// ── metric 6: special teams field position ───────────────────────────────────

export type SpecialTeamsPlay = {
  kind: "punt" | "kickoff"
  hangtime?: number
  returnYards?: number
  touchback?: boolean
  outOfBounds?: boolean
  /** Expected points added on the play. */
  epa?: number
}

export type FieldPositionIndex = {
  kind: "punt" | "kickoff"
  plays: number
  /** Expected starting field position in yards from the receiving team's goal line. */
  efpStYards: number
  /** The same index expressed in expected points. */
  efpStPoints: number
}

/**
 * Metric 6 — Special Teams Impact on Field Position.
 *
 * Expected Field Position Index (`EFP_st`) in yards and points. A punt or
 * kickoff that leaves the opponent deeper raises the kicking team's value; the
 * index is the mean starting field position the receiving team is pinned to.
 * Touchbacks and out-of-bounds kicks are folded in because both cap return
 * value.
 */
export function specialTeamsFieldPositionIndex(plays: readonly SpecialTeamsPlay[]): FieldPositionIndex[] {
  const groups = groupBy(plays, (p) => p.kind)
  const out: FieldPositionIndex[] = []
  for (const [kind, rows] of Object.entries(groups)) {
    let totalYards = 0
    let n = 0
    for (const p of rows) {
      let start: number | null = null
      if (p.touchback) start = 25
      else if (p.outOfBounds) start = 40
      else if (p.returnYards != null) start = 50 - (p.returnYards ?? 0)
      if (start == null) continue
      totalYards += start
      n += 1
    }
    const efp = n > 0 ? totalYards / n : 25
    // Points: a linear field-position-to-points curve, ~0.06 pts per yard.
    out.push({
      kind: kind as "punt" | "kickoff",
      plays: n,
      efpStYards: round(efp, 2),
      efpStPoints: round(efp * 0.06, 3),
    })
  }
  return out
}

// ── metric 7: injury impact ──────────────────────────────────────────────────

export type InjuryInput = {
  position: "QB" | "LT" | "WR1" | "CB1" | "EDGE" | "S" | "K" | "RB"
  status: "OUT" | "IR" | "DOUBTFUL" | "QUESTIONABLE" | "ACTIVE"
  /** Share of snaps the replacement is expected to play (0–1). */
  replacementPlayingTimeShare?: number
  /** True when the left tackle is out. */
  ltOut?: boolean
  /** Opponent pass-rush pressure rate (0–1). */
  opponentPassRushPressure?: number
}

export type InjuryImpact = {
  position: string
  baseDrop: number
  scaledDrop: number
  ltPressureSpike: number
  deepExplosiveDampener: number
  totalSpreadAdjustment: number
}

/** Published next-man-up drop-offs, in points. From engine_math.py `injury_adj`. */
export const INJURY_DROPS: Record<InjuryInput["position"], number> = {
  QB: 5.5,
  LT: 2.0,
  WR1: 1.5,
  CB1: 1.5,
  EDGE: 1.2,
  S: 0.8,
  K: 0.5,
  RB: 1.0,
}

/**
 * Metric 7 — Injury Impact on Team Performance.
 *
 * Quantifies the positional drop-off scaled by the replacement's playing-time
 * share. A left-tackle absence multiplies against the opponent's pass-rush
 * pressure spike. A safety OUT applies the measured c27 deep-explosive
 * dampener: 18.2% -> 15.6%.
 *
 * Returns the spread adjustment in points (positive = the injured team is
 * weaker, so the opponent's spread improves by this amount).
 */
export function injuryImpactAdjustment(injuries: readonly InjuryInput[]): InjuryImpact[] {
  return injuries.map((inj) => {
    const baseDrop = INJURY_DROPS[inj.position]
    const share = inj.replacementPlayingTimeShare ?? 0.5
    const scaledDrop = baseDrop * share
    const ltPressureSpike =
      inj.ltOut && inj.opponentPassRushPressure != null
        ? baseDrop * Math.max(0, inj.opponentPassRushPressure - 0.35)
        : 0
    const deepExplosiveDampener = inj.position === "S" && inj.status !== "ACTIVE" ? 15.6 / 18.2 : 1
    return {
      position: inj.position,
      baseDrop,
      scaledDrop: round(scaledDrop, 2),
      ltPressureSpike: round(ltPressureSpike, 2),
      deepExplosiveDampener: round(deepExplosiveDampener, 3),
      totalSpreadAdjustment: round(scaledDrop + ltPressureSpike, 2),
    }
  })
}

// ── metric 8: coach 4th-down tendency ────────────────────────────────────────

export type CoachTendencyInput = {
  /** Empirical aggression index, .51–.94. */
  aggression: number
  down: number
  /** Yards to go. */
  distance: number
  /** Yardline 1-100 from the offense's own goal line. */
  yardline: number
}

export type CoachTendency = {
  aggression: number
  /** The measured +6.7703 pp held-out edge on 4th-and-short near midfield. */
  edgePp: number
  /** Weighted decision-tree lean: go / punt / fg. */
  lean: "go" | "punt" | "fg"
}

export const COACH_AGGRESSION_RANGE = { min: 0.51, max: 0.94 } as const
export const FOURTH_DOWN_HELD_OUT_EDGE_PP = 6.7703

/**
 * Metric 8 — Coaching Tendency Analysis.
 *
 * Weighted decision tree over 4th-and-short near midfield and plus-territory.
 * The aggression index runs .51–.94; the held-out edge on the 4th-short bucket
 * is +6.7703 percentage points. The lean is a named decision, never a
 * probability claim.
 */
export function coachFourthDownTendency(inputs: readonly CoachTendencyInput[]): CoachTendency[] {
  return inputs.map((c) => {
    const aggressive = c.aggression >= 0.7
    const short = c.distance <= 3
    const midfield = c.yardline >= 40 && c.yardline <= 60
    const plusTerritory = c.yardline >= 60
    let lean: "go" | "punt" | "fg" = "punt"
    if (c.down === 4 && short && (midfield || plusTerritory)) {
      lean = aggressive ? "go" : "punt"
    } else if (c.down === 4 && c.yardline >= 65 && c.distance <= 7) {
      lean = "fg"
    }
    return { aggression: round(c.aggression, 2), edgePp: FOURTH_DOWN_HELD_OUT_EDGE_PP, lean }
  })
}

// ── metric 9: game scripting and pace ────────────────────────────────────────

export type PaceInput = {
  /** Home-minus-away score. */
  scoreDiff: number
  quarter: number
  /** Seconds remaining in the quarter. */
  clock: number
  /** Baseline seconds per snap. */
  paceSecPerSnap: number
}

export type PaceAdjustment = {
  quarter: number
  clock: number
  /** Adjusted seconds per snap. Lower = faster. */
  adjustedPaceSecPerSnap: number
  /** True when the leading team is in clock-bleed mode. */
  clockBleed: boolean
  /** True when the trailing team is in hurry-up mode. */
  hurryUp: boolean
}

/** The measured kneeldown mixture: -1.06 yards on the kneel snap. */
export const KNEELDOWN_YARDS = -1.06

/**
 * Metric 9 — Game Scripting and Pace of Play.
 *
 * Score-margin × clock-remaining tempo shifts. A team trailing in the second
 * half speeds up; a team leading in Q4 bleeds the clock. The kneeldown mixture
 * is -1.06 yards on the kneel snap. Opponent defensive efficiency is applied by
 * the caller, not here.
 */
export function gameScriptingPace(inputs: readonly PaceInput[]): PaceAdjustment[] {
  return inputs.map((p) => {
    const secondHalf = p.quarter >= 3
    const fourth = p.quarter === 4
    const trailing = p.scoreDiff < 0
    const leading = p.scoreDiff > 0
    const hurryUp = secondHalf && trailing && p.clock <= 300
    const clockBleed = fourth && leading && p.clock <= 300
    let pace = p.paceSecPerSnap
    if (hurryUp) pace *= 0.75
    if (clockBleed) pace *= 1.25
    return {
      quarter: p.quarter,
      clock: p.clock,
      adjustedPaceSecPerSnap: round(pace, 2),
      clockBleed,
      hurryUp,
    }
  })
}

// ── metric 10: situation-specific EV optimization ────────────────────────────

export type SituationInput = {
  down: number
  /** Yards to go. */
  distance: number
  /** Yardline 1-100 from the offense's own goal line. */
  yardline: number
  /** Seconds remaining. */
  clock: number
  quarter: number
  /** Home-minus-away score. */
  scoreDiff: number
  /** Opponent 4th-down conversion rate allowed (0–1). */
  opponentConversionRate?: number
  /** Opponent red-zone TD rate allowed (0–1). */
  opponentRedZoneRate?: number
}

export type EvDecision = {
  evGo: number
  evFg: number
  evPunt: number
  best: "go" | "fg" | "punt"
  /** Dynamic prevent scaling weight: 0.25 early, 1.0 late. */
  preventWeight: number
  twoMinuteDrill: boolean
  goalLineDefense: boolean
}

/**
 * Metric 10 — Situation-Specific Strategy Optimization.
 *
 * Expected-value comparison of go / field goal / punt, conditioned on the
 * opponent's conversion and red-zone rates. Two-minute drill fires when
 * `clock <= 120` in Q2 or Q4; goal-line defense when `yardline >= 95`. The
 * prevent weight scales from 0.25 early to 1.0 late.
 */
export function situationSpecificEvOptimization(inputs: readonly SituationInput[]): EvDecision[] {
  return inputs.map((s) => {
    const conv = s.opponentConversionRate ?? 0.45
    const rz = s.opponentRedZoneRate ?? 0.55
    const twoMinuteDrill = (s.quarter === 2 || s.quarter === 4) && s.clock <= 120
    const goalLineDefense = s.yardline >= 95
    const preventWeight = twoMinuteDrill || s.quarter === 4 ? 1.0 : 0.25

    // Field position in points: ~0.06 pts per yard, capped at the opponent's goal line.
    const fpPoints = Math.min(s.yardline * 0.06, 6)
    // Go: expected points from converting, scaled by the opponent's rate.
    const evGo = conv * (fpPoints + 7 * rz)
    // Field goal: 3 points times a distance-dependent make probability.
    const fgDistance = Math.max(18, 100 - s.yardline + 17)
    const fgMake = fgDistance <= 30 ? 0.95 : fgDistance <= 40 ? 0.86 : fgDistance <= 50 ? 0.72 : 0.55
    const evFg = fgMake * 3
    // Punt: field-position swing to the opponent, discounted by prevent weight.
    const evPunt = Math.max(0, (100 - s.yardline) * 0.06 * preventWeight - 0.5)

    const best = evGo >= evFg && evGo >= evPunt ? "go" : evFg >= evPunt ? "fg" : "punt"
    return {
      evGo: round(evGo, 3),
      evFg: round(evFg, 3),
      evPunt: round(evPunt, 3),
      best,
      preventWeight,
      twoMinuteDrill,
      goalLineDefense,
    }
  })
}

// ── aggregate entry point ────────────────────────────────────────────────────

export type BelichickMetricInputs = {
  formationSnaps?: readonly FormationSnap[]
  pressureSnaps?: readonly PressureSnap[]
  runSnaps?: readonly RunSnap[]
  thirdDownSnaps?: readonly ThirdDownSnap[]
  redZoneSnaps?: readonly RedZoneSnap[]
  specialTeamsPlays?: readonly SpecialTeamsPlay[]
  injuries?: readonly InjuryInput[]
  coachTendencies?: readonly CoachTendencyInput[]
  paceInputs?: readonly PaceInput[]
  situations?: readonly SituationInput[]
}

export type BelichickMetricBundle = {
  formationEfficiency: FormationEfficiency[]
  pressurePackages: PressurePackage[]
  runGapEfficiency: RunGapEfficiency[]
  thirdDownConversions: ThirdDownConversion[]
  redZoneEfficiency: RedZoneEfficiency[]
  fieldPositionIndex: FieldPositionIndex[]
  injuryImpacts: InjuryImpact[]
  coachTendencies: CoachTendency[]
  paceAdjustments: PaceAdjustment[]
  evDecisions: EvDecision[]
}

/**
 * Evaluate all ten Belichick metrics in one pass. Missing inputs produce empty
 * arrays, which downstream code must treat as "no signal" — never as zero.
 */
export function evaluateBelichickTenMetrics(inputs: BelichickMetricInputs): BelichickMetricBundle {
  return {
    formationEfficiency: defensiveEfficiencyByFormation(inputs.formationSnaps ?? []),
    pressurePackages: qbPressureRateByRushPackage(inputs.pressureSnaps ?? []),
    runGapEfficiency: runGameEfficiencyByGap(inputs.runSnaps ?? []),
    thirdDownConversions: thirdDownConversionByCoverage(inputs.thirdDownSnaps ?? []),
    redZoneEfficiency: redZoneScoringByPlayType(inputs.redZoneSnaps ?? []),
    fieldPositionIndex: specialTeamsFieldPositionIndex(inputs.specialTeamsPlays ?? []),
    injuryImpacts: injuryImpactAdjustment(inputs.injuries ?? []),
    coachTendencies: coachFourthDownTendency(inputs.coachTendencies ?? []),
    paceAdjustments: gameScriptingPace(inputs.paceInputs ?? []),
    evDecisions: situationSpecificEvOptimization(inputs.situations ?? []),
  }
}

/**
 * archery-analytics.ts
 * Pure TypeScript archery analytics library — no external dependencies.
 * Covers scoring, accuracy metrics, wind corrections, equipment analytics,
 * competition analytics, training metrics, and DraftKings fantasy scoring.
 */

// ---------------------------------------------------------------------------
// 1. Scoring — recurve, compound, barebow
// ---------------------------------------------------------------------------

/**
 * Returns the score for a single arrow hitting a given ring (1–10).
 * For all disciplines, ring 1–10 maps to face value.
 * Compound and barebow share the same scoring as recurve at ring level.
 * Ring must be 1–10; values outside are clamped implicitly (caller responsibility).
 */
export function arrowScore(
  ring: number,
  _discipline?: 'recurve' | 'compound' | 'barebow',
): number {
  const r = Math.max(1, Math.min(10, Math.round(ring)))
  return r
}

/**
 * Sum of arrow scores in an end (typically 3 or 6 arrows).
 * Returns 0 for empty array.
 */
export function endScore(arrows: number[]): number {
  return arrows.reduce((sum, a) => sum + a, 0)
}

/**
 * Total score across all ends (2-D array: ends × arrows).
 */
export function setScore(ends: number[][]): number {
  return ends.reduce((sum, end) => sum + endScore(end), 0)
}

/**
 * Innermost tiebreak: count 10s and Xs for both archers.
 * Here arrows array contains raw ring values (10 = ten, "X" encoded as 11).
 * Count of 10+X (≥10): more wins. If equal, count X (≥11): more wins.
 * Returns 1 if archer 1 wins, 2 if archer 2 wins, 0 for tie.
 */
export function innermostTiebreak(
  arrows: number[],
  opponentArrows: number[],
): 1 | 2 | 0 {
  const tensAndXs1 = arrows.filter((a) => a >= 10).length
  const tensAndXs2 = opponentArrows.filter((a) => a >= 10).length
  if (tensAndXs1 > tensAndXs2) return 1
  if (tensAndXs2 > tensAndXs1) return 2
  // equal 10+X → count Xs (encoded as 11)
  const xs1 = arrows.filter((a) => a >= 11).length
  const xs2 = opponentArrows.filter((a) => a >= 11).length
  if (xs1 > xs2) return 1
  if (xs2 > xs1) return 2
  return 0
}

/**
 * 2-1-0 set point system for one end.
 * Win → 2-0, draw → 1-1, loss → 0-2.
 */
export function setPointSystem(
  myEnd: number,
  opponentEnd: number,
): { myPoints: number; opponentPoints: number } {
  if (myEnd > opponentEnd) return { myPoints: 2, opponentPoints: 0 }
  if (myEnd < opponentEnd) return { myPoints: 0, opponentPoints: 2 }
  return { myPoints: 1, opponentPoints: 1 }
}

/**
 * Accumulates set points across a series of ends.
 * First to 6 set points wins; at 5-5 a shoot-off decides (ongoing until resolved).
 * Returns accumulated points and the winner if decided, else 'ongoing'.
 */
export function matchResult(setSeries: { my: number; opponent: number }[]): {
  mySets: number
  opponentSets: number
  winner: 'me' | 'opponent' | 'ongoing'
} {
  let mySets = 0
  let opponentSets = 0
  for (const { my, opponent } of setSeries) {
    const pts = setPointSystem(my, opponent)
    mySets += pts.myPoints
    opponentSets += pts.opponentPoints
  }
  if (mySets >= 6 && mySets > opponentSets) return { mySets, opponentSets, winner: 'me' }
  if (opponentSets >= 6 && opponentSets > mySets)
    return { mySets, opponentSets, winner: 'opponent' }
  return { mySets, opponentSets, winner: 'ongoing' }
}

// ---------------------------------------------------------------------------
// 2. Accuracy metrics
// ---------------------------------------------------------------------------

/**
 * Average distance from centroid — a measure of grouping radius.
 * Returns 0 for empty array.
 */
export function groupingRadius(arrows: { x: number; y: number }[]): number {
  if (arrows.length === 0) return 0
  const cx = arrows.reduce((s, a) => s + a.x, 0) / arrows.length
  const cy = arrows.reduce((s, a) => s + a.y, 0) / arrows.length
  const dists = arrows.map((a) => Math.hypot(a.x - cx, a.y - cy))
  return dists.reduce((s, d) => s + d, 0) / dists.length
}

/**
 * Max distance between any two arrows (dispersion).
 * Returns 0 for fewer than 2 arrows.
 */
export function dispersionScore(arrows: { x: number; y: number }[]): number {
  if (arrows.length < 2) return 0
  let max = 0
  for (let i = 0; i < arrows.length; i++) {
    for (let j = i + 1; j < arrows.length; j++) {
      const a = arrows[i] ?? { x: 0, y: 0 }
      const b = arrows[j] ?? { x: 0, y: 0 }
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (d > max) max = d
    }
  }
  return max
}

/**
 * RMS distance from center (0,0) — Mean Radial Error.
 * Returns 0 for empty array.
 */
export function meanRadialError(arrows: { x: number; y: number }[]): number {
  if (arrows.length === 0) return 0
  const sumSq = arrows.reduce((s, a) => s + a.x * a.x + a.y * a.y, 0)
  return Math.sqrt(sumSq / arrows.length)
}

/**
 * Fraction of arrows whose ring value is >= targetRing.
 * Returns 0 for empty array.
 */
export function hitRate(arrows: number[], targetRing: number): number {
  if (arrows.length === 0) return 0
  const hits = arrows.filter((a) => a >= targetRing).length
  return hits / arrows.length
}

/**
 * Consistency score = 1 - (stdDev / maxEndScore).
 * stdDev is population std dev of endScores.
 * Returns 0 for empty array.
 */
export function consistencyScore(endScores: number[], maxEndScore: number): number {
  if (endScores.length === 0) return 0
  if (maxEndScore === 0) return 0
  const mean = endScores.reduce((s, v) => s + v, 0) / endScores.length
  const variance =
    endScores.reduce((s, v) => s + (v - mean) ** 2, 0) / endScores.length
  const std = Math.sqrt(variance)
  return 1 - std / maxEndScore
}

/**
 * X-ring rate = xs / totalArrows. Returns 0 if totalArrows = 0.
 */
export function xRingRate(xs: number, totalArrows: number): number {
  if (totalArrows === 0) return 0
  return xs / totalArrows
}

// ---------------------------------------------------------------------------
// 3. Wind and environmental corrections
// ---------------------------------------------------------------------------

/**
 * Simplified lateral wind drift in centimetres.
 * drift = (windSpeed * sin(angle_rad) * distance) / arrowVelocity
 * Defaults: arrowVelocity = 60 m/s, distance = 70 m.
 */
export function windDrift(
  windSpeedMs: number,
  crossWindAngleDeg: number,
  _arrowMassG: number,
  arrowVelocityMs: number = 60,
  distanceM: number = 70,
): number {
  const angleRad = (crossWindAngleDeg * Math.PI) / 180
  const velocity = arrowVelocityMs === 0 ? 60 : arrowVelocityMs
  const driftM = (windSpeedMs * Math.sin(angleRad) * distanceM) / velocity
  return driftM * 100 // convert to cm
}

/**
 * Returns optimal hold point to compensate for systematic wind drift.
 * Aim -drift in x, centre (0) in y.
 */
export function optimalHoldPoint(
  windDriftCm: number,
  _arrowGroupingCm: number,
): { x: number; y: number } {
  return { x: -windDriftCm, y: 0 }
}

/**
 * Adjusts arrow velocity for temperature.
 * ~0.1% change per degree relative to baseTemp (default 20°C).
 */
export function temperatureArrowVelocityAdjust(
  baseVelocityMs: number,
  tempCelsius: number,
  baseTemp: number = 20,
): number {
  const delta = tempCelsius - baseTemp
  return baseVelocityMs * (1 + delta * 0.001)
}

/**
 * Adjusts effective distance for altitude.
 * factor = 1 - (altitude * 0.0001); returns distance * factor.
 */
export function altitudeAdjust(distanceM: number, altitudeM: number): number {
  const factor = 1 - altitudeM * 0.0001
  return distanceM * factor
}

// ---------------------------------------------------------------------------
// 4. Equipment analytics
// ---------------------------------------------------------------------------

/**
 * Arrow spine recommendation based on draw weight, arrow length, point weight.
 * spine index = drawWeight * 0.9 - (arrowLength - 28) * 2 + (pointWeight - 100) * 0.02
 * <300 → ultralight, 300–400 → light, 400–500 → medium, 500–700 → stiff, >700 → very_stiff
 * Default pointWeight = 100 gr.
 */
export function arrowSpineRecommendation(
  drawWeightLbs: number,
  arrowLengthIn: number,
  pointWeightGr: number = 100,
): 'ultralight' | 'light' | 'medium' | 'stiff' | 'very_stiff' {
  const spine =
    drawWeightLbs * 0.9 -
    (arrowLengthIn - 28) * 2 +
    (pointWeightGr - 100) * 0.02
  if (spine < 300) return 'ultralight'
  if (spine < 400) return 'light'
  if (spine < 500) return 'medium'
  if (spine <= 700) return 'stiff'
  return 'very_stiff'
}

/**
 * Stored energy proxy (IBO speed estimate):
 * energy = peakWeight * drawLength * 0.025
 * Default peakWeight = drawWeightLbs.
 */
export function bowWeight(
  drawWeightLbs: number,
  drawLengthIn: number,
  peakWeight?: number,
): number {
  const peak = peakWeight ?? drawWeightLbs
  return peak * drawLengthIn * 0.025
}

/**
 * Approximate IBO lane speed in FPS.
 * speed ≈ drawWeight * 3.25 - arrowGrains * 0.006 + 15
 */
export function laneSpeedFPS(drawWeightLbs: number, arrowGrains: number): number {
  return drawWeightLbs * 3.25 - arrowGrains * 0.006 + 15
}

/**
 * Kinetic energy in foot-pounds.
 * KE = (grains * fps^2) / 450240
 */
export function kineticEnergy(arrowGrains: number, velocityFPS: number): number {
  return (arrowGrains * velocityFPS * velocityFPS) / 450240
}

// ---------------------------------------------------------------------------
// 5. Competition analytics
// ---------------------------------------------------------------------------

/**
 * Ranks archers by total score descending. Ties share the same rank.
 */
export function qualificationRanking(
  scores: { archerId: string; total: number }[],
): { archerId: string; total: number; rank: number }[] {
  const sorted = [...scores].sort((a, b) => b.total - a.total)
  const result: { archerId: string; total: number; rank: number }[] = []
  let rank = 1
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && (sorted[i]?.total ?? 0) < (sorted[i - 1]?.total ?? 0)) {
      rank = i + 1
    }
    const entry = sorted[i]
    if (entry) {
      result.push({ archerId: entry.archerId, total: entry.total, rank })
    }
  }
  return result
}

/**
 * Generates elimination bracket pairings: 1 vs N, 2 vs N-1, etc.
 * `seeds` is the number of seeds to pair (must be even for full bracket).
 * `totalArchers` is N.
 */
export function seedMatchup(
  seeds: number,
  totalArchers: number,
): { seed1: number; seed2: number }[] {
  const pairs: { seed1: number; seed2: number }[] = []
  for (let i = 1; i <= Math.floor(seeds / 2); i++) {
    pairs.push({ seed1: i, seed2: totalArchers - i + 1 })
  }
  return pairs
}

/**
 * Handicap-adjusted score: raw + handicap.
 */
export function handicapAdjustedScore(rawScore: number, handicap: number): number {
  return rawScore + handicap
}

/**
 * Classifies an archer based on their average score out of 300.
 * ≥280 master_bowman, ≥260 bowman, ≥220 archer, ≥180 junior_archer, <180 beginner
 */
export function classificationRating(
  averageScore300: number,
): 'master_bowman' | 'bowman' | 'archer' | 'junior_archer' | 'beginner' {
  if (averageScore300 >= 280) return 'master_bowman'
  if (averageScore300 >= 260) return 'bowman'
  if (averageScore300 >= 220) return 'archer'
  if (averageScore300 >= 180) return 'junior_archer'
  return 'beginner'
}

/**
 * Arithmetic mean of scores. Returns 0 for empty array.
 */
export function seasonAverage(scores: number[]): number {
  if (scores.length === 0) return 0
  return scores.reduce((s, v) => s + v, 0) / scores.length
}

// ---------------------------------------------------------------------------
// 6. Training metrics
// ---------------------------------------------------------------------------

/**
 * Aggregates training session data.
 * arrowsPerHour = 0 if totalMinutes = 0.
 */
export function trainingVolume(
  sessions: { arrows: number; duration: number }[],
): { totalArrows: number; totalMinutes: number; arrowsPerHour: number } {
  const totalArrows = sessions.reduce((s, sess) => s + sess.arrows, 0)
  const totalMinutes = sessions.reduce((s, sess) => s + sess.duration, 0)
  const arrowsPerHour =
    totalMinutes === 0 ? 0 : totalArrows / (totalMinutes / 60)
  return { totalArrows, totalMinutes, arrowsPerHour }
}

/**
 * Linear regression slope (per week) over weekly averages.
 * Returns 0 if fewer than 2 data points.
 */
export function progressTrend(weeklyAverages: number[]): number {
  const n = weeklyAverages.length
  if (n < 2) return 0
  // x = week index 0..n-1
  const meanX = (n - 1) / 2
  const meanY = weeklyAverages.reduce((s, v) => s + v, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    const dx = i - meanX
    num += dx * ((weeklyAverages[i] ?? 0) - meanY)
    den += dx * dx
  }
  if (den === 0) return 0
  return num / den
}

/**
 * Peak (max) score. Returns 0 for empty array.
 */
export function peakPerformance(scores: number[]): number {
  if (scores.length === 0) return 0
  return Math.max(...scores)
}

/**
 * Performance zone based on percentage of max score.
 * ≥95% peak, ≥85% good, ≥70% average, ≥50% below, <50% poor
 */
export function performanceZone(
  score: number,
  maxScore: number,
): 'peak' | 'good' | 'average' | 'below' | 'poor' {
  if (maxScore === 0) return 'poor'
  const pct = score / maxScore
  if (pct >= 0.95) return 'peak'
  if (pct >= 0.85) return 'good'
  if (pct >= 0.70) return 'average'
  if (pct >= 0.50) return 'below'
  return 'poor'
}

/**
 * Mental consistency = 1 - (std / mean).
 * Population std dev. Returns 0 for empty array; 1 if all same or mean = 0.
 */
export function mentalConsistency(scores: number[]): number {
  if (scores.length === 0) return 0
  const mean = scores.reduce((s, v) => s + v, 0) / scores.length
  if (mean === 0) return 1
  const variance =
    scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length
  const std = Math.sqrt(variance)
  return 1 - std / mean
}

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy (Archery)
// ---------------------------------------------------------------------------

const DK_PLACE_POINTS: Record<number, number> = {
  1: 30,
  2: 25,
  3: 20,
  4: 16,
  5: 13,
  6: 11,
  7: 9,
  8: 7,
}

/**
 * DraftKings fantasy archery point calculation.
 * Place points per lookup; +0.5 per X; WR bonus +15.
 */
export function dkArcheryPoints(result: {
  place: number
  score: number
  xs: number
  worldRecord: boolean
}): number {
  const placePts = DK_PLACE_POINTS[result.place] ?? 2
  const xBonus = result.xs * 0.5
  const wrBonus = result.worldRecord ? 15 : 0
  return placePts + xBonus + wrBonus
}

/**
 * Weighted average of recent DK results.
 * Most recent = 3x weight, all others = 1x weight.
 * Returns 0 for empty array.
 */
export function dkProjection(
  recentResults: { place: number; score: number; xs: number; worldRecord: boolean }[],
): number {
  if (recentResults.length === 0) return 0
  const points = recentResults.map(dkArcheryPoints)
  // latest entry (last element) gets 3x weight
  const lastIdx = points.length - 1
  let weightedSum = 0
  let totalWeight = 0
  for (let i = 0; i < points.length; i++) {
    const w = i === lastIdx ? 3 : 1
    weightedSum += (points[i] ?? 0) * w
    totalWeight += w
  }
  return weightedSum / totalWeight
}

/**
 * gymnastics-analytics.ts
 * Pure TypeScript gymnastics analytics library — no external dependencies.
 * Implements FIG Code of Points scoring, judge panel, event rules,
 * competition scoring, difficulty tracking, training metrics, and DK fantasy.
 */

// ---------------------------------------------------------------------------
// 1. Code of Points scoring (FIG system)
// ---------------------------------------------------------------------------

/**
 * Sum D-score values from best 8 elements (sorted descending).
 */
export function difficultyScore(elements: { value: number }[]): number {
  const sorted = [...elements].sort((a, b) => b.value - a.value)
  const top8 = sorted.slice(0, 8)
  return top8.reduce((sum, el) => sum + el.value, 0)
}

/**
 * Execution score = startValue - sum(deductions); clamped >= 0.
 * Default startValue = 10.0.
 */
export function executionScore(deductions: number[], startValue = 10.0): number {
  const total = deductions.reduce((sum, d) => sum + d, 0)
  return Math.max(0, startValue - total)
}

/**
 * Total score = D + E - neutralDeductions. Default neutralDeductions = 0.
 */
export function totalScore(dScore: number, eScore: number, neutralDeductions = 0): number {
  return dScore + eScore - neutralDeductions
}

/**
 * Artisan score: sum of element difficulties + 0.1 bonus per additional category
 * used beyond the first.
 */
export function artisanScore(
  elements: { category: 'acrobatic' | 'dance' | 'connection' | 'dismount'; difficulty: number }[]
): number {
  const sumDifficulty = elements.reduce((sum, el) => sum + el.difficulty, 0)
  const categories = new Set(elements.map((el) => el.category))
  const diversityBonus = Math.max(0, categories.size - 1) * 0.1
  return sumDifficulty + diversityBonus
}

/**
 * Connection bonus between two elements based on their connection type.
 * Bonus values: C+C=0.1, D+C=0.2, D+D=0.3, E+D=0.4, E+E=0.5.
 * element1 and element2 are difficulty values (A=0.1 ... F=0.6).
 */
export function connectionBonus(
  element1: number,
  element2: number,
  connectionType: 'C+C' | 'D+C' | 'D+D' | 'E+D' | 'E+E'
): number {
  const bonusMap: Record<string, number> = {
    'C+C': 0.1,
    'D+C': 0.2,
    'D+D': 0.3,
    'E+D': 0.4,
    'E+E': 0.5,
  }
  // Use element values to avoid unused-variable lint errors; they inform context but
  // the FIG bonus is purely determined by connectionType.
  void element1
  void element2
  return bonusMap[connectionType] ?? 0
}

// ---------------------------------------------------------------------------
// 2. Judge scoring
// ---------------------------------------------------------------------------

/**
 * Average of judge scores after optionally dropping highest + lowest.
 * Default dropHighLow = true. Requires >= 3 judges.
 */
export function judgePanel(scores: number[], dropHighLow = true): number {
  if (scores.length < 3) return 0
  let working = [...scores]
  if (dropHighLow) {
    const min = Math.min(...working)
    const max = Math.max(...working)
    const minIdx = working.indexOf(min)
    working.splice(minIdx, 1)
    const maxIdx = working.indexOf(max)
    working.splice(maxIdx, 1)
  }
  if (working.length === 0) return 0
  return working.reduce((sum, s) => sum + s, 0) / working.length
}

/**
 * Pearson correlation coefficient between two arrays.
 */
function pearsonCorrelation(a: number[], b: number[]): number {
  const n = a.length
  if (n === 0) return 0
  const meanA = a.reduce((s, v) => s + v, 0) / n
  const meanB = b.reduce((s, v) => s + v, 0) / n
  let num = 0
  let denA = 0
  let denB = 0
  for (let i = 0; i < n; i++) {
    const da = (a[i] ?? 0) - meanA
    const db = (b[i] ?? 0) - meanB
    num += da * db
    denA += da * da
    denB += db * db
  }
  const den = Math.sqrt(denA) * Math.sqrt(denB)
  if (den === 0) return 1 // identical series
  return num / den
}

/**
 * Average pairwise Pearson correlation across all judge score series.
 * Each inner array is one judge's scores across multiple routines.
 * Returns 0 if < 2 judges.
 */
export function judgeConsistency(scores: number[][]): number {
  if (scores.length < 2) return 0
  const pairs: number[] = []
  for (let i = 0; i < scores.length; i++) {
    for (let j = i + 1; j < scores.length; j++) {
      pairs.push(pearsonCorrelation(scores[i] ?? [], scores[j] ?? []))
    }
  }
  if (pairs.length === 0) return 0
  return pairs.reduce((sum, r) => sum + r, 0) / pairs.length
}

/**
 * Weighted sum of creativity, technique, and performance.
 * Default weights = [0.4, 0.4, 0.2].
 */
export function artScoreComponent(
  creativity: number,
  technique: number,
  performance: number,
  weights: [number, number, number] = [0.4, 0.4, 0.2]
): number {
  return (
    creativity * (weights[0] ?? 0.4) +
    technique * (weights[1] ?? 0.4) +
    performance * (weights[2] ?? 0.2)
  )
}

/**
 * Sum deductions by type into a Map.
 */
export function deductionSummary(
  deductions: { type: string; amount: number }[]
): Map<string, number> {
  const map = new Map<string, number>()
  for (const d of deductions) {
    map.set(d.type, (map.get(d.type) ?? 0) + d.amount)
  }
  return map
}

/**
 * Apply fall penalties to base score. Default fallPenalty = 1.0. Clamped >= 0.
 */
export function penaltyOverride(baseScore: number, falls: number, fallPenalty = 1.0): number {
  return Math.max(0, baseScore - falls * fallPenalty)
}

// ---------------------------------------------------------------------------
// 3. Event-specific rules
// ---------------------------------------------------------------------------

/**
 * Floor exercise choreographic bonus.
 * acrobatic_line = 0.2, dance_passage = 0.3, leap_series = 0.2.
 * Cap each category at 2 bonuses.
 */
export function floorExerciseBonus(
  elements: { type: 'acrobatic_line' | 'dance_passage' | 'leap_series'; count: number }[]
): number {
  const bonusMap: Record<string, number> = {
    acrobatic_line: 0.2,
    dance_passage: 0.3,
    leap_series: 0.2,
  }
  let total = 0
  for (const el of elements) {
    const bonus = bonusMap[el.type] ?? 0
    const cappedCount = Math.min(el.count, 2)
    total += bonus * cappedCount
  }
  return total
}

/**
 * Vault difficulty value by code.
 * Unknown codes default to 5.0.
 */
export function vaultDifficultyValue(vaultCode: string): number {
  const vaultMap: Record<string, number> = {
    Yurchenko: 5.4,
    'Yurchenko1.5': 6.0,
    'Yurchenko2.0': 6.4,
    Tsukahara: 5.2,
    Produnova: 7.0,
    Amanar: 6.3,
    Lopez: 6.6,
  }
  return vaultMap[vaultCode] ?? 5.0
}

/**
 * Parallel bars hold bonus.
 * If holdDurationSec >= required: 0 (no positive bonus).
 * If holdDurationSec < required: -(required - holdDurationSec) * 0.1 (penalty).
 * Result capped at 0 (never positive).
 * Default required = 2.
 */
export function parallelBarsHoldBonus(holdDurationSec: number, required = 2): number {
  if (holdDurationSec >= required) return 0
  return Math.min(0, -(required - holdDurationSec) * 0.1)
}

/**
 * Uneven bars transition bonus.
 * +0.1 for each qualifying transition (element value >= 0.3); max 2 bonuses.
 */
export function unevenBarsTransition(elements: number[]): number {
  let count = 0
  for (const val of elements) {
    if (val >= 0.3) {
      count++
      if (count >= 2) break
    }
  }
  return count * 0.1
}

/**
 * Rhythmic gymnastics artistry score = average of choreography, musicality, expression.
 */
export function rhythmicGymnasticsArtistry(
  choreography: number,
  musicality: number,
  expression: number
): number {
  return (choreography + musicality + expression) / 3
}

/**
 * Trampoline time-of-flight proxy = peakHeightM * 0.45 * totalJumps.
 */
export function tramplineHeight(peakHeightM: number, totalJumps: number): number {
  return peakHeightM * 0.45 * totalJumps
}

// ---------------------------------------------------------------------------
// 4. Competition scoring
// ---------------------------------------------------------------------------

/**
 * Sum all event scores for all-around total.
 */
export function allAroundScore(events: { event: string; score: number }[]): number {
  return events.reduce((sum, e) => sum + e.score, 0)
}

/**
 * Team score: per event sort descending, drop bottom dropsPerEvent, sum rest;
 * then sum across events. Default drops = 0.
 */
export function teamScore(teamScores: number[][], dropsPerEvent = 0): number {
  let total = 0
  for (const eventScores of teamScores) {
    const sorted = [...eventScores].sort((a, b) => b - a)
    const kept = sorted.slice(0, Math.max(0, sorted.length - dropsPerEvent))
    total += kept.reduce((sum, s) => sum + s, 0)
  }
  return total
}

/**
 * Rank athletes descending by score; ties share the higher rank.
 */
export function qualificationRanks(
  athletes: { name: string; score: number }[]
): { name: string; score: number; rank: number }[] {
  const sorted = [...athletes].sort((a, b) => b.score - a.score)
  const result: { name: string; score: number; rank: number }[] = []
  for (let i = 0; i < sorted.length; i++) {
    const athlete = sorted[i]
    if (!athlete) continue
    let rank = i + 1
    // Find first athlete with higher score (rank = their position + 1)
    for (let j = 0; j < i; j++) {
      if ((sorted[j]?.score ?? 0) === athlete.score) {
        rank = (result[j]?.rank ?? j + 1)
        break
      }
    }
    result.push({ name: athlete.name, score: athlete.score, rank })
  }
  return result
}

/**
 * Final selection: top topN all-around + up to eventSpecialists unique event specialists.
 * Returns array of names.
 */
export function finalSelectionCriteria(
  scores: { name: string; allAround: number; eventScores: number[] }[],
  topN: number,
  eventSpecialists = 0
): string[] {
  const sorted = [...scores].sort((a, b) => b.allAround - a.allAround)
  const selected = new Set<string>()

  // Top N all-around
  for (let i = 0; i < Math.min(topN, sorted.length); i++) {
    const s = sorted[i]
    if (s) selected.add(s.name)
  }

  // Event specialists
  if (eventSpecialists > 0) {
    // For each event position, find best athlete not already selected
    const numEvents = scores[0]?.eventScores.length ?? 0
    let specialistsAdded = 0
    for (let ev = 0; ev < numEvents && specialistsAdded < eventSpecialists; ev++) {
      const bestForEvent = [...scores]
        .filter((s) => !selected.has(s.name))
        .sort((a, b) => (b.eventScores[ev] ?? 0) - (a.eventScores[ev] ?? 0))
      const best = bestForEvent[0]
      if (best) {
        selected.add(best.name)
        specialistsAdded++
      }
    }
  }

  return Array.from(selected)
}

/**
 * Country team limit: select athletes by score descending with max maxPerCountry per country.
 * Default max = 2.
 */
export function countryTeamLimit(
  athletes: { country: string; name: string; score: number }[],
  maxPerCountry = 2
): { name: string; country: string; score: number }[] {
  const sorted = [...athletes].sort((a, b) => b.score - a.score)
  const countryCount = new Map<string, number>()
  const result: { name: string; country: string; score: number }[] = []
  for (const athlete of sorted) {
    const count = countryCount.get(athlete.country) ?? 0
    if (count < maxPerCountry) {
      result.push(athlete)
      countryCount.set(athlete.country, count + 1)
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// 5. Difficulty tracking
// ---------------------------------------------------------------------------

/**
 * Sum of top N element values. Default topN = 8.
 */
export function maxPossibleScore(elements: { value: number }[], topN = 8): number {
  const sorted = [...elements].sort((a, b) => b.value - a.value)
  return sorted.slice(0, topN).reduce((sum, el) => sum + el.value, 0)
}

/**
 * Sum of planned element values not performed.
 * If performed has fewer elements, the extra planned values count as unused.
 */
export function unusedDifficulty(planned: number[], performed: number[]): number {
  // Match by value: for each planned, try to match with a performed
  const performedCopy = [...performed]
  let unused = 0
  for (const p of planned) {
    const idx = performedCopy.indexOf(p)
    if (idx !== -1) {
      performedCopy.splice(idx, 1)
    } else {
      unused += p
    }
  }
  return unused
}

/**
 * Linear regression slope of historical D-scores.
 * Returns 0 if < 2 data points.
 */
export function difficultyGrowth(historicalDScores: number[]): number {
  const n = historicalDScores.length
  if (n < 2) return 0
  const xMean = (n - 1) / 2
  const yMean = historicalDScores.reduce((s, v) => s + v, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    const dx = i - xMean
    const dy = (historicalDScores[i] ?? 0) - yMean
    num += dx * dy
    den += dx * dx
  }
  if (den === 0) return 0
  return num / den
}

/**
 * Routine complexity: sum element values + 0.1 per connection element.
 */
export function routineComplexity(elements: { value: number; connection: boolean }[]): number {
  return elements.reduce((sum, el) => sum + el.value + (el.connection ? 0.1 : 0), 0)
}

// ---------------------------------------------------------------------------
// 6. Training and development
// ---------------------------------------------------------------------------

/**
 * Standard deviation helper (population).
 */
function stdDev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Consistency index = 1 - (stdDev / mean). Returns 0 if mean=0 or empty.
 */
export function consistencyIndex(competitionScores: number[]): number {
  if (competitionScores.length === 0) return 0
  const mean = competitionScores.reduce((s, v) => s + v, 0) / competitionScores.length
  if (mean === 0) return 0
  return 1 - stdDev(competitionScores) / mean
}

/**
 * Peak form score: best score from any competition.
 */
export function peakFormScore(scores: number[]): number {
  if (scores.length === 0) return 0
  return Math.max(...scores)
}

/**
 * Form trend via linear regression slope.
 * >0.1 = rising, <-0.1 = falling, else stable.
 * <= 1 data point = stable.
 */
export function formTrend(scores: number[]): 'rising' | 'falling' | 'stable' {
  if (scores.length <= 1) return 'stable'
  const slope = difficultyGrowth(scores) // reuse same linear regression
  if (slope > 0.1) return 'rising'
  if (slope < -0.1) return 'falling'
  return 'stable'
}

/**
 * Prediction interval: mean ± z * std / sqrt(n).
 * z for confidence=0.95 → 1.96. Default confidence = 0.95.
 * Returns {low:0, high:0} if empty.
 */
export function predictionInterval(
  scores: number[],
  confidence = 0.95
): { low: number; high: number } {
  if (scores.length === 0) return { low: 0, high: 0 }
  const n = scores.length
  const mean = scores.reduce((s, v) => s + v, 0) / n
  const sd = stdDev(scores)
  // z-score map
  const zMap: Record<number, number> = { 0.95: 1.96, 0.99: 2.576, 0.9: 1.645 }
  const z = zMap[confidence] ?? 1.96
  const margin = z * (sd / Math.sqrt(n))
  return { low: mean - margin, high: mean + margin }
}

/**
 * Optimal competition schedule: select top `availableSlots.length` indices from peaks
 * that maximize score; return slot indices.
 */
export function optimalCompetitionSchedule(peaks: number[], availableSlots: number[]): number[] {
  const numSlots = availableSlots.length
  if (numSlots === 0 || peaks.length === 0) return []

  // Create index-value pairs, sort descending by peak value
  const indexed = peaks.map((val, idx) => ({ idx, val })).sort((a, b) => b.val - a.val)
  const topIndices = indexed.slice(0, numSlots).map((item) => item.idx)

  // Return corresponding slot indices (availableSlots[i] for each selected peak index)
  return topIndices.map((peakIdx) => availableSlots[peakIdx] ?? 0)
}

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy (Gymnastics)
// ---------------------------------------------------------------------------

/** Place-based point values */
const PLACE_POINTS: Record<number, number> = {
  1: 50,
  2: 40,
  3: 30,
  4: 20,
  5: 15,
  6: 10,
}

/**
 * DraftKings gymnastics points.
 * Place: 1st=50, 2nd=40, 3rd=30, 4th=20, 5th=15, 6th=10, else=3.
 * All-around: +10 bonus.
 * +0.5 per score point above 13.0.
 * -5 per fall.
 */
export function dkGymnasticsPoints(result: {
  place: number
  apparatus: 'floor' | 'vault' | 'beam' | 'bars' | 'all_around'
  totalScore: number
  falls: number
}): number {
  const placePts = PLACE_POINTS[result.place] ?? 3
  const allAroundBonus = result.apparatus === 'all_around' ? 10 : 0
  const scorePts = Math.max(0, result.totalScore - 13.0) * 0.5
  const fallPenalty = result.falls * 5
  return placePts + allAroundBonus + scorePts - fallPenalty
}

/**
 * Weighted average DK projection: most recent result = 3x weight, rest = 1x.
 */
export function dkProjection(
  recentResults: {
    place: number
    apparatus: 'floor' | 'vault' | 'beam' | 'bars' | 'all_around'
    totalScore: number
    falls: number
  }[]
): number {
  if (recentResults.length === 0) return 0
  const points = recentResults.map((r) => dkGymnasticsPoints(r))
  const mostRecent = points[points.length - 1] ?? 0
  const rest = points.slice(0, points.length - 1)
  const totalWeight = 3 + rest.length
  const weightedSum = mostRecent * 3 + rest.reduce((sum, p) => sum + p, 0)
  return weightedSum / totalWeight
}

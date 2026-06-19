/**
 * Player comparison and ranking utilities — pure, zero dependencies.
 *
 * Percentile rankings, cosine similarity, composite scoring, VORP, draft value,
 * optimal lineup building, and head-to-head comparison for sports player analytics.
 * Pure analytics — does not affect model weights or published picks.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type StatCategory =
  | 'passing'
  | 'rushing'
  | 'receiving'
  | 'defense'
  | 'kicking'
  | 'general'

export interface PlayerStat {
  statName: string
  value: number
  category: StatCategory
  weight?: number // importance weight for composite scoring; default 1
}

export interface PlayerProfile {
  playerId: string
  name: string
  position: string
  team: string
  stats: PlayerStat[]
  age?: number
  experience?: number // years in league
}

export interface ComparisonResult {
  playerAId: string
  playerBId: string
  winner: string // playerId of winner, or 'tie'
  categoryWinners: Record<StatCategory, string> // category → playerId winner
  overallScoreA: number // 0-100
  overallScoreB: number // 0-100
  advantages: Array<{
    playerId: string
    statName: string
    diff: number
    pctDiff: number // percentage difference
  }>
  similarity: number // 0-1 cosine similarity of stat vectors
}

export interface PercentileRanking {
  playerId: string
  statName: string
  value: number
  percentile: number // 0-100; what % of players this player is better than
  zScore: number
  tier: 'elite' | 'above-average' | 'average' | 'below-average' | 'poor'
}

export interface RankingResult {
  playerId: string
  name: string
  position: string
  compositeScore: number // 0-100
  rank: number // 1-indexed
  rankDelta?: number // vs previous ranking (positive = improved)
  percentileOverall: number
}

export interface SimilarPlayer {
  playerId: string
  name: string
  similarity: number // 0-1
  positionMatch: boolean
  keySharedStrengths: string[] // stat names where both are above average
}

export interface H2HRecord {
  stat: string
  valueA: number
  valueB: number
  advantage: 'A' | 'B' | 'tie'
  pctDiff: number
}

// ── Internal helpers ───────────────────────────────────────────────────────

/** Clamp a value to [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Collect all unique stat names across a pool of players */
function allStatNames(players: PlayerProfile[]): string[] {
  const names = new Set<string>()
  for (const p of players) {
    for (const s of p.stats) {
      names.add(s.statName)
    }
  }
  return Array.from(names)
}

/** Get a player's value for a given stat; undefined if not present */
function statValue(player: PlayerProfile, statName: string): number | undefined {
  return player.stats.find((s) => s.statName === statName)?.value
}

/** Compute mean of a numeric array */
function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Compute population standard deviation */
function stdDev(values: number[], avg?: number): number {
  if (values.length === 0) return 0
  const m = avg ?? mean(values)
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

// ── Core functions ─────────────────────────────────────────────────────────

/**
 * Normalize player stats to a 0-100 scale relative to a pool.
 *
 * For each player: find their value for statName; min-max normalize to 0-100 across the pool.
 * Players without the stat get 0 (not counted in min/max).
 * If all same value: all get 50.
 */
export function normalizeStats(
  players: PlayerProfile[],
  statName: string
): Map<string, number> {
  const result = new Map<string, number>()

  // Collect players that have this stat
  const withStat: Array<{ playerId: string; value: number }> = []
  for (const p of players) {
    const val = statValue(p, statName)
    if (val !== undefined) {
      withStat.push({ playerId: p.playerId, value: val })
    }
  }

  if (withStat.length === 0) {
    for (const p of players) {
      result.set(p.playerId, 0)
    }
    return result
  }

  const values = withStat.map((x) => x.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const allSame = minVal === maxVal

  // Players without the stat get 0
  const hasStatIds = new Set(withStat.map((x) => x.playerId))
  for (const p of players) {
    if (!hasStatIds.has(p.playerId)) {
      result.set(p.playerId, 0)
    }
  }

  for (const { playerId, value } of withStat) {
    if (allSame) {
      result.set(playerId, 50)
    } else {
      const normalized = ((value - minVal) / (maxVal - minVal)) * 100
      result.set(playerId, clamp(normalized, 0, 100))
    }
  }

  return result
}

/**
 * Composite score for a player (0-100).
 *
 * For each stat the player has:
 *   normalize it across all players
 *   multiply by (weightOverrides[statName] ?? stat.weight ?? 1)
 * Weighted average of all normalized values.
 * Clamp to [0, 100].
 */
export function compositeScore(
  player: PlayerProfile,
  allPlayers: PlayerProfile[],
  weightOverrides?: Record<string, number>
): number {
  if (player.stats.length === 0) return 0

  let weightedSum = 0
  let totalWeight = 0

  for (const stat of player.stats) {
    const normalizedMap = normalizeStats(allPlayers, stat.statName)
    const normalizedVal = normalizedMap.get(player.playerId) ?? 0
    const w = weightOverrides?.[stat.statName] ?? stat.weight ?? 1
    weightedSum += normalizedVal * w
    totalWeight += w
  }

  if (totalWeight === 0) return 0
  return clamp(weightedSum / totalWeight, 0, 100)
}

/**
 * Rank all players by composite score.
 *
 * Sort by compositeScore descending; assign rank 1,2,3...
 * percentileOverall = (total - rank) / (total - 1) * 100
 */
export function rankPlayers(
  players: PlayerProfile[],
  weightOverrides?: Record<string, number>
): RankingResult[] {
  if (players.length === 0) return []

  const scored = players.map((p) => ({
    playerId: p.playerId,
    name: p.name,
    position: p.position,
    compositeScore: compositeScore(p, players, weightOverrides),
  }))

  scored.sort((a, b) => b.compositeScore - a.compositeScore)

  const total = scored.length

  return scored.map((s, i) => {
    const rank = i + 1
    const percentileOverall =
      total === 1 ? 100 : ((total - rank) / (total - 1)) * 100
    return {
      playerId: s.playerId,
      name: s.name,
      position: s.position,
      compositeScore: s.compositeScore,
      rank,
      percentileOverall,
    }
  })
}

/**
 * Cosine similarity between two stat vectors.
 *
 * Build vectors using union of all stat names; 0 for missing.
 * dot product / (|A| * |B|); 0 if either magnitude is 0.
 */
export function statVectorSimilarity(
  playerA: PlayerProfile,
  playerB: PlayerProfile
): number {
  const names = new Set<string>()
  for (const s of playerA.stats) names.add(s.statName)
  for (const s of playerB.stats) names.add(s.statName)

  const statNames = Array.from(names)
  if (statNames.length === 0) return 0

  const vecA: number[] = []
  const vecB: number[] = []

  for (const name of statNames) {
    vecA.push(statValue(playerA, name) ?? 0)
    vecB.push(statValue(playerB, name) ?? 0)
  }

  let dot = 0
  let magA = 0
  let magB = 0

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i] ?? 0
    const b = vecB[i] ?? 0
    dot += a * b
    magA += a ** 2
    magB += b ** 2
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  if (denom === 0) return 0
  return clamp(dot / denom, 0, 1)
}

/**
 * Compare two players directly.
 *
 * For each shared stat: determine who has higher value.
 * advantages: stats where abs diff > 0; sorted by abs diff descending; top 5.
 * similarity: cosine similarity of stat vectors (match on statName).
 * categoryWinners: for each category, count shared stats won; tie if equal.
 * overallScoreA/B: compositeScore with [playerA, playerB] as the pool (or allPlayers).
 * winner: higher overallScore; 'tie' if equal.
 */
export function comparePlayers(
  playerA: PlayerProfile,
  playerB: PlayerProfile,
  allPlayers?: PlayerProfile[]
): ComparisonResult {
  const pool = allPlayers ?? [playerA, playerB]

  const overallScoreA = compositeScore(playerA, pool)
  const overallScoreB = compositeScore(playerB, pool)

  const similarity = statVectorSimilarity(playerA, playerB)

  // Find shared stats
  const statsA = new Map(playerA.stats.map((s) => [s.statName, s]))
  const statsB = new Map(playerB.stats.map((s) => [s.statName, s]))
  const sharedNames = Array.from(statsA.keys()).filter((n) => statsB.has(n))

  // Advantages: all stats where abs diff > 0
  const advantages: ComparisonResult['advantages'] = []
  for (const name of sharedNames) {
    const sa = statsA.get(name)!
    const sb = statsB.get(name)!
    const diff = sa.value - sb.value
    if (Math.abs(diff) > 0) {
      const baseVal = sb.value !== 0 ? Math.abs(sb.value) : 1
      const pctDiff = (diff / baseVal) * 100
      advantages.push({
        playerId: diff > 0 ? playerA.playerId : playerB.playerId,
        statName: name,
        diff: Math.abs(diff),
        pctDiff: Math.abs(pctDiff),
      })
    }
  }

  advantages.sort((a, b) => b.diff - a.diff)
  const topAdvantages = advantages.slice(0, 5)

  // Category winners
  const categories: StatCategory[] = [
    'passing',
    'rushing',
    'receiving',
    'defense',
    'kicking',
    'general',
  ]
  const categoryWinners: Record<StatCategory, string> = {
    passing: 'tie',
    rushing: 'tie',
    receiving: 'tie',
    defense: 'tie',
    kicking: 'tie',
    general: 'tie',
  }

  for (const cat of categories) {
    let winsA = 0
    let winsB = 0
    for (const name of sharedNames) {
      const sa = statsA.get(name)!
      const sb = statsB.get(name)!
      if (sa.category !== cat) continue
      if (sa.value > sb.value) winsA++
      else if (sb.value > sa.value) winsB++
    }
    if (winsA > winsB) categoryWinners[cat] = playerA.playerId
    else if (winsB > winsA) categoryWinners[cat] = playerB.playerId
    else categoryWinners[cat] = 'tie'
  }

  // Overall winner
  let winner: string
  if (overallScoreA > overallScoreB) winner = playerA.playerId
  else if (overallScoreB > overallScoreA) winner = playerB.playerId
  else winner = 'tie'

  return {
    playerAId: playerA.playerId,
    playerBId: playerB.playerId,
    winner,
    categoryWinners,
    overallScoreA,
    overallScoreB,
    advantages: topAdvantages,
    similarity,
  }
}

/**
 * Percentile ranking for a specific stat.
 *
 * Returns null if player or stat not found.
 * percentile: proportion of other players with LOWER value × 100.
 * tier: elite >= 90th; above-average 70-89th; average 40-69th; below-average 20-39th; poor < 20th.
 * zScore: (value - mean) / stdDev; 0 if stdDev = 0.
 */
export function percentileRanking(
  players: PlayerProfile[],
  playerId: string,
  statName: string
): PercentileRanking | null {
  const player = players.find((p) => p.playerId === playerId)
  if (!player) return null

  const playerStatEntry = player.stats.find((s) => s.statName === statName)
  if (!playerStatEntry) return null

  const value = playerStatEntry.value

  // Collect all values for this stat
  const allValues: number[] = []
  for (const p of players) {
    const v = statValue(p, statName)
    if (v !== undefined) allValues.push(v)
  }

  const lowerCount = allValues.filter((v) => v < value).length
  const total = allValues.length
  const percentile = total <= 1 ? 100 : (lowerCount / (total - 1)) * 100

  const avg = mean(allValues)
  const sd = stdDev(allValues, avg)
  const zScore = sd === 0 ? 0 : (value - avg) / sd

  let tier: PercentileRanking['tier']
  if (percentile >= 90) tier = 'elite'
  else if (percentile >= 70) tier = 'above-average'
  else if (percentile >= 40) tier = 'average'
  else if (percentile >= 20) tier = 'below-average'
  else tier = 'poor'

  return {
    playerId,
    statName,
    value,
    percentile,
    zScore,
    tier,
  }
}

/**
 * Find similar players (by stat vector cosine similarity).
 *
 * Cosine similarity of stat vectors (match on statName; 0 for missing).
 * keySharedStrengths: stats where both players are above the pool average.
 * Sort by similarity desc; return top N; exclude the target player itself.
 */
export function findSimilarPlayers(
  target: PlayerProfile,
  pool: PlayerProfile[],
  options?: {
    topN?: number
    samePosition?: boolean
    minSimilarity?: number
  }
): SimilarPlayer[] {
  const topN = options?.topN ?? 5
  const samePosition = options?.samePosition ?? false
  const minSimilarity = options?.minSimilarity ?? 0

  // Compute pool average per stat
  const poolAverages = new Map<string, number>()
  const statNames = allStatNames(pool)
  for (const name of statNames) {
    const vals: number[] = []
    for (const p of pool) {
      const v = statValue(p, name)
      if (v !== undefined) vals.push(v)
    }
    if (vals.length > 0) poolAverages.set(name, mean(vals))
  }

  const candidates = pool.filter(
    (p) =>
      p.playerId !== target.playerId &&
      (!samePosition || p.position === target.position)
  )

  const results: SimilarPlayer[] = candidates.map((candidate) => {
    const similarity = statVectorSimilarity(target, candidate)

    // Key shared strengths: stats where both are above pool average
    const keySharedStrengths: string[] = []
    for (const targetStat of target.stats) {
      const name = targetStat.statName
      const candVal = statValue(candidate, name)
      if (candVal === undefined) continue
      const poolAvg = poolAverages.get(name) ?? 0
      if (targetStat.value > poolAvg && candVal > poolAvg) {
        keySharedStrengths.push(name)
      }
    }

    return {
      playerId: candidate.playerId,
      name: candidate.name,
      similarity,
      positionMatch: candidate.position === target.position,
      keySharedStrengths,
    }
  })

  return results
    .filter((r) => r.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN)
}

/**
 * Age curve adjustment (for projections).
 *
 * Returns a multiplier (0.8 to 1.1) representing peak performance relative to age.
 * QB peak: 29-33; RB peak: 23-26; WR peak: 26-29; OL/DL peak: 28-32.
 * General peak: 26-29 for skill positions; 28-32 for OL/DL.
 */
export function ageCurveAdjustment(age: number, position: string): number {
  const pos = position.toUpperCase()

  let peakStart: number
  let peakEnd: number

  if (pos === 'QB') {
    peakStart = 29
    peakEnd = 33
  } else if (pos === 'RB') {
    peakStart = 23
    peakEnd = 26
  } else if (pos === 'WR' || pos === 'TE') {
    peakStart = 26
    peakEnd = 29
  } else if (pos === 'OL' || pos === 'DL' || pos === 'OT' || pos === 'DT' || pos === 'DE' || pos === 'G' || pos === 'C') {
    peakStart = 28
    peakEnd = 32
  } else {
    // Default skill position peak
    peakStart = 26
    peakEnd = 29
  }

  if (age >= peakStart && age <= peakEnd) {
    return 1.1 // at peak
  } else if (age < peakStart) {
    const ratio = age / peakStart
    return Math.max(0.8, Math.pow(ratio, 0.5))
  } else {
    // past peak
    const ratio = peakEnd / age
    return Math.max(0.75, Math.pow(ratio, 0.8))
  }
}

/**
 * Head-to-head historical comparison.
 *
 * For all stats shared by both players.
 * Sort by abs(pctDiff) descending (biggest gaps first).
 */
export function h2hComparison(
  playerA: PlayerProfile,
  playerB: PlayerProfile
): H2HRecord[] {
  const statsA = new Map(playerA.stats.map((s) => [s.statName, s]))
  const statsB = new Map(playerB.stats.map((s) => [s.statName, s]))
  const sharedNames = Array.from(statsA.keys()).filter((n) => statsB.has(n))

  const records: H2HRecord[] = sharedNames.map((name) => {
    const sa = statsA.get(name)!
    const sb = statsB.get(name)!
    const valueA = sa.value
    const valueB = sb.value

    let advantage: 'A' | 'B' | 'tie'
    if (valueA > valueB) advantage = 'A'
    else if (valueB > valueA) advantage = 'B'
    else advantage = 'tie'

    const baseVal = valueB !== 0 ? Math.abs(valueB) : valueA !== 0 ? Math.abs(valueA) : 1
    const pctDiff = ((valueA - valueB) / baseVal) * 100

    return {
      stat: name,
      valueA,
      valueB,
      advantage,
      pctDiff,
    }
  })

  records.sort((a, b) => Math.abs(b.pctDiff) - Math.abs(a.pctDiff))
  return records
}

/**
 * Position-adjusted ranking (rank only within position group).
 *
 * Filter to players at this position, then rank.
 */
export function positionRanking(
  players: PlayerProfile[],
  position: string,
  weightOverrides?: Record<string, number>
): RankingResult[] {
  const filtered = players.filter((p) => p.position === position)
  return rankPlayers(filtered, weightOverrides)
}

/**
 * Tier classification.
 *
 * Based on percentileOverall from rankPlayers:
 * franchise: top 10%; starter: 10-50%; depth: 50-80%; practice-squad: bottom 20%.
 */
export function playerTier(
  player: PlayerProfile,
  allPlayers: PlayerProfile[],
  weightOverrides?: Record<string, number>
): 'franchise' | 'starter' | 'depth' | 'practice-squad' {
  const rankings = rankPlayers(allPlayers, weightOverrides)
  const playerRanking = rankings.find((r) => r.playerId === player.playerId)

  if (!playerRanking) return 'practice-squad'

  const percentile = playerRanking.percentileOverall
  if (percentile >= 90) return 'franchise'
  if (percentile >= 50) return 'starter'
  if (percentile >= 20) return 'depth'
  return 'practice-squad'
}

/**
 * Statistical dominance (how many stats does player A win vs B).
 *
 * shared: number of stats both have.
 * playerA: number of shared stats where A > B.
 * playerB: number of shared stats where B > A.
 */
export function dominanceScore(
  playerA: PlayerProfile,
  playerB: PlayerProfile
): { playerA: number; playerB: number; shared: number } {
  const statsA = new Map(playerA.stats.map((s) => [s.statName, s]))
  const statsB = new Map(playerB.stats.map((s) => [s.statName, s]))
  const sharedNames = Array.from(statsA.keys()).filter((n) => statsB.has(n))

  let winsA = 0
  let winsB = 0

  for (const name of sharedNames) {
    const sa = statsA.get(name)!
    const sb = statsB.get(name)!
    if (sa.value > sb.value) winsA++
    else if (sb.value > sa.value) winsB++
  }

  return {
    playerA: winsA,
    playerB: winsB,
    shared: sharedNames.length,
  }
}

/**
 * Performance trend (comparing two snapshots of the same player).
 *
 * 'flat' if abs(pctChange) < 0.02 (2%).
 */
export function performanceTrend(
  current: PlayerProfile,
  previous: PlayerProfile
): Array<{
  statName: string
  change: number
  pctChange: number
  trending: 'up' | 'down' | 'flat'
}> {
  const currentStats = new Map(current.stats.map((s) => [s.statName, s]))
  const previousStats = new Map(previous.stats.map((s) => [s.statName, s]))
  const allNames = new Set([...currentStats.keys(), ...previousStats.keys()])

  const results: Array<{
    statName: string
    change: number
    pctChange: number
    trending: 'up' | 'down' | 'flat'
  }> = []

  for (const name of allNames) {
    const curr = currentStats.get(name)
    const prev = previousStats.get(name)
    if (!curr || !prev) continue

    const change = curr.value - prev.value
    const baseVal = prev.value !== 0 ? Math.abs(prev.value) : 1
    const pctChange = change / baseVal

    let trending: 'up' | 'down' | 'flat'
    if (Math.abs(pctChange) < 0.02) trending = 'flat'
    else if (pctChange > 0) trending = 'up'
    else trending = 'down'

    results.push({ statName: name, change, pctChange, trending })
  }

  return results
}

/**
 * Best XI / lineup suggestion.
 *
 * For each position slot, greedily pick highest compositeScore player.
 * No player selected twice.
 */
export function buildOptimalLineup(
  players: PlayerProfile[],
  requirements: Record<string, number>,
  weightOverrides?: Record<string, number>
): PlayerProfile[] {
  // Pre-compute composite scores for all players
  const scores = new Map<string, number>()
  for (const p of players) {
    scores.set(p.playerId, compositeScore(p, players, weightOverrides))
  }

  const selected = new Set<string>()
  const lineup: PlayerProfile[] = []

  for (const [position, count] of Object.entries(requirements)) {
    const eligible = players
      .filter((p) => p.position === position && !selected.has(p.playerId))
      .sort((a, b) => (scores.get(b.playerId) ?? 0) - (scores.get(a.playerId) ?? 0))

    for (let i = 0; i < count && i < eligible.length; i++) {
      const player = eligible[i]
      if (player === undefined) continue
      lineup.push(player)
      selected.add(player.playerId)
    }
  }

  return lineup
}

/**
 * Value over replacement player (VORP).
 *
 * compositeScore(player) - compositeScore of the player at the replacement percentile
 * among players at the same position.
 */
export function vorp(
  player: PlayerProfile,
  allPlayers: PlayerProfile[],
  replacementPercentile = 50
): number {
  const samePosition = allPlayers.filter((p) => p.position === player.position)
  if (samePosition.length === 0) return 0

  const rankings = rankPlayers(samePosition)
  const playerScore = compositeScore(player, allPlayers)

  // Find the replacement player at the given percentile
  // Sort by compositeScore ascending to find player at replacementPercentile
  const sorted = [...rankings].sort((a, b) => a.compositeScore - b.compositeScore)
  const idx = Math.round(((replacementPercentile / 100) * (sorted.length - 1)))
  const safeIdx = Math.min(Math.max(idx, 0), sorted.length - 1)
  const replacementEntry = sorted[safeIdx]
  const replacementScore = replacementEntry?.compositeScore ?? 0

  // Re-normalize the replacement score into allPlayers context
  const replacementPlayer = allPlayers.find((p) => p.playerId === replacementEntry?.playerId)
  const replacementScoreInContext = replacementPlayer
    ? compositeScore(replacementPlayer, allPlayers)
    : replacementScore

  return playerScore - replacementScoreInContext
}

/**
 * Draft value score (fantasy context: value over average at position).
 *
 * compositeScore * positionScarcity[position] * ageCurveAdjustment(age, position).
 * Default scarcity 1.0 for positions not in the map.
 */
export function draftValue(
  player: PlayerProfile,
  allPlayers: PlayerProfile[],
  positionScarcity: Record<string, number>
): number {
  const score = compositeScore(player, allPlayers)
  const scarcity = positionScarcity[player.position] ?? 1.0
  const ageMult =
    player.age !== undefined ? ageCurveAdjustment(player.age, player.position) : 1.0
  return score * scarcity * ageMult
}

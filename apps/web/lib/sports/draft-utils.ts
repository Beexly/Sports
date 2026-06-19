/**
 * Pure TypeScript draft analysis utilities for fantasy sports.
 * No external dependencies. No `any`.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PickPosition = 'early' | 'mid' | 'late'

export interface DraftPick {
  overall: number
  round: number
  pickInRound: number
  teamSize: number
}

export interface TradeAsset {
  type: 'player' | 'pick'
  playerId?: string
  playerValue?: number
  pick?: DraftPick
  pickValue?: number
}

export interface TradeEvaluation {
  teamAValue: number
  teamBValue: number
  winner: 'teamA' | 'teamB' | 'fair'
  imbalancePercent: number
  recommendation: 'accept' | 'decline' | 'negotiate'
  summary: string
}

export interface DraftSlot {
  overall: number
  round: number
  pickInRound: number
  estimatedValue: number
  position: PickPosition
}

export interface PositionalScarcity {
  position: string
  averageADP: number
  scarcityScore: number
  draftRound: number
}

export interface DraftBoard {
  picks: DraftSlot[]
  teamSize: number
  rounds: number
}

// ─── Core Pick Conversion ─────────────────────────────────────────────────────

/**
 * Convert an overall pick number to round + pick-in-round (snake draft).
 * Odd rounds go 1..teamSize; even rounds go teamSize..1.
 */
export function overallToPick(overall: number, teamSize: number): DraftPick {
  const round = Math.ceil(overall / teamSize)
  const indexInRound = (overall - 1) % teamSize // 0-based index within the round
  const pickInRound =
    round % 2 === 0
      ? teamSize - indexInRound // even round: reversed
      : indexInRound + 1 // odd round: forward
  return { overall, round, pickInRound, teamSize }
}

/**
 * Convert round + pickInRound to overall pick (snake draft).
 * Even rounds: the k-th pick in the round corresponds to position (teamSize - k + 1) logically,
 * so overall = (round-1)*teamSize + (teamSize - pickInRound + 1).
 * Odd rounds: overall = (round-1)*teamSize + pickInRound.
 */
export function pickToOverall(round: number, pickInRound: number, teamSize: number): number {
  if (round % 2 === 0) {
    return (round - 1) * teamSize + (teamSize - pickInRound + 1)
  }
  return (round - 1) * teamSize + pickInRound
}

// ─── Pick Position Label ──────────────────────────────────────────────────────

/** Return 'early', 'mid', or 'late' based on pick position within the round. */
export function pickPosition(pick: DraftPick): PickPosition {
  const { pickInRound, teamSize } = pick
  if (pickInRound <= teamSize / 3) return 'early'
  if (pickInRound > (teamSize * 2) / 3) return 'late'
  return 'mid'
}

// ─── Trade Value Calculations ─────────────────────────────────────────────────

/**
 * Estimated trade value of a draft pick (0-1000).
 * Formula: max(0, 1000 * exp(-0.05 * (overall - 1)))
 */
export function pickTradeValue(pick: DraftPick): number {
  return Math.round(Math.max(0, 1000 * Math.exp(-0.05 * (pick.overall - 1))))
}

/**
 * Trade value for a pick described by round + position label + team size.
 * Converts to approximate overall, then applies pickTradeValue.
 */
export function pickTradeValueByRound(
  round: number,
  pickInRound: 'early' | 'mid' | 'late',
  teamSize: number,
): number {
  let overall: number
  if (pickInRound === 'early') {
    overall = (round - 1) * teamSize + 1
  } else if (pickInRound === 'mid') {
    overall = (round - 1) * teamSize + Math.round(teamSize / 2)
  } else {
    overall = round * teamSize
  }
  const pick: DraftPick = { overall, round, pickInRound: 1, teamSize }
  return pickTradeValue(pick)
}

// ─── Draft Board ──────────────────────────────────────────────────────────────

/** Generate a full draft board in snake order. */
export function buildDraftBoard(teamSize: number, rounds: number): DraftBoard {
  const picks: DraftSlot[] = []
  for (let round = 1; round <= rounds; round++) {
    for (let i = 0; i < teamSize; i++) {
      const overall = (round - 1) * teamSize + i + 1
      const pick = overallToPick(overall, teamSize)
      const slot: DraftSlot = {
        overall,
        round: pick.round,
        pickInRound: pick.pickInRound,
        estimatedValue: pickTradeValue(pick),
        position: pickPosition(pick),
      }
      picks.push(slot)
    }
  }
  return { picks, teamSize, rounds }
}

// ─── ADP-Based Pick Recommendation ───────────────────────────────────────────

/** Recommend a player to draft at the current pick slot. */
export function recommendPickAtSlot(
  availablePlayers: Array<{ id: string; position: string; adp: number; value: number }>,
  currentPick: DraftPick,
  alreadyDrafted: string[],
): { playerId: string; position: string; reason: string } | null {
  const draftedSet = new Set(alreadyDrafted)
  const remaining = availablePlayers.filter((p) => !draftedSet.has(p.id))
  if (remaining.length === 0) return null

  const inRange = remaining.filter(
    (p) => Math.abs(p.adp - currentPick.overall) <= 5,
  )

  if (inRange.length > 0) {
    const best = inRange.reduce((a, b) => (b.value > a.value ? b : a))
    return { playerId: best.id, position: best.position, reason: 'Best available at ADP' }
  }

  const best = remaining.reduce((a, b) => (b.value > a.value ? b : a))
  return { playerId: best.id, position: best.position, reason: 'Best overall available' }
}

// ─── Trade Evaluation ─────────────────────────────────────────────────────────

/** Evaluate a trade between two teams. */
export function evaluateTrade(
  teamAAssets: TradeAsset[],
  teamBAssets: TradeAsset[],
): TradeEvaluation {
  const calcValue = (assets: TradeAsset[]): number =>
    assets.reduce((sum, asset) => {
      if (asset.type === 'player') return sum + (asset.playerValue ?? 0)
      return sum + (asset.pickValue ?? (asset.pick ? pickTradeValue(asset.pick) : 0))
    }, 0)

  const teamAValue = calcValue(teamAAssets)
  const teamBValue = calcValue(teamBAssets)
  const maxVal = Math.max(teamAValue, teamBValue)
  const imbalancePercent = maxVal === 0 ? 0 : (Math.abs(teamAValue - teamBValue) / maxVal) * 100

  let winner: 'teamA' | 'teamB' | 'fair'
  if (imbalancePercent <= 5) {
    winner = 'fair'
  } else if (teamAValue > teamBValue) {
    winner = 'teamA'
  } else {
    winner = 'teamB'
  }

  let recommendation: 'accept' | 'decline' | 'negotiate'
  if (imbalancePercent <= 5) {
    recommendation = 'accept'
  } else if (imbalancePercent <= 15) {
    recommendation = 'negotiate'
  } else {
    // From Team A's perspective: if A gets more value, accept; otherwise decline
    recommendation = teamAValue >= teamBValue ? 'accept' : 'decline'
  }

  const favorLabel = winner === 'fair' ? 'fair' : `favors ${winner === 'teamA' ? 'Team A' : 'Team B'}`
  const summary =
    winner === 'fair'
      ? `Team A receives ${teamAValue} pts for ${teamBValue} pts — ${favorLabel}`
      : `Team A receives ${teamAValue} pts for ${teamBValue} pts — ${favorLabel} by ${imbalancePercent.toFixed(1)}%`

  return { teamAValue, teamBValue, winner, imbalancePercent, recommendation, summary }
}

// ─── Dynasty Trade Value ──────────────────────────────────────────────────────

/** Dynasty trade value discounts picks 20% per year into the future. */
export function dynastyPickValue(pick: DraftPick, yearsAway: number): number {
  return Math.round(pickTradeValue(pick) * Math.pow(0.8, yearsAway))
}

// ─── Positional Scarcity ──────────────────────────────────────────────────────

/** Analyze positional scarcity from ADP data. */
export function positionalScarcity(
  adpData: Array<{ position: string; adp: number }>,
  topN = 5,
): PositionalScarcity[] {
  const byPosition = new Map<string, number[]>()
  for (const { position, adp } of adpData) {
    const arr = byPosition.get(position) ?? []
    arr.push(adp)
    byPosition.set(position, arr)
  }

  const results: PositionalScarcity[] = []
  for (const [position, adps] of byPosition) {
    const sorted = [...adps].sort((a, b) => a - b).slice(0, topN)
    const averageADP = sorted.reduce((s, v) => s + v, 0) / sorted.length
    const scarcityScore = Math.max(0, 100 - (averageADP - 1) * 2)
    const draftRound = Math.ceil(averageADP / 10)
    results.push({ position, averageADP, scarcityScore, draftRound })
  }

  return results.sort((a, b) => b.scarcityScore - a.scarcityScore)
}

// ─── Roster Construction Grade ────────────────────────────────────────────────

/** Grade a team's draft strategy based on positional selection and round. */
export function gradeRosterConstruction(
  picks: DraftPick[],
  playerPositions: string[],
): { grade: 'A' | 'B' | 'C' | 'D' | 'F'; score: number; notes: string[] } {
  let score = 50
  const notes: string[] = []

  let rbCount = 0
  let wrCount = 0
  let tePicked = false

  for (let i = 0; i < picks.length; i++) {
    const pick = picks[i]
    const pos = playerPositions[i]
    if (!pos || !pick) continue

    const round = pick.round

    if (pos === 'QB' && round <= 3) {
      score -= 20
      notes.push(`QB taken too early in round ${round}`)
    }

    if (pos === 'RB' && round <= 4 && rbCount < 2) {
      score += 10
      rbCount++
      notes.push(`RB value pick in round ${round}`)
    }

    if (pos === 'WR' && round <= 6 && wrCount < 3) {
      score += 10
      wrCount++
      notes.push(`WR value pick in round ${round}`)
    }

    if (pos === 'TE' && round <= 5 && !tePicked) {
      score += 15
      tePicked = true
      notes.push(`TE taken early in round ${round}`)
    }

    if ((pos === 'K' || pos === 'DST') && round <= 8) {
      score -= 15
      notes.push(`${pos} taken too early in round ${round}`)
    }
  }

  let grade: 'A' | 'B' | 'C' | 'D' | 'F'
  if (score >= 80) grade = 'A'
  else if (score >= 65) grade = 'B'
  else if (score >= 50) grade = 'C'
  else if (score >= 35) grade = 'D'
  else grade = 'F'

  return { grade, score, notes }
}

// ─── Pick Equivalence ─────────────────────────────────────────────────────────

/** Find the pick in targetTeamSize with closest trade value to the given pick. */
export function pickEquivalence(pick: DraftPick, targetTeamSize: number): DraftPick {
  const targetValue = pickTradeValue(pick)
  const maxOverall = 20 * targetTeamSize

  let bestPick = overallToPick(1, targetTeamSize)
  let bestDiff = Math.abs(pickTradeValue(bestPick) - targetValue)

  for (let overall = 1; overall <= maxOverall; overall++) {
    const candidate = overallToPick(overall, targetTeamSize)
    const diff = Math.abs(pickTradeValue(candidate) - targetValue)
    if (diff < bestDiff) {
      bestDiff = diff
      bestPick = candidate
    }
  }

  return bestPick
}

// ─── Best Available by Round ──────────────────────────────────────────────────

/** Return undrafted players whose ADP falls within the given round's range, sorted by value. */
export function bestAvailableByRound(
  players: Array<{ id: string; adp: number; value: number; position: string }>,
  round: number,
  teamSize: number,
  drafted: string[],
): Array<{ id: string; adp: number; value: number; position: string }> {
  const draftedSet = new Set(drafted)
  const minAdp = (round - 1) * teamSize + 1
  const maxAdp = round * teamSize
  return players
    .filter((p) => !draftedSet.has(p.id) && p.adp >= minAdp && p.adp <= maxAdp)
    .sort((a, b) => b.value - a.value)
}

// ─── Auction Value Estimate ───────────────────────────────────────────────────

/** Estimate auction dollar value from ADP. */
export function auctionValue(adp: number, totalBudget = 200, numPlayers = 15): number {
  const raw = (totalBudget / numPlayers) * ((numPlayers - adp + 1) / (numPlayers / 2 + 1))
  const clamped = Math.max(1, Math.min(totalBudget * 0.5, raw))
  return Math.round(clamped)
}

// ─── Bye Week Conflicts ───────────────────────────────────────────────────────

/** Find weeks where multiple starters have bye weeks. */
export function byeWeekConflicts(
  roster: Array<{ playerId: string; position: string; byeWeek: number }>,
): { week: number; conflicts: number; positions: string[] }[] {
  // Determine starters: 1 QB, 2 RB, 2-3 WR, 1 TE
  const starterCounts: Record<string, number> = { QB: 1, RB: 2, WR: 3, TE: 1 }
  const positionTrackers: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 }

  const starters: Array<{ playerId: string; position: string; byeWeek: number }> = []
  for (const player of roster) {
    const pos = player.position
    const max = starterCounts[pos]
    if (max !== undefined) {
      const used = positionTrackers[pos] ?? 0
      if (used < max) {
        starters.push(player)
        positionTrackers[pos] = used + 1
      }
    }
  }

  const byWeek = new Map<number, string[]>()
  for (const starter of starters) {
    const wk = starter.byeWeek
    const arr = byWeek.get(wk) ?? []
    arr.push(starter.position)
    byWeek.set(wk, arr)
  }

  return [...byWeek.entries()]
    .filter(([, positions]) => positions.length >= 2)
    .map(([week, positions]) => ({ week, conflicts: positions.length, positions }))
    .sort((a, b) => b.conflicts - a.conflicts)
}

// ─── Snake Draft Picks for a Team Slot ───────────────────────────────────────

/** Return all overall pick numbers for a team at the given slot in a snake draft. */
export function snakeDraftPicks(teamSlot: number, teamSize: number, rounds: number): number[] {
  const result: number[] = []
  for (let round = 1; round <= rounds; round++) {
    const pick =
      round % 2 === 0
        ? (round - 1) * teamSize + (teamSize - teamSlot + 1)
        : (round - 1) * teamSize + teamSlot
    result.push(pick)
  }
  return result
}

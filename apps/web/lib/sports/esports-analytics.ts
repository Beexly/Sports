/**
 * esports-analytics.ts
 * Pure TypeScript esports analytics library — no external dependencies.
 * Covers: general combat stats, LoL, CS:GO/CS2, VALORANT, Dota 2,
 * team analytics, and betting/prediction helpers.
 */

// ---------------------------------------------------------------------------
// 1. General combat stats (game-agnostic)
// ---------------------------------------------------------------------------

/**
 * KDA ratio: (kills + assists) / max(deaths, 1)
 */
export function kdaRatio(kills: number, deaths: number, assists: number): number {
  return (kills + assists) / Math.max(deaths, 1)
}

/**
 * Kill/death ratio: kills / max(deaths, 1)
 */
export function killDeathRatio(kills: number, deaths: number): number {
  return kills / Math.max(deaths, 1)
}

/**
 * Headshot rate: percentage 0–100
 */
export function headshotRate(headshots: number, totalKills: number): number {
  if (totalKills <= 0) return 0
  return (headshots / totalKills) * 100
}

/**
 * Assist rate: assists as a percentage of team kills
 */
export function assistRate(assists: number, teamKills: number): number {
  if (teamKills <= 0) return 0
  return (assists / teamKills) * 100
}

/**
 * Clutch win rate: percentage of clutch situations won
 */
export function clutchWinRate(clutchWins: number, clutchAttempts: number): number {
  if (clutchAttempts <= 0) return 0
  return (clutchWins / clutchAttempts) * 100
}

/**
 * Multi-kill rate: multi-kills per round
 */
export function multiKillRate(multiKills: number, rounds: number): number {
  if (rounds <= 0) return 0
  return multiKills / rounds
}

// ---------------------------------------------------------------------------
// 2. League of Legends (LoL) specific
// ---------------------------------------------------------------------------

/**
 * CS per minute
 */
export function csPerMinute(creepScore: number, gameDurationMinutes: number): number {
  if (gameDurationMinutes <= 0) return 0
  return creepScore / gameDurationMinutes
}

/**
 * Vision score: wardsPlaced*1 + wardKills*1.5 + controlWards*2
 */
export function visionScore(wardsPlaced: number, wardKills: number, controlWards: number): number {
  return wardsPlaced * 1 + wardKills * 1.5 + controlWards * 2
}

/**
 * Damage share as a percentage of team total damage
 */
export function damageSharePct(playerDamage: number, teamTotalDamage: number): number {
  if (teamTotalDamage <= 0) return 0
  return (playerDamage / teamTotalDamage) * 100
}

/**
 * Gold difference at a specific time point (signed)
 */
export function goldDiffAt(playerGold: number, opponentGold: number): number {
  return playerGold - opponentGold
}

/**
 * Lane phase score, capped 0–100
 * (csAt10/80)*40 + (goldAt10/3500)*40 + (kills*5 - deaths*5)
 */
export function lanePhaseScore(
  csAt10: number,
  goldAt10: number,
  kills: number,
  deaths: number,
): number {
  const raw = (csAt10 / 80) * 40 + (goldAt10 / 3500) * 40 + (kills * 5 - deaths * 5)
  return Math.min(100, Math.max(0, raw))
}

/**
 * Jungle proximity: ganks*3 + camps*1 + objectives*5
 */
export function jungleProximity(ganks: number, camps: number, objectives: number): number {
  return ganks * 3 + camps * 1 + objectives * 5
}

/**
 * Teamfight participation: (kills+assists)/max(teamKills,1)*100
 */
export function teamfightParticipation(
  kills: number,
  assists: number,
  teamKills: number,
): number {
  return ((kills + assists) / Math.max(teamKills, 1)) * 100
}

/**
 * LoL player rating, capped 0–100
 * kda*25 + (cspm/8)*25 + (visionScore/50)*25 + damageShare*25
 */
export function lolPlayerRating(
  kda: number,
  cspm: number,
  visionScoreVal: number,
  damageShare: number,
): number {
  const raw = kda * 25 + (cspm / 8) * 25 + (visionScoreVal / 50) * 25 + damageShare * 25
  return Math.min(100, Math.max(0, raw))
}

export interface LolFantasyStats {
  kills: number
  deaths: number
  assists: number
  cs: number
  triplePlus: number
  quadra: number
  penta: number
}

/**
 * LoL fantasy score
 * kills×3, deaths×−1, assists×2, cs×0.02, tripleKill×2, quadraKill×5, pentaKill×10
 */
export function lolFantasyScore(stats: LolFantasyStats): number {
  return (
    stats.kills * 3 +
    stats.deaths * -1 +
    stats.assists * 2 +
    stats.cs * 0.02 +
    stats.triplePlus * 2 +
    stats.quadra * 5 +
    stats.penta * 10
  )
}

// ---------------------------------------------------------------------------
// 3. CS:GO/CS2 specific
// ---------------------------------------------------------------------------

/**
 * Average damage per round
 */
export function adr(totalDamage: number, rounds: number): number {
  if (rounds <= 0) return 0
  return totalDamage / rounds
}

/**
 * HLTV Rating 2.0
 * 0.0073*KAST + 0.3591*KPR − 0.5329*DPR + 0.2372*Impact + 0.0032*ADR + 0.1587
 */
export function ratingTwoPoint(
  kpr: number,
  dpr: number,
  impact: number,
  adrVal: number,
  kast: number,
): number {
  return (
    0.0073 * kast +
    0.3591 * kpr -
    0.5329 * dpr +
    0.2372 * impact +
    0.0032 * adrVal +
    0.1587
  )
}

/**
 * KAST percentage: rounds with kill/assist/survive/trade as percentage
 */
export function kastPct(
  rounds_with_kill_assist_survive_trade: number,
  totalRounds: number,
): number {
  if (totalRounds <= 0) return 0
  return (rounds_with_kill_assist_survive_trade / totalRounds) * 100
}

/**
 * Utility damage: nade*1 + molotov*1.5 + flashAssist*0.5
 */
export function utilityDamage(
  nadeDmg: number,
  molotovDmg: number,
  flashAssists: number,
): number {
  return nadeDmg * 1 + molotovDmg * 1.5 + flashAssists * 0.5
}

/**
 * Opening duel win rate: kills/(kills+deaths)*100
 * If both 0, returns 50
 */
export function openingDuelWinRate(openingKills: number, openingDeaths: number): number {
  const total = openingKills + openingDeaths
  if (total === 0) return 50
  return (openingKills / total) * 100
}

export interface CsgoFantasyStats {
  kills: number
  deaths: number
  assists: number
  headshots: number
  adr: number
  clutches: number
}

/**
 * CS:GO fantasy score
 * kills×2, deaths×−0.5, assists×0.5, headshots×0.5, adr×0.1, clutches×4
 */
export function csgoFantasyScore(stats: CsgoFantasyStats): number {
  return (
    stats.kills * 2 +
    stats.deaths * -0.5 +
    stats.assists * 0.5 +
    stats.headshots * 0.5 +
    stats.adr * 0.1 +
    stats.clutches * 4
  )
}

// ---------------------------------------------------------------------------
// 4. VALORANT specific
// ---------------------------------------------------------------------------

/**
 * First blood rate as a percentage of rounds
 */
export function firstBloodRate(firstBloods: number, rounds: number): number {
  if (rounds <= 0) return 0
  return (firstBloods / rounds) * 100
}

/**
 * Spike plant rate: plants as percentage of attacking rounds
 */
export function spikePlantRate(plants: number, roundsAttacking: number): number {
  if (roundsAttacking <= 0) return 0
  return (plants / roundsAttacking) * 100
}

/**
 * Spike defuse rate: defuses as percentage of plants against
 */
export function spikeDefuseRate(defuses: number, plantsAgainst: number): number {
  if (plantsAgainst <= 0) return 0
  return (defuses / plantsAgainst) * 100
}

/**
 * Ability usage score, capped 0–100
 * (abilitiesUsed/rounds)*10 + (abilityKills*3)
 */
export function abilityUsageScore(
  abilitiesUsed: number,
  abilityKills: number,
  rounds: number,
): number {
  if (rounds <= 0) return Math.min(100, abilityKills * 3)
  const raw = (abilitiesUsed / rounds) * 10 + abilityKills * 3
  return Math.min(100, Math.max(0, raw))
}

export interface ValFantasyStats {
  kills: number
  deaths: number
  assists: number
  firstBloods: number
  plants: number
  defuses: number
  clutches: number
}

/**
 * VALORANT fantasy score
 * kills×2, deaths×−0.5, assists×0.5, firstBloods×4, plants×2, defuses×2, clutches×5
 */
export function valFantasyScore(stats: ValFantasyStats): number {
  return (
    stats.kills * 2 +
    stats.deaths * -0.5 +
    stats.assists * 0.5 +
    stats.firstBloods * 4 +
    stats.plants * 2 +
    stats.defuses * 2 +
    stats.clutches * 5
  )
}

// ---------------------------------------------------------------------------
// 5. Dota 2 specific
// ---------------------------------------------------------------------------

/**
 * Last hits per minute
 */
export function lastHitsPerMinute(lastHits: number, gameDurationMinutes: number): number {
  if (gameDurationMinutes <= 0) return 0
  return lastHits / gameDurationMinutes
}

/**
 * Hero damage share as percentage of team hero damage
 */
export function heroDamageShare(heroDamage: number, teamHeroDamage: number): number {
  if (teamHeroDamage <= 0) return 0
  return (heroDamage / teamHeroDamage) * 100
}

/**
 * Tower damage contribution as percentage of team tower damage
 */
export function towerDamageContribution(
  towerDamage: number,
  teamTowerDamage: number,
): number {
  if (teamTowerDamage <= 0) return 0
  return (towerDamage / teamTowerDamage) * 100
}

/**
 * Ward efficiency: kills / max(placed, 1) * 100
 */
export function wardEfficiency(wardsPlaced: number, wardKills: number): number {
  return (wardKills / Math.max(wardsPlaced, 1)) * 100
}

export interface DotaFantasyStats {
  kills: number
  deaths: number
  assists: number
  lastHits: number
  towerKills: number
  roshanKills: number
  stuns: number
}

/**
 * Dota 2 fantasy score
 * kills×0.3, deaths×−0.3, assists×0.15, lastHits×0.003,
 * towerKills×1, roshanKills×1, stuns×0.1 per 100
 */
export function dotaFantasyScore(stats: DotaFantasyStats): number {
  return (
    stats.kills * 0.3 +
    stats.deaths * -0.3 +
    stats.assists * 0.15 +
    stats.lastHits * 0.003 +
    stats.towerKills * 1 +
    stats.roshanKills * 1 +
    stats.stuns * (0.1 / 100)
  )
}

// ---------------------------------------------------------------------------
// 6. Team analytics
// ---------------------------------------------------------------------------

export interface PlayerKDA {
  kills: number
  deaths: number
  assists: number
}

/**
 * Team KDA aggregate: sum kills+assists / max(sum deaths, 1)
 */
export function teamKDAAggregate(players: PlayerKDA[]): number {
  if (players.length === 0) return 0
  const totalKills = players.reduce((acc, p) => acc + p.kills, 0)
  const totalDeaths = players.reduce((acc, p) => acc + p.deaths, 0)
  const totalAssists = players.reduce((acc, p) => acc + p.assists, 0)
  return (totalKills + totalAssists) / Math.max(totalDeaths, 1)
}

/**
 * Economy efficiency: damage per money unit (CS:GO style)
 */
export function economyEfficiency(moneySpent: number, damageDealt: number): number {
  if (moneySpent <= 0) return 0
  return damageDealt / moneySpent
}

/**
 * Round win rate as a percentage
 */
export function roundWinRate(roundsWon: number, roundsPlayed: number): number {
  if (roundsPlayed <= 0) return 0
  return (roundsWon / roundsPlayed) * 100
}

/**
 * Map win rate as a percentage
 */
export function mapWinRate(mapsWon: number, mapsPlayed: number): number {
  if (mapsPlayed <= 0) return 0
  return (mapsWon / mapsPlayed) * 100
}

/**
 * Objective control rate as a percentage
 */
export function objectiveControlRate(
  objectivesSecured: number,
  objectivesContested: number,
): number {
  if (objectivesContested <= 0) return 0
  return (objectivesSecured / objectivesContested) * 100
}

/**
 * Team synergy score: (mean + min) / 2 — penalizes weak links
 */
export function teamSynergyScore(individualRatings: number[]): number {
  if (individualRatings.length === 0) return 0
  const mean = individualRatings.reduce((acc, r) => acc + r, 0) / individualRatings.length
  const min = Math.min(...individualRatings)
  return (mean + min) / 2
}

// ---------------------------------------------------------------------------
// 7. Betting/prediction helpers
// ---------------------------------------------------------------------------

/**
 * Elo expected score for player A against player B
 * 1 / (1 + 10^((ratingB - ratingA) / 400))
 */
export function eloExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

/**
 * Elo rating update
 * rating + k * (actualScore - expectedScore)
 * k defaults to 32
 */
export function eloUpdate(
  rating: number,
  expectedScore: number,
  actualScore: number,
  kFactor: number = 32,
): number {
  return rating + kFactor * (actualScore - expectedScore)
}

/**
 * Map advantage: for each contested map, computes team win rate - opponent win rate
 */
export function mapAdvantage(
  teamMapWinRates: Record<string, number>,
  opponentMapWinRates: Record<string, number>,
  contestedMaps: string[],
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const map of contestedMaps) {
    const teamRate = teamMapWinRates[map] ?? 0
    const opponentRate = opponentMapWinRates[map] ?? 0
    result[map] = teamRate - opponentRate
  }
  return result
}

/**
 * Form rating based on recent results.
 * win=1, draw=0.5, loss=0
 * Most recent result gets weight 1, next decayFactor, then decayFactor^2, etc.
 * Normalized to 0-100
 * decayFactor defaults to 0.8
 */
export function formRating(
  recentResults: Array<'win' | 'loss' | 'draw'>,
  decayFactor: number = 0.8,
): number {
  if (recentResults.length === 0) return 0

  const resultValue = (r: 'win' | 'loss' | 'draw'): number => {
    if (r === 'win') return 1
    if (r === 'draw') return 0.5
    return 0
  }

  let weightedScore = 0
  let totalWeight = 0

  for (let i = 0; i < recentResults.length; i++) {
    const weight = Math.pow(decayFactor, i)
    const result = recentResults[i] as 'win' | 'loss' | 'draw'
    weightedScore += resultValue(result) * weight
    totalWeight += weight
  }

  const maxPossible = totalWeight // if all wins
  const normalized = weightedScore / maxPossible

  return normalized * 100
}

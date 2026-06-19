/**
 * Fantasy scoring rules and DFS point calculation utilities.
 * Pure TypeScript — no external dependencies, no `any`.
 */

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type Platform =
  | 'draftkings'
  | 'fanduel'
  | 'yahoo'
  | 'espn'
  | 'sleeper'
  | 'custom'

export type Sport = 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'PGA' | 'MMA' | 'NASCAR'

export type ScoringFormat = 'standard' | 'ppr' | 'half-ppr' | '2qb'

// ---------------------------------------------------------------------------
// NFL stat-line interfaces
// ---------------------------------------------------------------------------

export interface NflQbStats {
  passingYards: number
  passingTDs: number
  interceptions: number
  rushingYards: number
  rushingTDs: number
  fumblesLost: number
  completions?: number
  attempts?: number
  twoPointConversions?: number
  /** Some leagues award a bonus for 300+ passing yards */
  bonusOver300?: boolean
}

export interface NflSkillStats {
  receptions: number
  receivingYards: number
  receivingTDs: number
  rushingYards: number
  rushingTDs: number
  fumblesLost: number
  twoPointConversions?: number
  bonusOver100Receiving?: boolean
  bonusOver100Rushing?: boolean
  targets?: number
}

export interface NflDstStats {
  sacks: number
  interceptions: number
  fumblesRecovered: number
  defensiveTDs: number
  safeties: number
  blockedKicks: number
  /** Used for DST scoring tiers */
  pointsAllowed: number
}

export interface NflKickerStats {
  /** Distance bucket → count: '0-39', '40-49', '50-59', '60+' */
  fgMade: Record<string, number>
  fgMissed: number
  xpMade: number
  xpMissed: number
}

// ---------------------------------------------------------------------------
// NBA stat-line interface
// ---------------------------------------------------------------------------

export interface NbaStats {
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  threePointersMade?: number
  /** Computed or caller-provided */
  doubleDouble?: boolean
  /** Computed or caller-provided */
  tripleDouble?: boolean
  minutesPlayed?: number
}

// ---------------------------------------------------------------------------
// MLB stat-line interfaces
// ---------------------------------------------------------------------------

export interface MlbBatterStats {
  singles: number
  doubles: number
  triples: number
  homeRuns: number
  rbi: number
  runs: number
  stolenBases: number
  walks: number
  hitByPitch: number
  strikeouts: number
}

export interface MlbPitcherStats {
  /** Can be decimal, e.g. 6.2 for 6 and 2/3 innings */
  inningsPitched: number
  strikeouts: number
  wins: number
  earnedRuns: number
  hitsAllowed: number
  walksAllowed: number
  completeGame?: boolean
  noHitter?: boolean
  qualityStart?: boolean
}

// ---------------------------------------------------------------------------
// Scoring configuration
// ---------------------------------------------------------------------------

export interface ScoringConfig {
  platform: Platform
  sport: Sport
  format?: ScoringFormat
  /** stat name → points per unit (used when platform === 'custom') */
  customRules?: Record<string, number>
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ---------------------------------------------------------------------------
// NFL QB Scoring
// ---------------------------------------------------------------------------

/**
 * Score an NFL quarterback's stat line.
 *
 * DraftKings: pass yds /25, passTD 4, INT -1, rush yds /10, rush TD 6,
 *   fumble lost -1, 2pt conv 2pts each
 *   bonus: 300+ pass yds +3, 400+ pass yds +3 more (cumulative), 100+ rush +3
 * FanDuel: pass yds /25, passTD 4, INT -1, rush yds /10, rush TD 6,
 *   fumble lost -2; bonus: 300+ pass yds +3
 * Yahoo / ESPN / Sleeper: pass yds /25, passTD 4, INT -2, rush yds /10,
 *   rush TD 6, fumble lost -2
 * Custom: keys are stat names mapped to points-per-unit
 */
export function scoreNflQb(stats: NflQbStats, config: ScoringConfig): number {
  const { platform, customRules } = config

  if (platform === 'custom' && customRules) {
    const s = stats
    let pts = 0
    // customRules: stat name → points per raw unit (yards are raw, not pre-divided)
    pts += s.passingYards * (customRules['passingYardsPerUnit'] ?? 0)
    pts += s.passingTDs * (customRules['passingTD'] ?? 0)
    pts += s.interceptions * (customRules['interception'] ?? 0)
    pts += s.rushingYards * (customRules['rushingYardsPerUnit'] ?? 0)
    pts += s.rushingTDs * (customRules['rushingTD'] ?? 0)
    pts += s.fumblesLost * (customRules['fumbleLost'] ?? 0)
    pts += (s.twoPointConversions ?? 0) * (customRules['twoPointConversion'] ?? 0)
    return round2(pts)
  }

  let pts = 0

  // Passing yards: 1 pt per 25 yds (all platforms)
  pts += stats.passingYards / 25

  // Passing TDs: 4 pts (all platforms)
  pts += stats.passingTDs * 4

  // Interceptions
  if (platform === 'draftkings' || platform === 'fanduel') {
    pts += stats.interceptions * -1
  } else {
    // yahoo, espn, sleeper
    pts += stats.interceptions * -2
  }

  // Rushing yards: 1 pt per 10 yds (all platforms)
  pts += stats.rushingYards / 10

  // Rushing TDs: 6 pts (all platforms)
  pts += stats.rushingTDs * 6

  // Fumbles lost
  if (platform === 'draftkings') {
    pts += stats.fumblesLost * -1
  } else {
    pts += stats.fumblesLost * -2
  }

  // 2-point conversions: 2 pts each (DK + FD)
  if (platform === 'draftkings' || platform === 'fanduel') {
    pts += (stats.twoPointConversions ?? 0) * 2
  }

  // Passing yard bonuses
  if (platform === 'draftkings') {
    if (stats.passingYards >= 300) pts += 3
    if (stats.passingYards >= 400) pts += 3 // cumulative — total +6 at 400+
    if (stats.rushingYards >= 100) pts += 3
  } else if (platform === 'fanduel') {
    if (stats.passingYards >= 300) pts += 3
  }

  return round2(pts)
}

// ---------------------------------------------------------------------------
// NFL Skill Position Scoring (RB/WR/TE)
// ---------------------------------------------------------------------------

/**
 * Score an NFL skill player.
 *
 * Base: rec yds /10, rec TD 6, rush yds /10, rush TD 6, fumble -1
 * PPR:  receptions × 1.0; half-ppr: × 0.5; standard: × 0
 * DK: bonus 100+ rec yds +3, 100+ rush yds +3; 2pt conv 2pts each
 * FD: fumble -2
 */
export function scoreNflSkill(
  stats: NflSkillStats,
  config: ScoringConfig,
  format?: ScoringFormat
): number {
  const { platform } = config
  const fmt = format ?? config.format ?? 'standard'

  let pts = 0

  // Reception points by format
  if (fmt === 'ppr') {
    pts += stats.receptions * 1.0
  } else if (fmt === 'half-ppr') {
    pts += stats.receptions * 0.5
  }
  // standard: 0

  // Receiving yards
  pts += stats.receivingYards / 10

  // Receiving TDs
  pts += stats.receivingTDs * 6

  // Rushing yards
  pts += stats.rushingYards / 10

  // Rushing TDs
  pts += stats.rushingTDs * 6

  // Fumbles
  if (platform === 'fanduel') {
    pts += stats.fumblesLost * -2
  } else {
    pts += stats.fumblesLost * -1
  }

  // Platform-specific bonuses
  if (platform === 'draftkings') {
    if (stats.receivingYards >= 100) pts += 3
    if (stats.rushingYards >= 100) pts += 3
    pts += (stats.twoPointConversions ?? 0) * 2
  }

  return round2(pts)
}

// ---------------------------------------------------------------------------
// NFL DST Scoring
// ---------------------------------------------------------------------------

/**
 * DST points-allowed scoring tier — returns bonus/penalty points.
 */
function dstPointsAllowedTier(pointsAllowed: number, platform: Platform): number {
  if (platform === 'yahoo') {
    if (pointsAllowed === 0) return 12
    if (pointsAllowed <= 6) return 9
    if (pointsAllowed <= 13) return 6
    if (pointsAllowed <= 20) return 3
    if (pointsAllowed <= 27) return 2
    if (pointsAllowed <= 34) return 1
    return -2
  }
  // DraftKings / FanDuel / ESPN / Sleeper
  if (pointsAllowed === 0) return 10
  if (pointsAllowed <= 6) return 7
  if (pointsAllowed <= 13) return 4
  if (pointsAllowed <= 20) return 1
  if (pointsAllowed <= 27) return 0
  if (pointsAllowed <= 34) return -1
  return -4
}

/**
 * Score an NFL defense/special-teams unit.
 *
 * Sacks 1, INT 2, fumble recovered 2, def TD 6, safety 2, blocked kick 2.
 * Points-allowed tiers vary by platform.
 */
export function scoreNflDst(stats: NflDstStats, config: ScoringConfig): number {
  const { platform } = config

  let pts = 0
  pts += stats.sacks * 1
  pts += stats.interceptions * 2
  pts += stats.fumblesRecovered * 2
  pts += stats.defensiveTDs * 6
  pts += stats.safeties * 2
  pts += stats.blockedKicks * 2
  pts += dstPointsAllowedTier(stats.pointsAllowed, platform)

  return round2(pts)
}

// ---------------------------------------------------------------------------
// NFL Kicker Scoring
// ---------------------------------------------------------------------------

/**
 * Score an NFL kicker.
 *
 * DK / FD: FG 0-39: 3, 40-49: 4, 50-59: 5, 60+: 6; missed FG -1; XP 1; XP missed -1
 * Yahoo / ESPN: FG 0-39: 3, 40-49: 4, 50+: 5; no 60+ distinction; missed FG 0
 */
export function scoreNflKicker(stats: NflKickerStats, config: ScoringConfig): number {
  const { platform } = config

  let pts = 0

  // Field goals made by distance bucket
  const made = stats.fgMade
  const isDkFd = platform === 'draftkings' || platform === 'fanduel'

  pts += (made['0-39'] ?? 0) * 3
  pts += (made['40-49'] ?? 0) * 4

  if (isDkFd) {
    pts += (made['50-59'] ?? 0) * 5
    pts += (made['60+'] ?? 0) * 6
    // Missed FGs: -1
    pts += stats.fgMissed * -1
  } else {
    // Yahoo / ESPN / Sleeper: 50+ bucket includes 60+
    const fiftyPlus =
      (made['50-59'] ?? 0) + (made['60+'] ?? 0) + (made['50+'] ?? 0)
    pts += fiftyPlus * 5
    // No penalty for missed FGs
  }

  // Extra points
  pts += stats.xpMade * 1
  if (isDkFd) {
    pts += stats.xpMissed * -1
  }

  return round2(pts)
}

// ---------------------------------------------------------------------------
// NBA Double-Double / Triple-Double helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if at least 2 of {points, rebounds, assists, steals, blocks} >= 10.
 */
export function nbaDoubleDouble(stats: NbaStats): boolean {
  const cats = [stats.points, stats.rebounds, stats.assists, stats.steals, stats.blocks]
  return cats.filter(v => v >= 10).length >= 2
}

/**
 * Returns true if at least 3 of {points, rebounds, assists, steals, blocks} >= 10.
 */
export function nbaTripleDouble(stats: NbaStats): boolean {
  const cats = [stats.points, stats.rebounds, stats.assists, stats.steals, stats.blocks]
  return cats.filter(v => v >= 10).length >= 3
}

// ---------------------------------------------------------------------------
// NBA Scoring
// ---------------------------------------------------------------------------

/**
 * Score an NBA player.
 *
 * DraftKings: pts 1, reb 1.25, ast 1.5, stl 2, blk 2, TO -0.5, 3pm 0.5
 *   double-double +1.5, triple-double +3
 * FanDuel: pts 1, reb 1.2, ast 1.5, stl 2, blk 2, TO -1, 3pm 0
 * Yahoo: pts 1, reb 1, ast 1, stl 2, blk 2, TO -1
 * double/triple-double computed from stats if not provided
 */
export function scoreNba(stats: NbaStats, config: ScoringConfig): number {
  const { platform } = config

  // Resolve double/triple-double
  const dd = stats.doubleDouble ?? nbaDoubleDouble(stats)
  const td = stats.tripleDouble ?? nbaTripleDouble(stats)

  let pts = 0

  if (platform === 'draftkings') {
    pts += stats.points * 1
    pts += stats.rebounds * 1.25
    pts += stats.assists * 1.5
    pts += stats.steals * 2
    pts += stats.blocks * 2
    pts += stats.turnovers * -0.5
    pts += (stats.threePointersMade ?? 0) * 0.5
    if (dd) pts += 1.5
    if (td) pts += 3
  } else if (platform === 'fanduel') {
    pts += stats.points * 1
    pts += stats.rebounds * 1.2
    pts += stats.assists * 1.5
    pts += stats.steals * 2
    pts += stats.blocks * 2
    pts += stats.turnovers * -1
    // No 3pm bonus
  } else {
    // yahoo, espn, sleeper
    pts += stats.points * 1
    pts += stats.rebounds * 1
    pts += stats.assists * 1
    pts += stats.steals * 2
    pts += stats.blocks * 2
    pts += stats.turnovers * -1
  }

  return round2(pts)
}

// ---------------------------------------------------------------------------
// MLB Batter Scoring
// ---------------------------------------------------------------------------

/**
 * Score an MLB batter.
 *
 * DraftKings: 1B 3, 2B 5, 3B 8, HR 10, RBI 2, R 2, SB 5, BB 2, HBP 2, K -0.5
 * FanDuel: 1B 3, 2B 6, 3B 9, HR 12, RBI 3.5, R 3.2, SB 6, BB 3, K 0, HBP 3
 * Yahoo / Sleeper: 1B 2.6, 2B 5.2, 3B 7.8, HR 10.4, RBI 1, R 1, SB 2, BB 1, K -0.5
 */
export function scoreMlbBatter(stats: MlbBatterStats, config: ScoringConfig): number {
  const { platform } = config

  let pts = 0

  if (platform === 'draftkings') {
    pts += stats.singles * 3
    pts += stats.doubles * 5
    pts += stats.triples * 8
    pts += stats.homeRuns * 10
    pts += stats.rbi * 2
    pts += stats.runs * 2
    pts += stats.stolenBases * 5
    pts += stats.walks * 2
    pts += stats.hitByPitch * 2
    pts += stats.strikeouts * -0.5
  } else if (platform === 'fanduel') {
    pts += stats.singles * 3
    pts += stats.doubles * 6
    pts += stats.triples * 9
    pts += stats.homeRuns * 12
    pts += stats.rbi * 3.5
    pts += stats.runs * 3.2
    pts += stats.stolenBases * 6
    pts += stats.walks * 3
    pts += stats.hitByPitch * 3
    // No strikeout penalty
  } else {
    // yahoo, sleeper, espn
    pts += stats.singles * 2.6
    pts += stats.doubles * 5.2
    pts += stats.triples * 7.8
    pts += stats.homeRuns * 10.4
    pts += stats.rbi * 1
    pts += stats.runs * 1
    pts += stats.stolenBases * 2
    pts += stats.walks * 1
    // No HBP, no K penalty for standard Yahoo
    pts += stats.strikeouts * -0.5
  }

  return round2(pts)
}

// ---------------------------------------------------------------------------
// MLB Pitcher Scoring
// ---------------------------------------------------------------------------

/**
 * Score an MLB pitcher.
 *
 * DraftKings: IP 2.25, K 2, W 4, ER -2, H -0.6, BB -0.6, CG 2.5, NH 5, QS 4
 * FanDuel: IP 3, K 3, W 6, ER -3, NH 10, QS 4 (no H/BB penalty)
 * Yahoo: IP 1, K 2, W 5, ER -1, H -0.5, BB -0.5
 */
export function scoreMlbPitcher(stats: MlbPitcherStats, config: ScoringConfig): number {
  const { platform } = config

  let pts = 0

  if (platform === 'draftkings') {
    pts += stats.inningsPitched * 2.25
    pts += stats.strikeouts * 2
    pts += stats.wins * 4
    pts += stats.earnedRuns * -2
    pts += stats.hitsAllowed * -0.6
    pts += stats.walksAllowed * -0.6
    if (stats.completeGame) pts += 2.5
    if (stats.noHitter) pts += 5
    if (stats.qualityStart) pts += 4
  } else if (platform === 'fanduel') {
    pts += stats.inningsPitched * 3
    pts += stats.strikeouts * 3
    pts += stats.wins * 6
    pts += stats.earnedRuns * -3
    // No H or BB penalty
    if (stats.noHitter) pts += 10
    if (stats.qualityStart) pts += 4
  } else {
    // yahoo, espn, sleeper
    pts += stats.inningsPitched * 1
    pts += stats.strikeouts * 2
    pts += stats.wins * 5
    pts += stats.earnedRuns * -1
    pts += stats.hitsAllowed * -0.5
    pts += stats.walksAllowed * -0.5
  }

  return round2(pts)
}

// ---------------------------------------------------------------------------
// DFS Roster validation
// ---------------------------------------------------------------------------

export interface DfsRoster {
  platform: Platform
  sport: Sport
  slots: Array<{ position: string; playerId: string; salary: number }>
  format?: ScoringFormat
}

type RosterSpec = {
  salaryCap: number
  positions: Array<{ slot: string; eligible: string[] }>
}

const DFS_ROSTER_SPECS: Partial<Record<Platform, Partial<Record<Sport, RosterSpec>>>> = {
  draftkings: {
    NFL: {
      salaryCap: 50000,
      positions: [
        { slot: 'QB', eligible: ['QB'] },
        { slot: 'RB', eligible: ['RB'] },
        { slot: 'RB', eligible: ['RB'] },
        { slot: 'WR', eligible: ['WR'] },
        { slot: 'WR', eligible: ['WR'] },
        { slot: 'WR', eligible: ['WR'] },
        { slot: 'TE', eligible: ['TE'] },
        { slot: 'FLEX', eligible: ['RB', 'WR', 'TE'] },
        { slot: 'DST', eligible: ['DST', 'DEF'] },
      ],
    },
    NBA: {
      salaryCap: 50000,
      positions: [
        { slot: 'PG', eligible: ['PG'] },
        { slot: 'SG', eligible: ['SG'] },
        { slot: 'SF', eligible: ['SF'] },
        { slot: 'PF', eligible: ['PF'] },
        { slot: 'C', eligible: ['C'] },
        { slot: 'G', eligible: ['PG', 'SG'] },
        { slot: 'F', eligible: ['SF', 'PF'] },
        { slot: 'UTIL', eligible: ['PG', 'SG', 'SF', 'PF', 'C'] },
      ],
    },
  },
  fanduel: {
    NFL: {
      salaryCap: 60000,
      positions: [
        { slot: 'QB', eligible: ['QB'] },
        { slot: 'RB', eligible: ['RB'] },
        { slot: 'RB', eligible: ['RB'] },
        { slot: 'WR', eligible: ['WR'] },
        { slot: 'WR', eligible: ['WR'] },
        { slot: 'WR', eligible: ['WR'] },
        { slot: 'TE', eligible: ['TE'] },
        { slot: 'FLEX', eligible: ['WR', 'RB', 'TE'] },
        { slot: 'K', eligible: ['K'] },
        { slot: 'DEF', eligible: ['DEF', 'DST'] },
      ],
    },
  },
}

/**
 * Validate a DFS lineup against platform roster requirements.
 *
 * Checks: correct positions filled, salary within cap, no duplicate players.
 */
export function validateDfsRoster(roster: DfsRoster): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const { platform, sport, slots } = roster

  const spec = DFS_ROSTER_SPECS[platform]?.[sport]

  if (!spec) {
    errors.push(`No roster spec found for ${platform} ${sport}`)
    return { valid: false, errors }
  }

  // Check salary cap
  const totalSalary = slots.reduce((sum, s) => sum + s.salary, 0)
  if (totalSalary > spec.salaryCap) {
    errors.push(
      `Salary $${totalSalary} exceeds cap of $${spec.salaryCap}`
    )
  }

  // Check for duplicate players
  const playerIds = slots.map(s => s.playerId)
  const uniquePlayers = new Set(playerIds)
  if (uniquePlayers.size !== playerIds.length) {
    errors.push('Duplicate players detected in roster')
  }

  // Check slot count
  if (slots.length !== spec.positions.length) {
    errors.push(
      `Expected ${spec.positions.length} players, got ${slots.length}`
    )
  }

  // Check each slot position eligibility
  spec.positions.forEach((specSlot, idx) => {
    const rosterSlot = slots[idx]
    if (!rosterSlot) {
      errors.push(`Missing player for slot ${specSlot.slot} (index ${idx})`)
      return
    }
    if (!specSlot.eligible.includes(rosterSlot.position.toUpperCase())) {
      errors.push(
        `Slot ${specSlot.slot} (index ${idx}): position '${rosterSlot.position}' not eligible (allowed: ${specSlot.eligible.join(', ')})`
      )
    }
  })

  return { valid: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Projection utilities
// ---------------------------------------------------------------------------

/**
 * Dispatch to the correct scoring function based on positionType.
 */
export function projectPoints(
  stats: NflQbStats | NflSkillStats | NflDstStats | NbaStats | MlbBatterStats,
  config: ScoringConfig,
  positionType: 'qb' | 'skill' | 'dst' | 'nba' | 'mlb-batter',
  format?: ScoringFormat
): number {
  switch (positionType) {
    case 'qb':
      return scoreNflQb(stats as NflQbStats, config)
    case 'skill':
      return scoreNflSkill(stats as NflSkillStats, config, format)
    case 'dst':
      return scoreNflDst(stats as NflDstStats, config)
    case 'nba':
      return scoreNba(stats as NbaStats, config)
    case 'mlb-batter':
      return scoreMlbBatter(stats as MlbBatterStats, config)
  }
}

/**
 * Points per $1000 of salary, rounded to 2 decimal places.
 */
export function valueScore(projectedPoints: number, salary: number): number {
  if (salary === 0) return 0
  return round2((projectedPoints / salary) * 1000)
}

/**
 * Greedy knapsack lineup optimizer.
 *
 * Sorts players by value score descending, greedily fills position requirements.
 * Returns null if requirements cannot be met within the salary cap.
 */
export function optimalLineup(
  players: Array<{
    id: string
    position: string
    salary: number
    projectedPoints: number
  }>,
  salaryCap: number,
  requirements: Record<string, number>
): { players: string[]; totalSalary: number; totalPoints: number } | null {
  // Sort by value score descending
  const sorted = [...players].sort(
    (a, b) =>
      valueScore(b.projectedPoints, b.salary) -
      valueScore(a.projectedPoints, a.salary)
  )

  const selected: typeof players = []
  const remaining = { ...requirements }
  let totalSalary = 0

  for (const player of sorted) {
    const pos = player.position.toUpperCase()
    if ((remaining[pos] ?? 0) > 0 && totalSalary + player.salary <= salaryCap) {
      selected.push(player)
      remaining[pos] -= 1
      totalSalary += player.salary
    }
  }

  // Check all requirements were filled
  for (const [pos, count] of Object.entries(remaining)) {
    if (count > 0) return null
  }

  // Final cap check
  if (totalSalary > salaryCap) return null

  const totalPoints = round2(selected.reduce((s, p) => s + p.projectedPoints, 0))

  return {
    players: selected.map(p => p.id),
    totalSalary,
    totalPoints,
  }
}

// ---------------------------------------------------------------------------
// Format utilities
// ---------------------------------------------------------------------------

/**
 * Format a fantasy point total as "12.50 pts".
 * Negative values include a minus sign: "-3.00 pts"
 */
export function formatFantasyPoints(points: number): string {
  return `${points.toFixed(2)} pts`
}

// ---------------------------------------------------------------------------
// QB Scoring Summary
// ---------------------------------------------------------------------------

/**
 * Line-by-line breakdown of QB scoring contributions.
 * Only returns rows where points !== 0.
 */
export function scoringSummary(
  stats: NflQbStats,
  config: ScoringConfig
): Array<{ stat: string; value: number; points: number }> {
  const { platform } = config
  const rows: Array<{ stat: string; value: number; points: number }> = []

  function addRow(stat: string, value: number, pts: number): void {
    if (pts !== 0) rows.push({ stat, value, points: round2(pts) })
  }

  addRow('Passing Yards', stats.passingYards, stats.passingYards / 25)
  addRow('Passing TDs', stats.passingTDs, stats.passingTDs * 4)

  const intPenalty =
    platform === 'draftkings' || platform === 'fanduel' ? -1 : -2
  addRow('Interceptions', stats.interceptions, stats.interceptions * intPenalty)

  addRow('Rushing Yards', stats.rushingYards, stats.rushingYards / 10)
  addRow('Rushing TDs', stats.rushingTDs, stats.rushingTDs * 6)

  const fumblePenalty = platform === 'draftkings' ? -1 : -2
  addRow('Fumbles Lost', stats.fumblesLost, stats.fumblesLost * fumblePenalty)

  if (platform === 'draftkings' || platform === 'fanduel') {
    addRow(
      '2-Point Conversions',
      stats.twoPointConversions ?? 0,
      (stats.twoPointConversions ?? 0) * 2
    )
  }

  // DK bonuses
  if (platform === 'draftkings') {
    if (stats.passingYards >= 300) addRow('Bonus 300+ Pass Yds', 1, 3)
    if (stats.passingYards >= 400) addRow('Bonus 400+ Pass Yds', 1, 3)
    if (stats.rushingYards >= 100) addRow('Bonus 100+ Rush Yds', 1, 3)
  } else if (platform === 'fanduel') {
    if (stats.passingYards >= 300) addRow('Bonus 300+ Pass Yds', 1, 3)
  }

  return rows
}

// ---------------------------------------------------------------------------
// Live projection (partial stats → full-game projection)
// ---------------------------------------------------------------------------

/**
 * Scale partial NFL QB stats to a full-game projection.
 *
 * @param currentStats  Partial QB stats from live game
 * @param minutesPlayed Minutes of game time elapsed
 * @param totalMinutes  Total game length (default 60)
 */
export function liveProjection(
  currentStats: Partial<NflQbStats>,
  minutesPlayed: number,
  totalMinutes = 60
): NflQbStats {
  if (minutesPlayed <= 0) {
    return {
      passingYards: 0,
      passingTDs: 0,
      interceptions: 0,
      rushingYards: 0,
      rushingTDs: 0,
      fumblesLost: 0,
      completions: 0,
      attempts: 0,
      twoPointConversions: 0,
    }
  }

  const scale = totalMinutes / minutesPlayed

  const projectStat = (v: number | undefined): number =>
    Math.round((v ?? 0) * scale)

  return {
    passingYards: projectStat(currentStats.passingYards),
    passingTDs: projectStat(currentStats.passingTDs),
    interceptions: projectStat(currentStats.interceptions),
    rushingYards: projectStat(currentStats.rushingYards),
    rushingTDs: projectStat(currentStats.rushingTDs),
    fumblesLost: projectStat(currentStats.fumblesLost),
    completions: projectStat(currentStats.completions),
    attempts: projectStat(currentStats.attempts),
    twoPointConversions: projectStat(currentStats.twoPointConversions),
    bonusOver300: currentStats.bonusOver300,
  }
}

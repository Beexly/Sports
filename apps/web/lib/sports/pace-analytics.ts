/**
 * Pace and efficiency analytics for basketball and sports analytics.
 *
 * Pure TypeScript — no npm dependencies. All functions are individually exported.
 * Implements possession estimation, pace, four factors, shot quality,
 * offensive/defensive ratings, usage rate, BPM, and related analytics.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type Sport = 'NBA' | 'NCAAB' | 'NFL' | 'NHL'

export interface NbaPossessions {
  fga: number    // field goal attempts
  fta: number    // free throw attempts
  fgm: number    // field goals made
  oreb: number   // offensive rebounds
  to: number     // turnovers
  minutes?: number  // game minutes (default 48 for team)
}

export interface NbaBoxScore {
  teamId: string
  pts: number
  fgm: number
  fga: number
  fg3m: number   // 3-pointers made
  fg3a: number   // 3-pointers attempted
  ftm: number    // free throws made
  fta: number    // free throw attempts
  oreb: number
  dreb: number
  ast: number
  to: number
  stl: number
  blk: number
  pf: number     // personal fouls
  minutes: number  // total team minutes (typically 240 for 48 min game with 5 players)
}

export interface FourFactors {
  teamId: string
  efgPct: number   // effective field goal %: (FGM + 0.5*3PM) / FGA
  tovPct: number   // turnover %: TO / (FGA + 0.44*FTA + TO)
  orbPct: number   // offensive rebound %: OReb / (OReb + OppDReb)
  ftRate: number   // free throw rate: FTM / FGA
}

export interface PaceMetrics {
  teamId: string
  possessions: number   // estimated possessions
  pace: number          // possessions per 40 (college) or 48 (NBA) minutes
  ortg: number          // offensive rating: pts per 100 possessions
  drtg?: number         // defensive rating: pts allowed per 100 possessions
  netRtg?: number       // ortg - drtg
}

export interface ShotQuality {
  location: '3pt' | 'mid-range' | 'rim' | 'free-throw'
  fga: number
  fgm: number
  ptsPerShot: number  // (fgm * points) / fga
  frequency: number   // fga / totalFga
  efg: number         // effective FG%
}

// ── Possession Estimation ──────────────────────────────────────────────────

/**
 * Estimate possessions for one team using Dean Oliver's approximation.
 * Formula: FGA - OREB + TO + 0.44 * FTA
 */
export function estimatePossessions(stats: NbaPossessions): number {
  return stats.fga - stats.oreb + stats.to + 0.44 * stats.fta
}

/**
 * More accurate possession estimate using both teams' stats.
 * Averages each team's independent estimate.
 */
export function gamePossessions(home: NbaPossessions, away: NbaPossessions): number {
  return (estimatePossessions(home) + estimatePossessions(away)) / 2
}

// ── Pace ──────────────────────────────────────────────────────────────────

/**
 * Pace = possessions per standardMinutes of play.
 * NBA standard: 240 (48 min * 5 players). NCAAB: 200 (40 min * 5 players).
 */
export function pace(
  poss: number,
  minutesPlayed: number,
  standardMinutes: number = 240,
): number {
  if (minutesPlayed === 0) return 0
  return (poss * standardMinutes) / minutesPlayed
}

// ── Ratings ───────────────────────────────────────────────────────────────

/**
 * Offensive rating: points scored per 100 possessions.
 */
export function ortg(points: number, poss: number): number {
  if (poss === 0) return 0
  return (points / poss) * 100
}

/**
 * Defensive rating: points allowed per 100 possessions.
 */
export function drtg(pointsAllowed: number, poss: number): number {
  if (poss === 0) return 0
  return (pointsAllowed / poss) * 100
}

/**
 * Net rating: offensive rating minus defensive rating.
 */
export function netRtg(ortgValue: number, drtgValue: number): number {
  return ortgValue - drtgValue
}

// ── Composite Metrics ─────────────────────────────────────────────────────

/**
 * Compute all pace metrics for a team given both teams' box scores.
 */
export function computePaceMetrics(
  team: NbaBoxScore,
  opponent: NbaBoxScore,
): PaceMetrics {
  const homePoss: NbaPossessions = {
    fga: team.fga,
    fta: team.fta,
    fgm: team.fgm,
    oreb: team.oreb,
    to: team.to,
  }
  const awayPoss: NbaPossessions = {
    fga: opponent.fga,
    fta: opponent.fta,
    fgm: opponent.fgm,
    oreb: opponent.oreb,
    to: opponent.to,
  }
  const possessions = gamePossessions(homePoss, awayPoss)
  const teamPace = pace(possessions, team.minutes)
  const teamOrtg = ortg(team.pts, possessions)
  const teamDrtg = drtg(opponent.pts, possessions)
  const teamNetRtg = netRtg(teamOrtg, teamDrtg)

  return {
    teamId: team.teamId,
    possessions,
    pace: teamPace,
    ortg: teamOrtg,
    drtg: teamDrtg,
    netRtg: teamNetRtg,
  }
}

/**
 * Compute Dean Oliver's Four Factors for a team.
 */
export function computeFourFactors(
  team: NbaBoxScore,
  opponent: NbaBoxScore,
): FourFactors {
  const efgPct =
    team.fga > 0 ? (team.fgm + 0.5 * team.fg3m) / team.fga : 0
  const tovDenominator = team.fga + 0.44 * team.fta + team.to
  const tovPct = tovDenominator > 0 ? team.to / tovDenominator : 0
  const orbDenominator = team.oreb + opponent.dreb
  const orbPct = orbDenominator > 0 ? team.oreb / orbDenominator : 0
  const ftRate = team.fga > 0 ? team.ftm / team.fga : 0

  return {
    teamId: team.teamId,
    efgPct,
    tovPct,
    orbPct,
    ftRate,
  }
}

// ── Efficiency Comparison ─────────────────────────────────────────────────

/**
 * Compare efficiency between two teams, computing pace metrics, four factors,
 * and identifying categorical edges.
 */
export function compareEfficiency(
  teamA: { box: NbaBoxScore; opponent: NbaBoxScore; teamName: string },
  teamB: { box: NbaBoxScore; opponent: NbaBoxScore; teamName: string },
): {
  teamA: PaceMetrics & FourFactors & { name: string }
  teamB: PaceMetrics & FourFactors & { name: string }
  edgeTeamA: string[]
  edgeTeamB: string[]
} {
  const metricsA = computePaceMetrics(teamA.box, teamA.opponent)
  const metricsB = computePaceMetrics(teamB.box, teamB.opponent)
  const factorsA = computeFourFactors(teamA.box, teamA.opponent)
  const factorsB = computeFourFactors(teamB.box, teamB.opponent)

  const resultA = { ...metricsA, ...factorsA, name: teamA.teamName }
  const resultB = { ...metricsB, ...factorsB, name: teamB.teamName }

  const edgeTeamA: string[] = []
  const edgeTeamB: string[] = []

  // Net rating edge
  const netA = metricsA.netRtg ?? 0
  const netB = metricsB.netRtg ?? 0
  if (netA > netB) edgeTeamA.push('netRtg')
  else if (netB > netA) edgeTeamB.push('netRtg')

  // Four factors edges (higher is better for efgPct, orbPct, ftRate; lower is better for tovPct)
  if (factorsA.efgPct > factorsB.efgPct) edgeTeamA.push('efgPct')
  else if (factorsB.efgPct > factorsA.efgPct) edgeTeamB.push('efgPct')

  if (factorsA.tovPct < factorsB.tovPct) edgeTeamA.push('tovPct')
  else if (factorsB.tovPct < factorsA.tovPct) edgeTeamB.push('tovPct')

  if (factorsA.orbPct > factorsB.orbPct) edgeTeamA.push('orbPct')
  else if (factorsB.orbPct > factorsA.orbPct) edgeTeamB.push('orbPct')

  if (factorsA.ftRate > factorsB.ftRate) edgeTeamA.push('ftRate')
  else if (factorsB.ftRate > factorsA.ftRate) edgeTeamB.push('ftRate')

  return { teamA: resultA, teamB: resultB, edgeTeamA, edgeTeamB }
}

// ── Shooting Efficiency ───────────────────────────────────────────────────

/**
 * True Shooting Percentage: points / (2 * (FGA + 0.44 * FTA))
 */
export function trueShooting(pts: number, fga: number, fta: number): number {
  const denominator = 2 * (fga + 0.44 * fta)
  if (denominator === 0) return 0
  return pts / denominator
}

/**
 * Assist-to-turnover ratio. Returns Infinity if turnovers = 0; 0 if both = 0.
 */
export function astToRatio(ast: number, to: number): number {
  if (ast === 0 && to === 0) return 0
  if (to === 0) return Infinity
  return ast / to
}

// ── Usage Rate ────────────────────────────────────────────────────────────

/**
 * Usage Rate: percentage of team possessions used by a player while on the floor.
 * Usage = 100 * ((FGA + 0.44*FTA + TO) * (teamMinutes / 5)) / (playerMinutes * teamPoss)
 */
export function usageRate(
  fga: number,
  fta: number,
  to: number,
  teamMinutes: number,
  playerMinutes: number,
  teamPoss: number,
): number {
  if (playerMinutes === 0 || teamPoss === 0) return 0
  const playerProduction = fga + 0.44 * fta + to
  return (100 * (playerProduction * (teamMinutes / 5))) / (playerMinutes * teamPoss)
}

// ── Box Plus/Minus ─────────────────────────────────────────────────────────

/**
 * Simplified Box Plus/Minus (BPM) approximation.
 * Clamped to [-15, 30].
 */
export function boxScoreComponents(player: {
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  to: number
  fga: number
  fta: number
  fg3m?: number
  teamPoss: number
  oppPoss: number
  minutesPlayed: number
  teamMinutes: number
}): number {
  const {
    pts,
    reb,
    ast,
    stl,
    blk,
    to,
    fga,
    fta,
    teamPoss,
    minutesPlayed,
    teamMinutes,
  } = player

  const rawScore =
    pts + 0.75 * reb + 1.5 * ast + 1.5 * stl + 1.0 * blk - 1.5 * to

  const possShare =
    teamMinutes > 0 ? minutesPlayed / teamMinutes : 0
  const playerPoss = teamPoss > 0 ? teamPoss * possShare : 1
  const usageWeight = (fga + 0.44 * fta + to) / playerPoss

  // Avoid division by zero
  const bpm = usageWeight !== 0 ? rawScore / usageWeight : rawScore

  return Math.min(30, Math.max(-15, bpm))
}

// ── Shot Quality ──────────────────────────────────────────────────────────

/** Points value per shot location */
const LOCATION_POINTS: Record<ShotQuality['location'], number> = {
  '3pt': 3,
  'mid-range': 2,
  'rim': 2,
  'free-throw': 1,
}

/**
 * Break down an array of individual shots by location, computing
 * fga, fgm, ptsPerShot, frequency, and efg for each zone.
 */
export function shotQualityBreakdown(
  shots: Array<{ location: ShotQuality['location']; made: boolean }>,
): ShotQuality[] {
  const totalFga = shots.length

  // Aggregate by location
  const grouped = new Map<
    ShotQuality['location'],
    { fga: number; fgm: number }
  >()

  for (const shot of shots) {
    const existing = grouped.get(shot.location) ?? { fga: 0, fgm: 0 }
    grouped.set(shot.location, {
      fga: existing.fga + 1,
      fgm: existing.fgm + (shot.made ? 1 : 0),
    })
  }

  const result: ShotQuality[] = []
  for (const [location, counts] of grouped.entries()) {
    const { fga, fgm } = counts
    const pts = LOCATION_POINTS[location]
    const ptsPerShot = fga > 0 ? (fgm * pts) / fga : 0
    const frequency = totalFga > 0 ? fga / totalFga : 0
    // EFG: for 3pt, weight made shots at 1.5x; for others, simple FG%
    const efg =
      location === '3pt'
        ? fga > 0
          ? (fgm * 1.5) / fga
          : 0
        : fga > 0
        ? fgm / fga
        : 0

    result.push({ location, fga, fgm, ptsPerShot, frequency, efg })
  }

  return result
}

// ── Offensive Breakdown ───────────────────────────────────────────────────

/**
 * Compute a team's offensive composition ratios from a box score.
 */
export function offensiveBreakdown(box: NbaBoxScore): {
  threePointRate: number
  midRangeRate: number
  rimRate: number
  freeThrowRate: number
  assistRate: number
  turnoverRate: number
} {
  const totalShots = box.fga + box.fta
  const threePointRate = box.fga > 0 ? box.fg3a / box.fga : 0
  // Estimated rim attempts: 35% of non-3pt field goal attempts
  const nonThreeFga = box.fga - box.fg3a
  const rimAttempts = nonThreeFga * 0.35
  const rimRate = box.fga > 0 ? rimAttempts / box.fga : 0
  // Mid-range: what's left after 3pt and rim
  const midRangeFga = nonThreeFga - rimAttempts
  const midRangeRate = box.fga > 0 ? midRangeFga / box.fga : 0
  const freeThrowRate = totalShots > 0 ? box.fta / totalShots : 0
  const assistRate = box.fgm > 0 ? box.ast / box.fgm : 0
  const tovDenominator = box.fga + 0.44 * box.fta + box.to
  const turnoverRate = tovDenominator > 0 ? box.to / tovDenominator : 0

  return {
    threePointRate,
    midRangeRate,
    rimRate,
    freeThrowRate,
    assistRate,
    turnoverRate,
  }
}

// ── Pace Classification ───────────────────────────────────────────────────

/**
 * Classify pace into qualitative tiers based on sport.
 */
export function paceClassification(
  paceValue: number,
  sport: Sport = 'NBA',
): 'slow' | 'moderate' | 'fast' | 'very-fast' {
  switch (sport) {
    case 'NCAAB':
      if (paceValue < 65) return 'slow'
      if (paceValue < 70) return 'moderate'
      if (paceValue <= 75) return 'fast'
      return 'very-fast'
    case 'NFL':
      if (paceValue < 55) return 'slow'
      if (paceValue < 62) return 'moderate'
      if (paceValue <= 70) return 'fast'
      return 'very-fast'
    case 'NBA':
    case 'NHL':
    default:
      if (paceValue < 95) return 'slow'
      if (paceValue < 100) return 'moderate'
      if (paceValue <= 105) return 'fast'
      return 'very-fast'
  }
}

// ── Expected Points Per Possession ───────────────────────────────────────

/**
 * Weighted average expected points per possession from a shot quality breakdown.
 * sum(fga_i * pts_i * fgPct_i) / sum(fga_i)
 */
export function expectedPPP(shots: ShotQuality[]): number {
  const totalFga = shots.reduce((acc, s) => acc + s.fga, 0)
  if (totalFga === 0) return 0

  const weightedPts = shots.reduce((acc, s) => {
    const fgPct = s.fga > 0 ? s.fgm / s.fga : 0
    const ptsValue = LOCATION_POINTS[s.location]
    return acc + s.fga * ptsValue * fgPct
  }, 0)

  return weightedPts / totalFga
}

// ── Adjusted Efficiency ───────────────────────────────────────────────────

/**
 * Adjusted offensive rating accounting for opponent defensive strength.
 * = teamOrtg * leagueAvgOrtg / opponentDrtg
 */
export function adjustedOrtg(
  teamOrtg: number,
  leagueAvgOrtg: number,
  opponentDrtg: number,
): number {
  if (opponentDrtg === 0) return 0
  return (teamOrtg * leagueAvgOrtg) / opponentDrtg
}

// ── Floor Percentage ──────────────────────────────────────────────────────

/**
 * Floor percentage: fraction of possessions that result in points.
 * Clamped to [0, 1].
 */
export function floorPct(poss: number, scoringPoss: number): number {
  if (poss === 0) return 0
  return Math.min(1, Math.max(0, scoringPoss / poss))
}

// ── Second Chance Rate ────────────────────────────────────────────────────

/**
 * How often offensive rebounds lead to extra possessions.
 * oreb / fgaMissed
 */
export function secondChanceRate(oreb: number, fgaMissed: number): number {
  if (fgaMissed === 0) return 0
  return oreb / fgaMissed
}

// ── Transition Rate ───────────────────────────────────────────────────────

/**
 * Rough proxy for transition opportunity rate.
 * (stl + blk/3) / totalPoss
 */
export function transitionRate(
  stl: number,
  blk: number,
  totalPoss: number,
): number {
  if (totalPoss === 0) return 0
  return (stl + blk / 3) / totalPoss
}

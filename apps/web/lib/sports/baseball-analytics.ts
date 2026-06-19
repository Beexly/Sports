/**
 * baseball-analytics.ts
 * Pure TypeScript baseball sabermetrics library — zero npm dependencies.
 * Covers batting, pitching, fielding, WAR components, park factors, advanced
 * sabermetrics, DraftKings fantasy scoring, and lineup/matchup analytics.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BatterLine {
  atBats: number
  hits: number
  doubles: number
  triples: number
  homeRuns: number
  walks: number
  intentionalWalks?: number
  hitByPitch: number
  sacrificeFlies: number
  strikeouts: number
  stolenBases?: number
  caughtStealing?: number
}

export interface PitcherLine {
  inningsPitched: number
  earnedRuns: number
  hits: number
  walks: number
  strikeouts: number
  homeRunsAllowed: number
  hitBatters?: number
  flyBalls?: number
  groundBalls?: number
}

export interface TeamOffenseStats {
  runs: number
  hits: number
  doubles: number
  triples: number
  homeRuns: number
  walks: number
  hitByPitch: number
  sacrificeFlies: number
  atBats: number
  plateAppearances: number
}

// ---------------------------------------------------------------------------
// wOBA weights (2023-era standard)
// ---------------------------------------------------------------------------

export const WOBA_WEIGHTS = {
  uBB: 0.690,
  HBP: 0.722,
  single: 0.888,
  double: 1.271,
  triple: 1.616,
  HR: 2.101,
  wOBAScale: 1.157,
} as const

// ---------------------------------------------------------------------------
// Utility: convert fractional IP (e.g. 7.2 = 7 and 2/3) to true decimal
// ---------------------------------------------------------------------------

function ipToDecimal(ip: number): number {
  const full = Math.floor(ip)
  const frac = Math.round((ip - full) * 10) // outs: 0, 1, or 2
  return full + frac / 3
}

// ---------------------------------------------------------------------------
// 1. Batting statistics
// ---------------------------------------------------------------------------

/** H / AB */
export function battingAverage(hits: number, atBats: number): number {
  if (atBats <= 0) return 0
  return hits / atBats
}

/** (H + BB + HBP) / (AB + BB + HBP + SF) */
export function onBasePercentage(
  hits: number,
  walks: number,
  hbp: number,
  atBats: number,
  sacrificeFlies: number,
): number {
  const denominator = atBats + walks + hbp + sacrificeFlies
  if (denominator <= 0) return 0
  return (hits + walks + hbp) / denominator
}

/** Total bases / AB — TB = 1B + 2B*2 + 3B*3 + HR*4 */
export function sluggingPercentage(
  singles: number,
  doubles: number,
  triples: number,
  homeRuns: number,
  atBats: number,
): number {
  if (atBats <= 0) return 0
  const tb = singles * 1 + doubles * 2 + triples * 3 + homeRuns * 4
  return tb / atBats
}

/** OBP + SLG */
export function ops(obp: number, slg: number): number {
  return obp + slg
}

/**
 * Weighted On-Base Average (2023 weights).
 * wOBA = (uBB*0.69 + HBP*0.72 + 1B*0.89 + 2B*1.27 + 3B*1.61 + HR*2.10) / PA
 */
export function wOBA(
  uBB: number,
  hbp: number,
  singles: number,
  doubles: number,
  triples: number,
  homeRuns: number,
  pa: number,
): number {
  if (pa <= 0) return 0
  return (
    0.69 * uBB +
    0.72 * hbp +
    0.89 * singles +
    1.27 * doubles +
    1.61 * triples +
    2.10 * homeRuns
  ) / pa
}

/**
 * wRC+ = ((wOBA - leagueWOBA) / wOBAscale + leagueRPPA) / (leagueRPPA * parkFactor) * 100
 */
export function wRCPlus(
  wobaStat: number,
  leagueWOBA: number,
  wOBAscale: number,
  leagueRPPA: number,
  parkFactor: number,
): number {
  if (wOBAscale <= 0 || leagueRPPA <= 0 || parkFactor <= 0) return 0
  return (
    ((wobaStat - leagueWOBA) / wOBAscale + leagueRPPA) /
    (leagueRPPA * parkFactor) *
    100
  )
}

/** (H - HR) / (AB - K - HR + SF) */
export function BABIP(
  hits: number,
  homeRuns: number,
  atBats: number,
  strikeouts: number,
  sacrificeFlies: number,
): number {
  const denominator = atBats - strikeouts - homeRuns + sacrificeFlies
  if (denominator <= 0) return 0
  return (hits - homeRuns) / denominator
}

/** SLG - AVG */
export function isolatedPower(slg: number, avg: number): number {
  return slg - avg
}

/**
 * Speed score (Bill James–style).
 * ((SB/(SB+CS) - 0.4) / 0.1 + sqrt(SB*3/games) / 0.04 + (triples/singles) / 0.04) / 3
 * Clamped to [0, 10].
 */
export function speedScore(
  sb: number,
  cs: number,
  singles: number,
  triples: number,
  games: number,
): number {
  if (games <= 0) return 0
  const attempts = sb + cs
  const comp1 = attempts > 0 ? (sb / attempts - 0.4) / 0.1 : -4
  const comp2 = Math.sqrt((sb * 3) / games) / 0.04
  const comp3 = singles > 0 ? (triples / singles) / 0.04 : 0
  const raw = (comp1 + comp2 + comp3) / 3
  return Math.max(0, Math.min(10, raw))
}

/** contacts / swings; 0 if no swings */
export function contactRate(inPlayContacts: number, totalSwings: number): number {
  if (totalSwings <= 0) return 0
  return inPlayContacts / totalSwings
}

/** walks / PA */
export function walkRate(walks: number, pa: number): number {
  if (pa <= 0) return 0
  return walks / pa
}

/** strikeouts / PA */
export function strikeoutRate(strikeouts: number, pa: number): number {
  if (pa <= 0) return 0
  return strikeouts / pa
}

// ---------------------------------------------------------------------------
// 2. Pitching statistics
// ---------------------------------------------------------------------------

/** (ER / IP) * 9 */
export function ERA(earnedRuns: number, inningsPitched: number): number {
  const ip = ipToDecimal(inningsPitched)
  if (ip <= 0) return 0
  return (earnedRuns / ip) * 9
}

/** (BB + H) / IP */
export function WHIP(walks: number, hits: number, inningsPitched: number): number {
  const ip = ipToDecimal(inningsPitched)
  if (ip <= 0) return 0
  return (walks + hits) / ip
}

/**
 * FIP = ((13*HR + 3*(BB+HBP) - 2*K) / IP) + constant
 * Default constant = 3.15.
 */
export function FIP(
  homeRuns: number,
  walks: number,
  hbp: number,
  strikeouts: number,
  inningsPitched: number,
  fipConstant = 3.15,
): number {
  const ip = ipToDecimal(inningsPitched)
  if (ip <= 0) return 0
  return (13 * homeRuns + 3 * (walks + hbp) - 2 * strikeouts) / ip + fipConstant
}

/**
 * xFIP — like FIP but replaces HR with expected HR = flyBalls * leagueFBHRRate.
 * Default leagueFBHRRate = 0.103; constant = 3.15.
 */
export function xFIP(
  flyBalls: number,
  walks: number,
  hbp: number,
  strikeouts: number,
  inningsPitched: number,
  leagueFBHRRate = 0.103,
): number {
  const ip = ipToDecimal(inningsPitched)
  if (ip <= 0) return 0
  const expectedHR = flyBalls * leagueFBHRRate
  return (13 * expectedHR + 3 * (walks + hbp) - 2 * strikeouts) / ip + 3.15
}

/**
 * SIERA (simplified).
 * 6.145 - 16.986*(K-BB)/IP + 11.434*GB/IP - 1.858*(K/IP)²
 */
export function SIERA(
  strikeouts: number,
  walks: number,
  groundBalls: number,
  flyBalls: number,
  inningsPitched: number,
): number {
  void flyBalls
  const ip = ipToDecimal(inningsPitched)
  if (ip <= 0) return 0
  const kMinusBBperIP = (strikeouts - walks) / ip
  const gbPerIP = groundBalls / ip
  const kPerIP = strikeouts / ip
  return (
    6.145 -
    16.986 * kMinusBBperIP +
    11.434 * gbPerIP -
    1.858 * (kPerIP * kPerIP)
  )
}

/** (K / IP) * 9 */
export function strikeoutsPer9(strikeouts: number, inningsPitched: number): number {
  const ip = ipToDecimal(inningsPitched)
  if (ip <= 0) return 0
  return (strikeouts / ip) * 9
}

/** (BB / IP) * 9 */
export function walksPer9(walks: number, inningsPitched: number): number {
  const ip = ipToDecimal(inningsPitched)
  if (ip <= 0) return 0
  return (walks / ip) * 9
}

/**
 * K/BB ratio.
 * Infinity if walks=0 and K>0; 0 if both 0.
 */
export function kBBRatio(strikeouts: number, walks: number): number {
  if (walks <= 0) return strikeouts > 0 ? Infinity : 0
  return strikeouts / walks
}

/** groundBalls / totalBallsInPlay */
export function groundBallRate(groundBalls: number, totalBallsInPlay: number): number {
  if (totalBallsInPlay <= 0) return 0
  return groundBalls / totalBallsInPlay
}

/** flyBalls / totalBallsInPlay */
export function flyBallRate(flyBalls: number, totalBallsInPlay: number): number {
  if (totalBallsInPlay <= 0) return 0
  return flyBalls / totalBallsInPlay
}

/** lineDrives / totalBallsInPlay */
export function lineDriveRate(lineDrives: number, totalBallsInPlay: number): number {
  if (totalBallsInPlay <= 0) return 0
  return lineDrives / totalBallsInPlay
}

// ---------------------------------------------------------------------------
// 3. Fielding and defense
// ---------------------------------------------------------------------------

/** (PO + A) / (PO + A + E) */
export function fieldingPercentage(
  putouts: number,
  assists: number,
  errors: number,
): number {
  const total = putouts + assists + errors
  if (total <= 0) return 0
  return (putouts + assists) / total
}

/** outs / BIP */
export function defensiveEfficiencyRatio(ballsInPlay: number, outs: number): number {
  if (ballsInPlay <= 0) return 0
  return outs / ballsInPlay
}

/**
 * UZR = (plays - expectedPlays) * runValue
 * Default runValue = 0.8 runs per play.
 */
export function ultimateZoneRating(
  plays: number,
  expectedPlays: number,
  runValue = 0.8,
): number {
  return (plays - expectedPlays) * runValue
}

/** (PO + A - E) - expectedPuts */
export function totalZone(
  putouts: number,
  assists: number,
  errors: number,
  expectedPuts: number,
): number {
  return (putouts + assists - errors) - expectedPuts
}

// ---------------------------------------------------------------------------
// 4. WAR components
// ---------------------------------------------------------------------------

/**
 * WAR = (offense + defense + positional - replacement) / runsPerWin
 * Default runsPerWin = 10.
 */
export function winsAboveReplacement(
  offenseRuns: number,
  defenseRuns: number,
  positionalAdjustment: number,
  replacementRuns: number,
  runsPerWin = 10,
): number {
  if (runsPerWin <= 0) return 0
  return (offenseRuns + defenseRuns + positionalAdjustment - replacementRuns) / runsPerWin
}

/** (wOBA - leagueWOBA) / wOBAscale * PA */
export function offensiveRunsAboveAverage(
  wobaStat: number,
  leagueWOBA: number,
  wOBAscale: number,
  pa: number,
): number {
  if (wOBAscale <= 0) return 0
  return ((wobaStat - leagueWOBA) / wOBAscale) * pa
}

/**
 * Defensive Runs Saved.
 * (plays - leagueAvgPlays) * runsPerPlay; default runsPerPlay = 0.8.
 */
export function defensiveRunsSaved(
  plays: number,
  leagueAvgPlays: number,
  runsPerPlay = 0.8,
): number {
  return (plays - leagueAvgPlays) * runsPerPlay
}

/**
 * Replacement runs differential.
 * pa * replacementLevel; default replacementLevel = -0.02 runs/PA.
 */
export function replacementRunsDifferential(pa: number, replacementLevel = -0.02): number {
  return pa * replacementLevel
}

// ---------------------------------------------------------------------------
// 5. Park factors and adjustments
// ---------------------------------------------------------------------------

/** (homeR/homeG) / (awayR/awayG) */
export function parkFactor(
  homeRunsScored: number,
  awayRunsScored: number,
  homeGames: number,
  awayGames: number,
): number {
  if (homeGames <= 0 || awayGames <= 0) return 1.0
  const homeRate = homeRunsScored / homeGames
  const awayRate = awayRunsScored / awayGames
  if (awayRate <= 0) return 1.0
  return homeRate / awayRate
}

/**
 * Regression to mean: (rawParkFactor * years + 1.0) / (years + 1)
 * Default years = 3.
 */
export function adjustedParkFactor(rawParkFactor: number, years = 3): number {
  return (rawParkFactor * years + 1.0) / (years + 1)
}

/**
 * 1 + (elevationFeet / 5280) * 0.04
 * (4% boost per mile above sea level)
 */
export function altitudeAdjustment(elevationFeet: number): number {
  return 1 + (elevationFeet / 5280) * 0.04
}

// ---------------------------------------------------------------------------
// 6. Sabermetric advanced
// ---------------------------------------------------------------------------

/**
 * RS^exp / (RS^exp + RA^exp)
 * Default exponent = 1.83.
 */
export function pythagoreanWinPct(
  runsScored: number,
  runsAllowed: number,
  exponent = 1.83,
): number {
  if (runsScored <= 0 && runsAllowed <= 0) return 0.5
  if (runsScored <= 0) return 0
  if (runsAllowed <= 0) return 1
  const rsExp = Math.pow(runsScored, exponent)
  const raExp = Math.pow(runsAllowed, exponent)
  return rsExp / (rsExp + raExp)
}

/**
 * Simplified BaseRuns formula.
 * A = H + BB + HBP - HR (baserunners)
 * B = (1.4*(1B + 2*2B + 4*3B + BB + HBP) - 0.6*1B - 3*3B + 0.1*(BB+HBP) + 0.9*HR) / 1
 * C = AB - K - HR + SF (use SF=0 since not in signature)
 * BaseRuns = A*B/(B+C) + HR
 */
export function baseRuns(
  singles: number,
  doubles: number,
  triples: number,
  homeRuns: number,
  walks: number,
  hbp: number,
  atBats: number,
  strikeouts: number,
): number {
  const h = singles + doubles + triples + homeRuns
  const A = h + walks + hbp - homeRuns
  const B =
    1.4 * (singles + doubles * 2 + triples * 4 + walks + hbp) -
    0.6 * singles -
    3 * triples +
    0.1 * (walks + hbp) +
    0.9 * homeRuns
  const C = atBats - strikeouts - homeRuns // SF = 0
  const bPlusC = B + C
  if (bPlusC <= 0) return homeRuns
  return (A * B) / bPlusC + homeRuns
}

/**
 * Linear Weights Runs.
 * 0.47*1B + 0.78*2B + 1.09*3B + 1.40*HR + 0.33*BB - 0.09*outs
 */
export function linearWeightsRuns(
  singles: number,
  doubles: number,
  triples: number,
  homeRuns: number,
  walks: number,
  outs: number,
): number {
  return (
    0.47 * singles +
    0.78 * doubles +
    1.09 * triples +
    1.40 * homeRuns +
    0.33 * walks -
    0.09 * outs
  )
}

/**
 * Defensive Runs Saved.
 * (plays - expectedPlays) * runsPerPlay; default runsPerPlay = 0.8.
 */
export function dRS(
  plays: number,
  expectedPlays: number,
  runsPerPlay = 0.8,
): number {
  return (plays - expectedPlays) * runsPerPlay
}

// ---------------------------------------------------------------------------
// 7. Fantasy baseball scoring (DraftKings)
// ---------------------------------------------------------------------------

export interface DKBattingStats {
  singles: number
  doubles: number
  triples: number
  homeRuns: number
  rbi: number
  runs: number
  walks: number
  hbp: number
  stolenBases: number
  caughtStealing: number
}

export interface DKPitchingStats {
  inningsPitched: number
  strikeouts: number
  wins: number
  earnedRuns: number
  hits: number
  walks: number
  hbp: number
  completeGame: number
  noHitter: number
}

/**
 * DraftKings batting fantasy score.
 * 3*1B + 5*2B + 8*3B + 10*HR + 3.5*RBI + 3.2*R + 3*BB + 3*HBP + 6*SB - 3*CS
 */
export function dkBattingScore(stats: DKBattingStats): number {
  return (
    3 * stats.singles +
    5 * stats.doubles +
    8 * stats.triples +
    10 * stats.homeRuns +
    3.5 * stats.rbi +
    3.2 * stats.runs +
    3 * stats.walks +
    3 * stats.hbp +
    6 * stats.stolenBases -
    3 * stats.caughtStealing
  )
}

/**
 * DraftKings pitching fantasy score.
 * 2.25*IP + 2*K + 4*W - 2*ER - 0.6*H - 0.6*BB - 0.6*HBP + 2.5*CG + 5*NH
 */
export function dkPitchingScore(stats: DKPitchingStats): number {
  return (
    2.25 * stats.inningsPitched +
    2 * stats.strikeouts +
    4 * stats.wins -
    2 * stats.earnedRuns -
    0.6 * stats.hits -
    0.6 * stats.walks -
    0.6 * stats.hbp +
    2.5 * stats.completeGame +
    5 * stats.noHitter
  )
}

// ---------------------------------------------------------------------------
// 8. Lineup and matchup analytics
// ---------------------------------------------------------------------------

/**
 * prevBatterOBP * thisBatterSLG * 10; clamped [0, 10].
 */
export function lineupProtectionScore(
  prevBatterOBP: number,
  thisBatterSLG: number,
): number {
  return Math.max(0, Math.min(10, prevBatterOBP * thisBatterSLG * 10))
}

export interface BatterHandednessStats {
  avg: number
  obp: number
  slg: number
}

export interface PlatoonResult {
  advantage: 'batter' | 'pitcher' | 'neutral'
  magnitude: number
}

/**
 * Platoon split analysis.
 * Compare same-hand vs opposite-hand OPS diff.
 * advantage > 0.050 OPS = batter advantage; < -0.050 = pitcher advantage; else neutral.
 */
export function platoonSplit(
  leftyStats: BatterHandednessStats,
  rightyStats: BatterHandednessStats,
  pitcherHandedness: 'L' | 'R',
): PlatoonResult {
  const leftyOPS = leftyStats.obp + leftyStats.slg
  const rightyOPS = rightyStats.obp + rightyStats.slg
  // Same-hand matchup OPS vs opposite-hand matchup OPS
  // Convention: batter vs same-hand pitcher is harder (lower OPS expected)
  const sameHandOPS = pitcherHandedness === 'L' ? leftyOPS : rightyOPS
  const oppositeHandOPS = pitcherHandedness === 'L' ? rightyOPS : leftyOPS
  const diff = oppositeHandOPS - sameHandOPS // positive = batter benefits from facing same-hand
  const magnitude = Math.abs(diff)
  if (diff > 0.05) return { advantage: 'batter', magnitude }
  if (diff < -0.05) return { advantage: 'pitcher', magnitude }
  return { advantage: 'neutral', magnitude }
}

/**
 * Bullpen load index: sum of (IP_i / maxInnings)^2 for each pitcher.
 * Default maxInnings = 3; normalized 0–1.
 */
export function bulpenLoadIndex(pitcherInnings: number[], maxInnings = 3): number {
  if (pitcherInnings.length === 0) return 0
  const sumSquares = pitcherInnings.reduce((acc, ip) => {
    const ratio = Math.min(1, ip / maxInnings)
    return acc + ratio * ratio
  }, 0)
  // Normalize by number of pitchers
  return Math.min(1, sumSquares / pitcherInnings.length)
}

/**
 * Studes Game Score v2.
 * 40 + 2*(innings*3) + K - 2*BB - 2*H - 3*ER - 4*uER - 6*HR
 */
export function gameScoreV2(
  innings: number,
  strikeouts: number,
  walks: number,
  hits: number,
  earnedRuns: number,
  unearnedRuns: number,
  homeRuns: number,
): number {
  const outs = innings * 3
  return (
    40 +
    2 * outs +
    strikeouts -
    2 * walks -
    2 * hits -
    3 * earnedRuns -
    4 * unearnedRuns -
    6 * homeRuns
  )
}

// ---------------------------------------------------------------------------
// Legacy / convenience re-exports (backwards compat aliases)
// ---------------------------------------------------------------------------

/** @alias sluggingPercentage */
export function sluggingPct(
  singlesCount: number,
  doublesCount: number,
  triplesCount: number,
  hr: number,
  atBats: number,
): number {
  return sluggingPercentage(singlesCount, doublesCount, triplesCount, hr, atBats)
}

/** @alias BABIP */
export function babip(
  h: number,
  hr: number,
  so: number,
  ab: number,
  sf: number,
): number {
  return BABIP(h, hr, ab, so, sf)
}

/** Helper: extract single count from BatterLine */
export function singles(b: BatterLine): number {
  return Math.max(0, b.hits - b.doubles - b.triples - b.homeRuns)
}

/** BatterLine-based wOBA (legacy helper) */
export function woba(b: BatterLine, weights: typeof WOBA_WEIGHTS = WOBA_WEIGHTS): number {
  const ibb = b.intentionalWalks ?? 0
  const uBB = b.walks - ibb
  const s = singles(b)
  const numerator =
    weights.uBB * uBB +
    weights.HBP * b.hitByPitch +
    weights.single * s +
    weights.double * b.doubles +
    weights.triple * b.triples +
    weights.HR * b.homeRuns
  const denominator = b.atBats + b.walks - ibb + b.sacrificeFlies + b.hitByPitch
  if (denominator <= 0) return 0
  return numerator / denominator
}

/** wRC = ((wOBA - lgwOBA) / wOBAScale + lgR/PA) * PA */
export function wrc(
  wobaStat: number,
  lgWoba: number,
  lgRPerPA: number,
  pa: number,
): number {
  if (pa <= 0) return 0
  return ((wobaStat - lgWoba) / WOBA_WEIGHTS.wOBAScale + lgRPerPA) * pa
}

/** wRC+ simplified (uses standard lgRPerPA=0.120) */
export function wrcPlus(
  wobaStat: number,
  lgWoba: number,
  parkFactor2 = 1.0,
): number {
  const lgRPerPA = 0.120
  const ratio = (wobaStat - lgWoba) / WOBA_WEIGHTS.wOBAScale / lgRPerPA + 1
  return (ratio * 100) / parkFactor2
}

/** OPS+ = (OPS / lgOPS) * 100 / parkFactor */
export function ops_plus(
  playerOps: number,
  lgOps: number,
  parkFactor2 = 1.0,
): number {
  if (lgOps <= 0 || parkFactor2 <= 0) return 0
  return (playerOps / lgOps) * 100 / parkFactor2
}

/** Stolen Base Runs: SB * 0.2 - CS * 0.432 */
export function stolenBaseRuns(sb: number, cs: number): number {
  return sb * 0.2 - cs * 0.432
}

/** Speed score approximation (simple form) */
export function spd(sb: number, cs: number, singleRate: number): number {
  const sbAttempts = sb + cs + 1
  const sbSuccessRate = sb / sbAttempts
  const score = sbSuccessRate * Math.sqrt(sb + cs) * 3 + singleRate * 20
  return Math.max(0, Math.min(10, score))
}

/** ERA alias */
export function era(earnedRuns: number, inningsPitched: number): number {
  return ERA(earnedRuns, inningsPitched)
}

/** WHIP alias */
export function whip(walks: number, hits: number, inningsPitched: number): number {
  return WHIP(walks, hits, inningsPitched)
}

/** K/9 */
export function k9(strikeouts: number, inningsPitched: number): number {
  return strikeoutsPer9(strikeouts, inningsPitched)
}

/** BB/9 */
export function bb9(walks: number, inningsPitched: number): number {
  return walksPer9(walks, inningsPitched)
}

/** HR/9 */
export function hr9(hr: number, inningsPitched: number): number {
  const ip = ipToDecimal(inningsPitched)
  if (ip <= 0) return 0
  return (hr / ip) * 9
}

/** K/BB alias */
export function kbb(strikeouts: number, walks: number): number {
  if (walks <= 0) return strikeouts > 0 ? strikeouts : 0
  return strikeouts / walks
}

/** FIP alias (legacy constant 3.10) */
export function fip(
  hr: number,
  bb: number,
  hbp: number,
  k: number,
  ip: number,
  constant = 3.10,
): number {
  const trueIp = ipToDecimal(ip)
  if (trueIp <= 0) return 0
  return (13 * hr + 3 * (bb + hbp) - 2 * k) / trueIp + constant
}

/** xFIP alias (legacy, takes HR param but ignores it) */
export function xfip(
  hr: number,
  bb: number,
  hbp: number,
  k: number,
  ip: number,
  flyBalls: number,
  lgHrPerFb = 0.105,
): number {
  void hr
  const expectedHr = flyBalls * lgHrPerFb
  return fip(expectedHr, bb, hbp, k, ip)
}

/** SIERA alias (legacy signature) */
export function sierra(
  k: number,
  bb: number,
  hbp: number,
  gb: number,
  fb: number,
  ip: number,
): number {
  void hbp
  void fb
  return SIERA(k, bb, gb, 0, ip)
}

/** ERA- = (ERA / lgERA) * 100 / parkFactor */
export function eraMinus(eraValue: number, lgEra: number, parkFactor2 = 1.0): number {
  if (lgEra <= 0 || parkFactor2 <= 0) return 0
  return (eraValue / lgEra) * 100 / parkFactor2
}

/** Single-season park factor (total runs version) */
export function singleSeasonParkFactor(
  homeRS: number,
  homeRA: number,
  awayRS: number,
  awayRA: number,
  homeGames = 81,
  awayGames = 81,
): number {
  if (homeGames <= 0 || awayGames <= 0) return 1.0
  const homeRate = (homeRS + homeRA) / homeGames
  const awayRate = (awayRS + awayRA) / awayGames
  if (awayRate <= 0) return 1.0
  return homeRate / awayRate
}

/** Batting runs above average: (wOBA - lgwOBA) / wOBAScale * PA */
export function battingRuns(
  wobaStat: number,
  lgWoba: number,
  wOBAScale: number,
  pa: number,
): number {
  if (wOBAScale <= 0) return 0
  return ((wobaStat - lgWoba) / wOBAScale) * pa
}

/** Positional adjustment (FanGraphs-style, runs per 162 games) */
export function positionalAdjustment(position: string): number {
  const adj: Record<string, number> = {
    C: 12.5,
    SS: 7.5,
    '2B': 2.5,
    CF: 2.5,
    '3B': 2.5,
    RF: -7.5,
    LF: -7.5,
    '1B': -12.5,
    DH: -17.5,
  }
  return adj[position.toUpperCase()] ?? 0
}

/** Replacement level: (-20.5 / 600) * PA */
export function replacementLevel(pa: number): number {
  return (-20.5 / 600) * pa
}

/** Position player WAR */
export function war(
  battingRunsValue: number,
  positionalAdj: number,
  replacement: number,
  runsPerWin = 10,
): number {
  if (runsPerWin <= 0) return 0
  return (battingRunsValue + positionalAdj - replacement) / runsPerWin
}

/** Pitching WAR (FIP-based) */
export function pitchingWar(
  fipValue: number,
  lgFip: number,
  ip: number,
  parkFactor2 = 1.0,
  runsPerWin = 10,
): number {
  const trueIp = ipToDecimal(ip)
  if (trueIp <= 0 || runsPerWin <= 0) return 0
  const fipAdj = fipValue / parkFactor2
  return ((lgFip - fipAdj) * trueIp) / 9 / runsPerWin
}

// ---------------------------------------------------------------------------
// Run expectancy (24-state RE24 matrix, 2019-era)
// ---------------------------------------------------------------------------

type Outs = 0 | 1 | 2
type RunnerState =
  | '000'
  | '100'
  | '010'
  | '001'
  | '110'
  | '101'
  | '011'
  | '111'

const RE_MATRIX: Record<Outs, Record<RunnerState, number>> = {
  0: {
    '000': 0.544,
    '100': 0.941,
    '010': 1.170,
    '001': 1.430,
    '110': 1.556,
    '101': 1.828,
    '011': 1.989,
    '111': 2.417,
  },
  1: {
    '000': 0.291,
    '100': 0.573,
    '010': 0.726,
    '001': 0.989,
    '110': 0.962,
    '101': 1.211,
    '011': 1.438,
    '111': 1.632,
  },
  2: {
    '000': 0.117,
    '100': 0.243,
    '010': 0.344,
    '001': 0.387,
    '110': 0.464,
    '101': 0.538,
    '011': 0.598,
    '111': 0.794,
  },
}

export function runExpectancy(outs: Outs, runners: RunnerState): number {
  return RE_MATRIX[outs][runners]
}

export function re24(
  outs: Outs,
  runnersBefore: RunnerState,
  runnersAfter: RunnerState,
  outsAfter: Outs | 3,
  runsScored: number,
): number {
  const reBefore = RE_MATRIX[outs][runnersBefore]
  const reAfter = outsAfter >= 3 ? 0 : RE_MATRIX[outsAfter as Outs][runnersAfter]
  return reAfter - reBefore + runsScored
}

export function linearWeightValue(
  event: 'single' | 'double' | 'triple' | 'homeRun' | 'walk' | 'hbp' | 'out' | 'strikeout',
): number {
  const weights: Record<typeof event, number> = {
    homeRun: 1.397,
    triple: 1.070,
    double: 0.776,
    single: 0.475,
    walk: 0.323,
    hbp: 0.352,
    out: -0.270,
    strikeout: -0.301,
  }
  return weights[event]
}

export function teamRunsCreated(stats: TeamOffenseStats): number {
  const tb =
    stats.hits -
    stats.doubles -
    stats.triples -
    stats.homeRuns +
    stats.doubles * 2 +
    stats.triples * 3 +
    stats.homeRuns * 4
  const numerator = (stats.hits + stats.walks + stats.hitByPitch) * tb
  const denominator = stats.atBats + stats.walks + stats.hitByPitch + stats.sacrificeFlies
  if (denominator <= 0) return 0
  return numerator / denominator
}

export function pythagWinPct(
  runsScored: number,
  runsAllowed: number,
  exponent = 1.83,
): number {
  return pythagoreanWinPct(runsScored, runsAllowed, exponent)
}

export function expectedRecord(
  runsScored: number,
  runsAllowed: number,
  games: number,
): { wins: number; losses: number } {
  const wPct = pythagoreanWinPct(runsScored, runsAllowed)
  const wins = Math.round(wPct * games)
  return { wins, losses: games - wins }
}

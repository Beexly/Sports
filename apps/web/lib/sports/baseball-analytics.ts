/**
 * baseball-analytics.ts
 * Pure TypeScript baseball sabermetrics — no external dependencies.
 * Covers: wOBA, wRC+, FIP, xFIP, SIERA, WAR components, RE24, Pythagorean W%
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
  inningsPitched: number // e.g. 7.2 = 7 and 2/3 innings
  earnedRuns: number
  hits: number
  walks: number
  strikeouts: number
  homeRunsAllowed: number
  hitBatters?: number
  flyBalls?: number   // for xFIP
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
// Basic ratios
// ---------------------------------------------------------------------------

/** Batting average: H / AB */
export function battingAverage(hits: number, atBats: number): number {
  if (atBats <= 0) return 0
  return hits / atBats
}

/**
 * On-base percentage: (H + BB + HBP) / (AB + BB + HBP + SF)
 */
export function onBasePercentage(
  hits: number,
  walks: number,
  hbp: number,
  atBats: number,
  sf: number,
): number {
  const denominator = atBats + walks + hbp + sf
  if (denominator <= 0) return 0
  return (hits + walks + hbp) / denominator
}

/**
 * Slugging percentage: total bases / AB
 * TB = 1B*1 + 2B*2 + 3B*3 + HR*4
 */
export function sluggingPct(
  singlesCount: number,
  doublesCount: number,
  triplesCount: number,
  hr: number,
  atBats: number,
): number {
  if (atBats <= 0) return 0
  const tb = singlesCount + doublesCount * 2 + triplesCount * 3 + hr * 4
  return tb / atBats
}

/** OPS = OBP + SLG */
export function ops(obp: number, slg: number): number {
  return obp + slg
}

/** Isolated Power: SLG - AVG */
export function isolatedPower(slg: number, avg: number): number {
  return slg - avg
}

/**
 * BABIP = (H - HR) / (AB - SO - HR + SF)
 */
export function babip(
  h: number,
  hr: number,
  so: number,
  ab: number,
  sf: number,
): number {
  const denominator = ab - so - hr + sf
  if (denominator <= 0) return 0
  return (h - hr) / denominator
}

// ---------------------------------------------------------------------------
// Sabermetric offensive metrics
// ---------------------------------------------------------------------------

/** Singles = H - 2B - 3B - HR */
export function singles(b: BatterLine): number {
  return Math.max(0, b.hits - b.doubles - b.triples - b.homeRuns)
}

/**
 * wOBA — Weighted On-Base Average using linear weights.
 * wOBA = (uBB*BB + HBP*HBP + 1B*1B + 2B*2B + 3B*3B + HR*HR)
 *         / (AB + BB - IBB + SF + HBP)
 */
export function woba(b: BatterLine, weights: typeof WOBA_WEIGHTS = WOBA_WEIGHTS): number {
  const ibb = b.intentionalWalks ?? 0
  const sb = b.stolenBases ?? 0
  const cs = b.caughtStealing ?? 0
  void sb
  void cs
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

/**
 * wRC: Weighted Runs Created
 * wRC = ((wOBA - lgwOBA) / wOBAScale + lgR/PA) * PA
 */
export function wrc(
  wobaStat: number,
  lgWoba: number,
  lgRPerPA: number,
  pa: number,
): number {
  if (pa <= 0) return 0
  return ((wobaStat - lgWoba) / WOBA_WEIGHTS.wOBAScale + lgRPerPA) * pa
}

/**
 * wRC+ — wRC relative to league average (100)
 * wRC+ = (wRC/PA / lgR/PA) * 100 / parkFactor
 * Simplified version: ((wOBA - lgwOBA) / wOBAScale / lgR/PA + 1) * 100 / parkFactor
 */
export function wrcPlus(
  wobaStat: number,
  lgWoba: number,
  parkFactor = 1.0,
): number {
  // Standard league R/PA ≈ 0.120 (2023-era)
  const lgRPerPA = 0.120
  const ratio = (wobaStat - lgWoba) / WOBA_WEIGHTS.wOBAScale / lgRPerPA + 1
  return (ratio * 100) / parkFactor
}

/**
 * OPS+ = (OPS / lgOPS) * 100 / parkFactor
 */
export function ops_plus(
  playerOps: number,
  lgOps: number,
  parkFactor = 1.0,
): number {
  if (lgOps <= 0 || parkFactor <= 0) return 0
  return (playerOps / lgOps) * 100 / parkFactor
}

// ---------------------------------------------------------------------------
// Base running
// ---------------------------------------------------------------------------

/**
 * Stolen Base Runs: SBR = SB * 0.2 - CS * 0.432
 */
export function stolenBaseRuns(sb: number, cs: number): number {
  return sb * 0.2 - cs * 0.432
}

/**
 * Speed score approximation:
 * Spd = ((SB / (SB + CS + 1)) * sqrt(SB / PA) * 26 + (R / (AB + BB)) * 14.3) / 2
 * Here singleRate is used as a proxy for R/(AB+BB) for simplicity.
 * Uses Bill James Speed Score simplified form.
 */
export function spd(sb: number, cs: number, singleRate: number): number {
  const sbAttempts = sb + cs + 1
  const sbSuccessRate = sb / sbAttempts
  // Simplified speed score
  const score = sbSuccessRate * Math.sqrt(sb + cs) * 3 + singleRate * 20
  return Math.max(0, Math.min(10, score))
}

// ---------------------------------------------------------------------------
// Pitching metrics
// ---------------------------------------------------------------------------

/** Convert fractional IP (e.g., 7.2 = 7 and 2/3) to true decimal innings */
function ipToDecimal(ip: number): number {
  const full = Math.floor(ip)
  const frac = Math.round((ip - full) * 10) // outs (0, 1, or 2)
  return full + frac / 3
}

/** ERA = (ER / IP) * 9 */
export function era(earnedRuns: number, inningsPitched: number): number {
  const ip = ipToDecimal(inningsPitched)
  if (ip <= 0) return 0
  return (earnedRuns / ip) * 9
}

/** WHIP = (BB + H) / IP */
export function whip(walks: number, hits: number, inningsPitched: number): number {
  const ip = ipToDecimal(inningsPitched)
  if (ip <= 0) return 0
  return (walks + hits) / ip
}

/** K/9 = (K / IP) * 9 */
export function k9(strikeouts: number, inningsPitched: number): number {
  const ip = ipToDecimal(inningsPitched)
  if (ip <= 0) return 0
  return (strikeouts / ip) * 9
}

/** BB/9 = (BB / IP) * 9 */
export function bb9(walks: number, inningsPitched: number): number {
  const ip = ipToDecimal(inningsPitched)
  if (ip <= 0) return 0
  return (walks / ip) * 9
}

/** HR/9 = (HR / IP) * 9 */
export function hr9(hr: number, inningsPitched: number): number {
  const ip = ipToDecimal(inningsPitched)
  if (ip <= 0) return 0
  return (hr / ip) * 9
}

/** K/BB ratio */
export function kbb(strikeouts: number, walks: number): number {
  if (walks <= 0) return strikeouts > 0 ? strikeouts : 0
  return strikeouts / walks
}

/**
 * FIP = (13*HR + 3*(BB+HBP) - 2*K) / IP + constant
 * constant ≈ 3.10 (league ERA - league FIP components, typically)
 */
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

/**
 * xFIP: like FIP but replaces HR with expected HR based on fly ball rate.
 * Expected HR = flyBalls * lgHrPerFb
 * lgHrPerFb ≈ 0.105
 */
export function xfip(
  hr: number,
  bb: number,
  hbp: number,
  k: number,
  ip: number,
  flyBalls: number,
  lgHrPerFb = 0.105,
): number {
  void hr // replaced by expected HR
  const expectedHr = flyBalls * lgHrPerFb
  return fip(expectedHr, bb, hbp, k, ip)
}

/**
 * SIERA — Skill-Interactive ERA
 * Simplified formula:
 * SIERA ≈ 6.145 - 16.986*(K/PA) + 11.434*(BB/PA) - 1.858*(GB%) + 7.653*(FB%) + constant adj
 * PA approximated as IP*3 + BB + HBP + K*0.3 (batters faced estimate)
 */
export function sierra(
  k: number,
  bb: number,
  hbp: number,
  gb: number,
  fb: number,
  ip: number,
): number {
  const trueIp = ipToDecimal(ip)
  if (trueIp <= 0) return 0
  // Estimate batters faced
  const bf = Math.max(1, trueIp * 3 + bb + hbp)
  const kRate = k / bf
  const bbRate = bb / bf
  const totalBalls = gb + fb
  const gbPct = totalBalls > 0 ? gb / totalBalls : 0.44 // league avg
  const fbPct = totalBalls > 0 ? fb / totalBalls : 0.35

  return (
    6.145 -
    16.986 * kRate +
    11.434 * bbRate -
    1.858 * (gbPct * gbPct) +
    7.653 * (fbPct * fbPct) -
    0.005 * kRate * bbRate * 100 // interaction term, simplified
  )
}

/**
 * ERA- = (ERA / lgERA) * 100 / parkFactor
 * Lower is better (like OPS+, but inverted scale direction).
 */
export function eraMinus(eraValue: number, lgEra: number, parkFactor = 1.0): number {
  if (lgEra <= 0 || parkFactor <= 0) return 0
  return (eraValue / lgEra) * 100 / parkFactor
}

// ---------------------------------------------------------------------------
// Park factor
// ---------------------------------------------------------------------------

/**
 * Single-season park factor.
 * PF = ((homeRS + homeRA) / homeGames) / ((awayRS + awayRA) / awayGames)
 * Both default to 81 games.
 */
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

// ---------------------------------------------------------------------------
// WAR components (simplified position player)
// ---------------------------------------------------------------------------

/**
 * Batting runs above average.
 * battingRuns = (wOBA - lgwOBA) / wOBAScale * PA
 */
export function battingRuns(
  wobaStat: number,
  lgWoba: number,
  wOBAScale: number,
  pa: number,
): number {
  if (wOBAScale <= 0) return 0
  return ((wobaStat - lgWoba) / wOBAScale) * pa
}

/**
 * Positional adjustment (runs per 162 games, prorated to 600 PA for simplicity).
 * Standard FanGraphs adjustments:
 *   C=12.5, SS=7.5, 2B=2.5, CF=2.5, 3B=2.5, RF=-7.5, LF=-7.5, 1B=-12.5, DH=-17.5
 */
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

/**
 * Replacement level runs, prorated by PA.
 * Full-season (600 PA) replacement level = -20.5 runs.
 */
export function replacementLevel(pa: number): number {
  return (-20.5 / 600) * pa
}

/**
 * Position player WAR (simplified).
 * WAR = (battingRuns + positionalAdj - replacementLevel) / runsPerWin
 * runsPerWin ≈ 10
 */
export function war(
  battingRunsValue: number,
  positionalAdj: number,
  replacement: number,
  runsPerWin = 10,
): number {
  if (runsPerWin <= 0) return 0
  // replacement is already negative (e.g. -20.5 for 600 PA)
  // WAR = (batting + positional - replacement) / RPW
  // replacement is a negative number, so subtracting it adds its absolute value
  return (battingRunsValue + positionalAdj - replacement) / runsPerWin
}

// ---------------------------------------------------------------------------
// Pitching WAR components
// ---------------------------------------------------------------------------

/**
 * Simplified pitching WAR via FIP-based method.
 * pitchingWAR = (lgFIP - FIP_adj) * IP / 9 / runsPerWin
 * FIP_adj accounts for park factor.
 */
export function pitchingWar(
  fipValue: number,
  lgFip: number,
  ip: number,
  parkFactor = 1.0,
  runsPerWin = 10,
): number {
  const trueIp = ipToDecimal(ip)
  if (trueIp <= 0 || runsPerWin <= 0) return 0
  const fipAdj = fipValue / parkFactor
  return ((lgFip - fipAdj) * trueIp) / 9 / runsPerWin
}

// ---------------------------------------------------------------------------
// Run environment — 24-state RE24 matrix (2019-era averages)
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

/**
 * Run expectancy matrix (2019-era MLB averages).
 * Index: [outs][runnerState]
 */
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

/**
 * Look up expected runs for an outs/runner state combination.
 */
export function runExpectancy(outs: Outs, runners: RunnerState): number {
  return RE_MATRIX[outs][runners]
}

/**
 * RE24: change in run expectancy from a plate appearance.
 * RE24 = RE(after) - RE(before) + runs scored
 * If 3 outs are recorded (outsAfter would be 3, clamped to end of inning), RE(after) = 0.
 */
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

// ---------------------------------------------------------------------------
// Lineup utilities
// ---------------------------------------------------------------------------

/**
 * Linear weight values per event (2023-era).
 * Based on average run value above/below average.
 */
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
    strikeout: -0.301, // slightly worse than generic out due to no GIDP opportunity but also no contact
  }
  return weights[event]
}

/**
 * Team Runs Created (simplified):
 * RC = (H + BB + HBP - CS) * TB / (AB + BB + HBP + SF)
 */
export function teamRunsCreated(stats: TeamOffenseStats): number {
  const tb =
    stats.hits -
    stats.doubles -
    stats.triples -
    stats.homeRuns + // singles
    stats.doubles * 2 +
    stats.triples * 3 +
    stats.homeRuns * 4

  // Approximate CS from context; TeamOffenseStats doesn't have CS, so omit it
  const numerator = (stats.hits + stats.walks + stats.hitByPitch) * tb
  const denominator = stats.atBats + stats.walks + stats.hitByPitch + stats.sacrificeFlies
  if (denominator <= 0) return 0
  return numerator / denominator
}

// ---------------------------------------------------------------------------
// Pythagorean W%
// ---------------------------------------------------------------------------

/**
 * Pythagorean winning percentage.
 * W% = RS^exp / (RS^exp + RA^exp)
 * Default exponent: 1.83 (Pythagenport-era standard)
 */
export function pythagWinPct(
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
 * Expected win-loss record given runs scored/allowed and total games.
 */
export function expectedRecord(
  runsScored: number,
  runsAllowed: number,
  games: number,
): { wins: number; losses: number } {
  const wPct = pythagWinPct(runsScored, runsAllowed)
  const wins = Math.round(wPct * games)
  return { wins, losses: games - wins }
}

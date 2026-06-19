/**
 * f1-analytics.ts
 * Pure TypeScript Formula 1 / motorsport analytics — no external dependencies.
 * Covers: lap time analysis, sector analysis, tire analytics, pit stop analytics,
 * championship points, qualifying analysis, race simulation, and fantasy scoring.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LapTime {
  seconds: number; // total lap time in seconds
  s1: number; // sector 1 time
  s2: number; // sector 2 time
  s3: number; // sector 3 time
  compound: 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet';
  lap: number;
  driver: string;
}

export interface PitStop {
  lap: number;
  duration: number; // seconds
  compound: 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet';
}

export interface RaceResult {
  position: number;
  driver: string;
  team: string;
  laps: number;
  timeOrStatus: string; // "1:30:45.123" or "+5.321" or "DNF"
  points: number;
  fastestLap: boolean;
}

export interface QualifyingResult {
  position: number;
  driver: string;
  q1?: number; // sector time in seconds
  q2?: number;
  q3?: number;
}

export interface TireStint {
  compound: 'soft' | 'medium' | 'hard';
  startLap: number;
  endLap: number;
}

export type CompoundCode = 'S' | 'M' | 'H' | 'I' | 'W';

// ---------------------------------------------------------------------------
// Lap Time Analysis
// ---------------------------------------------------------------------------

/**
 * Parse "1:23.456" → 83.456 seconds; "23.456" → 23.456
 */
export function parseLapTime(str: string): number {
  const trimmed = str.trim();
  const colonIdx = trimmed.indexOf(':');
  if (colonIdx === -1) {
    return parseFloat(trimmed);
  }
  const minutes = parseInt(trimmed.slice(0, colonIdx), 10);
  const seconds = parseFloat(trimmed.slice(colonIdx + 1));
  return minutes * 60 + seconds;
}

/**
 * Format seconds as "M:SS.mmm"
 */
export function formatLapTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  const secsInt = Math.floor(secs);
  const ms = Math.round((secs - secsInt) * 1000);
  const secStr = secsInt.toString().padStart(2, '0');
  const msStr = ms.toString().padStart(3, '0');
  return `${mins}:${secStr}.${msStr}`;
}

/**
 * Return "+0.456" or "-0.456" relative to a (b - a)
 */
export function lapTimeDelta(a: number, b: number): string {
  const delta = b - a;
  const sign = delta >= 0 ? '+' : '-';
  return `${sign}${Math.abs(delta).toFixed(3)}`;
}

/**
 * Return the lap with the minimum seconds, or null if empty
 */
export function fastestLap(laps: LapTime[]): LapTime | null {
  if (laps.length === 0) return null;
  return laps.reduce((best, lap) => (lap.seconds < best.seconds ? lap : best));
}

/**
 * Return the fastest lap for a given driver, or null if no laps for driver
 */
export function personalBest(laps: LapTime[], driver: string): LapTime | null {
  const driverLaps = laps.filter((l) => l.driver === driver);
  if (driverLaps.length === 0) return null;
  return driverLaps.reduce((best, lap) => (lap.seconds < best.seconds ? lap : best));
}

/**
 * Return the theoretical best sector time across all laps for a given sector
 */
export function sectorBest(laps: LapTime[], sector: 1 | 2 | 3): number {
  if (laps.length === 0) return 0;
  if (sector === 1) return Math.min(...laps.map((l) => l.s1));
  if (sector === 2) return Math.min(...laps.map((l) => l.s2));
  return Math.min(...laps.map((l) => l.s3));
}

/**
 * Return the theoretical best lap time = best s1 + best s2 + best s3
 */
export function theoreticalBestLap(laps: LapTime[]): number {
  if (laps.length === 0) return 0;
  return sectorBest(laps, 1) + sectorBest(laps, 2) + sectorBest(laps, 3);
}

/**
 * Return time difference at specific lap: driver1.seconds - driver2.seconds
 * Returns null if either driver has no lap at the given lap number
 */
export function lapGap(
  laps: LapTime[],
  driver1: string,
  driver2: string,
  lap: number
): number | null {
  const d1Lap = laps.find((l) => l.driver === driver1 && l.lap === lap);
  const d2Lap = laps.find((l) => l.driver === driver2 && l.lap === lap);
  if (!d1Lap || !d2Lap) return null;
  return d1Lap.seconds - d2Lap.seconds;
}

/**
 * Return mean lap time; optionally filter by driver
 */
export function avgLapTime(laps: LapTime[], driver?: string): number {
  const filtered = driver ? laps.filter((l) => l.driver === driver) : laps;
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, l) => sum + l.seconds, 0) / filtered.length;
}

/**
 * Return median lap time; optionally filter by driver
 */
export function medianLapTime(laps: LapTime[], driver?: string): number {
  const filtered = driver ? laps.filter((l) => l.driver === driver) : laps;
  if (filtered.length === 0) return 0;
  const sorted = [...filtered].sort((a, b) => a.seconds - b.seconds);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid]!.seconds;
  }
  return (sorted[mid - 1]!.seconds + sorted[mid]!.seconds) / 2;
}

/**
 * Return standard deviation of lap times for a given driver
 */
export function lapVariability(laps: LapTime[], driver: string): number {
  const driverLaps = laps.filter((l) => l.driver === driver);
  if (driverLaps.length === 0) return 0;
  const mean = avgLapTime(driverLaps);
  const variance =
    driverLaps.reduce((sum, l) => sum + Math.pow(l.seconds - mean, 2), 0) / driverLaps.length;
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// Sector Analysis
// ---------------------------------------------------------------------------

/**
 * Return sector analysis including theoretical best, achieved best, and time loss
 */
export function sectorAnalysis(laps: LapTime[]): {
  s1Best: number;
  s2Best: number;
  s3Best: number;
  theoretical: number;
  achievedBest: number;
  timeLoss: number;
} {
  if (laps.length === 0) {
    return { s1Best: 0, s2Best: 0, s3Best: 0, theoretical: 0, achievedBest: 0, timeLoss: 0 };
  }
  const s1Best = sectorBest(laps, 1);
  const s2Best = sectorBest(laps, 2);
  const s3Best = sectorBest(laps, 3);
  const theoretical = s1Best + s2Best + s3Best;
  const achievedBest = Math.min(...laps.map((l) => l.seconds));
  const timeLoss = achievedBest - theoretical;
  return { s1Best, s2Best, s3Best, theoretical, achievedBest, timeLoss };
}

/**
 * Return fraction of total lap time per sector
 */
export function sectorShare(lap: LapTime): { s1: number; s2: number; s3: number } {
  const total = lap.s1 + lap.s2 + lap.s3;
  if (total === 0) return { s1: 0, s2: 0, s3: 0 };
  return { s1: lap.s1 / total, s2: lap.s2 / total, s3: lap.s3 / total };
}

/**
 * Return the sector where driver loses most time vs reference driver
 * Compares average sector times per driver
 */
export function weakestSector(
  driver: string,
  laps: LapTime[],
  reference: string
): 1 | 2 | 3 {
  const driverLaps = laps.filter((l) => l.driver === driver);
  const refLaps = laps.filter((l) => l.driver === reference);

  const driverAvgS1 =
    driverLaps.length > 0
      ? driverLaps.reduce((s, l) => s + l.s1, 0) / driverLaps.length
      : 0;
  const driverAvgS2 =
    driverLaps.length > 0
      ? driverLaps.reduce((s, l) => s + l.s2, 0) / driverLaps.length
      : 0;
  const driverAvgS3 =
    driverLaps.length > 0
      ? driverLaps.reduce((s, l) => s + l.s3, 0) / driverLaps.length
      : 0;

  const refAvgS1 =
    refLaps.length > 0 ? refLaps.reduce((s, l) => s + l.s1, 0) / refLaps.length : 0;
  const refAvgS2 =
    refLaps.length > 0 ? refLaps.reduce((s, l) => s + l.s2, 0) / refLaps.length : 0;
  const refAvgS3 =
    refLaps.length > 0 ? refLaps.reduce((s, l) => s + l.s3, 0) / refLaps.length : 0;

  const delta1 = driverAvgS1 - refAvgS1;
  const delta2 = driverAvgS2 - refAvgS2;
  const delta3 = driverAvgS3 - refAvgS3;

  if (delta1 >= delta2 && delta1 >= delta3) return 1;
  if (delta2 >= delta1 && delta2 >= delta3) return 2;
  return 3;
}

/**
 * Return sector improvements: positive = improvement (faster)
 * sectorImprovement(current, previous): current - previous (negative current means faster)
 * We want positive = improvement, so: previous.s1 - current.s1
 */
export function sectorImprovement(
  currentLap: LapTime,
  previousLap: LapTime
): { s1Delta: number; s2Delta: number; s3Delta: number } {
  return {
    s1Delta: previousLap.s1 - currentLap.s1,
    s2Delta: previousLap.s2 - currentLap.s2,
    s3Delta: previousLap.s3 - currentLap.s3,
  };
}

// ---------------------------------------------------------------------------
// Tire Analytics
// ---------------------------------------------------------------------------

/**
 * Return laps on current compound at currentLap
 */
export function tireAge(stints: TireStint[], currentLap: number): number {
  const currentStint = stints.find(
    (s) => s.startLap <= currentLap && s.endLap >= currentLap
  );
  if (!currentStint) return 0;
  return currentLap - currentStint.startLap + 1;
}

/**
 * Return average lap time increase per lap for given compound using linear regression slope
 */
export function tireDegradation(
  laps: LapTime[],
  compound: 'soft' | 'medium' | 'hard',
  windowSize = 5
): number {
  const compoundLaps = laps
    .filter((l) => l.compound === compound)
    .sort((a, b) => a.lap - b.lap);

  if (compoundLaps.length < 2) return 0;

  const window = compoundLaps.slice(0, windowSize);
  const n = window.length;

  // Linear regression: slope = (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)
  const xVals = window.map((_, i) => i + 1);
  const yVals = window.map((l) => l.seconds);

  const sumX = xVals.reduce((a, b) => a + b, 0);
  const sumY = yVals.reduce((a, b) => a + b, 0);
  const sumXY = xVals.reduce((acc, x, i) => acc + x * (yVals[i] ?? 0), 0);
  const sumX2 = xVals.reduce((acc, x) => acc + x * x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;

  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Return expected lap time loss based on degradation model
 * soft: 0.08s/lap, medium: 0.04s/lap, hard: 0.02s/lap × tireAge
 */
export function expectedLapTimeLoss(
  compound: 'soft' | 'medium' | 'hard',
  tireAge: number
): number {
  const rates: Record<'soft' | 'medium' | 'hard', number> = {
    soft: 0.08,
    medium: 0.04,
    hard: 0.02,
  };
  return rates[compound] * tireAge;
}

/**
 * Return candidate pit laps for 1-stop and 2-stop strategies
 * 1-stop: around totalLaps/2; 2-stop: around totalLaps/3 and 2*totalLaps/3
 */
export function optimalPitWindow(
  totalLaps: number,
  stintLength: number,
  pitLoss = 25
): number[] {
  void pitLoss; // used in strategy evaluation context

  const oneStop = Math.round(totalLaps / 2);
  const twoStop1 = Math.round(totalLaps / 3);
  const twoStop2 = Math.round((2 * totalLaps) / 3);

  // Clamp to stintLength-based boundaries
  const candidates: number[] = [
    Math.max(stintLength, oneStop),
    Math.max(stintLength, twoStop1),
    Math.min(totalLaps - stintLength, twoStop2),
  ];

  // Return unique sorted values
  return [...new Set(candidates)].sort((a, b) => a - b);
}

/**
 * Convert compound name to code
 */
export function compoundToCode(
  compound: 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet'
): CompoundCode {
  const map: Record<'soft' | 'medium' | 'hard' | 'intermediate' | 'wet', CompoundCode> = {
    soft: 'S',
    medium: 'M',
    hard: 'H',
    intermediate: 'I',
    wet: 'W',
  };
  return map[compound];
}

/**
 * Convert compound code to name
 */
export function compoundFromCode(code: CompoundCode): string {
  const map: Record<CompoundCode, string> = {
    S: 'soft',
    M: 'medium',
    H: 'hard',
    I: 'intermediate',
    W: 'wet',
  };
  return map[code];
}

/**
 * Return estimated lap window for a tire compound
 * soft: 15-25, medium: 25-40, hard: 35-55 laps
 */
export function tireWindowEstimate(compound: 'soft' | 'medium' | 'hard'): {
  min: number;
  max: number;
} {
  const windows: Record<'soft' | 'medium' | 'hard', { min: number; max: number }> = {
    soft: { min: 15, max: 25 },
    medium: { min: 25, max: 40 },
    hard: { min: 35, max: 55 },
  };
  return windows[compound];
}

// ---------------------------------------------------------------------------
// Pit Stop Analytics
// ---------------------------------------------------------------------------

/**
 * Total time cost of a pit stop = pitDuration + undercut (time lost in pit lane)
 * default undercut = 30s
 */
export function pitStopLoss(pitDuration: number, undercut = 30): number {
  return pitDuration + undercut;
}

/**
 * Undercut viability check: simplified as attackerGap × 2 > degradationDelta × 5
 */
export function undercut(
  attackerGap: number,
  pitLoss: number,
  degradationDelta: number
): boolean {
  void pitLoss;
  return attackerGap * 2 > degradationDelta * 5;
}

/**
 * Overcut: defender stays out to build gap; viable if defenderGap > pitLoss
 */
export function overcut(defenderGap: number, pitLoss: number): boolean {
  return defenderGap > pitLoss;
}

/**
 * Sum of stop durations + 30s undercut per stop
 */
export function totalPitLoss(stops: PitStop[]): number {
  return stops.reduce((sum, s) => sum + s.duration + 30, 0);
}

/**
 * Ideal pit count based on total laps and soft window
 */
export function idealPitCount(
  totalLaps: number,
  softWindow: number,
  mediumWindow: number
): 1 | 2 | 3 {
  void mediumWindow;
  if (totalLaps <= softWindow) return 1;
  if (totalLaps <= 2 * softWindow) return 2;
  return 3;
}

// ---------------------------------------------------------------------------
// Championship Points
// ---------------------------------------------------------------------------

const F1_POINTS_TABLE: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
};

/**
 * Return F1 points for a given position (2024 scoring system)
 * +1 bonus for fastest lap if position ≤ 10
 */
export function f1Points(position: number, fastestLap = false): number {
  const base = F1_POINTS_TABLE[position] ?? 0;
  const flBonus = fastestLap && position <= 10 ? 1 : 0;
  return base + flBonus;
}

const SPRINT_POINTS_TABLE: Record<number, number> = {
  1: 8,
  2: 7,
  3: 6,
  4: 5,
  5: 4,
  6: 3,
  7: 2,
  8: 1,
};

/**
 * Return sprint race points for a given position
 */
export function sprintPoints(position: number): number {
  return SPRINT_POINTS_TABLE[position] ?? 0;
}

/**
 * Return championship gap analysis
 * maxPoints = racesRemaining × 26 (25 + FL bonus)
 */
export function championshipGap(
  leader: number,
  challenger: number,
  racesRemaining: number
): { maxPoints: number; currentGap: number; mathematicallyAlive: boolean } {
  const maxPoints = racesRemaining * 26;
  const currentGap = leader - challenger;
  const mathematicallyAlive = currentGap <= maxPoints;
  return { maxPoints, currentGap, mathematicallyAlive };
}

/**
 * Return total constructor points (sum of all driver points)
 */
export function constructorPoints(drivers: { points: number }[]): number {
  return drivers.reduce((sum, d) => sum + d.points, 0);
}

/**
 * Return points per race needed to close gap
 */
export function pointsToClosureRate(gap: number, racesRemaining: number): number {
  if (racesRemaining === 0) return gap;
  return gap / racesRemaining;
}

// ---------------------------------------------------------------------------
// Qualifying Analysis
// ---------------------------------------------------------------------------

/**
 * Return qualifying time difference: driver1 - driver2
 * Uses q3 time, falling back to q2 then q1
 * Returns null if no common session time exists
 */
export function qualifyingGap(
  results: QualifyingResult[],
  driver1: string,
  driver2: string
): number | null {
  const d1 = results.find((r) => r.driver === driver1);
  const d2 = results.find((r) => r.driver === driver2);
  if (!d1 || !d2) return null;

  // Try q3 first
  if (d1.q3 != null && d2.q3 != null) return d1.q3 - d2.q3;
  // Fall back to q2
  if (d1.q2 != null && d2.q2 != null) return d1.q2 - d2.q2;
  // Fall back to q1
  if (d1.q1 != null && d2.q1 != null) return d1.q1 - d2.q1;

  return null;
}

/**
 * Apply grid penalty, clamped to total number of drivers
 * default totalDrivers = 20
 */
export function gridPenalty(
  originalPosition: number,
  penalty: number,
  totalDrivers = 20
): number {
  return Math.min(originalPosition + penalty, totalDrivers);
}

/**
 * Return best qualifying time across q1/q2/q3 (minimum non-null value)
 */
export function qualifyingPerformance(q: QualifyingResult): number {
  const times = [q.q1, q.q2, q.q3].filter((t): t is number => t != null);
  if (times.length === 0) return 0;
  return Math.min(...times);
}

/**
 * Return front row probability using logistic function
 * Default trackSensitivity = 5, clamped to [0, 1]
 */
export function frontRowProbability(
  qualifyingPace: number,
  fieldBestPace: number,
  trackSensitivity = 5
): number {
  const ratio = fieldBestPace / qualifyingPace;
  const exponent = -trackSensitivity * (ratio - 1) * 10;
  const prob = 1 / (1 + Math.exp(exponent));
  return Math.max(0, Math.min(1, prob));
}

// ---------------------------------------------------------------------------
// Race Simulation (ELO-style)
// ---------------------------------------------------------------------------

/**
 * Return weighted sum of points from last N results
 * Most recent result × 1.2, older × 1.0; default N = 5
 */
export function driverStrengthScore(results: RaceResult[], lastN = 5): number {
  const recent = results.slice(-lastN);
  return recent.reduce((sum, r, i) => {
    const weight = i === recent.length - 1 ? 1.2 : 1.0;
    return sum + r.points * weight;
  }, 0);
}

/**
 * Return probability of driver winning
 * driver strength / sum of all strengths including driver
 */
export function winProbability(
  driverStrength: number,
  fieldStrengths: number[]
): number {
  const all = [...fieldStrengths, driverStrength];
  const total = all.reduce((s, x) => s + x, 0);
  if (total === 0) return 0;
  return driverStrength / total;
}

/**
 * Return probability of podium finish
 * Simplified: 3× win probability, clamped to [0, 1].
 * A driver with 3× the base win share would always podium.
 */
export function podiumProbability(
  driverStrength: number,
  fieldStrengths: number[]
): number {
  const all = [...fieldStrengths, driverStrength];
  const total = all.reduce((s, x) => s + x, 0);
  if (total === 0) return 0;
  return Math.min(1, (driverStrength / total) * 3);
}

/**
 * Return expected finish position ranked by strength descending (1 = strongest)
 */
export function expectedFinishPosition(
  driverStrength: number,
  fieldStrengths: number[]
): number {
  const all = [...fieldStrengths, driverStrength].sort((a, b) => b - a);
  return all.indexOf(driverStrength) + 1;
}

// ---------------------------------------------------------------------------
// Fantasy Scoring (DraftKings F1)
// ---------------------------------------------------------------------------

const DK_RACE_FINISH_POINTS: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
  11: 0,
  12: 0,
};

/**
 * Return DraftKings F1 fantasy score
 */
export function draftKingsF1Score(stats: {
  position: number;
  qualPosition: number;
  lapsCompleted: number;
  totalLaps: number;
  fastestLap: boolean;
  positions: { gained: number; lost: number };
  dnf: boolean;
}): number {
  let score = 0;

  // Race finish points
  score += DK_RACE_FINISH_POINTS[stats.position] ?? 0;

  // Fastest lap bonus
  if (stats.fastestLap) score += 5;

  // Position gained/lost
  const gained = Math.min(stats.positions.gained, 20);
  score += gained * 1;
  score -= stats.positions.lost * 0.5;

  // Laps completed fraction
  if (stats.totalLaps > 0) {
    score += (stats.lapsCompleted / stats.totalLaps) * 5;
  }

  // DNF penalty
  if (stats.dnf) score -= 15;

  // Grid bonus for pole position
  if (stats.qualPosition === 1) score += 3;

  return score;
}

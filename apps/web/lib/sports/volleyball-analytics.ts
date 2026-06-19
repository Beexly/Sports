/**
 * volleyball-analytics.ts
 * Pure TypeScript volleyball analytics — no external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VolleyballPosition = 'OH' | 'MB' | 'OPP' | 'S' | 'L' | 'DS';
// OH = Outside Hitter, MB = Middle Blocker, OPP = Opposite, S = Setter,
// L = Libero, DS = Defensive Specialist

export interface AttackStats {
  attempts: number;
  kills: number;
  errors: number;
}

export interface ServeReceptions {
  perfect: number;
  good: number;
  overpass: number;
  error: number;
}

export interface ServeStats {
  attempts: number;
  aces: number;
  errors: number;
  receptions: ServeReceptions;
}

export interface PassStats {
  attempts: number;
  perfect: number;
  good: number;
  overpass: number;
  error: number;
}

export interface BlockStats {
  solos: number;
  assists: number;
  errors: number;
}

export interface SetStats {
  assists: number;
  attempts: number;
  ballHandlingErrors: number;
}

export interface PlayerMatch {
  position: VolleyballPosition;
  attack: AttackStats;
  serve: ServeStats;
  pass: PassStats;
  block: BlockStats;
  set: SetStats;
  digs: number;
  receptions: number;
}

export interface TeamSet {
  pointsWon: number;
  pointsLost: number;
  duration?: number; // minutes
}

export interface MatchResult {
  sets: TeamSet[];
}

export interface ScoringRun {
  team: 0 | 1;
  length: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeDiv(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

// ---------------------------------------------------------------------------
// Attack Efficiency
// ---------------------------------------------------------------------------

/**
 * Kill percentage: kills / attempts
 */
export function killPct(attack: AttackStats): number {
  return safeDiv(attack.kills, attack.attempts);
}

/**
 * Error percentage: errors / attempts
 */
export function errorPct(attack: AttackStats): number {
  return safeDiv(attack.errors, attack.attempts);
}

/**
 * Attack efficiency (hitting percentage): (kills - errors) / attempts
 * Standard volleyball metric; range is approximately [-1, 1]
 */
export function attackEfficiency(attack: AttackStats): number {
  return safeDiv(attack.kills - attack.errors, attack.attempts);
}

/**
 * Side-out rate: sets won / receiving sets (when receiving serve)
 */
export function sideOutRate(setsWon: number, receivingSets: number): number {
  return safeDiv(setsWon, receivingSets);
}

/**
 * Break rate: sets won / serving sets (when serving)
 */
export function breakRate(setsWon: number, servingSets: number): number {
  return safeDiv(setsWon, servingSets);
}

/**
 * Points per set: kills / sets
 */
export function pointsPerSet(kills: number, sets: number): number {
  return safeDiv(kills, sets);
}

/**
 * Successful attack rate: kills / (attempts - errors) — "in play" attacks only
 */
export function successfulAttackRate(attack: AttackStats): number {
  const inPlay = attack.attempts - attack.errors;
  return safeDiv(attack.kills, inPlay);
}

// ---------------------------------------------------------------------------
// Serve Analytics
// ---------------------------------------------------------------------------

/**
 * Ace percentage: aces / attempts
 */
export function acePct(serve: ServeStats): number {
  return safeDiv(serve.aces, serve.attempts);
}

/**
 * Serve error percentage: errors / attempts
 */
export function serveErrorPct(serve: ServeStats): number {
  return safeDiv(serve.errors, serve.attempts);
}

/**
 * Serve aggression: (aces + forced reception errors) / attempts
 * Measures how threatening the serve is
 */
export function serveAggression(serve: ServeStats): number {
  return safeDiv(serve.aces + serve.receptions.error, serve.attempts);
}

/**
 * Serve efficiency rating: weighted (aces×1.0 + overpass×0.5 - errors×0.8) / attempts
 * Range approximately [-1, 1]
 */
export function serveEfficiencyRating(serve: ServeStats): number {
  const weighted = serve.aces * 1.0 + serve.receptions.overpass * 0.5 - serve.errors * 0.8;
  return safeDiv(weighted, serve.attempts);
}

/**
 * Pass quality index: (perfect×3 + good×2 - error×1) / (attempts × 3)
 * Clamped to [0, 1]
 */
export function passQualityIndex(pass: PassStats): number {
  return clamp(safeDiv(pass.perfect * 3 + pass.good * 2 - pass.error * 1, pass.attempts * 3), 0, 1);
}

/**
 * Reception quality index: same formula as passQualityIndex applied to serve.receptions
 */
export function receptionQualityIndex(serve: ServeStats): number {
  const r = serve.receptions;
  const total = r.perfect + r.good + r.overpass + r.error;
  return clamp(safeDiv(r.perfect * 3 + r.good * 2 - r.error * 1, total * 3), 0, 1);
}

// ---------------------------------------------------------------------------
// Blocking
// ---------------------------------------------------------------------------

/**
 * Blocks per set: (solos + 0.5 × assists) / setsPlayed
 * Standard counting method
 */
export function blockPerSet(block: BlockStats, setsPlayed: number): number {
  return safeDiv(block.solos + 0.5 * block.assists, setsPlayed);
}

/**
 * Block efficiency: (solos + assists) / (solos + assists + errors)
 */
export function blockEfficiency(block: BlockStats): number {
  const total = block.solos + block.assists + block.errors;
  return safeDiv(block.solos + block.assists, total);
}

/**
 * Block error rate: errors / (solos + assists + errors)
 */
export function blockError(block: BlockStats): number {
  const total = block.solos + block.assists + block.errors;
  return safeDiv(block.errors, total);
}

/**
 * Total blocks: solos + 0.5 × assists (standard counting)
 */
export function totalBlocks(block: BlockStats): number {
  return block.solos + 0.5 * block.assists;
}

// ---------------------------------------------------------------------------
// Setting
// ---------------------------------------------------------------------------

/**
 * Assist percentage: assists / attempts
 */
export function assistsPct(set: SetStats): number {
  return safeDiv(set.assists, set.attempts);
}

/**
 * Set efficiency: (assists - ballHandlingErrors) / attempts
 */
export function setEfficiency(set: SetStats): number {
  return safeDiv(set.assists - set.ballHandlingErrors, set.attempts);
}

/**
 * Set distribution: normalize to percentages summing to 1
 */
export function setDistribution(
  distribution: Record<VolleyballPosition, number>
): Record<VolleyballPosition, number> {
  const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
  const result = {} as Record<VolleyballPosition, number>;
  const positions: VolleyballPosition[] = ['OH', 'MB', 'OPP', 'S', 'L', 'DS'];
  for (const pos of positions) {
    result[pos] = safeDiv(distribution[pos] ?? 0, total);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Overall Ratings
// ---------------------------------------------------------------------------

/**
 * Player rating composite:
 * attackEfficiency×0.4 + passQualityIndex×0.15 + blockEfficiency×0.15 +
 * serveEfficiencyRating×0.15 + digsBonus (player.digs>10 ? 0.15 : player.digs/10×0.15)
 * Normalized to [0, 1]
 */
export function playerRating(player: PlayerMatch): number {
  // attackEfficiency is in [-1, 1]; normalize to [0, 1]
  const atkEff = clamp((attackEfficiency(player.attack) + 1) / 2, 0, 1);
  const passIdx = passQualityIndex(player.pass);
  const blkEff = blockEfficiency(player.block);
  // serveEfficiencyRating is in roughly [-1, 1]; normalize to [0, 1]
  const serveEff = clamp((serveEfficiencyRating(player.serve) + 1) / 2, 0, 1);
  const digsBonus = player.digs > 10 ? 0.15 : (player.digs / 10) * 0.15;

  const score =
    atkEff * 0.4 +
    passIdx * 0.15 +
    blkEff * 0.15 +
    serveEff * 0.15 +
    digsBonus;

  return clamp(score, 0, 1);
}

/**
 * Position-weighted rating:
 * OH: attack 0.5 + serve 0.2 + pass 0.2 + block 0.1
 * MB: block 0.45 + attack 0.35 + serve 0.1 + pass 0.1
 * S:  set 0.5 + serve 0.2 + pass 0.15 + block 0.15
 * L:  pass 0.5 + dig 0.3 + serve 0.2 (dig = digs/20 clamped 0-1)
 * OPP: attack 0.6 + serve 0.25 + block 0.15
 * DS: pass 0.6 + dig 0.4
 */
export function positionRating(player: PlayerMatch): number {
  const atkEff = clamp((attackEfficiency(player.attack) + 1) / 2, 0, 1);
  const passIdx = passQualityIndex(player.pass);
  const blkEff = blockEfficiency(player.block);
  const serveEff = clamp((serveEfficiencyRating(player.serve) + 1) / 2, 0, 1);
  const setEff = clamp((setEfficiency(player.set) + 1) / 2, 0, 1);
  const digProxy = clamp(player.digs / 20, 0, 1);

  switch (player.position) {
    case 'OH':
      return atkEff * 0.5 + serveEff * 0.2 + passIdx * 0.2 + blkEff * 0.1;
    case 'MB':
      return blkEff * 0.45 + atkEff * 0.35 + serveEff * 0.1 + passIdx * 0.1;
    case 'S':
      return setEff * 0.5 + serveEff * 0.2 + passIdx * 0.15 + blkEff * 0.15;
    case 'L':
      return passIdx * 0.5 + digProxy * 0.3 + serveEff * 0.2;
    case 'OPP':
      return atkEff * 0.6 + serveEff * 0.25 + blkEff * 0.15;
    case 'DS':
      return passIdx * 0.6 + digProxy * 0.4;
    default:
      return 0;
  }
}

/**
 * Impact score per set:
 * (kills - errors + 0.5×totalBlocks + 0.5×aces - 0.5×serveErrors + 0.3×digs) / setsPlayed
 */
export function impactScore(player: PlayerMatch, setsPlayed: number): number {
  const tb = totalBlocks(player.block);
  const numerator =
    player.attack.kills -
    player.attack.errors +
    0.5 * tb +
    0.5 * player.serve.aces -
    0.5 * player.serve.errors +
    0.3 * player.digs;
  return safeDiv(numerator, setsPlayed);
}

// ---------------------------------------------------------------------------
// Match / Set Stats
// ---------------------------------------------------------------------------

/**
 * Sets won: [team0 sets won, team1 sets won]
 */
export function setsWon(match: MatchResult): [number, number] {
  let t0 = 0;
  let t1 = 0;
  for (const s of match.sets) {
    if (s.pointsWon > s.pointsLost) t0++;
    else if (s.pointsLost > s.pointsWon) t1++;
  }
  return [t0, t1];
}

/**
 * Total points: [team0 total, team1 total]
 */
export function totalPoints(match: MatchResult): [number, number] {
  let t0 = 0;
  let t1 = 0;
  for (const s of match.sets) {
    t0 += s.pointsWon;
    t1 += s.pointsLost;
  }
  return [t0, t1];
}

/**
 * Point differential for team0: sum(pointsWon - pointsLost)
 */
export function pointDifferential(sets: TeamSet[]): number {
  return sets.reduce((sum, s) => sum + s.pointsWon - s.pointsLost, 0);
}

/**
 * Set win percentage for team0: sets won / total sets
 */
export function setWinPct(match: MatchResult): number {
  const [t0] = setsWon(match);
  return safeDiv(t0, match.sets.length);
}

/**
 * Match winner: 0 or 1. Returns null if incomplete.
 * Volleyball: first to 3 sets wins (or 2 for best-of-3 format — determined by score).
 */
export function matchWinner(match: MatchResult): 0 | 1 | null {
  const [t0, t1] = setsWon(match);
  if (t0 >= 3) return 0;
  if (t1 >= 3) return 1;
  // Best-of-3 format
  if (t0 >= 2 && t1 < 2) return 0;
  if (t1 >= 2 && t0 < 2) return 1;
  return null;
}

/**
 * Average set duration: mean of durations where present
 */
export function averageSetDuration(sets: TeamSet[]): number {
  const withDuration = sets.filter((s) => s.duration !== undefined);
  if (withDuration.length === 0) return 0;
  const total = withDuration.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  return total / withDuration.length;
}

/**
 * Set score from points: "25-18" format
 */
export function setScoreFromPoints(pointsWon: number, pointsLost: number): string {
  return `${pointsWon}-${pointsLost}`;
}

/**
 * Deuce detection:
 * Both scores ≥25 and difference ≤1, OR both ≥15 (fifth set) and difference ≤1
 */
export function isDeuce(teamSet: TeamSet): boolean {
  const { pointsWon, pointsLost } = teamSet;
  const diff = Math.abs(pointsWon - pointsLost);
  if (pointsWon >= 25 && pointsLost >= 25 && diff <= 1) return true;
  if (pointsWon >= 15 && pointsLost >= 15 && diff <= 1) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Rotation Analysis
// ---------------------------------------------------------------------------

/**
 * Rotation efficiency: mean score across 6 rotations
 */
export function rotationEfficiency(rotationScores: number[]): number {
  if (rotationScores.length === 0) return 0;
  return rotationScores.reduce((sum, v) => sum + v, 0) / rotationScores.length;
}

/**
 * Weakest rotation: index (0-5) of lowest score
 */
export function weakestRotation(rotationScores: number[]): number {
  if (rotationScores.length === 0) return 0;
  let minIdx = 0;
  let minVal = rotationScores[0] ?? 0;
  for (let i = 1; i < rotationScores.length; i++) {
    const v = rotationScores[i] ?? 0;
    if (v < minVal) {
      minVal = v;
      minIdx = i;
    }
  }
  return minIdx;
}

/**
 * Rotation variance: variance across 6 rotation scores
 */
export function rotationVariance(rotationScores: number[]): number {
  if (rotationScores.length === 0) return 0;
  const mean = rotationEfficiency(rotationScores);
  const squaredDiffs = rotationScores.map((v) => (v - mean) ** 2);
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / rotationScores.length;
}

/**
 * Serving rotation order: rotate array so startingServer index is first
 */
export function servingRotationOrder(players: string[], startingServer: number): string[] {
  const idx = startingServer % players.length;
  return [...players.slice(idx), ...players.slice(0, idx)];
}

// ---------------------------------------------------------------------------
// Momentum
// ---------------------------------------------------------------------------

/**
 * Run lengths: identify consecutive scoring runs per team
 */
export function runLengths(pointSequence: (0 | 1)[]): ScoringRun[] {
  if (pointSequence.length === 0) return [];
  const runs: ScoringRun[] = [];
  let current: ScoringRun = { team: pointSequence[0]!, length: 1 };
  for (let i = 1; i < pointSequence.length; i++) {
    if (pointSequence[i] === current.team) {
      current.length++;
    } else {
      runs.push({ ...current });
      current = { team: pointSequence[i]!, length: 1 };
    }
  }
  runs.push({ ...current });
  return runs;
}

/**
 * Longest run: the longest consecutive scoring run in the sequence
 */
export function longestRun(pointSequence: (0 | 1)[]): ScoringRun {
  const runs = runLengths(pointSequence);
  if (runs.length === 0) return { team: 0, length: 0 };
  return runs.reduce((best, r) => (r.length > best.length ? r : best), runs[0]!);
}

/**
 * Momentum shifts: indices where momentum shifts (after a run ≥ minRun, default 3)
 * Returns the index in the original pointSequence where the shift occurred
 */
export function momentumShifts(pointSequence: (0 | 1)[], minRun = 3): number[] {
  const shifts: number[] = [];
  const runs = runLengths(pointSequence);
  let idx = 0;
  for (let i = 0; i < runs.length - 1; i++) {
    const run = runs[i];
    if (run === undefined) continue;
    idx += run.length;
    // A shift happens at the boundary after a qualifying run
    if (run.length >= minRun) {
      shifts.push(idx);
    }
  }
  return shifts;
}

/**
 * Clutch performance: win rate in points played when score is within 2 of winning
 * (default pointsToWin = 25)
 */
export function clutchPerformance(
  pointSequence: (0 | 1)[],
  pointsToWin = 25
): number {
  let score0 = 0;
  let score1 = 0;
  let clutchWins = 0;
  let clutchTotal = 0;

  for (const point of pointSequence) {
    // Check if either team is within 2 of winning (i.e., at ≥ pointsToWin - 2)
    const isClutch = score0 >= pointsToWin - 2 || score1 >= pointsToWin - 2;
    if (isClutch) {
      clutchTotal++;
      if (point === 0) clutchWins++;
    }
    if (point === 0) score0++;
    else score1++;
  }

  return safeDiv(clutchWins, clutchTotal);
}

// ---------------------------------------------------------------------------
// Fantasy Scoring
// ---------------------------------------------------------------------------

export interface DraftKingsVBStats {
  kills: number;
  errors: number;
  aces: number;
  digs: number;
  blocks: number;
  assists: number;
  sets: number;
}

export interface FanDuelVBStats {
  kills: number;
  errors: number;
  aces: number;
  digs: number;
  blocks: number;
  assists: number;
}

/**
 * DraftKings volleyball score:
 * kills×2, errors×-0.5, aces×2, digs×0.5, blocks×2, assists×1.5
 * Double-double bonus (+1.5): if ≥2 of (kills≥10, digs≥10, blocks≥5, aces≥3, assists≥25)
 */
export function draftKingsVBScore(stats: DraftKingsVBStats): number {
  const base =
    stats.kills * 2 +
    stats.errors * -0.5 +
    stats.aces * 2 +
    stats.digs * 0.5 +
    stats.blocks * 2 +
    stats.assists * 1.5;

  // Double-double check
  const qualifiers = [
    stats.kills >= 10,
    stats.digs >= 10,
    stats.blocks >= 5,
    stats.aces >= 3,
    stats.assists >= 25,
  ].filter(Boolean).length;

  const bonus = qualifiers >= 2 ? 1.5 : 0;
  return base + bonus;
}

/**
 * FanDuel volleyball score:
 * kills×2, errors×-1, aces×3, digs×1, blocks×2, assists×1
 */
export function fanDuelVBScore(stats: FanDuelVBStats): number {
  return (
    stats.kills * 2 +
    stats.errors * -1 +
    stats.aces * 3 +
    stats.digs * 1 +
    stats.blocks * 2 +
    stats.assists * 1
  );
}

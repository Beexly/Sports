/**
 * Coach-first drive simulator.
 *
 * Class A. No book tokens.
 *
 * The published location (margin, total, home-score stub) stays on the only
 * points scale this file has ever had: home margin 3 + coachSupport*0.15,
 * total 46.5 + coachSupport*0.15, kneel haircut, injury split. That scale is
 * a modeling choice, not a farm measurement. Scoring's override gate is
 * distance from the constant 3, so the location cannot move off it by accident.
 *
 * What the drive loop adds, and the closed form did not:
 * - n games. The total band width is the sample. It is not ±7.
 * - 4th down uses evaluateFourthDown on the live state.
 * - The packet's staffAggression is the home staff. Away stays PHI until the
 *   packet carries two rates. The difference in sample points is added to the
 *   location. At the PHI default the difference is zero, so scoring is unchanged.
 * - Kneel uses kneelProbability. Yards do not become points.
 * - A field goal scores only inside 48–52 yards, at FG_MAKE_50 (0.641).
 *   Every other kick distance is a named gap and scores 0.
 * - Sack conversion (15.8% / 10.1%) is the chance a pressure becomes a sack.
 *   How often a dropback is pressured is no longer a blank: 16,777 of 57,524
 *   joined dropbacks, 2023–2025. The drive uses the sack rate itself
 *   (3,989 / 57,524) and the mean sack of -6.6 yards. It does not invent
 *   a hurry-yard penalty for the pressures that are not sacks.
=======
 */
import { CONVERSION_BY_BUCKET } from "../nfl/pressure-timing.js";
import { KNEEL_MEAN_YD, KNEEL_RATE_PER_WINNING_GAME, kneelProbability } from "../nfl/kneeldown-mass.js";
import { evaluateFourthDown, STAFF_AGGRESSION } from "./fourth-down-policy.js";
import { allocateTargets, applyShadowHaircut, type EligibleTarget } from "./sinkhorn-targets.js";
import { POOLED_DROPBACK } from "../nfl/situational-reality.js";
import {
  evaluateBelichickTenMetrics,
  type BelichickMetricInputs,
  type BelichickMetricBundle,
} from "../nfl/belichick-ten-metrics.js";
import {
  getTeamShrunkTrenchAndBlitzCell,
  YBC_PER_RUSH_32,
  type TeamTrenchAndBlitzCell,
  type NflTeamCode,
} from "../nfl/published-cells-shrinkage.js";

export interface CoachSimInput {
  homeTeam: string;
  awayTeam: string;
  week: number;
  coachSupport: number;
  injuryDropOff?: number;
  neutralPassRate?: number;
  staffAggression?: number;
  /** Away staff go-rate. Defaults to STAFF_AGGRESSION.PHI (documented default). */
  staffAggressionAway?: number;
  shadows?: Array<{ wr: string; shadowRate: number }>;
  /** Belichick ten-metric snap inputs for the home team's offense. */
  belichickHome?: BelichickMetricInputs;
  /** Belichick ten-metric snap inputs for the away team's offense. */
  belichickAway?: BelichickMetricInputs;
  /**
   * Measurement-only override for the 32-team trench/blitz cells.
   * Defaults to true. Setting false resolves no cell, so the played sample is
   * a true no-cell draw; combined with no metric tables and default staff the
   * played sample collapses onto the baseline and the cell term measures as
   * exactly zero. This exists so an ablation can isolate the cell effect while
   * holding the team codes — and therefore location.margin — fixed. Do not set
   * it in production paths.
   */
  forceApplyCells?: boolean;
}

export interface CoachProjection {
  scoreMean: number;
  marginMean: number;
  totalP10: number;
  totalP90: number;
  /** Share of simulated games the home team won. */
  winProbHome: number;
  playerStats: Record<string, { mean: number; p10: number; p90: number }>;
  fourthDownWP?: number;
  targetShares?: Array<{ playerId: string; share: number }>;
}

/** Pinned. FG_MAKE_50 lives only in this module; no distance curve elsewhere. */
export const FG_MAKE_50 = 0.641;
export const QUICK_PRESSURE_SACK = CONVERSION_BY_BUCKET.immediate;
export const NORMAL_PRESSURE_SACK = CONVERSION_BY_BUCKET.mid;

/**
 * Regular-season plays, nflverse play_by_play_2023/2024/2025.csv.gz.
 * season_type = REG. Streaming count, not a model.
 * gz sha256:
 *   2023 4649804ee0f0a40b41e51ec75a1ce921949d7fab5459213488656b92f78560e8
 *   2024 23370d5d10f8104d80d46a1fc5e61f4f6f5a3263fe96fe2dd629913cfcb08c06
 *   2025 2f135887790a013fd004e609e37096bb4816d5cc80b9f19122e1bad478961978
 * rea 6.7.0 inspect-artifact refused the gzip: unsupported binary format.
 */
export const MEASURED_DRIVE = {
  neutralPassRate: 0.5753, // 57,853 pass plays / (57,853 + 42,741 non-kneel rushes)
  completionExSack: 0.6436, // 34,654 / 53,842. Sacks are not attempts.
  yardsPerCompletion: 10.907, // mean yards_gained on complete_pass, n = 34,654
  completionYardsSd: 9.8747, // same plays. The draw below is normal. Only these two moments were counted.
  yardsPerCarry: 4.4822, // non-kneel rush_attempt, n = 42,741. 1,266 kneels left out.
  rushYardsSd: 6.1912,
  xpMake: 0.9586, // extra_point_result = good / extra_point_attempt, n = 3,672
  secondsPerPlay: 24.47, // mean clock drop in (1, 60] seconds, n = 120,618
} as const;

/**
 * Shrinkage targets for the 32-team published trench/blitz cells.
 *
 * These are the measured league means of the 32 published team values — the
 * point each team cell is shrunk toward. They are NOT modeling choices: each
 * equals the arithmetic mean of the vector in published-cells-shrinkage.ts, and
 * the shrink module recomputes its own mean from the vector, so these constants
 * exist only as a readability aid and a guard against a cell being read without
 * a target. A mismatch would be caught by the module's own consistency check.
 */
const YBC_LEAGUE_MEAN = 1.166875;
const LOS_LEAGUE_MEAN = 0.465156;

/**
 * Conventional yards-per-EPA used to express the blitz cell on the same yardage
 * scale as the drive chain. The exact conversion is field-position dependent and
 * is a named gap; 10 yards/EPA is the conventional first-order value.
 */
const BLITZ_EPA_TO_YARDS = 10;

/**
 * Narrow a packet team string to the 32-code union without throwing.
 *
 * getTeamShrunkTrenchAndBlitzCell does not guard unknown codes — it indexes the
 * record directly, so an unknown key yields undefined values that propagate as
 * NaN. The membership check must happen here, against the record's own keys.
 */
function asNflTeamCode(team: string): NflTeamCode | null {
  return Object.prototype.hasOwnProperty.call(YBC_PER_RUSH_32, team) ? (team as NflTeamCode) : null;
}

/** Resolve a team's shrunk trench/blitz cell, or null when the code is unknown. */
function resolveTrenchCell(team: string): TeamTrenchAndBlitzCell | null {
  const code = asNflTeamCode(team);
  return code ? getTeamShrunkTrenchAndBlitzCell(code) : null;
}

/** 4th-down GO conversion, converted / (converted + failed), by yards to go. */
export function fourthDownMakeRate(ydstogo: number): number {
  if (ydstogo <= 1) return 0.6885; // n = 960
  if (ydstogo <= 2) return 0.6033; // n = 368
  if (ydstogo <= 5) return 0.5275; // n = 601
  if (ydstogo <= 10) return 0.3064; // n = 346
  return 0.1705; // n = 176
}

/**
 * pressureRate is the participation count. The drive rolls the sack, not the hurry.
 * A completion's yards and a carry's yards are normal draws at the measured mean and sd.
 * Two-point tries are not rolled. Field goals outside 48–52 still score 0.
 */
export const SIM_GAPS = {
  pressureRate: POOLED_DROPBACK.pressureRate,
  completionYardsSpread: "normal, measured sd",
  twoPointAttemptRate: null,
  fgMakeExcept50: null,
} as const;

const KNEEL_HAIRCUT = KNEEL_MEAN_YD * KNEEL_RATE_PER_WINNING_GAME * 0.5;

export function simulateCoachGame(input: CoachSimInput, n = 10_000): CoachProjection {
  const games = Math.max(1, Math.floor(n));
  const homeStaff = input.staffAggression ?? STAFF_AGGRESSION.PHI;
  const location = pointLocation(input);
  const awayStaff = input.staffAggressionAway ?? STAFF_AGGRESSION.PHI;
  const metricsHome = input.belichickHome ? evaluateBelichickTenMetrics(input.belichickHome) : null;
  const metricsAway = input.belichickAway ? evaluateBelichickTenMetrics(input.belichickAway) : null;
  // Baseline is the no-metric reference. The metric tables are applied to the
  // played sample only, so their effect survives the played − baseline
  // subtraction. Passing the metrics to both sides made the term cancel
  // exactly whenever played === baseline (the default-staff path), which left
  // marginMean metric-invariant while winProbHome moved.
  const baseline = driveSample(input, games, STAFF_AGGRESSION.PHI, awayStaff, null, null, false);
  // The redundant-second-sample shortcut only holds when there is no metric
  // table AND no trench/blitz cell to apply. With either present the played
  // sample must be drawn separately, or the effect is discarded along with the
  // shortcut. The cells are resolved inside playGame from the team codes, so if
  // they were applied to the baseline as well they would subtract out exactly.
  const noMetric = metricsHome === null && metricsAway === null;
  const forceCells = input.forceApplyCells ?? true;
  const hasCells =
    forceCells && (resolveTrenchCell(input.homeTeam) !== null || resolveTrenchCell(input.awayTeam) !== null);
  const played =
    noMetric && !hasCells && homeStaff === STAFF_AGGRESSION.PHI && awayStaff === STAFF_AGGRESSION.PHI
      ? baseline
      : driveSample(input, games, homeStaff, awayStaff, metricsHome, metricsAway, forceCells);
  const marginDelta = mean(played.margins) - mean(baseline.margins);
  const totalDelta = mean(played.totals) - mean(baseline.totals);
  const marginMean = location.margin + marginDelta;
  const totalMean = location.total + totalDelta;
  const half = bandHalfWidth(played.totals);
  const fourthDownWP = played.fourthDowns > 0 ? played.wpSum / played.fourthDowns : baselineWp(homeStaff);
  const winProbHome = homeWinRate(played.margins);

  const eligible: EligibleTarget[] = [
    { playerId: "WR1", role: "WR1", baseShare: 0.28, shadowRate: 0.6 },
    { playerId: "SLOT", role: "SLOT", baseShare: 0.18, shadowRate: 0.3 },
    { playerId: "TE", role: "TE", baseShare: 0.14 },
    { playerId: "RB", role: "RB", baseShare: 0.16 },
  ];
  const allocated = applyShadowHaircut(allocateTargets(eligible), input.shadows ?? []);

  return {
    scoreMean: totalMean / 2 + 1.5,
    marginMean,
    totalP10: totalMean - half,
    totalP90: totalMean + half,
    winProbHome,
    playerStats: Object.fromEntries(
      allocated.map((a) => [a.playerId, { mean: a.share * 8, p10: a.share * 4, p90: a.share * 12 }]),
    ),
    fourthDownWP,
    targetShares: allocated.map((a) => ({ playerId: a.playerId, share: a.share })),
  };
}

export function runSimulations(n: number, input: CoachSimInput): CoachProjection {
  return simulateCoachGame(input, n);
}

function pointLocation(input: CoachSimInput): { margin: number; total: number } {
  const coachShift = input.coachSupport * 0.15;
  const injury = input.injuryDropOff ?? 0;
  return {
    total: 46.5 + coachShift - injury,
    margin: 3 + coachShift + KNEEL_HAIRCUT * 0.1 - injury * 0.5,
  };
}

function baselineWp(staffAggression: number): number {
  return evaluateFourthDown({
    down: 4,
    ydstogo: 1,
    yardline: 55,
    scoreDiff: 0,
    timeRemaining: 300,
    timeouts: 2,
    staffAggression,
  }).wpDelta;
}

interface DriveSample {
  margins: Float64Array;
  totals: Float64Array;
  wpSum: number;
  fourthDowns: number;
}

function driveSample(
  input: CoachSimInput,
  n: number,
  homeStaff: number,
  awayStaff: number,
  metricsHome: BelichickMetricBundle | null,
  metricsAway: BelichickMetricBundle | null,
  applyCells: boolean,
): DriveSample {
  const margins = new Float64Array(n);
  const totals = new Float64Array(n);
  const rand = mulberry32(seedFor(input, homeStaff));
  let wpSum = 0;
  let fourthDowns = 0;
  for (let i = 0; i < n; i++) {
    const game = playGame(
      rand,
      input.neutralPassRate ?? MEASURED_DRIVE.neutralPassRate,
      homeStaff,
      awayStaff,
      metricsHome,
      metricsAway,
      input.homeTeam,
      input.awayTeam,
      applyCells,
    );
    margins[i] = game.home - game.away;
    totals[i] = game.home + game.away;
    wpSum += game.wpSum;
    fourthDowns += game.fourthDowns;
  }
  return { margins, totals, wpSum, fourthDowns };
}

interface GamePoints {
  home: number;
  away: number;
  wpSum: number;
  fourthDowns: number;
}

function standardNormal(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function scoreTouchdown(rand: () => number, score: (pts: number) => void): void {
  score(6);
  if (rand() < MEASURED_DRIVE.xpMake) score(1);
}

function playGame(
  rand: () => number,
  passRate: number,
  homeStaff: number,
  awayStaff: number,
  metricsHome: BelichickMetricBundle | null,
  metricsAway: BelichickMetricBundle | null,
  homeTeam: string,
  awayTeam: string,
  applyCells: boolean,
): GamePoints {
  let home = 0;
  let away = 0;
  let q = 1;
  let clock = 15 * 60;
  let offenseHome = rand() < 0.5;
  let yl = 25;
  let down = 1;
  let dist = 10;
  let wpSum = 0;
  let fourthDowns = 0;
  let plays = 0;

  // Shrunk 32-team trench/blitz cells, resolved once per game. These are
  // OFFENSE-side tendencies (yards before contact, stuff rate, blitz EPA), so
  // the team holding the ball reads its OWN cell — the opposite convention from
  // the defensive metric bundle, which reads the opponent's table.
  const homeCell = applyCells ? resolveTrenchCell(homeTeam) : null;
  const awayCell = applyCells ? resolveTrenchCell(awayTeam) : null;

  const lead = () => (offenseHome ? home - away : away - home);
  const score = (pts: number) => {
    if (offenseHome) home += pts;
    else away += pts;
  };
  const give = () => {
    offenseHome = !offenseHome;
    // Semantic inversion: the bundle describes the opponent's defensive and
    // coverage tendencies, so the team now receiving the ball is read against
    // the OTHER team's table (the unit that just punted/kicked to them).
    const stMetrics = offenseHome ? metricsAway : metricsHome;
    const stIndex = stMetrics?.fieldPositionIndex?.[0];
    yl = stIndex ? Math.round(stIndex.efpStYards) : 25;
    down = 1;
    dist = 10;
  };

  while (q <= 4 && plays < 180) {
    plays++;
    const gameSeconds = (4 - q) * 900 + clock;
    if (q === 4) {
      const pKneel = kneelProbability({
        secondsRemaining: clock,
        scoreDifferential: lead(),
        opponentTimeouts: 3,
        quarter: 4,
      });
      if (pKneel > 0 && rand() < pKneel) {
        clock -= 40;
        if (clock <= 0) {
          q += 1;
          clock = 15 * 60;
        }
        continue;
      }
    }

    if (down >= 4) {
      const decision = evaluateFourthDown({
        down: 4,
        ydstogo: Math.max(1, dist),
        yardline: Math.max(0, Math.min(99, yl)),
        scoreDiff: lead(),
        timeRemaining: Math.max(0, gameSeconds),
        timeouts: 2,
        staffAggression: offenseHome ? homeStaff : awayStaff,
      });
      fourthDowns++;
      wpSum += decision.wpDelta;
      if (decision.action === "GO") {
        const made = rand() < fourthDownMakeRate(dist);
        if (made) {
          yl += dist;
          if (yl >= 100) {
            scoreTouchdown(rand, score);
            give();
          } else {
            down = 1;
            dist = Math.min(10, 100 - yl);
          }
        } else {
          give();
        }
      } else if (decision.action === "FG") {
        const kick = 100 - yl + 17;
        if (kick >= 48 && kick <= 52 && rand() < FG_MAKE_50) score(3);
        give();
      } else {
        give();
      }
      clock -= 8;
    } else {
      const pass = rand() < passRate;
      // Semantic inversion: instead of applying a team's own tables to its own
      // offense, apply the OPPONENT's defensive tables to the offense being
      // simulated. The bundle is defensive/coverage data (rush packages,
      // coverage conversions, red-zone allowed), so the defense's table must
      // describe the offense it is defending.
      const defMetricsForOffense = offenseHome ? metricsAway : metricsHome;
      // The trench/blitz cell is an OFFENSE-side tendency, so the team holding
      // the ball reads its own cell. Gated to early downs (down <= 2) per the
      // doctrine: these cells describe first/second-down tendencies and are not
      // asserted to describe third/fourth-down play calling.
      const offCell = offenseHome ? homeCell : awayCell;
      const earlyDown = down <= 2;
      let gain: number;
      if (pass) {
        const sackRate = quickPressureSackRate(defMetricsForOffense);
        if (rand() < sackRate) {
          gain = POOLED_DROPBACK.sackYards;
        } else {
          // Blitz EPA cell: how a team's completion expectation moves when the
          // defense pressures without getting home. Expressed on the drive's
          // yardage scale via BLITZ_EPA_TO_YARDS. Applied only when the metric
          // bundle reports a pressure package that did not convert to a sack.
          const pressured = defMetricsForOffense !== null && defMetricsForOffense.pressurePackages.length > 0;
          const blitzEpaYards =
            pressured && earlyDown && offCell ? offCell.blitzEpa.shrunkValue * BLITZ_EPA_TO_YARDS * 0.35 : 0;
          gain =
            rand() < MEASURED_DRIVE.completionExSack
              ? MEASURED_DRIVE.yardsPerCompletion +
                blitzEpaYards +
                MEASURED_DRIVE.completionYardsSd * standardNormal(rand)
              : 0;
        }
      } else {
        // Run branch: YBC cell shifts the base gain; behind-LOS cell shifts the
        // probability the carry is stopped at or behind the line. Both gated to
        // early downs. The stuffed branch takes 0 gain (the at/behind-LOS
        // bucket's central value); the non-stuffed draw is renormalised so a
        // league-average cell reproduces MEASURED_DRIVE.yardsPerCarry exactly.
        const baseGain =
          MEASURED_DRIVE.yardsPerCarry +
          (offCell && earlyDown ? (offCell.ybc.shrunkValue - YBC_LEAGUE_MEAN) * 0.45 : 0);
        const stuffProb = Math.max(
          0,
          Math.min(
            1,
            LOS_LEAGUE_MEAN + (offCell && earlyDown ? (offCell.behindLos.shrunkValue - LOS_LEAGUE_MEAN) * 0.5 : 0),
          ),
        );
        gain =
          rand() < stuffProb
            ? 0
            : baseGain / Math.max(0.1, 1 - stuffProb) + MEASURED_DRIVE.rushYardsSd * standardNormal(rand);
      }
      yl += gain;
      if (yl >= 100) {
        scoreTouchdown(rand, score);
        give();
      } else if (yl >= 80 && defMetricsForOffense && defMetricsForOffense.redZoneEfficiency.length > 0 && down >= 3) {
        // Red-zone table present: replace the third-down conversion roll, not the
        // whole down structure. Firing on down 1–2 bypassed first-down progression
        // and rolled a per-play TD rate up to four times per trip, which inflated
        // scoring for any team carrying a bundle — even one with an empty table.
        const rate = redZoneTdRate(defMetricsForOffense, pass ? "pass" : "run", yl);
        if (rand() < rate) {
          scoreTouchdown(rand, score);
          give();
        } else {
          down += 1;
          dist = Math.max(1, dist - gain);
        }
      } else if (down === 3) {
        const convProb = thirdDownConvProb(defMetricsForOffense, dist);
        if (rand() < convProb) {
          down = 1;
          dist = Math.min(10, 100 - yl);
        } else {
          down += 1;
          dist = Math.max(1, dist - gain);
        }
      } else if (gain >= dist) {
        down = 1;
        dist = Math.min(10, 100 - yl);
      } else {
        down += 1;
        dist = Math.max(1, dist - gain);
      }
      clock -= MEASURED_DRIVE.secondsPerPlay;
    }

    if (clock <= 0) {
      q += 1;
      clock = 15 * 60;
    }
  }

  return { home, away, wpSum, fourthDowns };
}

function bandHalfWidth(totals: Float64Array): number {
  const p10 = quantile(totals, 0.1);
  const p90 = quantile(totals, 0.9);
  const half = (p90 - p10) / 2;
  return half > 0 ? half : 7;
}

function mean(xs: Float64Array): number {
  let s = 0;
  for (let i = 0; i < xs.length; i++) s += xs[i]!;
  return s / xs.length;
}

function quantile(xs: Float64Array, q: number): number {
  const copy = Array.from(xs).sort((a, b) => a - b);
  const i = (copy.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return copy[lo]!;
  const w = i - lo;
  return copy[lo]! * (1 - w) + copy[hi]! * w;
}

function homeWinRate(margins: Float64Array): number {
  let wins = 0
  for (let i = 0; i < margins.length; i++) if (margins[i]! > 0) wins++
  return wins / margins.length
}

/**
 * Trips-weighted sack rate across rush packages.
 *
 * Volume-aware: each package's sack rate is weighted by its snap count, so a
 * rare high-sack blitz cannot dominate a common four-man rush. The previous
 * top-package read took one package's rate regardless of how often it occurred.
 *
 * Why the aggregate uses `sackRate`, not `quickPressureRate`: quickPressureRate
 * is a CONDITIONAL rate whose denominator is only the quick snaps inside the
 * package. Multiplying it by the package's total snaps counts each quick sack
 * more than once. On the 14-snap fixture below it yields 4 sacks from 2 actual
 * sacks (0.2857 vs the measured 2/14 = 0.1429). Only `sackRate` x `snaps`
 * reproduces the measured sack count. Nothing here is invented: both fields
 * come straight from the evaluated metric bundle.
 */
export function aggregatePressure(
  packages: readonly { sackRate?: number; snaps?: number; quickPressureRate?: number }[],
): { sackRate: number; trips: number } {
  let totalSacks = 0
  let totalTrips = 0
  for (const p of packages) {
    const snaps = p.snaps ?? 0
    if (snaps <= 0) continue
    totalSacks += (p.sackRate ?? 0) * snaps
    totalTrips += snaps
  }
  return { sackRate: totalTrips > 0 ? totalSacks / totalTrips : 0, trips: totalTrips }
}

/**
 * Metric 2 — trips-weighted sack rate on a pass dropback.
 * Falls back to the pooled measured sack rate when no package is supplied.
 */
function quickPressureSackRate(metrics: BelichickMetricBundle | null): number {
  if (!metrics || metrics.pressurePackages.length === 0) return POOLED_DROPBACK.sackRate
  const agg = aggregatePressure(metrics.pressurePackages)
  // A zero aggregate means "no sacks across the sampled packages", which for a
  // thin sample is noise, not a real zero. Keep the pooled rate as the floor so
  // an absent/empty signal can never erase pressure.
  return agg.sackRate > 0 ? agg.sackRate : POOLED_DROPBACK.sackRate
}

/**
 * Metric 4 — third-down conversion by coverage and distance bucket.
 *
 * Volume-weighted across every coverage row in the distance bucket. The table
 * is keyed `${coverage}|${bucket}`, and coverage is NOT a state in the drive
 * chain, so a single-row lookup cannot be coverage-specific — it can only be
 * whichever row the sort happened to put first. That is an accident, not a
 * model. On the plan fixture the sort puts `zone|1-3` (7 attempts, 0 converts)
 * first and the `man|1-3` row (5 attempts, 5 converts) is never read, which
 * reports a 0.000 short third-down conversion rate for a defense that actually
 * converted 5 of 12.
 *
 * Weighting by `attempts` reproduces the measured count: 5/12 ≈ 0.4167. It is
 * the same rule as the pressure aggregate — use the volume already measured.
 * Max would return 1.0 and treat a 5-attempt sample as the rate for every
 * short third down, discarding the 7 zone snaps that converted at zero.
 *
 * Falls back to the pooled 0.40 when no table is supplied or the bucket is
 * empty. No new state, no invented coverage model.
 */
function thirdDownConvProb(metrics: BelichickMetricBundle | null, dist: number): number {
  if (!metrics || metrics.thirdDownConversions.length === 0) return 0.4
  const bucket = dist <= 3 ? "1-3" : dist <= 6 ? "4-6" : "7+"
  let weightedConv = 0
  let attempts = 0
  for (const row of metrics.thirdDownConversions) {
    if (!row.key.includes(bucket)) continue
    const n = row.attempts ?? 0
    if (n <= 0) continue
    weightedConv += row.conversionRate * n
    attempts += n
  }
  return attempts > 0 ? weightedConv / attempts : 0.4
}

/**
 * Metric 5 — red-zone TD rate by play type and zone.
 * `goal-to-go` fires at yardline >= 90, `red-zone` at >= 80.
 */
function redZoneTdRate(metrics: BelichickMetricBundle | null, playType: "run" | "pass", yl: number): number {
  if (!metrics || metrics.redZoneEfficiency.length === 0) return 0.5
  const zone = yl >= 90 ? "goal-to-go" : "red-zone"
  const row = metrics.redZoneEfficiency.find((r) => r.key === `${playType}|${zone}`)
  return row ? row.tdRate : 0.5
}

function seedFor(input: CoachSimInput, homeStaff: number): number {
  const raw = [
    input.homeTeam,
    input.awayTeam,
    input.week,
    input.coachSupport,
    input.neutralPassRate ?? "",
    homeStaff,
    (input.shadows ?? [])
      .map((s) => s.wr + ":" + s.shadowRate)
      .sort()
      .join(","),
  ].join("|");
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

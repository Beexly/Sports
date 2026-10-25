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
  const baseline = driveSample(input, games, STAFF_AGGRESSION.PHI, awayStaff, null, null);
  // The redundant-second-sample shortcut only holds when there is no metric
  // table to apply. With metrics present the played sample must be drawn
  // separately, or the metric effect is discarded along with the shortcut.
  const noMetric = metricsHome === null && metricsAway === null;
  const played =
    noMetric && homeStaff === STAFF_AGGRESSION.PHI && awayStaff === STAFF_AGGRESSION.PHI
      ? baseline
      : driveSample(input, games, homeStaff, awayStaff, metricsHome, metricsAway);
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
      let gain: number;
      if (pass) {
        const sackRate = quickPressureSackRate(defMetricsForOffense);
        if (rand() < sackRate) {
          gain = POOLED_DROPBACK.sackYards;
        } else {
          gain =
            rand() < MEASURED_DRIVE.completionExSack
              ? MEASURED_DRIVE.yardsPerCompletion + MEASURED_DRIVE.completionYardsSd * standardNormal(rand)
              : 0;
        }
      } else {
        gain = MEASURED_DRIVE.yardsPerCarry + MEASURED_DRIVE.rushYardsSd * standardNormal(rand);
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
 * Metric 2 — quick-pressure survivor as the sack rate on a pass dropback.
 * Falls back to the pooled measured sack rate when no package is supplied.
 */
function quickPressureSackRate(metrics: BelichickMetricBundle | null): number {
  if (!metrics || metrics.pressurePackages.length === 0) return POOLED_DROPBACK.sackRate
  const top = metrics.pressurePackages[0]!
  // A zero here means "no sacks in the dominant package", which for a thin
  // sample is noise, not a real zero. Falling through to top.sackRate returned
  // 0 as well and the offense was never sacked. Keep the pooled rate as the
  // floor so an absent/empty signal can never erase pressure.
  if (top.quickPressureRate > 0) return top.quickPressureRate
  if (top.sackRate > 0) return top.sackRate
  return POOLED_DROPBACK.sackRate
}

/**
 * Metric 4 — third-down conversion by coverage and distance bucket.
 * Falls back to the pooled 0.40 when no table is supplied.
 */
function thirdDownConvProb(metrics: BelichickMetricBundle | null, dist: number): number {
  if (!metrics || metrics.thirdDownConversions.length === 0) return 0.4
  const bucket = dist <= 3 ? "1-3" : dist <= 6 ? "4-6" : "7+"
  const row = metrics.thirdDownConversions.find((r) => r.key.includes(bucket))
  return row ? row.conversionRate : 0.4
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

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
 * - Sack conversion (15.8% / 10.1%) is pinned, but no pressure frequency is.
 *   Sacks are not rolled. See SIM_GAPS.
 */
import { CONVERSION_BY_BUCKET } from "../nfl/pressure-timing.js";
import { KNEEL_MEAN_YD, KNEEL_RATE_PER_WINNING_GAME, kneelProbability } from "../nfl/kneeldown-mass.js";
import { evaluateFourthDown, STAFF_AGGRESSION } from "./fourth-down-policy.js";
import { allocateTargets, applyShadowHaircut, type EligibleTarget } from "./sinkhorn-targets.js";

export interface CoachSimInput {
  homeTeam: string;
  awayTeam: string;
  week: number;
  coachSupport: number;
  injuryDropOff?: number;
  neutralPassRate?: number;
  staffAggression?: number;
  shadows?: Array<{ wr: string; shadowRate: number }>;
}

export interface CoachProjection {
  scoreMean: number;
  marginMean: number;
  totalP10: number;
  totalP90: number;
  playerStats: Record<string, { mean: number; p10: number; p90: number }>;
  fourthDownWP?: number;
  targetShares?: Array<{ playerId: string; share: number }>;
}

/** Pinned. FG_MAKE_50 lives only in this module; no distance curve elsewhere. */
export const FG_MAKE_50 = 0.641;
export const QUICK_PRESSURE_SACK = CONVERSION_BY_BUCKET.immediate;
export const NORMAL_PRESSURE_SACK = CONVERSION_BY_BUCKET.mid;

/**
 * Not measurements. They exist so a drive can reach a 4th down.
 * pressureRate is null on purpose: the conversion rates above have no frequency to multiply.
 */
export const SIM_GAPS = {
  neutralPassRate: 0.5,
  completion: 0.62,
  runGain: 4,
  shortYardageConversion: 0.5,
  secondsPerPlay: 28,
  touchdownPoints: 7,
  pressureRate: null,
} as const;

const KNEEL_HAIRCUT = KNEEL_MEAN_YD * KNEEL_RATE_PER_WINNING_GAME * 0.5;

export function simulateCoachGame(input: CoachSimInput, n = 10_000): CoachProjection {
  const games = Math.max(1, Math.floor(n));
  const homeStaff = input.staffAggression ?? STAFF_AGGRESSION.PHI;
  const location = pointLocation(input);
  const baseline = driveSample(input, games, STAFF_AGGRESSION.PHI);
  const played =
    homeStaff === STAFF_AGGRESSION.PHI ? baseline : driveSample(input, games, homeStaff);
  const marginDelta = mean(played.margins) - mean(baseline.margins);
  const totalDelta = mean(played.totals) - mean(baseline.totals);
  const marginMean = location.margin + marginDelta;
  const totalMean = location.total + totalDelta;
  const half = bandHalfWidth(played.totals);
  const fourthDownWP = played.fourthDowns > 0 ? played.wpSum / played.fourthDowns : baselineWp(homeStaff);

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

function driveSample(input: CoachSimInput, n: number, homeStaff: number): DriveSample {
  const margins = new Float64Array(n);
  const totals = new Float64Array(n);
  const rand = mulberry32(seedFor(input, homeStaff));
  let wpSum = 0;
  let fourthDowns = 0;
  for (let i = 0; i < n; i++) {
    const game = playGame(rand, input.neutralPassRate ?? SIM_GAPS.neutralPassRate, homeStaff);
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

function playGame(rand: () => number, passRate: number, homeStaff: number): GamePoints {
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
    yl = 25;
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
        staffAggression: offenseHome ? homeStaff : STAFF_AGGRESSION.PHI,
      });
      fourthDowns++;
      wpSum += decision.wpDelta;
      if (decision.action === "GO") {
        const made = rand() < SIM_GAPS.shortYardageConversion;
        if (made) {
          yl += dist;
          if (yl >= 100) {
            score(SIM_GAPS.touchdownPoints);
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
      let gain: number;
      if (pass) {
        gain = rand() < SIM_GAPS.completion ? 4 + Math.floor(rand() * 10) : 0;
      } else {
        gain = SIM_GAPS.runGain + Math.floor(rand() * 5) - 2;
      }
      yl += gain;
      if (yl >= 100) {
        score(SIM_GAPS.touchdownPoints);
        give();
      } else if (gain >= dist) {
        down = 1;
        dist = Math.min(10, 100 - yl);
      } else {
        down += 1;
        dist = Math.max(1, dist - gain);
      }
      clock -= SIM_GAPS.secondsPerPlay;
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

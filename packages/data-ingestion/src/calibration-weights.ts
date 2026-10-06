/**
 * Calibration weights derived from LIVE Neon picks (4,030 rows, 3263 graded).
 * Generated 2026-09-25T05:45:00.373Z. Supersedes the JSONL extract.
 *
 * Signal-coverage gap: injuries/NGS/weather/ratings/player/pace/officials are
 * present in the DB but currently attach to 0 picks. Wire them before claiming
 * a context-aware edge.
 */

export interface ConfidenceRecalibration {
  readonly statedConfidence: number;
  readonly empiricalPWin: number;
  readonly n: number;
  readonly recalibratedConfidence: number;
}

export interface SignalWeight {
  readonly winRate: number;
  readonly n: number;
  readonly wins: number;
  readonly losses: number;
  readonly signalWeight: number;
}

export interface PublishAction {
  readonly dimension: string;
  readonly value: string;
  readonly winRate: number;
  readonly n: number;
  readonly action: 'suppress-or-shrink' | 'boost-shadow-priority';
  readonly reason: string;
}

export const CONFIDENCE_RECALIBRATION: Readonly<Record<string, ConfidenceRecalibration>> = {
  "50": { statedConfidence: 50, empiricalPWin: 0.5193, n: 1063, recalibratedConfidence: 51.9 },
  "60": { statedConfidence: 60, empiricalPWin: 0.5632, n: 1257, recalibratedConfidence: 56.3 },
  "70": { statedConfidence: 70, empiricalPWin: 0.5656, n: 640, recalibratedConfidence: 56.6 },
  "80": { statedConfidence: 80, empiricalPWin: 0.5126, n: 238, recalibratedConfidence: 51.3 },
  "90": { statedConfidence: 90, empiricalPWin: 0.5294, n: 51, recalibratedConfidence: 52.9 },
};

export function calibratedWinProb(statedConfidence: number | null | undefined): number {
  if (statedConfidence == null || !Number.isFinite(statedConfidence)) return 0.5;
  const bin = String(Math.floor(statedConfidence / 10) * 10);
  const hit = CONFIDENCE_RECALIBRATION[bin];
  if (hit) return hit.empiricalPWin;
  return Math.min(0.72, Math.max(0.35, 0.45 + 0.001 * statedConfidence));
}

export const WEIGHT_BY_PICK_TYPE: Readonly<Record<string, SignalWeight>> = {
  "TOTAL": { winRate: 0.4878, n: 1025, wins: 500, losses: 525, signalWeight: 0.8932 },
  "MONEYLINE": { winRate: 0.6661, n: 1162, wins: 774, losses: 388, signalWeight: 1.2197 },
  "SPREAD": { winRate: 0.4721, n: 1076, wins: 508, losses: 568, signalWeight: 0.8645 },
};

export const WEIGHT_BY_SPORT: Readonly<Record<string, SignalWeight>> = {
  "MLB": { winRate: 0.5245, n: 2124, wins: 1114, losses: 1010, signalWeight: 0.9604 },
  "NCAAF": { winRate: 0.6501, n: 663, wins: 431, losses: 232, signalWeight: 1.1903 },
  "MLS": { winRate: 0.5196, n: 306, wins: 159, losses: 147, signalWeight: 0.9514 },
  "NFL": { winRate: 0.4774, n: 155, wins: 74, losses: 81, signalWeight: 0.8742 },
};

export const WEIGHT_BY_GRADE: Readonly<Record<string, SignalWeight>> = {
  "LEAN": { winRate: 0.5348, n: 2386, wins: 1276, losses: 1110, signalWeight: 0.9792 },
  "SOLID_PLAY": { winRate: 0.5831, n: 650, wins: 379, losses: 271, signalWeight: 1.0677 },
  "STRONG_PLAY": { winRate: 0.6108, n: 167, wins: 102, losses: 65, signalWeight: 1.1184 },
  "ELITE_PLAY": { winRate: 0.4167, n: 60, wins: 25, losses: 35, signalWeight: 0.763 },
};

export const WEIGHT_BY_MODEL_VERSION: Readonly<Record<string, SignalWeight>> = {
  "v5.2.7": { winRate: 0.5676, n: 1945, wins: 1104, losses: 841, signalWeight: 1.0393 },
  "v5.1.0": { winRate: 0.5171, n: 586, wins: 303, losses: 283, signalWeight: 0.9468 },
  "v5.0.0": { winRate: 0.4942, n: 431, wins: 213, losses: 218, signalWeight: 0.9049 },
  "v5.2.6": { winRate: 0.5421, n: 297, wins: 161, losses: 136, signalWeight: 0.9926 },
};

export const PUBLISH_ACTIONS: readonly PublishAction[] = [
  { dimension: "pickType", value: "MONEYLINE", winRate: 0.6661, n: 1162, action: "boost-shadow-priority", reason: "win_rate 0.666 above 0.58 on n=1162 (live)" },
  { dimension: "pickType", value: "SPREAD", winRate: 0.4721, n: 1076, action: "suppress-or-shrink", reason: "win_rate 0.472 below 0.48 on n=1076 (live)" },
  { dimension: "sport", value: "NCAAF", winRate: 0.6501, n: 663, action: "boost-shadow-priority", reason: "win_rate 0.650 above 0.58 on n=663 (live)" },
  { dimension: "sport", value: "NFL", winRate: 0.4774, n: 155, action: "suppress-or-shrink", reason: "win_rate 0.477 below 0.48 on n=155 (live)" },
  { dimension: "grade", value: "SOLID_PLAY", winRate: 0.5831, n: 650, action: "boost-shadow-priority", reason: "win_rate 0.583 above 0.58 on n=650 (live)" },
  { dimension: "grade", value: "STRONG_PLAY", winRate: 0.6108, n: 167, action: "boost-shadow-priority", reason: "win_rate 0.611 above 0.58 on n=167 (live)" },
];

export function combinedSignalWeight(
  sport: string | null | undefined,
  pickType: string | null | undefined,
  grade?: string | null | undefined,
): number {
  const typeW = pickType ? WEIGHT_BY_PICK_TYPE[pickType]?.signalWeight : undefined;
  const sportW = sport ? WEIGHT_BY_SPORT[sport]?.signalWeight : undefined;
  const gradeW = grade ? WEIGHT_BY_GRADE[grade]?.signalWeight : undefined;
  const parts = [typeW, sportW, gradeW].filter((x): x is number => x != null);
  if (parts.length === 0) return 1.0;
  const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
  return Math.min(1.5, Math.max(0.4, avg));
}

export function shouldSuppress(sport: string, pickType: string, grade: string): boolean {
  return PUBLISH_ACTIONS.some(
    (a) =>
      a.action === 'suppress-or-shrink' &&
      (a.value === sport || a.value === pickType || a.value === grade),
  );
}

/** Live-DB signal coverage: which signals actually attached to picks. */
export const SIGNAL_COVERAGE_LIVE = {
  odds: 3999,
  lineMovement: 3122,
  rest: 2125,
  schedule: 3122,
  atsForm: 1283,
  h2h: 11,
  injury: 0,
  weather: 0,
  ngs: 0,
  ratings: 0,
  player: 0,
  pace: 0,
  officials: 0,
} as const;

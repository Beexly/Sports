/**
 * Performance analytics — pure segmentation + CALIBRATION of a settled-pick record
 * for the public introspection dashboard: accuracy by sport / pick type, ROI,
 * beat-the-close rate, streaks, and the calibration curve ("when we say 75%, do we
 * actually win 75%?"). This is the engine grading itself in the open — the brand.
 *
 * Pure, no I/O. Inputs must be REAL settled outcomes; any public display of these
 * numbers is copy-scanner gated and must never overclaim.
 */

export interface SettledPickRecord {
  readonly sport: string;
  readonly pickType: string;
  /** P(the chosen side wins) the model claimed, 0–1. */
  readonly modelProb: number;
  /**
   * Whether the chosen side won. This module has NO push/void state: every record
   * MUST represent a DECIDED bet. Pushes/voids (bet refunded, neither win nor loss)
   * must be excluded by the caller BEFORE calling — a push mapped to `won:false` is
   * counted as a loss, understating winRate and breaking win streaks.
   */
  readonly won: boolean;
  /** Market-implied prob of the same side at close (for beat-the-close). */
  readonly closingProb?: number;
  /** Realized result in units (+win / −loss). */
  readonly profitUnits?: number;
}

export interface SegmentPerformance {
  readonly segment: string;
  readonly picks: number;
  readonly wins: number;
  readonly winRate: number;
  readonly roiUnits: number;
  readonly roiPercentPerPick: number | null;
}

export interface CalibrationBucket {
  readonly label: string;
  readonly predictedMid: number;
  readonly actualWinRate: number;
  readonly count: number;
}

export interface PerformanceReport {
  readonly overall: SegmentPerformance;
  readonly bySport: readonly SegmentPerformance[];
  readonly byPickType: readonly SegmentPerformance[];
  readonly calibration: readonly CalibrationBucket[];
  /** Fraction of picks whose model prob beat the closing prob (CLV+). Null if no closing data. */
  readonly beatCloseRate: number | null;
  readonly longestWinStreak: number;
  readonly longestLossStreak: number;
}

export function computeSegment(records: readonly SettledPickRecord[], segment: string): SegmentPerformance {
  const picks = records.length;
  const wins = records.reduce((n, r) => n + (r.won ? 1 : 0), 0);
  // ROI% numerator and denominator must range over the SAME population: only the
  // records that actually carry profit data. Imputing missing profit as 0 and then
  // dividing by ALL picks lets a partially-graded losing ledger publish a positive
  // ROI (a real overclaim path). Return null when nothing is graded.
  const profitRecs = records.filter((r) => r.profitUnits != null);
  const roiUnits = round2(profitRecs.reduce((s, r) => s + (r.profitUnits ?? 0), 0));
  return {
    segment,
    picks,
    wins,
    winRate: picks > 0 ? round4(wins / picks) : 0,
    roiUnits,
    roiPercentPerPick: profitRecs.length > 0 ? round2((roiUnits / profitRecs.length) * 100) : null,
  };
}

function segmentByKey(
  records: readonly SettledPickRecord[],
  keyFn: (r: SettledPickRecord) => string,
): SegmentPerformance[] {
  const groups = new Map<string, SettledPickRecord[]>();
  for (const r of records) {
    const k = keyFn(r);
    const arr = groups.get(k);
    if (arr) arr.push(r);
    else groups.set(k, [r]);
  }
  return [...groups.entries()]
    .map(([k, rs]) => computeSegment(rs, k))
    .sort((a, b) => a.segment.localeCompare(b.segment));
}

export function calibrationCurve(
  records: readonly SettledPickRecord[],
  bucketSize = 0.1,
): CalibrationBucket[] {
  const buckets = new Map<number, { wins: number; count: number }>();
  for (const r of records) {
    const p = Math.max(0, Math.min(0.999999, r.modelProb));
    // Nudge by a tiny epsilon before flooring so exact deciles (0.7/0.1 ===
    // 6.999999999999999 in IEEE-754) land in the correct bucket, and clamp the
    // top index so the 0.999999 guard never spills past the final bucket.
    const idx = Math.min(Math.ceil(1 / bucketSize) - 1, Math.floor(p / bucketSize + 1e-9));
    const prev = buckets.get(idx) ?? { wins: 0, count: 0 };
    buckets.set(idx, { wins: prev.wins + (r.won ? 1 : 0), count: prev.count + 1 });
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([idx, v]) => {
      const lo = idx * bucketSize;
      return {
        label: `${Math.round(lo * 100)}-${Math.round((lo + bucketSize) * 100)}%`,
        predictedMid: round4(lo + bucketSize / 2),
        actualWinRate: round4(v.wins / v.count),
        count: v.count,
      };
    });
}

export function streaks(records: readonly SettledPickRecord[]): {
  longestWinStreak: number;
  longestLossStreak: number;
} {
  let win = 0;
  let loss = 0;
  let maxWin = 0;
  let maxLoss = 0;
  for (const r of records) {
    if (r.won) {
      win += 1;
      loss = 0;
      maxWin = Math.max(maxWin, win);
    } else {
      loss += 1;
      win = 0;
      maxLoss = Math.max(maxLoss, loss);
    }
  }
  return { longestWinStreak: maxWin, longestLossStreak: maxLoss };
}

export function beatCloseRate(records: readonly SettledPickRecord[]): number | null {
  const withClose = records.filter((r) => r.closingProb != null);
  if (withClose.length === 0) return null;
  const beat = withClose.reduce((n, r) => n + (r.modelProb > (r.closingProb as number) ? 1 : 0), 0);
  return round4(beat / withClose.length);
}

export function buildPerformanceReport(records: readonly SettledPickRecord[]): PerformanceReport {
  const s = streaks(records);
  return {
    overall: computeSegment(records, "overall"),
    bySport: segmentByKey(records, (r) => r.sport),
    byPickType: segmentByKey(records, (r) => r.pickType),
    calibration: calibrationCurve(records),
    beatCloseRate: beatCloseRate(records),
    longestWinStreak: s.longestWinStreak,
    longestLossStreak: s.longestLossStreak,
  };
}

function round2(x: number): number {
  return Number(x.toFixed(2));
}
function round4(x: number): number {
  return Number(x.toFixed(4));
}

/**
 * Sparse-stream drift-monitor ensemble (arXiv 2207.13287v1).
 *
 * Three change detectors watch weekly performance streams:
 *  - ECDD (EWMA-based drift detection) on the weekly error stream;
 *  - PUDD (proportion-based drift detection, operationalized as a
 *    two-sample proportion z-test) on the PU-index, where the PU-index
 *    is the fraction of predictions in the uncertainty band [0.4, 0.6].
 *    The detector consumes the underlying weekly COUNTS (uncertain /
 *    total) so the test has power, comparing a recent window against a
 *    reference window;
 *  - Page-Hinkley on the weekly Brier stream.
 * A drift episode is confirmed by MAJORITY VOTE: at least 2 of the 3
 * detectors fire within a 3-week window. Each individual detector can
 * also run standalone for the ADD comparison.
 *
 * ACCEPTANCE GATE: ADOPT the majority-vote ensemble iff it holds
 * detections-per-episode within [0.8, 1.2] per regime episode with
 * <= 2 false alarms/season AND its average detection delay (ADD) is at
 * most one week worse than the best standalone detector.
 *
 * Research-only module. Not wired into any live monitoring path.
 */

export interface Alarm {
  detector: "ecdd" | "pudd" | "pageHinkley";
  /** Week index of the alarm. */
  week: number;
}

/** Page-Hinkley detector: cumulative deviation of (x - mean - delta). */
export class PageHinkley {
  private sum = 0;
  private minSum = 0;
  private maxSum = 0;
  private n = 0;
  private mean = 0;
  constructor(
    private readonly delta = 0.005,
    private readonly threshold = 0.2,
  ) {
    if (threshold <= 0) throw new Error("PageHinkley: threshold > 0");
  }
  /** Feed one weekly Brier value; returns true on alarm. */
  update(x: number): boolean {
    this.n++;
    this.mean += (x - this.mean) / this.n;
    this.sum += x - this.mean - this.delta;
    this.minSum = Math.min(this.minSum, this.sum);
    this.maxSum = Math.max(this.maxSum, this.sum);
    if (this.sum - this.minSum > this.threshold || this.maxSum - this.sum > this.threshold) {
      this.reset();
      return true;
    }
    return false;
  }
  reset(): void {
    this.sum = 0;
    this.minSum = 0;
    this.maxSum = 0;
    this.n = 0;
    this.mean = 0;
  }
}

/** ECDD: EWMA of the error stream vs a baseline error rate. */
export class Ecdd {
  private z: number | null = null;
  private cur: number;
  constructor(
    baseline: number,
    private readonly lambda = 0.2,
    private readonly l = 3,
    /** Std dev of the weekly error-rate stream. */
    private readonly sigma = 0.02,
  ) {
    if (lambda <= 0 || lambda >= 1) throw new Error("Ecdd: lambda in (0,1)");
    if (l <= 0) throw new Error("Ecdd: l > 0");
    if (sigma <= 0) throw new Error("Ecdd: sigma > 0");
    this.cur = baseline;
  }
  /** Feed one weekly error rate; returns true on alarm. */
  update(err: number): boolean {
    this.z = this.z === null ? err : this.lambda * err + (1 - this.lambda) * this.z;
    const band = this.l * this.sigma * Math.sqrt(this.lambda / (2 - this.lambda));
    if ((this.z as number) > this.cur + band) {
      this.cur = this.z as number; // adapt: the new level becomes the baseline
      this.z = null;
      return true;
    }
    return false;
  }
}

/**
 * PUDD (operationalized): two-sample proportion z-test on the PU-index.
 * Consumes weekly counts (uncertain / total predictions); compares a
 * recent window against the reference window.
 */
export class Pudd {
  private refUncertain = 0;
  private refTotal = 0;
  private refWeeksSeen = 0;
  private readonly recent: Array<{ u: number; t: number }> = [];
  constructor(
    private readonly refWeeks = 8,
    private readonly recentWeeks = 3,
    private readonly zThreshold = 3,
  ) {
    if (refWeeks < 2 || recentWeeks < 1) throw new Error("Pudd: window sizes");
  }
  /** Feed one week's counts; returns true on alarm. */
  update(uncertain: number, total: number): boolean {
    if (total <= 0 || uncertain < 0 || uncertain > total) {
      throw new Error("Pudd: 0 <= uncertain <= total, total > 0");
    }
    if (this.refWeeksSeen < this.refWeeks) {
      this.refUncertain += uncertain;
      this.refTotal += total;
      this.refWeeksSeen++;
      return false;
    }
    this.recent.push({ u: uncertain, t: total });
    if (this.recent.length > this.recentWeeks) this.recent.shift();
    if (this.recent.length < this.recentWeeks) return false;
    const ru = this.recent.reduce((a, r) => a + r.u, 0);
    const rt = this.recent.reduce((a, r) => a + r.t, 0);
    const p1 = this.refUncertain / this.refTotal;
    const p2 = ru / rt;
    const p = (this.refUncertain + ru) / (this.refTotal + rt);
    const se = Math.sqrt(p * (1 - p) * (1 / this.refTotal + 1 / rt));
    if (se < 1e-12) return false;
    if (Math.abs(p2 - p1) / se > this.zThreshold) {
      this.reset();
      return true;
    }
    return false;
  }
  reset(): void {
    this.refUncertain = 0;
    this.refTotal = 0;
    this.refWeeksSeen = 0;
    this.recent.length = 0;
  }
}

/**
 * Majority vote: confirm a drift episode when >= 2 of the 3 detectors
 * fire within `windowWeeks`. Returns confirmed episode start weeks
 * (the earliest alarm in each confirming cluster).
 */
export function majorityVote(alarms: readonly Alarm[], windowWeeks = 3): number[] {
  if (alarms.length === 0) return [];
  const sorted = [...alarms].sort((a, b) => a.week - b.week);
  const episodes: number[] = [];
  let i = 0;
  while (i < sorted.length) {
    const start = (sorted[i] as Alarm).week;
    const cluster: Alarm[] = [];
    while (i < sorted.length && (sorted[i] as Alarm).week - start < windowWeeks) {
      cluster.push(sorted[i] as Alarm);
      i++;
    }
    const detectors = new Set(cluster.map((a) => a.detector));
    if (detectors.size >= 2) episodes.push(start);
  }
  return episodes;
}

export interface DriftEval {
  /** Confirmed episodes per true regime episode. */
  detectionsPerEpisode: number;
  /** Confirmed episodes not matching any regime (per 17-week season scale). */
  falseAlarmsPerSeason: number;
  /** Average detection delay in weeks (NaN when nothing detected). */
  add: number;
}

/**
 * Evaluate the ensemble against known regime-shift weeks: a confirmed
 * episode matches a regime if it starts within `graceWeeks` after the
 * shift.
 */
export function evaluateDrift(
  episodes: readonly number[],
  regimeWeeks: readonly number[],
  totalWeeks: number,
  graceWeeks = 4,
): DriftEval {
  const matched = new Set<number>();
  let delaySum = 0;
  let delayN = 0;
  const used = new Set<number>();
  for (const r of regimeWeeks) {
    let best: number | null = null;
    let bestIdx = -1;
    episodes.forEach((e, idx) => {
      if (used.has(idx)) return;
      if (e >= r && e <= r + graceWeeks && (best === null || e < best)) {
        best = e;
        bestIdx = idx;
      }
    });
    if (best !== null) {
      used.add(bestIdx);
      matched.add(bestIdx);
      delaySum += (best as number) - r;
      delayN++;
    }
  }
  const falseAlarms = episodes.length - matched.size;
  return {
    detectionsPerEpisode:
      regimeWeeks.length === 0 ? 0 : matched.size / regimeWeeks.length,
    falseAlarmsPerSeason: totalWeeks === 0 ? 0 : (falseAlarms / totalWeeks) * 17,
    add: delayN === 0 ? NaN : delaySum / delayN,
  };
}

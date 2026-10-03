/**
 * Weekly feature-build tuning controller (stage skew / spill / idle metrics)
 *
 * Research port: arXiv:2309.12239
 * Normalized lane: data_infra | Doctrine: INFRA
 *
 * Ports the tuning pattern to GSE's batch compute: measures per-stage skew (max/median task duration), spill bytes, and idle executor time as controller inputs, and emits Big-small skeleton tuning recommendations (partition-count lifts on skewed stages). Pure telemetry math; no executor API calls.
 *
 * ACCEPTANCE GATE: ADOPT the tuning controller only if >=25% reduction in total build compute cost (executor-hours) OR >=25% reduction in build wall-clock vs the 4-week baseline. Measured weekly; controller is advisory until the gate clears.
 */

export interface StageTelemetry {
  stage: string;
  taskDurationsMs: number[];
  spillBytes: number;
  idleExecutorMs: number;
}

export interface StageDiagnosis {
  stage: string;
  skew: number; // max / median task duration
  spillBytes: number;
  idleExecutorMs: number;
  skewed: boolean;
  recommendation: string;
}

export const SKEW_THRESHOLD = 3;

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const lo = s[mid - 1] ?? 0;
  const hi = s[mid] ?? 0;
  return s.length % 2 === 0 ? (lo + hi) / 2 : hi;
}

/** Diagnose one stage: skew = max/median task duration. */
export function diagnoseStage(t: StageTelemetry): StageDiagnosis {
  const med = median(t.taskDurationsMs);
  const max = t.taskDurationsMs.length === 0 ? 0 : Math.max(...t.taskDurationsMs);
  const skew = med === 0 ? (max === 0 ? 1 : Infinity) : max / med;
  const skewed = skew >= SKEW_THRESHOLD;
  return {
    stage: t.stage,
    skew,
    spillBytes: t.spillBytes,
    idleExecutorMs: t.idleExecutorMs,
    skewed,
    recommendation: skewed
      ? `binary-lift partitions on stage '${t.stage}' (skew ${skew.toFixed(2)} >= ${SKEW_THRESHOLD})`
      : `stage '${t.stage}' healthy (skew ${skew.toFixed(2)})`,
  };
}

/** Weekly cost comparison for the adoption gate. */
export function costReduction(baselineExecutorHours: number, candidateExecutorHours: number): number {
  if (baselineExecutorHours <= 0) return 0;
  return (baselineExecutorHours - candidateExecutorHours) / baselineExecutorHours;
}

/** Wall-clock comparison for the adoption gate. */
export function wallClockReduction(baselineMs: number, candidateMs: number): number {
  if (baselineMs <= 0) return 0;
  return (baselineMs - candidateMs) / baselineMs;
}

/** Gate: >=25% compute-cost reduction OR >=25% wall-clock reduction. */
export function tuningGatePasses(costRed: number, wallRed: number): boolean {
  return costRed >= 0.25 || wallRed >= 0.25;
}


/** Live-data gate: stays off until build tuner validated on GSE pipelines. */
export const GSE_BUILD_TUNER_ENABLED = false;

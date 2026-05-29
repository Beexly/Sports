/**
 * ROI math for the canonical record.
 *
 * Pure functions. No DB, no network. Designed to be called by
 * `loadPublicCalibrationReport()` (and later consumers) once the schema
 * migration in ADR-008 lands.
 *
 * Until the migration is applied, callers pass arrays whose rows may
 * have `unitsRisked: null`/`unitsReturned: null`. The functions filter
 * those out by contract — ROI is opt-in to rows where the math is
 * defensible.
 */

export interface RoiInput {
  readonly id: string;
  readonly confidence: number;
  readonly result: "WIN" | "LOSS" | "PUSH" | "VOID" | "PENDING";
  readonly unitsRisked: number | null;
  readonly unitsReturned: number | null;
}

export interface RoiBucket {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly sampleSize: number;
  readonly unitsRisked: number;
  readonly unitsReturned: number;
  /** (unitsReturned - unitsRisked) / unitsRisked; null when sampleSize is 0. */
  readonly roi: number | null;
}

export interface RoiSummary {
  readonly sampleSize: number;
  readonly unitsRisked: number;
  readonly unitsReturned: number;
  /** Aggregate ROI; null when sampleSize is 0. */
  readonly roi: number | null;
  readonly buckets: ReadonlyArray<RoiBucket>;
}

const BUCKETS: ReadonlyArray<{ label: string; min: number; max: number }> = [
  { label: "50-59", min: 50, max: 59 },
  { label: "60-69", min: 60, max: 69 },
  { label: "70-79", min: 70, max: 79 },
  { label: "80-89", min: 80, max: 89 },
  { label: "90-100", min: 90, max: 100 },
];

/** ROI for a single pick: (returned - risked) / risked. Throws on division by zero. */
export function pickRoi(unitsRisked: number, unitsReturned: number): number {
  if (unitsRisked === 0) {
    throw new Error("pickRoi: unitsRisked cannot be zero");
  }
  return (unitsReturned - unitsRisked) / unitsRisked;
}

/** Aggregate ROI across a settled subset. Returns null when sample is empty. */
export function aggregateRoi(picks: ReadonlyArray<RoiInput>): number | null {
  const eligible = picks.filter(isEligibleForRoi);
  if (eligible.length === 0) return null;
  const totalRisked = eligible.reduce((acc, p) => acc + (p.unitsRisked ?? 0), 0);
  const totalReturned = eligible.reduce((acc, p) => acc + (p.unitsReturned ?? 0), 0);
  if (totalRisked === 0) return null;
  return (totalReturned - totalRisked) / totalRisked;
}

/** Compute the per-bucket ROI summary, filtering to eligible rows by contract. */
export function computeRoiSummary(picks: ReadonlyArray<RoiInput>): RoiSummary {
  const eligible = picks.filter(isEligibleForRoi);

  const buckets: RoiBucket[] = BUCKETS.map((b) => {
    const inBucket = eligible.filter((p) => p.confidence >= b.min && p.confidence <= b.max);
    const risked = inBucket.reduce((acc, p) => acc + (p.unitsRisked ?? 0), 0);
    const returned = inBucket.reduce((acc, p) => acc + (p.unitsReturned ?? 0), 0);
    return {
      label: b.label,
      min: b.min,
      max: b.max,
      sampleSize: inBucket.length,
      unitsRisked: risked,
      unitsReturned: returned,
      roi: risked > 0 ? (returned - risked) / risked : null,
    };
  });

  const totalRisked = eligible.reduce((acc, p) => acc + (p.unitsRisked ?? 0), 0);
  const totalReturned = eligible.reduce((acc, p) => acc + (p.unitsReturned ?? 0), 0);

  return {
    sampleSize: eligible.length,
    unitsRisked: totalRisked,
    unitsReturned: totalReturned,
    roi: totalRisked > 0 ? (totalReturned - totalRisked) / totalRisked : null,
    buckets,
  };
}

/**
 * A row is eligible for ROI math only when:
 *  - it has a non-null `unitsRisked` and `unitsReturned`
 *  - it is settled (WIN / LOSS / PUSH) — PENDING and VOID never count
 *  - `unitsRisked > 0`
 */
function isEligibleForRoi(p: RoiInput): boolean {
  if (p.unitsRisked === null || p.unitsReturned === null) return false;
  if (!(p.unitsRisked > 0)) return false;
  return p.result === "WIN" || p.result === "LOSS" || p.result === "PUSH";
}

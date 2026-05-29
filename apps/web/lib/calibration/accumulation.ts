/**
 * Calibration accumulation — honest bucket counts surfaced during the
 * accumulation phase (before the exposure gate flips).
 *
 * Renders "18 of 30 settled in 70-79 bucket" copy instead of vague
 * "collecting" language. See docs/ops/CANONICAL_HISTORY_ACCUMULATION.md.
 */

import { db } from "@sports/db";

export interface BucketAccumulation {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly settled: number;
  readonly publishGate: number;
  readonly meetsPublishGate: boolean;
}

export interface AccumulationReport {
  readonly buckets: ReadonlyArray<BucketAccumulation>;
  readonly totalSettled: number;
  readonly totalPublishGate: number;
  readonly bucketsMeetingGate: number;
  readonly updatedAt: string;
}

const PUBLISH_GATE_PER_BUCKET = 30;

const BUCKETS: ReadonlyArray<{ label: string; min: number; max: number }> = [
  { label: "50-59", min: 50, max: 59 },
  { label: "60-69", min: 60, max: 69 },
  { label: "70-79", min: 70, max: 79 },
  { label: "80-89", min: 80, max: 89 },
  { label: "90-100", min: 90, max: 100 },
];

/** Compute bucket-by-bucket accumulation against canonical (non-bootstrap, non-seed) picks. */
export async function loadAccumulationReport(now = new Date()): Promise<AccumulationReport> {
  const grouped = await db.pick
    .findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS", "PUSH"] },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      select: { confidence: true },
    })
    .catch(() => [] as Array<{ confidence: number }>);

  const buckets = BUCKETS.map((b): BucketAccumulation => {
    const settled = grouped.filter((row) => row.confidence >= b.min && row.confidence <= b.max).length;
    return {
      label: b.label,
      min: b.min,
      max: b.max,
      settled,
      publishGate: PUBLISH_GATE_PER_BUCKET,
      meetsPublishGate: settled >= PUBLISH_GATE_PER_BUCKET,
    };
  });

  const totalSettled = buckets.reduce((acc, b) => acc + b.settled, 0);
  const totalPublishGate = BUCKETS.length * PUBLISH_GATE_PER_BUCKET;
  const bucketsMeetingGate = buckets.filter((b) => b.meetsPublishGate).length;

  return {
    buckets,
    totalSettled,
    totalPublishGate,
    bucketsMeetingGate,
    updatedAt: now.toISOString(),
  };
}

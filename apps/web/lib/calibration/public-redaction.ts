import type { CalibrationReportPayload } from "@/lib/calibration/report";
import type { CalibrationBucket } from "@/lib/calibration/compute";

/** A calibration bucket as served over the public JSON export: below the
 * publish floor, `observedWinRate`/`delta` are redacted to `null` rather than
 * the internal (always-computed) point value. */
export type PublicCalibrationBucket = Omit<CalibrationBucket, "observedWinRate" | "delta"> & {
  readonly observedWinRate: number | null;
  readonly delta: number | null;
};

/**
 * `computeCalibration()` always fills in every bucket's observedWinRate/delta
 * (proposals, discrimination, and internal tests need the raw value), and
 * relies on callers to gate on `sufficientSample` before showing it — which
 * every rendered page already does (calibration-panel.tsx, proof-explorer.tsx,
 * components/home/calibration-curve.tsx). This raw JSON export was the one
 * path that served the ungated bucket verbatim, so a thin band (e.g. 2
 * settled picks reading "100%") was one API call away even though no page on
 * the site ever shows it. Mirror the same floor here, at the serialization
 * boundary, rather than in `computeCalibration()` itself (which other
 * internal-only consumers rely on for the raw value).
 */
export function redactUnpublishableBuckets(
  buckets: readonly CalibrationBucket[],
): PublicCalibrationBucket[] {
  return buckets.map((bucket) =>
    bucket.sufficientSample ? bucket : { ...bucket, observedWinRate: null, delta: null },
  );
}

export function redactUnpublishableReport(
  payload: CalibrationReportPayload,
): Omit<CalibrationReportPayload, "data"> & {
  data: Omit<CalibrationReportPayload["data"], "buckets"> & { buckets: PublicCalibrationBucket[] };
} {
  return { ...payload, data: { ...payload.data, buckets: redactUnpublishableBuckets(payload.data.buckets) } };
}

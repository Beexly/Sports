/**
 * Content publishing worker — hard kill switch.
 *
 * The legacy auto-publisher is DISABLED. This file exists only to:
 *   - declare the INTERNAL_CALIBRATION_ONLY gate (default ON)
 *   - record refusedByInternalCalibrationGates whenever the worker is
 *     asked to publish
 *   - never write a published timestamp or flip status to PUBLISHED
 *
 * Restoring auto-publish requires explicit operator action AND flipping
 * the gate. Until then, this worker is a no-op.
 */

const CONTENT_WORKER_ENABLED = process.env["CONTENT_WORKER_ENABLED"] === "true";

interface PublishRequest {
  readonly id: string;
  readonly kind: string;
}

interface PublishResult {
  readonly id: string;
  readonly status: "REFUSED" | "QUEUED";
  readonly refusedByInternalCalibrationGates: boolean;
  readonly note: string;
}

export async function runContentPublisher(
  reqs: ReadonlyArray<PublishRequest>
): Promise<ReadonlyArray<PublishResult>> {
  const internalCalibrationOnly = process.env["INTERNAL_CALIBRATION_ONLY"] !== "false";
  if (internalCalibrationOnly) {
    return reqs.map((r) => ({
      id: r.id,
      status: "REFUSED",
      refusedByInternalCalibrationGates: true,
      note: "INTERNAL_CALIBRATION_ONLY is on — auto-publish is disabled.",
    }));
  }
  // When the gate is OFF we still don't auto-publish from this worker;
  // we just record the request and require a separate operator action.
  return reqs.map((r) => ({
    id: r.id,
    status: "QUEUED",
    refusedByInternalCalibrationGates: false,
    note: "Queued for operator review. No automatic publish from this worker.",
  }));
}

async function main(): Promise<void> {
  if (!CONTENT_WORKER_ENABLED) {
    // eslint-disable-next-line no-console
    console.log(
      "[content-publisher] CONTENT_WORKER_ENABLED is not 'true' — worker is idle."
    );
    return;
  }
  const internalCalibrationOnly = process.env["INTERNAL_CALIBRATION_ONLY"] !== "false";
  // eslint-disable-next-line no-console
  console.log(
    internalCalibrationOnly
      ? "[content-publisher] CONTENT_WORKER_ENABLED=true but kill switch ON — refusing all publish requests."
      : "[content-publisher] CONTENT_WORKER_ENABLED=true and kill switch OFF — queueing only, never auto-publishing."
  );
}

if (typeof require !== "undefined" && require.main === module) {
  void main();
}

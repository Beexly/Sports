import { NextResponse } from "next/server";
import { validateClaimBatchFromEnv } from "@/lib/airwave/claim-batch-validator";

export const dynamic = "force-dynamic";

/**
 * GET /api/airwave/review-queue
 *
 * Returns the current review-queue state from the batch validator.
 * If AIRWAVE_CLAIM_BATCH_FILE is configured, validates and returns
 * the batch summary. Otherwise returns an empty queue summary.
 *
 * NEVER exposes: source_pointer_private, review_notes, raw audio,
 *   verbatim transcript content, local file paths.
 */
export async function GET(): Promise<NextResponse> {
  const env = process.env as Record<string, string | undefined>;
  const batchResult = await validateClaimBatchFromEnv(env);

  if (!batchResult) {
    return NextResponse.json({
      success: true,
      configured: false,
      message: "AIRWAVE_CLAIM_BATCH_FILE is not set. No claims in queue.",
      queue: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        byStatus: { DRAFT: 0, REVIEW: 0, APPROVED: 0, REJECTED: 0, SETTLED: 0, UNKNOWN: 0 },
        gseReadyRows: 0,
        gsnReadyRows: 0,
        publicSafeRows: 0,
        generatedAt: new Date().toISOString(),
      },
      policy: {
        writesDatabase: false,
        capturesAudio: false,
        publishesOutput: false,
        sourcePointerPrivateNeverLeaks: true,
      },
    });
  }

  // Strip row-level details (source_pointer_private is in the claim objects
  // but the summary type doesn't carry it — still, strip rows entirely
  // from the public API to prevent any accidental leakage).
  const omitRows = ({ rows: _rows, ...kept }: typeof batchResult) => kept;
  const summary = omitRows(batchResult);

  return NextResponse.json({
    success: true,
    configured: true,
    fileStatus: batchResult.fileStatus,
    queue: summary,
    policy: batchResult.policy,
  });
}

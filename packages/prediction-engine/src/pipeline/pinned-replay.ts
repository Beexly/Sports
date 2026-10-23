import type { UnifiedSlateExecutionSummary } from "./unified-autonomous-mind-pipeline.ts";

/** Reproduced after Word 8 bits 280 and 281 were set. Not the pre-word-8 hash. */
export const PINNED_2026_10_22_TOTAL_RECEIPT_SHA256 =
  "5ed7346edf9228b48a1d5b410964bb479a3f8d122b51ef1683cc33e5a10038f4";

export function assertPinnedReplay(summary: UnifiedSlateExecutionSummary): void {
  if (summary.spreadPublishState !== "PLAY" || summary.totalPublishState !== "PLAY") {
    throw new Error(`replay publish state drifted: ${summary.spreadPublishState}/${summary.totalPublishState}`);
  }
  if (summary.attritionOverride.adjustedProjectedTotal !== 54.6) {
    throw new Error(`projection drifted: ${summary.attritionOverride.adjustedProjectedTotal}`);
  }
  if (summary.propHookFlags.some((f) => f !== "PASS_KNEELDOWN_HOOK_RISK") || summary.propHookFlags.length !== 2) {
    throw new Error(`hooks drifted: ${summary.propHookFlags.join(",")}`);
  }
  if (summary.totalReceipt.verifier !== "z3-solver" || summary.totalReceipt.z3SolverStatus !== "sat") {
    throw new Error(`verifier drifted: ${summary.totalReceipt.verifier} ${summary.totalReceipt.z3SolverStatus}`);
  }
  if (summary.totalReceipt.receiptSha256 !== PINNED_2026_10_22_TOTAL_RECEIPT_SHA256) {
    throw new Error(
      `receipt hash drifted: ${summary.totalReceipt.receiptSha256} != ${PINNED_2026_10_22_TOTAL_RECEIPT_SHA256}`,
    );
  }
  if (summary.mindRecordsLoaded !== 5149) {
    throw new Error(`mind count drifted: ${summary.mindRecordsLoaded}`);
  }
}

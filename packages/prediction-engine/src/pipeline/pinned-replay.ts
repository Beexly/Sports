import type { UnifiedSlateExecutionSummary } from "./unified-autonomous-mind-pipeline";

/** Re-pinned after the killed total boosts were removed. The old print was 54.6. */
export const PINNED_2026_10_22_TOTAL_RECEIPT_SHA256 =
  "2938220a2834d9d20386f69f4f5bff3b4eca3cb5c5354e52327dd04606b95943";

export function assertPinnedReplay(summary: UnifiedSlateExecutionSummary): void {
  if (summary.spreadPublishState !== "PLAY" || summary.totalPublishState !== "PASS") {
    throw new Error(`replay publish state drifted: ${summary.spreadPublishState}/${summary.totalPublishState}`);
  }
  if (summary.attritionOverride.adjustedProjectedTotal !== 48.5) {
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

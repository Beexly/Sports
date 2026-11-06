import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runReplaySlate } from "../../packages/prediction-engine/src/pipeline/unified-autonomous-mind-pipeline";
import { assertPinnedReplay } from "../../packages/prediction-engine/src/pipeline/pinned-replay";

async function main(): Promise<void> {
  const cwd = resolve(process.cwd());
  const summary = await runReplaySlate("2026-10-22", cwd);
  assertPinnedReplay(summary);
  const proof = {
    artifact: "POSTGAME-10-22-UNIFIED-DAG-PROOF",
    gameId: summary.gameId,
    spreadPublishState: summary.spreadPublishState,
    totalPublishState: summary.totalPublishState,
    adjustedProjectedTotal: summary.attritionOverride.adjustedProjectedTotal,
    propHookFlags: summary.propHookFlags,
    receiptSha256: summary.totalReceipt.receiptSha256,
    spreadReceiptSha256: summary.spreadReceipt.receiptSha256,
    bitmaskSha256: summary.bitmaskReceipt.sha256Digest,
    activeBits: summary.bitmaskReceipt.activeBitIndices,
    merkleRootSha256: summary.merkleRootSha256,
    verifier: summary.totalReceipt.verifier,
    z3SolverStatus: summary.totalReceipt.z3SolverStatus,
    corpusItemsLoaded: summary.corpusItemsLoaded,
    corpusItemsEvaluated: summary.corpusItemsEvaluated,
    mindRecordsLoaded: summary.mindRecordsLoaded,
    mindApplicablePrinciplesCount: summary.mindApplicablePrinciplesCount,
  };
  const dir = resolve(cwd, "docs/engine/research/2026-10-23");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "POSTGAME-10-22-UNIFIED-DAG-PROOF.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ ok: true, ...proof }, null, 2));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

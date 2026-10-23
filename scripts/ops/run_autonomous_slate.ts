import { resolve } from "node:path";
import { runReplaySlate } from "../../packages/prediction-engine/src/pipeline/unified-autonomous-mind-pipeline";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

async function main(): Promise<void> {
  const date = arg("date");
  const replay = process.argv.includes("--replay");
  if (!date || !replay) {
    console.error("usage: npm run slate:autonomous -- --date=2026-10-22 --replay");
    process.exit(1);
  }
  const summary = await runReplaySlate(date, resolve(process.cwd()));
  console.log(
    JSON.stringify(
      {
        gameId: summary.gameId,
        spread: summary.spreadPublishState,
        total: summary.totalPublishState,
        adjustedProjectedTotal: summary.attritionOverride.adjustedProjectedTotal,
        hooks: summary.propHookFlags,
        receiptSha256: summary.totalReceipt.receiptSha256,
        spreadReceiptSha256: summary.spreadReceipt.receiptSha256,
        bitmaskSha256: summary.bitmaskReceipt.sha256Digest,
        z3: summary.totalReceipt.z3SolverStatus,
        verifier: summary.totalReceipt.verifier,
        corpusItemsLoaded: summary.corpusItemsLoaded,
        corpusItemsEvaluated: summary.corpusItemsEvaluated,
        mindRecordsLoaded: summary.mindRecordsLoaded,
        mindApplicablePrinciplesCount: summary.mindApplicablePrinciplesCount,
        merkleRootSha256: summary.merkleRootSha256,
      },
      null,
      2,
    ),
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

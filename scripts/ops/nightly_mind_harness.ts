import { resolve } from "node:path";
import { runReplaySlate } from "../../packages/prediction-engine/src/pipeline/unified-autonomous-mind-pipeline.ts";
import { assertPinnedReplay } from "../../packages/prediction-engine/src/pipeline/pinned-replay.ts";

async function main(): Promise<void> {
  const summary = await runReplaySlate("2026-10-22", resolve(process.cwd()));
  assertPinnedReplay(summary);
  console.log(
    JSON.stringify(
      {
        ok: true,
        gameId: summary.gameId,
        receiptSha256: summary.totalReceipt.receiptSha256,
        verifier: summary.totalReceipt.verifier,
        mindRecordsLoaded: summary.mindRecordsLoaded,
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

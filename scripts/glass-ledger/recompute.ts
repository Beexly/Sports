/**
 * Open verifier stub — anyone can re-run receipt fingerprints.
 * Production: load public ledger JSON + recompute master hash.
 * Usage: npx tsx scripts/glass-ledger/recompute.ts path/to/ledger.json
 *
 * LAW: does not invent performance numbers; only verifies chain integrity.
 */

import { readFileSync } from "node:fs";
import {
  recomputeChain,
  ledgerHead,
  type PickReceipt,
} from "../../packages/prediction-engine/src/honesty/glass-receipts.js";

function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: npx tsx scripts/glass-ledger/recompute.ts <ledger.json>");
    process.exit(2);
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as { receipts: PickReceipt[] };
  const { ok, master } = recomputeChain(raw.receipts);
  const head = ledgerHead(raw.receipts);
  console.log(
    JSON.stringify(
      {
        chainOk: ok,
        master,
        head,
      },
      null,
      2,
    ),
  );
  process.exit(ok ? 0 : 1);
}

main();

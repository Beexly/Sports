#!/usr/bin/env node
/**
 * Demo script for docs/devrel/DEMO_SCRIPT.md — forces a real ENFORCE-mode
 * REFUSE through createGoverned() against a gate wired to admitUnderSRQC,
 * with a synthetic ledger window that actually projects a GE2 (two
 * concurrently-pending attempts on the same invocation) violation. Run:
 *
 *   npx tsx scripts/demo/force-governed-refuse.mjs
 *
 * This is a standalone demo — it does not touch a real database or the
 * running Next.js server; it exercises the same library code
 * (`@sports/governed`, `admitUnderSRQC`) those routes use, in-process.
 */

import { createGoverned, InMemoryKeyringStore, rotateReceiptSigningKey, activeSigner } from "@sports/governed";
import { admitUnderSRQC } from "../../apps/web/lib/ai-control-plane/srqc-projection.ts";

async function main() {
  const keyring = new InMemoryKeyringStore();
  const key = await rotateReceiptSigningKey(keyring);
  console.log(`[demo] signing key: ${key.kid}`);

  // A synthetic window with two ATTEMPT_STARTED events on the same
  // invocation and no terminal event for either — the exact GE2 shape
  // admitUnderSRQC's projection is built to catch.
  const window = [
    {
      eventType: "ATTEMPT_STARTED",
      source: "ai_attempt",
      sourceId: "attempt-1",
      payload: { invocationId: "inv-demo", attemptId: "attempt-1" },
    },
    {
      eventType: "ATTEMPT_STARTED",
      source: "ai_attempt",
      sourceId: "attempt-2",
      payload: { invocationId: "inv-demo", attemptId: "attempt-2" },
    },
  ];

  const gate = async () => {
    const result = admitUnderSRQC(window, "ENFORCE");
    return {
      decision: result.decision,
      reasons: result.violations.map((v) => `srqc_violation:${v.pendingCountClass}`),
    };
  };

  const receipts = [];
  const governed = createGoverned({
    gate,
    persistReceipt: async (r) => {
      receipts.push(r);
      return { controlEventId: undefined };
    },
    getSigner: () => activeSigner(keyring),
    receiptBaseUrl: "http://localhost:3000",
  });

  const result = await governed(
    "ai.invoke",
    { prompt: "demo" },
    { policyVersion: 1, policyHash: "demo-hash", agentId: "agent-demo", mode: "ENFORCE" },
    async () => {
      throw new Error("run() must not execute on a real ENFORCE REFUSE");
    },
  );

  console.log(`decision: ${result.decision}`);
  console.log(`receiptId: ${result.receipt.receiptId}`);
  console.log(`receiptUrl: ${result.receipt.receiptUrl}`);
  console.log(JSON.stringify(result.receipt, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

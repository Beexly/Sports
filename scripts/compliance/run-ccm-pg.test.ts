/**
 * Real-Postgres acceptance for scripts/compliance/run-ccm.ts's receipt
 * wiring (loadRecentReceipts / verifyReceipt) — the Wave 0 fix that
 * replaced the empty-array / always-ok stubs with real AgentReceipt reads
 * and real signature verification against the process keyring.
 *
 * Gated on DATABASE_URL, same convention as the other *-pg.test.ts files.
 * Local run:
 *
 *   bash scripts/dev/disposable-postgres.sh
 *   export DATABASE_URL='postgresql://postgres@127.0.0.1:5433/sports_test?schema=public'
 *   export FORCE_REAL_PRISMA=true
 *   npx vitest run run-ccm-pg
 */
import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { signReceiptEd25519, type GovernedReceipt } from "@sports/governed";
import { getGovernedSigner } from "../../apps/web/lib/governed/keyring-singleton";
import { persistGovernedReceipt } from "../../apps/web/lib/governed/persist-receipt";
import { db } from "@sports/db";
import { loadRecentReceipts, verifyReceipt } from "./run-ccm";

const HAS_DB = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");
const suite = HAS_DB ? describe : describe.skip;

suite("run-ccm receipt wiring — real Postgres", () => {
  const receiptIds: string[] = [];

  afterAll(async () => {
    await db.agentReceipt.deleteMany({ where: { receiptId: { in: receiptIds } } });
  });

  it("loadRecentReceipts + verifyReceipt round-trip a real signed receipt (ok:true)", async () => {
    const signer = await getGovernedSigner();
    const receiptId = randomUUID();
    receiptIds.push(receiptId);
    const receipt: GovernedReceipt = {
      receiptId,
      at: new Date().toISOString(),
      policyVersion: 1,
      policyHash: "test-hash",
      action: { tool: "ai.invoke", argsDigest: "digest-abc", agentId: "agent-run-ccm-test" },
      decision: "REFUSE",
      reasons: ["srqc_violation:GE2"],
    };
    const signed = signReceiptEd25519(receipt, signer);
    await persistGovernedReceipt(signed);

    const rows = await loadRecentReceipts();
    const row = rows.find((r) => r.id === receiptId);
    expect(row).toBeDefined();
    expect(row?.decision).toBe("REFUSE");

    const result = await verifyReceipt(row!);
    expect(result.ok).toBe(true);
  });

  it("verifyReceipt reports ok:false for a tampered signature", async () => {
    const signer = await getGovernedSigner();
    const receiptId = randomUUID();
    receiptIds.push(receiptId);
    const receipt: GovernedReceipt = {
      receiptId,
      at: new Date().toISOString(),
      policyVersion: 1,
      policyHash: "test-hash",
      action: { tool: "ai.invoke", argsDigest: "digest-xyz", agentId: "agent-run-ccm-test" },
      decision: "ADMIT",
      reasons: [],
    };
    const signed = signReceiptEd25519(receipt, signer);
    const tampered = { ...signed, signature: { ...signed.signature, sig: "tampered-signature-value" } };
    await persistGovernedReceipt(tampered);

    const rows = await loadRecentReceipts();
    const row = rows.find((r) => r.id === receiptId);
    expect(row).toBeDefined();

    const result = await verifyReceipt(row!);
    expect(result.ok).toBe(false);
  });

  it("verifyReceipt reports ok:false for a row with no signature", async () => {
    const result = await verifyReceipt({ id: "no-sig", decision: "ADMIT" });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("missing signature");
  });
});

/**
 * Real-Postgres acceptance for AgentReceipt persistence
 * (packages/governed + apps/web/lib/governed/persist-receipt.ts).
 *
 * Gated on DATABASE_URL, same convention as
 * ai-control-plane-event-ledger-pg.test.ts. Local run:
 *
 *   bash scripts/dev/disposable-postgres.sh
 *   export DATABASE_URL='postgresql://postgres@127.0.0.1:5433/sports_test?schema=public'
 *   export FORCE_REAL_PRISMA=true
 *   npx vitest run governed-receipts-pg --workspace=apps/web
 *
 * Verifies: a signed receipt persisted via persistGovernedReceipt() round-
 * trips through the real `agent_receipt` table (upsert-idempotent on
 * receiptId), and the full createGoverned() ADMIT/REFUSE flow ends with a
 * durable row whose signature verifies against the in-process keyring.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createGoverned,
  InMemoryKeyringStore,
  rotateReceiptSigningKey,
  activeSigner,
  verifyReceiptAgainstKeyring,
} from "@sports/governed";

const HAS_DB = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");
const suite = HAS_DB ? describe : describe.skip;

suite("AgentReceipt persistence — real Postgres", () => {
  let db: (typeof import("@sports/db"))["db"];
  let persistGovernedReceipt: typeof import("@/lib/governed/persist-receipt").persistGovernedReceipt;

  beforeAll(async () => {
    process.env.FORCE_REAL_PRISMA = "true";
    ({ db } = await import("@sports/db"));
    ({ persistGovernedReceipt } = await import("@/lib/governed/persist-receipt"));
  });

  beforeEach(async () => {
    await db.agentReceipt.deleteMany({});
  });

  afterAll(async () => {
    await db.agentReceipt.deleteMany({});
  });

  it("persists a signed ADMIT receipt and round-trips it by receiptId", async () => {
    const keyring = new InMemoryKeyringStore();
    await rotateReceiptSigningKey(keyring);

    const governed = createGoverned({
      gate: async () => ({ decision: "ADMIT", reasons: [] }),
      persistReceipt: persistGovernedReceipt,
      getSigner: () => activeSigner(keyring),
    });

    const result = await governed(
      "tool.read",
      { id: "pg-test" },
      { policyVersion: 1, policyHash: "hash-pg", agentId: "agent-pg", mode: "SHADOW" },
      async () => "ok",
    );

    expect(result.ok).toBe(true);
    const row = await db.agentReceipt.findUnique({ where: { receiptId: result.receipt.receiptId } });
    expect(row).not.toBeNull();
    expect(row?.decision).toBe("ADMIT");
    expect(row?.tool).toBe("tool.read");
    expect(row?.agentId).toBe("agent-pg");

    const persistedSigned = row?.raw as unknown as Parameters<typeof verifyReceiptAgainstKeyring>[1];
    const verify = await verifyReceiptAgainstKeyring(keyring, persistedSigned);
    expect(verify).toEqual({ ok: true });
  });

  it("persistReceipt upsert is idempotent on receiptId", async () => {
    const keyring = new InMemoryKeyringStore();
    await rotateReceiptSigningKey(keyring);
    const signer = await activeSigner(keyring);

    const governed = createGoverned({
      gate: async () => ({ decision: "REFUSE", reasons: ["policy_denied"] }),
      persistReceipt: persistGovernedReceipt,
      getSigner: async () => signer,
    });

    const result = await governed(
      "tool.spend",
      { amountCents: 100 },
      { policyVersion: 1, policyHash: "hash-pg", agentId: "agent-pg", mode: "ENFORCE" },
      async () => {
        throw new Error("must not run on REFUSE");
      },
    );

    expect(result.ok).toBe(false);
    // Persist the same signed receipt a second time — must not throw or duplicate.
    await persistGovernedReceipt(result.receipt);

    const rows = await db.agentReceipt.findMany({ where: { receiptId: result.receipt.receiptId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.decision).toBe("REFUSE");
  });
});

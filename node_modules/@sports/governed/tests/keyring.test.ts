import { describe, expect, it } from "vitest";
import { InMemoryKeyringStore, revokeKey, verifyReceiptAgainstKeyring } from "../src/keyring";
import { rotateReceiptSigningKey, retireExpiredKeys } from "../src/rotate-keys";
import { signReceiptEd25519 } from "../src/receipt-sign-ed25519";
import type { GovernedReceipt } from "../src/receipt-types";

const sampleReceipt: GovernedReceipt = {
  receiptId: "22222222-2222-2222-2222-222222222222",
  at: "2026-07-23T00:00:00.000Z",
  policyVersion: 1,
  policyHash: "hash-1",
  action: { tool: "tool.read", argsDigest: "deadbeef", agentId: "agent-1" },
  decision: "ADMIT",
  reasons: [],
};

describe("keyring rotation lifecycle", () => {
  it("rotate -> old key retiring, new key active; retiring key still verifies; revoked key does not", async () => {
    const store = new InMemoryKeyringStore();

    const key1 = await rotateReceiptSigningKey(store, { now: () => new Date("2026-01-01T00:00:00.000Z") });
    const signedByKey1 = signReceiptEd25519(sampleReceipt, { kid: key1.kid, privateKeyPem: key1.privateKeyPem as string });

    const key2 = await rotateReceiptSigningKey(store, { now: () => new Date("2026-02-01T00:00:00.000Z") });

    const afterRotate = await store.listVerifiable();
    console.log(
      "after rotate — listVerifiable:",
      JSON.stringify(afterRotate.map((r) => ({ kid: r.kid, status: r.status })), null, 2),
    );
    const rec1 = await store.getByKid(key1.kid);
    const rec2 = await store.getByKid(key2.kid);
    expect(rec1?.status).toBe("retiring");
    expect(rec2?.status).toBe("active");

    // Receipt signed by the OLD (now retiring) key still verifies against the keyring.
    const verifyOld = await verifyReceiptAgainstKeyring(store, signedByKey1);
    expect(verifyOld).toEqual({ ok: true });

    // Revoke key1: its receipts must NOT verify against the keyring, and it
    // drops out of listVerifiable.
    await revokeKey(store, key1.kid);
    const verifyRevoked = await verifyReceiptAgainstKeyring(store, signedByKey1);
    const afterRevoke = await store.listVerifiable();
    console.log(
      "after revoke — listVerifiable:",
      JSON.stringify(afterRevoke.map((r) => ({ kid: r.kid, status: r.status })), null, 2),
    );
    console.log("verify(signed-by-revoked-key) via keyring:", JSON.stringify(verifyRevoked, null, 2));
    expect(afterRevoke.some((r) => r.kid === key1.kid)).toBe(false);
    const revokedRec = await store.getByKid(key1.kid);
    expect(revokedRec?.status).toBe("revoked");
    expect(verifyRevoked.ok).toBe(false);
  });

  it("retireExpiredKeys flips a retiring key past its grace period to retired, still verifiable", async () => {
    const store = new InMemoryKeyringStore();
    const key1 = await rotateReceiptSigningKey(store, { now: () => new Date("2026-01-01T00:00:00.000Z") });
    await rotateReceiptSigningKey(store, { now: () => new Date("2026-01-05T00:00:00.000Z") });

    // Not yet past grace period (30 days default).
    const tooEarly = await retireExpiredKeys(store, new Date("2026-01-10T00:00:00.000Z"), 30);
    expect(tooEarly).toEqual([]);
    expect((await store.getByKid(key1.kid))?.status).toBe("retiring");

    // Past grace period.
    const retired = await retireExpiredKeys(store, new Date("2026-02-10T00:00:00.000Z"), 30);
    expect(retired).toContain(key1.kid);
    const rec1 = await store.getByKid(key1.kid);
    expect(rec1?.status).toBe("retired");

    const verifiable = await store.listVerifiable();
    console.log(
      "after retireExpiredKeys — listVerifiable:",
      JSON.stringify(verifiable.map((r) => ({ kid: r.kid, status: r.status })), null, 2),
    );
    expect(verifiable.some((r) => r.kid === key1.kid)).toBe(true);
  });
});

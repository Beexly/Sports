import { describe, expect, it } from "vitest";
import { generateEd25519KeyPairPem } from "../src/rotate-keys";
import { signReceiptEd25519, verifyReceiptEd25519 } from "../src/receipt-sign-ed25519";
import type { GovernedReceipt } from "../src/receipt-types";

const sampleReceipt: GovernedReceipt = {
  receiptId: "11111111-1111-1111-1111-111111111111",
  at: "2026-07-23T00:00:00.000Z",
  policyVersion: 1,
  policyHash: "hash-1",
  action: { tool: "tool.read", argsDigest: "deadbeef", agentId: "agent-1" },
  decision: "ADMIT",
  reasons: [],
};

describe("ed25519 receipt signing", () => {
  it("round-trips: sign then verify -> { ok: true }", () => {
    const { publicKeyPem, privateKeyPem } = generateEd25519KeyPairPem();
    const signed = signReceiptEd25519(sampleReceipt, { kid: "k1", privateKeyPem });
    const result = verifyReceiptEd25519(signed, publicKeyPem);
    expect(result).toEqual({ ok: true });
  });

  it("tamper detection: mutating decision after signing fails verify", () => {
    const { publicKeyPem, privateKeyPem } = generateEd25519KeyPairPem();
    const signed = signReceiptEd25519(sampleReceipt, { kid: "k1", privateKeyPem });
    const tampered = { ...signed, decision: "REFUSE" as const };
    const result = verifyReceiptEd25519(tampered, publicKeyPem);
    expect(result.ok).toBe(false);
    console.log("tamper-detection result:\n" + JSON.stringify(result, null, 2));
  });

  it("receiptUrl is excluded from the signed payload", () => {
    const { publicKeyPem, privateKeyPem } = generateEd25519KeyPairPem();
    const signed = signReceiptEd25519(sampleReceipt, { kid: "k1", privateKeyPem });
    const withUrl = { ...signed, receiptUrl: "https://example.test/receipts/abc" };
    const result = verifyReceiptEd25519(withUrl, publicKeyPem);
    expect(result).toEqual({ ok: true });
  });

  it("controlEventId stamped on AFTER signing does not break verification", () => {
    // A persister-assigned controlEventId is added post-sign (see
    // governed.ts); it must be excluded from the signed payload the same
    // way receiptUrl is, or every receipt whose persister stamps an id
    // would fail its own verification.
    const { publicKeyPem, privateKeyPem } = generateEd25519KeyPairPem();
    const signed = signReceiptEd25519(sampleReceipt, { kid: "k1", privateKeyPem });
    const withEventId = { ...signed, controlEventId: "evt-123" };
    const result = verifyReceiptEd25519(withEventId, publicKeyPem);
    expect(result).toEqual({ ok: true });
  });

  it("budget field key order does not affect verification (JSONB round-trip safety)", () => {
    const { publicKeyPem, privateKeyPem } = generateEd25519KeyPairPem();
    const withBudgetA = {
      ...sampleReceipt,
      budget: { heldCents: 500, remainingCents: 100, unit: "usd" },
    };
    const withBudgetB = {
      ...sampleReceipt,
      // Same values, different key order — as if reserialized from JSONB.
      budget: { unit: "usd", remainingCents: 100, heldCents: 500 },
    };
    const signedA = signReceiptEd25519(withBudgetA, { kid: "k1", privateKeyPem });
    // Re-sign the differently-ordered object and confirm the two receipts
    // produce the SAME signed payload bytes (via cross-verification): sign
    // A, then verify a copy of A's signature against B's field values.
    const crossCheck = { ...withBudgetB, signature: signedA.signature };
    const result = verifyReceiptEd25519(crossCheck, publicKeyPem);
    expect(result).toEqual({ ok: true });
  });
});

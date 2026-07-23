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
});

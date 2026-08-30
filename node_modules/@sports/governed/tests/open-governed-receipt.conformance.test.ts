import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { canonicalReceiptPayload } from "../src/receipt-canonical";
import { signReceiptEd25519, verifyReceiptEd25519 } from "../src/receipt-sign-ed25519";
import { createGoverned, type GateOutput } from "../src/governed";
import { InMemoryKeyringStore, revokeKey, verifyReceiptAgainstKeyring } from "../src/keyring";
import { rotateReceiptSigningKey } from "../src/rotate-keys";
import type { GovernedReceipt, PolicyContext, SignedGovernedReceipt } from "../src/receipt-types";

/**
 * Conformance suite for docs/formal/OPEN_GOVERNED_RECEIPT.md (0.1).
 *
 * This is deliberately a SEPARATE test file from digest.test.ts /
 * signatures.test.ts / keyring.test.ts / governed.test.ts — those pin
 * implementation behavior; this one pins the six numbered claims the
 * profile document makes (§5), each as its own `it()`, so "does this repo's
 * @sports/governed conform to OpenGovernedReceipt 0.1" is answerable by
 * running one file, not by reading four.
 */

const baseReceipt: Omit<GovernedReceipt, "receiptUrl" | "controlEventId"> = {
  receiptId: "11111111-1111-1111-1111-111111111111",
  at: "2026-07-24T00:00:00.000Z",
  policyVersion: 1,
  policyHash: "policy-hash-1",
  action: { tool: "tool.spend", argsDigest: "deadbeefdeadbeefdeadbeefdeadbeef", agentId: "agent-1" },
  decision: "ADMIT",
  reasons: ["b_reason", "a_reason"],
  budget: { heldCents: 500, remainingCents: 1500, unit: "usd_cents" },
};

async function makeGovernedDeps(gateOut: GateOutput) {
  const store = new InMemoryKeyringStore();
  const key = await rotateReceiptSigningKey(store, { now: () => new Date("2026-07-24T00:00:00.000Z") });
  const persisted: SignedGovernedReceipt[] = [];
  const deps = {
    gate: vi.fn(async () => gateOut),
    persistReceipt: vi.fn(async (r: SignedGovernedReceipt) => {
      persisted.push(r);
      return { controlEventId: `evt-${persisted.length}` };
    }),
    getSigner: async () => ({ kid: key.kid, privateKeyPem: key.privateKeyPem as string }),
    receiptBaseUrl: "https://example.test",
  };
  return { deps, store, persisted };
}

const ctx = (mode: "SHADOW" | "ENFORCE"): PolicyContext => ({
  policyVersion: 1,
  policyHash: "policy-hash-1",
  agentId: "agent-1",
  mode,
});

describe("OpenGovernedReceipt 0.1 conformance", () => {
  it("1. canonical payload stability — insertion order and undefined-vs-omitted optional fields never change the payload", () => {
    const canonicalOrder = canonicalReceiptPayload(baseReceipt);

    // Re-key with a different insertion order (payload is deep-cloned by
    // hand, not spread, so key order genuinely differs at every level).
    const reordered: typeof baseReceipt = {
      reasons: [...baseReceipt.reasons],
      decision: baseReceipt.decision,
      action: {
        agentId: baseReceipt.action.agentId,
        argsDigest: baseReceipt.action.argsDigest,
        tool: baseReceipt.action.tool,
      },
      policyHash: baseReceipt.policyHash,
      policyVersion: baseReceipt.policyVersion,
      at: baseReceipt.at,
      receiptId: baseReceipt.receiptId,
      budget: { unit: baseReceipt.budget!.unit, remainingCents: baseReceipt.budget!.remainingCents, heldCents: baseReceipt.budget!.heldCents },
    };
    expect(canonicalReceiptPayload(reordered)).toBe(canonicalOrder);

    // parentInvocationId omitted vs. explicitly undefined must normalize identically.
    const omitted = canonicalReceiptPayload({ ...baseReceipt });
    const explicitUndefined = canonicalReceiptPayload({
      ...baseReceipt,
      action: { ...baseReceipt.action, parentInvocationId: undefined },
    });
    expect(explicitUndefined).toBe(omitted);

    // Different reasons ordering must produce the SAME payload — reasons are sorted.
    const reasonsReversed = canonicalReceiptPayload({ ...baseReceipt, reasons: [...baseReceipt.reasons].reverse() });
    expect(reasonsReversed).toBe(canonicalOrder);
  });

  it("2. sign/verify round-trip with kid — a freshly signed receipt verifies against its own signer's public key", () => {
    const keyPair = generateKeyPairSync("ed25519");
    const publicKey = keyPair.publicKey.export({ type: "spki", format: "pem" }).toString();
    const privateKey = keyPair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const kid = "test-key-1";

    const signed = signReceiptEd25519(baseReceipt, { kid, privateKeyPem: privateKey });

    expect(signed.signature.alg).toBe("ed25519");
    expect(signed.signature.kid).toBe(kid);
    expect(typeof signed.signature.sig).toBe("string");
    expect(signed.signature.sig.length).toBeGreaterThan(0);

    const result = verifyReceiptEd25519(signed, publicKey);
    expect(result).toEqual({ ok: true });
  });

  it("3. tamper fails verify — flipping one character in a signed field breaks verification", () => {
    const keyPair = generateKeyPairSync("ed25519");
    const publicKeyPem = keyPair.publicKey.export({ type: "spki", format: "pem" }).toString();
    const privateKeyPem = keyPair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();

    const signed = signReceiptEd25519(baseReceipt, { kid: "test-key-2", privateKeyPem });
    expect(verifyReceiptEd25519(signed, publicKeyPem)).toEqual({ ok: true });

    const tampered: SignedGovernedReceipt = { ...signed, reasons: [...signed.reasons, "extra_reason_not_signed"] };
    const result = verifyReceiptEd25519(tampered, publicKeyPem);
    expect(result.ok).toBe(false);
  });

  it("4. ENFORCE refuse does not run the side effect", async () => {
    const { deps } = await makeGovernedDeps({ decision: "REFUSE", reasons: ["srqc_violation:GE2"] });
    const governed = createGoverned(deps);
    const run = vi.fn(async () => "should-never-execute");

    const result = await governed("tool.spend", { amountCents: 500 }, ctx("ENFORCE"), run);

    expect(run).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.decision).toBe("REFUSE");
    expect(result.receipt.decision).toBe("REFUSE");
  });

  it("5. SHADOW carries SHADOW_WOULD_REFUSE and ADMITs; ENFORCE does not carry it and REFUSEs", async () => {
    const gateOut: GateOutput = { decision: "REFUSE", reasons: ["srqc_violation:GE2"] };

    const shadowDeps = await makeGovernedDeps(gateOut);
    const shadowGoverned = createGoverned(shadowDeps.deps);
    const shadowRun = vi.fn(async () => "ran");
    const shadowResult = await shadowGoverned("tool.spend", { amountCents: 500 }, ctx("SHADOW"), shadowRun);

    expect(shadowRun).toHaveBeenCalledTimes(1);
    expect(shadowResult.ok).toBe(true);
    if (shadowResult.ok) {
      expect(shadowResult.receipt.decision).toBe("ADMIT");
      expect(shadowResult.receipt.reasons).toContain("SHADOW_WOULD_REFUSE");
    }

    const enforceDeps = await makeGovernedDeps(gateOut);
    const enforceGoverned = createGoverned(enforceDeps.deps);
    const enforceRun = vi.fn(async () => "should-not-run");
    const enforceResult = await enforceGoverned("tool.spend", { amountCents: 500 }, ctx("ENFORCE"), enforceRun);

    expect(enforceRun).not.toHaveBeenCalled();
    expect(enforceResult.ok).toBe(false);
    expect(enforceResult.receipt.decision).toBe("REFUSE");
    expect(enforceResult.receipt.reasons).not.toContain("SHADOW_WOULD_REFUSE");
  });

  it("6. revoked-key receipts fail keyring verification even though the raw signature stays cryptographically valid — the disclaimer test backing OPEN_GOVERNED_RECEIPT.md §7", async () => {
    const store = new InMemoryKeyringStore();
    const key = await rotateReceiptSigningKey(store, { now: () => new Date("2026-07-24T00:00:00.000Z") });

    const signed = signReceiptEd25519(baseReceipt, { kid: key.kid, privateKeyPem: key.privateKeyPem as string });

    // Before revocation: both the raw check and the keyring-aware check agree.
    expect(verifyReceiptEd25519(signed, key.publicKeyPem)).toEqual({ ok: true });
    expect(await verifyReceiptAgainstKeyring(store, signed)).toEqual({ ok: true });

    await revokeKey(store, key.kid);

    // After revocation: raw cryptographic validity is UNCHANGED (the math
    // doesn't know about revocation) — but the keyring-aware check, which is
    // what a real verifier must use, now correctly refuses.
    expect(verifyReceiptEd25519(signed, key.publicKeyPem)).toEqual({ ok: true });
    const afterRevoke = await verifyReceiptAgainstKeyring(store, signed);
    expect(afterRevoke.ok).toBe(false);
  });
});

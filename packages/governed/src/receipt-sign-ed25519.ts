import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { canonicalReceiptPayload } from "./receipt-canonical";
import type { GovernedReceipt, SignedGovernedReceipt } from "./receipt-types";

const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const fromB64url = (s: string) => {
  const p = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + p, "base64");
};

export function signReceiptEd25519(
  receipt: GovernedReceipt,
  key: { kid: string; privateKeyPem: string },
): SignedGovernedReceipt {
  const payload = canonicalReceiptPayload(receipt);
  const sig = sign(null, Buffer.from(payload, "utf8"), createPrivateKey(key.privateKeyPem));
  return { ...receipt, signature: { alg: "ed25519", sig: b64url(sig), kid: key.kid } };
}

export function verifyReceiptEd25519(
  signed: SignedGovernedReceipt,
  publicKeyPem: string,
): { ok: true } | { ok: false; reason: string } {
  if (signed.signature.alg !== "ed25519") return { ok: false, reason: "alg" };
  // receiptUrl and controlEventId are both excluded from the signed payload
  // by design (see receipt-canonical.ts) — canonicalReceiptPayload ignores
  // them even if present on `rest`, so verification stays correct whether
  // or not either was populated after signing.
  const { signature, receiptUrl: _receiptUrl, ...rest } = signed;
  const payload = canonicalReceiptPayload(rest);
  try {
    const ok = verify(null, Buffer.from(payload, "utf8"), createPublicKey(publicKeyPem), fromB64url(signature.sig));
    return ok ? { ok: true } : { ok: false, reason: "bad_sig" };
  } catch {
    return { ok: false, reason: "error" };
  }
}

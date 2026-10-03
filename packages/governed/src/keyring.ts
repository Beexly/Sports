import type { KeyRecord, KeyStatus, KeyringStore } from "./keyring-types";
import { verifyReceiptEd25519 } from "./receipt-sign-ed25519";
import type { SignedGovernedReceipt } from "./receipt-types";

/**
 * Minimal in-memory KeyringStore. Suitable for tests and as a reference
 * implementation; a durable (e.g. Prisma-backed) store just needs to satisfy
 * the same `KeyringStore` interface.
 */
export class InMemoryKeyringStore implements KeyringStore {
  private readonly byKid = new Map<string, KeyRecord>();

  async getActive(): Promise<KeyRecord> {
    for (const rec of this.byKid.values()) {
      if (rec.status === "active") return rec;
    }
    throw new Error("no active signing key in keyring");
  }

  async getByKid(kid: string): Promise<KeyRecord | null> {
    return this.byKid.get(kid) ?? null;
  }

  async listVerifiable(): Promise<KeyRecord[]> {
    return [...this.byKid.values()].filter(
      (r) => r.status === "active" || r.status === "retiring" || r.status === "retired",
    );
  }

  async insert(rec: KeyRecord): Promise<void> {
    this.byKid.set(rec.kid, rec);
  }

  async setStatus(
    kid: string,
    status: KeyStatus,
    timestamps?: { retiringAt?: string; retiredAt?: string },
  ): Promise<void> {
    const rec = this.byKid.get(kid);
    if (!rec) throw new Error(`unknown kid: ${kid}`);
    this.byKid.set(kid, {
      ...rec,
      status,
      retiringAt: timestamps?.retiringAt ?? rec.retiringAt,
      retiredAt: timestamps?.retiredAt ?? rec.retiredAt,
    });
  }
}

/**
 * Convenience accessor for the current active signer. Fail-closed: throws
 * (rather than returning something falsy that a caller might ignore) if no
 * key is active — a missing signer must never silently degrade to unsigned
 * receipts.
 */
export async function activeSigner(store: KeyringStore): Promise<{ kid: string; privateKeyPem: string }> {
  const rec = await store.getActive();
  if (!rec.privateKeyPem) {
    throw new Error(`active key ${rec.kid} has no private key material available`);
  }
  return { kid: rec.kid, privateKeyPem: rec.privateKeyPem };
}

/**
 * Emergency path: e.g. suspected private-key compromise. Sets status
 * straight to `revoked` — bypasses the retiring/retired grace sequence.
 * A revoked key is excluded from `listVerifiable`, so any receipt signed by
 * it stops verifying immediately.
 */
export async function revokeKey(store: KeyringStore, kid: string): Promise<void> {
  await store.setStatus(kid, "revoked");
}

/**
 * The trust-boundary-correct way to verify a signed receipt against a
 * keyring: cryptographic validity alone is NOT sufficient — a signature
 * can be cryptographically perfect and still be untrusted if its key was
 * revoked. This helper looks the `kid` up in `listVerifiable()` FIRST (which
 * excludes revoked keys by construction) and only calls
 * `verifyReceiptEd25519` when the key is still trusted. Public verify routes
 * (e.g. POST /api/receipts/verify) should call this, not
 * `verifyReceiptEd25519` directly.
 */
export async function verifyReceiptAgainstKeyring(
  store: KeyringStore,
  signed: SignedGovernedReceipt,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const verifiable = await store.listVerifiable();
  const rec = verifiable.find((r) => r.kid === signed.signature.kid);
  if (!rec) return { ok: false, reason: "unknown_or_untrusted_kid" };
  return verifyReceiptEd25519(signed, rec.publicKeyPem);
}

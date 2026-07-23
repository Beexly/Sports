/**
 * Process-local keyring singleton for @sports/governed.
 *
 * SCOPE NOTE: this is an in-memory `InMemoryKeyringStore`, seeded once per
 * process. It is NOT a durable, cross-instance keyring — in a
 * multi-instance deployment each instance would mint its own key on first
 * use unless `GOVERNED_SIGNING_KID` / `GOVERNED_SIGNING_PRIVATE_KEY_PEM` /
 * `GOVERNED_SIGNING_PUBLIC_KEY_PEM` are set (in which case every instance
 * seeds the SAME key from env, keeping signatures verifiable across
 * instances and restarts). A durable (Prisma-backed) `KeyringStore`
 * implementation is a natural follow-up once a `SigningKey` table exists;
 * out of scope for this change, which only adds the `AgentReceipt` table.
 *
 * Nothing here defaults to ENFORCE — this module has no opinion on SRQC
 * mode at all, it only manages signing keys.
 */

import { InMemoryKeyringStore, activeSigner, rotateReceiptSigningKey, type KeyringStore, type KeyRecord } from "@sports/governed";

let singleton: KeyringStore | null = null;
let seeding: Promise<KeyringStore> | null = null;

async function seed(): Promise<KeyringStore> {
  const store = new InMemoryKeyringStore();
  const kid = process.env.GOVERNED_SIGNING_KID;
  const privateKeyPem = process.env.GOVERNED_SIGNING_PRIVATE_KEY_PEM;
  const publicKeyPem = process.env.GOVERNED_SIGNING_PUBLIC_KEY_PEM;
  const providedCount = [kid, privateKeyPem, publicKeyPem].filter(Boolean).length;
  if (providedCount > 0 && providedCount < 3) {
    // Partial config is almost certainly a missing/misspelled env var, not
    // an intentional "use an ephemeral key" choice. Fail loudly instead of
    // silently minting a process-local key that stops verifying across
    // restarts or other instances — that failure mode is much harder to
    // notice than a startup error.
    throw new Error(
      "Partial GOVERNED_SIGNING_* configuration: set all three of GOVERNED_SIGNING_KID, " +
        "GOVERNED_SIGNING_PRIVATE_KEY_PEM, and GOVERNED_SIGNING_PUBLIC_KEY_PEM, or none of them.",
    );
  }
  if (kid && privateKeyPem && publicKeyPem) {
    const rec: KeyRecord = {
      kid,
      privateKeyPem,
      publicKeyPem,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    await store.insert(rec);
  } else {
    // No env-provided key material: mint an ephemeral key for this process.
    // Fine for SHADOW-mode dev/staging; a real deployment should set the
    // GOVERNED_SIGNING_* env vars so receipts stay verifiable across
    // restarts and instances.
    await rotateReceiptSigningKey(store);
  }
  return store;
}

/** Get (lazily seeding) the process-local governed-receipts keyring. */
export async function getGovernedKeyring(): Promise<KeyringStore> {
  if (singleton) return singleton;
  if (!seeding) {
    seeding = seed().then((s) => {
      singleton = s;
      return s;
    });
  }
  return seeding;
}

export async function getGovernedSigner(): Promise<{ kid: string; privateKeyPem: string }> {
  const store = await getGovernedKeyring();
  return activeSigner(store);
}

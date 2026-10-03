import { generateKeyPairSync, randomUUID } from "node:crypto";
import type { KeyRecord, KeyringStore } from "./keyring-types";

export type GenerateKeyPairFn = () => { publicKeyPem: string; privateKeyPem: string };

/** Default keypair generator: ed25519 via node:crypto, PEM-encoded. */
export function generateEd25519KeyPairPem(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}

export type RotateOptions = {
  /** Days the outgoing key stays verifiable (as "retiring") before it is
   *  eligible to flip to "retired" via retireExpiredKeys. */
  graceDays?: number;
  generateKeyPair?: GenerateKeyPairFn;
  now?: () => Date;
  newKid?: () => string;
};

/**
 * Rotate the active receipt-signing key: the previous active key (if any)
 * becomes "retiring" (still verifiable), and a freshly generated key becomes
 * the new "active" signer.
 */
export async function rotateReceiptSigningKey(
  store: KeyringStore,
  opts: RotateOptions = {},
): Promise<KeyRecord> {
  const graceDays = opts.graceDays ?? 30;
  const now = opts.now ?? (() => new Date());
  const generateKeyPair = opts.generateKeyPair ?? generateEd25519KeyPairPem;
  const newKid = opts.newKid ?? (() => randomUUID());

  const nowIso = now().toISOString();

  let previous: KeyRecord | null = null;
  try {
    previous = await store.getActive();
  } catch {
    previous = null;
  }
  if (previous) {
    await store.setStatus(previous.kid, "retiring", { retiringAt: nowIso });
  }

  const { publicKeyPem, privateKeyPem } = generateKeyPair();
  const rec: KeyRecord = {
    kid: newKid(),
    publicKeyPem,
    privateKeyPem,
    status: "active",
    createdAt: nowIso,
  };
  await store.insert(rec);
  // graceDays is threaded through by the caller when it later calls
  // retireExpiredKeys(store, now, graceDays) — kept as a documented default
  // here so callers don't have to repeat it.
  void graceDays;
  return rec;
}

/**
 * Scheduled sweep: any "retiring" key whose grace period (retiringAt +
 * graceDays) has elapsed by `now` flips to "retired". Retired keys remain in
 * `listVerifiable` (old receipts must still check out) but are never
 * returned by `getActive`.
 */
export async function retireExpiredKeys(
  store: KeyringStore,
  now: Date = new Date(),
  graceDays = 30,
): Promise<string[]> {
  const retired: string[] = [];
  const candidates = (await store.listVerifiable()).filter((r) => r.status === "retiring" && r.retiringAt);
  for (const rec of candidates) {
    const retiringAt = new Date(rec.retiringAt as string);
    const deadline = new Date(retiringAt.getTime() + graceDays * 24 * 60 * 60 * 1000);
    if (now.getTime() >= deadline.getTime()) {
      await store.setStatus(rec.kid, "retired", { retiredAt: now.toISOString() });
      retired.push(rec.kid);
    }
  }
  return retired;
}

export type KeyStatus = "active" | "retiring" | "retired" | "revoked";

export type KeyRecord = {
  kid: string;
  publicKeyPem: string;
  privateKeyPem?: string;
  status: KeyStatus;
  createdAt: string;
  retiringAt?: string;
  retiredAt?: string;
};

/**
 * Injectable keyring storage seam. Implementations may be in-memory (tests,
 * this package's own defaults) or durable (a future Prisma-backed store in
 * apps/web) — this package depends only on the interface.
 */
export interface KeyringStore {
  getActive(): Promise<KeyRecord>;
  getByKid(kid: string): Promise<KeyRecord | null>;
  /** active + retiring + retired — NOT revoked. Revoked keys must fail verify. */
  listVerifiable(): Promise<KeyRecord[]>;
  insert(rec: KeyRecord): Promise<void>;
  setStatus(
    kid: string,
    status: KeyStatus,
    timestamps?: { retiringAt?: string; retiredAt?: string },
  ): Promise<void>;
}

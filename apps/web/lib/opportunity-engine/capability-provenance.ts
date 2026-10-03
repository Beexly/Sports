/**
 * NOVA S2 — deterministic capability provenance hashing.
 *
 * Every captured capability inventory record carries a provenance hash of its
 * exact source material (the captured tuple plus the identity of the capture
 * document it came from). Downstream governance records pin the hash of the
 * record they were declared against, so any drift in the captured inventory
 * invalidates the governance record and the governor fails closed.
 *
 * FNV-1a (64-bit) is used as a deterministic, dependency-free fingerprint.
 * This is drift detection, not a cryptographic attestation: it defends
 * against accidental divergence between a governance record and the inventory
 * record it reviewed, not against a deliberate forger with write access to
 * both files. Supply-chain trust lives in `CapabilitySupplyChainState`
 * (capability-governance.ts), never in this hash alone.
 *
 * Determinism contract: no clocks, no randomness, no I/O. Identical input
 * always yields the identical hash. Fields are length-prefixed before
 * joining so no field content can be confused with a field boundary.
 */

const FNV64_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV64_PRIME = 0x100000001b3n;
const UINT64_MASK = 0xffffffffffffffffn;

export const CAPABILITY_PROVENANCE_SCHEME = "fnv1a64" as const;
export const CAPABILITY_PROVENANCE_MATERIAL_VERSION =
  "nova-capability-provenance-v1" as const;
export const CAPABILITY_PROVENANCE_HASH_PATTERN = /^fnv1a64:[0-9a-f]{16}$/;

/** Identity of the capture document a capability record was read from. */
export interface CapabilityProvenanceSourceDocument {
  readonly schemaVersion: number;
  readonly capturedAt: string;
}

/** The exact captured fields that constitute one inventory record. */
export interface CapabilityProvenanceMaterialInput {
  readonly surface: string;
  readonly captureBatch: string;
  readonly state: string;
  readonly verificationState: string;
  readonly name: string;
  readonly author?: string;
  readonly skillCount?: number;
  readonly lastUpdated?: string;
}

/** 64-bit FNV-1a over the UTF-8 bytes of `input`, as 16 lowercase hex chars. */
export function fnv1a64Hex(input: string): string {
  let hash = FNV64_OFFSET_BASIS;
  const bytes = new TextEncoder().encode(input);
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * FNV64_PRIME) & UINT64_MASK;
  }
  return hash.toString(16).padStart(16, "0");
}

/**
 * Canonical, unambiguous serialization of one inventory record's source
 * material. Every field is length-prefixed (`<length>:<value>`) so content
 * containing the join character cannot collide with field boundaries.
 */
export function capabilityProvenanceMaterial(
  record: CapabilityProvenanceMaterialInput,
  sourceDocument: CapabilityProvenanceSourceDocument,
): string {
  const fields = [
    CAPABILITY_PROVENANCE_MATERIAL_VERSION,
    String(sourceDocument.schemaVersion),
    sourceDocument.capturedAt,
    record.surface,
    record.captureBatch,
    record.state,
    record.verificationState,
    record.name,
    record.author ?? "",
    record.skillCount === undefined ? "" : String(record.skillCount),
    record.lastUpdated ?? "",
  ];
  return fields.map((field) => `${field.length}:${field}`).join("|");
}

/** Provenance hash for one captured inventory record: `fnv1a64:<16 hex>`. */
export function computeCapabilityProvenanceHash(
  record: CapabilityProvenanceMaterialInput,
  sourceDocument: CapabilityProvenanceSourceDocument,
): string {
  return `${CAPABILITY_PROVENANCE_SCHEME}:${fnv1a64Hex(
    capabilityProvenanceMaterial(record, sourceDocument),
  )}`;
}

/** True when `value` is shaped like a provenance hash this module produced. */
export function isWellFormedCapabilityProvenanceHash(value: string): boolean {
  return CAPABILITY_PROVENANCE_HASH_PATTERN.test(value);
}

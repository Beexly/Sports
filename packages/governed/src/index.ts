// Public surface of @sports/governed — deliberately small. This package is
// new (no prior sealing convention to match); everything a caller needs is
// exported here and nothing else.
//
// NON-CLAIM: this package provides engineering traceability (signed,
// publicly verifiable receipts for gated tool calls). It does not assert or
// imply certification or compliance with any regulatory framework. See
// README.md.

export type {
  AdmissionDecision,
  SrqcMode,
  GovernedReceipt,
  ReceiptSignature,
  SignedGovernedReceipt,
  GovernedResult,
  PolicyContext,
} from "./receipt-types";

export { argsDigest } from "./digest";
export { canonicalReceiptPayload } from "./receipt-canonical";
export { signReceiptEd25519, verifyReceiptEd25519 } from "./receipt-sign-ed25519";

export type { KeyStatus, KeyRecord, KeyringStore } from "./keyring-types";
export { InMemoryKeyringStore, activeSigner, revokeKey, verifyReceiptAgainstKeyring } from "./keyring";
export {
  generateEd25519KeyPairPem,
  rotateReceiptSigningKey,
  retireExpiredKeys,
  type GenerateKeyPairFn,
  type RotateOptions,
} from "./rotate-keys";

export { createGoverned, type GateOutput, type GovernedDeps } from "./governed";

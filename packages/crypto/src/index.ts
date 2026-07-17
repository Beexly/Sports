/**
 * @sports/crypto — production-hardened cryptographic primitives for GSE.
 *
 * Currently: Pedersen homomorphic commitments over secp256k1 (dark/unwired;
 * additive to the SHA-256 Merkle layer, never a replacement). The zero-dep
 * finite-field demonstrator lives in @sports/prediction-engine; this package is
 * the secp256k1 (proven-prime, constant-time, audited) production sibling and
 * carries the @noble dependency in isolation so the engine's zero-dep contract
 * stays intact.
 */
export {
  commit,
  openCommitment,
  addCommitments,
  aggregateCommitments,
  commitLedger,
  verifyLedgerAggregate,
  verifyGroup,
  deriveH,
  encodeFixedPoint,
  PEDERSEN_G,
  PEDERSEN_H,
  CURVE_ORDER,
} from "./pedersen-ledger.js";
export type { Commitment, LedgerCommitmentResult } from "./pedersen-ledger.js";

// OpenTimestamps anchoring (Bitcoin-anchored trustless time for slate roots).
export * from "./ots-anchor.js";
export { applyOp, upgradeDetached } from "./ots-upgrade.js";
export type { UpgradeResult, DetachedLike } from "./ots-upgrade.js";

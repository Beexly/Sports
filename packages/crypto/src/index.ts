/**
 * @sports/crypto — production-hardened cryptographic primitives for GSE.
 *
 * Pedersen homomorphic commitments over secp256k1 — additive to the SHA-256
 * Merkle layer, never a replacement. The COMMIT side is live (Phase 0.5): an
 * aggregate is minted per frozen slate and its hex published on
 * /api/verify/slate. `slate-opening.ts` holds the refuse-by-default planner for
 * the OPEN side (Phase 0.5b) — the decision alone, DB-free and side-effect-free.
 *
 * Classical DLOG: perfectly hiding, computationally binding. NOT
 * zero-knowledge, NOT post-quantum.
 *
 * The zero-dep finite-field demonstrator lives in @sports/prediction-engine;
 * this package is the secp256k1 (proven-prime, constant-time, audited)
 * production sibling and carries the @noble dependency in isolation so the
 * engine's zero-dep contract stays intact.
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
export { planSlateOpening } from "./slate-opening.js";
export type {
  SlateOpening,
  SlateOpeningInput,
  SlateOpeningPlan,
  SlateOpeningRefusal,
} from "./slate-opening.js";

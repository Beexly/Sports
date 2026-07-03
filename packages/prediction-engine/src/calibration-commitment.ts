/**
 * Calibration commitment — a tamper-evident, pre-registerable receipt for the
 * CALIBRATION MAP ITSELF (not a pick). R&D, dark, unwired.
 *
 * WHAT PROBLEM THIS SOLVES:
 *   GSE's trust claim is "our stated probabilities are honest." A calibration map
 *   (isotonic breakpoints / Platt a,b / Beta a,b,c) is what turns a raw score into
 *   that stated probability. If the map can be swapped quietly AFTER seeing which
 *   version flatters the record, the honesty claim is hollow. This binds
 *   (modelVersion, method, a hash of the exact map parameters, the claimed ECE, the
 *   sample it was measured on, a timestamp, and — optionally — a proven anytime
 *   lower bound + a slate root) into ONE deterministic hash. Published pre-reveal,
 *   it makes the calibrator itself pre-registered and tamper-evident: you cannot
 *   later show a different map than the one you committed to.
 *
 * HONEST SALVAGE OF THE ZK DRAFT (see ZK-ML-DUMP-EXTRACTION-LEDGER.md):
 *   The external draft's `zkCalibrationReceipt` hardcoded `valid:true` and used a
 *   `1.96·√(sum/n)` "bound" mislabeled as a Ville bound (it does not shrink in n —
 *   it converges to 1.96·√μ). The receipt STRUCTURE was the real idea; the formula
 *   was not. This module keeps the structure and feeds it REAL numbers (a claimed
 *   ECE the caller measured with the tested calibration toolkit; an optional
 *   anytime-valid lower bound from anytime-ledger.ts). The draft's second snippet
 *   exposed a `{ commitment, bound, proof, publicInputsHash }` interface labeled
 *   "ZK" — but it only checked a SHA-256 string's shape, i.e. a tamper-evident
 *   commitment we ALREADY have via Merkle, NOT zero knowledge. We keep that
 *   interface as a documented FUTURE seam (`ZkCommitmentEnvelope`) and fill only
 *   the parts that are real (the commitment). `proof` stays null. We do NOT call
 *   this ZK. Shipping a SHA-256 stub labeled "ZK proof" would be the exact
 *   overclaim the moat forbids.
 *
 * Composes through proof-of-record.ts (hashLeaf + canonicalPickPayload) so it uses
 * the SAME Merkle-leaf hashing as every other GSE commitment. Deterministic; the
 * hash is injected (production passes sha256Hex). Returns `null` on refused input,
 * never throws on data.
 */

import { hashLeaf, canonicalPickPayload, type HashFn } from "./proof-of-record.js";

/** Domain-separation tag so a calibration commitment can never collide with a pick leaf. */
const COMMITMENT_TYPE = "calibration-map@v1";

export interface CalibrationCommitmentInput {
  /** The MODEL_VERSION this calibration map belongs to (e.g. "v5.1.0"). */
  readonly modelVersion: string;
  /** Calibrator family: "isotonic" | "platt" | "beta" | ... (free string; committed verbatim). */
  readonly method: string;
  /**
   * Canonical, stable serialization of the map's EXACT parameters — e.g.
   * CalibratorFit.paramsCanonical from calibration-map.ts. May contain any
   * characters; it is hashed (paramsHash) rather than embedded, so it never
   * collides with the payload delimiters.
   */
  readonly paramsCanonical: string;
  /** The claimed ECE the caller measured for this map (0..1), on `sampleSize` settled picks. */
  readonly claimedEce: number;
  /** Number of settled samples the ECE was measured on (positive integer). */
  readonly sampleSize: number;
  /** ISO timestamp the commitment is published at — MUST be pre-activation. Caller-supplied (deterministic). */
  readonly committedAt: string;
  /**
   * Optional anytime-valid lower bound on the mean return (from
   * anytimeValidLedger().lowerBound) bound into the same commitment. Omit if none.
   */
  readonly anytimeLowerBound?: number | null;
  /** Optional slate Merkle root this calibration was in force for. Omit if none. */
  readonly ledgerRoot?: string | null;
}

export interface CalibrationCommitment {
  /** Stable identifier: "calib:<modelVersion>:<committedAt>". */
  readonly commitmentId: string;
  /** Canonical serialization actually covered by the content hash. */
  readonly payload: string;
  /** hashLeaf over the committed fields — the tamper-evident fingerprint. */
  readonly contentHash: string;
  /** hash of `paramsCanonical` (the committed parameter fingerprint). */
  readonly paramsHash: string;
  /** Echoed input, for re-derivation on verify. */
  readonly fields: CalibrationCommitmentInput;
}

/**
 * FUTURE seam ONLY — the interface a real zero-knowledge proof would fill.
 * Today `proof` is ALWAYS null: this envelope carries the tamper-evident
 * commitment (contentHash) and, optionally, the published bound. A later Halo2/IPA
 * circuit could populate `proof` to attest the bound was computed from a SEALED
 * ledger without revealing it (see the extraction ledger, Cluster C). Until such a
 * circuit exists and is verified, `proof` MUST stay null and nothing here may be
 * described as "ZK". This type exists so that day is a drop-in, not a refactor.
 */
export interface ZkCommitmentEnvelope {
  /** The tamper-evident commitment (= CalibrationCommitment.contentHash). REAL today. */
  readonly commitment: string;
  /** The published bound this commitment stands behind, or null. REAL today. */
  readonly bound: number | null;
  /** A real succinct proof — FUTURE ONLY. Always null in this build. */
  readonly proof: null;
  /** Hash of any additional public inputs (e.g. slate root), or null. */
  readonly publicInputsHash: string | null;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}
function round(value: number, digits = 6): number {
  const s = 10 ** digits;
  return Math.round(value * s) / s;
}

/**
 * Build a tamper-evident calibration commitment. Returns null on refused input
 * (invalid probability, empty strings, non-finite numbers, non-integer sample).
 */
export function buildCalibrationCommitment(
  input: CalibrationCommitmentInput,
  hash: HashFn,
): CalibrationCommitment | null {
  if (!isNonEmptyString(input.modelVersion)) return null;
  if (!isNonEmptyString(input.method)) return null;
  if (!isNonEmptyString(input.paramsCanonical)) return null;
  if (!isNonEmptyString(input.committedAt)) return null;
  if (!Number.isFinite(input.claimedEce) || input.claimedEce < 0 || input.claimedEce > 1) return null;
  if (!Number.isInteger(input.sampleSize) || input.sampleSize <= 0) return null;
  const lb = input.anytimeLowerBound ?? null;
  if (lb !== null && !Number.isFinite(lb)) return null;
  const ledgerRoot = input.ledgerRoot ?? null;
  if (ledgerRoot !== null && !isNonEmptyString(ledgerRoot)) return null;

  const paramsHash = hash(input.paramsCanonical);

  // Committed field map. Every VALUE is a plain scalar with no "|"/"=" so the
  // canonical payload round-trips (paramsCanonical is committed only via its hash).
  const committed: Record<string, string | number | boolean> = {
    commitmentType: COMMITMENT_TYPE,
    modelVersion: input.modelVersion,
    method: input.method,
    paramsHash,
    claimedEce: round(input.claimedEce),
    sampleSize: input.sampleSize,
    committedAt: input.committedAt,
    anytimeLowerBound: lb === null ? "none" : round(lb),
    ledgerRoot: ledgerRoot === null ? "none" : ledgerRoot,
  };
  const payload = canonicalPickPayload(committed);
  const commitmentId = `calib:${input.modelVersion}:${input.committedAt}`;
  const contentHash = hashLeaf(hash, { id: commitmentId, payload });

  return { commitmentId, payload, contentHash, paramsHash, fields: input };
}

/**
 * Verify a calibration commitment re-derives to the same hash — proves the map
 * parameters, claimed ECE, model version, bound and root have not been altered
 * since publication. Recomputes paramsHash from the echoed paramsCanonical, so a
 * swapped calibration map (different params) fails here.
 */
export function verifyCalibrationCommitment(receipt: CalibrationCommitment, hash: HashFn): boolean {
  const rebuilt = buildCalibrationCommitment(receipt.fields, hash);
  if (!rebuilt) return false;
  return (
    rebuilt.contentHash === receipt.contentHash &&
    rebuilt.payload === receipt.payload &&
    rebuilt.paramsHash === receipt.paramsHash
  );
}

/**
 * Wrap a commitment in the FUTURE-seam envelope. `proof` is always null (this is a
 * commitment, not a ZK proof). Provided so a later real-proof integration is a
 * drop-in. Never present the result as zero-knowledge while `proof` is null.
 */
export function toCommitmentEnvelope(
  receipt: CalibrationCommitment,
  bound: number | null = receipt.fields.anytimeLowerBound ?? null,
): ZkCommitmentEnvelope {
  const ledgerRoot = receipt.fields.ledgerRoot ?? null;
  return {
    commitment: receipt.contentHash,
    bound: bound !== null && Number.isFinite(bound) ? bound : null,
    proof: null,
    publicInputsHash: ledgerRoot,
  };
}

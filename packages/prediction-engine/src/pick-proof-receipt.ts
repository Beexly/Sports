/**
 * Pre-result proof receipt — the tamper-evident commitment a hostile skeptic audits.
 *
 * The whole moat is an auditable track record. That record is only credible if a
 * skeptic can be sure we did not quietly edit a pick (or its claimed model/market
 * probabilities) AFTER seeing the result. This module freezes, at publish time and
 * BEFORE kickoff, exactly what we claimed: the side, the line/price we entered at,
 * our model's win probability, the de-vigged market fair probability, the edge, and
 * the moment it was frozen — then stamps it with a content hash.
 *
 * Two properties make it auditable:
 *   1. Determinism — the same committed facts always produce the same hash, so the
 *      receipt can be re-derived and checked by anyone.
 *   2. Tamper-evidence — changing ANY committed field changes the hash, so a
 *      back-dated edit cannot masquerade as the original claim.
 *
 * It builds on proof-of-record.ts (canonical payload + leaf hash); a batch of these
 * leaves rolls up into the published Merkle root. Pure and dependency-free: the hash
 * is injected. PRODUCTION MUST inject a real cryptographic hash (node:crypto sha256
 * hex). Never fabricate fields — bad input throws rather than minting a false receipt.
 */

import { canonicalPickPayload, hashLeaf, type HashFn } from "./proof-of-record.js";

export interface PickProofInput {
  readonly pickId: string;
  readonly gameId: string;
  readonly selection: string; // e.g. "Chiefs -3.5" / "OVER 48.5"
  readonly pickType: string; // SPREAD | TOTAL | MONEYLINE
  /** The line (spread/total) or American price (moneyline) we published at. */
  readonly line: number;
  /** American odds we entered at. */
  readonly entryOdds: number;
  /**
   * De-vigged market fair probability for the side taken, 0..1. This is a real,
   * market-derived quantity (consensus minus vig) — the honest anchor we always have.
   */
  readonly marketFairProb: number;
  /**
   * The published 0–100 CONFIDENCE score. This is the engine's heuristic, NOT a
   * calibrated probability — it is committed as the score we actually showed, so the
   * receipt freezes the real claim without dressing a heuristic up as a probability.
   */
  readonly confidence: number;
  /** The published 0–100 edge score (net bookmaker edge). Real engine output. */
  readonly edgeScore: number;
  /**
   * A genuinely calibrated model win probability, 0..1 — present ONLY once such a
   * probability exists (champion model w/ published calibration). Absent today, and
   * the receipt commits "none" rather than fabricating one. Never pass confidence/100.
   */
  readonly modelProb?: number | null;
  readonly modelVersion: string;
  /**
   * Method that produced marketFairProb (e.g. multiplicative_devig_v1).
   * Required for continuous self-CLV; optional for legacy receipts.
   * Absent commits as "none" — never invents a method.
   */
  readonly marketFairMethodTag?: string | null;
  /** ISO timestamp the pick + odds snapshot were frozen at (must be before kickoff). */
  readonly asOf: string;
}

export interface PickProofReceipt {
  readonly pickId: string;
  /** Canonical serialization of the committed fields — the source of truth for verification. */
  readonly payload: string;
  /** Hash of the committed leaf (id + payload). Re-derivable by anyone with the same hash fn. */
  readonly contentHash: string;
  /** When the receipt was minted (mirrors asOf). */
  readonly frozenAt: string;
  /** The exact fields committed to, echoed back for display + re-verification. */
  readonly fields: PickProofInput;
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function assertProb(name: string, p: number): void {
  if (!Number.isFinite(p) || p < 0 || p > 1) {
    throw new Error(`pick-proof-receipt: ${name} must be a probability in 0..1, got ${p}`);
  }
}

function assertNonEmpty(name: string, s: string): void {
  if (typeof s !== "string" || s.trim() === "") {
    throw new Error(`pick-proof-receipt: ${name} must be a non-empty string`);
  }
}

/**
 * The committed fields, normalized to stable primitives. Probabilities are rounded
 * to a fixed precision so floating-point noise never changes the hash for the same
 * underlying claim. This is the only place that decides what the receipt commits to.
 */
function committedFields(i: PickProofInput): Readonly<Record<string, string | number | boolean>> {
  return {
    pickId: i.pickId,
    gameId: i.gameId,
    selection: i.selection,
    pickType: i.pickType,
    line: round(i.line, 4),
    entryOdds: Math.round(i.entryOdds),
    marketFairProb: round(i.marketFairProb, 6),
    confidence: Math.round(i.confidence),
    edgeScore: round(i.edgeScore, 4),
    // Committed as "none" when absent — an honest, hashable commitment that we did
    // NOT claim a calibrated probability, distinct from any future real value.
    modelProb: i.modelProb == null ? "none" : round(i.modelProb, 6),
    modelVersion: i.modelVersion,
    marketFairMethodTag:
      i.marketFairMethodTag == null || !String(i.marketFairMethodTag).trim()
        ? "none"
        : String(i.marketFairMethodTag).trim(),
    asOf: i.asOf,
  };
}

/**
 * Freeze a pick into a tamper-evident receipt. Validates the inputs (never mints a
 * receipt from non-finite probabilities or empty identifiers), builds the canonical
 * payload, and stamps it with the injected hash.
 */
export function buildPickProofReceipt(input: PickProofInput, hash: HashFn): PickProofReceipt {
  assertNonEmpty("pickId", input.pickId);
  assertNonEmpty("gameId", input.gameId);
  assertNonEmpty("selection", input.selection);
  assertNonEmpty("modelVersion", input.modelVersion);
  assertNonEmpty("asOf", input.asOf);
  assertProb("marketFairProb", input.marketFairProb);
  // modelProb is optional, but if present it must be a real probability — never a
  // confidence score scaled into 0..1.
  if (input.modelProb != null) assertProb("modelProb", input.modelProb);
  if (!Number.isFinite(input.confidence)) throw new Error("pick-proof-receipt: confidence must be finite");
  if (!Number.isFinite(input.edgeScore)) throw new Error("pick-proof-receipt: edgeScore must be finite");
  if (!Number.isFinite(input.entryOdds) || input.entryOdds === 0) {
    throw new Error("pick-proof-receipt: entryOdds must be a non-zero finite American price");
  }
  if (!Number.isFinite(input.line)) throw new Error("pick-proof-receipt: line must be finite");

  const payload = canonicalPickPayload(committedFields(input));
  const contentHash = hashLeaf(hash, { id: input.pickId, payload });

  return {
    pickId: input.pickId,
    payload,
    contentHash,
    frozenAt: input.asOf,
    fields: input,
  };
}

/**
 * Re-derive a receipt from its echoed fields and confirm both the canonical payload
 * and the content hash still match. Returns false if any committed field was altered
 * after the fact (the tamper signal) — the check a skeptic runs.
 */
export function verifyPickProofReceipt(receipt: PickProofReceipt, hash: HashFn): boolean {
  let recomputed: PickProofReceipt;
  try {
    recomputed = buildPickProofReceipt(receipt.fields, hash);
  } catch {
    return false;
  }
  return recomputed.payload === receipt.payload && recomputed.contentHash === receipt.contentHash;
}

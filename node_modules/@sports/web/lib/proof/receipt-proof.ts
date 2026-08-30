/**
 * Receipt integrity verifier — the shared tamper check behind the
 * enumerable Proof API (`/api/proof/receipts`).
 *
 * This is the SAME live check `/api/verify` performs for a single receipt,
 * factored into a pure, testable function so the batch endpoint can apply
 * it per row without re-implementing (or drifting from) the policy:
 *
 *   1. Re-hash the stored payload as `sha256("leaf:" + pickId + ":" + payload)`
 *      and compare to the frozen `contentHash`. A mismatch means the record
 *      was altered after minting.
 *   2. Cross-check the sibling DB columns against the hash-covered payload —
 *      the user-visible numbers must come from what was hashed, not from a
 *      column that could have drifted. Any drift beyond rounding tolerance is
 *      itself tampering and flips the verdict.
 *
 * Committed financial fields are surfaced ONLY when both checks pass; on a
 * failed check they are withheld (the caller still gets `verified: false`
 * plus the raw payload + hash so a skeptic can recompute independently).
 *
 * Pure module: no DB, no HTTP. The batch route supplies rows; tests supply
 * fixtures built with `canonicalPickPayload` + `hashLeaf`.
 */

import { createHash } from "node:crypto";
import { hashLeaf, parseCanonicalPayload } from "@sports/prediction-engine";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Parse a canonical payload string field to a number, or null for absent/"none". */
function num(s: string | undefined): number | null {
  return s == null || s === "none" ? null : Number.isFinite(Number(s)) ? Number(s) : null;
}

/** True if both are null, or both finite and within tolerance. */
function approxEq(a: number | null, b: number | null, tol: number): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= tol;
}

/** The stored receipt fields this verifier needs (a subset of PickProofReceipt). */
export interface ReceiptForVerification {
  readonly pickId: string;
  readonly payload: string;
  readonly contentHash: string;
  readonly line: number;
  readonly entryOdds: number;
  readonly marketFairProb: number;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly modelProb: number | null;
  readonly modelVersion: string;
  readonly asOf: Date;
}

/** Payload-derived committed fields, surfaced only when the receipt verifies. */
export interface CommittedFields {
  readonly line: number | null;
  readonly entryOdds: number | null;
  readonly marketFairProb: number | null;
  readonly confidence: number | null;
  readonly edgeScore: number | null;
  readonly modelProb: number | null;
}

export interface ReceiptVerification {
  readonly verified: boolean;
  readonly hashIntact: boolean;
  readonly columnsMatchPayload: boolean;
  /** Freeze time, from the hash-covered payload (falls back to the column). */
  readonly frozenAt: string;
  readonly modelVersion: string;
  /** Non-null ONLY when `verified` — never surface a tamper-suspect number. */
  readonly committed: CommittedFields | null;
}

/**
 * Verify one receipt's integrity. Mirrors `/api/verify`'s check exactly so a
 * row in the batch endpoint carries the identical guarantee as the
 * single-hash verifier.
 */
export function verifyReceiptIntegrity(r: ReceiptForVerification): ReceiptVerification {
  const recomputed = hashLeaf(sha256Hex, { id: r.pickId, payload: r.payload });
  const hashIntact = recomputed === r.contentHash;

  const p = parseCanonicalPayload(r.payload);
  const columnsMatchPayload =
    approxEq(r.line, num(p["line"]), 1e-4) &&
    approxEq(r.entryOdds, num(p["entryOdds"]), 0.5) &&
    approxEq(r.marketFairProb, num(p["marketFairProb"]), 1e-6) &&
    approxEq(r.confidence, num(p["confidence"]), 0.5) &&
    approxEq(r.edgeScore, num(p["edgeScore"]), 1e-4) &&
    approxEq(r.modelProb, num(p["modelProb"]), 1e-6) &&
    r.modelVersion === (p["modelVersion"] ?? r.modelVersion);

  const verified = hashIntact && columnsMatchPayload;
  const frozenAt = p["asOf"] ?? r.asOf.toISOString();
  const modelVersion = p["modelVersion"] ?? r.modelVersion;

  return {
    verified,
    hashIntact,
    columnsMatchPayload,
    frozenAt,
    modelVersion,
    committed: verified
      ? {
          line: num(p["line"]),
          entryOdds: num(p["entryOdds"]),
          marketFairProb: num(p["marketFairProb"]),
          confidence: num(p["confidence"]),
          edgeScore: num(p["edgeScore"]),
          modelProb: num(p["modelProb"]),
        }
      : null,
  };
}

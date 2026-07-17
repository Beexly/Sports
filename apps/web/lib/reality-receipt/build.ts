/**
 * Reality Receipt v0 — the pure builder (W003).
 *
 * Composes four proof primitives that already exist on this branch into ONE
 * reproducible object:
 *   1. the W001 PickEvidenceEnvelope's own digest (the evidence-spine hash),
 *   2. the pick-proof hash-chain receipt's live tamper check
 *      (`verifyReceiptIntegrity`, reused verbatim from lib/proof/receipt-proof.ts —
 *      the SAME check `/api/verify` and `/api/proof/receipts` perform),
 *   3. the W-OTS Bitcoin-anchor status for the receipt's slate commitment, and
 *   4. (Phase 2.2) the slate Merkle-inclusion proof — that this receipt was
 *      inside its slate's pre-kickoff committed root, reusing
 *      `inclusionProof`/`verifyInclusion` from `@sports/prediction-engine`.
 *
 * Pure, no I/O: the caller (load.ts) resolves the envelope/receipt row/anchor
 * status/slate-inclusion state and passes them in, so this stays trivially
 * unit-testable and the one place that can drift (DB access) never touches
 * this file.
 */

import { canonicalJson } from "@/lib/intelligence-playback/canonical-json";
import type { PickEvidenceEnvelope } from "@/lib/intelligence-playback";
import { verifyReceiptIntegrity, type ReceiptForVerification } from "@/lib/proof/receipt-proof";
import type { RealityReceipt, RealityReceiptAnchor, RealityReceiptProof, RealityReceiptSlateInclusion } from "./types";

export type RealityReceiptHash = (payload: string) => string;

export interface BuildRealityReceiptInput {
  readonly envelope: PickEvidenceEnvelope;
  /** Full receipt row for `verifyReceiptIntegrity`, or null when none is captured. */
  readonly receiptRow: ReceiptForVerification | null;
  readonly anchor: RealityReceiptAnchor;
  readonly slateInclusion: RealityReceiptSlateInclusion;
  readonly now: Date;
}

/**
 * Mirrors `/api/verify`'s exact sealed/open policy (`kickedOff || settled`),
 * but reads BOTH signals off the envelope itself rather than a second,
 * hand-rolled DB-row check — one canonical disclosure signal, not two that
 * could drift apart.
 */
function isOpen(envelope: PickEvidenceEnvelope, now: Date): boolean {
  const kickedOff = Date.parse(envelope.game.commenceTime) <= now.getTime();
  const settled = envelope.settlement.state === "CAPTURED";
  return kickedOff || settled;
}

function buildReceiptProof(
  envelope: PickEvidenceEnvelope,
  receiptRow: ReceiptForVerification | null,
  now: Date,
): RealityReceiptProof {
  if (envelope.receipt.state !== "CAPTURED") {
    return { state: "NOT_CAPTURED", reason: envelope.receipt.reason };
  }
  if (!receiptRow) {
    return {
      state: "NOT_CAPTURED",
      reason: "Receipt is captured on the envelope, but its full row could not be loaded.",
    };
  }
  const v = verifyReceiptIntegrity(receiptRow);
  return isOpen(envelope, now)
    ? { state: "OPEN", verified: v.verified, frozenAt: v.frozenAt, modelVersion: v.modelVersion, committed: v.committed }
    : { state: "SEALED", verified: v.verified, frozenAt: v.frozenAt, modelVersion: v.modelVersion };
}

/**
 * Withhold a genuinely-computed `PROVEN` inclusion proof until the `receipt`
 * leg itself is OPEN. `proof.leaf` is exactly the receipt's own contentHash
 * (slate-commitment.ts: "a pick's leaf in the slate is exactly its
 * receipt.contentHash"), so passing a `PROVEN` slateInclusion through while
 * `receipt.state === "SEALED"` would disclose a hash the receipt leg (and
 * `/api/verify`) both deliberately withhold pre-kickoff — one disclosure
 * rule for the whole composed object, not two that could drift apart.
 * UNAVAILABLE/NOT_REQUESTED discloses nothing sensitive and passes through
 * regardless of kickoff timing.
 */
function gateSlateInclusion(receipt: RealityReceiptProof, raw: RealityReceiptSlateInclusion): RealityReceiptSlateInclusion {
  if (raw.state === "PROVEN" && receipt.state !== "OPEN") {
    return { state: "SEALED" };
  }
  return raw;
}

export function buildRealityReceipt(input: BuildRealityReceiptInput, hash: RealityReceiptHash): RealityReceipt {
  const { envelope, anchor, now } = input;
  const receipt = buildReceiptProof(envelope, input.receiptRow, now);
  const slateInclusion = gateSlateInclusion(receipt, input.slateInclusion);
  const digest = hash(canonicalJson({ envelopeDigest: envelope.digest, receipt, anchor, slateInclusion }));

  return {
    schemaVersion: "reality-receipt/v0",
    generatedAt: now.toISOString(),
    game: { ...envelope.game },
    decision: { kind: envelope.decision.kind, reasonCode: envelope.decision.reasonCode },
    envelope: { id: envelope.envelopeId, digest: envelope.digest, publicationStatus: envelope.publication.status },
    receipt,
    anchor,
    slateInclusion,
    digest,
  };
}

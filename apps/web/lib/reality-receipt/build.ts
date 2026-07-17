/**
 * Reality Receipt v0 — the pure builder (W003).
 *
 * Composes three proof primitives that already exist on this branch into ONE
 * reproducible object:
 *   1. the W001 PickEvidenceEnvelope's own digest (the evidence-spine hash),
 *   2. the pick-proof hash-chain receipt's live tamper check
 *      (`verifyReceiptIntegrity`, reused verbatim from lib/proof/receipt-proof.ts —
 *      the SAME check `/api/verify` and `/api/proof/receipts` perform), and
 *   3. the W-OTS Bitcoin-anchor status for the receipt's slate commitment.
 *
 * Pure, no I/O: the caller (load.ts) resolves the envelope/receipt row/anchor
 * status and passes them in, so this stays trivially unit-testable and the
 * one place that can drift (DB access) never touches this file.
 */

import { canonicalJson } from "@/lib/intelligence-playback/canonical-json";
import type { PickEvidenceEnvelope } from "@/lib/intelligence-playback";
import { verifyReceiptIntegrity, type ReceiptForVerification } from "@/lib/proof/receipt-proof";
import type { RealityReceipt, RealityReceiptAnchor, RealityReceiptProof } from "./types";

export type RealityReceiptHash = (payload: string) => string;

export interface BuildRealityReceiptInput {
  readonly envelope: PickEvidenceEnvelope;
  /** Full receipt row for `verifyReceiptIntegrity`, or null when none is captured. */
  readonly receiptRow: ReceiptForVerification | null;
  readonly anchor: RealityReceiptAnchor;
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

export function buildRealityReceipt(input: BuildRealityReceiptInput, hash: RealityReceiptHash): RealityReceipt {
  const { envelope, anchor, now } = input;
  const receipt = buildReceiptProof(envelope, input.receiptRow, now);
  const digest = hash(canonicalJson({ envelopeDigest: envelope.digest, receipt, anchor }));

  return {
    schemaVersion: "reality-receipt/v0",
    generatedAt: now.toISOString(),
    game: { ...envelope.game },
    decision: { kind: envelope.decision.kind, reasonCode: envelope.decision.reasonCode },
    envelope: { id: envelope.envelopeId, digest: envelope.digest, publicationStatus: envelope.publication.status },
    receipt,
    anchor,
    digest,
  };
}

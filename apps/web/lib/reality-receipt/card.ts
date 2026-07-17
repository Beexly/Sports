/**
 * Reality Receipt card — pure, testable visual-content model (W003).
 *
 * The image route (app/api/proof/reality/[gameId]/image/route.tsx) is a thin
 * JSX shell over this module's output, so every piece of DECISION logic
 * (digest truncation, state → copy mapping, honest not-found/unavailable
 * text) is unit-tested here rather than inside untested `next/og` JSX.
 */

import type { RealityReceipt } from "./types";
import type { RealityReceiptLoadFailureReason } from "./load-types";

export interface RealityReceiptCard {
  readonly eyebrow: string;
  readonly headline: string;
  readonly subhead: string;
  readonly lines: readonly string[];
  readonly footer: string;
}

function shortHash(hash: string, length = 16): string {
  return `${hash.slice(0, length)}…`;
}

function receiptLine(receipt: RealityReceipt["receipt"]): string {
  if (receipt.state === "NOT_CAPTURED") return `No proof receipt captured — ${receipt.reason}`;
  const tamper = receipt.verified ? "hash verified" : "hash check FAILED";
  return `${receipt.state} · ${tamper} · frozen ${receipt.frozenAt.slice(0, 10)}`;
}

function anchorLine(anchor: RealityReceipt["anchor"]): string {
  switch (anchor.state) {
    case "BITCOIN_ATTESTED":
      return `Anchored to Bitcoin (block ${anchor.bitcoinBlockHeights[0] ?? "unknown"})`;
    case "PENDING":
      return "Bitcoin anchor pending calendar attestation";
    case "NOT_REQUESTED":
      return "No Bitcoin anchor requested for this decision";
    case "NOT_MIGRATED":
      return "Bitcoin anchoring not yet activated";
    case "UNAVAILABLE":
      return "Anchor status temporarily unavailable";
    case "NO_PROOF":
      return "No Bitcoin anchor on record";
  }
}

/** Build the card for a resolved Reality Receipt. */
export function buildRealityReceiptCard(receipt: RealityReceipt): RealityReceiptCard {
  return {
    eyebrow: `Reality Receipt · ${receipt.schemaVersion}`,
    headline: receipt.game.matchup,
    subhead: `${receipt.game.sport} · ${receipt.decision.kind} · ${receipt.envelope.publicationStatus}`,
    lines: [
      `Evidence digest: ${shortHash(receipt.envelope.digest)}`,
      receiptLine(receipt.receipt),
      anchorLine(receipt.anchor),
    ],
    footer: `receipt digest ${shortHash(receipt.digest, 24)}`,
  };
}

/** Build the honest unavailable-state card for a load failure. Never fabricates a receipt. */
export function buildRealityReceiptUnavailableCard(reason: RealityReceiptLoadFailureReason): RealityReceiptCard {
  const message =
    reason === "UNAVAILABLE"
      ? "Temporarily unavailable — not a verdict; try again shortly."
      : reason === "NO_DECISION"
        ? "No recorded decision (publish or pass) for this game yet."
        : "No such game.";
  return {
    eyebrow: "Reality Receipt",
    headline: "Reality Receipt unavailable",
    subhead: message,
    lines: [],
    footer: "galaxysportsedge.com/api/proof/reality",
  };
}

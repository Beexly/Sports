/**
 * SportsIR v0 adapters (W004 + W007) — pure projections from real,
 * already-shipped objects into the shared minimal intermediate
 * representation (@sports/types's sports-ir.ts). One direction only:
 * concrete object -> primitive. SportsIR is a vocabulary for describing what
 * already exists, never a new source of truth, so nothing here mutates or
 * persists — every function is a pure, synchronous projection.
 *
 * Seven of the twelve primitives are adapted here, each backed by an object
 * that already ships on this branch:
 *   Entity      <- explicit constructor (Worldline ids are opaque strings;
 *                  no kind/label is ever guessed from an id)
 *   Observation <- Worldline WorldObservation (W002)
 *   State       <- Worldline WorldSnapshot (W002)
 *   Claim       <- PickEvidenceEnvelope.decision + .model (W001)
 *   Outcome     <- PickEvidenceEnvelope.settlement Capture (W001)
 *   Proof       <- RealityReceipt (W003)
 *   Branch      <- Worldline WorldConflict (W007) — an unresolved
 *                  disagreement, never flattened into a single consensus
 *
 * See docs/frontier/WORKSTREAM_004_SPORTSIR_V0.md for which five are still
 * DECLARED-only (Event, Measurement, Relation, Interaction, Intervention)
 * and what each will adapt from next.
 */

import type {
  SportsIrBranch,
  SportsIrClaim,
  SportsIrEntity,
  SportsIrEntityKind,
  SportsIrObservation,
  SportsIrOutcome,
  SportsIrProof,
  SportsIrProofAnchor,
  SportsIrState,
} from "@sports/types";
import type { WorldConflict, WorldObservation, WorldSnapshot } from "@/lib/worldline";
import type { PickEvidenceEnvelope } from "@/lib/intelligence-playback";
import type { RealityReceipt } from "@/lib/reality-receipt";

/** Entity has no inherent id->kind/label mapping anywhere in the codebase
 *  today — the caller states both explicitly rather than SportsIR guessing. */
export function makeSportsIrEntity(id: string, kind: SportsIrEntityKind, label: string): SportsIrEntity {
  return { id, kind, label };
}

/** Near-identity map: WorldObservation is already shaped like an Observation. */
export function worldObservationToSportsIrObservation(obs: WorldObservation): SportsIrObservation {
  return {
    id: obs.id,
    entityId: obs.entityId,
    attribute: obs.attribute,
    value: obs.value,
    source: obs.source,
    occurredAt: obs.occurredAt,
    observedAt: obs.observedAt,
    ...(obs.publishedAt !== undefined ? { publishedAt: obs.publishedAt } : {}),
    ...(obs.effectiveAt !== undefined ? { effectiveAt: obs.effectiveAt } : {}),
  };
}

/** Near-identity map: WorldSnapshot's cells already carry a winning observation id. */
export function worldSnapshotToSportsIrState(snapshot: WorldSnapshot): SportsIrState {
  return {
    asOf: { validTime: snapshot.at.validTime, knowledgeTime: snapshot.at.knowledgeTime },
    cells: snapshot.cells.map((cell) => ({
      entityId: cell.entityId,
      attribute: cell.attribute,
      value: cell.value,
      asOfObservationId: cell.observationId,
    })),
    digest: snapshot.digest,
  };
}

/**
 * The envelope's publish/pass assertion as a Claim. `confidence` is honestly
 * null: PickEvidenceEnvelope's ModelState carries no numeric confidence at
 * this layer (that is audience-gated deeper in the stack) — this primitive
 * states what is true HERE, not what a downstream UI happens to show.
 */
export function pickDecisionToSportsIrClaim(envelope: PickEvidenceEnvelope): SportsIrClaim {
  return {
    id: envelope.envelopeId,
    subjectEntityId: envelope.game.id,
    kind: envelope.decision.kind === "PUBLISHED" ? "PICK_PUBLISHED" : "PICK_PASSED",
    statement: envelope.model.publicRepresentation,
    confidence: null,
    assertedBy: envelope.model.version,
    occurredAt: envelope.decision.decidedAt,
    observedAt: envelope.decision.decidedAt,
    ...(envelope.decision.kind === "PUBLISHED" ? { publishedAt: envelope.decision.decidedAt } : {}),
  };
}

/** Null (not a fabricated Outcome) when the envelope's settlement is NOT_CAPTURED. */
export function settlementToSportsIrOutcome(envelope: PickEvidenceEnvelope): SportsIrOutcome | null {
  if (envelope.settlement.state !== "CAPTURED") return null;
  const settlement = envelope.settlement.value;
  return {
    id: `${envelope.envelopeId}:settlement`,
    entityId: envelope.game.id,
    kind: settlement.result,
    settledAt: settlement.settledAt,
    occurredAt: settlement.settledAt,
    observedAt: settlement.settledAt,
  };
}

function anchorFor(receipt: RealityReceipt): SportsIrProofAnchor {
  switch (receipt.anchor.state) {
    case "BITCOIN_ATTESTED":
      return "BITCOIN_ATTESTED";
    case "PENDING":
      return "PENDING";
    case "NOT_REQUESTED":
      return "NONE";
    // NOT_MIGRATED / NO_PROOF / UNAVAILABLE: none of these honestly support
    // "anchored" or "not anchored" — collapse to UNKNOWN rather than guess.
    case "NOT_MIGRATED":
    case "NO_PROOF":
    case "UNAVAILABLE":
      return "UNKNOWN";
  }
}

/** `verified` is null (not false) when no receipt was ever captured — a
 *  PASSED decision has nothing to verify, which is not the same as a failed
 *  check. */
export function realityReceiptToSportsIrProof(receipt: RealityReceipt): SportsIrProof {
  return {
    id: receipt.envelope.id,
    subjectEntityId: receipt.game.id,
    digest: receipt.digest,
    verified: receipt.receipt.state === "NOT_CAPTURED" ? null : receipt.receipt.verified,
    anchor: anchorFor(receipt),
  };
}

/**
 * One Branch per tied candidate — a flat set of sibling alternate worlds
 * (v0 never populates `parentBranchId`; nested branch hierarchies are a
 * named future step, not claimed here). `id` traces back to the exact
 * observation that grounds it — never a synthetic id — and `createdAt` is
 * that observation's own `observedAt` (when this candidate became known).
 *
 * `label` embeds `obs.source`/`obs.value` VERBATIM. REQUIRED before any
 * public/live wiring: pass through apps/web/lib/scraping/clearance-engine.ts
 * first — a raw source name or value could otherwise leak a vendor identity
 * or licensed content with no attribution/rights review. See
 * docs/frontier/WORKSTREAM_007_BRANCHING_REALITY_V0.md.
 */
export function worldConflictToSportsIrBranches(conflict: WorldConflict): SportsIrBranch[] {
  return conflict.candidates.map((obs) => ({
    id: `branch:${obs.id}`,
    parentBranchId: null,
    label: `${conflict.entityId}.${conflict.attribute} = ${JSON.stringify(obs.value)} (per ${obs.source})`,
    createdAt: obs.observedAt,
  }));
}

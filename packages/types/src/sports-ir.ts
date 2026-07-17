/**
 * SportsIR v0 — the shared minimal intermediate representation (W004).
 *
 * Twelve canonical primitives (docs/frontier/FRONTIER_KERNEL.md): Entity,
 * Observation, Event, Claim, Measurement, State, Relation, Interaction,
 * Intervention, Branch, Outcome, Proof. This is a shared VOCABULARY for
 * describing what the platform already knows — not a new source of truth,
 * not a store. Concrete objects (a Worldline observation, a
 * PickEvidenceEnvelope, a RealityReceipt) get PROJECTED into these shapes by
 * adapters that live next to the concrete objects they adapt (see
 * apps/web/lib/sports-ir/adapters.ts); this file stays dependency-free so any
 * package can adopt the vocabulary without a new dependency edge.
 *
 * Four SportsIR clocks, carried wherever meaningful (mirrors Worldline's own
 * two-clock discipline, extended per the kernel's four):
 *   - occurredAt   — VALID time: when the fact was true in the world.
 *   - observedAt   — KNOWLEDGE time: when the platform first knew it.
 *   - publishedAt  — when it became externally visible (optional).
 *   - effectiveAt  — when it takes effect, if distinct from occurredAt (optional).
 *
 * v0 status per primitive — see docs/frontier/WORKSTREAM_004_SPORTSIR_V0.md
 * for the acceptance bar. ADAPTED means a real adapter + test exists today;
 * DECLARED means the shape is frozen but no adapter has been written yet
 * (never claim more than what is actually wired).
 */

/** JSON-safe recursive value. Structurally identical to Worldline's
 *  `WorldValue` (apps/web/lib/worldline/types.ts) — one shape, so a ported
 *  WorldObservation's `value` type-checks directly as a SportsIrValue. */
export type SportsIrValue =
  | null
  | boolean
  | number
  | string
  | readonly SportsIrValue[]
  | { readonly [key: string]: SportsIrValue };

export interface SportsIrClocks {
  readonly occurredAt: string;
  readonly observedAt: string;
  readonly publishedAt?: string;
  readonly effectiveAt?: string;
}

// ── Entity — ADAPTED (apps/web/lib/sports-ir/adapters.ts: makeSportsIrEntity) ──

export type SportsIrEntityKind =
  | "GAME"
  | "TEAM"
  | "PLAYER"
  | "MARKET"
  | "SLATE"
  | "MODEL"
  | "DECISION"
  | "SOURCE"
  | "OTHER";

/** A persistent thing the platform tracks. No kind/label is ever inferred
 *  from an opaque id string — the caller states it explicitly. */
export interface SportsIrEntity {
  readonly id: string;
  readonly kind: SportsIrEntityKind;
  readonly label: string;
}

// ── Observation — ADAPTED (← Worldline WorldObservation, W002) ──

/** One immutable fact: entity.attribute = value, on both clocks, sourced. */
export interface SportsIrObservation extends SportsIrClocks {
  readonly id: string;
  readonly entityId: string;
  readonly attribute: string;
  readonly value: SportsIrValue;
  readonly source: string;
}

// ── State — ADAPTED (← Worldline WorldSnapshot, W002) ──

export interface SportsIrStateCell {
  readonly entityId: string;
  readonly attribute: string;
  readonly value: SportsIrValue;
  /** The Observation id that won resolution for this cell. */
  readonly asOfObservationId: string;
}

/** A resolved as-of view over one or more entities, with its provenance digest. */
export interface SportsIrState {
  readonly asOf: { readonly validTime: string; readonly knowledgeTime: string };
  readonly cells: readonly SportsIrStateCell[];
  readonly digest: string;
}

// ── Event — DECLARED (future adapter: packages/types/src/heartbeat.ts's
//    GameSettledEvent is already this shape in miniature — a fast follow is
//    to express it directly as a SportsIrEvent rather than a bespoke type) ──

/** Something that happened, scoped to one or more entities. */
export interface SportsIrEvent extends SportsIrClocks {
  readonly id: string;
  readonly kind: string;
  readonly entityIds: readonly string[];
  readonly idempotencyKey?: string;
}

// ── Claim — ADAPTED (← PickEvidenceEnvelope.decision + .model, W001) ──

/** An assertion made about an entity — a decision, a prediction, a labeled belief. */
export interface SportsIrClaim extends SportsIrClocks {
  readonly id: string;
  readonly subjectEntityId: string;
  readonly kind: string;
  readonly statement: string;
  /** Null when the source layer carries no numeric confidence — never fabricated. */
  readonly confidence: number | null;
  readonly assertedBy: string;
}

// ── Measurement — DECLARED (future adapter: odds/stat rows, e.g.
//    NormalizedOdds / GameSignal — a quantified reading distinct from a
//    Claim, which is an assertion rather than a raw reading) ──

export interface SportsIrMeasurement extends SportsIrClocks {
  readonly id: string;
  readonly entityId: string;
  readonly metric: string;
  readonly value: number;
  readonly unit: string | null;
  readonly source: string;
}

// ── Relation — DECLARED (future adapter: game<->team edges, pick<->game
//    references — currently implicit via foreign keys, not yet projected) ──

export interface SportsIrRelation {
  readonly id: string;
  readonly kind: string;
  readonly fromEntityId: string;
  readonly toEntityId: string;
}

// ── Interaction — DECLARED (future adapter: W005 Intelligence Contracts —
//    a user/agent acting on an entity, e.g. "watchlisted", "queried") ──

export interface SportsIrInteraction extends SportsIrClocks {
  readonly id: string;
  readonly kind: string;
  readonly actorEntityId: string;
  readonly targetEntityId: string;
}

// ── Intervention — DECLARED (future adapter: GateDecision PUBLISH/PASS, a
//    founder-gated flag flip — a deliberate action distinct from a Claim,
//    which only asserts; an Intervention changes what happens next) ──

export interface SportsIrIntervention extends SportsIrClocks {
  readonly id: string;
  readonly kind: string;
  readonly entityId: string;
  readonly actor: string;
  readonly reasonCode: string;
}

// ── Branch — ADAPTED (← Worldline WorldConflict, W007 — an unresolved
//    alternate world, not flattened into a single consensus) ──

export interface SportsIrBranch {
  readonly id: string;
  readonly parentBranchId: string | null;
  readonly label: string;
  readonly createdAt: string;
}

// ── Outcome — ADAPTED (← PickEvidenceEnvelope.settlement Capture, W001) ──

/** A resolved result. Never fabricated: absent settlement means no Outcome exists. */
export interface SportsIrOutcome extends SportsIrClocks {
  readonly id: string;
  readonly entityId: string;
  readonly kind: string;
  readonly settledAt: string;
}

// ── Proof — ADAPTED (← RealityReceipt, W003) ──

export type SportsIrProofAnchor = "NONE" | "PENDING" | "BITCOIN_ATTESTED" | "UNKNOWN";

/** A verifiable artifact backing a Claim or State. `verified`/`anchor` are
 *  honestly null/"UNKNOWN" rather than guessed when the source can't say. */
export interface SportsIrProof {
  readonly id: string;
  readonly subjectEntityId: string;
  readonly digest: string;
  readonly verified: boolean | null;
  readonly anchor: SportsIrProofAnchor;
}

export const SPORTS_IR_SCHEMA_VERSION = "sports-ir/v0" as const;

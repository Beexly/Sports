/**
 * Worldline v0 — bitemporal world-state primitives (kernel: WorldSnapshot /
 * WorldDelta; SportsIR clocks).
 *
 * Two clocks, deliberately distinct:
 *   - `occurredAt`  (VALID time): when the fact was true in the world.
 *   - `observedAt`  (KNOWLEDGE time): when WE first knew it.
 * A late box-score correction has an old `occurredAt` and a new `observedAt` —
 * bitemporality is what lets us honestly answer both "what was true at V?" and
 * "what did we KNOW at K?", which is the difference between a replayable record
 * and hindsight bias. Optional `publishedAt`/`effectiveAt` are carried verbatim
 * for provenance but do not participate in resolution in v0.
 *
 * Pure types. No I/O, no clocks of their own.
 */

/** JSON-safe value for an attribute state (validated by canonicalJson at digest time). */
export type WorldValue = null | boolean | number | string | readonly WorldValue[] | {
  readonly [key: string]: WorldValue;
};

/** One immutable observation: entity.attribute = value, on both clocks. */
export interface WorldObservation {
  /** Unique, stable id — ties delta entries and audit offenders back to evidence. */
  readonly id: string;
  readonly entityId: string;
  readonly attribute: string;
  readonly value: WorldValue;
  /** VALID time — when this was true in the world (ISO-8601 UTC). */
  readonly occurredAt: string;
  /** KNOWLEDGE time — when we first knew it (ISO-8601 UTC). */
  readonly observedAt: string;
  /** Provenance label (source system / feed). Required — no anonymous facts. */
  readonly source: string;
  readonly publishedAt?: string;
  readonly effectiveAt?: string;
}

/** A bitemporal coordinate: the (valid, knowledge) pair a snapshot is taken at. */
export interface WorldCoordinate {
  readonly validTime: string;
  readonly knowledgeTime: string;
}

/** One resolved entity.attribute cell in a snapshot, with its winning evidence. */
export interface WorldStateCell {
  readonly entityId: string;
  readonly attribute: string;
  readonly value: WorldValue;
  /** The observation that won resolution for this cell. */
  readonly observationId: string;
  readonly occurredAt: string;
  readonly observedAt: string;
}

/** An immutable as-of view of the world at one bitemporal coordinate. */
export interface WorldSnapshot {
  readonly at: WorldCoordinate;
  /** Cells sorted by (entityId, attribute) — deterministic iteration order. */
  readonly cells: readonly WorldStateCell[];
  /** SHA-256 over the canonical serialization of `at` + `cells`. */
  readonly digest: string;
}

export type WorldDeltaKind = "ADDED" | "CHANGED" | "REMOVED";

/** One semantic difference between two snapshots, attributed to evidence. */
export interface WorldDeltaEntry {
  readonly kind: WorldDeltaKind;
  readonly entityId: string;
  readonly attribute: string;
  /** null for ADDED. */
  readonly before: WorldValue | null;
  /** null for REMOVED. */
  readonly after: WorldValue | null;
  /** Observation ids explaining the entry (before-winner and/or after-winner). */
  readonly causedBy: readonly string[];
}

export interface WorldDelta {
  readonly from: WorldCoordinate;
  readonly to: WorldCoordinate;
  readonly entries: readonly WorldDeltaEntry[];
}

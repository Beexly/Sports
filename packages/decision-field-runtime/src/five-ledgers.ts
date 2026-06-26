/**
 * THE FIVE CANONICAL LEDGERS — the institution's spine.
 *
 * GSE has many excellent organs; the discipline is to make them READ/WRITE exactly five ledgers, so we
 * never grow another competing authority system. This module defines the five ledger shapes and a pure
 * PROJECTION from a PARALLAX Decision Object (+ its flagship metrics) into them. It is a read-view, not a
 * new source of truth: the Decision Object already IS these five ledgers seen together.
 *
 *   1. Reality   — what happened / is believed physically true
 *   2. Belief    — what each observer believed, and when
 *   3. Decision  — what action was rational at that time, and why
 *   4. Authority — what GSE was permitted to express (the meet + binding layer)
 *   5. Learning  — what happened afterward (credit, refusal value, stat lifecycle)
 *
 * Pure + deterministic. No I/O. Spec: docs/frontier/13_STAT_FOUNDRY.md.
 */

import type { DecisionObject } from "./parallax-instrument.js";
import type { FlagshipMetric } from "./stat-foundry.js";

export interface RealityLedgerEntry {
  readonly asOf: string;
  readonly knownFacts: ReadonlyArray<{ subject: string; kind: string; value: unknown; observedAt: number }>;
}
export interface BeliefLedgerEntry {
  readonly quantity: string;
  readonly beliefs: ReadonlyArray<{ observer: string; point: number; observedAt: number; source: string }>;
  readonly disagreement: number;
}
export interface DecisionLedgerEntry {
  readonly state: string;
  readonly rationale: string;
  readonly boundary: { axis: string; flipsAt: number | null } | null;
  readonly refused: boolean;
}
export interface AuthorityLedgerEntry {
  readonly ceiling: string;
  readonly bindingLayers: readonly string[];
  readonly claimStrength: string;
}
export interface LearningLedgerEntry {
  readonly settlesAtTick: number;
  readonly protocol: string;
  /** Flagship metrics derived from this decision and their earned status (never VALIDATED on fixtures). */
  readonly metrics: ReadonlyArray<{ key: string; status: string; value: number | null; implemented: boolean }>;
}

export interface FiveLedgers {
  readonly reality: RealityLedgerEntry;
  readonly belief: BeliefLedgerEntry;
  readonly decision: DecisionLedgerEntry;
  readonly authority: AuthorityLedgerEntry;
  readonly learning: LearningLedgerEntry;
}

/**
 * Project one Decision Object (+ its metrics) into the five ledgers. Every field is read off the object —
 * no recomputation, no new authority. This is the proof that "one organism, one source of truth" holds:
 * five ledgers, one object.
 */
export function projectToLedgers(obj: DecisionObject, metrics: readonly FlagshipMetric[] = []): FiveLedgers {
  return {
    reality: {
      asOf: obj.atLabel,
      knownFacts: obj.lightCone.map((f) => ({ subject: f.subject, kind: f.kind, value: f.value, observedAt: f.observedAt })),
    },
    belief: {
      quantity: obj.arena[0]?.quantity ?? "—",
      beliefs: obj.arena.map((b) => ({ observer: b.observer, point: b.point, observedAt: b.observedAt, source: b.source })),
      disagreement: obj.disagreement,
    },
    decision: {
      state: obj.state,
      rationale: obj.refusal?.refused ? obj.refusal.why : `read derived from the fork/baseline at ${obj.atLabel}`,
      boundary: obj.boundary ? { axis: obj.boundary.axis, flipsAt: obj.boundary.flipsAt } : null,
      refused: obj.refusal?.refused ?? false,
    },
    authority: {
      ceiling: obj.authority.ceiling,
      bindingLayers: obj.bindingLayers,
      claimStrength: obj.claimStrength,
    },
    learning: {
      settlesAtTick: obj.autopsyHook.settlesAtTick,
      protocol: obj.autopsyHook.protocol,
      metrics: metrics.map((m) => ({ key: m.genome.key, status: m.genome.status, value: m.value, implemented: m.genome.implemented })),
    },
  };
}

/**
 * @sports/epistemic-twin — as-of observation layer.
 *
 * Bitemporal-lite reconstruction on top of the axes.ts composition core:
 * "what did the Twin know at time T?"
 *
 * Two independent timestamps per fact:
 *   - `observedAt`  — valid time: when the fact was true in the world.
 *   - `recordedAt`  — transaction time: when the system learned/stored it.
 *
 * The whole point of carrying both is the transaction-time cut: an
 * observation is invisible as-of T if it was recorded after T, even when the
 * fact it describes was true well before T. This mirrors a real incident
 * timeline (e.g. a health probe backfilled hours late) without ever letting
 * hindsight leak into a reconstruction of "what we knew, when." The
 * `AsOfMode` "evidence" view deliberately relaxes that cut for analysis:
 * "what had actually happened by T, including facts we only learned later."
 *
 * This module does not reinvent composition or decay — it hydrates
 * `CapabilityNode.evidence` from a fold over `TwinObservation[]` and then
 * delegates straight to the existing `composeGraph` from axes.ts, passing
 * `asOf` as `now` so freshness decay is evaluated relative to the
 * reconstruction point, not the real wall clock. No `Date.now()` calls
 * anywhere in this file — `asOf` is always an injected parameter.
 */

import {
  composeGraph,
  type CapabilityEdge,
  type CapabilityNode,
  type ComposedState,
  type OwnEvidence,
} from "./axes.js";

// ---------------------------------------------------------------------------
// TwinObservation — a single bitemporal fact about one capability's evidence.
// ---------------------------------------------------------------------------

export interface TwinObservation {
  readonly capabilityId: string;
  /** Valid time — when the fact described by `evidence` was true. */
  readonly observedAt: Date;
  /** Transaction time — when the system learned/recorded this fact. */
  readonly recordedAt: Date;
  /**
   * The evidence payload. Reuses the EXISTING `OwnEvidence` input shape from
   * axes.ts verbatim — no parallel evidence vocabulary. `evidence.observedAt`
   * (nested) drives per-node freshness decay against `asOf` at compose time;
   * the outer `observedAt`/`recordedAt` on the observation drive the
   * bitemporal fold (which observation wins as-of a given cut). Callers will
   * typically set `evidence.observedAt` equal to the observation's own
   * `observedAt` — that is what produces the intuitive "decay relative to
   * asOf" behavior described below — but the two fields are structurally
   * independent, so this is a convention, not an invariant enforced here.
   */
  readonly evidence: OwnEvidence;
}

// ---------------------------------------------------------------------------
// Validation — recordedAt >= observedAt. You can learn a fact late; you
// cannot record it before it became true.
// ---------------------------------------------------------------------------

export class TwinObservationError extends Error {
  public readonly capabilityId: string;
  public readonly observedAt: Date;
  public readonly recordedAt: Date;

  constructor(observation: Pick<TwinObservation, "capabilityId" | "observedAt" | "recordedAt">) {
    super(
      `epistemic-twin: observation for "${observation.capabilityId}" has recordedAt ` +
        `(${observation.recordedAt.toISOString()}) before observedAt ` +
        `(${observation.observedAt.toISOString()}) — a fact can be recorded late, ` +
        `never before it was true.`,
    );
    this.name = "TwinObservationError";
    this.capabilityId = observation.capabilityId;
    this.observedAt = observation.observedAt;
    this.recordedAt = observation.recordedAt;
  }
}

/** Throws `TwinObservationError` iff `recordedAt < observedAt`. Pure, no clock reads. */
export function assertValidObservation(observation: TwinObservation): void {
  if (observation.recordedAt.getTime() < observation.observedAt.getTime()) {
    throw new TwinObservationError(observation);
  }
}

// ---------------------------------------------------------------------------
// AsOfMode — which timestamp axis (or both) the visibility cut applies to.
// ---------------------------------------------------------------------------

/**
 * - "transaction": visible iff `recordedAt <= asOf` — what the system KNEW by
 *   `asOf`. The honest audit/incident-reconstruction view.
 * - "evidence": visible iff `observedAt <= asOf` — what had actually HAPPENED
 *   by `asOf`, including facts recorded later (hindsight view, for analysis).
 * - "both" (default): `recordedAt <= asOf` AND `observedAt <= asOf` — the
 *   strict bitemporal cut.
 *
 * Note: under the enforced `recordedAt >= observedAt` invariant,
 * `recordedAt <= asOf` already implies `observedAt <= asOf`, so "both" and
 * "transaction" select identical sets for valid input. "both" stays the
 * default because its meaning would NOT silently change if that validation
 * invariant were ever relaxed — it states the full cut explicitly.
 */
export type AsOfMode = "evidence" | "transaction" | "both";

function isVisibleAsOf(observation: TwinObservation, asOfMs: number, mode: AsOfMode): boolean {
  const observedOk = observation.observedAt.getTime() <= asOfMs;
  const recordedOk = observation.recordedAt.getTime() <= asOfMs;
  if (mode === "evidence") {
    return observedOk;
  }
  if (mode === "transaction") {
    return recordedOk;
  }
  return observedOk && recordedOk;
}

// ---------------------------------------------------------------------------
// foldObservationsAsOf — the bitemporal cut + deterministic winner selection.
// ---------------------------------------------------------------------------

/**
 * True iff `candidate` should replace `current` as the winning observation
 * for a capability. Ordering: latest `observedAt` wins (most-recent-EVIDENCE
 * wins, not last-write-wins: a probe observed at 10:00 / recorded at 10:05
 * beats a probe observed at 9:00 / recorded at 10:10 — a late-arriving
 * backfill of OLD evidence must never override newer evidence). Ties on
 * `observedAt` are broken by latest `recordedAt` (a late-recorded correction
 * about the SAME observation instant wins). Full ties resolve to the later
 * element in input order (append-order semantics: for an append-only log,
 * later append = more recent record) — deterministic, with no dependence on
 * Map/object iteration order.
 */
function isBetterObservation(candidate: TwinObservation, current: TwinObservation): boolean {
  const observedDelta = candidate.observedAt.getTime() - current.observedAt.getTime();
  if (observedDelta !== 0) {
    return observedDelta > 0;
  }
  const recordedDelta = candidate.recordedAt.getTime() - current.recordedAt.getTime();
  if (recordedDelta !== 0) {
    return recordedDelta > 0;
  }
  return true; // full tie: later element in input order wins
}

/**
 * Per capability, selects the winning observation among those visible at the
 * `asOf` cut under `mode` (default "both"; see `AsOfMode`). Observations
 * recorded after `asOf` are invisible in "transaction"/"both" even if their
 * `observedAt` is earlier than `asOf` — that invisibility is the entire point
 * of carrying two timestamps. Returns the winning evidence per capability,
 * ready to hydrate a composition run.
 *
 * Validates every observation (throws `TwinObservationError` on the first
 * invalid one encountered, in input order) before folding — invalid input is
 * rejected outright rather than silently filtered.
 *
 * Pure and deterministic: same `observations`/`asOf`/`mode` always produce a
 * deep-equal result. No `Date.now()` calls.
 */
export function foldObservationsAsOf(
  observations: readonly TwinObservation[],
  asOf: Date,
  mode: AsOfMode = "both",
): ReadonlyMap<string, OwnEvidence> {
  for (const observation of observations) {
    assertValidObservation(observation);
  }

  const asOfMs = asOf.getTime();
  const winners = new Map<string, TwinObservation>();
  for (const observation of observations) {
    if (!isVisibleAsOf(observation, asOfMs, mode)) {
      continue; // invisible as-of this cut
    }
    const current = winners.get(observation.capabilityId);
    if (!current || isBetterObservation(observation, current)) {
      winners.set(observation.capabilityId, observation);
    }
  }

  const evidenceByCapability = new Map<string, OwnEvidence>();
  for (const [capabilityId, observation] of winners) {
    evidenceByCapability.set(capabilityId, observation.evidence);
  }
  return evidenceByCapability;
}

// ---------------------------------------------------------------------------
// CapabilityTemplate — a node's static shape, WITHOUT evidence. The registry
// entry minus the part the observation log supplies.
// ---------------------------------------------------------------------------

export interface CapabilityTemplate {
  readonly id: string;
  readonly label?: string;
  readonly deps: readonly CapabilityEdge[];
  /**
   * Horizon stamped onto the synthetic no-observation evidence for this
   * capability. Currently inert under decay semantics (`observedAt: null`
   * composes unknown regardless of horizon) — retained for API fidelity with
   * the frozen founder spec and forward compatibility should the
   * no-observation fallback ever carry real evidence.
   */
  readonly defaultFreshnessHorizonMs?: number;
}

/**
 * Projects full registry nodes (e.g. `buildSeedRegistry(...)`) down to
 * templates: id, label, deps, and the node's own freshness horizon as the
 * template default. Does NOT duplicate the seed list — pass the existing
 * registry in; its evidence is discarded here by construction.
 */
export function templatesFromSeed(seedNodes: readonly CapabilityNode[]): CapabilityTemplate[] {
  return seedNodes.map((node) => ({
    id: node.id,
    ...(node.label !== undefined ? { label: node.label } : {}),
    deps: node.deps,
    defaultFreshnessHorizonMs: node.evidence.freshnessHorizonMs,
  }));
}

/**
 * Synthetic evidence for a capability with zero visible observations as-of
 * the reconstruction point. `observedAt: null` routes straight through
 * `decayEvidence`'s existing "never observed" branch (which is exactly
 * correct here — from the as-of vantage point, this capability was never
 * observed), and the `no_observation_as_of:<id>` reason distinguishes "no
 * coverage as-of T" from a node that really did go stale/expire.
 */
function noObservationEvidence(template: CapabilityTemplate): OwnEvidence {
  return {
    observedAt: null,
    freshnessHorizonMs: template.defaultFreshnessHorizonMs ?? 0,
    intent: "open",
    severityTags: [],
    unavailable: false,
    reasons: [`no_observation_as_of:${template.id}`],
  };
}

/**
 * Folds `observations` down to one winning `OwnEvidence` per capability at
 * the `asOf`/`mode` cut, then materializes full `CapabilityNode`s from the
 * templates: each template's evidence is the fold winner, or the synthetic
 * no-observation evidence (composes unknown — absence of coverage is not
 * green) when nothing is visible. Pure; no clock reads.
 */
export function materializeNodesAsOf(
  templates: readonly CapabilityTemplate[],
  observations: readonly TwinObservation[],
  asOf: Date,
  mode: AsOfMode = "both",
): CapabilityNode[] {
  const evidenceByCapability = foldObservationsAsOf(observations, asOf, mode);
  return templates.map((template) => ({
    id: template.id,
    ...(template.label !== undefined ? { label: template.label } : {}),
    deps: template.deps,
    evidence: evidenceByCapability.get(template.id) ?? noObservationEvidence(template),
  }));
}

// ---------------------------------------------------------------------------
// composeGraphAsOf — fold, materialize, delegate to the existing composeGraph.
// ---------------------------------------------------------------------------

/**
 * Reconstructs the composed graph as it would have appeared as-of `asOf`:
 * materialize nodes from `templates` + the observation fold (see
 * `materializeNodesAsOf`), then run the EXISTING `composeGraph` with
 * `now = asOf`. Freshness decay is therefore evaluated relative to `asOf`,
 * not the real wall clock: evidence observed long before `asOf` decays to
 * unknown exactly as it would have at that point in time.
 *
 * `templates` supplies the static shape of the graph. Full `CapabilityNode`s
 * are structurally accepted here too — their `.evidence` is ignored by
 * construction (only id/label/deps are read). Pure: no `Date.now()` calls
 * anywhere in the call chain.
 */
export function composeGraphAsOf(
  templates: readonly CapabilityTemplate[],
  observations: readonly TwinObservation[],
  asOf: Date,
  mode: AsOfMode = "both",
): Map<string, ComposedState> {
  return composeGraph(materializeNodesAsOf(templates, observations, asOf, mode), asOf);
}

/**
 * WorldlineStore — the append-only bitemporal store with the no-lookahead audit.
 *
 * Resolution rule (standard bitemporal, deliberately simple in v0): a snapshot
 * at coordinate (V, K) resolves each (entity, attribute) to the observation with
 *   occurredAt <= V  AND  observedAt <= K,
 * choosing the winner by latest occurredAt, then latest observedAt (a correction
 * about the same occurrence wins once known), then id (total order — determinism
 * even under pathological duplicate clocks).
 *
 * THE INVARIANT — no lookahead, fail-loud: every served snapshot records its
 * coordinate, digest, AND the store's observation count at serve time. Because
 * ingest is append-only, that count makes the originally-served view exactly
 * recomputable forever. `auditReplayStability()` re-resolves each recorded read
 * against current contents and, on divergence, diffs the original winners
 * against the current winners per cell — naming EXACTLY the observations that
 * changed an outcome (verifier finding 2026-07-17: a membership heuristic here
 * once named innocent observations; exact attribution is the contract).
 *
 * Cell keys are JSON-escaped compound keys (see `cellKey`) so an entityId or
 * attribute containing any delimiter character can never collide.
 *
 * Pure and deterministic: no wall clock, no I/O; all times are caller-supplied
 * ISO strings. Ingest validates and freezes; snapshots are deep-frozen.
 */

import { canonicalJson } from "@/lib/intelligence-playback/canonical-json";
import { snapshotDigest } from "./digest";
import type {
  WorldConflict,
  WorldCoordinate,
  WorldObservation,
  WorldSnapshot,
  WorldStateCell,
} from "./types";

export class WorldlineIngestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorldlineIngestError";
  }
}

export class WorldlineReplayError extends Error {
  constructor(
    message: string,
    readonly offenders: readonly { observationId: string; servedAt: WorldCoordinate }[],
  ) {
    super(message);
    this.name = "WorldlineReplayError";
  }
}

interface ServedRead {
  readonly at: WorldCoordinate;
  readonly digest: string;
  /** Store size when served — with append-only ingest, this exactly identifies
   *  the observation set the read was resolved over. */
  readonly observationCount: number;
}

/** Collision-proof compound key for one (entity, attribute) cell. */
function cellKey(entityId: string, attribute: string): string {
  return `${JSON.stringify(entityId)}:${JSON.stringify(attribute)}`;
}

function isoOrThrow(label: string, value: string): number {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) throw new WorldlineIngestError(`${label} is not a parseable ISO timestamp: ${value}`);
  return t;
}

/** Winner ordering: latest occurredAt, then latest observedAt, then id. */
function beats(a: WorldObservation, b: WorldObservation): boolean {
  const ao = Date.parse(a.occurredAt);
  const bo = Date.parse(b.occurredAt);
  if (ao !== bo) return ao > bo;
  const ak = Date.parse(a.observedAt);
  const bk = Date.parse(b.observedAt);
  if (ak !== bk) return ak > bk;
  return a.id > b.id;
}

/** True iff neither observation's (occurredAt, observedAt) pair strictly
 *  beats the other's — tied once the id tiebreak (determinism only, not an
 *  epistemic judgment) is set aside. W007's conflict-detection predicate. */
function tiedIgnoringId(a: WorldObservation, b: WorldObservation): boolean {
  if (Date.parse(a.occurredAt) !== Date.parse(b.occurredAt)) return false;
  return Date.parse(a.observedAt) === Date.parse(b.observedAt);
}

export class WorldlineStore {
  private readonly observations: WorldObservation[] = [];
  private readonly ids = new Set<string>();
  private readonly served: ServedRead[] = [];

  /** Append one observation. Immutable once in; duplicate ids rejected. */
  ingest(obs: WorldObservation): void {
    if (!obs.id) throw new WorldlineIngestError("observation id is required");
    if (this.ids.has(obs.id)) throw new WorldlineIngestError(`duplicate observation id: ${obs.id}`);
    if (!obs.entityId || !obs.attribute) throw new WorldlineIngestError("entityId and attribute are required");
    if (!obs.source) throw new WorldlineIngestError("source is required — no anonymous facts");
    isoOrThrow("occurredAt", obs.occurredAt);
    isoOrThrow("observedAt", obs.observedAt);
    // observedAt < occurredAt is legal: a forecast is knowledge about a future
    // occurrence. Both clocks only need to parse; resolution handles every
    // ordering honestly.
    this.ids.add(obs.id);
    this.observations.push(Object.freeze({ ...obs }));
  }

  /** Number of observations held (denominator for honest reporting). */
  size(): number {
    return this.observations.length;
  }

  /** Resolve the world as of (validTime, knowledgeTime). Records the read. */
  snapshotAt(at: WorldCoordinate): WorldSnapshot {
    const snap = this.resolve(at);
    this.served.push({ at: snap.at, digest: snap.digest, observationCount: this.observations.length });
    return snap;
  }

  /** Pure resolution without recording — used by the audit and delta engine. */
  resolve(at: WorldCoordinate): WorldSnapshot {
    return this.resolveOver(at, this.observations.length);
  }

  /** Resolution over the first `count` ingested observations (append-only ⇒
   *  this reconstructs any historical view exactly). */
  private resolveOver(at: WorldCoordinate, count: number): WorldSnapshot {
    const winners = this.winnersOver(at, count);
    const cells: WorldStateCell[] = [...winners.values()]
      .map((o) => ({
        entityId: o.entityId,
        attribute: o.attribute,
        value: o.value,
        observationId: o.id,
        occurredAt: o.occurredAt,
        observedAt: o.observedAt,
      }))
      .sort((a, b) =>
        a.entityId === b.entityId
          ? a.attribute < b.attribute ? -1 : a.attribute > b.attribute ? 1 : 0
          : a.entityId < b.entityId ? -1 : 1,
      );
    const frozenCells = Object.freeze(cells.map((c) => Object.freeze(c)));
    const coordinate = Object.freeze({ validTime: at.validTime, knowledgeTime: at.knowledgeTime });
    return Object.freeze({
      at: coordinate,
      cells: frozenCells,
      digest: snapshotDigest(coordinate, frozenCells),
    });
  }

  /** Per-cell winning observations over the first `count` observations. */
  private winnersOver(at: WorldCoordinate, count: number): Map<string, WorldObservation> {
    const v = isoOrThrow("validTime", at.validTime);
    const k = isoOrThrow("knowledgeTime", at.knowledgeTime);
    const winners = new Map<string, WorldObservation>();
    for (let i = 0; i < count; i += 1) {
      const obs = this.observations[i]!;
      if (Date.parse(obs.occurredAt) > v) continue;
      if (Date.parse(obs.observedAt) > k) continue; // the no-lookahead line
      const key = cellKey(obs.entityId, obs.attribute);
      const cur = winners.get(key);
      if (!cur || beats(obs, cur)) winners.set(key, obs);
    }
    return winners;
  }

  /**
   * Detect genuine, unresolved disagreements the single-winner snapshot view
   * (`snapshotAt`/`resolve`) silently flattens (W007): cells where 2+
   * observations are tied for the winning position once the deterministic
   * `id` tiebreak is set aside, AND carry different values. Same no-lookahead
   * eligibility filter as normal resolution. Read-only — never mutates the
   * store, never affects `resolveOver`'s own resolution, which stays exactly
   * as before this method existed.
   */
  detectConflicts(at: WorldCoordinate): WorldConflict[] {
    return this.detectConflictsOver(at, this.observations.length);
  }

  private detectConflictsOver(at: WorldCoordinate, count: number): WorldConflict[] {
    const v = isoOrThrow("validTime", at.validTime);
    const k = isoOrThrow("knowledgeTime", at.knowledgeTime);
    const byCell = new Map<string, WorldObservation[]>();
    for (let i = 0; i < count; i += 1) {
      const obs = this.observations[i]!;
      if (Date.parse(obs.occurredAt) > v) continue;
      if (Date.parse(obs.observedAt) > k) continue; // the no-lookahead line
      const key = cellKey(obs.entityId, obs.attribute);
      const list = byCell.get(key);
      if (list) list.push(obs);
      else byCell.set(key, [obs]);
    }

    const conflicts: WorldConflict[] = [];
    for (const list of byCell.values()) {
      // Single linear pass: `top` accumulates observations tied with the
      // best-known-so-far tier; a strictly later observation resets it. By
      // the end, `top` is exactly the set tied for the true winning position,
      // regardless of ingestion order (each reset only moves to a strictly
      // temporally later observation, so the final top[0] is the global best).
      let top: WorldObservation[] = [list[0]!];
      for (let i = 1; i < list.length; i += 1) {
        const obs = list[i]!;
        if (tiedIgnoringId(obs, top[0]!)) top.push(obs);
        else if (beats(obs, top[0]!)) top = [obs];
      }
      if (top.length < 2) continue;
      const distinctValues = new Set(top.map((o) => canonicalJson(o.value)));
      if (distinctValues.size < 2) continue; // agreement, not a conflict
      conflicts.push({
        entityId: top[0]!.entityId,
        attribute: top[0]!.attribute,
        candidates: Object.freeze([...top].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))),
      });
    }

    return conflicts.sort((a, b) =>
      a.entityId === b.entityId
        ? a.attribute < b.attribute ? -1 : a.attribute > b.attribute ? 1 : 0
        : a.entityId < b.entityId ? -1 : 1,
    );
  }

  /**
   * Fail-loud replay audit: throws if the store's current contents would change
   * ANY previously served snapshot. Attribution is EXACT: for each divergent
   * read, the original winners (recomputable from the recorded observation
   * count — ingest is append-only) are diffed against the current winners per
   * cell, and only observations that actually changed an outcome are named.
   */
  auditReplayStability(): void {
    const offenders: { observationId: string; servedAt: WorldCoordinate }[] = [];
    for (const read of this.served) {
      const now = this.resolve(read.at);
      if (now.digest === read.digest) continue;
      const original = this.winnersOver(read.at, read.observationCount);
      const current = this.winnersOver(read.at, this.observations.length);
      for (const [key, winner] of current) {
        const before = original.get(key);
        if (!before || before.id !== winner.id) {
          offenders.push({ observationId: winner.id, servedAt: read.at });
        }
      }
      // Removal is structurally impossible (append-only, monotone candidate
      // pool), so current ⊇ original keys; no REMOVED case exists to attribute.
    }
    if (offenders.length > 0) {
      throw new WorldlineReplayError(
        `Replay contamination: ${offenders.length} observation(s) back-dated knowledge under already-served snapshots. ` +
          "A served replay must never silently change — consumers must be told.",
        offenders,
      );
    }
  }
}

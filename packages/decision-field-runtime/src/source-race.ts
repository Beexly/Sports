/**
 * DECISION FIELD RUNTIME — Source Race.
 *
 * Who saw the important change FIRST, who lagged, who never moved. This is a view over data that
 * already exists: `TemporalFact` carries `firstSeenByGseAt`, `observedAt`, `endpointId`, `confidence`,
 * `rightsStatus`. The winner is the observer who first made the fact knowable to GSE; laggards are
 * ranked by their delay. When sources disagree, `classifyConflict` decides whether the disagreement
 * is a contradiction SIGNAL (e.g. fantasy lag) rather than noise. Pure + deterministic.
 */

import {
  type TemporalFact,
  type FactType,
  type LegalVerdict,
  classifyConflict,
  factClassOf,
} from "@sports/data-intelligence";

export interface SourceRaceEntry {
  readonly sourceId: string;
  readonly endpointId: string;
  readonly firstSeenAt: string;
  readonly latencyMs: number; // delay behind the winner
  readonly value: unknown;
  readonly confidence: number;
  readonly rightsStatus: LegalVerdict;
}

export interface SourceRace {
  readonly factType: FactType;
  readonly entityId: string;
  readonly realityObservedAt: string;
  readonly sources: readonly SourceRaceEntry[];
  readonly winner: string | null;
  readonly laggards: readonly string[];
  /** True when the disagreement is a usable contradiction signal (e.g. fantasy-platform lag). */
  readonly contradictionSignal: boolean;
  readonly note: string;
}

const ms = (iso: string): number => Date.parse(iso);

/** Group facts by (factType, entity) and race their observers by first-knowable time. */
export function buildSourceRaces(facts: readonly TemporalFact[]): SourceRace[] {
  const groups = new Map<string, TemporalFact[]>();
  for (const f of facts) {
    const entity = f.entityIds[0]?.id ?? "_";
    const key = `${f.factType}__${entity}`;
    const arr = groups.get(key);
    if (arr) arr.push(f);
    else groups.set(key, [f]);
  }

  const races: SourceRace[] = [];
  for (const [key, group] of groups) {
    if (group.length < 2) continue; // a race needs ≥2 observers
    const sep = key.indexOf("__");
    const factType = key.slice(0, sep) as FactType;
    const entityId = key.slice(sep + 2);

    const sorted = [...group].sort((a, b) => ms(a.firstSeenByGseAt) - ms(b.firstSeenByGseAt));
    const winnerFact = sorted[0]!;
    const winnerT = ms(winnerFact.firstSeenByGseAt);
    const sources: SourceRaceEntry[] = sorted.map((f) => ({
      sourceId: f.sourceId,
      endpointId: f.endpointId,
      firstSeenAt: f.firstSeenByGseAt,
      latencyMs: Math.max(0, ms(f.firstSeenByGseAt) - winnerT),
      value: f.value,
      confidence: f.confidence,
      rightsStatus: f.rightsStatus,
    }));
    const realityObservedAt = sorted
      .map((f) => f.observedAt)
      .sort((a, b) => ms(a) - ms(b))[0]!;

    races.push({
      factType,
      entityId,
      realityObservedAt,
      sources,
      winner: winnerFact.sourceId,
      laggards: sources.slice(1).map((s) => s.sourceId),
      contradictionSignal: false,
      note: `${sources.length} observers raced; ${winnerFact.sourceId} first, ${sources.length - 1} behind.`,
    });
  }
  return races;
}

/**
 * Cross-class contradiction detection: when a fantasy-market belief and a football-reality fact about
 * the same entity disagree, `classifyConflict` flags it as a SIGNAL (lag), not noise. Returns the
 * entity ids that carry a live contradiction signal.
 */
export function detectContradictionSignals(facts: readonly TemporalFact[]): {
  readonly entityId: string;
  readonly conflictClass: string;
  readonly verdict: string;
  readonly note: string;
}[] {
  const byEntity = new Map<string, TemporalFact[]>();
  for (const f of facts) {
    const entity = f.entityIds[0]?.id ?? "_";
    const arr = byEntity.get(entity);
    if (arr) arr.push(f);
    else byEntity.set(entity, [f]);
  }
  const out: { entityId: string; conflictClass: string; verdict: string; note: string }[] = [];
  for (const [entityId, group] of byEntity) {
    const fantasy = group.find((f) => factClassOf(f.factType) === "fantasy_market");
    const reality = group.find((f) => factClassOf(f.factType) === "football_reality");
    if (!fantasy || !reality) continue;
    const res = classifyConflict({
      a: { sourceId: fantasy.sourceId, factType: fantasy.factType, observedAt: fantasy.observedAt, reliability: fantasy.confidence, gseEntityId: entityId },
      b: { sourceId: reality.sourceId, factType: reality.factType, observedAt: reality.observedAt, reliability: reality.confidence, gseEntityId: entityId },
    });
    if (res.verdict === "USE_AS_CONTRADICTION_SIGNAL") {
      out.push({ entityId, conflictClass: res.conflictClass, verdict: res.verdict, note: res.note });
    }
  }
  return out;
}

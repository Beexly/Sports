/**
 * DECISION FIELD RUNTIME — Meta-Intelligence Snapshot (per-cycle).
 *
 * The per-frame telemetry the organism-level Conscience consumes. This is the CYCLE-LOCAL record
 * (compression, detection timing, source-race outcome, scar suppressions, missed/over observations).
 * The cross-cycle "are we getting smarter?" judgement — under BH-FDR + cross-night confirmation — is
 * the Intelligence Ledger (Phase 1D), which aggregates these snapshots. Pure + deterministic.
 */

import type { SourceRace } from "./source-race.js";
import type { MissedObservation } from "./missed-observation.js";
import type { OverObservation } from "./over-observation.js";

export interface MetaIntelligenceSnapshot {
  readonly frameId: string;
  readonly factsIngested: number;
  readonly pointInTimeFacts: number;
  readonly futureLeakedDropped: number;
  readonly rightsBlockedDropped: number;
  readonly cardsEmitted: number;
  readonly cardsSuppressed: number;
  /** Fact-to-decision compression: useful cards ÷ facts ingested. */
  readonly factToDecisionCompression: number;
  /** The winner's time advantage over the slowest observer across all races (ms). */
  readonly detectionTimeAdvantageMs: number;
  readonly sourceRaceCount: number;
  readonly scarSuppressions: number;
  readonly missedObservationCount: number;
  readonly overObservationCount: number;
  readonly note: string;
}

export interface MetaSnapshotInputs {
  readonly frameId: string;
  readonly factsIngested: number;
  readonly pointInTimeFacts: number;
  readonly futureLeakedDropped: number;
  readonly rightsBlockedDropped: number;
  readonly cardsEmitted: number;
  readonly cardsSuppressed: number;
  readonly sourceRaces: readonly SourceRace[];
  readonly scarSuppressions: number;
  readonly missedObservations: readonly MissedObservation[];
  readonly overObservations: readonly OverObservation[];
}

export function buildMetaSnapshot(i: MetaSnapshotInputs): MetaIntelligenceSnapshot {
  const compression = i.factsIngested > 0 ? Number((i.cardsEmitted / i.factsIngested).toFixed(4)) : 0;
  const detectionTimeAdvantageMs = i.sourceRaces.reduce((max, race) => {
    const worst = race.sources.reduce((m, s) => Math.max(m, s.latencyMs), 0);
    return Math.max(max, worst);
  }, 0);
  return {
    frameId: i.frameId,
    factsIngested: i.factsIngested,
    pointInTimeFacts: i.pointInTimeFacts,
    futureLeakedDropped: i.futureLeakedDropped,
    rightsBlockedDropped: i.rightsBlockedDropped,
    cardsEmitted: i.cardsEmitted,
    cardsSuppressed: i.cardsSuppressed,
    factToDecisionCompression: compression,
    detectionTimeAdvantageMs,
    sourceRaceCount: i.sourceRaces.length,
    scarSuppressions: i.scarSuppressions,
    missedObservationCount: i.missedObservations.length,
    overObservationCount: i.overObservations.length,
    note: `${i.factsIngested} facts → ${i.cardsEmitted} card(s) (${i.cardsSuppressed} suppressed); compression ${compression}.`,
  };
}

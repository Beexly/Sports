/**
 * Every document in the corpus is a signal the engine speaks for.
 *
 * A copy of a method is not a second confirmation. Family collapse casts
 * one vote per family. The row list still contains every document. An
 * absent observation does not vote. This module does not publish a pick
 * and does not read a database.
 */
import { composeLedger, type LedgerSignalRow } from "./signal-ledger.js";
import type { CompositeScore } from "./composite-score.js";
import { SIGNAL_WEIGHT_FLOOR } from "./frontier-signal-catalog.js";

export interface CorpusSignal {
  readonly key: string;
  readonly family: string;
  readonly source: string;
  readonly path: string;
}

export interface CorpusObservation {
  readonly key: string;
  readonly value: number;
  readonly capturedAt: string;
  readonly confidence?: number;
}

export interface CorpusLedger {
  readonly rows: readonly LedgerSignalRow[];
  readonly votingRows: readonly LedgerSignalRow[];
  readonly score: CompositeScore;
  readonly families: number;
  readonly sources: number;
  readonly observed: number;
}

export function corpusRows(
  signals: readonly CorpusSignal[],
  observations: readonly CorpusObservation[],
  now: string,
): LedgerSignalRow[] {
  const byKey = new Map(observations.map((obs) => [obs.key, obs]));
  return signals.map((signal) => {
    const obs = byKey.get(signal.key);
    if (!obs || !Number.isFinite(obs.value)) {
      return {
        key: signal.key,
        value: 0,
        weight: SIGNAL_WEIGHT_FLOOR,
        confidence: 0,
        capturedAt: now,
      };
    }
    return {
      key: signal.key,
      value: obs.value,
      weight: SIGNAL_WEIGHT_FLOOR,
      confidence: obs.confidence ?? 1,
      capturedAt: obs.capturedAt,
    };
  });
}

/** One computed family reading is applied to every document in that family. */
export function broadcastFamily(
  signals: readonly CorpusSignal[],
  family: string,
  value: number,
  capturedAt: string,
): CorpusObservation[] {
  return signals
    .filter((signal) => signal.family === family)
    .map((signal) => ({ key: signal.key, value, capturedAt }));
}

export function collapseCorpusFamilies(
  signals: readonly CorpusSignal[],
  rows: readonly LedgerSignalRow[],
): LedgerSignalRow[] {
  const familyOf = new Map(signals.map((signal) => [signal.key, signal.family]));
  const winner = new Map<string, LedgerSignalRow>();
  for (const row of rows) {
    const family = familyOf.get(row.key) ?? row.key;
    const prev = winner.get(family);
    const score = Math.abs(row.value) * (row.confidence ?? 1);
    const prevScore = prev ? Math.abs(prev.value) * (prev.confidence ?? 1) : -1;
    if (!prev || score > prevScore) winner.set(family, row);
  }
  return [...winner.values()];
}

export function composeCorpusLedger(
  signals: readonly CorpusSignal[],
  observations: readonly CorpusObservation[],
  now: string,
): CorpusLedger {
  const rows = corpusRows(signals, observations, now);
  const votingRows = collapseCorpusFamilies(signals, rows).filter(
    (row) => (row.confidence ?? 0) > 0 && row.value !== 0,
  );
  const score = composeLedger(votingRows, { now });
  const families = new Set(signals.map((signal) => signal.family)).size;
  const sources = new Set(signals.map((signal) => signal.source)).size;
  const observed = rows.filter((row) => (row.confidence ?? 0) > 0).length;
  return { rows, votingRows, score, families, sources, observed };
}

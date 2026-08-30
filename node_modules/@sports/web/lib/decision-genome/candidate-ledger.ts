/**
 * CandidateDenominatorLedger — track every candidate, not just the published ones.
 *
 * Decision Genome build step D. Survivorship bias is the original sin of pick services:
 * show the winners, hide the graveyard. This ledger records EVERY candidate the system
 * generated and what happened to it — rejected, suppressed, passed, or published — so the
 * denominator is always visible. A published-only record is not a track record.
 *
 * Pure, in-memory, append-only semantics. Persistence is an additive concern layered on
 * top; this is the domain primitive and its honest summary math.
 */

import type { ApertureState } from "./aperture";

export type CandidateDisposition = "generated" | "rejected" | "suppressed" | "passed" | "published";

export interface CandidateRecord {
  readonly id: string;
  /** The decision/genome this candidate became (or would have become). */
  readonly genomeId: string;
  readonly disposition: CandidateDisposition;
  /** The aperture verdict that drove the disposition. */
  readonly aperture: ApertureState;
  /** Why it was rejected/suppressed/passed (empty for published). */
  readonly reason: string;
  readonly recordedAt: number;
}

export interface DenominatorSummary {
  readonly total: number;
  readonly byDisposition: Readonly<Record<CandidateDisposition, number>>;
  readonly byAperture: Readonly<Record<ApertureState, number>>;
  /** Published / total — the honest publish rate. */
  readonly publishRate: number;
  /** (passed + suppressed) / total — how much restraint the system exercised. */
  readonly restraintRate: number;
  /** Most common suppression/rejection reasons, descending. */
  readonly topSuppressionReasons: readonly { readonly reason: string; readonly count: number }[];
}

const DISPOSITIONS: readonly CandidateDisposition[] = [
  "generated",
  "rejected",
  "suppressed",
  "passed",
  "published",
];
const APERTURE_STATES: readonly ApertureState[] = ["signal", "shadow", "wait", "pass", "quarantine"];

/** Append-only ledger of candidate dispositions. */
export class CandidateLedger {
  private readonly records: CandidateRecord[] = [];

  record(entry: Omit<CandidateRecord, "recordedAt"> & { recordedAt?: number }): CandidateRecord {
    const full: CandidateRecord = { ...entry, recordedAt: entry.recordedAt ?? 0 };
    this.records.push(full);
    return full;
  }

  all(): readonly CandidateRecord[] {
    return this.records;
  }

  summary(): DenominatorSummary {
    const byDisposition = emptyCount(DISPOSITIONS);
    const byAperture = emptyCount(APERTURE_STATES);
    const reasonCounts = new Map<string, number>();

    for (const r of this.records) {
      byDisposition[r.disposition] += 1;
      byAperture[r.aperture] += 1;
      if (r.disposition === "rejected" || r.disposition === "suppressed" || r.disposition === "passed") {
        const reason = r.reason.trim() || "(unspecified)";
        reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
      }
    }

    const total = this.records.length;
    const published = byDisposition.published;
    const restrained = byDisposition.passed + byDisposition.suppressed;
    const topSuppressionReasons = [...reasonCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total,
      byDisposition,
      byAperture,
      publishRate: total === 0 ? 0 : published / total,
      restraintRate: total === 0 ? 0 : restrained / total,
      topSuppressionReasons,
    };
  }
}

function emptyCount<K extends string>(keys: readonly K[]): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const k of keys) out[k] = 0;
  return out;
}

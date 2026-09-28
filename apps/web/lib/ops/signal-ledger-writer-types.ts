/**
 * Types for signal-ledger-writer. Kept separate so the writer stays free of a
 * Prisma import, which is what lets its projection be unit-tested with no
 * database and no DATABASE_URL (the stub client returns empty results and the
 * test would otherwise assert nothing).
 */

/** One measured row destined for `signals`, projected from a source table. */
export interface SignalWriteCandidate {
  readonly entityType: "player" | "team";
  readonly entityId: string;
  readonly key: string;
  readonly category: string;
  /** Normalized directional reading. For this writer it is the source column. */
  readonly value: number;
  /** The source reading, retained so a normalized value is never the record. */
  readonly valueRaw: number | null;
  readonly weight: number;
  readonly confidence: number;
  readonly capturedAt: Date;
  readonly season: number;
  readonly week: number;
  readonly sourceId: string;
  /**
   * The schema requires this on every signal (`rightsSnapshot Json`). Named for
   * the source dataset so a row's provenance survives the row.
   */
  readonly rightsSnapshot: Record<string, unknown>;
}

/** The subset of the Prisma client the writer needs. Injected, never imported. */
export interface SignalWriterDb {
  signal: {
    upsert(args: unknown): Promise<unknown>;
  };
}

export interface SignalWriteReport {
  /** Candidates offered. */
  readonly candidates: number;
  // The three counters and the error list are MUTATED while the write runs and
  // only then handed back. They are the reason a partial write is visible
  // instead of silent, so they cannot be the frozen half of this type.
  written: number;
  /** Rows that failed. Non-zero is a visible fault, never a silent truncation. */
  skipped: number;
  batches: number;
  errors: string[];
}

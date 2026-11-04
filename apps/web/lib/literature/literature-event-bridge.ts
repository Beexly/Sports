/**
 * @file literature-event-bridge.ts
 * Event-driven literature retrieval wired into the signal write path.
 *
 * WHY THIS EXISTS
 * The GSE literature corpus (5,148 MIND records + 285 model premises) was
 * read once per request from a hardcoded path on one developer's machine
 * (packages/prediction-engine/src/reasoning/corpus-evaluator.ts:835-850) and
 * its output never reached a published probability. This module is the seam
 * that makes the literature CONTINUOUS: every signal that lands in `signals`
 * becomes a retrieval event, and the premises it surfaces are recorded so
 * that settlement can later score them.
 *
 * WHERE IT HOOKS
 * apps/web/lib/ops/signal-ledger-writer.ts `writeSignalCandidates` is the
 * single writer for the `signals` table (its only production caller is
 * apps/web/app/api/cron/signal-ledger-write/route.ts). This bridge is called
 * from there, after the writes land.
 *
 * CONTRACT
 *   - FAIL OPEN on the WRITE path: a literature failure must never block a
 *     signal write. Retrieval failures are counted, not thrown.
 *   - The bridge writes only to the `lit` schema.
 *   - Nothing here changes a published probability. That is a separate,
 *     explicitly-promoted step (see literature-retrieval.ts promote... and
 *     the ranking-prob.ts corpusWeight seam).
 */

import {
  retrieveForEvent,
  makeEventKey,
  type LiteratureEvent,
  type RetrievalOutcome,
  type SqlClient,
} from "@sports/prediction-engine";
import { openRouterEmbedder, type Embedder } from "@sports/prediction-engine";

/** A Prisma-like client that can run raw SQL. */
export interface RawSqlClient {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
}

/** The `signals` row shape this bridge needs. */
export interface LedgerSignalRow {
  readonly key: string;
  readonly entityId: string;
  readonly entityType: string;
  readonly value: number;
  readonly category?: string | null;
  readonly season?: number | null;
  readonly week?: number | null;
  readonly capturedAt?: Date | string | null;
}

export interface BridgeOptions {
  readonly db: RawSqlClient;
  readonly embedder?: Embedder;
  /** Signals per event batch. */
  readonly batchSize?: number;
  /** Max signals to process in one bridge call (a run may be resumed). */
  readonly limit?: number;
  /** Top-k per event. */
  readonly topK?: number;
  /** Minimum similarity for a premise to be activated. */
  readonly minSimilarity?: number;
  /** Deadline. Past it, the bridge stops (the next run resumes). */
  readonly deadline?: Date;
  readonly onProgress?: (done: number, total: number) => void;
}

export interface BridgeReport {
  readonly signals_seen: number;
  readonly events_attempted: number;
  readonly events_succeeded: number;
  readonly events_refused: number;
  readonly activations_written: number;
  readonly errors: readonly string[];
}

/**
 * Map a signal row to a literature event.
 *
 * The entityId is the team (or player). For team-level signals the game is
 * not known here, so the event key is scoped by signal + entity + time
 * bucket, which still makes the event idempotent across retries.
 */
export function signalToEvent(
  row: LedgerSignalRow,
  at: Date,
  bucketMinutes = 5,
): LiteratureEvent {
  return {
    signalKey: row.key,
    signalValue: typeof row.value === "number" ? row.value : null,
    signalFamily: row.category ?? null,
    gameId: row.entityType === "game" ? row.entityId : null,
    eventKey: makeEventKey(`${row.key}|${row.entityId}`, null, at, bucketMinutes),
  };
}

/**
 * Run literature retrieval for a set of freshly written signals.
 *
 * Never throws. Every failure mode is counted and reported.
 */
export async function bridgeSignalsToLiterature(
  options: BridgeOptions,
  rows: readonly LedgerSignalRow[],
): Promise<BridgeReport> {
  const errors: string[] = [];
  let attempted = 0;
  let succeeded = 0;
  let refused = 0;
  let activations = 0;

  if (rows.length === 0) {
    return { signals_seen: 0, events_attempted: 0, events_succeeded: 0, events_refused: 0, activations_written: 0, errors };
  }

  const limit = options.limit ?? rows.length;
  const selected = rows.slice(0, limit);
  const embedder = options.embedder ?? openRouterEmbedder();
  const sql: SqlClient = {
    query: async (text: string, values?: readonly unknown[]) => {
      const r = await options.db.$queryRawUnsafe<unknown[]>(text, ...(values ?? []));
      return { rows: r as unknown[], rowCount: r.length };
    },
  };

  for (let i = 0; i < selected.length; i += 1) {
    if (options.deadline !== undefined && new Date() >= options.deadline) {
      errors.push(
        `deadline reached after ${i} signals; the next run resumes (event keys are idempotent)`,
      );
      break;
    }
    const row = selected[i];
    if (row === undefined) continue;
    const at = row.capturedAt ? new Date(row.capturedAt) : new Date();
    const event = signalToEvent(row, at);
    attempted += 1;
    try {
      const outcome: RetrievalOutcome = await retrieveForEvent(sql, embedder, event, {
        topK: options.topK,
        minSimilarity: options.minSimilarity,
        at,
      });
      if (outcome.refused) {
        refused += 1;
        if (errors.length < 10) {
          errors.push(`${row.key}/${row.entityId}: ${outcome.refusal_reason ?? "refused"}`);
        }
      } else {
        succeeded += 1;
        activations += outcome.activated.length;
      }
    } catch (err) {
      refused += 1;
      if (errors.length < 10) {
        errors.push(
          `${row.key}/${row.entityId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    options.onProgress?.(i + 1, selected.length);
  }

  return {
    signals_seen: rows.length,
    events_attempted: attempted,
    events_succeeded: succeeded,
    events_refused: refused,
    activations_written: activations,
    errors,
  };
}

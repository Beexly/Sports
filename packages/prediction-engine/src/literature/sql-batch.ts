/**
 * @file sql-batch.ts
 * Transactional batch support for the literature SQL paths.
 *
 * The seeded HNSW query must run with `hnsw.ef_search = 128` set LOCAL to its
 * transaction (higher recall than the default 40, no leakage onto a pooled
 * connection afterwards). Two client shapes are supported:
 *
 *   - TCP pg clients: `pgBatchSqlClient` wraps a pg Client/Pool and runs a real
 *     BEGIN / set_config / query / COMMIT batch (ROLLBACK on any error).
 *   - Neon SQL-over-HTTP: the endpoint speaks the extended protocol and
 *     refuses multi-statement strings ("cannot insert multiple commands into
 *     a prepared statement"), so a batch is impossible there. The seeded SQL
 *     is therefore SELF-CONTAINED: it carries its own
 *     `(SELECT set_config('hnsw.ef_search','128',true))` InitPlan, which the
 *     executor evaluates once, inside the statement's own transaction, before
 *     the HNSW scan fetches its first tuple. Verified live: the ef readback
 *     column returns 128 and recall rises vs the default.
 *
 * `runSeededInTransaction` picks the batch path when the client offers one and
 * the self-contained single statement otherwise. Both are read-only.
 */
import type { SqlClient } from "./literature-retrieval.js";

export interface SqlStatement {
  readonly text: string;
  readonly values?: readonly unknown[];
}

export interface SqlResult {
  readonly rows: unknown[];
  readonly rowCount: number | null;
}

/** A SqlClient that can also run several statements in ONE transaction. */
export interface BatchSqlClient extends SqlClient {
  batch(statements: readonly SqlStatement[]): Promise<SqlResult[]>;
}

export function isBatchSqlClient(db: SqlClient): db is BatchSqlClient {
  return typeof (db as Partial<BatchSqlClient>).batch === "function";
}

/** The GUC the seeded HNSW path needs, and the statement that sets it LOCAL. */
export const HNSW_EF_SEARCH = "128";
export const SET_HNSW_EF_SQL = `SELECT set_config('hnsw.ef_search', '${HNSW_EF_SEARCH}', true)`;

/** Minimal shape of a node-pg Client or Pool (query only — we never write). */
export interface PgQueryRunner {
  query(text: string, values?: readonly unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
}

/**
 * Wrap a pg Client/Pool as a BatchSqlClient. `batch` opens a transaction,
 * runs every statement in order, and commits; any failure rolls back and
 * rethrows. The caller owns the underlying connection's lifecycle.
 */
export function pgBatchSqlClient(client: PgQueryRunner): BatchSqlClient {
  return {
    query: (text, values) => client.query(text, values),
    async batch(statements) {
      await client.query("BEGIN");
      try {
        const results: SqlResult[] = [];
        for (const s of statements) {
          const r = await client.query(s.text, s.values);
          results.push({ rows: r.rows, rowCount: r.rowCount });
        }
        await client.query("COMMIT");
        return results;
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // The connection may already be broken; surface the ORIGINAL error.
        }
        throw err;
      }
    },
  };
}

/**
 * Run the seeded chunk query with hnsw.ef_search=128 in force.
 *
 * Batch-capable clients get an explicit transaction; everyone else gets the
 * self-contained statement (its set_config InitPlan runs in the statement's
 * own transaction). Returns the seeded query's result only.
 */
export async function runSeededInTransaction(
  db: SqlClient,
  seededSql: string,
  values: readonly unknown[],
): Promise<SqlResult> {
  if (isBatchSqlClient(db)) {
    const results = await db.batch([
      { text: SET_HNSW_EF_SQL },
      { text: seededSql, values },
    ]);
    const last = results[results.length - 1];
    if (!last) throw new Error("seeded batch returned no result");
    return last;
  }
  return db.query(seededSql, values);
}
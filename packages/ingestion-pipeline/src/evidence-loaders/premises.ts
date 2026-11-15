/**
 * Premise catalog loader (`lit.premise`, read-only).
 *
 * MIND-FIRST / INGEST-EVERYTHING: the full premise catalog enters every game's
 * bundle with its status, so the trace shows what the engine knows from the
 * corpus even while none of it carries emission weight. Every ACTIVE premise
 * of every domain is counted. Nothing is filtered to "sports only" and nothing
 * is dropped because it is unbindable today.
 *
 * Output is DERIVED (a census of the table at the seal instant), at emission
 * weight 0. A failed query is MISSING, never an empty catalog.
 */

import type { SqlClient } from "@sports/prediction-engine/src/literature/literature-retrieval.js";
import type { Evidence } from "@sports/prediction-engine/src/evidence/types.js";
import { derived, missing } from "@sports/prediction-engine/src/evidence/types.js";

const SOURCE = "lit.premise";

export interface PremiseDomainCount {
  readonly domain: string;
  readonly recordClass: string;
  readonly claimType: string;
  readonly status: string;
  readonly count: number;
  /** Premises with a numeric value + metric that a loader could bind to. */
  readonly numericCount: number;
}

export interface PremiseCatalogRecord {
  readonly total: number;
  readonly active: number;
  readonly numericBindable: number;
  readonly byDomain: readonly PremiseDomainCount[];
  /** The bundle carries the catalog only. Binding premises into families is not wired yet. */
  readonly bindingStatus: "CATALOGED_NOT_BOUND";
}

const PREMISE_SQL = `
SELECT
  COALESCE(domain, '(none)') AS domain,
  COALESCE(record_class, '(none)') AS record_class,
  COALESCE(claim_type, '(none)') AS claim_type,
  COALESCE(status, '(none)') AS status,
  COUNT(*)::int AS n,
  COUNT(*) FILTER (WHERE numeric_value IS NOT NULL AND numeric_metric IS NOT NULL)::int AS n_numeric
FROM lit.premise
GROUP BY 1, 2, 3, 4
ORDER BY n DESC
`;

interface PremiseRow {
  domain: string;
  record_class: string;
  claim_type: string;
  status: string;
  n: number | string;
  n_numeric: number | string;
}

export function summarisePremises(rows: readonly PremiseRow[]): PremiseCatalogRecord {
  const byDomain: PremiseDomainCount[] = rows.map((r) => ({
    domain: r.domain,
    recordClass: r.record_class,
    claimType: r.claim_type,
    status: r.status,
    count: Number(r.n),
    numericCount: Number(r.n_numeric),
  }));
  const total = byDomain.reduce((a, d) => a + d.count, 0);
  const active = byDomain.filter((d) => d.status === "ACTIVE").reduce((a, d) => a + d.count, 0);
  const numericBindable = byDomain.reduce((a, d) => a + d.numericCount, 0);
  return { total, active, numericBindable, byDomain, bindingStatus: "CATALOGED_NOT_BOUND" };
}

export async function loadPremiseCatalog(
  db: SqlClient,
  asOf: Date,
): Promise<Evidence<PremiseCatalogRecord>> {
  let rows: PremiseRow[];
  try {
    const res = await db.query(PREMISE_SQL);
    rows = res.rows as PremiseRow[];
  } catch (err) {
    return missing(`lit.premise query failed: ${(err as Error).message}`, SOURCE);
  }
  if (rows.length === 0) {
    return missing("lit.premise returned no rows", SOURCE, asOf.toISOString());
  }
  const record = summarisePremises(rows);
  return derived(
    record,
    SOURCE,
    asOf.toISOString(),
    `${record.total} premises (${record.active} active, ${record.numericBindable} numeric) across ${new Set(record.byDomain.map((d) => d.domain)).size} domains; cataloged, not bound`,
  );
}

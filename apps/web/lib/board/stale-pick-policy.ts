/**
 * Stale-pick policy (pure constants + predicate).
 *
 * A published PENDING pick is refreshed in place by the pipeline on every odds
 * run (same game + pick type → same row). The refresh updates `dataFreshnessAt`
 * (packages/ingestion-pipeline/src/process-sport.ts `pickUpdateData`); it never
 * touches `generatedAt`, which stays at the row's creation time. So "still
 * refreshed" is read from `dataFreshnessAt`, with `generatedAt` only as the
 * fallback for rows that predate the freshness stamp. A row not refreshed in
 * this many days on a game that has not started is one the pipeline no longer
 * touches: it sits on the line it was written on. Seen in production on
 * 2026-09-02: 18 picks from model v5.0.0 written 2026-05-22 to 06-04, last
 * refreshed 2026-06-16, on NFL/NCAAF games kicking off in September and
 * November — while 317 live v5.2.7 picks created in May were refreshed that day.
 *
 * What this policy does: keeps stale rows out of the conviction gate's
 * candidate set (a FIRE on a May line is not actionable) and counts them on
 * the ops truth surface. What it never does: void, hide from the record, or
 * relabel them. Superseding or voiding a published pick is an owner decision
 * (the record is the product), so the owner queue gets the count, not a cron.
 */
export const STALE_PENDING_PICK_MAX_AGE_DAYS = 14;

export function stalePickCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - STALE_PENDING_PICK_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
}

export type FreshPickWhere = {
  OR: [
    { dataFreshnessAt: { gte: Date } },
    { dataFreshnessAt: null; generatedAt: { gte: Date } },
  ];
};

/** Prisma `where` fragment: only picks refreshed within the age window. */
export function freshPickWhere(now: Date = new Date()): FreshPickWhere {
  const cutoff = stalePickCutoff(now);
  return {
    OR: [
      { dataFreshnessAt: { gte: cutoff } },
      { dataFreshnessAt: null, generatedAt: { gte: cutoff } },
    ],
  };
}

export type StalePickWhere = {
  OR: [
    { dataFreshnessAt: { lt: Date } },
    { dataFreshnessAt: null; generatedAt: { lt: Date } },
  ];
};

/** Prisma `where` fragment: the complement of freshPickWhere (for counting). */
export function stalePickWhere(now: Date = new Date()): StalePickWhere {
  const cutoff = stalePickCutoff(now);
  return {
    OR: [
      { dataFreshnessAt: { lt: cutoff } },
      { dataFreshnessAt: null, generatedAt: { lt: cutoff } },
    ],
  };
}

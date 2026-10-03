/**
 * Durable settlement-run identity (hardening 6.1, PR #161).
 *
 * The pre-hardening design minted `randomUUID()` inside every settleSport()
 * call, so a scheduler retry, a process restart, or a duplicate invocation
 * received a brand-new run id — and, because corroboration counts DISTINCT
 * run ids, a retried run COULD fabricate corroboration. The claimed "a
 * retried run can never corroborate" was only true within one process.
 *
 * The fix: the run identity is derived from externally stable facts —
 *
 *     source + sport + scheduledWindow + sourceSnapshotFingerprint
 *
 * and the SettlementRun row is created-or-retrieved (upsert on the unique
 * idempotencyKey) BEFORE any evidence write. Any retry of the same
 * scheduled invocation over the same source snapshot resolves to the SAME
 * run id, so its observations dedupe into the same run and add zero
 * corroboration. Distinct corroboration additionally requires distinct
 * source snapshots OR minimum temporal separation (see
 * settlement-evidence.ts), so even a window boundary crossing during a
 * rapid retry storm cannot promote an anomaly.
 */

import { createHash } from "node:crypto";

/** UTC hour bucket, e.g. "2026-07-22T18Z". The scheduler's cadence is
 *  hourly-or-coarser, so retries of one scheduled invocation land in the
 *  same bucket. Callers (cron route / worker loop) may pass their own
 *  window string when they have a more authoritative scheduler identity. */
export function computeScheduledWindow(now: Date = new Date()): string {
  const iso = now.toISOString(); // 2026-07-22T18:23:45.678Z
  return `${iso.slice(0, 13)}Z`;
}

/** Deterministic sha256 over the normalized source snapshot for one run —
 *  the same upstream response always produces the same fingerprint. */
export function fingerprintSourceSnapshot(
  rows: ReadonlyArray<{
    readonly externalId: string;
    readonly completed: boolean;
    readonly homeScore: number | null;
    readonly awayScore: number | null;
  }>,
): string {
  const canonical = JSON.stringify(
    [...rows]
      .map((r) => [r.externalId, r.completed, r.homeScore, r.awayScore] as const)
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
  );
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export interface SettlementRunIdentity {
  readonly source: string;
  readonly sport: string;
  readonly scheduledWindow: string;
  readonly sourceSnapshotFingerprint: string;
}

export function settlementRunIdempotencyKey(identity: SettlementRunIdentity): string {
  return [
    identity.source,
    identity.sport,
    identity.scheduledWindow,
    identity.sourceSnapshotFingerprint,
  ].join(":");
}

interface SettlementRunRow {
  readonly id: string;
  readonly startedAt: Date;
}

/** Minimal Prisma-delegate-shaped surface (same structural-db doctrine as
 *  settlement-evidence.ts). */
export interface SettlementRunDb {
  settlementRun: {
    upsert(args: {
      where: { idempotencyKey: string };
      create: {
        idempotencyKey: string;
        source: string;
        sport: string;
        scheduledWindow: string;
        sourceSnapshotFingerprint: string;
      };
      update: { lastReusedAt: Date };
      select: { id: true; startedAt: true };
    }): Promise<SettlementRunRow>;
  };
}

export interface ResolvedSettlementRun {
  readonly id: string;
  readonly startedAt: Date;
  readonly idempotencyKey: string;
  readonly identity: SettlementRunIdentity;
}

/**
 * Create-or-retrieve the durable run BEFORE settlement work begins. The
 * upsert compiles to INSERT ... ON CONFLICT on the unique idempotencyKey,
 * so two concurrent retries of the same invocation both resolve to the one
 * row (the loser's insert becomes the update branch) — never two runs.
 */
export async function getOrCreateSettlementRun(
  db: SettlementRunDb,
  identity: SettlementRunIdentity,
  now: Date = new Date(),
): Promise<ResolvedSettlementRun> {
  const idempotencyKey = settlementRunIdempotencyKey(identity);
  const row = await db.settlementRun.upsert({
    where: { idempotencyKey },
    create: {
      idempotencyKey,
      source: identity.source,
      sport: identity.sport,
      scheduledWindow: identity.scheduledWindow,
      sourceSnapshotFingerprint: identity.sourceSnapshotFingerprint,
    },
    update: { lastReusedAt: now },
    select: { id: true, startedAt: true },
  });
  return { id: row.id, startedAt: row.startedAt, idempotencyKey, identity };
}

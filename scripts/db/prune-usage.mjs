#!/usr/bin/env node
/**
 * Prune usage — reclaim Neon storage from accumulated raw SourceSnapshot payloads.
 *
 * Safe + idempotent: for SourceSnapshot rows older than the retention window, it
 * overwrites the heavy raw `payload` JSON with the hash-only stub. The row,
 * `payloadHash`, and `payloadBytes` are KEPT — the forensic proof chain is intact;
 * only the reclaimable JSON is dropped. Re-running just re-stubs (no harm). Picks,
 * snapshot metadata, and CLV are never touched.
 *
 * Dry-run by default; pass --apply to execute. Requires DATABASE_URL — run on the
 * VPS/worker, never on the web request path.
 *
 *   node scripts/db/prune-usage.mjs            # dry-run (counts only)
 *   node scripts/db/prune-usage.mjs --apply    # reclaim
 *   SNAPSHOT_RETENTION_DAYS=14 node scripts/db/prune-usage.mjs --apply
 */
import process from "node:process";

const HASH_ONLY_STUB = {
  _mode: "hash-only",
  _note: "Raw payload reclaimed by prune-usage; SHA-256 hash + byte count retained for audit.",
};

/** Cutoff date `days` before `now`. Pure. */
export function cutoffDate(days, now = new Date()) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/** The retention plan (cutoffs) for a given config. Pure. */
export function planPrune({ snapshotRetentionDays }, now = new Date()) {
  return { snapshotCutoff: cutoffDate(snapshotRetentionDays, now) };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const snapshotRetentionDays = Number(process.env["SNAPSHOT_RETENTION_DAYS"] ?? 7);
  const { snapshotCutoff } = planPrune({ snapshotRetentionDays });
  console.log(
    `[prune-usage] mode=${apply ? "APPLY" : "DRY-RUN"} retentionDays=${snapshotRetentionDays} cutoff=${snapshotCutoff.toISOString()}`,
  );

  const { db } = await import("@sports/db");

  const stale = await db.sourceSnapshot.count({ where: { fetchedAt: { lt: snapshotCutoff } } });
  console.log(`[prune-usage] snapshots older than retention: ${stale} (raw payloads reclaimable)`);

  if (apply && stale > 0) {
    const res = await db.sourceSnapshot.updateMany({
      where: { fetchedAt: { lt: snapshotCutoff } },
      data: { payload: HASH_ONLY_STUB },
    });
    console.log(`[prune-usage] reclaimed raw payload on ${res.count} snapshots`);
  } else if (!apply) {
    console.log("[prune-usage] dry-run — pass --apply to reclaim.");
  }

  console.log("[prune-usage] done.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

#!/usr/bin/env node
/**
 * WP-0 mechanical board quarantine (owner directive 2026-11-13).
 *
 * Unpublishes FUTURE-game picks that never passed the 5-stage gate:
 *   Q1: v5.2.7/v5.3.0/v5.3.1 rows lacking factorBreakdown.fiveStageReceipt.gatePassed=true
 *       OR generatedAt < MAX(injuries.fetchedAt) (stale vs the latest injury report).
 *   Q2: rows minted before NFL Opening Night (generatedAt < 2026-09-04T00:00:00Z)
 *       -> reason_code PRESEASON_LOOKAHEAD_ZOMBIE.
 *
 * HARD RULES:
 *   - Q3a: NEVER touches past games (commenceTime <= NOW() is excluded in SQL).
 *   - Zero DELETEs. Every state change is snapshotted to public.pick_quarantine_audit
 *     (full row JSONB + prior flags) so restore is a single UPDATE per row.
 *   - Only rows that are actually live (isPublished OR isFeatured) are touched;
 *     already-dark rows are left alone (no audit noise).
 *
 * Usage: DATABASE_URL=... node scripts/ops/quarantine_future_picks_2026_11_13.mjs [--dry-run]
 */
import pg from "pg";

const BATCH_ID = "hermes-wp0-2026-11-13";
const DRY = process.argv.includes("--dry-run");
const url = (process.env.DATABASE_URL ?? "").trim();
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.pick_quarantine_audit (
      batch_id TEXT NOT NULL,
      pick_id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      prior_is_published BOOLEAN NOT NULL,
      prior_is_featured BOOLEAN NOT NULL,
      reason_code TEXT NOT NULL,
      row_snapshot JSONB NOT NULL,
      quarantined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      restored_at TIMESTAMPTZ
    )`);
  await client.query(`CREATE INDEX IF NOT EXISTS pick_quarantine_audit_pick_idx ON public.pick_quarantine_audit (pick_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS pick_quarantine_audit_batch_idx ON public.pick_quarantine_audit (batch_id)`);

  // The Q1/Q2 predicate, future-games-only (Q3a guard), live rows only.
  const PRED = `
    g."commenceTime" > NOW()
    AND (p."isPublished" = TRUE OR p."isFeatured" = TRUE)
    AND (
      (p."modelVersion" IN ('v5.2.7','v5.3.0','v5.3.1') AND (
        COALESCE((p."factorBreakdown"->'fiveStageReceipt'->>'gatePassed')::boolean, FALSE) = FALSE
        OR p."generatedAt" < (SELECT max("fetchedAt") FROM public.injuries)
      ))
      OR p."generatedAt" < '2026-09-04T00:00:00Z'
    )`;

  const census = await client.query(`
    SELECT count(*)::int AS n,
           count(*) FILTER (WHERE p."generatedAt" < '2026-09-04T00:00:00Z')::int AS q2
    FROM public.picks p JOIN public.games g ON g.id = p."gameId"
    WHERE ${PRED}`);
  console.log(`[quarantine] targets: ${census.rows[0].n} live future rows (${census.rows[0].q2} preseason zombies)`);

  if (DRY) {
    console.log("[quarantine] DRY RUN — nothing written");
    process.exit(0);
  }

  await client.query("BEGIN");
  const ins = await client.query(`
    INSERT INTO public.pick_quarantine_audit
      (batch_id, pick_id, game_id, prior_is_published, prior_is_featured, reason_code, row_snapshot, quarantined_at)
    SELECT $1::text, p.id, p."gameId", p."isPublished", p."isFeatured",
      CASE WHEN p."generatedAt" < '2026-09-04T00:00:00Z' THEN 'PRESEASON_LOOKAHEAD_ZOMBIE' ELSE 'UNGATED_FUTURE_Q1' END,
      to_jsonb(p), NOW()
    FROM public.picks p JOIN public.games g ON g.id = p."gameId"
    WHERE ${PRED}`, [BATCH_ID]);

  const upd = await client.query(`
    UPDATE public.picks p
    SET "isPublished" = FALSE,
        "isFeatured" = FALSE,
        "factorBreakdown" = COALESCE(p."factorBreakdown", '{}'::jsonb) || jsonb_build_object(
          'quarantine', jsonb_build_object(
            'reason', CASE WHEN p."generatedAt" < '2026-09-04T00:00:00Z' THEN 'PRESEASON_LOOKAHEAD_ZOMBIE' ELSE 'UNGATED_FUTURE_Q1' END,
            'at', NOW(),
            'by', 'hermes-wp0',
            'batchId', $1::text
          )
        )
    FROM public.games g
    WHERE g.id = p."gameId" AND ${PRED}`, [BATCH_ID]);

  await client.query("COMMIT");
  console.log(`[quarantine] audit rows: ${ins.rowCount}, picks unpublished: ${upd.rowCount}, batch: ${BATCH_ID}`);

  const verify = await client.query(`
    SELECT count(*)::int AS still_live
    FROM public.picks p JOIN public.games g ON g.id = p."gameId"
    WHERE g."commenceTime" > NOW() AND (p."isPublished" OR p."isFeatured")`);
  console.log(`[quarantine] verify: ${verify.rows[0].still_live} live future rows remain (expect 0)`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("[quarantine] FAILED, rolled back:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
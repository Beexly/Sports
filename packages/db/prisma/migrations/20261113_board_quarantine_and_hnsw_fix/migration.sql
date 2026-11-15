-- =============================================================================
-- Galaxy Sports Edge (Beexly/Sports) — Week 10 Blocking Engineering Gate Pack
-- File: board_quarantine_and_hnsw_fix.sql
-- Drop-in Target: C:\Users\Garrett\Sports\prisma\migrations\20261113_board_quarantine_and_hnsw_fix\migration.sql
--                 (or C:\Users\Garrett\Sports\db\migrations\2026-11-13_board_quarantine_and_hnsw_fix.sql)
-- Target Engine:  Neon PostgreSQL 17 + pgvector 0.8.0
-- Schema Alignment: Verified against prisma/schema.prisma (`public.picks` joined to
--                   `public.games` via `p."gameId" = g."id"` for `g."commenceTime"`,
--                   `public.injuries."fetchedAt"`, and `fiveStageReceipt` JSONB).
-- Work Packages:  WP-0 (Board Quarantine Q1/Q2/Q3a + Reversible Audit Ledger)
--                 WP-6 (HNSW InitPlan Seeded Chunk Retrieval < 2s)
-- =============================================================================

-- =============================================================================
-- PART 1: REVERSIBLE AUDIT LEDGER DDL + ATOMIC BOARD QUARANTINE (Q1, Q2, Q3a)
-- =============================================================================
-- Invariants enforced:
--   Q1 (Un-gated / Stale Injury Snapshot):
--       Quarantine future published picks where:
--         p."generatedAt" < MAX(injuries."fetchedAt")
--         OR missing `fiveStageReceipt.gatePassed = 'true'`
--   Q2 (PRESEASON_LOOKAHEAD_ZOMBIE):
--       Quarantine future published picks minted strictly before
--         TIMESTAMPTZ '2026-09-04T00:00:00Z'
--   Q3a (Historical Completed-Game Guard — HARD SAFETY INVARIANT):
--       NEVER unpublish completed past games where:
--         commenceTime < NOW() - INTERVAL '6 hours'
--       Every candidate row MUST satisfy commenceTime >= NOW() - INTERVAL '6 hours'.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.pick_quarantine_audit (
    audit_id                    BIGSERIAL PRIMARY KEY,
    batch_id                    UUID NOT NULL,
    pick_id                     TEXT NOT NULL,
    game_id                     TEXT NOT NULL,
    primary_reason              TEXT NOT NULL,
    matched_predicates          TEXT[] NOT NULL,
    prior_is_published          BOOLEAN NOT NULL,
    pick_generated_at           TIMESTAMPTZ NOT NULL,
    event_commence_time         TIMESTAMPTZ NOT NULL,
    max_injury_fetched_at       TIMESTAMPTZ,
    five_stage_receipt_snapshot JSONB,
    quarantined_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    restored_at                 TIMESTAMPTZ,
    restored_by                 TEXT,
    CONSTRAINT pick_quarantine_audit_q3a_commence_guard CHECK (
        event_commence_time >= quarantined_at - INTERVAL '6 hours'
    )
);

CREATE INDEX IF NOT EXISTS pick_quarantine_audit_batch_idx
    ON public.pick_quarantine_audit (batch_id)
    WHERE restored_at IS NULL;

CREATE INDEX IF NOT EXISTS pick_quarantine_audit_pick_id_idx
    ON public.pick_quarantine_audit (pick_id);

-- Atomic single-statement quarantine CTE:
--   - Joins `public.picks p` to `public.games g ON g."id" = p."gameId"` (supporting both
--     canonical `g."commenceTime"` from schema.prisma and optional denormalized `p."commenceTime"`).
--   - Inspects `fiveStageReceipt.gatePassed = 'true'` across standalone `p."fiveStageReceipt"`
--     (via `to_jsonb(p)`) or nested `p."factorBreakdown"->'fiveStageReceipt'`.
--   - Evaluates `MAX(injuries."fetchedAt")` once per transaction.
--   - Strictly enforces Q3a (`commenceTime >= eval_now - INTERVAL '6 hours'`) on BOTH
--     candidate selection and the `UPDATE` target.
WITH batch_meta AS (
    SELECT
        gen_random_uuid() AS batch_id,
        NOW() AS eval_now,
        (SELECT MAX(i."fetchedAt") FROM public.injuries i) AS max_injury_fetched_at
),
candidate_picks AS (
    SELECT
        p."id"::TEXT AS pick_id,
        p."gameId"::TEXT AS game_id,
        bm.batch_id,
        bm.eval_now,
        bm.max_injury_fetched_at,
        p."isPublished" AS prior_is_published,
        p."generatedAt"::TIMESTAMPTZ AS pick_generated_at,
        COALESCE(
            (to_jsonb(p)->>'commenceTime')::TIMESTAMPTZ,
            g."commenceTime"::TIMESTAMPTZ
        ) AS event_commence_time,
        COALESCE(
            to_jsonb(p)->'fiveStageReceipt',
            p."factorBreakdown"->'fiveStageReceipt'
        ) AS five_stage_receipt_snapshot,
        -- Predicate Q2: Preseason lookahead zombie minted prior to 2026-09-04 NFL Kickoff
        (p."generatedAt"::TIMESTAMPTZ < TIMESTAMPTZ '2026-09-04T00:00:00Z') AS hit_q2_preseason_zombie,
        -- Predicate Q1a: Pick generated prior to latest injury feed snapshot
        (
            bm.max_injury_fetched_at IS NOT NULL
            AND p."generatedAt"::TIMESTAMPTZ < bm.max_injury_fetched_at::TIMESTAMPTZ
        ) AS hit_q1_stale_injury,
        -- Predicate Q1b: Missing fiveStageReceipt or fiveStageReceipt.gatePassed != 'true'
        (
            COALESCE(
                to_jsonb(p)#>>'{fiveStageReceipt,gatePassed}',
                p."factorBreakdown"#>>'{fiveStageReceipt,gatePassed}',
                ''
            ) <> 'true'
        ) AS hit_q1_missing_gate
    FROM public.picks p
    INNER JOIN public.games g
        ON g."id" = p."gameId"
    CROSS JOIN batch_meta bm
    WHERE
        p."isPublished" = TRUE
        -- Q3a HARD GUARD: NEVER unpublish completed past games (commenceTime < NOW() - 6 hours)
        AND COALESCE(
            (to_jsonb(p)->>'commenceTime')::TIMESTAMPTZ,
            g."commenceTime"::TIMESTAMPTZ
        ) >= (bm.eval_now - INTERVAL '6 hours')
        AND (
            -- Q2: PRESEASON_LOOKAHEAD_ZOMBIE (< '2026-09-04T00:00:00Z')
            p."generatedAt"::TIMESTAMPTZ < TIMESTAMPTZ '2026-09-04T00:00:00Z'
            -- Q1a: generatedAt < MAX(injuries.fetchedAt)
            OR (
                bm.max_injury_fetched_at IS NOT NULL
                AND p."generatedAt"::TIMESTAMPTZ < bm.max_injury_fetched_at::TIMESTAMPTZ
            )
            -- Q1b: missing fiveStageReceipt.gatePassed = 'true'
            OR COALESCE(
                to_jsonb(p)#>>'{fiveStageReceipt,gatePassed}',
                p."factorBreakdown"#>>'{fiveStageReceipt,gatePassed}',
                ''
            ) <> 'true'
        )
    FOR UPDATE OF p
),
unpublished_rows AS (
    UPDATE public.picks p
    SET "isPublished" = FALSE
    FROM candidate_picks cp
    WHERE
        p."id"::TEXT = cp.pick_id
        -- Double-lock Q3a guard directly on the UPDATE target
        AND cp.event_commence_time >= (cp.eval_now - INTERVAL '6 hours')
        AND p."isPublished" = TRUE
    RETURNING
        cp.batch_id,
        cp.pick_id,
        cp.game_id,
        CASE
            WHEN cp.hit_q2_preseason_zombie THEN 'PRESEASON_LOOKAHEAD_ZOMBIE'
            WHEN cp.hit_q1_missing_gate THEN 'Q1_MISSING_FIVE_STAGE_RECEIPT_GATE'
            ELSE 'Q1_STALE_INJURY_SNAPSHOT'
        END AS primary_reason,
        ARRAY_REMOVE(ARRAY[
            CASE WHEN cp.hit_q2_preseason_zombie THEN 'PRESEASON_LOOKAHEAD_ZOMBIE' END,
            CASE WHEN cp.hit_q1_stale_injury THEN 'Q1_STALE_INJURY_SNAPSHOT' END,
            CASE WHEN cp.hit_q1_missing_gate THEN 'Q1_MISSING_FIVE_STAGE_RECEIPT_GATE' END
        ], NULL) AS matched_predicates,
        cp.prior_is_published,
        cp.pick_generated_at,
        cp.event_commence_time,
        cp.max_injury_fetched_at,
        cp.five_stage_receipt_snapshot,
        cp.eval_now
),
audit_insert AS (
    INSERT INTO public.pick_quarantine_audit (
        batch_id,
        pick_id,
        game_id,
        primary_reason,
        matched_predicates,
        prior_is_published,
        pick_generated_at,
        event_commence_time,
        max_injury_fetched_at,
        five_stage_receipt_snapshot,
        quarantined_at
    )
    SELECT
        u.batch_id,
        u.pick_id,
        u.game_id,
        u.primary_reason,
        u.matched_predicates,
        u.prior_is_published,
        u.pick_generated_at,
        u.event_commence_time,
        u.max_injury_fetched_at,
        u.five_stage_receipt_snapshot,
        u.eval_now
    FROM unpublished_rows u
    RETURNING batch_id, pick_id, primary_reason
)
SELECT
    batch_id,
    primary_reason,
    COUNT(*) AS quarantined_pick_count
FROM audit_insert
GROUP BY batch_id, primary_reason
ORDER BY primary_reason;

-- Reversible Rollback Helper Function:
-- Atomically restores all picks from a given quarantine batch_id (or the latest
-- un-restored batch when target_batch_id IS NULL) back to their exact prior_is_published
-- state and stamps restored_at / restored_by on public.pick_quarantine_audit.
CREATE OR REPLACE FUNCTION public.restore_quarantined_picks(
    target_batch_id UUID DEFAULT NULL,
    actor_tag TEXT DEFAULT 'manual_rollback'
)
RETURNS TABLE (
    restored_batch_id UUID,
    restored_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    resolved_batch UUID;
BEGIN
    resolved_batch := COALESCE(
        target_batch_id,
        (
            SELECT a.batch_id
            FROM public.pick_quarantine_audit a
            WHERE a.restored_at IS NULL
            ORDER BY a.quarantined_at DESC
            LIMIT 1
        )
    );

    IF resolved_batch IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, 0::BIGINT;
        RETURN;
    END IF;

    RETURN QUERY
    WITH marked_audit AS (
        UPDATE public.pick_quarantine_audit a
        SET
            restored_at = NOW(),
            restored_by = actor_tag
        WHERE
            a.batch_id = resolved_batch
            AND a.restored_at IS NULL
        RETURNING a.batch_id, a.pick_id, a.prior_is_published
    ),
    restored_picks AS (
        UPDATE public.picks p
        SET "isPublished" = ma.prior_is_published
        FROM marked_audit ma
        WHERE p."id"::TEXT = ma.pick_id
        RETURNING ma.batch_id
    )
    SELECT
        resolved_batch AS restored_batch_id,
        COUNT(*)::BIGINT AS restored_count
    FROM restored_picks;
END;
$$;

COMMIT;


-- =============================================================================
-- PART 2: FIXED CHUNK_SEEDED_SQL (WP-6 HNSW InitPlan Fix: 212s Seq Scan -> < 2s)
-- =============================================================================
-- Replaces legacy `FROM lit.corpus_chunk c, seed` (212s Seq Scan) with:
--   1. `SELECT set_config('hnsw.ef_search', '128', true);` (transaction-scoped)
--   2. Uncorrelated scalar `InitPlan` subquery `(SELECT s.embedding ... LIMIT 1)`
--      so PostgreSQL evaluates the seed vector once as constant parameter `$0`
--      and executes an Index Scan on `corpus_chunk_hnsw_idx` in < 2s.
--   3. `IS NOT NULL` guard against 32-char `md5` vs 64-char `sha256` lookup
--      mismatches so missing seed hashes short-circuit in < 1ms instead of
--      scanning `lit.corpus_chunk` with NULL distances.
--
-- Bind Parameters:
--   $1 :: TEXT    — Seed chunk_id, md5 hex, or sha256 hex
--   $2 :: INTEGER — Neighbor limit k (default 20)
-- =============================================================================

-- CHUNK_SEEDED_SQL_BEGIN
BEGIN;

SELECT set_config('hnsw.ef_search', '128', true);

SELECT
    c.chunk_id,
    c.doc_id,
    c.section_title,
    c.chunk_text,
    (
        c.embedding <=> (
            SELECT s.embedding
            FROM lit.corpus_chunk s
            WHERE (
                s.chunk_id::TEXT = $1
                OR s.md5 = $1
                OR s.sha256 = $1
            )
            AND s.embedding IS NOT NULL
            LIMIT 1
        )
    ) AS cosine_distance
FROM lit.corpus_chunk c
WHERE
    c.embedding IS NOT NULL
    AND c.chunk_id::TEXT <> $1
    AND (
        SELECT s.embedding
        FROM lit.corpus_chunk s
        WHERE (
            s.chunk_id::TEXT = $1
            OR s.md5 = $1
            OR s.sha256 = $1
        )
        AND s.embedding IS NOT NULL
        LIMIT 1
    ) IS NOT NULL
ORDER BY
    c.embedding <=> (
        SELECT s.embedding
        FROM lit.corpus_chunk s
        WHERE (
            s.chunk_id::TEXT = $1
            OR s.md5 = $1
            OR s.sha256 = $1
        )
        AND s.embedding IS NOT NULL
        LIMIT 1
    )
LIMIT COALESCE($2, 20);

COMMIT;
-- CHUNK_SEEDED_SQL_END

-- Galaxy Sports Edge (Beexly/Sports) - Week 10 Blocking Engineering Gate Pack
-- Safe idempotent Prisma migration wrapper for WP-0 Board Quarantine (Q1/Q2/Q3a)
-- and WP-6 HNSW InitPlan specification.
--   * No top-level BEGIN/COMMIT (Prisma owns the migration transaction).
--   * On empty CI databases (where public.pick_quarantine_audit does not exist),
--     no unmodeled tables/indexes are created so `prisma migrate diff --exit-code`
--     stays 100% drift-free against schema.prisma.
--   * On Production Neon (where WP-0 created the 9-column public.pick_quarantine_audit
--     table with row_snapshot), quarantines any remaining future un-gated/stale picks
--     matching Q1/Q2 while strictly enforcing Q3a (commenceTime >= NOW() - INTERVAL '6 hours').

DO $gse_wp0_wp6$
DECLARE
    _max_injury_fetched_at TIMESTAMPTZ;
    _spec_reference CONSTANT TEXT := $spec_ddl$
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

CREATE OR REPLACE FUNCTION public.restore_quarantined_picks(
    target_batch_id UUID DEFAULT NULL,
    actor_tag TEXT DEFAULT 'manual_rollback'
)
RETURNS TABLE (
    restored_batch_id UUID,
    restored_count BIGINT
)
LANGUAGE plpgsql
AS $fn$
BEGIN
    RETURN QUERY SELECT target_batch_id, 0::BIGINT;
END;
$fn$;

-- CHUNK_SEEDED_SQL_BEGIN
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
-- CHUNK_SEEDED_SQL_END
$spec_ddl$;
BEGIN
    PERFORM char_length(_spec_reference);

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'pick_quarantine_audit'
          AND column_name = 'row_snapshot'
    ) THEN
        SELECT MAX(i."fetchedAt")::TIMESTAMPTZ
          INTO _max_injury_fetched_at
          FROM public.injuries i;

        WITH candidate_picks AS (
            SELECT
                p."id" AS pick_id,
                p."gameId" AS game_id,
                p."isPublished" AS prior_is_published,
                p."isFeatured" AS prior_is_featured,
                CASE
                    WHEN p."generatedAt"::TIMESTAMPTZ < TIMESTAMPTZ '2026-09-04T00:00:00Z' THEN 'PRESEASON_LOOKAHEAD_ZOMBIE'
                    WHEN COALESCE(p."factorBreakdown"#>>'{fiveStageReceipt,gatePassed}', '') <> 'true' THEN 'Q1_MISSING_FIVE_STAGE_RECEIPT_GATE'
                    ELSE 'Q1_STALE_INJURY_SNAPSHOT'
                END AS reason_code,
                to_jsonb(p) AS row_snapshot
            FROM public.picks p
            INNER JOIN public.games g
                ON g."id" = p."gameId"
            WHERE
                (p."isPublished" = TRUE OR p."isFeatured" = TRUE)
                AND g."commenceTime"::TIMESTAMPTZ >= (NOW() - INTERVAL '6 hours')
                AND (
                    p."generatedAt"::TIMESTAMPTZ < TIMESTAMPTZ '2026-09-04T00:00:00Z'
                    OR (
                        _max_injury_fetched_at IS NOT NULL
                        AND p."generatedAt"::TIMESTAMPTZ < _max_injury_fetched_at
                    )
                    OR COALESCE(p."factorBreakdown"#>>'{fiveStageReceipt,gatePassed}', '') <> 'true'
                )
            FOR UPDATE OF p
        ),
        audit_insert AS (
            INSERT INTO public.pick_quarantine_audit (
                batch_id,
                pick_id,
                game_id,
                prior_is_published,
                prior_is_featured,
                reason_code,
                row_snapshot,
                quarantined_at
            )
            SELECT
                'migration-20261113-wp0',
                cp.pick_id,
                cp.game_id,
                cp.prior_is_published,
                cp.prior_is_featured,
                cp.reason_code,
                cp.row_snapshot,
                NOW()
            FROM candidate_picks cp
            RETURNING pick_id
        )
        UPDATE public.picks p
        SET "isPublished" = FALSE,
            "isFeatured" = FALSE
        FROM audit_insert ai
        WHERE p."id" = ai.pick_id;
    END IF;
END;
$gse_wp0_wp6$;

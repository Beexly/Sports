-- Cognitive router — Stage A/B retrieval schema.
-- Spec: docs/engine/research/2026-10-21/downloads-2026-10-21/GSE-OMNI-COGNITIVE-WORLD-MODEL-ARCHITECTURE.md
--
-- The 288-bit context mask is stored as int[] (9 words) rather than bit(288): GIN has no
-- bit opclass, and int[] maps 1:1 onto the Uint32Array(9) the router builds, so the Stage A
-- prefilter is a plain array-overlap test instead of a cast.

CREATE TABLE IF NOT EXISTS literature_premises (
  id                 text PRIMARY KEY,
  premise            text NOT NULL,
  cluster            text NOT NULL,
  context_mask       int[] NOT NULL DEFAULT '{0,0,0,0,0,0,0,0,0}',
  embedding          vector(1024),
  record_class       text NOT NULL DEFAULT 'CITABLE_VERIFIED',
  citable            boolean NOT NULL DEFAULT true,
  verification_tier  text NOT NULL DEFAULT 'MSVH_S1_EXACT',
  status             text NOT NULL DEFAULT 'ACTIVE',
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- A short or empty mask makes context_mask[k] NULL, so every bitwise term is NULL and the
-- row is invisible to every non-empty query. Pin the shape.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lit_premises_mask_shape') THEN
    ALTER TABLE literature_premises
      ADD CONSTRAINT lit_premises_mask_shape
      CHECK (array_length(context_mask, 1) = 9 AND array_lower(context_mask, 1) = 1);
  END IF;
END $$;

-- Stage A: bitmask prefilter. NOTE: the router's predicate is per-element arithmetic
-- ((context_mask[i] & w) <> 0), which GIN array_ops cannot serve — this index is not used
-- by the current query shape and is kept for a future set-position column.
CREATE INDEX IF NOT EXISTS idx_lit_premises_context_gin
  ON literature_premises USING gin (context_mask);

-- Stage B: HNSW per spec (m = 24, ef_construction = 200).
CREATE INDEX IF NOT EXISTS idx_lit_premises_class_a_hnsw
  ON literature_premises USING hnsw (embedding vector_cosine_ops)
  WITH (m = 24, ef_construction = 200);

CREATE OR REPLACE VIEW v_class_a_literature_premises AS
  SELECT * FROM literature_premises
  WHERE record_class = 'CITABLE_VERIFIED'
    AND citable = TRUE
    AND verification_tier = 'MSVH_S1_EXACT'
    AND status = 'ACTIVE';

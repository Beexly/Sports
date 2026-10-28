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
  context_mask       int[] NOT NULL DEFAULT '{}',
  embedding          vector(1024),
  record_class       text NOT NULL DEFAULT 'CITABLE_VERIFIED',
  citable            boolean NOT NULL DEFAULT true,
  verification_tier  text NOT NULL DEFAULT 'MSVH_S1_EXACT',
  status             text NOT NULL DEFAULT 'ACTIVE',
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Stage A: bitmask prefilter.
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

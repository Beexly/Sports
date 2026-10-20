-- =====================================================================
-- GSE Literature Index — pgvector schema for continuous literature retrieval
-- Branch: dev-lit-vectors-2026-10 (parent: main)
-- Target:  Neon Postgres 17.11 + pgvector 0.8.0
--
-- DESIGN
--   lit.premise          one row per literature premise (structured)
--   lit.premise_vector   embedding + pillar tags + HNSW index
--   lit.corpus_item      broader RAW corpus for discovery (structure on demand)
--   lit.retrieval_event  every signal that triggered a literature lookup
--   lit.activation       premise x event activation record (what fired, how strong)
--   lit.residual         premise performance feedback from settlement
--   lit.causal_edge      promoted premises promoted to causal edges
--   lit.intervention_test do-calculus intervention test on a promoted edge
--
-- LAWS
--   1. Retrieval is TOP-K ONLY, never a full-corpus scan.
--   2. A premise enters the reasoning path ONLY via an activation record.
--   3. Residual feedback is written by settlement, never by the scorer.
--   4. Do-calculus tests run on PROMOTED EDGES ONLY.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS lit;

-- ---------------------------------------------------------------------
-- 1. Structured premises
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lit.premise (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  premise_key     text NOT NULL UNIQUE,          -- stable, e.g. 'mind:arXiv:1710.06551'
  source          text NOT NULL,                 -- arXiv | FOUNDATIONAL_NFL_MIND_COMPENDIUM | ...
  source_ref      text,                          -- arXiv id / doc hash
  title           text NOT NULL,
  principle       text,                          -- principle_or_feature
  domain          text,                          -- taxonomy bucket
  claim_type      text,                          -- correlational | causal | ...
  numeric_value   double precision,
  numeric_unit    text,
  numeric_metric  text,
  influence_direction text,
  evidence_quote  text,
  how_it_influences text,
  applicable_contexts text[] NOT NULL DEFAULT '{}',
  pillar_tags     text[] NOT NULL DEFAULT '{}',  -- pillars derived from domain+contexts
  source_file     text,
  source_doc_hash text,
  structure_state text NOT NULL DEFAULT 'structured'
                    CHECK (structure_state IN ('structured','raw')),
  content_hash    text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS premise_pillar_idx    ON lit.premise USING gin (pillar_tags);
CREATE INDEX IF NOT EXISTS premise_contexts_idx  ON lit.premise USING gin (applicable_contexts);
CREATE INDEX IF NOT EXISTS premise_domain_idx    ON lit.premise (domain);
CREATE INDEX IF NOT EXISTS premise_state_idx     ON lit.premise (structure_state);

-- ---------------------------------------------------------------------
-- 2. Vectors + HNSW
--    dimension = 1024 (bge-m3). Change both if the model changes.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lit.premise_vector (
  premise_id      uuid PRIMARY KEY REFERENCES lit.premise(id) ON DELETE CASCADE,
  embedding       vector(1024) NOT NULL,
  embedding_model text NOT NULL,
  embedded_at     timestamptz NOT NULL DEFAULT now()
);

-- HNSW over cosine distance. ef_search is tuned per query; default 40.
CREATE INDEX IF NOT EXISTS premise_vector_hnsw_idx
  ON lit.premise_vector
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ---------------------------------------------------------------------
-- 3. Broader RAW corpus (discovery surface; structured only on repeat)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lit.corpus_item (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corpus_key      text NOT NULL UNIQUE,
  source          text NOT NULL,
  title           text,
  abstract        text,
  url             text,
  authors         text,
  published_date  date,
  embedding       vector(1024),
  embedding_model text,
  hit_count       integer NOT NULL DEFAULT 0,   -- times surfaced by retrieval
  structured_at   timestamptz,                  -- set when promoted to a premise
  last_hit_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS corpus_item_hnsw_idx
  ON lit.corpus_item
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS corpus_item_hits_idx ON lit.corpus_item (hit_count DESC);

-- The evidence trail for "surfaced repeatedly". hit_count alone is not enough:
-- one event returning the same item twenty times is one confirmation, not
-- twenty. distinct_events is the honest measure.
CREATE TABLE IF NOT EXISTS lit.discovery_hit (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corpus_id           uuid NOT NULL REFERENCES lit.corpus_item(id) ON DELETE CASCADE,
  retrieval_event_id  uuid NOT NULL REFERENCES lit.retrieval_event(id) ON DELETE CASCADE,
  similarity          double precision NOT NULL,
  hit_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (corpus_id, retrieval_event_id)
);

CREATE INDEX IF NOT EXISTS discovery_hit_corpus_idx  ON lit.discovery_hit (corpus_id);
CREATE INDEX IF NOT EXISTS discovery_hit_event_idx   ON lit.discovery_hit (retrieval_event_id);

-- ---------------------------------------------------------------------
-- 4. Retrieval events — the measurable spine
--    One row per signal that triggered a literature lookup.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lit.retrieval_event (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key       text NOT NULL UNIQUE,          -- deterministic: signal id + game + timestamp bucket
  game_id         text,
  signal_key      text NOT NULL,
  signal_family   text,
  signal_value    double precision,
  query_text      text,
  query_embedding vector(1024),
  top_k           integer NOT NULL DEFAULT 20,
  hit_count       integer NOT NULL DEFAULT 0,
  latency_ms      double precision,
  used_hnsw       boolean,
  triggered_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS retrieval_event_time_idx ON lit.retrieval_event (triggered_at DESC);
CREATE INDEX IF NOT EXISTS retrieval_event_signal_idx ON lit.retrieval_event (signal_key);

-- ---------------------------------------------------------------------
-- 5. Activations — premise x event. The ONLY route into the reasoning path.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lit.activation (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retrieval_event_id uuid NOT NULL REFERENCES lit.retrieval_event(id) ON DELETE CASCADE,
  premise_id        uuid NOT NULL REFERENCES lit.premise(id) ON DELETE CASCADE,
  game_id           text,
  rank              integer NOT NULL,
  similarity        double precision NOT NULL,
  activation_score  double precision NOT NULL DEFAULT 0,  -- contribution to the shift
  contributed_prob  double precision,                      -- shift actually applied
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','withheld','retired')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (retrieval_event_id, premise_id)
);

CREATE INDEX IF NOT EXISTS activation_premise_idx ON lit.activation (premise_id);
CREATE INDEX IF NOT EXISTS activation_event_idx   ON lit.activation (retrieval_event_id);
CREATE INDEX IF NOT EXISTS activation_game_idx    ON lit.activation (game_id);

-- ---------------------------------------------------------------------
-- 6. Residuals — settlement writes these. Precondition: an activation.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lit.residual (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id     uuid NOT NULL REFERENCES lit.activation(id) ON DELETE CASCADE,
  premise_id        uuid NOT NULL REFERENCES lit.premise(id) ON DELETE CASCADE,
  game_id           text,
  predicted         double precision NOT NULL,   -- what the premise claimed
  actual            double precision NOT NULL,   -- what happened
  residual          double precision NOT NULL,   -- actual - predicted
  outcome_correct   boolean,
  graded_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activation_id)
);

CREATE INDEX IF NOT EXISTS residual_premise_idx ON lit.residual (premise_id);
CREATE INDEX IF NOT EXISTS residual_game_idx    ON lit.residual (game_id);

-- Premise-level running scorecard, maintained by the residual feedback loop.
CREATE TABLE IF NOT EXISTS lit.premise_score (
  premise_id         uuid PRIMARY KEY REFERENCES lit.premise(id) ON DELETE CASCADE,
  activations        integer NOT NULL DEFAULT 0,
  graded             integer NOT NULL DEFAULT 0,
  correct            integer NOT NULL DEFAULT 0,
  mean_residual      double precision NOT NULL DEFAULT 0,
  residual_mse       double precision NOT NULL DEFAULT 0,
  activation_score   double precision NOT NULL DEFAULT 0, -- live weight
  promoted           boolean NOT NULL DEFAULT false,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 7. Causal edges — promoted premises become edges
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lit.causal_edge (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_key        text NOT NULL UNIQUE,
  premise_id      uuid NOT NULL REFERENCES lit.premise(id) ON DELETE CASCADE,
  cause_signal    text NOT NULL,   -- the premise's triggering context
  effect_signal   text NOT NULL,   -- what it claims to move
  effect_estimate double precision,
  effect_unit     text,
  support_n       integer NOT NULL DEFAULT 0,
  promoted_at     timestamptz NOT NULL DEFAULT now(),
  retired_at      timestamptz,
  status          text NOT NULL DEFAULT 'promoted'
                    CHECK (status IN ('promoted','retired','rejected'))
);

CREATE INDEX IF NOT EXISTS causal_edge_premise_idx ON lit.causal_edge (premise_id);
CREATE INDEX IF NOT EXISTS causal_edge_status_idx  ON lit.causal_edge (status);

-- ---------------------------------------------------------------------
-- 8. Intervention tests — do-calculus, promoted edges ONLY
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lit.intervention_test (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_id           uuid NOT NULL REFERENCES lit.causal_edge(id) ON DELETE CASCADE,
  do_value          double precision NOT NULL,
  -- A test that ran but could not conclude (sample too small, no variance)
  -- has NO estimate. The first version of this schema declared estimate
  -- NOT NULL, which meant an inconclusive test could not be recorded at
  -- all -- and the table read 0 rows while the console reported 8 tests.
  -- An inconclusive test IS the evidence that says "collect more", so it
  -- has to be storable.
  estimate          double precision,
  ci_low            double precision,
  ci_high           double precision,
  p_value           double precision,
  method            text NOT NULL,
  n                 integer NOT NULL,
  verdict           text NOT NULL
                      CHECK (verdict IN ('PASS','FAIL','INCONCLUSIVE')),
  reason            text,
  -- The `superseded` flag marks a test whose edge was retired after the
  -- test ran. The row is kept (the test IS the evidence) but it no longer
  -- counts against LAW 4 ("tests run on PROMOTED EDGES ONLY").
  superseded        boolean NOT NULL DEFAULT false,
  computed_at       timestamptz NOT NULL DEFAULT now()
);

-- Idempotent migration for a database created before the `superseded`
-- column existed.
ALTER TABLE lit.intervention_test
  ADD COLUMN IF NOT EXISTS superseded boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS intervention_edge_idx ON lit.intervention_test (edge_id);

-- =====================================================================
-- Retrieval function: top-k over the structured premise index.
-- Uses the HNSW index (ORDER BY embedding <=> $q LIMIT k).
-- =====================================================================
CREATE OR REPLACE FUNCTION lit.retrieve_premises(
  q vector(1024),
  k integer DEFAULT 20,
  pillar text[] DEFAULT NULL,
  min_similarity double precision DEFAULT 0.0
)
RETURNS TABLE (
  premise_id      uuid,
  premise_key     text,
  title           text,
  principle       text,
  domain          text,
  claim_type      text,
  numeric_value   double precision,
  numeric_unit    text,
  influence_direction text,
  how_it_influences text,
  applicable_contexts text[],
  pillar_tags     text[],
  evidence_quote  text,
  similarity      double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id, p.premise_key, p.title, p.principle, p.domain, p.claim_type,
    p.numeric_value, p.numeric_unit, p.influence_direction,
    p.how_it_influences, p.applicable_contexts, p.pillar_tags, p.evidence_quote,
    (1 - (v.embedding <=> q))::double precision AS similarity
  FROM lit.premise_vector v
  JOIN lit.premise p ON p.id = v.premise_id
  WHERE p.structure_state = 'structured'
    AND (pillar IS NULL OR p.pillar_tags && pillar)
    AND (1 - (v.embedding <=> q))::double precision >= min_similarity
  ORDER BY v.embedding <=> q
  LIMIT GREATEST(k, 1);
$$;

-- =====================================================================
-- Discovery retrieval: broader raw corpus, top-k, HNSW.
-- =====================================================================
CREATE OR REPLACE FUNCTION lit.retrieve_corpus(
  q vector(1024),
  k integer DEFAULT 20,
  min_similarity double precision DEFAULT 0.0
)
RETURNS TABLE (
  corpus_id   uuid,
  corpus_key  text,
  title       text,
  source      text,
  abstract    text,
  url         text,
  hit_count   integer,
  similarity  double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.id, c.corpus_key, c.title, c.source, c.abstract, c.url, c.hit_count,
    (1 - (c.embedding <=> q))::double precision AS similarity
  FROM lit.corpus_item c
  WHERE c.embedding IS NOT NULL
    AND (1 - (c.embedding <=> q))::double precision >= min_similarity
  ORDER BY c.embedding <=> q
  LIMIT GREATEST(k, 1);
$$;

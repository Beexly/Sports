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
  -- CLASS-A EXCLUSIVITY (2026-10-20).
  --
  -- The epistemic class the builder assigned to the record, verified
  -- against the document on disk:
  --   CITABLE_VERIFIED         the quote IS verbatim in the named document
  --   HONESTLY_UNCITED_PRIOR    no source document exists
  --   DERIVED_MARKET_SYNTHESIS  synthesised from a market/table row
  --
  -- The default is 'HONESTLY_UNCITED_PRIOR', NOT 'CITABLE_VERIFIED'.
  -- A premise that arrives without a class is a premise whose
  -- provenance is unknown, and the honest default for an unknown
  -- provenance is "unverified". A permissive default here would make
  -- every pre-existing row citable and silently re-open the hole the
  -- L1-L4 gate closed.
  record_class    text NOT NULL DEFAULT 'HONESTLY_UNCITED_PRIOR'
                    CHECK (record_class IN ('CITABLE_VERIFIED',
                                            'HONESTLY_UNCITED_PRIOR',
                                            'DERIVED_MARKET_SYNTHESIS',
                                            'REJECTED_CORRUPT')),
  -- The verification tier the builder stamped. S1_EXACT means the
  -- offsets were computed from the document's own bytes.
  verification_tier text
                    CHECK (verification_tier IS NULL OR
                           verification_tier IN ('MSVH_S0_UNCITED',
                                                 'MSVH_S0_DERIVED_TABLE',
                                                 'MSVH_S1_EXACT',
                                                 'MSVH_S2_NORMALIZED',
                                                 'MSVH_S3_LEVENSHTEIN')),
  -- The STATUS: why the record is or is not admitted. The spec's
  -- filter is `record_class = 'CITABLE_VERIFIED' AND status = 'ACTIVE'`,
  -- and both halves are needed:
  --   record_class says WHAT KIND of record it is
  --   status says WHY it was or was not admitted
  --
  -- A record whose quote IS verbatim in its document but whose claim
  -- does not follow from it is CITABLE_VERIFIED-classed but NOT active,
  -- and the difference is the difference between "we read it" and "it
  -- supports the claim".
  status          text NOT NULL DEFAULT 'UNCITED_NO_SOURCE'
                    CHECK (status IN ('ACTIVE',
                                      'LINK_VERIFIED_SEMANTIC_FAIL',
                                      'UNCITED_NO_SOURCE',
                                      'DERIVED_TABLE',
                                      'CORRUPT_QUOTE')),
  structure_state text NOT NULL DEFAULT 'structured'
                    CHECK (structure_state IN ('structured','raw')),
  content_hash    text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- The columns above are part of CREATE TABLE IF NOT EXISTS, so a
-- deployment that ALREADY has lit.premise keeps its old shape. This
-- section is the migration for those deployments, and it is idempotent
-- so it is safe to run on a fresh database too.
--
-- The DEFAULT matters more than the column: a premise row that exists
-- today -- written before the class system -- has no class, and the
-- honest value for "we do not know whether this has a document behind
-- it" is 'HONESTLY_UNCITED_PRIOR'. Defaulting to 'CITABLE_VERIFIED'
-- would make every pre-existing row citable and silently re-open the
-- hole the L1-L4 gate closed.
ALTER TABLE lit.premise
  ADD COLUMN IF NOT EXISTS record_class text NOT NULL DEFAULT 'HONESTLY_UNCITED_PRIOR';
ALTER TABLE lit.premise
  ADD COLUMN IF NOT EXISTS verification_tier text;
ALTER TABLE lit.premise
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'UNCITED_NO_SOURCE';

-- The CHECK constraints are added separately because ALTER TABLE ADD
-- COLUMN IF NOT EXISTS does not re-run the constraint on a table that
-- already has the column.
DO $$
DECLARE
  r record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'lit.premise'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%record_class%'
  ) THEN
    ALTER TABLE lit.premise
      ADD CONSTRAINT premise_record_class_chk
      CHECK (record_class IN ('CITABLE_VERIFIED',
                               'HONESTLY_UNCITED_PRIOR',
                               'DERIVED_MARKET_SYNTHESIS',
                               'REJECTED_CORRUPT'));
  END IF;
  -- The constraint must be DROPPED and re-added, not merely added when
  -- absent. The guard above only creates it the first time, so widening
  -- the allowed set -- which the corpus needs (it stamps
  -- MSVH_S0_CORRUPT_MARKDOWN_ROW on the 190 records whose "quote" was a
  -- database row) -- would silently not happen on a table that already
  -- has the old, narrower constraint.
  --
  -- The drop is safe: the constraint is re-added immediately with the
  -- full set, and the whole block runs in one transaction, so there is
  -- no window in which the column is unconstrained.
  -- THE GUARD MUST MATCH THE DROP.
  --
  -- This block used to guard the DROP with a check for a constraint
  -- whose DEFINITION mentions 'verification_tier', and then drop a
  -- constraint by the NAME premise_verification_tier_chk. Those are
  -- two different things, and on a FRESH schema they disagree: the
  -- table is created with an inline (unnamed) CHECK, so the
  -- definition-based guard is TRUE and the named DROP then fails
  -- with "constraint premise_verification_tier_chk of relation
  -- premise does not exist".
  --
  -- That is not a cosmetic bug: it means the schema CANNOT BE
  -- APPLIED TO A CLEAN DATABASE AT ALL. The dev branch worked only
  -- because it already had the named constraint from an earlier
  -- deploy. A production deploy -- an empty branch, where the lit
  -- schema does not exist yet -- fails on this line, and it failed
  -- on exactly that line the first time it was run.
  --
  -- So the guard now drops BY NAME, and also handles the inline
  -- (unnamed) constraint that a fresh CREATE TABLE produces. Dropping
  -- the unnamed one is what actually frees the column to be
  -- re-constrained.
  --
  -- The whole block is in one transaction, so there is never a window
  -- in which the column is unconstrained.
  FOR r IN
    SELECT c.conname
      FROM pg_constraint c
     WHERE c.conrelid = 'lit.premise'::regclass
       AND c.contype = 'c'
       AND (c.conname = 'premise_verification_tier_chk'
            OR pg_get_constraintdef(c.oid) ILIKE '%verification_tier%')
  LOOP
    EXECUTE format('ALTER TABLE lit.premise DROP CONSTRAINT %I', r.conname);
  END LOOP;
  ALTER TABLE lit.premise
    ADD CONSTRAINT premise_verification_tier_chk
    CHECK (verification_tier IS NULL OR
           verification_tier IN ('MSVH_S0_UNCITED',
                                 'MSVH_S0_CORRUPT_MARKDOWN_ROW',
                                 'MSVH_S0_DERIVED_TABLE',
                                 'MSVH_S1_EXACT',
                                 'MSVH_S2_NORMALIZED',
                                 'MSVH_S3_LEVENSHTEIN'));
END
$$;

-- The index comes AFTER the ALTER, because on a deployment that already
-- has lit.premise the column does not exist until the ALTER runs.
CREATE INDEX IF NOT EXISTS premise_record_class_idx ON lit.premise (record_class);

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
-- 3b. Discovery hits -- MOVED AFTER lit.retrieval_event.
--
-- This table has a FOREIGN KEY to lit.retrieval_event, so it must be
-- created AFTER it. It used to be declared BEFORE it, which is fine on
-- a branch that already has the table and FAILS on a fresh one: the
-- FK target does not exist yet. The dev branch worked only because it
-- already had lit.retrieval_event from an earlier deploy; a production
-- deploy -- an empty branch -- failed on exactly this line.
--
-- The order of a schema file is part of the schema.
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
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- THE HNSW ef_search, AND WHY IT IS SET HERE.
  --
  -- MEASURED on the production copy of this schema (1,099 class-A
  -- premises, 1,024-dim vectors), probing with each premise's own
  -- embedding and asking for its own key back:
  --
  --   ef_search = 40 (the pgvector DEFAULT)   Recall@20 = 92.000%
  --   ef_search = 100                          Recall@20 = 100.000%
  --
  -- The 8% shortfall is the HNSW APPROXIMATION, not the index and
  -- not the class filter: the exact nearest-neighbour path returns
  -- the same 92% at k=20 AND at k=50, which is the signature of a
  -- truncated candidate list rather than a wrong answer.
  --
  -- So the candidate list was being truncated at 40, and the premise
  -- being looked for was not in it. Raising ef_search fixes it
  -- exactly, which is the proof that the graph was fine.
  --
  -- The plan's "ef_search = 64" is ALSO below the threshold: it
  -- would still miss. 100 is the value that reaches 100%, and it is
  -- set here so EVERY caller gets it -- a caller that forgets to set
  -- it gets 92% and does not know why.
  --
  -- set_config with is_local=true scopes the setting to this
  -- function's execution, so it does not leak into the caller's
  -- session.
  PERFORM set_config('hnsw.ef_search', '100', true);
  RETURN QUERY
  SELECT
    p.id, p.premise_key, p.title, p.principle, p.domain, p.claim_type,
    p.numeric_value, p.numeric_unit, p.influence_direction,
    p.how_it_influences, p.applicable_contexts, p.pillar_tags, p.evidence_quote,
    (1 - (v.embedding <=> q))::double precision AS similarity
  FROM lit.premise_vector v
    JOIN lit.premise p ON p.id = v.premise_id
  WHERE p.structure_state = 'structured'
    -- CLASS-A EXCLUSIVITY (2026-10-20). This is the spec's
    -- `WHERE record_class = 'CITABLE_VERIFIED' AND status = 'ACTIVE'` on
    -- the HNSW premise index. It is HERE, at the retrieval function,
    -- because this is where an unverified premise becomes a live
    -- activation that can carry a numeric delta into a reasoning claim.
    --
    -- Both halves are needed. The CLASS says what kind of record it
    -- is; the STATUS says why it was or was not admitted. A record whose
    -- quote is verbatim in its document but whose claim does not follow
    -- from it is CITABLE_VERIFIED-classed and NOT active, and the
    -- difference is the difference between "we read it" and "it
    -- supports the claim".
    --
    -- Before it, the index returned every structured premise, including
    -- the 3,509 whose quotes were in no document and the 1,704 whose
    -- numbers were nowhere near the quote.
    --
    -- The columns' DEFAULTs are the honest ones, so a premise inserted
    -- without a class or a status is excluded here rather than admitted
    -- by omission.
    AND p.record_class = 'CITABLE_VERIFIED'
    AND p.status = 'ACTIVE'
    AND (pillar IS NULL OR p.pillar_tags && pillar)
    AND (1 - (v.embedding <=> q))::double precision >= min_similarity
  ORDER BY v.embedding <=> q
  LIMIT GREATEST(k, 1);
END;
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

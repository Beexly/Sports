-- =====================================================================================
-- 20261020 -- THE HONESTY CONSTRAINT ON lit.premise
--
-- WHY THIS MIGRATION EXISTS
--
-- The goal spec requires a hard DB-level honesty invariant:
--
--   chk_citable_verified_honesty CHECK (
--     (record_class = 'CITABLE_VERIFIED'
--       AND citable = TRUE
--       AND verification_tier = 'MSVH_S1_EXACT'
--       AND evidence_start_char IS NOT NULL AND evidence_end_char > evidence_start_char
--       AND mechanism_start_char IS NOT NULL AND mechanism_end_char > mechanism_start_char)
--     OR
--     (record_class <> 'CITABLE_VERIFIED'
--       AND citable = FALSE
--       AND verification_tier <> 'MSVH_S1_EXACT'
--       AND evidence_start_char IS NULL AND evidence_end_char IS NULL)
--   )
--
-- Production had NONE of it. `lit.premise` had no `citable` column, no
-- span columns at all, and no such constraint -- so the L3 anchor
-- EVIDENCE was not even stored. A record could be stamped
-- CITABLE_VERIFIED / MSVH_S1_EXACT with no offsets behind it, and the
-- database would have accepted it. The class was a LABEL.
--
-- This is the defect class the whole audit is about, one level down:
-- a field that reads as a gate while gating nothing.
--
-- WHY THE SPAN COLUMNS MUST BE ADDED FIRST
--
-- The constraint needs `evidence_start_char` / `evidence_end_char` /
-- `mechanism_start_char` / `mechanism_end_char`. They do not exist, so
-- the constraint cannot be written without them. Adding the columns
-- STORES the L3 anchor, which is the thing that makes the class
-- checkable rather than declarative.
--
-- THE BACKFILL IS FROM THE CORPUS, AND IT IS SAFE
--
-- Measured over the corpus file (packages/prediction-engine/data/
-- MIND_CORPUS_3000.jsonl), all 5,303 rows satisfy the spec's
-- invariant as written:
--
--     branch 1 (CITABLE_VERIFIED):  1,098 rows
--     branch 2 (everything else):   4,205 rows
--     satisfying NEITHER branch:        0 rows
--
-- So the constraint can be added VALIDATED without rejecting a single
-- legitimate row, and without a NOT VALID step.
--
-- The non-class-A rows carry spans as {"start_char": null,
-- "end_char": null, ...} in the corpus, which is exactly what the
-- second branch requires (IS NULL). The 2,674
-- LINK_VERIFIED_SEMANTIC_FAIL rows are NOT affected: their quotes are
-- byte-exact in their documents, so they keep REAL spans, and they
-- fail a LATER layer (L4), not L3. Forcing their spans to NULL would
-- destroy the very evidence that distinguishes them from the 397
-- UNCITED_NO_SOURCE rows.
--
-- THE TEST ROW IS LEFT ALONE ON PURPOSE
--
-- `lit.premise` currently holds one row with
-- premise_key = 'test:class_a:citable' (source = 'test'), left behind
-- by reconciliation/apply_and_verify_class_a_schema.mjs, which inserts
-- five test premises and never deletes them. It IS stamped
-- CITABLE_VERIFIED / MSVH_S1_EXACT but has no corpus row, so the
-- backfill leaves its spans NULL -- which would VIOLATE branch 1.
--
-- It is therefore DELETED here, and the script that creates it is
-- fixed to clean up after itself. Leaving it would mean either
-- weakening the constraint or carrying a test fixture in production.
-- It is inert (its embedding is 1,024 dimensions of ZERO, so cosine
-- similarity is NaN and retrieve_premises can never return it), but
-- inert is not the same as absent.
-- =====================================================================================

BEGIN;

-- -------------------------------------------------------------------------------------
-- 1. The columns the constraint needs.
-- -------------------------------------------------------------------------------------
ALTER TABLE lit.premise
  ADD COLUMN IF NOT EXISTS citable                boolean,
  ADD COLUMN IF NOT EXISTS evidence_start_char    integer,
  ADD COLUMN IF NOT EXISTS evidence_end_char      integer,
  ADD COLUMN IF NOT EXISTS mechanism_start_char   integer,
  ADD COLUMN IF NOT EXISTS mechanism_end_char     integer;

COMMENT ON COLUMN lit.premise.citable IS
  'Whether this premise may be cited for a numeric delta. TRUE only for CITABLE_VERIFIED. '
  'Derived from the corpus builder; enforced by chk_citable_verified_honesty.';
COMMENT ON COLUMN lit.premise.evidence_start_char IS
  'L3 anchor: the byte/char offset in the source document at which evidence_quote begins. '
  'NULL means the quote was never located in a document.';
COMMENT ON COLUMN lit.premise.mechanism_start_char IS
  'L3 anchor for the mechanism quote. NULL means it was never located.';

-- -------------------------------------------------------------------------------------
-- 2a. The staging table the corpus is loaded into.
--
-- reconciliation/load-corpus-backfill.mjs reads the corpus JSONL and
-- COPYs it into this table. It is TEMPORARY in the loader's session
-- and PERMANENT here so the backfill and the constraint can see it
-- across the two statements.
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lit._corpus_backfill (
  premise_key           text PRIMARY KEY,
  record_class          text NOT NULL,
  verification_tier     text,
  status                text,
  citable               boolean,
  evidence_start_char   integer,
  evidence_end_char     integer,
  mechanism_start_char  integer,
  mechanism_end_char    integer
);

-- -------------------------------------------------------------------------------------
-- 2b. The backfill, from the corpus.
--
-- The corpus is the source of truth for the class, the citable flag and
-- the spans; the database was stamped from it by the builder. The
-- backfill makes the stored row carry the SAME evidence the corpus
-- does, so the constraint below is a check on the data rather than a
-- declaration about it.
--
-- THE KEY SHAPE: the corpus's key is the bare `item_id`, and the
-- database's `premise_key` is `mind:` + that id. The join is
-- therefore on `'mind:' || c.premise_key`. Joining on the bare id
-- matches NOTHING, which shows up as the constraint refusing on
-- hundreds of class-A rows whose spans are NULL -- the symptom of a
-- join that silently matched zero rows rather than a data problem.
-- The dev branch is where that mistake was made and caught.
-- -------------------------------------------------------------------------------------
UPDATE lit.premise p
   SET citable              = c.citable,
       verification_tier    = c.verification_tier,
       record_class         = c.record_class,
       status               = c.status,
       evidence_start_char  = c.evidence_start_char,
       evidence_end_char    = c.evidence_end_char,
       mechanism_start_char = c.mechanism_start_char,
       mechanism_end_char   = c.mechanism_end_char
  FROM lit._corpus_backfill c
 WHERE ('mind:' || c.premise_key) = p.premise_key;

-- -------------------------------------------------------------------------------------
-- 3. The constraint itself.
--
-- ADD CONSTRAINT (as opposed to ADD CONSTRAINT ... NOT VALID) makes
-- Postgres check EVERY existing row, so a bad row is a HARD FAILURE at
-- migration time rather than a surprise later. That is the point: the
-- constraint is not a declaration, it is a measurement that the data
-- passes.
--
-- (`VALID` is not a keyword here -- it only qualifies a `NOT VALID`
-- constraint, and this one is not `NOT VALID`.)
-- -------------------------------------------------------------------------------------
-- -------------------------------------------------------------------------------------
-- 3b. The test fixture, removed BEFORE the constraint is added.
--
-- It is deleted rather than exempted. Exempting a test row from the
-- honesty constraint would put a hole in the one constraint that
-- matters, and the row is a fixture with no source document.
--
-- It has to go FIRST: the two surviving fixtures are stamped
-- CITABLE_VERIFIED with no spans behind them, so the constraint
-- correctly refuses them. MEASURED on the dev branch: with the
-- backfill in place, exactly TWO rows violate the invariant, and both
-- are `test:class_a:*` fixtures. Deleting them first is what lets the
-- constraint be added VALIDATED -- which is the point: the constraint
-- checks every row, and it checks them CLEANLY.
--
-- The script that creates them must clean up after itself. That is
-- fixed separately in reconciliation/apply_and_verify_class_a_schema.mjs.
-- -------------------------------------------------------------------------------------
DELETE FROM lit.premise_vector WHERE premise_id IN (
  SELECT id FROM lit.premise WHERE premise_key LIKE 'test:class_a:%'
);
DELETE FROM lit.causal_edge WHERE premise_id IN (
  SELECT id FROM lit.premise WHERE premise_key LIKE 'test:class_a:%'
);
DELETE FROM lit.premise WHERE premise_key LIKE 'test:class_a:%';

ALTER TABLE lit.premise
  DROP CONSTRAINT IF EXISTS chk_citable_verified_honesty;

ALTER TABLE lit.premise
  ADD CONSTRAINT chk_citable_verified_honesty CHECK (
    (
      record_class = 'CITABLE_VERIFIED'
      AND citable IS TRUE
      AND verification_tier = 'MSVH_S1_EXACT'
      AND evidence_start_char IS NOT NULL
      AND evidence_end_char > evidence_start_char
      AND mechanism_start_char IS NOT NULL
      AND mechanism_end_char > mechanism_start_char
    )
    OR
    (
      record_class <> 'CITABLE_VERIFIED'
      AND citable IS NOT TRUE
      AND verification_tier IS DISTINCT FROM 'MSVH_S1_EXACT'
      AND evidence_start_char IS NULL
      AND evidence_end_char IS NULL
      AND mechanism_start_char IS NULL
      AND mechanism_end_char IS NULL
    )
  );

-- The staging table has done its work.
DROP TABLE IF EXISTS lit._corpus_backfill;

COMMIT;

-- =====================================================================================
-- VERIFICATION (run after the migration):
--
--   SELECT count(*) FROM lit.premise WHERE premise_key LIKE 'test:%';   -- must be 0
--   SELECT record_class, count(*) FROM lit.premise GROUP BY 1;
--   -- every CITABLE_VERIFIED row must have both spans:
--   SELECT count(*) FROM lit.premise
--    WHERE record_class = 'CITABLE_VERIFIED'
--      AND (evidence_start_char IS NULL OR mechanism_start_char IS NULL);  -- must be 0
-- =====================================================================================

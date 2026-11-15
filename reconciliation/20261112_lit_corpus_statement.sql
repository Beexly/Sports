-- Statements harvested from the book corpus by the lane deep-read.
--
-- Distinct from lit.situation: that table holds evidence-quoted football
-- situation -> decision -> lesson triples produced by the vision/LLM pass.
-- This table holds the raw statement harvest, which is overwhelmingly
-- mathematics (probability, information theory, optimisation) with a small
-- sports slice. Keeping them apart stops the maths from being mistaken for
-- football knowledge.
--
-- domain_tags is a text[] so a caller can filter to sports without scanning.

CREATE TABLE IF NOT EXISTS lit.corpus_statement (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    book         text NOT NULL DEFAULT '',
    author       text NOT NULL DEFAULT '',
    year         integer,
    file         text NOT NULL DEFAULT '',
    md5          text NOT NULL DEFAULT '',
    page         integer,
    statement    text NOT NULL,
    kind         text NOT NULL DEFAULT '',
    situation    text NOT NULL DEFAULT '',
    domain_tags  text[] NOT NULL DEFAULT '{}',
    lane         text NOT NULL DEFAULT '',
    source       text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT statement_unique UNIQUE (md5, page, statement)
);

CREATE INDEX IF NOT EXISTS statement_domain_idx ON lit.corpus_statement USING gin (domain_tags);
CREATE INDEX IF NOT EXISTS statement_kind_idx   ON lit.corpus_statement (kind);
CREATE INDEX IF NOT EXISTS statement_book_idx   ON lit.corpus_statement (book);
CREATE INDEX IF NOT EXISTS statement_fts_idx
    ON lit.corpus_statement USING gin (to_tsvector('english', statement));

COMMENT ON TABLE lit.corpus_statement IS
    'Raw statement harvest from the book lanes. Mostly mathematics; filter on '
    'domain_tags @> ARRAY[''sports''] for the football slice.';

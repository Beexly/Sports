-- Situational and lesson records extracted from the corpus.
--
-- A "situation" is a football/analytics problem statement grounded in a source
-- chunk. A "lesson" is the transferable principle that chunk states. Keeping
-- them in one row preserves the link rather than losing it in a summary.
--
-- evidence_quote is the verbatim span the claim came from, so a reader can
-- check the model did not invent it. Rows without a quote are rejected by the
-- CHECK constraint.

CREATE TABLE IF NOT EXISTS lit.situation (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    corpus_key    text    NOT NULL,
    chunk_index   integer NOT NULL,
    source        text    NOT NULL,
    domain        text    NOT NULL,
    situation     text    NOT NULL,
    decision      text    NOT NULL DEFAULT '',
    lesson        text    NOT NULL DEFAULT '',
    evidence_quote text   NOT NULL,
    model         text    NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT situation_has_evidence CHECK (length(evidence_quote) >= 20),
    CONSTRAINT situation_unique UNIQUE (corpus_key, chunk_index, situation)
);

CREATE INDEX IF NOT EXISTS situation_domain_idx ON lit.situation (domain);
CREATE INDEX IF NOT EXISTS situation_key_idx    ON lit.situation (corpus_key);
CREATE INDEX IF NOT EXISTS situation_fts_idx
    ON lit.situation USING gin (to_tsvector('english', situation || ' ' || decision || ' ' || lesson));

COMMENT ON TABLE lit.situation IS
    'Situation -> decision -> lesson triples extracted from corpus chunks, each '
    'pinned to a verbatim evidence quote. Checkable, not summarised.';

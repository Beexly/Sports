-- Equation store.
--
-- Equations have lived only as JSONL on disk (jev-pipeline and agent-bus), so
-- nothing could join them to the corpus or search them. This makes them a
-- first-class table alongside lit.corpus_chunk and lit.situation.
--
-- Identity is (arxiv_id, equation_hash) where equation_hash is md5 of the
-- whitespace-normalised LaTeX. The same equation appearing twice in one paper
-- (a restated display equation) collapses to one row.

CREATE TABLE IF NOT EXISTS lit.equation (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    arxiv_id      text NOT NULL,
    paper_title   text NOT NULL DEFAULT '',
    file_path     text NOT NULL DEFAULT '',
    sha256        text NOT NULL DEFAULT '',
    equation      text NOT NULL,
    equation_hash text NOT NULL,
    kind          text NOT NULL DEFAULT 'display',
    source        text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT equation_unique UNIQUE (arxiv_id, equation_hash),
    CONSTRAINT equation_kind_check CHECK (kind IN ('display', 'inline'))
);

CREATE INDEX IF NOT EXISTS equation_arxiv_idx ON lit.equation (arxiv_id);
CREATE INDEX IF NOT EXISTS equation_fts_idx
    ON lit.equation USING gin (to_tsvector('simple', equation));

COMMENT ON TABLE lit.equation IS
    'LaTeX equations extracted from arXiv e-print source only. PDF-derived math '
    'is a recorded corruption path and is deliberately absent.';

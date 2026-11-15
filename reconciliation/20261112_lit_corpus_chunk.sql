-- Chunk-level corpus index.
--
-- lit.corpus_item holds one vector per document, which cannot answer
-- "where in which book does it say X". This table holds one vector per chunk.
--
-- Idempotent: chunk identity is (corpus_key, chunk_index). Re-chunking a
-- document with a different window size must delete the old chunks first,
-- which is why source carries the chunker version.

CREATE TABLE IF NOT EXISTS lit.corpus_chunk (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    corpus_key      text        NOT NULL,
    chunk_index     integer     NOT NULL,
    source          text        NOT NULL,
    title           text        NOT NULL DEFAULT '',
    section         text        NOT NULL DEFAULT '',
    chunk_text      text        NOT NULL,
    char_start      integer     NOT NULL DEFAULT 0,
    char_end        integer     NOT NULL DEFAULT 0,
    token_estimate  integer     NOT NULL DEFAULT 0,
    embedding       vector(1024),
    embedding_model text,
    embedded_at     timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT corpus_chunk_unique UNIQUE (corpus_key, chunk_index)
);

CREATE INDEX IF NOT EXISTS corpus_chunk_hnsw_idx
    ON lit.corpus_chunk USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS corpus_chunk_key_idx  ON lit.corpus_chunk (corpus_key);
CREATE INDEX IF NOT EXISTS corpus_chunk_src_idx  ON lit.corpus_chunk (source);

COMMENT ON TABLE lit.corpus_chunk IS
    'Chunk-level vector index over the GSE corpus. One row per ~1500-char window. '
    'source records the chunker version so a re-chunk can delete its predecessor.';

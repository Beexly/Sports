-- ============================================================================
-- GSE film shadow ledger — CV-to-engine bridge scoring record
-- ============================================================================
-- BRANCH-ONLY TESTING RULE (Garrett, HARD 2026-09-28):
--   Writer and migration tests run ONLY on throwaway Neon branches
--   (auto-expire 7d). NEVER apply this schema to the default branch from
--   an agent session. Creating the throwaway branch needs a Neon API key
--   (founder-gated); until then this file is documentation + review.
--
-- WHAT THIS STORES: one row per subject per slate per lane — the control
-- arm (what the engine ships today), the treatment arm (what film
-- suggests), the film prior, the weight (0 until validated), the
-- realized outcome once graded. Intelligence only: no raw frames, no
-- methodology, nothing that could surface publicly.
--
-- CALIBRATION DOCTRINE: every row is UNCALIBRATED until the calibrate
-- step of the loop (research → wire → weight → calibrate → test →
-- polish) fits weights on held-out slates. weight stays 0 until then.
-- ============================================================================

CREATE TABLE IF NOT EXISTS film_shadow_ledger (
  row_id            TEXT PRIMARY KEY,              -- slateId:lane:subjectId:market
  slate_id          TEXT NOT NULL,                 -- e.g. "2024-w07-props"
  lane              TEXT NOT NULL,                 -- props | fantasy | picks
  subject_id        TEXT NOT NULL,                 -- playerId or team abbrev
  market            TEXT NOT NULL,                 -- receiving_yards_over | anytime_td | ...
  line              REAL,                          -- market line, if any

  control_prob      REAL NOT NULL,                 -- engine on today's inputs (ships)
  treatment_prob    REAL NOT NULL,                 -- engine on film-augmented inputs
  film_prior        REAL,                          -- film-derived P(hit), UNCALIBRATED
  weight            REAL NOT NULL DEFAULT 0,       -- literal 0 until validated

  blended_prob      REAL NOT NULL,                 -- published P; = control at w=0
  delta             REAL NOT NULL,                 -- blended - control (0 at w=0)
  would_be_delta_w1 REAL NOT NULL,                 -- treatment - control (research signal)

  actual            REAL,                          -- realized outcome; NULL until graded
  control_correct   INTEGER,                       -- 1/0/NULL

  calibration       TEXT NOT NULL DEFAULT 'UNCALIBRATED',
  provenance        JSONB,                         -- {source:'film', plays, confidence}
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shadow_ledger_slate
  ON film_shadow_ledger (slate_id);
CREATE INDEX IF NOT EXISTS idx_shadow_ledger_subject
  ON film_shadow_ledger (subject_id, market);
CREATE INDEX IF NOT EXISTS idx_shadow_ledger_graded
  ON film_shadow_ledger (slate_id) WHERE actual IS NOT NULL;

-- Guardrail view: any row with weight != 0 is a policy violation until
-- the calibrate step explicitly authorizes it in a reviewed migration.
CREATE OR REPLACE VIEW v_shadow_weight_violations AS
SELECT row_id, slate_id, lane, subject_id, market, weight, calibration
FROM film_shadow_ledger
WHERE weight != 0;

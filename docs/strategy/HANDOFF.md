# HANDOFF

Dated entries only. Each entry carries what changed, what was proven, what was not, and what the
next role must do. See `ORG.md` for the contract.

---

## 2026-10-28 / 2026-10-29 (UTC) — Master Corpus, Coach-Scheme-Player-Fit Engine & Commercial Package Builder

**Changed:**
- `packages/prediction-engine/src/coach-sim/coach-scheme-player-fit-engine.ts` (+ `.test.ts`)
- `packages/prediction-engine/src/coach-sim/index.ts`, `src/engine/coach-projection.ts`, `src/reasoning/arxiv-reasoning-bridge.ts` (+ `.test.ts`), `src/decision/2001-09097v1-gap-stat-ratings.ts` (`ENABLED = true`)
- Resolved all 38 TypeScript errors across 11 files in `packages/prediction-engine/src/` and all 5 dead threshold exports flagged by `reconciliation/_audit_unenforced_thresholds.mjs`.
- `scripts/ops/harvest_openalex_arxiv_master.py`, `scripts/ingest-hf-and-kaggle-nfl-corpus.py`, `scripts/build-gse-coach-brain-sft-corpus.py`, `scripts/compile-coach-brain-corpus.py`, `scripts/train-coach-brain-lora.py`, `scripts/generate-commercial-packages.ts`, `scripts/guardrails/agent-bus-sync.mjs`.
- Added mind feeds under `brain/feeds/2026-10-28/` (`hf_ultrascale_playbook_feed.jsonl` [50], `openalex_arxiv_nfl_coaching_scheme_fit_feed.jsonl` [761], `kaggle_20_kernels_bdb_physics_feed.jsonl` [31], `hf_34_datasets_empirical_feed.jsonl` [34]) and compiled `data/llm/gse-coach-brain-v1-sft.jsonl` (`6,469` records).

**Proven:**
- `npx tsc --noEmit` in `packages/prediction-engine` exits 0 (`0` errors).
- `node reconciliation/_audit_unenforced_thresholds.mjs` exits 0 (`T12 GATE PASS`).
- `python scripts/ingest-hf-and-kaggle-nfl-corpus.py --verify-firewall --assert-perturbation` exits 0 (`20` Zone 1/2 files with `0` market columns; `3,078` pre-cutoff and `272` holdout games bitwise invariant).
- `python scripts/verify-corpus-count.py` exits 0 (`2,446` canonical papers preserved).
- All 4 commercial packages generated deterministically in `data/packages/2026-10-28-commercial-packages.json`.

**Not proven:**
- Live GPU execution of `train-coach-brain-lora.py` on the expanded `6,146`-record train split (verified via `--dry_run` and Ultra-Scale Playbook VRAM accounting `33.498 GB`).

**Next role (Trainer / Verifier):**
- Run full LoRA fine-tuning on `data/coach-brain/coach-brain-train.jsonl` (`6,146` records) and grade Sunday Week 8 post-game residuals.

---

## 2026-10-28 — Verifier

**Changed:** nothing (verification role). Read `engine-reasoning-audit-2026-10-28.md`.

**Proven:** the coach lock is odds-free by type (`CoachLockPacket` has no odds field) and
`readCoachLock` is the first statement of `scoreSpreadPick`. The simulation runs through
`coach-projection → coach-sim → locked-projection → simulateCoachGame`. All six factor builders are
invoked once each. Measured: `coachSupport` −5.0 → shift −0.75 against a stub of 3 →
`coachOverridesStub: false`.

**Not proven:** that the projection is accurate for any team — it is not, because `pointLocation`
takes only `coachSupport` and `injuryDropOff`.

**Next role (Builder):** feed `pointLocation` from 2026 pbp team EPA and pace so margin and total
start from the matchup instead of the constants 3 and 46.5.

---

## 2026-10-28 — Librarian

**Changed:** `docs/strategy/ORG.md`, `docs/strategy/engine-reasoning-audit-2026-10-28.md`,
`scripts/guardrails/definition-of-done.mjs`, this file.

**Proven:** the DoD gate runs and reports four conditions; `--check` mode never fails.

**Not proven:** that the roles are adopted. That is a habit, not a file.

**Next role (any):** take one role, not two. Hand off with all four fields.

## 2026-10-30 (UTC) — Member card scope disclosure + ledger gaps

**Changed:** `data/content-os/vip-vault/week8-nova-2026-10-29/FULL-360-CARD-CAR-GB-2026-10-29.md`,
`.../FIRST-HALF-CARD-CAR-GB-2026-10-29.md`, `data/engine/new_engine_official_ledger_2026.json`,
`docs/predictions/research/2026-10-29/NEW-ENGINE-OFFICIAL-LEDGER-16-5.md`.

**What was wrong:** the TNF card told members "All plays below are logged PENDING in the ledger and
graded immediately after the game." It prints 59 PLAY rows; the canonical ledger carries 21. The
38 remaining plays were sold with no stake and no grading, so the `16-5` record would only ever
describe a third of what a member received. Both card headers and the ledger now state the split:
21 unit-staked plays count toward the record, 38 are reference-graded only. A `card_scope` block
in the ledger JSON carries the same counts in machine-readable form. No pick, line, rating or
stake was changed, and no gate or env flag was touched.

**Also recorded, not fixed:** the `16-5` aggregate has no per-pick history in either the doc or
the JSON, so it cannot be reconstructed from its own canonical source; `CAR-GB-02` sells
`UNDER 46.5` while displaying the `+5.62c` edge the sim measured at 47.5, so its edge at the sold
line is unmeasured; and the two 10,000-sim cadence ticks for this fixture picked opposite sides on
both spread and total within 14 hours (edge 1.67% vs 8.62%).

**Proven:** the JSON parses and carries the new key; the counts are parsed from the card itself
(59 PLAY rows via literal `**PLAY` count, 21 ledger entries); the vault path is not under
`apps/web/public`, so nothing was exposed publicly.

**Not proven:** that 21 is the right subset to record-count — that is a product decision, and it is
the owner's. Nothing was graded tonight; the card went to members before kickoff.

**Next role (Owner):** decide whether the record should track 21 staked plays or all 59, and write
down the 21 settled picks behind `16-5` so the aggregate stops being an attestation.

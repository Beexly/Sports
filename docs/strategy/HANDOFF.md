# HANDOFF

Dated entries only. Each entry carries what changed, what was proven, what was not, and what the
next role must do. ---

## 2026-11-03 — GPP conservation coupling, no MNF

**Changed:** `scripts/ops/pbp_conservation_coupling.py` is now what `run_full_dk_bitemporal_gpp.py` calls. Conserved PBP yards are no longer rescaled onto the static mean. A missed JEV call returns `DEGRADED_UNVERIFIED` / `PASS_FRAGILE` instead of `LOCK_TOURNAMENT_ALPHA` and 0.86. Showdown salary floor is clamped to $48,000. ESPN Week 8 finals are in `data/engine/espn_week8_finals_2026-11-02.json`.

**Proven:** `python -m pytest tests/test_pbp_conservation_coupling.py -q` — 5 passed. Ja'Marr Chase receiving line in that ESPN extract is 11/141/1, 34.1 classic DK points. Zay Flowers is 0/0/0.

**Not proven:** The TypeScript vitest timeout and feed-dirtying fix are still an open lane in this worktree. Do not treat those dirty files as mine. MNF was not run. The ESPN file is skill-category classic scoring only; it does not include fumbles or DST, so it is not an official DK contest score.

**Next role:** Do not start CHI @ SEA until the remaining engine suite is green. Leave `packages/prediction-engine` and `packages/ingestion-pipeline/src/process-sport.ts` to the lane already editing them.

---

## 2026-11-02 — Week 8 forensic kernels on hermes/week8-forensic-tracks-1-3

**Changed:** Empirical-Bayes shrink, ownership penalty, inactive hard-zero, and single-pass injury stamp are called from the DK slate builder and injury overlay. PBP receiving yards are allocated by share instead of a post-sim lognormal draw. Cognitive router clamps quarantined equations to zero log-odds. Gate override requires a verified line or roster delta. `gpp_architecture.py` now lives at `intelligence/dfs/gpp_architecture.py` (same bytes as the Downloads copy). The DK optimizer no longer imports it from `C:/c/wt-sports`.

**Proven:** pytest tests/test_trench_pocket_physics.py tests/test_week8_post_slate_fixes.py tests/test_trench_pipeline_integration.py tests/test_mind_guardian.py — 14 passed. npm test --prefix packages/mcp-equations-server — 60 passed, then the quarantine clamp test passed (11/11 on the router file). FWL residualization and calibration-map tests passed.

**Not proven:** npm test --prefix packages/prediction-engine did not finish. Two runs hit the tool timeout while still passing the tests they had reached. The in-loop rng.normal yardage draw in gse_coach_mind_simulator.py is still there. trainer_feed.jsonl is gitignored, so CI will not see that copy.

**Next role:** Finish the prediction-engine suite, or accept the timeout as a pre-existing duration problem. Do not treat this branch as a published pick path.

---

## 2026-11-01 — Cadence v4.0 T-90 game-day lock refresh (SUN_EARLY + SUN_LATE)

**Changed:** `scripts/ops/run_cadence_v40_gameday_lock.py` — repaired the summary print that crashed the run *after* its report was already written. The print read `surprise_flips_vs_stored`, a key `availability_refresh` stopped emitting when the diff split into `stored_names_absent_from_refresh` + `newly_listed_not_in_stored_subset`. The script was untracked; it is now tracked so the runner is not a local-only file. Landed both W8 reports: `docs/predictions/research/2026-11-01/cadence_v40_gameday_lock_sun_early_w8.json` (10:30 CT) and `..._sun_late_w8.json` (13:35 CT).

**Proven:** Re-run of the fixed script exits 0 and prints `T-90 refresh: 21 designations applied across 3 games, 0 fetch errors, 11 stored names absent from refresh, 17 newly listed`. Seal unchanged — merkle `23245bcbba04f147…`, tau 0.42, all four lineage checks true; no `seal()` call exists in the file. Conformal diagnostic n=14, band ±3.2423, coverage 1.0, 0 flagged. SUN_LATE polled 3 games (LAC@LAR, KC@DEN, NE@MIA) at HTTP 200 with 0 fetch errors. The one in-slot "absent" name is RJ Harvey (DEN), who moved from the Friday game-designation `Out` to ESPN roster status `Injured Reserve` — still unavailable, so not a flip toward active. Locked-card team labels match the live ESPN blocks; the 2026 dataset simply carries different rosters than 2024 reality, so no parsing corruption.

**Not proven:** The conformal band is degenerate by construction — qLevel saturates at 1.0 for n≤18 at alpha=0.1, so the band equals max|residual| and zero flags is mathematically forced. Coverage 1.0 is NOT evidence of calibration. Also unproven: that "11 stored names absent from refresh" means anything slate-wide — 10 of the 11 play in games this slot never polled; the stored snapshot is slate-wide while the refresh is slot-scoped, so the headline count is a scope artifact.

**Next role (Owner):** Review and push — the commit is local per Law 1. Consider making the diff like-for-like (slot-scoped stored vs slot-scoped refresh) so the absent-names count stops reading as a slate-wide status change. Note the DoD gate's handoff check keys on UTC `new Date()`, so every commit day needs an entry here or the hook blocks.

---

## 2026-10-31 — finished Carolina at Green Bay pack taken off sale

**Changed:** apps/web/lib/packages/catalog.ts sets forSale false on tnf-all-in-pack. Checkout throws. The pack page shows the final score and no buy button.

**Proven:** ESPN event 401873023 is final, Green Bay 27, Carolina 19, kickoff 2026-10-30T00:15Z.

**Not proven:** The public URL will not change until this reaches main.

**Next:** Re-fetch https://www.galaxysportsedge.com/packages/tnf-all-in-pack and confirm the buy button is gone.


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

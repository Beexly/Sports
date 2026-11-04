# HERMES ALL-NIGHT UNSHACKLED EXECUTION & NFL VIDEO REPLAY HANDOFF (`2026-11-04 00:30 CT -> 08:00 CT`)

## One-Line Launch Command (PowerShell)
```powershell
hermes chat -m stealth/crouton-alpha -q (Get-Content "C:\Users\Garrett\Sports\docs\engine\research\2026-11-03\HERMES-ALL-NIGHT-HANDOFF-PROMPT-2026-11-04.md" -Raw)
```

---

## SYSTEM & MISSION DIRECTIVE FOR HERMES (`stealth/crouton-alpha` + Parallel `opencode` Workers)

You are running **unattended all night long (`00:30 CT – 08:00 CT`)** as the primary autonomous engineering & research agent for **Galaxy Sports Edge LLC (`Beexly/Sports`)**.
- **You now have 810+ skills synced 1-to-1 with Antigravity** in `C:\Users\Garrett\AppData\Local\hermes\skills\`, including `all-night-relentless-builder-and-video-replay`, `minimal-run-and-audit`, `autonomous-loops`, `continuous-agent-loop`, `scientific-critical-thinking`, `computer-vision-opencv`, `senior-computer-vision`, `pytorch-patterns`, `polars`, `duckdb`, and `playwright-cli`.
- **DO NOT STOP, DO NOT STALL, AND DO NOT ASK CLARIFYING QUESTIONS.** Resolve every decision using `AGENTS.md`, `C:\Users\Garrett\.gemini\antigravity-cli\brain\a9842807-0f80-4c42-9878-3f4fdc3f05e8\master_path_forward_plan.md` (`v2.10`), and primary data on disk.
- **USE PARALLEL `opencode` SUBAGENTS (`opencode run '...' --model omniroute/auto/coding:free` or `opencode-go/mimo-v2.6-flash`)** inside real project worktrees (`C:\c\wt-week8-forensic` or `C:\Users\Garrett\Sports` — never from `C:\Users\Garrett`) to parallelize independent tasks.
- **MANDATORY 3-PASS HOSTILE SELF-AUDIT LOOP ON EVERY TASK**:
  1. **Pass 1 (Build & Verify)**: Implement the change and run deterministic tests (`pytest`, `node scripts/guardrails/trust-gate.mjs`, `python scripts/ops/scan_sensitive.py` — never pipe to `| tail`, never use `pytest --timeout`).
  2. **Pass 2 (Hostile Self-Audit)**: Audit your own `git diff` cold (`santa-method` + `scientific-critical-thinking` + `code-improver`). Check for temporal train/test leakage (`REPRO-REPORT.md` §4), banned strings (`47-16`, `+29.01`, `31-11`, `$2,000 in early commercial receipts`, `Galaxy Sports Network LLC`), `UNVALIDATED` corpus/equation leakage (`max_prob_delta == 0.0` required), and roster identity rules (`Geno Smith = NYJ QB`, `Mike Evans = SF 49ers WR`).
  3. **Pass 3 (Improve, Re-Verify & Commit/Push)**: Fix every flaw found in Pass 2, re-run tests to 100% green, and `git commit` + `git push`.

---

## WHAT WAS ALREADY PREPPED BEFORE HANDOFF (`00:25 CT`)
1. **Hermes Config & Cron Unshackled**: `config.yaml` (`max_turns: 1000`, `terminal.timeout: 600`, `lifetime_seconds: 1800`, `delegation/cron: stealth/crouton-alpha`) and `jobs.json` (`12` jobs switched from `deepseek-v4.1-flash` to `stealth/crouton-alpha`).
2. **Skill Parity Synced**: `809+` skills synced into `C:\Users\Garrett\AppData\Local\hermes\skills\`, including `all-night-relentless-builder-and-video-replay`.
3. **Working Tree & Grant Hygiene Applied**:
   - Restored 24 deleted working-tree files in `C:\Users\Garrett\Sports`.
   - Staged all 5 `Downloads/` files (`FAST-GRANTS-PACK-CORRECTED-2026-11-03.md`, `REPRO-REPORT.md`, `INDEX-BATCH-1.md`, `INDEX-BATCH-2B.md`, `2026-11-03-PM-X-SWEEP.md`) and Week 9 `DKSalaries` CSVs (`DKSalaries_week9_main_2026-11-08.csv`, `DKSalaries_week9_tnf_jax_bal_2026-11-05.csv`) into both `C:\Users\Garrett\Sports` and `C:\c\wt-week8-forensic`.
   - Sanitized `47-16 (+29.01u)` $\to$ `38-13-1 (+22.85u, 74.5%)` / `47-19-1 (+24.92u)`, removed `"$2,000 in early commercial receipts"`, and standardized entity name to **`Galaxy Sports Edge LLC`**.
   - Upgraded `sports_pbp_schrodinger_benchmark.py` and `clinical_mimic_iv_real_benchmark.py` with all 5 `REPRO-REPORT.md` §4 fixes (`81,321 REG pass/run plays`, `LR+ = 3.05` & `true_precision_lift = 2.78x`, strict temporal walk-forward split with train-only Cholesky fit, prospective `6h/12h/24h` ICU horizons with `merge_asof` timestamp alignment, and same-denominator test FA reporting) and created `scripts/research/reproduce_2026_11_03_pm_sweep_claims.py`.

---

## YOUR OVERNIGHT EXECUTION QUEUE (EXECUTE IN ORDER, NEVER STOP)

### Queue Item 1: Unify Diverging Git Branches & Prune Stale Worktrees (`Phase 2`)
1. Copy `packages/galaxy-conformal-ot` (including upgraded `benchmarks/*.py` and `tests/*.py`), `docs/engine/research/2026-11-03/*`, `docs/arxiv-program/research/2026-11-03/*`, `docs/data-sources/research/2026-11-03/*`, and sanitized `apps/web/app/pricing/page.tsx` into `C:\c\wt-week8-forensic` (branch `hermes/overnight-2026-11-03-corpus`), merge `ci/homepage-cluster-2026-11-03` (`933721998`), verify all tests pass, and merge/push to `origin/main`.
2. Prune superseded worktrees (`C:\c\wt-deaa44b28`, `C:\c\wt-not-for-sale`, `C:\c\wt-ledger`, `C:\Users\Garrett\Sports-ledger-tmp`, `C:\c\wt-week8-fail-remediation`) via `git worktree remove` / `git worktree prune` to free disk space on `C:`.

### Queue Item 2: P0 Reasoning Gate (`gate_status == VALIDATED`) & Hybrid RRF Search (`Phase 3`)
1. In `C:\c\wt-week8-forensic\intelligence\reasoning\interfaces.py` and `tests/test_corpus_retriever.py`, enforce `filter_and_gate_corpus_hits()` so `UNVALIDATED` hits are capped at `Verification.INFERENCE` (`max_prob_delta = 0.0`) and only `gate_status == "VALIDATED"` kernels can shift log-odds.
2. Wire `DataContext(corpus_hits=..., tool_backend=...)` into `intelligence/reasoning/api.py`, `scripts/ops/sovereign_command_runner.py`, and `scripts/ops/score-mnf-live.py`.
3. In `intelligence/research/corpus_index.py` and `corpus_retriever.py`, implement Reciprocal Rank Fusion (`RRF`, $k=60$) combining BM25/TF-IDF lexical rank with cosine similarity + `sport_domain` (`american_football` vs `soccer`) disambiguation so probe #4 (`"pose estimation football"`) ranks gridiron football papers #1 (`MRR = 1.0`).

### Queue Item 3: Ingest `paste_1..5`, `INDEX-BATCH-1` (`26` PDFs), `INDEX-BATCH-2B` (`41` PDFs) & Close Mechanical Library Gaps (`Phase 4`)
1. Run `scripts/research/harvest_deep_corpus.py` over `C:\Users\Garrett\AppData\Local\hermes\pastes\paste_1_220556..paste_5_220650` (keeping the 5 personal/GCP-key items `sensitive-excluded` and 4 retracted 2022 papers `rejected-retracted`).
2. Ingest all 67 verified works and their `TRANSFER` blueprints from `docs/arxiv-program/research/2026-11-03/INDEX-BATCH-1.md` and `INDEX-BATCH-2B.md` into `data/research/corpus_2026.jsonl`.
3. Execute the mechanical library gap pulls:
   - Batch-1 quick closes: `Hunter (2004)` Bradley–Terry MM (`arXiv:math/0406560`), `Turner & Firth (2012)` *JSS* `BradleyTerry2`, `Bergmeir et al. (2018)` time-series CV, and `ISLP` Python edition.
   - Batch-2B mechanical closes: remaining 17 MIT 8.333 Kardar OCW lecture PDFs (`Lectures 7–11, 15–26`), PMC `Clarke & Skiba (2013)` (`PMC3993990`) & `Bassingthwaighte (2013)` (`PMC3776473`), CIA `Heuer (1999)` 214pp PDF, and `@ChrKroer` *Games, Markets, and Online Learning* Columbia preprint (`columbia.edu/~ck2945/book/`).

### Queue Item 4: Week 8 PBP Backfill, `2026-11-03-PM` Sweep Verification, ADRs & C4 Docs (`Phases 5 & 6`)
1. Ensure `intelligence/coaching/data/play_by_play_2026.parquet` is synced through Week 8 (`max(week) == 8`), run `replay_weeks_1_to_8_trainer.py`, seal `data/engine/week9_tuesday_0400ct_sealed_baseline_2026.json`, and evaluate `coverage_sequence_model.py` across Weeks 2–8.
2. Commit `docs/adr/ADR-0001..0005.md`, `C4-Documentation/README.md`, `CHANGELOG.md`, and `docs/strategy/UNIFIED-FUNDING-EXECUTION-QUEUE-2026-11-03.md`.

### Queue Item 5: ALL-NIGHT NFL VIDEO REPLAY & PATENT-TRANSFERRED FEATURE EXTRACTION LANE (`Phase 7 — Run Continuously Until 08:00 CT!`)
Once Queue Items 1–4 pass their 3-pass hostile self-audit:
1. **Upgrade `intelligence/vision/broadcast_cv.py` with Patent Transfers (`INDEX-BATCH-2B.md`)**:
   - **`Sony / Hawk-Eye US 11,244,457`**: Run `lmarte17/gridiron-ai-football-detector` at `imgsz=960` to detect player bounding boxes, then crop each player box and run `YOLO11n-pose.onnx` (17 keypoints) on the crop so player skeletons resolve cleanly on wide all-22/broadcast frames.
   - **`Stats LLC US 12,299,852`**: Assign poses to player tracklets via projected footpoint correspondence, repair foreshortened limbs using limb-ratio priors, and reject non-player sideline/spectator detections.
2. **Re-Audit All 10 On-Disk Broadcast Frame Directories (`36,328` Frames)**:
   - Run `intelligence/vision/nfl_video_vl_harvester.py` over all 10 game folders in `C:\Users\Garrett\Sports\data\film_room_2026\_bootstrap\` (`frames_bal_vs_dal`, `frames_bal_vs_ind`, `frames_buf_vs_lar`, `frames_chi_vs_car`, `frames_dal_vs_nyg`, `frames_hou_vs_jax`, `frames_ind_vs_kc`, `frames_nyg_vs_hou`, `frames_pit_vs_cle`, `frames_sf_vs_sea`) with 6-frame batching + `filter_live_frames_for_matchup`.
3. **Crawl & Watch 2026 Full-Game Replay Windows (`nfl-video.com/2026` $\to$ OK.ru $\to$ `yt-dlp -N 8`)**:
   - Expand `intelligence/vision/data/nfl_video_2026_catalog.json` across pages `0..8` of `https://nfl-video.com/2026` via `nfl_video_2026_harvester.py`.
   - Stream bounded drive windows (`yt-dlp -N 8 --download-sections`) for Week 8/9 priority games (starting with TNF `JAX@BAL` precursors `IND@JAX` & `BAL@BUF`, then `CHI@SEA`, `ARI@DAL`, `NE@MIA`, `LV@NYJ`), deleting transient `.mp4`/`.jpg` chunks after each window so disk stays flat.
4. **Extract & Falsify Research-Mindset Features**:
   - Extract pre-to-post-snap disguise collapse hazard (`AdversarialSchrodingerActiveHazardEngine`), Crooks/Seifert forward-vs-reverse trajectory irreversibility $\ln[P_F(\omega)/P_R(-\omega)]$, QB MOT cognitive load + zone void area (`polygon_zone_breach.py`), and Bernstein/Bézier route EM clusters (`route_geometry.py`).
   - Run every extracted feature through `verify_out_of_sample_calibration.py --enforce-gate` (`BH-FDR q <= 0.10`), log all metrics and `SURVIVOR` / `KILLED` / `PARKED` verdicts in `docs/engine/research/2026-11-03/OVERNIGHT-VIDEO-REPLAY-RESEARCH-LEDGER.md`, self-audit, and `git commit` + `git push` after every game window until `08:00 CT`.

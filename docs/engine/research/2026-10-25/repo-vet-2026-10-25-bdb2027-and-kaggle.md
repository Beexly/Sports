# Repo & Kaggle Vetting Report — BDB 2027, NGS & Agent Templates (2026-10-25)

## 1. Deduplication & Input Accounting

- **Whitespace-separated tokens pasted**: 33
- **Malformed concatenated token preserved verbatim**: Token #27 (`https://github.com/will-rice/bdb-2027/tree/32994b00e622f0aed6dd1a0e5438494c0637d0c4https://github.com/will-rice/llm-self-improvement-papers`) concatenated the 4th copy of the `will-rice/bdb-2027` commit URL directly onto `https://github.com/will-rice/llm-self-improvement-papers` without a space.
- **Total URL references after splitting token #27**: 34 (4 Kaggle URLs + 30 GitHub URLs)
- **Duplicates removed**:
  - `https://github.com/bernick4-cyber/bigdatabowl2027` pasted twice (#11 and #21)
  - `https://github.com/will-rice/bdb-2027/tree/32994b00e622f0aed6dd1a0e5438494c0637d0c4` pasted 4 times (#24, #25, #26, and left half of #27), all pointing to commit `32994b00e622f0aed6dd1a0e5438494c0637d0c4` of #17 (`will-rice/bdb-2027`)
- **Distinct canonical targets vetted**: **28** (4 Kaggle items + 24 GitHub repositories)

## 2. GitHub Metadata & Verdict Table (24 Distinct Repos, Fetched Live via `gh api`)

| # | Repository | Stars | Last Pushed (UTC) | Language | License | Size (KB) | Verdict | One-Line Rationale & Integration Point |
|---|---|---:|---|---|---|---:|---|---|
| 1 | `Hermes-25/nfl-bdb-2027-mirror-recovery` | 0 | 2026-10-09T01:51:03Z | Jupyter/Python | MIT (code in `LICENSES.md`) / CC-BY-4.0 | 6,331 | **ADOPTED** | Ported `relativeMirrorRecovery`, `shrinkPassBlockPressureRate` (`kappa_0=150`), and `minDetectablePassBlockSnaps` (`N_min=2211`) into `packages/prediction-engine/src/tracking/kinetic-translation-deficit.ts` & `intelligence/vision/bdb2027_kinematics.py`. |
| 2 | `usufalbaz/nfl-big-data-bowl-2027-ktd` | 6 | 2026-10-11T11:28:14Z | Jupyter/Python | MIT | 965 | **ADOPTED (prior)** | Already ported in `packages/prediction-engine/src/tracking/kinetic-translation-deficit.ts` (`kineticTranslationDeficit`). |
| 3 | `sportsdataverse/nfl-ngs-data` | 1 | 2026-10-25T16:52:52Z | Python | NONE | 81,810 | **REFERENCE ONLY (active feed)** | Upstream builder for `sportsdataverse-data` releases (`nfl_ngs_passing/rushing/receiving/pbp_pass/pbp_rush` 2016–2026), already enabled in `packages/data-ingestion/src/source-registry.ts:23-29` (`nflverse_github`). Do not copy unlicensed builder code; consume released parquet/csv assets. |
| 4 | `will-rice/bdb-2027` (incl. tree `32994b00e622f0aed6dd1a0e5438494c0637d0c4`) | 1 | 2026-10-14T07:58:11Z | Jupyter/Python | Apache-2.0 | 1,710 | **CONCEPT ADOPT (recorded)** | Commit `32994b00e622f0aed6dd1a0e5438494c0637d0c4` is the collapsed Open Track submission (`notebooks/frame_first.ipynb` + `tests/test_writeup_provenance.py` provenance gate); WR height/weight vs 40-dash finding already recorded in `BDB2027-BATCH.md`. |
| 5 | `ahanjain97-prog/bdb2027-drive-plus` | 0 | 2026-10-17T16:56:07Z | Jupyter/Python | NONE | 11,936 | **CONCEPT ADOPT** | Unlicensed (all rights reserved, do not copy code); documents DB zone-match `Drive+` combine grade (`c_db_vel`, `c_tau_res`, `c_t5_res`) and reliability-attenuated transfer bounds (`kb/stats/reliability_attenuation.md`). Reimplement math natively if DB combine priors are needed. |
| 6 | `arnabk/bdb2027-forecast-prereg` | 0 | 2026-10-20T12:01:34Z | Markdown/CSV | NONE | 36 | **REFERENCE ONLY** | Public pre-registration mirror of `ahanjain97-prog/bdb2027-drive-plus` containing `forecast_2026_predictions.csv` (Weeks 8–17 2026 rookie/2nd-year predictions) and `prereg_v3.sha256`. |
| 7 | `steventeng2022/Kaggle-NFL-Big-Data-Bowl-2027` | 0 | 2026-10-16T12:01:50Z | Jupyter/Python | NONE | 692 | **CONCEPT ADOPT (QA pattern)** | Unlicensed; shows 10Hz 40-dash peak speed adds `Delta R^2 = +0.042` for deep-route top speed but `+0.001` for route separation; `writeup/verify_writeup_numbers.py` is a clean pattern for auditing prose numbers against JSON outputs. |
| 8 | `takayuki-0127/bdb2027-combine-transfer` | 0 | 2026-10-19T22:50:09Z | Markdown/PNG | NONE | 458 | **REFERENCE ONLY** | 3-minute Japanese summary + 3 PNG charts confirming WR max speed transfers (`r = 0.66`) while initial 10-yard sensor acceleration does not. |
| 9 | `mackman08/nfl-prop-data` | 0 | 2026-10-26T00:07:26Z | Python | NONE | 7,158 | **REFERENCE ONLY (unlicensed)** | GitHub Actions scraper refreshing DraftKings + FanDuel prop snapshots (`odds/nfl_player_props_latest.csv`, `data/nfl_prop_model.txt`). Unlicensed (`NONE`), no historical odds archive; do not vendor scraper code. |
| 10 | `bernick4-cyber/bigdatabowl2027` | 0 | 2026-10-22T19:50:07Z | Python | NONE | 500,408 | **REJECTED BY POLICY** | Unlicensed 500 MB multi-part `.csv.gz.part*` redistribution of raw BDB 2027 competition tracking data (`combine_tracking`, `game_tracking_2023`); violates Kaggle data redistribution rules and repo-vetting policy (`BDB2027-BATCH.md:41`). |
| 11 | `ChristianVaikona/nfl-bdb-2027` | 0 | 2026-10-14T17:33:40Z | Jupyter/Python | MIT | 652 | **SKIP (placeholder code)** | MIT-licensed OL Combine repo, but `src/features.py` (`return df`) and `src/models.py` (`return None`) are unimplemented 3-line placeholders and `README.md` is 0 bytes on `main`. |
| 12 | `CharlesCarr/nfl_nextgen_stats` | 17 | 2023-02-03T16:44:17Z | TypeScript/Python | NONE | 8,022 | **SKIP** | Stale 2023 React/Flask dashboard portfolio project with no license. |
| 13 | `rebrowser/gametime-dataset` | 0 | 2026-10-25T06:21:31Z | None (CSV/Parquet) | NONE | 55,615 | **SKIP** | Secondary-market ticket seat listing promotional sample for `rebrowser.net` (concerts, theater, sports); unlicensed and no predictive line/on-field signal. |
| 14 | `asoler2004/NFL-BIG-DATA-BOWL-2027` | 0 | 2026-10-22T21:31:07Z | Jupyter/Python | NONE | 934 | **SKIP** | Unlicensed local Postgres-to-Apache-Jena RDF (`nfl_graph.ttl`) Streamlit demo. |
| 15 | `Nicholas022400701/bdb27-farm` | 0 | 2026-10-07T03:24:13Z | Python | NONE | 28 | **REJECT (encrypted payload)** | University Track runner where all analysis code is locked inside age-encrypted `.tar.age` archives (`jobs/smoke.tar.age`); zero readable methodology. |
| 16 | `abchoi11/big-data-bowl-2027` | 0 | 2026-10-08T01:58:32Z | None | NONE | 2 | **REJECT (empty stub)** | Contains only `.gitignore` and a 1-line `README.md`. |
| 17 | `CharlieHubbard7/BDB2027` | 1 | 2026-10-09T12:22:48Z | None | NONE | 0 | **REJECT (empty git repo)** | Uninitialized 0-commit repository (GitHub API `/git/trees` returns `HTTP 409 Conflict: Git Repository is empty`). |
| 18 | `asaiie/bdb` | 0 | 2026-10-14T20:18:24Z | None | NONE | 63 | **REJECT (empty skeleton)** | Contains only `.gitkeep` placeholders in `src/` and `data/` with zero code or notebooks. |
| 19 | `will-rice/llm-self-improvement-papers` | 1 | 2026-10-25T04:07:33Z | Python | Apache-2.0 | 187,480 | **REFERENCE ONLY** | Nightly auto-updated markdown index of arXiv papers on self-rewarding/self-improving LLMs; useful only as a literature lookup index for Coach Brain self-play distillation. |
| 20 | `will-rice/autoresearch-papers` | 1 | 2026-10-24T02:35:17Z | Python | Apache-2.0 | 43,100 | **REFERENCE ONLY** | Nightly auto-updated markdown index of arXiv papers on autonomous ML engineering agents (MLE-bench, etc.). |
| 21 | `will-rice/vllm-omni` | 0 | 2026-10-23T22:50:49Z | Python | Apache-2.0 | 97,948 | **SKIP (out-of-domain fork)** | Unstarred fork/clone of `vllm-project/vllm-omni` with video-generator agent skills; not needed for GSE. |
| 22 | `will-rice/kaggle-template` | 0 | 2026-10-15T15:53:43Z | Python | Apache-2.0 | 314 | **SKIP (generic boilerplate)** | Generic Kaggle repository bootstrap template. |
| 23 | `will-rice/agent-harness-template` | 0 | 2026-10-15T15:40:15Z | Python | Apache-2.0 | 57 | **SKIP (generic boilerplate)** | Generic 18-file Pydantic agent harness starter template. |
| 24 | `will-rice/ml-template` | 3 | 2026-10-15T15:34:46Z | Python | Apache-2.0 | 353 | **SKIP (generic boilerplate)** | Generic 17-file PyTorch Lightning project template. |
| 25 | `will-rice/vadkit` | 1 | 2026-10-14T19:37:20Z | TypeScript | MIT | 7,548 | **SKIP (out-of-domain)** | Browser voice activity detection (Silero/WebRTC VAD) npm library; unrelated to sports modeling. |

*(Note: Row 4 covers both `will-rice/bdb-2027` and its 4 repeated commit-tree links `will-rice/bdb-2027/tree/32994b00e622f0aed6dd1a0e5438494c0637d0c4`, so rows 1–25 represent the 24 distinct GitHub repos.)*

## 3. Kaggle Notebooks & Writeups Vetting Table (4 Items, Fetched via Kaggle API)

| # | Kaggle Target | Author | Type | Verdict | One-Line Rationale & Policy Check |
|---|---|---|---|---|---|
| 1 | `code/sharpapi/sports-betting-odds-getting-started` | `sharpapi` | Notebook (`6,685` chars) | **REJECTED BY POLICY** | Promotional tutorial for `sharpapi.io` (`datasetDataSources: ['sharpapi/sports-betting-odds-2026-world-cup-mlb']`); explicitly blocked by `packages/data-ingestion/src/source-registry.ts:37-43` (`sharp_api: PAID_BLOCKED`) and `sharp-api-client.ts:1-6`. |
| 2 | `code/asavaratakar/new-benchmark-task-9611d` | `asavaratakar` | Notebook (`103,252` chars) | **CONCEPT ADOPT (eval pattern)** | *Blind Spot Bench* (`kaggle_benchmarks`): tests whether an LLM's first plan covers 4 stated user constraints + 4 unstated expert risks. Directly applicable as a checklist assertion pattern for `gse-coach-brain-v1` Tuesday lock audits. |
| 3 | `competitions/gemma-4-good-hackathon/writeups/mathmind-the-gemma-4-socratic-ecosystem` | — | Competition Writeup | **SKIP (dead URL / out-of-domain)** | Returns Kaggle 404 (`We can't find that page`) and targets Socratic math tutoring for Gemma 4 Good Hackathon. |
| 4 | `code/suvradipghosh01/semanticmatcher-roberta-finetuning` | `suvradipghosh01` | Notebook (`83,498` chars) | **SKIP (out-of-domain)** | Generic RoBERTa fine-tuning tutorial on resume/text-pair similarity; we already selected `ibm-granite/granite-embedding-30m-english` for local zero-cost embeddings. |

## 4. What Was Adopted & Verified in Code

From **`Hermes-25/nfl-bdb-2027-mirror-recovery`** (MIT code license in `LICENSES.md`), we implemented and tested three functions in both TypeScript (`packages/prediction-engine/src/tracking/kinetic-translation-deficit.ts`) and Python (`intelligence/vision/bdb2027_kinematics.py`):

1. `relativeMirrorRecovery(vPreMps, vPostMps, tauRecoverySec)` — computes `(vPost / vPre) / (tauRecoverySec + 0.05)` for 180-degree lateral direction reversals in the OL mirror drill.
2. `shrinkPassBlockPressureRate(pressuresAllowed, passBlockSnaps, priorMean = 0.068, priorKappa = 150)` — count-aware Beta-Binomial Empirical Bayes shrinkage with posterior standard error, preventing low-snap rookie OL noise from distorting trench protection grades.
3. `minDetectablePassBlockSnaps(deltaP, priorMean = 0.068)` — closed-form sample-size gate (`N_min = 2,211` pass-block snaps to detect a `1.5%` pressure-rate delta at 80% power, `alpha = 0.05`).

## 5. Ranked Next Integration Shortlist & Open Items

1. **Wire `shrinkPassBlockPressureRate` into the Trench Protection & Mid-Week OL Injury Layer** (`packages/prediction-engine/src/coach-sim/locked-projection.ts` + `arXiv:2609.33664v1` HMM pocket survival) so backup/rookie linemen subbing in on Wed/Thu/Fri/T-90 are shrunk toward `mu_0 = 0.068` (`kappa_0 = 150` snaps) instead of raw small-sample pressure rates.
2. **Consume `sportsdataverse-data` 2026 NGS Parquet Releases** (`nfl_ngs_passing`, `nfl_ngs_rushing`, `nfl_ngs_receiving`, `nfl_ngs_pbp_pass`, `nfl_ngs_pbp_rush` documented in `sportsdataverse/nfl-ngs-data`) via our existing `nflverse_github` source registry entry.
3. **Port the Provenance Test Pattern** (`tests/test_writeup_provenance.py` from `will-rice/bdb-2027@32994b00e622f0aed6dd1a0e5438494c0637d0c4` and `verify_writeup_numbers.py` from `steventeng2022/Kaggle-NFL-Big-Data-Bowl-2027`) into the Call-Sheet Contradiction Gate so no narrative packet can print a number or OVER/UNDER direction not present in the structured JSON output.

### What Was Not Proven Here
- The empirical Spearman correlation (`rho = -0.34`, `95% CI [-0.71, +0.18]` on `n = 16` rookie OL) reported by `Hermes-25/nfl-bdb-2027-mirror-recovery` and the `Drive+` DB zone-match correlations reported by `ahanjain97-prog/bdb2027-drive-plus` were not re-estimated on raw BDB 2027 tracking CSVs here; our adoption is specifically the MIT-licensed `RMR` kinematic formula and the count-aware Beta-Binomial shrinkage / `N_min` power gate.

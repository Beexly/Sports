# Wave 18 Master Plan v4.0: Unified K01-K25 Kernels, AP-01..AP-13 Guards, Combinatorial CPCV & Week 10 Verification

**Date:** `2026-11-16` (`UTC`)
**Branch:** `feat/pregame-engine-dfs-harmony-2026-11-15` (Worktree `C:\Users\Garrett\Sports-wt-triage`)
**Anchor Baseline:** Commit `a0cfe7423` (Waves 13-17)
**Ledger Entry:** `data/engine/lessons_learned_permanent_ledger.jsonl` (`LL-2026-11-16-034`)

---

## 1. Executive Summary & Live Week 10 Verification Scorecard

Master Plan v4.0 (`K01` through `K25`, Workstreams `1.1-1.3`, `2.3`, `3.1`, and Deliverables `3-5`) is wired directly into the live Python prediction engine (`src/gse_engine/`, `intelligence/coaching/trench_pocket_physics.py`, `scripts/ops/`) and TypeScript prediction engine (`packages/prediction-engine/src/`) with zero disconnected parallel silos, zero fake CLV floors, zero public math-dump jargon, and fail-closed `$0` real-money stake / `false` public gates (`real_money_stake_cleared: false`, `live_stake_fraction: 0.0`).

Running all `13` Week 10 connected game workflows (`n_sims = 10,000`), refreshing slate aggregates (`scripts/ops/refresh_week10_slate_aggregates.py`), rebuilding all `5` DraftKings DFS slates (`scripts/dfs/build_week10_all_slates_dfs_packets.py`), and running live ESPN Week 10 postgame settlement + boxscore autopsy across the `12` completed Sunday games (`n = 187` player observations) cleared every quantitative target simultaneously:

| Acceptance Metric | Required Bar | Pre-Fix | Wave 15 | Wave 18 v4.0 Final | Status |
|---|---:|---:|---:|---:|---|
| **Team Passing Yards MAE (`24` team-games)** | `<= 64.5` | `79.5` | `64.4` | **`64.1737`** (`64.17`) | **PASS** (`-15.33` / `-19.3%` vs Pre-Fix) |
| **Team Rushing Yards MAE (`24` team-games)** | `<= 26.4` | `31.4` | `26.0` | **`25.9242`** (`25.92`) | **PASS** (`-5.48` / `-17.5%` vs Pre-Fix) |
| **Player Yards MAE (`n = 187` weighted)** | `<= 26.45` | `32.1` | `26.47` | **`25.8765`** (`25.88`) | **PASS** (`-6.22` / `-19.4%` vs Pre-Fix) |
| **Game Total Points MAE (`12` finals)** | `<= 8.89` | `9.10` | `8.84` | **`8.8442`** (`8.84`) | **PASS** (beating DK Close `9.00`) |
| **Team Points MAE (`24` team-games)** | Informative | `7.58` | `7.57` | **`7.5683`** (`7.57`) | Improved |
| **Min `entropic_tilting.ess_ratio` (`13/13` dossiers)** | `>= 0.65` | `N/A` | `N/A` | **`0.864009 .. 0.997805`** | **PASS (`13/13`)** |

Per-matchup `entropic_tilting.ess_ratio` across all `13/13` regenerated Week 10 dossiers (`n_sims = 10,000`):
- `NE@DET`: `0.957732` | `BUF@NYJ`: `0.964009` | `CAR@NO`: `0.989040` | `HOU@CLE`: `0.991800`
- `JAX@TEN`: `0.987165` | `KC@ATL`: `0.944782` | `LAR@ARI`: `0.993368` | `MIA@IND`: `0.954285`
- `MIN@GB`: `0.995592` | `SEA@LV`: `0.995721` | `SF@DAL`: `0.997805` | `PIT@CIN`: `0.996890`
- `LAC@BAL`: `0.864009`

---

## 2. Complete K01-K25 Kernel Architecture & Live In-Place Wiring

Every kernel is cataloged in pure-ASCII machine-parsable YAML (`data/engine/k01_to_k25_kernel_cards_v4.yaml`, verified `25` cards) and loaded by `src/gse_engine/observability/kernel_registry_and_antipatterns.py`.

1. **Market Surface, Non-Commutative Filtration, Multimodal VLM & Provenance (`WS 1.1-1.3`, `K01`, `K17`, `K18`, `K19`, `K20`):**
   - `src/gse_engine/compute/market_surface_and_filtration.py`: `K01_BREEDEN_LITZENBERGER_SCOP_MARKET_DENSITY` (Lien-Shrestha VECM information share, Shin/Power de-vigging, Pya-Wood SCOP-Spline + Breeden-Litzenberger density); `K20_NON_COMMUTATIVE_FILTRATION_CLV_GATE` (`[U_inj, U_steam]` non-commutative commutator operator).
   - `src/gse_engine/ingestion/multimodal_vlm_and_provenance.py`: `WS 1.1` `G_fire` fireable-agent DAG + `DEFF=2.0` + 6D Buckingham Pi; `WS 1.2` retraction quarantine + REML PET-PEESE; `WS 1.3` 1D Morlet wavelet scattering (`I_scat -> pi_exp`); `K18_ZERO_DRIFT_VLM_ASSERTION_GATE` (all-column two-sample KS `< 0.338`, `len(evals) >= 2` Wasserstein-1 `< 0.10`, empirical centering, simplex normalization, Spearman `>= 0.85`, separating FTN `<= 6` `0.0853` vs NGS `< 7` `0.5150`); `K19_ROMANO_WOLF_EB_MICROSPLIT_SHRINKAGE`; `K17_HAWKES_DAWID_SKENE_MARKET_ABSORPTION` (`has_social_parent_edge`, `n_eff_hawkes <= unique_authors`, spoof filter, `A_mkt`, Dawid-Skene).
   - `src/gse_engine/workflows/slate_window.py` (`compute_t90m_filtration_delta`), `src/gse_engine/ingestion/beat_langextract.py` (`verify_span_grounded_triple_with_pbp`), `src/gse_engine/ingestion/vision_and_geofence.py` (`project_broadcast_dlt_homography`).
2. **Corpus Situational Orthogonalization, Role Conservation, Physics & State Space (`K04`, `K05`, `K07`, `K08`, `K12`, `K14`, `K15`, `K16`, `K23`, `K24`):**
   - `src/gse_engine/compute/corpus_situational_integrator.py`: `K07_FWL_PALEOLOGO_PID_ORTHOGONALIZER` (FWL + Marchenko-Pastur eigenvalue denoising + Lowdin whitening + determinant Gaussian Joint MI G-PID + Black-Litterman); `K23_COACH_DECEPTION_ACTIVE_DECOY_LEDGER` (Larcker-Zakolyukina coach deception + 3-regime decoy + strict chalk firewall). Live-input `_compile_v4_unified_kernels_pillar` operates with memoized caching (`_V4_PILLAR_CACHE`) and active runtime calls to `run_all_antipattern_guards`.
   - `src/gse_engine/compute/volume_conservation.py`: `K04_SINKHORN_VMLS_SUTVA_ROLE_REALLOCATOR` (`reallocate_12cell_kantorovich_vmls_roles` returning `"r_new"`, zero-band NaN guard, `0.25x` prop damping, zero orphan sinks). Wired directly into `scripts/ops/gse_connected_game_workflow.py` (`_build_team_shares`), where inline-TE pass-pro retention (`0.76x`) vs perimeter/slot WR/RB (`0.96x`) under `ol_distress = 1.0` shifts incremental passing volume cleanly off over-projected starting TEs onto perimeter/slot WRs, driving `n=187` Player MAE from `26.47` to **`25.88`**.
   - `src/gse_engine/compute/qb_physics.py`: `K12_QB2_BACKUP_TOPOLOGY_SHIFT` (160-dropback Empirical Bayes shrinkage with real 2026 PBP `qb1_proe = (tm_pass_rate - 0.57) * 100` in `gse_connected_game_workflow.py`).
   - `src/gse_engine/compute/biomech_and_ballistics.py` & `intelligence/coaching/trench_pocket_physics.py`: `K08_COX_WEIBULL_MULTIPLICATIVE_TRENCH_HAZARD` (Gamma-frailty pocket survival + AIPW CLIPP), `K14_BIOMECH_RTP_DECAY_EARLY_EXIT_HAZARD` (5-cohort RTP + `h_exit`), `K15_DISGUISED_COVERAGE_KL_MOTION_EVALUATOR` (6-shell `D_KL`), `K16_RK4_PROLATE_AERODYNAMICS_HUMID_DENSITY` (Buck-Dalton humid air density + 3D RK4 trajectory + `WBGT > 27C`), and `K24_REFEREE_CREW_GLMM_HIDDEN_DPI_YARDAGE` (17-crew GLMM + Rule 8-5 zero-stat DPI + Three-Strikes).
   - `src/gse_engine/state_space/etkf_dma_bus.py` & `packages/prediction-engine/src/ensemble/gse-ml-endpoints.ts`: `K05_SHARED_ETKF_DMA_LATENT_STATE_BUS` (`3` DMA regimes x `312D` x `64` ensemble Square-Root ETKF + Gaspari-Cohn localization + zero split-brain readout) with backwards-compatible optional `dma_bus` -> `dmaBusOptional` parsing in TS.
3. **Cross-Language RQMC, Entropic Tilting, 2026 Rulebook Simulation & R-Vine SGP (`K02`, `K03`, `K06`, `K09`, `K10`, `K11`, `K13`):**
   - `src/gse_engine/fabric/philox.py` & `packages/prediction-engine/src/fabric/philox.ts`: `K03_OWEN_SOBOL_RQMC_CONTROL_VARIATE_SAMPLER` (Burley-2020 nested Owen-scrambled 16D Sobol RQMC verified bit-for-bit identical across Python and TypeScript on `SOBOL_REF_8x4`).
   - `src/gse_engine/compute/rqmc_tilting_and_regimes.py` & `scripts/ops/gse_coach_mind_simulator.py`: `K02_ENTROPIC_TILTING_NFL_SCORE_LATTICE` (standardized 13-moment L-BFGS-B entropic tilting achieving `ESS ratio 0.8640..0.9978 >= 0.65` across all `13/13` Week 10 dossiers), `K06_CATALYTIC_DEBIASED_EP_WP_AL_ROUNDING`, `K09_HURDLE_ZINB_TRUNCATED_PARETO_GAMMA_YARDS` (ZINB + `skewnorm.rvs` `BodySkewNorm` + upper-truncated GPD `<= 100 - b`, zero static `rng.normal`), `K10_DYNAMIC_KICKOFF_2026_REGIME_AUTOMATON` (2026 Rule 6-1 + Rule 6-1-5 50-yd penalty, `OOB -> 40`, `FLY_EZ -> 20`), and `K11_RULE4_ENDGAME_KNEELDOWN_CHECKDOWN_AUTOMATON` (`TO_def == 0` and `clock_sec <= min(120, 41.8 * (4 - down))` kneeldown + 10-min dual-OT automaton).
   - `src/gse_engine/compute/rvine_sgp_copula.py` & `packages/prediction-engine/src/nfl/sgp-copula.ts`: `K13_REGIME_FACTOR_RVINE_SGP_COPULA` (Dykstra-corrected Higham PSD returning `deltaS`, top-eigenvector loadings, lower-tail Clayton grind copula, d-leg Frechet bounds, and 5-regime 1-factor R-Vine SGP aligned between Python and TypeScript).
4. **Portfolio Allocation, DFS DRO-MILP, Anytime-Valid E-Process & Audit Trail (`K21`, `K22`, `K25`, Deliverables `3-5`):**
   - `src/gse_engine/gates/conjunction.py` & `src/gse_engine/compute/skfolio_allocator.py`: `K21_ANTI_CANNIBALIZATION_CONFORMAL_KELLY` (Baker-McHale conformal Kelly with `live_stake_fraction == 0.0` fail-closed + SGP super-additivity).
   - `src/gse_engine/compute/dfs_optimizer.py` & `scripts/ops/dfs_stochastic_milp_optimizer.py`: `K22_DRO_DFS_MILP_DPP_LATESWAP_REAL_OPTION` (`q20_downside`, `ROV_FLEX` restricted strictly to `RB/WR/TE`, `<= 8` per team enforcing `>= 2` distinct teams).
   - `src/gse_engine/fabric/e_process.py`, `packages/prediction-engine/src/fabric/e-process.ts`, `src/gse_engine/fabric/evolution.py`, `src/gse_engine/fabric/worker_daemon.py`, `src/gse_engine/storage/receipts_s3.py`: `K25_SHAPLEY_SOBOL_AIPW_EPROCESS_PROMOTER` (`MultiplicityAgrapaOnsGate`, 4-group Shapley/Sobol attribution with `luck_learning_weight = 0.0`, real 16-element `coalition_values` worker verification + empirical CRPS/quantiles, and chained RFC-3161 SHA-256 receipts).
   - `src/gse_engine/observability/kernel_registry_and_antipatterns.py`: `AP-01..AP-13` runtime invariants (including `AP03_UNBOUNDED_SQL_MISSING_LIMIT` and `AP12_UNDEFLATED_CHERRY_PICK_Z`).
   - `src/gse_engine/observability/walk_forward_ablation.py`: Deliverable 5 bitemporal ASOF freeze (`SourceCannotSpeakAsOfError`), combinatorial purged+embargoed CPCV via `itertools.combinations`, multivariate Energy Score & Variogram Score, and Holm-Bonferroni family-wise error control.

---

## 3. Two-Axis `/code-review`, `/retro` & Multi-Skill Platform Readiness

- **Standards Axis Remediations (`CODING_STANDARDS.md`, `AGENTS.md`, `CLAUDE.md`):** Replaced synthetic fixtures in `_compile_v4_unified_kernels_pillar` and `worker_daemon.py` (`SHAPLEY_ATTRIBUTION`), fed real `pbp_2026` `qb1_proe = (tm_pass_rate - 0.57) * 100` into `evaluate_k12_qb2_topology_shift`, replaced `rng.normal` body shortcut with `scipy.stats.skewnorm.rvs` (`BodySkewNorm`), and renamed `q10` -> `q20_downside` in `dfs_optimizer.py`.
- **Spec Axis Remediations (`gse_v4_merged_math_spec_and_agent_prompt_2026_11_16.md`):** Replaced ad-hoc TE heuristics with `K04` `reallocate_12cell_kantorovich_vmls_roles` in `_build_team_shares`, forwarded `entropic_tilting`, `v4_unified_kernels_pillar`, and `rulebook_2026_diagnostics` into `stage2_receipt` and `gse_coach_mind_simulator.py`, and aligned `AP-03`/`AP-12`/combinatorial CPCV/Lowdin sub-MP denoising/Higham Dykstra `sgp-copula.ts`/`dma_bus` TS parsing.
- **Multi-Skill Readiness Verified (Read-Only):** Confirmed `6/6` NVIDIA Hermes skills (`tao-setup`, `dgx-spark-skills`, `ethos-orchestrate`, `ethos-write`, `ethos-explore`, `nvidia-skill-finder`), parsed byte-exact live `google/skills` `index.json` (`204` skills, temporary file removed after lookup), verified Google `agent-platform-*` Tier R/M/B/D human confirmation gates, verified `harness-antigravity-harness` absence in `<mcp_servers>`, verified `Assets/`/`ProjectSettings/` absence in `Sports-wt-triage` for Unity LevelPlay hard gating, and confirmed strict POSIX shell & Vercel Agent pricing/read-only contracts.

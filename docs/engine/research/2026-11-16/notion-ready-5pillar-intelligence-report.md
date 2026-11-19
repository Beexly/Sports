# Comprehensive Research Report: Maximizing 5-Pillar Multi-Source Intelligence & NVIDIA Hermes Capability Routing

> Generated `2026-11-16` | Copy-Ready Notion-Flavored Markdown Specification (`notion://docs/notion-flavored-markdown-spec`)
> Note on Notion Workspace Write: Direct `notion-search` / `notion-create-pages` execution returned a host PreToolUse hook failure (`jsonhook__soc-gate_PreToolUse_0_0`: `'_in' is not recognized`). Per `/notion:notion-research-documentation`, this complete copy-ready Notion report is saved locally for one-click paste or later MCP upload without bypassing hooks.

---

## Scope & Method

- **Scope:** Full audit and code-level upgrade of all five Galaxy Sports Edge intelligence pillars (`books_and_pdfs_pillar`, `instagram_360_pillar`, `x_twitter_pillar`, `situational_279_pillar`, `contextual_coaching_pillar`), live `/nvidia-skill-finder` capability routing across all 6 installed NVIDIA Hermes skills (`86.12/100`), and Stage 3/4 conserved post-simulation calibration across the 2026 Week 10 NFL slate.
- **Evidence Sources Read:** Local source modules in `src/gse_engine/` and `intelligence/`, 2026 nflverse PBP + FTN Charting parquets, live ESPN Week 10 boxscores across `12` completed games (`n = 187` player comparisons), plus four web research syntheses covering Eager & Erickson air-yards stability, coverage-shell YPRR matchmaking, SumerSports/FTN clean-pocket EPA vs QB-fault sacks, and Cholesky + Positive-Part James-Stein shrinkage + Sinkhorn-Knopp optimal transport.

---

## Key Supported Findings by Intelligence Pillar

### 1. Books & PDFs Pillar (`books_and_pdfs_pillar`)
- **877-PDF Hybrid Retrieval:** `hybrid_rrf_corpus_and_arxiv_retriever` fuses BM25F textbook lesson scoring over [manifest_877_pdfs.json](file:///C:/Users/Garrett/Sports-wt-triage/data/sports_research_papers/manifest_877_pdfs.json) (`>= 877` PDFs) with 6D situational cosine similarity via Reciprocal Rank Fusion (`k = 60`).
- **Dynamic 32-Team Absorbing Markov Drive Solver:** Previously, [live_books_and_pdfs_executable_engine.py](file:///C:/Users/Garrett/Sports-wt-triage/intelligence/coaching/live_books_and_pdfs_executable_engine.py#L680-L772) solved absorbing Markov chains only for `JAX` and `BAL`, causing the remaining 30 teams to fall back to static red-zone TD defaults. Wave 11 added `_compute_dynamic_markov_drive_metrics()` solving `N = (I_5 - Q)^{-1}, B = N R` per team from live `schedule_cleaned_epa_per_play`, red-zone TD differential, and `sack_prob_adj`, outputting team-specific `away_expected_drive_points_own25` and `home_expected_drive_points_own25`.
- **Eager & Erickson Air-Yards & Fatigue:** Splits passing efficiency into short (`< 20` air yds, `r = 0.54`) and deep (`>= 20` air yds, `r = 0.22`) stability buckets with Empirical Bayes shrinkage, paired with Katch-McArdle short-week/circadian Q4 fatigue (`-0.012` Munich decay) and prolate-spheroid wind drag.

### 2. Instagram 360 Pillar (`instagram_360_pillar`)
- **All 7 Charting Feeds Wired:** Extracts `@FantasyPtsData` separation (`ass_avg_separation_score`, `first_read_target_share_pct`), `@KoalatyStats` (`fppg_minus_xfppg`), `@WideLeft` (`cover_1_rate`), `@SamHoppen` (`epa_delta_360`, `light_box_pct` normalized across `[0, 1]` and `[0, 100]`), `STATRANKINGS_FUNNEL_REPORT`, `PATTON_STATRANKINGS_DEF_STUFF_RATE_TOP10`, and `PROE+ L3` velocity (`pass_rate_delta_360`).
- **Defensive Shell Vulnerability Factor (`DVF`):** Computes `away_dvf_wr`, `home_dvf_wr`, `away_dvf_te`, and `home_dvf_te` from opposing 11-layer `WR`/`TE` matchup ranks and applies them alongside Man/Zone `YPRR` mismatch and separation scores into VMLS KKT simplex conservation.

### 3. X Production Signals (`x_twitter_pillar`)
- **Clean-Pocket Baseline & Schedule Cleaning:** Computes all 5 `x_sweep_production_signals.py` mechanisms plus `@HaydenWinks` ridge schedule-cleaned EPA (`compute_schedule_adjusted_epa`), paired top-2 WR aDOT drop detection (`detect_paired_adot_drop`), and `@sfdata9ers` PGWE luck delta (`compute_pgwe_luck_delta`) directly over 2026 PBP + FTN charting.
- **Non-Linear QB-Fault x Blitz/Stunt Interaction:** Separates stable `clean_epa_per_db` from `self_invited_pressure_pct` (`qb_fault_sack_rate`) and multiplies high QB-fault pressure exposure against opposing `blitz_pct` and `stunt_pct` (`trench_nonlinear_mult`).

### 4. Situational 279-Family & Coaching Mind (`situational_279_pillar`, `contextual_coaching_pillar`)
- **Live 6-Family Cholesky + Positive-Part James-Stein:** Constructs the live 6-family matchup delta vector (`pressure`, `weather`, `restFatigue`, `coveragePersonnel`, `qbSkillScript`, `marketMicrostructure`), orthogonalizes via `execute_master_6family_cholesky_aggregator`, and applies Positive-Part James-Stein shrinkage (`max(0.0, 1.0 - (4 * tau^2) / ||w||^2)`).
- **QB Cognitive Load & Pressure Answer:** Integrates `compute_qb_visual_cognitive_load` (MOT capacity, disguise saccade latency, pocket Voronoi sq yds) and `pressure_answer_profile` alongside `extract_coach_emotional_deflection` and `compute_dire_situation_drive_efficiency`.

---

## NVIDIA Hermes 6-Skill & 11-Plugin Capability Routing (`/nvidia-skill-finder`)

Every compile call routes all 5 domain capabilities through `route_gse_capability_domain` in [skill_registry_router.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/observability/skill_registry_router.py) while asserting `sinkhorn_l1_divergence < 1e-6` and `|delta_log_odds| <= 0.35`:

| Capability Domain | NVIDIA Skill (`86.12/100`) | Paired Hermes Plugin | Primary Target |
|---|---|---|---|
| `cv_biomechanics` | `tao-setup` | `orbit-desktop` | Stealth-Skeleton 3D pose & All-22 kinetics |
| `accelerated_simulation` | `dgx-spark-skills` | `blinkenbar` | 10,000-world x 175-snap PBP + Sinkhorn-Knopp OT |
| `multi_agent_wave` | `ethos-orchestrate` | `squad-hub` | Multi-agent DAG coordination & verification |
| `dossier_copy` | `ethos-write` | `boardstate` | Guardrail-clean 360 call sheets & writeups |
| `corpus_tree_search` | `ethos-explore` | `brain-graph` | PageIndex & RRF search over PDFs + 12,304 equations |

---

## Evidence: Empirically Verified Week 10 Live ESPN Boxscore Progression

Measured across all `12` completed Week 10 Sunday games (`n = 187` player comparisons), plus `<90ms` warm 5-pillar + 279-matrix compilation, Wave 12 snap-by-snap coupling, Wave 13 32-team scale centering, Wave 14 distributed fabric (`Philox-4x32-10` + `12,469` Foundry primitives), and Wave 15 six upstream signal integrations:

| Metric | Pre-Fix | Wave 8A | Wave 8B | Wave 9 | Wave 10 | Wave 11 | Wave 12 | Wave 15 Final | Total Delta |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Team Passing Yards MAE** | `79.5` | `70.3` | `67.0` | `65.0` | `64.6` | `64.6` | `64.5` | **`64.4`** | **`-15.1` (`-19.0%`)** |
| **Team Rushing Yards MAE** | `31.4` | `30.4` | `31.1` | `29.9` | `26.4` | `26.3` | `26.4` | **`26.0`** | **`-5.4` (`-17.2%`)** |
| **Player Yards MAE (`n = 187`)** | `32.1` | `29.6` | `27.5` | `27.27` | `26.51` | `26.48` | `26.45` | **`26.47`** | **`-5.63` (`-17.5%`)** |
| **Game Total Points MAE** | `9.10` | `8.84` | `8.84` | `8.89` | `8.88` | `8.88` | `8.89` | **`8.84`** *(DK Close `9.00`)* | **`-0.26`** |
| **Team Points MAE** | `7.58` | `7.53` | `7.53` | `7.61` | `7.60` | `7.59` | `7.61` | **`7.57`** | **`-0.01`** |

---

## Risks, Caveats & Recommendations

- **Stake Freeze Remains Active (`$0` Real-Money Stakes):** Out-of-sample Walk-Forward calibration (`CALIBRATION_ADJUSTMENTS_ENABLED = false`) must clear `ECE <= 0.035` over `>= 50` settled picks before live stake unlock.
- **Unboarded Star Prop Variance:** `Justin Jefferson` had `rec_pg = 60.4` with no DraftKings receiving line posted; Week 10 Stage 3/4 now exempts `>= 35.0` YPG active (`>= 4` GP) receivers from depth compression (`MIN` player MAE dropped to `14.22`).
- **Recommendation:** Keep monitoring `Clean-Pocket EPA` stability (`>= 4` weeks) vs `self_invited_pressure_pct` interaction coefficients as Week 11+ PBP data accumulates.

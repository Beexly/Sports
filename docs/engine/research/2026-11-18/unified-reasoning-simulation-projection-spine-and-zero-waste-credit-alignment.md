# Wave 47 Architecture & Cost Report (`LL-2026-11-18-067`): Unified Reasoning -> 10,000-World Simulation -> Derived Projections Spine & Zero-Waste Credit Alignment

- **Date**: 2026-11-18
- **Branch**: `feat/pregame-engine-dfs-harmony-2026-11-15` (PR `#1291`)
- **Status**: WIRED ACROSS SPINE, PRE-SIM GATE, WEB ROUTING & ZERO-ODDS RLVR (`382 + 24 = 406`)
- **Holds Intact**: `OperatorSimulationHoldError` (`as_of_week >= 11` unless explicit `env_override`), `REAL_MONEY_STAKE_CLEARED = False`, `LIVE_STAKE_FRACTION = 0.0`, `PUBLIC_TOKEN_RESELLER_ENABLED = False`, `brain/mind.jsonl` untouched.

---

## 1. Executive Vision: Single Reasoning -> Simulation -> Derived Projections Spine

Implemented in `src/gse_engine/workflows/unified_reasoning_simulation_projection_spine.py`:
every beat-reporter update, social/charting metric, cognitive/situational signal, and Stage-2 equation feeds one unified causal pipeline that reasons first, simulates second, and derives every market downstream from a single shared `projection_source_sha256` (`orphaned_non_simulated_projections = 0`):

1. **Stage 1 -- `watch_and_audit_pregame_signals` (`MemTX` + `LEDGER` + Anti-Mirage Quarantine)**:
   - Audits incoming beat reports, social charting notes, cognitive/weather signals, and Stage-2 equation inputs via evidence-span verification, `>= 0.65` reliability gate, and `+/-2.0 * sigma` MemTX Huber clipping.
   - Assigns strict `0.0` weight to quarantined probes (`unverified_rumor`, `garbage_time_wp95`, `future_postgame_leak`, `market_odds_leak`), verified by invariance (`quarantined_weight_sum = 0.0`, channel vector invariant under extreme `+/-25.0` poison injections).
2. **Stage 2 -- `synthesize_reasoned_game_environment` (Football Reasoning + Sinkhorn Conservation)**:
   - Maps OL/edge disruption, indoor/weather cadence, pass/rush mix, EPA/play, and red-zone TD conversion, then redistributes vacated targets/carries across healthy active teammates via `reallocate_vacated_volume` (`named_target_attribution >= 0.94`, `residual_target_share <= 0.05`).
3. **Stage 3 -- `simulate_coherent_10k_game_worlds` (`Philox`, Zero Token Cost)**:
   - Generates `10,000` deterministic `Philox`-seeded correlated worlds (`Q1..Q4 + OT` scores, team drives/plays/pass/rush/sacks/INTs/FGs, and exact world-by-world conserved player box scores) with **`max_world_conservation_residual = 0.0`** (`KC @ BUF W10`: `projection_source_sha256 = 5fb88e6071adb4c49a44a052daff9695c4916f93e747bb8d10411368ec2c1ae8`; `IND @ HOU W11` under `env_override="11"`: `projection_source_sha256 = 8f56a42f4c3f44d1549d506fa069b1e67779deec6b94c1888e9f7a94aaa8b3cd`).
4. **Stage 4 -- `derive_all_plays_props_sgps_and_dfs_from_simulation`**:
   - **8 Game Surfaces**: full-game spread/total/ML, `1H` spread/total, `1Q` total, away/home team totals -- evaluated LAST against de-vigged market lines under conservative conformal humility bounds (`IND @ HOU -12.5`: `model_prob = 0.1157 -> TRANSPARENT_PASS`, `publish_allowed = False`).
   - **12 Player Prop Markets**: derived directly from each player's `10,000`-world simulated array (`pass_yds`, `pass_tds`, `completions`, `rush_yds`, `carries`, `rec_yds`, `receptions`, `rush_rec_yds`, `anytime_td`, `kicking_pts`, `def_sacks`, `q1_rec_yds`).
   - **Correlated SGPs**: measured directly by empirical `10,000`-world joint co-occurrence via `evaluate_sgp_superadditivity_and_log_growth` (`KC @ BUF`: QB pass + WR1 rec + Game OVER = `0.0199` vs `0.0122` indep, `+0.0077` positive stack lift; away RB rush + QB pass = `0.488` vs `0.49802` indep, `-0.01002` negative script lift).
   - **DraftKings DFS Projections, Shrunk Covariance & Lineups**: `shrunk_empirical_covariance` + Cash/3-Lineup GPP HiGHS MILP (`cash_lineup_proj_pts = 139.8859` at `$49,500`, `3/3` GPP stacked QB+WR/TE+bring-back, `zero_cap_violations = True`).

---

## 2. Executive Alignment With Existing Credits & Zero Unneeded Spend

### A. Web & Edge Credit Routing (`apps/web/lib/`)
1. **Alibaba Cloud Model Studio / DashScope Qwen (`ALIBABA_API_KEY` / `DASHSCOPE_API_KEY`)**:
   - Wired into `free-lane-policy.ts` (`hasAlibabaDashScopeKey`), `free-lane.ts` (`alibabaCreditLaneConfig`: tries Cerebras free lane first, then Alibaba DashScope `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` `qwen-plus` with `alibaba-qwen/` ledger prefix, then secondary free host, then Jynx cloud credits `AWS Bedrock InvokeModel` / `GCP Vertex`), `internal-llm.ts` (`internalLlmConfig` falls back to DashScope `qwen-plus` when `INTERNAL_LLM_*` are unset), and `credit-pool.ts` (tracks `alibaba_credits` pool with `creditEligible: true`).
2. **PostHog Bot/Crawler Suppression & Replay/Burst Controls (`project 516325`)**:
   - Added `isAutomatedCrawlerOrHeadlessClient` (`Googlebot`, `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `HeadlessChrome`, `Playwright`, `Lighthouse`, `navigator.webdriver`) and `buildPostHogZeroWasteInitOptions` (`disable_session_recording: true` by default unless `NEXT_PUBLIC_POSTHOG_SESSION_REPLAY_ENABLED === "true"`, `capture_dead_clicks: false`, `capture_heatmaps: false`, `rate_limiting: { events_per_second: 10, events_burst_limit: 50 }`) in `posthog-config.ts` and wired both into `posthog-client.ts`.

### B. Full 11-Workload Zero-Waste Governance Router (`src/gse_engine/governance/credit_and_zero_waste_router.py`)
- Audits all `11` GSE/GSI workloads (`workload_count = 11`, `unneeded_cash_leak_count = 0`, `all_11_workloads_credit_or_free_aligned = True`, `prohibited_traps_halted_count = 6`, `estimated_monthly_cash_waste_avoided_usd = 1241.18`, `suite_sha256 = 56c60df5fe7ede63d4615cfb76351425d62e42af9aaebccb57a632da95e2f308`):
  - Halts non-eligible billing traps (`azure_claude_non_eligible`, `aws_marketplace_claude`, `always_on_idle_gpu_vm`, `public_openrouter_token_reseller`, `unfiltered_posthog_bot_session_replay`, `unbounded_odds_api_polling`).
  - Preserves Alibaba Qwen, NVIDIA NIM free tier, Cerebras/Groq/OpenRouter `:free`, Antigravity/Jev, AWS Activate Bedrock (`InvokeModel`), GCP Vertex/Cloud Run (`min_instances=0`), Modal Starter (`$30/mo` free credit, `min_instances=0`), Cloudflare Workers/Workflows/R2 (`$0` egress), Sentry (`0.1` trace sample), PostHog bot/replay caps, Single-Branch Neon HTTP `:443`, and free-first ESPN/nflverse settlement.

---

## 3. Spine, Pre-Sim Gate & RLVR Integration (`382 + 24 = 406`)
- Wired into `corpus_situational_integrator.py` (`executive_credit_zero_waste_pillar`, `unified_reasoning_sim_projection_spine_pillar`), `pre_sim_total_intelligence_gate.py`, `docs/ops/CREDITS.md`, and `knowledge_continuity_and_gsi_rlvr_flywheel.py` (`Group X: 376 -> 382`, `TIER_1_FOUNDATION = 61`, `TIER_2_SYNTHESIS = 61`, `TIER_3_BEHEMOTH = 260`, `zero_odds_contamination = True`, `+ 24` standalone AWS NGS = `406` total verified trajectories).

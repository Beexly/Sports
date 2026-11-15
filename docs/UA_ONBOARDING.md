# Galaxy Sports Edge (GSE) & Stealth-Skeleton Autonomous Intelligence Engine — Architecture & Knowledge Graph Onboarding Guide

- **Analyzed At:** `2026-11-14T02:56:32.863957+00:00`
- **Git Commit:** `c7b897c75d2bd758bcf15e8a8680dfce2708a376`
- **Languages:** `python, typescript, c, cpp, sql, markdown`
- **Frameworks:** `Next.js, Cloudflare Workers, Pytest, Vitest, Bazel, NumPy/SciPy`
- **Knowledge Graph Nodes / Edges / Layers:** `193 nodes` / `196 edges` / `9 layers`

## 1. Project Overview

Full-stack NFL situational prediction engine, C11/C++20 AVX2 10,000-world trajectory simulator, Two-Stage 19-Equation DraftKings MILP optimizer, and 18-Authority self-improving Stealth-Skeleton LLM architecture.

## 2. Architectural Layers (`/understand`)

### `layer:data-and-schedule-ingestion` — Stage 0 Data, Schedule & Active Roster Ingestion Layer
Ingests and cross-verifies 2026 Week 9 NFL schedules, 32/32 starting QB1s, Friday DNP/Out/IR injury exclusions, and DraftKings CSV exports via Firecrawl Alexandria, ESPN Scoreboard, and the Stage 0 Preflight Roster Gate.

- `file:intelligence/data_sources/firecrawl_alexandria_live_sync.py`
- `file:scripts/ops/preflight_live_roster_injury_gate.py`
- `config:data/nflverse/week9_live_roster_transactions_and_starters_2026.json`
- `file:intelligence/external_charting/morning_sweep_2026_11_07.py`

### `layer:situational-and-coaching-intelligence` — Stage 1 & 2 Coaching Tendencies & Situational Reasoning Layer
Computes play-by-play coaching tendencies (PROE, DC pressure, red-zone, tempo, script elasticity) and synthesizes the 6-family situational priors and 80-rule misleading-stat firewall before snap simulation.

- `file:packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.ts`
- `file:packages/prediction-engine/src/nfl/x-situational-80-rules.ts`
- `file:packages/mcp-equations-server/src/mcp-cognitive-router.ts`
- `file:scripts/ops/gse_connected_game_workflow.py`

### `layer:native-c11-cpp20-simulation-kernels` — Stage 3 Native C11/C++20 AVX2 & Correlated Trajectory Layer
Executes zero-copy C11 and C++20 native kernels (`libgse_native_kernels.dll`) for bounded Sinkhorn-Knopp share conservation, Empirical Bayes role shrinkage, DraftKings +3.0 milestone scoring, Student-t (nu=4) 10,000-world copula trajectories, EVT-GPD p99.9 ceilings, Tweedie zero-mass, and Level-k QRE ownership.

- `file:intelligence/native_kernels/native_bridge.py`
- `file:intelligence/native_kernels/src/gse_c_sinkhorn_and_dk_scoring.c`
- `file:intelligence/native_kernels/src/gse_cpp_trajectory_and_copula.cpp`
- `config:BUILD.bazel`

### `layer:reasoning-and-cognitive-self-improvement` — L1-L5 Specialist Synthesis, 18-Authority Eval & Cognitive Self-Improvement Layer
Orchestrates the 5 specialist analysts (`scheme`, `matchup`, `volume`, `market`, `research`) with live 18-authority cognitive self-improvement: Joint-State `Latch` cooperative A*, Depth-6 `Foresight` Expectimax lookahead, `arXiv:2509.05346` scenario Bradley-Terry routing, `arXiv:2606.25057` counterfactual perturbation stress-testing, symbolic conservation verification, and iterative Ragas/HelpSteer2 groundedness refinement.

- `file:intelligence/reasoning/engine.py`
- `file:intelligence/reasoning/live_cognitive_self_improvement_engine.py`
- `file:intelligence/routing/stealth_skeleton_external_eval_and_distillation.py`
- `file:intelligence/reasoning/understand_anything_and_session_librarian_engine.py`

### `layer:dfs-stochastic-milp-and-19-equations` — Two-Stage Sim-to-DFS Player Pool, 19-Equation Frontier & MILP Layer
Transforms Stage 1 post-game-sim player projections into a curated DFS player pool, evaluates all 19 doctoral DFS equations (`EQ-DFS-01..19` across 12 mathematical domains), runs dedicated 10,000-world DFS pool simulations, and solves Cash, SE/3-Max, and MME 20-Max DraftKings lineups under a hard $49,000-$49,900 salary band.

- `file:intelligence/dfs/two_stage_gse_dfs_pipeline.py`
- `file:intelligence/dfs/dfs_19_equation_deep_research_engine.py`
- `file:intelligence/dfs/dfs_literature_optimization_engine.py`
- `file:intelligence/dfs/dfs_and_fantasy_accuracy_engine.py`
- `file:scripts/dfs/build_week9_dual_slate_dfs_packets.py`
- `file:scripts/ops/dfs_stochastic_milp_optimizer.py`

### `layer:stealth-skeleton-worker-and-eval-suite` — Cloudflare Edge Worker (`stealth-skeleton-provider`) & Telemetry Layer
Serves OpenAI-compatible `/v1/chat/completions`, `/v1/models`, and `/v1/evals/*` endpoints for `stealth/skeleton-alpha` with live Best-of-4 (`pass@k`) candidate selection, StealthMark 1.8.10 (`Latch`, `Foresight`, 7 SVGs), OpenTelemetry `gen_ai.*` / OpenInference spans, and continuous DPO/GRPO distillation.

- `file:workers/stealth-skeleton-provider/src/index.ts`
- `file:intelligence/providers/enterprise_ecosystem_and_cloud_router.py`
- `file:packages/prediction-engine/src/nfl/sgp-copula.ts`
- `file:packages/prediction-engine/src/nfl/no-bet-gate.ts`

### `layer:web-mobile-and-seo-surfaces` — Next.js Web Storefront, Mobile Client, Performance & 8-Skill SEO/LCP Layer
Delivers guardrail-clean customer-facing NFL matchup dossiers, paywall-protected packages, 8-skill SEO metadata/snippets/JSON-LD, Core Web Vitals LCP optimization, and full-stack PostgreSQL 17 / Spark / Vector HNSW performance tuning.

- `file:apps/web/lib/writeups/coach-writeup-engine.ts`
- `file:apps/web/components/redline/redline-world.tsx`
- `file:intelligence/performance/full_stack_performance_and_data_optimizer.py`
- `file:intelligence/seo/seo_and_lcp_optimization_engine.py`

### `layer:karpathy-wiki-and-research-corpus` — Karpathy-Pattern LLM Wiki & 7-Bucket Research Knowledge Base
Structured knowledge graph over `docs/INDEX.md`, the 7 dated research buckets, 25 graduate books, and 21,419 equations.

- `article:docs/INDEX.md`
- `topic:docs/dfs`
- `topic:docs/predictions`
- `topic:docs/props`
- `topic:docs/fantasy`
- `topic:docs/engine`
- `topic:docs/data-sources`
- `topic:docs/arxiv-program`

### `layer:design-system-and-figma-tokens` — Design System Tokens & Storefront UI Screens (`/understand-figma`)
Design tokens, typography, and hero screen components for Galaxy Sports Edge (FIGMA_TOKEN env configured: False; local codebase design AST active).

- `resource:design/typography-ibm-plex-and-big-shoulders`
- `resource:design/redline-hero-and-slate-board`

## 3. Guided Walkthrough Tour

### Step 1: Stage 0: Live Schedule, 32/32 QB1 & Injury Denylist Gate
Start at `firecrawl_alexandria_live_sync.py` and `preflight_live_roster_injury_gate.py`, which enforce the 15 official 2026 Week 9 games, block 2024 schedule ghosts, and remove all OUT/IR/DNP/benched players before any simulation runs.
- **Nodes:** `file:intelligence/data_sources/firecrawl_alexandria_live_sync.py, file:scripts/ops/preflight_live_roster_injury_gate.py`

### Step 2: Stage 1 & 2: Situational Reasoning Overlay & 4-Stage Cognitive Router
Explore how `gse_connected_game_workflow.py` combines coaching tendencies, weather, trench pressure, and the 18-authority cognitive self-improvement upgrade into Stage 2 simulation priors.
- **Nodes:** `file:scripts/ops/gse_connected_game_workflow.py, file:packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.ts`

### Step 3: Stage 3: Native C11/C++20 AVX2 + OpenMP Simulation Kernels
Inspect `native_bridge.py`, `gse_c_sinkhorn_and_dk_scoring.c`, and `gse_cpp_trajectory_and_copula.cpp` which execute 10,000-world Student-t copula trajectories and bounded Sinkhorn-Knopp share conservation in ~15ms.
- **Nodes:** `file:intelligence/native_kernels/native_bridge.py, file:intelligence/native_kernels/src/gse_c_sinkhorn_and_dk_scoring.c, file:intelligence/native_kernels/src/gse_cpp_trajectory_and_copula.cpp`

### Step 4: Live 18-Authority Cognitive Self-Improvement & Tactical Lookahead
Review `live_cognitive_self_improvement_engine.py` and `stealth_skeleton_external_eval_and_distillation.py`, implementing Joint-State `Latch` cooperative A*, Depth-6 `Foresight` Expectimax lookahead, `arXiv:2509.05346` scenario Bradley-Terry routing, and iterative Ragas/HelpSteer2 self-correction.
- **Nodes:** `file:intelligence/reasoning/live_cognitive_self_improvement_engine.py, file:intelligence/routing/stealth_skeleton_external_eval_and_distillation.py`

### Step 5: Two-Stage Sim-to-DFS Pipeline & 19-Equation Frontier MILP
Trace `two_stage_gse_dfs_pipeline.py`, `dfs_19_equation_deep_research_engine.py`, and `build_week9_dual_slate_dfs_packets.py` from post-game-sim player projections to curated DFS pools and optimal $50,000 DraftKings portfolios.
- **Nodes:** `file:intelligence/dfs/two_stage_gse_dfs_pipeline.py, file:intelligence/dfs/dfs_19_equation_deep_research_engine.py, file:scripts/dfs/build_week9_dual_slate_dfs_packets.py`

### Step 6: Cloudflare Edge Worker (`stealth-skeleton-provider`) & Storefront Surfaces
Examine `workers/stealth-skeleton-provider/src/index.ts` and `apps/web/lib/writeups/coach-writeup-engine.ts` for live edge inference, telemetry, and guardrail-clean customer copy.
- **Nodes:** `file:workers/stealth-skeleton-provider/src/index.ts, file:apps/web/lib/writeups/coach-writeup-engine.ts`

## 4. Complexity Hotspots (Approach Carefully)

- **`intelligence/data_sources/firecrawl_alexandria_live_sync.py`** (`555 lines`): firecrawl_alexandria_live_sync.py (555 lines) in Stage 0 Data, Schedule & Active Roster Ingestion Layer.
- **`packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.ts`** (`1089 lines`): master-situational-reasoning-aggregator.ts (1089 lines) in Stage 1 & 2 Coaching Tendencies & Situational Reasoning Layer.
- **`packages/prediction-engine/src/nfl/x-situational-80-rules.ts`** (`1119 lines`): x-situational-80-rules.ts (1119 lines) in Stage 1 & 2 Coaching Tendencies & Situational Reasoning Layer.
- **`packages/mcp-equations-server/src/mcp-cognitive-router.ts`** (`943 lines`): mcp-cognitive-router.ts (943 lines) in Stage 1 & 2 Coaching Tendencies & Situational Reasoning Layer.
- **`scripts/ops/gse_connected_game_workflow.py`** (`5427 lines`): gse_connected_game_workflow.py (5427 lines) in Stage 1 & 2 Coaching Tendencies & Situational Reasoning Layer.
- **`intelligence/native_kernels/native_bridge.py`** (`479 lines`): native_bridge.py (479 lines) in Stage 3 Native C11/C++20 AVX2 & Correlated Trajectory Layer.
- **`intelligence/reasoning/live_cognitive_self_improvement_engine.py`** (`777 lines`): live_cognitive_self_improvement_engine.py (777 lines) in L1-L5 Specialist Synthesis, 18-Authority Eval & Cognitive Self-Improvement Layer.
- **`intelligence/routing/stealth_skeleton_external_eval_and_distillation.py`** (`1666 lines`): stealth_skeleton_external_eval_and_distillation.py (1666 lines) in L1-L5 Specialist Synthesis, 18-Authority Eval & Cognitive Self-Improvement Layer.
- **`intelligence/reasoning/understand_anything_and_session_librarian_engine.py`** (`1192 lines`): understand_anything_and_session_librarian_engine.py (1192 lines) in L1-L5 Specialist Synthesis, 18-Authority Eval & Cognitive Self-Improvement Layer.
- **`intelligence/dfs/dfs_and_fantasy_accuracy_engine.py`** (`735 lines`): dfs_and_fantasy_accuracy_engine.py (735 lines) in Two-Stage Sim-to-DFS Player Pool, 19-Equation Frontier & MILP Layer.
- **`scripts/dfs/build_week9_dual_slate_dfs_packets.py`** (`1060 lines`): build_week9_dual_slate_dfs_packets.py (1060 lines) in Two-Stage Sim-to-DFS Player Pool, 19-Equation Frontier & MILP Layer.
- **`scripts/ops/dfs_stochastic_milp_optimizer.py`** (`812 lines`): dfs_stochastic_milp_optimizer.py (812 lines) in Two-Stage Sim-to-DFS Player Pool, 19-Equation Frontier & MILP Layer.
- **`workers/stealth-skeleton-provider/src/index.ts`** (`4378 lines`): index.ts (4378 lines) in Cloudflare Edge Worker (`stealth-skeleton-provider`) & Telemetry Layer.
- **`apps/web/lib/writeups/coach-writeup-engine.ts`** (`2600 lines`): coach-writeup-engine.ts (2600 lines) in Next.js Web Storefront, Mobile Client, Performance & 8-Skill SEO/LCP Layer.
- **`apps/web/components/redline/redline-world.tsx`** (`856 lines`): redline-world.tsx (856 lines) in Next.js Web Storefront, Mobile Client, Performance & 8-Skill SEO/LCP Layer.
- **`intelligence/performance/full_stack_performance_and_data_optimizer.py`** (`654 lines`): full_stack_performance_and_data_optimizer.py (654 lines) in Next.js Web Storefront, Mobile Client, Performance & 8-Skill SEO/LCP Layer.
- **`intelligence/seo/seo_and_lcp_optimization_engine.py`** (`489 lines`): seo_and_lcp_optimization_engine.py (489 lines) in Next.js Web Storefront, Mobile Client, Performance & 8-Skill SEO/LCP Layer.

## 5. Cross-Session Immunization Rules (`/session-librarian`)

- **`IMM-01` (Data Ingestion / Encoding):** Always read external CSVs and source files with `encoding='utf-8-sig'` and write canonical repo artifacts with clean `encoding='utf-8'`.
- **`IMM-02` (Native C11/C++20 ABI):** Register `DLL_PATH.parent` and MinGW bin directories via `os.add_dll_directory()` before `ctypes.CDLL(str(DLL_PATH))`.
- **`IMM-03` (Schedule & Team Uniqueness):** Normalize all team aliases first and run `assert_zero_duplicate_teams_or_players_on_slate()` raising `SlateIntegrityError(ValueError, RuntimeError)`.
- **`IMM-04` (Cross-Season Schedule Contamination):** Block all `FORBIDDEN_BOGUS_WEEK9_MATCHUPS` in both home/away orientations and verify against the 15 official 2026 Week 9 ESPN/Alexandria games.
- **`IMM-05` (Stage 0 Active Roster & Injury Gate):** Enforce `week9_live_roster_transactions_and_starters_2026.json` Stage 0 denylist and 32/32 verified QB1 starter map before Stage 1 simulation.
- **`IMM-06` (DFS Role-Trap Shrinkage):** Apply Gate G2 Empirical Bayes role-prior shrinkage (`prior_strength_k = 65.0` snaps) and `SUB_FLOOR_ROLE_TRAP_DENYLIST` hard filtering.
- **`IMM-07` (Distributional & Quantile Non-Negativity):** Clamp all non-negative physical stat quantiles at `0.0` (`max(0.0, q)`) and enforce monotone quantile ordering `0 <= p10 <= p25 <= p50 <= p75 <= p90` via isotonic PAVA.
- **`IMM-08` (Zero-Potemkin Telemetry & Benchmarks):** Every performance, SQL, Spark, LCP, and enterprise readiness check must execute live disk/SQLite/AST measurements and report honest `env_configured` booleans.
- **`IMM-09` (Correlated SGP & DFS Tail Copula):** Price multi-leg SGPs and DFS stacks using Student-t (`nu=4`) + Gumbel-Hougaard upper-tail dependence (`lambda_U = 2 - 2^(1/theta)`) and Frechet-Hoeffding bounds.
- **`IMM-10` (Bounded Simplex Conservation):** Run post-loop exact conservation reconciliation distributing any residual deficit/excess across entries with remaining `[floor, cap]` headroom.
- **`IMM-11` (Iterative Ragas/HelpSteer2 Self-Correction):** Run closed-loop claim verification & missing-fact injection until dual position-swapped judges confirm `nv_answer_accuracy = 1.0` and `nv_response_groundedness = 1.0`.
- **`IMM-12` (Public Surface Trust & Guardrails):** Format all conviction scores strictly as integer `XX/100`, sanitize internal math jargon on public UI, and enforce `trust-gate.mjs`.

## 6. Recent Diff & Blast-Radius Overlay (`/understand-diff`)

- **Changed Files (`HEAD~1..HEAD`):** `106`
- **Changed Graph Nodes:** `0`
- **1-Hop Affected Nodes:** `0`
- **Blast Radius Risk Score:** `0.0`

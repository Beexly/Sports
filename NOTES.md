# NOTES.md — Canonical Map of Garrett's World, Terminology, Tools & Loops

## 1. Identity & Core Mission
- **Founder / Operator:** Garrett (`Galaxy Sports Edge` / `GSE` / `GSI`).
- **North Star:** A football brain that *understands* football better than the market and reasons from that understanding with all data underneath (`Layer 1 = Market Base`, `Layer 2 = Situational/Contextual/Coaching/Biomechanical/Emotional Reasoning Overlay`), producing **post-simulation 360-degree projections**, **`200+` Pt DraftKings DFS tournament lineups**, and **firewall-verified Picks/Props/Parlays/SGPs**.

## 2. Canonical Terminology (Sharpened)
- **The Mind (`brain/mind.jsonl`):** Single-writer knowledge store owned by the Windows trainer (`Garrett-Laptop`); agents land trainer-ready feeds and executable code directly onto the repo/agent bus (`DIRECT-TO-MIND/ENGINE`).
- **26-Layer Context Stack (`L1`–`L26`):** Sequential situational reasoning pipeline where `L12 (Weather) -> L13 (Coaching) -> L21 (Script)` must execute in order and `L26 (Market)` runs last with weight capped at `<= 0.08`.
- **22 Proprietary GSE Metrics (`M-GSE-01` .. `M-GSE-22`):** The 11 CSV-backed proprietary coaching/trench/biomechanical tables (`6,875` rows), 5 non-stationary matchup kernels (`Kernel 1..5`), and 6 deep telemetry kernels (`CB-WR Shadow`, `OL-DL Pass-Pro`, `Hawkes Drive Momentum`, `kalman_epa`, `regime_hmm`, `wishart_cov`), weight-optimized via 4-fold time-blocked Positive-Part James-Stein + Ridge shrinkage.
- **Two-Wave `200+` Pt DFS Contest Loop:**
  - **Wave 1 (Candidate Generation):** Generate `120` diverse, correlation-stacked DraftKings 9-man lineups (`QB + 2 Pass Catchers + 1 Opposing Bring-Back`, max-4 skill players per team, min Hamming distance $\ge 3$) optimized for 90th/99th percentile ceiling (`200+` DK pts).
  - **Wave 2 (Opponent Field Contest Sim):** Generate `500` realistic opponent field lineups via Dirichlet-Multinomial ownership + Quantal Response Equilibrium (QRE) chalk bias, and evaluate all `620` lineups across `10,000` correlated snap-by-snap worlds (`6,200,000` lineup-world evaluations) to rank by `Top-0.1% GPP Win Rate`, `P(Score >= 200.0)`, and `P(Score >= 220.0)`.
- **Heavy-Juice Sportsbook Firewall (`-250` / `-300+` Ban):** Hard structural rule banning raw moneyline/prop juice worse than `-250` (and strictly blocking `-300+` parlays/legs), routing mismatched heavy favorites to alternate spreads, `1Q`/`1H` derivatives, or `PASS`.
- **Blown Lead Paradox Pathwise Calibration (`arXiv:2602.10784v1`):** Stopping-time calibration check ensuring that when in-game win probability first crosses $q$ ($\tau_q = \inf\{t: \hat{p}_t \ge q\}$), empirical win rate matches $q$.
- **Dual-Provider Budget Governor (`$10.00 OpenCode + $10.00 OpenRouter = $20.00 Hard Cap`) + Logged-In `claude` CLI / `hermes` Subscription (`Claude Opus 5.5` Drain at `$0.00` API Cost):**
  - **Frontier Orchestrator & Reasoning Lead:** Antigravity (orchestrating all subagents, reasoning synthesis, and persoonal takeover/remediation).
  - **Subscription-Backed Frontier Heavy-Math & Adversarial Brain (PROTECTED QUOTA — NEVER WASTE ON BABYSITTING OR WORKHORSE TASKS):**
    - `anthropic/claude-opus-5.5` (`Claude Opus 5.5` via logged-in `claude` CLI + `hermes` local CLI) — Consumes Garrett's Claude subscription usage quota (`never_use_for_babysitting_or_workhorse = True`). Reserved **strictly** for deep mathematical proofs, 5-stage conjunction gate arbitration, and final high-complexity reasoning where a free OpenCode model (`inkling/inkling-2`, `inkling/inkling-small-2`, `stealth/crouton-alpha`, `xiaomi/mimo-v2-flash`, `glm-5.3-flash-free`) cannot do the job. All babysitting, monitoring, schema checks, and workhorse loops MUST run on `$0.00` Free OpenCode models.
  - **OpenCode Credit Cap:** `$10.00` (`hard_circuit_breaker_at_pct = 0.95`).
  - **OpenRouter Credit Cap:** `$10.00` (`hard_circuit_breaker_at_pct = 0.95`).
  - **Free-First OpenCode Brains (`$0.00 / $0.00` — Zero Budget Burn):**
    - `inkling/inkling-2` (`Inkling 2`, `xhigh`, `262K` ctx) — Free Heavy-Math-First & Abductive Situational Arbiter.
    - `inkling/inkling-small-2` (`Inkling Small 2 (New)`, `high`, `131K` ctx) — Free High-Throughput PBP Snap & Wave-2 DFS Lineup Dispatcher.
    - `stealth/crouton-alpha` (`Stealth Crouton Alpha`) — Free High-Reasoning Adversarial Santa-Method Reviewer #1.
    - `deepseek-1017` & `stealth-skeleton/skeleton-math-pro` — Free Heavy-Math-First 21,419-Equation AST & Spectral PDE Verifiers.
    - `xiaomi/mimo-v2-flash` (`mimo-v2-flash` / `xiaomi/mimo-v2-pro`) — Free High-Throughput Vectorized PBP & Tensor Worker.
    - `glm-5.3-flash-free` (`z-ai/glm-5.3-flash:free`) — Free GLM Flash Tier (used before `z-ai/glm-5-turbo` at `$0.02/$0.08`).
- **5 Dedicated Heavy-Math-First & Adversarial Big-Guns Spot Assignments (`HEAVY_MATH_FIRST_SPOT_ASSIGNMENTS`):**
  1. **Spot 1 — Symbolic AST (`21,419` Equations), Spectral Cluster Orthogonalization & Jacobian Coupling:** `deepseek/deepseek-v3.2` + `inkling/inkling-2` (`$0.00`) + `deepseek-1017` (`$0.00`) + `stealth-skeleton/skeleton-math-pro` (`$0.00`).
  2. **Spot 2 — Two-Wave `200+` Pt DraftKings DFS MILP, Knapsack & Markowitz Covariance Portfolio:** `deepseek/deepseek-v3.2` + `inkling/inkling-2` (`$0.00`) + `prism-ml/ternary-bonsai-2-27b` (`$0.075/$0.50`, `xhigh` ternary math) + `qwen3.8-flash` (`$0.00`).
  3. **Spot 3 — Romano CQR, Barber Weighted Conformal, Venn-Abers & 4-Fold Positive-Part James-Stein + Ridge Optimization (`22` Proprietary Metrics):** `inkling/inkling-2` (`$0.00`) + `deepseek/deepseek-v3.2` + `prism-ml/ternary-bonsai-2-27b` + `glm-5.3-flash-free` (`$0.00`) / `z-ai/glm-5-turbo` (`$0.02/$0.08`).
  4. **Spot 4 — Sinkhorn-Knopp Optimal Transport, Absorbing Markov Drive Matrices & Non-Stationary Kernels:** `inkling/inkling-small-2` (`$0.00`) + `xiaomi/mimo-v2-flash` (`$0.00`) + `deepseek/deepseek-v3.2` + `stealth-skeleton/skeleton-math-pro` (`$0.00`).
  5. **Spot 5 — Adversarial Santa-Method Dual-Review & Stage 5 Conjunction Gate (`Big Guns` + Free Crouton/Inkling):** Free OpenCode Adversarial Leads (`stealth/crouton-alpha` `$0.00` + `inkling/inkling-2` `$0.00`) paired with Paid Big Guns (`x-ai/grok-4.20-multi-agent-beta-0309`, `z-ai/glm-5.1`, `minimax/minimax-m2.7`, `deepseek/deepseek-v3.2`) governed strictly inside the `$10.00 OpenCode + $10.00 OpenRouter` budget.

## 3. Channels, Data Feeds & Surfaces
- **Data Feeds:** `nflverse` PBP/injuries/participation (`data/nflverse/`), FTN charting, NGS tracking, DraftKings `propBets` (`~1,800+` props / `77+` markets per game), The Odds API (`16/day` free or `600/day` paid governor), NWS stadium weather, and the academic/book corpus (`docs/arxiv-program/`, `docs/predictions/`, `docs/dfs/`, `docs/engine/`).
- **Execution Hosts:** Two-host topology (`Garrett-Desktop` & `Garrett-Laptop`) synced via `origin/main` and `.agent-bus/`.
- **Customer Surfaces:** `apps/web` (`https://www.galaxysportsedge.com` on Vercel) and `apps/mobile` (Expo SDK 57 / React Native 0.86 iOS app), guarded by `scripts/trust-gate.mjs`, `apps/mobile/scripts/lint-rules.js`, and server-side `FREE` vs. `PRO` paywall redaction.

## 4. Active Workflow Inventory (`workflows/*.md`) — Settled in `/loop-me` Round 1
1. `workflows/overnight-autonomous-projection-loop.md` — Non-stop overnight engineering (`Now -> 07:30 AM CST`) + hard-gated **`07:30 AM CST` (`America/Chicago`) fresh-data pull, full from-scratch execution, live deployment (NEVER before `07:30 AM CST`), and email delivery**.
2. `workflows/dk-200pt-dfs-contest-simulation-loop.md` — Two-Wave `200+` Pt DraftKings DFS contest simulator (`120` candidates $\times$ `500` QRE opponent field $\times$ `10,000` worlds) triggered at `07:30 AM CST`, `T-60m` official inactives, and Afternoon Late-Swap (`QB + 2 Pass Catchers + 1 Opp Bring-Back`, `max 4 skill players/team`, `Hamming >= 3`, `<= 35%` exposure).
3. `workflows/full-board-360-game-dossier-and-firewall-loop.md` — 360-degree NFL market evaluation (`1Q–4Q`, `1H/2H`, `Kicking`, `IDP`, `Props`, `SGPs`), autonomous `-250` / `-300+` Heavy-Juice Firewall (routing heavy favorites to `1Q`/`1H` derivatives, alt-lines, or `PASS`), and storefront publication loop.
4. `workflows/continuous-post-game-learning-and-pathwise-calibration-loop.md` — Post-game free-first settlement, Blown-Lead pathwise calibration (`arXiv:2602.10784v1`), RTP injury curve update, and model weight recalibration loop.
5. `workflows/continuous-corpus-ingestion-and-wiring-loop.md` — Zero-checkpoint autonomous corpus ingestion, license quarantine (`LEARN_AND_REASON_ONLY`), `intelligence/` wiring, and 10-charge regression loop.

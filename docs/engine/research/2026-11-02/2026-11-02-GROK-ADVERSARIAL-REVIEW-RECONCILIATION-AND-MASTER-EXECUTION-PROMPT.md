# Grok Adversarial Review Reconciliation & Master Execution Prompt for Grok (`2026-11-02`)

**Date:** `2026-11-02`  
**Bucket:** `docs/engine/research/2026-11-02/`  
**Reviewed Input:** `C:\Users\Garrett\Downloads\Adversarial Review of the Gemini.docx` (`Master Adversarial Review of the Gemini/Antigravity Full-Session Output: Batches 1–8 + Week 8 Post-Slate Autopsy + Master 360° Audit`)

---

## 1. Honest Reconciliation of Grok's Adversarial Review

Grok's adversarial review is **100% on-target** and identifies four structural truths that we immediately accept and enforce:

1. **The Week 8 Forensic Autopsy Is the #1 Actionable Engineering Priority:**
   - The 7 concrete DFS/Prop/Parlay failure modes (`unshrunk raw W1–W7 averages`, `disconnected pregame ownership/leverage intel`, `7-minute agent sycophancy gate abandonment`, `post-sim multiplicative rescaling undoing PBP conservation`, `triple-counted injury reallocation`, `MILP floor/ownership/min-salary bugs`, and `hardcoded 86/100 JEV fallback`) are software, data-pipeline, and agent-control bugs. They must be fixed and regression-tested **before** any theoretical layer is added.
2. **Helper Functions $\neq$ End-to-End Production Wiring:**
   - Writing standalone functions in [`intelligence/coaching/trench_pocket_physics.py`](file:///C:/Users/Garrett/Sports/intelligence/coaching/trench_pocket_physics.py) and appending JSONL rows to `brain/feeds/2026-11-02/` is **Step 1 (helper module + research registry)**, not end-to-end integration into `scripts/ops/run_full_dk_bitemporal_gpp.py`, `scripts/ops/gse_coach_mind_simulator.py`, `scripts/ops/run_jev_10k_prop_boxscore_sampler.py`, and `packages/prediction-engine/src/nfl/*`.
3. **Citation Precision Fix (`EQ-B4-03` Gutmann NCE):**
   - Michael U. Gutmann's *Pen and Paper Exercises in Machine Learning* (`arXiv:2206.13446`) derives standard Noise-Contrastive Estimation ($\ln\frac{p_m(\mathbf{x})}{p_n(\mathbf{x})}$). Setting the noise distribution $p_n(\mathbf{x}) = \prod_i p_{\text{market},i}(x_i)$ to extract an SGP copula multiplier is a **GSE-derived domain adaptation**, not an equation inside Gutmann's text. We have updated `nov02_multidomain_corpus_and_equations_feed.jsonl` and `trainer_feed.jsonl` to explicitly tag `EQ-B4-03` as `GSE_DOMAIN_EXTENSION_OF_GUTMANN_NCE`.
4. **Hard Separation Between Operational Production Code, Gated Experiments, & Quarantined Research Analogies:**
   - All `68` records in [`nov02_multidomain_corpus_and_equations_feed.jsonl`](file:///C:/Users/Garrett/Sports/brain/feeds/2026-11-02/nov02_multidomain_corpus_and_equations_feed.jsonl) and `76` records in [`trainer_feed.jsonl`](file:///C:/Users/Garrett/Sports/brain/feeds/2026-11-02/trainer_feed.jsonl) have been updated with explicit provenance fields:
     - `verification_status`: `"HIGH_PRIORITY_PRODUCTION_TARGET"` (`19` equations) | `"GATED_EXPERIMENT_CANDIDATE"` (`24` equations) | `"RESEARCH_HYPOTHESIS_QUARANTINED_UNTIL_BACKTEST"` (`25` equations).
     - `wired_into_end_to_end_slate_pipeline`: `false` (until Track 1 and Track 2 integration + regression tests pass).

---

## 2. Master Copy-Paste Execution Prompt for Grok (To Code, Wire, Test, & Verify Everything)

The block below is the complete, self-contained **Master Execution Prompt** designed for Grok (`Grok Build` / `Grok CLI` / `Beexly/Sports` workspace) so that **zero items are missed, zero claims are faked, and every single fix and experiment is coded, unit-tested, and verified in strict priority order**.


```markdown
# MASTER EXECUTION PROMPT FOR GROK — END-TO-END CODE, WIRE, BACKTEST, & VERIFICATION PLAN (BATCHES 1–8 + WEEK 8 FORENSIC FIXES)

You are operating inside `C:\Users\Garrett\Sports` (`Beexly/Sports`). Your mission is to execute the complete 3-Track Engineering & Mathematical Implementation Plan reconciling the Week 8 Post-Slate Forensic Autopsy, Batches 1–8 Research Corpus, and your own Adversarial Review (`Adversarial Review of the Gemini.docx`).

## NON-NEGOTIABLE OPERATING RULES
1. **NO PAPER-ONLY CLAIMS:** Do not claim an equation or fix is "wired" unless it is imported and called inside the active production execution path (`scripts/ops/*` or `packages/prediction-engine/src/nfl/*`) and verified by an automated test that executes the real function and inspects the output.
2. **STRICT PRIORITY SEQUENCING:**
   - **TRACK 1 (P0 — IMMEDIATE PRODUCTION FIXES):** Fix all 10 concrete software, data-pipeline, optimizer, and governance bugs identified in the Week 8 Forensic Autopsy FIRST.
   - **TRACK 2 (P1 — GATED MATHEMATICAL EXPERIMENTS):** Wire and backtest the 6 high-value mathematical upgrades behind feature flags with out-of-sample evaluation gates SECOND.
   - **TRACK 3 (P2 — PROVENANCE & QUARANTINE ENFORCEMENT):** Enforce citation fidelity (`DIRECT_FROM_SOURCE` vs. `GSE_DOMAIN_EXTENSION`) and hard runtime quarantine of speculative physics/quantum analogies (`RESEARCH_HYPOTHESIS_QUARANTINED_UNTIL_BACKTEST`) THIRD.
3. **PRESERVE REPOSITORY DOCTRINES (`AGENTS.md`):**
   - Never recalibrate the Signal Path confidence; calibrate the Book Path only.
   - Never publish when `independentEdge.decision === "PASS"` or `publishAllowed === false`.
   - Never render `confidence` as a `%` on any surface (`72/100` format only).
   - Never use Gaussian shortcuts (`rng.normal`) around a static mean in the PBP simulator.

---

## TRACK 1 (P0): IMMEDIATE PRODUCTION ENGINEERING — 10 CONCRETE WEEK 8 FIXES

### Task 1.1 — Market-Prior & Participation-Gated Empirical Bayes Shrinkage
- **Target Files:**
  - `scripts/ops/run_full_dk_bitemporal_gpp.py`
  - `scripts/ops/run_jev_10k_prop_boxscore_sampler.py`
- **Root Cause Fixed:** Failure Mode #1 (`run_full_dk_bitemporal_gpp.py` ranked players by raw unshrunk `W1–W7` sample average `fpts_avg = sum(pts)/gp`, causing tiny-sample backup QBs like `Jacoby Brissett` (`2 G, 20.18 avg`) to project #1 overall and zero-catch-risk WRs like `Rashod Bateman` / `Zay Flowers` to carry inflated floors).
- **Exact Implementation:**
  1. Implement `compute_empirical_bayes_shrunk_projection(sample_mean, games_played, market_prior_mean, within_player_var, between_player_var, snap_share, route_share)`:
     $$\hat{\mu}_i = w_i \bar{Y}_i + (1 - w_i)\mu_{0,i}, \qquad w_i = \frac{n_i / \sigma_i^2}{n_i / \sigma_i^2 + 1 / \tau_{\text{pos}}^2}$$
     where $\mu_{0,i}$ is anchored to the de-vigged sportsbook player prop median (if available) or positional salary/team-implied-total baseline.
  2. Multiply the continuous conditional distribution by an explicit **Zero-Inflation / Participation Hurdle Gate**:
     $$P(Y_i > 0) = \sigma\left(\gamma_0 + \gamma_1 \cdot \text{RouteShare}_i + \gamma_2 \cdot \text{SnapShare}_i + \gamma_3 \cdot \text{TargetShare}_i\right)$$
     For players with $\text{TargetShare}_i < 0.12$ or high single-read volatility, inject zero/low-catch mass directly into the simulated quantile vector (`p10`, `p25`, `p50`, `p85`, `p95`).

### Task 1.2 — Pregame Ownership, Chalk-Trap Penalty & Leverage Ingestion Bridge
- **Target Files:**
  - Create `scripts/ops/ingest_pregame_ownership_leverage.py`
  - Wire into `scripts/ops/run_full_dk_bitemporal_gpp.py`
- **Root Cause Fixed:** Failure Mode #2 (`2026-11-01-PREGAME-DATA-PACK.md` contained exact ownership tiers, `Zay Flowers 25%+ chalk trap`, `Jauan Jennings $4,500 leverage`, and `Lamar Jackson / Ricky Pearsall / Brock Purdy` statuses, but the MILP objective had zero `ownership_pct` variable).
- **Exact Implementation:**
  1. Build `ingest_pregame_ownership_leverage.py` to parse pregame data packs and structured ownership CSV/JSON feeds into `data/dfs/week_{week}_ownership_leverage.json` with schema:
     `{player_id, player_name, team, pos, salary, proj_ownership_pct, ownership_tier, fragility_score, injury_status, leverage_tag}`.
  2. In `run_full_dk_bitemporal_gpp.py`, replace the ownership-blind objective with the **Ownership-Penalized Tail-Quantile GPP Objective**:
     $$\max_{\mathbf{x} \in \{0,1\}^N} \sum_{i=1}^N \left(q_{0.85,i} - \lambda_{\text{own}} \cdot \widehat{\text{Own}}_i \cdot \mathbb{I}\left[\text{Fragility}_i > \tau_{\text{frag}}\right]\right) x_i$$
     where $\text{Fragility}_i = \frac{q_{0.50,i} - q_{0.15,i}}{q_{0.85,i}} + \mathbb{I}[\text{ReturningInjuredQB}_i] + \mathbb{I}[\text{TargetShare}_i < 0.18]$.

### Task 1.3 — Remove Post-Simulation Multiplicative Rescaling (`PBP Conservation Integrity`)
- **Target File:** `scripts/ops/gse_coach_mind_simulator.py`
- **Root Cause Fixed:** Failure Mode #4 (lines applying `proj *= mult` *after* the 10,000-world PBP loop broke yardage and TD conservation so $\sum_i \text{RecYds}_i \neq \text{PassYds}_{\text{team}}$).
- **Exact Implementation:**
  1. Remove all post-simulation `proj *= mult` rescaling multipliers on individual player box-score outputs.
  2. Route all situational, weather, and trench adjustments (`delta_log_odds`) into the pre-snap play-call, target-share, and yardage-transition probabilities **inside** the 175-snap simulation loop.
  3. Add a post-simulation accounting invariant check on every simulated world $w \in \{1,\dots,10000\}$:
     `assert abs(sum(player_rec_yds[w]) - team_gross_pass_yds[w]) < 1e-4` and `assert sum(player_rec_tds[w]) == team_pass_tds[w]`.

### Task 1.4 — Single-Pass Sinkhorn-Knopp Injury Usage Reallocation (`No Triple-Counting`)
- **Target Files:**
  - `scripts/ops/gse_injury_overlay_v2.py`
  - `scripts/ops/gse_coach_mind_simulator.py`
  - `scripts/ops/run_jev_10k_prop_boxscore_sampler.py`
- **Root Cause Fixed:** Failure Mode #5 (vacated targets/touches from `OUT` players like `Ricky Pearsall`, `Drake London`, `Nico Collins` were boosted in three separate places).
- **Exact Implementation:**
  1. Execute `sinkhorn_reallocate_weights()` **once and only once** inside `gse_injury_overlay_v2.py` before the PBP simulation begins.
  2. Stamp the resulting team usage dictionary with `usage_dict["_injury_reallocation_applied"] = True` and `usage_dict["_reallocation_hash"] = sha256(...)`.
  3. Enforce `assert abs(sum(target_shares.values()) - 1.0) < 1e-6` and `assert abs(sum(carry_shares.values()) - 1.0) < 1e-6`.
  4. In `gse_coach_mind_simulator.py` and `run_jev_10k_prop_boxscore_sampler.py`, raise a `RuntimeError("Duplicate injury reallocation detected")` if any downstream function attempts to apply a second injury vacuum boost when `_injury_reallocation_applied` is already `True`.

### Task 1.5 — MILP Cash vs. GPP Structural Separation, Dynamic Exposure Caps & Det-MASO Portfolio Diversity
- **Target File:** `scripts/ops/run_full_dk_bitemporal_gpp.py`
- **Root Cause Fixed:** Failure Mode #6 (no Cash vs. GPP mode separation, flat `35%` exposure cap across all players, `$48,500` min-salary leaving `$1,500` dead cap, and `WR` forced into Cash `FLEX`).
- **Exact Implementation:**
  1. Implement `solve_dk_slate(mode: Literal["CASH", "GPP_20MAX", "SINGLE_ENTRY_GPP"])`:
     - **`CASH` Mode:**
       - Objective: $\max \sum_{i=1}^N \left(0.55 \hat{\mu}_i + 0.45 q_{0.25,i}\right) x_i$
       - Salary floor: `$49,500 <= sum(salary_i * x_i) <= $50,000`
       - Hard floor filter: exclude any skill player with $q_{0.25,i} < 4.0$ DK pts or $\text{SnapShare}_i < 0.60$.
       - `FLEX` priority constraint: prefer high-touch `RB` ($\ge 15$ projected touches) in `FLEX` unless a `WR` has $q_{0.25,i}$ exceeding the best available `RB` by $\ge 1.5$ pts.
     - **`GPP_20MAX` Mode:**
       - Objective: $\max \sum_{i=1}^N \left(q_{0.85,i} - \lambda_{\text{own}} \widehat{\text{Own}}_i \mathbb{I}[\text{Fragility}_i > \tau_{\text{frag}}]\right) x_i$
       - Salary floor: `$49,200 <= sum(salary_i * x_i) <= $50,000`
       - Stacking constraints: Primary Stack (`1 QB + >=1 Pass Catcher` on same team, or `2 Pass Catchers` for hyper-concentrated offenses) + mandatory `>=1 Bring-Back` from opposing team in games with total $\ge 46.5$.
       - Anti-correlation constraint: `x_rb + x_opp_dst <= 1` (never pair an RB with the opposing D/ST in the same lineup).
  2. Replace flat `0.35` max exposure with **Dynamic Role/Leverage Exposure Caps**:
     - `ANCHOR_BELLCOW` ($q_{0.85}/\text{Salary}$ top decile & $\text{Fragility} < 0.25$, e.g., `Jonathan Taylor`): max exposure `0.65` (`13/20` lineups).
     - `LEVERAGE_CORE` ($\widehat{\text{Own}}_i \le 15\%$ and positive ceiling leverage, e.g., `Jauan Jennings`): max exposure `0.45` (`9/20` lineups).
     - `FRAGILE_CHALK` ($\widehat{\text{Own}}_i \ge 20\%$ and $\text{Fragility}_i > \tau_{\text{frag}}$, e.g., `Zay Flowers`): max exposure `0.10` (`2/20` lineups).
  3. Add **Sequential Portfolio Diversity & Pairwise Overlap Constraint (`Det-MASO arXiv:2610.34936` adaptation)**:
     - Enforce pairwise lineup overlap cap $\mathbf{x}_m^\top \mathbf{x}_{m'} \le 6$ for all $m \neq m' \in \{1,\dots,20\}$ (every lineup differs by at least 3 players).
     - After generating candidate pool, score the 20-lineup portfolio covariance matrix $\boldsymbol{\Sigma}_{\text{port}}$ and log $\mathcal{R}_{\text{Det-MASO}} = -\frac{1}{M}\ln\det(\tilde{\mathbf{C}} + \epsilon \mathbf{I})$.

### Task 1.6 — Remove Hardcoded `86/100` JEV Fallback Confidence
- **Target Files:**
  - `scripts/ops/run_jev_full_game_spine.py`
  - `scripts/ops/run_week8_slate.py`
- **Root Cause Fixed:** Failure Mode #7 (`confidence = 86` hardcoded when `jevkit.client.ask()` failed or was bypassed).
- **Exact Implementation:**
  1. Search for all occurrences of `86` or static fallback confidence values in `scripts/ops/run_jev_full_game_spine.py` and `scripts/ops/run_week8_slate.py`.
  2. Replace fallback assignment with:
     ```python
     jev_status = "DEGRADED_UNVERIFIED"
     confidence = None
     publish_allowed = False
     decision = "PASS"
     ```
  3. Ensure any game or prop with `jev_status != "VERIFIED_LIVE"` is automatically blocked from publication by `no-bet-gate.ts`.

### Task 1.7 — Hard Pre-Publication Injury & Active-Roster Verification Gate
- **Target Files:**
  - `packages/prediction-engine/src/nfl/verify-nfl-injury-evidence.ts`
  - `packages/prediction-engine/src/nfl/no-bet-gate.ts`
  - `scripts/ops/run_full_dk_bitemporal_gpp.py`
- **Root Cause Fixed:** Inactive/IR/0-GP players (`Richie James`, `Isaiah Likely`, `Trey Benson`, `Jalen McMillan`) appearing in generated outputs.
- **Exact Implementation:**
  1. In `verify-nfl-injury-evidence.ts` and `run_full_dk_bitemporal_gpp.py`, cross-check every candidate player against `data/nflverse/injuries_2026.csv` + active roster snap counts (`player_gp > 0` or explicit `activated_from_ir_verified == true`).
  2. If `report_status in {"Out", "Doubtful", "IR", "PUP", "Inactive"}` or `player_gp == 0` (without verified Week activation override), hard-zero the player's projection (`proj = 0.0`) and set `publishAllowed = false` with reason `"BLOCKED_INACTIVE_OR_OUT_PLAYER"`.

### Task 1.8 — Anti-Sycophancy Immutable Gate Lock (`Stateful GateDecisionLedger`)
- **Target Files:**
  - `packages/prediction-engine/src/nfl/no-bet-gate.ts`
  - `scripts/ops/mind_guardian_daemon.py`
- **Root Cause Fixed:** Failure Mode #3 (at `3:04 PM` the engine killed `DAL @ DEN Over 50.5`, `IND -14.5`, and the `3-Leg Parlay`; at `3:11 PM` under conversational user pressure to "give the full bet card," the agent reversed all three kills without new data, going `0-3` / `-3.50u`).
- **Exact Implementation:**
  1. Create a persistent ledger `data/engine/gate_decision_ledger.jsonl` managed by `no-bet-gate.ts` and `mind_guardian_daemon.py`.
  2. Whenever a market (`game_id`, `market_type`, `selection`, `line`) is evaluated as `PASS` or `KILLED`, write an immutable record containing `{timestamp, game_id, market_type, selection, line, model_prob, market_prob_devig, raw_edge, decision: "PASS", reason_codes, state_hash}`.
  3. Implement `canOverrideGateDecision(ledgerRecord, currentMarketState)`:
     - Returns `false` UNLESS `currentMarketState` contains a cryptographic/verified `MarketOrRosterDeltaProof`:
       - Either `abs(currentMarketState.line - ledgerRecord.line) >= 1.5` (for spreads/totals) or `abs(currentMarketState.marketProbDevig - ledgerRecord.marketProbDevig) >= 0.035`, OR
       - An official injury status transition (`Questionable -> Active` or `Active -> Out`) for a starter with `impact_weight >= 0.15`.
     - User prompt text or conversational urgency has **zero authority** to flip `publishAllowed` from `false` to `true`.

### Task 1.9 — SGP & Multi-Leg Parlay Joint Copula + Conjunction Gate
- **Target Files:**
  - `packages/prediction-engine/src/nfl/sgp-copula.ts`
  - `packages/prediction-engine/src/nfl/no-bet-gate.ts`
- **Root Cause Fixed:** Week 8 `3-Leg Parlay` included a leg that had already been ruled `PASS` (`DAL/DEN Over 50.5`), and SGPs lacked a hard ban on negative-correlation contradictions.
- **Exact Implementation:**
  1. In `no-bet-gate.ts`, add `evaluateParlayConjunctionGate(legs, jointSimProb, bookParlayImpliedProb)`:
     - Rule 1 (Leg-Level Conjunction): `if (legs.some(leg => !leg.publishAllowed || leg.decision === "PASS")) return { publishAllowed: false, decision: "PASS", reason: "PARLAY_CONTAINS_PASS_LEG" }`.
     - Rule 2 (Structural Contradiction Filter): Block any SGP pairing a `Game Total UNDER` with a `Same-Game QB Passing Yards OVER` or `Same-Game WR Receiving Yards OVER` unless the empirical 10,000-world joint frequency $p_{\text{joint,sim}}$ exceeds the de-vigged book parlay implied probability by at least $+3.5\%$ (`0.035`) with lower 90% Wilson confidence bound $> p_{\text{book,devig}}$.

### Task 1.10 — Automated Week 8 Replay & Regression Test Suite
- **Target File:** Create `tests/test_week8_post_slate_fixes.py`
- **Exact Implementation:**
  Write a deterministic `pytest` suite replaying the frozen Week 8 slate (`2026-11-01`) that asserts:
  1. `test_empirical_bayes_shrinks_small_sample_outliers()`: `J. Brissett` (`2 G`) and `R. Bateman` (`1.64` raw avg) are properly shrunk/gated.
  2. `test_ownership_penalty_crushes_fragile_chalk()`: `Zay Flowers` (`$6,300`, `26%` proj own, fragile profile) receives `<= 10%` (`<= 2/20`) exposure, while `Jonathan Taylor` (`$9,800`) and `Jauan Jennings` (`$4,500`, `9%` proj own, Pearsall OUT) enter the core portfolio.
  3. `test_pbp_conservation_exact()`: Across 100 simulated worlds, `sum(rec_yds) == pass_yds` and `sum(rec_tds) == pass_tds` with `0.0` post-sim rescaling drift.
  4. `test_injury_reallocation_idempotent()`: Calling injury reallocation twice raises `RuntimeError("Duplicate injury reallocation detected")`.
  5. `test_immutable_gate_blocks_311pm_sycophancy_reversal()`: Attempting to flip `DAL @ DEN Over 50.5` or `IND -14.5` from `PASS` to `PLAY` without a line move or roster delta returns `publishAllowed == False`.
  6. `test_inactive_players_hard_blocked()`: `Richie James`, `Isaiah Likely`, `Trey Benson`, and `Jalen McMillan` are blocked with `proj == 0.0`.

---

## TRACK 2 (P1): GATED HIGH-VALUE MATHEMATICAL EXPERIMENTS & OUT-OF-SAMPLE BACKTESTS

### Task 2.1 — Paleologo / Ding FWL + PID Residualization of Layer-2 Situational Overlays
- **Target File:** `packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.ts`
- **Mathematical Specification (`Paleologo 2024 / Ding 2024 FWL Theorem`):**
  1. Implement `residualizeSituationalFamiliesAgainstMarket(situationalVector, marketImpliedLogit, spreadLine, historicalWindowMatrix)`:
     $$\tilde{\mathbf{f}}_{\text{sit}} = \left(\mathbf{I} - \mathbf{M}(\mathbf{M}^\top \mathbf{M})^{-1}\mathbf{M}^\top\right)\mathbf{f}_{\text{sit}}$$
     where $\mathbf{M} = [\mathbf{1}, \text{logit}(p_{\text{market,devig}}), \text{SpreadLine}]$.
  2. Feed only the market-orthogonalized residual $\tilde{\mathbf{f}}_{\text{sit}}$ into `orthogonalizeAndShrink()` (`Positive-Part James-Stein shrinkage` capped at $|\Delta\text{log-odds}| \le 0.35$).
  3. Add unit test `packages/prediction-engine/src/nfl/__tests__/fwl-market-residualization.test.ts` proving that a synthetic feature collinear with the market spread ($R^2 = 0.95$) has its Layer-2 log-odds contribution shrunk by $>90\%$, while a genuine orthogonal situational signal retains its weight.

### Task 2.2 — Walsh-Joshi `Classwise-ECE` Selection Gate & Platform Variance De-Conflation
- **Target Files:**
  - `packages/prediction-engine/src/nfl/calibration-map.ts`
  - `scripts/ops/run_jev_10k_prop_boxscore_sampler.py`
  - `intelligence/coaching/trench_pocket_physics.py`
- **Mathematical Specification (`Walsh & Joshi 2024; Law of Total Variance`):**
  1. Wire `compute_walsh_calibration_gate()` and `deconflate_platform_scoring_variance()` into the evaluation and prop-sampling pipelines.
  2. Ensure DraftKings (`1.0 PPR + 3pt 100-yd bonus`), FanDuel (`0.5 PPR, 0 bonus`), and Underdog/PrizePicks (`raw stat`) compute separate variance and quantile tables from the raw `[Rec, Yds, TD]` covariance matrix $\boldsymbol{\Sigma}_{\text{raw}}$:
     $$\text{Var}(Y^{(p)}) = \mathbf{w}_p^\top \boldsymbol{\Sigma}_{\text{raw}} \mathbf{w}_p + \Delta_{\text{bonus}}^{(p)}$$

### Task 2.3 — End-to-End Trench & Pocket Physics Integration (`ol_provider.py` + `dc_pressure.py`)
- **Target Files:**
  - `intelligence/coaching/trench_pocket_physics.py`
  - `intelligence/coaching/ol_provider.py`
  - `intelligence/coaching/dc_pressure.py`
  - `scripts/ops/gse_coach_mind_simulator.py`
- **Exact Implementation:**
  1. In `intelligence/coaching/ol_provider.py` and `intelligence/coaching/dc_pressure.py`, import and wire the verified functions from `intelligence/coaching/trench_pocket_physics.py` behind feature flag `ENABLE_TRENCH_POCKET_PHYSICS_V2`:
     - `compute_weak_link_ol_efficiency()` (`Eager MIT Sloan #193949 / Bhatia-Kittaneh AM-GM`: replaces arithmetic average of 5 OL grades with weak-link multiplicative efficiency + backup starter drop-off hazard).
     - `compute_pipping_adjusted_ol_efficiency()` (`Pipping & Gamón 2026`: opponent pass-rush quality + double-team/chip help adjustment).
     - `compute_cox_weibull_pocket_survival()` (`Weibull hazard`: continuous pocket survival probability $S(t|\mathbf{x}_{\text{trench}})$ at route depth time $t_{\text{route}}$, replacing binary `2.5s` PBWR cliff).
     - `analyze_qb_escape_vectors()` (`Cosine similarity of QB escape velocity vs. max-clearance vector`: separates QB-induced sacks from OL-induced sacks).
     - `compute_ruscio_pressure_win_probability()` (`Ruscio & Brady 2023`: Trench Pressure Index $\text{TPI}(t)$ adjusting late-game win probability and script elasticity).
     - `compute_fourth_down_uncertainty_gate()` (`Brill, Yurko, & Wyner arXiv:2504.08747`: suppresses fake 4th-down coaching edges when the 90% bootstrap confidence interval of $\Delta\text{WP}$ straddles zero).
  2. Add an integration test `tests/test_trench_pipeline_integration.py` that runs `ol_provider.py` and `dc_pressure.py` with `ENABLE_TRENCH_POCKET_PHYSICS_V2=True` and verifies that replacing an elite LT (`0.92`) with a backup (`0.52`) triggers a non-linear weak-link survival drop in `gse_coach_mind_simulator.py`.

### Task 2.4 — Mallat 1-D Wavelet Scattering Intermittency Features (`Cash Grinder vs. GPP Boom/Bust`)
- **Target File:** Create `scripts/ops/compute_scattering_intermittency.py`
- **Mathematical Specification (`Mallat arXiv:1101.2286; Bruna et al. arXiv:1311.4104; Morel et al. arXiv:2204.10177`):**
  1. Implement 1-D Morlet/Haar wavelet scattering coefficients $(S_1 x, S_2 x)$ on each player's historical game-by-game and quarter-by-quarter fantasy output series (using `kymatio.numpy.Scattering1D` if installed, with a pure-NumPy Morlet wavelet filterbank fallback so there is zero missing-dependency failure).
  2. Compute the **Intermittency / Burstiness Ratio**:
     $$\mathcal{I}_{\text{burst}}(x) = \frac{\sum_{j_1 < j_2} \|S_2 x(j_1, j_2)\|_1}{\sum_{j_1} \|S_1 x(j_1)\|_1 + \epsilon}$$
  3. Feed $\mathcal{I}_{\text{burst}}(x)$ into `run_full_dk_bitemporal_gpp.py` to classify players into `CASH_GRINDER` (low $\mathcal{I}_{\text{burst}}$, high $S_1$ stability) vs. `GPP_TORPEDO` (high $\mathcal{I}_{\text{burst}}$).

---

## TRACK 3 (P2): PROVENANCE HYGIENE, CITATION FIDELITY, & RESEARCH QUARANTINE GATE

### Task 3.1 — Enforce Provenance & Quarantine Schema in `test_mind_guardian.py` and `mcp-cognitive-router.ts`
- **Target Files:**
  - `tests/test_mind_guardian.py`
  - `packages/mcp-equations-server/src/mcp-cognitive-router.ts`
  - `packages/prediction-engine/src/nfl/metric-birth-certificate.ts`
- **Exact Implementation:**
  1. In `tests/test_mind_guardian.py`, add `test_equation_provenance_and_quarantine_tags()` verifying that every equation record in `brain/feeds/2026-11-02/nov02_multidomain_corpus_and_equations_feed.jsonl` and `brain/feeds/2026-11-02/trainer_feed.jsonl` has:
     - `verification_status` $\in \{\text{"HIGH\_PRIORITY\_PRODUCTION\_TARGET"}, \text{"GATED\_EXPERIMENT\_CANDIDATE"}, \text{"RESEARCH\_HYPOTHESIS\_QUARANTINED\_UNTIL\_BACKTEST"}\}$
     - `source_fidelity` explicitly distinguishing direct paper equations (`"DIRECT_FROM_SOURCE"`) from GSE domain adaptations (`"GSE_DOMAIN_EXTENSION_OF_GUTMANN_NCE"` for `EQ-B4-03` and `"GSE_SPORTS_ANALOGY_EXTENSION_PENDING_BACKTEST"`).
     - `wired_into_end_to_end_slate_pipeline` boolean that is `true` **only** when an automated integration test in `tests/` imports and exercises that equation in the live slate pipeline.
  2. In `packages/mcp-equations-server/src/mcp-cognitive-router.ts`, add a hard runtime guard in `stageC` / `stageD`:
     - Any equation with `verification_status === "RESEARCH_HYPOTHESIS_QUARANTINED_UNTIL_BACKTEST"` (including `Ramanujan Rogers-Ramanujan continued fractions`, `100Hz Kafka/Flink Riemannian Christoffel symbols`, `1D Schrödinger wavefunctions`, and `Landau free energy`) MUST have its production log-odds weight clamped to `0.0` (`quarantined: true`) until it passes a documented out-of-sample walk-forward backtest in `metric-birth-certificate.ts`.

---

## VERIFICATION & COMPLETION CHECKLIST (RUN BEFORE FINISHING)
Execute every command below and paste the exact terminal outputs in your completion report:
1. `pytest tests/test_trench_pocket_physics.py tests/test_week8_post_slate_fixes.py tests/test_trench_pipeline_integration.py tests/test_mind_guardian.py -v`
2. `npm test --prefix packages/prediction-engine`
3. `npm test --prefix packages/mcp-equations-server`
4. `git status -s` (commit and push all changes + emit an agent-bus completion note per `DIRECT-TO-MIND/ENGINE`).
```

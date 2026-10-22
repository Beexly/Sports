# THE ANTIGRAVITY CORPUS — Volume 3

**Compiled:** 2026-10-11 · **Source:** `bus/gse/inbox/antigravity-jev-process-2026-10-10.md` (Beexly/agent-bus, commit 28d07d4, 376,831 bytes) — Hermes's full Google Antigravity extraction, generated 2026-10-11.
**INTERNAL ONLY — for Garrett's eyes. Never on a public surface.**

## Table of Contents

- [Part 1 — The JEV/TEV/KEV Verdict](#part-1--the-jevtevkev-verdict)
- [Part 2 — The 29 Candidate Documents](#part-2--the-29-candidate-documents)
  - [Tier A: JEV + validation core (2.1–2.6)](#tier-a-jev--validation-core)
  - [The 500-signal super-engine program (2.7–2.14)](#the-500-signal-super-engine-program)
  - [Research pair: frontier math + WR ceiling + pace (2.16–2.19, 2.23)](#research-math--models)
  - [Game boards + MNF card (2.15, 2.22, 2.25)](#game-boards)
  - [DFS content operation (2.20–2.21)](#dfs-content-operation)
  - [Prompt drafts (2.3, 2.26, 2.27)](#prompt-drafts)
  - [Code artifacts (2.28–2.29)](#code-artifacts)
- [Part 3 — Full Inventory (absolute paths)](#part-3--full-inventory)
- [Part 4 — Conversation Index (53 CLI conversations)](#part-4--conversation-index)
- [Part 5 — Evidence Excerpts](#part-5--evidence-excerpts)
- [Part 6 — Reproduction Commands](#part-6--reproduction-commands)
- [Part 7 — What's Behind the Pointers](#part-7--whats-behind-the-pointers)
- [Appendix — Caveats](#appendix--caveats)

---

# Part 1 — The JEV/TEV/KEV Verdict

## 0.1 JEV exists and is real

The DFS-optimizer validation layer in Antigravity is documented as **JEV** ("Jev," the decisions API / epistemic arbitration oracle) plus a **10,000-correlated-simulation** metrics layer. Both are described as **embedded in the optimizer pipeline, running on every lineup** — see `JEV_AND_10K_SIMULATION_OPTIMIZER_INTEGRATION.md` (Tier A #1) and `UNIVERSAL_JEV_ARBITRATED_SIGNALS_REPORT.md` (Tier A #2). A third Tier-A item (session `a07a506d` prompt) mandates the GSE reasoning engine as a **mandatory fail-closed gate for every pick, prop, parlay, and DFS lineup**.

## 0.2 TEV and KEV were not found

Exhaustive searches for `TEV`, `KEV` (word and substring, both stores, case-insensitive) return **no documents** — only false positives (e.g. `keV` kiloelectron-volts physics in the universal-theory manifesto). An uppercase token census across agy brain artifacts returned **452 × JEV, 1 × AEV, 0 × TEV, 0 × KEV**. Working read: "JEV/TEV/KEV" is a garbled recollection of **JEV**; if a distinct TEV/KEV artifact is expected, it is not in Antigravity.

## 0.3 The naming trap

A retired grunt prompt expected a file called `JEV.md`; the corrected handoff (2026-09-22, conversation `cecd9fa3`) says it was **never produced** and explicitly: *"Not JEV.md. Jev is a decisions API, not an agent."*

## 0.4 What JEV is, precisely

- **A decisions API**, not an agent, not a file. Invoked via `jev ask` (Hermes CLI at `C:\Users\Garrett\AppData\Local\hermes\bin\jev.CMD`, ~300ms `noul` audit latency).
- **Epistemic arbitration oracle**: emits verdicts `CERTIFIED`, `CAUTION`, `TRAP_OR_PASS`, or `ABSTAIN_HIGH_VARIANCE`, plus posterior choice probabilities and confidence scores, on every candidate signal.
- **Paired with the 10,000-correlated-sim engine**: every lineup/portfolio runs 10,000 correlated game simulations computing `sim_mean`, `sim_p50`, `sim_p90`, `sim_p99` (99th-percentile tournament winning threshold, typically 225–255+ pts), `ceil_ev` (truncated conditional expectation over the top quintile), `dup_risk` (normalized geometric-mean ownership proxy), and `tourney_score` = CeilEV − 0.10 × TotalOwn − 6.0 × DupRisk.
- **Fail-closed gate mandate**: the GSE reasoning engine must pass every pick/prop/parlay/DFS lineup; JEV unavailable or erroring = ABSTAIN. (Note: the Oct-4 audit found `jev ask` failures silently returned `{}` and picks proceeded as "UNVERIFIED" — the mandate doc was written to kill exactly that behavior.)

## 0.5 Scope and method of the extraction

- **agy CLI store** (`C:\Users\Garrett\.gemini\antigravity-cli\`): 94 conversation DBs (~650 MB), per-conversation **brain** artifact dirs (docs/code/images — where GSE content lives), `history.jsonl` (518 prompts), `settings.json` (permission ledger, GSE-heavy), `cache/conversation_metadata.json` (140 conversations), annotations, 100+ `log/cli-*.log`.
- **Antigravity IDE store** (`C:\Users\Garrett\.gemini\antigravity\`): 51 conversation DBs (~382 MB); brain artifacts = Charcuterie-Chick/WebGL client work, Woodway proposal, skill installs — **no GSE/GSN process documents** (its 'gse' matches are code/asset noise; verified).
- **Method:** recursive ripgrep over both stores (`gse|gsn|jev|tev|kev`, token census `[A-Z]{1,2}EV`), SQLite sweeps of `conversation_summaries.db` (CLI 100 rows / IDE 51 rows), full artifact walks of both brain dirs, plus targeted window extraction from the Sep-22/23 grunt transcript.

---

# Part 2 — The 29 Candidate Documents

## Tier A: JEV + validation core

### 2.1 `JEV_AND_10K_SIMULATION_OPTIMIZER_INTEGRATION.md`
*Session `90af591f`, 2026-10-04, 5,720 bytes. Status: self-declared "Certified & Active in Production."*

The primary integration doc for the optimizer's validation layer. Architectural mandate (quoted): *"We need to make sure that JEV or similar is part of the optimizer process... every single time, for us, customers... everyone... even if they don't see it. That's the 10k+ simulations we can run very quickly with JEV."* Rationale: traditional optimizers maximize static point-sum and fail in top-heavy GPPs by ignoring joint covariance, pace acceleration, and chalk duplication risk.

**Correlated factor model** — per lineup, per trial s ∈ {1..10000}: team shocks Z_team ~ N(0,1), game/SVI shocks Z_game ~ N(0,1), idiosyncratic player shocks ε_i ~ N(0,1). Positional loadings: QBs λ_team=0.55, λ_game=0.35; WRs 0.50/0.35; TEs 0.42/0.30; RBs 0.28/0.18; DSTs with **negative covariance vs opposing offense** (λ_opp=−0.45, λ_game=−0.30).

**Output metrics (every run):** `sim_mean`, `sim_p50`, `sim_p90`, `sim_p99`, `ceil_ev` = E[S | S ≥ q_0.80], `dup_risk` = clip((exp(mean of ln p_own) − 0.02)/0.23, 0, 1), `tourney_score` = CeilEV − 0.10 × TotalOwn − 6.0 × DupRisk.

**Implementation receipts claimed:** `apps/web` — `lib/fantasy/dfs-correlation.ts` (default sims 10,000; 6/6 tests in 92ms), `lib/fantasy/dfs-optimizer.ts` (added `qbRunbackCount`, LineupMetrics carries runbacks/sim/p90/p99/ceilEV/dupRisk; 33/33 tests in 18.4s), `components/fantasy/dfs-optimizer.tsx` (stack/runback display). Python `onejev/frontier/sports` — `gpp_game_stack_optimizer.py`, `simulate_lineups_correlated` via vectorized NumPy, 10k sims per lineup in <5ms, 7/7 pytest in 0.71s.

**Operational invariants:** zero inactive leakage (Barkley, Lamar excluded), universal execution (10k sims automatic), fast & free (<100ms TS, <5ms Python, no paid APIs), Central Time anchored, glass-box provenance.

### 2.2 `UNIVERSAL_JEV_ARBITRATED_SIGNALS_REPORT.md`
*Session `90af591f`, 2026-10-04, 6,428 bytes. Mid-day + SNF slate.*

The worked example proving the full validation pipeline: 19 candidate signals through (1) the Mathematical 5-Gate Sieve and (2) live JEV arbitration via `jev ask` (`C:/Users/Garrett/onejev/frontier/sports/universal_jev_signal_scanner.py`).

**5-Gate sieve:** (1) lognormal CQR (90% width ≤ max(40.0, 0.25×Line)); (2) Poisson/Negative Binomial counts; (3) stadium microclimate wind/temp decays (−0.18 pts/mph > 14 mph); (4) Stern-normal discrete key-number margin mixture; (5) Bayesian distributionally-robust 95% LCB edge.

**Tier 1 — Sovereign Gold (7, double certified):** Packers −3.5 (model −9.0, 61.5%, JEV 92%); OVER 23.5 1H DAL@HOU (63.0%); Gibbs OVER 56.5 rushing (model 68.0, 71.9%); A.J. Brown OVER 76.5 receiving (model 94.0, 74.0%); Jalon Daniels UNDER 195.5 passing (model 162.0, 72.2%); Aubrey OVER 7.5 kicking (model 9.4, 70.3%); Packers sacks OVER 2.5 (model 3.9, 72.6%).

**Tier 2 — Value Play (4, JEV CAUTION):** Barkley OVER 78.5 rushing (69.0%); Packers −2.5 1H (61.5%); Jalon Daniels OVER 0.5 INT (64.1%); Barkley anytime TD (58.7%).

**Tier 3 — Honest Refusal (6):** Eagles +1.5, Cowboys +2.5, Lions −3.5 (edges below 3.0-pt hurdle); Henry OVER 82.5 (ABSTAIN_HIGH_VARIANCE, CQR width 46.2 > 40.0); Lamb OVER 82.5 (Stingley shadow); Dak OVER 265.5 (model 261.0 < line).

**High-alpha C-Vine SGPs:** Packers Defensive Squeeze (GB −3.5 + U39.5 + Daniels U195.5) joint 38.5%, fair +160 vs naive +288 → **+49.5% correlation alpha**; Eagles Alpha Funnel (Barkley O78.5 + A.J. Brown O76.5 + Barkley TD) joint 42.2% → **+34.9%**; Texas Dome Special (Aubrey O7.5 + 1H O23.5 + Nico Collins O74.5) joint 37.1% → **+30.7%**.

### 2.3 `prompt_draft.md` (session `a07a506d`)
*2026-10-04, 4,962 bytes. Status: Launched (draft pending approval).*

The fail-closed gate mandate. **Trigger:** hand-typed scripts shipped picks with wrong rosters (David Montgomery listed on DET when on HOU; Diontae Johnson not in the NFL; inactives "verified" by a hard-coded empty list). **Audit findings:** pick scripts hard-code projections/rosters inline; `gsis_inactive_gate.py` exists but is never called; `jev ask` failure silently returns `{}` and picks proceed "UNVERIFIED"; count-prop "95% LCB" fabricated as `edge × 0.8`.

**Requirements R1–R5:** R1 — live roster/injury truth at runtime, mismatches block; R2 — no hand-authored inputs, feeds with source+timestamp only; R3 — full signal stack + JEV arbitration mandatory, JEV down = ABSTAIN, real LCB never a fixed multiplier; R4 — single gated entry point with full provenance on every item; R5 — automated checks fail on gate bypass or inline player data.

### 2.4 `SUNDAY_NIGHT_FOOTBALL_SOVEREIGN_BOARD.md`
*2026-10-04 17:34 CT. Game: DET @ CAR, kickoff 7:20 PM CT.*

**Chuba Hubbard harmonization:** GPP lineup = Goff + ASB + Hubbard (bring-back) + Lions DST. Hubbard $5,400 salary relief; Brooks on IR → 84%+ snaps; 23.5-pt tournament ceiling. Prop distinction: rushing 54.5 = PASS/TRAP (−11.6% LCB edge, Detroit #2 rush EPA); **receptions 3.5 = TIER 1 (+14.9% LCB, proj 4.8)**; receiving yards 21.5 = TIER 2 (+23.3%, proj 32.0). Thesis: DFS value from checkdown floor; bet receptions/yards, never rushing.

**Confidence ranking (95% Bayesian LCB):** 1. Hutchinson O0.75 sacks (−135, 74.1%, Kelly 4.8%); 2. Lions −3.5 (72.4%, 3.8%); 3. Hubbard O3.5 receptions (68.7%, 3.8%); 4. ASB O6.5 receptions (64.6%, 3.5%); 5. Lions DST O3.5 sacks (58.9%, 2.1%); 6. Hubbard O21.5 rec yds (89.3%(!), 1.5%); 7. Gibbs O74.5 rushing (69.9%, 0.8%); 8. 4-leg C-Vine SGP (31.2% joint, +28.4% alpha, 1.2%).

**C-Vine structure:** pivot [Lions Lead/Pressure]; Gumbel (1.65), Frank (1.40), Clayton (1.55), Clayton (1.60); naive 29.35% (+241) vs correlated 37.68% (+165) → +28.38% alpha. Matrix repair via Higham nearest-PSD spectral projection (`safe_cholesky`).

### 2.5 `TASK_TRACKER.md`
*2026-10-04 10:48 AM CDT. 6,849 bytes.*

**"ONE SINGLE HEARTBEAT LOCKED IN & CERTIFIED":** port 8000 local engine 200 OK (PID 28492, `OneJev-9B.IQ4_XS`, kills=0); Frontier sports suite 50/50 (7.73s); Nexus benchmark 175/175 (cumulative 225/225); Together AI fine-tune `ft-9fabcf3e-389f` (Qwen3.5-9B, eval loss 0.7974); out-of-sample calibration Brier 0.2177, ECE 6.45%, 100% fail-closed CQR abstention.

**Week 4 board (5 gates):** Packers −3.5 & U39.5 at TB (edge 5.5, 5.0%); Colts −3.5 & U47.5 vs Commanders London (edge 3.0, 5.0%); Jets +3.0 & U42.5 at Bears (edge 9.0 total; Bagent starts, Hall OUT); Cardinals −1.5 at Giants (edge 3.5, reverse line movement, 3.9%); Bills −7.0 vs Patriots (edge 3.5, Highmark wind 16mph, 5.0%). **Honest abstentions (Law 9):** Cowboys/Texans, Rams/Eagles, Titans/Ravens, Lions/Panthers — all PASS, 0.0%. **Only cleared prop: Jonathan Taylor OVER 78.5** (proj 102.4, CQR [89.1, 115.7], edge +28.5%, Kelly $132.00 / 1.32%). Traps refused: Dak O265.5, Henry O82.5 (ABSTAIN), Maye O225.5, Daniels U195.5 (ABSTAIN), Gordon/Johnson PASS.

**Mid-day/SNF SGPs:** Packers Defensive Squeeze 38.5% (+49.5% alpha); Eagles Alpha Funnel 42.2% (+34.9%); Texas Dome FG & Pace 30.9% (+29.8%); Lions SNF Dome Explosion 31.9% (+31.0%).

### 2.6 `SOVEREIGN_ENGINE_COMPLETION_REPORT.md`
*2026-10-04, 9,670 bytes. Red-team audit + production hardening.*

**Verification matrix:** `hermes-jev-skills` suite 40 failures → **997 passed, 7 skipped, 0 failed, 214 subtests** (commit `6a1b7b9`); local LLM untouched (kills=0); R3 key-number margins fully implemented (`NFLDiscreteMarginEngine`, Stern-normal latent mixture); R3 stadium microclimates fully implemented (−0.18 pts/mph); anti-tout hardcoding eliminated (rigid `if matchup ==` ladders → 100% algorithmic); Frontier sports 61/61; Nexus 175/175 in 21.1s (cumulative 236/236).

**Red-team findings:** (1) R3 port missing from `frontier/sports` despite TS implementations — built `nfl_discrete_margin_engine.py` + `stadium_microclimate_engine.py`; (2) unconditioned prior distortion — naive key-number mixture locks 41.6% mass on margins −14…+14 regardless of μ (e.g. at μ=+10.5 gives a heavy favorite 4.4% chance of losing by 7); fixed with density-weighted cover probability Weight(k) = P_empirical(k)/P_Gaussian(k); (3) purged canned pick ladders — `evaluate_game_edges()` used static `if matchup ==` projections; replaced with dynamic conditioning; non-qualifiers fail closed to Law 9.

**Week 4 board** (via `run_week4_forecast.py`): Packers −3.5 & U39.5 (2.8% CLEAR); Colts −3.5 London (edge +3.0); Cardinals −1.5 (1.8%); Bills −7.0 & U48.5 (wind 21.2mph effective, −1.3pts); Jets +3.0 & U42.5 (model total 32.5 vs 42.5 market!). Law 9 abstentions on 4 games. Only cleared prop: JT OVER 78.5. SGPs: Colts Ground & Clock 38.8% (+49.8%); Packers Defensive Squeeze 38.7% (+46.0%); Bills Highmark 31.3% (+33.0%).

## The 500-signal super-engine program

### 2.7 `gse_super_engine_master_conductor_plan.md`
*Session `559f8edf`, 2026-09-18, 12,820 bytes.*

Unites the fleet — **Opus** (Lead Architect/Conductor), **Claude** (Core Ranking), **Mimo** (Stats & Calibration), **Grok** (Learning Loop), **Flash** (Capture Plane). Integrates: Claude's PR #866 (board sorts on monotone `rankingP` n=1,390); Mimo's discoveries (receipts pre-game 0.4802 vs board 0.5234; MLB SPREAD consensus 93.3%; kill lines K1–K5 for 0-book NCAAF ML 87.16% on n=109; 14,251 decided NFL grades 1999–2025; Elo-vs-close 51.24%); the 500-signal architecture (3-Rung Ladder, Hierarchical Bayesian Pooling vs 400-of-500 null dilution, Jackknife+ conformal margin densities).

**Components:** `scripts/ops/board-export.ts` (18-column pick export to `board-export.jsonl`); `packages/prediction-engine/src/hierarchical-pool.ts` (two-tier pooling) + `density-engine.ts` (CRPS + Jackknife+ intervals, α=0.10). **Roadmap:** Phase 1 fleet unification → Phase 2 (days 2–7) 500-signal Rung-1 capture → Phase 3 (days 8–18) Grok walk-forward + FDR → Phase 4 v5.3.0 (replace inverted 50-pt consensus with Divergence + Synthetic Vig Spread; win rate ≥65% on conf ≥80).

### 2.8 `gse_super_engine_autonomous_breakthrough_report.md`
*2026-09-18 22:45 CT, 12,082 bytes. Model frozen at **v5.2.7**.*

**Deliverable A — GEM-1:** restored the `gate_decisions` audit sink (dead 94 days since 2026-06-11): `gate-decision-sink.ts` wired into `process-sport.ts`; decisions PUBLISHED / UNCONFIRMED_FIXTURE / IN_PLAY / INSUFFICIENT_BOOKMAKERS / NO_CONVICTION_EDGE. 4/4 + 77/77 tests; pipeline suite 38 files / 492 tests / 0 failures.

**Deliverable B — live DB truths:** ranking census: `rankingP` drives 1,478/1,478 picks (100%) — inverted-confidence sorting was a legacy v5.0 artifact. CLV 25.0% defect (n=1,586): the 21-day archive hole cut coverage (73%→48%) but did NOT cause the CLV beat rate — it's a model-and-gate problem (50 constant points from `consensusScore`, uncalibrated book depth).

**Deliverable C — 5 new signal extractors (registry → 19 signals):** OL trench (A21; sacks +1.8%/backup tackle); referee crews (A3/A27; −0.28 pts/excess flag); circadian travel fatigue (A4; west teams at 1 PM EST = biological 10 AM, −1.85 1H pts); contract milestones (A15/5B; touch priority 1.15–1.25×); WR1-out redistribution (A19; WR2 +36%, TE +28%, RB +18% of vacated targets).

**500-signal scaling math:** intra-family weighted aggregation; family credibility W_f = baseWeight × √(k_observed/k_total); final p with shrinkage to de-vigged market: p_final = p_market + S_evidence × (p_pooled − p_market). 400 abstentions → shrinks toward market, never hallucinates.

### 2.9 `500_signal_super_engine_plan.md`
*2026-09-18, 18,033 bytes. Master implementation plan.*

**The 10-month methodological correction:** signals were tested against Pinnacle's close for 10 months; fresh signals (turf hardness, sleep debt) were never priced by the market, so testing vs Pinnacle on n=2,600 was noise-vs-best-benchmark. **New law:** signals graduate Rung 2 (predicting actual outcomes) on hundreds of thousands of play/drive labels *before* Rung 3 (market).

**500-signal taxonomy (8 families):** MARKET 0.25, EFFICIENCY 0.25, TRENCHES 0.15, LUCK 0.10, SITUATIONAL 0.10, ENVIRONMENT 0.05, BIO_HUMAN 0.05, NARRATIVE 0.05. Final: trueProb = (1−evidenceFactor) × marketFairProb + evidenceFactor × rawModelProb.

### 2.10 `local_research_to_500_signals_plan.md`
*2026-09-18, 13,029 bytes.*

Compiles 1,500+ scraped sources + 12 research dossiers into 500 signal modules. **Extraction matrix (7 rows):** wind elasticity (−0.9%/mph passing, convex past 20mph) → `signals/environment/wind-elasticity.ts`; coaching tendencies (2nd&10 rush spike +12%, p<10⁻⁵) → `signals/situational/coaching-tendencies.ts`; red-zone TE leverage (77.2% TDs in RZ, TE 32.6% target share) → `signals/efficiency/redzone-te-leverage.ts`; injury timing (Fri DNP on starter: QB +4.5, LT +1.75, WR +1.5, CB +1.25) → `signals/bio/injury-trajectory.ts`; altitude stamina → `signals/environment/altitude-stamina.ts`; depth-chart leverage → `signals/trenches/depth-chart-leverage.ts`; source atlas (1,500+ nodes) → `source-atlas-harvester.ts`.

**Wind math:** `computeWindPassingElasticity` — speed<10mph → 0; penalty = ((speed−10)/10)^1.45 × 0.08; crosswind factor 1+0.5×|sin(angle)|. Trust 0.85, kill line {Brier ≤0.245, n≥100, |z|≤2.8, age≤60min}.

### 2.11 `autonomous_agent_fleet_domination_plan.md`
*2026-09-18, 16,811 bytes. Full autonomy granted.*

Fleet: OPUS (conductor), GROK (learning/backtests), FLASH (capture/ingestion), GEMINI (integrity/sinks), MIMO (stats/conformal). **Zero-book quarantine (K1–K5):** unpriced signals (0-book NCAAF ML 87.16%) stay partitioned, never blended into the published record. **Leakage quarantine:** backfilled rows with non-as-of data quarantined before Grok fits on Neon. **Fantasy surface:** `apps/web/lib/fantasy/props-elasticity.ts` — pass yards ≥15mph → −(baseline×wind×0.009); rush yards ≥20mph → +(baseline×0.12). **Roadmap:** 4 sprints over 48 hours → 500 signals Rung 1, Grok walk-forward, FDR trials, v5.3.0 founder-release spec.

### 2.12 `all_night_autonomous_agent_fleet_master_plan.md`
*Session `3ead1215`, 2026-09-19 02:05, 14,918 bytes. Overnight 02:00–08:00 run.*

**DAVE prior bridge (Grok, walk-forward 2019–2025):** DAVE k=8 CRPS **7.500** vs Elo 7.576 — first structural CRPS win over Elo. **Honest boundary:** DAVE still loses to market close (7.109); strictly a Rung-2 team-strength prior, NOT a spread addend. DAVE equations: w = N_2026/(N_2026+8.0); **Projected Margin = 42.54 × (net_diff + 2.0_HFA) − 1.15**; RMSE 13.322 vs 13.597.

**Turnover luck decomposition:** fumble recovery persistence r≈0 (pure noise); occurrence rates predict future differential at Spearman 0.375 vs 0.219 naive. 2026 extremes — unlucky buy-low: TB/CHI/HOU/BAL/CAR (0% recovered); lucky sell-high: KC/BUF/ATL/JAX/NYJ (100%).

**Withdrawn:** adversarial edge veto — ATS×Over 1.011 joint lift does NOT cover 4.5% vig; needs >96,000 co-observed games for significance. Reclassified as parlay-risk covariance only.

**15 mph wind law:** n=125,945 plays prove wind <15mph has ZERO significant impact on completion rate; wind ≥15mph confined to passing-yard props only; wind spread addend explicitly blocked.

**Batches 7–10** (signals 32–50+): FG EPA, red-zone personnel, ST DVOA, 4-man rush, coach 4th-down rates; turf hardness, circadian drag, cold density, roof config, precip fumbles; backup-QB funneling, primetime drag, two-high shell, slot/perimeter delta, pre-snap motion; turnover regression, RZ FG regression, garbage-time EPA mask, contract escalators.

**MODEL_VERSION v5.2.7 preserved** — nothing bumps without founder review + backtest proof.

### 2.13 `continue_500_signal_super_engine_batch6_plan.md`
*2026-09-19 01:36, 8,207 bytes.*

Resume-from-interruption plan. **The bug fixed:** `wr-man-zone-coverage-asymmetry.ts` assumed 50/50 man/zone split; NFL empirical is **28% man / 72% zone** — the wrong baseline inverted 90th-percentile man matchups. Fix: `LEAGUE_MEDIAN_MAN_RATE = 0.28`. Man-beaters (Jameson Williams: 2.94 YPRR vs man vs 1.46 vs zone) then project +12–15 yard boosts.

**Batch 6 (signals 27–31):** blitz frequency vs QB resilience (A10); secondary explosive-pass vulnerability (A11); WR man/zone asymmetry (A12); box defender density vs stuff rate (A14); playcaller neutral-script pass bias (A19). Commit: 31 signals, 41/41 tests green.

### 2.14 `walkthrough.md`
*2026-09-19 01:58, 5,461 bytes. Executed receipt.*

Batch 6 landed (SHA `5ad3697a4`); GLM5.3 breakthroughs integrated (`ed5ee9cac`); **83/83 tests green** across 8 files; turnover luck validated (Spearman 0.375 vs 0.219, RMSE 5.52 vs 6.04); opponent-adjusted EPA RMSE 13.322 vs 13.597 (clears 0.20 kill line); secret scan 0 secrets; bus broadcasts dispatched; all five agents synced on branch `claude/signal-architecture-rebuild-bq7l8i`.

## Research: math + models

### 2.16 `FRONTIER_QUANTITATIVE_SPORTS_INTELLIGENCE_REPORT.md`
*2026-10-04, 15,089 bytes. "Certified & Verified (225/225 tests)" — matrix sums to 227/227.*

Institutional frontier architecture. **Three 1st-gen failure modes:** independent-legs fallacy (books levy 15–30% correlation tax); static uncalibrated bands (homoscedastic Gaussian assumptions false for yardage props); parameter-uncertainty ruin in Kelly (2–3% edge overestimation → drawdowns).

**C-vine copulas:** Sklar's theorem; Bedford & Cooke vine decomposition; game script as root X₁; exact h-functions for Clayton (lower-tail: joint collapse), Gumbel (upper-tail: shootout synergy), Frank (symmetric), Gaussian (linear base); Fréchet-Hoeffding bounds with fail-close on violation.

**LAN-CQR:** volatility-scaled nonconformity scores; distribution-free finite-sample intervals. **ACI (Gibbs & Candès 2021):** online α adaptation with rolling error-volatility step scaling. **Law 9 gate:** interval width > max(40.0, line×0.25) → ABSTAIN.

**NGS micro-kinematics:** coverage shells (Cover-1: WR1 +12% yds; Cover-2: TE seam +18%; Cover-3: RB checkdowns +15%; Cover-4: RB rush +10%); pocket survival S(t)=exp(−λt), TTP baseline 2.50s; catch-point logistic P(Catch|Δd) with depth penalty; E[YAC] = 3.5 + 1.2(Δd−2.5)^1.3 for Δd≥2.5.

**BDR-Kelly:** log-growth with parameter uncertainty; Beta posterior; 95% LCB edge gate (≤0 → stake $0.00); robust quarter-Kelly f* = min(0.05, max(0, ((b·p_LCB−(1−p_LCB))/b) × 0.25 × κ)); portfolio f* = Σ⁻¹μ with Σf* ≤ 15%.

**Test matrix:** 52/52 sports + 175/175 nexus = 227/227 in 16.67s. (Header says 225/225 — matrix sums to 227; flagged.)

### 2.17 `KAGGLE_QUANTITATIVE_EQUATION_REPOSITORIES.md`
*2026-10-04, 20,529 bytes.*

14 datasets → sovereign equations: BDB 2023 (STRAIN(t) = −ḋ/d^α, Cox hazard); BDB 2021 (D_sep(t), coverage-shell softmax); BDB 2020 (CQR rushing intervals); BDB 2024 (collision momentum, broken-tackle probability); BDB 2025 (pre/post-snap shell Bayes); MGM Grand betting data (**Shin's 1992** π_i formula — "the missing link for the 200-row CLV gate"); Spreadspoke 1966–2026 (Stern-normal margin mixture, −0.18 pts/mph); timestamped odds (CLV); nflfastR 1999–2026 (Brier decomposition; sealed 306-drive Brier 0.1621; +6.77pp 4th-down WP); participation (λ_Targets = Dropbacks × Route% × TPRR); injury/surface biomechanics (fatigue hazard); SGP joint matrix (θ_Clayton = 2τ/(1−τ), θ_Gumbel = 1/(1−τ)); hourly weather (ΔPassAirYards = −0.042 × max(0, Wind−12) × |cos|); injury registry (P(Active|Report) logit; no uncalibrated backfill).

**Blueprint:** `sovereign_data_pipeline.py` — Shin de-vigging (z=0.025), pass-rush strain (α=1.5), Stern-normal key weights [3,7,6,10,14,4].

### 2.18 `alpha_wr_target_ceiling_research.md`
*Session `200128b1`, 2026-10-04, 21,083 bytes.*

The "Alpha WR Target Ceiling Blindspot": in convex-payout GPPs, median models treat a 9.5-target median receiver with an 18.0-target 95th percentile identically to one with a 12.0 ceiling. **WOPR** = 1.5×TargetShare + 0.7×AirYardShare (Tier 1 elite ≥0.65: Lamb, Collins, Jefferson); **FRTS** (Lamb/Collins 36–40% vs 26% avg); **TPRR/EOD**; **HHI** target concentration (≥0.28 = funnel); **TDUD** — duress funnel ratio ψ: ancillary WRs 0.35–0.65, checkdown RBs 1.15–1.35, **elite alphas 1.45–1.85** (pressure mathematically *increases* alpha volume); **CFS** = 100/(1+exp(−3.2(raw−1.35))) with thresholds ≥85 Tier 1 GPP core (3–5× overweight), 70–85 Tier 2, 50–70 Tier 3, <50 fade.

**Case study:** Lamb CFS 90.3 (P75 = 18.0 targets — his actual 18-target eruption was the 75th percentile, not an outlier; P(40+ FPTS) 34.8%) vs Collins 62.5 vs WR3 5.4 (fade). Standard CQR [5.5, 14.5] would have capped Lamb below reality.

### 2.19 `shootout_velocity_index_models.md`
*Session `2db55121`, 2026-10-04, 24,114 bytes.*

GSU = 100×(0.45 z_playoff + 0.25 z_rivalry + 0.30 z_coach); bilateral playoff leverage harmonic mean; rivalry geography; coaching PROE + 4th-down aggression. **DAL@HOU worked: GSU 72.6** (elite top 2%). Clock-budget physics: run-heavy → 116–120 plays; dome shootout → ~148 plays (**+25–35 play premium**). Bivariate Hawkes pace cascade: high-leverage domes ρ(Γ) → 0.85–0.95 (near-critical). Dome multiplier Θ_dome: +0.10 pass EPA. **SVI** = 100/(1+exp(−0.60 × V_latent)), 7 components; **DAL@HOU SVI 99.83**; slate benchmark: DET@MIN 98.7, TEN@JAX 35.7, KC@CAR 20.8, PIT@CLE 3.3 ("Pace Graveyard"). Monte Carlo 3,000 iters: 151.4 combined plays; Dak 47.8 attempts (P90 54.2); Lamb 15.3 targets. Production Python: `shootout_velocity.py`.

### 2.23 `DEEP_RESEARCH_NFL_MATHEMATICS_SYNTHESIS.md`
*Session `189e1a44`, 2026-10-04, 17,169 bytes. 150 arXiv papers (2011–2026), confidence VERY HIGH.*

Three eras: PBP (multinomial EP/WAR); spatial tracking (NGS 10Hz, route ID 88%, STRAIN physics); microstructure & conformal synthesis (opponent-adjusted Bradley-Terry, von Mises kinematics, ghost defenders, cadence entropy — Mahomes σ²=2.45 reduces havoc 20%; **Levitt bookmaker profit-bias identity**: E[π(s)] = (1+φ)Q(s) − φ — books shade toward public narrative, the "Goldilocks Zone" for contrarian +EV). Decision theory: bye rest decayed +2.2→+0.15 (markets misprice rest); HFA compressed to +1.35, international 0.00; coaches maximize low-quantile CVaR on 4th downs. **Week 4 synthesis:** Colts −3.5 & U47.5 London; Packers −3.5 & U39.5; Jets/Bears U42.5; Cardinals −1.5; Bills −7.0 — all with model-vs-market deltas.

## Game boards

### 2.15 `MASTER_EXHAUSTIVE_SLATE_BOARD.md`
*2026-10-04, 17,254 bytes. Week 4 Sunday freeze: 4 games, 58 markets scanned, 36 passed sieve, 28 JEV-certified, **19 double-certified Tier 1 plays**, 14 traps abstained. Compute cost ~$0.00012.*

Game calls: LAR@PHI — all PASS except **1Q total OVER 9.5**; GB@TB — **Packers −3.5**, **UNDER 39.5**, **1Q OVER 7.5**; DAL@HOU — **1H OVER 23.5**; CAR@DET SNF — **1H OVER 24.5**, **1Q OVER 10.5**. 42 props across 7 markets (rushing/receiving/passing/kicking/sacks/INTs/anytime TD) with CQR intervals, LCB edges, JEV verdicts. 4 C-vine SGPs with +28–49% correlation alphas. Standouts: Barkley O78.5, A.J. Brown O76.5, Aubrey O7.5 (λ=9.4, 70.3%), all three team-sack overs.

### 2.22 `MNF_VERIFIED_CARD_20261005.md`
*2026-10-05, 3,292 bytes. Falcons @ Saints, 8.50 units, GSE Engine v5.3.0, JEV Tri-Gate.*

Card: OVER 47.5 (2.0u, SVI 94.6); Olave OVER 7.5 receptions (1.5u, WOPR 0.774, ψ=1.48); Bijan OVER 85.5 rushing (1.5u); Kamara OVER 2.5 receptions (1.0u); Juwan Johnson anytime TD (0.75u, +42.1% edge vs Poisson fair); Saints 1Q +0.5/ML (0.5u). SGPs: SVI Shootout Correlated (+410, 1.0u); Red-Zone Moonshot (+1250, 0.25u). **Fades:** Kyle Pitts OVER — HARD PASS (2 catches on 6 targets all season, 84% inline blocking); Kamara rushing — FADE (negative script, Miller vulture). Branded PNG/SVG social cards produced.

### 2.25 `NFL_WEEK4_SOVEREIGN_FORECAST_REPORT.md`
*2026-10-04, 10,456 bytes. 154/154 checks PASS.*

Six pillars: STRAIN physics (Mariota turnover 4.2× under elevated STRAIN); opponent-adjusted Bradley-Terry trench severity (GB +1.84σ over TB backups → 38.5% hit+sack); von Mises kinematics (JT κ=2.8 → +3.47 EYAR → 95.3 yards vs 78.5 line); cadence entropy (predictable backups accelerate collapse); rest decay + compressed HFA; profit-bias shading. Forecast matrix: 5 edges (Colts −3.5 & U47.5; Packers −3.5 & U39.5; Jets/Bears U42.5; Cardinals −1.5; Bills −7.0) + 4 passes. 8 conformal props (Mariota U185.5, Daniels U195.5, JT O78.5, Gordon U21.5, Henry O82.5, K. Johnson U9.5 longest rush, Dak O265.5, Maye O225.5).

## DFS content operation

### 2.20 `gse_week2_x_packet.md`
*2026-09-20, 4,482 bytes. Week-2 DK dossier + 7-post X thread (all character-counted).*

Flagship "Houston Engine" ($49,400, 159.2 proj): Stroud + Henry + CMC + JSN + Metcalf + Hutchinson ($3,500) + Schultz ($3,200) + Swift + Jaguars DST. GPP pivot "Dallas Shootout" ($50,000 cap-exact, 5-man Dallas correlation). Edges: Metcalf $5,200 (Pittman OUT), Likely $4,500 (27.6% share). Traps: Puka DNP, Caleb weather. 6 visual assets (300 DPI, dark-mode cyber HUD). Asset dir: `C:\Users\Garrett\Downloads\GSE_Week2_DFS_Packet\`.

### 2.21 `sunday_11am_routine_playbook.md`
*2026-09-20, 3,305 bytes. Standing weekly SOP.*

10:15–10:30 data ingestion (inactives, weather, line movement) → 10:30–10:45 optimizer run (`dfs-optimizer.ts`, "Core Four" at 70%+ of top builds, "Sub-$5.5K Key", "Lab Mismatch of the Week") → 10:45–11:00 visual generation (4 standard formats) → 11:00 AM CT sharp publication (7-post thread + article) → 11:30 AM inactives pivots → 12:00 PM lock.

## Prompt drafts

### 2.3 vs 2.26 vs 2.27 — three prompt drafts, three missions

- **2.3** (session `a07a506d`, Oct 4): the fail-closed gate mandate (R1–R5 above). Mission: fix the roster-truth crisis.
- **2.26** (session `90af591f`, Oct 4): adversarial zero-trust verification swarm for the Week-4 board — R1 tracking physics, R2 five-gate sieve, R3 key-number margins, R4 C-vine SGPs, R5 Bayesian Kelly, R6 infrastructure invariants (port 8000 never killed, no `git add -A`, Turner quarantine untouched). Draft, awaiting approval.
- **2.27** (session `76aad555`, Oct 5): MNF Falcons@Saints real-time sentiment scout — sharp/public splits, consensus props, chalk traps (Pitts!), YouTube SGP builds. Final, team deployed. Different animal: scouting the market/public, not verifying our models.

## Code artifacts

### 2.28 `ceiling_funnel_engine.py`
*12,541 bytes. Reference implementation of the WR ceiling engine.*

`ReceiverProfile` (16 fields); `CeilingFunnelScoreCalculator` (WOPR/nWOPR/CFS with the four multiplicative components); `GPPRightTailSimulator` (seed=42, 50,000 sims: Poisson dropbacks → binomial pocket states → beta-binomial targets (κ=25, hot-hand) → binomial receptions → lognormal yards + 6% Pareto tail → binomial TDs → DK scoring); `run_case_studies()` (Lamb 90.3, Collins 62.5, WR3 5.4).

### 2.29 `write_report.py`
*21,123 bytes. Report generator that writes `alpha_wr_target_ceiling_research.md`.*

Embeds the full research report as a string: the blindspot thesis, CQR derivation, five fatal blindspots, WOPR/FRTS/TPRR/HHI/TDUD math, CFS equations and thresholds, two-regime compound model, benchmark table, tail-conditioned CQR proposal. Writes to the session brain dir with UTF-8 BOM.

---

# Part 3 — Full Inventory

Base paths: CLI = `C:\Users\Garrett\.gemini\antigravity-cli\brain\<session>\<file>` · IDE = `C:\Users\Garrett\.gemini\antigravity\<session>\<file>`

## 3.1 CLI brain artifacts — GSE/GSN documents (29 files + metadata)

| Session | File | Bytes | Modified |
|---|---|---|---|
| 189e1a44 | DEEP_RESEARCH_NFL_MATHEMATICS_SYNTHESIS.md | 17,169 | 2026-10-04 08:05 |
| 189e1a44 | NEXUS_FRONTIER_REASONING_SYSTEM.md | 20,421 | 2026-10-04 05:02 |
| 189e1a44 | NFL_WEEK4_SOVEREIGN_FORECAST_REPORT.md | 10,456 | 2026-10-04 07:48 |
| 189e1a44 | THE_SOVEREIGN_MANIFESTO_OF_UNIVERSAL_THEORY_AND_LIFE_SAVING_INNOVATION.md | 21,197 | 2026-10-04 08:19 |
| 189e1a44 | THE_SOVEREIGN_UNIVERSAL_THEORY_OF_CRITICAL_SYSTEMS.md | 16,081 | 2026-10-04 08:13 |
| 189e1a44 | THE_UNIVERSAL_THEORY_OF_CRITICAL_SYSTEMS.md | 16,642 | 2026-10-04 08:11 |
| 200128b1 | alpha_wr_target_ceiling_research.md | 21,083 | 2026-10-04 15:30 |
| 200128b1 | ceiling_funnel_engine.py | 12,541 | 2026-10-04 15:27 |
| 200128b1 | verify_script.py | 58 | 2026-10-04 15:27 |
| 200128b1 | write_report.py | 21,123 | 2026-10-04 15:30 |
| 2db55121 | shootout_velocity_index_models.md | 24,114 | 2026-10-04 15:27 |
| 3ead1215 | all_night_autonomous_agent_fleet_master_plan.md | 14,918 | 2026-09-19 02:05 |
| 3ead1215 | continue_500_signal_super_engine_batch6_plan.md | 8,207 | 2026-09-19 01:36 |
| 3ead1215 | walkthrough.md | 5,461 | 2026-09-19 01:58 |
| 559f8edf | 500_signal_super_engine_plan.md | 18,033 | 2026-09-18 21:50 |
| 559f8edf | autonomous_agent_fleet_domination_plan.md | 16,811 | 2026-09-18 21:58 |
| 559f8edf | gse_super_engine_autonomous_breakthrough_report.md | 12,082 | 2026-09-18 22:47 |
| 559f8edf | gse_super_engine_master_conductor_plan.md | 12,820 | 2026-09-18 21:54 |
| 559f8edf | local_research_to_500_signals_plan.md | 13,029 | 2026-09-18 21:55 |
| 76aad555 | MNF_VERIFIED_CARD_20261005.md | 3,292 | 2026-10-05 19:03 |
| 76aad555 | gse-mnf-power-card-20261005.png | 927,551 | 2026-10-05 19:02 |
| 76aad555 | gse-mnf-power-card-20261005.svg | 16,813 | 2026-10-05 19:02 |
| 76aad555 | gse-x-post-card-20261005.png | 604,392 | 2026-10-05 19:09 |
| 76aad555 | prompt_draft.md | 2,961 | 2026-10-05 18:05 |
| 90af591f | ENGINEERING_DOCTRINE_AND_ROADMAP.md | 5,285 | 2026-10-04 08:37 |
| 90af591f | FRONTIER_QUANTITATIVE_SPORTS_INTELLIGENCE_REPORT.md | 15,089 | 2026-10-04 09:01 |
| 90af591f | JEV_AND_10K_SIMULATION_OPTIMIZER_INTEGRATION.md | 5,720 | 2026-10-04 15:50 |
| 90af591f | KAGGLE_QUANTITATIVE_EQUATION_REPOSITORIES.md | 20,529 | 2026-10-04 15:07 |
| 90af591f | MASTER_EXHAUSTIVE_SLATE_BOARD.md | 17,254 | 2026-10-04 14:57 |
| 90af591f | SOVEREIGN_ENGINE_COMPLETION_REPORT.md | 9,670 | 2026-10-04 14:17 |
| 90af591f | SUNDAY_NIGHT_FOOTBALL_SOVEREIGN_BOARD.md | 5,229 | 2026-10-04 17:34 |
| 90af591f | TASK_TRACKER.md | 6,849 | 2026-10-04 14:22 |
| 90af591f | UNIVERSAL_JEV_ARBITRATED_SIGNALS_REPORT.md | 6,428 | 2026-10-04 14:43 |
| 90af591f | galaxy_sports_edge_hero_nfl_week_4_1791131324253.jpg | 917,410 | 2026-10-04 11:28 |
| 90af591f | galaxy_sports_edge_week4_poster_1791131800799.jpg | 834,638 | 2026-10-04 11:36 |
| 90af591f | prompt_draft.md | 4,432 | 2026-10-04 10:49 |
| a07a506d | prompt_draft.md | 4,962 | 2026-10-04 17:52 |
| df63834e | gse_dfs_cheat_sheet.png | 651,854 | 2026-09-20 10:35 |
| df63834e | gse_lab_mismatches.png | 365,798 | 2026-09-20 10:34 |
| df63834e | gse_salary_vs_ceiling.png | 352,797 | 2026-09-20 10:35 |
| df63834e | gse_week2_banner_1789918407460.jpg | 935,734 | 2026-09-20 10:33 |
| df63834e | gse_week2_x_packet.md | 4,482 | 2026-09-20 10:51 |
| df63834e | sunday_11am_routine_playbook.md | 3,305 | 2026-09-20 10:35 |

(Each also has a `.metadata.json` sidecar. Binaries listed for provenance; `scratch/` and `.system_generated/` hold transcripts and raw run logs.)

**Not in the 29 but present:** three universal-theory manifesto docs (session 189e1a44, ~54KB total — the source of the `keV` physics false positive); `ENGINEERING_DOCTRINE_AND_ROADMAP.md` (90af591f, 5,285 bytes — not deep-read in this pass).

## 3.2 IDE store — no GSE process docs

52 files, all Charcuterie Chick (WebGL scrollytelling, red-team audit, handoff packet), Woodway proposal (5.6MB .eml, 4.1MB PDF), or skill installs. **Zero GSE/GSN process documents** — verified, not assumed.

## 3.3 Store-level files

- `C:\Users\Garrett\.gemini\antigravity-cli\settings.json` (102,699 bytes, 2026-10-09)
- `C:\Users\Garrett\.gemini\antigravity-cli\history.jsonl` (430,971 bytes, 2026-10-09 — 518 prompts)
- `C:\Users\Garrett\.gemini\antigravity-cli\cache\conversation_metadata.json` (72,195 bytes)
- `C:\Users\Garrett\.gemini\antigravity-cli\conversation_summaries.db` (413,696 bytes)
- 100+ `log/cli-*.log` matching `gse` (runtime logs)
- `annotations\bf97e383-0be9-4c2d-b7b1-93c4c39440e2.pbtxt` (2026-09-22)

---

# Part 4 — Conversation Index

53 non-internal CLI conversations (87 additional internal/subagent conversations exist; full transcripts in the 94 DBs under `conversations/`).

**The big ones:**
- `90af591f` "Practical Engineering Improvements and Constraints" (3,645 steps, 2026-10-04) — the largest session; produced the entire Week-4 sovereign engine wave (frontier report, JEV integration, Kaggle repos, slate board, completion report, SNF board, signals report, graphics, zero-trust prompt draft).
- `189e1a44` "Autonomous Machine Pipeline Status" (2,731 steps, 2026-10-04) — the three sovereign artifacts (NEXUS, deep-research synthesis, Week-4 forecast) + universal-theory manifestos.
- `559f8edf` "Most Cost-Effective Google Model" (1,819 steps, 2026-09-19) — all four 500-signal super-engine plans + breakthrough report.
- `12b47ec4` "Autonomous GitHub PR Management" (1,684 steps, 2026-09-23) — autonomous PR management.
- `76aad555` "Monday Night Football Betting Analysis" (550 steps, 2026-10-05) — the MNF verified card + scout prompt; live-fire prompts show Garrett demanding engine/JEV gating ("did you run this through our engine like i asked for you to do each and every t…", "did these all go through JEV? how many gates / equations did they have to pass?"), the Falcons +1.5 / Olave 7+ plays, DK showdown lineup, X graphic, roster double-check, halftime follow-ups.
- `3ead1215` "Resume Previous Work Session" (480 steps, 2026-09-19) — Batch 6 continuation + fleet master plan + walkthrough.
- `aad3dd92` "Agent C Task Queue" (480 steps, 2026-09-20).
- `cecd9fa3` "Sports Edge Grunt Instructions" (398 steps, 2026-09-22) — the Jev decisions-API doctrine session; source of the "Not JEV.md" correction; feature cards (SHADOW-FEED/FEATURE/LESSONS), done-criteria (absent stays null / known input finite / post-freeze row unchanged), `docs/ops/spine/SPINE_LOG.md`.
- `a07a506d` "Continuing Previous Conversation" (346 steps, 2026-10-05) — pre-kickoff scramble ("i have 10 minutes until the game... i need my plays and props"); produced the fail-closed gate prompt draft.
- `df63834e` "NFL DFS Content Packet" (224 steps, 2026-09-20) — Week-2 DFS packet + Sunday playbook + graphics.
- `d786b585` "Second Opinion Company Review" (3,452 steps, 2026-09-29) — Charcuterie Chick (not GSE).
- `495ebe8d` "Sports Signal Promotion Review" (344 steps, 2026-09-19) — signal promotion review, precedes Batch 6.
- `125fc745` "Managing Pull Request Workflow" (136 steps); `3482acde` "Autonomous AI Skills Setup" (78 steps); `ee065a3d` "OpenCode CLI Not Working" (75 steps); `1cec65af`/`5e2e25be` system sessions.
- **The equation-normalization batch** (19 sessions, 2026-10-04 03:08–03:19, 1–2 steps each: `08b00513`, `307b706f`, `640a58c3`, `88dc3e0b`, `b3e79e05`, `f4889d6e`, `5c7435d8`, `371396cb`, `fdfeac33`, `3c00674b`, `724cc38c`, `11e73f2d`, `f2334c0e`, `18275f17`, `fbd28a47`, `86f687ce`, `e6d687dd`, `cb9f7fff`, `db0c9293`) — canonicalization runs feeding the equation pipeline, followed by `89fa0676` "Comprehensive Project Handoff Prompt" (82 steps).
- Jev setup pair: `097741bd` "Jev Environment Setup" + `fff428a0` "Setup Jev And OpenCode Zen" (2026-09-22).
- Stubs/utility: `d946443c`, `fc39665f` (empty); `968d46d0` (clear cookies); `92b5ae9b` (Reply With OK); `6cd785e` (agy staff repo); `25a895df` (string test); `8e97a6aa` (Gemini Pro ADK); `bf97e383` (Gse Convergence Plan Update); `bb950609` (ack instructions); `d2234dac` (permissions explainer); `63e40cd8` (Telegram face-rec bot); `2fc0716b` (Woodway proposal); `79b45f06` (wifi); `15b079f7` (Oct 6: `/jev-frontier-work`, `/hexagonal-architecture` — latest GSE-touched session in the extract).

**IDE conversations (51):** Charcuterie Chick swarm, skills installs, Woodway — no GSE/GSN. Full summaries in `conversation_summaries.db`.

---

# Part 5 — Evidence Excerpts

## 5.1 The 'JEV.md' note (conversation `cecd9fa3`, 2026-09-22)

> …SHADOW-FEED. Replace the empty observation list. Shadow only. FEATURE. One feature. Home: packages/prediction-engine/src/world-state/features/<name>.ts… A feature card is done only when you ran three tests: absent stays null, a known input stays finite, a row dated after freeze does not change the value. Then one line you computed: the field moves a settled outcome, loses to the market, or is thin, with n printed. **A wire the next grade cannot see is not work. A document that is only filed does not count. Silence is a result. A guessed number is a defect.** … **Not JEV.md. Jev is a decisions API, not an agent.**

## 5.2 Selected prompts from `history.jsonl`

- 10-04 19:06 (`a07a506d`): "i have 10 minutes until the game... i need my plays and props"
- 10-04 19:07 (`a07a506d`): "you have flipped so many fucking times..... there are so so so so so so many props between games, quarters, de…"
- 10-05 18:22 (`76aad555`): "now the real question......... did you run this through our engine like i asked for you to do each and every t…"
- 10-05 18:27 (`76aad555`): "did these all go through JEV? how many gates / equations did they have to pass? it should be all that we have.…"
- 10-05 18:43 (`76aad555`): "• PLAY: Atlanta Falcons +1.5 (-108) — Action Score: 78.1 | Jev Choice: 1.00 Play | • PLAY: Chris Olave 7+ Rece…"
- 10-05 19:10 (`76aad555`): "double and triple check the rosters - run through our engine and jev"
- 10-05 20:59 (`76aad555`): "you never told me london! give me halftime plays props and parlays.... my dfs i went with bijan olave london j…"
- 10-05 21:01 (`76aad555`): "take your time!!! run everything through the engine!"
- 10-06 12:56 (`15b079f7`): "/jev-frontier-work"

---

# Part 6 — Reproduction Commands

From `C:\Users\Garrett\.gemini\antigravity-cli` — verbatim:

```
rg -i 'gse|gsn' -l --hidden --no-ignore
```
→ 138 files (mostly logs; docs listed in §3)

```
rg -o '\b[A-Z]{1,2}EV\b' brain/
```
→ JEV 452, AEV 1

```
rg -i '\b(tev|kev)\b'
```
→ 0 documents (only `keV` physics in theory manifesto + task-log noise)

```
sqlite3 conversation_summaries.db "select * from conversation_summaries"
```
→ 100 rows (CLI) / 51 (IDE)

Note: in agy, `GSN` appears only via file paths/logs from the Sports worktrees — no GSN documents authored in agy. GSN/Cards material lives in the Sports repo (`docs/ai/airwave/GSE_GSN_*.md`) and on the agent-bus, outside this store's scope.

---

# Part 7 — What's Behind the Pointers

The bus file contains full text of all 29 documents, but several reference artifacts that live outside it:

- **Branded graphics** (not embedded): MNF power card PNG/SVG + X post card (`76aad555`); Week-4 hero + poster JPGs (`90af591f`); Week-2 banner/cheat-sheet/mismatch-radar/salary-vs-ceiling visuals (`df63834e`, also duplicated under `C:\Users\Garrett\Downloads\GSE_Week2_DFS_Packet\`). Raw images stayed in the stores per the push note.
- **Code referenced but not embedded:** `sovereign_data_pipeline.py` (Shin de-vigging, strain, Stern-normal weights); `gate-decision-sink.ts`; `hierarchical-pool.ts`; `density-engine.ts`; `board-export.ts`; `universal_jev_signal_scanner.py`; `gpp_game_stack_optimizer.py`; `nfl_discrete_margin_engine.py`; `stadium_microclimate_engine.py`; `run_week4_forecast.py`; `shootout_velocity.py`; `matrix_repair.py`; `nexus_ast_guard.py`; the NEXUS `frontier/` tree (13 pillars); `walk-forward.ts` edge-lab.
- **Data stores:** `frontier/data/deep_research_master_corpus.json` (150 arXiv papers); `deep_research_taxonomy.json`; `firecrawl_frontier_dataset.jsonl`; `conversation_summaries.db` (100+51 rows); `history.jsonl` (518 prompts); full transcripts in the 94 CLI conversation DBs; `.system_generated/` raw run logs.
- **Not deep-read here:** `ENGINEERING_DOCTRINE_AND_ROADMAP.md` (5,285 bytes) and the three universal-theory manifesto docs (~54KB) — present in inventory, outside the 29.
- **Live systems referenced:** port 8000 `OneJev-9B.IQ4_XS` (PID 28492, kills=0); Together AI fine-tunes `ft-9fabcf3e-389f` (Qwen3.5-9B, loss 0.7974) and `ft-1fe4ef0b-c215` (Qwen3.8-27B, loss 1.0967); `C:\Users\Garrett\onejev\` tree; `C:\Users\Garrett\hermes-jev-skills` (commit `6a1b7b9`, 997 tests).

---

# Appendix — Caveats

1. All statuses ("Certified & Active in Production," test counts, calibration numbers, CLV figures) are the documents' own claims as written in agy brain artifacts — faithfully reproduced, **not independently verified** against the repos.
2. The Oct-4 audit inside the corpus itself documents that several claimed behaviors were aspirational at write time (e.g. `jev ask` failures silently returning `{}`; pick scripts with hard-coded rosters; the TS ingestion pipeline unused by Python scripts). The fail-closed mandate docs were written to fix exactly those gaps — treat "mandate" docs as directives, "completion report" docs as claims.
3. TEV/KEV: absent from both stores. If Garrett expects them, they live elsewhere or never existed.
4. Three prompt drafts (2.3/2.26/2.27) are included; the bus file's §2.3 full text was summarized from the Tier-A description (its full text sits at lines ~219–295 of the source).
5. This corpus is a snapshot of work done 2026-09-18 through 2026-10-06 on Garrett's Windows machine. Anything built since (Jules sessions, PRs #1141–#1149, the rating-atlas branch) is not in it.

*End of Volume 3 — The Antigravity Corpus.*

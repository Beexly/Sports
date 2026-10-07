# OPTIMIZERS.md — Engine / Optimizer Architecture Census (2026-08)

Status: Research census — NOT a verified benchmark report. Claims marked [UNVERIFIED] where sources are cited by URL but not independently reproduced in this repo. No fabricated performance numbers. All repo-build notes reference actual modules (falsifyBind e-process, extremization-tuner gamma, logOddsPool, games harness 1999–2025, mmc-contribution, recency-weighted lambda).

Path: `C:/Users/Garrett/Sports/handoff/research/optimizers-2026-08/`
Not git-committed per instructions.

---

## 0. REPO BUILD-NOTES KEY (repeated per section)

The repo already holds the infrastructure to test any of these architectures honestly:
- `falsifyBind` (packages/prediction-engine/src/edge-lab/falsify.ts) — e-process kill-test; multiplicity gate + leakage/shuffle/split checks. Any optimizer that claims predictive advantage must survive falsifyBind against the market-close baseline.
- `extremization-tuner` (gamma) — controls sharpening between linear pool (γ→0) and geometric/log pool (γ→1+). Use it to test whether optimizer projections need sharpening or are over-confident.
- `logOddsPool` — geometric-mean aggregation of probabilities; pairs with extremization-tuner.
- `games harness 1999–2025` — the labeled sequence used by falsifyBind; any model architecture must show SURVIVOR on this sequence, not just on synthetic splits.
- `mmc-contribution` / `recency-weighted lambda` — decomposition and decay mechanisms for ensemble/model-averaging layers.

---

## 1. DFS / LINEUP OPTIMIZERS (DraftKings / FanDuel NFL)

### 1.1 SaberSim — simulation-first, correlation-aware optimizer
- Architecture: Play-by-play game simulator (not projection-only) feeds a custom optimizer. Lineups generated from simulated game-state distributions rather than point-projection maximization. Emphasizes correlation (stacking QB + WR from same game, anti-correlation across lineups) and ownership projections.
- Solver type: Not pure ILP — simulator output is sampled and fed into an optimizer layer that applies correlation rules + exposure limits. [UNVERIFIED: exact solver formulation not published by SaberSim; inferred from public docs.]
- Correlation modeling: Explicit — simulator produces joint distributions of player outcomes within a game; optimizer stacks based on simulated co-occurrence rather than manual stacking rules.
- Ownership projections: Projected via proprietary ownership-model; optimizer applies exposure-minus-ownership leverage.
- Ceiling/floor math: Simulator produces full outcome distributions → optimizer targets tournament payout structure (GPP) by selecting lineups with high ceiling relative to ownership cost.
- Data needed: Play-level historical game data, player snap counts, target shares, weather, venue, injury status.
- Claimed performance: "Hands-off sim optimization" winning high-stakes tournaments. [UNVERIFIED] — no peer-reviewed audit available; public testimonials at sabersim.com cited but not independently verified.
- Verified performance: None independently reproduced in this repo. Only synthetic falsifyBind tests (packages/prediction-engine/src/edge-lab/__tests__/) confirm the harness logic, not the optimizer.
- Build-this-in-repo: Wrap SaberSim-style simulator output into `falsifyBind` rows with `modelProb = simulated win probability`, `pMkts = closing spread-derived fair probability`. Run multiplicity gate; if simulated projections fail to beat the closing line, simulator claims are falsified.
- References: https://www.sabersim.com/ (marketing); https://stokastic.com/articles/dfs-strategy/best-dfs-tools (comparison ranking); https://support.sabersim.com/en/articles/12079141-building-lineups (public docs). [All URLs accessed via search; full paper/formula not retrieved.]

### 1.2 Stokastic — simulation + ownership-leverage optimizer
- Architecture: Sim tools + custom optimizer. Emphasizes ownership-leverage-first tournament workflow: read exposure-minus-ownership on every name, rank pool by simulated ROI against specific payout structure.
- Solver type: Custom optimizer (not public ILP spec); uses simulation distributions + leverage scoring.
- Data needed: Projections, ownership estimates, payout tables.
- Claimed performance: Deeper than "partner-projection optimizer" bundles. [UNVERIFIED — marketing claim from stokastic.com comparison page.]
- Verified performance: Not reproduced in repo.
- Build-this-in-repo: Generate simulated ROI rows; pass through `extremization-tuner` (gamma) to test whether leverage-scored predictions are over-sharpened; use `logOddsPool` to aggregate across simulator iterations; validate against `falsifyBind` market-close null.

### 1.3 The Solver (ETR) — partner-projection optimizer
- Architecture: Projection bundle + optimizer; separate simulator products. Synchronizes partner projections into optimizer with bankroll tracker.
- Solver: Not described in public docs; likely ILP/MIP-like with projection inputs and custom rules (stacking, exposure caps).
- Data: Projections CSV upload, slate data.
- Claimed vs verified: [UNVERIFIED marketing claims at thesolver.com/optimizer].
- Build note: Any projection-to-lineup pipeline in repo should enforce `falsifyBind` before claiming edge — projections that don't beat closing lines are noise, not signal.

### 1.4 DFL-Opt / Academic DFS Optimizer (Montclair MS thesis)
- Architecture (verified from PDF): Linear Program Solver (ILP). Inputs: linear program + constraints (salary cap, position limits) + player projections. Sort function produces best "n" lineups. Pre-processing reads players from CSV.
- Solver type: ILP — confirmed from thesis text: "DraftKings Solver is called and takes inputs of Linear Program Solver, number of teams, max exposure percentage, and player data."
- Correlation: Minimal — thesis focuses on projection-based line optimization, not joint-distribution correlation.
- Reference: https://digitalcommons.montclair.edu/cgi/viewcontent.cgi?article=1678&context=etd (DFL-Opt thesis — confirmed via web_extract). [Verified source.]
- Build-this-in-repo: The thesis architecture maps directly to an ILP layer that can be wired to `falsifyBind`: create `BacktestRow` objects from historical lineups' actual scores vs projected scores; test whether the ILP optimizer's chosen lineups consistently beat random / projection-neutral selection on `games harness 1999–2025`.

---

## 2. BET-SLIP / PARLAY / ARBITRAGE ENGINES

### 2.1 Parlay calculators with correlation adjustments
- Core idea: Standard parlay calculators multiply individual implied probabilities (independent assumption), which overstates true probability when events are positively correlated (same-game parlay, SGP). Correlation-adjusted calculators apply a correlation coefficient ρ between outcomes, reducing implied probability relative to naive product.
- Architecture: Joint probability model P(A ∧ B) = P(A)P(B) + ρ√(P(A)(1-P(A))P(B)(1-P(B))). Most consumer calculators ignore ρ (ρ=0); sharp calculators estimate ρ from historical co-occurrence.
- Data needed: Historical co-occurrence matrix per event pair; implied probabilities from odds.
- Claimed performance: "More accurate odds" — true but trivial; the value is the ρ estimation, which is rarely published.
- Verified: Not independently reproduced in repo; correlation-adjustment math is standard multivariate probability theory.
- Build note: Implement ρ estimator from `games harness` co-occurrence counts; wire into `falsifyBind` by comparing correlated parlay fair-price estimates vs closing market. Use `extremization-tuner` to see if sharpening ρ-estimated probabilities produces false precision.
- References: Standard probability theory (no single canonical paper); parlay correlation adjustments discussed widely in betting analytics blogs (no single peer-reviewed source retrieved).

### 2.2 Same-Game Parlay (SGP) engines
- Architecture: Books build SGPs from proprietary correlation matrices; sharp bettors reverse-engineer. Engine needs joint outcome model per game (player props + team total + spread are all correlated through the same underlying score distribution).
- Key insight: SGP fair price requires a full score-distribution model (Poisson / negative-binomial for totals + conditional prop distributions). Books often under-price positive-correlation legs to attract action.
- Verified vs claimed: [UNVERIFIED — most SGP pricing claims come from betting blogs; no independent public audit confirms consistent SGP mispricing.]
- Build note: Use `games harness 1999–2025` to estimate joint distributions; construct SGP fair prices; test with `falsifyBind` against actual SGP payouts. Any engine claiming +EV SGPs must show SURVIVOR verdict; otherwise it's unverified marketing.

### 2.3 Arbitrage scanners (OddsJam / CrazyNinjaOdds style)
- Architecture: Poll odds from multiple sportsbooks via API; compute implied probabilities (with overround); detect pairs/triples where 1/Σ(1/odds) > 1 (positive arbitrage). More advanced: detect "soft" arbs (transient pricing discrepancies) and middle-arb opportunities (betting both sides of a spread/total at prices that overlap).
- Solver type: Greedy pair/triple search — not deep optimization; speed (low latency) matters more than depth.
- Data: Live odds feeds from sportsbooks; historical price-change rates; transaction-cost estimates (line movement cost, withdrawal fees).
- Claimed performance: "Guaranteed profit" for pure arbs (true by definition, ignoring transaction costs and cancellation risk); "consistent +ROI" for soft-arb / middle strategies — [UNVERIFIED].
- Verified: Pure-arb math is tautological; profitability claims depend on execution speed, account-limits, cancellation policies — not reproducible in this repo without live feeds.
- Build note: Implement arb scanner over `games harness` historical closing lines (simulate multi-book feed); wire to `falsifyBind` by testing whether historical arb opportunities actually produced positive returns after transaction-cost modeling. Any engine claiming >0% ROI must survive multiplicity gate.
- References: OddsJam (https://oddsjam.com), CrazyNinjaOdds (https://crazy-ninja-odds.com) — marketing sources only; no peer-reviewed audit retrieved.

### 2.4 Middle-finders
- Architecture: Find middle-arb windows where betting Team A -3.5 and Team B +4.5 yields win-both conditions (A wins by 4 = win both; A wins by 3 = push/partial). Requires overlapping spread ranges.
- Data: Spread and total ranges across books; outcome distribution model (to compute middle-win probability vs cost of push/loss).
- Claimed: Small positive EV when middle-win probability exceeds cost of partial loss. [UNVERIFIED quantitative claim.]
- Build note: Use `games harness` score distribution to compute true middle-win probability; test against `falsifyBind` null (market-efficient close). If middle probability doesn't exceed break-even by a falsifiable margin, the middle strategy is starved.

---

## 3. PUBLISHED MODEL ARCHITECTURES (FOOTBALL PREDICTORS)

### 3.1 Gradient boosting on nflfastR tabular features (XGBoost / LightGBM)
- Core finding: Gradient boosting on tabular features (rating diffs, venue, rest, weather proxies) reliably beats raw Elo by 2–4 pts accuracy (UNVERIFIED exact %; literature reports 1–3% improvement).
- Key reference: Chen, T., Guestrin, C. (2016). "XGBoost: A scalable tree boosting system." KDD. arXiv:1603.02754 [URL cited by Wikipedia; full paper not retrieved here — [UNVERIFIED exact page numbers].]
- Negative result: Deep networks (CNN/LSTM) on same tabular sports features often fail to beat tuned gradient boosting — marginal improvement (~66.3% vs ~65.9%), often not significant. Source: Gao, J. et al. (2025) — cited but not fully retrieved; claim [UNVERIFIED exact numbers].
- Recipe: Features = rating diffs + recency weights + venue + rest; target = binary win/draw; train XGBClassifier(logloss); evaluate Brier + log-loss.
- Build-this-in-repo: Train XGBClassifier on `games harness 1999–2025` feature set; calibrate with `extremization-tuner`; evaluate Brier score improvement vs uncalibrated; pass calibrated predictions through `falsifyBind` multiplicity gate. If calibrated model is KILLED, the feature-engineering layer adds no verifiable edge.

### 3.2 Calibration layers (Platt / isotonic)
- Finding: Platt (sigmoid) and isotonic (monotonic non-parametric) improve Brier on many tabular datasets, but 2025–2026 literature (arXiv:2601.19944v1) reports they can degrade strong modern boosting models. Not free — must be validated.
- Build note: Add calibration layer to `extremization-tuner` path; validate Brier improvement on `games harness` holdout; skip if negative. Wire `logOddsPool` and `extremization-tuner` together so sharpening only activates when Brier improves.

### 3.3 Bayesian hierarchical team models (Stan / PyMC)
- Core idea: Team strengths as hierarchical random effects; match outcomes modeled with team-level parameters (attack, defense, home-field coefficient) and game-level noise. Posterior estimates via MCMC (Stan, PyMC) or variational inference.
- Key references: No single canonical Stan sports paper retrieved; common patterns from Gelman & Hill (2006) hierarchical regression literature applied to sports (UNVERIFIED specific citations for sports applications).
- Recipe: Model y_ig ~ Binom(p_ig, n) with logit(p_ig) = α_team[i] + β_team[j] + γ_home + ε_ig; priors N(0, σ_team) with σ_team ~ Half-Cauchy(1).
- Data needed: Season-level game logs with team IDs, scores, venue, season, possibly player-level features.
- Claimed vs verified: Hierarchical Bayes produces well-calibrated uncertainty estimates (verified in general statistics); specific sports prediction accuracy claims [UNVERIFIED — no peer-reviewed sports-benchmark comparison retrieved].
- Build note: Fit hierarchical Stan model to `games harness 1999–2025`; compare posterior predictive distributions to `falsifyBind` closing-line null; if hierarchical model's predictive intervals don't cover outcomes at expected rate, the model fails the falsifiable coverage gate.

### 3.4 Neural approaches (CNN/LSTM / Transformer on sequence features)
- Finding: Deep nets on small tabular sports datasets often match or underperform gradient boosting. Deep sequence models (LSTM on play-level sequences) require >50k labeled games with rich sequence features to show benefit.
- Key negative evidence: Gao et al. (2025) cited but not fully read — claim [UNVERIFIED exact % numbers].
- Build note: Do NOT build deep layer unless dataset exceeds 50k labeled games. If built, wire through `falsifyBind` — any model that claims predictive edge but is KILLED by multiplicity gate should be discarded regardless of architecture.

### 3.5 Monte Carlo season simulations (DVOA-style playoff-odds engines)
- Architecture: Each team assigned a strength parameter (often from rating system or play-level efficiency). Simulate full remaining schedule thousands of times (Monte Carlo); aggregate to playoff-qualification probabilities and division standings.
- Key reference: DVOA (Defense-adjusted Value Over Average) — Football Outsiders. Play-level efficiency metric, then Monte Carlo season simulation. [Reference URL: https://www.footballoutsiders.com/dvoa/ — marketing/reference only; exact algorithm not open-source. UNVERIFIED exact simulation parameters.]
- Recipe: Strength estimates from previous-season/play-level data; schedule simulation using current standings + future matchups; run 10k+ iterations; aggregate.
- Data: Play-level data (down, distance, field position, score differential); current standings; remaining schedule.
- Claimed vs verified: DVOA claims predictive value for playoff odds; [UNVERIFIED independent replication — no peer-reviewed benchmark retrieved; Football Outsiders publishes historical accuracy but no open-source replication package.]
- Build note: Implement season simulator on `games harness 1999–2025` past seasons; compare simulated playoff probabilities to actual outcomes; pass through `falsifyBind` by comparing simulated season predictions to closing-game probabilities (for single games) and to actual season results. Any engine that claims playoff-prediction accuracy must survive multiplicity test over multiple seasons.

---

## 4. BANKROLL / PORTFOLIO OPTIMIZERS

### 4.1 Kelly criterion (single bet / independent sequence)
- Core idea: Bet fraction f* = (bp - q)/b where b = net-odds received (decimal - 1), p = estimated win probability, q = 1-p, b = payout multiple. Maximizes expected log-wealth growth rate.
- Key reference: Kelly, J. L. (1956). "A new interpretation of information rate." Bell System Technical Journal 35, 917–926. [DOI/URL confirmed via web search; exact page numbers [UNVERIFIED from snippet only].]
- Data needed: Estimated win probability p (must come from calibrated model, not projection); payout odds b.
- Claimed performance: Long-run wealth maximization — mathematical theorem (verified). Real-world: over-betting due to p-estimation error causes volatility; fractional Kelly (f = c·f*, c<1) recommended.
- Verified: Theorem is verified; empirical profitability depends on p-estimation accuracy, not the Kelly formula itself.
- Build note: Implement Kelly fraction calculator that pulls `modelProb` from calibrated model output; wire `falsifyBind` to test whether the calibrated `modelProb` estimates are calibrated (i.e., binary outcomes cover expected frequency). If `falsifyBind` kills the probability estimates, Kelly outputs are garbage regardless of formula correctness.

### 4.2 Kelly for correlated simultaneous bets
- Problem: Standard Kelly assumes independent bets; simultaneous bets (e.g., multiple game outcomes on same slate, same-game parlay legs, portfolio of props) share correlation. Applying independent Kelly to correlated portfolio over-bets.
- Approach: Use covariance matrix Σ of bet returns; solve max_f μ^T f - ½ f^T Σ f subject to constraints (fractional sizing, max single-bet cap). Equivalent to maximizing expected log-wealth under multivariate return distribution.
- Data: Covariance matrix of bet outcomes (estimated from historical co-occurrence or model simulation); expected-return vector μ.
- Verified vs claimed: The covariance-adjusted formulation is standard portfolio theory (Markowitz applied to betting). [Verified math; UNVERIFIED practical profitability claims for any specific betting portfolio — depends on Σ and μ accuracy.]
- Build note: Implement portfolio optimizer using `games harness` co-occurrence matrix for Σ and calibrated `falsifyBind` outputs for μ; validate that portfolio allocation survives falsifyBind by testing that portfolio-level predictions (aggregated via `logOddsPool`) beat the market-close null. If the aggregated predictions fail multiplicity gate, the portfolio is over-confident regardless of Kelly formula.

### 4.3 Risk-of-ruin frameworks (Gambler's Ruin / sequential testing)
- Core idea: Given finite bankroll B, win probability p, payout b, compute probability of reaching bankroll 0 before target G. Standard gambler's ruin formula: P(ruin) = (1 - (q/p)^B) / (1 - (q/p)^G) for p ≠ q.
- Extension to estimation error: If p is estimated (not known), ruin probability increases with variance of p-estimator. Common defensive rule: never bet fraction > f_min(p_hat - σ_p) — i.e., subtract estimation-error buffer.
- Verified: Gambler's ruin theorem verified; practical risk-of-ruin frameworks with estimated p [UNVERIFIED quantitative recommendations — no single authoritative source retrieved for sports-specific ruin thresholds].
- Build note: Implement ruin simulation that pulls calibrated p estimates from `falsifyBind` (with their multiplicity-test verdicts); compute adjusted ruin probability that accounts for falsifier KILLED verdicts (if a model is killed, its p estimates must be discounted to the null-model baseline). Any bankroll optimizer that ignores falsifier verdicts overstates edge.

### 4.4 Fractional sizing under estimation error
- Approach: Replace point-estimate p with lower confidence-bound p_lower (e.g., from `falsifyBind` e-process lower bound or from Bayesian posterior lower quantile). Use p_lower in Kelly formula → more conservative sizing.
- Key insight: Estimation error is asymmetric — underestimating risk is catastrophic for ruin; overestimating risk only costs growth rate. Defensive sizing favors lower-bound estimates.
- Verified vs claimed: Defensive sizing principle verified by decision theory; exact optimal fraction under arbitrary estimation error [UNVERIFIED — depends on error distribution, which is model-specific].
- Build note: Wire `falsifyBind` multiplicity verdict into sizing layer: if model is SURVIVOR, use calibrated p; if STARVED (n < minN), fall back to market-implied p; if KILLED, do not allocate any fraction. This creates an honest sizing framework that respects falsifier output rather than ignoring it.

---

## 5. SYNTHESIS — WHAT TO BUILD FIRST (ORDERED)

1. **Falsifiable prediction pipeline** (`falsifyBind` + calibrated model + `extremization-tuner`): Every optimizer claim must survive this gate. Build it first; nothing else matters without it.
2. **Game-harness feature set** (`games harness 1999–2025` + feature engineering layer): Tabular gradient-boosting baseline (Section 3.1). Verify with `falsifyBind`; only proceed to deeper architectures if SURVIVOR.
3. **Calibration + pooling layer** (`extremization-tuner` gamma + `logOddsPool` + `mmc-contribution` + `recency-weighted lambda`): Aggregate multiple baseline predictions honestly; validate sharpening improves Brier.
4. **DFS optimizer** (ILP / MIP + simulation layer): Only after prediction pipeline is SURVIVOR. Wire to `falsifyBind` by comparing optimizer-selected lineups to random selection on historical slate results.
5. **Bet-slip / arbitrage engine**: Only after prediction pipeline is SURVIVOR. Any engine claiming +EV must survive falsifier on historical closing lines.
6. **Bankroll optimizer** (Kelly + ruin + estimation-error discount): Only after falsifier verdicts are wired in. Size defensively — never ignore a KILLED model.
7. **Deep / complex architectures** (hierarchical Bayes, deep nets, season simulators): Only if dataset > 50k labeled games AND simpler architectures fail to beat market close. Otherwise negative results (Section 5 of THEORY-LAYER.md) dominate.

---

## 6. REFERENCES & URL INVENTORY

| ID | Source | Type | Verified? |
|---|---|---|---|
| S1 | https://www.sabersim.com/ | Marketing / docs | Source accessed; claims UNVERIFIED |
| S2 | https://stokastic.com/articles/dfs-strategy/best-dfs-tools | Comparison ranking | Source accessed; claims UNVERIFIED |
| S3 | https://thesolver.com/optimizer | Optimizer docs | Source accessed; claims UNVERIFIED |
| S4 | https://digitalcommons.montclair.edu/cgi/viewcontent.cgi?article=1678&context=etd | MS thesis (DFL-Opt) | Source retrieved; ILP architecture VERIFIED |
| P1 | Chen & Guestrin (2016) / arXiv:1603.02754 | XGBoost paper | Citation confirmed; exact page numbers UNVERIFIED |
| P2 | Gao et al. (2025) — cited in THEORY-LAYER.md | Deep-learning negative result | Citation mentioned but full paper NOT retrieved; numerical claims UNVERIFIED |
| P3 | arXiv:2601.19944v1 (calibration-degradation claim) | 2025–2026 calibration literature | Citation mentioned; full paper NOT retrieved; claims UNVERIFIED |
| P4 | Kelly (1956) Bell System Technical Journal 35 | Kelly criterion | Citation confirmed; exact page UNVERIFIED |
| P5 | Football Outsiders DVOA (https://www.footballoutsiders.com/dvoa/) | Playoff-odds engine reference | Source URL confirmed; algorithm UNVERIFIED (not open-source) |
| R1 | packages/prediction-engine/src/edge-lab/falsify.ts | Repo falsifyBind | VERIFIED — real module |
| R2 | packages/prediction-engine/src/edge-lab/ (tests + harness) | Repo falsifier tests | VERIFIED — real tests |
| R3 | handoff/research/prediction-engines-2026-08/THEORY-LAYER.md | Repo theory mapping | VERIFIED — real file |

---

*Written: 2026-08-26. Path: C:/Users/Garrett/Sports/handoff/research/optimizers-2026-08/OPTIMIZERS.md. Not git-committed per instructions. All [UNVERIFIED] tags preserved; no performance numbers fabricated; repo-build notes map to verified modules (`falsifyBind`, `extremization-tuner`, `logOddsPool`, `games harness 1999–2025`, `mmc-contribution`, `recency-weighted lambda`).*

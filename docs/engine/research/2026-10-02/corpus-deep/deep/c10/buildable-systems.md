# Buildable Systems — c10 full slice (r01–r60)

36 build specs: SYS-01…SYS-18 from Half A (r01–r30), SYS-19…SYS-36 from Half B (r31–r60).
Every number/equation verified against the cited source (see `verified-claims.md`).
Gates marked [LEDGER] were authored by the deep-read author as build contracts, not reported
as paper results. REJECT-verdict methods are excluded by rule (1631 stays rejected in both halves).
INFERENCE is marked explicitly. Source paths relative to `~/workspace/vendor/Sports/docs/`.

---

## Half A systems (r01–r30)

Concrete build specs: inputs, outputs, exact equations/gates from the source files, numeric acceptance gates, and provenance. Every number/equation verified against the cited source (see `verified-claims-partA.md`). Gates marked [LEDGER] were authored by the deep-read author as build contracts, not reported as paper results. REJECT-verdict methods are excluded by rule.

---

## SYS-01 — PlusDC-BT team rating module
Provenance: `arxiv-program/research/2026-09-21/arxiv-deep/0213-recent-advances-in-the-bradleyterry-model.md:19,65,72,75` (survey; equations are reference, gate is [LEDGER]).

- **Inputs:** nflverse 2015–2024 regular-season game outcomes; per-game covariates x_ij: home indicator, rest differential, travel/altitude, QB-out indicator.
- **Model:** P(home team i beats j) = σ(u_i − u_j + x_ijᵀv), σ(x) = (1+e^{−x})^{−1}; u = 32 team utilities with Σu_i = 0 (variance-minimizing constraint); ridge-regularized MLE (guarantees existence when strong connectivity fails early-season); initialize with Newman FPI, refine with L-BFGS.
- **Extension (INFERENCE, ledger-proposed):** player-aware utilities u_i = τ_team + q_QB(i) so QB changes move the rating without refitting; test on weeks following a starting-QB change.
- **Outputs:** per-team utility u_i, covariate effects v, per-game win probability.
- **Acceptance gate [LEDGER]:** on 2022–2024 rolling refit (predict each game from data through week t−1), PlusDC-BT beats plain BT **and** Elo (nfelo-style) on mean moneyline log-loss by **≥ 0.003**, with fitted covariate signs correct (home edge > 0, rest differential ≥ 0). Early-season fallback: RankCentrality adopted for weeks 1–4 only if it beats plain BT on log-loss over weeks 1–4. If PlusDC-BT does not beat Elo, reject the module.
- **Feeds:** SYS-02 (margin distribution), SYS-05 (sizing), reasoning-layer five-track checklist (scheme matchup input).

## SYS-02 — G-Elo margin-of-victory rating
Provenance: `arxiv-program/research/2026-09-21/arxiv-deep/1448-margin-of-victory-differential-skill-ratings.md` (Eqs. 43–46; Table 3).

- **Inputs:** historical game margins by season blocks; category frequencies f_h.
- **Model (closed-form frequency estimators):** η = (1/2)·log10(f_J/f_0) (Eq. 44); α_h = (1/2)·log10(f_h·f_{J−h}) − log10 ξ (Eq. 45); δ from category frequencies (Eqs. 43–46). Strict season-blocked train/test; coefficients and K̃ from training seasons only.
- **Outputs:** margin-category probabilities per matchup → spread/total win probabilities.
- **Reference performance (paper, NFL):** G-Elo J=6 — LS 0.6224, RPS 0.2166, accuracy 0.6656 vs Elo-Davidson — LS 0.6304, RPS 0.2200, accuracy 0.6375.
- **Acceptance gate [LEDGER]:** ΔLS ≥ 0.005 vs baseline **and** accuracy ≥ baseline + 1pp on 2019–2023 holdout; re-score under the ignorance rule (SYS note: r21/1083 hierarchy ignorance > Brier > RPS) before adopting; decompose the accuracy gain into draw-modeling vs skill-estimation components (the paper's +2.8pp is largely draw-modeling scope).
- **Feeds:** SYS-05.

## SYS-03 — EnbPI early-season conformal intervals
Provenance: `arxiv-program/research/2026-09-21/arxiv-deep/1641-conformal-prediction-for-time-series-enbpi.md` (arXiv:2010.09107; code https://github.com/hamrel-cxu/EnbPI).

- **Inputs:** point forecasts f̂^b from B = 25 bootstrap ensemble (GSE's model-parliament.ts is half-built already); weekly refit cadence.
- **Model:** LOO ensemble predictor f̂_{-i}^{φ} = φ({f̂^b : i ∉ S_b}), φ = mean; residuals ε̂_i = Y_i − f̂_{-i}^{φ}(X_i); interval C_t = [f̂(X_t) + q̂_β(ε̂-window), f̂(X_t) + q̂_{1−α+β}(ε̂-window)], β ∈ [0,α] chosen to minimize width; sliding residual window, batch size s = 1, **no calibration split** — all data trains AND calibrates.
- **Outputs:** prediction intervals for margin/total at level 1−α.
- **Reference performance (paper):** 10% train ratio — EnbPI coverage **0.893** (SE 1.8e-3) vs ICP 0.646, AdaptCI 0.828, J+aB 0.747, QOOB 0.684.
- **Acceptance gate [LEDGER]:** full-season coverage within ±2pp of nominal AND mean width ≤ split-conformal baseline; **weeks-1–4 coverage beats ICP by ≥3pp**; fallback to SPCI [1642] if B=25 refits exceed compute budget. Proposed improvement (INFERENCE): regime-weighted sliding window — weight residuals by recency AND regime similarity (same-QB, same-weather-bucket games upweighted).
- **Feeds:** SYS-06 (abstention), SYS-05 (stake scaling on width).

## SYS-04 — Angular forecast combination
Provenance: `arxiv-program/research/2026-09-21/arxiv-deep/1550-angular-combining-forecasts-probability-distributions.md` (arXiv:2305.16735v2).

- **Inputs:** component predictive distributions (per-model margin/total CDFs).
- **Model:** angular combining with angle θ; optimized θ beat the linear opinion pool by up to **+2.7% MQS**; fallback **θ = 67.5°** (+1.4% MQS) with no tuning history.
- **Outputs:** combined predictive distribution.
- **Acceptance gate [LEDGER]:** beat linear opinion pool on MQS on holdout; fallback to fixed θ=67.5° if no history.
- **Pre-step (SYS-16):** run the expert-network topology audit before trusting the combination.

## SYS-05 — Kelly staking with stop-loss and redundancy screen
Provenance: `.../1203-kelly-growth-optimal-with-stop-loss.md`, `.../1213-rebalancing-frequency-considerations-for-kelly-optimal.md`, `.../1360-application-of-the-kelly-criterion-to.md`, `.../0835-sizing-the-bets-focused-portfolio.md`.

- **Inputs:** calibrated edge per pick (from SYS-01/SYS-02 probabilities vs market-implied); bankroll K; stop level; existing portfolio legs.
- **Model:** base Kelly fraction from edge (1360/0835) → **redundancy screen (1213):** new leg enters only if E[(1+X_i)/(1+X_j)] ≤ 1 vs every existing leg → **stop-loss scaling (1203):** stake = αK·u(z,θ), u(z,θ) ∈ [0,1], z = stop-level/current bankroll, θ = (days-to-reset, …); long-horizon limit **u(z,θ) → 1 − z**.
- **Outputs:** stake fraction per pick; stop-hit events.
- **Acceptance gate [LEDGER]:** ≥95% of free-Kelly log growth with stop-hit frequency cut ≥50% on backtest.
- **Hard exclusion:** r29/1631-style drawdown minimization (no edge input) is REJECTED and must not enter this pipeline.

## SYS-06 — Calibration → abstention stack
Provenance: `.../0738-spline-based-probability-calibration.md`, `.../0694-controlled-abstention-neural-networks-regression-problems.md`, `.../1009-online-prediction-abstention-fast-rates.md`, `.../0987-conformal-reject-option.md`, `.../0716-knowing-when-defer-selective-prediction-knowledge.md` (negative result).

- **Inputs:** raw model probabilities; EnbPI/split-conformal intervals (SYS-03); MC-dropout variance.
- **Model:** 0738 spline-calibrate probabilities → abstention rule on interval width / MC-dropout variance (0694/1009/0987 machinery). **Never** on difficulty or consensus heuristics: 0716's variance decomposition shows difficulty 0.4–1.5%, ability+difficulty 0.8–1.8%, IRT ambiguity 1.1–3.7%, residual unexplained **76.8–90.2%** — proxies capture <4% of the epistemic signal.
- **Outputs:** publish / abstain / reduced-stake decision per pick with calibrated probability.
- **Acceptance gate [LEDGER]:** abstained-set error rate ≥1.4× kept-set error rate (0716 reports 1.45–1.60× realized); no pick publishes without a calibrated interval.

## SYS-07 — afCRPS training recipe + EECRPS evaluation
Provenance: `.../0748-aifs-crps-ensemble-forecasting-loss.md:17` (Eq. 3–4), `.../1582-ens10-dataset-postprocessing-ensemble-weather-forecasts.md`.

- **Inputs:** ensemble forecasts {x_j}, j=1..M (M=8–16); observations y.
- **Loss (train on this, not MSE):** CRPS({x_j},y) = (1/M)Σ_j|x_j−y| − (1/2M²)Σ_{j,k}|x_j−x_k|; **afCRPS_α = α·fCRPS + (1−α)·CRPS, α = 0.95**; positive-terms rearrangement afCRPS_α = (1/2M(M−1))Σ_jΣ_{k≠j}(|x_j−y|+|x_k−y|−(1−ε)|x_j−x_k|), ε=(1−α)/M — non-negative per term by triangle inequality (fp16-stability fix); the (1−α) admixture removes pure-fCRPS degeneracy (M−1 members matching the observation leaves one member unconstrained).
- **Evaluation:** **EECRPS(F,y) = |EFI| × CRPS(F,y)**, EFI ∈ [−1,1] (|EFI| 0.5–0.8 unusual, >0.8 very unusual) — extreme-weather games dominate model selection.
- **Reference:** afCRPS training beat the 9km IFS ensemble by **5–20%** on most variables; ENS-10 transformer T2m CRPS **0.626** vs raw 0.733 (~15%).
- **Acceptance gate [LEDGER]:** ≥2% holdout CRPS gain, no ensemble collapse; EECRPS ranking matches CRPS ranking. **Build spec:** re-run the MLP→LeNet→transformer ladder on **wind speed + precipitation** for 30 stadium neighborhoods on GEFS reforecasts (the paper baselined only Z500/T850/T2m — not the two variables GSE needs); respect reforecast era boundaries (model-cycle changes forbid cross-era pooling).
- **Applies to:** kickoff-weather ensemble correction; any GSE distribution model (train on CRPS-family, never MSE).

## SYS-08 — Executable arb / market-sharpness monitor
Provenance: `.../1618-executable-arbitrage-and-market-efficiency-in-prediction-markets.md` (Eqs. 1–5), `.../1608-arbitrage-analysis-in-polymarket-nba-markets.md`, `.../0283-shrouded-sin-taxes.md`, `.../0016-betting-against-integrity-inplay-market-dynamics.md`.

- **Inputs:** Level-1/2 order-book snapshots (Polymarket/Kalshi NFL markets); sportsbook odds screens for vig.
- **Model:** executable edges — Δ^settle_Y(t) = 1 − Σᵢa_t(Yᵢ); Δ^settle_N(t) = (|Q|−1) − Σᵢa_t(Nᵢ); Δ^{N→Y}_S(t) = (|S|−1) + Σ_{j∈Q\S}b_t(Y_j) − Σ_{k∈S}a_t(N_k) — **depth-aware, fee-adjusted**, replacing naive mid-price-sum checks. Single-market scan: Ask_A + Ask_B < 1.00 (long arb), Bid_A + Bid_B > 1.00 (short arb); combinatorial ML-vs-spread. Vig: overround-implied margin Σ(1/decimal_odds) − 1 per € wagered; shrouding-heterogeneity prior (90% vs 16% pass-through is descriptive, not causal).
- **Outputs:** nightly market-sharpness digest: violation episodes, durations, depth-walked executable profit, direction asymmetry (1618: 2,098 YES-side vs 36 NO-side episodes — unsupported legs close slowly).
- **Reference:** 1608 — 7 valid in-game episodes / 37 raw (81.1% post-game artifacts), 0.0001% of time in arb, median 3.614s, capped $210.19 vs uncapped $4,418.44; 1618 — ~$1.118M mechanism-linked (97% converter), profit/conversion decay **$1.00 → $0.20 → $0.08**.
- **Acceptance gate [LEDGER]:** reproduce sub-10-episodes-per-3000-markets efficiency on NFL data with zero post-game false positives. **Role:** measurement infrastructure + competition intelligence for the CLV machinery — NOT a strategy source (settlement baskets totaled $32k; capital lock-up not worth it).

## SYS-09 — rGAX residualization + contamination audit
Provenance: `.../1143-rethinking-player-evaluation-gax-beyond.md`, `.../0424-biases-in-expected-goals-models-confound.md:36,39`.

- **Inputs:** player performance metric (EPA/play, target share, YPRR…), baseline expectation model, training pool.
- **Model:** residualize the metric on the model (rGAX recipe): rMetric = metric − E[metric|model]; ship with CIs/p-values. Contamination audit (0424): test sensitivity to training-pool contamination (Messi 127.6 → 120.8 under +25%-finisher contamination; Mahrez 14.61 → 9.03 excluding deflections).
- **Outputs:** residualized metric with multiplicity-corrected CIs (Bonferroni-Holm/BH/BY for decision use — the paper's figures are uncorrected).
- **Honesty notes (verified):** corr ≈ 1 with raw metric everywhere (0.998 soccer, 0.997 NFL rCPAE, 0.999 GK, 0.984/0.964 NBA) — value is uncertainty, not re-ranking; single-season noise dominates (SD 3.73 around mean 3.70 for a +25% finisher at 150 shots) — decontamination is second-order vs sample size.
- **Acceptance gate [LEDGER]:** robustness slope on restricted-data metric ≥ 0.9 with SE ≤ 0.01 (paper: rGAX 0.936 (0.005) vs GAX 0.757 (0.005)); demonstrate one decision that changes under corrected CIs.

## SYS-10 — Relativized feature engineering rule
Provenance: `.../0049-relative-advantage-quantifying-performance-in-noisy.md:43`.

- **Inputs:** any absolute-valued feature pair (team strength, efficiency…).
- **Rule:** always test the relative (difference/ratio) form against the **two-feature absolute** form — never against the straw-man single absolute. Honest delta in paper: **+5.2% AUC** (relative vs two-feature absolute), not +21.3%; head-to-head wins only 51% accuracy / 61% AUC trials (statistical tie, theory-predicted).
- **Acceptance gate [LEDGER]:** ≥0.01 AUC gain vs the relativized twin on holdout.

## SYS-11 — Beat-reporter text → event alignment layer
Provenance: `.../1595-semantic-understanding-of-professional-soccer-commentaries.md` (Eqs. 1–2; Table 1–2).

- **Inputs:** beat-reporter tweets in ±10-min buckets; nflverse play-by-play.
- **Model:** contrastive bi-encoder (InfoNCE on temporal-bucket weak supervision) replacing per-pair exemplar SVMs (Conf(M_ij,p_kl) = Θ_ij·Φ_kl); graph-attention popularity re-ranker replacing PairRank (ρ(p_ij) = (1−d)·Conf + d·Σρ/edge, d=0.5); greedy macro-event merge (argmax_{|E_i|≤k} ρ(S_i,E_i), k=4 — a *drive* is the NFL macro-event); explicit no-event/strategy-talk head.
- **Outputs:** per-drive sentiment/availability narrative features for the pick engine (TRUST-SIGNAL).
- **Reference:** paper F1 41.4 (AUC 46.8, P 33.9, R 54.0) vs 27.6 SOTA; ablations −16pp (no PairModel) / −13pp (no PairRank).
- **Acceptance gate [LEDGER]:** alignment F1 ≥ 0.55 on a 200-tweet human-labeled NFL sample AND per-drive features improve 2024 spread-model log-loss by ≥ 0.005; REJECT if F1 < 0.45.

## SYS-12 — VTCS receiver timing bias (prop feature)
Provenance: `.../1572-movement-initiation-timing-temporal-counterfactuals.md`.

- **Inputs:** NGS tracking; WR route-break initiations; GSE catch-probability value surface.
- **Model:** ξ-shift counterfactuals scored against the value surface → receiver-level timing bias ξ* (chronically early/late breakers); team-relative ranking (Mann–Whitney p=0, Cliff's δ=−0.339).
- **Outputs:** receiver ξ*-bias as reception/YPRR/prop-model feature (QB-BEHAVIOR).
- **Acceptance gate [LEDGER]:** adapted V_frame separates NFL targets from non-targets (**KS D ≥ 0.25, p < 0.01**); receiver mean V_timing adds **+1.5% out-of-sample R² on YPRR**. If the value surface fails the KS gate, stop. Honesty guardrail: frozen-teammate limitation acknowledged — defender-proximity covariates required.

## SYS-13 — TASC time-aware synthetic control (causal/placebo gate)
Provenance: `.../0323-timeaware-synthetic-control.md`.

- **Inputs:** treated-unit time series + donor pool (N), pre-intervention window T0.
- **Model:** EM/Kalman state-space synthetic control exploiting temporal order (permutation stress test: post-intervention RMSE mean +48.5%, std +25.7% when time indices permuted — confirms it uses temporal order). Donor size sweet spot near N = T0 = 50; N=200 degrades everything.
- **Outputs:** counterfactual trajectory; placebo-test RMSE distribution.
- **Reference:** Prop 99 placebo — TASC lowest median RMSE, smallest variance; IPL best at n=72: median RMSE 7.88; NBA best at n=192.
- **Acceptance gate [LEDGER]:** placebo RMSE beats classical synthetic control by **≥10% relative**. Limitations: univariate, linear time-invariant trend, EM initialization-sensitive.

## SYS-14 — Dynamic probit inference bake-off (EP vs PFM-VB vs MCMC)
Provenance: `.../1664-expectation-propagation-dynamic-probit.md` (arXiv:2309.01641).

- **Inputs:** drive-level binary outcomes (y_t ∈ {0,1}, P(y_t=1) = Φ(x_t′θ_t), θ_t random walk).
- **Model:** EP approximates the SUN smoothing distribution by Gaussian q(θ)=N(m,V); per-t site updates via cavity/tilted/moment-match; Kalman-smoother passes per EP sweep. Reference runtime: EP 0.43s vs PFM-VB 0.27s vs exact SUN 36.28s (~100× speedup over exact).
- **Outputs:** standardized inference backend for dynamic binary-outcome models (natural NFL extension: multinomial drive outcomes TD/FG/punt/turnover).
- **Acceptance gate [LEDGER]:** EP converges in ≥95% of 32 team-season fits AND matches/beats PFM-VB on posterior-mean MAE and holdout log-loss — else REJECT in favor of the bake-off winner. EP has no convergence guarantee (damping needed in hard cases).

## SYS-15 — Copula-HMM live game-state regimes
Provenance: `.../1654-copula-hmm-football-momentum.md`.

- **Inputs:** drive/play-level observables (EPA/play, success rate); covariates: score diff, time, home/away, opponent strength.
- **Model:** hidden states S_t ∈ {1..K}, K=3; state-dependent joint via Clayton copula × COM–Poisson marginals; transitions P(S_t=j|S_{t−1}=i,x_t) = exp(γ_ij′x_t)/Σ_k exp(γ_ik′x_t); numerical ML with 50 random starts; AIC/BIC selection. Reference: ΔAIC=48/ΔBIC=35 over independence; K=3 BIC 20,979 vs 21,020/21,030/21,098.
- **Outputs:** Viterbi state posteriors as live win-prob/spread features (SCHEME).
- **Acceptance gate [LEDGER]:** holdout predictive log-likelihood ≥ **0.02 nats/obs** over the independence baseline; control for scheme/tempo changes (decoded states confound coaching shifts with momentum).

## SYS-16 — Ensemble information-graph audit
Provenance: `.../1677-expert-interaction-networks-pooling.md:10,13` (theory; Prop. 2's "only if" direction is proof-under-review — lean on Cor. 1).

- **Inputs:** each component model's top information sources and their weights.
- **Model:** Attention Centrality αᵢ(A) = Σ_{j∈Nᵢ(A)} 1/dⱼ − 1; network-bias variance Var[𝓑|A] = (σ²/n)(n⁻¹Σᵢαᵢ² + 2ρn⁻¹Σ_{i<j}αᵢαⱼ); star topology is worst (Var → σ²(1−ρ)/4); d-regular/balanced is efficient; under common correlation+variance, Bayesian pooling collapses to simple average (Lemma 1 — pooling-rule choice adds nothing).
- **Outputs:** star-topology concentration diagnostic = fraction of total weight attributable to the single most-shared input (e.g., the Vegas consensus line, one flagship NGS metric).
- **Action:** diversify inputs or down-weight the hub where concentration is high, before trusting ensemble consensus. Averaging more models that read the same hub *concentrates* variance while looking like consensus.
- **Acceptance gate [LEDGER]:** no single shared input accounts for more than a pre-registered concentration threshold of ensemble weight; re-audit whenever a component model is added.

## SYS-17 — Injury competing-events estimand taxonomy
Provenance: `.../1690-recurrent-competing-events-causal.md` (Eqs. 1, 3, 4, 47–49; R packages transform.hazards, ahw).

- **Inputs:** weekly player workload exposure; recurrent soft-tissue injury counts; season-ending IR events (competing event).
- **Model:** discrete-time IPW total-effect estimator E[Y^{a=1}_k] vs E[Y^{a=0}_k] with IR as competing event (naive censor-at-IR estimates an ill-defined controlled direct effect, not the total effect coaches care about). Separable-effects lens for turf-vs-grass decomposition.
- **Outputs:** total effect of high-workload exposure on recurrent injury counts; **estimand-taxonomy reporting standard** for all injury-causal claims (no GSE doc currently distinguishes these estimands).
- **Acceptance gate [LEDGER]:** adopt the taxonomy if the NFL replication shows naive censor-at-IR and IPW total effect differ by **≥20%** with identified positivity; reject the full machinery if <10%.

## SYS-18 — In-play market integrity dynamics monitor
Provenance: `.../0016-betting-against-integrity-inplay-market-dynamics.md`.

- **Inputs:** in-play LOB/stake time series.
- **Model:** latent state-space dynamics (ΔAIC = 160,747 vs hurdle without state process); covariate effects: opponent red card β=1.075 [1.004,1.146], own red −0.414, score diff 0.420, halftime 0.210 (~23.7% elevated stakes), surprising goal ω=0.285 [0.257,0.313].
- **Outputs:** regime features for live-market monitoring; stake-flow anomaly flags.
- **Acceptance gate [LEDGER]:** replicate the state-process AIC dominance on NFL in-play data; pre-register the covariate set.

## Cross-system wiring order (wire-first sequencing)

1. SYS-06 (calibration/abstention) — nothing publishes without it.
2. SYS-01 + SYS-02 (ratings) → SYS-04 (combine, after SYS-16 audit) → SYS-03 (intervals).
3. SYS-05 (sizing) consumes calibrated probabilities + intervals.
4. SYS-08 (market monitor) runs as nightly infrastructure from day one.
5. SYS-07 (weather/CRPS), SYS-09 (residualization), SYS-10 (relativization), SYS-11 (text), SYS-12 (VTCS) are feature lanes feeding the ratings.
6. SYS-13/14/15/17/18 are gated research lanes — each has its own numeric gate before touching production.
---

## Half B systems (r31–r60)

Concrete build specs. Each has: inputs, outputs, exact equations/gates from the files,
numeric acceptance gates, and provenance. INFERENCE is marked. REJECT-verdict methods
stay rejected (none in this half; 1631 noted as excluded).

---

## SYS-19 α-governor drawdown overlay (1749)

- **Inputs:** weekly bankroll B_t, running maximum M_t, unconstrained Kelly stake f*_t.
- **Outputs:** scaled stake π_t · f*_t.
- **Equation:** π = 1 − α/d_t, d_t = B_t/M_t, α = 0.7. (Ledger's discrete-time
  reconstruction of the paper's continuous-time Azéma–Yor rule; the paper proves
  existence/uniqueness/turnpike only.)
- **Acceptance gate:** on 2023–2025 NFL walk-forward backtest — min B_t/M_t ≥ α − 0.02
  AND terminal log growth ≥ 80% of unconstrained. (ledger 1749:50)
- **Provenance:** `arxiv-deep/1749-numeraire-property-drawdown-constrained-growth-optimal.md:44,47,50`.
  Composes with SESSION_2 κ=0.25 (S1).
- **INFERENCE:** GSE has no drawdown layer today (ledger's map read) — this is the first
  one, and it's ~20 lines.

## SYS-20 Two-layer CVaR stake sizer (2143)

- **Inputs:** market model F (game-outcome distribution), posterior over engine's edge
  estimate p (beta-binomial on rolling 8-week Brier history).
- **Outputs:** stake sized under CVaR_ε(inner) ⊗ CVaR_δ(outer) composite risk.
- **Equations:** inner CVaR_ε over outcomes given F; outer CVaR_δ over the p-posterior.
  Use **CVaR-Expectation (33)** — convex, LP-solvable via SAA with sample complexity
  M ≥ C₁(H,F)/γ²·[C₂(H,F)n + C₃(H,F)log(1/ε)]. **Do NOT use VaR-Expectation** — non-convex,
  no global guarantee.
- **Acceptance gate:** on the 300-day-trading analog (paper: CVaR-Exp 1.65s solve at
  N=100K/n=4): NFL backtest must show no-worse log growth than κ=0.25 Kelly with
  strictly lower realized drawdown. New capability: penalizes edge-estimation
  uncertainty, which Kelly ignores.
- **Provenance:** `arxiv-deep/2143-composite-risk-measure-framework.md:16-17,25-26,41-43`.
- **Caveat:** paper's experiment assumes Gaussian returns and convex-in-x H(x,ξ) — verify
  both on the NFL stake problem before quoting the paper's 0.096%/day numbers.

## SYS-21 Production calibration chain (BAYES_NONPARAMETRIC + PLATT_HIERARCHICAL)

- **Inputs:** raw model probabilities + group key (sport|market).
- **Outputs:** calibrated probabilities with fixed group intercepts.
- **Chain (exact):** Raw → Temperature → Platt (MAP IRLS) → Isotonic PAVA/CIR →
  hierarchical EB-τ. Per-market u_g; τ via EB moment or Laplace marginal, **clamped
  [0.05, 2]**; A_g = A + a_g — **intercept-only unless holdout proves a slope hierarchy**.
  DP/HDP/CRF/PYP/stick-breaking → notebooks/offline EDA only. Mixtures rejected
  (label switching, versioning, MCMC cost).
- **Acceptance gates:** adaptive-bin ECE ≤ 0.02 on Cohort-E-style walk-forward
  (baseline 0.0126); reliability ≤ 0.0324; resolution ≥ 0.0361. (LAUNCH_CALIBRATION_COHORT:36)
- **Provenance:** `.../BAYES_NONPARAMETRIC_OFFLINE_ONLY.md:3-4,107,126,132`;
  `ops/PLATT_HIERARCHICAL_FULL_POSTURE.md:51,58,62,67,72,81,83,95,98,103`. Two
  independent docs specify the same chain — implement exactly once.

## SYS-22 Evidence-guard publish gate (RESCUE)

- **Inputs:** any artifact proposed for live picks.
- **Outputs:** SHIP / HOLD / BLOCKED decision.
- **Gate:** 15-test evidence guard, 15/15 required (RESCUE:6,10). Every artifact rebinds
  evidence by hash at publish (RESCUE:23,46). **BLOCKED artifacts' numbers never touch a
  live pick** — precedent: A8 (Boltzmann 0.2558 vs isotonic 0.2148, Δ=0.041).
- **Acceptance gate:** the guard itself is the gate; regression-test it by submitting a
  known-BLOCKED artifact and confirming HOLD.
- **Provenance:** `predictions/research/2026-09-22/RESCUE.md:6,10,23,46`.

## SYS-23 INT prop pricing rule (kicker-defense-props)

- **Inputs:** QB season INT rate, projected pass attempts, opposing completion rate allowed.
- **Outputs:** expected INTs for the game.
- **Equation:** E[INT] = INT_rate × pass_attempts × completion_rate.
  Worked examples from the file: Allen 3.66% × 27.0 × 52.3% = **0.5**;
  Goff 1.44% × 34.2 × 52.3% = **0.3**.
- **Hard veto (same file):** individual-player sack props have **negative predictive
  value** — pressure→sack R² < 0.005. Never price them from pressure rate.
- **Acceptance gate:** backtest E[INT] vs actual INTs, 2024 season, Poisson deviance vs
  the market's implied line; adopt iff deviance improves ≥5%.
- **Provenance:** `props/research/2026-09-25/kicker-defense-props-methodology.md:85,95,112-113,130-134`.

## SYS-24 Luck-layer margin pricer (edge-sheet)

- **Inputs:** home/away net EPA/play (garbage-time, kneel/spike, WP<0.05 excluded; OT
  retained), nflfastR cp/ep-family expected turnovers.
- **Outputs:** fair margin + luck decomposition.
- **Equations:** fair_margin = (home_netEPA − away_netEPA) × 63 + 2.0.
  Expected-turnover band: publish only outside **|actual − expected| < 1.5** (neutral).
  Priors: fumble recovery → flat 50% (YoY correlation ~0.00); **~4.5 points per turnover**.
- **Acceptance gate:** shadow-model backtest 2024 — margin MAE vs closing line; adopt as
  a shadow component iff it explains residual variance the EPA model misses (partial-R²
  gate, pre-registered).
- **Provenance:** `predictions/research/2026-09-17/edge-sheet/README.md:13,41,48,50,57,101,103`.
  Corroborated by dossier-v2 (r41) — two independent sources on 4.5 pts/turnover and
  ~0.00 recovery correlation.

## SYS-25 NNTD selective-classification abstention gate (1778)

- **Inputs:** 25–50 training checkpoints, late-weight k=0.05.
- **Outputs:** per-pick disagreement score → abstain/publish decision.
- **Rule:** withhold picks whose checkpoint-disagreement exceeds the threshold calibrated
  to target error. Reference operating points (CIFAR-10, from the paper): coverage
  91.2 / 86.4 / 75.9 at fixed error 2% / 1% / 0.5%; at 90% coverage, error 1.83.
- **Composition (INFERENCE):** intersect with market disagreement — NNTD alone is blind
  to confidently-wrong subpopulations (ledger's own limitation); the market is the
  external second opinion.
- **Acceptance gate:** on 2024 held-out picks, abstention must cut realized Brier on the
  published set by ≥0.005 with ≤20% coverage loss. Re-tune k on NFL data (k=0.05 was
  tuned on the paper's benchmarks).
- **Provenance:** `arxiv-deep/1778-selective-classification-via-neural-network-training.md:28-31,40`.

## SYS-26 Bradley–Terry upgrade candidates (2601.14727)

- **Inputs:** game results with weights, home/away indicators, team covariates.
- **Outputs:** team strength ratings γᵢ.
- **Equations (all <20 lines each):**
  1. Newman (2023) FPI: γᵢ = [Σⱼ wᵢⱼγⱼ/(γᵢ+γⱼ)] / [Σⱼ wⱼᵢ/(γᵢ+γⱼ)] — fewest full-data
     passes in all four benchmark settings.
  2. EM-MAP: γᵢ = (a−1+Σwᵢⱼ)/(b+Σnᵢⱼ/(γᵢ+γⱼ)) — Zermelo is the a=1,b=0 special case;
     fixes Ford-condition divergence (undefeated team → ûᵢ→∞).
  3. PlusDC: P(i≻j) = σ(uᵢ−uⱼ+(xᵢⱼ−xⱼᵢ)ᵀv) — home advantage as a special case.
- **Landmines:** sync Newman FPI may diverge on near-bipartite graphs (use async);
  vanilla MLE unusable early-season without regularization.
- **Acceptance gate:** ≥2% walk-forward Brier improvement over the current team-strength
  prior, 2022–2024. (brief's gate)
- **Provenance:** `dfs/research/2026-09-25/arxiv-deep/2601.14727-bradley-terry-advances.md:55,63,65,71,92`.

## SYS-27 xT-style error-law publication gate (1814)

- **Inputs:** grid resolution K, sample size n for any estimated field-value/EPV surface.
- **Outputs:** publish / don't-publish decision for the surface.
- **Law:** error ≈ LogNormal(−2.0916 + 1.01·log K − 1.0267·log n, 0.1782), R²=0.864
  (SEs 0.017/0.002/0.003). Maximal acceptable error 0.0192; require
  **P(error < 0.0192) ≥ 0.90**. Reference: K=192 (16×12) at n=2.4M clears 0.90;
  24×18 needs n≈3,348,000.
- **Design implication:** ŝ-error (scoring-probability head) dominates T̂-error — spend
  modeling budget on the scoring head.
- **Acceptance gate:** apply to GSE's EPV/field-value surface; coarsen the grid or grow n
  until P≥0.90, then publish.
- **Provenance:** `arxiv-deep/1814-expected-threat-model-quality.md:24-26,48-52,62,77`.
- **Caveat:** ground-truth models are themselves estimates; ℓ∞ is conservative.

## SYS-28 Feature store with (event_ts, creation_ts) semantics (2022)

- **Inputs:** source feeds with event time and creation (as-of) time.
- **Outputs:** point-in-time-correct feature values; online overrides.
- **Rules (exact):** offline keyed (event_timestamp + creation_timestamp), insert iff key
  absent; online override iff new event_ts > existing, or equal event_ts and new
  creation_ts > existing. Leakage rule: nearest-past-value with **per-source delay**
  (NGS re-runs 48h, odds 0). Backfill runner: no-leakage by construction.
- **Acceptance gate:** synthetic leak-injection test — insert a future-dated row, prove
  no as-of query can read it. (The paper provides no such validation; this test is the
  rehabilitation from C13.)
- **Provenance:** `arxiv-deep/2022-managed-geo-distributed-feature-store.md:28-31,47,58-61`.
  Composes with EV fail-closed rules (S3).

## SYS-29 tsflex time-series feature extraction (2188)

- **Inputs:** irregular game/week-indexed series (bye-week gaps).
- **Outputs:** windowed features on the time index.
- **Spec:** sequential tsflex 4.3±0.1s vs TSFEL 16.4±0.8s; memory 1.3±0.1MB vs 3.5±0.3;
  paper claims ~3× faster, ~2.5× less memory. Index-based windows (the bye-week case).
- **Hardening (ledger's own):** wrap every function with `make_robust`; re-verify API
  (paper is v0.2.3, 2021).
- **Acceptance gate:** re-run the paper's benchmark on the current tsflex version;
  feature-parity check (same windows → same values ±1e-9) before replacing any
  hand-rolled windowing.
- **Provenance:** `arxiv-deep/2188-tsflex-flexible-time-series-processing-feature-extraction.md:28,32-34,40,43`.

## SYS-30 Drift-detection ensemble (1885)

- **Inputs:** streaming feature/prediction series.
- **Outputs:** drift alarm + implicated detector set.
- **Spec:** majority vote — abrupt: ADWIN + HDDM-A + KSWIN; gradual: HDDM-A + HDDM-W +
  Page-Hinkley. Imputation always helped (kNN k=4 lowest RMSE). Windows 2000/1000
  instances (scale to NFL weekly grain — INFERENCE: map to season-scale windows).
- **Acceptance gate:** inject label-flip drift into 2024 weekly features; ensemble must
  fire within 2 weeks at ≤1 false alarm/season.
- **Provenance:** `arxiv-deep/1885-detecting-concept-drift-in-the-presence.md:5,8,14,28`.

## SYS-31 QB Phase-2 archetype: rusty-backup rule (keenum + qb-pipeline)

- **Inputs:** QB layoff duration, target distribution on return.
- **Outputs:** archetype flag + individual-player blanket candidate for the 8-dim vector.
- **Rule:** layoff-return = ≥10 targeted attempts after ≥8-week gap. Blanket =
  individual player with the most separation-friendly role (slot / receiving RB / WR1),
  **not** a positional checkdown lean (return games skew slightly *more* WR-heavy, *less*
  RB-heavy than career baseline).
- **Acceptance gate:** backtest on 2024–2025 backup-QB returns before entering the vector
  (n=323 targets/10 games is suggestive, not predictive — keenum:167).
- **Provenance:** `fantasy/research/2026-09-24/keenum-target-splits.md:23,97,99-159`;
  `.../reasoning-layer/drafts/qb-pipeline-spec.md:5,17,25`.

## SYS-32 CLV measurement repair (clv-hunt + forensics + cohort)

- **Inputs:** `gse.odds` (8,083,183 rows, 2.0 GB, 2025-04-24→2026-10-01).
- **Outputs:** repaired close lines → CLV beat-rate.
- **Steps (in order):** (1) settle games on the odds archive — no re-probe
  (clv-hunt:52); (2) merge MAX_CLOSE_AGE_MS (M-F7) — the unmerged staleness fix
  (clv-forensics:45-51); (3) backfill CLOSE-phase stamps for NFL/MLB
  (RESULTS:17-25); (4) grade per the canonical pipeline — per-book American→implied,
  mean per side, proportional two-way de-vig, latest row fetchedAt ≤ generatedAt,
  ≥MIN_BOOKMAKERS books quoting both sides (LAUNCH_CALIBRATION_COHORT:102-107).
- **Acceptance gate:** no CLV number is quoted until steps 1–3 land. Current 0.2273
  beat-rate (328/611/504 of 1,443, clearsBreakEven=false) is graded under the broken
  regime — reference only.
- **Provenance:** `predictions/research/2026-10-01/clv-hunt.md:45-48,52`;
  `.../2026-08-19-clv-forensics-verdict.md:45-51,74,81`;
  `ops/hermes/hf7-archive/RESULTS.md:17,20,24-25`.

## SYS-33 DK salary-import template (dk-salary-week2)

- **Inputs:** DK contest metadata.
- **Outputs:** player salary table (619 players from 1,135 draftables, 13 teams, 12 games
  in the verified run).
- **Spec:** verify against DK's own metadata — draftGroupId 154078; salary file is the
  single source of truth (DK CSV columns not present in `/scores`). 16.8s first fetch,
  1.4s warm.
- **Acceptance gate:** weekly re-verification — draftGroupId + draftable count vs DK
  metadata before each slate build.
- **Provenance:** `.../dk-salary-week2-import.md:5,7,9-12`.
- **Policy flag:** the verified run used a TLS-impersonated client — **Garrett's
  forbidden-endpoint ruling required before generalizing** (C8).

## SYS-34 cv-scoreboard-ocr clean-room build (deep-dive-haw)

- **Inputs:** broadcast frames.
- **Outputs:** scoreboard state (clock, score, down/distance) for the tracking pipeline.
- **Spec:** `cv-scoreboard-ocr.ts` exists as a **clean-room spec written 2026-09-30,
  never implemented** — the CV pipeline has no OCR. Camera-motion compensation already
  exists (`camera-motion.ts`) but `buildTracklets` in `track-player.ts` doesn't call it.
- **Acceptance gate:** implement per spec; OCR accuracy ≥98% on a labeled 500-frame
  sample; wire camera-motion compensation into `buildTracklets` in the same change.
- **Provenance:** `.../deep-dive-haw-2026-10-01.md:36,44`. Build-or-drop decision item.

## SYS-35 Trend-discovery layer (data-analytics-strategy)

- **Inputs:** free structured data (nflverse team-weeks etc.).
- **Outputs:** ranked candidate trends with effect size + significance.
- **Spec:** cohort mean vs field + Welch test, ranked by effect size. Reference run:
  QB age 34+ → RB target share +10–12%, 4,936 team-weeks (2016–2024), concentrated in the
  37+ cohort. Productized as `packages/prediction-engine/src/trend-discovery.ts`
  (pure, tested).
- **Acceptance gate:** any discovered trend must clear the same bar before entering the
  engine — effect size on ≥2,000 team-weeks + Welch p<0.01 + out-of-sample holdout
  confirmation.
- **Provenance:** `.../data-analytics-strategy.md:28,40-41,55-65`.

## SYS-36 EnbPI-style conformal prediction intervals (from map §2a + 2601 context)

- **Inputs:** sequential game predictions with residuals.
- **Outputs:** prediction intervals with finite-sample coverage.
- **Note:** the cqr.ts finding (architecture-handoff:110-113) is the anti-spec — n=5,
  α=0.1 claiming 90% while delivering 83.33% via the finite-sample clamp. Any conformal
  build must use the exact finite-sample quantile (⌈(n+1)(1−α)⌉/n), never the clamped
  asymptotic rank.
- **Acceptance gate:** empirical coverage on 2024 held-out within ±2pp of nominal at
  α=0.1 and α=0.2.
- **Provenance:** `ops/handoff/2026-09-18-architecture-handoff.md:110-113` (anti-spec);
  EnbPI reference from the slice map.

---

## Half-B build sequencing (INFERENCE — recommended order, not from the files)

1. **Integrity first:** B14 (CLV repair) + B10 (feature store) + S3 leak-wall fixes —
   nothing built on contaminated data survives.
2. **Calibration second:** B3 (calibration chain) + B4 (evidence guard) — the honesty
   substrate every later number rests on.
3. **Pricing third:** B6 (luck-layer margin) + B5 (INT props) + B8 (BT candidates) —
   the components with the cleanest acceptance gates.
4. **Staking fourth:** B1 (α-governor) + B2 (two-layer CVaR) — only meaningful once
   probabilities are calibrated and CLV is measurable.
5. **Intelligence fifth:** B13 (QB archetype) + B17 (trend discovery) + B7 (abstention) —
   the reasoning-layer consumers.
6. **Research-grade (gated, not scheduled):** Decision Diffuser (1947, TVD≤5% + ECE≤0.03
   gate), CFCQL (1930, ≥1pp ROI gate), MAML vs NGGP race (S5 gates), StruSR (2170,
   reimplementation only after the neural win-prob model exists and is good).
---

## Unified wire-first sequencing (coordinator merge, 2026-10-02)

Combines Half A's cross-system wiring order with Half B's sequencing. Research →
wire → weight → calibrate → test → polish; nothing publishes without the calibration gate.

1. **Integrity first:** SYS-32 (CLV repair) + SYS-28 (feature store) + leak-wall fixes —
   nothing built on contaminated data survives. (Half A SYS-08 market monitor runs as
   nightly infrastructure from day one.)
2. **Calibration second:** SYS-06 (calibration/abstention, Half A) + SYS-21 (production
   calibration chain: Temp→Platt→Isotonic→EB-τ) + SYS-22 (15-test evidence guard) —
   the honesty substrate every later number rests on. Adaptive-bin ECE ≤ 0.02 (baseline
   0.0126); no pick publishes without a calibrated interval.
3. **Pricing third:** SYS-01 + SYS-02 + SYS-26 (ratings: PlusDC-BT, G-Elo, BT candidates)
   → SYS-04 (angular combine, after SYS-16 topology audit) → SYS-03 + SYS-36 (intervals).
   Feature lanes feeding ratings: SYS-07 (afCRPS/EECRPS), SYS-09 (rGAX residualization),
   SYS-10 (relativization rule), SYS-11 (beat-reporter text), SYS-12 (VTCS timing),
   SYS-24 (luck-layer margin pricer), SYS-23 (INT props), SYS-35 (trend discovery),
   SYS-29 (tsflex), SYS-27 (xT error-law publication gate).
4. **Staking fourth:** SYS-05 (Kelly + 1213 redundancy screen + 1203 stop-loss) with the
   SHIPPED fractional κ=0.25 → SYS-19 (α-governor, π=1−α/d_t, α=0.7) → SYS-20 (two-layer
   CVaR: penalizes edge-estimation uncertainty, new capability). Only meaningful once
   probabilities are calibrated and CLV is measurable.
5. **Intelligence fifth:** SYS-31 (QB rusty-backup archetype) + SYS-25 (abstention gate)
   + SYS-30 (drift ensemble) — the reasoning-layer consumers. (Half A SYS-11's F1 ≥ 0.55
   gate and SYS-12's KS gate stay as feature-lane acceptance criteria.)
6. **Reasoning layer (parallel):** the L1–L5 map — situation signals, QB behavioral
   profiles (SYS-31 feeds Track 1), OL→scheme→QB causal chains, adversarial review
   (runs this challenges file against every output), L5 checklist synthesis.
7. **Research-grade (gated, not scheduled):** SYS-13/14/15/17/18 (Half A gated lanes:
   TASC, EP bake-off, copula-HMM, injury taxonomy, in-play dynamics) + Decision Diffuser
   (1947, TVD≤5% + ECE≤0.03 gate), CFCQL (1930, ≥1pp ROI gate), MAML vs NGGP race
   (≥0.02 / ≥0.01 Brier gates), StruSR (2170, only after the neural win-prob model
   exists and is good), B16 cv-scoreboard-ocr (build-or-drop item).

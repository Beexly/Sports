# Buildable Systems — c10 HALF A (r01–r30)

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

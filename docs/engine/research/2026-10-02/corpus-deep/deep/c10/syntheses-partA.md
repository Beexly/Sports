# Syntheses — c10 HALF A (r01–r30): cross-file pipelines and patterns

How methods in this half compose into buildable pipelines, the shared metrics that recur, and the contradictions that force design choices. Every number below was verified against the cited source file (see `verified-claims-partA.md`); brief verdicts are preserved.

Notation: source paths are relative to `~/workspace/vendor/Sports/docs/`. ADOPT = wire it, ADAPT = port with a gate, REJECT = stays rejected.

---

## Pipeline 1 — Calibration + abstention stack (the trust spine)

Seven briefs form one stack; composition order matters.

1. **Calibrate probabilities first** — r16/0738 spline-based probability calibration (ADAPT): spline calibration of raw model probabilities. No calibrated probability, no abstention rule.
2. **Scarce-regime intervals** — r29/1641 EnbPI (ADAPT, arXiv:2010.09107): no-data-splitting conformal intervals for time series via bootstrap LOO residuals + sliding residual window. Atlanta solar at 10% train ratio: EnbPI coverage **0.893** (SE 1.8e-3) vs AdaptCI 0.828, J+aB 0.747, QOOB 0.684, **ICP 0.646**, Weighted ICP 0.608 — the no-split design wins exactly when data is scarce. Gate: full-season coverage within ±2pp of nominal AND mean width ≤ split-conformal; **weeks-1–4 coverage must beat ICP by ≥3pp**. Source: `arxiv-program/research/2026-09-21/arxiv-deep/1641-conformal-prediction-for-time-series-enbpi.md`.
3. **Abstain on calibrated uncertainty** — r16/0694 controlled abstention networks (ADAPT) + r20/1009 online prediction with abstention at fast rates (ADAPT) + r19/0987 conformal reject option (ADAPT): the abstention machinery.
4. **What NOT to abstain on** — r16/0716 (ADAPT, but its contribution is a *negative* result): difficulty/consensus abstention heuristics are invalidated. MC-Dropout variance lifts accuracy +2.3–3.0pp / AUC +1.9–2.4pp, but the variance decomposition shows difficulty alone explains 0.4–1.5%, ability +difficulty 0.8–1.8%, IRT ambiguity 1.1–3.7%; **residual unexplained 76.8–90.2%** — heuristic proxies capture <4% of the epistemic signal linearly. Source: `.../0716-knowing-when-defer-selective-prediction-knowledge.md`.

**Composition logic:** 0738-calibrated probabilities → 1641 EnbPI intervals (early-season) / split-conformal (late) → abstention rule on interval width or MC-dropout variance (0694/1009/0987), never on difficulty or consensus heuristics (0716). The stack gates the betting layer: no pick publishes without a calibrated interval, and wide intervals trigger abstain/reduced stake, not a forced pick.

**Shared metric:** empirical coverage vs nominal + mean interval width. Every layer is judged on the same two numbers.

## Pipeline 2 — Paired-comparison ratings → margin model → stake

1. **Team utilities with dynamic covariates** — r05/0213 PlusDC-BT (ADAPT): P(i beats j) = σ(u_i − u_j + x_ijᵀv), x = home indicator, rest differential, travel/altitude, QB-out indicator; ridge-regularized MLE; Σu_i = 0. Gate (ledger-authored, not a paper result): **≥0.003 rolling log-loss gain over plain BT+Elo on 2022–2024**, fitted covariate signs correct. Source: `.../0213-recent-advances-in-the-bradleyterry-model.md:75`.
2. **Time-varying extension** — r26/1494 dynamic Bradley–Terry (ADAPT): u_i(t) dynamics; model-agnostic checks (rank displacement 5.48 vs 10.68/10.70; LOO nll 0.55 vs 0.56) — the ledger's honest note is that the *dynamics* add less than the *diagnostics*.
3. **Margin distribution** — r25/1448 G-Elo (ADAPT): closed-form frequency estimators, Eqs. 43–46 (η = ½log10(f_J/f_0); α_h = ½log10(f_h f_{J−h}) − log10 ξ). NFL Table 3: G-Elo J=6 — LS **0.6224**, RPS **0.2166**, accuracy **0.6656** vs Elo-Davidson — LS 0.6304, RPS 0.2200, accuracy 0.6375: **+2.8pp accuracy**, largely from dropping draw modeling. Gate: ΔLS ≥ 0.005 and accuracy ≥ baseline + 1pp on 2019–2023. Source: `.../1448-margin-of-victory-differential-skill-ratings.md`.
4. **Supporting cast** — r13/0565 (forecasting success in…), r09/0414 (who's good this year), r18/0889 Plackett–Luce, r19/0933 siamese/triplet ranking, r14/0615 ranking lasso, r15/0656 Massey/Colley: alternative rating machineries for bake-offs, not the primary.

**Composition logic:** PlusDC-BT utilities are the team-strength prior (with QB decomposable: u_i = τ_team + q_QB(i), per the ledger's extension) → G-Elo frequency estimators give the margin distribution → spread/total probabilities → Kelly layer. The 1448 result is a warning baked into the pipeline: **a +2.8pp "accuracy gain" can come from dropping draw modeling, not from better skill estimates** — always decompose where a gain comes from before wiring.

**Scoring-rule caveat (internal tension):** r21/1083 establishes ignorance > Brier > RPS at low imperfection (δ=0.01, 0.025, 95% intervals exclude zero). G-Elo is evaluated on LS/RPS/accuracy — the pipeline should re-score 1448's estimators under ignorance before adopting, since 1083 says the rule changes which system looks best.

## Pipeline 3 — Kelly staking with stop-loss and redundancy screen

1. **Edge → fraction** — r25/1360 Kelly application (ADAPT) + r17/0835 sizing the bets (ADAPT): the base fraction from calibrated edge.
2. **Redundancy screen** — r24/1213 (ADAPT): a new leg enters only if E[(1+X_i)/(1+X_j)] ≤ 1 against every existing leg — the dominant-asset / redundancy condition. Kills parlays/positions that look +EV in isolation but add no growth. Source: `.../1213-rebalancing-frequency-considerations-for-kelly-optimal.md`.
3. **Stop-loss scaling** — r23/1203 (ADAPT): stake fraction = αK·(1−πc/π); the stop-loss scaling function u(z,θ) ∈ [0,1] with **u(z,θ) → 1−z** in the long-horizon limit (z = stop-level/current bankroll). Gate: ≥95% of free-Kelly log growth with stop-hit frequency cut ≥50%. Source: `.../1203-kelly-growth-optimal-with-stop-loss.md`.
4. **What stays rejected** — r29/1631 (REJECT): drawdown-minimizing portfolio with **no edge/probability input** — weights minimize trailing realized drawdown, so it concentrates stake on low-volatility legs regardless of +EV. The >99%-of-days dominance claim (zero transaction costs, overlapping 30-day windows) is an overfit signature. REJECT stands; the salvageable idea (edge filter before the optimizer) is untested.

**Composition logic:** edge ⇒ Kelly fraction ⇒ 1213 redundancy screen ⇒ 1203 stop-loss scaling. Order is load-bearing: sizing starts from edge (1360/0835), never from volatility (1631). This is the direct contradiction resolved — 1631 vs 1203/1213 is the same question ("how do we not blow up") answered two ways, and only the edge-first answer survives.

## Pipeline 4 — Forecast combination with topology audit

1. **Combine distributions** — r27/1550 angular combining (ADAPT, arXiv:2305.16735): optimized θ beat the linear opinion pool by up to **+2.7% MQS**; fallback **θ = 67.5°** (+1.4%) with no history. Source: `.../1550-angular-combining-forecasts-probability-distributions.md`.
2. **Audit the ensemble's information graph** — r30/1677 expert interaction networks (ADAPT, theory): Attention Centrality αᵢ(A) = Σ_{j∈Nᵢ} 1/dⱼ − 1; shared pre-pooling communication adds zero bias in expectation but inflates variance by topology; **star topology is the worst** (Var → σ²(1−ρ)/4 as n→∞); d-regular/balanced is efficient. GSE's component models "communicate" via shared NGS features, injury reports, market-implied lines. Source: `.../1677-expert-interaction-networks-pooling.md:13`.
3. **What stays rejected** — r23/1173 Dirichlet-process infinite forecast combinations (REJECT): combining infinitely many forecasts adds nothing without a real diversity/edge input. REJECT stands.

**Composition logic:** angular-combine (1550) the component distributions → run the 1677 information-graph audit (fraction of total weight attributable to the single most-shared input) → decorrelate or down-weight hub inputs before trusting consensus. 1173 is the cautionary tale: combination machinery without input diversity is theater. The 1677 result reframes "ensemble agreement" — averaging more models that read the same hub input *concentrates* variance while looking like consensus.

## Pipeline 5 — Market-efficiency measurement (not a strategy source)

1. **The executable-edge standard** — r29/1618 (ADAPT): payoff identities (Eqs. 1–5); settlement edges Δ^settle_Y(t) = 1 − Σᵢa_t(Yᵢ); converter edges Δ^{N→Y}_S, Δ^{Y→N}_S; **depth-aware, fee-adjusted** measurement. Findings: ~$1.118M mechanism-linked profit (97% converter-enabled); violation asymmetry **2,098 YES-side vs 36 NO-side** episodes; median duration 16.15s (YES); converter profit/conversion decayed **$1.00 → $0.20 → $0.08** (competition half-life). Source: `.../1618-executable-arbitrage-and-market-efficiency-in-prediction-markets.md`.
2. **The scan methodology** — r29/1608 (ADAPT): single-market Ask_A + Ask_B < 1.00 / Bid_A + Bid_B > 1.00; combinatorial ML-vs-spread; 75M LOB snapshots; **7 valid in-game episodes** out of 37 raw (81.1% post-game artifacts); 0.0001% of time in arb; median duration 3.614s; capped $210.19 vs uncapped $4,418.44.
3. **The vig extractor** — r06/0283 shrouded sin taxes (ADAPT): overround-implied margin per € wagered; shrouding books pass **90%** to consumers vs **16%** non-shrouding (~80pp gap is descriptive heterogeneity, not causal). Gate: flips ≥2% of +EV picks.
4. **In-play dynamics** — r02/0016 (ADAPT): latent state dynamics in in-play markets (ΔAIC = 160,747); red-card/score/half-time stake effects — the regime features for live-market monitoring.

**Composition logic:** 1618's Eqs. 2–4 depth-aware framework is the *standard* for any arb/executability claim (replaces naive mid-price-sum checks); 1608's scan is the *nightly digest* methodology; 0283's overround margin is the *vig input* to CLV accounting; 0016 supplies *live-regime* features. This pipeline is measurement infrastructure + competition intelligence, explicitly **not** a strategy source — 1618's $32k settlement-basket total says capital lock-up isn't worth it, and the $1.00→$0.08 decay curve is the half-life prior for any arb idea.

## Pipeline 6 — Residualization discipline (metrics done right)

- r22/1143 rGAX (ADOPT): residualize the metric on the model, keep the uncertainty. corr(GAX,rGAX) = **0.998**; robustness slopes rGAX **0.936** (SE 0.005) vs GAX 0.757 (0.005); NFL corr(CPAE,rCPAE) = **0.997**. The honest caveat, verified in source: correlation ≈ 1 everywhere, so the marginal value is the **uncertainty quantification (CIs/p-values), not new rankings**; paper figures are not multiplicity-corrected — Bonferroni-Holm/BH/BY for decision use.
- r10/0424 xG contamination (ADAPT): Messi GAX **127.6 → 120.8** when 4,000 shots by a +25% finisher contaminate training (>5% drop); corrected pipeline 127.57 → 149.99; Mahrez **14.61 → 9.03** excluding deflections; +25% finisher at 150 shots: **SD 3.73 around mean 3.70** — single-season GAX is mostly noise; the contamination bias is real but second-order vs that noise.

**Composition logic:** 1143 and 0424 are the same discipline applied twice — a performance metric is only as good as its conditioning set. 0424 tells you *what can go wrong* (training-data contamination, deflection inclusion); 1143 tells you *the fix* (residualize + ship CIs). For GSE: every EPA/target-share-derived player metric gets the rGAX treatment (residualized vs a baseline model, with CIs), and every training pool gets the 0424 contamination audit.

## Pipeline 7 — Ensemble post-processing on CRPS

- r16/0748 afCRPS (ADAPT): train directly on **afCRPS_α = α·fCRPS + (1−α)·CRPS, α=0.95**, with the degeneracy fix (pure fCRPS leaves one member unconstrained when M−1 match the observation) and the positive-terms rearrangement for fp16 stability; M=8–16. Beat the 9km IFS ensemble by **5–20%** on most variables. Gate: ≥2% holdout CRPS gain, no ensemble collapse. Source: `.../0748-aifs-crps-ensemble-forecasting-loss.md:17`.
- r28/1582 ENS-10 (ADAPT): **EECRPS(F,y) = |EFI| × CRPS(F,y)** — extreme-weighted scoring; Gaussian closed-form differentiable CRPS (Baringhaus–Franz); transformer T2m **0.626** vs raw 0.733 (~15%); but only 3 variables baselined (Z500, T850, T2m) — **no wind speed, no precipitation**, the two GSE needs most. Gaussian heads can't represent multimodal precipitation.

**Composition logic:** train distribution models on afCRPS (0748) — never MSE, which smooths away the variability that matters — and evaluate/score on EECRPS (1582) so extreme-weather games (where weather edges pay) dominate model selection. 1582's limitation is the build spec: the NN ladder (MLP→LeNet→transformer) must be re-run on wind speed + precipitation for 30 stadium neighborhoods, not the paper's 3 temperature/geopotential fields.

## Pipeline 8 — NFL feature pipelines (trust-signal + scheme)

- **Text → event alignment** — r28/1595 (ADAPT): PairModel (per-pair exemplar SVM, Conf = Θ·Φ) + PairRank (ρ = (1−d)·Conf + d·Σρ/edge, d=0.5) + greedy macro-event merge (k=4). Paper F1 **41.4** vs 27.6 SOTA (modest absolute; ablations −16pp/−13pp). NFL port: beat-reporter tweets in ±10-min buckets vs nflverse pbp, contrastive bi-encoder + popularity re-ranker; gate **F1 ≥ 0.55** on 200-tweet labeled sample AND ≥0.005 spread-model log-loss gain. Serves per-drive sentiment/availability narrative features (TRUST-SIGNAL).
- **Receiver timing bias** — r28/1572 VTCS (ADAPT): ξ-shift counterfactuals against a catch-probability value surface; team-relative ranking Mann–Whitney p=0, Cliff's δ=−0.339; gate: adapted V_frame separates NFL targets from non-targets (**KS D ≥ 0.25, p<0.01**), receiver mean V_timing adds **+1.5% out-of-sample R² on YPRR**. Serves receiver ξ*-bias as a reception/prop feature (QB-BEHAVIOR).
- **Relativized features** — r03/0049 (ADAPT): honest delta is **+5.2% AUC** (relative vs two-feature absolute), not the headline +21.3% vs the straw-man single absolute; relative beats two-feature in only 51% of accuracy / 61% of AUC trials (statistical tie, predicted by theory). Gate: ≥0.01 AUC vs the relativized twin. Feature-engineering rule: always compare against the relativized twin, never the straw man.
- **Positional corrections** — r03/0069 BayesxG (ADAPT): extended xG — RMSE 0.055, MAE 0.029, R² 0.826, Brier **0.076** vs StatsBomb 0.075 ("nearly identical"); positional adjustments (AM 0.019/0.020 > ST 0.009/0.010). Pattern for NFL: position-adjusted efficiency metrics.

## Pipeline 9 — Injury/causal (thin, mostly rejected)

- r30/1690 competing events (ADAPT): total vs controlled-direct vs separable effects; discrete-time IPW with IR as the competing event; gate: adopt the taxonomy if naive censor-at-IR and IPW total effect differ by **≥20%**; reject the machinery if <10%. Value is the *estimand taxonomy as a reporting standard* — no GSE doc currently distinguishes these estimands.
- r22/1123 tackle injury risk (REJECT): accuracy 62.5% on 64 clips, F1=0.50, κ=0.28 — below usable.
- r26/1464 ACL landing simulation (REJECT): thesis, no validated predictive numbers.

The lane is thin (matches the map's gap note: injury modeling thin). 1690's taxonomy is the keep; everything else stays rejected.

## Cross-cutting patterns

1. **Gate discipline is the norm in this half.** Nearly every ADAPT brief carries a numeric acceptance gate (≥0.003 log-loss, ≥2% CRPS, ≥3pp coverage, KS D ≥ 0.25, F1 ≥ 0.55, ΔLS ≥ 0.005…). The gates are ledger-authored (INFERENCE-marked where applicable), not paper results — they are build contracts, not findings.
2. **Surveys/theory ≠ experiments.** r05/0213 (survey) and r30/1677 (theory) contain no experiments; their numbers (PlusDC equation, star-variance limit) are reference material. Treat them as specs, not evidence.
3. **Shared metrics recur:** CRPS/afCRPS/EECRPS (0748, 1582, 0792), log-loss (0213, 1448, 1516), coverage/width (1641, 1526, 0987), Kelly growth (1203, 1213, 1360, 0835), BT-family ratings (0213, 1494, 0565, 1448, 0889, 0933).
4. **The honest-delta pattern:** 0049 (+5.2% not +21.3%), 1448 (+2.8pp from dropping draws), 1608 (capped $210 vs uncapped $4,418), 1143 (value is CIs, not rankings), 0424 (bias real but second-order vs noise). Every headline number in this half has a quieter honest version — the syntheses above use the honest ones.
5. **Time-safety and point-in-time discipline** appear as stated requirements in 1516 (leakage flag), the llm-playbook (2,641 settled picks; contaminations measured), and 1582 (model-cycle changes forbid pooling reforecasts across eras).

## Contradictions inside this half (and resolutions)

| # | A | B | Resolution |
|---|---|---|---|
| 1 | 1550: angular combining +2.7% MQS over linear pool | 1173: Dirichlet infinite combinations REJECTed | Combination method matters, but only with real input diversity — 1677's topology audit is the arbiter |
| 2 | 1631: minimize trailing drawdown (REJECT) | 1203/1213: edge-first Kelly + stop-loss | Sizing starts from edge, never from volatility; 1631 stays rejected |
| 3 | 0694/1009/0987: abstention machinery | 0716: difficulty/consensus heuristics invalidated | Abstain on calibrated uncertainty (interval width, MC-dropout variance), never on difficulty proxies |
| 4 | 1083: ignorance > Brier > RPS | 1448: evaluated on LS/RPS/accuracy | Re-score 1448's estimators under ignorance before adopting |
| 5 | 1143: corr ≈ 1, value is uncertainty | Temptation to ship rGAX as "new rankings" | Ship CIs/p-values with multiplicity correction, not a new leaderboard |
| 6 | 1618: $1.118M arb profit measured | 1608: 0.0001% of time in arb; $1.00→$0.08 decay | Measurement infrastructure yes, strategy no — the decay curve is the half-life prior |

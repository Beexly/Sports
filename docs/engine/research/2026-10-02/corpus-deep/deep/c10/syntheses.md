# Syntheses — c10 full slice (r01–r60)

Cross-file pipelines: findings connected across files, with resolved contradictions and
ledger authors' own honest deltas. Half A pipelines (r01–r30) followed by Half B syntheses
S1–S9 (r31–r60), then cross-half composition notes from the coordinator merge (2026-10-02).
Buildable systems are in `buildable-systems.md`; every equation there was verified here.

---

## Half A — cross-file pipelines (r01–r30)

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
---

## Half B — syntheses S1–S9 (r31–r60)

Cross-file pipelines and patterns with the composition logic. Each synthesis names the
composition order, the seam between components, and what must be true for the pipeline to
work. INFERENCE is marked explicitly.

---

## S1. The three-layer staking stack

**Components:** fractional Kelly (SESSION_2, r51) → drawdown governor (1749, r32) →
composite risk sizing (2143, r38). Variant selection by mean ignorance (1083, other half).

**Composition order:**
1. **Edge estimate** p̂ comes out of the calibrated probability stack (S2). Sizing uses
   **effective price** — never the listed line — per 1702/lead-lag: effective price =
   listed price adjusted by the market's mean-reversion dynamics.
2. **Fractional Kelly κ=0.25** (SESSION_2:60,64: `KELLY_FRACTION=0.25`, SHIPPED, never κ=1).
3. **α-governor (1749):** scale the weekly Kelly stake by π = 1 − α/d_t where d_t = B_t/M_t
   (bankroll / running maximum), α=0.7. Adoption gate from the ledger: min B_t/M_t ≥ α−0.02
   with ≥80% of unconstrained terminal log growth on the 2023–2025 NFL backtest.
   (Caveat: π = 1 − α/d_t is the ledger's discrete-time reconstruction; the paper gives only
   continuous-time existence/uniqueness/turnpike results.)
4. **Two-layer CVaR (2143):** inner CVaR_ε over game outcomes given the market model F;
   outer CVaR_δ over the posterior of the engine's own edge estimate p (beta-binomial on
   rolling 8-week Brier history). CVaR-Expectation (33) is convex and LP-solvable via SAA
   with the paper's sample-complexity bound M ≥ C₁(H,F)/γ²·[C₂(H,F)n + C₃(H,F)log(1/ε)].
   **VaR-Expectation is non-convex** — use CVaR-Expectation.

**Why this order:** Kelly sets the unconstrained growth rate; the governor enforces the
drawdown constraint pathwise; CVaR penalizes both game variance (inner) and
edge-estimation uncertainty (outer) — the latter is genuinely new capability: GSE has no
edge-uncertainty penalty today. Dominant Asset screening (1213, other half) runs before
Kelly: only play assets whose growth rate is robust to the edge-estimation noise CVaR-δ
penalizes.

**Seam risk:** the α-governor needs bankroll dynamics at weekly granularity; CVaR-δ needs
the rolling 8-week Brier history as the p̂ posterior. Both are buildable from existing
ledger data.

## S2. The calibration honesty pipeline

**Components:** production chain (BAYES_NONPARAMETRIC r49 = PLATT_HIERARCHICAL r51) →
adaptive-bin ECE (LAUNCH_CALIBRATION_COHORT r50) → Wilson edge claim (ENGINEERING_PRINCIPLES
r60) → 15-test evidence guard (RESCUE r58) → benchmark-lab gates (r49) → win-rate sample
floor (content-provenance r49).

**The chain, in order:**
1. **Production calibration stack** (two independent docs agree): Raw → Temperature →
   Platt (MAP IRLS) → Isotonic PAVA/CIR → hierarchical EB-τ (τ clamped [0.05, 2],
   intercept-only A_g = A + a_g unless holdout proves slope hierarchy). DP/HDP mixtures
   are notebook-only — **never production**.
2. **Adaptive-bin ECE is the honest binning** (cohort E: adaptive 0.0126 vs equal-width
   0.0180 — equal-width is inflated by sparse tails). Cohort E baseline: Brier 0.2106
   [0.2050, 0.2172] on 5,281 games, reliability 0.0324, resolution 0.0361.
3. **Wilson 95% LB ≥ 52.4%** to claim edge on any source (ENGINEERING_PRINCIPLES:24),
   default 50% null; 80% two-sided CI, **90% for public**; n≥30 minimum sample.
4. **15-test evidence guard** (RESCUE: 15/15 GREEN): every artifact rebinds evidence by
   hash at publish; BLOCKED artifacts (A8: Boltzmann 0.2558 vs isotonic 0.2148, Δ=0.041 —
   the concrete cost of shipping uncalibrated logits) never touch a live pick.
5. **Benchmark-lab gates** (model-benchmark-lab:49,97,111): ≥30 picks per sport per version,
   ≥30 per pick type, A/B on same holdout, p<0.05 on 100+ picks on ≥1 dimension, **never
   suppress a failing dimension**.
6. **≥30 settled picks, defined window, model version** before any win-rate claim
   (content-provenance:129).

**Why this order:** calibration makes probabilities honest; ECE measures the honesty;
Wilson decides whether a source clears the edge bar; the evidence guard makes the claim
auditable; the benchmark lab makes it comparative; the sample floor makes it publishable.
The ladder baseline: Elo 0.2314, pregame logit 0.2262, devigged price 0.2122 (historical
walk-forward, r57) — GSE models must beat the **devigged price**, not Elo.

## S3. The leak-wall / integrity stack

**Components:** EV rules (CARDS_EDGE_VALIDATE r42) → covariate bus (AGENT r49) →
CONFIRMS provenance (r44) → CANONICITY dedup (r49) → architecture-handoff contamination
punchlist (r54) → fail-closed migration invariants (pr3-tlaps r48) → backfill guard
(NEEDS_VERIFY, from map addendum A1).

**Composition:**
- **Ingestion discipline (EV):** `latestPriorRow` leak wall must fail **closed** on
  non-finite weeks (currently fail-open — the r42 finding); missing market feeds refuse
  `no_market_feed`, never proxy a close; tests must pin values by **independent
  derivation** (a test recomputing the implementation's own formula is vacuous).
- **Covariate bus (AGENT:21-22):** contract key gsisId|season|week|statType; **week t
  predicts t+1**; returns {value, grain:"week_t_for_tplus1", provenance}, never a bare
  float; null → fail-closed.
- **Provenance stamp (confirms-stamp:55,81):** per-source homeFairProb + direction on every
  pick row; SPLIT when directions genuinely differ — fixes the same stamp-at-emission /
  enforce-nowhere class as the CARDS finding.
- **Dedup (CANONICITY:46,55):** 9/80 slots (11%) lost to duplicate rows — dedupe before
  take:80, not a bigger cap.
- **Contamination punchlist (architecture-handoff:88-135, dated 2026-09-18):** six-hourly
  cron rewrites trueProb with non-as-of inputs (lines 96-101); cqr finite-sample clamp
  delivers 83.33% coverage while claiming 90% (n=5); in-play exclusion keeps null-clock
  rows; walk-forward cuts by row index without group key; logistic shrinks market logit to
  base rate (must be fixed offset); compute_advanced_metrics double-inverts lower-is-better
  metrics. **Re-verify each item's current state — dated, may be fixed.**
- **Migration invariants (pr3-tlaps:121,125):** Inv_FileDefaultSafe, Inv_MigrateOnlyVerifiedLocal.
- **Backfill NEEDS_VERIFY (map A1):** ~100K-row trueProb recompute needs as-of + seeded +
  hash-verified before any model trains on the column.

**Why this order:** the EV rules are the acceptance criteria; the bus is the enforcement
mechanism; CONFIRMS/canonicity fix provenance and dedup at emission; the punchlist is the
known-violations register; the invariants prevent half-applied migrations.

## S4. The QB-behavioral program (feeds TNF Track 1)

**Components:** 8-dim QB vector (qb-pipeline r57) + rusty-backup archetype (keenum r47) +
first-read/aggressiveness features (LANE-BRIEFING r57) + NGS methodology (r40, internal) +
efficiency weights (dossier-v2 r41) + Phase 2/3 open slots.

**The 8-dim vector (qb-pipeline-spec:5):** age/experience, 3-game rolling efficiency,
rushing floor, weapons/context, injury, opponent pass-D, OL tier, weather.
**Additions from this half:**
- **Rusty-backup archetype (keenum:97,99-159):** ≥10 targeted attempts after ≥8-week gap;
  the blanket is individual-player (slot/receiving-RB/WR1 with the most separation-friendly
  role), not positional; 323 targets / 10 games, suggestive not predictive.
- **Processing features (LANE-BRIEFING:9-18):** first-read% (Purdy 27.0, Love 78.6) and
  aggressiveness% (Stroud 21, highest 2024) as QB-decision features.
- **Efficiency weights (dossier-v2:178,182,188):** passing-efficiency vs wins r 0.53–0.61
  across three eras vs rushing 0.13–0.19; strip scripted/opening-drive EPA (non-scripted
  0.51/0.29 vs scripted 0.26/0.16).
- **NGS methodology (r40):** TCN + spliced binned-Pareto QB score (released PyTorch
  notebook); 2D-CNN Zoo recipe; transformer ADE 4.61 vs Zoo 5.78 — **reasoning fuel only,
  never public, never metric names.**

**Composition:** Phase 1 shipped (`qb-signal-v1.ts` + `qb-odds-comparison.ts`, Sleeper vs
DK consensus). **Phase 2 (archetypes: rusty-backup, processing-profile) and Phase 3
(calibration) are open build slots** (qb-pipeline-spec:17,25,58,63). The rusty-backup
archetype is the natural Phase-2 seed: the rule is behavioral, already parameterized, and
feeds the TNF program's Watson questions directly.

**Seam risk:** NGS doctrine — everything from r40 stays internal. The 8-dim vector can
carry NGS-derived features only as unlabeled inputs, never as named signals.

## S5. The new-regime module: two independent shots

**Components:** MAML (1912, r35) vs NGGP (1902, r34), gated by the new-regime Brier gates
from the reasoning-depth spec.

**The race:**
- **MAML (1912):** gradient-based meta-learning, first-order approx at ~33% less compute
  (48.07 vs 48.70 5-way 1-shot), adapts with K∈{2,4} support examples. Gate: **≥0.02
  Brier improvement** on new-regime prediction.
- **NGGP (1902):** non-Gaussian GP with neural-parameterized likelihood + FFJORD prior
  flows; wins concentrate in NLL (calibration) and out-of-range (NASDAQ100 NLL
  1.049→−2.978). Gate: **≥0.01 Brier improvement**.

**Composition logic:** run both against the same new-regime holdout (coordinator changes,
rookie breakouts, scheme flips — the regimes Regime-PCMCI (1964) detects: 99.6% regime
reconstruction, TPR 0.99 / FPR 0.01, N_K selected by AICc). **INFERENCE:** MAML is the
speed shot (few gradient steps, fast adaptation); NGGP is the calibration shot (better
NLL, but O(n³) + ODE solves per step). If both clear their gates, MAML for the weekly
regime-adaptation loop, NGGP for the offseason prior-refit. **Do not adopt either without
the gate — both papers' headline numbers are on toy/finance data, not sports.**

## S6. The feature pipeline: from raw tracking to leak-free features

**Components:** tsflex (2188, r39) → time-aware OpenFE (1842, r33) → feature programming
(1852, r33) → (event_ts, creation_ts) feature store (2022, r36) → drift ensemble (1885,
r34) → stream chaos/release (2032, r36).

**Composition:**
1. **tsflex (2188):** index-based feature extraction (4.3s vs TSFEL 16.4s, ~2.5× less
   memory) — the bye-week gap is exactly its design case. Wrap all functions with
   `make_robust`; re-verify the current API (paper is v0.2.3, 2021).
2. **Time-aware OpenFE (1842):** expanding-window pre-game semantics + ≥3-of-4-season
   stability filter; the paper's 80/20 random split is **not** the eval — walk-forward.
3. **Feature programming (1852):** Difference/Window/Shift operators, 0th/1st/2nd order
   (one-step R² gains 1.3–5.85%; multi-horizon +88% R²). **Needs a pruning stage** (the
   paper lacks one) before it meets OpenFE's output.
4. **Feature store (2022):** offline keyed (event_timestamp + creation_timestamp), online
   override iff newer event_ts (or equal event_ts + newer creation_ts); per-source delay
   for the nearest-past-value rule (NGS re-runs 48h, odds 0). **Paper admits parts are
   aspirational and the anti-leakage mechanism is unvalidated** — adopt as design input,
   not validated architecture.
5. **Drift ensemble (1885):** majority vote over ADWIN + HDDM-A + KSWIN (abrupt) /
   HDDM-A + HDDM-W + Page-Hinkley (gradual); kNN(k=4) imputation always helped; 2000/1000
   instance windows.
6. **Chaos/release (2032):** corrupt-Parquet / kill-mid-write / delete-Delta-log suite
   with ACID-rollback verification via time travel; probe task recomputing one known week
   against a pinned hash.

**Seam risk:** the store's merge semantics assume "no failure of dumping" (2022:58-61) —
no staleness bound. The drift ensemble is the compensating control for silent staleness.

## S7. The abstention module

**Components:** NNTD (1778, r32) + conformal reject (0987, other half) + MC-Dropout
disagreement (0716, other half).

**Composition logic:** NNTD gives **training-dynamics disagreement** (25–50 checkpoints,
late-weight k=0.05): coverage 91.2/86.4/75.9 at 2/1/0.5% error. But the ledger's own
limitation: disagreement vs the final model's *own label* — confidently-wrong
subpopulations are invisible. **The fix is the composition:** intersect NNTD's
training-dynamics signal with the market's external second opinion (the market
disagrees with the model for real-world reasons training dynamics can't see). The
ledger's joint training-dynamics × market-disagreement experiment is the real idea.
Conformal reject (0987) provides the formal coverage guarantee; MC-Dropout (0716)
invalidates the naive difficulty/consensus heuristics.

**Seam risk:** k=0.05 was tuned on the same benchmarks it wins on — re-tune on NFL data.
The abstention module is the natural consumer of the evidence-guard (S2) BLOCKED logic:
abstain = don't publish.

## S8. The CLV measurement program: honest status

**Components:** Neon odds history (clv-hunt r59) + CLOSE-stamping gap (RESULTS r55) +
staleness fix (clv-forensics r53) + per-book grading (LAUNCH_CALIBRATION_COHORT r50) +
provider probes (l10 r53) + F3 bias note (REPO_CONSOLIDATION_MAP r52).

**Honest status, assembled:**
- History **exists**: `gse.odds` 8,083,183 rows (2.0 GB), 2025-04-24→2026-10-01.
- **Broken window**: 2026-08-22→mid-September (broken snapshot writer) — CLV for in-season
  weeks 1–4 **cannot** be computed without repaired close lines; the season-1 calibration
  report cannot ship (clv-hunt:45-48).
- **Unmerged fix**: MAX_CLOSE_AGE_MS (M-F7) not merged — no staleness bound on the closing
  snapshot; "corrupts the shared closing snapshot SPREAD, TOTAL, and [ML] use"; ML −27.4pp
  unexplained (clv-forensics:45-51,74).
- **Missing phases**: CLOSE-phase rows absent for NFL and MLB at query time (RESULTS:17-25).
- **Canonical grading**: per-book American→implied, mean per side, proportional two-way
  de-vig, latest row fetchedAt ≤ generatedAt, ≥MIN_BOOKMAKERS books quoting both sides
  (LAUNCH_CALIBRATION_COHORT:102-107).
- **Interaction**: F3 — TeamGameLog ATS graded vs OPENING consensus, not the close →
  systematically biased ATS form signal (one-line fix, founder sign-off).
- **ESPN is blocked** until a fresh probe contradicts the 403s (l10, CONTRADICTED).

**Repair path (from the files):** settle games on the odds archive — no re-probe needed.
Then merge M-F7, backfill CLOSE stamps for NFL/MLB, and only then quote a CLV beat-rate.
The 0.2273 beat-rate (328/611/504 of 1,443) is graded under the broken regime —
**clearsBreakEven=false; no edge claimed.**

## S9. The reasoning-layer map: from spec to evidence

**The reasoning-depth spec's L1–L5 mapped to this half's evidence:**

- **L1 (situation signals):** the canonical field list — rest, roof, surface, weather,
  stadium, teams, kickoff, no prices (situation-signal-vs-quote-plane:1-10); quote-plane
  = book market-state merge ladder with the `eventId` join seam and the no-odds-in-signals
  invariant.
- **L2 (QB behavioral profiles):** S4 above — the 8-dim vector + rusty-backup archetype +
  first-read/aggressiveness + NGS (internal). Feeds TNF Track 1.
- **L3 (OL→scheme→QB causal chains):** dossier-v2 efficiency weights (pass ≫ rush,
  0.53–0.61 vs 0.13–0.19); QB-WR consensus rules (OL-injury × pass-rush downgrade;
  personnel-absence → positional boost); Regime-PCMCI for when the causal structure itself
  changes (injury, coordinator change).
- **L4 (adversarial review):** the corrupted-ledger method (1173, other half) +
  this-half's honesty gates — the evidence guard, the vacuous-test rule
  (CARDS_EDGE_VALIDATE:65-68), the 2047 double-dipping flag. L4's job is to run the
  challenges file against every L1–L3 output.
- **L5 (checklist synthesis):** the calibration honesty pipeline (S2) as the final gate —
  no claim passes L5 without adaptive ECE, Wilson LB, evidence hash, and ≥30-pick sample.

**The reasoning layer's current state is honestly bad** (2025-holdout: 285/285
INSUFFICIENT; bridge-premises audit: no time index on the rows). The map above is the
build target, not the current state.
---

## Cross-half composition (coordinator merge, 2026-10-02)

1. **The full staking stack, composed:** PartA Pipeline 3 (Kelly 1360/0835 → 1213 redundancy
   screen → 1203 stop-loss, u(z,θ)→1−z) + PartB S1 (SHIPPED κ=0.25 fraction; α-governor
   π=1−α/d_t, α=0.7, ~20 lines; two-layer CVaR-Expectation penalizing edge-estimation
   uncertainty — the new capability Kelly ignores). SESSION_2's κ=0.25 pins the fraction
   PartA's pipeline left parametric. Build order: edge → κ=0.25 Kelly → 1213 redundancy
   screen → α-governor → two-layer CVaR. 1631-style drawdown minimization (no edge input)
   stays REJECTED in both halves — do not re-litigate.
2. **The calibration stack, pinned:** PartA Pipeline 1 (spline calibration 0738, EnbPI 1641,
   abstention 0694/1009/0987, 0716 heuristic invalidation) is the research substrate;
   PartB S2 (production chain Temp→Platt→Isotonic→EB-τ; adaptive-bin ECE baseline 0.0126;
   15-test evidence guard 15/15; Wilson-LB comparison rule; 1083's ignorance-hierarchy and
   mean-ignorance variant selection) is the production pinning. Half B's mandate stands:
   implement the chain exactly as the two independent docs specify — once.
3. **Abstention is dual-sided:** PartA Pipeline 1's interval/width machinery + PartB S7's
   NNTD training-dynamics gate (k=0.05 tuned, re-tune on NFL; composite with market
   disagreement — NNTD alone is blind to confidently-wrong subpopulations, which is the
   ledger's own stated limitation).
4. **Team ratings, same family:** PartA Pipeline 2 (PlusDC-BT, 0213) + PartB SYS-26/B8
   (2601.14727: Newman FPI, EM-MAP with Zermelo as special case, PlusDC). Accept whatever
   the bake-off winner is under the two gates (≥0.003 log-loss vs Elo on 2022–2024
   [LEDGER]; ≥2% walk-forward Brier [LEDGER]).
5. **New-regime meta-learning is the answer to the newregime module:** PartB S5 (MAML
   gate ≥0.02 Brier / NGGP gate ≥0.01 Brier on post-roster-shock windows) maps to the
   currently-unbuilt `newregime` module gates in the test suite — first implementation
   run is the validation.
6. **CLV honesty is cross-half:** PartB S8 (settle-on-archive; merge MAX_CLOSE_AGE_MS;
   backfill CLOSE stamps; no CLV number quoted until repaired) is the standing honesty
   rule. PartA's Pipeline on market monitoring (SYS-08, executable arb as measurement
   infrastructure) assumes repaired close lines.
7. **The honest-delta pattern recurs across the whole slice:** PartA — 0049 (+5.2% not
   +21.3%), 1448 (+2.8pp from dropping draws), 1608 ($210 capped not $4,418), 1143
   (value is uncertainty, not re-ranking), 0424 (decontamination second-order vs noise);
   PartB — 2047 (21.3% SR double-dipped/cost-free), 1804 (~6% parlay edge in-sample),
   1827 (headline unverifiable). Both halves' syntheses use the honest versions.
8. **The knowledge graph is the wiring diagram:** PartB S6 (evidence-graph as typed
   infrastructure: supports/contradicts/partial, ledger citations, status state machine)
   + the reasoning-depth spec L1–L5 map (PartB S9) describe the same reasoning layer
   PartA's pipelines feed. Build the typed edges once.
9. **Resolving Half A's open items with Half B material:** Half A noted early-season
   coverage as the conformal weakness — PartB S18's EnbPI anti-spec (exact finite-sample
   quantile ⌈(n+1)(1−α)⌉/n, never the clamped asymptotic rank) is the implementation
   guardrail. Half A's pipeline on relativized features (SYS-10) composes with PartB
   S17's trend-discovery bar (effect size on ≥2,000 team-weeks + Welch p<0.01 + holdout).

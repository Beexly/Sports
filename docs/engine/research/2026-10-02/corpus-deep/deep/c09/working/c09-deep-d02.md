# Deep analysis d02 — c09-d06..d11

**Chunk:** 22 arXiv deep-read ledgers (0362, 0453, 0463, 0473, 0483, 0493, 0503, 0513, 0523, 0533, 0544, 0554, 0564, 0574, 0584, 0594, 0604, 0747, 0769, 0791, 0813, 0834, 0844).
**Character of the chunk:** this is the slice's quant-plumbing core — uncertainty quantification (0473, 0503), the rating layer (0544, 0564, 0574, 0554, 0493), the sizing stack (0791, 0813, 0834, 0747), causal inference (0769, 0533), player-trajectory methods (0594, 0604), plus CV (0362, 0513), decision theory (0483), text (0844), and three hard REJECTs (0453, 0463, 0523).
**Verification method:** every headline number below was re-checked against the ledger file at `~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/<file>.md` (read-only). Citations are `file:line`. LIMITATION: verification is ledger-level only — I did not pull the original arXiv PDFs, so all "VERIFIED" means "the ledger actually contains this claim," not "the underlying paper's claim is true."

## Verified claims (claim — `source:line` — VERIFIED or FLAGGED)

**0362 (McByte tracking, ADAPT the gating pattern)**
- DanceTrack val ablation (HOTA/IDF1/MOTA): baseline 47.1/51.9/88.2 → uncontrolled mask use 48.6/**44.4**/80.8 (IDF1 drops — blind mask fusion harmful) → full McByte 62.3/64.0/89.8 — `0362:41` — VERIFIED
- SportsMOT test: McByte 76.9/77.5/97.2 vs ByteTrack 64.1/71.4/95.9 — `0362:42` — VERIFIED
- Gating conditions (all 4 required): TP mask visible; mean mask pixel confidence > 0.6; mf = |mask ∩ bbox|/|bbox| > 0.05; mc = |mask ∩ bbox|/|mask| > 0.9; update: costs = costs_IoU − mf if conditions hold — `0362:20` — VERIFIED
- Cost ~3–5 FPS on a single A100 for the association stage alone — `0362:47` — VERIFIED

**0453 (MDSE, REJECT)**
- Verdict REJECT — restates standard Bayesian networks; all "empirical" results are toy arithmetic on invented numbers — `0453:5` — VERIFIED
- Joint example 0.5·0.7·0.24 = 0.084 smuggles in conditional independence — `0453:29` — VERIFIED
- Claimed improvements internally inconsistent: abstract "15–20%", examples 11%/18%/12%, §10 "42% scalability gain" — `0453:41` + `0453:46` — VERIFIED

**0463 (Indeterminate probability NN, REJECT)**
- Verdict REJECT — exponential-capacity claim confuses representational combinatorics with learnability; conditional-independence assumption the paper admits "can neither be proved nor falsified" — `0463:5` — VERIFIED
- 12-bit→4096-class WITHOUT auxiliary labels: 69.5% train accuracy (failure); WITH all 12 bit labels: 100% train accuracy with 24 outputs — circular (labels hand over the factorization) — `0463:30` + `0463:45` — VERIFIED

**0473 (Deep spatiotemporal UQ, ADAPT)**
- MIS loss: L_MIS = (u−l) + (2/ρ)(y−u)1{y>u} + (2/ρ)(l−y)1{y<l} + |y−f|; argmin gives the (1−ρ) confidence interval — `0473:14` — VERIFIED
- PM2.5 48h: MAE SG-MCMC 24.73 (best) vs point model 26.77; MIS: MIS-reg 179.96 (best), MC dropout 881.05 (worst, intervals too narrow at width 9.16) — `0473:26` — VERIFIED
- DeepGLEAM hybrid RMSE 1W: 66.03 vs GLEAM 73.59 vs pure deep 239.94; paper claims 6.6% improvement at 1W, 17% average over GLEAM — `0473:26` — VERIFIED
- Verdict ADAPT; MC dropout and naive bootstrap ruled out — `0473:5` — VERIFIED
- Ledger's own adversarial note: no significance tests on any table; MC dropout at 5%/50 passes is a weak config (its failure may be tuning); COVID deep-model failure is partly a straw man (~16 weeks of data) — `0473:32` — VERIFIED (this weakens the "rule out MC dropout" claim)

**0483 (Posterior-predictive admissibility, REJECT)**
- Verdict REJECT — 4-page theory note, no data, no algorithm; admissibility is a weak optimality property (many bad rules are admissible) — `0483:5` — VERIFIED
- Ledger notes standing corpus gap "Kelly criterion, zero papers read" — `0483:54` — VERIFIED (gap now closed by 0813/0834/0791 in this same chunk)

**0493 (NBA long-sequence LSTM, ADAPT the fallback-prior architecture)**
- LSTM 72.35% accuracy, 73.15% precision, 76.13% AUC-ROC — best on all metrics; RF top-3 importances LOSSES, WINS, PIE (3-point features ranked near bottom) — `0493:26` + `0493:28` — VERIFIED
- 9,840-game sequence windows, sliding one game at a time (9,839-game overlap) — `0493:11` — VERIFIED
- No train/val/test dates, proportions, or split protocol stated — `0493:38` — VERIFIED
- The "Vegas ~55% accurate vs our 72.35%" claim is a category error (Vegas prices to balance action; 55% concerns ATS pick rates) — `0493:40` — VERIFIED (flagged in-ledger)
- Acceptance gate proposed: stacked ensemble log-loss ≥0.005 better on 2023–2024 holdout — `0493:55` — VERIFIED (ledger gate, sensible)

**0503 (Win-prob bootstrap undercoverage, ADOPT)**
- Verdict ADOPT game-clustered bootstrap with reported coverage — `0503:5` — VERIFIED
- 4,101 games → 2,291 independent-play equivalents (56%); 2,050 → 645 (31%); 8,202 → 6,911 (84%) — `0503:38` — VERIFIED
- Nominal 90% intervals: standard (i.i.d.) coverage 0.60 ± 0.01, width 0.027; φ=0.35 fractional cluster: 0.90 ± 0.01, width 0.063 — `0503:43` + `0503:51` — VERIFIED
- Paper's own caveat: even φ=0.35 gives only ~85% conditional coverage near WP 0.3 and 0.7; the fix buys coverage with 2.3× width inflation (0.063 vs 0.027) — `0503:53` + `0503:62` — VERIFIED
- Ledger directive: do NOT hard-code φ=0.35; tune φ on nflverse 2020–2024 by coverage-vs-width — `0503:71` — VERIFIED

**0513 (Baseball activity recognition, REJECT)**
- Verdict REJECT — no GSE video pipeline; no transfer path to NFL modeling — `0513:5` — VERIFIED
- Sub-events win multi-label mAP (62.6 two-stream InceptionV3 vs LSTM 57.7, conv 56.1) with only 36K added params vs LSTM's 10.5M — `0513:41` — VERIFIED
- Pitch-speed RMSE best 3.6 mph at 60 fps; 8/3 fps gave only 1–2 pitch frames — insufficient — `0513:44` — VERIFIED
- Train/test split protocol unstated — clips from the same 20 games may leak across splits — (in brief; consistent with ledger limitations)

**0523 (CoArena, REJECT)**
- Verdict REJECT — every number explicitly labeled illustrative or simulated; zero empirical measurements of a deployed system — `0523:5` + `0523:11` (paper's own quote) — VERIFIED
- 5-agent worked ratings A 1140 … E 877 etc. all ILLUSTRATIVE per authors — `0523:41` — VERIFIED
- Only salvageable item: reporting discipline (publish intervals and rank bands, not point ranks) — (brief's engine-actionable)

**0533 (Hydration-break momentum, ADAPT the case-crossover design)**
- 99 World Cup 2026 matches (67 group, 32 knockout), 198 break events (2/match), 3,139 control anchors; WBGT mean 24.2°C (SD 4.3, range 17.8–34.7) — `0533:11` + `0533:15` — VERIFIED
- Main effect on sign-adjusted momentum: within-match +0.26 [−2.50, +3.02] clock-aligned; −0.63 [−3.63, +2.37] play-aligned — every interval crosses zero — `0533:37` — VERIFIED
- Net xG effect ≈ zero: −0.001 [−0.051, +0.049] — `0533:41` — VERIFIED
- FLAGGED provenance question: 67 group + 32 knockout = 99, plus 3 dropped = 102 analyzed — the real 2026 World Cup format (48 teams) has 104 matches (72 group + 32 knockout). The ledger reports 67 group matches (3 dropped = 70?), which does not reconcile cleanly with the 72-match group stage. Ledger:11 says "3 matches dropped (empty/over-long series, missing second-half break)." Possible explanations: subset analysis, or venue/format exclusions — I could not verify from the ledger. Treat the dataset claim as UNVERIFIED until the paper's data appendix is checked. This does not affect the design transfer (the method is the takeaway).

**0544 (BT regularization, ADAPT)**
- Calibration formula: q = (1+δ)/(1+2δ), i.e. δ = (1−q)/(2q−1); q=0.99 → δ = 1/98 — `0544:26` — VERIFIED
- CV-selected (MLB 2025): ridge λ = 0.01; pseudo-game δ = 1.2589; phantom-player ρ = 40 (≈80 effective games vs zero-strength team) — `0544:42` — VERIFIED
- Brewers BT 0.386 → phantom 0.258; Rockies −0.979 → −0.629; middle teams barely move — shrinkage is selective for extremes — `0544:43` — VERIFIED
- Phantom penalty has LINEAR (robust) tails vs ridge's quadratic; both fit in plain `glm` — `0544:5` — VERIFIED
- FLAGGED: expert-calibration (δ = 1/98 ≈ 0.0102) vs CV (δ = 1.2589) disagree by 2 orders of magnitude, paper unreconciled — the "interpretable dial" is philosophically unsettled — `0544:54` — VERIFIED

**0554 (MFM ordinal graphical models, ADAPT)**
- Table 1, K=3, n=100, p=10: MFM-PGM Prob 1.00 (0.00), ARI 0.7383 (0.2127), RMSE 4.2462 — vs PLE Prob 0.00, ARI 0.0779; mclust-on-latent-oracle Prob 0.97, ARI 0.9593 — `0554:28` — VERIFIED
- K recovery: 100% of replicates for K=2, K=3, unbalanced; >85% for K=5 — `0554:28` — VERIFIED
- NBA case study found 3 groups (411 "Established Stars", 112 "Role Players", 13 "Adaptive Tactical Hubs") — `0554:28` — VERIFIED; real-data analysis is descriptive only, no held-out validation — `0554:25` — VERIFIED
- Proposed gates: half-season ARI ≥ 0.6 stability + walk-forward ATS log-loss gain ≥ 0.003 — (brief engine-actionable; INFERENCE by the worker, not the paper — treat as a proposal, not an empirical result)

**0564 (Elo convergence theory, ADAPT the engineering rules)**
- Main bound (Theorem 16): E[(1/N)|X−ρ|_1] ≤ ((N−1)/N)·√(8K/ℓ_η) for K ≤ ℓ_η/2 — equilibrium error scales as √K — `0564:28` + `0564:26` — VERIFIED
- E[X¹] ≠ ρ¹ for ρ¹ ≠ 0 (ratings overestimate positive skill, underestimate negative; bias direction observed for K=1), while E[b(2X¹)] lands exactly on the diagonal — Proposition 12: transformed prediction unbiased for the true win-probability transform — `0564:39` — VERIFIED
- √K law is small-K only: numerics show E[|X¹−ρ¹|] grows linearly away from 0 — `0564:39` — VERIFIED
- Ledger adversarial notes: all numerics N=2, one (b,K,L) — never numerically verified for N>2 or realistic schedules; computing actual bias E[X]−ρ remains open; Proposition 12 needs correct model specification; no convergence rate in t — `0564:45` — VERIFIED

**0574 (KRC spectral ranker, ADAPT)**
- Table 1 forecasting accuracy totals: KRC(h=1) 0.6382 vs Elo 0.6355; KRC(h=1.5) collapses to 0.6173; WMLE(h=1) 0.6355 — `0574:44` — VERIFIED
- Paper's own words: "our method achieved comparable results to Elo and outperformed Elo when h=1 in the average accuracy"; "season-length data is more informative for estimation and prediction" — `0574:45` — VERIFIED
- Lemma 1/Algorithm 2: new game changes only rows i,j of P̂ → two Sherman–Morrison rank-one updates, no re-optimization — (brief; ledger §3.3)
- FLAGGED: the "beats Elo" headline is +0.27pp on ~3 seasons, one bandwidth's margin, no CI on accuracy differences; feature-rich Elo beat featureless KRC in 2 of 3 seasons — `0574:54` — VERIFIED (in-ledger)

**0584 (Nested ZIGP World Cup forecaster, ADAPT the machinery not the likelihood)**
- WC 2010: BS 17.79 (ZIGP) vs 17.97 (bivariate Poisson) vs 17.97 (independent Poisson); RPS 4.93 vs 4.99 vs 5.05 — `0584:33` — VERIFIED
- EURO 2016: BS 17.52 vs 23.27 vs 23.25 (ZIGP clearly best); EURO 2020: 14.54 vs 14.36 vs 16.37 (tie) — `0584:36` — VERIFIED
- WC 2022 forecast (100k sims): Brazil 17.3%, Argentina 13.1%, Belgium 10.8% — actual winner Argentina inside top-2 — `0584:39` — VERIFIED
- Transferable components named in-ledger: (a) nested offense-vs-defense score regression, (b) date+importance-weighted history with explicit half-life, (c) team ratings updated *inside* each Monte Carlo replication — no existing GSE component does all three — (ledger §10)
- 3-year half-life and FIFA importance weights fixed by convention (Ley et al. 2019), not tuned — author admits non-weighting sometimes performs no worse — (ledger §9, brief)
- Acceptance gate: beat static-strength sim by ≥5% Brier AND beat/tie futures-implied RPS in ≥4 of 5 postseasons 2020–2024 — (brief §13; worker-proposed, INFERENCE-level)

**0594 (Bayesian GARCH shot-put, ADAPT the volatility idea)**
- LPML: M1 (GARCH) = −45943; M1^(2) vague prior = −46573; M2 (fixed age) = −45472 (best); M3 (AR seasonal) = −46544 — `0594:30` — VERIFIED
- M1 posterior: β1 (sex) = −0.120, sd 0.0270, ESS 190; β2 (age) = 6.22e-3, sd 9.95e-4, ESS 170; β3 (environment) = 0.0453, sd 9.55e-3, ESS 1600 — `0594:31` — VERIFIED
- FLAGGED: authors prefer M1 *despite* M2 having better LPML, arguing from regressor significance — picking the worse-fitting model because you like its coefficients; no out-of-sample predictive scoring at all (LPML is in-sample) — `0594:30` + `0594:39` — VERIFIED
- FLAGGED: functional component collapses to a seasonal step function in practice (80-df spline support confines each basis to one season) — latent-factor machinery adds little beyond GARCH seasonal intercepts — (brief findings; ledger §7)

**0604 (Cricket GP career trajectories, ADAPT the framework)**
- LOOCV MSE: GP 544.0 vs SMA(10%) 633.1, SMA(25%) 588.4, SMA(50%) 608.2, SMA(100%) 589.1 — GP wins at all minimum-innings thresholds; SMA(10%) worst of all: "predicting a player's ability purely on recent scores is unwise" — `0604:37` — VERIFIED
- Average log Bayes factor GP vs constant-ability: 1.4 (−152,071.8 vs −153,473.4); individuals Kohli 6.9, Williamson 6.3 … Mathews −3.1 (constant model wins) — `0604:38` — VERIFIED
- Paper's own admission: ℓ and α posteriors barely move from priors — data cannot distinguish smooth vs ragged short-term trajectories — `0604` findings (brief) — VERIFIED (in-ledger; weakens any "form" interpretation)
- Opposition strength NOT modeled — acknowledged gap — (brief; ledger)
- Ledger gate: GP beats trailing-5-game and career averages by ≥5% pooled OOS MSE on 2023–2025, 68% intervals at 60–76% coverage — (brief §13; worker-proposed INFERENCE)

**0747 (Conformal HR–LR portfolio selection, ADAPT the CORRECTED rule only)**
- Results are FIGURES ONLY (cumulative-return plots) — no exact cumulative-return values, Sharpe ratios, or significance tests printed — `0747:26` — VERIFIED
- The "low risk = lowest lower bound r̲" ranking is conceptually odd (lower r̲ = worse worst-case) — possible sign error in the paper; GSE must re-derive, not copy — `0747:32` — VERIFIED
- Date inconsistency: 2009–2018 vs 2008–2019 stated in different sections; only 3 assets per market; transaction costs ignored; no coverage level α stated; exchangeability on financial returns is false — `0747:32` — VERIFIED
- Corrected HR–LR spec: K candidates → conformal intervals from backtest residuals → filter to m with HIGHEST lower bound (true low-risk) → pick max upper bound; A/B both orientations; adopt only if beats projection-max on 2024–2025 ROI with paired-test significance — `0747:38` + `0747:44` — VERIFIED (worker-proposed, INFERENCE)

**0769 (Causal-forest ingredient dissection, ADAPT)**
- RQ1 (cf vs mob): Setup A MSE ratio 0.663 (0.596, 0.738); Setup C (strong confounding) 0.148 (0.141, 0.156) — mob collapses; Setup B (randomized) 0.707 — `0769:30` — VERIFIED
- RQ4 (treatment centering alone, mob(Ŵ) vs mob): Setup A 0.392 (0.334, 0.461); Setup C 0.197 (0.190, 0.205) — ~5× MSE reduction from centering W alone; Setup B 1.000 (no confounding → no effect, as expected) — `0769:33` — VERIFIED
- Minimum viable version: skip outcome centering; center only the treatment indicator — captures most of the gain — `0769:48` — VERIFIED (in-ledger)
- Limitations: Gaussian additive benchmark only; no comparison to X-learners/BART/neural CATE; P ≤ 20, N ≤ 1600 — (brief; ledger)

**0791 (CRPS vs decision-optimal ensembles, ADAPT)**
- Statistically best ensemble (CRPS learning) has lowest CRPS (DM-significant) but LOWER trading profits than equal-weight qEns counterpart — `0791` findings (brief) — VERIFIED (in-ledger §5)
- All ensembles earn 80–96% of crystal-ball profits (crystal ball = 13,587 EUR; worst −21,425 EUR; naive fixed-hours = 8,048 EUR, 84% of max) — `0791:37` + `0791:42` — VERIFIED
- CRPS learning ≈ 500× slower than qEns (still <20 s on i7-9750H) — `0791:43` — VERIFIED
- CRPS learning much worse on the few lowest percentiles (the ones driving profitability during the COVID crash) — (brief; ledger §5)

**0813 (Kelly for M simultaneous games, ADAPT after generalizing to decimal odds)**
- f_K(p) = 2p−1; G_K(p) = ln 2 − S(p); p=0.6 → f_K = 0.2, compounded R_K = 2.0% (vs 20% naive expected return) — `0813:20` + `0813:35` — VERIFIED
- Finite memory: G(p,L) ≈ G_K(p) − 1/(2L); L_min ≈ 1/[2·G_K(p)]; p=0.51 → L ≥ 1,761; p=0.52 → L ≥ 438 — `0813:24` + `0813:37` — VERIFIED
- Below p ≈ 0.63, Kelly with estimated p can have NEGATIVE growth at finite memory — `0813:38` — the "≈0.63" threshold is the worker's INFERENCE from the paper's numerics (flagged INFERENCE in-ledger), not a theorem — treat as heuristic
- Assumes binary ±1 payoffs, independent identical games, constant p — correlations deferred — `0813` methods (brief) — VERIFIED (ledger §2); NFL slate bets are correlated, so Eq. 10 would over-bet without a haircut

**0834 (Maximin-drawdown portfolio, ADAPT as sizing-layer candidate)**
- 3-mo OOS (COVID window, train Feb–May 2020, test May–Aug 2020): MD (LP) 9.4% return, 2.3% daily SD, −3.3% max DD vs Markowitz 5.7%/1.7%/−6.1% — `0834:53` — VERIFIED
- Constrained MD (MILP): 8.5% return, −3.3% DD; solve 0.0001 s vs 0.02 s for QPs — claimed 200× faster — `0834:54` + `0834:56` — VERIFIED
- 2.8% covariance perturbation moved other models' allocations 38.1%–47.1% vs 3.7% for constrained MD — (brief findings; ledger §5)
- Single time-ordered split on one COVID-era window; author calls it "preliminary"; no transaction costs — (brief limitations; ledger §7)

**0844 (MLB scouting-text prospect model, ADAPT to NFL draft lane)**
- TextCNN 69.02% accuracy / 56.42% F1; BCN 73.52% accuracy / 43.33% F1 (overfit majority class); LSTM+Self-Attention 68.64/54.65 — `0844:45` + `0844:47` — VERIFIED
- Leakage: without masking, prospect surnames were top discriminative terms ("alford" 0/47 neg/pos) — 100% recall from names alone; names, teams, numeric quantities must be masked (NLTK) — `0844:21` — VERIFIED
- CNNs win because reports are hierarchical but unordered — self-contained fact sentences; local n-gram + pooling — (brief; ledger §6, INFERENCE by paper authors — plausible mechanism, not an ablation)

## Cross-file connections (with file refs)

**1. The full probability→selection→staking pipeline lives entirely in this chunk.** 0473 (MIS-regression interval heads on point projections) → 0747 (conformal intervals over candidate slates, corrected HR–LR: filter highest lower bound, pick max upper bound) → 0791 (ensemble weights optimized on the DECISION metric — CLV/P&L — not on CRPS, with naive equal-weight as the near-free baseline) → 0813 (multi-pick Kelly with Laplace-smoothed p̂, the L_min backtest-sample gate, and a correlation haircut) / 0834 (constrained maximin-drawdown portfolio as the covariance-free alternative). The chain is coherent end-to-end: honest intervals in, decision-weighted combination, estimation-error-gated sizing out. The weak link is 0747 (figures-only evidence, possible sign error — see Challenges).

**2. The calibration spine: four papers, one doctrine.** 0564 (√K law: equilibrium rating error budget; and "trust the transformed probabilities even when raw ratings look systematically biased") + 0503 (i.i.d. resampling lies: nominal 90% intervals cover at 0.60; game-clustered bootstrap restores honesty) + 0473 (MIS as the interval proper score; frequentist quantile/MIS heads for coverage, Bayesian posterior means for point forecasts) + 0791 (optimize combination weights on the decision metric, not the proper score). Unified message: the engine's product is calibrated probabilities with honest intervals; ratings, point estimates, and proper-score optima are intermediate quantities that must not be confused with the deliverable.

**3. The rating layer is a composable kit, not competing alternatives.** 0544 (phantom-player BT: early-season shrinkage with linear robust tails, interpretable q-calibration dial) + 0564 (√K error budget for K-factor scheduling + "trust probabilities over ratings" monitoring policy) + 0574 (KRC: cheap spectral weekly ratings with exact Sherman–Morrison O(n²) in-week rank-one updates) + 0554 (MFM archetype discovery: latent team/QB style regimes with posterior over K) + 0493 (long-history LSTM as stabilized fallback prior stacked with current-season specialists). These slot into different layers (regularization / error budgeting / cheap updates / regime structure / long memory) and can all coexist. One reinforcement: 0574's bandwidth result — season-length smoothing (h=1) wins, h=1.5 collapses — is a quantitative statement about how fast team quality moves, and it directly informs 0584's improvement experiment (regime-aware adaptive decay) and 0604's GP length-scale priors.

**4. Two complementary causal designs for the total-signal adjustment layer.** 0769 (between-game CATE: propensity-centered mob(Ŵ) recipe for rest/surface/coaching-change/lineup treatments on EPA/win/injury outcomes) + 0533 (within-game case-crossover: self-matched stoppage estimator for injury timeouts, weather delays, referee-crew stoppage burden on live spreads/totals). Both difference out the confounders the other can't: 0769 handles cross-game selection (why a team got extra rest), 0533 mechanically differences out match-level characteristics (teams, Elo, stadium, era collinear with the match fixed effect). Together they cover the map's gap #8 (weather-physics-for-totals) and the referee-crew totals work — correlation to quasi-causal.

**5. "The design of the resampling/centering drives the result, not the learner" — the meta-pattern of the chunk.** 0503 (resampling design restores coverage; the estimator is the same XGBoost throughout) + 0769 (centering the treatment indicator is what matters; implementation details cf vs mobcf near-identical) + 0791 (naive equal-weight beats 500×-more-expensive CRPS learning on the decision metric) + 0574 (KRC ≈ WMLE accuracy at far lower compute). INFERENCE: GSE's calibration/estimation effort should overweight design choices (cluster structure, centering, combination objective) and underweight learner sophistication. This is also the strongest "would I bet on it" filter in the chunk.

**6. The recency-overreaction indictment, three independent arrivals.** 0604 (SMA(10%) worst of all ability estimators — "predicting ability purely on recent scores is unwise") + 0564 (√K law: noisy high-K ratings deviate from skill; cut K 4× to halve steady-state error) + 0574 (h=1 season-length smoothing beats h=0.1 undersmoothing). All three say the same thing: trailing-window means and over-responsive ratings are the enemy of ability estimation. Directly indicts "last-5-games" props handicapping (per 0604's ledger §10).

**7. 0844's masking protocol generalizes beyond the draft lane.** The leakage study (100% recall from prospect names alone) is a standing rule for EVERY GSE text model: mask names/teams/numeric quantities or the model will learn identity→label shortcuts. This is the mandatory prerequisite for the map's gap #1 (trust-signal intake — social/video quote mining, press-conference extraction), which currently has zero in-slice coverage: when that lane gets built, 0844's protocol is its first engineering requirement. Also: 0844's "reports are hierarchical but unordered; CNN wins" is INFERENCE by the paper's authors, but the practical takeaway (local n-gram detection + pooling over prose) transfers to press-conference/quote mining where statements are similarly self-contained.

**8. 0483's standing gap is closed within this chunk.** The ledger noted "Kelly criterion, zero papers read" (0483:54); 0813 (exact multi-pick Kelly theory + finite-memory penalty), 0834 (maximin-drawdown alternative), and 0791 (decision-objective weighting) now fill that gap. 0483 itself remains correctly REJECTed — it is cited as decision-theoretic motivation only.

**9. The residual-correction pattern gets quantified support.** 0473's DeepGLEAM result (train the deep model on reported−GLEAM residuals: beats both the mechanistic baseline and the pure deep model, 1W RMSE 66.03 vs 73.59 vs 239.94) is empirical backing for the slice-level residual-correction architecture pattern (new signals enter as corrector features on frozen-engine residuals): the GSE analog is training residual models on (GSE engine − closing market).

**10. Reporting doctrine convergence.** 0523's only salvageable item (publish intervals and rank bands, not point ranks — all its numbers are self-labeled illustrative, so take only the discipline) resonates with 0503's mandate (surface WP point estimate ± cluster-bootstrap interval + the effective-sample-size diagnostic) and 0473's interval-score reporting (MIS, coverage, width). Cross-module contract implication: every probability producer ships (p, interval, coverage evidence).

**11. 0362 + 0513: the CV pair.** Both are vision papers; 0513 is REJECT (no GSE video pipeline, dated 2018 benchmark), 0362 is ADAPT-of-pattern (ambiguity/isolation gating + mc/mf conditions) as the identity-association layer of the labeling factory. Per AGENTS.md's standing video rule (real transformative footage; Richardson v. Townsquare: 2–4s clips, commentary-dominant), neither paper conflicts with nor supports the video op — the labeling factory is internal tooling, not published content. Notable: 0362's "uncontrolled mask use is harmful" (a1 IDF1 48.6→44.4) is the same "raw signal in, damage out" lesson as 0844's name leakage and 0473's i.i.d. bootstrap — unexamined automation of a plausible feature hurts.

**12. 0813's outsider-vs-insider threshold × 0791's equal-weight result.** 0813 proves diversification beats information over a wide range (Δ < (p−1/2)(√(2M)−1)); "the higher is p, the harder for the insider to outperform the outsider"). 0791 empirically shows naive equal-weighting beats statistically-optimal weighting on the decision metric. INFERENCE: both point at humility-as-a-feature — sophisticated weighting schemes (information, CRPS-optimization) routinely lose to broad, flat, diversified construction on realized objectives. This should temper any plan to heavily optimize ensemble weights on in-sample P&L without the walk-forward + DM-test discipline 0791 models.

## Challenges (weak claims, method problems, INFERENCE-marked speculation)

**C1. 0747 is the weakest empirical paper in the chunk and carries an ADAPT verdict it barely earns.** Figures-only results (no numbers, no Sharpe, no significance tests), a date inconsistency (2009–2018 vs 2008–2019), 3 assets per market (trivial diversification), ignored transaction costs, unstated coverage level α, and a probable sign error in the core rule ("lowest lower bound = low risk" selects the worst worst-cases). The honest reading: the paper is an idea sketch, and the ADAPT verdict attaches to the worker's CORRECTED rule, not the paper. Any build must A/B both orientations on real DK slates — the paper cannot be cited as evidence for the corrected rule either. INFERENCE: the "avoiding sharp drawdowns" visual claim is unverifiable.

**C2. 0493's 72.35% headline is built on sand.** No stated train/val/test split, sliding windows overlapping by 9,839 games (leakage risk if splits aren't strictly time-ordered), no significance tests, no hyperparameter tuning, and the Vegas-55% comparison is a false equivalence (flagged in-ledger). The paper is arXiv:2512.08591 — a December 2025 preprint; peer-review status unknown. The NFL transfer caveat is severe: 17-game seasons vs 82-game NBA seasons; an 8-"season" NFL window (~136 games/team) is a different information regime, and per-game NFL features are noisier. INFERENCE: the ≥0.005 holdout log-loss gate is doing all the real work in the ledger's proposal — the paper's number should carry zero weight in the adoption decision.

**C3. 0574's "beats Elo" is +0.27pp, one bandwidth, no CI.** KRC(h=1) 0.6382 vs Elo 0.6355 total, while feature-rich Elo won 2 of 3 seasons outright and h=1.5 collapses to 0.6173. This is bandwidth luck until proven otherwise on NFL walk-forward. The durable contributions are the method (spectral, no optimization; exact rank-one online updates) and the bandwidth finding (season-length memory), not the superiority claim.

**C4. 0564's theory is proved general but illustrated only at N=2.** The √K law is small-K only (numerics show linear growth away from 0), the KL<1 assumption bounds per-game swings in a way NFL margins of victory break, the bias analysis assumes random opponents not scheduled matchups, computing the actual bias E[X]−ρ is still open, and Proposition 12's unbiasedness requires correct model specification. The honest use: K-factor scheduling as an explicit error budget with an R²≥0.6 fit gate on 2015–2025 NFL data (ledger §13), not a theorem to be quoted at Garrett.

**C5. 0473's headline methods bake off is clean; the fine print erodes the "rule out" claims.** No significance tests on any table (SG-MCMC vs point-model MAE gaps could be noise); MC dropout's failure is at a weak config (5% rate, 50 passes) so "ruled out" may be a tuning artifact; the "deep learning fails under shift" claim is partly a straw man (COVID deep model had ~16 weeks of data); authors admit models are systematically overconfident (§6.3) — which cuts against using their intervals unadjusted. Adopt MIS as the score and the quantile/MIS-regression heads as candidates, but MC dropout deserves one fair retune before a permanent ban, and the DeepGLEAM 6.6%/17% gains must be re-derived on 2023–2025 NFL totals, not quoted.

**C6. 0503's numbers do not transfer to real NFL data.** The simulator is a toy (random-walk football, 3 state variables: time, field position, score differential); B=101 resamples is small for tail quantiles; true real-world WP is unobservable so NO numeric φ transfers. The transferable claim is the qualitative one (i.i.d. play-level resampling lies; resample games), plus φ-as-a-tuning-knob selected on 2020–2024 nflverse by empirical coverage-vs-width. Also: even at φ=0.35 the tails stay hard (~85% conditional coverage near WP 0.3/0.7) — tail uncertainty is the residual problem.

**C7. 0834's evidence is one COVID window.** Single 3-month time-ordered split, train during the Feb–May 2020 crash, no transaction costs, author calls it "preliminary." ~400 S&P 500 stocks' daily-return correlation structure is not NFL bet-outcome correlation; the "200× faster" claim is LP-vs-QP on a toy solve (0.0001s vs 0.02s — both trivial). The maximin objective is a legitimate alternative to Kelly for bankroll preservation, but it must walk-forward against fractional Kelly on actual 2024–2025 engine picks before any adoption claim.

**C8. 0544's "interpretable shrinkage dial" is two dials that disagree 100×.** Expert calibration δ=1/98 vs CV δ=1.2589 — the paper notes both without reconciling. The q-calibration formula is elegant (single observed win → future-win probability q) but if you tune by CV you get a δ two orders of magnitude larger, i.e., the "expert intuition" and the "data" tell opposite stories about how much to shrink. For GSE: choose the tuning philosophy explicitly; the elicited dial is communicable for published ratings content, the CV dial is for the engine. Do not present one number as both.

**C9. 0594: authors overrule their own model selection.** M2 (fixed age) has the best LPML (−45472 vs M1's −45943) but the authors prefer M1 because its regressors are significant — selecting the worse-fitting model on coefficient aesthetics, with NO out-of-sample scoring anywhere (LPML is in-sample). ESS values 160–190 for several parameters are thin. The functional/latent-factor machinery collapses to a seasonal step function in practice. What survives: the GARCH-on-seasonal-intercepts volatility-clustering idea for prop variance features — and even that needs LOO Δelpd > 2×se on nflverse before adoption.

**C10. 0604: the GP wins, but the fine print limits the "form" story.** ℓ and α posteriors barely move from priors — the data cannot distinguish smooth vs ragged short-term trajectories, so the "finding your feet" narrative is weaker than the headline; opposition strength is unmodeled (first-order gap for NFL); nested sampling is heavy at NFL scale (needs sparse/approximate GP). The durable, bettable finding is the negative one: SMA(10%) worst — recent-form averaging is the worst ability estimator, directly indicting trailing-5-game prop baselines.

**C11. 0584: the nesting breaks exactly where it matters.** The weaker team is modeled conditional on the stronger team's realized score, with A=stronger defined by Elo — but Elo misranks are exactly the upset cases where the conditional structure matters most. Weighting fixed by convention, not tuned (author admits non-weighting sometimes equal); no bookmaker-implied baseline (the honest comparator, excluded as "prospective"); Elo is the only quality covariate (no squad/market values). Transfer the machinery (nesting, weighting, in-simulation rating updates), not the soccer specifics; tune the half-life on NFL backtests; the ≥5% Brier gate vs the static sim is the real test.

**C12. 0769's "centering is what matters" is proven only in the Gaussian-additive sandbox.** Simulations cap at P=20, N=1600; no X-learner/BART/neural-CATE comparisons; propensity-estimation errors propagate into τ̂ (the recipe's step 1 is its own failure point — validate overlap/positivity or the centering is garbage-in). The minimum-viable mob(Ŵ) claim (treatment centering alone captures most of the gain) is an empirical regularity in 16 scenarios, not a theorem — the semi-synthetic short-rest/ATS benchmark gate is load-bearing.

**C13. 0533 provenance question (flagged in Verified claims).** 99 matches (67 group + 32 knockout) + 3 dropped = 102, vs the real 2026 World Cup's 104-match format (72 group + 32 knockout). The group-stage count (67/70) doesn't reconcile cleanly with 72. Possible: subset analysis, venue exclusions, or format miscount — UNVERIFIED. Does not affect the design transfer (case-crossover is the takeaway; the momentum null is the least interesting part), but do not cite the paper's dataset as ground truth without checking its data appendix. Also: it's a soccer paper; the NFL port needs its own placebo battery (ledger §12) before any live-spread use.

**C14. REJECTs, for the record.** 0453: internally inconsistent improvement claims (11% vs 15–20% vs 42%), no data, no code — a notation exercise. 0463: the 100% headline requires auxiliary labels that hand over the factorization; without them 69.5% train — circular. 0513: split protocol unstated (leak risk within the 20-game clip pool); 2018-era benchmark anyway. 0523: every number self-labeled illustrative — correctly REJECTed; take only the reporting discipline. 0483: zero empirical content; correctly REJECTed as method, keep as citation-motivation.

**C15. INFERENCE — ledger-level verification ceiling.** All 22 verifications are against the program's ledger files, which are themselves secondary sources (worker-written deep reads). I did not open a single arXiv PDF. The numbers are verified to be *in the ledger*, and the ledgers are high-quality (they include adversarial sections), but ledger transcription errors or worker overclaims would propagate. Any number that becomes a hard engine constant (e.g., 0813's L_min table, 0503's coverage table) should be re-verified against the primary paper before it gates money.

**C16. INFERENCE — preprint recency.** Several papers are very recent/future-dated preprints (arXiv IDs 2506, 2512, 2606, 2607, 2609 — the program read them pre- or peri-publication). Peer-review status is unknown; treat as working papers, not settled results. The ones with the strongest internal adversarial sections (0503, 0564, 0473) are the most trustworthy; the ones with the thinnest (0747, 0493) are the least.

## Buildable systems (component name, inputs→method→output, acceptance gate)

**S1. MIS-95 interval engine (0473).** Inputs: engine point projections for totals/props + backtest residual history. Method: MIS-regression head (eq. 7, ρ=0.05) and/or pinball quantile heads (0.025/0.5/0.975); SQ monotone-spline head if multi-quantile bands ship (fixes crossing). Output: 95% interval bands + MIS score + empirical coverage/width report. Gate: on 2025 NFL test season, MIS-regression/quantile interval beats current fixed-band practice by ≥10% in MIS with coverage in [0.93, 0.97]; else reject (ledger §13).

**S2. Game-clustered WP uncertainty (0503).** Inputs: nflverse play-level features + existing WP model. Method: replace any i.i.d. play-level bootstrap/subsampling with fractional randomized-cluster bootstrap; φ tuned walk-forward on 2020–2024 nflverse by empirical coverage-vs-width (never hard-code 0.35). Output: WP point estimate ± honest interval wherever probabilities ship + effective-sample-size-ratio diagnostic in the model card. Gate: empirical coverage within ±3pp of nominal at 90% on held-out seasons.

**S3. Rating stack v2 (0544 + 0564 + 0574 + 0554 + 0493).** Inputs: nflverse game results, team-week feature panel, long-history team-game features. Methods: (a) phantom-player-regularized weekly BT (zero-strength phantom, ρ tuned by leave-one-week-out CV) for early-season stabilization; (b) √K error budget formalizing K-factor scheduling, rolling rating-dispersion ≈ Ĉ√K monitor for structural breaks; (c) KRC module (Gaussian kernel, bandwidth tuned walk-forward ~1-season effective memory) with Algorithm 2 O(n²) Sherman–Morrison rank-one in-week updates; (d) MFM archetype discovery on team-week panel → regime features/priors in matchup model; (e) 2-layer LSTM/GRU long-history fallback prior stacked as an ensemble feature. Output: weekly power ratings + regime labels + stabilized prior. Gates: (a) ≥17 of 24 weekly log-loss windows vs ordinary BT; (b) R² ≥ 0.6 on √K dispersion fit 2015–2025; (c) ≥1.0pp pooled winner accuracy vs existing dynamic rating; (d) half-season ARI ≥ 0.6 + walk-forward ATS log-loss gain ≥ 0.003; (e) stacked model 2023–2024 holdout log-loss beats no-prior baseline by ≥0.005.

**S4. Staking pipeline (0791 → 0747 → 0813 / 0834).** Inputs: engine spread/total distributions + market-implied distributions + backtested CLV. Methods: (a) ensemble weights optimized on backtested CLV/P&L, not CRPS — equal-weight horizontal quantile averaging is the mandatory baseline; (b) corrected HR–LR slate selection: K candidates → conformal intervals from backtest residuals → filter to m with HIGHEST lower bound (fixing 0747's sign error; A/B the as-written orientation too) → pick max upper bound; (c) δ/σ gate (per slice map #15: stake only if perceived edge > 1.5σ estimation RMSE) + generalized multi-pick Kelly (decimal odds) with Laplace-smoothed p̂, L_min backtest-sample gate (L ≥ 1/[2·G_K(p)]), and correlation haircut for correlated slate bets; (d) constrained maximin-drawdown MILP portfolio constructor as the covariance-free alternative. Output: sized bet slate + drawdown report. Gates: (c)/(d) walk-forward on 2024–2025 engine picks vs flat stakes and fractional Kelly — adopt if max drawdown ≥20% lower at equal-or-better ROI; (b) beats projection-max selection on 2024–2025 ROI with paired-test significance.

**S5. Nested in-simulation playoff engine (0584).** Inputs: 2009–present game data, GSE team-strength ratings, rest differentials, home/neutral. Method: nested offense/defense score regression (normal/negative-binomial on NFL points — NOT ZIGP; averaged both-ways: A's offense vs B's defense and vice versa) on date+importance-weighted history (half-life H tuned on backtests, not fixed at 3 years; consider regime-aware adaptive decay shortening H after coaching/QB changes), then 100k bracket replications with team strength updated INSIDE each replication. Output: stage probabilities (wild card → Super Bowl). Gate: across postseasons 2020–2024, mean Brier beats current static-strength sim by ≥5% AND beats/ties futures-implied RPS in ≥4 of 5 postseasons.

**S6. CATE causal-question recipe (0769).** Inputs: binary treatment (short rest, turf, new play-caller, starter benched) + outcome (EPA/play, win, injury counts) + game/player covariates. Method: default mob(Ŵ) — propensity forest π̂(x), optional marginal-mean forest m̂(x), model-based forest on E[Y|x,t] = m̂(x) + τ(x)(t−π̂(x)) with simultaneous prognostic+predictive splits; treatment centering mandatory, outcome centering only if propensity estimation is clean (validated overlap/positivity); Poisson-forest extension for count outcomes. Output: heterogeneous treatment-effect estimates τ̂(x) with CIs. Gate: semi-synthetic short-rest/ATS benchmark on 2020–2024 NFL games — adopt custom implementation only if MSE(τ̂) ≤ 1.2× grf parity and ≥2× better than uncentered mob.

**S7. Case-crossover stoppage estimator (0533).** Inputs: nflverse pbp 2020–2025; stoppage events (weather delay ≥15 min, injury timeout ≥4 min); controls = non-stoppage 6-drive sequences from the same game matched on quarter + score margin + pre-window EPA/drive slope. Method: within-game fixed-effects design (game FE + quadratic game-time trend + pre-window level/slope + score margin + stoppage indicator); placebo battery at random non-stoppage windows; falsification via 0533's play-aligned vs clock-aligned dual counterfactual. Output: quasi-causal ATT of stoppages on live spreads/totals; upgrades referee-crew stoppage-burden and heat-policy totals work from correlation to causal. Gate: placebo bias |naive before/after| > 2× |case-crossover| AND real-stoppage ATT 95% CI has correct coverage in a permutation null.

**S8. Career GP ability curves (0604).** Inputs: nflverse 2015–2025 skill-player game logs (≥30 career games). Method: y_t = ν(t)·(opponent adjustment)·(home/dome multipliers) + noise; log ν(t) ~ powered-exponential GP over career-game index, position-pooled ℓ/α; joint player–opponent extension (paper's acknowledged gap — first-order for NFL). Output: current underlying ability ν(now) with credible intervals; "washed" probability P(ν(t) < replacement); season-long prop baselines. Gate: GP beats trailing-5-game and career averages by ≥5% pooled OOS MSE on 2023–2025, 68% intervals at 60–76% coverage. Hard rule from the paper: never baseline a prop on trailing-5-game means (SMA(10%) worst in LOOCV).

**S9. GARCH volatility feature for props (0594).** Inputs: nflverse weekly player stats 2018–2025. Method: per-player season random intercepts with GARCH(1,1) errors vs homoskedastic; estimated conditional variance h as a "consistency/boom-bust" feature in prop models. Output: volatility feature + volatility-sorted hit-rate differential vs season prop lines. Gate: LOO/WAIC Δelpd > 2×se for GARCH vs homoskedastic AND volatility feature improves prop hit-rate log-loss ≥0.3% on 2024–2025 holdout. (Skip the paper's spline/latent-factor machinery — it collapsed to a step function.)

**S10. Draft-prospect text lane (0844).** Inputs: masked NFL draft-prospect prose (NFL.com/PFF/The Athletic, 2018–2024 classes). Method: NLTK entity masking of names/teams/numeric quantities (MANDATORY — 100% recall from names alone without it) → TextCNN/HAN benchmarks → starter-by-year-3 classifier; discriminative phrases as dynasty/rookie-model features. Output: prospect text score + phrase features. Gate: masked-text AUC beats draft-position-only AUC by ≥0.03 on a held-out class. Standing rule: the masking protocol applies to every future GSE text model, including the trust-signal lane.

**S11. Residual-vs-market learner (0473 DeepGLEAM analog).** Inputs: (GSE engine projection − closing market line) for totals. Method: train the ML model on the residual vs the mechanistic/market baseline, with quantile heads. Output: residual correction + interval. Gate: validate the paper's claimed 6.6–17% gains on 2023–2025 NFL holdout; reject if it adds nothing over residual bands (consistent with the paper's own overconfidence finding).

**S12. Labeling-factory gating layer (0362).** Inputs: NFL all-22-style footage. Method: reimplement the ambiguity/isolation gating + mc/mf conditions with a lighter segmentation backbone (SAM 2 tiny / YOLO-seg) or offline batch processing — keep gating verbatim, replace the heavy SAM+Cutie stack. Output: stable tracklets → pose/trajectory features for QB-behavior/scheme extraction. Gate: ≥30% ID-switch reduction on NFL footage, especially goal-line pile plays (brief §13). Note: internal tooling; no NGS data touches public surfaces per the internal-only doctrine.

## Integration notes

**Unified intelligence API — module ordering and contracts.** This chunk is mostly the quant plumbing that QB-behavior/coaching/scheme intelligence feeds into. Proposed call order for a unified `intelligence.predict(game)`:
1. **Rating layer** (S3: phantom-BT early season → KRC weekly updates → √K error-budget monitoring) → team strength with honest uncertainty. As-of quarantine (slice map #19): every rating update carries `observed_at`; no post-settlement backfill.
2. **Regime layer** (S3d: MFM archetypes) → style-regime conditioning of strength and matchup features. Regime breaks (coaching/QB changes) shorten the recency half-life in S5 — the 0584 improvement experiment.
3. **Causal adjustment layer** (S6 between-game CATE for rest/surface/coaching effects + S7 within-game case-crossover for stoppages/weather) → context adjustments as corrector features on frozen-engine residuals (the residual-correction architecture: new signals never enter as raw engine inputs).
4. **Player ability layer** (S8 career GP + S9 GARCH volatility) → QB/skill-player current-ability baselines and boom-bust flags for props.
5. **Interval engine** (S1 MIS heads + S2 game-clustered bootstrap) → every probability ships as (p, interval, coverage-evidence). ONE resampling standard across modules: game-clustered (0503); naive i.i.d. bootstrap retired everywhere (0473 concurs).
6. **Decision layer** (S4: CLV-optimized ensemble weights → corrected HR-LR slate selection → δ/σ gate + multi-pick Kelly with L_min gate and correlation haircut, or maximin-drawdown alternative) → sized slate.

**Cross-module data shapes.** The reporting-doctrine convergence (0503 + 0473 + 0523's salvageable item) implies a contract: every probability producer returns `{p, lower, upper, nominal_coverage, empirical_coverage, effective_sample_ratio}`. No module consumes a bare point estimate from another module. The δ/σ gate (slice map #15) sits at the decision layer boundary: perceived edge must exceed 1.5× probability-estimation RMSE before any stake.

**Scoring-rule discipline across the stack.** 0791's result (statistically-best ensemble earns less) is the architectural principle: proper scores (CRPS, log-loss, Brier) gate the *probability heads*; decision metrics (CLV, P&L, ROI) gate the *combination and sizing layers*. Never optimize ensemble weights on a proper score and expect profit. The slice-level Kelly chain (0791 → 0813 → 0834 → 1748 → 1463) is intact in this chunk through its first three links — all three verified present and mutually consistent.

**Ordering dependencies with the intelligence lanes (OL → scheme → QB).** This chunk's plumbing imposes one hard dependency: the causal adjustment layer (S6/S7) and the regime layer (S3d) must run BEFORE QB-behavioral features are interpreted — 0564's bias result (raw ratings systematically biased, transformed probabilities unbiased) and 0533's design (match fixed effects absorb team quality) both warn that behavioral signals read off unadjusted ratings inherit the rating layer's bias. Practically: QB pressure-sensitivity features (the slice's #1 data gap) get conditioned on regime + causal adjustments, not on raw team strength.

**What this chunk does NOT cover (confirming the map's gaps).** Trust-signal intake: zero in-chunk coverage (0844's masking protocol is the prerequisite tool, not the lane). Coaching-tendency time series: absent (0554's archetypes are the closest — static clusters, no coach-level playcalling fingerprints). Clean-vs-pressured QB splits: absent (the stated #1 data gap stands). OL beyond injuries: absent. Man/zone coverage data: absent.

**For the parent — chunk-level judgment.** The highest signal-per-page papers: 0503 (immediately actionable, honest caveats), 0564 (two engineering rules from real theory), 0769 (a recipe, not a model — the most buildable kind of paper), 0791 (decision-objective weighting — the doctrine paper). The papers needing the most skepticism at build time: 0747 (sign error, figures only), 0493 (no split protocol), 0834 (one COVID window), 0533 (dataset provenance question). The REJECTs are correctly rejected and need no further work. One process note: 30 concurrent wave-0 readers hit 429s; this chunk's dense-wave ceiling (≤6 concurrent) is confirmed working — keep it.

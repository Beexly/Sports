# Deep analysis r01 — c09-r00,r01,r02,r04,r05,r06

**Scope:** 52 briefs. Wave-0 dirs c09-r00 (12 briefs) and c09-r04 (8 arXiv ledgers) read in place. c09-r01, r02, r05, r06 directories are empty on disk (their wave-0 readers 429-errored) — their files were re-covered by the dense wave and I read those briefs in c09-d00/d01 (r01), c09-d02/d03/d04 (r02), c09-d06/d07/d08 (r05), c09-d08/d09/d10 (r06). All 32 wave-0 source files verified covered; 0 unmatched.

**Method:** every headline number/stat/verdict below was re-checked against the source ledger in `~/workspace/vendor/Sports/docs/` (read-only). Line numbers are `grep -n` positions in those source files. Where a brief's claim did not survive the check, it is FLAGGED with the reason. Every inference I add is marked INFERENCE.

---

## Verified claims (claim — `source:line` — VERIFIED or FLAGGED with reason)

### EHCP — QB decision-quality metric (0402, arXiv:1910.12337)
- BART completion model beats Bayesian logistic on all three metrics: MSE 0.086 (0.004), misclass 0.113 (0.005), log-loss 0.289 (0.011) — `0402-expected-hypothetical-completion-probability.md:40` — VERIFIED.
- % throws to max-EHCP receiver: Winston 26.8% (min-EHCP 16.8%), Siemian 26.2%/16.9%, Goff 24.8%/19.2%; lowest Wilson 13.2%/23.5%, Carr 15.1%/27.5%, Wentz 15.3%/27.5% (min 100 passes, "illustrative only") — `0402-expected-hypothetical-completion-probability.md:44` — VERIFIED.
- Receiver credit/blame (EHCP − fitted completion prob): Tate +11.8pp (64.9%/76.7%), Bryant −18.4 (60.9%/42.5%), Hopkins −17.8, Allen −10.6 — `0402-expected-hypothetical-completion-probability.md:45` — VERIFIED.
- Variable importance: receiver speed at catch attempt 20.74%; receiver–ball distance at catch 17.29%; separation at throw 0.08%; speed snap→throw 0.27% (negligible) — brief numbers; ledger detail consistent at :40–45 region — VERIFIED (ledger §5 read).
- Reader's limitations are in-ledger: random (not time-ordered) splits leak future games; crude marginal imputation of x*_miss; no QB-pressure features; training only on thrown passes (selection bias) — VERIFIED as ledger-stated caveats.

### Game-clustered bootstrap (0503, Brill/Yurko/Wyner)
- Effective sample: 4,101 games → 2,291 independent-play equivalents (56%) — `0503-exploring-the-difficulty-of-estimating-win.md:38` — VERIFIED.
- Nominal 90% bootstrap intervals: standard i.i.d. coverage 0.60 ± 0.01 (width 0.027); fractional randomized-cluster φ=0.35 reaches 0.90 ± 0.01 (width 0.063) — `0503-...md:43,51` — VERIFIED.
- Coverage bought with 2.3× width inflation (0.063 vs 0.027); tails still hard (~85% conditional coverage near WP 0.3/0.7 even at φ=0.35) — `0503-...md:53,62` — VERIFIED.
- Do-NOT-hard-code φ=0.35 directive (true WP unobservable; tune φ on nflverse 2020–2024 by empirical coverage vs width) — `0503-...md:71` — VERIFIED.

### Calibration-over-accuracy doctrine (0176 Constantinou; 0282 review)
- 0176 headline: maximum odds increase profits 42%–296% over average odds; 1X2 profit max at static θ=8% (814 bets, £44.7, ROI 5.49%) avg odds / θ=9% (1,049 bets, £177.18, ROI 16.89%) max odds; ROI max at θ=18% (37 bets, 23.59%) avg — `0176-investigating-the-efficiency-of-the.md:39,42` — VERIFIED as the paper's reported numbers.
- 0176 optimal λ=0.018, γ=0.7, k=3; mean goal-difference error 1.2283 — ledger §3 (verified in-file; extraction garbling noted in ledger prose, structure confirmed).
- 0176 portable conclusion (vi): per-season ROI optimization hurts long-term ROI; per-season profit optimization guarantees maximal total profit — `0176-...md:42` — VERIFIED as paper claim.
- Walsh & Joshi 2024 "+69.86% higher average returns" for calibration-optimized models — `0282-a-systematic-review-of-machine-learning.md:30` — **FLAGGED**: the same ledger explicitly downgrades it at :50 ("pointers to primary papers that should be read in depth, not conclusions to act on") and :66 ("has never been validated on NFL data in-repo"). It is a second-hand survey claim from a review that also flags its own publication bias. Do NOT treat as established evidence; the +69.86% figure is unvalidated in-repo.
- 0282 Stübinger 1.58% per match (47,856 matches) / RF 5.42% per match (8,082 matches); Patel 2023 NFL spreads XGBoost 58.5% CV / 53.65% on 2021; Szalkowski & Nelson 2012 home underdogs 53.5% ATS (2,560 games 2002–2011); Ötting 2021 HMM play-call 71.5% OOS (Patriots 77.9%, Seahawks 60.2%) — `0282-...md:32` region — VERIFIED as survey-reported (not GSE-replicated).

### Multivariate GLMM team strength (0433, Broatch & Karl)
- Joint (YPP+win) beats binary-only on win log-loss ALL years 2005–2013; sacks+win likewise every year; fumbles+win null every year (deliberate irrelevant-response control) — `0433-multivariate-generalized-linear-mixed-models-for.md` §findings — VERIFIED.
- 2012 Alabama–Notre Dame demo: joint model gave Notre Dame 22.2% win prob (correct direction), binary-only said 62.5% and was wrong — `0433-...md:42` — VERIFIED.
- 2005 random-effect correlations: YPP corr(off,win)=0.85, corr(def,win)=0.82, corr(off,def)=0.50; scores corr(off,win)=0.94, corr(def,win)=0.90, corr(off,def)=0.71 — ledger §findings — VERIFIED.
- Ledger's limitations: game-level (not temporal) CV folds leak in-season info; multiple comparisons uncorrected; score+win Hessian near-singular — VERIFIED as ledger-stated.

### flexBART categorical encoding (0232, Deshpande 2023)
- Pitch framing misclassification: flexBART 8.6% vs targetBART 8.8% vs one-hot BART 18.4% vs Deshpande & Wyner 2017 hierarchical 10.6%; p = 4.5×10⁻²⁶ (vs BART), 2.7×10⁻²² (vs targetBART); runtime 48 min vs 2 hours per 2,000 MCMC samples — `0232-flexbart-flexible-bayesian-regression-trees-with.md:47,53` — VERIFIED.
- One-hot encoding of a K-level categorical yields only 2^K−K reachable partitions vs Bell number (K=10: 1,014 of 115,975, under 1%) — `0232-...md` §methods — VERIFIED.
- Benchmarks: better on 12/16 datasets, significant on 10 after Bonferroni; WORSE on DGP2 (singleton-outlier partition — balanced-partition bias bites) — `0232-...md` §findings — VERIFIED (the DGP2 failure is a real limitation for singleton-outlier QBs/coaches).

### Play-calling game theory (0222, CAMS)
- Hexner 10-stage: CAMS estimates reveal time t_r = 0.60s ± 0.06s vs ground truth 0.5s; multigrid speedups 4 steps 9.3→2.32 hrs; 10 steps 27.6→10.9 hrs; 16 steps 46.21→17.83 hrs — `0222-solving-football-by-exploiting-equilibrium-structure.md:50,51` — VERIFIED.
- Beer-quiche equilibrium: at p_T=1/3, Pr(u=Q|T)=0, Pr(u=Q|W)=3/4 — ledger §findings — VERIFIED.
- Core portable theorem: informed player's equilibrium is at most I-atomic (I = private types), independent of action-space cardinality — VERIFIED as paper result.

### Nested conditional scoring (0242 EURO; 0584 World Cup, Gilch)
- 0242 EURO 2016 retrospective: ZIGP vs Nested Poisson — MDL 22 vs 26; Brier 17.52441 vs 18.68; RPS 5.280199 vs 5.36 — `0242-uefa-euro-2020-forecast-via-nested.md:43` — VERIFIED.
- 0242 EURO 2020 forecast (100k sims): Belgium 18.4%, France 15.4%, Italy 4.8% (actual winner — the model's long shot) — `0242-...md:44` — VERIFIED.
- 0584 tournament backtests (Brier/RPS, ZIGP vs bivariate Poisson vs independent): WC 2010 17.79/4.93 vs 17.97/4.99 vs 17.97/5.05; WC 2014 20.18/5.06 vs 22.33/5.52 vs 22.10/5.48; EURO 2016 17.52/5.28 vs 23.27/5.97 vs 23.25/5.98; EURO 2020 14.54/5.06 vs 14.36/5.07 vs 16.37/5.19 (tie); WC 2018 ZIGP WORSE (Germany stale-form lock-in) — `0584-nested-zero-inflated-generalized-poisson-regression.md:33–37` — VERIFIED.

### Sarmanov/Dixon–Coles generalization (0392)
- Dixon–Coles is a Sarmanov member (q_dc characterization) — `0392-extending-the-dixon-and-coles-model.md` §methods — VERIFIED.
- Home–away goal correlations: England −0.269, Germany −0.352, France −0.395, Spain −0.263; classical DC correlation floor −0.08 (at λ=1.3/1.2) — `0392-...md:12,45` — VERIFIED.
- NB marginals beat Poisson on AIC for every league (Spain: double NB 14,953.09 vs double Poisson 15,432.49); ANS AIC-preferred in baseline fits for all four leagues (England 4332.66, Germany 8164.33, France 8343.46, Spain 14787.05); German 2021/22 demo: 1,000 MC completions, 95% intervals contained all teams' final points — `0392-...md:13,42` — VERIFIED.

### Phantom-player / pseudo-game BT regularization (0544, Glickman)
- CV-selected (MLB 2025, 2,430 games): ridge λ=0.01; pseudo-game δ=1.2589; phantom-player ρ=40 (≈80 effective phantom games vs zero-strength team) — `0544-regularization-in-paired-comparison-models-via.md:42` — VERIFIED.
- Brewers log-ability: BT 0.386 → ridge 0.240 / pseudo-game 0.263 / phantom 0.258; implied neutral-field Milwaukee win prob 0.797 → 0.708 (phantom) — `0544-...md:43,44` — VERIFIED.
- Expert-calibration δ=1/98≈0.0102 (q=0.99) vs CV δ=1.2589 disagree sharply — paper notes both, unreconciled — `0544-...md` §findings — VERIFIED.

### Elo theory (0564, Cortez & Tossounian)
- Equilibrium rating error bound E[(1/N)|X−ρ|_1] ≤ C√K (C independent of K); E[b(2X)] = b(2ρ) exactly (Proposition 12) — `0564-convergence-and-stationary-distribution-of-elo.md:39,51` — VERIFIED.
- Bias direction: ratings overestimate positive skill, underestimate negative (observed K=1); the √K law is small-K only (grows linearly away from 0) — `0564-...md:39` — VERIFIED.

### Kernel Rank Centrality (0574)
- NBA forecasting accuracy, total across 3 seasons: KRC(h=1) 0.6382 vs Elo 0.6355 (+0.27pp); h=1.5 collapses to 0.6173; static RC worst in all seasons — `0574-a-spectral-approach-for-the-dynamic.md:44,45` — VERIFIED.
- The ledger's own adversarial note: +0.27pp is one bandwidth's margin with no CI; feature-rich Elo beat featureless KRC in 2 of 3 seasons — `0574-...md:54` — VERIFIED (this is the thin-margin challenge, ledger-stated).

### Uncertainty quantification benchmark (0473, Wu et al. KDD'21)
- MIS regression formula: L_MIS = (u−l) + (2/ρ)(y−u)1{y>u} + (2/ρ)(l−y)1{y<l} + |y−f|; argmin gives (1−ρ) CI — ledger §methods — VERIFIED.
- PM2.5 48h: MAE SG-MCMC 24.73 (best) vs Point 26.77; MIS: MIS-reg 179.96 (best) vs MC dropout 881.05 (worst, width 9.16 too narrow) — `0473-quantifying-uncertainty-in-deep-spatiotemporal-forecasting.md:26` — VERIFIED.
- DeepGLEAM hybrid Table 3: 1W RMSE 66.03 vs GLEAM 73.59 vs pure Deep 239.94 — `0473-...md:26` — VERIFIED. (Paper's prose claims "6.6% improvement at 1W and 17% average" — arithmetic from the table gives (73.59−66.03)/73.59 ≈ 10.3% at 1W; the prose percentage doesn't match the table. FLAGGED as minor paper-vs-table arithmetic tension, not ledger error.)
- "MC dropout and naive bootstrap effectively ruled out" — VERIFIED as paper conclusion.

### Causal mediation (0272, Díaz & Hejazi / medshift)
- Simulation n-scaled MSE (n=400→6400): substitution 0.083→0.075; efficient 0.092→0.065; efficient (G misspecified) 0.436→4.519 (grows with n — asymptotic bias, fatal) — `0272-causal-mediation-analysis-for-stochastic-interventions.md:41` — VERIFIED.
- Grenada application (IPS δ=2): direct 0.011 [−0.458, 0.479]; indirect −0.157 [−0.672, 0.357] — null — ledger §findings — VERIFIED.
- Multiple robustness: exponential tilt NOT robust to g misspecification — VERIFIED.

### Hydration-break case-crossover (0533)
- Main momentum effect: within-match +0.26 [−2.50, +3.02] clock-aligned; −0.63 [−3.63, +2.37] play-aligned; external matched −1.57 [−5.00, +1.87] — `0533-do-inmatch-hydration-breaks-alter-match.md:37` — VERIFIED. All cross zero: the headline is a null.
- Break×Elo/100: +1.59 (SE 0.80) — only statistically significant interaction; break×lead ≈ −0.90/goal averaged — `0533-...md:39` — VERIFIED.
- Net xG effect ≈ zero: −0.001 [−0.051, +0.049] clock-aligned — ledger §findings — VERIFIED.
- Sensitivity: main effect β moves +1.1 → −5.1 with referent-band relocation (fragile) — ledger §findings — VERIFIED (fragility challenge, ledger-stated).

### GLMF sparse matchup imputation (0068)
- 2017 MLB: 262,128 possible matchups, 62,528 observed (~24%), i.e., 76% never observed; ~12,506 per test fold — `0068-predicting-batting-averages-in-specific-matchups.md:8,12` — VERIFIED.
- 5-fold CV rank-3: RMSE GLMF 0.342 vs LMF 0.351 vs LPCA 0.344 vs PCA 0.358 vs Log5 0.345 vs Mean 0.344; log-likelihood −0.854 vs −0.899 vs −0.864 vs −0.952 vs −0.870 vs −0.864 — `0068-...md:47` — VERIFIED.
- Margins thin: GLMF 0.342/−0.854 barely beats naive mean 0.344/−0.864 — `0068-...md:60` — VERIFIED (ledger's honest caveat).
- Paper's printed IRLS equations garbled in PDF extraction — ledger marks UNCERTAIN, points to Li & Gaynanova (2018) — VERIFIED as ledger-stated.

### Injury regime-change study (0098, Binney et al.)
- Football Outsiders database 2007–2016: 19,803 player-seasons, 22,331 injuries — `0098-nfl-injuries-before-and-after-the.md:11` — VERIFIED.
- Game-loss injuries 701 (2007) → 804 (2016), +15%; conditioning 197 (2007) → 271 (2011), +38%, plateau 220–240/season; non-conditioning −37% first 3 CBA years — `0098-...md:41` — VERIFIED.
- Table 2 rate ratios: All — CBA 0.93 (0.83–1.03), pre trend 1.03 (1.00–1.07), post trend 1.03 (1.01–1.04); Conditioning CBA 1.05 (0.87–1.27) ns — `0098-...md:42` — VERIFIED. Conclusion: no sustained CBA-driven increase; headline null depends on continued-trend counterfactual (concurrent rule changes confound) — VERIFIED as ledger-stated.

### Katz/TDA tennis (0015)
- Katz CV (2000–2022): acc 0.6461 ± 0.0131, AUC 0.6911 ± 0.0159, log-loss 0.6494; test 2023–2025 (19,262 sets): acc 0.6248, AUC 0.6659 — `0015-topological-data-analysis-and-graph-theoretic-tennis.md:31` — VERIFIED.
- TDA adds ≈0.2pp at ~242h compute (13.18 s/match) — `0015-...md:32,38` — VERIFIED (negative result, ledger-stated).

### GP career trajectories (0604)
- LOOCV MSE: GP 544.0 vs SMA(10%) 633.1, SMA(25%) 588.4, SMA(50%) 608.2, SMA(100%) 589.1 — `0604-finding-your-feet-a-gaussian-process.md:37` — VERIFIED.
- Average log Bayes factor 1.4 (−152,071.8 vs −153,473.4); Williamson deep-dive λ=56.6, σ=0.27, ℓ=36.7, α=1.50 — `0604-...md:38,39` — VERIFIED.
- Home averages ~17% higher than away; first innings ~20% higher than second; ℓ and α posteriors barely move from priors (data can't distinguish smooth vs ragged short-term trajectories) — `0604-...md:12,49` — VERIFIED.
- Opposition strength NOT modeled (paper's acknowledged gap) — VERIFIED.

### GARCH on seasonal intercepts (0594)
- LPML: M1 (GARCH) −45943; M1^(2) vague −46573; M2 (fixed age) −45472 (best); M3 (AR seasonal) −46544; M4 (120 df) −46314; M5 (doping) −48565; M6 −48122 — `0594-bayesian-garch-modeling-of-functional-sports.md` §findings (LPML list verified; β posteriors at :31) — VERIFIED.
- M1 posteriors: β1 (sex) −0.120 [−0.175, −0.0675]; β2 (age) 6.22e-3 [4.20e-3, 8.20e-3]; β3 (environment) 0.0453 [0.0269, 0.0643]; all 95% intervals exclude zero — `0594-...md:31` — VERIFIED.
- FLAGGED (ledger-stated): authors prefer M1 even though M2 has the best LPML (−45472 vs −45943) — model-selection-by-narrative; no out-of-sample predictive scoring (LPML is in-sample); functional component collapses to seasonal step function (latent-factor machinery adds little).

### NBA PCA / SDI comps (0413)
- 4 PCs retain 68% variance (PC1 42%, PC2 12%, PC3 9%, PC4 4%); win% regression R² = 0.59; PC2 0.17 (p=0.005), PC3 −0.20 (p<0.001), PC4 0.09 (p=0.013); PC1 (raw usage) not significant — `0413-a-scalable-framework-for-nba-player.md:36,37` — VERIFIED.
- FLAGGED (ledger-stated): R²=0.59 is purely in-sample on 30 teams with 4 predictors — no holdout; 32% variance discarded; season aggregates hide role changes.

### MFM archetype discovery (0554)
- Simulation K=3, n=100, p=10: MFM-PGM Prob 1.00 (0.00), ARI 0.7383 (0.2127), RMSE 4.2462 vs PLE Prob 0.00/ARI 0.0779; mclust-on-latent-continuous Prob 0.97/ARI 0.9593 (matches the latent-oracle) — `0554-learning-heterogeneous-ordinal-graphical-models-via.md:28` — VERIFIED.
- NBA case: 3 groups — 411 "Established Stars", 112 "Role Players", 13 "Adaptive Tactical Hubs" (LeBron, Giannis, Kyle Anderson; avg betweenness 17.60) — `0554-...md:28` — VERIFIED.

### Strain-of-success injury optimizer (0423)
- Injury model log-loss 0.1676 ± 0.0005 vs heuristic 0.1700 ± 0.0002; base rate ~4% — `0423-the-strain-of-success-a-predictive.md:31` — VERIFIED (margin is 0.0024 — thin; see Challenges).
- Squad injuries −5%; top-11 injuries −13%; expected-points variance −17%; expected points MCTS vs greedy −0.1% ± 0.3 (null); Pearson r=0.77 for predicted vs actual team injuries — `0423-...md:34,35` — VERIFIED.
- Financial: 11% lower injured-player wage waste, ~£700,000/club (Man United £1.88m, Man City £1.80m) — `0423-...md:36` — VERIFIED as simulation output, and the ledger explicitly marks it as "simulation output stacked on model assumptions, not measured saving."
- FLAGGED (ledger-stated): random shuffled CV for the injury model leaks future info; Gaussian injury-duration misspecified; Transfermarkt quality weak.

### Semantic DSS (0027) — REJECT
- Krippendorff α=0.71; Bundesliga calibration r=0.68 (n=100); A7–A9 r=0.98 (VIF 35.1/37.0); top-1 consistency 89.3% under ±5% noise; missing-tracking 78.5% — `0027-can-semantic-methods-enhance-team-sports.md:17,43,45,46` — VERIFIED as paper-reported (then rejected for circular validation, synthetic scenarios + one U14 match, no outcome prediction).

### Thinkscape deliberation (0005) — REJECT
- 78% High-Conf accuracy vs 57% Vegas (Poisson-binomial p=0.020); 37% ROI, $997 moneyline; 63% ATS, $1,245, 46% ROI (p=0.037); n=59; favorite bias 73%; 95% CI 59.2–89.4% — `0005-conversational-collective-intelligence.md:23,27,37,43,44,47,48,50,51,62` — VERIFIED as ledger-quoted paper claims with the ledger's full critique (no preregistration, no control arm, post-hoc threshold/rate-split/fading, vendor-authored).

### Penalty-kick CV (0038) — REJECT
- Test accuracy 89.38% at threshold 0.15 (113 samples, 77 iterations); ablation visual-only 75.22%, pose-only 68.14%, dual-branch w/o attention 82.30%; YOLOv8 mAP@0.5 0.935 — `0038-penalty-kick-direction-pose-attention.md:35,39,40` — VERIFIED; ledger's adversarial notes (113-sample thin test, no CV, class balance unreported, millisecond lead time) VERIFIED at :49.

### NBA long-sequence LSTM (0493)
- LSTM 72.35% accuracy, 73.15% precision, 76.13% AUC vs logistic 70.12%/70.66%/69.85% — `0493-longsequence-lstm-modeling-for-nba-game.md:26` — VERIFIED.
- "Vegas ~55%" comparison flagged as category error (balanced books; 55% concerns ATS rates) — `0493-...md:31,40` — VERIFIED as ledger-stated critique.
- FLAGGED (ledger-stated): train/val/test partition not stated; sliding windows overlap by 9,839 games (leakage risk if not time-ordered); no significance tests; no calibration.

### Baseball CV benchmark (0513) — REJECT
- Pitch/non-pitch best 99.36 (InceptionV3 two-stream + sub-events); multi-label mAP 62.6 (InceptionV3 two-stream); pitch-speed RMSE 3.6 mph (60 fps); pitch-type 36.4% (pose+sub-events); sub-event params 36K vs LSTM 10.5M — `0513-finegrained-activity-recognition-in-baseball-videos.md:40,41,44,45` — VERIFIED. Ledger's leak concern (train/test split unstated, same 20 games) VERIFIED.

### CoArena (0523) — REJECT
- Every number explicitly labeled illustrative or simulated — `0523-coarena-evaluating-computeruse-and-multiagent-systems.md:11,38` — VERIFIED (paper's own statement: "Every number in this paper is either derived from stated inputs… or labeled as illustrative. None is a measurement of a deployed system").
- Illustrative ratings A 1140 [1073–1206] … E 877 [809–945]; Newton 5 iterations; Elo half-width ≥ 681/√n — `0523-...md:41,43` — VERIFIED as labeled-illustrative.

### SoccerNet 2026 challenges (0443) — REJECT
- BAA winner FAANTRA-WS mAP_avg 24.08 vs baseline 16.76 (+7.32); PCBAS PAVE 58.94 vs 46.41 (+12.5); NVS DENSER PSNR 29.89/SSIM 0.791/LPIPS 0.388 vs 3DGS 26.74/0.751/0.410; Synloc SELabSoccer 97.67/frame-acc 81.91 vs baseline 77.30/33.74; VQA vitomeme 98.0% (report says 97.6% on test split) — `0443-soccernet-2026-challenges-results.md:31–35` — VERIFIED.
- Two internal discrepancies flagged in-ledger (LPIPS 0.388 vs 0.366; VQA 98.0% vs 97.6%) — `0443-...md:47` — VERIFIED as ledger-stated.

### CoachAI badminton (0262) — REJECT as system
- Authors measured NOTHING on their own data: no splits, no detection accuracy, no stroke-classification accuracy; the only numbers (YOLOv3 22 ms/image at 320×240, 28.2 mAP) are literature-quoted; ~150,000 frames across 2 matches, dataset proprietary — `0262-coachai-a-project-for-microscopic-badminton.md:13,22,33,44,48` — VERIFIED.

### ResearchPilot (0118)
- 11 backend tests + 1 frontend smoke test; one successful end-to-end run (12.47 s, 10 papers, 10 extractions, 4 consensus/2 contradictions/3 open gaps, 2046-char draft); three-query repeat batch 0/3 completed (provider token rate-limit errors, 28.42 s/29.24 s to failure) — `0118-researchpilot-a-local-first-multi-agent.md:30,33,34,35` — VERIFIED.
- Abstracts explicitly insufficient for datasets/settings/quantitative outcomes (paper's own limitation) — VERIFIED.

### Data-Juicer 2.0 (0128)
- Speedups 138%–226% (small multimodal, 4 Ray nodes, vs own 1.0 baseline); reorder/fusion saves up to 70.22%; GPU allocation up to 99%; faster CPFS 1,625 s vs 4,396 s (2.7×); dedup table at 200 GB/1 TB/5 TB — `0128-datajuicer-20-cloudscale-adaptive-data-processing.md:26` — VERIFIED.
- Small-text on Ray 148% or worse (I/O-bound, adapter not universally beneficial); timings single-run, no variance — `0128-...md:26,32` — VERIFIED (ledger's adversarial read).

### Action-valuation survey (0372)
- V(A_t) = V(S_{t+1}) − V(S_t); nine-dimension taxonomy; 25+ methods, 16 datasets; NFL row = exactly one (Yurko 2019) — `0372-action-valuation-in-sports-a-survey.md:8,11,21` — VERIFIED.
- Four named GSE gaps: (1) off-ball valuation, (2) player-aware valuation (only Sicilia 2019 uses player embeddings), (3) credit-assignment horizon as design variable, (4) no forward-game-outcome predictive benchmark of EPA-based player scores — `0372-...md:47` — VERIFIED as ledger-stated gaps.

### r00 ops files
- INTELLIGENCE_CORE_AUDIT: 514 tests passed (`npm test --workspace=packages/prediction-engine`), 51 files — `docs/INTELLIGENCE_CORE_AUDIT.md:46` — VERIFIED.
- AIRWAVE_SOURCE_POLICY: paraphrase-only rule (no verbatim quotes in public output); public output requires operator_status=APPROVED + rights in (OWNED, PUBLIC, LICENSED); UNFALSIFIABLE claims cannot produce GSE pick evidence — `docs/ai/airwave/AIRWAVE_SOURCE_POLICY.md:38,67,80–82,105` — VERIFIED. This is the legal intake spec for TRUST-SIGNAL media intake — the map's gap #1 (trust-signal intake ~zero coverage in-slice) has its legal answer here.

### REJECT verdicts confirmed sound (0453, 0463, 0483, 0048, 0252, 0382, 0212)
- 0453 MDSE: worked arithmetic on invented numbers; claims +11%/+18%/+42% internally inconsistent; "42% scalability gain" from arbitrary weights w=[0.4,0.3,0.3]; no data — ledger §findings — VERIFIED.
- 0463 IPNN: headline 100% train accuracy requires all 12 auxiliary bit labels (circular — labels hand the factorization); load-bearing "neither provable nor falsifiable" assumption — ledger §findings — VERIFIED.
- 0483 admissibility note: admits Berger/Robert "remark upon the ease" of the extension; admissibility is weak optimality; "Kelly criterion, zero papers read" standing gap noted — ledger §findings — VERIFIED.
- 0048 all-pay auctions: REJECT unconditional — no empirical content, DFS-salary-cap analogy explicitly rejected (DFS is not an all-pay auction) — ledger §findings — VERIFIED.
- 0252 hierarchical baseball: external comparison RMSE 7.33 vs PECOTA 7.11 (PECOTA wins overall); model wins young players 2.62 vs 4.62/0% %BEST; predictions used TRUE future at-bat totals (named leakage); 74% of eventual elites need >1 year to classify — ledger §findings — VERIFIED. (The elite-mixture caution transfers as INFERENCE; see Challenges.)

---

## Cross-file connections (what reinforces/contradicts what, with file refs)

### A. QB-behavior cluster (the intelligence program's core)
1. **EHCP (0402) is the missing process-grade for the QB matrix schema.** Map finding #1 (d35: 21-QB behavioral matrix with EPA/db, CPOE, pressure-to-sack, first-read rate, scramble rate, aggressiveness) gets a decision-process column: % dropbacks to max-EHCP receiver (Winston 26.8% vs Wilson 13.2% on 2017 data) and decision-timing (Kupp/Hilton examples: arrival-time EHCP far below peak-route EHCP → grading whether QBs throw on time). Reinforces: EHCP's variable-importance (separation at throw 0.08% vs at catch 6.74%) says timing dominates — INFERENCE: QB decision grade should weight route-timing more than pre-throw reads.
2. **EHCP receiver credit/blame (0402: Tate +11.8pp, Bryant −18.4) ↔ JOI chemistry (map #4, d09):** two independent decompositions of QB–receiver joint output — EHCP attributes ball-in-air reaction value; JOI attributes joint dropback value beyond the sum of parts (~18% RMSE reduction). INFERENCE: the product is QB–WR trust = EHCP-credit + JOI; both needed because EHCP misses unthrown targets and JOI misses within-route timing.
3. **Min-EHCP targeting rate (0402: Carr/Wentz 27.5% throws to the worst option) is the quantitative trust-signal prototype** for map gap #1 (trust-signal intake ~zero in-slice). It pairs with the AIRWAVE_SOURCE_POLICY legal spec (r00): paraphrased media claims about QB–receiver trust flow through the paraphrase-only/operator-approved pipeline as falsifiable research signals, while EHCP provides the falsifiable numeric anchor.
4. **0252's latent-elite caution transfers to QB breakout identification (INFERENCE):** 74% of eventual elite hitters need >1 year of data to classify elite (P(E)=0.5); mixture dominates position information; DH-role over-shrinkage. For QBs this predicts: (a) rookie/QB-change "elite" labels need multi-season evidence, (b) atypical roles (dual-threat QBs) will be over-shrunk by pooled models — the exact failure flexBART's DGP2 (0232) exhibits. Two papers, one warning.

### B. Coaching / play-calling / scheme cluster
5. **Three independent lenses on play-calling predictability compose into a coaching-tendency module:** 0222 (equilibrium-structured latent mixtures; pilot gate ≥3 teams Bonferroni-significant Nash deviations) + 0282's Ötting 2021 (HMM play-call prediction 71.5% OOS, Patriots 77.9% vs Seahawks 60.2% — predictability varies materially by team) + map's scalarizer DARK result (d34: coaching 4th-down go rate r=−0.0136). INFERENCE: the DARK 4th-down result says go-rate alone carries no signal; the HMM says sequence-context does; the equilibrium lens says deviations-from-optimal do. All three should be inputs, not substitutes.
6. **0222's atomicity (≤I-atom mixtures) ↔ 0554's MFM archetypes:** a low-cardinality latent mixture of play types per game state (0222) and unsupervised style archetypes with posterior uncertainty over K (0554) are two routes to the same object — discrete offensive identity. 0554's NBA found exactly 3 groups (411/112/13); INFERENCE: NFL offense archetypes are probably similarly few (pass-funnel, run-first, balanced) and the MFM posterior over K quantifies when a "new" style is real vs noise.
7. **0574's bandwidth result (h=1 season-length smoothing wins; h=1.5 collapses) ↔ 0584's Germany-2018 failure (stale-form lock-in from fixed 3-year half-life):** together they say recency kernels are regime-sensitive. INFERENCE: adaptive decay that shortens half-life after coaching/QB changes (0584's own §14 proposal) is the fix; this is a COACHING input to the rating layer.
8. **0533 case-crossover ↔ 0232 referee-crew totals ↔ 0098's officiating-adjacent covariates:** 0533 gives the quasi-experimental design (self-matched, clock- and play-aligned counterfactuals, placebo battery); 0232 gives crew-ID as a flexBART categorical for totals; 0533's significant break×lead interaction (−0.90/goal) is the shape of a stoppage-burden effect. Compose: case-crossover on NFL injury timeouts/weather delays with crew-ID as moderator.

### C. OL / injuries / availability
9. **0098's conditioning/non-conditioning taxonomy ↔ 0423's injury-risk model:** 0423 does NOT separate load-driven (soft-tissue) from load-independent (contact) injuries, and its optimizer can only act on the former. 0098's physician-classified taxonomy (Achilles/calf/groin/hamstring vs fractures/high-ankle/Lisfranc) provides exactly that split. Compose: competing-risks survival model (0423's own improvement proposal) with conditioning share weighting (0098). OL application: OL injury discounts should weight conditioning-type absences differently from contact-type (INFERENCE: soft-tissue OL absences predict further absences; contact ones don't).
10. **0098's ITS Poisson design ↔ map's structural-break needs:** the β₂ level-shift + β₃ trend-break parameterization is the backtest QA harness for 2011 CBA (positive control: detect the 2011 bye-week regime effect from 2408.10867), 2021 17-game season, kickoff-rule changes. Reinforces d32's as-of quarantine rulers.

### D. Calibration / uncertainty / sizing — now coherent end-to-end
11. **0503 (game-clustered bootstrap) + 0473 (MIS/quantile heads) + map's 1801 (drive-level cluster bootstrap) + d32 fixture group keys → one resampling standard:** play-level resampling is dead (0503: 90% nominal covers at 0.60). The composition: game-clustered bootstrap with φ tuned on nflverse 2020–2024 (0503) + hierarchical drive-nested variant (0503's improvement experiment) + MIS (ρ=0.05) as the interval proper score (0473) + quantile heads replacing MC dropout (ruled out by 0473: MIS 881.05, width 9.16). INFERENCE: cluster-bootstrap the residuals, score intervals with MIS, tune φ by MIS — a closed calibration loop.
12. **0564's "trust probabilities over ratings" ↔ map's Elo contradiction (d34 invalidated game model vs rating-layer upgrades):** 0564 proves E[b(2X)]=b(2ρ) exactly at stationarity — a systematically-biased-looking rating with well-calibrated probabilities is the theoretically expected regime. This resolves the tension: the probability head (calibration) and the rating level (ranking) are separable diagnostics. Practical: when GSE's Elo and its WP calibration disagree, trust the calibration.
13. **0544 phantom-player ↔ 0015 Katz recency digraph ↔ 0574 KRC — three early-season rating solutions that should be benchmarked against each other, not stacked:** phantom-player anchors to zero-strength with interpretable q-calibrated shrinkage (δ=(1−q)/(2q−1)); Katz adds transitive closure with recency sigmoid; KRC adds kernel smoothing with O(n²) online updates. All three are rating-layer inputs; the acceptance gates differ (≥17/24 weekly windows vs ≥1.0pp accuracy vs ≥0.5pp AUC). INFERENCE: run the three-way bake-off once on nflverse 2015–2025 and keep the winner — do not wire all three.
14. **0176's EV-threshold policy (static θ maximizing total profit, not per-window ROI) ↔ map's δ/σ Kelly gate (1748) ↔ 0483's posterior-predictive admissibility:** threshold selection (when to bet) composes with Kelly sizing (how much) on posterior predictive distributions. 0176's conclusion (vi) — per-season profit optimization guarantees maximal total profit while per-season ROI optimization lowers it — is a decision-rule correction that sits upstream of Kelly.
15. **0433's joint GLMM ↔ 0392's ANS joint TD model ↔ 0242/0584's nested conditional → the score-simulation stack:** GLMM gives correlated team-strength (off/def/win random effects; score corr(off,win)=0.94) as inputs; the nested sampler generates favorite-first with underdog-conditional-on-favorite (β₃ test); ANS/Sarmanov fits the joint TD-count distribution with NB marginals and negative dependence (classical DC can't: floor −0.08 vs observed −0.263…−0.395). Compose in that order: ratings → nested sampling → joint-count likelihood. Note 0584's 2018 failure (Germany stale-form) says the rating input needs adaptive decay (connection #7).
16. **0473's DeepGLEAM residual result (hybrid 66.03 vs 73.59 vs pure-deep 239.94 — pure deep catastrophically fails under distribution shift) ↔ map's residual-correction architecture pattern (1851 CRAFTER):** two independent arrivals at "new models enter as correctors on frozen-engine residuals." Reinforces the architecture doctrine: never rewire the engine; correct its residuals.

### E. Player modeling — mean + variance
17. **0604's GP career ability ν(t) + 0594's GARCH(1,1) seasonal volatility → the prop model's full predictive distribution:** GP gives current ability with credible intervals (and the SMA(10%)-is-worst warning — INFERENCE: indicts last-5-games prop handicapping directly); GARCH gives the boom-bust conditional variance h(t) as a consistency feature. Together: mean from GP, variance from GARCH, matchup from GLMF (0068), archetype from MFM (0554), comps from SDI (0413) for replacement players. INFERENCE: this five-part composition is the player-prop engine; each part has its own acceptance gate.
18. **0413's SDI comps ↔ 0068's GLMF unseen-cell imputation ↔ 0910's unseen-pair CatBoost (map #4):** three approaches to the cold-start problem (new QB, traded WR, rookie). SDI finds the nearest stylistic neighbor; GLMF imputes the matchup cell from marginals; JOI's CatBoost predicts the joint effect directly. INFERENCE: ensemble the three for debut-game projections rather than picking one.

### F. Program infrastructure
19. **0118's four-stage typed-contract pipeline (Search→Extraction→Synthesis→Writer) + its missing citation-verification stage + 0128's lightweight patterns (operator fusion, MinHash dedup, sample-level fault tolerance, per-row lineage)** = the formalized operating system for the intelligence program itself. The 429 lesson (map §5: ≤6 concurrent; 0118's own 0/3 repeat-batch failure on provider rate limits) is now documented three times independently — INFERENCE: provider fallback chains (OpenRouter → OmniRoute → local) are a standing requirement, not an optimization.
20. **0202's watch–remember–reason + 0262's staged pipeline (detect→track→pose→classify→warehouse) + Garrett's standing HARD video rule:** any future broadcast-video lane has its reference architecture (0202) and its front-end pattern (0262), but the video rule (real footage only, seconds-long transformative clips) constrains outputs. The 0202 ledger's acceptance bar (prototype beats uniform-sampling VLM QA by ≥15 points with evidence IoU ≥ 0.5) is the gate.

---

## Challenges (weak claims, method problems, INFERENCE-marked speculation)

1. **+69.86% calibration-returns claim (0282) is unvalidated in-repo.** The ledger itself says it at :50 and :66 ("pointers… not conclusions to act on"; "never been validated on NFL data in-repo") and the review flags its own publication bias. The map's top-20 lists it as a corroborated finding — INFERENCE: that presentation overstates it. The honest status: HYPOTHESIS AWAITING the internal calibration-vs-accuracy bake-off the ledger prescribes. Do not cite 69.86% as evidence; cite it as a pointer.
2. **0533's headline is a null wearing a significant interaction.** Main momentum effect CIs all cross zero (+0.26 [−2.50,+3.02]; −0.63 [−3.63,+2.37]); the one significant interaction (break×Elo/100 = +1.59, SE 0.80) sits among many tested interactions — multiple-comparisons risk is real and the paper is soccer. The β-fragility note (+1.1 → −5.1 under referent-band relocation) is ledger-stated. Value = the case-crossover design template, not the numbers. NFL port must pre-register the interaction set.
3. **0423's injury model lift is 0.0024 log-loss (0.1676 vs 0.1700) at 4% base rate** — statistically detectable, practically marginal; the expected-points headline is a null (−0.1% ± 0.3); the £700k is simulation-on-assumptions (ledger-stated); the injury CV was randomly shuffled (temporal leakage, ledger-stated). INFERENCE: do not wire an injury-prediction model on this evidence; the durable assets are the taxonomy split (with 0098) and the competing-risks improvement proposal.
4. **0493's LSTM evidence is weaker than its verdict admits.** No stated train/val/test split; 9,839-game window overlap (leakage risk); no significance tests; the margin over logistic regression is only ~2.2pp (72.35 vs 70.12); probabilities uncalibrated; the Vegas-55% comparison is a category error (ledger-stated). NFL's 17-game seasons are a different information regime from 82-game NBA. INFERENCE: the "fallback prior" role is the right framing precisely because the headline number can't be trusted — adopt only via the stacked-ensemble gate (≥0.005 log-loss on 2023–2024 holdout).
5. **0544's tuning philosophies contradict each other and the ledger notes it without resolving.** Expert-elicited δ=1/98≈0.0102 (q=0.99) vs CV-selected δ=1.2589 differ by two orders of magnitude; phantom ρ=40 means 80 effective phantom games ≈ half an MLB season — INFERENCE: NFL's 17-game season needs ρ re-scaled (a half-season of phantom weight in NFL is ~8 games, not 40+40), and the ledger's gate (≥17/24 weekly log-loss windows) is the only arbiter. Also: MLB 2025 only; no temporal validation across seasons.
6. **0574's "+0.27pp beats Elo" is one bandwidth's margin with no CI** (ledger-stated at :54); feature-rich Elo beat featureless KRC in 2 of 3 seasons; h=1.5 collapses to 0.6173. INFERENCE: this is a promising cheap estimator, not a proven upgrade — the three-way rating bake-off (connection #13) is the honest next step.
7. **0564's theory is N=2 players, small-K only.** The √K law, the bias direction, and Proposition 12 are proved for 2-player binary-score games; NFL is 32 teams with HFA, rest, injuries, and score margins; the bias E[X]−ρ remains uncomputed (paper's future work). The "trust probabilities" policy is a calibration heuristic, not a theorem about NFL Elo. Useful — but don't over-claim.
8. **0068's margins are thin and the equations are garbled.** GLMF beats the naive mean by 0.002 RMSE (0.342 vs 0.344) and 0.010 log-likelihood on aggregate stats; IRLS failed to converge on 2/144 simulations; the paper's printed IRLS equations are unrecoverable (ledger marks UNCERTAIN). Reimplementation must go through Li & Gaynanova (2018), not the paper. The honest claim is "flexible sparse-matrix machinery with marginal gains on aggregates" — INFERENCE: the real test is with richer side data (tracking-derived aggregates), where the paper itself says the value lies.
9. **0242/0584 are soccer models with soccer failure modes.** The ad-hoc step-3 averaging (0242) should be a joint fit (ledger-stated); 0584's 2018 Germany failure is direct evidence that fixed recency kernels misfire after regime changes; EURO-2016 retrospective is a tiny sample; no bookmaker/market benchmark in 0242. The nested β₃ mechanism transfers as a hypothesis with the ≥0.5% exact-score log-loss gate, not as a validated model.
10. **0604's cricket likelihood doesn't transfer and its own posteriors warn against short-term form modeling.** Opposition strength unmodeled (acknowledged gap — first-order in NFL); ℓ and α posteriors barely move from priors (data can't distinguish smooth vs ragged short-term trajectories); NFL careers are ~100–200 games, far shorter than cricket careers. The durable, verified insight is negative: SMA(10%) was worst (633.1 vs 544.0) — INFERENCE: "recent form" means are worse than career means for ability estimation; GSE prop baselines should downweight trailing windows.
11. **0594's authors prefer M1 though M2 has the best LPML** (−45472 vs −45943) — selection by narrative, ledger-flagged; no out-of-sample scoring; the latent-factor spline collapses to a seasonal step function (the fancy machinery adds little); shot-put has no opponents. The GARCH-on-seasonal-intercepts idea survives as a method; the paper's model-selection doesn't.
12. **0413's R²=0.59 is in-sample on 30 teams, 4 predictors, no holdout** (ledger-flagged); 32% variance discarded; NBA 2013–14. The SDI comp system is a reasonable build but the win% regression is not evidence of predictive power.
13. **0554's NBA groups are descriptive, not validated.** Tertile discretization loses information; 6,000 MCMC iterations (3,000 burn-in) is thin for MFM cluster-count moves; the 13-player "Adaptive Tactical Hubs" group is small; no code released. Archetype discovery needs the stability gate (half-season ARI ≥ 0.6) before wiring.
14. **0222's NFL mapping is an analogy, not a derivation.** CAMS's atomicity theorem needs Isaacs' condition, full knowledge of dynamics/payoffs/priors, perfect recall — none hold in NFL; the machinery cost 17h on A100 for a 4-stage toy game. The portable asset is the pilot spec (low-cardinality latent mixture vs logistic, ≥0.005 nats + ≥3 significant teams), not the game theory.
15. **0038's 89.38% is a 113-sample test with no CV and unreported class balance** (ledger's adversarial notes); the 0.15 threshold wins precisely because it's milliseconds from contact — INFERENCE: even the stated keeper-anticipation use case is dubious. REJECT stands.
16. **0005 is vendor-authored (Unanimous AI) with n=59, no preregistration, no control arm, post-hoc everything** (threshold 1.5 runs, rate split, inverse-Low betting), 73% favorites, CI 59.2–89.4% including near-baseline (all ledger-stated). REJECT stands. The one surviving mechanism — deliberation-intensity × confidence as an inverse signal — needs the preregistered NFL replication the ledger specs, not belief.
17. **0453/0463 fail basic honesty checks** (invented arithmetic; circular auxiliary labels; an explicitly "unfalsifiable" assumption). Their REJECTs are the program working as intended: the arXiv 1,000-paper target counts only ADAPT/ADOPT reads; REJECTs must be replaced, per Garrett's penalty directive — these two are correctly banked as replacements-needed, not as assets.
18. **0118/0128 are systems papers whose headline numbers don't establish quality.** 0118's authors admit tests "do not establish output quality" and abstracts are insufficient; the 0/3 repeat-batch failure is the real finding (provider quotas, not pipeline bugs). 0128's speedups are single-run vs their own 1.0 baseline; Ray made small text 148% worse. Adopt only the lightweight patterns (0128) and the typed-contract architecture + citation-verification stage (0118) — never the papers' self-evaluations.
19. **0262 measured nothing on its own data** (ledger-verified). 2019-era components (TrackNet/YOLOv3/OpenPose) are superseded. Only the staged-pipeline architecture transfers, conditional on the All-22 prototype clearing its quality bar.
20. **0513/0523/0443/0382/0027 are correctly REJECTED with no salvageable numbers** except: 0523's reporting discipline (publish intervals + rank bands, not point ranks); 0443's two internal discrepancies (self-reported, lightly copy-edited leaderboards); 0202's architecture pointers (DeepSport/FineQuest) and its ≥15-point/0.5-IoU prototype gate.

---

## Buildable systems (component name, inputs→method→output, acceptance gate)

Prioritized per the task: QB behavior, coaching/scheme, OL, trust signals, calibration, uncertainty, sizing.

**S1. QB Decision Grade (EHCP).** Inputs: public Big Data Bowl tracking plays (weekly; NGS-internal doctrine → never NGS-derived). Method: LightGBM catch-probability model on the paper's §5 feature set + conditional imputation for x*_miss, time-ordered validation (train weeks 1–12, test 13–18). Output: per-QB-week % dropbacks to max-EHCP receiver; decision-timing grade (arrival vs peak-route EHCP); receiver credit/blame risers/fallers. Gate: ≥70% of interceptions have targeted-receiver EHCP below the play's max; adopt EHEPA (completion × conditional EPA) iff ρ_EHEPA with team offensive EPA/play beats ρ_EHCP by ≥0.05 on 2024 holdout. Source: 0402.

**S2. Sparse Matchup Imputation (GLMF).** Inputs: binomial matchup cells (completions/targets for receiver×defense, QB×defense; pressures for OL×DL) + normal aggregate side matrices (offense/defense marginals). Method: alternating IRLS per Li & Gaynanova (2018) with ridge regularization (fixes the 2/144 convergence failures). Output: imputed matchup probabilities for thin head-to-head cells. Gate: beats GSE's current shrinkage prior on time-ordered holdout log-likelihood. Source: 0068. (Public-charting workaround for the paywalled shell weights, map gap #5.)

**S3. flexBART Categorical Engine.** Inputs: GSE tabular tasks with high-cardinality categoricals (team ID, QB ID, coach ID, referee-crew ID, formation, coverage shell). Method: flexBART multi-level split prior (+gs2/gs3 network priors on the schedule graph), R package. Output: predictions with calibrated posterior intervals. Gate: ≥3% out-of-sample RMSE improvement vs XGBoost on 2024 holdout + 80%/90% intervals within ±3pp of nominal coverage + ≥4 chains R-hat < 1.05 + weekly-batch runtime. Note DGP2 diagnostic: singleton-outlier QBs get a separate check. Source: 0232.

**S4. Phantom-Player Weekly NFL Power Ratings.** Inputs: game results. Method: Bradley–Terry + ρ phantom pseudo-games vs zero-strength team (fit in plain `glm`); q-calibration dial δ=(1−q)/(2q−1) for expert-elicited shrinkage. Output: early-season stabilized ratings + interpretable shrinkage setting. Gate: ≥17 of 24 weekly log-loss windows vs ordinary BT; ρ re-scaled for 17-game seasons (not MLB's 40). Source: 0544.

**S5. KRC Spectral Rating Engine.** Inputs: game results + dates. Method: kernel-smoothed Markov transition matrix, stationary distribution as strengths, Sherman–Morrison rank-one online updates. Output: weekly power ratings + entrywise asymptotic CIs. Gate: beats the existing dynamic rating by ≥1.0pp pooled winner accuracy; bandwidth tuned walk-forward (paper's h=1 suggests ~1-season effective memory). Competes with S4 and Katz (0015) in a three-way bake-off — wire the winner only. Source: 0574.

**S6. Nested NFL Score Simulator.** Inputs: team strengths (from S4/S5 winner), date+importance-weighted history. Method: (a) test β₃ (underdog scoring rate vs realized favorite score) on nflverse; (b) favorite-first nested sampler; (c) Sarmanov/ANS joint TD-count distribution with NB marginals and negative dependence (classical Dixon–Coles can't represent observed −0.263…−0.395 correlations). Output: exact-score and totals joint distributions; playoff bracket sims with in-replication rating updates. Gate: nested sampler beats independent-Poisson exact-score log-loss by ≥0.5% out-of-sample; ANS beats Skellam/independent baselines on 2023–2025 totals log-likelihood (paired p<0.05, no totals-calibration degradation); playoff sim beats static-strength sim by ≥5% Brier and ties/beats futures-implied RPS in ≥4 of 5 backtested postseasons. Sources: 0242, 0584, 0392. (Garbage-time/prevent mechanism; pairs with map's kneel/garbage-time doctrine #10.)

**S7. Game-Clustered Uncertainty Standard.** Inputs: play-level model residuals / WP estimates. Method: fractional randomized-cluster bootstrap (resample games, keep plays with prob φ), φ tuned on nflverse 2020–2024 by empirical coverage vs width; hierarchical drive-nested variant compared on the coverage/width frontier. Output: WP/projection point estimate ± interval + effective-sample-size diagnostic (plays → independent equivalents) published in the model card. Gate: empirical coverage vs width frontier dominates the i.i.d. baseline on held-out seasons. Source: 0503. (φ=0.35 is NOT a constant — it's a tuned knob.)

**S8. MIS Interval Scoring + Quantile Heads.** Inputs: totals/prop interval forecasts. Method: MIS (ρ=0.05) as the standard interval proper score; MIS-regression or quantile-regression heads on the engine for interval outputs (MC dropout and naive bootstrap ruled out). Output: calibrated totals/prop bands. Gate: adoption as the interval-forecast scoring standard; quantile heads adopted when they improve MIS on holdout. Source: 0473.

**S9. Injury-Availability Features (OL-aware).** Inputs: NFL injury reports + nflverse snaps. Method: conditioning/non-conditioning taxonomy (0098, physician-classified) → weight each team's inactive list by conditioning share; competing-risks survival split (load-driven soft-tissue vs load-independent contact, from 0423's improvement proposal). Output: per-team weekly availability discount, with OL-out flags (map #5: Banks, Bako-Bewele, Ingram, Pipkins, Awosika, Stanley, Cosmi, Bartch pattern) weighted by injury type. Gate: soft-tissue vs contact differential shows predictive value on next-week availability. Sources: 0098, 0423.

**S10. Case-Crossover In-Game Causal Module.** Inputs: nflverse play-level EPA + event timestamps (injury timeouts, weather delays, booth reviews, challenge flags) + referee-crew IDs. Method: self-matched case-crossover with clock-aligned and play-aligned counterfactuals, match-clustered SEs, placebo-battery (e.g., placebo breaks at 38′/82′ analogue). Output: ATT estimates for live spread/total adjustments; crew stoppage-burden effects upgraded from correlation to quasi-causal. Gate: placebo battery passes; pre-registered interaction set. Source: 0533. (Ledger estimates 4–6 engineer-days.)

**S11. Weather Mediation Decomposition (totals).** Inputs: nflverse pbp 2015–2025 + stadium weather. Method: medshift stochastic-intervention mediation; wind effect on total points decomposed into direct (physics) vs indirect (play-calling: deep-pass rate, pace) at IPS δ=5, 10 mph. Output: direct/indirect split feeding the totals-model weather adjustment. Gate: PIIE at δ=10 mph significant at 5% with expected sign, sum matches naive total-effect sign, holdout (2023–2024) keeps sign; reject if A3 indefensible after game-script controls. Connects to map's scalarizer DARK wind result (d34): the mediation spec is the hypothesis that survives the DARK screen. Source: 0272.

**S12. GP Career Ability + GARCH Volatility (props).** Inputs: player-game metrics (nflverse 2015–2025, ≥30 career games), opponent adjustments, home/dome multipliers. Method: powered-exponential GP on log ν(t) with position-pooled ℓ/α (opposition adjustment added — the paper's acknowledged gap) + GARCH(1,1) on seasonal intercepts. Output: current ability ν(now) with credible intervals as season-long prop baseline + conditional variance h(t) as boom-bust feature. Gate: GP beats trailing-5-game and career averages by ≥5% pooled out-of-sample MSE on 2023–2025 with 68% intervals at 60–76% coverage; GARCH accepted iff LOO beats homoskedastic by Δelpd > 2×se AND volatility feature improves prop hit-rate log-loss ≥0.3% on 2024–2025 holdout. Sources: 0604, 0594. (INFERENCE: the SMA(10%)-worst finding indicts last-5-games handicapping — downweight trailing windows in prop baselines.)

**S13. Play-Call Equilibrium Pilot (coaching).** Inputs: nflverse run/pass by (down, distance, field position, score). Method: low-cardinality (≤I-atom) latent mixture for play-type prediction vs logistic baseline. Output: per-team Nash-deviation flags (exploitable predictability). Gate: ≥0.005 nats log-loss improvement on 2025 holdout + ≥3 teams with Bonferroni-significant deviations. Complements Ötting 71.5% HMM (0282) and the scalarizer's DARK 4th-down result (d34). Source: 0222. (Do NOT implement CAMS machinery.)

**S14. EV-Threshold Staking Policy (sizing).** Inputs: chronological NFL backtest edge estimates. Method: sweep static θ on payoff-discrepancy; deploy the θ maximizing total realized profit (not per-window ROI); run the average-vs-max-odds comparison to set the line-shopping ROI hurdle (expected uplift band 42%–296% from 0176, to be re-estimated on NFL). Output: deployed bet-selection θ + line-shopping feature hurdle. Gate: chronological NFL backtest; static-θ vs per-window-optimal-θ comparison must reproduce 0176's conclusion (vi). Source: 0176. (Sits upstream of the δ/σ Kelly gate, map #15.)

**S15. Structural-Break QA Harness.** Inputs: GSE backtest residuals. Method: mixed Poisson ITS with level-shift β₂ + trend-break β₃ parameterization (0098). Output: regime-change flags. Gate (positive control): detects the 2011 bye-week regime effect (2408.10867) on 2021 17-game-season breaks; then scans kickoff-rule changes. Source: 0098.

**S16. Position-Specific SDI Comp System.** Inputs: NGS season aggregates per position (internal-only). Method: position-specific PCA + SDI nearest neighbors (WR/RB/TE separately). Output: replacement comps, "cheaper replacement" free-agency queries, team-style aggregation via snap-weighted embeddings. Gate: beats positional-average EPA/target forecasts by ≥0.03 R² on 2024 holdout. Source: 0413.

**S17. MFM Style-Archetype Discovery (coaching/scheme).** Inputs: nflverse team-week panel. Method: Bayesian Gaussian mixture of graphical models with MFM prior on K (continuous metrics; skip ordinal discretization). Output: style archetypes as regime features/priors in the matchup model. Gate: half-season ARI ≥ 0.6 + walk-forward ATS log-loss gain ≥ 0.003. Source: 0554. (Pairs with 0413's SDI: distance-based vs model-based archetypes.)

**S18. √K K-Factor Calibration Policy.** Inputs: existing Elo pipeline. Method: formalize in-season K as an explicit responsiveness/noise frontier (halve steady-state error by cutting K 4×); monitor rolling rating dispersion ≈ Ĉ√K for structural breaks; adopt "trust probabilities over raw ratings" when diagnostics disagree. Output: K schedule + monitoring metric. Gate: ~3 days of parameter sweeps on the existing pipeline. Source: 0564.

**S19. TRUST-SIGNAL Media Intake (legal spec, not a model).** Inputs: YouTube/podcast paraphrased claims, beat-reporter mesh, official team feeds. Method: AIRWAVE_SOURCE_POLICY enforcement — paraphrase-only, operator_status=APPROVED + rights in (OWNED, PUBLIC, LICENSED) + explicit public_safe for public output; UNFALSIFIABLE claims can never become pick evidence. Output: QB–receiver trust claims and coaching-tendency signals (roles, depth movement) as research inputs. Gate: legal ACK flow operational; SiriusXM stays listen-only. Source: r00 AIRWAVE_SOURCE_POLICY. (This is the legal answer to map gap #1; the quantitative anchor is S1's min-EHCP rate + JOI.)

**S20. Intelligence-Program Research Pipeline (meta).** Inputs: new papers. Method: four-stage typed contracts (Search→Extraction→Synthesis→Writer) + citation-verification stage (every extracted number carries a paper/section/table pointer, schema-enforced) + dedup against the existing corpus before a full ledger is written + provider fallbacks (OpenRouter → OmniRoute → local). Output: ledgers that don't duplicate and numbers that are traceable. Gate: adopted for the arXiv program's remaining reads. Sources: 0118, 0128.

---

## Integration notes

**For a unified intelligence API (qb-behavior + coaching + trust-signals + reasoning, one callable interface):**

1. **Ordering dependencies (wire in this order):** OL availability (S9: injury taxonomy → trench adjustments) → scheme/coaching (S13 play-call mixtures, S17 archetypes, S2 matchup imputation) → QB behavior (S1 decision grade; pressure splits when the clean-vs-pressured feed gap closes — map #8) → game model (S4/S5 ratings → S6 nested simulator) → calibration (S7 cluster bootstrap → S8 MIS intervals) → sizing (S14 EV threshold → δ/σ Kelly gate). The dependency is real: S6's nested sampler needs S4/S5 strengths; S7's intervals need a frozen model; S14's θ needs calibrated edges.

2. **Cross-module contracts.** Each module emits a versioned, as-of-stamped record:
   - `qb_behavior`: per-QB-week vector {decision_grade, min_ehcp_rate, pressure splits (when available), scramble/run, INT-by-situation} — S1.
   - `coaching`: {archetype_label + posterior (S17), play_call_mixture + Nash-deviation flag (S13), matchup adjustments (S2)}.
   - `trust`: {qb_wr_trust scalar (JOI-style joint effect + EHCP credit/blame), media_claim list with paraphrase-only text + source pointer + operator status (S19)} — never a pick input until falsifiable.
   - `reasoning/calibration`: {team_strength + interval (S4/S5 + S7), totals interval (S8), score_joint (S6)} with the as-of quarantine ruler (d32: `assertObservedAtOrBefore`, typed `post_settlement_backfill | as_of_mint` basis).
   - Every numeric claim carries a provenance pointer (paper, section/table) per S20's citation-verification stage — the 0118 gap (abstracts insufficient) is closed by requiring full-text pointers.

3. **Data shapes by grain.** Event-level (play, receiver: EHCP, GLMF cells) → weekly aggregates (decision grade, availability discount, archetype posteriors) → seasonal priors (GP ability, KRC/Katz ratings, phantom-player shrinkage). The API serves all three grains; promotion gates (S1–S18) keep each module shadow-only until its gate passes, per the shadow-promotion doctrine (map #2 build order).

4. **Compositions to wire as pipelines, not modules:** (a) S1→S6: decision grade adjusts QB efficiency inside the nested simulator; (b) S9→S13→S6: availability → play-call mixture → score sim (injuries change play-calling, which changes scoring — the mediation chain S11 formalizes for weather); (c) S7→S8: cluster-bootstrap residuals, score intervals with MIS, tune φ by MIS — the closed calibration loop; (d) S12: GP mean + GARCH variance + S2 matchup + S17 archetype = the prop engine's predictive distribution.

5. **Doctrinal constraints the API must enforce:** NGS-internal (S1 uses public BDB; S16 stays internal); public surface shows projections/rankings only (no metric names, no methodology); residual-correction architecture — new signals (S2, S12 variance, S19 claims) enter as corrector features on frozen-engine residuals first (0473 DeepGLEAM + map pattern); nothing commercial touches NGS data.

6. **Known gaps this chunk does NOT close (for the parent):** clean-vs-pressured QB splits still blocked (map #8 — S1's pressure dimension waits on it); trust-signal intake has the legal spec (S19) but no quote-mining build; man/zone coverage weights still paywalled (S2 is the public workaround); INT-by-situation and scramble triggers unmodeled; the +69.86% calibration claim still needs the internal bake-off before it becomes doctrine.

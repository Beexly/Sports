# [0931] Competitive Balance in Team Sports Games (arXiv:2006.13763)

## Citation / full-text source

- arXiv:2006.13763 — full text: https://arxiv.org/pdf/2006.13763
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Sofia Maria Nikolakaki, Ogheneovo Dibie, Ahmad Beirami, Nicholas Peterson, Navid Aghdaie, Kazi Zaman (2020). *Competitive Balance in Team Sports Games*. arXiv:2006.13763 [cs.AI]. URL: https://arxiv.org/abs/2006.13763. (Work done in part during an internship at EA.)
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv HTML, complete).

## 1. Research question
In team games, matches are traditionally balanced by equalizing aggregated scalar skill (mean Elo/TrueSkill). But team dynamics (role fit, play style, dropouts, intra-team variance) are not captured by a single rating. The paper asks: what is the right prediction target and feature set for competitive balance — a match whose final score difference is near zero — and can a fast linear model rival a neural network?

## 2. Dataset / schema
- **Source:** EA-published online team sports game (unnamed), 3v3 and 6v6 modes. Both datasets: >100,000 players, >500,000 games. All models trained/evaluated on subsets of the same 3-month data period. "Balanced samples are generally in similar order to unbalanced samples." Proprietary — not replicable outside EA.
- Player features are cumulative and updated online as matches complete (time-dependent), so recent activity is captured.

## 3. Method / model
- **Balance definition:** match M between teams T1, T2 is balanced iff |r| < θ, where r = predicted final score difference and θ is a threshold hyperparameter (in real sports, θ can be set to the forfeit score difference, e.g., soccer/hockey 3–0, basketball 25–0).
- **Architecture (NN):** (1) retrieve player feature sets P_j; (2) aggregate to team features t_1, t_2 (mean + std of each player feature); (3) form match vector M = (t_1, t_2, m) with match-specific features m; (4) linear or two-layer fully-connected ReLU predictor; (5) output single continuous r; threshold f(r) = 1_{|r|<θ}.
- **Player feature categories:** match experience (num_matches, num_wins, freq_wins), role experience (num_role_i, freq_role_i), play style (num_action_i, avg_num_action_i over micro-events: scoring attempts, giveaways, hits, takeaways...), dropout history (num_dropout, freq_dropout).
- **Team features:** mean and standard deviation of each player feature across the team.
- **Match features:** absolute and signed differences of team-average player features; team-average skill rating and its difference/absolute difference; skill difference between highest-rated players, between lowest-rated players, within-team skill std; number of human players per team (bots fill gaps). ~100 features total per mode, z-score normalized.
- **Models compared:** Dummy (predicts training mean), AvgSkill (two mean-skill features → linear regression = current industry practice), Linear, RndFrst, NN (this paper's two-layer net) for score-difference regression; Logistic, NNSoftmax, Delalleau+ for win-probability; "+" variants use recursive-feature-elimination best subsets.
- **Validation:** time-ordered sliding window — train days 1..K−3, validate days K−2, K−1, test day K; then shift by one day and repeat. Results averaged over 20 consecutive test days. (No shuffling/K-fold due to time sensitivity.)

## 4. Equations & assumptions
- f(r) = 1_{|r|<θ}(r), r = signed predicted score difference; balanced iff |r| < θ.
- M = (t_1, t_2, m) (match feature vector concatenation).
- Delalleau win-prob baseline: balanced iff |Pr(A beats B) − 1/2| ≤ ω, ω tuned to 0.3 for best performance.
- F1 = harmonic mean of precision and recall (evaluation metric).
- Assumptions stated: score-difference concentration at zero is the right operational definition of balance; forfeit scores define θ in real sports; player features' time-dependence makes recent matches more predictive; synergy is modeled implicitly via the NN over concatenated features; results are offline hypotheses for future A/B tests — "none of the approaches have been deployed to a live matchmaking service."

## 5. Features / target
Target: signed final score difference (regression), binarized via θ for the F1 evaluation. Also compared against the alternative target: win probability (≈50% = balanced). Inputs: ~100 engineered player/team/match features as above.

## 6. Validation design
Time-ordered sliding-window train/validate/test over a 3-month period (train K−3 days, validate 2 days, test 1 day, shift daily; 20 consecutive test days averaged, mean ± SD reported). Baselines: Dummy, AvgSkill, Logistic, NNSoftmax, Delalleau et al. 2012, Random Forests. Metric: F1 on the balanced/unbalanced label. Inference/train timing benchmarked on a 64-bit MacBook Pro, i7 2.6 GHz, 16 GB RAM, scikit-learn + Keras.

## 7. Numerical results / baselines
**Test-set F1 (Table III, mean ± SD over 20 days):**
- 3v3: Dummy 0.00 (±0.00), AvgSkill 0.00 (±0.00), Linear 0.53 (±0.02), RndFrst 0.56 (±0.02), NN 0.59 (±0.02), Linear+ 0.60 (±0.02), RndFrst+ 0.58 (±0.01), NN+ 0.62 (±0.02).
- 6v6: Dummy 0.60 (±0.01), AvgSkill 0.60 (±0.01), Linear 0.68 (±0.03), RndFrst 0.61 (±0.03), NN 0.68 (±0.02), Linear+ 0.68 (±0.02), RndFrst+ 0.64 (±0.03), NN+ 0.71 (±0.02).
- AvgSkill (industry-standard mean-skill approach) is useless on 3v3 (F1 0.00) and no better than Dummy on 6v6.
**Score-difference vs win-probability targets (Tables III vs IV):** score-difference models beat win-prob models in 3 of 4 matched pairs; the only exception is Linear vs Logistic (Logistic slightly better). Delalleau+ (best win-prob model): 0.59 (3v3) / 0.70 (6v6) vs NN+ score-difference: 0.62 / 0.71. Abstract's claim: ~15% and ~2% improvement over previous definitions in linear and non-linear models respectively. Feature engineering (best-subset "+") adds up to ~4% (Linear → Linear+).
**Timing (Table V):** Linear+ trains in 5.6 s (3v3) / 3.7 s (6v6), infers in 5.0e-05 s / 8.0e-05 s; NN+ trains in 470 s / 160 s, infers in 2.4e-02 s / 2.8e-02 s. Linear inference is ~100×+ faster (≈480× on 3v3: 2.4e-02 / 5.0e-05) for an F1 sacrifice of 0.62→0.60 (3v3) and 0.71→0.68 (6v6) — i.e., ~3–4% relative, slightly more than the abstract's "less than ~2%" claim. Paper's words: "training and the inference times of the linear models are approximately 10x and 100x faster, respectively, compared to the corresponding times of the neural network-based models."
**Significant features (Table VI, all p < 0.001):** avg_freq_dropout +1.128 (3v3) / +1.164 (6v6); avg_assists_abs_diff +0.889 / +0.741; avg_freq_defense +0.850 / +0.918; avg_freq_left +0.856 / +0.504; avg_freq_right +0.843 / +0.494; avg_freq_wins −0.334 / −0.178 (negative — more past wins predicts less balance); cnt_players +0.117 / +0.142. Caveat stated: skill rating was not among the most significant features, but the dataset contains only matches between teams of already-close skill, so no conclusion about skill-rating importance can be drawn.

## 8. Code / data availability
None stated. Proprietary EA game data. Libraries named: scikit-learn, Keras.

## 9. Leakage
Cumulative player features are updated online as matches complete; features are retrieved "containing the latest features" at prediction time. The time-ordered sliding-window validation avoids the classic shuffle-leak, but the paper does not state the exact feature-freeze cutoff relative to the match being predicted — a mild leakage risk if features incorporate the target match's own outcome. Skill-range restriction (matches already balanced on skill) is a selection bias that inflates the apparent irrelevance of skill ratings (acknowledged).

## Limitations
- Proprietary esports data; no public replication possible; unnamed game.
- The 3v3 Dummy F1 of exactly 0.00 suggests degenerate label balance handling in that split.
- Only 2 team sizes, one game, one publisher; generalization to other sports games explicitly untested.
- The "~2% sacrifice" speed/accuracy claim is slightly rosier than the tabled numbers (3–4% relative F1 drop).
- Absolute/relative improvement percentages (~15%/~2%, ~16%/~5%) are given without the exact computation.
- Feature descriptions truncated ("we do not present all of the match features due to restricted space"); correlation-matrix pruning omitted.
- Models never deployed live; engagement claims are hypothetical pending A/B tests.

## 10. GSE overlap vs existing-research-map
- Repo already inventories Elo/Glicko/TrueSkill/Bradley-Terry/Plackett-Luce and has Massey/Sagarin/Colley and nfelo — the scalar-rating machinery this paper argues is insufficient. The paper's dispersion features (within-team std, max–min skill gaps, absolute cross-team differences) are not in the repo's feature canon and complement Hermes's opp-adj-EPA work.
- The repo's market-relative learning uses win probabilities; the paper's margin-regression target connects to spread/total modeling, a gap-list area (in-play spread/total surfaces are thin).
- No duplication: no repo work regresses score *difference* with team-dispersion features, and no existing paper read makes the linear-≈-NN-at-100×-speed argument for sports.

## 11. Implementation spec (GSE adaptation)
- **Margin-distribution head for the engine:** add a regression head predicting signed margin (score differential) alongside the win-probability head. Train on nflverse game data with closing spreads/totals as features; evaluate both the implied win probability and the margin distribution. Per this paper, expect the margin target to carry more balance/competitiveness signal than the binary outcome — use it to sharpen totals and ATS probabilities and to define a "competitiveness" abstention trigger (|predicted margin| < θ → low-confidence game, reduce stake or abstain).
- **Dispersion features:** for each game, engineer within-unit dispersion features — std of positional EPA across starters, max–min positional rating gaps, absolute differences of team-average unit metrics (OL vs DL pressure rates, etc.), mirroring the paper's team-std and absolute-difference construction. Feed into the existing linear/logistic stack first (the paper shows linear ≈ NN with good features) before any deep model.
- **Latency argument:** keep the production scoring path linear; reserve NNs for offline research. Target: same accuracy within 3–4% relative at 100× inference speed.
- Effort: 2–3 days for dispersion features + margin head; one week for the full abstention-threshold calibration.

## 12. Reproducible test
Dataset: nflverse 2015–2025 regular-season games with closing spreads and totals. Task A: predict ATS cover (binary) vs Task B: regress final margin, then derive cover from the margin distribution. Same feature set, linear models, time-ordered walk-forward validation (train on seasons ≤ t, test season t+1). Baseline to beat: Task A log-loss/accuracy. Success: Task B's implied-cover log-loss beats Task A by ≥0.01 on 2022–2025 holdout, and its |margin| < θ competitiveness flag identifies games where the engine's realized Brier score is ≥0.05 worse than average (a useful abstention signal).

## 13. Numeric gate
ADAPT confirmed if the margin-regression head improves implied-cover log-loss by ≥0.01 on 2022–2025 walk-forward holdout vs the binary win/cover head on identical features, OR if the |margin|<θ flag isolates a bottom-decile-Brier subset with ≥0.05 Brier degradation (validating it as an abstention trigger). Otherwise reject.

## 14. Improvement experiment
The paper treats θ as a global hyperparameter; make it team- and situation-dependent: learn θ_home(team, spread_bucket) — blowout-prone teams (high variance) vs grind teams need different competitiveness thresholds. Hypothesis: a learned per-team θ improves the abstention trigger's precision (fewer false skips) by ≥20% vs the global θ, because margin variance is strongly team-heteroskedastic in the NFL (dome vs weather teams, elite QBs vs game managers).

## 15. Verdict

**ADAPT** — two transferable results for GSE: (1) regressing the final score *difference* as the prediction target beats win-probability models for balance judgments (~15%/~2% gains), directly supporting margin-distribution modeling for NFL spreads/totals; (2) a well-engineered linear model nearly matches a neural network at ~100× inference speed. The feature-engineering lesson (within-team dispersion and absolute cross-team differences beat scalar mean ratings) ports to NFL unit-matchup features.

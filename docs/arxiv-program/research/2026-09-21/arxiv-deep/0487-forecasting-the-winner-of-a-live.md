# [0487] Forecasting the Winner of a Live Tennis Match (arXiv:2609.07617v1)

**Citation:** Charles Xie, Aneesh Muppidi (2026). *Forecasting the Winner of a Live Tennis Match*. arXiv:2609.07617v1 [cs.LG]. URL: https://arxiv.org/abs/2609.07617v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 57,864 chars).
**Verdict:** ADAPT — the hybrid Trace architecture (Markov recursion + Elo pre-match prior + Bayesian-shrinkage live updates + gradient-boosting stack) ports directly to NFL live win-probability modeling with football-specific substitutions.

## 1. Research question
How should pre-match information (player strength) and live in-match information (score state, serve performance) be integrated to produce accurate, well-calibrated live win probabilities in tennis? The paper compares five approaches within one strictly chronological evaluation — symmetric Markov, Elo-asymmetric Markov, serve-shrink Markov, a histogram gradient-boosting model (HGBM) on live features, and Trace (a hybrid stacking the Markov models' outputs with live features in an HGBM) — and asks which information source matters at which stage of a match.

## 2. Dataset / schema
- **Jeff Sackmann Grand Slam point-by-point data** (public, github.com/JeffSackmann/tennis_slam_pointbypoint): after cleaning, **8,222 matches, 1,505,355 point-level prediction states** (rows = match state before each point). 21.8% of raw matches excluded (2,286: walkovers, invalid/non-tied final sets, <20 points, unidentified server/winner). ATP 4,181 / WTA 4,041.
- **Jeff Sackmann ATP/WTA match results** for Elo computation; Elo matched to 96.0% of prepared matches (7,896).
- **Splits (strictly chronological):** train 2011–2021 (6,774 matches, 1,238,084 states), validation 2022 (473 / 87,439), test 2023–2024 (975 / 179,832).
- Schema per row: score state (best_of, sets/games/points won, server, tiebreak flag), live serve performance (serve-point win rates + sample counts per player), rally/ace context (rally_avg, recent_rally_avg, ace rates), derived state summaries (sets_diff, games_diff, score_diff, pts_played); target = final match winner (stored separately; every prediction uses only pre-point information).
- Code: https://github.com/cx-57/live-tennis-research (Python 3.12.3, scikit-learn 1.9.0, XGBoost 3.3.0, LightGBM 4.6.0).

## 3. Method / model
- **Markov score recursion (backbone):** from point-serve probabilities p1, p2, per-point win prob q = p1 (p1 serves) or 1−p2 (p2 serves) (eq. 3); state s = (S1,S2,G1,G2,P1,P2,σ,τ,b) (eq. 4); **V(s) = q(s)V(T1(s)) + (1−q(s))V(T2(s))** (eq. 5) with terminal conditions on sets won (eq. 6); deuce formula **D(q) = q²/(q²+(1−q)²)** (eq. 7); tiebreak serve sequence 1,2,2,1,1,2,2,… (eq. 8).
- **Symmetric Markov:** pa = pb = p, p grid-searched on validation {0.60,…,0.65} → selected 0.65/0.64/0.60 at 25/50/75% progress. Score-only baseline.
- **Elo-asymmetric Markov:** Elo from ATP/WTA results, start 1500, expected prob **q_{i,t} = 1/(1+10^{(Rj,t−Ri,t)/400})** (eq. 1), update **R_{i,t+1} = R_{i,t} + K_{i,t}(S_{i,t} − q_{i,t})**, **K_{i,t} = 250/(m_{i,t}+5)^{0.4}** (eq. 2), m = matches played. Elo gap d → serve edge **e = clip(αd, −0.15, 0.15)** (eq. 11); **pa = clip(β+e, 0.45, 0.88), pb = clip(β−e, 0.45, 0.88)** (eqs. 12–13); β grid {0.59–0.65}, α grid {4,6,9,13,18,22}×10⁻⁵ → selected (β,α): (0.64, 1.3×10⁻⁴), (0.59, 1.3×10⁻⁴), (0.59, 1.3×10⁻⁴) at 25/50/75%.
- **Serve-shrink Markov:** Bayesian shrinkage of live serve rate toward Elo prior: **θ̂ = (n/(n+κ))θ̂_live + (κ/(n+κ))θ_prior** (eq. 14); **pa = (n1 r1 + κπ1)/(n1+κ), pb = (n2 r2 + κπ2)/(n2+κ)** (eq. 15); κ grid {40,80,160,320,640} → selected 640/160/40 at 25/50/75% (shrinkage weakens as the match progresses).
- **HGBM baseline:** scikit-learn HistGradientBoostingClassifier on score + live features only (eq. 16: p̂_H = g_φ(z)); 4 configs evaluated by validation log loss → best refit on train+val; XGBoost/LightGBM tried, HGBM won on validation log loss.
- **Trace (hybrid):** feature vector x(s) = [p̂_M(s), p̂_S(s), logit(p̂_M), logit(p̂_S), p̂_S−p̂_M, z(s)] (eq. 17) → **p̂_Trace(s) = f_θ(x(s))** (eq. 19), f_θ = HGBM (4 configs by validation log loss: (lr, max_leaf_nodes, l2) ∈ {(0.03,7,1.0),(0.03,15,1.0),(0.05,7,1.0),(0.05,15,3.0)}; log loss; early stopping; max 250 iterations; random states 19/30/6 for the 25/50/75% checkpoint models).

## 4. Equations & assumptions
- Elo: eqs. (1–2) above; Markov recursion eqs. (3–8); Elo→serve edge eqs. (10–13); shrinkage eqs. (14–15); Trace stack eqs. (17–19); log loss eq. (20); calibration bins eqs. (21–22).
- **Assumptions:** point outcomes conditionally independent given serve probabilities (Markov); Elo difference maps linearly (clipped) to serve-probability edge; live serve rate is a noisy estimate of true current serve skill justifying shrinkage toward the prior; no surface-specific strength (listed limitation); Grand Slam matches only.

## 5. Features / target
- **Inputs:** score state (format, sets/games/points, server, tiebreak), live serve rates + counts, rally averages, ace rates, derived diffs (sets_diff, games_diff, score_diff, pts_played), plus the two Markov models' probabilities, their logits, and their difference (Trace only).
- **Target:** binary — player 1 (first-listed) wins the match. Horizon: from current point to match end. Evaluation at 25/50/75% match progress + all points.

## 6. Validation design
Strictly chronological: train 2011–2021, validation 2022 (all hyperparameter selection by validation log loss), test 2023–2024. Metrics: accuracy (checkpoint + all-point), binary log loss (eq. 20) at checkpoints, reliability diagrams (Guo et al. binning), tour-split (ATP/WTA) accuracy curves. Baselines compared within the same protocol; plus a contextual (non-comparable) external benchmark: DeepTennis LSTM (79.5% overall; 73.2/84.9/89.2% at 25/50/75% on a non-chronological 2011–2019 split, flagged by the authors as leakage-suspect). The authors also re-ran their models on DeepTennis's split for a rough comparison (Table 6).

## 7. Numerical results / baselines
- **Table 4 — accuracy (test):** at 25%/50%/75% / all points: Symmetric Markov 0.6851/0.7703/0.8544 / 73.21%; Elo-asymmetric 0.7575/0.8050/0.8648 / 77.56%; Serve-shrink 0.7564/0.7946/0.8720 / 77.68%; HGBM 0.6944/0.7918/0.8738 / 73.98%; **Trace 0.7606/0.8215/0.8834 / 77.84%** — Trace highest in every column; largest lead mid-match (~40–70% progress).
- **Table 5 — log loss (test):** 25%/50%/75%: Symmetric 0.6292/0.5363/0.3498; Elo-asym 0.5210/0.4549/0.3096; Serve-shrink 0.5142/0.4266/0.2842; HGBM 0.5376/0.3788/0.2299; **Trace 0.4753/0.3530/0.2002** — Trace lowest at all checkpoints. Serve-shrink beats Elo-asymmetric on log loss at every checkpoint (better probability quality) even when accuracy is similar.
- **Calibration (Fig. 3):** Trace reasonably well calibrated, especially at 25% and 50% progress.
- **Key dynamics:** HGBM weak early (below symmetric Markov at 25%) but strongest single model late (75%: acc 0.8738, log loss 0.2299 — best of the four non-Trace models); serve-shrink's κ falls 640→160→40 as evidence accumulates. WTA accuracy curves fluctuate more than ATP (authors' hypothesis: 66% vs 79% service-hold rates → more breaks → faster swings; explicitly flagged as untested correlation).
- **Table 6 (leakage-suspect 2011–2019 split, for context):** Trace 77.66/83.84/88.96 / 81.30% all-points — competitive with DeepTennis's 73.2/84.9/89.2 / 79.5% despite DeepTennis's split advantage.

## 8. Code / data availability
Code + reproducibility materials: https://github.com/cx-57/live-tennis-research. Data: Jeff Sackmann's public tennis_slam_pointbypoint, tennis_atp, tennis_wta repos. Fully replicable.

## 9. Leakage & limitations
- **Stated limitations:** serve/return features only (no return-specific performance); no surface-specific Elo/stats; missing fatigue/injury/weather/handedness/style; Grand Slams only (may not generalize to tour events).
- **Adversarial notes:** the pre-match Elo uses all ATP/WTA results up to the match — fine — but the Elo update rule's K-factor (250/(m+5)^0.4) and the serve-edge slope α are validation-tuned, and three separate checkpoint models (25/50/75%) are trained with different random states — a mild form of checkpoint-specific tuning that flatters the "trajectory" narrative. Accuracy-at-progress-checkpoints depends on match length (longer matches have more states); the all-points metric overweights long matches. The DeepTennis comparison is explicitly non-chronological and the authors correctly flag it. No betting-ROI or beat-the-market analysis — accuracy/log-loss only, no odds baseline (Kovalchik's 70% pre-match accuracy / market consensus is cited, not beaten here).
- **External validity to NFL:** the architecture transfers, the sport doesn't. Tennis has a closed scoring recursion (exact Markov win prob from state); football's state space is vastly larger and non-Markovian in the same clean sense — but the *pattern* (pregame prior + Bayesian-shrinkage live updates + GBM stack of model outputs) is exactly how a live NFL WP model should be built.

## 10. GSE overlap
Checked against `existing-research-map.md`: Garrett's corpus has pre-match team strength (Elo, Glicko, TrueSkill mentioned; benbbaldwin tiers; nfelo) and win-probability work (in-game soccer WP 1906.05029, conformal WP 2208.08598, 4th-down WP literature) — but **no live-WP hybrid that stacks a structural game model with a GBM on live features**, and no Bayesian-shrinkage-of-live-stats-toward-pregame-prior design. The conformal-WP paper (2208.08598) is complementary (uncertainty bands), not duplicative. This is a **new capability**: the specific hybrid recipe (structural recursion outputs + logits + disagreement feature, stacked in a GBM with shrinkage-tuned live inputs).

## 11. GSE implementation spec
Port Trace to NFL live win probability:
1. **Data:** nflverse play-by-play 2020–2025 (score differential, time remaining, down/distance/yardline, timeouts, possession) + pregame prior (GSE engine spread/total → win prob, or Elo).
2. **Structural model (tennis Markov → football equivalent):** replace exact recursion with an empirical state model — e.g., a precomputed WP surface over (score diff, time, down, distance, yardline, timeouts) from historical nflverse data, or nflfastR's wp; this is the "p̂_M" analog. A second variant shrinks live efficiency (EPA/play to date) toward the pregame prior via the paper's eq. 14 with κ tuned by validation log loss — the "p̂_S" analog.
3. **Stack:** HGBM on [p̂_M, p̂_S, logits, p̂_S−p̂_M, live features (EPA/play splits, success rate, turnover margin, pace)] → live WP; train on chronological splits (e.g., train ≤2022, val 2023, test 2024–2025).
4. **Serving:** precompute the WP surface + pregame priors; per-play inference = two model lookups + one GBM predict (milliseconds).
5. **Effort:** ~2–3 days for the pipeline (nflverse loaders exist in gse-lab), 1 day for the shrinkage-κ tuning, 1 day for calibration analysis. Uses only free data.

## 12. Reproducible test
Dataset: nflverse play-by-play 2024–2025 regular season, chronological (train ≤2023, test 2024–2025). Metric: log loss + ECE on live WP evaluated at game-progress checkpoints (25/50/75% of elapsed game time) and all plays. Baselines to beat: (a) pregame win prob held constant; (b) nflfastR wp as a pure structural model. Test the Trace-port: HGBM stack of [structural WP, shrinkage WP, logits, disagreement, live features].

## 13. Acceptance / rejection gate
**Adopt the hybrid if** the Trace-port beats the best single baseline (nflfastR wp) by ≥0.01 log loss at ≥2 of 3 progress checkpoints on the 2024–2025 test window AND is at least as well calibrated (ECE within 0.005); **reject otherwise** (fall back to the structural WP + temperature scaling, per the existing calibration stack).

## 14. Improvement experiment
Go beyond the paper: add a market-relative feature — the live line movement (pregame spread vs. current live spread from the odds API) as an extra stack input, testing whether the market's live read adds information beyond the statistical live features. Hypothesis: live-market features improve log loss late in games (market aggregates injury/news the box score misses), which the tennis paper couldn't test (no odds data). This directly extends Trace into GSE's market-relative lane.

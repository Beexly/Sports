# [1460] Evaluating Soccer Match Prediction Models: A Deep Learning Approach and Feature Optimization for Gradient-Boosted Trees (arXiv:2309.14807)

**Citation:** Calvin Yeung, Rory Bunker, Rikuhei Umemoto, Keisuke Fujii (2023). *Evaluating Soccer Match Prediction Models: A Deep Learning Approach and Feature Optimization for Gradient-Boosted Trees*. arXiv:2309.14807v1 [cs.LG]. URL: https://arxiv.org/abs/2309.14807
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, converted via pdftotext; 8,516 words).
**Verdict:** ADAPT — adopt the ratings-and-market-baseline discipline (Berrar pi-ratings as a beaten-everywhere yardstick, market-implied probabilities as the true bogey) and the challenge-evaluation protocol; do not adopt the deep architectures, which lost to plain gradient-boosted trees on the same features.

## 1. Research question
Which modeling approach best predicts professional soccer matches on a strict, real-world test set: deep neural networks (Inception + Transformer blocks fed a five-match recency matrix) or gradient-boosted trees (XGBoost/CatBoost) with extensive feature engineering and selection — evaluated on exact home/away goal counts and win/draw/loss probabilities in the 2023 Soccer Prediction Challenge?

## 2. Dataset / schema
The 2023 Soccer Prediction Challenge dataset: 51 leagues, 2001 through April 4, 2023, **over 300,000 matches**. Prediction set: **736 matches from 44 leagues**, April 14–26, 2023. The authors manually appended matches played April 4–14 (the gap between the data cutoff and the prediction set) before training. Schema per match: date, league, home/away team identifiers, full-time and half-time home/away goals, league-wide average home/away goals, 5-match-form ratings (Berrar ratings/pi-ratings implied by features), and 205 engineered features (attack/defense strength deltas, rest, etc.). Not stated in paper: the public challenge repository. Dataset itself proprietary to the challenge organizers; code released by the authors.

## 3. Method / model
Two families, both trained on three five-year training windows ending before validation rounds chosen to mirror the 2018–19, 2019–20, and 2020–21 seasons:
- **Deep models:** a five-match recency matrix (per-match goal/goals-conceded summaries) passed through an Inception-style block, a Transformer encoder, and a 10-layer MLP (the "TE+MLP" and "Inception+TE+MLP" variants); plus LSTM+MLP and GRU+MLP baselines.
- **Gradient-boosted trees:** XGBoost and CatBoost over 205 features with multi-stage feature selection; variants include XGBoost+Berrar (pi-ratings as features), CatBoost with a selected subset, and CatBoost+pi (CatBoost plus pi-rating features).
- Baselines: league-average goals, team-average goals, Berrar (pi) ratings alone, historical W/D/L frequencies, and "always home win."

## 4. Equations & assumptions
No closed-form equations stated; metrics are defined as:
- Rank Probability Score (RPS) for the W/D/L probability task (cumulative form over the three ordered outcomes).
- Root Mean Squared Error (RMSE) for the exact home/away goal-count predictions.
Assumptions: match outcomes are treated as independent across matches; the three five-year windows are assumed comparable (including the COVID-shortened 2019–20 validation round, which the authors do not special-case); draws are handled by the RPS structure rather than explicit modeling.

## 5. Features / target
Features: 205 engineered features per match, exact list not reproduced in the paper (code repository carries them); explicitly named are pi-rating-derived features (expected goals, team strength deltas), recent-form summaries, and league baselines. Targets: (a) exact number of home goals and away goals (integer, regression), (b) P(home win), P(draw), P(away win) (probability vector).

## 6. Validation design
Three time-ordered validation rounds (2018–19, 2019–20, 2020–21 seasons), each with its own preceding five-year training window — strictly chronological, no leakage across rounds. Final test: the challenge's 736 hold-out matches (April 14–26, 2023), scored by the challenge's own RMSE and RPS against all entrants, including a bookmaker-model entry (0.2063 RPS reported as the market reference).

## 7. Numerical results / baselines
Quoted exactly from the paper's validation tables:
- **Exact-score task (validation RMSE):** Berrar ratings **1.0047**; team average 1.0206; XGBoost+Berrar 1.0212; league average 1.0346; selected-feature CatBoost 1.2162; CatBoost+pi 1.2356; TE+MLP 1.5063.
- **Probability task (validation RPS):** CatBoost+pi **0.2085**; Inception+TE+MLP 0.2098; LSTM+MLP 0.2105; TE+MLP 0.2111; GRU+MLP 0.2116; XGBoost+Berrar 0.2141; historical W/D/L baseline 0.2303; selected-feature CatBoost 0.2416; always-home-win 0.4450.
- **Challenge (736 test matches):** authors' entries scored exact-score RMSE **1.8169** versus the winner's **1.6235**; probability RPS **0.2195** versus the bookmaker model entry's **0.2063**.
Paper's interpretation: ratings and markets are the floor everything else must beat; the deep models' Transformer variants edged trees on RPS in validation but collapsed in live competition (author concedes generalization issues).

## 8. Code / data availability
Code: https://github.com/calvinyeungck/Soccer-Prediction-Challenge-2023. Dataset: the 2023 Soccer Prediction Challenge dataset (challenge-hosted; proprietary).

## 9. Leakage & limitations
- The deep-model training protocol is under-specified (batch size, learning-rate schedule, early-stopping rule not stated) — the "deep learning" arm is not truly replicable from the paper.
- Validation RPS winner (Inception+TE+MLP, 0.2098) vs CatBoost+pi (0.2085) is a hairline gap; no significance testing or confidence intervals anywhere.
- Challenge test window is only 736 matches over 13 days — a thin final test, and the authors' own models degraded relative to their validation numbers (RPS 0.2085 → 0.2195).
- 2019–20 COVID-season validation round is not special-cased; draw handling is metric-implicit.
- External validity to NFL: soccer is low-scoring with ~25% draws; the exact-score RMSE framing does not map to spread/total NFL markets. The methodological lessons (ratings baselines, market-as-bogey) transfer; the models do not.
- Be adversarial: the paper's real contribution is a cautionary tale — elaborate architectures underperform well-featured trees plus pi-ratings. Any internal claim that a fancier model "wins" must be held to this paper's bar.

## 10. GSE overlap
Per the existing-research map: GSE's repo already inventories Elo, Glicko, TrueSkill, Bradley-Terry, Dixon-Coles, Skellam, and Poisson scoring models (26-metric catalog) and has Dixon-Coles-style thinking in the corpus. The map notes market microstructure (closing-line value, de-vigged consensus) as an existing GSE lane. What's NEW here: (a) a documented, fully worked head-to-head where pi-ratings alone beat every deep model on exact-score RMSE — a citation for the GSE "ratings-first" discipline in engine-benchmark discussions; (b) the 2023 challenge's bookmaker-model reference point (0.2063 RPS) as an external market benchmark convention GSE can mirror when publishing engine results; (c) an anti-pattern: 205-feature selection pipelines can *hurt* (selected-feature CatBoost was the worst tree variant at 1.2162 RMSE / 0.2416 RPS). Extension and cautionary evidence, not duplication.

## 11. GSE implementation spec
- Build the "baselines board": for every GSE prediction surface (NFL spread, total, moneyline; props later), maintain a living leaderboard of Berrar-style pi-ratings (already in catalog — implement on nflverse scores back to 2006), de-vigged consensus odds, and historical outcome frequencies. No model ships unless it beats all three out-of-sample.
- Adopt the challenge protocol internally: freeze a 736-game-scale hold-out (e.g., one full NFL season of games, 272 regular-season + postseason) scored blind by a third party or a locked script; report RMSE (margins) and RPS-style metrics on the ordinal cover result (cover/push/not).
- Effort: pi-ratings on nflverse, 2–3 days; blind hold-out harness, 1 day; baselines board as a scheduled job, 2 days.

## 12. Reproducible test
Dataset: nflverse play-by-play + schedules, 2010–2025. Baseline to beat: (a) pi-ratings computed as-of each game week, (b) de-vigged Pinnacle closing moneyline, converted to implied probabilities. Metric: log loss and Brier on moneyline predictions; RMSE on margin-of-victory. Test window: 2024–2025 seasons (out-of-sample), chronologically split. A candidate model (e.g., gradient-boosted trees on team-strength + market features) is run strictly as-of-date; it passes only if it beats both baselines on both metrics in both seasons.

## 13. Acceptance / rejection gate
ADOPT the baselines-board discipline if the pi-ratings baseline reproduces its soccer-paper behavior on NFL (i.e., beats or matches our current engine's simple variants on 2024–2025 hold-out); ADAPT as above regardless. Any new complex model is REJECTED unless it beats pi-ratings AND de-vigged consensus by ≥0.003 Brier and ≥0.005 log-loss on both hold-out seasons — the margin below which this paper shows noise dominates.

## 14. Improvement experiment
Run the exact paper comparison on NFL data: XGBoost over ~100 engineered features (rest, travel, EPA-based strength, market movement) vs the same features plus pi-rating deltas vs a Transformer-over-recent-games architecture, all trained strictly chronologically and evaluated on a blind season hold-out. Hypothesis from this paper: the pi-featured tree wins, and the Transformer loses — but if the Transformer wins on *NFL spread residuals* (higher-scoring, no draws), it would suggest the paper's deep-model failure is soccer-specific (draw-heavy, low-event-rate) rather than general. Either outcome is publishable internally and sharpens the "ratings-first" rule.

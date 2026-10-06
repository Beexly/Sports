# Ledger 1808 — Offensive Lineup Analysis in Basketball with Clustering Players Based on Shooting Style and Offensive Role

## 1. Citation and explicit full-text-read statement

- **arXiv:** 2403.13821
- **Title:** Offensive Lineup Analysis in Basketball with Clustering Players Based on Shooting Style and Offensive Role
- **Authors:** Kazuhiro Yamada, Keisuke Fujii (Nagoya University / RIKEN AIP)
- **Full-text-read statement:** I read the complete paper full text (abstract, introduction, shooting-style pipeline with PCA/Wasserstein/Ward clustering, offensive-role pipeline with fuzzy C-means, adjusted-OFFRTG target construction, SVM/LightGBM/NGBoost/Bayesian-hierarchical models, full results tables including role-pair effects, discussion of idiosyncratic failures, and references) from the ar5iv HTML full-text rendering, saved to `/tmp/wave4b-dfs2/papers/2403.13821.html` with extracted text at `/tmp/wave4b-dfs2/txt/2403.13821.txt`. Raw paper text remains in `/tmp`; nothing was committed to the repo.

## 2. Research question

Can lineup offensive efficiency (adjusted OFFRTG) be predicted from the *composition* of player shooting styles and offensive roles — and which style/role pairs have positive or negative interaction effects?

## 3. Method/model

Two clustering pipelines, then supervised prediction:

- **Shooting-style pipeline:** 17 tracking-derived shot features per player → PCA to 9 dims → pairwise **Wasserstein (earth-mover) distances** between player shot distributions → **Ward hierarchical clustering** → **13 shooting-style clusters**.
- **Offensive-role pipeline:** playtype data → **fuzzy C-means** → **10 offensive roles**.
- **Target:** lineup adjusted OFFRTG (lineups with > 50 shared minutes).
- **Models:** SVM, LightGBM, NGBoost (probabilistic), plus a **Bayesian hierarchical regression** that estimates two-role combination (interaction) effects.

## 4. Mathematics, equations, assumptions

- Wasserstein-1 distance between empirical shot-location distributions as the style dissimilarity; Ward linkage on the distance matrix.
- Fuzzy C-means: minimize ΣᵢΣₖ uᵢₖᵐ‖xᵢ − cₖ‖² with membership exponents; 10 roles.
- NGBoost: natural-gradient boosting for probabilistic regression (mean + variance of OFFRTG).
- Bayesian hierarchical model: lineup OFFRTG = global intercept + role main effects + role-pair interaction effects with partial pooling.
- **Assumptions:** (a) adjusted OFFRTG is a stable lineup target despite its noise; (b) 2015–16 shooting clusters transfer across seasons; (c) role-pair effects are additive and associative (not causal).

## 5. Dataset/schema

- **Shooting style:** 41,160 shots from 630 NBA games, 2015–16 season, 17 tracking features.
- **Offensive roles:** playtype data, 2015–16 through 2022–23, **3,051 player-seasons**.
- **Lineup target:** NBA lineup data, adjusted OFFRTG, lineups with > 50 shared minutes.

## 6. Features and target

- **Features:** cluster-membership indicators (13 shooting styles / 10 roles) for the 5 lineup members; role-pair indicators for the hierarchical model.
- **Target:** lineup adjusted offensive rating (points per 100 possessions, opponent/situation adjusted).

## 7. Validation design

- Supervised train/test evaluation of OFFRTG prediction (RMSE, MAE, NLL for NGBoost).
- **Baseline:** "prior-style" models that use only previous-season information (prior-style SVM / prior-style NGBoost) — i.e., does the composition add value over naive priors?
- Role-pair effects estimated with Bayesian partial pooling and reported with credible intervals.

## 8. Exact results and baselines with numbers

Shooting-style prediction:
- Best SVM RMSE **4.516** vs. prior-style baseline SVM RMSE **4.380** (composition did *not* beat the prior baseline here).

Offensive-role prediction:
- NGBoost RMSE **4.786**, MAE **3.869**, NLL **3.066** vs. prior-style NGBoost RMSE **4.850**, MAE **3.942**, NLL **3.089** (composition wins on all three).

Largest role-pair interaction effects (Bayesian hierarchical):
- Positive: Isolation Attacker + Wing with Handle **+0.3460**; Isolation Attacker + Transition Attacker **+0.2900**; Primary Ball-Handler + Spot-up Shooter **+0.2055**.
- Negative: Post-up Big + Wing with Handle **−0.4720**; Stretch Big + Transition Attacker **−0.4145**.

## 9. Code/data availability

- No public code URL was given in the extracted text.
- Data: NBA tracking/playtype/lineup data (partly proprietary).

## 10. Leakage and limitations

- Shooting-style clusters use only 2015–16 data; the game has evolved (spacing, pace) since.
- Adjusted OFFRTG is a noisy target; the 4.5–4.9 RMSE is large relative to the signal.
- The model fails on idiosyncratic systems/players (Jokic, Spurs, Warriors) — composition features miss scheme effects.
- Role-pair effects are associative; no causal identification (lineup selection bias: good coaches assemble complementary roles).
- Shooting-style features did not beat the prior baseline — only the role pipeline added value.

## 11. GSE overlap

- This is GSE's **lineup-composition interaction** lane: for NBA fantasy/prop projections, a player's minutes/usage/assist/scoring projection should condition on the *roles* of the other four players on the floor — the role-pair effects (+0.35/−0.47 scale) are directly usable as interaction features.
- Complements ledger 1805 (dummy RAPM: who is on the floor) and ledger 1807 (NBA2Vec: learned representations) — roles are the interpretable middle layer.

## 12. Implementation specification

1. **Inputs:** GSE's NBA playtype/tracking-derived shot data; lineup stints with OFFRTG.
2. **Cluster:** recompute shooting styles (Wasserstein + Ward) and roles (fuzzy C-means) on recent seasons (fix the 2015–16 staleness).
3. **Features:** for each projected lineup, emit role indicators + the top role-pair interactions from the paper as engineered features (±0.2–0.5 OFFRTG-scale adjustments).
4. **Model:** NGBoost (or GSE's existing probabilistic head) predicting player-level fantasy points with lineup-role features; keep the Bayesian hierarchical pair-effect estimator as an offline diagnostic.
5. **Use:** adjust usage/assist/points props when lineups change (injury/trade), especially for role pairs with |effect| > 0.25.

## 13. Reproducible test

- Rebuild the role pipeline on 2022–23–2024–25 playtype data; confirm NGBoost with role features beats a prior-only baseline on RMSE/MAE/NLL for held-out lineups.
- Unit test: the Isolation Attacker + Spot-up Shooter style pair must carry a positive interaction sign consistent with the paper's direction.

## 14. Numeric acceptance/rejection gate and improvement experiment

- **Gate (ADAPT):** role-composition NGBoost beats the prior-style baseline on all three metrics (RMSE 4.786 < 4.850, MAE 3.869 < 3.942, NLL 3.066 < 3.089), and the hierarchical model yields interpretable, signed pair effects up to ±0.47. Accept as ADAPT (not ADOPT: shooting-style pipeline failed to beat baseline; target is noisy).
- **Improvement experiment:** replace hard cluster assignments with fuzzy membership weights as continuous features, and add a scheme/team random effect to absorb the Jokic/Spurs/Warriors idiosyncrasy. Success = RMSE ≤ 4.5 on the same lineup-prediction protocol (≥ ~6% relative improvement over 4.786).

**Verdict:** ADAPT — Lineup role-composition features with quantified pair interactions; adopt the 10-role fuzzy pipeline and the ±0.2–0.5 interaction adjustments for GSE's NBA lineup-conditioned projections, with fuzzy-membership features and scheme random effects as the improvement path.

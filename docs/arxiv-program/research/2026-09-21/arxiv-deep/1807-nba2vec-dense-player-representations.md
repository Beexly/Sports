# Ledger 1807 — NBA2Vec: Dense Feature Representations of NBA Players

## 1. Citation and explicit full-text-read statement

- **arXiv:** 2302.13386
- **Title:** NBA2Vec: Dense Feature Representations of NBA Players
- **Authors:** Webster Guan, Nauman Javed, Peter Lu (MIT)
- **Full-text-read statement:** I read the complete paper full text (abstract, introduction, embedding architecture, play-outcome model, validation on held-out playoff games, embedding analysis, best-of-seven simulations, matchup-optimizer example, limitations, and references) from the ar5iv HTML full-text rendering, saved to `/tmp/wave4b-dfs2/papers/2302.13386.html` with extracted text at `/tmp/wave4b-dfs2/txt/2302.13386.txt`. Raw paper text remains in `/tmp`; nothing was committed to the repo.

## 2. Research question

Can dense learned player embeddings — trained to predict play outcomes from the 10 players on the floor — capture latent player roles and matchup structure well enough to serve as features for downstream prediction (and to simulate series outcomes)?

## 3. Method/model

- Each of **1,551 players** gets an **8-dimensional embedding**.
- For a play: the 5 offensive players' embeddings are averaged, the 5 defensive players' embeddings are averaged; the two averages are concatenated, passed through a **128-unit ReLU hidden layer**, then a softmax over **23 play-outcome classes**.
- Training minimizes cross-entropy (equivalently KL divergence between predicted and empirical outcome distributions).
- Post-hoc: embeddings are analyzed for role clustering and correlation with box-score stats; a lineup-matchup simulator plays 1,000 best-of-seven series.

## 4. Mathematics, equations, assumptions

- p(outcome | O₁..O₅, D₁..D₅) = softmax(W₂·ReLU(W₁·[ē_off; ē_def] + b₁) + b₂), where ē = mean of the 5 player embeddings.
- **Assumptions:** (a) permutation invariance via averaging — player-specific interactions and sequencing are discarded; (b) play outcomes are conditionally independent given the 10 embeddings; (c) 8 dimensions suffice to encode role-relevant variation.
- The averaging assumption is the main structural limitation (no interaction terms between specific offensive/defensive player pairs).

## 5. Dataset/schema

- **~3.7 million plays** (regular season + playoffs through 2017), 1,551 players, 23 outcome classes.
- **Validation:** final 25 playoff games (5,102 plays); lineup matchups with > 15 plays.

## 6. Features and target

- **Features:** 10 on-court player identities → their learned 8-dim embeddings.
- **Target:** play outcome class (23 classes: made/missed shot types, turnovers, fouls, etc.).

## 7. Validation design

- Held-out validation on the final 25 playoff games; metric = mean KL divergence between predicted and empirical outcome distributions over lineup matchups with > 15 plays.
- Divergence-vs-sample-size curve: KL plateaus near **30 plays** per matchup.
- Qualitative: embedding clusters vs. known roles; correlations with rebounds/assists/three-point rates.
- Simulation: 1,000 best-of-seven series for selected 2017 playoff matchups; a "matchup optimizer" swaps a 5th man against the Warriors' death lineup.

## 8. Exact results and baselines with numbers

- Mean validation KL divergence ≈ **0.3** (no strong probabilistic baseline reported — a gap).
- KL divergence plateaus at ~**30 plays** per lineup matchup.
- Embeddings cluster recognizable roles and correlate significantly with rebounds, assists, and 3P rates.
- Matchup optimizer vs. Warriors death lineup (series win probability):
  - Nene as 5th man: **37.3%**
  - Trevor Ariza: **34.4%**
  - Carmelo Anthony: **33.4%**

## 9. Code/data availability

- No public code URL was given in the extracted text.
- Data: NBA play-by-play (publicly available sources).

## 10. Leakage and limitations

- Averaging is permutation-invariant but discards who-guards-whom interactions and play sequencing.
- The 100-possession, no-substitution series simulator is simplistic.
- Validation lacks strong probabilistic baselines (e.g., vs. a box-score-prior model), so the 0.3 KL number is hard to interpret as "good."
- Embeddings are static (one per player for the whole sample); no temporal/form dynamics.

## 11. GSE overlap

- This is GSE's **learned player/lineup representation** lane: 8-dim (or larger) embeddings per player, trained on play outcomes, become features for minutes, usage, fantasy-points, and prop-distribution models.
- Complements ledger 1808 (lineup composition) and ledger 1811 (soft role clustering): embeddings give a continuous role space where both operate.

## 12. Implementation specification

1. **Inputs:** GSE's play-by-play with 10 on-court players per play and a discrete outcome taxonomy (start with ~20 classes).
2. **Train** the embedding + MLP model (embedding dim 8–32, hidden 128, cross-entropy) on all non-holdout games.
3. **Validate** on held-out games: mean KL per matchup; require the plateau-by-30-plays behavior as a sanity check.
4. **Export** frozen player embeddings as features into the fantasy/prop projection stack (concatenate with box-score priors).
5. **Refresh** on a rolling window (e.g., last 2 seasons) to capture form/role drift — addresses the static-embedding limitation.

## 13. Reproducible test

- Train on GSE NBA play data through 2024–25, validate on 2025 playoffs: confirm (a) mean KL ≈ 0.3 or better, (b) embeddings correlate with rebounds/assists/3P rate (sanity), (c) a downstream fantasy-points model with embedding features beats the same model without them on held-out games.

## 14. Numeric acceptance/rejection gate and improvement experiment

- **Gate (ADAPT):** the embedding-plus-MLP predicts play-outcome distributions with mean KL ≈ 0.3 on held-out playoff games, embeddings recover known roles, and the matchup optimizer produces sensible orderings (Nene 37.3% > Ariza 34.4% > Melo 33.4%). Accept as ADAPT (weakened only by missing baselines).
- **Improvement experiment:** replace mean-pooling with an attention/SET-transformer over the 10 embeddings (captures who-guards-whom), and add a temporal component (rolling embeddings). Success = held-out KL ≤ 0.25 (≥ ~17% relative improvement) with the same 25-game validation protocol.

**Verdict:** ADAPT — Dense player embeddings from play-outcome prediction; adopt as GSE's learned player/lineup representation layer for fantasy and prop models, with attention-based pooling and rolling refresh as the improvement path.

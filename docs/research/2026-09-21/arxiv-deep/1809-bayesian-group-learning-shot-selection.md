# Ledger 1809 — Bayesian Group Learning for Shot Selection (Log-Gaussian Cox Process + Mixture of Finite Mixtures)

## 1. Citation and explicit full-text-read statement

- **arXiv:** 2006.07513
- **Title:** Bayesian group learning for shot selection (per ar5iv rendering; models each player's shot locations with a Log-Gaussian Cox Process, clusters via Mixture of Finite Mixtures)
- **Authors:** Guanyu Hu, Hou-Cheng Yang, Yishu Xue
- **Full-text-read statement:** I read the complete paper full text (abstract, introduction, LGCP shot-location model with INLA/SPDE estimation, L2 similarity matrix, Fisher-transformed Mixture of Finite Mixtures clustering, collapsed MCMC with Dahl partition summary, simulation study with Rand-index comparisons, NBA 2017–18 application with 9 inferred groups, limitations, and references) from the ar5iv HTML full-text rendering, saved to `/tmp/wave4b-dfs2/papers/2006.07513.html` with extracted text at `/tmp/wave4b-dfs2/txt/2006.07513.txt`. Raw paper text remains in `/tmp`; nothing was committed to the repo.

## 2. Research question

Can NBA players be grouped into shot-selection archetypes in a fully probabilistic way — jointly estimating the *number* of groups and assignments — from their spatial shot-location patterns alone?

## 3. Method/model

Two-stage Bayesian procedure:

1. **Stage 1:** model each player's shot locations as a **Log-Gaussian Cox Process (LGCP)**; estimate the intensity surface via **INLA/SPDE**. Compute a similarity matrix from normalized **L2 distances** between fitted intensities.
2. **Stage 2:** Fisher-transform the similarities and fit a **Mixture of Finite Mixtures (MFM)** model — MFM jointly estimates the number of clusters K and the assignments, avoiding the Dirichlet process's tendency to over-split. Inference via **collapsed MCMC** + **Dahl's method** for a partition point summary.

## 4. Mathematics, equations, assumptions

- LGCP: shot locations ~ Poisson process with log-intensity = Gaussian process (Matérn covariance via SPDE).
- Similarity sᵢⱼ = 1 − dᵢⱼ/max(d), dᵢⱼ = ‖λ̂ᵢ − λ̂ⱼ‖₂ / normalization; Fisher z-transform z = atanh(s).
- MFM prior on K (e.g., Poisson/truncated) with MFM's "microclustering"-resistant partition prior; collapsed Gibbs over assignments.
- **Assumptions:** (a) shot *attempt locations only* (makes/misses, defenders, game context ignored); (b) one season of data is enough to fix a player's style; (c) two-stage estimation (uncertainty from Stage 1 not propagated into Stage 2).

## 5. Dataset/schema

- **Simulation:** 75 players, 3 true groups, 50 replicates.
- **NBA:** 191 players with > 400 field-goal attempts, 2017–18 season; shot (x, y) locations.

## 6. Features and target

- **Features:** per-player LGCP intensity surface (functional datum on the half-court).
- **Target:** cluster assignment (and K); evaluated by Rand index against truth (simulation) and partition concordance across chains (real data).

## 7. Validation design

- **Simulation:** 50 replicates, 3 true groups; compare MFM vs. K-means, DBSCAN, mean shift on Rand index; count replicates recovering K = 3.
- **Real data:** run 50 MCMC chains; report mean pairwise concordance (Rand index) across chains as a stability measure; 9 groups inferred.

## 8. Exact results and baselines with numbers

Simulation (mean Rand index):
- MFM: **0.9988**
- K-means: **0.9005**
- DBSCAN: **0.7642**
- Mean shift: **0.7380**
- **42 of 50** replicates recovered the true 3 clusters.

NBA 2017–18 (191 players):
- **9 inferred groups**; mean concordance Rand index across 50 chains: **0.948**.

## 9. Code/data availability

- No public code URL was given in the extracted text.
- Data: NBA shot-location data (public via stats.nba.com / BigDataBall-style sources).

## 10. Leakage and limitations

- Two-stage estimation: Stage-1 uncertainty is not propagated; the similarity matrix is treated as fixed data.
- Only shot *attempt* locations — no makes, no defender distance, no temporal form, no lineup context.
- One season; player style drift is not modeled.
- Clustering is descriptive, not directly predictive — the paper does no out-of-sample prediction evaluation.

## 11. GSE overlap

- This is GSE's **probabilistic player-archetype prior**: for low-sample shooters (rookies, role changes), partial pooling toward the archetype's shot distribution stabilizes prop projections (3P attempt rate, shot diet).
- Natural pairing with ledger 1810 (AFBART): MFM gives discrete archetypes with uncertainty over K; AFBART gives continuous intensity regression. Use MFM archetypes as priors, AFBART as the likelihood.

## 12. Implementation specification

1. **Inputs:** GSE's NBA shot-location data (attempts with coordinates), minimum-attempts filter (start at 400 FGA).
2. **Stage 1:** fit per-player LGCP intensity via INLA/SPDE on a half-court mesh (reuse the paper's mesh design).
3. **Stage 2:** normalized L2 similarity → Fisher transform → MFM collapsed MCMC (50 chains, Dahl summary).
4. **Output:** per-player archetype posterior + archetype intensity surfaces; expose as features: P(player ∈ archetype k) and archetype-level 3P-rate/rim-rate priors.
5. **Use in projections:** when a player's own sample is thin (< 200 attempts in current role), shrink his shot-diet parameters toward his archetype posterior mean.

## 13. Reproducible test

- Replicate the simulation: 3 true groups, 75 players, 50 replicates; require mean Rand ≥ 0.99 and ≥ 40/50 replicates recovering K = 3.
- On GSE NBA data: 50 chains, require mean concordance RI ≥ 0.90 and inferred K in 7–12.

## 14. Numeric acceptance/rejection gate and improvement experiment

- **Gate (ADAPT):** simulation Rand 0.9988 vs. best baseline 0.9005 (K-means), 42/50 correct-K recovery, real-data concordance 0.948. Accept as ADAPT (not ADOPT: no predictive evaluation, two-stage uncertainty gap).
- **Improvement experiment:** single-stage joint model (LGCP intensities + MFM assignments sampled together) OR propagate Stage-1 posterior uncertainty by fitting MFM on posterior draws of the intensity surfaces. Success = (a) concordance RI ≥ 0.95 maintained, and (b) archetype assignments improve a downstream 3P-attempt-rate prediction task (held-out RMSE) vs. the two-stage assignments.

**Verdict:** ADAPT — Joint Bayesian estimation of shot-selection archetype count and assignments via LGCP+MFM; adopt as GSE's probabilistic player-archetype prior for low-sample shooter prop projections, with single-stage/uncertainty-propagated inference as the improvement path.

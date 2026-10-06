# [0378] An optimal transport based embedding to quantify the distance between playing styles in collective sports (arXiv:2501.10299v1)

**Citation:** Ali Baouan, Sergio Pulido, Mathieu Rosenbaum (2025). *An optimal transport based embedding to quantify the distance between playing styles in collective sports*. arXiv:2501.10299v1. URL: https://arxiv.org/abs/2501.10299
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 4840 lines, incl. appendices and references).
**Verdict:** ADAPT — the research map explicitly lists optimal transport as a gap, and this paper gives a complete, implementable recipe: sliced-Wasserstein frame embedding → Lloyd quantization → team-similarity metric. Highest-value methodological import of the wave for GSE: a principled way to compare team *formations/playing styles* from tracking data, directly applicable to NFL (offensive formations, defensive shells, coverage shells from NGS).

## 1. Research question
Can optimal transport provide (a) an interpretable, permutation-invariant frame embedding for player configurations, and (b) a team-level similarity metric over collections of frames, demonstrated on 2021–22 Ligue 1 (Stats Perform, 25 fps) and the first half of the 2015–16 NBA season (SportVU)?

## 2. Dataset / schema
- **Football:** 100 Ligue 1 games (2021–22), 25 fps tracking, possession label per frame; 8–11 games per team; frames with <11 players excluded; pitch rotated so the analyzed team attacks right; subsampled 1-in-10 for possession task (64,024 frames).
- **Basketball:** 630 games, first half of 2015–16 NBA season, SportVU 25 fps "moments" (deduplicated); n=5; subsampled 1-in-25; embedding in R^{5×6} (L=6).
- No code/dataset release stated (Stats Perform data proprietary; game list in Table 7).

## 3. Method / model
- **Frame as measure:** φ maps locations to uniform discrete measure (1/n)Σδ_{x_i} — permutation-invariant by construction (players interchangeable).
- **Frame distance:** sliced-Wasserstein SŴ_p (Eq. 5–6): project atoms onto L fixed directions θ_l = (cos(π(l−1)/2L), sin(π(l−1)/2L)), l=1..L, sort 1-D projections, average W_p^p; O(n log n) per direction instead of Hungarian O(n³). L=n+1 (12 for football, 6 for basketball).
- **Embedding (Prop 2.1, proved by induction in Appendix B):** Proj_θ: P_n^u(R²) → R^{n×L}, μ ↦ (⟨θ_l, x_{(i)}⟩)_{i≤n,l≤L} is injective and distance-preserving: SŴ_p = (nL)^{-1/p}‖Proj_θ(μ)−Proj_θ(ν)‖_p. Euclidean geometry on frames — barycenters and k-means become valid (unlike W_2's non-flat geometry, which the paper rejects for Lloyd's algorithm, citing Zhuang et al. 2022).
- **Team similarity:** collections of embedded frames → empirical distributions; quantize each with Lloyd's algorithm (k-means++, K=100 centroids; distance stabilizes beyond 100, Fig 4); similarity(c_1,c_2) = √2·W_2(μ̂_1, μ̂_2); the √2 normalization (Prop C.1, bounds centered at 1/√2) makes the score interpretable as the average meters a player must move to morph one team's frame collection into the other's.
- **Team identity:** spherical GMM (50 components) per team in R^{11×12}; MAP classification of held-out collections.

## 4. Equations & assumptions
- W_p (Eq. 1), discrete form (Eq. 2), uniform same-cardinality reduction to assignment/min-permutation (Eq. 3, Birkhoff–von Neumann); 1-D closed form via order statistics (Eq. 4); sliced-Wasserstein (Eq. 5) and finite-grid approximation (Eq. 6); quantization error V_K(μ) = inf_{|α|≤K} E[min_a‖Y−a‖²] = inf_{ν∈P_K} W_2²(μ,ν) (Eq. 9).
- Stated assumptions: players interchangeable within a frame (identity discarded); frames with <n players dropped (red cards excluded); attack-direction rotation is correct; 100 centroids adequately approximate each team's distribution (empirically checked); spherical GMM's isotropy aligns with L2≈SŴ_2 geometry.

## 5. Features / target
Input: per-frame player (x,y) locations. Frame level: R^{n×L} embedding → possession classification. Team level: quantized empirical distributions → pairwise similarity matrix, phase-of-play clusters, team-identity prediction.

## 6. Validation design
- **Possession prediction:** 5 input representations × (logistic regression CV / MLP-CNN train-test split); 64,024 frames.
- **Clustering:** 10 Lloyd clusters on Brest's frames; cluster frequencies + average possession per cluster.
- **Similarity matrix:** all 20 Ligue 1 teams, K=100; correlation with |Δ possession|; redo after centering frames (relative shape vs absolute position); in-possession vs out-of-possession distance per team (Table 4).
- **Team identity:** 5-fold CV, spherical GMM-50, Top-1/Top-2; accuracy vs sample size (100 resamples per k).
- **NBA appendix:** same pipeline, 10 GSW clusters, similarity matrices raw + centered, identity prediction.

## 7. Numerical results / baselines
- **Possession (Table 1):** embedding 81.66% (LR) / 82.26% (NN) vs raw tracking 59.65%/76.77%, 10×10 image grid 73.71%/80.03% (CNN), average positions 59.31%/59.92%, centered embedding 81.81%/80.63%. Permutation invariance is the difference; the embedding even beats CNN-on-grid.
- **Clusters (Brest, Table 2):** 10 clusters map to interpretable phases — deep low blocks (possession 22–28%), mid blocks (33–40%), advanced dispositions (61–77%); frequencies 6–13%.
- **Similarity (Tables 3–4):** PSG most distant overall (Σ=139.34); max pair PSG–Troyes 10.07 m; min Reims–Angers 4.18 m (2.67 centered). Correlation with |Δ possession|: 66.49% raw, 54.72% centered — similarity captures shape beyond average position. In/out-of-possession distance: Montpellier 6.73 (shape-preserving), Nantes 8.94 (strategy-switching); PSG 2nd-lowest raw (6.80) but 14th centered (4.10) — pressing keeps them advanced but shape changes.
- **Team identity:** 82% Top-1 / 88% Top-2 (5-fold); 300 frames suffice for 70.35% Top-1 / 81.43% Top-2.
- **NBA (Appendix A):** GSW most deviant (3-point revolution season), Utah 2nd, GSW–Utah the max pair; centering erases both deviations (absolute-position effect, not shape). Identity: 99.33% Top-1 / 100% Top-2 on full folds; 93.8% Top-1 with 2,000 frames.

## 8. Code / data availability
None stated — no repository link; Stats Perform/SportVU data proprietary (100-game list published in Table 7, reproducible in principle with licensed data). Proofs in Appendices B–C are fully written out.

## 9. Leakage & limitations
- Possession-prediction frames pooled across teams with 1-in-10 subsampling — consecutive frames 0.4 s apart remain autocorrelated; CV accuracy may be inflated (no team/game holdout reported).
- Team-identity folds are *consecutive* chunks — temporal leakage across folds is likely; the 82% may partly reflect game-specific rather than style-specific signal.
- Dropping <n-player frames discards red-card phases; n=11 fixed also drops goalkeeper-sendoff variants the paper doesn't discuss.
- Permutation invariance is a feature for shape but erases role information (a CB at striker's coordinates = a striker) — fine for style, wrong for personnel analysis.
- 100 centroids chosen from a 2-team stabilization curve, not per-team; Lloyd's local minima/initialization dependence unquantified.
- NFL transfer caveats: 11 offensive players but 22 on field — the paper analyzes one team's n atoms; NFL needs either per-side (n=11, like the paper) or joint (n=22) treatment, and the ball/line-of-scrimmage anchoring differs from soccer's free pitch. Down/distance/field-position stratification is the NFL analog of the paper's possession split.

## 10. GSE overlap
Fills the **explicit optimal-transport gap** in the research map (map §10). No existing GSE work compares team spatial styles from tracking data. Natural companion to the NGS 27-family taxonomy work and the STRAIN tracking-derived metrics (map §1): those describe *what happened*; this describes *how teams shape up*. Cross-reference paper 0372 (action valuation) — formation/style similarity is a natural conditioner for action-value models (EPA of a play depends on the defensive shell faced).

## 11. GSE implementation spec
Direct port to NGS tracking data (10 Hz, 22 players + ball): (1) per play, per side, build n=11 uniform measures from pre-snap frame (offense) and post-snap frames at fixed times (e.g., +1s, +2s); rotate so offense attacks +x; (2) embed with L=12 fixed grid (Eq. 7) → R^{11×12} per frame; (3) Lloyd-quantize each team's season collection (K=100) in embedding space; (4) team similarity = √2·W_2 between quantizers — yields an NFL "formation/style similarity matrix" (who runs defensive shells like whom; which offenses use similar personnel geometry); (5) cluster frames (K=10) to discover empirical formation families from data rather than charted labels. Effort: 2–3 weeks with POT (Python Optimal Transport) + sklearn on existing NGS data. Stratify by down/distance/field zone (the possession-split analog) and by pre-snap vs post-snap.

## 12. Reproducible test
No public code; reimplement from the paper: (a) verify Prop 2.1 numerically — random 11-point frames, check SŴ_2 equals (nL)^{-1/2}‖embedding diff‖_2 to machine precision; (b) on any public soccer tracking sample (e.g., StatsBomb 360 or SoccerNet tracking), reproduce the Table 1 ordering: embedding LR accuracy > image-grid > raw tracking for possession prediction, with embedding ≈ 80%+; (c) reproduce Fig 4 stabilization: pairwise team distance vs K flattening by K=100.

## 13. Acceptance / rejection gate
ADOPT the sliced-Wasserstein embedding + quantization pipeline as GSE's team-style similarity engine if the NGS pilot reproduces two paper signatures: (i) embedding beats raw-coordinate baselines on a formation-label prediction task by ≥10 pp, and (ii) the resulting 32×32 similarity matrix correlates ≥0.5 with an independent style proxy (e.g., charted man/zone rates or DVOA-style scheme labels); REJECT the team-identity/GMM classification framing for NFL use — consecutive-fold leakage makes the 82% untrustworthy as stated, and style *similarity* (the distance matrix) is the operationally useful output, not identity prediction.

## 14. Improvement experiment
The paper's quantization is per-team; instead quantize the **league-wide** frame pool once (shared codebook of formation atoms), then represent each team as a histogram over shared atoms — team similarity becomes a cheap histogram distance (e.g., Hellinger) instead of W_2 between separate quantizers, and atoms are directly interpretable league-wide ("Cover-2 shell", "bunch trips"). Test whether shared-codebook + Hellinger recovers the paper's team ranking (Spearman ≥0.9 vs their matrix) at a fraction of the compute — and gives GSE a human-readable formation taxonomy for free.

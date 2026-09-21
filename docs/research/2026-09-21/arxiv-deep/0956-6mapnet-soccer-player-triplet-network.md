# [0956] 6MapNet: Representing Soccer Players by a Triplet Network (arXiv:2109.04720)

## Citation / full-text source

- arXiv:2109.04720 — full text: https://arxiv.org/pdf/2109.04720
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Hyunsung Kim, Jihun Kim, Dongwook Chung, Jonghyun Lee, Jinsung Yoon, Sang-Ki Ko (2021). *6MapNet: Representing soccer players from tracking data by a triplet network*. arXiv:2109.04720. URL: https://arxiv.org/abs/2109.04720
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv conversion).
**Verdict:** ADAPT — FaceNet-style triplet embedding of tracking-derived location+direction heatmaps with role-conditional identities; directly portable to NFL for player-style embeddings (coverage, route-running, QB movement) and stylistic-similarity search.

## 1. Research question
Can playing styles be represented quantitatively from automatically collected GPS tracking data — without any manual event annotation — such that embedding similarity reflects actual style similarity, and can players be identified from only a few matches?

## 2. Dataset / schema
- 750 matches from 2019–2020 K League 1 and 2 (South Korean pro soccer), recorded at 10 Hz by OhCoach Cell B wearables (Fitogether): latitude, longitude, speed → transformed to pitch-relative (x, y) meters; 2-D velocities by differentiation. One half rotated to keep attacking direction consistent. (Some matches measured both teams, some one; double-counted when both.)
- Matches split into phases at halftime, substitutions, dismissals; phases ≤ 10 min absorbed into neighbors → **635 matches → 1,989 phases → 17,953 player-phase entities from 436 players**. Each entity: time series of (s_x, s_y) in meters and (v_x, v_y) in m/s.
- Role labeling: Bialkowski et al. frame-by-frame role assignment; entity role = most frequent frame role; per-player K-means (2–4 clusters, maximizing silhouette; all scores < 0.6 → single cluster) on mean role locations → player-role entities (identity = player + role cluster). Same player in different role clusters = different identity.
- Test set: 10 heatmap pairs sampled for each of 308 player-role entities with >20 phases; validation: 5 phases for each of 332 entities with >15 phases. Data augmentation kept strictly within split.
- Access: proprietary Fitogether GPS data; not publicly released.

## 3. Method / model
1. Per player-phase entity, build two heatmaps on 35×50 grids: a **location heatmap** (pitch) and a **direction heatmap** of velocity-vector endpoints with speed > **4 m/s** threshold (grid over {(v_x,v_y): −12 ≤ v_x ≤ 12, −8 ≤ v_y ≤ 8} m/s, chosen for near-square cells; 4 m/s empirically set — lower concentrates at origin, higher too sparse).
2. **Augmentation by pixel-wise addition** (heatmaps are additive over disjoint time intervals — equation (1) in paper); 3-combination chosen as optimal (≈ one full match = 3 phases). Training: 4·n_p random 3-combinations per entity (n_p = entity's heatmap count); validation/test: exhaustive combinations — C(5,3) = 10 per validation entity, C(10,3) = 120 per test entity.
3. **6MapNet:** triplet network (FaceNet-style). Three weight-sharing 2MapNet subnetworks; each 2MapNet takes a heatmap pair x_i = (h(s_i), h(v_i)) through two branch CNNs (identical structure, Table 1): Conv1a 2×3×4 → Conv1b 3×3×4 → MaxPool 2×2 → Conv2a/b 3×3×16 → MaxPool → Conv3a 2×3×32 → Conv3b 3×3×32 → MaxPool → Conv4a/b 3×3×64 → FC1 1920→128 → FC2 128→10. Batch norm after Conv/FC, 25% dropout after MaxPool layers and Conv4b. Two 10-dim branch outputs concatenated and L2-normalized → 20-dim embedding f(x).
4. Triplet loss (paper eq. 3): L = Σ_i [‖f(xᵢᵃ) − f(xᵢᵖ)‖²₂ − ‖f(xᵢᵃ) − f(xᵢⁿ)‖²₂ + α]₊ with margin **α = 0.1** (best performing).
5. Triplet mining: candidate set S = 5 heatmap pairs per identity; every pair as anchor with 5 positive pairs; hard negative = one violating the margin constraint (eq. 2), else one of the 10 nearest negatives. Re-mined every ≤10 epochs; validation accuracy = fraction of positive pairs with no hard negative; training stops on no improvement. Key finding: best model comes from training only a few epochs on the **first** triplet selection — the second mining round picks stylistically similar anchors/negatives and hurts.
6. Evaluation via **ATL-sim**: per anonymized entity, fit a Gaussian density p_α over its training embeddings; similarity = average of top-m log-likelihoods of the 120 test embeddings (paper eq. 4): sim(α,β;m) = (1/m) Σᵢ₌₁ᵐ log p_α(f(x_{β(i)}^te)).

## 4. Equations & assumptions
- Heatmap additivity: h(s_p(T)) = Σᵢ h(s_p(Tᵢ)), h(v_p(T)) = Σᵢ h(v_p(Tᵢ)) for disjoint intervals Tᵢ (paper eq. 1).
- Triplet constraint (eq. 2): ‖f(xᵢᵃ) − f(xᵢᵖ)‖²₂ + α ≤ ‖f(xᵢᵃ) − f(xᵢⁿ)‖²₂.
- Triplet loss (eq. 3): L = Σᵢ [‖f(xᵢᵃ) − f(xᵢᵖ)‖²₂ − ‖f(xᵢᵃ) − f(xᵢⁿ)‖²₂ + α]₊.
- ATL-sim (eq. 4): sim(α,β;m) = (1/m) Σᵢ₌₁ᵐ log p_α(f(x_{β(i)}^te)).
- Assumptions: (a) "same player, same role cluster" ⇒ similar playing style (the semi-supervised label); (b) a player's movement depends on tactical role, hence identities are role-conditional; (c) embedding distance encodes style similarity; (d) 10 Hz GPS is sufficient; (e) phase boundaries (halftime/sub/dismissal) keep roles consistent.

## 5. Features / target
- Inputs: 35×50 location heatmap + 35×50 direction heatmap per player-phase entity (augmented 3-combinations).
- Labels: automatically generated player-role entity IDs (player + K-means role cluster).
- Target: triplet loss over (anchor, positive, negative) heatmap-pair triplets; evaluation target = player identification top-k accuracy / MRR.

## 6. Validation design
- Splits: train/validation/test player-role entities separated before augmentation (augmentation within-split only).
- Evaluation: anonymize training entities; de-anonymize using test entities via ATL-sim; report top-1/3/5/10 accuracy and MRR over 308 entities.
- Ablations: similarity measures (L1, L2, AL=all-likelihood, ATL-75/50/25, ML=max); amount of identifying data (p6/p8/p10 phases). No external baseline model (authors note PCA/autoencoder comparison as future work).

## 7. Numerical results / baselines
- Best (p10-ATL25): Top-1 **46.1%**, Top-3 69.8%, Top-5 81.8%, Top-10 **92.5%**, MRR **0.613** — identifying 308 anonymized players with ~10 phases ≈ 289 minutes of data.
- Similarity ablation (Top-1/Top-10/MRR): L1 24.4/79.2/0.402; L2 24.7/80.2/0.404; AL 35.1/84.1/0.509; ATL75 42.5/89.3/0.574; ATL50 45.5/90.6/0.602; ATL25 46.1/92.5/0.613; ML 37.0/91.2/0.547. Outlier filtering (top-25%) beats using all likelihoods.
- Data-amount ablation: p6-ATL25 34.1/84.7/0.508 → p8-ATL25 41.2/89.9/0.574 → p10-ATL25 46.1/92.5/0.613 (more phases help).
- Triplet mining: best performance just after the first selection; second selection degrades (hard negatives become stylistically similar).

## 8. Code / data availability
None stated in paper (no repo URL, no data link). Fitogether GPS data proprietary.

## 9. Leakage
- Split hygiene is good (augmentation within split), but identities overlap train/test by construction (player-role entities in both A) — it's a re-identification task, not generalization to unseen players; "similar player retrieval" for scouting is asserted, not tested on unseen players.

## Limitations
- No comparison against simple baselines (PCA, autoencoder, raw heatmap distances) — the authors flag this as future work. ATL-sim's Gaussian density fit may be doing much of the work.
- Role clustering hyperparameters (2–4 clusters, 0.6 silhouette cutoff) are heuristic and player-specific; identities are sensitive to them.
- The "first triplet selection only" training recipe is an empirical hack with a plausible story but no systematic validation.
- 10 Hz GPS from one league; heatmap grids are pitch-normalized, so cross-league transfer (different pitch sizes, 25 Hz optical) is untested.
- Explainability poor (authors' own future work).

## 10. GSE overlap
Existing-research-map: ML-brief topic list mentions representation learning on play-by-play, but no triplet/embedding work on tracking read in depth; NGS taxonomy covers derived metrics, not player-style embeddings. No overlap — **new capability**: learned style-similarity embeddings from tracking, directly usable for (a) stylistic comp search (props/DFS: find players with similar route/movement profiles), (b) role-conditioned embeddings (NFL: coverage-role or route-role identities).

## 11. GSE implementation spec
- Data: NFL Big Data Bowl tracking (10–25 Hz); frames of skill players. Phase analog: split games at quarter/half/injury/substitution? For NFL, use drive or series as the "phase" unit; role analog: route type (for WR/TE) or coverage assignment (DB) derived from tracking heuristics or charting.
- Steps: (a) per player-drive, build location heatmap (field grid) + direction heatmap (velocity vectors above a speed threshold, e.g., 4 m/s); (b) label identities as player + role-cluster (K-means on mean route/coverage locations); (c) 3-drive augmentation by pixel-wise addition; (d) train triplet network (small CNN per the Table 1 recipe, α = 0.1, hard-negative mining with early stopping on the "no hard negative" validation metric); (e) embed all players; serve nearest-neighbor "stylistic comp" queries.
- Effort: ~3–5 days for a prototype on one season of tracking.

## 12. Reproducible test
Dataset: Big Data Bowl 2024 tracking (WR/TE route frames). Baseline: raw heatmap L2 distance for player re-identification. Test: hold out 20% of player-drive entities; de-anonymize via ATL-sim (top-25% likelihood); report top-1/top-10 accuracy. Beat L2 baseline by ≥10 points top-1 to justify the triplet network.

## 13. Acceptance / rejection gate (numeric gate)
ADAPT if: on NFL tracking, 6MapNet-style embeddings beat raw-heatmap L2 re-identification by ≥10 percentage points top-1 accuracy on held-out player-drive entities, with top-10 ≥ 80%. Otherwise keep only the ATL-sim outlier-filtering trick and drop the triplet network.

## 14. Improvement experiment
Replace the hard role-cluster labels with a learned role assignment (jointly train a role classifier and the triplet embedding — multi-task), and add ball-relative features (distance/angle to ball) as a third heatmap channel; test whether ball-context raises top-1 identification and whether the embeddings transfer to unseen players (zero-shot retrieval precision@10).

## Verdict

**ADAPT** — verdict per wave-2 reader-15 report (full-read ledger; the acceptance criterion is stated in the numeric-gate section above).

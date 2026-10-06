# [2190] A Generalised Signature Method for Multivariate Time Series Feature Extraction (arXiv:2006.00873v2)

**Citation:** James Morrill, Adeline Fermanian, Patrick Kidger, and Terry Lyons (2020, Univ. of Oxford / Alan Turing Institute). *A Generalised Signature Method for Multivariate Time Series Feature Extraction*. arXiv:2006.00873v2. URL: https://arxiv.org/abs/2006.00873
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

*Rationale:* the path signature is the mathematically principled answer to multivariate interaction discovery: iterated integrals over a multi-channel path capture order-dependent cross-channel interactions that static aggregates and per-channel features miss. The canonical pipeline (time+basepoint augmentation, dyadic windows, depth ≤ 6, random forest) lands in the top statistical clique on the UEA archive at a fraction of HIVE-COTE's cost. Adapt as signature features over multivariate team-game trajectories.

## 1. Research question
The "signature method" (features from rough-path / controlled-differential-equation theory) has many ad-hoc variations, making it inaccessible to non-specialists. Can all variations be unified into one general framework — z = Sig^N ∘ ρ ∘ ϕ(x) over augmentations ϕ, windows W, transforms, rescalings — and can a first-of-its-kind empirical study across 26 datasets identify which variations actually matter, yielding a canonical best-practices pipeline?

## 2. Dataset / schema
26 datasets: 24 from the UEA multivariate time-series classification archive (6 with d > 60 channels excluded from the variation study: DuckDuckGeese, FaceDetection, Heartbeat, InsectWingbeat, MotorImagery, PEMS-SF — but included in the canonical-pipeline demo), plus Human Activities and Postural Transitions (Reyes-Ortiz 2016) and Speech Commands (Warden 2018). UEA predefined train/test splits respected; 80/20 stratified train/validation for GRU/CNN tuning.

## 3. Method / model
**Generalised signature framework:** for a multivariate path x, features z_{i,j} = (transform ∘ rescale ∘ window_j ∘ augment)(x), stacked into a vector and fed to any classifier.
- **Signature transform:** Sig^N(x) = collection of iterated integrals of x up to depth N — a graded, order-aware summary of the path; logsignature variant compresses redundancies.
- **Augmentations tested:** time, basepoint, invisibility-reset (sensitivity-adding); lead-lag, singleton/pair/triplet coordinate projections, random projections (e ∈ {3,6}, p ∈ {2,5}), learnt projections, multi-headed stream-preserving networks (3-layer ReLU FFNs, 16/32 units).
- **Windows:** global (baseline), sliding/expanding (5 or 20 windows), hierarchical dyadic (depths 2, 3, 4).
- **Rescaling:** none / pre-signature / post-signature.
- **Canonical pipeline (paper's recommendation):** augment with time + basepoint → hierarchical dyadic windows (depth 2–4) → signature depth 1–6 (OOB-selected) → random forest (n_trees ∈ {50,100,500,1000}, max_depth grid, 20 random combos).
- **Scale:** 8,569 dataset×variation×model combinations; 1,415 unique variations; combos producing > 10^5 signature features omitted.

## 4. Equations & assumptions
- Baseline: z = Sig³ ∘ ρ_pre ∘ ϕ_t(x) (Eq. baseline).
- Feature count grows geometrically in channels d and depth N (hence the >10^5 cap and coordinate-projection variants).
- Assumptions: (i) the path's iterated integrals carry the discriminative information (universal nonlinearity property of signatures); (ii) augmentations fix signature blind spots — time augmentation adds parametrization sensitivity, basepoint fixes translation invariance, lead-lag captures quadratic variation; (iii) dyadic windows give multi-resolution structure without the redundancy of dense sliding windows.

## 5. Features / target
Features: signature/logsignature coefficients per window (order-aware cross-channel interaction summaries). Targets: UEA class labels (classification accuracy).

## 6. Validation design
8,569 combinations across 4 downstream models (logistic regression, random forest, GRU, residual CNN); per-dataset best-variation selection; canonical pipeline compared against SOTA (MUSE, HIVE-COTE, ROCKET, DTW variants) via critical-difference plot on the UEA archive. Runtime table (Appendix D) across classifiers.

## 7. Numerical results / baselines
- **Canonical signature pipeline ranks in the first clique** (group of classifiers with best accuracy, not significantly different from each other) on the UEA archive. The two better-ranked algorithms: MUSE (could not finish on 5/26 datasets with 500 GB RAM — Ruiz et al. 2020) and HIVE-COTE (ensemble, very high train/inference cost). Signature pipeline: no memory errors on a smaller machine, significantly faster than HIVE-COTE.
- **Variation study findings:** hierarchical dyadic windows and signature-tailored augmentations (lead-lag, time, basepoint) are the dominant performance drivers; learnt projections / stream-preserving nets performed relatively weakly (authors note undertuning).
- **Runtimes (mean sec over UEA datasets):** baseline augmentation+global window — CNN 69.8, GRU 22.2, logistic 2.67, RF 2.23; random projection + logistic: 0.86 s; learnt projections: 917 s (CNN) / 752 s (GRU) — i.e., the canonical RF pipeline is a seconds-scale method.

## 8. Code / data availability
UEA archive public. Signature computation via the standard rough-paths tooling of the era (iisignature/esig/signatory named in the rough-paths lineage; paper implements in PyTorch for learnt variants). No single repo link extracted from this read — verify before implementing.

## 9. Leakage & limitations
Adversarial read: (i) signature features explode combinatorially in channels × depth — the >10^5 cap forced omissions; GSE's ~40-metric space needs aggressive projection (coordinate subsets) or depth ≤ 3; (ii) variation selection per dataset risks overfitting the framework to UEA, though the canonical pipeline is then validated on all 30 sets; (iii) baselines point-estimated, only TCTO-style std for the new method; (iv) lead-lag doubles channel count (d → 2d), compounding the explosion; (v) signatures are translation-invariant without basepoint — silent feature duplication risk if augmentation is skipped; (vi) interpretability is poor: individual signature coefficients don't map to human-readable stats, which matters for GSE's public pick cards.

## 10. GSE overlap
This is the **multivariate interaction-discovery** method the lane needs beyond 2189's algebraic crosses: TCTO finds static crosses (x·y); signatures find **path-dependent** interactions — e.g., the joint trajectory of (EPA/play, pressure rate, pace) over a team's last 8 games, where the *order* of events (collapse then recovery vs steady decline) is the signal. Nothing in gse-lab or ledgers 2182–2189 captures ordered cross-channel dynamics. Dyadic windows map naturally onto GSE's multi-scale program (2188): signature features at 4/8/17-game dyadic depths. Complements, not duplicates.

## 11. GSE implementation spec
1. Install `signatory` (PyTorch) or `iisignature`; verify API currency.
2. Per team-game: build multivariate path x_t = [EPA/play, success rate, pressure rate, explosive-play rate, pace] over trailing 8 games, z-scored per season; augment with time + basepoint.
3. Hierarchical dyadic windows depth 3; signature depth 1–3 (cap features: d=6 channels → depth 3 ≈ 258 terms/window — tractable).
4. Feed signature coefficients + raw gse-lab metrics into the existing LightGBM spread model as additional features; select via the 2185 SHAPEffects procedure to keep only regime-robust terms.
5. Effort: ~3 engineer-days (path construction + signatory integration + ablation vs per-channel catch22 features).

## 12. Reproducible test
Dataset: nflverse team-game 2015–2024, spread-cover label. Features: (A) baseline gse-lab metrics; (B) A + signature features (depth ≤ 3, dyadic depth 3, 5 channels). Protocol: train 2015–2022, validate 2023, test 2024; LightGBM log-loss. Also ablate: signatures without time augmentation (should degrade — tests the paper's augmentation claim in the sports domain). Report per-window-depth contribution.

## 13. Acceptance / rejection gate
**Accept iff** configuration B improves 2024 held-out log-loss by ≥ 0.003 over A with total signature features ≤ 300 (dimension discipline), AND the no-time-augmentation ablation performs worse than full augmentation (confirming the mechanism transfers). Reject if signature features add nothing over per-channel catch22 (2182) — then ordered interactions carry no marginal signal — or if the feature count needed for lift exceeds what the RF/LightGBM pipeline handles without overfitting (2024 log-loss worse than A).

## 14. Improvement experiment
Beyond the paper: **lead-lag on betting-market channels**. The paper's lead-lag augmentation captures quadratic variation (volatility-of-volatility). Build a joint path of [team EPA/play, closing spread, spread movement from open] and take lead-lag signatures — the cross-terms between performance trajectory and market trajectory directly encode "the market moved against the team's form" dynamics. If lead-lag signature terms survive SHAPEffects selection, GSE gains a principled market-vs-form interaction feature family no public model publishes.

---
*Lane: auto_feature_eng | Block: 2182–2201 | Dedup: 2006.00873 not in wave5-dedup-baseids.txt (verified 2026-09-22)*

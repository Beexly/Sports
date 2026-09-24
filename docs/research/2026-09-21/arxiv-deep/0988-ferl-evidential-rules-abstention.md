# 0988 — Evidential Rule Learning for Interpretable Classification with Abstention (2608.05859v1)
**Ledger:** 0988 | **arXiv:** 2608.05859v1 (2026) | **Lane:** abstention
**Title:** "Evidential Rule Learning for Interpretable Classification with Abstention" — J. Fumanal-Idocin, J. Andreu-Perez (U. of Essex)
**Replacement context:** Fresh-search replacement (`ti:"reject option" OR ti:"classification with abstention"`) for an original-assignment duplicate. Second abstention-lane paper; pairs with 0987 (conformal guarantees) as the complementary abstention mechanism.

---

## Citation / full-text source
Full citation: "Evidential Rule Learning for Interpretable Classification with Abstention" — J. Fumanal-Idocin, J. Andreu-Perez (U. of Essex). Full text: arXiv 2608.05859v1 (2026), https://arxiv.org/abs/2608.05859v1.

## Research question
FERL — Fast Evidential Rule Learning: a fuzzy rule-tree learner whose predictions are natively Dempster–Shafer evidential, in one deterministic pass, with no post-hoc calibration, held-out set, or repeated inference. Each activated node contributes a DS mass function where firing strength φ_o(x) becomes the mass on its class distribution and the residual 1−φ_o(x) becomes mass on ignorance. From the combined mass it reads a point label (pignistic transform), a credal set prediction, an abstention (set = whole frame), and an OOD signal.

## Dataset / schema
30 KEEL tabular datasets (146–19,020 samples, 6–64 features, 2–11 classes), stratified 5-fold. OOD evaluated via leave-one-class-out. Concept-bottleneck: CUB-200 and AwA2. Under graded covariate shift: perturbation levels k. No sports or temporal data demonstrated; all benchmarks are static tabular/image tasks.

## Method
**Core mechanics.**
- Fuzzy splits: μ_θ,h(x_f) = min(1,max(0,(θ+h−x_f)/(2h))); θ = median of bootstrap (B=25) per-resample Gini-optimal cuts; h = γ·MAD; learned via greedy growth with rule budget R (compact ≤15, medium ≤50, deep ≤200 rules), max depth (5/12), patience, min gain δ.
- Evidential output (closed form, leaves-only for deep variant): m̃(Θ)=Π_o(1−φ_o); m̃({c})=Π_o(1−φ_o+φ_o p_o(c))−Π_o(1−φ_o); normalize by Z; Bel(c)=m({c}), Pl(c)=m({c})+m(Θ); interval-dominance set **S(x)={c : m({c}) ≥ max_j m({j}) − m(Θ)}** — classes within the ignorance margin of the best class. Abstention ⟺ S(x)=Θ.
- Repeated Dempster combination of *nested* (ancestor+descendant) nodes monotonically shrinks ignorance (Z′≥a ⇒ ignorance cannot grow with an added source) — hence deep trees combine leaves only; ablation: leaves-only Dempster (acc 83.18, coverage 92.31, ignorance 22.93) beats all-node (acc 80.62, ignorance 0.07, coverage 80.69 ≈ point accuracy) and Denœux's cautious rule (acc 69.58, over-conservative).
- **Geometric OOD:** bounded-support memberships crop fuzzy sets to the node-observed feature range; routing-mass loss decomposes per node/feature, naming the responsible attribute. Firing-based OOD AUROC **47.03→99.29**, ignorance-based **23.19→98.62**; in-distribution firing unchanged (99.67). Near-OOD (novel class overlapping the manifold) handled by per-node diagonal-Gaussian models of unsplit features (firing-weighted Mahalanobis), also attribute-attributable.
- **Lipschitz stability (Proposition 1):** unnormalised masses are O(KDλ)-Lipschitz; on Z≥τ, ∥BetP(·|x)−BetP(·|x′)∥₁ ≤ κKDλ/τ·∥x−x′∥∞. Local robustness certificate: predicted class unchanged for ∥x−x′∥∞ < Δ(x)/(2L_T).

**Hyperparameters.** Rule budget R (15/50/200); max depth D (5/12); bootstrap resamples B=25; width multiplier γ; patience; min gain δ; CCI vs weighted-Gini split criterion; split subsample cap 10,000 (only when N>50k).

## Equations / assumptions
- μ_θ,h; h=γ·MAD; m_o({c})=φ_o p_o(c), m_o(Θ)=1−φ_o; combined-mass closed form above; S(x) ignorance-margin rule; Lipschitz bound; Gini-descent proposition G(p)−αG(p_L)−(1−α)G(p_R)=α(1−α)∥p_L−p_R∥²₂≥0; routing-mass conservation Σ_ℓ φ_ℓ=1.
- Assumptions: multiclass frame Θ; greedy growth to a rule budget; leaves-only combination for deep trees (dependence argument); bounded-support gate only affects inference.

## Features / target
Features: the input tabular features (6–64 per dataset; e.g., banana, twonorm, spambase, magic, vowel in the protocol); node-level fuzzy memberships derived from feature thresholds. Target: class label (point prediction via pignistic transform), credal set prediction S(x), abstention decision (S(x)=Θ), and OOD signal from firing/ignorance masses.

## Validation
- **30 KEEL tabular datasets** (146–19,020 samples, 6–64 features, 2–11 classes), stratified 5-fold. FERL-deep: **83.23% acc** (best rule learner, statistically significant vs all rule learners, Holm-corrected Wilcoxon; indistinguishable from LR 81.13 only), AURC **9.21** (vs RF 6.26, GB 6.60). Per-dataset structure: FERL wins on curved low-dim boundaries (banana +32.8 over LR), loses on oblique high-dim linear (twonorm −11.9).
- **Set-valued** (u65/u80 utility-discounted accuracy, Zaffalon 2012): FERL-deep **0.80/0.83** vs NCC 0.79/0.80; determinacy 0.74, coverage **0.92**, mean size 1.70; MLP-Conformal covers 0.95 but with sets of 2.17.
- **OOD (leave-one-class-out):** FERL-deep AUROC **77.66** vs kNN-distance 77.38, Mahalanobis 74.42, Isolation Forest 70.33; rejects **36.47%** of novel-class inputs at 95% retained acceptance — matches dedicated detectors with no separate detector.
- **Concept-bottleneck (CUB-200/AwA2):** per-concept isotonic calibration lifts FERL-deep CUB-200 59.38→65.18%; AwA2 AUPR-Out **68.3** (best), novel-class rejection **57.2%** — while naming anomalous attributes.
- **Under graded covariate shift:** at k=1 perturbation FERL DS-conformal keeps **77.3%** coverage by widening sets (1.35→4.10) vs global conformal falling to 55.0% at fixed size 1.09.
- **Cost:** FERL-deep fits in median **0.26 s** (one CPU), scores a fold in **1.5 ms** — 10× faster than FURIA, 500× faster than FUCS at inference.
- **Baselines.** CART, C4.5, FIGS, FURIA, FUCS (DS), RRL, RL-Net, NeuRules, SamRuLe, LR, NCC, CDT, EDL, MLP-Conformal (APS α=0.1), RF, GB; OOD: Mahalanobis, kNN distance, Isolation Forest, softmax entropy.

## Exact results / baselines
- 30 KEEL datasets: FERL-deep **83.23% acc** (best rule learner, statistically significant vs all rule learners, Holm-corrected Wilcoxon; indistinguishable from LR 81.13 only), AURC **9.21** (vs RF 6.26, GB 6.60). Per-dataset structure: FERL wins on curved low-dim boundaries (banana +32.8 over LR), loses on oblique high-dim linear (twonorm −11.9).
- Set-valued (u65/u80 utility-discounted accuracy, Zaffalon 2012): FERL-deep **0.80/0.83** vs NCC 0.79/0.80; determinacy 0.74, coverage **0.92**, mean size 1.70; MLP-Conformal covers 0.95 but with sets of 2.17.
- OOD (leave-one-class-out): FERL-deep AUROC **77.66** vs kNN-distance 77.38, Mahalanobis 74.42, Isolation Forest 70.33; rejects **36.47%** of novel-class inputs at 95% retained acceptance — matches dedicated detectors with no separate detector.
- Concept-bottleneck (CUB-200/AwA2): per-concept isotonic calibration lifts FERL-deep CUB-200 59.38→65.18%; AwA2 AUPR-Out **68.3** (best), novel-class rejection **57.2%** — while naming anomalous attributes.
- Under graded covariate shift: at k=1 perturbation FERL DS-conformal keeps **77.3%** coverage by widening sets (1.35→4.10) vs global conformal falling to 55.0% at fixed size 1.09.
- Cost: FERL-deep fits in median **0.26 s** (one CPU), scores a fold in **1.5 ms** — 10× faster than FURIA, 500× faster than FUCS at inference.
- **Baselines.** CART, C4.5, FIGS, FURIA, FUCS (DS), RRL, RL-Net, NeuRules, SamRuLe, LR, NCC, CDT, EDL, MLP-Conformal (APS α=0.1), RF, GB; OOD: Mahalanobis, kNN distance, Isolation Forest, softmax entropy.

## Code / data
Code release promised but pending ("regenerated once the paper is published"). Benchmarks are on public KEEL / CUB-200 / AwA2 datasets.

## Leakage
No leakage discussion in the paper; evaluation uses stratified 5-fold cross-validation on static tabular datasets and leave-one-class-out for OOD, so no temporal leakage structure arises. The bounded-support OOD gate only affects inference, not training.

## Limitations
- Inherently axis-parallel; loses to LR on oblique near-linear high-dimensional problems (twonorm −11.9, vehicle −7.7) — the paper admits this is intrinsic to rule learning.
- Still 2.4 points behind RF (83.2 vs 86.6) on raw accuracy; interpretability costs points.
- Leaves-only combination is an empirical fix for the dependence problem, not a principled combination rule; Denœux's cautious rule (the principled alternative) is dramatically worse (acc 69.58).
- Bounded-support OOD covers only *geometric* off-support novelty; semantically novel classes inside the support rely on the Gaussian free-feature model, which is diagonal (no correlations).
- Lipschitz certificate requires Z≥τ — vacuous exactly where ignorance (and abstention) is highest.
- No sports or temporal data demonstrated; all benchmarks are static tabular/image tasks.
- AwA2 FPR95 is 75.8 vs 54.2–54.3 for Mahalanobis/kNN — the residual is competitive on AUROC but weak at the high-confidence operating point.
- Code release promised but pending ("regenerated once the paper is published").

## GSE overlap
- Extends the evidential/credal tree line (FUCS/Shiraishi 2025, NCC, CDT) rather than duplicating: first to combine fuzzy rule learning + DS evidence + abstention + OOD in one pass. The paper's ablations position it precisely against those.
- Contrast with 0987 in this wave: FERL = mechanism (interpretable, attribute-attributed abstention, single pass); 0987 = guarantee (distribution-free error rates). They compose, not compete.
- The abstention lane's *mechanistic* complement to 0987's conformal guarantees. Whereas 0987 certifies error rates for accepted binary predictions, FERL gives a single-pass, auditable, rule-based abstention + OOD system for multiclass pick decisions — and crucially it can *explain which feature is anomalous* when it abstains. No corpus overlap (first DS-evidential rule paper; corpus conformal work is regression-side intervals).

## Implementation (GSE adaptation)
- **What to build:** a **FERL abstention layer for GSE pick selection**. Train a FERL-medium tree (≤50 rules) on matchup-feature rows (Elo diff, rest, injuries, weather, market-move features) with pick-outcome labels (cover/no-cover, or multiclass win/loss/push). The tree emits: a point pick, an ignorance mass, and a credal set — **publish only singletons; abstain when S(x)=Θ or ignorance exceeds a calibrated threshold**; route abstentions to the conformal gate from 0987 as a second opinion (dual-gate abstention: conformal rejects on guarantee grounds, FERL rejects on evidence grounds).
- **The killer feature for GSE:** attribute-level anomaly attribution. When FERL abstains or flags OOD, the routing-mass decomposition *names the anomalous feature* ("total moved 4 points off the training manifold while spread stayed fixed") — auditable abstention explanations the desk can act on, unlike a scalar uncertainty.
- **Robustness certificate:** use the Lipschitz bound Δ(x)/(2L_T) to certify which published picks are stable to line movement — a pick whose margin Δ exceeds 2L_T×(expected line move) cannot flip under that move; gate stake size on it.
- **Stack:** pair with 0987's error-reject curves (guarantee on the published set) and FERL's coverage-under-shift behavior (sets widen instead of silently breaking under regime change — directly relevant to playoff/weather-shift regimes).

## Reproducible test
- Reproduce the 30-dataset benchmark protocol on 5 of the listed datasets (banana, twonorm, spambase, magic, vowel): confirm (a) FERL-deep beats LR on banana/ring/vowel and loses on twonorm/vehicle (the structured delta), (b) leaves-only Dempster beats all-node on coverage (≥90 vs ≤82) and ignorance (≥20 vs ≤1), (c) bounded-support toggle leaves ID accuracy unchanged (±0.5) while taking geometric-OOD firing AUROC from ~47 to ≥95.

## Numeric gate
- On the OOD leave-one-class-out protocol (multiclass tabular datasets, threshold set to accept 95% of retained-class inputs): FERL-deep's ignorance-mass-based rejection must reject **≥30% of held-out novel-class inputs** (paper: 36.47%) AND achieve **AUROC ≥75** (paper: 77.66) — i.e., its native residual must match or beat the strongest dedicated baseline (kNN distance 77.38) without any separate OOD detector. If a separate detector is needed to hit the numbers, the build fails the paper's central claim.

## Improvement experiment
- **Sports regime-shift validation (the paper's missing piece):** train FERL on GSE's historical pick features and evaluate abstention under *temporal* shift (train regular season, test playoffs / train pre-weather-season, test late season). Success: prediction sets widen (mean size up ≥30%) under shift while coverage degrades ≤10 points — demonstrating the graceful-degradation property on real sports drift, and the attribute-attribution names the drifting features (rest, weather, line-move) correctly ≥70% of the time on synthetic drift-injection tests.
- **Dual-gate calibration:** combine FERL abstention with the 0987 conformal gate; success if the combined published set has lower realized error than either gate alone at the same reject rate.

## Verdict
**ADAPT** — The abstention lane's interpretable mechanism: native DS-evidential rules with principled abstention, attribute-attributed OOD detection matching dedicated detectors, and a Lipschitz stability certificate — all in a single 1.5ms pass. The axis-parallel weakness and no-sports-demonstration are the limits; the sports regime-shift validation is the improvement experiment and pairs naturally with 0987's conformal gate as a dual-abstention architecture.

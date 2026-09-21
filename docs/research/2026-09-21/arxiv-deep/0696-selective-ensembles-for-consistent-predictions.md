# [0696] Selective Ensembles for Consistent Predictions (arXiv:2111.08230v1)

**Citation:** Emily Black, Klas Leino, Matt Fredrikson (2021). *Selective Ensembles for Consistent Predictions*. arXiv:2111.08230v1. URL: https://arxiv.org/abs/2111.08230v1
**Ledger completed:** 2026-09-21. **Read:** full text from local full-text cache (`/tmp/arxiv750-cache/fulltext/2111.08230.txt`, ar5iv-converted HTML text; complete paper §§1–7 including theorems, algorithms, and evaluation tables, read in full).
**Verdict:** ADAPT — binomial-tested majority-vote ensembles give GSE a principled stability gate for published picks: only publish games where the ensemble's plurality pick is a statistically significant majority, abstain otherwise. Complements, not replaces, the uncertainty-based abstention of ledgers 0694/0695.

## 1. Research question
Do retrained models (different seed / leave-one-out data) disagree on individual predictions and feature attributions, and can a selective ensemble with hypothesis-tested abstention provably bound this inconsistency while keeping abstention low?

## 2. Dataset / schema
Seven benchmark datasets: UCI German Credit (n=800), Adult, Taiwanese Credit Default, Seizure, Warfarin dosing, Fashion-MNIST, Colorectal Histology. 500 models trained per tabular dataset (independent seeds / LOO data), 200 per image dataset. No sports data.

## 3. Method / model
Selective ensemble of n models: collect class votes, take top-2 counts (n_A, n_B); predict argmax iff binom_p_value(n_A, n_A+n_B, 0.5) ≤ α (two-sided binomial test rejects toss-up at level α), else ABSTAIN (Alg. 2). Theorem 4.1: Pr[ensemble prediction ≠ mode prediction] ≤ α. Corollary: expected loss-variance ≤ α+β (β = abstention bound); pairwise disagreement between two selective ensembles ≤ 2(α+β). Theory proven in §3/§7; experiments use α=0.05, n∈{5,10,15,20}, 24 random ensembles per setting.

## 4. Equations & assumptions
- Mode predictor: g_{P,S}(x) = argmax_y E_{S∼S}[1[P(S;x)=y]] (Eq. 1).
- Prediction rule: if binom_p_value(n_A, n_A+n_B, 0.5) ≤ α return argmax(Y) else ABSTAIN (Alg. 2).
- Theorem 4.1: ∀x, Pr_{S∼S^n}[ĝ_n(P,S;α,x) ≠_ABS g_{P,S}(x)] ≤ α.
- Corollary 4.2: E_x[V(x)] ≤ α+β. Corollary 4.3: E_x[Pr[two ensembles disagree]] ≤ 2(α+β).
- Assumptions: constituent models are i.i.d. draws from the pipeline distribution (random seeds / data resamples).

## 5. Features / target
Binary/multiclass classification (credit risk, medical diagnosis, images). For GSE: each constituent model votes {cover, no-cover}; selective ensemble predicts only if the vote margin passes the binomial test.

## 6. Validation design
276 pairwise ensemble comparisons per tabular dataset (40 for image), disagreement rate p_flip measured per test point; singleton vs non-selective vs selective ensembles; attribution stability via Spearman's ρ, top-5 intersection, SSIM. Ablation: n=5→20, RS vs LOO randomness.

## 7. Numerical results / baselines
- Singleton models: p_flip>0 on up to **57%** of test points (German Credit); typically 5–10% elsewhere. Selective ensembles of n=10: **zero** points with p_flip>0 across all seven datasets.
- Abstention at n=20, α=0.05 (RS): Adult 2.4%, Seizure 1.4%, Warfarin 3.1%, Taiwanese Credit 2.3%, FMNIST 3.6%, Colon 1.9%; German Credit 16.5% (outlier: tiny dataset, 57% baseline disagreement). n=5 → 100% abstention (α must be raised for tiny ensembles).
- Selective-ensemble accuracy (abstain as error) within a few points of non-selective ensembles, e.g. Adult .830 vs .842 at n=20; Warfarin .670 vs .688.
- Attributions: singleton German-Credit saliency maps agree on ~1 of top-5 features on average; plain ensembling roughly doubles attribution agreement; selective abstention further stabilizes attributions when variance is high.

## 8. Code / data availability
Not stated in the extracted text. Datasets are all public (UCI, FMNIST, Kather et al. 2016).

## 9. Leakage & limitations
- Cost: n=10–20 full model retrains per publish cycle — 10–20× training cost for a stability gate.
- German Credit (n=800) shows the method degrades on tiny data (16.5% abstention) — GSE's season-level samples are similarly small; expect abstention higher than the headline 1.5–5%.
- Guarantees bound disagreement with the *mode* prediction, not with ground truth — a stably wrong ensemble is fully "consistent."
- α=0.05 fixed; no calibration of α to a target publish volume, and no analysis of the abstention-rate/accuracy trade-off under distribution shift.
- Attribution-consistency claims rest on saliency maps (fragile method) and are tangential to GSE's needs.

## 10. GSE overlap
Existing-research map: ensemble/voting entries exist but nothing with a hypothesis-test abstention rule — new capability. Natural companion to ledger 0694/0695's learned abstention: this gates on *model disagreement* (epistemic), those gate on *learned uncertainty*.

## 11. GSE implementation spec
1. Train n=10–15 seeds of GSE's classification head on the same data; for each upcoming game, collect votes {cover, no-cover}.
2. Publish the majority pick iff binom_p_value(n_A, n_A+n_B, 0.5) ≤ α (start α=0.05; tune to hit GSE's target publish volume); otherwise withhold as "model disagreement."
3. Log the per-game vote margin as a stability feature for downstream analysis — games near the binomial boundary are candidates for the 0694/0695 learned-abstention heads.
4. Combine with 0694/0695: publish only if BOTH the selective ensemble predicts AND the learned-abstention head does not abstain (two-key gate), or run them as independent lanes in an A/B.
Effort: ~2–3 days (ensemble training pipeline + binomial test + publish gate), plus ongoing 10–15× training cost.

## 12. Reproducible test
Dataset: nflverse 2015–2025, ATS cover prediction. Train n=15 seed-varied models ≤2023, validate 2024 (tune α for ~30% coverage), test 2025. Metric: accuracy and ROI on published games vs (a) single-model baseline, (b) plain majority vote (no binomial test). Baseline to beat: (b) on covered-set accuracy.

## 13. Acceptance / rejection gate
ADAPT if the binomial-gated ensemble beats plain majority vote on test-window covered-set ROI by ≥2pp with abstention ≤35%; reject if abstention explodes (small-data effect) or the gate adds nothing over plain voting — then keep plain voting and rely on 0694/0695's learned abstention.

## 14. Improvement experiment
Calibrate α seasonally instead of fixing it: choose α on the validation season to hit GSE's exact publish-volume target (e.g., 30%), and test whether the binomial margin predicts *which* published games hit — regress game outcome on vote-margin percentile; if the margin is monotone in hit rate, replace the binary gate with a margin-graded stake/confidence tier (graded publish volumes instead of publish/withhold).

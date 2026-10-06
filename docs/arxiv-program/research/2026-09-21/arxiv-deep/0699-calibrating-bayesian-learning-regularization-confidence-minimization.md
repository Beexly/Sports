# [0699] Calibrating Bayesian Learning via Regularization, Confidence Minimization, and Selective Inference (arXiv:2404.11350v3)

**Citation:** Jiayi Huang, Sangwoo Park, Osvaldo Simeone (2024). *Calibrating Bayesian Learning via Regularization, Confidence Minimization, and Selective Inference*. arXiv:2404.11350v3. URL: https://arxiv.org/abs/2404.11350v3
**Ledger completed:** 2026-09-21. **Read:** full text from local full-text cache (`/tmp/arxiv750-cache/fulltext/2404.11350.txt`, ar5iv-converted HTML text; complete paper §§I–VI including all three method stages and experiments, read in full).
**Verdict:** ADAPT — the selective-calibration selector (reject inputs whose confidence–accuracy gap is expected to be large, trained via selective MMCE with an outlier-score vector) is a calibration-specific abstention rule that complements the accuracy-oriented abstention of ledgers 0692–0698. Directly relevant to GSE's calibration lane (cf. ledger 0691).

## 1. Research question
Can VI-based Bayesian learning integrate (1) calibration regularization (MMCE) for ID calibration, (2) OOD confidence minimization (OCM) for OOD detection, and (3) selective calibration to resolve the ID/OOD trade-off — and does the combined SCBNN-OCM beat SOTA on both?

## 2. Dataset / schema
CIFAR-100 (ID), TinyImageNet-resized (OOD uncertainty set); WideResNet-40-2; Gaussian VI (diagonal covariance); 3-layer 64-dim selector net; ECE with M=15 bins. No sports data.

## 3. Method / model
Three stages: (1) CBNN: φ^CBNN = argmin_{q(θ|φ)} {F(q|D^tr) + λ·E(q|D^tr)} — MMCE calibration regularizer E(q|D^tr) = E_{θ∼q}[E(θ|D^tr)] added to VI free energy. (2) CBNN-OCM: + γ·C(q|D^u), C = −E_{θ∼q}[Σ_i Σ_y log p(y|x^u[i],θ)] — confidence minimization on unlabeled OOD set. (3) SCBNN-OCM: selector minimizing selective MMCE E^{S-Cal}(φ|D^val) (Eq. 30) with inputs = averaged confidence r̄(x) + outlier-score vector s̄(x) (KDE, isolation forest, 1-class SVM, kNN distance on last-layer features); inference via threshold τ on the relaxed selector (Eqs. 36–41).

## 4. Equations & assumptions
- MMCE: E(θ|D^tr) = (Σ_iΣ_j (c_i−r_i)(c_j−r_j)κ(r_i,r_j)/|D^tr|²)^{1/2} (Eq. 8).
- Free energy: F(q|D^tr) = E_{θ∼q}[L(θ|D^tr)] + β·KL(q||p) (Eq. 11).
- CBNN: φ^CBNN = argmin {F(q|D^tr) + λ·E(q|D^tr)} (Eq. 17).
- OCM: C(θ|D^u) = −Σ_iΣ_y log p(y|x^u[i],θ) (Eq. 22); CBNN-OCM adds γ·C(q|D^u) (Eq. 25).
- Selective MMCE (Eq. 30): E^{S-Cal}(φ|D^val) with selector weights g(x_i^val|φ)g(x_j^val|φ); relaxed with continuous g̃(r,s|φ) and −η·Σ log g̃ barrier for coverage (Eq. 33).
- OOD detection probability: p_d^OOD = ½(1+TV), TV = ½∫|p^ID(r)−p^OOD(r)|dr (Eqs. 19–20).
- Assumptions: Gaussian VI; OOD uncertainty set available; outlier scores computed on last-layer features.

## 5. Features / target
CIFAR-100 images → 100 classes. For GSE: game features → outcome; the selector takes (model confidence, outlier scores vs historical game embeddings) and decides publish/withhold on calibration grounds.

## 6. Validation design
Staged ablations (FNN vs CFNN vs BNN vs CBNN; then ±OCM; then selective), accuracy-vs-ECE trade-off curves over λ and γ, confidence histograms ID vs OOD, coverage sweeps over τ. OOD = TinyImageNet.

## 7. Numerical results / baselines
- Calibration regularization: ECE decreased **>20%** for frequentist, **50%** for Bayesian learning (CIFAR-100 reliability diagrams, Fig. 6).
- OCM (γ=0.5): drastically improves OOD detection for FNN and BNN alike (confidence histograms separate); calibration regularization alone does not help OOD detection.
- Trade-off confirmed: calibration regularization improves ID ECE at the cost of ID accuracy for a fixed OOD detection level (Fig. 9).
- SCBNN-OCM vs standard FNN at ~50% ID coverage: **+25% accuracy, −20% ECE, +50% OOD detection probability**; beats SBNN-OCM on all three metrics for coverage <50% (Fig. 10).

## 8. Code / data availability
Code: https://github.com/kclip/Calibrating-Bayesian-Learning. Datasets public.

## 9. Leakage & limitations
- OOD set (TinyImageNet) is hand-chosen and distributionally far from CIFAR-100 — an easy OOD task; GSE's "OOD games" (e.g., playoff games, COVID-season games) are much closer to ID.
- The 25%/20%/50% headline numbers require ~50% rejection — a heavy coverage cost.
- VI with Gaussian diagonal posterior is a crude Bayesian approximation; the "Bayesian" benefits may not transfer to GSE's non-Bayesian pipeline.
- Selector needs a labeled validation set plus fitted outlier detectors on embeddings — extra infrastructure.
- ECE uses 15 bins with ≥100 samples/bin; GSE's weekly sample sizes are far smaller — ECE estimates will be noisy.

## 10. GSE overlap
Existing-research map: calibration entries exist (ledger 0691's NFL win-probability work) but no selective-calibration — new capability. This is the calibration-lane counterpart to the accuracy-lane abstention in 0692–0698.

## 11. GSE implementation spec
1. Add an MMCE-style calibration regularizer to GSE's classification head loss (λ swept on validation) — cheap, no architecture change.
2. Build the selective-calibration selector: inputs = (model confidence r̄, outlier scores vs historical game embeddings via kNN distance + isolation forest); train to minimize selective MMCE on a validation season with coverage target ξ (e.g., 0.5); publish iff selector score ≥ τ.
3. OOD/OOD-analogue: treat cross-era games (e.g., pre-2020 rule changes) as the uncertainty set for confidence minimization — penalize overconfidence on era-shifted games.
Effort: ~1 week (VI not required — the MMCE regularizer and selector work on frequentist nets too).

## 12. Reproducible test
Dataset: nflverse 2010–2025, ATS cover classification. Train (a) baseline, (b) +MMCE regularizer, (c) (b)+selective-calibration selector at ξ=0.5. Time-ordered: train ≤2022, validate 2023–2024 (fit selector, tune λ, τ), test 2025. Metrics: ECE (adaptive bins), accuracy, and ROI on selected games. Baseline to beat: (a) on selected-set ECE.

## 13. Acceptance / rejection gate
ADAPT if (c) reduces test-window selected-set ECE by ≥20% relative to (a) with accuracy not worse than (a) by more than 1pp; reject if the ECE gain requires >60% rejection or accuracy drops — then keep only the MMCE regularizer (b), which the paper shows helps even without selection.

## 14. Improvement experiment
Replace the paper's four hand-built outlier scores with a single learned "game typicality" score: distance in GSE's own embedding space to the k nearest historical games, and test whether the selector's rejection decisions correlate with known hard-game indicators (backup QB, extreme weather, large line moves). If the selector rediscovers these indicators, it validates the selector as a learned difficulty model; if it rejects for inscrutable reasons, fall back to the explicit indicator list as selector features.

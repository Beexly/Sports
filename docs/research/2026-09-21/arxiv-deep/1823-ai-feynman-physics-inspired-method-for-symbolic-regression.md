# [1823] AI Feynman: a Physics-Inspired Method for Symbolic Regression (arXiv:1905.11481)

**Citation:** Silviu-Marian Udrescu & Max Tegmark (2020). *AI Feynman: a Physics-Inspired Method for Symbolic Regression*. arXiv:1905.11481v2. URL: https://arxiv.org/abs/1905.11481
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

The divide-and-conquer architecture (NN-discovered symmetry/separability → recursion → polyfit/brute force) is the best template for GSE's metric-invention pipeline on multi-factor sports data; needs adaptation because sports quantities lack physical units and exhibit regime structure rather than symmetries.

## 1. Research question
Can physics-inspired strategies — dimensional analysis, translational/rotational/scaling symmetry detection, additive/multiplicative separability, low-order polynomial fitting, brute-force search — be combined recursively with a neural-network "hidden simplicity" detector to crack symbolic regression problems that pure genetic-programming search cannot (brute force alone would take longer than the age of the universe)?

## 2. Dataset / schema
The "Feynman Database for Symbolic Regression": 100 equations from the Feynman Lectures on Physics + 20 more-challenging "bonus" equations (selected for difficulty/fame, e.g. Kepler's ellipse, Goldstein 8.56). For each mystery: 100,000 synthetic data points sampled over specified ranges (80% train, 20% validation), units table for automated dimensional analysis. 6.5 GB freely downloadable (link in paper, Sec. IV). Code: https://github.com/SJ001/AI-Feynman. Bonus set deliberately selected and analyzed only AFTER hyperparameters were finalized — a true held-out test set.

## 3. Method / model
Recursive six-module algorithm (Fig. 1): any module that simplifies the problem generates new "mystery" datasets sent to fresh instantiations of the full algorithm.
1. **Dimensional analysis**: builds dimensionless independent variables (example: 6 dimensionless vars a=m2/m1…f=z1/x1 from a raw mystery), sometimes reducing the problem to a constant.
2. **Polynomial fit**: tries degrees 0–4 (dmax=4) by solving linear systems; success if best fit error small.
3. **Brute-force search**: three symbol subsets of increasing breadth (Table 1), two variants that automatically absorb additive/multiplicative constants so search focuses on form.
4. **Neural-network training**: feed-forward fully-connected NN, 6 hidden layers (3×128 + 3×64), softplus activation, 100 epochs, lr 0.005, batch 2048, Adam with weight decay 1e-2, FastAI 1-cycle schedule — trained to fit the mystery function.
5. **Symmetry detection (NN-driven)**: translational symmetry (Algorithm 1): test if f(x+Δ)≈f(x) using NN predictions, e.g. discovering g≡c−d, h≡e−f eliminates two variables in the worked example; ratio case = scaling symmetry. Precision threshold ε_sym = 7× NN validation error (≈7σ, near-zero false positives).
6. **Separability detection (NN-driven)**: test additive separability (replace */÷ with +/−) and multiplicative separability via Δ_sep over dataset with threshold ε_sep; on success, split into y' and y''=y/(y'·c_num), solve each recursively, recombine as y=y'y''/c_num (or additive analog). Tests all variable subsets.
7. **Transformations**: inversion and other simple transforms applied before polyfit/brute force.
Key property: when stuck, GA-style "more accurate approximations" may not be closer in symbol space; AI Feynman's recursive reduction is all-or-nothing on each subproblem, with the NN doing the hard structure discovery.

## 4. Equations & assumptions
Separability recombination: y = y'·y''/c_num (multiplicative; c_num = numeric constant absorbed); additive analog y = y' + y'' − c_num.
Symmetry threshold: ε_sym = 7 × NN validation error.
Separability metric Δ_sep < ε_sep over the dataset.
Assumptions: (1) f exhibits symmetry/separability/compositionality (physics-like structure); (2) NN can approximate f well enough to test invariances (softplus smooth activation); (3) polynomial pieces are ≤ degree 4; (4) constants factorizable as additive/multiplicative; (5) variables have known physical units for dimensional analysis.

## 5. Features / target
Generic: input = n real variables x1…xn of a mystery function; target = f(x). In Feynman DB: inputs = physical quantities (masses, positions, charges…), target = equation output. GSE analog: inputs = per-game/per-season team stats; target = points per drive, win probability added, next-season wins.

## 6. Validation design
100 basic mysteries + 20 bonus mysteries; AI Feynman vs commercial Eureqa (best public SOTA at the time), max 2h CPU per mystery; Eureqa on 4 CPUs with symbol set {+ − × / const int-const var sqrt exp log sin cos (+ arcsin/arccos only where needed)}, 300 data points (adding data doesn't help Eureqa). Bonus mysteries serve as a post-hoc test set (selected after hyperparameter lock). Metric: fraction of mysteries exactly recovered.

## 7. Numerical results / baselines
- Basic set: AI Feynman solved **100/100** vs Eureqa **71/100** (paper text also states "previous publicly available software cracks only 71"; Sec. IV restates Eureqa at 68% on Feynman equations — both figures are the paper's own claims, tables 4–5 use 71%).
- Bonus set: AI Feynman **90% (18/20)** vs Eureqa **15% (3/20)**.
- Biggest gains on the most complicated mysteries, where NN-discovered symmetry/separability eliminates variables before brute force.
- Qualitative finding: GA methods improve via "successively better approximations" that need not be symbolically closer to truth; AI Feynman's reductions produce exact structural wins.

## 8. Code / data availability
https://github.com/SJ001/AI-Feynman (open source). Feynman Database for Symbolic Regression (100 + 20 mysteries, 6.5 GB) freely downloadable. Built on FastAI/PyTorch.

## 9. Leakage & limitations
- Synthetic, noise-free-ish data (ranges sampled from exact equations): noise robustness far below PySR's EmpiricalBench; sports data is noisy.
- Hyperparameters were tuned on the basic 100 mysteries (train set); only the 20 bonus mysteries are a true test — but 20 is a small test sample.
- Assumes physics-style structure: symmetries and separability. Sports metrics often have REGIME structure (red zone vs midfield, garbage time) and interactions (QB×OL) that are not symmetries — the NN modules would rarely fire, degrading to brute force.
- Dimensional analysis has no sports analog (no units); that whole reduction module is unusable without a domain replacement (e.g. scale-invariance across eras, home/away normalization).
- 2h CPU/mystery is a research budget, not a production cadence.
- Exact-recovery metric overstates value for GSE: we need predictive, not exact, equations.

## 10. GSE overlap
No existing GSE implementation of divide-and-conquer SR; the 2026-09-18 ML brief's failed internal SR effort was almost certainly flat GP search with no structure discovery — exactly what AI Feynman improves on. The NN-as-simplicity-detector idea is new to GSE's toolkit. Complements ledger 1822 (PySR): PySR is the production engine; AI Feynman is the architectural idea (structure detection → recursion → search) that can sit in front of PySR as a preprocessing/divide step.

## 11. GSE implementation spec
- Build an "AI-Feynman-lite" front end to PySR: (1) fit a small MLP to the sports regression target; (2) probe it for additive separability across feature groups (e.g. offense stats vs defense stats vs context) using the Δ_sep procedure; (3) where separable, run PySR on each group independently and recombine (sum of group expressions minus constant, mirroring the additive recombination rule); (4) replace dimensional analysis with a "scale analysis" module: test whether the target is scale-invariant in pace/total-plays (sports analog of dimensionless groups) and normalize by it.
- Data: nflverse team-game rows 2009–2025 (features: EPA/play, success rate, air yards, pressure rate, sack rate, turnover margin, pace); target: points per drive.
- Effort: ~3 engineer-days (MLP prober + separability test + PySR orchestration); all open-source components.

## 12. Reproducible test
Dataset: nflverse team-game 2015–2023 train, 2024–2025 test. Baseline A: flat PySR search on all features (predict points/drive). Challenger: AI-Feynman-lite (separability split → per-group PySR → recombination). Metric: held-out RMSE. Success = challenger beats flat PySR by ≥5% RMSE with total tree-node count ≤ 1.2× flat's.

## 13. Acceptance / rejection gate
ADOPT the separability front-end if it yields ≥5% held-out RMSE improvement over flat PySR on the 2024–2025 test window with no more than 20% more total nodes; REJECT if separability never fires (Δ_sep never below threshold on real data) or the recombined equation underperforms flat search.

## 14. Improvement experiment
"Regime separability": instead of variable-subset separability, probe the fitted MLP for separability across DATA subsets — cluster game situations (score differential × time remaining × field position) and test whether different clusters admit different symbolic forms. This ports AI Feynman's core trick (let the NN tell you where the problem splits) from the variable axis to the regime axis, which matches how football actually works (garbage time, red zone, two-minute drill are different DGPs).

---
Lane: symreg_equation_discovery · Block 1822–1841

# [1650] Nested Conformal Prediction and Quantile Out-of-Bag Ensemble Methods (QOOB) (arXiv:1910.10562)

**Citation:** Chirag Gupta, Arun K. Kuchibhotla, Aaditya K. Ramdas (2022). *Nested Conformal Prediction and Quantile Out-of-Bag Ensemble Methods*. arXiv:1910.10562. URL: https://arxiv.org/abs/1910.10562
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections: nested framework §§2–4, QOOB §5, numerical comparisons §6, appendices on cross-conformal/CV+ computation).
**Verdict:** ADAPT — the nested-set viewpoint unifies every conformal flavor GSE uses (split, cross, jackknife+, OOB) into ONE framework, and QOOB (quantile regression + cross-conformal + ensembles + out-of-bag) beats split-CQR at small sample sizes on all 6 UCI datasets — the early-season regime. For GSE: adopt the nested formalism as the internal standard (it makes cross-conformal computationally tractable via the paper's efficient algorithm), and deploy QOOB-style no-split conformal for weeks 1–6 when calibration data is scarce.

## 1. Research question
Conformal prediction is usually presented via nonconformity SCORES — but scores obscure the connections between split, cross-conformal, jackknife+, and OOB methods. Can an equivalent NESTED-SET viewpoint (start with nested sets F_t(x), calibrate t) subsume all score-based methods, extend cleanly to aggregation schemes (cross, jackknife+, OOB), and yield a new method that uses ALL data for both training and calibration?

## 2. Dataset / schema
**6 UCI regression datasets**: blog feedback, concrete strength, superconductivity, news popularity, kernel performance, protein structure (+ 5 more in Appendix G.1). Protocol: 100 independent versions per dataset, each = 1,000 random points split into **768 train / 232 test** (768 divisible by many fold-counts for K-fold variants). Metrics: Ave-Mean-Width (Lebesgue measure of the prediction set, averaged over 100 versions × 232 test points) and Ave-Mean-Coverage, each with estimated SD. Base regressor: random forests with T trees (each tree on a bootstrap sample ≈63.2% of points). Simulated data for §6.5 (conditional coverage): ε₁, ε₂ ~ N(0,1), u, X ~ Unif[0,1], Y ~ Pois(sin²(X)+0.1) + 0.03Xε₁ + 25·1{u<0.01}ε₂ (heavy-tailed contamination).

## 3. Method / model
**Nested conformal framework**: any nonconformity score induces nested sets F_t(x) = {y : s(x,y) ≤ t}; calibrating t on held-out scores ≡ standard conformal. The framework extends to: K-fold cross-conformal, CV+, jackknife+ (all as nested-set operations), subsampling/bootstrap conformal. **QOOB** (new): quantile-regression forests give nested quantile sets; OOB predictions supply the calibration scores WITHOUT splitting; cross-conformalization aggregates. Computational contribution: an EFFICIENT cross-conformal algorithm (the naive version is O(n²)-ish per test point). Key theoretical results: equivalence proofs (score-based ⟺ nested), finite-sample coverage for the LOO construction C^LOO(x), and Conv(C^LOO) can be strictly SMALLER than the jackknife+ interval.

## 4. Equations & assumptions
- Nested sets: `F_t(x) = { y : s(x, y) ≤ t }`, nested in t
- Width: `width(C(x)) = Lebesgue measure` (sum over disjoint intervals)
- Ave-Mean-Width `= (1/100)Σ_b (1/232)Σ_i width(C_b(X_i^b))`; Ave-Mean-Coverage analogous with 1{Y ∈ C}
- QOOB: QRF quantile sets + OOB calibration + cross-conformal aggregation
- Assumptions: exchangeability (all finite-sample guarantees); QRF consistency for the conditional-coverage empirics.

## 5. Features / target
UCI tabular features → continuous targets. Transfer: GSE game features → margin/total; OOB = out-of-bag across bootstrap model fits (GSE already bootstraps in places).

## 6. Validation design
100 versions × (768 train/232 test) per dataset; α = 0.1 nominal. Methods: split conformal (SC-T), split-CQR, cross-conformal variants, jackknife+, QOOB with varying T (trees) and nominal quantile selection. Metrics: mean width + coverage with SDs. §6.1: nominal-quantile selection effect; §6.2: width vs number of trees; §6.3: small-sample QOOB vs split-CQR; §6.4: cross-conformal vs jackknife+; §6.5: conditional coverage on the contaminated simulation.

## 7. Numerical results / baselines
- **§6.3: QOOB significantly outperforms split-CQR at small sample sizes on ALL 6 datasets** (narrower intervals at valid coverage) — the no-split design wins exactly when data is scarce.
- §6.1: nominal quantile selection has a significant effect on QOOB width — tuning the inner quantile level matters.
- §6.2: QOOB intervals get SHORTER as T (trees) increases — more trees help, no plateau observed in range tested.
- §6.4: cross-conformal outperforms jackknife+ (tighter, still valid); Conv(C^LOO) can be strictly smaller than the jackknife+ interval.
- §6.5: QOOB demonstrates conditional coverage empirically on the contaminated simulation (n ≤ 300), matching split-CQR's behavior from Romano et al. 2019 at n=2000 — with far less data.

## 8. Code / data availability
MATLAB code: https://github.com/AIgen/QOOB (paper abstract cites https://github.com/aigen/QOOB). UCI datasets public; protocol fully specified.

## 9. Leakage & limitations
(a) QOOB costs ~n× the prediction compute of split-CQR (n individual OOB predictions) — the paper is explicit; for GSE's weekly batch this is fine, for real-time props it's not. (b) Exchangeability assumed throughout; no drift handling (combine with [1641]/[1645]). (c) MATLAB reference implementation — needs porting to the TS stack. (d) The nominal-quantile sensitivity (§6.1) means QOOB needs its own tuning, not just plug-and-play. (e) 768/232 splits are generous vs GSE's early-season n≈50 — the small-n advantage is shown relatively, not at GSE's exact scale.

## 10. GSE overlap
GSE's conformal stack is split-only (`conformal-calibration.ts`, `cqr.ts`) — no cross-conformal, no jackknife+, no OOB. The nested-set formalism would let GSE express ALL of these (plus the EnbPI [1641] and SPCI [1642] variants) in one codebase instead of three. No existing ledger covers Gupta et al. (2022). The `model-parliament.ts` ensemble machinery is the natural host for the QRF/OOB components.

## 11. GSE implementation spec
(1) **Nested-set conformal module**: refactor the conformal core around F_t(x) nested sets with the paper's efficient cross-conformal algorithm; (2) **QOOB-margin**: QRF (or GBM quantile) base, OOB calibration, cross-conformal aggregation, tuned inner quantile per §6.1; (3) deploy as the weeks-1–6 interval method (small-n regime), handing off to split-CQR ([1639]) once n_cal ≥ 200; (4) port the MATLAB reference to TS. Effort: 1 week.

## 12. Reproducible test
Dataset: GSE engine backtest 2023–2025. Simulate early-season: for each season, train on weeks 1–k (k = 4, 6, 8), calibrate OOB-style, test on week k+1. Metrics: empirical coverage, mean width vs split-CQR at the same k (the paper's §6.3 comparison, replicated on GSE data). Also full-season cross-conformal vs split conformal width comparison.

## 13. Acceptance / rejection gate
ADAPT if: at k ≤ 6 weeks, QOOB coverage within ±2pp of nominal AND mean width ≤ 90% of split-CQR (replicating the paper's small-n win). REJECT the full QOOB machinery if the efficient cross-conformal port proves too slow for the weekly batch — keep just the nested-set refactor (still a code-architecture win).

## 14. Improvement experiment
**Cross-conformal + ACI hybrid**: the paper's efficient cross-conformal gives tight valid intervals under exchangeability; wrap its level in the ACI/PID controller ([1640]/[1643]) for drift. Test whether cross-conformal+ACI beats split-conformal+ACI on full-season coverage AND width — combining the two strongest ideas of this wave.

**Verdict:** ADAPT — refactor GSE's conformal core around the nested-set formalism with the paper's efficient cross-conformal algorithm, and deploy QOOB (QRF + OOB + cross-conformal) as the small-n (weeks 1–6) interval method; accept on beating split-CQR width by ≥10% at valid coverage in the early-season backtest.

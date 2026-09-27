# [1520] A Ranking Approach for Measuring Calibration (arXiv:2609.13100)

**Citation:** Anirban Chatterjee, Rina Foygel Barber (2026). *A Ranking Approach for Measuring Calibration*. arXiv:2609.13100v1 [stat.ME]. URL: https://arxiv.org/abs/2609.13100
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via pdftotext; ~6,300 words, all sections incl. theorems, experiments, appendices referenced).
**Verdict:** ADAPT — replace GSE's binned ECE with the tuning-free rankECE in calibration reporting and adopt its asymptotic test as a second QC gate; do not treat it as a recalibration method (it is a measure, not a fix).

## 1. Research question
Can we measure binary-classifier calibration error with a tuning-free estimator that (a) concentrates assumption-free, (b) approximates ℓ2-ECE better than binned ECE, and (c) is zero exactly iff the model is perfectly calibrated?

## 2. Dataset / schema
Simulations: Z=f(X)~Unif[0,1], Y|Z~Ber(g(Z)) for three conditional-probability functions — Quadratic g(z)=0.8z²−0.2z+0.2, Spikes (10 alternating Gaussian spikes), Increasing Frequency g(z)=0.15+0.7z+0.5·sin(40πz²); n∈{10²,…,10⁵}, T=100 reps. Real: Amazon & Yelp Review Polarity (5×10⁴ test subsample), four Hugging Face sentiment models (DistilBERT-SST2, BERT-SST2, RoBERTa-Twitter-Sentiment, BERT-Multilingual-Stars), evaluation n∈{100,…,10,000}. Power study: Z~Beta(ρ,1−ρ), Y|Z~Ber(Z−Z⁴), ρ∈(0,1), 200 reps.

## 3. Method / model
rankECE: sort predicted probabilities Z_(1)≤…≤Z_(n), then
rankECE_n(f) = (1/n)·Σ_{i=1}^{n−1} (Y_{π(i)} − Z_{π(i)})·(Y_{π(i+1)} − Z_{π(i+1)}) (Eq. 2.1).
Motivation: ℓ2-ECE = E[(Y−Z)(Y′−Z)] with Y,Y′ i.i.d. given Z; consecutive order statistics are approximately equal-Z, so their labels act as the two independent draws. Intuition: data-adaptive binning with bins of size 2. Two calibration tests: finite-sample (Bernstein-based, Prop. 3.4) and asymptotic Gaussian test (Thm. 3.2 / Cor. 3.1).

## 4. Equations & assumptions
- ℓ2-ECE(f) = E|E[Y|f(X)] − f(X)|² (Eq. 1.2); calibration identity E[Y|f(X)] = f(X) a.s. (Eq. 1.1).
- ℓ2-binECE(f) = Σ_j P(f(X)∈B_j)·E[Y−f(X)|f(X)∈B_j]² (Eq. 1.3); estimator ℓ̂2-binECE = Σ_j p̂_j·(Ȳ_j − Z̄_j)² (Eq. 4.1).
- Prop. 2.1 (concentration, assumption-free): |rankECE − rankECE| ≤ √(81·log(2/δ)/(32n)) w.p. ≥ 1−δ.
- Prop. 3.1: 0 ≤ rankECE(f) ≤ ℓ2-ECE(f).
- Prop. 3.2: rankECE_n(f) →p ℓ2-ECE(f) as n→∞ (fixed f).
- Prop. 3.3: |rankECE(f) − ℓ2-ECE(f)| ≤ (‖r‖_TV + 1)/n, where r(Z)=E[Y−Z|Z] and ‖r‖_TV is total variation.
- Thm. 3.1: rankECE(f)=0 iff f perfectly calibrated (n≥4) — binECE lacks this (Kumar et al. 2019 Ex. 3.2).
- Thm. 3.2: under H0, √n·rankECE_n(f)/√(E[Z²(1−Z)²]) →d N(0,1) (martingale CLT); Cor. 3.1 gives the asymptotic test with sample denominator.
- Prop. 3.4 (finite-sample test): reject if rankECE > 2√(σ²(Z)·log(2/α)/n) + 2·log(2/α)/(3n), σ²(Z)=(1/n)Σ Z_(i)(1−Z_(i))Z_(i+1)(1−Z_(i+1)); consistent under H1.
- Lemma 4.1: E[ℓ̂2-binECE] − ℓ2-binECE ≤ K/n (irreducible bias; tight up to constants — Remark 4.1: ≥ (1/6)(1−1/(en))·(K/n) in the calibrated uniform case).
- Thm. 4.1 (dominance): rankECE(f) ≥ ℓ2-binECE(f) − 4K/n for any K-bin partition — for K=o(n) the binned measure underestimates ℓ2-ECE at least as much as rankECE.
- Assumptions: Z nonatomic (ties handled in Appendix F); Prop. 3.3 needs bounded-variation residual (Appendix C shows it is essential — adversarial TV-growing residuals defeat rankECE); hardness remark (Angelopoulos et al. 2024): no uniformly consistent estimator of ℓ2-ECE exists assumption-free.

## 5. Features / target
Any binary probabilistic classifier's (Z=f(X), Y) pairs. Experiments use simulated Z and pretrained NLP sentiment models. For GSE: engine's published win/cover probabilities vs. realized outcomes.

## 6. Validation design
Ratio rankECE/ℓ2-ECE vs. binECE(K)/ℓ2-ECE across n for K∈{10, √n, n^{1/3}, n/20}; ℓ2-ECE approximated on a fine grid (simulations) or via Lee et al. (2023) debiased binECE on the full 5×10⁴ subsample (sentiment). Power study vs. SKCE (Widmann et al. 2019): SKCE-U/SKCE-L × Gaussian/Laplace kernels, B=100 multiplier bootstrap; type-I error and power vs. n and vs. ρ at α=0.05.

## 7. Numerical results / baselines
- Simulations: rankECE/ℓ2-ECE → 1 rapidly with n and stays substantially closer to 1 than any binECE(K) at moderate n; K=10 collapses on the oscillatory functions; K=n/20 shows persistent positive bias (matches Lemma 4.1).
- Sentiment (all 4 models, both corpora): rankECE consistently the closest approximation; K=10 fine for RoBERTa/Multilingual but inconsistent for the SST2 models; K=√n converges slowly; K=n^{1/3} shows finite-sample bias on BERT/DistilBERT-SST2.
- Tests: all methods control type-I error at 0.05; asymptotic rankECE test power comparable to SKCE-U, finite-sample test comparable to/sometimes exceeding SKCE-L; rankECE tests "significantly faster," orders-of-magnitude speedup over SKCE-U (exact timings in Appendix A.3).
- Example 4.1 (oscillatory residual, c=0.2, m=25): ℓ2-ECE=c²=0.04; rankECE ∈ [0.04 − (4·25·0.2+1)/n, 0.04] detects it, while ℓ2-binECE ≤ c²K/m collapses when K≪m.
- Appendix B (verified 2026-09-21, full appendix read): rankECE is both **testable** (Prop. 2.1 concentration → τ-threshold test via holdout, with a construct-and-fallback-to-constant-model recipe) and **actionable** — Theorem B.1: the plug-in decision rule 1{f(X)≥τ} has excess risk vs. the best M-piecewise-monotone-transformed rule bounded by rankECE(f) + √(8(M+1)/n); extends to arbitrary bounded proper scores via the Schervish representation.
- Appendix A (verified): six additional DGPs (Linear, Staircase, Gaussian, Sawtooth, Random Fourier, Weierstrass) corroborate the main results; power results hold under different misspecification forms (g(z)=z−z¹⁵, g(z)=z+¼·sign(sin(10πz))); rankECE tests run in ~0.02–0.03 ms vs. SKCE-U's 3–60 ms (quadratic, needs multiplier bootstrap), MacBook Pro M4.
- Appendix C formalizes the blind spot: rankECE detects miscalibration iff oscillation frequency m ≪ n; when m ≫ n both methods fail — O(1/n) is the finest resolvable resolution.

## 8. Code / data availability
Code: https://github.com/anirbanc96/rankece. Data: public (Amazon/Yelp Polarity via AWS Open Data registry; Hugging Face models).

## 9. Leakage & limitations
- No leakage; ℓ2-ECE ground truth for sentiment is itself an estimate (debiased binECE on 5×10⁴) — the "better approximation" claim there is relative to a noisy oracle.
- Bounded-total-variation assumption is load-bearing; adversarial high-frequency residuals (Appendix C) defeat it — same blind spot class as EDGE's rough-misfit limit (ledger 1519), worth noting as a shared boundary.
- One-dimensional by construction (needs a ranking of Z); no multivariate extension (open question).
- rankECE measures miscalibration; it does not recalibrate — and the finite-sample test is conservative (power loss vs. asymptotic).
- Assumes nonatomic Z; ties need Appendix F's extension (relevant for GSE if probabilities are rounded to e.g. 2 decimals — tie handling matters).

## 10. GSE overlap
Existing research map (~/workspace/arxiv-sweep/existing-research-map.md) calibration cluster uses binned ECE/reliability diagrams. rankECE is a strict upgrade of the *measure*: tuning-free (no bin-count argument), exact zero-iff-calibrated characterization, and a hypothesis test with closed-form asymptotics. Complements ledger 1519 (EDGE — a directed *test* of the reliability table) and 1518 (conformal win probabilities — the numbers being measured). No duplication.

## 11. GSE implementation spec
- Add `rankECE(probs, outcomes)` to the engine's calibration module (TypeScript): sort by prob, sum consecutive residual products, divide by n. ~15 lines.
- Replace the binned-ECE number in the weekly reliability report with rankECE + the asymptotic z-test p-value (Corollary 3.1); keep the reliability diagram for humans.
- Handle rounded probabilities via tie-breaking (random jitter or Appendix F extension).
- Effort: <0.5 day.

## 12. Reproducible test
Dataset: GSE published NFL moneyline probs + outcomes, 2022–2024 (~800 games). Compute rankECE and binned ECE (K=10,15,20). Check: (a) rankECE ≤ binned ECE + 4K/n ordering behaves per Thm. 4.1; (b) inject the oscillatory miscalibration from Example 4.1's spirit (add ±0.05 sin(40πz) to a calibrated copy) and confirm rankECE detects it while K=10 binECE misses it.

## 13. Acceptance / rejection gate
ADOPT rankECE as the headline calibration number if on the 2022–2024 backtest it is stable across two independent halves (split-half |Δ| < 0.005) AND the asymptotic test rejects the deliberately-distorted copy at p<0.01; otherwise keep binned ECE and revisit.

## 14. Improvement experiment
Go beyond the paper: extend rankECE to the multiclass/top-label setting GSE needs for derivative markets (spread/total/1H lines) by ranking on the predicted probability of the *taken* side and testing whether the zero-iff-calibrated property survives — the paper's open question, and exactly GSE's use case since picks span moneyline, spread, and totals.

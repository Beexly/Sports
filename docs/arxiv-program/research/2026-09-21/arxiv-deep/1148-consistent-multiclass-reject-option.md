# [1148] Consistent Algorithms for Multiclass Classification with a Reject Option (arXiv:1505.04137)

**Citation:** Ramaswamy, H. G.; Tewari, A.; Agarwal, S. (2015). *Consistent Algorithms for Multiclass Classification with a Reject Option*. arXiv:1505.04137. URL: https://arxiv.org/abs/1505.04137
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, arXiv:1505.04137v1 [cs.LG]).
**Verdict:** ADAPT

The consistency theory for multiclass abstention extends GSE's abstention lane beyond binary picks: the binary-encoded-predictions (BEP) surrogate learns abstention over n outcomes with only log₂(n) functions and trains 3–30× faster than one-vs-all — the right machinery if GSE ever abstains over multi-outcome markets (multi-bucket props, exact-score bands).

## 1. Research question
Which convex surrogates yield provably consistent algorithms for n-class classification with a reject option (abstain at cost α), and can one do it in much less than n dimensions?

## 2. Dataset / schema
- Synthetic: 8 classes in R², 12,800 train / 10,000 test; class prototypes ∼ N(0,I₂), instances = prototype + 0.65·N(0,I₂).
- UCI real datasets: satimage (4,435/2,000, 36 feats, 6 classes), yeast (1,000/484, 8, 10), letter (16,000/4,000, 16, 26), vehicle (700/146, 18, 4), image (2,000/310, 19, 7), covertype (15,120/565,892, 54, 7). Gaussian-kernel RKHS; hyperparams by 10-fold CV (or 75/25 split); rejection rate fixed at 0%/20%/40% by tuning the predictor threshold τ.

## 3. Method / model
- abstain(α) loss: 1 if t≠y (t≠n+1), α if t=n+1, 0 if t=y. Bayes rule: h*(x) = argmax_y p_x(y) if max p ≥ 1−α else abstain; meaningful α ∈ [0,(n−1)/n]; paper focuses α=1/2 (predict a class only on simple majority).
- Three consistent surrogates for abstain-1/2 (with non-standard predictors, not argmax):
  (a) Crammer-Singer: ψ^CS(y,u) = (max_{j≠y} u_j − u_y + 1)_+, pred = argmax_i u_i if u_(1) − u_(2) > τ_CS else abstain.
  (b) One-vs-all hinge: ψ^OVA(y,u) = Σ_i [1(y=i)(1−u_i)_+ + 1(y≠i)(1+u_i)_+], pred = argmax_i u_i if max_j u_j > τ_OVA else abstain.
  (c) **BEP (new)**: encode class y as d=⌈log₂n⌉-bit code B(y)∈{±1}^d; ψ^BEP(y,u) = (max_j (−B_j(y)·u_j) + 1)_+; pred = abstain if min_j |u_j| ≤ τ else B^{−1}(sign(u)).
- Generalized versions of all three consistent for any α ∈ [0,1/2] (Theorem 3); for n=2 all reduce to (generalized) hinge.
- BEP optimization: primal/dual derived; block coordinate ascent on dual with O(d) per-iteration ℓ₁-ball projections (Duchi et al. 2008).

## 4. Equations & assumptions
- Excess risk bounds (Theorems 1–2): er^ℓ_D[pred∘f] − er^{ℓ,*}_D ≤ (er^ψ_D[f] − er^{ψ,*}_D)/(2min(τ,1−τ)) (BEP/CS) and /(2(1−|τ_OVA|)) (OVA) — linear calibration ⇒ consistency.
- Surprising result: CC-dimension of the abstain loss is ≤ ⌈log₂n⌉, vs ≥ n−1 needed for standard n-class (no-reject) consistency (Ramaswamy & Agarwal 2012).
- Assumptions: i.i.d. data; convex surrogate in score vector; τ chosen by CV (aggressive near 0/1 in low noise, conservative in high noise); for α > 1/2 abstention is never Bayes-optimal.

## 5. Features / target
Generic multiclass features. GSE mapping: multi-outcome markets — e.g., first-TD-scorer buckets, exact final-score bands, or multi-way derivative props — with an explicit abstain action at cost α.

## 6. Validation design
Learning curves (expected abstain loss vs training size) on synthetic 8-class for thresholds τ ∈ {0, 0.25, 0.5, 0.75, 1} — all three approach Bayes risk for intermediate τ; degenerate τ (0/1) never abstains and performs poorly. UCI: error % at fixed 0/20/40% rejection + wall-clock training time.

## 7. Numerical results / baselines
Error % (reject 0% → 20% → 40%), CS | OVA | BEP:
- satimage: 10.25/8.3/8.15 → 5.6/2.5/2.4 → 2.9/0.9/0.6
- yeast: 44.4/38.8/42.7 → 34.5/26/29.7 → 24/17/19.8
- letter: 4.8/2.8/4.6 → 1.4/0.1/0.6 → 0.4/0/0.1
- vehicle: 31.5/17.1/20.5 → 24.6/8.2/13 → 16.4/5.5/6.1
- image: 5.8/5.1/4.2 → 2.2/1.6/1.6 → 0.6/0.6/0.3
- covertype: 32.2/28.1/29.4 → 23.6/19.3/20.4 → 16.3/11.7/12.8
BEP ≈ OVA accuracy, both beat CS; BEP trains fastest — e.g., letter: 9,608s (CS) / 1,055s (OVA) / 313s (BEP); covertype: 47,974s / 23,709s / 6,786s. BEP weak with linear function class (needs kernel).

## 8. Code / data availability
No code released. OVA/CS run via Joachims' SVM-light. Datasets: UCI (public); synthetic regenerable from the paper's equations.

## 9. Leakage & limitations
- **Consistency is asymptotic** — finite-sample behavior is what Table 1 shows, and OVA matches BEP there; the log(n) advantage is computational, not statistical.
- **BEP needs kernels** to work (poor with linear class); the bit-code trick couples class bits in ways that may hurt on structured label spaces.
- **α ≤ 1/2 restriction** for the piecewise-linear surrogates (probability-estimation surrogates cover all α but "do more than necessary").
- **Threshold τ still tuned post-hoc** to hit target rejection rates — the "no threshold" elegance of 1146 doesn't carry over; τ is chosen by CV/validation.
- **No GSE-domain validation**; UCI datasets only.

## 10. GSE overlap
1146 gave binary pick-abstention (bet A / abstain / bet B is n=2, where this paper's surrogates reduce to hinge — consistent with 1146's SVM framing). This paper's marginal contribution is the **n > 2 case with an abstain action**: GSE's multi-outcome markets (TD-scorer boards with 20+ names, exact-score bands, derivative props) currently have no abstention machinery at all. The BEP surrogate is the efficient way to add "don't bet this market" to a many-class model without training n one-vs-all classifiers. Also relevant: the α-as-abstain-cost formalism gives a principled alternative to GSE's fixed edge thresholds — set α from the staking economics (abstain cost = forgone edge).

## 11. GSE implementation spec
Prototype **multi-outcome abstention** on one market: anytime-TD-scorer (top-12 names + field = 13 classes + abstain):
1. Features: player TD projection, odds-implied probability, line movement, matchup; label = who scored first TD (13 classes).
2. Train OVA-hinge and BEP surrogates (kernel or GBM base) with abstain(α), α set from economics: α = (expected edge of a random bet)/(cost of being wrong) ≈ 0.2–0.3.
3. Predictor: abstain unless some class clears the τ bar; sweep τ to trace error-reject curve.
4. Compare vs baseline (always bet highest-edge name) on 2023–2024 ROI.
Effort: ~1 week prototype on one market.

## 12. Reproducible test
Dataset: 2023–2024 NFL anytime-TD markets (odds + outcomes) for a fixed book. Train ≤2023, test 2024. Baselines: (a) always-bet-best-edge, (b) fixed-probability-threshold abstention. Metrics: ROI at 20% and 40% abstention rates; calibration of the abstain decision (are abstained markets actually lower-edge?). Success: surrogate-based abstention beats the fixed-threshold baseline on ROI by ≥2 points at matched abstention rates.

## 13. Acceptance / rejection gate
ADOPT multi-outcome abstention only if: (a) it beats fixed-threshold abstention on 2024 ROI at ≥2 abstention rates, (b) BEP and OVA agree on ≥80% of abstain decisions (method stability), and (c) the abstain rate doesn't collapse to 0 or 1 on any single team/season slice. Otherwise keep binary abstention (1146) and revisit when GSE prices multi-outcome props at scale.

## 14. Improvement experiment
Make α **market-adaptive**: instead of a global abstain cost, set α per market from the book's hold/vig (high-vig markets ⇒ higher α ⇒ abstain more). Hypothesis: the paper's fixed-α analysis leaves money on the table where the book's pricing is sharpest — test whether α(vig)-adaptive abstention improves ROI over fixed-α on a cross-book 2024 dataset.

---

**Notes for tracker:** arXiv:1505.04137v1 [cs.LG]. Primary ledger #1148 in reader-05 wave-3 set. Full text read.

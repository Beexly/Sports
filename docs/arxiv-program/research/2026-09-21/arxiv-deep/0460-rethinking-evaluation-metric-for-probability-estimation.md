# [0460] Rethinking Evaluation Metric for Probability Estimation Models (arXiv:2309.06248v1)

**Citation:** Choi, E., Kim, J., Lee, W. (2023). *Rethinking Evaluation Metric for Probability Estimation Models*. arXiv:2309.06248v1. URL: https://arxiv.org/abs/2309.06248v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2188 lines).
**Verdict:** REJECT — the proposed "Balance score" is not a valid replacement for ECE: its signed errors cancel whenever miscalibration changes direction, and its advertised ECE-approximation holds only under a globally one-directional miscalibration assumption that fails on GSE's sliced NFL probabilities.

## 1. Research question
Can a binning-free, per-example signed "gain/loss" score — the **Balance score** — serve as a better evaluation metric for probability estimation models than the Brier score and binned Expected Calibration Error (ECE), whose values the authors show can be unstable and even reverse model rankings as the number of bins M varies?

## 2. Dataset / schema
- **Synthetic:** 100,000 samples each drawn from Beta(0.5,0.5), Beta(1,1), and Beta(2,2) as true-probability distributions; ECE computed with M=10 bins. Second synthetic study: 10,000 uniform true probabilities with overconfidence tendencies 0.10 vs 0.11.
- **Real:** League of Legends match data — 100,000 matches at each of 5, 10, and 15 minutes elapsed; 60,000 train / 40,000 test split; logistic regression; 14 features: five role-level gold differences, five role-level XP differences, two dragon counts, two tower counts; target = match win.
- Access: synthetic is reproducible; LoL dataset source not stated as public in the extracted text.

## 3. Method / model
The Balance score is a piecewise per-example function g(q; p) of the predicted probability q and the true probability p (paper's Eq. 8), averaged over examples (Eq. 9). The claimed property (Eq. 10–11) is that its expectation is zero when q = p (perfect calibration), and |g(q;p)| = |q − p| — i.e., the absolute value of the average Balance score approximates the true ECE **when the model is globally overconfident or globally underconfident** (miscalibration in one direction). No binning is required.

## 4. Equations & assumptions
The paper's mathematical spine (equation numbers as in the paper): Brier score decomposition (Eqs. 1–3); expected score as an integral over the true-probability distribution (Eq. 4); definitions of perfect calibration, true ECE, and binned ECE (Eqs. 5–7); the piecewise Balance score g(q;p) (Eq. 8); its sample average (Eq. 9); the claim E[g] = 0 at q = p (Eq. 10); and the key identity |g(q;p)| = |q − p| (Eq. 11), from which |average Balance| ≈ true ECE follows **only if** the sign of (q − p) is constant across the probability range — i.e., the model is everywhere overconfident or everywhere underconfident. This one-directional-miscalibration condition is the load-bearing assumption, and it is stated in the paper but easy to miss. The Balance score is not a proper scoring rule (it is signed and aggregates by cancellation).

## 5. Features / target
- Synthetic: predicted probabilities vs known true probabilities (target = closeness to truth / true ECE recovery).
- LoL: 14 in-game state features (gold/XP diffs by role, dragons, towers) at 5/10/15 minutes; target = eventual match winner (binary).

## 6. Validation design
- Synthetic recovery study: compare |Balance| and binned ECE against known true ECE across Beta families.
- Model-ordering stress test: two models with overconfidence tendencies 0.10 vs 0.11; show that ECE with bins M ∈ [5,100] can reverse which model looks better, while |Balance| is stable.
- Sample-efficiency study: true ECE for tendency 0.1 is 0.025; |Balance| approaches it with far fewer samples than ECE, which needs more than ~500 samples.
- Real data: LoL logistic-regression win probabilities at three game times; report accuracy, Brier, ECE, Balance.

## 7. Numerical results / baselines
Paper's Table II (exact values):
| Setting | Accuracy | Brier | ECE | Balance |
|---|---|---|---|---|
| Beta(.5,.5) | 81.88% | 0.1241 | 0.0019 | 0.0000 |
| Beta(1,1) | 75.01% | 0.1666 | 0.0017 | −0.0004 |
| Beta(2,2) | 68.92% | 0.1995 | 0.0031 | 0.0013 |
| LoL 15 min | 79.84% | 0.1385 | 0.0078 | −0.0039 |
| LoL 10 min | 73.55% | 0.1755 | 0.0068 | −0.0016 |
| LoL 5 min | 65.56% | 0.2159 | 0.0058 | 0.0043 |
Additional claims: in the ordering stress test, ECE with M=5–100 bins can reverse the ranking of the two overconfident models, while |Balance| preserves it; the true ECE for overconfidence tendency 0.1 is 0.025, and ECE requires more than 500 samples to approach it whereas |Balance| converges faster. All numbers are the paper's; interpretation (stability) is the authors'.

## 8. Code / data availability
None stated in the extracted text.

## 9. Leakage & limitations
- **Fatal flaw — sign cancellation:** because the Balance score is signed, overconfident regions and underconfident regions cancel in the average. A model that is +5% miscalibrated on favorites and −5% on underdogs scores ~0 — appearing "balanced" while being badly miscalibrated everywhere. This is exactly the failure mode ECE's absolute value was designed to avoid.
- **The approximation theorem is conditional:** |Balance| ≈ true ECE only under globally one-directional miscalibration. The paper's own motivating case (NFL-style sliced probabilities, where GSE is overconfident on some slices and underconfident on others) violates the premise.
- **Not a proper scoring rule:** it cannot be used as a training objective and gives no per-region diagnostic; it is strictly less informative than a reliability diagram.
- **ECE-binning critique is valid but narrow:** bin-count sensitivity of ECE is real, but the fix the field adopted is fixed-bin ECE with confidence intervals / LRD dashboards (already in GSE's stack), not a signed aggregate.
- **Weak real-data evidence:** the LoL experiment is a single logistic-regression model family; no comparison against modern recalibration methods.
- External validity to NFL: none demonstrated; the LoL feature set has no analog to market-implied probabilities.

## 10. GSE overlap
Per `existing-research-map.md`, GSE's calibration stack already covers ECE-by-sport/week slices, reliability diagrams / LRD dashboards (2207.13770), grouping loss (2210.16315), and temperature/Platt/isotonic scaling. The Balance score would be a **redundant, weaker diagnostic** relative to the existing slice-based ECE + LRD tooling — it adds no information the current dashboards don't already provide, and its sign-cancellation property makes it actively misleading as a headline metric. Verdict rationale: reject as a replacement metric.

## 11. GSE implementation spec
No build recommended. If a cheap supplemental diagnostic is ever wanted: compute the signed mean of (predicted − empirical) per calibration slice alongside the existing ECE/LRD dashboards as a one-line addition to the calibration notebook — this captures the "direction of miscalibration" information the Balance score gestures at, without adopting its flawed aggregation. Effort: <1 hour. No model, training, or serving changes.

## 12. Reproducible test
On GSE's existing backtest set (2024–2025 NFL seasons, engine spread-cover probabilities vs outcomes): compute per-decile signed calibration error (mean predicted − mean observed) and compare against the paper's implicit claim that a near-zero signed average implies good calibration. Expected result: slices with large |signed error| in opposite directions (documented in the existing ECE-by-slice work), which would give |Balance| ≈ 0 despite poor calibration — a direct empirical falsification of the metric's usefulness. Baseline: the existing binned-ECE/LRD dashboard.

## 13. Acceptance / rejection gate
**Adopt** (as even a supplemental diagnostic) only if, on the 2024–2025 backtest, the signed Balance-style average disagrees with binned ECE on model ranking in a case where binned ECE is independently verified correct by a proper scoring rule (log loss) — i.e., the metric must demonstrate it catches something ECE misses. **Otherwise reject** — and the sign-cancellation argument in §9 already predicts rejection, so this test is a formality before closing the lane.

## 14. Improvement experiment
If the binning-instability concern is taken seriously, the better follow-up is a **binning-robust ECE**: compute ECE over an ensemble of bin counts/edges (M ∈ {5,10,15,20,50} × quantile/equal-width) and report the median and inter-quartile range instead of a point estimate. Test whether the IQR of ensemble-ECE is narrower than the M-sensitivity range the paper exhibits, on the same LoL-style synthetic setup (Beta families, 100k samples) — this keeps the absolute-value semantics that make ECE meaningful while answering the paper's legitimate complaint.

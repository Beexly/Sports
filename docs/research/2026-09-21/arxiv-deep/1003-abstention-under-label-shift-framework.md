# [1003] A General Framework for Abstention Under Label Shift (arXiv:1802.07024)

## Citation / full-text source

- arXiv:1802.07024 — full text: https://arxiv.org/pdf/1802.07024
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Amr M. Alexandari, Anshul Kundaje, Avanti Shrikumar (2018; v5 2020). *A General Framework for Abstention Under Label Shift*. arXiv:1802.07024v5. URL: https://arxiv.org/abs/1802.07024
**Full-text source read:** local cache `/tmp/arxiv750-cache/fulltext/1802.07024.txt` (arXiv conversion; single-line file, read in full via chunked extraction — abstract, §§1–6, Algorithms 1/C/D, Tables 1–4, Appendix A–C; figures referenced in text, not rendered).
**Ledger completed:** 2026-09-21. **Read:** full text.
## Verdict

**ADAPT** — the calibrated-probability-as-label-proxy abstention framework ports directly to GSE's no-bet filter: pick which games to skip to optimize a betting metric (not accuracy), with label-shift re-calibration as base rates move through the season.

## 1. Research question
Can a classifier abstain on a bounded fraction of examples to optimize an ARBITRARY metric of interest (sensitivity at fixed specificity, auROC, weighted Cohen's κ — not just accuracy), while staying robust to label shift (p(y) changes between train and test, p(x|y) fixed), using only a calibrated black-box classifier?

## 2. Dataset / schema
Four settings: (1) synthetic binary simulation, positive:negative = 1:9, 30% abstention (Fig. 1); (2) IMDB sentiment + Cat-vs-Dog image classification — train/validation at 1:1 pos:neg, test at 1:2 (simulated label shift), CNNs, metric = sensitivity @ 99% specificity; (3) biological: genomic regions active in Leukemia Stem Cells (LSC) and pre-leukemic HSCs (pHSCs), pos:neg ≈ 1:2, no label shift, metrics = sensitivity @ 80% specificity and auROC; (4) clinical: diabetic retinopathy detection (Leibig et al. 2017 CNN), weighted Cohen's κ, both with and without label shift. Significance: one-sided Wilcoxon signed-rank, p<0.05, over model seeds × validation/test resamples.

## 3. Method / model
Three-step framework: (1) calibrate + label-shift-adapt the model on held-out data (Platt scaling; Saerens et al. 2002 EM or MLLS/Alexandari et al. 2020 for shift) to get calibrated p(y|x) on the test set; (2) estimate the improvement in the target metric if a subset were abstained on, using calibrated probabilities as a categorical proxy for the unknown true labels (Monte-Carlo in general); (3) abstain on the subset with the largest estimated metric boost, subject to the budget. Efficient instantiations: Algorithm 1 — O(NM) Monte-Carlo optimizer for sensitivity at target specificity s (sorted probs, abstention interval [i,i+d), recompute decision thresholds t*, t←, t→ per candidate interval, M=100 MC samples, Savitzky–Golay smoothing order-1/window-11); auROC optimizer — O(N) deterministic, substitutes calibrated probabilities for labels (auROC = S/(n⁻n⁺), S=Σᵢ yᵢsᵢ⁻ via running sums); weighted-κ optimizer — O(NC) deterministic marginal-improvement-per-example, abstain on top-k marginal gains (C classes). Novel baseline introduced: abstain on examples with lowest Jensen–Shannon divergence between predicted probs and prior class probs (prediction ≈ prior ⟹ no information).

## 4. Equations & assumptions
- auROC = (1/(n⁻n⁺)) Σᵢ yᵢ sᵢ⁻, with sᵢ⁻ = Σ_{i′<i}(1−y_{i′}), n⁻/n⁺ class counts — used with calibrated p replacing y.
- Weighted Cohen's κ(S,f) = 1 − [Σ_{x∈S} W_{y(x),f(x)}] / [ΣᵢΣⱼ W_{i,j} (Nⁱ/N) Fʲ], Nⁱ true class counts, Fʲ predicted counts.
- Sensitivity-at-specificity optimizer: t* = min{i : 1 − nᵢ⁻/n₀⁻ ≥ s}; per-interval thresholds t←/t→; per-sample sensitivity oᵢ updated as (n⁺_{t′ᵢ} − 1{t′ᵢ≤i}w⁺ᵢ)/(n⁺₀ − w⁺ᵢ), averaged over M samples.
- Assumptions: calibrated p(y|x) are a usable proxy for true labels (needs held-out calibration set); label-shift assumption p(x|y) fixed; binary tasks use contiguous abstention intervals in sorted-probability order.

## 5. Features / target
Features: model inputs (text pixels, genomic features, retinal images) — method is model-agnostic, operating only on calibrated output probabilities p(y|x). Target: true class labels y (used only at evaluation); abstention decision per example.

## 6. Validation design
No train/test of a new predictor — the framework wraps existing classifiers. Baselines: distance-from-0.5 (max-class-prob), entropy (Wan 1990), Fumera et al. 2000 class-specific thresholds (brute-force on validation), test-time MC dropout variance (Gal & Ghahramani 2016, 100 samples), plus the new JS-divergence baseline — each run with and without Platt calibration (no-shift settings). Metrics: sensitivity @ fixed specificity (99% IMDB/CvD, 80% LSC), auROC, weighted κ. Wilcoxon signed-rank p<0.05 across seeds/resamples. Label-shift runs use Saerens-EM adaptation for all methods.

## 7. Numerical results / baselines
Table 1 (label shift, sens @ 99% spec, adapted): IMDB — ours (Est ΔMetric) base 0.3571±0.004 → 0.7067±0.0067 @30% abst. (unadapted 0.6227±0.0082); next best Fumera 0.6976±0.0079 (unadapted) — ours-adapted significantly best. Cat v Dog — ours 0.3318±0.0061 → 0.6135±0.0114 @30% (unadapted 0.5616±0.0102); baselines ≤0.53. Table 2 (LSC, no shift, sens @ 80% spec): ours 0.6507±0.0029 → 0.8001±0.0035 @30% abst.; JS-div 0.7907±0.0041; distance-0.5 0.7108±0.0027; MC dropout ≈0.68 (no better than base). auROC LSC: ours 0.8107±0.0014 → 0.8586±0.0015 @30%. Table 3 (DR, κ, no shift): ours 0.8104±0.0019 → 0.8918±0.0013 @30% abst.; entropy/max-prob ≈0.75–0.77 @30% (worse than base at high abstention — miscalibrated abstention can HURT). Table 4 (DR, κ, with shift): ours adapted 0.7837±0.0044 → 0.8604±0.0027 @30%; unadapted ours 0.7313±0.004 → 0.8275±0.0035. Calibration consistently helped every baseline; test-time dropout never won. Authors note adaptation can worsen Fumera's method (thresholds overfit to validation).

## 8. Code / data availability
Code: https://github.com/blindauth/abstention; experiment notebooks: https://github.com/blindauth/abstention_experiments. Datasets: IMDB (public), Cat v Dog (public), LSC/pHSC genomic (paper-specified), DR (Leibig et al. 2017).

## 9. Leakage
Abstention methods never saw test labels (stated). Risk: thresholds/quantities estimated on validation under shift — addressed via EM adaptation. Wilcoxon across seeds is honest about variance. Watch: the framework's quality upper-bounds on calibration quality — garbage calibration in, garbage abstention out.

## Limitations
- Requires a trustworthy held-out calibration set; under severe shift, calibration itself degrades (Garg et al. 2020 error decomposition cited).
- Binary algorithms assume contiguous abstention intervals in sorted-probability order — not proven optimal for all metrics.
- No cost-of-abstention asymmetry beyond the budget fraction k; betting has asymmetric costs (missed edge vs lost stake).
- Experiments are medical/vision/text — no decision-theoretic (utility) metric tested, which is what betting needs.

## 10. GSE overlap
Abstention lane phase-1 reads (0618 Deep Gamblers, 0692–0696 selective classification) are neural/train-time methods; this is a POST-HOC wrapper on calibrated probabilities — complementary, no duplication. Existing-research-map: GSE has the calibration stack (temperature scaling, CQR, LRD, ECE-by-slice) but no principled no-bet/abstain rule — gap #4 ("learning-to-abstain with coverage-risk curves") names exactly this. The map's calibration work makes step (1) immediately available. New capability: metric-targeted abstention (e.g., maximize hit-rate at a CLV floor) with season-phase label-shift adaptation.

## 11. GSE implementation spec
Build the **GSE no-bet filter**: (1) take engine's calibrated win/total probabilities per game (existing calibration stack); (2) each week, estimate the marginal improvement in the board metric (e.g., hit rate at ≥55% CLV, or expected profit under Kelly fractions) from skipping each game, using calibrated probs as label proxies — O(NC) marginal-gain algorithm à la §5.3 adapted to profit; (3) publish only the top (1−k) fraction, abstaining on k (e.g., k=20%) — the bounded-abstention knob becomes the weekly volume dial. (4) Label-shift adaptation: re-estimate weekly base rates (home win %, over %) via Saerens-EM on recent weeks before computing thresholds — handles early-season vs late-season regime change. Effort: 2–3 days Python, no new data.

## 12. Reproducible test
Dataset: GSE picks DB (3,411 picks, v5.2.7). Simulate board publication Weeks 1–8 2026: for each week, compute marginal profit-gain per game from calibrated probs, abstain on worst 20%, publish rest. Metric: realized profit and hit rate of published set vs publish-all baseline, same weeks, same stakes. Time-ordered (no future leakage): calibrate on prior weeks only.

## 13. Acceptance / rejection gate (numeric gate)
ADOPT if the abstention-filtered board beats publish-all by ≥3.0 pp hit rate OR ≥15% higher realized profit on the fixed 8-week window with Wilcoxon p<0.05 across weekly blocks; otherwise REJECT. The single decisive number: **profit lift ≥ +15% at fixed volume, or hit-rate delta ≥ +3.0 pp, p<0.05**.

## 14. Improvement experiment
Replace the fixed budget k with a cost-based rule: abstain on game i iff E[marginal profit gain of skipping i] > c, where c is the opportunity cost of a no-bet (estimated from the marginal published game's expected value) — converting bounded abstention to cost-based abstention per §3's equivalence, letting volume float with edge availability instead of fixing k=20%. Compare cost-based vs bounded on the same 8-week window; expect cost-based to win in high-edge weeks and publish fewer games in dead weeks.

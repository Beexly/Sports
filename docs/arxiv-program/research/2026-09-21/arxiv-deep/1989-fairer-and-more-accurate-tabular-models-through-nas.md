# [1989] Fairer and More Accurate Tabular Models Through NAS (arXiv:2310.12145)

**Citation:** Richeek Das, Samuel Dooley (2023). *Fairer and More Accurate Tabular Models Through NAS*. arXiv:2310.12145. URL: https://arxiv.org/abs/2310.12145
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, converted to text).
**Lane:** nas_automl.
**Verdict:** ADAPT — the only true tabular-NAS paper in the pool: joint multi-objective NAS+HPO over MLP/ResNet/FT-Transformer spaces. GSE swaps the paper's fairness objective for calibration, yielding accuracy-vs-calibration Pareto search over tabular architectures.

## 1. Research question
Can multi-objective NAS+HPO over tabular architectures find models that are simultaneously accurate AND fair, where accuracy-only NAS fails on the second objective? And do certain architecture subspaces inherently dominate on both?

## 2. Dataset / schema
Diverse tabular datasets with protected attributes (loan approval, medical, housing-type tasks per intro; exact dataset list not extracted from converted text). Fairness metrics: disparate impact, statistical parity difference, average odds difference, equal opportunity difference. Balanced accuracy as the accuracy metric.

## 3. Method / model
- **Search spaces** (built on the rtdl package): MLP (875 architectural combos: layers × widths), ResNet (350 combos), FT-Transformer (324 combos: attention blocks × heads × hidden dims) + continuous training HPs (learning rate, weight decay, batch size, dropout).
- **Two multi-objective strategies:** weighted mean-aggregation (scalarization) and ParEGO (multi-objective extension of efficient global optimization) jointly optimizing balanced accuracy + one fairness metric.
- **Baselines:** SOTA bias-mitigation methods (Reweighing, Disparate Impact Remover, Learning Fair Representations + LR) and naive off-the-shelf models (LR, MLP, ResNet, FT-Transformer with defaults).

## 4. Equations & assumptions
No equations stated in extracted text. Assumptions: architecture/HP choices materially affect the secondary objective (not just accuracy); the accuracy–fairness Pareto front is discoverable by black-box multi-objective optimization; rtdl implementations are faithful.

## 5. Features / target
Inputs: tabular features (dataset-dependent) + protected attributes for metric computation. Targets: binary labels; metrics = balanced accuracy + fairness gaps.

## 6. Validation design
Multi-objective optimization runs per model class per fairness metric; Pareto-front comparison vs bias-mitigation baselines and vs single-objective (accuracy-only) NAS runs. Claim: joint-optimization runs Pareto-dominate both SOTA mitigation methods and accuracy-only NAS results.

## 7. Numerical results / baselines
Quantitative tables not extracted from converted text (figures/tables rendered poorly). Reported claims: (1) "significant variation and tradeoffs in the accuracy and fairness of the model predictions with changes in hyperparameters — certain subspaces of the search landscape are inherently fairer, more accurate, or both"; (2) joint NAS+HPO "consistently Pareto dominate[s] state-of-the-art bias mitigation methods either in fairness, accuracy or both"; (3) "models optimized solely for accuracy with NAS often fail to inherently address fairness concerns." Treat numeric magnitudes as unverified from this read.

## 8. Code / data availability
Search spaces built on the rtdl package (public). Method code link not extracted ("not stated in paper" as extracted — verify).

## 9. Leakage & limitations
- Adversarial notes: (1) Fairness is not a GSE objective — the paper's value is the multi-objective tabular-NAS machinery, which must be re-targeted. (2) No numeric tables extractable from this read; the Pareto-dominance claim is qualitative here. (3) Accuracy-only NAS failing on the secondary objective is a warning that transfers: GSE's log-loss-only HPO likely leaves calibration on the table. (4) Small discrete architecture spaces (875/350/324 combos) — the "NAS" is closer to structured HPO than to open-ended architecture search.

## 10. GSE overlap
New: no multi-objective search exists in the corpus; GSE's HPO is single-objective (log-loss). Connects to the calibration lane (CQR, isotonic, temperature scaling are all POST-HOC fixes — exactly the "debiasing as post-processing" paradigm this paper argues against). This paper's thesis maps directly: instead of post-hoc calibration fixes, search architectures that are inherently well-calibrated.

## 11. GSE implementation spec
- **Multi-objective NAS+HPO:** search space = MLP/ResNet/FT-Transformer architectures (rtdl-style) + training HPs, objectives = (a) log-loss on OOF, (b) ECE (expected calibration error) on OOF. Optimizer: ParEGO or NSGA-II over the two objectives.
- **Use case:** the win-probability tabular model — where calibration directly prices Kelly stakes, so the accuracy–calibration Pareto front is the business-relevant tradeoff.
- **Selection rule:** from the Pareto front, pick the knee point; compare against the current log-loss-only champion + post-hoc isotonic.
- **Effort:** ~1-2 weeks (search space plumbing + ParEGO/NSGA-II + Pareto analysis). GPU-light (tabular nets are small).

## 12. Reproducible test
Dataset: nflverse game-level tabular, win-probability target (binary home win), 2015–2025; rolling-origin OOF. Search: 200 configs across the three architecture families. Metrics: log-loss + ECE on 2023–2025 holdout. Baselines: (a) single-objective (log-loss) best config + isotonic, (b) default FT-Transformer.

## 13. Acceptance / rejection gate
**ADOPT if:** the Pareto knee config beats the log-loss-champion+isotonic baseline on BOTH log-loss (≥0.001) and ECE (≥10% relative) on the 2023–2025 holdout — i.e., joint search finds something post-hoc calibration cannot. **REJECT if:** the Pareto front shows no config dominating the single-objective champion on both axes (trade-off is real and the champion is already on the front), or search cost exceeds 100 GPU-hours for <0.001 log-loss gain.

## 14. Improvement experiment
Add a THIRD objective: inference latency (or equivalently ensemble size), making it accuracy–calibration–latency 3D Pareto search. Hypothesis for GSE: the Sunday-morning batch window constrains model complexity; the 3D front reveals whether the best-calibrated models are also the slowest. Test whether a latency-constrained Pareto pick (≤100ms/game inference) sacrifices >0.002 log-loss vs unconstrained.

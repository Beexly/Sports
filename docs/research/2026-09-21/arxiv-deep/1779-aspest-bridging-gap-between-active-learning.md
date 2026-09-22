# [1779] ASPEST: Bridging the Gap Between Active Learning and Selective Prediction (arXiv:2304.03870)

**Citation:** (authors as listed on arXiv) *ASPEST: Bridging the Gap Between Active Learning and Selective Prediction*. arXiv:2304.03870. Code: https://github.com/google-research/google-research/tree/master/active_selective_prediction. URL: https://arxiv.org/abs/2304.03870
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML — abstract, active selective prediction under domain shift, ASPEST components: checkpoint ensembles, low-margin active acquisition, target fine-tuning, pseudo-label self-training, experiments on MNIST→SVHN/CIFAR-10→CINIC-10/FMoW/Amazon Review/DomainNet/Otto with AUACC, conclusion).
**Verdict:** ADAPT — the "spend a small label budget where the shifted model is most uncertain, then self-train" loop is the right protocol for GSE's weekly regime-shift problem (new season phases, roster shocks), and the 79.36%→88.84% AUACC jump shows the headroom is real; needs adaptation from vision/NLP benchmarks to weekly sports data.

## 1. Research question
Under *domain shift* (model trained on source, deployed on a shifted target), selective prediction degrades — can a small *active-learning label budget* on the target domain, combined with self-training, restore both accuracy and selection quality, and what combination of ingredients (ensembles, acquisition, fine-tuning, pseudo-labels) actually works?

## 2. Dataset / schema
MNIST→SVHN, CIFAR-10→CINIC-10, FMoW (satellite, temporal shift), Amazon Review, DomainNet, Otto. Metric: AUACC (area under the accuracy–coverage curve). Label budgets in the low hundreds (headline: budget 100).

## 3. Method / model
ASPEST: (1) **checkpoint ensemble** — ensemble the source model's training checkpoints for better-calibrated uncertainty on the target; (2) **active acquisition** — spend the label budget on the lowest-margin (most uncertain) target examples and get them labeled; (3) **target fine-tuning** — fine-tune on the acquired labels; (4) **pseudo-label self-training** — self-train on high-confidence target pseudo-labels. The loop is: uncertainty → label a few → adapt → re-estimate uncertainty → select.

## 4. Equations & assumptions
- Metric: AUACC = area under the accuracy–coverage curve (selective-prediction quality across all coverages).
- Acquisition: lowest-margin (smallest top-two probability gap) target examples get the label budget.
- Assumptions: a small number of target labels can be obtained on demand (human in the loop); the shift is such that fine-tuning on a few target labels + pseudo-labels helps (no extreme shift where source features are useless); checkpoint ensembling approximates Bayesian uncertainty.

## 5. Features / target
Vision/NLP features per benchmark; targets are class labels. The GSE analog: game features → pick outcome; the "label budget" is analyst review time on the week's most uncertain games.

## 6. Validation design
Source→target transfer pairs with a fixed small label budget; AUACC vs baselines (plain selective prediction without adaptation, vanilla active learning without the selective-prediction framing). The headline comparison isolates the full ASPEST stack's gain.

## 7. Numerical results / baselines
- MNIST→SVHN, label budget 100: AUACC improves from 79.36% (baseline) to 88.84% (ASPEST) — a +9.48 point gain from 100 labels.
- Consistent gains reported across CIFAR-10→CINIC-10, FMoW, Amazon Review, DomainNet, Otto (paper's tables; headline numbers as quoted in abstract).
- Claim: the combination (ensemble + active acquisition + fine-tuning + self-training) beats any subset — "more optimal utilization of humans in the loop."

## 8. Code / data availability
Code: https://github.com/google-research/google-research/tree/master/active_selective_prediction. Datasets are public benchmarks.

## 9. Leakage & limitations
- The "label budget" in sports is *time*, not money: games resolve on their own schedule — you can't buy next week's labels early. The active loop only works retrospectively (label = deep film/charting review of already-played games), which weakens the analogy.
- Pseudo-label self-training on sports outcomes risks feedback loops (training on your own past picks' outcomes is fine; training on your own *pseudo-labels* for unplayed games is not — the paper's pseudo-labels are for already-observed target inputs).
- Benchmark shifts (MNIST→SVHN) are far more extreme than week-to-week NFL drift; the +9.48 gain may not transfer to mild shift.
- No cost model for *wrong* acquired labels (analyst error); assumes the human label is gold.

## 10. GSE overlap
New protocol, no duplicate: GSE retrains periodically but has no *uncertainty-driven* refresh protocol — nothing in the corpus says *which* past games deserve deep review when the regime shifts. The existing-research map's active-learning gap ("no papers read" for selection-under-budget) is exactly this. Complements ledger 1778 (checkpoint ensembles appear in both — shared infrastructure).

## 11. GSE implementation spec
Build the **weekly ASPEST loop**: (a) maintain a checkpoint ensemble of the pick model (shared with ledger 1778's snapshots); (b) each week, rank the slate by ensemble margin (uncertainty); (c) spend the "label budget" — Garrett/analyst deep-review time, e.g., 5 games/week — on the most uncertain games *after they resolve*, producing gold-standard graded features/notes; (d) fine-tune the model on the reviewed games + self-train on high-confidence pseudo-labels from resolved games; (e) re-estimate uncertainty and set the week's gate. Effort: ~2 weeks (review tooling + fine-tune pipeline + AUACC tracking).

## 12. Reproducible test
Dataset: GSE seasons with simulated regime shifts (e.g., train pre-2023, deploy 2023–2025; or pre/post mid-season injury waves). Baseline: static model + fixed gate. Candidate: ASPEST loop with a 5-game/week review budget. Metric: AUACC on the deployment period + realized units; ablate each component (ensemble, acquisition, fine-tune, pseudo-labels).

## 13. Acceptance / rejection gate
ADAPT accepted if the ASPEST loop beats the static baseline by ≥ 3 AUACC points on shifted deployment windows AND the analyst-review hours stay within the 5-game budget; else REJECT (keep periodic retraining, drop the active machinery).

## 14. Improvement experiment
Make the acquisition *market-aware*: prioritize for review the games where ensemble uncertainty is high AND the market line disagrees with the model — the paper acquires purely on model margin, but in sports the market is a free second labeler. Test market-aware acquisition vs margin-only acquisition on AUACC per review-hour; if the market is informative, the same budget buys more.

**Verdict:** ADAPT — the active selective-prediction loop is the right shape for GSE's regime-shift weeks and the checkpoint-ensemble ingredient is shared infrastructure with ledger 1778, but the "label budget" must be redefined as retrospective analyst review since sports labels arrive on a fixed schedule.

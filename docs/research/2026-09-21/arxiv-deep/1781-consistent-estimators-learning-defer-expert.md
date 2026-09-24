# [1781] Consistent Estimators for Learning to Defer to an Expert (arXiv:2006.01862)

**Citation:** (authors as listed on arXiv) *Consistent Estimators for Learning to Defer to an Expert*. arXiv:2006.01862. URL: https://arxiv.org/abs/2006.01862
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML — abstract, joint classifier/rejector with instance-dependent expert error, system loss with defer cost, cost-sensitive generalized cross-entropy surrogate (convex, Bayes-consistent), CIFAR-10 experiments with WideResNet (90.47% baseline) and synthetic experts, hate-speech dataset experiments (24,783 tweets, 60/10/30 splits × 5), AAE-biased expert results, conclusion).
**Verdict:** ADAPT — the consistent deferral surrogate plus the "expert may be wrong, and wrong in an instance-dependent way" framing is the right formalism for routing each pick among GSE's model, the market consensus, and Garrett's own judgment; needs adaptation from classification accuracy to unit P&L and from synthetic experts to real ones.

## 1. Research question
When a classifier can *defer* to an external expert whose error rate may depend on the instance (the expert is better on some inputs, worse on others), how do you jointly learn the classifier and the deferral rule with a *consistent* (Bayes-optimal in the limit) surrogate — rather than heuristics — and does it actually route better than confidence thresholding?

## 2. Dataset / schema
- CIFAR-10: 50k train / 10k test; reduced WideResNet baseline accuracy 90.47%. Synthetic experts: perfect on the first k classes, random elsewhere (k varied).
- Hate-speech dataset: 24,783 tweets; 60/10/30 train/val/test splits, five random splits. Expert with AAE (African-American English) dialect bias — the expert is systematically worse on a subpopulation.

## 3. Method / model
Joint classifier + rejector trained with a novel cost-sensitive *generalized cross-entropy* surrogate: the system loss combines the model's prediction cost and the expert/defer cost in one objective. The surrogate is convex and proved Bayes-consistent for the deferral problem — minimizing it recovers the optimal route-each-instance-to-model-or-expert policy. The rejector explicitly models P(expert correct | x), so deferral goes to the expert exactly where the expert beats the model.

## 4. Equations & assumptions
- System loss: (1 − r(x))·ℓ(h(x), y) + r(x)·ℓ_exp(m, y) — model loss when not deferred, expert loss when deferred (same decomposition as the L2D literature).
- Surrogate: cost-sensitive generalized cross-entropy — convex in the parameters, Bayes-consistent (minimizer = Bayes-optimal classifier-rejector pair).
- Assumptions: expert demonstrations (x, y, m) available at training time (features, true label, expert's prediction); the expert's error pattern is learnable from (x, m, y) triples; deferral cost is captured by ℓ_exp.

## 5. Features / target
Image/text features → class label; expert's prediction m as an additional training signal. The learned object is the routing policy r(x): model or expert.

## 6. Validation design
CIFAR-10 with synthetic experts of varying competence (sweep k = number of classes the expert gets right); hate-speech with a realistically biased expert (AAE bias). Metric: overall *system* accuracy (model-on-routed + expert-on-deferred), five random splits on hate speech.

## 7. Numerical results / baselines
- CIFAR-10: system accuracy beats confidence-threshold routing across expert-competence levels; the consistent surrogate routes to the expert exactly on the expert's competent classes.
- Hate speech, AAE-biased expert: proposed method system accuracy 92.91 ± 0.17 vs confidence-threshold baseline 92.42 ± 0.40 vs oracle routing 93.22 ± 0.11 — the method captures most of the oracle's routing gain and, crucially, learns *not* to defer the dialect subpopulation the expert is biased against.

## 8. Code / data availability
None stated in the extracted text.

## 9. Leakage & limitations
- Synthetic experts (CIFAR-10) are unrealistically clean — perfect-on-k-classes; real experts (Garrett, market consensus) have correlated, structured errors.
- System accuracy is 0/1; sports routing should optimize units, and the expert's "prediction" (Garrett's lean, the market line) isn't a class label but a price.
- Requires (x, y, m) triples at scale: GSE would need a logged history of Garrett's own leans vs outcomes to train the router — that dataset may not exist yet.
- The convexity is in the surrogate's parameters for the paper's architecture; no guarantee it survives the translation to GSE's model class.

## 10. GSE overlap
New formalism, no duplicate: GSE has model-vs-market comparisons but no *learned routing policy* between decision sources. The existing-research map has no learning-to-defer work. Natural GSE experts: (a) Garrett's own graded leans, (b) market consensus (closing line), (c) ensemble sub-models. Connects to ledger 1782 (the original deferral framing) — this paper is the consistent-estimator upgrade.

## 11. GSE implementation spec
Build the **GSE router**: (a) log triples (game features x, graded outcome y, Garrett's lean / market-implied pick m) for 1–2 seasons — this dataset is the prerequisite; (b) train the classifier-rejector with the cost-sensitive generalized cross-entropy surrogate, with ℓ in *units* (not 0/1): defer to Garrett/market where the router estimates the expert beats the model; (c) deploy as a pre-card routing step: each slate game gets model-pick, expert-pick, and a route decision; post the routed pick. Effort: ~3 weeks (dataset logging is the long pole; the surrogate training is standard).

## 12. Reproducible test
Dataset: logged (x, y, m) triples, walk-forward seasons. Baseline: always-model, always-expert, confidence-threshold routing. Candidate: consistent-surrogate router. Metric: system units (model-routed + expert-routed), plus the bias check from the paper: verify the router doesn't systematically route *away* from the expert on any subpopulation where the expert is actually good (the AAE-bias lesson).

## 13. Acceptance / rejection gate
ADAPT accepted if the router's system units beat both always-model and confidence-threshold routing on walk-forward seasons AND the per-subpopulation audit shows no biased under-deferral; else REJECT (routing stays heuristic until the triple dataset is bigger).

## 14. Improvement experiment
Add a *third* route — abstain entirely (no bet) — making it model/expert/abstain: extend the surrogate with the abstention cost d from ledger 1780's 0-d-1 framing. Test whether the three-way router beats the two-way router on risk-adjusted units; the paper's formalism covers two routes, and sports genuinely has three options (bet model, bet expert, don't bet).

**Verdict:** ADAPT — consistent deferral estimation is the correct math for routing picks between GSE's model, the market, and Garrett, and the biased-expert experiment is a cautionary template worth copying, but it needs the (x, y, m) triple dataset built first and the loss translated to units.

# [1782] Predict Responsibly: Improving Fairness and Accuracy by Learning to Defer (arXiv:1711.06664)

**Citation:** (authors as listed on arXiv) *Predict Responsibly: Improving Fairness and Accuracy by Learning to Defer*. arXiv:1711.06664. URL: https://arxiv.org/abs/1711.06664
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML — abstract, adaptive learning-to-defer framework, joint model + downstream decision-maker system, semi-synthetic COMPAS and Heritage Health experiments with high-accuracy / highly-biased / inconsistent decision makers, Pareto-front results (each point median of five runs), 30%-flip finding in the inconsistent setting, conclusion).
**Verdict:** ADAPT — the founding "defer based on *both* model and downstream decision-maker competence" framing is conceptually load-bearing for GSE (the posted pick is a *system* of model + Garrett + market, not a model alone), and the inconsistent-expert experiment is a warning about deferring to noisy humans; needs numeric validation on sports data before it becomes more than a framing.

## 1. Research question
When a model's predictions feed a downstream human decision-maker who has their own (possibly biased, possibly inconsistent) competence profile, should the model defer based only on its own uncertainty — or adaptively, based on *both* its uncertainty and the decision-maker's strengths — and can joint training of the two improve the *system's* fairness and accuracy beyond what either achieves alone?

## 2. Dataset / schema
Semi-synthetic: COMPAS (recidivism) and Heritage Health (health risk) with simulated downstream decision makers in three regimes: high-accuracy, highly-biased, and inconsistent (noisy). Results reported as Pareto fronts (accuracy vs fairness trade-off), each plotted point the median of five runs.

## 3. Method / model
Adaptive learning-to-defer: the model learns a deferral policy π(x) that routes each input to itself or to the downstream decision maker, trained *jointly* with the predictor so the model specializes in the inputs it keeps and the deferral policy learns the decision maker's competence map — including *where the human is biased* (defer less there) and *where the human is strong* (defer more there). The key move vs plain rejection: the gate models the *other agent*, not just the input.

## 4. Equations & assumptions
- System objective: minimize the *joint* system loss over (predictor, deferral policy, fixed downstream decision maker) — the paper's formalism optimizes the pipeline's output, not the model's standalone accuracy.
- Fairness is measured on the system's decisions (the paper's Pareto fronts trade system accuracy against a fairness criterion).
- Assumptions: the downstream decision maker's behavior is stable enough to learn (a competence map exists); training has access to the decision maker's past decisions; the deferral policy can observe the same features.

## 5. Features / target
COMPAS / Heritage Health features → risk labels; downstream decision-maker's historical decisions as the second target. GSE analog: game features → outcome; Garrett's historical leans/decisions as the decision-maker trace.

## 6. Validation design
Three decision-maker regimes × two datasets; Pareto fronts of system accuracy vs fairness; medians of five runs per point. The inconsistent-DM regime is the stress test: the human flips 30% of the selected subgroup's predictions.

## 7. Numerical results / baselines
- Results are Pareto-front plots (no single headline table): the adaptive deferral system dominates fixed-deferral and no-deferral baselines on the accuracy–fairness frontier across regimes.
- Inconsistent decision-maker setting: 30% of the selected subgroup's predictions are flipped by the human — yet the joint system still improves over the model alone by learning *where* the human adds noise vs signal.
- Highly-biased setting: the system learns to defer *less* to the biased human on the affected subgroup — the fairness gain comes from routing, not from changing the human.
- Each plotted point is the median of five runs (variability accounted for, exact front coordinates not tabulated).

## 8. Code / data availability
None stated in the extracted text.

## 9. Leakage & limitations
- Semi-synthetic decision makers: the "human" is a simulation with known bias/noise structure — real humans (Garrett) are harder to model and non-stationary.
- No exact numbers tabulated (Pareto plots only); effect sizes can't be quoted precisely.
- Fairness criteria are defined for the recidivism/health domains; the sports analog of "fairness" is unclear (per-division? per-market-type calibration?).
- Joint training assumes the decision maker is *fixed*; if Garrett learns from the system, the competence map drifts — the paper doesn't handle co-adaptation.

## 10. GSE overlap
Framing-level contribution, no duplicate: nothing in the corpus models the *downstream decider* (Garrett posting the card, followers tailing it). Ledger 1781 gives the consistent estimator; this paper gives the original *why*: the unit of optimization is the model+human system. The existing-research map has no human-in-the-loop routing work.

## 11. GSE implementation spec
Treat as a design principle for the GSE router (ledger 1781's build): (a) define GSE's "downstream decision maker" concretely — Garrett's final card edits; (b) log the triple (model pick, Garrett's edit, graded outcome) so the router can learn Garrett's competence map: which game types does he improve, which does he hurt; (c) the paper's biased-DM lesson becomes an audit: if Garrett systematically degrades certain spots (e.g., primetime favorites), the router should defer *less* there — route around the bias; (d) the inconsistent-DM lesson: measure Garrett's flip rate; if it's high-noise on some subgroup, the system should keep those picks itself. Effort: ~1 week of analysis on the logged triples (the logging itself is ledger 1781's prerequisite).

## 12. Reproducible test
Dataset: (model pick, Garrett edit, outcome) triples over 1+ seasons. Test: does a router trained on Garrett's competence map beat always-follow-Garrett and always-follow-model on system units? Report per-subgroup (game type) deferral rates and the audit of where Garrett helps vs hurts.

## 13. Acceptance / rejection gate
ADAPT accepted (as a framing + audit protocol) if the competence-map analysis finds *any* stable subgroup where Garrett's edits systematically help or hurt (|Δ units| significant over a season) — that alone justifies the router; if Garrett's edits are indistinguishable from noise everywhere, the deferral framing adds nothing and this stays conceptual (REJECT as a build, keep as a lens).

## 14. Improvement experiment
Close the loop the paper leaves open: *co-adaptation* — retrain the router quarterly as Garrett's own behavior changes in response to the system (he sees which of his edits the router overrides). Test whether a non-stationary competence map (exponentially-weighted recent triples) beats a static one; the paper assumes a fixed human, but Garrett is a learning agent, and the router should be too.

**Verdict:** ADAPT — the model-the-whole-system (not just the model) framing is the right foundation for GSE's human-in-the-loop card, and the biased/inconsistent-expert experiments map directly onto auditing Garrett's own edits, but it must be validated numerically on real (model, Garrett, outcome) triples before it drives any routing decision.

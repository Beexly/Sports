# [1836] RSRM: Reinforcement Symbolic Regression Machine (arXiv:2305.14656)

**Citation:** Yilong Xu, Yang Liu, Hao Sun (2023). *RSRM: Reinforcement Symbolic Regression Machine*. arXiv:2305.14656v1. URL: https://arxiv.org/abs/2305.14656
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

Three modules with a standout idea: Double Q-learning to model the reward distribution and prune MCTS's search space, plus modulated sub-tree discovery that invents new composite operators (A±f(x), A×f(x), A^f(x)) from data; 100% Nguyen recovery and real-data (falling balls) wins; needs adaptation since it's RL/MCTS machinery while GSE's stack is LLM+evolution — the portable parts are the reward-distribution pruning and the operator-invention block.

## 1. Research question
SR stalls when the discrete search space tends to infinity and formulas get intricate. Can a machine combining (1) MCTS over expression trees, (2) Double Q-learning that learns the reward distribution to prune MCTS's feasible space, and (3) a modulated sub-tree discovery block that invents new composite math operators, achieve SOTA from scarce data?

## 2. Dataset / schema
Nguyen (1–2 variables, 20–100 points), Nguyen-c (parametric), R (rational equations), Livermore (hard: high exponentials, trig) — recovery rate over 100 parallel runs; free-falling balls real dataset (baseball, blue basketball, bowling ball trajectories); generalization tests.

## 3. Method / model
- **MCTS agent**: explores expression trees over predefined operators/variables.
- **Double Q-learning block**: learns the distribution of rewards (not just max) to shrink MCTS's feasible search space — prunes branches whose reward distribution is unpromising.
- **Modulated sub-tree discovery**: heuristically learns NEW operators from recurring sub-tree patterns; three search forms where A is a fixed form and f(x) learnable: A±f(x) (e.g. e^x−x), A×f(x) (e.g. 1.57e^x), A^f(x) (e.g. (e^x)^2.5). Invented operators become first-class tree nodes, compressing representation.

## 4. Equations & assumptions
Double Q-learning update on reward distribution; operator invention: detect frequent sub-tree motif A∘f(x), promote to operator.
Assumptions: (1) reward distribution is learnable and stable enough to prune safely; (2) recurring sub-trees are meaningful operators, not overfit motifs; (3) MCTS + Q-pruning doesn't cut the true branch; (4) 20–100 points suffice with the right inductive bias.

## 5. Features / target
Benchmark equations; ball trajectories (t → height). GSE analog: (features → metric) with operator invention as "discovered transforms."

## 6. Validation design
Recovery-rate shootout vs SPL (MCTS+priors), NGGP (risk-seeking DSR+GP), gplearn, DSR on four benchmarks (100 runs each); ablation over modules (Models A–D); real-data falling-balls; generalization tests.

## 7. Numerical results / baselines
- Nguyen (Table S3, avg recovery % over 100 runs): RSRM **100%** on Nguyen-1 through Nguyen-10 (incl. sin(x1²)cos(x1)−1 where DSR got 72%, GP 12%; log(x1+1)+log(x1²+1) where DSR got 35%, GP 17%).
- Livermore ablation: full RSRM 100/100/55/100/100/100/100/100/100/100/100 on Livermore-1..11; ablated variants collapse on hard cases (e.g. Livermore-3: 55 vs 20/0/0; Livermore-7 sinh: 100 vs 10; Livermore-8 cosh: 100 vs 3) — each module load-bearing.
- Falling balls: RSRM finds compact physics-plausible forms (baseball: −4.43t²+0.36sin(t²+1.51)²+47.35) vs baselines' longer polynomials.
- Claimed SOTA across the benchmark sets.

## 8. Code / data availability
Model settings in Appendix A; no public repo URL extracted.

## 9. Leakage & limitations
- Nguyen/Livermore are saturated, low-dimensional benchmarks; 100% recovery is less impressive than it looks (SPL/NGGP also near-ceiling on easy items).
- Operator invention risks overfitting motifs of the benchmark family (e^x-heavy forms) — invented operators may not transfer to sports data.
- Double Q-learning pruning could silently cut true branches; no false-prune analysis.
- No comparison with PySR or LLM-based methods (2023 paper, pre-LLM-SR).
- Falling-balls equations still contain suspicious terms (sin(t²+1.51)²) — compact but not obviously physical.

## 10. GSE overlap
Two portable modules: (1) reward-distribution-guided pruning → apply to GSE-SR's island model: learn which program families' score distributions are hopeless and stop allocating LLM calls to them (compute saver); (2) sub-tree motif → operator invention: mine GSE-SR's hall-of-fame for recurring sub-expressions (e.g. log(1+x), x/(x+c)) and promote them to first-class operators for the next discovery round — a concrete mechanism for the "vocabulary growth" idea. New capability; no existing GSE operator invention.

## 11. GSE implementation spec
- Mine top-100 GSE-SR programs for frequent sub-trees (min support 10%); promote top-3 to named operators (e.g. softplus-like, saturating-ratio); rerun discovery with extended operator set; test whether new metrics get simpler/shorter.
- Add bandit-style allocation across islands using each island's score distribution (kill islands whose upper quantile trails).
- Data: nflverse team-season. Effort: ~2–3 days.

## 12. Reproducible test
Dataset: nflverse team-season 2009–2023 (target points/drive). Baselines: GSE-SR with fixed operator set vs with invented operators from a first-round mining pass. Metrics: OOD (2024–2025) NMSE, median expression length, distinct-skeleton diversity.

## 13. Acceptance / rejection gate
ADOPT operator invention if the extended-operator run reaches equal-or-better OOD NMSE with ≥20% shorter median expressions (compression without accuracy loss); REJECT if invented operators are used in <5% of final programs (the mining finds nothing real) or diversity collapses.

## 14. Improvement experiment
"Analyst-named operators": present the top mined motifs to Garrett with proposed names ("the dome factor," "garbage-time decay") and let him bless/rename them before they enter the operator set. This closes the loop between machine-discovered structure and human football ontology — and the named operators become publishable GSE intellectual property, the kind of artifact competitors can't copy because they don't have the discovery pipeline that produced it.

---
Lane: symreg_equation_discovery · Block 1822–1841

# [1927] Statistics and Samples in Distributional Reinforcement Learning (arXiv:1902.08102)

**Citation:** Mark Rowland, Robert Dadashi, Saurabh Kumar, Rémi Munos, Marc G. Bellemare, Will Dabney (2019). *Statistics and Samples in Distributional Reinforcement Learning*. arXiv:1902.08102. URL: https://arxiv.org/abs/1902.08102
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

## 1. Research question
Why do distributional RL algorithms (C51, QR-DQN) work, and what exactly are they learning? The paper proposes a unifying framework: every DRL algorithm = a statistical estimator (a set of statistics of the return distribution) + an imputation strategy (a rule generating a return distribution consistent with those statistics). It then asks which sets of statistics are "Bellman closed" (learnable exactly through Bellman updates), proves a characterization, and builds a new expectile-based algorithm (EDRL/ER-DQN) from the framework.

## 2. Dataset / schema
(a) Tabular N-Chain (length 15; actions forward/backward with 0.95/0.05 transition noise; rewards −1/+1 at ends; γ=0.99; ground truth from 1,000 Monte Carlo rollouts); (b) 5-state MDP with exponential terminal reward distributions (Figure 7) to test mean consistency; (c) ALE Atari-57 for ER-DQN (DQN-style architecture, 3 seeds, re-ran DQN and QR-DQN for comparison). ALE public.

## 3. Method / model
**Framework:** statistics s(μ)=E_{Z∼μ}[h(Z)] + imputation strategy Ψ mapping statistic estimates back to a distribution; DRL update = estimate statistics of the Bellman target, impute, repeat.
**EDRL (expectile DRL):** learn K expectiles of the return distribution with asymmetric-least-squares loss, using a sample-based imputation strategy (SciPy root-finding/optimization per update, Eq 7–8) to construct Bellman targets consistent with learned expectiles. **ER-DQN:** EDRL update + QR-DQN-style DQN architecture; experiments use 11 expectiles.

## 4. Equations & assumptions
- General statistic form: s(μ) = E_{Z∼μ}[h(Z)].
- Theorem 4.3 (Bellman-closedness characterization): the only finite sets of statistics of this form that are Bellman closed are those whose linear span equals the span of moment functionals {μ ↦ E_{Z∼μ}[Z^l] | l=0,…,L} for some L ≤ K. "Highlights how rare it is for statistics to be Bellman closed."
- Lemma 4.4: the statistic sets learned under (i) CDRL (C51) and (ii) QDRL (QR-DQN) are NOT Bellman closed — "the learnt values of statistics ... need not correspond exactly to the true underlying values for the MDP (even in tabular settings)."
- Definition 4.5 (ε-approximate Bellman closedness): formalizes average (not uniform) approximation error across a statistic collection — "in general it is not possible to simultaneously achieve low approximation error on all statistics in a non-Bellman closed set."
- Theorems 4.6/4.7: extend approximation analyses to CDRL and QDRL (quantitative guarantees on the intrinsic bias).
- Mean consistency (§4.3): EDRL's expectile imputation preserves the mean; C51 (support clipping) and QR-DQN (quantiles miss tails) do not.
- Assumptions: finite statistic sets; tabular contraction-style analysis; SciPy imputation assumed solvable per update.

## 5. Features / target
Tabular: chain states; 5-state MDP. Atari: frame stacks. Target: K expectiles of the return distribution (K∈{1,3,5,7,9} tabular; K=11 Atari), learned by asymmetric least squares with imputed Bellman targets. Horizon: discounted (γ=0.99 chain; 0.99 Atari).

## 6. Validation design
Theory + tabular illustration + Atari. Tabular: N-Chain expectile estimation error vs ground-truth Monte Carlo expectiles (α=0.05, 30,000 steps); 5-state MDP greedy-policy correctness under CDRL/QDRL/EDRL. Atari-57: ER-DQN(11 expectiles) vs DQN vs QR-DQN(200 quantiles) vs naive ER-DQN(201 expectiles, no imputation), mean/median human-normalized, 3 seeds, all re-run.

## 7. Numerical results / baselines
- N-Chain (Figure 4/5): EDRL with sample imputation "accurately represent[s] the true return distribution, even after many Bellman updates through the chain, and does not exhibit the collapse observed with the naive approach"; expectile estimation error "vastly reduced" with imputation (also shown for a Huber-quantile variant, Figure 6).
- 5-state MDP (Figure 7): "Due to a lack of mean consistency both CDRL and QDRL learn a sub-optimal greedy policy" (CDRL: true support outside [0,2] bins; QDRL: quantiles miss tails). "In contrast, EDRL correctly learns the means of both return distributions, and so is able to act optimally."
- Atari-57 (Figure 8, 3 seeds): "In terms of mean human normalised score, ER-DQN represents a substantial improvement over both QR-DQN and the naive version of ER-DQN that does not use an imputation strategy" — with only 11 expectiles vs QR-DQN's 200 quantiles. (Exact mean/median numbers are in the figure, not quoted numerically in text; direction and margin described as "substantial.")

## 8. Code / data availability
None stated in the paper. ALE public; SciPy optimizer used for imputation.

## 9. Leakage & limitations
- Expectile imputation requires a per-update numerical optimization (SciPy) — fine for research, a serving-latency concern for real-time use (mitigated: only 11 expectiles, "additional training overhead ... is low").
- Atari numbers are figure-only (no table of exact means/medians quoted in text I could extract).
- Theory is tabular; function-approximation interaction explicitly left open ("it will be interesting to see how this interacts with errors introduced by function approximation").
- Expectiles are less interpretable than quantiles (no direct "P(loss > x)" reading) — a reporting cost for GSE's public write-ups.

## 10. GSE overlap
Theoretical complement to ledgers 1922/1925/1926: those give algorithms; this gives the selection criterion. No repo overlap — nothing in the corpus discusses Bellman closedness, mean consistency of critics, or expectiles. Directly relevant to the offline staking critic: a mean-inconsistent critic misranks stakes (Figure 7 is exactly a two-action choice where C51/QR-DQN pick wrong).

## 11. GSE implementation spec
1. Add a mean-consistency diagnostic to the distributional critic pipeline (ledgers 1922–1926): on holdout weeks, compare the critic's implied mean weekly P&L per stake against the Monte Carlo realized mean; flag stake actions where |implied − realized| > 0.5u.
2. Implement ER-DQN-style expectile head (K=11 expectiles, asymmetric least squares + sample imputation) as a fourth critic candidate; imputation via a small root-solve per minibatch (offline training only — no serving cost).
3. Prefer the critic with the smallest mean-consistency error for the greedy stake policy; keep quantile heads for public-facing P(loss) reporting (interpretability).
4. Effort: ~1 week on top of the existing critic pipeline (mostly the imputation routine + diagnostic).

## 12. Reproducible test
Dataset: GSE logged picks 2021–2024 (train 2021–2023, test 2024). Compare four critics (C51, QR-DQN, IQN, ER-DQN-11): (a) mean-consistency error on 2024 holdout (implied mean vs realized mean weekly P&L per stake bucket); (b) greedy-policy ROI and max drawdown on 2024. The paper predicts ER-DQN wins (a) and that (a) predicts (b).

## 13. Acceptance / rejection gate
ADOPT the expectile head as the default critic iff on 2024 its mean-consistency error is the lowest of the four AND its greedy policy ROI is within 1pp of the best quantile head; if a quantile head dominates on both, REJECT expectiles but KEEP the mean-consistency diagnostic as a permanent gate for all future critic changes.

## 14. Improvement experiment
Learn a *hybrid* statistic set: K expectiles (for mean consistency) + J tail quantiles (for interpretable P(loss) reporting), with a joint imputation strategy. Tests whether the framework's generality buys both properties at once — mean-consistent decisions plus tail interpretability — and whether the joint set's approximate-Bellman-closedness error (Definition 4.5) predicts its policy quality.

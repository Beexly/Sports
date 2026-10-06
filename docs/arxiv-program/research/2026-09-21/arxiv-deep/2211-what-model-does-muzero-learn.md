# [2211] What Model Does MuZero Learn? (arXiv:2306.00840)

**Citation:** He, J., Moerland, T. M., de Vries, J. A. & Oliehoek, F. A. (2023). *What Model Does MuZero Learn?* arXiv:2306.00840. URL: https://arxiv.org/abs/2306.00840
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

## 1. Research question
MuZero learns a "value-equivalent" model (trained to predict rewards/values/policy, not states) and plans with it via MCTS — but why does it work, and does the model actually achieve value equivalence? The paper asks two empirical questions: (1) to what extent is MuZero's learned model value-equivalent (accurate value prediction for arbitrary policies)? (2) how useful is it for policy improvement through planning? (Abstract, §1)

## 2. Dataset / schema
No static dataset — trained agents in three deterministic fully-observable environments: Cart Pole (30 MuZero agents, 100K steps), deterministic Lunar Lander (30 agents, 1M steps), Atari Breakout (20 agents, 500K steps, EfficientZero setup). Analysis checkpoints saved across each agent's lifecycle; results aggregated as means ± standard errors.

## 3. Method / model
Not a new model — an audit protocol. (1) Define h-horizon action-sequence value v^{a_{t:t+h−1}}(s_t)=Σγ^k r_{t+k} (eq. 3) and the value prediction error |v^π_h(s_t) − v̂^π_h(s_t)| of the learned model vs ground truth (Def. 2, eq. 7), estimated by Monte Carlo over states sampled from the behavior policy's state distribution. (2) Policy evaluation: error vs horizon for the behavior policy π^MuZero and for unseen policies, correlated with action-sequence probability under the behavior policy (Fig. 4). (3) Policy improvement: MCTS planning with the learned model vs ground-truth model, under the learned policy prior vs a uniform ("free search") prior, with leaf values from model rollouts (not the value net), horizons {16, 128, 32}. (4) Mechanism check: value prediction error of MCTS simulated trajectories + TV/KL between policy prior and MCTS visit distribution (Fig. 6).

## 4. Equations & assumptions
- h-horizon action-sequence value (eq. 3); trajectory probability under π (eq. 6); value prediction error definition (eq. 7). See §3.2.
- Assumes deterministic, fully observable environments (MuZero's design setting); conclusions explicitly not generalized to methods with auxiliary losses (Gelada et al. 2019; van der Pol et al. 2020; EfficientZero).

## 5. Features / target
Inputs: states sampled from on-policy distribution; action sequences at varying behavior-policy probability. Target: value prediction error vs horizon; MCTS return vs simulation count. Baselines: ground-truth-model MCTS, policy prior alone, uniform-prior ("free search") MCTS.

## 6. Validation design
30/30/20 agents × seeds; error curves over training lifecycle; planning curves (return vs #simulations) for 4 combinations (learned/ground-truth model × policy/uniform prior). The ground-truth-model MCTS is the oracle baseline isolating model error from search error.

## 7. Numerical results / baselines
- Value equivalence fails: even on its own behavior policy, prediction error grows quickly with horizon (§5: "does not imply that we learn models that are actually value equivalent").
- Unseen policies: error grows as action sequences become less probable under the behavior policy (Fig. 4) — the model can't evaluate what it hasn't executed.
- Free search (uniform prior + learned model): fails completely in Lunar Lander and Breakout; in Cart Pole supports search weakly but far below ground-truth free search (Fig. 7).
- With policy prior: learned-model MCTS improves over the prior alone in Cart Pole/Lunar Lander (given enough simulations) but the improvement is small vs ground-truth model; in Breakout it never beats the prior alone.
- Mechanism (Fig. 6): policy prior lowers TV/KL vs MCTS visit distribution → visits actions the prior favors → smaller value prediction error. Quote: "apart from biasing the search, the policy prior may also serve to prevent the search from exploring directions where the learned model is less accurate."

## 8. Code / data availability
No code link stated; builds on public MuZero/EfficientZero setups and standard environments (Cart Pole, Lunar Lander, Atari Breakout).

## 9. Leakage & limitations
- Authors' own caveat: results specific to value-equivalence losses; reconstruction-based (Dreamer) or temporal-consistency (EfficientZero) losses may generalize better in low-data regimes — "richer supervision signal" hypothesis, untested here.
- Deterministic toy environments only; no stochastic, partial-observability, or multi-agent tests.
- For GSE: the paper studies single-agent control, not play-level football simulation — the transfer is the *planning-over-learned-model* discipline, not the algorithm.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md: no MuZero/model-audit papers in the corpus; wave-5a covered Dreamer-style world models but not the failure analysis of planning with learned models. This is the only paper in the run that tells us when planning over a learned simulator *breaks* — it directly constrains the MCTS-over-learned-engine proposals in ledgers 2205 (DIMA) and 2210 (Neural Game Engine). New, load-bearing content.

## 11. GSE implementation spec
Planning-bounds harness for the NFL play simulator: (1) Train the learned play simulator (any of ledgers 2204–2208, 2210). (2) Replicate the paper's audit: sample game states from the historical play-call distribution; measure the simulator's value (predicted EPA) error vs realized EPA as a function of (a) rollout horizon (1–8 s), and (b) play-call novelty — distance of the candidate play from the historical play-call distribution (route-concept embedding distance). (3) Enforce the paper's fix: MCTS over play calls uses a strong policy prior = the empirical league play-call distribution (down/distance/formation-conditioned), which pins search inside the simulator's accurate region; log TV divergence between prior and MCTS visit distribution as a health metric. (4) Gate any 4th-down/go-for-it or play-call optimizer on this audit. Effort: ~2–3 engineer-weeks on top of the simulator.

## 12. Reproducible test
Dataset: 2022–2024 NGS tracking + play-by-play. Metric: (a) simulator EPA-prediction error vs horizon — must show the paper's error-growth curve, establishing the trustworthy horizon; (b) error vs play-call novelty decile — error on top-novelty-decile plays must be quantified; (c) MCTS play-call optimizer with league-prior vs uniform-prior search: uniform-prior search must NOT be allowed to beat the prior-constrained version on backtest EPA (if it does, the simulator is hallucinating value in unseen regions — the paper's Fig. 7 failure mode). Baseline: the historical play-call policy itself.

## 13. Acceptance / rejection gate
ADOPT the prior-constrained planning design if: (a) simulator error grows monotonically with horizon AND with play novelty (replicating the paper's two failure modes in football), AND (b) league-prior-constrained MCTS backtests ≥ +0.05 EPA/play over the historical policy on 2024 held-out weeks, AND (c) uniform-prior MCTS does not beat it (no hallucinated value). Reject the planning use-case if the simulator's error on novel plays is flat (the audit has no teeth) or if prior-constrained search can't beat history — then the simulator is a counterfactual analysis tool only, not a play-call optimizer.

## 14. Improvement experiment
Go beyond the paper: test their untested hypothesis — compare value-equivalence-style training (reward/value/policy heads only) vs reconstruction-based training (Dreamer-style state reconstruction) vs hybrid on the *same* NFL simulator, using the novelty-decile error audit. Hypothesis: the hybrid generalizes best to novel play calls (their "richer supervision signal" conjecture), which would resolve the paper's open question and pick GSE's simulator training objective empirically. This turns their limitation into our experiment.

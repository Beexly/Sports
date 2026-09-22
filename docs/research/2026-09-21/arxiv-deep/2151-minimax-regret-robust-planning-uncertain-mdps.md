# [2151] Minimax Regret Optimisation for Robust Planning in Uncertain MDPs (arXiv:2012.04626)

**Citation:** Marc Rigter, Bruno Lacerda, Nick Hawes (2020). *Minimax Regret Optimisation for Robust Planning in Uncertain Markov Decision Processes*. arXiv:2012.04626. URL: https://arxiv.org/abs/2012.04626
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `uncertainty_decision_theory`.
**Verdict:** ADAPT

*GSE relevance:* minimax regret is the right robustness objective for GSE's public-pick problem: worst-case expected profit is so conservative it says "bet nothing," but worst-case *regret* (how far behind the best policy you could have been, in each plausible world) stays robust without degenerating. The paper's regret Bellman equation + option-based DP gives a computable procedure, and its medical-domain numbers (0.391 normalized max regret vs 0.557+ for baselines) show the gain is real.

## 1. Research question
UMDP parameters (costs, transitions) are estimated from limited data and can't be specified exactly. Worst-case expected value planning is provably over-conservative (independence assumption lets every parameter be worst-case simultaneously). Can we instead optimize *minimax regret* — worst-case suboptimality vs the optimal policy per MDP instantiation — via a Bellman-style recursion, exactly for independent uncertainties and tractably (via options) for coupled ones?

## 2. Dataset / schema
- Synthetic: disaster-rescue grid (8-connected, swamp/obstacle regions, 15 MDP samples per UMDP, 25 UMDPs per size).
- Real: (a) medical decision-making (Sharma et al. 2019): state = health {0..19} × day {0..6}, 3 treatments, 250 UMDPs × 15 samples; (b) underwater glider, Norwegian Sea: real Copernicus ocean-current forecasts May 1 2020, 12 hourly samples, 500m grid cells, 12 headings, shallow+strong-current penalty.
- Generalization test: 100 fresh samples per UMDP (glider: interpolated forecasts + 2% Gaussian noise).

## 3. Method / model
- **Regret definition:** reg(s_0,π) = V(s_0,π) − V(s_0,π*) (1) per MDP instantiation.
- **Regret Bellman equation (Prop. 1):** recursion computing each action's exact contribution to regret by comparing against the *optimal value function in each sample* — the core innovation vs CEMR's myopic local-action comparison.
- **DP algorithm:** exact minimax-regret optimization for independent uncertainties (but see corrigendum below); for coupled/dependent uncertainties, plan over *options* (n-step temporally extended actions) to capture dependence along option execution — trades computation for quality via option length n; stochastic option policies available.
- **Baselines:** MILP (Ahmed et al. 2013, optimal deterministic stationary, poor scaling), CEMR n=1 (SOTA, myopic), robust DP / worst-case value.

## 4. Equations & assumptions
- reg(s_0,π) = V(s_0,π) − V(s_0,π*) (1); V(s,π) standard SSP Bellman with expected costs C̄(s,a).
- Regret Bellman recursion (Prop. 1); minimax-regret objective min_π max_{ξ∈samples} reg_ξ(π).
- Assumptions: SSP MDP (proper policies exist, improper → infinite cost); sample-based UMDP (finite set of MDP instantiations); independent uncertainties for exactness; options framework for coupled case.

## 5. Features / target
Grid position / patient health × day / glider cell; target: policy minimizing maximum regret over the sample set.

## 6. Validation design
Normalized max regret per UMDP (divide by worst method's), averaged over 25/250 runs; solution-time comparison; generalization on 100 held-out samples; p-values in supplement (most differences significant).

## 7. Numerical results / baselines
- **Medical (250 UMDPs, normalized max regret, lower better):** their method 0.391±0.03 vs next best 0.557±0.20; CEMR-style baselines 0.84–0.91; MILP timed out (>600s) on medical. Generalization: 0.574±0.12 vs 0.625–0.87.
- **Rescue/glider:** their method best or tied-best across sizes; performance improves with option length n, beating MILP at larger n (limited-memory non-stationary option policies are the key); deterministic options with larger n preferred over stochastic (scalability).
- **CEMR (prior SOTA):** consistently poor — myopic regret approximation fails; improves only when retrofitted with the paper's options.
- **Speed:** their method 3.75–4.64s typical vs MILP 66.9–103s (where MILP finished at all).

## 8. Code / data availability
Glider forecast source cited (marine.copernicus.eu); no code link extracted.

## 9. Leakage & limitations
- **Corrigendum:** the authors retracted the "exact for independent uncertainties" claim post-publication — the exactness guarantee is void; treat the DP as a strong heuristic with empirical support, not an exact solver.
- Sample-based: quality depends on the sample set covering the true uncertainty; generalization test is reassuring but not a guarantee.
- SSP framing needs a goal/termination concept; mapping a betting season to SSP is a modeling stretch (season end = goal with zero terminal cost is defensible but artificial).
- Options add hyperparameters (n, stochastic vs deterministic); compute grows with n.
- No learning — pure offline planning given the UMDP; the uncertainty set itself must come from somewhere (pairs with 2150's RoBAS nicely).

## 10. GSE overlap
Existing-research map: 2150 gives the robust *ambiguity set*; this paper gives the *objective* to optimize over it. Worst-case-profit (maximin) over an ambiguity set says "post nothing" — the paper's core critique, and exactly GSE's fear. Minimax regret instead asks: "in each plausible world (market regime / model calibration), how much worse than the best policy for *that* world are we?" — minimizing the worst such gap. This matches GSE's reputational objective far better than maximin: followers forgive losing weeks, not systematically cowardly ones. Novel in the lane: no other paper uses regret-against-per-world-optimal as the decision criterion.

## 11. GSE implementation spec
- **UMDP construction:** sample K=15 "worlds": bootstrap variants of the engine's calibration (resample training seasons), crossed with 3 market regimes (normal, sharp-heavy, chaotic). Each world = a full mapping from (bankroll bucket × edge bucket) to expected weekly profit per stake tier — i.e., 15 small MDPs sharing state/action space.
- **Policy:** stake-tier policy π minimizing max_world [V*_world − V^π_world] via the paper's regret-Bellman DP (heuristic per corrigendum) with 2-step options.
- **Serving:** weekly lookup in the minimax-regret policy table; log per-world regret contributions for audit ("this week's tier keeps worst-world regret at X").
- **Pairs with:** 2150 (worlds = ambiguity set), 2149 (bankroll-bucket state space), 2148 (regime switch still applies).
- **Effort:** ~2 weeks (world sampler + regret DP + option wrapper).

## 12. Reproducible test
Dataset: engine predictions + outcomes 2022–2025. Build 15 worlds from 2022–2023 bootstraps; compute minimax-regret policy; simulate 2024–2025. Baselines: (a) maximin-profit policy over the same worlds, (b) flat 1u, (c) CEMR-style myopic policy. Metrics: worst-world realized profit gap vs per-world-optimal (the actual minimax regret), mean profit, max drawdown, posted volume. Generalization: evaluate on 100 fresh bootstrap worlds.

## 13. Acceptance / rejection gate
**ACCEPT if 2024–2025:** realized worst-world regret ≤ 0.7 × maximin baseline's AND mean profit ≥ maximin's AND posted volume ≥ 80% of flat-1u (must not degenerate toward passivity). **REJECT if** worst-world regret isn't better than maximin's or volume collapses below 60% (then it's maximin in disguise).

## 14. Improvement experiment
Beyond the paper: *weighted* minimax regret — weight worlds by a plausibility score (recent predictive accuracy of that bootstrap variant) instead of uniform max, testing whether plausibility-weighting beats pure minimax on realized worst-case outcomes. Second axis: adaptive world set — refresh the 15 worlds monthly with new data and measure whether the policy's realized regret drifts less than the fixed-world version's.


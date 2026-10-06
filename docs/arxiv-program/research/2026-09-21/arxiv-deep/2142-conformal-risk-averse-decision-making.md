# [2142] Conformal Risk-Averse Decision Making with Action Conditional Guarantee (arXiv:2606.05551)

**Citation:** Zihan Zhu, Shayan Kiyani, George Pappas, Hamed Hassani (2026). *Conformal Risk-Averse Decision Making with Action Conditional Guarantee*. arXiv:2606.05551. URL: https://arxiv.org/abs/2606.05551
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `uncertainty_decision_theory`.
**Verdict:** ADAPT

*GSE relevance:* gives GSE a distribution-free recipe to turn calibrated win-prob distributions into bet/no-bet policies with per-action safety certificates (bet actions certified separately from pass actions), which the current calibration-only pipeline lacks.

## 1. Research question
How can conformal prediction sets be used to guide *risk-averse* downstream decisions (agents maximizing a guaranteed utility quantile rather than expected utility) with safety guarantees that hold *conditional on each action taken* — not merely on average across the population of inputs? The paper strengthens prior work [54], which gave only marginal (average-over-population) safety guarantees, to action-conditional guarantees: for every action a the policy may take, P(u(a(X),Y) ≥ ν(X) | a(X)=a) ≥ 1−α.

## 2. Dataset / schema
Two experiments, both public.
- **Medical diagnosis:** COVID-19 Radiography Database (chest X-ray images; 4 classes: Normal, Pneumonia, COVID-19, Lung Opacity). Random split: 70% train / 10% calibration / 20% test. Features = Inception-v3 (ImageNet-pretrained, fine-tuned from second inception block) embeddings. 4 actions (treatments incl. Quarantine as action 2). Utility matrix in Table 1 of the paper.
- **Recommender system:** user–item pairs x=(u,m) with rating label y ∈ {1,2,3,4,5}; binary action set A={No-Rec, Rec}; utility u(Rec,y)=y−3, u(No-Rec,y)=0. Split: 80% train / 10% calibration / 10% test.

## 3. Method / model
Two levels: population theory + finite-sample algorithm (AC-RAC).
- **Population (AC-DPO / AC-CPO):** The agent solves max_{a(·),ν(·)} E[ν(X)] s.t. P(u(a(X),Y) ≥ ν(X) | a(X)=a) ≥ 1−α ∀a. Theorem 2.1 shows any optimal solution of the prediction-set surrogate AC-CPO (maximize E[max_a min_{y∈C(X)} u(a,y)] s.t. action-conditional coverage) yields a *feasible* policy for AC-DPO with equal value (one-directional, unlike the marginal-case equivalence). The max-min decision rule a^C_RA(x)=argmax_a min_{y∈C(x)} u(a,y), ν^C_RA(x)=max_a min_{y∈C(x)} u(a,y).
- **Finite-sample (AC-RAC, Algorithm 1):** From calibration samples {(x_i,y_i)}_i=1^n and a black-box predictive model f: X→Δ(Y): (1) estimate θ̂(x,t)=max_a quantile_{1−t}[u(a,Y)|Y∼f_x] and â(x,t)=argmax of same; (2) for each candidate label y, minimize the pinball-loss objective F_y(λ)=1/(n+1) Σ_i ℓ_α(Σ_a λ_a 1{â(x_i,t̂(x_i,λ))=a}, Σ_a λ*_a(x_i,y_i) 1{â(x_i,t̂(x_i,λ))=a}) (+ test term), where ℓ_α(u,v)=(v−u)(1{u≤v}−α) and λ*_a(x,y)=inf{λ_a≥0: y ∈ QuantileSet_{1−t̂(x,λ_a)}[u(a,Y)|Y∼f_x]} is the novel *action-specific nonconformity score*; (3) output C_final(x_test)={y: y∈Ĉ(x_test, λ̂_y)}. Optimized via projected subgradient descent (Remark 4.2). Theorem 4.3: under exchangeability, P(y_test ∈ C_final(x_test) | a_RA^{C_final}(x_test)=a) ≥ 1−α for every a (distribution-free lower bound; upper bound too under continuous score distribution).
- **Reparameterization (Sec. 3):** coverage function t(x)=P(Y∈C(X)|X=x); θ(x,t)=max_a quantile_{1−t}[u(a,Y)|X=x]; Theorem 3.2 (strong duality under continuous P_X): optimal t(x,λ)=argmax_t{θ(x,t)+Σ_a λ_a(t−(1−α)) 1_a(x,t)}, with dual Ψ(λ)=E[max_t{...}] minimized over λ∈R_+^{|A|}.

## 4. Equations & assumptions
- Marginal safety (1): P(u(a(X),Y) ≥ ν(X)) ≥ 1−α.
- Action-conditional safety (2): ∀a∈A, P(u(a(X),Y) ≥ ν(X) | a(X)=a) ≥ 1−α.
- Action-conditional coverage (3): P(Y∈C(X) | argmax_a min_{y∈C(x)} u(a,y)=a) ≥ 1−α.
- AC-DPO (5): max_{a(·),ν(·)} E_X[ν(X)] s.t. (2).
- AC-CPO (7): max_{C(·)} E_X[max_a min_{y∈C(X)} u(a,y)] s.t. P(Y∈C(X) | a^C_RA(X)=a) ≥ 1−α ∀a.
- θ(x,t)=max_a quantile_{1−t}[u(a,Y)|X=x] (8); dual Ψ(λ)=E_X[max_{t∈[0,1]}{θ(X,t)+Σ_a λ_a(t−(1−α)) 1_a(X,t)}] (Thm 3.2).
- Action-specific nonconformity: λ*_a(x,y)=inf{λ_a≥0: y∈QuantileSet_{1−t̂(x,λ_a)}[u(a,Y)|Y∼f_x]} (14); pinball ℓ_α(u,v)=(v−u)(1{u≤v}−α).
- Finite-sample validity (Thm 4.3): exchangeability ⇒ P(y_test∈C_final(x_test) | a_RA^{C_final}(x_test)=a) ≥ 1−α ∀a.
- Assumptions: finite discrete action space (explicitly stated scope; continuous/combinatorial extensions need extra approximation); exchangeability of calibration+test for Thm 4.3 (no i.i.d. needed for lower bound); continuity of score distribution for the upper bound; continuous marginal P_X for strong duality; predictive model f must be a usable approximation of p(y|x).

## 5. Features / target
- Medical: Inception-v3 image embeddings (features); target = 4-class diagnosis label; actions = treatment decisions; decision is per-input.
- Recommender: user/item feature vectors; target = 1–5 rating; actions = {recommend, not}; decision rule chooses action from prediction set via max-min.
- General: black-box f outputs predictive distribution; features unspecified — method is model-agnostic.

## 6. Validation design
- Medical: 70/10/20 random splits; all baselines calibrated so model outputs map consistently to 4 actions; 40 random seeds; error bars averaged; metrics: action-conditional miscoverage vs nominal α (sweeps α∈{0.01,0.02,0.03,0.05,0.1}), average realized max-min utility, critical error rate (fraction of samples where selected action leads to highly adverse utility), mean set size, FDR.
- Recommender: 80/10/10 splits; same metrics.
- Baselines: RAC (marginal RA-DPO from [54]), score-1, score-2 (heuristic conformal scores), calibrated best-response policy.
- Appendix D: α-sweep miscoverage curves (Figs 2–3), rare-action stress test, action-space scaling ablation (|A| up to 10).

## 7. Numerical results / baselines
- Medical (α=0.05): AC-RAC is the only method achieving valid conditional coverage across *all* actions; RAC/score-1/score-2 systematically over/under-cover. Baselines *never* select action 2 (Quarantine), so their conditional error is undefined there; AC-RAC selects it on 2.72% of test instances and keeps it in the calibration loop.
- Utility: AC-RAC has higher worst-case (max-min) utility than score-1/score-2, slightly lower than RAC (RAC marginally optimal; gap is the price of stricter conditional guarantees).
- Critical error rate: AC-RAC reduces harmful decisions "by a significant margin" (Fig 1 right panels; appendix: critical error rate 0.21–0.35% for AC-RAC vs 3.35–4.70% for RAC in the action-scaling ablation).
- Recommender: AC-RAC only method with miscoverage ≤ nominal line for *both* actions; average utility within 5% of RAC, "significantly outperforming score-1 and score-2."
- Non-conservativeness: at α=0.05, mean set size AC-RAC 3.373 vs RAC 3.252 (~3.7% increase); FDR 0.699 vs 0.682.
- (Exact table values are in-figure; paper states claims qualitatively with 40-seed error bars. I report the paper's stated claims.)

## 8. Code / data availability
Code: https://github.com/Telvc/AC-RAC. Data: COVID-19 Radiography Database (public); recommender dataset (public). Medical dataset name/URLs via refs 23, 78.

## 9. Leakage & limitations
- Random (non-time-ordered) splits — for time-series settings like sports this is fine for the coverage guarantee (exchangeability) but the calibration set must be from the same regime; sports seasons are non-exchangeable (roster/injury drift), so calibration window must be recent/rolling.
- Finite discrete actions only; continuous stake sizing needs discretization or the unproven function-class extension (paper is honest about this).
- The one-directional guarantee (Thm 2.1) means AC-CPO is a *conservative* surrogate — can under-use sharp actions (the paper's own example: specialized actions on easy inputs get forced into larger sets or fallback).
- Rare actions make conditional coverage hard to estimate (Quarantine at 2.72% selection) — finite-sample upper bound needs continuous scores; with discrete sports outcomes (W/L), the upper bound condition fails.
- Utility function u(a,y) is assumed given — in betting, defining utility (profit vs drawdown vs bankroll growth) is the actual hard part and the paper says nothing about choosing it.
- FDR ~0.7 on the medical task suggests sets are wide; in betting, wide sets = conservative max-min = mostly "pass" — good for safety, possibly too conservative for hit-rate.
- 2026-08 paper; code repo health unverified by me.

## 10. GSE overlap
Existing-research map (~/workspace/arxiv-sweep/existing-research-map.md): GSE has CQR + conformalized WP (2208.08598), LRD calibration dashboard, Clopper-Pearson intervals — i.e., strong conformal *calibration*. Line 141: "Kelly criterion / optimal bet sizing under uncertainty — mentioned 12× in repo, zero papers read." **Gap:** GSE has no conformal *decision* layer — nothing that maps a calibrated uncertainty representation into bet/no-bet/stake with finite-sample per-decision guarantees. This paper fills exactly that gap. It complements (does not duplicate) the conformal calibration work: those produce sets; this consumes sets into actions with action-conditional (bet vs pass) certificates.

## 11. GSE implementation spec
- **Actions:** A={bet, no-bet} (binary) per game/pick; later tiered A={no-bet, small, full} stakes. Utility u(bet, y)=profit of engine's edge play given true outcome y (spread cover margin × stake − vig); u(no-bet, y)=0 (safe fallback). α=0.05 risk tolerance: certificate ν(x) = guaranteed profit floor conditioned on betting.
- **Model f:** engine's calibrated win-prob / margin distribution p(y|x) (distributional forecast over game outcomes from existing calibrated pipeline).
- **Calibration:** rolling calibration set of past games (e.g., prior 4 weeks, n≈200+ games) with realized outcomes; compute action-specific nonconformity scores λ*_bet(x,y), λ*_no-bet(x,y) per (14) with utility-ordered quantile sets; solve AC-RAC pinball objective via projected subgradient descent to get (λ_bet, λ_no-bet).
- **Serving:** for each new game, compute Ĉ(x); decision rule = max-min: bet iff min_{y∈Ĉ(x)} u(bet,y) > 0 (i.e., even the worst plausible outcome in the certified set is profitable). The certificate ν(x) is reported on the posted pick card as the guaranteed floor.
- **Effort:** ~2–3 weeks: (1) distributional outcome model wrapper, (2) λ* score computation, (3) pinball optimizer, (4) backtest harness with per-action coverage audit. Code base https://github.com/Telvc/AC-RAC as reference.

## 12. Reproducible test
Dataset: GSE engine backtest database (picks table in Neon Postgres, 3,411 picks) + nflverse game outcomes, 2023–2025 seasons (3 full seasons, ~800+ games). Baseline: current GSE fixed-fraction stake rule on all engine-positive-EV picks. Candidate: AC-RAC bet/no-bet filter with α=0.05 and utility = realized profit per game. Metrics: (a) action-conditional coverage — for games where rule says "bet", is P(y∈Ĉ | bet) ≥ 0.95 verified empirically; (b) risk-adjusted return: Sharpe and Calmar of the betting P&L series. Pass criteria in §13.

## 13. Acceptance / rejection gate
**ACCEPT if ALL hold on the 3-season backtest:** (1) empirical action-conditional coverage: among games where AC-RAC selects "bet", the certificate holds (realized utility ≥ ν(x)) on ≥95% of them (α=0.05); (2) risk-adjusted return improves ≥10%: Sharpe_AC-RAC ≥ 1.10 × Sharpe_baseline AND Calmar_AC-RAC ≥ 1.10 × Calmar_baseline; (3) bet volume ≥ 30% of baseline volume (the filter may not degenerate to "pass everything"). **REJECT otherwise** — including if the filter is too conservative to post any meaningful volume.

## 14. Improvement experiment
Beyond the paper: extend to *utility-conditional* rather than action-conditional certificates — calibrate per *stake tier* (discretized fractional-Kelly levels: 0, 0.25f*, 0.5f*, f*) instead of binary bet/no-bet, so λ* scores quantify the marginal safety of each stake level; the max-min rule then selects the largest stake whose worst-case certified utility is positive. This would combine AC-RAC's conditional guarantees with Kelly-style growth-optimal sizing, and is a natural experiment since the paper leaves continuous actions open and only sketches discretization. Compare Sharpe/Calmar of tiered-AC-RAC vs binary-AC-RAC vs fractional Kelly.


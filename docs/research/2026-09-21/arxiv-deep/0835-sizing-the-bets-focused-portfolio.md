# 0835 Sizing the bets in a focused portfolio (arXiv:2402.15588v1)

**Citation:** Vuko Vukcevic, Robert Keser (2024). *Sizing the bets in a focused portfolio*. arXiv:2402.15588v1. URL: https://arxiv.org/abs/2402.15588v1
**Ledger completed:** 2026-09-21. **Read:** full text (local cache of arXiv HTML/PDF).
**Verdict:** ADAPT — the first fully-read generalized multivariate Kelly treatment in the repo, with long-only, leverage, max-allocation, and permanent-capital-loss constraints solved exactly via Newton–Raphson over active-constraint combinations; directly applicable to sizing a small set of correlated GSE edges.

## 1. Research question

How should a concentrated investor size positions across a small number of simultaneous bets when the classic Kelly formula must be generalized to multiple correlated outcomes and augmented with real-world constraints (no shorting, no leverage, per-position caps, and a hard limit on the probability of permanent capital loss)? The paper derives the constrained multivariate Kelly solution and validates it on calibrated toy scenarios.

## 2. Dataset / schema

No empirical dataset. Validation is by constructed scenarios: five identical 50%-loss / 100%-gain, 50/50-probability candidates, and an example 5-asset portfolio (A–E) with stated edge and loss parameters. Illustrative, not empirical.

## 3. Method / model

- **Generalized multivariate Kelly:** maximize expected log growth over a discrete set of joint outcomes with probabilities p_i and payoff vectors k_{ij}; solve the first-order conditions

  ∑_i p_i k_{ij} / (1 + ∑_j f_j k_{ij}) = 0

  for the fraction vector f via Newton–Raphson.
- **Constraints:** long-only (f_j ≥ 0), leverage cap (∑ f_j ≤ 1), max allocation per position, and a permanent-capital-loss constraint P(loss ≥ K) ≤ P — enforced by enumerating every active/inactive constraint combination (2^{N_l} systems) and keeping the feasible optimum.
- Implemented in the Rust crate `charlie` (source on GitLab, links stated in the paper).

## 4. Equations & assumptions

- Core FOC (quoted exactly): ∑_i p_i k_{ij} / (1 + ∑_j f_j k_{ij}) = 0.
- Log-growth objective; constraints as above.
- Assumptions: outcome probabilities and payoffs are known exactly (no estimation error in the derivation); discrete joint outcome space is fully enumerated; log utility; bets resolve simultaneously; no sequential rebalancing within the sizing step.

## 5. Features / target

- **Inputs:** for each candidate: win/loss probabilities and payoff multiples; global constraint parameters (leverage cap, max allocation, loss threshold K, loss probability P).
- **Target:** the optimal fraction vector f (position sizes as fractions of bankroll).

## 6. Validation design

- Scenario 1: five identical 50%-loss/100%-gain, 50/50 candidates — unconstrained Kelly gives 35% each (75% leverage implied); no-leverage constraint gives 20% each; adding loss constraint P=5%, K=50% gives 2% each.
- Scenario 2: 5-asset example portfolio: A 30%, B 8%, C 30%, D 2%, E 30%; expected gain $0.32 per dollar wagered; cumulative loss probability 16%; claimed probability of 60% capital loss 0.008%.
- No out-of-sample empirical validation; no baselines beyond the constraint variants.

## 7. Numerical results / baselines

- Five identical candidates: unconstrained 35% each (75% leverage) → no-leverage 20% each → with P=5%/K=50% loss constraint 2% each.
- Example portfolio: A 30%, B 8%, C 30%, D 2%, E 30%; expected gain $0.32/$1; cumulative loss probability 16%; 60%-capital-loss probability 0.008%.
- All numbers are model outputs on stipulated inputs, not empirical findings.

## 8. Code / data availability

Rust crate `charlie`; source on GitLab (links stated in the paper). No dataset (scenarios are constructed).

## 9. Leakage & limitations

- No empirical validation whatsoever — all results are arithmetic consequences of assumed inputs.
- Complexity 2^{N_l}: with 20 candidates and all constraints, ~4 trillion nonlinear systems — infeasible; the exact method only works for small N (fine for a focused portfolio, not for a full slate).
- Newton–Raphson nonconvergence can silently discard the true optimum; the paper flags this.
- Assumes known probabilities — in sports betting the probability estimates are the entire problem; garbage in, Kelly-amplified garbage out.
- Simultaneous resolution assumption is strained by multi-day slates.

## 10. GSE overlap

Per the existing-research map: Kelly mentioned 12×, zero papers fully read — this is the first. Wang Transform (oracle3, prediction-market lane) and the "statistical theory of optimal decision-making in sports betting" (PLOS ONE 2023, cited) are adjacent but neither is a multivariate constrained-Kelly implementation. New capability for the sizing layer; complements 0834 (MD MILP) as the growth-optimal alternative.

## 11. GSE implementation spec

- Port the constrained multivariate Kelly to Python (scipy Newton / SLSQP with the same constraint enumeration for N ≤ 10; fall back to SLSQP directly on the log-growth objective for larger N).
- Inputs: engine win probabilities per pick, odds → payoff multiples, joint outcome model (start with independence + game-level blocks, graduate to bootstrap covariance from 0834's pipeline).
- Constraints: long-only, no leverage, max 25% per pick, P=1% / K=30% permanent-loss constraint for the public bankroll.
- Effort: 2–3 days for port + calibration harness.

## 12. Reproducible test

Dataset: GSE engine picks 2024 season (`picks` table). Metric: walk-forward season ROI and max drawdown, monthly refit. Baselines: flat stakes, 0.25-Kelly single-bet sizing, 0834's constrained-MD sizing. Pass if constrained multivariate Kelly matches or beats 0.25-Kelly ROI with lower max drawdown.

## 13. Acceptance / rejection gate

ADOPT if walk-forward max drawdown ≤ 0.25-Kelly's drawdown at ROI within 1 pp of the best baseline; REJECT if the joint-probability estimation step dominates (i.e., performance collapses under bootstrap covariance vs independence — then the method is not usable without a better dependence model).

## 14. Improvement experiment

Estimate the joint outcome distribution with a Gaussian copula fit on historical pick residuals (per-pick marginals from the engine's calibration curve) instead of assuming independence, and re-solve. Hypothesis: accounting for correlated losses (bad weeks hit many picks) shrinks aggregate exposure and cuts tail drawdown vs the independence solution.

# [1221] Phase transitions in optimal strategies for betting (arXiv:2005.11698)

**Citation:** L. Dinis, J. Unterberger, D. Lacoste (2020). *Phase transitions in optimal strategies for betting*. arXiv:2005.11698. URL: https://arxiv.org/abs/2005.11698
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — adopt the mean-vs-fluctuation-of-growth-rate Pareto framework (not Markowitz's one-period mean-variance) as GSE's risk-adjusted sizing objective, with the thermodynamic-uncertainty-relation bound as a sanity check and the "vertical slope at Kelly" finding as the quantitative case for fractional Kelly.

## 1. Research question
The paper asks what the optimal betting strategy is when the gambler cares about both the long-run average growth rate ⟨W⟩ and its fluctuations σ_W: what does the Pareto-efficient frontier look like for Kelly horse races (2, 3, arbitrarily many horses; uncorrelated and Markov-correlated races), are there phase transitions between qualitatively different optimal strategies, and is there a general bound on the mean–fluctuation tradeoff?

## 2. Dataset / schema
No empirical dataset. Numerical experiments via simulated annealing on: two-horse case (p = 0.2, r = 0.4 illustrated), three-horse case (p1 = 0.2, p2 = 0.6, r1 = 0.4, r2 = 0.2), and a Markov-correlated three-horse case (parameters in the supplement). All races simulated from the assumed models.

## 3. Method / model
Kelly horse-race model: capital C_{N+1} = o_x·b_x·C_N with probability p_x; long-run growth ⟨W⟩ = Σ p_x·ln(o_x·b_x). Maximize the utility J̃ = α⟨W⟩ − (1−α)σ_W (α ∈ [0,1]) over bet allocations b_x, i.e., a linear combination of the mean and standard deviation of the *long-run growth rate* (not one-period returns — the key difference from Markowitz). Trace the Pareto frontier by varying α (with auxiliary objectives J2, J3, J4 for concave/negative-growth branches), derive the exact two-horse solution, prove the phase transition near the null strategy and the convexity of the lower front between null and Kelly strategies (supplement Theorem 2), and extend to correlated races.

## 4. Equations & assumptions
- C_{N+1} = o_x·b_x·C_N with probability p_x; ⟨W⟩ = Σ_x p_x·ln(o_x·b_x)
- Kelly: b*_x = p_x; fluctuation relation ⟨e^{−W}⟩ = Σ_x p_x/(o_x·b_x) = 1 (fair odds); generalized ⟨e^{−W−I}⟩ = Λ, Λ = Σ_x 1/o_x
- Utility: J̃ = α⟨W⟩ − (1−α)σ_W; optimality: p_x − b_x = (γ/σ_W)·p_x·[ln(o_x·b_x) − ⟨W⟩], γ = (1−α)/α
- Two horses: b± = p ± γ·σ with σ = p(1−p); slope dσ_W/d⟨W⟩ = σ/(γ(p−b)) — infinite at Kelly's point; = 1/(γ_c·|p−r|) near the null strategy with γ_c = σ/|p−r|
- Phase transition: d²σ_W/d⟨W⟩²|_{γc} = r(1−r)/(σ²·γ_c³) > 0
- TUR-like bound: σ_W ≥ ⟨W⟩/σ_q, where q_x = r_x/p_x, r_x = 1/o_x (fair odds); saturated at b_x = r_x (null strategy)
- General M horses: γ_c = σ_q; d²σ_W/d⟨W⟩²|_{γc} = C/γ_c^5, C = ⟨q³⟩−⟨q²⟩² ≥ 0
Assumptions: fair odds (no track take) for the cleanest results, known p_x, repeated reinvestment, log utility; the bound proof uses Cauchy–Schwarz.

## 5. Features / target
Inputs: win probabilities p_x, odds o_x, risk-aversion parameter α (or γ). Target: Pareto-optimal allocation b* and its (⟨W⟩, σ_W) position.

## 6. Validation design
Analytic proofs (two-horse exact solution, phase-transition proof, convexity/no-further-transitions proof in supplement) plus simulated-annealing numerics tracing the frontiers. No real betting data, no train/test split. The numerics confirm the analytics rather than testing a predictive claim.

## 7. Numerical results / baselines
Quoted exactly from the paper:
- Two-horse illustration: p = 0.2, r = 0.4 (Figure 2: trade-off lower branch + non-trade-off upper branch meeting at Kelly's point).
- Three-horse Pareto borders: p1 = 0.2, p2 = 0.6, r1 = 0.4, r2 = 0.2.
- Near Kelly's point the Pareto slope is always vertical: "if one is willing to sacrifice a small amount of the average growth rate, one can lower the fluctuations significantly."
- The lower front between the null strategy and Kelly's point is convex (proved) — no other phase transitions there.
(My note: these are structural results, not performance claims.)

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
No data, so no leakage — but also no evidence the framework improves realized outcomes; it is a normative framework. Fair-odds assumption fails for sportsbooks (vig); the track-take generalization is mentioned only in passing. The "phase transition" is a property of the optimization landscape (a kink in the optimal-strategy path), not an empirical market phenomenon — GSE should not over-interpret it. Simulated annealing is a heuristic; frontier precision for large outcome spaces is unquantified. Assumes known probabilities; estimation error (the actual hard problem) is absent.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, Kelly sizing had zero deep reads; fractional Kelly is an identified gap. GSE's `apps/web/lib/staking/kelly-investigation.ts` hard-codes a default fraction of 0.25 with no principled derivation. This paper supplies the missing principle: the vertical slope at Kelly's point is the quantitative argument for *why* fractional Kelly (sacrificing a little growth for a lot less fluctuation) is right, and the (⟨W⟩, σ_W) frontier gives GSE a way to *choose* the fraction rather than hard-code it. New capability, not a duplicate.

## 11. GSE implementation spec
1. Replace the hard-coded 0.25 default with a frontier choice: compute the (⟨W⟩, σ_W) Pareto frontier over Kelly fractions on GSE's backtest edge distribution; pick the fraction at a configured fluctuation budget (default: the knee of the frontier). Effort: M.
2. Add the TUR-like bound σ_W ≥ ⟨W⟩/σ_q as a monitoring invariant: if a proposed sizing violates it on the empirical distribution, the probability/odds inputs are inconsistent — alert. Effort: S.
3. Document the vertical-slope-at-Kelly finding in the staking module as the rationale for fractional Kelly in user-facing educational copy. Effort: S.

## 12. Reproducible test
Dataset: GSE 2025–2026 backtest picks with calibrated probabilities and market odds. Metric: realized (growth, fluctuation) points of (a) current 0.25-default sizing vs. (b) frontier-chosen fraction, plotted against the predicted frontier. Baseline: (a). Window fixed in advance.

## 13. Acceptance / rejection gate
ADOPT the frontier-chosen fraction if its realized (⟨W⟩, σ_W) point lies within 15% of the predicted frontier (validating the framework on GSE data) AND it matches or beats baseline realized growth at lower realized fluctuation. REJECT otherwise.

## 14. Improvement experiment
Beyond the paper: extend the frontier to estimated (not known) probabilities by computing a *robust* frontier — worst-case (⟨W⟩, σ_W) over the calibration-error uncertainty set from ledger 1214 — and choose the fraction on the robust frontier. Hypothesis: the robust-frontier fraction beats the nominal-frontier fraction on realized risk-adjusted growth when calibration drifts.

# [2094] On The Statistical Limits of Self-Improving Agents (arXiv:2510.04399)

**Citation:** Authors (2025). *On The Statistical Limits of Self-Improving Agents*. arXiv:2510.04399 (version verified via export API; v3 current). URL: https://arxiv.org/abs/2510.04399
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, Abstract + Sections 1–4 + Appendices 12–13).
**Verdict:** ADAPT — the utility–learning tension and the Two-Gate policy (validation margin τ + capacity cap K(m)) give the discovery loop its safety theorem: self-improvement that chases backtest utility without a capacity bound can render the signal class unlearnable; the two-gate rule is the formal version of every numeric gate in ledgers 2082–2093.

## 1. Research question
Classical learning theory assumes architectural invariance — the hypothesis class, update rule, and substrate are fixed while parameters adapt. But self-improving agents rewrite the mechanisms by which they learn. When do utility-driven self-modifications preserve the statistical preconditions for reliable learning and generalization, and when do they destroy them? The paper formalizes this via a five-axis decomposition and proves a policy-level learnability boundary.

## 2. Dataset / schema
Theory paper; "numerical experiments across several axes" validate the theory by comparing destructive utility policies against the proposed two-gate policies (details in appendices). No real-world dataset.

## 3. Method / model
- **Five-axis decomposition** of self-modification (Section 3): A (algorithmic — optimizers, hyperparameters, update rules), H (representational — hypothesis class/feature maps/encodings), Z (architectural — topology, wiring, depth/width, memory addressing), F (substrate — computational substrate; Church–Turing-equivalent changes preserve solvability up to overhead), M (metacognitive — the scheduler that selects/approves modifications). A decision layer separates incentives from learning behavior.
- **Central result — the utility–learning tension:** "the structural conflict in self-modifying systems whereby utility-driven changes that improve immediate or expected performance can also erode the statistical preconditions for reliable learning and generalization."
- **Learnability boundary theorem:** distribution-free PAC guarantees are preserved **iff** the policy-reachable model family is uniformly capacity-bounded, i.e., sup VC(H_reach) < ∞. "When capacity can grow without limit, utility-rational self-changes can render learnable tasks unlearnable." Under standard assumptions the five axes reduce to the same capacity criterion — "a single boundary for safe self-modification."
- **Two-Gate policy:** accept a self-modification only if (Gate 1, validation) it clears a validation margin τ AND (Gate 2, capacity) a capacity proxy B(Z_new) ≤ K(m) for a sample-size-dependent cap K(m). Yields a VC-rate oracle inequality (Proposition, Appendix 13.3: "Proxy-cap two-gate oracle inequality"); finite-sample safety proved in Appendix 12.2.
- **Multi-axis warning:** capacity bounds must be enforced GLOBALLY, not per-axis — "a small architectural change combined with representational expansion can yield multiplicative VC growth"; "axis interactions create emergent capacity explosions that independent per-axis budgets cannot prevent"; the gap between computable proxy B(·) and true VC determines how conservative the gates must be.

## 4. Equations & assumptions
Faithful statements: learnability ⟺ sup VC(H_reach) uniformly bounded; Two-Gate: accept iff validation margin ≥ τ AND B(Z_new) ≤ K(m); oracle inequality for the proxy-cap two-gate policy (Appendix 13.3). Assumptions (explicit): standard PAC setting; Church–Turing-equivalent substrates; "standard assumptions common in practice" under which axes reduce to the capacity criterion; computable capacity proxy B(·) exists with known gap to true VC.

## 5. Features / target
Not empirical. Target: preservation of distribution-free generalization guarantees under self-modification; the two-gate policy's oracle inequality.

## 6. Validation design
Numerical experiments across several axes comparing destructive utility policies vs two-gate policies (appendices); theory-first contribution.

## 7. Numerical results / baselines
No headline numeric results in the extracted sections (theory paper; experiments are illustrative validations of the boundary in the appendices). The "result" is the theorem: the single capacity boundary + the two-gate guardrail with its oracle inequality.

## 8. Code / data availability
None stated in the extracted sections.

## 9. Leakage & limitations
The capacity criterion is stated in terms of VC dimension, which is uncomputable for the LLM-driven loop — everything hinges on the proxy B(·) and its gap to true VC (the authors flag this as "the key open challenge"); the PAC framing assumes i.i.d. sampling, which sports seasons violate (non-stationarity); the theory doesn't tell you WHAT capacity cap K(m) to use in practice. For GSE: treat this as the principled justification for complexity budgets, not a plug-in formula — the operational version is "every self-modification must pass BOTH a validation gate AND a complexity gate."

## 10. GSE overlap
**MOVE-37 FLAG:** This is the safety theorem for the entire MOVE-37 lane: a discovery loop that lets the agent expand the signal class without bound (more features, more interactions, more rules) while chasing backtest utility WILL eventually destroy its own generalization guarantees — the formal statement of overfitting-by-self-improvement. Every numeric gate in ledgers 2082–2093 is an instance of Gate 1 (validation); this paper says Gate 1 alone is insufficient — you also need Gate 2 (capacity). Existing-map check: the corpus has calibration and validation discipline (CQR, grouping loss, Clopper-Pearson) but no complexity-budget discipline on the discovery process itself; today's practice ("add features until the backtest looks good") is exactly the destructive utility policy the paper warns about. **New capability** (formal safety framing); it governs all the other ledgers.

## 11. GSE implementation spec
Implement the **Two-Gate policy** as the discovery loop's promotion rule:
1. **Gate 1 (validation, τ):** the existing ΔBrier ≥ 0.002 on the held-out season (ledgers 2082/2085), PLUS a validation margin — require the lower bound of the bootstrap CI of ΔBrier to exceed 0.001 (τ with uncertainty, not a point estimate).
2. **Gate 2 (capacity, K(m)):** every promoted signal/rule gets a complexity proxy B = (# free parameters) + (# engineered features) + (rule count × avg conditions) — the computable stand-in for VC. Cap: B ≤ K(m) where K scales with training seasons (e.g., K = 2 × seasons of training data; 10 seasons → B ≤ 20). A signal that passes Gate 1 but needs 35 parameters on 10 seasons of data is REJECTED — this is the paper's boundary made operational.
3. **Global enforcement:** the cap applies to the PRODUCTION POLICY as a whole (2089's rubric + 2086's archive of live signals), not per-signal — per the multi-axis warning, per-signal budgets compose into an unbounded policy.
4. **Metacognitive scheduler:** the nightly MCTS scheduler (2089) must respect the remaining capacity budget when expanding the tree — no new branches when the policy is at cap; instead it must propose SIMPLIFICATIONS (rule merges, feature drops) as candidate modifications.
5. **Effort:** 1–2 days (complexity accounting + dual-gate promotion logic + budget-aware scheduler constraint).

## 12. Reproducible test
**Dataset:** nflverse 2015–2024 + 2025 holdout. **Protocol:** take 30 historically proposed GSE-style signals (hand-built, varying complexity). Arm A: promote by Gate 1 only (ΔBrier ≥ 0.002). Arm B: promote by Two-Gate (Gate 1 + capacity cap). **Metric:** out-of-sample (2025, then locked 2014) degradation rate — fraction of promoted signals whose ΔBrier drops below 0 on the locked season; and mean locked-season ΔBrier per arm. The paper predicts arm B degrades less.

## 13. Acceptance / rejection gate
**ADOPT the Two-Gate promotion rule if:** arm B's locked-season degradation rate is ≤50% of arm A's AND arm B retains ≥70% of arm A's total locked-season ΔBrier (the capacity gate isn't just killing everything — precision up, recall acceptable), and the complexity proxy B correlates negatively with locked-season degradation (Spearman ≤ −0.3 — the proxy is measuring something real). **REJECT if** arm B ≈ arm A (capacity isn't the binding constraint in this regime — keep Gate 1 only and revisit when the policy grows), or the proxy shows no correlation with degradation (B is the wrong proxy — find a better one before enforcing it), or K(m) tuning is so sensitive that small changes flip >30% of promotion decisions (the gate is arbitrary, not principled).

## 14. Improvement experiment
Beyond the paper: make K(m) **adaptive to regime** — estimate the effective sample size per season (accounting for non-stationarity: recent seasons weighted more) and set the capacity cap from THAT, not raw season counts. Hypothesis: a stationary-cap overfits to stale regimes (the paper's i.i.d. assumption is the weak point for sports); an effective-sample-size cap automatically tightens when the game changes (rule changes, e.g.) and loosens in stable eras. Test: compare locked-season degradation of fixed-K vs adaptive-K promotion over rolling windows covering a known regime shift.

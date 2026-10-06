# [2169] Rethinking Symbolic Regression Datasets and Benchmarks for Scientific Discovery (arXiv:2206.10540)

**Citation:** Yoshitomo Matsubara, Naoya Chiba, Ryo Igarashi, Yoshitaka Ushiku (2022). *Rethinking Symbolic Regression Datasets and Benchmarks for Scientific Discovery*. arXiv:2206.10540. URL: https://arxiv.org/abs/2206.10540
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — proves R²-based evaluation of discovered equations is nearly uncorrelated with human judgment (PCC 0.005, p=0.913) while their normalized tree-edit-distance metric correlates strongly (PCC −0.416, p=1.85×10⁻²⁴); and shows every major SR method fails to filter dummy variables. GSE must change how it scores discovered equations.

## 1. Research question
Existing SR benchmarks (FSRD, SRBench) use unrealistic sampling (U(1,5) for everything), treat physical constants as variables, and score methods with binary solution rate or R² — neither of which measures *structural* closeness to the true law, and neither penalizes spurious variables. Can we build (a) 240 physically realistic benchmark datasets and (b) a metric that measures how structurally close a discovered equation is to the truth, in a way humans agree with?

## 2. Dataset / schema
**SRSD-Feynman**: 120 datasets from Feynman-physics formulas with rewritten annotation policy — physical constants fixed (ε₀ = 8.854×10⁻¹², g = 9.807) instead of variables; SI-unit sampling ranges per variable on log scales spanning 10² orders (e.g. μ ~ U_log(10⁻², 10⁰), spring k ~ U_log(10², 10⁴), angles ~ U(0, 2π)); split Easy (30) / Medium (40) / Hard (50) by operation count and domain-range metric f_range(S) = |log₁₀|max S − min S|| (Eq. 1). **SRSD-Feynman + Dummy**: 120 more with 1–3 randomly placed dummy variables sampled U_log(10^(s−1), 10^(s+1)), s ∈ {−32…32} — tests whether SR selects only necessary variables. Published: https://github.com/omron-sinicx/srsd-benchmark + HuggingFace (yoshitomo-matsubara/srsd-feynman_{easy,medium,hard}{,_dummy}).

## 3. Method / model
**Normalized Edit Distance (NED)** (Eq. 3): d̄(f_pred, f_true) = min(1, d(f_pred,f_true)/|f_true|), where d is Zhang–Shasha tree edit distance over sympy-simplified equation trees (constants and variables replaced by canonical symbols; "x+x+x" ≡ "3x"). Model selection per problem picks argmin of relative validation MSE (Eq. 4); NED is then computed on that model. Benchmark: 8 methods — gplearn, AFP, AFP-FE, AI Feynman, DSR, E2E (transformer), uDSR, PySR — 100 hyperparameter sessions each, up to 24h HPC jobs, 1,680 jobs total. User study: 23 PhD-level volunteers (physics, math, CS, engineering, biology), 24 problems, 1–5 human similarity ratings vs R² and NED.

## 4. Equations & assumptions
- Domain-range: f_range(S) = |log₁₀|max S − min S|| (Eq. 1). R² definition (Eq. 2). NED: d̄ = min(1, d/|f_true|) (Eq. 3). Model selection: f*_pred = argmin (1/n)Σ|(f_pred−f_true)/f_true|² (Eq. 4).
- Assumptions: sympy simplification yields canonical trees; tree-edit operations (insert/delete/rename) cost 1; coefficient values don't matter (constants → symbol C); dummy variables should never appear in the true equation.

## 5. Features / target
Tabular regression: realistic physics variables → target from known formula. Difficulty axes: formula operation count × sampling-domain width. Dummy sets add 1–3 irrelevant log-uniform columns.

## 6. Validation design
Full factorial: 8 methods × 240 datasets × 100 hyperparameter sessions, best-model-per-method by validation geometric MSE; metrics: R²-accuracy (R²>0.999), solution rate (symbolic match up to constant/scalar), NED. Dummy-variable usage audited separately (Table 6: % of predictions using ≥1 dummy; % of "R²-correct" predictions using ≥1 dummy). User study correlates R² vs NED against human ratings.

## 7. Numerical results / baselines
- **uDSR and PySR are SOTA on SRSD** (AI Feynman won on the old FSRD — rankings flip with realistic data). uDSR: best R²-accuracy (Easy 100%, Medium 75%, Hard 20%); PySR: best solution rate (Easy 60%, Medium 30%, Hard 4%) and best NED (Easy 0.269, Medium 0.537, Hard 0.785 — lower is better).
- **Dummy variables break everything:** 50–100% of predictions across ALL methods use at least one dummy variable (Table 6). R²-accuracy is actively misleading: DSR's "correct" (R²>0.999) equations with dummies are 45.1% dummy-contaminated; E2E's 100%. PySR's dummy-using solutions never reach R²>0.999 — its complexity penalty is the partial defense.
- **User study:** human judges vs R²: PCC = 0.00466, p = 0.913 (no correlation). Human judges vs NED: PCC = −0.416, p = 1.85×10⁻²⁴ (strong; negative because lower NED = better). NED also discriminates methods where solution rate saturates at 0% (Medium/Hard dummy sets).
- Difficulty categorization validated: all methods' NED rises Easy → Medium → Hard.

## 8. Code / data availability
Code: https://github.com/omron-sinicx/srsd-benchmark (includes eq_comparator.py NED implementation). 240 datasets on HuggingFace (yoshitomo-matsubara/srsd-feynman_*).

## 9. Leakage & limitations
Adversarial notes: (a) NED requires the true equation — available only for benchmarks, not real GSE discovery; it can rank methods, not score live candidates. (b) Tree-edit distance ignores coefficient values by design — two equations structurally identical but with wildly different calibrated constants score 0 distance; fine for physics, dangerous if GSE reads it as "equivalent." (c) User study is small (23 judges, 24 problems) and rating is subjective. (d) Realistic sampling ranges are still synthetic; real measurement noise/correlated features aren't modeled. (e) E2E's failure (NED 1.00 everywhere) may reflect its training distribution, not transformers per se. (f) The dummy-variable test uses independent random dummies — real sports features are correlated, which is both harder (collinearity) and easier (group structure) than this test.

## 10. GSE overlap
GSE's equation-discovery evaluation (ledgers 2162, 2166, 2168) is pure fit-metrics: MSE/Brier/R² on validation. This paper's headline finding is that R² is *uncorrelated with human judgment of equation quality* (PCC ≈ 0) — GSE is currently selecting its "best" discovered equations with a metric that cannot tell a structurally true equation from a coincidentally fitting one. Worse, the dummy-variable result directly threatens GSE's wide-feature SR runs: with dozens of team-stat features, every tested SR method happily includes spurious variables, and R² won't flag it. No GSE process measures structural plausibility of discovered equations.

## 11. GSE implementation spec
1. Adopt NED-style structural evaluation for GSE's equation benchmarks: for each discovery target (win prob, point total), define reference structural forms (e.g. logistic in EPA margin; linear-additive scoring components) and compute normalized tree-edit distance of every Pareto-front equation to the reference — alongside R².
2. Build a **GSE dummy-variable test**: inject 3 log-uniform dummy columns into the weekly team-stat matrix, run the standard PySR discovery, and audit what fraction of selected equations include dummies (the paper's Table 6 protocol). This is the acceptance test for any SR configuration GSE deploys.
3. Selection rule change: among equations within 1% validation Brier of the best, prefer the one with lowest NED to the domain reference form (structural Occam's razor, human-aligned per the user study), replacing pure complexity-penalty tie-breaking.
Effort: ~1 week (eq_comparator.py is open source; reference forms are one afternoon of domain work). No new data cost.

## 12. Reproducible test
2025 NFL season, win-probability PySR discovery on 2015–2024 features + 3 injected dummies. Metrics: (a) dummy-inclusion rate of selected equations (paper's Table 6 analog); (b) agreement rate between R²-selection and NED-selection of the "best" equation; (c) blind human rating — 3 GSE analysts rate pairs of equations 1–5 for football-plausibility, correlated against R² and NED (mini user study replicating Table 7).

## 13. Acceptance / rejection gate
**ADAPT if:** the dummy audit finds ≥ 30% of currently selected equations include injected dummies (confirming the vulnerability is live in GSE's pipeline) OR the mini user study replicates the paper (NED correlates with analyst ratings at |PCC| ≥ 0.3 while R² does not, p < 0.05). **REJECT if:** dummy-inclusion is < 10% (GSE's existing complexity penalty already handles it) AND R²-selection and NED-selection agree on > 90% of targets (structural metric adds nothing). Gate pre-registered.

## 14. Improvement experiment
Beyond the paper: **correlated-dummy stress test**. The paper's dummies are independent randoms — the easy case. For sports, the realistic threat is *correlated* spurious features (e.g. "total plays" correlates with "time of possession" which correlates with winning, without causing it). Extend the audit with dummies that are noisy copies of real predictive features at correlation levels 0.3/0.6/0.9, and measure at what correlation each SR configuration starts selecting the dummy over (or alongside) the true feature. This maps the exact failure boundary of GSE's feature selection and tells the team which correlated stat clusters need pre-grouping before SR — a strictly harder and more useful test than the paper's.

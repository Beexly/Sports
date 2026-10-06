# [1834] Vertical Symbolic Regression (arXiv:2312.11955)

**Citation:** Nan Jiang, Md Nasim, Yexiang Xue (2023). *Vertical Symbolic Regression*. arXiv:2312.11955v1. URL: https://arxiv.org/abs/2312.11955
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

The vertical discovery path (control-variable experiments: freeze most variables, learn reduced forms, then extend round by round) provably shrinks the search space exponentially vs horizontal search and empirically dominates GP/MCTS on multi-variable recovery; needs adaptation because GSE can't run true controlled experiments — the "data oracle" must be replaced by observational slicing (condition on variable bins), which weakens the theory but preserves the curriculum-learning structure.

## 1. Research question
Nearly all SR searches the full hypothesis space over all variables at once ("horizontal"), which explodes exponentially. Can a "vertical" path — start with simple expressions over few variables under controlled experiments (others held constant), then extend round-by-round adding newly-freed variables — provably and empirically beat horizontal GP and MCTS on many-variable equations?

## 2. Dataset / schema
Synthetic trigonometric datasets with operator sets {inv,+,−,×}, {sin,cos,+,−,×}, {sin,cos,inv,+,−,×} at complexity levels (2,1,1) and (3,2,2); plus Feynman/Livermore-style sets. Evaluation: recovery rate (R² ≥ 0.999 = exact recovery, hand-checked), total time, peak memory, 48-hour limit, BFGS optimizer (500 iters).

## 3. Method / model
- **Control Variable Experiment** CvExp(φ, v_c, v_f, {T_k}_{k=1}^K): trial expression φ, controlled variables v_c (fixed within a trial, varied across K trials), free variables v_f (random). Data per trial = noisy observations of ground truth at those settings — in science, real experiments; the paper assumes a **data oracle** (simulator) that can generate data at arbitrary controlled settings.
- **Reduced-form expressions**: controlling v_c={x2,x3,x4} with v_f={x1} makes ground truth φ=x1x3−x2x4 look like φ′=C1x1−C2 (open constants fit by BFGS); the reduced form is simpler and its constants' variation across trials reveals the next variable's role.
- **Vertical framework**: round 1 = SR over 1–2 free variables; each round adds freed variables, extending previous expressions; search stays in small hypothesis spaces early.
- **Two regressors**: VSR-GP (genetic programming adapted to vertical rounds) and VSR-MCTS (Monte Carlo tree search over context-free-grammar expressions, adapted similarly).
- **Theory (Sec. 5)**: VSR search space exponentially smaller than horizontal for a class of expressions.

## 4. Equations & assumptions
CvExp(φ, v_c, v_f, {T_k}); reduced form φ′ with open constants C fit per trial; vertical extension φ_{r+1} = extend(φ_r, new free variables).
Assumptions: (1) a data oracle exists (arbitrary controlled queries); (2) ground truth is vertically decomposable (reduced forms are simpler); (3) BFGS recovers open constants; (4) R²≥0.999 = exact recovery; (5) noise doesn't break reduced-form identification.

## 5. Features / target
Multi-variable synthetic equations. GSE analog: team-efficiency equations over many situational variables.

## 6. Validation design
Recovery-rate comparison VSR-GP vs GP, VSR-MCTS vs MCTS on 3 trig dataset families × 2 complexity levels; time/memory; noise-rate and quartile ablations; hand-checking of recovered equations.

## 7. Numerical results / baselines
Table 4 (recovery % | time min | peak MB, 48h limit):
- {inv,+,−,×}, (3,2,2): VSR-GP 70% vs GP 40% (10 vs 21 min); VSR-MCTS 70% vs MCTS 40% (5 vs 38 min).
- {sin,cos,+,−,×}, (3,2,2): VSR-MCTS **100%** vs MCTS **20%** (8 vs 249 min, 61 vs 191 MB); VSR-GP 50% vs GP 40%.
- {sin,cos,inv,+,−,×}, (3,2,2): VSR-MCTS **70%** vs MCTS **0%** (17 vs 287 min); VSR-GP 20% vs GP 30% (GP slightly better here, but VSR-GP expressions hand-checked as shorter/simpler).
- VSR-MCTS uses <2×... (text: "less than two h[ours?]" — less time/memory than MCTS across the board); hand-checks confirm VSR finds shorter, simpler equivalents (e.g. x+x instead of 2x).

## 8. Code / data availability
Implementation appendix (A.1–A.6) with hyperparameter and dataset configs. No public repo URL extracted.

## 9. Leakage & limitations
- **The data oracle is the whole game**: without a simulator to query at controlled settings, vertical SR collapses to observational conditioning — the paper's sports-applicability hinges on this substitution, and the exponential-shrinkage theory assumes true control.
- Synthetic trig equations only; no real-world validation.
- GP slightly beat VSR-GP on the hardest set (30% vs 20%) — vertical isn't universally better; MCTS benefits more.
- 48-hour compute budgets; sports-scale data is smaller but noisier.
- Reduced-form identification under noise is fragile — misidentified early rounds poison later ones (no backtracking described).

## 10. GSE overlap
The curriculum idea ports directly: GSE-SR currently searches all features at once (horizontal). A vertical variant — round 1: 2-feature metrics (e.g. success rate + EPA/play only); round 2: add explosiveness; round 3: situational splits — mirrors how analysts actually build metrics. Complements 1830 (AI Feynman 2.0's modularity) as the search-ordering principle. New capability; no existing GSE staged search.

## 11. GSE implementation spec
- Implement VSR-PySR: round r runs PySR restricted to feature subset S_r (growing: S_1 ⊂ S_2 ⊂ ...); seed round r+1's population with round r's hall-of-fame; "control" approximated by residualizing: regress target on controlled features' current best form, search free features against residuals.
- Observational control: bin controlled variables (e.g. down/distance buckets) and fit reduced forms per bin; constants varying across bins reveal the controlled variable's role.
- Data: nflverse play-level (EPA/play) with 6–10 features. Effort: ~3 days.

## 12. Reproducible test
Dataset: nflverse 2015–2022 plays (target EPA/play), 2023–2025 test. Baselines: horizontal PySR (all features) vs VSR-PySR (3 rounds). Metrics: test R², expression length, wall-clock time, recovery of known structure (does it find success-rate + explosiveness decomposition?).

## 13. Acceptance / rejection gate
ADOPT vertical staging if VSR-PySR matches or beats horizontal test R² with ≤50% of the expression length or ≤50% of the compute time; REJECT if horizontal wins on both accuracy and simplicity — the oracle-free approximation doesn't transfer.

## 14. Improvement experiment
"Regime-vertical SR": run the vertical rounds not over feature subsets but over GAME REGIMES (round 1: neutral-script plays only; round 2: add trailing; round 3: add leading) — testing whether football relationships are regime-decomposable. If round-1 equations are stable across regimes, GSE gets regime-robust metrics; if not, the differences themselves are the finding (and a content goldmine: "the equation changes when trailing").

---
Lane: symreg_equation_discovery · Block 1822–1841

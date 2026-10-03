# [1830] AI Feynman 2.0: Pareto-optimal symbolic regression exploiting graph modularity (arXiv:2006.10782)

**Citation:** Silviu-Marian Udrescu, Andrew Tan, Jiahai Feng, Orisvaldo Neto, Tailin Wu, Max Tegmark (2020). *AI Feynman 2.0: Pareto-optimal symbolic regression exploiting graph modularity*. arXiv:2006.10782v2. URL: https://arxiv.org/abs/2006.10782
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

Four upgrades over v1 that matter for GSE: generalized graph modularity from NN gradients (finds arbitrary n-ary substructure, e.g. the (v1+v2)/(1+v1·v2) velocity-addition module), Pareto-frontier pruning replacing accuracy thresholds (1–3 orders of magnitude more noise-robust), hypothesis-testing rejection instead of L∞ (robust to bad data points), and normalizing-flow symbolic regression of distributions; needs adaptation since sports structure is regime-based rather than modular-compositional.

## 1. Research question
AI Feynman v1 discovered only two modularity types (symmetry, separability) over four bivariate ops (+,−,×,÷) using ad-hoc NN probes with arbitrary thresholds. Can we (1) discover ARBITRARY graph modularity (any n-ary function composition) from gradient properties of the NN fit, (2) replace all accuracy thresholds with Pareto-optimality (description-length complexity vs inaccuracy), (3) replace L∞ candidate rejection with statistical hypothesis testing, and (4) extend SR to probability distributions known only via samples — and does this yield 1–3 orders of magnitude better noise robustness plus formulas that stumped v1?

## 2. Dataset / schema
Test equations exhibiting various modularity types (Table 4), including the quadruple relativistic velocity-addition equation; probability distributions (Table 5, e.g. n=2, l=1, m=0 hydrogen orbital) with N samples required for discovery recorded; kinetic-energy-vs-(m,v,c) Pareto illustration (Fig. 1). Noise-robustness stress tests: progressively more noise added, tracking how the most-accurate Pareto formula shifts upward in the information plane (Fig. 1 discussion).

## 3. Method / model
Four contributions over v1 (Udrescu & Tegmark 2020):
1. **Generalized graph modularity**: any function = tree graph of basic-function nodes (Fig. 2); train NN on the mystery, examine GRADIENT properties of the fit to discover arbitrary modularity — any n-ary (n=2,3,…) compositional substructure, not just the four bivariate ops. Recursive: e.g. quadruple velocity addition required exploiting generalized symmetry TWICE — first discovering that v1,v2 enter only via (v1+v2)/(1+v1·v2), replacing them with a new variable, then recursing.
2. **Recursive Pareto-optimality** (Sec. 2.2): no accuracy thresholds; maintain Pareto frontier of (description-length complexity, inaccuracy); after each module merge (n1·n2 combinations), prune all Pareto-dominated candidates. Pareto-optimal count grows only logarithmically with total candidates → massive speedup. Final polish: rational→real parameter replacement + gradient-descent optimization, then zero/integer/rational "snaps" of near-integer parameters (Table 1), re-pruning after each step.
3. **Hypothesis-testing rejection** (Sec. 2.2, "Robust speedup"): brute-force tries functions f_k in order of increasing complexity L_d(f_k), keeping those with mean error-description-length d_k = (1/N)Σ_i d_ki below the record; candidates rejected by statistical hypothesis testing rather than L∞ (single bad point no longer kills a candidate).
4. **Normalizing flows for distributions** (Sec. 2.3): flow g maps samples of unknown distribution f to a normal; SR then performed on the estimated density — first SR method for "given samples, find the distribution's symbolic form."
Code: `pip install aifeynman`, https://ai-feynman.readthedocs.io.

## 4. Equations & assumptions
d_k ≡ (1/N) Σ_i d_ki (mean error-description-length of candidate k); Pareto dominance: f_a dominates f_b iff simpler AND more accurate.
Assumptions: (1) truth has exploitable computational-graph modularity; (2) NN gradients reveal modular structure faithfully; (3) description length is the right complexity measure; (4) hypothesis-test rejection preserves true candidates under the noise model; (5) normalizing flow density estimates are accurate enough for downstream SR.

## 5. Features / target
Physics mysteries (multi-variable); distributions from samples. GSE analog: multi-factor efficiency targets; distributions = e.g. the distribution of game outcomes or EPA.

## 6. Validation design
Table 4 test equations with various modularity types (solved/unsolved by v1 vs v2); Table 5 distributions with samples N needed; noise-shift experiments in the Pareto plane; kinetic-energy Pareto-front illustration (convex corners = Einstein's formula and mv²/2 — the method surfaces BOTH the exact and the useful approximation, a feature not a bug).

## 7. Numerical results / baselines
- Noise robustness improved by **1–3 orders of magnitude** over v1 (abstract + Sec. 2.2: r=−1 error-description-length exponent; progressively added noise shifts the best formula "straight upward" in the Pareto plane rather than breaking discovery).
- Discovers "many formulas that stumped previous methods," including via repeated modularity exploitation (velocity addition needed two recursive modularity discoveries).
- Pareto pruning: frontier size grows logarithmically → tractable search over n1·n2 merges.
- Distribution discovery: Table 5 records N samples needed per distribution (exact numbers in table; hydrogen orbital n=2,l=1,m=0 used as illustration).
- Notable qualitative result: the Pareto front for kinetic energy contains both Einstein's exact formula and the classical mv²/2 at convex corners — the method returns the accuracy/simplicity trade-off curve, not a single answer.

## 8. Code / data availability
`pip install aifeynman`; docs at https://ai-feynman.readthedocs.io. Open source.

## 9. Leakage & limitations
- Test equations are physics-chosen for modularity; sports relationships may be modular in different ways (interactions, not compositions) — the gradient-modularity detector could find spurious structure in correlated sports features.
- 1–3 orders noise robustness is claimed vs v1's thresholds, not vs modern baselines (PySR/DSR); head-to-head on noisy data absent.
- Normalizing-flow distribution SR is elegant but untested on heavy-tailed sports distributions.
- Pareto-front output requires a human (or a selector like 1826) to pick the operating point — the paper punts selection.
- Hypothesis-testing rejection details (test choice, α) not fully extracted; risk of over-rejection under misspecified noise.

## 10. GSE overlap
Upgrades 1823's architecture with exactly the robustness properties GSE needs (noise, bad data points — think weather games, backup-QB garbage time). The "return the Pareto front, let convex corners speak" philosophy matches how GSE should present metrics (the mv²/2 lesson: the useful approximation deserves a place next to the exact formula). New capability; no existing GSE Pareto-front SR.

## 11. GSE implementation spec
- Install `aifeynman`; run on nflverse team-game data (target points/drive, 8–12 features) as a complement to PySR: compare its Pareto front against PySR's hall-of-fame.
- Port the two cheapest ideas into the GSE pipeline regardless: (a) hypothesis-testing candidate rejection in PySR's selection (replace hard error cutoffs), (b) Pareto-frontier pruning after every merge/generation step in any evolutionary search.
- Distribution lane: use the normalizing-flow + SR path to discover a closed-form for the distribution of team points per game (or EPA per play) — a publishable "GSE scoring distribution law" artifact.
- Effort: ~2 days to evaluate aifeynman on sports data; ~3 days to port rejection/pruning ideas.

## 12. Reproducible test
Dataset: nflverse team-game 2015–2023 (target points/drive), 2024–2025 held out; inject 5% label noise on a copy of train. Baselines: AI Feynman v1 (threshold-based) vs v2 (Pareto). Metric: whether the discovered equation family is stable across the clean/noisy training copies (structural agreement of top Pareto formulas).

## 13. Acceptance / rejection gate
ADOPT the Pareto-pruning + hypothesis-testing rejection port if v2-style selection yields the same top-3 equation families on clean and 5%-noise-corrupted training data (Jaccard ≥ 0.5 on skeleton sets) while v1-style threshold selection diverges; REJECT if the modularity detector fires on pure-noise features (false-structure test: run on permuted targets — must return only trivial fronts).

## 14. Improvement experiment
"Modularity over regimes, not variables": apply the gradient-based modularity detector to an NN trained per game-SCRIPT cluster (leading/trailing/neutral) and test whether discovered modules differ by regime. If v2's modularity machinery discovers that "the same variables compose differently when trailing," that's a genuinely new sports insight — compositional regime structure — and would justify a GSE-specific fork of aifeynman.

---
Lane: symreg_equation_discovery · Block 1822–1841

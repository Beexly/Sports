# 1051 — Model inference for ranking from pairwise comparisons

## Citation / full-text source

- arXiv:2512.15269v1 — full text: https://arxiv.org/pdf/2512.15269
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 2512.15269v1
- **Full-text URL**: https://arxiv.org/pdf/2512.15269v1
- **Authors**: Daniel Sánchez Catalina, George T. Cantwell
- **Lane**: bayesian_statespace
- **Verdict**: **ADAPT**
- **Replacement chain**: fresh-search replacement for 2512.01723v1 ("Probabilistic Neuro-Symbolic Reasoning for Sparse Historical Data…", Punic Wars/Africa case studies) — the assigned paper was already in `done-ids.txt` (assigned duplicate, not a REJECT verdict).
- **Fresh-search record**: On 2026-09-21 I ran 25 fresh arXiv queries over sports scheduling, tournament design, fixture congestion, and Bayesian rating territory (surviving verbatim records include `site:arxiv.org Bayesian dynamic team strength schedule home advantage sports rating over time` and `arxiv hierarchical Bayesian model team ratings accounting for schedule difficulty sports`). From the deduped candidate pool, 2512.15269v1 was selected because (a) it jointly infers latent skills *and* the win-probability kernel — the exact Bayesian state-space rating problem, (b) it validates on eleven real datasets plus ATP prediction, and (c) it is clear of `done-ids.txt` (verified 2026-09-21, version-stripped ID `2512.15269` = 0 hits). Full query/candidate/dedup audit is in the wave report.
- **Read depth**: FULL READ of the complete v1 PDF text via pdftotext: 9 pages, 575 lines — abstract, EM + belief-propagation formulation, Chebyshev-polynomial and neural-network win-probability kernels, synthetic experiment (1,024 players, 64 matches each), eleven real datasets, ATP 2021–2022 fit / 2023–2024 prediction protocol, conclusions, and full references. Code: https://github.com/gcant/pairwise-comparison-inference
- **Wave**: wave2-reader-19
- **GSE overlap**: None found in phase-one tracker, existing-research-map, or wave-one reports.

## Research question

Standard pairwise-comparison models (Bradley-Terry, Elo) assume the win-probability kernel — usually the logistic — and only infer skills; what if the kernel itself is unknown and must be learned from data?

## Summary

Standard pairwise-comparison models (Bradley-Terry, Elo) *assume* the win-probability kernel — usually the logistic \(P(i \text{ beats } j) = \sigma(s_i - s_j)\) — and only infer the skills \(s\). This paper asks: **what if the kernel itself is unknown and must be learned from data?** It jointly estimates latent skills and an unknown monotone win-probability function using EM plus belief propagation, representing the kernel with either Chebyshev polynomials or a neural network.

Results: on synthetic data (1,024 players, 64 matches each) the method recovers both skills and kernel; on **eleven real datasets** it fits well; and on ATP data — fitting 2021–2022 and predicting 2023–2024 from prior-12-month observations — it produces competitive predictions. Core GSE lesson: **GSE's rating layer inherits the logistic kernel as an untested assumption; learning the kernel from market/observed outcomes can capture sport-specific nonlinearities** (e.g., favorite-longshot asymmetries, diminishing returns to large skill gaps) that a fixed sigmoid misses.

## Method

- EM: E-step runs belief propagation over the match graph to get posterior skill marginals; M-step updates the kernel parameters.

- Prediction protocol: fit on trailing 12 months of ATP results, predict next-season outcomes.

## Equations / assumptions

- Latent skills \(s_i\); win-probability kernel \(p(s_i - s_j)\) unknown, constrained monotone increasing.

- Kernel parametrizations: (i) Chebyshev polynomial expansion of the log-odds curve; (ii) neural network with monotonicity constraints.

## Features / target

Inputs: pairwise match outcomes organized as a match graph over players/teams.

Targets: latent skills \(s_i\) and the monotone win-probability kernel \(p(s_i - s_j)\).

## Validation

Synthetic recovery test: 1,024 players × 64 matches each with a known ground-truth kernel (validates identifiability before touching real data).

Fit quality assessed on eleven real pairwise-comparison datasets (sports and non-sports).

ATP prediction exercise: fit 2021–2022, predict 2023–2024 from prior-12-month observations — strictly chronological, no lookahead.

## Exact results / baselines

Synthetic: the method recovers both skills and kernel.

Eleven real datasets: good fit; ATP: competitive predictions.

Baselines: fixed-logistic Bradley-Terry/Elo — compared on skill RMSE (synthetic recovery) and log-loss (ATP prediction exercise).

Note: the ledger states these headline results qualitatively; no single headline numeric is given in the file.

## Code / data

The ledger records the authors' implementation as public: https://github.com/gcant/pairwise-comparison-inference (stated in the read-depth record).

## Dataset / schema

- Synthetic: 1,024 players × 64 matches each (ground-truth kernel recovery test).
- Eleven real pairwise-comparison datasets (sports and non-sports).
- ATP tour: fit 2021–2022, predict 2023–2024.

## Implementation (GSE adaptation)

1. **Learned win-probability kernel for the rating layer**: GSE's Elo-style ratings feed a fixed logistic into win probabilities. This paper's method lets the data choose the kernel shape per sport. **Implementation**: (a) build the pairwise match graph from NFL game results (or moneyline outcomes vs market); (b) implement EM + belief propagation with a Chebyshev-polynomial kernel (start with the polynomial — cheaper and more interpretable than the NN); (c) compare the learned kernel against the logistic baseline on held-out seasons.
2. **Sport-specific asymmetry detection**: a learned kernel that deviates from logistic at the tails quantifies favorite-longshot bias or chalk compression — directly usable as a calibration correction on GSE's probability outputs.
3. **Code**: the authors' implementation is public (https://github.com/gcant/pairwise-comparison-inference) — port the kernel-learning module, not the whole pipeline.

**Implementation difficulty** (folded in from the original standalone section):

Medium. EM + belief propagation over a season's match graph is standard message-passing code; the Chebyshev kernel keeps the M-step cheap. The NN kernel variant is optional.

## Leakage

- Prediction protocol is strictly chronological (prior-12-month fitting, forward prediction) — no lookahead.
- Synthetic experiment validates identifiability before touching real data.

## Limitations

- Only 9 pages — a compact paper; some implementation details deferred to code.
- Belief propagation is approximate on loopy match graphs; convergence not guaranteed in theory.
- Monotonicity constraints on the NN kernel add tuning complexity.
- Real-data validation is fit-quality plus one ATP prediction exercise — needs GSE's own backtest.

## GSE overlap

None in the tracked corpus. The map inventories Elo, Glicko, TrueSkill, Bradley-Terry, and Plackett-Luce as *known methods* — but every one of them fixes the win-probability kernel a priori. **Joint skill-plus-kernel inference is not covered anywhere in the corpus.** The Drive CQR/conformal work calibrates probabilities after the fact; this paper fixes the kernel at the rating layer, which is upstream and complementary.

## Reproducible test

- Run the authors' code on the synthetic setup (1,024 players, 64 matches each): verify the recovered kernel matches the ground-truth curve and skill RMSE beats a fixed-logistic baseline.
- Refit on ATP 2021–2022 with prior-12-month windows and reproduce the 2023–2024 prediction exercise; check log-loss vs logistic Bradley-Terry.

## Numeric gate

**ADAPT iff the learned kernel beats the fixed logistic on GSE's own backtest: log-loss of kernel-learned win probabilities must be lower than logistic-Baseline Bradley-Terry on at least two held-out NFL seasons (or the ATP-style protocol on another sport GSE prices);** if the learned kernel collapses to logistic, the adaptation adds nothing.

## Improvement experiment

(1) Extend to margin-of-victory by learning a *score-differential* kernel (ordered outcomes, cf. ledger 1052's probit); (2) learn separate kernels per market segment (divisional vs non-divisional, playoff vs regular season) to capture context-dependent nonlinearities; (3) feed the learned kernel's tail deviations into the calibration layer as an explicit favorite-longshot correction. Success criterion: learned-kernel model wins on both log-loss and calibration (ECE) against the fixed-logistic rating on NFL 2022–2025.

## Verdict

**ADAPT** — The kernel is an assumption GSE never tested. Joint EM + belief-propagation inference of skills and win-probability function, validated on 11 real datasets and ATP prediction, gives GSE a principled way to learn sport-specific probability shapes instead of inheriting the logistic. Port the Chebyshev-kernel module and backtest against the fixed-logistic baseline.

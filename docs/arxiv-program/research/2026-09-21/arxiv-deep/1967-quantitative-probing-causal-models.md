# [1967] Quantitative probing: Validating causal models using quantitative domain knowledge (arXiv:2209.03013)

**Citation:** Daniel Grünbaum, Maike L. Stern, Elmar W. Lang (2022). *Quantitative probing: Validating causal models using quantitative domain knowledge*. arXiv:2209.03013. URL: https://arxiv.org/abs/2209.03013
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML; §§1–7, sprinkler example §5.1, simulation §6, outlier analysis §6.4, failing scenarios).
**Verdict:** ADAPT

## 1. Research question
Causal discovery from observational data has no train/test split analogue — how do we know a learned graph + effect estimate is trustworthy? Can *quantitative domain knowledge* (expected values/signs of known non-target causal effects, stated before analysis) be used as "probes" — falsifiable predictions of the model whose hit rate predicts the correctness of both the graph and the target effect estimate?

## 2. Dataset / schema
- Sprinkler demo (Pearl's classic): m=10000 samples, n=5 variables (Season binary-encoded, Sprinkler, Rain, Wet, Slippery), generated with pgmpy; causal discovery via fast greedy equivalence search (FGES) with qualitative domain knowledge (required/forbidden edges, leaving 9 edges to the algorithm); effects via linear regression. Two probes: ATE(Sprinkler→Wet) > 0, ATE(Wet→Slippery) > 0.
- Simulation: 1378 runs; random DAGs with n=7 nodes, p_edge=0.1, random binary CPDs ~ U[0,1], m=1000 samples; p_hint=0.3 (30% of true edges given as qualitative knowledge); p_probe=0.5 of possible treatment-outcome pairs as quantitative probes (nontrivial: directed path must exist); ε_probe=0.1 tolerance. Discovery: FGES; ATEs via linear regression; ground-truth ATEs from interventional simulation.
- Software: networkx, pgmpy, cause2e (causal end-to-end), matplotlib.

## 3. Method / model
Quantitative probing (model-agnostic validation framework):
1. Before analysis, state quantitative expectations about *non-target* causal effects (probes) — any precision: non-zero, sign, threshold, or narrow neighborhood of a value.
2. Run the full causal end-to-end analysis (discovery + target-effect estimation).
3. Reuse the learned graph to identify estimands for the probes; estimate each (here: linear regression coefficients).
4. Compute the hit rate = fraction of probes recovered within ε_probe. Logic of scientific discovery: *failing to falsify* the model on probes increases trust in the target estimate; a failed probe is evidence something (graph, estimation, or the expectations themselves) is wrong.
- Assumptions for validity (§5.2): quantitative knowledge about some effects must exist; probe estimation shouldn't be excessively costly; target and probes must live in the same connected component of the graph (else probes validate the wrong component).

## 4. Equations & assumptions
- Probe hit: |τ̂_probe − τ_probe| ≤ ε_probe counts as success.
- Relative target error: |τ̂ − τ| / τ (nontrivial targets only, no division by zero).
- Graph error: structural Hamming distance (edges present in one graph only + reversed edges).
- No new theorems — the paper is methodological + empirical; "theoretical foundation" for the observed linear hit-rate/error relationship "could not be established" (stated).

## 5. Features / target
Meta-method: inputs are (learned causal graph, observational data, domain-knowledge probes); target is a *validation verdict* (hit rate) on the causal analysis, plus the corrected workflow when probes fail (reexamine graph knowledge → estimation → expectations).

## 6. Validation design
- Sprinkler: correct-knowledge run (target ATE 0.52; probes 0.62 and 0.81, both positive as expected) vs deliberately-flipped-knowledge run (target collapses to 0; probe Sprinkler→Wet = 0, violating expectation → model rejected).
- Simulation: 1378 runs, per-run scatter of hit rate vs (absolute target error, relative target error, SHD); then aggregated means per hit rate (Fig. 3); then outlier analysis (§6.4) and connected-graph filter (653 runs) + further failing-scenario studies.
- No time-ordered splits; cross-sectional simulations.

## 7. Numerical results / baselines
- Sprinkler: correct graph → probes (0.62, 0.81) match expectations, target 0.52 trusted. Flipped knowledge → probe fails (0 vs expected positive), target 0 distrusted. Clean demonstration.
- 1378 simulations: raw scatter shows no trend (visualization artifact — almost all runs have hit rate ≥ 0.8 because many random probe pairs are unconnected and trivially "recovered"). Aggregated means show the expected downward trend: mean absolute/relative target error and mean SHD → 0 as hit rate → 1, "approximately linear" (no theory).
- Outliers: 14 runs with perfect hit rate 1.0 yet absolute target error ≥ 0.2. Root cause: disconnected graphs — probes in one component, target in another (Markov-equivalent structures). Filtering to connected graphs (653 runs) leaves only 4 such runs. Lesson: probes must be in the same connected component as — ideally close to — the target.

## 8. Code / data availability
Code: cause2e at https://github.com/MLResearchAtOSRAM/cause2e; qprobing package at https://github.com/MLResearchAtOSRAM/qprobing (both stated). Simulation recipes fully specified; no downloadable datasets.

## 9. Leakage & limitations
Adversarial notes: (1) Hit rate is probabilistic, not a guarantee — even perfect hit rate had 14/1378 catastrophic failures (4/653 after filtering). (2) Probe selection is the whole game: poorly chosen probes (disconnected component, too easy) inflate confidence; the paper gives heuristics, not an algorithm. (3) Binary CPDs ~ U[0,1] and n=7 are toy-scale; no evidence at d≈35 with continuous sports indicators. (4) Linear-regression estimation of probes assumes the estimand is identified — if the graph is wrong, probe estimates are meaningless in exactly the correlated way the method tries to detect (circularity risk acknowledged via the "reexamine estimation" step). (5) Requires genuine quantitative domain knowledge — GSE must be able to state effect magnitudes, not just directions, for probes to bite.

## 10. GSE overlap
New capability — and the missing QA layer for ledgers 1962–1966. The existing-research map (~/workspace/arxiv-sweep/existing-research-map.md) contains no causal-model validation methodology; GSE currently validates features by predictive lift, never by whether the learned *structure* respects football knowledge. Quantitative probing gives a formal protocol for the domain-sanity checks I already wrote into those ledgers' acceptance gates. Extension, not duplicate.

## 11. GSE implementation spec
- Build a GSE probe suite (versioned YAML): ~25 quantitative probes over team-week indicators with stated expectations, e.g.: ATE(pressure rate +10pp → defensive EPA/play) negative and |effect| > 0.05 EPA/play; ATE(turnover margin +1 → win prob) positive in [0.08, 0.25]; ATE(rest days → offensive EPA) ≈ 0 (null probe — must NOT be "discovered"); sign probes for injury counts → EPA; threshold probes for explosive-play rate → points.
- Pipeline: after each quarterly causal-graph refresh (ledgers 1962–1966), reuse the graph to identify probe estimands, estimate via the same outcome machinery, compute hit rate. Gate: publish graph-derived features/content only if hit rate ≥ 0.8 AND all null probes hold.
- Probe estimation cost is kept low by reusing the learned graph (paper's §5.2 requirement) — one regression per probe.
- Effort: ~2 engineer-days (qprobing/cause2e packages exist; main work is the football probe suite, which needs Garrett/analyst sign-off on the expected values).

## 12. Reproducible test
Dataset: nflverse team-week panel 2015–2023. Protocol: learn NOTEARS graph (ledger 1962) per season-block; compute probe hit rate per block; correlate hit rate with held-out next-season Brier of the graph-pruned model. Expectation (paper's hypothesis): blocks with higher hit rate → lower SHD to a consensus graph and better downstream Brier. Also run the adversarial check: deliberately flip 3 required edges in the domain knowledge and confirm the probe suite's hit rate drops below 0.5 (the sprinkler-flip analogue).

## 13. Acceptance / rejection gate
ADOPT the probe suite as a release gate if: (a) across season blocks, probe hit rate correlates with downstream Brier improvement (Spearman ρ ≤ −0.5, higher hit rate → lower Brier); (b) the flipped-knowledge adversarial test drops hit rate below 0.5 (probes actually discriminate); (c) null probes (expected-zero effects) hold at ≥90% (no phantom causal claims). Reject if hit rate is uncorrelated with downstream performance (|ρ| < 0.3) — then probes are theater, not validation.

## 14. Improvement experiment
Beyond the paper: *adaptive* probe selection — choose the probe set to maximize discriminative power by simulating graph perturbations (edge flips/additions/deletions) and keeping probes whose estimates move most under perturbation (an influence-function ranking). Hypothesis: a 10-probe adaptive suite discriminates good from bad graphs better than a 25-probe hand suite (testable via the adversarial flip test in the gate). Second: use probe failures diagnostically — cluster which probes fail together to localize *where* in the graph the error is (offense vs defense subgraph), turning validation into debugging.

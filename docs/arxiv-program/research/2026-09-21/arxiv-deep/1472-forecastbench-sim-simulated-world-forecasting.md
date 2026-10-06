# [1472] ForecastBench-Sim: A Simulated-World Forecasting Benchmark (arXiv:2606.18686v1)

**Citation:** Lee, J., Merrill, N., & Karger, E. (2026). *ForecastBench-Sim: A Simulated-World Forecasting Benchmark*. arXiv:2606.18686v1 [cs.AI]. URL: https://arxiv.org/abs/2606.18686
**Ledger completed:** 2026-09-21. **Read:** full text (PDF) plus sample-report appendix.
**Verdict:** ADAPT — Freeciv simulated worlds give resolved, intervention-capable forecasting questions (P(Y), P(Y|X), P(Y|do(X))) with 4,655 binary + 2,310 continuous questions; transfers to GSE as a simulator-backed calibration/counterfactual benchmark: resolve engine forecasts against repeated stochastic rollouts of historical game states instead of waiting for real outcomes.

## 1. Research question
Can a simulated world (Freeciv) preserve the basic forecasting structure — partial information, path dependence, interacting agents, hidden future states — while giving the evaluator control over resolution and interventions? The paper builds the benchmark and tests whether model skill on it correlates with real-world forecasting skill (ForecastBench).

## 2. Dataset / schema
Freeciv game rollouts: a report is issued at turn 60; hidden future at turns 90–270 in 30-turn increments (horizons H1–H7); H0 = report-reading check questions. 4,655 binary questions, 2,310 continuous questions, plus 562 H0 binary and 165 H0 continuous checks. Continuous forecasts elicit p10/p25/p50/p75/p90 and are scored with normalized CRPS; binary with Brier score. Supports unconditional P(Y), observational P(Y|X), and interventional P(Y|do(X)) forecasts via savegame mutation. Existing interventions: change government to Republic; add 500 treasury gold. 30 binary models and 31 continuous models evaluated. Human pilot: 10 participants × 24 continuous questions over two worlds (feasibility only).

## 3. Method / model
Benchmark harness, not a model: (1) generate Freeciv worlds with rule-based agents; (2) freeze at turn 60, write a structured report; (3) pose questions about turns 90–270; (4) resolve by rolling out the simulation; (5) for interventional questions, mutate the savegame (do-operator) and re-roll. Scoring: Brier (binary), normalized CRPS from the five elicited quantiles (continuous).

## 4. Equations & assumptions
Standard: Brier = (p − o)²; normalized CRPS from quantile elicitation (exact normalization in paper's appendix). Assumptions: (1) Freeciv dynamics are a valid proxy for "real-world-like" forecasting structure; (2) turn-60 reports give partial but sufficient information; (3) rule-based agents produce realistic path dependence; (4) formatting effects (how questions are posed) don't dominate skill differences.

## 5. Features / target
Inputs: turn-60 world report (+ optional observations/interventions). Targets: binary events and continuous quantities at H1–H7.

## 6. Validation design
Models compared on the fixed question set; the key validation is external: correlation of model rankings on ForecastBench-Sim with rankings on the real-world ForecastBench. Human pilot establishes feasibility, not a baseline.

## 7. Numerical results / baselines
- Curated models: Brier 0.220–0.313; normalized CRPS 0.283–0.590.
- Correlation with real-world ForecastBench: Spearman ρ = +0.43, p = 0.018, N = 30 — modest but significant.
- Correlation with Epoch capability benchmark: |ρ| = 0.48, p = 0.007.
- Horizon degradation: Brier 0.205 at H1 → 0.264 at H7 (peak 0.287 at H5); CRPS 0.134 → 0.639 (4.8×).
- Human pilot too small for a baseline.

## 8. Code / data availability
Benchmark code/questions described as released with the paper (check arXiv page for links). Freeciv is open source.

## 9. Leakage & limitations
- Stylized Freeciv world; fixed rules and rule-based agents — the "realism" of the forecasting structure is asserted, and ρ = 0.43 leaves most variance unexplained.
- Formatting effects: question wording measurably affects elicited forecasts.
- Intervention demos are not fully powered (two interventions only).
- Human pilot is feasibility-scale (10 people).
- Simulated resolution is only as good as the simulator — a bad simulator teaches the wrong calibration lesson.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE's calibration lane covers conformal prediction and probability calibration on real outcomes, but no existing ledger proposes simulator-resolved calibration. This is a new capability: GSE can resolve counterfactual and long-horizon forecasts against a game simulator instead of waiting seasons for outcomes.

## 11. GSE implementation spec
- Data: historical NFL game states (nflverse) + a lightweight game simulator (drive-level Markov or an existing open simulator).
- Build: (a) freeze game states at fixed points (e.g., halftime); (b) pose engine questions (final margin, total, 2H points); (c) resolve by Monte-Carlo rollout of the simulator (1,000+ sims); (d) score engine Brier/CRPS against sim-resolved outcomes; (e) interventional: mutate game state (QB injury, weather shift) and re-ask — tests counterfactual calibration.
- Effort: ~2 weeks (simulator is the main build; the benchmark harness mirrors the paper).

## 12. Reproducible test
Dataset: 2023–2024 NFL halftime states (500+ games). Metric: Brier/CRPS of engine forecasts vs sim-resolved outcomes; calibration curves. Baseline: engine forecasts scored on real outcomes (compare calibration slope sim-resolved vs real-resolved). Window: build on 2023, evaluate 2024.

## 13. Acceptance / rejection gate
ADOPT sim-resolved calibration if engine calibration curves against sim-resolved outcomes match real-outcome calibration within ±0.05 slope on 2024 — then the simulator is a valid fast-resolution proxy. Reject if sim-resolved and real-resolved calibration disagree systematically (simulator is unfaithful).

## 14. Improvement experiment
Use the simulator to generate adversarial game states (rare but high-leverage: 4th-quarter 1-score games, extreme weather) and test engine calibration specifically in the tails — real data has too few such cases to calibrate on, which is exactly where the bankroll lives or dies.

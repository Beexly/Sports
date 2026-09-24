# [1124] Bootstrap Aggregation for Time Series Causal Discovery (arXiv:2306.08946v2)

**Citation:** (authors as listed on arXiv). *Bootstrap Aggregation for Time Series Causal Discovery*. arXiv:2306.08946v2. URL: https://arxiv.org/abs/2306.08946
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, text extracted with pdftotext; full main paper through conclusion read; appendices skimmed for substantive results).
**Verdict:** ADAPT — Bagged-PCMCI+ is a directly usable robustness upgrade for GSE's causal-discovery work on time-series data (momentum, lineup-interaction effects); adopt the bootstrap + majority-vote protocol with the paper's B≥100 guidance, not its uncalibrated confidence interpretation.

## 1. Research question
Can bootstrap aggregation ("bagging") stabilize time-series causal discovery — which is notoriously unstable under autocorrelation and short samples — by resampling, re-running discovery, and aggregating graphs via edge-wise majority vote, with bootstrap edge frequencies as confidence scores?

## 2. Dataset / schema
- **Synthetic structural causal processes**: lagged + contemporaneous links, nonlinearities, non-Gaussian noise, high autocorrelation; varying N (variables), T (sample length), τmax (max lag).
- Also tested with PC and LPCMCI variants (beyond the primary PCMCI+).
- Access: DGP described in paper; no public dataset.

## 3. Method / model
- **Temporally preserving bootstrap**: resample moving-window sample indices (not raw time points), retaining lag structure.
- Each bootstrap run outputs a causal graph; **edge-wise majority voting** aggregates graph types across runs.
- Edge frequencies become **confidence scores** (stability measures, not calibrated probabilities).

## 4. Equations & assumptions
- No novel equations stated. Procedure: for b = 1..B, draw moving-block bootstrap sample, run PCMCI+ → graph G_b; final edge type = majority vote over {G_b}; confidence(e) = frequency of edge e across runs. Assumptions: (a) the moving-block bootstrap preserves the relevant temporal dependence; (b) edge-wise aggregation (which can create cyclic graphs — acknowledged) is acceptable post-processing; (c) discovery-algorithm output is the right unit of aggregation.

## 5. Features / target
- Features: multivariate time series. Target: causal graph (adjacencies + orientations, lagged and contemporaneous).

## 6. Validation design
- Synthetic DGPs across N, T, τmax, autocorrelation regimes. Metrics: adjacency precision/recall, contemporaneous-orientation precision/recall, confidence-frequency MAE. Comparators: single-run PCMCI+, PC, LPCMCI variants.

## 7. Numerical results / baselines
- Bagging improves adjacency and contemporaneous-orientation precision/recall; **gains largest for short samples, many variables, high autocorrelation** — exactly the hard regime.
- **B = 50–200** gave similar broad performance in the example; paper recommends **B ≥ 100**.
- Confidence-frequency MAE: slightly below **3%** for lagged/all links, ~**7%** for contemporaneous links.
- Increasing B from 25 → 500 reduced frequency error ~10% but increased un-parallelized runtime ~**20×**.

## 8. Code / data availability
- None stated in paper (no code link noted in extracted text).

## 9. Leakage & limitations
- **Synthetic-only validation** — no real-data demonstration. **Edge-wise aggregation can create cyclic graphs** (acknowledged; needs a cycle-breaking post-pass for DAG consumers). **Confidence frequencies are stability measures, not calibrated causal probabilities** — do not present them as P(edge is causal). (d) High compute cost (100+ discovery runs; 20× runtime scaling un-parallelized). (e) No code.

## 10. GSE overlap
- Existing-research map: causal inference is an ML-brief commissioned topic (results pending); **Garrett's CEPT is WIP — cite, do not duplicate.** Related ledgers: `0142-the-counterfactual-combine-a-causal-framework.md`, `0265-framing-causal-questions-in-sports-analytics.md`, `0272-causal-mediation-analysis-for-stochastic-interventions.md`, `0771-transfer-learning-for-causal-effect-estimation.md`, plus this wave's 1121 (PPTA) and 1122 (Hi-CI). Bagged-PCMCI+ is the **discovery** complement to those **estimation** papers — a distinct sub-task (graph first, effects second). Extension, not duplicate.

## 11. GSE implementation spec
- **Use case:** discover causal structure in team/season time series — e.g., which lineup-usage, pace, and matchup variables drive EPA; momentum/regime questions; injury→performance pathways.
- **Implementation:** tigramite (PCMCI+ reference implementation) + moving-block bootstrap wrapper; B = 100; edge-wise majority vote; cycle-breaking post-pass (drop lowest-confidence edges in cycles); embarrassingly parallel across bootstrap replicates.
- **Data:** nflverse weekly team-level series (2015–2024); player-weekly series for lineup questions.
- **Effort:** ~2 engineer-weeks.

## 12. Reproducible test
- **Semi-synthetic NFL:** real 2015–2022 team-week series with injected known lagged/contemporaneous links (simulated effects on EPA). Compare bagged-PCMCI+ (B=100) vs single-run PCMCI+ on adjacency F1 and orientation precision; also measure wall-clock cost.

## 13. Acceptance / rejection gate
- **Adopt** if bagged-PCMCI+ beats single-run PCMCI+ on adjacency F1 by ≥10% relative on the semi-synthetic test with contemporaneous-orientation precision ≥ single-run's; **reject** otherwise (if bagging only helps in the paper's synthetic regimes, skip the compute bill).

## 14. Improvement experiment
- **Weighted voting by per-run model fit:** instead of one-graph-one-vote, weight each bootstrap graph by its conditional-independence test p-value profile or BIC score, so low-quality bootstrap draws count less. The paper's majority vote treats all replicates equally; weighting should sharpen confidence frequencies and reduce the cyclic-graph problem (weak edges get downweighted before aggregation). Test whether weighted voting improves orientation precision at fixed B.

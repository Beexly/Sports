# [1970] Causal Inference in Non-linear Time-series using Deep Networks and Knockoff Counterfactuals (arXiv:2109.10817)

**Citation:** Wasim Ahmad, Maha Shadaydeh, et al., Friedrich Schiller University Jena (2021). *Causal Inference in Non-linear Time-series using Deep Networks and Knockoff Counterfactuals*. arXiv:2109.10817. URL: https://arxiv.org/abs/2109.10817
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML; abstract, §§I–V, method §IV, experiments §V-A/B, conclusion).
**Verdict:** ADAPT

## 1. Research question
Granger causality assumes linear dependence; deep networks capture nonlinearity but can't handle missing/out-of-distribution interventions needed for counterfactual causal analysis. Can probabilistic forecasting (DeepAR) combined with in-distribution knockoff samples as intervention variables detect *nonlinear* causal links in multivariate time series, with controlled false discovery rate?

## 2. Dataset / schema
- Synthetic: multiple realizations, each of length r=200; nonlinear coupling with nonlinearity coefficient β between X_2 and X_4 varied across experiments; prediction length T=14.
- Real: average daily river discharges, upper Danube basin (Bavarian Environmental Agency); expected links known from hydrology; heavy-rainfall extreme events violate stationarity.
- Metrics: FPR = FP/(FP+TN); F-score = TP/(TP + 0.5(FP+FN)).

## 3. Method / model
DeepAR-Knockoffs:
1. Train a DeepAR network (LSTM-based autoregressive RNN; here 4 layers × 40 cells, dropout 0.05–0.1, 150 epochs) for probabilistic forecasting of the multivariate series.
2. For each candidate cause X_i, generate knockoff samples X̃_i (Barber & Candès 2015): statistically null variables, independent of the output given observed variables, exchangeable with X_i without changing the data distribution — i.e., *in-distribution* interventions the network can process.
3. Counterfactual forecast: substitute X_i with its knockoff, forecast, and compute the causal significance score CSS_{i→j} = ln(MAPE_j^i / MAPE_j) — log ratio of forecast error with vs without the intervention.
4. Hypothesis test on the distribution of CSS_{i→j} across realizations; reject null (no causal link) if mean CSS significantly > 0.
- Knockoffs serve double duty: valid in-distribution counterfactuals AND FDR control (knockoffs hold minimal correlation with the candidate variable).
- Baselines compared: VAR-GC (linear Granger), PCMCI with GPDC (nonlinear CI test), and two ablation substitutions — out-of-distribution (DeepAR-OutDist) and distribution-mean (DeepAR-Mean).

## 4. Equations & assumptions
- CSS_{i→j} = ln(MAPE_j^i / MAPE_j) (eq. in §IV).
- FPR = FP/(FP+TN); F-score = TP/(TP+0.5(FP+FN)) (eqs. 7–8).
- Assumptions (stated): stationarity of the multivariate series; causal sufficiency (no hidden confounders). Knockoff exchangeability per Barber–Candès.

## 5. Features / target
Inputs: raw multivariate time series (no hand engineering — "lesser hand-crafted feature engineering"). Target: binary causal-link decisions per ordered variable pair (nonlinear Granger causality), via the CSS hypothesis test.

## 6. Validation design
- Synthetic: F-score and FPR vs nonlinearity coefficient β; multiple realizations.
- Real (Danube): expected-link recovery; comparison of detected links across methods against hydrological knowledge.
- Baselines: VAR-GC, PCMCI(GPDC), DeepAR-OutDist, DeepAR-Mean. No train/test split in the ML sense — evaluation is link-recovery against known graphs; no time-ordered splits (realizations are the replication unit).

## 7. Numerical results / baselines
- Synthetic (Figs. 2–3): DeepAR-Knockoffs best F-score across β, beating VAR-GC (linearity assumption fails) and PCMCI/GPDC. DeepAR-OutDist "suffers from a high false discovery rate" and lowest F-score; DeepAR-Mean middle. FPR: VAR-GC high; DeepAR-OutDist high (out-of-distribution bias); PCMCI, DeepAR-Mean, DeepAR-Knockoffs all well-controlled.
- Danube real data: VAR-GC and PCMCI report false links (stationarity violated by extreme rainfall events); DeepAR-Knockoffs "correctly discovers the expected links ... except a single false link."
- Cost caveat (paper): "better performance ... comes along with the higher computational load associated with using deep networks specially for large multivariate time series."

## 8. Code / data availability
No code link stated. Danube data from Bavarian Environmental Agency (public agency data). DeepAR is standard (GluonTS implements it); knockoffs via the knockpy/knockoff packages.

## 9. Leakage & limitations
Adversarial notes: (1) Assumes stationarity AND causal sufficiency — the two assumptions ledgers 1964/1965 exist to relax; applying this to raw team-week data without regime handling repeats the Danube failure mode the paper itself documents. (2) Granger causality ≠ true causality (predictive precedence); contemporaneous links not addressed. (3) DeepAR training cost at d≈35, many realizations — the paper warns about large multivariate series. (4) Knockoff quality depends on the sampler; Gaussian knockoffs on non-Gaussian sports data may break exchangeability. (5) MAPE-based CSS is scale-sensitive; near-zero baselines (e.g. turnover rates) inflate scores. (6) No public code — reimplementation from §IV required.

## 10. GSE overlap
New capability — the nonlinear time-series discovery arm. Ledger 1963 (PCMCI+) handles nonlinearity only via GPDC, which the PCMCI paper itself says is "orders of magnitude" slower and degrades in high dimensions; this paper's DeepAR-Knockoffs is the scalable nonlinear alternative and *beat* PCMCI(GPDC) head-to-head on nonlinear data. The existing-research map (~/workspace/arxiv-sweep/existing-research-map.md) has nothing on knockoff-based causal discovery. Complements 1963 (linear/fast CI tests) and 1969 (feature selection) — this is the method to *find* nonlinear lagged drivers. Extension, not duplicate.

## 11. GSE implementation spec
- Data: nflverse team-week panel; per-team-season series (T≈18) are short for DeepAR — instead train ONE global DeepAR over all team-seasons pooled (DeepAR is designed for related-series global modeling), with team embeddings.
- Targets: next-week values of key indicators (EPA components, pressure rates); candidate causes = all indicators at lags 1–4.
- Knockoffs: Gaussian knockoffs per indicator (or deep knockoffs if non-Gaussianity is severe); substitute one indicator at a time; CSS = ln(MAPE_with_knockoff / MAPE_baseline) per team-season; test mean CSS > 0 (t-test, FDR-corrected across pairs).
- Architecture: start smaller than the paper (2 layers × 40 cells) given T=18; prediction length 1–2 weeks (not 14).
- Output: nonlinear lagged-driver set → feeds the feature-selection pipeline (ledger 1969) as the nonlinear candidate pool.
- Effort: ~5 engineer-days (GluonTS DeepAR + knockpy exist; work is panel setup + CSS testing harness).

## 12. Reproducible test
Dataset: team-week panel 2015–2023 (train DeepAR + learn links), 2024–2025 (evaluate). Protocol: learn DeepAR-Knockoff links on 2015–2023; compare against PCMCI+ ParCorr links (ledger 1963) and GPDC links. Metrics: (a) F-score on synthetic sports-like nonlinear series with known ground truth (generate with known β-style nonlinearities); (b) on real data, stability of discovered links across season splits (Jaccard ≥ 0.5); (c) downstream: outcome model with knockoff-discovered nonlinear drivers vs PCMCI+ drivers on 2024–2025 Brier.

## 13. Acceptance / rejection gate
ADOPT DeepAR-Knockoffs as the nonlinear discovery arm if: (a) on synthetic nonlinear sports-like data it beats PCMCI+ParCorr F-score by ≥0.1 (replicating the paper's margin); (b) real-data link Jaccard across season splits ≥ 0.5; (c) the knockoff driver set improves or matches the 2024–2025 Brier of the PCMCI+-only driver set within 0.002 while adding ≥5 nonlinear-only drivers. Reject if (a) fails (no nonlinearity dividend — stick with PCMCI+) or training cost exceeds 4 GPU-hours per refresh (not worth it quarterly).

## 14. Improvement experiment
Beyond the paper: replace the paper's stationarity assumption with a *regime-conditioned* DeepAR — train one global DeepAR with a regime indicator (from ledger 1964's Γ(t)) as a covariate, then run knockoff counterfactuals *within* regimes. Hypothesis: regime-conditioned knockoffs will kill the Danube-style false links (extreme-event regimes get their own dynamics) while preserving true nonlinear drivers — testable on synthetic data with injected regime shifts, where plain DeepAR-Knockoffs should show the paper's own documented failure mode and the regime-conditioned variant should not.

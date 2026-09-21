# [0462] Boldness-Recalibration for Binary Event Predictions (arXiv:2305.03780v3)

**Citation:** Guthrie, A. P., Franck, C. T. (2023). *Boldness-Recalibration for Binary Event Predictions*. arXiv:2305.03780v3. URL: https://arxiv.org/abs/2305.03780v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3006 lines).
**Verdict:** ADAPT — the "maximize sharpness subject to a calibration posterior-probability constraint" framing is a principled upgrade over blind Platt/temperature scaling for GSE's publishable probabilities, but only if re-fit on rolling out-of-sample windows and gated on log-loss/CLV, not on extremization alone.

## 1. Research question
Given a set of binary-event probability forecasts, can we *recalibrate* them to be as **bold** (sharp, high-variance, "far from the base rate") as possible while remaining statistically calibrated — formalized as maximizing prediction standard deviation subject to a Bayesian posterior probability of calibration exceeding a threshold — using the two-parameter Linear-in-Log-Odds (LLO) recalibration family?

## 2. Dataset / schema
- **Real:** 868 FiveThirtyEight NHL game win probabilities, 2020–21 season; home-win base rate 0.53; original forecast range 0.26–0.78, SD 0.091.
- **Synthetic comparator:** 868 draws from Uniform(0.26, 0.77) as a random-noise forecaster baseline.
- **Simulation study:** n ∈ {30, 100, 800, 2000, 5000} × 100 Monte Carlo replicates; true-probability noise σ ∈ {0, 0.1, 0.5, 1, 2}; forecaster archetypes hedger/boaster/biased; recalibration function correctly specified (LLO) and misspecified (Prelec); 17,500 total sets. Optimization success rates: 99.4% (95% B-R), 99.2% (90%), 98.7% (80%).

## 3. Method / model
- **LLO recalibration family:** c(x; δ, γ) = δx^γ / [δx^γ + (1−x)^γ] (paper's Eq. 2; shift δ, shape/scale γ).
- **Bayesian calibration check:** Bernoulli likelihood of outcomes given recalibrated probabilities (Eq. 5); Bayes factor via BIC approximation comparing the recalibrated model against the saturated (perfectly calibrated) alternative; equal prior probabilities 1/2 each; posterior probability of calibration P(M_c | y) (Eqs. 6–9).
- **Boldness-recalibration:** maximize SD of recalibrated predictions subject to P(M_c | y) ≥ t, for t ∈ {0.95, 0.90, 0.80} (Eq. 10); MLE recalibration (unconstrained maximizer of the likelihood) reported as a reference.
- Selection among local optima: keep the optimum with largest SD.

## 4. Equations & assumptions
Paper's equation spine: LLO function c(x;δ,γ) (Eq. 2); Bernoulli likelihood L(δ,γ|y) (Eq. 5); Bayes factor BF via BIC (Eq. 6–7); posterior calibration probability P(M_c|y) = [1 + BF⁻¹]⁻¹ under equal priors (Eq. 8–9); the boldness optimization max SD s.t. posterior ≥ t (Eq. 10). Prelec function used for misspecification study (Eq. 11); simulation DGP for true probabilities (Eq. 12). Stated assumptions: outcomes are independent Bernoulli trials; BIC is an adequate approximation to the marginal likelihood (large-sample); equal prior model probabilities (1/2) are appropriate; the LLO family is flexible enough to capture the true miscalibration shape; in-sample fitting is acceptable for the demonstration. The "posterior probability of calibration" is model-dependent — it measures belief in the LLO-saturated comparison, not calibration in any absolute sense.

## 5. Features / target
- **Input:** a vector of pre-existing binary-event probability forecasts (FiveThirtyEight NHL game win probabilities).
- **Target:** game outcome (home win = 1); recalibrated probabilities that are simultaneously bolder and probably-calibrated.
- Horizon: single-game pre-match forecasts; no temporal structure modeled.

## 6. Validation design
- **Real data:** apply B-R to the 868 NHL forecasts; report posterior calibration probability, SD, Brier score, ECE, AUC for original / MLE / 95% / 90% / 80% B-R variants.
- **Simulation:** factorial over sample size, noise level, forecaster archetype, and correct/misspecified recalibration family; 100 replicates per cell; 17,500 sets total. Metrics: how often B-R improves the Brier score and ECE vs the original, and optimization success rate.
- **No out-of-sample evaluation:** recalibration is fit and assessed on the same 868 games (in-sample) — the paper's central empirical weakness.

## 7. Numerical results / baselines
Paper's Table 2 (exact):
| Forecaster | Post. prob. | SD | BS | ECE | AUC | δ̂ | γ̂ |
|---|---|---|---|---|---|---|---|
| Original | 0.9904 | 0.091 | 0.236 | 0.052 | 0.65 | — | — |
| MLE | 0.9988 | 0.124 | — | — | — | 0.95 | 1.40 |
| 95% B-R | 0.9500 | 0.165 | — | — | — | 0.87 | 1.96 |
| 90% B-R | 0.9000 | 0.169 | — | — | — | — | 2.01 |
| 80% B-R | 0.8000 | 0.173 | — | — | — | — | 2.07 |
(Blank cells were not reported in the extracted table.) Headline: boldness-recalibration roughly doubles forecast SD (0.091 → 0.165–0.173) while holding posterior calibration probability at the chosen threshold, on a dataset where the original forecaster was already very likely calibrated (0.9904). Simulation: B-R improves Brier score and ECE over the original in the large majority of the 17,500 sets; optimization succeeded in 99.4%/99.2%/98.7% of cases. All numbers are the paper's claims.

## 8. Code / data availability
None stated in the extracted text (FiveThirtyEight historical forecasts are publicly retrievable independently).

## 9. Leakage & limitations
- **In-sample everything:** the recalibration parameters are selected and evaluated on the same 868 games; there is no walk-forward or held-out test, so the reported Brier/ECE improvements are optimistic.
- **Independence assumption:** games treated as independent Bernoulli trials; in the NHL (and NFL) outcomes have schedule/clustering structure the likelihood ignores.
- **BIC approximation:** the posterior calibration probability rests on BIC's large-sample asymptotics; at n=30–100 (simulation cells) this is shaky, and the threshold t inherits that shakiness.
- **Arbitrary priors:** equal 1/2 model priors are a convenience, not a substantive choice; results move with them.
- **The demonstration is too easy:** the original 538 forecasts were already calibrated (posterior 0.9904), so pushing them outward was nearly free — the paper does not show B-R rescuing a badly miscalibrated forecaster.
- **Optimization failures:** ~0.6–1.3% of simulation sets failed (separation/degenerate likelihoods), a real production hazard.
- **Extremization risk:** maximizing SD subject to a calibration constraint deliberately pushes probabilities toward 0/1; under the wrong threshold this manufactures overconfidence that log-loss would punish — the paper's own metric set under-reports this because evaluation is in-sample.

## 10. GSE overlap
Per `existing-research-map.md`, GSE's calibration stack covers temperature scaling, Platt scaling, isotonic regression, and Venn-Abers — all of which recalibrate *toward* the empirical curve without any sharpness objective. Boldness-recalibration is an **extension**: it adds a principled "be as decisive as calibration allows" objective on top of the same LLO/Platt-style machinery. It is not a duplicate of anything in the map. The natural GSE use is post-processing engine probabilities before publication (X cards, edge sheets), where decisiveness has audience value but miscalibration has monetary cost.

## 11. GSE implementation spec
- **Data:** GSE engine backtest probabilities (spread-cover, moneyline-implied, totals) vs realized outcomes, 2020–2025 NFL seasons.
- **Adaptation:** fit LLO (δ, γ) per market on a rolling window (e.g., trailing 2 seasons / ~500 games), maximizing prediction SD subject to posterior calibration probability ≥ 0.90 — but **evaluate strictly out-of-sample** on the next season/slate (fixing the paper's in-sample flaw). Fall back to plain MLE-LLO if the constrained optimization fails (separation guard).
- **Serving:** recalibration parameters versioned per market and refreshed weekly; applied as a final transform before probabilities are published or fed to Kelly sizing.
- **Gating metric:** out-of-sample log loss and CLV, not SD — boldness is the objective, but log-loss/CLV improvement is the acceptance criterion (guards against manufactured overconfidence).
- **Effort:** 1–2 engineer-weeks to implement + backtest harness.

## 12. Reproducible test
Walk-forward on 2020–2024 NFL seasons: for each season Y, fit 90%-threshold B-R LLO on seasons Y−2..Y−1 engine moneyline probabilities, apply to season Y, and compare out-of-sample log loss and Brier score against (a) raw engine probabilities and (b) unconstrained MLE-LLO. Also compute the SD ratio (B-R SD / raw SD) to verify the method actually increases sharpness. Baseline to beat: MLE-LLO on log loss; B-R must match-or-beat it on log loss while achieving higher SD.

## 13. Acceptance / rejection gate
**Adopt** B-R as the publication-layer recalibrator iff, across the 5 walk-forward seasons, 90%-threshold B-R achieves out-of-sample log loss ≤ MLE-LLO log loss (within 0.001) AND mean SD ≥ 1.15× raw SD AND no season shows ECE degradation > 0.01 vs raw. **Reject** (keep plain MLE-LLO/temperature scaling) if B-R loses on log loss in ≥2 of 5 seasons or if optimization failures exceed 2% of weekly refits — extremization without a proper-score gain is just marketing.

## 14. Improvement experiment
Extend the paper in the direction it avoids: replace the BIC posterior with a **fully out-of-sample calibration check** — select (δ, γ) to maximize SD subject to the constraint that a *held-out* reliability test (e.g., the LRD/dashboard statistic from 2207.13770, already in GSE's stack) passes at 95%. Test whether this "out-of-sample boldness" variant beats the paper's BIC-constrained version on walk-forward log loss; if it does, GSE gets the paper's sharpness benefit with an honest calibration guarantee the original lacks.

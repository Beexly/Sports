# [1488] ICM Ensemble with Novel Betting Functions for Concept Drift (arXiv:2406.15760v1)

**Citation:** Charalambos Eliades, Harris Papadopoulos (2024). *ICM Ensemble with Novel Betting Functions for Concept Drift*. arXiv:2406.15760v1. URL: https://arxiv.org/abs/2406.15760
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, all sections 1–6, Theorems 1–4, Lemmas 1–3, Algorithms 1–2, Tables 1–5, Figures 1–8, references).
**Verdict:** ADAPT
adapt the single-ICM (not the full 10-classifier ensemble) as a statistically-valid drift monitor over GSE's engine pick/residual stream, with the CAUTIOUS betting function; the 10-classifier retraining machinery is overkill for a weekly-prediction setting.

## 1. Research question
How can concept drift (a change in the data-generating distribution that degrades classifier accuracy) be detected online with valid probabilistic guarantees, and can novel betting functions inside an Inductive Conformal Martingale (ICM) detect drift faster than prior ICM variants and state-of-the-art stream classifiers? The paper extends the authors' CAUTIOUS betting function with multiple density estimators (interpolated histogram + kNN) and evaluates single-ICM and 10-ICM-ensemble configurations on 4 benchmark datasets.

## 2. Dataset / schema
- **STAGGER** (synthetic, via MOA framework): 1,000,000 instances, 3 categorical attributes, binary label, sudden drift among 4 concepts every 10,000 examples (99 drifts); tested with 0% and 10% label noise.
- **SEA** (synthetic, via MOA): 1,000,000 instances, 3 numeric attributes (uniform on [0,10]), binary label (sum of first two ≤ threshold), 4 concepts, drift every 250,000 examples (3 drifts); 0% and 10% noise.
- **ELEC** (real): 45,312 instances at 30-min intervals from the Australian NSW electricity market; binary label (price rise vs drop vs 24h moving average); predictors used: nswprice, nswdemand, transfer, vicprice, vicdemand (time/date/day/period excluded).
- **AIRLINES** (real): 539,383 US flight records (Oct 1987–Apr 2008), 7 features, binary label (delayed or not).
- Access: synthetic via https://github.com/Waikato/moa/releases; ELEC via OpenML id=151; Airlines via OpenML id=1169. Schema: standard tabular stream (feature vector + binary label, time-ordered).

## 3. Method / model
Inductive Conformal Martingale (ICM) drift detection. Each new example zⱼ=(xⱼ,yⱼ) gets a nonconformity score αⱼ = A(zⱼ, training set) (here αⱼ = −p̃ⱼ, the negative posterior of the true label from the underlying classifier) and a smoothed p-value pⱼ = (|{αᵢ>αⱼ}| + Uⱼ·|{αᵢ=αⱼ}|)/(j−k), Uⱼ∼U(0,1). The martingale Sₙ = Πᵢ₌₁ⁿ fᵢ(pᵢ) is updated online; by Ville's inequality, Sₙ ≥ C rejects exchangeability at significance 1/C. Novelty 1: **CAUTIOUS betting function** hₙ — abstains (hₙ=1) unless the best retrospective windowed profit max over k of Sⁿ⁻¹/min Sⁿ⁻ᵏ exceeds threshold ε=100 (window W=5000); otherwise bets with density estimator fₙ. Novelty 2: **multi-estimator extension** — track M estimators (interpolated histograms with κ∈{5,10,15} bins; kNN density estimators with k∈{5,10,15}), abstain unless the best estimator's windowed profit > ε, then bet with the argmax estimator. Novelty 3: **10-ICM ensemble** — 10 treebaggers (40 trees each) trained on θ∈{100,…,1000} staggered instances; each runs its own ICM; on drift alarm (S>1/δ, δ=0.01) the affected classifier stops predicting and retrains on instances from d=max{j:Sⱼ<r}+1 (r∈{2,10,100}) onward; final prediction = majority vote, so other classifiers cover false-alarm gaps. Three betting-function variants tested: CAU (15-bin histogram + cautious), IH (single 15-bin interpolated histogram + cautious), MIH (multi interpolated histogram κ=5,10,15 + cautious), MIHNN (MIH + 3 kNN estimators).

## 4. Equations & assumptions
- p-value: pⱼ = (|{αᵢ∈Hⱼ : αᵢ>αⱼ}| + Uⱼ·|{αᵢ∈Hⱼ : αᵢ=αⱼ}|)/(j−k), Uⱼ∼U(0,1). (Eq. 1)
- Martingale: Sₙ = Πᵢ₌₁ⁿ fᵢ(pᵢ); online update Sₙ = Sₙ₋₁·fₙ(pₙ); log-scale for precision. (Eq. 2)
- Betting-function constraint: ∫₀¹ fᵢ(p)dp = 1, fᵢ ≥ 0 ⇒ E[Sₙ₊₁|S₀…Sₙ] = Sₙ under exchangeability (Proposition 1, proved).
- Ville's inequality: P(∃n: Sₙ ≥ C) ≤ 1/C; Sₙ=100 ⇒ reject exchangeability at 1%.
- Theorem 1: under uniform p-values, any betting function f≠1 gives S∞≡0 a.s. (LLN + Jensen on concave ln). Theorem 2: same for sequences converging uniformly to f≠1. (Justifies abstaining when evidence is weak.)
- CAUTIOUS: hₙ(x) = 1 if Sⁿ⁻¹/minₖSⁿ⁻ᵏ ≤ ε else fₙ; ε=100, k∈{1,…,min(W,n−1)}, W=5000. (Eq. 4)
- Multi: hₙ = 1 if maxⱼ Sⁿ⁻¹ʲ/minₖSⁿ⁻ᵏʲ ≤ ε else fₙᵐ, m=argmaxⱼ (windowed profit ratio). (Eq. 6)
- Interpolated histogram: f̂ₙ(cⱼ) = nⱼ·κ/(n−1), bin centers cⱼ=(2j−1)/(2κ); linear interpolation between centers, constant outside [c₁,cκ]; bin count κ reduced until no empty bins; integrates to 1 (Lemma 2, proved via rectangle+trapezoid areas). (Eqs. 7–9)
- kNN density: f̂(x) = min(n−1,k−1)/(n·L(Rₖ(x))), L(Rₖ(x)) = min(1−x,Rₖ(x)) + min(x,Rₖ(x)). (Eqs. 10–11)
- Alarm rule: raise alarm when Sᵢ > 1/δ (δ=0.01 ⇒ S>100). (Algorithm 1)
- Hypothesis-test procedure for comparing accuracies: one-sided Z-test on aggregate means with perfect-negative-correlation (ρ=−1) assumption to make rejection harder; critical value Z₀.₉₅=1.645 (Lemma 3 + steps).
- Assumptions: (1) exchangeability of the training window ⇒ i.i.d. (de Finetti); (2) p-values uniform under no drift; (3) the underlying classifier's posterior is a meaningful nonconformity measure; (4) retraining window instances post-drift are from the new distribution (incremental/gradual drift can poison this); (5) θ∈{100…1000} and ensemble size 10 chosen by computational convenience, not optimized.

## 5. Features / target
Paper is a drift-detection method study; the underlying classifiers are treebaggers on the datasets' native features. Target of the ICM layer: binary alarm (drift / no drift) at 1% significance; the ensemble's target: the original binary class labels (accuracy + availability-of-predictions are the reported metrics).

## 6. Validation design
No train/validation/test split in the ML sense — online streaming evaluation: initial training block, then sequential prediction with drift-triggered retraining. Metrics: classification accuracy (5 simulations averaged) and number of instances with unavailable predictions (during retraining gaps). Baselines: the authors' own CAU [6] and ICM-Ensemble [7], plus state-of-the-art AWE [8], DWM-NB [10], ARFHT [13] (SOTA numbers taken from [33]/[14], not re-run; note [14] used 1 simulation and 100k STAGGER instances vs this paper's 5 simulations). Hypothesis tests (Sec. 5.3) compare betting functions pairwise and vs SOTA. Time-ordered by construction (streams).

## 7. Numerical results / baselines
Quoted exactly from Table 4 (10-ICM ensemble, r=10; STAGGER/SEA at 10% noise):
| Dataset | ICM-E* (this paper) | ICM-E [7] | CAU [6] | AWE | DWM-NB | ARFHT |
|---|---|---|---|---|---|---|
| STAGGER | 0.949 | 0.949 | 0.946 | 0.948 | 0.901 | 0.949 |
| SEA | 0.920 | 0.917 | 0.915 | 0.879 | 0.876 | 0.841 |
| ELEC | 0.768 | 0.767 | 0.759 | 0.756 | 0.800 | 0.857 |
| AIRLINES | 0.651 | 0.640 | 0.602 | 0.618 | 0.640 | 0.666 |
Paper's claims: ICM-E* matches/beats prior ICM work everywhere; statistically significantly better than all competitors on SEA (p≈0); beats CAU and DWM-NB on STAGGER (p≈0); beats CAU and AWE on ELEC; on AIRLINES dominates all but ARFHT; on ELEC loses to DWM-NB (0.800) and ARFHT (0.857). Betting-function shootout (Table 3, r=10, 10% noise): MIHNN best on STAGGER and SEA (p≈0 vs others); on ELEC, MIH > MIHNN (p=2.36%); on AIRLINES, MIH best (p<1% vs all), CAU worst (outperformed by all, p≈0). Single-classifier Table 1 (r=100): STAGGER 0% noise MIHNN 0.999; ELEC MIHNN 0.762 vs CAU 0.748; AIRLINES MIHNN 0.618 vs CAU 0.591. Ensemble-size study: 10 classifiers is the "safe choice" — near-optimal accuracy with the fewest unavailable predictions across all datasets.

## 8. Code / data availability
"Code Availability: The custom code developed during this study is available upon request." No repo link. Datasets public via MOA and OpenML (links in §6 Declarations).

## 9. Leakage & limitations
- SOTA baselines (AWE, DWM-NB, ARFHT) are quoted from [33]/[14] with different simulation counts and sample sizes — not a controlled re-run; the hypothesis-test "15-decimal precision" comparison against rounded published numbers is over-precise theater.
- The ρ=−1 "perfect negative correlation" assumption in the hypothesis tests is arbitrary and inflates/deflates SE in unexamined ways; accuracy differences are tiny (e.g., 0.949 vs 0.948) and likely within simulation noise despite the tests.
- Retraining on post-alarm instances assumes sudden drift; under gradual/incremental drift the retraining window mixes distributions (authors acknowledge this for ELEC/AIRLINES where smaller r hurt).
- kNN-alone "generally lowers performance and often fails to detect many changes" — it only works inside the cautious multi-estimator wrapper.
- θ and ensemble size are admitted guesses ("very difficult to calculate an optimum"); the 10-classifier "safe choice" conclusion is pragmatic, not optimal.
- External validity to NFL: the method watches a *classification* stream with immediate labels; GSE's predictions resolve weekly and the interesting drift (market regime, rule changes, season boundaries) is slow — the martingale needs many p-values to accumulate evidence, so detection latency on ~17-observation NFL seasons may be poor.
- No regression/probabilistic-output treatment; nonconformity via classifier posterior only.

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md, GSE's calibration/uncertainty lane covers CQR, grouping loss, temperature/Platt/isotonic scaling, Venn-Abers, Mondrian and cross-conformal, Clopper-Pearson intervals, reliability diagrams — but nothing on *online* validity monitoring or drift detection. The 2026-09-18 ML research brief lists "continuous learning loop" and "online learning" as commissioned topics with results not yet in repo. This paper is a NEW capability: a distribution-free, significance-calibrated tripwire for model decay. Extension, not duplicate. Natural fit: the conformal-prediction audit work (cqr.ts coverage bug found 2026-09-21) shows GSE already thinks in conformal terms — ICM is the streaming cousin.

## 11. GSE implementation spec
1. Build a lightweight ICM monitor (Python, new `gse-lab/drift/` or Sports repo `models/drift/`): maintain a calibration window of recent engine outputs (e.g., last 2 seasons of game-level predictions with resolved outcomes).
2. Nonconformity score for probabilistic picks: α = 1 − p̂(y_true) (one minus predicted probability of the actual outcome) — the direct analogue of the paper's −p̃ⱼ; or Brier residual |y − p̂|.
3. p-values via the smoothed rank formula (Eq. 1) against the calibration window; betting function = single interpolated histogram (κ=15) with the CAUTIOUS wrapper (ε=100, W=5000); update Sₙ weekly as games resolve.
4. Alarm at Sₙ > 100 (1% significance): triggers (a) a recalibration job (re-fit Platt/isotonic on the recent window), (b) an analyst alert, NOT automatic model replacement — weekly cadence is too slow for the paper's automatic retraining loop.
5. Separate ICM streams per market (SPREAD/MONEYLINE/TOTAL) since drift regimes differ (totals drift with rule/pace changes; spreads with market efficiency).
6. Effort: ~2 days; no new data needed (engine picks table + results already exist).

## 12. Reproducible test
Dataset: GSE engine historical picks with resolved outcomes (2024–2026 seasons), ordered by game date. Metric: (a) does the ICM alarm fire within ±3 weeks of known regime breaks (2024 kickoff-rule change; any season boundary)? (b) false-alarm rate on within-regime stretches (target ≤ 1 alarm per season at the 1% level). Baseline to beat: a naive rolling-accuracy CUSUM on the same stream — accept if ICM detects the kickoff-rule break earlier or with fewer false alarms. Time-ordered by construction.

## 13. Acceptance / rejection gate
ADAPT if the offline replay fires an alarm within 3 weeks of the 2024 kickoff-rule change on the TOTALS stream with ≤1 false alarm per season on 2024–2026 data — then deploy the monitor as a weekly cron job feeding the recalibration queue. Reject if alarms are dominated by noise (≥3 false alarms/season) or if detection latency exceeds 6 weeks (too slow for a 17-game season) — in that case keep periodic scheduled recalibration instead of martingale-triggered.

## 14. Improvement experiment
Beyond the paper: replace the classifier-posterior nonconformity with a *market-relative* nonconformity score: α = |p̂_engine − q_market| (absolute gap between engine probability and de-vigged market probability) on games the engine "bets" (posted picks). The ICM then tests exchangeability of the *edge distribution*, not raw accuracy — it fires exactly when GSE's edge regime changes (the thing that actually costs money), which the paper's accuracy-based formulation cannot isolate. Hypothesis: market-relative ICM detects edge decay (e.g., market catching up to a GSE angle) 2–4 weeks before accuracy-based ICM, because the market moves before results accumulate.

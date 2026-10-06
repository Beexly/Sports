# [0718] Selective Time Series Forecasting via Metalearning (arXiv:2606.23448v1)

**Citation:** Ricardo Inácio, Vitor Cerqueira, Marília Barandas, Carlos Soares (2026). *Selective Time Series Forecasting via Metalearning*. arXiv:2606.23448v1. URL: https://arxiv.org/abs/2606.23448v1
**Ledger completed:** 2026-09-21. **Read:** full text via local cache /tmp/arxiv750-cache/fulltext/2606.23448.txt (225 lines, full: abstract, §2, §3 methodology, §4 setup, §5 results tables/figures, §6 discussion/limitations, references).
**Verdict:** ADAPT — the meta-regressor (structural lag-window features → error percentile) is a pre-forecast triage gate directly usable for GSE's pre-game model screen; it beats interval-width and residual heuristics and transfers zero-shot.

## 1. Research question
Can a metalearning metamodel predict, *before the forecast is issued*, whether a global deep forecaster will incur a large error at a given forecast origin — using only structural features of recent lags, with scale-invariant targets so the rejection mechanism transfers across domains?

## 2. Dataset / schema
M3, M1, Tourism univariate collections, monthly (h=6) and quarterly (h=4) frequencies; context p=2h. E.g., M3-M: 1428 series, avg len 117, 26,126 windows; Tourism-M: 366 series, avg len 298, 17,750 windows. Source→target pairs: M3→M1, M1→Tourism. Errors computed with sMAPE. Second half of each series used for evaluation (first half warm-up).

## 3. Method / model
Two-stage: (1) rolling-origin performance estimation on the source domain — for each origin t, fit forecaster fθ on all obs ≤ t, forecast h steps, compute e_{i,t} = loss(Ŷ_{t+1:t+h}^i, Y_{t+1:t+h}^i); (2) metamodel training: target u_{i,t} = #{j∈T_i, j≠t: e_{i,j}<e_{i,t}} / (|T_i|+1), the empirical percentile rank of the error within its own series (scale-invariant, in (0,1)); predictors m_{i,t} = g(X_t^i), TSFEL statistical/temporal/spectral features of the lag window (trend, seasonality, lumpiness, complexity). Metamodel: CatBoostRegressor (30 random-search configs, grouped CV by series). Rejection: û_{i,t} ≥ q → abstain, at coverage ≈q. Two modes: zero-shot and domain-adapted (fine-tune on 30% of target origins). Forecasters: KAN and NHITS via NeuralForecast (10 random-search trials).

## 4. Equations & assumptions
- u_{i,t} = #{j∈T_i: j≠t, e_{i,j} < e_{i,t}} / (|T_i|+1) — per-series percentile, bounded (0,1).
- Selective predictor (f,s)(x) = f(x) if s(x)=1 else ⊥; coverage φ(s)=P(s(X)=1); risk R(f,s)=E[l(f(X),Y) | s(X)=1].
- Evaluation: risk-coverage curves; AUCO (distance to oracle curve); ErrDrop = no-rejection risk / most-selective risk.
- Assumptions: representative meta-training data; per-series percentiles comparable across domains; enough history for feature extraction (p=2h lags).

## 5. Features / target
Input: TSFEL feature vector of lag window (statistical/temporal/spectral descriptors). Target: empirical error percentile. Rejection fraction q ∈ {0.05, 0.10, 0.20, 0.30, 0.40}.

## 6. Validation design
In-domain holdout (final horizon per series); zero-shot transfer to target; domain-adapted transfer; sequential-deployment simulation on target (adapt on early windows, calibrate threshold, test on held-out). Baselines: PI-width (conformal-style, MAD-normalized), residual-scale (MAD of recent sMAPE), residual-variance (Student-t width), random, oracle (realized sMAPE). Series-level bootstrap for significance.

## 7. Numerical results / baselines
(quoted exactly)
- Meta-level: in-domain Spearman ρ between predicted and realized error percentile 0.71–0.90; smallest AUCO, closest to oracle. Zero-shot transfer: ρ drops (e.g., M3-M→M1-M KAN 0.628, NHITS 0.571); domain adaptation recovers (0.820 / 0.812).
- Base-level (sMAPE kept, domain-adapted metamodel): T-M KAN keep-all 0.288 → 0.215 at q=0.40 (avg oracle gap 0.033, lowest of all methods); PI-width avg gap 0.089, residual-var 0.093; PI width *worse than random* near coverage 0.5. T-Q KAN: 0.272→0.180 (gap 0.021 vs PI-width 0.071). M1-Q: KAN 0.143→0.042 (gap 0.019).
- Series-level bootstrap: metamodel significantly closer to oracle than all baselines in all settings except residual-scale for M1-Q/NHITS (p=0.191).
- "Uncertainty is not equivalent to forecasting risk: wide intervals do not necessarily imply large errors."
- The metamodel operates ex ante — rejection decided before invoking the forecaster (pre-forecast triage), unlike interval/residual baselines.

## 8. Code / data availability
Code: https://github.com/ricardoinaciopt/selective_forecasting_metalearning. Data: public (M3, M1, Tourism).

## 9. Leakage & limitations
- Paper's own: heavy reliance on representativeness of meta-training data; short series degrade the mechanism; targets are relative risk, not calibrated probabilities — no formal uncertainty guarantees; baselines are all recently-incurred-residual heuristics (may under-represent literature); no multivariate/irregular series.
- Reproduction caveat: grouped CV by series is load-bearing for the ρ numbers; leakage across origins within a series would inflate them.

## 10. GSE overlap
New capability: GSE's abstention signals are all forecast-derived (BALToR 0714) or model-internal (MC-Dropout 0716). This is a *pre-forecast triage* — predict the pick's error percentile from structural features of the input window (line movement shape, injury flags, rest, spread volatility), before the engine even runs. That ex ante property is new in the corpus and operationally valuable (screen weekly slate before expensive model runs). The "relative risk, not calibrated probability" limitation means it pairs with, not replaces, the calibration lane.

## 11. GSE implementation spec
1. Build CatBoost meta-regressor: for each historical pick, target = percentile rank of |realized error| within its league/season; features = structural descriptors of the pre-game window (spread movement stats, total movement, days since last game, injury count, back-to-back flag, line sharpness proxy).
2. Gate: predicted error percentile ≥ q → withhold from posting (or flag for manual review); q calibrated to a target posting coverage (e.g., 0.80).
3. Run the paper's zero-shot/adapted protocol: train meta-regressor on NFL, evaluate on NBA/MLB; adapt with 30% of the target league's history.
Effort: 3–5 days + TSFEL-equivalent feature engineering.

## 12. Reproducible test
Dataset: engine picks 2023–2025 with pre-game features. Meta-regressor vs baselines: interval-width analogue (|upper−lower| of the engine's CI) and recent-residual MAD. Pass if, at q=0.20 rejection, kept-pick hit rate improves vs keep-all AND meta-regressor beats both baselines on the held-out league (zero-shot or adapted), with Spearman ρ ≥ 0.4 between predicted percentile and realized error.

## 13. Acceptance / rejection gate
ADOPT if held-out meta-level ρ ≥ 0.4 and kept-pick hit rate at 80% coverage improves ≥1.5 pp over keep-all with the metamodel beating the interval-width baseline. REJECT if transfer ρ collapses below 0.3 on the held-out league — the transferability claim is the whole point.

## 14. Improvement experiment
Combine this with 0716: use MC-Dropout variance as an *additional* meta-feature alongside structural features — the paper didn't test hybrid forecast-derived + structural inputs. Second: test whether percentile targets within-league (rather than within-series) improve transfer, since GSE's "series" are teams and league context matters.

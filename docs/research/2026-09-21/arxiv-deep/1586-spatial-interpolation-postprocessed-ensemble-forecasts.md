# [1586] Statistical versus machine learning-based spatial interpolation of post-processed ensemble weather forecasts (arXiv:2609.07512)

**Citation:** Lakatos, M. (2026). *Statistical versus machine learning-based spatial interpolation of post-processed ensemble weather forecasts*. arXiv:2609.07512. URL: https://arxiv.org/abs/2609.07512
**Ledger completed:** 2026-09-21. **Read:** full text (25-page PDF, v1, Sections 1–5 + references; note ar5iv redirects to the arXiv abs page for this paper, so the PDF was read).
**Verdict:** ADAPT
ADAPT — one sentence: The study proves that the best post-processing model at observed stations (EMOS-L) is the worst at unobserved ones, while regional, semi-local, and ML models transfer well — a directly actionable rule for GSE's 30-stadium problem (calibrate stadium-specific models, but design them to interpolate to domed/outdoor venue types via regional/semi-local pooling), plus an altitude-aware linear pool (ALP) that improves combinations at new locations.

## 1. Research question
How do statistical (EMOS-R/C/L, boosted EMOS) vs ML (DRN, GraphSAGE GNN, Transformer) post-processing methods for ECMWF 2-m temperature and 10-m wind speed compare at observed vs unobserved stations, and can an altitude-aware linear pool (ALP) improve forecast combination at unobserved locations?

## 2. Dataset / schema
- 50-member ECMWF ensemble (TIGGE archive, 0.5° Europe), 48 h lead, issued daily 00 UTC; observations from DWD; Germany; 3 Jan 2007 – 31 Dec 2016.
- 99 temperature / 182 wind-speed stations with complete records; 70% observed (train), 30% unobserved (test).
- Predictor sets: non-extended (ensemble mean/SD + station metadata + day-of-year; 41 T2M / 46 WS variables in extended) vs extended (all Chen et al. 2024 covariates).

## 3. Method / model
- EMOS-R/C/L: Gaussian (T2M) / truncated normal (WS) with affine links μ = a + b²f̄, σ = c² + d²S (Eq. 1), minimum-CRPS; semi-local = k-means on climatology + error features (8–10 clusters).
- Boosted EMOS (R crch): automatic feature selection for the extended feature set.
- DRN (MLP), GraphSAGE GNN (Haversine ≤ 50 km edges, mean aggregation, fixed graph), Transformer (self-attention across stations, no fixed graph) — all output Gaussian/TN parameters by minimizing closed-form CRPS; 10 replications each.
- Standard linear pool (SLP): F^(w) = wΦ((y−μ1)/σ1) + (1−w)Φ((y−μ2)/σ2), w estimated by minimum-CRPS on a 60-day rolling window; ALP: separate w per altitude group (<300 m, 300–700 m, ≥700 m), each unobserved station gets its group's weight.
- Rolling training: ML 3283 d; EMOS-R 30 d, EMOS-L 450 d, EMOS-C 30 d (T2M); boosted variants 450/3283/450 d.
- Metrics: CRPSS, MAES, RMSES vs DRN baseline; coverage + width of 96.08% intervals; rank histograms + reliability index (RI); Diebold–Mariano tests.

## 4. Equations & assumptions
- EMOS links: μ = a + b²f̄, σ = c² + d²S (Eq. 1).
- ALP: F_ALP,t,s(y) = ŵ_t,g(s)F_1,t,s(y) + (1 − ŵ_t,g(s))F_2,t,s(y), g(s) ∈ {1,2,3}.
- DM test: t_N = √N (S̄_F − S̄_G)/σ̂; skill score SS = 1 − S_model/S_ref; RI = Σ|ρ_r − 1/(K+1)|.
- Assumptions: exchangeable members; Gaussian/TN families; altitude groups are homogeneous; station assignments to clusters via Euclidean feature distance; rolling windows capture non-stationarity.

## 5. Features / target
Features: ensemble moments, auxiliary NWP variables, station metadata (coords, altitude, orography), seasonal terms. Target: calibrated predictive distribution (μ, σ) of T2M / WS at observed and held-out stations.

## 6. Validation design
2007–2016 rolling training with 2016 as verification (WS) / Mar–Dec 2016 (T2M); 10 replications of ML and clustering fits; DM significance tests; coverage at nominal 96.08%; separate observed/unobserved scoreboards.

## 7. Numerical results / baselines
- All post-processing beats the raw ensemble by wide margins (raw coverage ~59% → 92–98%).
- T2M (Table 1–3): EMOS-L best at observed (CRPSS 14.7 vs DRN) but worst at unobserved (negative skill, largest generalization gap); EMOS-R best at unobserved (lowest mean CRPS); Transformer the only ML model positive at unobserved on the non-extended set; extended set: Transformer best at observed, DRN/Transformer competitive at unobserved; GNN-Geo degrades badly at unobserved (oversmoothing; Feldberg at 1,490 m is a failure case — geographical graph ignores elevation).
- WS (Tables 5–7): EMOS-C best at unobserved (small but significant CRPSS; better on 59.2% of days, 86.0% with extended set); boosted EMOS wins in "difficult situations with larger raw ensemble errors"; EMOS-L again fails to transfer; GNN-Geo gets lowest RI on extended-set unobserved.
- Coverage (96.08% nominal): T2M EMOS-R unobserved 94.97%; WS unobserved: DRN 95.40% (non-extended), GNN-Geo 92.57% / EMOS-C 97.91% (extended) — ML intervals sharper (width ~4.3–5.7 m/s vs EMOS ~6.3–6.5).
- ALP vs SLP (T2M): ALP best in all three component combinations at observed; lowest CRPS in 2/3 at unobserved; significantly beats SLP in all three at unobserved.

## 8. Code / data availability
No code link in the paper. Data: TIGGE archive (ECMWF), DWD Climate Data Center, Chen et al. (2024) dataset.

## 9. Leakage & limitations
- Properly rolling/held-out design; unobserved stations never trained on — the paper's core design strength.
- Single model (ECMWF), one country (Germany), one lead time (48 h).
- ALP tested only for temperature (TN-mixture CRPS has no closed form for wind speed — skipped).
- GNN graph is naive geography (≤50 km Haversine) — the elevation failure case shows the limitation is in the graph design, not GNNs per se.
- No extreme-event analysis; averages only.

## 10. GSE overlap
Directly relevant to GSE's stadium problem: 30 stadiums are "observed" training points, but GSE must also forecast for venue types/stadium situations it has less history on (new stadiums, bowl-geometry variants) — exactly the interpolation problem this paper benchmarks. The finding that regional and semi-local models transfer while local models don't gives a concrete design rule: build stadium-calibrated models with semi-local pooling (like 1581's recipe but pooled), and use ALP-style altitude/terrain-aware combination when blending forecast components at a venue. The Transformer result also echoes 1582's finding that attention over ensemble members is the strongest ML architecture.

## 11. GSE implementation spec
- Build `weather/interpolation.py` following the paper's unobserved-station protocol: train the LGBM/EMOS weather models (1581, 1585) on 24 stadiums, validate on 6 held-out stadiums; prefer regional + semi-local fits and the Transformer/DRN architecture for the interpolating model.
- Implement ALP for temperature forecast combination across GSE's models: group stadiums by elevation band (<300 m / 300–700 m / ≥700 m — Denver alone in the high group), fit separate linear-pool weights per group on a rolling 60-day window, apply to new venues by group.
- Fix the GNN lesson: if using graph structure over stadiums, build edges on elevation + bowl geometry + climate similarity, not pure geography.

## 12. Reproducible test
Dataset: GEFS/HRRR + NOAA observations at 30 NFL stadiums, 2022–2024. Protocol: 24 observed / 6 unobserved (rotate); models EMOS-R/C/L, DRN, Transformer, GNN-geo vs GNN-climate; SLP vs ALP (elevation groups). Test: 2024 holdout; metrics CRPSS vs raw, coverage of 90% intervals, DM tests. Gate below.

## 13. Acceptance / rejection gate
ADOPT if semi-local or regional models beat local models by ≥ 5% CRPSS on the 6 unobserved stadiums, replicating the paper's transferability gap — then adopt the pooling design rule. REJECT the rule only if local stadium models transfer fine on US data (then keep per-stadium local models), but still report the experiment.

## 14. Improvement experiment
The paper's open direction: ALP for wind speed (skipped because TN-mixture CRPS has no closed form). Implement ALP for wind speed with numerical CRPS (the paper says it's possible but costly) or with a Gaussian-on-log-wind transformation, grouped by stadium elevation + bowl openness — testing whether the altitude-aware combination idea works for the variable GSE cares about most. Second: replace the naive geographical GNN graph with a stadium-similarity graph (elevation, bowl openness, climate zone, turf) and re-run the observed/unobserved benchmark — directly addressing the paper's own failure-case analysis.

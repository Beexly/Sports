# [1587] A Composite-Loss Graph Neural Network for the Multivariate Post-Processing of Ensemble Weather Forecasts (arXiv:2509.02784)

**Citation:** Lakatos, M. (2025). *A Composite-Loss Graph Neural Network for the Multivariate Post-Processing of Ensemble Weather Forecasts*. arXiv:2509.02784. URL: https://arxiv.org/abs/2509.02784
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, Sections 1–6 + references, ~765 lines).
**Verdict**: ADAPT
ADAPT — one sentence: The dualGNN (GraphSAGE trained on a weighted ES + variogram-score composite loss) beats every ECC/Schaake-shuffle two-step method on both case studies while keeping marginals calibrated, giving GSE a proven one-step recipe for producing spatially coherent joint weather scenarios across all 30 stadiums in a single forward pass, though the training data appetite (530 days) is larger than anything GSE currently archives.

## 1. Research question
Can a graph neural network trained with a composite loss (energy score + variogram score) do multivariate post-processing — calibrated marginals AND realistic spatial dependence — in one step, better than the standard two-step approach (univariate calibration + ECC/Schaake-shuffle reordering)?

## 2. Dataset / schema
- Solar irradiance: WRF v4.4.2 8-member, 3 km, 48 h hourly; 18 stations Atacama/Coquimbo, Chile; 2021; target = 8-member ensemble directly.
- Visibility: ECMWF IFS (control + 50 exchangeable), 30 SYNOP stations Germany/Czech/Poland; 2020–2021; 20 lead times 6–120 h; 84 WMO discrete categories; CAMS covariates.
- References: censored-normal EMOS (irradiance), POLR classifier (visibility), MLP (Baran et al. 2025), ECC (raw rank order), SSh (historical rank order), MLP-GNN hybrid, GNN-CRPS, GNN-ES variants.

## 3. Method / model
- dualGNN: GraphSAGE with mean aggregator; graph edges by distance threshold chosen to minimize CRPS (50 km irradiance, 100 km visibility); 1 hidden SAGEConv layer (1024 units) irradiance / 2 (64 units) visibility; batch norm, ReLU, dropout 0.2; output dimension = K ensemble members directly (non-parametric — no distributional assumption).
- Loss: ℒ = w₁·ES + w₂·VS, w₂ = 1 − w₁, with VS normalized by mean(ES)/mean(VS) over the raw ensemble; irradiance best at 0.9 ES / 0.1 VS; visibility best at 0.3 ES / 0.7 VS (and lowest mean CRPS among dual variants).
- Training: up to 500 epochs, early stopping (patience 15 irradiance / 10 visibility), validation 0.3, batch 64, lr 0.03, one model for all lead times, 10 replications; training windows 30 d (irradiance) / 530 d (visibility); PyTorch Geometric.
- Metrics: ES, VS₀.₅, sample CRPS, coverage/width of central intervals, multivariate rank histograms (average, band-depth, energy, dependence pre-ranks), DM tests with Benjamini–Hochberg correction.

## 4. Equations & assumptions
- Sample CRPS: CRPS(F̂_K,y) = (1/K)Σ|f_k − y| − (1/2K²)ΣΣ|f_k − f_ℓ|.
- ES: ES(F̂_K,y) = (1/K)Σ‖f_k − y‖ − (1/2K²)ΣΣ‖f_k − f_ℓ‖.
- VS_p: ΣᵢΣⱼ ωᵢⱼ(|y⁽ⁱ⁾−y⁽ʲ⁾|^p − (1/K)Σ_k|f_k⁽ⁱ⁾−f_k⁽ʲ⁾|^p)², p = 0.5, ωᵢⱼ = 1.
- ECC: f̃_k⁽ᵈ⁾ = f̂_{π_d(k)}⁽ᵈ⁾ (reorder calibrated quantiles to raw rank order π_d).
- Assumptions: exchangeable members; ωᵢⱼ = 1 (no distance weighting); distance-threshold graph chosen by CRPS; single model across lead times; nominal coverage α = 2/(K+1) for K-member ensembles.

## 5. Features / target
Irradiance features: ensemble mean, zero-irradiance frequency, variance, lat/lon/elevation, lead time. Visibility features: control, member mean/SD, category proportions (<5 km, 5–30 km, 30–70 km), CAMS forecasts, annual sine/cosine, lat/lon/elevation, lead time. Target: K-member calibrated ensemble (8 / 51) per case.

## 6. Validation design
Time-ordered (25 d rolling MLP / 80 d semi-local EMOS / 30 d GNN irradiance; 350 d POLR / 530 d GNN visibility); 10 replications; DM tests with BH correction; multivariate rank histograms; separate univariate and multivariate scoreboards.

## 7. Numerical results / baselines
- Solar irradiance (daylight hours, >7.5 W/m²): dualGNN ranks #1 on ES and VS — beats GNN-ES by 4% (ES) and 5.2% (VS) on average; beats MLP-ECC in 88.46% of DM cases (never worse); beats MLP-SSh in 76.92%; EMOS variants outperformed in 96–100% of cases. Univariate CRPS as % of raw: EMOS 51.62%, MLP 42.57%, dualGNN 42.85%, GNN-ES 43.23%, GNN-CRPS 40.79%. Adding VS did NOT hurt ES — it improved both.
- Visibility: dualGNN #1 on VS (beats GNN-ES by 5%; beats POLR-SSh in 70% of DM cases, matches otherwise); ES only 0.4% above GNN-ES (effectively tied); univariate CRPS: GNN-CRPS 62.90%, dualGNN 63.69% vs POLR 64.92% — dualGNN even beats the strongest calibrated reference univariately.
- Coverage: visibility 90% intervals — GNN models deviate ~1% from nominal vs 2% POLR, 51% raw; dualGNN has the most uniform multivariate rank histograms.
- Key side finding: dualGNN's own rank structure (MLP-GNN hybrid) beats raw-ensemble and historical rank structures as a dependence template — the GNN learns real spatial dependence, not just marginals.

## 8. Code / data availability
No code link. Data: Chilean National Weather Service climatology portal (irradiance); ECMWF IFS + SYNOP (visibility); CAMS.

## 9. Leakage & limitations
- Properly time-ordered; hyperparameters chosen by CRPS then evaluated on ES/VS — a mild selection bias acknowledged via the trade-off analysis.
- Data hunger: 530-day training for visibility; "would likely benefit from additional training data."
- Graph construction is crude (distance threshold); "finer graph structures may be more appropriate"; no distance weighting in VS.
- w₁/w₂ chosen empirically per dataset — no universal rule (0.9/0.1 vs 0.3/0.7).
- ES–VS histograms suggest slight overestimated correlation in the energy/dependence pre-ranks.
- Two niche variables (irradiance, visibility); wind/temperature/precipitation not tested.

## 10. GSE overlap
The multivariate engine the stack needs. All other papers in this wave calibrate one variable at one location; GSE's real product is a joint weather scenario across 30 stadiums (a cold front hits Buffalo and Foxboro together — totals across the Sunday slate are correlated). dualGNN is the only method in the wave that produces coherent multi-stadium ensembles in one pass, and its VS-in-the-loss trick is transferable to any loss GSE trains with. Pairs with 1586's interpolation findings (graph over stadium-similarity, not geography) and 1583's conformal layer.

## 11. GSE implementation spec
- Build `weather/dualgNN.py`: GraphSAGE over 30 stadium nodes, edges by stadium-similarity (per 1586's lesson: elevation + bowl + climate, not raw distance); outputs = K-member joint ensembles of (temp, wind, precip) at all stadiums; loss = w₁·ES + w₂·VS₀.₅ with VS normalized by mean(ES)/mean(VS); grid w₁ ∈ {0.1, 0.3, 0.5, 0.7, 0.9}.
- Train on GEFS reforecasts + METAR observations (2+ years, acknowledging the data-hunger caveat); early stopping on validation ES.
- Feed the joint ensemble into 1583's conformal layer per stadium for coverage guarantees.

## 12. Reproducible test
Dataset: GEFS 30-member reforecast, 30 NFL stadiums, 2021–2024. Baselines: per-stadium EMOS/DRN + ECC, per-stadium EMOS/DRN + Schaake shuffle, GNN-CRPS, GNN-ES. Test: 2024 holdout; metrics ES, VS₀.₅, per-stadium CRPS, multivariate rank histograms, DM tests with BH correction. Gate below.

## 13. Acceptance / rejection gate
ADOPT if dualGNN beats the best two-step (EMOS/DRN + ECC) on VS by ≥ 3% with per-stadium CRPS no worse — the paper's effect size is 5%, so 3% is a conservative transfer bar. REJECT if VS gain < 3% on US stadium data — then use per-stadium models + ECC and keep only the VS-in-loss trick as a training idea.

## 14. Improvement experiment
The paper's two open directions, fused: (1) use a stadium-similarity graph (elevation, bowl openness, climate zone, turf type) instead of the crude distance-threshold graph and test whether VS improves on the distance baseline — the paper admits the graph is the weak point; (2) run the interpolation experiment the authors left for future work — train dualGNN on 24 stadiums, generate joint ensembles at 6 held-out stadiums (combining 1586's protocol with 1587's architecture), testing the claimed "up to 20% improvement for certain stations" figure directly on the venue types GSE actually needs.

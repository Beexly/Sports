# [1588] A Convolutional Neural Network-based Ensemble Post-processing with Data Augmentation for Tropical Cyclone Precipitation Forecasts (arXiv:2409.09607)

**Citation:** Chen, S.-W., Juang, J., Wang, C., Chang, H.-L., Hong, J.-S., & Hsiao, C. K. (2024). *A Convolutional Neural Network-based Ensemble Post-processing with Data Augmentation for Tropical Cyclone Precipitation Forecasts*. arXiv:2409.09607. URL: https://arxiv.org/abs/2409.09607
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 16 pages, Sections 1–5 + discussion + conclusions + references).
**Verdict**: ADAPT
ADAPT — one sentence: The three add-on tricks (temporal-interpolation data augmentation for fast-moving storms, dynamic TC-relative distance features, and recency-weighted CRPS loss) are the transferable payload — GSE rarely deals with tropical cyclones, but the augmentation recipe directly addresses its own small-sample problem (only ~1 hurricane-type game per stadium per decade) and the recency weighting fixes an acknowledged flaw in every paper in this wave that weights training data equally regardless of when it was issued.

## 1. Research question
Can a CNN post-processor trained on only 15 six-hourly reports of a single tropical cyclone (Typhoon Soudelor, Taiwan 2015) predict 24-h accumulated precipitation per grid better than the raw ensemble or an FCN, using data augmentation, geographical/dynamic features, and time-weighted loss?

## 2. Dataset / schema
- Study area: Taiwan rectangle 21.375–25.525°N, 119.55–123°E; 5,880 grids at 0.05° (84×70), 1,294 land grids (623 plain, 671 mountain).
- Inputs: 20 WEPS (WRF Ensemble Prediction System, CWA Taiwan) members, 24-h cumulative precipitation, 6-hourly.
- Features: 20 members + lon/lat/altitude + dynamic (TC center lon/lat, grid-to-TC distance, TC-passed indicator) = 25 predictors.
- Truth: radar QPE (QPESUMS) 24-h accumulations; 15 reports (00/06/12/18 UTC, Aug 5–9 2015); reports 6–11 (landfall period) are the heavy-rain evaluation set.
- Data not shareable (permission withheld by CWA).

## 3. Method / model
- CNN-all: 25 predictor layers over 84×70 grids → 2×2 conv kernels → 32 feature maps → grid-specific μ̂ and σ̂ output layers; Gaussian assumption with analytical CRPS loss (Gneiting et al. 2005 / Rasp & Lerch 2018 formulation); softplus activation, Kaiming init; 100 epochs, lr 0.001; Python 3.9 / PyTorch 1.12.
- Baselines: FCN (Rasp & Lerch 2018) with unequal weights, plain CNN (members only), CNN-dyn (members + geo/dynamic features), CNN-aug (members + augmentation).
- Three innovations: (1) data augmentation preserving grid identity — linear interpolation between consecutive reports (N−1 new reports) plus noise injection (total 2×(2N−1) reports, e.g. indices {1, 1n, 1.5, 1.5n, 2, 2n, …}); (2) geographical (lon/lat/altitude) + dynamic (TC-relative distance) features; (3) recency weights in the CRPS objective — 1:2:4 for three training reports, 1:1:2:2:4:4 with augmented reports (Juang et al. 2022).

## 4. Equations & assumptions
- CRPS(F,y) = ∫_{−∞}^{∞}[F(q) − F_y(q)]²dq; closed-form for N(μ,σ²): CRPS = σ·{z·(2Φ(z) − 1) + 2φ(z) − 1/√π}, z = (y−μ)/σ.
- CRPSS vs reference = Gaussian(ensemble mean, ensemble variance).
- Report-k training uses only reports with index < k (no future leakage within the storm).
- Assumptions: Gaussian predictive distribution per grid; spatial stationarity of CNN kernels; interpolated and noise-injected reports are exchangeable with real ones; terrain effect captured only by altitude (terrain-locking NOT captured — see limitations).

## 5. Features / target
Features: 20 WEPS members, lon/lat/altitude, TC center lon/lat, grid–TC distance, TC-passed indicator, report-time weights. Target: per-grid Gaussian (μ, σ) of 24-h accumulated precipitation.

## 6. Validation design
Within-storm sequential: train on reports < k, evaluate reports 6–11 (heavy rain, including landfall report 9). Boxplots of CRPSS vs ensemble-mean/variance Gaussian reference; probability maps of P(precip > 200 mm); reliability diagrams. Plain (alt < 500 m) vs mountain grids separated.

## 7. Numerical results / baselines
- CNN-all: best of five models on CRPSS — larger positive CRPSS with smaller variation across reports 6–11 (heavy rain and beyond, plain grids); all four CNNs mostly positive CRPSS (better than raw ensemble).
- Reliability: CNN-all curve closest to observed frequencies for P(precip > 200 mm) in reports 7–10 (325/457/475/318 grids > 200 mm); ensemble members and FCN over-predict (probabilities > observed frequency).
- Spatial pattern: CNN-all captures observed spatial structure better than Members and FCN in probability maps (reports 7–10).
- Ablation: CNN-dyn and CNN-aug each improve on plain CNN; CNN-all best overall.
- Caveats: FCN beats all four CNNs on mountain grids in some reports (Report 9, landfall in Hualian at 20:40 UTC — terrain-locking); Gaussian reference beats post-processing for light/very light rain.

## 8. Code / data availability
No code link. Data not shareable (CWA permission withheld); metadata available from Taiwan CWA Typhoon Database.

## 9. Leakage & limitations
- Training is sequential within the storm (proper), but results are ONE storm — generalizability unproven.
- CNN kernels smooth out terrain-locking: mountain grids worse than FCN in landfall report; authors explicitly recommend grid-specific models.
- The 24-h accumulation design means observations arrive a day late — not deployable for real-time forecasting as designed; authors suggest shorter accumulation periods.
- Gaussian reference better for light rain; only the >80 mm regime benefits.
- 6-hourly forecasts double-count as data; 3-hourly would double the data — the data hunger of deep post-processors is an acknowledged constraint.

## 10. GSE overlap
GSE's rare-extreme problem is this paper's small-sample problem in a different costume: ~1 hurricane-type game per stadium per decade, but the kick-time total hinges on the tail. The augmentation trick (temporal interpolation + noise injection between consecutive lead times) is directly applicable to GSE's limited archived extreme-weather cases — interpolating between consecutive forecast issuance times to multiply rare-event training examples. The recency-weighted CRPS (1:2:4 weights favoring recent reports) is a fix every other paper in this wave omits: all train on equal weights regardless of forecast issuance age. Dynamic features (storm-relative distance) map to GSE's need for front-relative features (distance to cold-front boundary) in temperature/wind downscaling (1584).

## 11. GSE implementation spec
- Build `weather/extreme_augment.py`: (1) temporal-interpolation augmentation — between consecutive GEFS/HRRR issuance times, linearly interpolate ensemble member fields at rare-event cases (hurricane games, ice storms, >2 inch snow games), then noise-inject; (2) recency-weighted CRPS loss with weights 1:2:4 on the three most recent issuance times when post-processing game-day forecasts.
- Feed the augmented rare-event set into 1580's ANET2 or 1581's LightGBM post-processor as additional training examples; evaluate whether tail thresholds (10/15 m/s wind, >10 mm precip) improve per 1585's weakness.

## 12. Reproducible test
Dataset: GEFS reforecasts, ~30 historical extreme-weather NFL games (1980–2024, precipitation/wind tail events). Train post-processor with and without temporal-interpolation augmentation. Test: hold-out 10 extreme games; metrics: CRPS at tail thresholds (Brier score > 10 mm precip, > 15 m/s wind), reliability diagrams. Gate below.

## 13. Acceptance / rejection gate
ADOPT if augmentation improves Brier score at tail thresholds by ≥ 5% on hold-out extreme games — the paper's CNN-all shows qualitatively dominant tail performance, so 5% is the transfer bar. REJECT if no gain — interpolation between issuance times is domain-dependent (TC movement is fast but smooth; a front stall is discontinuous), and GSE drops it without cost.

## 14. Improvement experiment
Fix the paper's mountain-grid failure: design a grid-specific variant (stadium-specific post-processors conditioned on bowl openness and elevation — the 1586 finding) trained WITH the augmentation, testing whether the failure was the CNN kernel smoothing or the shared parameters. The paper suggests this but doesn't test it. Second: test augmentation on the 1585 dual-resolution wind tails, where truncated-normal EMOS is weakest — a direct test of whether augmentation fixes tail calibration.

# [0091] Deep Learning Head Model for Real-time Estimation of Entire Brain Deformation in Concussion (arXiv:2010.08527)

**Citation:** Xianghao Zhan, Yuzhe Liu, Samuel J. Raymond, Hossein Vahid Alizadeh, August G. Domel, Olivier Gevaert, Michael Zeineh, Gerald Grant, and David B. Camarillo (2020). *Deep Learning Head Model for Real-time Estimation of Entire Brain Deformation in Concussion*. arXiv:2010.08527v2. URL: https://arxiv.org/abs/2010.08527
**Ledger completed:** 2026-09-21. **Read:** full text (PDF extract, 797 lines; ar5iv HTML did not render).
**Verdict:** REJECT — strong biomechanics paper, but concussion-strain modeling has no path into GSE's game-outcome prediction engine.

## 1. Research question
Can a deep neural network act as a real-time surrogate for finite-element (FE) head-model simulations, predicting the peak maximum principal strain (MPS) at every one of the 4124 brain elements from head-impact kinematics (angular velocity/acceleration) — where conventional FE runs take hours to days? (Abstract; Sec. I)

## 2. Dataset / schema
Four datasets, **1803 head impacts total** (Sec. II-A):
- **HM (1422 impacts):** simulated head impacts of a validated hybrid III anthropomorphic test dummy (ATD) head model [44]; bare dummy head impacted at locations with velocities 2–8 m/s; Y/Z-axis kinematics switching used to enlarge the training set.
- **CF1 (184 impacts):** on-field college football impacts from the original Stanford instrumented mouthguard [29].
- **CF2 (118 impacts):** on-field college football impacts from the updated Stanford instrumented mouthguard [30].
- **MMA (79 impacts):** MMA head impacts from the updated mouthguard [13]. All on-field impacts video-confirmed.
- **Ground truth:** peak MPS per brain element computed with the **KTH head model** (a validated FE head model [41]–[43]), 4124 brain elements.
- Highest 95% MPS per dataset: HM 0.4423, CF1 0.5093, CF2 0.4184, MMA 0.7051.
- **Access:** proprietary — Stanford instrumented-mouthguard recordings; not public; no download link given.

## 3. Method / model
- **Feature engineering (Sec. II-B):** per impact, angular accelerations (αx,αy,αz) computed via 5-point stencil derivative on angular velocities (ωx,ωy,ωz); magnitudes |α|, |ω|; components + magnitudes = **8 channels** c_i(t), i=1..8. Per channel, 6 time-domain feature types (20 features/channel, 160 total): (1) max, (2) min, (3) integral ∫c_i(t)dt, (4) integral of absolute values ∫|c_i(t)|dt, (5) max/min of exponential moving average of the signal derivative (2 values × 3 smoothing coefficients = 6), (6) extrema info except max/min (10: number of positive extrema, number of negative extrema, 2nd–5th largest positive extrema, 2nd–5th smallest negative extrema).
- **DNN (Sec. II-C):** input 160 → hidden 300 ReLU → dropout 0.5 → hidden 100 ReLU → dropout 0.5 → hidden 20 ReLU → output 4124 (one MPS per brain element). MSE loss, Adam optimizer, batch size 128, L2 regularization. Hyperparameters tuned on validation: training epochs, learning rate, L2 strength. Random initialization; dropout + L2 against overfitting.
- **Label transforms:** (1) log-transform each MPS before training, exponentiate predictions after; (2) whiten log-MPS per element using training-set mean/std, inverse-transform after.
- **Data augmentation:** Gaussian noise (mean 0, std 0.01 and 0.02 × std of original data) added to training samples → tripled training set size.
- **Tasks (Sec. II-D):** (1) Basis — HM only, 70/15/15 split, 20 repeats with random partitions + random init; (2) On-field — HM + 80% of on-field data train/val, remaining 20% on-field test, 5-fold CV (final: train on train+val, test on test); (3) Mixture — all 1803, 70/15/15, 20 repeats.

## 4. Equations & assumptions
- Feature standardization, Eq. (4): `f̄(x,i) = (f(x,i) − mean_x(feature(x,i))) / std_x(feature(x,i))`, where f(x,i) is the i-th feature of the x-th impact.
- EMA of derivative, Eq. (3): `y_i(n) = (1−a)·y_i(n−1) + a·(c_i(n) − c_i(n−1)), n ≥ 1`, with smoothing coefficient `a ∈ {1/SR, 1/(10·SR), 1/(100·SR)}`, SR = 1 kHz sampling frequency; `E_{a,i} = {min(y_i(n)), max(y_i(n))}`.
- Label whitening, Eq. (5): `z_whitened(x,i) = (z_raw(x,i) − mean_x(z_raw(x,i))) / std_x(z_raw(x,i))`, with means/stds from the training set (validation process) or train+val (evaluation process).
- Summary metrics over repeats r, impacts i, elements e: `MAE Mean = mean_r(mean_i(MAE_e(MPS)))`; `MAE Median = median_r(median_i(...))`; `MAE STD`, `MAE 95%CI`; `95%MPS R² Mean = mean_r(R²_i(95% MPS))`; `95%MPS RMSE Mean = mean_r(RMSE_i(95% MPS))`.
- Optimal hyperparameters (Fig. 3): Basis — LR 0.001, 4000 epochs, L2 0.0075; CF1-onfield — LR 0.0002, 500 epochs, L2 0.01; CF2-onfield — LR 0.00005, 4000 epochs, L2 0.01; MMA-onfield — LR 0.0002, 3000 epochs, L2 0.01; Mixture — LR 0.0005, 2500 epochs, L2 0.01.
- Stated assumptions (Sec. II-B, IV): training/validation data "represented a general distribution"; predictions must be positive (physical); whitening assumes per-element MPS distribution transfer across datasets.

## 5. Features / target
- **Inputs:** 160 engineered kinematics features (8 channels × 20), as above.
- **Target:** peak MPS at each of the 4124 brain elements (4124 outputs); 95% MPS over elements used as the headline summary metric.

## 6. Validation design
- Random (not time-ordered) splits: 70/15/15 train/val/test; 20 repeats with random partitions and random model initializations (basis, mixture); 5-fold CV on on-field data (each fold: train on HM + 80%×80% on-field, validate on 20%×80%, test on 20% on-field; then retrain train+val, evaluate on test).
- Metrics: MAE, RMSE (hyperparameter tuning criterion — "more sensitive to large errors"), R², Spearman correlation of predicted vs true MPS per element; R² and RMSE of 95% MPS.
- Baselines: compared against prior scalar models — CNN [33] (95% MPS R² 0.966) and DAMAGE [36] (0.968); authors state direct benchmarking infeasible (different FE models, different prediction type).

## 7. Numerical results / baselines
All from Fig. 3 (summary stats over 20 repeats / 5 folds):
- **Abstract headline:** MPS of entire brain in <0.001 s (Intel Core i5-6300U), average RMSE 0.025, std 0.002 over 20 repeats.
- **Basis (HM 1422):** train/val/test 994/214/214; MAE mean 0.015, median 0.015, std 0.001, 95%CI 0.001; RMSE mean 0.022, median 0.022, std 0.002, 95%CI 0.001; R² mean 0.867, median 0.868, std 0.023, 95%CI 0.010; Spearman mean 0.931, median 0.934; 95% MPS R² mean 0.906; 95% MPS RMSE mean 0.029.
- **On-field CF1:** MAE mean 0.013, RMSE mean 0.023, R² mean 0.755, Spearman mean 0.838; 95% MPS R² mean 0.864, RMSE mean 0.027.
- **On-field CF2:** MAE mean 0.014, RMSE mean 0.022, R² mean 0.670, Spearman mean 0.850; 95% MPS R² mean 0.726, RMSE mean 0.031.
- **On-field MMA:** MAE mean 0.023, RMSE mean 0.040, R² mean 0.648, Spearman mean 0.764; 95% MPS R² mean 0.813, RMSE mean 0.045.
- **Mixture (all 1803):** train/val/test 1261/271/271; MAE mean 0.015, median 0.016, std 0.001; RMSE mean 0.025, median 0.025, std 0.002; R² mean 0.837, median 0.832, std 0.023; Spearman mean 0.902, median 0.902; 95% MPS R² mean 0.897; 95% MPS RMSE mean 0.032. (Discussion quotes 95% MPS R² 0.8970 for mixture.)
- MAE mean/median < 0.03 in all tasks — "smaller than the differences of brain strain seen in injury and non-injury cases [41]".
- **Feature analysis (Wilcoxon signed-rank, Fig. 6):** EMA-derivative features significantly most predictive (p ≤ 0.001); angular acceleration slightly more predictive than angular velocity (p ≤ 0.1; pairwise table p = 0.083/0.084); time-history features > signal-value features (p ≤ 0.01); directional components > magnitudes (p ≤ 0.01). Angular-acceleration finding **contradicts** prior study [32] (angular velocity magnitude better correlated with MPS); authors attribute difference to their time-history features.
- (Paper claim, my note: all p-values are from tests on the authors' own RMSE-over-repeats, not from held-out hypothesis tests.)

## 8. Code / data availability
None stated. Feature engineering in MATLAB R2020a; augmentation + DNN in Python 3.7, Keras with TensorFlow 2.0 backend, scikit-learn for transforms.

## 9. Leakage & limitations
- **No lookahead leakage** in the split design (features are impact kinematics, targets are FE-computed strains). Caveat (my assessment): random splits put near-duplicate impacts (e.g., from the same recording session/player) on both sides of train/test — temporal/cluster leakage not addressed.
- **Y/Z axis-switching augmentation is physically suspect** — authors themselves flag it: rotational neck responses differ between sagittal and coronal planes [48], so augmented kinematics "may not accurately represent the characteristics of the head impact kinematics in football."
- **HM data are unhelmeted ATD impacts originally developed for football** — generalization to helmeted, high-energy NFL impacts is untested; MMA on-field results are the weakest.
- **No axonal fiber strain** (KTH version lacks fibers) — and "the accuracy in real-world application remains to be validated."
- **Engineered-feature ceiling:** authors concede CNN/RNN on raw longitudinal signals may extract better features (citing Wu et al. [33]).
- **External validity to NFL:** essentially none — no NFL data, unhelmeted basis impacts, strain is a biomechanical quantity, not a game-outcome predictor.

## 10. GSE overlap
None. GSE predicts game outcomes and player props; this is injury-biomechanics strain modeling. The existing-research-map's gap #9 ("causal injury impact") concerns *player-level injury effects on game outcomes* — this paper estimates brain strain, not availability/production effects, so it fills no GSE gap. No repo files duplicated.

## 11. GSE implementation spec
Not applicable — paper rejected for GSE's modeling scope. (If GSE ever built an injury-availability feature lane, the only transferable idea would be "DNN surrogate for an expensive physics simulation," e.g., a fast emulator for a complex prior — but no such lane exists.)

## 12. Reproducible test
Not applicable — paper rejected for GSE's scope; dataset proprietary and biomechanical.

## 13. Acceptance / rejection gate
Rejected at intake: no gate run.

## 14. Improvement experiment
Authors' own next step, which is sound: skip engineered features and train a CNN/RNN directly on the raw 6-channel kinematic time series once more on-field data exist — tests whether end-to-end learning beats the engineered-feature ceiling this paper hit (95% MPS R² 0.897 vs 0.966/0.968 of single-scalar models). A GSE-side analogue, if a physics-emulator lane ever opened, would be a neural surrogate for the engine's own slowest computation step.

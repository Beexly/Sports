# [1523] Enforcing Tail Calibration When Training Probabilistic Forecast Models (arXiv:2506.13687)

**Citation:** Jakob Benjamin Wessel, Maybritt Schillinger, Frank Kwasniok, Sam Allen (2026). *Enforcing Tail Calibration When Training Probabilistic Forecast Models*. arXiv:2506.13687v1 [stat.ME]. URL: https://arxiv.org/abs/2506.13687
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv; all sections through conclusions; appendices A–C verified 2026-09-21 — Appendix A: model details; Appendix B: sample-based CRPS form; Appendix C: CPIT-MCB penalty, Eq. 18, with the overprediction-exceedances failure mode and the intensity-vs-occurrence Forecaster's-dilemma lesson).
**Verdict:** ADAPT — add threshold-weighted CRPS (twCRPS) as a tail-emphasis term in the engine's training loss so blowout/upset probabilities are reliable; use TMCB as a tail diagnostic, not as the primary penalty.

## 1. Research question
When probabilistic forecast models are trained by optimizing a proper scoring rule under misspecification, can adapting the loss — weighted scoring rules or direct (tail-)miscalibration penalties — produce forecasts that are calibrated for extreme events, and what is the trade-off against overall calibration and skill?

## 2. Dataset / schema
Simulation: Y|μ~N(μ,1), μ~N(0,1), threshold t=3.29 (95th pct); mixture of F1 (unfocused, probabilistically calibrated but not tail-calibrated) and F2 (tail-calibrated, wrong scale below 0), n=100,000. Real: UK wind speeds, 10m, MOGREPS-G ensemble interpolated to 124 synoptic stations; train 1 Apr 2019–31 Dec 2020, test 1 Jan 2021–31 Mar 2022; covariates = ensemble mean/SD + sin/cos(day-of-year); extreme threshold 12.5 m/s (~97.5th pct). Models: EMOS (truncated normal, semi-local, 4 station clusters), DRN (neural EMOS, 100 fits), CGM (conditional generative, 250 samples, 100 fits).

## 3. Method / model
Loss-function adaptations to enforce tail calibration during training: (1) weighted score S̄+γS̄_w (CRPS+γ·twCRPS with w(z)=1{z>t}, or log score+γ·censored-likelihood; the sum is strictly proper when the base score is); (2) MCB penalty S̄+γ·MCB with MCB=∫|Ĥ_z−u|du (Wasserstein-1 distance of PIT values from uniform); (3) TMCB penalty S̄+γ·TMCB with TMCB=∫|R̂_t(u)−u|du, where R̂_t(u)=Ô·Ĥ_{z_t}(u) decomposes into exceedance-occurrence ratio Ô and conditional-PIT (CPIT) uniformity. Tail-calibration diagnostic: R̂_t(u) vs u plot. γ swept: EMOS γ∈{1,…,20}, DRN/CGM γ∈{1,2,5,10,20}.

## 4. Equations & assumptions
- LS=−log f(y) (Eq. 1); CRPS=∫[F−1{y≤x}]²dx (Eq. 2); optimum-score estimator θ̂=argmin n⁻¹ΣS(F_θ,x_i,y_i) (Eq. 3).
- cLS (Eq. 10); twCRPS=∫[F−1{y≤x}]²w(x)dx (Eq. 11); CRPS+γ·twCRPS = twCRPS with weight 1+γ·1{z>t} (strictly proper).
- Probabilistic calibration: P(F(Y)≤u)=u (Eq. 4); tail calibration: P(F_t(Y)≤u, Y>t)/E[1−F(t)]=u (Eq. 5), decomposing into occurrence (Eq. 6: P(Y>t)=E[1−F(t)]) and severity (Eq. 7: CPIT uniformity | Y>t); diagnostic R̂_t(u) (Eq. 8), decomposition (Eq. 9).
- MCB (Eq. 13); TMCB (Eq. 15), estimated via |Ô·z_(i),t − i/n|; TMCB→MCB as t→−∞.
- Assumptions: forecasts continuous; exchangeability of forecast-observation pairs for diagnostics; miscalibration penalties are differentiable approximations (CGM needs PIT/CPIT smoothing for gradients); γ has no absolute scale — must be tuned empirically.

## 5. Features / target
Wind-speed predictive distributions; threshold exceedance at 12.5 m/s. The mechanism is response-agnostic.

## 6. Validation design
Simulation: recover mixing parameter a as function of γ under each penalty. Wind: train/test split; CRPS, twCRPS, MCB, TMCB skill scores relative to the unregularized CRPS-trained baseline; PIT / CPIT / R̂_t diagnostic plots; 100 random-init DRN/CGM fits to measure training-randomness variance; γ sweep 0→20 with trajectory plot (Fig. 5).

## 7. Numerical results / baselines
- Simulation: ML mix â=0.726 (log score 1.51 vs 1.53/1.58), neither calibrated nor tail-calibrated; MCB penalty drives â→1 (recovers calibrated F1); TMCB and cLS drive â→0 (recovers tail-calibrated F2).
- EMOS (γ=5): TMCB penalty → TMCB skill +65.36%, but CRPS skill −4.77% and MCB skill −187.19% (large absolute tail gain, moderate absolute overall loss); twCRPS → TMCB +44.81%, CRPS −0.09%, MCB −13.55% — gentler trade-off.
- DRN (100 fits, avg, γ=5): baseline models have near-identical CRPS/PIT but wildly varying tail calibration from training randomness alone; TMCB penalty → TMCB +2.33%, MCB −15.83%; twCRPS → TMCB +48.90%, MCB +10.17%, CRPS −0.11%; MCB penalty → MCB +40.97% but TMCB −59.08%.
- CGM (γ=5): TMCB penalty → TMCB +56.88%, CRPS −0.98%, MCB −42.35%; twCRPS → TMCB +49.28%, CRPS −0.15%, MCB +1.15%; baseline CGM tails systematically too light.
- Penalizing CPIT-uniformity alone (ignoring the occurrence ratio Ô) "severely deteriorates" all other metrics by shifting density past the threshold — over-predicting extremes (Appendix C).
- Improvement scales with baseline tail miscalibration: well tail-calibrated models can be *hurt* by the penalty (Figs. 8, 11).

## 8. Code / data availability
Code: https://github.com/jakobwes/Enforcing-tail-calibration. Data: UK Met Office MOGREPS-G + station observations (described; access via Met Office).

## 9. Leakage & limitations
- No leakage (train/test temporal split; semi-local EMOS clusters from training data). Penalty terms computed on training data can overfit calibration itself (EMOS MCB unstable at large γ — train-set improvement not reflected in test).
- twCRPS with w=1{z>t} is proper but not strictly proper alone → used as CRPS+γ·twCRPS.
- Weak enforcement only (regularization, not constraints); multi-objective optimization left to future work.
- Tails hurt by penalty when already calibrated — blind application is harmful; needs the diagnostic-first workflow.

## 10. GSE overlap
Existing research map calibration cluster trains on CRPS/log-loss and checks binned ECE — exactly the "calibrated overall, miscalibrated in tails" failure mode this paper documents. None of the existing notes penalize tail miscalibration at training time. Pairs with ledger 1521 (CPIT post-processing handles tails after the fact; this paper fixes the training objective itself) and ledger 1520 (rankECE reports the number; TMCB reports the tail number).

## 11. GSE implementation spec
- Add twCRPS term to the engine's probabilistic training loss: w(margin)=1{|margin|>10} (blowout tail) with γ swept on a validation season; keep base CRPS/log-loss so the sum stays strictly proper.
- Add TMCB diagnostic (Eqs. 8–9, 15) to the weekly calibration report at thresholds {7, 10, 14} points; do NOT train on the CPIT-only penalty (Appendix C failure mode).
- Only apply the penalty to model components whose baseline TMCB shows miscalibration (Figs. 8/11 rule: penalty can hurt already-calibrated models).
- Effort: 1–2 days.

## 12. Reproducible test
Dataset: engine's margin-of-victory predictive distributions, 2022–2024. Compute TMCB and R̂_t(u) curves at t∈{7,10,14} for the current CRPS-trained models — expect the paper's signature: flat PIT but non-diagonal R̂_t (tails too heavy or too light). Then retrain (or fine-tune) one model component with CRPS+γ·twCRPS (γ sweep) and check TMCB skill improves ≥30% with CRPS degradation ≤1%.

## 13. Acceptance / rejection gate
ADOPT twCRPS training term if the fine-tune experiment improves TMCB skill ≥30% at t=10 with CRPS skill change ≥−1% on the holdout season; if TMCB penalty alone is needed to reach the target, accept only with a joint MCB guardrail (overall MCB degradation ≤20%).

## 14. Improvement experiment
Go beyond the paper: make the penalty *adaptive* — weight γ by the baseline TMCB per team/season-segment (penalize only where miscalibrated, per the Figs. 8/11 finding), turning the static γ sweep into a learned per-component schedule. The paper never tries this; it directly addresses their "penalty hurts calibrated models" limitation.

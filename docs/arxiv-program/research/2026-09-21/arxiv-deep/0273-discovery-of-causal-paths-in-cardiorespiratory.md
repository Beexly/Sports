# [0273] Discovery of causal paths in cardiorespiratory parameters: a time-independent approach in elite athletes (arXiv:1807.03152)

**Citation:** Marcel Młyńczak, Hubert Krysztofiak (2018). *Discovery of causal paths in cardiorespiratory parameters: a time-independent approach in elite athletes*. arXiv:1807.03152. URL: https://arxiv.org/abs/1807.03152
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1447 lines).
**Verdict:** REJECT — a sports-physiology causal-discovery application on resting ECG/breathing data from Olympic athletes; all six discovery algorithms are off-the-shelf R packages, GSE has no cardiorespiratory data on NFL players, and there is no transfer path to game-outcome modeling.

## 1. Research question
Can time-independent causal discovery (DAG search over whole-recording summary parameters, without temporal modeling or prior medical knowledge) reveal general causal paths among cardiac and respiratory variables in elite athletes at rest, in supine and standing positions — as a holistic precursor to finer time-series causality analyses and as a potential athlete-profiling/training-planning biomarker?

## 2. Dataset / schema
- **Subjects:** 116 elite athletes recruited at the National Centre for Sports Medicine, Warsaw, during routine monitoring 3–4 months before the Rio 2016 Olympics; **100 analyzed** (32 female, ages 24.6±6.4) after excluding 16 for signal artifacts.
- **Signals:** single-lead ECG (Lead II) + impedance pneumography (tetrapolar, Pneumonitor 2), 250 Hz; 6 min supine spontaneous breathing + 6 min standing, after 10-min stabilization.
- **10 derived parameters per athlete per position:** mean heart rate (HR); RMSSD; lnRMSSD; mean respiratory rate (RR); ciRR (CV of instantaneous breathing rate); cInsT/cExpT (CV of inspiratory/expiratory durations); cInsV/cExpV (CV of inspiratory/expiratory amplitudes); breathing regularity BR (eq. 1).
- Access: dataset of parameters + R script stated to be provided as journal supplement (reproducibility claim; no URL in the extracted text).

## 3. Method / model
**Six off-the-shelf causal discovery frameworks** applied to all pairwise relations among the 10 parameters, separately per body position, after a Bayesian-correlation pre-screen (significant when maximum probability of effect MPE > 0.9, Makowski 2018): (1) **Generalized Correlations** (Vinod 2017; generalCorr R package) — direction from |r*_{x|y}| vs |r*_{y|x}|; (2) **Causal Additive Modeling (CAM)** with selGAM pruning (Bühlmann et al. 2014; CAM package); (3) **FGES** for continuous variables (Ramsey 2015; rcausal); (4) **GFCI** (Ogarrio et al. 2016; rcausal); (5) **Hill-Climbing** score-based BN learning (bnlearn); (6) **Tabu Search** (bnlearn). Exploratory mediation follow-ups via Sobel tests (medmod/powerMediation packages). Body-position differences tested with paired t/Wilcoxon (α=0.05).

## 4. Equations & assumptions
- (1) Breathing regularity: **BR = (100 − 20·(tanh(σ_iRR/iRR̄) + tanh(σ_InsT/InsT̄) + tanh(σ_ExpT/ExpT̄) + tanh(σ_InsV/InsV̄) + tanh(σ_ExpV/ExpV̄))) [%]**, tanh terms keeping the 0–100% range.
- (2–3) Bayesian correlation pre-screen: X = α + βY + ε; **cor(X,Y) = β̂·σ(Y)/σ(X)**.
- (4) Generalized correlation: **r*_{y|x} = sign(r_{xy})·√(1 − E{(Y−E(Y|X))²}/var(Y))**, with |r*_{x|y}| > |r*_{y|x}| suggesting y is the "kernel cause" of x (only when p significant).
- Stated assumptions: causal sufficiency is **not** assumed for all methods (GFCI allows latent confounders); acyclicity (DAG output); faithfulness; the time-independent framing assumes whole-recording parameters capture the causal structure; no prior knowledge used (purely data-driven); single observation per athlete (no reproducibility analysis possible — acknowledged).

## 5. Features / target
- Inputs: the 10 per-athlete cardiorespiratory summary parameters (listed in §2), two body positions.
- Target: directed causal paths (DAG edges) among parameters; secondary: Sobel mediation tests on five candidate 3-node paths. Prediction horizon: none (retrospective structure learning).

## 6. Validation design
- No train/test split; "validation" = **cross-method agreement** (6 algorithms) — edges are reported as discoveries only when supported by multiple methods.
- Significance: paired position tests at α=0.05; Bayesian correlation MPE>0.9 gate; Sobel tests for mediation.
- Baselines: none — the six methods are compared against each other, and findings are checked against known physiology (RSA, baroreflex, cardiorespiratory coupling literature).

## 7. Numerical results / baselines
- All 10 parameters differ significantly between supine and standing (HR higher standing; RMSSD and all respiratory parameters lower/higher as expected — direction stated qualitatively).
- **Supine:** 5/6 methods agree cInsT → cExpT; 5/6 agree cInsV → cExpV; all methods agree cExpV → cExpT and cInsV → cExpT; 3 methods find cardiac–respiratory links: cInsV → RMSSD (CAM), cExpV → RMSSD (CAM), HR → cInsT (CAM, HC), HR → cExpT (Tabu). Cardiac-direction ambiguous: GC/CAM say RMSSD → HR, HC/Tabu say the opposite, FGES/GFCI undetermined. Overall supine path: **Tidal Volume → Heart Activity Variation → Average Heart Activity → Respiratory Timing**.
- **Standing:** 3/6 methods confirm cInsV → cExpV (2 ambiguous); loops among cInsV/cExpV/ciRR; 3 methods (GC, HC, Tabu) support **ciRR → HR**. Overall standing rule: **Normalized Respiratory Activity Variation → Average Heart Activity** — weaker than supine.
- **Mediation:** five candidate paths tested (RMSSD→HR→cInsT; HR→cInsT→cExpT; HR→cInsT→cInsV; cInsT→ciRR→HR; cInsV→ciRR→HR) — **none statistically significant** by Sobel test (Table 3; "p-values suggest tendency" only).
- Authors' own summary: "The discovery of cardiorespiratory paths appears ambiguous"; effects are "mild".

## 8. Code / data availability
Stated: "The dataset of parameters and the R script will be provided as a supplement to this paper to ensure reproducibility." **No URL or repository link in the extracted text** — effectively unverifiable from the paper alone.

## 9. Leakage & limitations
- **n=100, one observation per athlete, no replication** — the authors admit reproducibility analysis is impossible; heterogeneous sports/sex collapsed (no stratification by sport or sex).
- **Confounding by training state:** measured 3–4 months pre-Olympics ("hot period", possible over-training; no questionnaires or objective fatigue data collected); device novel to all subjects; unusually high supine respiratory rates noted.
- Method shopping: six frameworks "sense different aspects" and disagree (e.g., cardiac direction flips between method families); only "significant" links presented, so **selection bias in reported edges** cannot be assessed.
- Resting-state only, lab only — no exercise, no natural environment, no longitudinal tracking; the authors' own planned follow-up is time-series analysis, which they concede is the right resolution.
- Sobel mediation on cross-sectional observational parameters with no causal identification argument beyond the discovery algorithms' own assumptions.
- NFL transfer: zero — GSE has no ECG, impedance pneumography, HRV, or breathing data for NFL players, and the paper's findings (RSA direction at rest) have no conceivable mapping to game prediction.

## 10. GSE overlap
- **No overlap and no gap filled.** The existing-research-map contains no physiology/biometric work of any kind — no HRV, no athlete monitoring, no cardiorespiratory anything. The causal-discovery *algorithms* used (FGES, GFCI, HC, Tabu, CAM, generalized correlations) are generic and appear nowhere in GSE's corpus either, but the paper contributes **no new method** — it is an application paper chaining existing R packages.
- Verdict detail: not a duplicate (nothing to duplicate), but a **wrong-domain application with no transfer path** — GSE cannot obtain the input data (resting ECG + breathing of NFL players), and the output (resting cardiorespiratory DAGs) has no use in pick/prop/content modeling.

## 11. GSE implementation spec
- **None — REJECT.** No build plan is warranted: there is no data source (no NFL player ECG/respiratory feeds exist publicly or in GSE's stack), no outcome variable relevant to GSE, and the methods are pre-existing R packages that GSE would not invoke for any current lane.
- The only salvageable methodological note (for the record, not a build): if GSE ever runs DAG-based variable selection, the paper's **cross-method agreement protocol** (report only edges supported by ≥3 of 6 discovery algorithms spanning constraint-, score-, and asymmetry-based families) is a cheap robustness screen — but GSE's existing model stack has no variable-selection problem that needs it.

## 12. Reproducible test
- **Not applicable — REJECT.** There is no GSE dataset on which to test resting cardiorespiratory causal discovery, and no GSE metric it could move. Any "test" would be pure methods theater on unrelated data.

## 13. Acceptance / rejection gate
- **Rejected at the gate:** the paper fails the domain-transfer criterion — (a) input data unobtainable for NFL (resting ECG + impedance pneumography of players), (b) output (cardiorespiratory DAGs at rest) maps to no GSE product surface (picks, props, DFS, content), (c) no novel method is contributed (all six algorithms are pre-existing R packages). No numeric gate is meaningful; the rejection is structural.

## 14. Improvement experiment
- If one insisted on salvaging the *framework* rather than the application: run the same six-method agreement protocol on **NFL team-season panel data** (offensive EPA/play, defensive EPA/play, pace, turnover luck, penalty rate, special-teams EPA from the existing gse-lab CSVs) to discover stable directional structure among team-level metrics — e.g., does pace → offensive EPA or the reverse dominate across methods? This is a different paper's experiment, not this one's, and is noted only to separate the reusable protocol from the non-transferable physiology.

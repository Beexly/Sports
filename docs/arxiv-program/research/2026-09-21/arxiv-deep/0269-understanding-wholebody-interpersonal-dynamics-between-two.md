# [0269] Understanding whole-body inter-personal dynamics between two players using neural Granger causality as the explainable AI (XAI) (arXiv:2401.06412)

**Citation:** Ryota Takamido, Chiharu Suzuki, Jun Ota, Hiroki Nakamoto (2024). *Understanding whole-body inter-personal dynamics between two players using neural Granger causality as the explainable AI (XAI)*. arXiv:2401.06412. URL: https://arxiv.org/abs/2401.06412
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1314 lines).
**Verdict:** ADAPT — the component-wise-MLP neural Granger causality method ports to NFL tracking data for modeling defender↔ball-carrier coupling, but only with 22-player position time series instead of the paper's 27-joint motion capture, and GSE has no 27-joint data source today.

## 1. Research question
Can the whole-body inter-personal coordination between two athletes be quantified as a causal graph using neural Granger causality (NGC) as explainable AI, revealing (a) the asymmetric influence one player's body has on the other's, (b) which body components organize the interaction, and (c) the lag structure of that interaction? The test case is baseball pitcher vs. batter (whole-body kinetic chains, a natural time lag via ball travel time, and a measurable performance outcome: in-field hit rate).

## 2. Dataset / schema
- Participants: 23 male expert baseball players (7 pitchers, 16 batters, ages 19–23, 12.8±1.9 years experience), forming **16 independent pitcher–batter pairs**.
- Apparatus: 32 synchronized optical motion-capture cameras at **250 Hz**; Trackman for pitch velocity; manual recording of contact/non-contact and in-field/out-field per swing.
- Protocol: each pair played a game-like sequence until the batter completed **10 swings**; pitchers threw fastballs to the strike-zone center (mean ball speed **76.8 mph**).
- Schema per pair: **27 resultant-joint-velocity time series** (13 pitcher joints + 14 batter joints and bat tip), low-pass filtered at 10 Hz, clipped from 2 s before to 0.5 s after ball release, normalized to [0,1], downsampled to 50 Hz → **125 points × 27 variables × 10 swings per pair**.
- Access: datasets and sample code public at **https://github.com/takamido/NGC_data_baseball**.

## 3. Method / model
**Component-wise multilayer perceptron (cMLP)** from Tank et al. (2021) applied per target joint: one MLP per joint series, trained to predict the target's velocity at time t from all joints' past (including itself) within maximum lag K. Granger-causality strength is read off the **first-layer weight magnitudes** (group-sparse-group-lasso penalty drives non-causal weights to zero). Settings used: **1 hidden layer, 32 hidden units, ReLU activation, max lag K = 1.0 s (50 points)**, ISTA training with learning rate 0.05, regularization **λ = 0.003**, **2000 iterations**, trained per pair (10 swings batched), on an NVIDIA V100 — prediction **R² > 0.9**, training time < 2 min per pair. Aggregation: NGC from joint j to i summed over lags (eq. 4); mean intra/inter-body indices (eqs. 5–8, diagonal removed); significance via one-way repeated-measures ANOVA + Holm–Bonferroni post-hocs; MANOVA of the four NGC indices (+ ball speed) on contact rate and in-field rate; one-sample t-tests vs. a 0.015 threshold (Benjamini–Hochberg adjusted) to flag key joints; lag structure via argmax-lag per pair (eq. 11). Hyperparameter sensitivity (λ, sampling rate, max lag, hidden units, learning rate, velocity vs. acceleration inputs) checked in the supporting information.

## 4. Equations & assumptions
Equations (numbers as in paper):
- (1) First hidden-layer activations: **h₁(t) = σ(Σ_{k=1..K} W₁^k x_{t−k} + b₁)**, σ = ReLU.
- (2) Output: **x_{t,i} = g_i(x_{t−1: t−K}) + e_{t,i} = W_L h_{L−1}(t) + b_L + e_{t,i}**, e ~ mean-zero Gaussian noise; g_i a nonlinear function of all K lags of all series.
- (3) Training objective with group penalty: **min_W Σ_{t=K+1..T} (x_{t,i} − g_i(x_{(t−1):(t−K)}))² + λ Σ_{j=1..p} Ω(W_{:j}¹)**, where Ω is the **group sparse group lasso** penalty applied to first-layer weights grouped per input series.
- (4) Lag-aggregated NGC: **ngc_{i,j} = Σ_{k=1..K} ngc_{i,j,k}** ("size of the NGC from joints j to i").
- (5–8) Mean intra/inter indices: **ngc_pp = ΣΣ ngc_{i,j}/(13·12)** (pitcher↔pitcher, diagonal excluded); **ngc_bb = ΣΣ ngc_{i,j}/(14·13)**; **ngc_pb = ΣΣ ngc_{i,j}/(14·13)** (pitcher→batter); **ngc_bp = ΣΣ ngc_{i,j}/(13·14)** (batter→pitcher).
- (9–10) Inter-personal NGC sets averaged over pairs: **{ngc'_{i,j}} = {ngc̄_{i,j}}_{i∈batter, j∈pitcher}**, **{ngc''_{i,j}} = {ngc̄_{i,j}}_{i∈pitcher, j∈batter}**.
- (11) Lag structure: **l_{i,j} = argmax_k(ngc_{i,j,k})/50** (seconds).
Stated assumptions: (a) Granger-causal structure is recoverable from first-layer weight magnitudes after group-lasso penalization; (b) the 16 pairs are independent samples (replacing one player "qualitatively changes the type of interaction"); (c) resultant joint velocity captures the "velocity interaction" of interest; (d) 50 Hz downsampling + 1.0 s max lag suffice for the interaction timescale; (e) thresholds (0.015 NGC floor; variable-usage-rate 0.25–0.50 tuning band) separate real causal links from penalty-residual small weights; (f) in-field rate over 10 swings is a valid performance outcome. Not stated: formal identifiability conditions, stationarity assumptions.

## 5. Features / target
- Inputs: 27 time series of **normalized resultant joint velocity** (pitcher: head, shoulders×2, elbows×2, wrists×2, hips×2, knees×2, heels×2; batter: same 13 + bat tip); right/left unified as "back"/"front" for handedness.
- Target: per cMLP, the future velocity of each target joint at time t from all joints' K-lagged past. In Analysis 1–3, the derived NGC indices (intra/inter means, key joints, lag indices) and their relation to performance.
- Performance label: **contact rate** and **in-field rate** over 10 swings per pair (manually recorded).

## 6. Validation design
- No train/val/test split in the ML sense; each of 16 pairs trains its own cMLP (prediction R² > 0.9 used only as a fit check).
- Statistical validation: one-way repeated-measures ANOVA over 16 pairs for the four NGC indices, Holm–Bonferroni post-hocs; one-way MANOVA of the four indices + mean ball speed on contact/in-field rates, with follow-up ANOVAs; one-sample t-tests (threshold 0.015, BH-adjusted) per joint-pair for key-component identification; same ANOVA design on lag indices.
- Significance level 0.05; effect sizes: partial η² and Cohen's d. Post-hoc power analysis (G*Power): smallest detectable η² = 0.21, d = 0.75 (repeated measures); d = 0.65 (one-sample t-tests).
- Baselines: paper compares against no ML baseline — the novelty is the NGC framework vs. conventional cross-correlation/transfer-entropy (cited as unable to handle 27×27 nonlinear, non-stationary causal relations). Not stated: time-ordered splits are irrelevant (per-pair models).

## 7. Numerical results / baselines
- Repeated-measures ANOVA over four NGC indices: **F(3,60) = 2.75, p < .01, η² = 0.90**. Post-hocs (all p < .01): ngc_pp > ngc_bb (t(15)=4.1, d=2.9), ngc_pp > ngc_pb (t(15)=13.2, d=4.7), ngc_pp > ngc_bp (t(15)=59.0, d=20.9); ngc_bb > ngc_pb (t=8.3, d=2.9), ngc_bb > ngc_bp (t(15)=14.7, d=5.2); ngc_pb > ngc_bp (t(15)=8.4, d=3.0).
- Share of total causality: **ngc_pp ≈ 49%, ngc_bb ≈ 31%, ngc_pb ≈ 19%, ngc_bp ≈ 1%** (Discussion, Figure 6).
- Asymmetry: **ngc_pb/(ngc_bb + ngc_pb) = 0.38** — ~38% of batter movement generation derived from pitcher movement (paper's calculation).
- MANOVA on in-field rate: **F(1,14) = 10.9, p < .01, η² = 0.60**; no significant effect on contact rate (p > .05). Follow-up ANOVAs: ball speed F(1,14)=6.6, p=.02, η²=0.32; ngc_pp F(1,14)=9.4, p<.01, η²=0.40; **ngc_bp F(1,14)=32.1, p<.01, η²=0.69** (matches abstract's R²=0.69 for batter→pitcher causality correlating with performance outcomes).
- Analysis 2: **10 pitcher joints significantly exceeded the 0.015 threshold** (throwing arm: back elbow, back wrist → batter's front/back wrists and bat tips; lower body: back knee, back heel); 6 more joints had d above criterion but were non-significant. **No batter joints had significant causality to pitcher joints** (p > .05).
- Analysis 3 lag indices (mean±SD over pairs): **l_pp = 0.13±0.01 s, l_bb = 0.07±0.04 s, l_pb = 0.49±0.06 s** (l_bp excluded: >90% of joint pairs below threshold); ANOVA F(2,45)=3.20, p<.01, η²=0.95. l_pb (0.49 s) matches the ~0.50 s ball travel time at 76.8 mph (paper §Discussion).
- Hyperparameter sensitivity (supporting info): mean variable usage rate **0.30±0.03** at chosen settings; relative index ratios robust to λ and learning-rate changes; downsampling rate and max lag materially shift the intra/inter ratio (high sampling rate or short max lag suppress long-timescale inter-personal NGC, e.g. the 0.50 s ball-flight delay).

## 8. Code / data availability
**Data + sample code:** https://github.com/takamido/NGC_data_baseball (public). Method implementation: Tank et al. NGC/cMLP (external reference [21]); no paper-specific training script URL beyond the repo above.

## 9. Leakage & limitations
- Small N: only 16 pairs (one batter set differs across pitchers); effects are huge (d up to 20.9), but generalizability beyond these college players is untested.
- Hyperparameter-dependent discovery: the paper tunes λ/λ-like settings to a **chosen** variable-usage-rate band (0.25–0.50) — the density of detected causal links is substantially a tuning artifact; the SI admits downsampling rate and max lag materially change intra/inter ratios.
- Experimental control is thin: pitchers threw only fastballs to the strike-zone center in a non-game setting; no game-state, fatigue, or pitch-type variation — external validity to real baseball, let alone NFL, is limited.
- Post-treatment/perceptual confounds: the authors admit they cannot separate perceptual/cognitive coupling from motor coupling, and NGC weights are correlational (predictive), not interventional — no controlled manipulation of the pitcher's movement was performed (VR follow-up proposed but not done).
- The batter→pitcher "causality" (η²=0.69 on in-field rate) is tiny in absolute magnitude (~1% of total NGC); the authors themselves note it may reflect anticipatory movement rather than genuine influence — a classic Granger-causality caveat where prediction direction ≠ causation.
- NFL transfer: the method requires dense whole-body time series; GSE has no 27-joint motion-capture feed for NFL players. Only Big Data Bowl–style tracking (10 Hz x/y) exists, at coarser granularity and different semantics.

## 10. GSE overlap
- **New capability — no existing coverage.** The existing-research-map has a 27-family NGS/tracking taxonomy and the STRAIN paper (2305.10262) on pass-rush dynamics, but nothing on **causal discovery between players from time series**; neural Granger causality / cMLP appears nowhere in the corpus (no hit in the map's method lists, no prior paper read).
- Adjacent but distinct: STRAIN (pass-rush strain from tracking) measures kinematics, not causal influence graphs; GSE's 2026-09-21 NGS inventory covers descriptive metrics, not inter-player causal structure; the "causal inference" ML-brief area is commissioned with results pending, but this XAI-on-time-series method is a different lane.
- Verdict detail: extension only in the weak sense that it builds on the NGS/tracking lane; in substance it is a new method for GSE.

## 11. GSE implementation spec
- **Data:** NFL Big Data Bowl tracking CSVs (22 players × x, y, speed, direction, orientation at 10 Hz per play) — the closest GSE-accessible analog of the paper's 27-joint series. Start with one matchup type: man-coverage CB↔WR or pass-rusher↔QB.
- **Feature engineering:** per play, build ~44–66 time series (x, y, speed for each of the 22 players), clipped from snap to pass/whistle, normalized per series to [0,1], kept at native 10 Hz (no 50 Hz resampling; set max lag K to cover ~0.5–1.0 s, i.e., 5–10 points — mirrors the paper's ball-travel-lag logic).
- **Model:** cMLP per target series (PyTorch), one hidden layer 32–64 units, ReLU, group sparse group lasso on first-layer weights, ISTA or AdamW with group-soft-thresholding, λ tuned to variable-usage-rate band 0.25–0.50 exactly as in the SI; train per play or per matchup-week batch on GPU (paper's cost: <2 min/pair on V100 — expect hours for a season of plays; batch by play).
- **Derived analytics:** intra-player vs. defender↔ball-carrier NGC indices (analog of eqs. 5–8 with 22 players), key-player identification via threshold t-tests, lag indices to measure reaction delays (e.g., CB reaction lag to WR break).
- **Serving:** offline research tool first — output causal graphs and reaction-lag tables per matchup for props/matchup content; not a real-time serving path.
- **Effort estimate:** 3–5 days for a pilot (data loader + cMLP + one matchup type, single season of Big Data Bowl data); 2–3 weeks to harden into a reusable matchup-causality module.

## 12. Reproducible test
- **Dataset:** Big Data Bowl tracking data, 2022 season (public), man-coverage plays only (use the provided coverage-label columns or play-type tags), weeks 1–8 as the analysis set.
- **Metric:** correlation (Pearson R²) between defender→ball-carrier (or WR→CB) inter-body NGC index and play outcome (EPA of the play).
- **Baseline:** zero — the test is existence/strength of signal: R² > 0 between the inter-body NGC index and play EPA, plus the sanity check that mean defender reaction lag (l index) falls in a plausible 0.2–0.6 s band.
- **Window:** 2022 season weeks 1–8 (analysis), weeks 9–17 (holdout confirmation of the R² sign).

## 13. Acceptance / rejection gate
- **Adopt into the matchup-causality module** if on the 2022 weeks 1–8 man-coverage set: (a) mean CB reaction-lag index lands within 0.2–0.6 s AND (b) WR→CB inter-body NGC correlates with play EPA at R² ≥ 0.10 with p < .05, and the sign persists (R² ≥ 0.05) on weeks 9–17 holdout.
- **Reject** if the lag indices are unstable across hyperparameter settings (replicating the SI's downsampling sensitivity beyond a factor-2 shift) or if R² < 0.05 on the primary window — the method then adds nothing over GSE's existing separation/open-rate metrics.

## 14. Improvement experiment
Replace the fixed λ tuning-to-a-usage-band with a **stability-selection procedure**: bootstrap-resample plays within a matchup, refit the cMLP, and keep only joint↔joint links selected in ≥70% of bootstraps (Meinhausen–Bühlmann style). This removes the arbitrary variable-usage-rate target that currently makes detected-link density a tuning artifact, gives per-link selection probabilities usable as confidence weights in the matchup tables, and directly addresses the SI's own robustness caveat.

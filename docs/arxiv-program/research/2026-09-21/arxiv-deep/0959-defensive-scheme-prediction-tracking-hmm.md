# [0959] Integrating Unsupervised and Supervised Learning for Defensive Scheme Prediction (arXiv:2602.10784)

## Citation / full-text source

- arXiv:2602.10784 — full text: https://arxiv.org/pdf/2602.10784
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Rouven Michels, Robert Bajons, Jan-Ole Fischer (2026). *Integrating Unsupervised and Supervised Learning for the Prediction of Defensive Schemes in American football*. arXiv:2602.10784. URL: https://arxiv.org/abs/2602.10784
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv conversion).
**Verdict:** ADAPT — non-homogeneous HMM decoding latent defender→offensive-player guarding assignments during pre-snap motion, with decoded-state summary features (switch counts, entropy, play-level random effect) boosting man/zone classification; directly portable to GSE's pre-snap coverage/matchup lane.

## 1. Research question
Can we forecast the defensive coverage scheme (man vs zone) from pre-snap motion using player tracking data, by (a) inferring latent guarding assignments with a non-homogeneous hidden Markov model and (b) feeding decoded-state features into supervised classifiers (elastic net logistic regression, XGBoost)?

## 2. Dataset / schema
- NFL Big Data Bowl 2025: tracking data at **10 Hz** + play-by-play from the **first nine weeks of the 2023 NFL season** (Data section; the Introduction says "2024 NFL season" — noted inconsistency).
- Filtered to plays with pre-snap motion, excluding two-QB plays and bunch formations → **M = 3,963 offensive plays**; labels from Pro Football Focus: **2,980 zone, 983 man** (25% man).
- Preprocessing: drop OL/QB on offense → 5 offensive skill players; drop DL + LOS-aligned OLB pass-rushers (e.g., Micah Parsons) on defense; if >5 defenders remain, keep the 5 closest to the offensive players (typically dropping deep safeties) → 5 × 3,963 = **19,815 defender time series**.
- Access: Big Data Bowl data public (Kaggle); code at https://github.com/janoleko/BDB-2025/.

## 3. Method / model
Three-stage feature design: (1) **pre-motion** — contextual (quarter, down, yards to go, yardline, scores, seconds left in half) + spatial (convex-hull area of all players, hull width/length) + 20 standardized-position features for the 10 selected players; (2) **naive post-motion** — 6 features: for offense and defense, max x-distance, max y-distance, and total distance traveled between motion start and snap; (3) **HMM features** — from decoded guarding assignments.
**HMM:** per-defender time series of y-coordinates; N = 5 states = the 5 offensive players; state-dependent distribution f(y_t | S_t = j) ∼ N(μ_{t,j}, σ²) with μ_{t,j} = y_{t−l}(off_j) — the lagged (reaction-time) y-position of offensive player j; **lag l = 4** (0.4 s at 10 Hz), selected by AIC on a homogeneous pilot. Non-homogeneous transitions via mixed-effects multinomial logit: η_{ij}^{(t,r,d,p)} = β₀ + β₁|y_{t−l}(off_i) − y_{t−l}(off_j)| + u_r + v_d + w_p (i≠j; η_{ii} ≡ 0), with u_r ∼ N(0,σ²_role) (position), v_d ∼ N(0,σ²_defense) (team), w_p ∼ N(0,σ²_play) (play). Initial distribution δ^{(1)} set from spatial proximity (stationary distribution inappropriate for non-homogeneous chain). Fitted by marginal maximum likelihood with Laplace approximation via R **RTMB** + `nlminb`; per-defender HMM likelihoods via the forward algorithm (LaMa package). Defenders treated as independent within a play.
**Feature extraction:** local decoding (eq. 7) → most-likely guarded player per frame; 4 features per play: total switches, # switching defenders, average assignment entropy, and the play-specific random effect w_p. Table 2 descriptives: total switches median 1.00, mean 1.82, max 21; switching defenders median 1.00, mean 1.45, max 5; entropy median 0.13, mean 0.17; RE/play median −0.03, mean 0.00.
**Supervised:** elastic net logistic regression (glmnet; λ, α tuned) and XGBoost (depth, LR, rounds tuned), three feature sets, evaluated by 50-times-repeated 5-fold cross-fitting with inner 5-fold CV tuning; metrics accuracy/AUC/logloss.
**Inference:** Generalized Covariance Measure (GCM) test for conditional independence Y ⊥ X | Z (X = 4 HMM features), plus partially linear logistic interpretation (eq. 9): logit π(X,Z) = Xβ + g(Z).

## 4. Equations & assumptions
- (1) f(y_t | s_1…s_t, y_1…y_T) = f(y_t | S_t = s_t) — Markov conditional independence.
- (2) f(y_t | S_t = j) ∼ N(μ_{t,j}, σ²), μ_{t,j} = y_t(off_j).
- (3) μ_{t,j} = y_{t−l}(off_j), l = 4 (reaction lag).
- (4) η_{ij}^{(t,r,d,p)} = β₀ + β₁|y_{t−l}(off_i) − y_{t−l}(off_j)| + u_r + v_d + w_p; γ_{ij} = exp(η_{ij})/Σ_k exp(η_{ik}).
- (5) Marginal likelihood L(θ) = ∭ f_{β,σ}(y|u,v,w) f(u)f(v)f(w) du dv dw (Laplace-approximated).
- (6) Defender likelihood: δ^{(1)}P(y_1)Γ^{(2)}P(y_2)…Γ^{(T_m)}P(y_{T_m}).
- (8) GCM ≔ E[Cov(Y,X|Z)] = E[(Y − E[Y|Z])(X − E[X|Z])].
- (9) log(π/(1−π)) = Xβ + g(Z).
- Assumptions: defenders' trajectories independent within a play; 5 states suffice; y-coordinate mirroring captures guarding; man/zone binary is an adequate scheme abstraction; 10 Hz adequate; PFF labels correct.

## 5. Features / target
- Inputs: pre-motion context + spatial (20 standardized position features, hull stats); naive post-motion (6 distance features); HMM-derived (4: total switches, switching defenders, avg entropy, play RE).
- Target: y_i = 1 man / 0 zone coverage.

## 6. Validation design
- 50-times-repeated 5-fold cross-fitting (outer) with inner 5-fold CV hyperparameter tuning — out-of-sample predictions for all 3,963 plays; metrics accuracy (0.5 threshold), AUC, logloss. Main focus: logloss (proper scoring rule).
- GCM tests: omnibus (all 4 HMM features) then per-feature, using XGBoost for the nuisance regressions.
- Team analysis: leave-one-team-out — train on all other teams, predict held-out team's plays with pre-motion vs post-motion+HMM XGBoost; compare P(correct) improvements.

## 7. Numerical results / baselines
- Supervised metrics are reported **only as boxplots (Figure 5)** — no numeric table in text; directionally: adding naive post-motion then HMM features improves accuracy, AUC, and negative logloss for both elastic net and XGBoost. (Exact values are chart approximations — not quoted here per the exact-numbers rule.)
- GCM omnibus test: **p ≈ 0.0002** — HMM features significantly associated with coverage given all other features.
- Per-feature GCM: only **per-play RE significant (p ≈ 0.005)**; others not rejected (authors attribute to strong correlation among the 4 features). In the PLLR interpretation, **all 4 features are significant with negative β** — fewer switches / lower entropy / lower RE → higher P(man), matching intuition (man = stable assignments).
- Random effects (Table 1, position): ILB 0.007, MLB 0.006, OLB 0.006, CB **−0.178**, SS −0.005, FS **0.175** — smaller = more persistent guarding; CBs follow receivers, safeties/LBs pass off assignments.
- Example t.p.m. (Marco Wilson, Cardinals CB, at the Hardman–McKinnon crossing): diagonal 0.983–1.000 — persistence even at the crossing point.
- Team analysis (leave-one-team-out): most teams show positive median improvement from motion features; top: **Kansas City Chiefs, Tennessee Titans, Atlanta Falcons**; Atlanta and San Francisco noted as heavy motion users; Giants effective despite little motion.

## 8. Code / data availability
Code: https://github.com/janoleko/BDB-2025/. Data: NFL Big Data Bowl 2025 (public).

## 9. Leakage
- No leakage by construction: all features are pre-snap (pre-motion, naive post-motion, HMM decoded from pre-snap motion); predictions are out-of-sample via 50x repeated 5-fold cross-fitting.

## Limitations
- Authors' own: small dataset (3,963 plays) constrains complexity; binary man/zone is a coarse abstraction (no Cover-1/2/3/hybrids); defender independence is a strong assumption; only summary statistics of decoded states used (not raw sequences) due to data limits.
- Supervised performance numbers exist only in a figure — the "consistent improvements" claim can't be quantified from text.
- Motion plays only (selection effect); PFF labels are themselves model/human judgments, not ground truth.
- Leave-one-team-out may underuse intra-team structure.
- Same author group as 2407.08508 (PEP) — shared codebase/perspective.

## 10. GSE overlap
Existing-research-map: Dutta et al. 2020 (unsupervised pass-coverage identification among DBs) is cited as prior art and sits in the corpus lineage; repo has coverage-matchup work (Statyx coverage/run-type matchups 2026-09-19, CoverageIQ cards). **Extension, not duplication**: adds pre-snap motion dynamics + a formal non-homogeneous HMM with mixed-effects transitions + GCM significance testing. Directly feeds the matchup lane (pre-snap coverage prediction → WR/TE matchup edges for props).

## 11. GSE implementation spec
- Data: Big Data Bowl tracking (or nflverse where tracking unavailable) + PFF-style coverage labels (charting; or derive from tracking via the unsupervised route of Dutta et al.).
- Steps: (a) replicate preprocessing (5v5 skill-player matching); (b) fit the non-homogeneous HMM (RTMB/LaMa or a PyTorch reimplementation) with l = 4; (c) extract the 4 decoded features; (d) train XGBoost on pre-motion + naive + HMM features for man/zone; (e) serve pre-snap coverage probabilities per play to the matchup model; (f) run the leave-one-team-out team analysis to identify motion-exploiting offenses.
- Effort: ~1 week (HMM fitting is the heavy lift; the authors' repo is the reference).

## 12. Reproducible test
Dataset: Big Data Bowl 2025 tracking (2023 weeks 1–9). Baseline: XGBoost on pre-motion features only. Test: 5-fold cross-fitted logloss of (pre-motion) vs (pre-motion + naive) vs (+ HMM); report Δlogloss with 95% intervals over 20 repeats; also GCM omnibus p-value for the HMM feature block.

## 13. Acceptance / rejection gate (numeric gate)
ADAPT if: adding HMM features improves cross-fitted logloss over the pre-motion baseline by ≥0.01 with the improvement's 95% interval excluding zero, AND the GCM omnibus test rejects at p < 0.01. Otherwise keep only the naive motion features.

## 14. Improvement experiment
Replace the 4 hand-built summary statistics with the raw decoded state-probability sequences fed to a small temporal CNN/transformer head (the authors' own suggested extension), and extend the target from binary man/zone to Cover-1/2/3/6 + 2-man subtypes via a hierarchical HMM; test whether fine-grained coverage prediction improves WR-vs-coverage EPA matchup estimates out-of-sample.

## Verdict

**ADAPT** — verdict per wave-2 reader-15 report (full-read ledger; the acceptance criterion is stated in the numeric-gate section above).

# 1693 Linear Acceleration Is a Primary Risk Factor for Concussion (arXiv:2507.09098)

**Citation:** Jessica A. Towns, Nicholas J. Cecchi, James W. Hickey, William T. O'Brien, Spencer S.H. Roberts, N. Stewart Pritchard, Jillian E. Urban, Joel D. Stitzel, Gerald A. Grant, Michael M. Zeineh, Stuart J. McDonald, David B. Camarillo (2025). *Linear Acceleration Is a Primary Risk Factor for Concussion and a Target for Prevention*. arXiv:2507.09098. URL: https://arxiv.org/abs/2507.09098
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, all sections through data availability + supplementary header).
**Verdict:** ADAPT — the first direct human-measurement refutation of the rotational-acceleration concussion dogma, with concrete risk functions (50% risk at 100 g linear) and a clean logistic risk-function methodology GSE can port to NFL mouthguard data for concussion-probability modeling.

## 1. Research question

Rotational acceleration has guided concussion science since Holbourn (WWII) — but it was never tested with direct measurements during human concussions. Using instrumented mouthguards, the authors test whether linear acceleration (a), rotational acceleration (α), or rotational velocity (ω) best predicts concussion, derive injury risk functions, and test whether a liquid-filled helmet pad targeting linear acceleration reduces predicted risk.

## 2. Method / model

- **Data:** instrumented mouthguards (Stanford MiG2.0, rigid skull coupling) recording head kinematics of diagnosed concussions: 3,805 non-concussive + 47 concussive impacts across 203 male/female athletes in American football, Australian football, rugby union, gymnastics, ice hockey, MMA, lacrosse; 40 athletes concussed (3 US football + 1 Australian football with multiples); LOC in 5 Australian-football, 3 MMA, 1 collegiate, 1 youth cases.
- **Kinematics:** peak linear acceleration (a), peak rotational acceleration (α), peak rotational velocity (ω), head impact power (HIP, linear + rotational components), 95th-percentile max principal strain (MPS95, global + regional, via finite-element DAMAGE model).
- **Modeling:** 12 logistic regression classifiers screened by deviance (G²), BIC, LASSO, dominance analysis → retained 5 (a+ω, a+α, a, α, ω); 80/20 train/test split; injury risk functions = univariate/bivariate logistic curves with 95% CIs; youth concussions (n=4) held out as a separate check.
- **Helmet test:** Virginia Tech Varsity Football Helmet STAR protocol impacts (3.1, 4.9, 6.4 m/s; front/back/side) comparing stock vs liquid-filled fit pads, risk quantified with the derived P_risk(a+ω).

## 3. Mathematics / equations / assumptions

- Logistic injury risk functions: P(concussion) = logit⁻¹(β0 + β1·a [+ β2·ω or β2·α]); 50% risk thresholds solved from fitted curves.
- Odds ratios from bivariate models (Wald tests for OR differences).
- Brain natural period Δtn ≈ 40 ms (natural frequency ~25 Hz): impacts above the ω–α iso-strain line are short-duration pulses where strain is velocity-dominated (DAMAGE model).
- Assumptions: single-event kinematics suffice (aligned with safety-evaluation practice); mouthguard rigidly coupled to skull; diagnosed concussions correctly linked to recorded impacts; 200 Hz filtering.

## 4. Dataset / schema

- **Source:** multi-sport instrumented-mouthguard program (Stanford-led); 3,852 impacts, 203 athletes.
- **Schema per impact:** sport, athlete, concussion label, peak a/α/ω, HIP components, MPS95 (global + regional: upper gray matter, cortical white matter, basal ganglia, corpus callosum).
- **Access:** "available from the corresponding author on reasonable request" (not public).

## 5. Features / target

- **Features:** peak linear acceleration, peak rotational acceleration, peak rotational velocity, HIP split, MPS95.
- **Target:** diagnosed concussion (binary) per impact.

## 6. Validation design

- **Design:** 80% train / 20% held-out test; AUPRC + F1 on held-out set; 95% CIs; separate youth-concussion recall check (n=4); model selection by deviance/BIC/LASSO/dominance before formal comparison (preserving power); benchmarks against automotive/helmet metrics (HIC36, BrIC, HIP, CP, MPS95).

## 7. Exact results and baselines (numbers)

- **Held-out AUPRC:** a = 0.65 [0.27, 0.90]; a+ω = 0.64 [0.29, 0.90]; a+α = 0.60 [0.24, 0.90]; α = 0.36 [0.12, 0.67]; ω = 0.35 [0.07, 0.67]; random classifier = 0.01.
- **F1:** a = 0.50; a+α = 0.55; a+ω = 0.40; α = 0.31; ω = 0.30. Precision/recall: a = 0.80/0.38; a+ω = 1.00/0.25; a+α = 0.50/0.63. Youth recall = 0 for all models (all four youth concussions missed — magnitudes much lower).
- **50% risk thresholds (200 Hz filtered):** a = 100 g; α = 8.3 krad/s²; ω = 40 rad/s. Decision thresholds: a 78.7 g; α 5874.2 rad/s²; ω 29 rad/s.
- **Odds ratios:** a+α model: OR_a = 2.3 [1.5–3.6] (significant), OR_α = 1.3 [0.81–1.9] (ns); a+ω: OR_a = 2.1, OR_ω = 2.2 (both significant, no difference).
- **Importance:** LASSO β: a 0.91 > ω 0.842 > α 0.380; dominance R²: a 0.108, ω 0.065, α 0.061.
- **Strain:** concussive MPS95 — upper gray matter 0.36±0.21, cortical white matter 0.30±0.12, basal ganglia 0.28±0.10, corpus callosum 0.48±0.14 vs non-concussive 0.04–0.09 (p<0.0001).
- **Helmet:** liquid pads reduced mean predicted risk: 3.1 m/s: 1.6%→0.8%; 4.9 m/s: 26.7%→13.4%; 6.4 m/s: 73.3%→55.7% (up to 52% relative reduction; significant at back/front/side).

## 8. Code / data availability

**Stated:** datasets available from corresponding author on reasonable request; no code statement. **Competing interests:** Camarillo and Cecchi are inventors with financial interest in the liquid shock-absorbing technology (Stanford/SoftShox) — the helmet result comes from parties with a stake in it.

## 9. Leakage and limitations

- **Conflict of interest** on the helmet finding (inventors evaluating their own technology) — treat the 52% reduction as provisional.
- **Only 47 concussive impacts** — wide CIs (AUPRC 95% CI [0.27, 0.90] for the best model); youth concussions entirely missed (recall 0).
- **Single-event framework** — cumulative subconcussive exposure not modeled (acknowledged).
- **Selection bias** acknowledged: concussive cases likely biased toward lower magnitudes (surveillance-detected).
- **Data not public** — risk functions can't be refit or validated externally.
- **Multi-sport pooling** — American-football-specific thresholds may differ.

## 10. GSE overlap

GSE's injury lane models availability/injury risk but has no biomechanical concussion-probability component. The NFL runs an instrumented-mouthguard program (Guardian Caps era data exists in the league's engineering analyses) — the same logistic risk-function approach ports directly. No existing GSE doc implements impact-kinematics-based concussion probability.

## 11. GSE implementation spec

- **Target:** per-play concussion-probability model for NFL injury reporting and player-availability adjustments.
- **Data:** NFL mouthguard/helmet-sensor data (league-published aggregates + any licensed impact datasets); play-level impact kinematics where available; concussion diagnoses from injury reports.
- **Method:** replicate the paper's screening pipeline — univariate/bivariate logistic risk functions on a/α/ω, model selection by BIC + LASSO, 80/20 temporal split, AUPRC/F1 reporting; derive NFL-specific 50% risk thresholds; publish the risk curves as GSE research content.
- **Serving:** concussion-probability annotations on big-hit video content; availability-risk adjustments in the engine for players returning from concussion protocol.
- **Effort:** 2–3 weeks (data licensing is the bottleneck).

## 12. Reproducible test

- **Dataset:** any public head-impact dataset (e.g., published NCAA mouthguard datasets) with concussion labels; ≥ 30 concussive impacts.
- **Metric:** replicate the 5-model comparison on a temporal holdout; report AUPRC and 50% risk thresholds.
- **Baseline to beat:** the paper's ordering (a ≥ a+ω > α, ω univariate); the replication passes if peak linear acceleration ranks #1 or #2 by AUPRC on the new dataset AND the fitted 50% threshold falls within 60–140 g (same order of magnitude as 100 g). Fails if α or ω dominates (suggesting sport-specific reversal).
- **Window:** single replication study.

## 13. Acceptance / rejection gate + improvement experiment

- **Gate (numeric):** ADAPT the risk-function methodology if the replication confirms linear acceleration in the top-2 predictors by AUPRC with a 50% threshold of 60–140 g. REJECT the helmet-tech claim entirely for GSE purposes (conflicted source; equipment lane, not prediction).
- **Improvement experiment:** the paper's single-event framework ignores cumulative exposure — build a **cumulative-load-augmented risk function**: P(concussion) = logit⁻¹(β0 + β1·a + β2·ω + β3·season-cumulative-HIP), testing whether prior subconcussive load modifies instantaneous risk (the open question the authors flag). Second: fit **position-specific risk functions** (linemen vs skill positions have different impact distributions) — the paper pools all sports/positions.

**Verdict:** ADAPT — the linear-acceleration risk-function methodology ports directly to NFL mouthguard data for concussion-probability modeling; discount the conflicted helmet-tech claim.

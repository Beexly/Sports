# [0337] FST.ai 2.0: An Explainable AI Ecosystem for Fair, Fast, and Inclusive Decision-Making in Olympic and Paralympic Taekwondo (arXiv:2510.18193v2)

**Citation:** Keivan Shariatmadar, Ahmad Osman, Ramin Ray, and Kisam Kim (2025). *FST.ai 2.0: An Explainable AI Ecosystem for Fair, Fast, and Inclusive Decision-Making in Olympic and Paralympic Taekwondo*. arXiv:2510.18193v2. URL: https://arxiv.org/abs/2510.18193v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 23 pages incl. appendix).
**Verdict:** ADAPT — reject the taekwondo perception stack entirely; port the paper's **uncertainty-governance pattern**: credal-set lower-confidence decision rules, audit logging with a human-override gate, and disparity-based fairness monitoring. These map directly onto GSE's pick-publishing and analyst-review workflow.

## 1. Research question
Can an explainable, uncertainty-aware AI ecosystem make officiating in Olympic/Paralympic Taekwondo fairer, faster, and more inclusive — supporting referees in real time (replacing 90-second IVR reviews), training referees, analyzing athletes/coaches, classifying Para-athletes under impairment uncertainty, and giving federations policy analytics — while keeping humans as the final decision-makers?

## 2. Dataset / schema
1,200+ hours of World Taekwondo competition video, semi-automatically segmented and labeled on a custom annotation platform with human-in-the-loop verification (Cohen's κ inter-annotator agreement). Labels per event: event type (head kick, punch, block, fall), action success (successful/blocked/missed), hit validity (scorable/non-scorable), referee verdict (point/foul/warning), meta-tags (athlete ID, match phase, round). Stored as structured JSON (example: match WT2025_Cadet_042, head_kick frames 110–135, hit_valid true, point_awarded). Sensors: Daedo PSS (pressure/IMU in protective gear) synchronized with dual 120 fps 1080p cameras.

## 3. Method / model
Four modules + data coordination layer:
1. **M1 Action Recognition**: OpenPose/HRNet pose → spatial-temporal graph G=(V,E) → ST-GCN classifier (also a spatio-temporal transformer variant); latency <50 ms/frame on RTX 4070, <120 ms/frame on Jetson Xavier NX.
2. **M2 Decision Support Engine**: uncertainty decomposition (aleatoric: ŷ,σ̂²=fθ(x); epistemic: MC Dropout with M stochastic passes; imprecise credal sets P∈[P̲,P̄] for sparse/ethical cases) + Grad-CAM and attention saliency overlays with color-coded confidence (green >0.9, yellow 0.7–0.9, red <0.7).
3. **M3 Training/Education Analytics**: dashboards (scoring latency, referee-AI agreement, technique breakdown), referee skill tracking (Precision/Recall/F1 → Novice/Intermediate/Expert), jury-override simulator on borderline cases (max_y P(y|V_i) < τ).
4. **M4 Para-Classification Assistant**: hybrid engineered biomechanical features (ROM, symmetry, impact delay) + deep embeddings; softmax classifier with predictive-entropy flagging and credal-set rejection (reject if max_c P(c|M_i) < τ).
5. **Next-gen PSS sensor fusion**: linear fusion I = s(αp x̃p + αi x̃i + αv x̃v) with interval propagation for drift, imprecise probability from parameter sets, and a **lower-confidence awarding rule**: award only if I̲ ≥ Tw and p̲ ≥ τ (maximin on the lower bounds), else route to human review.
6. **RL adaptation**: Bootstrapped DQN (K=10 heads) over referee-support actions, reward = alignment with expert decisions + fairness.
7. **Governance layer**: per-decision audit logs {t_i, x_i, ŷ_i, H_i, DecisionFlow}, binary jury-override gate, GDPR edge processing, disparity audits.

## 4. Equations & assumptions
Stated equations (copied faithfully):
- ST-GCN layer: `H^(l+1) = σ(Σ_{k=0}^{K} A_k · H^(l) · W^k)` (A_k normalized adjacency partitions; also given as `H^(l+1) = σ(ÃH^(l)W^(l))`).
- Latency: `T_latency = T_capture + T_pose + T_classify + T_overlay < 300 ms`.
- MC Dropout: `E[f(x)] ≈ (1/M)Σ_m fθ_m(x)`; `Var[f(x)] ≈ (1/M)Σ_m fθ_m(x)² − E[f(x)]²`.
- Uncertainty decomposition: `V[ŷ] = E_θ[Var(ŷ|θ)] + Var_θ[E(ŷ|θ)]` (aleatoric + epistemic).
- Grad-CAM: `L^c_Grad-CAM = ReLU(Σ_k α^c_k A^k)`, `α^c_k = (1/Z)Σ_iΣ_j ∂y^c/∂A^k_ij`.
- Attention: `Attention(Q,K,V) = softmax(QK^T/√d_k)V`.
- Scoring latency: `Δt_ij = t^score_ij − t^kick_ij`; agreement `A = (1/N)Σ_k I(y^ref_k = y^AI_k)`.
- Credal set: `C(x) = {c : p(y=c|x) ≥ θ}`; predictive entropy `H[p(y|x)] = −Σ_c p log p`.
- PSS fusion: (1) `I ≜ s·(α_p x̃_p + α_i x̃_i + α_v x̃_v)`, α sum to 1; (2) interval `[I̲, Ī]`; (3) `p̲ = min_{θ∈Θ} σ(θ^T z+b)`, `p̄ = max_{θ∈Θ} σ(θ^T z+b)`; (4) award iff `I̲ ≥ T_w` **and** `p̲ ≥ τ`.
- Audit: `AuditLog_i = {t_i, x_i, ŷ_i, H_i, DecisionFlow_i}`; override `y^final = y_AI if O_j=0 else y_human`; disparity `Disparity_{i,j} = |E[ŷ|G_i] − E[ŷ|G_j]|`.
Stated assumptions: (i) humans remain final decision-makers (override gate); (ii) lower-bound awarding is the safe rule under drift; (iii) missing joints tolerated (Para); (iv) referee survey trust (N=27) treated as acceptance evidence; (v) simulation results (RL on 1,500 simulated matches) proxy real deployment.

## 5. Features / target
Inputs: multi-angle 120 fps video + PSS sensor streams + pose sequences. Targets: action class (head kick valid/invalid, punches, fouls), scoring validity, Para classification classes (A6/A7/A8…), referee skill levels. Metrics: classification accuracy, review latency, referee trust (Likert), jury override rate, Cohen's κ, fairness parity error, ambiguity flag rate.

## 6. Validation design
Real pilot: 2025 World Cadet Championships, Fujairah — 68 matches, 14 weight classes, 27 certified referees, 6 jury members, single-court deployment parallel to official IVR, Daedo PSS integration, RTX 4090 local inference. Compared against baseline IVR (89.7 s) and historical override rates (2023–2024). Post-event referee/coach surveys. Separate small Para test (4 athletes, noted as not statistically conclusive) and RL simulation (1,500 matches).

## 7. Numerical results / baselines
- **Review time**: 89.7 s (IVR) → 4.6 s (AI-assisted) = **94.8% reduction** (abstract says 85%; the paper's own computation gives 94.8%).
- **Referee trust**: 4.65/5 (93%), N=27; 93% intent to reuse; 87% of referees / 93% of coaches rated assistance "valuable".
- **Accuracy**: 92.7% vs. jury consensus; head-kick detection 92.8% vs. 79.2% human review; transformer variant 92.4% vs. 86.5% CNN-GRU; ST-GCN 94.2% valid head kicks, 89.6% spinning kicks.
- **Jury overrides**: 0.31 → 0.18 = **41.9% relative reduction**; decision consistency +9.1%; jury-decision variance −35%.
- **Latency**: <300 ms end-to-end; 100% uptime over 68 bouts; 326 decisions logged, avg latency 4.7 s, accuracy 91.3%, Cohen's κ = 0.83.
- **Para classification**: 87.3% accuracy, 12.5% ambiguity flags, 2.8 s/athlete; PCA 88.7% expert-panel alignment, 9.5% re-eval triggers.
- **RL**: +6.4% decision agreement, −14.2% false-positive flagging (simulated).
- **Fairness**: demographic parity error 6.2% (M/F); impairment-class consistency 91.7%.
- Model saliency vs. human visual attention overlap: 83%.

## 8. Code / data availability
No public code or dataset link in the text read. Licensed CC BY-NC-ND 4.0. Data is World Taekwondo competition footage (not public).

## 9. Leakage & limitations
- **Wrong sport, wrong task**: single-combat striking sport; head-kick detection, PSS sensors, and Para classification have no NFL analog. The perception stack is unportable.
- **Pilot scale**: single court, 68 matches, one event; the 94.8% figure compares AI-assisted review against full IVR protocol — partly a workflow change, not pure model accuracy.
- **Self-reported trust**: N=27 referee survey by the deploying team — demand characteristics likely inflate the 93%.
- **Para test**: 4 athletes, explicitly "not statistically conclusive".
- **Simulation-heavy extensions**: RL results are from 1,500 simulated matches; many 2.0 modules (federated analytics, certification integration) are roadmap, not deployed.
- **No NFL transfer**: nothing in the paper touches team sports, balls in flight over distance, or multi-agent tactics.

## 10. GSE overlap
No sport overlap and no model overlap — but **strong process overlap** with GSE's most sensitive surface: publicly posting engine picks. GSE already has an approve-desk human gate (x-poster skill) and a trust-no-claims doctrine; this paper supplies the formal machinery the repo lacks: (a) interval-valued confidence with a lower-bound publishing rule, (b) per-decision audit logs with decision-flow provenance, (c) disparity monitoring across subgroups. Per the existing-research map, nothing in the repo formalizes when a pick is safe to auto-post vs. hold for review — this fills that gap. The portable unit is the governance pattern, not the models.

## 11. GSE implementation spec
1. **Credal pick gate**: engine produces a probability interval [p̲, p̄] per pick (ensemble spread or calibrated conformal interval). Auto-post to @GalaxySportsHQ only if **p̲ ≥ τ** (τ ≈ 0.55 for spreads/totals, tuned); otherwise route to the analyst review queue (existing approve-desk). This is the paper's rule (4), translated from points to picks.
2. **Audit log**: every pick decision logged as {timestamp, feature snapshot, point prediction, interval, entropy, decision flow: auto-posted vs. human-overridden} — the paper's AuditLog_i, enabling post-hoc ROI attribution and override analysis.
3. **Disparity monitor**: track realized ROI disparity across bet types (spread/ML/total), teams, and time windows via the paper's Disparity_{i,j} metric; disparity exceeding δ triggers model scrutiny/retraining — the paper's fairness audit, repurposed for model-drift detection.
4. **Explanation for review**: when a pick is held, show the analyst the top contributing features (SHAP or attention analog of the paper's Grad-CAM overlay) — the human-readable "why" the paper's referees got.
5. **Effort**: 2–3 weeks (interval estimation + gate + logging + dashboard; no new models needed).

## 12. Reproducible test
Dataset: 2024 NFL season engine picks with realized outcomes (already in the Neon picks table / repo corpus). Metric: ROI of auto-posted picks under the gate vs. unfiltered; fraction of picks auto-posted vs. routed to review. Baseline: current post-everything behavior.

## 13. Acceptance / rejection gate
**Adopt** the credal pick gate only if backtesting on the 2024 season shows ≥2 percentage points ROI improvement on auto-posted picks vs. unfiltered posting AND ≥60% of picks still clear the gate (the gate must filter, not asphyxiate). **Reject** if the interval estimates are miscalibrated (p̲ ≥ τ picks don't actually outperform) or if review-queue volume exceeds analyst capacity — a gate nobody can staff is worse than no gate.

## 14. Improvement experiment
Go beyond the paper's fixed τ: make the threshold **adaptive to market state** — τ tightens when the engine's recent calibration error is high (its intervals are untrustworthy) and loosens when calibration is good, formalized as τ_t = τ_0 + λ·(recent Brier score − baseline). The paper uses static thresholds throughout. If adaptive τ improves backtested ROI over static τ, GSE gets a self-regulating publishing policy; if not, static τ ships and the experiment cost was one backtest.

# [1869] Enhancing Trajectory Prediction through Self-Supervised Waypoint Noise Prediction (SSWNP) (arXiv:2312.09466)

**Citation:** Pranav Singh Chib, Pravendra Singh (IIT Roorkee) (2023). *Enhancing Trajectory Prediction through Self-Supervised Waypoint Noise Prediction*. arXiv:2312.09466. URL: https://arxiv.org/abs/2312.09466
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
SSWNP is a plug-in self-supervised auxiliary task (noise-prediction + spatial-consistency) that drops into any trajectory-prediction backbone, validated on NBA SportVU player tracking; directly applicable to GSE's ball-carrier trajectory forecasting with a demonstrated 22–38% error reduction.

## 1. Research question
Trajectory predictors collapse onto a narrow interpretation of the data manifold (overly simple/uniform futures). Can a self-supervised auxiliary task — predicting the noise injected into waypoint-perturbed views of the observed trajectory, plus spatial consistency between clean and perturbed views — force the model to learn richer, more diverse representations and improve prediction, including under noisy inputs?

## 2. Dataset / schema
- **NBA SportVU**: player trajectory data from all ten players in live NBA games (teammates heavily influence motion); 5 observed timestamps (2.0 s) → 10 future timestamps (4.0 s).
- **TrajNet++**: 9 observed → 12 future timestamps per agent.
- **ETH-UCY**: pedestrian benchmark (8 observed timestamps standard).
Schema: multi-agent 2D waypoint sequences X_i^{≤t_ob} = {x_i^{t_1},…,x_i^{t_ob}}; future ground truth Y_i.

## 3. Method / model
**Views:** clean view X_i^{≤t_ob} (original); noise-augmented view X̃_i^{≤t_ob} = X_i^{≤t_ob} + Φ_i^{≤t_ob}, Φ = ω·Φ′, Φ′ ∼ N(0,1) per waypoint; noise factor ω (0.05 best on NBA validation).
**Three networks:** feature extractor Θ_fe (backbone encoder: GroupNet's CVAE encoder / AutoBot / SSAGCN / Graph-TERN encoder), trajectory predictor Θ_sup, noise predictor Θ_ss.
**Losses:**
- L_sup = (1/N) Σ_i [ L_tp(Ŷ_i, Y_i) + L_tp(Ŷ̃_i, Y_i) ] — BOTH views must predict the true future (spatial consistency).
- L_ss = (1/N) Σ_i [ MSE(Φ̂_i, 0) + MSE(Φ̃̂_i, Φ_i) ] — predict 0 noise for the clean view, the injected noise for the augmented view.
- L_total = L_sup + λ·L_ss (λ = 0.01 chosen from L_ss convergence plot).
**At test time:** plain prediction Ŷ_i = Θ_sup^⋆(Θ_fe^⋆(X_i^{≤t_ob})) — no overhead.

## 4. Equations & assumptions
- X̃_i^{≤t_ob} = X_i^{≤t_ob} + Φ_i^{≤t_ob}; Φ_i^{≤t_ob} = ω·Φ′_i^{≤t_ob}, Φ′ ∼ N(0,1).
- L_sup, L_ss, L_total as above.
- Assumptions: waypoint-level Gaussian perturbation stays on a plausible motion manifold; forcing identical futures from perturbed views teaches manifold invariance; noise prediction teaches the encoder the fine-grained noise structure; the auxiliary task transfers across backbone families (VAE, Transformer, GCN, goal-based).

## 5. Features / target
Inputs: observed waypoint sequences (clean + noise-augmented). Supervised targets: future trajectories from both views. Self-supervised targets: per-waypoint noise (0 for clean view, Φ for augmented view).

## 6. Validation design
- Plug-in study on 4 backbones: GroupNet (CVAE), AutoBot (Transformer), SSAGCN (graph), Graph-TERN (goal-based); NBA, TrajNet++, ETH-UCY.
- Metrics: minADE / minFDE; relative percentage difference (RD) vs baseline.
- Ablations: (a) B vs B+SC (spatial consistency only) vs B+SC+NP (full SSWNP); (b) noise factor ω sweep; (c) noisy-vs-clean test environments (noise injected at test time).
- Default backbone configurations kept for fair comparison.

## 7. Numerical results / baselines
- NBA, GroupNet+SSWNP: ADE/FDE 1.13/1.69 → 0.903/1.147, RD 22.33/38.28%; B+SC alone 1.018/1.362 (both modules contribute).
- Noise factor ω = 0.05 best on NBA validation (Table VI).
- TrajNet++, AutoBot+SSWNP: 33.8% ADE and 36.4% FDE improvement over baseline.
- ETH-UCY: RD 8.60/14.00% vs B1, 16.60/23.20% vs B2 (ADE/FDE).
- Noisy test environments: baselines "experience a significant performance decline"; SSWNP "demonstrates resilience" (Table VII).
- Baselines: each backbone's own published configuration.

## 8. Code / data availability
No code link stated in extracted text. Datasets: NBA SportVU (via league/Stats), TrajNet++, ETH-UCY (public pedestrian benchmarks).

## 9. Leakage & limitations
- NBA SportVU is 25 Hz optical tracking with known jitter — the noise-robustness result may partly reflect SportVU-specific noise; generalization to 10 Hz NFL RFID tracking untested.
- Exact ADE/FDE table values are figure-rendered (not recoverable from HTML text); reported relative percentages used instead.
- ω and λ are dataset-specific (Table I not text-extractable); retuning needed per domain.
- No multi-step ablations on which waypoints get perturbed (uniform perturbation assumed optimal).
- The paper frames "narrow data manifold" as the problem but provides no direct measurement of prediction diversity — only error metrics.

## 10. GSE overlap
GSE forecasts ball-carrier and player trajectories for prop modeling (rushing yards, catch probability). SSWNP is a drop-in training-time addition to whatever predictor GSE uses — NEW capability, no architecture change at inference. Validated on NBA SportVU, the closest public analog to NFL tracking (10 athletes, adversarial, fast). Distinct from 1862–1868: those learn representations; SSWNP improves a supervised predictor via an SSL auxiliary task — complementary, can be stacked.

## 11. GSE implementation spec
1. Data: NFL 10Hz tracking; ball-carrier observed 1.0 s (10 frames) → predict 2.0 s (20 frames) of future positions.
2. Wrap GSE's trajectory predictor: duplicate each batch into clean + noise-augmented views (ω tuned on validation, start 0.05 in field-normalized units); add noise-prediction head Θ_ss on the encoder; L_total = L_sup + λ·L_ss.
3. Tune λ from L_ss convergence (paper: 0.01); validate ω ∈ {0.01, 0.05, 0.1}.
4. Effort: ~1 engineer-week (training-loop change + one auxiliary head; zero inference overhead).

## 12. Reproducible test
Dataset: 2023–2024 NFL tracking, weeks 1–12 train, weeks 13–18 test. Metric: ADE/FDE of ball-carrier future-trajectory prediction (1.0 s obs → 2.0 s future), SSWNP-trained vs baseline predictor. Robustness test: inject Gaussian jitter at test time (mimicking tracking noise) and compare degradation. Run target: <24h on 1 GPU.

## 13. Acceptance / rejection gate
ADOPT if: (a) SSWNP-trained predictor reduces FDE ≥ 10% vs the same-backbone baseline on held-out weeks, AND (b) under test-time jitter, the SSWNP model's FDE degradation is ≤ half the baseline's degradation. REJECT if neither holds.

## 14. Improvement experiment
Beyond the paper: (1) structured noise — perturb waypoints along the motion direction (speed noise) vs perpendicular (lateral noise) separately, testing which perturbation teaches more useful invariances for football (cuts are lateral; bursts are longitudinal). (2) Adversarial-noise scheduling: increase ω over training (curriculum), testing whether late-training high-noise views further improve robustness without hurting clean accuracy. Hypothesis: lateral-noise SSWNP beats isotropic SSWNP on juke-heavy RB trajectories.

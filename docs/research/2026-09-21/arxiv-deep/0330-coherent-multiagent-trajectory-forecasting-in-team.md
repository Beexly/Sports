# [0330] Coherent Multi-Agent Trajectory Forecasting in Team Sports with CausalTraj (arXiv:2511.18248v2)

**Citation:** Wei Zhen Teoh (2025). *Coherent Multi-Agent Trajectory Forecasting in Team Sports with CausalTraj*. arXiv:2511.18248v2. URL: https://arxiv.org/abs/2511.18248v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 547 lines + appendix training details).
**Verdict:** ADAPT — port the causal MoG forecasting stack and the joint-metric (minJADE/minJFDE) evaluation protocol to NFL tracking data for route/defender trajectory prediction; adapt with richer player–ball covariance than their block-diagonal assumption.

## 1. Research question
Trajectory forecasters in team sports are built and tuned to per-agent metrics (minADE, minFDE), which score each agent's best-of-k prediction independently — even from different scenario samples — so models can look good per-agent yet generate incoherent joint futures. The paper asks: can a temporally-causal, likelihood-based model learn the true joint distribution of multi-agent futures, achieving competitive per-agent accuracy AND state-of-the-art joint accuracy (minJADE, minJFDE) with qualitatively coherent scenario generations?

## 2. Dataset / schema
- **NBA SportVU**: NBA player-movement logs (GitHub linouk23/NBA-Player-Movements). Sequences of 30 frames at 5 Hz: 10 players + ball (N=11 agents); first 10 frames as context, predict next 20. Results scaled 28/94 to convert foot units to metres.
- **Basketball-U** (Xu and Fu 2025): derived from the NBA dataset (Zhan et al. 2019); 50-frame sequences; predict the final 20 frames.
- **Football-U** (Xu and Fu 2025): built from the **NFL Big Data Bowl dataset** (nfl-football-ops/Big-Data-Bowl); 50-frame samples at 10 Hz with 22 players + ball; predict final 20 frames; results in yards.
- Baselines re-evaluated: GroupNet (CVPR'22), LED (CVPR'23), MoFlow default and joint-objective variants (CVPR'25; joint-obj variant reproduced from the official open-source implementation), Sports-Traj (ICLR'25).

## 3. Method / model
Causal likelihood factorization: the model predicts per-timestep displacements `ΔXt+1 = Xt+1 − Xt` and factorizes `p(XP+1:T | X1:P) = ∏_{t=P}^{T−1} p(Xt+1 | X1:t)`. Training is parallelized across timesteps in teacher-forcing fashion; inference samples autoregressively (`X̂t+1 = X̂t + ΔX̂t+1`). Architecture:
1. **Agent history encoder** (per agent, causal): either a **Causal PointNet** (PointNet adapted with lookback max-pooling: MLP → Lb-MaxPool → Concat → MLP → Lb-MaxPool → MLP, causal via zero-padding/sliding-window pooling) or a **Mamba2** module (2-layer MLP projector; 3 Mamba2 layers; dmodel 64, dstate 128, dconv 4, expansion 4, head dim 16, chunk size 32).
2. **Agent embedding**: 3 learned vectors (2 teams + ball) concatenated with encodings, passed through an MLP.
3. **Inter-agent relation encoder**: per-timestep, N transformer blocks (4 blocks, dmodel 128, 8 heads, dff 512) with no cross-temporal attention, followed by N **Spatial Relation Transformer Encoder** blocks (4 blocks, dmodel 128, 8 heads, dff 256) that inject pairwise spatial geometry: mesh tensor `Mt[q,k] = [xq,t − xk,t ; zq,t ; zk,t]` — keys/values projected from these relative-offset rows, so exact Euclidean displacements enter attention.
4. **Scene aggregation & prediction head**: agentwise 1-layer MLP (dim 64) on concatenated features + position/velocity; all agents concatenated at a timestep into one scene representation; 3-layer MLP (dim 768) → prediction head (dim 448) emitting the MoG parameters.
**Output distribution**: mixture of M=8 Gaussians per timestep: `p(ΔXt+1 | X1:t) = Σ_{m=1}^{M} πt+1,m N(ΔXt+1 ; μt+1,m , Σt+1,m)`; per-agent 2×2 covariance blocks parameterized via lower-triangular Cholesky factors `Lt,m,n` with `Σ̂t,m,n = Lt,m,n L⊤_{t,m,n}` (diagonals as `exp(ℓ)`, clamped pre-exponentiation); block-diagonal across agents within each component (conditional independence across agents per component — joint structure carried only by shared mixture weights π).
**Loss**: `LNLL = − Et log Σ_{m=1}^{M} π̂t,m N(Yt ; μ̂t,m , Σ̂t,m)` plus entropy regularizer `Lent = −(1/log M) Σ_m π̂t,m log(π̂t,m + ε)`, total `L = LNLL − λent Lent` with λent = 0.05; log-sum-exp normalization of mixture weights in log space; all log/matrix ops in double precision. **Velocity augmentation**: instantaneous velocity (current-step displacement) as auxiliary input. Optimizer: AdamW with OneCycle schedule, max LR 0.02, weight decay 0.01. Model size: 3.0M params (Causal PointNet), 3.2M (Mamba2) for NBA. 20 scenario samples at inference; k=20 standard.

## 4. Equations & assumptions
Stated equations (copied faithfully):
- `Xi,1:P = [xi,1, xi,2, ..., xi,P] ∈ R^{P×2}`; joint target `p(XP+1:T | X1:P)`.
- `p(XP+1:T | X1:P) = ∏_{t=P}^{T−1} p(Xt+1 | X1:t)`.
- MoG: `p(ΔXt+1 | X1:t) = Σ_{m=1}^{M} πt+1,m N(ΔXt+1 ; μt+1,m , Σt+1,m)`.
- `LNLL = − Et log ( Σ_{m=1}^{M} π̂t,m N(Yt ; μ̂t,m , Σ̂t,m) )`.
- `Lent = − (1/log M) Σ_{m=1}^{M} π̂t,m log(π̂t,m + ε)`; `L = LNLL − λent Lent`.
- Cholesky: `Lt,m,n = [[exp(ℓt,m,n^(11)), 0], [ℓt,m,n^(21), exp(ℓt,m,n^(22))]]`; `Σ̂t,m,n = Lt,m,n L⊤_{t,m,n}`.
- Metric definitions: `minADEk = (1/N) Σ_i min_j (1/F) Σ_{t=P+1}^{T} ‖x̂j_{i,t} − xi,t‖`; `minFDEk = (1/N) Σ_i min_j ‖x̂j_{i,T} − xi,T‖`; `minJADEk = min_j (1/NF) Σ_i Σ_t ‖x̂j_{i,t} − xi,t‖`; `minJFDEk = min_j (1/N) Σ_i ‖x̂j_{i,T} − xi,T‖`.
Stated assumptions: (i) block-diagonal covariance — conditional independence across agents within each mixture component; (ii) best-of-k (k=20) min metrics as evaluation; (iii) ground-truth joint trajectories are "inherently coherent," so low joint error implies coherence; (iv) per-agent accuracy should emerge as a byproduct of capturing the true joint distribution; (v) Football-U/Basketball-U test subsets originally built for imputation are repurposed for full future prediction.

## 5. Features / target
Inputs per agent per timestep: absolute (x, y) positions + instantaneous velocity (displacement from previous step) + learned agent-role embedding (3 classes: team A, team B, ball). Target: joint future displacements of all N agents over F=20 frames (4.0 s at 5 Hz NBA; 2.0 s at 10 Hz football), modeled as a conditional MoG distribution. Prediction horizon: 20 frames; inference draws 20 independent scenario samples.

## 6. Validation design
Three public benchmarks (NBA SportVU, Basketball-U, Football-U) with train/test splits as in prior work (exact split sizes/dates not stated in text). Baselines: GroupNet, LED, MoFlow (default + joint-objective variant reproduced by authors), Sports-Traj. Metrics: minADE20/minFDE20 (per-agent) and minJADE20/minJFDE20 (joint), at horizons 1.0–4.0 s. Ablation study (Table 3) removing the Spatial Relation Transformer Encoder, reducing M=8→1 Gaussian, and restricting inference to component means. No time-ordered splitting discussion; no confidence intervals reported; best-of-20 min metrics throughout.

## 7. Numerical results / baselines
NBA SportVU (Table 1, metres; minADE20/minFDE20 upper block, minJADE20/minJFDE20 lower block):
- 1.0 s per-agent: CausalTraj (Mamba2) **0.14/0.20** (best), C-PointNet 0.15/0.21, MoFlow CVPR'25 0.18/0.25.
- 4.0 s per-agent: MoFlow CVPR'25 0.71/0.87 (best); CausalTraj Mamba2 0.77/1.02; LED 0.81/1.10; GroupNet 0.95/1.22; MoFlow (joint obj.) 0.89/1.32.
- 4.0 s joint: CausalTraj Mamba2 **1.38/2.57** (best recorded), C-PointNet 1.34/2.47 (minJADE best among its own row at 4.0s: 1.34); LED 1.63/2.99; MoFlow CVPR'25 1.69/3.31; GroupNet 2.12/3.72. Joint metrics substantially lower than all baselines at all horizons (e.g., 2.0 s: 0.62/1.21 vs MoFlow 0.80/1.61).
Basketball-U (Table 2, metres): 20-frame per-agent minADE/FDE — CausalTraj Mamba2 0.56/0.71 vs MoFlow 0.50/0.61; joint minJADE/JFDE — CausalTraj Mamba2 **0.97/1.77** vs MoFlow 1.18/2.30, MoFlow joint-obj 1.21/2.34, Sports-Traj 1.52/2.62.
Football-U (Table 2, yards): 20-frame per-agent — MoFlow CVPR'25 0.16/0.27 (best), CausalTraj Mamba2 0.16/0.31; joint — CausalTraj Mamba2 **1.12/2.68** vs MoFlow 1.16/2.82, MoFlow joint-obj 1.19/2.87, Sports-Traj 3.66/3.46.
Ablation (Table 3, Basketball-U 20-frame joint): minJADE20 0.97 (full Mamba2) → 0.99 (no SRTE) → 1.03 (single Gaussian) → 1.05 (component-mean sampling); minJFDE20 1.77 → 1.81 → 1.86 → 2.13. The MoFlow joint-objective variant improved averageJADE but barely moved min-based joint metrics — supporting the claim that loss changes alone don't learn joint structure.
Qualitative (Figures 2–3): CausalTraj scenarios show coordinated directional changes, straight fast ball passes, and strategic positional allocation vs. baseline homogeneity; noted failure modes: ball carrying with unrealistically large ball–player gap, ball–boundary collisions.

## 8. Code / data availability
Code: https://github.com/wezteoh/causaltraj. Project page: https://causaltraj.github.io. Data: NBA player movements (github.com/linouk23/NBA-Player-Movements), NFL Big Data Bowl (github.com/nfl-football-ops/Big-Data-Bowl) via the Xu & Fu (2025) Sports-Traj preprocessing.

## 9. Leakage & limitations
- **Block-diagonal covariance**: zero cross-agent covariance within each component; inter-agent dependence exists only through shared mixture weights. The authors' own failure cases (ball floating far from the carrier) trace directly to this — player–ball coupling is exactly what NFL use cases (ball location given carrier, receiver–defender pairs) need most.
- **Min-of-20 metrics**: best-of-k selection flatters every model; no calibration or coverage metrics (average metrics deliberately avoided as they favor "safe single mode").
- **Short horizons**: 4.0 s at 5 Hz (NBA), 2.0 s at 10 Hz (Football-U) — NFL route development and QB decision-making span 2.5–4+ s at 10 Hz; untested there.
- **No temporal-split validation reported**; no CIs; reproduced (not author-reported) MoFlow joint-obj numbers.
- **Single independent researcher** (acknowledgments note independent research journey) — no independent replication yet; code exists, which mitigates this.
- **External validity to NFL**: only Football-U (NFL Big Data Bowl plays) as evidence; no out-of-sample league/season test.

## 10. GSE overlap
New capability with a strong hook into existing work. Per the existing-research map: GSE has a full NGS/tracking lane — 27-family metric taxonomy inventoried 2026-09-21, STRAIN paper (2305.10262) read in depth, and `2026-09-18-ngs-replacement-spec.md` (build NGS equivalents from public data). The 58-paper dossier set already covers trajectory-diffusion modeling (2503.18589, read in depth). No repo work evaluates joint trajectory forecasts with joint metrics; no causal MoG forecasting stack exists. This is an **extension** of the tracking lane: CausalTraj is the evaluation+modeling protocol the NGS replacement spec lacks for its predictive components (route prediction, defender positioning, ghosting).

## 11. GSE implementation spec
1. **Data**: NFL Big Data Bowl / NGS tracking weeks (nflverse tracking via `nflverse` R/Python or the kaggle Big Data Bowl 2024/2025 sets). Context: snap→2.0 s at 10 Hz; predict next 2.0 s (20 frames) for all 22 players + ball.
2. **Adaptations**: (a) replace block-diagonal covariance with a structured covariance coupling the ball to its nearest carrier/receiver (mixture of "ball-attached" vs "ball-loose" regimes); (b) add play-type/formation embeddings to the 3-class agent embedding; (c) 3–5M param model trains on a single GPU per the paper's sizes.
3. **GSE applications**: (i) **route prediction** — forecast WR/TE trajectories post-snap for separation-at-catch modeling (feeds CPOE/separation features for the props/pick engine); (ii) **ghosting** — compare actual defender trajectories against the joint model's expected coverage distribution to grade coverage busts (inputs to matchup grades, complementing CoverageIQ cards already in the 2026-09-20 tables); (iii) **scenario simulation** for 2-pt/4th-down win-probability extensions.
4. **Evaluation**: port minJADE/minJFDE alongside minADE/minFDE; report per-team-role breakdowns (ball, QB, receivers, defenders).
5. **Effort**: 2–3 weeks (data prep + repo code port + Football-U-scale run); full-covariance ball coupling adds ~1 week.

## 12. Reproducible test
Dataset: NFL Big Data Bowl 2025 (kaggle), passing plays, weeks 1–9 train / weeks 10–18 test (time-ordered). Task: 10 frames context at 10 Hz → predict 20 frames for all 22 players + ball. Metric: minJADE20 and minJFDE20 (yards) plus per-role minADE20 for receivers. Baseline: the paper's Football-U CausalTraj numbers (minJADE20 1.12 / minJFDE20 2.68 at 20-frame horizon) reproduced from their open code as the reference implementation, and a naive constant-velocity extrapolator as the floor.

## 13. Acceptance / rejection gate
**Adopt** (for the NGS-replacement route/coverage module) if a CausalTraj port trained on BDB 2025 weeks 1–9 achieves, on held-out weeks 10–18, minJADE20 within 10% of the reproduced paper baseline AND receiver-role minADE20 beats constant-velocity extrapolation by ≥30%. **Reject** if joint metrics don't transfer (block-diagonal coupling too weak for the ball-carrier problem) or per-role receiver error shows no improvement over extrapolation — in which case the joint-metric evaluation protocol alone is kept as the benchmark standard.

## 14. Improvement experiment
Fix the paper's admitted weakness (ball–player decoupling): replace the block-diagonal covariance with a **regime-conditioned ball covariance** — a small discrete latent per timestep ("ball attached to player i" vs. "ball in flight") that switches the ball's mean/covariance to be a tight function of the carrier's state or a projectile model. Train with the same causal MoG objective. Hypothesis: this eliminates the "floating ball" failure mode and should cut minJFDE disproportionately on passing plays (where ball trajectory is the dominant error term) — testable by stratifying joint metrics on pass vs. run plays, which the paper never does.

# [0380] Learning Group Interactions and Semantic Intentions for Multi-Object Trajectory Prediction (arXiv:2412.15673)

**Citation:** Mengshi Qi, Yuxin Yang, Huadong Ma (2024). *Learning Group Interactions and Semantic Intentions for Multi-Object Trajectory Prediction*. arXiv:2412.15673. URL: https://arxiv.org/abs/2412.15673
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3998 lines).
**Verdict:** ADAPT — tactic-conditioned diffusion trajectory prediction with Banzhaf-interaction semantic intentions is the closest published analog to what NFL tracking-based live win-probability and prop pricing needs; the port requires swapping human-annotated basketball tactics for NGS scheme labels and scaling from 11 to 22 agents.

## 1. Research question
How can group-level interactions (team tactics/strategies) and dynamic semantic intentions be modeled to improve multi-agent trajectory prediction in complex competitive sports? The paper proposes an end-to-end diffusion framework that (a) conditions trajectory generation on team-level tactic labels via classifier-free guidance, and (b) models group interaction as a cooperative game, using Banzhaf Interaction to capture each agent's cooperation tendency toward potential tactics. It also releases an NBA SportVU extension with human-annotated team tactics (7 offensive, 9 defensive classes) as a new benchmark for joint trajectory + tactic prediction.

## 2. Dataset / schema
- **Extended NBA SportVU (new benchmark, public via code repo):** raw SportVU logs from the 2015–16 NBA season (github.com/linouk23/NBA-Player-Movements) resampled to 5 Hz; 90,618 trajectory sequences extracted (30 frames at 5 Hz); visualized as videos and annotated by 25 trained human annotators with 16 team tactic labels (7 offensive: e.g., Pick-and-Roll, Ball Movement, Fast Break, Single; 9 defensive: 5 zone-defense types, Man-to-Man, defensive rebound, defensive transition, scramble). Annotation: one tactic per team for the past 10 frames and the following 20 frames; 8,238 entries (JSON: scene ID, team tactics, time period; .npy trajectories), 11 agents per scene (5 offense + 5 defense + ball). Train: 70%, test: 30%.
- **TeamTrack-basketball and TeamTrack-soccer [68]:** used with unsupervised K-means pseudo-labels (16 clusters) as tactic guidance; observed 3.2 s (96 frames), predict 4.8 s (144 frames).
- Task setup on NBA: observe 2 s (10 frames), predict 4 s (20 frames) for all 11 agents (2D court coordinates). Access: code and data at https://github.com/aurora-xin/Group2Int-trajectory.

## 3. Method / model
Two-fold end-to-end framework:

1. **Interaction Encoder:** Transformer encodes observed trajectories X∈R^{N×T_obs×2} into embeddings A∈R^{N×D_A}; tactic labels L mapped through a learnable tactic-vocabulary embedding matrix W∈R^{V×D_C} (Φ_tactic, Eq. 6), expanded per-agent by team correspondence (Eq. 7); per-agent condition g_i = [a_i ; c_{i,m(i)}] (Eq. 8) concatenating trajectory and tactic embeddings, G = f_ϕ(X, L).
2. **Denoising Module (diffusion trajectory prediction):** transformer diffusion conditioned on G in a classifier-free guidance manner (Eq. 9): f_ε(y,G) = f_ε(y,A) + s_g·(f_ε(y,G) − f_ε(y,A)); tactic info randomly dropped out during training and replaced with raw trajectory embedding A. DDPM reverse step with a leapfrog-style initializer [14] to reduce denoising steps (Eq. 10); 100 diffusion steps; losses: noise MSE (Eq. 11), variety min-over-S distance with S=20 (Eq. 12 dist), initializer uncertainty loss (Eq. 12 unc).
3. **Multi-Grained Feature Enhancement:** global attention over team tokens G_j (Eq. 13) then local attention using ball tokens as keys/values; fusion Ĝ_j via global-as-query over local.
4. **Semantic Intention Prediction Module (auxiliary):** agents + top-k potential tactics treated as players in a cooperative game; exact Banzhaf Interaction is NP-hard so a **Banzhaf Interaction Learner** f(·) = γ_o(SA(γ_ctx(A))) (Eq. 14, MLP–self-attention–MLP) predicts the N×k agent–tactic similarity matrix; supervised by a **Banzhaf Interaction Calculation** module (Eqs. 22–24: bidirectional agent↔tactic masked softmax logits, I_B^j = (S_a2t + S_t2a)/2) with L2 loss (Eq. 15); weighted agent tokens w_j = Fusion(Ĝ_j, I_pred^j) (dot product, Eq. 16) fed to a GAT+MLP tactic head (Eq. 17), top-k tactics via argmax_k (Eq. 18), trained with focal loss (Eqs. 19–21, γ=4.0, class-frequency α).
5. **Total loss** (Eq. 25): L = L_noise + L_distance + η·L_unc + α·(L_tactic + β·L_bi), with η, α, β hyperparameters; game factor set to 0.001.

Implementation: PyTorch, single RTX 3090, Adam. Denoising module: 100 epochs, lr 1e-3 halved every 16 epochs; tactic model: 100 epochs same schedule; two-fold framework: 30 epochs, lr 2e-3 decayed ×0.9 every 32 epochs; s_g = 0.1; tactic prediction rate 1000.

## 4. Equations & assumptions
Key equations (faithful to the paper):

- (1)–(4): standard DDPM forward `q(y_{1:T}|y_0) = ∏ q(y_t|y_{t-1})`, `q(y_t|y_{t-1}) = N(y_t; √(1−β_t)y_{t-1}, β_t I)` and reverse `p_θ(y_{0:T}) = p(y_T)∏ p_θ(y_{t-1}|y_t)`, `p_θ(y_{t-1}|y_t) = N(y_{t-1}; f_ε(y_t,t), β_t I)`.
- (5) Banzhaf Interaction: `I([{i,j}]) = Σ_{C ⊆ N\{i,j}} p(C)[φ(C ∪ [{i,j}]) + φ(C) − φ(C ∪ {i}) − φ(C ∪ {j})]`, p(C) = 1/2^{n−2}.
- (6) `Φ_tactic(l_j^{-T_obs+1:0}) = W[l_j^{-T_obs+1:0}] = c_j ∈ R^{D_C}`; (7) `C_e = [c_{1,m(1)}, …, c_{N,m(N)}]`; (8) `g_i = [a_i ; c_{i,m(i)}]`.
- (9) classifier-free guidance: `f_ε(y,G) = f_ε(y,A) + s_g·(f_ε(y,G) − f_ε(y,A))`.
- (10) DDPM sampling step: `ŷ^τ = (1/√α_τ)(ŷ^{τ+1} − (1−α_τ)/√(1−ᾱ_τ) · ε̂^τ_θ) + √(1−α_τ)·z`, ᾱ_τ = ∏ α_i.
- (11) `L_noise = ‖z − f_ε(y^{τ+1}, τ+1, f_θ(X, L^{-T_obs+1:0}))‖_2`.
- (12) `L_dist = min_s ‖Y − Ŷ_s‖_2`; `L_unc = Σ_s ‖Y − Ŷ_s‖_2/(σ_θ²S) + log σ_θ²`.
- (13) `G_j' = Softmax(QKᵀ/√D_k)V`.
- (14) `I_pred = f(A) = γ_o(SA(γ_ctx(A))) ∈ R^{N×k}`.
- (15) `L_bi = Σ_j ‖I^j_pred − I^j_B‖_2`.
- (16)–(18) `w_j = Fusion(Ĝ_j, I^j_pred)`; `p_j = softmax(MLP(GAT(w_j))) ∈ R^{V×1}`; `l̂_j = argmax_k(p_j)`.
- (19)–(21) focal loss: `L^j_tactic = α^j(1 − p^{tactic}_j)^{γ^j} log(p^{tactic}_j)`.
- (22)–(24) `S_a2t = softmax(S_{a,t} × mask_a[a])`; `S_t2a = softmax(S_{a,t} × mask_t[t])`; `I^j_B = (S_a2t + S_t2a)/2`.
- (25) total loss above.

Assumptions: (a) team tactic is constant within each annotated window (10/20 frames); (b) past tactic labels are observed at inference (in deployment they must be predicted/recognized — the paper's auxiliary head addresses this only for future tactics); (c) best-of-20 evaluation protocol; (d) pseudo-labels from K-means are adequate tactic proxies on TeamTrack; (e) tactic dropout during training yields valid classifier-free guidance.

## 5. Features / target
Input features: observed 2D trajectories of all agents (player x,y positions; basketball included), plus observed group-level tactic labels per team (learned embeddings). Target: (primary) future 2D trajectories of all N agents over T_pred frames — multi-modal (S=20 samples, min-distance variety loss); (auxiliary) future team tactic labels over the prediction window (16-class classification per team). Label definition: human-annotated tactics (NBA) or K-means pseudo-labels (TeamTrack). Horizons: 4 s (NBA, 20 frames @5 Hz), 4.8 s (TeamTrack, 144 frames).

## 6. Validation design
NBA SportVU: 70% train / 30% test split (not stated whether split is by game/sequence — a leakage risk; see §9). No validation-set protocol described beyond the two-fold framework's 30-epoch fine-tune. TeamTrack: following [68]'s protocol. Metrics: minADE/minFDE with best-of-20 samples; Top-1/2/3/5 accuracy for tactic prediction. Baselines — trajectory: S-LSTM, STGAT, GroupNet, MID, LED, SingularTrajectory, SocialCircle (all reproduced/official; some marked † = reproduced); TeamTrack: Linear Velocity, LSTM motion, MID, LED. Tactic: Transformer baseline, Baseline* (one-hot tactics), Pooling*, zero-shot Llama3-8B, LoRA-finetuned Llama3-8B*. Ablations: MLP vs query-based vs diffusion denoising; Banzhaf module on/off and team-level vs scene-level learner.

## 7. Numerical results / baselines
Quoted exactly (§VI-E, Tables I–V):

- **NBA SportVU trajectory (minADE/minFDE):** 1 s: 0.19/0.29; 2 s: 0.39/0.59; 3 s: 0.61/0.86; 4 s: 0.84/1.17. Paper's claim: beats SOTA LED by up to 9.5% and 6% in minADE at 1 s and 4 s respectively (my check: LED 4 s = 0.89/1.24 vs ours 0.84/1.17 → ~5.6% ADE improvement; 1 s: LED 0.21/0.31 vs 0.19/0.29 → 9.5% ADE. Consistent).
- **TeamTrack-soccer (ADE/FDE at 1.2/2.4/3.6/4.8 s):** ours 0.23/0.45, 0.58/1.10, 1.00/1.89, 1.48/2.72; beats LED by 15.4% ADE and 9.6% FDE at 4.8 s. **TeamTrack-basketball:** 0.42/0.72, 0.88/1.44, 1.31/2.05, 1.72/2.78; beats LED by 14.4% ADE and 30.3% FDE at 4.8 s.
- **Tactic prediction (Top-1/2/3/5 %, Table III):** Baseline 34.56/59.77/73.78/88.53; Baseline* 53.31/71.64/81.99/91.78; Pooling* 55.22/75.82/86.05/94.67; Llama3-8B 22.39 (Top-1 only); Llama3-8B* 38.17 (Top-1 only); **Ours 60.23/81.15/90.53/96.79**. Paper claims +5 pp Top-1 over Pooling* and +22 pp over finetuned Llama3-8B.
- **Ablation denoising (Table IV, minADE/minFDE):** MLP-based at 4 s: 5.28/8.71; query-based: 1.24/1.63; diffusion: 0.84/1.17.
- **Ablation Banzhaf (Table V):** without BI: Top-1 58.44; with BI team-level 60.09; scene-level 60.23 (≈+2 pp Top-1/Top-2, consistent across Top-5).
- **Qualitative (§VI-F):** on man-to-man transitions the model's predicted defensive trajectories mirror offensive movement where LED places defenders too far apart; the ball has the highest Banzhaf interaction (~0.285) for both teams.

## 8. Code / data availability
Code and data: https://github.com/aurora-xin/Group2Int-trajectory (stated in abstract). Dataset access details are in the repo. Hyperparameters are documented in §VI-C and the supplement (some, e.g. the exact meaning of "tactic prediction rate is set at 1000", are underspecified in the main text).

## 9. Leakage & limitations
- **Split protocol unclear:** 70/30 split on extracted sequences with no statement that it is game-disjoint. SportVU sequences drawn from the same game share players, scores, and strategy — sequence-level random splits leak near-identical context into test (adversarial concern, not addressed).
- **Annotation bias:** 25 annotators assigning one tactic per window from visualized trajectories; inter-annotator agreement statistics are not reported, and tactic-window stationarity is assumed, not tested.
- **Human tactics are not available at live inference:** the primary task conditions on *observed* tactic labels; a production system must first *recognize* the current tactic from raw trajectories — the paper predicts only future tactics, leaving a recognition gap for deployment.
- **Best-of-20 evaluation** flatters multi-modal generators versus deterministic baselines on the same metric (standard in the field, but it is data-snooping-adjacent when comparing to single-mode baselines like Linear Velocity).
- **Pseudo-labels on TeamTrack:** K-means movement clusters are validated only via t-SNE visuals and "generalizability in the supplementary material" — a weak stand-in for real tactics.
- **Banzhaf "supervision" is self-referential:** the calculation module (Eqs. 22–24) is a masked-attention heuristic, not a true characteristic-function game — calling it Banzhaf ground truth is a naming stretch; the learner is supervised by a heuristic, not a game-theoretic oracle.
- **External validity to NFL:** continuous-flow basketball/soccer vs. discrete-play NFL; NFL prediction windows are seconds (live props, in-play WP) or full-play outcomes, not 4 s player paths; 11 agents → 22 players + ball; tactics in NFL are partially observed via NGS scheme classifications rather than human annotation.

## 10. GSE overlap
Read `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Relevant: (a) **NGS 27-family taxonomy** inventoried 2026-09-21, including 2026 additions **Run Scheme Classification** and **Route Classification 2.0** — these are exactly the kind of group-level tactic labels this paper conditions on, and GSE already has them as structured data (no human annotation needed); (b) **diffusion trajectory modeling (2503.18589)** already absorbed as a standout — this paper extends that family with tactic-conditioning and Banzhaf intentions; (c) **STRAIN (2305.10262)** read — tracking-data metric work; (d) **2026-09-18 NGS replacement spec** — building equivalents from public data. No repo work currently does multi-agent trajectory forecasting conditioned on scheme labels, nor game-theoretic agent-importance modeling. Status: **extension** — it builds on the already-absorbed diffusion trajectory family and the NGS taxonomy, adding (i) tactic-conditioned generation and (ii) tactic prediction as an auxiliary task.

## 11. GSE implementation spec
- **Data:** NFL NGS tracking (all 22 players + ball, 10 Hz) joined to nflverse play data; tactic labels per team per play from NGS Route Classification 2.0 (offense), NGS Run Scheme Classification, and FTN charting (coverage shells, blitz tags) — replacing the paper's human annotations.
- **Task reformulation:** observe frames −T_obs..0 of a play (e.g., 2 s post-snap), predict remaining player trajectories to play end + classify the play's scheme/coverage (auxiliary). The in-play use: update expected play outcome / live prop pricing as trajectories unfold.
- **Model:** replicate the paper's architecture (interaction encoder + CFG diffusion with s_g=0.1 + Banzhaf learner), scaled to N=23 agents; tactic vocabulary = NGS scheme/coverage classes. Train per the paper's schedule (Adam, 1e-3 halved every 16 epochs, RTX-3090-class GPU) — effort ~2 engineer-weeks for the data join, 1 week for the model port, 1 week for evaluation.
- **Serving:** offline batch scoring of plays for scheme-consistency features and live inference for in-play products; diffusion with 100 steps is too slow for real-time — distill or use the leapfrog initializer aggressively, or fall back to the query-based variant for latency-sensitive paths.
- **Consume:** predicted trajectories → live EPA expectation features; Banzhaf values → which players drive a scheme (e.g., which receiver's movement most influences the coverage call) — usable for matchup analysis content.

## 12. Reproducible test
Dataset: 2024 NFL regular season NGS tracking, plays weeks 1–14 train / 15–16 validation / 17–18 test, game-disjoint splits; condition on NGS Route Classification 2.0 + Run Scheme labels observed at snap (t=0), observe post-snap frames 0–20 (2 s), predict frames 21–60 (4 s) for all 23 agents. Metric: minADE/minFDE (best-of-20) on test. Baseline: LED-style diffusion *without* tactic conditioning (or the paper's query-based variant). Auxiliary metric: Top-1/Top-3 scheme-classification accuracy vs. a Transformer+MLP baseline. Runnable: NGS tracking + labels all in-house.

## 13. Acceptance / rejection gate
**Adopt if** the tactic-conditioned model beats the unconditioned diffusion baseline by ≥8% minADE on the weeks 17–18 test window AND auxiliary scheme classification Top-1 ≥ 55% (paper's basketball analog: 60.23%); **reject if** either fails, or if conditioning gains vanish when tactics are *recognized* (not given) — run a second variant where the observed tactic label is replaced by a predicted one, and reject if that variant's gain over the baseline is <3%. The tactic-recognition variant is the production-realistic one; the paper only reports the given-tactics variant, so this gate is stricter than the paper's own result.

## 14. Improvement experiment
Beyond the paper: **counterfactual tactic conditioning for live pricing.** The paper generates trajectories under the observed tactic; for NFL live betting, generate trajectories under *counterfactual* schemes (e.g., "what do the trajectories look like if the defense were in Cover 2 instead of the recognized Cover 3?") and measure the divergence of expected play outcome between the factual and counterfactual rollouts. This turns the model into a scheme-sensitivity engine: plays where the outcome is highly tactic-sensitive get wider live-prop uncertainty bands. Technically: sample S trajectories per counterfactual tactic via the CFG mechanism (Eq. 9 already supports swapping G), score each with a play-outcome head trained on NGS, and report ΔE[outcome]. This goes beyond the paper's prediction task into decision-theoretic live pricing — directly monetizable for GSE's in-play products.

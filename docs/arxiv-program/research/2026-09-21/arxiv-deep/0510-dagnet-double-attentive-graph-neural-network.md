# [0510] DAG-Net: Double Attentive Graph Neural Network for Trajectory Forecasting (arXiv:2005.12661v2)

**Citation:** Alessio Monti, Alessia Bertugli, Simone Calderara, Rita Cucchiara (2020). *DAG-Net: Double Attentive Graph Neural Network for Trajectory Forecasting*. arXiv:2005.12661v2. URL: https://arxiv.org/abs/2005.12661v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 9 pages / 49,464 chars).
**Verdict:** ADAPT — the goal-conditioned VRNN + dual attentive-GNN architecture is directly portable to NFL Next Gen Stats player-tracking trajectory forecasting (route/rush prediction), though the paper's basketball/drone domains and goals-as-grid-cell framing need re-mapping to NFL plays.

## 1. Research question
Can multi-agent trajectory forecasting be improved by a recurrent generative model that jointly models (a) each agent's future goals (destination intents) and (b) mutual interactions between agents, using two separate graph-attention mechanisms — one distilling future-goal relationships, one distilling recurrent hidden-state interactions?

## 2. Dataset / schema
- **STATS SportVU NBA Dataset**: player tracking from the 2016 NBA regular season, 1,200+ games. Camera-based bird-eye positions of all 10 players (5 attackers, 5 defenders) + ball. Games split into offensive plays: each play starts when the ball crosses mid-court and ends on a made/missed shot, out-of-bounds, interception, or shot-clock expiry. Each play = 50 time-steps at 5 Hz, positions in (x,y,z) world coordinates; normalized, zero-centered to mid-court, all plays oriented toward the right basket. Offense and defense modeled separately.
- **Stanford Drone Dataset (SDD)**: top-down drone video of 8 college campus scenes with pedestrians, bikes, skateboarders, cars, buses. Uses the TrajNet benchmark version; trajectories in (x,y) world coordinates at 2.5 FPS; training set split into train/val/test (test annotations unavailable).
- Access: both proprietary/licensed datasets (SportVU via STATS Perform; SDD public benchmark). No code/data links stated in paper.

## 3. Method / model
Backbone: Variational Recurrent Neural Network (VRNN) used in a predictive (not generative) setting. Per timestep: encoder q_φ(z_t|x_{≤t},z_{<t}) = N(μ_{z,t}, σ²_{z,t}) from displacement embedding φ^x(x_t) + previous hidden state h_{t−1}; decoder p_θ(x_t|x_{<t},z_{≤t}) = N(μ_{x̂,t}, σ²_{x̂,t}) from latent embedding φ^z(z_t) + h_{t−1}; prior p_θ(z_t|x_{<t},z_{<t}) = N(μ_{0,t}, σ²_{0,t}) from h_{t−1} alone (used at generation time when encoder is detached); GRU recurrent update h_t = φ^rnn(x_t, z_t, h_{t−1}). Trained by maximizing the sequential ELBO. All positions converted to relative displacements (Δx_t, Δy_t) before feeding.
Goal conditioning: top-down scene divided into a macro-area grid; agent i's goal g^i_t = one-hot cell the agent will land in, extracted from ground truth via a sliding window of size w capturing a goal every w timesteps. Prior, encoder, decoder all conditioned on g_t. A Goal-Net φ^goal predicts goals at inference from previous goal g′_{t−1}, concatenation d_{t−1} of other agents' absolute positions, and h_{t−1}: g′_t = φ^goal(g′_{t−1}, d_{t−1}, h_{t−1}). ELBO gains a cross-entropy term −Σ_k g^k_t log(g′^k_t) over the K grid cells.
Double attentive GNN: (1) Goal-relationships GNN: at each timestep, predicted goals g′_t of all agents are graph nodes; attentive GNN produces distilled goal g̃_t; refined goal ĝ_t = W(g′_t ∥ g̃_t), W a learned d×d matrix (d = grid cells), replacing g′_t in the ELBO. (2) Interaction GNN: each agent's hidden state h_t is a graph node; edges weighted by self-attention plus a distance-based adjacency matrix; output distilled hidden state h̃_t; refined hidden state ĥ_t = H(h_t ∥ h̃_t), H learned, used as the next timestep's hidden state.
Training protocol: during training the network sees the full T = T_obs + T_pred ground-truth sequence (so late-timestep features are available); at validation/test it burns in on T_obs observations then predicts T_pred steps.
Hyperparameters: GRU cell, 1 recurrent layer, hidden dim 64, latent dim 32; per graph, 2 attentive GNN layers (first reduces to lower-dim, second returns to input dim), 4 attention heads each. Adam. Urban setting: lr 1e−4, batch 16, CE weight 1e−2, graph inter-layer dim 4, 500 epochs. Sports setting: lr 1e−3, batch 64, CE weight 1e−2, inter-layer dim 8, 300 epochs.

## 4. Equations & assumptions
Key equations (copied faithfully, notation condensed from the extract):
- Encoder: μ_{z,t}, σ_{z,t} = φ^enc(φ^x(x_t), h_{t−1}); q_φ(z_t|x_{≤t}, z_{<t}) = N(z_t | μ_{z,t}, (σ_{z,t})²)  (Eq. 1–2)
- Decoder: μ_{x̂,t}, σ_{x̂,t} = φ^dec(φ^z(z_t), h_{t−1}); p_θ(x_t|x_{<t}, z_{≤t}) = N(x_t | μ_{x̂,t}, (σ_{x̂,t})²)  (Eq. 3–4)
- Prior: μ_{0,t}, σ_{0,t} = φ^prior(h_{t−1}); p_θ(z_t|x_{<t}, z_{<t}) = N(z_t | μ_{0,t}, (σ_{0,t})²)  (Eq. 5–6)
- RNN: h_t = φ^rnn(x_t, z_t, h_{t−1})  (Eq. 7)
- ELBO: E_{q_φ(z_{≤T}|x_{≤T})}[Σ_t log p_θ(x_t|z_{≤t},x_{<t}) − D_KL(q_φ(z_t|x_{≤t},z_{<t}) ∥ p_θ(z_t|x_{<t},z_{<t}))]  (Eq. 8)
- Goal-conditioned: μ_{0,t},σ_{0,t}=φ^prior(h_{t−1},g_t); μ_{z,t},σ_{z,t}=φ^enc(φ^x(x_t),h_{t−1},g_t); μ_{x̂,t},σ_{x̂,t}=φ^dec(φ^z(z_t),h_{t−1},g_t)  (Eq. 9–11)
- Goal prediction: g′_t = φ^goal(g′_{t−1}, d_{t−1}, h_{t−1})  (Eq. 12); ELBO with goal CE: −Σ_k g^k_t log(g′^k_t)  (Eq. 13)
- Goal refinement: ĝ_t = W(g′_t ∥ g̃_t)  (Eq. 14); hidden refinement: ĥ_t = H(h_t ∥ h̃_t)  (Eq. 15)
- ADE = Σ_i Σ_t √(((x̂^i_t,ŷ^i_t)−(x^i_t,y^i_t))²) / (|P|·T_pred)  (Eq. 16); FDE same at t=T_pred  (Eq. 17)
Stated assumptions: agents' goals are well-described as one-hot grid cells; displacement representation (relative to previous position) is sufficient; training on full ground-truth sequences then burning in at test is valid (no train/test protocol leakage concern raised); offense/defense must be trained separately because roles are "intrinsically different"; distance-based adjacency captures proximity influence; the sliding-window goal extraction (window w, value unstated) yields meaningful intents.

## 5. Features / target
- Inputs: per-agent per-timestep relative displacements (Δx_t, Δy_t) in meters/feet; agent absolute positions of all other agents (for goal prediction); predicted one-hot goal grid cells (for GNN refinement); Euclidean distance-based adjacency between agents.
- Target: future absolute (reconstructed from predicted displacements) positions x^i_t over T_pred timesteps. Prediction horizons: basketball — 10 observed steps → 40 predicted steps at 5 Hz (long-term evals: 10→10/20/30/40 and 20→10/20/30); SDD — 8 observed → 12 predicted (3.2s history, 4.8s future at 0.4s/step).

## 6. Validation design
- Metrics: ADE (average displacement error) and FDE (final displacement error), in feet (basketball) and meters (SDD).
- Baselines: STGAT, Social-Ways, Weak-Supervision (Zhan et al.), C-VAE (Felsen et al., long-term only); internal ablations: Vanilla VRNN vs A-VRNN (interaction GNN only) vs full DAG-Net.
- Splits: basketball — train/val/test splits of the SportVU plays (exact counts unstated); SDD — TrajNet training set split 3 ways (train/val/test) because test annotations are unavailable. Training sees full sequences; test uses burn-in + prediction. No time-ordered splitting described for the 2016 NBA season (plays presumably shuffled). No confidence intervals reported.

## 7. Numerical results / baselines
SportVU results, Table I (ADE/FDE in feet, 10 obs / 40 pred): ATK — STGAT 9.94/15.80; Social-Ways 9.91/15.19; Weak-Supervision 9.47/16.98; DAG-Net 8.98/14.08. DEF — STGAT 7.26/11.28; Social-Ways 7.31/10.21; Weak-Supervision 7.05/10.56; DAG-Net 6.87/9.76. DAG-Net best in all four cells.
Long-term evals, Table II (ADE, 20 obs; 20-10/20-20/20-30 splits): ATK — C-VAE 3.95/5.80/7.08 vs DAG-Net 2.09/4.58/6.66; DEF — C-VAE 3.01/4.10/4.98 vs DAG-Net 2.05/4.07/5.01.
SDD results, Table III (ADE/FDE meters): STGAT 0.58/1.11; Social-Ways 0.62/1.16; DAG-Net 0.53/1.04. (Weak-Supervision not runnable on SDD due to fixed-agent architecture.)
Ablations, Table IV (SportVU ADE/FDE): ATK — Vanilla VRNN 9.41/15.56; A-VRNN 9.48/15.52; DAG-Net 8.98/14.08. DEF — Vanilla 7.16/10.50; A-VRNN 7.05/10.34; DAG-Net 6.87/9.76. Table V (SDD): Vanilla 0.58/1.17; A-VRNN 0.56/1.14; DAG-Net 0.53/1.04. Paper's interpretation: interaction GNN alone helps marginally; the goal-conditioned component drives most of the gain.

## 8. Code / data availability
None stated in paper (no code link, no dataset download links; datasets identified by citation only).

## 9. Leakage & limitations
- Training sees full T_obs+T_pred ground-truth sequences including future information; only at test time is the burn-in/predict protocol used. This train/test protocol mismatch is acknowledged as a design choice ("collect important features also from latest time-steps") but invites representation leakage — the encoder learns with future context it will never have at inference.
- Goals are extracted from ground-truth futures via a sliding window (w unstated); at inference the Goal-Net predicts them, but the paper does not quantify goal-prediction accuracy separately — a broken Goal-Net would silently degrade the conditioned decoder.
- Test ADE/FDE reported without confidence intervals, statistical tests, or seed variance; the SOTA margin over STGAT (e.g., 0.05m ADE on SDD) is thin and may not survive replication.
- SportVU split counts and temporal ordering unstated; plays shuffled across the 2016 season risks leakage across games (e.g., same teams' set plays appearing in train and test).
- External validity to NFL: basketball plays are continuous 10-second half-court possessions with 5Hz tracking; NFL plays are discrete ~5-second bursts with resets between snaps and NGS tracking at 10 Hz. The "goal" concept (offensive destination) maps to route endpoints, but NFL defenders react to scheme keys, not just proximity — distance-based adjacency undersells assignment football. Also NFL tracking data is not public, so GSE cannot directly replicate the data side.
- No multi-modal evaluation: only point predictions scored (ADE/FDE on mean trajectory), despite the paper's emphasis on multi-modality — the generative model's diversity is never measured (no min-over-K or NLL reported).

## 10. GSE overlap
Checked against `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Related-but-distinct from: trajectory-diffusion modeling (2503.18589, Drive dossiers), GNN sports outcomes (2207.14124), STRAIN tracking metric (2305.10262), and the NGS 27-family taxonomy + NGS-replacement spec (repo 2026-09-18/2026-09-21). None of these implement multi-agent goal-conditioned trajectory generation on player tracking; GSE has no tracking-data sequence model at all (NGS data is proprietary and the replacement spec builds metric equivalents from public data). This paper is therefore a NEW CAPABILITY candidate in the tracking/modeling lane: structured trajectory forecasting with explicit intent (goal) nodes. It maps to the existing map's gap-area on tracking-data methodology that reproduces NGS-style insights.

## 11. GSE implementation spec
- Data: NFL Next Gen Stats tracking (if GSE obtains access) — per-play 10 Hz (x, y, speed, acceleration, orientation) for 22 players + ball, snapped to play start/end. Fallback: any publicly available NFL tracking sample (Big Data Bowl datasets) for a proof-of-concept.
- Feature engineering: convert to relative displacements; define NFL "goals" not as grid cells but as semantically meaningful intents: route endpoint for receivers (from charting or inferred), ball-carrier target yardline, defender assignment target. Grid-cell one-hot can be retained as a secondary coarse goal (end-zone-relative field zones).
- Model: reimplement the three-part architecture — VRNN backbone (GRU-64, latent-32), Goal-Net (route-intent predictor), dual attentive GNNs (goal-relationship refinement + hidden-state interaction refinement). Train offense and defense separately per the paper (or by position group).
- Training protocol: season walk-forward (train on seasons ≤2023, test 2024+); burn-in on pre-snap + first 1s, predict remaining play. Loss = sequential ELBO + goal CE.
- Serving: per-play batch inference in the tracking pipeline; outputs feed route-completion probability and expected-YAC models.
- Estimated effort: ~3–4 weeks for a Big Data Bowl proof-of-concept; ~2 months with NGS-scale data and GNN tuning.

## 12. Reproducible test
Dataset: NFL Big Data Bowl public tracking sample (or any GSE-accessible NGS play set), plays with full 22-player tracks. Metric: ADE/FDE in yards at end of play, plus min-over-20-samples ADE (proper multi-modal scoring the paper omitted). Baselines: Vanilla VRNN (no GNNs, no goals) and A-VRNN (interaction GNN only) — the paper's own ablations — plus a constant-velocity Kalman baseline. Time window: all plays in the sample; report offense (ball-carrier + receivers) and defense separately, mirroring the paper's ATK/DEF split.

## 13. Acceptance / rejection gate
ADOPT (proceed to NGS-scale build) if full DAG-Net beats Vanilla VRNN by ≥10% relative ADE on the ball-carrier/receiver set AND beats A-VRNN (isolating the goal-conditioning contribution) — on a held-out season's plays; REJECT otherwise. Secondary gate: min-over-20 ADE must also improve (no mode-collapse), else REJECT even if mean ADE wins.

## 14. Improvement experiment
Replace the grid-cell goal with a hierarchical intent: a discrete route-type/assignment classifier (slant, go, curl, zone-drop, man-match) feeding a continuous endpoint regressor, and condition the GNN refinement on the play-call/scheme embedding (formation + personnel). Hypothesis: NFL trajectories are scheme-driven, so conditioning on the *called concept* rather than an anonymous grid cell will sharpen the goal prior and beat anonymous grid cells on receiver ADE — testing whether structured football knowledge beats the paper's environment-invariant design.

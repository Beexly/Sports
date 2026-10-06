# [1870] Social NCE: Contrastive Learning of Socially-aware Motion Representations (arXiv:2012.11717)

**Citation:** Yuejiang Liu, Qi Yan et al., EPFL (2020). *Social NCE: Contrastive Learning of Socially-aware Motion Representations*. arXiv:2012.11717. Code: https://github.com/vita-epfl/social-nce. URL: https://arxiv.org/abs/2012.11717
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
Socially-informed negative sampling for contrastive motion representation learning (negatives = locations occupied by OTHER agents) transfers to NFL interaction modeling: a ball-carrier cannot occupy a defender's position, and encoding that prior as contrastive negatives teaches contact-aware trajectory representations.

## 1. Research question
Training data for multi-agent motion contains only "positive" safe behaviors — no collisions, no near-misses. Can a self-supervised social contrastive loss with domain-informed negative sampling teach motion representations the social norms (e.g., two agents cannot occupy one location) that pure supervised forecasting fails to learn, reducing collision rates without interactive data collection?

## 2. Dataset / schema
- **ETH/UCY**: 5 subsets of real pedestrian trajectories; 8 obs steps (3.2 s) → 12 future steps (4.8 s).
- **TrajNet++**: interaction-centric benchmark; sub-categories Avoidance, Group, Overall.
- **Crowd navigation simulator** [15]: robot + 5 simulated pedestrians; imitation learning on 5k expert (SARL) demonstration episodes (200 epochs, avg of last 10 checkpoints); Rainbow DQN RL with dense reward [86]; offline RL on 30k logged episodes (10k online + 5k×4 free explorations at K∈{500,1000,3000,5000}).
Schema: agent positions s_t^i = (x_t^i, y_t^i), joint state s_t = {s_t^1,…,s_t^M}.

## 3. Method / model
**Encoder–decoder:** h_t^i = f(s_{1:t}, i) (sequential module f_S + interaction module f_I), ŝ_{t+1:T}^i = g(h_t^i).
**Social-NCE loss (InfoNCE variant):** query q = ψ(h_t^i) (2-layer MLP projection of history embedding); key k = φ(s_{t+δt}^i, δt) (2-layer MLP event encoder); positive key = ground-truth future location + noise ε∼N(0, 0.05·I); N = 8(M−1) negative keys via **social sampling**: s_{t+δt}^{i,n−} = s_{t+δt}^j + Δs_p + ε, j ≠ i, Δs_p = (ρcosθ_p, ρsinθ_p), θ_p = pπ/4, p=0…7; ρ = 0.2 m (forecasting) / 0.6 m (navigation). Horizons δt ∈ Λ = {1,…,4}; τ = 0.1; embeddings normalized to unit sphere, 8-dim.
**Full objective:** L(f,g,ψ,φ) = L_task(f,g) + λ·L_SocialNCE(f,ψ,φ).
**Key design contrast:** random negatives (uniform in space) add no social information and can worsen performance; social negatives encode the prior "one location, one agent."

## 4. Equations & assumptions
- L_NCE = −log[ exp(sim(q,k⁺)/τ) / Σ_n exp(sim(q,k_n)/τ) ]; sim = cosine similarity.
- L_SocialNCE = −log[ exp(ψ(h_t^i)·φ(s_{t+δt}^{i,+},δt)/τ) / Σ_{δt∈Λ} Σ_{n=0}^N exp(ψ(h_t^i)·φ(s_{t+δt}^{i,n},δt)/τ) ].
- L = L_task + λ·L_SocialNCE.
- Assumptions: future occupancy of neighbors is knowable at training time (privileged info); the social-comfort prior (ρ-radius exclusion) is a valid negative definition across agents; contrastive representation learning (not output penalization) avoids late-training ineffectiveness of collision penalties; negatives from other agents' futures generalize to the primary agent's counterfactuals.

## 5. Features / target
Inputs: history observations of all agents. Task targets: future trajectories (MSE/NLL) / navigation actions. Contrastive targets: positive future event vs 8(M−1) synthetic negative events per horizon.

## 6. Validation design
- **Forecasting:** Social-STGCNN, Trajectron++ on ETH/UCY (Top-20 FDE + collision rate COL); Social-LSTM, Directional-LSTM on TrajNet++ interaction sub-categories. Compared Vanilla vs Random-negatives vs Social-NCE; implemented in official public code without architecture changes.
- **Imitation learning:** 5k-demo crowd navigation; metrics navigation time, collision rate, reward; demo-size sweep for data efficiency; sampling-horizon ablation (single vs multi).
- **RL:** Rainbow DQN, 8 seeds, reward learning curves; offline RL on 10/25/50/100% of 30k-episode dataset, 10 seeds, normalized scores.

## 7. Numerical results / baselines
- ETH/UCY: Social-NCE cuts collision rate 37.0% (Social-STGCNN) and 45.7% (Trajectron++) vs vanilla, with top-20 FDE on par.
- TrajNet++: collision-rate reduction 9.5%–37.5% across sub-categories; Directional-LSTM+Social-NCE becomes the most robust model on the public benchmark.
- Imitation learning: ~69% collision-rate reduction vs vanilla (λ=0.1); random negatives worsen the policy; markedly better in low-demo regimes (Figure 5).
- Rainbow DQN: vanilla needs >4000 episodes to reach reward 0.6; Social-NCE reaches it in <2000 episodes and attains a collision-free policy faster (τ=0.2, λ=1.0); slight final-performance gain.
- Offline RL: Social-NCE "substantially narrows" the online–offline gap and matches the best vanilla baseline using only a fraction of the data (τ=0.2, λ=0.1).
- Multi-horizon (δt 1–4) beats single-horizon.

## 8. Code / data availability
Code: https://github.com/vita-epfl/social-nce. Datasets: ETH/UCY, TrajNet++ (public); crowd-navigation simulator open-sourced [15].

## 9. Leakage & limitations
- Pedestrian-scale geometry (ρ = 0.2 m); football contact distances and tackling intent differ qualitatively from pedestrian comfort zones.
- Privileged future-neighbor information is only available at training time — fine for representation learning, unusable at inference.
- Exact table values (Top-20 FDE, Table 3/4 numbers, demo-size curve values) are figure-rendered; relative percentages reported instead.
- Offline-RL "fraction of data" claim truncated in extraction ("using only…" — value not recovered).
- No test on adversarial multi-agent settings where contact is the GOAL (tackling), which inverts the social-comfort prior.

## 10. GSE overlap
GSE's trajectory models predict ball-carrier paths without explicit contact physics; defender-proximity is a feature, not a learned representation constraint. Social-NCE's negative-sampling prior maps directly: a ball-carrier's future location cannot coincide with a defender's future location — except at tackle events, which are themselves the prediction target. NEW capability: contact-aware motion representations learned without labeled tackle data. Distinct from 1862–1869: the only contrastive method in this lane that injects domain knowledge through negative design rather than augmentation.

## 11. GSE implementation spec
1. Data: NFL 10Hz tracking; primary agent = ball-carrier; neighbors = 11 defenders (+ nearby blockers).
2. Train GSE's trajectory forecaster with Social-NCE: positive key = ball-carrier's true future location (+noise); negatives = 8 angular samples around each defender's future location at radius ρ ≈ 0.5–1.0 yd (tuned); horizons δt ∈ {1,…,4} frames (0.1–0.4 s); τ = 0.1; λ tuned (start 0.1).
3. Exclude tackle frames from negative sampling (contact is the positive event there) or invert the prior on labeled tackle frames.
4. Effort: ~1.5 engineer-weeks (event encoder + sampling code on top of existing forecaster; training-time only).

## 12. Reproducible test
Dataset: 2023–2024 NFL tracking, weeks 1–12 train, weeks 13–18 test. Metric A: ball-carrier trajectory FDE at 1.0 s, Social-NCE vs vanilla vs random-negatives. Metric B: "impossible-trajectory rate" — fraction of predicted frames placing the ball-carrier within 0.5 yd of a defender's actual future position (a football collision-rate analog). Run target: <48h on 1 GPU.

## 13. Acceptance / rejection gate
ADOPT if: (a) impossible-trajectory rate reduced ≥ 25% vs vanilla with FDE no worse than +2%, AND (b) random negatives do not beat Social-NCE (sanity check that the prior, not just contrast, drives the gain). REJECT if (a) fails.

## 14. Improvement experiment
Beyond the paper: (1) role-aware negatives — sample negatives only around defenders (not blockers), and weight by defender's closing speed, testing whether intent-aware negatives beat uniform social sampling. (2) Tackle-frame inversion: on charted tackle frames, treat the defender's location as a POSITIVE key (contact intended), learning a representation that distinguishes evasion frames from contact frames. Hypothesis: role-aware + inversion beats plain social sampling on yards-after-contact prediction.

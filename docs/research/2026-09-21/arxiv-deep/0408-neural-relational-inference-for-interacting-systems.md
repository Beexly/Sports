# [0408] Neural Relational Inference for Interacting Systems (arXiv:1802.04687v2)

**Citation:** Thomas Kipf, Ethan Fetaya, Kuan-Chieh Wang, Max Welling, Richard Zemel (2018). *Neural Relational Inference for Interacting Systems*. arXiv:1802.04687v2. URL: https://arxiv.org/abs/1802.04687v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 4,150 lines, including appendices).
**Verdict:** ADAPT — the paper's motivating example is literally basketball player tracking, and its payoff for the NFL is direct: coverage scheme (man vs. zone vs. match) IS a latent interaction graph over the 22 players, and NRI infers such graphs unsupervised from trajectories. Unsupervised coverage/blocking-assignment inference from NGS tracking is a new capability for GSE.

## 1. Research question
Can we simultaneously learn (a) the discrete interaction graph of a multi-agent dynamical system and (b) the dynamical model itself, purely from observed trajectories, with no supervision on the interactions? The paper introduces Neural Relational Inference (NRI): a variational autoencoder whose latent code is the interaction graph and whose decoder is a graph neural network. Tests on simulated physics (springs, charged particles, Kuramoto oscillators), CMU motion capture, and NBA SportVU pick-and-roll tracking.

## 2. Dataset / schema
- **Physics simulations**: 50k train / 10k val / 10k test trajectories; N ∈ {5, 10} particles; springs (Hooke's law, leapfrog integration, p=0.5 connection), charged particles (Coulomb forces with clipping, attract/repel), Kuramoto phase-coupled oscillators (RK4 integration, Eq. 20). 49-step trajectories; test extended 20 more steps for prediction eval.
- **CMU Motion Capture Database**: subject #35 walking; 31 3D joint trajectories; 11/4/7 train/val/test trials; 8,063 frames total; position + velocity, normalized to max abs 1.
- **NBA SportVU pick-and-roll**: 12k PnR segments from the 2016 season (10k/1k/1k), 25 frames (4 s) each, **5 nodes: ball, ball handler, screener, and each player's defensive matchup**; encoder sees first 17 steps, decoder predicts all 25.

## 3. Method / model
1. **VAE formulation**: ELBO (3): L = E_{q_φ(z|x)}[log p_θ(x|z)] − KL[q_φ(z|x) ‖ p_θ(z)]. Latent z_ij = discrete one-hot edge type between objects i, j; factorized uniform prior (or sparsity-encouraging prior with "non-edge" type up-weighted, e.g. 0.91/0.03).
2. **Encoder** (5–8): GNN on the fully-connected graph — f_emb per-node trajectory embedding → v→e (f_e¹ on [h_i¹, h_j¹]) → e→v (f_v¹ over summed incoming edges) → v→e (f_e²) → softmax(h²_{(i,j)}) = q_φ(z_ij|x). Two message-passing rounds let edge embeddings use whole-graph context. MLP or 1D-CNN-with-attentive-pooling blocks.
3. **Discrete sampling**: Gumbel-softmax / concrete relaxation (9): z_ij = softmax((h²_{(i,j)} + g)/τ), τ = 0.5 in training; discrete categorical at test time.
4. **Decoder** (10–12): separate MLP f̃_e^k per edge type — h̃^t_{(i,j)} = Σ_k z_{ij,k} f̃_e^k([x_i^t, x_j^t]); μ^{t+1}_j = x_j^t + f̃_v(Σ_{i≠j} h̃^t_{(i,j)}); p(x_j^{t+1}|x^t, z) = N(μ_j^{t+1}, σ²I). Learns only Δx.
5. **Anti-degeneracy**: predict M = 10 steps into the future (feeding predicted means back, with periodic teacher-forcing jumps) so a decoder that ignores z is heavily penalized; plus the per-edge-type MLPs make z hard to ignore.
6. **Recurrent decoder** (13–17): GRU over [MSG^t_j, x^t_j] with hidden state h̃^t_j for non-Markovian data (motion capture, basketball); output μ^{t+1}_j = x^t_j + f_out(h̃^{t+1}_j).
7. Training: Adam, lr 0.0005 (×0.5 every 200 epochs), batch 128, 500 epochs (200 for mocap), concrete τ = 0.5, teacher forcing every 10th step; checkpoint on validation path-prediction MSE.

## 4. Equations & assumptions
- GNN message passing (1–2): h^l_{(i,j)} = f_e^l([h^l_i, h^l_j, x_{(i,j)}]); h^{l+1}_j = f_v^l([Σ_{i∈N_j} h^l_{(i,j)}, x_j]).
- ELBO (3): L = E_{q_φ(z|x)}[log p_θ(x|z)] − KL[q_φ(z|x)‖p_θ(z)].
- Decoder factorization (4): p_θ(x|z) = Π_t p_θ(x^{t+1}|x^t,…,x^1, z).
- Encoder (5–8) as above; concrete sample (9): z_ij = softmax((h²_{(i,j)} + g)/τ), g ∼ Gumbel(0,1).
- Markovian decoder (10–12); recurrent decoder (13–17); reconstruction estimate (18): −Σ_j Σ_{t≥2} ‖x^t_j − μ^t_j‖²/(2σ²); KL = Σ_{i≠j} H(q_φ(z_ij|x)) for uniform prior (19).
- Stated assumptions: (i) dynamics factorizable as pairwise interactions of K discrete types; (ii) graph static during training (authors' own flagged limitation — dynamic re-evaluation only at test time); (iii) factorized edge posterior (no joint structure over edges); (iv) fixed Gaussian observation noise σ²; (v) for the multi-step trick, periodic jumps back to ground truth don't create artifacts (recurrent variant avoids this by only predicting the last M steps).

## 5. Features / target
Input features: per-object trajectories (2D/3D position + velocity; Kuramoto: dφ/dt, sin φ, ω). Target: (a) unsupervised — the latent edge types themselves (evaluated against ground truth in simulation); (b) future trajectory MSE over 1/10/20 predicted steps, encoder conditioned on the first 49 steps (17 for NBA). Prediction horizon: up to 20–50 steps beyond the encoder window.

## 6. Validation design
- **Edge recovery** (Table 1): unsupervised accuracy vs. ground-truth graphs; baselines: Corr.(path) (thresholded trajectory-feature correlations), Corr.(LSTM) (correlations of per-trajectory LSTM hidden states), NRI(sim.) (encoder trained through the differentiable ground-truth simulator), Supervised (encoder trained with true labels — the "gold standard", cf. Santoro et al. 2017).
- **Path prediction** (Table 2): MSE at 1/10/20 steps; baselines: Static (x^{t+1} = x^t), LSTM(single) (per-object), LSTM(joint) (concatenated), NRI(full graph) (decoder on fully-connected graph, no edge types — cf. Watters et al. 2017), NRI(true graph) (decoder with ground-truth graph — cf. Battaglia et al. 2016).
- **Real data**: mocap — same path-prediction baselines + dynamic graph re-evaluation (re-run encoder each test step); NBA PnR — LSTM vs. full-graph vs. NRI, plus interpretation of learned edge-type distributions (Figure 8).
- **Ablations** (appendix): empty-graph detection (98.4%), 3-edge-type springs (99.2%), qualitative Kuramoto phase analysis, NBA trajectory visualizations.

## 7. Numerical results / baselines
- **Edge recovery, 5 objects** (Table 1): Springs — NRI(learned) **99.9%** (supervised 99.9%; correlation baselines ~52%); Charged — **82.1%** (supervised 95.0%; baselines ~54–56%); Kuramoto — **96.0%** (supervised 99.7%). 10-object results degrade gracefully (springs 98.4%, charged 70.8%, Kuramoto 75.7%). Charged-particle MSE is near the true-graph model despite 82% edge accuracy — distant particles' weak interactions barely affect prediction.
- **Path prediction** (Table 2): NRI(learned) beats both LSTM baselines at 10–20 steps on all three physics tasks (e.g., springs 20-step: 2.13e-5 vs. LSTM(joint) 7.02e-4); LSTM wins only at 1-step on Kuramoto (smooth waveform continuation) but "goes out of sync" long-term while NRI holds phase.
- **Motion capture** (Figure 6): NRI beats full-graph and LSTM baselines on long-term prediction; **dynamic graph re-evaluation significantly improves** over static; learned graph beats the anatomical skeleton graph (surprising); a 4-edge-type model finds an interpretable hand↔opposite-extremities edge (Figure 7).
- **NBA pick-and-roll** (Figure 6): NRI beats LSTM, on par with full graph; learned edges separate **ball + ball handler (off-ball) from the other three players** (Figure 8) — "an important semantic structure" discovered unsupervised. Predictions remain semantically reasonable even when wrong (e.g., predicting a defender going over the screen when the truth was a switch — Figure 11).

## 8. Code / data availability
PyTorch implementation: **https://github.com/ethanfetaya/nri** (encoder/decoder code snippets in Appendix C). Simulation code described in Appendix B (springs/charged in PyTorch, Kuramoto via Laszuk 2017). SportVU data via the Toronto Raptors/NBA (not public); CMU mocap public.

## 9. Leakage & limitations
- **Static graph during training** — the authors' own headline limitation; football interactions (man/zone rotations, blocking engagements) are dynamic, so the NFL use must adopt the dynamic re-evaluation trick (test-time only in the paper) or extend training.
- **Factorized edge posterior** ignores joint structure (e.g., a defender can't man-cover two receivers) — structured constraints would help the football case.
- **Encoder sees the future it predicts from**: trained on first 49 steps, tested predicting steps 50–69 — fair, but the NBA setup (encoder on 17, predict 25) required careful train/test alignment the authors had to hand-engineer.
- **Charged-particle instability**: force clipping kills gradients in the differentiable-simulator baseline — a warning about gradient-based training through stiff dynamics.
- **No uncertainty on edges beyond the categorical posterior**; edge-type ordering is arbitrary (accuracy computed under best permutation).
- **NFL transfer caveats**: 22 players + ball = 506 directed edges/frame at 10 Hz — the paper's 5-node/25-frame regime is 2 orders of magnitude smaller; sparse priors and subsampling are mandatory. Also, football "interactions" include ball-less coordination (zone drops), which pairwise trajectory coupling captures only weakly.

## 10. GSE overlap
Extension/new capability — the highest-upside method in this wave. Per the existing-research map, **coverage classification is descriptive** (charted labels, coverage-shell stats) and nothing infers defensive structure unsupervised from tracking. NRI's framing maps onto football's deepest latent structure: **man vs. zone coverage is literally a latent interaction graph** (man = defender↔receiver edges; zone = defender↔area/teammate edges), as are **OL–DL blocking engagements** and **route-combination coordination**. The map has no latent-graph inference over NGS tracking anywhere. This also composes with this wave's other ADAPTs: NRI-inferred coverage graphs become the state representation for the double-team RL policy (0407), and the per-edge-type dynamics are the natural parent of the QB–receiver chemistry factors (0406).

## 11. GSE implementation spec
Build **CoverageGraph**: NRI on NGS tracking to infer per-play defensive interaction graphs.
1. Nodes: 22 players + ball; features: position, velocity, plus role indicators (offense/defense, position group). Frames: snap to throw (or snap + 3 s), subsampled to 5 Hz; encoder window = first 1.5 s, decoder predicts the rest (the paper's NBA 17/25 split, football-ified).
2. K = 4 edge types with a sparsity prior on "non-edge" (paper's 0.91/0.03 setting): hypothesized semantics — man-match edge, zone-neighbor edge, blocking-engagement edge, non-edge. Let the model discover them; validate semantics against charted man/zone labels post hoc.
3. Train on 2022–2023 charted seasons (nflverse + NGS), recurrent decoder (football is non-Markovian — routes depend on play design history), dynamic graph re-evaluation at test (the mocap trick) for in-play rotation.
4. Products: (a) **unsupervised coverage classifier** — the inferred graph's edge-type histogram as a man/zone/match feature, benchmarked against charted labels (expected: high agreement, plus discovery of match-coverage subtleties charting misses); (b) **blocking-engagement graphs** for OL/DL evaluation content ("who actually got beat 1-on-1 vs. doubled"); (c) trajectory-prediction quality as the intrinsic metric.
5. Effort: ~4–6 weeks (data pipeline 2 wks — 22-node sequences are heavy; model training + eval 2–4 wks). GPU required.

## 12. Reproducible test
Two-stage, mirroring the paper's simulation→real protocol: (1) **synthetic validation** — generate 2D "football-like" trajectories with known interaction graphs (man-follow, zone-anchor, blocker-engage rules) and verify unsupervised edge recovery ≥90% (the paper's Table 1 test; success = near-supervised accuracy as on springs); (2) **real NGS test** — train on 2022–2023, evaluate on 2024: trajectory-prediction MSE at 1/10/20 frames vs. LSTM(single), LSTM(joint), and full-graph baselines (the paper's Table 2 test), PLUS extrinsic validation: do the inferred edge types agree with charted man/zone labels above chance (adjusted Rand index / accuracy vs. a majority baseline)? Success = beats LSTM baselines on prediction AND edge semantics align with charted coverage (the "Figure 8" interpretability check, football-ified). Time window: 2024 holdout; data: nflverse + NGS tracking.

## 13. Acceptance / rejection gate
**Adopt** CoverageGraph if (a) the synthetic test recovers planted graphs at ≥90% (the method works at football-like scale/density), AND (b) on 2024 NGS data it beats the LSTM baselines on 10–20-frame prediction MSE AND its edge types classify charted man/zone above the majority baseline with a clear margin. Then it becomes GSE's coverage-inference layer feeding matchup previews ("this defense actually plays 68% match-zone, not the charted man") and the 0407 double-team policy's state representation. **Reject** if synthetic recovery fails (pairwise edges can't capture football coordination — the zone-drop caveat bites), or if edge types don't align with any football semantics (clusters are uninterpretable — the model is fitting noise). Reject fast on (a): don't burn GPU weeks on real data if the synthetic test fails.

## 14. Improvement experiment
Fix the paper's headline limitation — static graphs in training — with a **dynamic NRI**: make z_ij a per-time-step latent with a Markov prior (z^t_ij | z^{t−1}_ij), trained with the concrete relaxation through time (a structured-VAE extension). Football needs this: a defender can start in zone and convert to man (match coverage), which static NRI cannot represent. Test on 2024: does dynamic NRI beat static NRI (with test-time re-evaluation) on 20-frame prediction MSE AND produce temporally coherent edge trajectories (few flickers)? If yes, dynamic becomes the production spec — and the moment of edge-type switching ("zone→man conversion at 1.8 s") becomes a new event type for GSE's coverage analytics, something neither charting nor the original paper can produce.

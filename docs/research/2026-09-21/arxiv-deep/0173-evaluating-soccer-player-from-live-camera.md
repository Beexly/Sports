# 0173 Evaluating Soccer Player: from Live Camera to Deep Reinforcement Learning (arXiv:2101.05388v1)

**Citation:** Garnier, P., & Gregoir, T. (2021). *Evaluating Soccer Player: from Live Camera to Deep Reinforcement Learning*. arXiv:2101.05388v1. URL: https://arxiv.org/abs/2101.05388v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 926 extracted lines, read 0–926, incl. supplementary material pp. 12–17).
**Verdict:** ADAPT — the Expected Discounted Goal (EDG) idea (a self-play-learned, discounted state-value function that needs zero real match data, with uniform credit assignment over the actions leading to a goal) is portable to NFL play valuation as a critique of and complement to EPA/WPA; the tracking pipeline itself is soccer-specific and not directly transferable.

## 1. Research question
Can soccer players be evaluated end-to-end from a single live camera by combining (a) an open-source player/ball tracking model that outputs 2D field coordinates, with (b) a new player-action valuation, Expected Discounted Goal (EDG), that is learned purely by deep reinforcement learning in simulated soccer games — with no training on real soccer data and no human guidance — and does EDG produce more meaningful valuations than existing data-driven frameworks (EPV, VAEP)? (Abstract, Sections 1, 3.2.)

## 2. Dataset / schema
Three custom datasets built by the authors from 2014 World Cup, Premier League, Ligue 1, and La Liga images (Sections 4.3.1, B.1; Table B.1 dataset table):

- **Tracking dataset:** 480 train / 60 validation / 60 test images (1024×1024 inputs), labeled with bounding boxes for players, referees, and ball.
- **Homography dataset:** 874 train / 159 test images (1280×720), outputs 3×3 homography; built by extending the 2014 World Cup dataset of Homayounfar et al. (2017).
- **Keypoints dataset:** 463 train / 46 validation / 59 test images (320×320), 28 field keypoints each with a binary mask (Figure 3).
- **RL training data:** none real — the EDG agent trains only in the Google Research Football simulation environment (Kurach et al. 2019), a Gym-style environment (Section 4.2).
- Access: authors state models, code, and datasets "will be released at https://github.com/DonsetPG/narya" (Section 4). Release status at publication time: stated as forthcoming, not independently verified in this session. No public URL for the datasets beyond the promised repo.

## 3. Method / model
Two-part system, code-named "Narya" (Sections 3–4, Figure 2):

- **Tracking model (3 steps):**
  1. **ET (entity tracking):** Single Shot MultiBox Detector (SSD, Liu et al. 2016) via GluonCV; input 512×512; 2 classes (players incl. referees, ball); m = 100 predictions per image with confidence values. Definition: ET: R^{n×n×3} → R^{m×4} × [0,1]^m × [0,1]^m.
  2. **HE (homography estimation):** two models — (a) ResNet-18 (Keras) predicting coordinates of 4 control points (Jiang et al. 2019 style) rather than H directly; (b) EfficientNet-b3 backbone + Feature Pyramid Network predicting 28 binary keypoint masks (segmentation-models lib), then solving for H from keypoint correspondences. Both predictions cross-checked to remove outliers.
  3. **REID (re-identification):** ResNet-50 embedding (Torch), embedding dim 751 (kept from Market-1501 pretraining; authors note a smaller size might be better per Zheng et al. 2019), not finetuned on soccer; tracklets linked by embedding distance + bounding-box IoU, each with a Kalman filter for motion prediction and embedding update.
  - Training: homography models 200 epochs, batch 32, lr 1e-4 with exponential decay to 1e-8; tracking 100 epochs, batch 2, lr 1e-3; Adam; augmentation: horizontal flip, Gaussian noise/shadows, brightness/contrast/saturation jitter, motion blur; Tesla P100, "a few hours" each (Section 4.3.1).
- **EDG model (3.2, 4.2):** PPO (Schulman et al. 2017) with Impala policy architecture (Espeholt et al. 2018) in Google Research Football. State s ∈ R^{72×96×16}: "Super Mini Map" stacked 4 times (last 4 positions) × 4 channels (home team, away team, ball, active player), binary {0,255}. Actions (Table B.1, 19 total): 8 movement directions, sprint/stop-sprint, stop-moving, short/long/high pass, shot, slide, dribble, stop-dribble, do-nothing; movement actions sticky. Reward r ∈ {−1, 0, 1} (concede / nothing / score).
- **Training (4.3.2):** start from Google's pretrained agent (50M steps vs easy bot) → 50M steps vs medium bot → 50M steps self-play vs latest self, twice. Hyperparameters (Table C.1): learning rate 0.000343, discount γ = 0.993, 8 parallel environments, 8 minibatches/epoch, 4 updates/epoch, batch size 1024, Adam; clipping range 0.08, entropy coefficient 0.003, GAE 0.95, gradient-norm clipping 0.64, 16 actors, 2 epochs/update, value-function coefficient 0.5.

## 4. Equations & assumptions
Equations extracted cleanly from the PDF (no garbling observed):

- Cumulative discounted reward: R(τ^{t_0:K}) = Σ_{n=0}^{K} γ^n r_{t_n}, γ ∈ [0,1] (Section 3.2).
- Expected Discounted Goal (state value): V^π(s) = E_{τ ∼ π_θ}[R(τ) | s] — "the discounted expected number of goals the team will score (or concede) from a particular state."
- Objective: J(θ) = E_{τ ∼ π_θ}[R(τ)]; θ* = argmax_θ E[R(τ)]; update θ ← θ + λ ∇_θ J(θ).
- Policy gradient (footnote 3, log-probability trick): ∇_θ J(θ) = E_{τ ∼ π_θ}[ Σ_{t=0}^{T} ∇_θ log(π_θ(a_t | s_t)) R(τ) ].
- Homography (Supp. A): X_2 = H X_1 with H 3×3, h_33 = 1 (8 DOF); yields x_2 = (h_11 x_1 + h_12 y_1 + h_13)/(h_31 x_1 + h_32 y_1 + 1), y_2 = (h_21 x_1 + h_22 y_1 + h_23)/(h_31 x_1 + h_32 y_1 + 1); linearized to A h = 0 with h = [h_11,h_12,h_13,h_21,h_22,h_23,h_31,h_32]^T; need ≥ 4 point correspondences (8 constraints).
- **Assumptions:** game state fully captured by entity coordinates (no player identity/skill in state); single-agent control (one player acts, rest are environment); simulated physics/behavior transfers to real soccer; reward only at goals (±1); discount γ = 0.993 chosen so a goal 100 frames later is worth ≈ 0.5 (0.993^100 ≈ 0.5, paper's number); penalties/shootouts and extra time not modeled; tracking homography treated as ground truth input to EDG at inference.

## 5. Features / target
- **Tracking:** input = RGB broadcast frames (512×512 for ET; 280×280 crops → 256×256 for direct homography; keypoint masks); target = bounding boxes + class (player/ball), 3×3 homography / 28 keypoint masks, player identity embeddings.
- **EDG:** input = state s ∈ R^{72×96×16} (binary super-mini-map, 4 stacked frames); target = value estimate V^π(s) (the EDG) and policy π_θ(a|s) over 19 discrete actions. Reward r ∈ {−1,0,1} at goal events; effective horizon ≈ 100 frames (≈0.5 weight) given γ = 0.993.
- **Prediction horizon:** EDG is an indefinite-horizon discounted value (not fixed-horizon); the discount localizes credit to actions within ~100 frames of a goal.

## 6. Validation design
- **Tracking:** homography metric = IoU between field warped by estimated vs ground-truth homography (Table 1, 2014 World Cup dataset, vs 6 prior methods); detection metric = mAP at IoU > 0.5 (Table 2); keypoint masks = IoU/F1 (Table 3); REID = no metric available (no soccer re-ID dataset) — evaluated by counting manual corrections per action.
- **EDG:** agent strength = average goal difference vs opponent at each training stage (Table 4); EDG quality = qualitative comparison against EPV (Fernández 2019) and VAEP (Decroos et al. 2019) on the same scenarios those papers published, since the authors "do not have access to their training procedures or their data" (Section 5.3) — no shared quantitative benchmark; agreement measured on sign of action impact and relative magnitudes (Figures 8–9).
- **Baselines:** for homography — Citraro et al. 2020, Sharma et al. 2017, Jiang et al. 2019, Homayounfar et al. 2017, PoseNet, SIFT (Table 1); for detection — VGG16 vs ResNet50 backbones (Table 2); for EDG — EPV and VAEP qualitatively, plus an "easy-bot-only" agent ablation (Figure 7 right, Figure C.4).
- Splits: 480/60/60, 874/159, 463/46/59 image splits (above); temporal ordering not applicable (images, not sequences, for training; tracking evaluated on short action clips).

## 7. Numerical results / baselines
Exact numbers from the paper:

- **Table 1 (homography IoU, mean / median):** OURS 0.908 / 0.921; OURS keypoints 0.892 / 0.923; OURS direct 0.891 / 0.906; Citraro et al. 2020 with players 0.939 / 0.955 (best); without players 0.905 / 0.918; Sharma et al. 2017 (synthetic dictionary) 0.914 / 0.927; Jiang et al. 2019 (learned errors) 0.898 / 0.929; Homayounfar et al. 2017 (branch and bound) 0.83 / –; PoseNet 0.528 / 0.559; SIFT 0.170 / 0.011. Authors: "good enough for our purpose."
- **Table 2 (SSD detection AP):** VGG16 — player 89.3, ball 39.5, mAP 64.4; ResNet50 — player 89.9, ball 59.3, mAP 74.6. "The Average Precision for the player class is about 90%"; ball AP "does not get higher than 60%" (small size, occlusions).
- **Table 3 (keypoint masks IoU / F1):** FPN+EfficientNet-b3 0.882 / 0.91 (best); FPN+ResNet18 0.862 / 0.885; FPN+ResNet50 0.841 / 0.863; UNet 0.817 / 0.831; LinkNet 0.813 / 0.828.
- **Table 4 (agent average goal difference):** Step 1 vs easy bot 8.14; Step 2 vs medium bot 4.7; Step 3 vs end-of-Step-2 self 5.3; Step 4 vs end-of-Step-3 self 4.8. "Not only does the Agent learn to beat easy and medium bots, but it also learns more complex dynamics while training against itself."
- **REID manual effort (5.1):** delete 3.5 trajectories/action (≈ 1 per 60.57 frames / 3 seconds), merge 5 trajectories/action, manually add 3.75 coordinates/action (mostly ball at critical moments).
- **EDG findings (5.2–5.3):** γ = 0.993 → goal 100 frames later worth ≈ 0.5; assist/goal value split 35%/65% in EDG vs 10%/90% in EPV/VAEP ("value of a goal is much more uniformly distributed"); EPV and EDG "always agree on the positive or negative impact of an action"; VAEP agrees "when the surrounding is not too impactful"; EDG gives negative value to a pass VAEP rates positively when 2 opponents press the receiver (Figure 8); easy-bot-only agent "attribute[s] on average the same potential to every location" — self-play is what creates spatial structure (Figure 7 right).

## 8. Code / data availability
Stated: "Models, code, and datasets will be released at https://github.com/DonsetPG/narya" (Section 4). No other links. Per the paper the release was forthcoming at publication; live status not verified in this session. Datasets are custom-built (no third-party URL).

## 9. Leakage & limitations
- **Sim-to-real gap:** EDG never sees real soccer; Google Research Football physics, stamina, and bot behaviors are approximations. Authors' own caveat: "finetuning the Agent on Expert Data from real games could help to bridge the gap" (Section 6).
- **Single-agent control:** one player controlled per rollout; the other 21 are environment — team coordination value is not learned (authors propose multi-agent as future work).
- **No player heterogeneity:** "The EDG does not take into account the different physical capabilities of each player, thus underestimate[s] the potential the team attack's speed" (Figure 6 caption).
- **No quantitative EPV/VAEP benchmark:** comparison is qualitative on published scenarios because data/procedures were unavailable — the "similar or even more accurate" claim (abstract) rests on visual agreement, not a metric.
- **REID unevaluated:** embedding model pretrained on Market-1501 (person re-ID), not finetuned on soccer; 3.5 deletions + 5 merges + 3.75 manual additions per action means the pipeline is not hands-free.
- **Small tracking datasets** (~600 labeled images per task) and documented failure modes: ID switches on occlusion merges, new IDs when players leave/return to frame (Figure 5).
- **Discount horizon is a choice, not derived:** γ = 0.993 (≈100-frame half-credit) is asserted as reasonable, not tuned against a downstream objective.
- **External validity to NFL:** no NFL analog of Google Research Football exists (full-physics 11v11 sim); the tracking stack is soccer-field-specific. The transferable asset is the valuation concept, not the pipeline.

## 10. GSE overlap
Per existing-research-map: nothing on tracking, reinforcement learning, self-play, EPV/VAEP-style action valuation, or simulation-learned state values exists in Garrett's corpus — the map's value-model inventory covers EPA/play, WPA, CPOE, xG (player/position-adjusted, 2301.13052) and QBR-type composites, all data-fitted, none RL/self-play based. GSE's engine already consumes EPA/WPA-style play values from nflverse-derived pipelines. This paper is a **new capability direction** (simulation-learned discounted state value with uniform credit assignment) that critiques how EPA/WPA concentrate credit on terminal plays — directly relevant to GSE's play-valuation and player-credit models, but with no duplication risk.

## 11. GSE implementation spec
NFL adaptation of EDG ("Expected Discounted Points", EDP):

1. **Environment:** no full NFL sim exists; build a lightweight drive simulator from nflverse 2015–2025: state = (down, distance, yardline, score diff, time, timeouts, roster-strength features); transition model = empirical next-state distribution per (state, play-call category) or a fitted gradient-boosted transition model; reward = points scored on drive end (discounted). This is the pragmatic stand-in for Google Research Football.
2. **Agent:** PPO (stable-baselines3) controlling play-call selection (run/short pass/deep pass/etc. × direction) against a scripted defensive policy, then self-play (offense vs defense agents). State encoding mirrors the paper's stacked binary maps: field discretized into zones × last-4-plays history.
3. **EDP extraction:** the learned V^π(s) is the discounted expected points of a game state — compare its credit assignment (how value spreads over the plays of a drive) against EPA's terminal-play concentration, mirroring the paper's 35/65 vs 10/90 finding.
4. **Player credit:** attribute ΔEDP across plays to on-field personnel groupings (EPA-plus-minus style) for an "undervalued player" detector in the Beane/Graham spirit of the paper's introduction.
5. **Serving:** batch — EDP table per game-state computed offline; real-time lookup for live win-probability/prop edges. Effort: 2–3 weeks for the transition-model sim, 1–2 weeks for PPO/self-play, 1 week for the EPA-comparison study. Data: nflverse (free).

## 12. Reproducible test
Dataset: nflverse play-by-play 2018–2024. Build the drive-level transition simulator on 2018–2022, train the PPO agent, extract EDP(s) for all game states. Test on 2023–2024: (a) calibration — bin predicted EDP vs realized discounted drive points, check calibration curve slope ∈ [0.95, 1.05]; (b) predictive validity — team-level mean EDP/play as a feature predicting second-half-season point differential, vs EPA/play baseline; (c) credit-spread audit — replicate the paper's assist/goal analysis: share of drive value credited to non-scoring plays under EDP vs EPA. Baselines to beat: nflfastR EPA/WPA.

## 13. Acceptance / rejection gate
**Adopt** the EDP framework if, on the 2023–2024 holdout: (i) EDP is well-calibrated (slope 0.95–1.05) AND (ii) team mean EDP/play predicts rest-of-season point differential with R² ≥ EPA/play R² + 0.02, OR (iii) the credit-spread audit shows EDP systematically reallocating ≥ 20% of drive value from scoring plays to setup plays while maintaining (i). **Reject** (stay with EPA/WPA) if EDP fails calibration, underperforms EPA/play on (ii), or the PPO policy collapses to degenerate play-calling (e.g., > 90% one play type) indicating the simulator is too crude to learn from. Gate set before any run.

## 14. Improvement experiment
Beyond the paper: replace single-agent control with **multi-agent PPO** (one policy per offensive skill position, shared team reward) in the drive simulator — the paper itself flags this as its top extension. Test whether position-specific value functions (QB-EDP vs WR-EDP vs OL-EDP) produce a player-credit ranking that predicts future team performance better than aggregate EDP or EPA-plus-minus, i.e., a learned, simulation-grounded alternative to plus-minus regression. Second, close the sim-to-real loop the paper leaves open: fine-tune the agent's value head on real nflverse drives (behavioral cloning warm-start + TD fine-tuning) and measure whether the fine-tuned EDP beats pure-simulation EDP on the calibration test in Section 12 — a direct test of the paper's "pure simulation suffices" claim in a domain where real data is abundant.

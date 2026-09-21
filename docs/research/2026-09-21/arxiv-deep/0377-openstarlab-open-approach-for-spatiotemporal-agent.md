# [0377] OpenSTARLab: Open Approach for Spatio-Temporal Agent Data Analysis in Soccer (arXiv:2502.02785v2)

**Citation:** Calvin Yeung, Kenjiro Ide, Taiga Someya, Keisuke Fujii (2025). *OpenSTARLab: Open Approach for Spatio-Temporal Agent Data Analysis in Soccer*. arXiv:2502.02785v2. URL: https://arxiv.org/abs/2502.02785
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2810 lines, through references).
**Verdict:** ADAPT — not for the soccer models (LEM/Seq2Event/NMSTPP are soccer event predictors, irrelevant to NFL), but for the **framework pattern**: a unified event schema (UIED) + per-timestep state-action-reward schema (SAR) + standardized next-event and multi-agent RL benchmark harness is exactly the infrastructure GSE needs to make its play-by-play + NGS tracking data model-ready. Adopt the schema design ideas; port nothing soccer-specific.

## 1. Research question
Can an open-source framework democratize soccer spatio-temporal agent-data analysis by (a) standardizing event/tracking data across providers (UIED, SAR formats), (b) providing event annotation tooling (STE Label Tool), and (c) shipping standardized event-prediction (Event package) and multi-agent RL (RLearn package) pipelines with benchmarks?

## 2. Dataset / schema
- **Event modeling:** Wyscout 2017/18 Premier League (open access, Pappalardo et al.) and purchased StatsBomb 2023/24 La Liga (380 matches, not publishable per terms); 60/20/20 train/val/test.
- **RL:** 55 matches of 2019 Meiji J1 League tracking+event data (Data Stadium Inc., per Nakahara et al. 2023); 50/5/45 split; attack sequences segmented 50–300 frames.
- **UIED format:** standardized pitch 105×68 m, attack left→right; variables: match_id, poss_id, team, action (mapped across GRF/StatsBomb/Wyscout/DataStadium; short/long pass split at 45 m), success, goal, scores, period/minute/second/seconds, delta_T, start_x/y, deltaX/Y, distance, dist2goal, angle2goal; markers end_of_possession/period_over/game_over.
- **SAR format:** per-frame state-action-reward; center-origin coords (−52.5..52.5, −34..34); player x/y, velocity, acceleration computed; event+tracking synced on frame_id; attack_history_num segmentation.
- **Packages:** PreProcessing (github.com/open-starlab/PreProcessing), Event (github.com/open-starlab/Event), RLearn (github.com/open-starlab/RLearn), STE Label Tool (PyQt5, github.com/open-starlab/Event_Data_LabelTool). Note: same `open-starlab` org as paper 0374's TrackID3x3 group — shared ecosystem, cite together.

## 3. Method / model
- **Event package:** implements Seq2Event (transformer encoder + MLP decoder), NMSTPP (neural marked spatio-temporal point process decoder, CE+RMSE loss), LEM_1/LEM_3 (3 independently-trained MLPs predicting action/time/location sequentially from 1 or 3 prior events), FMS (transformer decoder foundation model), MAJ baseline; Optuna hyperparameter tuning via YAML; greedy/probabilistic simulation; built-in metrics (loss, accuracy, F1, MAE, CE) plus applications (next-event heatmaps, Poss-Util/Poss-Util+, HPUS/HPUS+).
- **RLearn:** multi-agent per-timestep RL (Nakahara et al. 2023): state = all players+ball positions+velocities; 16 actions (pass, through pass, shot, cross, dribble, defensive action, 8 movement directions, idle); reward 0 except attack-sequence end (+1 goal, −1 conceded, else EPV); models MLP/GRU/LSTM.
- **Losses:** L_total = L_td + λ1·L_L1 + λ2·L_as, λ1 ∈ {0.01, 0.005, 0.001}, λ2 = 0.0001, γ = 1.0, Adam lr 0.001.

## 4. Equations & assumptions
- Q-update: Q*(s_t,a_t) = E[r_{t+1} + γQ(s_{t+1},a_{t+1}) | s_t,a_t]; TD loss L_td = Σ(r_{t+1} + γQ(s_{t+1},a_{t+1}) − Q(s_t,a_t))²; total loss per §3 above.
- Stated assumptions: broadcast-video STE annotations are mappable to pitch coords (acknowledged as a limitation — needs homography); UIED mapping complete only for GRF/StatsBomb/Wyscout/DataStadium; sequence segmentation (50–300 frames) doesn't bias learning; EPV is a valid terminal-reward proxy.

## 5. Features / target
Event models: per-event features (action, delta_T, start_x/y + derived dist2goal/angle2goal/distance/deltas) → next event's (action type, inter-event time, x, y). RL: per-frame states → Q(s,a) over 16 actions.

## 6. Validation design
- Event: benchmark all 6 models on both datasets; metrics action accuracy/F1, time-MAE, X-MAE, Y-MAE, FLOPs, parameter count; LEM_3 simulation rollout (greedy, max 26 steps, ~98th percentile of possession length) with per-timestep event-count/ACC_action/time/X/Y-MAE decay curves.
- RL: MLP vs GRU vs LSTM × λ1 grid; metrics action accuracy + TD loss (TorchMetrics); qualitative Q-value visualization (8 off-ball movement directions, Shonan vs FC Tokyo example).
- Applications: Poss-Util/HPUS distributions across La Liga table positions; Valencia–Sevilla 0–0 HPUS case study; cross-event heatmap.

## 7. Numerical results / baselines
- **Event (Table 6):** action accuracy is flat across models (~0.67 Wyscout, ~0.65–0.66 StatsBomb vs MAJ 0.57/0.40) — accuracy doesn't discriminate; F1 does (LEM_3: 0.20/0.25 best). LEM_3 best overall: time-MAE 2.69 s (Wyscout) / 2.07 s (StatsBomb), X-MAE 7.62/7.07 m, Y-MAE 21.83/8.32 m — and the cheapest: 19–20M FLOPs, 38–39K params vs FMS 3.66–4.03B FLOPs / 1.29M params. Paper's claim: 3-event history beats 40-event history (NMSTPP/FMS) at 1/200th the compute — recency > long context for next-event prediction.
- **Simulation (Fig 5):** LEM_3 holds ACC_action 0.66→0.5 stable to ~timestep 10, then degrades vs MAJ; X/Y MAE grow with horizon (lateral X worse).
- **RL (Table 7):** at λ1=0.01 MLP wins both metrics (acc 0.4939, TD 1.8979) vs GRU (0.2607, 2.1896) vs LSTM (0.1982, 0.8730); at λ1=0.001 all collapse to ~0.0714 (≈ random over 16 actions). Core finding: **trade-off** — raising λ1 improves action accuracy but raises/destabilizes TD loss; reward prediction and behavior cloning pull in opposite directions.
- Limitations (§3.7): broadcast-video → pitch mapping not solved in-tool; PyTorch-version sensitivity; StatsBomb dataset not redistributable.

## 8. Code / data availability
All code at https://github.com/open-starlab (4 repos + docs at openstarlab.readthedocs.io). Simulation values CSV linked in-repo. Wyscout open; StatsBomb/J-League purchased (not shared). No code executed by this reader (no network).

## 9. Leakage & limitations
- Action accuracy ≈ majority-class + noise: the headline metric is uninformative; F1/time/location carry the signal — honest but weakens "superior performance" framing.
- Simulation evaluates greedy rollout against ground-truth-truncated horizons; excess simulated events discarded — flatters long-horizon stability.
- RL reward (EPV at sequence end, γ=1.0) is a sparse, noisy proxy; the λ1 trade-off likely reflects reward misspecification more than architecture — the authors say as much ("reward function's incomplete representation of player behavior").
- 50/5/45 RL split with 5% validation is thin for hyperparameter selection.
- UIED's 45 m pass threshold and center-origin SAR coords are arbitrary conventions, not validated choices.
- External validity to NFL: the soccer models don't transfer, but the *engineering* does. NFL analog of UIED = a unified play/event schema over nflverse + NGS + charting; analog of SAR = per-frame (10 Hz) state-action-reward aligned to play_id. The LEM finding (short history beats long context at 1/200th compute) is a useful prior for NFL next-play models.

## 10. GSE overlap
Framework-level overlap with the GSE data-engineering lane (research map §1: nflverse + NGS corpus work). The UIED idea parallels what the 2026-09-18 corpus consolidation did for metrics (AGENTS.md benchmark tables); SAR parallels any future per-frame NGS RL work (cf. the STRAIN tracking work in the map). The multi-agent per-timestep Q-function for off-ball players is the same problem class as off-ball credit assignment flagged in paper 0372's survey (this wave) — cross-reference. TrackID3x3 (0374) shares the org.

## 11. GSE implementation spec
Do not port the soccer models. Port the pattern: (1) define a GSE-UIED — a single canonical schema for play-level events joining nflverse play-by-play, NGS tracking summaries, and charting, with derived features (dist-to-goal analogs: yards-to-go, field position, score differential, time) as first-class columns; (2) define a GSE-SAR — per-frame (10 Hz NGS) state (22 player x/y/vx/vy + ball), action (16-class analog: pass/run/route/block/etc.), reward (EPA at drive end, γ=1.0) for off-ball valuation research; (3) ship a benchmark harness (Optuna YAML configs, fixed metrics, greedy-rollout simulation curves) so every future GSE model is comparable — the paper's real contribution. Effort: 2–4 weeks for schemas + harness on existing nflverse/NGS data.

## 12. Reproducible test
Clone the four open-starlab repos; convert Wyscout open data to UIED via the PreProcessing package; train LEM_3 per the YAML example (RTX 3090, ~3–4 days stated); verify action F1 ≈ 0.20 / time-MAE ≈ 2.7 s on the Wyscout test split. Without GPU: run only the preprocessing + MAJ baseline and confirm schema conformance (all Table 3 columns present, pitch scaled 105×68).

## 13. Acceptance / rejection gate
ADOPT the UIED/SAR schema pattern for GSE's data layer if a 2-week prototype converts nflverse + NGS into a single queryable play/frame schema with <1% row loss on joins; REJECT porting any OpenSTARLab model (LEM/NMSTPP/FMS/RLearn) to NFL data — they are soccer event predictors with no transferable learned parameters, and the RL reward design is acknowledged-misspecified even in-domain.

## 14. Improvement experiment
Fix the paper's acknowledged reward-misspecification: replace the sparse terminal EPV reward with dense per-frame reward shaping (e.g., ΔEPV per frame, the soccer analog of EPA), keep γ=1.0, and re-run the λ1 sweep — test whether the action-accuracy/TD-loss trade-off attenuates. If it does, the same dense-reward design (per-frame ΔEPA) becomes the recommended starting point for any GSE off-ball multi-agent valuation work, directly addressing paper 0372's off-ball credit-assignment gap.

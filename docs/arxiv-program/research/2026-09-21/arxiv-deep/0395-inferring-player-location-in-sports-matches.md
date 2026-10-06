# [0395] Inferring Player Location in Sports Matches: Multi-Agent Spatial Imputation from Limited Observations (arXiv:2302.06569v1)

**Citation:** Gregory Everett, Ryan J. Beal, Tim Matthews, Joseph Early, Timothy J. Norman, Sarvapali D. Ramchurn (University of Southampton / Sentient Sports, UK, 2023). *Inferring Player Location in Sports Matches: Multi-Agent Spatial Imputation from Limited Observations*. Proc. AAMAS 2023. arXiv:2302.06569v1. URL: https://arxiv.org/abs/2302.06569v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1878 lines, incl. appendices; tail verified).
**Verdict:** ADAPT — "Agent Imputer" reconstructs all 22 player positions from sparse event data (~95% missing) with 6.9 m mean error, a 62% cut vs the best naive baseline, and unlocks tracking-grade downstream analytics (physical metrics, pitch control, heatmaps) without optical tracking. This is the most direct published template for GSE's public-tracking-replacement gap: imputing all-22 NFL positions from play-by-play/charting data. Adaptation requires re-engineering the feature set for American football (downs, formations, play types) and validating on NFL tracking ground truth.

## 1. Research question
In multi-agent systems with non-uniform timesteps and severely limited observability (~95% missing values — one agent observed per timestep), can an LSTM+GNN model ("Agent Imputer") learn temporal and inter-agent patterns to impute the locations of *all* agents at *every* timestep? Applied to soccer: impute all 22 player positions from sparse event data (shots, passes — ball-carrier location only) to enable tracking-grade analytics for clubs that cannot afford optical tracking. (§1)

## 2. Dataset / schema
34 games of K League 1 (top South Korean men's division) event + tracking data, supplied by Bepro Group Ltd: ~64,000 events, ~1.4 million tracking locations; 31/3 train/test split (~91.2%/8.8%), five-fold cross-validation. Geometry scaled to a standard 105×68 m pitch. Schema: event stream E = [e_1…e_T] at non-uniform timesteps; per event, observation mask M (T×N, N=22) with exactly one observed agent (the ball-carrier at event location e_t^{x,y}); 15 engineered features per agent per timestep (§4.1). Data is proprietary (Bepro) — not public.

## 3. Method / model
- **Feature engineering (§4.1):** agent-specific: prevAgentTime/X/Y (time/location since last on-ball), nextAgentTime/X/Y (time/location until next on-ball — i.e., uses *future* information, a smoother not a filter), avAgentX/Y (match mean on-ball location), agentRole (16 roles), agentSide (same team as ball-carrier), agentObserved, goalDiff; global: eventX/Y, eventType. Positions relative to own goal-line. 15 features → I=24 post-embedding.
- **Architecture (§4.2, Fig. 2):** input window of L=5 events centered on t, shape (B×N×L×I), B=128. Step 2: shared bidirectional **Time-Aware LSTM** (Baytas et al. 2017; adjusts cell-memory discount by inter-event time gaps), single hidden layer H_1=100, per agent independently. Step 3: dense+ReLU → H_2=50. Step 4: stack to (B×N×H_2). Step 5: fully-connected graph, 2-layer SAGEConv GNN (H_3=64, H_4=32, mean aggregation). Step 6: dense+ReLU → (B×N×2) position predictions.
- **Training (§4.3):** tracking data as targets; loss = mean Euclidean distance; 150 epochs, batch 128, AdamW, lr 0.002 (no formal hyperparameter tuning — "trial and error").

## 4. Equations & assumptions
- Problem: N agents A=[a_1…a_N]; observations Φ_t with N−1 missing per t; mask M_t^n=1 iff agent n observed at t; predict Φ̂ (T×N×2) minimizing distance to true positions (§3).
- Time-Aware LSTM handles irregular Δt between events; SAGEConv mean-aggregation over a fully connected agent graph.
- Categorical embeddings: random (not trained) vectors of size √(#classes); 5 categoricals → 14 dims; spatial features min-max scaled per axis; time features RobustScaled (App. A.2).
Stated assumptions: one observed agent per timestep; next-observation features mean the model is a whole-game smoother (needs the full event sequence — not causal/real-time); agent positions predictable from on-ball events + role + score state.

## 5. Features / target
Features: the 15 engineered event-derived features above (on-ball history/future, role, side, score, event type/location). Target: (x, y) position of every agent at every event timestep.

## 6. Validation design
Baselines (§5.2): 3 naive (mean on-ball location; centroid of last/next observed; time-scaled linear interpolation), XGBoost (same features), Time-Aware LSTM alone (no GNN), GNN alone (no LSTM). Metrics: mean Euclidean error in X, Y, XY (meters), 5-fold averages with 95% CIs. Analysis slices: error over match time (rolling 5-min windows; t-tests mid-half vs end-half, p<0.01 both halves), error by role (7 grouped roles), error vs time-since/till-observed (Fig. 5). Downstream applications (§6): distance covered by role (Table 2), pitch control MAE (Table 3), heatmaps (Fig. 7).

## 7. Numerical results / baselines
- **Position imputation (Table 1, test, meters):** Agent Imputer X/Y/XY = 4.29±0.09 / 4.41±0.11 / **6.88±0.10**; vs Time-Aware LSTM 7.09±0.06, GNN 8.32±0.25, XGBoost 9.26±0.26, best naive baseline 18.01±0.46 → **~61.8% error reduction** vs best naive baseline (abstract claims ~62%, ~6.9 m).
- **Error by role (Fig. 4, §5.3.3):** goalkeepers most predictable; defenders > attackers; wide players harder in X (4.99 m vs 4.15 m central) but easier in Y (4.35 m vs 5.02 m).
- **Time decay (Fig. 5):** XGBoost/GNN degrade fast with time-since-observed; Agent Imputer and LSTM-only decay slower to a lower plateau — temporal modeling is the essential component (LSTM-only beats GNN-only).
- **End-of-half unpredictability (§5.3.2):** error significantly higher at end of halves than mid-half (t-tests, p<0.01 both halves) — corroborates fatigue/loss-of-structure intuition.
- **Distance covered (Table 2, with post-processing merging sub-second events):** abs % error by role 2.79–6.03% (e.g., central midfielder pred 9.37 km vs true 9.48 km, 3.66±1.26%); raw predictions overestimated distance by 11.5% (Agent Imputer) because 29.9% of events occur within 1 s of the previous event, producing superhuman position jumps.
- **Pitch control (Table 3, MAE vs tracking-data ground truth):** Agent Imputer 0.130±0.001 vs LSTM-only 0.135, GNN 0.149, XGBoost 0.150, baselines 0.272–0.305. Qualitatively, Agent Imputer learns structured defensive lines where other models stack defenders vertically (Fig. 6).

## 8. Code / data availability
Code public: https://github.com/GregSoton/PlayerImputation (App. A.1). Data proprietary (Bepro Group Ltd) — not available. Compute: PyTorch, NVIDIA V100 32 GB via Colab; ≤3 h per fold. No license stated in the paper; check repo before vendoring.

## 9. Leakage & limitations
- **Uses future information** (nextAgentTime/X/Y): the model is a whole-match smoother, not a causal predictor — cannot run live/in-play; any GSE live application needs a causal variant (drop future features), which the paper does not test.
- **Soccer-specific:** roles, pitch geometry, event types do not transfer to football; the entire feature set must be rebuilt around downs/plays/formations.
- Small data: 34 games, single league (K League 1), single provider — generalization untested; no cross-league or cross-season evaluation.
- Unrealistic micro-trajectories: 29.9% of events within 1 s of the previous one produce position jumps exceeding max player speed; distance covered overestimated 11.5% before heuristic post-processing (merging sub-second events).
- Deterministic point estimates — authors flag the lack of uncertainty quantification as future work; GSE needs calibrated uncertainty for any downstream use.
- No comparison against tracking-data-native SOTA (Omidshafiei et al. 2022, Le et al. 2017) — only against event-data models.
- Adversarial note: 6.9 m mean error on a 105 m pitch is good for heatmaps and pitch control but far too coarse for fine-grained applications (e.g., separation at catch point); treat it as a macro-structure imputer, not a tracking replacement for micro-events.

## 10. GSE overlap
Direct hit on a stated map gap: "public tracking replacements" (map §"gaps", recorded 2026-09-21). Nothing in the absorbed corpus imputes full player positions from sparse event/play data; the tracking/NGS taxonomy covers tracking *methodology*, not event-to-tracking imputation. Complements paper 0394 (LED diffusion): LED predicts *future* trajectories from past tracking; Agent Imputer reconstructs *concurrent* positions from sparse events — the two compose (impute all-22 from play-by-play, then forecast with LED). Not a duplicate of anything in the map.

## 11. GSE implementation spec
1. **Rebuild feature set for NFL:** replace soccer roles/event types with: down, distance, yard line, play type (run/pass/play-action), personnel grouping, formation, pre-snap motion, score differential, time remaining; prev/next *play* involvement per player (targets/carries/tackles) as the analogue of on-ball events. Note: NFL "events" (plays) are ~40 s apart in game time with substitutions — the time-aware mechanism matters more, and the N=22 set changes per play (handle via masking).
2. **Causal variant:** drop next-observation features; train a filter version for in-play use and measure the accuracy cost vs the smoother.
3. **Train on public NFL tracking:** use Big Data Bowl tracking releases as ground truth with nflverse play-by-play as the sparse event input; validate per-position error and downstream analogues (field-control instead of pitch control; distance/speed estimates).
4. **Add uncertainty:** probabilistic head (e.g., per-agent Gaussian or ensemble) since the paper's point estimates are insufficient for calibrated downstream use.
Estimated effort: 4–6 weeks for the NFL feature rebuild + BDB training; causal variant and uncertainty heads additional. Data: BDB tracking is public; play-by-play via nflverse.

## 12. Reproducible test
Clone https://github.com/GregSoton/PlayerImputation; since Bepro data is unavailable, the acceptance test is a *transfer* reproduction: reimplement the architecture, train on one public soccer event+tracking dataset (or BDB NFL data with the rebuilt feature set), and require (a) test mean Euclidean error within ~15% of the paper's 6.88 m on comparable soccer data, or (b) on NFL data, per-play all-22 imputation error documented by position group with the causal variant no worse than 1.5× the smoother. Also verify the paper's qualitative claims: defenders/predictable-roles ordering and end-of-half error elevation should replicate directionally.

## 13. Acceptance / rejection gate
ACCEPT as ADAPT pending the §12 transfer test. Standing gate: imputed positions must never be presented as measured tracking (NGS-equivalent) in any public content or model input without the per-role error bounds attached; the smoother variant must not be used for anything resembling live prediction. If the NFL feature rebuild fails to beat a time-scaled interpolation baseline by ≥40%, demote to REJECT (soccer-specific, non-transferable).

## 14. Improvement experiment
Two extensions the paper leaves open: (1) **Probabilistic Agent Imputer** — replace the point head with a per-agent mixture-density output and evaluate calibration (rank histograms) and downstream pitch/field-control uncertainty bands; this is what GSE actually needs for WP-adjacent use. (2) **Cross-league transfer** — train on multi-league soccer event data (or multi-season NFL) and test zero-shot on a held-out league/season to measure how much of "team structure" is universal vs league-specific; a transferable structure prior would let GSE impute college/all-star games with no tracking history.

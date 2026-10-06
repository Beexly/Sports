# NFL Big Data Bowl 2026 (Prediction) — Deep-Dive Brief

Prepared 2026-09-26 by subagent. Evidence-grade key: **[VERIFIED]** = observed in a cited source this session · **[ATTRIBUTED]** = stated by a named source, not audited · **[UNVERIFIABLE]** = no auditable basis found.

---

## 1. The competition

- **Name:** NFL Big Data Bowl 2026 – Prediction (Kaggle featured code competition, host: The National Football League). [VERIFIED] https://www.kaggle.com/competitions/nfl-big-data-bowl-2026-prediction
- **Task:** Predict NFL player movement during frames after the ball is thrown (ball in the air). Inputs: pre-pass NGS tracking data + targeted receiver identity + ball landing location (`ball_land_x`, `ball_land_y`). Predict (x, y) for each flagged player per frame. [VERIFIED] official description via https://github.com/jackvinati/nfl-big-data-bowl-2026---prediction
- **Timeline:** Start Sep 25, 2025 → team merger/entry deadline Nov 26, 2025 → final submission Dec 3, 2025 → live forecasting Dec 4, 2025–Jan 5, 2026 (scored on then-future Weeks 14–18 games) → results Jan 6, 2026. [VERIFIED] same source
- **Metric:** RMSE = sqrt(1/(2N) · Σ((x_true−x_pred)² + (y_true−y_pred)²)), in yards. [VERIFIED] same source
- **Participation:** 8,147 entrants, 962 participants, 1,899 teams, 1,247 submissions. [VERIFIED] Kaggle competition page. (One repo README self-reports "94th / 1,134 teams" — team-count discrepancy vs Kaggle's 1,899; treat placement denominators cautiously.)
- **Prizes:** $50,000 total — 1st $25,000 / 2nd $15,000 / 3rd $10,000. Winner license type: **Open Source**. [VERIFIED] official rules via jackvinati repo
- **Code competition:** notebook submissions, CPU/GPU ≤ 9h, no internet, public external data + pretrained models allowed. [VERIFIED] same source
- **Separate Analytics competition** (Metric / Coaching / Undergraduate tracks) ran alongside; **not** the Kaggle prediction comp. Winner: **Lucca Ferraz** (Rice senior), for a defensive framework + new pass-coverage-impact metric using tracking data; presented at combine week Indianapolis. [VERIFIED] https://news.rice.edu/news/2026/classroom-combine-champion-rice-student-wins-nfl-analytics-title (Mar 3, 2026)

### Winners (prediction comp)
- **Takoi (Hirokazu Takoi)** — 4th place, gold medal. **Mifune (Satoshi Mifune)** — 9th place, gold medal. Both Kaggle Grandmasters on Rist Co.'s Kaggle team (Kyoto, Japan). Announced Jan 26, 2026 via Rist press release. [ATTRIBUTED] https://www.archyde.com/kaggle-grandmasters-takoi-and-mifune-from-rist-each-won-solo-gold-medals-at-the-kaggle-competition-nfl-big-data-bowl-2026-prediction/
- The **actual 1st-place team's name and exact winning RMSE were not found** in public sources this session. [UNVERIFIABLE — gap]
- **Takoi's approach:** modeled ball–runner–defender relationships using domain knowledge from watching pass-play footage; no playing experience, learned from film study during the comp. [ATTRIBUTED] same source
- **Mifune's approach:** model jointly learns per-player time series + player interactions; outputs **player speed and prediction confidence** (not just position) so trajectories stay physics-smooth and handle uncertainty in contested "melee" situations. [ATTRIBUTED] same source

### Reference leaderboard scores (self-reported by authors)
- schubert-tom: public LB **0.518**, top 5%. [ATTRIBUTED] https://github.com/schubert-tom/nfl-big-data-bowl-2026
- xxremsteelexx: public LB **0.540** (74th self-reported), best single model 0.547 (6-layer ST transformer). [ATTRIBUTED] https://github.com/xxremsteelexx/nfl-big-data-bowl-2026-
- shevchenko9liza (team of 3): Bi-GRU + Spatio-Temporal Transformer ensemble, LB **0.534**. [ATTRIBUTED] https://github.com/shevchenko9liza/nfl-player-trajectory-prediction
- Caution: CV scores across repos use different formulations (e.g., 0.0750 vs 2.87) — only LB scores are cross-comparable.

---

## 2. Winning/top solution methods

- **What separated the top:** domain-informed relational modeling (Takoi: ball–runner–defender structure from film study; Mifune: speed + uncertainty outputs with physics smoothness) rather than raw architecture scale. [ATTRIBUTED]
- **Consensus architecture family:** spatial-temporal transformers, GNN/GAT hybrids, GRU/LSTM decoders, CNN front-ends — all with explicit **ball-trajectory conditioning** (e.g., FiLM modulation in schubert-tom). [VERIFIED across repos]
- **Physics-informed loss terms** recur: velocity/acceleration caps, direction-cosine loss, boundary penalties, momentum-continuity first-step penalties. [VERIFIED] rocinc README, schubert-tom README
- **Delta (displacement) prediction** instead of absolute coordinates — translation invariance. [VERIFIED] rocinc README
- **Coordinate normalization:** mirror plays so offense always moves one direction; LOS-centered local coordinates. [VERIFIED] rocinc, schubert-tom
- **Augmentation:** horizontal flip (most effective per xxremsteelexx ablations), speed perturbation, time warping, rotation, translation, test-time augmentation (+0.005–0.010 LB). [VERIFIED] xxremsteelexx README (847+ experiments, ablation notebooks)
- **Training:** K-fold CV (up to 20-fold), multi-seed ensembling, frozen-encoder fine-tuning, position-specific models (WR/TE/ball-carriers/defense splits). [VERIFIED] xxremsteelexx, schubert-tom
- **Honest negative results documented** (shevchenko9liza): dropping detected anomalies *hurt* (−0.14%); DBSCAN found no meaningful clusters; Shapley-Flow duplicated plain SHAP (ARI=0.97). [ATTRIBUTED]

---

## 3. Public code artifacts + licenses

| Repo | Contents | License | Reuse posture |
|---|---|---|---|
| [XxRemsteelexX/NFL-Big-Data-Bowl-2026-](https://github.com/xxremsteelexx/nfl-big-data-bowl-2026-) | 4 architectures (ST transformer, multiscale CNN, GRU, geometric attention), 13 notebooks, 167-feature pipeline, pretrained weights, ablation studies | **MIT** [VERIFIED on repo page] | Direct reuse OK with attribution |
| [shevchenko9liza/nfl-player-trajectory-prediction](https://github.com/shevchenko9liza/nfl-player-trajectory-prediction) | Tabular pipeline (XGBoost/LightGBM/CatBoost + SHAP-embedding meta-features + Optuna), 252-cell notebook with outputs, 44 EDA plots, RU deck | **MIT** [VERIFIED on repo page] | Direct reuse OK with attribution |
| [schubert-tom/nfl-big-data-bowl-2026](https://github.com/schubert-tom/nfl-big-data-bowl-2026) | Query-centric transformer + ball-FiLM, 0.518 LB, augmentation pipeline | **No license file** | Learn-the-method only |
| [rocinc/NFL-Trajectory-Prediction](https://github.com/rocinc/NFL-Trajectory-Prediction) | 10-point design rationale (defensive-intent bottleneck, delta prediction, 2-stage training, direction loss, physics constraints, GAN refinement) | **No license file** | Learn-the-method only |
| [jaydonjp/nfl-big-data-bowl-2026-prediction](https://github.com/jaydonjp/nfl-big-data-bowl-2026-prediction) + [jaydonjp/spatio-temporal-player-trajectory-prediction-using-gnn-lstm-nfl-big-data-bowl-2026-](https://github.com/jaydonjp/spatio-temporal-player-trajectory-prediction-using-gnn-lstm-nfl-big-data-bowl-2026-) | GAT-LSTM hybrid pipelines | License not checked | Verify before reuse |
| [princejonaa/mirror-os](https://github.com/princejonaa/mirror-os/blob/HEAD/projects/nfl-big-data-bowl-2026/nfl_big_data_bowl_2026/docs/NFL_EXECUTION_PLAN.md) (planning docs only) | GNN/XGBoost/physics-baseline strategy docs; "expected RMSE 0.8–1.2" are **pre-competition planning estimates, not results** | License not checked | Planning notes only |
| Samiratra/NFL_Big_Data_Bowl_2026_dev (ResearchSquare LSTM seq2seq paper codebase) | Referenced in paper; repo URL **404s** — unavailable | n/a | Unavailable |

**Kaggle notebooks / discussion / writeups:** the fetch tool could not render Kaggle's JS pages (writeups index, leaderboard table, code tab all returned empty). The public-3rd-place writeup is known to exist at `kaggle.com/competitions/nfl-big-data-bowl-2026-prediction/writeups/public-3rd-solution` but its contents were not retrieved this session. [GAP — needs a logged-in Kaggle pass]

---

## 4. The dataset

- **Files (864.82 MB total):** `train/input_2023_w[01-18].csv` + `train/output_2023_w[01-18].csv`, `test.csv`, `test_input.csv`, `kaggle_evaluation/` API. [VERIFIED] official description
- **Coverage:** 2023 NFL regular season, weeks 1–18 (training); live forecasting on 2025 Weeks 14–18. One repo's EDA: ~4.9M tracking rows, 272 games, ~14k plays, 2,157 players at 10 fps. [ATTRIBUTED]
- **Input columns:** game_id, play_id, player_to_predict (bool — only these rows scored), nfl_id, frame_id, play_direction, absolute_yardline_number, player_name/height/weight/birth_date/position/side, player_role (Defensive Coverage | Targeted Receiver | Passer | Other Route Runner), x, y, s (speed yd/s), a (accel), o (orientation), dir (motion angle), num_frames_output, **ball_land_x, ball_land_y** (given as input). [VERIFIED] official description
- **Output:** x, y per (game_id, play_id, nfl_id, frame_id) for flagged players — up to 55 frames (~5.5 s). [VERIFIED]
- **Quirks:** quick passes (<0.5 s), deflected and throwaway passes dropped. play_direction mirroring needed. Player weight has missing values (impute). [VERIFIED/ATTRIBUTED]
- **⚠️ License: CC BY-NC 4.0 — non-commercial use only.** Rules explicitly restrict competition data to non-commercial purposes (competition, forums, academic research/education). [VERIFIED] official rules. **Garrett cannot train a commercial product directly on this dataset** — methods transfer, data doesn't.
- Where to get it: Kaggle competition page (account + rules acceptance required).

---

## 5. Michelle Lawson (@michellescomputer) 24-hour build

- **What she did (from the reel):** GNN treating the whole play as one graph (players as nodes), train/test split, then ensembled with an LSTM to improve performance. 24-hour time-boxed build for the prediction competition. [ATTRIBUTED — video analysis]
- **No public repo, code, or competition score found** for her build in this session. [UNVERIFIABLE — gap]
- Note: her GNN-play-as-graph + LSTM-ensemble mirrors the serious-competitor playbook (relational encoder + sequence decoder), so the reel is directionally sound even without a score.

---

## 6. Big Data Bowl 2027

- **No 2027 (9th annual) announcement found** as of 2026-09-26. The 2026 edition was announced Sep 25, 2025, so an announcement is plausibly imminent on the same cadence — but nothing is published yet. [UNVERIFIABLE — watch item]
- **Watch:** operations.nfl.com Big Data Bowl page, NFL Football Operations announcements, https://aws.amazon.com/sports/nfl-big-data-bowl/, Kaggle featured competitions, SBJ.
- Context: 75+ past participants hired into NFL/sports analytics roles; 70+ per AWS. The talent-pipeline angle is why the NFL runs it.

---

## Reusable takeaways (methodology)

1. **Predict deltas, not positions; output speed + uncertainty.** Delta prediction gives translation invariance; Mifune's speed+confidence outputs enforce physics-smooth trajectories and handle contested situations better than raw coordinate regression.
2. **Ball-landing conditioning is the highest-leverage feature.** Every strong solution conditions player trajectories on the known ball landing spot (FiLM gates, attraction fields, ball-relative geometry). dist_to_ball / speed_toward_ball dominate feature importance (~20% each per one analysis).
3. **Relational structure beats raw coordinates.** GNN/GAT or spatial self-attention over the 22-player set (role-ordered, direction-normalized) consistently outperforms per-player sequence models; the defense's tactical state (coverage intent) is the key latent.
4. **Physics-informed losses are cheap wins.** Direction-cosine loss, velocity/accel caps, boundary + momentum penalties produce plausible trajectories and small but real LB gains; horizontal-flip augmentation was the single most effective augmentation in 847-experiment ablations.
5. **Ensemble + TTA + multi-seed is the last mile.** ~0.005–0.010 LB from test-time augmentation; 20-fold CV + multi-seed ensembling separated the medals from the pack.

## Best public code artifacts (license-verified)

1. **XxRemsteelexX/NFL-Big-Data-Bowl-2026-** — MIT. Fullest pipeline: 4 architectures, 13 notebooks, 167 features, pretrained weights, ablations. Best single artifact.
2. **shevchenko9liza/nfl-player-trajectory-prediction** — MIT. Tabular boosting + SHAP-embedding meta-features + Optuna; best-documented EDA and honest negative results.
3. **schubert-tom/nfl-big-data-bowl-2026** — no license (method only). Query-centric transformer with ball-FiLM; 0.518 public LB; excellent augmentation pipeline.
4. **rocinc/NFL-Trajectory-Prediction** — no license (method only). Best written design rationale (10 principles: intent bottleneck, delta prediction, direction loss, GAN refinement).
5. **Kaggle public notebooks** — exist but not retrievable without login this session; highest-vote notebooks are the natural next pull.

## 2027 watch

Not announced. Watch operations.nfl.com, NFL Football Operations, AWS sports page, and Kaggle in the coming weeks (2026 was announced Sep 25, 2025). If Garrett wants in, the play is the prediction track — it's his NGS tracking-data lane, and the 2026 dataset (CC BY-NC, research-only) is a free R&D benchmark in the meantime.

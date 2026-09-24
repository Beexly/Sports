# [1872] TrajFM: A Vehicle Trajectory Foundation Model for Region and Task Transferability (arXiv:2408.15251)

**Citation:** Beijing Jiaotong University / East China Normal University (equal contribution) (2024). *TrajFM: A Vehicle Trajectory Foundation Model for Region and Task Transferability*. arXiv:2408.15251. Code (anonymous): https://anonymous.4open.science/r/TrajFM-30E4. URL: https://arxiv.org/abs/2408.15251
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
Its masking-and-recovery task unification (every downstream task = a masking pattern, zero retraining) plus learnable relative-spatial rotary attention (STRPE) transfers to NFL: one frozen model serving trajectory prediction, time-to-event estimation, and imputation, with team/season transferability.

## 1. Research question
Can one trajectory model transfer across REGIONS (different cities, coordinate ranges, POI arrangements) and TASKS (arrival-time estimation, OD travel-time, trajectory prediction) without retraining — where existing methods need per-task fine-tuning and degrade on incomplete inputs?

## 2. Dataset / schema
**Didi Chengdu + Xi'an taxi trajectories** (gaia.didichuxing.com): 3-hop resampling (intervals ≥ 6 s), 5–120 points per trajectory; POIs from AMap API; chronological 8:1:1 train/val/test split. Schema: p_i = ((lng, lat), t, l) with POI l = (lng, lat, textual description).

## 3. Method / model
**STRFormer** (region transferability):
- Per-point 3 modalities: spatial (UTM projection, center-normalized, scale s_x=s_y=4000 → linear embed e^s_i); temporal (day-of-week, hour, minute, Δt-minutes → 4 features → learnable Fourier encoding); POI (nearest POI's textual description → OpenAI text-embedding-3-large → linear projection e^p_i).
- Modality mixing: e_i = MeanPool(TransEnc(⟨e^s_i, e^t_i, e^p_i⟩)) (1-layer Transformer).
- STRPE (learnable spatio-temporal rotary position embedding): q_i = R_{Φ(x_i,y_i)}W_q e_i, k_j = R_{Φ(x_j,y_j)}W_k e_j, v_j = W_v e_j; Φ(x,y) = W_Φ(x‖y); θ_k = 10000^{−2k/d}. Dot product collapses to a relative term R_{Φ(x_i,y_i)−Φ(x_j,y_j)} — attention depends only on relative spatial displacement, hence region-agnostic. L = 2 layers, d = 128.
- Prediction heads: linear (spatial coords), temporal, per-modality end-token [e] predictor (sigmoid, r̂ ≥ 0.5).
**Masking-and-recovery scheme** (task transferability): (1) modality masking — mask spatial or temporal modality of a point, recover at same step; (2) sub-trajectory masking — replace ⟨p_s,…,p_e⟩ with mask point p_[m], append start token p_[s], recover autoregressively. Pretraining: random sub-trajectory (s,e ∼ U(1,n)) + even-probability modality masking on remaining points; loss = Σ MSE (spatial/temporal) + BCE (end-token).
**Task unification:** travel-time estimation = temporal modality masked everywhere except first point, read recovered temporal of last point; OD travel time = ⟨p_1, [m], p_n′⟩; trajectory prediction = history + [m] → autoregressive future.

## 4. Equations & assumptions
- x_i = (UTM(lng_i)−UTM(lng_cen))/s_x; y_i analog; e_i = MeanPool(TransEnc(⟨e^s_i,e^t_i,e^p_i⟩)).
- q_i^⊤·k_j = e_i^⊤ W_q^⊤ R_{Φ(x_i,y_i)−Φ(x_j,y_j)} W_k e_j.
- L^s_i = (x̂_i−x_i)² + (ŷ_i−y_i)²; L^t_i = ‖t̂_i−t_i‖₂; L^e_i = BCE(r̂, r).
- Assumptions: nearest-POI semantics transfer across regions; relative spatial attention suffices (absolute position unneeded); all tasks reducible to mask-recover patterns; chronological split prevents leakage.

## 5. Features / target
Inputs: (spatial, temporal, POI) modality triples per point. Pretraining targets: masked modalities + masked sub-trajectories + end tokens. Downstream: arrival time, OD travel time, future trajectory — all via masking patterns, no task heads.

## 6. Validation design
- Baselines: t2vec, Trembr, CTLE, Toast, TrajCL, START, LightPath — each with frozen (wo ft) and fine-tuned variants; TrajFM frozen only (30 epochs pretrain, Adam 1e-3, 5 runs, mean±dev).
- Task transfer (Tables 2–4): arrival-time estimation, OD arrival-time, trajectory prediction.
- Region transfer (Tables 5–7): train Chengdu → test Xi'an and vice versa, no fine-tuning.
- Efficiency (Table 8): model size + train/test time.
- Ablations: w/o STRPE (vanilla Transformer), w/o POI, w/o pre-train; hyperparameter sweep L ∈ {…}, d ∈ {32,…,512}.

## 7. Numerical results / baselines
- Task transfer: TrajFM "consistently promising" frozen vs fully fine-tuned competitors; gap largest on OD-time and trajectory prediction (incomplete inputs — competitors "rely on input integrity"); most competitors "significant performance degradation" in wo ft.
- Region transfer: TrajFM superior in all settings; "in some cases, TrajFM performs better when transferred" than in-domain.
- Efficiency: model size comparable to RNN baselines (t2vec, Trembr), "much smaller than" START and LightPath; efficient train/test.
- Ablations: STRPE > vanilla Transformer; removing POI hurts; removing pre-training hurts; optimal L=2, d=128 (L larger → "overly complicated and harder to train").
- Exact table values are figure-rendered (not recovered); qualitative rankings reported.

## 8. Code / data availability
Code: anonymous 4open.science link (may not persist post-review). Data: Didi Gaia (public), AMap POI API.

## 9. Leakage & limitations
- Taxi trajectories are road-constrained; free player movement has no POI analog at field scale (stadium zones are the closest proxy).
- POI modality depends on OpenAI text-embedding-3-large (external API, cost, reproducibility).
- Exact numeric table values unrecoverable from HTML; region-transfer "better when transferred" claim lacks a mechanism explanation.
- Chronological split is good, but no cross-city POI-vocabulary analysis (does the POI embedder see Xi'an POIs at pretrain?).
- L=2, d=128 is small — scaling behavior untested.

## 10. GSE overlap
GSE maintains separate models per prediction task (props, win probability, trajectory). TrajFM's mask-recover unification is a NEW architectural pattern for GSE: one frozen tracking encoder where "predict remaining yards" = mask future sub-trajectory, "predict time-to-throw" = mask temporal modality, "impute missing frames" = mask random points. The STRPE relative-attention idea complements 1871's absolute tokenization: attention on relative displacements is inherently formation-agnostic (transfers across teams/seasons). Distinct from 1862–1871: only method with demonstrated cross-region (cross-domain) zero-shot transfer.

## 11. GSE implementation spec
1. Data: NFL 10Hz tracking; per-frame modalities: spatial (field-normalized coords), temporal (snap-relative time features), "POI" analog = zone/landmark labels (e.g., nearest yard-line, end zone, sideline) as discrete semantic tokens.
2. Train STRFormer-style encoder (L=2, d=128–256) with modality + sub-trajectory masking pretraining on 7 seasons.
3. Serve tasks via masking patterns: ball-carrier future = history + [m] → autoregressive; time-to-throw = masked temporal read-out; missing-frame imputation = random point masking.
4. Effort: ~3 engineer-weeks.

## 12. Reproducible test
Dataset: 2023–2024 NFL tracking; pretrain weeks 1–12 (2023), test transfer on 2024 weeks 13–18 (cross-season = region-transfer analog). Tests: (a) frozen TrajFM-style model on three tasks (future-trajectory FDE, time-to-throw MAE, frame-imputation RMSE) vs per-task fine-tuned baselines; (b) cross-season transfer vs in-season. Run target: <72h on 1–2 GPUs.

## 13. Acceptance / rejection gate
ADOPT if: (a) frozen model matches per-task fine-tuned baselines within 5% on all three tasks, AND (b) cross-season (2024) performance degrades ≤ 10% vs in-season (2023) on trajectory prediction. REJECT if (a) fails.

## 14. Improvement experiment
Beyond the paper: (1) replace the POI-text-embedding dependency with learned field-landmark embeddings (yard lines, hash marks, end zones as a fixed discrete vocabulary) — cheaper, reproducible, football-native. (2) Multi-agent STRPE: extend relative rotary attention across players (query = ball-carrier, keys = defenders) so the same relative-spatial mechanism that gives region transfer also gives formation-agnostic interaction modeling. Hypothesis: multi-agent STRPE beats single-agent STRPE on yards-after-contact prediction where defender geometry dominates.

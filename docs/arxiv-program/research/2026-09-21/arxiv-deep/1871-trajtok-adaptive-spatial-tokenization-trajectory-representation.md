# [1871] TrajTok: Adaptive Spatial Tokenization for Trajectory Representation Learning (arXiv:2605.20134)

**Citation:** University of Southern California (2026). *TrajTok: Adaptive Spatial Tokenization for Trajectory Representation Learning*. arXiv:2605.20134. URL: https://arxiv.org/abs/2605.20134
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
Density-adaptive multi-resolution tokenization plus a factorized geometric/kinematic encoder is the strongest tokenizer+architecture blueprint in this lane for NFL tracking: it solves the fixed-grid sparsity problem on real movement data and transfers frozen across geometric and motion-sensitive tasks.

## 1. Research question
Fixed-grid spatial tokenization forces a bad tradeoff (fine grids → data-starved cells; coarse grids → merged heterogeneous movement). Can a density-adaptive multi-resolution tokenizer, combined with a factorized encoder that separates "where" (geometry) from "how" (kinematics), learn trajectory representations that transfer frozen across diverse downstream tasks?

## 2. Dataset / schema
**Porto taxi dataset** (benchmark; only dataset used — authors flag this as a limitation): raw GPS traces T = {p_1,…,p_n}, p_i = (lat, lon, timestamp); noisy, irregularly sampled. Downstream: trajectory similarity retrieval (1k queries × 10k corpus bank, DTW ground truth), call-type classification (how the trip was requested), prefix ETA regression, full-trajectory travel-time regression.

## 3. Method / model
**Adaptive tokenization:** hierarchical H3 hex grid; from base resolution r_base, cells whose point counts exceed a capacity threshold are recursively split into children until count < threshold or r_max. Porto: r6–r9, |V| = 1494 (vs 46 cells at fixed r7 — a trivial prediction task). Each GPS point → highest-resolution vocabulary cell containing it; token = (cell ID, resolution, original coords, timestamp).
**Factorized encoder:** geometric channel g_j = e_{c_j} (learned cell embedding) with Spatial-Temporal RoPE over lat/lon/time; kinematic channel x^kin_j = [v_j/v_max, sinθ_j, cosθ_j] (haversine speed, circular heading), k_j = MLP(x^kin_j) (2-layer, GeGLU), temporal-only RoPE. Fusion blocks: self-attention then cross-attention between channels.
**Pretraining (co-masked token modeling):** shared mask set M across channels; L_geom = −(1/|M|)Σ log p_θ(c_j|G) (masked cell-ID prediction); L_kin = β_speed·MSE(v̂, v/v_max) + ½β_heading·MSE(sin/cos heading); J = L_geom + λ·L_kin. Run-aware span masking: reject candidate spans lying entirely inside a single repeated-cell run (naive masking on raw token streams is too easy).
**Downstream:** single frozen encoder + lightweight adapters (attentive retrieval head trained with mixed InfoNCE + rank distillation; classification head with departure context; destination-conditioned ETA adapter).

## 4. Equations & assumptions
- x^kin_j = [v_j/v_max, sinθ_j, cosθ_j]; g_j = e_{c_j}.
- L_geom, L_kin, J = L_geom + λ·L_kin as above.
- Assumptions: data density is a good proxy for needed spatial resolution; geometry and kinematics benefit from separate early processing before fusion; run-aware masking prevents trivial in-run prediction; masked-token loss correlates with transfer (later disproven by their own 120k-step result).

## 5. Features / target
Inputs: cell IDs (geometric) + continuous speed/heading (kinematic). Pretraining targets: masked cell IDs (classification) + masked speed/heading (regression). Downstream: DTW-similarity ranking, call-type class, remaining/total travel time.

## 6. Validation design
- Four downstream tasks on Porto with a frozen encoder; task-specific baselines incl. t2vec, NeuTraj, TrajCL, SIMformer (similarity), START, JGRM (classification), neural travel-time systems (ETA).
- Ablations: adaptive vs fixed resolutions r7–r10 (same encoder/objective/12k steps); channel ablations (geo-only, kin-only, no-fusion); mask-ratio sweep {0.25, 0.30, 0.35} at 60k steps; 120k-step continuation.

## 7. Numerical results / baselines
- Similarity retrieval: HR@1 0.435, R5@20 0.983, MRR 0.588 — best, +0.127/+0.176/+0.140 over strongest baseline; NDCG@50 0.658, second to NeuTraj (0.672).
- Call-type classification: macro-F1 0.773 (best), micro-F1 0.811 (2nd, within 0.002 of START 0.813/0.772) — matching map-matched pipelines (START uses road network; JGRM uses routes) with raw GPS only.
- Prefix ETA: 42.27 s MAE, "substantially below the reported Porto MAE range of prior neural travel-time systems."
- Full-trajectory travel time: 38.4 s MAE (authors caveat: strong length correlation makes this a weak test).
- Ablations: adaptive tokenizer best overall (fixed r9 negligibly better on HR@1 by 7 queries); geo-only wins similarity/classification, kin-only wins ETA; mask ratio 0.30 best; 120k steps: val loss −25% (0.098→0.073) but zero-shot retrieval 0.351→0.257 — pretraining–transfer mismatch honestly reported.

## 8. Code / data availability
No code link stated in extracted text. Data: Porto taxi (public benchmark).

## 9. Leakage & limitations
- Porto taxi only — no cross-dataset transfer test (authors flag); taxi trips are road-constrained, unlike free player movement.
- The 120k-step mismatch finding means their own recipe can overfit the pretraining objective — early stopping must be transfer-validated, not loss-validated.
- Call-type classification leans on departure context, not pure trajectory signal.
- Hyperparameters/configs in appendices (not extracted).

## 10. GSE overlap
Strongest direct blueprint for GSE's tracking-language model: (a) density-adaptive tokenization solves the field-quantization problem better than 1867's fixed H3 resolution — dense regions (line of scrimmage, red zone) get fine cells, sparse regions (deep secondary) get coarse cells; (b) the geometric/kinematic factorization maps to football's "where is he" vs "how is he moving" split (route stem vs burst/cut); (c) the pretraining–transfer mismatch warning directly constrains GSE's training protocol. Distinct from 1867 (fixed-res H3 + WordPiece) and 1862–1866 (no adaptive tokenizer).

## 11. GSE implementation spec
1. Data: NFL 10Hz tracking; build adaptive H3 partition from 7 seasons of player positions (capacity threshold tuned so vocab ≈ 1.5–3k cells; fine near LOS, coarse deep).
2. Tokens: (cell ID, resolution, raw coords, timestamp); kinematic channel = speed/accel + sin/cos heading per frame.
3. Train factorized encoder with co-masked objective (mask ratio 0.30; run-aware span masking adapted to stationary frames); ST-RoPE on relative field coords + snap-relative time.
4. Freeze encoder; attach adapters for: play-similarity retrieval (DTW ground truth on tracking), route-family classification, ball-carrier yards-gained regression (the ETA analog).
5. Early-stop on transfer metrics (retrieval/classification), NOT masked-token loss, per the mismatch finding.
6. Effort: ~3 engineer-weeks.

## 12. Reproducible test
Dataset: 2023–2024 NFL tracking, weeks 1–12 train, weeks 13–18 test. Tests: (a) adaptive vs fixed-resolution tokenizer on play-similarity retrieval (DTW ground truth), frozen encoder, HR@1/MRR; (b) frozen-encoder route-family classification macro-F1 vs from-scratch; (c) verify transfer-validated early stopping beats loss-validated stopping. Run target: <72h on 1–2 GPUs.

## 13. Acceptance / rejection gate
ADOPT if: (a) adaptive-tokenizer retrieval MRR ≥ 15% above fixed-resolution baseline on held-out weeks, AND (b) frozen-encoder route classification macro-F1 ≥ 0.60 (well above chance on a ~10-class problem). REJECT if (a) fails.

## 14. Improvement experiment
Beyond the paper: (1) position-aware capacity thresholds — separate density partitions for offensive vs defensive players (defenders cluster differently than receivers), testing whether role-specific vocabularies beat a shared one. (2) Add a third "interaction channel" (nearest-opponent distance/bearing) factorized alongside geometry and kinematics, testing whether the factorized design extends to social features without contaminating the motion channels. Hypothesis: three-channel TrajTok improves tackle-frame and catch-point prediction where two channels stall.

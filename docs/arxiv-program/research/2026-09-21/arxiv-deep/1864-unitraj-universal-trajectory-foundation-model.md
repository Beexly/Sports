# [1864] UniTraj: Learning a Universal Trajectory Foundation Model from Billion-Scale Worldwide Traces (arXiv:2411.03859)

**Citation:** Yuanshao Zhu, James Jianqiao Yu, Xiangyu Zhao, Xuetao Wei, Yuxuan Liang (2024). *UniTraj: Learning a Universal Trajectory Foundation Model from Billion-Scale Worldwide Traces*. arXiv:2411.03859. URL: https://arxiv.org/abs/2411.03859
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
The most complete MAE-style "foundation model" recipe for trajectories (masking strategies + resampling + RoPE tokenizer + zero-shot results); directly adaptable to pretraining NFL tracking embeddings, but requires adaptation from single-agent GPS mobility to multi-agent play data.

## 1. Research question
Can a single self-supervised trajectory foundation model — pretrained with resampling and masking strategies on a global dataset — generalize zero-shot across geographic regions, sampling rates, and downstream tasks (recovery, prediction, classification, generation) that defeat task-specific, region-specific models?

## 2. Dataset / schema
- **WorldTrace** (new, open ODbL via OpenStreetMap GPX): 2.45M trajectories, ~8.8B raw GPS points, 70 countries, Aug 2021–Dec 2023, motorized movement tags; resampled to 1 pt/s; filtered to ≥32 points, ≥100 m, speed ≤120 km/h, map-matched. High-quality subset: 1.1M trajectories (1M train, 100K test). Avg 358 points/trajectory, ~6 min, 5.73 km, 48.0 km/h.
- Downstream eval: **Chengdu** (>1M taxi trajectories, 3 s sampling), **Xi'an** (millions of taxi trajectories, Nov 2016), **GeoLife** (182 users, multi-mode walking/cycling/driving, irregular sampling), **Grab-Posisi** (84K ride-hailing, Jakarta/Singapore), **Porto** (15 s sampling).
Schema: sequences of ⟨lng, lat, t⟩; sampling intervals heterogeneous by dataset.

## 3. Method / model
**Trajectory handling:**
- *Dynamic resampling*: R(n) = R_min if n ≥ n_max; = 1 if n ≤ n_min; = 1 − (1−R_min)φ(n) otherwise, with φ(n) = ln(n−n_min+1)/ln(n_max−n_min+1) — log-decaying retention by trajectory length.
- *Interval-consistent resampling*: k_j = 1 + (j−1)·Δt, standardizing temporal structure.
- *Four masking strategies* (mask function M(τ, r), masked set I, r = |I|/n): (a) random — I_rand ∼ Uniform({1..n}); (b) block — contiguous blocks of size b at random starts; (c) key-points — RDP algorithm, I_key = {p_k | d_max(p_k, p_1p_n) > ε}, masking turn points; (d) last-N — final N points (prediction-style).
**Model:** two-part tokenizer — spatial normalized to origin (x_i, y_i) = (lng_i−lng_1, lat_i−lat_1) → Conv1D to h_i^s ∈ R^d; temporal Δt_i → Linear to h_i^t ∈ R^d; summed h_i = h_i^s + h_i^t. Rotary Position Encoding (RoPE): θ_i = i / 10000^{2k/d}. Encoder-decoder Transformer: 8 RoPE encoder blocks, 4 decoder blocks, d=128, ~2.38M params. Encoder sees visible tokens only; decoder merges visible encodings + learnable [MASK] tokens (Reorder to original indices) + linear projector → τ̂.
**Training:** reconstruction loss L = (1/|I|) Σ_{i∈I} ||f_{θ,φ}(τ̃)_i − τ_i||² over masked positions only. Adam, lr 1e-3 with scheduler, 200 epochs, batch 1024, early stopping on validation; NVIDIA A100/L40s 40GB.

## 4. Equations & assumptions
- φ(n) = ln(n − n_min + 1) / ln(n_max − n_min + 1); R(n) piecewise as above.
- I_key = {p_k | d_max(p_k, overline{p_1 p_n}) > ε}; recursive RDP on left/right segments.
- h_i^s = Conv1D(x_i, y_i); h_i^t = Linear(Δt_i); h_i = h_i^s + h_i^t.
- RoPE: rotation by θ_i = i/10000^{2k/d} applied to embedding halves.
- L = (1/|I|) Σ_{i∈I} ||f_{θ,φ}(τ̃)_i − τ_i||². Inference: z = E_θ({h_i}), pooled for fixed-dim reps.
- Assumptions: reconstruction of masked GPS points in absolute normalized coordinates is a sufficient proxy for representation quality; vehicle mobility patterns transfer across regions; task-adaptation via adapter/classifier heads is sufficient (no architecture change per task).

## 5. Features / target
Inputs: per-point (Δlng, Δlat relative to trajectory start, Δt). Self-supervised targets: masked points under four strategies — random (general), block (long gaps), key-points (turns), last-N (future). No labels in pretraining; downstream: recovery/prediction (coordinates), classification (travel mode / vehicle type), generation (via ControlTraj integration).

## 6. Validation design
Four downstream tasks × six datasets. **Recovery**: randomly mask 50% of points, MAE/RMSE in meters (geographic distance); UniTraj evaluated zero-shot (WorldTrace-trained) and fine-tuned; baselines Linear, DHTR, Transformer, DeepMove, TrajBERT, TrajFM. **Prediction**: 5 future points, same metrics/baselines, on WorldTrace/Chengdu/GeoLife. **Classification**: encoder as backbone + classifier head; two settings (head-only vs full fine-tune); datasets GeoLife, Grab-Posisi; baselines GRU, LSTM, STGN, TrajFormer; metric accuracy. **Generation**: UniTraj replaces ControlTraj's road-segment extractor; density error + heatmaps; intra-city Chengdu and cross-city Chengdu→Xi'an. Ablations: training data scale/quality (0.01/0.5/1M high-quality vs full 2.45M), training source (WorldTrace vs Chengdu), encoder blocks 2–16, mask ratios, component on/off (Table 4).

## 7. Numerical results / baselines
- **Recovery (MAE, meters):** Xi'an — UniTraj(ft) 6.50 vs TrajFM 18.86, DeepMove 27.31. GeoLife — UniTraj(ft) 23.23, "nearly halving TrajFM's error." Zero-shot UniTraj already beats all traditional baselines on every dataset; fine-tune gives the lowest MAE/RMSE everywhere.
- **Prediction (5 future points):** Chengdu — UniTraj(ft) MAE 28.78 / RMSE 32.44 vs TrajFM 77.82/80.48, DeepMove 36.31/39.10. Zero-shot UniTraj best on all three datasets.
- **Classification:** GeoLife — UniTraj(ft) 78.8%, head-only 71.3% (beats all from-scratch baselines). Grab-Posisi — UniTraj(ft) 79.3%, head-only 64.2%.
- **Generation:** Chengdu density error 0.0039 → 0.0037 with UniTraj (5.1% reduction); cross-city Chengdu→Xi'an 0.0171 → 0.0152 (11.1% improvement).
- **Data study:** MAE decreases with scale (0.01M → 0.5M → 1M); full 2.45M slightly higher MAE than curated 1M (quality > raw scale at the margin). WorldTrace-trained generalizes better zero-shot across datasets than Chengdu-trained; Chengdu-trained wins only on similar-density datasets (Xi'an, Grab-Posisi).
- **Architecture:** encoder blocks — MAE ~40 at 2 blocks → ~10 at 8 blocks, no gain beyond 8. Mask ratio 50% best; 5–10% under-trains, 75% destroys context. Dynamic resampling helps most on low-quality GeoLife/Grab-Posisi; consistent resampling critical for regular datasets (Porto, WorldTrace); key-points masking matters on high-quality Chengdu/Xi'an; block masking on GeoLife/Porto.

## 8. Code / data availability
WorldTrace derived data: "we will share derived datasets under the same [ODbL] license terms"; "Currently, we provide a data sample for reference" (link in paper). No explicit UniTraj code URL found in text read.

## 9. Leakage & limitations
- Fine-tune splits not stated to be time-ordered; recovery/prediction metrics computed on random test partitions — potential within-corpus leakage via overlapping routes/periods.
- GeoLife travel-mode classification may leak through sampling-rate signatures (modes differ in sampling), inflating the head-only 71.3%.
- Pretraining objective (coordinate reconstruction) is a proxy; the "last-N" masking aligns with prediction but random/block masking may waste capacity on irrelevant imputation for downstream NFL tasks.
- Single-agent vehicle trajectories only; nothing about multi-agent interaction, adversarial opponents, or play structure.
- 2.38M params / 200 epochs / batch 1024 on A100 — modest, but the WorldTrace pipeline (map-matching, RDP) is heavy preprocessing.
- No code link in the text I read; reimplementation required.

## 10. GSE overlap
GSE has no trajectory foundation model; the benchmark lane inventories metrics and the @NextGenStats profile, not learned embeddings. UniTraj is the closest existing recipe to a "pretrain once, use everywhere" tracking backbone for GSE — NEW capability. Its four masking strategies map directly onto NFL tracking regimes: random → dropped frames, block → occlusion stretches, key-points (RDP turns) → route breaks/cuts, last-N → ball-carrier trajectory forecasting. Complements ledgers 1862–1863 (JEPA family) with an MAE-family alternative — cheap ablation across both SSL paradigms is warranted.

## 11. GSE implementation spec
1. Data: NFL 10Hz tracking (nflverse/BDB 2018–2024), per-play per-agent sequences (~40–80 frames), features (x, y, speed, accel, orientation) + ball. Corpus ~1M+ play-agent trajectories — comparable scale to WorldTrace's 1M high-quality subset.
2. Tokenizer adaptation: spatial = (x − x_snap, y − y_snap) relative to snap position (analog of origin normalization); temporal = Δt; add kinematic channel (speed, accel) via linear layer summed in. RoPE over frame index.
3. Pretrain UniTraj-style MAE (8 encoder blocks, d=128, mask 50%, all four masking strategies incl. RDP key-points = route cuts) on unlabeled play-agent trajectories, batch 1024, ~100–200 epochs on 1–2 A100s.
4. Downstream heads: (a) play-embedding retrieval; (b) trajectory completion for NGS-denied/occluded frames; (c) fine-tune heads for prop-relevant targets (e.g., receiver separation at catch point). Adapter-only first, full fine-tune second.
5. Effort: ~3 engineer-weeks (tokenizer + training harness; decoder lightweight).

## 12. Reproducible test
Dataset: 2023–2024 NFL tracking, train on weeks 1–12 both seasons, test on weeks 13–18. Test A (recovery): mask 50% of frames in test plays; metric = masked-position MAE in yards vs linear-interpolation baseline. Test B (downstream): frozen encoder + linear head predicting play outcome class (pass-complete/incomplete, run-stuffed/explosive) on held-out weeks; metric = accuracy vs from-scratch GRU baseline. Run target: <72h on 1 A100.

## 13. Acceptance / rejection gate
ADOPT if: (a) recovery MAE ≥ 30% lower than linear interpolation on held-out weeks 13–18, OR (b) frozen-encoder + linear-head outcome classification accuracy ≥ 8pp above the from-scratch GRU baseline on held-out weeks. REJECT if neither holds.

## 14. Improvement experiment
Beyond the paper: (1) cross-agent masking — mask an entire player's trajectory and reconstruct it from the other 21 players + ball (the paper masks only within a single trajectory; football's strongest self-supervision signal is inter-agent). (2) Replace origin-normalization with ball-relative coordinates plus a play-phase embedding, since absolute field position matters in football (red zone vs midfield). Hypothesis: cross-agent masking yields embeddings where nearest-neighbor retrieval groups plays by defensive coverage concept rather than by superficial route shape — testable with FTN charting coverage labels.

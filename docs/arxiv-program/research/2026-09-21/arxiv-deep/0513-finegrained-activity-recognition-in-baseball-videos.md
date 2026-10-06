# [0513] Fine-grained Activity Recognition in Baseball Videos (arXiv:1804.03247v1)

**Citation:** AJ Piergiovanni, Michael S. Ryoo (2018). *Fine-grained Activity Recognition in Baseball Videos*. arXiv:1804.03247v1. URL: https://arxiv.org/abs/1804.03247v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 9 pages / 33,454 chars).
**Verdict:** REJECT — a computer-vision activity-recognition paper on baseball broadcast video; GSE operates no video pipeline and the methods (temporal pooling for clip classification) have no transfer path to NFL betting, DFS, or tracking-data modeling.

## 1. Research question
Can fine-grained baseball activities (swing vs bunt vs no-swing, ball vs strike, pitch type, pitch speed) be recognized from single-viewpoint broadcast video, and which temporal feature-aggregation method (max/mean pooling, temporal pyramid, temporal convolution, learned sub-events, LSTM, super-events) best captures the temporal structure for segmented classification and continuous detection?

## 2. Dataset / schema
- **MLB-YouTube** (new dataset introduced by the paper): 20 games from the 2017 MLB postseason sourced from YouTube, 42+ hours of footage.
- Segmented set: 4,290 video clips, multi-label annotated. Activity counts: No Activity 2,983 (hard negatives: crowd/field/players standing), Ball 1,434, Strike 1,799, Swing 2,506, Hit 1,391, Foul 718, In Play 679, Bunt 24, Hit by Pitch 14. Pitch clips additionally labeled with pitch type (fastball, sinker, curveball, changeup, slider, knuckle-curve) and pitch speed.
- Continuous set: 2,128 clips of 1–2 minutes, per-frame annotated, averaging 7.2 activities each → 15,000+ activity instances.
- Access: dataset, code, and trained models stated as available at https://github.com/piergiaj/mlb-youtube/ (not verified by this worker — no network access).

## 3. Method / model
- Base per-frame/segment CNNs: I3D (pretrained ImageNet + Kinetics) and two-stream InceptionV3 (pretrained ImageNet + Kinetics); frames extracted at 25 fps, TV-L1 optical flow clipped to [−20, 20]; InceptionV3 features every 3 frames (8 fps), I3D temporal stride 8 (3 fps). Pose features via OpenPose (joint/body-part heatmaps stacked as channels into a newly trained InceptionV3) for pitch-type classification.
- Temporal aggregation methods compared: (a) temporal max/mean pooling; (b) temporal pyramid pooling (intervals of 1/2, 1/4, 1/8, max-pooled and concatenated → K×D); (c) temporal convolution (L×1 kernels) + max-pool; (d) learned sub-events: N strided Gaussians parameterized by learned center g, width σ, stride δ, applied by matrix multiplication to T×D features → N×D; (e) bi-directional LSTM (512 hidden units, last hidden state to classifier).
- Continuous detection: per-frame fully-connected baseline; sliding-window extensions of the above (window L; pyramid → 14 segments per window; temporal conv kernel of length L convolved over T×D → per-frame classifier; sub-event filters convolved → N×D×T); super-events: N learned Cauchy temporal filters with per-class soft-attention weights, concatenated per timestep; best = sub-events + super-events (three-level hierarchy).
- Training: PyTorch, Adam, lr 0.01 decayed ×0.1 every 10 epochs, 50 epochs; multi-label binary cross-entropy (segmented) and per-frame BCE (continuous).

## 4. Equations & assumptions
Stated equations (condensed faithfully):
- Sub-event filter locations: g_n = 0.5·T·(g̃_n+1); δ_n = (T/(N−1))·δ̃_n; μ_n^i = g_n + (i − 0.5N + 0.5)·δ_n (Eq. 1). Filters: F_m[i,t] = (1/Z_m)·exp(−(t−μ_m^i)²/(2σ_m²)), i∈{0..N−1}, t∈{0..T−1} (Eq. 2).
- Segmented loss: L(v) = Σ_c [z_c·log p(c|G(v)) + (1−z_c)·log(1−p(c|G(v)))] (Eq. 3).
- Continuous loss: L(v) = Σ_{t,c} [z_{t,c}·log p(c|H(v_t)) + (1−z_{t,c})·log(1−p(c|H(v_t)))] (Eq. 4).
- Super-event filters: x̂_n = (T−1)(tanh(x_n)+1)/2; γ̂_n = exp(1−2|tanh(γ_n)|); F[t,n] = 1/[Z_n·π·γ̂_n·((t−x̂_n)/γ̂_n)²] (Eq. 5). Super-event representation: S_c = Σ_m A_{c,m}·Σ_t F_m[t]·v_t (Eq. 6).
Stated assumptions: single broadcast camera viewpoint suffices; activities are frame-localizable within clips; multi-label BCE is the right objective; hard negatives (crowd/field shots) adequately represent the negative class; umpire strike signals are a legitimate (if occluded, idiosyncratic) feature.

## 5. Features / target
- Inputs: RGB frames and optical-flow frames (two-stream), I3D spatiotemporal features, OpenPose pose heatmaps (pitch-type task).
- Targets: (a) multi-label activity presence per clip / per frame (9 activity classes); (b) binary pitch/non-pitch; (c) pitch speed (continuous, L1 loss); (d) pitch type (6 classes). Horizons: clip-level or frame-level.

## 6. Validation design
- Segmented: binary pitch/non-pitch accuracy (Table 2); multi-label mAP overall (Table 4) and per-class AP (Table 5); pitch-speed regression RMSE (Table 6); pitch-type accuracy (Table 7). Baselines: random, base CNN with mean/max pooling, per-method ablations; parameter counts reported (Table 3).
- Continuous: per-frame mAP (Table 8) vs per-frame FC baseline and sliding-window variants.
- Train/test split methodology and seed/variance: not stated in paper. No confidence intervals.

## 7. Numerical results / baselines
- Pitch/non-pitch binary accuracy (Table 2): InceptionV3 97.46/98.44/98.67 (RGB/Flow/Two-stream); +sub-events 98.67/98.73/99.36; I3D 98.64/98.88/98.70; I3D+sub-events 98.42/98.35/98.65 — task near-saturated, little model differentiation.
- Multi-label mAP (Table 4, two-stream): InceptionV3+mean-pool 45.3; max-pool 54.4; pyramid 55.3; LSTM 57.7; temporal conv 56.1; sub-events 62.6 (best). I3D equivalents: 52.7/57.2/58.7/53.1/58.4/61.3 (sub-events best).
- Parameter cost (Table 3, added params): max/mean pool 16K; pyramid 115K; LSTM 10.5M; temporal conv 31.5M; sub-events 36K — paper's interpretation: LSTMs/temporal conv overfit and are sequential/non-parallelizable; sub-events win with far fewer parameters.
- Per-class AP (Table 5, two-stream): sub-events especially help strike, hit, foul, hit-by-pitch (e.g., InceptionV3 foul 40.3→60.7; hit-by-pitch 15.7→29.2). Bunt remains poor (10.2→12.4 RGB-based; only 24 examples).
- Pitch speed RMSE (Table 6): best = InceptionV3+sub-events at 60 fps, 3.6 mph (I3D+sub-events 3.9; I3D 4.3; InceptionV3 5.3). Paper notes 8/3 fps features gave only 1–2 pitch frames — insufficient; 60 fps re-extraction was required.
- Pitch type accuracy (Table 7): I3D+sub-events 34.5%; pose+sub-events 36.4% (best); random 17.0%; fastball easiest (68%), slider 45%, sinker hardest (12%). LSTM underperforms baseline (18.5% vs 25.8%) — attributed to overfitting.
- Continuous per-frame mAP (Table 8, two-stream): best = sub+super-events: I3D 40.4, InceptionV3 40.9 (vs I3D baseline 34.2 / InceptionV3 baseline 31.9).

## 8. Code / data availability
Stated: code, dataset, and trained models at https://github.com/piergiaj/mlb-youtube/ (not verified by this worker).

## 9. Leakage & limitations
- Train/test split protocol unstated — clips drawn from the same 20 games could easily leak across splits (same pitchers, same broadcast graphics, same stadium), inflating all reported numbers.
- Bunt (24) and hit-by-pitch (14) classes have trivial sample sizes; per-class AP on them is noise.
- The super-event Cauchy formulation and sub-event Gaussian parameterization are clever but the paper reports no ablations of N (number of filters) or sensitivity to initialization.
- External validity: baseball broadcast video has a fixed center-field camera and discrete pitch events; the temporal-pooling bake-off is vision-specific and says nothing about tabular/sequence NFL data. The one possibly transferable idea — learned temporal attention intervals — is a generic mechanism already well covered in GSE's sequence-modeling literature (temporal fusion transformers in the ML brief).
- No uncertainty quantification; no comparison to modern (post-2018) video architectures — paper is a 2018 dataset+benchmark contribution, now dated.

## 10. GSE overlap
Checked against `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. No overlap and no gap filled: GSE has no video-analysis lane, no broadcast-footage pipeline, and no baseball modeling. (Relevant standing rule from AGENTS.md: Garrett's video operation uses real game footage with transformative edits — this paper's activity-classification task is unrelated to that workflow.) The temporal sub-event mechanism is a distant cousin of attention-based sequence models already in GSE's ML-brief scope. Different domain, different data modality, no transfer path — not a duplicate, simply out of scope.

## 11. GSE implementation spec
Not applicable — REJECT verdict. No build recommended; GSE should not stand up a video-activity pipeline for this.

## 12. Reproducible test
Not applicable — REJECT verdict. The paper's own benchmark (MLB-YouTube mAP) is not runnable by GSE (no video pipeline, dataset unmirrored locally) and not relevant to any GSE product.

## 13. Acceptance / rejection gate
REJECTED at the paper level: the gate (a transferable method or result applicable to NFL win/spread/total/projection modeling) fails — the paper's contributions are dataset + vision benchmark, both baseball-video-specific.

## 14. Improvement experiment
If the learned-temporal-interval idea were ever ported to GSE's sequence models: replace fixed lookback windows in the NFL play-sequence encoder with learned Gaussian/Cauchy temporal attention filters (the paper's Eq. 1–2 mechanism) over the play history, testing whether learned intervals beat fixed windows on next-drive EPA prediction. This is speculative and low-priority; the mechanism is already approximated by attention weights in transformer-based approaches in GSE's ML brief.

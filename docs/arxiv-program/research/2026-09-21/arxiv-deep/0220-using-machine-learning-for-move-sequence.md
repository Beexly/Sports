# [0220] Using Machine Learning for move sequence visualization and generation in climbing (arXiv:2503.00458v1)

**Citation:** Thomas Rimbot, Martin Jaggi, Luis Barba — EPFL (2025). *Using Machine Learning for move sequence visualization and generation in climbing*. arXiv:2503.00458v1. URL: https://arxiv.org/abs/2503.00458
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 757 lines).
**Verdict:** REJECT — student project with negative/inconclusive results (all three prediction models fail) and a climbing-specific task with no transfer path to GSE's NFL product.

## 1. Research question
Can machine learning (a) visualize bouldering move sequences as animated humanoid skeletons generated from a sequence of holds + extremity assignments, and (b) predict the move sequence (the correct order of holds plus which limb uses each — the "beta") from an unordered holds sequence, framed as a text-translation/sorting problem using sequence-to-sequence and Transformer models?

## 2. Dataset / schema
- **Dataset A (move-sequence detection / seq2seq):** competition videos from the Swiss Olympic Climbing team, reused from earlier EPFL student projects. Move sequences extracted via a pose-estimation pipeline; holds sequences obtained by clustering move sequences with DBSCAN. No sample size stated. Videos described as "not very clean" with "big diversity of moves."
- **Dataset B (Transformer holds-ordering):** 20 videos of a single climber on a standardized Moonboard, manually annotated via the authors' OpenCV selection interface; 50 random input permutations per video → 1,000 sequences for order-invariance.
- **Schema:** holds as (x, y) coordinates on a still boulder image (normalized to [0,1]); move-sequence words of form "limb_xN_yN" (limb = hand/foot, left/right) or, for the simplified task, tokens [0, N−1] indexing holds.
- **Access:** dataset A is competition footage (proprietary); dataset B is 20 manually labeled YouTube videos (reproducible in principle, tiny). No data release stated.

## 3. Method / model
- **Visualization pipeline:** MediaPipe pose extraction (33 landmarks × {x, y, visibility} = 99 features per frame) → static-extremity detection via frame-to-frame distance thresholds → DBSCAN clustering of static point clouds → hold positions drawn with OpenCV in temporal order. For synthesis: move sequence (hold coordinates + extremity + order) → interpolate extremity landmark coordinates between consecutive holds (speed weighted by hold distance and desired frame count, ~1,500 frames) → predict remaining body landmarks from extremities with a **scikit-learn linear regression** trained on recorded climber videos (>99% accuracy claimed, sufficient for visualization) → draw skeleton via MediaPipe on the boulder image → output animation.
- **Prediction model 1 (seq2seq):** PyTorch encoder–decoder with attention, 512-dim latent space; input words "xN_yN" (holds), output words "limb_xN_yN" (moves); teacher forcing; token-wise prediction. Coordinates discretized to a 0.1 grid ({0, 0.1, …, 1.0}) because Colab memory limited vocabulary size.
- **Prediction model 2 (autoregressive Transformer):** encoder–decoder where decoder is a linear layer; input = concatenation of original + sorted sequences (input tokens plus all-but-last sorted tokens), output = shifted version; tokens are hold indices [0, N−1]; coordinates injected via a positional-embedding adapted to work on (x, y) coordinates instead of word order; causal attention mask; cross-entropy + Adam; padding to fixed length with an imaginary hold.
- **Prediction model 3 (simplified Transformer):** encoder layer + linear decoder, single forward pass, no positional embedding, no masking; trained with Adam for 300 epochs.

## 4. Equations & assumptions
- Perplexity of fixed-length models (evaluation metric): `PPL(x_0, x_1, …, x_t) = exp(−(1/t) Σ_i log(p_θ(x_i | x_{<i})))` — Equation (1).
- Move sequence template: (x_i, y_i, limb_i) with i = 1…n in order of use.
- Assumptions (author-stated or implicit): (a) DBSCAN clusters of static-extremity points correspond to holds; (b) linear interpolation of extremities + linear-regression body model yields plausible skeletons; (c) hold ordering is order-invariant under permutation augmentation; (d) coordinates can be discretized to 0.1 resolution without losing predictive signal; (e) padding-token predictions don't dominate learning (this assumption failed — model 2 collapsed to predicting padding).

## 5. Features / target
- **Visualization inputs:** move sequence = ordered (x, y, limb) tuples, ~1,500 frames of 99 landmark features per frame.
- **Prediction inputs:** unordered holds sequence (coordinates as tokens or via coordinate positional embedding).
- **Target:** ordered move sequence (model 1: with limb labels; models 2–3: hold ordering only). Model 2/3 output is discrete token indices, not continuous coordinates.

## 6. Validation design
- **Model 1:** trained 100 epochs (~2 hours on Google Colab GPU), loss trend monitored (Fig. 4), evaluated on a validation set with PPL; qualitative comparison of predicted vs. true move sequence (Fig. 5). No train/val/test split details or sample counts stated.
- **Model 2:** various learning rates, embedding dimensions, positional embeddings; training and validation losses monitored — both "go down, but quickly stabilize around a fixed value."
- **Model 3:** 300 epochs with Adam at multiple learning rates; best model by validation loss saved at intervals and evaluated on the validation set; qualitative example (Fig. 7, validation sequence of length 14 padded to 17).
- **Baselines:** none — no baseline comparisons reported; this is an exploratory student project.

## 7. Numerical results / baselines
- **Visualization:** body-landmark linear regression achieves "more than 99%" accuracy on a limited number of training videos (author's claim, sufficient for visualization purposes). Skeleton animations described as "definitely satisfactory" qualitatively, but linear interpolation produces non-physical behavior (limb stretching, no simultaneous multi-extremity moves, no dynamic/jump moves) — explicitly called out as problematic for new-school bouldering.
- **Model 1 (seq2seq):** training loss decreases (Fig. 4) but predictions are "disappointing": "most of the predicted positions are not even holds" (Fig. 5). Author attributes failure to (a) DBSCAN-based holds-sequence construction, (b) noisy/imprecise move-sequence labels and diverse videos, (c) vocabulary discretization to a 0.1 grid limiting resolution.
- **Model 2 (autoregressive Transformer):** "disappointing" — the model "almost always outputs the padding token no matter which input is fed into it," because most sequences are shorter than max length and the model earns consistent accuracy by always predicting padding.
- **Model 3 (simplified Transformer):** improvement — no longer always predicts padding; on a validation sequence of length 14 (padded to 17), accuracy ≈35%, but "only 2 non-padding tokens have been accurately predicted"; remaining accuracy comes from correctly predicting the last 3 padding tokens. Author concludes "the results look pretty random."
- Overall: **all three prediction models fail**; the paper's own conclusion is that results "are not satisfying and would require more research."

## 8. Code / data availability
None stated — no repository link; Moonboard beta videos are public YouTube (link cited as reference [9]) but the authors' annotations and code are not shared.

## 9. Leakage & limitations
- **All prediction results are negative** — there is no positive finding to leak, but also no evidence the task is learnable in this framing.
- Data provenance: holds sequences derived by DBSCAN-clustering the very move sequences being predicted (model 1) — circular construction that may inject artifacts.
- Small, noisy data: 20 videos (model 2/3), imprecise move labels, diverse competition footage.
- Discretization: rounding coordinates to 0.1 destroys spatial precision the task needs.
- Padding-token collapse (model 2) and padding-inflated accuracy (model 3: 35% where 3/17 tokens are padding) — evaluation numbers are misleading as presented.
- External validity to NFL: none. Climbing beta prediction maps to no GSE product (game predictions, props, DFS). The pose-estimation pipeline maps to nothing GSE does (no player video analysis lane).

## 10. GSE overlap
- **Existing-research-map check:** no climbing, no pose-estimation, no sequence-translation-for-sports content in Garrett's corpus. The diffusion-trajectory modeling paper (2503.18589) covers trajectory generation but for a real prediction task; this paper's skeleton visualization has no analogue.
- **Duplicate vs extension vs new:** the ML plumbing used (seq2seq, Transformers, padding, teacher forcing) is generic and better covered elsewhere in the corpus. The domain content (climbing move prediction) is **not portable** to NFL prediction. Nothing here fills a gap-list item.

## 11. GSE implementation spec
No implementation warranted (verdict REJECT). The one portable artifact — a linear-regression body-pose completion model for skeleton animation (>99% claimed accuracy on tiny data) — has no GSE use case; GSE does not produce animated player-pose content, and the standing video rule (AGENTS.md, 2026-09-15) requires real game footage, not synthesized animations.

## 12. Reproducible test
Not applicable — no code or annotated data released, and the reported results are negative, so there is no claimed effect to reproduce.

## 13. Acceptance / rejection gate
REJECT — no gate needed. (Notional: adopt only if a non-padding token-order accuracy ≥60% were demonstrated on held-out boulders — a criterion the paper's own best model (2/14 non-padding tokens correct) fails by an order of magnitude.)

## 14. Improvement experiment
The honest follow-up is a data-first fix: manually annotate ≥500 Moonboard problems with exact hold order + limb assignments (the authors' own OpenCV interface makes this feasible), train a pointer-network / permutation-invariant set Transformer directly on continuous coordinates (no 0.1 discretization), and evaluate with exact-match rate on non-padding tokens — testing whether the task is learnable at all before iterating on architecture.

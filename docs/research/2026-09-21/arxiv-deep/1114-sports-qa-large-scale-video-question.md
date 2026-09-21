# [1114] Sports-QA: A Large-Scale Video Question Answering Benchmark for Complex and Professional Sports (arXiv:2401.01505v5)

**Citation:** Haopeng Li, Andong Deng, Jun Liu, Hossein Rahmani, Yulan Guo, Bernt Schiele, Mohammed Bennamoun, Qiuhong Ke (2026). *Sports-QA: A Large-Scale Video Question Answering Benchmark for Complex and Professional Sports*. arXiv:2401.01505v5. URL: https://arxiv.org/abs/2401.01505
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, text extracted with pdftotext; all main sections, equations, experiments, results, limitations read).
**Verdict:** ADAPT — the Adaptive Focal Attention mechanism and the sports-video QA dataset construction protocol are portable to GSE's film/tracking analysis; the QA benchmark itself is not directly a GSE product.

## 1. Research question
Can video question answering handle *complex professional sports* video — fine-grained temporal reasoning (what happened before/after an event), causal reasoning (why did a play succeed), and counterfactual reasoning (what if a player had moved differently) — rather than the coarse action labels of existing sports-video datasets? The paper builds Sports-QA, a 94k-pair benchmark across eight sports/events, and proposes Adaptive Focal Attention (AFA), a temporal attention mechanism that adaptively fuses multiple temporal focal lengths so a model can attend to both short-range motion details and long-range play context.

## 2. Dataset / schema
- **Sports-QA** (new): 5,967 videos, 94,073 QA pairs, eight sports/events. Split 60%/20%/20% **by video** (train/val/test).
- Question-type counts: descriptive 48,268; temporal 39,643; causal 4,676; counterfactual 1,486.
- Open-ended answers were converted to a **191-class** classification problem after dropping classes with fewer than 30 samples.
- Access: dataset construction protocol described; GitHub repo stated (see §8). Raw video licensing is the usual sports-footage caveat (not fully addressed in paper).

## 3. Method / model
- **Adaptive Focal Attention (AFA):** for a query token q_j, attention is computed as a convex combination over focal lengths f of windowed attention restricted to frames within |i−j| ≤ f. Final focal lengths used: **{3, 9, 80}** frames. The mixing weights α_f are learned (Σ_f α_f = 1).
- Backbone: video transformer encoder; hidden dimension **512**; trained **50 epochs**, Adam, learning rate **1×10⁻⁴**, batch size **16**.
- Baselines: standard video-QA models plus a BERT-score-based evaluation; additionally a fine-tuned **Qwen2.5-3B** vs zero-shot comparison.

## 4. Equations & assumptions
- AFA(q_j) = Σ_{f∈F} α_f Σ_{i∈D_j^f} softmax_i(q_j^T k_i / √d) v_i, with D_j^f = {i : |i−j| ≤ f} and Σ_f α_f = 1.
- Assumptions: (a) a small fixed set of focal lengths ({3,9,80}) suffices to cover relevant temporal scales; (b) collapsing open-ended answers to 191 classes (dropping classes with <30 samples) preserves the benchmark's difficulty; (c) splitting by video prevents leakage (stated, reasonable).

## 5. Features / target
- Inputs: video frames (sampled clip) + natural-language question. Target: answer class among 191 classes. Question types: descriptive / temporal / causal / counterfactual.

## 6. Validation design
- Train/val/test 60/20/20 split **by video** (time-ordering within sport not discussed; splits are video-disjoint).
- Metrics: answer accuracy and F1 (BERT-based scoring for the main table).
- Baselines: prior video-QA models; AFA ("AFT" in results table) vs baseline; Qwen2.5-3B zero-shot vs fine-tuned.

## 7. Numerical results / baselines
- Main (BERT-scored) result: baseline **57.9 accuracy / 23.9 F1**; with AFA ("AFT") **59.1 / 25.4** (Table: +1.2pp accuracy, +1.5pp F1).
- Qwen2.5-3B: zero-shot **27.77%** → fine-tuned **63.71%** (fine-tuning dominates; the base LLM knows little about fine-grained sports video).
- Paper's claim: AFA consistently improves temporal/causal question types, where multi-scale temporal context matters most.

## 8. Code / data availability
- GitHub stated in paper: `https://github.com/HopLee6/Sports-QA`. (Link as stated; not independently verified in this read.)

## 9. Leakage & limitations
- Splitting by video is the right call; no cross-split leakage by construction. Adversarial notes: (a) collapsing to 191 classes discards the hardest open-ended tail — reported accuracy is on the *easy-ified* task; (b) counterfactual questions are only 1,486 pairs (1.6%) — the headline capability is the thinnest slice; (c) +1.2pp from AFA is real but modest; most of the gain comes from fine-tuning the LLM backbone; (d) no NFL/American-football-specific evaluation — external validity to NFL film rests on the eight included sports/events; (e) video licensing for a commercial GSE product is unresolved.

## 10. GSE overlap
- Existing-research map: NGS/tracking taxonomy is inventoried; video-QA as a capability does **not** appear in any existing ledger (checked: no video-QA/VQA ledger in `arxiv-deep/`). This is a **new capability**, not a duplicate. It extends the tracking lane: AFA is a temporal-attention primitive applicable to any frame/sequence model over tracking data.

## 11. GSE implementation spec
- **Data:** nflverse play-by-play + Next Gen Stats tracking sequences (10 Hz player coordinates) as the "video"; no broadcast footage needed, sidestepping licensing.
- **Model:** transformer encoder over tracking frames with AFA-style multi-focal attention (focal lengths scaled to football time: e.g., {5, 25, 100} frames ≈ {0.5s, 2.5s, 10s}); question encoder replaced by a play-context encoder (down/distance, personnel, score).
- **Task:** play-outcome QA — "what happens next" classification (run/pass, EPA bucket) and counterfactual "what if the blitz had come" probes for coaching-content generation.
- **Serving:** offline batch over weekly tracking files; no real-time requirement.
- **Effort:** ~2–3 engineer-weeks for a prototype (data loader exists in GSE tooling; AFA is a drop-in attention replacement).

## 12. Reproducible test
- Dataset: 2022–2024 NFL regular-season tracking plays (nflverse + NGS). Task: predict play EPA bucket (5 classes) from pre-snap through 2s post-snap tracking. Baseline: same transformer with standard full attention. Metric: accuracy + macro-F1 on 2024 holdout (train ≤2023).

## 13. Acceptance / rejection gate
- **Adopt** if AFA beats standard attention by ≥1.5pp accuracy AND ≥1.0pp macro-F1 on the 2024 holdout; **reject** otherwise (the paper's own margin is ~1.2pp — demand at least parity with that on football data).

## 14. Improvement experiment
- Make focal lengths **learnable per attention head** (instead of fixed {3,9,80}) and condition the mixing weights α_f on play context (e.g., longer focal length on obvious passing downs). Hypothesis: the model learns short focus for line-of-scrimmage chaos and long focus for developing routes — beating fixed focal lengths on temporal questions, which is exactly where the paper shows AFA helps most.

# 0624 SPRINT: Sports Hazard MLLM Benchmark (arXiv:2608.05560v1)

**Citation:** Authors. *SPRINT: a benchmark for proactive sports-hazard early warning in multimodal LLMs* (arXiv:2608.05560v1). URL: https://arxiv.org/abs/2608.05560
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the annotation schema (T1 earliest-cue / T2 obvious-moment timestamps, H1 macro / H2 direct causes) and the LoRA fine-tuning recipe are a portable template for an experimental NFL video lane (pre-injury hazard detection from practice footage); the headline detection numbers are heavily prompt-driven and must not be mistaken for a betting edge.

## 1. Research question
Can today's multimodal LLMs proactively warn of imminent physical danger in sports videos *before* the accident happens — and do they understand causes, or merely react to visual change? SPRINT benchmarks hazard detection, early-warning timeliness, causal attribution, and false-alarm control.

## 2. Dataset / schema
- **2,888 real-world sports videos: 2,440 accidents + 448 safe controls**, spanning **14 sports** and 3 environments, sourced from public YouTube (identifiers only released, not raw files).
- Annotations per accident video: two timestamps — **T1 (earliest perceptible cue)** and **T2 (most obvious moment)** — and two cause levels: **H1 (macro inducing factors: personal, interpersonal-interaction, equipment/facility, venue/environment)** and **H2 (direct cause, free-text description)**. Annotator disagreement > 0.5s triggers discussion and re-annotation; persistent disagreement discards the sample (mean of three timestamps otherwise).
- Safe videos: manually verified accident-free, annotated with the **moment of maximum motion intensity** (the T1 analog for false-alarm diagnosis).
- Access: annotations at **https://github.com/DawnGavial/SPRINT**, CC BY-NC 4.0, non-commercial academic research.

## 3. Method / model
- Evaluation protocol, three progressive binary dimensions: **D1 (hazard detection)** — does the model signal current/imminent hazard; **D2 (factor coverage)** — does the cited source match the H1 macro factor; **D3 (cause identification)** — does it articulate the H2 direct cause. Hierarchical: D_i requires all D_j, j<i.
- Three experiments: (1) full-video evaluation under 3 prompts of increasing explicitness (descriptive / analytical / explicit safety); (2) temporal-window evaluation — videos truncated at Window A (start→T1), B (start→midpoint of T1–T2), C (start→T2), under explicit-danger vs. neutral-description prompts; (3) diagnostic false-alarm tests on safe videos (temporal truncation at max-motion moment; static first-frame).
- Models: Doubao-seed-1.8, Gemini-3 Flash/Pro, GPT-4o, GPT-5, InternVL3.5-8B, Qwen3-VL-8B. Videos sampled at 2 fps (max 64 frames closed-source, 32 open-source). Automatic evaluator: Gemini-3 Flash, validated against blind human review (94% agreement D1, 91% D2, 83% D3 on 100 accident videos; 96% on safe-video D1).
- Fine-tuning: GPT-5 generates reference answers from frames + annotations → **71,249 samples** (56,994 train / 7,127 val / 7,128 test, stratified by video); **Qwen3-VL-8B-Instruct + LoRA (r=16, α=32, dropout 0.05)**, 2× NVIDIA RTX A6000, batch 1 × accum 8, lr 2×10⁻⁵, BF16, 2 epochs; 2 fps, max 32 frames, 768px.

## 4. Equations & assumptions
No model equations; the formalism is the evaluation design: response R = M(V_{:T}, P) for truncation time T and prompt P; hierarchical binary scoring over (D1, D2, D3). Assumptions: T1 annotations mark genuinely anticipatable cues; the automatic evaluator's judgments proxy human judgment (validated at 83–96%); YouTube accident videos are representative of real hazard dynamics.

## 5. Features / target
- Inputs: video frames + text prompt.
- Targets: binary D1/D2/D3 per (video, window, prompt) condition; false-positive rate on safe videos.

## 6. Validation design
- Temporal-window truncation is the core anticipation test (can the model warn at Window A, before the obvious moment?).
- Prompt-sensitivity ablations (explicit danger inquiry vs. neutral description) separate visual understanding from prompt-induced compliance.
- Safe-video diagnostics isolate false alarms; fine-tuning uses video-stratified splits (no video spans train/test).

## 7. Numerical results / baselines
- **Best model exceeds 95% on D1 (hazard signaling) but stays below 50% on D3 (cause identification)** — detection without understanding.
- Prompt sensitivity: **Doubao-seed-1.8 drops 88% → 59% on D1** moving from explicit to neutral prompt in the earliest window; open-source models fall below 9%.
- False alarms: explicit prompting pushes **GPT-5's FPR 0.28 → 0.59** and **Doubao's 0.13 → 0.88** on safe videos; even the static first frame triggers warnings.
- Fine-tuning Qwen3-VL-8B: full-video **D1 0.48 → 0.99, D3 0.16 → 0.52**; hardest case (Window A, neutral prompt) **D1 0.09 → 0.84, D3 0.02 → 0.32**; first-frame FPR **0.18 → 0.00** (truncated-video neutral-prompt FPR rose 0.09 → 0.20 — a residual risk the authors flag).
- Stated limitations: no audio modality; no specialized video-anomaly models compared; T1/T2 boundaries inherently subjective; H2 causes are free-text, not a structured taxonomy.

## 8. Code / data availability
Annotations: **https://github.com/DawnGavial/SPRINT** (CC BY-NC 4.0). No raw video redistribution (identifiers + timestamps only). Fine-tuning data construction uses GPT-5 as generator; no training-code URL stated.

## 9. Leakage & limitations
- The headline ">95% detection" is substantially **prompt-induced**: the diagnostic experiments show much of the sensitivity comes from the word "danger" in the prompt, not from visual understanding. Any deployment that leans on these numbers without prompt-robustness testing will drown in false alarms.
- Automatic evaluation by Gemini-3 Flash of other models' outputs (including Gemini's own) is a judge-model confound; human agreement is good but D3 agreement is only 83%.
- Fine-tuning gains are on the same annotation distribution the model was trained on (GPT-5-generated answers from the same H1/H2 labels) — circularity risk; out-of-distribution hazards are untested.
- CC BY-NC 4.0 licensing blocks commercial use of the annotations; a GSE video lane would need its own annotation effort.
- No audio: collision/fracture sounds — often the earliest real-world cue — are excluded by construction.
- For GSE's purposes this is a *research* benchmark, not a betting input: nothing here prices a market.

## 10. GSE overlap
Cites /home/hatch/workspace/arxiv-sweep/existing-research-map.md. The GSE corpus has **no video/MLLM lane at all** — no tracking-derived features beyond nflverse/NGS numeric feeds, no video annotation, nothing in the 15-area ML brief covering vision. This is a genuinely **new capability** (experimental lane): pre-injury hazard detection from practice/game footage, and more broadly a template for evaluating any vision model GSE might use for auto-charting. It duplicates nothing.

## 11. GSE implementation spec
- Data: licensed NFL practice/game footage (or public All-22 where rights permit); annotate a pilot set with the SPRINT schema — T1 (earliest cue: awkward landing, leg whip, pile-up geometry), T2 (injury moment), H1/H2 causes — on ~200–500 plays.
- Build: replicate the LoRA recipe (r=16, α=32, dropout 0.05, lr 2×10⁻⁵, 2 epochs) on an open video-LLM (Qwen-VL class) with GPT-class-generated reference answers from the annotations; evaluate D1/D2/D3 on held-out plays and false-alarm rate on clean plays.
- Serving: offline research tool first — flag candidate high-risk movement patterns for the injury-forecasting lane (ledgers 0619–0623), not a live betting signal.
- Effort: ~3–4 weeks for the annotation pilot + fine-tune; the annotation labor dominates.

## 12. Reproducible test
Pilot: 300 annotated plays (150 injury-adjacent, 150 clean), video-stratified 80/20 split. Baseline: the base (un-fine-tuned) open video-LLM under the neutral prompt. Metrics: D1/D2/D3 on held-out plays; FPR on clean plays. Success: fine-tuned D1 ≥ 0.80 with FPR ≤ 0.25 on clean plays — the paper's recipe must survive outside its own annotation distribution.

## 13. Acceptance / rejection gate
ADOPT the video lane for continued investment iff the pilot clears D1 ≥ 0.80 at FPR ≤ 0.25 on held-out plays with video-stratified splits. If FPR > 0.40 (the paper's prompt-induced false-alarm regime) or D3 < 0.30, park the lane: detection without causal understanding and with high false alarms is a research toy, not a product input. Gate set before running the test.

## 14. Improvement experiment
Add **pose-estimation skeletons** (joint trajectories) as a second input stream alongside RGB frames, and re-run the fine-tune. Why it might win: the paper's models reason over raw pixels and latch onto superficial motion change; explicit kinematics (joint angles, limb velocities at T1) are the actual biomechanical precursors of non-contact injury — a pose stream gives the model the causal vocabulary (valgus collapse, overstriding) that free-text H2 annotations can only describe approximately.

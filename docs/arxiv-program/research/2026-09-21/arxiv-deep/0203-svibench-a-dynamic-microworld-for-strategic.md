# [0203] SVI-Bench: A Dynamic Microworld for Strategic Video Intelligence (arXiv:2605.31529v2)

**Citation:** Yulu Pan, Han Yi, Seongsu Ha, Md Mohaiminul Islam, Benjamin Zhang, Lorenzo Torresani, Gedas Bertasius (2026). *SVI-Bench: A Dynamic Microworld for Strategic Video Intelligence*. arXiv:2605.31529v2. URL: https://arxiv.org/abs/2605.31529v2
**Ledger completed:** 2026-09-21. **Read:** full text (project-page PDF, https://svi-bench.github.io/paper.pdf).
**Verdict:** ADAPT — the benchmark itself is not a GSE method, but three things transfer directly: (a) the data-engine pattern (temporal alignment + cross-modal entity resolution into identity graphs) as GSE's corpus-building blueprint; (b) the T5 outcome-forecasting task design with calibration-error reporting as an eval protocol; (c) the oracle-experiment and human-calibration findings, which validate GSE's modeling-over-perception prioritization and its calibration lane.

## 1. Research question
Can team sports serve as a "dynamic microworld" that combines real-world multi-agent complexity (10–22 agents making coordinated decisions under adversarial pressure) with verifiable ground truth (explicit rules, definitive outcomes) — and does a benchmark built on it reveal a capability stack (perception → causal reasoning → simulation → strategic planning, termed *Strategic Video Intelligence*) on which current multimodal/agentic models show a systematic degradation?

## 2. Dataset / schema
The benchmark corpus (§3.1; basketball = 10 players/compact court/frequent transitions, soccer = 22 players/large pitch/continuous dynamics, hockey = rapid line changes/fast-panning camera; **64 leagues, 2018–2025**; **no American football**):
- ~35K hours of broadcast video (professional footage)
- ~15M timestamped play-by-play event records (official league feeds, with player identities and spatial coordinates)
- ~15K hours of expert commentary (broadcast commentary + analyst narration via Whisper ASR)
- ~23K postgame journalist recaps and editorial analyses
- ~103K box-score statistical records (player and team performance metrics)
- All five modalities temporally aligned and cross-referenced through shared game and player identifiers.
- Access: code MIT at github.com/texaser/svi-bench; **data under gated-access agreement** on huggingface.co/datasets/mvpgroup/svi-bench (not freely downloadable).

## 3. Method / model
A benchmark-construction paper. Two methodological contributions:

**A. The data engine (§3.2) — four stages:**
1. **Temporal alignment:** play-by-play logs are the primary temporal reference via game-clock timestamps; commentary transcripts and game reports aligned via timestamp matching + textual cues → every video clip linked to its events, commentary, and statistical context.
2. **Cross-modal entity resolution:** references to the same player/team/event linked across modalities into **identity graphs** capturing relationships (teammate, opponent) and attributes (position, statistics, role) — e.g., a journalist's "late-game three-pointer" ties the play-by-play event, commentary segment, stat record, and clip to one canonical identity.
3. **LLM-assisted instance generation:** LLMs synthesize task instances from the assembled multimodal context with task-aware prompt templates → QA pairs, plausible distractors, difficulty-calibrated instances, dense captions, narrative summaries.
4. **Quality control:** three filtering stages — automatic consistency checks against event logs, task-specific filters, human expert review by domain-knowledgeable annotators on a stratified subset (all sports × pillars × difficulty). Per-task filtering stats and review protocols in Appendix A.2.

**B. The 9-task, four-pillar hierarchy (Table 3; # = total instances; Train = training split provided):**
- **Pillar 1 — Dynamic Scene Understanding (perception):** T1 Structured Play Description (10s clips, B/H/S, 1.5M, train ✓, open-ended, metric = avg. 0–5 LLM-judge score); T2 Fine-Grained Action QA (10s, 1.5M, train ✓, 5-way MCQ, accuracy); T3 Compositional Video Retrieval (10s, 306K, train ✓, retrieval, R@1).
- **Pillar 2 — Causal Reasoning:** T4 Strategic Reasoning QA (55–150 min context, 1K, train ✗, open, avg. score); T5 Outcome Forecasting (3–15 min observation window, 114K, train ✓, MCQ, accuracy + calibration error); T6 Long-Form Narrative Synthesis (55–150 min, 19K, train ✓, open, saliency).
- **Pillar 3 — Strategic Simulation:** T7 Motion-Conditioned Generation (5–10s, basketball+soccer, 290K, train ✓, generation, video mIoU); T8 Goal-Conditioned Action Generation (5–10s, basketball only, 74K, train ✓, generation, goal accuracy).
- **Pillar 4 — Agentic Synthesis:** T9 Cross-Corpus Agentic Reasoning (multi-source, 1K, train ✗, open, accuracy over a **1.8M-clip corpus**).
- Task construction details: T1 = 10s clips aligned to play-by-play events, structured captions composed from timestamped actions/identities/game state, polished with GPT-4o mini (500K/sport; 280K/3K/3K train/val/test); T2 = 31 question types across 6 capability categories (action recognition, temporal ordering, play analysis, spatial reasoning, player identification, OCR), distractors sampled from the play-by-play event vocabulary with answer distributions balanced per question type (500K/sport; 300K/30K/30K); T5 = 114K MCQs across 15 question types in 3 categories (performance forecasting, game-state evolution, strategic intention), 3–15 min observation windows, target players referenced by indirect action descriptions (not names) to block shortcuts; T6 = 10 report templates/sport (5 single-game, 5 multi-game over 2–10 games), ~500-word reports, reference reports from GPT-5 conditioned on video + play-by-play + metadata + journalist reports (~11,500 hours of full-game video; 17,715 train / 1,000 eval).

## 4. Equations & assumptions
**No equations stated** (benchmark paper; the one formula given is definitional). Metric definitions stated in prose:
- T1: LLM-as-judge Likert 0–5 on six axes (action accuracy, identity accuracy, causality/outcome, spatial understanding, temporal understanding, contextual details); primary metric = mean across axes. Judge = GPT-5.2.
- T5: top-1 accuracy; **calibration error (CE)** per [42], measuring alignment between predicted confidence and empirical correctness; CE = 0 is perfect calibration.
- T6: factual accuracy via atomic-fact decomposition against ground truth; **saliency** = coverage of key events/performances as identified by a SOTA LLM given oracle game information (play-by-play, box scores, journalist reports); writing style 1–5 (coherence, topic adherence, length compliance).
**Assumptions:** team sports' long-horizon causality (early tactical setups → delayed outcomes), unambiguous success signals (scores/turnovers/wins), and layered verifiability (perceptual Qs vs. timestamped logs; causal Qs vs. expert commentary; strategic Qs via outcome-conditioned evaluation) make strategic reasoning measurable; LLM-generated instances grounded in league/human primary sources are valid after the three-stage QC.

## 5. Features / target
n/a — benchmark paper. Per-task inputs/targets: T1 input = 10s clip, target = dense structured caption (actions, identities, positions, game context); T2 input = 10s clip + question + 5 candidates, target = correct answer; T5 input = 3–15 min play sequence + question about a *future* event beyond the window, target = correct outcome among candidates (who will score, which strategy, how game state evolves); T9 input = an analytical question, target = answer requiring autonomous evidence gathering across 1.8M clips. Prediction horizon: T5's target event occurs beyond the observation window (the paper explicitly distinguishes this from short-horizon trajectory forecasting).

## 6. Validation design
- Baselines per task: frontier proprietary (GPT-5.2, Gemini-3-Flash/3.0 Pro/3.1 Pro) + open-source video-language models (LLaVA-Video-7B, Qwen3-VL-8B/32B, Molmo 2 8B, BIMBA) in zero/few-shot, plus finetuned variants (LLaVA-Video-7B jointly on T1+T2, 580K samples; Qwen3-VL 8B and BIMBA on T5).
- **Oracle baselines** (§5.2): replace video input with ground-truth textual descriptions from play-by-play logs — isolates the perception contribution per task.
- **Human studies:** sport-experienced participants (5+ years) on T2 (perception), T4 (strategic reasoning), T5 (forecasting), same inputs and response formats as models, with self-reported confidence (1–3 scale).
- Judge robustness: T1 rescored with 4 independent LLM judges (Spearman 0.66–0.73; GPT-5.2 scores GPT-generated captions 0.21 points *lower* than the non-GPT judge mean — no self-preference); human–judge MAE 0.40 on the 0–5 scale; T6 judge–human agreement 99.3% on saliency over 383 atomic facts, judge-rank Spearman ρ = 0.98.
- Train/test: train splits provided for T1, T2, T3, T5, T6, T7, T8; T4 and T9 are eval-only.

## 7. Numerical results / baselines
Quoted exactly from the paper's tables (paper claims):

**The capability cliff (§5.1, Figure 2):** best-model per pillar, normalized 0–100 — T2 73.91% (finetuned LLaVA-Video-7B) → T9 ~5% (strongest model). "Gains from task-specific finetuning at the perception level do not carry to higher pillars."

**T1 (Table 4/5):** LLaVA-Video-7B few-shot 0.89; Qwen3-VL-32B 1.34; GPT-5.2 1.61; Gemini-3-Flash 1.67; **LLaVA-Video-7B (FT) 2.17 overall** (basketball 2.92, soccer 1.81, hockey 1.77) — +1.28 over its zero-shot, beating both proprietary models despite being an order of magnitude smaller. Per-axis (FT model): action 2.14, identity **1.11** (basketball 1.46, soccer 1.20, hockey 0.66), causality 1.82, spatial 2.74, temporal 2.72, contextual 2.48. "More effective at understanding what is happening and where, but struggles to identify who is involved and why."

**T2 (Table 6/7):** finetuned LLaVA-Video-7B **73.91%** overall (+36.90 over its zero-shot; +15.16 over strongest zero-shot Gemini-3-Flash 58.75%); humans 75.78% (basketball 78.33, soccer 74.00, hockey 74.00) — model within 5 points on basketball, matches on soccer/hockey. Per-category: action recognition 82.7–84.6%, temporal ordering 81.1–92.7%, OCR 79.7–89.9% (strongest); play analysis 51.6–66.2%, player identification 50.8–58.8% (weakest). Humans reach 91–100% on temporal ordering/action/OCR but only 56.7% on player identification.

**T5 (Table 9):** random 29.1%; Molmo 2 8B ZS 35.1% (CE 0.22); BIMBA ZS 34.0% (0.16) → FT 39.9% (0.06); Qwen3-VL 8B ZS 36.9% (0.23) → **FT 44.8% (CE 0.01)**; GPT-5.2 ZS 38.2% (0.28); Gemini 3.0 Pro ZS 43.2%; **oracle (GPT-5.2 + play-by-play) 41.9%** (0.28); humans **58.9%** (basketball 55.0, soccer 73.3, hockey 45.0). Oracle on basketball: 42.3% vs. 38.1% video-only — only +4.2 points, i.e., "accurate perception alone is insufficient for strong forecasting." Hockey hardest for all models (best FT 43.5%). **Horizon analysis (Figure 11):** as temporal distance to the target event grows, accuracy drops 91% → 45% while model confidence barely moves (98% → 94%) — an overconfidence gap widening with horizon; "the model does not adjust its confidence to reflect the increased uncertainty of longer-horizon predictions." GPT-5.2 shows a **28-point gap between average confidence and average accuracy** on T5.

**T6 (Table 10):** GPT-5 71.99% factual / 7.06% saliency / 4.81 style; Gemini 3.1 Pro 73.01% / 7.33% / 4.70; oracle 87.19% / **20.60%** / 4.66; Qwen3-VL 8B 35.66% / 2.13% / 3.50; LLoVi (Pillar-1 captioner + GPT-5) 25.20% / 3.41% / 4.60. Central finding: models produce largely factually correct reports covering only a small fraction of what expert journalists consider important; even with perfect event access, saliency reaches only 20.60%. Cross-source validation: alternative professional reports achieve **45.8% saliency** against the ground truth — 25 points above oracle — so the gap is meaningful, not an artifact.

**T4:** best model 2.17/5 (Gemini 3.1 Pro) vs. humans 4.2/5; oracle gain 2.06 → 2.46. **T9:** strongest model **4.6%** accuracy (abstract: ~5%) over the 1.8M-clip corpus; oracle 54.0% — "the challenge extends beyond perception to reasoning, planning, and evidence integration."

**Human calibration (§5.3):** "Humans not only outperform models but also know when they are uncertain." T2: human accuracy 30% at low confidence → 90% at high confidence. T5: 50% → 100%. "Models do not show this pattern."

## 8. Code / data availability
Code: github.com/texaser/svi-bench (MIT license). Data: huggingface.co/datasets/mvpgroup/svi-bench — **gated-access agreement** (not open). Website: svi-bench.github.io. Paper PDF: svi-bench.github.io/paper.pdf.

## 9. Leakage & limitations
- **No American football:** basketball/soccer/hockey only. The microworld's properties (continuous play, broadcast conventions) differ from NFL's discrete-play structure; transfer to football is untested. (Conversely, NFL's play segmentation may make some tasks *easier* — discrete events with clear outcomes.)
- **LLM-generated instances:** task instances are LLM-synthesized (grounded in league/human sources + three-stage QC, but still synthetic); difficulty calibration and distractor quality inherit LLM biases.
- **LLM judges:** T1/T4/T6 rely on LLM-as-judge; mitigated via multi-judge checks (Spearman 0.66–0.73 on T1, 0.98 on T6) and human agreement studies, but judge bias "remains a potential confound" (paper's own words).
- **Gated data:** the corpus is not freely replicable; GSE cannot just download 35K hours of broadcast video (which also carries broadcast-rights issues the paper does not discuss).
- **Finetuning contamination risk:** finetuned baselines train on T1/T2/T5 splits; the cliff finding (finetuning gains don't transfer upward) is robust to this, but absolute perception numbers partly reflect in-distribution training.
- **Adversarial note:** the paper's headline "capability cliff" is partly a task-difficulty gradient by construction (T9 is eval-only with no training split and a 1.8M-clip search space — near-impossible by design). The cliff is real but the slope is engineered.

## 10. GSE overlap
- Existing-research-map review: GSE has no video-intelligence benchmark work and no corpus-construction methodology beyond nflverse pulls. The **data-engine pattern** (§3.2: game-clock temporal alignment + cross-modal entity resolution into identity graphs + LLM instance generation + three-stage QC) is directly reusable as the blueprint for GSE's own broadcast-video/game corpus — **new capability**, not a duplicate.
- The T5 finding that oracle perception adds only +4.2 points on forecasting ("accurate perception alone is insufficient") independently validates GSE's existing prioritization: the edge is in the *modeling* (forecasting/reasoning), not in squeezing more perception — consistent with the engine-benchmark lane's focus.
- The **calibration findings** (CE 0.23 → 0.01 with finetuning; 28-point confidence–accuracy gap; horizon-widening overconfidence; humans calibrate, models don't) plug directly into GSE's calibration stack (CQR, temperature scaling, grouping loss are covered; *horizon-dependent miscalibration* and *confidence–accuracy gap diagnostics* are new angles).
- Not among the 64 deeply covered papers.

## 11. GSE implementation spec
1. **Corpus blueprint:** replicate the data-engine's four stages for NFL: (a) game-clock temporal alignment of broadcast clips to nflverse play-by-play; (b) cross-modal entity resolution — link play-by-play events, commentary/ASR, box scores, and clips into per-game identity graphs keyed on (game_id, player, play); (c) LLM-assisted generation of GSE's own QA/forecast instances; (d) three-stage QC (auto consistency vs. play-by-play, task filters, expert spot-review). NFL's discrete play structure makes (a)–(b) easier than in soccer/hockey.
2. **Adopt T5's eval protocol for GSE forecasting:** multiple-choice outcome-forecasting questions over fixed observation windows with target events *beyond* the window, indirect player references to block shortcuts, and **calibration error reported alongside accuracy** — CE = 0 as the explicit target.
3. **Add horizon-stratified calibration analysis** to the GSE calibration lane: bin forecasts by temporal distance to the event and report the confidence–accuracy gap per bin (the paper's Figure 11 diagnostic); target the human pattern (accuracy rising monotonically with self-reported confidence).
4. **Effort:** corpus blueprint is a design doc (days); the T5-style eval harness is a moderate build (question generation + judge protocol); full corpus construction is a large data-engineering effort gated on footage access.

## 12. Reproducible test
- **Dataset:** 50 NFL games (2024–2025 seasons) with nflverse play-by-play; construct 2,000 T5-style outcome-forecasting MCQs (drive outcome, next-score type, player statistical milestones) with observation windows of one quarter and target events in the following quarter; target players referenced by indirect descriptions.
- **Metric:** accuracy + calibration error (CE), reported overall and stratified by horizon (plays-ahead bins).
- **Baseline to beat:** GSE's current engine probability outputs verbalized as MCQ answers (zero-shot); the test passes only if a finetuned variant improves CE without losing accuracy — mirroring the paper's FT result (44.8% acc, CE 0.01).
- **Window:** fixed 50-game set; the diagnostic of record is the horizon-binned confidence–accuracy gap.

## 13. Acceptance / rejection gate
- **ADAPT the data-engine pattern and T5 eval protocol** if: the NFL pilot corpus (10 games) achieves ≥ 95% auto-consistency of generated instances against play-by-play logs (the paper's QC stage 1), and the T5-style eval reproduces the paper's qualitative pattern (accuracy degrading with horizon, CE measurable and improvable with finetuning).
- **REJECT** if auto-consistency falls below 90% (the LLM-generation step is too noisy for football's rule complexity), or if gated-access/data-rights constraints make the corpus unbuildable — in which case keep only the eval-protocol half (T5-style questions don't require the full video corpus).

## 14. Improvement experiment
Beyond the paper: **market-grounded outcome forecasting.** Add a fifth modality the paper lacks — pre-game and in-game betting market prices (spreads, totals, moneylines) aligned to the same game clock. Then test whether models that can condition on market-implied probabilities beat video+stats-only models on T5-style questions, and whether the *residual* (model vs. market) is itself predictive. Why it might win: the paper's microworld omits the sharpest available signal of expected outcomes (the market); for GSE's purposes, the interesting question is not whether video models can forecast, but whether they can find edge *against the market* — and the paper's oracle result (perception adds little) suggests the modeling head, not the input modality, is the binding constraint, so a market-conditioned forecaster directly tests that hypothesis.

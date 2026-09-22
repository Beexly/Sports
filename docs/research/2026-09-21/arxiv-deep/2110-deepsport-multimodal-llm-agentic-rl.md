# [2110] DeepSport: A Multimodal Large Language Model for Comprehensive Sports Video Reasoning via Agentic Reinforcement Learning (arXiv:2511.12908)

**Citation:** authors (Rice University / UC Irvine / Georgia Tech, 2025). *DeepSport: A Multimodal Large Language Model for Comprehensive Sports Video Reasoning via Agentic Reinforcement Learning*. arXiv:2511.12908v2. URL: https://arxiv.org/abs/2511.12908
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 2511.12908v2).
**Verdict:** ADAPT
**Rationale:** first end-to-end trained multi-sport MLLM with AGENTIC video reasoning ("think with videos": iteratively calling a frame_extraction_tool) trained by SFT cold-start + GRPO with a gated tool-use reward. The transferable machinery is the reward design: reward the agent for pulling extra evidence only when it helps, with a curiosity bonus for exploration. Needs adaptation (GSE's agent infrastructure; tracking/video queries as the "tools").

## 1. Research question
Existing sports MLLMs are single-sport, single-task, or training-free. Can one end-to-end trained model do multi-task, multi-sport video understanding by shifting from passive frame processing to active, iterative reasoning — "thinking with videos" via a frame-extraction tool — and can agentic RL with a tool-use reward teach it when to look closer?

## 2. Dataset / schema
Distillation pipeline over 9 existing works → 10 data sources, 12 sports (soccer, basketball, volleyball, **American football**, ice hockey, baseball, table tennis, badminton, fencing, boxing, diving, gymnastics). Non-QA sources (FineDiving, SoccerReplay-1988, FACTS, T3-Set) converted to QA via task-specific templates. Three splits, strict video-level splitting (all questions from one video in one split; SoccerBench test clips excluded from SoccerReplay-1988 train):
- **DeepSport-CoT-15k**: 15k LLM-filtered CoT trajectories (teacher: Qwen3-VL-235B-A22B-Thinking; judge: DeepSeek-V3.2-Exp) for SFT.
- **DeepSport-RL-63k**: 63k QA pairs as RL prompts.
- **Test benchmark**: 6.7k QA pairs across four dimensions: Fine-Grained Recognition, Rule & Procedural Logic, Assessment & Coaching, Live Commentary & Reporting.

## 3. Method / model
- **Reasoning paradigm**: trajectory τ = ((F_1,T_1,A_1),…,(F_n,T_n,A_n)) (Eq. 1). Start: k=8 uniformly sampled frames with frame indices. Per step: `<think>` reasoning, then either `<tool_call>frame_extraction_tool(idx_start, idx_end)</tool_call>` (fetch new frames from a temporal window) or terminal `<answer>`. Redundant same-interval tool calls = format error (Cognitive Consistency Verification, after FrameThinker).
- **Stage 1 — SFT cold start**: fine-tune Qwen2.5-VL-7B on DeepSport-CoT-15k for 1 epoch to learn tag syntax and multi-turn patterns.
- **Stage 2 — Agentic RL with GRPO**: group of G trajectories per prompt; advantage A_i = (r_i − μ_r)/σ_r (Eq. 2); GRPO objective with clipped ratio + β·KL(π_θ‖π_ref) (Eq. 3). **Gated tool-use reward** (Eq. 4–8):
  - R_acc(τ) = acc(τ) ∈ [0,1] (Eq. 4).
  - g_tool = 1 if tool used ≥ once; g_acc = 1 if acc ≥ 0.5 (Eq. 5).
  - R_tool = 0.5·acc if g_tool=1 ∧ g_acc=1 (successful tool use); 0.03 if g_tool=1 ∧ g_acc=0 (curiosity bonus); 0 if no tool use (Eq. 6).
  - P_format = −0.05·(1 − g_fmt); R = g_fmt·(R_acc + R_tool) + P_format (Eq. 7–8); invalid format collapses reward to −0.05.
- Training: video at 640×360, batch 32, 8 rollouts, 300 RL steps, up to 12,800 tokens/response, 8×H20 GPUs, 796 GPU-hours total.

## 4. Equations & assumptions
- Eq. 1: trajectory definition. Eq. 2–3: GRPO advantage/objective. Eq. 4–8: gated reward (above).
- Assumptions: (1) SFT cold-start is needed to stabilize RL (standard but unablated here); (2) tool use is worth rewarding only when acc ≥ 0.5 — below that it's noise; (3) the curiosity bonus (0.03) is small enough not to reward useless exploration; (4) LLM-as-judge filtering produces genuinely high-quality CoT (DeepSeek-V3.2-Exp as judge — judge bias unexamined); (5) video-level splitting suffices for leakage control (cross-dataset clip overlap handled manually for one known case only).

## 5. Features / target
- Inputs: video (640×360), user question Q. Tool returns frames from requested temporal window.
- Targets: answers across the four capability dimensions (recognition, rules, assessment/coaching, commentary); metric = semantic accuracy scored per dimension.

## 6. Validation design
Held-out 6.7k test benchmark. Baselines: GPT-5, Qwen3-VL-8B-Instruct/Thinking, Qwen3-VL-235B-A22B-Thinking, Video-R1, InternVL3.5-14B, Qwen2.5-VL-7B-Instruct (backbone). All at 16 frames; DeepSport averages 14.39 frames (uses FEWER frames via selective re-watching). Zero-shot transfer to unseen sports reported.

## 7. Numerical results / baselines
Table 2 (accuracy %, higher better; avg frames):
- **DeepSport: 14.39 frames — 51.09 (recognition) / 43.82 (rules) / 24.74 (coaching) / 24.60 (commentary) / 40.08 overall.**
- GPT-5 (16f): 46.50 / 32.89 / 27.01 / 22.76 / 35.70.
- Qwen3-VL-235B-A22B-Thinking (16f): 44.96 / 31.03 / 28.72 / 25.59 / 35.36.
- Qwen3-VL-8B-Thinking: 34.83 overall. Backbone Qwen2.5-VL-7B-Instruct: 16.98 overall → DeepSport is a +23.1-point lift on the same 7B backbone.
- Largest gains in Rule & Procedural Logic (43.82 vs 32.89 GPT-5) — the agentic re-watching helps rule application most. Coaching/commentary remain weakest (24.74/24.60) — generation quality lags recognition.

## 8. Code / data availability
Not stated in extracted text (no repo URL found). Training data derives from 9 public sources; the 15k CoT set is distilled from a proprietary-scale teacher.

## 9. Leakage & limitations
- No code/repo found; RL details (300 steps only — short) and reward ablations not in extracted text; the 0.5 accuracy gate and 0.03 curiosity bonus are asserted, not ablated.
- LLM-as-judge (DeepSeek-V3.2-Exp) filtering may select for judge-pleasing rather than correct reasoning.
- American football is one of 12 sports but results are not broken out per sport — NFL-specific capability is unproven.
- Commentary/coaching scores (~24–25%) show the model is far from expert generation; recognition ≠ understanding.
- 796 GPU-hours on H20s is a real cost; the 300-step RL phase is short enough to question convergence.

## 10. GSE overlap
Existing-research-map: no agentic-video-reasoning or RL-tool-use read. Complements 2104 (Flamingo few-shot video-language) and 2103 (ImageBind): DeepSport is the first TRAINED multi-sport video reasoner with tool use. NEW: (a) the gated tool-use reward recipe for training agents that query data; (b) "think with videos" as a film-room paradigm. No duplication.

## 11. GSE implementation spec
**Goal:** a GSE film-analyst agent that answers analyst questions by actively interrogating game data instead of one-shot answering.
- Define GSE "tools" analogous to frame_extraction_tool: `tracking_window(play_id, t_start, t_end)` (pull tracking frames), `video_clip(...)`, `pbp_lookup(...)`, `stat_query(...)`.
- Train (or prompt-distill) an agent with the DeepSport reward recipe: R = accuracy + 0.5·acc·g_tool·g_acc + 0.03·curiosity − format penalties. Concretely: the agent gets full credit for a correct answer with no tool use, a bonus when tool use accompanies a correct answer, a small curiosity bonus for trying — training it to pull film only when the question needs it (e.g., "was it DPI?" → pull the catch-point tracking window).
- Phase 1 (cheap, no RL): distill CoT+tool-call trajectories from a strong teacher on GSE questions (SFT cold-start analog). Phase 2: GRPO-lite on verifiable questions (score predictions vs. actual outcomes — accuracy is directly measurable in sports).
- Use: automated film-room Q&A for content ("ask the model about the All-22"), officiating-decision analysis, and coaching-error identification posts.
- Effort: medium-large (4–6 weeks for the SFT-distillation version; full GRPO later).

## 12. Reproducible test
Dataset: 2024 NFL games — 500 analyst questions with verifiable answers (e.g., "which defender was nearest at catch?", "was the 2-pt conversion successful?", "how many missed tackles on this drive?"). Two agents: (a) one-shot QA (no tools), (b) DeepSport-style tool-using agent (SFT-distilled). Metric: answer accuracy + average tool calls per question. Also measure: does tool use correlate with correctness gains (the paper's core claim)?

## 13. Acceptance / rejection gate
**ACCEPT:** tool-using agent beats one-shot by ≥10 points accuracy on verifiable questions AND averages ≤3 tool calls/question (efficiency — the paper's "fewer frames" finding). **REJECT:** no accuracy gain from tool use (then iterative interrogation adds latency without value) or tool calls balloon (>6/question — cost blowout). Pre-registered before running.

## 14. Improvement experiment
Beyond the paper: **cost-aware tool gating.** The paper's reward ignores tool cost (frames are cheap). In GSE, each tool call has real latency/cost (video decode, tracking queries). Add a per-call cost penalty to the reward: R = g_fmt·(R_acc + R_tool − λ·n_calls) + P_format, and give the agent a CHEAP tool (stat/pbp lookup) and EXPENSIVE tools (video decode, tracking windows) — the agent must learn a cost-accuracy tradeoff. Why it might beat the paper: it produces a deployable policy (cheap-first, escalate only when uncertain) rather than a research demo, and the learned escalation thresholds are directly tunable to GSE's infra budget.

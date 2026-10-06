# huggingface/open-r1 — Fully Open Reproduction of DeepSeek-R1

**Repo:** https://github.com/huggingface/open-r1 · ⭐ 26,477 (verified 2026-10-02)

## 1. Vision
Rebuild DeepSeek-R1's full training pipeline in the open so anyone can reproduce and extend it: distill reasoning traces from R1, run pure RL (R1-Zero style), and go from base model to RL-tuned via multi-stage training. Delivered open datasets (OpenR1-Math-220k, CodeForces-CoTs, Mixture-of-Thoughts 350k verified traces) and matching distilled models.

## 2. The Ask
- A teacher model to distill from (DeepSeek-R1 via API), or a verifiable-reward task domain (math/code).
- GPU cluster: recipe configs target 8×GPUs single-node up to multi-node Slurm (DeepSpeed ZeRO-2/3, TRL vLLM colocate backend for GRPO rollouts).
- A *verifiable* reward function per task (format reward + correctness reward), e.g. IOI-style code judges.
- Dataset filtering step before GRPO (their README documents GRPO dataset filtering configs).

## 3. Constraints
- **License:** Apache-2.0. **Maintenance: DEPRECATED by the maintainers.** README states: "This project is no longer maintained... For GRPO, SFT and distillation today, use TRL — that's where the training side of Open-R1 lives on." Pushed 2026-10-02 (stale commit activity, issues/PRs unreviewed).
- Compute floor is LLM-scale (multi-GPU) — none of the code transfers directly to GSE's tabular engine, only the *method*.

## 4. GSE lens
GSE trains tabular/time-series predictors (EPA facets, coaching tau, signal weights), not LLMs — so the transfer is method-level:
- **GRPO-style reward design → reasoning-layer reward design.** Their pattern is: correctness reward (verifiable outcome) + format reward (structural validity). GSE's reasoning layer should score explanations the same way: outcome reward = did the prediction land within calibration bounds on held-out weeks; format reward = does the rationale cite the actual wired signals (no invented features). This is the concrete R1 recipe for turning honest INVALID refusals into improving reasoning.
- **Dataset filtering before RL** maps to our "contaminated fits are discarded, never averaged" rule — they filter GRPO training data for quality; we filter training folds for leakage, same gate position in the pipeline.
- **Distillation ladder (Step 1→2→3)** suggests a staged path for the reasoning engine: distill from a strong teacher → pure RL on verifiable tasks → multi-stage, rather than jumping straight to RL.

## 5. Verdict
**REBUILD** — deprecated; study the GRPO reward design + dataset-filtering recipe in TRL instead, reimplement the method for our reasoning layer (Apache-2.0).

## 6. The 4 tricks
- Wiki: https://codewiki.google/huggingface/open-r1
- Diagram: https://gitdiagram.com/huggingface/open-r1
- Stars: https://star-history.com/#huggingface/open-r1 (26,477 ⭐)
- Code: https://github.dev/huggingface/open-r1

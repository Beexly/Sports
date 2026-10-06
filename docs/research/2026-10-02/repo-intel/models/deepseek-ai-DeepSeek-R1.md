# deepseek-ai/DeepSeek-R1 — Official R1 Repo + Tech Report

**Repo:** https://github.com/deepseek-ai/DeepSeek-R1 · ⭐ 91,943 (verified 2026-10-02)

## 1. Vision
The primary source: DeepSeek's R1 paper ("Incentivizing Reasoning Capability in LLMs via Reinforcement Learning") plus model weights, distilled variants, and evaluation code. Defines the R1-Zero recipe (pure RL from base model with rule-based rewards, no SFT cold-start) and the full R1 pipeline (cold-start SFT → reasoning RL → rejection sampling → SFT → RL for all scenarios).

## 2. The Ask
- Reading the tech report is the actual deliverable (the repo's README is minimal; the paper is the recipe).
- For replication: large-scale RL infra (their R1-Zero ran thousands of RL steps on large clusters), verifiable task mix (math, code, reasoning), and the cold-start data curation step.

## 3. Constraints
- **License:** MIT (verified via API). Not archived, but last pushed 2025-06-27 — the paper/repo is a fixed artifact, not a living codebase.
- The headline result (pure RL → reasoning) is LLM-specific; what transfers is the *training design*, not code.

## 4. GSE lens
- **The pipeline order is the transferable recipe:** cold-start SFT (teach format) → RL on verifiable rewards (teach reasoning) → rejection-sample the best outputs → SFT on those (distill the wins) → final RL pass. Map to GSE reasoning: (1) SFT the reasoner on format-correct explanations of historical predictions, (2) RL with verifiable reward = walk-forward prediction accuracy, (3) keep only reasoning traces attached to well-calibrated predictions, (4) retrain on those, (5) final RL pass. This is directly the path from honest INVALID refusals to improving reasoning.
- **Rule-based rewards, not learned reward models, in the reasoning phase.** R1-Zero's breakthrough used deterministic verifiers (math/code answers). GSE's analog is deterministic: did the pick beat the market / land in the calibrated band on unseen weeks. Avoid training a learned "reasoning quality" judge first — score against reality.
- **Contamination discipline in the paper:** R1's evals were held strictly separate from RL training tasks. Mirrors our walk-forward rule — RL reward must come from the validation window, never the training window, or the reasoner learns to memorize.

## 5. Verdict
**ADOPT** — the paper is the canonical RL-for-reasoning recipe; study it, apply the staged pipeline to our reasoning layer (MIT).

## 6. The 4 tricks
- Wiki: https://codewiki.google/deepseek-ai/DeepSeek-R1
- Diagram: https://gitdiagram.com/deepseek-ai/DeepSeek-R1
- Stars: https://star-history.com/#deepseek-ai/DeepSeek-R1 (91,943 ⭐)
- Code: https://github.dev/deepseek-ai/DeepSeek-R1

# verl-project/verl — Flexible RL Post-Training Framework (veRL)

**Repo:** https://github.com/verl-project/verl · ⭐ 23,730 (verified 2026-10-02)

## 1. Vision
The living successor to TinyZero's stack (both open-r1 and TinyZero now point here): a flexible, efficient RL post-training framework for LLMs — the HybridFlow design decouples rollout generation from training so RL algorithms (PPO, GRPO, DAPO, REINFORCE++) can run at scale with vLLM/SGLang rollouts. This is where R1-style training actually happens in open source today.

## 2. The Ask
- Ray-based distributed setup; vLLM for fast rollout generation.
- A reward function (verifiable or learned) and a prompt dataset; config-driven recipes per algorithm.
- Enough GPU to colocate or separate rollout workers and trainers.

## 3. Constraints
- **License:** Apache-2.0 (verified). Pushed 2026-10-02 — actively maintained (1,303 open issues, high velocity).
- LLM-oriented APIs (rollouts, token logprobs); not plug-and-play for tabular models, but the algorithm implementations are the reference.

## 4. GSE lens
- **Reference implementation for any future RL work on the reasoning layer.** When GSE is ready to RL-train reasoning, veRL is the framework to reach for first — it is what the two biggest R1 reproductions converged on. Its HybridFlow separation (rollout vs. train) is also an architectural pattern worth copying: our reasoning-rollout generation (candidate explanations) should be decoupled from the weight-update step, so reward computation (walk-forward scoring) can scale independently.
- **Algorithm menu with empirical guidance:** their community has run the ablations (GRPO vs PPO vs REINFORCE++ at various scales). OpenRLHF's notes cite Logic-RL/PRIME finding REINFORCE++ more stable than GRPO and faster than PPO — veRL implements all of these, so GSE can adopt that comparison rather than rediscovering it.
- Caution: this is infrastructure, not a football solution. Value = don't build an RL trainer from scratch.

## 5. Verdict
**ADOPT** — the standard open RL post-training framework; use when the reasoning layer graduates to RL (Apache-2.0).

## 6. The 4 tricks
- Wiki: https://codewiki.google/verl-project/verl
- Diagram: https://gitdiagram.com/verl-project/verl
- Stars: https://star-history.com/#verl-project/verl (23,730 ⭐)
- Code: https://github.dev/verl-project/verl

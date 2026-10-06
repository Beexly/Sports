# OpenRLHF/OpenRLHF — Scalable Agentic RL Framework (PPO, GRPO, DAPO, REINFORCE++)

**Repo:** https://github.com/OpenRLHF/OpenRLHF · ⭐ 10,064 (verified 2026-10-02)

## 1. Vision
Production-ready, Ray + vLLM distributed RLHF/RL framework with an *algorithm-agnostic* design: any RL algorithm (PPO, REINFORCE++, GRPO, RLOO, FlashREINFORCE) runs with any agent execution mode (single-turn, multi-turn agentic). Also ships custom reward-function hooks for single-turn reinforced fine-tuning.

## 2. The Ask
- Ray cluster + vLLM for distributed rollouts; DeepSpeed for training.
- A reward model or verifiable reward function; prompt datasets.
- Their example scripts are Slurm/Ray-oriented — assumes cluster access for serious runs.

## 3. Constraints
- **License:** Apache-2.0 (verified). Pushed 2026-09-17, active (392 open issues).
- **Empirical claims in their README worth noting:** Logic-RL and PRIME report REINFORCE++ is more stable than GRPO and faster than PPO; Magistral used a REINFORCE++-like method; ProRL V2 used REINFORCE++ for prolonged RL training. These are the authors' claims, not independently verified here — treat as a pointer to those papers, not gospel.

## 4. GSE lens
- **Algorithm-agnostic RL = the right mental model for our reasoning layer.** Their core design insight: decouple the *algorithm* (how weights update) from the *executor* (how rollouts happen). For GSE: the reasoning executor (generates candidate explanations/predictions) and the reward computation (walk-forward scoring against 2025 + 2026 W1–4) should be separate components, so we can swap GRPO for REINFORCE++ without rewriting the harness.
- **Custom reward functions for single-turn tasks** is the closest existing pattern to what GSE needs: a reward function that takes (prediction, outcome, cited signals) and returns a scalar. Their single-turn RFT scripts are the template.
- **REINFORCE++ stability note** matters if we RL-train reasoning: start with the most stable algorithm (their evidence says REINFORCE++), not the trendiest (GRPO).

## 5. Verdict
**ADOPT** — reference RL framework + algorithm-selection evidence; use the single-turn custom-reward pattern for the reasoning layer (Apache-2.0).

## 6. The 4 tricks
- Wiki: https://codewiki.google/OpenRLHF/OpenRLHF
- Diagram: https://gitdiagram.com/OpenRLHF/OpenRLHF
- Stars: https://star-history.com/#OpenRLHF/OpenRLHF (10,064 ⭐)
- Code: https://github.dev/OpenRLHF/OpenRLHF

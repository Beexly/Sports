# huggingface/trl — Transformer Reinforcement Learning (GRPO/DPO/SFT home)

**Repo:** https://github.com/huggingface/trl · ⭐ 19,437 (verified 2026-10-02)

## 1. Vision
The canonical library for post-training transformer models with RL: SFT, DPO (and variants), PPO, GRPO, and reward-model training, with a vLLM backend for fast online generation during training. This is where open-r1's training code "lives on" per the maintainers.

## 2. The Ask
- HuggingFace transformers ecosystem; `accelerate`/DeepSpeed for multi-GPU.
- Preference pairs (chosen/rejected) for DPO; prompts + reward function for GRPO.
- vLLM for online methods (their docs detail the colocate mode for single-node).

## 3. Constraints
- **License:** Apache-2.0 (verified). Pushed 2026-10-02, actively maintained (287 open issues).
- LLM-token APIs; the *config patterns* (beta schedules, KL control, reward shaping) transfer, the code doesn't run on tabular data.

## 4. GSE lens
- **DPO's real lesson for GSE is the data format, not the loss.** DPO trains on (prompt, chosen, rejected) preference pairs. GSE analog: (game situation, well-calibrated reasoning trace, poorly-calibrated reasoning trace). We can *mine* these pairs from history — every week, the reasoning attached to picks that landed inside vs. outside calibration bands is a free preference dataset. No human labeling needed.
- **GRPO's group-relative trick transfers to signal weighting.** GRPO normalizes advantage *within a group of rollouts for the same prompt* instead of needing a value network. GSE analog for reasoning search: generate N candidate explanations per game, score each against the walk-forward outcome, and update toward the best *relative to the group* — no absolute "good explanation" oracle required.
- **KL-control discipline:** TRL's trainers keep the policy close to a reference via KL penalty. For our reasoning layer, the "reference policy" is the honest-refusal behavior — the KL term is what stops RL from training the model to *confabulate* instead of saying INVALID. This is a safety-relevant detail, not a nicety.

## 5. Verdict
**ADOPT** — the living home of R1-style training recipes; mine its DPO/GRPO/KL patterns for the reasoning layer (Apache-2.0).

## 6. The 4 tricks
- Wiki: https://codewiki.google/huggingface/trl
- Diagram: https://gitdiagram.com/huggingface/trl
- Stars: https://star-history.com/#huggingface/trl (19,437 ⭐)
- Code: https://github.dev/huggingface/trl

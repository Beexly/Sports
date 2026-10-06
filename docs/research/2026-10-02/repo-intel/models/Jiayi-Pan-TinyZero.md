# Jiayi-Pan/TinyZero — Minimal Reproduction of DeepSeek R1-Zero

**Repo:** https://github.com/Jiayi-Pan/TinyZero · ⭐ 13,248 (verified 2026-10-02)

## 1. Vision
Prove that R1-Zero's core finding — a base model develops self-verification and search behavior purely from RL with verifiable rewards — holds at toy scale. Trains Qwen2.5-3B on the Countdown numbers game and multiplication with simple correctness rewards; the "Aha moment" (emergent self-reflection) appears, full experiment log public on W&B, for under $30 of compute.

## 2. The Ask
- A small base model (they found Qwen2.5-3B works; 0.5B fails to learn reasoning — model capacity floor matters).
- A task with a *deterministic verifier* (Countdown, multiplication): the reward is ground truth, not a learned model.
- veRL + vLLM + Ray stack, 1–2 GPUs for the small runs.
- Patience: the reasoning behaviors emerge mid-training, not from iteration 0.

## 3. Constraints
- **License:** Apache-2.0. **Maintenance: DEPRECATED.** README deprecation notice: "This repo is no longer actively maintained. For running RL experiments, please directly use the latest veRL library." Pushed 2026-02-27.
- Toy tasks only; the Countdown/multiplication reward functions are trivially verifiable — the hard part for GSE is *designing* an equally verifiable reward for football reasoning.

## 4. GSE lens
- **The <$30 proof is the strategic payload.** It demonstrates that RL with verifiable rewards creates reasoning without human-labeled reasoning traces. For GSE's reasoning layer (currently returning honest INVALID refusals), the transferable experiment is: small reasoning policy + reward = (prediction lands within calibrated probability bounds on walk-forward holdout) × (rationale cites only wired signals). TinyZero says: start small, start verifiable, watch for the capability to emerge — don't start by hand-labeling reasoning.
- **Capacity floor lesson:** 0.5B failed, 3B succeeded. Analog: don't try to RL-train reasoning on an underpowered model/harness and conclude "RL doesn't work" — scale the reasoner first.
- **Emergence is logged, not assumed:** their public W&B run shows *when* self-verification appears. GSE's RL experiments on reasoning should log reward curves and behavior checkpoints the same way, so we can see the aha-moment rather than argue about it.

## 5. Verdict
**REBUILD** — deprecated in favor of veRL; adopt the verifiable-reward experiment design, reimplement at our scale (Apache-2.0).

## 6. The 4 tricks
- Wiki: https://codewiki.google/Jiayi-Pan/TinyZero
- Diagram: https://gitdiagram.com/Jiayi-Pan/TinyZero
- Stars: https://star-history.com/#Jiayi-Pan/TinyZero (13,248 ⭐)
- Code: https://github.dev/Jiayi-Pan/TinyZero

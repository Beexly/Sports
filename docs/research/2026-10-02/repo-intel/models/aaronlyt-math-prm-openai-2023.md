# aaronlyt/math-prm-openai-2023 — "Let's Verify Step by Step" + MATH-SHEPHERD Reproduction

**Repo:** https://github.com/aaronlyt/math-prm-openai-2023 · ⭐ 9 (verified 2026-10-02)

## 1. Vision
Reproduce the *data construction* process behind OpenAI's process supervision ("Let's Verify Step by Step", 2023) and the MATH-SHEPHERD method: automatically labeling each intermediate reasoning step as correct/incorrect so a process reward model (PRM) can be trained to supervise the reasoning *process*, not just the final answer.

## 2. The Ask
- A task with verifiable final answers (math), so step labels can be derived automatically: a step is "good" if completions from that step tend to reach the right answer (the MATH-SHEPHERD trick — no human step labels needed).
- Enough rollouts per step to estimate step quality statistically.

## 3. Constraints
- **License:** Apache-2.0 (verified). Tiny repo (9 ⭐, pushed 2025-02-20) — a study artifact, not maintained infrastructure.
- Math-only demo; the labeling *method* is what transfers.

## 4. GSE lens
- **The MATH-SHEPHERD trick solves our hardest labeling problem.** We want step-level supervision of reasoning but can't hand-label steps. Their method: for each intermediate reasoning step, sample many completions and check which ones land on the verifiable outcome; steps that lead to good outcomes are good steps. GSE analog: given a partial game explanation, sample completions, score each against the walk-forward outcome — steps that systematically precede well-calibrated predictions are the ones to reinforce. Automatic process labels from outcomes we already have.
- **Outcome supervision vs process supervision is the right framing for our calibration work.** An outcome-supervised reasoner learns "predictions that land in band are good"; a process-supervised one learns *which reasoning steps* produce in-band predictions. The latter is what lets us fix reasoning instead of just scoring it — and it's what turns INVALID refusals into improvable traces.
- Small repo, big idea: read the code for the labeling loop, reimplement the loop on our data.

## 5. Verdict
**REBUILD** — reimplement the automatic step-labeling loop for our reasoning traces (Apache-2.0).

## 6. The 4 tricks
- Wiki: https://codewiki.google/aaronlyt/math-prm-openai-2023
- Diagram: https://gitdiagram.com/aaronlyt/math-prm-openai-2023
- Stars: https://star-history.com/#aaronlyt/math-prm-openai-2023 (9 ⭐)
- Code: https://github.dev/aaronlyt/math-prm-openai-2023

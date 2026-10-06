# allenai/open-instruct — AllenAI's Post-Training Codebase (SFT→DPO→RLVR)

**Repo:** https://github.com/allenai/open-instruct · ⭐ 3,880 (verified 2026-10-02)

## 1. Vision
The full, reproducible post-training stack behind the TÜLU model family: SFT, DPO / preference fine-tuning, and RLVR (reinforcement learning with *verifiable* rewards). Includes their published DPO-vs-PPO findings ("Unpacking DPO and PPO", arXiv 2406.09279) and 70B-scale PPO RLVR training adapted from OpenRLHF's Ray+vLLM code.

## 2. The Ask
- Beaker (their cloud) or equivalent cluster; vLLM for eval speedups (10x claimed).
- Instruction datasets (they ship prep scripts: LIMA, WizardLM, OpenOrca), preference data for DPO, verifiable-reward tasks for RLVR.
- Willingness to read the TÜLU papers — the recipe knowledge is in the papers + training scripts together.

## 3. Constraints
- **License:** Apache-2.0 (verified). Pushed 2026-10-02, maintained (120 open issues). Natively-maintained evals are deprecated in favor of OLMES — the training side is the live part.

## 4. GSE lens
- **The staged pipeline is the template:** SFT → DPO → RLVR. For GSE reasoning: SFT on format (valid explanations citing wired signals), DPO on mined history pairs (calibrated vs miscalibrated traces), RLVR on walk-forward outcomes (verifiable reward = did it land in band on unseen weeks). Each stage has a distinct, checkable purpose — this is how you avoid "just RL it and hope."
- **Their DPO-vs-PPO paper is required reading before we choose.** AllenAI disentangled best practices for learning from preference feedback; their headline findings should inform whether our reasoning layer starts with DPO (cheaper, offline) or jumps to online RL. Bias toward DPO-first: it runs on logged history with no rollout infra.
- **Evaluation honesty:** they deprecated their in-repo evals and point to OLMES rather than maintaining a second-rate harness. Analog for GSE: don't build a bespoke "reasoning quality" eval — score reasoning against the walk-forward prediction outcomes we already compute.

## 5. Verdict
**REBUILD** — reimplement the SFT→DPO→RLVR staging and DPO-first bias as our reasoning-training plan; read their DPO/PPO paper (Apache-2.0).

## 6. The 4 tricks
- Wiki: https://codewiki.google/allenai/open-instruct
- Diagram: https://gitdiagram.com/allenai/open-instruct
- Stars: https://star-history.com/#allenai/open-instruct (3,880 ⭐)
- Code: https://github.dev/allenai/open-instruct

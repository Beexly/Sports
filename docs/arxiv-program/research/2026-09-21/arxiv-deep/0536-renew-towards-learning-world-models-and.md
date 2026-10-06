# [0536] RENEW: Towards Learning World Models and Repairing Model Exploitation from Preferences (arXiv:2607.14180v1)

**Citation:** Logan Bhamidipaty, Mykel Kochenderfer, Subramanian Ramamoorthy (2026). *RENEW: Towards Learning World Models and Repairing Model Exploitation from Preferences*. arXiv:2607.14180v1. URL: https://arxiv.org/abs/2607.14180v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 48068 chars; §1–§4, Algorithms 1, Tables 1–3, Figures 2–4 descriptions, limitations read; references + Appendix A preliminaries skimmed).
**Verdict:** REJECT — offline model-based RL / world-model robotics paper with no sports data and no predictive-modeling transfer to GSE's supervised engine architecture; filed as a reference only in case Garrett ever commissions a game simulator for synthetic rare-event training data.

## 1. Research question
Can world-model transition dynamics be learned or repaired from binary human preferences over imagined trajectory rollouts — cheaper than collecting expert demonstrations (expensive/unsafe/unavailable) — and can epistemic-uncertainty-directed preference querying (RENEW) make this sample-efficient enough to repair model exploitation (policies optimizing against hallucinated high-return transitions) in pretrained offline world models?

## 2. Dataset / schema
No real-world data. Environments: Jumanji discrete grid-world suite (Maze 5×5/10×10/15×15/20×20, Sliding Tile 3×3/5×5, Sokoban, 2048) + classic continuous control (gymnax, Appendix G). Pretraining: each ensemble member on 500 offline transitions per maze. Preferences labeled by a synthetic oracle (ℓ₁ distance to ground-truth transition) — no real human annotators. Convolutional world model with latent dynamics; epistemic uncertainty via ensemble disagreement.

## 3. Method / model
DLHF (Dynamics Learning from Human Feedback): replaces the reward model in the Bradley–Terry preference framework with the trajectory log-likelihood ℓ_θ under the learned dynamics model, so binary preference labels supervise transitions directly (encode physical realism, not task success — a teleporting maze trajectory is preferred by reward but rejected by dynamics). RENEW (Repairing Exploitation with Elicited World-model preferences): active-querying loop — compute epistemic uncertainty u(s,a) under current model, sample segment pairs ∝ u(σ)=Σ_t u(s_t,a_t), elicit N/I labels per round, finetune θ by minimizing ℒ_DLHF, recompute uncertainty, iterate I rounds.

## 4. Equations & assumptions
- Trajectory log-likelihood (Eq. 1): ℓ_θ(σ) = Σ_{t=0}^{H−1} log 𝒯̂_θ(s_{t+1} | s_t, a_t); latent variant via encoder e_ψ + latent dynamics.
- DLHF preference (Eq. 2): P(σ⁰≻σ¹) = logistic(ℓ_θ(σ⁰) − ℓ_θ(σ¹)).
- DLHF loss (Eq. 3): ℒ_DLHF(θ) = −Σ_{(σ⁰,σ¹,y)∈𝒟_≻} [(1−y) log P(σ⁰≻σ¹) + y log P(σ¹≻σ⁰)].
- Uncertainty extension: u(σ) = Σ_t u(s_t, a_t); start-state sampling ∝ mean epistemic uncertainty across actions.
- Assumptions: (a) preferences encode realism, not task success (annotator instruction critical); (b) RENEW needs only the pretrained model, not its training data (states drawn from offline dataset or d₀ as rollout seeds); (c) synthetic-oracle labels stand in for human realism judgments; (d) K=2 candidates/batch B=64 (ablation: K=2 optimal under fixed budget); (e) binary logistic/BT noise model for preference generation.

## 5. Features / target
Target: transition-dynamics accuracy — validation ℓ₁ error (from-scratch experiments) and per-cell transition accuracy % (repair experiments), plus epistemic uncertainty reduction. Inputs: trajectory segment pairs (σ⁰, σ¹) with binary preference labels y; preference budgets up to 1M labels (from-scratch) and 1600 labels (repair).

## 6. Validation design
6 seeds (Table 1), 5 seeds (Table 2), 10 seeds (Table 3); mean ± 95% CI. Comparisons: naive DLHF (uniform start-state sampling) vs RENEW (uncertainty-proportional sampling), identical architecture/optimizer/ensemble; 64 labels per gradient step; I=3 active rounds for repair with K=4 candidates. No train/test split in the ML sense — offline RL evaluation on held-out transitions.

## 7. Numerical results / baselines
- From scratch (Table 1): naive DLHF with 1M preference labels ≈ supervised learning on 1K transitions — e.g., Maze 10×10: DLHF ℓ₁ 0.0001±0.0000 vs supervised 0.0003±0.0001; Sliding 5×5: 0.0105±0.0023 vs 0.6622±0.0347; Sokoban 0.0181 vs 0.0198; 2048 1.2024 vs 1.2063. Preferences work but at ~1000× the label cost.
- Sample efficiency (Table 2, 100K labels): RENEW roughly halves final ℓ₁ error on Sliding Tile 3×3 (0.2070±0.0790 vs naive 0.4190±0.1220); 5×5: 1.6890±0.1070 vs 1.8190±0.0370; Sokoban: 0.0257±0.0025 vs 0.0428±0.0016 (naive DLHF DEGRADES the pretrained model here — catastrophic forgetting); Maze 5×5/10×10: 0.0018/0.0001 both.
- Repair (Table 3, 1600 labels, 10 seeds, transition accuracy %): Maze 5×5 — pretrained 83.8±3.6, naive 89.7±3.5, RENEW 96.5±1.5; 10×10 — 87.6±2.1 / 93.2±2.4 / 97.2±1.4; 15×15 — 87.8±2.8 / 92.3±1.7 / 94.4±1.6; 20×20 — 87.9±2.0 / 93.2±2.3 / 94.9±1.3. RENEW wins at every size with tighter CIs; naive forgets some correctly-predicted transitions (Figure 4: pretrained 86.8%, naive 88.6%, RENEW 99.1% on one 10×10 instance).

## 8. Code / data availability
Code: https://github.com/FlyingWorkshop/RENEW (stated in paper).

## 9. Leakage & limitations
Author-stated: synthetic oracle instead of real human annotators (noisy-human validation is "the most important next step"); small discrete grid worlds + low-dim continuous control only; no formal unexploitability guarantees connected to the empirical error reductions; no integration with practical offline RL algorithms. Unstated: the oracle labels by ℓ₁ distance to ground truth — DLHF is "effectively a diluted form of supervised learning" under this oracle, so the from-scratch result upper-bounds rather than demonstrates real-world feasibility; ensemble-disagreement uncertainty adds real compute cost; preference budget of 1M labels for toy mazes suggests prohibitive scaling. Transfer limits: GSE has no world model, no offline RL, no simulator — the entire problem setting (model exploitation by a planner) does not exist in the current engine.

## 10. GSE overlap
No overlap with current GSE architecture. Garrett's engine is a supervised predictive system over game outcomes — there is no learned dynamics model, no policy optimizing against a simulator, and hence no model-exploitation failure mode to repair. The corpus has nothing on world models, offline RL, or dynamics learning; the BT preference-loss-over-log-likelihoods is a cute reframing but invents no new estimator GSE needs. The one future-relevant idea: IF Garrett ever commissions a game-level simulator to synthesize rare-event training data (extreme weather games, backup-QB blowouts), RENEW is the reference for repairing that simulator's hallucinated transitions via pairwise realism judgments — filed, not built.

## 11. GSE implementation spec
None — no implementation recommended. (Hypothetical future lane, not to be started: a drive-level NFL transition simulator {down, distance, field position, score} → next-state distribution, trained on nflverse pbp, with a DLHF-style realism-preference repair loop targeting thin-coverage regions — e.g., 4th-and-long in opponent territory — where a naive simulator hallucinates. This is a multi-week project with no current owner and no demonstrated need; it is recorded here only so the reference is findable.)

## 12. Reproducible test
Not applicable — REJECT verdict, no GSE test specified. (The paper's own test is self-contained and reproducible via the linked repo on Jumanji environments.)

## 13. Acceptance / rejection gate
REJECT. The method solves a problem GSE does not have (world-model exploitation in offline model-based RL) in a domain GSE does not operate in (robotics/control with simulators). No predictive accuracy gain, no betting-market application, no calibration or ranking improvement is offered or plausible. Reopen only if Garrett's roadmap adds a game simulator for synthetic data generation.

## 14. Improvement experiment
None for GSE. For the paper itself: replace the synthetic ℓ₁ oracle with real human realism judgments on a small subset and measure the noise-induced degradation of the repair effect — the paper's central claim (preferences can supervise dynamics) is untested with actual human labelers, and the 1600-label repair result may not survive realistic label noise.

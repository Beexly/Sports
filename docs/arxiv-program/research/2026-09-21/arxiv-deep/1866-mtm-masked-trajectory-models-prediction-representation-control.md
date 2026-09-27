# [1866] Masked Trajectory Models for Prediction, Representation, and Control (MTM) (arXiv:2305.02968)

**Citation:** Philipp Wu, Arjun Majumdar et al. (Meta AI, UC Berkeley, Georgia Tech, Google Research) (2023). *Masked Trajectory Models for Prediction, Representation, and Control*. arXiv:2305.02968. URL: https://arxiv.org/abs/2305.02968
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
Random-autoregressive masked modeling over multi-modal trajectory sequences plus heteromodal training (labeled + unlabeled regimes) transfers to NFL tracking: pretrain one model on (kinematics, charting-labels, play-outcome) plays and use its representations to accelerate downstream prop/outcome models.

## 1. Research question
Can masked prediction (bi-directional transformer reconstructing randomly masked trajectory elements) serve as a single self-supervised paradigm for sequential decision making — producing ONE model whose weights serve zero-shot as forward dynamics, inverse dynamics, imitation policy, offline RL agent, and representation extractor, selected only by the inference-time masking pattern?

## 2. Dataset / schema
- **D4RL** locomotion V2 (MuJoCo): Walker2D, Hopper, HalfCheetah × {Expert, Medium-Expert, Medium, Medium-Replay} (~1M transitions each).
- **Adroit** dexterous hand (simulated five-finger): Pen, Door tasks; Medium-Replay + Expert trajectories collected per D4RL protocol.
- **ExORL**: Walker2D trajectories from unsupervised ProtoRL exploration; tasks Stand, Walk, Run.
Schema: trajectories τ = {(x_t^1,…,x_t^M)}_{t=1}^T with modalities M = {state, action, return-to-go}; 95% train / 5% held-out evaluation split. Heteromodal experiments: 1% of data with all modes + 95% state-only (no action labels), remainder held out.

## 3. Method / model
**Tokenization:** modality-specific encoders z_t^m = E_θ^m(x_t^m), flattened to 1-D sequence of length N = M×T; fixed sinusoidal timestep embeddings + learnable modality-type embeddings added.
**Architecture:** MAE-style encoder-decoder; both bi-directional transformers (encoder processes unmasked tokens only; decoder processes full sequence, using encoder values or a mode-specific mask token; predicts the original sequence incl. unmasked tokens).
**Training objective:** max_θ E_τ Σ_t Σ_m log P_θ(z_t^m | Masked(τ)); implemented as MSE loss (Gaussian probabilistic model). Random autoregressive masking: random masks with the constraint that at least one masked token has no future unmasked tokens (last element of each sampled segment necessarily masked) — input sequences are contiguous fixed-length sub-segments of episodes.
**Inference-time versatility (same weights):** RCBC mask → offline RL policy; BC mask → behavior cloning/policy init; forward-dynamics mask (unmask actions, mask states) → world model; inverse-dynamics mask (current + desired future state) → action recovery/goal-reaching.
**Heteromodality:** missing modalities treated as masked; loss applied only to existing modes. Two-stage inference for action-scarce regimes: (1) predict future states from current state + desired returns (forward pass with returns as conditioning, actions masked); (2) predict actions from current + predicted future states (inverse-dynamics mask).
**Representation transfer:** MTM encoder tokenizes/encodes states individually → latent state (or joint state-action) representations used as drop-in input to TD3, with end-to-end fine-tuning allowed.

## 4. Equations & assumptions
- z_t^m = E_θ^m(x_t^m), τ = (z_1^1,…,z_T^M), N = M×T.
- max_θ E_τ Σ_{t=1}^T Σ_{m=1}^M log P_θ(z_t^m | Masked(τ)); MSE implementation = Gaussian likelihood.
- Assumptions: masked reconstruction over (state, action, return) tokens learns environment dynamics + behavior policy + representations jointly; a single random-autoregressive mask distribution covers the inference-time mask patterns of interest; missing modalities can be ignored in the loss without biasing representations; offline trajectories sufficiently cover the inference regimes (no online correction).

## 5. Features / target
Inputs: per-timestep multi-modal tokens (proprioceptive state, control action, return-to-go). Self-supervised targets: ALL tokens (masked and unmasked) reconstructed under random masks — modalities act as each other's supervision. Downstream targets: normalized D4RL scores (BC/RCBC rollouts), normalized FD/ID loss on held-out 5%, TD3 learning curves (ExORL).

## 6. Validation design
- **Offline RL:** D4RL locomotion V2, MTM trained with random-autoregressive mask, evaluated with RCBC mask; baselines DT, RvS (also RCBC), CQL, IQL. Metric: normalized score (Fu et al. 2020), mean±std over 4 seeds × 20 rollouts.
- **Versatility:** Adroit + D4RL, single MTM weights evaluated as BC / RCBC / ID / FD vs S-MTM (specialized train+inference masks) and per-capability specialized MLPs; BC/RCBC = rollout normalized score (higher better), ID/FD = normalized held-out loss (lower better); best checkpoint, 4 seeds.
- **Masking pattern study:** random vs random-autoregressive vs specialized RCBC mask on RCBC performance.
- **Heteromodality:** Expert data with actions stripped from 95%+; compares Heteromodal MTM vs MTM/MLP on the 1%-labeled subset; normalized to Heteromodal MTM.
- **Data efficiency:** D4RL Hopper, Adroit Door; performance vs dataset-size fraction (~1M transitions full).
- **Representation learning:** ExORL Walker2D (Stand/Walk/Run); TD3 on raw states (baseline) vs TD3 on MTM state reps vs MTM state-action reps (frozen + fine-tuned); 5 seeds; 100k-iteration asymptotic reference.

## 7. Numerical results / baselines
- **Offline RL (D4RL V2, Table 1):** MTM (RCBC inference) outperforms DT and RvS; competitive with specialized CQL and IQL "despite training with a purely self-supervised objective without any explicit RL components."
- **Versatility (Table 2):** single MTM weights comparable or better than S-MTM (specialized masks) and specialized MLPs on BC/RCBC/ID/FD in most cases; authors note specialized masks need more tuning to avoid over/underfitting.
- **Masking:** random-autoregressive ≥ pure random on RCBC across environments; competitive with the specialized RCBC mask.
- **Heteromodality (Fig. 5):** Heteromodal MTM consistently beats MLP and action-labeled-only MTM; in low-data regimes Heteromodal MTM > MTM with a "quite substantial" gap.
- **Data efficiency (Fig. 6):** MTM outperforms specialized MLPs at every dataset size; largest gaps in low-data regime.
- **Representations (Fig. 7):** TD3 on MTM reps learns "significantly" faster in all 3 ExORL tasks; Walk reaches/exceeds asymptotic raw-state TD3 performance within 10% of the training budget; state-action reps beat state-only reps on Run asymptotic performance.
- Naive addition of state-only data without the two-stage inference did NOT always help RCBC — the two-stage procedure was required.

## 8. Code / data availability
Code: https://github.com/facebookresearch/mtm. Data: D4RL, Adroit, ExORL (all public benchmarks).

## 9. Leakage & limitations
- MuJoCo locomotion/hand tasks — low-noise, fully-observed simulators; no occlusion, no multi-agent adversaries, no strategic deception.
- Evaluation uses best checkpoint (not final) — mild selection bias; 4 seeds reported.
- The versatility comparisons are on in-distribution held-out data (95/5 split of the same behavior distribution); no distribution-shift test for ID/FD capabilities.
- Heteromodal result depends on the two-stage inference procedure; naive mixing failed — the method is a pipeline, not just a training trick.
- Architecture/hyperparameter details relegated to appendix (not fully extracted); exact D4RL normalized scores in Table 1 not recoverable from HTML text.

## 10. GSE overlap
GSE's engine is predictive (win probability, props), not control — the RL-agent framing does not map directly. The transferable core is: (a) masked multi-modal pretraining over (state=kinematics, action=next-frame movement, return=play EPA/outcome), (b) heteromodal training across data regimes, (c) learned representations accelerating a downstream learner (TD3 analog → GSE's gradient-boosted/probabilistic prop models). GSE already fuses nflverse tracking + FTN charting + odds; it has no self-supervised pretraining stage — NEW capability. Distinct from 1862–1865 (pure representation SSL): MTM adds outcome-conditioning (returns-to-go) and cross-modal imputation.

## 11. GSE implementation spec
1. Data: NFL 10Hz tracking 2018–2024 as "states" (22 agents + ball kinematics, snap-relative); "actions" = per-player frame-to-frame displacements; "returns" = play EPA / outcome class appended as a per-play conditioning token. Heteromodal regimes: tracking-only plays (early seasons), tracking+charting plays, tracking+charting+odds plays.
2. Train MTM (bi-directional Transformer encoder-decoder, modality encoders for kinematics/action/outcome, sinusoidal time + learned modality embeddings, random-autoregressive masking) on ~500K+ play-segments, MSE loss, missing-modality loss masking.
3. Inference modes: (a) forward-dynamics mask → ball-carrier trajectory forecasting (prop: rushing yards); (b) outcome-conditioned generation → counterfactual play simulation ("what if the safety bites?"); (c) representation mode → frozen MTM embeddings as features for GSE prop models (the TD3-analog: measure training-efficiency + accuracy lift).
4. Effort: ~3 engineer-weeks (tokenizer + masking harness; reuse facebookresearch/mtm code as reference).

## 12. Reproducible test
Dataset: 2023–2024 NFL tracking, train on weeks 1–12, test weeks 13–18. Test A (heteromodal): train MTM on full-modality weeks 1–12 plays plus modality-stripped (no charting) plays; compare forward-dynamics masked-frame RMSE vs full-modality-only baseline on held-out weeks. Test B (representations): GSE prop model (e.g., rushing-yards over/under) trained with vs without frozen MTM embeddings; metric log-loss on held-out weeks. Run target: <72h on 1–2 GPUs.

## 13. Acceptance / rejection gate
ADOPT if: (a) heteromodal MTM masked-frame RMSE ≥ 15% lower than the full-modality-only model on held-out weeks, OR (b) prop-model log-loss improves ≥ 0.002 with MTM embeddings vs without, on held-out weeks 13–18. REJECT if neither holds.

## 14. Improvement experiment
Beyond the paper: (1) add a "coverage concept" modality from FTN charting (man/zone/blitz labels as discrete tokens) so the return-conditioned inference mode can answer coaching queries like "generate the most likely route combination vs Cover 3" — the paper's modalities are all continuous control signals. (2) Replace the single-sequence flattening with a two-level hierarchy (player-level encoder → play-level encoder) mirroring HiT-JEPA (1862), since 22-agent flat sequences blow up context length. Hypothesis: hierarchical MTM trains 2–3× faster and the play-level embeddings cluster by offensive concept without supervision.

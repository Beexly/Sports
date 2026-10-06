# [2212] WorldGym: World Model as An Environment for Policy Evaluation (arXiv:2506.00613)

**Citation:** Quevedo, J., Sharma, A. K., Sun, Y., Suryavanshi, V., Liang, P. & Yang, S. (2025). *WorldGym: World Model as An Environment for Policy Evaluation*. arXiv:2506.00613. URL: https://arxiv.org/abs/2506.00613
**Ledger completed:** 2026-09-22. **Read:** full text (v3 PDF via arXiv).
**Verdict:** ADAPT

## 1. Research question
Evaluating control policies in the real world is expensive; handcrafted simulators have a sim-to-real gap. Can a learned world model serve as a *policy evaluation environment* — rolling out arbitrary policies and scoring them — with results that correlate with real-world performance? Key observation (§1): many tasks/policies, but one physical world governed by one set of laws — so a single world model can evaluate any policy on any task. (Abstract, §1–2)

## 2. Dataset / schema
Open-X Embodiment robot dataset (Bridge, RT-1, VIOLA, Berkeley UR5, Google Robot morphologies); validation split of initial images; real-world trial first-frames from Kim et al. (OpenVLA) — 10 trials × tasks with randomized initial object locations. Policies evaluated: RT-1-X, Octo (Small 1.5, Base 1.5), OpenVLA (v0.1 7B, 7B), plus from-scratch video-policy (UniPi) and diffusion policy (DexVLA) checkpoints.

## 3. Method / model
WorldGym pipeline (§3): (1) **World model:** latent Diffusion Transformer (DiT) trained on frame-action sequences with Diffusion Forcing for autoregressive generation; per-frame action vectors linearly projected + added to diffusion timestep embeddings → AdaLN-Zero conditioning; random action dropout over whole clips + classifier-free guidance for action adherence; causal temporal attention interleaved with spatial attention. (2) **Rollout:** policy outputs action chunk a_pred; world model denoises |a_pred| frames in parallel — diffusion horizon flexibly matched to the policy's chunk size (vs Cosmos's fixed 16-frame bidirectional context, which wastes compute). (3) **Reward:** GPT-4o as VLM judge on generated frames + language instruction, with partial-credit criteria (0/0.5/1) for near-misses (App. B). Policy value ρ̂(π) estimated by Monte Carlo rollouts (eq. 2). Model-based OPE formalism for multi-task POMDPs with sparse {0,1} rewards (§2, eqs. 1–2).

## 4. Equations & assumptions
- Policy value ρ(π)=E[R(s_H,g)] (eq. 1); world-model estimate ρ̂(π) via rollouts in T̂ with learned reward R̂ (eq. 2). See §2.
- Assumes: single shared physics across tasks (the "one world" argument); VLM reward accuracy (validated App. B.2); initial-frame sufficiency; sparse terminal rewards.

## 5. Features / target
Inputs: single initial real frame + language instruction; policy's action chunks. Target: task success rate per policy (policy value), per-task and mean. Metrics: Pearson r between world-model and real-world success rates; mean absolute gap; rank consistency across versions/sizes/checkpoints; qualitative action-following (end-effector sweeps).

## 6. Validation design
(1) World-model validation: agreement with validation-split videos conditioned on identical action sequences (Fig. 2); hard-coded single-dimension action sweeps (OOD action sequences) to test action adherence (Fig. 3). (2) Policy eval: 3 VLA policies × real-world trials from OpenVLA (Kim et al.), world-model rollouts from the same initial frames; correlation analysis (Fig. 4). (3) Ranking: versions/sizes/checkpoints with known orderings (Figs. 6–7). (4) OOD: edited initial images (Nano Banana) + novel instructions. Compute comparison: days of real eval vs <1 hr on a single GPU.

## 7. Numerical results / baselines
- Real-vs-world-model success rates: Pearson **r = 0.78, p < 0.001** per task (Fig. 4a); mean rates differ by only **3.3%** on average — RT-1-X 18.5% real vs 15.5% WM; Octo 20.0% vs 23.8%; OpenVLA 70.6% vs 67.4% (Fig. 4b).
- Rankings preserved: across RT-1-X < Octo < OpenVLA; across Octo-Small 1.5 < Octo-Base 1.5 and OpenVLA v0.1 < OpenVLA 7B (Fig. 6); across training checkpoints 2K→18K / 10K→60K for from-scratch policies (Fig. 7).
- OOD: OpenVLA grabs carrot-vs-orange by proximity (shape confusion); distracted by on-screen carrot image in 15% of trials; color classification ("pick red/blue") — OpenVLA 100%, others near chance (Fig. 8).
- End-effector sweeps: faithful single-axis control from arbitrary initial frames despite absent training sequences (Fig. 3).
- Caveat: realistic object interaction remains challenging; arm motion emulated far better than contact physics.

## 8. Code / data availability
Videos and code: https://world-model-eval.github.io. Built on public Open-X Embodiment data and public VLA policies.

## 9. Leakage & limitations
- Robot manipulation videos ≠ football; VLM-as-reward validated for visible task success, not for EPA-like continuous outcomes.
- An earlier version's abstract reported WPE underestimates in-distribution policy values and overestimates OOD ones — the same off-distribution pathology as ledger 2211's MuZero finding; v3 emphasizes rank preservation instead, which is the safer claim to rely on.
- Object-interaction fidelity is the weak link (directly relevant: tackles/contested catches are football's "object interaction").
- No uncertainty quantification on ρ̂(π); correlation r=0.78 leaves substantial per-task noise.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md: no policy-evaluation-in-world-model papers in the corpus. This is the only paper in the run addressing the *evaluation* side — every other ledger builds the simulator; WorldGym tells us how to trust policy comparisons inside it. Pairs with ledger 2211 (MuZero audit): 2211 says constrain search to the accurate region; WorldGym says even so, trust *rankings*, not absolute values.

## 11. GSE implementation spec
GSE offline policy-evaluation harness ("GridironGym"): (1) Take the learned NFL play simulator (ledgers 2204–2208, 2210) as T̂. (2) Policy = any decision rule to compare: model variants (v5.2.7 vs challenger), play-call policies, 4th-down rules, or betting strategies mapped to stake/edge decisions. (3) Roll out Monte Carlo game trajectories from real initial game states (down/distance/field position/clock/score); score with a learned outcome head (win probability / EPA) instead of a VLM — the paper's R̂ slot. (4) Validate exactly per §4.1: correlate in-sim policy rankings with real backtest rankings over 2022–2024; require rank preservation before any deployment decision uses the harness. (5) OOD stress tests: novel game scripts (e.g., 2024 rule-change scenarios, weather extremes) from single initial states — the paper's §4.3, ported. (6) Horizon-chunk alignment: match simulator rollout granularity to the policy's decision cadence (play-level vs drive-level). Effort: ~3–4 engineer-weeks on top of the simulator.

## 12. Reproducible test
Dataset: 2022–2024 seasons; policies = 6–8 frozen GSE model variants with known backtest ROI ordering. Metric: (a) Spearman correlation between in-sim policy ranking and real-backtest ranking — the paper's Fig. 4 protocol; (b) mean absolute calibration gap of in-sim vs realized win rates; (c) OOD: 2024 rule changes (kickoff format) as distribution shift — rank preservation must hold on post-change weeks. Baseline: ranking by historical backtest alone (the harness must add information: earlier detection of challenger superiority with fewer real games).

## 13. Acceptance / rejection gate
ADOPT the harness for deployment decisions if: (a) Spearman ρ ≥ 0.7 between in-sim and real-backtest policy rankings on held-out 2024 (the paper's r=0.78 bar, rank version), AND (b) the harness identifies the best challenger variant using ≤50% of the real-game sample a pure backtest needs (the efficiency claim — paper: <1 GPU-hour vs days), AND (c) absolute values are reported with the in-dist underestimation/OOD overestimation bias correction, never as point estimates. Reject for deployment use (keep as research tool) if rank correlation <0.5 — then it's a qualitative sandbox only.

## 14. Improvement experiment
Go beyond the paper: replace the single VLM/outcome head with a *doubly robust* estimator — combine the world-model rollout value with a model-free OPE estimator (e.g., weighted importance sampling on historical data) on the same policies. Hypothesis: doubly robust ranking beats pure world-model ranking on Spearman correlation by 0.1+ because it corrects exactly the OOD-overestimation bias the authors flagged — test on the 2024 rule-change split where distribution shift is real, and ablate each component.

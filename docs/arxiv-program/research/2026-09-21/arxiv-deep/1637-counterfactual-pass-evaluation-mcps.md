# [1637] Monte Carlo Pass Search: Using Trajectory Generation for 3D Counterfactual Pass Evaluation in Football (arXiv:2606.11120)

**Citation:** Andrew Kang, Priya Narasimhan (Carnegie Mellon University, 2026). *Monte Carlo Pass Search: Using Trajectory Generation for 3D Counterfactual Pass Evaluation in Football*. arXiv:2606.11120v1 [cs.AI], submitted 9 Jun 2026. License CC BY 4.0. URL: https://arxiv.org/abs/2606.11120
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv HTML).
**Verdict:** ADAPT

a complete, honest, code-released counterfactual decision-evaluation framework (policy proposes pass variants, learned world model rolls them out, learned value model scores them) that separates decision quality from execution quality and option quality; the cleanest portable template in this lane for evaluating NFL decisions (throws, fourth downs, play calls) with NGS tracking as the world-model substrate.

## 1. Research question
Pass evaluation is confounded by execution noise and downstream interaction: point-estimate metrics (xT, xPass) score the realized outcome and cannot separate (i) whether the passer chose a good option, (ii) whether the option was intrinsically fragile, or (iii) whether execution beat the typical attempt. Can an MCTS-style loop — counterfactual action sampling + learned world-model rollouts + learned value scoring — produce distribution-aware pass evaluation on public tracking data?

## 2. Dataset / schema
Public dataset of Bassek et al. (Scientific Data 2025): 7 German Bundesliga (1st/2nd division) matches, 25 Hz positional tracking for all 22 players + 3D ball coordinates (TRACAB Gen5), official match metadata + event annotations. Per pass: fixed 64-frame pre-pass context window; kick frame refined by a ball-kinematics heuristic (event timestamps unreliable). Train/val/test split: 5/1/1 matches.

## 3. Method / model
MCPS = three components: (1) **Value model**: Transformer on tracking windows, two binary-cross-entropy heads (home/away), labels = shot-within-10s weighted by an xG proxy (shots as fractional goals); PV(s) = P(ego scores in 10s) − P(opponent scores in 10s); random flip augmentation. (2) **World model**: SMART (autonomous-driving autoregressive discrete-token generator) adapted to football; downsampled 12.5 Hz, token step = 5 frames (0.4 s); player tokens 10-dim planar velocities (2048-code k-means vocab), ball tokens 15-dim 3D velocities (1024-code vocab); decoder-only space–time Transformer, 8 history tokens → 24 rollout tokens, masked cross-entropy, entity-type + team embeddings; plus Player-to-Touch module (next toucher + time-to-touch, survival-style objective: BCE touch hazard + weighted CE toucher identity) and Ball-at-Touch module (post-touch ball velocity, diagonal-Gaussian regressor, masked Gaussian NLL). (3) **Policy/search**: kick parameters (initial 3D velocity + spin proxy) fit per pass with a CEM-style solver + ball-flight simulator (gravity, drag, restitution, friction), keeping only near-zero-error fits; per retained pass, 256 local variants (small perturbations: execution noise) + 256 global variants (wide direction changes: alternative options), with hard caps from high-percentile fitted-pass statistics. Evaluation: ΔPV(θ) = PV(s′(θ)) − PV(s) at first meaningful ball interaction; per-pass S_mean = observed ΔPV − mean counterfactual ΔPV; S_pct = percentile rank of observed ΔPV in the counterfactual distribution; player-level aggregation of both, local vs global.

## 4. Equations & assumptions
ΔPV(θ) = PV(s′(θ)) − PV(s) (Eq. 1); S_mean = ΔPV_obs − (1/K)ΣΔPV(θ^(k)) (Eq. 2); S_pct = (1/K)Σ1[ΔPV_obs ≥ ΔPV(θ^(k))] (Eq. 3). Assumptions: rollouts terminate at first meaningful interaction (tractability); fitted kick parameters with near-zero trajectory error are the "true" execution; 256 samples approximate the local/global distributions; PV differences at the next touch proxy decision value; CV tracking error and event misalignment are mitigated, not eliminated.

## 5. Features / target
Features: 64-frame pre-pass tracking context (22 players + 3D ball), candidate kick parameters (3D velocity, spin proxy). Target: distribution over ΔPV (gained possession value) per pass; derived player rankings (mean surplus, percentile surplus, local vs global).

## 6. Validation design
Held-out test match (Bochum vs Leverkusen, 2022/23) case study with 512 accurately-inferred passes; component ablations vs public baselines (Sports-Traj checkpoint, static/constant-velocity/naïve Transformer; Spearman/Anzer reported numbers; ball-only public EPV implementation). Code + model checkpoints released. No formal statistical tests on rankings — presented as an evaluation/analysis framework, not a prediction bake-off.

## 7. Numerical results / baselines
Trajectory forecasting (test, best-of-20): minADE20 2.4 (ours) vs Sports-Traj 4.2, naïve Transformer 3.8, constant velocity 5.0, static 6.8; minFDE20 4.7 vs 6.9/7.5/10.1/13.4. Player-to-Touch on generated futures: receiver top-1 0.605, pass-success acc 0.777, AUROC 0.799 — below Spearman (0.679/0.805/~0.85) and Anzer (0.899/0.915/0.934), honestly attributed to a harder penalized setting (hypothetical futures, objective mismatch). Ball-at-Touch masked NLL: −0.90 (w/ aug) vs −0.61 (w/o) vs 0.10 (constant). PV sanity: shot AUROC 0.73 vs ball-only EPV 0.78 (authors admit the PV model does not improve shot-window discrimination; Brier 0.017 vs 0.022). Case study: local search exposes narrow success windows (Wirtz lofted pass); global search flags missed higher-value alternatives; rankings separate execution skill (local percentile) from option selection (global mean-difference).

## 8. Code / data availability
Model checkpoints + code released (linked in paper); public Bassek et al. tracking dataset; CC BY 4.0.

## 9. Leakage & limitations
Small data (7 matches) → tracking error and kick misalignment inherited; world-model misspecification (aerial duels, GK actions, heavy contact; no player identity/role conditioning); global sampler is simplistic (should be receiver-conditioned/learned proposals); single-interaction horizon (no second balls); PV model weaker than ball-only EPV at shot discrimination, so rankings rest partly on an unvalidated value function. Authors state all of this plainly.

## 10. GSE overlap
The lane's best structural template for counterfactual decision evaluation: it operationalizes the exact three-component decomposition GSE needs for NFL decisions — policy (what was chosen), world model (what could have happened), value model (what it was worth). Directly complements 1572 (VTCS temporal counterfactuals — initiation timing) by covering on-ball decisions, and 1576 (LatentCF trajectory editing) by evaluating rather than editing. The honest-ablation style (reporting where sub-models lose to baselines) is the standard to hold GSE's own world-model work to.

## 11. GSE implementation spec
Build `gse_counterfactual_decision_eval.py`: (1) train a discrete-token autoregressive world model on NGS tracking (all 22 players + ball, 10 Hz) following the SMART adaptation recipe (k-means motion vocabularies, decoder-only Transformer, 8→24 token rollouts); (2) train a possession-value head on NGS windows: P(drive ends in TD in N plays) − P(turnover), or EPA-based value; (3) for each observed QB throw / fourth-down decision, fit execution parameters, sample local variants (execution noise) and global variants (alternative targets/play calls), roll out to next meaningful interaction (catch/tackle/incompletion), score ΔPV; (4) report S_mean and S_pct per decision, aggregated per player — separating "good decision, bad execution" from "bad decision" for GSE's QB evaluation and sit/start content. Gate on the paper's own honesty checks: world model must beat constant-velocity and naïve-Transformer baselines on minADE; value model must be sanity-checked against a ball-only baseline.

## 12. Reproducible test
Reproduce Tables 1–4 on the Bassek Bundesliga data with released checkpoints: minADE20 ≈ 2.4 (≤ 3.0 to allow environment drift), Ball-at-Touch NLL ≤ −0.8, PV Brier ≤ 0.020. Then port: on 2023 NFL NGS tracking, world-model minADE20 must beat constant-velocity by ≥ 30%; decision-eval pilot on 200 labeled fourth-down decisions must show S_pct separating known-good from known-bad calls (rank correlation with EPA outcome ≥ 0.4). If the world model can't beat constant velocity by 30%, the tracking substrate is too noisy — fall back to the 1572 VTCS approach.

## 13. Acceptance / rejection gate
Accepted: real public dataset, released code + checkpoints, state-of-the-art trajectory forecasting on best-of-20 metrics, fully specified three-component architecture with equations, honest reporting of sub-model weaknesses, and a directly portable counterfactual-evaluation design that is the core missing piece of GSE's causal-inference lane.

## 14. Improvement experiment
Replace the simplistic global sampler with a learned proposal policy (receiver-conditioned pass priors / pitch-control masking) and extend rollouts to multi-interaction horizons with calibrated value compounding — the paper's own stated next steps. For GSE, the sharper experiment is VaR/CVaR summaries of the ΔPV distribution (left as future work): tail-risk-aware QB rankings that penalize decisions whose value collapses under small execution noise, a genuinely new product feature for fantasy sit/start.

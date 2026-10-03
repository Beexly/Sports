# [1947] Conditional Generative Modeling for Decision Making (arXiv:2211.15657)

**Citation:** Anurag Ajay, Yilun Du, Abhi Gupta, Joshua B. Tenenbaum, Tommi Jaakkola, Pulkit Agrawal (2022/2023). *Conditional Generative Modeling for Decision Making* (Decision Diffuser; ICLR 2023). arXiv:2211.15657. URL: https://arxiv.org/abs/2211.15657
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

state-only diffusion + return/constraint conditioning is the most GSE-shaped diffusion formulation in the lane (condition on final margin, injuries, weather; compose constraints at test time without retraining); inverse-dynamics action head is irrelevant for pricing and gets dropped.

## 1. Research question
Can sequential decision-making be reframed as pure conditional generative modeling — learning a return-conditioned diffusion model over trajectories — thereby sidestepping dynamic programming, value-function estimation (the "deadly triad"), and the stabilization heuristics of offline RL, while also enabling test-time composition of constraints and skills?

## 2. Dataset / schema
Offline D4RL datasets (Fu et al. 2020): locomotion (HalfCheetah/Hopper/Walker2d, Medium/Medium-Expert etc.), Kitchen (Mixed/Partial), Kuka block stacking. 2D navigation toy environment for the constraint-composition illustration. Public benchmarks; no new data.

## 3. Method / model
Decision Diffuser = conditional diffusion over STATE sequences only (not state-action):
- x_k(τ) ≐ (s_t, s_{t+1}, …, s_{t+H−1})_k — noisy state sequence at diffusion step k. Rationale (stated): actions are often discrete and high-frequency/hard to model; diffusing only over smoother states is easier.
- Training objective: max_θ E_{τ~D}[ log p_θ(x_0(τ) | y(τ)) ], where y(τ) is the conditioning: normalized return, a constraint label, or a skill label.
- Classifier-free guidance (Ho & Salimans 2022): train both conditional ε_θ(x_k, y, k) and unconditional ε_θ(x_k, ∅, k); sample with perturbed noise ε_θ(x_k,k) + ω(ε_θ(x_k,y,k) − ε_θ(x_k,k)), ω = guidance scale; plus low-temperature sampling. The authors hypothesize this implicitly performs trajectory stitching/dynamic programming, capturing the best behaviors in the dataset.
- Acting via inverse dynamics: a_t ≐ f_φ(s_t, s_{t+1}) — a separate learned model converts adjacent generated states into an executable action (Agrawal et al. 2016; Pathak et al. 2018).
- Test-time flexibility: constraint-conditioned training on single constraints → generate trajectories satisfying COMBINED constraints at test time (illustrated: final position between two concentric circles when each dataset satisfied only one); skill-conditioned training → compose skills at test time.

## 4. Equations & assumptions
Eq (4): max_θ E_{τ~D}[ log p_θ(x_0(τ) | y(τ)) ].
Eq (6): x_k(τ) ≐ (s_t, s_{t+1}, …, s_{t+H−1})_k.
Classifier-guided perturbation (background): ε_θ(x_k,k) − ω√(1−ᾱ_k) ∇_{x_k} log p( y | x_k ).
Classifier-free sampling: ε_θ(x_k,k) + ω(ε_θ(x_k,y,k) − ε_θ(x_k,k)).
Inverse dynamics: a_t ≐ f_φ(s_t, s_{t+1}).
Assumptions (stated): offline dataset covers useful behaviors; conditioning labels (return/constraint/skill) are available per trajectory; inverse-dynamics model can recover actions from state pairs; classifier-free guidance with low temperature approximates return maximization.

## 5. Features / target
Inputs: noisy state sequences x_k(τ) (2D array: state-dim × horizon). Conditioning y: normalized episodic return, constraint label, or skill label. Targets: denoising noise ε (conditional and unconditional). Auxiliary: inverse-dynamics action model. Horizon H (locomotion-scale).

## 6. Validation design
Offline evaluation on D4RL locomotion, Kitchen, block stacking. Baselines: BC, CQL, IQL (model-free offline RL), Decision Transformer (DT), Trajectory Transformer (TT), MOReL (model-based), Diffuser. Metrics: normalized average return (locomotion/Kitchen), success rate (stacking). Ablations (appendices): classifier-free guidance, low-temperature sampling, inverse dynamics vs action diffusion, robustness to stochastic dynamics.

## 7. Numerical results / baselines
(Paper claims.) Decision Diffuser "performs better than both TD learning (CQL) and Behavioral Cloning (BC) across D4RL locomotion tasks, D4RL Kitchen tasks and Kuka Block Stacking tasks". Table excerpts: Med-Expert HalfCheetah — BC 55.2, CQL 91.6, IQL 86.7, DT 86.8, TT 95, MOReL 53.3, Diffuser 79.8, DD 90.6±1.3; Med-Expert Hopper — BC 52.5, CQL 105.4, IQL 91.5, DT 107.6, TT 110.0, MOReL 108.7, Diffuser 107.2, DD 111.8±1.8. Kitchen Mixed: BC 51.5, CQL 52.4, IQL 51 (DD value truncated in extraction; figure shows DD best). Constraint composition: single-constraint training → combined-constraint satisfaction at test time (qualitative, Fig. 2).

## 8. Code / data availability
Stated in paper: project page anuragajay.github.io/decision-diffuser; code repo github.com/anuragajay/decision-diffuser (found via search; the paper's extracted text references the project page). D4RL public.

## 9. Leakage & limitations
Offline benchmarks with fixed datasets; evaluation on held-out episodes — no temporal leakage issue for the method. Limitations: (i) return conditioning can only reproduce behaviors present in the data — it cannot invent better-than-dataset play (a ceiling for pricing tail events); (ii) classifier-free guidance scale ω is a sensitive knob; (iv) low-temperature sampling trades diversity for return — for PRICING we need the full distribution, not just the max-return mode (must sample at temperature 1.0 / ω→0 for unbiased simulation); (iii) inverse dynamics irrelevant for GSE; (v) constraint composition is demonstrated on a 2D toy — unproven at NFL complexity.

## 10. GSE overlap
Direct follow-up to 1946 (Diffuser); the state-only + conditioning formulation is new vs 1946's joint state-action diffusion and classifier-guided return predictor. No overlap with existing GSE work. The conditioning framework is the key GSE asset: y(τ) can be final margin, total points, "star QB injured in Q2", weather regime — enabling conditional game simulation without retraining, which no current GSE component does.

## 11. GSE implementation spec
"GSE-DecisionDiffuser": state-only diffusion over game-state sequences (down/distance/yardline/score-diff/time per play — no play-type tokens in the diffusion target; play outcomes implied by state transitions). Conditioning y: (a) normalized final margin (for tail-scenario generation), (b) total points, (c) binary flags (key injury occurred, weather bucket). Train conditional + unconditional noise models on nflverse 2006–2025 games; sample with classifier-free guidance. Two sampling modes: unbiased (ω=0, temp 1.0) → pricing distributions; conditional (ω>0) → exotic-prop pricing (e.g., "P(home wins by 13+)" via return-conditioned generation, or stress-test portfolios under "snow game" conditioning). Drop the inverse-dynamics head entirely — GSE needs states/scores, not actions.

## 12. Reproducible test
nflverse 2015–2024 protocol (1942 §12): train 2015–2022, val 2023, test 2024. Baselines: (a) 1946 GSE-Diffuser (unconditional + inpainting), (b) bootstrap. Metrics: 2024 final-score TVD, WP ECE, PLUS conditional-calibration: for games conditioned on y="home margin ≥10", empirical P(margin ≥10 | simulated conditional batch) vs nominal — measures whether conditioning actually steers the distribution. Success = matches (a) on unconditional metrics and achieves conditional steering (top-decile conditioning shifts the sampled margin distribution by ≥5 points vs unconditional).

## 13. Acceptance / rejection gate
ADOPT conditional state-diffusion if on 2024 held-out: unconditional TVD ≤5%/week AND ECE ≤0.03 (same bar as 1946) AND conditioning shifts sampled margins ≥5 points in the conditioned direction without collapsing diversity (sampled std ≥80% of unconditional std). REJECT if conditioning doesn't steer (the headline capability fails) or if unconditional quality trails the 1946 variant — then 1946's inpainting covers the live-simulation need and this adds nothing.

## 14. Improvement experiment
Beyond the paper: compose MULTIPLE conditions at test time (margin AND total AND weather) — the paper shows constraint composition on a toy; for GSE this enables "snow game + divisional underdog + backup QB" joint stress scenarios for portfolio pricing. Test: joint-conditioning calibration on 2024 games with actual weather data (nflverse weather) — P(total < line | snow conditioning) vs empirical. If composition works, it replaces a combinatorial explosion of separate conditional models.

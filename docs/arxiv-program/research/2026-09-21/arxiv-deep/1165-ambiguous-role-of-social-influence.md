# 1165 The Ambiguous Role of Social Influence on the Wisdom of Crowds: An Analytic Approach (arXiv:2007.15508)

**Citation:** Pavlin Mavrodiev, Frank Schweitzer (2020). *The ambiguous role of social influence on the wisdom of crowds: An analytic approach*. arXiv:2007.15508v1. URL: https://arxiv.org/abs/2007.15508
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, v1, 22 pp incl. appendices, via arxiv.org/pdf).
**Verdict:** ADAPT

Adopt the α/β framework as an ensemble-diversity governance rule: audit GSE's model pool for "social influence" (correlated retraining toward consensus) and enforce "conviction" (anchor each model to its independent signal); monitor diversity decay against the paper's closed-form D_LT.

## 1. Research question
How do social influence (coupling to others' opinions, strength α) and individual conviction (anchoring to one's initial opinion, strength β) affect the wisdom of crowds over time? The paper derives closed-form dynamics for collective error and group diversity instead of relying on agent-based simulation, to quantify exactly when social influence helps vs hurts.

## 2. Dataset / schema
No new dataset. Theory paper; motivating empirical distribution is log-normal initial opinions from cited experiments (e.g., estimating the length of Switzerland's border, Lorenz et al. 2011). Numerical illustrations use: ln T = −2.83 (true value), ⟨ln x(0)⟩ = −3, E(0) = 0.02, ⟨x(0)⟩ = 0.075, ⟨δ²(0)⟩ = 0.004–0.01. No data access involved.

## 3. Method / model
Stochastic opinion dynamics (Brownian agents, mean-field coupling):
dx_i(t)/dt = α[⟨x(t)⟩ − x_i(t)] + β[x_i(0) − x_i(t)] + Aξ_i(t),
where α = social influence strength, β = individual conviction, ξ_i Gaussian white noise with ⟨ξ_i(t)ξ_i(t′)⟩ = δ(t−t′), A = noise strength. Agents observe only the mean opinion ⟨x(t)⟩. Initial opinions log-normal. Macroscopic measures: collective error E(t) = [ln T − ⟨ln x(t)⟩]² and group diversity D(t) = Var[ln x(t)] ≈ ⟨δ²(t)⟩/⟨x(t)⟩² (delta method). Derives closed-form time dynamics and t→∞ asymptotics for both.

## 4. Equations & assumptions
- E(t) = [ln T − ⟨ln x(t)⟩]²; dE/dt = −2[ln T − ⟨ln x(t)⟩]·d⟨ln x(t)⟩/dt.
- D(t) = Var[ln x(t)] = (1/N)Σ[ln x_i(t) − ⟨ln x(t)⟩]².
- Dynamics: dx_i/dt = α[⟨x⟩ − x_i] + β[x_i(0) − x_i] + Aξ_i(t). Ensemble mean follows an Ornstein–Uhlenbeck process; ⟨x(t)⟩ → ⟨x(0)⟩ for large t.
- Long-term diversity (exact): D_LT = ⟨δ²(0)⟩·β² / [⟨x(0)⟩(α+β)]².
- Sensitivities: dD_LT/dα = −2⟨δ²(0)⟩β²/[⟨x(0)⟩²(α+β)³] < 0 (social influence always destroys diversity); dD_LT/dβ = 2αβ⟨δ²(0)⟩/[⟨x(0)⟩²(α+β)³] > 0 (conviction preserves it); dD_LT/d⟨δ²(0)⟩ > 0.
- Long-term collective error E_LT: infinite series in initial moments ⟨δⁿ(0)⟩/⟨x(0)⟩ⁿ with (α,β) weights (Eqn. 19); d⟨ln x(t)⟩/dt > 0 always — the mean opinion only moves rightward (toward/away from truth depending on side).
- Parameter-sweep findings (Fig. 3, exact scenarios): (a) E(0)=0.80, ⟨ln x(0)⟩<ln T: increasing α always improves; increasing β worsens (reinforces a bad start). (b) E(0)=0.02, ⟨ln x(0)⟩>ln T: any α deteriorates; β counterbalances. (c) E(0)=0.01, ⟨ln x(0)⟩<ln T: non-monotonic — ELT=0 achievable with low-to-moderate α<0.5 and sufficient β; α>0.5 deteriorates.
- Assumptions: log-normal initial opinions; mean-field coupling (agents see only the average); Gaussian white noise; delta-method linearization (valid since f=ln is mildly nonlinear); geometric mean as the right aggregate for broad right-skewed distributions.

## 5. Features / target
Inputs: parameters (α, β), initial opinion distribution moments (⟨ln x(0)⟩, ⟨δ²(0)⟩), truth ln T. Targets: long-term collective error E_LT and diversity D_LT. No ML features.

## 6. Validation design
Analytic derivation (appendices D–F) + numerical parameter sweeps over (α,β) for three initial-error scenarios + comparison against cited experimental opinion-dynamics fits ([23] in paper). No train/test, no baselines, no new experiments — a theory paper.

## 7. Numerical results / baselines
- No empirical accuracy numbers vs baselines; results are the closed forms and their parameter maps.
- Qualitative results (paper's claims): social influence helps only when initial collective error is large AND the initial mean is below the truth; in most cases it deteriorates the outcome; individual conviction always mitigates social influence; diversity D_LT is monotonically decreasing in α and increasing in β.
- Concrete illustration values: with ⟨δ²(0)⟩=0.006, D(0)=0.8, (α,β)=(0.5,2.0)→(0.8,2.0)→(0.8,2.5): diversity decay rate steepens with α, flattens with β (Fig. 2).

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Human opinion dynamics, mean-field coupling to the average opinion — a stylized model; GSE models don't literally observe each other's outputs iteratively (mostly).
- Log-normal/right-skewed assumption is about human magnitude estimation, not NFL probabilities.
- The "always rightward motion" result depends on the log transform and the specific coupling; not general.
- No empirical validation of the closed forms against fresh data in this paper (relies on prior fits in [23]).
- The ambiguous-role conclusion is essentially: it depends on initial conditions — useful as a caution, weak as a prescription.

## 10. GSE overlap
Extension, not duplicate. Maps onto a real GSE risk: ensemble members that share training data (nflverse), features, and retraining pipelines are the analog of high-α agents — their errors correlate, and the effective diversity of the pool decays over time ("diversity rot"). No GSE repo file currently audits cross-model dependence or enforces independence between component models. Connects to 1163 (diversity diagnostic) and 1164 (regime choice): this paper governs the diversity itself.

## 11. GSE implementation spec
Adapt as ensemble-diversity governance:
1. Define GSE analogs: α_proxy = mean pairwise correlation of week-to-week prediction *changes* across component models (models that update in lockstep = high social influence); β_proxy = each model's correlation with its own independent signal (e.g., its private feature set) vs with the ensemble mean.
2. Track the paper's D_LT analog weekly: cross-model variance of log-odds forecasts per game, δ²(t). If δ² decays week-over-week while all models ingest the same new data, flag "diversity rot."
3. Enforcement rule ("conviction"): each component model must retain at least one feature family or data source not shared with any other model (documented in a model-independence registry); retraining pipelines must not use the ensemble's own past predictions as features (no consensus-fitting).
4. When adding a model: require its predictions to have mean pairwise |correlation| < 0.85 with the existing pool on a holdout season, else it adds no diversity (paper's dD_LT/dα<0 logic).
5. Effort: ~1 day for the audit + registry; ongoing as a weekly check.

## 12. Reproducible test
Dataset: 2024–2025 NFL seasons, per-game component-model log-odds from the picks table. Compute weekly cross-model variance δ²(t) per market and pairwise correlations of week-over-week changes. Test: (a) does δ²(t) trend down over the season (diversity rot exists)? (b) do weeks in the bottom tercile of δ² have worse ensemble Brier than weeks in the top tercile? Time-ordered by construction. Baseline: none — this is a diagnostic, not a predictor.

## 13. Acceptance / rejection gate
ADOPT the governance rule if the audit finds either (a) a statistically significant downward trend in δ²(t) over 2025 (p<0.05), or (b) any pair of component models with |correlation| > 0.9 on holdout predictions — i.e., the rot is real and the rule has teeth. REJECT the ongoing monitoring (keep the one-time audit) if δ²(t) is stable and all pairs are below 0.85: the pool is already independent enough and the paper's mechanism isn't biting.

## 14. Improvement experiment
Beyond the paper: the paper's agents couple to the *mean*; GSE's analog is stronger — models coupled to the *market* (all trained to predict against the same closing lines). Run a controlled experiment: train two copies of the same model architecture, one with closing-line-derived features included and one with them excluded, and measure the pair's contribution to ensemble Brier via the 1163 decomposition. Hypothesis: the market-coupled copy adds less diversity value (lower δ contribution) than its individual accuracy suggests — quantifying exactly how much "social influence" toward the market costs the ensemble.

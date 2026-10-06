# [0739] Evaluating Range Value at Risk Forecasts (arXiv:1902.04489)

**Citation:** Tobias Fissler, Johanna F. Ziegel (2019/2021). *Evaluating Range Value at Risk Forecasts*. arXiv:1902.04489. URL: https://arxiv.org/abs/1902.04489
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache).
**Verdict:** ADAPT — the strictly consistent scoring functions for the (VaR_α, VaR_β, RVaR_{α,β}) triplet, Murphy diagrams, and the Diebold-Mariano comparative-backtest protocol transfer directly to GSE's quantile/interval forecast evaluation; the RVaR risk-measure theory itself is finance-specific and not adopted.

## 1. Research question
Range Value at Risk (RVaR_{α,β}) — the average of VaR_γ for γ∈[α,β], interpolating robust-but-crude VaR and sensitive-but-fragile Expected Shortfall — was known to be non-elicitable (no strictly consistent scoring function exists for it alone). The paper asks: can a joint forecast of (VaR_α, VaR_β, RVaR_{α,β}) be elicited, and what is the full class of strictly consistent scoring functions for it, so that RVaR forecasts can be meaningfully backtested and ranked?

## 2. Dataset / schema
Pure theory + simulation. No real dataset. Simulation: Y_t = μ_t + u_t with μ_t, u_t iid standard normal sequences, N = 100,000 for Murphy diagrams (population approximation), N = 250 with 10,000 replications for Diebold-Mariano power study.

## 3. Method / model
Elicitability theory. Main results: (1) Proposition 3.1 — strict identification function V(x_1,x_2,x_3,y) with components (1{y≤x_1}−α, 1{y≤x_2}−β, x_3 + (S_β(x_2,y)−S_α(x_1,y))/(β−α)) where S_α(x,y)=(1{y≤x}−α)x−1{y≤x}y. (2) Theorem 3.2 — the class of strictly consistent scoring functions for the triplet. (3) Theorem 3.5 — full characterization (necessity) on continuous distributions. (4) Section 4 — essentially NO strictly consistent scoring function is translation-invariant or positively homogeneous. (5) Section 5 — mixture representation enabling **Murphy diagrams**: expected elementary scores L_v^1, L_v^2 (for the two VaRs) and L_v^3 (for the triplet) plotted over the threshold parameter v, letting forecasters be compared simultaneously under ALL consistent scoring functions. (6) Section 6 simulation: three forecasters — f (ideal, knows μ_t), g (f + N(0,σ²) noise, σ∈{0.3,0.5,0.8}), h (unconditional N(0,2)) — compared via Murphy diagrams and Diebold-Mariano tests on four candidate scoring functions S_1..S_4 (Table 1, e.g., S_1 with φ'(x_3)=(β−α)tanh((β−α)x_3); S_4 Huber-like).

## 4. Equations & assumptions
RVaR_{α,β}(F) = (1/(β−α))∫_α^β VaR_γ(F) dγ; identity RVaR_{α,β} = (β·ES_β − α·ES_α)/(β−α). Scoring function class (3.3): S(x_1,x_2,x_3,y) = (1{y≤x_1}−α)g_1(x_1) − 1{y≤x_1}g_1(y) + (1{y≤x_2}−β)g_2(x_2) − 1{y≤x_2}g_2(y) + φ'(x_3)(x_3 + (S_β(x_2,y)−S_α(x_1,y))/(β−α)) − φ(x_3) + a(y), with φ convex, G_{1,x_3}(x_1)=g_1(x_1)−x_1 φ'(x_3)/(β−α) and G_{2,x_3}(x_2)=g_2(x_2)+x_2 φ'(x_3)/(β−α) increasing. Key structural finding: RVaR = difference of minima of expected VaR scores (not the negative of a minimum like ES), which is why the scoring class is less flexible than for (VaR,ES). Assumptions: distributions with unique α/β-quantiles (F∈F^α∩F^{(α)} etc.) for strictness; bounded forecasts for the broad class.

## 5. Features / target
Not applicable (theory paper). The "forecasts" are point forecasts of the functional T=(VaR_α,VaR_β,RVaR_{α,β}); the observable is the realized y_t.

## 6. Validation design
Simulation only. Three forecasters with known ideal/non-ideal relationships; Murphy diagrams at N=100,000 approximate population expected elementary scores; Diebold-Mariano tests (one-sided, 5%) on N=250 samples, 10,000 replications, reporting empirical rejection power for each ordered pair of forecasters × four scoring functions, at (α,β)=(0.1,0.9) (trimmed mean) and (0.01,0.05) (tail risk).

## 7. Numerical results / baselines
Diebold-Mariano power (Table 2, left panel α=1−β=0.1, σ=0.5 for forecaster g): for H0 "f⪯g" (forecaster 1 beats 2), empirical power = **0.304 (S_1), 0.406 (S_2), 0.417 (S_3), 0.624 (S_4)** — discrimination ability varies substantially across scoring functions in the same class. For "f⪯h": power 0 for all (correctly never rejects that the worse forecaster wins); "h⪯f": 1.000 for all; "h⪯g": 0.999/0.998/0.992/0.998. Right panel (α=0.01, β=0.05): S_4 much weaker at detecting h⪯g (power **0.393** vs ≥0.874 for S_1–S_3). Murphy diagrams (Fig. 1–2) correctly rank f≻g≻h at population level for σ=0.3,0.5,0.8.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Theory paper — no data, no leakage. Limitations for GSE: (a) RVaR/ES machinery is finance risk-measure specific; the triplet result is mathematically elegant but GSE's objects are win probabilities and point spreads, not loss-quantile triplets; (b) the scoring class's lack of translation-invariance/homogeneity (Section 4) limits practical choices; (c) simulation is Gaussian and iid — no heavy tails, no regime shift; (d) the S_1–S_4 candidates are ad hoc ("a systematic study... goes beyond the scope"); (e) DM power results depend on the arbitrary σ=0.5 choice. What transfers is the *evaluation protocol* (consistent scores + Murphy diagrams + DM tests), not the risk measure.

## 10. GSE overlap
Existing-research-map.md covers proper scoring generally (log-loss, Brier, CRPS mentioned in calibration section) but nothing on elicitability, Murphy diagrams, or Diebold-Mariano comparative backtesting of interval/quantile forecasts. This is a new capability: a principled protocol for ranking competing GSE model versions on quantile/interval outputs.

## 11. GSE implementation spec
(1) For GSE's quantile forecasts (e.g., 10th/90th percentiles of game totals, spread quantiles), implement the generalized pinball-score family and Murphy diagrams: expected elementary quantile scores vs. threshold v for each competing engine version — one plot that dominates all consistent-score comparisons simultaneously. (2) Formalize engine A/B comparisons with Diebold-Mariano tests on the chosen consistent score rather than eyeballing log-loss deltas. (3) Optional: adopt the trimmed-mean (RVaR with α=1−β) as a robust location functional for noisy market-implied quantities (e.g., consensus line movement), estimated via the joint (VaR_α,VaR_β,trimmed-mean) M-estimator of Section 7. Effort: ~2 days for (1)+(2); (3) is a research spike.

## 12. Reproducible test
Dataset: 2023–2025 NFL games; two GSE engine versions (or engine vs. market consensus) producing quantile forecasts of game totals. Metric: Murphy diagram dominance (count of v-grid points where each forecaster's expected elementary score is lowest) + DM test p-values on mean pinball loss. Success = the newer engine dominates on the Murphy diagram over the central v-range AND DM rejects equality at 5%.

## 13. Acceptance / rejection gate
ADOPT the evaluation protocol if applying it to two known-different engine versions reproduces the known ranking with DM p<0.05 and the Murphy diagram shows uniform (not v-local) dominance; REJECT the trimmed-mean M-estimation application (item 3 above) if it fails to beat a plain median/mean on a robust-location horse race on market-implied lines.

## 14. Improvement experiment
Extend Murphy diagrams to *conditional* (Mondrian) Murphy diagrams: plot expected elementary scores separately for favorites vs. underdogs (or high vs. low totals) to detect that engine A wins overall but loses on a subpopulation — a diagnostic the paper's unconditional diagrams cannot give.

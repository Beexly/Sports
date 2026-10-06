# [0589] Bradley-Terry Modeling with Multiple Game Outcomes with Applications to College Hockey (arXiv:2112.01267v1)

**Citation:** Whelan, J. T. & Klein, J. E. (2021). *Bradley-Terry Modeling with Multiple Game Outcomes with Applications to College Hockey*. arXiv:2112.01267v1. URL: https://arxiv.org/abs/2112.01267v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 6,507 lines).
**Verdict:** ADAPT — adopt the softmax-over-outcome-types parametrization and the HMC/Gaussian uncertainty machinery for GSE team-strength modeling; reject the hockey 3-2-1-0 point weighting (no NFL analog), replacing it with outcome buckets fitted from data.

## 1. Research question
How can the Bradley-Terry model be generalized from binary win/loss (or win/tie/loss via Davidson) to competitions with four qualitatively different outcomes — regulation win, overtime/shootout win, overtime/shootout loss, regulation loss — so that strength parameters respect the league's actual point system (e.g., IIHF 3-2-1-0) and the model yields predicted probabilities for each outcome type, not just win vs. loss?

## 2. Dataset / schema
2020–2021 Eastern College Athletic Conference (ECAC) men's college hockey season. 4 teams only (Colgate, Clarkson, Quinnipiac, St. Lawrence). Game counts per team (RW/OW/OL/RL): Colgate 4/2/3/9, Clarkson 5/3/4/2, Quinnipiac 9/4/2/3, St. Lawrence 3/2/2/7 — roughly 14–18 games per team. Pairwise counts n^RW_ij and n^OW_ij per team-pair shown in the paper's Table 1. The schedule was unbalanced due to COVID-19 cancellations (ordinarily a balanced round-robin). Source of results: collegehockeynews.com and flashscore.com. Demonstration dataset, not a benchmark corpus.

## 3. Method / model
Three models compared: (a) standard Bradley-Terry (all wins equal); (b) Bradley-Terry–Davidson with ties (overtime games treated as ties); (c) a new four-outcome model with outcome-specific strength exponents. Inference via: maximum likelihood solved by a generalized Ford/Zermelo iterative update (with geometric-mean renormalization of strengths each iteration, ∏π̂_i = 1); Bayesian inference with an improper Haldane prior (uniform in λ_i = ln π_i and τ = ln ν) under two posterior-approximation routes — (i) Gaussian (Laplace) approximation about the MAP using the analytic Hessian's Moore-Penrose pseudo-inverse (needed because the Hessian is singular along the additive λ-shift direction; this enforces ∑λ_i = 0), and (ii) Hamiltonian Monte Carlo in Stan (Appendix A gives the full Stan model; the key trick is parametrizing in terms of successive differences ω_i = λ_i − λ_{i+1}, i.e., t−1 independent parameters, so the posterior is proper and chains converge).

## 4. Equations & assumptions
Standard BT: θ^W_ij = π_i/(π_i + π_j), with π_i ∈ (0, ∞). (Eq. 2.1)
Davidson ties: θ^W_ij = π_i/(π_i + ν√(π_i π_j) + π_j), θ^T_ij = ν√(π_i π_j)/(π_i + ν√(π_i π_j) + π_j), θ^L_ij = π_j/(π_i + ν√(π_i π_j) + π_j); probability of a tie between evenly matched teams is ν/(2+ν). (Eqs. 2.3)
New four-outcome model (Eqs. 2.5a–2.5d): θ^RW_ij = π_i/D, θ^OW_ij = ν π_i^{2/3} π_j^{1/3}/D, θ^OL_ij = ν π_i^{1/3} π_j^{2/3}/D, θ^RL_ij = π_j/D, where D = π_i + ν π_i^{2/3} π_j^{1/3} + ν π_i^{1/3} π_j^{2/3} + π_j. The exponents 2/3 and 1/3 are chosen to match the 3-2-1-0 point system, so the MLE moment condition (Eq. 3.7 multiplied by 3) becomes ∑_j (3n^RW_ij + 2n^OW_ij + n^OL_ij) = expected — expected points equal actual points for every team.
General unified form (Eqs. 2.7–2.8): with λ_i = ln π_i and τ = ln ν,
θ^I_ij = σ({p_J (λ_i − λ_j) + o_J τ | J})_I, where σ(x)_I = e^{x_I}/∑_J e^{x_J} is softmax. Model variants are special cases: standard BT (p_W=1, p_L=0, o=0); BT–Davidson (p_W=1, p_T=1/2, p_L=0, o_W=o_L=0, o_T=1); this paper (p_RW=1, p_OW=2/3, p_OL=1/3, p_RL=0, o_RW=o_RL=0, o_OW=o_OL=1). All models satisfy ∑_I θ^I_ij = 1, θ^{−I}_ij = θ^I_ji, p_{−I} = 1−p_I, o_{−I} = o_I, 0 ≤ p_I ≤ 1, o_I ∈ {0,1}.
Log-likelihood (Eq. 3.1): ln P(D|{λ_i},τ) = (1/2) ∑_i ∑_j ∑_I n^I_ij ln θ^I_ij. First-derivative (score) identities (Eqs. 3.3a–b): ∂lnθ^I_ij/∂τ = o_I − ∑_J o_J θ^J_ij; ∂lnθ^I_ij/∂λ_k = (δ_ik − δ_jk)(p_I − ∑_J p_J θ^J_ij). Moment equations (Eqs. 3.6–3.9): n^o = (1/2)∑_i∑_j n_ij ∑_I o_I θ̂^I_ij and p_k = ∑_i n_ki ∑_I p_I θ̂^I_ki, where n^o is the number of tied/overtime games and p_k is team k's total "points".
Iterative MLE updates (Eqs. 3.10–3.11): ν̂ = n^o / ((1/2)∑_i∑_j n_ij [∑_I o_I (π̂_i/π̂_j)^{p_I}] / [∑_J (π̂_i/π̂_j)^{p_J} ν̂^{o_J}]) and π̂_k = p_k / (∑_i n_ki [∑_I p_I π̂_k^{p_I−1} π̂_i^{−p_I} ν̂^{o_I}] / [∑_J (π̂_k/π̂_i)^{p_J} ν̂^{o_J}]).
Posterior: f({λ_i},τ|D,I_0) ∝ P(D|{λ_i},τ) under the improper Haldane prior f({λ_i},τ|I_0) = constant (Eqs. 3.12–3.14). Gaussian approximation (Eq. 3.15) uses the Hessian at the MAP (Eqs. 3.17–3.22), with Σ = H^+ the Moore-Penrose pseudo-inverse, enforcing ∑_i λ_i = 0 (Eq. 3.24). For HMC sampling, probabilities are functions only of γ_ij = λ_i − λ_j and τ: θ^I_ij = σ({p_J γ_ij + o_J τ | J})_I (Eq. 3.25).
Assumptions stated: the {p_I}, {o_I} satisfy the symmetry constraints above; all games played under identical rules (regular-season OT/shootout format — playoffs under different rules explicitly excluded); existence/finiteness of MLEs depends on the Albert–Anderson-type conditions (cited, not re-derived); posterior normalizable under the same conditions as well-defined MLEs.

## 5. Features / target
No features in the ML sense — the "features" are the game results themselves: per-team-pair counts n^I_ij for each outcome type I. Targets: the log-strengths {λ_i}, the overtime/tie parameter τ, and derived head-to-head outcome probabilities θ^I_ij (used for prediction of future games).

## 6. Validation design
No train/test split and no predictive holdout evaluation. The demonstration applies all three models to the same 2020–2021 ECAC season and compares MLE point estimates, Gaussian-approximation posteriors, and HMC posterior samples for the same parameters — i.e., method-concordance checking, not out-of-sample prediction. Baselines are the two simpler models (BT, BT–Davidson) applied to the same data with different outcome codings.

## 7. Numerical results / baselines
- Four-team ECAC data, per-team outcome totals (RW/OW/OL/RL): Colgate 4/2/3/9; Clarkson 5/3/4/2; Quinnipiac 9/4/2/3; St. Lawrence 3/2/2/7 (Table 1).
- Standard BT MLE log-strengths: Colgate −0.55, Clarkson 0.32, Quinnipiac 0.74, St. Lawrence −0.51, with one-sigma uncertainties √(Σ_ii): 0.39, 0.43, 0.40, 0.45 (Table 2).
- BT–Davidson (OT as ties): MLE log-strengths Colgate −0.73, Clarkson 0.70, Quinnipiac 0.89, St. Lawrence −0.85; τ̂ = 0.23; estimated tie probability between evenly matched teams e^{τ̂}/(2+e^{τ̂}) = 0.39 (Table 3).
- Four-outcome model: MLE log-strengths Colgate −0.74, Clarkson 0.60, Quinnipiac 0.93, St. Lawrence −0.79; τ̂ = −0.49; estimated overtime probability between evenly matched teams e^{τ̂}/(1+e^{τ̂}) = 0.38 (Table 5). Pairwise θ̂^RW and θ̂^OW probabilities in Tables 5–6 (e.g., Quinnipiac over Colgate: θ̂^RW = 0.57, θ̂^OW = 0.20).
- Key qualitative finding: the Gaussian approximation and the exact HMC posterior are "only slightly different" — differences noticeable only when the MLE γ̂_ij is far from zero (Figs. 1, 3, 5, 7, 9). Log-strength differences are "qualitatively similar" across all three models. The overtime posterior in the four-outcome model is very similar to the tie posterior in the BT–Davidson model (same games under different codings).
- No predictive-accuracy numbers (log-loss, Brier) reported; no "best model" determination attempted (authors state the correct model is the one matching the league's standings point system).

## 8. Code / data availability
Full Stan model code printed in Appendix A (the paper states the same Stan DSO compiles for all three models by passing {p_I}, {o_I} as data). No repository link stated. Data collected from collegehockeynews.com and flashscore.com (no downloadable snapshot stated).

## 9. Leakage & limitations
- No out-of-sample evaluation at all: everything is fit and described on the same 4-team, single-season dataset. Predictive claims are illustrated by in-sample posteriors only.
- Tiny sample: ~14–18 games per team, 4 teams, 6 team-pairs; pairwise θ estimates have wide posteriors (one-sigma on log-strengths ~0.4–0.58, i.e., ±10–14% on win probability scale).
- The choice p_OW = 2/3, p_OL = 1/3 is arbitrary-but-for-the-point-system; the authors admit this and propose estimating {p_I} from data as future work. A different point system (NHL 2-2-1-0, soccer 3-1-0, NCAA 0.55-OT rule) needs a different model.
- Haldane prior is improper; the model cannot be fit to teams with degenerate results (e.g., undefeated teams break the MLE existence conditions — flagged but not handled).
- No home-ice advantage term, no time dynamics (strengths static over the season), no score margin information used.
- External validity to NFL: hockey's multi-outcome structure has no direct NFL analog (NFL ties are ~1–2% of games; OT is not scored 2/3 vs 1/3 in any standings system). The domain value is the machinery, not the point weights.
- Playoffs played under different rules are explicitly out of scope (the authors' own caveat), which limits use for postseason predictions without the conditional-on-non-OT construction they sketch.

## 10. GSE overlap
Extension, not duplicate. The repo master list (existing-research-map.md, metrics inventoried) already includes Bradley-Terry (basic form) and state-space team-strength models (nested AR(1), 1701.05976) plus dynamic Elo/Glicko/TrueSkill mentions, but nothing covers: (a) the multi-outcome softmax generalization (Eq. 2.7) with ordered outcome categories, (b) the Davidson tie-rate parameter τ fitted jointly with strengths, or (c) the full HMC/Gaussian-approximation uncertainty propagation pipeline for team-strength posteriors. GSE's engine v5.2.7 presumably produces point ratings; the paper's posterior-sampling discipline for prediction intervals is new capability in the same lane.

## 11. GSE implementation spec
Build a GSE team-strength module using the paper's unified softmax form on nflverse game results (2015–2025 regular seasons), with outcome categories adapted to football: (i) Davidson-style tie model (W/T/L) for moneyline-equivalent probabilities; (ii) margin-bucket variant with outcomes {RW = win by ≥14, OW = win 1–13, OL = loss 1–13, RL = loss ≥14} (ordered strength exponents 1, 2/3, 1/3, 0 reused, now fitted as free parameters p_OW ∈ (1/2,1), p_OL = 1−p_OW via hierarchical prior — the paper's own proposed future work); (iii) season-to-season carryover via a Gaussian hierarchical prior on λ_i (the paper cites Phelan & Whelan 2017 for this) replacing the improper Haldane prior. Add home-field term γ_ij = λ_i − λ_j + h·home_i. Fit in Stan (the paper's Appendix A code is a ready starting point — replace data block with nflverse game counts per outcome bucket per season week). Posteriors sampled weekly; predicted outcome-bucket probabilities feed spread/total conversion and prop edge-sheets. Effort: ~2–3 engineer-weeks (data plumbing from nflverse, Stan model, weekly batch serving, backtest harness).

## 12. Reproducible test
Dataset: nflverse regular-season games, 2018–2025 (playoff excluded, matching the paper's caveat). Time-ordered rolling: fit on all seasons up to week w−1, predict each week w of 2024–2025. Metrics: multiclass log-loss on {RW/OW/OL/RL} margin buckets and Brier on win/loss collapsed. Baselines: (a) standard BT (win/loss only, MLE), (b) the engine's current team ratings collapsed to bucket probabilities, (c) market (de-vigged moneyline → bucket probability via a fixed bucket share). Test exactly the claim that ordered-outcome BT with inferred {p_I} improves bucket log-loss vs. baseline (a).

## 13. Acceptance / rejection gate
Adopt (as a GSE module) if the four-bucket model beats baseline (a) standard BT log-loss by ≥1.0% and beats market baseline (c) by ≥0.25% on the 2024–2025 rolling window, with bucket coverage (predicted vs. observed frequency) within 1.5 percentage points per bucket. Otherwise reject — keep standard BT/Elo and do not pay the Stan-sampling cost.

## 14. Improvement experiment
Replace the fixed 2/3–1/3 exponents with the paper's proposed extension: fit p_OW as a free parameter with prior support (1/2, 1) and a season-varying τ (overtime/close-game rate changes as NFL overtime rules changed in 2022) — testing whether the data's implied "share of a win" for a close win drifts by era. If p̂_OW drifts above 2/3 in the 2022–2025 rules, the model captures a real rule-effect the fixed-exponent version cannot, and the inferred exponent becomes a reportable metric itself (mirroring how the paper treats τ as meaningful).

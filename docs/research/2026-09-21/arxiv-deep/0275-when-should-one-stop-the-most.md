# [0275] When should one stop the most exciting game? Sequential Inference for win-martingales (arXiv:2608.12291)

**Citation:** Steven Campbell (Dept. of Statistics, Columbia University) and Karl Kristian Engelund (Dept. of Mathematical Sciences, University of Copenhagen). *When should one stop the most exciting game? Sequential Inference for win-martingales*. arXiv:2608.12291. URL: https://arxiv.org/abs/2608.12291
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 33,424 lines, sequential, including appendices and references).
**Verdict:** ADAPT — the paper's optimal "stop-and-declare" machinery ports to a live-decision policy over streaming win probabilities / model confidence / odds (when to act now vs. wait for more information), but only after fitting a credible martingale diffusion and naming explicit delay and decision losses; the paper itself assumes away real game termination and treats idealized separable diffusions.

## 1. Research question
Given a **win-martingale** — a bounded martingale Π_s ∈ [0,1] representing the posterior win probability of team 1 given everything observed so far — when should a decision maker stop watching the game and make a terminal call? Formally: minimize the Bayes risk of a sequential stop-and-declare problem, trading the accumulated cost of waiting f(s) against the terminal decision loss ℓ(θ, d). The paper reduces this Bayes problem to an optimal-stopping problem for the posterior belief process, characterizes the optimal rule as the first exit from a time-varying uncertainty interval, and studies the free boundary's regularity and its nonlinear integral equation. Motivating examples are the Aldous and Bass "most exciting game" martingales ([4], Backhoff-Veraguas & Beiglböck 2024) and classical binary sequential-inference martingales.

## 2. Dataset / schema
- No empirical data. This is a pure stochastic-control / free-boundary paper; the "data" are the motivating win-martingales:
  - **Aldous:** dΠ^A_s = sin(πΠ^A_s)/(π√(S−s)) dW_s
  - **Bass:** dΠ^B_s = φ(Φ⁻¹(Π^B_s))/√(S−s) dW_s
  - **Binary sequential inference:** dΠ^I_s = Π^I_s(1−Π^I_s)/√(S−s) dW_s
- Numerical illustrations only: Figure 1 (Aldous vs. Bass value functions, L²-loss, c₀=0.075), Figure 2 (three running-cost regimes for the binary martingale, S=1), Figure 3 (oscillatory cost, Aldous, cross-entropy loss).
- Related literature mined: Ekström–Karatzas–Vaicenavicius [13] (deterministic cutoff for point estimation), Ekström–Vaicenavicius [14] (sequential testing of Brownian drift), Guo–Howison–Possamaï–Reisinger [20] (early-termination exciting games — deliberately excluded).

## 3. Method / model
- **Binary posterior / win probability:** Π_s = P(θ=1 | 𝒢_s), a bounded martingale. The Bayes decision risk E[∫₀^ν f(s)ds + ℓ(θ,d)] is reduced (§2) to the optimal stopping problem **inf_{ν≤S} E[∫₀^ν f(s)ds + g(Π_ν)]**, where g(π) = inf_d [πℓ(1,d) + (1−π)ℓ(0,d)] is the concave terminal cost induced by the optimal terminal action.
- **Terminal costs studied:** squared-error g_{L²}(x) = x(1−x); cross-entropy g_CE(x) = −x log x − (1−x) log(1−x) (note g′_CE is unbounded — needs Assumption B.(iii).(b)); hard classification g(x) = x∧(1−x) mentioned (Remark 6.14: boundary existence then follows from concavity of V_T directly).
- **Separable win-martingale + time change:** assume dΠ_s = ρ(s)σ(Π_s)dW_s. Define A(s) = ∫₀^s ρ²(v)dv with inverse Γ, and X_t = Π_{Γ(t)}; then dX_t = σ(X_t)dB_t. The deterministic time factor is absorbed into the transformed running cost **c(t) = f(Γ(t))Γ′(t) = f(Γ(t))/ρ²(Γ(t))**. Transformed value: **V_T(t,x) = inf_{τ≤T−t} E[∫₀^τ c(t+u)du + g(X^x_τ)]** with generator **ℒ = ½σ²(x)∂_xx**.
- **Lagrange formulation:** W(t,x) = V(t,x) − g(x) solves **W(t,x) = inf_τ E[∫₀^τ (c(t+u) + ℒg(X^x_u))du]** — the object on which monotonicity and smooth-fit arguments are run.
- **Existence:** Proposition 3.7 — smallest optimal stopping time exists and is the first hitting time of the stopping set; Proposition 3.8 — the set 𝒰 where c+ℒg<0 satisfies 𝒰∩𝒮_T ⊆ 𝒞_T.
- **Lamperti transform** used to linearize space: L^l via Ψ(x) = ∫ 1/σ, turning the diffusion into unit-volatility with drift μ.
- **Uniqueness argument (§7):** change-of-variables formula with local time on the curves b and 1−b [27]; the local-time term vanishes by spatial smooth fit; uniqueness of the boundary follows from a two-sided comparison using **H(u,x) = c(u) + ℒg(x) > 0** on the continuation/stopping gap.

## 4. Equations & assumptions
Equations (numbers as in paper):
- **Bayes reduction (§2):** inf_{ν≤S} E[∫₀^ν f(s)ds + g(Π_ν)], g(π) = inf_d[πℓ(1,d) + (1−π)ℓ(0,d)].
- **Terminal costs:** g_{L²}(x) = x(1−x); g_CE(x) = −x log x − (1−x) log(1−x).
- **Separable martingale + time change:** dΠ_s = ρ(s)σ(Π_s)dW_s; A(s) = ∫₀^s ρ²(v)dv; X_t = Π_{Γ(t)}, dX_t = σ(X_t)dB_t; **c(t) = f(Γ(t))Γ′(t)**.
- **Aldous:** σ_A(x) = sin(πx)/π; **Bass:** σ_B(x) = φ(Φ⁻¹(x)); **binary inference:** σ_I(x) = x(1−x), all with ρ(s) = 1/√(S−s), A(s) = −log((S−s)/S), Γ(t) = S(1−e^{−t}) (so T = ∞).
- **Generator:** ℒ = ½σ²(x)∂_xx; **value:** V_T(t,x) = inf_{τ≤T−t} E[∫₀^τ c(t+u)du + g(X^x_τ)].
- **Lagrange form:** W(t,x) = V(t,x) − g(x); **W(t,x) = inf_τ E[∫₀^τ (c(t+u) + ℒg(X^x_u))du]**.
- **Theorem 4.1:** continuation region **𝒞_T = {(t,x) ∈ 𝒮_T : 1−b_T(t) < x < b_T(t)}** with **γ(t) < b_T(t) < 1**; first exit is optimal. (γ(t) is the explicit curve where c(t)+ℒg(x) = 0.)
- **Theorem 4.2:** V_T ∈ **C¹(𝒮_T)** globally and **C^{1,2}** away from the stopping boundary; smooth fit ∂_x V_T = g′, ∂_t V_T = 0 at the boundary (Propositions 6.21, 6.22; infinite-horizon via Proposition 6.23, ∂_x V_T → ∂_x V_∞ uniformly).
- **Corollary 4.3:** second spatial derivative generally discontinuous across the boundary: lim from continuation = **−2c(t)/σ²(b_T(t))**, from stopping = **g′′(b_T(t))**, with **g′′(b_T(t)) > −2c(t)/σ²(b_T(t))**.
- **Corollary 4.4:** **b_T ∈ C¹([0,T))** (via [10, Theorem 2.4]).
- **Theorem 4.5 (integral equation):** for x = b(t) or 1−b(t), equation (4.2) holds:
  **V_T(t,x) = E[∫₀^{T−t} c(t+u)1{X^x_u ∈ 𝒞^b_{t+u}}du − ∫₀^{T−t} ℒg(X^x_u)1{X^x_u ∉ 𝒞^b_{t+u}}du + g(X^x_{T−t})]**,
  and any continuous β with γ(t) < β(t) < 1 solving it must equal b_T. The equation uniquely characterizes the boundary.
- **Homogeneous infinite-horizon (§5, Theorem 5.2):** with constant c, optimal rule is exit from a fixed interval (A*,B*); free-boundary ODE ℒV̂ = −c inside, V̂ = g outside, value + smooth fit at A/B; if **ℒg(x₀) ≥ −c**, immediate stopping is optimal (V ≡ g).
- **Derivative representations:** ∂_x V_T(t,x) = E[g′(X^x_{τ*})∂_x X^x_{τ*}] (6.6); time-derivative bounds E[c(t+τ*)] − c(t) ≤ ∂_t V_T ≤ … + K′′P(τ* = T−t) (6.13); infinite horizon exact: ∂_t V_∞ = E[c(t+τ*_∞)] − c(t) (6.14); PDE (∂_t + ℒ)V_T = −c(t) in 𝒞_T (6.28).
- **Proposition 8.2 (monotonicity):** boundary monotonicity is governed by **f/ρ²**, not f alone: f/ρ² increasing ⇒ b_T decreasing (continuation shrinking); if A(s)→∞ and f/ρ² decreasing ⇒ b increasing on infinite horizon.
- Stated assumptions: (A) positive smooth running cost f with bounded relative derivative, exponential growth bounds, and a cap condition (A.(v)) ensuring continuation is non-trivial; (B) separable smooth symmetric σ with **inaccessible endpoints** {0,1}, smooth symmetric concave terminal cost g, unimodal ℒg, and a true-martingale stochastic-flow derivative ∂_x X^x. Assumptions B.(iii).(a) (bounded g′) vs. (b) (unbounded g′, as for cross-entropy) split several proofs.
- Not stated as assumptions but load-bearing: the posterior is a **true martingale** with no drift and no exogenous termination; the decision maker and the game share the same filtration.

## 5. Features / target
- Inputs: the running posterior win probability Π_s (or any bounded martingale belief stream); the deterministic volatility factor ρ(s); the running (waiting) cost f(s).
- Targets: the optimal stopping boundary b_T(t) (equivalently b(A(s)) in original time); the optimal rule "stop the first time Π exits (1−b, b)".
- The terminal decision d itself is folded into the concave cost g — the paper solves only the *timing* of the declaration, not the declaration's content.

## 6. Validation design
- Pure theory: no train/test splits, no empirical validation. "Validation" is the chain of theorems: existence (Prop. 3.7) → boundary structure (Prop. 6.13, Thm. 4.1) → value regularity and smooth fit (Thm. 4.2, Props. 6.21–6.23) → boundary regularity (Props. 6.19, Cor. 4.4) → integral-equation characterization and uniqueness (Thm. 4.5).
- Numerical illustrations: Figure 1 — value functions for Aldous (dotted) vs. Bass (dashed) under L²-loss with c₀ = 0.075; **the Aldous value function lies above the Bass value function** (same loss and cost ⇒ the Aldous game is costlier to predict optimally, "more difficult, or more exciting, to call"). Figure 2 — three binary-martingale cases (S=1, L²-loss): (left) f(s) = k(s+α)/(1−s), c(t) = k(1+α−e^{−t}), k = 0.03, α = 1 (increasing transformed cost → shrinking region); (middle) f(s) = k(s+α), c(t) = k(1+α−e^{−t})e^{−t}, k = 0.24, α = 0.01 (nonmonotone); (right) f(s) = k, c(t) = ke^{−t}, k = 0.06 (decreasing → expanding). Figure 3 — Aldous with cross-entropy loss and oscillatory c(t) = k₁ + k₂ sin(2πt), k₁ = 0.125, k₂ = 0.075 (boundary oscillates; Proposition 8.6 proves b_∞(A(s)) need not converge as s↗S).
- Gaussian-prior sequential testing (Example 8.7–8.8): Π_s solves dΠ_s = ξφ(Φ⁻¹(Π_s))/√(1+sξ²) dW_s, A(s) = log(1+sξ²), Γ(t) = (e^t−1)/ξ². With constant f ≡ c₀, instantaneous stopping is optimal for s ≥ **S′ = (1/(2πc₀) − 1/ξ²)⁺**; the sign-estimation cutoff S′ vs. the point-estimation cutoff **ν̂* = (1/√c₀ − 1/ξ²)⁺** [13] has no general order (if c₀ < 1/(4π²), then S′ > ν̂*).

## 7. Numerical results / baselines
- No predictive benchmarks; the numerics are sanity plots of the theory. Key quantitative takeaways: (a) Aldous > Bass value-function ordering at c₀ = 0.075 (Figure 1); (b) the three cost regimes of Figure 2 demonstrate that monotone original-time costs produce shrinking, nonmonotone, or expanding continuation regions — the governing ratio is f/ρ²; (c) the periodic-cost example proves the boundary can fail to settle as the horizon approaches (Proposition 8.6); (d) the S′ vs. ν̂* comparison shows sign-estimation and point-estimation have different, unordered deterministic cutoffs.
- The paper positions itself against Guo–Howison–Possamaï–Reisinger [20], which allows early termination (martingale absorbed at {0,1} in finite time) — explicitly out of scope here (§9).

## 8. Code / data availability
- No code, no data. The Aldous page is cited as https://www.stat.berkeley.edu/~aldous/Research/OP/max_ent_mg.html. The arXiv companion "Exciting games and Monge-Ampère equations" is arXiv:2412.01995.

## 9. Leakage & limitations
- **Excludes early termination.** §9 is explicit: the time-changed martingale stays in (0,1) at every finite time; the game is "revealed only in the limit, or through a singular deterministic time factor at the terminal time." Real games end by absorption (a team wins); models like Wright–Fisher or Brownian motion absorbed at {0,1} are out of scope — that is the [20] formulation, left for future work. Any GSE use on live games must handle the game actually ending, which this theory does not.
- **Inaccessible-endpoint + separability assumptions.** Everything rests on dΠ_s = ρ(s)σ(Π_s)dW_s with smooth symmetric σ and inaccessible {0,1}. Real win-probability streams (NGS WP, ESPN, market-implied) do not come with a certified diffusion coefficient; estimating σ(π) from data is the entire practical problem and the paper says nothing about it.
- **Concave, symmetric terminal cost.** g must be concave and symmetric; the hard-classification cost only gets a boundary-existence remark (Remark 6.14), not the full regularity theory. Asymmetric real-world losses (e.g., publishing a wrong pick costs more than missing a right one) break symmetry.
- **Running cost specification is subjective.** The delay cost f(s)/c(t) — what is a minute of waiting *worth*? — is taken as given. For betting this could be foregone line value; for content it is audience decay; but the paper offers no calibration method.
- **Monotonicity is about f/ρ², not f.** A practitioner who specifies an increasing waiting cost and expects a shrinking "wait region" can be wrong if the noise level rises fast enough (Example 8.4 middle/right panels).
- **Boundary need not stabilize near the end.** Proposition 8.6: with periodic costs, b_∞(A(s)) oscillates as s↗S — policies derived from this theory can behave erratically close to game end if costs are cyclic.
- **No discrete time.** The whole apparatus is continuous-time optimal stopping; any implementation must discretize, and the smooth-fit/pasting regularity does not come with discretization error bounds.

## 10. GSE overlap
- **New capability — no existing coverage.** The existing-research-map's market-microstructure lane is thin, Kelly/sizing has no dedicated deep-read (Oracle3 mentions Kelly but no Kelly paper was deeply read), and nothing in the corpus treats the **timing** of a decision as an optimal-stopping problem over a belief martingale. The live-betting lane covers line movement/steam descriptively, not "act now vs. wait" optimally.
- Adjacent but distinct: the de-vigged consensus / market-implied ratings work gives the *level* of the belief; this paper would govern the *timing* of acting on it. CLV work measures execution quality ex post; this would optimize the wait-vs-act tradeoff ex ante.
- Sports-betting relevance is a genuine extension of the paper's own motivation: the authors frame win-martingales via prediction markets ([33] Wolfers & Zitzewitz is cited).

## 11. GSE implementation spec
- **Use case:** an optimal "publish/act now vs. wait for more information" policy. Concrete candidates: (a) timing a live-bet/hedge off a streaming win-probability series; (b) when to release a pregame pick as odds move (act now vs. wait for a better number); (c) when a live-content desk should call a game (commit to a narrative) vs. keep watching.
- **Data:** historical streams of a win-probability-like martingale per game — NGS win probability, ESPN WP, or market-implied win prob from odds snapshots (e.g., The Odds API snapshots). Fit the separable form: estimate **σ(π)** empirically (e.g., kernel estimate of per-minute quadratic variation of Π as a function of its level) and take ρ(s) from the game clock / score-state structure, or fit ρ nonparametrically and define A(s) = ∫ρ².
- **Costs:** terminal loss g from the decision's payoff — squared error g(x) = x(1−x) for a probability call, cross-entropy if the downstream loss is log-loss, or a 0–1-style cost for a pick. Delay cost f(s): for betting, the expected line decay per minute (estimated from historical odds movement); for content, a fitted audience-decay curve.
- **Solver:** time-change to (X_t, c(t)), then solve the free-boundary problem numerically — either the HJB variational inequality (∂_t + ℒ)V = −c(t) with obstacle g, via finite differences on (t,x), or the integral equation (4.2) by fixed-point iteration on β. Recover b_T(t), map back to game time via Γ.
- **Serving:** offline-calibrated lookup — given current game time and win prob, output "act" vs. "wait" from the precomputed (1−b(t), b(t)) interval; the boundary is recomputed per sport/decision type, not in real time.
- **Effort estimate:** 1–2 weeks for a pilot (σ(π) estimation + PDE solver + one decision type on one season of WP data); the cost-calibration (delay cost) is the open research question, not the PDE.

## 12. Reproducible test
- **Dataset:** one season of per-minute win-probability streams (NGS WP or market-implied from odds snapshots) plus the corresponding closing lines / game outcomes.
- **Task:** the "act now vs. wait" decision for a single bet type (e.g., live moneyline). Implement the paper's policy: estimate σ(π), set g(x) = x(1−x), set f(s) to a constant calibrated from historical line movement, compute b(t), and act when Π exits (1−b(t), b(t)).
- **Baselines:** (a) act immediately at a fixed confidence threshold (e.g., |Π − 0.5| > 0.15); (b) always wait until a fixed game time; (c) random-timing placebo.
- **Metric:** realized Bayes risk = mean terminal loss + accumulated delay cost on a holdout season; also report ROI/CLV of the timed bets.

## 13. Acceptance / rejection gate
- **Adopt the timed-decision module** if, on a holdout season of live-bet backtests, the optimal-stopping policy achieves ≥ 10% lower realized Bayes risk than the best fixed-threshold baseline AND the estimated σ(π) is stable across seasons (per-decile quadratic-variation estimates within ±25% year over year).
- **Reject** if the σ(π) estimates are unstable, if the optimal policy collapses to "act immediately" or "always wait" for all realistic delay costs (the degenerate regimes the paper's Assumption A.(v) rules out by fiat), or if the Bayes-risk gain over fixed thresholds is < 5% — then the theory adds nothing over a tuned heuristic.

## 14. Improvement experiment
Replace the paper's assumed diffusion with a **data-driven martingale model with absorbing endpoints**: fit σ(π) from historical WP streams *and* add the exogenous termination the paper excludes — model the actual game end as an absorbing time ζ (score-differential / clock based) and solve the optimal-stopping problem with both voluntary stopping and absorption, i.e., the [20] formulation the authors leave for future work. Compare the pure-paper policy against the absorption-aware policy on the backtest: the hypothesis is that ignoring absorption makes the paper's policy wait too long late in games, and the absorption-aware boundary should dominate in the last quarter. This directly attacks the paper's stated limitation and is the experiment the authors themselves flag as the next step.

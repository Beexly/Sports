# [0393] The most exciting game (arXiv:2305.14037v2)

**Citation:** Julio Backhoff-Veraguas, Mathias Beiglböck (2023). *The most exciting game*. arXiv:2305.14037v2. URL: https://arxiv.org/abs/2305.14037v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 6212 lines).
**Verdict:** REJECT — a pure probability-theory paper with no data, no empirical validation, and no implementable NFL transfer; the max-entropy win-martingale is a mathematical idealization (continuous-time, continuous paths on [0,1]) with no calibration to real game dynamics, so it cannot ground any GSE live model.

## 1. Research question
Motivated by a problem posed by David Aldous: what is the "most exciting" sports game, formalized as the win-probability martingale that maximizes randomness? The authors consider M_t = P(home team eventually wins | information at time t) on a continuous idealized time interval [0,1], starting at x_0 ∈ (0,1) and terminating at 0 or 1, and seek the "most random" such martingale under a maximal-entropy criterion — made rigorous as minimizing Gantert's *specific relative entropy* h with respect to Wiener measure over continuous win-martingales. (Abstract, §1.1)

## 2. Dataset / schema
No dataset. This is a pure mathematics paper (stochastic analysis / martingale optimal transport). The only "empirical" content is qualitative: simulated sample paths of the Aldous martingale vs the Bass martingale X_t := Φ(B_t/√(1−t)) for a fair game (Figures 1–4), shown for illustration, not estimation or validation.

## 3. Method / model
- **Setup (§1–2):** ℳ^c_{x_0} = laws of continuous martingales on [0,1] with absolutely continuous quadratic variation starting at x_0; ℳ^c_{x_0,win} = win-martingales (terminate in {0,1}). Win-martingales model prediction markets (cf. Aldous [3]).
- **Entropy bridge (§2):** in discrete time, maximizing Shannon entropy H(ℚ) over martingale transport plans equals (up to additive constants) minimizing relative entropy w.r.t. the Gaussian random walk / discretized Wiener measure — the identity H(ℚ|γ_T) = −H(ℚ) + T/2 log(2πσ²) − ∫log f_0 dμ + (1/2σ²)(∫x_T² dν − ∫x_0² dμ), using the martingale property to telescope the increment term. This justifies defining the continuous-time max-entropy win-martingale as the minimizer of specific relative entropy (§3).
- **Specific relative entropy (§3):** Gantert's h as the scaled limit of relative entropies of time-discretizations; for regular ℚ, h(ℚ|𝕎^{x_0}) = ½E_ℚ[∫_0^1{Σ_t − log(Σ_t) − 1}dt] (Eq. 1.3), where Σ_t is the quadratic-variation density. The authors note the Aldous martingale is a counterexample to a conjecture in Gantert [20] about representing specific relative entropy.
- **Identification (§4):** a new first-order condition for continuous-time martingale transport problems plus a scaling argument identifies the candidate optimizer; **verification (§5):** proves it attains the infimum (uniqueness via Lemma 5.5).
- **Independently:** Guo, Possamaï & Reisinger [21] ("Randomness and early termination: what makes a game exciting?") solved the same PDE with different boundary conditions, via PDE techniques unrelated to specific entropy (note added in revision).

## 4. Equations & assumptions
- **Main result (Theorem 1.1):** the unique minimizer of inf{h(ℚ|𝕎^{x_0}) : ℚ ∈ ℳ^c_{x_0,win}} is given by the SDE dM_t = sin(πM_t)/(π√(1−t)) dB_t, M_0 = x_0 (Eq. 1.2).
- Specific relative entropy: h(ℚ|𝕎^{x_0}) = ½E_ℚ[∫_0^1{Σ_t − log(Σ_t) − 1}dt] (Eq. 1.3).
- Optimal value of (1.1): (x_0(1−x_0)−1)/2 − log(sin(πx_0)/π) (§5).
- First-order/verification condition (§5): optimality requires ∂_t v̄(t,M_t) + ½{Σ_t ∂²_xx v̄(t,M_t) + Σ_t − log Σ_t − 1} = 0, achieved only by the Aldous martingale (Lemma 5.5).
- Discrete-time max-entropy problem: max_{ℚ∈M_T(μ,ν)} H(ℚ), H(ℚ) = −∫q log q dx for ℚ = q·λ_{T+1} (Eq. 2.1).
Stated assumptions: martingales have continuous paths and absolutely continuous quadratic variation; terminal law is Bernoulli (win/lose — no draws, no margin); time idealized to the unit interval [0,1]; no jumps (rules out single-play game-ending events, which dominate NFL win-probability dynamics).

## 5. Features / target
Not applicable — no features, no prediction target. The "target" of the paper is the optimizer of (1.1): the law of the max-entropy win-martingale, characterized by the SDE above. (Stated for completeness per the template; this is a theorem, not an empirical model.)

## 6. Validation design
No validation design. The paper proves a theorem; there are no train/test splits, no baselines in the empirical sense, no metrics. The Bass martingale is shown alongside only as a qualitative visual comparison of sample-path behavior (Figures 2–4), not as a benchmarked competitor on data.

## 7. Numerical results / baselines
No numerical results. The quantitative outputs of the paper are: (a) the closed-form SDE (Eq. 1.2); (b) the closed-form optimal value (x_0(1−x_0)−1)/2 − log(sin(πx_0)/π). The figures are unlabeled simulated paths (no statistics computed from them). There is nothing to quote as an empirical finding — and the paper makes no empirical claims. (Distinguishing the paper's claims from interpretation: the paper claims only the mathematical characterization; any statement about real games being "most exciting" would be my extrapolation, and the paper does not test it.)

## 8. Code / data availability
None stated. No code, no data. (Aldous's original problem notes are linked as references [1][2]: stat.berkeley.edu/~aldous/Research/OP/.)

## 9. Leakage & limitations
- **No empirical content at all** — the single largest limitation for GSE purposes. Nothing is estimated from or tested against real game data.
- The continuous-path, continuous-time idealization is badly mismatched to NFL win probability, which moves in discrete jumps on discrete plays; the model also forces termination in {0,1} with no draws and no notion of margin/spread.
- The [0,1] time normalization erases clock structure (a 2-minute drill and garbage time are not the same "time").
- The entropy being maximized is relative to Brownian motion — a modeling choice (reference measure), not a discovered property of sports. A different reference would give a different "most exciting game."
- Even as a content/engagement concept ("quantifying game excitement"), the paper provides no computable excitement statistic for a *realized* game — only the law of the idealized process.
- Adversarial note: citing this as analytical backing for any GSE live model would be math-washing; the SDE's diffusion coefficient sin(πM_t)/(π√(1−t)) blows up in a specific way near t→1 that has no correspondence to how real win probability resolves.

## 10. GSE overlap
No overlap and no duplication — but also no complementarity. The map covers in-game NFL win probability empirically (iWinRNFL, 1704.00197) and conformal live-WP work (2208.08598); gap 7 (live spread/total surfaces) is an empirical-modeling gap. This paper's martingale-optimal-transport machinery is a different discipline (pure stochastics) that GSE's empirical pipeline does not use and does not need. It is not a duplicate of anything in the corpus; it is simply in a non-actionable lane.

## 11. GSE implementation spec
No implementation is recommended. For the record, the only conceivable (and rejected) transfer would be: use the Aldous SDE as a prior over live win-probability path dynamics in a Bayesian live model. This is rejected because (a) the continuous-path/no-jump assumption contradicts NFL play structure, (b) there is no empirical evidence the max-entropy martingale describes real WP evolution, and (c) calibrating its diffusion to data would just recover an empirical diffusion, discarding the theory. Estimated effort: zero — do not build.

## 12. Reproducible test
The reproducible check is mathematical, not empirical: simulate the SDE dM_t = sin(πM_t)/(π√(1−t)) dB_t (Euler–Maruyama, e.g., 10,000 paths from x_0 = 0.5) and verify (a) paths stay in (0,1) and terminate near {0,1} as t→1, (b) the martingale property E[M_t] = x_0 holds at several t, (c) the Monte Carlo estimate of ½E[∫_0^1{Σ_t − log Σ_t − 1}dt] matches the closed-form optimal value ((0.25−1)/2 − log(sin(π/2)/π) = −0.375 − log(1/π) ≈ 0.7696 at x_0 = 0.5). This verifies the theorem's statement computationally but tests nothing about real games. It is a correctness check on the paper, not a GSE evaluation.

## 13. Acceptance / rejection gate
REJECT — final. No empirical gate can rescue this for GSE: the paper contains no data, no fitted parameters, and no validated claims about real games. The standing rejection criterion is met (pure theory with no transfer path). Revisit only if a follow-up paper empirically calibrates max-entropy martingale dynamics to real in-game win-probability data and shows it beats empirical baselines — at which point treat it as a new paper.

## 14. Improvement experiment
If one wanted to make this line of work actionable (beyond the paper): formulate the max-entropy problem on a *discrete-play* filtration with play-level transition structure estimated from nflverse (a finite-state Markov game), and solve for the entropy-maximizing win-probability process *constrained to be consistent with observed play-by-play dynamics*. That would convert Aldous's question from an idealized diffusion into an empirically grounded "how exciting could this game have been" counterfactual — but it is a different paper, not an extension of this one's results, and its value to GSE would be content/engagement (an "excitement index" for X posts) rather than modeling.

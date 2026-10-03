# [1203] The Kelly growth optimal strategy with a stop-loss rule (arXiv:1311.2550v2)

**Citation:** Nielsen, M. (2013). *The Kelly growth optimal strategy with a stop-loss rule*. arXiv:1311.2550v2 [q-fin.PM]. URL: https://arxiv.org/abs/1311.2550
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 13 pp incl. appendices; numerical results Figs. 1–2 read as text).
**Verdict:** ADAPT — stop-loss-aware Kelly scaling (numerical PDE solution + closed-form asymptotics) directly ports to GSE bankroll management: scale stake size down as bankroll approaches a monthly stop-loss and as reset-time dynamics dictate; the derived strategy equation gives a principled alternative to ad-hoc stop-loss rules.

## 1. Research question
What is the Kelly growth-optimal dynamic stake/risk fraction when investment is subject to a periodically reset stop-loss rule (hit stop level πc → risk limit zero until next period reset), and can a nonlinear PDE for the optimal strategy itself (bypassing the value function) be derived and solved? (Secs. I–IV, VI)

## 2. Dataset / schema
No data — analytic/numerical finance. Benchmark scenario: Sharpe s = 1.0, monthly stop-reset period, VaR cap u ≤ 0.3.

## 3. Method / model
- Market: one risky asset GBM dS_t = S_t(μdt+σdW_t), risk-free rate r; fraction α in risky; discounted portfolio dπ_t/π_t = α[(μ−r)dt+σdW_t] (eqs. 1–5).
- Value function J(π,t) = max E[g(π_T)|π_t=π] with HJB (eqs. 7–8); control eliminated to HJB-alone (eq. 10): ∂t J = (μ−r)²(∂π J)²/(2σ²∂π² J).
- Main theoretical result (Sec. IV): eliminate J entirely — optimal strategy obeys its own nonlinear PDE (eq. 16):
  ∂t α = −(σ²/2)·α²·∂π(π²∂πα),
  i.e. in risk-dollar terms γ=πα (eq. 17): ∂t γ = −(σ²/2)·γ²·∂π²γ. Backward in time, nonlinear diffusion; independent of drift (drift enters via boundary conditions).
- Known solutions recovered: free Kelly αK = (μ−r)/σ² (eq. 23); power-utility α = αK/(1−η) (eq. 26); terminal-stop Kelly α(π) = αK(1−πc/π) = CPPI with Kelly multiplier (eq. 29); Grossman–Zhou drawdown Kelly α = αK(1−λm_t/π_t) (eq. 34); Browne probability-maximizing α(π,t) (eq. 37).
- Stop-loss solution (Sec. VI): boundary conditions α→αK (π→∞), α(πc,t)=0, α(π,T)=αK for π>πc (eqs. 38–40); scaled coords z=πc/π, θ=(T−t)/τ, τ=2σ²/(μ−r)², u=α/αK solving ∂θu = u²z²∂z²u (eq. B5) solved numerically (explicit Euler, stable for Δθ/(Δz)² < 0.5); long-horizon limit u(z,θ)→1−z.
- Multi-asset (Sec. VIA): restrict to multiples of the free-Kelly portfolio αK = C⁻¹(μ−r); optimal strategy = u(π,t)·αK with u from the scalar solution.

## 4. Equations & assumptions
- ∂t α = −(σ²/2) α² ∂π(π²∂πα) (eq. 16); ∂θu = u²z²∂z²u (eq. B5); α(π)=αK(1−πc/π) terminal-stop (eq. 29); α=αK(1−λm_t/π_t) drawdown (eq. 34); α(π,t)=u(π,t)αK multi-asset (eq. 49).
- Assumptions: GBM continuous-time market (no jumps — author flags Lévy reality as main limitation), no transaction costs/liquidity/slippage, smooth interior strategies, known μ,σ (Bayesian parameter uncertainty deferred — author explicitly recommends incorporating it).

## 5. Features / target
N/A analytic finance. Inputs: distance to stop z=πc/π, time to reset θ=(T−t)/τ, Sharpe s. Output: optimal Kelly-scaling factor u(z,θ)∈[0,1].

## 6. Validation design
Analytic recovery of five known solutions + numerical convergence (Euler stable); asymptotic limits match terminal-stop CPPI strategy.

## 7. Numerical results / baselines
- Fig. 1(b) (s=1.0, monthly reset): with stop 1%/5%/10%/20% below current value, u rises with time-to-reset; the 1%-below-stop curve stays near 0 for most of the month (deep "dead zone"), recovering only in final days.
- Fig. 2: convergence to 1−z asymptote as θ→∞.
- VaR cap example: 3% daily 95% VaR (≈30% annual vol) caps u ≤ 0.3 at s=1.0.

## 8. Code / data availability
No code shared. Explicit Euler on (B5) is a few lines; stability condition Δθ/(Δz)² < 0.5 stated.

## 9. Leakage & limitations
- Continuous-time GBM with no gap risk — author calls this the main limitation; stop-losses are not truly enforceable at πc under jumps.
- No transaction costs, no estimation: μ,σ assumed known; author flags Bayesian uncertainty as needed extension.
- Single-asset/multi-asset-via-Kelly-portfolio restriction; restricted problem, not full multi-dim optimization.

## 10. GSE overlap
- New to corpus: existing Kelly ledgers (0171 optimal strategies; 0626 Kelly under probability uncertainty; 0813 diversification/limited-information) contain no stop-loss-constrained Kelly and no time-to-reset stake scaling. The 0626 uncertainty angle complements this paper's flagged Bayesian extension.
- Bridges the portfolio-sizing lane to GSE bankroll rules (monthly stop-loss / unit drawdown caps).

## 11. GSE implementation spec
1. Define bankroll stop: monthly stop-loss δ (e.g. stop if bankroll < (1−δ)·month-start, mirroring Sec. II's hedge-fund setup).
2. Solve ∂θu = u²z²∂z²u numerically in (z,θ) with boundary conditions (41–43); or use the cheap long-horizon asymptote u ≈ 1−z (equivalently stake fraction = αK·(1−πc/π)).
3. Map to GSE units: Kelly stake × u(z,θ), where z = stop-level/current bankroll and θ = (days-to-month-reset)/τ, τ = 2/s² (s = engine's ex-ante edge Sharpe analogue).
4. Hard-cap u at the VaR-equivalent unit cap (mirroring u ≤ σmax/s).
5. Handle the dead zone: when u < threshold, freeze stakes (sit out) rather than drip micro-stakes — paper shows forced tiny risk near stop wastes opportunity.

## 12. Reproducible test
Backtest on 2024–2025 NFL: engine Kelly stakes vs stop-loss-scaled stakes (δ = 5%/10%/20%, monthly reset): report log-bankroll growth, max drawdown, and stop-hit frequency. Accept if stop-loss Kelly achieves ≥95% of free-Kelly log growth while cutting stop-hit frequency by ≥50% and never underperforming max drawdown of free Kelly.

## 13. Acceptance / rejection gate
ADAPT with the gate in §12. If the dead zone causes chronic under-staking in low-edge months, fall back to the asymptote u=1−z with a floor of 0 (sit-out rule) rather than the full PDE.

## 14. Improvement experiment
Discrete-time GSE variant: replace Brownian PDE with a per-slate dynamic program where stakes are chosen per game day, stop is evaluated at day boundaries (matching how a real stop-loss is enforced), and edge estimates come from the engine with Bayesian shrinkage — directly addressing the paper's two named limitations (no jumps, no parameter uncertainty).

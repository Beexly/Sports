# [1367] Kelly Criterion: From a Simple Random Walk to Lévy Processes (arXiv:2002.03448v1)

**Citation:** Lototsky, S. V., & Pollok, S. (2020). *Kelly Criterion: From a Simple Random Walk to Lévy Processes*. arXiv:2002.03448v1 [math.PR]. URL: https://arxiv.org/abs/2002.03448
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, complete incl. proofs, appendices, references).
**Verdict:** ADAPT — the general growth-rate function gr(f) = E[ln(1+fr)] for arbitrary return distributions plus the CLT refinement of finite-horizon wealth (Thm 2.1) gives GSE a rigorous Kelly extension for non-binary payoffs (derivative-like and multi-outcome markets), and the high-frequency limit formula f* = b/σ² + 1/2 (Thm 4.2, numerically verified) is directly usable for lognormal-payoff props.

## 1. Research question
Can the Kelly criterion be extended from simple Bernoulli bets to (1) general return distributions, (2) continuous-time compounding, and (3) high-frequency limits — specifically addressing Thorp's open questions about fat-tailed return distributions — while keeping the long-term growth-rate maximization rigorous? (Sec. 1)

## 2. Dataset / schema
No empirical data — analytical. Set-up: iid returns r_k with the same law as r; wealth W_n^f = ∏_{k=1..n}(1 + f·r_k), admissible f ∈ [0,1] (NS-NL: no short, no leverage); return process R_t in continuous time with Lévy–Itô decomposition (Sec. 3); high-frequency scaling r_{n,k} = μ/n + (σ/√n)·ξ_{n,k} (Sec. 4.1).

## 3. Method / model
- Long-term growth rate gr(f) = lim_{n→∞} (1/n)·ln(W_n^f/W_0) = E[ln(1 + f·r)] (eq. 2.5), justified by the strong law of large numbers (Prop 2.1).
- CLT refinement of the wealth asymptotics (Thm 2.1) giving finite-horizon Gaussian fluctuations around the growth rate.
- Concavity analysis of gr via its derivatives (Prop 2.2); boundary conditions for a unique interior maximizer (Prop 2.3).
- Continuous-time compounding via semimartingale return processes with jump measures; Lévy–Itô decomposition (Thm 3.1).
- High-frequency limit via Donsker-type convergence to geometric Brownian motion (Thm 4.1) and to the lognormal case (Thm 4.2).

## 4. Equations & assumptions
- **General growth rate:** gr(f) = E[ln(1 + f·r)] (eq. 2.5); wealth asymptotics W_n^f = exp(n·gr(f)·(1 + ε_n)), ε_n → 0 a.s. (Prop 2.1, eqs. 2.6–2.8).
- **CLT refinement:** W_n^f = exp(n·gr(f) + √n·σ_r(f)·ζ_n + ϵ_n) with σ_r(f) = (E[ln²(1+fr)] − gr²(f))^{1/2}, ζ_n standard Gaussian (Thm 2.1, eq. 2.10) — finite-horizon wealth confidence bands.
- **Concavity:** dgr/df = E[r/(1+fr)], d²gr/df² = −E[r²/(1+fr)²] < 0 (Prop 2.2, eq. 2.11); gr continuous on [0,1], unique maximizer f* ∈ [0,1] with gr(f*) ≥ 0 (Cor 2.1).
- **Interior-optimum conditions:** lim_{f→0+} E[r/(1+fr)] > 0 and lim_{f→1−} E[r/(1+fr)] < 0 ⇒ unique f* ∈ (0,1) (Prop 2.3, eqs. 2.12–2.13).
- **Continuous-time / Lévy:** long-term growth rate g_R(f) from eq. 3.26; unique optimal f* under the same boundary conditions (Thm 3.1).
- **High-frequency limit:** n bets per unit time with r_{n,k} = μ/n + (σ/√n)·ξ_{n,k} ⇒ wealth converges in law to W_t^f = exp((fμ − f²σ²/2)·t + fσ·B_t) (Thm 4.1, eq. 4.5).
- **Lognormal closed form:** for P_{t} = e^{bt+σB_t}, optimal f* = b/σ² + 1/2 (Thm 4.2, eq. 4.16); numerical check with σ = 1, n = 10: optimal f_{10}* "very close" to eq. 4.16 for all b ∈ (−1/2, 1/2).
- Admissibility conditions: P(r ≥ −1) = 1 (losses bounded by 100%, eq. 2.2); P(r>0)>0 and P(r<0)>0 (eq. 2.3); E|ln(1+r)| < ∞ (eq. 2.4); bounded ξ_{n,k} for the high-frequency regime (eq. 4.2).

## 5. Features / target
N/A (analytical). Inputs: return distribution of r (or its drift/volatility parameters). Targets: optimal fraction f*, long-term growth rate, finite-horizon wealth distribution.

## 6. Validation design
No train/test — proof-based. Numerical experiments only for the lognormal case (σ = 1, n = 10 bets per unit time) confirming eq. 4.16 approximates the discrete optimum well across b ∈ (−1/2, 1/2). No real-market or betting data.

## 7. Numerical results / baselines
- Thm 4.2 numerics: discrete-time optimal fractions at n = 10 match f* = b/σ² + 1/2 closely — the high-frequency formula is usable at realistic rebetting frequencies, not just asymptotically.
- No comparison vs other staking rules; the binary case (eq. 1.4) is recovered as a special case: f* = 2p − 1, max gr = p·ln(p/(1−p)) + (2−p)·ln(2−2p).

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Pure theory: no empirical validation on real returns or betting data; fat-tailed Lévy cases are derived but not simulated.
- The closed-form f* = b/σ² + 1/2 applies only to the lognormal/GBM case; general Lévy optimal fractions come from implicit first-order conditions, not formulas.
- Conditions (2.2)–(2.4) (bounded 100% loss, integrability) exclude some extreme heavy-tail models.
- Thm 4.1's T = +∞ version is explicitly flagged as unavailable — the high-frequency result is finite-horizon only.

## 10. GSE overlap
Complements, not duplicates: ledger 0813 handles simultaneous *binary* games exactly; ledger 1200 handles lognormal *asset* portfolios with the inclusion rule; ledger 1366 partitions the binary regime. None of them treats general non-binary return distributions (Thm 2.1's CLT wealth bands, Prop 2.3's interior conditions) or the high-frequency/continuous-time limits — this paper is the only corpus source for Kelly on derivative-like payoffs and for finite-horizon wealth confidence bands.

## 11. GSE implementation spec
1. **Non-binary payoff sizing (the adapt):** for props/derivatives with non-binary payouts (e.g. "player to score 2+ TDs" at +350 with graded payouts), estimate the return distribution r from the engine's outcome simulations and maximize gr(f) = E[ln(1+fr)] numerically (1-D concave problem — trivial to solve per pick); fall back to binary Kelly when the payout is binary.
2. **Finite-horizon wealth bands:** use Thm 2.1 with σ_r(f) estimated from simulation to publish a weekly bankroll confidence band on the posted card — replaces ad-hoc "expected profit" framing with rigorous P&L uncertainty.
3. **Lognormal shortcut:** for props whose payoff is approximately lognormal (parlay-style products), size with f* = b/σ² + 1/2 (eq. 4.16) where b, σ come from the engine's log-payoff moments.
4. Data: engine simulation outputs; compute in the sizing pipeline. Effort: medium — a return-distribution module feeding the existing optimizer.

## 12. Reproducible test
Dataset: GSE engine's 2024–2025 NFL picks with closing odds, restricted to non-binary-payoff props if any (else synthesize return distributions from the engine's simulation archive). Compare realized log-wealth growth of gr(f)-maximizing stakes vs binary-Kelly stakes on the same picks; and backtest the Thm 2.1 wealth bands: the realized weekly bankroll must stay inside the predicted ±2σ band in ≥ 90% of weeks. Backtest window: full 2024 + 2025 seasons.

## 13. Acceptance / rejection gate
ADOPT non-binary gr(f) sizing if it achieves ≥ the binary-Kelly log-wealth growth on non-binary props without breaching the wealth bands; REJECT the lognormal shortcut if eq. 4.16's implicit lognormality assumption produces stakes that violate the 1366 F* ceiling on more than 5% of picks.

## 14. Improvement experiment
Combine with ledger 1366: derive the multivariate zero-crossing surface for the gr(f⃗) system with correlated non-binary returns and test whether the Thm 2.1 CLT bands remain calibrated under outcome correlation; if miscalibrated, fit a correlation-adjusted σ_r(f⃗) from the engine's joint simulations and re-run the acceptance test.

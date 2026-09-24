# Deep-Research Ledger 1232 — arXiv:2607.09505v1 (q-fin.PM, 10 Jul 2026)

**Title:** Objective and subjective entropy measures of portfolio suboptimality
**Author:** Ati S. Sharma
**Version read:** v1 (10 Jul 2026). Full read verified on 2026-09-21: complete continuous-time theoretical note (Kelly condition, growth-gap identities, objective/subjective KL dualities). Text source: `2607.09505.pdf` → `pdftotext -layout` (1,829 words).

## 1. Question asked

Can the suboptimality of any portfolio relative to the growth-optimal (Kelly) portfolio be measured exactly — in both objective (true-measure) and subjective (investor-belief) terms — using entropy/KL quantities?

## 2. Dataset / schema

None. Pure continuous-time theory; no dataset, no empirical results, no code.

## 3. Method

1. **Kelly condition:** σ_tᵀπ_t⋆ = θ_t (portfolio's volatility-weighted weights match the market price of risk).
2. **Growth:** g_t⋆ = r_t + ½‖θ_t‖² for the growth-optimal portfolio.
3. **Growth gap:** g_t⋆ − g_t^π = ½‖θ_t − σ_tᵀπ_t‖² — the instantaneous growth shortfall of any portfolio π is half the squared tracking error to the Kelly portfolio in volatility units.
4. **Objective identity:** E_P[log(X_T^{π⋆}/X_T^π)] = D_KL(P‖P^π) — expected log-wealth ratio under the true measure equals the KL divergence between the true measure and the measure under which π is growth-optimal.
5. **Subjective identity:** E_{P^π}[log(X_T^π/X_T^{π⋆})] = D_KL(P^π‖P) — the mirror image under the investor's implied beliefs.

## 4. Equations / assumptions

- σ_tᵀπ_t⋆ = θ_t; g_t⋆ = r_t + ½‖θ_t‖².
- g_t⋆ − g_t^π = ½‖θ_t − σ_tᵀπ_t‖².
- E_P[log(X_T^{π⋆}/X_T^π)] = D_KL(P‖P^π); E_{P^π}[log(X_T^π/X_T^{π⋆})] = D_KL(P^π‖P).
- **Assumptions:** full-row-rank volatility σ_t; admissibility/integrability and Novikov conditions for the measure changes; unconstrained solution may use leverage/shorts.

## 5. Features / target

Features = market primitives (θ_t, σ_t, r_t) and a candidate portfolio π_t. Target = the exact growth shortfall vs Kelly, expressed as a KL divergence — a single number summarizing suboptimality.

## 6. Validation

None — analytic identities, no numerics. The identities are proved, not tested.

## 7. Exact results

- Growth gap identity: ½‖θ_t − σ_tᵀπ_t‖² (instantaneous).
- Objective KL identity and subjective KL identity as above.
- Conceptual result: every portfolio is growth-optimal under *some* belief P^π; its suboptimality under the true P is exactly D_KL(P‖P^π).

## 8. Code / data availability

None. Nothing to implement beyond the formulas.

## 9. Leakage / limitations

- No empirical content whatsoever (1,829 words of pure theory).
- Requires full-rank volatility and Novikov conditions — technical machinery with no sports-market counterpart stated.
- Unconstrained Kelly may demand leverage/shorts; no constraints handled.
- The identities are elegant but give no new *decision rule* — they re-describe known Kelly geometry in information-theoretic language.

## 10. GSE overlap

Conceptual foundation for the sizing lane's diagnostics:

- Wave-3: 1222/2109.10814 (fractional Kelly — the gap identity quantifies exactly what fraction α costs: g⋆ − g_α in closed form), 1223/2112.14451 (risk-controlled growth), 1224/2201.03387v2 (KL-regret language — same D_KL appears as cumulative estimation regret).
- `docs/research/2026-09-21/arxiv-deep/0171-optimal-sports-betting-strategies-in-practice.md` — the 10-strategy comparison could be re-scored by growth-gap: each strategy's distance from Kelly in ‖θ − σᵀπ‖² units.

## 11. Implementation spec (GSE)

**Kelly-gap diagnostics for staking strategies.** For each candidate staking rule (fixed fraction, quarter-Kelly, variance-budgeted, etc.):
1. Backtest to get realized per-pick returns; estimate the implied "market price of risk" θ̂ and the strategy's volatility loading σ̂ᵀπ per slate.
2. Compute the growth gap ½‖θ̂ − σ̂ᵀπ‖² per slate; average over the season.
3. Rank strategies by gap (smaller = closer to growth-optimal) *alongside* drawdown — the paper's identity separates "how far from Kelly" from "how risky," which raw P&L conflates.
4. Use as a diagnostic only, not a staking rule — the paper provides measurement, not a policy.

## 12. Reproducible test

In a simulated GBM market with known θ, σ: compute the growth gap for π = απ⋆ (α ∈ {0.25, 0.5, 1}) via ½‖θ − ασᵀπ⋆‖² and verify it matches the Monte Carlo estimate of E[log(X_T⋆/X_T^π)]/T (the objective KL identity) to within simulation error.

## 13. Numeric gate

Simulated GBM (θ = 0.4, σ = 0.2, T = 1, 100k paths): for α = 0.5, the analytic gap ½(1−α)²‖θ‖² must match the Monte Carlo mean log-wealth ratio within ±2 standard errors — verifying the identity numerically before trusting it as a diagnostic.

## 14. Improvement experiment

Apply §11 to GSE's staking-rule horse race (Neon `picks`, v5.2.7): rank quarter-Kelly, half-Kelly, variance-budgeted Kelly by (a) realized log-wealth and (b) Kelly-gap. Expectation: the rankings agree when estimation error is small and diverge when it is large — the divergence itself measures how much of a strategy's shortfall is *estimation* vs *structural*, which raw backtests cannot separate.

**Verdict:** ADAPT

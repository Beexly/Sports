# 1625 Optimal Betting: Beyond the Long-Term Growth (arXiv:2503.17927)

**Citation:** Authors as listed on arXiv (2025). *Optimal Betting: Beyond the Long-Term Growth*. arXiv:2503.17927. URL: https://arxiv.org/abs/2503.17927
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF).
**Verdict:** ADAPT — derives fractional Kelly systematically from the CLT asymptotic variance of log-growth, replacing the arbitrary "half Kelly" rule with a tunable growth-vs-volatility frontier; GSE should adopt the ridge objective for its default sizing.

## 1. Research question
Full Kelly maximizes asymptotic growth but with punishing variance; fractional Kelly is the standard fix but the fraction is usually chosen ad hoc. Can a principled fractional-Kelly rule be derived from the asymptotic distribution of the log-growth rate, trading growth against variance optimally?

## 2. Dataset / schema
No external dataset. Theory plus a fully worked Bernoulli example: p=.75 even-money bet, comparing full Kelly f*=.5 against fractional f=.25.

## 3. Method / model
Use the CLT for the log-growth rate: the per-bet log-growth g_r(f) has asymptotic variance υ_r(f). Define the asymptotic Sharpe ratio SR_r(f) = g_r(f)/√υ_r(f) and the ridge objective Ri_r(f,γ) = g_r(f) − γυ_r(f). For every γ>0 the ridge maximizer lies strictly below full Kelly; varying γ traces a growth-vs-volatility efficient frontier, so the "fraction" is no longer arbitrary but indexed by a risk-aversion parameter with a Sharpe interpretation.

## 4. Equations & assumptions
- Asymptotic Sharpe: SR_r(f) = g_r(f) / √υ_r(f).
- Ridge objective: Ri_r(f,γ) = g_r(f) − γυ_r(f); every γ>0 yields an optimizer below full Kelly.
- Bernoulli example (p=.75): full Kelly f*=.5 gives SR≈.27 and growth ≈.13; the fractional f=.25 gives SR≈.43 and growth ≈.10 — i.e. a 20%-ish growth sacrifice for a ~60% Sharpe improvement.
- Assumptions: i.i.d. bets; CLT applies to the log-growth rate (finite second moments); the asymptotic regime is a good approximation for GSE-scale bet counts.

## 5. Features / target
Input: bet return distribution (edge and variance), risk-aversion γ. Target: fractional-Kelly stake f maximizing Ri_r(f,γ). Not a prediction model.

## 6. Validation design
Analytical derivation plus the Bernoulli worked example comparing full vs fractional Kelly on growth and asymptotic Sharpe. No empirical backtest.

## 7. Numerical results / baselines
- p=.75 Bernoulli: full Kelly f*=.5 → growth ≈.13, SR≈.27; f=.25 → growth ≈.10, SR≈.43.
- Paper's claim: the ridge frontier dominates ad-hoc fractional rules — each γ maps to a (growth, Sharpe) pair, and the whole curve is attainable by construction.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Asymptotic (CLT) results may mislead at small bet counts where GSE operates week to week; the Bernoulli example is the friendliest possible case (known edge, symmetric). No guidance on choosing γ from data; assumes the edge estimate is correct — variance control does not fix a biased p. No correlated-bet treatment.

## 10. GSE overlap
Existing-research map (/home/hatch/workspace/arxiv-sweep/existing-research-map.md): Kelly sizing discussed 12 times in GSE research with zero prior reads — new capability. GSE has no Sharpe-indexed fractional sizing; this replaces the ad-hoc "half Kelly" default with a frontier.

## 11. GSE implementation spec
(1) For each posted pick, compute g(f) and υ(f) from the engine's calibrated p and market odds (closed form for binary bets); (2) add a user-facing "risk dial" γ with presets (conservative/moderate/aggressive) mapped to target asymptotic Sharpe values; (3) size stakes by maximizing Ri_r(f,γ); (4) log realized (growth, volatility) per γ preset for ongoing calibration. Effort: 1 day for the closed-form solver; 1 week for the dial + logging.

## 12. Reproducible test
Dataset: GSE 2025–2026 season picks. Test: replay sizing at γ ∈ {0 (full Kelly), 0.5, 1, 2} and fixed half-Kelly. Metrics: realized per-bet growth, realized Sharpe, max drawdown. Baseline to beat: half-Kelly — the γ=1 ridge must match or beat half-Kelly's Sharpe with no worse growth.

## 13. Acceptance / rejection gate
ADOPT if some γ>0 on the 2025–2026 replay achieves realized Sharpe ≥ half-Kelly's with realized growth within 5% of half-Kelly's; otherwise REJECT.

## 14. Improvement experiment
Estimate γ adaptively: refit γ each week to maximize trailing-8-week realized Sharpe, and test whether the adaptive-γ schedule beats the best fixed γ — if edge estimates are miscalibrated in regimes, the adaptive dial should automatically de-risk.

# [1366] The Kelly Criterion And Utility Function Optimisation For Stochastic Binary Games: Submartingale And Supermartingale Regimes (arXiv:2502.16859v1)

**Citation:** Miller, S. D. (2025). *The Kelly Criterion And Utility Function Optimisation For Stochastic Binary Games: Submartingale And Supermartingale Regimes*. arXiv:2502.16859v1 [math.PR]. URL: https://arxiv.org/abs/2502.16859
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 26 pages incl. Appendix A and references, complete).
**Verdict:** ADAPT — the formal F* zero-crossing boundary (bets above F* are supermartingale, i.e. wealth *decays* on average) is a hard sizing ceiling GSE's current Kelly protocol does not compute, and the growth/entropy identity U(FK,p) = log(2) − H(p,q) gives an information-theoretic edge metric; the paper's binary 1:1-payoff setting must be re-derived with odds before use on sports bets.

## 1. Research question
Can the Kelly criterion for a generic stochastic Markovian-Bernoulli binary game be reformulated through a utility function U(F,p) whose sign partitions the bet-fraction domain into growth (submartingale) and decay (supermartingale) regimes, with explicit variance/volatility estimates and a principled fractional-Kelly treatment? (Sec. 1; author describes the paper as "autodidactic" — a reformulation with new formal proofs of the regime partition.)

## 2. Dataset / schema
No empirical data — analytical. Set-up: N Bernoulli trials, outcomes Z(I) ∈ {−1,+1} with P(win) = p, P(loss) = q = 1−p; bet fraction F of current wealth W(I−1); wealth process W(N) = W(0)·∏_{I=1..N}(1+F·Z(I)). Double-or-nothing payoff (win returns stake plus equal win).

## 3. Method / model
- Utility function U(F,p) = E[log(W(N)/W(0))^{1/N}] = p·log(1+F) + q·log(1−F) (eq. 3.17 / 4.3); Kelly fraction maximizes U over F ∈ [0,1].
- Sign analysis of U via the zero-crossing F* defined by U(F*,p) = 0 (eq. 3.24–3.25), solved numerically.
- Jensen's inequality applied to E[W(N+1)|F_N] to prove the martingale-regime partition (Thm 4.1).
- Doob's maximal inequality and Doob decomposition applied in the submartingale regime (Lemma 4.7, Prop 4.11).
- First-order variance expansion via moment generating functions of the binomial (Sec. 5, Appendix A).

## 4. Equations & assumptions
- **Kelly fraction:** F_K = |p − q| = 2p − 1 (Thm 3.4, eqs. 3.18–3.21; second derivative strictly negative ⇒ maximum).
- **Growth–entropy identity:** U(F_K, p) = log(2) − H(p,q) = log 2 + p·log p + q·log q (Lemma 3.5, eq. 3.22) — max growth rate equals the Shannon entropy deficit.
- **Regime partition:** [0,1] = [0,F_K] ∪ (F_K,F*] ∪ {F*} ∪ (F*,1] with U > 0 on [0,F*), U(F*,p) = 0, U < 0 on (F*,1] (Prop 3.9, eq. 3.26); U → −∞ as F → 1 (Cor 3.8).
- **Thm 4.1 (martingale regimes):** for p > 1/2, W(N) is a *submartingale* on (0,F*) (E[W(N+1)|F_N] ≥ W(N)), a *supermartingale* on (F*,1] (wealth decays on average), and a martingale at F = F*.
- **Doob maximal inequality:** P(max_{K≤N} W(K) ≥ λ) ≤ E[W(N)]/λ (Lemma 4.7) — a drawdown/run-up tail bound usable as a bankroll risk cap.
- **Variance:** VAR(W(N)) ≈ 2·|W(0)|²·N·p(1−p)·F² (Prop 5.2, eq. 5.14); at Kelly: VAR ≈ 2·|W(0)|²·N·p(1−p)·(2p−1)² (Cor 5.3, eq. 5.15); linear approximation VAR ≈ 2·|W(0)|²·N·p(1−p) (eq. 5.17).
- **Fractional Kelly (Prop 6.1):** F̄_K = f·F_K for f ∈ [1/2,1); example p = 0.52 → F_K = 0.04, (2/3)F_K = 2/75 ≈ 0.0267; Figs. 5–6 show growth drops but volatility drops faster.
- Assumptions: 1:1 payoff (not odds-adjusted); iid Bernoulli trials, no memory; F fixed across trials; p known exactly; variance estimates drop all terms above quadratic (valid only for small edges p ≈ 0.51–0.52).

## 5. Features / target
N/A (analytical). Inputs: edge p − q > 0, bet fraction F. Targets: optimal fraction F_K, zero-crossing F*, regime classification, variance/volatility of wealth.

## 6. Validation design
No train/test — proof-based. Consistency checks: the author plots E[W(N)] and σ(W(N)) vs N for p = 0.52 (Figs. 5–6) comparing full vs (2/3) fractional Kelly; Appendix A verifies variance formulas via binomial MGFs. No empirical or simulated betting backtest beyond these plots.

## 7. Numerical results / baselines
- p = 0.52, W(0) = 1000: full Kelly F_K = 0.04 yields faster E[W(N)] growth than (2/3)F_K but markedly higher volatility (Figs. 5–6).
- U(F_K, p) = 0 at p = 1/2 (Cor 3.6) — no growth without edge, as expected.
- No baselines vs other staking plans beyond noting Thorp-style results by reference.

## 8. Code / data availability
None (analytical paper).

## 9. Leakage & limitations
- **Double-or-nothing only:** all formulas assume 1:1 payoff; sports decimal-odds Kelly has a different F_K and a different F* — must be re-derived (the *method* transfers, the numbers don't).
- Author flags the work as "autodidactic": Thm 3.4 and the entropy identity are reformulations of known results; the genuinely new formal material is the regime partition (Thm 4.1) and the Doob/variance machinery.
- Thm 4.1 part (3) is mislabeled in the text (states "F ∈ (F*,1)" where F = F* is clearly meant); read as martingale at the boundary point F*.
- Variance results (eq. 5.14) are first-order approximations valid only for small edges; higher-order terms are explicitly dropped.
- Assumes known p — estimation error (the dominant GSE issue) is not treated.

## 10. GSE overlap
Complements, not duplicates: ledger 0813 gives exact simultaneous-binary Kelly fractions; ledger 0171 covers practical fractional-Kelly protocols on real data; ledger 1200 adds the inclusion/elimination rule. None of them computes the F* zero-crossing boundary or frames overbetting as a provable supermartingale regime, and none gives the Doob maximal-inequality drawdown bound or the entropy-deficit growth identity.

## 11. GSE implementation spec
1. **F* hard ceiling (the adapt):** for each pick, generalize eq. 3.25 to decimal odds o (solve p·log(1+(o−1)F) + q·log(1−F) = 0 numerically) and store F*_i in the sizing module; enforce posted fraction ≤ F*_i as an invariant — any stake above F* is provably wealth-decaying (supermartingale), which is a stronger statement than "above Kelly is suboptimal." Log a violation alert if the engine ever recommends F > F*.
2. **Entropy-gap edge metric:** compute g_i = log(2) − H(p_i,q_i) (binary, 1:1-normalized) per pick; rank same-Kelly-fraction picks by g_i — higher entropy deficit means more of the growth comes from genuine information rather than odds structure. Experiment with g_i as a tiebreaker in the 1200 inclusion rule.
3. **Doob drawdown cap:** use Lemma 4.7 with λ = bankroll target (e.g. 2× starting) to bound run-up probabilities, and inverted for drawdown alarms: flag any day where the implied probability of a 30% drawdown under current stakes exceeds the gate threshold.
4. Data: engine probabilities + odds API lines; compute in the existing picks pipeline. Effort: small — a numerics module on the sizing step.

## 12. Reproducible test
Dataset: GSE engine's 2024–2025 NFL picks (picks table, SPREAD/MONEYLINE/TOTAL) with closing odds. For each pick compute decimal-odds F*_i; verify (a) the current fractional-Kelly stakes never exceed F*_i (invariant check — any violation is a bug), and (b) simulate realized wealth paths under stakes {full Kelly, 1/2 Kelly, current protocol} and confirm the Doob bound P(max W ≥ λ) ≤ E[W(N)]/λ is never violated empirically. Backtest window: full 2024 + 2025 seasons.

## 13. Acceptance / rejection gate
ADOPT the F* ceiling if the invariant holds on 100% of historical picks and the backtest shows zero Doob-bound violations; REJECT the entropy-gap tiebreaker if it does not improve realized log-wealth growth vs the 1200 inclusion rule alone on the same window.

## 14. Improvement experiment
Extend the analysis to *simultaneous* binary games: derive the multivariate zero-crossing surface U(F⃗,p⃗) = 0 for the 0813 multi-pick Kelly system and test whether the current multi-pick stakes ever cross into the joint supermartingale region; if they do, the 1200 elimination loop should be re-run with the F*-ceiling as an additional constraint.

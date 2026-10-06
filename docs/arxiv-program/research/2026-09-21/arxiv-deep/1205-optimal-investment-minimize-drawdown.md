# [1205] Optimal Investment to Minimize the Probability of Drawdown (arXiv:1506.00166v2)

**Citation:** Angoshtari, B., Bayraktar, E., & Young, V. R. (2015). *Optimal Investment to Minimize the Probability of Drawdown*. arXiv:1506.00166v2 [q-fin.MF]. URL: https://arxiv.org/abs/1506.00166
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org; Secs. 1–4 complete incl. all theorems/proofs; reference list partially capped at output limit, all core results read).
**Verdict:** ADAPT — the closed-form drawdown-minimizing stake rule π*(w) = 2(c(w)−rw)/(μ−r), provably identical to the ruin-minimizing rule and universal over a class of min/max objectives, ports to GSE as a principled "risk budget ∝ distance-to-stop" staking rule that complements (but is objective-distinct from) ledger 1203's growth-optimal stop-loss Kelly.

## 1. Research question
In a Black-Scholes market with a deterministic payout rate c(W_t) (endowment-fund model), what investment strategy minimizes the probability that wealth ever falls to a fixed fraction α of its running maximum, and what is that minimum probability? (Sec. 1–2)

## 2. Dataset / schema
None — stochastic optimal control. One worked example: c(w) = rw + b(w_s−w)² payout tangent case (Example 4.1).

## 3. Method / model
- Market: riskless rate r, risky GBM (μ,σ); wealth dW_t = [rW_t+(μ−r)π_t−c(W_t)]dt + σπ_t dB_t (eq. 2.1); payout c(w) continuous, non-decreasing, with unique "safe level" w_s where rw=c(w) (Assumption 2.1); drawdown time τ_α = inf{t: W_t ≤ αM_t}, M_t = running max.
- Verification lemma (Lemma 3.1): six conditions on a candidate h(w,m) (C² non-increasing convex in w; h_m(m,m)≥0; h(αm,m)=1; h(w_s,m)=0; L_β h ≥ 0 ∀β) imply h ≤ φ; equality version (Cor. 3.2) identifies φ.
- Central result (Prop. 2.1, Thm. 3.1): when m ≥ w_s, drawdown ≡ ruin at fixed level αm; Bäuerle–Bayraktar (2014) optimizer gives π*(w) = 2(c(w)−rw)/(μ−r) (eq. 2.3/3.8) — amount (not fraction) invested in risky asset, independent of m and α.
- Main theorem (Thm. 3.1): the SAME strategy minimizes drawdown probability when m < w_s, i.e. with a moving (non-decreasing) ruin level αM_t. Closed-form minimum probability φ(w,m) = 1 − g(w,m)/g(w_s,m) for m ≥ w_s, and φ = 1 − k(m)g(w,m)/g(w_s,w_s) for m < w_s (eq. 3.6), with scale function g (eq. 2.6) and k (eq. 3.7).
- Universality (Remark 3.2): same strategy minimizes E[f(min, max)] for ANY f non-increasing in the minimum and non-decreasing in the maximum — the objective shape only changes boundary conditions.
- Behavior (Sec. 4, Props. 4.1–4.3): under mild conditions the safe level w_s is never reached (Feller explosion test, v(w_s^−,m)=∞); if c(w)−rw stays bounded away from 0 (w_s=∞), drawdown probability is identically 1.

## 4. Equations & assumptions
- Optimal strategy: π*(w) = 2(c(w)−rw)/(μ−r) (eqs. 2.3, 3.8); controlled wealth dW_t = (c(W_t)−rW_t)dt + (2σ/(μ−r))dB_t (eq. 2.4).
- Min drawdown prob: φ(w,m) = 1 − g(w,m)/g(w_s,m) (eq. 2.5/3.6); δ = ½((μ−r)/σ)².
- Assumptions: Black-Scholes GBM, continuous payout function, admissible strategies (integrability), infinite horizon; finite-horizon variants (Angoshtari et al. 2016) can behave differently — the infinite-horizon assumption is load-bearing for the "allow maximum to increase" result.

## 5. Features / target
N/A analytic. Inputs: current wealth w, running max m, payout c, drawdown fraction α. Output: optimal dollar risk π*(w) and minimum drawdown probability φ(w,m).

## 6. Validation design
Proof-based: verification lemma + explicit boundary-value solution (Prop. 3.3); Feller test for reachability; comparison principle (Lemma 4.2).

## 7. Numerical results / baselines
No numbers — theorem paper. Qualitative: optimal risky amount shrinks linearly to zero as wealth approaches the safe level; the never-reaching-safe-level result (Prop. 4.1, Example 4.1).

## 8. Code / data availability
None.

## 9. Leakage & limitations
- No data, no estimation; GBM assumption; infinite horizon; the universality (Remark 3.2) holds only for objectives monotone in (min, max) as stated.
- The "safe level never reached" result is specific to payout structures with rw=c(w) crossings — its direct GSE analogue needs a "safe bankroll" definition.
- Finite-horizon (a betting season is finite!) can differ qualitatively — the author flags this as the case where keeping the maximum constant can be optimal instead.

## 10. GSE overlap
- Complements, not duplicates, ledger 1203 (Nielsen stop-loss Kelly): 1203 maximizes growth under a periodic stop-loss; this minimizes P(drawdown) outright with a closed-form rule. Different objectives, both sizing-lane. Existing Kelly ledgers (0171/0626/0813) cover neither drawdown-probability minimization nor the universality result.
- Fills a genuine gap: GSE has no drawdown-probability-based stake rule.

## 11. GSE implementation spec
1. Define bankroll analogues: running-max bankroll M_t, stop fraction α (e.g. drawdown declared at α=0.8 of max), "payout" c(w) as the per-slate unit-withdrawal/target-profit function; safe level w_s where risk-free growth covers c.
2. Risk budget per slate: risk-dollar amount R(w) = 2·(c(w)−r·w)/(μ−r), mapping (μ−r)/σ to the engine's per-slate edge/volatility; as bankroll w approaches safe level w_s, R→0 (auto-derisk).
3. Split R across the slate's approved edges proportionally to edge/vol² (mirroring the drift/vol² maximization of Pestien–Sudderth/Bäuerle–Bayraktar, cited as the engine behind the result).
4. Use φ(w,m) (eq. 3.6) as a monitored risk metric: report the bankroll's implied drawdown probability each slate alongside the stop-loss-scaled Kelly of 1203.
5. Finite-horizon guard: since a season is finite, A/B the infinite-horizon rule against a freeze-maximum variant near season end (per the author's finite-horizon warning).

## 12. Reproducible test
Backtest 2024–2025 NFL: engine stakes vs π*-budgeted stakes (α=0.8, c(w)=κw proportional withdrawal): measure empirical drawdown frequency below αM_t and log growth. Accept if drawdown frequency falls by ≥40% with ≤10% log-growth cost vs baseline Kelly; monitor that the implied φ tracks realized drawdown frequency within calibration tolerance.

## 13. Acceptance / rejection gate
ADAPT with the gate in §12. If the κw-proportional payout analogue makes R(w) too conservative in high-edge slates, relax c(w) to a step function of distance-to-stop rather than proportional.

## 14. Improvement experiment
Seasonal finite-horizon dynamic program (the author's own open direction): per-slate choice of R with season-end boundary, solved by backward induction on (w, m, t), estimating φ empirically from backtest path ensembles — turning the infinite-horizon theorem into a finite-season GSE stake controller.

# [0231] Beating the average: how to generate profit by exploiting the inefficiencies of soccer betting (arXiv:2303.16648v1)

**Citation:** Stömmer, R. (2023). *Beating the average: how to generate profit by exploiting the inefficiencies of soccer betting*. arXiv:2303.16648v1. URL: https://arxiv.org/abs/2303.16648
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1,177 lines).
**Verdict:** ADAPT — the safety-level coverage math (how many portfolio entries needed to guarantee ≥x correct at confidence Q) is a transferable portfolio-construction tool for GSE's parlay/pool offerings; the German lottery venue itself is non-transferable.

## 1. Research question
Is the German state-run soccer betting lottery TOTO 13er Wette (pick win/draw/loss on 13 matches, payouts for ≥10 correct) inefficient — i.e., can a gambler systematically earn positive expected profit by (a) raising the per-match hit rate above 1/3 via simple rules (e.g., "home win") and (b) computing exactly how many tips to file to guarantee a minimum number of strikes at a chosen safety level?

## 2. Dataset / schema
- Expected-return column: average weekly returns over the past 1.5 years of the TOTO 13er Wette (actual weekly lottery payouts by strike tier: 10/11/12/13 strikes).
- Hit-rate evidence: Bundesliga 2021/22 season (306 matches) for "better team wins" (50.98%); Bundesliga 1963/64–2021/22 for home win (50.36%); Spann & Skiera (2009) for prediction-market (52.69%) and betting-odds (52.93%) hit rates; tipster advice ~43% (Forrest & Simmons 2000; Spann & Skiera 2009).
- Lottery structure: 13 matches per tip, 3 outcomes each, fee €0.50/tip + €0.50/voucher (12 tips per voucher), payouts only at 10+ strikes.
- No proprietary or hidden dataset — all parameters are public lottery mechanics plus published hit-rate literature.

## 3. Method / model
- Binomial model for strikes per tip: P(x) = C(y,x) p^x (1−p)^{y−x}, y = 13.
- Urn model: each tip = a colored ball; Mx = number of combinations with x strikes in N total (N = (1/p)^13 under the "reduced" hit-rate combinatorics — the author's construction: prior knowledge reduces the effective combination space).
- Hypergeometric distribution Q(kx in n) for drawing exactly kx combinations with x strikes in n tips; multivariate hypergeometric for joint (k10,k11,k12,k13).
- Key derived approximation: Q(kx = 1 or more in n) = 1 − (1 − ΣxMx/N)^n, solved for n: n = N[1 − (1−Q)^{1/ΣxMx}], valid under constraint ΣxMx ≪ (N − n). Proven in appendix via factorial-limit identity (A→∞ approximation).
- Closed form for the 13-strike case: n = N·Q(k13 = 1 in n).
- Hit-rate ladder: random guess 33.33% → tipster ~43% → "better team wins" 50.98% → home win ~50.4% → prediction markets/betting odds 52–57%.
- Expected profit = expected return − total fees, tabulated per strike tier and safety level Q ∈ {90%, 99%, 99.9%, 99.99%}.

## 4. Equations & assumptions
Actual equations from the paper (faithfully transcribed):
- Binomial: P(x) = (y choose x) p^x (1−p)^{y−x} (eq 1).
- Combination identity: Σ_{x=0}^{13} Mx = N (eq 2); Mx/N = P(x) (eq 5).
- Hypergeometric: Q(kx in n) = [C(Mx, kx) · C(N−Mx, n−kx)] / C(N, n) (eq 3).
- Multivariate hypergeometric for (k10…k13): Q = [C(M10,k10)C(M11,k11)C(M12,k12)C(M13,k13)C(N−ΣM, n−Σk)] / C(N,n) (eq 7).
- 13-strike closed form: Q(k13=1 in n) = n/N → n = N·Q (eqs 8–9).
- "No combination" probability: Q(kx=0 in n) = C(N−ΣxMx, n)/C(N, n) (eq 11); identity C(N−ΣMx,n)/C(N,n) = C(ΣMx, N−n)/C(ΣMx, N) (eq 12, proved in appendix).
- Approximation under ΣxMx ≪ (N−n): Q(kx=0 in n) ≈ (1 − ΣxMx/N)^n (eq 13); reverse probability Q(kx≥1 in n) = 1 − (1 − ΣxMx/N)^n (eq 14); solved: n = N[1 − (1−Q)^{1/ΣxMx}] (eq 15).
- Sequential-bet math: P(4×fail) = U^4 = 0.01% at U=10% (eq 17); P(≥1 success) = 1 − U^4 = 99.99% (eq 18).
- Expected profit: expected profit = expected return − total fees (eq 16).
Stated assumptions: independence of match outcomes across the 13 matches (binomial); the hit-rate p applies uniformly to all 13 matches; expected returns are averages over 1.5 years (variance acknowledged but not modeled — "Sharpe ratio" discussion deferred); the approximation's validity constraint ΣxMx ≪ (N−n) explicitly stated.

## 5. Features / target
Not an ML paper — no features. The "input" is the per-match hit rate p (treated as a parameter to improve: random 1/3 → home-win 1/2); the target is expected profit by strike tier and safety level. "Prediction horizon": one lottery round (weekly).

## 6. Validation design
- Analytic/expectation-based, not backtested on held-out data. Validation = internal consistency of the combinatorics + sensitivity of expected profit across hit rates (43%, 47%, 50%) and safety levels (90% → 99.99%).
- Expected returns are 1.5-year empirical averages; no train/test split, no out-of-sample profit verification; no actual betting record presented.
- Transaction/regulatory constraints layered on afterward (online monthly limits ~€1,000 in most German states; only Nordrhein-Westfalen allows CSV upload, max 1,250 tips/file).

## 7. Numerical results / baselines
Table 1 (p = 1/3): M10 = 2,288 combos, P(10) = 1/697, expected return €49; M11 = 312, P(11) = 1/5,110, expected return €434; M12 = 26, P(12) = 1/61,320, expected return €6,449; M13 = 1, P(13) = 1/1,594,323, expected return €107,813. N = 1,594,323 combos; fee for full coverage €863,592 ≫ €107,813 return.
Table 2 (tips n needed at p = 1/3): for ≥10 strikes: n = 1,397 (Q=90%), 2,793 (99%), 4,187 (99.9%), 5,580 (99.99%); for 13 strikes: n = 1,434,891 / 1,578,380 / 1,592,729 / 1,594,164.
Table 4 (tips n needed at p = 1/2, N = 8,192): ≥10 strikes: 50 / 100 / 149 / 198; ≥11: 203 / 400 / 593 / 781; ≥12: 1,243 / 2,297 / 3,191 / 3,949; 13: 7,373 / 8,110 / 8,184 / 8,191.
Table 5c (p = 50%, expected profits): ≥11 strikes: €324 (Q=90%) down to €10 (Q=99.99%); ≥12 strikes: €5,775 down to €4,309; 13 strikes: €103,819 down to €103,376. ≥10 strikes unprofitable except at Q=90% (€21).
Table 5a (p = 43% tipsters): negative business case at all Q ≥ 99% except 13 strikes (huge fees); Table 5b (p = 47%): positive at Q ≥ 99% for 12/13 strikes.
Regulatory cut (Table 6): under €1,000/month online limits, only ≥11 strikes at Q ≥ 99% remains (€217–€10 profit) plus the Q=90% ≥12-strike option (€5,775, U = 10%).
Sequential strategy: 4 sequential 90%-safety bets → P(≥1 success) = 99.99%, worst-case spend 4 × €674 = €2,696 for expected €6,449 return = €3,753 expected profit over 3–4 months.
Interpretation note: all "profits" are expectations vs. 1.5-year-average returns with no variance accounting and no live betting record.

## 8. Code / data availability
None stated (no code link; the CSV-upload format is on westlotto.de's FAQ page).

## 9. Leakage & limitations
- No out-of-sample or live validation — the "consistent profits" claim is an expectation calculation, not an observed P&L. Expected returns are backward averages of a lottery pool; actual weekly pools vary (author acknowledges variance but doesn't quantify it).
- The N = (1/p)^13 combinatorics for p > 1/3 is a modeling construct ("maximum nescience" reduction), not a literal sample space — it's a heuristic for coverage sizing, and its mapping to real tip-generation (avoiding doubles, matching the 50% home-win mix) is hand-waved.
- Independence assumption across the 13 matches is false in practice (the 13 matches are not independent draws; also the listed matches skew Bundesliga).
- p = 1/2 "home win" is applied uniformly, but the actual listed 13 matches include 2. Bundesliga and foreign leagues where the base rate differs; and the lottery agency's own "tendency" probabilities are ignored.
- Barriers (manual/paper filing, €1,000/month limits, single-state CSV upload) make the high-profit cells nearly inaccessible — the paper admits this.
- External validity to GSE: the TOTO lottery has no US analog; but the *portfolio coverage math* (eq 15) generalizes to any "need ≥k of m correct" contest structure (e.g., pick'em pools, parlay ladders, survivor pools).

## 10. GSE overlap
Per existing-research-map.md: GSE's corpus covers bet sizing (Kelly mentioned 12×, no paper read), Wang Transform (oracle3), prediction-market tooling (Polymarket/Kalshi), and the gap list explicitly names "Kelly criterion / optimal bet sizing under uncertainty — mentioned 12×, zero papers read" as gap #1. Nothing covers *coverage/portfolio sizing for multi-leg contests* — no pick'em-pool or parlay-portfolio sizing math exists in the repo. Market microstructure (1211.4000, PLOS ONE 2023) is adjacent but not this. This is a **new capability**: exact coverage-sizing formulas for "≥x of y correct" contest portfolios.

## 11. GSE implementation spec
- Port eq 15 (n = N[1 − (1−Q)^{1/ΣMx}]) to GSE contest products: survivor pools (need all correct), pick'em pools, and correlated parlay portfolios where GSE publishes multiple picks. Inputs: per-pick hit rate p (from GSE engine backtests, not 1/2), pool payout structure, entry fees.
- Build a "coverage calculator" module in the engine: given m published picks with per-pick hit rates p_i, payout tiers, entry cost, and desired safety Q, output the number of portfolio entries and their construction (generate entry combinations avoiding doubles, weighted by the engine's probabilities).
- Adaptation required: the paper's uniform-p assumption must be replaced with heterogeneous p_i from GSE's calibrated probabilities; replace the closed-form binomial with a Poisson-binomial for ΣMx; keep the hypergeometric coverage logic intact.
- Effort: 1–2 engineer-weeks (pure math + a small CLI/library; no model training).

## 12. Reproducible test
Dataset: GSE engine's published pick history (backtested spread/total/prop picks with recorded hit rates). Construct a synthetic "13-pick card" from 13 historical weeks of engine picks with known per-pick hit rate p̂; compute the eq-15 coverage number n at Q = 99% for ≥10 of 13 correct; simulate 10,000 draws from the engine's calibrated per-pick probabilities; verify the empirical coverage frequency matches Q within ±1 percentage point. Baseline: naive n from the uniform-p table (the paper's Table 2/4 values).

## 13. Acceptance / rejection gate
Adopt the coverage calculator if, on the 10,000-draw simulation using GSE's calibrated per-pick probabilities (Poisson-binomial adaptation), empirical coverage at the computed n matches the target Q within ±1 pp across Q ∈ {90%, 99%, 99.9%} AND the expected-profit sign (profit − fees) matches the formula's prediction on historical pick'em/pick-card data. Reject if heterogeneity in p_i breaks the approximation beyond ±3 pp, or if GSE has no contest product to apply it to.

## 14. Improvement experiment
Beyond the paper: (a) generalize eq 15 to heterogeneous p_i via the Poisson-binomial and derive the coverage formula with per-pick weights — the paper's uniform-p is its weakest assumption and the natural GSE edge; (b) add a variance-aware gate: compute the Sharpe ratio of the coverage strategy over the 1.5-year return distribution instead of expected profit alone (the paper defers this — do it); (c) correlate the coverage sizing with CLV: size entries not just to coverage Q but to expected closing-line value of each pick, so the portfolio maximizes E[profit] subject to the coverage constraint — a constrained-optimization layer the paper never attempts.

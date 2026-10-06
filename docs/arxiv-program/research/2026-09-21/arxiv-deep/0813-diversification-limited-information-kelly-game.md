# [0813] Diversification and limited information in the Kelly game (arXiv:0803.1364)

**Citation:** Matúš Medo, Yury M. Pis'mak, Yi-Cheng Zhang (2008). *Diversification and limited information in the Kelly game*. arXiv:0803.1364. URL: https://arxiv.org/abs/0803.1364
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache; LateXML conversion).
**Verdict:** ADAPT — the paper gives exact/approximate Kelly fractions for M simultaneous games (Eq. 10–11), the outsider-vs-insider diversification threshold Δ(p,M) = (p−1/2)(√(2M)−1), and the finite-memory penalty G(p,L) ≈ G_K(p) − 1/(2L) with the devastating L≥1761 requirement for p=0.51; all three are directly portable to GSE's multi-pick Kelly sizing, but the binary ±1 payoff structure must be generalized to decimal odds before any use.

## 1. Research question
How do diversification (betting M simultaneous games instead of one) and limited information (win probability p unknown, inferred from the last L outcomes) change Kelly-optimal sizing? Three sub-questions: (1) optimal fractions for M simultaneous binary games; (2) when does a diversified "outsider" who knows only the average p beat an "insider" with exact per-game information; (3) what is the exact optimal fraction and growth rate when p must be estimated from a finite memory window of L past outcomes?

## 2. Dataset / schema
No empirical data — pure theory with numerical verification (Mathematica solutions of the exact optimality condition; simulated annealing on 5 × 1,000,000-turn realizations for the time-varying-p check). All "experiments" are numerical illustrations of analytical formulas. Figures show: f* vs p for the approximations (Fig. 1), Δ(p,M) threshold (Fig. 2), ξ = R(p,L)/R_K(p) vs L and d = G_K − G(p,L) vs L (Fig. 3), and numerical vs analytical f*(w,L) for L=10 (Fig. 4).

## 3. Method / model
Binary risky games: win doubles the stake (return +1), loss loses it (return −1), win probability p. Investor bets fraction f of wealth each turn; wealth W_N = W_0 ∏(1+fR_i). Criterion: maximize exponential growth rate G = lim (1/N) ln(W_N/W_0) = ⟨ln W_1⟩.
(1) M simultaneous identical independent games: G = Σ_{w=0}^{M} P(w;M,p)·ln[1+(2w−M)f], P binomial; optimum from Σ_w P(w;M,p)/[1+(2w−M)f] = 1 (Eq. 9). Exact closed forms for M=1,2; approximations for M≥5.
(2) Insider–outsider: insider knows p exactly on one game whose true win prob alternates between p±Δ; outsider plays M games knowing only mean p. Threshold Δ(p,M) from G_I(p,Δ) = G_O(p,M).
(3) Finite memory: investor sees only last L outcomes (w wins); Bayesian posterior with uniform prior π(p)=1 gives ϱ(p|w,L) = (L+1)!/[w!(L−w)!]·p^w(1−p)^{L−w}; optimal fraction f*(w,L) = (2w−L)/(L+2) for w≥L/2, else 0 (no shorting).

## 4. Equations & assumptions
Single game: f_K(p) = 2p−1; G_K(p) = ln 2 − S(p), S(p) = −[p ln p + (1−p) ln(1−p)]; R_K(p) = 2·p^p(1−p)^{1−p} − 1. Example: p=0.6 → f_K=0.2, R_K = 2.0% (vs naive 20% expected return).
M games, unsaturated (Mf*≪1): f*(p) = (2p−1)/[M(2p−1)² + 4p(1−p)] (Eq. 10). For p−1/2 ≪ 1/M reduces to f* = 2p−1 per game (games decouple). Diverse games: f*_i = 2p_i−1.
M games, saturated (1−Mf*≪1): f* = (1/M)[1 − 2p(1−p)^M/(2p−1)] (Eq. 11); join at p_c where the two approximations intersect.
Insider growth: G_I = ½[ln 2 + S(p+Δ)] if p−Δ ≤ 1/2; = ½[ln 2 + S(p+Δ)] + ½[ln 2 + S(p−Δ)] if p−Δ > 1/2. Threshold: Δ(p,M) ≈ (p−1/2)(√(2M)−1) for small edge.
Finite memory: f*(w,L) = (2w−L)/(L+2); G(p,L) ≈ G_K(p) − 1/(2L) (Eq. 19); L_min ≈ 1/[2·G_K(p)]; full series Eq. 20 to O(1/L³).
Assumptions (stated): binary ±1 payoffs; identical independent games (correlated games deferred to "a separate work"); constant p within memory window (slow variation handled via prior); no short-selling; no consumption; uniform prior for ignorance case.

## 5. Features / target
No features — analytical portfolio theory. "Target": optimal investment fractions f*, growth rates G, compounded returns R, and the insider/outsider threshold Δ(p,M). Inputs: p (win prob), M (number of simultaneous games), Δ (information advantage), L (memory length), w (recent wins).

## 6. Validation design
Theory paper: derivations checked against numerical optimization (Mathematica) and Monte Carlo/simulated-annealing experiments. No train/test; no baselines in the ML sense — the comparisons are insider vs outsider and finite-memory vs perfect-knowledge Kelly. Time-ordering N/A. Key numerical confirmations: approximations match numerics except near M≃5, p≃p_c; d = G_K − G(p,L) follows 1/(2L) (Fig. 3b); simulated annealing on 5×10⁶-turn non-stationary runs (p cycling 0.5→1→0→0.5) recovers f*(w,L) for L=10 (Fig. 4).

## 7. Numerical results / baselines
Exact values quoted from the paper:
- p=0.6: f_K = 0.2, per-turn expected return at Kelly = 4%, compounded R_K = 2.0%.
- M=2 exact: f*_2 = (2p−1)/(4p²−4p+2).
- Minimum memory for profitability: p=0.51 → L ≥ 1,761; p=0.52 → L ≥ 438 (both exact as stated). General rule: L_min ≈ 1/[2·G_K(p)].
- Below p ≈ 0.63 (numerically found threshold), R(p,L) < 0 for some L — i.e., Kelly with estimated p can have NEGATIVE growth for moderate edges at finite memory.
- Eq. 19 approximation d = 1/(2L) accurate within 10% when L ≳ 9p(1−p)/(p−1/2)²; Eq. 20 series "highly accurate already for L=20".
- Insider/outsider: for small edges, outsider wins whenever Δ < (p−1/2)(√(2M)−1) — diversification beats information over a wide parameter range; "the higher is p, the harder it is for the insider to outperform the outsider" (Fig. 2).
These are the paper's analytical/numerical results (not empirical claims about markets).

## 8. Code / data availability
None stated (Mathematica used for numerics; no code shared).

## 9. Leakage & limitations
- Adversarial: binary ±1 payoffs are a toy — real sports bets have decimal odds (payoff b≠1) and the formulas need the general-Kelly extension (f* = (bp−q)/b per game); the M-game equation generalizes but the paper doesn't do it. GSE must re-derive before sizing real tickets.
- Games assumed independent AND identical; the paper explicitly defers correlated games. NFL slate bets are correlated (same-game props, correlated sides/totals, portfolio overlap via shared teams) — the independence assumption is the most dangerous transfer gap; Eq. 10 will OVER-bet a correlated slate.
- The insider/outsider result assumes the insider's Δ-information is free; in reality information has cost (the paper notes inference "requires investor's time and resources" but doesn't price it).
- Finite-memory analysis assumes p constant within window; the non-stationary check is one stylized p-cycle, not real drift.
- No transaction costs, no stake limits, no bankroll segmentation — real books cap and limit.

## 10. GSE overlap
Existing-research map lines 49, 141: "Kelly criterion (mentioned 12×, no paper read)" and "Kelly criterion / optimal bet sizing under uncertainty — mentioned 12× in repo, zero papers read. Fractional-Kelly, Kelly with estimation error, portfolio-of-bets sizing are directly product-relevant." → This is the FIRST Kelly paper actually read; zero duplication, fills the flagged gap directly. Connects to the Wang Transform / oracle3 work (prediction-market lane) and the GSE engine's posted picks (which need sizing, not just selection).

## 11. GSE implementation spec
Adaptation (three modules):
(1) Multi-pick Kelly: generalize Eq. 9 to decimal odds — for M simultaneous independent-ish picks with win probs p_i and decimal odds o_i, maximize G = Σ_{outcomes} P(outcome)·ln(1 + Σ_i f_i·r_i(outcome)) over stake fractions f_i; solve numerically (M ≤ ~10 per slate; Whitrow-style algorithm cited as [13]). Start from the paper's unsaturated approximation as the initializer.
(2) Correlation guard: since the paper assumes independence, add a correlation haircut — estimate pairwise pick correlations from the engine's joint outcome model (or historical co-occurrence) and shrink simultaneous-game stakes by the leading eigenvalue factor of the correlation matrix; never let Σ_i f_i exceed the single-game Kelly of the portfolio's blended edge.
(3) Estimation-error shrinkage: apply the finite-memory lesson directly — GSE's p estimates come from finite backtests, so size with f = (2⟨p⟩−1) on the POSTERIOR mean (Laplace-smoothed (w+1)/(L+2) per Eq. 16, with L = effective backtest sample size) and enforce the paper's L_min gate: don't Kelly-size a pick type whose backtest N < 1/[2·G_K(p̂)] at the estimated edge (for a 55% win prob at −110, that's hundreds of picks — most GSE sub-lanes won't clear it, which correctly forces fractional Kelly).
Effort: ~1 week for the generalized multi-pick solver + Laplace-Kelly sizing; correlation haircut +1 week.

## 12. Reproducible test
Dataset: GSE engine predictions DB picks table (3,411 picks, SPREAD/MONEYLINE/TOTAL), 2024 season. Protocol: (a) single-pick: compare bankroll growth of full Kelly (generalized to decimal odds) vs half-Kelly vs flat stakes on 2024 posted picks, time-ordered; (b) multi-pick: on each weekly slate, size the M simultaneous picks with the generalized Eq. 9 solver vs independent per-pick Kelly (sum of fractions) vs half-Kelly; (c) estimation gate: Laplace-smoothed sizing vs raw-p̂ sizing. Metric: log-bankroll growth and max drawdown. Baseline to beat: flat-stakes ROI. Time window: 2024 season, walk-forward (size Week n using data through Week n−1).

## 13. Acceptance / rejection gate
ADAPT if on the 2024 walk-forward (a) the generalized multi-pick Kelly solver beats independent per-pick Kelly on log-growth AND has lower max drawdown (it should — it accounts for simultaneous risk), AND (b) Laplace-smoothed sizing (Eq. 16) beats raw-p̂ Kelly on log-growth (estimation-error penalty is real). REJECT the paper's formulas for production sizing if either fails — fall back to half-Kelly heuristic and record why. Note: the paper's binary-payoff formulas are NOT adopted as-is; only the generalized re-derivation is eligible.

## 14. Improvement experiment
Correlated-Kelly: extend Eq. 9 to correlated binary games via a Gaussian-copula joint outcome distribution parameterized by pairwise pick correlations from the engine's joint model; compare optimal fractions against the independence-assumption solver on slates with known correlation (same-game parlays, divisional round-robins). Hypothesis: correlation-aware Kelly stakes 20–40% less on correlated clusters and shows higher log-growth with lower drawdown on the 2024 replay. Second experiment: dynamic-L memory — choose the estimation window L per pick type by minimizing the paper's d = 1/(2L) penalty against non-stationarity bias (recent-form weighting), i.e., pick L to balance Eq. 19's estimation penalty with drift, per lane.

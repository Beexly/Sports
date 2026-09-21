# [1356] Kelly Bets and Single-Letter Codes: Optimal Information Processing in Natural Systems (arXiv:2104.14277v2)

**Citation:** Eckford, A. W., & Moffett, A. S. (2026). *Kelly Bets and Single-Letter Codes: Optimal Information Processing in Natural Systems*. arXiv:2104.14277v2 [cs.IT]. URL: https://arxiv.org/abs/2104.14277
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 18 pages incl. references, complete).
**Verdict:** ADAPT — the linear rate-distortion bound R(D) ≥ H(X) − D − Λ* with equality iff the strategy performs proportional (Kelly) betting gives GSE a principled information-theoretic pricing rule for data feeds and feature families (a feed is worth its cost iff it moves the achievable distortion bound), plus a gap-to-bound diagnostic for non-Kelly staking; the biological framing is irrelevant but the Kelly/information duality math transfers intact.

## 1. Research question
When is Kelly (proportional) betting optimal from a source–channel coding perspective, and what does rate-distortion theory say about how well any "investment game" — a bettor allocating wealth across outcomes using side information — can possibly do? The paper formalizes the investment game (R, S, px), derives an achievable linear lower bound on the rate-distortion function R(D), characterizes exactly when proportional betting attains it, and shows how adding strategies (rows of S) or phenotypes (rows of R) widens the achievable region. (Secs. I–IV)

## 2. Dataset / schema
No empirical data — analytical paper with computed R(D) curves and Monte Carlo illustrations. Illustrative examples: (i) R = [[2,1],[1,3]] with parametric strategy family S(a) = [[1−a, a],[a, 1−a]], a ∈ [0.02, 0.48]; (ii) diagonal R = 3I₃ with S₂/S₃/S₄ (2/3/4 strategies); (iii) catastrophe model R = [[2,0],[1,1]], px = [0.8, 0.2], S₁ = [[0.9,0.1],[0.1,0.9]], S₂ = [[0.6,0.4],[0.4,0.6]]; (iv) E. coli carbon-catabolite-repression model R = [[2,0.4],[0.4,2]], px = [0.5,0.5]; (v) Hamming (7,4) block-code Kelly tutorial. Random Py|x channels generated as p(y|x) ∝ Uniform[0,1] draws for robustness illustrations (Figs. 6–7). (Sec. V)

## 3. Method / model
- **Investment game** (Sec. II): reward matrix R (|Z| actions × |X| outcomes), strategy matrix S (|Y| side-information values × |X| outcome-allocation vectors, rows sum to 1), prior px. Wealth update W_{n+1} = W_n·⟨s(y_n), r_{z_n}⟩ (eq. 5); asymptotic growth rate G = E[log⟨s(y), r_x⟩] = Σ_{x,y} p(x,y) log⟨s(y), r_x⟩ (eq. 7).
- **Distortion function** (Sec. III): d(x,y) = −log w_x(y) with effective wager w(y) = s(y)R (eqs. 13–14); growth rate G = −E[d(x,y)] − Λ* up to constants.
- **Proposition 1:** any valid R decomposes as R = BQ with Q = diag(R^+ 1_{|Z|})^{−1} positive diagonal and B = RQ^{−1} row-stochastic (R^+ = Moore-Penrose pseudoinverse); effective strategy T = SB.
- **Proportional betting** = T = P_{x|y} (bet conditional outcome probabilities) — the Kelly rule in this notation.
- **Theorem 2 / Corollary 3:** the linear bound and equality condition; φ_{T,px} characterization (Prop. 4) via the single linear equation py·T = px (eq. 41), with over/under/square-determined cases.
- **Theorem 5 / Corollary 6:** nonsquare-R generalization with null(R) optimization; adding a row to R (new phenotype/bet type) lowers the bound under stated conditions.
- **Converse (Sec. VI-A):** every optimal single-letter code corresponds to some investment game maximizing expected log growth (eq. 64) — Kelly bets and optimal single-letter codes coincide.

## 4. Equations & assumptions
- Wealth: W_{n+1} = W_n ⟨s(y_n), r_{z_n}⟩ (5); growth G = Σ_{x,y} p(x,y) log⟨s(y), r_x⟩ (7).
- Distortion: d(x,y) = −log w_x(y), w(y) = s(y)R (13–14); rewritten d(x,y) = −log t_x^{(y)} − Λ*(x), Λ*(x) = log q_{xx} (30).
- **Main bound: R(D) ≥ H(X) − D − Λ*** (32); equality iff φ_{T,px} ≠ ∅, at D* = −Σ_{x,y} p*(x,y) log t_x^{(y)} − Λ*.
- Equality set: φ_{T,px} = {P_{x,y}: diag(py)^{−1}Q = T, 1Q = px} (31); bijection P_{x,y} = diag(py)T with py T = px (41).
- Nonsquare R: R(D) ≥ H(X) − D − min_{v∈null(R)} Λ*_v (48).
- Converse construction: −(1/c)E[d(x,y)] = Λ* − H(X|Y) (64), satisfied by diagonal R with r_{xx} = e^{d_0(x)/c}, s_x = p(x|y).
- Assumptions: finite alphabets; I(X;Y) = C(Γ) (capacity-achieving input); cost criterion of Gastpar et al. [1] satisfied; R has no zero rows/columns and admits the Prop. 1 decomposition; Kelly-optimality of log-wealth (Malthusian fitness) as the objective.

## 5. Features / target
Not an ML paper — no features/target in the statistical sense. The "inputs" are the game primitives (R, S, px) and the channel Py|x; the "output" is the operating point (D, R) = (E[d(x,y)], I(X;Y)) and its distance to the bound (32).

## 6. Validation design
No empirical validation — theorems with proofs plus computed R(D) curves (via the Bregman-divergence EM algorithm of Hayashi [48]) and Monte Carlo channel-sampling illustrations showing operating points approaching R(D) and the bound (32) along their length (Figs. 2–7). The Hamming-code example is a worked tutorial, not an experiment.

## 7. Numerical results / baselines
- Fig. 2: with R = [[2,1],[1,3]], varying strategy parameter a ∈ [0.02, 0.48] moves the R(D)–bound contact point along the bound; a = 0.5 (strategy independent of side information) gives the flat R(D) = 0 curve touching at the Kelly-without-information point; a = 0 (all-in) touches at a single marked point.
- Fig. 4: expanding S from 2 → 3 → 4 rows turns a single contact point into a continuum of contact points (underdetermined py), i.e., proportional betting achievable over a range of (D, R).
- Fig. 5: adding a row r = [0.5, 0.5, 2] to R₁ visibly lowers the bound (48) and the new bound is achievable with equality.
- Figs. 6–7 (catastrophe and CCR models): randomly drawn channels' operating points cluster near R(D) along its entire length — "R(D), and the associated bound, would be good predictors of the performance of a natural communication system."
- Proportional betting is sufficient but not necessary for single-letter-code optimality (Sec. V-A discussion).

## 8. Code / data availability
Figure-generation code + Hamming-code simulation notebook: https://doi.org/10.5281/zenodo.14845449 (ref. [47]). No datasets (theory paper).

## 9. Leakage & limitations
- Pure theory: finite alphabets, known px, capacity-achieving input assumption, and the Gastpar cost criterion rarely hold in sports betting; the bound's quantitative tightness in a real bookmaker setting is untested.
- The framework prices *information* but says nothing about where the information comes from or its cost — the feed-pricing application (Sec. 11) requires GSE to estimate mutual information empirically, which is itself hard.
- Proportional betting = betting full conditional probabilities; real GSE staking is fractional-Kelly with risk overlays, so the equality condition will essentially never hold exactly — the bound is a diagnostic, not an operating point.
- Biological examples (bet-hedging, quorum sensing, bee waggle dance) are illustrative analogies, not evidence.

## 10. GSE overlap
Garrett's corpus is deep on Kelly sizing (many Kelly ledgers incl. 1200, 1203, 1205, 1208, 1209 in this reader's own batch) but frames Kelly purely as a staking rule. The information-theoretic duality — Kelly betting ≡ optimal single-letter coding; the R(D) bound as the price of information — is absent from the corpus (existing-research-map.md: no rate-distortion/information-value entries). This is an extension that upgrades Kelly from "how much to stake" to "how much is information worth," which is new capability for feed procurement and feature-family valuation.

## 11. GSE implementation spec
- **Feed-pricing rule:** for each candidate data feed / feature family F, estimate its incremental mutual information I(F; Y | current features) on a historical window (k-NN or variational estimators); the bound (32) implies the feed can reduce achievable log-loss-distortion by at most that many nats — buy iff expected profit lift (nats × avg stake × edge conversion) exceeds feed cost. This turns "should we buy this feed?" into a computed inequality.
- **Staking diagnostic:** compute the gap between GSE's realized (D, R) operating point and the bound (32) implied by its estimated outcome model; a widening gap flags non-proportional (over/under-confident) staking before it shows up in P&L.
- **Market-expansion (Corollary 6):** when adding a new bet type/market to the portfolio, check the null(R) condition — only markets that lower the min-Λ* bound expand the achievable frontier; otherwise they add complexity without improving the risk-adjusted optimum.
- Effort: 2–3 weeks for the MI-estimation harness on historical GSE predictions; the diagnostic is a batch computation, not a live service.

## 12. Reproducible test
Dataset: GSE's logged predictions + outcomes for one full NFL season (or the engine's backtest store). Compute per-feature-family incremental mutual information with the outcome given the base model; rank families by nats. Test: do the top-ranked families by incremental MI correspond to the families with the largest realized log-loss improvement in an ablation? Metric: Spearman correlation between MI-rank and ablation-lift-rank; gate on ρ ≥ 0.6.

## 13. Acceptance / rejection gate
ADAPT the feed-pricing rule if incremental-MI rank correlates with ablation log-loss lift at Spearman ρ ≥ 0.6 on two separate seasons AND at least one feed decision (buy/skip) made by the rule would have been profitable ex post; otherwise REJECT the pricing use and keep only the staking-gap diagnostic.

## 14. Improvement experiment
Extend the bound to *fractional* Kelly (the paper assumes full proportional betting): derive the R(D)-style bound for strategies constrained to stake a fraction f of the Kelly allocation, and test whether the fractional bound predicts GSE's realized risk-adjusted growth better than the full-Kelly bound — this would make the theory directly applicable to GSE's actual fractional staking instead of an idealized full-Kelly benchmark.

# [0570] Performance rating in chess, tennis, and other contexts (arXiv:2312.12700v1)

**Citation:** Mehmet S. Ismail (2023). *Performance rating in chess, tennis, and other contexts*. arXiv:2312.12700v1. URL: https://arxiv.org/abs/2312.12700v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2814 lines).
**Verdict:** ADAPT — the PRe theorem (equivalence with TPR, plus a principled definition for perfect/zero scores) is worth porting as the mathematical basis for "peak-performance" ratings of NFL teams/units over streak windows (e.g., a team's best 5-game defensive run); the 0.75 threshold and chess-tennis-soccer applications do not transfer directly.

## 1. Research question
Tournament Performance Rating (TPR) is undefined for perfect or zero scores (m=0 or m=n) — exactly the win/loss streaks that matter most (tennis Grand Slam 7/7, a World Cup 6/6, a 20-game chess win streak). The paper introduces an Estimated Performance Rating (PRe) defined via a probability-maximization problem that is defined for ALL scores, proves it coincides with TPR whenever TPR is defined, and applies it to historical streaks in tennis, association football, and chess.

## 2. Dataset / schema
- Historical Elo ratings from public sources: tennisabstract.com (tennis), eloratings.net (association football), chessmetrics.com (chess); FIDE official ratings used in chess wherever applicable.
- Application data (appendix tables): Djokovic's 2023 Grand Slam opponents + Elos (Table 7), Alcaraz's Wimbledon 2023 opponents (Table 8), World Cup match details for Uruguay 1930, Italy 1938, Brazil 1970, Brazil 2002 (Tables 9–12: opponent, score, opponent rating), Steinitz streak games (Table 13), Fischer's 20-game streak opponents/ratings (Table 14), Caruana's 7-win streak (Table 15), and FIDE's full dp table (Table 16).
- Where a player lacked an established Elo, their tournament TPR was used as substitute.
- No train/test split — this is a definition + theorem + descriptive application paper; no code beyond the rating formula and a GitHub repo (below).

## 3. Method / model
- Defines S(w,m,n) = C(n,m)·w^m·(1−w)^(n−m), the binomial probability of scoring exactly m points in n games given per-game win probability w against average-opponent rating R_a.
- PRe is defined as the rating A* inducing the w* that solves: max_{w∈[0,1]} S(w,m,n) subject to S(w,m,n) ≤ t, with default t = 0.75.
- Because the binomial likelihood's maximizer is w* = m/n, the constraint binds exactly when the unconstrained max probability would exceed 0.75 (i.e., for extreme scores including all perfect/zero scores) — the PRe is then the rating at which the probability of that score is exactly 0.75 (or as large as possible otherwise).
- Interpretation contrast with TPR: TPR answers "the rating that would be unchanged after this score"; PRe answers "the rating at which the probability of exactly this score is maximal (capped at 75%)."

## 4. Equations & assumptions
- Elo win probability: W(A,B) = 1 / (1 + 10^((B−A)/400)).
- Average opponent rating: R_a = (1/k)·Σ_j b_j.
- TPR definition: m = n / (1 + 10^((R_a − TPR)/400)), i.e., m/n = 1 / (1 + 10^((R_a − TPR)/400)).
- Binomial score probability: S(w,m,n) = C(n,m)·w^m·(1−w)^(n−m); S̄(w,m,n) = Σ_{k=m}^{n} C(n,k)·w^k·(1−w)^(n−k) (alternative objective).
- Optimization (default t=0.75): max_{w∈[0,1]} S(w,m,n) s.t. S(w,m,n) ≤ 0.75.
- Back-translation to rating: w* = 1 / (1 + 10^((R_a − A*)/400)), solved as A* = R_a − 400·log10((1−w*)/w*).
- **Main Theorem:** For 0 < m < n, a rating R is the TPR iff W(R, R_a) ∈ argmax_{w∈[0,1]} S(w,m,n). Proof: d/dw of the binomial gives critical point m(1−w) = w(n−m), i.e., w* = m/n (second derivative negative for m<n), and TPR's defining equation sets W(R,R_a) = m/n. (Proof given in §3.)
- Assumptions: per-game win probabilities independent across games; all opponents collapsible to their average rating R_a (no adjustment for variance of opponent strength); draws handled by doubling m,n to make m integer; t = 0.75 is a chosen threshold (paper discusses alternatives briefly).

## 5. Features / target
- Inputs: score m in n games; average opponent rating R_a.
- Output: PRe — a single performance rating interpretable on the same scale as the underlying Elo system.
- Applied to: 2023 Grand Slam winners (7/7 win streaks), FIFA World Cup perfect campaigns (1930–2002), chess tournament performances and win streaks.

## 6. Validation design
- No train/test or backtest. Validation is (a) the main theorem proving equivalence with TPR for 0<m<n, illustrated by Figure 1 showing TPR and PRe coinciding for every m and n ≤ 30; (b) Table 6 worked example (R_a=2700, n=2): TPR and PRe agree at 2891 for 1.5/2, PRe=2700 at 1/2, PRe=2509 at 0.5/2, PRe=3024 for 2/2 and 2376 for 0/2 (TPR undefined at the extremes).

## 7. Numerical results / baselines
Quoted exactly from the paper:
- Table 1 (R_a=2700): for 3/3, TPR N/A, FPR 3500 (800-notional add-on), PRe 3099; for 5/5, PRe 3191. The paper notes FIDE's FPR "is ad hoc and does not factor in the length of a winning or losing streak" — FPR gives 3500 for any perfect score.
- Table 2 (tennis, 2023): Alcaraz Wimbledon 7/7, R_a=1927 → PRe 2478 (highest, "won against a very strong field"); Djokovic French Open 7/7 (R_a=1867) → 2417; Australian Open (R_a=1865) → 2416; US Open (R_a=1798) → 2349. Djokovic's "average PRe is just under 2400." TPR N/A for all.
- Table 3 (World Cups): Brazil 1970 6/6 (R_a=1900) → PRe 2424 ("one of the finest in the history of soccer"); Brazil 2002 7/7 → 2369; Italy 1938 4/4 → 2253; Uruguay 1930 4/4 → 2150.
- Tables 4–5 (chess): Fischer 20-win streak (1970–71, R_a=2705) → PRe 3441; Steinitz 25-win streak → 3356 ("this 20-win performance has been informally regarded as more impressive than Steinitz's 25-win streak, although this comparison had not been previously quantified"); Fischer 11/11 US Championship 1963 → 3224; Caruana 7-win streak (R_a=2793) → 3344.
- Table 6: for 0/2 vs R_a=2700, PRe=2376 (S=0.75 binding, w*=0.13 in the table) — note the text's illustrative w*=0.29 for 0/2 contradicts the table's w*=0.13; the table value 2376 corresponds to the constraint-bound solution.

## 8. Code / data availability
Code: github.com/drmehmetismail/Estimated-Performance-Rating (implements PRe, TPR, FPR and generates the paper's tables). Data sources: tennisabstract.com, eloratings.net, chessmetrics.com (public sites; chessmetrics is historical/static).

## 9. Leakage & limitations
- Collapsing opponents to average rating R_a discards opponent-variance: a 7/7 against seven 1900s is rated identically to one with a mix of 2200s and 1600s (Jensen's inequality: W against average ≠ average of W). The paper uses this average in the worked appendices; streak tables may over/understate.
- Independence across games assumed — false wherever form, fatigue, or matchup sequencing correlates outcomes (especially relevant to sports, and to the NFL transfer).
- The 0.75 threshold is arbitrary ("At the outset, predicting a rating with a 0.75 probability might not seem precise enough" — paper's own caveat). For long streaks the PRe is entirely threshold-driven; sensitivity to t is not reported.
- No predictive validation: PRe is shown to be mathematically principled, but never tested as a forecaster of future results — no evidence it predicts better than TPR or raw Elo.
- Integer-m trick (doubling) changes the effective binomial sample; half-point scores make the m/n geometry slightly ad hoc.
- NFL transfer limitation: the theorem rests on the binomial/Elo W(A,B) geometry of individual-contest sports with clear per-game opponents; porting to team performance over windows needs a per-game win-probability model against window-average opposition, which is itself an estimation problem.

## 10. GSE overlap
Extension, not duplicate. Per existing-research-map.md: Elo and Glicko are "mentioned"/inventoried in the 26-metric catalog, and the ML brief covers learning-to-rank and state-space team strength — but no repo work defines a principled "peak performance rating" for streaks/windows. The PRe theorem is genuinely new capability: a TPR-consistent definition of extreme-window performance (the exact gap the paper was written to fill). Closest existing concept: nfelounits (mentioned) and dynamic Elo (state-space lane), neither of which addresses the perfect/zero-score-window problem.

## 11. GSE implementation spec
- Build a PRe module: given an NFL team (or unit, e.g., defense) over a window of n games with per-game pre-game win probabilities w_i (from the engine's moneyline model or nflverse-derived Elo), compute the binomial-exact score probability S(w̄, m, n) at window-average w̄ and solve the paper's constrained max for w*, then back-translate to an Elo-scale PRe.
- Application 1 (content): "best defensive 5-game stretch by any team this season" leaderboards, content-ready.
- Application 2 (modeling): streak-aware features — PRe of a team's last-n-game run vs its current Elo; gap (PRe − Elo) as a mean-reversion feature for spread modeling.
- Data: nflverse game results + per-game engine win probabilities; no charting needed. Effort: ~2 days (numerical solver for the constrained binomial max, Elo-scale calibration, validation notebook).

## 12. Reproducible test
- Dataset: NFL 2010–2025, nflverse games; per-game win probabilities from a baseline Elo (fixed K, HFA) to avoid engine lookahead.
- Metric: for each team's rolling 5-game windows, compute PRe(m,5) at window-average win prob; test whether (PRe − Elo) predicts next-game ATS margin residual (regress residual ~ gap on 2015–2025, time-ordered CV).
- Baseline: Elo residual alone; the gap feature must add adjusted R² ≥ 0.002 or be dropped. Separately, verify the paper's theorem empirically: on historical NFL 5-game windows, PRe computed via the constrained-max matches the TPR-style inversion (m/n → rating) within ±1 Elo point for 0<m<5.

## 13. Acceptance / rejection gate
- ADOPT the PRe module if (a) theorem replication on NFL windows holds within ±1 Elo point for 0<m<n (mathematical port validated), AND (b) the (PRe − Elo) gap feature improves next-game ATS-residual adjusted R² by ≥0.002 vs Elo-only on 2015–2025 time-ordered CV.
- ADAPT as content-only (leaderboard product, no modeling use) if (a) holds but (b) fails.
- REJECT modeling use if neither holds.

## 14. Improvement experiment
- Replace the paper's fixed t=0.75 and average-opponent collapse with the exact likelihood: model each window game's outcome as Bernoulli(w_i) with per-game w_i (not average w̄), and define PRe* as the rating shift δ such that the probability of the observed (m,n) sequence is maximized over a threshold-free formulation (equivalently, fit δ by MLE on the exact sequence likelihood Π_i Bernoulli(w_i·shift)). This removes both the arbitrary 0.75 and the average-opponent Jensen gap, and is directly estimable on NFL windows — test whether PRe* beats PRe on the §13 gate.

# DFS & CONTEST SIMULATION — THE ACTUAL METHODS LITERATURE

**Target:** not a company. The published, citable techniques behind "contest simulation" —
correlated player sampling, field/ownership modelling, and portfolio construction under a
payout curve. What the sims vendors (SaberSim, Stokastic, LineStar, PropFinder) are doing
*underneath*, stated as math we can implement and, critically, *publish*.

**Captured:** 2026-09-08. **Slug:** `simulation-literature`. **Wave:** 2.
**Method:** WebSearch + WebFetch on public surfaces only. Two source PDFs (Hunter/Vielma/Zaman
and Haugh/Singal) were fetched as public PDFs and text-extracted locally; a third (Bergman et al.)
likewise. Every claim below carries the URL it came from. Where I could not read the page
myself I say so.

**Read alongside:** `_HANDOFF-to-coding-agent.md` (the doctrine: fire on edge `e = p − q`, never
on confidence), `_gse-edge-lab-final.md`, `_propfinder-teardown-final.md` (PF Rating reconstructed,
**no calibration published**), `dfs-optimizer-priorart.json`, `_competitor-mistakes-lessons.md`.

---

## 0. THE ONE-PARAGRAPH VERSION

DFS contest simulation is not one technique, it is a four-layer stack, and almost every
commercial product is opaque about layers 2 and 3 — which is exactly where the math lives.
**Layer A** is a marginal distribution per player. **Layer B** is the dependence structure
between players (this is what "stacking" is a crude proxy for). **Layer C** is a generative
model of the *opposing field* — the other 200,000 lineups — because in a top-heavy contest
your payout is a function of your **rank**, not your score. **Layer D** is selecting a
*portfolio* of N entries against a payout curve, which is a submodular / expected-maximum
problem, not a knapsack. The single most important published result is that **in a top-heavy
contest the optimal lineup is not the highest-projected lineup, and the direction of the
variance preference flips sign depending on whether your expected margin over the field is
positive or negative** (Haugh & Singal, Proposition 4.1). Everything else is engineering.

---

## 1. THE CANONICAL PAPERS (what each one actually contributes)

| # | Paper | Contributes | URL |
|---|---|---|---|
| P1 | Hunter, Vielma, Zaman — *Picking Winners in Daily Fantasy Sports Using Integer Programming* (arXiv 1604.01455, INFORMS J. Optimization) | The submodular "P(at least one entry wins)" objective; closed-form Gaussian lower bound; the **sequential greedy IP with an overlap constraint**. The foundational paper. | https://arxiv.org/abs/1604.01455 · PDF: https://juan-pablo-vielma.github.io/publications/Picking-Winners.pdf |
| P2 | Haugh & Singal — *How to Play Fantasy Sports Strategically (and Win)* (Management Science 67(1), 72–92, 2021; May 2019 working version) | **Models the opponents.** Dirichlet-multinomial DGP for opponent lineups + Dirichlet regression on ownership + copulas for cross-position dependence. The mean-variance / stochastic-benchmark result. | http://www.columbia.edu/~mh2078/DFS_Revision_1_May2019.pdf · https://dl.acm.org/doi/abs/10.1287/mnsc.2019.3528 |
| P3 | Bergman, Cardonha, Imbrogno, Lozano — *Optimizing the expected maximum of two linear functions defined on a multivariate Gaussian distribution* (arXiv 2112.07002) | The **exact** two-entry expected-maximum problem: NP-hard even unconstrained; cutting-plane / integer L-shaped algorithm. Also the most usable **covariance-estimation recipe** in the literature. | https://arxiv.org/pdf/2112.07002 |
| P4 | Decary, Bergman, Cardonha, Imbrogno, Lodi — *The Madness of Multiple Entries in March Madness* (arXiv 2407.13438) | Expected-maximum-score (EMS) portfolio theory for multi-entry under a top-heavy curve; when to diversify vs replicate. | https://arxiv.org/html/2407.13438v1 |
| P5 | Newell & Easton — *Optimizing daily fantasy sports contests through stochastic integer programming* | First to optimise the **expected payout of a tiered contest** rather than expected points. | https://www.semanticscholar.org/paper/Optimizing-daily-fantasy-sports-contests-through-Newell/06b2c8f3c6ed200eb216ed0dcf6a2385a42cb98d |
| P6 | Mlčoch & Hubáček — *Competing in daily fantasy sports using generative models* (Int. Trans. in OR, 2024) | Ensemble of **generative models** for the fantasy-point distribution + MIQP over mean/variance/covariance. | https://onlinelibrary.wiley.com/doi/10.1111/itor.13344 (see honesty note §9) |
| P7 | Bergman & Imbrogno — *Surviving a National Football League Survivor Pool* (Operations Research 65(5), 1343–1354, 2017) | Sequential portfolio under an elimination payout structure; the "plan only partway ahead" result. | https://pubsonline.informs.org/doi/10.1287/opre.2017.1633 |
| P8 | Becker & Sun — *An Analytical Approach for Fantasy Football Draft and Lineup Management* (JQAS 12(1), 17–30, 2016) | MIP for season-long draft + weekly lineup, using expert-draft and owner-behaviour data. | https://www.degruyter.com/view/journals/jqas/12/1/article-p17.xml |

Non-academic but published-methodology sources used below: SaberSim's help centre
(https://support.sabersim.com/en/articles/12079199-how-contest-sims-work), Stokastic's strategy
pages (https://www.stokastic.com/articles/dfs-strategy/dfs-beginner-to-winner), an open-source
MLB copula implementation (https://github.com/tom812191/dfs-mlb), and RotoWire's four-year
correlation study (https://www.rotowire.com/football/article/does-stacking-work-in-fantasy-football-what-four-years-of-data-say-about-drafting-correlated-players-2026-131409).

---

## 2. LAYER A — MARGINAL PLAYER DISTRIBUTIONS

### 2a. The normality question, answered with a test (not an assumption)

Bergman et al. (P3) actually tested it rather than asserting it, on 2016–2018 NFL:

> "Using the Shapiro-Wilk test […] the null hypothesis of a normal distribution of player scores
> cannot be rejected for 76% of the QBs (by far the most valuable position) from the 2016–2018
> seasons. In addition, the null hypothesis of a normal distribution cannot be rejected nearly
> half the time when considering players from any position over that same timeframe with an
> expected score of at least 10 points."
> — arXiv 2112.07002 §6.2.3

And the operationally important part: **normality gets better as the projection gets bigger.**
"As the expected score increases, the likelihood of rejecting the assumption of normally
distributed actual scores falls across all players." They exploit this by filtering the pool to
players with expected score ≥ 5 fantasy points (§6.1), noting such players are never selected
anyway.

**Implication for us:** a multivariate-normal engine is defensible *for NFL, on the players who
matter*, and we can say so with a test statistic rather than a hand-wave. That is publishable
in the Glass Ledger idiom.

### 2b. Where normality fails, and what the literature does instead

Baseball hitters are the counterexample: discrete, zero-inflated, right-skewed. The open-source
MLB implementation (https://github.com/tom812191/dfs-mlb) fits

- **pitchers:** Gaussian, parameters taken straight from a projection feed;
- **batters:** a **four-parameter mixture of an exponential and a Gaussian**, then discretised
  to empirical frequencies, then — the clever bit — **PCA on the parameter space** so the two
  unobserved mixture parameters can be recovered from only the projected mean and standard
  deviation, which is all a projection feed gives you.

P6 (Mlčoch & Hubáček) replaces this with an **ensemble of generative models** for the
fantasy-point distribution.

**Honest caveat from Haugh & Singal on skew** — this is a trap worth writing down:

> If the lineup totals `Y_w` display a significant right skew their medians fall below their
> means, and a double-up cutoff is set by the **median** of the field, not the mean. You can
> then pick the wrong branch of the variance decision — "we end up seeking a team with a large
> mean and a small variance. It's possible, however, that we should be seeking a team with a
> large mean and a large variance."
> — DFS_Revision_1_May2019.pdf §4.2 footnote discussion

They report seeing no such skew when the underlying player vector is multivariate normal.

---

## 3. LAYER B — DEPENDENCE (the layer everyone skips)

Four distinct techniques appear in the literature, in increasing order of fidelity and cost.

### 3a. Structural stacking constraints (P1) — correlation without a covariance matrix

Hunter et al. never estimate a full covariance matrix. They encode the *known sign structure*
of correlation as hard constraints:

- **Goalie stacking (NHL):** never roster a goalie together with skaters he is playing against —
  a known negative correlation. Baseball analogue: never roster a pitcher with any opposing
  hitter.
- **Line stacking (NHL):** require complete or partial forward lines — known positive correlation.
  Baseball analogue: **five consecutive batters in the batting order**, cyclic orders such as
  (8, 9, 1, 2, 3) allowed, five being the DraftKings maximum.
- **Defensemen stacking:** first-power-play-unit defensemen.
- Team-count caps (e.g. at most three teams; at most five hitters from one team).

Their measured finding is unambiguous: **"the lowest profit margin is achieved by no stacking"**,
and the *most* heavily stacked configuration (Type 4 — goalie + complete and partial line +
defensemen + at most three teams) had the highest profit margin at 100 and 200 lineups. The
stated mechanism is that stacking is a **variance-manufacturing device**, not an expected-points
device.

This is the cheap 80% and it is what most commercial optimizers actually implement.

### 3b. Nearest-neighbour empirical correlation (P3) — the best cheap covariance recipe published

This is the single most directly implementable thing in the whole literature. From
arXiv 2112.07002 §6.2.2, trained on four NFL seasons (2014–2017):

**Variance of player j.** Take the 50 players in the training set who (i) share j's position and
(ii) have *projected* value closest to j's *projected* value by squared difference. The variance
of their **actual** scores is j's variance.

> "if a RB is *projected* to score 20.5 fantasy points, we select the 50 RBs in the training set
> with *projected* fantasy score as close as possible to 20.5 measured by squared difference, and
> use the *actual* fantasy scores of those players to calculate the variance"

**Correlation of players j, j′.** Same idea in two dimensions. Find the 50 historical
(player-pair, game) instances where the pair played the same two positions, in the same
relationship (same team / opposing teams), and whose projections are jointly closest — minimising
the sum of squared differences from (proj_j, proj_j′). The **sample correlation of their actual
scores** is the estimate.

> "if a QB and WR pair are on the same team and are expected to score 30 and 15 points,
> respectively, we find the 50 instances in the training set of QB and WR teammates with the sum
> of squared differences from 30 and 15 in expected values as low as possible"

**Then:** "a small correction is made to ensure that the covariance matrix is PSD, if needed."

Note the property this recipe has that a global position-pair correlation constant does not:
it is **conditional on the projections**. A 30-point QB with a 15-point WR1 has a different
dependence than a 14-point QB with a 6-point WR3, and this method captures that for free.

### 3c. Empirical copula + inverse-CDF sampling — the right answer when marginals are ugly

From https://github.com/tom812191/dfs-mlb. Copula theory lets you "specify the dependence
structure and the marginal distributions of the players separately," which is exactly what you
need when pitchers are ~Gaussian and hitters are an exponential/Gaussian mixture.

Rather than fitting a parametric (e.g. Gaussian or t) copula, they **build an empirical copula
from historical data** by ranking historical performance across batting-order slots and the
opposing pitcher. Simulation is then: draw a 10-dimensional vector of quantiles from the
empirical copula (9 batters + opposing pitcher — the natural correlation group), then push each
component through that player's **inverse CDF**.

This decomposition is the reason the technique is worth its complexity: you can swap the
marginal (a new projection arrives) without re-estimating the dependence, and vice versa.

### 3d. Play-by-play game-script simulation — correlation as an emergent property

SaberSim's published description (https://support.sabersim.com/en/articles/12079199-how-contest-sims-work):

> "every game is simulated one play at a time, incorporating coaching tendencies, weather,
> injuries, and in-game strategy. These scripts generate natural correlation—when a QB goes off,
> his receivers often do too."

This is the most expensive option and it makes the dependence structure **implicit** — you can't
show anyone the correlation matrix because there isn't one. Note that for GSE this cuts against
the brand: an implicit, un-inspectable dependence structure is the opposite of "math you can read."

### 3e. What the correlations actually are — the number that matters

The DFS folklore number for QB–WR1 is +0.6 or higher. A four-year measured study
(2022–2025, 1,300+ team-stack seasons; RotoWire, URL above) reports:

| Pair | Correlation |
|---|---|
| QB – WR (top receiver) | **+0.31** |
| QB – TE | **+0.27** |
| QB – RB | **+0.07** ("functionally zero") |
| WR – WR, same team | **−0.02** ("flat, if not faintly negative") |

The study's explanation for the gap: "+0.6 or higher figures commonly cited […] come from
single-game DFS slates where one shootout drives everything." Same-team WR–WR is flat because
"the shared-offense boost gets cancelled by target competition."

They also quantify the effect, which is the honest framing of what stacking buys:
a QB–WR stack adds ~**1.8** points of ceiling and removes ~**1.6** points of floor per week; a
three-player stack ~**2.2** up / ~**2.0** down; **~14% more boom-or-bust** week to week; and
**season-long point totals are identical** — "correlation redistributes outcomes across weeks,
not cumulative totals."

**That last sentence is a whole product thesis.** Correlation is worthless for a season-long
accumulation game and decisive for a rank-against-a-field game. Anyone selling "stacking" as a
season-long edge is selling nothing.

---

## 4. LAYER C — THE CONTEST FIELD AND OWNERSHIP MODEL

This is P2's original contribution and no commercial product publishes anything comparable.

### 4a. Why you need it at all

In a top-heavy contest your reward is a step function of your **rank**, and your rank depends on
the order statistics of the *opponents'* scores. Formally (P2, eq. 2), with payouts
`R_1 > … > R_D > R_{D+1} = 0` at rank thresholds `0 = r_0 < r_1 < … < r_D`, submitting N entries
`W = {w_i}`:

```
max_{W ∈ W^N}  Σ_{i=1}^{N} Σ_{d=1}^{D} (R_d − R_{d+1}) · P( F_i(w_i, δ) > G_(r*_d)^{−i}(W_{−i}, W_op, δ) )
```

where `r*_d = (O/N)·r_d`, `G_(r)^{−i}` is the r-th order statistic of the opponents' scores
`{G_o}_{o=1}^{O}` **union your own other entries** `{F_j}_{j≠i}`, and `W_op` is the random
collection of opponent lineups. Two things fall straight out of this and neither is obvious from
a projection sheet:

1. **Your own entries compete with each other.** `G_(r)^{−i}` includes your other N−1 lineups.
2. **`W_op` is a random object you have to model**, and it is *not* independent of the players'
   performance distributions — everyone is looking at the same projections.

### 4b. The Dirichlet-multinomial data-generating process

P2 §3.1. Per position (QB shown; identical for RB, WR, TE, K, D):

```
p_QB  ~  Dir(α_QB)                              # the ownership vector is itself random
chosen QB  ~  Multinomial(1, p_QB)              # a random opponent draws from it
```

with `p_QB` on the unit simplex in `R^{P_QB}`. The reason for the outer Dirichlet is stated
plainly and is the part practitioners get wrong: `p_QB` "is not known in advance of the DFS
contest. Moreover, they do not appear to be perfectly predictable and so we have to explicitly
model their randomness." **Ownership is a random variable, not a point projection.** Every
vendor that ships a single "projected ownership %" per player is using a degenerate prior.

**Data.** Realised ownership proportions are observable after most contests (because O is large,
observing realised ownership ≈ observing `p_QB`). That is the training set.

**Dirichlet regression.** The parameter vector is made predictable from observable features:

```
α_QB  =  exp( X β )
```

where X holds expected player performance μ, home/away indicators, quality of opposing team, and
so on. Fit as a **Bayesian Dirichlet regression**.

### 4c. The copula over positions — modelling the opponent's *strategy*

Positional marginals alone would say opponents pick each slot independently. P2 §3.2 fixes this
with an explicit copula choice, and the three named copulas are effectively a taxonomy of
opponent types:

- **Independence copula** — "the copula of a non-strategic contestant." Fills each slot without
  regard to the others.
- **Stacking copula** — the opponent deliberately correlates (e.g. picks a QB, then draws his
  WRs preferentially from the same team). P2 notes that if Stack = 1 you follow the stacking
  copula, and otherwise the independence copula amounts to independent draws per position.
- **Mixture copula** — a convex combination governed by a **stacking probability q**, since "a
  convex combination of copulas remains a copula." q is the single knob describing how strategic
  the field is.

Their own honest limitation, which is also an opening: "very little data on complete team
selections is available" to anyone outside DraftKings/FanDuel — "these companies could easily fit
more sophisticated copulas to the data."

### 4d. Order statistics make the Monte Carlo cheap

P2 §4.2.1: the inputs `μ_{G_(r)}`, `σ²_{G_(r)}` and `Cov(δ, G_(r))` **do not depend on your
portfolio choice w**, so they are estimated **once, offline**, per slate — "the Monte Carlo can
be performed relatively efficiently using results from the theory of order statistics." This is
the difference between a sim engine that runs in seconds and one that runs in an hour.

---

## 5. LAYER D — PORTFOLIO SELECTION UNDER A PAYOUT CURVE

### 5a. The submodular objective (P1)

Let `E_i` be the event that entry i exceeds the winning threshold t. The objective is
`P(∪_{i∈S} E_i)` — the probability that **at least one** entry wins. P1's Lemma 1 shows this is
non-negative, non-decreasing and **submodular**, which is what licenses a greedy algorithm with
the standard (1 − 1/e) flavour of guarantee (they cite Asadpour & Nazerzadeh for the stochastic
monotone submodular case).

Evaluating it exactly for a multivariate Gaussian is intractable, so **Theorem 2.5** gives a
closed-form *lower bound* using only pairwise marginals. With `μ_i`, `ω_i` the entry mean and
s.d., `ρ_ij` the pairwise correlation and `z_i = (t − μ_i)/ω_i`:

```
U₂ˡ(S) =  Σ_{i: E_i ∈ S}  1 / ( √(2π) · ω_i (z_i + 1/z_i) ) · exp( −z_i²/2 )
        − ½ Σ_{i,j: E_i,E_j ∈ S, i≠j}  1 / ( √(2π) (2t − μ_i − μ_j) )
              · exp( − (2t − μ_i − μ_j)² / ( 2(ω_i² + ω_j² + 2ρ_ij ω_i ω_j) ) )
```

and `U₂(S) ≥ U₂ˡ(S)`. Assuming `z_i ≥ 1` (true when t is large — i.e. a genuinely top-heavy
contest), reading the expression gives the **three design rules that the whole field now uses**:

> 1. Each entry has a **high mean** (to increase the probability it exceeds t).
> 2. Each entry has a **high variance** — "all one cares about is having *some* entry's score
>    exceed t. […] While this also increases the probability that some of the entries will have
>    a low value, this is not a concern as the goal is to have at least one exceed t."
> 3. Each **pair** of entries has **minimal correlation** — diversification, so that a different
>    one of them is the one that spikes.

Entry mean, variance and covariance in terms of the 0/1 selection variables `x_ij` (P1 eqs 2.5–2.7):

```
μ_i         = Σ_j μ′_j x_ij
ω_i²        = Σ_j (ω′_j)² x_ij + Σ_j Σ_{l≠j} ρ′_jl ω′_j ω′_l x_ij x_il
Cov(X_i,X_q)= Σ_j (ω′_j)² x_ij x_qj + Σ_j Σ_{l≠j} ρ′_jl ω′_j ω′_l x_ij x_ql
```

### 5b. The sequential greedy IP (P1 §4.4) — the thing to actually build first

P1 does **not** solve the quadratic objective. They approximate all three rules with linear
machinery, which is why it runs in seconds:

- **rule 1** → the linear objective `max Σ_j μ_j x_ij`;
- **rule 2** → the *stacking constraints* (§3a above) manufacture variance structurally;
- **rule 3** → the **overlap constraint**. Assuming player variance dominates player covariance,
  they approximate the correlation of two lineups by the **number of players they share**:

```
Σ_{j=1}^{p}  x*_lj · x_ij  ≤  τ        for l = 1, …, i−1                      (P1 eq. 4.8)
```

where `x*_lj` is the already-fixed solution for lineup l. Because the previous lineups are
**fixed**, this is a linear constraint, not a quadratic one. The whole method is:

```
for i = 1..k:
    solve  max Σ_j μ_j x_ij
           s.t. feasibility (roster slots, salary cap, ≥2 games, team caps)
                overlap ≤ τ against all previously built lineups 1..i−1
                stacking constraints
    freeze lineup i; append to the overlap constraint set
```

**τ is the tuning parameter and P1 measured it.** Max overlap should be **tuned between 4 and 7
depending on how many games are on the slate**: on nights with fewer than four NHL games, τ = 7
is best; with more than nine games, τ = 4 is best. Below 4 they could not find 200 feasible
lineups; above 7 the lineups are "too similar and do not provide enough diversity." Baseball used
τ = 6.

**Runtime:** 100 lineups in under four minutes on an Intel i5-4570 / 8 GB, with the *free* solvers
CBC and GLPK as well as Gurobi, implemented in JuMP/Julia. That is a 2016-era commodity laptop.
This is not an expensive algorithm.

**Two measured results from P1 that should shape any product copy:**

- **Creation order is nearly uninformative about performance.** Spearman rank correlation between
  a lineup's creation index and its contest performance rank: **0.09 (s.d. 0.10)**. Median
  performance rank of the *first* lineup created: 74.5 of 200. Median creation rank of the *best*
  lineup: 124.5. So "lineup #1" is barely better than "lineup #137" — a UI that presents an
  ordered list is lying about its own algorithm.
- **One lineup loses.** With a single entry the **median profit margin is −100%**. The mean is
  positive only because of a single outlier. With 100 and 200 lineups the median rises and the
  distribution gets a fatter right tail. The portfolio *is* the product.

Their real-money results: NHL top-heavy contests never exceeded 24,000 entrants; MLB top-heavy
always exceeded 38,000. Best-of-200 ranks on ten MLB dates (P1 Table 4): **1** (of 47,916),
**3** (38,333), 1,342 (57,500), **7** (38,333), 213, 146, 400, **17** (46,000), 376, **2**
(38,333) — top-ten four times including a first place. Total winnings across the study, all
donated to the Greater Boston Food Bank: **~$15,000**.

### 5c. The variance sign flip — Haugh & Singal Proposition 4.1

This is the crispest statement in the literature of *why maximising expected points is the wrong
objective*, and it is not a heuristic — it is an if-and-only-if.

Let `R_w − R_b ~ N(μ_w, σ²_w)` for all feasible w, where `R_b` is the benchmark you must beat
(the cash line, or the r-th order statistic of the field). Then:

- **(i)** If `μ_w < 0` for **all** w — you are behind the benchmark in expectation everywhere —
  the optimum lies in `argmax_w { μ_w + λ σ²_w }` for some **λ ≥ 0**: you **buy variance**.
- **(ii)** If `μ_w ≥ 0` for **some** w, the optimum lies in
  `argmax_{w: μ_w ≥ 0} { μ_w − λ σ²_w }`, **λ ≥ 0**: you **sell variance**, restricted to the
  entries that are already ahead.

If `R_b` is deterministic then `μ_w = μ(w) − R_b` and `σ²_w = σ²(w)`, "so that `w*` is
mean-variance efficient."

**The algorithm this yields** is small: solve one LP maximising `μ_w` over the polyhedral feasible
set. If the optimal mean is negative you are in case (i), else case (ii). Then grid over λ,
solving the appropriate **binary quadratic program** (BQP) for each, and keep the λ with the best
true objective. P2 solved these BQPs with Gurobi's default BQP solver, and notes a BQP converts
to a plain BP at the cost of `O(P²)` extra binaries and constraints.

**Read this next to the GSE doctrine.** `_HANDOFF-to-coding-agent.md` says: fire on edge
`e = p − q`, never on confidence `κ`. Proposition 4.1 is the DFS-shaped statement of the same
idea. The projection is `μ`. The market/field is `R_b`. What you optimise is the *distribution
of the difference*, and the correct risk posture **reverses sign** depending on where you sit
relative to the field. An optimizer that ranks lineups by projected points is doing the DFS
equivalent of ranking picks by confidence.

### 5d. Diversify or replicate? (P2 §5.1–5.2)

P2 detours through **parimutuel betting**, where a winner-takes-all contest has an exactly
solvable structure (Proposition 5.2: Algorithm 5 returns an optimal wager portfolio), and shows
for N = 2 the optimum is always either `(2,0,0,…)` — replicate — or `(1,1,0,…)` — diversify.

But DFS is **not** parimutuel: DFS payouts do not have the reward-independence property, "which
is why even an idealized greedy algorithm […] would not be optimal in general," and this
"led to us arguing that **even more diversification might be called for in the DFS setting.**"

Measured: their **Algorithm 7** (no backtracking — never replicate, always add a distinct entry)
produced portfolios **5% to 20% better in expected value** than Algorithm 6 (with replication),
for any fixed diversification parameter δ. Their optimal δ was **6** in both algorithms.
Algorithm 7 is what they used in production.

P4 sharpens the theory on a cleaner problem (brackets) with results that transfer:

- **Remark 1:** "An entry with the highest expected score does not necessarily compose an optimal
  e-entries solution for e ≥ 2." *The best single lineup need not appear in the best portfolio.*
- **Remark 2:** "Optimal multi-entry sets may select the same tournament winner across all
  entries." Diversification is not a blanket rule.
- **Theorem 2:** when all pairwise probabilities are exactly 0.5, `{E, E′}` is optimal **iff** E
  and E′ are **disjoint**. The structural law: **required diversity scales inversely with
  certainty.** A slate you have strong opinions about wants concentration; a coin-flip slate
  wants maximal spread. This is the principled version of "τ between 4 and 7."

### 5e. The exact two-entry problem is NP-hard (P3)

P3 formalises `max E[max(a′X, b′X)]` for arbitrarily correlated multivariate Gaussian X and
proves it **NP-hard even when the feasible set is unconstrained**. They build a cutting-plane
algorithm — "an extension of the integer L-shaped method for a highly nonlinear function, which
includes the evaluation of the c.d.f and p.d.f of a standard normal random variable with decision
variables as part of the arguments."

Applied to DraftKings NFL **Showdown** contests (single game, so every pair is same-team or
opposing — which is exactly why the nearest-neighbour correlation recipe in §3b is tractable
there), over 16 contests in the 2018 season: exact model net profit **over $5,000**; the
greedy heuristic on the *same inputs* **lost over $4,000**. Their worked example is the whole
point of joint optimisation:

> Redskins vs. Saints, 10-8. The two exact-model entries had expectations **104.74** and
> **102.74** and scored **65.55** and **140.80** — "the second entry would have won the
> competition." The heuristic's two entries had *higher* expectations, 109.51 and 108.88, and
> scored 78.95 and 114.20 — a positive but "very marginal" payout.

"The two entries selected often score on opposite sides of their expectation, showing how
correlation is exploited to elevate the expected score of the maximum." **Anti-correlating your
own entries is the mechanism.** Higher expected points, lower expected maximum.

---

## 6. MAXIMISING EXPECTED POINTS vs MAXIMISING P(TOP FINISH) — SETTLING IT WITH NUMBERS

The two objectives are genuinely different problems and the literature quantifies the gap. From
P2's live 2017 NFL FanDuel season — 17 weeks, three contest types every week, **strategic model
(models the opponents) vs benchmark model (does not)** — the per-week P&L distributions:

| Contest | Model | E(P&L) | sd(P&L) | **p(loss)** |
|---|---|---|---|---|
| Top-heavy (O ≈ 200,000, $1/entry, N = 50) | **Strategic** | **123.9** | 1265.9 | **0.67** |
| Top-heavy | Benchmark | 51.9 | 286.9 | 0.52 |
| Quintuple-up (O ≈ 10,000, $2/entry, N = 25) | Strategic | 58.0 | 123.8 | 0.57 |
| Quintuple-up | Benchmark | 51.0 | 122.7 | 0.60 |
| Double-up (O ≈ 30,000, $2/entry, N = 10) | Strategic | 10.7 | 16.9 | 0.23 |
| Double-up | Benchmark | 10.3 | 17.2 | 0.24 |

**Read the top-heavy row carefully, because it is the most honest number in this dossier.**
The strategic model has **2.4× the expected P&L** and a **higher probability of losing money**
(0.67 vs 0.52) with **4.4× the standard deviation**. That is not a defect; it is the correct
solution to a top-heavy payout curve. But it means any product that sells contest simulation on
"you'll win more often" is selling the wrong statistic. You will lose *more often*. You will
lose *less in total*.

Realised season results (P2 §6.2): the strategic top-heavy portfolio earned a **cumulative profit
of $280.74** with a **max cumulative shortfall of only $18.50**, funded by $50 + $18.50 + $7.26 =
**$75.76** — "a return of over 350% in just 17 weeks." The benchmark earned "less than 50% in 17
weeks" once you account for the extra capital it needed. Their own reference point for calibration:
with a ~15% house edge, an average portfolio would have **lost 17 × 15% × $50 = $127.50** over the
season. Both models beat that. On quintuple-up the benchmark actually **beat** the strategic model
from week 6 onward, and P2 says so rather than hiding it, noting the gap "could easily be wiped
out in just one week's contest."

The stakes-side statement of the same idea, from Stokastic's public strategy page: "Your DFS
expected value in a tournament isn't set by your raw score—it's set by your score relative to
the field," and their engine "runs the entire contest thousands of times over to find the lineups
with the highest simulated ROI […] not the highest single projection."
(https://www.stokastic.com/articles/dfs-strategy/dfs-beginner-to-winner)

---

## 7. THE CONCRETE ALGORITHM FOR GSE

Written to be implementable against `apps/web/lib/fantasy/`. Staged so each stage ships and is
verifiable on its own, and so nothing publishes an unearned number.

### Notation

`j = 1..P` players in the slate · `i = 1..N` our entries · `x_ij ∈ {0,1}` ·
`μ_j, σ_j` player mean and s.d. · `Σ` the P×P player covariance matrix ·
`F_i = Σ_j Y_j x_ij` our entry i's score · `O` field size · `G_o` opponent o's score ·
`G_(r)` the r-th order statistic of the field · `R_d` payout at rank band d ·
`t` the winning threshold · `τ` max lineup overlap · `q` field stacking probability.

---

### STAGE 1 — Marginals with a published normality test

For each player j with a projection:

1. `μ_j` from the projection feed we already ingest.
2. `σ_j` by **nearest-neighbour on projection** (P3 §6.2.2): take the K = 50 historical
   player-games sharing j's position whose *projected* value minimises `(proj − μ_j)²`; set
   `σ_j` = s.d. of their **actual** scores.
3. Filter the pool to `μ_j ≥ 5` (P3 §6.1) — these players are never selected anyway and they are
   where normality fails.
4. **Run Shapiro-Wilk per position and publish the pass rate**, exactly as P3 did (they got 76%
   of QBs). This is a one-line honest artefact no competitor ships, and it is a *measurement*,
   so it satisfies the four-field substantiation guard in `_HANDOFF-to-coding-agent.md` §1.

*Acceptance:* the per-position Shapiro-Wilk pass rate is computed on our own data, on an
out-of-sample season, and rendered with its denominator. If normality fails badly for a position,
that position gets an empirical-CDF marginal (§3c) instead of a Gaussian, and we say which.

---

### STAGE 2 — Covariance, estimated and published

For each ordered pair (j, j′) needed by the slate:

1. Classify the relationship: same team / opposing teams / unrelated game.
2. Take the K = 50 historical (pair, game) instances matching (position of j, position of j′,
   relationship) minimising `(proj_j − μ_j)² + (proj_{j′} − μ_{j′})²`.
3. `ρ_jj′` = sample correlation of their **actual** scores. Unrelated games → `ρ = 0` by
   construction (do **not** estimate it; the estimate would be sampling noise and it would
   destroy the block structure).
4. `Σ_jj′ = ρ_jj′ σ_j σ_j′`. **Project Σ to the nearest PSD matrix** (eigendecompose, clip
   negative eigenvalues to 0, rescale the diagonal back to `σ_j²`). P3: "a small correction is
   made to ensure that the covariance matrix is PSD, if needed."
5. **Sanity-gate against the published measured values** (§3e): our estimated QB–WR should land
   near **+0.31**, QB–TE near **+0.27**, QB–RB near **+0.07**, same-team WR–WR near **−0.02**.
   If our estimate says +0.6, our matcher is broken, not the literature.

*Acceptance:* `Σ` is PSD, block-structured by game, and the four benchmark pairs above fall
within a stated tolerance of the four-year measured values. Ship the matrix as a downloadable
artefact — this is the "math you can read" version of a correlation model.

---

### STAGE 3 — Field model (the differentiator; Dirichlet-multinomial)

Per position g ∈ {QB, RB, WR, TE, DST}:

1. **Collect realised ownership.** After every contest, record realised ownership proportions per
   player. This is the training set and it is the thing we do not have today. Start collecting
   **now** — same argument as the Glass Ledger start date: the asset is the length of the record.
2. **Dirichlet regression:** `α_g = exp(X β_g)` with X = [projection μ, salary, points-per-dollar,
   home/away, opponent strength, days of news salience]. Fit Bayesian.
3. **Sample a field:** for each simulated opponent o = 1..O:
   - draw `p_g ~ Dir(α_g)` per position (once per simulated contest, not per opponent — the
     Dirichlet layer is the *contest-level* uncertainty in ownership);
   - draw `Stack ~ Bernoulli(q)`;
   - if Stack = 0 use the **independence copula** — draw each slot from `Multinomial(1, p_g)`;
   - if Stack = 1 use the **stacking copula** — draw the QB, then draw pass-catchers preferentially
     from the QB's team, adjusting the multinomial after each draw so a player is not repeated;
   - reject and redraw if the resulting lineup violates the salary cap or slot rules.
4. Estimate `μ_{G_(r)}`, `σ²_{G_(r)}`, `Cov(δ, G_(r))` **once offline per slate** via order
   statistics (P2 §4.2.1). These do not depend on our own lineups, so this is the expensive step
   and it is done exactly once.

*Acceptance:* backtest the ownership model the way P2 did — compare predicted vs realised
ownership per player, and compare against a public consensus ownership projection as a benchmark.
P2 found their Dirichlet regression beat FantasyPros on specific players (they name a Brady case
where "FantasyPros therefore severely overestimated the ownership") and lost on others, and
attributed misses to a missing **momentum** feature they had omitted. Publish our hit rate the
same way, misses included.

**Fallback if realised ownership data is not obtainable:** the model degrades to a stated prior —
`α_g ∝ (points per dollar)^γ` — with γ as the only fitted parameter, and we **label the field
model as un-backtested** rather than presenting it as measured. That is the honest degradation.

---

### STAGE 4 — Portfolio construction

**Stage 4a (ship first — linear, fast, provably-optimal-per-lineup, no simulator required):**
the P1 sequential greedy IP, dropped straight onto the existing exact DP in
`apps/web/lib/fantasy/dfs-optimizer.ts`:

```
for i = 1..N:
    maximise   Σ_j μ_j x_ij
    subject to roster-slot, salary-cap, ≥2-games, team-cap  (already implemented)
               stacking constraints                          (partially implemented: opts.stack)
               Σ_j x*_lj x_ij ≤ τ   for l = 1..i−1           (NOT implemented — this is the gap)
    freeze lineup i
```

with **τ tuned by slate size, 4 to 7** (P1 §5.3: τ = 7 for small slates, τ = 4 for slates with
many games). The existing DP already handles the first two constraint classes exactly; the
overlap constraint is an extra linear cut per prior lineup and does not break the DP's optimality
argument because prior lineups are **fixed constants**, not variables.

*This alone converts a single-lineup tool into a portfolio tool and is the single highest
value-per-line-of-code change available.*

**Stage 4b (needs Σ from Stage 2): rank the portfolio by simulated finish, not by projection.**
Draw `S` correlated slate outcomes `Y^(s) ~ N(μ, Σ)` (Cholesky; fixed seed). For each of our N
lineups and each draw, score it, place it against the simulated field from Stage 3, look up the
payout, and average:

```
ROI_i  =  (1/S) Σ_s  payout( rank of F_i^(s) among {G_o^(s)} ∪ {F_j^(s)}_{j≠i} )  /  entry_fee  −  1
```

Report **portfolio** EV as `E[Σ_i payout_i]`, and report `p(loss)` alongside it — because §6 says
the better portfolio has the *worse* p(loss) and the customer must be told that before they enter.

**Stage 4c (the correct objective; needs 4b): variance direction from Proposition 4.1.**
Solve the LP `max μ_w` over the feasible set. If the best achievable mean is **below** the
benchmark `R_b` (the simulated cash line, or `G_(r_d)`), we are in case (i) and add `+λσ²_w`;
otherwise case (ii) and subtract `−λσ²_w` restricted to `μ_w ≥ R_b`. Grid over λ, solve a BQP for
each, keep the best. This is where "cash mode vs GPP mode" stops being a UI toggle with two
hand-tuned weights and becomes **a sign determined by a measurement**.

---

### STAGE 5 — The determinism and reproducibility layer (this is the GSE-only part)

Every simulated slate emits a **receipt**:

```
{ slate_id, model_version, seed, S (number of draws),
  mu_hash, sigma_hash, field_model_hash, payout_curve_hash,
  tau, lambda, N, generated_at, hash_chain_prev }
```

Given the seed and the published `μ`, `Σ`, field parameters and payout curve, **any third party
re-runs the identical simulation and gets bit-identical lineups.** Publish `recompute-sim.ts`
alongside the existing `recompute.ts` in the Glass Ledger plan.

This is the whole thesis. A Monte Carlo engine sounds like the opposite of "we're not AI, we're
math you can read" — until the seed is published, at which point it is *more* readable than a
projection, because a projection is a number someone asserts and a seeded simulation is a
computation anyone can repeat. Frame it as **deterministic given the seed**, never as
"AI-powered simulation."

---

## 8. WHAT THE LITERATURE DOES **NOT** ESTABLISH (do not overclaim these)

- **Nobody publishes calibration of the simulation itself.** Every paper above reports P&L or
  contest ranks. Not one reports whether the simulated distribution of lineup scores matched the
  realised distribution — no PIT histogram, no reliability diagram on `P(lineup > t)`, no
  coverage of the simulated field's order statistics. **This is the single largest open gap in
  the entire field**, and it is the one GSE is structurally built to fill. Cross-reference:
  `_propfinder-teardown-final.md` found the same absence on the props side.
- **The sample sizes are small.** P1's baseball evidence is **ten dates**. P3's is **16 contests**.
  P2's is **17 weeks**, one season, one site. P2's own top-heavy result has sd(P&L) = 1265.9
  against E(P&L) = 123.9 — a t-statistic near 0.1 per week; over 17 weeks that is nowhere near
  significance and **P2 does not claim it is**. Do not cite these as proof that the method wins.
  Cite them as proof that the method is *published, specified and reproducible*.
- **P1's own prediction models were weak** and they say so: "we saw in Section 3.2 that the
  regression models had poor performance in terms of predictive accuracy. Therefore, it is not
  clear from our analysis which model has the clear advantage." Their edge came from the
  **portfolio construction**, not the projections. They bought their projections from
  RotoGrinders and DailyFantasyNerd. P3 likewise: "we do not generate our own player points
  projections, but rather use the data from fantasydata.com."
  **The literature's message is that the portfolio layer, not the projection layer, is where the
  measured money was.** That is an unusually cheap edge to acquire.
- **No published academic treatment of duplication ("dupes").** SaberSim ships a Dupes metric;
  I found no paper deriving expected duplicate count from a field model. Given the Dirichlet-
  multinomial DGP it is a short derivation, and it appears to be genuinely unclaimed ground.
  **NOT CONFIRMED** that no such paper exists — only that I did not find one.
- **Field data asymmetry is structural.** P2: "very little data on complete team selections is
  available," and the operators "could easily fit more sophisticated copulas to the data."
  DraftKings and FanDuel can build a strictly better field model than anyone outside. Any claim
  we make about field modelling must be scoped to public post-contest ownership data.
- **Freedom to operate: NOT CONFIRMED.** Four patents already in this intel repo
  (`patent-US10478721B2`, `US11660533B2`, `US9744450B2`, `US9751010B2`, all Groset/Groset/Switzer,
  "Method and system for interactive, interpretable, and improved match and player performance
  predictions in team sports") each mention "simulat*" three times. I did **not** read their
  claims. Search also surfaced US10610790 "Data analytics for daily fantasy sports games" and
  US11305198 "Visually representing virtual fantasy sports contests II" which I did not open.
  A claims read is required before shipping a contest-simulation feature. This is a lawyer task,
  not an agent task.

---

## 9. HONESTY LEDGER

- **P6 (Mlčoch & Hubáček) — PARTIALLY CONFIRMED.** Semantic Scholar confirms title, authors
  (David Mlčoch, O. Hubáček), venue (International Transactions in Operational Research), year;
  the abstract field returned empty
  (`https://api.semanticscholar.org/graph/v1/paper/DOI:10.1111/itor.13344`). Wiley returned
  **HTTP 403** on both the full-text and PDF URLs, and ResearchGate returned **403**. The figures
  "€2439 profit on €7133 invested, ROI over 34%, eight weeks" and "ensemble of generative models
  + mixed-integer quadratic program optimising mean, variance and covariance" come from
  **search-engine result snippets only**. I did not read the page. Treat as unverified.
- **P5 (Newell & Easton), P7 (Bergman & Imbrogno), P8 (Becker & Sun)** — abstract-level only,
  from search results and the Semantic Scholar / De Gruyter / INFORMS landing pages. I did not
  read the full texts. Their contributions as characterised above are at abstract fidelity.
- **P1, P2, P3, P4 — CONFIRMED.** Read directly: P1 and P3 as public PDFs from the authors'
  and arXiv's own servers, text-extracted locally; P2 as a public PDF from
  columbia.edu/~mh2078; P4 from arXiv's HTML rendering. Every equation, table figure and quoted
  sentence attributed to these four was read in the source.
- **RotoWire correlation figures** — read on the article page, four-year sample (2022–2025,
  1,300+ team-stack seasons) as stated by the article. I did not verify their computation.
- **SaberSim** — read the help-centre article. It does **not** state an exact simulation count;
  it says "tens of thousands of times." I have not attributed a specific number to them.
- **Stokastic** — read the public strategy pages. "Tens of thousands" / "thousands of times" is
  as precise as they get publicly.
- **No paywall was crossed, no login attempted, no endpoint scanned.** Two Wiley/ResearchGate
  403s were left as 403s.

---

## 10. USER COMPLAINTS / WHERE THE EXISTING TOOLS ARE FELT TO FAIL

These are complaints about the *category*, sourced from the public methodology and comparison
pages rather than from a forum crawl (see honesty note: I did not scrape a subreddit for this
target).

- **"The sim is a black box."** SaberSim's own description of play-by-play simulation makes the
  correlation structure implicit — there is no matrix to inspect, no seed published, and the
  same slate re-run gives different lineups. Stokastic's comparison page frames the difference
  in *judgment burden*, not in transparency: "In SaberSim, ownership shapes the pool through the
  rules and settings you apply, which puts more of the leverage judgment on you."
  (https://www.stokastic.com/articles/nfl-dfs/stokastic-sims-vs-sabersim-vs-rotogrinders-nfl-2026)
- **Ownership projections are a single number and are frequently wrong.** P2 documents a concrete
  public-projection failure (FantasyPros "severely overestimated the ownership" of Brady) and
  attributes it to a missing momentum feature. Every product ships ownership as a point estimate;
  the literature says it is a random vector.
- **No product tells you it will make you lose more often.** §6's table is the number a customer
  needs before entering a 200,000-person GPP with 50 entries, and nobody publishes it.
- **The ordered lineup list is misleading.** P1 measured Spearman ρ = 0.09 between creation order
  and performance. Any UI that numbers lineups 1..N implies a ranking its own algorithm does not
  support.
- **NOT CONFIRMED:** I did not gather first-person user complaints from Reddit, Discord, app-store
  reviews or forums for this target. That is a separate wave-2 task and should be assigned.

---

## 11. THE SEAM — WHAT GSE CAN DO THAT THEY CANNOT OR WILL NOT

1. **Publish the seed and ship the recompute script.** Every sims vendor is structurally
   non-reproducible: no seed, no published covariance matrix, no published field parameters.
   GSE already has the Glass Ledger pattern (hash-chained, pre-commitment, `recompute.ts`,
   OpenTimestamps). Extending it to `recompute-sim.ts` costs one artefact and makes GSE the only
   simulator in the category a stranger can verify. **A competitor funded by affiliate revenue
   will not do this, because a reproducible sim is an auditable sim.**
2. **Calibrate the simulation and publish the reliability diagram.** Nobody in §1 does this.
   The sim emits `P(lineup score > t)`; that is a probability forecast; it can be scored with
   Brier / reliability-resolution decomposition and a PIT histogram, on exactly the machinery
   `packages/prediction-engine/src/calibration*` already contains. **"Our simulator is
   calibrated, here is the diagram, here is n"** is a claim literally no one else in DFS can
   currently make, academic or commercial.
3. **Publish the covariance matrix as a product.** The four benchmark correlations (§3e) are
   public knowledge; nobody publishes their full estimated matrix. It is inspectable, it is
   falsifiable, and it is "math you can read" in the most literal possible sense.
4. **Report p(loss) next to EV.** §6 shows the better model loses more often. Reporting only the
   flattering half of that is the standard industry practice and it is precisely the FTC
   substantiation exposure documented in `_competitor-mistakes-lessons.md`. Reporting both is
   cheap, honest, and unimitable by anyone selling on win-rate.
5. **The portfolio layer is cheap and nobody's projections are good.** P1 and P3 both *bought*
   their projections and still made money from portfolio construction alone. GSE already has an
   exact DP optimizer; adding the overlap constraint (Stage 4a) is a small diff with a large
   effect and needs no simulator at all.
6. **Reject "AI." The positioning is a perfect fit.** A seeded Monte Carlo over a published
   covariance matrix, ranked by a published payout curve, is deterministic statistical modelling.
   Every competitor will market this as AI. GSE's rule 8 forces the better and more accurate
   description, and here the honest description is also the stronger one.
7. **Cross-sport transfer.** P1's explicit conclusion is that the method is domain-general:
   "our approach can easily be extended to other problems with constrained resources and a
   top-heavy payoff structure." The same portfolio engine serves DFS lineups, parlay
   construction, and any top-heavy contest — and GSE already runs seven sports.

**Where GSE is currently short:** `apps/web/lib/fantasy/dfs-slate.ts` is a **fictional
illustrative slate** ("Fictional players, real team codes, illustrative numbers"), and its
projected ownership is a single hand-set number per player. Under rule 1 (no fake data) and law 8
(no fabricated product data) none of this can ship as a real board — the slate needs a real feed
before any of the above is a product rather than a demo. That is a prerequisite, not a stage.

---

## 12. CONCRETE BUILD ITEMS (ordered by value ÷ effort)

| # | Item | Entry point | Effort | Why |
|---|---|---|---|---|
| B1 | **Overlap constraint + N-lineup sequential greedy**, τ tuned 4–7 by slate size | `apps/web/lib/fantasy/dfs-optimizer.ts` (the DP is already exact; add a fixed-lineup cut per prior solution) | S | Converts a single-lineup tool into a portfolio tool. P1 measured single-lineup **median profit −100%**. Needs no simulator. |
| B2 | **Nearest-neighbour σ and ρ estimator + PSD projection**, gated against the four published NFL correlations | new `packages/prediction-engine/src/dfs/covariance.ts`; historical player-games already in the graded pool | M | The only covariance recipe in the literature that is both cheap and conditional on projections. Unlocks B3, B4, B6. |
| B3 | **Seeded correlated slate simulator** — Cholesky on Σ, S draws, fixed seed, receipt with `{seed, S, mu_hash, sigma_hash, model_version}` | new `packages/prediction-engine/src/dfs/simulate.ts`; receipt pattern mirrors `calibration-commitment.ts` / `packages/crypto` | M | The engine. Reproducible by construction, which is the entire differentiator. |
| B4 | **Simulation calibration report** — PIT histogram + reliability diagram on `P(lineup > t)` and on the field's order statistics | reuse `packages/prediction-engine/src/calibration/` and `calibration-map.ts` | M | **Nobody in the category, academic or commercial, publishes this.** Highest-differentiation item on the list. |
| B5 | **Realised-ownership collection job** (start the clock now) | `apps/web/app/api/cron/*` + a new table; same "start the record early" logic as the Glass Ledger | S | The Dirichlet regression cannot be fit without a history. Every day not collecting is a day of moat not accruing. Collection is not publication — safe to start immediately. |
| B6 | **Dirichlet-multinomial field model** — Dirichlet regression on `α_g = exp(Xβ)`, mixture copula with stacking probability q | new `packages/prediction-engine/src/dfs/field.ts` | L | P2's core contribution. Gated on B5 having enough history. Ship the stated-prior fallback, clearly labelled un-backtested, until then. |
| B7 | **Proposition 4.1 variance-sign selector** — LP for `max μ_w`, compare to benchmark, then grid-over-λ BQP | `dfs-optimizer.ts` mode selection (replaces the hand-tuned `GALAXY_OBJECTIVE_WEIGHT` cash/gpp/leverage heuristics) | M | Turns "cash mode vs GPP mode" from two hand-set constants into a sign derived from a measurement. Directly parallel to the `e = p − q` doctrine. |
| B8 | **`recompute-sim.ts`** — third party re-runs our sim from published seed + Σ + field params + payout curve, gets bit-identical lineups | mirror `recompute.ts` from the Glass Ledger plan | S | Makes "auditable" literally true. Cheap once B3 emits receipts. |
| B9 | **p(loss) reported beside EV** on every simulated portfolio | wherever portfolio EV renders | S | §6: the better portfolio loses more often. Must be disclosed. FTC-safe and unimitable. |
| B10 | **Expected-duplicates ("dupes") derivation** from the field model | follows B6 | S | Vendors ship it as a number; no published derivation found. Cheap credibility. |
| B11 | **Shapiro-Wilk normality report per position**, published with denominators | follows B2 | S | P3 got 76% of QBs. One honest artefact nobody else ships; justifies the Gaussian engine instead of assuming it. |
| B12 | **Patent claims read** on the six patents named in §8 before any contest-sim feature ships | founder / counsel, not an agent | — | FTO is **NOT CONFIRMED**. Blocking for launch, not for R&D. |

---

## 13. THE ONE-LINE SUMMARY FOR THE CODING AGENT

Build B1 first — it is a small diff to an optimizer that already exists, it is the change the
literature says produced most of the measured money, and it needs no simulator. Then B2 and B5
in parallel (one is math, one is a cron job that has to start accruing history today). B3 gives
you the engine, and B4 is the thing that makes it a *GSE* engine rather than a worse SaberSim:
**we are the only people who will publish the seed and the calibration diagram.**

And the doctrine transfers exactly. `e = p − q` on the betting side; on the DFS side the
benchmark is the field's order statistic instead of the no-vig market price, and Proposition 4.1
says the correct risk posture flips sign around it. Same idea, different `q`.

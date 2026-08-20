# Ten-cluster literature stack — mapped onto Beexly/Sports

Generated: 2026-08-20
Review type: scoping, GSE-mapped
Source of truth: [Beexly/Sports](https://github.com/Beexly/Sports)
GitHub search: `github__search_code` + `github__search_repositories` across all ten clusters, plus local Sports tree.

This note does **not** reopen the frozen MVE. It says what the papers require, what the repo already has, and which GitHub libraries are real implementations rather than title-matches.

---

## How the ten areas fit together

| Research area | Moves the needle by | Lives in Beexly/Sports today |
|---|---|---|
| 1. James-Stein shrinkage | Making the MVE model actually differ from market | `jamesSteinShrink` is a **staking haircut toward zero**, not the outcome-model layer. Hierarchical NB filter exists as R-9 shadow. |
| 2. E-process theory | Making certification statistically unassailable | Frozen side-adaptive asymmetric fractional formula is in the local tree (`mve-eprocess.ts`). GitHub main indexes older e-process kernels. |
| 3. Market efficiency / FLB | Defining where a real edge could still exist | Shin-devig is wired. Bickel–Kim is the prior against totals mean-efficiency. |
| 4. Price discovery | Telling us which venues to watch first | Kalshi client is read-only GET. Polymarket remains env-gated OFF. No Hasbrouck IS job. |
| 5. Dixon-Coles distributions | Enabling derivative and distributional edges | Soccer-only τ(ρ). Baseball is independent Poisson **without** τ. |
| 6. Microstructure dispersion | Powering BookGrade / PulseScore | `bookgrade-v1.ts` shipped from L-18 totals BPQI. |
| 7. IDR / multicalibration | Adding resolution after shrinkage | Binary group-indicator patch exists. Full IDR CDF layer does not. |
| 8. Win-probability martingales | Adding live / sequential diagnostics | Live orchestrator has a particle-filter slot. Not the MVE primary. |
| 9. SMC / online filters | Making prospective updates rigorous | `nb-rbpf.ts` is Liu–West + Laplace on GitHub. MVE runner currently collapses pitchers/umpires to 1. |
| 10. Prediction-market data | Opening the highest-upside future data path | Kalshi public GET only; lock snapshot not persisted. Polymarket hold. |

**Current-moment priority (unchanged):** #1 + #2, because that is exactly what the MVE requires.

**If the MVE dies:** #6 and #10 become the business. BookGrade/PulseScore are already a trust product. Exchange/prediction-market capture is the only data path that is not a sportsbook follower.

---

## What is already frozen (do not retune)

From [`docs/ops/edge/2026-08-20-mve-prereg-v2.md`](https://github.com/Beexly/Sports/blob/main/docs/ops/edge/2026-08-20-mve-prereg-v2.md):

- MLB full-game totals, 6–3h entry, Shin-devig, ≥3 books, quote age ≤ 15 min.
- Side-adaptive asymmetric fractional e-variable, λ = 0.3:
  `E = 1 + 0.3 · (W · (q_bet/m_bet) + (1−W) · (1−q_bet) − 1)`
- Composite null: market probability of the **bet side** is an **upper bound** on true p.
- Certification E ≥ 20 at a scheduled checkpoint; kill E ≤ 0.10; early abort < 0.01 after 50.
- Prospective track (only if certified) uses vig-inclusive `b_i = 1/D_i`.

The runner is `scripts/edge-lab/run-mve.ts`. Model probability comes from `NbRbpf` (`packages/prediction-engine/src/research/nb-rbpf.ts`). Outcome is blocked on DB auth in the ledger (H-F5), not on missing math.

---

## 1. James-Stein shrinkage and empirical Bayes

### What the papers actually say

**James & Stein (1961), *Estimation with Quadratic Loss*.** For k ≥ 3 i.i.d. N(θ_i, 1) means, the usual MLE X is inadmissible under summed squared error. The estimator

`θ̂_i = (1 − (k−2)/‖X‖²) X_i`

has strictly smaller total MSE than X for every θ. Dominance is **aggregate**, not componentwise. Stein (1956) proved inadmissibility; James–Stein gave the usable form.

**Efron & Morris (1975), JASA 70(350):311–319.** ([PDF](https://jhanley.biostat.mcgill.ca/bios602/MultilevelData/EfronMorrisJASA1975.pdf))

Three load-bearing results for GSE:

1. **Empirical-Bayes derivation.** If θ_i ~ N(μ, τ²) then the Bayes rule is a shrinkage of X_i toward μ with weight `B = σ²/(σ²+τ²)`. Plugging in the unbiased estimate `(k−2)/S` for `1/(1+τ²)` recovers James–Stein. Positive-part `(k−2)/S)+` is strictly better.
2. **Arcsine for binomial rates.** 1970 batting averages, 18 players, first 45 AB. Hits are binomial, so they transform `X_i = √n arcsin(2y−1)` to get approximately unit-variance normals **before** shrinking. On those data Stein’s rule had 3.50× efficiency vs MLE (squared-error 5.01 vs 17.56). Retransform to get batting-average estimates.
3. **Unequal variances (Section 3, toxoplasmosis).** When `X_i | θ_i ~ N(θ_i, D_i)` with known, different D_i,

   `B_i = D_i / (A + D_i)`,  `θ̂_i = (1 − B_i) X_i`

   A is estimated from the data (MLE / information-weighted). Cities with large D_i are pulled in harder. Rankings **change**: a large noisy X_i can rank below a smaller precise X_j. This is the multiple-sample-size layer.

They also introduce **limited translation** so one extreme component (Clemente) is not over-shrunk. Component risk of raw JS can be as large as k/4 times the MLE; limited translation caps that.

**Efron (2010), *Large-Scale Inference*.** The same hierarchy at thousands of tests: estimate the prior from the ensemble, then shrink. Tweedie’s formula recovers James–Stein when the log-marginal is quadratic and sampling variance is **common**. The 2011 Tweedie paper (and the LSI pages inspected in the follow-up pass) do **not** specify `D_i/(A+D_i)` or an arcsine. Unequal-n is Efron–Morris §3, not LSI.

**James & Stein (1961) unequal-σ existence.** Display (41) in the Berkeley paper is an existence bound for uncorrelated coordinates with known unequal variances. It does **not** recommend an analogue of the constant `p−2`, and it never treats binomials or the arcsine. The operational unequal-n estimator is Efron–Morris §3, not a drop-in from 1961. Secondary recipes `B_i = σ̂_i²/(τ̂²+σ̂_i²)` (Said 2017) are the practical form; they are not stated in the three named papers.

**Fay & Herriot (1979)** is the small-area version with a regression mean: `θ_i = x_i'β + u_i`. Same B_i algebra, covariates in the target. For GSE that is “shrink team/pitcher residuals **after** park/weather/market are partialled out.”

Accessible derivation of the multi-sample-size estimator: [Chris Said (2017)](https://chris-said.io/2017/05/03/empirical-bayes-for-multiple-sample-sizes/), with Python/R at [csaid/empirical_bayes](https://github.com/csaid/empirical_bayes).

### Why this is the MVE’s missing layer

The market already shrinks. If GSE’s team/pitcher/park effects are raw MLEs (or a particle filter with `nPitchers = 1`), `q` collapses onto `m` and the e-process tests a market echo.

Correct move:

1. Work on a variance-stabilized scale (arcsine for rates; log-mean / linear predictor for NB runs).
2. Per-unit `B_i = σ_i² / (τ² + σ_i²)` with `σ_i²` from that unit’s sample size.
3. Shrink **market-orthogonal residuals**, not the market price itself.
4. Limited translation on stars (the Clemente problem: Acuña, Ohtani, deGrom).

### What GitHub has (GSE)

| File | What it actually does | JS-correct? |
|---|---|---|
| [`packages/prediction-engine/src/edge-lab/kelly.ts`](https://github.com/Beexly/Sports/blob/main/packages/prediction-engine/src/edge-lab/kelly.ts) `jamesSteinShrink` | Positive-part JS of **edges toward zero**, equal-variance, `k ≤ 2 → all zeros` | Right for a **stake haircut**. Wrong as the outcome model. |
| [`packages/prediction-engine/src/player-rate-posteriors.ts`](https://github.com/Beexly/Sports/blob/main/packages/prediction-engine/src/player-rate-posteriors.ts) | Beta-binomial / normal-normal with **fixed k = 12** | Empirical Bayes shape, not data-driven τ², not unequal-n JS. |
| [`packages/prediction-engine/src/research/nb-rbpf.ts`](https://github.com/Beexly/Sports/blob/main/packages/prediction-engine/src/research/nb-rbpf.ts) | Hierarchical NB, Liu–West on log φ and ridge | This is the right *family*. MVE runner currently sets `nPitchers: 1`, `nUmpires: 1`. |
| [`packages/prediction-engine/src/edge-lab/props-hb.ts`](https://github.com/Beexly/Sports/blob/main/packages/prediction-engine/src/edge-lab/props-hb.ts) | Hierarchical Bayes on player props | Shadow / not the totals MVE. |

### What GitHub has (external, useful)

- [csaid/empirical_bayes](https://github.com/csaid/empirical_bayes) — MSS James-Stein + pooled + MCMC simulations.
- [kercheval-a/JSE](https://github.com/kercheval-a/JSE) — James-Stein for the leading eigenvector (covariance, not means).
- David Robinson’s batting-average EB tutorial is the binomial/Beta analogue of Efron–Morris; not a substitute for unequal-n normals.

**Do not copy** portfolio JS-toward-zero into the MVE predictive `q`. That is the staking module’s job after an edge exists.

---

## 2. E-processes, test martingales, anytime-valid inference

### What the papers actually say

**Ramdas, Grünwald, Vovk, Shafer (2023), *Stat Sci* 38(4).** [arXiv:2210.01948](https://arxiv.org/abs/2210.01948)

- An **e-variable** for a (possibly composite) null P is nonnegative with `E_P[E] ≤ 1` for **every** P in the null.
- A **test martingale** is a product of predictable one-round e-variables; wealth starts at 1.
- An **e-process** is a nonnegative process that is an e-variable at **every stopping time**. Equivalent: it is dominated by a test-martingale family, one per P in the null (`E_t ≤ inf_P M_t^P`).
- **Ville:** `P(∃t: E_t ≥ 1/α) ≤ α`. This is the certification math: E ≥ 20 is an anytime-valid 5% test.
- For **composite** nulls, a likelihood ratio against one P is **not** automatically an e-process against all of P. You need the infimum over the null (reverse information projection / GROW), or a process whose conditional expectation is ≤ 1 at **every** null point.
- “Do not bet the farm”: once wealth hits 0 it stays 0. Fractional λ is the insurance.

**Waudby-Smith & Ramdas (2024), JRSS-B.** [arXiv:2010.09686](https://arxiv.org/abs/2010.09686). Bounded-mean betting martingales. For each candidate mean m, wealth `∏ (1 + λ_t (X_t − m))` with predictable λ_t is a martingale **if** the true mean equals m, and a supermartingale under one-sided composite means. This is the language of the MVE increment: it is a **betting capital process**, not a Bernoulli LR.

**Grünwald, de Heide, Koolen (2024), JRSS-B.** [arXiv:1906.07801](https://arxiv.org/abs/1906.07801). **GRO**: among all e-variables, maximize `E_Q[log E]`. For composite H0 the GRO e-variable is a Bayes factor with a **forced** prior on the null (reverse information projection). Optional **continuation** (multiply study-level e-variables, decide later whether to run another study) is valid even when optional **stopping** inside a poorly specified model is subtle.

**Shafer (2021), JRSS-A.** [arXiv:1903.06991](https://arxiv.org/abs/1903.06991). Evidence = betting score. Composite-null betting scores are defined by the worst-case game against every P in H0.

### Why the MVE form is the composite-null version

Point-null LR increment:

`W · (q/m) + (1−W) · (1−q)/(1−m)`

has E[I | p] = 1 at **p = m**, but at **p < m** (stronger null, true probability even smaller than the market) the miss term `(1−q)/(1−m)` can have expectation **> 1** when q < m. That is not an e-variable for `{p : p ≤ m}`. C-48 recorded this.

Composite form (frozen):

`I = 1 + λ ( W · (q/m) + (1−W) · (1−q) − 1 )`

E[I | p] is linear in p, ≤ 1 at p = 0 and at p = m, hence ≤ 1 on the whole composite. Increments ≥ 1−λ = 0.7. Side-adaptive orientation (OVER iff q > m, else UNDER) is one process, no multiplicity, as long as the side rule is **predictable**. DeepSeek round-3 verdict on that amendment: PROVEN.

λ = 0.3 is GRO-insurance (fractional Kelly / not betting the farm), not a power-optimal GROW mixture. A GROW mixture over unknown edge size is P-F in the 2026-08-19 dossier — power, not validity. Do not compute it on the frozen cycle.

Waudby-Smith & Ramdas: each round’s λ_t(m) must be **predictable** and lie in the generally asymmetric interval `(-1/(1−m), 1/m)` so `1 + λ_t(m)(X_t − m)` stays nonnegative. None of the four SAVI papers uses the single term “asymmetric fractional e-variable”; GSE’s name is a construction, not a literature label. Grünwald et al. distinguish **optional continuation** (multiply study-level conditional e-variables) from data-level **optional stopping**, which needs a sequentially decomposable specification; a stopping time on a finer filtration than the one used to build E_(m) can destroy the conditional e-variable property.

### What GitHub has (GSE)

Several **different** e-process kernels. They are not interchangeable.

| File | Null | Form | Role |
|---|---|---|---|
| [`formal-heartbeat/src/e-process.ts`](https://github.com/Beexly/Sports/blob/main/formal-heartbeat/src/e-process.ts) | Bernoulli SLO violations | Test supermartingale | Ops heartbeat, not betting |
| [`packages/prediction-engine/src/forecast-skill-eprocess.ts`](https://github.com/Beexly/Sports/blob/main/packages/prediction-engine/src/forecast-skill-eprocess.ts) | y ~ Bern(m) **point** market | Symmetric LR `p/m` vs `(1-p)/(1-m)` | Skill vs market. **Not** the MVE composite null. Header is explicit. |
| [`packages/prediction-engine/src/bernoulli-eprocess.ts`](https://github.com/Beexly/Sports/blob/main/packages/prediction-engine/src/bernoulli-eprocess.ts) | Fixed θ0 (e.g. 0.524) | LR / mixture | CLV certification toolkit; dossier P-F |
| [`packages/prediction-engine/src/instrumented-eprocess.ts`](https://github.com/Beexly/Sports/blob/main/packages/prediction-engine/src/instrumented-eprocess.ts) | Randomized publication | Value + shift | ADR 009 |
| `packages/prediction-engine/src/research/mve-eprocess.ts` (local tree; **GitHub filename search on main returned 0 hits**) | Composite p ≤ m | Side-adaptive asymmetric fractional | **The frozen MVE.** Confirm it is on the branch that will run H-F5. |
| [`packages/prediction-engine/src/research/nb-rbpf.ts`](https://github.com/Beexly/Sports/blob/main/packages/prediction-engine/src/research/nb-rbpf.ts) | Synthetic NB | Feeds q into capital.ts / MVE | Shadow engine |

Attack surface if someone conflates `forecast-skill-eprocess` with the MVE: they will certify against a **point** null the MVE already rejected as misspecified.

### What GitHub has (external, canonical)

- [gostevehoward/confseq](https://github.com/gostevehoward/confseq) — confidence sequences; `src/confseq/betting.py` is the Waudby-Smith/Ramdas betting CS.
- [WannabeSmith/betting-paper-simulations](https://github.com/WannabeSmith/betting-paper-simulations) — paper’s own sims.
- [AlexanderLyNL/safestats](https://github.com/AlexanderLyNL/safestats) — R package for Safe Testing (GRO e-variables, safe t-test).
- [cran/safestats](https://github.com/cran/safestats) — CRAN mirror.
- Topic `e-values`: mostly LLM-audit / drift tools (csnyder256/shadow-options-trading-lab, driftbet). **Not** sports-betting composite-null e-processes. Closest sports-adjacent is GSE itself.

There is **no** public repo that implements the side-adaptive asymmetric fractional increment against a Shin-devigged market upper bound. That construction is GSE-specific. Validity rests on the algebra above, not on a third-party library.

---

## 3. Market efficiency and favorite-longshot bias

**Shin (1991), JPE** — *The optimality of the favorite-longshot bias in racetrack betting* — is the paper on this list. A second 1991 Shin paper, *Optimal Betting Odds against Insider Traders* (*Economic Journal* 101(408)), is the square-root pricing result (posted-price ratio equals the square root of the win-probability ratio). Do not conflate them. Empirical insider-share (`z`) estimation is Shin (1993), not 1991. Shin-devig in `shin-devig.ts` implements the insider-pricing extractor; that is the right fair-price step for the MVE runner.

**Ottaviani & Sørensen (2008 / 2005 working paper).** Survey plus the parimutuel-vs-fixed-odds comparative static: adverse selection is worse on longshots in fixed-odds (Glosten–Milgrom markup); the insider-share comparative static can reverse in parimutuel markets.

**Levitt (2004), *Economic Journal*.** Gambling markets are **not** organized like financial markets. Books do not have to balance. NFL spreads, 2001–02 contest: 60.6% of 19,770 wagers on favorites; visiting favorites take 68.2% of bets and cover 47.8%; home underdogs cover 57.7%. Bettors win 49.45% of bets; expected gross profit rises from 5.0% to 6.16% versus a balanced book. This is **quantity shading on spreads**, not MLB totals or moneyline FLB.

**Bickel & Kim (2014), *Applied Financial Economics* 24(18):1229–1234.** Strongest prior against a totals **mean** edge. They used **both run lines and money lines** (actual juice, not an assumed −110). Result: little evidence the MLB O/U market is inefficient. Earlier papers that ignored juice can **flip** conclusions. This is why the 2026-08-19 dossier ranked “grade TOTAL/SPREAD CLV in price space” as P-A. Full tables were not opened in the follow-up pass, so it is unverified whether they tested FLB-by-odds-bin or juice-by-total interactions versus a global efficiency null.

None of these four papers jointly tests, on MLB totals: insider-FLB statics, Levitt quantity shading, and juice-by-total interactions. Surviving signal, if any, lives in those gaps — plus 6–3h path, book-level outliers, pitcher/park, PM divergence, and hierarchical residuals after shrinkage.

### GitHub

- [Lisandro79/BeatTheBookie](https://github.com/Lisandro79/BeatTheBookie) (653★) — Kaunitz et al. 2017 closing-odds outlier strategy. This is the X1 experiment in the edge roadmap, **not** an independent totals model.
- Shin-devig: GSE’s own [`shin-devig.ts`](https://github.com/Beexly/Sports/blob/main/packages/prediction-engine/src/shin-devig.ts).

---

## 4. Price discovery and information share

**Hasbrouck (1995), *Journal of Finance*.** One security, many markets: information share = each venue’s contribution to the variance of the efficient-price innovation in a VECM.

**Hayashi & Yoshida (2005).** Covariance of **non-synchronously** observed processes. Books and exchanges do not tick together; naive lagged covariance is biased. Any lead-lag job on 15-minute Odds snapshots needs HY (or a synchronized clock), not Pearson correlation of last quotes.

**Aktuğ & Torul (2026), “Price Discovery Across Political Prediction Markets.”** [PDF](https://web.bogazici.edu.tr/torul/pridis.pdf). 2024 Trump-win contracts, six-market 5-minute Hasbrouck VECM (n = 16,460). They handle asynchronicity with a 5-minute last-observation grid, 30-minute forward-fill, and a fresh-quote filter — **not** Hayashi–Yoshida.

Six-market IS midpoints (Cholesky bounds in brackets where reported):

| Venue | IS midpoint |
|---|---|
| Polymarket | 0.475 [0.375, 0.576] |
| Betfair | 0.371 [0.267, 0.474] |
| BetOnline | 0.110 |
| Bovada | 0.059 |
| Unibet | 0.044 |
| William Hill | 0.024 |

DEX + exchange + sportsbook composite: IS midpoints 64.2% / 33.0% / 5.1%. Gonzalo–Granger component share on the sportsbook composite is **−24.3%** (systematic follower). The “nearly 85%” headline is Polymarket+Betfair in this **clean six-market full sample**. In the October–November **Kalshi window** the analogous 85% is Polymarket (43.8%) + Kalshi (40.9%); Betfair’s midpoint falls to 5.7%. Pinnacle’s ILS in that window is ~0.14 (speed, not information). IS midpoints are a **ranking**, not precise quantities: in the 7-market spec Polymarket’s 90% bootstrap CI is [1.8%, 84.4%].

Horizon: Polymarket leads at 5-min (IS 0.429 vs Betfair 0.282); Betfair leads at 15-min and coarser (0.418 / 0.476 / 0.432). Sharp books / William Hill stay in a 3–6% band at every frequency. Marketable prices change in 5.4% of 5-minute bins on Betfair and 1.1% on Polymarket, versus **0.1–0.4%** on sportsbooks; forward-fill then produces a run of exact-zero innovations and a single catch-up jump. Authors warn that election contracts are a sideline for sportsbooks, so low IS conflates venue organization with inattention.

If GSE’s archive is sportsbook quotes, it is mostly a **follower tape**. Edge research that never sees an exchange or prediction market is structurally downstream. Do not treat a 15-minute Odds API grid as Hayashi–Yoshida.

### GitHub

Hasbrouck implementations are small academic repos, not production sports libraries:

- [richie-ma/pricediscovery](https://github.com/richie-ma/pricediscovery) — Hasbrouck (1995) in R
- [anshul96go/Information_Share_Currency_Market](https://github.com/anshul96go/Information_Share_Currency_Market) — FX spot/futures IS
- [KinH8/Hayashi-Yoshida-estimator](https://github.com/KinH8/Hayashi-Yoshida-estimator) — lead-lag via HY (13★, the usable one)
- [Efstratios7/Hayashi-Yoshida-correlation-estimators](https://github.com/Efstratios7/Hayashi-Yoshida-correlation-estimators)

**GSE has no IS job.** Forward snapshot design (cluster 6) is what makes this computable later.

---

## 5. Dixon-Coles, bivariate Poisson, copulas

**Dixon & Coles (1997), JRSS-C 46(2):265–280.** Independent Poisson under-rates {0-0, 1-0, 0-1, 1-1}. Correction τ(x,y; λ,μ,ρ) on those four cells only; time-decayed MLE so recent form weighs more. Built to price **full score distributions**, hence totals, handicaps, and correct scores.

For **MLB runs**, low-score τ is the wrong default (header of GSE’s own file says so). The analogue is: overdispersed margins (negative binomial / per-inning convolution) plus a copula or low-score-style residual dependence between home and away runs. That is what lets alternate totals and first-half totals be **the same model**, not a second point estimate.

### GitHub (GSE)

[`packages/prediction-engine/src/dixon-coles.ts`](https://github.com/Beexly/Sports/blob/main/packages/prediction-engine/src/dixon-coles.ts) — soccer-only, ρ default −0.13, never reads books. Baseball/hockey keep independent Poisson without τ. `overUnderProbabilities` in `poisson.ts` is built and **not** called from the independent-fair-value path (dossier P-E).

### GitHub (external)

Dixon-Coles is the most implemented model in this list, almost all **soccer**:

- [martineastwood/penaltyblog](https://github.com/martineastwood/penaltyblog) (213★) — production-grade DC, RPS, betting helpers. Closest to steal-the-pattern.
- [Torvaney/mezzala](https://github.com/Torvaney/mezzala) — team-strength DC
- [Hicruben/world-cup-2026-prediction-model](https://github.com/Hicruben/world-cup-2026-prediction-model) (89★)
- [machina-sports/sports-skills](https://github.com/machina-sports/sports-skills) (206★) — GSE already ported their τ(ρ) and Kalshi ET clock
- Dozens of World-Cup 2026 forks: treat as noise

No high-quality public **MLB copula / bivariate NB totals** library turned up. That is still a GSE build (P-E), not a clone.

---

## 6. Microstructure, transaction costs, book dispersion

**Vandenbruaene et al. (2025), *Economica* 92(366):644–673.** Digitalization cut gambler transaction costs >60% (2000–2023), **but dispersion persists**. Mixed-strategy models under imperfect information predict exactly that: some books stay wide, some copy, some lead.

**Marshall (2009)** and the copycat/steam literature: temporary cross-book inefficiency is removed quickly; what remains is **which book is late** and **which book is structurally wide**.

This is the scientific case for BookGrade (price quality vs consensus close) and PulseScore (how live the quotes are). It is also the spec for **forward snapshot capture**: timestamps, book IDs, quote age, ≥N books, no mixing of stale and fresh in one “consensus.”

### GitHub (GSE)

[`apps/web/lib/truthmetrics/bookgrade-v1.ts`](https://github.com/Beexly/Sports/blob/main/apps/web/lib/truthmetrics/bookgrade-v1.ts) — frozen L-18 totals BPQI, 241 MLB clean closes, Shin no-vig reference. Spread BPQI **excluded** (different numbers, not vig shade). Explicitly “quality score, not a betting signal.”

If MVE dies, this file is the trust-business kernel, not a leftover experiment.

---

## 7. Calibration, IDR, multicalibration

**Platt (1999); Zadrozny & Elkan (2002).** Score-to-probability maps. **Preserve ranking; cannot create resolution.** GSE already has Platt IRLS.

**Henzi, Ziegel, Gneiting (2021), JRSS-B.** [arXiv:1909.03725](https://arxiv.org/abs/1909.03725). IDR: nonparametric **conditional CDF** under a partial order on covariates. Calibrated by construction, as sharp as the covariates allow. This is the right **final** distributional layer on totals **after** a hierarchical mean exists.

**Hébert-Johnson et al. (2018); Globus-Harris et al. (2023)** [arXiv:1711.08513](https://arxiv.org/abs/1711.08513), [arXiv:2301.13767](https://arxiv.org/abs/2301.13767). Multicalibration as boosting: each patched computationally-identifiable group strictly reduces squared error. **Only this family in the list can create resolution** from subgroup structure that a single score flattened. Hard-gated on grouping-loss (L-12): currently **blocked** because `PickProofReceipt.modelProb` is null — there is no genuine p̂ to bin.

### GitHub

- [AlexanderHenzi/isodistrreg](https://github.com/AlexanderHenzi/isodistrreg) — canonical IDR (Rust + R)
- [mlr-org/mcboost](https://github.com/mlr-org/mcboost) — multicalibration boosting in R
- GSE: [`packages/prediction-engine/src/calibration/multicalib-audit-patch.ts`](https://github.com/Beexly/Sports/blob/main/packages/prediction-engine/src/calibration/multicalib-audit-patch.ts) — binary/group-indicator special case, **not** full Venn/multicalibration-as-boosting

Do not run IDR/multicalibration on `Pick.confidence`. The edge roadmap STOP list is still correct: that column is a market-structure echo.

---

## 8. Win probability and in-play efficiency

**Stern (1999).** Brownian-motion score progress: live win probability is a martingale under correct specification. Extreme-path diagnostics catch miscalibration that terminal Brier misses.

**Lock & Nettleton (2014).** Random-forest pre-snap NFL WP.

In-play football market-efficiency papers using second-by-second exchange data are the live analogue of cluster 4.

**GSE:** `packages/prediction-engine/src/pipeline/live-orchestrator.ts` already threads a `particleFilterProb`. This is **foundational for a later live/derivative track**, not for the frozen pregame MVE. Do not expand here until the MVE outcome exists.

**GitHub:** [greerreNFL/nfelo](https://github.com/greerreNFL/nfelo) (54★) is the public NFL rating/WP stack; literature already treats nfelo vs close as ~zero residual. Do not import as an edge model.

---

## 9. Sequential Monte Carlo / online state-space

**Chopin & Papaspiliopoulos (2020), *An Introduction to Sequential Monte Carlo*.** Canonical library: [nchopin/particles](https://github.com/nchopin/particles) (search hits via forks; upstream is the book’s code).

**Liu & West (2001).** Combined parameter and state estimation: kernel-smooth static parameters (here log φ, log ridge) **after weighting, before resampling**. That is exactly the comment block in `nb-rbpf.ts`.

**GSE status:** R-9 synthetic null test passed (0/200 seeds with max capital > 20). Planted-edge beats open-loop. **Not** evidence of an MLB edge. MVE runner uses 24 particles, seed 20260820, but `nPitchers: 1`, `nUmpires: 1` — team intercepts only. The prospective track (only if E ≥ 20) is where a fuller SMC/Liu–West hierarchy replaces frozen-or-online empirical Bayes.

Do not replace the frozen MVE cycle with a new filter.

---

## 10. Prediction markets vs sportsbooks

Ng (2026) SSRN 5331995: “Polymarket leads Kalshi in price discovery, particularly when liquidity is high, implying economically meaningful arbitrage opportunities.” Combined with the 85% IS result, the information is on **order-book exchanges**, not dealer books.

### APIs and terms (research now; capture later)

**Kalshi** ([docs](https://docs.kalshi.com/welcome), [rate limits](https://docs.kalshi.com/getting_started/rate_limits)):

- Developer Agreement binds on any API use.
- Public Trade API host used by GSE: `https://external-api.kalshi.com/trade-api/v2`
- GSE client: **GET `/events` and `/markets` only**. No key, no orders. Header of [`kalshi-client.ts`](https://github.com/Beexly/Sports/blob/main/packages/data-ingestion/src/kalshi-client.ts) is explicit: placing an order is prohibited.
- Authenticated API is token-bucket: Basic **200 read / 100 write tokens per second**, default 10 tokens/request → ~20 GET/s on Basic. Higher tiers are volume-gated (Expert earn 0.075% of exchange volume).
- Batch endpoints do **not** save tokens.
- GSE already computes `kalshiFair − bookFairShin` in memory at scoring time; **persisting the lock snapshot is the missing step** (client header, lines 22–24).

**Polymarket:** `INDEPENDENT_POLYMARKET` default OFF; skill `docs/agent-skills/polymarket-hold`. Do not productize arb/copy-trade.

### GitHub (external, data path — not execution)

- [pmxt-dev/pmxt](https://github.com/pmxt-dev/pmxt) (2087★) — CCXT-style unified Polymarket/Kalshi API. **Architecture reference only.** GSE does not ship an execution client.
- [aarora4/Awesome-Prediction-Market-Tools](https://github.com/aarora4/Awesome-Prediction-Market-Tools) (690★) — already triaged in `docs/research/prediction-market-ecosystem-triage-2026-08-09.md`
- [arshka/pykalshi](https://github.com/arshka/pykalshi) (120★) — unofficial Python; WS + retries. Pattern for client resilience, not a new product.
- [qualiaenjoyer/polymarket-apis](https://github.com/qualiaenjoyer/polymarket-apis) — research-env only until counsel lifts the hold.

Prediction-market signals are informational inputs, not investment advice. GSE’s allowed use is **lock-time fair snapshot + CLV/resolution grading**, not routing or copy-trade.

---

## Priority and failure branches

```
                    ┌─ #1 MSS James-Stein on market-orthogonal
                    │     team/pitcher/park residuals
   MVE (now) ───────┤
                    └─ #2 keep composite-null asymmetric e-process
                          (already frozen; do not swap in point-null LR)

   if E ≥ 20 ─────── prospective track: vig-inclusive null,
                     fuller SMC (#9), IDR (#7) as distributional layer,
                     Dixon/copula (#5) only if the residual dependence is real

   if E ≤ 2 ──────── close edge program; publish kill
                     remaining value is #6 BookGrade/PulseScore
                     and #10 exchange/PM capture for the trust + data business
```

#3 tells you not to re-litigate Bickel–Kim’s mean. #4 tells you the archive is a follower tape unless snapshots include Kalshi (now) and an exchange (founder-gated). #8 is live-only.

---

## Concrete next moves (research → engineering, still inside freeze)

1. **Before H-F5 runs:** confirm `mve-eprocess.ts` is on the branch that executes (GitHub main filename search returned 0; local tree has it). Do not compute any other λ/window.
2. **James-Stein layer inside NbRbpf (or a wrapper around its η):** per-unit B_i with actual start-counts / innings, shrink residuals **after** subtracting the Shin-devigged market mean so q is not a restatement of m. Limited translation on extreme pitchers. This is the only model change that can make MVE differ from a market echo **without** violating the freeze on the e-process.
3. **Do not** feed `jamesSteinShrink` from kelly.ts into q. That function zeros slates with k ≤ 2 and shrinks toward 0, not toward a hierarchical prior.
4. **If MVE dies:** persist Kalshi lock snapshots (schema field already named in the client header); keep BookGrade honest (totals only); design HY-capable snapshot clocks so a later IS job is possible.
5. **Do not** build IDR/multicalibration until a genuine modelProb exists (L-12 gate).

---

## Search log (GitHub)

| Query | What it found | Used? |
|---|---|---|
| `jamesSteinShrink repo:Beexly/Sports` | kelly.ts, tests, barrel export | Yes — staking, not MVE |
| `e-process repo:Beexly/Sports` | 65 files: heartbeat, forecast-skill, bernoulli, ADR 009, prereg | Yes — disambiguated |
| `filename:nb-rbpf.ts repo:Beexly/Sports` | research/nb-rbpf.ts | Yes |
| `filename:mve-eprocess.ts repo:Beexly/Sports` | **0 on indexed main** | Gap vs local tree |
| `filename:dixon-coles.ts repo:Beexly/Sports` | soccer DC | Yes |
| `filename:kalshi-client.ts` / `bookgrade-v1.ts` / `multicalib-audit-patch.ts` | all present | Yes |
| `dixon-coles` repos | 370 hits; penaltyblog / mezzala are the serious ones | Yes |
| `confseq` / `safestats` / `isodistrreg` / `mcboost` | canonical paper code | Yes |
| `hasbrouck` / `hayashi-yoshida` | small academic IS/HY repos | Yes |
| `polymarket api` | pmxt 2087★, awesome-list 690★ | Data-path only |
| `BeatTheBookie` | Kaunitz replication | X1, not MVE |
| `topic:e-values` | LLM/audit tools, not sports composite-null | Negative result, useful |
| `"asymmetric fractional"` global code | **0** | Construction is GSE-local |

Papers read in full or near-full this session: Efron & Morris (1975); Ramdas et al. SAVI (arXiv:2210.01948); Waudby-Smith & Ramdas betting abstract/intro; Grünwald et al. Safe Testing (arXiv:1906.07801, through GRO/GROW); Kalshi rate-limit docs. Remaining items cited from abstracts, published summaries, and GSE’s already citation-audited 2026-08-19 dossier.

A follow-up pass independently opened James–Stein (1961) Berkeley PDF, Efron–Morris (1975), Efron Tweedie (2011), SAVI/Safe Testing/WSR/Shafer arXiv HTML, Levitt (2004) PDF, Hayashi–Yoshida (2005), and Aktuğ–Torul pridis.pdf. It did **not** open Shin JPE 1991, Ottaviani–Sørensen 2008, or Bickel–Kim 2014 full texts (abstracts + reconstructions only), nor Hasbrouck (1995) JoF (2000 restatement used). Clusters 5–10 were out of that pass’s scope. Corrections from it are already folded into §§1–4 above.

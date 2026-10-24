# Dossier: Forecast Evaluation & Calibration Literature, applied to GSE

**Slug:** `forecast-scoring-literature`
**Target:** the academic forecast-evaluation literature (proper scoring rules, Murphy/CORP decomposition, reliability diagrams, ECE estimator bias, Venn–Abers / Mondrian conformal, beta & temperature calibration, CLV as a skill proxy, purged-embargoed walk-forward evaluation) — treated as a *competitor whose methods are public and free*, and audited against what `/home/user/Sports/apps/web/lib/calibration/*` and `packages/prediction-engine/src/*` actually do.
**Compiled:** 2026-09-08
**Method:** repo read (file:line cited for every code claim) + WebSearch/WebFetch on public sources (URL cited for every literature claim). No paywall crossed; several primary papers are open-access arXiv/PMLR preprints and are cited at those URLs.

> **Why this dossier is shaped differently from the other wave-2 teardowns.** The "competitor" here has no pricing page and no user complaints. It is the body of method that every serious forecast-evaluation shop uses and that *no* sports-betting product in the wave-1 set (PropFinder, LineStar, FantasyPros, FantasyGuru, Scores24) publishes any of. That asymmetry is the seam. PropFinder ships a reconstructable rating formula with **no calibration published at all** (`_propfinder-teardown-final.md`); GSE already has more calibration machinery than any of them. The risk for GSE is therefore not "we are behind" — it is "we are running the right machinery with the wrong estimators, and the PROVEN gate is currently being decided by estimator noise rather than by model quality." That is the single most important finding below.

---

## 0. Executive summary — the eight findings, ranked

| # | Finding | Severity | Evidence |
|---|---|---|---|
| 1 | The PROVEN ECE floor is being decided by **estimator noise, not calibration**. GSE uses the plug-in **equal-width 10-bin** ECE; at n≈475 a *perfectly calibrated* forecaster expects to measure ≈0.037–0.058 on that estimator. GSE measures 0.0466 against a 0.05 floor. | **CRITICAL** | `compute-live-calibration-metrics.ts:195`; `probability-calibration.ts:380`; [Roelofs 2022](https://proceedings.mlr.press/v151/roelofs22a.html), [Kumar 2019](https://arxiv.org/abs/1909.10155) |
| 2 | The "pooled ECE sits below every stratum it is built from" puzzle in `AGENTS.md` has a **standard, boring explanation**: plug-in binned ECE is positively biased with bias ∝ √(bins/n), so smaller strata mechanically read higher. No signed-error cancellation is required. | **CRITICAL** | derivation §2.2; [Kumar 2019](https://arxiv.org/pdf/1909.10155) |
| 3 | The **Brier floor of 0.22 permits negative skill.** With UNC = 0.2139, BS ≤ 0.22 is BSS ≥ −0.0285 against a constant base-rate forecast. | **CRITICAL** | `calibration-eligibility.ts:71`; §3.1 |
| 4 | The **"3 consecutive GREEN runs" streak provides no statistical validity** — consecutive 6-hourly runs share ≈98.7 % of the same picks. It is repeated peeking at one sample, which *inflates* type-I error. GSE already owns the correct instrument (`forecast-skill-eprocess.ts`) and does not use it as the gate. | **HIGH** | §4; [Ramdas et al. 2023](https://arxiv.org/abs/2210.01948) |
| 5 | `selectivePublishSweep` selects (δ, e, ρ) by maximising RES over an 18+-cell grid and reports the winner's metrics **on the same rows**. No selection-adjusted inference anywhere. | **HIGH** | `selective-publish.ts` §"selectivePublishSweep"; [Hansen SPA](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=264569), [White RC](https://www.sciencedirect.com/science/article/abs/pii/S0927539810000022) |
| 6 | Market-anchored p uses **mean-implied proportional de-vig**. Štrumbelj (IJF 2014) found **Shin probabilities better than basic normalisation for every bookmaker/sport pair tested**. GSE already has `shinDevig` and a three-method comparator that is explicitly *"not wired into pick minting."* | **HIGH** | `compute-live-calibration-metrics.ts:230`; `scoring.ts:638,847`; `honesty/devig-method-compare.ts`; [Štrumbelj 2014](https://www.sciencedirect.com/science/article/abs/pii/S0169207014000533) |
| 7 | Public `/calibration` chart bins by **confidence into 5 equal-width buckets (50-59 … 90-100)**, scores **PUSH as y = 0.5**, and draws a **Clopper–Pearson band computed on a different population than the plotted point**. | **HIGH** | `compute.ts:211-217, 256-261, 303, 305` |
| 8 | ECE/Brier CIs use an **iid percentile bootstrap** on picks that are clustered by game/slate/day → intervals too narrow. `stationary-bootstrap.ts` exists but is wired only to map bands. | **MEDIUM** | `bootstrap-metric-ci.ts`; [Politis–Romano stationary bootstrap, as used in the SPA literature](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=264569) |

---

## 1. What the literature actually says (the "product", mechanically)

### 1.1 Proper scoring rules — the ground floor
A scoring rule is **proper** if the forecaster minimises expected loss by reporting their true belief, and **strictly proper** if that optimum is unique. For binary outcomes the two canonical strictly proper rules are the **Brier (quadratic) score** and the **logarithmic score**; the log score is the only *local* proper rule (it depends only on the probability assigned to the event that occurred). Canonical reference: Gneiting & Raftery, "Strictly Proper Scoring Rules, Prediction, and Estimation" (JASA 2007). A user-facing modern treatment of consistent scoring functions for ML/actuarial practice is [arXiv:2202.12780](https://arxiv.org/pdf/2202.12780).

**GSE status:** Brier is the only proper rule in the eligibility floors (`calibration-eligibility.ts:71`). Log score exists but only in secondary places — `compute.ts:586` (projection artifact), `offline-bakeoff.ts:34`, `calibration-map-bakeoff.ts` (`meanLogLoss`, `diagnoseLogLoss`), `temperature-map.ts:18` (fitting objective). It is **not** a floor and **not** on any public surface.

### 1.2 Murphy decomposition and its bin problem
Murphy (1973) decomposes the Brier score as **BS = REL − RES + UNC**, where REL is mass-weighted (mean forecast − observed rate)² per bin, RES is mass-weighted (observed rate − base rate)² per bin, and UNC = ȳ(1−ȳ). GSE's own machine-readable statement of this is excellent and correct, including the caveat that the identity is exact only when p is constant inside bins (`murphy-res-definition.ts`, `MURPHY_RES_DEFINITION.identityPlain`).

The literature's problem with this form: **the numbers depend entirely on an ad hoc binning choice.** Dimitriadis, Gneiting & Jordan, *"Stable reliability diagrams for probabilistic classifiers"*, PNAS 118(8), 2021 — [PNAS](https://www.pnas.org/doi/abs/10.1073/pnas.2016191118), preprint [arXiv:2008.03033](https://arxiv.org/abs/2008.03033) — state the case directly: *"The classical binning and counting approach to plotting reliability diagrams has been hampered by a lack of stability under unavoidable, ad hoc implementation decisions."*

Their **CORP** approach (**C**onsistent, **O**ptimally binned, **R**eproducible, **P**AV-based) replaces binning with nonparametric isotonic regression via the pool-adjacent-violators algorithm, and yields a decomposition **S̄ = MCB − DSC + UNC** (miscalibration − discrimination + uncertainty) that is exact, bin-free, and reproducible. Reference implementation: R package [`reliabilitydiag`](https://github.com/aijordan/reliabilitydiag); a Python walkthrough exists in the [`scores` package tutorial](https://scores.readthedocs.io/en/stable/tutorials/Isotonic_Regression_And_Reliability_Diagrams.html).

**GSE status:** `brierDecomposition` (`packages/prediction-engine/src/probability-calibration.ts:324-360`) is the classical equal-width **10-bin** version, and it is what feeds the eligibility floors. GSE **already ships a PAV implementation** (`packages/prediction-engine/src/calibration/pav.ts`, `apps/web/lib/calibration/isotonic-pava.ts`) — the CORP decomposition is a small function on top of code that is already in the repo.

### 1.3 The Triptych — what a complete evaluation looks like
Dimitriadis, Gneiting, Jordan & Vogel, *"Evaluating Probabilistic Classifiers: The Triptych"*, International Journal of Forecasting 40(3), 2024 — [arXiv:2301.10803](https://arxiv.org/abs/2301.10803), [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0169207023000997). Three panels, deliberately complementary:

1. **Reliability diagram** → calibration ("are the stated numbers honest?")
2. **ROC curve** → discrimination ("does the score separate winners from losers?")
3. **Murphy diagram** → overall performance *and economic value* ("is it better for a decision-maker at *every* cost-loss ratio?")

The Murphy diagram plots mean **elementary scores** S_θ over the threshold θ. Ehm, Gneiting, Jordan & Krüger, *"Of quantiles and expectiles: consistent scoring functions, Choquet representations and forecast rankings"*, JRSS-B 78(3), 2016 — [arXiv:1503.08195](https://arxiv.org/abs/1503.08195), [JRSS-B](https://academic.oup.com/jrsssb/article/78/3/505/7040984) — prove the Choquet mixture representation that makes this work: any consistent scoring function is a mixture of elementary scores, so **if forecast A's Murphy curve lies below forecast B's at every θ, A is preferable under *every* consistent scoring function.** The area under a Murphy curve is the mean Brier score.

**This is the single most under-exploited result for GSE.** The `_HANDOFF-to-coding-agent.md` doctrine — *fire on edge e = p − q, never on confidence* — is literally the cost-loss decision problem: a bet offered at de-vigged fair probability q is a decision with cost-loss ratio θ = q. A Murphy diagram over θ ∈ [range of prices GSE actually bets] is the *exact* graphical statement of "our probabilities are better than the market's for every price we act on," and it is a **dominance** claim, not a single-number claim. Nothing in `apps/web/lib/calibration/*` computes an elementary score, a Murphy curve, or an ROC/AUC (grepped: `elementary score|murphy diagram|cost-loss|value score` returns nothing outside log-loss hits).

GSE's `computeDiscrimination` (`compute.ts:430`) is a *crude* substitute for the ROC panel: it checks whether observed win rate rises monotonically across 5 confidence buckets with a ±0.02 tolerance and ≥20 picks per bucket. That is directionally right and honestly labelled, but it is not AUC and carries no interval (DeLong or bootstrap).

### 1.4 ECE and its estimator bias — the finding that matters most
This is where GSE is currently exposed.

**Kumar, Liang & Ma, "Verified Uncertainty Calibration", NeurIPS 2019** — [arXiv:1909.10155](https://arxiv.org/abs/1909.10155), [PMLR PDF](https://proceedings.neurips.cc/paper_files/paper/2019/file/f8c0c968632845cd133308b1a494967f-Paper.pdf). Core result, quoted from the paper's own framing: *"older work in meteorology noticed that plugin estimates for calibration error are biased"*; each per-bin term carries bias ~1/n and the biases **accumulate to total bias ~B/n**; the plugin estimator needs samples ∝ B where the debiased estimator needs samples ∝ **√B**. They give a debiasing correction for the ℓ1 (ECE) case.

**Roelofs, Cain, Shlens & Mozer, "Mitigating Bias in Calibration Error Estimation", AISTATS 2022** — [PMLR](https://proceedings.mlr.press/v151/roelofs22a.html), [arXiv:2012.08668](https://arxiv.org/abs/2012.08668). Three findings that land directly on GSE:

- *"binning-based estimators with bins of equal mass have lower bias than estimators with bins of equal width … giving strong guidance to revise the current practice of equal-width binning."*
- *"the estimator bias is systematically worse for better calibrated models, and the effect is more egregious with fewer samples."*
- *"At n = 200 samples … an equal-width estimate of 12 % could either correspond to 5 % or 8 % true calibration error."*
- Their two recommended estimators: the **debiased estimator** and **ECE_sweep** (equal-mass bins, bin count chosen as large as possible while preserving monotonicity of the calibration function).

Related: Vaicenavicius et al., "Evaluating model calibration in classification" (AISTATS 2019); [T-Cal, an optimal test for calibration](https://arxiv.org/pdf/2203.01850); Gupta & Ramdas, [distribution-free histogram binning without sample splitting](https://arxiv.org/pdf/2105.04656).

### 1.5 Recalibration maps: Platt, temperature, beta, isotonic
- **Platt scaling** — logistic map on the score; assumes within-class scores are Gaussian with equal variance.
- **Temperature scaling** — one-parameter Platt (Guo et al. 2017), the standard NN baseline.
- **Beta calibration** — Kull, Silva Filho & Flach, AISTATS 2017, [PMLR v54](https://proceedings.mlr.press/v54/kull17a.html), [PDF](https://proceedings.mlr.press/v54/kull17a/kull17a.pdf). Replaces the equal-variance-Gaussian assumption with two Beta distributions; three parameters (a, b, c), fitted as a bivariate logistic regression on features ln s and ln(1−s). Strictly richer than Platt and — critically for probabilities already in [0,1] — **it contains the identity map**, so it cannot make a well-calibrated forecaster worse by construction the way Platt can.
- **Isotonic / PAV** — nonparametric, monotone, minimises Brier on the calibration set; the basis of both CORP and Venn–Abers.

Survey covering all of these: Filho et al., ["Classifier Calibration: A survey"](https://arxiv.org/pdf/2112.10327).

**GSE status: complete and correct.** `calibration-map-bakeoff.ts` bakes off Raw | Temperature (Newton NLL) | Platt | **Beta** | Isotonic PAVA | CIR, plus a RES-aware Beta and an online Beta OGD variant. This is genuinely ahead of the field. The one caveat is §5 below (how the bake-off is validated).

### 1.6 Venn–Abers and Mondrian conformal — distribution-free validity
**Vovk & Petej, "Venn–Abers predictors", UAI 2014** — [arXiv:1211.0025](https://arxiv.org/abs/1211.0025). Venn predictors output *multiple* probabilities (one per candidate label) and are **guaranteed perfectly calibrated under the sole assumption that observations are exchangeable** — a finite-sample, distribution-free guarantee. Venn–Abers is the isotonic-regression instance; IVAP is the inductive (split) version returning an interval [p₀, p₁]. Large-scale treatment: [arXiv:1511.00213](https://arxiv.org/pdf/1511.00213). Recent generalisation: [Generalized Venn and Venn–Abers Calibration, arXiv:2502.05676](https://arxiv.org/html/2502.05676).

**Why this matters for a product whose premise is "we don't lie about our own performance":** at n = 475 with a hard 0.05 threshold, a *point* estimate of ECE is the wrong object to publish. An IVAP interval width is an honest, distribution-free statement of *epistemic* uncertainty about the probability itself — it is the number that says "we do not know this well enough yet" without needing a threshold at all.

**Mondrian / group-conditional conformal** gives per-taxonomy (sport × market) coverage rather than marginal coverage — the right answer to the "MLB carries the pool while NCAAF n=74 and NFL n=28 are too thin to steer by" problem in `AGENTS.md`.

**GSE status:** IVAP (`packages/prediction-engine/src/calibration/ivap.ts`), CVAP (partial), Mondrian thresholds and split-conformal (`apps/web/lib/calibration/conformal-calibration.ts`), ACI abstain, CQR. All implemented, all default-OFF, and the inventory explicitly asserts `unlocksProven: false` / `raisesRes: false` for every one. **The engineering is done and the doctrine deliberately parks it.** See §7 seam item 3 — that doctrine is right about RES and wrong about publishing.

The repo's own exchangeability caveat (`CONFORMAL_CALIBRATION_NOTES.exchangeability`: *"Sports time series ≈ exchangeable only approximately — use time-ordered splits; treat coverage as diagnostic"*) is correct and is exactly what the literature says.

### 1.7 CLV as a skill proxy — what is claimed vs what is proven
This is the part of the literature that is *weakest*, and the dossier should say so plainly.

Public betting sources make strong claims: that CLV is *"the single best predictor of long-term betting profitability"* and that *"bettors who obtain positive CLV over a large sample are profitable over time"* — see [VSiN](https://vsin.com/how-to-bet/the-importance-of-closing-line-value/), [Boyd's Bets](https://www.boydsbets.com/closing-line-value/), [AsianOdds](https://asianodds.com/en/closing-line-value). These are **industry assertions, not peer-reviewed results**, and the citations behind "every major study of professional betting performance" are not given on any of those pages. **NOT CONFIRMED:** I found no open peer-reviewed paper establishing the CLV→profit relationship quantitatively. Treat CLV as a *plausible, widely-believed proxy with a clear mechanism*, not as a proven one.

The **limitations are the honest part**, and even the industry pages state them: CLV *"assumes the closing line is perfectly efficient, which is approximately true for major markets at sharp sportsbooks but less reliable for props, lower-tier leagues, and books with low betting limits"*; and *"a bet can have negative CLV and still be profitable if the closing line was wrong"* (Gamblers Almanac / VSiN, above). Four consequences for GSE specifically:

1. **Efficiency is sport-dependent.** NFL sides/totals close efficiently; **MLS does not**. GSE's worst score-integrity sport (`AGENTS.md`: MLS 14/48 mismatched) is also the sport where CLV means least.
2. **CLV is not a payoff.** Beating the close is only realisable edge if the price was *takeable at size*. A single-book price from a feed is not evidence of executable liquidity.
3. **The "close" GSE measures is not the close.** `apps/web/lib/settlement/free-path-clv.ts` derives the closing snapshot from `odds.findMany({ where: { fetchedAt: { lte: commenceTime } }, orderBy: desc, take: 80 })` — i.e. the last snapshot the refresh cron happened to capture before kickoff. With a 15-minute refresh cadence, that misses the final pre-kickoff move, which is the single most informative part of the line's path (late lineup/injury news). Systematic, one-directional, and it will bias measured CLV **toward zero** (the last move is the one that most often confirms the sharp side).
4. **CLV and calibration are different claims.** GSE's own `forecast-skill-eprocess.ts` header already draws this distinction better than the literature does: skill-vs-market, profit, and self-honesty are three separate instruments that are allowed to disagree. Keep them separate on the public surface.

### 1.8 Purged, embargoed, walk-forward evaluation + the shuffled-time placebo
**López de Prado**, *Advances in Financial Machine Learning* (2018). **Purging** removes from the training set any observation whose label overlaps in time with labels in the test set; a small **embargo** is added after the test set before the next training fold, to kill serial-correlation leakage that survives purging. Summary references: [Purged cross-validation (Wikipedia)](https://en.wikipedia.org/wiki/Purged_cross-validation), [QuantInsti](https://blog.quantinsti.com/cross-validation-embargo-purging-combinatorial/). **Combinatorial Purged CV (CPCV)** generates many backtest paths rather than one, reducing false discoveries. The companion metrics are **Probability of Backtest Overfitting (PBO)** and the **Deflated Sharpe Ratio (DSR)**, which discount a reported result by the number of trials that produced it.

**Data-snooping control.** White (2000)'s **Reality Check** and Hansen (2005)'s **test for Superior Predictive Ability** — [Hansen SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=264569) — both exist precisely to answer "I searched over K configurations and picked the best; is the winner real?" Hansen's SPA studentises the statistic and uses a sample-dependent null, so it *"is more powerful and less sensitive to poor and irrelevant alternatives"* than the Reality Check, which is conservative because it uses the least-favourable configuration.

**The sports-specific leakage units are different from finance and GSE should name them explicitly:**
- **The game.** Two picks on the same game share the outcome *completely*. Purging by *week* (what `replay-harness.ts` does) does not address this at all for calibration.
- **The slate/day.** Weather, referee assignment, and a common news cycle correlate outcomes within a day.
- **The odds snapshot.** Any feature derived from an odds row with `fetchedAt > commenceTime` is a look-ahead. GSE's CLV path guards this (`free-path-clv.ts`); it is not obvious that every feature path does.
- **Settlement time vs kickoff.** A calibration map refitted at time t must be fitted only on picks *settled* before t, not *placed* before t.

**GSE status:** `buildPurgedEmbargoedSplits` (`packages/prediction-engine/src/replay-harness.ts:72`) is real and correct — `purgeWeeks` and `embargoWeeks` at NFL week granularity. `runShuffledTimePlacebo` and the edge-lab `shuffledTimePlacebo` exist, and `honesty/placebo-leak.ts` carries an unusually honest header describing a previous version that was *"a provable no-op"* with an *inverted gate*. That self-correction is exactly the standard the brand claims. **But none of this machinery is applied to the calibration/eligibility path** — the metrics that decide PROVEN are computed on a pooled settled sample with no purge, no embargo, and no placebo control.

---

## 2. Finding #1 in full: the ECE floor is measuring noise

### 2.1 What GSE actually computes
```
apps/web/lib/ops/compute-live-calibration-metrics.ts:195
  const ece = expectedCalibrationError(input.samples);        // default bins = 10

packages/prediction-engine/src/probability-calibration.ts:380-405
  export function expectedCalibrationError(samples, bins = 10)
    → binIndex(s.p, bins)                                      // EQUAL WIDTH
    → ece += (nk / n) * Math.abs(fk - ok)                       // PLUG-IN

apps/web/lib/ops/calibration-eligibility.ts:71-73
  brier: 0.22,  ece: 0.05,  murphyReliability: 0.05
```
So: the equal-width, 10-bin, plug-in ℓ1 estimator — the *exact* estimator the Roelofs paper singles out for revision — compared against a hard threshold with no interval and no bias correction.

### 2.2 The noise floor, derived
Under the null that the forecaster is **perfectly calibrated**, and treating picks as independent, the observed rate in bin k is a binomial mean with sd √(p_k(1−p_k)/n_k). Its absolute deviation from the true rate has expectation ≈ √(2/π)·sd. So

> **E[ECE_plugin | perfectly calibrated] ≈ √(2/π) · (1/n) · Σ_k √( n_k · p_k(1−p_k) )**

If K_eff bins carry roughly equal mass and p ≈ 0.5–0.65, this collapses to

> **E[ECE_plugin] ≈ 0.399 · √(K_eff / n)**

Evaluated at GSE's live numbers (n and measured values from `AGENTS.md` 2026-09-08 11:38 UTC):

| Sample | n | K_eff = 4 | K_eff = 5 | K_eff = 10 | GSE **measured** ECE |
|---|---|---|---|---|---|
| Pooled | 475 | 0.037 | 0.041 | 0.058 | **0.0466** |
| v5.2.7 (deployed) | 262 | 0.049 | 0.055 | 0.078 | **0.0947** |
| NCAAF | 74 | 0.093 | 0.104 | 0.147 | **0.1178** |
| NFL | 28 | 0.151 | 0.169 | 0.239 | **0.267** |
| v5.0.0 (09-06 note) | 29 | 0.148 | 0.166 | 0.234 | **0.1531** |

**This is a derivation under a stated model, not a measurement of GSE's data.** K_eff is unknown without inspecting the bin occupancy of the live sample — moneyline p clusters in the 0.4–0.8 range, so 4–6 occupied bins is the realistic band and 10 is an upper bound. Running the actual per-bin occupancy is a one-query job and should be step 1 of any follow-up.

But the pattern is unmistakable. **Every one of GSE's measured ECEs sits inside or barely above the pure-noise band for its own sample size.** Three consequences:

1. **The pooled 0.0466 vs the 0.05 floor is not a measurement of calibration.** It is a measurement of how many bins happened to be occupied. Whether the gate reads GREEN or RED is being decided by bin occupancy at the third decimal place.
2. **`AGENTS.md`'s own 2026-09-08 observation is the signature of this.** *"More rows settled (n 458 to n 475) and it cleared. Nobody shipped a fix; the number moved."* Bias falls as 1/√n. That is precisely what a noise-dominated estimator does when you add rows. The note's instinct ("do not act on the 0.0524 figure") was right for the wrong reason: the honest statement is that neither 0.0524 nor 0.0466 is distinguishable from perfect calibration on this estimator at this n.
3. **The "pooled sits below every stratum" puzzle is fully explained.** `AGENTS.md` 2026-09-06 records it carefully and correctly declines to attribute it to signed-error cancellation (*"a plausible mechanism, not an observed one"*). The literature's answer is simpler and needs no cancellation at all: **plug-in binned ECE is positively biased with bias growing as √(bins/n)**, so any partition of a sample into strata will read higher in every stratum than in the pool, *even if every stratum is perfectly calibrated*. Kumar et al.: per-bin bias ~1/n accumulating to ~B/n. Roelofs et al.: *"the estimator bias is systematically worse for better calibrated models, and the effect is more egregious with fewer samples."* The v5.2.7-at-0.0947-on-262-rows figure that `AGENTS.md` (rightly) refuses to publish PROVEN over is, on this reading, *roughly the noise floor for 262 rows* — it is not evidence that the deployed version is twice as miscalibrated as the pool.

**None of this makes the founder's caution wrong.** It makes the *reason* for the caution different, and it changes what fixes it. More rows will keep moving the number without meaning anything. What fixes it is a better estimator.

### 2.3 The fix, in GSE's own terms
Three options, cheapest first:

- **(a) Equal-mass bins.** Roelofs' cleanest result. GSE **already computes** equal-mass bins — `quantileBucketsFromSettled` at `compute.ts:333` with `QUANTILE_BIN_COUNT = 5` (`compute.ts:263`). This is a plumbing change on the eligibility path, not new maths.
- **(b) Debiased ECE.** Kumar's correction term, ~20 lines, plus the paper's consistency-resampling CI. Reference implementation in the [`uncertainty-calibration` PyPI package](https://pypi.org/project/uncertainty-calibration/) (port, do not depend — law 7).
- **(c) CORP MCB.** Replace binned REL with the PAV-based miscalibration component. Bin-free, so the "how many bins" question disappears permanently, and it comes with consistency bands for the reliability diagram. GSE already has `pav.ts` and `isotonic-pava.ts`.

**Whichever is chosen, the floor number must be re-derived for the new estimator, not carried over.** A 0.05 floor calibrated (implicitly) against a biased estimator is not the same constraint against an unbiased one — and re-deriving it is *tightening* the guard, not weakening it, so it does not run into law 9.

---

## 3. Findings #3 and #7: the other two floors, and the units error

### 3.1 The Brier floor permits negative skill
`calibration-eligibility.ts:71` sets `brier: 0.22`. `AGENTS.md` (2026-09-06 17:09 UTC) already establishes UNC = 0.2139 and that *"the Brier floor is cleared by a constant base-rate forecast with no skill at all."* Stated in the literature's own units — the **Brier Skill Score**, BSS = 1 − BS/BS_ref:

> Floor BS ≤ 0.22 ⟺ **BSS ≥ 1 − 0.22/0.2139 = −0.0285**

The floor as written permits a forecaster **2.85 % worse than a constant base-rate forecast**. GSE's measured BS = 0.1898 is BSS = **+0.113**, which is real, publishable skill. The floor is not measuring it.

**Fix:** replace the absolute Brier floor with a **skill score against a named reference**. Two candidate references, and they answer different questions: climatology (base rate) → "do we beat a coin weighted by history"; the de-vigged market probability → "do we beat the book." The second is the only one worth publishing, and GSE already has the sequential version of exactly that test in `forecast-skill-eprocess.ts`.

### 3.2 The Murphy reliability floor is ~20× looser than the ECE floor, and non-binding at any n
`AGENTS.md` (2026-09-06) correctly notes that REL averages *squared* per-bin gaps against the same literal 0.05, permitting a 22.4-point RMS gap where ECE permits 5.0 — a 4.47× difference. Two additions that pin it exactly:

**(a) The inequality.** By Cauchy–Schwarz on the mass weights, ECE = Σ w_k|g_k| ≤ √(Σ w_k g_k²) = √REL. Therefore **REL ≥ ECE²** always. So:
- REL floor 0.05 ⟺ permits ECE up to √0.05 = **0.2236**
- ECE floor 0.05 ⟹ implies REL ≤ ... nothing (the inequality runs the other way), but it *forces* REL ≥ 0.0025
- The two floors are therefore **20× apart in squared units** and can never both bind. **The REL floor is decorative.**

**(b) It can never bind, at any sample size.** Under perfect calibration, E[REL_plugin] ≈ (1/n)·Σ_k p_k(1−p_k) ≈ K_eff·0.25/n. At n = 475 with K_eff = 5 that is **0.0026** — and GSE measures 0.005, i.e. **the observed REL is roughly twice its own pure-noise expectation**, so REL is itself ~50 % estimator noise. To make a 0.05 REL floor bind you would need n ≈ 25 for the noise alone to reach it. It is not a guard; it is a number that is always green.

**This is not permission to delete it** (law 9). The correct move is to *replace* it with the CORP **MCB** component — which is on the same scale, is bin-free, and actually binds — and to derive its floor from the estimator's null distribution rather than reusing 0.05.

### 3.3 The public reliability chart has three defects
All in `apps/web/lib/calibration/compute.ts`:

1. **Equal-width confidence bins, 5 of them, hard-coded** (`compute.ts:211-217`: `50-59 / 60-69 / 70-79 / 80-89 / 90-100`). This is the exact practice Roelofs et al. recommend revising, in its widest form. `AGENTS.md` already flags this as an open founder acceptance ("the /calibration chart still buckets by confidence"). The equal-mass alternative is already computed 120 lines away (`quantileBuckets`).
2. **PUSH is scored as y = 0.5** (`compute.ts:256-261`, `resultToOutcome`). This breaks the Murphy decomposition (UNC = ȳ(1−ȳ) assumes y ∈ {0,1}), and it *mechanically lowers* the Brier score, because a push contributes (p − 0.5)² ≤ 0.25 where a decided outcome can contribute up to 1.0. Standard betting-evaluation practice is to treat a push as a **void and exclude it from the scored sample** — which is what `CALIBRATION_DISCLAIMER` says the *win rate* does ("Pushes and voids count in the population, not the rate"), so the disclaimer and the Brier/bucket computation disagree with each other.
3. **The Clopper–Pearson band is computed on a different population than the point it bands.** `compute.ts:303` computes the interval from `wins / decided`; `compute.ts:305` computes the plotted `observedWinRate` as the mean of `outcome` over **all** rows *including pushes at 0.5*. When any bucket contains pushes these differ, and the 95 % band can fail to contain the point it is drawn around. Moneyline (the eligibility sample) rarely pushes, so this is likely latent rather than currently visible — but the public chart is not moneyline-only.

Beyond those: per-bin Clopper–Pearson is a *pointwise* interval, which is not the right object for a reliability diagram. The literature's answer is **consistency bands** — what the diagram would look like *if the forecaster were perfectly calibrated* — which CORP supplies and `reliabilitydiag` implements. A reader looking at 5 pointwise 95 % bands has no valid simultaneous statement at all.

---

## 4. Finding #4: the streak is not evidence, and GSE already owns the fix

`calibration-eligibility.ts` requires `consecutiveGreen ≥ streakRequired` (default 3), evaluated by a cron on `40 */6 * * *`.

**Why the streak carries no statistical weight.** Over 21 days GSE accumulated n ≈ 475 settled moneyline picks → ≈ 22.6/day → **≈ 5.7 new picks per 6-hour run**. Two consecutive runs therefore share **469/475 ≈ 98.7 %** of their sample. Three "consecutive GREEN runs" is not three independent confirmations; it is **one sample looked at three times.** And repeated looks at a growing sample with a fixed threshold do not *strengthen* a claim — they are the textbook optional-stopping problem, and they **inflate** type-I error relative to a single look.

The intent behind the streak (don't publish off one lucky reading) is exactly right. The implementation gets the sign backwards.

**The literature's answer is anytime-valid inference.** Ramdas, Grünwald, Vovk & Shafer, *"Game-Theoretic Statistics and Safe Anytime-Valid Inference"*, Statistical Science 38(4), 2023 — [arXiv:2210.01948](https://arxiv.org/abs/2210.01948), [Project Euclid](https://projecteuclid.org/journals/statistical-science/volume-38/issue-4/Game-Theoretic-Statistics-and-Safe-Anytime-Valid-Inference/10.1214/23-STS894.full). E-processes and confidence sequences *"remain valid at all stopping times, accommodating continuous monitoring … and optional stopping or continuation for any reason."* Ville's inequality gives P(∃T : M_T ≥ 1/α) ≤ α for **every** stopping rule, including an adversary who recomputes after every settled pick and stops at the most flattering moment.

**GSE has already built this and does not use it as the gate.** `packages/prediction-engine/src/forecast-skill-eprocess.ts` is a likelihood-ratio test martingale against the market null (H₀: y_t | F_{t−1} ~ Bernoulli(m_t)), with E[E_t | F_{t−1}] = 1 derived exactly in the header, Ville cited, and the correct observation that **the running maximum is the statistic, not the final value** — *"A crossing at pick 87 is a valid α-level rejection even if M has since drifted back below the threshold."* That file is better than most published treatments. It should be the PROVEN gate.

**Concrete replacement:** PROVEN eligibility = (e-process against the market null has crossed 1/α, α = 0.01, at any point) **AND** (a calibration confidence sequence's upper bound on ECE is below the floor) **AND** (settlement health). That is one honest statement instead of three repeated peeks, it is immune to the exact "we looked at it every 6 hours until it went green" criticism that would otherwise be fatal to the brand, and it removes the pathology `AGENTS.md` documents where one ungradeable pick forces RED for 18 continuous hours by resetting a streak that was never evidence.

**Do not, under any reading of this section, lower a floor or shorten the streak.** The recommendation is to replace a weak instrument with a stronger one, which is the direction law 9 permits.

---

## 5. Finding #5: selection and the winner's curse

`apps/web/lib/calibration/selective-publish.ts`, `selectivePublishSweep`:
```
deltas = [0, 0.08, 0.1, 0.12, 0.15, 0.18]     // 6
edges  = [null, 0.03, 0.05]                    // 3
minGroupResList = [null]                       // ≥1
→ ≥18 grid cells, each evaluated on `rows`, winner chosen by max RES
   subject to Brier ≤ min(0.26, baseline + 0.03), then reported
```
The reported `recommended` metrics — RES, Brier, **ECE** — are computed **on the same rows that chose it**. That is in-sample selection, and the reported metric of the argmax of K correlated candidates is optimistically biased by roughly the spread of the K sampling distributions.

The `calibration-pipeline` skill description says "settled picks → time hold-out → CIR → selected-slice ECE", so the *doctrine* knows about a hold-out. The sweep function as written does not take one.

**Literature fixes, in order of cost:**
1. **Sample splitting.** Choose (δ, e, ρ) on rows before date T; report metrics only on rows after T. Cheapest, and it is what the skill already prescribes.
2. **Hansen's SPA test** ([SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=264569)) or White's Reality Check for the "is the winner of K configurations real?" question, with a stationary bootstrap for the null. Studentised, sample-dependent null, *"more powerful and less sensitive to poor and irrelevant alternatives"* than RC.
3. **Deflated Sharpe / PBO analogue**: discount the reported number by the number of trials. GSE knows K exactly (grid size), so this is computable.

The same criticism applies, more mildly, to `calibration-map-bakeoff.ts` — a bake-off of 6 maps that picks a winner by out-of-fold ECE. It does use CV (`selectCalibrator`), which is much better than nothing, but CV on chronologically-ordered sports data **without purging and without embargo** leaks: the same-game and same-slate correlations described in §1.8 mean a fold boundary drawn between rows can put two picks on one game on opposite sides of it.

---

## 6. Finding #6: the de-vig choice may be larger than the thing being measured

**What GSE does.** `compute-live-calibration-metrics.ts:230` states the scoring basis verbatim: *"the publish-time recompute from the append-only odds table (**same mean-implied proportional de-vig as the receipt**…)"*. `packages/prediction-engine/src/scoring.ts:638` and `:847` stamp `marketFairMethod: "proportional"`. Since C-110 a large share of rows resolve to **`market_p_single_book`** — one real book.

**What the literature says.** Štrumbelj, *"On determining probability forecasts from betting odds"*, International Journal of Forecasting 30(4), 2014 — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0169207014000533), [Semantic Scholar](https://www.semanticscholar.org/paper/On-determining-probability-forecasts-from-betting-%C5%A0trumbelj/8074edd44af6a4a64ab1fffee2642893d693720a). Result: **Shin probabilities are better than basic normalisation and regression-based approaches for *all* bookmaker/sport pairs tested**, and *"whenever the goal is to maximize forecasting accuracy, Shin probabilities should be considered."* Also: *"betting exchange odds are not always the best source, especially in smaller markets"* — relevant to the WP-27 Kalshi-as-second-book plan. Follow-up: Štrumbelj (2016), ["A Comment on the Bias of Probabilities Derived From Betting Odds"](https://journals.sagepub.com/doi/10.1177/1527002513519329).

Shin (1992, 1993) derives the fair probability under a market maker facing a proportion z of insider traders; the practical effect is that Shin **shrinks the longshot more and the favourite less** than proportional normalisation, correcting for the favourite–longshot bias that proportional de-vig leaves in.

**GSE already knows this and wrote it down.** `packages/prediction-engine/src/honesty/devig-method-compare.ts` header: *"multiplicative de-vig manufactures longshot 'value' by shrinking the favourite too little and the longshot too much. GSE still stamps `multiplicative_devig_v1` on some quote-plane paths while Shin lives in prediction-engine. This module does not change live scoring… **Not wired into pick minting.**"* It exposes `multiplicative | shin | goto` and a `longshotInflation` diagnostic. `shinDevig` and `gotoConversion` live in `packages/prediction-engine/src/shin-devig.ts`.

**Why this is urgent rather than academic.** The market-anchored p **is the forecast being scored**. If the de-vig method shifts p by more than ~0.005 systematically, the entire ECE/Brier/REL calculation is measuring the de-vig choice rather than the model. On a 2-way book with a 4.5 % hold, the proportional-vs-Shin disagreement on a −200/+170 line is comfortably in the 0.005–0.015 range for the longshot side — **larger than the margin between 0.0466 and the 0.05 floor.**

**Zero-write, zero-risk diagnostic that should run before any PROVEN decision:** recompute pooled ECE / Brier / REL under all three de-vig methods on the same settled sample. Publish the three numbers side by side. If they disagree by more than the floor margin, the honest conclusion is that GSE does not yet know its own ECE to the precision the gate demands — and that is a *publishable* finding, entirely on-brand, that no competitor would ever admit.

---

## 7. THE SEAM: what GSE can do that no competitor will

The wave-1 dossiers establish the baseline: PropFinder ships a reconstructable rating with **no calibration published**; the DFS-optimizer field (`dfs-optimizer-priorart.json`, `_competitor-mistakes-lessons.md`) sells simulation counts as a proxy for rigour and publishes no scoring evidence at all. Against that field:

1. **Publish the Triptych.** Reliability (CORP) + ROC/AUC + **Murphy diagram vs the de-vigged market**, on one page, regenerated nightly. Nobody in this market has ever published a Murphy diagram. It is the *strongest* honest claim available — dominance under **every** consistent scoring function ([Ehm et al. 2016](https://arxiv.org/abs/1503.08195)) — and it maps one-to-one onto the "fire on edge e = p − q" doctrine, because the elementary-score threshold θ **is** the price. "Better than the book at every price we act on" is a sentence no competitor can write and none of them can be forced to.

2. **Publish the estimator, not just the number.** Ship a `/calibration/method` page that states: equal-mass bins, debiased or CORP estimator, the null distribution of the estimator at the current n, and the resulting noise floor. "Our measured ECE is 0.047 and the noise floor at n=475 is 0.041, so we cannot yet distinguish ourselves from perfectly calibrated" is a *stronger* trust claim than "our ECE is 0.047." **Every competitor's incentive is to publish the number and hide the estimator.** GSE's brand is the exact opposite: *math you can read.*

3. **Ship Venn–Abers intervals as the public confidence display.** GSE has IVAP already (`packages/prediction-engine/src/calibration/ivap.ts`, working, default-off). The `conformal-calibration.ts` doctrine that conformal methods *"do not raise RES and do not unlock PROVEN"* is **correct and should stay** — but it has been over-applied. Venn–Abers is not a way to unlock PROVEN; it is a way to *display honest uncertainty about a single pick's probability* under a finite-sample, distribution-free exchangeability guarantee ([Vovk & Petej](https://arxiv.org/abs/1211.0025)). "62 %, and here is the width of what we actually know" is a product feature no competitor can copy without building the same machinery.

4. **Publish the de-vig disagreement.** Three fair probabilities from one book, side by side, with the longshot-inflation number. `devig-method-compare.ts` already computes it. Showing that reasonable methods disagree — and by how much — is a moat built out of candour.

5. **Run a label-permutation placebo on the evaluation itself.** GSE has placebo machinery for the *feature* path (`honesty/placebo-leak.ts`, edge-lab `shuffledTimePlacebo`). It has none for the *gate*. Re-run the full eligibility computation on outcome-permuted labels; it must go RED. **A gate that passes on shuffled labels is broken**, and given the 2026-09-08 score-integrity incident — 25/169 FINAL rows contradicted by ESPN, 8 moneyline outright reversed — this is not hypothetical. Under a random-flip model at ε ≈ 1.7 %, each bin's observed rate moves by |ε(1−2o)| ≈ 0.005, i.e. **~10 % of the entire ECE floor budget is attributable to labels GSE already knows are wrong.** The actual reversals are *not* random (they cluster in a consecutive-day series-propagation pattern), so that estimate is neither an upper nor a lower bound — which is itself the point: the effect cannot be bounded without the root cause. A permutation placebo is the cheap standing control.

6. **Cluster the bootstrap by game/slate.** Two picks on one game share an outcome completely; an iid bootstrap (`bootstrap-metric-ci.ts`) treats them as two observations. Every published interval is currently narrower than the truth. GSE already has `stationary-bootstrap.ts`. Being the only product whose error bars are *honest about correlation* is a small, real, permanent edge.

---

## 8. What a customer would say is missing (adapted: what a *reader* of GSE's calibration page cannot currently do)

Real complaints against this literature and its application, from public sources and from the shape of the repo:

- **"ECE is not a number I can act on."** Fair, and the reason the Triptych exists. A single scalar over a whole sample answers no decision question. ([Triptych, arXiv:2301.10803](https://arxiv.org/abs/2301.10803))
- **"Your bins are arbitrary and I can move your number by changing them."** True of GSE's current chart and current gate. The whole point of CORP. ([PNAS 2021](https://www.pnas.org/doi/abs/10.1073/pnas.2016191118))
- **"You are reporting a pooled figure that flatters."** `AGENTS.md` says this about itself. The literature's answer is Mondrian/group-conditional evaluation and multicalibration — and GSE has `multicalib-audit-patch.ts`, whose header is one of the best plain-English statements of the problem I have read anywhere: *"A global calibration curve can look perfect in aggregate while being badly wrong on a subpopulation… Aggregate reliability plots hide those failures because the over- and under-confident cells cancel."* That module's scope note (binary/group-indicator special case only, no multiaccuracy over unseen subgroups claimed) is exactly the honesty the brand claims.
- **"CLV is a proxy, not money."** Correct, and the industry sources that push CLV hardest admit its limits ([VSiN](https://vsin.com/how-to-bet/the-importance-of-closing-line-value/), [Boyd's Bets](https://www.boydsbets.com/closing-line-value/)). **NOT CONFIRMED:** no open peer-reviewed study establishing the CLV→profit magnitude.
- **"You looked at it until it went green."** The single most damaging thing anyone could say about a PROVEN claim, and under the current streak design it would be *technically accurate*. §4 removes the attack surface entirely.

---

## 9. Concrete build items for GSE, ranked by (value ÷ effort)

| # | Item | Entry point | Effort | Why it matters |
|---|---|---|---|---|
| 1 | Report ECE on **equal-mass bins** alongside equal-width, on the same sample, and log the delta | `compute-live-calibration-metrics.ts:195`; equal-mass already at `compute.ts:333` | S | Roelofs' cleanest result; if the two disagree by >0.005 the gate is measuring bins, not calibration |
| 2 | **Estimator noise floor** printed next to every ECE, from the derivation in §2.2 | `calibration-eligibility.ts` report fields | S | Makes "0.0466 vs 0.05" readable as the noise-dominated comparison it is; kills the "the number moved by itself" confusion permanently |
| 3 | **De-vig sensitivity table**: pooled ECE/Brier/REL under proportional vs Shin vs goto | `honesty/devig-method-compare.ts` (built, unwired) + `compute-live-calibration-metrics.ts` | S | If the de-vig choice moves p more than the floor margin, every floor number is measuring the de-vig |
| 4 | **BSS vs market** replaces the absolute Brier floor | `calibration-eligibility.ts:71` | S | Current floor permits BSS = −0.0285, i.e. worse than a constant forecast |
| 5 | **Label-permutation placebo on the gate** — eligibility must go RED on shuffled outcomes | new; pattern from `honesty/placebo-leak.ts` | S | A gate that passes on shuffled labels is broken; urgent given the score-integrity incident |
| 6 | **Cluster bootstrap by gameId/slate date** for ECE & Brier CIs | `bootstrap-metric-ci.ts` + existing `stationary-bootstrap.ts` | S–M | Current iid intervals are too narrow; picks share games |
| 7 | **Fix the public chart**: equal-mass bins, exclude PUSH (don't score at 0.5), band population must match the plotted point | `compute.ts:211-217, 256-261, 303, 305` | M | Three defects on the most-read public surface; #3 can draw a band that misses its own point |
| 8 | **CORP decomposition + consistency bands**; MCB replaces binned REL | new module on `calibration/pav.ts` + `isotonic-pava.ts` | M | Removes the bin question permanently; REL floor 0.05 is decorative (can never bind — §3.2) |
| 9 | **E-process gate replaces the 3-run streak** | `forecast-skill-eprocess.ts` → `calibration-eligibility.ts` | M | Consecutive runs share 98.7 % of the sample; also dissolves the 18-hour-RED-from-one-pick pathology |
| 10 | **Time hold-out for `selectivePublishSweep`**, then SPA if the grid stays | `selective-publish.ts` | M | Reported metrics currently come from the rows that chose the config |
| 11 | **Murphy diagram vs de-vigged market** on the public calibration page | new | M–L | The dominance claim; nobody in this market has one |
| 12 | **ROC/AUC with a DeLong or bootstrap CI** to replace the 5-bucket monotonicity trend | `compute.ts:430` `computeDiscrimination` | M | Completes the Triptych; current trend has no interval |
| 13 | **IVAP width as the public confidence display** | `calibration/ivap.ts` (built, off) | L | Distribution-free honest uncertainty per pick; product feature, not a PROVEN unlock |
| 14 | **Purge/embargo at game+slate granularity** on the calibration-map fitting path | pattern from `replay-harness.ts:72` | L | Week-level purge exists for the model; calibration fitting has none, and the leakage unit is the game |

**Every item above is a diagnostic, a stricter estimator, or an additional publication. None of them lowers a floor, weakens a guard, or flips a gate.** Items 4, 8 and 9 *replace* a floor with a stricter or more valid one, which needs a founder decision precisely because it changes what PROVEN means — and re-deriving a threshold for a new estimator is not the same act as loosening a threshold for an old one.

---

## 10. Honest gaps in this dossier

- **NOT CONFIRMED:** the actual per-bin occupancy (K_eff) of GSE's live 475-row moneyline sample. Every noise-floor number in §2.2 is a derivation under a stated model, not a measurement. Running the occupancy query is step 1 and could move the conclusion — though not its direction, since even K_eff = 10 leaves the measured value inside the band.
- **NOT CONFIRMED:** any peer-reviewed quantitative study of CLV → long-run profit. The claims in §1.7 come from industry pages, cited as such.
- **NOT CONFIRMED:** whether `calibration-map-bakeoff.ts`'s `selectCalibrator` CV is time-ordered and purged. It uses `samplesChrono`, which is suggestive but not proof; I did not read the CV fold construction.
- **NOT VERIFIED:** the magnitude of the proportional-vs-Shin disagreement on GSE's actual book prices. §6's 0.005–0.015 range is a general property of 2-way books at a 4–5 % hold, not a measurement of GSE's odds table.
- **NOT READ:** `market-backtest.ts`, `proven-path-engine.ts`, `metric-slices.ts`, `live-calibration-p.ts` beyond greps. There may be additional relevant machinery in them.
- Gneiting & Raftery (2007) and Murphy (1973) are cited from standing knowledge; I did not fetch a URL for either, and both are behind publisher paywalls. The claims attributed to them (properness, locality of the log score, BS = REL − RES + UNC) are restated correctly in the open-access sources cited above and in GSE's own `murphy-res-definition.ts`.

---

## Sources

- [Stable reliability diagrams for probabilistic classifiers — PNAS 118(8), 2021 (CORP)](https://www.pnas.org/doi/abs/10.1073/pnas.2016191118) · [preprint arXiv:2008.03033](https://arxiv.org/abs/2008.03033) · [reliabilitydiag R package](https://github.com/aijordan/reliabilitydiag) · [scores Python tutorial](https://scores.readthedocs.io/en/stable/tutorials/Isotonic_Regression_And_Reliability_Diagrams.html)
- [Evaluating Probabilistic Classifiers: The Triptych — arXiv:2301.10803](https://arxiv.org/abs/2301.10803) · [IJF version](https://www.sciencedirect.com/science/article/pii/S0169207023000997)
- [Ehm, Gneiting, Jordan & Krüger, Of quantiles and expectiles — arXiv:1503.08195](https://arxiv.org/abs/1503.08195) · [JRSS-B](https://academic.oup.com/jrsssb/article/78/3/505/7040984) · [murphydiagram R package](https://github.com/FK83/murphydiagram)
- [Kumar, Liang & Ma, Verified Uncertainty Calibration — arXiv:1909.10155](https://arxiv.org/abs/1909.10155) · [NeurIPS PDF](https://proceedings.neurips.cc/paper_files/paper/2019/file/f8c0c968632845cd133308b1a494967f-Paper.pdf) · [uncertainty-calibration package](https://pypi.org/project/uncertainty-calibration/)
- [Roelofs et al., Mitigating Bias in Calibration Error Estimation — PMLR v151](https://proceedings.mlr.press/v151/roelofs22a.html) · [arXiv:2012.08668](https://arxiv.org/abs/2012.08668) · [PDF](https://proceedings.mlr.press/v151/roelofs22a/roelofs22a.pdf)
- [T-Cal: an optimal test for calibration — arXiv:2203.01850](https://arxiv.org/pdf/2203.01850) · [Distribution-free histogram binning — arXiv:2105.04656](https://arxiv.org/pdf/2105.04656)
- [Kull, Silva Filho & Flach, Beta calibration — PMLR v54](https://proceedings.mlr.press/v54/kull17a.html) · [PDF](https://proceedings.mlr.press/v54/kull17a/kull17a.pdf) · [Classifier Calibration survey — arXiv:2112.10327](https://arxiv.org/pdf/2112.10327)
- [Vovk & Petej, Venn–Abers predictors — arXiv:1211.0025](https://arxiv.org/abs/1211.0025) · [Large-scale probabilistic prediction — arXiv:1511.00213](https://arxiv.org/pdf/1511.00213) · [Generalized Venn / Venn–Abers — arXiv:2502.05676](https://arxiv.org/html/2502.05676)
- [Ramdas, Grünwald, Vovk & Shafer, Game-Theoretic Statistics and Safe Anytime-Valid Inference — arXiv:2210.01948](https://arxiv.org/abs/2210.01948) · [Statistical Science](https://projecteuclid.org/journals/statistical-science/volume-38/issue-4/Game-Theoretic-Statistics-and-Safe-Anytime-Valid-Inference/10.1214/23-STS894.full)
- [Štrumbelj, On determining probability forecasts from betting odds — IJF 2014](https://www.sciencedirect.com/science/article/abs/pii/S0169207014000533) · [Semantic Scholar](https://www.semanticscholar.org/paper/On-determining-probability-forecasts-from-betting-%C5%A0trumbelj/8074edd44af6a4a64ab1fffee2642893d693720a) · [Štrumbelj 2016 comment on bias](https://journals.sagepub.com/doi/10.1177/1527002513519329)
- [Hansen, A Test for Superior Predictive Ability — SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=264569) · [Stepwise test without data-snooping bias](https://www.sciencedirect.com/science/article/abs/pii/S0927539810000022)
- [Purged cross-validation (overview)](https://en.wikipedia.org/wiki/Purged_cross-validation) · [QuantInsti: purging, embargo, combinatorial CV](https://blog.quantinsti.com/cross-validation-embargo-purging-combinatorial/) · [Backtest overfitting comparison study](https://www.sciencedirect.com/science/article/abs/pii/S0950705124011110)
- [Model Comparison and Calibration Assessment: consistent scoring functions user guide — arXiv:2202.12780](https://arxiv.org/pdf/2202.12780) · [Regression diagnostics meets forecast evaluation — arXiv:2108.03210](https://arxiv.org/pdf/2108.03210)
- CLV (industry, not peer-reviewed): [VSiN](https://vsin.com/how-to-bet/the-importance-of-closing-line-value/) · [Boyd's Bets](https://www.boydsbets.com/closing-line-value/) · [AsianOdds](https://asianodds.com/en/closing-line-value) · [Gamblers Almanac](https://gamblersalmanac.com/guides/closing-line-value-guide)

### GSE files read for this dossier
`apps/web/lib/calibration/{ece,brier,compute,murphy-res-definition,scoring-reliability,selective-publish,conformal-calibration,segmented-murphy,bootstrap-calib-ci,bootstrap-metric-ci,calibration-map-bakeoff,holdout-significance,display-safety,honest-confidence}.ts` · `apps/web/lib/ops/{calibration-eligibility,calibration-eligibility-durable,compute-live-calibration-metrics}.ts` · `apps/web/lib/settlement/free-path-clv.ts` · `packages/prediction-engine/src/{probability-calibration,forecast-skill-eprocess,replay-harness,scoring}.ts` · `packages/prediction-engine/src/calibration/{ivap,multicalib-audit-patch}.ts` · `packages/prediction-engine/src/honesty/{placebo-leak,devig-method-compare}.ts`

# Galaxy Sports Edge — Methods Literature Dossier v2

**Topic:** Statistical methods literature for a sports-betting prediction engine (Elo-based).
**Date:** 2026-09-17
**Purpose:** Give exact-enough method descriptions for correct implementation; mark anything unverifiable as UNVERIFIED.
**Scope note:** Engine is Elo-based. Most methods below slot in as features, sub-models, or validation standards around an Elo core — not as replacements for it.

---

## 1. Expected points (EP)

### Key sources

- **Yurko, Ventura & Horowitz, "nflWAR: A Reproducible Method for Offensive Player Evaluation in Football"** (arXiv 1802.00998, 2018) — primary paper. Full text read: https://arxiv.org/pdf/1802.00998v1
- **Brill, Yee, Deshpande & Wyner, "Moving from Machine Learning to Statistics: the case of Expected Points in American football"** (arXiv 2409.04889, 2024) — primary critique: https://arxiv.org/abs/2409.04889
- **nflfastR R-package docs (CRAN)** — current production EP interface: https://cran.r-project.org/web/packages/nflfastR/nflfastR.pdf
- **fastrmodels R-package docs (CRAN)** — current model objects: https://ftp.openbsd.dk/pub/mirrors/pub/cran/web/packages/fastrmodels/fastrmodels.pdf

### Method summary (Yurko et al., the reproducible foundation)

EP is estimated as the expected value of the **next scoring event within the same half**, modeled directly as a **multinomial logistic regression** over seven outcome categories from the possession team's perspective: touchdown (+7), field goal (+3), safety (+2), no score (0), opponent safety (−2), opponent field goal (−3), opponent touchdown (−7). Six logits are fit relative to a "no score" baseline; EP is then the probability-weighted sum of the seven point values. The response is classification, not regression, because the point-value gaps between events violate linear-regression residual assumptions. Covariates are just six: down (1–4), seconds remaining in half, yardline, log(yards to go), goal-to-go indicator, under-two-minutes indicator — plus three interactions (log(YTG)×down, yardline×down, log(YTG)×goal-to-go). Two methodological choices matter: (1) **observation weighting** — plays are down-weighted by score differential and by "drives until the next score," because blowout plays and distant-future scores distort the fit; (2) **model selection by calibration, not likelihood** — predicted probabilities are binned in 5% increments against observed event rates and the model with the best leave-one-season-out (LOSO) calibration error is chosen (final e ≈ 0.013). Kick plays get special overrides: two-point attempts use a flat 47.35% historical rate (0.947 EP); extra points and field goals use a generalized additive model of make-probability as a smooth function of kick distance only, with a missed-FG correction of 8 yards field position and 5.07 seconds.

### What changed since

Current nflfastR's production `ep_model` is a serialized **XGBoost** model (confirmed in fastrmodels CRAN docs), and its EP function returns the full seven-event probability vector (p_no_score, p_opp_fg, p_opp_safety, p_opp_td, p_fg, p_safety, p_td) plus the aggregated EP. Yurko's multinomial logistic regression is the reproducible foundation; it is **not** what current nflfastR runs. Brill et al. (2024) further warn that play-level EP models inherit drive-level dependence (many plays share one eventual score), selection bias, and overfitting artifacts, and lack uncertainty estimates.

### Implementation takeaway for the engine

Implement EP as a two-stage **event-probability → weighted-sum** model (the probability vector is the valuable artifact — it feeds win probability and fourth-down models too). If starting simple, Yurko's six-covariate multinomial logit is fully reproducible from the paper; upgrade to gradient boosting only after the simple version is calibrated. **Validate with LOSO or drive-clustered splits, never random play splits** — multiple plays on the same drive share the same eventual scoring event, so random play-level splits leak the label. Weight or filter blowout and far-from-score observations the way Yurko does.

### Verification status

- VERIFIED (primary, full text): Yurko EP = multinomial logistic regression, seven scoring events, covariates + interactions + observation weighting + LOSO calibration selection.
- VERIFIED (primary docs): current nflfastR/fastrmodels `ep_model` is XGBoost, returns the seven-event probability vector.
- VERIFIED (primary, abstract/search text): Brill et al. 2024 critiques drive-level dependence, selection bias, overfitting, missing uncertainty.
- UNVERIFIED: the exact feature set, training window, and hyperparameters of the current XGBoost EP model — the two methodology pages I located (Open Source Football 2020 nflfastR model article and its Wayback copy) both failed to load and were not retried. Do not claim to know nflfastR's current feature list.

---

## 2. CPOE (completion percentage over expected)

### Key sources

- **nflfastR R-package docs (CRAN)** — defines `cp` (completion probability) and `cpoe`: https://cran.r-project.org/web/packages/nflfastR/nflfastR.pdf
- **fastrmodels R-package docs (CRAN)** — current `cp_model` object class: https://ftp.openbsd.dk/pub/mirrors/pub/cran/web/packages/fastrmodels/fastrmodels.pdf
- nflfastR's original CP-model methodology article (Open Source Football, 2020-09-28) — **located but could not be fetched; Wayback copy also failed. Not retried. Treated as unavailable.**

### Method summary

CPOE is a residual: for each pass attempt, a completion-probability model produces `cp` (probability the pass is completed given context), and play-level `cpoe = complete_pass − cp` (1 if completed, 0 if not, minus predicted probability). Aggregation to player/team level is the mean residual over attempts. That is the entire public definition — CPOE is model-agnostic; its quality equals the quality of the underlying `cp` model. What I could verify about the current public implementation: nflfastR's `cp_model` in fastrmodels is a serialized **XGBoost** model, not a logistic regression.

### Implementation takeaway for the engine

CPOE belongs in the engine as a **QB/team passing-efficiency feature** that is opponent- and situation-adjusted by construction (the `cp` model conditions on context). Use team-level rolling mean CPOE as an input to the Elo adjustment or as a spread/moneyline feature; never aggregate raw completion percentage. Because play-level CPOE is a Bernoulli residual, season aggregates need **shrinkage toward zero for low attempt counts** (early season, backup QBs).

### Verification status

- VERIFIED (primary docs): `cp` = completion probability; play-level `cpoe = complete_pass − cp`; aggregation = mean residual; current `cp_model` is XGBoost.
- UNVERIFIED: the exact feature set (throw depth, receiver separation, pressure, etc.), training window, and validation of nflfastR's current `cp_model`. The original methodology article failed to load twice and was not retried.
- UNVERIFIED (attribution): the "logistic model using throw depth, receiver separation, pressure" description could **not** be tied to nflfastR from any source I read. Those features match tracking-based (Next Gen Stats-style) expected-completion models, not necessarily nflfastR's public play-by-play model. Do not present that feature list as nflfastR's.

---

## 3. DVOA / DAVE

### Key sources

- **FTN Fantasy, "Week 1 DVOA: San Francisco's Big Victory" (Aaron Schatz, 2026)** — current method details: https://ftnfantasy.com/nfl/week-1-dvoa-san-franciscos-big-victory
- **FTN Fantasy, "Aaron Schatz's 2026 DVOA Projections" (2026)** — preseason forecast inputs: https://ftnfantasy.com/nfl/aaron-schatzs-2026-dvoa-projections
- **FTN Fantasy, "Week 11 DVOA: 49ers Now on Top" (2025)** — early-season DAVE blend weights: https://ftnfantasy.com/nfl/week-11-dvoa-49ers-now-on-top
- Historical origin: Schatz, *Pro Football Prospectus* (Football Outsiders). No peer-reviewed paper found; the provider's own writing is the primary source.

### Method summary

**DVOA** (defense-adjusted value over average) compares **every play to a situational league-average baseline** for that down, distance, and field position, and explicitly values **progress toward a first down rather than raw yards** (a 3-yard gain on 3rd-and-2 beats an 8-yard gain on 3rd-and-10). Each play is then adjusted for the quality of the opponent faced — the defining step that makes DVOA an opponent-adjusted efficiency metric rather than a raw one. Verified current details (Schatz, 2026): early-season opponent adjustments use **prior-year information** (Week 1 2026 used 50% of the prior year's opposing pass-offense adjustment, 30% run offense, 20% opposing defense); and DVOA treats **all fumbles the same whether recovered or not**, directly baking fumble-recovery randomness into the metric. **DAVE** (DVOA adjusted for variation early) blends the preseason projection with observed DVOA, with the blend shifting as the season accumulates: after Week 1 of 2026, DAVE was **83% preseason forecast for offense and 98% preseason for defense/special teams** (Week 11 of 2025: 12% forecast for offense, 35% for defense) — a shrinkage scheme that trusts small-sample offensive data earlier than defensive data. The 2026 preseason forecasts combine three prior seasons of DVOA, a separate starting-QB projection, regression to the mean, personnel changes, coaching experience, draft history, offensive-line age/tenure, and injuries.

### Implementation takeaway for the engine

DVOA is the template for the engine's **opponent-adjusted efficiency layer**: per-play value over a situational baseline, opponent-adjusted, with fumble luck stripped out by counting all fumbles equally. Since the exact DVOA formula is proprietary, implement a **DVOA-inspired** metric: EPA per play adjusted for opponent (iterative or regression-based strength-of-schedule correction), regressed early-season with a DAVE-style preseason-prior blend (heavier prior on defense, which stabilizes slower). The Week-1 50/30/20 prior-year opponent-adjustment split is a concrete, citable starting point for early-season games.

### Verification status

- VERIFIED (provider, 2026): play-vs-situational-baseline construction, first-down-progress weighting, opponent adjustments, all-fumbles-equal treatment, DAVE blend definition and exact 2026 Week-1 weights (83%/98%), preseason forecast input list, early-season prior-year opponent-adjustment splits (50/30/20).
- UNVERIFIED: the exact per-play DVOA weights, the full opponent-adjustment formula, and the precise DAVE decay schedule. These are proprietary; any engine implementation is "DVOA-inspired," never "DVOA."
- UNVERIFIED: no peer-reviewed publication of the DVOA method was located; Schatz's provider writing is the best primary source.

---

## 4. Fourth-down win probability (nfl4th)

### Key sources

- **nfl4th R package, official site** — `add_4th_probs` model documentation (go/punt/FG submodels, outputs, stated limitations): https://www.nfl4th.com/
- **nfl4th CRAN manual (2026)** — function reference: https://cran.asia/web/packages/nfl4th/nfl4th.pdf
- **Sandholtz, Wu, Puterman & Chan, "Learning Risk Preferences in Markov Decision Processes: an Application to the Fourth Down Decision in the NFL"** (arXiv 2309.00756v2, 2024) — academic treatment, confirms nfl4th's WP model as the decision engine and surveys the literature: https://arxiv.org/html/2309.00756v2
- Lineage: Romer (2006, dynamic programming — coaches far too conservative); Burke et al. (2014, 4th Down Calculator); Baldwin (2021a, fourth-down decision bot); Yam & Lopez (2019, conservative decisions cost ~0.4 wins/year); Daly-Grafstein (2023, selection-bias correction via Heckman model); Lopez (2020, yardage-rounding confounding inflates aggressiveness); Brill, Yurko & Wyner (2023, uncertainty understated in WP-based policies); Roach & Owens (2024, coaches overweight recent failures).

### Method summary

The nfl4th decision engine is **expected win probability, compared across actions**: for a given fourth-down state it estimates WP(go), WP(field goal), and WP(punt) and recommends the action with the highest expected WP; the reported "go boost" is the WP advantage of going over the best kick/punt alternative. The three action models are separate components (documented on nfl4th.com): the **go model** predicts a full distribution of yards gained and includes first downs awarded by defensive penalty; the **punt model** includes blocks, return touchdowns, and fumbled returns; the **FG model** is kick-make probability as a function of distance and roof type. These feed a win-probability model — Sandholtz et al. confirm the package's WP estimates come from the nflfastR-family WP model (Baldwin 2024) — with game-state inputs including yardline, yards to go, score differential, time remaining, and timeouts. Stated limitations (official site): the go model **excludes turnover returns**; the punt model ignores player identity and some penalties; the FG model ignores kicker identity, outdoor weather, and blocked-return outcomes. The academic literature adds three corrections an engine should respect: raw-data estimates are corrupted by **selection bias** (only good teams attempt aggressive 4ths — correct with a Heckman-style selection model per Daly-Grafstein 2023); **yardline rounding** to integers overstates optimal aggressiveness (Lopez 2020); and WP-based policies **understate uncertainty** (Brill–Yurko–Wyner 2023), so small go-boost edges should not be treated as sharp. Note the conceptual point from Sandholtz et al.: coaches behave as if optimizing *low quantiles* of the outcome distribution (conservative risk preferences), so a WP-maximizing engine will systematically disagree with observed coaching — that gap is the model's edge, not a bug.

### Implementation takeaway for the engine

This section matters less as a bet-prediction input and more as a **coaching-decision adjustment**: in-game and pre-game models should price fourth-down behavior from WP-maximization, not from league-average coach behavior, because the literature shows average coaching leaves ~0.4 wins/year on the table. For the engine: add a "fourth-down aggressiveness" team/coach feature (actual go rate vs WP-optimal go rate), and in live betting use the go/punt/FG WP differentials as situation features. If rebuilding the decision model, replicate nfl4th's architecture (action-specific outcome distributions → expected WP → argmax) and carry its documented limitations.

### Verification status

- VERIFIED (official package site): the three submodels' contents (go = yards-gained distribution + defensive-penalty first downs; punt = blocks/return TDs/fumbled returns; FG = distance + roof type), the recommendation rule (highest expected WP), and the stated limitations.
- VERIFIED (academic, 2024): nfl4th's WP model underlies the decision engine; the literature chain (Romer → Burke → Baldwin → Yam & Lopez → Daly-Grafstein → Lopez → Brill/Yurko/Wyner → Roach & Owens) with the specific corrections each adds.
- PARTIAL: CRAN dependencies include XGBoost and GAM tooling, but I could not confirm from readable sources which submodel uses which model class — do not assert it. Exact current training windows/calibration procedure are UNVERIFIED.

---

## 5. Turnover regression

### Key sources

- **Bock, "Empirical Prediction of Turnovers in NFL Football"** (PMC5969004, 2017) — peer-reviewed, play-level turnover prediction: http://pmc.ncbi.nlm.nih.gov/articles/PMC5969004/
- **Stuart, "2013 Fumble Recovery Data Has Jets, Cowboys at Extremes" (Football Perspective)** — 1990–2012 fumble-recovery year-to-year analysis: http://www.footballperspective.com/2013-fumble-recovery-data-has-jets-cowboys-at-extremes/
- **Burke, "Randomness of Fumble Recoveries" (Advanced Football Analytics, 2007)** — recovery ratio vs wins/points: https://archive.advancedfootballanalytics.com/2007/12/randomness-of-fumble-recoveries.html
- **Beuoy, "How Turnovers Affect the Spread" (Inpredictable)** — turnover value vs point spread: https://inpredictable.com/2012/02/nfl-turnover-differential-and-point.html
- Ryan, Harvard Sports Analysis Collective — luck vs talent split in year-over-year turnover differential.
- Barnwell, Grantland (2013) — fumble-recovery randomness ("quarterbacks and running backs recover their own fumbles").

### Method summary

The empirical core is a split between **occurrence** (partially skill) and **recovery** (near-pure noise). Bock (2017, peer-reviewed) models next-play turnover probability with gradient-boosted trees on game state and recent play history (drive, quarter, down, time, field position, yards to go, drive yards, play type, score differential, run/pass location, prior-play outcome), using class rebalancing and validation on natural prevalence for a sub-3%-of-passes / sub-1%-of-runs event — but his objective is classification ranking, **not calibrated probabilities**, so his model is not directly an expected-turnovers estimator. The Harvard Sports Analysis work finds year-over-year turnover differential is driven by **roughly equal parts luck and talent**, with weak within-season persistence. The fumble-recovery literature is decisive: Stuart's 1990–2012 data shows **year-to-year recovery-rate correlations of 0.00 (own fumbles) and −0.02 (opponent fumbles)** — pure noise — and the 20 best recovery teams (75.4%) collapsed to 50.4% the next year; Burke (2007) found fumble recovery ratio not statistically significant for predicting points or wins. Beuoy's spread analysis is exploratory but consistent: turnover margin regresses and the market overprices it. The methodological correction the engine needs: **fumble rate and forced-fumble generation can carry signal; fumble recovery should be regressed essentially to 50%**.

### Implementation takeaway for the engine

Never carry raw turnover margin or interception/fumble-recovery totals forward as team features. Decompose expected turnovers into two separately modeled pieces: (1) **turnover occurrence** — model forced fumbles and interception-thrown probability from pressure, QB decision features (aggressiveness, CPOE under pressure), and play-type mix; (2) **recovery** — apply a flat ~50% prior (conditioned on fumble type/location if data supports it), i.e., count forced fumbles, not recovered fumbles. A team that recovered 65% of fumbles last season should be projected at ~50%, full stop — the Stuart 0.00/−0.02 correlations are the license for that.

### Verification status

- VERIFIED (peer-reviewed): Bock 2017 — GBM next-play turnover model, features, imbalance handling, event rarity (under 3% INT/pass, under 1% defense-recovered fumble/run); classification objective, not calibrated probabilities.
- VERIFIED (empirical, long sample): Stuart 1990–2012 — 0.00/−0.02 year-to-year recovery correlations; 75.4% → 50.4% regression of top-20 recovery teams.
- VERIFIED (empirical): Burke 2007 — recovery ratio not significant for points/wins.
- VERIFIED (search text; page itself is a repost of Grantland): Barnwell's "quarterbacks and running backs recover their own fumbles" randomness account.
- THIN/UNVERIFIED: a single citable number for the exact luck/talent split in year-over-year turnover differential (HSA summarized as "nearly equal" — treat as directional, not a parameter); Beuoy's spread piece is exploratory, not academic — use as supporting color only.

---

## 6. Pressure stability

### Key sources

- **PFF, "Debunking the myth of the 'sack artist'"** — pressure vs sack skill: https://www.pff.com/news/nfl-pff-data-study-sack-artist-pass-rushers
- **PFF, "'Luck, not skill': What the data says about pass-rushers' career years"** — pressure-to-sack conversion simulation: https://www.pff.com/news/nfl-pff-data-study-luck-not-skill-pass-rushers-career-year-2020
- **Deshpande, Evans, Ventura et al., "Here Comes the STRAIN: Analyzing Defensive Pass Rush in American Football with Player Tracking Data"** (arXiv 2305.10262, 2023) — tracking-data pass-rush metric: http://arxiv.org/pdf/2305.10262v2

### Method summary

The literature separates **generating pressure** (a stable pass-rusher skill) from **converting pressure into sacks** (largely quarterback/situation luck). PFF's sack-artist study argues sacks depend heavily on the quarterback, scheme, coverage, down, and distance — the Lorenzo Alexander case: a 26% pressure-to-sack rate in 2016 regressed to 14.6% over 2017–2019 even as his pressure rate rose. Their simulation study reports pressure-generation level and pressure-to-sack "luck" are effectively independent (**R² < 0.005** for both edge and interior rushers). The STRAIN paper (player-tracking data) gives the positive result: STRAIN is highly stable within a season (first-half vs second-half **r = 0.8545**), and early-season STRAIN predicts future pressure rate (**r = 0.3217**) far better than prior pressure rate itself does (**r = 0.0965**), with concurrent STRAIN–pressure association r = 0.6255. In short: pressure generation is real and measurable from tracking data; the sack is the noisy realization.

### Implementation takeaway for the engine

Two separate models, never one extrapolated sack total: (1) forecast **pressure generation** (pass-rush win rate / STRAIN-style, from matchup features — OL vs DL grades, blitz rate, time-to-throw); (2) forecast **sack conversion** conditional on pressure, driven by QB-side features (time to throw, scramble tendency, sack-avoidance) and situation (down, distance, score). Projecting defensive sacks by extrapolating last season's sack totals imports pure noise — the R² < 0.005 result is the quantitative justification for the split.

### Verification status

- VERIFIED (provider): PFF — pressure-to-sack conversion not a repeatable rusher skill; Alexander 26% → 14.6% case; pressure level vs conversion luck R² < 0.005.
- VERIFIED (primary paper): STRAIN — stability r = 0.8545; early STRAIN predicts future pressure rate r = 0.3217 vs 0.0965 for prior pressure rate; concurrent r = 0.6255.
- THIN: public play-by-play data lacks the tracking inputs for true STRAIN; an engine without tracking data must proxy pressure generation from PFF-style charting or pressure rates, which are weaker. Mark any non-tracking implementation as a proxy.

---

## 7. EPA predictive validity

### Key sources

- **PFF, "Can we predict hot starts?"** — first-half to second-half EPA stability: https://www.pff.com/news/nfl-pff-data-study-can-we-predict-hot-starts
- **Zhou, "Which early-season NFL stats can you actually trust?" (2026)** — bootstrap stability analysis on nflfastR data: https://medium.com/@mrz9144/which-early-season-nfl-stats-can-you-actually-trust-1356b4784863
- **topfunky/r-nfl-expected-wins (GitHub)** — reproduction repo, efficiency-vs-wins correlations: https://github.com/topfunky/r-nfl-expected-wins
- Burke, Advanced Football Analytics (2007) — foundational pass-efficiency work, consistent with the above.

### Method summary

No peer-reviewed paper with clean forward-validation of passing EPA vs rushing EPA vs success rate was located — the evidence base is provider and independent-analyst work, reported here with that caveat. What it says: **passing efficiency dominates**. The expected-wins reproduction finds correlations with wins of 0.61/0.59/0.53 for offensive passing efficiency across three eras vs 0.18/0.19/0.13 for rushing; defensive passing −0.47/−0.45/−0.49 vs defensive rushing −0.04 in every sample. PFF's hot-start study (first-half → second-half stability): offensive EPA **r = 0.57**, defensive EPA allowed r = 0.313; scripted-drive EPA is far noisier (offense 0.26, defense 0.16) than non-scripted (0.51/0.29), and overall EPA variables carried **10×+ the model importance** of scripted splits for predicting first-quarter scoring. Zhou's 2026 analysis (nflfastR data, 1,000 bootstrap replicates, six-game samples): offensive success rate stability **r ≈ 0.60**, passing EPA correlation with future point differential **r ≈ 0.42**. Two distinctions the engine must keep: (1) **stability ≠ predictive relevance** — a metric can stabilize early yet predict wins poorly (rushing); (2) **scripted/opening-drive EPA should be down-weighted or excluded** from team-strength features.

### Implementation takeaway for the engine

Weight the Elo adjustment and spread features heavily toward **passing EPA and success rate**, near-zero weight on rushing EPA (the 0.53–0.61 vs 0.13–0.19 correlation gap is the single most actionable number in this dossier). Use **non-scripted EPA only** for team strength (strip opening-scripted drives). Early-season: shrink defensive EPA harder than offensive (PFF's 0.57 vs 0.313 stability gap mirrors DAVE's 83%/98% preseason-blend asymmetry — independent corroboration of the same phenomenon). Report all of these as provisional until a peer-reviewed forward-validation study is found.

### Verification status

- VERIFIED (provider): PFF hot-start stability numbers (0.57/0.313; scripted 0.26/0.16; non-scripted 0.51/0.29; 10× importance).
- VERIFIED (independent analyst, 2026, nflfastR data, bootstrapped): Zhou — success rate r ≈ 0.60, passing EPA → future point differential r ≈ 0.42. Not peer-reviewed; treat as strong-but-informal.
- VERIFIED (reproduction repo, code visible): expected-wins correlations (pass 0.61/0.59/0.53; rush 0.18/0.19/0.13; def pass −0.47/−0.45/−0.49; def rush −0.04). Reproducible, not peer-reviewed.
- UNVERIFIED: a peer-reviewed, apples-to-apples forward-validation comparing passing EPA vs rushing EPA vs success rate as predictors of future wins/spread. This is the dossier's biggest literature gap.

---

## Handoff: source-strength summary

**Solid primary-source topics** (paper or official docs read in full):
1. Expected points — Yurko et al. 2018 (full method) + current XGBoost production status + Brill et al. 2024 critique.
2. Fourth-down WP — nfl4th official docs (submodels, limitations) + Sandholtz et al. 2024 academic survey with the full correction literature.
3. Turnover regression — Bock 2017 (peer-reviewed) + Stuart 1990–2012 fumble-recovery data + Burke 2007.
4. Pressure/sack separation — PFF studies + STRAIN tracking paper (2023).
5. DAVE's current implementation — Schatz/FTN 2026 articles (blend weights, forecast inputs, opponent-adjustment splits).

**Thin or unverified topics** (mark as such in any downstream use):
1. Exact nflfastR CPOE feature specification — methodology article unfetchable; current `cp_model` confirmed XGBoost only.
2. Exact current nflfastR XGBoost EP/CP feature sets and training windows — UNVERIFIED.
3. Full proprietary DVOA formula and DAVE decay schedule — proprietary by design.
4. Peer-reviewed EPA forward-validity study — the biggest gap; current evidence is provider/analyst-grade.
5. Precise luck-vs-talent split number for turnover differential — directional only.

**Three most implementation-relevant findings for Garrett's Elo engine:**
1. **Validate EPA/WP features with drive- or game-grouped splits, never random play splits** — plays on a drive share one scoring outcome; random splits leak the label (Yurko's LOSO calibration + Brill et al. 2024).
2. **Split sacks into pressure generation × QB-conditioned conversion** — pressure-to-sack luck has R² < 0.005 with pressure level; extrapolating sack totals is pure noise (PFF, STRAIN).
3. **Decompose turnovers into occurrence vs ~50%-prior recovery** — year-to-year fumble-recovery correlation is 0.00/−0.02; count forced fumbles, never recovered fumbles, in team-strength features.

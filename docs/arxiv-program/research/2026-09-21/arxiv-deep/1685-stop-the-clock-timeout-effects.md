# 1685 Stop the Clock: Are Timeout Effects Real? (arXiv:2009.06750)

**Citation:** Niander Assis, Renato Assunção, Pedro O.S. Vaz-de-Melo (2020). *Stop the Clock: Are Timeout Effects Real?* arXiv:2009.06750. URL: https://arxiv.org/abs/2009.06750
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all 6 sections + references).
**Verdict:** ADAPT — the DAG/back-door-criterion framing plus same-game exact matching on pre-trend is a clean template for debiasing GSE's in-game momentum features, but the basketball-timeout estimand itself is not directly portable.

## 1. Research question

Do timeouts causally improve a team's short-term performance in the NBA, or is the widely observed post-timeout "momentum swing" just regression to the mean? Prior work reported positive effects from naïve before/after averages; the authors apply a formal Pearl causal framework to test whether any effect survives proper confounding control.

## 2. Method / model

- **Causal graph (Pearl DAG):** treatment At (timeout at game instant t) → outcome Yt^λ; observed intra-game confounders Xt = (quarter Qt, scoring margin Pt, seconds since period start St); unobserved inter-game confounders U (team skill gap, venue, strategies, attendance — dashed node); pre-trend ΔPt−λ^t (avg scoring-margin change rate before t) and post-trend ΔPt^{t+λ} as mediators; outcome Yt^λ is a deterministic node (function of the two trend nodes).
- **Identification:** back-door criterion — adjust for U, Xt, and ΔPt−λ^t to block all non-causal paths from At to Yt^λ. U is handled by restricting matches to the *same game*.
- **Matching (3 methods):** (1) no-balance (exact match on ΔPt−λ^t within same game); (2) Mahalanobis on Xt; (3) propensity score (GBM boosting regression trees via R gbm, chosen because timeout probability is highly nonlinear in clock time — coaches call timeouts just before mandatory official timeouts) with Euclidean distance on the scalar score. Optimal matching via rcbalance (exploits sparsity); matches restricted to non-overlapping possession windows; control pool pre-filtered to instants whose ΔP exactly equals some treated instant's ΔP in the same game.
- **Inference:** Monte Carlo permutation test (10,000 permutations) on difference-in-means; 99% CIs from permutation p-values; 3,766–7,082 matched pairs per test.
- **Robustness:** λ ∈ {2,4,6} possession windows; separate home/away treatment effects; last-5-minutes vs rest-of-game stratification.

## 3. Mathematics / equations / assumptions

- Game instants: discrete sequence of possessions and major interruptions (timeouts, official timeouts, quarter ends); n instants per game.
- Scoring margin Pt = target-team score − opponent score at instant t.
- Short-term momentum change (Eq. 1): Yt^λ = (Pt+λ − Pt)/λ − (Pt−1 − Pt−λ−1)/λ = ΔPt^{t+λ} − ΔPt−λ^t (post-rate minus pre-rate of scoring-margin change); λ even; valid only if [t−λ, t+λ] contains no other interruption.
- Timeout effect (Eq. 2): TE = E[Yt^λ | At=1] − E[Yt^λ | At=0]; estimated separately as TEh (home) and TEa (away).
- Assumptions: conditional ignorability given (U, Xt, ΔPt−λ^t); SUTVA via non-overlapping windows; DAG is complete (all important confounders included); U fully absorbed by same-game matching.

## 4. Dataset / schema

- **Source:** play-by-play tables crawled from Basketball-Reference (http://www.basketball-reference.com).
- **Sample:** NBA 2014-15 through 2017-18; main analysis on 2016-17 season (30 teams, 1,309 games incl. playoffs); 281,373 game instants; 17,765 timeouts identified (7,754 home-called, 8,011 away-called, 2,000 mandatory/official).
- **Schema per instant:** t, Pt, Qt, St, At, ΔPt−λ^t, Yt^λ, game id, home/away caller.
- **Access:** authors' GitHub repo (data + code); Basketball-Reference is public but scraping ToS-limited.

## 5. Features / target

- **Features (confounders):** quarter Qt, scoring margin Pt, seconds since period start St (Xt); pre-trend ΔPt−λ^t; game identity (absorbs U).
- **Target:** STMC Yt^λ — change in scoring-margin-per-possession rate after the instant vs before; the causal contrast TE = E[Y|do(timeout)] − E[Y|do(no timeout)].

## 6. Validation design

- **Design:** causal estimation, not prediction — no train/test split; validity argued via 3 matching estimators agreeing, balance tables (SMD before/after matching, Table 1), permutation-based inference.
- **Robustness:** λ ∈ {2,4,6}; home vs away; last-5-min vs rest-of-game; other seasons replicated ("very similar results", stated without numbers).
- **Balance check:** standardized mean differences for Xt before matching vs after each method.

## 7. Exact results and baselines (numbers)

- **Naïve (no causal adjustment):** mean STMC after timeouts = +0.629 (λ=2, n=14,031), +0.421 (λ=4, n=12,225), +0.302 (λ=6, n=10,296); Wilcoxon + bootstrap tests vs 0 give p "numerically equal to zero" — the conventional (wrong) evidence for a positive timeout effect.
- **Causal estimates (Table 2, 99% CIs):** all |TE| ≤ 0.059 points/possession. Largest magnitude: propensity matching, λ=4, away: TEa = −0.059, 99% CI (−0.098, −0.020). Home λ=4 propensity: −0.032 (−0.072, 0.008). λ=2/6 values range −0.017 to −0.053.
- **Significance:** of 18 tests, only 6 significant at α=0.001 (no multiplicity correction; authors note correction would leave fewer); every significant effect is negligible in magnitude (< 0.06 pts/possession vs their 1-point practical relevance threshold).
- **Last-5-minutes stratification (Table 3):** "very similar" — timeouts have virtually no effect in clutch time either.
- **Conclusion:** timeouts have no causal effect on team performance; the apparent effect is regression to the mean.

## 8. Code / data availability

**Stated:** datasets, code, and reproduction instructions at https://github.com/pkdd-paper/paper667 (R: gbm for propensity, rcbalance for optimal matching). Data crawled from Basketball-Reference.

## 9. Leakage and limitations

- **DAG completeness is asserted, not tested:** U (skill gap, coach quality, player availability) is "controlled" only by same-game matching — but within a game, the *reason* a coach calls a timeout at instant t vs not at t′ (fatigue, matchup exploitation, referee tendencies) remains unobserved and is likely correlated with the outcome. The authors' key confounder is the pre-trend, but timeout *timing* within a game is strategic.
- **Interference/SUTVA:** λ-windows are non-overlapping by construction for matched pairs, but other timeouts elsewhere in the game (outside windows) still affect game state.
- **No multiplicity correction** on 18 tests (acknowledged).
- **Practical threshold is subjective:** the "1 point" relevance bar is asserted without justification.
- **External validity:** NBA-specific; timeout mechanics differ across leagues; 2016-17 season only for main results.

## 10. GSE overlap

Complements ledger 1684 (Gibbs et al. timeout paper, ATT −0.35 on a different outcome): both find timeouts don't help — convergent evidence. GSE has no causal-timeout work, but the *methodological* value is the DAG + back-door + same-game exact matching recipe, which ports to NFL "momentum" questions (e.g., does an icing-the-kicker timeout causally change FG make probability? — directly testable with nflverse). No existing GSE doc frames in-game decisions with explicit causal graphs.

## 11. GSE implementation spec

- **Target estimand:** causal effect of icing-the-kicker timeouts on FG/XP make probability; treatment = timeout called by defense immediately before kick; control = matched kicks with no timeout.
- **Data:** nflverse pbp (all FG/XP attempts 1999–2024) with timeout indicators.
- **DAG:** confounders = kick distance, weather (wind/temp), kicker identity/quality, score differential, time remaining, dome/outdoor; pre-trend analogue = kicker's recent make rate; same-game matching absorbs team/coach U.
- **Outcome:** kick made (binary) — or expected-points delta.
- **Estimation:** propensity via GBM on confounders + exact match on distance bucket and same game; permutation inference.
- **Product:** "Icing the kicker is a myth" causal content series for @GalaxySportsHQ; feeds GSE's late-game WP model (remove spurious timeout-effect features if null confirmed).
- **Effort:** 1–2 weeks.

## 12. Reproducible test

- **Dataset:** nflverse pbp 2015–2024, all field-goal attempts ≥ 30 yards in the last 3 minutes of halves (icing-relevant situations).
- **Metric:** matched ATT of defensive timeout-before-kick on make probability; report estimate + 99% permutation CI.
- **Baseline to beat:** naïve before/after difference (expected to show a spurious "icing works/doesn't work" effect); the causal pipeline passes if (a) covariate SMD < 0.1 post-match and (b) the matched ATT shrinks toward 0 relative to the naïve estimate by ≥ 50% (demonstrating confounding removal) OR is significant with |ATT| ≥ 3 percentage points (a genuine finding either way).
- **Window:** 2015–2024 seasons pooled; λ-analogue = fixed kick-level outcome (no window choice needed).

## 13. Acceptance / rejection gate + improvement experiment

- **Gate (numeric):** ADAPT the DAG+matching template if the NFL icing replication achieves post-match SMD < 0.1 on all observed confounders AND the 99% permutation CI for the ATT either excludes 0 with |ATT| ≥ 0.03 (real effect found — publish) or includes 0 with CI half-width < 0.03 (clean null — prune the feature). REJECT the transfer if balance fails or CI half-width > 0.05 (underpowered).
- **Improvement experiment:** the paper matches on *levels* of the pre-trend; a stronger design is **difference-in-differences on the trend itself** — compare the *change* in scoring-rate slope (post minus pre) between timeout and matched non-timeout instants, which differences out any remaining instant-level unobservables. Second: replace the hard λ window with a learned influence horizon via a distributed-lag model of scoring margin on timeout indicators, letting the data choose how long a timeout's effect persists instead of asserting λ ∈ {2,4,6}.

**Verdict:** ADAPT — the Pearl-DAG plus same-game matching design is a reusable template for debiasing GSE's in-game causal questions (icing the kicker, momentum features).

# 0984 — Suspense and surprise in European football (2506.21253v1)
**Ledger:** 0984 | **arXiv:** 2506.21253v1 (2025) | **Lane:** win_spread_total
**Title:** "Suspense and Surprise in European Football" — Raphael Flepp (U. Zurich), Tim Pawlowski & Travis Richardson (U. Tübingen)
**Replacement context:** Fresh-search replacement (query: `abs:"uncertainty of outcome" AND abs:sport`) for an original-assignment duplicate already in the corpus map. Duplicate skips are not REJECTs — see wave summary.

---

## Citation / full-text source
Full citation: "Suspense and Surprise in European Football" — Raphael Flepp (U. Zurich), Tim Pawlowski & Travis Richardson (U. Tübingen). Full text: arXiv 2506.21253v1 (2025), https://arxiv.org/abs/2506.21253v1.

## Research question
The paper replaces outcome uncertainty (UOH) — which has failed to consistently predict stadium/TV demand in European football — with two within-match entertainment measures from Ely, Frankel & Kamenica (2015, JPE): **suspense** (forward-looking: variance in beliefs about the outcome in the *next* period) and **surprise** (backward-looking: shift in beliefs between the previous and current period). It derives benchmark ranges from 13.26M simulated matches, then computes both metrics minute-by-minute for 25,389 real men's matches (2010/11–2023/24) and 725 women's matches (2023/24) across Europe's top five leagues.

## Dataset / schema
- Simulations: 1,326 unique (λH, λA) combinations (each ∈ [0,5] in 0.1 steps) × 10,000 matches = **13,260,000** hypothetical matches, no red cards, EPL empirical minute-by-minute goal distribution.
- Real men's: **25,389** matches — EPL 5,320; Bundesliga 4,284; La Liga 5,320; Serie A 5,320; Ligue 1 5,145. Match events (goal/red-card timing) from fbref.com; pre-match closing 1X2 odds + over/under odds (0.5–5.5) from oddsportal.com.
- Real women's: **725** matches, 2023/24 season, five top divisions (England 132, Germany 132, Spain 240, Italy 90, France 131; Italy/France playoffs excluded, one suspended match excluded).
- TV-demand validation sample: 790 televised EPL matches (Sky/BT, 2013/14 2nd half–2018/19) merged with Buraimo et al. (2022) audience data.

## Method
1. **In-play outcome model:** each match is a "Poisson match" — X ~ Poisson(λH), Y ~ Poisson(λA), independent. Team scoring rates distributed across 90 minutes via league-specific empirical minute-by-minute goal distributions. Red cards adjust rates for the remainder (penalized team × 2/3, opponent × 1.2, per Vecer et al. 2009). Per minute, goals drawn as Gt ~ Bernoulli(p_t^S); **100,000 simulations per minute** → 9M simulated minutes per match; injury time folded into minutes 45/90 so every match is exactly 90 periods.
2. **Scoring-rate calibration per match** (Buraimo et al. 2020): optimization choosing (λH, λA) to match overround-removed closing 1X2 implied probabilities AND O/U (0.5–5.5) implied probabilities — market-anchored rates.
3. **Metrics:**
   - Surprise = Σ_{t=1}^{90} sqrt((p_t^H−p_{t−1}^H)² + (p_t^D−p_{t−1}^D)² + (p_t^A−p_{t−1}^A)²)
   - Suspense = Σ_{t=1}^{90} sqrt(Σ_{j∈{H,D,A}} [p_{t+1}^{HS}((p_{t+1}^j|HS_{t+1})−p_t^j)² + p_{t+1}^{AS}((p_{t+1}^j|AS_{t+1})−p_t^j)²])
4. **Benchmark:** perfectly balanced matches (λH=λA) at the 10th (0.5) and 90th (2.5) percentiles of empirical goals/team/match → benchmark ranges: **suspense [6.03, 6.89]** (low-scoring 6.89, high-scoring 6.03), **surprise [1.17, 1.74]** (low 1.17, high 1.74).
5. **Trends:** OLS of ln(suspense)/ln(surprise) on continuous season + top-team × season interactions, SEs clustered at home–away pair level.

**Hyperparameters / choices.** λ grid [0,5] step 0.1; 10,000 sims per combo; 100,000 sims per in-play minute; red-card multipliers (2/3, 1.2); benchmark percentiles 10th/90th; top-3 teams defined by total points in-sample per league.

## Equations / assumptions
The two metric equations above; X,Y independent Poisson; minute-by-minute Bernoulli scoring; Gt ~ Bernoulli(p_t^S); scoring rates from market-anchored optimization; exactly 90 periods (injury time folded in); neutral perspective (no fan-loyalty asymmetry); only goals and red cards enter the in-play model (no xG/possession/EPV).

## Features / target
Features: goal and red-card timing per minute (from fbref.com); per-match (λH, λA) scoring rates calibrated from overround-removed pre-match closing 1X2 and O/U (0.5–5.5) odds (from oddsportal.com); league-specific empirical minute-by-minute goal distributions. Target: per-match suspense and surprise scores (belief-path integrals over the 90 periods); secondary target: TV audience (ln audience) in the demand-validation regression.

## Validation
Classical outcome-uncertainty (absolute difference in pre-match win probabilities) is the explicit baseline: it correlates only −0.39 with suspense and −0.18 with surprise, and is non-significant in the TV-demand regression — the paper's core claim is that in-play dynamics beat pre-match uncertainty. Benchmark ranges from simulated perfectly-balanced matches serve as the absolute reference. **TV demand (Appendix A):** ln(suspense) β=0.042 (p=0.015), ln(surprise) β=0.050 (p=0.004) on ln(audience); pre-match outcome uncertainty **non-significant**. First PC of both (83% variance) also significant.

## Exact results / baselines
- **Simulation trade-off:** suspense peaks at λH=λA=0.5 and is zero at (0,0) even though perfectly balanced (balance ≠ uncertainty); surprise increases strictly with equal scoring rates (max at 5,5). Raising one team's rate while holding the other fixed moves suspense and surprise in *opposite* directions (e.g., λH 1→1.5 at λA=1: suspense ↓, surprise ↑).
- **Empirical levels (Table 2):** top-5 average suspense **5.85** (SD 2.14) — significantly below the benchmark lower bound 6.03 (p<0.01) in every league; average surprise **1.41** (SD 0.80) — inside the benchmark. EPL has the lowest suspense (5.74), Ligue 1 the highest (5.99). Top-team matches (especially Man City, Bayern, PSG) drag suspense down; non-top-team matches sit at/inside the benchmark.
- **Trends:** EPL suspense −0.6%/season overall, driven entirely by Man City matches (−3.9%/season suspense, −2.5%/season surprise; 7 titles in sample). Bundesliga −0.7%/season suspense, −0.5%/season surprise, *not* top-team driven. La Liga *increases*: +0.6%/season baseline, Real Madrid +4.5%/season, Barcelona +5.6%/season suspense (+2.8%/+4.5% surprise). Serie A flat except Inter (−2.2%/−2.0%). Ligue 1 PSG −3.1%/season suspense, −2.4%/season surprise.
- **Women's 2023/24:** suspense 4.93, surprise 1.24 — lower than men's, wider spread; Barcelona Liga F extreme: suspense **1.57**, surprise **0.37** (won every match but one draw) — the single most dominant team-season in either sample.
- **TV demand (Appendix A):** ln(suspense) β=0.042 (p=0.015), ln(surprise) β=0.050 (p=0.004) on ln(audience); pre-match outcome uncertainty **non-significant**. First PC of both (83% variance) also significant.
- **Bottom line for policy:** despite documented declines in classical balance metrics, suspense/surprise levels and trends "do not suggest an urgent need for regulatory intervention" in men's football.
- **Baselines.** Classical outcome-uncertainty (absolute difference in pre-match win probabilities) is the explicit baseline: it correlates only −0.39 with suspense and −0.18 with surprise, and is non-significant in the TV-demand regression — the paper's core claim is that in-play dynamics beat pre-match uncertainty. Benchmark ranges from simulated perfectly-balanced matches serve as the absolute reference.

## Code / data
No code or data released ("no further consistent data" for women; men's sources named — fbref.com for events, oddsportal.com for odds — but the 9M-simulations-per-match pipeline is not shared). No runtime reported for the simulation pipeline.

## Leakage
No leakage discussion in the paper; scoring rates are calibrated from pre-match closing odds and in-play updates use only events observed up to minute t (belief paths are strictly causal in time). The TV-demand regression is a validation correlation on a separate EPL sample (n=790, 2013–2019), not a forecasting test.

## Limitations
- In-play model uses only goals and red cards — no xG, possession, EPV, or defensive interventions; belief paths are coarser than a real viewer's.
- The 9M-simulations-per-match pipeline is computationally brutal; no runtime reported and no code/data released ("no further consistent data" for women; men's sources named but pipeline not shared).
- Benchmark bounds depend on arbitrary 10th/90th percentile choices for scoring rates.
- TV-demand validation is n=790 EPL-only, one market, 2013–2019; suspense loses significance when surprise is included (small N).
- Neutral perspective: ignores that suspense for a fan is asymmetric (their team's jeopardy vs hope) — acknowledged by authors.
- Women's analysis is a single-season cross-section; no trends possible.
- Club-level dominance conclusions (City, PSG) partly reflect the sample's title concentration rather than a structural law.

## GSE overlap
- Cites 0982 (SBM balance paper) as the structural-balance reference and 0983's DCB lineage as the classical-balance reference — positions itself as the demand-side layer the corpus lacked.
- No duplication: no other map paper computes within-match belief-path metrics or links them to TV demand. The market-anchored (λH, λA) calibration parallels the map's odds-based forecasting papers but serves entertainment measurement, not prediction.
- Directly cites **0982's paper** (Basini et al. 2023, the SBM competitive-balance paper) and the DCB authors of 0983 (Avila-Cano & Triguero-Ruiz 2023) — this is the demand-side companion to the balance-measurement trilogy (0980/0981/0982/0983): it answers "do balance changes actually cost viewers?" with "mostly no, and pre-match uncertainty is the wrong measure." Also adjacent to 2008.05417/1902.10067 (ledgers 0978/0979) via the market-odds calibration of scoring rates.

## Implementation (GSE adaptation)
- **What to build:** a **match entertainment engine** — for every GSE-covered fixture, compute pre-match and (where live data exists) in-play suspense/surprise from the paper's equations, using GSE's own win-probability model instead of Poisson+odds calibration. Outputs: per-match suspense/surprise scores, league benchmark bands, club trend dashboards.
- **Concretely:** (1) pre-match version — simulate the belief path using GSE's pre-match 1X2 distribution and expected-goals model, minute-by-minute goal probabilities, no in-play events needed: yields an *expected suspense/surprise* per fixture before kickoff; (2) validate against the paper's benchmark ranges on EPL 2023/24 (mean suspense should land below 6.03, mean surprise inside [1.17,1.74]); (3) ship as content features — "most suspenseful matches of the weekend," "lowest-surprise mismatch alerts" — and as a demand proxy for content scheduling (which games deserve the full production treatment).
- **Where it plugs in:** content prioritization, watch-guide features, and a genuinely novel fantasy-adjacent product input — expected-surprise as a "chaos index" for slate selection (high-surprise slates = more lineup differentiation value).

## Reproducible test
- Recompute match-level suspense/surprise for all 380 EPL 2023/24 matches using (λH,λA) calibrated from closing odds per the paper's procedure (or GSE's model mapped to equivalent rates); confirm (a) league mean suspense < 6.03, (b) league mean surprise ∈ [1.17,1.74], (c) Man City matches have the lowest mean suspense of any club, (d) correlation of computed suspense with the paper's reported league means within ±0.5.

## Numeric gate
- On the 2023/24 EPL reproduction, mean match suspense must be **below 6.03** (the paper's benchmark lower bound; paper's 14-season EPL mean: 5.74) and mean surprise must fall **inside [1.17, 1.74]** (paper: 1.38). Both conditions required — this is the paper's central empirical claim and the implementation must recover it.

## Improvement experiment
- **EPV-enriched belief paths (the authors' proposed extension):** replace the goal-only in-play model with expected-possession-value / xG-threat updates each minute so near-misses and possession shifts move beliefs. Success: on the TV-demand sample, the EPV-enriched surprise explains ≥10% more variance in ln(audience) than the goal-only version (ΔR² ≥ 0.10 × baseline).
- **Pre-match chaos index for product:** rank upcoming fixtures by expected surprise; backtest whether top-quintile expected-surprise slates produce higher underdog-hit rates and higher optimal-lineup score variance in DFS-style simulations — success if top-quintile slates show ≥15% higher payout variance, validating the product use case.

## Verdict
**ADAPT** — The strongest "new instrument" paper of the wave: two rigorously defined, TV-validated entertainment metrics with a complete computational recipe, a simulation benchmark, and a direct refutation of pre-match outcome uncertainty as a demand proxy. For GSE it is both a content engine (suspense rankings, chaos indices) and a strategic lens (which dominance actually costs viewers — less than assumed). The goal-only in-play model is the known gap; the EPV extension is the authors' own suggestion and a natural GSE build.

# Deep-Read Ledger 0979 — Does the Winning Team Always Cover the Point Spread? (NBA 1990–2016)

## Citation / full-text source

- arXiv:1902.10067 — full text: https://arxiv.org/pdf/1902.10067
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **Citation:** Mateos, L. A. (2019). "Does the winning team always covers the point spread? A study in professional basketball since 1990." arXiv:1902.10067v1 [stat.AP], 17 Jan 2019.
- **Full-text source:** https://arxiv.org/html/1902.10067v1 (HTML, read in full; ~29.5k chars)

## Research question
Is there a systematic relationship between a team's win percentage and its ability to cover the point spread (ATS), and can extreme win-percentage teams beat the 2.54% house edge?

## Dataset / schema
- NBA regular-season games, betting lines + final scores, 1990-91 through 2015-16, collected from local sportsbooks (Mexico, US, UK, Austria).
- Training: 1990-91 → 2013-14 (24 seasons; hundreds of games/season; split into 27-team, 29-team, 30-team eras). Test: 2014-15, 2015-16.
- Team win% range ≈ 25%–70%; classification: low W_pct < 0.3450, high W_pct > 0.6400, mediocre between.

## Method
- "Indirect factor analysis": sort teams by season win% and plot cover-rate, over-rate as a function of win% position; look for outlier groups escaping the house-edge band (50% ± 2.54%).
- "Player Edge" running-average algorithm from the extremes: expand the group (best→next-best; worst→next-worst) until the running-average cover/no-cover rate falls inside the house-edge band.

## Equations / math / assumptions
- House edge defined as 2.54% around 50% (i.e., −110 odds).
- Running average (cover side): **H̄_Cpct = (1/T_Hw) Σ_{i=0}^{T_Hw−1} t_c(t_Hw − i)**, where t_c = team cover %, starting at the highest-win% team. Mirror formula (2.2) for the no-cover side from the lowest-win% team.
- Deltas: Δw = final-score point differential; Δc = ATS error vs line (favourite's perspective); Δo = error vs total-points line.
- Reported "correlation" W/L↔C/N ≈ 0.2, W/L↔O/U ≈ −0.04, computed nonstandardly as "proportion of extreme outliers" — not Pearson.

## Features / target
- Feature: team's sorted win-percentage position (season-level).
- Targets: cover/no-cover/push the spread; over/under the total.

## Validation
- No significance tests, no confidence intervals. Train/test split only (2-season holdout). Profit computed as deviation from 50% (not actual bankroll ROI at −110; breakeven is 52.38%, so reported "profits" are overstated by ~2.4 pp in absolute terms).
- Running-average group selection is retrospective: groups are defined by the same data used to claim the edge (train), though the test set applies the ex-ante rule (3 worst / 2 best).

## Exact results with baselines
- Eras: 27-team era — 6 best teams cover beyond +2.54% band, 7 worst fail beyond −2.54%; 29-team era — 7 best / 8 worst; 30-team era — 5 best / 10 worst.
- Training cumulative "profit" (Σ of deviations): no-cover side, 12 worst teams, **Σ = 15.92%** (best cell: most-losing team 44.68% cover → 2.92%); cover side, 12 best teams, **Σ = 13.35%** (most-winning team 55.48% → 3.08%).
- **Test set 2014-15/2015-16:** 3 worst teams no-cover: 44.44% (3.16%), 43.64% (3.96%), 45.25% (2.35%) → **Σ = 9.47%**; 2 best teams cover: 57.14% (4.74%), 57.61% (5.21%) → **Σ = 9.95%**.
- Over/under: no systematic edge; only tendencies: high-win% teams go under ≈1.3% more than over; low-win% teams go over ≈1.2% more (both inside house-edge band).
- Table 1 example (2010-11): 6 low-win% teams averaged ≈26% (positions 1–6), 7 high-win% teams ≈71% (positions 24–30).

## Code / data availability
- SPXS Sports Picks Expert System (author's own, particlerobots.com); appendix with per-season results linked but not archived in-repo. No raw dataset download.

## Leakage
- Feature (season-end win%) is known only ex-post for the training claim; the test-set application uses a rolling ex-ante version implicitly. Selection of "extreme" cutoffs on the training data then re-evaluated on the same era is circular; the 2-season holdout partially mitigates this.

## Limitations
- "Profit" mislabeled: deviations from 50%, not −110 ROI; true breakeven is 52.38% cover, so e.g. the 55.48% cell is only +3.1 pp over breakeven.
- Zero statistical testing (no p-values, no CIs); tiny effective test sample (3 + 2 teams × 2 seasons).
- Nonstandard correlation definition; single-author, unrefereed; betting lines from heterogeneous local books.
- Answer to the title question is essentially "no, and bad teams are shaded against": line-shading toward elite/popular teams, consistent with known favourite–longshot-type biases.

## GSE overlap vs existing-research-map
- Map: "Market microstructure in sports betting — thin: only 1211.4000 + PLOS ONE 2023." Map covers CLV, de-vigged consensus, beat-the-close. **No prior coverage of win%↔ATS line-shading structure** (lines shaded toward elite teams → contrarian value on extreme bad teams ATS). Complements ledger 0978's bookmaker-lag theme.

## Implementation spec (GSE adaptation)
- Test the structural claim on NFL/CFB: regress ATS cover rate on pre-game market-implied win probability bins over 10+ seasons; check whether extreme-favourite bins systematically under-cover (line shading) and extreme-dog bins over-cover. If confirmed, add an "extremity shading correction" term to the GSE spread model: cover_prob = f(spread) adjusted by implied-win% bin fixed effects.
- Replicate properly: rolling (not season-end) win% feature, actual −110 ROI accounting, and block-bootstrap CIs — the paper's numbers are suggestive, not bankable.

## Reproducible test
- nflverse + historical spread data: for each NFL team-season-week, compute rolling win% entering the game; bin by market-implied win prob deciles; test cover rate ≠ 52.38% per decile with binomial CIs. Falsifies/validates the shading hypothesis on NFL data.

## Numeric gate
- **57.61% cover (test set, 2nd-best team) vs 52.38% −110 breakeven** — the single ex-ante number that keeps this from being pure data-mining.

## Improvement experiment
- Replace retrospective win%-position groups with pre-game market-implied win probability; fit a penalized logistic model of cover on implied-prob with monotonicity constraints; compare out-of-sample log-loss and ROI vs the naive extreme-group rule. Expect the structured model to retain a smaller but real edge if shading is genuine.

## Verdict
**ADAPT (weak)** — methodologically thin (mislabeled profits, no tests), but the structural idea is usable: lines are shaded toward elite teams, so extreme bad teams carry systematic ATS value; GSE should test this shading hypothesis rigorously on NFL/CFB rather than adopt the "Player Edge" rule.

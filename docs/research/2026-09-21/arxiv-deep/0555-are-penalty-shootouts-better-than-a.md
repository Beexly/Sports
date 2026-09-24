# [0555] Are penalty shootouts better than a coin toss? Evidence from international club football in Europe (arXiv:2510.17641v6)

**Citation:** László Csató, Dóra Gréta Petróczy (2026). *Are penalty shootouts better than a coin toss? Evidence from international club football in Europe*. arXiv:2510.17641v6. URL: https://arxiv.org/abs/2510.17641v6
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1841 lines).
**Verdict:** ADAPT — the soccer result itself doesn't transfer, but the method (binomial tests + Elo-strength logistic regressions on high-leverage tiebreaks) should be run on NFL overtime to settle whether OT coin-toss/first-possession edges are real or noise before GSE builds any feature on them.

## 1. Research question
Are UEFA penalty shootouts predictable? Four questions: (1) shooting order (first-mover advantage), (2) match venue (home field), (3) psychological momentum (comeback team, identified by who scored the last goal), (4) team strength (Football Club Elo Ratings). Motivated by UEFA scrapping the away-goals rule in 2021/22.

## 2. Dataset / schema
All 268 penalty shootouts in UEFA club competitions (Champions League, Europa League, Conference League incl. qualifiers), seasons 2000/01–2025/26. 139 of 268 (51.9%) occurred in the last six seasons — driven by COVID one-legged qualifiers (2020/21), abolition of the away-goals rule, and the new Conference League. Covariates: kicking order, venue (two definitions: mild = nominal home, strict = proper two-legged home), momentum proxy (which team scored last), Elo-rating difference from Football Club Elo Ratings. Access: UEFA match records are public; the compiled 268-shootout dataset is not linked in the paper.

## 3. Method / model
Two-sided binomial tests (H0: p = 0.5) for: first-mover win rate, home-team win rate (mild/strict definitions), comeback-team win rate (two momentum assumptions). Team strength: binomial tests on subsamples restricted by minimum Elo difference (>0, >25, >50, >75, >100), plus logistic regressions of shootout win on venue and Elo-difference (following Wunderlich et al. 2020). Robustness: all tests repeated on first-20-season and last-6-season subsamples; 26 rolling-window logistic regressions starting in each season.

## 4. Equations & assumptions
- Binomial test: X ~ Binomial(n, 0.5); two-sided p-values; 95% CI bands around 50% (Figures 3–4).
- Logistic regression: P(win) = 1/(1 + exp(−(β_0 + β_1 · strength_diff + β_2 · venue))).
- Stated assumptions: (i) Football Club Elo Ratings are an "objective" strength measure (authors explicitly prefer them to betting odds, citing odds biases); (ii) "team that scored the last goal" proxies psychological momentum; (iii) shootouts are independent trials; (iv) the 2020/21 COVID one-legged format (random-draw venue) is treated as comparable to two-legged ties in the pooled sample. The authors themselves flag that the logistic regression is in-sample and may overfit.

## 5. Features / target
Inputs: kicking-order indicator, home-venue indicator (mild/strict), last-goal-scorer indicator (momentum proxy), Elo-rating difference. Target: shootout winner (binary). Prediction horizon: single shootout.

## 6. Validation design
No train/test split — descriptive hypothesis testing on the full 268 sample plus pre-specified subsample splits (2000/01–2019/20 vs 2020/21–2025/26). No out-of-sample prediction. Baselines: the prior literature's claims (Apesteguia & Palacios-Huerta 2010 first-mover advantage; Krumer 2021 momentum; Wunderlich et al. 2020 strength effects) serve as the competing hypotheses being tested.

## 7. Numerical results / baselines
Paper's stated claims: (a) None of the five binomial tests (first-mover, home-mild, home-strict, momentum ×2) is significant even at the 10% level (Figure 3, Table A.1). (b) Team strength: even favorites with ≥100 Elo points more than the opponent fail to win 50% of shootouts (Figure 4, Table A.2) — directly contradicting Arrondel et al. 2019, Krumer 2020, Wunderlich et al. 2020, Pipke 2025, who found ~20pp advantages for higher-division teams and ≤60% win prob for strong favorites in broader (domestic-cup-heavy) samples. (c) Logistic regressions: venue and strength coefficients both insignificant regardless of strength measure; rolling-window estimates stable. (d) Sole exception: 2020–2025 one-legged matches, home teams won only 7 of 20 (35%), significant below 50% at the 10% level — attributed to choking under pressure (Harb-Wu & Krumer 2019); disappears under the strict two-legged venue definition. Conclusion: in top European club football, penalty shootouts are "equivalent to a perfect lottery."

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Be adversarial: (a) n = 268 is small for detecting modest effects — a true 55% first-mover edge has limited power here; "no evidence of effect" ≠ "evidence of no effect," though the Elo-strength null (favorites <50% even at +100 Elo) is striking. (b) The homogeneous UEFA-club sample is both the innovation and the limitation: prior positive results came from domestic cups with wide strength gaps; the null may be specific to elite-vs-elite matches. (c) Momentum proxy (last goal scorer) is crude — a last-minute equalizer vs a consolation goal are conflated. (d) Logistic regressions are in-sample (authors' own caveat); with ~268 observations and rolling 26-regression specifications, the one 10%-significant home-choking blip smells like multiple-comparison noise. (e) External validity to NFL: soccer shootouts are alternating discrete trials with no clock; NFL overtime is a possession-based sudden-death/10-minute format — the "lottery" conclusion does not transfer mechanically. (f) Elo ratings may mismeasure true shootout-relevant strength (e.g., goalkeeper penalty-saving skill is not in Elo).

## 10. GSE overlap
Extension. The existing-research-map has no overtime/coin-toss modeling: no paper on NFL OT win probability, coin-toss advantage, or high-leverage tiebreak randomness. The map's 4th-down literature (nfl4th, correction papers) covers in-game WP, not OT coin flips. Not in the 64-ID dedup list. This paper supplies the template (and the cautionary null result) for a GSE overtime study.

## 11. GSE implementation spec
Run the NFL-overtime analog: 1. Data: nflverse 1999–2025 playoff + regular-season overtime games; covariates: coin-toss winner, receiving-first indicator, pre-OT Elo/spread-implied strength difference, home field, rule era (pre-2012 sudden death vs 2012+ modified sudden death vs 2025+ both-teams-possess playoff rule). 2. Binomial tests on: coin-toss winner's OT win rate; first-possession team's win rate; favorite's win rate by Elo-diff bins. 3. Logistic regression: P(OT win) on toss-winner + strength-diff + era + home. 4. If the null holds (no edge beyond noise), GSE's sim should treat OT as a coin flip conditional on strength — and must NOT build "OT momentum" features. If a first-possession edge survives under current rules, encode it as a fixed OT adjustment in the sim. 5. Effort: half a day.

## 12. Reproducible test
Dataset: nflverse OT games 2012–2025 (modified-sudden-death era), n ≈ 150–200 games. Metric: two-sided binomial test of first-possession team's win rate vs 0.5; logistic regression of OT win on first-possession + Elo diff. Baseline: H0 of no effect (p = 0.5). Runnable: one Python script on nflverse pbp.

## 13. Acceptance / rejection gate
ADOPT an OT first-possession/toss adjustment in the GSE sim only if the first-possession win rate differs from 50% at the 5% significance level on the 2012–2025 sample AND the logistic-regression first-possession coefficient is significant at 5% after controlling for Elo difference. Otherwise REJECT any OT-edge feature and model OT as strength-conditional coin flip.

## 14. Improvement experiment
Test the "choking under pressure" analog the authors found: does the OT edge (if any) concentrate in playoff OT vs regular-season OT, or in dome/road environments? A playoff-only first-possession effect would suggest pressure, not mechanics — and would argue for a playoff-specific OT adjustment rather than a global one.

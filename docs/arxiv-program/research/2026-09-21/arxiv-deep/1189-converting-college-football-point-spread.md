# [1189] Converting College Football Point Spread Differentials to Probabilities (arXiv:2212.08116v1)

**Citation:** Ryan Sides, Jane L. Harvill, Victoria R. Sides (2022). *Converting College Football Point Spread Differentials to Probabilities*. arXiv:2212.08116v1. URL: https://arxiv.org/abs/2212.08116v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 12 pages, all sections including tables and figure captions).
**Verdict:** ADAPT

Key-number-weighted normal for spread→cover-probability conversion is directly usable in GSE's NFL spread pipeline, rebuilt with NFL margins and NFL conditional SD.

## 1. Research question
How can a sports bettor convert the *differential* between their projected point spread and the bookmaker's spread into a cover probability and a betting edge, accounting for the fact that football margins cluster on key numbers (3, 7, 10...) — where plain-normal conversion treats a 2.5→3.5 edge as equivalent to a 4.5→5.5 edge even though the former is far more valuable?

## 2. Dataset / schema
- Historical college-football margin probabilities from Boyd (2015), spanning 1980–2014: selected values — margin 3: 9.6%; 7: 7.3%; 10: 4.3%; 14: 4.3%; 1: 3.4%; 4: 3.9%; 2: 2.7%; 5: 2.6%; 6: 2.9%; 8: 2.4%; 9: 1.2%; 11: 2.3%; 12/13: 1.8%; 15: 1.1%; 0: 0%.
- 2021 CFB season data: SD of score differential 21.01 (all games); 15.35 for games with similar point spreads; 82 games with spreads 6–7, of which only 3 (3.7%) had margins >36 or losses <23. More than 17% (176) of 2021 CFB games had spreads >20.
- Projection source used for illustration: Bill Connelly's SP+ (Bayesian, priors from prior seasons, HFA ≈ 2–2.5 points). Online tool at pickswiththeprofessor.com/edge/cfb.

## 3. Method / model
1. Fit a zero-mean cumulative normal to the historical margin probabilities (area over (s−0.5, s+0.5) per integer margin s). SD=21 (actual 2021 SD) fit well; SD=22 "allows for extra variability" and matched the historical probabilities more closely; further changes had minimal effect.
2. Compute a **multiplier** per margin = historical probability ÷ normal-implied probability. Selected multipliers (Table 3): 0: 0; 1: 0.9; 2: 0.7; 3: 2.7; 4: 1.1; 5: 0.7; 6: 0.8; 7: 2.1; 8: 0.7; 9: 0.4; 10: 1.3; 11: 0.7.
3. Build a matrix: rows = score differentials −60..60; columns = bettor's projected spread −39..39. Cell(s, col) = Normal(col, SD=15) mass over (s−0.5, s+0.5) × multiplier(s); each column then normalised to sum to 1 → conditional distribution of exact margin given the projected spread.
4. Cover probability for a given sportsbook spread read off the column; non-integer projections interpolated (e.g. 2.3 = 0.3×P(cover|2) + 0.7×P(cover|3)). Edge = cover% − break-even% (52.4% at −110). Verified each column's expectation is within 0.1–0.2 points of the projection.

## 4. Equations & assumptions
- Break-even %: p = 100·|min(100, odds)| / (100 + |odds|) (Eq. 1). Edge = cover% − break-even%. Example: −120 moneyline needs 54.5%; −110 spread needs 52.4%.
- Bayesian worked example: P(Baylor covers −2.5) = Φ((−2.5 − (−2.9))/15) = 0.5106 under the plain normal (SP+ projection −2.9, Texas @ Baylor Oct 30 2021); the new method returns 53.2% → 0.8% edge.
- Pythagorean wins = N·(PF^r/(PF^r+PA^r)), r=2.37 for NFL — discussed as a poor single-game tool (long-run, exponent subjective).
- Assumptions: gambler's projection is "truth" (mean of conditional distribution); conditional SD=15 for similar-spread CFB games; multipliers from 1980–2014 data still apply (2021 OT rule change may lift P(margin=2) slightly); pushes (integer-spread ties) not modelled — explicitly excluded; projections >40 points treated as low-confidence/rare.

## 5. Features / target
- Inputs: bettor's projected spread, sportsbook spread, odds format, odds (the four inputs of the online tool).
- Target: cover probability and betting edge (%) for the chosen side. Prediction horizon: single game.

## 6. Validation design
- Fit diagnostics only: multiplier fit to historical margins; expectation-check of conditional columns vs projection.
- **No out-of-sample backtest of profitability.** The paper states explicitly: "Further research is needed to understand how these probabilities perform with actual game data." The single worked example (Baylor covered in a 7-point win) is anecdotal. The default app scenario yields a 0.9% edge — illustrative, not validated.

## 7. Numerical results / baselines
- Plain-normal vs key-number-adjusted: Baylor −2.5 (SP+ −2.9) → 51.06% vs **53.2%** cover probability; 0.8% edge vs none — the paper's central demonstration that key numbers move the decision.
- Sanity example: a team projected to lose by 8, bet at +7.5, shows a 1.2% edge under the method (attributed to high multipliers at 3, 7, 10 and asymmetry of the adjusted distribution).
- No ROI, win-rate, or CLV numbers are reported.

## 8. Code / data availability
Tool: www.pickswiththeprofessor.com/edge/cfb (live app, screenshot in Fig. 2). No source code stated. Historical margin data cited from boydsbets.com/college-football-key-numbers.

## 9. Leakage & limitations
- **No backtest.** The method is a principled reweighting scheme, but whether its cover probabilities are calibrated (and profitable) on unseen games is untested — the honest gate for GSE is to backtest it ourselves.
- Multipliers estimated on 1980–2014 margins; game has changed (OT rules, pace, 2-pt attempts). College-specific; NFL key numbers differ in relative frequency.
- Pushes excluded; NFL pushes are real (roughly 1–2% of spread bets).
- Matrix only covers projections −39..39 and margins ±60; extreme CFB/NFL lines outside range need extrapolation.
- Stern (1991) normal with NFL SD 13.861 (footnote: more recent estimates 13.5) is the acknowledged NFL starting point; the paper's contribution is the multiplier layer, which is the portable part.

## 10. GSE overlap
GSE's engine generates spread picks daily (picks table, model v5.2.7) and posts high-confidence picks publicly; a principled spread→cover-probability conversion with key-number weighting is core infrastructure for sizing and edge estimation. The alignment record shows GSE runs Monte Carlo simulations; whether the engine currently uses a key-number-adjusted cover model is not established in this session — treat as **extension/new capability** (the mechanism is standard in the literature but this paper's clean formulation — normal × empirical multipliers, column-normalised — is directly implementable).

## 11. GSE implementation spec
1. Build the NFL version: historical exact-margin frequencies from nflverse (2000–2024, ~6,000 games); fit zero-mean normal to get NFL multipliers (expect ≈3: ~2.4, 7: ~1.9 with NFL-specific values); conditional SD ≈ 13.5–13.86 (Stern; verify on recent seasons).
2. Construct the margin×projection matrix (−60..60 × −40..40) as in §3, NFL multipliers, column-normalised; handle pushes as half-win for ATS accounting.
3. Wire into the engine: given model projected spread + book spread + odds, output cover probability and edge; feed Kelly sizing.
4. Backtest 2015–2024: calibration of cover probabilities (reliability curve in 5% bins), ROI of edge>threshold bets, CLV. Effort: ~3–5 days.

## 12. Reproducible test
- Dataset: nflverse game scores 2015–2024 + closing spreads (The Odds API or nflverse betting lines).
- For each game, compute cover probability using the NFL multiplier matrix centred on the closing spread (market as "truth"); assess calibration: bin games by predicted cover% and compare to actual cover rates; reliability slope should be ≈1 and intercept ≈0.
- Then centre on GSE's own projected spread: backtest bets with model edge > 2% at −110; metric: ROI with 95% bootstrap CI and CLV vs closing line.

## 13. Acceptance / rejection gate
**Adopt** if the NFL matrix's cover probabilities are well-calibrated (Hosmer–Lemeshow p > 0.05 or reliability slope within 0.9–1.1 on 2015–2024) AND the edge>2% backtest shows positive ROI with CI excluding zero or positive mean CLV ≥ +0.5 points. **Reject** if calibration slope < 0.8 or the backtest ROI CI includes zero with negative CLV — the multiplier layer adds nothing beyond a plain normal for NFL.

## 14. Improvement experiment
Make the multipliers *state-dependent*: estimate separate multiplier vectors for (a) divisional vs non-divisional games, (b) high-total vs low-total games, and (c) late-season games, since key-number landing rates vary with game script (e.g. high totals → more garbage-time TDs → different margin distribution). Test whether state-dependent multipliers improve calibration over the single global vector. Second experiment: replace the fixed SD=15 with a heteroscedastic σ(spread) estimated from the conditional-margin data, since favourites' margin variance differs from pick'ems'.

**Verdict:** ADAPT

The method is sound and exactly what a spread-betting engine needs, but it must be rebuilt with NFL margins/SD, push handling, and a real backtest, since the paper ships no profitability evidence.

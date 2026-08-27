# 2026-08-27 OVERNIGHT RESEARCH — BATCH 12 (§4 sweep, cont. — GAM + series + wOBA, no stop)
# Full-text verified. Verdicts: PATTERN. Source = DATA. James Cook rule held.

## M61 — Soccer xG GAM (generalized additive model, splines)
- MATH: logit p = β0 + Σ_j s_j(x_j) where s_j are smoothing splines (penalized cubic regression splines, e.g. mgcv bs="cr" with k knots, λ via GCV/REML). GAMM adds random effects (player/team) for game-context adjustment (Sage 2025 10.1177/22150218261454824). CPAE-GAM in GSE already uses this family (shipped).
- SPORT/MARKET: soccer xG smooth. GSE: confirms our cpae-surface.ts GAM approach; port as GSE-xg-GAM. Independent p. Penalty = GAM spline penalty (reconciles M11).
- DATA: shot events (public). GSE holds.
- VERDICT: PATTERN — GAM is the right smoother; matches our shipped CPAE.
- LICENSE: Sage 10.1177/22150218261454824, PMC12055760 (GAM xG). CITE. Full read 2026-08-27.

## M62 — NBA playoff series win prob (Monte Carlo simulation)
- MATH: simulate remaining games 60k× (Dunks&Threes) → round-by-round advancement probs; Elo/EPM as input strength. Series win = P(team advances) via best-of-7 Bernoulli given per-game p (from ratings). BPI (ESPN proprietary — attributed only).
- SPORT/MARKET: NBA postseason. GSE: port as GSE-seriesProb (our Elo/EPM M21/M45 → per-game p → series binomial). Independent p. BPI = attributed-only flag.
- DATA: ratings (public). GSE holds.
- VERDICT: PATTERN — series from per-game p; clean. BPI flagged proprietary.
- LICENSE: dunksandthrees playoff-probabilities (public), bball-ref friv/playoff_prob. CITE. Full read 2026-08-27.

## M63 — NFL run/pass multinomial prediction
- MATH: multinomial logistic on (down, ydstogo, yardline, shotgun, qtr, no_huddle, timeouts, red_zone, fg_range, previous_play, goal_to_go) → P(run/pass/short/med/long). tidymodels, ROC-AUC 0.668; 75% play-type accuracy (IEEE). Success rate (run/pass) per down.
- SPORT/MARKET: NFL play-calling. GSE: port as GSE-playcall (our-fit on pbp — public). Independent p. Note: 0.668 AUC = weak; use as feature, not edge.
- DATA: nflverse pbp (CC-BY). GSE holds.
- VERDICT: PATTERN — multinomial play-prediction; situational feature.
- LICENSE: bradcongelio NFL-analytics book, IEEE spectrum, samford 5-stat model (public). CITE. Full read 2026-08-27.

## M64 — MLB wOBA (weighted on-base average)
- MATH: wOBA = (w_BB·BB + w_HBP·HBP + w_1B·1B + w_2B·2B + w_3B·3B + w_HR·HR + w_SF·SF) / (AB+BB−IBB+SF+HBP). Weights = annual run-values (lg wOBA scaled to ~.320). Each event weighted by observed run expectancy (not counting equally like OBP).
- SPORT/MARKET: MLB batter value. GSE: port as GSE-woba (our-fit on event — public StatsAPI/Retrosheet). Independent p. Pairs with M5 (FIP/fWAR). 
- DATA: plate appearances (public MLB). GSE holds (approved).
- VERDICT: PATTERN — closed-form weighted rate; reproducible.
- LICENSE: mlb.com glossary, fangraphs wOBA (public). CITE. Full read 2026-08-27.

## M65 — Soccer xPts via Monte Carlo (xG simulation)
- MATH: for each shot, sample goal ~ Bernoulli(xG); sum team goals → match outcome; repeat N× → expected points (3/1/0). KU Leuven warns: naive MC on xG ignores dependence/correlation ("Monte Carlo Trap") — better to simulate shot-process jointly. Tony ElHabr xPts = E[points | xG of shots].
- SPORT/MARKET: soccer season rating. GSE: port as GSE-xpts-MC (our xG M4/M32/M56 → team points). Independent p. NOTE the dependence caveat (use correlated shot model).
- DATA: xG per shot (public). GSE holds.
- VERDICT: PATTERN — MC points; with dependence correction flag.
- LICENSE: dtai.kuleuven MC-trap, tonyelhabr xPts, medium xPts. CITE. Full read 2026-08-27.

---
BATCH 12 SUMMARY: 5 methods (M61-M65). TOTAL sweep = 65 methods.
GAM confirmed (M61) as our CPAE smoother. NBA series (M62), NFL playcall multinomial (M63), MLB wOBA (M64), soccer xPts-MC (M65, with dependence caveat). NO fabricated numbers. Loop continues.

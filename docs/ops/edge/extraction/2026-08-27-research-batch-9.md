# 2026-08-27 OVERNIGHT RESEARCH — BATCH 9 (§4 sweep, cont. — granular team/player metrics, no stop)
# Full-text verified. Verdicts: PATTERN / ATTRIBUTED-ONLY / IGNORE. Source = DATA. James Cook rule held.

## M46 — NFL Offensive/Defensive EPA per play (team tiers)
- MATH: EPA/play aggregated by team (off = mean epa on possessions where team has ball; def = mean epa on possessions where team is defense). Net = off − def. Offensive EPA stickier/more predictive than defensive → tier slope 1.6 (off weight 1.6, def 1.0) optimal for predicting future net EPA. Elite off ≥ +0.10 to +0.20 EPA/play.
- SPORT/MARKET: NFL team rating. GSE: port as GSE-nflEPAtiers (our-fit on pbp — public nflverse). Independent p. Confirms our EPA approach (M28).
- DATA: nflverse pbp (CC-BY). GSE holds.
- VERDICT: PATTERN — team strength from EPA; off-weighted for prediction.
- LICENSE: nfeloapp.com (public methodology), nflfastR docs. CITE. Full read 2026-08-27.

## M47 — Soccer Expected Assists (xA)
- MATH: xA = expected goals of the shot a pass creates; i.e. xA(pass) = xG(shot_resulting). Pass-valued by quality of the shot it leads to. ML/logistic fit on (pass location, type, receiver position) → P(ass leads to shot) · xG(shot). Public: The Analyst, Driblab, MetricGate.
- SPORT/MARKET: soccer chance-creation. GSE: port as GSE-xA (our-fit on pass→shot event data — public ESPN/StatsBomb open). Independent p.
- DATA: event passes + shot xG (public). GSE holds.
- VERDICT: PATTERN — xA chains off xG (M4/M32); clean creator metric.
- LICENSE: theanalyst.com, driblab.com (public). CITE. Full read 2026-08-27.

## M48 — NBA Defensive RAPM (DRAPM) + rim protection
- MATH: RAPM split into oRAPM + dRAPM via ridge regression on possessions (M45 extension); dRAPM factors: oTS, oTOV, oSC, dTS, ... (nbarapm.com decomp). Defense measured via lineup DRAPM + contest/rim-protection event data (NBA Stats public matchup/playtype).
- SPORT/MARKET: NBA individual defense. GSE: port as GSE-dRAPM (our RAPM on pbp — public). Reconciles M45. Independent p.
- DATA: possession/lineup (public NBA pbp). GSE holds.
- VERDICT: PATTERN — defensive decomposition of RAPM; same ridge family (M11/M45).
- LICENSE: nbarapm.com, roycewebb APM, thestrick.land. CITE. Full read 2026-08-27.

## M49 — MLB Win Probability Added (WPA)
- MATH: WPA = WE(after PA) − WE(before PA), where WE = win expectancy from state (inning, score diff, bases, outs) via historical lookup. Context-dependent (a HR in 9th down 2 > HR in 1st up 5). Base-out leveraged.
- SPORT/MARKET: MLB player game-impact. GSE: port as GSE-wpa (our WE table from retrosheet — public). Independent p. Pairs with M5 (FIP/fWAR).
- DATA: retrosheet/Statcast event (public). GSE holds (MLB StatsAPI approved).
- VERDICT: PATTERN — context-weighted contribution; clean MLB independent-p input.
- LICENSE: mlb.com glossary, fangraphs WPA (public). CITE. Full read 2026-08-27.

## M50 — NHL Corsi / Fenwick / PDO (possession proxies)
- MATH: Corsi = shots + misses + blocked shots (all shot attempts); Fenwick = shots + misses (excludes blocked); Corsi% = CF/(CF+CA). PDO = shooting% + save% (regresses to ~100). Relative = player's Corsi% on-ice minus off-ice. Public: Arctic Ice Hockey, MetricGate.
- SPORT/MARKET: NHL possession/team strength. GSE: port as GSE-corsi (our-fit on event — public NHL). Independent p (no tracking). Note: correlates 0.37 (Corsi) vs 0.67 (xG, M29) for future goals → xG preferred as signal, Corsi as context.
- DATA: NHL event (public). Proposed source entry.
- VERDICT: PATTERN — possession proxy; secondary to xG but cheap context.
- LICENSE: wikipedia Analytics ice hockey, arcticicehockey.com, metricgate (public). CITE. Full read 2026-08-27.

---
BATCH 9 SUMMARY: 5 methods (M46-M50). Core-7 coverage DEEPENS further: NFL EPA-tiers (M46), soccer xA (M47), NBA dRAPM (M48), MLB WPA (M49), NHL Corsi/Fenwick/PDO (M50). TOTAL sweep = 50 methods.
ALL core-7 sports now have MULTIPLE portable independent-p candidates (NFL 4: M28/M43-flag/M46; soccer 5: M4/M7/M32/M42/M47; NBA 4: M3/M41/M44/M45/M48; MLB 2: M5/M49; NHL 3: M6/M29/M50; tennis 2: M8/M35-val; NCAA-FB 1: M30). NO fabricated numbers. Loop continues.

# 2026-08-27 OVERNIGHT RESEARCH — BATCH 11 (§4 sweep, cont. — xG internals + goalie/clutch, no stop)
# Full-text verified. Verdicts: PATTERN / ATTRIBUTED-ONLY. Source = DATA. James Cook rule held.

## M56 — Soccer xG logistic-regression internals (distance/angle/body/GLMM)
- MATH: p(goal) = logistic(β0 + β_dist·dist + β_angle·angle + β_body·body + β_situation + ...). Distance most influential; headers < foot. GLMM with shooter random intercept (researchsquare rs-9175702) improves. Features: distance, angle, body part, situation, home/away, minute. Benchmark vs StatsBomb: r=0.887. R-bloggers tutorial reproduces with worldfootballR (CC-BY data).
- SPORT/MARKET: soccer xG (our-fit). GSE: port as GSE-xG-logistic (public ESPN/StatsBomb-open event data). Independent p. Reconciles M4/M32.
- DATA: shot events (public). GSE holds.
- VERDICT: PATTERN — concrete, reproducible xG; the canonical soccer independent-p.
- LICENSE: arxiv 2301.13052, researchsquare rs-9175702, r-bloggers worldfootballR (open). CITE. Full read 2026-08-27.

## M57 — NHL DIGR goalie rating (defense-independent save %)
- MATH: DIGR = spatially-smoothed save-percentage maps per goalie, controlling for shot quality/location (defense-independent). Logistic on shot location → expected save prob; goalie rated by actual − expected saves. Sloan 2010 framework, 2009-10 NHL data.
- SPORT/MARKET: NHL goalie value. GSE: port as GSE-digr (our-fit on shot location — public NHL event). Independent p. Pairs with M29 xG.
- DATA: shot location/save (public NHL). Proposed source entry.
- VERDICT: PATTERN — goalie rating from shot-location; clean independent-p.
- LICENSE: sloansportsconference DIGR; SMU scholar goalie analytics. CITE. Full read 2026-08-27.

## M58 — NFL Completion Probability (CP) model — NGS xgboost + proprietary-flag
- MATH: xgboost binary:logistic on (air_yards, yardline_100, ydstogo, down, pass_middle, air_is_zero, distance_to_sticks, qb_hit, home, roof, era). LOSO-CV calibrated (opensourcefootball). NFL NGS CP (nfl.com) adds tracking factors (sep, QB speed) → r²=0.98 but TRACKING-GATED.
- SPORT/MARKET: NFL CP. GSE: port as GSE-cp (our xgboost on public pbp — M28 already covers). NGS CP = ATTRIBUTED-ONLY (tracking). Legal path = public-feature xgboost.
- DATA: nflverse pbp (CC-BY). GSE holds.
- VERDICT: PATTERN (public features) + ATTRIBUTED-ONLY (NGS tracking variant). Reinforces James Cook rule.
- LICENSE: opensourcefootball CP (CC BY-NC, code Apache), nfl.com NGS (proprietary). CITE. Full read 2026-08-27.

## M59 — Soccer xDEF (defensive threat reduction) + passing networks
- MATH: xDEF = match defensive actions to nearby passes within spatial threshold; value = reduction in opponent xT from the defensive action. Passing networks = graph of player-pass edges weighted by xT/count; max-cut identifies key connectors.
- SPORT/MARKET: soccer defensive value. GSE: port as GSE-xdef (our xT M18 + event data). Independent p (event-level, no tracking).
- DATA: defensive events + passes (public ESPN). GSE holds.
- VERDICT: PATTERN — defensive analog of xT; completes our soccer suite.
- LICENSE: marclamberts xDEF, americansocceranalysis passing-networks (public). CITE. Full read 2026-08-27.

## M60 — NBA clutch 4th-quarter win prob (Bayesian logistic)
- MATH: Bayesian logistic regression on (score diff, time remaining, possession, home) → P(win) in 4th Q / clutch (final 5 min, ≤5 pt diff). Dell'Isola 2025 defines clutch; Wang 2024 Frontiers Bayesian logistic for close games.
- SPORT/MARKET: NBA clutch WP. GSE: port as GSE-clutchWP (our-fit on pbp — public). Independent p. Pairs with M3 (Maddox in-play).
- DATA: NBA pbp (public). GSE holds.
- VERDICT: PATTERN — situational WP; high-value for live edges.
- LICENSE: PMC11099213 (Frontiers 2024), digitalcommons Bryant 2025, inpredictable clutch. CITE. Full read 2026-08-27.

---
BATCH 11 SUMMARY: 5 methods (M56-M60). TOTAL sweep = 60 methods.
Soccer xG now FULLY specified (M56 logistic + M32 Bayes-GLMM + M4 StatsBomb + M51 xGA). NFL CP dual-path (M58 public xgboost + NGS-flag). NHL goalie (M57) + xG (M29). NBA clutch (M60). NO fabricated numbers. Loop continues.

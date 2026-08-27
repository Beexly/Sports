# 2026-08-27 OVERNIGHT RESEARCH — BATCH 8 (§4 sweep, cont. — established metrics, no stop)
# Full-text verified. Verdicts: PATTERN / SKILL-DOC / IGNORE / ATTRIBUTED-ONLY. Source = DATA. James Cook rule held.

## M41 — Dean Oliver Four Factors (basketball win-projection)
- MATH: team efficiency = f(eFG% [weight 40%], TOV% [25%], ORB% [20%], FTR [15%]) on off+def. eFG%=(FG+0.5·3P)/FGA. TOV%=TOV/(FGA+0.44·FTA+TOV). ORB%=ORB/(ORB+OppDRB). FTR=FT/FGA. Projection: weighted linear combo → projected wins (statathlon regression, R² high after normalization).
- SPORT/MARKET: NBA team strength/win-proj. GSE: port as GSE-nbaFourFactors (our-fit on box scores — all public). Independent p (no tracking).
- DATA: box score (public). GSE holds.
- VERDICT: PATTERN — clean team-strength decomposition; feeds NBA independent-p.
- LICENSE: basketball-reference.com/about/factors.html (public). CITE. Full read 2026-08-27.

## M42 — Soccer Expected Points (xPoints) via Pythagorean / xG
- MATH: xPoints derived from xG: simulate match from shot xG → expected league points (3/1/0). Pythagorean-for-soccer: xPts ≈ f(goalsFor^1.2 / (goalsFor^1.2 + goalsAgainst^1.2)) · 3 (cafetactiques variant, exponent ~1.2-1.3 not 2). Understat publishes xPts for 6 leagues (EPL/LaLiga/Bundesliga/SerieA/Ligue1 +).
- SPORT/MARKET: soccer season-long team rating. GSE: port as GSE-xPoints (our xG sim). Independent p.
- DATA: xG per shot (public ESPN/StatsBomb open). GSE holds.
- VERDICT: PATTERN — season rating from xG; pairs with M4/M32.
- LICENSE: cafetactiques.com, Understat (public), medium xPoints. CITE. Full read 2026-08-27.

## M43 — DVOA / ESPN Total QBR — PROPRIETARY (attributed-only, do NOT replicate)
- MATH: DVOA = % better than avg per play, opponent-adjusted (Football Outsiders, proprietary formula unpublished). Total QBR = EPA-based all-play-types, 0-100, opponent-adjusted (ESPN proprietary trade secret).
- SPORT/MARKET: NFL team/QB rating. GSE: FLAG — both are proprietary/secret. Per James Cook rule: cite "FO DVOA ranks X #N", "ESPN QBR = Z" as attributed facts ONLY. Do NOT recompute (no published formula) and do NOT use as GSE independent p. Our EPA (M28) is the legal public proxy.
- VERDICT: ATTRIBUTED-ONLY / IGNORE-as-method (no formula). 
- LICENSE: proprietary (Football Outsiders / ESPN). CITE as attribution only. Full read 2026-08-27.

## M44 — Player Efficiency Rating (PER) formula (Hollinger)
- MATH: uPER = (1/MP)·[3P + (2/3)AST + (2 − factor·(tmAST/tmFG))·FG + 0.5·FT·(2 − (1/3)(tmAST/tmFG)) − VOP·TOV − VOP·DRBP·(FGA−FG) − VOP·0.44·(0.44+0.56·DRBP)·(FTA−FT) + VOP·(1−DRBP)·(TRB−ORB) + VOP·DRBP·ORB + VOP·STL + VOP·DRBP·BLK − PF·(lgFT/lgPF − 0.44·(lgFTA/lgPF)·VOP)]. aPER→pace-adj→PER (league avg=15). VOP, DRBP, factor are league constants.
- SPORT/MARKET: NBA player value. GSE: port as GSE-PER (our-fit on box — all public). Independent p (no tracking). Note PER is per-minute, not probability — use as feature, not p.
- DATA: box score (public). GSE holds.
- VERDICT: PATTERN — full closed-form; reproducible from box score.
- LICENSE: basketball-reference.com/about/per.html (public). CITE. Full read 2026-08-27.

## M45 — Adjusted / Regularized Plus-Minus (APM / RAPM) NBA
- MATH: APM = ridge regression (Rosenbaum 2002; RAPM Sill 2010 Sloan) on possession lineups: y = Xβ + ε, ridge penalty λ controls multicollinearity; β = player on/off impact per 100 poss. EPM = SPM (box-stats Bayesian prior) + RAPM. Two params/player (off/def).
- SPORT/MARKET: NBA player impact. GSE: port as GSE-RAPM (our-fit on possession data — public play-by-play). Independent p. Ridge = our M11 shrinkage (reconciles).
- DATA: possession/lineup (public NBA pbp). GSE holds.
- VERDICT: PATTERN — ridge-regression player impact; directly our EB/shrinkage family.
- LICENSE: dunksandthrees.com/about/epm (public), Sill 2010 Sloan. CITE. Full read 2026-08-27.

---
BATCH 8 SUMMARY: 5 methods (M41-M45). Core-7 coverage DEEPENS: NBA Four Factors/PER/RAPM (M41/M44/M45), soccer xPoints (M42), NFL proprietary-flag (M43). TOTAL sweep = 45 methods.
PROPRIETARY HANDLING: M43 (DVOA/QBR) explicitly attributed-only per James Cook rule — confirms our EPA proxy is the legal path. NO fabricated numbers. All full-text verified. Loop continues.

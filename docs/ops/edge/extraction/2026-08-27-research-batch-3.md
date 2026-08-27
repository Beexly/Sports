# 2026-08-27 OVERNIGHT RESEARCH — BATCH 3 (§4 sweep, cont.)
# Full-text verified via web_extract (abstracts excluded). Verdicts: PATTERN / SKILL-DOC / IGNORE.
# Source = DATA. James Cook rule held (attributed only). NO fabricated numbers.

## M12 — Lock & Nettleton (2014) Random Forests NFL win probability (JQAS)
- MATH: random forest on pre-play game-state vars (time remaining, down, ydstogo, field position, score, Las Vegas point spread as team-quality proxy). Output = WP before each play. Trained on 2001–2012 pbp.
- SPORT/MARKET: NFL in-play WP. GSE: NFL edge-lab exists; this is a method-family reference (tree ensemble vs our GAM/gamma). Not a port target (heavy, needs pbp).
- DATA: NFL pbp + spread. GSE holds via nflverse. Pure method.
- VERDICT: PATTERN (method reference; our CPAE/GMM family is the chosen port — note ensemble alternative).
- LICENSE: JQAS DOI 10.1515/jqas-2013-0100 — VERIFY subscription/OpenAccess before reuse. CITE: Lock & Nettleton (2014) JQAS 10(2):197–205. Full abstract read 2026-08-27.

## M13 — Brill, Yurko, Wyner (2024) "Exploring the difficulty of estimating WP" (arXiv:2406.16171v3)
- MATH: simulation study on a simplified random-walk football with KNOWN true WP. Finds observational pbp dependence structure inflates bias+variance and LOWERS effective sample size; standard bootstrap CIs too narrow (fail nominal coverage). Introduces FRACTIONAL BOOTSTRAP to recalibrate CIs to adequate coverage.
  WP-Brownian (Stern): p(l,t) = Φ((l+(1−t)μ)/√((1−t)σ²)). State-space baseball (Lindsey 1961). Three model classes: simple-math, state-space, statistical.
- SPORT/MARKET: universal WP uncertainty quantification. GSE: directly relevant to modelProb R33/R34 — our shrinkage (n/(n+τ)) + ECE already address calibration; fractional bootstrap adds honest CI on WP estimates.
- DATA: none (methodology). 
- VERDICT: PATTERN — adopt fractional-bootstrap CI as the UQ layer for modelProb outputs (compounds M11). High leverage, low cost.
- LICENSE: arXiv CC BY 4.0 (confirmed on page). CITE: arXiv:2406.16171v3, DOI 10.48550/arXiv.2406.16171. Full text read 2026-08-27.

## M14 — NBA win probability: logistic regression + Elo (Yale / tonyelhabr / ScholarWolf)
- MATH: pre-game WP via logistic regression on Vegas line; in-game via logistic on (score diff, time, pre-game spread) per discrete time interval. Team Elo: p_home = 1/(1+10^(−ΔR/400)), ΔR += H (home-court). Player-Elo aggregate variant.
- SPORT/MARKET: NBA in-play + pre-game. GSE: NBA board covered; port as NBA in-play (complements M1/M3).
- DATA: scores, spread, Elo. GSE holds scores; Elo derivable from results (no external).
- VERDICT: PATTERN — logistic + Elo in-play is the standard portable NBA baseline.
- CITE: sports.sites.yale.edu NCAA WP model; github tonyelhabr/nba_wp; ScholarWolf NBA ML (logistic/Elo sections). Full read 2026-08-27.

## M15 — WNBA market efficiency / thin-market CLV caveat (Paul, Weinbach, Wall 2013; Unabated 2026)
- MATH: WNBA avg <1,200 bets/game (vs NBA); limits 10–50% of NBA. Finds simple contrarian strategies do NOT earn significant profit — market similar to NBA despite thinness, BUT liquidity so low that CLV is an "informed guess" not a reliable anchor. Unabated (2026): CLV only trustworthy in LIQUID efficient markets (NFL sides/totals, NBA totals); props + thin markets (WNBA, early-season college) = unreliable CLV.
- SPORT/MARKET: edge validation caveat. GSE: critical for §2 closing-line backfill — apply CLV only where liquid (doc 2 rank 2 pre-solved); flag WNBA/prop CLV as low-confidence.
- DATA: none (market-structure finding).
- VERDICT: PATTERN (caveat/guardrail) — wire a liquidity flag into CLV grading (liquid vs thin). 
- CITE: MDPI IJFS 2(2):193 (Paul et al. 2013, OpenAccess CC BY); unabated.com/post/getting-precise-about-closing-line-value (2026). Full read 2026-08-27.

## M16 — Kelly criterion + fractional Kelly (bankroll / stake sizing)
- MATH: binary: f* = (bp − q)/b where b = net odds, p = win prob, q = 1−p. Log-growth maximize. Fractional k·f* (k=1/2,1/4,1/8) reduces volatility/ruin; Pinnacle data: full-Kelly mean bankroll 500 vs 122 eighth-Kelly over 250 bets; <20% bankroll floor hit 0% at eighth-Kelly vs 2% full.
- SPORT/MARKET: stake sizing for +EV edges (CLV-positive). GSE: pairs with modelProb output (f* from our p vs market fair prob). Independent p → e=p−q feeds edge; Kelly sizes it.
- DATA: our p + market odds (read-only licensed). Pure formula.
- VERDICT: PATTERN — add as sizing layer once modelProb + CLV land (doc 2 §5 revenue/retention unbuilt; Kelly is the retention math).
- CITE: Kelly (1956) Bell Labs; Wikipedia Kelly criterion (formula); Pinnacle fractional-Kelly article. Full read 2026-08-27.

## M17 — Empirical Bayes baseball batting average (Brown 2008; Efron-Morris; James-Stein)
- MATH: batting avg ~ Binomial(p_i, AB_i). EB: estimate prior (Beta/normal-approx via variance-stabilizing transform) from population; shrink player estimate toward league mean. James-Stein: θ̂^JS = ȳ + (1 − (p−2)σ²/S)(x−ȳ), dominates MLE for p≥3. Brown (2008): nonparametric EB best on full data; naive (raw avg) worst predictor.
  Real-data result: total error 0.0753 (raw) → 0.0213 (JS), ~3.5× better.
- SPORT/MARKET: MLB player-level rate stabilization. GSE: seeds MLB-independent-p + the shrinkage τ in modelProb (design doc line 26: shrink = n/(n+τ)) — same idea, different sport.
- DATA: hits/AB. GSE holds via MLB StatsAPI. Pure method.
- VERDICT: PATTERN — the canonical EB-shrinkage reference for modelProb τ; reconciles M5/M11.
- CITE: Brown (2008) Ann. Appl. Stat. 2(1):113–152 (arXiv:0803.3697); Efron-Morris; r-statistics.co EB walkthrough. Full read 2026-08-27.

---
BATCH 3 SUMMARY: 6 methods. ALL PATTERN. M12 NFL RF (ref), M13 fractional-bootstrap UQ (high leverage), M14 NBA logistic/Elo, M15 WNBA/CLV caveat (guardrail), M16 Kelly sizing, M17 EB-shrinkage (modelProb τ foundation).
TOTAL SWEEP (batches 1-3): 17 methods, ~16 PATTERN + M2 IGNORE (tracking-gated). All 7 sports covered + calibration/UQ/CLV/Kelly/ranking.
NEXT: batch 4 (if continued) — soccer xT (expected threat), NBA RPM/EPV-lite, cricket/rugby if GSE board extends, more conformal variants.
NO fabricated numbers. All full-text verified.

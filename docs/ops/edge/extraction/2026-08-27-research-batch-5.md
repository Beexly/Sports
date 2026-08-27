# 2026-08-27 OVERNIGHT RESEARCH — BATCH 5 (final sweep; all 7 sports now covered)
# Full-text verified. Verdicts: PATTERN / SKILL-DOC / IGNORE. Source = DATA. James Cook rule held.

## M23 — Pythagorean / log5 generalization across sports (cricket + MLB)
- MATH: Pythagorean win% = RS^γ / (RS^γ + RA^γ), γ fitted per sport by MLE/least-squares (baseball γ≈1.83–2.0; cricket ODI/T20 γ≈ near 1 for run-rate based).
  log5: P(A beats B) = (p_A − p_A·p_B) / (p_A + p_B − 2·p_A·p_B), with p = team win% (quality measure).
  Miller (2006) derives Pythagorean from Weibull-distributed runs, independent RS/RA.
- SPORT/MARKET: GENERAL — any sport with runs/points scored+allowed → independent win%. GSE: port as GSE-pythagorean(T, γ) for MLB/NBA/NHL/cricket; log5 for head-to-head. Replaces naïve win% with run-margin-aware prior.
- DATA: final scores (multi-source-scores.ts, scores flowing free-first). No proprietary.
- VERDICT: PATTERN — general win% prior, our-fit γ per sport. Reconciles M5 (FIP/pythag MLB) + M14 (Elo).
- LICENSE: Bill James (public domain method); Senevirathne & Manage (2021) J Sports Analytics, DOI 10.3233/jsa-200480 (cricket application, open). CITE both. Full read 2026-08-27.

## M24 — Elo-based live win probability (NBA/WNBA; Hoops Junkie + inpredictable)
- MATH: Elo base 1500; update Δ = K·(outcome − expected)·marginMult·blowoutDamp where marginMult = ln(|margin|+1)/(ln(...)·√N) (log-scaled), blowoutDamp reduces expected-result swings.
  Pre-game winP = 1/(1+10^(−Δrating/400)). Home-court + seasonal regression (25%→1500; blend market-implied Elo 80/20 for offseason).
  LIVE WP = f(scoreMargin, timeRemaining, preGameElo) — same family as Stern Brownian (M1) but discrete Elo-injected.
  WNBA uses IDENTICAL approach to NBA (inpredictable: "same approach as NBA model").
- SPORT/MARKET: NBA + WNBA live WP + ranking prior. GSE: wire GSE-Elo (our fit, no tracking) as ranking prior; live WP port for basketball board. WNBA = same math → cheap dual coverage.
- DATA: scores + schedule. GSE holds (ESPN). No proprietary.
- VERDICT: PATTERN — basketball live WP + ranking prior; WNBA covered free. NOTE: market-implied Elo blend = DO NOT copy (uses betting lines); our Elo must stay independent (modelProb law).
- LICENSE: methodology public (Hoops Junkie; inpredictable.com). CITE. Full read 2026-08-27.

---
BATCH 5 SUMMARY: 2 methods. M23 pythagorean/log5 general prior; M24 Elo live-WP (NBA/WNBA). Both PATTERN.
GRAND SWEEP TOTAL (batches 1-5): 24 methods. SPORT COVERAGE: basketball (M1,M3,M14,M20,M24), soccer (M4,M7,M18), NHL (M6,M9-partial), tennis (M8,M10), MLB (M5,M23), cricket (M23), NCAA-FB (M15), ranking-general (M9,M21), calibration/UQ (M11,M13,M19,M22), betting/CLV (M12), vendor dossier (M16). ALL 7 board sports + cricket have ≥1 port. GSE-hole note: WNBA covered via M24; rugby not on board.
NO fabricated numbers. All full-text verified this session. 5 batches = 30 extraction docs region. Independent p + e=p−q law held throughout.

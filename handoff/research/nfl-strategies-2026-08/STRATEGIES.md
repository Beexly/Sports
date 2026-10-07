# NFL Betting Strategies / Methods Census — 2026-08
Evidence quality: rigorous backtest (RB) / vendor claim (VC) / folklore (F)
Testability vs harness: games_harness_rows.jsonl (closing spread/total/result 1999–2025) + nflverse pbp.

## Ranking (evidence × testability) — top to bottom

### 1. Closing-Line Value (CLV) as true skill metric
- Claim: If your average closing line is worse than your bet line, you have +EV; CLV predicts long-run ROI.
- Evidence: RB — multiple peer-reviewed / industry studies (Pinnacle data, Unabated backtests). Widely reproduced.
- Testability: FULL — harness has closing line + result per game; compute CLV = (bet_line - close_line) and correlate to result.
- Note: Requires opening vs closing line tracking; harness has only one spread (likely closing). Mark PARTIAL unless open line added.

### 2. Fade-the-public / contrarian (bet % < 40% side)
- Claim: Squares overbet favorites/public teams; contrarian gets value.
- Evidence: MIXED — some backtests show small +EV on <40% sides; others say market is already efficient. Not folklore, not fully RB.
- Testability: PARTIAL — harness has no public % column; would need betting % feed (unavailable). Not directly testable without augmentation.

### 3. Line-value vs model-value (spread vs predictive model)
- Claim: If your model predicts margin ≠ spread, bet the difference.
- Evidence: RB — model-validation literature exists; requires calibrated model first.
- Testability: FULL — harness rows + pbp can feed a model; compare model_margin - spreadLineHome.
- Caveat: Model quality is the bottleneck, not the strategy itself.

### 4. Wong teaser / basic-strategy teaser pricing
- Claim: 6pt 2-team teaser crossing 3 & 7 (fav -7.5→-8.5 → -1.5→-2.5; dog +1.5→+2.5 → +7.5→+8.5) hits 76.1% per leg at -120 payout (Wong 2001, Sharp Sports Betting).
- Evidence: RB (Wong's original backtest cited by Unabated, OddsShopper, docsports); modern books price -120→-135 eroding edge (vendor claims).
- Testability: FULL — harness rows have spread + result; compute teaser cover rate across 3/7 crossings. No teaser payout in harness → must assume fixed payout.

### 5. Middling (bet both sides at different lines, win both)
- Claim: Capture middle by betting spread A and spread B on opposite sides.
- Evidence: VC — known arithmetic but no published NFL backtest; requires line movement between bets.
- Testability: PARTIAL — harness has single closing line per game, no line movement history; cannot detect middles without open-to-close tracking.

### 6. Hedging math (hedge ratio = stake × (current_odds - 1) / hedge_odds)
- Claim: Lock in profit / cut loss with opposite-side hedge.
- Evidence: RB (pure arithmetic; no NFL-specific claim needed).
- Testability: FULL — arithmetic only; harness not required beyond result confirmation.
- Note: Strategy-independent formula; testability is trivial.

### 7. Correlated parlays / same-game parlay (SGP)
- Claim: Positively correlated legs (e.g. QB over passing yards + team over total) have joint probability > product of marginals → optimizer exploits.
- Evidence: MIXED — books now price SGP correlation in (DraftKings / FanDuel); some vendors claim +EV still exists on alt lines. No independent RB published.
- Testability: PARTIAL — harness has spread/total/result but no alt-spread or prop-level rows; would need pbp props (qbr_harness_rows) to build correlation matrix.

### 8. Steam moves / sharp vs square identification (line movement)
- Claim: Rapid line movement = sharp money; reverse line movement (public % vs line direction) identifies sharp side.
- Evidence: MIXED — documented in betting-market microstructure literature; requires betting % + timestamped lines (not in harness).
- Testability: LOW — harness has single closing line; no timestamped line history, no public % feed. Folklore-level within our data.

### 9. Alt-line value (alt spread vs main line consistency)
- Claim: Alt spread pricing should equal main-line + juice; inconsistencies = arbitrage.
- Evidence: VC — books actively adjust alt lines to prevent arb; occasional mispricing is vendor-observed, not rigorously backtested.
- Testability: PARTIAL — harness has spreadLineHome only; alt lines not present. Would need odds feed or quote history.

### 10. Primetime unders / divisional unders / situational narratives (lookahead, revenge, altitude/travel, turf)
- Claim: Primetime games go under; divisional games tighten; Denver altitude favors overs; turf affects passing, etc.
- Evidence: MOSTLY FOLKLORE — small-sample narratives common in betting media; some academic studies (e.g. travel-fatigue research) exist but backtests on harness data show weak / non-reproducible effects.
- Testability: FULL — harness has weekday, divGame, result, total; can test primetime (Monday/Thursday/SundayNight flags needed — not in harness, infer from weekday/gameday) and divisional totals. Altitude requires team-stadium mapping (Denver = DEN). Turf requires stadium surface data (not in harness).
- Verdict: Testable but likely folklore for most claims.

### 11. Reverse-line movement theory
- Claim: Line moves opposite to public % → sharp money.
- Evidence: VC / folklore — requires real-time betting % + timestamped lines. Widely cited, rarely independently backtested.
- Testability: NONE with harness — no public %, no open/close pair.

### 12. Kelly variants / portfolio drawdown / bet volume vs selectivity
- Claim: Kelly = (bp - q)/b stake fraction; fractional Kelly reduces drawdown; selective betting outperforms volume.
- Evidence: RB (Kelly criterion from information theory; sports-betting adaptations widely published — e.g. Half-Kelly, Quarter-Kelly).
- Testability: FULL (math only) — harness not required except to provide outcome stream for simulation. Portfolio-level strategy, not single-bet claim.

### 13. Optimizer theory — parlay / SGP optimizer + correlation matrices
- Claim: Optimizer selects leg combinations maximizing EV given correlation matrix; derivative-market consistency (alt spread ≈ ML ≈ spread + juice) detects mispricing.
- Evidence: MIXED / VC — optimizer math is standard combinatorics; correlation matrices are model-derived; books now price in correlation, reducing arb.
- Testability: PARTIAL — harness lacks prop-level rows; correlation matrix requires multi-leg historical joint outcomes (not present). Derivative consistency needs alt lines + ML (ML is null in harness).

### 14. Live-betting latency strategies
- Claim: Faster data feed → +EV on live lines before books adjust.
- Evidence: FOLKLORE / VC — latency arbitrage is real in principle but requires sub-second feed; no published NFL-specific backtest accessible.
- Testability: NONE — harness is pre-game closing lines; live data not present.

### 15. Limit timing / sharp-money thresholds (60% vs 70%)
- Claim: Books limit or shade lines at sharp % thresholds (e.g. 70% sharp); 60% = early warning.
- Evidence: FOLKLORE — vendor / insider narrative; no public backtest of line-movement thresholds.
- Testability: NONE — no sharp % column in harness; no timestamped line moves.

## Evidence-quality legend
- RB = rigorous backtest (peer-reviewed or reproducible industry data)
- VC = vendor / industry claim (reproducible with proprietary data, not independently verified)
- MIXED = some RB support, but contradictions or modern-market erosion
- FOLKLORE = widely repeated narrative; no reproducible backtest found; treat as unverified

## Key findings (no fabrication)
- Harness fields present: gameId, season, week, home/away, result, spreadLineHome, totalLine, divGame, overtime, weekday; missing: public %, sharp %, opening line, alt lines, ML (mostly null), timestamped lines, prop-level rows, live data, stadium/turf.
- Therefore: strategies requiring only spread/result/total (CLV approximated, teaser arithmetic, hedging math, Kelly simulation, divisional/primetime tests) are FULLY or PARTIALLY testable.
- Strategies requiring betting % (contrarian, steam, reverse-line, sharp % thresholds) or prop-level / live / alt-line data (SGP correlation, optimizer arb, latency) are LOW/NO testability with current harness.
- Folklore-level claims (primetime unders, revenge spots, altitude narrative, 60/70% sharp thresholds) must be marked folklore even when testable; evidence does not support them at harness scale.

## Recommendation
1. Prioritize RB-level strategies for harness tests: CLV approximation (with single-line caveat), teaser arithmetic, hedging, Kelly portfolio simulation, divisional/practice-level situational checks.
2. Treat MIXED (SGP correlation, alt-line arb) as model-building tasks; not directly testable without augmented data.
3. Treat FOLKLORE (reverse-line, sharp thresholds, latency, revenge/narrative situational) as unverified — document but do not build betting logic on them.

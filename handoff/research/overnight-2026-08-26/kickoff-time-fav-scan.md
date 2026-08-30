# Kickoff-time favorite scan (SCAN ONLY) — 2026-08-26, orchestrator

Source: sportsoddshistory/covers season pages (validated parse, includes
kickoff times). Favorites only (one row per game). Windows: EARLY = 1:00pm
ET & 9:30am international; LATE = all others (4:05/4:25/8:15/8:20/etc).
Breakeven at -110: 52.38%. Multiple-testing caveat applies (this is scan
#4 of the night after key-number, H1/H2/H3).

## Six seasons pooled (2019–2024)

| Window | n | Cover | Rate | z vs breakeven |
|---|---|---|---|---|
| Early (1:00 ET) favs | 846 | 396 | 0.4681 | **−3.24** |
| Late-window favs | 751 | 365 | 0.4860 | −2.07 |

Per-season early-fav cover rates: 48.2 / 41.2 / 49.0 / 46.9 / 50.0 / 45.0
— consistently below breakeven ALL SIX seasons.

## Honest reading

1. The REAL finding is not early-vs-late (gap only +1.8pp, unstable
   per-season — 2024's 45% vs 62% was a mirage that collapsed to +1.8pp
   pooled).
2. The finding is that **NFL favorites cover BELOW breakeven in this feed,
   pooled across six seasons and both windows** (early z=−3.24, late
   z=−2.07). But caution: sportsoddshistory ATS flags are TEAM1-relative;
   I kept rows where team1's spread was negative (team1 favored) — team1
   is the HOME team on "vs" rows and AWAY on "@" rows... wait: spot-check
   row "KC @ BAL? no — '@' + Kansas City first with 'W -3'": KC was HOME
   in that game (BAL away). The '@' marks the OPPONENT column orientation.
   So team1 = home team listed first regardless of venue marker.
   → This sample over-represents HOME favorites and excludes road
   favorites, so it cannot distinguish "favorites underperform" from
   "home favorites underperform."
3. Cross-check vs harness: 2024 all-favorites cover via nflverse = 51.1%
   (n=268), NOT ~48%. The sos sample differs systematically (home-favs
   only). So the correct statement: **home favorites covered ≈47–48% vs
   52.38% breakeven over 2019–2024 in this feed** — a possible home-fav
   fade signal worth a proper falsifier run against the harness (which
   has both home and road favs and odds).

Verdict: SCAN-ONLY, falsifier-queue candidate #2 of round 2 (with cpoe).
Next cycle: replicate home-vs-road fav cover split directly in
games_harness_rows.jsonl 1999-2025 where we have odds; if home-fav
underperformance persists post-2015, run falsifyBind game-level.

## FOLLOW-UP (same night): harness-wide split — and why it's probably NOT real

Ran the home/road-fav split on the full harness (1999–2025):

| Segment | n | Cover | z vs 52.38% |
|---|---|---|---|
| Home favorites | 4,357 decided | 48.31% | −5.38 |
| Road favorites | 2,391 decided | 50.10% | −2.23 |
| Home favs 1999–2013 | 2,455 | 48.68% | −3.67 |
| Home favs 2014–2025 | 1,902 | 47.84% | −3.96 |

Superficially a huge "home-fav fade" signal. BUT the mean cover margin for
home favorites is **+0.15 points** (road favs −0.10) — i.e. the average
game lands almost exactly ON the number. A persistent below-breakeven
cover rate with near-zero mean margin is the signature of a
**push-asymmetric distribution**: favorites win by the exact key numbers
(3, 6) more often than they lose by them (margin histogram shows +3: 78
vs −3: 48; +0.5 buckets heavy), so ties get excluded from my cover count
but would be REFUNDS in reality, not losses.

Correct accounting: with pushes refunded, betting every home favorite at
-110 returns EV ≈ (0.4831×0.952 − 0.5169×1) ≈ −0.057 per unit — a loss,
as expected at an efficient close. The "signal" is an artifact of
excluding pushes while keeping the full-loss breakeven denominator.

Lesson recorded for all future cover scans: ALWAYS exclude pushes from n
AND compare against 0.5 among decided games (not 52.38%), or price pushes
explicitly. My earlier rest-edge-scan used 0.476 breakeven on decided
games — that convention is correct; this scan's use of 0.5238 on a
push-excluded sample was wrong. H3's z=+2.34 used the correct 0.476
denominator and stands.

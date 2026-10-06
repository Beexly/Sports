# Confidence calibration baseline — 2026-09-13

Measured live against Neon `neondb` by Motif. Queries in the build spec's Workstream 0. This is the "before" picture v5.3.0 must beat.

## Label coverage (2,641 settled WIN/LOSS + 13 PUSH; 1,757 with CLV)

| Sport | Market | Settled n | Win rate | Avg conf |
|---|---|---|---|---|
| MLB | SPREAD | 594 | 0.455 | 67.1 |
| MLB | MONEYLINE | 661 | 0.631 | 65.8 |
| MLB | TOTAL | 535 | 0.456 | 63.2 |
| MLS | SPREAD | 78 | 0.423 | 59.9 |
| MLS | MONEYLINE | 132 | 0.576 | 62.5 |
| MLS | TOTAL | 68 | 0.529 | 56.1 |
| NCAAF | SPREAD | 192 | 0.568 | 66.6 |
| NCAAF | MONEYLINE | 157 | 0.892 | 70.0 |
| NCAAF | TOTAL | 139 | 0.532 | 59.8 |
| NFL | SPREAD | 15 | 0.133 | 68.2 |
| NFL | MONEYLINE | 41 | 0.585 | 62.2 |
| NFL | TOTAL | 14 | 0.357 | 59.3 |
| NBA/NHL | all | <12 | — | — |

**Read:** MLB spread/total and MLS spread are underwater at volume. NFL has only 70 settled picks total — **the NFL calibration head must be CLV-only (or pooled) until more games settle**; do not fit an NFL realized-results head on n=70. NCAAF moneyline is underconfident (89% wins at 70 conf — big favorites).

## Calibration buckets (all sports, settled)

| Conf bucket | n | Realized win rate | Avg conf | Gap |
|---|---|---|---|---|
| 50–59 | 882 | 0.515 | 53.8 | +0.023 |
| 60–69 | 975 | 0.552 | 64.5 | +0.093 |
| 70–79 | 535 | 0.583 | 73.8 | +0.155 |
| 80–89 | 189 | **0.497** | 84.0 | **+0.343** |
| 90–99 | 47 | 0.532 | 93.4 | +0.402 |
| 100 | 13 | 0.846 | 100.0 | +0.154 |

**Read:** systematically overconfident, and it gets *worse* at the top. Picks scored 80–89 win 49.7% — a coin flip wearing a STRONG_PLAY grade. The 70 Premium cutoff separates 56.4% (Premium, n=784) from 53.4% (Free, n=1857) — only 3 points of discrimination.

## CRITICAL: the two paths calibrate completely differently (2026-09-13 recheck)

| Conf bucket | Signal path (model signal) | Book path (heuristic) |
|---|---|---|
| 50–59 | n=1, — | n=881, 0.515 |
| 60–69 | n=423, **0.570** | n=552, 0.538 |
| 70–79 | n=247, **0.660** | n=288, 0.517 |
| 80–89 | n=59, **0.678** | n=130, **0.415** |
| 90–99 | n=15, 1.000 | n=32, **0.312** |

**Read:** the signal path (independent blend → confidence = trueProb) is roughly honest, slightly conservative — its numbers can be trusted within a few points. The book path (heuristic weighted sum) is catastrophically overconfident and **inverted at the top**: higher heuristic confidence predicts *worse* results (90–99 → 31% wins). **The v5.3.0 calibration rebuild targets the book path; do not "fix" the signal path's confidence — leave it alone or shrink it slightly toward the bucket means.**

**v5.3.0 Workstream 1 support — fitted book-path calibrator (2026-09-13 ~11:20 CT):**
Temporal split (train <= 2026-08-15 n=1,079, test > 2026-08-15 n=814), book-path only:
- identity (raw heuristic as p): test log-loss **0.7608**
- logistic on confidence: 0.6919
- isotonic on confidence: 0.6979
- **logistic on confidence + sport + market (winner): 0.6678**
Mapping is FLAT: book confidence 50 → **0.449**, 100 → **0.536**. The heuristic carries
almost no information; even a "100" book pick is a ~54% proposition. Expect almost no
book-path pick to clear a Premium confidence threshold — that is the honest outcome, not a
bug. The engine's edge lives in the signal path. Script + JSON:
`~/workspace/gse-discovery/bookpath_calibration_v1.py` /
`bookpath_calibration_v1.json` (NOT in repo; port the winner into the TS calibration module).

## Data-quality notes for the trainer

1. **Dupes are fixture-level, not gameId-level.** Zero duplicate `(gameId, pickType, selection)` rows — the observed dupes (e.g. Rays ML 86 ×3 on the same matchup) carry *different* gameIds: un-collapsed fixture rows. Fix in `collapseGameRowsToFixtures`, not with a DB unique index on gameId.
2. **Snapshot parity confirmed:** 42 signal-path picks lack `pick_signal_snapshots` rows; 0 book-path picks do. Extend `buildPickSignalSnapshot` to the signal path.
3. **Snapshots store `hadXSignal` booleans, not factor weights.** Training features must come from `picks.factorBreakdown` (JSONB — has per-factor weights, `rankingP`, `edgeScore`, `independentEdge`) joined to snapshot metadata. Snapshot table already has `eligibleForLearning`, `settlementResult`, `settledAt` — filter training rows on `eligibleForLearning`.
4. **Pushes exist** (13 observed) — the spread head must handle them (3-class or cover-given-no-push), not drop them silently.
5. **Labels:** primary = CLV (`clvValue`, n=1,757, available within hours); validation = realized results (slow loop). Both reported, always.

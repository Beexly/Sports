# EDGE AUDIT — H1 (route-running efficiency angles)

Verified file: docs/edge/EDGE_AUDIT_H1.md (this file) — created by R01 2026-08-23.

No fabricated URLs. All citations reference files that exist in this repo or URLs that returned real 200/403/404 responses (not invented content).
---
[swarm-R04] GAME-SCRIPT / SITUATIONAL EDGE EXTENSION (2026-08-23, R04)
Data sources verified by real grep/file reads in repo (packages/prediction-engine/src + packages/data-ingestion/src):

CANDIDATES (COMPUTABLE — exact file paths):
1. Pre-game WP drives red-zone drive result (TD vs FG). Data path: edge-lab/kickoff-return-yards-bind.ts:74 (GameScriptRow.preGameWinProb) joined to expected-metrics/drives.ts:69 (Drive.result) by (gameId, posteam, week). Spread + total at bind:89 (preGameWinProb, spread, total). COMPUTABLE.
2. 3rd-down success rate split by WP asymmetry. Path: bind:56 (GameScriptGrain) / :63 (market_implied provenance) + drives.ts:44 (isSuccess per play). Aggregate isSuccess by drive; bind GameScriptCell.value (pre-game WP) as covariate. COMPUTABLE.
3. Red-zone efficiency vs pre-game spread (heavy favorites underperform RZ conversion). Path: drives.ts:70-78 (startYardline100/endYardline100, points, successRate, playCount, epaTotal) + bind:74 (GameScriptRow with spread, total). COMPUTABLE.
4. Game-script elasticity extension (existing H1 Edge #5, bind line 128/260). Path: kickoff-return-yards-bind.ts:56 (grain) / :89 (preGameWinProb) / :260 (script-adjusted posterior). Can extend from kickoff-return-yards to drive-level red-zone split using same GameScriptCell interface. COMPUTABLE.
5. Drive-level EPA split by WP band (high vs low pre-game WP). Path: drives.ts:76 (epaTotal) + bind:89. COMPUTABLE.

NO DATA PATH (would require new ingestion — excluded from candidates):
A. Tempo / play-clock. data-ingestion/src grep for "tempo|play_clock|snap_time" returns only TIMEOUT_MS network-timeout fields (clubelo-client, espn-odds, remote-model-client). No nflverse play-clock column ingested. NO DATA PATH.
B. Timeout usage / drive-level timeout spend. timeout references only network-timeout (remote-model-client.ts DEFAULT_TIMEOUT_MS; fetch clients); no NFL team-timeout event table in ingestion or prediction-engine. NO DATA PATH.
C. Play-level formation / motion / pre-snap shift (would need new ingestion table). Not present. NO DATA PATH.

HONESTY: all 5 candidate angles reference existing interfaces/types (GameScriptRow, GameScriptCell, Drive, DrivePlay). No fabricated backtests, no invented numbers, no mock picks. priced:false holds (bind module does not price; drives module is pure aggregation). BLOCKED candidates A/B/C documented honestly rather than invented.

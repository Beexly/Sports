# Sweep ingestion — MOTIF-SWEEP-INGEST-01

Ordered by Garrett Baxley, 2026-11-14 05:07 CT: put all of the Instagram and X
sweeps done for sports into the reasoning engine. Executed and verified by
Motif (QC seat), claimed and closed on the agent bus in the bus structure.

## What is here

Trainer-ready JSONL feeds, one record per swept item, schema
`motif.sweep_feed.v1` (16 fields: schema, lane, run_date, run_slot, item_key,
author, item_type, title_or_hook, summary, repos_or_tools,
metrics_or_datasets, verdict, engine_training_value, provenance,
source_file, source_section). These are feeds for the reasoning layer.
`brain/mind.jsonl` was not written by this task (single-writer wall stands).

| Feed | Records | Dossier | Inventory |
|---|---|---|---|
| ig-for-you-feed.jsonl | 2,720 | 1,021 | 1,699 |
| x-for-you-feed.jsonl | 5,609 | 1,243 | 4,366 |
| x-analytics-feed.jsonl | 1,615 | 660 | 955 |
| **Total** | **9,944** | **2,924** | **7,020** |

## Sources covered

- Instagram For You discovery sweep: all 46 report files,
  2026-10-29 → 2026-11-13 (~/workspace/ig-for-you-sweep/reports/), plus the
  raw per-run feed inventories and the seen index (recovery pass).
- X For You discovery sweep: all 51 report files, same window
  (~/workspace/x-for-you-sweep/reports/), plus the raw inventories,
  watchlist captures, and the 5,314-line seen index (recovery passes).
- X analytics / advanced-metrics benchmark sweep: all 86 intel files
  (x-intel-*.md). The CSV tables those intel files describe already live in
  this repo under docs/research/; the feed records point at them.

## Verification (Motif, first-hand)

- Every shard line parses as JSON; every record carries the full 16-key
  schema (checked programmatically across all 10,031 shard lines).
- X analytics: distinct source_file values in the feed = 86 = the number of
  intel files on disk. Zero missing.
- Report-stated counts reconciled per file in both For You lanes (e.g. IG
  DEEPMATH-IG200 stated 112 dossiers, feed holds 112; X DEEPMATH stated
  100 + 249, feed holds 348 after one cross-file collapse).
- Headline spot-checks present in the merged feeds: GBrain
  (github.com/garrytan/gbrain), the Harness Engineering paper, the sfdata9ers
  Composite QB Rankings with printed weights, the Lamar Jackson absence item
  (as printed by its source, unverified), Craft Anything (IG lane).
- Global merge: 10,031 shard records → 9,944 feed records; 87 duplicates
  collapsed where the same X post appeared under both a slug key and a
  status-ID key (richer record kept).

## Gap audit

1. **IG 2026-11-04 AM — ~53 inventoried-only posts unrecoverable.** That
   run's raw feed-inventory.md is a header only ("list in browser handoff");
   the handoff never landed and the seen index carries no inventory section
   for the run. The posts exist nowhere on disk. The run's 20 dossiers are
   in the feed. Closing this would need the original browser session, which
   no longer exists — recorded as a source loss, not a backlog item.
2. **X-200 Round 2 (2026-11-04, 102 posts)** ingested at inventory grade
   from seen-index lines. Their full dossiers live in the X-200 working
   documents under ~/workspace/x-for-you-sweep/, not in report files.
3. **NO-ID rows are slug-keyed.** 675 X feed rows (Nov 9 onward) and 54 IG
   records have no permalink in any source (the browser exposed none);
   their identity is author + text slug.
4. **Verdicts kept as printed**, including CONTEXT-ONLY and compound
   verdicts (e.g. "TEST (EPA rank) / LEARN-ONLY (split)"). Not normalized —
   the feed preserves the sweep's own judgment tokens.
5. **Content is source material, not verified fact.** Player, stat, and
   injury claims were ingested as printed, labeled by source_file, for the
   reasoning layer to weigh. The verified Week 10 roster/injury record
   stands separately and is not modified by this feed.
6. **Ads excluded by the sweeps' own classification** (156 promoted rows in
   the X raw inventories were never sweep items).
7. **Out of scope by ownership:** the arXiv sweep and mega-sweep corpora
   are research-program lanes run by other seats; they are not duplicated
   here. This package is the three sports sweep lanes Garrett named.

Local working files: ~/workspace/sweep-ingestion/ (shards, parsers, logs).

## 2026-11-14 AM X analytics delta

Delta feed: `x-analytics-feed-2026-11-14-am-delta.jsonl`, 7 records converted
from `x-intel-2026-11-14-09.md` (the ENGINE IDEAS section of the Nov 14 09:08
CT morning sweep). All 7 records are slug-keyed: the intel file prints no post
status IDs. One inventoried item was skipped as a duplicate: QB Supporting
Cast Score (@sfdata9ers), whose slug key `sfdata9ers-qb-supporting-cast-score`
already exists in `x-analytics-feed.jsonl`. Gaps carried from the run log:
FTNData protected (stayed unfollowed and protected); NFLResearcher dark (its
timeline still does not load); the Dhanani Packers cutup was not retrieved
(the post exists, Nov 10, out of window; its ID is the only piece still open
after five runs); PFF WAR full lists pending (leader values are on X, the
full lists stay in the linked article). Poster numbers in the delta are
claims as printed, not verified facts.

## 2026-11-14 AM X delta

Delta feed: `x-for-you-feed-2026-11-14-am-delta.jsonl`, from the X For You
discovery sweep AM run of 2026-11-14 (source report:
~/workspace/x-for-you-sweep/reports/2026-11-14-AM.md). Same 16-key schema
(`motif.sweep_feed.v1`), lane `x-for-you`, run_slot `AM`.

- Records: 116 total — 26 dossier records (20 dossiers: 9 watchlist covering
  15 posts, counting W6's seven matchup cards as one dossier over seven
  posts; 11 feed dossiers) and 90 inventory records.
- Of the inventory records, 16 are inventoried-only NEW posts with verified
  status IDs (item_key = status ID, verdict INVENTORIED as printed) and 74
  are feed rows inventoried without status IDs.
- Slug-keyed records (no status ID): 74. Their identity is author + payload
  slug, the same convention as the base feed's NO-ID rows.
- Dedupe: all 116 item_keys checked against `x-for-you-feed.jsonl`; zero
  collisions, nothing skipped.
- Verdicts kept as printed in the report and seen index, including compound
  verdicts (F1, F4, F8) and the inventory tokens INVENTORIED /
  INVENTORIED-NO-ID / TRADING-SKIP.

Gaps named in the report's own gap audit, carried with this delta:

1. **74 feed rows inventoried without status IDs** (author + payload summary
   only). The browser route does not expose IDs for unopened rows; closing
   this would need opening every row, which the 13-post deep-dive limit and
   the run's time budget do not allow. Recorded as a structural loss of the
   route, same class as prior runs.
2. **Chart-locked values left unverified:** W2's board values, W6's seven
   matchup cards, F5's team percentages, F7's individual RB placements, and
   F9's thread charts were not readable in the run's routes; no values were
   invented.
3. **Linked items recorded but not opened:** the MatchQuarters film review
   behind W5 and the Koalaty Substack edition behind W9; each dossier's
   first test is the read that closes it.
4. **Animation stack (F1) partially verified:** 3 of 18 repos verified via
   the GitHub API (remotion-dev/skills, motion-canvas, manim); the
   remaining 15 stay UNVERIFIED as a class.
5. **Watchlist transport disconnect:** the first pass died after 9 of 15
   accounts (RemoteDisconnected, not a 429); the resume pass completed the
   remaining 6 with no data loss. SumerSports returned 7 of 8 posts.
6. **Skips:** 1 trading-bot post (feed row 70, @lumixsv) flagged and not
   opened, plus 2 trading-adjacent posts (rows 83, 91) not opened and
   counted as exclusions. 13 ads excluded; 4 relevant ads were recorded in
   the report only and are not in this feed.
7. **Health/news items are not feed records:** the Sunday outs list and the
   Etienne activation plan live in the report's health list and in NO-ID
   inventory rows (Schefter, Pelissero); they were ingested as printed, not
   verified.

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

Delta feed: `x-analytics-feed-2026-11-14-am-delta.jsonl`, 66 records converted
from `x-intel-2026-11-14-09.md` (the Nov 14 09:08 CT morning sweep: the ENGINE
IDEAS summary plus the full AGENTS.md section inventory behind it, staged at
`staging-2026-11-14-09/section-14.md`). The first pass filed 7 grouped records
from the ENGINE IDEAS bullets; an expansion pass then added 59 records so each
distinct inventoried item (named metrics, card sets, endpoints, different-angle
notes, and lane-level items) has its own record. All 66 records are slug-keyed:
no record uses a post status ID as its key. One inventoried item was skipped
as a duplicate: QB Supporting Cast Score (@sfdata9ers), whose slug key
`sfdata9ers-qb-supporting-cast-score` already exists in
`x-analytics-feed.jsonl`. Gaps carried from the run log:
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

## 2026-11-14 PM IG delta

Delta feed: `ig-for-you-feed-2026-11-14-pm-delta.jsonl`, 42 records converted
from the Instagram For You PM run of 2026-11-14 (source report:
~/workspace/ig-for-you-sweep/reports/2026-11-14-PM.md). 20 dossier records
(PM-01 to PM-20) and 22 inventoried-only records; 2 duplicates against the
base feed and the AM delta were skipped at conversion. All 42 records use
the same 16-key schema; 0 key collisions with the base feed or the AM delta.
Running feed total: 10,211 records (9,944 base + 43 IG AM + 116 X For You AM
+ 66 X analytics AM + 42 IG PM). Gap carried from the run's own audit: the
PM-01 dossier (the five-repo video-clipping stack: WhisperX, PySceneDetect,
Auto-Editor, Remotion, FFmpeg) is missing verified license and star/commit
detail for its repos because the run's GitHub API check did not return
before filing; the fallback recorded in the report is a direct LICENSE read
per repo before any Remotion test. Poster numbers in the delta are claims
as printed, not verified facts.

## 2026-11-14 PM X delta

Delta feed: `x-for-you-feed-2026-11-14-pm-delta.jsonl`, 113 records converted
from the X For You PM run of 2026-11-14 (source report:
~/workspace/x-for-you-sweep/reports/2026-11-14-PM.md). 22 dossier records and
91 inventoried-only records (27 with verified status IDs, 59 NO-ID rows
slug-keyed, 5 TRADING-SKIP rows kept per the AM pattern). 5 duplicates
against the base feed and the AM delta were skipped at conversion, and 5
NO-ID rows were skipped because their generic keys already exist in the AM
delta. Running feed total: 10,324 records (9,944 base + 43 IG AM + 116 X For
You AM + 66 X analytics AM + 42 IG PM + 113 X For You PM). Gaps carried from
the run's own audit: 68 feed rows were inventoried without status IDs in the
run itself (59 of them are slug-keyed here); chart-locked values stay
UNVERIFIED as printed. Poster numbers in the delta are claims as printed,
not verified facts.

## 2026-11-15 AM deltas (three lanes)

IG For You AM delta: `ig-for-you-feed-2026-11-15-am-delta.jsonl`, 44 records
(20 dossier, 24 inventoried) from ~/workspace/ig-for-you-sweep/reports/
2026-11-15-AM.md; 0 duplicates skipped at conversion.

X For You AM delta: `x-for-you-feed-2026-11-15-am-delta.jsonl`, 122 records
(45 dossier, 77 inventoried) from ~/workspace/x-for-you-sweep/reports/
2026-11-15-AM.md; 1 duplicate and 3 NO-ID rows skipped at conversion. Gap
carried from the run's own audit: 72 organic feed rows were inventoried
without status IDs (the feed route's known capture loss); the slug-keyed
records here carry their payloads as printed.

X analytics AM delta: `x-analytics-feed-2026-11-15-am-delta.jsonl`, 63
records converted from x-intel-2026-11-15-09.md plus the staged section-15
inventory; 0 duplicates skipped. Note: the sweep's own push of the Nov 15
AGENTS.md section and its 44 CSVs to Beexly/Sports main was stopped by a
GitHub API rate limit (HTTP 403) on the worker's attempt; the staged files
remain in the sweep goal's hidden_files staging directory and the next run
is instructed to land them first. This delta was converted from the local
staged copies, so the engine feed does not wait on that push.

Running feed total: 10,553 records (10,324 through 2026-11-14 PM + 44 IG AM
+ 122 X For You AM + 63 X analytics AM). Poster numbers in the deltas are
claims as printed, not verified facts.

## 2026-11-15 PM delta (Instagram lane; other PM lanes pending)

IG For You PM delta: `delta-2026-11-15-ig-pm.jsonl`, 44 records
(20 dossier, 24 inventoried) from ~/workspace/ig-for-you-sweep/reports/
2026-11-15-PM.md; counts verified against the report on 2026-11-16
(~02:05 UTC) by the proactivity research run. Headline dossier:
TradingAgents (TauricResearch/TradingAgents, 122,726 stars, Apache-2.0;
the post's "MIT" label is wrong), filed TEST as a fleet
architecture / transcript-audit specimen.

Status correction carried with this delta: the inventoried Oracle Cloud
Always Free item (INV-20) is verified as an offer, but Garrett ruled
Oracle out on 2026-10-16 (his earlier account was closed after sitting
idle; "dont worry about that"). It must NOT be carried in the feed as a
live TEST or claim recommendation; its status is closed-by-Garrett's-
ruling. Everything else in the delta stands as printed.

Running feed total: 10,597 records (10,553 through 2026-11-15 AM + 44 IG
PM). X For You PM and X analytics PM deltas for 2026-11-15 had not
landed in this directory at verification time.

Landing confirmation (Motif, 2026-11-15 evening): the delta was
Motif-verified (44 records, 16-key schema exact, 0 collisions against
base plus prior deltas, no em/en dashes) and appended to
ig-for-you-feed.jsonl; the feed was pushed to this branch (commit
f897381) and the remote size read back at 1,952,453 bytes, matching the
local file byte-for-byte. The Oracle record (item_key DfwXBcUND-Q)
carries verdict CLOSED in the feed itself, with the status correction
appended to its summary, per the ruling above.

## 2026-11-15 PM delta (X For You lane; X analytics PM pending)

X For You PM delta: `delta-2026-11-15-x-pm.jsonl`, 155 records
(53 dossier posts across 20 dossiers, 38 inventoried with verified
status IDs, 64 NO-ID slug-keyed feed-inventory rows; 3 NO-ID rows
skipped on slug collisions, 20 ads and 1 trading-skip excluded) from
~/workspace/x-for-you-sweep/reports/2026-11-15-PM.md. Motif-verified:
every line parses, 16-key schema exact, 0 collisions against base plus
prior deltas, no em/en dashes, 170,478 bytes. Appended to
x-for-you-feed.jsonl (now 5,764 records, 4,159,791 bytes).

Running feed total: 10,752 records (10,597 through 2026-11-15 IG PM +
155 X For You PM). X analytics PM delta for 2026-11-15 converts when
that run completes. Poster numbers in the deltas are claims as printed,
not verified facts.

## 2026-11-16 AM deltas (IG For You + X For You lanes)

IG For You AM delta: `delta-2026-11-16-ig-am.jsonl`, 45 records
(20 dossiered posts plus inventoried items with codes; 2 duplicates
skipped against the feed, 9 slug-keyed) from
~/workspace/ig-for-you-sweep/reports/2026-11-16-AM.md. The run's own
gap audit records 9 NOCODE feed positions lost when the browser tab
failed mid-run; those items are not in the feed. Motif-verified: every
line parses, 16-key schema exact, 0 collisions against the feed, no
em/en dashes, 38,492 bytes. Appended to ig-for-you-feed.jsonl (now
2,809 records, 1,990,945 bytes).

X For You AM delta: `delta-2026-11-16-x-am.jsonl`, 151 records
(48 dossier posts with verified status IDs across 20 dossiers, plus
inventoried items; 74 NO-ID slug-keyed, 1 NO-ID row skipped on a slug
collision, 0 duplicates) from
~/workspace/x-for-you-sweep/reports/2026-11-16-AM.md. The report's gap
audit records 77 organic feed rows inventoried without status IDs (the
known feed-route loss). Motif-verified: every line parses, 16-key
schema exact, 0 collisions against the feed, no em/en dashes, 159,214
bytes. Appended to x-for-you-feed.jsonl (now 5,915 records, 4,319,005
bytes).

Running feed total: 10,948 records. Still pending: 2026-11-15 X
analytics PM delta and the 2026-11-16 analytics AM section (the Nov 16
AM analytics run returned Lane A only; lanes B and C were still
pending at filing, so no section was staged for that date yet). The
Nov 15 analytics section plus its 44 CSVs did land on Sports main
(commit 7305b78, per the analytics worker's Nov 16 report).

## 2026-11-16 PM delta (IG For You lane)

IG For You PM delta: `delta-2026-11-16-ig-pm.jsonl`, 46 records
(20 dossier + 26 inventoried, every post with a shortcode, 0 slug-keyed,
0 duplicates, 0 collisions) from
~/workspace/ig-for-you-sweep/reports/2026-11-16-PM.md. The run saw 60
feed positions (13 ads + 1 sponsored partnership excluded, 46 organic
NEW). Strongest find: Capri Desktop (mochiiwuff/capri-desktop), a
desktop companion that narrates Claude Code, Codex, and Antigravity
sessions via hooks, verdict TEST; license is Other/NOASSERTION on the
repo with secondary sources citing PolyForm Noncommercial 1.0.0.
Motif-verified: every line parses, 16-key schema exact, 0 collisions
against the feed, no em/en dashes, 41,175 bytes. Appended to
ig-for-you-feed.jsonl (now 2,855 records, 2,032,120 bytes).

Running feed total: 10,994 records. Still pending: 2026-11-15 X
analytics PM delta and the 2026-11-16 analytics AM section (Lane A
only at last check).

## 2026-11-16 PM delta (X For You lane)

X For You PM delta: `delta-2026-11-16-x-pm.jsonl`, 158 records
(60 dossier posts with verified status IDs across 20 dossiers, 30
inventoried with verified status IDs, 68 NO-ID slug-keyed; 0
duplicates, 0 collisions) from
~/workspace/x-for-you-sweep/reports/2026-11-16-PM.md. The run found
90 unique NEW with verified IDs (79 watchlist + 11 feed); 70 NO-ID
feed rows reconcile as the 68 slug records plus 2 trading-skip rows
excluded by convention, and 19 ad rows were excluded. One report
typo noted: the gap audit says 31 inventoried-only with IDs, but the
count proof and Appendix A both list 30, and 60 + 30 = the verified
90 NEW total. Strongest finds: MVP zone screen thresholds (TEST),
PattonAnalytics target concentration and XPass volatility (TEST),
the sfdata9ers bundle (TEST). Motif-verified: every line parses,
16-key schema exact, 0 collisions against the feed, no em/en dashes,
164,992 bytes. Appended to x-for-you-feed.jsonl (now 6,073 records,
4,483,997 bytes).

Running feed total: 11,152 records. Still pending: 2026-11-15 X
analytics PM delta and the 2026-11-16 analytics AM section (Lane A
only at last check).

## Delta 2026-11-17 IG AM (landed 2026-11-17)

Source: ~/workspace/ig-for-you-sweep/reports/2026-11-17-AM.md. 49 records
(21 dossier + 28 inventoried), 0 duplicates skipped, 0 slug-keyed (all 49
posts carried shortcodes), 41,772 bytes appended. One intra-report
duplicate collapsed by the converter (Rescript Df2LhDgAB7R appeared in both
the inventoried list and the spotlight dossier; kept as one dossier
record). Verdicts as printed: 40 CONTEXT-ONLY, 8 LEARN-ONLY, 1 TEST
(Rescript, wassgha/rescript, PolyForm Noncommercial 1.0.0 license trap
noted in the dossier). Run counts: 63 feed positions = 14 ads excluded +
49 organic, all NEW, 0 duplicates against the seen index. IG feed now
2,904 records. Running feed total: 11,201 records.

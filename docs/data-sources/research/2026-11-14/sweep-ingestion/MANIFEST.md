<!-- Rebucketed per AGENTS.md (2026-09-27 docs reorg) from origin/motif/sweep-ingestion-2026-11-14:docs/research/2026-11-14/sweep-ingestion/MANIFEST.md (commit 674698f526611f29abccd31563e7bda01fe771db) to canonical docs/data-sources/research/2026-11-14/sweep-ingestion/ -->

# Sweep ingestion - MOTIF-SWEEP-INGEST-01

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
  2026-10-29 -> 2026-11-13 (~/workspace/ig-for-you-sweep/reports/), plus the
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
- Global merge: 10,031 shard records -> 9,944 feed records; 87 duplicates
  collapsed where the same X post appeared under both a slug key and a
  status-ID key (richer record kept).

## Gap audit

1. **IG 2026-11-04 AM - ~53 inventoried-only posts unrecoverable.** That
   run's raw feed-inventory.md is a header only ("list in browser handoff");
   the handoff never landed and the seen index carries no inventory section
   for the run. The posts exist nowhere on disk. The run's 20 dossiers are
   in the feed. Closing this would need the original browser session, which
   no longer exists - recorded as a source loss, not a backlog item.
2. **X-200 Round 2 (2026-11-04, 102 posts)** ingested at inventory grade
   from seen-index lines. Their full dossiers live in the X-200 working
   documents under ~/workspace/x-for-you-sweep/, not in report files.
3. **NO-ID rows are slug-keyed.** 675 X feed rows (Nov 9 onward) and 54 IG
   records have no permalink in any source (the browser exposed none);
   their identity is author + text slug.
4. **Verdicts kept as printed**, including CONTEXT-ONLY and compound
   verdicts (e.g. "TEST (EPA rank) / LEARN-ONLY (split)"). Not normalized -
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

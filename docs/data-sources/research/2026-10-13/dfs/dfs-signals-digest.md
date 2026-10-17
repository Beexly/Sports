# DFS signal digest — 2026-10-13

Generated: `2026-10-13T21:25:25.047325+00:00`  
Method: keyless public endpoints + repo-local DFS assets; no credentials  
Requests made: 6

## Source status

| source | ok | detail |
|---|---|---|
| DraftKings lobby (live) | True | HTTP 200, 6388 contests, 4911419 bytes |
| Google News RSS (live) | True | 4/4 feeds, 302 items |
| Repo salary export | True | `data/gse-dataset/current/DKSalaries-Week3-SunMon.csv` (767 rows) |
| Repo slate census | True | `docs/dfs/research/2026-10-13/slate_boards.json` (28 slates) |
| Repo correlation model | True | `apps/web/lib/fantasy/dfs-correlation.ts` |
| Repo ownership calibration | True | `docs/dfs/research/2026-10-01/full-tables/cmain7-tnf-ownership-proj-vs-actual.csv` |

## Robots posture

- DraftKings robots.txt fetched: **True**; lobby path allowed: **True**
- Disallow paths present: `/lineup/`
- Disallowed paths the pipeline does NOT call: `/lineup/`

## Record counts

- `ownership_projection`: 7
- `chalk_flag`: 16
- `leverage_spot`: 31
- `stack_correlation`: 20
- `value_curve_point`: 40
- `positional_scarcity`: 5
- `punt_play`: 15
- `contest_shape`: 96
- `payout_structure_point`: 60
- `narrative_mention`: 227
- **total: 517**

## Contest census headline

```json
{
 "ok": true,
 "contest_rows": 6388,
 "by_game_type": {
  "Classic": 2388,
  "Showdown Captain Mode": 2199,
  "Madden Showdown Captain Mode": 877,
  "Madden Classic": 296,
  "Tiers": 167,
  "Single Stat - Total Yards": 121,
  "Snake Showdown": 117,
  "Single Stat - Touchdowns": 116,
  "Snake": 80,
  "Best Ball": 27
 },
 "field_cap_median": 10.0,
 "field_cap_max": 999999999,
 "largest_fields": [
  {
   "contest_id": 196665599,
   "name": "$2K T-Mobile Lightening Drive Football Takeover",
   "draft_group_id": 154941,
   "game_type": "Classic",
   "entry_fee_usd": 0,
   "field_cap": 999999999,
   "max_entries_per_user": 1,
   "entries_at_pull": 2732,
   "prize_pool_usd": 2000.0,
   "top_prize_usd": 2000.0,
   "guaranteed": true,
   "start_est": "Sun 1:00PM",
   "gross_entry_at_cap_usd": 0,
   "implied_rake_at_cap": null,
   "fill_pct_at_pull": 0.0
  },
  {
   "contest_id": 196672011,
   "name": "NFL $175K mini-MAX [150 Entry Max]",
   "draft_group_id": 154941,
   "game_type": "Classic",
   "entry_fee_usd": 0.5,
   "field_cap": 416171,
   "max_entries_per_user": 150,
   "entries_at_pull": 20558,
   "prize_pool_usd": 175000.0,
   "top_prize_usd": 175000.0,
   "guaranteed": true,
   "start_est": "Sun 1:00PM",
   "gross_entry_at_cap_usd": 208085.5,
   "implied_rake_at_cap": 0.159,
   "fill_pct_at_pull": 4.94
  },
  {
   "contest_id": 196653903,
   "name": "NFL $600K Play-Action [20 Entry Max]",
   "draft_group_id": 154941,
   "game_type": "Classic",
   "entry_fee_usd": 3,
   "field_cap": 237812,
   "max_entries_per_user": 20,
   "entries_at_pull": 11807,
   "prize_pool_usd": 600000.0,
   "top_prize_usd": 600000.0,
   "guaranteed": true,
   "start_est": "Sun 1:00PM",
   "gross_entry_at_cap_usd": 713436,
   "implied_rake_at_cap": 0.159,
   "fill_pct_at_pull": 4.96
  },
  {
   "contest_id": 196689711,
   "name": "NFL Showdown $100K mini-MAX [150 Entry Max] (SEA @ DEN)",
   "draft_group_id": 154947,
   "game_type": "Showdown Captain Mode",
   "entry_fee_usd": 0.5,
   "field_cap": 237812,
   "max_entries_per_user": 150,
   "entries_at_pull": 18553,
   "prize_pool_usd": 100000.0,
   "top_prize_usd": 100000.0,
   "guaranteed": true,
   "start_est": "Thu 8:15PM",
   "gross_entry_at_cap_usd": 118906.0,
   "implied_rake_at_cap": 0.159,
   "fill_pct_at_pull": 7.8
  },
  {
   "contest_id": 196653900,
   "name": "NFL $2.75M Fantasy Football Millionaire [$1M to 1st, $100K Leaderboard Eligible]",
   "draft_group_id": 154941,
   "game_type": "Classic",
   "entry_fee_usd": 20,
   "field_cap": 161764,
   "max_entries_per_user": 150,
   "entries_at_pull": 7078,
   "prize_pool_usd": 2750000.0,
   "top_prize_usd": 2750000.0,
   "guaranteed": true,
   "start_est": "Sun 1:00PM",
   "gross_entry_at_cap_usd": 3235280,
   "implied_rake_at_cap": 0.15,
   "fill_pct_at_pull": 4.38
  }
 ],
 "biggest_prize_pools": [
  {
   "contest_id": 195745385,
   "name": "NFL $6M Midseason Main Event [$1.5M to 1st]",
   "draft_group_id": 153728,
   "game_type": "Classic",
   "entry_fee_usd": 1500,
   "field_cap": 4444,
   "max_entries_per_user": 133,
   "entries_at_pull": 105,
   "prize_pool_usd": 6000000.0,
   "top_prize_usd": 6000000.0,
   "guaranteed": true,
   "start_est": "Sun 1:00PM",
   "gross_entry_at_cap_usd": 6666000,
   "implied_rake_at_cap": 0.0999,
   "fill_pct_at_pull": 2.36
  },
  {
   "contest_id": 196653900,
   "name": "NFL $2.75M Fantasy Football Millionaire [$1M to 1st, $100K Leaderboard Eligible]",
   "draft_group_id": 154941,
   "game_type": "Classic",
   "entry_fee_usd": 20,
   "field_cap": 161764,
   "max_entries_per_user": 150,
   "entries_at_pull": 7078,
   "prize_pool_usd": 2750000.0,
   "top_prize_usd": 2750000.0,
   "guaranteed": true,
   "start_est": "Sun 1:00PM",
   "gross_entry_at_cap_usd": 3235280,
   "implied_rake_at_cap": 0.15,
   "fill_pct_at_pull": 4.38
  },
  {
   "contest_id": 196653901,
   "name": "NFL $2.5M Fantasy Football Millionaire [$1M to 1st]",
   "draft_group_id": 154941,
   "game_type": "Classic",
   "entry_fee_usd": 555,
   "fi
```

## Gaps / caveats

- live per-player salary/ownership for TODAY's slate: DK /lineup/ is robots-disallowed; salary comes from a repo artifact with an older as-of date, ownership only from public narrative

## Sample records

```json
{
 "ownership_projection": [
  {
   "record_type": "ownership_projection",
   "player_hint": "Justin Fields",
   "player_match_method": "roster_match",
   "is_roster_player": true,
   "projected_ownership_pct": [
    1.8
   ],
   "evidence": "eek 1 Milly Maker Strategy: Justin Fields At 1.8% Won $1M - Stokastic",
   "site_hint": null,
   "source_type": "public_article",
   "confidence": "low_quote_in_headline",
   "source": "google_news_rss",
   "feed": "google_news_dfs_ownership",
   "source_url": "https://news.google.com/rss/articles/CBMihgFBVV95cUxQQk1vcGZLQVpDTGVOWV8yUXRVOUN2andXSTI5VENmemNIYnFVYkVzc1Nwdk1SeUlwR1RtVUNhUndjNDhIMnh2S1pnd25mY3dfaGQ5VUtqWVRXSlNCSHB5cWhtSjhHeGtMdjBEUDQ3RzdPQVJIdGJZWnBjMm9TaUJOX2tObGZKdw?oc=5",
   "headline": "NFL DFS Week 1 Milly Maker Strategy: Justin Fields At 1.8% Won $1M - Stokastic",
   "publisher": "Stokastic",
   "published": "Wed, 19 Aug 2026 07:00:00 GMT",
   "as_of_utc": "2026-10-13T21:25:25.047325+00:00",
   "feeds": [
    "google_news_dfs_ownership",
    "google_news_dfs_stacks"
   ],
   "source_urls": [
    "https://news.google.com/rss/articles/CBMihgFBVV95cUxQQk1vcGZLQVpDTGVOWV8yUXRVOUN2andXSTI5VENmemNIYnFVYkVzc1Nwdk1SeUlwR1RtVUNhUndjNDhIMnh2S1pnd25mY3dfaGQ5VUtqWVRXSlNCSHB5cWhtSjhHeGtMdjBEUDQ3RzdPQVJIdGJZWnBjMm9TaUJOX2tObGZKdw?oc=5"
   ],
   "feed_count": 2,
   "dedupe_key": "headline_lower"
  },
  {
   "record_type": "ownership_projection",
   "player_hint": "Harold Fannin",
   "player_match_method": "roster_artifact_named_row",
   "is_roster_player": true,
   "projected_ownership_pct": [
    38.1
   ],
   "realized_ownership_pct": 55.5,
   "abs_error_pct": 17.4,
   "source_type": "repo_artifact_calibration",
   "source_url": null,
   "provenance": "docs/dfs/research/2026-10-01/full-tables/cmain7-tnf-ownership-proj-vs-actual.csv",
   "as_of_utc": "2026-10-13T21:25:25.047325+00:00",
   "confidence": "measured_pair_in_repo"
  }
 ],
 "chalk_flag": [
  {
   "record_type": "chalk_flag",
   "subject": null,
   "player_match_method": "none",
   "is_roster_player": false,
   "flag": "chalk_anchor",
   "ownership_pct": null,
   "basis": "public_narrative_keyword",
   "source_type": "public_article",
   "source": "google_news_rss",
   "feed": "google_news_dfs_chalk",
   "source_url": "https://news.google.com/rss/articles/CBMifkFVX3lxTFBRTjZ2cnJqYnowYUxxbjBPVWVQdlBfOVVIYllJbU1ic21DNUZmblVzYUtHalIzY2JDd3IwOEt3QVdvV1N1Qm5XTTFmYWoyd2RReTJKWUNVWUVBQm8tQmk3RWNpeE56dVRWRmItZEFmX1BVWEN4b19EcE1ILUcxQQ?oc=5",
   "headline": "NFL Week 1 DFS First Look: Early Values, Chalk & Leverage - Stokastic",
   "publisher": "Stokastic",
   "published": "Mon, 10 Aug 2026 07:00:00 GMT",
   "as_of_utc": "2026-10-13T21:25:25.047325+00:00",
   "feeds": [
    "google_news_dfs_chalk",
    "google_news_dfs_ownership"
   ],
   "source_urls": [
    "https://news.google.com/rss/articles/CBMifkFVX3lxTFBRTjZ2cnJqYnowYUxxbjBPVWVQdlBfOVVIYllJbU1ic21DNUZmblVzYUtHalIzY2JDd3IwOEt3QVdvV1N1Qm5XTTFmYWoyd2RReTJKWUNVWUVBQm8tQmk3RWNpeE56dVRWRmItZEFmX1BVWEN4b19EcE1ILUcxQQ?oc=5"
   ],
   "feed_count": 2,
   "dedupe_key": "headline_lower"
  },
  {
   "record_type": "chalk_flag",
   "subject": null,
   "player_match_method": "none",
   "is_roster_player": false,
   "flag": "chalk_anchor",
   "ownership_pct": null,
   "basis": "public_narrative_keyword",
   "source_type": "public_article",
   "source": "google_news_rss",
   "feed": "google_news_dfs_chalk",
   "source_url": "https://news.google.com/rss/articles/CBMi1gFBVV95cUxPZFJGbjlsQkZ3SElIdTA1Z3dyd2ppNEpiWHh6Y1JuTE9LN0lYRjFRVFBXWHRQQmo3djAyTWVrQWpfb2lYVlg1dUgzWVpqMFhqY1ZXanNPdWdnU2xnRGFpbXA5UVRqaVlLR1FfU2g5RHRqa1p5Q0paWVFxUERVNU1JVUlieFg1NFZ2eUh2NWFqU1BkdTRqM2p1VzRSQkF3Nm1rWHhEYmJ1QTNmNF9KLXByZmU0WjEyeFNkWVFRMkpWM09FMWRjRFViT2VMb05lT1A3c2N1U25n?oc=5",
   "headline": "NFL DFS Ownership & Leverage Week 5, 2026: Best Chalk & Contrarian Plays - Fantasy Alarm",
   "publisher": "Fantasy Alarm",
   "published": "Sat, 10 Oct 2026 11:50:41 GMT",
   "as_of_utc": "2026-10-13T21:25:25.047325+00:00",
   "feeds": [
    "google_news_dfs_chalk",
    "google_news_dfs_leverage",
    "google_news_dfs_ownership"
   ],
   "source_urls": [
    "https://news.google.com/rss/articles/CBMi1gFBVV95cUxPZFJGbjlsQkZ3SElIdTA1Z3dyd2ppNEpiWHh6Y1JuTE9LN0lYRjFRVFBXWHRQQmo3djAyTWVrQWpfb2lYVlg1dUgzWVpqMFhqY1ZXanNPdWdnU2xnRGFpbXA5UVRqaVlLR1FfU2g5RHRqa1p5Q0paWVFxUERVNU1JVUlieFg1NFZ2eUh2NWFqU1BkdTRqM2p1VzRSQkF3Nm1rWHhEYmJ1QTNmNF9KLXByZmU0WjEyeFNkWVFRMkpWM09FMWRjRFViT2VMb05lT1A3c2N1U25n?oc=5"
   ],
   "feed_count": 3,
   "dedupe_key": "headline_lower"
  }
 ],
 "leverage_spot": [
  {
   "record_type": "leverage_spot",
   "subject": null,
   "player_match_method": "none",
   "is_roster_player": false,
   "flag": "contrarian_candidate",
   "ownership_pct": null,
   "basis": "public_narrative_keyword",
   "source_type": "public_article",
   "source": "google_news_rss",
   "feed": "google_news_dfs_chalk",
   "source_url": "https://news.google.com/rss/articles/CBMifkFVX3lxTFBRTjZ2cnJqYnowYUxxbjBPVWVQdlBfOVVIYllJbU1ic21DNUZmblVzYUtHalIzY2JDd3IwOEt3QVdvV1N1Qm5XTTFmYWoyd2RReTJKWUNVWUVBQm8tQmk3RWNpeE56dVRWRmItZEFmX1BVWEN4b19EcE1ILUcxQQ?oc=5",
   "headline": "NFL Week 1 DFS First Look: Early Values, Chalk & Leverage - Stokastic",
   "publisher": "Stokastic",
   "published": "Mon, 10 Aug 2026 07:00:00 GMT",
   "as_of_utc": "2026-10-13T21:25:25.047325+00:00",
   "feeds": [
    "google_news_dfs_chalk",
    "google_news_dfs_ownership"
   ],
   "source_urls": [
    "https://news.google.com/rss/articles/CBMifkFVX3lxTFBRTjZ2cnJqYnowYUxxbjBPVWVQdlBfOVVIYllJbU1ic21DNUZmblVzYUtHalIzY2JDd3IwOEt3QVdvV1N1Qm5XTTFmYWoyd2RReTJKWUNVWUVBQm8tQmk3RWNpeE56dVRWRmItZEFmX1BVWEN4b19EcE1ILUcxQQ?oc=5"
   ],
   "feed_count": 2,
   "dedupe_key": "headline_lower"
  },
  {
   "record_type": "leverage_spot",
   "subject": null,
   "player_match_method": "none",
   "is_roster_player": false,
   "flag": "contrarian_candidate",
   "ownership_pct": null,
   "basis": "public_narrative_keyword",
   "source_type": "public_article",
   "s
```

## Request log

```json
[
 {
  "label": "draftkings_robots",
  "url": "https://www.draftkings.com/robots.txt",
  "status": 200,
  "bytes": 357,
  "sha256": "6088db3c6503b639"
 },
 {
  "label": "draftkings_lobby_contests",
  "url": "https://www.draftkings.com/lobby/getcontests?sport=NFL",
  "status": 200,
  "bytes": 4911419,
  "sha256": "05df6d2adb8b154c"
 },
 {
  "label": "google_news_dfs_ownership",
  "url": "https://news.google.com/rss/search?q=%22ownership%22+DFS+NFL&hl=en-US&gl=US&ceid=US:en",
  "status": 200,
  "bytes": 117271,
  "sha256": "093b1c8da543f0a9"
 },
 {
  "label": "google_news_dfs_chalk",
  "url": "https://news.google.com/rss/search?q=NFL+DFS+chalk+plays&hl=en-US&gl=US&ceid=US:en",
  "status": 200,
  "bytes": 102257,
  "sha256": "0b780bb2010d7c10"
 },
 {
  "label": "google_news_dfs_leverage",
  "url": "https://news.google.com/rss/search?q=NFL+DFS+leverage+contrarian&hl=en-US&gl=US&ceid=US:en",
  "status": 200,
  "bytes": 57169,
  "sha256": "b77f0697577bd006"
 },
 {
  "label": "google_news_dfs_stacks",
  "url": "https://news.google.com/rss/search?q=NFL+DFS+stacks+bring-back&hl=en-US&gl=US&ceid=US:en",
  "status": 200,
  "bytes": 103165,
  "sha256": "6eda8a04de13b104"
 }
]
```

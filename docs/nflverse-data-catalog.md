# nflverse data catalog — the free advanced-NFL-data stack

> What it is: nflverse (github.com/nflverse, MIT) publishes the entire modern NFL
> analytics stack as plain release assets (CSV/parquet/gz) on `nflverse-data`.
> It's the same source the R (`nflreadr`) and Python (`nflreadpy`/`nfl_data_py`)
> packages read — we read it **directly from Node, no R, no licence, ~$0**.
> Access verified from this environment (node `fetch` + system CA, and
> `curl --ssl-no-revoke`). Adapter: `packages/data-ingestion/src/nflverse-source.ts`.

## How access works

Every asset is a release download:
`https://github.com/nflverse/nflverse-data/releases/download/<tag>/<file>`

The adapter (`nflverse-source.ts`) holds a typed catalog of the high-value
datasets, builds the URL, fetches, gunzips `.gz` assets, and parses CSV →
records. `fetchNflverse("ngs", 2024, "receiving")` returns rows. Nothing is
wired into live scoring yet — wiring a dataset into the engine is a founder-gated
MODEL_VERSION step (a discovered trend is a hypothesis until it also beats the
close, per `docs/evidence-engine.md`).

## The catalog (25 families on `nflverse-data`, high-value subset detailed)

| Family (tag) | Grain | Since | Unlocks |
| --- | --- | --- | --- |
| **pbp** | play | 1999 | Play-by-play with EPA/WPA/air yards/success rate — the base for true-talent models. |
| **pbp_participation** | play | 2016 | Personnel & defenders-in-box per play — scheme/coverage context. |
| **player_stats** | player-week | 1999 | Weekly usage: targets, receptions, air yards, EPA, attempts. *(QB-age trend source.)* |
| **stats_player / stats_team** | player/team-week | 2018 | Newer combined weekly stat releases. |
| **snap_counts** | player-week | 2012 | Offense/def/ST snap share — the cleanest workload signal. |
| **nextgen_stats** | player-week | 2016 | NGS tracking: separation, cushion, time-to-throw, air yards, speed. *(WR-separation source.)* |
| **pfr_advstats** | player-week | 2018 | PFR advanced: pressures, YAC, broken tackles, ADOT (units: pass/rush/rec/def). |
| **ftn_charting** | play | 2022 | Manual charting: play-action, RPO, screen, motion, box counts. |
| **depth_charts** | player-week | 2001 | Weekly role/starter status. |
| **injuries** | player-week | 2009 | Official injury reports — highest-value non-market factor. |
| **rosters / weekly_rosters** | player | 1920/2002 | Player master + birth_date (age) + `gsis_id` (the universal join key). |
| **players / players_components** | player | all-time | Stable cross-season player identity + bio. |
| **espn_data** | player-week/season | 2006 | ESPN Total QBR — an independent QB-quality estimate. |
| **schedules** | game | 1999 | Game master + results, rest, roof, surface, spread/total. |
| **draft_picks / combine / contracts** | player | all-time | Draft capital, athletic testing, salary — talent/role priors. |
| **officials / teams / trades / misc / test** | misc | — | Refs, team colors, transactions, misc tables. |

The join key across all of them is **`gsis_id`** (player) — rosters give
`gsis_id → birth_date/position/team`, and every player dataset carries it.

## Proven, in two real analyses (see `scripts/analytics/`)

Both run the data through cohort analysis + a Welch significance test
(`packages/prediction-engine/src/trend-discovery.ts`).

1. **A real trend** — `qb-age-rb-target-share.mjs` (player_stats + rosters,
   2016–2024, 4,936 team-weeks): RB share of team targets is **+14.7% (relative)
   when the starting QB is 34+** vs <34 (20.9% vs 18.2%), **z=8.0, p=1.3e-15**,
   concentrated in the 37+ cohort. Larger than the 10–12% a pundit quoted.

2. **A debunked non-trend** — `nflverse-ngs-separation-by-age.mjs` (NGS receiving,
   gzipped premium tracking data fetched live, 2017–2024, 6,934 player-weeks): WR
   average separation is essentially **flat by age** (31+ vs ≤27 = −2.0%,
   **p=0.18, not significant**) — the elite WRs who survive to 31+ don't lose
   separation. The engine refuses the plausible story the data doesn't support.

Finding real trends *and* refusing fake ones is the discipline — the opposite of
a tout that only surfaces flattering cuts.

## What this enables next (founder-gated)

1. **Ingest** the premium families on a schedule (pbp, snap_counts, ngs, injuries,
   pfr_advstats, ftn_charting) into `Player`/`PlayerGameStat` tables — the adapter
   already fetches/parses them.
2. **Nightly trend scan** across feature × metric pairs → a cockpit "Trend Desk"
   with sample size, effect size, p-value, and a "is it still holding?" recency
   check.
3. **Shadow → wire** survivors into scoring only after out-of-sample replication
   *and* demonstrated CLV.

Cost to start: **$0** (nflverse) + compute. The advanced-data moat is one
ingestion schedule away.

# NGS Ground-Truth Map — the legal/data map for GSE Expected Metrics

> Companion to `docs/math/GSE_EXPECTED_METRICS.md`. That doc explains the math;
> this one explains **where the data comes from, under what license, and the hard
> line we do not cross**. It is consistent with the repo's legal posture in the
> root `CLAUDE.md` (Legal Scraping Posture) and the source-rights doctrine in
> `docs/data/`. If this doc and the code disagree, the code
> (`apps/web/lib/nflverse/expected-metrics.ts`) wins.

---

## 1. The source: nflverse-data (open mirror), not the NFL

Every byte the GSE Expected Metrics feature reads comes from the **`nflverse-data`
GitHub release mirror** — the same public release assets that the R (`nflreadr`)
and Python (`nflreadpy` / `nfl_data_py`) packages read. We read them directly
from Node (multi-host failover), no R runtime, no login, no contract, ~$0. This
is the source already classified and adapted in
`packages/data-ingestion/src/nflverse-source.ts` and documented in
`docs/nflverse-data-catalog.md`.

We **never** touch the primary/proprietary origins (see section 7).

## 2. License: CC-BY-4.0 (attribution, no share-alike)

The nflverse data releases used here are published under **Creative Commons
Attribution 4.0 (CC-BY-4.0)**:

- **Attribution required** — we must credit the source. (See the required string
  in section 6; it propagates to every derived output per the CLAUDE.md rule
  "Attribution text from the registry must propagate to all derived outputs.")
- **No share-alike** — CC-BY-4.0 does **not** force us to relicense our own
  computations. Our fitted coefficients, GSE-CPOE/RYOE/xYAC values, provenance,
  and validation reports are **our IP**; only the upstream facts require credit.

**Explicitly excluded: the CC-BY-SA assets.** A subset of nflverse datasets carry
the **share-alike** CC-BY-SA license — notably **`ftn_charting` (FTN)** and the
**participation / `pbp_participation`** feed (which is also on a rights-hold).
Because share-alike would reach into our derived work, **we do not use them here**
and they are **not** in the GSE Expected Metrics inputs. This matches
`docs/STAT_INTAKE_COVERAGE_MATRIX.md` ("the only nflverse data we can't reach are
the CC-BY-SA ones"). The three models read **only** the CC-BY-4.0 play-by-play
and NGS-aggregate assets below.

## 3. The exact assets used

| Role | Asset (path fragment) | Encoding | Read by |
|---|---|---|---|
| Feature source (facts) | `play_by_play_<season>.csv` | plain CSV (`response.text()`, column-projected) | `loadPbp` → `mapPlays` |
| Ground truth — passing | `nextgen_stats/ngs_passing.csv.gz` | **gzipped** CSV (gunzipped in-process) | `fetchNgsGroundTruth("passing", …)` |
| Ground truth — rushing | `nextgen_stats/ngs_rushing.csv.gz` | **gzipped** CSV | `fetchNgsGroundTruth("rushing", …)` |
| Ground truth — receiving | `nextgen_stats/ngs_receiving.csv.gz` | **gzipped** CSV | `fetchNgsGroundTruth("receiving", …)` |

Notes:

- The NGS assets are the **combined all-seasons** files (`ngs_<variant>.csv.gz`),
  not per-season files — the loader filters to the active season in-process. This
  is the currency fix recorded in the execution ledger (DATA3): the per-season
  `ngs_<season>_<variant>.csv.gz` 404s for recent seasons; the combined asset is
  always current.
- Play-by-play is **column-projected** to the ~27 columns the models actually
  read (`PBP_COLUMNS`) so the ~372-column, ~50k-row asset never materializes in
  full (the OOM defense). The full CSV text lives only transiently during the
  parse.
- From NGS we read **exactly one ground-truth column per variant** (section 4)
  plus the keys needed to filter and join. No other NGS column is retained.

## 4. The join key and the ground-truth columns

- **Join key:** the nflverse **`player_gsis_id`** on the NGS side, matched to our
  `PlayerExpectedMetric.playerId` (also a `gsis_id`). This is the universal
  player key across every nflverse dataset — the same key documented in
  `docs/nflverse-data-catalog.md`.
- **Grain filter on the NGS side:** `season_type == "REG"`, `week == 0` (the
  season-aggregate row, not weekly rows), and `season == activeSeason`.
- **The only NGS columns used as ground truth:**

  | Variant | Column | Validates |
  |---|---|---|
  | passing | `completion_percentage_above_expectation` | GSE-CPOE |
  | rushing | `rush_yards_over_expected_per_att` | GSE-RYOE |
  | receiving | `avg_yac_above_expectation` | GSE-xYAC |

## 5. The rule: NGS is the referee, never the product

**This is the load-bearing legal/product invariant.** An NGS value is used
**only** as the y-axis of a validation correlation (`buildCalibrationReport`) and
is **never** copied into a served metric. What we serve is **always our own
computation** (GSE-CPOE/RYOE/xYAC from our fitted models on public play-by-play).

Concretely, in the code:

- `fetchNgsGroundTruth` returns `GroundTruthPoint[]` (`{ playerId, value }`) that
  flow into `buildCalibrationReport` **only**. They never enter
  `ExpectedMetricLeader`, `overExpected`, or any served number.
- The served block (`ExpectedMetricBlock`) exposes `provenance` (our model),
  `leaders` (our values), and a `validation` report **about** the agreement — the
  NGS number appears only inside `report` as an aggregate correlation statistic
  (`truthMean`, `pearson`, etc.), never as a per-player served metric.
- `canPublishProjections` is hardcoded `false`; the feature is historical
  measurement, not a projection or pick.

This keeps us clean on two fronts at once: we are not **re-serving** NGS's
proprietary output (we compute our own), and we are not **relicensing-trapped**
(we only credit CC-BY-4.0 facts; NGS aggregates are used as a measurement
reference, not redistributed as our product).

## 6. Required attribution string

The loader stamps every result (`NflverseExpectedMetrics.attribution`) with:

```
Data from nflverse (nflverse-data), CC-BY-4.0. NGS values used as ground truth only.
```

Per-metric, each `validation.groundTruthSource` also names the exact NGS column
and its license, e.g.:

```
NGS completion_percentage_above_expectation (nflverse, CC-BY-4.0)
NGS rush_yards_over_expected_per_att (nflverse, CC-BY-4.0)
NGS avg_yac_above_expectation (nflverse, CC-BY-4.0)
```

Any surface that renders GSE Expected Metrics **must** propagate this attribution
(CLAUDE.md invariant). Do not strip it.

## 7. The hard line — mirror only, never the primary sources

We use **only the open nflverse mirror**. We do **not**, under any circumstances,
scrape or ingest from the proprietary origins of this data:

- **`nextgenstats.nfl.com` / `nfl.com`** — the NGS product and the NFL's own
  properties. NGS is built on stadium tracking hardware under an exclusive deal
  (NFL · AWS · Zebra · Wilson); the raw feed is a hardware moat we do not touch.
  We consume only the **public aggregates the nflverse mirror already
  republishes**, and only as a validation reference.
- **Pro-Football-Reference (PFR) / Sports Reference** — not scraped here. (Where
  the repo uses PFR advanced stats at all, it is via the nflverse `pfr_advstats`
  mirror, not by scraping PFR.)
- **AWS / Amazon-hosted NGS endpoints** — the tracking backend. Off-limits.

This is consistent with the repo doctrine that PFF / the NGS raw feed / SIS
grades / DVOA are **proprietary moats we build equivalents for, never copy**
(`docs/PROPRIETARY_METRICS_REPRODUCTION_STRATEGY.md`,
`docs/STAT_INTAKE_COVERAGE_MATRIX.md`). GSE Expected Metrics is the "build our
own, prove it against the public aggregate" path — **not** an end-run around the
tracking moat.

### Reminders from the root CLAUDE.md that apply here

- **No evasion.** No CAPTCHA/login/paywall bypass, no proxy rotation to
  circumvent access controls, no fake accounts. nflverse is public,
  logged-off, CC-licensed — none of this is needed and none is done.
- **Facts only.** We extract facts (per-play events, per-player aggregates),
  timestamps, and derived signals we compute. We never extract article bodies,
  proprietary predictions, protected graphics, or account-gated content.
- **Governance in the path.** PBP ingestion runs through `assertIngestible("nflverse")`
  inside `loadPbp`; nflverse is an ingestible, open-licensed source, so the job
  is cleared before it runs.

## 8. One-line summary

We compute **our own** CPOE/RYOE/xYAC from **CC-BY-4.0 nflverse play-by-play**,
credit the source, and use **NGS aggregates (also via the nflverse mirror) purely
as a measurement referee** — never copied into a served number, never scraped
from `nfl.com`/`nextgenstats.nfl.com`/PFR/AWS, never sourced from the CC-BY-SA
(FTN/participation) assets.

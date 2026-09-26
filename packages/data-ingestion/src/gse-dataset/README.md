# GSE dataset — Stage A ingestion, Stage B holdout, Stage C features

A three-stage pipeline over the nflverse game master. Every artifact below was
produced by a real network fetch; **no rows are synthetic, sampled, or
hand-written**. If the fetch had failed, this directory would contain an error
report instead of data.

Formats are **JSONL** (one JSON object per line) and JSON. Parquet is not used:
the available Python runtime has `pandas` but no `pyarrow` and no `fastparquet`,
and adding a dependency is out of scope for this task.

## Source

| | |
|---|---|
| URL | <https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv> |
| Upstream asset | `nflverse-data` release tag `schedules`, file `games.csv` |
| **Fetched at** | **2026-09-26T22:45:28.547Z** |
| HTTP status | 200 |
| Bytes downloaded | 2,180,907 |
| Upstream sha256 | `5ca7e3e0929ca1687f48fc4bc62834f6d2382b53fc1784716fe3d983fb8e39b1` |
| Cached at | `data/gse-dataset/.cache/games.csv` (gitignored; `.cache/` is ignored repo-wide) |
| Source columns | 46 |
| License | nflverse tooling MIT; **data CC-BY-4.0** (attribution required) |

The fetch goes through `noStoreFetch` per CLAUDE.md rule #5, and the byte count
and sha256 recorded in `.cache/games.meta.json` are of the bytes actually
stored, so a later reader can prove which revision of the asset an artifact was
built from. This matters because nflverse has historically renamed and
reshaped release assets, where a rename 404s or a reshape loses columns
*silently* — the reason `scripts/check-nflverse-currency.ts` exists.

## Run order

```bash
# Stage A — fetch, normalize, write games.jsonl
npx tsx packages/data-ingestion/src/gse-dataset/write-jsonl.ts --refresh

# Stage B — split and freeze the forward holdout
npx tsx packages/data-ingestion/src/gse-dataset/holdout.ts

# Stage C — build the feature matrix
npx tsx packages/data-ingestion/src/gse-dataset/features.ts

# Tests (20, including the no-lookahead proof)
npx vitest run --root packages/data-ingestion src/gse-dataset/features.test.ts
```

`--refresh` forces a re-download; without it a cache hit is served, and a cache
hit reports the **original** download time rather than restamping stale bytes as
fresh.

## Artifacts

| Path | Rows | Bytes | sha256 |
|---|---:|---:|---|
| `data/gse-dataset/games.jsonl` | 7,548 | 3,975,137 | `4c5fd1dc0a286eec336a3a2d40b8423318bca9d4fef4676bc28c1253150f1467` |
| `data/gse-dataset/holdout.jsonl` | 285 | 156,642 | `0ca41bbb88ec1f89ddf2cd2cab51ddecc11fd768cc4bda22265847f59135dbbb` |
| `data/gse-dataset/features.jsonl` | 7,548 | 7,690,913 | `fd8ca620fc5d1b67cf150b787a4ff1a49213467d645848f5a5120fdb18c6e465` |
| `data/gse-dataset/holdout.manifest.json` | 78 | 2,520 | `b4c85a4447ff1c24f75ed2c3883ef58b4c94bdf0c575a497f2451d5671f6e102` |

## Real run log — Stage A

```
source        https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv
cache path    ...\data\gse-dataset\.cache\games.csv
http status   200
bytes         2180907
sha256        5ca7e3e0929ca1687f48fc4bc62834f6d2382b53fc1784716fe3d983fb8e39b1
fetched at    2026-09-26T22:45:28.547Z
from cache    false

normalize
columns         29
input rows      7548
kept rows       7548
settled rows    7309
unsettled rows  239
rejected rows   0
seasons         1999..2026 (28 seasons)
  last season   2026: 272 rows
game types      CON=54 DIV=108 REG=7239 SB=27 WC=120

write
output          ...\data\gse-dataset\games.jsonl
rows written    7548
bytes written   3975137
sha256          4c5fd1dc0a286eec336a3a2d40b8423318bca9d4fef4676bc28c1253150f1467
```

7,548 input rows in, 7,548 kept, **0 rejected**. The 239 unsettled rows are real
scheduled-but-unplayed games (season 2026 is in progress); they are marked
`settled: false` with `null` outcomes rather than being dropped or zero-filled.

## `games.jsonl` schema (29 fields)

| Field | Type | Provenance |
|---|---|---|
| `game_id` | string | source `game_id` — primary key |
| `season` | number | source `season` |
| `season_phase` | `"REG" \| "POST"` | derived: `REG` iff `game_type === "REG"` |
| `game_type` | `"REG"\|"WC"\|"DIV"\|"CON"\|"SB"` | source `game_type` (playoff round) |
| `week` | number | source `week` |
| `gameday` | string `YYYY-MM-DD` | source `gameday` |
| `game_time_local` | string \| null | source `gametime`, `HH:MM` **Eastern-local, no timezone published** |
| `away_team` / `home_team` | string | source, trimmed |
| `away_score` / `home_score` | number \| null | source |
| `margin` | number \| null | derived `home_score - away_score` |
| `total_points` | number \| null | derived `home_score + away_score` |
| `home_win` | boolean \| null | derived; `false` on a tie |
| `settled` | boolean | true only when **both** scores are present |
| `overtime` | boolean | source `overtime` |
| `neutral_site` | boolean | derived: `location` is anything other than `Home` |
| `rest_away` / `rest_home` | number \| null | source |
| `rest_diff` | number \| null | derived `rest_home - rest_away` |
| `spread_line`, `total_line`, `away_moneyline`, `home_moneyline` | number \| null | source, **raw** |
| `is_divisional` | boolean | source `div_game` |
| `roof` | string \| null | source, trimmed + lowercased |
| `is_dome` | boolean | derived: `roof` is `dome` or `closed` |
| `surface` | string \| null | source, trimmed + lowercased (the asset has ragged trailing spaces, e.g. `"grass "`) |
| `referee` | string \| null | source |

**Two honesty rules baked into the schema.** `game_time_local` carries **no UTC
instant** — nflverse publishes a bare Eastern-local `HH:MM` with no timezone, and
inventing an offset would silently shift every kickoff. And the market lines are
carried through exactly as published: they are *not* de-vigged and are *not* an
approved model input — wiring the market path into scoring is a founder-gated
`MODEL_VERSION` step.

## Real run log — Stage B

```
rule            season-forward-holdout
train           season < HOLDOUT_SEASON
holdout         season === HOLDOUT_SEASON
holdout season  2025 (most recent season in which every row is settled (resolved from data))
game filter     none

train rows      6991 (seasons 1999..2024, 6991 settled)
holdout rows    285 (seasons 2025..2025, 285 settled)
train teams     35

source          ...\data\gse-dataset\games.jsonl
source rows     7548
source sha256   4c5fd1dc0a286eec336a3a2d40b8423318bca9d4fef4676bc28c1253150f1467
upstream sha256 5ca7e3e0929ca1687f48fc4bc62834f6d2382b53fc1784716fe3d983fb8e39b1
upstream at     2026-09-26T22:45:28.547Z

artifact        ...\data\gse-dataset\holdout.jsonl
artifact rows   285
artifact bytes  156642
artifact sha256 0ca41bbb88ec1f89ddf2cd2cab51ddecc11fd768cc4bda22265847f59135dbbb
```

**The split rule.** By season. `train := season < HOLDOUT_SEASON` (strictly
earlier) and `holdout := season === HOLDOUT_SEASON`, optionally narrowed by a
`game_id` allowlist *inside* the holdout season only. Seasons **after** the
holdout season are excluded from both partitions. 6,991 + 285 = 7,276, and the
272 season-2026 games are in neither — they are in the future relative to the
evaluation window.

`HOLDOUT_SEASON` is resolved from the data as the most recent season in which
**every** row is settled. Season 2026 has 272 rows but only 33 played, so a
holdout drawn from it would be mostly unscoreable and could not gate anything.
The resolved value is written into the manifest, so the artifact stays frozen
even after the data refreshes.

**Reverse-Stein is structurally enforced** (details in `holdout.ts` JSDoc):

1. `TrainRow` and `SealedHoldoutRow` carry a `partition` discriminant and are
   **mutually non-assignable**, so a prior/target function typed
   `readonly TrainRow[]` cannot be handed holdout rows — that is a compile error.
2. The loader never returns holdout rows as data. It returns `unsealHoldout`,
   which requires **both** the founder token **and** `GSE_ALLOW_HOLDOUT_OPEN === "true"`.
3. The loader re-verifies the source sha256 against the manifest and refuses to
   serve a split built from different bytes.

The on-disk `holdout.jsonl` is plain JSONL with real outcomes — an evaluation set
has to have them. This is not encryption; the guarantee is structural at the API
boundary.

## Real run log — Stage C

```
input rows      7548
emitted rows    7548
settled rows    7309
skipped (open)  239
trailing window 8 prior games, strictly earlier gameday
teams           35
with history    7294
no history      254 (first games of a team, or unplayed)

source sha256   4c5fd1dc0a286eec336a3a2d40b8423318bca9d4fef4676bc28c1253150f1467
output          ...\data\gse-dataset\features.jsonl
rows written    7548
bytes written   7690913
sha256          fd8ca620fc5d1b67cf150b787a4ff1a49213467d645848f5a5120fdb18c6e465
```

254 rows have no history: 239 unplayed games plus each team's first appearance.
Re-running produces a byte-identical file, so the builder is deterministic.

### `features.jsonl` schema

Identity and kickoff-knowable context (`game_id`, `season`, `week`, `gameday`,
`season_phase`, `game_type`, `away_team`, `home_team`, `neutral_site`, `is_dome`,
`is_divisional`, `rest_diff`), then the outcome passthrough `settled`,
`home_win`, `margin`, `total_points` — **for labeling only, never an input
feature** — then three feature families:

- **Trailing rolling means** over `TRAILING_WINDOW = 8` prior games:
  `{home,away}_games_prior`, `{home,away}_pts_scored_avg`,
  `{home,away}_pts_allowed_avg`, `{home,away}_margin_avg`.
- **Opponent-adjusted metrics** from the `away_team`/`home_team` pairing:
  `{home,away}_opp_def_strength_avg` (how stingy the defenses actually faced
  were), `{home,away}_opp_off_strength_avg` (how potent the offenses actually
  faced were), and the league-relative `{home,away}_opp_adj_pts_scored` /
  `{home,away}_opp_adj_pts_allowed`. The adjustment terms are themselves built
  from strictly-earlier games, so the adjustment is leak-free at both levels.
- **Phase splits** on the schema's phase column: `{home,away}_games_prior_reg` /
  `_post` with matching scoring means, so a postseason sample is never pooled
  into a 17-game regular-season mean.

### No lookahead

A row's features may use only games whose `gameday` is **strictly less** than
its own. That excludes the row's own outcome (predicting a margin from a margin
is the crudest possible leak) *and* prevents same-day games informing each
other, which an array-position window would allow because a 1pm game sorts
before an 8pm one.

The proof is a perturbation test, not a shape check: scramble a middle day's
outcomes to `999–1`, then assert every strictly earlier row's 24-field feature
block is byte-identical. It also asserts the perturbation *did* move at least one
later row, so the test cannot pass by a feature builder that ignores the data.
This was mutation-checked: relaxing the strict `<` to `<=` in `features.ts`
fails 7 of the 20 tests, including that one.

Thin evidence fails closed — a rolling mean with no prior games is `null`, never
`0`, because zero is a real score. Every mean ships with its own `*_games_prior`
count so a consumer can require a minimum sample.

## Scope

Stage B builds and freezes the split only; **no acceptance gate was evaluated**.
No file under `packages/prediction-engine/src/index.ts`, `odds/`, `markets/`, or
`signals/` was touched, no dependency was added, and nothing was pushed.

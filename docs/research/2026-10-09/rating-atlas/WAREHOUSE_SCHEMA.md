# WAREHOUSE_SCHEMA.md — point-in-time warehouse, Phase 1 (2026-10-10)

Research only. `research.db` is a runtime artifact on this branch's machine
(gitignored); the DDL lives in `warehouse_ingest.py` and nowhere else. No
production schema is touched, no prediction is written, no live trading, no
spend. The only join rule in the warehouse:

**A snapshot row is legal at decision time t iff `observed_at <= t`.**

## Tables (append-only; INSERT OR IGNORE, so re-ingest is safe)

```
line_snapshots   PK (game_id, book, market, observed_at, raw_key)
  game_id TEXT, book TEXT, market TEXT, observed_at TEXT,
  price_home REAL, price_away REAL, line REAL, version INTEGER,
  cutoff_at TEXT, raw_key TEXT, source_file TEXT

prop_snapshots   PK (game_id, book, market, observed_at, raw_key)
  game_id, book, market, observed_at, player, player_id, side, line REAL,
  price_american INTEGER, stat_baseline REAL, raw_key, source_file

injury_snapshots PK (observed_at, book, team, player_id, raw_key)
  observed_at, game_id (NULL — ESPN reports team-level), book, team, player,
  player_id, status, injury_type, return_date, comment, raw_key, source_file
```

`observed_at` is normalized to ISO-8601 UTC seconds (`norm_ts`), so TEXT
comparison equals time comparison. Capture clocks, per book:

- **Pinnacle** (`pinnacle_mkt_*.json`): file mtime, UTC, minute precision.
  The filenames carry no timestamp; mtime is the honest capture clock.
- **DK** (`dk_week6_props_2026-10-09.tsv`): date precision only, from the
  filename (`2026-10-09T23:59:59Z`). Every row in one TSV shares it.
- **PrizePicks** (`prizepicks_nfl_board_2026-10-09.tsv`): the row's own
  `updated` field (offset-local; normalized to UTC).
- **ESPN injuries** (`espn_injuries_*.json`): the per-item `date` field when
  present, else the dump's root `timestamp`.

## Ingest result on the 2026-10-10 pack (measured this session)

Source: `gse_full_transfer_2026-10-10.tar.gz` (Downloads). Command:

```
python3 warehouse_ingest.py all --snapshots-dir <extracted>/snapshots
```

- 14 of 17 Pinnacle trees parsed (3 are 401-flake bodies, the pack's known
  issue; skipped, retry on the next cadence) → **1,717 line rows**, 911
  distinct matchup ids, market types moneyline/spread/total/team_total with
  alternates, lines parsed from the market key.
- DK board: 10,249 parsed → **9,923 stored** (326 exact duplicate rows inside
  the TSV, correctly ignored by the append-only key).
- PrizePicks: 7,615 parsed → **7,615 stored** (raw_key carries line + start).
- ESPN injuries: **800 rows** (32 teams; per-item observed dates span
  2026-09-23 .. 2026-10-10T05:00Z).
- Totals: 1,717 / 17,538 / 800.

## Leakage test — fails closed

`python3 warehouse_ingest.py leaktest` asserts:

1. Synthetic: a row stamped `14:00Z` does NOT join at decision time
   `13:30Z`; it DOES join at `15:00Z`; and after moving the decision time
   earlier to `13:00Z` it does not join. Any post-t join raises.
2. Real pack: injury rows legal at the Sunday cutoff
   (`2026-10-11T13:30Z` from the Pinnacle `cutoffAt`) — 800 join — and the
   decision time moved back to `2026-10-10T02:00:00Z` drops to **766** (the
   34 rows stamped in the last hour before the cutoff vanish). If a post-t
   row ever joined, the test raises and exits nonzero.

Reader API: `rows_at(table, t, db, **eq)` — the WHERE clause enforces
`observed_at <= t`; a caller cannot bypass it without writing its own SQL,
which is the point.

## Gaussian-close CRPS baseline (frozen week list, before any model change)

```
python3 warehouse_ingest.py crps-baseline
```

- Frozen list: season 2025, weeks 1–6, settled, both `spread_line` and
  `total_line` present → **93 games** (`data/gse-dataset/games.jsonl`).
- Definition: CRPS of the Gaussian close (Gneiting closed form), mean over
  the frozen list. No model is involved: μ = the close itself.
  - Margin: μ = −listed (favorite negative), σ = 13.45 ladder → **CRPS 9.5425**
  - Totals: μ = total_line, σ = 13.19 (Pinnacle total sigma from the pack) →
    **CRPS 7.4119**
- The pack's bar of **7.109** is its production definition; this checkout's
  honest reproduction on the frozen list is 7.4119 on totals with σ 13.19.
  Both numbers are recorded; the baseline is now frozen before any model
  change. Model work must beat this, walk-forward, not the bar's definition.

## CLV harvest stub (books_api.py, research-only)

`books_api.py` (extracted from the pack's self-checked source, extended):
`devig_pair` (Shin closed form via `engine_math.shin_devig`, falls back to
multiplicative on sub-1 books), `record_clv_row`, `clv_harvest(mid)`.
Snapshot-only: it records the pre-decision Pinnacle price and the post-kickoff
close, raw AND de-vigged, with the de-vig method stored beside the price. It
never places, sizes, or prices a bet. CLV itself = our locked fair probability
minus the closing fair probability, computed by the reader from the `pre` and
`post` rows of the same (matchup_id, side).

Harvest commands (Pinnacle guest endpoint, keyless; retry ×3 is built in):

```
python3 books_api.py snapshot                        # full slate + injuries
python3 books_api.py harvest 1637432181 --ours-home -110 --ours-away -110   # pre
python3 books_api.py harvest 1637432181 --phase post                        # close
```

Rows append to `snapshots/clv_harvest.jsonl` (gitignored). The pre/post rows
also belong in `line_snapshots` on the next warehouse ingest — same key rule.

## DK sigma table — prop diagnostic (do not replace the close)

Recovered from public DK prices by the pack's band-ladder inversion
(`ladder_inverse.py` in the pack; 442 player-stat μ/σ fits):

| Stat | σ (yards) |
|---|---|
| Pass yards | **70.9** |
| Rec yards | **37.7** |
| Rush yards | **41.7** |
| 1H pass / rec / rush | **51 / 26 / 22** |

Also recovered: Pinnacle total σ 13.19 (vs the stack's 13.45 ladder), Pinnacle
spread σ 10.62, holds 4.01% / 3.69%.

**Edge diagnostic rule:** our μ vs the DK-recovered μ_hat differing by more
than 0.4 σ is a FLAG, not a pick. It says the market disagrees with us enough
to look again; it never emits a bet and never replaces the close. The DK
sigma values are diagnostics of how the book prices its own distribution —
they are not written into production scoring.

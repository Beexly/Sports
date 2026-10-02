# clausherther/nfl-dbt — Dossier

**Stars:** 24 (verified 2026-10-02) · **Language:** Python (loader) + dbt SQL · **Pushed:** 2023-12-26 (stale) · **Created:** 2019-12-14

## 1. Vision
dbt models that turn raw nflverse play-by-play into clean analytical marts: `dates`, `games`, `players`, `plays` (all seasons 1999→current in one table), `teams`, `teams_players`, plus transformed aggregates `xa_field_goals` (with kick angle) and `xa_fourth_downs` for specialty modeling.

## 2. The Ask
BigQuery with a `raw` dataset pre-loaded via the included `extract_load` script, dbt profile config. Explicitly warns data is best-effort (free volunteer resource), so it's positioned for teaching/model-building, not weekly betting decisions.

## 3. Constraints
- **License: Apache-2.0** — commercial-friendly, patent grant included.
- Stale since Dec 2023; BigQuery-only load path (Snowflake/Redshift listed as "future work" that never happened). DuckDB-era alternatives (see fantasy-football-ai's dbt-duckdb medallion at $0/month) have lapped it.
- Fix notes mention deduplicated plays and patched player_ids — known upstream data warts it works around.

## 4. GSE lens
Exposes a **warehouse-architecture gap**: GSE computes things (tau tables, parquets on a branch) but has no analytical layer between raw data and model code — no bronze/silver/gold, no dedupe contracts, no "one plays table across all seasons" mart. clausherther's `plays` model is a trivial example of the thing GSE lacks: a single curated grain that every downstream consumer reads instead of each script re-joining raw files. The repo is stale and BigQuery-bound, so the pattern is the prize, not the code — and the modern $0 instantiation is fantasy-football-ai's dbt-duckdb medallion, not this.

## 5. Verdict
**REBUILD** — Rebuild the *mart pattern* (one curated plays table, one players table, team-season crosswalk) in dbt-duckdb or equivalent. Don't adopt; it's stale and warehouse-bound.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/clausherther/nfl-dbt
- Gitdiagram: https://gitdiagram.com/clausherther/nfl-dbt
- Star history (24 stars): https://star-history.com/#clausherther/nfl-dbt
- github.dev: https://github.dev/clausherther/nfl-dbt

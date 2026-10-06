# Provenance: data loading + metric-bible filters.
# Implements: docs/props/research/2026-09-17/props-consensus/our-metric-stack.md
# (garbage-time removal 4Q WP>0.95/<0.05; kneel/spike exclusion; dropback =
# pass attempt OR scramble; sacks count as attempts).
# Extends: qb-behavioral-profiles/code/compute_metrics.py loading loop.
"""Load nflverse pbp parquet and apply the metric-bible filters.

The data lives in ~/workspace/qb-behavioral-profiles/data/ (imported, not
duplicated). This module owns the filter definitions so c02's split layer
gets identically-filtered frames via ProfileEngine.get_dropback_frame().
"""
from __future__ import annotations

import os
from typing import Iterable

import polars as pl

DEFAULT_DATA_DIR = os.path.expanduser("~/workspace/qb-behavioral-profiles/data")

# Metric-bible filter constants
GARBAGE_WP_HIGH = 0.95
GARBAGE_WP_LOW = 0.05
MIN_DROPBACKS = 100  # pipeline hard minimum for a qualifying season

# Columns the engine + c02 situational splits need. Everything else (notably
# the free-text `desc` column — the memory hog) is pruned at read time.
# c02 can extend via ProfileEngine(extra_columns=[...]).
ENGINE_COLUMNS = [
    # identity / ordering / teams
    "game_id", "week", "qtr", "game_seconds_remaining",
    "passer_player_id", "passer_player_name",
    "rusher_player_id", "rusher_player_name",
    "receiver_player_id", "receiver_player_name",
    "posteam", "defteam", "home_team", "away_team",
    # play-type flags
    "qb_dropback", "pass_attempt", "rush_attempt",
    "qb_scramble", "qb_kneel", "qb_spike",
    "complete_pass", "incomplete_pass", "interception",
    "sack", "qb_hit", "touchdown", "pass_touchdown", "rush_touchdown",
    "fumble", "fumble_lost",
    # measures
    "epa", "wpa", "air_yards", "yards_after_catch", "yards_gained",
    "complete_probability", "expected_points",
    # situation (core + situational-split dimensions)
    "down", "ydstogo", "yardline_100", "score_differential",
    "wp", "vegas_wp", "spread_line", "total_line",
    "shotgun", "no_huddle", "play_type",
    "pass_location", "pass_length", "run_location", "run_gap",
    "goal_to_go", "first_down",
    "roof", "surface", "temp", "wind",
]


def list_seasons(data_dir: str = DEFAULT_DATA_DIR) -> list[int]:
    """Seasons with pbp_<season>.parquet present."""
    seasons = []
    for f in os.listdir(data_dir):
        if f.startswith("pbp_") and f.endswith(".parquet"):
            try:
                seasons.append(int(f.split("_")[1].split(".")[0]))
            except ValueError:
                continue
    return sorted(seasons)


def load_pbp(data_dir: str = DEFAULT_DATA_DIR,
             seasons: Iterable[int] | None = None,
             columns: list[str] | None = None) -> pl.DataFrame:
    """Load and concatenate pbp parquet for the requested seasons.

    Columns are pruned at read time (default ENGINE_COLUMNS) — a full-season
    x 17-season load of all ~300 columns OOMs this VM; the pruned set is
    ~1/6 the width. Missing columns in a season are skipped (not an error).
    """
    wanted = columns if columns is not None else ENGINE_COLUMNS
    seasons = list(seasons) if seasons is not None else list_seasons(data_dir)
    frames = []
    for s in seasons:
        p = os.path.join(data_dir, f"pbp_{s}.parquet")
        if os.path.exists(p):
            schema = pl.read_parquet_schema(p)
            cols = [c for c in wanted if c in schema]
            frames.append(pl.read_parquet(p, columns=cols)
                          .with_columns(pl.lit(s).alias("season")))
    if not frames:
        raise FileNotFoundError(f"no pbp parquet found in {data_dir}")
    # Seasons disagree on some column dtypes (e.g. goal_to_go Int32 vs
    # Float64); diagonal_relaxed coerces to a common supertype.
    return pl.concat(frames, how="diagonal_relaxed")


def is_garbage_time(wp: float | None, qtr: int | None) -> bool:
    """4th-quarter plays with possession-team WP > 0.95 or < 0.05.

    Pure function for unit tests; the frame version below vectorizes it.
    """
    if wp is None or qtr is None:
        return False
    return qtr == 4 and (wp > GARBAGE_WP_HIGH or wp < GARBAGE_WP_LOW)


def apply_metric_bible_filters(df: pl.DataFrame) -> pl.DataFrame:
    """Apply the house filter conventions. Returns a filtered frame.

    - garbage time removed (11.2% of 2025 plays per the bible)
    - kneels and spikes excluded
    - passer id backfilled on scrambles; rows without a passer dropped
    """
    out = df
    if "wp" in out.columns and "qtr" in out.columns:
        out = out.filter(
            ~((pl.col("qtr") == 4) &
              ((pl.col("wp") > GARBAGE_WP_HIGH) | (pl.col("wp") < GARBAGE_WP_LOW)))
        )
    for col in ("qb_kneel", "qb_spike"):
        if col in out.columns:
            out = out.filter(pl.col(col).fill_null(0) == 0)
    if "passer_player_id" in out.columns:
        # nflfastR leaves passer_player_id null on scrambles; the rusher is the QB.
        # Vectorized (matches the original pipeline); the row-wise pure function
        # backfill_scramble_passer() is unit-tested separately.
        if "qb_scramble" in out.columns and "rusher_player_id" in out.columns:
            out = out.with_columns(
                pl.when(pl.col("passer_player_id").is_null() &
                        (pl.col("qb_scramble").fill_null(0) == 1))
                  .then(pl.col("rusher_player_id"))
                  .otherwise(pl.col("passer_player_id")).alias("passer_player_id"))
        out = out.filter(pl.col("passer_player_id").is_not_null())
    return out


def dropback_frame(df: pl.DataFrame) -> pl.DataFrame:
    """QB dropbacks: qb_dropback == 1 on the filtered frame."""
    if "qb_dropback" not in df.columns:
        raise KeyError("qb_dropback column missing")
    return df.filter(pl.col("qb_dropback") == 1)


def with_game_script(df: pl.DataFrame) -> pl.DataFrame:
    """Add leading/tied/trailing from score_differential."""
    return df.with_columns(
        pl.when(pl.col("score_differential") > 0).then(pl.lit("leading"))
          .when(pl.col("score_differential") < 0).then(pl.lit("trailing"))
          .otherwise(pl.lit("tied")).alias("script"))

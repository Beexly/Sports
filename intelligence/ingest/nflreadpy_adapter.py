"""nflreadpy adapter for GSE NFL ingestion.

Wraps nflreadpy (nflverse/nflreadpy) play-by-play loading in a minimal
adapter that does not modify existing ingestion code.

API note (nflreadpy 0.1.5): ``nflreadpy.load_pbp(seasons)`` loads full
season(s) and returns a Polars DataFrame. It has no week/game filter
parameter, so week filtering is done client-side after the load.
"""

from __future__ import annotations

import math

import nflreadpy

_REQUIRED_COLUMNS = (
    "game_id",
    "play_id",
    "posteam",
    "defteam",
    "down",
    "ydstogo",
    "yards_gained",
    "epa",
    "wp",
)


def _clean(value):
    """Convert NaN floats to None; pass everything else through."""
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def load_game_pbp(season: int, week: int | None = None) -> list[dict]:
    """Load play-by-play rows for one season and (optionally) one week.

    Args:
        season: NFL season year (e.g. 2024), passed to ``nflreadpy.load_pbp``.
        week: NFL week number to keep. If None, returns the whole season.

    Returns:
        List of dicts, one per play, each with exactly the keys
        ``{game_id, play_id, posteam, defteam, down, ydstogo, yards_gained,
        epa, wp}``. Nulls/NaNs from the source are surfaced as ``None``.
        Values are otherwise passed through with their nflreadpy/Polars
        types (e.g. ``play_id``/``down`` are floats, ``game_id`` is str).
    """
    df = nflreadpy.load_pbp(season)
    if week is not None:
        df = df.filter(df["week"] == week)
    df = df.select(list(_REQUIRED_COLUMNS))
    return [{k: _clean(v) for k, v in row.items()} for row in df.to_dicts()]

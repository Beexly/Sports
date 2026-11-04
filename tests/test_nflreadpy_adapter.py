"""Tests for intelligence.ingest.nflreadpy_adapter.

No network: nflreadpy.load_pbp is monkeypatched to return a tiny
in-memory Polars frame.
"""

from __future__ import annotations

import polars as pl

from intelligence.ingest import nflreadpy_adapter as adapter

REQUIRED = {
    "game_id",
    "play_id",
    "posteam",
    "defteam",
    "down",
    "ydstogo",
    "yards_gained",
    "epa",
    "wp",
}


def _fake_df() -> pl.DataFrame:
    return pl.DataFrame(
        {
            "game_id": ["2024_01_ARI_BUF", "2024_01_ARI_BUF", "2024_02_ARI_BUF"],
            "play_id": [1.0, 40.0, 7.0],
            "posteam": [None, "ARI", "BUF"],
            "defteam": [None, "BUF", "ARI"],
            "down": [None, None, 1.0],
            "ydstogo": [0.0, 0.0, 10.0],
            "yards_gained": [None, 0.0, 5.0],
            "epa": [float("nan"), 0.2578, -0.1],
            "wp": [0.4332, 0.4332, 0.51],
            "week": [1, 1, 2],
        }
    )


def test_load_game_pbp_filters_to_week_and_shapes_rows(monkeypatch):
    seen = {}

    def fake_load_pbp(season):
        seen["season"] = season
        return _fake_df()

    monkeypatch.setattr(adapter.nflreadpy, "load_pbp", fake_load_pbp)

    rows = adapter.load_game_pbp(2024, 1)

    assert seen["season"] == 2024
    assert isinstance(rows, list)
    assert len(rows) == 2
    for row in rows:
        assert set(row.keys()) == REQUIRED
    assert rows[0]["game_id"] == "2024_01_ARI_BUF"
    assert rows[1]["posteam"] == "ARI"


def test_load_game_pbp_converts_nan_to_none(monkeypatch):
    monkeypatch.setattr(
        adapter.nflreadpy, "load_pbp", lambda season: _fake_df()
    )

    rows = adapter.load_game_pbp(2024, 1)

    # First fake row has epa=NaN (Polars float NaN) -> adapter emits None.
    assert rows[0]["epa"] is None
    assert rows[0]["down"] is None
    assert rows[0]["yards_gained"] is None
    assert rows[1]["epa"] == 0.2578
    assert rows[1]["wp"] == 0.4332


def test_load_game_pbp_week_without_rows_returns_empty(monkeypatch):
    monkeypatch.setattr(
        adapter.nflreadpy, "load_pbp", lambda season: _fake_df()
    )

    assert adapter.load_game_pbp(2024, 18) == []

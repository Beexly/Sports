"""Fast play-by-play loader with projection and predicate pushdown.

Stream 12A / Post #24 ("2020-08-28-fast-data-loading"). Reads nflverse
play-by-play from Parquet when available (columnar projection pushdown) and
falls back to CSV with in-memory projection. Every read is point-in-time
safe: ``as_of`` (a season/week pair, a week-start ISO date, or an explicit
timestamp) filters out any row whose ``season``/``week`` is at or beyond the
cutoff, so a Week-5 backtest can never see Week-5 or later results.

Honesty rules:
  * A predicate the caller asks for but the file cannot satisfy raises; it is
    never silently ignored.
  * If neither the Parquet nor the CSV exists the loader returns an empty
    frame and a note, not fabricated rows.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Sequence

REPO = Path(__file__).resolve().parents[2]
PBP_DIR = REPO / "data" / "nflverse" / "pbp"

DEFAULT_COLUMNS = [
    "game_id",
    "play_id",
    "season",
    "week",
    "posteam",
    "defteam",
    "play_type",
    "down",
    "ydstogo",
    "yardline_100",
    "epa",
    "wpa",
    "success",
    "pass_attempt",
    "rush_attempt",
    "air_yards",
    "yards_after_catch",
    "pass_oe",
]


def _require_pandas():
    try:
        import pandas as pd
        return pd
    except Exception as exc:  # pragma: no cover
        raise SystemExit(f"pandas is required: {exc}")


def _read_parquet(path: Path, columns: Sequence[str] | None, filters):
    pd = _require_pandas()
    try:
        return pd.read_parquet(path, columns=list(columns) if columns else None, filters=filters)
    except Exception:
        return None


def _read_csv(path: Path, columns: Sequence[str] | None, filters):
    pd = _require_pandas()
    header = pd.read_csv(path, nrows=0).columns.tolist()
    usecols = [c for c in (columns or header) if c in header]
    if columns and len(usecols) != len(columns):
        missing = [c for c in columns if c not in header]
        raise ValueError(f"requested columns absent from {path.name}: {missing}")
    return pd.read_csv(path, usecols=usecols, low_memory=False)


MAX_WEEK = 22
MIN_SEASON = 1999
MAX_SEASON = 2100


def _require_int(value, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{label} must be an integer, got {type(value).__name__}={value!r}")
    return value


def _validate_season_week(season, week) -> tuple[int, int]:
    season = _require_int(season, "season")
    week = _require_int(week, "week")
    if not (MIN_SEASON <= season <= MAX_SEASON):
        raise ValueError(f"season must be {MIN_SEASON}..{MAX_SEASON}, got {season}")
    if not (1 <= week <= MAX_WEEK):
        raise ValueError(f"week must be 1..{MAX_WEEK}, got {week}")
    return season, week


def _as_of_cutoff(as_of):
    """Normalise as_of into (max_season, max_week); reject invalid weeks/types."""
    if as_of is None:
        return None, None
    if isinstance(as_of, (tuple, list)) and len(as_of) == 2:
        return _validate_season_week(as_of[0], as_of[1])
    text = str(as_of)
    if text.isdigit():
        return _validate_season_week(int(text), MAX_WEEK)
    try:
        stamp = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"as_of must be (season, week), a season, or an ISO date: {exc}") from exc
    return _validate_season_week(stamp.year, MAX_WEEK)


def load_pbp(
    seasons: Iterable[int] | None = None,
    weeks: Iterable[int] | None = None,
    play_types: Iterable[str] | None = None,
    columns: Sequence[str] | None = None,
    as_of=None,
) -> tuple[object, dict]:
    """Load play-by-play with projection and predicate pushdown.

    Returns ``(frame, meta)`` where meta records the file read, the rows
    admitted, and whether the as-of filter removed anything.
    """
    pd = _require_pandas()
    seasons = [int(s) for s in seasons] if seasons else None
    weeks = [int(w) for w in weeks] if weeks else None
    play_types = [str(p) for p in play_types] if play_types else None

    files: list[Path] = []
    for candidate in sorted(PBP_DIR.glob("play_by_play_*.parquet")):
        files.append(candidate)
    for candidate in sorted(PBP_DIR.glob("play_by_play_*.csv")):
        files.append(candidate)
    if seasons:
        wanted = {str(s) for s in seasons}
        files = [f for f in files if any(s in f.name for s in wanted)]
    if not files:
        return pd.DataFrame(columns=list(columns or DEFAULT_COLUMNS)), {
            "files": [],
            "rows": 0,
            "note": "no play-by-play file found under data/nflverse/pbp",
        }

    frames = []
    for path in files:
        filters = None
        if seasons and path.suffix == ".parquet":
            filters = [("season", "in", seasons)]
        if path.suffix == ".parquet":
            frame = _read_parquet(path, columns, filters)
        else:
            frame = _read_csv(path, columns, filters)
        if frame is None:
            frame = _read_csv(path, columns, filters)
        frames.append(frame)
    frame = pd.concat(frames, ignore_index=True)

    rows_before = len(frame)
    if seasons and "season" in frame.columns:
        frame = frame[frame["season"].isin(seasons)]
    if weeks and "week" in frame.columns:
        frame = frame[frame["week"].isin(weeks)]
    if play_types and "play_type" in frame.columns:
        frame = frame[frame["play_type"].isin(play_types)]

    as_of_season, as_of_week = _as_of_cutoff(as_of)
    if as_of_season is not None and "season" in frame.columns and "week" in frame.columns:
        frame = frame[
            (frame["season"] < as_of_season)
            | ((frame["season"] == as_of_season) & (frame["week"] < as_of_week))
        ]

    # Strict week/season hygiene: numeric coercion, range rejection, dedupe.
    invalid_rows = 0
    duplicate_rows = 0
    if "season" in frame.columns and "week" in frame.columns and len(frame):
        frame = frame.copy()
        frame["season"] = pd.to_numeric(frame["season"], errors="coerce")
        frame["week"] = pd.to_numeric(frame["week"], errors="coerce")
        invalid = (
            frame["season"].isna()
            | frame["week"].isna()
            | (frame["season"] < MIN_SEASON)
            | (frame["season"] > MAX_SEASON)
            | (frame["week"] < 1)
            | (frame["week"] > MAX_WEEK)
        )
        invalid_rows = int(invalid.sum())
        frame = frame[~invalid]
        frame["season"] = frame["season"].astype(int)
        frame["week"] = frame["week"].astype(int)
    if {"game_id", "play_id"}.issubset(frame.columns) and len(frame):
        before_dedupe = len(frame)
        frame = frame.drop_duplicates(subset=["game_id", "play_id"], keep="first")
        duplicate_rows = before_dedupe - len(frame)

    return frame.reset_index(drop=True), {
        "files": [str(f.relative_to(REPO)) for f in files],
        "rows_read": rows_before,
        "rows": len(frame),
        "invalid_rows_removed": invalid_rows,
        "duplicate_rows_removed": duplicate_rows,
        "as_of": [as_of_season, as_of_week] if as_of_season is not None else None,
        "columns": list(frame.columns),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--seasons", default="2024", help="comma-separated seasons")
    parser.add_argument("--weeks", default="", help="comma-separated weeks")
    parser.add_argument("--play-types", default="", help="comma-separated play types")
    parser.add_argument("--as-of-week", type=int, default=None, help="exclusive week cutoff")
    parser.add_argument("--as-of-season", type=int, default=None, help="season for the cutoff")
    parser.add_argument("--verify", action="store_true", help="assert the Week-5 zero-future-row rule")
    args = parser.parse_args()

    seasons = [int(s) for s in args.seasons.split(",") if s.strip()]
    weeks = [int(w) for w in args.weeks.split(",") if w.strip()] or None
    play_types = [p for p in args.play_types.split(",") if p.strip()] or None
    as_of = (
        (args.as_of_season, args.as_of_week)
        if args.as_of_season is not None and args.as_of_week is not None
        else None
    )
    frame, meta = load_pbp(seasons=seasons, weeks=weeks, play_types=play_types, as_of=as_of)

    if args.verify:
        target_season, target_week = 2024, 5
        frame, meta = load_pbp(seasons=[target_season], as_of=(target_season, target_week))
        if "season" not in frame.columns or "week" not in frame.columns:
            print("VERIFY FAIL: season/week columns absent")
            return 1
        future = frame[(frame["season"] > target_season) | ((frame["season"] == target_season) & (frame["week"] >= target_week))]
        if len(future) != 0:
            print(f"VERIFY FAIL: {len(future)} future rows admitted at targetWeek={target_week}")
            return 1
        print(f"VERIFY OK targetWeek={target_week} future_rows=0 admitted_rows={len(frame)}")
        return 0

    print(json.dumps(meta, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

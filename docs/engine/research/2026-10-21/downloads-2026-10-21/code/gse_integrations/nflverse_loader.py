"""
nflverse historical feature loader.

Uses nfl_data_py (or nflreadpy) when available; falls back to a documented
schema so the rest of the plane can depend on it without a hard install.

Additive. Honesty-noted. Does not overwrite existing NGS or play-by-play stores.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

OUTPUT = Path("artifacts/gse_integrations/nflverse")
OUTPUT.mkdir(parents=True, exist_ok=True)


@dataclass
class PlayRow:
    game_id: str
    play_id: int
    posteam: str | None
    defteam: str | None
    down: int | None
    ydstogo: int | None
    yardline_100: int | None
    play_type: str | None
    epa: float | None
    wpa: float | None
    success: int | None
    passer_player_id: str | None
    receiver_player_id: str | None
    rusher_player_id: str | None
    extra: dict[str, Any] = field(default_factory=dict)


def _try_import():
    try:
        import nfl_data_py as nfl  # type: ignore
        return nfl
    except ImportError:
        return None


def load_pbp(seasons: list[int], columns: list[str] | None = None) -> list[PlayRow]:
    """Load play-by-play. Returns empty list + honesty note if library missing."""
    nfl = _try_import()
    if nfl is None:
        note = {
            "source": "nflverse",
            "status": "library_missing",
            "honesty": "nfl_data_py not installed; returning empty. pip install nfl_data_py",
            "seasons": seasons,
            "rows": 0,
        }
        (OUTPUT / "load_status.json").write_text(json.dumps(note, indent=2))
        return []

    cols = columns or [
        "game_id", "play_id", "posteam", "defteam", "down", "ydstogo",
        "yardline_100", "play_type", "epa", "wpa", "success",
        "passer_player_id", "receiver_player_id", "rusher_player_id",
    ]
    df = nfl.import_pbp_data(seasons, columns=cols, downcast=True)
    rows: list[PlayRow] = []
    for rec in df.to_dict(orient="records"):
        rows.append(
            PlayRow(
                game_id=str(rec.get("game_id", "")),
                play_id=int(rec.get("play_id", 0)),
                posteam=rec.get("posteam"),
                defteam=rec.get("defteam"),
                down=rec.get("down"),
                ydstogo=rec.get("ydstogo"),
                yardline_100=rec.get("yardline_100"),
                play_type=rec.get("play_type"),
                epa=rec.get("epa"),
                wpa=rec.get("wpa"),
                success=rec.get("success"),
                passer_player_id=rec.get("passer_player_id"),
                receiver_player_id=rec.get("receiver_player_id"),
                rusher_player_id=rec.get("rusher_player_id"),
            )
        )
    meta = {
        "source": "nflverse",
        "status": "ok",
        "honesty": "loaded via nfl_data_py",
        "seasons": seasons,
        "rows": len(rows),
        "loaded_at": datetime.now(timezone.utc).isoformat(),
    }
    (OUTPUT / "load_status.json").write_text(json.dumps(meta, indent=2))
    return rows


def summarize_by_team(rows: list[PlayRow]) -> dict[str, Any]:
    """Simple EPA / success summary for feature-store handoff."""
    from collections import defaultdict
    agg: dict[str, dict[str, float]] = defaultdict(lambda: {"plays": 0, "epa": 0.0, "success": 0})
    for r in rows:
        if not r.posteam or r.epa is None:
            continue
        a = agg[r.posteam]
        a["plays"] += 1
        a["epa"] += r.epa
        if r.success:
            a["success"] += 1
    out = {
        team: {
            "plays": v["plays"],
            "epa_per_play": v["epa"] / v["plays"] if v["plays"] else None,
            "success_rate": v["success"] / v["plays"] if v["plays"] else None,
        }
        for team, v in agg.items()
    }
    (OUTPUT / "team_summary.json").write_text(json.dumps(out, indent=2))
    return out


if __name__ == "__main__":
    rows = load_pbp([2024, 2025])
    print(f"rows={len(rows)}")
    if rows:
        print(summarize_by_team(rows))

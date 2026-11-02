#!/usr/bin/env python3
"""Parse a pregame ownership pack into data/dfs/week_{week}_ownership_leverage.json.

Wired by run_full_dk_bitemporal_gpp.build_slate_dataframe. Missing feed is a
logged gap, not an invented ownership column.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

SCHEMA_KEYS = (
    "player_id",
    "player_name",
    "team",
    "pos",
    "salary",
    "proj_ownership_pct",
    "ownership_tier",
    "fragility_score",
    "injury_status",
    "leverage_tag",
)


def _tier(own: float) -> str:
    if own >= 20.0:
        return "CHALK"
    if own >= 12.0:
        return "CORE"
    if own >= 6.0:
        return "LEVERAGE"
    return "PUNT"


def parse_ownership_records(path: str | Path) -> list[dict[str, Any]]:
    src = Path(path)
    if src.suffix.lower() == ".json":
        payload = json.loads(src.read_text(encoding="utf-8"))
        rows = payload["players"] if isinstance(payload, dict) else payload
    else:
        with src.open(encoding="utf-8-sig", newline="") as fh:
            rows = list(csv.DictReader(fh))
    out = []
    for row in rows:
        own = float(row.get("proj_ownership_pct", row.get("ownership_pct", 0.0)))
        rec = {
            "player_id": str(row.get("player_id", row.get("id", ""))),
            "player_name": str(row.get("player_name", row.get("name", ""))),
            "team": str(row.get("team", "")),
            "pos": str(row.get("pos", row.get("position", ""))),
            "salary": int(float(row.get("salary", 0) or 0)),
            "proj_ownership_pct": own,
            "ownership_tier": str(row.get("ownership_tier") or _tier(own)),
            "fragility_score": float(row.get("fragility_score", 0.0) or 0.0),
            "injury_status": str(row.get("injury_status", row.get("status", "")) or ""),
            "leverage_tag": str(row.get("leverage_tag", "") or ""),
        }
        missing = [k for k in SCHEMA_KEYS if k not in rec]
        if missing:
            raise ValueError(f"ownership record missing {missing}")
        out.append(rec)
    return out


def write_week_ownership(week: int, records: list[dict[str, Any]], repo_root: str | Path) -> Path:
    dest = Path(repo_root) / "data" / "dfs" / f"week_{int(week)}_ownership_leverage.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps({"week": int(week), "players": records}, indent=2), encoding="utf-8")
    return dest


def load_week_ownership(week: int, repo_root: str | Path) -> list[dict[str, Any]]:
    dest = Path(repo_root) / "data" / "dfs" / f"week_{int(week)}_ownership_leverage.json"
    if not dest.is_file():
        return []
    payload = json.loads(dest.read_text(encoding="utf-8"))
    return list(payload.get("players", []))


def ingest(source: str | Path, week: int, repo_root: str | Path) -> Path:
    return write_week_ownership(week, parse_ownership_records(source), repo_root)

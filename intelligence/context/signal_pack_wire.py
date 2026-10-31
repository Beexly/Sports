"""Signal-pack observations for DataContext and reason_game (2026-10-30).

Wires the 7 verified CSV tables in docs/research/2026-10-30/signal-pack/outputs/
into the intelligence layer as named observations, following the tau_wire pattern.
Supports both the canonical outputs filenames (01_red_zone_xtd_share.csv ..
07_paired_flip_leverage.csv) and the signal1..signal7 alias filenames.
"""
from __future__ import annotations

import csv
import os
from pathlib import Path
from typing import Any

ENV_VAR = "GSE_SIGNAL_PACK_DIR"

DEFAULT_SIGNAL_PACK_DIR = str(
    Path(__file__).resolve().parents[2]
    / "docs"
    / "research"
    / "2026-10-30"
    / "signal-pack"
    / "outputs"
)

SIGNAL_SPECS: tuple[dict[str, Any], ...] = (
    {
        "key": "signal_pack.redzone_proe",
        "canonical_key": "signal_pack.red_zone_xtd_share",
        "files": ("01_red_zone_xtd_share.csv", "signal1_redzone_proe.csv"),
        "team_cols": ("defense", "team", "posteam"),
        "description": "Red-zone expected TD share allowed by position (@KoalatyStats method)",
    },
    {
        "key": "signal_pack.st_hidden_yards",
        "canonical_key": "signal_pack.missed_tackles_by_defense",
        "files": ("02_missed_tackles_by_defense.csv", "signal2_st_hidden_yards.csv"),
        "team_cols": ("team", "defense", "team_pfr"),
        "description": "Missed tackles by defense / hidden yards (@sfdata9ers / @PattonAnalytics method)",
    },
    {
        "key": "signal_pack.qb_pressure_escape",
        "canonical_key": "signal_pack.qb_throwaway_rate",
        "files": ("03_qb_throwaway_rate.csv", "signal3_qb_pressure_escape.csv"),
        "team_cols": ("team", "posteam", "qb"),
        "description": "QB throwaway rate & pressure self-preservation (@sfdata9ers PFR method)",
    },
    {
        "key": "signal_pack.neutral_pace",
        "canonical_key": "signal_pack.rb_rushing_epa",
        "files": ("04_rb_rushing_epa.csv", "signal4_SituationNeutralPace.csv"),
        "team_cols": ("team", "posteam"),
        "description": "RB rushing EPA/attempt & success rate (@boxscorescout method)",
    },
    {
        "key": "signal_pack.penalty_discipline",
        "canonical_key": "signal_pack.big_plays_vs_success",
        "files": ("05_big_plays_vs_success.csv", "signal5_penalty_discipline.csv"),
        "team_cols": ("team", "posteam"),
        "description": "Offense identity quadrant: big plays vs success rate (@ghatz_28 method)",
    },
    {
        "key": "signal_pack.wr_cb_archetype",
        "canonical_key": "signal_pack.defensive_epa_by_quarter",
        "files": ("06_defensive_epa_by_quarter.csv", "signal6_wr_cb_archetype.csv"),
        "team_cols": ("defense", "team", "defteam"),
        "description": "Defensive EPA/play by quarter Q1-Q4 (@sfdata9ers method)",
    },
    {
        "key": "signal_pack.def_havoc_rate",
        "canonical_key": "signal_pack.paired_flip_leverage",
        "files": ("07_paired_flip_leverage.csv", "signal7_def_HavocRate.csv"),
        "team_cols": ("team", "defense", "config"),
        "description": "Paired-flip playoff leverage vs naive dynamic-filter (@Timo_NFL method)",
    },
)

SIGNAL_PACK_KEYS: tuple[str, ...] = tuple(s["key"] for s in SIGNAL_SPECS)

_TEAM_ALIASES: dict[str, tuple[str, ...]] = {
    "LA": ("LA", "LAR"),
    "LAR": ("LAR", "LA"),
    "WAS": ("WAS", "WSH"),
    "WSH": ("WSH", "WAS"),
    "JAC": ("JAC", "JAX"),
    "JAX": ("JAX", "JAC"),
}


def _coerce_value(v: Any) -> Any:
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return v
    s = str(v).strip()
    try:
        if "." not in s and "e" not in s.lower():
            return int(s)
        return float(s)
    except ValueError:
        return s


def _read_csv_rows(path: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with open(path, newline="", encoding="utf-8") as fh:
        for raw in csv.DictReader(fh):
            rows.append({k: _coerce_value(v) for k, v in raw.items()})
    return rows


def _match_team_rows(
    rows: list[dict[str, Any]],
    team: str | None,
    team_cols: tuple[str, ...],
) -> list[dict[str, Any]]:
    if not team:
        return []
    targets = _TEAM_ALIASES.get(team.upper(), (team.upper(),))
    matched: list[dict[str, Any]] = []
    for r in rows:
        for col in team_cols:
            val = r.get(col)
            if val is not None and str(val).strip().upper() in targets:
                matched.append(r)
                break
    return matched


def signal_pack_dir() -> str:
    return os.environ.get(ENV_VAR) or DEFAULT_SIGNAL_PACK_DIR


def load_signal_pack(
    home: str | None = None,
    away: str | None = None,
    base_dir: str | None = None,
) -> tuple[dict[str, dict[str, Any]], list[str]]:
    """Load all 7 verified signal-pack CSVs and return (observations, gaps).

    Each observation carries the matched rows for `home` and `away` (when team-keyed)
    or the table summary (for QB/config-keyed tables), plus row count and provenance.
    """
    root = base_dir or signal_pack_dir()
    observations: dict[str, dict[str, Any]] = {}
    gaps: list[str] = []

    if not os.path.isdir(root):
        gaps.append(f"signal_pack: directory not found ({root})")
        return observations, gaps

    for spec in SIGNAL_SPECS:
        resolved_path: str | None = None
        resolved_name: str | None = None
        for fname in spec["files"]:
            candidate = os.path.join(root, fname)
            if os.path.isfile(candidate):
                resolved_path = candidate
                resolved_name = fname
                break
        if resolved_path is None:
            gaps.append(
                f"{spec['key']}: missing CSV ({' or '.join(spec['files'])}) in {root}"
            )
            continue

        rows = _read_csv_rows(resolved_path)
        if not rows:
            gaps.append(f"{spec['key']}: empty CSV ({resolved_name})")
            continue

        home_rows = _match_team_rows(rows, home, spec["team_cols"])
        away_rows = _match_team_rows(rows, away, spec["team_cols"])

        payload: dict[str, Any] = {
            "signal": spec["key"],
            "canonical_signal": spec["canonical_key"],
            "file": resolved_name,
            "description": spec["description"],
            "available": True,
            "table_rows": len(rows),
            "home": home_rows[0] if len(home_rows) == 1 else (home_rows or None),
            "away": away_rows[0] if len(away_rows) == 1 else (away_rows or None),
            "sample": rows[:3],
            "source": "gse_signal_pack (nflverse + PFR verified 2026-10-30)",
            "license": "nflverse CC-BY-4.0 / in-house computation",
            "verification": "COMPUTED",
        }
        observations[spec["key"]] = payload
        observations[spec["canonical_key"]] = payload

    return observations, gaps

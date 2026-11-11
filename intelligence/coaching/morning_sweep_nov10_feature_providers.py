#!/usr/bin/env python3
"""
Nov 10 Morning Sweep 46-CSV Feature Provider (`morning_sweep_nov10_feature_providers.py`)
=========================================================================================
Loads all 46 CSV tables from `docs/data-sources/research/2026-11-10/full-tables/*.csv`
into a typed, zero-waste in-memory feature store for Stage 1 & Stage 2 situational
conditioning:
  - Gridiron Week 9 30-team EPA/play, success rate, drive start, drives end, move-the-chains,
    passer rating, time of possession (`gridiron-*-week9-2026.csv`)
  - Patton Analytics early/late-down EPA, aDOT/CPOE, sacks & scrambles, air vs YAC EPA
    (`patton-*-week9-2026.csv`)
  - Scott Barrett YPRR top-16, ESPN consensus vs EPA/DB, McDaniels slot WR FPG (`barrett-*.csv`)
  - SumerSports SumerStar cards (`sumersports-sumerstar-cards-2026.csv`)
  - Statyx Data Lab WR EPA/target top-10 & RB splits (`statyx-*.csv`)
  - DataInPlay QB EPA, DT run stops, special teams EPA, Rams w/wo Nacua (`datainplay-*.csv`)
"""

from __future__ import annotations

import csv
import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
NOV10_TABLES_DIR = REPO_ROOT / "docs" / "data-sources" / "research" / "2026-11-10" / "full-tables"


@dataclass(frozen=True)
class Nov10CsvTableMeta:
    filename: str
    row_count: int
    columns: tuple[str, ...]
    sha256: str
    rows: tuple[dict[str, str], ...]


class MorningSweepNov10FeatureProvider:
    """Typed feature provider over the 46 Nov 10 morning-sweep CSV tables."""

    def __init__(self, tables_dir: Path = NOV10_TABLES_DIR) -> None:
        self.tables_dir = Path(tables_dir)
        self.tables: dict[str, Nov10CsvTableMeta] = {}
        self._load_all()

    def _load_all(self) -> None:
        if not self.tables_dir.is_dir():
            raise FileNotFoundError(f"Nov 10 CSV directory not found: {self.tables_dir}")
        for csv_path in sorted(self.tables_dir.glob("*.csv")):
            raw_bytes = csv_path.read_bytes()
            digest = hashlib.sha256(raw_bytes).hexdigest()
            text = raw_bytes.decode("utf-8", errors="replace")
            reader = csv.DictReader(text.splitlines())
            cols = tuple(reader.fieldnames or ())
            rows = tuple(dict(r) for r in reader)
            self.tables[csv_path.name] = Nov10CsvTableMeta(
                filename=csv_path.name,
                row_count=len(rows),
                columns=cols,
                sha256=digest,
                rows=rows,
            )

    @property
    def table_count(self) -> int:
        return len(self.tables)

    @property
    def total_rows(self) -> int:
        return sum(t.row_count for t in self.tables.values())

    def get_table_rows(self, filename: str) -> tuple[dict[str, str], ...]:
        if filename not in self.tables:
            raise KeyError(f"Nov 10 CSV table not found: {filename}")
        return self.tables[filename].rows

    def get_team_week9_efficiency_overlay(self, team_abbr: str) -> dict[str, Any]:
        """Return Week 9 Gridiron & DataInPlay team efficiency priors for Stage 2 conditioning."""
        team_norm = team_abbr.upper().strip()
        if team_norm == "WSH":
            aliases = {"WSH", "WAS"}
        elif team_norm == "WAS":
            aliases = {"WAS", "WSH"}
        elif team_norm == "LAR":
            aliases = {"LAR", "LA"}
        else:
            aliases = {team_norm}

        out: dict[str, Any] = {"team": team_norm, "sources_matched": []}
        lookup_files = (
            "gridiron-offensive-epa-week9-2026.csv",
            "gridiron-defensive-epa-week9-2026.csv",
            "gridiron-offensive-success-rate-week9-2026.csv",
            "gridiron-drives-end-week9-2026.csv",
            "gridiron-drive-start-week9-2026.csv",
            "gridiron-move-chains-week9-2026.csv",
            "datainplay-special-teams-epa-2026.csv",
        )
        for fname in lookup_files:
            meta = self.tables.get(fname)
            if not meta:
                continue
            for row in meta.rows:
                row_team = str(row.get("team") or row.get("Team") or row.get("tm") or "").upper().strip()
                if row_team in aliases:
                    out[fname.replace(".csv", "")] = row
                    out["sources_matched"].append(fname)
                    break
        return out

    def summary(self) -> dict[str, Any]:
        return {
            "tables_dir": str(self.tables_dir.relative_to(REPO_ROOT)),
            "table_count": self.table_count,
            "total_rows": self.total_rows,
            "sample_tables": [
                {
                    "filename": m.filename,
                    "row_count": m.row_count,
                    "columns": list(m.columns),
                    "sha256": m.sha256[:16],
                }
                for m in list(self.tables.values())[:8]
            ],
        }


if __name__ == "__main__":
    provider = MorningSweepNov10FeatureProvider()
    print(
        f"[morning_sweep_nov10_feature_providers] OK — loaded {provider.table_count} CSV tables "
        f"({provider.total_rows} data rows) from {provider.tables_dir}"
    )

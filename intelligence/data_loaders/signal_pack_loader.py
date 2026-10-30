#!/usr/bin/env python3
"""
intelligence/data_loaders/signal_pack_loader.py — Loader for the 7-table nflverse signal pack
(`docs/research/2026-10-30/signal-pack/outputs/*.csv`) and the 30 X-analytics sweep full tables
(`docs/research/2026-09-23/full-tables/*.csv` [13 CSVs] + `docs/dfs/research/2026-09-27/full-tables/*.csv` [17 CSVs])
already on disk (OVERNIGHT-ROLLUP §5).

Exposes:
  - `load_signal_pack_and_full_tables(repo_root)`
  - `TIMO_PAIRED_FLIP_INFLATION_RATIO` (~1.36x from `07_paired_flip_leverage.csv`)
  - `SFDATA9ERS_COMPOSITE_QB_WEIGHTS` (0.30 QBR + 0.20 EPA + 0.15 CPOE + 0.15 SR + 0.10 BadThrow% + 0.10 PSS%)
  - `compute_sfdata9ers_composite_qb_score(...)`
"""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Any, Dict, List

_REPO_ROOT = Path(__file__).resolve().parents[2]

SIGNAL_PACK_7_FILES: tuple[str, ...] = (
    "01_red_zone_xtd_share.csv",
    "02_missed_tackles_by_defense.csv",
    "03_qb_throwaway_rate.csv",
    "04_rb_rushing_epa.csv",
    "05_big_plays_vs_success.csv",
    "06_defensive_epa_by_quarter.csv",
    "07_paired_flip_leverage.csv",
)

SFDATA9ERS_COMPOSITE_QB_WEIGHTS: Dict[str, float] = {
    "qbr": 0.30,
    "epa_per_play": 0.20,
    "cpoe": 0.15,
    "success_rate": 0.15,
    "bad_throw_pct_inv": 0.10,
    "pressure_to_sack_pct_inv": 0.10,
}

TIMO_PAIRED_FLIP_DEFAULT_RATIO: float = 1.3607067279535205


def _read_csv_rows(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return [dict(row) for row in reader]


def compute_sfdata9ers_composite_qb_score(
    qbr_pctile: float,
    epa_pctile: float,
    cpoe_pctile: float,
    sr_pctile: float,
    bad_throw_inv_pctile: float,
    p2s_inv_pctile: float,
) -> float:
    """
    @sfdata9ers composite QB efficiency formula (OVERNIGHT-ROLLUP §2 / §5):
        0.30 * QBR + 0.20 * EPA/play + 0.15 * CPOE + 0.15 * SR
        + 0.10 * (100 - BadThrow%_pctile) + 0.10 * (100 - P2S%_pctile).
    """
    w = SFDATA9ERS_COMPOSITE_QB_WEIGHTS
    return float(
        w["qbr"] * float(qbr_pctile)
        + w["epa_per_play"] * float(epa_pctile)
        + w["cpoe"] * float(cpoe_pctile)
        + w["success_rate"] * float(sr_pctile)
        + w["bad_throw_pct_inv"] * float(bad_throw_inv_pctile)
        + w["pressure_to_sack_pct_inv"] * float(p2s_inv_pctile)
    )


def load_signal_pack_and_full_tables(repo_root: str | Path | None = None) -> Dict[str, object]:
    """
    Load the 7 signal-pack CSV tables (`docs/research/2026-10-30/signal-pack/outputs/`)
    and the 30 full-table CSVs (`docs/research/2026-09-23/full-tables/` [13] +
    `docs/dfs/research/2026-09-27/full-tables/` [17]) directly from disk without scraping.
    """
    root = Path(repo_root) if repo_root is not None else _REPO_ROOT
    sp_dir = root / "docs" / "research" / "2026-10-30" / "signal-pack" / "outputs"
    ft_dir = root / "docs" / "research" / "2026-10-30" / "full-tables"

    signal_pack_tables: Dict[str, List[Dict[str, str]]] = {}
    for fname in SIGNAL_PACK_7_FILES:
        fpath = sp_dir / fname
        if fpath.is_file():
            signal_pack_tables[fname] = _read_csv_rows(fpath)

    full_tables: Dict[str, List[Dict[str, str]]] = {}
    if ft_dir.is_dir():
        for csv_path in sorted(ft_dir.glob("*.csv")):
            full_tables[csv_path.name] = _read_csv_rows(csv_path)

    # Extract Timo 1.36x paired-flip inflation ratio from 07_paired_flip_leverage.csv
    timo_ratio = TIMO_PAIRED_FLIP_DEFAULT_RATIO
    lev_rows = signal_pack_tables.get("07_paired_flip_leverage.csv") or []
    for row in lev_rows:
        if row.get("config") == "contender" and row.get("inflation_ratio"):
            timo_ratio = float(row["inflation_ratio"])
            break

    return {
        "signal_pack_table_count": len(signal_pack_tables),
        "full_tables_csv_count": len(full_tables),
        "signal_pack_tables": signal_pack_tables,
        "full_tables": full_tables,
        "timo_paired_flip_inflation_ratio": timo_ratio,
        "sfdata9ers_composite_qb_weights": dict(SFDATA9ERS_COMPOSITE_QB_WEIGHTS),
    }

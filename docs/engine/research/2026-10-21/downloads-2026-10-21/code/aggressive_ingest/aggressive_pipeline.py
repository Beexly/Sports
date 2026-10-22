"""
Aggressive NFL data ingestion pipeline.
Pulls nflverse PBP, NGS (via nflverse releases), participation, rosters, and more.
Additive, honesty-noted, timestamped. For internal brain only.
"""
from __future__ import annotations
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

OUT = Path("artifacts/aggressive_ingest")
OUT.mkdir(parents=True, exist_ok=True)

def honesty(note: str, rows: int = 0) -> Dict[str, Any]:
    return {
        "ts": datetime.utcnow().isoformat() + "Z",
        "honesty": note,
        "rows": rows,
        "internal_only": True,
    }

def fetch_nflverse_pbp(years: List[int]) -> Dict[str, Any]:
    """Pull play-by-play via nfl_data_py if available."""
    try:
        import nfl_data_py as nfl
        df = nfl.import_pbp_data(years, include_participation=True)
        path = OUT / f"pbp_{min(years)}_{max(years)}.parquet"
        df.to_parquet(path)
        return honesty("nflverse_pbp_via_nfl_data_py", len(df))
    except Exception as e:
        return honesty(f"pbp_unavailable: {type(e).__name__}", 0)

def fetch_ngs_via_nflverse(years: List[int]) -> Dict[str, Any]:
    """Pull Next Gen Stats from nflverse-data releases (public parquet)."""
    results = []
    base = "https://github.com/nflverse/nflverse-data/releases/download/nextgen_stats"
    for stat in ["passing", "receiving", "rushing"]:
        try:
            import pandas as pd
            url = f"{base}/ngs_{stat}.parquet"
            df = pd.read_parquet(url)
            path = OUT / f"ngs_{stat}.parquet"
            df.to_parquet(path)
            results.append(honesty(f"ngs_{stat}_from_nflverse_release", len(df)))
        except Exception as e:
            results.append(honesty(f"ngs_{stat}_failed: {type(e).__name__}", 0))
    return {"ngs": results}

def fetch_rosters(years: List[int]) -> Dict[str, Any]:
    try:
        import nfl_data_py as nfl
        df = nfl.import_seasonal_rosters(years)
        path = OUT / "rosters.parquet"
        df.to_parquet(path)
        return honesty("rosters_via_nfl_data_py", len(df))
    except Exception as e:
        return honesty(f"rosters_unavailable: {type(e).__name__}", 0)

def run_aggressive(years: Optional[List[int]] = None) -> Dict[str, Any]:
    if years is None:
        years = [2024, 2025, 2026]
    report = {
        "started": datetime.utcnow().isoformat() + "Z",
        "years": years,
        "sources": {},
    }
    report["sources"]["pbp"] = fetch_nflverse_pbp(years)
    report["sources"]["ngs"] = fetch_ngs_via_nflverse(years)
    report["sources"]["rosters"] = fetch_rosters(years)
    report["finished"] = datetime.utcnow().isoformat() + "Z"
    out_path = OUT / f"ingest_report_{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}.json"
    out_path.write_text(json.dumps(report, indent=2))
    return report

if __name__ == "__main__":
    print(json.dumps(run_aggressive(), indent=2))

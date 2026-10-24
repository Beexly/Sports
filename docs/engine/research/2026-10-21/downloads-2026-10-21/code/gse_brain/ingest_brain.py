#!/usr/bin/env python3
"""
Aggressive internal brain ingestion.

Pulls every public nflverse and NGS surface we can reach.
Additive timestamped JSON/Parquet-style dumps.
Honesty notes on every source.
Internal learning only — not for redistribution or commercial use.

Sources:
- nflverse PBP, rosters, participation (via direct release URLs)
- NGS statboard, schedule, leaders (nextgenstats.nfl.com/api, Referer + UA)
- FTN charting fields when present in nflverse releases
"""

from __future__ import annotations

import gzip
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

ROOT = Path("artifacts/gse_brain")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
NGS_REFERER = "https://nextgenstats.nfl.com/"


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")


def _get(url: str, headers: dict | None = None, timeout: int = 60) -> tuple[int, bytes]:
    hdrs = {"User-Agent": UA}
    if headers:
        hdrs.update(headers)
    req = Request(url, headers=hdrs)
    with urlopen(req, timeout=timeout) as r:
        return r.status, r.read()


def _save(subdir: str, name: str, payload: Any, honesty: str) -> Path:
    d = ROOT / subdir
    d.mkdir(parents=True, exist_ok=True)
    path = d / f"{name}_{_now()}.json"
    wrapper = {
        "source": name,
        "honesty": honesty,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    }
    path.write_text(json.dumps(wrapper, default=str)[:50_000_000], encoding="utf-8")
    return path


# ---------------------------------------------------------------------------
# nflverse
# ---------------------------------------------------------------------------

NFLVERSE_BASE = "https://github.com/nflverse/nflverse-data/releases/download"


def fetch_nflverse_pbp(season: int = 2024) -> dict[str, Any]:
    url = f"{NFLVERSE_BASE}/pbp/play_by_play_{season}.parquet"
    try:
        status, raw = _get(url)
        # Store metadata only for parquet (binary); note size
        meta = {"url": url, "status": status, "bytes": len(raw), "format": "parquet"}
        path = _save("nflverse", f"pbp_{season}_meta", meta, "binary parquet; metadata only in json")
        # Also try csv.gz for a peek at columns
        csv_url = f"{NFLVERSE_BASE}/pbp/play_by_play_{season}.csv.gz"
        try:
            _, csv_raw = _get(csv_url)
            text = gzip.decompress(csv_raw).decode("utf-8", errors="replace")
            header = text.split("\n", 1)[0]
            cols = header.split(",")
            meta["columns_sample"] = cols[:40]
            meta["column_count"] = len(cols)
            _save("nflverse", f"pbp_{season}_columns", {"columns": cols}, "header from csv.gz")
        except Exception as e:
            meta["csv_error"] = str(e)
        return {"ok": True, "meta": meta, "path": str(path)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def fetch_nflverse_release(kind: str, season: int, ext: str = "parquet") -> dict[str, Any]:
    """Generic nflverse-data release fetcher (metadata + column peek when csv.gz)."""
    url = f"{NFLVERSE_BASE}/{kind}/{kind}_{season}.{ext}"
    # snap_counts and injuries use slightly different naming
    if kind == "snap_counts":
        url = f"{NFLVERSE_BASE}/snap_counts/snap_counts_{season}.{ext}"
    elif kind == "injuries":
        url = f"{NFLVERSE_BASE}/injuries/injuries_{season}.{ext}"
    elif kind == "depth_charts":
        url = f"{NFLVERSE_BASE}/depth_charts/depth_charts_{season}.{ext}"
    elif kind == "participation":
        url = f"{NFLVERSE_BASE}/pbp_participation/pbp_participation_{season}.{ext}"
    try:
        status, raw = _get(url)
        meta = {"url": url, "status": status, "bytes": len(raw), "kind": kind, "season": season}
        path = _save("nflverse", f"{kind}_{season}_meta", meta, f"nflverse {kind}")
        return {"ok": True, "bytes": len(raw), "path": str(path)}
    except Exception as e:
        return {"ok": False, "error": str(e), "url": url}


def fetch_nflverse_rosters(season: int = 2024) -> dict[str, Any]:
    url = f"{NFLVERSE_BASE}/rosters/roster_{season}.parquet"
    try:
        status, raw = _get(url)
        meta = {"url": url, "status": status, "bytes": len(raw)}
        path = _save("nflverse", f"roster_{season}_meta", meta, "parquet metadata")
        return {"ok": True, "path": str(path)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# NGS (nextgenstats.nfl.com/api)
# ---------------------------------------------------------------------------

NGS_BASE = "https://nextgenstats.nfl.com/api"


def fetch_ngs(path: str, name: str) -> dict[str, Any]:
    url = NGS_BASE + path
    headers = {"Referer": NGS_REFERER, "Accept": "application/json"}
    try:
        status, raw = _get(url, headers=headers)
        try:
            data = json.loads(raw.decode("utf-8"))
        except Exception:
            data = {"raw_len": len(raw)}
        path_out = _save("ngs", name, data, "keyless NGS api; Referer+UA")
        rows = 0
        if isinstance(data, dict):
            for k in ("players", "games", "leaders", "stats"):
                if isinstance(data.get(k), list):
                    rows = len(data[k])
                    break
            if rows == 0 and isinstance(data.get("data"), list):
                rows = len(data["data"])
        elif isinstance(data, list):
            rows = len(data)
        return {"ok": True, "status": status, "rows": rows, "path": str(path_out)}
    except Exception as e:
        err = {"ok": False, "error": str(e), "url": url}
        _save("ngs", f"{name}_error", err, "fetch failed")
        return err


def run_all(seasons: list[int] | None = None) -> dict[str, Any]:
    seasons = seasons or [2024, 2025]
    results: dict[str, Any] = {"started": _now(), "nflverse": {}, "ngs": {}}

    for yr in seasons:
        results["nflverse"][f"pbp_{yr}"] = fetch_nflverse_pbp(yr)
        results["nflverse"][f"roster_{yr}"] = fetch_nflverse_rosters(yr)
        for kind in ("snap_counts", "injuries", "depth_charts", "participation"):
            results["nflverse"][f"{kind}_{yr}"] = fetch_nflverse_release(kind, yr)
        time.sleep(0.3)

    # NGS surfaces — corrected query shapes (no week=all on statboard)
    ngs_calls = [
        ("/league/schedule?season=2025", "schedule_2025"),
        ("/league/teams?season=2025", "teams_2025"),
        ("/statboard/passing?season=2025&seasonType=REG", "statboard_passing_2025"),
        ("/statboard/rushing?season=2024&seasonType=REG&week=1", "statboard_rushing_2024w1"),
        ("/statboard/receiving?season=2024&seasonType=REG&week=1", "statboard_receiving_2024w1"),
        ("/live/game/scores?season=2025&seasonType=REG&week=1", "live_scores_2025w1"),
    ]
    for path, name in ngs_calls:
        results["ngs"][name] = fetch_ngs(path, name)
        time.sleep(0.4)

    results["finished"] = _now()
    summary_path = _save("raw", "INGEST_SUMMARY", results, "full run summary")
    results["summary_path"] = str(summary_path)
    return results


if __name__ == "__main__":
    out = run_all()
    print(json.dumps({k: v for k, v in out.items() if k != "nflverse"}, indent=2, default=str)[:4000])
    print("--- nflverse ---")
    print(json.dumps(out.get("nflverse"), indent=2, default=str)[:2000])

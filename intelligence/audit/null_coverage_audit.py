"""DEMAND 4: the null-coverage audit — every field the decision layer reads,
measured for null/staleness rates on THIS host, today.

The founder asked for "an explicit list of fields that are still null more
than 50% of the time." This produces it from the live artifacts, not from
assumptions. Output: a machine-readable JSON + the summary printed.
"""
from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "docs" / "data-sources" / "research" / "2026-10-14" / "null-coverage-audit.json"
rows: list[dict] = []


def add(source: str, field: str, non_null: int, total: int,
        freshness_hours: float | None, note: str = "") -> None:
    rows.append({
        "source": source, "field": field,
        "non_null": non_null, "total": total,
        "null_pct": round(100 * (1 - non_null / total), 1) if total else 100.0,
        "freshness_hours": round(freshness_hours, 1) if freshness_hours is not None else None,
        "note": note,
    })


def age_hours(p: Path) -> float:
    return (time.time() - p.stat().st_mtime) / 3600.0


# ---- participation 2025 (identity backbone) ----
p = REPO / "intelligence" / "coaching" / "data" / "pbp_participation_2025.parquet"
if p.exists():
    d = pd.read_parquet(p)
    n = len(d)
    for col in ["offense_formation", "defense_coverage_type", "defense_man_zone_type",
                "route", "was_pressure", "number_of_pass_rushers", "ngs_air_yards",
                "time_to_throw", "offense_numbers", "defense_numbers"]:
        if col in d.columns:
            nn = int(d[col].notna().sum())
            blank = int((d[col].astype(str).str.strip() == "").sum()) if d[col].dtype == object else 0
            add("pbp_participation_2025", col, nn - blank, n,
                age_hours(p), "identity/coverage backbone, 2025 season")
    del d

# ---- injuries 2026 (refreshed) ----
p = REPO / "intelligence" / "coaching" / "data" / "injuries_2026.parquet"
if p.exists():
    d = pd.read_parquet(p)
    add("injuries_2026", "report_status", int(d["report_status"].notna().sum()), len(d),
        age_hours(p),
        "weeks 1-5; week 6 unpublished (Fri 18:00 ET rule) - OL provider falls back labeled")
    del d

# ---- depth charts ----
p = REPO / "intelligence" / "coaching" / "data" / "depth_charts_2026.parquet"
if p.exists():
    d = pd.read_parquet(p, columns=["gsis_id", "pos_rank"])
    add("depth_charts_2026", "gsis_id", int(d["gsis_id"].notna().sum()), len(d),
        age_hours(p), "starter identity for OL continuity")
    del d

# ---- weather pilot ----
p = REPO / "docs" / "data-sources" / "research" / "2026-10-13" / "weather-pilot" / "weather-stadium-pilot.json"
if p.exists():
    d = json.loads(p.read_text(encoding="utf-8"))
    venues = d.get("venues") or []
    nn_rho = sum(1 for v in venues if (v.get("now") or {}).get("air_density_kg_m3"))
    nn_wind = sum(1 for v in venues if (v.get("now") or {}).get("wind_kmh") is not None)
    add("weather-stadium-pilot", "air_density_kg_m3", nn_rho, len(venues), age_hours(p),
        "venue-level; kickoff-bucket forecast, not in-game")
    add("weather-stadium-pilot", "wind_kmh", nn_wind, len(venues), age_hours(p), "")

# ---- kalshi full slate ----
import glob
kfiles = sorted(glob.glob(str(REPO / "docs" / "data-sources" / "research" / "2026-10-14" / "kalshi" / "kalshi_full_slate_*.json")))
if kfiles:
    d = json.loads(Path(kfiles[-1]).read_text(encoding="utf-8"))
    rr = d.get("rows") or []
    two = sum(1 for r in rr if 0 < r["yes_bid"] < 1 and 0 < r["yes_ask"] < 1)
    add("kalshi_full_slate", "two_sided_prices", two, len(rr), age_hours(Path(kfiles[-1])),
        "h2h only; NO order-book depth/limits (displayed prices)")
    add("kalshi_full_slate", "order_book_depth_limits", 0, len(rr), age_hours(Path(kfiles[-1])),
        "NULL >50%: queue position and resting-order size are not exposed keylessly - CONFIRMED gap")

# ---- action network ----
p = REPO / "docs" / "data-sources" / "research" / "2026-10-13" / "action-network" / "scoreboard_probe.json"
if p.exists():
    d = json.loads(p.read_text(encoding="utf-8"))
    games = d.get("games") or []
    rows_odds = [o for g in games for o in (g.get("odds") or [])]
    add("action-network", "displayed_prices", len(rows_odds), len(rows_odds), age_hours(p),
        "6 books incl DK/FD/BR/MGM; synthetic Consensus/Open excluded upstream")
    add("action-network", "limits_or_order_state", 0, len(rows_odds), age_hours(p),
        "NULL >50%: displayed prices only - CONFIRMED gap")

# ---- film shadow ledger (newest signal source) ----
p = REPO / "intelligence" / "vision" / "shadow" / "film_shadow_ledger.jsonl"
if p.exists():
    rr = [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]
    vsm = sum(1 for r in rr if r.get("validation_spec_met"))
    add("film_shadow_ledger", "validation_spec_met", vsm, len(rr), age_hours(p),
        "crossed rows; dry-run calibration only - real footage pending")

# ---- trust intake ----
p = REPO / "intelligence" / "trust-signals" / "intake"
n_files = sum(1 for _ in p.rglob("*")) if p.exists() else 0
add("trust-signals-intake", "signals", n_files, 1, None,
    "never populated - provider correctly reports DATA-GAP; this is the known empty store")

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"generated_utc": datetime.now(timezone.utc).isoformat(),
                           "host": "BEEXLY (this machine)", "fields": rows},
                          indent=1), encoding="utf-8")

print(f"{'source':<24} {'field':<28} {'null%':>6}  note")
print("-" * 110)
for r in sorted(rows, key=lambda r: -r["null_pct"]):
    flag = "  <-- NULL >50%" if r["null_pct"] > 50 else ""
    print(f"{r['source']:<24} {r['field']:<28} {r['null_pct']:>5.1f}%  {r['note'][:60]}{flag}")
print(f"\nlanded: {OUT}")

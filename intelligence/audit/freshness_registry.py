"""LOOP 5 (freshness): per-field freshness stamps, measured from live artifacts.

Every feature the decision layer reads gets: feature -> event time -> capture
time -> age -> market-relative staleness verdict. Persisted as the freshness
registry the gate consults.
"""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "intelligence" / "audit" / "freshness_registry.json"

# staleness budget per feature family, in hours, at which the consumer must
# downgrade the tier (MEASURED -> STALE) or refuse. Named so drift is visible.
BUDGET_HOURS = {
    "injury_report": 168,        # weekly release cycle; 7 days
    "depth_chart": 336,          # two weeks
    "market_two_sided": 6,       # prices move; half-day max
    "weather_forecast": 72,      # 3-day forecast useful window
    "intent_priors": 2160,       # seasonal priors; 90 days
    "identity_participation": 2160,
}


def _age_hours(p: Path) -> float:
    return (time.time() - p.stat().st_mtime) / 3600.0


def build_registry() -> dict:
    entries = []

    def add(family: str, source: str, path: Path, event_time: datetime | None,
            extra: str = "") -> None:
        age = _age_hours(path)
        budget = BUDGET_HOURS.get(family)
        verdict = ("FRESH" if budget is None or age <= budget else "STALE")
        entries.append({
            "family": family, "source": source,
            "file": str(path.relative_to(REPO)).replace("\\\\", "/"),
            "age_hours": round(age, 1),
            "budget_hours": budget,
            "verdict": verdict,
            "event_time": event_time.isoformat() if event_time else None,
            "note": extra,
        })

    # injuries
    p = REPO / "intelligence" / "coaching" / "data" / "injuries_2026.parquet"
    if p.exists():
        add("injury_report", "nflverse injuries release", p, None,
            "week-5 report; week-6 unpublished - OL provider falls back labeled")
    # depth charts
    p = REPO / "intelligence" / "coaching" / "data" / "depth_charts_2026.parquet"
    if p.exists():
        add("depth_chart", "nflverse depth charts", p, None)
    # kalshi full slate (prices)
    kfiles = sorted((REPO / "docs" / "data-sources" / "research" / "2026-10-14" / "kalshi").glob(
        "kalshi_full_slate_*.json"))
    if kfiles:
        newest = kfiles[-1]
        try:
            d = json.loads(newest.read_text(encoding="utf-8"))
            ev = datetime.fromisoformat(d["generated_utc"])
        except Exception:
            ev = None
        add("market_two_sided", "kalshi events sweep", newest, ev,
            "both sides w/ spread; NO depth/limits (structural)")
    # weather
    p = REPO / "docs" / "data-sources" / "research" / "2026-10-13" / "weather-pilot" / "weather-stadium-pilot.json"
    if p.exists():
        add("weather_forecast", "open-meteo pilot", p, None,
            "venue kickoff-bucket forecast; not in-game telemetry")
    # intent priors
    ifiles = sorted((REPO / "docs" / "data-sources" / "research" / "2026-10-14" / "intent").glob(
        "intent_beliefs_*.json"))
    if ifiles:
        add("intent_priors", "pbp_participation 2025 beliefs", ifiles[-1], None,
            "seasonal prior; updates when nflverse republishes")
    # identity participation
    p = REPO / "intelligence" / "coaching" / "data" / "pbp_participation_2025.parquet"
    if p.exists():
        add("identity_participation", "pbp_participation 2025", p, None,
            "identity backbone; jersey<->gsis per play")
    return {"generated_utc": datetime.now(timezone.utc).isoformat(),
            "budget_hours": BUDGET_HOURS, "entries": entries}


def stale_fields(registry: dict) -> list[str]:
    return [e["source"] for e in registry["entries"] if e["verdict"] == "STALE"]


if __name__ == "__main__":
    reg = build_registry()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(reg, indent=1), encoding="utf-8")
    print(f"{'family':<24} {'age_h':>7} {'budget':>7} verdict  source")
    print("-" * 100)
    for e in reg["entries"]:
        print(f"{e['family']:<24} {e['age_hours']:>7.1f} "
              f"{str(e['budget_hours']):>7} {e['verdict']:<8} {e['source']}")
    print(f"\nlanded: {OUT}")
    print("stale:", stale_fields(reg) or "none")

from __future__ import annotations

import csv
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_nov16_to_18_analytics_sweep_csvs_present() -> None:
    counts = {}
    for date_str in ("2026-11-16", "2026-11-17", "2026-11-18"):
        folder = REPO_ROOT / "docs" / "research" / date_str / "full-tables"
        assert folder.is_dir(), f"Missing sweep directory {folder}"
        counts[date_str] = len(list(folder.glob("*.csv")))
    assert sum(counts.values()) >= 140, f"Expected >= 140 Nov 16-18 CSVs, got {counts}"


def test_week11_injuries_and_espn_slate_synced_for_2026_11_18() -> None:
    inj_csv = REPO_ROOT / "data" / "nflverse" / "injuries_2026.csv"
    with inj_csv.open("r", encoding="utf-8", newline="") as f:
        weeks = {int(row["week"]) for row in csv.DictReader(f) if row.get("week")}
    assert 11 in weeks, f"injuries_2026.csv missing Week 11 rows; found weeks={sorted(weeks)}"

    espn_inj = REPO_ROOT / "data" / "engine" / "espn_nfl_injuries_2026-11-18.json"
    espn_slate = REPO_ROOT / "data" / "engine" / "week11_slate_espn_2026-11-18.json"
    assert espn_inj.is_file(), "Missing espn_nfl_injuries_2026-11-18.json"
    assert espn_slate.is_file(), "Missing week11_slate_espn_2026-11-18.json"

    slate = json.loads(espn_slate.read_text(encoding="utf-8"))
    games = slate.get("games") or slate.get("events") or []
    assert len(games) >= 13, f"Expected >= 13 Week 11 games, found {len(games)}"


def test_stage0_week11_roster_truth_is_fresh_and_publishable() -> None:
    s0_path = REPO_ROOT / "data" / "nflverse" / "stage0_truth_s2026_w11.json"
    cfg = json.loads(s0_path.read_text(encoding="utf-8"))
    assert int(cfg.get("week", 0)) == 11
    as_of = str(cfg.get("as_of") or cfg.get("generated_utc") or cfg.get("generated_at_utc") or "")
    assert "2026-11-18" in as_of or "2026-11-19" in as_of, f"Stale stage0 W11 as_of={as_of}"


def test_cadence_v20_wednesday_advance_produces_publishable_week11_report() -> None:
    from scripts.ops.run_cadence_v20_wednesday_injury_advance import (
        run_wednesday_advance_report,
    )

    report = run_wednesday_advance_report(write_output=False)
    assert int(report["week"]) == 11
    assert report["publishable"] is True
    assert report["invariants_hold"] is True
    assert int(report["slate"]["games"]) >= 13
    assert int(report["baseline_overlap_count"]) >= 13
    assert not report["baseline_defects"]

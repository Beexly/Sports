"""Tests for scripts/dfs/build_week9_dual_slate_dfs_packets.py.

Runs against small synthetic DraftKings-shaped exports written to tmp_path so the
suite stays fast (the real 570-player MILP takes minutes). The real exports are
covered by one skippable smoke test.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]

from scripts.dfs.build_week9_dual_slate_dfs_packets import (  # noqa: E402
    MAIN_SRC,
    TNF_SRC,
    _showdown_roster_ok,
    build_all,
    load_classic_slate,
    load_showdown_slate,
)

HEADER = ["Position", "Name + ID", "Name", "ID", "Roster Position", "Salary",
          "Game Info", "TeamAbbrev", "AvgPointsPerGame", "Status"]


def _write_classic(path: Path, games=3, per_team=6) -> Path:
    rows = []
    pid = 1
    positions = ["QB", "RB", "RB", "WR", "WR", "TE"]
    for g in range(games):
        away, home = f"A{g}", f"B{g}"
        info = f"{away}@{home} 11/08/2026 01:00PM ET"
        for team in (away, home):
            for i, pos in enumerate(positions):
                pid += 1
                rows.append([pos, f"P{pid} ({pid})", f"P{pid}", str(pid),
                             "QB" if pos == "QB" else f"{pos}/FLEX",
                             4000 + 300 * i, info, team, round(8.0 + i * 2.5, 1), ""])
            pid += 1
            rows.append(["DST", f"D{pid} ({pid})", f"D{pid}", str(pid), "DST",
                         3000, info, team, 7.0, ""])
    df = pd.DataFrame(rows, columns=HEADER)
    df.to_csv(path, index=False)
    return path


def _write_showdown(path: Path) -> Path:
    rows = []
    pid = 1
    info = "JAX@BAL 11/05/2026 08:15PM ET"
    positions = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "TE", "K", "DST"]
    for team in ("JAX", "BAL"):
        for i, pos in enumerate(positions):
            base_salary = 3000 + 700 * i
            base_avg = round(6.0 + i * 1.9, 1)
            pid += 1
            rows.append([pos, f"{team}{pos}{i} ({pid})", f"{team}{pos}{i}", str(pid),
                         "CPT", int(base_salary * 1.5), info, team, base_avg, ""])
            pid += 1
            rows.append([pos, f"{team}{pos}{i}F ({pid})", f"{team}{pos}{i}F", str(pid),
                         "FLEX", base_salary, info, team, base_avg, ""])
    df = pd.DataFrame(rows, columns=HEADER)
    df.to_csv(path, index=False)
    return path


@pytest.fixture()
def synthetic_slates(tmp_path):
    classic = _write_classic(tmp_path / "classic.csv")
    showdown = _write_showdown(tmp_path / "showdown.csv")
    return classic, showdown


def test_classic_loader_normalizes_columns(synthetic_slates):
    classic, _ = synthetic_slates
    df = load_classic_slate(classic)
    for col in ("name", "position", "team", "opponent", "game_id", "salary", "projection"):
        assert col in df.columns
    assert df["salary"].min() >= 2000
    assert (df["opponent"] == df["team"]).sum() == 0
    assert set(df["opponent"]).issubset(set(df["team"]))
    assert df["position"].isin({"QB", "RB", "WR", "TE", "DST"}).all()


def test_showdown_loader_marks_cpt_slot(synthetic_slates):
    _, showdown = synthetic_slates
    df = load_showdown_slate(showdown)
    assert set(df["slot"]) == {"CPT", "FLEX"}
    cpt = df[df["slot"] == "CPT"]
    flex = df[df["slot"] == "FLEX"]
    assert len(cpt) == len(flex)
    # DraftKings already prices the 1.5x multiplier into the CPT salary
    merged = cpt.merge(flex, on="name", suffixes=("_cpt", "_flex"))
    merged = merged[merged["name"].str.endswith("F") == False]  # noqa: E712
    if not merged.empty:
        ratio = merged["salary_cpt"] / merged["salary_flex"]
        assert ratio.min() >= 1.49 and ratio.max() <= 1.51


def test_showdown_roster_validator_catches_bad_rosters(synthetic_slates):
    _, showdown = synthetic_slates
    df = load_showdown_slate(showdown)
    lu = pd.concat([df[df["slot"] == "CPT"].head(1), df[df["slot"] == "FLEX"].head(5)])
    ok, why = _showdown_roster_ok(lu)
    assert ok, why

    no_cpt = df[df["slot"] == "FLEX"].head(6)
    ok, why = _showdown_roster_ok(no_cpt)
    assert not ok and "CPT" in why

    expensive = lu.copy()
    expensive["salary"] = 49000
    ok, why = _showdown_roster_ok(expensive)
    assert not ok and "over cap" in why


def test_build_all_writes_packets_and_markdown(synthetic_slates, tmp_path):
    classic, showdown = synthetic_slates
    out_dir = tmp_path / "data_dfs"
    docs_dir = tmp_path / "docs_dfs"
    summary = build_all(
        out_dir=out_dir,
        docs_dir=docs_dir,
        lineups=2,
        sims=40,
        opponents=20,
        seed=7,
        tnf_src=showdown,
        main_src=classic,
    )
    assert "classic" in summary and "showdown" in summary
    for name in (
        "week9_sunday_main_11_game_packet_2026_11_03.json",
        "week9_tnf_showdown_jax_bal_packet_2026_11_03.json",
    ):
        p = out_dir / name
        assert p.exists()
        json.loads(p.read_text(encoding="utf-8"))
    assert (docs_dir / "WEEK-9-SUNDAY-MAIN-SLATE-11-GAME-OPTIMIZER-PACKET.md").exists()
    assert (docs_dir / "WEEK-9-TNF-SHOWDOWN-JAX-BAL-OPTIMIZER-PACKET.md").exists()
    # the source CSVs are archived byte-for-byte
    assert (out_dir / "dk_salaries_week9_main_slate_2026_11_08.csv").read_bytes() == classic.read_bytes()
    assert (out_dir / "dk_salaries_week9_tnf_showdown_jax_bal_2026_11_05.csv").read_bytes() == showdown.read_bytes()


def test_showdown_packet_lineups_are_legal(synthetic_slates, tmp_path):
    classic, showdown = synthetic_slates
    summary = build_all(
        out_dir=tmp_path / "o", docs_dir=tmp_path / "d",
        lineups=2, sims=40, opponents=20, seed=3,
        tnf_src=showdown, main_src=classic,
    )
    packet = json.loads(
        (tmp_path / "o" / "week9_tnf_showdown_jax_bal_packet_2026_11_03.json").read_text(encoding="utf-8")
    )
    assert packet["roster_structure"].startswith("1 CPT")
    assert packet["portfolio_size"] >= 1
    for lu in packet["lineups"]:
        assert len(lu["players"]) == 6
        assert lu["salary"] <= 50000
        assert sum(1 for p in lu["players"] if p["slot"] == "CPT") == 1
        assert len({p["name"] for p in lu["players"]}) == 6
    assert summary["showdown"]["candidates"] > 0


def test_classic_packet_lineups_are_legal(synthetic_slates, tmp_path):
    classic, showdown = synthetic_slates
    build_all(
        out_dir=tmp_path / "o2", docs_dir=tmp_path / "d2",
        lineups=2, sims=40, opponents=20, seed=5,
        tnf_src=showdown, main_src=classic,
    )
    packet = json.loads(
        (tmp_path / "o2" / "week9_sunday_main_11_game_packet_2026_11_03.json").read_text(encoding="utf-8")
    )
    for lu in packet["lineups"]:
        positions = [p["position"] for p in lu["players"]]
        assert len(lu["players"]) == 9
        assert lu["salary"] <= 50000
        assert positions.count("QB") == 1
        assert positions.count("DST") == 1
        assert positions.count("RB") >= 2
        assert positions.count("WR") >= 3
        assert len(set(lu["teams"])) >= 3


def test_build_is_deterministic_for_a_fixed_seed(synthetic_slates, tmp_path):
    classic, showdown = synthetic_slates
    a = build_all(out_dir=tmp_path / "a", docs_dir=tmp_path / "da", lineups=2, sims=40,
                  opponents=20, seed=11, tnf_src=showdown, main_src=classic)
    b = build_all(out_dir=tmp_path / "b", docs_dir=tmp_path / "db", lineups=2, sims=40,
                  opponents=20, seed=11, tnf_src=showdown, main_src=classic)
    pa = json.loads((tmp_path / "a" / "week9_tnf_showdown_jax_bal_packet_2026_11_03.json").read_text(encoding="utf-8"))
    pb = json.loads((tmp_path / "b" / "week9_tnf_showdown_jax_bal_packet_2026_11_03.json").read_text(encoding="utf-8"))
    assert [lu["players"] for lu in pa["lineups"]] == [lu["players"] for lu in pb["lineups"]]
    assert a["showdown"]["win_threshold_p99"] == b["showdown"]["win_threshold_p99"]


@pytest.mark.skipif(
    not (MAIN_SRC.exists() and TNF_SRC.exists()),
    reason="real DraftKings exports not in Downloads",
)
def test_real_exports_are_week9(tmp_path):
    classic = load_classic_slate(MAIN_SRC)
    showdown = load_showdown_slate(TNF_SRC)
    assert len(classic) > 400
    assert classic["game_id"].nunique() == 11
    assert len(showdown) > 80
    assert set(showdown["game_id"]) == {"JAX@BAL"}

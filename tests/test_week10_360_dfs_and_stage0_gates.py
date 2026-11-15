#!/usr/bin/env python3
"""
tests/test_week10_360_dfs_and_stage0_gates.py

Regression & Stage-0 gate test suite for Week 10 DraftKings 5-slate DFS packets
(Seam 4 public contract: `scripts.dfs.build_week10_all_slates_dfs_packets`).
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.dfs.build_week10_all_slates_dfs_packets import (  # noqa: E402
    build_all_week10_slates,
    build_classic_packet,
    build_primetime_showdowns,
    build_showdown_packet,
    load_and_gate_slate_pool,
    sync_dk_draftables_to_csvs,
)
from scripts.ops.solve_showdown_dfs_milp import solve_dk_showdown_milp  # noqa: E402
from scripts.ops.preflight_live_roster_injury_gate import (  # noqa: E402
    assert_lineup_clean,
    require_week,
)

FORBIDDEN_WEEK10_DFS_NAMES = {
    "treveyon henderson",
    "kenneth walker iii",
    "mike evans",
    "kyler murray",
    "deshaun watson",
    "josh jacobs",
    "divine deablo",
    "sam darnold",
    "jake ferguson",
}


def _check_showdown_lineup(lineup: dict, decoys: set[str], cfg: dict, is_cash: bool) -> tuple[str, ...]:
    roster = lineup["roster"]
    assert len(roster) == 6
    cpts = [r for r in roster if r["slot"].startswith("CPT")]
    flexs = [r for r in roster if r["slot"] == "FLEX"]
    assert len(cpts) == 1
    assert len(flexs) == 5
    names = [r["player"] for r in roster]
    assert len(set(names)) == 6
    assert sum(int(r["salary"]) for r in roster) <= 50000
    assert int(lineup["total_salary"]) == sum(int(r["salary"]) for r in roster)
    teams = {r["team"] for r in roster}
    assert len(teams) >= 2
    assert_lineup_clean(names, cfg, {r["player"]: r["team"] for r in roster})
    for r in roster:
        assert r["player"].strip().lower() not in FORBIDDEN_WEEK10_DFS_NAMES
    if is_cash:
        for r in roster:
            assert r["player"].strip().lower() not in decoys, f"Decoy leaked into Cash: {r['player']}"
    else:
        assert cpts[0]["player"].strip().lower() not in decoys, f"Decoy in CPT: {cpts[0]['player']}"
    return tuple(sorted(f"{r['slot']}:{r['player']}" for r in roster))


def test_slice1_munich_ne_det_showdown_stage0_and_stage34_hydration() -> None:
    cfg = require_week(10)
    sync_dk_draftables_to_csvs()

    pool_df, gate_meta = load_and_gate_slate_pool("munich_ne_det")
    assert len(pool_df) >= 12
    pool_names_low = {str(n).strip().lower() for n in pool_df["name"]}
    assert pool_names_low.isdisjoint(FORBIDDEN_WEEK10_DFS_NAMES)
    assert all(p > 0.0 for p in pool_df["median_fpts"])

    dossier = json.loads(
        (REPO_ROOT / "data" / "engine" / "connected_workflow_dossier_ne_det_week10.json").read_text(encoding="utf-8")
    )
    decoys = {k.strip().lower() for k in (dossier["stage3_4_conserved_post_sim_projections"].get("injury_decoy_audit") or {})}

    packet = build_showdown_packet("munich_ne_det", write_outputs=True)
    assert packet["draft_group_id"] == 156422
    assert packet["matchup"] == "NE @ DET"
    assert packet["auto_email_sent"] is False
    assert gate_meta["removed_count"] >= 0

    _check_showdown_lineup(packet["cash_lineup"], decoys, cfg, is_cash=True)

    gpp_lineups = packet["gpp_lineups"]
    assert len(gpp_lineups) == 20
    seen_sigs = set()
    for lu in gpp_lineups:
        seen_sigs.add(_check_showdown_lineup(lu, decoys, cfg, is_cash=False))
    assert len(seen_sigs) == 20

    csv_sal = REPO_ROOT / "data" / "dfs" / "week10_munich_ne_det_dk_salaries.csv"
    csv_up = REPO_ROOT / "data" / "dfs" / "week10_munich_ne_det_dk_upload.csv"
    pkt_json = REPO_ROOT / "data" / "dfs" / "week10_munich_ne_det_showdown_packet.json"
    assert csv_sal.is_file() and csv_up.is_file() and pkt_json.is_file()

    with csv_up.open("r", encoding="utf-8") as fh:
        rows = list(csv.reader(fh))
    assert rows[0][:6] == ["CPT", "FLEX", "FLEX", "FLEX", "FLEX", "FLEX"]
    assert len(rows) >= 21  # header + cash + 20 GPP


def test_slice2_primetime_snf_and_mnf_showdowns_and_decoy_blocks() -> None:
    cfg = require_week(10)
    res = build_primetime_showdowns(write_outputs=True)
    assert set(res.keys()) == {"snf_pit_cin", "mnf_lac_bal"}

    expected = [
        ("snf_pit_cin", 156433, "PIT @ CIN", "pit_cin", "week10_snf_pit_cin_showdown_packet.json", "week10_snf_pit_cin_dk_upload.csv"),
        ("mnf_lac_bal", 156434, "LAC @ BAL", "lac_bal", "week10_mnf_lac_bal_showdown_packet.json", "week10_mnf_lac_bal_dk_upload.csv"),
    ]
    for slate_key, dg_id, matchup, slug, pkt_name, csv_name in expected:
        pkt = res[slate_key]
        assert pkt["draft_group_id"] == dg_id
        assert pkt["matchup"] == matchup
        assert pkt["auto_email_sent"] is False
        dossier = json.loads(
            (REPO_ROOT / "data" / "engine" / f"connected_workflow_dossier_{slug}_week10.json").read_text(encoding="utf-8")
        )
        decoys = {k.strip().lower() for k in (dossier["stage3_4_conserved_post_sim_projections"].get("injury_decoy_audit") or {})}
        _check_showdown_lineup(pkt["cash_lineup"], decoys, cfg, is_cash=True)
        sigs = {_check_showdown_lineup(lu, decoys, cfg, is_cash=False) for lu in pkt["gpp_lineups"]}
        assert len(sigs) == 20
        assert (REPO_ROOT / "data" / "dfs" / pkt_name).is_file()
        assert (REPO_ROOT / "data" / "dfs" / csv_name).is_file()

    # Decoy Cash-block enforcement: synthetic decoy flag on highest-projected player blocks them from Cash
    snf_pool, _ = load_and_gate_slate_pool("snf_pit_cin")
    recs = snf_pool.to_dict(orient="records")
    top_player = max(recs, key=lambda r: float(r["median_fpts"]))
    top_name = top_player["name"]
    for r in recs:
        if r["name"] == top_name:
            r["is_decoy_trap"] = True
            r["block_cash_dfs"] = True
    cash_blocked = solve_dk_showdown_milp(recs, mode="cash", salary_cap=50000, min_salary=42000)
    assert top_name not in {r["player"] for r in cash_blocked["roster"]}


def _check_classic_lineup(lineup: dict, decoys: set[str], cfg: dict, is_cash: bool) -> tuple[str, ...]:
    roster = lineup["roster"]
    assert len(roster) == 9
    slots = [r["slot"] for r in roster]
    assert sorted(slots) == sorted(["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "DST"])
    pos_counts: dict[str, int] = {}
    for r in roster:
        pos_counts[r["pos"]] = pos_counts.get(r["pos"], 0) + 1
    assert pos_counts.get("QB", 0) == 1
    assert 2 <= pos_counts.get("RB", 0) <= 3
    assert 3 <= pos_counts.get("WR", 0) <= 4
    assert pos_counts.get("TE", 0) == 1
    assert pos_counts.get("DST", 0) == 1

    names = [r["player"] for r in roster]
    assert len(set(names)) == 9
    tot_sal = sum(int(r["salary"]) for r in roster)
    assert 48000 <= tot_sal <= 50000
    assert int(lineup["total_salary"]) == tot_sal
    assert len({r["team"] for r in roster}) >= 3
    assert_lineup_clean(names, cfg, {r["player"]: r["team"] for r in roster})
    for r in roster:
        assert r["player"].strip().lower() not in FORBIDDEN_WEEK10_DFS_NAMES
    if is_cash:
        for r in roster:
            assert r["player"].strip().lower() not in decoys, f"Decoy leaked into Cash: {r['player']}"
    return tuple(sorted(names))


def _load_decoys_for_games(games: list[tuple[str, str]]) -> set[str]:
    decoys: set[str] = set()
    for away, home in games:
        dp = REPO_ROOT / "data" / "engine" / f"connected_workflow_dossier_{away.lower()}_{home.lower()}_week10.json"
        d = json.loads(dp.read_text(encoding="utf-8"))
        decoys |= {k.strip().lower() for k in (d["stage3_4_conserved_post_sim_projections"].get("injury_decoy_audit") or {})}
    return decoys


def test_slice3_classic_main_and_sun_mon_14core_and_markdown_packet() -> None:
    import re

    cfg = require_week(10)
    main_games = [
        ("BUF", "NYJ"), ("CAR", "NO"), ("HOU", "CLE"), ("JAX", "TEN"),
        ("KC", "ATL"), ("LAR", "ARI"), ("MIA", "IND"), ("MIN", "GB"),
        ("SEA", "LV"), ("SF", "DAL"),
    ]
    main_decoys = _load_decoys_for_games(main_games)
    main_pkt = build_classic_packet("sun_main_classic", write_outputs=True)
    assert main_pkt["draft_group_id"] == 156416
    assert main_pkt["auto_email_sent"] is False
    _check_classic_lineup(main_pkt["cash_lineup"], main_decoys, cfg, is_cash=True)
    main_gpp = main_pkt["gpp_lineups"]
    assert len(main_gpp) == 20
    assert len({_check_classic_lineup(lu, main_decoys, cfg, is_cash=False) for lu in main_gpp}) == 20

    main_csv = REPO_ROOT / "data" / "dfs" / "week10_sun_main_classic_dk_upload.csv"
    assert main_csv.is_file()
    with main_csv.open("r", encoding="utf-8") as fh:
        rows = list(csv.reader(fh))
    assert rows[0][:9] == ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "DST"]
    assert len(rows) >= 21

    exp_decoys = _load_decoys_for_games([*main_games, ("PIT", "CIN"), ("LAC", "BAL")])
    exp_pkt = build_classic_packet("sun_mon_expanded", include_14_core=True, write_outputs=True)
    assert exp_pkt["draft_group_id"] == 156418
    assert exp_pkt["auto_email_sent"] is False
    _check_classic_lineup(exp_pkt["cash_lineup"], exp_decoys, cfg, is_cash=True)
    assert len(exp_pkt["gpp_lineups"]) == 20
    assert len({_check_classic_lineup(lu, exp_decoys, cfg, is_cash=False) for lu in exp_pkt["gpp_lineups"]}) == 20

    core = exp_pkt["expanded_14_player_core"]
    assert len(core) == 14
    assert len({r["player"] for r in core}) == 14
    core_pos: dict[str, int] = {}
    for r in core:
        assert r["player"].strip().lower() not in FORBIDDEN_WEEK10_DFS_NAMES
        assert r["player"].strip().lower() not in exp_decoys
        core_pos[r["pos"]] = core_pos.get(r["pos"], 0) + 1
    assert_lineup_clean([r["player"] for r in core], cfg, {r["player"]: r["team"] for r in core})
    assert core_pos == {"QB": 2, "RB": 4, "WR": 4, "TE": 2, "DST": 2}

    all_res = build_all_week10_slates()
    assert set(all_res.keys()) == {
        "munich_ne_det",
        "sun_main_classic",
        "sun_mon_expanded",
        "snf_pit_cin",
        "mnf_lac_bal",
    }
    for pkt in all_res.values():
        assert pkt["auto_email_sent"] is False

    md_path = REPO_ROOT / "docs" / "dfs" / "research" / "2026-11-15" / "week10-munich-main-primetime-dfs-packet.md"
    assert md_path.is_file()
    md_text = md_path.read_text(encoding="utf-8")
    assert all(ord(c) <= 127 for c in md_text)
    for banned in (
        "JEV", "Sinkhorn", "Cholesky", "10,000 worlds", "1,750,000", "22,750,000",
        "Romano", "tau_hat", "Optimal Transport", "62-23-1", "31-11", "14-6",
        "57.0%", "66.0%", "67.8%",
    ):
        assert banned not in md_text, f"Banned phrase in DFS markdown: {banned}"
    assert not re.search(r"\b\d{1,3}%\s*conf", md_text, re.I)
    assert "auto_email_sent: False" in md_text or "auto_email_sent: false" in md_text.lower()

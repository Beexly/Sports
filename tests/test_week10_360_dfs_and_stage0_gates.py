#!/usr/bin/env python3
"""
tests/test_week10_360_dfs_and_stage0_gates.py

Regression & Stage-0 gate test suite for Week 10 DraftKings 5-slate DFS packets
(Seam 4 public contract: `scripts.dfs.build_week10_all_slates_dfs_packets`).
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
from datetime import date
from pathlib import Path

import pytest

TEST_TODAY = date(2026, 11, 15)

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.dfs.build_week9_dual_slate_dfs_packets import _norm_player_key  # noqa: E402
from scripts.dfs.build_week10_all_slates_dfs_packets import (  # noqa: E402
    _dk_fpts_from_dossier_record,
    build_all_week10_slates,
    build_classic_packet,
    build_primetime_showdowns,
    build_showdown_packet,
    extract_active_decoy_keys,
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
            assert _norm_player_key(r["player"]) not in decoys, f"Decoy leaked into Cash: {r['player']}"
    else:
        assert _norm_player_key(cpts[0]["player"]) not in decoys, f"Decoy in CPT: {cpts[0]['player']}"
    return tuple(sorted(f"{r['slot']}:{r['player']}" for r in roster))


def test_slice1_munich_ne_det_showdown_stage0_and_stage34_hydration(tmp_path: Path) -> None:
    cfg = require_week(10, today=TEST_TODAY)
    sync_dk_draftables_to_csvs(dfs_dir=tmp_path)

    pool_df, gate_meta = load_and_gate_slate_pool("munich_ne_det", today=TEST_TODAY, dfs_dir=tmp_path)
    assert len(pool_df) >= 12
    pool_names_low = {str(n).strip().lower() for n in pool_df["name"]}
    assert pool_names_low.isdisjoint(FORBIDDEN_WEEK10_DFS_NAMES)
    assert all(p > 0.0 for p in pool_df["median_fpts"])

    dossier_path = REPO_ROOT / "data" / "engine" / "connected_workflow_dossier_ne_det_week10.json"
    dossier = json.loads(dossier_path.read_text(encoding="utf-8"))
    expected_sha = str(
        dossier.get("master_bundle_sha256")
        or dossier.get("bundle_sha256")
        or hashlib.sha256(dossier_path.read_bytes()).hexdigest()
    )
    decoys = extract_active_decoy_keys(dossier["stage3_4_conserved_post_sim_projections"].get("injury_decoy_audit"))

    packet = build_showdown_packet("munich_ne_det", write_outputs=True, today=TEST_TODAY, output_dir=tmp_path)
    assert packet["draft_group_id"] == 156422
    assert packet["matchup"] == "NE @ DET"
    assert packet["auto_email_sent"] is False
    assert len(packet["master_bundle_sha256"]) == 64
    assert packet["master_bundle_sha256"] == expected_sha
    assert packet["dossier_provenance"]["NE@DET"]["master_bundle_sha256"] == expected_sha
    assert gate_meta["removed_count"] >= 0

    _check_showdown_lineup(packet["cash_lineup"], decoys, cfg, is_cash=True)

    gpp_lineups = packet["gpp_lineups"]
    assert len(gpp_lineups) == 20
    seen_sigs = set()
    for lu in gpp_lineups:
        seen_sigs.add(_check_showdown_lineup(lu, decoys, cfg, is_cash=False))
    assert len(seen_sigs) == 20

    csv_sal = tmp_path / "week10_munich_ne_det_dk_salaries.csv"
    csv_up = tmp_path / "week10_munich_ne_det_dk_upload.csv"
    pkt_json = tmp_path / "week10_munich_ne_det_showdown_packet.json"
    assert csv_sal.is_file() and csv_up.is_file() and pkt_json.is_file()

    with csv_up.open("r", encoding="utf-8") as fh:
        rows = list(csv.reader(fh))
    assert rows[0][:6] == ["CPT", "FLEX", "FLEX", "FLEX", "FLEX", "FLEX"]
    assert len(rows) >= 21  # header + cash + 20 GPP


def test_slice2_primetime_snf_and_mnf_showdowns_and_decoy_blocks(tmp_path: Path) -> None:
    cfg = require_week(10, today=TEST_TODAY)
    sync_dk_draftables_to_csvs(dfs_dir=tmp_path)
    res = build_primetime_showdowns(write_outputs=True, today=TEST_TODAY, output_dir=tmp_path)
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
        assert len(pkt["master_bundle_sha256"]) == 64
        assert len(pkt["dossier_provenance"]) == 1
        dossier_path = REPO_ROOT / "data" / "engine" / f"connected_workflow_dossier_{slug}_week10.json"
        dossier = json.loads(dossier_path.read_text(encoding="utf-8"))
        expected_sha = str(
            dossier.get("master_bundle_sha256")
            or dossier.get("bundle_sha256")
            or hashlib.sha256(dossier_path.read_bytes()).hexdigest()
        )
        assert pkt["master_bundle_sha256"] == expected_sha
        decoys = extract_active_decoy_keys(dossier["stage3_4_conserved_post_sim_projections"].get("injury_decoy_audit"))
        _check_showdown_lineup(pkt["cash_lineup"], decoys, cfg, is_cash=True)
        sigs = {_check_showdown_lineup(lu, decoys, cfg, is_cash=False) for lu in pkt["gpp_lineups"]}
        assert len(sigs) == 20
        assert (tmp_path / pkt_name).is_file()
        assert (tmp_path / csv_name).is_file()

    # Decoy Cash-block enforcement: synthetic decoy flag on highest-projected player blocks them from Cash
    snf_pool, _ = load_and_gate_slate_pool("snf_pit_cin", today=TEST_TODAY, dfs_dir=tmp_path)
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
            assert _norm_player_key(r["player"]) not in decoys, f"Decoy leaked into Cash: {r['player']}"
    return tuple(sorted(names))


def _load_decoys_for_games(games: list[tuple[str, str]]) -> set[str]:
    decoys: set[str] = set()
    for away, home in games:
        dp = REPO_ROOT / "data" / "engine" / f"connected_workflow_dossier_{away.lower()}_{home.lower()}_week10.json"
        d = json.loads(dp.read_text(encoding="utf-8"))
        decoys |= extract_active_decoy_keys(d["stage3_4_conserved_post_sim_projections"].get("injury_decoy_audit"))
    return decoys


def test_slice3_classic_main_and_sun_mon_14core_and_markdown_packet(tmp_path: Path) -> None:
    cfg = require_week(10, today=TEST_TODAY)
    sync_dk_draftables_to_csvs(dfs_dir=tmp_path)
    main_games = [
        ("BUF", "NYJ"), ("CAR", "NO"), ("HOU", "CLE"), ("JAX", "TEN"),
        ("KC", "ATL"), ("LAR", "ARI"), ("MIA", "IND"), ("MIN", "GB"),
        ("SEA", "LV"), ("SF", "DAL"),
    ]
    main_decoys = _load_decoys_for_games(main_games)
    main_pkt = build_classic_packet("sun_main_classic", write_outputs=True, today=TEST_TODAY, output_dir=tmp_path)
    assert main_pkt["draft_group_id"] == 156416
    assert main_pkt["auto_email_sent"] is False
    assert len(main_pkt["master_bundle_sha256"]) == 64
    assert len(main_pkt["dossier_provenance"]) == 10
    _check_classic_lineup(main_pkt["cash_lineup"], main_decoys, cfg, is_cash=True)
    main_gpp = main_pkt["gpp_lineups"]
    assert len(main_gpp) == 20
    assert len({_check_classic_lineup(lu, main_decoys, cfg, is_cash=False) for lu in main_gpp}) == 20

    main_csv = tmp_path / "week10_sun_main_classic_dk_upload.csv"
    assert main_csv.is_file()
    with main_csv.open("r", encoding="utf-8") as fh:
        rows = list(csv.reader(fh))
    assert rows[0][:9] == ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "DST"]
    assert len(rows) >= 21

    exp_decoys = _load_decoys_for_games([*main_games, ("PIT", "CIN"), ("LAC", "BAL")])
    exp_pkt = build_classic_packet("sun_mon_expanded", include_14_core=True, write_outputs=True, today=TEST_TODAY, output_dir=tmp_path)
    assert exp_pkt["draft_group_id"] == 156418
    assert exp_pkt["auto_email_sent"] is False
    assert len(exp_pkt["master_bundle_sha256"]) == 64
    assert len(exp_pkt["dossier_provenance"]) == 12
    _check_classic_lineup(exp_pkt["cash_lineup"], exp_decoys, cfg, is_cash=True)
    assert len(exp_pkt["gpp_lineups"]) == 20
    assert len({_check_classic_lineup(lu, exp_decoys, cfg, is_cash=False) for lu in exp_pkt["gpp_lineups"]}) == 20

    core = exp_pkt["expanded_14_player_core"]
    assert len(core) == 14
    assert len({r["player"] for r in core}) == 14
    core_pos: dict[str, int] = {}
    for r in core:
        assert r["player"].strip().lower() not in FORBIDDEN_WEEK10_DFS_NAMES
        assert _norm_player_key(r["player"]) not in exp_decoys
        core_pos[r["pos"]] = core_pos.get(r["pos"], 0) + 1
    assert_lineup_clean([r["player"] for r in core], cfg, {r["player"]: r["team"] for r in core})
    assert core_pos == {"QB": 2, "RB": 4, "WR": 4, "TE": 2, "DST": 2}

    test_md_path = tmp_path / "week10-munich-main-primetime-dfs-packet.md"
    all_res = build_all_week10_slates(today=TEST_TODAY, output_dir=tmp_path, docs_md_path=test_md_path)
    assert set(all_res.keys()) == {
        "munich_ne_det",
        "sun_main_classic",
        "sun_mon_expanded",
        "snf_pit_cin",
        "mnf_lac_bal",
    }
    for pkt in all_res.values():
        assert pkt["auto_email_sent"] is False
        assert len(pkt["master_bundle_sha256"]) == 64
        for matchup_key, meta in pkt["dossier_provenance"].items():
            dp = REPO_ROOT / meta["dossier_file"]
            assert dp.is_file(), f"Missing provenance dossier {dp} for {matchup_key}"
            dp_bytes = dp.read_bytes()
            d_obj = json.loads(dp_bytes.decode("utf-8"))
            disk_sha = str(d_obj.get("master_bundle_sha256") or "")
            file_sha = hashlib.sha256(dp_bytes).hexdigest()
            assert len(disk_sha) == 64
            assert meta["master_bundle_sha256"] == disk_sha
            assert len(str(meta.get("dossier_file_sha256") or "")) == 64
            assert meta["dossier_file_sha256"] == file_sha

    assert test_md_path.is_file()
    md_text = test_md_path.read_text(encoding="utf-8")
    assert all(ord(c) <= 127 for c in md_text)
    for banned in (
        "JEV", "Sinkhorn", "Cholesky", "10,000 worlds", "1,750,000", "22,750,000",
        "Romano", "tau_hat", "Optimal Transport", "62-23-1", "31-11", "14-6",
        "57.0%", "66.0%", "67.8%",
    ):
        assert banned not in md_text, f"Banned phrase in DFS markdown: {banned}"
    assert not re.search(r"\b\d{1,3}%\s*conf", md_text, re.I)
    assert "auto_email_sent: False" in md_text or "auto_email_sent: false" in md_text.lower()


_WEEK10_MATCHUPS: tuple[tuple[str, str], ...] = (
    ("NE", "DET"), ("MIA", "IND"), ("HOU", "CLE"), ("MIN", "GB"),
    ("CAR", "NO"), ("JAX", "TEN"), ("KC", "ATL"), ("BUF", "NYJ"),
    ("LAR", "ARI"), ("SEA", "LV"), ("SF", "DAL"), ("PIT", "CIN"),
    ("LAC", "BAL"),
)

_WEEK10_DFS_SLATE_SPECS: dict[str, tuple[str, str, str]] = {
    "munich_ne_det": ("SHOWDOWN", "week10_munich_ne_det_showdown_packet.json", "week10_munich_ne_det_dk_upload.csv"),
    "sun_main_classic": ("CLASSIC", "week10_sun_main_classic_packet.json", "week10_sun_main_classic_dk_upload.csv"),
    "sun_mon_expanded": ("CLASSIC", "week10_sun_mon_expanded_packet.json", "week10_sun_mon_expanded_dk_upload.csv"),
    "snf_pit_cin": ("SHOWDOWN", "week10_snf_pit_cin_showdown_packet.json", "week10_snf_pit_cin_dk_upload.csv"),
    "mnf_lac_bal": ("SHOWDOWN", "week10_mnf_lac_bal_showdown_packet.json", "week10_mnf_lac_bal_dk_upload.csv"),
}


def test_week10_classic_cash_medians_and_hold_status() -> None:
    dfs_dir = REPO_ROOT / "data" / "dfs"
    hex64_re = re.compile(r"^[0-9a-f]{64}$")

    for slate_key, (contest_type, pkt_filename, _) in _WEEK10_DFS_SLATE_SPECS.items():
        pkt_path = dfs_dir / pkt_filename
        assert pkt_path.is_file(), f"Missing DFS packet JSON: {pkt_path}"
        pkt = json.loads(pkt_path.read_text(encoding="utf-8"))

        assert pkt["release_status"] == "HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER"
        assert pkt["publish_allowed"] is False
        assert pkt["auto_email_sent"] is False

        cash_med = float(pkt["cash_lineup"]["projected_median_fpts"])
        if contest_type == "CLASSIC":
            assert 110.0 <= cash_med <= 175.0, (
                f"{slate_key} Classic cash projected_median_fpts={cash_med} outside [110, 175]"
            )

        gate_meta = pkt["gate_meta"]
        sal_sha = str((gate_meta.get("dk_salary_csv_provenance") or {}).get("sha256") or "")
        scr_sha = str((gate_meta.get("dk_scratch_json_provenance") or {}).get("sha256") or "")
        assert hex64_re.match(sal_sha), f"{slate_key} invalid dk_salary_csv_provenance sha256"
        assert hex64_re.match(scr_sha), f"{slate_key} invalid dk_scratch_json_provenance sha256"


def test_week10_pure_dk_csv_upload_contract() -> None:
    dfs_dir = REPO_ROOT / "data" / "dfs"
    dk_cell_re = re.compile(r"^.+\(\d+\)$")
    showdown_hdr = ["CPT", "FLEX", "FLEX", "FLEX", "FLEX", "FLEX"]
    classic_hdr = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "DST"]

    for slate_key, (contest_type, _, upload_filename) in _WEEK10_DFS_SLATE_SPECS.items():
        expected_hdr = showdown_hdr if contest_type == "SHOWDOWN" else classic_hdr
        for suffix, expected_rows in (("dk_cash_1up.csv", 2), ("dk_20max_gpp.csv", 21)):
            csv_path = dfs_dir / f"week10_{slate_key}_{suffix}"
            assert csv_path.is_file(), f"Missing pure DK upload CSV: {csv_path}"
            with csv_path.open("r", encoding="utf-8", newline="") as fh:
                rows = list(csv.reader(fh))
            assert len(rows) == expected_rows, f"{csv_path.name} row count={len(rows)} != {expected_rows}"
            assert rows[0] == expected_hdr, f"{csv_path.name} header mismatch: {rows[0]}"
            for r_idx, row in enumerate(rows[1:], start=1):
                assert len(row) == len(expected_hdr), f"{csv_path.name} row {r_idx} width mismatch"
                for cell in row:
                    assert dk_cell_re.match(cell), f"{csv_path.name} row {r_idx} bad DK ID cell: {cell!r}"

        upload_path = dfs_dir / upload_filename
        assert upload_path.is_file(), f"Missing combined DK upload CSV: {upload_path}"
        with upload_path.open("r", encoding="utf-8", newline="") as fh:
            upload_rows = list(csv.reader(fh))
        assert len(upload_rows) - 1 >= 21, f"{upload_filename} data rows={len(upload_rows) - 1} < 21"


def test_week10_dossiers_physical_conservation_and_stage0_qb1_conflict_fail_closed(monkeypatch) -> None:
    import scripts.ops.enforce_stage0_roster_and_board_allowlist as stage0_mod

    engine_dir = REPO_ROOT / "data" / "engine"
    lac_rec_yds: dict[str, float] = {}

    for away, home in _WEEK10_MATCHUPS:
        dp = engine_dir / f"connected_workflow_dossier_{away.lower()}_{home.lower()}_week10.json"
        assert dp.is_file(), f"Missing Week 10 dossier: {dp}"
        dossier = json.loads(dp.read_text(encoding="utf-8"))
        s34 = dossier["stage3_4_conserved_post_sim_projections"]
        team_projs = s34["team_post_sim_projections"]

        for tm in (away, home):
            pts_mean = float(team_projs[tm]["points"]["mean"])
            ptd_mean = float(team_projs[tm]["pass_tds"]["mean"])
            assert ptd_mean <= 2.5, f"{away}@{home} {tm} team pass_tds.mean={ptd_mean} > 2.5"
            assert ptd_mean <= pts_mean * 0.78 / 6.95 + 1e-5, (
                f"{away}@{home} {tm} pass_tds.mean={ptd_mean} exceeds score bound for pts={pts_mean}"
            )

        pobj = s34["athlete_post_sim_projections"]
        items = list(pobj.values()) if isinstance(pobj, dict) else pobj
        for item in items:
            pm = item.get("projections", item)
            pos = str(item.get("position") or "")
            if pos == "RB":
                rec_mean = float((pm.get("receptions") or {}).get("mean") or 0.0)
                assert rec_mean <= 6.5, f"{away}@{home} RB {item.get('athlete')} receptions.mean={rec_mean} > 6.5"
            if pos == "QB":
                qb_ptd = float((pm.get("pass_tds") or {}).get("mean") or 0.0)
                assert qb_ptd <= 2.5, f"{away}@{home} QB {item.get('athlete')} pass_tds.mean={qb_ptd} > 2.5"
            if away == "LAC" and home == "BAL" and item.get("team") == "LAC":
                lac_rec_yds[str(item.get("athlete") or "")] = float((pm.get("rec_yds") or {}).get("mean") or 0.0)

    kls_yds = lac_rec_yds["KeAndre Lambert-Smith"]
    for starter in ("Tre Harris", "Quentin Johnston", "Ladd McConkey"):
        assert lac_rec_yds[starter] > kls_yds, (
            f"LAC WR {starter} ({lac_rec_yds[starter]:.2f}) must outproject unboarded 1-GP KeAndre Lambert-Smith ({kls_yds:.2f})"
        )

    def _inject_unresolved_qb1_conflict(cfg: dict, week: int) -> dict:
        out = dict(cfg)
        out["confirmed_qb1"] = {**(cfg.get("confirmed_qb1") or {}), "NE": "Synthetic Conflicted QB"}
        out["excluded_players"] = [
            *(cfg.get("excluded_players") or []),
            {"name": "Synthetic Conflicted QB", "team": "NE", "reason": "test_unresolved_qb1_conflict"},
        ]
        return out

    monkeypatch.setattr(stage0_mod, "apply_stage0_qb1_live_starter_resolutions", _inject_unresolved_qb1_conflict)
    with pytest.raises(stage0_mod.Stage0RosterContaminationError, match="STAGE0_QB1_CONTRADICTION"):
        stage0_mod.load_stage0_game_roster_allowlist(
            away="NE",
            home="DET",
            week=10,
            board_rel_path="data/engine/week10_ne_det_dk_full_board_2026_11_06.json",
        )


def test_extract_active_decoy_keys_ignores_clear_normal_role_entries() -> None:
    assert extract_active_decoy_keys(None) == set()
    audit = {
        "Christian McCaffrey": {
            "status": "CLEAR_NORMAL_ROLE",
            "is_decoy_trap": False,
            "block_over_bets": False,
        },
        "Trap Receiver": {
            "status": "LIMITED_SNAPS_MONITOR",
            "is_decoy_trap": True,
            "block_over_bets": False,
        },
        "Blocked Runner": {
            "status": "DECOY_RISK",
            "is_decoy_trap": False,
            "block_over_bets": True,
        },
        "Malformed Entry": "ignored",
    }
    keys = extract_active_decoy_keys(audit)
    assert _norm_player_key("Christian McCaffrey") not in keys
    assert keys == {
        _norm_player_key("Trap Receiver"),
        _norm_player_key("Blocked Runner"),
    }


def test_qb_rush_tds_capped_at_045_in_both_branches() -> None:
    explicit_rec = {
        "projections": {
            "rush_tds": {"mean": 1.25, "p25": 0.90, "p90": 1.80},
        }
    }
    med_qb, p25_qb, p90_qb = _dk_fpts_from_dossier_record(explicit_rec, "QB", td_prob=0.0)
    assert med_qb == pytest.approx(2.7, abs=1e-6)
    assert p25_qb == pytest.approx(2.7, abs=1e-6)
    assert p90_qb == pytest.approx(2.7, abs=1e-6)

    med_rb, _, _ = _dk_fpts_from_dossier_record(explicit_rec, "RB", td_prob=0.0)
    assert med_rb == pytest.approx(7.5, abs=1e-6)

    derived_rec: dict[str, dict[str, object]] = {"projections": {}}
    med_qb_derived, _, _ = _dk_fpts_from_dossier_record(derived_rec, "QB", td_prob=0.70)
    med_rb_derived, _, _ = _dk_fpts_from_dossier_record(derived_rec, "RB", td_prob=0.70)
    assert med_qb_derived == pytest.approx(2.7, abs=1e-6)
    assert med_rb_derived > 7.0


def test_simulate_dirichlet_multinomial_field_enforces_salary_cap_never_bypasses() -> None:
    import numpy as np
    import pandas as pd

    from scripts.ops.dfs_stochastic_milp_optimizer import simulate_dirichlet_multinomial_field

    rows = [
        {"name": "ExpQB", "position": "QB", "team": "AAA", "salary": 9200, "proj_ownership": 0.45},
        {"name": "ChpQB", "position": "QB", "team": "BBB", "salary": 4500, "proj_ownership": 0.005},
        {"name": "ExpRB1", "position": "RB", "team": "AAA", "salary": 9500, "proj_ownership": 0.45},
        {"name": "ExpRB2", "position": "RB", "team": "BBB", "salary": 9100, "proj_ownership": 0.45},
        {"name": "ExpRB3", "position": "RB", "team": "CCC", "salary": 8900, "proj_ownership": 0.40},
        {"name": "ChpRB1", "position": "RB", "team": "DDD", "salary": 4000, "proj_ownership": 0.005},
        {"name": "ChpRB2", "position": "RB", "team": "EEE", "salary": 3900, "proj_ownership": 0.005},
        {"name": "ChpRB3", "position": "RB", "team": "FFF", "salary": 3800, "proj_ownership": 0.005},
        {"name": "ExpWR1", "position": "WR", "team": "AAA", "salary": 9400, "proj_ownership": 0.45},
        {"name": "ExpWR2", "position": "WR", "team": "BBB", "salary": 9100, "proj_ownership": 0.45},
        {"name": "ExpWR3", "position": "WR", "team": "CCC", "salary": 8800, "proj_ownership": 0.45},
        {"name": "ExpWR4", "position": "WR", "team": "DDD", "salary": 8600, "proj_ownership": 0.40},
        {"name": "ChpWR1", "position": "WR", "team": "EEE", "salary": 3400, "proj_ownership": 0.005},
        {"name": "ChpWR2", "position": "WR", "team": "FFF", "salary": 3300, "proj_ownership": 0.005},
        {"name": "ChpWR3", "position": "WR", "team": "GGG", "salary": 3200, "proj_ownership": 0.005},
        {"name": "ChpWR4", "position": "WR", "team": "HHH", "salary": 3100, "proj_ownership": 0.005},
        {"name": "ExpTE1", "position": "TE", "team": "AAA", "salary": 8400, "proj_ownership": 0.45},
        {"name": "ChpTE1", "position": "TE", "team": "BBB", "salary": 2500, "proj_ownership": 0.005},
        {"name": "ExpDST1", "position": "DST", "team": "AAA", "salary": 5900, "proj_ownership": 0.45},
        {"name": "ChpDST1", "position": "DST", "team": "BBB", "salary": 2000, "proj_ownership": 0.005},
    ]
    df = pd.DataFrame(rows)
    salaries = df["salary"].to_numpy(dtype=np.int64)

    field = simulate_dirichlet_multinomial_field(
        df,
        num_opponents=40,
        precision_s=80.0,
        seed=7,
        salary_cap=50000,
    )
    assert field.shape == (40, len(df))
    assert np.all(field.sum(axis=1) == 9)
    totals = field @ salaries
    assert np.all(totals <= 50000)

    with pytest.raises(ValueError, match="Cannot construct valid 9-player field roster under salary_cap"):
        simulate_dirichlet_multinomial_field(
            df,
            num_opponents=5,
            precision_s=80.0,
            seed=7,
            salary_cap=20000,
        )


def test_gse_full_slate_simulator_strict_projections_fails_closed_on_missing() -> None:
    import pandas as pd

    from scripts.ops.dfs_stochastic_milp_optimizer import GSEFullSlateSimulator

    games_df = pd.DataFrame([{"game_id": "G1", "wind_mph": 12.0}])
    missing_qb_df = pd.DataFrame([
        {
            "game_id": "G1",
            "name": "Missing TD QB",
            "team": "AAA",
            "position": "QB",
            "role": "QB1",
            "proj_pass_yds": 245.0,
            "proj_rush_yds": 18.0,
        }
    ])
    with pytest.raises(ValueError, match="missing proj_td"):
        GSEFullSlateSimulator(missing_qb_df, games_df, num_sims=10, seed=42, strict_projections=True).simulate_slate()

    missing_wr_df = pd.DataFrame([
        {
            "game_id": "G1",
            "name": "Missing Yards WR",
            "team": "AAA",
            "position": "WR",
            "role": "WR1",
            "proj_td": 0.45,
            "proj_rec_yds": float("nan"),
            "proj_receptions": 5.0,
            "proj_rush_yds": 0.0,
        }
    ])
    with pytest.raises(ValueError, match="missing proj_rec_yds"):
        GSEFullSlateSimulator(missing_wr_df, games_df, num_sims=10, seed=42, strict_projections=True).simulate_slate()

    fpts, _ = GSEFullSlateSimulator(
        missing_wr_df,
        games_df,
        num_sims=10,
        seed=42,
        strict_projections=False,
    ).simulate_slate()
    assert fpts.shape == (10, 1)

    valid_wr_no_rush_df = pd.DataFrame([
        {
            "game_id": "G1",
            "name": "Clean WR",
            "team": "AAA",
            "position": "WR",
            "role": "WR1",
            "proj_td": 0.45,
            "proj_rec_yds": 68.5,
            "proj_receptions": 5.4,
        }
    ])
    fpts_clean, _ = GSEFullSlateSimulator(
        valid_wr_no_rush_df,
        games_df,
        num_sims=10,
        seed=42,
        strict_projections=True,
    ).simulate_slate()
    assert fpts_clean.shape == (10, 1)

    inf_wr_df = pd.DataFrame([
        {
            "game_id": "G1",
            "name": "Inf Yards WR",
            "team": "AAA",
            "position": "WR",
            "role": "WR1",
            "proj_td": 0.45,
            "proj_rec_yds": float("inf"),
            "proj_receptions": 5.0,
        }
    ])
    with pytest.raises(ValueError, match="non-finite proj_rec_yds"):
        GSEFullSlateSimulator(inf_wr_df, games_df, num_sims=10, seed=42, strict_projections=True).simulate_slate()


def test_week10_santa_remediation_invariants_across_all_13_dossiers_and_sims() -> None:
    engine_dir = REPO_ROOT / "data" / "engine"
    sim_dir = REPO_ROOT / "data" / "simulations"

    for away, home in _WEEK10_MATCHUPS:
        dp = engine_dir / f"connected_workflow_dossier_{away.lower()}_{home.lower()}_week10.json"
        assert dp.is_file(), f"Missing Week 10 dossier: {dp}"
        d = json.loads(dp.read_text(encoding="utf-8"))

        # 1. wave13 sheaf populated cleanly
        wave13 = d.get("wave13_universal_phase_transition_navier_stokes_sheaf") or {}
        assert len(wave13) > 0, f"{away}@{home} empty wave13 sheaf"

        # 2. Panel B strictly uses +24.92u / 47-19-1 (never voided +26.50u / 62-23-1)
        panel_b = d["stage5_360_conjunction_gate"]["dual_panel_ledger_summary"]["panel_b_21_pick_5stage_ledger"]
        assert panel_b["net_units"] == "+24.92u", f"{away}@{home} wrong panel_b net_units={panel_b['net_units']}"
        assert int(panel_b["wins"]) == 47, f"{away}@{home} wrong panel_b wins={panel_b['wins']}"
        assert d["stage5_360_conjunction_gate"]["publishAllowed"] is False

        # 3. IDP tackles_plus_assists conserved & non-negative with bounded variance
        ath_map = d["stage3_4_conserved_post_sim_projections"]["athlete_post_sim_projections"]
        for name, item in ath_map.items():
            pm = item.get("projections") or {}
            if "tackles_plus_assists" in pm:
                tk = pm["tackles_plus_assists"]
                solo = pm["solo_tackles"]
                ast = pm["assist_tackles"]
                assert tk["mean"] >= 0.0 and tk["p10"] >= 0.0, f"{away}@{home} {name} negative tackle stats"
                assert tk["std"] <= 8.0, f"{away}@{home} {name} exploded tackle std={tk['std']}"
                assert abs((solo["mean"] + ast["mean"]) - tk["mean"]) <= 0.08, (
                    f"{away}@{home} {name} solo+ast != total ({solo['mean']} + {ast['mean']} vs {tk['mean']})"
                )

        # 4. Armed .sim.json carries real simulated margin & total matching Stage 2
        sim_p = sim_dir / f"2026_10_{away}_{home}.sim.json"
        assert sim_p.is_file(), f"Missing Week 10 sim file: {sim_p}"
        sim_obj = json.loads(sim_p.read_text(encoding="utf-8"))
        b_a = d["stage2_jev_spine_and_10k_simulation"]["branch_a_tuten_out_primary"]
        assert abs(float(sim_obj["projected_total_mean"]) - float(b_a["total_points"]["mean"])) < 1e-4
        assert abs(float(sim_obj["projected_margin_mean"]) - float(b_a["home_margin_bal_minus_jax"]["mean"])) < 1e-4

    # 5. Bhayshul Tuten active RB1 in Week 10 JAX @ TEN & Deshaun Watson excluded from Stage 5 HOU @ CLE Showdown
    jax_ten = json.loads((engine_dir / "connected_workflow_dossier_jax_ten_week10.json").read_text(encoding="utf-8"))
    tuten_rush = jax_ten["stage3_4_conserved_post_sim_projections"]["athlete_post_sim_projections"]["Bhayshul Tuten"]["projections"]["rush_yds"]["mean"]
    assert float(tuten_rush) > 20.0, f"JAX@TEN Bhayshul Tuten wrongly suppressed: rush_yds.mean={tuten_rush}"

    hou_cle = json.loads((engine_dir / "connected_workflow_dossier_hou_cle_week10.json").read_text(encoding="utf-8"))
    sd = hou_cle["stage5_360_conjunction_gate"]["optimal_dfs_showdown_lineups"]
    for lu_key in ("draftkings_cash_hybrid_optimal", "draftkings_gpp_tournament_leverage"):
        roster_names = {r["player"] for r in sd[lu_key]["roster"]}
        assert "Deshaun Watson" not in roster_names, f"Deshaun Watson leaked into HOU@CLE Stage 5 {lu_key}"

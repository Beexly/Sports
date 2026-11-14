from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

import pytest

_INTEL_ROOT = Path(__file__).resolve().parents[1]
if str(_INTEL_ROOT) not in sys.path:
    sys.path.insert(0, str(_INTEL_ROOT))

from foundry_bridge.week10_reasoning_mind_bridge import (
    AUTHORITATIVE_WEEK10_TRUTH_2026_11_13,
    RLVR_VETO_BITEMPORAL_LEAK,
    RLVR_VETO_OVERFIT_ELEPHANT,
    RLVR_VETO_SATURATED_CONFIDENCE,
    RLVR_VETO_STAGE0_ROSTER_CONTAMINATION,
    RLVR_VETO_SINGLE_SIDED_MARKET,
    RLVR_VETO_VANISHING_CREDIT,
    audit_gcp_week10_crucibles,
    evaluate_candidate_ticket_with_rlvr_bridge,
    load_all_sovereign_primitives,
    load_and_verify_all_rlvr_vetoes,
    open_foundry_db_readonly,
    remap_motif_csv_season_stats,
)

FOUNDRY_ROOT = Path(r"C:\Users\Garrett\Sports\foundry")


def test_open_foundry_db_readonly_blocks_writes(tmp_path: Path) -> None:
    if (FOUNDRY_ROOT / "foundry.db").is_file():
        db_target = FOUNDRY_ROOT / "foundry.db"
    else:
        db_target = tmp_path / "dummy_foundry.db"
        c = sqlite3.connect(db_target)
        c.execute("CREATE TABLE docs (id INTEGER PRIMARY KEY, status TEXT)")
        c.commit()
        c.close()

    conn = open_foundry_db_readonly(db_target)
    try:
        rows = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        assert len(rows) >= 1
        with pytest.raises(sqlite3.OperationalError):
            conn.execute("CREATE TABLE should_fail (x INT)")
    finally:
        conn.close()


def test_load_all_sovereign_primitives_validates_live_foundry() -> None:
    prim_dir = FOUNDRY_ROOT / "artifacts" / "primitives"
    assert prim_dir.is_dir(), f"Missing primitives dir: {prim_dir}"
    summary = load_all_sovereign_primitives(prim_dir)
    assert summary["books_count"] >= 73
    assert summary["primitives_count"] >= 500
    assert summary["schema_errors"] == []


def test_load_and_verify_all_rlvr_vetoes_runs_3_self_tests_on_every_row() -> None:
    rlvr_dir = FOUNDRY_ROOT / "artifacts" / "rlvr_vetoes"
    assert rlvr_dir.is_dir(), f"Missing RLVR dir: {rlvr_dir}"
    res = load_and_verify_all_rlvr_vetoes(rlvr_dir)
    assert res["batch_files_count"] >= 6
    assert res["total_scenarios"] >= 18
    assert res["all_passed"] is True
    for item in res["scenarios"]:
        assert item["test_correct_dict"] is True
        assert item["test_wrong_dict"] is False
        assert item["test_json_string"] is True


def test_authoritative_week10_truth_and_motif_csv_non_destructive_remap() -> None:
    truth = AUTHORITATIVE_WEEK10_TRUTH_2026_11_13
    active = truth["active_player_team"]
    assert active["Greg Dortch"] == "BUF"
    assert active["Kendrick Bourne"] == "ARI"
    assert active["Kyler Murray"] == "MIN"
    assert active["Kirk Cousins"] == "MIN"
    assert active["Jacoby Brissett"] == "BAL"
    assert active["J.J. McCarthy"] == "NYG"
    assert active["Josh Downs"] == "KC"
    assert active["Keenan Allen"] == "SF"
    assert active["Kenneth Walker III"] == "KC"
    assert active["Tyler Allgeier"] == "ARI"
    assert active["Myles Garrett"] == "LAR"
    assert active["Jared Verse"] == "CLE"
    assert active["Jeffery Simmons"] == "CHI"
    assert active["Trent McDuffie"] == "LAR"
    assert active["Amani Hooker"] == "BUF"
    assert active["Jessie Bates"] == "JAX"
    assert active["Carson Beck"] == "ARI"
    assert active["Kyle McCord"] == "MIA"
    assert active["Drew Lock"] == "SEA"
    assert active["Fernando Mendoza"] == "LV"

    coaches = truth["head_coaches"]
    assert coaches["ATL"] == "Kevin Stefanski"
    assert coaches["CLE"] == "Todd Monken"

    unavail = set(truth["unavailable_players"])
    for p in ("Micah Parsons", "Puka Nacua", "Davante Adams", "Brandon Aiyuk", "Jake Ferguson", "Aaron Brewer", "Zach Sieler", "Gardner Minshew", "Sam Darnold"):
        assert p in unavail

    # Remap season-stat CSV row without mutating caller dict or CSV file on disk
    raw_row = {"player": "Greg Dortch", "team": "ARI", "receptions": 24, "rec_yards": 265}
    remapped = remap_motif_csv_season_stats(raw_row, week=10)
    assert raw_row["team"] == "ARI"
    assert remapped["earned_team"] == "ARI"
    assert remapped["active_week_team"] == "BUF"
    assert remapped["remapped"] is True

    downs_row = {"player": "Josh Downs", "team": "IND", "receptions": 33, "rec_yards": 354}
    remapped_downs = remap_motif_csv_season_stats(downs_row, week=10)
    assert remapped_downs["earned_team"] == "IND"
    assert remapped_downs["active_week_team"] == "KC"


def test_audit_gcp_week10_crucibles_checks_munich_and_kc_atl_defects() -> None:
    gcp_sync = FOUNDRY_ROOT / "artifacts" / "gcp_sync"
    handoff = FOUNDRY_ROOT / "artifacts" / "week10_crucible" / "AUDITOR2_HANDOFF.md"
    audit = audit_gcp_week10_crucibles(gcp_sync, handoff)
    assert audit["week10_crucible_files_count"] >= 13
    assert audit["handoff_present"] is True
    assert audit["venue_truth"]["NE@DET"]["venue"] == "Allianz Arena Munich"
    assert audit["venue_truth"]["NE@DET"]["roof"] == "outdoor"
    assert audit["venue_truth"]["NE@DET"]["circadian_travel_hours"] == 6
    assert audit["venue_truth"]["KC@ATL"]["roof"] == "closed_roof"
    assert "ne_at_det_crucible_override_required" in audit
    assert "kc_at_atl_crucible_override_required" in audit


def test_evaluate_candidate_ticket_triggers_all_6_rlvr_veto_codes() -> None:
    clean = evaluate_candidate_ticket_with_rlvr_bridge({
        "matchup": "BUF@NYJ",
        "player": "Greg Dortch",
        "team": "BUF",
        "raw_logit_z": 1.1,
        "train_acc": 0.68,
        "val_acc": 0.66,
        "depth_gradient_product": 0.42,
        "both_sides_evaluated": True,
        "decision": "PASS",
        "as_of_utc": "2026-11-13T18:00:00Z",
        "feature_max_timestamp_utc": "2026-11-13T17:30:00Z",
    })
    assert clean["approved"] is True
    assert clean["veto_codes"] == []

    # 1. Saturated confidence
    v1 = evaluate_candidate_ticket_with_rlvr_bridge({
        "matchup": "BUF@NYJ", "player": "Greg Dortch", "team": "BUF", "raw_logit_z": 6.5,
        "both_sides_evaluated": True, "as_of_utc": "2026-11-13T18:00:00Z",
    })
    assert RLVR_VETO_SATURATED_CONFIDENCE in v1["veto_codes"]
    assert v1["approved"] is False

    # 2. Overfit elephant
    v2 = evaluate_candidate_ticket_with_rlvr_bridge({
        "matchup": "BUF@NYJ", "player": "Greg Dortch", "team": "BUF",
        "train_acc": 0.99, "val_acc": 0.72, "both_sides_evaluated": True,
    })
    assert RLVR_VETO_OVERFIT_ELEPHANT in v2["veto_codes"]

    # 3. Vanishing credit
    v3 = evaluate_candidate_ticket_with_rlvr_bridge({
        "matchup": "BUF@NYJ", "player": "Greg Dortch", "team": "BUF",
        "depth_gradient_product": 1e-4, "both_sides_evaluated": True,
    })
    assert RLVR_VETO_VANISHING_CREDIT in v3["veto_codes"]

    # 4. Stage-0 roster contamination (wrong team OR unavailable IR/PUP player)
    v4a = evaluate_candidate_ticket_with_rlvr_bridge({
        "matchup": "LAR@ARI", "player": "Greg Dortch", "team": "ARI", "both_sides_evaluated": True,
    })
    assert RLVR_VETO_STAGE0_ROSTER_CONTAMINATION in v4a["veto_codes"]
    v4b = evaluate_candidate_ticket_with_rlvr_bridge({
        "matchup": "MIN@GB", "player": "Micah Parsons", "team": "GB", "both_sides_evaluated": True,
    })
    assert RLVR_VETO_STAGE0_ROSTER_CONTAMINATION in v4b["veto_codes"]

    # 5. Single-sided market
    v5 = evaluate_candidate_ticket_with_rlvr_bridge({
        "matchup": "BUF@NYJ", "player": "Greg Dortch", "team": "BUF", "both_sides_evaluated": False,
    })
    assert RLVR_VETO_SINGLE_SIDED_MARKET in v5["veto_codes"]

    # 6. Bitemporal leak
    v6 = evaluate_candidate_ticket_with_rlvr_bridge({
        "matchup": "BUF@NYJ", "player": "Greg Dortch", "team": "BUF", "both_sides_evaluated": True,
        "as_of_utc": "2026-11-13T18:00:00Z", "feature_max_timestamp_utc": "2026-11-15T20:00:00Z",
    })
    assert RLVR_VETO_BITEMPORAL_LEAK in v6["veto_codes"]

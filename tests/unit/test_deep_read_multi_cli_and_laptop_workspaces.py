"""
Unit and Integration Tests for Fleet Agent 3 Deep-Read Verification across All 8 CLI
Surfaces (3,675 Core Sessions / 4,595 Total Sessions) and Sibling Laptop Workspaces.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from scripts.calibration.train_market_specific_calibration_heads import (
    MarketCalibrationSuite,
)
from scripts.ops.gse_connected_game_workflow import (
    apply_stage4_conformal_and_calibration,
    load_market_calibration_heads,
)
from scripts.ops.solve_showdown_dfs_milp import (
    build_jax_bal_showdown_pool,
    solve_dk_classic_portfolio_milp,
    solve_dk_showdown_portfolio_milp,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
RECEIPT_PATH = (
    REPO_ROOT
    / "docs"
    / "engine"
    / "research"
    / "2026-11-07"
    / "deep-read-multi-cli-and-laptop-workspaces-receipt.json"
)


def _build_local_host_pattern() -> re.Pattern[str]:
    user_tok = "gar" + "rett"
    return re.compile(rf"c:[/\\]+users[/\\]+{user_tok}", re.IGNORECASE)


def test_deep_read_receipt_schema_and_8_cli_surfaces_3675_sessions() -> None:
    assert RECEIPT_PATH.exists(), f"Missing receipt at {RECEIPT_PATH}"
    raw_text = RECEIPT_PATH.read_text(encoding="utf-8")
    pat = _build_local_host_pattern()
    assert not pat.search(raw_text), "Receipt JSON must not contain hardcoded local host paths"

    receipt = json.loads(raw_text)
    assert receipt["two_host_path_hygiene_enforced"] is True
    assert receipt["zero_hardcoded_local_host_paths_in_intelligence_py"] is True

    sl = receipt["session_librarian_8_surfaces_summary"]
    assert sl["surfaces_verified_count"] == 8
    surfaces = sl["surfaces"]
    expected_keys = {
        "1_hermes",
        "2_antigravity_gemini_cli",
        "3_claude_code",
        "4_codex",
        "5_grok",
        "6_xiaomi_mimo",
        "7_cursor",
        "8_downloads_and_shared_skill_vaults",
    }
    assert set(surfaces.keys()) == expected_keys

    core_total = (
        int(surfaces["1_hermes"]["sessions_count"])
        + int(surfaces["2_antigravity_gemini_cli"]["brain_sessions_count"])
        + int(surfaces["3_claude_code"]["jsonl_sessions_count"])
    )
    assert core_total == 3675
    assert sl["core_indexed_cli_sessions_total"] == 3675

    full_total = (
        core_total
        + int(surfaces["5_grok"]["sessions_count"])
        + int(surfaces["6_xiaomi_mimo"]["session_directories_count"])
        + int(surfaces["7_cursor"]["chat_sessions_count"])
    )
    assert full_total == sl["all_cli_sessions_including_grok_mimo_cursor"]

    workspaces = receipt["sibling_workspaces_and_worktrees"]
    for ws_key in (
        "sports_canonical",
        "sports_worktrees",
        "gse_ml_service",
        "gse_lab_20260919",
        "onedrive_galaxy_sports_edge",
        "nfl_farm",
    ):
        assert ws_key in workspaces, f"Missing workspace {ws_key} in receipt"

    assert workspaces["sports_worktrees"]["active_git_worktrees_count"] == 9
    assert workspaces["gse_ml_service"]["pytest_files_passed"] == 6
    assert workspaces["gse_ml_service"]["pytest_tests_passed"] == 354
    assert len(receipt["remediations_and_wiring_fixes_verified"]) == 4


def test_zero_hardcoded_local_host_paths_across_intelligence_py() -> None:
    intel_root = REPO_ROOT / "intelligence"
    pat = _build_local_host_pattern()
    violations: list[str] = []
    for py_file in intel_root.rglob("*.py"):
        text = py_file.read_text(encoding="utf-8", errors="ignore")
        if pat.search(text):
            violations.append(py_file.relative_to(REPO_ROOT).as_posix())
    assert violations == [], f"Found hardcoded local host paths in intelligence/*.py: {violations}"


def test_stage4_market_calibration_heads_negative_brier_skill_gate() -> None:
    bundle = load_market_calibration_heads()
    assert "heads" in bundle
    for mkt in ("MONEYLINE", "SPREAD", "TOTAL"):
        assert mkt in bundle["heads"]
        # Because data/calibration/market_calibration_heads_2026.json has negative skill (-0.0301, -0.1146, -0.0232),
        # the Stage 4 calibration gate must reject the degraded transform and fall back to identity.
        res = apply_stage4_conformal_and_calibration(
            raw_prob=0.5825,
            market=mkt,
            market_devig_prob=0.5238,
            heads_bundle=bundle,
        )
        assert res["skill"] < 0.0
        assert res["skill_gate_passed"] is False
        assert res["calibrated_prob"] == 0.5825
        assert "identity_fallback" in res["active_calibrator"]

    # Positive-skill synthetic head must pass the gate and shrink toward market
    positive_bundle: dict[str, Any] = {
        "version": "2026.1-test",
        "pbo_threshold": 0.15,
        "heads": {
            "SPREAD": {
                "method": "conformal_cover_logistic",
                "brier_baseline": 0.2483,
                "brier": 0.2350,
                "skill": 0.0536,
                "slope_a": 1.12,
            }
        },
    }
    pos_res = apply_stage4_conformal_and_calibration(
        raw_prob=0.60,
        market="SPREAD",
        market_devig_prob=0.50,
        heads_bundle=positive_bundle,
    )
    assert pos_res["skill_gate_passed"] is True
    assert pos_res["calibrated_prob"] == round(0.70 * 0.60 + 0.30 * 0.50, 4)

    # Also verify MarketCalibrationSuite.calibrate_probability() directly
    suite = MarketCalibrationSuite()
    suite.heads["MONEYLINE"]["skill"] = -0.0301
    suite.heads["MONEYLINE"]["brier"] = 0.2296
    s_neg = suite.calibrate_probability(0.64, market="MONEYLINE", devig_prob=0.55)
    assert s_neg["skill_gate_passed"] is False
    assert s_neg["calibrated_prob"] == 0.64


def test_dfs_milp_showdown_and_classic_multi_lineup_portfolio_and_stacking() -> None:
    showdown_pool = build_jax_bal_showdown_pool()
    sd_port = solve_dk_showdown_portfolio_milp(
        showdown_pool,
        n_lineups=3,
        mode="gpp",
        min_uniques=1,
        max_exposure=0.80,
    )
    assert sd_port["generated_lineups"] == 3
    for lu in sd_port["lineups"]:
        assert lu["total_salary"] <= 50000
        assert len(lu["selected_players"]) == 6

    # Build a 16-player Classic pool across 2 games (JAX @ BAL and CIN @ ATL)
    classic_pool = [
        {"name": "Trevor Lawrence", "team": "JAX", "opponent": "BAL", "pos": "QB", "salary": 6400, "median_fpts": 20.8, "p90_ceiling_fpts": 28.5, "ownership": 0.14},
        {"name": "Joe Burrow", "team": "CIN", "opponent": "ATL", "pos": "QB", "salary": 7200, "median_fpts": 23.4, "p90_ceiling_fpts": 32.1, "ownership": 0.22},
        {"name": "Travis Etienne", "team": "JAX", "opponent": "BAL", "pos": "RB", "salary": 6500, "median_fpts": 17.5, "p90_ceiling_fpts": 25.0, "ownership": 0.18},
        {"name": "Derrick Henry", "team": "BAL", "opponent": "JAX", "pos": "RB", "salary": 8000, "median_fpts": 19.2, "p90_ceiling_fpts": 28.4, "ownership": 0.26},
        {"name": "Bijan Robinson", "team": "ATL", "opponent": "CIN", "pos": "RB", "salary": 7800, "median_fpts": 20.1, "p90_ceiling_fpts": 29.0, "ownership": 0.25},
        {"name": "Chase Brown", "team": "CIN", "opponent": "ATL", "pos": "RB", "salary": 6200, "median_fpts": 16.4, "p90_ceiling_fpts": 24.2, "ownership": 0.19},
        {"name": "Tank Bigsby", "team": "JAX", "opponent": "BAL", "pos": "RB", "salary": 4800, "median_fpts": 10.2, "p90_ceiling_fpts": 17.5, "ownership": 0.08},
        {"name": "Ja'Marr Chase", "team": "CIN", "opponent": "ATL", "pos": "WR", "salary": 8600, "median_fpts": 22.5, "p90_ceiling_fpts": 34.0, "ownership": 0.28},
        {"name": "Tee Higgins", "team": "CIN", "opponent": "ATL", "pos": "WR", "salary": 6600, "median_fpts": 16.8, "p90_ceiling_fpts": 26.5, "ownership": 0.17},
        {"name": "Drake London", "team": "ATL", "opponent": "CIN", "pos": "WR", "salary": 7000, "median_fpts": 18.2, "p90_ceiling_fpts": 27.8, "ownership": 0.21},
        {"name": "Parker Washington", "team": "JAX", "opponent": "BAL", "pos": "WR", "salary": 4600, "median_fpts": 13.5, "p90_ceiling_fpts": 21.0, "ownership": 0.12},
        {"name": "Jakobi Meyers", "team": "JAX", "opponent": "BAL", "pos": "WR", "salary": 5200, "median_fpts": 14.2, "p90_ceiling_fpts": 22.0, "ownership": 0.14},
        {"name": "Zay Flowers", "team": "BAL", "opponent": "JAX", "pos": "WR", "salary": 6300, "median_fpts": 14.9, "p90_ceiling_fpts": 23.8, "ownership": 0.16},
        {"name": "Mark Andrews", "team": "BAL", "opponent": "JAX", "pos": "TE", "salary": 4900, "median_fpts": 12.4, "p90_ceiling_fpts": 19.8, "ownership": 0.15},
        {"name": "Brenton Strange", "team": "JAX", "opponent": "BAL", "pos": "TE", "salary": 3500, "median_fpts": 9.6, "p90_ceiling_fpts": 16.2, "ownership": 0.09},
        {"name": "Mike Gesicki", "team": "CIN", "opponent": "ATL", "pos": "TE", "salary": 3800, "median_fpts": 10.4, "p90_ceiling_fpts": 17.5, "ownership": 0.10},
        {"name": "Jaguars DST", "team": "JAX", "opponent": "BAL", "pos": "DST", "salary": 2900, "median_fpts": 8.4, "p90_ceiling_fpts": 14.0, "ownership": 0.11},
        {"name": "Bengals DST", "team": "CIN", "opponent": "ATL", "pos": "DST", "salary": 2700, "median_fpts": 7.6, "p90_ceiling_fpts": 13.0, "ownership": 0.09},
    ]

    cl_port = solve_dk_classic_portfolio_milp(
        classic_pool,
        n_lineups=3,
        mode="gpp",
        min_uniques=2,
        max_exposure=0.75,
        stack_qb_pass_catchers=2,
        require_opp_bringback=True,
        min_salary=40000,
    )
    assert cl_port["generated_lineups"] == 3
    lineups = cl_port["lineups"]
    for i, lu in enumerate(lineups):
        assert lu["total_salary"] <= 50000
        roster = lu["roster"]
        assert len(roster) == 9
        qbs = [p for p in roster if p["pos"] == "QB"]
        assert len(qbs) == 1
        qb_team = qbs[0]["team"]
        qb_opp = "BAL" if qb_team == "JAX" else "ATL"
        same_team_pc = [p for p in roster if p["team"] == qb_team and p["pos"] in {"WR", "TE"}]
        opp_skill = [p for p in roster if p["team"] == qb_opp and p["pos"] in {"RB", "WR", "TE"}]
        assert len(same_team_pc) >= 2, f"Lineup {i} failed QB+2 stack for {qb_team}"
        assert len(opp_skill) >= 1, f"Lineup {i} failed opponent bring-back for {qb_opp}"

        for j in range(i + 1, len(lineups)):
            overlap = len(set(lu["selected_players"]) & set(lineups[j]["selected_players"]))
            assert overlap <= 9 - 2, f"Lineups {i} and {j} overlap by {overlap} > 7"

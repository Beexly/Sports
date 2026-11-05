#!/usr/bin/env python3
"""
tests/test_gse_connected_workflow_v2_full_repo.py

Comprehensive Full-Repository Regression Test Suite for GSE Connected Game Workflow v2:
  1. Stage 0 Roster & Contamination Gate:
     - Tank Bigsby, Isaiah Likely, Tyler Huntley, and Lamar Jackson are strictly blocked
       (`assert_zero_roster_contamination` raises `RuntimeError` if any appear in a string,
       and passes on clean output).
     - Joe Fagnano is BAL QB1 (Jacoby Brissett emergency QB2); Trevor Lawrence is JAX QB1.
     - All 37 board athletes have verified 2026 `player_gp` and team assignments.
  2. TypeScript Prediction & MCP Equation Engines Telemetry (`tnf_jax_bal_ts_engines_telemetry_2026_11_05.json`):
     - `mcp_cognitive_router.thousand_equation_matrix_count == 1666`
     - `mcp_cognitive_router.stage_d_james_stein_shrinkage > 0.90` (specifically `0.916978`)
     - `abs(mcp_cognitive_router.stage_d_clamped_log_odds_delta) <= 0.35`
     - `master_situational_reasoning_aggregator.streams_executed_count == 22` and `streams_skipped_count == 0`
     - `master_situational_reasoning_aggregator.stream15i_zero_orphan_modules_evaluated == 77` and `stream15i_catalog_signals_evaluated == 51`
     - `x_situational_80_rules.total_rules == 80` and `evaluated_count == 80`
     - `wireable_dispatch_registry.wireable_module_ids_count == 173` and `registered_model_ids_count == 196`
  3. Python 31-Subpackage & 31-Dataset Telemetry (`tnf_jax_bal_python_31_domains_telemetry_2026_11_05.json`):
     - `intelligence_31_subpackages.subpackages_connected_count >= 30`
     - `datasets_report.ftn_charting_2026.rows == 18019`
     - `len(datasets_report.step_n_market_11_parquets) == 11`
  4. Connected Workflow Master Receipt (`tnf_jax_bal_connected_workflow_v1_2026_11_05.json`) & Markdown Dossier:
     - Cryptographic SHA-256 lineage chain (`Stage 0 -> Stage 1A -> Stage 1B -> Stage 2 -> Stage 3/4 -> Stage 5`) is intact.
     - `stage3_and_4_projections_and_situational` contains `derivatives_and_exotics_360`
       (`quarters_and_halves_team_projections`, `first_quarter_and_first_half_player_projections`,
        `longest_play_projections`, `touchdown_scorer_probabilities`, `idp_pass_rush_sack_projections`).
     - `stage5_360_conjunction_gate_and_call_sheet` has dynamic `gate_reason` strings (no hardcoded
       `42.1%` or `65.7%` mismatch), integer `XX/100` confidence strings (no `%` confidence),
       and Dual-Panel Official Ledger (`15,947` replay + `16-5` Wilson CI).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.enforce_stage0_roster_and_board_allowlist import (  # noqa: E402
    Stage0RosterContaminationError,
    assert_zero_roster_contamination,
    build_dynamic_league_wide_denylist_for_matchup,
    load_stage0_game_roster_allowlist,
)


def test_stage0_roster_and_contamination_gate():
    allowlist = load_stage0_game_roster_allowlist("JAX", "BAL", 9)

    # Verify QB1 starters and emergency QB2 trade
    assert allowlist["confirmed_qb1"]["JAX"] == "Trevor Lawrence"
    assert allowlist["confirmed_qb1"]["BAL"] == "Joe Fagnano"
    traded_names = {tp["name"]: tp for tp in allowlist.get("traded_players", [])}
    assert "Jacoby Brissett" in traded_names
    assert traded_names["Jacoby Brissett"]["to"] == "BAL"

    # Verify all 37 board athletes have verified 2026 player_gp and team assignments
    assert allowlist["verified_board_athletes_count"] == 37
    athletes = allowlist["verified_board_athletes"]
    assert len(athletes) == 37
    for name, info in athletes.items():
        assert info["team"] in ("JAX", "BAL"), f"Unexpected team for {name}: {info['team']}"
        assert "pbp_2026" in info, f"Missing pbp_2026 for {name}"
        assert isinstance(info["pbp_2026"]["player_gp"], int), f"Missing int player_gp for {name}"
        assert info["pbp_2026"]["player_gp"] >= 0

    # Strictly block Tank Bigsby, Isaiah Likely, Tyler Huntley, and Lamar Jackson in strings
    for blocked_name in ("Tank Bigsby", "Isaiah Likely", "Tyler Huntley", "Lamar Jackson"):
        with pytest.raises(RuntimeError):
            assert_zero_roster_contamination(
                f"Active projection tonight: {blocked_name} Over 45.5 yards.",
                allowlist,
                f"test_string_block_{blocked_name}",
            )

    # Clean output passes without error
    clean_text = (
        "Confirmed Week 9 TNF starters: Trevor Lawrence (JAX QB1) vs Joe Fagnano (BAL QB1, "
        "with Jacoby Brissett as emergency QB2). Derrick Henry leads BAL rushing attack."
    )
    assert_zero_roster_contamination(clean_text, allowlist, "test_clean_output")


def test_ts_prediction_and_mcp_engines_telemetry():
    ts_path = REPO_ROOT / "data" / "engine" / "tnf_jax_bal_ts_engines_telemetry_2026_11_05.json"
    assert ts_path.is_file(), f"Missing TS telemetry JSON: {ts_path}"
    ts_data = json.loads(ts_path.read_text(encoding="utf-8"))

    mcp = ts_data["mcp_cognitive_router"]
    assert mcp["thousand_equation_matrix_count"] == 1666
    assert mcp["stage_d_james_stein_shrinkage"] > 0.90
    assert abs(mcp["stage_d_james_stein_shrinkage"] - 0.916978) < 1e-4
    assert abs(mcp["stage_d_clamped_log_odds_delta"]) <= 0.35

    msra = ts_data["master_situational_reasoning_aggregator"]
    assert msra["streams_executed_count"] == 22
    assert msra["streams_skipped_count"] == 0
    assert msra["stream15i_zero_orphan_modules_evaluated"] == 77
    assert msra["stream15i_catalog_signals_evaluated"] == 51

    x80 = ts_data["x_situational_80_rules"]
    assert x80["total_rules"] == 80
    assert x80["evaluated_count"] == 80

    wdr = ts_data["wireable_dispatch_registry"]
    assert wdr["wireable_module_ids_count"] == 173
    assert wdr["registered_model_ids_count"] == 196


def test_python_31_subpackages_and_31_datasets_telemetry():
    py_path = REPO_ROOT / "data" / "engine" / "tnf_jax_bal_python_31_domains_telemetry_2026_11_05.json"
    assert py_path.is_file(), f"Missing Python 31-domain telemetry JSON: {py_path}"
    py_data = json.loads(py_path.read_text(encoding="utf-8"))

    subpkgs = py_data["intelligence_31_subpackages"]
    assert subpkgs["subpackages_connected_count"] >= 30

    ds = py_data["datasets_report"]
    assert ds["ftn_charting_2026"]["rows"] == 18019
    assert len(ds["step_n_market_11_parquets"]) == 11


def test_connected_workflow_master_receipt_and_markdown_dossier():
    v1_path = REPO_ROOT / "data" / "engine" / "tnf_jax_bal_connected_workflow_v1_2026_11_05.json"
    master_path = REPO_ROOT / "data" / "engine" / "tnf_jax_bal_connected_workflow_master_2026_11_05.json"
    target_path = v1_path if v1_path.is_file() else master_path
    assert target_path.is_file(), f"Missing connected workflow receipt JSON: {v1_path}"
    receipt = json.loads(target_path.read_text(encoding="utf-8"))

    # 1. Verify Cryptographic SHA-256 lineage chain (Stage 0 -> Stage 1A -> Stage 1B -> Stage 2 -> Stage 3/4 -> Stage 5)
    chain = receipt.get("cryptographic_receipt_chain") or receipt.get("receipt_lineage_sha256") or {}
    s0 = receipt.get("stage0_roster_and_board_allowlist") or receipt.get("stage0_allowlist") or {}
    s1a = receipt.get("stage1a_coaching_mind_and_schemes") or receipt.get("stage1a_coaching_and_schemes") or {}
    s1b = receipt.get("stage1b_5367_equations_pre_sim_review") or receipt.get("stage1b_equations_and_ engines") or receipt.get("stage1b_equations_and_engines") or {}
    s2 = receipt.get("stage2_jev_spine_and_10k_simulation") or {}
    s34 = (
        receipt.get("stage3_and_4_projections_and_situational")
        or receipt.get("stage3_4_conserved_post_sim_projections")
        or {}
    )
    s5 = (
        receipt.get("stage5_360_conjunction_gate_and_call_sheet")
        or receipt.get("stage5_360_conjunction_gate")
        or {}
    )

    s0_hash = s0.get("stage0_receipt_sha256") or chain.get("stage0_receipt_sha256")
    s1a_hash = s1a.get("stage1a_receipt_sha256") or chain.get("stage1a_receipt_sha256")
    s1b_hash = s1b.get("stage1b_receipt_sha256") or chain.get("stage1b_receipt_sha256")
    s2_hash = s2.get("stage2_receipt_sha256") or chain.get("stage2_receipt_sha256")
    s34_hash = s34.get("stage3_4_receipt_sha256") or chain.get("stage3_4_receipt_sha256")
    s5_hash = s5.get("stage5_receipt_sha256") or chain.get("stage5_receipt_sha256")

    for h_name, h_val in (
        ("stage0", s0_hash),
        ("stage1a", s1a_hash),
        ("stage1b", s1b_hash),
        ("stage2", s2_hash),
        ("stage3_4", s34_hash),
        ("stage5", s5_hash),
    ):
        assert isinstance(h_val, str) and len(h_val) == 64, f"Invalid SHA-256 hash for {h_name}: {h_val}"

    if "parent_stage0_receipt_sha256" in s1a:
        assert s1a["parent_stage0_receipt_sha256"] == s0_hash
    if "parent_stage1a_receipt_sha256" in s1b:
        assert s1b["parent_stage1a_receipt_sha256"] == s1a_hash
    if "parent_stage1b_receipt_sha256" in s2:
        assert s2["parent_stage1b_receipt_sha256"] == s1b_hash
    if "parent_stage2_receipt_sha256" in s34:
        assert s34["parent_stage2_receipt_sha256"] == s2_hash
    if "parent_stage3_4_receipt_sha256" in s5:
        assert s5["parent_stage3_4_receipt_sha256"] == s34_hash

    # 2. Verify stage3_and_4_projections_and_situational contains derivatives_and_exotics_360
    assert "stage3_and_4_projections_and_situational" in receipt
    s34_main = receipt["stage3_and_4_projections_and_situational"]
    assert "derivatives_and_exotics_360" in s34_main
    derivs = s34_main["derivatives_and_exotics_360"]
    for req_key in (
        "quarters_and_halves_team_projections",
        "first_quarter_and_first_half_player_projections",
        "longest_play_projections",
        "touchdown_scorer_probabilities",
        "idp_pass_rush_sack_projections",
    ):
        assert req_key in derivs, f"Missing {req_key} in derivatives_and_exotics_360"
        assert derivs[req_key], f"Empty {req_key} in derivatives_and_exotics_360"

    # 3. Verify stage5_360_conjunction_gate_and_call_sheet
    assert "stage5_360_conjunction_gate_and_call_sheet" in receipt
    s5_main = receipt["stage5_360_conjunction_gate_and_call_sheet"]
    game_lines = s5_main.get("game_line_evaluations") or s5_main.get("main_game_lines") or []
    assert len(game_lines) == 6

    for gl in game_lines:
        reason = str(gl.get("gate_reason") or "")
        # Must not contain stale hardcoded 42.1% or 65.7% mismatch
        assert "42.1%" not in reason, f"Hardcoded 42.1% mismatch found in gate_reason: {reason}"
        assert "65.7%" not in reason, f"Hardcoded 65.7% mismatch found in gate_reason: {reason}"
        # Confidence must be formatted as integer XX/100, never percentage
        conf_str = str(gl.get("confidence_score") or gl.get("confidence") or "")
        assert re.fullmatch(r"\d{1,3}/100", conf_str), f"Invalid confidence format: {conf_str}"
        assert "%" not in conf_str

    # Verify Dual-Panel Official Ledger (15,947 replay + 16-5 Wilson CI)
    dual_ledger = s5_main.get("dual_panel_ledger_summary") or s5_main.get("dual_panel_official_ledger") or {}
    dual_ledger_str = json.dumps(dual_ledger)
    assert "15947" in dual_ledger_str or "15,947" in dual_ledger_str
    assert "16-5" in dual_ledger_str or "0.7619" in dual_ledger_str

    # 4. Verify Markdown Dossier is clean and passes Stage 0 contamination check
    md_path = (
        REPO_ROOT
        / "docs"
        / "predictions"
        / "research"
        / "2026-11-05"
        / "TNF-JAX-AT-BAL-FINAL-360-CALL-SHEET-2026-11-05.md"
    )
    assert md_path.is_file(), f"Missing Markdown Dossier: {md_path}"
    md_text = md_path.read_text(encoding="utf-8")
    allowlist = load_stage0_game_roster_allowlist("JAX", "BAL", 9)
    assert_zero_roster_contamination(md_text, allowlist, "markdown_dossier")
    assert "15,947" in md_text
    assert "16-5" in md_text
    assert "42.1%" not in md_text
    assert "65.7%" not in md_text


def test_dynamic_32_team_league_wide_denylist():
    allowlist = load_stage0_game_roster_allowlist("JAX", "BAL", 9)
    assert allowlist["dynamic_league_wide_denylist_count"] >= 2400

    dyn_jax_bal = build_dynamic_league_wide_denylist_for_matchup("JAX", "BAL", 9)
    assert len(dyn_jax_bal) >= 2400

    # Any player from another NFL team (e.g., Patrick Mahomes on KC, Ja'Marr Chase on CIN, Saquon Barkley on PHI)
    # must be automatically blocked by assert_zero_roster_contamination for JAX @ BAL
    for wrong_team_player in ("Patrick Mahomes", "Ja'Marr Chase", "Saquon Barkley"):
        assert wrong_team_player.lower() in dyn_jax_bal
        with pytest.raises(Stage0RosterContaminationError):
            assert_zero_roster_contamination(
                {"athlete": wrong_team_player, "proj": 75.5},
                allowlist,
                f"test_wrong_team_{wrong_team_player}",
            )

    # Works dynamically for any other matchup (e.g., CIN @ CHI)
    dyn_cin_chi = build_dynamic_league_wide_denylist_for_matchup("CIN", "CHI", 9)
    assert "trevor lawrence" in dyn_cin_chi
    assert "derrick henry" in dyn_cin_chi


def test_connected_workflow_dossier_precommit_guard():
    import subprocess

    guard_script = REPO_ROOT / "scripts" / "guardrails" / "connected-workflow-dossier-guard.py"
    assert guard_script.is_file()
    proc = subprocess.run(
        [sys.executable, str(guard_script)],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, f"Guardrail failed: {proc.stderr}\n{proc.stdout}"
    assert "PASS  connected-workflow-dossier-guard" in proc.stdout


def test_gse_connected_game_workflow_skill_installed_and_valid() -> None:
    repo_skill = REPO_ROOT / ".claude" / "skills" / "gse-connected-game-workflow" / "SKILL.md"
    global_skill = Path.home() / ".agents" / "skills" / "gse-connected-game-workflow" / "SKILL.md"
    assert repo_skill.is_file()
    assert global_skill.is_file()

    for skill_path in (repo_skill, global_skill):
        text = skill_path.read_text(encoding="utf-8")
        assert "name: gse-connected-game-workflow" in text
        m = re.search(r"^description:\s*(.+)$", text, flags=re.MULTILINE)
        assert m is not None
        desc = m.group(1).strip()
        assert desc.startswith("Use when ")
        assert len(desc) <= 200
        assert "NO GAME PICK, PROP, PROJECTION, OR DOSSIER WITHOUT RUNNING" in text
        assert "enforce_stage0_roster_and_board_allowlist.py" in text
        assert "run_python_25_intelligence_domains.py" in text
        assert "run_ts_prediction_and_mcp_engines.ts" in text
        assert "gse_coach_mind_simulator.py" in text
        assert "allocate_conserved_box_score" in text
        assert "connected-workflow-dossier-guard.py" in text
        assert "## Rationalization Table" in text
        assert "## Red Flags" in text


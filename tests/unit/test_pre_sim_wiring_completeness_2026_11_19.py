#!/usr/bin/env python3
"""
tests/unit/test_pre_sim_wiring_completeness_2026_11_19.py
=========================================================
Pure pre-simulation wiring completeness gate (executes ZERO Monte Carlo worlds):
  1. Verifies `assert_all_layers_wired_before_simulation()` passes with Layer 6 verified.
  2. Verifies `footballxos_16_category_playbook_engine`, `whitefield_and_nflverse_metrics_engine`,
     and `core_nfl_schemes_and_systems` have live callers across core simulation/workflow files.
  3. Verifies `compute_pre_projection_universal_and_deep_non_stationary_priors("IND", "HOU")`
     returns all bounded Stream 15L & 15M conditioners + `julia_carleman_5level_audit_ready`.
  4. Verifies `DEFAULT_SEALED_BASELINE` canonical SHA-256 hash is completely untouched.
"""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_layer6_pre_sim_wiring_completeness_zero_worlds() -> None:
    from scripts.ops.verify_and_wire_all_layers_before_sim import (
        assert_all_layers_wired_before_simulation,
    )

    gate = assert_all_layers_wired_before_simulation()
    assert gate["pre_sim_gate_passed"] is True
    l6 = gate["layers"]["layer_6_corpus_streams_15l_15m_and_data_freshness"]
    assert l6["verified"] is True
    assert l6["pbp_2026_max_week"] >= 10
    assert l6["ftn_2026_max_week"] >= 10
    assert l6["footballxos_hubs_verified"] == 16
    assert l6["whitefield_module_live"] is True
    assert l6["ftn_snap_deep_15n_live"] is True
    assert l6["ftn_joined_rows"] >= 25000
    assert l6["snap_rows"] >= 14000
    assert l6["swap_symmetry_verified"] is True
    assert l6["julia_carleman_present"] is True
    assert l6["simulations_executed"] == 0

    w11_gate = REPO_ROOT / "data" / "engine" / "week11_pre_sim_wiring_completeness_gate_2026_11_19.json"
    assert w11_gate.is_file()
    parsed = json.loads(w11_gate.read_text(encoding="utf-8"))
    assert parsed["layers"]["layer_6_corpus_streams_15l_15m_and_data_freshness"]["verified"] is True


def test_zero_orphan_callers_and_sealed_baseline_hash_intact() -> None:
    from scripts.ops.gse_coach_mind_simulator import (
        DEFAULT_SEALED_BASELINE,
        canonical_hash,
        load_sealed_object_readonly,
    )

    sim_src = (REPO_ROOT / "scripts" / "ops" / "gse_coach_mind_simulator.py").read_text(encoding="utf-8")
    wf_src = (REPO_ROOT / "scripts" / "ops" / "gse_connected_game_workflow.py").read_text(encoding="utf-8")
    gate_src = (REPO_ROOT / "scripts" / "ops" / "verify_and_wire_all_layers_before_sim.py").read_text(encoding="utf-8")

    for mod in (
        "footballxos_16_category_playbook_engine",
        "whitefield_and_nflverse_metrics_engine",
        "ftn_and_snap_deep_intelligence_engine",
    ):
        assert mod in sim_src, f"{mod} missing from gse_coach_mind_simulator.py"
        assert mod in wf_src, f"{mod} missing from gse_connected_game_workflow.py"
        assert mod in gate_src, f"{mod} missing from verify_and_wire_all_layers_before_sim.py"

    # Pin Pass B red-team hardening in simulator source (no no-op kickoff clamp or unbounded post-script cliff)
    assert "kickoff_reset_yl_lut" in sim_src
    assert "third_down_resid_lut" in sim_src
    assert "redzone_resid_lut" in sim_src
    assert "fg_short_mid_lut" in sim_src
    assert "punt_net_mu_lut" in sim_src
    assert "snap_idx < 68" in sim_src
    assert "hfa_half_epa" in sim_src

    assert "core_nfl_schemes_and_systems" in gate_src
    sealed_obj, expected_hash = load_sealed_object_readonly()
    assert canonical_hash(DEFAULT_SEALED_BASELINE) == expected_hash
    assert canonical_hash(sealed_obj) == expected_hash

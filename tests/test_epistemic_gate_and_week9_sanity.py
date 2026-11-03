from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from research.hypotheses.multi_game_glycogen_and_pinn_sandbox import (
    RESEARCH_SANDBOX_QUARANTINED,
    MultiGameGlycogenDepletionEngine,
    compute_mallat_scattering_intermittency_residual,
    compute_pinn_navier_stokes_composite_loss,
    evaluate_acrisure_tahoma31_turf_shear_upgrade,
)
from scripts.ops.locked_production_pipeline import (
    ESPN_2026_EDGE_PRWR_LEADERS,
    ESPN_2026_OT_PBWR_LEADERS,
    WEEK9_SEA_ARI_PASS_CATCHER_MATRIX,
    WEEK9_TRENCH_MISMATCH_SPOTLIGHT,
    enforce_production_sanity_gates,
    validate_roster_and_coordinate_mutation_guard,
)
from scripts.ops.memory_mapped_spatial_backtest import evaluate_in_memory_telemetry_rows
from tests.verify_out_of_sample_calibration import run_historical_backtest_eval


def test_enforce_production_sanity_gates_hurdle_and_dirichlet_conservation():
    raw_df = pd.DataFrame(
        {
            "player_id": ["STAR_RECEIVER", "DEPTH_RECEIVER_A", "INJURED_SHADOW_PLAYER"],
            "raw_projected_volume": [8.5, 4.2, 3.1],
        }
    )
    priors = {"STAR_RECEIVER": 0.85, "DEPTH_RECEIVER_A": 0.08, "INJURED_SHADOW_PLAYER": 0.00}
    out = enforce_production_sanity_gates(raw_df, priors, team_target_cap=10.0)
    by_id = dict(zip(out["player_id"], out["conserved_volume"]))
    assert by_id["STAR_RECEIVER"] == pytest.approx(10.0, abs=1e-9)
    assert by_id["DEPTH_RECEIVER_A"] == 0.0
    assert by_id["INJURED_SHADOW_PLAYER"] == 0.0
    assert float(out["conserved_volume"].sum()) == pytest.approx(10.0, abs=1e-9)


def test_anti_hallucination_roster_and_coordinate_guard():
    with pytest.raises(ValueError, match="A.J. Brown"):
        validate_roster_and_coordinate_mutation_guard([{"player_name": "A.J. Brown", "team": "NE"}])

    with pytest.raises(ValueError, match="Trey Hendrickson"):
        validate_roster_and_coordinate_mutation_guard([{"player_name": "Trey Hendrickson", "team": "BAL"}])

    with pytest.raises(ValueError, match="Forbidden spatial coordinate mutation"):
        validate_roster_and_coordinate_mutation_guard(
            [{"player_name": "A.J. Brown", "team": "PHI"}],
            coordinate_scale_x=1.04,
            coordinate_scale_y=1.04,
        )

    ok = validate_roster_and_coordinate_mutation_guard(
        [
            {"player_name": "A.J. Brown", "team": "PHI"},
            {"player_name": "Trey Hendrickson", "team": "CIN"},
            {"player_name": "Theo Benedet", "team": "CHI"},
        ]
    )
    assert ok["roster_verified"] is True


def test_espn_2026_pbwr_prwr_and_week9_sea_ari_matrix():
    assert ESPN_2026_OT_PBWR_LEADERS["Jordan Mailata"]["pbwr"] == 0.93
    assert ESPN_2026_OT_PBWR_LEADERS["Theo Benedet"]["pbwr"] == 0.93
    assert ESPN_2026_EDGE_PRWR_LEADERS["Abdul Carter"]["prwr"] == 0.35
    assert ESPN_2026_EDGE_PRWR_LEADERS["Chop Robinson"]["prwr"] == 0.35
    assert ESPN_2026_EDGE_PRWR_LEADERS["DeMarcus Lawrence"]["team"] == "SEA"
    assert WEEK9_TRENCH_MISMATCH_SPOTLIGHT["ARI_OL_vs_SEA_DL"]["ari_ol_pbwr_rank"] == 31
    assert WEEK9_TRENCH_MISMATCH_SPOTLIGHT["GB_OL_PROTECTION_FLOOR"]["gb_season_pbwr"] == 0.31

    raw_ari = pd.DataFrame(
        [
            {"player_id": r["player_id"], "raw_projected_volume": r["target_share_prior"] * 34.0}
            for r in WEEK9_SEA_ARI_PASS_CATCHER_MATRIX
            if r["team"] == "ARI"
        ]
    )
    priors_ari = {r["player_id"]: r["route_participation"] for r in WEEK9_SEA_ARI_PASS_CATCHER_MATRIX if r["team"] == "ARI"}
    conserved_ari = enforce_production_sanity_gates(raw_ari, priors_ari, team_target_cap=34.0)
    by_id = dict(zip(conserved_ari["player_id"], conserved_ari["conserved_volume"]))
    assert by_id["Kendrick Bourne"] == 0.0
    assert by_id["Marvin Harrison Jr."] == 0.0
    assert by_id["Trey McBride"] > by_id["Michael Wilson"] > 0.0
    assert float(conserved_ari["conserved_volume"].sum()) == pytest.approx(34.0, abs=1e-9)


def test_epistemic_out_of_sample_calibration_gate_rejects_noise_and_approves_signal():
    rng = np.random.default_rng(42)
    true_y = rng.choice([0, 1], size=500, p=[0.75, 0.25])
    base_p = np.clip(np.full(500, 0.25) + rng.normal(0, 0.04, 500), 0.01, 0.99)
    noisy_p = np.clip(base_p + rng.normal(0, 0.14, 500), 0.01, 0.99)
    better_p = np.clip(0.65 * base_p + 0.35 * true_y, 0.01, 0.99)

    rej = run_historical_backtest_eval(true_y, base_p, noisy_p)
    assert rej["PROMOTION_GATE_STATUS"] == "REJECTED"

    app = run_historical_backtest_eval(true_y, base_p, better_p)
    assert app["PROMOTION_GATE_STATUS"] == "APPROVED"


def test_quarantined_glycogen_pinn_mallat_and_memory_slice():
    assert RESEARCH_SANDBOX_QUARANTINED is True

    eng = MultiGameGlycogenDepletionEngine(
        {
            "BREECE_HALL": {"initial_glycogen": 450.0, "cho_intake_g_kg": 7.5, "mass_kg": 100.0},
            "A_J_BROWN": {"initial_glycogen": 420.0, "cho_intake_g_kg": 5.0, "mass_kg": 103.0},
        }
    )
    g1 = eng.process_game_workload_discharge("BREECE_HALL", accumulated_work_joules=3.2e7)
    assert g1 < 450.0
    g2 = eng.simulate_weekly_regeneration_recharge("BREECE_HALL", rest_days=3.0)
    assert g2 > g1
    risk, mult = eng.evaluate_soft_tissue_injury_risk("BREECE_HALL")
    assert risk in {"CRITICAL_SOFT_TISSUE_WARNING", "ELEVATED_FATIGUE_RISK", "OPTIMAL_METABOLIC_HEALTH"}
    assert 0.78 <= mult <= 1.00

    pinn = compute_pinn_navier_stokes_composite_loss([0.1, -0.1], [0.05, 0.05], [0.02], [0.03])
    assert pinn["total_composite_loss"] > 0.0

    mallat = compute_mallat_scattering_intermittency_residual([0.1, 0.2, 0.15, 2.8, 0.2, 0.1])
    assert mallat["intermittency_ratio"] > 0.5

    turf = evaluate_acrisure_tahoma31_turf_shear_upgrade(780.0, 1150.0, 0.20, grip_upgrade_factor=1.04)
    assert turf["coordinates_mutated"] is False
    assert 0.0 < turf["slip_probability"] < 1.0

    mem = evaluate_in_memory_telemetry_rows(
        [
            ("2026_08_CHI_SEA", 1, 1, 0, 25.0, 26.6, 4.5, 1.2),
            ("2026_08_CHI_SEA", 1, 2, 0, 25.4, 26.7, 5.1, 1.4),
        ]
    )
    assert mem["play_blocks"] == 1
    assert mem["processed_nodes"] == 2
    assert mem["total_kinetic_energy_joules"] > 0.0

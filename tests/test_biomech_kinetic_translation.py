"""Unit and physical-invariant tests for Batch 9 biomechanical, viscoelastic, and metabolic kernels.

Wired equation ids exercised here:
EQ-NOV02-079 EQ-NOV02-080 EQ-NOV02-081 EQ-NOV02-082 EQ-NOV02-083 EQ-NOV02-084
EQ-NOV02-085 EQ-NOV02-086 EQ-NOV02-087 EQ-NOV02-088 EQ-NOV02-089 EQ-NOV02-090
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from intelligence.coaching.biomech_kinetic_translation import (
    MUSCLE_GROUPS,
    calculate_viscoelastic_lane_deformation,
    compute_anisotropic_coverage_diffusion_tensor,
    compute_barometric_ballistic_aero_drag,
    compute_biomechanical_joint_torque_caps,
    compute_cleat_turf_viscoelastic_slip,
    compute_elastic_separation_coefficient,
    compute_inertial_dissipation_ratio,
    compute_metabolic_continuity_loss,
    compute_muscle_group_lactic_accumulation_step,
    compute_photometric_ocular_latency_ms,
    compute_pocket_hydrodynamic_navier_stokes_residual,
    compute_qb_kinetic_release_layer,
    compute_qb_tensor_product_cognitive_probs,
    compute_secondary_coverage_pde_residual,
    compute_wavefront_burst_threshold,
)


def test_eq_nov02_079_inertial_dissipation_ratio_si_invariants():
    """EQ-NOV02-079: Head-on collision doubles dissipation vs orthogonal; parallel drift yields ~0."""
    mass_kg = 142.0
    vert_m = 0.81
    shuttle_s = 4.45
    # Parallel motion (cos_theta = 1) -> I_dr ~ 0
    idr_parallel = compute_inertial_dissipation_ratio(mass_kg, vert_m, shuttle_s, (3.0, 0.0), (5.0, 0.0))
    # Orthogonal motion (cos_theta = 0) -> I_dr = (m * v) / s^2
    idr_ortho = compute_inertial_dissipation_ratio(mass_kg, vert_m, shuttle_s, (3.0, 0.0), (0.0, 5.0))
    # Head-on collision (cos_theta = -1) -> I_dr = 2 * (m * v) / s^2
    idr_head_on = compute_inertial_dissipation_ratio(mass_kg, vert_m, shuttle_s, (3.0, 0.0), (-5.0, 0.0))

    assert idr_parallel < 1e-6
    assert abs(idr_ortho - ((mass_kg * vert_m) / (shuttle_s ** 2))) < 1e-4
    assert abs(idr_head_on - 2.0 * idr_ortho) < 1e-4


def test_eq_nov02_080_wavefront_burst_threshold_1_2s_window():
    """EQ-NOV02-080: Integrates burst impulse strictly over the first 1.2s (12 frames at dt=0.1s)."""
    accel_12 = [(4.0, 3.0)] * 12  # ||a|| = 5.0 m/s^2 for 1.2s
    accel_20 = accel_12 + [(20.0, 20.0)] * 8  # Post-1.2s frames must not inflate initial wavefront burst
    w_12 = compute_wavefront_burst_threshold(3.10, 1.55, 125.0, accel_12, dt=0.1)
    w_20 = compute_wavefront_burst_threshold(3.10, 1.55, 125.0, accel_20, dt=0.1)
    expected = (3.10 / 1.55) * 125.0 * (5.0 * 1.2)
    assert abs(w_12 - expected) < 1e-6
    assert abs(w_20 - w_12) < 1e-6


def test_eq_nov02_081_elastic_separation_decay():
    """EQ-NOV02-081: E_sep decays monotonically with separation time delta_t_sep_sec."""
    e_t0 = compute_elastic_separation_coefficient(0.95, 3.25, 1.85, delta_t_sep_sec=0.0)
    e_t1 = compute_elastic_separation_coefficient(0.95, 3.25, 1.85, delta_t_sep_sec=1.0, lambda_decay=0.35)
    e_t3 = compute_elastic_separation_coefficient(0.95, 3.25, 1.85, delta_t_sep_sec=3.0, lambda_decay=0.35)
    assert e_t0 > e_t1 > e_t3 > 0.0
    assert abs(e_t1 - e_t0 * math.exp(-0.35)) < 1e-9


def test_eq_nov02_082_anisotropic_coverage_and_completion_sink_direction():
    """EQ-NOV02-082: Completions (y_comp=1) penalize high coverage density and drive psi -> 0."""
    tensor = compute_anisotropic_coverage_diffusion_tensor(
        height_in=73.0,
        forty_s=4.38,
        vert_in=39.5,
        broad_in=128.0,
        shuttle_s=4.08,
        three_cone_s=6.72,
        vx=4.5,
        vy=2.5,
    )
    assert tensor.shape == (2, 2)
    assert abs(tensor[0, 1] - tensor[1, 0]) < 1e-12
    assert tensor[0, 0] > 0.0 and tensor[1, 1] > 0.0

    # At a completion (y_comp = 1.0), coverage was breached so psi should be driven toward 0.0.
    loss_comp_low_psi = compute_secondary_coverage_pde_residual(
        psi=0.05, dpsi_dt=0.0, d2psi_dx2=0.0, d2psi_dy2=0.0, d_11=tensor[0, 0], d_22=tensor[1, 1], real_pass_completions=1.0
    )
    loss_comp_high_psi = compute_secondary_coverage_pde_residual(
        psi=0.95, dpsi_dt=0.0, d2psi_dx2=0.0, d2psi_dy2=0.0, d_11=tensor[0, 0], d_22=tensor[1, 1], real_pass_completions=1.0
    )
    assert loss_comp_low_psi < loss_comp_high_psi

    # At an incompletion (y_comp = 0.0), tight coverage (psi -> 1.0) has lower loss than open void (psi -> 0.0).
    loss_inc_high_psi = compute_secondary_coverage_pde_residual(
        psi=0.95, dpsi_dt=0.0, d2psi_dx2=0.0, d2psi_dy2=0.0, d_11=tensor[0, 0], d_22=tensor[1, 1], real_pass_completions=0.0
    )
    loss_inc_low_psi = compute_secondary_coverage_pde_residual(
        psi=0.05, dpsi_dt=0.0, d2psi_dx2=0.0, d2psi_dy2=0.0, d_11=tensor[0, 0], d_22=tensor[1, 1], real_pass_completions=0.0
    )
    assert loss_inc_high_psi < loss_inc_low_psi


def test_eq_nov02_083_viscoelastic_cst_vertex_permutation_invariance():
    """EQ-NOV02-083: 2D CST velocity divergence and Maxwell stress are invariant under vertex permutation."""
    nodes = np.array([
        [0.0, 0.0, -1.0, -0.5],
        [4.0, 0.0, 2.0, -0.2],
        [1.5, 3.0, 0.4, 1.8],
    ], dtype=np.float64)
    profiles = [
        {"weight": 315.0, "vert": 29.0, "broad": 106.0, "shuttle": 4.65},
        {"weight": 305.0, "vert": 31.0, "broad": 110.0, "shuttle": 4.52},
        {"weight": 298.0, "vert": 32.5, "broad": 114.0, "shuttle": 4.44},
    ]

    res_012 = calculate_viscoelastic_lane_deformation(nodes[[0, 1, 2]], [profiles[0], profiles[1], profiles[2]], dt=0.1)
    res_120 = calculate_viscoelastic_lane_deformation(nodes[[1, 2, 0]], [profiles[1], profiles[2], profiles[0]], dt=0.1)
    res_210 = calculate_viscoelastic_lane_deformation(nodes[[2, 1, 0]], [profiles[2], profiles[1], profiles[0]], dt=0.1)

    assert len(res_012) == 1
    assert abs(res_012[0]["area"] - 6.0) < 1e-9
    assert abs(res_012[0]["strain_rate_trace"] - res_120[0]["strain_rate_trace"]) < 1e-9
    assert abs(res_012[0]["strain_rate_trace"] - res_210[0]["strain_rate_trace"]) < 1e-9
    assert abs(res_012[0]["viscoelastic_stress"] - res_210[0]["viscoelastic_stress"]) < 1e-9
    # Expanding velocities produce positive divergence and positive tensile stress
    assert res_012[0]["strain_rate_trace"] > 0.0
    assert res_012[0]["viscoelastic_stress"] > 0.0


def test_eq_nov02_084_pocket_hydrodynamic_navier_stokes_residual():
    """EQ-NOV02-084: Exact momentum balance yields zero residual; unblocked DL force spikes residual."""
    balanced = compute_pocket_hydrodynamic_navier_stokes_residual(
        u=1.0, v=0.5, du_dt=0.5, dv_dt=-0.2, dp_dx=0.4, dp_dy=0.1,
        laplacian_u=2.0, laplacian_v=1.0,
        f_ol_x=1.2 * 0.5 + 0.4 - 0.05 * 2.0 + 2.0,
        f_ol_y=1.2 * (-0.2) + 0.1 - 0.05 * 1.0 + 1.5,
        f_dl_x=2.0, f_dl_y=1.5, rho=1.2, mu=0.05,
    )
    imbalanced = compute_pocket_hydrodynamic_navier_stokes_residual(
        u=1.0, v=0.5, du_dt=0.5, dv_dt=-0.2, dp_dx=0.4, dp_dy=0.1,
        laplacian_u=2.0, laplacian_v=1.0,
        f_ol_x=1.0, f_ol_y=1.0, f_dl_x=6.5, f_dl_y=5.0, rho=1.2, mu=0.05,
    )
    assert balanced < 1e-12
    assert imbalanced > 20.0


def test_eq_nov02_085_joint_torque_caps_and_qb_kinetic_release():
    """EQ-NOV02-085: Optimal joint angles maximize torque cap; interior rush pressure degrades platform stability."""
    optimal = compute_biomechanical_joint_torque_caps(125.0, 115.0, 85.0, vx=4.0, vy=0.0, mass_lbs=225.0)
    suboptimal = compute_biomechanical_joint_torque_caps(165.0, 160.0, 120.0, vx=4.0, vy=0.0, mass_lbs=225.0)
    assert optimal["total_torque_cap_nm"] > suboptimal["total_torque_cap_nm"]
    assert optimal["max_kinetic_accel_mps2"] > suboptimal["max_kinetic_accel_mps2"]

    clean_pocket = compute_qb_kinetic_release_layer((0.0, 0.0), (5.0, 0.0), (1.0, 0.0), pocket_pressure=1.0)
    collapsed_pocket = compute_qb_kinetic_release_layer((0.0, 0.0), (1.2, 0.0), (6.5, 0.0), pocket_pressure=5.5)
    assert clean_pocket["platform_stability"] > 0.85
    assert collapsed_pocket["platform_stability"] < 0.20
    assert collapsed_pocket["release_time_s"] < clean_pocket["release_time_s"]
    assert collapsed_pocket["arm_slot_deg"] < clean_pocket["arm_slot_deg"]


def test_eq_nov02_086_qb_tensor_product_cognitive_simplex():
    """EQ-NOV02-086: Outer-product TPR cognitive layer produces valid 3-action probability simplex."""
    out = compute_qb_tensor_product_cognitive_probs(
        situational_vec=[0.8, -0.4, 1.2, 0.3],
        spatial_vec=[-0.5, 0.9, 0.2, -1.1, 0.6],
    )
    assert out["tpr_shape"] == (4, 5)
    probs = out["probs"]
    assert probs.shape == (3,)
    assert np.all(probs > 0.0) and np.all(probs < 1.0)
    assert abs(float(np.sum(probs)) - 1.0) < 1e-12
    assert abs(out["prob_throw"] + out["prob_scramble"] + out["prob_checkdown"] - 1.0) < 1e-12


def test_eq_nov02_087_and_088_turf_slip_glare_and_aero_drag():
    """EQ-NOV02-087 & EQ-NOV02-088: Zero lateral force -> zero slip; wet turf high lateral force -> high slip."""
    slip_zero_force = compute_cleat_turf_viscoelastic_slip(lateral_force_n=0.0, sigma_yield_n=1200.0, moisture_delta=0.8)
    slip_dry = compute_cleat_turf_viscoelastic_slip(lateral_force_n=950.0, sigma_yield_n=1200.0, moisture_delta=0.0)
    slip_moderate = compute_cleat_turf_viscoelastic_slip(lateral_force_n=600.0, sigma_yield_n=1200.0, moisture_delta=0.4)
    slip_wet_cut = compute_cleat_turf_viscoelastic_slip(lateral_force_n=1800.0, sigma_yield_n=900.0, moisture_delta=0.85)

    assert slip_zero_force == 0.0
    assert slip_dry == 0.0
    assert 0.0 < slip_moderate < slip_wet_cut <= 0.95

    rookie_glare = compute_photometric_ocular_latency_ms(lux=85000.0, glare_rad=0.15, qb_exp_idx=1.0)
    veteran_glare = compute_photometric_ocular_latency_ms(lux=85000.0, glare_rad=0.15, qb_exp_idx=8.0)
    no_glare = compute_photometric_ocular_latency_ms(lux=85000.0, glare_rad=math.pi * 0.6, qb_exp_idx=1.0)
    assert rookie_glare > veteran_glare > 0.0
    assert no_glare == 0.0

    calm_drag = compute_barometric_ballistic_aero_drag((26.0, 4.0), (0.0, 0.0), air_density_kg_m3=1.05)
    headwind_heavy_air = compute_barometric_ballistic_aero_drag((26.0, 4.0), (-8.0, 0.0), air_density_kg_m3=1.28)
    assert headwind_heavy_air["drag_magnitude_n"] > calm_drag["drag_magnitude_n"] > 0.0
    assert headwind_heavy_air["net_deceleration_mps2"] > calm_drag["net_deceleration_mps2"]


def test_eq_nov02_089_and_090_four_muscle_lactic_acid_and_play_clock_clearing():
    """EQ-NOV02-089 & EQ-NOV02-090: High anaerobic load builds lactate & drops pH; 25s play clock clears lactate."""
    lactic = np.zeros(4, dtype=np.float64)
    wr_weights = (0.40, 0.38, 0.15, 0.07)  # WR route sprint loads Quads & Hamstrings heavily

    # Simulate 40 frames (4.0s) of high-acceleration deep route burst
    step = None
    for _ in range(40):
        step = compute_muscle_group_lactic_accumulation_step(
            accel_xy_mps2=(8.5, 4.0),
            mass_lbs=205.0,
            role_activation_weights=wr_weights,
            prior_lactic_4vec=lactic,
            anaerobic_threshold_n=180.0,
            dt=0.1,
            gamma_accum=0.12,
        )
        lactic = step["lactic_4vec"]

    assert step is not None
    assert step["muscle_groups"] == MUSCLE_GROUPS
    # Quads and Hamstrings accumulate more lactate than Pectorals for a sprinting WR
    assert lactic[0] > lactic[3] and lactic[1] > lactic[3]
    assert np.all(step["ph_4vec"][:2] < 7.1)
    fatigued_throttle = step["scalar_torque_throttle"]
    assert fatigued_throttle < 0.998

    # Now simulate a 25-second play-clock rest period between snaps (zero acceleration)
    rested = compute_muscle_group_lactic_accumulation_step(
        accel_xy_mps2=(0.0, 0.0),
        mass_lbs=205.0,
        role_activation_weights=wr_weights,
        prior_lactic_4vec=lactic,
        anaerobic_threshold_n=180.0,
        dt=25.0,
        gamma_accum=0.12,
    )
    assert np.all(rested["lactic_4vec"] < lactic)
    assert np.all(rested["ph_4vec"] > step["ph_4vec"])
    assert rested["scalar_torque_throttle"] > fatigued_throttle

    loss_exact = compute_metabolic_continuity_loss(0.90, v_initial=(10.0, 0.0), v_current=(9.0, 0.0))
    loss_mismatch = compute_metabolic_continuity_loss(0.90, v_initial=(10.0, 0.0), v_current=(6.0, 0.0))
    assert loss_exact < 1e-9
    assert loss_mismatch > 0.08

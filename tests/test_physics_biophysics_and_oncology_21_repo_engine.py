r"""Comprehensive Multi-Pass Pytest Suite for the 21-Repository Physics, Biophysics & Oncology Engine.

Tests all 21 unique repositories (22 URLs, deduplicating `quantumlib/Cirq`) across:
  - Target A: Personal Hardware & Software Optimization (Intel i7-1255U / Iris Xe / 6.3 GB C: drive)
  - Target B: Galaxy Sports Edge (GSE) Website & Prediction Engine
  - Target C: Galaxy Science Institute (GSI) Biophysics, Neuromuscular & Spatial Oncology Research
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from research.gsi_sandbox.physics_biophysics_and_oncology_21_repo_sandbox import (
    CLINICAL_OR_DIAGNOSTIC_USE_PERMITTED,
    REPO_ROOT,
    RESEARCH_SANDBOX_ONLY,
    SPORTS_SPINE_IMPORT_PERMITTED,
    ApbsPoissonBoltzmannAndPdb2pqrTitrationEngine,
    BulletFeatherstoneArticulatedBodyEngine,
    CirqQuantumStateVectorAndQaoaSlateEngine,
    FluidX3dLatticeBoltzmannBgkEngine,
    ForceFieldXAmoebaAndZwanzigFepEngine,
    GenesisDifferentiableContactAndSoftBodyKernel,
    GeoscienceKrigingAndStadiumAirDensityEngine,
    HandrightStrokePerturbationAndOcrRobustnessEngine,
    JaxleyDifferentiableHodgkinHuxleyMotorUnitEngine,
    JoltXpbdAndCcdCollisionKinematicsEngine,
    MarkovJuniorRewriteAndWfcEntropyEngine,
    MockDeterministicSchemaAndAntiPotemkinGate,
    MujocoGeneralizedCoordinatesContactImpedanceEngine,
    NavierStokesVorticityAndPressurePoissonEngine,
    NeuroConstruct3dMorphologyAndCableRoutingEngine,
    NicheMapRBiophysicalHeatBudgetAndWbgtEngine,
    OncostreamsActiveMatterNematoPolarSwarmEngine,
    SpatialContinuumDarcyBesselAndCriEngine,
    UnityMlAgentsPpoGaeAndCuriosityEngine,
    WarpSpatialHashGridAndAdjointKernel,
    run_physics_biophysics_and_oncology_21_repo_integration,
)


def test_gsi_sandbox_isolation_and_non_clinical_guardrails() -> None:
    assert RESEARCH_SANDBOX_ONLY is True
    assert CLINICAL_OR_DIAGNOSTIC_USE_PERMITTED is False
    assert SPORTS_SPINE_IMPORT_PERMITTED is False
    assert not (REPO_ROOT / "intelligence" / "ecosystem" / "physics_biophysics_and_oncology_21_repo_engine.py").exists()


def test_repo1_genesis_differentiable_contact_and_adjoint_verification() -> None:
    # Non-contact boundary case (delta <= 0)
    no_hit = GenesisDifferentiableContactAndSoftBodyKernel.solve_contact_with_adjoints(
        penetration_depth_m=-0.002,
        closing_velocity_m_s=2.0,
        tangential_velocity_m_s=1.0,
    )
    assert no_hit["contact_active"] is False
    assert no_hit["normal_force_n"] == 0.0

    # Active viscoelastic contact + finite-difference verification of analytical adjoint d_fn_d_delta
    eps = 1e-6
    delta0 = 0.015
    c0 = GenesisDifferentiableContactAndSoftBodyKernel.solve_contact_with_adjoints(delta0, 2.5, 1.2)
    c_plus = GenesisDifferentiableContactAndSoftBodyKernel.solve_contact_with_adjoints(delta0 + eps, 2.5, 1.2)
    c_minus = GenesisDifferentiableContactAndSoftBodyKernel.solve_contact_with_adjoints(delta0 - eps, 2.5, 1.2)
    fd_grad = (c_plus["normal_force_n"] - c_minus["normal_force_n"]) / (2.0 * eps)
    assert c0["contact_active"] is True
    assert c0["normal_force_n"] > 0.0
    assert c0["tangential_force_n"] < 0.0
    assert c0["neohookean_strain_energy_j_m3"] > 0.0
    assert c0["pk1_stress_frobenius_pa"] > 0.0
    assert abs(c0["d_fn_d_delta"] - fd_grad) < 1e-3


def test_repo2_unity_ml_agents_ppo_gae_and_curiosity_edge_cases() -> None:
    res = UnityMlAgentsPpoGaeAndCuriosityEngine.compute_gae_ppo_and_curiosity(
        rewards=[1.0, 2.0, 3.0],
        values=[0.5, 1.2, 2.1],
        next_value=0.0,
        dones=[False, False, True],
        old_log_probs=[-1.0, -1.0, -1.0],
        new_log_probs=[-0.5, -1.5, -1.0],
        predicted_next_latent=[1.0, 0.0],
        actual_next_latent=[0.0, 1.0],
        clip_epsilon=0.2,
    )
    assert res["steps"] == 3
    assert res["intrinsic_curiosity_reward"] > 0.0
    assert res["clipped_ratio_fraction"] > 0.0
    assert res["sac_mean_soft_q_target"] > 0.0

    with pytest.raises(ValueError, match="identical length"):
        UnityMlAgentsPpoGaeAndCuriosityEngine.compute_gae_ppo_and_curiosity(
            rewards=[1.0],
            values=[0.5, 0.6],
            next_value=0.0,
            dones=[True],
            old_log_probs=[-1.0],
            new_log_probs=[-1.0],
            predicted_next_latent=[0.0],
            actual_next_latent=[0.0],
        )


def test_repo3_nuysoft_mock_and_anti_potemkin_production_gate() -> None:
    batch = MockDeterministicSchemaAndAntiPotemkinGate.generate_adversarial_schema_batch(
        {"spread|1": "@float(-10.5, 10.5)", " snaps": "@int(0, 85)", "tier": "@pick(TIER_1,TIER_2)"},
        count=3,
    )
    # First two rows hit exact min/max boundaries
    assert batch[0]["spread"] == -10.5
    assert batch[1]["spread"] == 10.5
    assert "_mock_watermark" in batch[0]

    # Mock batch must be blocked by production purity gate
    audit_mock = MockDeterministicSchemaAndAntiPotemkinGate.verify_production_slate_purity(batch)
    assert audit_mock["production_pure"] is False
    assert audit_mock["violation_count"] >= 3

    # Fake 0.008 CLV floor must also be blocked (both with and without is_hardcoded_floor flag)
    audit_fake_clv = MockDeterministicSchemaAndAntiPotemkinGate.verify_production_slate_purity([
        {"game_id": "2026_09_KC_BUF", "clv": 0.008, "is_hardcoded_floor": True}
    ])
    assert audit_fake_clv["production_pure"] is False
    audit_unflagged_008 = MockDeterministicSchemaAndAntiPotemkinGate.verify_production_slate_purity([
        {"game_id": "2026_09_KC_BUF", "clv": 0.008}
    ])
    assert audit_unflagged_008["production_pure"] is False

    # Authentic slate row passes
    audit_clean = MockDeterministicSchemaAndAntiPotemkinGate.verify_production_slate_purity([
        {"game_id": "2026_09_SEA_WAS", "clv": 0.028}
    ])
    assert audit_clean["production_pure"] is True


def test_repo4_webgl_fluid_simulation_vorticity_and_helmholtz_projection() -> None:
    yy, xx = np.mgrid[0:16, 0:16]
    u = np.sin(xx * 0.5)
    v = np.cos(yy * 0.5)
    res = NavierStokesVorticityAndPressurePoissonEngine.step_vorticity_and_pressure_projection(
        u, v, jacobi_iterations=30
    )
    assert res["rms_divergence_after_projection"] < res["rms_divergence_before_projection"]
    assert res["incompressibility_reduction_ratio"] > 0.45

    with pytest.raises(ValueError, match="matching 2D grids"):
        NavierStokesVorticityAndPressurePoissonEngine.step_vorticity_and_pressure_projection(
            np.zeros((4, 4)), np.zeros((4, 5))
        )


def test_repo5_jolt_physics_ccd_toi_and_hic15_energy_dissipation() -> None:
    hit = JoltXpbdAndCcdCollisionKinematicsEngine.resolve_ccd_collision_and_hic15(
        pos_a=(0.0, 0.0, 0.0),
        vel_a=(8.0, 0.0, 0.0),
        mass_a_kg=105.0,
        radius_a_m=0.15,
        pos_b=(0.5, 0.0, 0.0),
        vel_b=(-7.0, 0.0, 0.0),
        mass_b_kg=100.0,
        radius_b_m=0.15,
        restitution=0.30,
    )
    assert hit["collision_detected"] is True
    assert hit["toi_s"] is not None and hit["toi_s"] > 0.0
    assert hit["ke_post_j"] < hit["ke_pre_j"]
    assert hit["energy_dissipated_j"] > 0.0
    assert hit["concussion_protocol_flag"] is True

    # Separating bodies should not collide
    miss = JoltXpbdAndCcdCollisionKinematicsEngine.resolve_ccd_collision_and_hic15(
        pos_a=(0.0, 0.0, 0.0),
        vel_a=(-2.0, 0.0, 0.0),
        mass_a_kg=90.0,
        radius_a_m=0.15,
        pos_b=(2.0, 0.0, 0.0),
        vel_b=(2.0, 0.0, 0.0),
        mass_b_kg=90.0,
        radius_b_m=0.15,
    )
    assert miss["collision_detected"] is False


def test_repo6_bullet3_featherstone_aba_and_joint_limit_clamping() -> None:
    res = BulletFeatherstoneArticulatedBodyEngine.solve_aba_chain_forward_dynamics(
        link_lengths_m=[0.30, 0.28, 0.16],
        link_masses_kg=[3.2, 2.0, 0.8],
        joint_angles_rad=[2.59, 0.5, -0.3],
        joint_velocities_rad_s=[10.0, 4.0, 2.0],
        joint_torques_nm=[50.0, 20.0, 5.0],
        joint_limits_rad=(-2.6, 2.6),
    )
    assert res["num_links"] == 3
    assert res["next_joint_angles_rad"][0] <= 2.6
    assert res["end_effector_speed_m_s"] > 0.0


def test_repo7_fluidx3d_lbm_bgk_mass_conservation() -> None:
    res = FluidX3dLatticeBoltzmannBgkEngine.run_lbm_bgk_simulation(nx=24, ny=12, tau=0.65, steps=15)
    assert res["mass_conservation_rel_error"] < 1e-9
    assert res["d3q19_3d_mass_conservation_rel_error"] < 1e-9
    assert res["kinematic_viscosity_lu"] > 0.0
    assert res["d3q19_fp16_bytes_per_cell"] == 55

    with pytest.raises(ValueError, match="tau must be > 0.5"):
        FluidX3dLatticeBoltzmannBgkEngine.run_lbm_bgk_simulation(tau=0.45)


def test_repo8_markov_junior_wfc_shannon_entropy_collapse() -> None:
    res = MarkovJuniorRewriteAndWfcEntropyEngine.synthesize_constrained_sequence(
        states=["RUN", "PA_BOOT", "SHOT", "CHECKDOWN"],
        weights={"RUN": 0.4, "PA_BOOT": 0.3, "SHOT": 0.15, "CHECKDOWN": 0.15},
        allowed_Right_neighbors={
            "RUN": ["PA_BOOT", "RUN"],
            "PA_BOOT": ["SHOT", "CHECKDOWN"],
            "SHOT": ["RUN", "CHECKDOWN"],
            "CHECKDOWN": ["RUN", "PA_BOOT"],
        },
        length=6,
        pinned_constraints={0: "RUN"},
    )
    assert res["sequence"][0] == "RUN"
    assert res["initial_mean_shannon_entropy"] > 0.0
    assert res["final_mean_shannon_entropy"] == 0.0
    assert res["adjacency_constraints_satisfied"] is True
    assert "markov_rewritten_script" in res

    # Right-end pinned constraint requiring backward arc-consistency propagation (pos + 1 -> pos)
    backward_wfc = MarkovJuniorRewriteAndWfcEntropyEngine.synthesize_constrained_sequence(
        states=["A", "B", "C"],
        weights={"A": 0.9, "B": 0.05, "C": 0.05},
        allowed_Right_neighbors={"A": ["A"], "B": ["C"], "C": ["B"]},
        length=4,
        pinned_constraints={3: "C"},
        seed=1,
    )
    assert backward_wfc["sequence"] == ["B", "C", "B", "C"]
    assert backward_wfc["adjacency_constraints_satisfied"] is True

    # Contradictory pinned constraints must raise ValueError cleanly
    with pytest.raises(ValueError, match="WFC contradiction"):
        MarkovJuniorRewriteAndWfcEntropyEngine.synthesize_constrained_sequence(
            states=["A", "B"],
            weights={"A": 0.5, "B": 0.5},
            allowed_Right_neighbors={"A": ["A"], "B": ["B"]},
            length=3,
            pinned_constraints={0: "A", 2: "B"},
        )


def test_repo9_cirq_state_vector_unitarity_and_qaoa_optimization() -> None:
    res = CirqQuantumStateVectorAndQaoaSlateEngine.run_qaoa_ising_combinatorial_optimizer(
        local_fields_h=[0.9, 0.7, 0.5],
        couplings_j={(0, 1): -0.4, (1, 2): -0.3},
        gamma=0.6,
        beta=0.35,
    )
    assert math.isclose(res["state_vector_norm"], 1.0, rel_tol=1e-9)
    assert res["hilbert_space_dim"] == 8
    assert len(res["modal_bitstring"]) == 3
    assert res["qaoa_expected_ising_energy"] < res["uniform_expected_ising_energy"]
    assert res["modal_bitstring"] != "000"


def test_repo10_nvidia_warp_spatial_hash_and_adjoint_tape() -> None:
    res = WarpSpatialHashGridAndAdjointKernel.build_spatial_hash_and_compute_adjoints(
        positions=[(0.0, 0.0, 0.0), (1.2, 0.1, 0.0), (0.8, 0.9, 0.2), (9.0, 9.0, 9.0)],
        cell_size=2.0,
        target_distance=1.5,
    )
    assert res["neighbor_pair_count"] == 3
    assert res["adjoint_vs_fd_abs_error"] < 1e-5


def test_repo11_mujoco_generalized_coordinates_contact_impedance() -> None:
    hit = MujocoGeneralizedCoordinatesContactImpedanceEngine.step_generalized_contact_impedance(
        mass_matrix=[[3.0, 0.2], [0.2, 2.0]],
        coriolis_bias=[0.1, 0.0],
        applied_tau=[5.0, 2.0],
        q_pos=[0.0, 0.0],
        q_vel=[-0.8, 0.1],
        contact_jacobian=[1.0, 0.0],
        penetration_dist=0.01,
    )
    no_hit = MujocoGeneralizedCoordinatesContactImpedanceEngine.step_generalized_contact_impedance(
        mass_matrix=[[3.0, 0.2], [0.2, 2.0]],
        coriolis_bias=[0.1, 0.0],
        applied_tau=[5.0, 2.0],
        q_pos=[0.0, 0.0],
        q_vel=[-0.8, 0.1],
        contact_jacobian=[1.0, 0.0],
        penetration_dist=0.0,
    )
    assert hit["contact_force"] > 0.0
    assert no_hit["contact_force"] == 0.0


def test_repo12_handright_stroke_perturbation_and_ocr_token_recovery() -> None:
    res = HandrightStrokePerturbationAndOcrRobustnessEngine.synthesize_perturbed_strokes_and_audit_ocr(
        "GSI Cohort 04: 0simertinib 80mg QD"
    )
    assert res["glyph_count"] == len("GSI Cohort 04: 0simertinib 80mg QD")
    assert res["mean_baseline_offset_px"] > 0.0
    assert res["mean_bezier_arc_length_px"] > 0.0
    assert "Osimertinib" in res["extracted_tokens"]
    assert res["ocr_token_recovery_rate"] == 1.0

    # Empty string edge case must not crash or emit RuntimeWarning
    empty_res = HandrightStrokePerturbationAndOcrRobustnessEngine.synthesize_perturbed_strokes_and_audit_ocr("")
    assert empty_res["glyph_count"] == 0
    assert empty_res["ocr_token_recovery_rate"] == 0.0


def test_repo13_awesome_open_geoscience_kriging_and_mile_high_air_density() -> None:
    denver = GeoscienceKrigingAndStadiumAirDensityEngine.compute_kriging_and_air_density(
        station_coords_km=[(0.0, 0.0), (10.0, 0.0), (0.0, 10.0)],
        station_values=[20.0, 22.0, 21.0],
        target_coord_km=(3.0, 3.0),
        elevation_m=1609.3,
        temp_c=21.0,
    )
    sea_level = GeoscienceKrigingAndStadiumAirDensityEngine.compute_kriging_and_air_density(
        station_coords_km=[(0.0, 0.0), (10.0, 0.0), (0.0, 10.0)],
        station_values=[20.0, 22.0, 21.0],
        target_coord_km=(3.0, 3.0),
        elevation_m=0.0,
        temp_c=21.0,
    )
    assert math.isclose(denver["weights_sum"], 1.0, abs_tol=1e-5)
    assert denver["air_density_kg_m3"] < sea_level["air_density_kg_m3"]
    assert denver["fg_and_deep_pass_carry_bonus_yds"] > sea_level["fg_and_deep_pass_carry_bonus_yds"]

    # Co-located / duplicate station coordinates must deduplicate cleanly without Singular matrix error
    colocated = GeoscienceKrigingAndStadiumAirDensityEngine.compute_kriging_and_air_density(
        station_coords_km=[(0.0, 0.0), (0.0, 0.0), (10.0, 0.0)],
        station_values=[20.0, 22.0, 24.0],
        target_coord_km=(0.0, 0.0),
    )
    assert math.isclose(colocated["weights_sum"], 1.0, abs_tol=1e-5)
    assert math.isclose(colocated["kriged_estimate"], 21.0, abs_tol=1e-3)


def test_repo14_forcefieldx_amoeba_14_7_and_zwanzig_fep() -> None:
    # At r == r0, both AMOEBA 14-7 and Lennard-Jones 12-6 vdW potentials must equal -epsilon_kcal_mol
    eq = ForceFieldXAmoebaAndZwanzigFepEngine.compute_amoeba_potential_and_fep(
        distance_angstrom=3.80,
        r0_angstrom=3.80,
        epsilon_kcal_mol=0.18,
    )
    assert math.isclose(eq["amoeba_14_7_vdw_kcal_mol"], -0.18, abs_tol=1e-5)
    assert math.isclose(eq["lennard_jones_12_6_kcal_mol"], -0.18, abs_tol=1e-5)
    assert eq["polarization_energy_kcal_mol"] < 0.0
    assert eq["zwanzig_fep_delta_g_kcal_mol"] > 0.0


def test_repo15_nichemapr_homotherm_heat_budget_and_wbgt() -> None:
    hot_humid = NicheMapRBiophysicalHeatBudgetAndWbgtEngine.evaluate_athlete_heat_budget(
        air_temp_c=34.0, relative_humidity_pct=75.0, solar_radiation_w_m2=820.0
    )
    cool_night = NicheMapRBiophysicalHeatBudgetAndWbgtEngine.evaluate_athlete_heat_budget(
        air_temp_c=12.0, relative_humidity_pct=40.0, solar_radiation_w_m2=0.0
    )
    assert hot_humid["wbgt_c"] > cool_night["wbgt_c"]
    assert hot_humid["exertional_heat_risk_tier"] == "HIGH_CRAMP_FATIGUE_RISK"
    assert hot_humid["q4_explosive_output_multiplier"] < cool_night["q4_explosive_output_multiplier"]


def test_repo16_neuroconstruct_3d_frustum_cable_and_delay() -> None:
    res = NeuroConstruct3dMorphologyAndCableRoutingEngine.analyze_3d_compartment_and_synaptic_routing(
        proximal_xyz_um=(0.0, 0.0, 0.0),
        distal_xyz_um=(100.0, 0.0, 0.0),
        proximal_radius_um=2.0,
        distal_radius_um=2.0,
    )
    # Cylinder special case: surface area = 2 * pi * r * L = 400 * pi ≈ 1256.637
    assert math.isclose(res["frustum_surface_area_um2"], 400.0 * math.pi, rel_tol=1e-4)
    assert res["electrotonic_lambda_um"] > 0.0
    assert res["total_synaptic_arrival_delay_ms"] > 0.5


def test_repo17_apbs_pdb2pqr_acidosis_histidine_protonation_shift() -> None:
    tumor_acidic = ApbsPoissonBoltzmannAndPdb2pqrTitrationEngine.compute_titration_and_screened_electrostatics(
        residues=["HIS", "ALA", "GLY", "ASP", "GLU"], ph=6.2
    )
    normal_phys = ApbsPoissonBoltzmannAndPdb2pqrTitrationEngine.compute_titration_and_screened_electrostatics(
        residues=["HIS", "ALA", "GLY", "ASP", "GLU"], ph=7.4
    )
    # Histidine (pKa 6.04) is much more positively protonated at acidic pH 6.2 than at pH 7.4
    assert tumor_acidic["histidine_protonated_charge_e"] > normal_phys["histidine_protonated_charge_e"]
    assert tumor_acidic["net_protein_charge_e"] > normal_phys["net_protein_charge_e"]
    assert "nonlinear_pb_sinh_phi" in tumor_acidic


def test_repo18_jaxley_hodgkin_huxley_spiking_vs_subthreshold() -> None:
    spiking = JaxleyDifferentiableHodgkinHuxleyMotorUnitEngine.simulate_hh_compartment(
        stimulus_current_ua_cm2=12.0, duration_ms=25.0
    )
    subthreshold = JaxleyDifferentiableHodgkinHuxleyMotorUnitEngine.simulate_hh_compartment(
        stimulus_current_ua_cm2=0.5, duration_ms=25.0
    )
    stiff_step = JaxleyDifferentiableHodgkinHuxleyMotorUnitEngine.simulate_hh_compartment(
        stimulus_current_ua_cm2=12.0, duration_ms=25.0, dt_ms=0.6
    )
    assert spiking["spike_count"] >= 2
    assert spiking["peak_membrane_potential_mv"] > 20.0
    assert "d_peak_v_d_gk_mv_per_s_cm2" in spiking
    assert subthreshold["spike_count"] == 0
    assert stiff_step["spike_count"] >= 2
    assert math.isfinite(stiff_step["peak_membrane_potential_mv"])


def test_repo19_and_20_oncostreams_metadata_and_active_matter_swarm() -> None:
    meta = OncostreamsActiveMatterNematoPolarSwarmEngine.parse_oncostreams_analysis_metadata(
        "run_force=Spring_Force_k=0.75_step=250.dat", parent_dir="delta_t_0_05"
    )
    assert meta["delta_t"] == 0.05
    assert meta["step"] == 250
    assert meta["kappa"] == 0.75

    swarm = OncostreamsActiveMatterNematoPolarSwarmEngine.simulate_active_matter_swarm(
        positions_xy=[(0.0, 0.0), (0.6, 0.1), (0.3, 0.5), (0.9, 0.4)],
        angles_rad=[0.0, 0.3, -0.2, 0.1],
        alignment_strength=0.5,
        steps=20,
    )
    assert swarm["final_polar_order_phi"] >= swarm["initial_polar_order_phi"]
    assert swarm["oncostream_collective_corridor_formed"] is True


def test_repo21_spatial_continuum_oncology_cri_tiers_and_sanctuary() -> None:
    tier1 = SpatialContinuumDarcyBesselAndCriEngine.calculate_cri_and_biophysical_sanctuary(
        pattern="lepidic", tp53="wt", rb1="wt", stroma="loose"
    )
    tier2 = SpatialContinuumDarcyBesselAndCriEngine.calculate_cri_and_biophysical_sanctuary(
        pattern="acinar", tp53="mut", rb1="wt", stroma="moderate"
    )
    tier3 = SpatialContinuumDarcyBesselAndCriEngine.calculate_cri_and_biophysical_sanctuary(
        pattern="solid", tp53="mut", rb1="mut", stroma="dense"
    )
    assert tier1["cri_score"] == 0.0
    assert "TIER 1" in tier1["risk_tier"]
    assert 0.30 <= tier2["cri_score"] <= 0.65
    assert "TIER 2" in tier2["risk_tier"]
    assert tier3["cri_score"] == 1.0
    assert "TIER 3" in tier3["risk_tier"]
    assert tier3["sanctuary_shell_delta_r_um"] > tier1["sanctuary_shell_delta_r_um"]


def test_end_to_end_21_repo_integration_receipt() -> None:
    receipt = run_physics_biophysics_and_oncology_21_repo_integration()
    assert receipt["two_pass_status"] == "PASS_ALL_21_UNIQUE_REPOS_VERIFIED"
    assert receipt["total_urls_reviewed"] == 22
    assert receipt["unique_repositories_integrated"] == 21
    assert len(receipt["repos"]) == 21
    audit_file = REPO_ROOT / "data" / "audits" / "physics_biophysics_and_oncology_21_repo_integration_2026_11_07.json"
    assert audit_file.exists()

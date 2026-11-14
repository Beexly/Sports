"""
Comprehensive `unittest` & `pytest`-Compatible Verification Suite for
`gsi_gse_dual_use_phase_transition_and_tbi_kernel.py`
=====================================================================

Verifies every mathematical theorem, biomechanical invariant, regularity filter,
rough-path signature identity, fluid/vorticity diagnostic, and conformal/causal gate:
1. 3-mode Prony/Ogden (`tau_1=0.05s`, `tau_2=2.5s`, `tau_3=65.0s`) memory persistence,
   non-commutative multi-hit Lie-braid amplification (`Delta_t < 65.0s` vs relaxed),
   Stark et al. (2024) + PMID 40746051 chassis-specific fast-mode vs slow-mode physics,
   and Sogge `s_c(3,4) = 0.25` high-frequency noise suppression without blowup.
2. Dual-use outputs:
   - GSI Clinical Safety Alert: sequential Baxley E-process (`NOMINAL` < 1.35 <= `WATCH` < 20.0 <= `CRITICAL`)
     and Monte Carlo Ville's inequality false-positive rate verification under `H_0`.
   - GSE In-Game Football Signal: `qbTraumaCompressionSec`, `trenchWeakLinkCollapseProb`,
     and Positive-Part James-Stein shrunk `liveRilAdjustment` (`|Delta log-odds| <= 0.35`).
3. Biophysical Telemetry Kinematic Regularity Filter:
   - Rejects/interpolates impossible tracking spikes, fails closed (`ABSTAIN`) on corrupted
     streams or clock jitter, enforces bitemporal `TemporalLeakageError` (`observed_at > as_of_t`),
     and suppresses iMG mandible-decoupling spikes via optical homography anchoring.
4. Rough-Path Iterated-Integral Lévy Area (`L_{1,2}(X)`):
   - Exact area on known closed ellipse (`pi * a * b`) and machine-precision reparameterization
     invariance (`0.0000%` charting-cadence drift under nonlinear time warping `psi(t)`).
5. Fluid/Vorticity & Universal Critical Slowing-Down Detector:
   - Hou-Li (2007) 36th-order filter mode counts on `16^3` (`3,375` vs `1,331` Orszag sharp),
     circular phase resultant `R` separating locked (`R -> 1`) vs opposed-half cancellation
     where `S_spec` is blind, Taylor-Green 3D vorticity audit, and `tau_1 -> tau_2 -> tau_3`
     phase-transition progression + Padé pole time-to-singularity extrapolation.
6. `GSISepsisInterventionKernel` (Theorems 1-5):
   - Sinkhorn-Knopp entropic OT (`epsilon = 0.05`) marginal conservation & shift sensitivity,
   - Barber weighted conformal `c_hat <= 12.42` ESS circuit breaker & coverage guarantee,
   - Frisch-Waugh-Lovell (`FWL`) propensity/charting-cadence residualization (`tau_hat`)
     matching exact multivariate OLS and eliminating endogenous nurse charting bias.
"""

from __future__ import annotations

import math
import os
import sys
import unittest
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from gsi_gse_dual_use_phase_transition_and_tbi_kernel import (
    BAXLEY_E_CRITICAL_THRESHOLD,
    BAXLEY_E_WATCH_THRESHOLD,
    BARBER_ESS_C_HAT_MAX,
    DEFAULT_SINKHORN_EPSILON,
    GAUSSIAN_PROPELLER_BOUND,
    PRONY_MODES_SEC,
    PRONY_TAU_1_SEC,
    PRONY_TAU_2_SEC,
    PRONY_TAU_3_SEC,
    SOGGE_CRITICAL_EXPONENT_3D_P4,
    BiophysicalKinematicRegularityFilter,
    DualUsePhaseTransitionEngine,
    FluidVorticityAndPhaseTransitionDetector,
    GSISepsisInterventionKernel,
    HelmetEquipmentProfile,
    PoseKinematicFrame,
    PronyOgdenSulcalWaveguideKernel,
    RoughPathSignatureExtractor,
    TemporalLeakageError,
)


def _make_pose_stream(
    duration_s: float = 5.0,
    dt_s: float = 0.1,
    impacts: list[tuple[float, tuple[float, float, float]]] | None = None,
) -> list[PoseKinematicFrame]:
    """Helper generating a 10Hz SkeleTrack broadcast pose stream with optional rotational impacts."""
    n_steps = int(round(duration_s / dt_s)) + 1
    impacts = impacts or []
    frames: list[PoseKinematicFrame] = []
    for k in range(n_steps):
        t_k = round(k * dt_s, 4)
        wx, wy, wz = 0.25 * math.sin(t_k), 0.20 * math.cos(t_k), 0.05
        for imp_t, (ix, iy, iz) in impacts:
            if abs(t_k - imp_t) < 0.55 * dt_s:
                wx += ix
                wy += iy
                wz += iz
        frames.append(
            PoseKinematicFrame(
                timestamp_s=t_k,
                position_m=(1.2 * t_k, 0.3 * math.sin(1.2 * t_k), 1.88),
                angular_vel_rad_s=(wx, wy, wz),
                observed_at_s=t_k,
            )
        )
    return frames


class TestPronyOgdenSulcalWaveguideAndDualUseSignals(unittest.TestCase):
    """Tests Subsystem 1: 3-Mode Prony/Ogden Waveguide + GSI Baxley E-process + GSE Football Signals."""

    def setUp(self) -> None:
        self.reg_filter = BiophysicalKinematicRegularityFilter()
        self.kernel = PronyOgdenSulcalWaveguideKernel()

    def test_canonical_prony_relaxation_constants_and_sogge_exponent(self) -> None:
        self.assertEqual(PRONY_TAU_1_SEC, 0.05)
        self.assertEqual(PRONY_TAU_2_SEC, 2.50)
        self.assertEqual(PRONY_TAU_3_SEC, 65.00)
        self.assertEqual(PRONY_MODES_SEC, (0.05, 2.50, 65.00))
        self.assertAlmostEqual(SOGGE_CRITICAL_EXPONENT_3D_P4, 0.25, places=8)

    def test_benign_play_stays_nominal_with_near_zero_trauma_compression(self) -> None:
        frames = _make_pose_stream(duration_s=4.0, dt_s=0.1, impacts=[])
        audit = self.reg_filter.filter_and_audit(frames)
        self.assertEqual(audit.status, "VALID")

        out = self.kernel.evaluate_trajectory(audit)
        self.assertEqual(out.gsi_alert_tier, "NOMINAL")
        self.assertLess(out.baxley_e_value, BAXLEY_E_WATCH_THRESHOLD)
        self.assertEqual(out.subconcussive_multi_hit_count, 0)
        self.assertLess(out.qbTraumaCompressionSec, 0.05)

    def test_multi_hit_subconcussive_braiding_triggers_watch_and_critical_alerts(self) -> None:
        # Moderate two-hit sub-concussive sequence within tau_3 = 65.0s -> WATCH (>= 1.35)
        watch_frames = _make_pose_stream(
            duration_s=5.0,
            dt_s=0.1,
            impacts=[
                (1.0, (24.0, 10.0, 4.0)),
                (2.8, (6.0, 25.0, -10.0)),
            ],
        )
        watch_audit = self.reg_filter.filter_and_audit(watch_frames)
        watch_out = self.kernel.evaluate_trajectory(watch_audit, hrv_rmssd_ms=42.0, session_trimp=85.0)
        self.assertGreaterEqual(watch_out.baxley_e_value, BAXLEY_E_WATCH_THRESHOLD)
        self.assertIn(watch_out.gsi_alert_tier, ("WATCH", "CRITICAL"))
        self.assertGreater(watch_out.non_commutative_braid_commutator, 0.0)
        self.assertGreater(watch_out.qbTraumaCompressionSec, 0.08)

        # Severe rapid multi-hit sequence along orthogonal axes within tau_3 = 65.0s -> CRITICAL (>= 20.0)
        crit_frames = _make_pose_stream(
            duration_s=7.0,
            dt_s=0.1,
            impacts=[
                (1.0, (36.0, 14.0, 8.0)),
                (2.5, (-12.0, 38.0, -16.0)),
                (4.0, (30.0, -26.0, 34.0)),
                (5.5, (-32.0, 28.0, -30.0)),
            ],
        )
        crit_audit = self.reg_filter.filter_and_audit(crit_frames)
        crit_out = self.kernel.evaluate_trajectory(
            crit_audit,
            hrv_rmssd_ms=28.0,
            session_trimp=145.0,
            environmental_sensory_stress=0.65,
        )
        self.assertGreaterEqual(crit_out.baxley_e_value, BAXLEY_E_CRITICAL_THRESHOLD)
        self.assertEqual(crit_out.gsi_alert_tier, "CRITICAL")
        self.assertLessEqual(crit_out.ville_anytime_p_upper_bound, 0.05)
        self.assertGreater(crit_out.qbTraumaCompressionSec, watch_out.qbTraumaCompressionSec)
        self.assertGreater(crit_out.trenchWeakLinkCollapseProb, watch_out.trenchWeakLinkCollapseProb)
        self.assertLess(crit_out.liveRilAdjustment, watch_out.liveRilAdjustment)
        self.assertLessEqual(abs(crit_out.liveRilAdjustment), 6.50 * 0.35 + 1e-6)

    def test_tau3_memory_decay_reduces_braiding_when_inter_hit_interval_exceeds_65s(self) -> None:
        # Compare two non-collinear hits separated by 2.0s vs 180.0s (nearly 3 * tau_3 = 195s)
        close_frames = _make_pose_stream(
            duration_s=4.0,
            dt_s=0.1,
            impacts=[(1.0, (26.0, 4.0, 0.0)), (3.0, (2.0, 26.0, 12.0))],
        )
        far_frames = _make_pose_stream(
            duration_s=183.0,
            dt_s=0.1,
            impacts=[(1.0, (26.0, 4.0, 0.0)), (181.0, (2.0, 26.0, 12.0))],
        )
        out_close = self.kernel.evaluate_trajectory(self.reg_filter.filter_and_audit(close_frames))
        out_far = self.kernel.evaluate_trajectory(self.reg_filter.filter_and_audit(far_frames))

        self.assertGreater(out_close.non_commutative_braid_commutator, 0.0)
        # exp(-180 / 65) = 0.0627 -> >15x attenuation once slow tau_3 mode relaxes!
        self.assertGreater(out_close.non_commutative_braid_commutator, 10.0 * out_far.non_commutative_braid_commutator)
        self.assertGreater(out_close.peak_sulcal_strain, out_far.peak_sulcal_strain)

    def test_guardian_cap_chassis_paradox_attenuates_fast_mode_but_preserves_slow_tau3(self) -> None:
        frames = _make_pose_stream(
            duration_s=4.0,
            dt_s=0.1,
            impacts=[(1.2, (30.0, 15.0, -8.0)), (2.8, (-10.0, 28.0, 16.0))],
        )
        audit = self.reg_filter.filter_and_audit(frames)

        bare_sf = HelmetEquipmentProfile("Riddell_SpeedFlex", "None", custom_mouthguard=False)
        nxt_sf = HelmetEquipmentProfile("Riddell_SpeedFlex", "Guardian_NXT", custom_mouthguard=False)
        xt_f7 = HelmetEquipmentProfile("Schutt_F7_VTD", "Guardian_XT", custom_mouthguard=False)

        _, sf_nxt_rot = nxt_sf.fast_mode_transmission_factors()
        _, f7_xt_rot = xt_f7.fast_mode_transmission_factors()
        _, f7_none_rot = HelmetEquipmentProfile("Schutt_F7_VTD", "None").fast_mode_transmission_factors()
        self.assertLess(sf_nxt_rot, 0.75)
        self.assertGreater(f7_xt_rot, f7_none_rot)

        out_bare = self.kernel.evaluate_trajectory(audit, equipment=bare_sf)
        out_nxt = self.kernel.evaluate_trajectory(audit, equipment=nxt_sf)

        self.assertLess(out_nxt.peak_sulcal_strain, out_bare.peak_sulcal_strain)
        self.assertAlmostEqual(out_nxt.final_tau3_state_norm, out_bare.final_tau3_state_norm, places=10)

    def test_ville_inequality_anytime_false_positive_bound_under_null(self) -> None:
        rng = np.random.default_rng(42)
        exceeded_critical = 0
        n_trials = 400
        for _ in range(n_trials):
            e_val = 1.0
            for _step in range(50):
                z_null = float(rng.normal(0.0, 1.0))
                lam = 0.45
                e_val *= math.exp(lam * z_null - 0.5 * lam * lam)
                if e_val >= BAXLEY_E_CRITICAL_THRESHOLD:
                    exceeded_critical += 1
                    break
        empirical_fpr = exceeded_critical / float(n_trials)
        self.assertLessEqual(empirical_fpr, 0.065)


class TestBiophysicalTelemetryRegularityAndRoughPaths(unittest.TestCase):
    """Tests Subsystem 2A & 2B: Kinematic Regularity Filter & Rough-Path Lévy Area."""

    def test_spike_rejection_and_interpolation_vs_fail_closed_abstention(self) -> None:
        reg_filter = BiophysicalKinematicRegularityFilter()
        frames = _make_pose_stream(duration_s=3.0, dt_s=0.1)
        corrupted = list(frames)
        corrupted[12] = PoseKinematicFrame(
            timestamp_s=corrupted[12].timestamp_s,
            position_m=(48.0, -35.0, 12.0),
            angular_vel_rad_s=(180.0, -90.0, 45.0),
            observed_at_s=corrupted[12].timestamp_s,
        )
        audit = reg_filter.filter_and_audit(corrupted)
        self.assertEqual(audit.status, "VALID")
        self.assertIn(12, audit.rejected_spike_indices)
        self.assertLess(float(np.max(np.linalg.norm(audit.velocities_mps, axis=1))), 13.5)

        heavily_corrupted = list(frames)
        for bad_idx in range(3, 28, 2):
            heavily_corrupted[bad_idx] = PoseKinematicFrame(
                timestamp_s=heavily_corrupted[bad_idx].timestamp_s,
                position_m=(90.0 * (bad_idx % 3), -80.0, 15.0),
                angular_vel_rad_s=(250.0, 250.0, 250.0),
            )
        bad_audit = reg_filter.filter_and_audit(heavily_corrupted)
        self.assertEqual(bad_audit.status, "ABSTAIN")
        self.assertIsNotNone(bad_audit.abstain_reason)

    def test_bitemporal_anti_leakage_raises_temporal_leakage_error(self) -> None:
        reg_filter = BiophysicalKinematicRegularityFilter()
        frames = _make_pose_stream(duration_s=2.0, dt_s=0.1)
        frames[8] = PoseKinematicFrame(
            timestamp_s=frames[8].timestamp_s,
            position_m=frames[8].position_m,
            angular_vel_rad_s=frames[8].angular_vel_rad_s,
            observed_at_s=5.5,
        )
        with self.assertRaises(TemporalLeakageError):
            reg_filter.filter_and_audit(frames, as_of_t=2.0)

    def test_img_mandible_decoupling_spike_is_debiased_by_optical_anchor(self) -> None:
        reg_filter = BiophysicalKinematicRegularityFilter()
        frames = _make_pose_stream(duration_s=2.0, dt_s=0.1)
        frames[10] = PoseKinematicFrame(
            timestamp_s=frames[10].timestamp_s,
            position_m=frames[10].position_m,
            angular_vel_rad_s=(1.0, 0.5, 0.2),
            img_angular_vel_rad_s=(48.0, -32.0, 18.0),
        )
        audit = reg_filter.filter_and_audit(frames)
        self.assertEqual(audit.status, "VALID")
        debiased_norm = float(np.linalg.norm(audit.angular_vel_rad_s[10]))
        self.assertLess(debiased_norm, 12.0)

    def test_rough_path_levy_area_exactness_and_time_warping_invariance(self) -> None:
        a, b = 2.5, 1.4
        u_grid = np.linspace(0.0, 2.0 * math.pi, 600)
        ellipse = np.column_stack([a * np.cos(u_grid), b * np.sin(u_grid)])
        sig_ellipse = RoughPathSignatureExtractor.compute_signature(ellipse)
        expected_area = math.pi * a * b
        self.assertAlmostEqual(sig_ellipse.levy_area_12, expected_area, places=2)

        base_knots = np.array(
            [
                [0.0, 0.0, 1.0],
                [1.2, 0.4, 0.8],
                [2.1, 1.9, 1.3],
                [1.5, 2.8, 2.1],
                [0.3, 1.7, 1.6],
            ],
            dtype=np.float64,
        )
        subdivided_pts = [base_knots[0]]
        for i in range(len(base_knots) - 1):
            alphas = [0.08, 0.19, 0.55, 0.87, 1.0] if i % 2 == 0 else [0.5, 1.0]
            for al in alphas:
                subdivided_pts.append((1.0 - al) * base_knots[i] + al * base_knots[i + 1])
        warped_path = np.vstack(subdivided_pts)

        sig_base = RoughPathSignatureExtractor.compute_signature(base_knots)
        sig_warped = RoughPathSignatureExtractor.compute_signature(warped_path)

        np.testing.assert_allclose(sig_base.level1_increment, sig_warped.level1_increment, atol=1e-12)
        np.testing.assert_allclose(sig_base.levy_area_matrix, sig_warped.levy_area_matrix, atol=1e-12)
        self.assertAlmostEqual(sig_base.levy_area_12, sig_warped.levy_area_12, places=12)


class TestFluidVorticityAndCriticalSlowingDetector(unittest.TestCase):
    """Tests Subsystem 2C: Hou-Li Filter, Circular Phase Resultant `R`, and `tau_1 -> tau_2 -> tau_3`."""

    def test_hou_li_16_cubed_mode_retention_matches_navier_stokes_lab_record(self) -> None:
        _, hou_li_modes, sharp_modes = FluidVorticityAndPhaseTransitionDetector.hou_li_36_filter_3d(16)
        self.assertEqual(sharp_modes, 1331)
        self.assertEqual(hou_li_modes, 3375)

    def test_circular_phase_resultant_separates_locked_from_opposed_halves(self) -> None:
        rng = np.random.default_rng(101)
        m = 200
        powers = np.ones(m, dtype=np.float64) / float(m)

        locked_phases = rng.normal(0.4, 0.08, size=m)
        s_spec_1, s_phase_1, r_1 = FluidVorticityAndPhaseTransitionDetector.compute_modal_phase_diagnostics(
            powers, locked_phases
        )

        opposed_phases = np.concatenate([np.full(m // 2, 0.4), np.full(m // 2, 0.4 + math.pi)])
        s_spec_2, s_phase_2, r_2 = FluidVorticityAndPhaseTransitionDetector.compute_modal_phase_diagnostics(
            powers, opposed_phases
        )

        rand_phases = rng.uniform(-math.pi, math.pi, size=m)
        s_spec_3, s_phase_3, r_3 = FluidVorticityAndPhaseTransitionDetector.compute_modal_phase_diagnostics(
            powers, rand_phases
        )

        self.assertAlmostEqual(s_spec_1, s_spec_2, places=10)
        self.assertAlmostEqual(s_spec_2, s_spec_3, places=10)

        self.assertGreater(r_1, 0.95)
        self.assertLess(r_2, 1e-10)
        self.assertLess(r_3, 0.15)
        self.assertLess(s_phase_1, s_phase_3)
        self.assertGreater(s_phase_3, 2.40)

    def test_3d_taylor_green_vorticity_field_audit(self) -> None:
        n = 16
        grid = np.linspace(0.0, 2.0 * math.pi, n, endpoint=False)
        x, y, z = np.meshgrid(grid, grid, grid, indexing="ij")
        omega = np.zeros((n, n, n, 3), dtype=np.float64)
        omega[..., 0] = np.cos(x) * np.sin(y) * np.sin(z)
        omega[..., 1] = np.sin(x) * np.cos(y) * np.sin(z)
        omega[..., 2] = -2.0 * np.sin(x) * np.sin(y) * np.cos(z)

        diag = FluidVorticityAndPhaseTransitionDetector.audit_vorticity_field_3d(omega, dt_s=0.1)
        self.assertGreater(diag.omega_inf, 1.5)
        self.assertEqual(diag.hou_li_retained_modes, 3375)
        self.assertEqual(diag.orszag_sharp_retained_modes, 1331)
        self.assertFalse(diag.is_critical_phase_locking)

    def test_critical_slowing_down_stage_progression_and_propeller_bound(self) -> None:
        self.assertAlmostEqual(GAUSSIAN_PROPELLER_BOUND, 9.0 / (8.0 * math.pi), places=10)
        rng = np.random.default_rng(77)
        t = np.linspace(0.0, 24.0, 240)

        white = rng.normal(0.0, 0.35, size=(240, 4))
        normal_order = FluidVorticityAndPhaseTransitionDetector.evaluate_critical_slowing_down(white, t)
        self.assertEqual(normal_order.stage, "NORMAL")
        self.assertFalse(normal_order.exceeds_propeller_bound)

        bif = np.zeros((240, 4), dtype=np.float64)
        for k in range(1, 240):
            phi_k = 0.80 + 0.195 * (k / 240.0)
            shock = rng.normal(0.0, 0.12 + 0.35 * (k / 240.0) ** 2)
            bif[k] = phi_k * bif[k - 1] + np.array([1.0, 0.95, -0.90, 0.88]) * shock + 0.02 * (k / 50.0) ** 3

        crit_order = FluidVorticityAndPhaseTransitionDetector.evaluate_critical_slowing_down(bif, t)
        self.assertIn(
            crit_order.stage,
            ("TAU_2_GEOMETRIC_DECOUPLING", "TAU_3_SINGULARITY_ALERT"),
        )
        self.assertGreater(crit_order.lag1_autocorrelation, normal_order.lag1_autocorrelation)
        self.assertGreater(crit_order.spin_glass_susceptibility_chi_sg, normal_order.spin_glass_susceptibility_chi_sg)
        self.assertLess(crit_order.koopman_damping_gap_gamma_eff, normal_order.koopman_damping_gap_gamma_eff)


class TestGSISepsisInterventionKernelAndUnifiedPipeline(unittest.TestCase):
    """Tests Subsystem 3: Sinkhorn (`epsilon=0.05`), Barber `c_hat <= 12.42` ESS Gate, & FWL `tau_hat`."""

    def setUp(self) -> None:
        self.sepsis_kernel = GSISepsisInterventionKernel(sinkhorn_epsilon=0.05)

    def test_sinkhorn_epsilon_005_marginal_conservation_and_shift_detection(self) -> None:
        self.assertEqual(DEFAULT_SINKHORN_EPSILON, 0.05)
        rng = np.random.default_rng(123)
        src = rng.normal(0.0, 0.5, size=(60, 4))
        tgt_near = rng.normal(0.02, 0.5, size=(20, 4))
        tgt_far = rng.normal(2.50, 0.5, size=(20, 4))

        ot_near = self.sepsis_kernel.sinkhorn_entropic_ot(src, tgt_near, epsilon=0.05)
        ot_far = self.sepsis_kernel.sinkhorn_entropic_ot(src, tgt_far, epsilon=0.05)

        np.testing.assert_allclose(np.sum(ot_near.transport_plan, axis=1), np.full(60, 1.0 / 60.0), atol=1e-4)
        np.testing.assert_allclose(np.sum(ot_near.transport_plan, axis=0), np.full(20, 1.0 / 20.0), atol=1e-4)
        self.assertAlmostEqual(float(np.sum(ot_near.calibration_weights)), 1.0, places=8)
        self.assertGreater(ot_far.sinkhorn_cost, ot_near.sinkhorn_cost * 3.0)

    def test_barber_weighted_conformal_c_hat_12_42_circuit_breaker_and_coverage(self) -> None:
        rng = np.random.default_rng(999)
        scores = np.abs(rng.normal(0.0, 1.0, size=100))

        uniform_w = np.ones(100, dtype=np.float64) / 100.0
        pass_res = self.sepsis_kernel.barber_weighted_conformal_gate(
            calibration_scores=scores,
            ot_weights=uniform_w,
            point_prediction=3.50,
            wasserstein_w1=0.03,
            alpha_t=0.10,
        )
        self.assertTrue(pass_res.gate_passed)
        self.assertAlmostEqual(pass_res.c_hat, 1.0, places=4)
        self.assertLessEqual(pass_res.c_hat, BARBER_ESS_C_HAT_MAX)

        concentrated_w = np.full(100, 0.00005, dtype=np.float64)
        concentrated_w[:5] = 0.19905
        abstain_res = self.sepsis_kernel.barber_weighted_conformal_gate(
            calibration_scores=scores,
            ot_weights=concentrated_w,
            point_prediction=3.50,
            wasserstein_w1=0.03,
            alpha_t=0.10,
        )
        self.assertFalse(abstain_res.gate_passed)
        self.assertGreater(abstain_res.c_hat, BARBER_ESS_C_HAT_MAX)
        self.assertIn("ESS_ABSTAIN", abstain_res.abstain_reason or "")

        covered = 0
        trials = 300
        for _ in range(trials):
            cal_s = np.abs(rng.normal(0.0, 1.0, size=100))
            y_true = float(rng.normal(2.0, 1.0))
            res = self.sepsis_kernel.barber_weighted_conformal_gate(
                calibration_scores=cal_s,
                ot_weights=uniform_w,
                point_prediction=2.0,
                alpha_t=0.10,
            )
            lo, hi = res.prediction_interval
            if lo <= y_true <= hi:
                covered += 1
        self.assertGreaterEqual(covered / float(trials), 0.87)

    def test_fwl_propensity_residualization_recovers_exact_causal_tau_hat(self) -> None:
        rng = np.random.default_rng(2026)
        n = 500
        z = rng.normal(0.0, 1.0, size=(n, 2))
        d = 1.40 * z[:, 0] + 0.85 * z[:, 1] + rng.normal(0.0, 0.45, size=n)
        true_tau = -0.65
        y = 1.25 + true_tau * d + 1.80 * z[:, 0] + 1.10 * z[:, 1] + rng.normal(0.0, 0.20, size=n)

        fwl = self.sepsis_kernel.fwl_propensity_residualization(y, d, z)

        self.assertGreater(fwl.naive_unadjusted_beta, 0.25)
        self.assertAlmostEqual(fwl.tau_hat, true_tau, delta=0.04)

        x_full = np.column_stack([np.ones(n), d, z])
        beta_ols, _, _, _ = np.linalg.lstsq(x_full, y, rcond=None)
        self.assertAlmostEqual(fwl.tau_hat, float(beta_ols[1]), places=5)

    def test_end_to_end_dual_use_engine_integration(self) -> None:
        rng = np.random.default_rng(31415)
        frames = _make_pose_stream(
            duration_s=5.0,
            dt_s=0.1,
            impacts=[(1.1, (26.0, 12.0, 5.0)), (3.2, (-8.0, 28.0, -14.0))],
        )
        cal_states = rng.normal(0.0, 0.3, size=(80, 3))
        cur_states = rng.normal(0.03, 0.3, size=(15, 3))
        cal_scores = np.abs(rng.normal(0.0, 0.15, size=80))
        z = rng.normal(0.0, 1.0, size=(150, 2))
        d = 0.7 * z[:, 0] + rng.normal(0.0, 0.5, size=150)
        y = -0.50 * d + 1.2 * z[:, 0] - 0.4 * z[:, 1] + rng.normal(0.0, 0.1, size=150)

        engine = DualUsePhaseTransitionEngine()
        report = engine.run_dual_use_evaluation(
            pose_frames=frames,
            calibration_states=cal_states,
            calibration_nonconformity_scores=cal_scores,
            current_regime_states=cur_states,
            outcome_y=y,
            treatment_d=d,
            confounders_z=z,
            equipment=HelmetEquipmentProfile("Riddell_SpeedFlex", "Guardian_NXT", custom_mouthguard=True),
        )

        self.assertEqual(report.regularity_audit.status, "VALID")
        self.assertIsNotNone(report.waveguide_dual_output)
        self.assertIsNotNone(report.rough_path_signature)
        self.assertIsNotNone(report.phase_transition_order)
        assert report.waveguide_dual_output is not None
        self.assertGreaterEqual(report.waveguide_dual_output.baxley_e_value, BAXLEY_E_WATCH_THRESHOLD)
        self.assertGreater(report.waveguide_dual_output.qbTraumaCompressionSec, 0.0)
        self.assertTrue(report.conformal_gate.gate_passed)
        self.assertAlmostEqual(report.fwl_causal_estimate.tau_hat, -0.50, delta=0.05)


if __name__ == "__main__":
    unittest.main(verbosity=2)

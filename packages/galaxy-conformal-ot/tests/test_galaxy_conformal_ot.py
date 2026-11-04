"""
tests/test_galaxy_conformal_ot.py
=================================
Automated Invariant Verification Suite for galaxy_conformal_ot package.

Verifies:
1. 288-bit context masking and Cholesky spectral whitening invariants.
2. Exact finite-sample conformal order statistics & Fréchet-Hoeffding non-clamping gates.
3. Sinkhorn-Knopp entropic optimal transport mass conservation sum(P) = 1.0.
4. Distributed-lag kinematic workload and injury hazard calculations.
5. Deterministic reproducibility across repeated executions.
"""

import math
import numpy as np
import pytest

from galaxy_conformal_ot import (
    build_context_mask_288,
    mask_to_words,
    cholesky_spectral_whitening,
    positive_part_james_stein_shrinkage,
    SpectralCognitiveRouter,
    conformal_finite_sample_rank,
    asymmetric_tacqr_score,
    check_frechet_hoeffding_bounds,
    assert_frechet_hoeffding_bounds,
    slow_75_conformal_kelly_stake,
    ConformalCopulaSizer,
    sinkhorn_knopp_reallocate,
    assert_pbp_conservation,
    EntropicOptimalTransport,
    compute_acwr_ratio,
    distributed_lag_kinematic_workload,
    evaluate_injury_survival_hazard,
    KinematicHazardModel,
    compute_critical_slowing_down_index,
    compute_expected_free_energy,
    solve_schrodinger_bridge_trajectory,
    AdversarialSchrodingerActiveHazardEngine
)


class TestSpectralCognitiveRouter:
    """Module 1 Verification."""
    
    def test_context_mask_288_bitfield(self):
        signals = [
            {"family": 0, "displacement": 0.05, "n": 45},
            {"family": 35, "displacement": -0.12, "n": 50},  # Word 1, bit 3
            {"family": 278, "displacement": 0.08, "n": 100}, # Word 8, bit 22
            {"family": 10, "displacement": 0.0, "n": 50},    # Zero displacement -> not set
            {"family": 12, "displacement": 0.05, "n": 10}    # Thin sample -> not set
        ]
        mask = build_context_mask_288(signals)
        assert len(mask) == 9
        words = mask_to_words(mask)
        assert words[0] & (1 << 0) != 0
        assert words[1] & (1 << 3) != 0
        assert words[8] & (1 << 22) != 0
        assert words[0] & (1 << 10) == 0
        assert words[0] & (1 << 12) == 0

    def test_cholesky_whitening_with_epsilon_ridge(self):
        # Test that singular or near-singular covariance does NOT crash (remediating Oct 22 early-abort)
        deltas = np.array([0.05, 0.02, -0.04, 0.01, 0.03, -0.01])
        singular_cov = np.ones((6, 6)) * 0.99
        np.fill_diagonal(singular_cov, 1.0)
        
        whitened, L = cholesky_spectral_whitening(deltas, singular_cov, epsilon_ridge=1e-5)
        assert whitened.shape == (6,)
        assert np.all(np.isfinite(whitened))

    def test_james_stein_log_odds_cap(self):
        router = SpectralCognitiveRouter()
        extreme_deltas = np.array([0.80, 0.90, 0.70, 0.85, 0.95, 0.60])
        res = router.route_and_calibrate(anchor_prob=0.50, raw_deltas=extreme_deltas)
        
        assert abs(res["capped_log_odds"]) <= 0.35
        assert abs(res["calibrated_prob"] - 0.50) <= 0.12
        assert res["cap_applied"] is True


class TestConformalCopulaSizer:
    """Module 2 Verification."""
    
    def test_exact_finite_sample_rank(self):
        # Shafer & Vovk (2008): rank = ceil((n+1)(1-epsilon))
        n = 100
        epsilon = 0.10
        rank = conformal_finite_sample_rank(n, epsilon)
        assert rank == math.ceil(101 * 0.90)  # ceil(90.9) = 91

    def test_frechet_hoeffding_non_clamping_rejection(self):
        pa = 0.60
        pb = 0.70
        # Frechet bounds: lower = max(0, 0.6 + 0.7 - 1) = 0.30, upper = min(0.6, 0.7) = 0.60
        assert check_frechet_hoeffding_bounds(pa, pb, 0.45)[0] is True
        assert check_frechet_hoeffding_bounds(pa, pb, 0.25)[0] is False  # Below lower bound
        assert check_frechet_hoeffding_bounds(pa, pb, 0.65)[0] is False  # Above upper bound
        
        # Verify strict exception thrown on invalid joint probability (No clamping!)
        with pytest.raises(ValueError, match="Axiomatic Copula Invariant Violation"):
            assert_frechet_hoeffding_bounds(pa, pb, 0.75)

    def test_slow_75_conformal_kelly(self):
        # Positive edge case with full Kelly lambda = 1.0, p = 0.55, b = 1.0
        f_stake = slow_75_conformal_kelly_stake(
            p=0.55,
            b=1.0,
            sigma_conf_75=0.06,
            d_break=0.03,
            alpha_down=0.10,
            lambda_kelly=1.0
        )
        assert f_stake > 0.0
        assert f_stake == pytest.approx(0.55 - 0.45 * (1.0 + 2.0 * 0.06**2), abs=1e-3)
        
        # Negative edge case (p = 0.40, b = 1.0) results in zero stake
        f_negative_edge = slow_75_conformal_kelly_stake(
            p=0.40,
            b=1.0,
            sigma_conf_75=0.06,
            d_break=0.03,
            alpha_down=0.10,
            lambda_kelly=1.0
        )
        assert f_negative_edge == 0.0
        
        # When d_break >= 2 * alpha_down, throttle reaches exactly 0.0 (downside reaches 0)
        f_zero_throttle = slow_75_conformal_kelly_stake(
            p=0.55,
            b=1.0,
            sigma_conf_75=0.06,
            d_break=0.25,
            alpha_down=0.10,
            lambda_kelly=1.0
        )
        assert f_zero_throttle == pytest.approx(0.55, abs=1e-6)


class TestEntropicOptimalTransport:
    """Module 3 Verification."""
    
    def test_sinkhorn_mass_conservation_on_agent_dropout(self):
        eot = EntropicOptimalTransport(tau=0.42)
        initial_weights = np.array([0.28, 0.22, 0.18, 0.17, 0.15])
        assert abs(np.sum(initial_weights) - 1.0) < 1e-9
        
        # Agent 0 drops out (e.g., injury or failure)
        res = eot.reallocate_on_agent_dropout(initial_weights, failed_agent_index=0)
        reallocated = res["reallocated_weights"]
        
        # Dropped agent mass must be 0
        assert reallocated[0] == 0.0
        # Total mass must be exactly conserved at 1.0
        assert abs(np.sum(reallocated) - 1.0) <= 1e-6
        assert res["conserved_sum"] == pytest.approx(1.0, abs=1e-6)

    def test_sinkhorn_knopp_matrix_marginals(self):
        a = np.array([0.4, 0.6])
        b = np.array([0.5, 0.5])
        C = np.array([[0.1, 0.8], [0.7, 0.2]])
        P = sinkhorn_knopp_reallocate(a, b, C, tau=0.5)
        
        assert abs(np.sum(P) - 1.0) < 1e-6
        np.testing.assert_allclose(np.sum(P, axis=1), a, atol=1e-5)
        np.testing.assert_allclose(np.sum(P, axis=0), b, atol=1e-5)


class TestKinematicHazardModel:
    """Module 4 Verification."""
    
    def test_acwr_calculation_and_hazard_zones(self):
        # Optimal load
        opt_hazard = evaluate_injury_survival_hazard(acwr=1.05, kinetic_impulse_kj=4.5)
        assert opt_hazard["clinical_risk_tier"] == "OPTIMAL_LOAD_ZONE"
        
        # Danger zone
        crit_hazard = evaluate_injury_survival_hazard(acwr=1.75, kinetic_impulse_kj=12.0)
        assert crit_hazard["clinical_risk_tier"] == "CRITICAL_INJURY_HAZARD"
        assert crit_hazard["hazard_multiplier"] > 3.0

    def test_distributed_lag_decay(self):
        workloads = [100.0, 95.0, 90.0, 110.0, 105.0]
        cum_load = distributed_lag_kinematic_workload(workloads, decay_lambda=0.15)
        assert 90.0 <= cum_load <= 110.0


class TestDeterministicReproducibility:
    """Martin Monperrus Gate 4: Deterministic grep & reproducibility verification."""
    
    def test_reproducibility_across_runs(self):
        router = SpectralCognitiveRouter()
        deltas = np.array([0.10, -0.05, 0.08, -0.02, 0.12, 0.01])
        res1 = router.route_and_calibrate(anchor_prob=0.52, raw_deltas=deltas)
        res2 = router.route_and_calibrate(anchor_prob=0.52, raw_deltas=deltas)
        
        assert res1["calibrated_prob"] == res2["calibrated_prob"]
        assert res1["capped_log_odds"] == res2["capped_log_odds"]
        np.testing.assert_allclose(res1["whitened_residuals"], res2["whitened_residuals"])


class TestAdversarialSchrodingerActiveHazardEngine:
    """Module 5 Verification: Dual-Use Sports TBI/ACL & Clinical ICU Sepsis Phase Transitions."""

    def test_critical_slowing_down_bifurcation_detection(self):
        # White noise fluctuations (healthy homeostasis) vs. strongly autocorrelated slowing-down trajectory
        healthy_series = [0.02, -0.03, 0.01, -0.02, 0.03, -0.01, 0.02, -0.02, 0.01, -0.01]
        bifurcating_series = [-0.8, -0.6, -0.4, -0.1, 0.2, 0.5, 0.9, 1.3, 1.8, 2.4]

        csd_healthy = compute_critical_slowing_down_index(healthy_series, baseline_variance=0.05)
        csd_crit = compute_critical_slowing_down_index(bifurcating_series, baseline_variance=0.05)

        assert csd_crit["lag1_autocorrelation"] > 0.70
        assert csd_crit["csd_bifurcation_score"] > csd_healthy["csd_bifurcation_score"] + 0.50

    def test_schrodinger_bridge_trajectory_mass_conservation(self):
        # 6-organ SOFA network or 6-man pass protection unit under acute shock redistribution
        mu_0 = [0.20, 0.20, 0.15, 0.15, 0.15, 0.15]
        mu_T = [0.42, 0.30, 0.12, 0.08, 0.05, 0.03]

        sb = solve_schrodinger_bridge_trajectory(mu_0, mu_T, tau=0.35)
        assert sb["conserved_mass"] == pytest.approx(1.0, abs=1e-6)
        assert sb["control_drift_energy"] > 0.0
        np.testing.assert_allclose(np.sum(sb["coupling_matrix"], axis=1), mu_0, atol=1e-5)
        np.testing.assert_allclose(np.sum(sb["coupling_matrix"], axis=0), mu_T, atol=1e-5)

    def test_dual_use_phase_transition_conformal_gate(self):
        engine = AdversarialSchrodingerActiveHazardEngine(alpha_false_alarm_bound=0.05, tau=0.35)
        calibration_scores = np.linspace(0.05, 0.45, 50)

        # Scenario A: Stable homeostatic physiological/biomechanical state (no false alarm)
        stable_res = engine.evaluate_phase_transition_warning(
            micro_fluctuation_series=[0.01, -0.01, 0.02, -0.02, 0.01, -0.01, 0.01, -0.01],
            baseline_variance=0.05,
            source_network_load=[0.20, 0.20, 0.20, 0.20, 0.20],
            stressed_network_load=[0.21, 0.19, 0.20, 0.20, 0.20],
            homeostatic_target_dist=[0.20, 0.20, 0.20, 0.20, 0.20],
            observation_ambiguity=[0.05, 0.05, 0.05, 0.05, 0.05],
            calibration_nonconformity_scores=calibration_scores
        )
        assert stable_res["phase_transition_alert"] is False
        assert stable_res["system_regime"] == "HOMEOSTATIC_STABLE"

        # Scenario B: Imminent Phase Transition (4th-Qtr TBI/ACL collision hazard OR ICU Septic Shock)
        crit_res = engine.evaluate_phase_transition_warning(
            micro_fluctuation_series=[-1.2, -0.9, -0.5, 0.1, 0.6, 1.2, 1.9, 2.7, 3.5, 4.4],
            baseline_variance=0.05,
            source_network_load=[0.20, 0.20, 0.20, 0.20, 0.20],
            stressed_network_load=[0.58, 0.27, 0.08, 0.04, 0.03],
            homeostatic_target_dist=[0.20, 0.20, 0.20, 0.20, 0.20],
            observation_ambiguity=[0.35, 0.30, 0.20, 0.15, 0.10],
            calibration_nonconformity_scores=calibration_scores
        )
        assert crit_res["phase_transition_alert"] is True
        assert crit_res["system_regime"] == "CRITICAL_PHASE_TRANSITION_IMMINENT"
        assert crit_res["composite_hazard_score"] > crit_res["conformal_threshold"]


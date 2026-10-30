"""
tests/intelligence/test_math_and_qb_matrix_2026_10_30.py
Verifies: intelligence/coaching/qb_disguise_blitz_matrix.py,
intelligence/math/effective_theory_and_large_deviations.py,
intelligence/math/vmls_and_numpy_kernels.py.
"""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from intelligence.coaching.qb_disguise_blitz_matrix import (
    QB_PROFILES_2026,
    TEAM_TO_QB_2026,
    evaluate_qb_matchup_2x2,
    encode_mnar_missingness,
    resolve_qb_profile,
    verify_roster_news_hygiene,
)
from intelligence.math.effective_theory_and_large_deviations import (
    compute_critical_initialization,
    cramer_large_deviation_tilt,
    fft_compound_poisson_pmf,
    layer_learning_rate_equivalence,
    levy_arcsine_lead_persistence,
    finite_width_posterior_coupling,
    inspection_paradox_debias,
    wigner_semicircle_marchenko_pastur_denoise,
    vector_field_operators_2d,
)
from intelligence.math.vmls_and_numpy_kernels import (
    kkt_constrained_least_squares,
    levenberg_marquardt,
    modified_gram_schmidt_qr,
    qr_least_squares,
    rolling_exp_decay_tendency,
    solve_opponent_adjusted_bayesian_ridge,
    unpadded_drive_reduceat,
)

import numpy as np


class TestQBDisguiseBlitzMatrix(unittest.TestCase):
    """2x2 QB Vulnerability Matrix + MNAR + Fake-News Quarantine."""

    def test_all_32_qb_profiles_present(self):
        expected = [
            "Patrick Mahomes", "Bo Nix", "Jalen Hurts", "Dak Prescott",
            "Drake Maye", "Sam Darnold", "Matthew Stafford", "C.J. Stroud",
            "Jordan Love", "Jared Goff", "Lamar Jackson", "Josh Allen",
            "Daniel Jones", "Justin Fields", "Baker Mayfield", "Justin Herbert",
            "Trevor Lawrence", "Spencer Rattler", "Geno Smith", "Joe Flacco",
            "Mac Jones", "Kyler Murray", "Caleb Williams", "Cam Ward",
            "Bryce Young", "Aaron Rodgers", "Tua Tagovailoa", "Jayden Daniels",
            "Kirk Cousins", "J.J. McCarthy", "Deshaun Watson", "Russell Wilson",
        ]
        for name in expected:
            self.assertIn(name, QB_PROFILES_2026, f"Missing QB profile: {name}")

    def test_mahomes_disguise_severe_negative(self):
        """Mahomes: Disguised = -0.234 EPA/DB, 4.96 YPA (severe negative)."""
        res = evaluate_qb_matchup_2x2("Patrick Mahomes", opp_disguise_rate=0.50, opp_blitz_rate=0.26)
        self.assertAlmostEqual(res["disguise_vulnerability_gap"], -0.481, places=3)
        self.assertLess(res["matchup_expected_epa_db"], res["baseline_epa_db"])

    def test_nix_blitz_catastrophic(self):
        """Nix: Disguised negative + Blitz catastrophic (-0.27 EPA, -18% CPOE)."""
        res = evaluate_qb_matchup_2x2("Bo Nix", opp_disguise_rate=0.38, opp_blitz_rate=0.36)
        self.assertLess(res["matchup_expected_epa_db"], 0.0)
        self.assertEqual(res["blitz_cpoe"], -18.0)

    def test_hurts_disguised_elite_blitz_negative(self):
        """Hurts: Disguised elite (+0.320), Blitz negative."""
        res = evaluate_qb_matchup_2x2("Jalen Hurts", opp_disguise_rate=0.50, opp_blitz_rate=0.30)
        self.assertGreater(res["disguise_vulnerability_gap"], 0.0)

    def test_maye_positive_all_quadrants(self):
        """Maye: positive across all quadrants."""
        res = evaluate_qb_matchup_2x2("Drake Maye", opp_disguise_rate=0.50, opp_blitz_rate=0.35)
        self.assertGreater(res["matchup_expected_epa_db"], 0.0)

    def test_love_positive_both_shells_mild_blitz_drag(self):
        """Love: positive on both shells, mild Blitz drag."""
        res = evaluate_qb_matchup_2x2("Jordan Love", opp_disguise_rate=0.50, opp_blitz_rate=0.30)
        self.assertGreater(res["matchup_expected_epa_db"], 0.0)

    def test_young_negative_across_all(self):
        """Young: negative across Static, Disguised, and Blitz."""
        res = evaluate_qb_matchup_2x2("Bryce Young", opp_disguise_rate=0.30, opp_blitz_rate=0.30)
        self.assertLess(res["matchup_expected_epa_db"], 0.0)

    def test_team_code_resolution(self):
        """resolve_qb_profile accepts team codes."""
        p = resolve_qb_profile("KC")
        self.assertEqual(p.qb_name, "Patrick Mahomes")
        p = resolve_qb_profile("GB")
        self.assertEqual(p.qb_name, "Jordan Love")
        p = resolve_qb_profile("CAR")
        self.assertEqual(p.qb_name, "Bryce Young")

    def test_int_and_sack_multipliers(self):
        """int_prob_multiplier and sack_prob_multiplier are present and bounded."""
        for name in QB_PROFILES_2026:
            res = evaluate_qb_matchup_2x2(name, 0.30, 0.30)
            self.assertGreaterEqual(res["int_prob_multiplier"], 0.80)
            self.assertLessEqual(res["int_prob_multiplier"], 1.35)
            self.assertGreaterEqual(res["sack_prob_multiplier"], 0.82)
            self.assertLessEqual(res["sack_prob_multiplier"], 1.30)

    def test_mnar_encoding(self):
        """MNAR: missing values become 0.0 with __is_missing_mnar=1.0."""
        out = encode_mnar_missingness({"a": None, "b": 5.0, "c": float("nan")})
        self.assertEqual(out["a"], 0.0)
        self.assertEqual(out["a__is_missing_mnar"], 1.0)
        self.assertEqual(out["b"], 5.0)
        self.assertEqual(out["b__is_missing_mnar"], 0.0)
        self.assertEqual(out["c"], 0.0)
        self.assertEqual(out["c__is_missing_mnar"], 1.0)

    def test_fake_news_quarantine_unverified(self):
        """Unverified source with no Tier-1 corroboration is quarantined."""
        result = verify_roster_news_hygiene(
            "Simmons traded to Bears", source_handle="@randomuser", corroborated_by=[]
        )
        self.assertFalse(result["allowed_into_engine"])
        self.assertEqual(result["status"], "FAKE_NEWS_QUARANTINE")

    def test_fake_news_quarantine_tier1(self):
        """Tier-1 insider passes the gate."""
        result = verify_roster_news_hygiene(
            "Injury report", source_handle="@adamschefter", corroborated_by=[]
        )
        self.assertTrue(result["allowed_into_engine"])
        self.assertEqual(result["status"], "VERIFIED_TIER1")

    def test_week8_kc_at_den_shift(self):
        """KC@DEN: Mahomes vs DEN (high disguise) should shift EPA negative."""
        res = evaluate_qb_matchup_2x2("Patrick Mahomes", opp_disguise_rate=0.38, opp_blitz_rate=0.30)
        self.assertLess(res["epa_shift_vs_baseline"], 0.0)

    def test_week8_den_at_kc_nix_shift(self):
        """DEN@KC: Bo Nix vs KC (high disguise + blitz) should be deeply negative."""
        res = evaluate_qb_matchup_2x2("Bo Nix", opp_disguise_rate=0.38, opp_blitz_rate=0.36)
        self.assertLess(res["matchup_expected_epa_db"], -0.01)


class TestEffectiveTheoryAndLargeDeviations(unittest.TestCase):
    """Roberts & Yaida + Weber probability operators."""

    def test_critical_initialization_relu(self):
        crit = compute_critical_initialization("relu", gamma_skip=0.0, n_outputs=1)
        self.assertAlmostEqual(crit["C_W_crit"], 2.0)
        self.assertAlmostEqual(crit["optimal_aspect_ratio_r_star"], 4.0 / 46.0)
        self.assertEqual(crit["chi_parallel"], 1.0)
        self.assertEqual(crit["chi_perp"], 1.0)

    def test_critical_initialization_tanh_skip(self):
        res_skip = compute_critical_initialization("tanh", gamma_skip=0.5, n_outputs=1)
        res_none = compute_critical_initialization("tanh", gamma_skip=0.0, n_outputs=1)
        self.assertGreater(res_skip["optimal_aspect_ratio_r_star"], res_none["optimal_aspect_ratio_r_star"])

    def test_layer_lr_equivalence_relu(self):
        lr = layer_learning_rate_equivalence(depth_L=12, layer_l=6, width_prev=256, p_perp=0.0)
        self.assertGreater(lr["lr_bias_effective"], 0.0)
        self.assertGreater(lr["lr_weight_effective"], 0.0)

    def test_fft_compound_poisson_pmf_mean(self):
        pmf = fft_compound_poisson_pmf(lam=3.0, single_event_pmf=np.array([0.0, 0.5, 0.5]), n_grid=256)
        expected_mean = float(np.arange(256) @ pmf)
        self.assertAlmostEqual(expected_mean, 3.0 * 1.5, places=4)
        self.assertAlmostEqual(np.sum(pmf), 1.0, places=6)

    def test_cramer_tilt(self):
        tilt = cramer_large_deviation_tilt(
            np.array([0.0, 1.0]), np.array([0.5, 0.5]), target_mean_a=0.8, n_steps=20
        )
        self.assertAlmostEqual(tilt["tilted_mean"], 0.8, places=6)
        self.assertGreater(tilt["rate_I_a"], 0.0)
        self.assertLess(tilt["large_deviation_prob_bound"], 1.0)

    def test_cramer_tilt_below_mean(self):
        tilt = cramer_large_deviation_tilt(
            np.array([0.0, 1.0]), np.array([0.5, 0.5]), target_mean_a=0.3, n_steps=20
        )
        self.assertEqual(tilt["theta_star"], 0.0)
        self.assertEqual(tilt["rate_I_a"], 0.0)

    def test_levy_arcsine(self):
        self.assertAlmostEqual(levy_arcsine_lead_persistence(0.5), 0.5, places=9)
        self.assertAlmostEqual(levy_arcsine_lead_persistence(0.0), 0.0)
        self.assertAlmostEqual(levy_arcsine_lead_persistence(1.0), 1.0)

    def test_inspection_paradox_debias(self):
        true_mu = 10.0
        cv2 = 1.0
        observed = true_mu * (1.0 + cv2)
        recovered = inspection_paradox_debias(observed, cv2)
        self.assertAlmostEqual(recovered, true_mu, places=9)

    def test_wigner_marchenko_pastur_denoise(self):
        rng = np.random.default_rng(42)
        p = 20
        n = 100
        X = rng.normal(size=(n, p))
        C = np.corrcoef(X.T)
        C_clean = wigner_semicircle_marchenko_pastur_denoise(C, n_samples=n)
        self.assertTrue(np.allclose(np.diag(C_clean), 1.0, atol=1e-10))
        self.assertTrue(np.all(C_clean <= 1.0 + 1e-10))
        self.assertTrue(np.all(C_clean >= -1.0 - 1e-10))

    def test_finite_width_posterior_coupling(self):
        m = np.array([1.0, 2.0, 3.0])
        cov = np.eye(3)
        coupled = finite_width_posterior_coupling(m, cov, four_point_vertex_v=0.5, aspect_ratio_r=0.1)
        self.assertEqual(coupled.shape, (3, 3))
        self.assertTrue(np.allclose(coupled, coupled.T))

    def test_vector_field_operators_2d(self):
        nx, ny = 8, 8
        x = np.linspace(0, 1, nx)
        y = np.linspace(0, 1, ny)
        X, Y = np.meshgrid(x, y)
        fx = np.sin(X)
        fy = np.cos(Y)
        phi = np.exp(-((X - 0.5) ** 2 + (Y - 0.5) ** 2) / 0.1)
        phi_prev = phi - 0.01
        phi_next = phi + 0.01
        ops = vector_field_operators_2d(fx, fy, phi_prev, phi, phi_next, dx=0.1, dt=0.1, wave_speed_c=1.0)
        for key in ("divergence", "grad_x", "grad_y", "curl_z", "laplacian", "dalembertian"):
            self.assertIn(key, ops)
            self.assertEqual(ops[key].shape, phi.shape)


class TestVMLSAndNumPyKernels(unittest.TestCase):
    """VMLS + NumPyBook kernels."""

    def test_rolling_exp_decay_tendency(self):
        s = np.linspace(1.0, 10.0, 20)
        roll = rolling_exp_decay_tendency(s, window=5, half_life=3.0)
        self.assertEqual(roll.shape, (16,))

    def test_unpadded_drive_reduceat(self):
        drv = unpadded_drive_reduceat(
            np.array([4.0, 7.0, -2.0, 15.0, 8.0, 12.0]),
            np.array([0, 3, 5]),
            player_ids=np.array([0, 1, 0, 2, 1, 2]),
            n_players=3,
        )
        self.assertTrue(np.allclose(drv["drive_sums"], [9.0, 23.0, 12.0]))
        self.assertTrue(np.allclose(drv["player_totals"], [2.0, 15.0, 27.0]))

    def test_qr_least_squares(self):
        rng = np.random.default_rng(42)
        A_test = rng.normal(size=(30, 5))
        x_true = np.array([1.5, -2.0, 0.5, 3.0, -1.0])
        b_test = A_test @ x_true
        x_qr = qr_least_squares(A_test, b_test)
        self.assertTrue(np.allclose(x_qr, x_true, atol=1e-10))

    def test_kkt_constrained_least_squares(self):
        rng = np.random.default_rng(42)
        A_test = rng.normal(size=(30, 5))
        x_true = np.array([1.5, -2.0, 0.5, 3.0, -1.0])
        b_test = A_test @ x_true
        C_test = np.ones((1, 5))
        d_test = np.array([1.0])
        x_kkt, _ = kkt_constrained_least_squares(A_test, b_test, C_test, d_test)
        self.assertAlmostEqual(float(np.sum(x_kkt)), 1.0, places=10)

    def test_levenberg_marquardt(self):
        t_grid = np.linspace(0.0, 4.0, 25)
        y_obs = 2.5 * np.exp(-0.8 * t_grid)
        res_fn = lambda p: p[0] * np.exp(-p[1] * t_grid) - y_obs
        jac_fn = lambda p: np.column_stack([
            np.exp(-p[1] * t_grid),
            -p[0] * t_grid * np.exp(-p[1] * t_grid),
        ])
        lm_out = levenberg_marquardt(res_fn, jac_fn, np.array([1.0, 0.2]))
        self.assertTrue(lm_out["converged"])
        self.assertTrue(np.allclose(lm_out["x"], [2.5, 0.8], atol=1e-6))

    def test_bayesian_ridge_opponent_adjusted(self):
        rng = np.random.default_rng(42)
        n_plays = 200
        off_idx = rng.integers(0, 32, size=n_plays)
        def_idx = rng.integers(0, 32, size=n_plays)
        epa = rng.normal(0.0, 0.1, size=n_plays)
        weeks_ago = rng.integers(0, 13, size=n_plays)
        out = solve_opponent_adjusted_bayesian_ridge(
            off_team_idx=off_idx,
            def_team_idx=def_idx,
            epa_per_play=epa,
            weeks_ago=weeks_ago,
            n_teams=32,
        )
        self.assertEqual(out["offense"].shape, (32,))
        self.assertEqual(out["defense"].shape, (32,))
        self.assertEqual(out["net"].shape, (32,))


if __name__ == "__main__":
    unittest.main()

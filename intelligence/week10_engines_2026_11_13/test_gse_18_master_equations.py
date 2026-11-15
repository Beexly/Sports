"""Comprehensive Test Suite for gse_18_master_equations_and_homography.py.

Compatible natively with `pytest -v test_gse_18_master_equations.py` AND
`python3 -m unittest -v test_gse_18_master_equations.py` (for offline VM environments
where pytest is not pre-installed).
"""

from __future__ import annotations

import math
import os
import sys
import unittest
from datetime import datetime, timezone
from typing import List

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import gse_18_master_equations_and_homography as gse


class TestGSE18MasterEquationsAndHomography(unittest.TestCase):
    """End-to-end mathematical and governance verification suite."""

    def test_01_registry_has_all_18_native_equations(self) -> None:
        expected_keys = [
            "GSN-01", "GSN-02", "GSN-03", "GSN-04", "GSN-05", "GSN-06", "GSN-07", "GSN-08",
            "ROOT-09", "ROOT-10", "ROOT-11", "ROOT-12", "ROOT-13", "ROOT-14", "ROOT-15",
            "ROOT-16", "ROOT-17", "ROOT-18",
        ]
        self.assertEqual(list(gse.MASTER_18_EQUATIONS_REGISTRY.keys()), expected_keys)
        self.assertEqual(len(gse.MASTER_18_EQUATIONS_REGISTRY), 18)
        for key, fn in gse.MASTER_18_EQUATIONS_REGISTRY.items():
            self.assertTrue(callable(fn), f"Registry entry {key} must be callable.")
            self.assertIsNotNone(fn.__doc__, f"Registry entry {key} must carry source docstring.")
            self.assertIn("16yGdnBQ5GTiYY5WLyz3lxpspMAbzlkXm1WC4BeH7h-k", fn.__doc__ or "")

    def test_02_hartley_dlt_conditioning_and_exact_recovery(self) -> None:
        H_true = np.array(
            [
                [0.048, -0.014, 12.5],
                [0.003, 0.041, -4.2],
                [0.00008, 0.00042, 1.0],
            ],
            dtype=np.float64,
        )
        H_inv = np.linalg.inv(H_true)
        field_pts = np.array(
            [
                [18.288, 0.0],
                [27.432, 21.5646],
                [36.576, 27.2034],
                [45.720, 48.768],
                [54.864, 10.9728],
                [64.008, 37.7952],
                [73.152, 0.0],
                [82.296, 48.768],
            ],
            dtype=np.float64,
        )
        img_pts = gse.project_pixels_to_field(H_inv, field_pts)

        diag = gse.estimate_homography_hartley_dlt(img_pts, field_pts)
        self.assertGreater(diag.raw_condition_number / diag.normalized_condition_number, 1000.0)
        self.assertLess(diag.point_reprojection_rmse_m, 1e-9)
        np.testing.assert_allclose(diag.H, H_true, rtol=1e-8, atol=1e-8)

        template_138 = gse.generate_nfl_field_template_138_intersections()
        self.assertEqual(template_138.shape, (138, 2))
        self.assertAlmostEqual(float(np.max(template_138[:, 0])), 109.728, places=6)
        self.assertAlmostEqual(float(np.max(template_138[:, 1])), 48.768, places=4)

    def test_03_joint_point_and_line_homography_under_sparse_points(self) -> None:
        H_true = np.array(
            [
                [0.052, -0.009, 15.0],
                [0.002, 0.045, -2.5],
                [0.00005, 0.00035, 1.0],
            ],
            dtype=np.float64,
        )
        H_inv = np.linalg.inv(H_true)
        sparse_field_pts = np.array([[45.72, 21.5646], [54.864, 27.2034]], dtype=np.float64)
        sparse_img_pts = gse.project_pixels_to_field(H_inv, sparse_field_pts)

        line_specs = [
            ((36.576, 5.0), (36.576, 42.0), (1.0, 0.0, -36.576)),
            ((64.008, 8.0), (64.008, 44.0), (1.0, 0.0, -64.008)),
            ((30.0, 48.768), (70.0, 48.768), (0.0, 1.0, -48.768)),
        ]
        lines = []
        for p1_m, p2_m, L_hom in line_specs:
            uv1 = gse.project_pixels_to_field(H_inv, np.array(p1_m))
            uv2 = gse.project_pixels_to_field(H_inv, np.array(p2_m))
            lines.append(
                gse.FieldLineCorrespondence(
                    endpoint_1_px=(float(uv1[0]), float(uv1[1])),
                    endpoint_2_px=(float(uv2[0]), float(uv2[1])),
                    line_field_homogeneous=L_hom,
                )
            )

        diag = gse.estimate_joint_point_and_line_homography(
            sparse_img_pts, sparse_field_pts, lines, alpha_line_weight=1.0, refine_nonlinear=True
        )
        self.assertLess(diag.point_reprojection_rmse_m, 1e-8)
        self.assertLess(diag.line_endpoint_rmse_px, 1e-7)
        np.testing.assert_allclose(diag.H, H_true, rtol=1e-6, atol=1e-6)

        vp_x = H_inv @ np.array([0.0, 1.0, 0.0])
        vp_y = H_inv @ np.array([1.0, 0.0, 0.0])
        H_4dof = gse.estimate_homography_4dof_vanishing_points(
            vp_x, vp_y, sparse_img_pts, sparse_field_pts
        )
        np.testing.assert_allclose(H_4dof, H_true, rtol=1e-7, atol=1e-7)

    def test_04_analytical_jacobian_and_spatial_covariance_propagation(self) -> None:
        H = np.array(
            [
                [0.050, -0.011, 10.0],
                [0.004, 0.038, -3.0],
                [0.00006, 0.00055, 1.0],
            ],
            dtype=np.float64,
        )
        u0, v0 = 960.0, 320.0
        J_analytic = gse.homography_analytical_jacobian(H, u0, v0)

        # Central finite-difference step eps=1e-5 balances truncation O(eps^2) vs float64 cancellation at u=960
        eps = 1e-5
        du = (
            gse.project_pixels_to_field(H, np.array([u0 + eps, v0]))
            - gse.project_pixels_to_field(H, np.array([u0 - eps, v0]))
        ) / (2.0 * eps)
        dv = (
            gse.project_pixels_to_field(H, np.array([u0, v0 + eps]))
            - gse.project_pixels_to_field(H, np.array([u0, v0 - eps]))
        ) / (2.0 * eps)
        J_numeric = np.column_stack([du, dv])
        np.testing.assert_allclose(J_analytic, J_numeric, rtol=1e-7, atol=1e-8)

        # Exact differential-geometric identity det(J(u,v)) == det(H) / w_tilde(u,v)^3
        w_tilde = H[2, 0] * u0 + H[2, 1] * v0 + H[2, 2]
        self.assertAlmostEqual(
            float(np.linalg.det(J_analytic)),
            float(np.linalg.det(H) / (w_tilde ** 3)),
            places=12,
        )

        sigma_px = np.array([[4.0, 0.5], [0.5, 9.0]], dtype=np.float64)
        _, J_out, sigma_world = gse.propagate_spatial_uncertainty_jacobian(
            H, u0, v0, sigma_px, tikhonov_eps_m2=0.0
        )
        np.testing.assert_allclose(sigma_world, J_out @ sigma_px @ J_out.T, rtol=1e-12)

        rng = np.random.default_rng(20261113)
        px_draws = rng.multivariate_normal([u0, v0], sigma_px, size=80000)
        world_draws = gse.project_pixels_to_field(H, px_draws)
        mc_cov = np.cov(world_draws.T)
        np.testing.assert_allclose(sigma_world, mc_cov, rtol=2.5e-2, atol=1e-4)

        z_s = np.array([40.0, 25.0])
        R_s = np.diag([0.02, 0.35])
        R_e = np.diag([0.40, 0.03])
        _, R_fused = gse.fuse_dual_view_information(z_s, R_s, z_s, R_e)
        self.assertLess(float(np.trace(R_fused)), float(np.trace(R_s)))
        self.assertLess(float(np.trace(R_fused)), float(np.trace(R_e)))

    def test_05_master_18_equations_exact_invariants(self) -> None:
        t_grid = np.linspace(0.0, 2.0, 201)
        R_rad = 5.0
        circle_xy = np.column_stack([R_rad * np.cos(t_grid), R_rad * np.sin(t_grid)])
        res02 = gse.eq02_gsn02_kinematic_curvature_and_normalized_jerk(circle_xy, dt=0.01)
        self.assertAlmostEqual(float(np.median(res02["curvature"][10:-10])), 1.0 / R_rad, places=3)
        self.assertGreater(res02["normalized_jerk"], 0.0)

        res03 = gse.eq03_gsn03_locked_mean_crps_gaussian_and_laplace(
            y_observed=7.0, mu_locked_close=3.0, sigma_gaussian=13.45, b_laplace=9.5
        )
        h = 1e-6
        res03_plus = gse.eq03_gsn03_locked_mean_crps_gaussian_and_laplace(
            y_observed=7.0, mu_locked_close=3.0, sigma_gaussian=13.45 + h, b_laplace=9.5 + h
        )
        self.assertAlmostEqual(
            res03["gaussian_d1_sigma"],
            (res03_plus["gaussian_crps"] - res03["gaussian_crps"]) / h,
            places=5,
        )
        self.assertAlmostEqual(
            res03["laplace_d1_b"],
            (res03_plus["laplace_crps"] - res03["laplace_crps"]) / h,
            places=5,
        )

        res04_small = gse.eq04_gsn04_conformal_cqr_and_jackknife_plus(
            np.zeros(5), np.ones(5), np.full(5, 0.5), 10.0, 20.0,
            alpha=0.10,
            loo_test_preds=np.array([14.0, 15.0, 15.5, 16.0, 14.5]),
            loo_abs_residuals=np.array([1.0, 2.0, 1.5, 2.5, 1.2]),
        )
        self.assertEqual(res04_small["rank_k"], 6)
        self.assertFalse(res04_small["cqr_valid"])
        self.assertEqual(res04_small["decision"], "NO_BET")
        self.assertIsNotNone(res04_small["jackknife_plus_interval"])

        res04_large = gse.eq04_gsn04_conformal_cqr_and_jackknife_plus(
            np.zeros(50), np.full(50, 10.0), np.full(50, 5.0), 20.0, 30.0, alpha=0.10
        )
        self.assertTrue(res04_large["cqr_valid"])
        self.assertEqual(res04_large["decision"], "CALIBRATED")

        res05 = gse.eq05_gsn05_bellman_q_decay_and_surrogate_reward([1.0, 0.8], 1, false_positive_rho0=0.1, false_negative_rho1=0.2)
        self.assertFalse(res05["halted"])
        self.assertAlmostEqual(res05["unbiased_surrogate_reward"], (1.0 - 0.1) / 0.7, places=9)
        res05_halt = gse.eq05_gsn05_bellman_q_decay_and_surrogate_reward([1.0], 1, false_positive_rho0=0.6, false_negative_rho1=0.5)
        self.assertTrue(res05_halt["halted"])

        kick = datetime(2026, 9, 13, 17, 0, tzinfo=timezone.utc)
        rows = [
            {"id": "early", "observed_at": "2026-09-13T15:00:00Z"},
            {"id": "future_leak", "observed_at": "2026-09-13T18:00:00Z"},
            {"id": "missing", "observed_at": "NA"},
        ]
        res06 = gse.eq06_gsn06_pit_asof_join_and_fleet_routing(rows, kick, gsap_time_seconds=2.5)
        self.assertEqual(res06["matched_record"]["id"], "early")
        self.assertAlmostEqual(res06["lenis_raf_ms"], 2500.0)

        res07 = gse.eq07_gsn07_glicko2_illinois_update(
            1500.0, 200.0, 0.06, [(1400.0, 30.0, 1.0), (1550.0, 100.0, 0.0), (1700.0, 300.0, 0.0)], tau=0.5
        )
        self.assertAlmostEqual(res07["rating"], 1464.050671, places=5)
        self.assertAlmostEqual(res07["rd"], 151.516524, places=5)
        self.assertAlmostEqual(res07["sigma"], 0.059996, places=5)

        odds_110 = [210.0 / 110.0, 210.0 / 110.0]
        r_1wk = gse.eq08_gsn08_idle_rd_and_conjugate_shin_devig(200.0, 0.06, 1, odds_110)
        r_4wk = gse.eq08_gsn08_idle_rd_and_conjugate_shin_devig(200.0, 0.06, 4, odds_110)
        r_17wk = gse.eq08_gsn08_idle_rd_and_conjugate_shin_devig(200.0, 0.06, 17, odds_110)
        self.assertAlmostEqual(r_1wk["inflated_rd"], 200.2714, places=4)
        self.assertAlmostEqual(r_4wk["inflated_rd"], 201.0835, places=4)
        self.assertAlmostEqual(r_17wk["inflated_rd"], 204.5651, places=4)
        self.assertAlmostEqual(r_1wk["shin_z"], 1.0 / 21.0, places=9)
        np.testing.assert_allclose(r_1wk["fair_probs"], [0.5, 0.5], atol=1e-12)

        seed = np.array([[4.0, 2.0, 1.0], [1.0, 5.0, 2.0], [2.0, 1.0, 6.0]], dtype=np.float64)
        r_tgt = np.array([12.0, 10.0, 14.0])
        c_tgt = np.array([11.0, 13.0, 12.0])
        M_coupled, sk_err, sk_iters = gse.eq09_root09_sinkhorn_knopp_ipf(seed, r_tgt, c_tgt)
        self.assertLess(sk_err, 1e-14)
        self.assertLessEqual(sk_iters, 50)
        np.testing.assert_allclose(np.sum(M_coupled, axis=1), r_tgt, atol=1e-13)

        res10 = gse.eq10_root10_grpo_proper_scoring_advantage([5.1, 6.2, 7.4, 5.8])
        self.assertAlmostEqual(float(np.sum(res10["advantages"])), 0.0, places=9)
        self.assertGreater(res10["advantages"][0], res10["advantages"][2])

        shrunk, factor = gse.eq11_root11_positive_part_james_stein(
            np.array([0.8, -0.6, 0.2, 0.1]), np.eye(4) * 0.05
        )
        self.assertTrue(0.0 <= factor <= 1.0)
        self.assertLessEqual(float(np.max(np.abs(shrunk))), 0.35 + 1e-12)

        res12 = gse.eq12_root12_layer2_price_and_coupled_interaction(
            p_slip=-3.0,
            p_read=-4.5,
            effective_weights=np.array([0.5, 0.4]),
            feature_deltas=np.array([1.2, -0.8]),
            interaction_gamma=np.array([[0.0, 0.3], [0.3, 0.0]]),
            game_hessian=np.array([[0.0, 1.5], [1.5, 0.0]]),
            ancestor_reliabilities=[[0.95, 0.95], [0.96, 0.94]],
            tau_conformal=0.25,
        )
        self.assertAlmostEqual(res12["delta_price"], -1.5)
        self.assertTrue(res12["itcr_passed"])
        self.assertLessEqual(res12["alpha_itcr"], 0.25)

        res13 = gse.eq13_root13_draftkings_classic_and_negbin_td(
            pass_yds=310.0, pass_tds=3, interceptions=1, rush_yds=40.0, rush_tds=1
        )
        expected_qb_pts = 0.04 * 310.0 + 3.0 + 12.0 - 1.0 + 4.0 + 6.0
        self.assertAlmostEqual(res13["dk_fpts"], expected_qb_pts, places=9)
        self.assertGreater(res13["negbin_td_variance"], 0.8)

        res14 = gse.eq14_root14_observational_audio_consensus_filter(
            [
                {"side": "home", "dollars_staked": 25.0, "observed_at": "2026-09-13T16:00:00Z"},
                {"side": "away", "dollars_staked": 10.0, "observed_at": "2026-09-13T16:30:00Z"},
                {"side": "home", "dollars_staked": 500.0, "observed_at": "2026-09-13T19:00:00Z"},
            ],
            kickoff_utc=kick,
            locked_market_close_mu=3.5,
        )
        self.assertEqual(res14["locked_mu_close"], 3.5)
        self.assertEqual(res14["dropped_claims"], 1)
        self.assertAlmostEqual(res14["valid_units_home"], 5.0)
        self.assertAlmostEqual(res14["valid_units_away"], 2.0)

        res15 = gse.eq15_root15_mahler_volume_and_doctrine_gate(
            np.array([2.0, 5.0, 0.7]),
            np.array([[1.0, 2.0], [0.0, 1.0]]),
            np.array([[1.0, 0.0], [3.0, 1.0]]),
            frozen_walk_forward_crps_delta=-0.062,
            conformal_ess_c_hat=9.8,
            wasserstein_shift_w1=0.04,
            james_stein_max_abs_log_odds=0.22,
            circulation_residual=1e-8,
        )
        self.assertAlmostEqual(res15["mahler_volume_product"], (4.0 ** 3) / 6.0, places=9)
        self.assertGreater(res15["commutator_frobenius_norm"], 0.0)
        self.assertTrue(res15["gate_passed"])

        phases = np.linspace(0.0, 2.0 * math.pi, 1600, endpoint=False)
        res16 = gse.eq16_root16_phase_entropy_and_hou_li_filter(phases, np.array([0.0, 64.0]), 128)
        self.assertAlmostEqual(res16["s_phase_16bin"], math.log(16.0), places=6)
        self.assertAlmostEqual(float(res16["hou_li_filter"][0]), 1.0, places=12)
        self.assertAlmostEqual(float(res16["hou_li_filter"][1]), math.exp(-36.0), places=12)

        # Eq 17: On K_3 triangle (all distinct pairs at distance 1), mu_u=[0.5,0.5,0], mu_v=[0,0.5,0.5]
        # moves 0.5 mass across distance 1 -> W_1 = 0.5 -> kappa_OR = 1 - 0.5/1.0 = +0.5 (positive curvature!)
        stalks = [np.array([2.0, -1.0]), np.array([2.0, -1.0])]
        edges = [(0, 1, np.eye(2), np.eye(2))]
        k3_metric = np.array([[0.0, 1.0, 1.0], [1.0, 0.0, 1.0], [1.0, 1.0, 0.0]])
        res17 = gse.eq17_root17_cellular_sheaf_laplacian_and_ollivier_ricci(
            stalks,
            edges,
            phases_rad=np.zeros(10),
            mu_u=np.array([0.5, 0.5, 0.0]),
            mu_v=np.array([0.0, 0.5, 0.5]),
            support_metric=k3_metric,
            edge_distance=1.0,
        )
        self.assertAlmostEqual(res17["sheaf_disagreement_energy"], 0.0, places=12)
        self.assertAlmostEqual(res17["phase_resultant_R"], 1.0, places=12)
        self.assertAlmostEqual(res17["ollivier_ricci_curvature"], 0.5, places=6)

        cov3 = np.array([[4.0, 1.5, 0.8], [1.5, 3.0, 0.5], [0.8, 0.5, 2.0]])
        res18 = gse.eq18_root18_cluster_james_stein_and_schur_damping(
            np.array([10.0, 11.0, 9.5, 10.5, -2.0, -1.5, -2.5, -2.0]),
            [0, 0, 0, 0, 1, 1, 1, 1],
            sample_variance=0.5,
            covariance_matrix=cov3,
            schur_lambda=0.4,
        )
        np.testing.assert_allclose(np.diag(res18["schur_damped_covariance"]), np.diag(cov3))
        self.assertAlmostEqual(float(res18["schur_damped_covariance"][0, 1]), 0.4 * 1.5, places=12)

    def test_06_edge1b_edge2_hybrid_locked_mean_and_strictly_better_crps_on_key_numbers(self) -> None:
        grid = np.linspace(-110.0, 110.0, 44001)
        dx = float(grid[1] - grid[0])
        pos_mask = grid >= 0.0
        neg_mask = ~pos_mask

        for mu_c in (-10.5, -7.0, -3.5, -3.0, 0.0, 2.5, 3.0, 6.5, 7.0, 14.0):
            for tot in (37.5, 44.5, 52.5):
                dist = gse.build_edge1b_edge2_hybrid_distribution(mu_c, tot)
                self.assertAlmostEqual(dist.expected_value(), mu_c, places=11)
                cdfs = dist.cdf_array(grid)
                num_mean = float(np.sum(1.0 - cdfs[pos_mask]) * dx - np.sum(cdfs[neg_mask]) * dx)
                self.assertAlmostEqual(num_mean, mu_c, delta=5e-3)

                alloc_3 = dist.allocate_spread_probabilities(-3.0)
                alloc_35 = dist.allocate_spread_probabilities(-3.5)
                self.assertGreater(alloc_3["p_push"], 0.03)
                self.assertEqual(alloc_35["p_push"], 0.0)
                self.assertAlmostEqual(alloc_3["prob_sum"], 1.0, places=12)

        ot_mom = gse.edge2_overtime_total_injection_moments(44.0, 0.065)
        self.assertAlmostEqual(ot_mom["conditional_ot_total_mean"], 49.2, places=9)
        self.assertAlmostEqual(ot_mom["conditional_ot_total_sd"], 2.9, places=9)

        for mu_c, y_key in [(3.0, 3.0), (3.5, 3.0), (6.5, 7.0), (7.0, 7.0), (-3.0, -3.0), (2.5, 6.0), (9.5, 10.0), (13.5, 14.0)]:
            dist = gse.build_edge1b_edge2_hybrid_distribution(mu_c, total_line=43.5)
            crps_hybrid = gse.compute_exact_piecewise_crps(dist, y_key)
            crps_gauss = gse.eq03_gsn03_locked_mean_crps_gaussian_and_laplace(
                y_key, mu_c, sigma_gaussian=gse.GAUSSIAN_BASELINE_SIGMA
            )["gaussian_crps"]
            self.assertLess(
                crps_hybrid,
                crps_gauss,
                f"Hybrid CRPS ({crps_hybrid:.4f}) must beat Gaussian ({crps_gauss:.4f}) at mu={mu_c}, y={y_key}",
            )

        rng = np.random.default_rng(20261113)
        slate_dists: List[gse.Edge1b2HybridDistribution] = []
        slate_margins: List[float] = []
        key_pool = np.array([-14, -10, -7, -6, -3, 3, 6, 7, 10, 14], dtype=np.float64)

        for _ in range(200):
            mu_c = float(rng.choice([-7.0, -6.5, -3.5, -3.0, -2.5, 1.5, 3.0, 3.5, 6.5, 7.0, 9.5]))
            tot = float(rng.uniform(38.0, 51.0))
            dist = gse.build_edge1b_edge2_hybrid_distribution(mu_c, tot)
            slate_dists.append(dist)
            u = float(rng.random())
            if u < 0.45:
                weights = np.exp(-np.abs(key_pool - mu_c) / 7.5)
                weights /= np.sum(weights)
                margin = float(rng.choice(key_pool, p=weights))
            elif u < 0.52:
                fav_wins = rng.random() < (0.711 if abs(mu_c) >= 2.0 else 0.5)
                sign = (1.0 if mu_c >= 0.0 else -1.0) if fav_wins else (-1.0 if mu_c >= 0.0 else 1.0)
                margin = float(sign * rng.choice([3.0, 6.0]))
            else:
                margin = float(round(mu_c + rng.laplace(0.0, 7.2)))
            slate_margins.append(margin)

        report = gse.evaluate_locked_mean_crps_gate(slate_dists, slate_margins)
        self.assertEqual(report.n_games, 200)
        self.assertLess(report.max_locked_mean_drift, 1e-11)
        self.assertLess(report.mean_crps, report.gaussian_baseline_crps)
        self.assertGreater(report.crps_improvement_vs_gaussian, 0.15)
        self.assertLessEqual(report.mean_crps, gse.HARD_GATE_CRPS_THRESHOLD)
        self.assertTrue(report.passed)

        refusal_report = gse.evaluate_locked_mean_crps_gate(slate_dists[:50], slate_margins[:50])
        self.assertFalse(refusal_report.passed)
        self.assertEqual(refusal_report.emission_payload["emission"], 0)
        self.assertEqual(refusal_report.emission_payload["picks"], [])

    def test_07_kickoff_to_victory_formation_architecture_equations(self) -> None:
        dome_dry = gse.compute_humid_air_density_and_pressure(21.0, 0.0, 0.0)["air_density_kg_m3"]
        dome_humid = gse.compute_humid_air_density_and_pressure(21.0, 0.85, 0.0)["air_density_kg_m3"]
        mexico_city = gse.compute_humid_air_density_and_pressure(20.0, 0.40, 2240.0)["air_density_kg_m3"]
        denver = gse.compute_humid_air_density_and_pressure(20.0, 0.35, 1609.0)["air_density_kg_m3"]
        green_bay_cold = gse.compute_humid_air_density_and_pressure(-10.0, 0.50, 195.0)["air_density_kg_m3"]
        self.assertLess(dome_humid, dome_dry)
        self.assertLess(mexico_city, denver)
        self.assertLess(denver, dome_dry)
        self.assertLess(dome_dry, green_bay_cold)

        v0 = np.array([25.4, 0.0, 17.8])
        axis = v0 / np.linalg.norm(v0)
        omega = np.array([0.0, 35.0, 0.0])
        fg_mexico = gse.simulate_prolate_spheroid_ballistics_rk4(
            v0, np.zeros(3), omega, axis, mexico_city, cd0=0.38, cd90=0.76, target_descent_height_m=3.048
        )
        fg_gb_crosswind = gse.simulate_prolate_spheroid_ballistics_rk4(
            v0, np.array([0.0, 10.0, 0.0]), omega, axis, green_bay_cold, cd0=0.38, cd90=0.76, target_descent_height_m=3.048
        )
        self.assertGreater(fg_mexico["carry_yards"] - fg_gb_crosswind["carry_yards"], 6.0)
        self.assertGreater(abs(fg_gb_crosswind["lateral_drift_yards"]), 5.0)

        self.assertEqual(gse.resolve_2026_dynamic_kickoff_spot(flies_into_endzone_untouched=True)["own_yardline_spot"], 35)
        self.assertEqual(gse.resolve_2026_dynamic_kickoff_spot(bounces_in_landing_zone_into_endzone=True)["own_yardline_spot"], 20)
        self.assertEqual(gse.resolve_2026_dynamic_kickoff_spot(falls_short_of_landing_zone_or_oob=True)["own_yardline_spot"], 40)
        self.assertEqual(gse.resolve_2026_dynamic_kickoff_spot(kick_from_yardline=50, flies_into_endzone_untouched=True)["own_yardline_spot"], 20)

        at_200 = gse.simulate_rule4_victory_formation_automaton(120.0, defensive_timeouts=0)
        at_201_trap = gse.simulate_rule4_victory_formation_automaton(121.0, defensive_timeouts=0)
        post_2mw_1to = gse.simulate_rule4_victory_formation_automaton(86.0, defensive_timeouts=1, two_minute_warning_already_occurred=True)
        post_2mw_2to = gse.simulate_rule4_victory_formation_automaton(46.0, defensive_timeouts=2, two_minute_warning_already_occurred=True)
        post_2mw_3to = gse.simulate_rule4_victory_formation_automaton(6.0, defensive_timeouts=3, two_minute_warning_already_occurred=True)

        self.assertTrue(at_200["can_kneel_out"])
        self.assertEqual(at_200["clock_left_at_turnover_s"], 0.0)
        self.assertFalse(at_201_trap["can_kneel_out"])
        self.assertAlmostEqual(at_201_trap["clock_left_at_turnover_s"], 34.6, places=3)
        self.assertAlmostEqual(at_201_trap["clock_exhausted_s"], 86.4, places=3)
        self.assertTrue(post_2mw_1to["can_kneel_out"])
        self.assertTrue(post_2mw_2to["can_kneel_out"])
        self.assertTrue(post_2mw_3to["can_kneel_out"])
        self.assertLess(at_200["single_kneel_loss_hazard"], 0.00009)

        devig = gse.devig_all_six_methods([1.2222222, 4.40])
        for m_name, p_vec in devig.items():
            self.assertAlmostEqual(float(np.sum(p_vec)), 1.0, places=9, msg=m_name)
        np.testing.assert_allclose(devig["conjugate_shin"], devig["additive_wpo"], atol=1e-6)

        rng = np.random.default_rng(42)
        # Match source doc benchmark dispersion (NFL team pass SD ~68 yd, rush SD ~34 yd)
        draws = np.column_stack([rng.normal(228.92, 68.0, 25000), rng.normal(111.17, 34.0, 25000)])
        tilt = gse.minimum_kl_entropic_tilting(draws, np.array([248.50, 108.00]))
        self.assertLess(tilt["max_moment_error"], 1e-8)
        self.assertGreater(tilt["ess_ratio"], 0.90)

        lam_u = gse.student_t_copula_upper_tail_dependence(0.65, nu_df=4.0)
        self.assertGreater(lam_u, 0.30)

        cov_true = np.array([[1.0, 0.70], [0.70, 1.0]])
        corr_draws = rng.multivariate_normal([0.0, 0.0], cov_true, size=600)
        indep_draws = rng.multivariate_normal([0.0, 0.0], np.eye(2), size=600)
        y_joint = np.array([1.8, 1.7])
        sc_corr = gse.multivariate_energy_and_variogram_scores(corr_draws, y_joint)
        sc_indep = gse.multivariate_energy_and_variogram_scores(indep_draws, y_joint)
        self.assertLess(sc_corr["variogram_score_p05"], sc_indep["variogram_score_p05"])

        # Situational PIT fail-closed metrics (BQP & SWCC)
        sit_ok = gse.compute_bqp_and_swcc_situational_metrics(
            epa_starter_prior=0.14,
            epa_backup_snap_adjusted=-0.06,
            has_valid_pit_stamp=True,
            rest_deficit_days=3.0,
            travel_miles=1650.0,
            prior_game_snaps=72.0,
        )
        self.assertAlmostEqual(sit_ok["bqp"] or 0.0, 0.20, places=9)
        self.assertIsNotNone(sit_ok["swcc"])
        sit_missing = gse.compute_bqp_and_swcc_situational_metrics(
            epa_starter_prior=0.14,
            epa_backup_snap_adjusted=0.0,
            has_valid_pit_stamp=False,
            rest_deficit_days=3.0,
            travel_miles=None,
            prior_game_snaps=72.0,
        )
        self.assertIsNone(sit_missing["bqp"])
        self.assertIsNone(sit_missing["swcc"])

    def test_08_00_truth_file_public_copy_governance(self) -> None:
        self.assertEqual(gse.format_confidence_score(68.4), "68/100")
        self.assertEqual(gse.format_confidence_score(0), "0/100")
        self.assertEqual(gse.format_confidence_score(100), "100/100")
        with self.assertRaises(ValueError):
            gse.format_confidence_score(105)

        clean_copy = (
            f"{gse.LEGAL_ENTITY_NAME} (DBA {gse.DBA_BRAND_NAME}, {gse.CANONICAL_WEB_DOMAIN}) "
            f"publishes forecasts with Confidence {gse.format_confidence_score(68)}. "
            f"{gse.PUBLIC_LEDGER_DISCLOSURE}."
        )
        clean_audit = gse.audit_and_enforce_public_copy(clean_copy, strict=True)
        self.assertTrue(clean_audit.passed)
        self.assertEqual(len(clean_audit.violations), 0)

        forbidden_rec = "-".join(["6" + "2", "23", "1"])
        dirty_copy = (
            f"Record {forbidden_rec} with 74% confidence and GSI federal ARPA-H grant award "
            f"plus cryptographically sealed picks and FPR 0.0 / detection 1.0."
        )
        dirty_audit = gse.audit_and_enforce_public_copy(dirty_copy, strict=False)
        self.assertFalse(dirty_audit.passed)
        self.assertIn("forbidden_unreconciled_record_string", dirty_audit.violations)
        self.assertIn("forbidden_percent_confidence_badge_use_integer_xx_over_100", dirty_audit.violations)
        self.assertIn("forbidden_standalone_gsi_grant_claim", dirty_audit.violations)
        self.assertIn("unverified_claim_cryptographically_sealed", dirty_audit.violations)
        self.assertIn("unqualified_fpr_detection_claim_missing_synthetic_fixtures_qualifier", dirty_audit.violations)
        self.assertNotIn(forbidden_rec, dirty_audit.sanitized_text)
        self.assertIn("Confidence 74/100", dirty_audit.sanitized_text)
        self.assertIn("on our synthetic fixtures", dirty_audit.sanitized_text)

        self.assertTrue(gse.enforce_autonomous_action_gate("draft")["autonomous_allowed"])
        self.assertFalse(gse.enforce_autonomous_action_gate("deploy")["autonomous_allowed"])
        self.assertEqual(gse.enforce_autonomous_action_gate("post")["status"], "QUEUED_FOR_FOUNDER_TAP")

        this_dir = os.path.dirname(os.path.abspath(__file__))
        for fname in (
            "gse_18_master_equations_and_homography.py",
            "test_gse_18_master_equations.py",
            "unified_quantitative_nfl_architecture_fixed.ts",
        ):
            fpath = os.path.join(this_dir, fname)
            if os.path.exists(fpath):
                with open(fpath, "r", encoding="utf-8") as fh:
                    src = fh.read()
                self.assertNotIn(forbidden_rec, src, f"Forbidden literal found in {fname}")


def test_pytest_entrypoint_all_suites() -> None:
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestGSE18MasterEquationsAndHomography)
    result = unittest.TextTestRunner(verbosity=0).run(suite)
    assert result.wasSuccessful(), f"Failures: {result.failures} | Errors: {result.errors}"


if __name__ == "__main__":
    unittest.main(verbosity=2)

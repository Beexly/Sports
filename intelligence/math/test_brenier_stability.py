#!/usr/bin/env python3
"""Unit tests for Brenier 1/3 stability, Solenoidal zero-sum assert, Kreyszig 20.4/20.5, HJO 2609.20567v2, Katch-McArdle, MathWorks #19232, and Tangri anchors."""
import math
import sys
import unittest
from pathlib import Path
import numpy as np

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from intelligence.data_loaders.signal_pack_loader import (
    SFDATA9ERS_COMPOSITE_QB_WEIGHTS,
    compute_sfdata9ers_composite_qb_score,
    load_signal_pack_and_full_tables,
)
from intelligence.math.vmls_and_numpy_kernels import (
    condition_number_estimate,
    greedy_span_increasing_row_selector,
    katch_mcardle_rmr,
    least_squares_polynomial_fit,
    lqr_riccati_clock_controller,
)
from intelligence.math.effective_theory_and_large_deviations import (
    albert_chib_markov_switching_regime_update,
    kantorovich_three_marginal_relaxation_gap,
    mathworks_disposable_edge_tail_check,
    rademacher_t_independent_tail_bound,
    talisman_dependency_variance_multiplier,
    verify_hjo_cone_positive_definiteness,
)
from scripts.ops.gse_coach_mind_simulator import (
    DEFAULT_SEALED_BASELINE,
    KICKOFF_RETURN_DRIVE_START_ANCHORS_2026,
    NON_BLITZ_PRESSURE_ANCHORS_2026,
    TB_WR_EMEKA_EGBUKA_OUT_FLAG,
    apply_tau_hat_calibration_shrinkage,
    brenier_one_third_stability_ratio,
    compute_kickoff_drive_start_offset,
    compute_non_blitz_pressure_surplus,
    compute_postgame_dual_luck_grade,
    compute_rz_points_per_trip_differential,
    conserve_target_shares_kkt,
    load_sealed_object_readonly,
    load_week8_injuries_from_csv,
    simulate_matchup_pbp,
    sinkhorn_reallocate_weights,
)


class TestBrenierAndKreyszigAndHJO(unittest.TestCase):
    def test_synthetic_perturbation_and_sinkhorn_reallocation(self):
        cost_c = DEFAULT_SEALED_BASELINE["costMatrixC"]
        mu = np.array([0.26, 0.21, 0.17, 0.20, 0.16], dtype=np.float64)

        nu_small = np.array([0.19, 0.28, 0.17, 0.20, 0.16], dtype=np.float64)
        K = np.exp(-np.asarray(cost_c, dtype=np.float64) / 0.10)
        u = np.ones_like(mu)
        v = np.ones_like(nu_small)
        for _ in range(200):
            u = mu / np.maximum(K @ v, 1e-12)
            v = nu_small / np.maximum(K.T @ u, 1e-12)
        P = np.diag(u) @ K @ np.diag(v)
        realized_small = conserve_target_shares_kkt(P.sum(axis=0))
        ratio_small = brenier_one_third_stability_ratio(mu, nu_small, realized_small)

        nu_scratch = mu.copy()
        nu_scratch[1] = 0.01
        nu_scratch = nu_scratch / np.sum(nu_scratch)
        realized_scratch_raw, _ = sinkhorn_reallocate_weights(cost_c, mu, ["WR2"])
        realized_scratch = conserve_target_shares_kkt(realized_scratch_raw)
        ratio_scratch = brenier_one_third_stability_ratio(mu, nu_scratch, realized_scratch)

        print(
            f"[BRENIER 1/3 CHECK] 7% synthetic shift ratio = {ratio_small:.4f} | "
            f"WR2 scratch ratio = {ratio_scratch:.4f}"
        )
        self.assertTrue(math.isfinite(ratio_small) and ratio_small > 0.0)
        self.assertTrue(math.isfinite(ratio_scratch) and ratio_scratch > 0.0)
        self.assertLess(ratio_small, 2.0)
        self.assertLess(ratio_scratch, 2.0)

    def test_condition_number_kreyszig_20_4(self):
        A_ill = np.array([[0.9999, -1.0001], [1.0000, -1.0000]], dtype=np.float64)
        kappa_ill = condition_number_estimate(A_ill, norm="2")
        self.assertGreater(kappa_ill, 19_999.0)

        A_well = np.array([[5.0, 1.0, 1.0], [1.0, 4.0, 2.0], [1.0, 2.0, 4.0]], dtype=np.float64)
        kappa_well = condition_number_estimate(A_well, norm="2")
        self.assertTrue(3.0 < kappa_well < 5.0)
        print(f"[KREYSZIG 20.4] kappa_ill = {kappa_ill:.1f} | kappa_well = {kappa_well:.4f}")

    def test_least_squares_polynomial_fit_kreyszig_20_5_ex2(self):
        x = np.array([0.0, 2.0, 4.0, 6.0, 8.0], dtype=np.float64)
        y = np.array([5.0, 4.0, 1.0, 6.0, 7.0], dtype=np.float64)
        res = least_squares_polynomial_fit(x, y, degree=2)
        c = res["coefficients"]
        expected = np.array([5.1142857, -1.4142857, 0.2142857], dtype=np.float64)
        np.testing.assert_allclose(c, expected, atol=1e-4)
        self.assertFalse(res["ill_conditioned_flag"])
        print(
            f"[KREYSZIG 20.5 EX.2] coeffs = [{c[0]:.5f}, {c[1]:.5f}, {c[2]:.5f}] | "
            f"Vandermonde kappa = {res['condition_number_kappa']:.2f}"
        )

    def test_verify_hjo_cone_positive_definiteness_2609_20567(self):
        Q_pd = np.array([[2.0, 0.5], [0.5, 1.5]], dtype=np.float64)
        cone_vecs = np.array([[1.0, 1.0], [2.0, 1.0], [0.0, 3.0], [3.0, 2.0]], dtype=np.float64)
        out_ok = verify_hjo_cone_positive_definiteness(Q_pd, cone_vecs, delta=1.0)
        self.assertTrue(out_ok["cone_positive_definite"])

        Q_fail = np.array([[1.0, 0.0], [0.0, -0.5]], dtype=np.float64)
        out_fail = verify_hjo_cone_positive_definiteness(Q_fail, cone_vecs, delta=1.0)
        self.assertFalse(out_fail["cone_positive_definite"])
        print(
            f"[HJO 2609.20567v2] PD min_margin = {out_ok['min_margin']:.4f} | "
            f"Indefinite pass = {out_fail['cone_positive_definite']}"
        )

    def test_katch_mcardle_rmr_and_bias_band(self):
        rmr_80 = katch_mcardle_rmr(80.0)
        self.assertAlmostEqual(rmr_80, 2098.0, places=6)
        # Paper's ±6% Bland-Altman band around 2098 kcal/day is [1972.12, 2223.88]
        lo_6pct, hi_6pct = rmr_80 * 0.94, rmr_80 * 1.06
        self.assertTrue(1970.0 < lo_6pct < 1975.0 and 2220.0 < hi_6pct < 2225.0)
        print(f"[KATCH-MCARDLE] FFM=80kg -> RMR={rmr_80:.1f} kcal/day (±6% band: [{lo_6pct:.1f}, {hi_6pct:.1f}])")

    def test_mathworks_disposable_edge_tail_check(self):
        # Conservative profile ($14,190 disposable, small stakes) stays under 10%
        cons = mathworks_disposable_edge_tail_check(
            disposable_bankroll=14190.0, wager_per_bet=15.0, n_bets=100, win_prob=0.50, payout_odds_net=0.9091
        )
        self.assertFalse(cons["exceeds_10pct_disposable_threshold"])
        # Aggressive negative-EV profile breaches 10% disposable threshold
        aggr = mathworks_disposable_edge_tail_check(
            disposable_bankroll=10430.0, wager_per_bet=50.0, n_bets=300, win_prob=0.47, payout_odds_net=0.9091
        )
        self.assertTrue(aggr["exceeds_10pct_disposable_threshold"])
        print(
            f"[MATHWORKS #19232] cons_95th_loss=${cons['loss_95th_percentile']:.1f} ({cons['loss_fraction_of_disposable']*100:.1f}%) | "
            f"aggr_95th_loss=${aggr['loss_95th_percentile']:.1f} ({aggr['loss_fraction_of_disposable']*100:.1f}%)"
        )

    def test_week8_13_games_invariants(self):
        sealed_obj, digest = load_sealed_object_readonly()
        inj_map = load_week8_injuries_from_csv()
        week8_matchups = [
            ("MIN", "LAC"), ("MIA", "ATL"), ("NYJ", "CIN"), ("CLE", "NE"),
            ("NYG", "PHI"), ("BUF", "CAR"), ("CHI", "BAL"), ("SF", "HOU"),
            ("TB", "NO"), ("TEN", "IND"), ("DAL", "DEN"), ("GB", "PIT"), ("WAS", "KC"),
        ]
        ratios = []
        max_zero_sum_err = 0.0
        for idx, (aw, hm) in enumerate(week8_matchups):
            aw_i = inj_map.get(aw, ["WR2"] if idx % 3 == 0 else [])
            hm_i = inj_map.get(hm, ["TE1"] if idx % 4 == 0 else [])
            r = simulate_matchup_pbp(aw, hm, aw_i, hm_i, sealed_obj, digest, n_sims=500, seed=800 + idx)
            self.assertLess(r["solenoidal_zero_sum_error_max"], 1e-12)
            self.assertEqual(r["external_accuracy_anchors"]["low_scoring_football_pct"], 53.9)
            self.assertEqual(r["external_accuracy_anchors"]["high_scoring_basketball_pct"], 74.5)
            max_zero_sum_err = max(max_zero_sum_err, r["solenoidal_zero_sum_error_max"])
            if r["brenier_stability_ratio_away"] > 0:
                ratios.append((f"{aw}@{hm}(A)", r["brenier_stability_ratio_away"]))
            if r["brenier_stability_ratio_home"] > 0:
                ratios.append((f"{aw}@{hm}(H)", r["brenier_stability_ratio_home"]))
        vals = [v for _, v in ratios]
        print(
            f"[WEEK 8 13-GAME INVARIANTS] active_ratios={len(vals)} | "
            f"median={float(np.median(vals)):.4f} | max={float(np.max(vals)):.4f} | "
            f"max_zero_sum_err={max_zero_sum_err:.2e}"
        )
        self.assertLess(float(np.max(vals)), 1.0)

    def test_1_kantorovich_three_marginal_relaxation_gap(self):
        p = np.array([0.5, 0.5], dtype=np.float64)
        # Cost = 0 on odd-parity triples (i+j+k mod 2 == 1), Cost = 1 on even-parity triples
        cost = np.array([[[1.0, 0.0], [0.0, 1.0]], [[0.0, 1.0], [1.0, 0.0]]], dtype=np.float64)
        res = kantorovich_three_marginal_relaxation_gap(p, p, p, cost)
        self.assertAlmostEqual(res["kantorovich_joint_prob"], 1.0, places=6)
        self.assertAlmostEqual(res["monge_joint_prob"], 0.5, places=6)
        self.assertGreater(res["relaxation_gap"], 0.49)
        print(
            f"[1. KANTOROVICH 3-MARGINAL] kant_prob={res['kantorovich_joint_prob']:.4f} | "
            f"monge_prob={res['monge_joint_prob']:.4f} | gap={res['relaxation_gap']:.4f}"
        )

    def test_2_rademacher_t_independent_tail_bound(self):
        w = np.array([0.30, 0.20, 0.15, 0.15, 0.10, 0.10], dtype=np.float64)
        b6 = rademacher_t_independent_tail_bound(w, t_clauses=6, delta=0.05)
        b20 = rademacher_t_independent_tail_bound(w, t_clauses=20, delta=0.05)
        self.assertAlmostEqual(b6["whitened_tail_radius"], b20["whitened_tail_radius"], places=12)
        self.assertLess(b6["whitened_tail_radius"], b6["naive_union_tail_radius"])
        self.assertAlmostEqual(b6["naive_union_bound_prob"], 0.30, places=9)
        self.assertAlmostEqual(b20["naive_union_bound_prob"], 1.00, places=9)
        print(
            f"[2. RADEMACHER TAIL] whitened_r={b6['whitened_tail_radius']:.4f} (t=6 & t=20) | "
            f"naive_r(t=20)={b20['naive_union_tail_radius']:.4f}"
        )

    def test_3_greedy_span_increasing_row_selector(self):
        M = np.array([
            [1.0, 0.0, 2.0],
            [0.0, 1.0, -1.0],
            [2.5, 0.0, 5.0],   # collinear duplicate of row 0
            [1.0, 1.0, 1.0],   # linear combination row 0 + row 1
            [0.0, 0.0, 1.0],   # independent 3rd basis direction
        ], dtype=np.float64)
        res = greedy_span_increasing_row_selector(M, eps_tol=1e-8)
        self.assertEqual(res["selected_indices"], [0, 1, 4])
        self.assertEqual(res["rejected_indices"], [2, 3])
        self.assertEqual(res["rank_progression"], [1, 2, 3])
        self.assertEqual(res["rank"], 3)
        print(
            f"[3. GREEDY SPAN SELECTOR] selected={res['selected_indices']} | "
            f"rejected={res['rejected_indices']} | rank_prog={res['rank_progression']}"
        )

    def test_4_lqr_riccati_clock_controller(self):
        A = np.array([[0.92, -0.05], [0.0, 0.88]], dtype=np.float64)
        B = np.array([[0.15], [0.25]], dtype=np.float64)
        Q = np.diag([1.0, 0.5])
        R = np.array([[0.5]], dtype=np.float64)
        x0 = np.array([7.0, 4.0], dtype=np.float64)
        res = lqr_riccati_clock_controller(A, B, Q, R, x0, horizon=8)
        self.assertTrue(res["gains_finite"])
        self.assertTrue(res["cost_non_increasing"])
        self.assertEqual(len(res["gains"]), 8)
        print(
            f"[4. LQR RICCATI] u_0={float(np.ravel(res['u_0'])[0]):.4f} | "
            f"cost_0={res['cost_to_go_trajectory'][0]:.4f} -> cost_T={res['cost_to_go_trajectory'][-1]:.4f}"
        )

    def test_5_albert_chib_markov_switching_regime_update(self):
        panic = albert_chib_markov_switching_regime_update(y_obs=21.8, score_diff=-10.0)
        drain = albert_chib_markov_switching_regime_update(y_obs=31.8, score_diff=+10.0)
        self.assertAlmostEqual(sum(panic["posterior_regime_probs"].values()), 1.0, places=9)
        self.assertAlmostEqual(sum(drain["posterior_regime_probs"].values()), 1.0, places=9)
        self.assertGreater(panic["posterior_regime_probs"]["script_panic"], 0.50)
        self.assertGreater(drain["posterior_regime_probs"]["clock_drain"], 0.50)
        self.assertGreater(panic["regime_weighted_variance"], 0.0)
        print(
            f"[5. ALBERT-CHIB HAMILTON] panic_prob={panic['posterior_regime_probs']['script_panic']:.4f} "
            f"(mean={panic['regime_weighted_mean']:.2f}s) | "
            f"drain_prob={drain['posterior_regime_probs']['clock_drain']:.4f} "
            f"(mean={drain['regime_weighted_mean']:.2f}s)"
        )

    def test_6_talisman_dependency_variance_multiplier(self):
        # Concentrated talisman share (0.36 >= 0.30) when pressured -> multiplier > 1
        high = talisman_dependency_variance_multiplier([0.36, 0.20, 0.16, 0.14, 0.14], primary_scratched_or_pressured=True)
        self.assertGreaterEqual(high["tdr"], 0.30)
        self.assertGreater(high["variance_multiplier"], 1.0)
        self.assertTrue(high["fragile"])
        # Balanced share (max 0.24 < 0.30) -> multiplier == 1.0
        bal = talisman_dependency_variance_multiplier([0.24, 0.21, 0.19, 0.18, 0.18], primary_scratched_or_pressured=True)
        self.assertEqual(bal["variance_multiplier"], 1.0)
        self.assertFalse(bal["fragile"])
        print(
            f"[6. TALISMAN TDR] high_tdr={high['tdr']:.2f}, sdi={high['sdi']:.2f}, mult={high['variance_multiplier']:.4f} | "
            f"bal_mult={bal['variance_multiplier']:.4f}"
        )

    def test_7_situational_harvest_midday_x100(self):
        buf_offset = compute_kickoff_drive_start_offset(KICKOFF_RETURN_DRIVE_START_ANCHORS_2026["BUF"])
        self.assertAlmostEqual(buf_offset, 25.0 - 37.8, places=6)
        rz_diff = compute_rz_points_per_trip_differential(5.75, 4.10)
        self.assertAlmostEqual(rz_diff, 1.65, places=6)
        gb_anchor = NON_BLITZ_PRESSURE_ANCHORS_2026["GB"]
        gb_surplus = compute_non_blitz_pressure_surplus(gb_anchor["pressure_rate"], gb_anchor["blitz_rate"])
        self.assertAlmostEqual(gb_surplus, 0.469 - 0.85 * 0.280, places=6)
        self.assertEqual(TB_WR_EMEKA_EGBUKA_OUT_FLAG["status"], "OUT")
        sealed_obj, digest = load_sealed_object_readonly()
        tb_sim = simulate_matchup_pbp("TB", "NO", [], [], sealed_obj, digest, n_sims=200, seed=901, return_vectors=True)
        self.assertTrue(tb_sim["situational_harvest_midday"]["tb_wr_emeka_egbuka_out_applied"])
        self.assertIn("WR2", tb_sim["away_injuries_applied"])
        print(
            f"[7. SITUATIONAL HARVEST] BUF_drive_offset={buf_offset:.1f}yd | "
            f"GB_non_blitz_surplus={gb_surplus:+.4f} | TB_Egbuka_OUT={tb_sim['situational_harvest_midday']['tb_wr_emeka_egbuka_out_applied']}"
        )

    def test_8_compute_postgame_dual_luck_grade_and_fence(self):
        grade = compute_postgame_dual_luck_grade(
            dtw_win_prob=0.68, actual_win=0, delta_wp_penalties=-0.14, delta_wp_luck=-0.22, context="postgame", pregame_weight=0.0
        )
        self.assertEqual(grade["pregame_weight"], 0.0)
        self.assertTrue(grade["fenced_postgame_only"])
        self.assertGreater(grade["counterfactual_win_prob"], 0.50)
        with self.assertRaises(RuntimeError):
            compute_postgame_dual_luck_grade(0.68, 0, -0.14, -0.22, context="pregame", pregame_weight=0.0)
        with self.assertRaises(RuntimeError):
            compute_postgame_dual_luck_grade(0.68, 0, -0.14, -0.22, context="postgame", pregame_weight=0.05)
        print(
            f"[8. DUAL LUCK GRADER FENCE] cf_win_prob={grade['counterfactual_win_prob']:.4f} | "
            f"pregame_weight={grade['pregame_weight']} (hard fence verified)"
        )

    def test_9_standing_overnight_items_signal_pack_and_tau_hat(self):
        sp = load_signal_pack_and_full_tables()
        self.assertEqual(sp["signal_pack_table_count"], 7)
        self.assertGreaterEqual(sp["full_tables_csv_count"], 30)
        self.assertAlmostEqual(float(sp["timo_paired_flip_inflation_ratio"]), 1.3607067, places=5)
        self.assertAlmostEqual(sum(SFDATA9ERS_COMPOSITE_QB_WEIGHTS.values()), 1.0, places=9)
        qb_comp = compute_sfdata9ers_composite_qb_score(80.0, 75.0, 70.0, 72.0, 85.0, 90.0)
        self.assertGreater(qb_comp, 75.0)
        tau_cal = apply_tau_hat_calibration_shrinkage(raw_margin=10.0, tau_hat=6.77, n_held_out=3988, held_out_only=True)
        self.assertEqual(tau_cal["tau_hat"], 6.77)
        self.assertEqual(tau_cal["n_held_out"], 3988)
        self.assertTrue(0.0 < tau_cal["shrunk_margin"] < 10.0)
        with self.assertRaises(ValueError):
            apply_tau_hat_calibration_shrinkage(10.0, held_out_only=False)
        print(
            f"[9. SIGNAL PACK + TAU_HAT] signal_tables={sp['signal_pack_table_count']}, "
            f"full_tables={sp['full_tables_csv_count']}, timo_ratio={sp['timo_paired_flip_inflation_ratio']:.4f}, "
            f"tau_hat_shrunk={tau_cal['shrunk_margin']:.4f}"
        )


if __name__ == "__main__":
    unittest.main()

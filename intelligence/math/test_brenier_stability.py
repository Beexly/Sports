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
    append_gate_decision,
    carry_distribution,
    compute_sfdata9ers_composite_qb_score,
    consume_signal_pack,
    drive_start_yards,
    harvest_situational_signals,
    load_signal_pack_and_full_tables,
    offense_average_drive_start,
    points_off_turnovers,
    rz_points_per_trip,
    stuff_rate,
    success_rate_allowed_split,
)
from intelligence.math.vmls_and_numpy_kernels import (
    condition_number_estimate,
    constraint_status,
    greedy_span_increasing_row_selector,
    greedy_span_increasing_rows,
    katch_mcardle_rmr,
    least_squares_polynomial_fit,
    lqr_riccati_clock_controller,
    tdee_from_activity,
)
from intelligence.math.effective_theory_and_large_deviations import (
    albert_chib_markov_switching_regime_update,
    birkhoff_sanity_check,
    compute_residual_corank,
    distress,
    evaluate_card_financial_impact_fence,
    exact_decomposition_allowed,
    exceptional_persistence,
    financial_impact_index,
    guarded_shrinkage_step,
    kantorovich_three_marginal_relaxation_gap,
    kantorovich_two_marginal_gap,
    mathworks_disposable_edge_tail_check,
    ordinary_correlation_check,
    rademacher_t_independent_tail_bound,
    rademacher_tail_bound,
    spectral_mass_near_pole,
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
    compute_luck_penalty_wp_swing,
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
        coranks = []
        max_zero_sum_err = 0.0
        for idx, (aw, hm) in enumerate(week8_matchups):
            aw_i = inj_map.get(aw, ["WR2"] if idx % 3 == 0 else [])
            hm_i = inj_map.get(hm, ["TE1"] if idx % 4 == 0 else [])
            r = simulate_matchup_pbp(aw, hm, aw_i, hm_i, sealed_obj, digest, n_sims=500, seed=800 + idx)
            self.assertLess(r["solenoidal_zero_sum_error_max"], 1e-12)
            self.assertNotIn("external_accuracy_anchors", r)
            coranks.append(int(r["residual_corank"]))
            max_zero_sum_err = max(max_zero_sum_err, r["solenoidal_zero_sum_error_max"])
            if r["brenier_stability_ratio_away"] > 0:
                ratios.append((f"{aw}@{hm}(A)", r["brenier_stability_ratio_away"]))
            if r["brenier_stability_ratio_home"] > 0:
                ratios.append((f"{aw}@{hm}(H)", r["brenier_stability_ratio_home"]))
        vals = [v for _, v in ratios]
        slate_mean_corank = float(np.mean(coranks))
        print(
            f"[WEEK 8 13-GAME INVARIANTS] active_ratios={len(vals)} | "
            f"median={float(np.median(vals)):.4f} | max={float(np.max(vals)):.4f} | "
            f"slate_mean_residual_corank={slate_mean_corank:.4f} | max_zero_sum_err={max_zero_sum_err:.2e}"
        )
        self.assertLess(float(np.max(vals)), 1.0)

    def test_1_kantorovich_birkhoff_monge_three_marginal_relaxation_gap(self):
        # 2-marginal Birkhoff-von Neumann sanity check: gap == 0 within 1e-9 and is_permutation
        birk = birkhoff_sanity_check(n=3)
        self.assertLess(birk["gap"], 1e-9)
        self.assertTrue(birk["is_permutation"])
        two_m = kantorovich_two_marginal_gap(
            [1.0 / 3, 1.0 / 3, 1.0 / 3],
            [1.0 / 3, 1.0 / 3, 1.0 / 3],
            np.array([[0.1, 0.9, 0.4], [0.7, 0.2, 0.8], [0.5, 0.3, 0.1]], dtype=np.float64),
        )
        self.assertLess(two_m["relaxation_gap"], 1e-9)

        # 3-marginal parity and Friesecke d=3 non-Monge extreme point check: gap > 0
        p = np.array([0.5, 0.5], dtype=np.float64)
        cost = np.array([[[1.0, 0.0], [0.0, 1.0]], [[0.0, 1.0], [1.0, 0.0]]], dtype=np.float64)
        res = kantorovich_three_marginal_relaxation_gap(p, p, p, cost)
        self.assertAlmostEqual(res["kantorovich_joint_prob"], 1.0, places=6)
        self.assertAlmostEqual(res["monge_joint_prob"], 0.5, places=6)
        self.assertGreater(res["relaxation_gap"], 0.49)
        self.assertTrue(res["residual_non_increasing"])
        self.assertLess(res["dual_residual"], 1e-8)
        self.assertTrue(res["is_mixture"])

        p3 = np.array([1.0 / 3, 1.0 / 3, 1.0 / 3], dtype=np.float64)
        c3 = np.ones((3, 3, 3), dtype=np.float64)
        for i, j, k in [(0, 0, 1), (0, 1, 2), (1, 1, 2), (1, 2, 0), (2, 2, 1), (2, 0, 0)]:
            c3[i, j, k] = 0.0
        res3 = kantorovich_three_marginal_relaxation_gap(p3, p3, p3, c3)
        self.assertEqual(len(res3["non_monge_support"]), 6)
        self.assertGreater(res3["relaxation_gap"], 0.30)
        print(
            f"[1. KANTOROVICH 3-MARGINAL + BIRKHOFF] birkhoff_2m_gap={birk['gap']:.2e} | "
            f"kant_prob={res['kantorovich_joint_prob']:.4f} | monge_prob={res['monge_joint_prob']:.4f} | "
            f"gap={res['relaxation_gap']:.4f} | dual_res={res['dual_residual']:.2e}"
        )

    def test_2_rademacher_t_independent_tail_bound(self):
        w = np.array([0.30, 0.20, 0.15, 0.15, 0.10, 0.10], dtype=np.float64)
        b6 = rademacher_tail_bound(w, t=6)
        b20 = rademacher_tail_bound(w, t=20)
        self.assertAlmostEqual(b6["whitened_tail_radius"], b20["whitened_tail_radius"], places=12)
        self.assertLess(b6["whitened_tail_radius"], b6["naive_union_tail_radius"])
        print(
            f"[2. RADEMACHER TAIL] whitened_r={b6['whitened_tail_radius']:.4f} (t=6 & t=20) | "
            f"naive_r(t=20)={b20['naive_union_tail_radius']:.4f}"
        )

    def test_3_greedy_span_increasing_rows(self):
        M = np.array([
            [1.0, 0.0, 2.0],
            [0.0, 1.0, -1.0],
            [2.5, 0.0, 5.0],   # collinear duplicate of row 0
            [1.0, 1.0, 1.0],   # linear combination row 0 + row 1
            [0.0, 0.0, 1.0],   # independent 3rd basis direction
        ], dtype=np.float64)
        res = greedy_span_increasing_rows(M, k=2)
        self.assertEqual(res["selected_indices"], [0, 1])
        self.assertEqual(res["rank"], 2)
        full = greedy_span_increasing_row_selector(M, eps_tol=1e-8)
        self.assertEqual(full["selected_indices"], [0, 1, 4])
        self.assertEqual(full["rejected_indices"], [2, 3])
        print(
            f"[3. GREEDY SPAN SELECTOR] k=2 selected={res['selected_indices']} | "
            f"full_selected={full['selected_indices']} | rejected={full['rejected_indices']}"
        )

    def test_4_lqr_riccati_clock_controller(self):
        res2 = lqr_riccati_clock_controller([7.0, 4.0], horizon=8)
        self.assertTrue(res2["gains_finite"])
        self.assertTrue(res2["cost_non_increasing"])
        self.assertEqual(len(res2["gains"]), 8)
        print(
            f"[4. LQR RICCATI] u_0={float(np.ravel(res2['u_0'])[0]):.4f} | "
            f"cost_0={res2['cost_to_go_trajectory'][0]:.4f} -> cost_T={res2['cost_to_go_trajectory'][-1]:.4f}"
        )

    def test_5_albert_chib_markov_switching_regime_update(self):
        obs = [21.8, 22.1]
        P_trans = [[0.90, 0.10], [0.15, 0.85]]
        panic = albert_chib_markov_switching_regime_update(obs, P_trans)
        drain = albert_chib_markov_switching_regime_update(y_obs=31.8, score_diff=+10.0)
        self.assertAlmostEqual(sum(panic["posterior_regime_probs"].values()), 1.0, places=9)
        self.assertAlmostEqual(sum(drain["posterior_regime_probs"].values()), 1.0, places=9)
        self.assertGreater(panic["posterior_regime_probs"]["script_panic"], 0.50)
        self.assertGreater(drain["posterior_regime_probs"]["clock_drain"], 0.50)
        print(
            f"[5. ALBERT-CHIB HAMILTON] panic_prob={panic['posterior_regime_probs']['script_panic']:.4f} | "
            f"drain_prob={drain['posterior_regime_probs']['clock_drain']:.4f}"
        )

    def test_6_talisman_dependency_variance_multiplier(self):
        zero_rho = talisman_dependency_variance_multiplier(0.0, 5)
        self.assertEqual(zero_rho, 1.0)
        pos_rho = talisman_dependency_variance_multiplier(0.35, 5)
        self.assertGreater(pos_rho, 1.0)
        high = talisman_dependency_variance_multiplier([0.36, 0.20, 0.16, 0.14, 0.14], primary_scratched_or_pressured=True)
        self.assertGreater(high["variance_multiplier"], 1.0)
        print(
            f"[6. TALISMAN TDR] rho0_mult={zero_rho:.2f} | "
            f"rho035_mult={pos_rho:.4f} | share_mult={high['variance_multiplier']:.4f}"
        )

    def test_7_harvest_situational_signals_10_play_drive(self):
        synthetic_10_play_drive = [
            {"play_type": "kickoff", "start_yardline": 28.0, "penalty": False, "normal_kickoff": True},
            {"play_type": "run", "down": 1, "yards_gained": 4.0, "success": True},
            {"play_type": "pass", "down": 2, "yards_gained": 11.0, "success": True},
            {"play_type": "run", "down": 1, "yards_gained": 0.0, "success": False},
            {"play_type": "pass", "down": 2, "yards_gained": 8.0, "success": True},
            {"play_type": "run", "down": 3, "yards_gained": 6.0, "success": True},
            {"play_type": "run", "down": 1, "yards_gained": -1.0, "success": False},
            {"play_type": "pass", "down": 2, "yards_gained": 18.0, "success": True},
            {"play_type": "run", "down": 1, "yards_gained": 7.0, "success": True},
            {"play_type": "pass", "down": 2, "yards_gained": 9.0, "success": True, "rz_trip_end": True, "points": 7.0},
        ]
        harvest = harvest_situational_signals(synthetic_10_play_drive)
        self.assertEqual(harvest["play_count"], 10)
        self.assertEqual(harvest["carry_distribution"]["count"], 5)
        self.assertEqual(harvest["carry_distribution"]["median"], 4.0)
        self.assertAlmostEqual(harvest["stuff_rate"]["overall_stuff_rate"], 2.0 / 5.0, places=6)
        print(
            f"[7. HARVEST 10-PLAY DRIVE] plays={harvest['play_count']} | "
            f"rush_median={harvest['carry_distribution']['median']:.1f} | "
            f"stuff={harvest['stuff_rate']['overall_stuff_rate']:.2f}"
        )

    def test_8_compute_postgame_dual_luck_grade_and_second_grader_fence(self):
        grade_id = compute_postgame_dual_luck_grade("2026_08_CAR_GB")
        self.assertEqual(grade_id["pregame_weight"], 0.0)
        self.assertFalse(grade_id["writes_pick"])
        self.assertEqual(len(grade_id["dtw_interval"]), 2)
        self.assertLess(grade_id["dtw_interval"][0], grade_id["dtw_win_prob"])
        self.assertGreater(grade_id["dtw_interval"][1], grade_id["dtw_win_prob"])

        wp_swing = compute_luck_penalty_wp_swing(
            delta_wp_penalties=-0.14,
            delta_wp_drops=-0.08,
            delta_wp_fumbles=-0.07,
            delta_wp_kicking=-0.07,
            game_final=True,
            context="postgame",
            pregame_weight=0.0,
        )
        self.assertEqual(wp_swing["pregame_weight"], 0.0)
        self.assertFalse(wp_swing["writes_pick"])
        self.assertEqual(wp_swing["gate_decisions_mode"], "POSTGAME_ANNOTATION_AFTER_FINAL")
        with self.assertRaises(RuntimeError):
            compute_postgame_dual_luck_grade(0.68, 0, -0.14, -0.22, context="pregame", pregame_weight=0.0)
        with self.assertRaises(RuntimeError):
            compute_luck_penalty_wp_swing(delta_wp_penalties=-0.05, context="pregame")
        print(
            f"[8. DUAL LUCK + WP SWING FENCE] dtw={grade_id['dtw_quoted_with_interval']} | "
            f"net_luck_wp={wp_swing['total_wp_swing']:.2f}"
        )

    def test_9_consume_signal_pack_and_tau_hat(self):
        pack = consume_signal_pack()
        self.assertEqual(pack["table_count"], 7)
        self.assertEqual(pack["broken_tackles_allowed"], "NOT_AVAILABLE")
        self.assertTrue(pack["pfr_throwaway_columns_preserved"])
        with self.assertRaises(ValueError):
            consume_signal_pack(weeks=(1, 2, 8))
        with self.assertRaises(FileNotFoundError):
            consume_signal_pack(pack_dir=_REPO_ROOT / "docs" / "research" / "nonexistent_pack")

        tau_cal = apply_tau_hat_calibration_shrinkage(raw_margin=10.0, tau_hat=6.77, n=3988)
        self.assertEqual(tau_cal["tau_hat"], 6.77)
        self.assertEqual(tau_cal["n"], 3988)
        self.assertTrue(0.0 < tau_cal["shrunk_margin"] < 10.0)
        print(
            f"[9. CONSUME SIGNAL PACK + TAU_HAT] tables={pack['table_count']}, "
            f"bt_allowed={pack['broken_tackles_allowed']}, tau_shrunk={tau_cal['shrunk_margin']:.4f}"
        )

    def test_10_twelve_new_wires_complete(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger = Path(tmpdir) / "gate_decisions_test.jsonl"
            r_pass = append_gate_decision("2026_08_CAR_GB", "spread", 0.57, 0.54, "PASS", "clears_conjunction", ledger_path=ledger)
            r_rej = append_gate_decision("2026_08_NYJ_CIN", "moneyline", 0.49, 0.54, "REJECT", "below_threshold", ledger_path=ledger)
            r_abs = append_gate_decision("2026_08_TB_NO", "total", 0.52, 0.54, "ABSTAIN", "corank_abstain", ledger_path=ledger)
            lines = ledger.read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(lines), 3)
            self.assertEqual(r_pass["status"], "PUBLISHED")
            self.assertEqual(r_rej["status"], "GATED")
            self.assertEqual(r_abs["decision"], "ABSTAIN")

        # Wire 4: pure-count nflverse functions
        kr_6 = [{"start_yardline": 27.0, "penalty": False, "normal_kickoff": True}] * 6
        self.assertIsNone(drive_start_yards(kr_6))
        kr_7 = [{"start_yardline": 28.0, "penalty": False, "normal_kickoff": True}] * 7
        self.assertEqual(drive_start_yards(kr_7), 28.0)
        self.assertEqual(offense_average_drive_start([{"start_yardline": 25.0}, {"start_yardline": 35.0}]), 30.0)
        self.assertIsNone(rz_points_per_trip([]))
        self.assertAlmostEqual(
            rz_points_per_trip([{"points": 6.0}, {"points": 3.0}]),
            4.5,
            places=6,
        )
        sr = success_rate_allowed_split([
            {"play_type": "run", "down": 1, "success": True},
            {"play_type": "pass", "down": 3, "success": False},
        ])
        self.assertEqual(sr["run_success_rate_allowed"], 1.0)
        self.assertEqual(sr["pass_success_rate_allowed"], 0.0)
        st = stuff_rate([
            {"yards_gained": 10},
            {"yards_gained": 0},
            {"yards_gained": 4},
            {"yards_gained": -1},
        ], window=3)
        self.assertAlmostEqual(st["window_stuff_rate"], 2.0 / 3.0, places=6)
        cd = carry_distribution([2.0, 6.0, 1.0, 8.0, 4.0])
        self.assertEqual(cd["median"], 4.0)
        self.assertAlmostEqual(cd["share_over_5"], 0.4, places=6)
        pot = points_off_turnovers([
            {"start_from_takeaway": True, "points": 7.0},
            {"start_from_takeaway": False, "points": 3.0},
        ])
        self.assertEqual(pot, 7.0)

        # Wire 6: corank exactness gate (excludes rank-1 mean mode)
        self.assertEqual(compute_residual_corank([3.1, 2.5, 1.8, 0.9], lambda_plus=1.5), 2)
        self.assertTrue(exact_decomposition_allowed(0))
        self.assertTrue(exact_decomposition_allowed(1))
        self.assertFalse(exact_decomposition_allowed(2))

        # Wire 7: exceptional persistence flag (both sides of (1-rho)*log(n) < c)
        self.assertTrue(exceptional_persistence(0.98, 50, c=0.1))
        self.assertFalse(exceptional_persistence(0.80, 50, c=0.1))
        unshrunk = guarded_shrinkage_step(1.2, rho=0.98, n=50, c=0.1)
        self.assertEqual(unshrunk["status"], "UNSHRUNK")
        shrunk = guarded_shrinkage_step(1.2, rho=0.80, n=50, c=0.1)
        self.assertEqual(shrunk["status"], "SHRUNK")

        # Wire 8: spectral_mass_near_pole (7/8 threshold)
        pole = spectral_mass_near_pole([1.0, 0.90, 0.40])
        self.assertTrue(pole["has_mode_near_pole"])
        self.assertEqual(pole["flagged_mode_indices"], [1])

        # Wire 9: undecidable constraint fence
        self.assertEqual(constraint_status("linear_equality"), "DECIDED")
        self.assertEqual(constraint_status("psd_cone"), "DECIDED")
        self.assertEqual(constraint_status("convex_quadratic"), "DECIDED")
        self.assertEqual(constraint_status("cubic"), "UNDECIDED")

        # Wire 10: ordinary correlation check (n > 16, 1/log(n))
        x_ser = np.linspace(0.0, 1.0, 25)
        y_ser = x_ser + 0.05 * np.sin(np.arange(25))
        corr_chk = ordinary_correlation_check(x_ser, y_ser)
        self.assertTrue(corr_chk["must_keep_off_diagonal"])

        # Wire 11: Katch-McArdle + tdee_from_activity
        rmr = katch_mcardle_rmr(80.0)
        self.assertAlmostEqual(tdee_from_activity(rmr, 1.55), 2098.0 * 1.55, places=5)
        with self.assertRaises(ValueError):
            katch_mcardle_rmr(0.0)
        with self.assertRaises(ValueError):
            tdee_from_activity(rmr, 0.95)

        # Wire 12: financial impact index & distress fence
        fii_ok = financial_impact_index(500.0, 10000.0)
        self.assertFalse(distress(fii_ok))
        fii_bad = financial_impact_index(1500.0, 10000.0)
        self.assertTrue(distress(fii_bad))
        fence_bad = evaluate_card_financial_impact_fence(1500.0, 10000.0)
        self.assertEqual(fence_bad["card_decision"], "NO_BET")
        print("[10. TWELVE NEW WIRES] All 12 wires verified with Exit Code 0")


if __name__ == "__main__":
    unittest.main()

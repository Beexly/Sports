"""Unit tests for Unified Quantitative NFL Projection Architecture & Honest Equation Executor."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.architecture.unified_quantitative_nfl_architecture import (
    american_to_raw_implied_prob,
    cfbd_piecewise_line_yards,
    compute_cfbd_opponent_adjusted_line_yards,
    compute_circadian_performance_index,
    decompose_volume_vs_efficiency_residual,
    devig_all_six_methods,
    enforce_macro_conservation_c0_c6,
    evaluate_dynamic_kickoff_2026,
    humid_air_density_kg_m3,
    map_injury_designation_to_dropoff_bucket,
    minimum_kl_entropic_tilting,
    run_all_docx_verification_benchmarks,
    simulate_victory_formation_rule4,
    sinkhorn_knopp_ipf,
    solve_nflfastr_pr618_net_ep,
    student_t_upper_tail_dependence,
)
from intelligence.equations.honest_equation_executor import (
    STATUS_PARSED_EVALUATED,
    STATUS_PARSED_SYMBOLIC_ONLY,
    STATUS_UNPARSEABLE,
    parse_and_execute_honestly,
)


class TestUnifiedQuantitativeNflArchitecture(unittest.TestCase):
    def test_honest_equation_executor_never_fabricates_bindings(self) -> None:
        # Pure numeric expression evaluates without bindings
        r_num = parse_and_execute_honestly(r"\frac{12 + 4}{2^2}", bindings=None, allow_domain_probe=False)
        self.assertEqual(r_num.status, STATUS_PARSED_EVALUATED)
        self.assertAlmostEqual(float(r_num.evaluated_value or 0.0), 4.0, places=9)

        # Symbolic expression with free symbols stays PARSED_SYMBOLIC_ONLY when bindings are omitted
        r_sym = parse_and_execute_honestly(r"WOPR = 1.5 \cdot TS + 0.7 \cdot AYS", bindings=None, allow_domain_probe=False)
        self.assertEqual(r_sym.status, STATUS_PARSED_SYMBOLIC_ONLY)
        self.assertIsNone(r_sym.evaluated_value)
        self.assertIn("TS", r_sym.free_symbols)
        self.assertIn("AYS", r_sym.free_symbols)

        # Providing explicit real bindings evaluates cleanly
        r_bound = parse_and_execute_honestly(
            r"WOPR = 1.5 \cdot TS + 0.7 \cdot AYS",
            bindings={"TS": 0.28, "AYS": 0.40},
            allow_domain_probe=False,
        )
        self.assertEqual(r_bound.status, STATUS_PARSED_EVALUATED)
        self.assertAlmostEqual(float(r_bound.evaluated_value or 0.0), 0.70, places=9)

        # Prose fragment is honestly flagged UNPARSEABLE
        r_prose = parse_and_execute_honestly(
            "This chapter concerns fitting probability models to data",
            bindings=None,
            allow_domain_probe=False,
        )
        self.assertEqual(r_prose.status, STATUS_UNPARSEABLE)
        self.assertTrue(len(r_prose.reason) > 0)

    def test_six_method_devigging_exact_docx_benchmarks(self) -> None:
        q2 = [american_to_raw_implied_prob(-450.0), american_to_raw_implied_prob(340.0)]
        d2 = devig_all_six_methods(q2)
        self.assertAlmostEqual(100.0 * d2["Multiplicative"][1], 21.74, places=2)
        self.assertAlmostEqual(100.0 * d2["Additive"][1], 20.45, places=2)
        self.assertAlmostEqual(100.0 * d2["Cheung_Odds_Ratio"][1], 20.36, places=2)
        self.assertAlmostEqual(100.0 * d2["Probit"][1], 20.38, places=2)
        self.assertAlmostEqual(100.0 * d2["Power"][1], 19.73, places=2)
        self.assertAlmostEqual(100.0 * d2["Shin"][1], 20.45, places=2)

        for method_probs in d2.values():
            self.assertAlmostEqual(sum(method_probs), 1.0, places=5)

    def test_victory_formation_rule4_pre_two_minute_trap(self) -> None:
        vf_201 = simulate_victory_formation_rule4(121.0, defensive_timeouts=0)
        self.assertAlmostEqual(vf_201["total_seconds_burned"], 86.4, places=1)
        self.assertAlmostEqual(vf_201["clock_remaining_at_turnover_s"], 34.6, places=1)
        self.assertFalse(vf_201["kill_guaranteed"])

        vf_200 = simulate_victory_formation_rule4(120.0, defensive_timeouts=0)
        self.assertAlmostEqual(vf_200["clock_remaining_at_turnover_s"], 0.0, places=1)
        self.assertTrue(vf_200["kill_guaranteed"])

        self.assertTrue(simulate_victory_formation_rule4(86.0, defensive_timeouts=1)["kill_guaranteed"])
        self.assertTrue(simulate_victory_formation_rule4(46.0, defensive_timeouts=2)["kill_guaranteed"])
        self.assertTrue(simulate_victory_formation_rule4(6.0, defensive_timeouts=3)["kill_guaranteed"])

    def test_sinkhorn_and_entropic_tilting_machine_precision(self) -> None:
        seed = np.array(
            [
                [0.35, 0.30, 0.22, 0.13],
                [0.25, 0.32, 0.26, 0.17],
                [0.42, 0.35, 0.18, 0.05],
                [0.55, 0.30, 0.12, 0.03],
                [0.75, 0.20, 0.04, 0.01],
            ],
            dtype=np.float64,
        )
        row_t = np.array([9.5, 7.2, 6.4, 5.8, 4.1], dtype=np.float64)
        col_t = np.array([13.2, 10.4, 6.3, 3.1], dtype=np.float64)
        sk = sinkhorn_knopp_ipf(seed, row_t, col_t, max_iters=50, tol=1e-15)
        self.assertLessEqual(sk["iterations"], 50)
        self.assertLess(sk["max_marginal_error"], 1e-14)

        rng = np.random.default_rng(20261110)
        p_draws = 238.92 + 70.5 * rng.standard_normal(25_000)
        r_draws = 111.17 - 0.22 * (p_draws - 238.92) + 38.0 * rng.standard_normal(25_000)
        tilt = minimum_kl_entropic_tilting(
            np.column_stack([p_draws, r_draws]),
            np.array([248.50, 108.00], dtype=np.float64),
        )
        self.assertLess(tilt["max_constraint_error"], 1e-8)
        self.assertGreater(tilt["ess_ratio"], 0.94)

    def test_nflfastr_pr618_cfbd_line_yards_and_injury_dropoff_fix(self) -> None:
        pr618 = solve_nflfastr_pr618_net_ep(
            {"td": 0.375, "opp_td": 0.195, "fg": 0.235, "opp_fg": 0.135, "safety": 0.004, "opp_safety": 0.003},
            {"td": 0.415, "opp_td": 0.175, "fg": 0.250, "opp_fg": 0.115, "safety": 0.003, "opp_safety": 0.003},
            season=2026,
            half_seconds_remaining=900.0,
            exact_w=True,
        )
        self.assertGreater(pr618["v_kickoff_ep"], 0.9)
        self.assertLess(pr618["td_net_score_value"], 6.2)
        self.assertLess(pr618["fg_net_score_value"], 2.3)

        # CFBD piecewise line yards
        self.assertAlmostEqual(cfbd_piecewise_line_yards(-3.0), -3.6)
        self.assertAlmostEqual(cfbd_piecewise_line_yards(4.0), 4.0)
        self.assertAlmostEqual(cfbd_piecewise_line_yards(8.0), 6.0)
        self.assertAlmostEqual(cfbd_piecewise_line_yards(25.0), 7.0)

        plays = [
            {"posteam": "LA", "defteam": "SEA", "yards_gained": 6.0},
            {"posteam": "SEA", "defteam": "LA", "yards_gained": 2.0},
        ] * 25
        ly = compute_cfbd_opponent_adjusted_line_yards(plays)
        self.assertGreater(ly["LA"]["opp_adjusted_off_line_yards"], ly["SEA"]["opp_adjusted_off_line_yards"])

        # Hermes Oct 30 role-key fix
        self.assertEqual(map_injury_designation_to_dropoff_bucket("LT"), "OL")
        self.assertEqual(map_injury_designation_to_dropoff_bucket("WR1"), "SKILL")
        self.assertEqual(map_injury_designation_to_dropoff_bucket("CB1"), "DEF")
        self.assertEqual(map_injury_designation_to_dropoff_bucket("EDGE1"), "DEF")

    def test_physics_circadian_tail_dep_and_conservation(self) -> None:
        rho_den = humid_air_density_kg_m3(temp_c=12.0, relative_humidity_0_1=0.30, elevation_m=1609.0)
        rho_mun = humid_air_density_kg_m3(temp_c=7.0, relative_humidity_0_1=0.78, elevation_m=520.0)
        rho_sea = humid_air_density_kg_m3(temp_c=20.0, relative_humidity_0_1=0.65, elevation_m=5.0)
        self.assertLess(rho_den, rho_mun)
        self.assertLess(rho_mun, rho_sea)

        cpi_munich = compute_circadian_performance_index(
            kickoff_utc_hour=14.5,
            team_body_clock_utc_offset=-5.0,
            timezone_zones_crossed=6.0,
            days_since_arrival=3.0,
            travel_direction="EAST",
        )
        self.assertLess(cpi_munich["cpi"], -0.45)

        self.assertAlmostEqual(student_t_upper_tail_dependence(0.55, 4.0), 0.2822, places=3)

        ko = evaluate_dynamic_kickoff_2026("LAR", is_50yd_penalty_kickoff=False)
        self.assertGreater(ko["expected_start_own_yardline"], 31.0)

        c_check = enforce_macro_conservation_c0_c6(
            {
                "pass_attempts": 32.0,
                "sacks": 2.0,
                "scrambles": 2.0,
                "designed_rushes": 26.0,
                "team_completions": 21.0,
                "gross_passing_yards": 245.0,
                "sack_yards_lost": 13.0,
                "team_rushing_yards": 118.0,
                "pass_tds": 1.8,
                "rush_tds": 0.9,
            },
            player_receptions=[8.0, 6.0, 4.0, 3.0],
            player_receiving_yards=[95.0, 72.0, 48.0, 30.0],
            player_rushing_yards=[22.0, 70.0, 26.0],
            player_pass_tds_received=[0.8, 0.5, 0.3, 0.2],
            player_rush_tds=[0.2, 0.5, 0.2],
        )
        self.assertTrue(c_check["all_identities_satisfied"])
        self.assertAlmostEqual(c_check["net_passing_yards"], 232.0)

        decomp = decompose_volume_vs_efficiency_residual(16.5, 70.7 / 16.5, 31.0, 107.0 / 31.0)
        self.assertAlmostEqual(
            decomp["opportunity_volume_error"] + decomp["efficiency_error"],
            decomp["total_residual"],
            places=1,
        )

        bench = run_all_docx_verification_benchmarks()
        self.assertGreater(bench["copula_scoring_sensitivity"]["vs05_pct_change"], 25.0)
        self.assertLess(bench["copula_scoring_sensitivity"]["es_pct_change"], 5.0)


if __name__ == "__main__":
    unittest.main()

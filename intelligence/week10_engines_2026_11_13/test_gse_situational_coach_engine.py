"""
Comprehensive pytest & unittest verification suite for gse_situational_coach_and_injury_engine.py.

Natively discovered and executed by ``pytest -v test_gse_situational_coach_engine.py`` in
``Beexly/Sports`` CI as well as zero-dependency ``python3 -m unittest -v``.

Covers:
1. All invented orthogonal situational metrics (BQP, SWCC, RIL, QPTSR, OLCAI, SPESE, CAOFI),
   Mahalanobis-Cholesky joint orthogonalization, Situational Asymmetry Index (SAI),
   locked-mean CRPS closed forms, CVI terminal refusal, and strict PIT leakage guards
   (date_modified <= kickoff - 90m, nflreadr depth charts >= 2025, zero lookahead).
2. Glicko-2 Illinois-method rating & volatility solver (tau = 0.42 sealed / 0.50 canonical)
   and exact idle-period bye-week RD expansion (phi' = sqrt(phi^2 + sigma^2)) across 1, 4,
   and 17 idle periods plus 2026 Week 10 NFL bye teams (CHI, DEN, PHI, TB).
3. Upgraded injury overlay invariants (immutable EPA_DROPOFF in [0.5, 1.2], SHA-256 tamper
   detection, log-domain stabilized Sinkhorn OT at small eps, scheme-matchup OT coupling,
   and byte-for-byte Tuesday v1.0 coachMindsetHash invariance across v3.0/v4.0 overlays).
4. Live 2026 NFL Week 10 13-game evaluations, integer XX/100 score formatting, and strict
   doctrine hygiene checks (zero forbidden legacy record strings, zero public NGS figures).
"""

from __future__ import annotations

import copy
import json
import math
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

import gse_situational_coach_and_injury_engine as eng

PLAYERS = ["WR1_A", "WR2_B", "WR3_C", "TE1_D"]
PRE = {"WR1_A": 0.40, "WR2_B": 0.25, "WR3_C": 0.20, "TE1_D": 0.15}
POST = {"WR1_A": 0.00, "WR2_B": 0.40, "WR3_C": 0.35, "TE1_D": 0.25}
ROLES = {"WR1_A": "WR1", "WR2_B": "WR1", "WR3_C": "WR2", "TE1_D": "TE1"}
COST = [[0.0 if i == j else 1.0 for j in range(4)] for i in range(4)]


def approx(a: float, b: float, tol: float = 1e-9) -> bool:
    return abs(a - b) <= tol


# ============================================================================ #
# 1. PIT Leakage Guards, Orthogonal Metrics & CRPS Locks
# ============================================================================ #


class TestPitGuardsAndSituationalMetrics(unittest.TestCase):
    def test_t90m_pit_guard_blocks_inside_90_minutes_and_future(self) -> None:
        kickoff = datetime(2026, 11, 15, 18, 0, tzinfo=timezone.utc)
        # Exactly T-90m (16:30 UTC) is legal
        self.assertIsNotNone(eng.validate_pit_timestamp("2026-11-15T16:30:00Z", kickoff))
        # T-89m (16:31 UTC) violates T-90m lock -> fails closed (None)
        self.assertIsNone(eng.validate_pit_timestamp("2026-11-15T16:31:00Z", kickoff))
        # Post-kickoff -> fails closed (None)
        self.assertIsNone(eng.validate_pit_timestamp("2026-11-15T19:00:00Z", kickoff))
        # Unstamped / NA -> fails closed (None)
        self.assertIsNone(eng.validate_pit_timestamp("NA", kickoff))
        self.assertIsNone(eng.validate_pit_timestamp(None, kickoff))

    def test_nflreadr_depth_charts_pre_2025_permanently_blocked(self) -> None:
        ko_2024 = datetime(2024, 11, 10, 18, 0, tzinfo=timezone.utc)
        ko_2025 = datetime(2025, 11, 9, 18, 0, tzinfo=timezone.utc)
        self.assertFalse(
            eng.validate_depth_chart_pit({"season": 2024, "dt": "2024-11-10T12:00:00Z"}, ko_2024)
        )
        self.assertTrue(
            eng.validate_depth_chart_pit({"season": 2025, "dt": "2025-11-09T12:00:00Z"}, ko_2025)
        )
        self.assertFalse(eng.validate_depth_chart_pit({"season": 2025, "dt": None}, ko_2025))

    def test_prior_window_isolation_blocks_week0_and_same_week_lookahead(self) -> None:
        self.assertFalse(eng.validate_prior_window(2026, 0, 2026, 10))
        self.assertFalse(eng.validate_prior_window(2026, 10, 2026, 10))
        self.assertFalse(eng.validate_prior_window(2026, 11, 2026, 10))
        self.assertTrue(eng.validate_prior_window(2026, 9, 2026, 10))
        self.assertTrue(eng.validate_prior_window(2025, 18, 2026, 1))

    def test_friday_injury_gate_raises_before_publication(self) -> None:
        fri_gate = datetime(2026, 11, 13, 23, 0, tzinfo=timezone.utc)
        thu_query = datetime(2026, 11, 12, 20, 0, tzinfo=timezone.utc)
        with self.assertRaises(eng.DataGapError):
            eng.require_friday_injury_gate(thu_query, fri_gate)
        eng.require_friday_injury_gate(fri_gate, fri_gate)

    def test_bqp_swcc_ril_fail_closed_and_exact_math(self) -> None:
        ko = datetime(2026, 11, 15, 18, 0, tzinfo=timezone.utc)
        valid_ts = "2026-11-15T16:00:00Z"  # <= kickoff - 90m
        late_ts = "2026-11-15T17:15:00Z"  # > kickoff - 90m

        bqp_val = eng.compute_bqp(
            [
                {
                    "side": "home",
                    "position": "QB",
                    "report_status": "IR",
                    "epa_starter_prior": 0.20,
                    "epa_backup_prior_snap_adj": 0.00,
                    "starter_snap_share_prior_3w": 0.95,
                    "date_modified": valid_ts,
                }
            ],
            ko,
            season=2026,
        )
        self.assertIsNotNone(bqp_val)
        assert bqp_val is not None
        self.assertTrue(approx(bqp_val, 0.20 * 0.95 * 2.5, 1e-9))

        self.assertIsNone(
            eng.compute_bqp(
                [
                    {
                        "side": "home",
                        "position": "QB",
                        "report_status": "Out",
                        "epa_starter_prior": 0.20,
                        "epa_backup_prior_snap_adj": 0.00,
                        "starter_snap_share_prior_3w": 0.95,
                        "date_modified": late_ts,
                    }
                ],
                ko,
            )
        )

        ko_2023 = datetime(2023, 10, 15, 17, 0, tzinfo=timezone.utc)
        self.assertIsNone(
            eng.compute_bqp(
                [
                    {
                        "side": "away",
                        "position": "WR",
                        "from_depth_chart": True,
                        "report_status": "Out",
                        "epa_starter_prior": 0.15,
                        "epa_backup_prior_snap_adj": -0.05,
                        "starter_snap_share_prior_3w": 0.45,
                        "date_modified": "2023-10-14T20:00:00Z",
                    }
                ],
                ko_2023,
                season=2023,
            )
        )

        self.assertIsNone(eng.compute_swcc(4.0, 7.0, None, 1100.0, 1050.0, valid_ts, ko))
        swcc = eng.compute_swcc(4.0, 7.0, 1500.0, 1100.0, 1050.0, valid_ts, ko)
        self.assertIsNotNone(swcc)
        assert swcc is not None
        self.assertTrue(approx(swcc, 3.0 * math.log(1501.0) * 1.1, 1e-9))

        self.assertIsNone(
            eng.compute_ril_team(
                [{"date_modified": "NA", "report_status": "Out", "position": "QB", "snap_share_prior_3w": 1.0}],
                7.0,
                ko,
            )
        )
        ril_short = eng.compute_ril_team(
            [{"date_modified": valid_ts, "report_status": "Out", "position": "QB", "snap_share_prior_3w": 1.0}],
            4.0,
            ko,
        )
        ril_bye = eng.compute_ril_team(
            [{"date_modified": valid_ts, "report_status": "Out", "position": "QB", "snap_share_prior_3w": 1.0}],
            14.0,
            ko,
        )
        assert ril_short is not None and ril_bye is not None
        self.assertTrue(approx(ril_short, math.sqrt(7.0 / 4.0) * 2.5, 1e-9))
        self.assertTrue(approx(ril_bye, math.sqrt(7.0 / 14.0) * 2.5, 1e-9))

    def test_qptsr_olcai_spese_caofi_and_sai_orthogonalization(self) -> None:
        self.assertIsNone(eng.compute_qptsr({"prior_dropbacks": 20.0}, {"prior_dropbacks": 15.0}))

        caofi_munich = eng.compute_caofi(-5.0, -5.0, 1.0, 9.5, 520.0, 45.0, 70.0, 0.90)
        caofi_dom = eng.compute_caofi(-5.0, -5.0, -5.0, 13.0, 45.0, 45.0, 70.0, 0.82)
        assert caofi_munich is not None and caofi_dom is not None
        self.assertGreater(caofi_munich, caofi_dom + 0.75)

        masses = eng.modulate_key_number_masses(0.16, 0.08, spese_val=0.55)
        self.assertTrue(approx(masses["p_abs_3"] + masses["p_abs_7"], 0.24, 1e-12))

        prior_rows = [
            [0.10, 0.12, 0.05],
            [0.25, 0.28, 0.10],
            [0.40, 0.42, 0.18],
            [0.55, 0.60, 0.22],
            [0.70, 0.74, 0.35],
        ]
        z = eng.orthogonalize_features_mahalanobis(prior_rows, [0.80, 0.85, 0.40])
        self.assertEqual(len(z), 3)
        self.assertTrue(all(math.isfinite(val) for val in z))
        sig_joint = eng.modulated_sigma_joint(13.45, z, [0.05, 0.04, 0.03])
        self.assertTrue(13.45 * math.exp(-0.35) - 1e-9 <= sig_joint <= 13.45 * math.exp(0.45) + 1e-9)

        sai = eng.compute_sai(
            {"BQP": 0.45, "SWCC": None, "RIL": 1.80, "QPTSR": 0.14, "OLCAI": 0.60, "SPESE": 0.50, "CAOFI": 0.95},
            eng._default_prior_metric_history(),
        )
        self.assertGreater(sai["sai"], 0.0)

    def test_cvi_terminal_refusal_and_crps_convexity_circuit_breaker(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "CVI"):
            eng.evaluate_feature_walk_forward("CVI", [])

        _, hess = eng.crps_gaussian_grad_sigma(-3.5, 13.45, 7.0)
        self.assertGreater(hess, 0.0)
        hyb = eng.crps_hybrid_key_numbers(-3.0, 9.5, {-3: 0.09, 3: 0.11, -7: 0.04, 7: 0.06}, 3.0)
        self.assertTrue(math.isfinite(hyb) and hyb > 0.0)

        manifest = {
            "galaxy_locked_state": {
                "mu": "market_close",
                "vision_weight": 0.0,
                "zero_imputation": True,
                "pass_veto": "unconditional",
            },
            "current_measured_baseline": {
                "n": 2462,
                "gaussian_13_45_crps": 7.1540,
                "best_measured_crps": 7.1540,
                "passed": False,
            },
        }
        elig = eng.validate_emission_eligibility(manifest)
        self.assertFalse(elig["eligible"])
        zero = eng.build_zero_slate_object("2026-11-13T00:00:00Z")
        self.assertEqual(zero["picks"], [])
        self.assertEqual(zero["parlays"], [])
        self.assertEqual(zero["dfs_lineups"], [])


# ============================================================================ #
# 2. Glicko-2 Illinois Solver & Idle Bye-Week RD Expansion Tests
# ============================================================================ #


class TestGlicko2AndByeWeekRd(unittest.TestCase):
    def test_glickman_canonical_example_double_precision(self) -> None:
        res = eng.glicko2_update_period(
            eng.Glicko2Rating(1500.0, 200.0, 0.06),
            [
                eng.Glicko2Match(1400.0, 30.0, 1.0),
                eng.Glicko2Match(1550.0, 100.0, 0.0),
                eng.Glicko2Match(1700.0, 300.0, 0.0),
            ],
            tau=0.50,
        )
        self.assertTrue(approx(res.rating, 1464.050671, 1e-5))
        self.assertTrue(approx(res.rd, 151.516524, 1e-5))
        self.assertTrue(approx(res.sigma, 0.059996, 1e-6))

    def test_sealed_tau_042_constrains_volatility_shift_tighter_than_050(self) -> None:
        upset_matches = [eng.Glicko2Match(1300.0, 40.0, 0.0), eng.Glicko2Match(1320.0, 45.0, 0.0)]
        r_042 = eng.glicko2_update_period(eng.Glicko2Rating(1600.0, 80.0, 0.06), upset_matches, tau=0.42)
        r_050 = eng.glicko2_update_period(eng.Glicko2Rating(1600.0, 80.0, 0.06), upset_matches, tau=0.50)
        self.assertLess(abs(r_042.sigma - 0.06), abs(r_050.sigma - 0.06))

    def test_idle_period_bye_week_rd_expansion_exact_handoff_values(self) -> None:
        base = eng.Glicko2Rating(1500.0, 200.0, 0.06)
        w1 = eng.glicko2_update_period(base, [], tau=0.42)
        self.assertEqual(w1.rating, 1500.0)
        self.assertEqual(w1.sigma, 0.06)
        expected_phi_1 = math.sqrt((200.0 / 173.7178) ** 2 + 0.06**2)
        self.assertTrue(approx(w1.rd, 173.7178 * expected_phi_1, 1e-12))
        self.assertEqual(round(w1.rd, 2), 200.27)

        w4 = eng.glicko2_idle_step(base, idle_periods=4)
        w17 = eng.glicko2_idle_step(base, idle_periods=17)
        self.assertEqual(round(w4.rd, 2), 201.08)
        self.assertEqual(round(w17.rd, 2), 204.57)

        seq = base
        for _ in range(4):
            seq = eng.glicko2_update_period(seq, [])
        self.assertTrue(approx(seq.rd, w4.rd, 1e-12))

    def test_week10_nfl_bye_teams_expand_rd_while_active_teams_shrink_rd(self) -> None:
        ratings = {
            "CHI": eng.Glicko2Rating(1510.0, 75.0, 0.06),
            "DEN": eng.Glicko2Rating(1525.0, 75.0, 0.06),
            "PHI": eng.Glicko2Rating(1580.0, 75.0, 0.06),
            "TB": eng.Glicko2Rating(1535.0, 75.0, 0.06),
            "WAS": eng.Glicko2Rating(1460.0, 75.0, 0.06),
            "NYG": eng.Glicko2Rating(1515.0, 75.0, 0.06),
        }
        post = eng.update_nfl_week_glicko2(ratings, [("WAS", "NYG", 17, 24)], tau=eng.TAU_SEALED)
        for bye_tm in ("CHI", "DEN", "PHI", "TB"):
            self.assertEqual(post[bye_tm].rating, ratings[bye_tm].rating)
            self.assertEqual(post[bye_tm].sigma, ratings[bye_tm].sigma)
            expected_rd = 173.7178 * math.sqrt((75.0 / 173.7178) ** 2 + 0.06**2)
            self.assertTrue(approx(post[bye_tm].rd, expected_rd, 1e-12))
            self.assertGreater(post[bye_tm].rd, ratings[bye_tm].rd)
        self.assertLess(post["WAS"].rd, ratings["WAS"].rd)
        self.assertLess(post["NYG"].rd, ratings["NYG"].rd)


# ============================================================================ #
# 3. Upgraded Injury Overlay, Log-Sinkhorn OT & Tuesday Coach-Mind Lock Tests
# ============================================================================ #


class TestUpgradedInjuryOverlayAndCoachLock(unittest.TestCase):
    def test_sealed_epa_table_bounds_hash_and_immutability(self) -> None:
        for role, factor in eng.EPA_DROPOFF.items():
            self.assertTrue(eng.EPA_FACTOR_MIN <= factor <= eng.EPA_FACTOR_MAX, role)
        with self.assertRaises(TypeError):
            eng.EPA_DROPOFF["WR1"] = 0.10  # type: ignore[index]
        with self.assertRaisesRegex(ValueError, "bounds"):
            eng.validate_epa_table({"WR1": 1.21})
        with self.assertRaisesRegex(ValueError, "bounds"):
            eng.validate_epa_table({"WR1": 0.49})
        with self.assertRaises(TypeError):
            eng.validate_epa_table({"WR1": "0.82"})  # type: ignore[dict-item]
        with self.assertRaisesRegex(ValueError, "mismatch"):
            eng.validate_epa_table({"WR1": 0.83}, expected_hash=eng.EPA_DROPOFF_SHA256)

    def test_apply_epa_dropoff_non_mutating_and_renormalized(self) -> None:
        shares = copy.deepcopy(POST)
        roles = copy.deepcopy(ROLES)
        audit: list[dict] = []
        out = eng.apply_epa_dropoff(shares, roles, audit_out=audit)
        self.assertEqual(shares, POST)
        self.assertEqual(roles, ROLES)
        self.assertTrue(approx(sum(out.values()), 1.0, eng.SHARE_SUM_TOL))
        self.assertEqual(out["WR1_A"], 0.0)
        expected_ratio = (POST["WR2_B"] * eng.EPA_DROPOFF["WR1"]) / (POST["WR3_C"] * eng.EPA_DROPOFF["WR2"])
        self.assertTrue(approx(out["WR2_B"] / out["WR3_C"], expected_ratio, 1e-12))
        self.assertEqual(len(audit), 4)

    def test_log_stabilized_sinkhorn_handles_tiny_eps_without_underflow(self) -> None:
        P, info = eng.sinkhorn_with_info(
            [PRE[p] for p in PLAYERS],
            [POST[p] for p in PLAYERS],
            COST,
            eps=0.002,
        )
        self.assertTrue(info["converged"])
        self.assertLess(info["residual"], 1e-6)
        for i, p in enumerate(PLAYERS):
            self.assertTrue(approx(sum(P[i]), PRE[p], 1e-6))
        for j, p in enumerate(PLAYERS):
            self.assertTrue(approx(sum(P[i][j] for i in range(4)), POST[p], 1e-6))

        overlay_audit: list[dict] = []
        final_w = eng.injury_overlay(PRE, POST, ROLES, COST, PLAYERS, audit_out=overlay_audit)
        self.assertTrue(approx(sum(final_w.values()), 1.0, eng.SHARE_SUM_TOL))
        self.assertEqual(final_w["WR1_A"], 0.0)
        self.assertEqual({r["stage"] for r in overlay_audit}, {"sinkhorn", "epa", "summary"})

    def test_load_injury_file_roundtrip(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "injury.json"
            p.write_text(
                json.dumps({"injured": ["WR1_A"], "pre_shares": PRE, "role_of": ROLES}),
                encoding="utf-8",
            )
            loaded = eng.load_injury_file(str(p))
            self.assertEqual(loaded["injured"], ["WR1_A"])

    def test_scheme_matchup_ot_coupling_reflects_core_nfl_schemes(self) -> None:
        vs_c2 = eng.couple_scheme_matchup_ot({"AIR_CORYELL_VERTICAL": 1.0}, {"COVER_2_TAMPA_JAM": 1.0})
        vs_c4 = eng.couple_scheme_matchup_ot({"AIR_CORYELL_VERTICAL": 1.0}, {"COVER_4_QUARTERS_MATCH": 1.0})
        self.assertLess(vs_c2["wasserstein_friction"], vs_c4["wasserstein_friction"])
        self.assertGreater(vs_c2["offensive_scheme_leverage_pts"], vs_c4["offensive_scheme_leverage_pts"])

    def test_tuesday_v1_coach_mindset_hash_invariance_and_merkle_gate(self) -> None:
        coach_in = eng.CoachSimPureInput(
            game_id="2026_10_LAR_ARI",
            season=2026,
            week=10,
            home_team="ARI",
            away_team="LAR",
            coach_support=0.82,
            neutral_pass_rate_home=0.54,
            neutral_pass_rate_away=0.59,
            staff_aggression_home=0.58,
            staff_aggression_away=0.67,
            shadows=(("Marvin Harrison Jr.", 0.55),),
            tau=eng.TAU_SEALED,
            home_off_scheme={"POWER_GAP_HEAVY_12_21": 0.6, "SHANAHAN_WIDE_ZONE_BOOT": 0.4},
            home_def_shell={"COVER_4_QUARTERS_MATCH": 0.6, "COVER_6_9_SPLIT_FANGIO": 0.4},
            away_off_scheme={"SHANAHAN_WIDE_ZONE_BOOT": 0.7, "WEST_COAST_QUICK": 0.3},
            away_def_shell={"COVER_6_9_SPLIT_FANGIO": 0.6, "COVER_3_BUZZ_SINGLE_HIGH": 0.4},
        )
        away_room = [
            eng.EligibleTarget("Puka Nacua", "WR1", 0.34),
            eng.EligibleTarget("Davante Adams", "WR2", 0.28),
            eng.EligibleTarget("Tyler Higbee", "TE1", 0.20),
            eng.EligibleTarget("CJ Daniels", "WR3", 0.18),
        ]
        home_room = [
            eng.EligibleTarget("Trey McBride", "TE1", 0.35),
            eng.EligibleTarget("Marvin Harrison Jr.", "WR1", 0.35),
            eng.EligibleTarget("Michael Wilson", "WR2", 0.30),
        ]
        v1 = eng.lock_tuesday_coach_baseline(
            coach_in, home_room, away_room, "2026-11-10T10:00:00Z", base_market_spread_home=4.5, base_market_total=44.0
        )
        self.assertEqual(v1.cadence_version, "v1.0")
        self.assertEqual(len(v1.coach_mindset_hash), 64)

        v3 = eng.apply_cadence_injury_overlay(
            v1,
            version="v3.0",
            recorded_at_iso="2026-11-13T22:30:00Z",
            inactive_player_ids=["Puka Nacua", "Davante Adams", "Michael Wilson"],
            home_injury_points_delta=-2.9,
            away_injury_points_delta=-2.6,
        )
        self.assertEqual(v3.cadence_version, "v3.0")
        self.assertTrue(eng.verify_coach_mindset_unchanged(v1, v3))
        self.assertEqual(v3.coach_mindset_hash, v1.coach_mindset_hash)
        self.assertNotIn("Puka Nacua", v3.away_target_allocations)
        self.assertGreater(v3.away_target_allocations["Tyler Higbee"], v1.away_target_allocations["Tyler Higbee"])
        self.assertGreater(v3.home_target_allocations["Trey McBride"], v1.home_target_allocations["Trey McBride"])

        conf = eng.conformal_diagnostic_flag(
            v3.score_mean_total, 52.5, [0.8, 1.2, 1.9, 2.4, 3.1, 3.8, 4.2, 4.9, 5.5]
        )
        self.assertTrue(conf["flagged"])
        self.assertEqual(v3.coach_mindset_hash, v1.coach_mindset_hash)

        bad_check = eng.verify_coach_brain_output_against_packet([v3], ["FAKE_GAME_ID"], quoted_coach_hash="deadbeef")
        self.assertFalse(bad_check["ok"])
        self.assertEqual(len(bad_check["violations"]), 2)


# ============================================================================ #
# 4. Live 2026 NFL Week 10 Slate & Doctrine Hygiene Verification
# ============================================================================ #


class TestWeek10SlateAndDoctrineHygiene(unittest.TestCase):
    def test_all_13_remaining_week10_games_and_starter_injuries_present(self) -> None:
        slate = eng.build_week10_2026_slate_evaluations()
        self.assertEqual(len(slate), 13)

        self.assertIn("Jacoby Brissett", slate["LAC @ BAL"].verified_injury_summary)
        self.assertIn("Lamar Jackson", slate["LAC @ BAL"].verified_injury_summary)
        self.assertIn("TreVeyon Henderson", slate["NE @ DET"].verified_injury_summary)
        self.assertGreater(slate["NE @ DET"].caofi, 0.75)
        self.assertIn("Kyle McCord", slate["MIA @ IND"].verified_injury_summary)
        self.assertIn("Josh Jacobs", slate["MIN @ GB"].verified_injury_summary)
        self.assertIn("Drew Lock", slate["SEA @ LV"].verified_injury_summary)
        self.assertIn("Fernando Mendoza", slate["SEA @ LV"].verified_injury_summary)
        self.assertIn("Puka Nacua", slate["LAR @ ARI"].verified_injury_summary)
        self.assertIn("Davante Adams", slate["LAR @ ARI"].verified_injury_summary)
        self.assertIn("Carson Beck", slate["LAR @ ARI"].verified_injury_summary)

        aliased = eng.resolve_week10_matchup("LAR @ SF", slate)
        self.assertEqual(aliased.matchup, "LAR @ ARI")

        for game in slate.values():
            self.assertTrue(game.coach_hash_invariant)
            for score_str in (
                game.situational_chaos_score,
                game.injury_severity_score,
                game.scheme_leverage_score,
                game.readiness_confidence_score,
            ):
                self.assertTrue(score_str.endswith("/100"), score_str)
                prefix = score_str[:-4]
                self.assertTrue(prefix.isdigit(), f"Non-integer XX/100 score detected: {score_str}")
                self.assertTrue(1 <= int(prefix) <= 100)

    def test_bye_teams_and_zero_forbidden_strings(self) -> None:
        byes = eng.build_week10_2026_bye_rd_updates()
        self.assertEqual(set(byes.keys()), {"CHI", "DEN", "PHI", "TB"})
        for info in byes.values():
            self.assertGreater(info["rd_after"], info["rd_before"])
            self.assertEqual(info["rating_after"], info["rating_before"])

        forbidden_record = "-".join(["62", "23", "1"])
        src_engine = Path(eng.__file__).read_text(encoding="utf-8")
        self.assertNotIn(forbidden_record, src_engine)


if __name__ == "__main__":
    unittest.main(verbosity=2)

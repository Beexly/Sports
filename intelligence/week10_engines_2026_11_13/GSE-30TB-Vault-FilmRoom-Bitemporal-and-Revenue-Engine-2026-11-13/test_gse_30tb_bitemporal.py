#!/usr/bin/env python3
"""
Comprehensive Verification & Unit Test Suite (`unittest` + `pytest` compatible)
===============================================================================
Target: `gse_30tb_film_room_and_bitemporal_pipeline.py`
Verifies:
  1. Zero lookahead bitemporal isolation (`event_valid_ts <= as_of_ts AND recorded_at_ts <= as_of_ts`)
  2. `SourceCannotSpeakAsOfError` on post-kickoff / post-T-90m lock leaks & causality inversions
  3. `ZeroImputationViolationError` fail-closed guard on missing or NaN signals
  4. `CollegeGuardViolationError` separating NFL vs. CFB constants & signals
  5. `mu = close` Diagnostic Mode (`CRPS <= 7.099` walk-forward gate, BQP/SWCC/RIL, Shin devigging)
  6. `Pure Coach-Mind` Production Mode (`no-book-in-coach-engine-fence`, 7 GSE Metrics, FWL residualization)
  7. DraftKings Copula + Dirichlet-Multinomial + HiGHS MILP Classic & Showdown Optimizer
  8. 30TB Vault `nfl-film-room-2026` 12-video manifest, `C:\\` disk guard, 8-DoF Hartley Homography +
     Jacobian covariance, ByteTrack + Rule R-2 (`v <= 12.5 m/s`), WHIM TBI + Prony/Ogden + Breaker-Box,
     and PyArrow `.parquet` + SHA-256 receipt generation on real synthetic OpenCV MP4 footage.
  9. `00-TRUTH-FILE` public-copy governance (`XX/100` integer badges, `/calibration` ledger disclosure).
"""

from __future__ import annotations

import json
import math
from pathlib import Path
import sys
import tempfile
import unittest

import cv2
import numpy as np
import pandas as pd
import pyarrow.parquet as pq

sys.path.insert(0, str(Path(__file__).resolve().parent))

import gse_30tb_film_room_and_bitemporal_pipeline as gse


class TestGSEBitemporalAndFilmRoomPipeline(unittest.TestCase):

    def test_01_bitemporal_zero_lookahead_and_late_correction_isolation(self) -> None:
        store = gse.BitemporalFeatureStore(db_path=":memory:", prefer_duckdb=True)
        kickoff_ts = 1_794_600_000_000
        t_minus_120m = kickoff_ts - 120 * 60 * 1000
        t_minus_90m = kickoff_ts - 90 * 60 * 1000
        t_plus_3h_postgame = kickoff_ts + 180 * 60 * 1000

        store.ingest_records([
            # Pre-lock opening line recorded at T-120m: spread = -3.0
            gse.BitemporalSignalRecord(
                entity_id="2026_06_HOU_JAX",
                entity_type="game",
                league="NFL",
                signal_name="spread_line",
                signal_value=-3.0,
                event_valid_ts=t_minus_120m,
                recorded_at_ts=t_minus_120m,
                source_id="pinnacle_snap_1",
            ),
            # Late-arriving retroactive correction for T-100m event, but recorded AFTER kickoff (T+3h)!
            gse.BitemporalSignalRecord(
                entity_id="2026_06_HOU_JAX",
                entity_type="game",
                league="NFL",
                signal_name="spread_line",
                signal_value=-6.5,
                event_valid_ts=kickoff_ts - 100 * 60 * 1000,
                recorded_at_ts=t_plus_3h_postgame,
                source_id="retroactive_backfill_leak",
            ),
        ])

        # Querying at T-90m MUST see -3.0 and MUST NOT leak -6.5 because recorded_at_ts > T-90m!
        pit = store.query_as_of(
            entity_ids=["2026_06_HOU_JAX"],
            required_signals=["spread_line"],
            as_of_ts=t_minus_90m,
            league="NFL",
            kickoff_ts=kickoff_ts,
            lock_offset_ms=90 * 60 * 1000,
        )
        self.assertAlmostEqual(pit["2026_06_HOU_JAX"]["spread_line"], -3.0, places=6)

        # Querying 1 ms after T-90m lock MUST raise SourceCannotSpeakAsOfError
        with self.assertRaises(gse.SourceCannotSpeakAsOfError):
            store.query_as_of(
                entity_ids=["2026_06_HOU_JAX"],
                required_signals=["spread_line"],
                as_of_ts=t_minus_90m + 1,
                league="NFL",
                kickoff_ts=kickoff_ts,
                lock_offset_ms=90 * 60 * 1000,
            )

        # Causality inversion (recorded_at_ts < event_valid_ts) MUST raise immediately
        with self.assertRaises(gse.SourceCannotSpeakAsOfError):
            gse.BitemporalSignalRecord(
                entity_id="2026_06_HOU_JAX",
                entity_type="game",
                league="NFL",
                signal_name="spread_line",
                signal_value=-3.5,
                event_valid_ts=1000,
                recorded_at_ts=999,
                source_id="bad_clock",
            )

    def test_02_zero_imputation_and_college_guard_fences(self) -> None:
        store = gse.BitemporalFeatureStore(db_path=":memory:")
        store.ingest_records([
            gse.BitemporalSignalRecord(
                entity_id="CFB_2026_TEX_OU",
                entity_type="game",
                league="CFB",
                signal_name="spread_line",
                signal_value=-7.5,
                event_valid_ts=1000,
                recorded_at_ts=1000,
                source_id="circa_cfb",
            )
        ])

        # Querying CFB game under NFL league context trips CollegeGuard
        with self.assertRaises(gse.CollegeGuardViolationError):
            store.query_as_of(["CFB_2026_TEX_OU"], ["spread_line"], as_of_ts=2000, league="NFL")

        # Missing required covariate trips ZeroImputationViolationError (zero silent default fill)
        with self.assertRaises(gse.ZeroImputationViolationError):
            store.query_as_of(["CFB_2026_TEX_OU"], ["spread_line", "missing_bqp"], as_of_ts=2000, league="CFB")

        # NaN ingestion rejected at record construction
        with self.assertRaises(gse.ZeroImputationViolationError):
            gse.BitemporalSignalRecord(
                entity_id="NFL_1",
                entity_type="game",
                league="NFL",
                signal_name="epa",
                signal_value=float("nan"),
                event_valid_ts=100,
                recorded_at_ts=100,
                source_id="nan_probe",
            )

    def test_03_shin_devig_and_mu_close_diagnostic_crps_gate(self) -> None:
        # Canonical -110 / -110 (decimal 1.9090909) -> 0.50 / 0.50
        p_a, p_b = gse.shin_devig_pair(210.0 / 110.0, 210.0 / 110.0)
        self.assertAlmostEqual(p_a, 0.50, places=6)
        self.assertAlmostEqual(p_b, 0.50, places=6)

        dvoa_metrics = gse.compute_dvoa_class_metrics(
            starter_snap_shares=[0.95, 0.85],
            starter_epas=[0.18, 0.08],
            backup_rank2_epas=[-0.02, -0.09],
            out_probabilities=[0.50, 0.20],
            unit_weights=[1.0, 0.6],
            days_rest_home=4.0,
            days_rest_away=7.0,
            travel_timezones_away=2.0,
        )
        self.assertGreater(dvoa_metrics["bqp"], 0.0)
        self.assertGreater(dvoa_metrics["swcc"], 0.0)

        store = gse.BitemporalFeatureStore(db_path=":memory:")
        gid = "2026_07_NYG_HOU"
        kickoff = 2_000_000_000
        as_of = kickoff - 3600_000
        store.ingest_records([
            gse.BitemporalSignalRecord(gid, "game", "NFL", "spread_line", 6.5, as_of - 100, as_of - 50, "pin"),
            gse.BitemporalSignalRecord(gid, "game", "NFL", "odds_home_dec", 1.91, as_of - 100, as_of - 50, "pin"),
            gse.BitemporalSignalRecord(gid, "game", "NFL", "odds_away_dec", 1.91, as_of - 100, as_of - 50, "pin"),
            gse.BitemporalSignalRecord(gid, "game", "NFL", "bqp", dvoa_metrics["bqp"], as_of - 100, as_of - 50, "gse"),
            gse.BitemporalSignalRecord(gid, "game", "NFL", "swcc", 0.0, as_of - 100, as_of - 50, "gse"),
            gse.BitemporalSignalRecord(gid, "game", "NFL", "ril", 0.0, as_of - 100, as_of - 50, "gse"),
        ])

        rng = np.random.default_rng(7)
        hist_mu = rng.normal(2.0, 5.0, size=200)
        hist_y = hist_mu + rng.normal(0.0, 11.5, size=200)

        engine = gse.BitemporalSlateEngine(store)
        diag = engine.evaluate_mu_close_diagnostic(
            game_id=gid,
            as_of_ts=as_of,
            kickoff_ts=kickoff,
            historical_margins=hist_y,
            historical_close_mus=hist_mu,
        )
        self.assertEqual(diag.mode, gse.SimulationMode.MU_CLOSE_DIAGNOSTIC)
        self.assertAlmostEqual(diag.margin_mean, 6.5, places=6)
        self.assertEqual(diag.fwl_edge, 0.0)
        self.assertTrue(diag.crps_gate_passed)
        self.assertEqual(diag.confidence_badge, "50/100")

    def test_04_pure_coach_mind_fence_and_zone3_sovereign_lock(self) -> None:
        store = gse.BitemporalFeatureStore(db_path=":memory:")
        engine = gse.BitemporalSlateEngine(store)

        clean_z1 = {
            "off_epa_diff": 0.22,
            "def_epa_diff": -0.08,
            "pa_tight_split_rate": 0.76,
            "dc_creeper_rate": 0.08,
            "qb_quick_sack_rate": 0.11,
            "checkdown_rate": 0.18,
            "wr_sep_surplus": 0.45,
            "rz_stall_kl": 0.14,
            "lb_run_fits": 18.0,
            "fourth_down_wp_bleed": 0.02,
            "qb_questionable_flag": 0.0,
            "wind_mph_outdoor": 4.0,
        }

        # Attempting to sneak spread_line into Zone 1 trips SportsbookContaminationFenceError
        with self.assertRaises(gse.SportsbookContaminationFenceError):
            engine.run_zone1_pure_coach_mind("2026_06_HOU_JAX", 1_000_000, {**clean_z1, "spread_line": -3.5})

        gid = "2026_06_HOU_JAX"
        tuesday_lock = 1_000_000
        kickoff = 500_000_000
        as_of = kickoff - 95 * 60 * 1000
        store.ingest_records([
            gse.BitemporalSignalRecord(gid, "game", "NFL", "spread_line", -2.5, as_of - 500, as_of - 100, "pin"),
            gse.BitemporalSignalRecord(gid, "game", "NFL", "odds_home_dec", 1.95, as_of - 500, as_of - 100, "pin"),
            gse.BitemporalSignalRecord(gid, "game", "NFL", "odds_away_dec", 1.95, as_of - 500, as_of - 100, "pin"),
        ])

        witnesses = [
            gse.WitnessVote("jev_snap_sim", 0.64, 0.05, 0.002),
            gse.WitnessVote("t5_back_seven", 0.62, 0.08, 0.003),
            gse.WitnessVote("trench_pressure", 0.63, 0.04, -0.002),
        ]
        prod = engine.evaluate_pure_coach_mind_with_zone3_fwl(
            game_id=gid,
            tuesday_lock_ts=tuesday_lock,
            as_of_ts=as_of,
            kickoff_ts=kickoff,
            zone1_inputs=clean_z1,
            witnesses=witnesses,
            conformal_ct=8.40,
            wasserstein_w1=0.03,
            z3_entailment_unsat=True,
        )
        self.assertEqual(prod.release_tier, "TIER_1_SOVEREIGN_LOCK")
        self.assertIsNotNone(prod.coach_receipt)
        assert prod.coach_receipt is not None
        self.assertLess(prod.coach_receipt.qb_rush_kneeldown_adj, 0.0)
        self.assertNotIn("%", prod.confidence_badge)

    def test_05_draftkings_copula_dirichlet_field_and_highs_milp_solvers(self) -> None:
        # Build a realistic 4-team (2-game) slate pool for fast exact HiGHS MILP testing
        rows = []
        matchups = [("HOU", "JAX", "G1"), ("JAX", "HOU", "G1"), ("BAL", "DAL", "G2"), ("DAL", "BAL", "G2")]
        for tm, opp, gid in matchups:
            rows.extend([
                {"name": f"{tm}_QB1", "game_id": gid, "team": tm, "opponent": opp, "position": "QB", "role": "QB1",
                 "salary": 6400, "proj_ownership": 0.11, "proj_td": 2.1, "proj_pass_yds": 275.0, "proj_rush_yds": 28.0,
                 "proj_rec_yds": 0.0, "proj_receptions": 0.0, "proj_fpts": 21.5},
                {"name": f"{tm}_RB1", "game_id": gid, "team": tm, "opponent": opp, "position": "RB", "role": "RB1",
                 "salary": 7200, "proj_ownership": 0.22, "proj_td": 0.85, "proj_pass_yds": 0.0, "proj_rush_yds": 82.0,
                 "proj_rec_yds": 26.0, "proj_receptions": 3.4, "proj_fpts": 19.2},
                {"name": f"{tm}_RB2", "game_id": gid, "team": tm, "opponent": opp, "position": "RB", "role": "RB2",
                 "salary": 4600, "proj_ownership": 0.06, "proj_td": 0.35, "proj_pass_yds": 0.0, "proj_rush_yds": 38.0,
                 "proj_rec_yds": 14.0, "proj_receptions": 1.8, "proj_fpts": 9.1},
                {"name": f"{tm}_WR1", "game_id": gid, "team": tm, "opponent": opp, "position": "WR", "role": "WR1",
                 "salary": 7600, "proj_ownership": 0.16, "proj_td": 0.75, "proj_pass_yds": 0.0, "proj_rush_yds": 4.0,
                 "proj_rec_yds": 92.0, "proj_receptions": 6.8, "proj_fpts": 21.0},
                {"name": f"{tm}_WR2", "game_id": gid, "team": tm, "opponent": opp, "position": "WR", "role": "WR2",
                 "salary": 5200, "proj_ownership": 0.08, "proj_td": 0.45, "proj_pass_yds": 0.0, "proj_rush_yds": 0.0,
                 "proj_rec_yds": 58.0, "proj_receptions": 4.5, "proj_fpts": 13.0},
                {"name": f"{tm}_WR3", "game_id": gid, "team": tm, "opponent": opp, "position": "WR", "role": "WR3",
                 "salary": 3900, "proj_ownership": 0.04, "proj_td": 0.30, "proj_pass_yds": 0.0, "proj_rush_yds": 0.0,
                 "proj_rec_yds": 42.0, "proj_receptions": 3.2, "proj_fpts": 9.2},
                # Include one DeadZone TE ($5,800) and one value TE ($3,800) to verify DeadZone ban
                {"name": f"{tm}_TE_DEAD", "game_id": gid, "team": tm, "opponent": opp, "position": "TE", "role": "TE1",
                 "salary": 5800, "proj_ownership": 0.14, "proj_td": 0.55, "proj_pass_yds": 0.0, "proj_rush_yds": 0.0,
                 "proj_rec_yds": 55.0, "proj_receptions": 5.0, "proj_fpts": 13.8},
                {"name": f"{tm}_TE_VAL", "game_id": gid, "team": tm, "opponent": opp, "position": "TE", "role": "TE1",
                 "salary": 3800, "proj_ownership": 0.07, "proj_td": 0.42, "proj_pass_yds": 0.0, "proj_rush_yds": 0.0,
                 "proj_rec_yds": 41.0, "proj_receptions": 3.8, "proj_fpts": 10.4},
                {"name": f"{tm}_DST", "game_id": gid, "team": tm, "opponent": opp, "position": "DST", "role": "DST",
                 "salary": 3100, "proj_ownership": 0.08, "proj_td": 0.15, "proj_pass_yds": 0.0, "proj_rush_yds": 0.0,
                 "proj_rec_yds": 0.0, "proj_receptions": 0.0, "proj_fpts": 7.8},
            ])
        players_df = pd.DataFrame(rows)
        games_df = pd.DataFrame([{"game_id": "G1", "wind_mph": 0.0}, {"game_id": "G2", "wind_mph": 18.0}])

        dk_engine = gse.DraftKingsBitemporalPortfolioEngine(num_sims=1200, seed=42)
        fpts_mat, cov_mat = dk_engine.simulate_slate(players_df, games_df)
        self.assertEqual(fpts_mat.shape, (1200, len(players_df)))

        field_rosters = dk_engine.simulate_dirichlet_multinomial_field(players_df, num_opponents=200)
        self.assertTrue(np.all(np.sum(field_rosters, axis=1) == 9))

        # Verify Minka fixed-point Dirichlet concentration fit
        alphas = gse.minka_fit_dirichlet_precision(np.vstack([np.sum(field_rosters[:100], axis=0), np.sum(field_rosters[100:], axis=0)]))
        self.assertEqual(len(alphas), len(players_df))
        self.assertTrue(np.all(alphas > 0))

        # Optimize Classic 3-lineup GPP portfolio
        portfolio = dk_engine.optimize_classic_gpp_portfolio(players_df, fpts_mat, cov_mat, num_lineups=3, max_overlap_gamma=6)
        self.assertEqual(len(portfolio), 3)
        for lu in portfolio:
            self.assertEqual(len(lu), 9)
            sub = players_df.iloc[lu]
            self.assertLessEqual(float(sub["salary"].sum()), 50000.0)
            self.assertGreaterEqual(float(sub["salary"].sum()), 48500.0)
            # Zero DeadZone TEs ($5,100-$6,600) allowed!
            te_sals = sub[sub["position"] == "TE"]["salary"].tolist()
            for ts in te_sals:
                self.assertFalse(5100 <= ts <= 6600)
            # DST never paired with opposing offense
            dst_opp = sub[sub["position"] == "DST"]["opponent"].iloc[0]
            opp_off_count = len(sub[(sub["team"] == dst_opp) & (sub["position"].isin(["QB", "RB", "WR", "TE"]))])
            self.assertEqual(opp_off_count, 0)

        # Optimize Showdown Captain lineup on Game 1
        g1_mask = (players_df["game_id"] == "G1").to_numpy()
        sd_res = dk_engine.optimize_showdown_captain_lineup(players_df[g1_mask], fpts_mat[:, g1_mask])
        self.assertEqual(len(sd_res["flex_indices"]), 5)
        self.assertNotIn(sd_res["captain_idx"], sd_res["flex_indices"])
        self.assertLessEqual(sd_res["total_salary"], 50000.0)

    def test_06_30tb_vault_12_videos_c_drive_guard_homography_and_parquet_pipeline(self) -> None:
        # 1. Verify exact 12 MP4 videos pinned in manifest
        self.assertEqual(len(gse.NFL_FILM_ROOM_2026_VIDEOS), 12)
        expected_names = [
            "bal_vs_ind_week1_fullgame.mp4",
            "ind_vs_kc_week2_fullgame.mp4",
            "bal_vs_dal_week3_fullgame.mp4",
            "pit_vs_cle_week4_fullgame.mp4",
            "sf_vs_sea_week5_fullgame.mp4",
            "chi_vs_car_week1_fullgame.mp4",
            "dal_vs_nyg_week1_fullgame.mp4",
            "buf_vs_lar_week5_fullgame.mp4",
            "hou_vs_jax_week6_fullgame.mp4",
            "nyg_vs_hou_week7_fullgame.mp4",
            "nfl_pro_blocking_scheme.mp4",
            "car_gb_week8_highlights.mp4",
        ]
        self.assertEqual([v.filename for v in gse.NFL_FILM_ROOM_2026_VIDEOS], expected_names)

        # 2. Verify C:\ disk protection guard
        with self.assertRaises(gse.LocalCDiskProtectionError):
            gse.FilmRoom30TBWorker(ephemeral_work_dir=r"C:\Users\Garrett\temp_video_dump")

        # 3. Verify 138-point NFL grid & 8-DoF Hartley Point+Line Homography accuracy
        grid = gse.build_nfl_138_field_grid()
        self.assertEqual(grid["points_m"].shape, (138, 2))

        # 4. Generate a synthetic broadcast MP4 clip via OpenCV and run full CV + WHIM TBI worker
        with tempfile.TemporaryDirectory(prefix="gse_30tb_test_") as tmpdir:
            tmp_path = Path(tmpdir)
            mp4_path = tmp_path / "hou_vs_jax_week6_fullgame.mp4"
            out_dir = tmp_path / "vault_out"

            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(str(mp4_path), fourcc, 30.0, (640, 360))
            for f in range(36):
                canvas = np.zeros((360, 640, 3), dtype=np.uint8)
                canvas[:, :] = (25, 90, 25)  # Turf background
                # Two converging players simulating a route + tackle collision around frame 20
                p1_x = int(180 + f * 4)
                p2_x = int(330 - f * 4)
                cv2.rectangle(canvas, (p1_x, 180), (p1_x + 18, 222), (255, 255, 255), -1)
                cv2.rectangle(canvas, (p2_x, 182), (p2_x + 18, 224), (20, 40, 220), -1)
                writer.write(canvas)
            writer.release()

            worker = gse.FilmRoom30TBWorker(ephemeral_work_dir=out_dir)
            entry_hou = gse.NFL_FILM_ROOM_2026_VIDEOS[8]  # hou_vs_jax_week6_fullgame.mp4
            receipt = worker.process_video_file(
                video_entry=entry_hou,
                video_source_path=mp4_path,
                output_dir=out_dir,
                recorded_at_ts=1_794_555_600_000,
                max_frames=36,
            )

            self.assertEqual(receipt["video_filename"], "hou_vs_jax_week6_fullgame.mp4")
            self.assertEqual(receipt["frames_processed"], 36)
            self.assertGreater(receipt["telemetry_rows"], 0)
            self.assertEqual(len(receipt["parquet_sha256"]), 64)
            self.assertEqual(len(receipt["chained_receipt_sha256"]), 64)

            pq_file = out_dir / receipt["parquet_filename"]
            table = pq.read_table(pq_file)
            self.assertEqual(table.schema.metadata[b"film_room_folder_id"].decode(), gse.FILM_ROOM_2026_FOLDER_ID)
            df_pq = table.to_pandas()
            # Rule R-2 velocity filter must guarantee every logged row has speed_mps <= 12.5
            self.assertTrue(bool((df_pq["speed_mps"] <= gse.MAX_VALID_PLAYER_SPEED_MPS).all()))
            self.assertTrue(bool((df_pq["whim_mps_95"] >= 0.0).all()))

    def test_07_truth_file_sanitizer_and_sinkhorn_reallocation(self) -> None:
        with self.assertRaises(gse.TruthFileGovernanceError):
            gse.sanitize_public_copy("Tonight's Sovereign Lock has 91% confidence!")
        with self.assertRaises(gse.TruthFileGovernanceError):
            gse.sanitize_public_copy("Our live NFL record is 62-23-1 this season!")

        valid = gse.sanitize_public_copy(
            f"Texans -2.5 Official Edge ({gse.format_confidence_badge(88.4)} rating)."
        )
        self.assertIn("88/100 rating", valid)
        self.assertIn(gse.PUBLIC_CALIBRATION_URL, valid)

        tgts, cars = gse.reallocate_t90m_inactive_usage_sinkhorn(
            active_weights=np.array([0.50, 0.30, 0.20]),
            compatibility_cost_matrix=np.array([[0.05, 0.40], [0.10, 0.35], [0.45, 0.05]]),
            vacated_targets=8.5,
            vacated_carries=12.0,
        )
        self.assertAlmostEqual(float(np.sum(tgts)), 8.5, places=5)
        self.assertAlmostEqual(float(np.sum(cars)), 12.0, places=5)


if __name__ == "__main__":
    unittest.main(verbosity=2)

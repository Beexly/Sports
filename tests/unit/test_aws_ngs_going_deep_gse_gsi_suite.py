"""Unit & Property Test Suite for AWS + NFL Next Gen Stats Going Deep GSE + GSI Integration."""

from __future__ import annotations

import json
import math
import re
import unittest
from pathlib import Path

import numpy as np
from scripts.ops.enforce_stage0_roster_and_board_allowlist import (
    load_stage0_game_roster_allowlist,
)
from scripts.ops.gse_connected_game_workflow import (
    compile_stage1_to_stage2_simulation_priors,
    run_stage1a_all_38_coaching_and_scheme_layers,
    run_stage1b_all_5367_equations_pre_sim_review,
)

from gse_engine.compute.corpus_situational_integrator import (
    assert_all_books_pdfs_ig_x_situational_wired,
)
from gse_engine.memory import compile_gse_to_gsi_rlvr_training_batch
from gse_engine.tracking.aws_ngs_going_deep_gse_gsi_suite import (
    AWS_NGS_GOING_DEEP_SOURCES,
    AWS_NGS_SUBSECOND_SLA_MS,
    DYNAMIC_ANALYTICAL_CUBE_COUNT,
    LIVE_STAKE_FRACTION,
    REAL_MONEY_STAKE_CLEARED,
    DualEpauletRFIDFrame,
    ElasticWaveShardController,
    GlassBoxMonotoneXGBoostCompletionEngine,
    InProcessKafkaTopicDAG,
    ManagedPartnerAPIGateway,
    OperatorSimulationHoldError,
    PassAttemptTrackingFeatures,
    PlayAnalyticalRecord,
    PolyglotFourTierStorageRouter,
    ProductionShipGateVerifier,
    SourceCannotSpeakAsOfError,
    StadiumEdgeRFIDSmoother,
    TopicMessage,
    assert_week11_simulation_hold,
    evaluate_aws_ngs_going_deep_stage2_bridge,
    verify_nonzero_stage2_jacobians,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


class TestAWSNGSGoingDeepGSEGSI(unittest.TestCase):

    def test_01_week11_simulation_hold_and_stake_locks(self) -> None:
        self.assertFalse(REAL_MONEY_STAKE_CLEARED)
        self.assertEqual(LIVE_STAKE_FRACTION, 0.0)
        assert_week11_simulation_hold(2026, 10)
        with self.assertRaises(OperatorSimulationHoldError):
            assert_week11_simulation_hold(2026, 11)

    def test_02_ep1_dual_epaulet_10hz_rfid_and_bitemporal_guard(self) -> None:
        smoother = StadiumEdgeRFIDSmoother()
        frames = []
        for k in range(8):
            t_k = round(0.1 * k, 2)
            cx = 20.0 + (3.6 / 0.9144) * t_k
            cy = 15.0
            frames.append(
                DualEpauletRFIDFrame(
                    timestamp_s=t_k,
                    left_epaulet_xy_yd=(cx - 0.25, cy),
                    right_epaulet_xy_yd=(cx + 0.25, cy),
                    ball_xyz_yd=(cx - 2.2 * k, cy + 0.8 * k, 1.9),
                    event_valid_ts=t_k,
                    recorded_at_ts=t_k,
                )
            )
        kin = smoother.process_play_stream(frames, as_of_ts=1.0)
        self.assertAlmostEqual(kin.release_qb_speed_mph, 8.05, delta=0.6)
        self.assertGreater(kin.cross_body_throw_rad, 0.90)

        with self.assertRaises(SourceCannotSpeakAsOfError):
            smoother.process_play_stream(frames, as_of_ts=0.35)

    def test_03_ep2_ep6_kafka_dag_and_polyglot_14_cubes(self) -> None:
        dag = InProcessKafkaTopicDAG()
        router = PolyglotFourTierStorageRouter()
        self.assertEqual(len(router.CANONICAL_14_DYNAMIC_CUBES), DYNAMIC_ANALYTICAL_CUBE_COUNT)

        def _ingest_handler(msg: TopicMessage) -> TopicMessage:
            arr = np.ones((22, 6), dtype=np.float64)
            sha = router.write_raw_tracking_partition(
                str(msg.payload["game_id"]), int(msg.payload["play_id"]), arr
            )
            return TopicMessage(
                topic="derived_stats_topic",
                partition_key=msg.partition_key,
                event_valid_ts=msg.event_valid_ts,
                recorded_at_ts=msg.recorded_at_ts,
                payload={
                    "game_id": msg.payload["game_id"],
                    "play_id": msg.payload["play_id"],
                    "sha": sha,
                },
            )

        def _derived_handler(msg: TopicMessage) -> None:
            doc_key = f"{msg.payload['game_id']}:{msg.payload['play_id']}"
            router.upsert_derived_stat_document(doc_key, msg.payload)
            return None

        dag.register_processor("raw_rfid_topic", "java_ingest_smoother", 20, _ingest_handler)
        dag.register_processor("derived_stats_topic", "python_ml_stat_writer", 8, _derived_handler)

        count = dag.publish(
            TopicMessage(
                topic="raw_rfid_topic",
                partition_key="2026_10_LAC_BAL",
                event_valid_ts=100.0,
                recorded_at_ts=100.1,
                payload={"game_id": "2026_10_LAC_BAL", "play_id": 42},
            ),
            as_of_ts=105.0,
        )
        self.assertEqual(count, 2)
        self.assertIsNotNone(router.query_raw_partition_o1("2026_10_LAC_BAL", 42))

        router.ingest_relational_play(
            PlayAnalyticalRecord(
                game_id="2026_10_LAC_BAL",
                play_id=1,
                season=2026,
                week=10,
                offense_team="BAL",
                defense_team="LAC",
                qb_id="L_JACKSON",
                play_type="PASS",
                defenders_in_box=8,
                is_blitz=True,
                coverage_shell="COVER_1",
                motion_pre_snap=True,
                down=3,
                epa=0.84,
                cpoe=0.14,
                yards_gained=19.0,
                pressure_generated=True,
                event_valid_ts=100.0,
            )
        )
        router.ingest_relational_play(
            PlayAnalyticalRecord(
                game_id="2026_10_LAC_BAL",
                play_id=2,
                season=2026,
                week=10,
                offense_team="BAL",
                defense_team="LAC",
                qb_id="L_JACKSON",
                play_type="PASS",
                defenders_in_box=6,
                is_blitz=False,
                coverage_shell="COVER_4",
                motion_pre_snap=False,
                down=1,
                epa=0.12,
                cpoe=0.03,
                yards_gained=7.0,
                pressure_generated=False,
                event_valid_ts=101.0,
            )
        )
        res_8box = router.query_dynamic_cube(
            "CUBE_01_PASSING_BOX_AND_BLITZ_SPLITS",
            as_of_ts=105.0,
            qb_id="L_JACKSON",
            min_defenders_in_box=8,
            is_blitz=True,
        )
        self.assertEqual(res_8box["play_count"], 1.0)
        self.assertAlmostEqual(res_8box["mean_epa"], 0.84, places=4)

    def test_04_ep3_population_calibration_and_ship_gate(self) -> None:
        self.assertEqual(
            ProductionShipGateVerifier.select_modeling_paradigm(2, False),
            "DETERMINISTIC_BUSINESS_LOGIC",
        )
        self.assertEqual(
            ProductionShipGateVerifier.select_modeling_paradigm(6, True),
            "NONLINEAR_ML_ENSEMBLE",
        )

        labels = np.array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] * 5, dtype=np.float64)
        inflated_probs = np.clip(labels * 0.35 + 0.42, 0.05, 0.95)
        entities = (["EDGE_A"] * 20) + (["EDGE_B"] * 20) + (["EDGE_C"] * 20)
        anchors = {"EDGE_A": 12.0, "EDGE_B": 9.0, "EDGE_C": 7.0}

        bad_report = ProductionShipGateVerifier.evaluate_ship_readiness(
            pred_probs=inflated_probs,
            ground_truth_labels=labels,
            entity_ids=entities,
            domain_season_anchor_by_entity=anchors,
        )
        self.assertFalse(bad_report.passed_all_gates)
        self.assertTrue(any("POPULATION_RATE_MISMATCH" in v for v in bad_report.veto_reasons))

        recal_probs, _ = ProductionShipGateVerifier.solve_population_preserving_intercept(
            inflated_probs, float(np.mean(labels))
        )
        self.assertAlmostEqual(float(np.mean(recal_probs)), float(np.mean(labels)), places=6)

    def test_05_ep4_glass_box_monotone_xgboost_completion_engine(self) -> None:
        engine = GlassBoxMonotoneXGBoostCompletionEngine.build_calibrated_nfl_default()

        easy_pass = PassAttemptTrackingFeatures(
            air_yards=4.0,
            target_separation_yds=5.2,
            converging_defenders_3yd=0,
            qb_speed_mph=1.5,
            cross_body_throw_rad=0.10,
            sideline_dist_yds=18.0,
            pass_rusher_sep_yds=5.5,
            skeletal_catch_radius_margin_m=0.55,
        )
        hard_ep4_pass = PassAttemptTrackingFeatures(
            air_yards=24.0,
            target_separation_yds=0.7,
            converging_defenders_3yd=3,
            qb_speed_mph=8.2,
            cross_body_throw_rad=1.65,
            sideline_dist_yds=1.4,
            pass_rusher_sep_yds=1.1,
            skeletal_catch_radius_margin_m=-0.20,
        )

        p_easy = engine.predict_explainable(easy_pass)
        p_hard = engine.predict_explainable(hard_ep4_pass)

        self.assertGreater(p_easy.completion_probability, 0.72)
        self.assertLess(p_hard.completion_probability, 0.30)

        sum_contribs = sum(p_hard.feature_log_odds_contributions.values())
        base_logit = math.log(p_hard.base_prior_probability / (1.0 - p_hard.base_prior_probability))
        self.assertAlmostEqual(base_logit + sum_contribs, p_hard.total_log_odds, places=3)

    def test_06_ep5_ep6_autoscaler_rolling_hotfix_and_api_gateway_redaction(self) -> None:
        ctrl = ElasticWaveShardController()
        plan = ctrl.compute_game_day_scaling(
            events_per_sec_by_service={
                "java_ingest": 1800.0,
                "python_ml_75": 950.0,
                "node_api": 400.0,
            },
            p95_service_ms_by_service={"java_ingest": 12.0, "python_ml_75": 48.0, "node_api": 9.0},
            pipeline_critical_stages=("java_ingest", "python_ml_75", "node_api"),
        )
        self.assertTrue(plan.meets_subsecond_75_model_sla)
        self.assertLess(plan.estimated_critical_path_ms, AWS_NGS_SUBSECOND_SLA_MS)
        self.assertGreater(plan.total_active_containers, 80)

        waves = ctrl.execute_rolling_hotfix("python_ml_75", "63555eb83", current_replicas=20)
        self.assertEqual(waves[-1], (20, 0))
        self.assertEqual(ctrl.deployed_git_sha_by_service["python_ml_75"], "63555eb83")

        gw = ManagedPartnerAPIGateway()
        gw.register_client("PUB_KEY_1", "PUBLIC_TEASE", per_minute_quota=2)
        gw.register_client("B2B_KEY_1", "B2B_PARTNER_FEED", per_minute_quota=10)

        secret_card = {
            "matchup": "IND @ HOU",
            "conviction_score_0_100": 77.4,
            "vip_pick_side": "HOU -3.5",
            "vip_market_line": -110,
            "raw_ngs_separation_yds": 3.14,
            "kelly_stake_fraction": 0.018,
        }
        pub_resp = gw.serve_validated_payload("PUB_KEY_1", secret_card)
        self.assertNotIn("vip_pick_side", pub_resp)
        self.assertNotIn("raw_ngs_separation_yds", pub_resp)
        self.assertEqual(pub_resp["public_ledger_url"], "https://galaxysportsedge.com/calibration")

        b2b_resp = gw.serve_validated_payload("B2B_KEY_1", secret_card)
        self.assertEqual(b2b_resp["conviction_badge"], "77/100")
        self.assertEqual(b2b_resp["live_stake_fraction"], 0.0)

    def test_07_ep6_hybrid_rfid_optical_dual_use_and_nonzero_jacobians(self) -> None:
        jac = verify_nonzero_stage2_jacobians()
        self.assertGreater(jac["d_epa_d_skeletal_reach"], 0.0)
        self.assertGreater(jac["d_epa_d_pad_leverage"], 0.0)
        self.assertGreater(jac["d_epa_d_epaulet_crossbody_yaw"], 0.0)
        self.assertGreater(jac["d_baxley_e_d_cervical_shear"], 0.0)
        self.assertEqual(jac["d_epa_d_public_chalk"], 0.0)

    def test_08_stage2_integrator_registry_354_report_and_rlvr_220(self) -> None:
        self.assertEqual(len(AWS_NGS_GOING_DEEP_SOURCES), 8)
        bridge = evaluate_aws_ngs_going_deep_stage2_bridge(
            away_clean_epa=0.05,
            home_clean_epa=0.14,
            effective_wind_mph=12.5,
            is_short_week=False,
        )
        self.assertTrue(bridge["aws_ngs_wired"])
        self.assertTrue(bridge["all_jacobians_nonzero"])
        self.assertTrue(bridge["chalk_grad_zero"])
        self.assertEqual(bridge["live_stage2_weight"], 0.0)
        self.assertFalse(bridge["real_money_stake_cleared"])
        self.assertEqual(bridge["live_stake_fraction"], 0.0)

        s0 = load_stage0_game_roster_allowlist("NE", "DET", week=10)
        s1a = run_stage1a_all_38_coaching_and_scheme_layers(s0)
        s1b = run_stage1b_all_5367_equations_pre_sim_review(s0, s1a)
        priors = compile_stage1_to_stage2_simulation_priors(
            s1a,
            s1b,
            game_context={"verified_board_athletes": s0["verified_board_athletes"]},
        )
        lb = priors["combined_load_bearing_priors"]
        assert_all_books_pdfs_ig_x_situational_wired(lb)
        pillar = lb["books_and_pdfs_pillar"]
        self.assertTrue(pillar["aws_ngs_going_deep_wired"])
        self.assertEqual(pillar["aws_ngs_going_deep_sources_count"], 8)
        self.assertEqual(pillar["aws_ngs_going_deep_cubes"], 14)
        self.assertTrue(pillar["aws_ngs_going_deep_jacobians_nonzero"])
        self.assertTrue(pillar["aws_ngs_going_deep_chalk_grad_zero"])
        self.assertEqual(pillar["aws_ngs_going_deep_live_stage2_weight"], 0.0)

        reg = json.loads(
            (
                REPO_ROOT
                / "docs"
                / "data-sources"
                / "research"
                / "2026-11-15"
                / "oss-corpus-registry.json"
            ).read_text(encoding="utf-8")
        )
        self.assertGreaterEqual(reg["total_entries"], 354)
        self.assertEqual(reg["total_unique_entries"], reg["total_entries"])
        reg_urls = {str(e["url"]) for e in reg["entries"]}
        for item in AWS_NGS_GOING_DEEP_SOURCES:
            self.assertIn(item["url"], reg_urls)

        standalone_path = (
            REPO_ROOT
            / "brain"
            / "feeds"
            / "2026-11-17"
            / "aws_ngs_going_deep_gse_to_gsi_rlvr_feed.jsonl"
        )
        standalone_rows = [
            json.loads(line)
            for line in standalone_path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        self.assertEqual(len(standalone_rows), 24)
        for row in standalone_rows:
            ns: dict[str, object] = {}
            exec(str(row["reward_verifier"]), ns, ns)
            self.assertEqual(float(ns["reward"]), float(row["expected_reward"]))

        report_path = (
            REPO_ROOT
            / "docs"
            / "engine"
            / "research"
            / "2026-11-17"
            / "deep-research-wave31-aws-nfl-going-deep-ngs-and-dual-use-codex.md"
        )
        report = report_path.read_text(encoding="utf-8")
        self.assertLessEqual(max(ord(ch) for ch in report), 127)
        self.assertIsNone(re.search(r"\bblock(?:ed|er|ers|ing|s)?\b", report, re.IGNORECASE))
        for item in AWS_NGS_GOING_DEEP_SOURCES:
            self.assertIn(item["url"], report)

        rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
        self.assertGreaterEqual(rlvr["records_compiled"], 220)
        self.assertTrue(rlvr["zero_odds_contamination"])
        self.assertTrue(rlvr["monotone_curriculum_verified"])


if __name__ == "__main__":
    unittest.main()

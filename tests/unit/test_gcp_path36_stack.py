"""Unit tests for GCP Path 36 Foundations stack, BQML/DDL builders & status truth."""

from __future__ import annotations

import pytest

from gse_engine.cloud import (
    DEFAULT_BEAM_GCP_SPEC,
    DEFAULT_BEAM_PYTHON_IMAGE,
    GSE_CALIBRATION_DATASET,
    PATH36_DEFERRAL_LOCKS,
    PATH36_VERIFIED_STATUS,
    build_beam_dataflow_command,
    build_bqml_evaluate_sql,
    build_bqml_logistic_model_sql,
    build_bqml_predict_sql,
    build_path36_architecture_receipt,
    build_time_partitioned_table_ddl,
    validate_automl_tabular_launch,
    validate_pubsub_to_bigquery_dataflow_launch,
)


def test_path36_verified_status_never_overclaims_completion() -> None:
    assert PATH36_VERIFIED_STATUS["points"] == 1977
    assert PATH36_VERIFIED_STATUS["overall_complete"] is False
    assert PATH36_VERIFIED_STATUS["blocked_on_lab_credits"] is True
    assert PATH36_VERIFIED_STATUS["total_credits_remaining"] == 0
    assert PATH36_VERIFIED_STATUS["course_1_pct"] == 100
    assert PATH36_VERIFIED_STATUS["course_2_pct"] == 100
    assert PATH36_VERIFIED_STATUS["course_3_pct"] == 96
    assert PATH36_VERIFIED_STATUS["course_4_pct"] == 87
    assert PATH36_VERIFIED_STATUS["course_4_can_reach_100"] is False
    assert PATH36_VERIFIED_STATUS["dataprep_lab_640821_status"] == "DEPRECATED_UNAVAILABLE"
    assert PATH36_VERIFIED_STATUS["skill_badges_pct"] == 0
    assert PATH36_VERIFIED_STATUS["claim_credential_enabled"] is False
    assert PATH36_VERIFIED_STATUS["queued_paths_420_419_4525_started"] is False

    assert PATH36_DEFERRAL_LOCKS["gke_cluster_build"] == "DEFER_USE_CLOUD_RUN"
    assert PATH36_DEFERRAL_LOCKS["cloud_sql_mysql"] == "DEFER_NEON_POSTGRES_IS_SOT"
    assert PATH36_DEFERRAL_LOCKS["dataprep_alteryx_cloud"] == "DEPRECATED_UNAVAILABLE_DO_NOT_USE"

    receipt = build_path36_architecture_receipt()
    assert len(str(receipt["receipt_sha256"])) == 64


def test_bigquery_partitioned_ddl_and_bqml_sql_builders() -> None:
    ddl = build_time_partitioned_table_ddl(
        GSE_CALIBRATION_DATASET,
        "realtime_odds",
        columns=[
            ("ride_id", "STRING"),
            ("spread_home", "FLOAT64"),
            ("timestamp", "TIMESTAMP"),
        ],
        partition_column="timestamp",
    )
    assert "PARTITION BY DATE(timestamp)" in ddl
    assert "require_partition_filter = TRUE" in ddl

    train_sql = build_bqml_logistic_model_sql(
        "nfl_spread_v1",
        "w1_w11_oos",
        ["season", "week", "spread_diff", "outcome"],
        "season = 2026 AND week <= 11",
    )
    assert "CREATE OR REPLACE MODEL `gse_calibration.nfl_spread_v1`" in train_sql
    assert "SELECT season, week, spread_diff, outcome" in train_sql

    eval_sql = build_bqml_evaluate_sql(
        "nfl_spread_v1",
        "w1_w11_oos",
        ["season", "week", "spread_diff", "outcome"],
        "season = 2026 AND week = 11",
    )
    assert "ML.EVALUATE(MODEL `gse_calibration.nfl_spread_v1`" in eval_sql

    pred_sql = build_bqml_predict_sql(
        "nfl_spread_v1",
        "w1_w11_oos",
        ["season", "week", "spread_diff"],
        "season = 2026 AND week = 11",
    )
    assert "ML.PREDICT(MODEL `gse_calibration.nfl_spread_v1`" in pred_sql

    with pytest.raises(ValueError, match="Wildcard"):
        build_bqml_logistic_model_sql(
            "bad_model",
            "w1_w11_oos",
            ["*"],
            "season = 2026",
        )


def test_dataflow_gsp192_beam_gsp207_and_automl_fail_closed_guards() -> None:
    with pytest.raises(ValueError, match="GSP192 defense"):
        validate_pubsub_to_bigquery_dataflow_launch(
            job_name="iotflow",
            project_id="gse-prod",
            region="us-east1",
            input_topic="projects/gse-prod/topics/gse-odds-ticks",
            output_table_spec="gse-prod:gse_calibration.odds_stream",
            staging_gcs_uri="gs://gse-dataflow/tmp",
            input_topic_exists=False,
            worker_has_pubsub_subscriber_role=True,
            output_table_partitioned=True,
        )

    ok_df = validate_pubsub_to_bigquery_dataflow_launch(
        job_name="gse-odds-stream",
        project_id="gse-prod",
        region="us-east1",
        input_topic="projects/gse-prod/topics/gse-odds-ticks",
        output_table_spec="gse-prod:gse_calibration.odds_stream",
        staging_gcs_uri="gs://gse-dataflow/tmp",
        input_topic_exists=True,
        worker_has_pubsub_subscriber_role=True,
        output_table_partitioned=True,
    )
    assert ok_df["ok"] is True

    with pytest.raises(ValueError, match="constraints/gcp.resourceLocations"):
        build_beam_dataflow_command(
            project_id="gse-prod",
            bucket_gcs_uri="gs://gse-beam-bucket",
            region="us-east1",
            allowed_org_policy_regions=("us-west1", "us-central1"),
        )

    with pytest.raises(ValueError, match="capacity stockout"):
        build_beam_dataflow_command(
            project_id="gse-prod",
            bucket_gcs_uri="gs://gse-beam-bucket",
            region="us-west1",
            stockout_regions=("us-west1",),
        )

    beam = build_beam_dataflow_command(
        project_id="gse-prod",
        bucket_gcs_uri="gs://gse-beam-bucket",
        region="us-central1",
    )
    assert beam["docker_base_image"] == DEFAULT_BEAM_PYTHON_IMAGE
    assert beam["pip_package"] == DEFAULT_BEAM_GCP_SPEC
    expected_flags = (
        "--project",
        "--runner",
        "--staging_location",
        "--temp_location",
        "--output",
        "--region",
    )
    for req_flag in expected_flags:
        assert req_flag in beam["argv"]

    with pytest.raises(PermissionError, match="BigQuery ML SQL baseline"):
        validate_automl_tabular_launch(
            dataset_bq_uri="bq://gse-prod.gse_calibration.nfl_games",
            bqml_sql_baseline_completed=False,
            founder_paid_node_hour_approved=True,
        )

    with pytest.raises(PermissionError, match="explicit Garrett approval"):
        validate_automl_tabular_launch(
            dataset_bq_uri="bq://gse-prod.gse_calibration.nfl_games",
            bqml_sql_baseline_completed=True,
            founder_paid_node_hour_approved=False,
        )

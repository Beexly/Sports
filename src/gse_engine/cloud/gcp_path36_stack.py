"""GCP Path 36 Cloud & Data/ML Pipeline Stack (Items #5, #6, #11-#17 & Verified Status).

Encodes Motif's final 2026-11-19 Path 36 record, fail-closed Dataflow / Beam / AutoML
guards, and strict standing deferrals (zero GKE, zero Workbench, zero Dataprep).
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

PATH36_VERIFIED_STATUS: dict[str, Any] = {
    "record_date": "2026-11-19",
    "account_email": "baxley.garrett@gmail.com",
    "points": 1977,
    "overall_complete": False,
    "blocked_on_lab_credits": True,
    "total_credits_remaining": 0,
    "starter_pack_last_purchase_usd": 0.01,
    "starter_pack_credits_spent": 35,
    "course_1_pct": 100,
    "course_2_pct": 100,
    "course_3_pct": 96,
    "gsp215_score": "95/100",
    "course_4_pct": 87,
    "course_4_can_reach_100": False,
    "gsp192_score": "80/100",
    "gsp207_score": "50/100",
    "dataprep_lab_640821_status": "DEPRECATED_UNAVAILABLE",
    "skill_badges_pct": 0,
    "claim_credential_enabled": False,
    "queued_paths_420_419_4525_started": False,
}

PATH36_DEFERRAL_LOCKS: dict[str, str] = {
    "gke_cluster_build": "DEFER_USE_CLOUD_RUN",
    "custom_workbench_training": "DEFER_UNTIL_BQML_AND_AUTOML_INSUFFICIENT",
    "dataprep_alteryx_cloud": "DEPRECATED_UNAVAILABLE_DO_NOT_USE",
    "cloud_sql_mysql": "DEFER_NEON_POSTGRES_IS_SOT",
    "dataproc_ephemeral_spark": "DEFER_UNTIL_BATCH_VOLUME_JUSTIFIES",
    "terraform_full_iac": "DEFER_UNTIL_ARCHITECTURE_STABILIZES",
    "hybrid_vpn_interconnect": "DEFER_CLOUD_NATIVE_ONLY",
}

DEFAULT_BEAM_PYTHON_IMAGE = "python:3.12"
DEFAULT_BEAM_GCP_SPEC = "apache-beam[gcp]==2.67.0"
DEFAULT_DATAFLOW_PUBSUB_TO_BQ_TEMPLATE = (
    "gs://dataflow-templates-us-east1/latest/PubSub_to_BigQuery"
)


def validate_pubsub_to_bigquery_dataflow_launch(
    *,
    job_name: str,
    project_id: str,
    region: str,
    input_topic: str,
    output_table_spec: str,
    staging_gcs_uri: str,
    input_topic_exists: bool,
    worker_has_pubsub_subscriber_role: bool,
    output_table_partitioned: bool,
    template_gcs_path: str = DEFAULT_DATAFLOW_PUBSUB_TO_BQ_TEMPLATE,
) -> dict[str, Any]:
    """Fail closed before Dataflow template launch if GSP192 preconditions are unmet."""
    if not job_name.strip() or not project_id.strip() or not region.strip():
        raise ValueError("job_name, project_id, and region must be non-empty.")
    if not staging_gcs_uri.startswith("gs://"):
        raise ValueError("staging_gcs_uri must start with gs://.")
    if not template_gcs_path.startswith("gs://"):
        raise ValueError("template_gcs_path must start with gs://.")
    if ":" not in output_table_spec or "." not in output_table_spec:
        raise ValueError("output_table_spec must match `<project>:<dataset>.<table>`.")
    if not input_topic_exists:
        raise ValueError(
            f"Pre-flight refused (GSP192 defense): input Pub/Sub topic {input_topic!r} "
            "must be pre-provisioned before Dataflow launch."
        )
    if not worker_has_pubsub_subscriber_role:
        raise ValueError(
            "Pre-flight refused (GSP192 defense): Dataflow worker service account "
            "must hold `roles/pubsub.subscriber`."
        )
    if not output_table_partitioned:
        raise ValueError(
            "Pre-flight refused: BigQuery target table must be time-partitioned."
        )
    return {
        "ok": True,
        "job_name": job_name.strip(),
        "project_id": project_id.strip(),
        "region": region.strip(),
        "template_gcs_path": template_gcs_path.strip(),
        "input_topic": input_topic.strip(),
        "output_table_spec": output_table_spec.strip(),
        "staging_gcs_uri": staging_gcs_uri.strip(),
    }


def build_beam_dataflow_command(
    *,
    project_id: str,
    bucket_gcs_uri: str,
    region: str,
    allowed_org_policy_regions: tuple[str, ...] = ("us-west1", "us-central1", "us-east4"),
    stockout_regions: tuple[str, ...] = (),
    example_module: str = "apache_beam.examples.wordcount",
) -> dict[str, Any]:
    """Build complete Apache Beam DataflowRunner command encoding all GSP207 gotchas."""
    proj = project_id.strip()
    bucket = bucket_gcs_uri.strip().rstrip("/")
    reg = region.strip()
    if not proj:
        raise ValueError("project_id is required (--project).")
    if not bucket.startswith("gs://"):
        raise ValueError("bucket_gcs_uri must start with gs://.")
    if not reg:
        raise ValueError("region is required (--region).")
    if reg not in allowed_org_policy_regions:
        raise ValueError(
            f"Region {reg!r} rejected by constraints/gcp.resourceLocations policy "
            f"(allowed: {allowed_org_policy_regions})."
        )
    if reg in stockout_regions:
        raise ValueError(
            f"Region {reg!r} currently flagged for capacity stockout (GSP207 n1 exhaustion)."
        )

    args = [
        "python",
        "-m",
        example_module,
        "--project",
        proj,
        "--runner",
        "DataflowRunner",
        "--staging_location",
        f"{bucket}/staging",
        "--temp_location",
        f"{bucket}/temp",
        "--output",
        f"{bucket}/results/output",
        "--region",
        reg,
    ]
    return {
        "docker_base_image": DEFAULT_BEAM_PYTHON_IMAGE,
        "pip_package": DEFAULT_BEAM_GCP_SPEC,
        "argv": args,
        "command": " ".join(args),
        "region": reg,
    }


def validate_automl_tabular_launch(
    *,
    dataset_bq_uri: str,
    bqml_sql_baseline_completed: bool,
    founder_paid_node_hour_approved: bool,
) -> dict[str, Any]:
    """Fail-closed gate before spending Agent Platform AutoML tabular node-hours."""
    if not dataset_bq_uri.startswith("bq://"):
        raise ValueError("AutoML tabular source must come from BigQuery (`bq://...`).")
    if not bqml_sql_baseline_completed:
        raise PermissionError(
            "AutoML tabular refused: complete free-tier BigQuery ML SQL baseline first."
        )
    if not founder_paid_node_hour_approved:
        raise PermissionError(
            "AutoML tabular paused: paid training node-hours require explicit Garrett approval."
        )
    return {
        "ok": True,
        "dataset_bq_uri": dataset_bq_uri,
        "training_path": "agent_platform_automl_tabular",
    }


def build_path36_architecture_receipt() -> dict[str, Any]:
    """Return a deterministic audit receipt summarizing Path 36 status & deferral locks."""
    core = {
        "schema": "gse.gcp_path36_stack_receipt.v1",
        "status": PATH36_VERIFIED_STATUS,
        "deferral_locks": PATH36_DEFERRAL_LOCKS,
    }
    blob = json.dumps(core, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return {
        **core,
        "receipt_sha256": hashlib.sha256(blob.encode("ascii")).hexdigest(),
    }

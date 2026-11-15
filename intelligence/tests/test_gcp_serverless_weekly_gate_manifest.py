"""Unit tests for GCP-LEV-05 Scale-to-Zero Serverless Weekly Gate Manifest."""

from __future__ import annotations

import copy
from pathlib import Path

from intelligence.ops.gcp_serverless_weekly_gate_manifest import (
    REQUIRED_FAIL_CLOSED_ENV,
    build_always_free_scheduler_jobs,
    compile_gcp_serverless_weekly_gate_manifest,
    evaluate_always_free_budget_projection,
    validate_serverless_weekly_gate_bundle,
)


def test_gcp_lev05_manifest_compiles_inside_always_free_and_fail_closed(tmp_path: Path) -> None:
    out_receipt = tmp_path / "gcp_lev05_receipt.json"
    bundle = compile_gcp_serverless_weekly_gate_manifest(output_receipt_path=out_receipt)

    assert out_receipt.exists()
    assert bundle["validation"]["passed"] is True
    assert bundle["validation"]["errors"] == []
    assert bundle["artifact_registry_repository"]["verified_live_on_gcp"] is True

    guarantees = bundle["cloud_run_job_v2"]["scale_to_zero_guarantees"]
    assert guarantees["min_instance_count"] == 0
    assert guarantees["idle_cpu_allocation"] is False

    budget = bundle["always_free_budget_projection"]
    assert budget["cloud_scheduler_jobs_count"] == 3
    assert budget["projected_monthly_cost_usd"] == 0.0
    assert budget["within_always_free_safety_envelope"] is True
    assert budget["cloud_run_vcpu_seconds"] <= 180_000 * 0.75
    assert budget["cloud_run_gib_seconds"] <= 360_000 * 0.75
    assert budget["cloud_workflows_steps"] <= 5_000 * 0.75


def test_gcp_lev05_validator_rejects_public_gate_flip_or_paid_lane(tmp_path: Path) -> None:
    out_receipt = tmp_path / "gcp_lev05_receipt.json"
    bundle = compile_gcp_serverless_weekly_gate_manifest(output_receipt_path=out_receipt)

    mutated = copy.deepcopy(bundle)
    mutated["cloud_run_job_v2"]["scale_to_zero_guarantees"]["min_instance_count"] = 1
    for env_entry in mutated["cloud_run_job_v2"]["template"]["template"]["containers"][0]["env"]:
        if env_entry["name"] == "LIVE_BOARD":
            env_entry["value"] = "true"
        if env_entry["name"] == "WEEK10_HELD_FOR_CORPUS_COMPLETION":
            env_entry["value"] = "false"
    mutated["cloud_scheduler_jobs"].append(copy.deepcopy(mutated["cloud_scheduler_jobs"][0]))

    errs = validate_serverless_weekly_gate_bundle(mutated)
    assert any("min_instance_count" in e for e in errs)
    assert any("LIVE_BOARD" in e for e in errs)
    assert any("WEEK10_HELD_FOR_CORPUS_COMPLETION" in e for e in errs)
    assert any("exceeds 3-job Always-Free tier" in e for e in errs)


def test_gcp_lev05_budget_projection_flags_overrun() -> None:
    jobs = build_always_free_scheduler_jobs()
    overrun = evaluate_always_free_budget_projection(
        jobs,
        avg_job_duration_seconds=3600.0,
        vcpu_per_task=2.0,
        gib_per_task=4.0,
    )
    assert overrun["within_always_free_safety_envelope"] is False
    assert overrun["projected_monthly_cost_usd"] == -1.0
    assert len(REQUIRED_FAIL_CLOSED_ENV) == 8

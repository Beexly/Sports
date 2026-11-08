#!/usr/bin/env python3
"""
Unit tests for the 58-Skill Enterprise Gateway, Airflow 3, Agent Platform,
Compute Reservations, Pathways, GKE Storage, SecOps Detection Coverage,
Santa Method, TS Deep Modules, Wizard, Loop-Me, and Writing Fragments Wave.
"""
from __future__ import annotations

from intelligence.cloud_and_enterprise_skills.enterprise_gateway_airflow_rag_compute_and_secops_executor import (
    ALL_58_WAVE_SKILLS,
    WAVE_RECEIPT_PATH,
    execute_agent_platform_access_alerts_and_rag_suite,
    execute_agentdb_vector_and_memory_suite,
    execute_all_58_wave_skills,
    execute_bazel_deep_modules_wizard_loop_fragments_and_research_suite,
    execute_compute_reservations_pathways_gke_storage_and_iam_suite,
    execute_managed_airflow_suite,
    execute_secops_detection_coverage_and_santa_method_suite,
    validate_api_gateway_and_mcp_openapi,
    validate_apigee_agent_gateway_governance,
)


def test_api_gateway_and_mcp_openapi_v3_0_4_contract() -> None:
    res = validate_api_gateway_and_mcp_openapi()
    assert res["status"] == "PASS"
    assert res["openapi_version"] == "3.0.4"
    assert res["backend_protocol"] == "h2"
    assert len(res["preserved_quota_metrics"]) >= 2
    assert len(res["mcp_tools_exposed"]) >= 3
    assert "GET /v1/admin/health" in res["mcp_tools_explicitly_opted_out"]


def test_apigee_agent_gateway_governance_contract() -> None:
    res = validate_apigee_agent_gateway_governance()
    assert res["status"] == "PASS"
    assert res["deployment_type"] == "EXTENSIBLE"
    assert res["feature_uids_preserved_count"] == 6
    assert {"gemini-pro", "gemini-flash", "other"}.issubset(set(res["token_metering_buckets"]))
    assert res["ext_proc_wire_format"] == "EXT_PROC_GRPC"


def test_managed_airflow_3_and_otel_alerts_and_secops_santa() -> None:
    airflow_res = execute_managed_airflow_suite()
    assert airflow_res["status"] == "PASS"
    assert len(airflow_res["troubleshooting_modes_verified"]) == 6

    ap_res = execute_agent_platform_access_alerts_and_rag_suite()
    assert ap_res["status"] == "PASS"
    assert ap_res["otel_alert_policies_count"] == 11

    adb_res = execute_agentdb_vector_and_memory_suite()
    assert adb_res["status"] == "PASS"
    assert adb_res["binary_memory_reduction_x"] == 32

    comp_res = execute_compute_reservations_pathways_gke_storage_and_iam_suite()
    assert comp_res["status"] == "PASS"
    assert comp_res["on_demand_available_capacity"] == 6

    secops_res = execute_secops_detection_coverage_and_santa_method_suite()
    assert secops_res["status"] == "PASS"
    assert secops_res["santa_method_verdict"] == "NICE"

    dev_res = execute_bazel_deep_modules_wizard_loop_fragments_and_research_suite()
    assert dev_res["status"] == "PASS"


def test_execute_all_58_wave_skills_end_to_end() -> None:
    receipt = execute_all_58_wave_skills(write_receipt=True)
    assert receipt["status"] == "PASS"
    assert receipt["total_wave_skills_executed"] == len(ALL_58_WAVE_SKILLS)
    assert WAVE_RECEIPT_PATH.exists()

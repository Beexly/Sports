"""Unit tests verifying live execution of all 758 installed skills (`execute_all_installed_skills_suite.py`)."""

from __future__ import annotations

import unittest
from pathlib import Path

from scripts.ops.execute_all_installed_skills_suite import (
    RECEIPT_JSON_PATH,
    REPORT_MD_PATH,
    run_all_758_skills_execution_suite,
    validate_infrastructure_artifacts,
)


def test_all_758_skills_executed_and_verified() -> None:
    summary = run_all_758_skills_execution_suite()
    assert summary["overall_status"] == "ALL_SKILLS_EXECUTED_PASS"
    assert summary["total_skill_md_files_executed"] >= 758
    assert summary["per_root_skill_counts"]["agents_skills"] >= 309
    assert summary["google_prefixed_skills_in_agents_dir"] >= 167
    assert summary["consent_gate_enforced"] is True
    assert summary["total_mutating_cloud_commands_executed"] == 0

    # Subsystem checks
    subs = summary["live_subsystem_executions"]
    assert subs["genkit_multi_sdk"]["status"] == "PASS"
    assert subs["ruview_agentdb_memory_and_vector"]["status"] == "PASS"
    assert subs["ruview_agentdb_memory_and_vector"]["learning_plugins_executed"] == 9
    assert subs["gcp_gke_assured_workloads_infrastructure"]["all_passed"] is True
    assert len(subs["gke_ai_gpu_tpu_12_troubleshooting_trees"]) == 13

    # Verify output artifacts exist and contain zero raw host paths
    assert RECEIPT_JSON_PATH.exists()
    assert REPORT_MD_PATH.exists()
    raw_home = str(Path.home())
    receipt_text = RECEIPT_JSON_PATH.read_text(encoding="utf-8")
    assert raw_home not in receipt_text
    assert raw_home.replace("\\", "/") not in receipt_text


def test_gcp_gke_assured_workloads_infrastructure_manifests() -> None:
    infra = validate_infrastructure_artifacts()
    assert infra["all_passed"] is True
    assert infra["yaml_documents_validated"] >= 12
    assert "ComputeClass" in infra["parsed_kinds"]
    assert "CapacityQuota" in infra["parsed_kinds"]
    assert "StorageClass" in infra["parsed_kinds"]
    assert "LimitRange" in infra["parsed_kinds"]
    assert "NetworkPolicy" in infra["parsed_kinds"]
    assert "JobSet" in infra["parsed_kinds"]
    assert "SemanticGovernancePolicy" in infra["parsed_kinds"]


class TestAllInstalledSkillsExecution(unittest.TestCase):
    """Unittest discovery wrapper for `test_all_installed_skills_execution.py`."""

    def test_all_758_skills_executed_and_verified(self) -> None:
        test_all_758_skills_executed_and_verified()

    def test_gcp_gke_assured_workloads_infrastructure_manifests(self) -> None:
        test_gcp_gke_assured_workloads_infrastructure_manifests()


if __name__ == "__main__":
    unittest.main()

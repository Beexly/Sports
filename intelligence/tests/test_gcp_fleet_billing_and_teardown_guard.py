"""Unit tests for GCP-LEV-06 Post-Shard-B Billing Stack & Zero-Idle 4-VM Teardown Guard."""

from __future__ import annotations

from pathlib import Path

from intelligence.ops.gcp_fleet_billing_and_teardown_guard import (
    GCP_FOUNDRY_VMS,
    compile_gcp_lev06_billing_and_teardown_receipt,
    evaluate_vm_teardown_readiness,
)


def test_gcp_lev06_blocks_premature_vm_teardown_while_shard_b_actively_draining() -> None:
    gate = evaluate_vm_teardown_readiness(
        delegated_target=8598,
        unique_filenames_flat=4641,
        missing_flat_files_count=0,
        written_in_latest_sync=83,
        minutes_since_last_branch_advance=0.0,
    )
    assert gate["teardown_authorized"] is False
    assert gate["decision"] == "KEEP_RUNNING_ACTIVE_SHARD_B_SWEEP"
    assert any("ACTIVE_DRAIN_IN_PROGRESS" in r for r in gate["blocking_reasons"])


def test_gcp_lev06_authorizes_zero_idle_teardown_only_when_complete_unpacked_and_quiet() -> None:
    gate = evaluate_vm_teardown_readiness(
        delegated_target=8598,
        unique_filenames_flat=8598,
        missing_flat_files_count=0,
        written_in_latest_sync=0,
        minutes_since_last_branch_advance=35.0,
    )
    assert gate["teardown_authorized"] is True
    assert gate["decision"] == "READY_FOR_ZERO_IDLE_TEARDOWN"
    assert gate["blocking_reasons"] == []
    assert len(gate["teardown_gcloud_commands_when_authorized"]) == len(GCP_FOUNDRY_VMS) == 4


def test_gcp_lev06_live_receipt_compiles_cleanly(tmp_path: Path) -> None:
    out_path = tmp_path / "gcp_lev06_receipt.json"
    receipt = compile_gcp_lev06_billing_and_teardown_receipt(output_receipt_path=out_path)
    assert out_path.exists()
    assert receipt["credit_stack_ledger"]["openrouter_lane_policy"]["paid_spend_allowed_usd"] == 0.0
    assert receipt["delegated_gcp_queue_ro"]["total_delegated_gcp"] >= 8500
    assert receipt["teardown_gate"]["teardown_authorized"] is False

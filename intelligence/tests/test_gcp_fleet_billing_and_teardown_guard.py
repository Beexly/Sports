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
    import json
    import sqlite3
    from datetime import datetime, timedelta, timezone

    db_path = tmp_path / "foundry.db"
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE corpus_queue (book_id TEXT, tier TEXT, status TEXT)")
    for i in range(8598):
        tier = "A" if i < 217 else ("B" if i < 1823 else "C")
        conn.execute("INSERT INTO corpus_queue VALUES (?, ?, 'DELEGATED_GCP')", (f"b{i}", tier))
    conn.commit()
    conn.close()

    stale_ts = (datetime.now(timezone.utc) - timedelta(minutes=35)).isoformat()
    unpack_path = tmp_path / "unpack.json"
    unpack_path.write_text(
        json.dumps(
            {
                "generated_at_utc": stale_ts,
                "per_node_file_counts": {"node1": 2150, "node2": 2150, "node3": 2150, "node4": 2148},
                "total_branch_blobs": 8598,
                "unique_filenames_flat": 8598,
                "missing_flat_files": [],
                "written_by_node": 0,
                "written_flat": 0,
                "branch_commits": {},
            }
        ),
        encoding="utf-8",
    )

    out_path = tmp_path / "gcp_lev06_receipt.json"
    receipt = compile_gcp_lev06_billing_and_teardown_receipt(
        db_path=db_path,
        unpack_manifest_path=unpack_path,
        output_receipt_path=out_path,
    )
    assert out_path.exists()
    assert receipt["credit_stack_ledger"]["openrouter_lane_policy"]["paid_spend_allowed_usd"] == 0.0
    assert receipt["delegated_gcp_queue_ro"]["total_delegated_gcp"] == 8598
    assert receipt["teardown_gate"]["teardown_authorized"] is True
    assert receipt["teardown_gate"]["minutes_since_last_branch_advance"] >= 30.0

    # Missing foundry.db must fail closed (never fabricate 8598)
    receipt_missing = compile_gcp_lev06_billing_and_teardown_receipt(
        db_path=tmp_path / "nonexistent.db",
        unpack_manifest_path=unpack_path,
        output_receipt_path=tmp_path / "gcp_lev06_missing.json",
    )
    assert receipt_missing["delegated_gcp_queue_ro"]["total_delegated_gcp"] == 0
    assert receipt_missing["teardown_gate"]["teardown_authorized"] is False

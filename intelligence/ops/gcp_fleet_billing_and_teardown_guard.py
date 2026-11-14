#!/usr/bin/env python3
"""GCP-LEV-06 Post-Shard-B Billing Stack Verifier & Zero-Idle 4-VM Teardown Guard.

Protects the `galaxysportsedge` GCP credit buffer (`$103.11` active GCP credits + Dec 6 `$100`
Google Developer Program renewal + `GOOGLE_STARTUPS_CASE_ID` up to `$350k` startup tier + AWS
`$120` Free Tier) and prevents premature or forgotten VM billing across the 4 Foundry Shard B
Compute Engine workers:
  - `gse-foundry-gcp-01` (`us-central1-a`, `e2-standard-8` -> `origin/gcp/foundry-shard-b-2026-11-13`)
  - `gse-foundry-gcp-02` (`us-central1-a`, `e2-standard-8` -> `origin/gcp/foundry-node2-2026-11-13`)
  - `gse-foundry-gcp-03` (`us-east1-b`,    `e2-standard-8` -> `origin/gcp/foundry-node3-2026-11-13`)
  - `gse-foundry-gcp-04` (`us-west1-b`,    `e2-standard-8` -> `origin/gcp/foundry-node4-2026-11-13`)

Safety Contract (Fail-Closed):
  1. Reads `01a_gcp_sync_4branch_unpack_manifest.json` and `corpus_queue` (`file:...?mode=ro` ONLY)
     to compare total `DELEGATED_GCP` documents (`8,598`) against unique unpacked Shard B extractions.
  2. NEVER authorizes VM `instances delete` / `instances stop` while `unique_filenames_flat < delegated_target`
     or while any node pushed new blobs within `idle_quiet_minutes` (`30` min default) — preventing
     data loss on active VMs.
  3. Immediately flags `READY_FOR_ZERO_IDLE_TEARDOWN` with exact per-zone `gcloud compute instances delete`
     commands once `unique_filenames_flat >= delegated_target` AND all 4 branches have been unpacked
     losslessly (`missing_flat_files == []`) AND branch commits are quiet for `>= idle_quiet_minutes`,
     guaranteeing `0` idle VM burn post-Shard-B.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FOUNDRY_DB = Path(r"C:\Users\Garrett\Sports\foundry\foundry.db")
DEFAULT_UNPACK_MANIFEST = Path(
    r"C:\Users\Garrett\Sports\foundry\audits\friday_full_audit_2026-11-13\01a_gcp_sync_4branch_unpack_manifest.json"
)
DEFAULT_RECEIPT_PATH = (
    REPO_ROOT
    / "docs"
    / "engine"
    / "research"
    / "2026-11-14"
    / "gcp_lev06_billing_and_zero_idle_vm_teardown_receipt.json"
)

GCP_FOUNDRY_VMS: Tuple[Dict[str, str], ...] = (
    {
        "node": "node1",
        "instance_name": "gse-foundry-gcp-01",
        "zone": "us-central1-a",
        "machine_type": "e2-standard-8",
        "branch": "origin/gcp/foundry-shard-b-2026-11-13",
    },
    {
        "node": "node2",
        "instance_name": "gse-foundry-gcp-02",
        "zone": "us-central1-a",
        "machine_type": "e2-standard-8",
        "branch": "origin/gcp/foundry-node2-2026-11-13",
    },
    {
        "node": "node3",
        "instance_name": "gse-foundry-gcp-03",
        "zone": "us-east1-b",
        "machine_type": "e2-standard-8",
        "branch": "origin/gcp/foundry-node3-2026-11-13",
    },
    {
        "node": "node4",
        "instance_name": "gse-foundry-gcp-04",
        "zone": "us-west1-b",
        "machine_type": "e2-standard-8",
        "branch": "origin/gcp/foundry-node4-2026-11-13",
    },
)

CREDIT_STACK_LEDGER: Dict[str, Any] = {
    "gcp_project_id": "galaxysportsedge",
    "active_gcp_credit_buffer_usd": 103.11,
    "google_dev_program_renewal": {
        "renewal_date": "2026-12-06",
        "credit_grant_usd": 100.0,
        "status": "SCHEDULED_RENEWAL",
    },
    "google_for_startups_ai_cloud_program": {
        "env_var_reference": "GOOGLE_STARTUPS_CASE_ID",
        "max_potential_credit_usd": 350_000.0,
        "status": "FOUNDER_APPLICATION_TRACKED",
    },
    "aws_shadow_free_tier": {
        "credit_buffer_usd": 120.0,
        "idle_ec2_rds_nat_instances": 0,
        "status": "ZERO_IDLE_BURN",
    },
    "openrouter_lane_policy": {
        "paid_spend_allowed_usd": 0.0,
        "active_free_lanes": ["alibaba-qwencloud-1m-free", "nvidia-nim-free-40rpm"],
    },
}


def query_delegated_gcp_counts_ro(db_path: Path = DEFAULT_FOUNDRY_DB) -> Dict[str, int]:
    """Query `corpus_queue` strictly read-only (`?mode=ro`) for `DELEGATED_GCP` targets (fail-closed)."""
    if not db_path.is_file():
        return {"tier_a": 0, "tier_b": 0, "tier_c": 0, "total_delegated_gcp": 0}
    conn = sqlite3.connect(f"file:{db_path.resolve().as_posix()}?mode=ro", uri=True, timeout=5.0)
    try:
        rows = conn.execute(
            "SELECT tier, COUNT(*) FROM corpus_queue WHERE status = 'DELEGATED_GCP' GROUP BY tier"
        ).fetchall()
    finally:
        conn.close()
    by_tier = {str(r[0]): int(r[1]) for r in rows}
    total = sum(by_tier.values())
    return {
        "tier_a": by_tier.get("A", 0),
        "tier_b": by_tier.get("B", 0),
        "tier_c": by_tier.get("C", 0),
        "total_delegated_gcp": total,
    }


def evaluate_vm_teardown_readiness(
    *,
    delegated_target: int,
    unique_filenames_flat: int,
    missing_flat_files_count: int,
    written_in_latest_sync: int,
    minutes_since_last_branch_advance: float,
    idle_quiet_minutes_required: float = 30.0,
) -> Dict[str, Any]:
    """Fail-closed state machine deciding whether the 4 GCP VMs must KEEP_RUNNING or TEARDOWN_NOW."""
    completion_ratio = (
        round(unique_filenames_flat / float(delegated_target), 4)
        if delegated_target > 0
        else 0.0
    )
    quota_reached = delegated_target > 0 and unique_filenames_flat >= delegated_target
    unpack_lossless = missing_flat_files_count == 0
    sync_drained = written_in_latest_sync == 0
    quiet_window_met = minutes_since_last_branch_advance >= idle_quiet_minutes_required

    teardown_authorized = bool(quota_reached and unpack_lossless and sync_drained and quiet_window_met)

    blocking_reasons: List[str] = []
    if not quota_reached:
        blocking_reasons.append(
            f"ACTIVE_DRAIN_IN_PROGRESS: {unique_filenames_flat}/{delegated_target} unique docs unpacked ({completion_ratio * 100:.1f}%)"
        )
    if not unpack_lossless:
        blocking_reasons.append(f"MISSING_FLAT_FILES: {missing_flat_files_count} blobs not yet unpacked locally")
    if not sync_drained:
        blocking_reasons.append(f"RECENT_DELTAS_WRITTEN: {written_in_latest_sync} new files unpacked on latest sync")
    if not quiet_window_met:
        blocking_reasons.append(
            f"QUIET_WINDOW_UNMET: {minutes_since_last_branch_advance:.1f}m < {idle_quiet_minutes_required:.1f}m"
        )

    teardown_commands = [
        (
            f"gcloud compute instances delete {vm['instance_name']} "
            f"--project=galaxysportsedge --zone={vm['zone']} --quiet"
        )
        for vm in GCP_FOUNDRY_VMS
    ]

    return {
        "decision": "READY_FOR_ZERO_IDLE_TEARDOWN" if teardown_authorized else "KEEP_RUNNING_ACTIVE_SHARD_B_SWEEP",
        "teardown_authorized": teardown_authorized,
        "delegated_target": delegated_target,
        "unique_filenames_flat": unique_filenames_flat,
        "completion_ratio": completion_ratio,
        "missing_flat_files_count": missing_flat_files_count,
        "written_in_latest_sync": written_in_latest_sync,
        "minutes_since_last_branch_advance": round(minutes_since_last_branch_advance, 2),
        "blocking_reasons": blocking_reasons,
        "teardown_gcloud_commands_when_authorized": teardown_commands,
    }


def compile_gcp_lev06_billing_and_teardown_receipt(
    *,
    db_path: Path = DEFAULT_FOUNDRY_DB,
    unpack_manifest_path: Path = DEFAULT_UNPACK_MANIFEST,
    output_receipt_path: Path = DEFAULT_RECEIPT_PATH,
) -> Dict[str, Any]:
    """Build and persist the GCP-LEV-06 billing credit stack & 4-VM zero-idle teardown guard receipt."""
    delegated = query_delegated_gcp_counts_ro(db_path)
    if unpack_manifest_path.is_file():
        unpack = json.loads(unpack_manifest_path.read_text(encoding="utf-8"))
    else:
        unpack = {
            "per_node_file_counts": {},
            "total_branch_blobs": 0,
            "unique_filenames_flat": 0,
            "missing_flat_files": [],
            "written_by_node": 0,
            "written_flat": 0,
            "branch_commits": {},
        }

    written_latest = int(unpack.get("written_by_node", 0)) + int(unpack.get("written_flat", 0))
    missing_count = len(unpack.get("missing_flat_files", []) or [])
    unique_flat = int(unpack.get("unique_filenames_flat", 0))

    now_utc = datetime.now(timezone.utc)
    if written_latest > 0:
        quiet_minutes = 0.0
    else:
        ts_raw = unpack.get("last_advance_utc") or unpack.get("generated_at_utc") or unpack.get("synced_at_utc")
        quiet_minutes = None
        if ts_raw:
            try:
                parsed = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                quiet_minutes = max(0.0, (now_utc - parsed.astimezone(timezone.utc)).total_seconds() / 60.0)
            except ValueError:
                quiet_minutes = None
        if quiet_minutes is None and unpack_manifest_path.is_file():
            quiet_minutes = max(0.0, (now_utc.timestamp() - unpack_manifest_path.stat().st_mtime) / 60.0)
        if quiet_minutes is None:
            quiet_minutes = 0.0

    readiness = evaluate_vm_teardown_readiness(
        delegated_target=delegated["total_delegated_gcp"],
        unique_filenames_flat=unique_flat,
        missing_flat_files_count=missing_count,
        written_in_latest_sync=written_latest,
        minutes_since_last_branch_advance=quiet_minutes,
    )

    receipt: Dict[str, Any] = {
        "schema_version": "1.0.0",
        "task_id": "GCP-LEV-06",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "credit_stack_ledger": CREDIT_STACK_LEDGER,
        "delegated_gcp_queue_ro": delegated,
        "four_vm_fleet_topology": list(GCP_FOUNDRY_VMS),
        "live_unpack_progress": {
            "per_node_file_counts": unpack.get("per_node_file_counts", {}),
            "total_branch_blobs": unpack.get("total_branch_blobs", 0),
            "unique_filenames_flat": unique_flat,
            "branch_commits": unpack.get("branch_commits", {}),
            "written_in_latest_sync": written_latest,
        },
        "teardown_gate": readiness,
    }

    output_receipt_path.parent.mkdir(parents=True, exist_ok=True)
    output_receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    return receipt


if __name__ == "__main__":
    out = compile_gcp_lev06_billing_and_teardown_receipt()
    print(
        json.dumps(
            {
                "task_id": out["task_id"],
                "decision": out["teardown_gate"]["decision"],
                "teardown_authorized": out["teardown_gate"]["teardown_authorized"],
                "progress": f"{out['teardown_gate']['unique_filenames_flat']}/{out['teardown_gate']['delegated_target']}",
                "completion_ratio": out["teardown_gate"]["completion_ratio"],
            },
            indent=2,
        )
    )

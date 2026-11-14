"""Tests for intelligence.foundry_bridge.hydrate_bq_gse_data."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from intelligence.foundry_bridge.hydrate_bq_gse_data import hydrate_bigquery_from_staging


def test_hydrate_bigquery_fails_closed_on_missing_or_mismatched_rows(monkeypatch, tmp_path: Path) -> None:
    staging = tmp_path / "bq_staging"
    staging.mkdir()
    out_receipt = tmp_path / "receipt.json"

    with pytest.raises(FileNotFoundError):
        hydrate_bigquery_from_staging(staging_dir=staging, out_receipt_path=out_receipt)

    table_names = (
        "sovereign_primitives",
        "sovereign_reasoning_traces",
        "gcp_shard_b_extractions",
        "router_and_situational_wiring",
        "week10_entity_and_venue_truth",
    )
    for idx, t in enumerate(table_names, start=1):
        lines = [json.dumps({"id": f"{t}_{k}"}) for k in range(idx)]
        (staging / f"{t}.jsonl").write_text("\n".join(lines) + "\n", encoding="utf-8")

    def _mock_bq_mismatch(args):
        if args[:2] == ["show", "--project_id=galaxysportsedge"] or args[0] == "load":
            return subprocess.CompletedProcess(["bq", *args], 0, stdout="", stderr="")
        if args[0] == "query":
            payload = [{"table_name": t, "row_count": "0"} for t in table_names]
            return subprocess.CompletedProcess(["bq", *args], 0, stdout=json.dumps(payload), stderr="")
        return subprocess.CompletedProcess(["bq", *args], 0, stdout="[]", stderr="")

    monkeypatch.setattr("intelligence.foundry_bridge.hydrate_bq_gse_data._run_bq", _mock_bq_mismatch)
    with pytest.raises(RuntimeError, match="Row count mismatch"):
        hydrate_bigquery_from_staging(staging_dir=staging, out_receipt_path=out_receipt)

    def _mock_bq_ok(args):
        if args[0] == "query":
            payload = [{"table_name": t, "row_count": str(i)} for i, t in enumerate(table_names, start=1)]
            return subprocess.CompletedProcess(["bq", *args], 0, stdout=json.dumps(payload), stderr="")
        if args[0] == "ls":
            payload = [{"tableReference": {"tableId": t}} for t in table_names]
            return subprocess.CompletedProcess(["bq", *args], 0, stdout=json.dumps(payload), stderr="")
        return subprocess.CompletedProcess(["bq", *args], 0, stdout="", stderr="")

    monkeypatch.setattr("intelligence.foundry_bridge.hydrate_bq_gse_data._run_bq", _mock_bq_ok)
    receipt = hydrate_bigquery_from_staging(staging_dir=staging, out_receipt_path=out_receipt)
    assert out_receipt.is_file()
    assert receipt["total_verified_rows"] == 15
    assert receipt["estimated_cost_usd"] == 0.0
    assert set(receipt["bq_ls_table_ids"]) == set(table_names)

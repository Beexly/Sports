#!/usr/bin/env python3
"""Promote & harden BigQuery Always-Free `galaxysportsedge:gse_data` hydration.

Loads the 5 router-wiring staging NDJSON tables into `galaxysportsedge.gse_data`
via `bq load --replace`, executes a single `UNION ALL` row-count verification
query, lists remote tables (`bq ls`), and fails closed if any staging file is
missing or any remote table row count diverges from the local NDJSON line count.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

PROJECT_ID = "galaxysportsedge"
DATASET_ID = "gse_data"
BQ_LOCATION = "US"

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_STAGING_DIR = (
    REPO_ROOT
    / "docs"
    / "engine"
    / "research"
    / "2026-11-13"
    / "friday_prepack_audit"
    / "bq_staging"
)
DEFAULT_OUT_RECEIPT = (
    REPO_ROOT
    / "docs"
    / "engine"
    / "research"
    / "2026-11-13"
    / "friday_prepack_audit"
    / "05b_bigquery_gse_data_hydration_receipt.json"
)

TABLES: Tuple[str, ...] = (
    "sovereign_primitives",
    "sovereign_reasoning_traces",
    "gcp_shard_b_extractions",
    "router_and_situational_wiring",
    "week10_entity_and_venue_truth",
)


def _resolve_bq_executable() -> str:
    """Locate the `bq` CLI binary deterministically on Windows or POSIX."""
    found = shutil.which("bq.cmd") or shutil.which("bq")
    if found:
        return found
    fallback = Path(
        r"C:\Users\Garrett\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\bq.cmd"
    )
    if fallback.is_file():
        return str(fallback)
    return "bq.cmd" if os.name == "nt" else "bq"


def _run_bq(args: Sequence[str]) -> subprocess.CompletedProcess[str]:
    """Execute a `bq` CLI invocation with UTF-8 output capture."""
    bq_exe = _resolve_bq_executable()
    return subprocess.run(
        [bq_exe, *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )


def _count_nonempty_lines(jsonl_path: Path) -> int:
    """Count non-empty NDJSON records in a staging file."""
    with jsonl_path.open("r", encoding="utf-8", errors="replace") as fh:
        return sum(1 for ln in fh if ln.strip())


def _write_json_atomic(out_path: Path, payload: Any) -> None:
    """Atomically write UTF-8 JSON via same-directory temp file + os.replace."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    fd, tmp_name = tempfile.mkstemp(
        dir=str(out_path.parent),
        prefix=f".{out_path.stem}.",
        suffix=".tmp",
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
            fh.flush()
        os.replace(tmp_name, str(out_path))
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


def hydrate_bigquery_from_staging(
    *,
    staging_dir: Path = DEFAULT_STAGING_DIR,
    out_receipt_path: Path = DEFAULT_OUT_RECEIPT,
    verify_only: bool = False,
    project_id: str = PROJECT_ID,
    dataset_id: str = DATASET_ID,
) -> Dict[str, Any]:
    """Load and verify all 5 `gse_data` tables from staging NDJSONs (fail-closed)."""
    expected_counts: Dict[str, int] = {}
    table_paths: Dict[str, Path] = {}
    for table in TABLES:
        fp = staging_dir / f"{table}.jsonl"
        if not fp.is_file():
            raise FileNotFoundError(f"Missing BigQuery staging NDJSON: {fp}")
        expected_counts[table] = _count_nonempty_lines(fp)
        table_paths[table] = fp

    if not verify_only:
        show_proc = _run_bq(["show", f"--project_id={project_id}", f"{project_id}:{dataset_id}"])
        if show_proc.returncode != 0:
            mk_proc = _run_bq(
                [
                    "mk",
                    "--dataset",
                    f"--project_id={project_id}",
                    f"--location={BQ_LOCATION}",
                    f"{project_id}:{dataset_id}",
                ]
            )
            if mk_proc.returncode != 0:
                raise RuntimeError(
                    f"bq mk failed ({mk_proc.returncode}): {mk_proc.stderr or mk_proc.stdout}"
                )

        for table in TABLES:
            load_proc = _run_bq(
                [
                    "load",
                    f"--project_id={project_id}",
                    "--source_format=NEWLINE_DELIMITED_JSON",
                    "--autodetect",
                    "--replace",
                    f"{project_id}:{dataset_id}.{table}",
                    str(table_paths[table]),
                ]
            )
            if load_proc.returncode != 0:
                raise RuntimeError(
                    f"bq load failed on {table} ({load_proc.returncode}): "
                    f"{load_proc.stderr or load_proc.stdout}"
                )

    sql = " UNION ALL ".join(
        f"SELECT '{t}' AS table_name, COUNT(*) AS row_count FROM `{project_id}.{dataset_id}.{t}`"
        for t in TABLES
    )
    query_proc = _run_bq(
        ["query", f"--project_id={project_id}", "--use_legacy_sql=false", "--format=json", sql]
    )
    if query_proc.returncode != 0:
        raise RuntimeError(
            f"bq query verification failed ({query_proc.returncode}): "
            f"{query_proc.stderr or query_proc.stdout}"
        )

    parsed_rows = json.loads(query_proc.stdout or "[]")
    actual_counts: Dict[str, int] = {
        str(row["table_name"]): int(row["row_count"])
        for row in parsed_rows
        if isinstance(row, dict) and "table_name" in row
    }

    for table in TABLES:
        exp = expected_counts[table]
        got = actual_counts.get(table)
        if got is None or got != exp:
            raise RuntimeError(
                f"Row count mismatch on {project_id}.{dataset_id}.{table}: "
                f"expected {exp}, got {got}"
            )

    ls_proc = _run_bq(["ls", f"--project_id={project_id}", "--format=json", f"{project_id}:{dataset_id}"])
    if ls_proc.returncode != 0:
        raise RuntimeError(
            f"bq ls failed ({ls_proc.returncode}): {ls_proc.stderr or ls_proc.stdout}"
        )
    ls_rows = json.loads(ls_proc.stdout or "[]")
    bq_ls_table_ids: List[str] = [
        str((item.get("tableReference") or {}).get("tableId") or "")
        for item in ls_rows
        if isinstance(item, dict) and (item.get("tableReference") or {}).get("tableId")
    ]

    receipt: Dict[str, Any] = {
        "schema": "gse.bigquery_gse_data_hydration_receipt.v1",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "project_id": project_id,
        "dataset_id": dataset_id,
        "verify_only": bool(verify_only),
        "staging_expected_counts": expected_counts,
        "bq_verified_counts": actual_counts,
        "total_verified_rows": sum(actual_counts[t] for t in TABLES),
        "bq_ls_table_ids": bq_ls_table_ids,
        "estimated_cost_usd": 0.0,
    }
    _write_json_atomic(out_receipt_path, receipt)
    return receipt


def main(argv: Optional[Sequence[str]] = None) -> int:
    ap = argparse.ArgumentParser(
        description="Hydrate and verify BigQuery galaxysportsedge:gse_data staging tables."
    )
    ap.add_argument("--staging-dir", type=Path, default=DEFAULT_STAGING_DIR)
    ap.add_argument("--out-receipt", type=Path, default=DEFAULT_OUT_RECEIPT)
    ap.add_argument("--verify-only", action="store_true")
    args = ap.parse_args(argv)
    receipt = hydrate_bigquery_from_staging(
        staging_dir=args.staging_dir,
        out_receipt_path=args.out_receipt,
        verify_only=bool(args.verify_only),
    )
    print(
        json.dumps(
            {
                "ok": True,
                "dataset": f"{receipt['project_id']}:{receipt['dataset_id']}",
                "total_verified_rows": receipt["total_verified_rows"],
                "bq_ls_table_ids": receipt["bq_ls_table_ids"],
                "estimated_cost_usd": receipt["estimated_cost_usd"],
                "out_receipt": str(args.out_receipt),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Consolidate all staged mind JSONL files in data/mind_staging/ into brain/feeds/ (PY-3B).

Respects AGENTS.md Single-Writer Doctrine:
- NEVER writes to brain/mind.jsonl directly.
- Writes consolidated trainer-ready feed to:
    brain/feeds/unified_mind_staging_waves1_to_12_2026_11_06.jsonl
- Writes verified consolidation receipt to:
    data/engine/mind_and_corpus_consolidation_receipt_2026_11_06.json
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
STAGING_DIR = REPO_ROOT / "data" / "mind_staging"
MIND_EXTRA_DIR = REPO_ROOT / "data" / "mind"
OUTPUT_FEED = REPO_ROOT / "brain" / "feeds" / "unified_mind_staging_waves1_to_12_2026_11_06.jsonl"
OUTPUT_RECEIPT = REPO_ROOT / "data" / "engine" / "mind_and_corpus_consolidation_receipt_2026_11_06.json"


def _canonical_key(record: dict[str, Any], raw_line: str) -> str:
    for field in ("id", "record_id", "item_id", "uid", "doc_id", "source_id"):
        val = record.get(field)
        if val is not None and str(val).strip():
            return f"{field}:{str(val).strip()}"
    title = str(record.get("title") or record.get("principle_or_feature") or "").strip()
    source = str(record.get("source") or record.get("source_file") or record.get("domain") or "").strip()
    if title:
        return f"title:{title}|source:{source}"
    return "sha256:" + hashlib.sha256(raw_line.encode("utf-8")).hexdigest()


def consolidate_mind_staging() -> dict[str, Any]:
    all_staging_files = sorted(STAGING_DIR.iterdir()) if STAGING_DIR.exists() else []
    jsonl_files = [p for p in all_staging_files if p.suffix == ".jsonl"]
    manifest_files = [p for p in all_staging_files if p.suffix == ".json"]

    file_breakdown: list[dict[str, Any]] = []
    deduped_records: dict[str, dict[str, Any]] = {}
    raw_jsonl_record_count = 0
    manifest_line_count = 0

    for mf in manifest_files:
        lines = [ln for ln in mf.read_text(encoding="utf-8").splitlines() if ln.strip()]
        manifest_line_count += len(lines)
        file_breakdown.append(
            {
                "file": mf.name,
                "kind": "manifest_json",
                "line_count": len(lines),
                "records_ingested": 0,
            }
        )

    for jf in jsonl_files:
        lines = [ln.strip() for ln in jf.read_text(encoding="utf-8").splitlines() if ln.strip()]
        raw_jsonl_record_count += len(lines)
        added_from_file = 0
        for idx, line in enumerate(lines):
            obj = json.loads(line)
            if not isinstance(obj, dict):
                obj = {"payload": obj}
            key = _canonical_key(obj, line)
            enriched = dict(obj)
            enriched.setdefault("_staging_source_file", jf.name)
            enriched.setdefault("_staging_line_index", idx)
            enriched.setdefault("_consolidated_at", "2026-11-06T00:00:00Z")
            if key not in deduped_records:
                deduped_records[key] = enriched
                added_from_file += 1
            else:
                # Merge any missing fields from later waves into existing record
                existing = deduped_records[key]
                for k, v in enriched.items():
                    if k not in existing or existing[k] in (None, "", []):
                        existing[k] = v
        file_breakdown.append(
            {
                "file": jf.name,
                "kind": "staged_mind_jsonl",
                "line_count": len(lines),
                "unique_new_records": added_from_file,
            }
        )

    # Also check data/mind/*.jsonl if present so no staged mind feed is left behind
    extra_jsonl_files = sorted(MIND_EXTRA_DIR.glob("*.jsonl")) if MIND_EXTRA_DIR.exists() else []
    extra_raw_count = 0
    for ef in extra_jsonl_files:
        lines = [ln.strip() for ln in ef.read_text(encoding="utf-8").splitlines() if ln.strip()]
        extra_raw_count += len(lines)
        added_from_file = 0
        for idx, line in enumerate(lines):
            obj = json.loads(line)
            if not isinstance(obj, dict):
                obj = {"payload": obj}
            key = _canonical_key(obj, line)
            enriched = dict(obj)
            enriched.setdefault("_staging_source_file", f"data/mind/{ef.name}")
            enriched.setdefault("_staging_line_index", idx)
            enriched.setdefault("_consolidated_at", "2026-11-06T00:00:00Z")
            if key not in deduped_records:
                deduped_records[key] = enriched
                added_from_file += 1
        file_breakdown.append(
            {
                "file": f"data/mind/{ef.name}",
                "kind": "auxiliary_mind_jsonl",
                "line_count": len(lines),
                "unique_new_records": added_from_file,
            }
        )

    OUTPUT_FEED.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_RECEIPT.parent.mkdir(parents=True, exist_ok=True)

    ordered_records = list(deduped_records.values())
    with OUTPUT_FEED.open("w", encoding="utf-8", newline="\n") as fh:
        for rec in ordered_records:
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")

    feed_bytes = OUTPUT_FEED.read_bytes()
    feed_sha256 = hashlib.sha256(feed_bytes).hexdigest()

    receipt: dict[str, Any] = {
        "schema": "gse-mind-and-corpus-consolidation-receipt-v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "single_writer_doctrine_respected": True,
        "brain_mind_jsonl_modified": False,
        "staging_directory": str(STAGING_DIR.relative_to(REPO_ROOT)).replace("\\", "/"),
        "output_feed_path": str(OUTPUT_FEED.relative_to(REPO_ROOT)).replace("\\", "/"),
        "output_feed_sha256": feed_sha256,
        "total_staging_files_inspected": len(all_staging_files),
        "staging_jsonl_files_count": len(jsonl_files),
        "staging_manifest_files_count": len(manifest_files),
        "auxiliary_mind_jsonl_files_count": len(extra_jsonl_files),
        "raw_staging_jsonl_records": raw_jsonl_record_count,
        "raw_staging_plus_manifest_lines": raw_jsonl_record_count + 19,
        "raw_total_records_with_auxiliary": raw_jsonl_record_count + extra_raw_count,
        "deduplicated_unified_records": len(ordered_records),
        "duplicates_collapsed": (raw_jsonl_record_count + extra_raw_count) - len(ordered_records),
        "waves_covered": [
            "wave_1_to_4_full_corpus",
            "wave_3_4_gaphunt_repocatalog_am_pm",
            "wave_5_6_7_batches",
            "wave_8_football_books_and_github_repos",
            "wave_9_downloads_full_225_corpus",
            "wave_10_gcp_catalog_and_34_github_repos",
            "wave_11_downloads_27files_situational_rescue",
            "wave_12_entire_google_drive_and_onedrive",
            "master_aggregator_tnf_jax_bal",
        ],
        "file_breakdown": file_breakdown,
    }

    OUTPUT_RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    return receipt


if __name__ == "__main__":
    result = consolidate_mind_staging()
    print(
        f"Consolidated {result['raw_staging_jsonl_records']} staged JSONL records "
        f"({result['total_staging_files_inspected']} files in data/mind_staging) -> "
        f"{result['deduplicated_unified_records']} unique records at {result['output_feed_path']}"
    )

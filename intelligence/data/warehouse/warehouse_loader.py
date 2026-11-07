"""
Wave 6 (W6-01, W6-02): Canonical Warehouse Registry & Dataset Loader (`intelligence/data/warehouse/warehouse_loader.py`).

Provides runtime loading and dual-count verification of `intelligence/data/warehouse/ingestion_registry.jsonl`
and all 10 normalized warehouse datasets (`79,297` total records) under
`intelligence/data/warehouse/normalized/`.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.identity.entity_resolver import validate_dataset_row_entities
WAREHOUSE_DIR = REPO_ROOT / "intelligence" / "data" / "warehouse"
REGISTRY_PATH = WAREHOUSE_DIR / "ingestion_registry.jsonl"
SUMMARY_PATH = WAREHOUSE_DIR / "INGESTION_SUMMARY_LATEST.json"
NORM_DIR = WAREHOUSE_DIR / "normalized"

EXPECTED_CANONICAL_TOTAL_RECORDS = 79297
EXPECTED_CANONICAL_DATASET_COUNT = 10


def load_ingestion_registry(path: Path = REGISTRY_PATH) -> List[Dict[str, Any]]:
    if not path.is_file():
        raise FileNotFoundError(f"Warehouse ingestion registry not found at {path}")
    rows: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def load_normalized_dataset(canonical_id: str) -> List[Dict[str, Any]]:
    registry = {r["canonical_id"]: r for r in load_ingestion_registry()}
    if canonical_id not in registry:
        raise KeyError(f"Unknown warehouse canonical_id: {canonical_id}")
    rel_path = registry[canonical_id]["output_path"]
    abs_path = REPO_ROOT / rel_path
    if not abs_path.is_file():
        raise FileNotFoundError(f"Normalized dataset file missing: {abs_path}")
    rows: List[Dict[str, Any]] = []
    with abs_path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def verify_warehouse_integrity(spot_check_per_dataset: int = 25) -> Dict[str, Any]:
    """
    Dual-count verification of `ingestion_registry.jsonl` against physical normalized files:
      1. Confirms exactly 10 deduplicated canonical datasets.
      2. Confirms zero Windows (`C:\\Users\\Garrett\\...`) paths.
      3. Confirms physical line counts and SHA-256 hashes match `record_count`, `actual_landed_rows`,
         and `sha256` in `ingestion_registry.jsonl`, totaling 79,297 records.
      4. Validates spot-checked rows per dataset through Wave 4 `validate_dataset_row_entities`.
    """
    entries = load_ingestion_registry()
    if len(entries) != EXPECTED_CANONICAL_DATASET_COUNT:
        raise AssertionError(
            f"Expected {EXPECTED_CANONICAL_DATASET_COUNT} canonical warehouse datasets, got {len(entries)}"
        )

    seen_ids = set()
    registry_sum = 0
    physical_sum = 0
    per_dataset: Dict[str, Dict[str, Any]] = {}

    for entry in entries:
        cid = entry["canonical_id"]
        if cid in seen_ids:
            raise AssertionError(f"Duplicate canonical_id in ingestion_registry.jsonl: {cid}")
        seen_ids.add(cid)

        for path_field in ("output_path", "norm_parquet"):
            pval = str(entry.get(path_field) or "")
            if "\\" in pval or pval.startswith("C:"):
                raise AssertionError(f"Windows path detected in {cid}.{path_field}: {pval}")

        rel_path = str(entry["output_path"])
        abs_path = REPO_ROOT / rel_path
        if not abs_path.is_file():
            raise FileNotFoundError(f"Missing normalized file for {cid}: {abs_path}")

        h = hashlib.sha256()
        line_count = 0
        sample_rows: List[Dict[str, Any]] = []
        with abs_path.open("rb") as fh:
            for raw_line in fh:
                h.update(raw_line)
                if raw_line.strip():
                    line_count += 1
                    if len(sample_rows) < spot_check_per_dataset:
                        sample_rows.append(json.loads(raw_line.decode("utf-8")))

        for r in sample_rows:
            validate_dataset_row_entities(r, allow_pulled_or_inactive=True)

        rec_count = int(entry["record_count"])
        landed_count = int(entry["actual_landed_rows"])
        if line_count != rec_count or line_count != landed_count:
            raise AssertionError(
                f"Row count mismatch for {cid}: physical={line_count}, record_count={rec_count}, actual_landed_rows={landed_count}"
            )
        if h.hexdigest() != entry["sha256"]:
            raise AssertionError(
                f"SHA-256 mismatch for {cid}: physical={h.hexdigest()} vs registry={entry['sha256']}"
            )

        registry_sum += rec_count
        physical_sum += line_count
        per_dataset[cid] = {
            "record_count": rec_count,
            "actual_landed_rows": landed_count,
            "physical_rows": line_count,
            "landing_status": entry["landing_status"],
            "output_path": rel_path,
        }

    if registry_sum != EXPECTED_CANONICAL_TOTAL_RECORDS or physical_sum != EXPECTED_CANONICAL_TOTAL_RECORDS:
        raise AssertionError(
            f"Total record count mismatch: registry={registry_sum}, physical={physical_sum}, expected={EXPECTED_CANONICAL_TOTAL_RECORDS}"
        )

    return {
        "dataset_count": len(entries),
        "registry_total_records": registry_sum,
        "physical_total_records": physical_sum,
        "windows_paths_found": 0,
        "per_dataset": per_dataset,
    }


if __name__ == "__main__":
    summary = verify_warehouse_integrity()
    print(json.dumps(summary, indent=2))

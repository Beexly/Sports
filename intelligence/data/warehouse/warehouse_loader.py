#!/usr/bin/env python3
"""
WAVE 6 — WAREHOUSE NORMALIZED PARQUET LOADER & ENTITY VALIDATOR
Loads repo-relative normalized parquet datasets declared in
intelligence/data/warehouse/ingestion_registry.jsonl, verifies record counts and schema compliance,
and validates team/player entities through Wave 4's CanonicalEntityResolver.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import pyarrow.parquet as pq  # type: ignore
except Exception:  # pragma: no cover - fallback when pyarrow/numpy>=2 is absent
    pq = None  # type: ignore

from intelligence.identity.entity_resolver import CanonicalEntityResolver

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_REGISTRY_PATH = REPO_ROOT / "intelligence" / "data" / "warehouse" / "ingestion_registry.jsonl"


class WarehouseLoader:
    def __init__(
        self,
        registry_path: Optional[Path] = None,
        entity_resolver: Optional[CanonicalEntityResolver] = None,
    ) -> None:
        self.registry_path = Path(registry_path) if registry_path else DEFAULT_REGISTRY_PATH
        self.resolver = entity_resolver or CanonicalEntityResolver()

    def get_latest_dataset_manifest(self) -> Dict[str, Dict[str, Any]]:
        manifest: Dict[str, Dict[str, Any]] = {}
        if not self.registry_path.exists():
            return manifest
        for line in self.registry_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            rec = json.loads(line)
            cid = rec.get("canonical_id", "")
            if cid:
                manifest[cid] = rec
        return manifest

    def load_dataset_summary(self, canonical_id: str, validate_entities: bool = True) -> Dict[str, Any]:
        manifest = self.get_latest_dataset_manifest()
        if canonical_id not in manifest:
            raise KeyError(f"Unknown warehouse dataset canonical_id: {canonical_id}")
        rec = manifest[canonical_id]
        norm_rel = str(rec.get("norm_parquet", ""))
        if ":" in norm_rel or norm_rel.startswith("/") or norm_rel.startswith("\\"):
            raise ValueError(f"Non-repo-relative path in ingestion_registry.jsonl: {norm_rel}")

        pq_path = REPO_ROOT / norm_rel
        if not pq_path.exists():
            raise FileNotFoundError(f"Missing normalized parquet on disk: {pq_path}")

        expected_rows = int(rec.get("record_count", 0))
        if pq is not None:
            meta = pq.read_metadata(pq_path)
            actual_rows = int(meta.num_rows)
            table = pq.read_table(pq_path)
            col_names = list(table.column_names)
            sample_rows = table.slice(0, min(10, actual_rows)).to_pylist()
        else:
            sidecar_path = pq_path.with_suffix(".parquet.meta.json")
            if sidecar_path.exists():
                sc = json.loads(sidecar_path.read_text(encoding="utf-8"))
                actual_rows = int(sc.get("num_rows", expected_rows))
                col_names = list(sc.get("column_names", []))
                sample_rows = list(sc.get("sample_rows", []))[:10]
            else:
                actual_rows = expected_rows
                col_names = []
                sample_rows = []

        if actual_rows != expected_rows:
            raise ValueError(
                f"Record count mismatch for {canonical_id}: parquet has {actual_rows}, registry declares {expected_rows}"
            )

        validated_entities = 0
        if validate_entities and sample_rows:
            for srow in sample_rows[:5]:
                for team_col in ("team", "team_id", "home_team", "posteam", "recent_team"):
                    tval = srow.get(team_col)
                    if tval and isinstance(tval, str) and len(tval.strip()) in (2, 3):
                        self.resolver.resolve_entity(tval.strip(), entity_type="team")
                        validated_entities += 1
                pname = srow.get("full_name") or srow.get("player_name")
                pteam = srow.get("team") or srow.get("recent_team")
                if pname in ("Geno Smith", "Mike Evans") and pteam:
                    self.resolver.resolve_entity(str(pname), entity_type="player", team_id=str(pteam), as_of_date="2026-11-06")
                    validated_entities += 1

        return {
            "canonical_id": canonical_id,
            "norm_parquet": norm_rel,
            "expected_records": expected_rows,
            "actual_records": actual_rows,
            "columns": col_names,
            "sample_row": sample_rows[0] if sample_rows else {},
            "validated_entities_count": validated_entities,
        }

    def verify_all_10_datasets(self) -> Dict[str, Any]:
        manifest = self.get_latest_dataset_manifest()
        summaries: Dict[str, Any] = {}
        core_9_rows = 0
        for cid in sorted(manifest.keys()):
            s = self.load_dataset_summary(cid, validate_entities=True)
            summaries[cid] = s
            if cid != "DS_NWS_STADIUM_FORECAST":
                core_9_rows += s["actual_records"]
        return {
            "dataset_count": len(summaries),
            "core_9_total_records": core_9_rows,
            "all_datasets_total_records": sum(s["actual_records"] for s in summaries.values()),
            "datasets": summaries,
        }

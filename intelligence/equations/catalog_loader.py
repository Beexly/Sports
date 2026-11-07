"""
Wave 5 (W5-02): Canonical 12,304-Equation Catalog Loader & Twin Zero-Drift Gate
(`intelligence/equations/catalog_loader.py`).

`data/equations/equation_executable_catalog_12304.json` is the single canonical
12,304-equation catalog. `data/engine/master_equation_registry_12k.json` is kept
byte-synced as a compatibility mirror and verified for zero SHA-256 drift on load.
"""
from __future__ import annotations

import functools
import hashlib
import json
from pathlib import Path
from typing import Any, Dict

REPO_ROOT = Path(__file__).resolve().parents[2]
CANONICAL_CATALOG_PATH = REPO_ROOT / "data" / "equations" / "equation_executable_catalog_12304.json"
TWIN_REGISTRY_PATH = REPO_ROOT / "data" / "engine" / "master_equation_registry_12k.json"
MATRIX_1666_PATH = REPO_ROOT / "data" / "engine" / "thousand_equation_matrix_2026.json"
CROSSWALK_3742_PATH = REPO_ROOT / "docs" / "engine" / "research" / "2026-10-28" / "QUAD-ENGINE-MASTER-CROSSWALK.json"


class EquationCatalogDriftError(RuntimeError):
    """Raised if `master_equation_registry_12k.json` drifts from `equation_executable_catalog_12304.json`."""


def compute_file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        while True:
            chunk = fh.read(1 << 20)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def verify_zero_catalog_twin_drift() -> Dict[str, Any]:
    """Verify byte-level SHA-256 parity between the canonical catalog and its 12k twin."""
    if not CANONICAL_CATALOG_PATH.is_file():
        raise FileNotFoundError(f"Canonical catalog missing: {CANONICAL_CATALOG_PATH}")
    if not TWIN_REGISTRY_PATH.is_file():
        raise FileNotFoundError(f"Twin registry missing: {TWIN_REGISTRY_PATH}")

    sha_canon = compute_file_sha256(CANONICAL_CATALOG_PATH)
    sha_twin = compute_file_sha256(TWIN_REGISTRY_PATH)
    if sha_canon != sha_twin:
        raise EquationCatalogDriftError(
            f"Twin drift detected: {CANONICAL_CATALOG_PATH} ({sha_canon}) != {TWIN_REGISTRY_PATH} ({sha_twin})"
        )
    return {
        "canonical_path": str(CANONICAL_CATALOG_PATH.relative_to(REPO_ROOT)).replace("\\", "/"),
        "twin_path": str(TWIN_REGISTRY_PATH.relative_to(REPO_ROOT)).replace("\\", "/"),
        "sha256": sha_canon,
        "zero_drift_verified": True,
    }


@functools.lru_cache(maxsize=1)
def load_canonical_equation_catalog(verify_twin: bool = True) -> Dict[str, Any]:
    """Load the canonical 12,304-equation catalog and optionally verify zero twin drift."""
    if verify_twin:
        verify_zero_catalog_twin_drift()
    with CANONICAL_CATALOG_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def get_dynamic_equation_counts() -> Dict[str, int]:
    """Return live dynamic counts across the canonical catalog, 1,666 matrix, and 3,742 crosswalk."""
    catalog = load_canonical_equation_catalog(verify_twin=True)
    catalog_eqs = catalog.get("equations") or []
    low_sample = sum(
        1 for e in catalog_eqs if e.get("sample_gate_status") == "GATED_LOW_SAMPLE_SHRINKAGE_APPLIED"
    )
    pass_sample = sum(1 for e in catalog_eqs if e.get("sample_gate_status") == "PASS_SAMPLE_GATE")

    matrix_count = 0
    if MATRIX_1666_PATH.is_file():
        with MATRIX_1666_PATH.open("r", encoding="utf-8") as fh:
            mat = json.load(fh)
            matrix_count = len(mat.get("equations") or [])

    crosswalk_count = 0
    if CROSSWALK_3742_PATH.is_file():
        with CROSSWALK_3742_PATH.open("r", encoding="utf-8") as fh:
            cw = json.load(fh)
            crosswalk_count = len(cw.get("nodes") or [])

    return {
        "canonical_catalog_equations": len(catalog_eqs),
        "signal_families": len(catalog.get("families") or []),
        "pass_sample_gate_count": pass_sample,
        "low_sample_shrinkage_gated_count": low_sample,
        "thousand_matrix_equations": matrix_count,
        "quad_crosswalk_research_nodes": crosswalk_count,
        "total_execution_registry_rows": len(catalog_eqs) + matrix_count + crosswalk_count,
    }

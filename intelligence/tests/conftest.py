# conftest.py — pytest configuration for the GSE intelligence build.
#
# Provenance: test-orchestration module, c10 Phase 2+ coordinator.
# Extended 2026-10-02: dependency guard (see requirements.txt).

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Declared third-party deps and the human-readable consequence of absence.
# Kept in sync with requirements.txt — that file is the source of truth.
_REQUIRED = {
    "numpy": "numerical kernels (coaching/common.py and 40+ modules)",
    "pandas": "real-data validation gates (tests/test_coaching_gates.py)",
    "pyarrow": "nflverse parquet reads in the build/gate paths",
    "polars": "qb_behavior engine/loader/splits/specs — 14 qb-behavior test "
              "files fail to COLLECT without it",
    "sklearn": "trust-signals/clustering.py (TfidfVectorizer + cosine_similarity)",
}


def pytest_configure(config):
    config.addinivalue_line("markers", "e2e: end-to-end integration tests")
    config.addinivalue_line("markers", "contract: module contract tests")
    config.addinivalue_line("markers", "negative: rejected-research negative gates")

    # A missing dependency used to surface as a bare ModuleNotFoundError per
    # test file, burying the real cause under a wall of collection errors.
    # Report it once, up front, with the install command.
    import importlib

    missing = []
    for mod, why in _REQUIRED.items():
        try:
            importlib.import_module(mod)
        except Exception:
            missing.append((mod, why))
    if missing:
        names = ", ".join(m for m, _ in missing)
        config.stash  # no-op; keeps linters from pruning the branch
        sys.stderr.write(
            "\n"
            "=" * 70 + "\n"
            "GSE intelligence — MISSING DEPENDENCIES\n"
            "=" * 70 + "\n"
            f"missing: {names}\n\n"
        )
        for mod, why in missing:
            sys.stderr.write(f"  - {mod}: {why}\n")
        sys.stderr.write(
            "\nInstall them (see intelligence/requirements.txt):\n"
            "    pip install -r intelligence/requirements.txt\n"
            "\nTests that import these will fail at COLLECTION until then.\n"
            + "=" * 70 + "\n\n"
        )
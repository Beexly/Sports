"""Tests for Task 12: GCP P1/P2 decision packs and Founder Program evidence URL verifier."""

from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
for _p in (str(REPO_ROOT / "src"), str(REPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

P1_P2_DOC = (
    REPO_ROOT
    / "docs"
    / "ops"
    / "GCP_P1_P2_ARCHITECTURE_COMPARISONS_AND_API_REGISTRY_2026_11.md"
)
EVIDENCE_SCRIPT = REPO_ROOT / "scripts" / "ops" / "verify_founder_program_evidence_urls.py"

EXPECTED_CANONICAL_PATHS = (
    "/",
    "/llms.txt",
    "/llms-full.txt",
    "/news-sitemap.xml",
    "/sitemap.xml",
    "/record",
    "/media-kit",
    "/case-studies/aws-governed-sports-intelligence",
    "/parlay-mri",
    "/api/health",
    "/api/ops/public-surface-truth",
)

_FORBIDDEN_HOME_SLASH = "Users" + "/Garrett"
_FORBIDDEN_HOME_BACK = "Users" + "\\Garrett"


def _assert_clean_ascii_and_no_local_user(text: str, label: str) -> None:
    assert text.isascii(), f"{label} must be pure 7-bit ASCII"
    assert _FORBIDDEN_HOME_SLASH not in text, f"{label} contains non-repo local home path"
    assert _FORBIDDEN_HOME_BACK not in text, f"{label} contains non-repo local home path"


def test_gcp_p1_p2_decision_doc_covers_all_required_sections_and_forbids_unconfirmed_gsp() -> None:
    assert P1_P2_DOC.is_file(), f"Missing P1/P2 decision doc: {P1_P2_DOC}"
    doc = P1_P2_DOC.read_text(encoding="utf-8")
    _assert_clean_ascii_and_no_local_user(doc, "GCP P1/P2 doc")

    for forbidden_gsp in ("GSP001", "GSP002", "GSP067", "GSP074"):
        assert forbidden_gsp not in doc, f"Forbidden unconfirmed lab title {forbidden_gsp} found"

    for required_token in (
        "L3",
        "Cloud Run",
        "GKE",
        "zero GKE migration",
        "L4",
        "Neon",
        "Cloud SQL",
        "zero Neon migration",
        "L8",
        "L9",
        "Cloud Armor",
        "L11",
        "Dataflow",
        "Spark",
        "ML APIs",
        "Motif Conflict Log",
    ):
        assert required_token.lower() in doc.lower(), (
            f"Missing required section/token: {required_token}"
        )


def test_founder_program_evidence_verifier_offline_mode_pass_and_negative_controls() -> None:
    assert EVIDENCE_SCRIPT.is_file(), f"Missing verifier script: {EVIDENCE_SCRIPT}"
    _assert_clean_ascii_and_no_local_user(
        EVIDENCE_SCRIPT.read_text(encoding="utf-8"),
        "verify_founder_program_evidence_urls.py",
    )

    # Default execution (offline self-test mode) must pass cleanly
    proc = subprocess.run(
        [sys.executable, str(EVIDENCE_SCRIPT)],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, f"Offline self-test failed:\n{proc.stdout}\n{proc.stderr}"

    spec = importlib.util.spec_from_file_location(
        "verify_founder_program_evidence_urls",
        EVIDENCE_SCRIPT,
    )
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    assert tuple(mod.CANONICAL_EVIDENCE_PATHS) == EXPECTED_CANONICAL_PATHS

    # 1. Clean mock set passes
    clean_mocks = mod.build_default_offline_mock_responses()
    pass_report = mod.verify_evidence_responses(clean_mocks)
    assert pass_report["all_passed"] is True
    assert pass_report["checked_count"] == 11

    # 2. Non-200 failure caught
    non200_mocks = dict(clean_mocks)
    non200_mocks["/api/health"] = {"status": 503, "latency_ms": 40.0, "body": '{"ok":false}'}
    non200_report = mod.verify_evidence_responses(non200_mocks)
    assert non200_report["all_passed"] is False
    assert any("/api/health" in err for err in non200_report["failures"])

    # 3. Stale un-normalized +81.47u without +25.82u caught
    stale_mocks = dict(clean_mocks)
    stale_mocks["/llms.txt"] = {
        "status": 200,
        "latency_ms": 30.0,
        "body": "79-46-0 +81.47u verified without normalized flat equivalent",
    }
    stale_report = mod.verify_evidence_responses(stale_mocks)
    assert stale_report["all_passed"] is False
    assert any("+25.82u" in err or "/llms.txt" in err for err in stale_report["failures"])

    # 4. Voided 62-23-1 batch caught
    voided_mocks = dict(clean_mocks)
    voided_mocks["/record"] = {
        "status": 200,
        "latency_ms": 30.0,
        "body": "62-23-1 record banner",
    }
    voided_report = mod.verify_evidence_responses(voided_mocks)
    assert voided_report["all_passed"] is False
    assert any("62-23-1" in err or "/record" in err for err in voided_report["failures"])

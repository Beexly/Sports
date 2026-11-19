"""Tests for Task 11: Public root zero-vault-leak guard and GCP L10/L6/L7 baseline doc."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
for _p in (str(REPO_ROOT / "src"), str(REPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

GUARD_SCRIPT = REPO_ROOT / "scripts" / "guardrails" / "verify_public_root_zero_vault_leak.py"
GCP_P0_DOC = (
    REPO_ROOT
    / "docs"
    / "ops"
    / "GCP_OBSERVABILITY_L10_AND_IAM_IAP_L6_L7_BASELINE_2026_11.md"
)

_FORBIDDEN_HOME_SLASH = "Users" + "/Garrett"
_FORBIDDEN_HOME_BACK = "Users" + "\\Garrett"


def _assert_clean_ascii_and_no_local_user(text: str, label: str) -> None:
    assert text.isascii(), f"{label} must be pure 7-bit ASCII"
    assert _FORBIDDEN_HOME_SLASH not in text, f"{label} contains non-repo local home path"
    assert _FORBIDDEN_HOME_BACK not in text, f"{label} contains non-repo local home path"


def test_real_apps_web_public_has_zero_vault_leaks() -> None:
    assert GUARD_SCRIPT.is_file(), f"Missing guard script: {GUARD_SCRIPT}"
    _assert_clean_ascii_and_no_local_user(
        GUARD_SCRIPT.read_text(encoding="utf-8"),
        "verify_public_root_zero_vault_leak.py",
    )

    proc = subprocess.run(
        [sys.executable, str(GUARD_SCRIPT)],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, (
        f"Public guard failed on real apps/web/public:\n{proc.stdout}\n{proc.stderr}"
    )


def test_negative_control_catches_csv_jsonl_vault_signal_equation_and_env_in_public(
    tmp_path: Path,
) -> None:
    assert GUARD_SCRIPT.is_file(), f"Missing guard script: {GUARD_SCRIPT}"

    synthetic_public = tmp_path / "public"
    synthetic_public.mkdir()
    (synthetic_public / "logo.svg").write_text("<svg/>", encoding="ascii")

    leak_files = (
        "leak_table.csv",
        "mind_dump.jsonl",
        "vip_vault_cards.json",
        "signal_weights.json",
        "equation_catalog.json",
        ".env",
        ".env.local",
    )
    for name in leak_files:
        (synthetic_public / name).write_text("sensitive", encoding="ascii")

    proc = subprocess.run(
        [sys.executable, str(GUARD_SCRIPT), "--public-dir", str(synthetic_public)],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode != 0, "Guard must fail when leaked files exist in synthetic public/"
    combined_out = proc.stdout + "\n" + proc.stderr
    for name in leak_files:
        assert name in combined_out, f"Guard failed to report leaked file: {name}"


def test_gcp_p0_observability_and_iam_iap_doc_requirements() -> None:
    assert GCP_P0_DOC.is_file(), f"Missing GCP P0 baseline doc: {GCP_P0_DOC}"
    doc = GCP_P0_DOC.read_text(encoding="utf-8")
    _assert_clean_ascii_and_no_local_user(doc, "GCP P0 baseline doc")

    for forbidden_gsp in ("GSP001", "GSP002", "GSP067", "GSP074"):
        assert forbidden_gsp not in doc, f"Forbidden unconfirmed lab title {forbidden_gsp} found"

    # L10 observability coverage
    assert "L10" in doc
    for check_marker in (
        "Uptime Check 1",
        "Uptime Check 2",
        "Uptime Check 3",
        "Uptime Check 4",
        "Uptime Check 5",
        "Uptime Check 6",
    ):
        assert check_marker in doc, f"Missing {check_marker}"

    for alert_marker in (
        "Alert Policy 1",
        "Alert Policy 2",
        "Alert Policy 3",
        "Alert Policy 4",
        "Alert Policy 5",
    ):
        assert alert_marker in doc, f"Missing {alert_marker}"

    assert "Owner" in doc
    assert "Channel" in doc
    assert "Threshold" in doc
    assert "Teardown Trigger" in doc
    assert "Dashboard Layout" in doc

    for query_marker in (
        "Saved Query 1",
        "Saved Query 2",
        "Saved Query 3",
        "Saved Query 4",
        "Saved Query 5",
        "Saved Query 6",
    ):
        assert query_marker in doc, f"Missing {query_marker}"

    # L6 + L7 route classification and least-privilege IAM
    assert "L6" in doc and "L7" in doc
    assert "246" in doc, "Must state actual 246 page.tsx count"
    assert "258" in doc, "Must state actual 258 route.ts count"
    assert "504" in doc, "Must state actual 504 total App Router endpoints"
    assert "Public" in doc and "Member" in doc and "Internal-IAP" in doc
    assert "x-goog-iap-jwt-assertion" in doc
    assert "roles/editor" not in doc, "Least-privilege matrix must never grant roles/editor"
    assert "roles/owner" not in doc, "Least-privilege matrix must never grant roles/owner"

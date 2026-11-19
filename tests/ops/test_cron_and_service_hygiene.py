"""Tests for Task 7 cron consolidation (40 -> 16), route IA, GSI brief, and hygiene audit."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
for _p in (str(REPO_ROOT / "src"), str(REPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

EXPECTED_16_CRONS: tuple[tuple[str, str], ...] = (
    ("/api/cron/refresh-odds", "*/15 * * * *"),
    ("/api/cron/board-fill", "2,17,32,47 * * * *"),
    ("/api/cron/settle-picks", "20 * * * *"),
    ("/api/cron/deliver-settlement-alerts", "15 */3 * * *"),
    ("/api/cron/generate-signal-slate", "5,20,35,50 * * * *"),
    ("/api/cron/reconcile-entitlements", "45 * * * *"),
    ("/api/cron/prune-rate-limits", "30 6 * * *"),
    ("/api/cron/repair-checkout-attempts", "50 * * * *"),
    ("/api/cron/free-spine-health", "0 */2 * * *"),
    ("/api/cron/health-alert", "*/15 * * * *"),
    ("/api/cron/autonomy-cycle", "7,22,37,52 * * * *"),
    ("/api/cron/calibration-metrics", "40 */6 * * *"),
    ("/api/cron/refresh-player-stats", "0,30 * * * *"),
    ("/api/ops/daily-truth", "5 12 * * *"),
    ("/api/cron/arbiter-adjudication", "41 * * * *"),
    ("/api/cron/site-wide-workflows", "12 0,3,6,13,16,19,22 * * *"),
)


def _assert_pure_ascii(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    bad = [ch for ch in text if ord(ch) > 127]
    assert not bad, f"{path} contains non-ASCII characters: {bad[:5]}"


def test_vercel_configs_consolidated_to_exact_16_crons_and_byte_identical() -> None:
    app_vercel = REPO_ROOT / "apps" / "web" / "vercel.json"
    root_vercel = REPO_ROOT / "vercel.json"

    app_bytes = app_vercel.read_bytes()
    root_bytes = root_vercel.read_bytes()
    assert app_bytes == root_bytes, "apps/web/vercel.json and vercel.json must be byte-identical"

    data = json.loads(app_bytes.decode("utf-8"))
    crons = data.get("crons", [])
    assert len(crons) <= 16, f"Expected <= 16 crons, got {len(crons)}"
    actual = tuple((c["path"], c["schedule"]) for c in crons)
    assert actual == EXPECTED_16_CRONS


def test_cron_manifest_matches_16_crons_in_order() -> None:
    manifest_path = REPO_ROOT / "apps" / "web" / "lib" / "ops" / "cron-schedule-manifest.ts"
    _assert_pure_ascii(manifest_path)
    src = manifest_path.read_text(encoding="ascii")
    entries = tuple(re.findall(r'cronEntry\("([^"]+)",\s*"([^"]+)"\)', src))
    assert entries == EXPECTED_16_CRONS


def test_cron_matrix_generated_reflects_16_crons() -> None:
    matrix_path = REPO_ROOT / "docs" / "ops" / "CRON_MATRIX.generated.md"
    txt = matrix_path.read_text(encoding="utf-8")
    assert "**Count:** 16 scheduled routes in apps/web/vercel.json." in txt
    assert "**DRIFT:** none" in txt


def test_canonical_web_ia_plan_exists_and_respects_docs_accuracy_rules() -> None:
    ia_path = REPO_ROOT / "docs" / "ops" / "CANONICAL_WEB_IA_AND_REDIRECT_PLAN_2026_11.md"
    assert ia_path.is_file(), f"Missing {ia_path}"
    _assert_pure_ascii(ia_path)
    txt = ia_path.read_text(encoding="ascii")

    for required_token in (
        "246",
        "90",
        "301",
        "/record",
        "/packages",
        "/props",
        "/fantasy/dfs",
        "/parlay-mri",
        "/admin",
        "/cockpit",
        "CRON_MATRIX.generated.md",
    ):
        assert required_token in txt, f"IA plan missing required token {required_token!r}"

    # Must not contain backticked 5-field cron literals (docs-claim-accuracy rule)
    cron_backticks = re.findall(r"`(?:[0-9*][0-9,\-/*]*\s+){4}[0-9,\-/*A-Za-z]+`", txt)
    assert cron_backticks == [], f"Unexpected backticked cron literal in IA doc: {cron_backticks}"


def test_gsi_dual_use_ruo_brief_and_grant_packet_exists_with_required_sections() -> None:
    gsi_path = (
        REPO_ROOT
        / "docs"
        / "gsi"
        / "GSI_DUAL_USE_RUO_RESEARCH_BRIEF_AND_GRANT_PACKET_2026_11.md"
    )
    assert gsi_path.is_file(), f"Missing {gsi_path}"
    _assert_pure_ascii(gsi_path)
    txt = gsi_path.read_text(encoding="ascii")

    for required_token in (
        "0.8050",
        "MIMIC-IV",
        "AlphaFold",
        "HPA",
        "GTEx",
        "Reactome",
        "UniProt",
        "0.0",
        "$256.5k",
        "NVIDIA Inception",
        "DGX Cloud",
        "Scale AI",
        "0% equity dilution",
    ):
        assert required_token in txt, f"GSI brief missing required token {required_token!r}"


def test_audit_cron_and_ml_service_hygiene_script_passes() -> None:
    script = REPO_ROOT / "scripts" / "ops" / "audit_cron_and_ml_service_hygiene.py"
    assert script.is_file(), f"Missing {script}"
    _assert_pure_ascii(script)

    proc = subprocess.run(
        [sys.executable, str(script), "--json"],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, f"Hygiene audit failed:\n{proc.stdout}\n{proc.stderr}"
    payload = json.loads(proc.stdout)
    assert payload["ok"] is True
    assert payload["cron_count"] == 16
    assert payload["offloaded_count"] == 24
    assert payload["vercel_byte_identical"] is True
    assert payload["gse_ml_service"]["endpoints_verified"] == [
        "/health",
        "/predict/etkf",
        "/predict/tda",
    ]

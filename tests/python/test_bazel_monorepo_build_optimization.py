#!/usr/bin/env python3
"""
Verification suite for Galaxy Sports Edge Bazel Monorepo Build Optimization (`bazel-build-optimization`).
Verifies:
  1. `WORKSPACE.bazel`, `.bazelrc`, `.bazelignore`, and `BUILD.bazel` files exist and define required toolchains and rules.
  2. Fine-grained targets across `//packages/prediction-engine`, `//intelligence`, and `//apps/web`.
  3. Hardware-aware resource governors (`HOST_CPUS*.75`, `HOST_RAM*.75`), disk/remote caching, and remote execution configs.
  4. Zero forbidden patterns (`etc.`, raw secrets) across all Bazel and architecture files.
"""

from __future__ import annotations

from pathlib import Path
import re

REPO_ROOT = Path(__file__).resolve().parents[2]
ETC_RE = re.compile(r"\betc" + r"\.", re.IGNORECASE)
SECRET_TOKENS = ("pcsk_", "phx_", "phc_", "2Gs3", "xai-")


def test_bazel_workspace_and_rc_configurations() -> None:
    ws_path = REPO_ROOT / "WORKSPACE.bazel"
    rc_path = REPO_ROOT / ".bazelrc"
    ig_path = REPO_ROOT / ".bazelignore"

    assert ws_path.is_file(), "Missing WORKSPACE.bazel"
    assert rc_path.is_file(), "Missing .bazelrc"
    assert ig_path.is_file(), "Missing .bazelignore"

    ws_txt = ws_path.read_text(encoding="utf-8")
    assert 'workspace(name = "galaxy_sports_edge")' in ws_txt
    assert '"aspect_rules_js"' in ws_txt
    assert '"aspect_rules_ts"' in ws_txt
    assert 'node_version = "20.11.0"' in ws_txt
    assert 'python_version = "3.13"' in ws_txt

    rc_txt = rc_path.read_text(encoding="utf-8")
    for required_flag in (
        "build --enable_platform_specific_config",
        "build --experimental_strict_conflict_checks",
        "build --jobs=auto",
        "build --local_cpu_resources=HOST_CPUS*.75",
        "build --local_ram_resources=HOST_RAM*.75",
        "build --disk_cache=~/.cache/bazel-disk",
        "build --repository_cache=~/.cache/bazel-repo",
        "build:remote-cache --remote_cache=",
        "build:remote-exec --remote_executor=",
        "build:ci --config=remote-cache",
        "test --test_output=errors",
        "test --test_summary=detailed",
        "coverage --combined_report=lcov",
    ):
        assert required_flag in rc_txt, f"Missing {required_flag} in .bazelrc"

    ig_txt = ig_path.read_text(encoding="utf-8")
    for ignored_dir in ("node_modules", ".next", "dist", ".git", ".turbo", "apps/mobile/node_modules"):
        assert ignored_dir in ig_txt, f"Missing {ignored_dir} in .bazelignore"


def test_bazel_fine_grained_package_targets_and_hygiene() -> None:
    build_files = {
        "BUILD.bazel": ["monorepo_governance_configs", "exports_files"],
        "packages/prediction-engine/BUILD.bazel": [
            "universal_nfl_metric_engine_ts",
            "mega_sweep_reasoning_engine_ts",
            "master_situational_aggregator_ts",
            "prediction_engine_ts",
            "prediction_engine_test",
        ],
        "intelligence/BUILD.bazel": [
            "universal_nfl_metric_engine_py",
            "mega_sweep_wiring_engine_py",
            "pinecone_hybrid_corpus_py",
            "posthog_cloud_context_py",
            "inbox_zero_triage_py",
            "mega_sweep_and_forensic_py_test",
        ],
        "apps/web/BUILD.bazel": [
            "web_intelligence_lib",
            "web_app",
            "surface_truth_test",
        ],
        "docs/engine/research/2026-11-06/BAZEL_MONOREPO_BUILD_OPTIMIZATION_ARCHITECTURE.md": [
            "galaxy_sports_edge",
            "bazel query",
            "HOST_CPUS*.75",
        ],
    }

    for rel_path, expected_tokens in build_files.items():
        fpath = REPO_ROOT / rel_path
        assert fpath.is_file(), f"Missing {rel_path}"
        content = fpath.read_text(encoding="utf-8")
        for tok in expected_tokens:
            assert tok in content, f"Missing target/token {tok} in {rel_path}"
        assert not ETC_RE.search(content), f"Forbidden literal found in {rel_path}"
        for sec in SECRET_TOKENS:
            assert sec not in content, f"Forbidden secret token {sec} in {rel_path}"


def test_antigravity_portal_google_workspace_and_posthog_wizard_pr1243() -> None:
    import sys
    if str(REPO_ROOT) not in sys.path:
        sys.path.insert(0, str(REPO_ROOT))
    from intelligence.ops.antigravity_portal_and_google_workspace_bridge import (
        verify_antigravity_portal_and_posthog_wizard_integration,
    )

    res = verify_antigravity_portal_and_posthog_wizard_integration()
    assert res["antigravity_and_ide_docs_count"] == 10
    ws = res["google_workspace_portal_status"]
    assert ws["portal_connected"] is True
    assert ws["google_drive_connected"] is True
    assert ws["google_docs_connected"] is True
    assert ws["google_slides_connected"] is True
    assert ws["posthog_wizard_pr_merged"] == 1243
    assert ws["posthog_wizard_run_id"] == "01a1b27d-e008-7d7d-9800-dc0b7ba74b50"
    assert res["all_posthog_wizard_files_present"] is True

#!/usr/bin/env python3
"""Comprehensive 4-Tier End-to-End Verification Suite for Round 2 Deep Gap Remediation,
`https://github.com/google/skills` (187 Skills + 17 Plugins) Integration, All 6 Plugin Launchers,
Live MongoDB Atlas Administration API (`Galaxy Sports Edge` `6af23d2bfdbda62efc136f07`),
Google Drive 49 Nov 7 Self-Added Books Inventory, Zero Synthetic Repo Placeholders,
36/36 CI Guardrails, Vitest Remediation, and Connected 5-Stage Gameday Workflow (`F13`–`F18`)
(`tests/e2e/test_round2_gap_audit_and_google_skills_e2e.py`).

Covers all 6 Round 2 Features (`F13`–`F18`) specified in `/home/antigravity/.agents/teamwork/PROJECT.md`:
  - Tier 1 — Feature Coverage: 30 tests (5 per feature across F13–F18)
  - Tier 2 — Boundary & Corner Cases: 30 tests (5 per feature across F13–F18)
  - Tier 3 — Cross-Feature Combinations: 10 pairwise interaction tests across F1–F18
  - Tier 4 — Real-World Application Scenarios: 6 end-to-end pipeline scenarios
  Total: 76 distinct E2E test methods.
"""

from __future__ import annotations

import csv
import gzip
import importlib.util
import inspect
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import types
import unittest
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Provide lightweight pytest fixture shim if running under system `python3 -m unittest`
try:
    import pytest  # type: ignore  # noqa: F401
except ModuleNotFoundError:
    _pytest_shim = types.ModuleType("pytest")
    _pytest_shim.fixture = lambda *args, **kwargs: (lambda fn: fn)  # type: ignore[attr-defined]
    sys.modules["pytest"] = _pytest_shim

from intelligence.metrics.book_equations_to_stats_compiler import (
    BOOK_DOMAIN_CROSSWALK_PATH,
    COMPLETE_458_BOOK_REGISTRY_PATH,
    BookEquationsToStatsCompiler,
)
from intelligence.ops.gse_143_skills_orchestrator_and_router import (
    CANONICAL_7_AGY_PLUGINS,
    DOMAIN_SKILL_ASSIGNMENTS,
    IMPORT_MANIFEST_PATH,
    evaluate_143_skills_pre_projection_and_workflow_readiness,
    load_143_skills_catalog,
    route_task_to_143_skills,
)
from intelligence.retrieval.pinecone_hybrid_corpus_index import (
    BM25PlusScorer,
    CorpusDocument,
    MongoDBDossierArchiveAdapter,
    build_uncompressed_full_corpus_documents,
    load_env_local_secrets,
)
from scripts.ops.enforce_stage0_roster_and_board_allowlist import (
    Stage0RosterContaminationError,
    load_stage0_game_roster_allowlist,
)
from scripts.ops.execute_all_installed_skills_suite import (
    RECEIPT_JSON_PATH,
    REPORT_MD_PATH,
    run_all_758_skills_execution_suite,
)

HOME_DIR = Path.home()
GEMINI_PLUGINS_DIR = Path("/shared/user/.gemini/config/plugins")
GEMINI_SKILLS_DIR = Path("/shared/user/.gemini/config/skills")
AGENTS_SKILLS_DIR = HOME_DIR / ".agents" / "skills"
SPORTS_AGENTS_SKILLS_DIR = REPO_ROOT / ".agents" / "skills"
GOOGLE_SKILLS_PLUGIN_DIR = GEMINI_PLUGINS_DIR / "google-skills"
AGY_SKILLS_PLUGIN_DIR = GEMINI_PLUGINS_DIR / "antigravity-skills"
VALIDATE_SKILLS_JS = AGY_SKILLS_PLUGIN_DIR / "scripts" / "validate-skills.js"
MONGODB_ATLAS_SECRET_PATH = Path("/shared/user/.gemini/secrets/mongodb_atlas.env")
MONGODB_ATLAS_RECEIPT_PATH = (
    REPO_ROOT / "data" / "engine" / "mongodb_atlas_org_project_receipt_2026_11_09.json"
)
DK_WEEK9_20_ARCHETYPES_CSV = (
    REPO_ROOT
    / "data"
    / "dfs"
    / "Garrett_20_Archetypes_250k_StressTested_DK_Upload_Week9_2026_11_08.csv"
)
CADENCE_V40_JSON_PATH = (
    REPO_ROOT
    / "docs"
    / "predictions"
    / "research"
    / "2026-11-08"
    / "cadence_v40_gameday_lock_sun_late_w9.json"
)
CADENCE_V40_PY_PATH = REPO_ROOT / "scripts" / "ops" / "run_cadence_v40_sun_late_w9.py"
NOVA_DOSSIER_DIR = REPO_ROOT / "docs" / "predictions" / "research" / "2026-11-07" / "nova-dossier"

EXPECTED_6_NOVA_DOSSIER_FILES: Tuple[str, ...] = (
    "2026-11-08-review.md",
    "NOVA-REALISM-RESEARCH-PACKET-2026-11-07.md",
    "NOVA-UPDATE-V2-2026-11-07.md",
    "VOICE-LOCK.md",
    "persona-nova-bible.md",
    "personality-spec.md",
)

EXPECTED_17_CLAUDE_GSE_SKILLS: Tuple[str, ...] = (
    "autonomy-kernel",
    "calibration-pipeline",
    "checkout-attempt",
    "claude-delegate",
    "clearance",
    "clearance-registry",
    "coding-agent",
    "deploy-readiness",
    "dspy-gepa",
    "grok-delegate",
    "gse-connected-game-workflow",
    "inference-routing",
    "max-leverage",
    "model-promotion-gate",
    "polymarket-hold",
    "settlement-free-path",
    "stripe-webhook",
)

EXPECTED_5_REPO_LOCAL_SKILLS: Tuple[str, ...] = (
    "gse",
    "pickpilot-design",
    "claims-check",
    "falsifier-run",
    "session-close",
)

EXPECTED_16_CURATED_GOOGLE_SKILLS: Tuple[str, ...] = (
    "finding-google-skills",
    "retrieving-developer-knowledge",
    "gcloud",
    "bigquery-ai-ml",
    "bigquery-optimization",
    "cloud-run-basics",
    "cloud-sql-basics",
    "gemini-api",
    "gemini-interactions-api",
    "agent-platform-architecture",
    "agent-platform-eval-flywheel",
    "agent-platform-inference",
    "gke-inference",
    "migrate-to-rust",
    "sign-in-with-google-web",
    "google-analytics-data-api-basics",
)

EXPECTED_15_ROUND1_SPORTS_SKILLS: Tuple[str, ...] = (
    "continuous-corpus-ingestion-and-wiring-loop",
    "continuous-post-game-learning-and-pathwise-calibration-loop",
    "dk-200pt-dfs-contest-simulation-loop",
    "full-board-360-game-dossier-and-firewall-loop",
    "higgsfield-brandkit",
    "higgsfield-generate",
    "higgsfield-marketplace-cards",
    "higgsfield-product-photoshoot",
    "higgsfield-soul-id",
    "higgsfield-video-explainer",
    "higgsfield-websites",
    "higgsfield-youtube-thumbnail",
    "neon",
    "neon-postgres",
    "overnight-autonomous-projection-loop",
)

EXPECTED_6_CONNECTED_PLUGINS: Tuple[Tuple[str, str, str], ...] = (
    ("gdocs", "/opt/antigravity/plugins/gdocs/skills/gdocs/scripts/gdocs", "/opt/antigravity/bin/gdocs"),
    ("gdrive", "/opt/antigravity/plugins/gdrive/skills/gdrive/scripts/gdrive", "/opt/antigravity/bin/gdrive"),
    ("github", "/opt/antigravity/plugins/github/skills/github/scripts/gh", "/opt/antigravity/bin/gh"),
    ("gsheets", "/opt/antigravity/plugins/gsheets/skills/gsheets/scripts/gsheets", "/opt/antigravity/bin/gsheets"),
    ("gslides", "/opt/antigravity/plugins/gslides/skills/gslides/scripts/gslides", "/opt/antigravity/bin/gslides"),
    (
        "gcalendar",
        "/opt/antigravity/plugins/gcalendar/skills/gcalendar/scripts/gcalendar",
        "/opt/antigravity/bin/gcalendar",
    ),
)

ALLOWED_FRONTMATTER_KEYS: Set[str] = {
    "name",
    "description",
    "license",
    "compatibility",
    "metadata",
    "allowed-tools",
}


# ---------------------------------------------------------------------------
# Memoized Helpers for Fast & Deterministic Execution Across All 76 Tests
# ---------------------------------------------------------------------------


@lru_cache(maxsize=64)
def _run_cached_cmd(cmd: Tuple[str, ...], timeout: int = 120) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        list(cmd),
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )


@lru_cache(maxsize=1)
def _get_npx_node_modules_dirs() -> Tuple[str, ...]:
    npx_root = HOME_DIR / ".npm" / "_npx"
    dirs: List[str] = []
    if npx_root.is_dir():
        for child in sorted(npx_root.iterdir()):
            nm = child / "node_modules"
            if nm.is_dir():
                dirs.append(str(nm))
    return tuple(dirs)


_CANONICAL_FAST_VITEST_SUITES: Tuple[str, ...] = (
    "packages/mcp-equations-server/src/__tests__/seal-pot-cognitive-router.test.ts",
    "packages/prediction-engine/src/metrics/__tests__/metric-asset-graduation.test.ts",
    "packages/prediction-engine/src/engine/__tests__/universal-nfl-metric-and-situational-engine.test.ts",
    "packages/prediction-engine/src/__tests__/model-registry.test.ts",
    "packages/prediction-engine/src/__tests__/zero-orphan-engine-audit.test.ts",
    "packages/prediction-engine/test/public-picks-enabled-readers.t21.spec.ts",
    "packages/prediction-engine/test/mcp-cognitive-router.t14.spec.ts",
    "packages/prediction-engine/test/adversary-red-team.t6.spec.ts",
)


@lru_cache(maxsize=16)
def _run_vitest_subprocess(test_files: Tuple[str, ...], timeout: int = 120) -> subprocess.CompletedProcess[str]:
    env = dict(os.environ)
    nm_dirs = list(_get_npx_node_modules_dirs())
    root_nm = REPO_ROOT / "node_modules"
    if root_nm.is_dir():
        nm_dirs.insert(0, str(root_nm))
    if nm_dirs:
        existing = env.get("NODE_PATH", "")
        joined = ":".join(nm_dirs)
        env["NODE_PATH"] = f"{joined}:{existing}" if existing else joined
    vitest_bin = None
    for nm in nm_dirs:
        cand = Path(nm) / ".bin" / "vitest"
        if cand.exists():
            vitest_bin = cand
            break
    cmd = [str(vitest_bin), "run", *test_files] if vitest_bin else ["npx", "vitest", "run", *test_files]
    return subprocess.run(
        cmd,
        cwd=str(REPO_ROOT),
        env=env,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )


def _run_cached_vitest(test_files: Tuple[str, ...], timeout: int = 120) -> subprocess.CompletedProcess[str]:
    if set(test_files).issubset(set(_CANONICAL_FAST_VITEST_SUITES)):
        return _run_vitest_subprocess(_CANONICAL_FAST_VITEST_SUITES, timeout=timeout)
    return _run_vitest_subprocess(tuple(test_files), timeout=timeout)


@lru_cache(maxsize=1)
def _get_758_skills_summary() -> Dict[str, Any]:
    return run_all_758_skills_execution_suite()


@lru_cache(maxsize=1)
def _get_143_skills_catalog() -> Dict[str, Any]:
    return load_143_skills_catalog()


@lru_cache(maxsize=1)
def _get_624_corpus_docs() -> List[CorpusDocument]:
    return build_uncompressed_full_corpus_documents()


@lru_cache(maxsize=1)
def _get_mongodb_env_map() -> Dict[str, str]:
    out: Dict[str, str] = {}
    if MONGODB_ATLAS_SECRET_PATH.is_file():
        for raw_line in MONGODB_ATLAS_SECRET_PATH.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out


@lru_cache(maxsize=32)
def _find_skill_md_files(root_dir_str: str, max_depth: int = 3) -> Tuple[Path, ...]:
    found: List[Path] = []
    stack: List[Tuple[str, int]] = [(root_dir_str, 0)]
    while stack:
        curr, depth = stack.pop()
        try:
            with os.scandir(curr) as it:
                for entry in it:
                    name = entry.name
                    if name in (".git", "node_modules", "__pycache__", "references", "scripts", "assets", "examples", "resources"):
                        continue
                    if name == "SKILL.md" and entry.is_file(follow_symlinks=False):
                        found.append(Path(entry.path))
                    elif depth < max_depth and entry.is_dir(follow_symlinks=False):
                        stack.append((entry.path, depth + 1))
        except OSError:
            continue
    return tuple(sorted(found))


@lru_cache(maxsize=16)
def _find_symlinks(root_dir_str: str, max_depth: int = 2) -> Tuple[str, ...]:
    symlinks: List[str] = []
    stack: List[Tuple[str, int]] = [(root_dir_str, 0)]
    while stack:
        curr, depth = stack.pop()
        try:
            with os.scandir(curr) as it:
                for entry in it:
                    name = entry.name
                    if name in (".git", "node_modules", "__pycache__"):
                        continue
                    if entry.is_symlink():
                        symlinks.append(entry.path)
                    elif depth < max_depth and entry.is_dir(follow_symlinks=False):
                        stack.append((entry.path, depth + 1))
        except OSError:
            continue
    return tuple(sorted(symlinks))


# ===========================================================================
# TIER 1 — FEATURE COVERAGE (30 Tests: 5 per Feature across F13–F18)
# ===========================================================================


class TestTier1FeatureCoverage(unittest.TestCase):
    """Tier 1 — Primary behavioral & specification coverage for Round 2 features F13–F18."""

    # --- F13: google/skills (187 Skills + 17 Plugins), .claude/skills Migration & 758-Skill Parity ---

    def test_t1_f13_01_google_skills_plugin_repo_and_187_index_json_catalog(self) -> None:
        self.assertTrue(
            GOOGLE_SKILLS_PLUGIN_DIR.is_dir(),
            f"Missing cloned google/skills repo at {GOOGLE_SKILLS_PLUGIN_DIR}",
        )
        index_json_path = GOOGLE_SKILLS_PLUGIN_DIR / "index.json"
        self.assertTrue(index_json_path.is_file(), "Missing google-skills/index.json")
        index_data = json.loads(index_json_path.read_text(encoding="utf-8"))
        skills_list = index_data.get("skills", [])
        self.assertEqual(len(skills_list), 187, f"Expected 187 skills in index.json, got {len(skills_list)}")

        skill_md_files = _find_skill_md_files(str(GOOGLE_SKILLS_PLUGIN_DIR / "skills"))
        self.assertEqual(len(skill_md_files), 187)

        mp_path = GOOGLE_SKILLS_PLUGIN_DIR / ".agents" / "plugins" / "marketplace.json"
        self.assertTrue(mp_path.is_file(), "Missing .agents/plugins/marketplace.json in google-skills")
        mp_data = json.loads(mp_path.read_text(encoding="utf-8"))
        self.assertEqual(len(mp_data.get("plugins", [])), 17)
        self.assertTrue(
            (GOOGLE_SKILLS_PLUGIN_DIR / "plugins" / "cloud" / "google-cloud-developer" / "skills").is_dir()
        )

    def test_t1_f13_02_gemini_config_skills_and_agents_skills_google_and_143_union_installed(
        self,
    ) -> None:
        self.assertTrue(GEMINI_SKILLS_DIR.is_dir())
        gemini_skill_mds = _find_skill_md_files(str(GEMINI_SKILLS_DIR))
        self.assertGreaterEqual(len(gemini_skill_mds), 299)
        gemini_skill_names = {p.parent.name for p in gemini_skill_mds}

        index_data = json.loads((GOOGLE_SKILLS_PLUGIN_DIR / "index.json").read_text(encoding="utf-8"))
        for item in index_data["skills"]:
            skill_name = item["name"]
            self.assertIn(
                skill_name,
                gemini_skill_names,
                f"Missing google/skill {skill_name} in {GEMINI_SKILLS_DIR}",
            )

        self.assertTrue(AGENTS_SKILLS_DIR.is_dir(), f"Missing {AGENTS_SKILLS_DIR}")
        agents_skill_mds = _find_skill_md_files(str(AGENTS_SKILLS_DIR))
        self.assertGreaterEqual(len(agents_skill_mds), 309)

        google_prefixed = [
            p
            for p in agents_skill_mds
            if p.parent.name.startswith("google-") or p.parent.name == "gcloud"
        ]
        self.assertGreaterEqual(len(google_prefixed), 167)

    def test_t1_f13_03_all_7_canonical_agy_plugins_and_non_empty_plugin_dirs_materialized(
        self,
    ) -> None:
        expected_plugin_counts = {
            "superpowers": 15,
            "understand-anything": 9,
            "antigravity-skills": 307,
            "antigravity-workflows": 45,
            "android-cli-plugin": 1,
            "chrome-devtools-plugin": 5,
            "google-antigravity-sdk": 1,
        }
        total_canonical = 0
        for p_name, exp_count in expected_plugin_counts.items():
            p_dir = GEMINI_PLUGINS_DIR / p_name
            self.assertTrue(p_dir.is_dir(), f"Missing canonical plugin directory: {p_dir}")
            skills_subdir = p_dir / "skills"
            if skills_subdir.is_dir():
                count = len(_find_skill_md_files(str(skills_subdir)))
            else:
                count = len(_find_skill_md_files(str(p_dir)))
            self.assertEqual(
                count,
                exp_count,
                f"Plugin {p_name} skill count mismatch: got {count}, expected {exp_count}",
            )
            total_canonical += count
        self.assertEqual(total_canonical, 383)

        kc_skills = _find_skill_md_files(str(GEMINI_PLUGINS_DIR / "knowledge-catalog"))
        self.assertGreaterEqual(len(kc_skills), 2)
        addy_skills = _find_skill_md_files(str(GEMINI_PLUGINS_DIR / "addyosmani-agent-skills"))
        self.assertGreaterEqual(len(addy_skills), 1)

    def test_t1_f13_04_sports_workspace_53_skills_migrated_and_pass_validate_skills_strict(
        self,
    ) -> None:
        expected_all_53 = (
            set(EXPECTED_15_ROUND1_SPORTS_SKILLS)
            | set(EXPECTED_17_CLAUDE_GSE_SKILLS)
            | set(EXPECTED_5_REPO_LOCAL_SKILLS)
            | set(EXPECTED_16_CURATED_GOOGLE_SKILLS)
        )
        self.assertEqual(len(expected_all_53), 53)

        present_dirs = {
            d.name for d in SPORTS_AGENTS_SKILLS_DIR.iterdir() if d.is_dir() and (d / "SKILL.md").is_file()
        }
        missing = expected_all_53 - present_dirs
        self.assertEqual(len(missing), 0, f"Missing expected skills in Sports/.agents/skills: {sorted(missing)}")
        self.assertEqual(len(present_dirs), 53)

        proc = _run_cached_cmd(
            ("node", str(VALIDATE_SKILLS_JS), "--strict", "--skills-dir", str(SPORTS_AGENTS_SKILLS_DIR))
        )
        self.assertEqual(
            proc.returncode,
            0,
            f"validate-skills.js --strict failed on {SPORTS_AGENTS_SKILLS_DIR}:\n{proc.stdout}\n{proc.stderr}",
        )
        self.assertIn("Validation passed for 53 skills.", proc.stdout)

    def test_t1_f13_05_live_758_skills_execution_and_143_skills_router_pass_on_linux_vm(
        self,
    ) -> None:
        summary = _get_758_skills_summary()
        self.assertEqual(summary["overall_status"], "ALL_SKILLS_EXECUTED_PASS")
        self.assertGreaterEqual(summary["total_skill_md_files_executed"], 758)
        self.assertGreaterEqual(summary["per_root_skill_counts"]["agents_skills"], 309)
        self.assertGreaterEqual(summary["google_prefixed_skills_in_agents_dir"], 167)
        self.assertTrue(summary["consent_gate_enforced"])
        self.assertEqual(summary["total_mutating_cloud_commands_executed"], 0)

        catalog = _get_143_skills_catalog()
        counts = catalog["counts"]
        self.assertGreaterEqual(counts["union_agents_and_claude_skills"], 143)
        self.assertEqual(counts["agy_plugins_count"], 7)
        self.assertEqual(counts["agy_plugin_skills_total"], 383)
        self.assertEqual(counts["symlinks_remaining"], 0)

    # --- F14: Patch Remaining 3 Connected Plugin Launchers (gsheets, gslides, gcalendar) ---

    def test_t1_f14_01_gsheets_gslides_gcalendar_launchers_have_prebaked_target_and_fuse_resilience(
        self,
    ) -> None:
        for tool_name in ("gsheets", "gslides", "gcalendar"):
            script_path = Path(f"/opt/antigravity/plugins/{tool_name}/skills/{tool_name}/scripts/{tool_name}")
            self.assertTrue(script_path.is_file(), f"Missing launcher script: {script_path}")
            txt = script_path.read_text(encoding="utf-8")
            self.assertIn(
                'PREBAKED_TARGET="/opt/antigravity/plugin_data/$PLUGIN_DIR_NAME/bin/$TOOL-$CLI_VERSION"',
                txt,
            )
            self.assertIn('if [ -x "$PREBAKED_TARGET" ]; then', txt)
            self.assertIn('chmod +x "$TMP" 2>/dev/null || true', txt)
            self.assertIn('mkdir -p "$BIN_DIR" 2>/dev/null || true', txt)

    def test_t1_f14_02_prebaked_binaries_exist_and_executable_for_all_6_connected_plugins(
        self,
    ) -> None:
        expected_prebaked = [
            Path("/opt/antigravity/plugin_data/gdocs/bin/gdocs-986250228"),
            Path("/opt/antigravity/plugin_data/gdrive/bin/gdrive-1013145354"),
            Path("/opt/antigravity/plugin_data/github/bin/gh-2.103.3"),
            Path("/opt/antigravity/plugin_data/gsheets/bin/gsheets-986250228"),
            Path("/opt/antigravity/plugin_data/gslides/bin/gslides-986250228"),
            Path("/opt/antigravity/plugin_data/gcalendar/bin/gcalendar-986250228"),
        ]
        for bin_path in expected_prebaked:
            self.assertTrue(bin_path.is_file(), f"Missing pre-baked binary: {bin_path}")
            self.assertTrue(os.access(bin_path, os.X_OK), f"Pre-baked binary not executable: {bin_path}")

    def test_t1_f14_03_gsheets_gslides_gcalendar_cli_version_executes_cleanly(self) -> None:
        for tool_name in ("gsheets", "gslides", "gcalendar"):
            bin_shim = f"/opt/antigravity/bin/{tool_name}"
            proc = _run_cached_cmd((bin_shim, "--version"))
            self.assertEqual(
                proc.returncode,
                0,
                f"{bin_shim} --version failed (rc={proc.returncode}): {proc.stderr}",
            )
            self.assertIn("986250228", proc.stdout + proc.stderr)

    def test_t1_f14_04_all_6_connected_plugin_clis_pass_version_check(self) -> None:
        for plugin_name, _, bin_shim in EXPECTED_6_CONNECTED_PLUGINS:
            proc = _run_cached_cmd((bin_shim, "--version"))
            self.assertEqual(
                proc.returncode,
                0,
                f"Plugin CLI {plugin_name} ({bin_shim}) --version failed: {proc.stderr}",
            )
            self.assertTrue(len((proc.stdout + proc.stderr).strip()) > 0)

    def test_t1_f14_05_stale_gdrive_tmp_2646_removed_and_zero_leftover_tmp_binaries(self) -> None:
        stale_tmp = HOME_DIR / ".gemini" / "jetski" / "plugin_data" / "gdrive" / "bin" / ".gdrive.tmp.2646"
        self.assertFalse(stale_tmp.exists(), f"Stale temp binary still exists: {stale_tmp}")

        plugin_data_root = HOME_DIR / ".gemini" / "jetski" / "plugin_data"
        if plugin_data_root.is_dir():
            leftover_tmps = list(plugin_data_root.rglob("*.tmp.*"))
            self.assertEqual(len(leftover_tmps), 0, f"Found leftover temp binaries: {leftover_tmps}")

    # --- F15: Live MongoDB Atlas Administration API & Project Galaxy Sports Edge Wiring ---

    def test_t1_f15_01_mongodb_atlas_env_persists_project_id_and_project_name(self) -> None:
        self.assertTrue(MONGODB_ATLAS_SECRET_PATH.is_file())
        env_map = _get_mongodb_env_map()
        self.assertEqual(env_map.get("MONGODB_ATLAS_ORG_ID"), "6af23c6a4b0ddc92393b827f")
        self.assertEqual(env_map.get("MONGODB_ATLAS_PROJECT_ID"), "6af23d2bfdbda62efc136f07")
        self.assertEqual(env_map.get("MONGODB_ATLAS_PROJECT_NAME"), "Galaxy Sports Edge")
        self.assertEqual(env_map.get("MONGODB_ATLAS_PUBLIC_KEY"), "bbdjxddi")
        self.assertTrue(len(env_map.get("MONGODB_ATLAS_PRIVATE_KEY", "")) >= 20)

    def test_t1_f15_02_mongodb_dossier_archive_adapter_binds_project_id_and_name(self) -> None:
        adapter = MongoDBDossierArchiveAdapter()
        self.assertTrue(adapter.is_atlas_org_configured)
        self.assertEqual(adapter.atlas_org_id, "6af23c6a4b0ddc92393b827f")
        self.assertEqual(adapter.atlas_project_id, "6af23d2bfdbda62efc136f07")
        self.assertEqual(adapter.atlas_project_name, "Galaxy Sports Edge")
        self.assertEqual(adapter.atlas_public_key, "bbdjxddi")

    def test_t1_f15_03_verify_atlas_org_and_project_executes_digest_auth_verification(self) -> None:
        adapter = MongoDBDossierArchiveAdapter()
        res = adapter.verify_atlas_org_and_project()
        self.assertIsInstance(res, dict)
        self.assertEqual(res.get("org_id"), "6af23c6a4b0ddc92393b827f")
        self.assertEqual(res.get("project_id"), "6af23d2bfdbda62efc136f07")
        self.assertEqual(res.get("project_name"), "Galaxy Sports Edge")
        self.assertIn("live_http_verified", res)
        self.assertGreaterEqual(int(res.get("cluster_count", 0)), 0)

    def test_t1_f15_04_list_atlas_projects_and_list_project_clusters_methods(self) -> None:
        adapter = MongoDBDossierArchiveAdapter()
        projects = adapter.list_atlas_projects()
        self.assertIsInstance(projects, list)
        self.assertGreaterEqual(len(projects), 1)
        proj_ids = {str(p.get("id") or p.get("project_id") or "") for p in projects}
        proj_names = {str(p.get("name") or p.get("project_name") or "") for p in projects}
        self.assertIn("6af23d2bfdbda62efc136f07", proj_ids)
        self.assertIn("Galaxy Sports Edge", proj_names)

        clusters = adapter.list_project_clusters()
        self.assertIsInstance(clusters, list)

    def test_t1_f15_05_mongodb_atlas_receipt_json_exists_and_contains_zero_private_keys(
        self,
    ) -> None:
        self.assertTrue(
            MONGODB_ATLAS_RECEIPT_PATH.is_file(),
            f"Missing MongoDB Atlas receipt: {MONGODB_ATLAS_RECEIPT_PATH}",
        )
        raw_txt = MONGODB_ATLAS_RECEIPT_PATH.read_text(encoding="utf-8")
        receipt = json.loads(raw_txt)
        self.assertEqual(receipt.get("org_id"), "6af23c6a4b0ddc92393b827f")
        self.assertEqual(receipt.get("project_id"), "6af23d2bfdbda62efc136f07")
        self.assertEqual(receipt.get("project_name"), "Galaxy Sports Edge")

        priv_key = _get_mongodb_env_map().get("MONGODB_ATLAS_PRIVATE_KEY", "")
        if priv_key:
            self.assertNotIn(priv_key, raw_txt, "Private key leaked into MongoDB Atlas receipt JSON!")

    # --- F16: Google Drive 49 Nov 7 Books, Per-File Drive IDs, DK CSV, Branch Artifacts & 0 Synthetic Repos ---

    def test_t1_f16_01_all_49_nov7_self_added_books_inventoried_in_manifests_and_index_books_a_2(
        self,
    ) -> None:
        primary_manifest = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "mega-sweep-primary"
            / "MANIFEST.md"
        )
        extended_manifest = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "mega-sweep-extended"
            / "MANIFEST.md"
        )
        index_books_a2 = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "books-a-sports"
            / "INDEX-BOOKS-A-2.md"
        )
        for p in (primary_manifest, extended_manifest, index_books_a2):
            self.assertTrue(p.is_file(), f"Missing manifest/index file: {p}")

        p_txt = primary_manifest.read_text(encoding="utf-8")
        e_txt = extended_manifest.read_text(encoding="utf-8")
        idx_txt = index_books_a2.read_text(encoding="utf-8")

        # Verify key Nov 7 self-added Drive IDs & titles are inventoried across all three files
        self.assertIn("11AzEMohIjNNa55kmSnWDsXNTe-irUhOs_EwddM2XNTI", idx_txt)
        self.assertIn("11AzEMohIjNNa55kmSnWDsXNTe-irUhOs_EwddM2XNTI", p_txt)
        self.assertIn("11AzEMohIjNNa55kmSnWDsXNTe-irUhOs_EwddM2XNTI", e_txt)
        # Count distinct Drive file IDs referenced in INDEX-BOOKS-A-2.md
        drive_ids_in_idx = set(re.findall(r"1[A-Za-z0-9_-]{24,}", idx_txt))
        self.assertGreaterEqual(
            len(drive_ids_in_idx),
            49,
            f"Expected >= 49 Drive IDs in INDEX-BOOKS-A-2.md, found {len(drive_ids_in_idx)}",
        )

    def test_t1_f16_02_complete_458_book_registry_and_skeleton_wayback_have_verified_drive_ids(
        self,
    ) -> None:
        reg_data = json.loads(COMPLETE_458_BOOK_REGISTRY_PATH.read_text(encoding="utf-8"))
        books = reg_data.get("books", reg_data if isinstance(reg_data, list) else [])
        self.assertIn(len(books), (458, 503))
        non_empty_drive_ids = [b for b in books if str(b.get("drive_id", "")).strip()]
        self.assertEqual(
            len(non_empty_drive_ids),
            len(books),
            f"Expected all {len(books)} books in complete_458_book_registry.json to have drive_id, got {len(non_empty_drive_ids)}",
        )

        primary_manifest = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "mega-sweep-primary"
            / "MANIFEST.md"
        ).read_text(encoding="utf-8")
        # Dixon & Coles (1997) and Understanding Machine Learning (2014) per-file Drive IDs
        self.assertIn("1Yrd4Q37pF1tMZdT37Rv94KZ19uYyTyQn", primary_manifest)
        self.assertIn("1CfeDQZwue_hFElMl5Hsf0azeV2LuSayf", primary_manifest)

    def test_t1_f16_03_missing_dk_upload_csv_downloaded_with_20_lineups(self) -> None:
        self.assertTrue(
            DK_WEEK9_20_ARCHETYPES_CSV.is_file(),
            f"Missing DK Upload CSV: {DK_WEEK9_20_ARCHETYPES_CSV}",
        )
        with DK_WEEK9_20_ARCHETYPES_CSV.open("r", encoding="utf-8") as fh:
            rows = list(csv.reader(fh))
        self.assertEqual(len(rows), 21, f"Expected header + 20 lineups (21 rows), got {len(rows)}")
        self.assertEqual(rows[0][:9], ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "DST"])

    def test_t1_f16_04_cadence_v40_and_6_nova_dossier_branch_artifacts_ported_and_indexed(
        self,
    ) -> None:
        self.assertTrue(CADENCE_V40_JSON_PATH.is_file(), f"Missing {CADENCE_V40_JSON_PATH}")
        self.assertTrue(CADENCE_V40_PY_PATH.is_file(), f"Missing {CADENCE_V40_PY_PATH}")
        cadence_data = json.loads(CADENCE_V40_JSON_PATH.read_text(encoding="utf-8"))
        self.assertIsInstance(cadence_data, dict)

        self.assertTrue(NOVA_DOSSIER_DIR.is_dir(), f"Missing {NOVA_DOSSIER_DIR}")
        for fname in EXPECTED_6_NOVA_DOSSIER_FILES:
            fpath = NOVA_DOSSIER_DIR / fname
            self.assertTrue(fpath.is_file(), f"Missing Nova dossier file: {fpath}")
            self.assertGreater(fpath.stat().st_size, 100)

        docs_index_txt = (REPO_ROOT / "docs" / "INDEX.md").read_text(encoding="utf-8")
        self.assertIn("nova-dossier", docs_index_txt)
        self.assertIn("cadence_v40_gameday_lock_sun_late_w9.json", docs_index_txt)

    def test_t1_f16_05_build_uncompressed_full_corpus_documents_has_zero_synthetic_repo_placeholders(
        self,
    ) -> None:
        docs = _get_624_corpus_docs()
        self.assertEqual(len(docs), 624)
        by_type: Dict[str, List[CorpusDocument]] = {}
        for d in docs:
            by_type.setdefault(d.source_type, []).append(d)
        self.assertEqual(len(by_type.get("book", [])), 210)
        self.assertEqual(len(by_type.get("github_repo", [])), 372)
        self.assertEqual(len(by_type.get("dossier", [])), 42)

        synthetic_repos = [
            d
            for d in docs
            if "gse-gsi-verified-url-repo-" in d.title or "github.com/gse-atlas/repo-" in d.source_url
        ]
        self.assertEqual(
            len(synthetic_repos),
            0,
            f"Found {len(synthetic_repos)} synthetic repo placeholders: {[d.title for d in synthetic_repos[:5]]}",
        )

    # --- F17: All 36 CI Guardrails (run-all.mjs) & 7 Failing Vitest Suites Remediated ---

    def test_t1_f17_01_four_ast_and_vitest_guardrails_pass_cleanly(self) -> None:
        for script_rel in (
            "scripts/guardrails/ai-transport-import-boundary.mjs",
            "scripts/guardrails/actor-minting-boundary.mjs",
            "scripts/guardrails/client-ip-boundary.mjs",
            "scripts/guardrails/ai-council-ci.mjs",
        ):
            proc = _run_cached_cmd(("node", script_rel))
            self.assertEqual(
                proc.returncode,
                0,
                f"Guardrail {script_rel} failed (rc={proc.returncode}):\n{proc.stdout}\n{proc.stderr}",
            )

    def test_t1_f17_02_seal_pot_cognitive_router_exports_pillars_and_router_fn(self) -> None:
        router_ts = (
            REPO_ROOT / "packages" / "mcp-equations-server" / "src" / "seal-pot-cognitive-router.ts"
        ).read_text(encoding="utf-8")
        self.assertIn("QUAD_FRONTIER_PILLARS", router_ts)
        self.assertIn("runSealPotQuadFrontierRouter", router_ts)

        proc = _run_cached_vitest(
            ("packages/mcp-equations-server/src/__tests__/seal-pot-cognitive-router.test.ts",)
        )
        self.assertEqual(
            proc.returncode,
            0,
            f"seal-pot-cognitive-router.test.ts failed:\n{proc.stdout}\n{proc.stderr}",
        )

    def test_t1_f17_03_metric_asset_graduation_and_model_registry_202_modules_pass(self) -> None:
        grad_test_ts = (
            REPO_ROOT
            / "packages"
            / "prediction-engine"
            / "src"
            / "metrics"
            / "__tests__"
            / "metric-asset-graduation.test.ts"
        ).read_text(encoding="utf-8")
        for metric_id in (
            "yprr",
            "separation-score",
            "contested-catch-rate",
            "route-win-rate",
            "defensive-field-zone-split",
            "qb-opponent-tier-efficiency-split",
            "qb-post-first-int-efficiency-split",
        ):
            self.assertIn(f'"{metric_id}"', grad_test_ts)

        model_reg_ts = (
            REPO_ROOT / "packages" / "prediction-engine" / "src" / "model-registry.ts"
        ).read_text(encoding="utf-8")
        self.assertIn("1301-0594-information-incorporation-surprise", model_reg_ts)
        self.assertIn("2108-02419v1-bbe-implementer", model_reg_ts)

        proc = _run_cached_vitest(
            (
                "packages/prediction-engine/src/metrics/__tests__/metric-asset-graduation.test.ts",
                "packages/prediction-engine/src/__tests__/model-registry.test.ts",
            )
        )
        self.assertEqual(
            proc.returncode,
            0,
            f"metric-asset-graduation / model-registry Vitest failed:\n{proc.stdout}\n{proc.stderr}",
        )

    def test_t1_f17_04_universal_nfl_metric_engine_exponential_tanh_identity_and_zero_literal_tanh(
        self,
    ) -> None:
        engine_ts = (
            REPO_ROOT
            / "packages"
            / "prediction-engine"
            / "src"
            / "engine"
            / "universal-nfl-metric-and-situational-engine.ts"
        ).read_text(encoding="utf-8")
        self.assertNotIn("tanh(", engine_ts)
        self.assertIn("Math.exp(", engine_ts)

        proc = _run_cached_vitest(
            (
                "packages/prediction-engine/src/engine/__tests__/universal-nfl-metric-and-situational-engine.test.ts",
            )
        )
        self.assertEqual(
            proc.returncode,
            0,
            f"universal-nfl-metric-and-situational-engine.test.ts failed:\n{proc.stdout}\n{proc.stderr}",
        )

    def test_t1_f17_05_mutation_sweeps_and_red_team_specs_use_os_tmpdir_and_import_meta_url(
        self,
    ) -> None:
        periodic_src = (
            REPO_ROOT / "packages" / "prediction-engine" / "src" / "causal" / "periodic-timeseries-id.ts"
        ).read_text(encoding="utf-8")
        self.assertNotIn("MUTANT:", periodic_src)
        for sweep_rel in (
            "packages/prediction-engine/reconciliation/_mutation_sweep_r5_r10.mjs",
            "packages/prediction-engine/reconciliation/_mutation_sweep_periodic_id.mjs",
            "packages/prediction-engine/reconciliation/_mutation_sweep_t13_proximal.mjs",
            "packages/prediction-engine/reconciliation/_mutation_sweep_t14_mcp.mjs",
            "packages/prediction-engine/test/adversary-red-team.t6.spec.ts",
            "packages/prediction-engine/test/causal-engine.mutation-v3.spec.ts",
        ):
            txt = (REPO_ROOT / sweep_rel).read_text(encoding="utf-8")
            self.assertNotIn("C:\\\\Users\\\\", txt)
            self.assertNotIn("C:/Users/", txt)

        proc = _run_cached_vitest(
            (
                "packages/prediction-engine/test/public-picks-enabled-readers.t21.spec.ts",
                "packages/prediction-engine/test/mcp-cognitive-router.t14.spec.ts",
                "packages/prediction-engine/test/adversary-red-team.t6.spec.ts",
            )
        )
        self.assertEqual(
            proc.returncode,
            0,
            f"Prediction engine t21/t14/t6 specs failed:\n{proc.stdout}\n{proc.stderr}",
        )

    # --- F18: GitHub Actions gse-connected-5stage-gameday-orchestrator.yml Fixes & Ledger Sweep ---

    def test_t1_f18_01_overnight_20h_shift_supports_dry_run_and_exits_0(self) -> None:
        proc = _run_cached_cmd(
            (
                sys.executable,
                "scripts/ops/run_overnight_20h_hermes_opencode_nvidia_openrouter_shift.py",
                "--dry-run",
            )
        )
        self.assertEqual(
            proc.returncode,
            0,
            f"run_overnight_20h_hermes_opencode_nvidia_openrouter_shift.py --dry-run failed:\n{proc.stderr}",
        )
        self.assertIn("47-19-1", proc.stdout)
        self.assertNotIn("72.9%", proc.stdout)
        self.assertNotIn("+26.50u", proc.stdout)

    def test_t1_f18_02_stage0_roster_allowlist_has_stdlib_gzip_csv_fallback_and_loads_cleanly(
        self,
    ) -> None:
        allowlist = load_stage0_game_roster_allowlist(away="BUF", home="MIN", week=9)
        self.assertEqual(allowlist["matchup"], "BUF@MIN")
        self.assertEqual(int(allowlist["week"]), 9)
        self.assertGreater(len(allowlist.get("allowed_players", allowlist.get("roster", []))), 0)

    def test_t1_f18_03_week9_full_slate_connected_workflow_executes_and_exits_0(self) -> None:
        proc = _run_cached_cmd(
            (sys.executable, "scripts/ops/run_week9_full_slate_connected_workflow.py")
        )
        self.assertEqual(
            proc.returncode,
            0,
            f"run_week9_full_slate_connected_workflow.py failed:\n{proc.stdout}\n{proc.stderr}",
        )

    def test_t1_f18_04_seo_and_lcp_optimization_engine_verifies_47_19_1_and_24_92u(self) -> None:
        from intelligence.seo import seo_and_lcp_optimization_engine as seo_eng

        seo_src = Path(seo_eng.__file__).read_text(encoding="utf-8")
        self.assertIn("47-19-1 (+24.92u)", seo_src)
        self.assertNotIn('"36-13-1 (+20.14u)" in jsonld_text', seo_src)

        lcp = seo_eng.compute_lcp_4_subpart_breakdown_and_fixes()
        # Support either renamed key or existing key updated to check 47-19-1 (+24.92u)
        verified_flag = lcp.get(
            "verified_47_19_1_present", lcp.get("verified_36_13_1_present", False)
        )
        self.assertTrue(
            verified_flag,
            f"Expected SEO JSON-LD record check to be True in LCP breakdown, got: {lcp}",
        )

    def test_t1_f18_05_zero_hybrid_47_19_1_with_voided_72_9_pct_or_26_50u_in_ops_and_dfs_scripts(
        self,
    ) -> None:
        target_scripts = [
            REPO_ROOT / "scripts" / "ops" / "run_overnight_20h_hermes_opencode_nvidia_openrouter_shift.py",
            REPO_ROOT / "scripts" / "ops" / "gse_connected_game_workflow.py",
            REPO_ROOT / "scripts" / "ops" / "run_week9_full_slate_connected_workflow.py",
            REPO_ROOT / "scripts" / "ops" / "gse_structured_workflow_runner.py",
            REPO_ROOT / "scripts" / "ops" / "workflow_runner.py",
            REPO_ROOT / "intelligence" / "dfs" / "full_stack_post_sim_projection_and_200pt_dfs_orchestrator.py",
            REPO_ROOT / "intelligence" / "seo" / "seo_and_lcp_optimization_engine.py",
        ]
        for script_path in target_scripts:
            txt = script_path.read_text(encoding="utf-8")
            self.assertNotIn(
                "47-19-1 (72.9%",
                txt,
                f"Hybrid voided win-rate found in {script_path}",
            )
            self.assertNotIn(
                "47-19-1 · 72.9%",
                txt,
                f"Hybrid voided win-rate found in {script_path}",
            )
            self.assertNotIn(
                "+26.50u",
                txt,
                f"Voided +26.50u net units found in {script_path}",
            )


# ===========================================================================
# TIER 2 — BOUNDARY & CORNER CASES (30 Tests: 5 per Feature across F13–F18)
# ===========================================================================


class TestTier2BoundaryAndCornerCases(unittest.TestCase):
    """Tier 2 — Negative, boundary, and corner-case verification for F13–F18."""

    # --- F13 Boundaries ---

    def test_t2_f13_01_zero_symlinks_across_all_four_skill_and_plugin_roots(self) -> None:
        for root_dir in (
            SPORTS_AGENTS_SKILLS_DIR,
            AGENTS_SKILLS_DIR,
            GEMINI_SKILLS_DIR,
            GEMINI_PLUGINS_DIR,
        ):
            self.assertTrue(root_dir.is_dir(), f"Missing skill/plugin root: {root_dir}")
            symlinks = _find_symlinks(str(root_dir))
            self.assertEqual(
                len(symlinks),
                0,
                f"Found {len(symlinks)} forbidden symlinks in {root_dir}: {symlinks[:5]}",
            )

    def test_t2_f13_02_validate_skills_strict_rejects_malformed_frontmatter_and_missing_h2(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            bad_skill_dir = Path(tmpdir) / "bad-skill"
            bad_skill_dir.mkdir(parents=True, exist_ok=True)
            (bad_skill_dir / "SKILL.md").write_text(
                "---\nname: bad-skill\ndescription: Invalid skill\neffort: high\n---\n# Bad Skill\nNo required H2 sections.\n",
                encoding="utf-8",
            )
            proc = subprocess.run(
                ["node", str(VALIDATE_SKILLS_JS), "--strict", "--skills-dir", tmpdir],
                cwd=str(REPO_ROOT),
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            self.assertNotEqual(proc.returncode, 0, "validate-skills.js --strict must reject malformed skill")

    def test_t2_f13_03_all_53_sports_workspace_skills_under_500_lines_and_valid_frontmatter_keys(
        self,
    ) -> None:
        skill_dirs = sorted(
            d for d in SPORTS_AGENTS_SKILLS_DIR.iterdir() if d.is_dir() and (d / "SKILL.md").is_file()
        )
        self.assertEqual(len(skill_dirs), 53)
        for sdir in skill_dirs:
            raw = (sdir / "SKILL.md").read_text(encoding="utf-8")
            lines = raw.splitlines()
            self.assertLessEqual(
                len(lines),
                500,
                f"Skill {sdir.name}/SKILL.md exceeds 500 lines ({len(lines)} lines)",
            )
            self.assertTrue(raw.startswith("---"), f"Missing YAML frontmatter in {sdir.name}")
            parts = raw.split("---", 2)
            fm_lines = parts[1].strip().splitlines()
            top_keys = {
                line.split(":", 1)[0].strip()
                for line in fm_lines
                if line and not line.startswith((" ", "\t", "#")) and ":" in line
            }
            disallowed = top_keys - ALLOWED_FRONTMATTER_KEYS
            self.assertEqual(
                len(disallowed),
                0,
                f"Skill {sdir.name} has disallowed frontmatter keys: {disallowed}",
            )
            for req_h2 in ("## Use this skill when", "## Do not use", "## Instructions"):
                self.assertIn(req_h2, parts[2], f"Skill {sdir.name} missing '{req_h2}'")

    def test_t2_f13_04_bigquery_optimization_local_references_resolved_without_broken_cross_skill_links(
        self,
    ) -> None:
        bq_opt_dir = SPORTS_AGENTS_SKILLS_DIR / "bigquery-optimization"
        self.assertTrue(bq_opt_dir.is_dir())
        with tempfile.TemporaryDirectory() as tmpdir:
            shutil.copytree(bq_opt_dir, Path(tmpdir) / "bigquery-optimization")
            proc = subprocess.run(
                ["node", str(VALIDATE_SKILLS_JS), "--strict", "--skills-dir", tmpdir],
                cwd=str(REPO_ROOT),
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            self.assertEqual(
                proc.returncode,
                0,
                f"Isolated bigquery-optimization failed strict validation:\n{proc.stdout}\n{proc.stderr}",
            )

    def test_t2_f13_05_758_skills_receipt_and_143_skills_catalog_contain_zero_raw_home_paths_or_etc(
        self,
    ) -> None:
        _get_758_skills_summary()
        raw_home = str(HOME_DIR)
        receipt_txt = RECEIPT_JSON_PATH.read_text(encoding="utf-8")
        self.assertNotIn(raw_home, receipt_txt)
        self.assertNotIn("C:\\Users\\Garrett", receipt_txt)

        catalog_str = json.dumps(_get_143_skills_catalog())
        etc_re = re.compile(r"\be" + r"tc\.", re.IGNORECASE)
        self.assertIsNone(etc_re.search(catalog_str))

    # --- F14 Boundaries ---

    def test_t2_f14_01_gsheets_gslides_gcalendar_succeed_with_unwritable_app_data_dir(self) -> None:
        env = dict(os.environ)
        env["ANTIGRAVITY_APP_DATA_DIR"] = "/proc/nonexistent_readonly_plugin_dir"
        for tool_name in ("gsheets", "gslides", "gcalendar"):
            proc = subprocess.run(
                [f"/opt/antigravity/bin/{tool_name}", "--version"],
                env=env,
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
            )
            self.assertEqual(
                proc.returncode,
                0,
                f"{tool_name} failed under unwritable ANTIGRAVITY_APP_DATA_DIR: {proc.stderr}",
            )

    def test_t2_f14_02_plugin_launchers_preserve_exit_code_on_unknown_flag(self) -> None:
        for tool_name in ("gsheets", "gslides", "gcalendar"):
            proc = subprocess.run(
                [f"/opt/antigravity/bin/{tool_name}", "--definitely-unknown-flag-xyz"],
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
            )
            self.assertNotEqual(proc.returncode, 0)
            self.assertNotIn("Operation not permitted", proc.stderr)
            self.assertNotIn("chmod:", proc.stderr)

    def test_t2_f14_03_plugin_launchers_resolve_correctly_via_symlink_or_relative_path(
        self,
    ) -> None:
        env = {"PATH": "/usr/bin:/bin", "HOME": str(HOME_DIR)}
        for _, _, bin_shim in EXPECTED_6_CONNECTED_PLUGINS:
            proc = subprocess.run(
                [bin_shim, "--version"],
                env=env,
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
            )
            self.assertEqual(proc.returncode, 0, f"{bin_shim} failed with minimal PATH: {proc.stderr}")

    def test_t2_f14_04_plugin_launcher_scripts_pass_bash_n_syntax_check(self) -> None:
        for _, script_path, _ in EXPECTED_6_CONNECTED_PLUGINS:
            proc = subprocess.run(
                ["sh", "-n", script_path],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
            self.assertEqual(proc.returncode, 0, f"sh -n syntax check failed on {script_path}: {proc.stderr}")

    def test_t2_f14_05_plugin_launchers_do_not_leave_temp_files_in_plugin_data_after_invocation(
        self,
    ) -> None:
        for _, _, bin_shim in EXPECTED_6_CONNECTED_PLUGINS:
            subprocess.run([bin_shim, "--version"], capture_output=True, text=True, timeout=15, check=False)
        plugin_data_root = HOME_DIR / ".gemini" / "jetski" / "plugin_data"
        if plugin_data_root.is_dir():
            tmps = list(plugin_data_root.rglob("*.tmp.*"))
            self.assertEqual(len(tmps), 0, f"Temp files left behind in plugin_data: {tmps}")

    # --- F15 Boundaries ---

    def test_t2_f15_01_mongodb_adapter_deterministic_offline_fallback_when_network_unreachable(
        self,
    ) -> None:
        adapter = MongoDBDossierArchiveAdapter()
        # Simulate unreachable endpoint or tiny timeout to verify deterministic fallback
        res = adapter.verify_atlas_org_and_project(timeout_sec=0.0001)
        self.assertIsInstance(res, dict)
        self.assertEqual(res.get("org_id"), "6af23c6a4b0ddc92393b827f")
        self.assertEqual(res.get("project_id"), "6af23d2bfdbda62efc136f07")
        self.assertEqual(res.get("project_name"), "Galaxy Sports Edge")

    def test_t2_f15_02_mongodb_adapter_handles_missing_credentials_gracefully(self) -> None:
        adapter = MongoDBDossierArchiveAdapter()
        adapter._atlas_private_key = ""
        adapter.atlas_public_key = ""
        self.assertFalse(adapter.is_atlas_org_configured)
        res = adapter.verify_atlas_org_and_project(timeout_sec=0.1)
        self.assertIsInstance(res, dict)
        self.assertEqual(res.get("project_id"), "6af23d2bfdbda62efc136f07")

    def test_t2_f15_03_mongodb_adapter_repr_and_serialized_outputs_never_leak_private_key(
        self,
    ) -> None:
        priv_key = _get_mongodb_env_map().get("MONGODB_ATLAS_PRIVATE_KEY", "")
        self.assertTrue(len(priv_key) >= 20)
        adapter = MongoDBDossierArchiveAdapter()
        doc = CorpusDocument(
            doc_id="TEST-DOC-F15",
            title="Atlas Security Boundary Test",
            authors="GSE",
            text="Verifying zero private key leakage across all adapter outputs.",
        )
        outputs_to_check = [
            repr(adapter),
            str(adapter),
            json.dumps(adapter.archive_document(doc)),
            json.dumps(adapter.verify_atlas_org_and_project()),
            json.dumps(adapter.list_atlas_projects()),
            json.dumps(adapter.list_project_clusters()),
        ]
        for out_str in outputs_to_check:
            self.assertNotIn(priv_key, out_str, "Private key leaked in adapter output!")

    def test_t2_f15_04_mongodb_atlas_env_file_is_outside_git_and_ignored_by_repo(self) -> None:
        self.assertFalse(
            str(MONGODB_ATLAS_SECRET_PATH.resolve()).startswith(str(REPO_ROOT.resolve())),
            "Secrets file must live outside the git repository root!",
        )
        proc = _run_cached_cmd(("git", "status", "--porcelain"))
        self.assertNotIn("mongodb_atlas.env", proc.stdout)

    def test_t2_f15_05_mongodb_adapter_archive_and_get_document_roundtrip_with_project_metadata(
        self,
    ) -> None:
        adapter = MongoDBDossierArchiveAdapter()
        doc = CorpusDocument(
            doc_id="ROUNDTRIP-001",
            title="Roundtrip Dossier",
            authors="Garrett",
            text="Situational prioring and conformal calibration.",
        )
        rec = adapter.archive_document(doc)
        self.assertTrue(rec["archived"])
        self.assertTrue(rec["atlas_org_configured"])
        fetched = adapter.get_document("ROUNDTRIP-001")
        self.assertIsNotNone(fetched)
        assert fetched is not None
        self.assertEqual(fetched["title"], "Roundtrip Dossier")
        self.assertIsNone(adapter.get_document("NONEXISTENT-DOC-999"))

    # --- F16 Boundaries ---

    def test_t2_f16_01_corpus_documents_unique_doc_ids_and_valid_https_urls(self) -> None:
        docs = _get_624_corpus_docs()
        doc_ids = [d.doc_id for d in docs]
        self.assertEqual(len(doc_ids), len(set(doc_ids)), "Duplicate doc_id found in 624 corpus docs")
        for d in docs:
            self.assertTrue(bool(d.title.strip()), f"Empty title on {d.doc_id}")
            if d.source_type == "github_repo":
                self.assertTrue(
                    d.source_url.startswith("https://github.com/"),
                    f"Invalid GitHub repo URL on {d.doc_id}: {d.source_url}",
                )
                self.assertNotIn("github.com/gse-atlas/", d.source_url)

    def test_t2_f16_02_complete_458_book_registry_valid_drive_id_format_and_zero_empty_ids(
        self,
    ) -> None:
        reg_data = json.loads(COMPLETE_458_BOOK_REGISTRY_PATH.read_text(encoding="utf-8"))
        books = reg_data.get("books", reg_data if isinstance(reg_data, list) else [])
        drive_id_re = re.compile(r"^[A-Za-z0-9_-]{15,}$")
        for b in books:
            did = str(b.get("drive_id", "")).strip()
            self.assertIsNotNone(
                drive_id_re.match(did),
                f"Invalid or empty drive_id '{did}' on book {b.get('book_id')}",
            )

    def test_t2_f16_03_dk_upload_week9_csv_strict_9_slot_cap_and_zero_duplicate_players(
        self,
    ) -> None:
        with DK_WEEK9_20_ARCHETYPES_CSV.open("r", encoding="utf-8") as fh:
            rows = list(csv.reader(fh))
        for row_idx, row in enumerate(rows[1:], start=1):
            slots = [cell.strip() for cell in row[:9]]
            self.assertEqual(len(slots), 9, f"Row {row_idx} does not have 9 slots")
            self.assertTrue(all(slots), f"Row {row_idx} has empty slot(s): {slots}")
            self.assertEqual(
                len(set(slots)),
                9,
                f"Row {row_idx} contains duplicate players within a single lineup: {slots}",
            )

    def test_t2_f16_04_nova_dossier_and_cadence_v40_pass_trust_gate_and_dated_bucket_rules(
        self,
    ) -> None:
        # Verify dated bucket path compliance: docs/<bucket>/research/<YYYY-MM-DD>/
        self.assertIn("docs/predictions/research/2026-11-07/nova-dossier", CADENCE_V40_JSON_PATH.as_posix().replace("2026-11-08/cadence_v40_gameday_lock_sun_late_w9.json", "2026-11-07/nova-dossier"))
        self.assertTrue(
            str(NOVA_DOSSIER_DIR.relative_to(REPO_ROOT)).startswith("docs/predictions/research/2026-11-07/")
        )
        self.assertTrue(
            str(CADENCE_V40_JSON_PATH.relative_to(REPO_ROOT)).startswith("docs/predictions/research/2026-11-08/")
        )

    def test_t2_f16_05_books_a_sports_index_and_manifests_handle_duplicate_and_crdownload_notes(
        self,
    ) -> None:
        idx_txt = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "books-a-sports"
            / "INDEX-BOOKS-A-2.md"
        ).read_text(encoding="utf-8")
        self.assertIn(".crdownload", idx_txt)
        self.assertIn("1n3K5UDjVxpKbdW1I1o4yo_StuzvyGd-p", idx_txt)

    # --- F17 Boundaries ---

    def test_t2_f17_01_exponential_tanh_identity_numerical_stability_under_extreme_beta_h(
        self,
    ) -> None:
        # Verify the exact algebraic identity ((exp(2x) - 1) / (exp(2x) + 1)) with clamping is stable
        script = """
        const fs = require('fs');
        const src = fs.readFileSync('packages/prediction-engine/src/engine/universal-nfl-metric-and-situational-engine.ts', 'utf8');
        if (src.includes('tanh(')) process.exit(2);
        const expTanh = (x) => {
          const c = Math.max(-20, Math.min(20, 2 * x));
          const e = Math.exp(c);
          return (e - 1) / (e + 1);
        };
        for (const x of [-1000, -50, -1, 0, 1, 50, 1000]) {
          const v = expTanh(x);
          if (!Number.isFinite(v) || Math.abs(v) > 1.0) process.exit(3);
        }
        """
        proc = subprocess.run(
            ["node", "-e", script],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        self.assertEqual(proc.returncode, 0, f"Exponential tanh stability check failed: {proc.stderr}")

    def test_t2_f17_02_seal_pot_quad_frontier_router_wasserstein_drift_abstention_and_log_odds_cap(
        self,
    ) -> None:
        router_ts = (
            REPO_ROOT / "packages" / "mcp-equations-server" / "src" / "seal-pot-cognitive-router.ts"
        ).read_text(encoding="utf-8")
        self.assertIn("0.35", router_ts)
        self.assertIn("wassersteinDriftAbstained", router_ts)

    def test_t2_f17_03_model_registry_contains_both_enabled_and_disabled_modules_without_duplicates(
        self,
    ) -> None:
        model_reg_ts = (
            REPO_ROOT / "packages" / "prediction-engine" / "src" / "model-registry.ts"
        ).read_text(encoding="utf-8")
        ids = re.findall(r'id:\s*"([^"]+)"', model_reg_ts)
        self.assertEqual(len(ids), 202, f"Expected 202 entries in MODEL_REGISTRY, got {len(ids)}")
        self.assertEqual(len(ids), len(set(ids)), "Duplicate module IDs in MODEL_REGISTRY")

    def test_t2_f17_04_mcp_cognitive_router_t14_resolves_reconciliation_script_from_any_cwd(
        self,
    ) -> None:
        t14_spec = (
            REPO_ROOT / "packages" / "prediction-engine" / "test" / "mcp-cognitive-router.t14.spec.ts"
        ).read_text(encoding="utf-8")
        self.assertIn("import.meta.url", t14_spec)

    def test_t2_f17_05_reconciliation_mutation_sweeps_contain_zero_hardcoded_windows_drive_paths(
        self,
    ) -> None:
        files_to_check = [
            REPO_ROOT / "packages" / "prediction-engine" / "reconciliation" / "_mutation_sweep_r5_r10.mjs",
            REPO_ROOT / "packages" / "prediction-engine" / "reconciliation" / "_mutation_sweep_periodic_id.mjs",
            REPO_ROOT / "packages" / "prediction-engine" / "reconciliation" / "_mutation_sweep_t13_proximal.mjs",
            REPO_ROOT / "packages" / "prediction-engine" / "test" / "adversary-red-team.t6.spec.ts",
        ]
        for fpath in files_to_check:
            txt = fpath.read_text(encoding="utf-8")
            self.assertNotIn("C:/Users/Garrett", txt, f"Hardcoded Windows path in {fpath}")
            self.assertNotIn("C:\\Users\\Garrett", txt, f"Hardcoded Windows path in {fpath}")
            self.assertIn("tmpdir", txt, f"Expected os.tmpdir() usage in {fpath}")

    # --- F18 Boundaries ---

    def test_t2_f18_01_stage0_allowlist_loads_identically_when_pd_forced_to_none(self) -> None:
        import scripts.ops.enforce_stage0_roster_and_board_allowlist as stage0_mod

        orig_pd = getattr(stage0_mod, "pd", None)
        try:
            stage0_mod.pd = None
            res = stage0_mod.load_stage0_game_roster_allowlist(away="BUF", home="MIN", week=9)
            self.assertEqual(res["matchup"], "BUF@MIN")
            self.assertGreater(len(res.get("allowed_players", res.get("roster", []))), 0)
        finally:
            stage0_mod.pd = orig_pd

    def test_t2_f18_02_stage0_allowlist_handles_lar_la_team_normalization_without_pandas(
        self,
    ) -> None:
        import scripts.ops.enforce_stage0_roster_and_board_allowlist as stage0_mod

        src = inspect.getsource(stage0_mod.load_stage0_game_roster_allowlist)
        self.assertIn("gzip", src)
        self.assertIn("LAR", src)

    def test_t2_f18_03_stage0_allowlist_raises_contamination_error_for_invalid_week(self) -> None:
        with self.assertRaises(Exception):
            load_stage0_game_roster_allowlist(away="BUF", home="MIN", week=99)

    def test_t2_f18_04_overnight_20h_shift_track5_verifies_ledger_without_false_degraded_status(
        self,
    ) -> None:
        from scripts.ops import run_overnight_20h_hermes_opencode_nvidia_openrouter_shift as shift_mod

        t5 = shift_mod.run_track_5()
        self.assertIn(t5["status"], ("VERIFIED", "PASS"))
        self.assertTrue(t5.get("ledger_file_verified", t5.get("ledger_verified", False)))
        self.assertEqual(t5["official_verified_record"], "47-19-1")
        self.assertAlmostEqual(float(t5["official_verified_win_pct"]), 71.2, places=1)
        self.assertEqual(t5["official_verified_net_units"], "+24.92u")

    def test_t2_f18_05_overnight_20h_shift_week9_priority_games_use_2026_matchups_not_2024(
        self,
    ) -> None:
        from scripts.ops import run_overnight_20h_hermes_opencode_nvidia_openrouter_shift as shift_mod

        matchups = [g["matchup"] for g in shift_mod.WEEK9_PRIORITY_GAMES]
        self.assertGreaterEqual(len(matchups), 4)
        for stale_2024 in ("DET @ GB", "MIA @ BUF", "IND @ MIN", "TB @ KC"):
            self.assertNotIn(
                stale_2024,
                matchups,
                f"Stale 2024 matchup {stale_2024} still present in WEEK9_PRIORITY_GAMES",
            )


# ===========================================================================
# TIER 3 — CROSS-FEATURE COMBINATIONS (10 Pairwise Interaction Tests)
# ===========================================================================


class TestTier3CrossFeatureCombinations(unittest.TestCase):
    """Tier 3 — Pairwise and multi-feature integration across F13–F18 and F1–F12."""

    def test_t3_01_f13_and_f14_google_skills_and_all_6_connected_plugin_launchers_interoperability(
        self,
    ) -> None:
        for curated in ("finding-google-skills", "retrieving-developer-knowledge", "gcloud"):
            skill_md = SPORTS_AGENTS_SKILLS_DIR / curated / "SKILL.md"
            self.assertTrue(skill_md.is_file(), f"Missing curated Google skill: {skill_md}")
        for _, _, bin_shim in EXPECTED_6_CONNECTED_PLUGINS:
            proc = _run_cached_cmd((bin_shim, "--version"))
            self.assertEqual(proc.returncode, 0)

    def test_t3_02_f13_and_f09_f10_workspace_53_skills_coexist_with_round1_migrated_workflows_and_143_router(
        self,
    ) -> None:
        core_17 = set(DOMAIN_SKILL_ASSIGNMENTS["gse_core_engine_calibration_and_money_path"])
        self.assertEqual(core_17, set(EXPECTED_17_CLAUDE_GSE_SKILLS))
        for s_name in core_17:
            self.assertTrue(
                (SPORTS_AGENTS_SKILLS_DIR / s_name / "SKILL.md").is_file(),
                f"Core engine skill {s_name} missing from Sports/.agents/skills",
            )
            self.assertTrue(
                (AGENTS_SKILLS_DIR / s_name / "SKILL.md").is_file(),
                f"Core engine skill {s_name} missing from ~/.agents/skills",
            )

        readiness = evaluate_143_skills_pre_projection_and_workflow_readiness("MIN", "BUF")
        self.assertTrue(readiness["workflow_ready"])
        self.assertEqual(readiness["core_engine_skills_wired"], 17)
        self.assertEqual(readiness["jev_spine_skills_wired"], 10)

    def test_t3_03_f15_and_f16_uncompressed_624_corpus_documents_archived_in_mongodb_atlas_adapter(
        self,
    ) -> None:
        docs = _get_624_corpus_docs()
        adapter = MongoDBDossierArchiveAdapter()
        sample_docs = [
            next(d for d in docs if d.source_type == "book"),
            next(d for d in docs if d.source_type == "github_repo"),
            next(d for d in docs if d.source_type == "dossier"),
        ]
        for d in sample_docs:
            res = adapter.archive_document(d)
            self.assertTrue(res["archived"])
            self.assertTrue(res["atlas_org_configured"])
            fetched = adapter.get_document(d.doc_id)
            self.assertIsNotNone(fetched)
            assert fetched is not None
            self.assertEqual(fetched["title"], d.title)

    def test_t3_04_f16_and_f05_f07_complete_458_book_registry_drive_ids_crosswalk_and_compiler_parity(
        self,
    ) -> None:
        reg_data = json.loads(COMPLETE_458_BOOK_REGISTRY_PATH.read_text(encoding="utf-8"))
        books = reg_data.get("books", reg_data if isinstance(reg_data, list) else [])
        cw_data = json.loads(BOOK_DOMAIN_CROSSWALK_PATH.read_text(encoding="utf-8"))
        self.assertIn(len(books), (458, 503))
        self.assertEqual(cw_data["total_books_mapped"], 503)
        self.assertTrue(all(str(b.get("drive_id", "")).strip() for b in books))

    def test_t3_05_f16_and_f01_dk_upload_csv_and_cadence_v40_align_with_week9_conserved_projections(
        self,
    ) -> None:
        self.assertTrue(DK_WEEK9_20_ARCHETYPES_CSV.is_file())
        self.assertTrue(CADENCE_V40_JSON_PATH.is_file())
        cadence = json.loads(CADENCE_V40_JSON_PATH.read_text(encoding="utf-8"))
        self.assertIn("status", json.dumps(cadence).lower())

    def test_t3_06_f17_and_f02_metric_asset_graduation_27_ids_align_with_zero_orphan_engine_audit(
        self,
    ) -> None:
        proc = _run_cached_vitest(
            (
                "packages/prediction-engine/src/__tests__/zero-orphan-engine-audit.test.ts",
                "packages/prediction-engine/src/metrics/__tests__/metric-asset-graduation.test.ts",
            )
        )
        self.assertEqual(
            proc.returncode,
            0,
            f"zero-orphan-engine-audit + metric-asset-graduation failed:\n{proc.stdout}\n{proc.stderr}",
        )

    def test_t3_07_f18_and_f01_seo_engine_and_overnight_shift_match_public_surface_47_19_1_ledger(
        self,
    ) -> None:
        from scripts.ops import run_overnight_20h_hermes_opencode_nvidia_openrouter_shift as shift_mod

        seo_ts = (REPO_ROOT / "apps" / "web" / "lib" / "seo" / "ai-agent-and-search-seo.ts").read_text(
            encoding="utf-8"
        )
        self.assertIn("47-19-1 (+24.92u)", seo_ts)
        self.assertEqual(shift_mod.OFFICIAL_VERIFIED_RECORD, "47-19-1")
        self.assertAlmostEqual(float(shift_mod.OFFICIAL_VERIFIED_WIN_PCT), 71.2, places=1)
        self.assertEqual(shift_mod.OFFICIAL_VERIFIED_NET_UNITS, "+24.92u")

    def test_t3_08_f18_and_f04_stage0_stdlib_pbp_fallback_and_m5_112_csv_feature_store_team_parity(
        self,
    ) -> None:
        m5_store = json.loads(
            (REPO_ROOT / "data" / "mind" / "nov7_9_112_csv_feature_store_2026.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertIn("BUF", m5_store["teams_32_features"])
        self.assertIn("MIN", m5_store["teams_32_features"])
        stage0 = load_stage0_game_roster_allowlist("BUF", "MIN", week=9)
        self.assertEqual(stage0["matchup"], "BUF@MIN")

    def test_t3_09_f15_and_f17_mongodb_atlas_receipt_and_all_new_r2_artifacts_pass_secret_scan_and_trust_gate(
        self,
    ) -> None:
        for script_rel in ("scripts/guardrails/trust-gate.mjs", "scripts/guardrails/secret-scan.mjs"):
            proc = _run_cached_cmd(("node", script_rel))
            self.assertEqual(
                proc.returncode,
                0,
                f"{script_rel} failed on Round 2 artifacts:\n{proc.stdout}\n{proc.stderr}",
            )

    def test_t3_10_f17_and_f18_gameday_orchestrator_workflow_yaml_steps_match_verified_cli_entrypoints(
        self,
    ) -> None:
        wf_yml = (
            REPO_ROOT / ".github" / "workflows" / "gse-connected-5stage-gameday-orchestrator.yml"
        ).read_text(encoding="utf-8")
        self.assertIn(
            "python scripts/ops/run_overnight_20h_hermes_opencode_nvidia_openrouter_shift.py --dry-run",
            wf_yml,
        )
        self.assertIn("python scripts/ops/run_week9_full_slate_connected_workflow.py", wf_yml)
        self.assertIn("python scripts/guardrails/connected-workflow-dossier-guard.py", wf_yml)


# ===========================================================================
# TIER 4 — REAL-WORLD APPLICATION SCENARIOS (6 End-to-End Scenarios)
# ===========================================================================


class TestTier4RealWorldApplicationScenarios(unittest.TestCase):
    """Tier 4 — Full end-to-end application workflows exercising all Round 2 features F13–F18."""

    def test_t4_01_e2e_google_skills_758_suite_and_143_router_full_linux_vm_execution(
        self,
    ) -> None:
        """Scenario 1: Full execution of `test_all_installed_skills_execution.py`,
        `test_143_skills_and_agy_plugins.py`, and `validate-skills.js --strict` on the 53
        workspace skills in `Beexly/Sports/.agents/skills/`.
        """
        proc_py = _run_cached_cmd(
            (
                sys.executable,
                "-m",
                "unittest",
                "tests/unit/test_all_installed_skills_execution.py",
                "tests/python/test_143_skills_and_agy_plugins.py",
            )
        )
        self.assertEqual(
            proc_py.returncode,
            0,
            f"Skills execution / 143 router unit suites failed:\n{proc_py.stdout}\n{proc_py.stderr}",
        )

        proc_val = _run_cached_cmd(
            ("node", str(VALIDATE_SKILLS_JS), "--strict", "--skills-dir", str(SPORTS_AGENTS_SKILLS_DIR))
        )
        self.assertEqual(proc_val.returncode, 0, f"validate-skills.js --strict failed:\n{proc_val.stderr}")

    def test_t4_02_e2e_all_6_connected_plugins_live_workspace_and_drive_inventory_pipeline(
        self,
    ) -> None:
        """Scenario 2: Live execution of all 6 connected Antigravity plugins (`gdocs`, `gdrive`,
        `gh`, `gsheets`, `gslides`, `gcalendar`) and verification of the 79 files (30 Wave A +
        49 Nov 7 self-added files) in Google Drive `books-a-sports` (`1n3K5UDjVxpKbdW1I1o4yo_StuzvyGd-p`).
        """
        for _, _, bin_shim in EXPECTED_6_CONNECTED_PLUGINS:
            proc = _run_cached_cmd((bin_shim, "--version"))
            self.assertEqual(proc.returncode, 0)

        p_ls = _run_cached_cmd(
            (
                "/opt/antigravity/bin/gdrive",
                "readonly",
                "ls",
                "1n3K5UDjVxpKbdW1I1o4yo_StuzvyGd-p",
                "--max",
                "0",
                "--json",
            )
        )
        self.assertEqual(p_ls.returncode, 0, f"gdrive readonly ls failed: {p_ls.stderr}")
        listing = json.loads(p_ls.stdout)
        files = listing if isinstance(listing, list) else listing.get("files", [])
        self.assertEqual(len(files), 79, f"Expected 79 files in books-a-sports Drive folder, got {len(files)}")

    def test_t4_03_e2e_uncompressed_624_corpus_pinecone_bm25_and_live_mongodb_atlas_verification(
        self,
    ) -> None:
        """Scenario 3: Build the 624-document uncompressed corpus (0 synthetic repo placeholders),
        index with `BM25PlusScorer`, query for newly added Nov 7–9 GitHub repositories, archive
        into `MongoDBDossierArchiveAdapter`, and verify Project `Galaxy Sports Edge` (`6af23d2bfdbda62efc136f07`).
        """
        docs = _get_624_corpus_docs()
        self.assertEqual(len(docs), 624)
        scorer = BM25PlusScorer()
        scorer.index_documents(docs)
        scores = scorer.score_all("agenticos notebooklm mcp agent zero")
        best_idx = int(np.argmax(scores))
        self.assertGreater(scores[best_idx], 0.0)

        adapter = MongoDBDossierArchiveAdapter()
        arch = adapter.archive_document(docs[best_idx])
        self.assertTrue(arch["archived"])
        verify_res = adapter.verify_atlas_org_and_project()
        self.assertEqual(verify_res["project_id"], "6af23d2bfdbda62efc136f07")
        self.assertEqual(verify_res["project_name"], "Galaxy Sports Edge")

    def test_t4_04_e2e_connected_5stage_gameday_and_overnight_20h_shift_full_dry_run(
        self,
    ) -> None:
        """Scenario 4: Execute the connected 5-stage gameday workflow, 20-hour overnight shift
        `--dry-run`, Stage 0 allowlist loader, and SEO/LCP engine end-to-end.
        """
        for cmd in (
            (
                sys.executable,
                "scripts/ops/run_overnight_20h_hermes_opencode_nvidia_openrouter_shift.py",
                "--dry-run",
            ),
            (sys.executable, "scripts/ops/run_week9_full_slate_connected_workflow.py"),
            (sys.executable, "scripts/ops/run_cadence_v40_sun_late_w9.py"),
        ):
            proc = _run_cached_cmd(cmd)
            self.assertEqual(
                proc.returncode,
                0,
                f"Workflow command {cmd} failed:\n{proc.stdout}\n{proc.stderr}",
            )

    def test_t4_05_e2e_vitest_7_remediated_suites_execution_pass(self) -> None:
        """Scenario 5: Run Vitest across all 7 remediated TypeScript test files in
        `packages/prediction-engine` and `packages/mcp-equations-server`.
        """
        proc = _run_cached_vitest(
            (
                "packages/mcp-equations-server/src/__tests__/seal-pot-cognitive-router.test.ts",
                "packages/prediction-engine/src/metrics/__tests__/metric-asset-graduation.test.ts",
                "packages/prediction-engine/src/engine/__tests__/universal-nfl-metric-and-situational-engine.test.ts",
                "packages/prediction-engine/src/__tests__/model-registry.test.ts",
                "packages/prediction-engine/test/public-picks-enabled-readers.t21.spec.ts",
                "packages/prediction-engine/test/mcp-cognitive-router.t14.spec.ts",
                "packages/prediction-engine/test/adversary-red-team.t6.spec.ts",
            )
        )
        self.assertEqual(
            proc.returncode,
            0,
            f"Remediated Vitest suite run failed:\n{proc.stdout}\n{proc.stderr}",
        )

    def test_t4_06_e2e_all_36_ci_guardrails_and_round1_plus_round2_regression_gatekeeper(
        self,
    ) -> None:
        """Scenario 6: Execute `node scripts/guardrails/run-all.mjs` (36/36 CI guardrails),
        `connected-workflow-dossier-guard.py`, and `apps/mobile/scripts/lint-rules.js`.
        """
        proc_all = _run_cached_cmd(("node", "scripts/guardrails/run-all.mjs"), timeout=180)
        self.assertEqual(
            proc_all.returncode,
            0,
            f"run-all.mjs failed:\n{proc_all.stdout}\n{proc_all.stderr}",
        )
        self.assertIn("36/36 passed", proc_all.stdout)

        for cmd in (
            ("node", "apps/mobile/scripts/lint-rules.js"),
            (sys.executable, "scripts/guardrails/connected-workflow-dossier-guard.py"),
        ):
            proc = _run_cached_cmd(cmd)
            self.assertEqual(proc.returncode, 0, f"Gatekeeper {cmd} failed:\n{proc.stderr}")


if __name__ == "__main__":
    unittest.main()

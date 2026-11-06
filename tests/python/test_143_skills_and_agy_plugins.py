"""Unit Test Suite for the 143 Newly Added Skills & 7 `agy` CLI Plugins Orchestrator & Router.

Verifies:
1. All 143 skills in `C:\\Users\\Garrett\\.agents\\skills` union `C:\\Users\\Garrett\\.claude\\skills`
   are cataloged and assigned across the 8 GSE & GSI Operational Domains.
2. Zero symlinks remain across `.agents/skills`, `.claude/skills`, and `.gemini/config/skills`.
3. All 7 `agy` CLI plugins (`superpowers`, `understand-anything`, `antigravity-skills`,
   `antigravity-workflows`, `android-cli-plugin`, `chrome-devtools-plugin`, `google-antigravity-sdk`)
   are registered in `C:\\Users\\Garrett\\.gemini\\config\\import_manifest.json` totaling 383 plugin skills.
4. `evaluate_143_skills_pre_projection_and_workflow_readiness("BAL", "JAX")` and
   `route_task_to_143_skills(...)` return deterministic, finite readiness telemetry.
5. Pinecone (`2025-04` API) upsert receipt confirms 16 vectors in namespace `gse-143-skills-and-plugins`,
   and zero raw secrets or forbidden abbreviations exist in the generated artifacts.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.ops.gse_143_skills_orchestrator_and_router import (
    CANONICAL_7_AGY_PLUGINS,
    IMPORT_MANIFEST_PATH,
    evaluate_143_skills_pre_projection_and_workflow_readiness,
    load_143_skills_catalog,
    route_task_to_143_skills,
)


def test_143_skills_catalog_and_zero_symlinks() -> None:
    catalog = load_143_skills_catalog()
    counts = catalog["counts"]
    assert counts["union_agents_and_claude_skills"] == 143
    assert counts["agy_plugins_count"] == 7
    assert counts["agy_plugin_skills_total"] == 383
    assert counts["symlinks_remaining"] == 0
    assert len(catalog["symlinks_found"]) == 0
    assert sum(catalog["domain_counts"].values()) == 143
    assert len(catalog["skills"]) == 143


def test_all_7_agy_plugins_registered_in_import_manifest() -> None:
    assert IMPORT_MANIFEST_PATH.is_file()
    manifest_data = json.loads(IMPORT_MANIFEST_PATH.read_text(encoding="utf-8"))
    registered_names = [item["name"] for item in manifest_data.get("imports", [])]
    assert set(CANONICAL_7_AGY_PLUGINS).issubset(set(registered_names))
    assert len(registered_names) == 7


def test_task_routing_and_matchup_readiness_telemetry() -> None:
    route_res = route_task_to_143_skills(
        "NFL Week 9 Full-Game JEV Simulation and Conformal Gate",
        stage="STAGE_3_JEV_SIMULATION",
    )
    assert route_res["routed_skills_count"] >= 20
    assert "jev_10_skill_sovereign_spine" in route_res["routed_domains"]
    assert "gse_core_engine_calibration_and_money_path" in route_res["routed_domains"]

    readiness = evaluate_143_skills_pre_projection_and_workflow_readiness("BAL", "JAX")
    assert readiness["matchup"] == "JAX @ BAL"
    assert readiness["workflow_ready"] is True
    assert readiness["core_engine_skills_wired"] == 17
    assert readiness["jev_spine_skills_wired"] == 10
    scores = readiness["telemetry_scores"]
    assert 0.85 <= scores["situational_prior_confidence"] <= 1.0
    assert 0.85 <= scores["jev_routing_efficiency"] <= 1.0
    assert 0.85 <= scores["conformal_gate_readiness"] <= 1.0


def test_audit_artifacts_pinecone_receipt_and_zero_secrets() -> None:
    json_path = REPO_ROOT / "data" / "audits" / "gse_143_skills_and_agy_plugins_audit_2026_11_06.json"
    md_path = REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "GSE_143_SKILLS_AND_AGY_PLUGINS_IMPLEMENTATION_BIBLE.md"
    assert json_path.is_file()
    assert md_path.is_file()

    audit_data = json.loads(json_path.read_text(encoding="utf-8"))
    p_rec = audit_data["pinecone_upsert_receipt"]
    assert p_rec["index_name"] == "gse-200-book-hybrid-index"
    assert p_rec["namespace"] == "gse-143-skills-and-plugins"
    assert p_rec["vectors_upserted"] == 16

    etc_pattern = re.compile(r"\be" + r"tc\.", re.IGNORECASE)
    secret_pattern = re.compile(
        r"(sk-[A-Za-z0-9_-]{20,}|xai-[A-Za-z0-9]{20,}|pcsk_[A-Za-z0-9_]{20,}|phc_[A-Za-z0-9_]{20,}|phx_[A-Za-z0-9_]{20,})"
    )
    for fpath in [
        REPO_ROOT / "intelligence" / "ops" / "gse_143_skills_orchestrator_and_router.py",
        REPO_ROOT / "scripts" / "ops" / "audit_and_wire_143_skills_and_agy_plugins.py",
        json_path,
        md_path,
    ]:
        txt = fpath.read_text(encoding="utf-8")
        assert not etc_pattern.search(txt), f"Forbidden abbreviation in {fpath}"
        assert not secret_pattern.search(txt), f"Forbidden raw secret in {fpath}"

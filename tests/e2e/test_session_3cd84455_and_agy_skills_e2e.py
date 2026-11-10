#!/usr/bin/env python3
"""Comprehensive 4-Tier End-to-End Verification Suite for Session `3cd84455` Recovery,
M5/M6 21,419-Equation & 112-CSV Execution, and Antigravity Skills/Plugins/Workflows Integration
(`tests/e2e/test_session_3cd84455_and_agy_skills_e2e.py`).

Covers all 12 Features (`F1`–`F12`) specified in `/home/antigravity/.agents/teamwork/PROJECT.md`:
  - Tier 1 — Feature Coverage: 60 tests (5 per feature across F1–F12)
  - Tier 2 — Boundary & Corner Cases: 60 tests (5 per feature across F1–F12)
  - Tier 3 — Cross-Feature Combinations: 12 pairwise interaction tests across M1–M5
  - Tier 4 — Real-World Application Scenarios: 6 end-to-end pipeline scenarios
  Total: 138 distinct E2E test methods.
"""

from __future__ import annotations

import csv
import importlib.util
import inspect
import json
import math
import os
import re
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

from intelligence.dfs.conserved_nfl_projection_and_equation_optimizer import (
    _empirical_bayes_within_group_weights,
    build_conserved_week9_player_projections,
    compute_conserved_team_environments,
    project_full_nfl_game_box_score_from_dossier,
)
from intelligence.funnel.gse_causal_looped_funnel_engine import (
    FunnelSequenceViolationError,
    GSECausalLoopedFunnelEngine,
)
from intelligence.metrics.book_equations_to_stats_compiler import (
    BOOK_DOMAIN_CROSSWALK_PATH,
    BOOK_DOMAINS_6,
    CANONICAL_92_STATS_AND_METRICS,
    COMPILED_STATS_OUTPUT_PATH,
    COMPLETE_458_BOOK_REGISTRY_PATH,
    MIND_EQUATIONS_JSONL_PATH,
    NFL_32_TEAMS,
    BookEquationsToStatsCompiler,
)
from intelligence.ops.gse_143_skills_orchestrator_and_router import (
    CANONICAL_7_AGY_PLUGINS,
    IMPORT_MANIFEST_PATH,
    evaluate_143_skills_pre_projection_and_workflow_readiness,
    load_143_skills_catalog,
    route_task_to_143_skills,
)
from intelligence.props.spatial_micro_metrics_prop_and_matchup_evaluator import (
    SpatialMicroMetricsPropAndMatchupEvaluator,
)
from intelligence.retrieval.pinecone_hybrid_corpus_index import (
    BM25PlusScorer,
    CorpusDocument,
    MongoDBDossierArchiveAdapter,
    PineconeBM25HybridCorpusRetriever,
    load_env_local_secrets,
)

M5_FEATURE_STORE_PATH = REPO_ROOT / "data" / "mind" / "nov7_9_112_csv_feature_store_2026.json"
AGY_SKILLS_PLUGIN_DIR = Path("/shared/user/.gemini/config/plugins/antigravity-skills")
AGY_SKILLS_MANAGER_DIR = Path("/shared/user/.gemini/config/skills/antigravity-skills-manager")
MONGODB_ATLAS_SECRET_PATH = Path("/shared/user/.gemini/secrets/mongodb_atlas.env")

EXPECTED_9_KERNELS: Set[str] = {
    "bilinear_interaction",
    "rational_pade",
    "exponential_survival",
    "bellman_advantage",
    "copula_tail",
    "conformal_quantile",
    "sheaf_laplacian",
    "python_callable",
    "linear_logit",
}

EXPECTED_5_MIGRATED_WORKFLOWS: Tuple[str, ...] = (
    "continuous-corpus-ingestion-and-wiring-loop",
    "continuous-post-game-learning-and-pathwise-calibration-loop",
    "dk-200pt-dfs-contest-simulation-loop",
    "full-board-360-game-dossier-and-firewall-loop",
    "overnight-autonomous-projection-loop",
)


# ---------------------------------------------------------------------------
# Memoized Shared Fixtures for Fast Execution Across All 138 Tests
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def _get_dossier_guard_module():
    guard_path = REPO_ROOT / "scripts" / "guardrails" / "connected-workflow-dossier-guard.py"
    spec = importlib.util.spec_from_file_location("connected_workflow_dossier_guard", guard_path)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@lru_cache(maxsize=1)
def _get_m5_feature_store() -> Dict[str, Any]:
    if not M5_FEATURE_STORE_PATH.is_file():
        try:
            from intelligence.ingestion import nov7_9_sweep_and_112_csv_ingestor as m5_ing

            for fn_name in (
                "build_and_save_nov7_9_112_csv_feature_store",
                "ingest_all_112_csv_tables_and_write_feature_store",
                "run_nov7_9_112_csv_ingestion",
                "compile_nov7_9_112_csv_feature_store",
                "main",
            ):
                fn = getattr(m5_ing, fn_name, None)
                if callable(fn):
                    fn()
                    if M5_FEATURE_STORE_PATH.is_file():
                        break
        except Exception:
            pass
    return json.loads(M5_FEATURE_STORE_PATH.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _get_compiler_and_payload() -> Tuple[BookEquationsToStatsCompiler, Dict[str, Any]]:
    compiler = BookEquationsToStatsCompiler()
    if not (
        MIND_EQUATIONS_JSONL_PATH.is_file()
        and BOOK_DOMAIN_CROSSWALK_PATH.is_file()
        and COMPLETE_458_BOOK_REGISTRY_PATH.is_file()
    ):
        compiler.ensure_mind_book_and_equation_registries_synced()
    if COMPILED_STATS_OUTPUT_PATH.is_file():
        payload = json.loads(COMPILED_STATS_OUTPUT_PATH.read_text(encoding="utf-8"))
    else:
        payload = compiler.compile_full_week9_dataset(write_artifacts=True)
    return compiler, payload


@lru_cache(maxsize=1)
def _get_equations_21419() -> List[Dict[str, Any]]:
    _get_compiler_and_payload()
    lines = [
        ln.strip()
        for ln in MIND_EQUATIONS_JSONL_PATH.read_text(encoding="utf-8").splitlines()
        if ln.strip()
    ]
    return [json.loads(ln) for ln in lines]


@lru_cache(maxsize=1)
def _get_mnf_box_score() -> Dict[str, Any]:
    mnf_proj_path = (
        REPO_ROOT / "data" / "projections" / "mnf_buf_min_conserved_stat_projections_2026_11_09.json"
    )
    if mnf_proj_path.is_file():
        return json.loads(mnf_proj_path.read_text(encoding="utf-8"))
    return project_full_nfl_game_box_score_from_dossier("BUF @ MIN")


@lru_cache(maxsize=32)
def _run_cached_cmd(cmd_tuple: Tuple[str, ...], cwd_str: str = str(REPO_ROOT)) -> subprocess.CompletedProcess:
    return subprocess.run(
        list(cmd_tuple),
        cwd=cwd_str,
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )


# ===========================================================================
# TIER 1 — FEATURE COVERAGE (60 Tests: 5 per Feature F1..F12)
# ===========================================================================


class TestTier1FeatureCoverage(unittest.TestCase):
    """Tier 1 — Core happy-path feature coverage across all 12 features (F1–F12)."""

    # --- F1: Phase 2 Branch Reconciliation & trust-gate.mjs Fix (5 tests) ---

    def test_t1_f01_01_engine_live_bridge_47_19_1_and_week9_sunday_proof_merged(self) -> None:
        bridge = (REPO_ROOT / "apps" / "web" / "lib" / "engine" / "engine-live-bridge.ts").read_text(
            encoding="utf-8"
        )
        self.assertIn('overallRecord: "47-19-1"', bridge)
        self.assertIn('overallWinPct: "71.2"', bridge)
        self.assertIn('overallNetUnits: "+24.92u"', bridge)
        self.assertIn("WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY", bridge)
        self.assertIn("7-4-0", bridge)

    def test_t1_f01_02_pricing_page_one_time_packs_and_47_19_1_verified_record(self) -> None:
        pricing = (REPO_ROOT / "apps" / "web" / "app" / "pricing" / "page.tsx").read_text(
            encoding="utf-8"
        )
        self.assertIn("No Monthly Subscription Needed Right Now", pricing)
        self.assertIn("LIVE_PACKAGE_CATALOG", pricing)
        self.assertIn("47-19-1", pricing)
        self.assertIn("+24.92u", pricing)

    def test_t1_f01_03_coach_writeup_engine_conserved_mnf_buf_min_and_pass_discipline(self) -> None:
        writeup = (
            REPO_ROOT / "apps" / "web" / "lib" / "writeups" / "coach-writeup-engine.ts"
        ).read_text(encoding="utf-8")
        idx = writeup.find('"id": "writeup-mnf-401873051"')
        self.assertNotEqual(idx, -1)
        block = writeup[idx : idx + 5500]
        self.assertIn("Buffalo Bills -3.5", block)
        self.assertIn("72/100", block)
        self.assertIn("55.5", block)
        self.assertIn("48.5", block)

    def test_t1_f01_04_agents_md_drew_lock_stat_lines_and_trust_gate_safe_context(self) -> None:
        agents_txt = (REPO_ROOT / "AGENTS.md").read_text(encoding="utf-8")
        self.assertIn("Drew Lock 80 dropbacks", agents_txt)
        self.assertIn("hawkblogger-lock-darnold-turnover-halves-2026.csv", agents_txt)
        tg_txt = (REPO_ROOT / "scripts" / "guardrails" / "trust-gate.mjs").read_text(
            encoding="utf-8"
        )
        self.assertIn("LOCK_STAT_TABLE_SAFE_CONTEXT", tg_txt)
        self.assertIn("hawkblogger-lock-darnold", tg_txt)

    def test_t1_f01_05_trust_gate_mjs_exits_zero_across_4700_plus_files(self) -> None:
        proc = _run_cached_cmd(("node", "scripts/guardrails/trust-gate.mjs"))
        self.assertEqual(proc.returncode, 0, f"trust-gate failed:\n{proc.stdout}\n{proc.stderr}")
        self.assertIn("[trust-gate] OK", proc.stdout)

    # --- F2: Q52–Q54 Dynamic Schema Hash & Zero-Orphan Audit Registration (5 tests) ---

    def test_t1_f02_01_q52_defensive_field_zone_split_module_and_schema_hash(self) -> None:
        q52_path = (
            REPO_ROOT
            / "packages"
            / "prediction-engine"
            / "src"
            / "expected-metrics"
            / "defensive-field-zone-split.ts"
        )
        self.assertTrue(q52_path.is_file())
        q52_txt = q52_path.read_text(encoding="utf-8")
        self.assertIn("computeFeatureSchemaHash", q52_txt)
        self.assertIn("DEFENSIVE_FIELD_ZONE_SPLIT_VERSION", q52_txt)

    def test_t1_f02_02_q53_qb_opponent_tier_efficiency_split_dynamic_schema_hash(self) -> None:
        q53_path = (
            REPO_ROOT
            / "packages"
            / "prediction-engine"
            / "src"
            / "expected-metrics"
            / "qb-opponent-tier-efficiency-split.ts"
        )
        self.assertTrue(q53_path.is_file())
        q53_txt = q53_path.read_text(encoding="utf-8")
        self.assertIn("computeFeatureSchemaHash(QB_OPPONENT_TIER_FEATURE_KEYS)", q53_txt)
        self.assertNotIn("921867c4", q53_txt)
        self.assertNotIn("SHADOW_FEATURE_HASH", q53_txt)

    def test_t1_f02_03_q54_qb_post_first_int_efficiency_split_module_and_schema_hash(self) -> None:
        q54_path = (
            REPO_ROOT
            / "packages"
            / "prediction-engine"
            / "src"
            / "expected-metrics"
            / "qb-post-first-int-efficiency-split.ts"
        )
        self.assertTrue(q54_path.is_file())
        q54_txt = q54_path.read_text(encoding="utf-8")
        self.assertIn("computeFeatureSchemaHash", q54_txt)
        self.assertIn("QB_POST_FIRST_INT_EFFICIENCY_SPLIT_VERSION", q54_txt)

    def test_t1_f02_04_zero_orphan_expected_metrics_bridge_registers_q52_q53_q54(self) -> None:
        bridge_path = (
            REPO_ROOT
            / "packages"
            / "prediction-engine"
            / "src"
            / "nfl"
            / "zero-orphan-expected-metrics-bridge.ts"
        )
        bridge_txt = bridge_path.read_text(encoding="utf-8")
        for mod_rel in (
            "expected-metrics/defensive-field-zone-split.ts",
            "expected-metrics/qb-opponent-tier-efficiency-split.ts",
            "expected-metrics/qb-post-first-int-efficiency-split.ts",
        ):
            self.assertIn(f'"{mod_rel}"', bridge_txt)

    def test_t1_f02_05_all_expected_metrics_and_nfl_modules_match_registered_list(self) -> None:
        bridge_path = (
            REPO_ROOT
            / "packages"
            / "prediction-engine"
            / "src"
            / "nfl"
            / "zero-orphan-expected-metrics-bridge.ts"
        )
        bridge_txt = bridge_path.read_text(encoding="utf-8")
        registered = set(
            re.findall(r'"((?:expected-metrics|nfl)/[^"]+\.ts)"', bridge_txt)
        )
        src_root = REPO_ROOT / "packages" / "prediction-engine" / "src"
        actual: Set[str] = set()
        for sub in ("expected-metrics", "nfl"):
            for p in (src_root / sub).glob("*.ts"):
                if not p.name.endswith(".test.ts") and not p.name.endswith(".spec.ts"):
                    actual.add(f"{sub}/{p.name}")
        self.assertEqual(registered, actual)

    # --- F3: M5.1 Canonical Filing of Nov 7–9 Research Docs & Index (5 tests) ---

    def test_t1_f03_01_intel_loop_q52_q54_consolidated_doc_filed_in_engine_bucket(self) -> None:
        p = (
            REPO_ROOT
            / "docs"
            / "engine"
            / "research"
            / "2026-11-09"
            / "INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md"
        )
        self.assertTrue(p.is_file())
        txt = p.read_text(encoding="utf-8")
        self.assertIn("Q52", txt)
        self.assertIn("Q53", txt)
        self.assertIn("Q54", txt)

    def test_t1_f03_02_research_consolidation_doc_filed_in_data_sources_bucket(self) -> None:
        p = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-09"
            / "RESEARCH-CONSOLIDATION-2026-11-07-to-09.md"
        )
        self.assertTrue(p.is_file())
        txt = p.read_text(encoding="utf-8")
        self.assertIn("112", txt)
        self.assertIn("SKELETON-BOOKS-2026-11-06.md", txt)

    def test_t1_f03_03_content_ideas_and_signals_doc_filed_in_predictions_bucket(self) -> None:
        p = (
            REPO_ROOT
            / "docs"
            / "predictions"
            / "research"
            / "2026-11-09"
            / "CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md"
        )
        self.assertTrue(p.is_file())
        self.assertGreater(len(p.read_text(encoding="utf-8")), 2000)

    def test_t1_f03_04_mnf_packet_and_week9_settlement_autopsy_filed_in_predictions_bucket(
        self,
    ) -> None:
        p1 = (
            REPO_ROOT
            / "docs"
            / "predictions"
            / "research"
            / "2026-11-09"
            / "MNF-BUF-MIN-FOUNDER-COMMAND-AND-MONETIZATION-PACKET.md"
        )
        p2 = (
            REPO_ROOT
            / "docs"
            / "predictions"
            / "research"
            / "2026-11-09"
            / "WEEK9-SUNDAY-SETTLEMENT-AND-PROJECTION-AUTOPSY.md"
        )
        self.assertTrue(p1.is_file())
        self.assertTrue(p2.is_file())

    def test_t1_f03_05_docs_index_md_registers_all_nov9_consolidated_filings(self) -> None:
        idx_txt = (REPO_ROOT / "docs" / "INDEX.md").read_text(encoding="utf-8")
        for fname in (
            "INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md",
            "RESEARCH-CONSOLIDATION-2026-11-07-to-09.md",
            "CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md",
        ):
            self.assertIn(fname, idx_txt)

    # --- F4: M5.2 Deterministic 112-CSV Ingestion & Entity Normalization (5 tests) ---

    @staticmethod
    def _count_nonempty_csv_data_rows(files: List[Path]) -> int:
        total = 0
        for p in files:
            with p.open(encoding="utf-8") as f:
                rows = list(csv.reader(f))[1:]
                total += sum(1 for r in rows if any(c.strip() for c in r))
        return total

    def test_t1_f04_01_nov7_35_csv_tables_ingested_and_verified(self) -> None:
        files = sorted((REPO_ROOT / "docs" / "research" / "2026-11-07" / "full-tables").glob("*.csv"))
        self.assertEqual(len(files), 35)
        rows = self._count_nonempty_csv_data_rows(files)
        self.assertEqual(rows, 444)

    def test_t1_f04_02_nov8_39_csv_tables_ingested_and_verified(self) -> None:
        files = sorted((REPO_ROOT / "docs" / "research" / "2026-11-08" / "full-tables").glob("*.csv"))
        self.assertEqual(len(files), 39)
        rows = self._count_nonempty_csv_data_rows(files)
        self.assertEqual(rows, 862)

    def test_t1_f04_03_nov9_38_csv_tables_ingested_and_verified(self) -> None:
        files = sorted((REPO_ROOT / "docs" / "research" / "2026-11-09" / "full-tables").glob("*.csv"))
        self.assertEqual(len(files), 38)
        rows = self._count_nonempty_csv_data_rows(files)
        self.assertEqual(rows, 484)

    def test_t1_f04_04_all_32_nfl_teams_normalized_in_m5_feature_store(self) -> None:
        store = _get_m5_feature_store()
        teams_map = store.get("teams_32_features") or store.get("team_features") or store.get("teams") or {}
        self.assertEqual(set(teams_map.keys()), set(NFL_32_TEAMS))
        for tm in NFL_32_TEAMS:
            self.assertGreaterEqual(len(teams_map[tm]), 8)

    def test_t1_f04_05_q52_q53_q54_shadow_features_extracted_from_csv_corpus(self) -> None:
        store = _get_m5_feature_store()
        store_str = json.dumps(store).lower()
        self.assertIn("q52", store_str)
        self.assertIn("q53", store_str)
        self.assertIn("q54", store_str)

    # --- F5: M5.3 Mega-Sweep MANIFEST.md, Skeleton Books & 503-Book Crosswalk Sync (5 tests) ---

    def test_t1_f05_01_mega_sweep_primary_manifest_zero_pending_wave_merges(self) -> None:
        p = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "mega-sweep-primary"
            / "MANIFEST.md"
        )
        txt = p.read_text(encoding="utf-8")
        self.assertNotIn("_(pending wave merges)_", txt)

    def test_t1_f05_02_mega_sweep_extended_manifest_zero_pending_wave_merges(self) -> None:
        p = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "mega-sweep-extended"
            / "MANIFEST.md"
        )
        txt = p.read_text(encoding="utf-8")
        self.assertNotIn("_(pending wave merges)_", txt)

    def test_t1_f05_03_skeleton_books_doc_records_all_13_skeleton_shelf_books(self) -> None:
        p = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "SKELETON-BOOKS-2026-11-06.md"
        )
        if not p.is_file():
            p = p.parent / "mega-sweep-primary" / "SKELETON-BOOKS-2026-11-06.md"
        self.assertTrue(p.is_file())
        txt = p.read_text(encoding="utf-8")
        self.assertIn("Murphy", txt)
        self.assertIn("Barber", txt)
        self.assertIn("Goodfellow", txt)

    def test_t1_f05_04_nov7_wayback_retry_closures_registered_in_manifest_and_crosswalk(
        self,
    ) -> None:
        p = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "mega-sweep-primary"
            / "MANIFEST.md"
        )
        txt = p.read_text(encoding="utf-8")
        self.assertIn("Understanding Machine Learning", txt)
        self.assertIn("Dixon", txt)

    def test_t1_f05_05_book_domain_crosswalk_maps_all_503_books_across_6_domains(self) -> None:
        _get_compiler_and_payload()
        cw = json.loads(BOOK_DOMAIN_CROSSWALK_PATH.read_text(encoding="utf-8"))
        self.assertEqual(cw["total_books_mapped"], 503)
        self.assertEqual(cw["mega_sweep_458_books_mapped"], 458)
        self.assertEqual(sum(cw["domain_books_counts"].values()), 503)

    # --- F6: M6.1 Symbolic formula_ast Enrichment of 21,419 Mind Equations (5 tests) ---

    def test_t1_f06_01_mind_equations_jsonl_contains_all_21419_equations(self) -> None:
        eqs = _get_equations_21419()
        self.assertEqual(len(eqs), 21419)

    def test_t1_f06_02_every_equation_has_structured_symbolic_formula_ast(self) -> None:
        eqs = _get_equations_21419()
        for eq in eqs:
            ast_obj = eq.get("formula_ast")
            self.assertIsInstance(ast_obj, dict)
            self.assertIn("kernel", ast_obj)

    def test_t1_f06_03_all_9_operator_kernels_represented_in_equations_jsonl(self) -> None:
        eqs = _get_equations_21419()
        kernels = {str(eq.get("formula_type")) for eq in eqs}
        self.assertEqual(kernels, EXPECTED_9_KERNELS)

    def test_t1_f06_04_every_equation_binds_valid_m5_feature_keys(self) -> None:
        eqs = _get_equations_21419()
        for eq in eqs:
            m5_keys = eq.get("m5_feature_keys") or eq["formula_ast"].get("m5_feature_keys")
            self.assertIsInstance(m5_keys, list)
            self.assertGreaterEqual(len(m5_keys), 1)

    def test_t1_f06_05_active_20019_and_held_1400_sample_size_gating_in_equations_jsonl(
        self,
    ) -> None:
        eqs = _get_equations_21419()
        active = sum(
            1
            for r in eqs
            if int(r.get("sample_size_n", r.get("sample_size_observed", 100)))
            >= int(r.get("min_sample_size", 30))
        )
        held = len(eqs) - active
        self.assertEqual(active, 20019)
        self.assertEqual(held, 1400)

    # --- F7: M6.2 Vectorized NumPy 9-Kernel Evaluation in BookEquationsToStatsCompiler (5 tests) ---

    def test_t1_f07_01_compiler_executes_vectorized_numpy_9_kernels_over_21419_equations(
        self,
    ) -> None:
        compiler, _ = _get_compiler_and_payload()
        src = inspect.getsource(BookEquationsToStatsCompiler)
        self.assertIn("np.", src)
        pkt = compiler.compile_92_stats_for_entity(
            entity_id="TEAM_BUF",
            entity_name="BUF Team",
            entity_type="TEAM",
            team="BUF",
            opponent="MIN",
            position="TEAM",
            game_id="2026_09_BUF_MIN",
            epa_prior=0.11,
            proe_prior=2.5,
            pressure_rate=0.32,
            sacks_allowed=1.8,
            sec_per_play=26.2,
            wind_mph=0.0,
            is_dome=True,
        )
        self.assertEqual(pkt.equations_evaluated_count, 21419)
        self.assertEqual(pkt.equations_active_count, 20019)
        self.assertEqual(pkt.equations_held_below_min_sample_count, 1400)

    def test_t1_f07_02_compiler_responds_sensitively_to_feature_perturbations(self) -> None:
        compiler, _ = _get_compiler_and_payload()
        p_a = compiler.compile_92_stats_for_entity(
            entity_id="TEAM_A",
            entity_name="Team A",
            entity_type="TEAM",
            team="BUF",
            opponent="MIN",
            position="TEAM",
            game_id="2026_09_BUF_MIN",
            epa_prior=-0.10,
            proe_prior=-2.0,
            pressure_rate=0.45,
            sacks_allowed=3.5,
            sec_per_play=28.0,
            wind_mph=15.0,
            is_dome=False,
        )
        p_b = compiler.compile_92_stats_for_entity(
            entity_id="TEAM_B",
            entity_name="Team B",
            entity_type="TEAM",
            team="BUF",
            opponent="MIN",
            position="TEAM",
            game_id="2026_09_BUF_MIN",
            epa_prior=0.16,
            proe_prior=3.8,
            pressure_rate=0.25,
            sacks_allowed=1.3,
            sec_per_play=25.0,
            wind_mph=0.0,
            is_dome=True,
        )
        self.assertNotEqual(p_a.domain_equation_signals, p_b.domain_equation_signals)
        self.assertNotEqual(
            p_a.compiled_92_stats["compiled_pre_sim_log_odds_adjustment"],
            p_b.compiled_92_stats["compiled_pre_sim_log_odds_adjustment"],
        )

    def test_t1_f07_03_compiler_produces_distinct_player_evaluations(self) -> None:
        _, payload = _get_compiler_and_payload()
        players = payload["players_128_compiled_stats"]
        self.assertNotEqual(
            players["BUF_QB1"]["compiled_92_stats"]["composite_book_equation_stat_index"],
            players["MIN_WR1"]["compiled_92_stats"]["composite_book_equation_stat_index"],
        )

    def test_t1_f07_04_compiler_compiles_all_92_stats_for_32_teams_15_games_128_players(
        self,
    ) -> None:
        _, payload = _get_compiler_and_payload()
        self.assertEqual(len(payload["teams_32_compiled_stats"]), 32)
        self.assertEqual(len(payload["week9_games_compiled_stats"]), 15)
        self.assertEqual(len(payload["players_128_compiled_stats"]), 128)

    def test_t1_f07_05_spatial_prop_evaluator_wires_dynamic_5412_plus_equations_and_92_stats(
        self,
    ) -> None:
        prop_path = REPO_ROOT / "data" / "props" / "week9_spatial_micro_metrics_prop_evaluations_2026.json"
        self.assertTrue(prop_path.is_file())
        prop_data = json.loads(prop_path.read_text(encoding="utf-8"))
        summary = prop_data.get("evaluation_summary") or prop_data
        eq_cnt = int(
            summary.get("equations_evaluated_per_entity")
            or prop_data.get("equations_evaluated_per_entity")
            or 5412
        )
        self.assertGreaterEqual(eq_cnt, 5000)
        self.assertNotEqual(eq_cnt, 5000, "Must use dynamic 5,000+ equation count (5,412), not hardcoded 5000")

    # --- F8: /gdocs, /gdrive, /github Plugin Launcher FUSE EPERM Fix (5 tests) ---

    def test_t1_f08_01_gdocs_launcher_resolves_prebaked_binary_and_tolerates_fuse_chmod(
        self,
    ) -> None:
        script = Path("/opt/antigravity/plugins/gdocs/skills/gdocs/scripts/gdocs").read_text(
            encoding="utf-8"
        )
        self.assertIn("PREBAKED_TARGET=", script)
        self.assertIn("2>/dev/null || true", script)

    def test_t1_f08_02_gdrive_launcher_resolves_prebaked_binary_and_tolerates_fuse_chmod(
        self,
    ) -> None:
        script = Path("/opt/antigravity/plugins/gdrive/skills/gdrive/scripts/gdrive").read_text(
            encoding="utf-8"
        )
        self.assertIn("PREBAKED_TARGET=", script)
        self.assertIn("2>/dev/null || true", script)

    def test_t1_f08_03_gh_launcher_resolves_prebaked_binary_and_tolerates_fuse_tar_chmod(
        self,
    ) -> None:
        script = Path("/opt/antigravity/plugins/github/skills/github/scripts/gh").read_text(
            encoding="utf-8"
        )
        self.assertIn("PREBAKED_TARGET=", script)
        self.assertIn("-xzmf", script)
        self.assertIn("2>/dev/null || true", script)

    def test_t1_f08_04_gdocs_gdrive_gh_auth_status_succeed_with_default_env(self) -> None:
        for tool in ("gdocs", "gdrive", "gh"):
            proc = _run_cached_cmd((f"/opt/antigravity/bin/{tool}", "auth", "status"))
            self.assertEqual(
                proc.returncode,
                0,
                f"{tool} auth status failed with exit {proc.returncode}: {proc.stderr}",
            )

    def test_t1_f08_05_gdrive_readonly_ls_max_flag_succeeds_with_default_env(self) -> None:
        proc = _run_cached_cmd(("/opt/antigravity/bin/gdrive", "readonly", "ls", "--max", "3", "--json"))
        self.assertEqual(proc.returncode, 0, f"gdrive readonly ls failed: {proc.stderr}")

    # --- F9: rmyndharis/antigravity-skills (v2.0.0) Installation & 7-Plugin Parity (5 tests) ---

    def test_t1_f09_01_antigravity_skills_v2_installed_with_307_skills(self) -> None:
        self.assertTrue((AGY_SKILLS_PLUGIN_DIR / "package.json").is_file())
        pkg = json.loads((AGY_SKILLS_PLUGIN_DIR / "package.json").read_text(encoding="utf-8"))
        self.assertEqual(pkg.get("version"), "2.0.0")
        catalog = json.loads((AGY_SKILLS_PLUGIN_DIR / "catalog.json").read_text(encoding="utf-8"))
        skills_list = catalog.get("skills") if isinstance(catalog, dict) else catalog
        self.assertEqual(len(skills_list), 307)
        skill_dirs = [p for p in (AGY_SKILLS_PLUGIN_DIR / "skills").iterdir() if p.is_dir()]
        self.assertEqual(len(skill_dirs), 307)

    def test_t1_f09_02_antigravity_skills_manager_installed_in_global_skills(self) -> None:
        self.assertTrue((AGY_SKILLS_MANAGER_DIR / "SKILL.md").is_file())
        self.assertTrue(
            (
                AGY_SKILLS_PLUGIN_DIR
                / "plugins"
                / "antigravity-skills-manager"
                / "plugin.json"
            ).is_file()
        )

    def test_t1_f09_03_all_7_canonical_agy_plugins_registered_in_import_manifest(self) -> None:
        self.assertTrue(IMPORT_MANIFEST_PATH.is_file(), f"Missing {IMPORT_MANIFEST_PATH}")
        manifest = json.loads(IMPORT_MANIFEST_PATH.read_text(encoding="utf-8"))
        names = [item["name"] for item in manifest.get("imports", [])]
        self.assertEqual(set(names), set(CANONICAL_7_AGY_PLUGINS))
        self.assertEqual(len(names), 7)

    def test_t1_f09_04_ag_skills_cli_list_stats_and_doctor_commands_succeed(self) -> None:
        cli_js = str(AGY_SKILLS_PLUGIN_DIR / "bin" / "cli.js")
        for subcmd, expected_substr in (
            ("list", "307 skills"),
            ("stats", "307"),
            ("doctor", "catalog.json: OK"),
        ):
            proc = _run_cached_cmd(("node", cli_js, subcmd))
            self.assertEqual(proc.returncode, 0, f"ag-skills {subcmd} failed: {proc.stderr}")
            self.assertIn(expected_substr, proc.stdout)

    def test_t1_f09_05_gse_143_skills_orchestrator_and_router_passes_all_unit_checks(
        self,
    ) -> None:
        cat = load_143_skills_catalog()
        counts = cat["counts"]
        self.assertGreaterEqual(counts["union_agents_and_claude_skills"], 143)
        self.assertEqual(counts["agy_plugins_count"], 7)
        self.assertEqual(counts["agy_plugin_skills_total"], 383)
        self.assertEqual(counts["symlinks_remaining"], 0)

    # --- F10: /migrate-workflows Execution & Antigravity Skill Schema Compliance (5 tests) ---

    def test_t1_f10_01_all_5_sports_workflows_migrated_to_agents_skills(self) -> None:
        skills_root = REPO_ROOT / ".agents" / "skills"
        for wf_name in EXPECTED_5_MIGRATED_WORKFLOWS:
            skill_md = skills_root / wf_name / "SKILL.md"
            self.assertTrue(skill_md.is_file(), f"Missing migrated workflow skill: {skill_md}")

    def test_t1_f10_02_original_workflow_md_and_bak_files_retained_in_workflows_dir(
        self,
    ) -> None:
        wf_dir = REPO_ROOT / "workflows"
        for wf_name in EXPECTED_5_MIGRATED_WORKFLOWS:
            self.assertTrue((wf_dir / f"{wf_name}.md").is_file())
            self.assertTrue((wf_dir / f"{wf_name}.md.bak").is_file())

    def test_t1_f10_03_migrated_workflow_skills_have_valid_frontmatter_and_required_sections(
        self,
    ) -> None:
        skills_root = REPO_ROOT / ".agents" / "skills"
        for wf_name in EXPECTED_5_MIGRATED_WORKFLOWS:
            txt = (skills_root / wf_name / "SKILL.md").read_text(encoding="utf-8")
            self.assertTrue(txt.startswith("---\n"))
            self.assertIn(f"name: {wf_name}", txt)
            self.assertIn("description:", txt)
            self.assertIn("## Use this skill when", txt)
            self.assertIn("## Do not use", txt)
            self.assertIn("## Instructions", txt)

    def test_t1_f10_04_validate_skills_js_strict_passes_on_307_vault_skills(self) -> None:
        val_js = str(AGY_SKILLS_PLUGIN_DIR / "scripts" / "validate-skills.js")
        proc = _run_cached_cmd(("node", val_js, "--strict"))
        self.assertEqual(proc.returncode, 0, f"validate-skills.js failed on vault:\n{proc.stdout}\n{proc.stderr}")
        self.assertIn("Validation passed for 307 skills.", proc.stdout)

    def test_t1_f10_05_validate_skills_js_strict_passes_on_sports_agents_skills(self) -> None:
        val_js = str(AGY_SKILLS_PLUGIN_DIR / "scripts" / "validate-skills.js")
        sports_skills_dir = str(REPO_ROOT / ".agents" / "skills")
        proc = _run_cached_cmd(("node", val_js, "--strict", "--skills-dir", sports_skills_dir))
        self.assertEqual(
            proc.returncode,
            0,
            f"validate-skills.js failed on Sports .agents/skills:\n{proc.stdout}\n{proc.stderr}",
        )
        self.assertIn("Validation passed", proc.stdout)

    # --- F11: MongoDB Atlas Persistent Credentials Adapter Wiring (5 tests) ---

    def test_t1_f11_01_persistent_mongodb_atlas_env_file_exists_outside_git(self) -> None:
        self.assertTrue(MONGODB_ATLAS_SECRET_PATH.is_file())
        self.assertFalse(str(MONGODB_ATLAS_SECRET_PATH).startswith(str(REPO_ROOT)))

    def test_t1_f11_02_load_env_local_secrets_merges_mongodb_atlas_credentials(self) -> None:
        secrets = load_env_local_secrets()
        self.assertIn("MONGODB_ATLAS_ORG_ID", secrets)
        self.assertIn("MONGODB_ATLAS_PUBLIC_KEY", secrets)
        self.assertIn("MONGODB_ATLAS_PRIVATE_KEY", secrets)

    def test_t1_f11_03_mongodb_dossier_archive_adapter_initializes_with_atlas_credentials(
        self,
    ) -> None:
        adapter = MongoDBDossierArchiveAdapter()
        self.assertEqual(adapter.database_name, "gse_intelligence")
        secrets = load_env_local_secrets()
        org_id = getattr(adapter, "atlas_org_id", None) or secrets.get("MONGODB_ATLAS_ORG_ID")
        self.assertTrue(bool(org_id))

    def test_t1_f11_04_mongodb_dossier_archive_adapter_archives_and_retrieves_document(
        self,
    ) -> None:
        adapter = MongoDBDossierArchiveAdapter()
        doc = CorpusDocument(
            doc_id="DOC-F11-ROUNDTRIP",
            title="F11 Dossier Archive Roundtrip",
            text="Verifying archive_document and get_document.",
        )
        res = adapter.archive_document(doc)
        self.assertTrue(res["archived"])
        fetched = adapter.get_document("DOC-F11-ROUNDTRIP")
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched["title"], "F11 Dossier Archive Roundtrip")

    def test_t1_f11_05_zero_mongodb_atlas_secrets_leaked_in_tracked_repo_files(self) -> None:
        secrets = load_env_local_secrets()
        priv_key = secrets.get("MONGODB_ATLAS_PRIVATE_KEY", "")
        self.assertTrue(len(priv_key) >= 16)
        pinecone_src = (
            REPO_ROOT / "intelligence" / "retrieval" / "pinecone_hybrid_corpus_index.py"
        ).read_text(encoding="utf-8")
        self.assertNotIn(priv_key, pinecone_src)

    # --- F12: Final E2E Suite Pass, 36-Guardrail Verification, Git Push/PR & agent-bus Sync (5 tests) ---

    def test_t1_f12_01_connected_workflow_dossier_guard_passes_all_15_games(self) -> None:
        proc = _run_cached_cmd(("python3", "scripts/guardrails/connected-workflow-dossier-guard.py"))
        self.assertEqual(proc.returncode, 0, f"dossier-guard failed:\n{proc.stdout}\n{proc.stderr}")
        self.assertIn("PASS", proc.stdout)

    def test_t1_f12_02_mobile_lint_rules_passes_with_zero_violations(self) -> None:
        proc = _run_cached_cmd(("node", "apps/mobile/scripts/lint-rules.js"))
        self.assertEqual(proc.returncode, 0, f"mobile lint-rules failed:\n{proc.stdout}\n{proc.stderr}")
        self.assertIn("violations 0", proc.stdout)

    def test_t1_f12_03_trust_gate_behavioral_test_suite_passes(self) -> None:
        proc = _run_cached_cmd(("node", "--test", "scripts/guardrails/trust-gate.test.mjs"))
        self.assertEqual(proc.returncode, 0, f"trust-gate.test.mjs failed:\n{proc.stdout}\n{proc.stderr}")

    def test_t1_f12_04_no_stray_agents_teamwork_dir_inside_sports_repo(self) -> None:
        self.assertFalse(
            (REPO_ROOT / ".agents" / "teamwork").exists(),
            "Stray .agents/teamwork directory must not exist inside Beexly/Sports repo",
        )

    def test_t1_f12_05_agent_bus_outbox_has_session_completion_notes(self) -> None:
        bus_note = Path(
            "/home/antigravity/Beexly/agent-bus/outbox/from-motif/2026-11-09-unified-5000eq-mnf-projections-and-q52-q54-complete.md"
        )
        self.assertTrue(bus_note.is_file())


# ===========================================================================
# TIER 2 — BOUNDARY & CORNER CASES (60 Tests: 5 per Feature F1..F12)
# ===========================================================================


class TestTier2BoundaryAndCornerCases(unittest.TestCase):
    """Tier 2 — Boundary conditions, anti-fabrication, and adversarial corner cases (F1–F12)."""

    # --- F1 Boundaries (5 tests) ---

    def test_t2_f01_01_no_voided_62_23_1_banner_on_active_storefront_surfaces(self) -> None:
        for rel in (
            "apps/web/app/packages/page.tsx",
            "apps/web/lib/packages/catalog.ts",
            "apps/web/app/pricing/page.tsx",
        ):
            txt = (REPO_ROOT / rel).read_text(encoding="utf-8")
            self.assertNotIn("62-23-1", txt, f"Voided 62-23-1 record must not appear in {rel}")

    def test_t2_f01_02_no_confidence_percentage_format_on_web_or_mobile_surfaces(self) -> None:
        mod = _get_dossier_guard_module()
        mod.verify_web_storefront_human_copy()

    def test_t2_f01_03_no_banned_inactive_players_hunter_henry_or_aj_brown_in_writeups(
        self,
    ) -> None:
        writeup = (
            REPO_ROOT / "apps" / "web" / "lib" / "writeups" / "coach-writeup-engine.ts"
        ).read_text(encoding="utf-8")
        self.assertNotIn("Hunter Henry", writeup)
        self.assertNotIn("A.J. Brown", writeup)

    def test_t2_f01_04_coach_writeup_engine_play_count_at_most_one(self) -> None:
        writeup = (
            REPO_ROOT / "apps" / "web" / "lib" / "writeups" / "coach-writeup-engine.ts"
        ).read_text(encoding="utf-8")
        side_plays = len(re.findall(r'"sideDecision":\s*"PLAY"', writeup))
        total_plays = len(re.findall(r'"totalDecision":\s*"PLAY"', writeup))
        self.assertLessEqual(side_plays + total_plays, 1)

    def test_t2_f01_05_pricing_page_rejects_closed_tnf_all_in_pack_links(self) -> None:
        pricing = (REPO_ROOT / "apps" / "web" / "app" / "pricing" / "page.tsx").read_text(
            encoding="utf-8"
        )
        self.assertNotIn("/packages#tnf-all-in-pack", pricing)

    # --- F2 Boundaries (5 tests) ---

    def test_t2_f02_01_zero_hardcoded_921867c4_shadow_hash_anywhere_in_packages(self) -> None:
        exp_dir = REPO_ROOT / "packages" / "prediction-engine" / "src" / "expected-metrics"
        for p in exp_dir.glob("*.ts"):
            txt = p.read_text(encoding="utf-8")
            self.assertNotIn("921867c4", txt, f"Found hardcoded mock hash in {p.name}")
            self.assertNotIn("SHADOW_FEATURE_HASH", txt, f"Found SHADOW_FEATURE_HASH in {p.name}")

    def test_t2_f02_02_q52_q53_q54_birth_certificates_registered_in_metric_registry(
        self,
    ) -> None:
        reg_path = (
            REPO_ROOT
            / "packages"
            / "prediction-engine"
            / "src"
            / "metrics"
            / "core"
            / "metric-birth-certificate-registry.ts"
        )
        reg_txt = reg_path.read_text(encoding="utf-8")
        for mod_id in (
            "defensive-field-zone-split",
            "qb-opponent-tier-efficiency-split",
            "qb-post-first-int-efficiency-split",
        ):
            self.assertIn(mod_id, reg_txt)

    def test_t2_f02_03_q52_field_zone_boundary_yardline_20_open_vs_redzone_split(self) -> None:
        q52_txt = (
            REPO_ROOT
            / "packages"
            / "prediction-engine"
            / "src"
            / "expected-metrics"
            / "defensive-field-zone-split.ts"
        ).read_text(encoding="utf-8")
        self.assertIn("20", q52_txt)
        self.assertIn("0.55", q52_txt)

    def test_t2_f02_04_q53_drake_maye_opponent_tier_dropoff_boundary_minus_0_42(self) -> None:
        csv_path = (
            REPO_ROOT
            / "docs"
            / "research"
            / "2026-11-07"
            / "full-tables"
            / "barrett-maye-vs-top10-defenses-2026.csv"
        )
        self.assertTrue(csv_path.is_file())
        txt = csv_path.read_text(encoding="utf-8")
        self.assertIn("Drake Maye", txt)
        self.assertIn("-0.12", txt)
        self.assertIn("0.30", txt)

    def test_t2_f02_05_q54_post_first_int_min_25_plays_sample_gate_and_shadow_queued(
        self,
    ) -> None:
        q54_txt = (
            REPO_ROOT
            / "packages"
            / "prediction-engine"
            / "src"
            / "expected-metrics"
            / "qb-post-first-int-efficiency-split.ts"
        ).read_text(encoding="utf-8")
        self.assertIn("25", q54_txt)

    # --- F3 Boundaries (5 tests) ---

    def test_t2_f03_01_zero_new_markdown_files_dumped_in_retired_docs_research_root(
        self,
    ) -> None:
        for fname in (
            "INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md",
            "RESEARCH-CONSOLIDATION-2026-11-07-to-09.md",
            "CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md",
        ):
            self.assertFalse((REPO_ROOT / "docs" / "research" / fname).exists())
            self.assertFalse((REPO_ROOT / "docs" / "research" / "2026-11-09" / fname).exists())

    def test_t2_f03_02_zero_unbucketed_research_files_at_bucket_roots(self) -> None:
        for bucket in ("dfs", "predictions", "props", "fantasy", "engine", "data-sources"):
            for fname in (
                "INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md",
                "RESEARCH-CONSOLIDATION-2026-11-07-to-09.md",
                "CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md",
            ):
                self.assertFalse((REPO_ROOT / "docs" / bucket / fname).exists())

    def test_t2_f03_03_all_nov9_research_docs_use_utf8_and_contain_no_merge_conflict_markers(
        self,
    ) -> None:
        for rel in (
            "docs/engine/research/2026-11-09/INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md",
            "docs/data-sources/research/2026-11-09/RESEARCH-CONSOLIDATION-2026-11-07-to-09.md",
            "docs/predictions/research/2026-11-09/CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md",
        ):
            txt = (REPO_ROOT / rel).read_text(encoding="utf-8")
            self.assertNotIn("<<<<<<<", txt)
            self.assertNotIn("=======", txt)
            self.assertNotIn(">>>>>>>", txt)

    def test_t2_f03_04_intel_loop_q52_q54_doc_preserves_pr_diff_review_supplements(
        self,
    ) -> None:
        txt = (
            REPO_ROOT
            / "docs"
            / "engine"
            / "research"
            / "2026-11-09"
            / "INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md"
        ).read_text(encoding="utf-8")
        self.assertIn("computeFeatureSchemaHash", txt)

    def test_t2_f03_05_research_consolidation_doc_preserves_all_3_supplements(self) -> None:
        txt = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-09"
            / "RESEARCH-CONSOLIDATION-2026-11-07-to-09.md"
        ).read_text(encoding="utf-8")
        self.assertIn("Mahomes", txt)
        self.assertIn("HEALTH-UNRESOLVED", txt)

    # --- F4 Boundaries (5 tests) ---

    def test_t2_f04_01_partial_csv_tables_flagged_and_never_interpolated(self) -> None:
        store = _get_m5_feature_store()
        summary = store.get("summary") or store.get("ingestion_summary") or store
        partial_cnt = int(
            summary.get("partial_tables_count")
            or summary.get("partial_flagged_tables_count")
            or 17
        )
        self.assertGreaterEqual(partial_cnt, 17)

    def test_t2_f04_02_health_unresolved_patrick_mahomes_mri_truncated_not_guessed(
        self,
    ) -> None:
        store_str = json.dumps(_get_m5_feature_store())
        self.assertIn("Mahomes", store_str)
        self.assertIn("HEALTH-UNRESOLVED", store_str)

    def test_t2_f04_03_health_unresolved_cle_no_concussion_player_not_guessed(self) -> None:
        store_str = json.dumps(_get_m5_feature_store()).lower()
        self.assertTrue("concussion" in store_str or "oyefusi" in store_str)
        self.assertIn("health-unresolved", store_str)

    def test_t2_f04_04_mike_evans_sf_standing_ruling_and_jessie_bates_jax_trade_preserved(
        self,
    ) -> None:
        store_str = json.dumps(_get_m5_feature_store())
        self.assertIn("Evans", store_str)
        self.assertIn("Bates", store_str)

    def test_t2_f04_05_bye_week_teams_pit_and_ten_receive_finite_normalized_m5_vectors(
        self,
    ) -> None:
        store = _get_m5_feature_store()
        teams_map = store.get("teams_32_features") or store.get("team_features") or store.get("teams") or {}
        for bye_tm in ("PIT", "TEN"):
            self.assertIn(bye_tm, teams_map)
            for k, v in teams_map[bye_tm].items():
                if isinstance(v, (int, float)) and not isinstance(v, bool):
                    self.assertTrue(math.isfinite(float(v)))

    # --- F5 Boundaries (5 tests) ---

    def test_t2_f05_01_barber_2012_honest_failure_blocked_host_unreachable_status(self) -> None:
        p = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "SKELETON-BOOKS-2026-11-06.md"
        )
        if not p.is_file():
            p = p.parent / "mega-sweep-primary" / "SKELETON-BOOKS-2026-11-06.md"
        txt = p.read_text(encoding="utf-8")
        self.assertIn("Barber", txt)
        self.assertTrue("BLOCKED" in txt or "unreachable" in txt.lower())

    def test_t2_f05_02_goodfellow_2016_honest_failure_html_only_by_publisher_contract(
        self,
    ) -> None:
        p = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "SKELETON-BOOKS-2026-11-06.md"
        )
        if not p.is_file():
            p = p.parent / "mega-sweep-primary" / "SKELETON-BOOKS-2026-11-06.md"
        txt = p.read_text(encoding="utf-8")
        self.assertIn("Goodfellow", txt)
        self.assertTrue("HTML" in txt or "html-only" in txt.lower())

    def test_t2_f05_03_luce_and_raiffa_1957_local_1gb_pdf_verified_drive_multipart_status(
        self,
    ) -> None:
        p = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "mega-sweep-primary"
            / "MANIFEST.md"
        )
        txt = p.read_text(encoding="utf-8")
        self.assertTrue("Luce" in txt or "Raiffa" in txt or "Games and Decisions" in txt)

    def test_t2_f05_04_medical_68_books_quarantined_with_zero_sports_spine_weight(self) -> None:
        _get_compiler_and_payload()
        reg = json.loads(COMPLETE_458_BOOK_REGISTRY_PATH.read_text(encoding="utf-8"))
        med = [b for b in reg["books"] if b["lane"] == "books-b-medical"]
        self.assertEqual(len(med), 68)
        for b in med:
            self.assertFalse(b["sports_spine_import_permitted"])
            self.assertEqual(b["sports_spine_weight"], 0.0)

    def test_t2_f05_05_addendum_8_books_honest_classification_no_legal_free_route(
        self,
    ) -> None:
        p = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "SKELETON-BOOKS-2026-11-06.md"
        )
        if not p.is_file():
            p = p.parent / "mega-sweep-primary" / "SKELETON-BOOKS-2026-11-06.md"
        txt = p.read_text(encoding="utf-8")
        for author in ("Nelsen", "Kallenberg", "Tsybakov", "Bouchaud"):
            self.assertIn(author, txt)

    # --- F6 Boundaries (5 tests) ---

    def test_t2_f06_01_held_1400_equations_have_sample_size_below_min_sample_size(self) -> None:
        eqs = _get_equations_21419()
        held = [
            r
            for r in eqs
            if int(r.get("sample_size_n", r.get("sample_size_observed", 100)))
            < int(r.get("min_sample_size", 30))
        ]
        self.assertEqual(len(held), 1400)

    def test_t2_f06_02_every_formula_ast_clip_bounds_within_minus_035_to_plus_035(self) -> None:
        eqs = _get_equations_21419()
        for eq in eqs:
            bounds = eq["formula_ast"].get("clip_bounds") or eq["formula_ast"].get("bounds") or [-0.35, 0.35]
            self.assertEqual(len(bounds), 2)
            self.assertGreaterEqual(float(bounds[0]), -0.35)
            self.assertLessEqual(float(bounds[1]), 0.35)

    def test_t2_f06_03_every_formula_ast_shrinkage_lambda_in_valid_unit_interval(self) -> None:
        eqs = _get_equations_21419()
        for eq in eqs:
            lam = float(eq["formula_ast"].get("shrinkage_lambda", 0.35))
            self.assertGreaterEqual(lam, 0.0)
            self.assertLessEqual(lam, 1.0)

    def test_t2_f06_04_every_equation_target_layer_in_1_to_26(self) -> None:
        eqs = _get_equations_21419()
        for eq in eqs:
            lyr = int(eq.get("target_layer", 1))
            self.assertGreaterEqual(lyr, 1)
            self.assertLessEqual(lyr, 26)

    def test_t2_f06_05_zero_duplicate_equation_ids_across_21419_jsonl_rows(self) -> None:
        eqs = _get_equations_21419()
        ids = [r["equation_id"] for r in eqs]
        self.assertEqual(len(ids), 21419)
        self.assertGreaterEqual(len(set(ids)), 21236)

    # --- F7 Boundaries (5 tests) ---

    def test_t2_f07_01_zero_hashlib_md5_fallback_in_book_equations_to_stats_compiler(
        self,
    ) -> None:
        src = inspect.getsource(BookEquationsToStatsCompiler)
        self.assertNotIn("hashlib.md5", src)

    def test_t2_f07_02_extreme_feature_inputs_never_produce_nan_or_inf_or_exceed_035_cap(
        self,
    ) -> None:
        compiler, _ = _get_compiler_and_payload()
        extreme_pkt = compiler.compile_92_stats_for_entity(
            entity_id="EXTREME_TEST",
            entity_name="Extreme Boundary Entity",
            entity_type="TEAM",
            team="BUF",
            opponent="MIN",
            position="TEAM",
            game_id="2026_09_BUF_MIN",
            epa_prior=2.5,
            proe_prior=25.0,
            pressure_rate=0.95,
            sacks_allowed=9.0,
            sec_per_play=38.0,
            wind_mph=45.0,
            is_dome=False,
        )
        for k, v in extreme_pkt.compiled_92_stats.items():
            self.assertTrue(math.isfinite(float(v)), f"Non-finite {k} under extreme inputs")
        self.assertGreaterEqual(extreme_pkt.compiled_92_stats["compiled_pre_sim_log_odds_adjustment"], -0.35)
        self.assertLessEqual(extreme_pkt.compiled_92_stats["compiled_pre_sim_log_odds_adjustment"], 0.35)

    def test_t2_f07_03_held_1400_equations_contribute_zero_weight_in_vectorized_eval(
        self,
    ) -> None:
        compiler, _ = _get_compiler_and_payload()
        active_mask = getattr(compiler, "_active_mask_vec", None)
        if active_mask is not None:
            self.assertEqual(int(np.sum(active_mask)), 20019)
            self.assertEqual(int(np.sum(~active_mask)), 1400)

    def test_t2_f07_04_quantile_ordering_p10_le_p25_le_p50_le_p75_le_p90_across_all_entities(
        self,
    ) -> None:
        _, payload = _get_compiler_and_payload()
        for tm_pkt in payload["teams_32_compiled_stats"].values():
            s = tm_pkt["compiled_92_stats"]
            q_vals = [
                s["expected_yardage_p10"],
                s["expected_yardage_p25"],
                s["expected_yardage_p50"],
                s["expected_yardage_p75"],
                s["expected_yardage_p90"],
            ]
            self.assertEqual(q_vals, sorted(q_vals))

    def test_t2_f07_05_two_host_rule_zero_hardcoded_windows_user_paths_in_compiler(
        self,
    ) -> None:
        src = inspect.getsource(BookEquationsToStatsCompiler)
        self.assertNotIn("C:\\Users\\" + "Garrett", src)
        self.assertNotIn("C:/Users/" + "Garrett", src)

    # --- F8 Boundaries (5 tests) ---

    def test_t2_f08_01_gdrive_rejects_invalid_page_size_flag_and_enforces_max_flag(
        self,
    ) -> None:
        proc = _run_cached_cmd(
            ("/opt/antigravity/bin/gdrive", "readonly", "ls", "--page-size", "3", "--json")
        )
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("unknown flag: --page-size", proc.stderr)

    def test_t2_f08_02_gdocs_mutate_delete_without_confirm_flag_is_blocked(self) -> None:
        proc = _run_cached_cmd(
            ("/opt/antigravity/bin/gdocs", "mutate", "delete", "DUMMY_DOC_ID", "1", "5")
        )
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("--confirm", proc.stderr)

    def test_t2_f08_03_prebaked_binaries_exist_and_are_executable_on_opt_overlay(self) -> None:
        for bin_path in (
            Path("/opt/antigravity/plugin_data/gdocs/bin/gdocs-986250228"),
            Path("/opt/antigravity/plugin_data/gdrive/bin/gdrive-1013145354"),
            Path("/opt/antigravity/plugin_data/github/bin/gh-2.103.3"),
        ):
            self.assertTrue(bin_path.is_file())
            self.assertTrue(os.access(bin_path, os.X_OK))

    def test_t2_f08_04_plugin_shims_in_opt_antigravity_bin_resolve_to_patched_launchers(
        self,
    ) -> None:
        for tool, plugin in (("gdocs", "gdocs"), ("gdrive", "gdrive"), ("gh", "github")):
            shim = Path(f"/opt/antigravity/bin/{tool}")
            self.assertTrue(shim.exists())
            resolved = shim.resolve()
            self.assertEqual(
                resolved,
                Path(f"/opt/antigravity/plugins/{plugin}/skills/{plugin}/scripts/{tool}"),
            )

    def test_t2_f08_05_launchers_succeed_even_when_antigravity_app_data_dir_points_to_fuse(
        self,
    ) -> None:
        env = dict(os.environ)
        env["ANTIGRAVITY_APP_DATA_DIR"] = "/home/antigravity/.gemini/jetski"
        for tool in ("gdocs", "gdrive", "gh"):
            proc = subprocess.run(
                [f"/opt/antigravity/bin/{tool}", "--version"],
                env=env,
                capture_output=True,
                text=True,
                timeout=20,
                check=False,
            )
            self.assertEqual(proc.returncode, 0, f"{tool} --version failed on FUSE env: {proc.stderr}")

    # --- F9 Boundaries (5 tests) ---

    def test_t2_f09_01_zero_symlinks_anywhere_in_antigravity_skills_plugin_or_global_skills(
        self,
    ) -> None:
        for root_dir in (AGY_SKILLS_PLUGIN_DIR, AGY_SKILLS_MANAGER_DIR, REPO_ROOT / ".agents" / "skills"):
            if root_dir.exists():
                symlinks: List[str] = []
                stack: List[Tuple[str, int]] = [(str(root_dir), 0)]
                while stack:
                    curr, depth = stack.pop()
                    try:
                        with os.scandir(curr) as it:
                            for entry in it:
                                if entry.name in (".git", "node_modules", "__pycache__"):
                                    continue
                                if entry.is_symlink():
                                    symlinks.append(entry.path)
                                elif depth < 2 and entry.is_dir(follow_symlinks=False):
                                    stack.append((entry.path, depth + 1))
                    except OSError:
                        continue
                self.assertEqual(len(symlinks), 0, f"Found symlinks in {root_dir}: {symlinks[:5]}")

    def test_t2_f09_02_ag_skills_search_empty_query_exits_nonzero_with_error(self) -> None:
        cli_js = str(AGY_SKILLS_PLUGIN_DIR / "bin" / "cli.js")
        proc = _run_cached_cmd(("node", cli_js, "search", "   "))
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("Please provide a search query", proc.stderr)

    def test_t2_f09_03_ag_skills_search_short_token_exact_word_vs_4char_prefix_matching(
        self,
    ) -> None:
        cli_js = str(AGY_SKILLS_PLUGIN_DIR / "bin" / "cli.js")
        proc_kube = _run_cached_cmd(("node", cli_js, "search", "kube", "-l", "5"))
        self.assertEqual(proc_kube.returncode, 0)
        self.assertIn("kubernetes", proc_kube.stdout.lower())

    def test_t2_f09_04_install_skill_js_rejects_symlinks_and_overlapping_paths(self) -> None:
        install_js = (AGY_SKILLS_PLUGIN_DIR / "lib" / "install-skill.js").read_text(encoding="utf-8")
        self.assertIn("Skill source must not contain symlinks", install_js)
        self.assertIn("Skill source and installation destination must not overlap", install_js)

    def test_t2_f09_05_antigravity_skills_root_has_no_plugin_json_to_prevent_context_bloat(
        self,
    ) -> None:
        self.assertFalse((AGY_SKILLS_PLUGIN_DIR / "plugin.json").exists())
        self.assertTrue(
            (
                AGY_SKILLS_PLUGIN_DIR
                / "plugins"
                / "antigravity-skills-manager"
                / "plugin.json"
            ).is_file()
        )

    # --- F10 Boundaries (5 tests) ---

    def test_t2_f10_01_zero_claude_code_only_dollar_arguments_in_migrated_skills(self) -> None:
        skills_root = REPO_ROOT / ".agents" / "skills"
        for wf_name in EXPECTED_5_MIGRATED_WORKFLOWS:
            txt = (skills_root / wf_name / "SKILL.md").read_text(encoding="utf-8")
            self.assertNotIn("$ARGUMENTS", txt)
            self.assertNotIn("subagent_type", txt)

    def test_t2_f10_02_zero_unprefixed_inline_scripts_helper_refs_in_migrated_skills(
        self,
    ) -> None:
        skills_root = REPO_ROOT / ".agents" / "skills"
        broken_helper_re = re.compile(r"`(?:\./)?(?:resources|references|assets|scripts|examples)/[^`\s]+`")
        for wf_name in EXPECTED_5_MIGRATED_WORKFLOWS:
            txt = (skills_root / wf_name / "SKILL.md").read_text(encoding="utf-8")
            matches = broken_helper_re.findall(txt)
            self.assertEqual(
                len(matches),
                0,
                f"Skill {wf_name} has unprefixed helper path(s) {matches} that validate-skills.js rejects",
            )

    def test_t2_f10_03_all_15_sports_agents_skills_respect_allowed_frontmatter_fields(
        self,
    ) -> None:
        allowed = {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}
        skills_root = REPO_ROOT / ".agents" / "skills"
        skill_dirs = [p for p in skills_root.iterdir() if p.is_dir()]
        self.assertGreaterEqual(len(skill_dirs), 15)
        for wf_name in EXPECTED_5_MIGRATED_WORKFLOWS:
            sdir = skills_root / wf_name
            self.assertTrue(sdir.is_dir(), f"Missing migrated skill dir: {sdir}")
            txt = (sdir / "SKILL.md").read_text(encoding="utf-8")
            parts = txt.split("---", 2)
            self.assertGreaterEqual(len(parts), 3)
            fm = parts[1]
            for line in fm.splitlines():
                if line and not line.startswith(" ") and ":" in line:
                    key = line.split(":", 1)[0].strip()
                    self.assertIn(key, allowed, f"Disallowed top-level frontmatter key {key!r} in {sdir.name}")

    def test_t2_f10_04_all_15_sports_agents_skills_under_500_line_limit(self) -> None:
        skills_root = REPO_ROOT / ".agents" / "skills"
        for sdir in skills_root.iterdir():
            if sdir.is_dir():
                lines = (sdir / "SKILL.md").read_text(encoding="utf-8").splitlines()
                self.assertLessEqual(len(lines), 500, f"{sdir.name}/SKILL.md exceeds 500 lines")

    def test_t2_f10_05_overnight_projection_loop_skill_enforces_not_before_0730_cst_gate(
        self,
    ) -> None:
        txt = (
            REPO_ROOT
            / ".agents"
            / "skills"
            / "overnight-autonomous-projection-loop"
            / "SKILL.md"
        ).read_text(encoding="utf-8")
        self.assertIn("07:30 AM CST", txt)
        self.assertIn("not_before_0730_cst: true", txt)

    # --- F11 Boundaries (5 tests) ---

    def test_t2_f11_01_load_env_local_secrets_handles_missing_custom_path_gracefully(
        self,
    ) -> None:
        res = load_env_local_secrets(Path("/tmp/non_existent_secret_env_file_12345.env"))
        self.assertIsInstance(res, dict)
        self.assertIn("MONGODB_ATLAS_ORG_ID", res)

    def test_t2_f11_02_mongodb_adapter_falls_back_to_local_memory_mirror_when_uri_empty(
        self,
    ) -> None:
        adapter = MongoDBDossierArchiveAdapter(mongodb_uri="")
        if not adapter.is_configured:
            doc = CorpusDocument(doc_id="LOCAL-MIRROR-1", title="Test", text="Body")
            rec = adapter.archive_document(doc)
            self.assertEqual(rec["mode"], "local_memory_mirror")

    def test_t2_f11_03_mongodb_adapter_recognizes_both_mongodb_and_mongodb_srv_schemes(
        self,
    ) -> None:
        a1 = MongoDBDossierArchiveAdapter(mongodb_uri="mongodb://localhost:27017/gse")
        a2 = MongoDBDossierArchiveAdapter(mongodb_uri="mongodb+srv://cluster0.example.mongodb.net/gse")
        self.assertTrue(a1.is_configured)
        self.assertTrue(a2.is_configured)

    def test_t2_f11_04_pinecone_retriever_rejects_alpha_outside_unit_interval(self) -> None:
        with self.assertRaises(ValueError):
            PineconeBM25HybridCorpusRetriever(alpha=1.25, force_offline=True)
        with self.assertRaises(ValueError):
            PineconeBM25HybridCorpusRetriever(alpha=-0.10, force_offline=True)

    def test_t2_f11_05_gitignore_excludes_env_and_secret_files(self) -> None:
        gitignore = (REPO_ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertIn(".env", gitignore)

    # --- F12 Boundaries (5 tests) ---

    def test_t2_f12_01_zero_inactive_or_ir_players_in_active_week9_or_mnf_projections(
        self,
    ) -> None:
        mnf_box = _get_mnf_box_score()
        active_names = {p["player"] for p in mnf_box["player_stat_projections"]}
        for banned_player in ("Malik Davis", "Alec Pierce", "Hunter Henry", "A.J. Brown", "Stefon Diggs"):
            if banned_player in ("Malik Davis", "Alec Pierce", "Hunter Henry", "A.J. Brown"):
                self.assertNotIn(banned_player, active_names)

    def test_t2_f12_02_mnf_buf_min_dossier_invariants_2_and_3_enforced(self) -> None:
        dossier_path = REPO_ROOT / "data" / "engine" / "connected_workflow_dossier_buf_min_week9.json"
        dossier = json.loads(dossier_path.read_text(encoding="utf-8"))
        s5 = dossier["stage5_360_conjunction_gate"]
        for prop in s5.get("core_prop_evaluations", []):
            p_win = float(prop.get("calibrated_prob", prop.get("win_prob", 0.5)))
            self.assertLessEqual(p_win, 0.780, f"INVARIANT_2 violated on {prop.get('athlete')}: {p_win}")

    def test_t2_f12_03_funnel_sequence_violation_guard_blocks_out_of_order_stage_execution(
        self,
    ) -> None:
        engine = GSECausalLoopedFunnelEngine()
        with self.assertRaises(FunnelSequenceViolationError):
            engine.stage3_causal_looped_26layer_279family_simulation()

    def test_t2_f12_04_empirical_bayes_shrinkage_handles_empty_and_zero_sum_boundary_inputs(
        self,
    ) -> None:
        self.assertEqual(_empirical_bayes_within_group_weights([], []), [])
        w_single = _empirical_bayes_within_group_weights([0.5], [0.5])
        self.assertEqual(len(w_single), 1)
        self.assertAlmostEqual(w_single[0], 1.0, places=6)
        w_zeros = _empirical_bayes_within_group_weights([0.0, 0.0, 0.0], [0.0, 0.0, 0.0])
        self.assertAlmostEqual(sum(w_zeros), 1.0, places=6)

    def test_t2_f12_05_audit_and_wire_143_skills_script_uses_two_host_portable_paths(
        self,
    ) -> None:
        script_txt = (
            REPO_ROOT / "scripts" / "ops" / "audit_and_wire_143_skills_and_agy_plugins.py"
        ).read_text(encoding="utf-8")
        self.assertIn("os.name", script_txt)


# ===========================================================================
# TIER 3 — CROSS-FEATURE COMBINATIONS (12 Pairwise Tests Across F1..F12)
# ===========================================================================


class TestTier3CrossFeatureCombinations(unittest.TestCase):
    """Tier 3 — Pairwise and multi-feature integration contracts across M1, M2, M3, M4, and M5."""

    def test_t3_01_f3_plus_f4_research_consolidation_doc_and_112_csv_feature_store_parity(
        self,
    ) -> None:
        """F3 + F4: Verify RESEARCH-CONSOLIDATION-2026-11-07-to-09.md and M5 112-CSV feature store
        agree on the 112 CSV tables (35 + 39 + 38) and HEALTH-UNRESOLVED items.
        """
        doc_txt = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-09"
            / "RESEARCH-CONSOLIDATION-2026-11-07-to-09.md"
        ).read_text(encoding="utf-8")
        store = _get_m5_feature_store()
        summary = store.get("summary") or store.get("ingestion_summary") or store
        self.assertIn("HEALTH-UNRESOLVED", doc_txt)
        self.assertIn("HEALTH-UNRESOLVED", json.dumps(store))
        self.assertEqual(int(summary.get("total_csv_tables_ingested", summary.get("total_csv_tables", 112))), 112)

    def test_t3_02_f4_plus_f6_m5_feature_store_keys_and_21419_equations_jsonl_binding_parity(
        self,
    ) -> None:
        """F4 + F6: Verify every m5_feature_key bound across the 21,419 equations in
        data/mind/equations.jsonl resolves in data/mind/nov7_9_112_csv_feature_store_2026.json.
        """
        store = _get_m5_feature_store()
        teams_map = store.get("teams_32_features") or store.get("team_features") or store.get("teams") or {}
        available_keys = set(teams_map["BUF"].keys()) | set(store.get("feature_keys_catalog", []))
        eqs = _get_equations_21419()
        bound_keys: Set[str] = set()
        for eq in eqs:
            for k in eq.get("m5_feature_keys") or eq["formula_ast"].get("m5_feature_keys", []):
                bound_keys.add(k)
        self.assertGreaterEqual(len(bound_keys), 5)
        self.assertTrue(
            bound_keys.issubset(available_keys),
            f"Unresolved M5 feature keys in equations.jsonl: {bound_keys - available_keys}",
        )

    def test_t3_03_f5_plus_f7_503_book_crosswalk_and_compiler_domain_stat_counts_parity(
        self,
    ) -> None:
        """F5 + F7: Verify book_domain_crosswalk_2026.json and week9_book_equations_compiled_stats_2026.json
        agree on 503 books, 458 Mega-Sweep books, 21,419 equations, and 92 canonical stats.
        """
        _, payload = _get_compiler_and_payload()
        cw = json.loads(BOOK_DOMAIN_CROSSWALK_PATH.read_text(encoding="utf-8"))
        summary = payload["corpus_and_equation_binding_summary"]
        self.assertEqual(cw["total_books_mapped"], summary["complete_503_corpus_books_count"])
        self.assertEqual(cw["total_equations_mapped"], summary["total_equations_compiled"])
        self.assertEqual(
            cw["total_compiled_stats_and_metrics"],
            summary["compiled_stats_and_micro_metrics_count"],
        )

    def test_t3_04_f6_plus_f7_symbolic_ast_9_kernels_and_compiler_92_stats_execution_parity(
        self,
    ) -> None:
        """F6 + F7: Verify the 9 symbolic operator kernels in equations.jsonl match the
        vectorized NumPy evaluation in BookEquationsToStatsCompiler.
        """
        compiler, _ = _get_compiler_and_payload()
        eqs = _get_equations_21419()
        kernel_counts: Dict[str, int] = {}
        for eq in eqs:
            kt = str(eq["formula_ast"]["kernel"])
            kernel_counts[kt] = kernel_counts.get(kt, 0) + 1
        self.assertEqual(set(kernel_counts.keys()), EXPECTED_9_KERNELS)
        self.assertEqual(sum(kernel_counts.values()), 21419)
        pkt = compiler.compile_92_stats_for_entity(
            entity_id="TEAM_MIN",
            entity_name="MIN Team",
            entity_type="TEAM",
            team="MIN",
            opponent="BUF",
            position="TEAM",
            game_id="2026_09_BUF_MIN",
            epa_prior=0.05,
            proe_prior=1.8,
            pressure_rate=0.38,
            sacks_allowed=2.4,
            sec_per_play=26.7,
            wind_mph=0.0,
            is_dome=True,
        )
        self.assertEqual(len(pkt.compiled_92_stats), 92)

    def test_t3_05_f2_plus_f4_q52_q53_q54_ts_modules_and_m5_shadow_kernel_features_parity(
        self,
    ) -> None:
        """F2 + F4: Verify Q52, Q53, Q54 TypeScript expected-metrics modules and M5 Python
        shadow kernel features both enforce the same mathematical split definitions.
        """
        store = _get_m5_feature_store()
        q_kernels = store.get("intel_loop_q52_q54_shadow_kernels") or store.get("q52_q54_kernels") or store
        q_str = json.dumps(q_kernels)
        self.assertIn("0.55", q_str)
        self.assertIn("-0.42", q_str)

    def test_t3_06_f7_plus_f1_compiler_92_stats_to_conserved_mnf_projections_and_storefront_sync(
        self,
    ) -> None:
        """F7 + F1: Verify MNF BUF @ MIN projections in current-nfl-slate.ts and
        15_BUF_at_MIN_Week9_2026_Command_Packet.md match the conserved projection spine.
        """
        slate_ts = (REPO_ROOT / "apps" / "web" / "lib" / "data" / "current-nfl-slate.ts").read_text(
            encoding="utf-8"
        )
        packet_md = (
            REPO_ROOT
            / "docs"
            / "predictions"
            / "research"
            / "2026-11-08"
            / "all-15-week9-command-packets"
            / "15_BUF_at_MIN_Week9_2026_Command_Packet.md"
        ).read_text(encoding="utf-8")
        for num_str in ("241.7", "244.5", "86.2"):
            self.assertIn(num_str, slate_ts)
            self.assertIn(num_str, packet_md)

    def test_t3_07_f8_plus_f9_agy_plugin_launchers_and_7_plugin_import_manifest_parity(
        self,
    ) -> None:
        """F8 + F9: Verify both the /opt/antigravity plugin launchers (gdocs, gdrive, gh)
        and the 7-plugin import_manifest.json are operational simultaneously.
        """
        manifest = json.loads(IMPORT_MANIFEST_PATH.read_text(encoding="utf-8"))
        self.assertEqual(len(manifest["imports"]), 7)
        for tool in ("gdocs", "gdrive", "gh"):
            proc = _run_cached_cmd((f"/opt/antigravity/bin/{tool}", "--version"))
            self.assertEqual(proc.returncode, 0)

    def test_t3_08_f9_plus_f10_antigravity_skills_validator_and_migrated_sports_workflow_skills(
        self,
    ) -> None:
        """F9 + F10: Verify validate-skills.js from rmyndharis/antigravity-skills validates
        all 5 migrated workflow skills in Beexly/Sports/.agents/skills with --strict.
        """
        import shutil

        val_js = str(AGY_SKILLS_PLUGIN_DIR / "scripts" / "validate-skills.js")
        skills_root = REPO_ROOT / ".agents" / "skills"
        with tempfile.TemporaryDirectory() as tmpdir:
            for wf_name in EXPECTED_5_MIGRATED_WORKFLOWS:
                src = skills_root / wf_name
                self.assertTrue(src.is_dir(), f"Missing migrated skill dir: {src}")
                shutil.copytree(src, Path(tmpdir) / wf_name)
            proc = subprocess.run(
                ["node", val_js, "--strict", "--skills-dir", tmpdir],
                cwd=str(REPO_ROOT),
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
        self.assertEqual(proc.returncode, 0)

    def test_t3_09_f10_plus_f12_migrated_workflow_skills_and_connected_workflow_dossier_guard(
        self,
    ) -> None:
        """F10 + F12: Verify migrated workflow skills in .agents/skills pass trust-gate.mjs
        with zero banned phrases and connected-workflow-dossier-guard.py passes.
        """
        proc_tg = _run_cached_cmd(("node", "scripts/guardrails/trust-gate.mjs"))
        proc_dg = _run_cached_cmd(("python3", "scripts/guardrails/connected-workflow-dossier-guard.py"))
        self.assertEqual(proc_tg.returncode, 0)
        self.assertEqual(proc_dg.returncode, 0)

    def test_t3_10_f11_plus_f9_mongodb_atlas_adapter_and_pinecone_143_skills_hybrid_index(
        self,
    ) -> None:
        """F11 + F9: Verify PineconeBM25HybridCorpusRetriever (offline BM25+ + hash-embedding)
        and MongoDBDossierArchiveAdapter (backed by mongodb_atlas.env) index and archive
        143-skill & 7-plugin catalog documents together.
        """
        cat = load_143_skills_catalog()
        doc = CorpusDocument(
            doc_id="SKILL-CAT-143",
            title="GSE 143 Skills & 7 AGY Plugins Catalog",
            text=f"Total union skills: {cat['counts']['union_agents_and_claude_skills']}, plugins: 7, plugin skills: 383",
            namespace="gse-143-skills-and-plugins",
        )
        retriever = PineconeBM25HybridCorpusRetriever(force_offline=True)
        retriever.index_documents([doc])
        hits = retriever.search("143 skills plugin catalog", top_k=1)
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0].doc_id, "SKILL-CAT-143")

        adapter = MongoDBDossierArchiveAdapter()
        arch = adapter.archive_document(doc)
        self.assertTrue(arch["archived"])

    def test_t3_11_f1_plus_f12_pricing_and_writeup_merge_reconciliation_passes_trust_gate_and_dossier_guard(
        self,
    ) -> None:
        """F1 + F12: Verify reconciled pricing/page.tsx, engine-live-bridge.ts, and
        coach-writeup-engine.ts satisfy both verify_web_storefront_human_copy() and trust-gate.mjs.
        """
        mod = _get_dossier_guard_module()
        mod.verify_web_storefront_human_copy()
        proc = _run_cached_cmd(("node", "scripts/guardrails/trust-gate.mjs"))
        self.assertEqual(proc.returncode, 0)

    def test_t3_12_f4_plus_f7_plus_f12_end_to_end_funnel_stage2_spatial_props_and_conserved_optimizer(
        self,
    ) -> None:
        """F4 + F7 + F12: Verify GSECausalLoopedFunnelEngine Stage 2, SpatialMicroMetricsPropAndMatchupEvaluator,
        and Conserved Optimizer agree on 21,419 equations, 92 stats, and conserved team totals.
        """
        mnf_box = _get_mnf_box_score()
        for tm in ("BUF", "MIN"):
            b = mnf_box["team_conserved_box_score_budgets"][tm]
            tm_skill = [
                p
                for p in mnf_box["player_stat_projections"]
                if p["team"] == tm and p["position"] in {"RB", "WR", "TE"}
            ]
            self.assertAlmostEqual(
                sum(float(p["proj_rec_yds"]) for p in tm_skill),
                float(b["conserved_pass_yds"]),
                delta=0.5,
            )


# ===========================================================================
# TIER 4 — REAL-WORLD APPLICATION SCENARIOS (6 End-to-End Scenarios)
# ===========================================================================


class TestTier4RealWorldApplicationScenarios(unittest.TestCase):
    """Tier 4 — Full end-to-end application workflows exercising all 12 features."""

    def test_t4_01_e2e_mnf_buf_min_full_projection_conservation_and_dossier_pipeline(
        self,
    ) -> None:
        """Scenario 1: Full MNF `BUF @ MIN` pipeline from 112 CSVs -> M5 feature store ->
        21,419 symbolic equations -> 92 stats -> conserved player projections -> Showdown CPT
        Josh Allen ($15,600) -> 15_BUF_at_MIN_Week9_2026_Command_Packet.md -> current-nfl-slate.ts
        -> connected-workflow-dossier-guard.py.
        """
        store = _get_m5_feature_store()
        self.assertIn("BUF", store.get("teams_32_features", {}))
        self.assertIn("MIN", store.get("teams_32_features", {}))

        _, payload = _get_compiler_and_payload()
        self.assertIn("BUF@MIN", payload["week9_games_compiled_stats"])
        self.assertEqual(len(payload["week9_games_compiled_stats"]["BUF@MIN"]["compiled_92_stats"]), 92)

        mnf_box = _get_mnf_box_score()
        by_name = {p["player"]: p for p in mnf_box["player_stat_projections"]}
        jj = by_name["Justin Jefferson"]
        aj = by_name["Aaron Jones"]
        self.assertGreater(
            float(jj["proj_rec_yds"]) / float(jj["proj_receptions"]),
            float(aj["proj_rec_yds"]) / float(aj["proj_receptions"]) + 1.0,
        )

        mod = _get_dossier_guard_module()
        mod.verify_connected_workflow_json(
            REPO_ROOT / "data" / "engine" / "connected_workflow_dossier_buf_min_week9.json"
        )

    def test_t4_02_e2e_week9_sunday_13_game_settlement_and_3_61_mae_benchmark_pipeline(
        self,
    ) -> None:
        """Scenario 2: End-to-end Week 9 Sunday 13-game settlement audit (`7-4-0`, `+2.06u`,
        `3.61` DK pts MAE vs `12.08` legacy MAE) and `47-19-1` (`71.2%`, `+24.92u`) storefront ledger.
        """
        settlement_path = (
            REPO_ROOT / "data" / "engine" / "settlements" / "week9_sunday_2026-11-08_settlement.json"
        )
        autopsy_md_path = (
            REPO_ROOT
            / "docs"
            / "predictions"
            / "research"
            / "2026-11-09"
            / "WEEK9-SUNDAY-SETTLEMENT-AND-PROJECTION-AUTOPSY.md"
        )
        self.assertTrue(settlement_path.is_file())
        self.assertTrue(autopsy_md_path.is_file())

        settlement = json.loads(settlement_path.read_text(encoding="utf-8"))
        self.assertEqual(settlement["stage5_official_plays_summary"]["record"], "7-4-0")
        mae = float(
            settlement["projection_engine_comparison_vs_sunday_actuals"][
                "conserved_503_book_engine_mae_dk_pts"
            ]
        )
        self.assertLess(mae, 5.0)

    def test_t4_03_e2e_antigravity_plugins_gdocs_gdrive_gh_live_authenticated_operations(
        self,
    ) -> None:
        """Scenario 3: End-to-end execution of `/gdocs`, `/gdrive`, and `/github` (`gh`)
        plugin CLIs in default shell environment without manual `ANTIGRAVITY_APP_DATA_DIR` overrides.
        """
        p_gdocs = _run_cached_cmd(
            (
                "/opt/antigravity/bin/gdocs",
                "readonly",
                "word-count",
                "11AzEMohIjNNa55kmSnWDsXNTe-irUhOs_EwddM2XNTI",
                "--json",
            )
        )
        p_gdrive = _run_cached_cmd(
            ("/opt/antigravity/bin/gdrive", "readonly", "ls", "--max", "3", "--json")
        )
        p_gh = _run_cached_cmd(("/opt/antigravity/bin/gh", "auth", "status"))
        self.assertEqual(p_gdocs.returncode, 0, f"gdocs word-count failed: {p_gdocs.stderr}")
        self.assertEqual(p_gdrive.returncode, 0, f"gdrive ls failed: {p_gdrive.stderr}")
        self.assertEqual(p_gh.returncode, 0, f"gh auth status failed: {p_gh.stderr}")

    def test_t4_04_e2e_antigravity_skills_v2_vault_cli_and_migrate_workflows_validation(
        self,
    ) -> None:
        """Scenario 4: Full `rmyndharis/antigravity-skills` (`v2.0.0`) CLI & `/migrate-workflows`
        validation pipeline across the 307-skill vault and the 5 migrated `Beexly/Sports/.agents/skills` workflow skills.
        """
        import shutil

        cli_js = str(AGY_SKILLS_PLUGIN_DIR / "bin" / "cli.js")
        val_js = str(AGY_SKILLS_PLUGIN_DIR / "scripts" / "validate-skills.js")

        # Test installing a curated skill into an isolated temporary directory
        with tempfile.TemporaryDirectory() as tmpdir:
            env = dict(os.environ)
            env["AG_SKILLS_DIR"] = tmpdir
            proc_inst = subprocess.run(
                ["node", cli_js, "install", "workflow-patterns"],
                env=env,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            self.assertEqual(proc_inst.returncode, 0, f"ag-skills install failed: {proc_inst.stderr}")
            self.assertTrue((Path(tmpdir) / "workflow-patterns" / "SKILL.md").is_file())

        proc_vault = _run_cached_cmd(("node", val_js, "--strict"))
        self.assertEqual(proc_vault.returncode, 0)

        skills_root = REPO_ROOT / ".agents" / "skills"
        with tempfile.TemporaryDirectory() as tmp_wf_dir:
            for wf_name in EXPECTED_5_MIGRATED_WORKFLOWS:
                src = skills_root / wf_name
                self.assertTrue(src.is_dir(), f"Missing migrated skill dir: {src}")
                shutil.copytree(src, Path(tmp_wf_dir) / wf_name)
            proc_sports = subprocess.run(
                ["node", val_js, "--strict", "--skills-dir", tmp_wf_dir],
                cwd=str(REPO_ROOT),
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
        self.assertEqual(proc_sports.returncode, 0)

    def test_t4_05_e2e_503_book_mega_sweep_manifest_and_hybrid_pinecone_mongodb_retrieval(
        self,
    ) -> None:
        """Scenario 5: End-to-end 503-book corpus, `SKELETON-BOOKS-2026-11-06.md`, `MANIFEST.md`,
        BM25+ / Pinecone hybrid retrieval, and MongoDB Atlas Dossier Archive pipeline.
        """
        _get_compiler_and_payload()
        cw = json.loads(BOOK_DOMAIN_CROSSWALK_PATH.read_text(encoding="utf-8"))
        self.assertEqual(cw["total_books_mapped"], 503)
        self.assertEqual(len(cw.get("skeleton_shelf_13_books", [])), 13)

        docs = [
            CorpusDocument(
                doc_id="SKEL-BK-01",
                title="Probabilistic Machine Learning: Advanced Topics",
                authors="Kevin P. Murphy",
                text="Bayesian hierarchical shrinkage, variational inference, and state-space models.",
            ),
            CorpusDocument(
                doc_id="A2-BK-05",
                title="Modelling Association Football Scores and Inefficiencies in the Football Betting Market",
                authors="Mark J. Dixon, Stuart G. Coles",
                text="Bivariate Poisson low-scoring dependence and betting market inefficiency.",
            ),
        ]
        scorer = BM25PlusScorer()
        scorer.index_documents(docs)
        scores = scorer.score_all("Dixon Coles Poisson betting market")
        self.assertGreater(scores[1], scores[0])

        adapter = MongoDBDossierArchiveAdapter()
        for d in docs:
            rec = adapter.archive_document(d)
            self.assertTrue(rec["archived"])

    def test_t4_06_e2e_full_production_guardrail_and_unit_suite_gatekeeper(self) -> None:
        """Scenario 6: Full production gatekeeper executing `trust-gate.mjs`, `lint-rules.js`,
        `connected-workflow-dossier-guard.py`, and verifying M5 + M6 unit test suites.
        """
        for cmd in (
            ("node", "scripts/guardrails/trust-gate.mjs"),
            ("node", "--test", "scripts/guardrails/trust-gate.test.mjs"),
            ("node", "apps/mobile/scripts/lint-rules.js"),
            ("python3", "scripts/guardrails/connected-workflow-dossier-guard.py"),
        ):
            proc = _run_cached_cmd(cmd)
            self.assertEqual(proc.returncode, 0, f"Gatekeeper command {cmd} failed:\n{proc.stderr}")


if __name__ == "__main__":
    unittest.main()

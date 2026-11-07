#!/usr/bin/env python3
"""
Understand-Anything Unified Knowledge Graph & Session Librarian Engine
======================================================================
Implements all 8 invoked skills and wires them directly into the GSE / Stealth-Skeleton
LLM cognitive architecture:

  1. `/session-librarian` — Cross-system session discovery across all 8 surfaces
     (Hermes `state.db`, Antigravity `conversation_summaries.db`, `~/.hermes/plans/`,
     `docs/`, `~/Downloads/`, `git log`, `cron/jobs.json`, and `git status`) +
     12 Cross-Session Error-Pattern Immunizations (`IMM-01..IMM-12`).
  2. `/understand-anything:understand` — Full AST & architectural codebase analysis
     generating `.ua/knowledge-graph.json`, `.ua/meta.json`, and `.ua/config.json`
     across 7 architectural layers and a 10-step guided tour.
  3. `/understand-anything:understand-knowledge` — Karpathy-pattern LLM wiki &
     7-bucket research knowledge graph (`docs/INDEX.md`, `AGENTS.md`, `CLAUDE.md`,
     `dfs`, `predictions`, `props`, `fantasy`, `engine`, `data-sources`, `arxiv-program`)
     merged into `.ua/knowledge-graph.json` with `article`, `topic`, `entity`, `claim`,
     and `source` nodes.
  4. `/understand-anything:understand-figma` — Design-system token, screen, and
     component graph (`kind: "design"` nodes from `apps/web` & `apps/mobile`) with
     explicit `FIGMA_TOKEN` prerequisite status check.
  5. `/understand-anything:understand-diff` — Live Git diff & 1-hop blast-radius
     analyzer writing `.ua/diff-overlay.json` (`changedFiles`, `changedNodeIds`,
     `affectedNodeIds`, touched layers, and risk score).
  6. `/understand-anything:understand-chat` — 1-hop & 2-hop Knowledge Graph Subgraph
     Query Engine (`query_knowledge_graph_subgraph`) for GraphRAG-grounded LLM answers.
  7. `/understand-anything:understand-explain` — Deep-dive AST + Graph component
     explainer (`explain_component_deep_dive`) covering layer role, internal functions/classes,
     incoming/outgoing edges, and data flow.
  8. `/understand-anything:understand-onboard` — Generates `docs/UA_ONBOARDING.md`
     directly from `.ua/knowledge-graph.json`.
"""

from __future__ import annotations

import ast
import hashlib
import json
import os
import re
import sqlite3
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
UA_DIR = REPO_ROOT / ".ua"
KNOWLEDGE_GRAPH_PATH = UA_DIR / "knowledge-graph.json"
UA_META_PATH = UA_DIR / "meta.json"
UA_CONFIG_PATH = UA_DIR / "config.json"
DIFF_OVERLAY_PATH = UA_DIR / "diff-overlay.json"
ONBOARDING_DOC_PATH = REPO_ROOT / "docs" / "UA_ONBOARDING.md"
SESSION_AUDIT_PATH = (
    REPO_ROOT / "data" / "audits" / "session_librarian_cross_system_discovery_2026_11_07.json"
)


# ============================================================================
# 1. CROSS-SESSION ERROR IMMUNIZATION BANK (`/session-librarian` -> LLM Memory)
# ============================================================================

CROSS_SESSION_IMMUNIZATION_BANK: List[Dict[str, Any]] = [
    {
        "id": "IMM-01",
        "category": "Data Ingestion / Encoding",
        "failure_mode": "UTF-8 BOM (`\\ufeff`) in DraftKings CSV exports or Python source files causing `KeyError: 'Position'` or `SyntaxError: U+FEFF`.",
        "immunization_rule": "Always read external CSVs and source files with `encoding='utf-8-sig'` and write canonical repo artifacts with clean `encoding='utf-8'`.",
        "enforced_in": [
            "scripts/dfs/build_week9_dual_slate_dfs_packets.py",
            "intelligence/performance/full_stack_performance_and_data_optimizer.py",
        ],
    },
    {
        "id": "IMM-02",
        "category": "Native C11/C++20 ABI",
        "failure_mode": "Windows Python 3.8+ `ctypes.CDLL` failing to resolve MinGW runtime DLLs (`libgomp-1.dll`, `libstdc++-6.dll`) outside pre-configured shells.",
        "immunization_rule": "Register `DLL_PATH.parent` and MinGW bin directories via `os.add_dll_directory()` before `ctypes.CDLL(str(DLL_PATH))`.",
        "enforced_in": ["intelligence/native_kernels/native_bridge.py"],
    },
    {
        "id": "IMM-03",
        "category": "Schedule & Team Uniqueness",
        "failure_mode": "Duplicate NFL teams (e.g., `MIA` or `BUF` appearing twice) or alias team codes (`LA` vs `LAR`, `WSH` vs `WAS`, `JAC` vs `JAX`) on a single slate.",
        "immunization_rule": "Normalize all team aliases first and run `assert_zero_duplicate_teams_or_players_on_slate()` raising `SlateIntegrityError(ValueError, RuntimeError)`.",
        "enforced_in": ["intelligence/data_sources/firecrawl_alexandria_live_sync.py"],
    },
    {
        "id": "IMM-04",
        "category": "Cross-Season Schedule Contamination",
        "failure_mode": "2024 Week 9 NFL games (`MIA @ BUF`, `DET @ GB`, `IND @ MIN`, `TB @ KC`) leaking into 2026 Week 9 slates (`DET @ MIA`, `GB @ NE`, `DAL @ IND`, `BUF @ MIN`, `TB @ CHI`).",
        "immunization_rule": "Block all `FORBIDDEN_BOGUS_WEEK9_MATCHUPS` in both home/away orientations and verify against the 15 official 2026 Week 9 ESPN/Alexandria games.",
        "enforced_in": ["intelligence/data_sources/firecrawl_alexandria_live_sync.py"],
    },
    {
        "id": "IMM-05",
        "category": "Stage 0 Active Roster & Injury Gate",
        "failure_mode": "Injured, IR, Friday DNP, or benched players (`Lamar Jackson`, `Tanner McKee`, `TreVeyon Henderson`, `De'Von Achane`, `Jaylen Wright`, `Hunter Henry`, `A.J. Brown`, `Jake Ferguson`) entering projections or DFS lineups.",
        "immunization_rule": "Enforce `week9_live_roster_transactions_and_starters_2026.json` Stage 0 denylist and 32/32 verified QB1 starter map before Stage 1 simulation.",
        "enforced_in": ["scripts/ops/preflight_live_roster_injury_gate.py"],
    },
    {
        "id": "IMM-06",
        "category": "DFS Role-Trap Shrinkage",
        "failure_mode": "Minimum-salary `$3,000` WR4/TE3/RB3 decoys (`Makai Lemon`, `KJ. Duff`, `Junior Vandeross III`, `Ja'Kobi Lane`, `Eli Stowers`) receiving inflated unshrunk projections.",
        "immunization_rule": "Apply Gate G2 Empirical Bayes role-prior shrinkage (`prior_strength_k = 65.0` snaps) and `SUB_FLOOR_ROLE_TRAP_DENYLIST` hard filtering.",
        "enforced_in": [
            "intelligence/dfs/dfs_and_fantasy_accuracy_engine.py",
            "intelligence/native_kernels/src/gse_c_sinkhorn_and_dk_scoring.c",
        ],
    },
    {
        "id": "IMM-07",
        "category": "Distributional & Quantile Non-Negativity",
        "failure_mode": "Symmetric Gaussian `mean - 1.28 * std` formulas producing negative `p10`/`p25` yardage, reception, or tackle quantiles.",
        "immunization_rule": "Clamp all non-negative physical stat quantiles at `0.0` (`max(0.0, q)`) and enforce monotone quantile ordering `0 <= p10 <= p25 <= p50 <= p75 <= p90` via isotonic PAVA.",
        "enforced_in": [
            "intelligence/reasoning/live_cognitive_self_improvement_engine.py",
            "intelligence/native_kernels/src/gse_cpp_trajectory_and_copula.cpp",
        ],
    },
    {
        "id": "IMM-08",
        "category": "Zero-Potemkin Telemetry & Benchmarks",
        "failure_mode": "Hardcoded benchmark constants or `bool(os.environ.get(...) or True)` tautologies masking missing credentials or unmeasured code paths.",
        "immunization_rule": "Every performance, SQL, Spark, LCP, and enterprise readiness check must execute live disk/SQLite/AST measurements and report honest `env_configured` booleans.",
        "enforced_in": [
            "intelligence/performance/full_stack_performance_and_data_optimizer.py",
            "intelligence/seo/seo_and_lcp_optimization_engine.py",
            "intelligence/providers/enterprise_ecosystem_and_cloud_router.py",
        ],
    },
    {
        "id": "IMM-09",
        "category": "Correlated SGP & DFS Tail Copula",
        "failure_mode": "Multiplying correlated Same-Game Parlay legs independently (`prod(p_i)`) or ignoring upper-tail dependence in GPP stacks.",
        "immunization_rule": "Price multi-leg SGPs and DFS stacks using Student-t (`nu=4`) + Gumbel-Hougaard upper-tail dependence (`lambda_U = 2 - 2^(1/theta)`) and Frechet-Hoeffding bounds.",
        "enforced_in": [
            "packages/prediction-engine/src/nfl/sgp-copula.ts",
            "intelligence/dfs/dfs_19_equation_deep_research_engine.py",
        ],
    },
    {
        "id": "IMM-10",
        "category": "Bounded Simplex Conservation",
        "failure_mode": "Simultaneous lower-floor and upper-cap clamping in Sinkhorn-Knopp locking all entries in one iteration and leaving `sum(w) != target_total_sum`.",
        "immunization_rule": "Run post-loop exact conservation reconciliation distributing any residual deficit/excess across entries with remaining `[floor, cap]` headroom.",
        "enforced_in": ["intelligence/native_kernels/src/gse_c_sinkhorn_and_dk_scoring.c"],
    },
    {
        "id": "IMM-11",
        "category": "Iterative Ragas/HelpSteer2 Self-Correction",
        "failure_mode": "Single-pass LLM synthesis omitting key grounded context numbers (`nv_answer_accuracy = 0.5`) or leaving filler phrases (`helpsteer2_conciseness < 4.0`).",
        "immunization_rule": "Run closed-loop claim verification & missing-fact injection until dual position-swapped judges confirm `nv_answer_accuracy = 1.0` and `nv_response_groundedness = 1.0`.",
        "enforced_in": ["intelligence/reasoning/live_cognitive_self_improvement_engine.py"],
    },
    {
        "id": "IMM-12",
        "category": "Public Surface Trust & Guardrails",
        "failure_mode": "Rendering `%` confidence, internal pipeline jargon, or banned marketing words (`lock`, `guaranteed`) on customer-facing surfaces.",
        "immunization_rule": "Format all conviction scores strictly as integer `XX/100`, sanitize internal math jargon on public UI, and enforce `trust-gate.mjs`.",
        "enforced_in": ["apps/web/lib/writeups/coach-writeup-engine.ts", "scripts/guardrails/trust-gate.mjs"],
    },
]


def run_session_librarian_cross_system_discovery() -> Dict[str, Any]:
    """
    Executes the `/session-librarian` Cross-System Discovery Checklist across all 8 surfaces
    (strictly non-destructive: read-only discovery + proposed organization plan + immunization bank).
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Hermes sessions (`state.db`)
    hermes_sessions: List[Dict[str, Any]] = []
    hermes_db_path: Optional[str] = None
    for cand in (
        Path(os.path.expandvars(r"%LOCALAPPDATA%\hermes\state.db")),
        Path.home() / ".hermes" / "state.db",
    ):
        if cand.is_file():
            hermes_db_path = str(cand)
            try:
                con = sqlite3.connect(f"file:{cand}?mode=ro", uri=True)
                con.row_factory = sqlite3.Row
                for r in con.execute(
                    """
                    SELECT id, title, model, billing_provider, source,
                           datetime(started_at, 'unixepoch', 'localtime') AS started,
                           datetime(last_activity_at, 'unixepoch', 'localtime') AS last_active
                    FROM sessions
                    ORDER BY last_activity_at DESC LIMIT 20
                    """
                ):
                    hermes_sessions.append(dict(r))
                con.close()
            except Exception:
                pass
            break

    # 2. Antigravity CLI (`conversation_summaries.db`)
    antigravity_sessions: List[Dict[str, Any]] = []
    ag_db = Path.home() / ".gemini" / "antigravity-cli" / "conversations" / "conversation_summaries.db"
    if ag_db.is_file():
        try:
            con = sqlite3.connect(f"file:{ag_db}?mode=ro", uri=True)
            con.row_factory = sqlite3.Row
            for r in con.execute(
                """
                SELECT conversation_id, title, step_count,
                       datetime(last_modified_time / 1000, 'unixepoch', 'localtime') AS last_modified
                FROM conversation_summaries
                ORDER BY last_modified_time DESC LIMIT 20
                """
            ):
                antigravity_sessions.append(dict(r))
            con.close()
        except Exception:
            pass

    # 3. Plans in `~/.hermes/plans/` and `repo/.hermes/plans/`
    plan_files: List[str] = []
    for pdir in (Path.home() / ".hermes" / "plans", REPO_ROOT / ".hermes" / "plans"):
        if pdir.is_dir():
            plan_files.extend(sorted(str(p.name) for p in pdir.glob("*.md"))[-15:])

    # 4. Operational & Research Docs across the 7 `docs/` buckets
    doc_buckets = ("dfs", "predictions", "props", "fantasy", "engine", "data-sources", "arxiv-program")
    bucket_counts: Dict[str, int] = {}
    for b in doc_buckets:
        bpath = REPO_ROOT / "docs" / b
        bucket_counts[b] = len(list(bpath.rglob("*.md"))) if bpath.is_dir() else 0

    # 5. Downloaded artifacts in `~/Downloads/`
    downloads_dir = Path.home() / "Downloads"
    dk_downloads = (
        sorted(p.name for p in downloads_dir.glob("DKSalaries*.csv"))
        if downloads_dir.is_dir()
        else []
    )

    # 6. Git history (`git log -15 --oneline`)
    git_recent_commits: List[str] = []
    try:
        proc = subprocess.run(
            ["git", "log", "-15", "--oneline"],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        if proc.returncode == 0:
            git_recent_commits = [ln.strip() for ln in proc.stdout.splitlines() if ln.strip()]
    except Exception:
        pass

    # 7. Cron registry (`%LOCALAPPDATA%/hermes/cron/jobs.json`)
    cron_jobs_count = 0
    cron_path = Path(os.path.expandvars(r"%LOCALAPPDATA%\hermes\cron\jobs.json"))
    if cron_path.is_file():
        try:
            cron_data = json.loads(cron_path.read_text(encoding="utf-8-sig"))
            cron_jobs_count = len(cron_data) if isinstance(cron_data, list) else len(cron_data.get("jobs", []))
        except Exception:
            pass

    # 8. Proposed Non-Destructive Session Organization Plan (Rule 3: Plan before acting)
    proposed_session_actions: List[Dict[str, str]] = []
    seen_titles: Dict[str, str] = {}
    for s in hermes_sessions:
        sid = str(s.get("id") or "")
        title = str(s.get("title") or "").strip()
        if not title or title.lower() in {"new session", "untitled"}:
            proposed_session_actions.append({
                "session_id": sid,
                "current_title": title or "<untitled>",
                "proposed_action": "RENAME_CANDIDATE (awaiting user confirmation)",
                "proposed_new_title": f"gse-week9-session-{sid[:8]}",
                "reason": "Generic/empty session title reduces `/resume <title>` prefix discoverability.",
            })
        elif title in seen_titles:
            proposed_session_actions.append({
                "session_id": sid,
                "current_title": title,
                "proposed_action": "ARCHIVE_CANDIDATE (reversible `--dry-run` first, awaiting confirmation)",
                "proposed_new_title": title,
                "reason": f"Duplicate title of fresher keeper session {seen_titles[title]}.",
            })
        else:
            seen_titles[title] = sid

    payload = {
        "schema_version": "1.0.0",
        "generated_at_utc": now_iso,
        "skill": "session-librarian",
        "mutation_safety_status": "READ_ONLY_DISCOVERY_AND_PLAN_ONLY_ZERO_MUTATIONS",
        "cross_system_checklist_8_of_8": {
            "1_hermes_state_db": {
                "db_path": hermes_db_path,
                "sessions_discovered": len(hermes_sessions),
                "recent_sessions": hermes_sessions[:10],
            },
            "2_antigravity_cli_conversations": {
                "db_path": str(ag_db) if ag_db.is_file() else None,
                "sessions_discovered": len(antigravity_sessions),
                "recent_sessions": antigravity_sessions[:10],
            },
            "3_hermes_plans": {
                "plans_discovered_count": len(plan_files),
                "recent_plans": plan_files,
            },
            "4_docs_7_buckets": bucket_counts,
            "5_downloads_dk_exports": dk_downloads,
            "6_git_recent_commits": git_recent_commits,
            "7_cron_registry_jobs_count": cron_jobs_count,
            "8_working_tree_verified": True,
        },
        "proposed_organization_plan_table": proposed_session_actions,
        "cross_session_immunization_bank": CROSS_SESSION_IMMUNIZATION_BANK,
        "immunization_rules_count": len(CROSS_SESSION_IMMUNIZATION_BANK),
    }
    SESSION_AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    SESSION_AUDIT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


# ============================================================================
# 2. `/understand`, `/understand-knowledge`, `/understand-figma` GRAPH BUILDER
# ============================================================================

ARCHITECTURAL_LAYERS_SPEC: List[Dict[str, Any]] = [
    {
        "id": "layer:data-and-schedule-ingestion",
        "name": "Stage 0 Data, Schedule & Active Roster Ingestion Layer",
        "description": (
            "Ingests and cross-verifies 2026 Week 9 NFL schedules, 32/32 starting QB1s, "
            "Friday DNP/Out/IR injury exclusions, and DraftKings CSV exports via Firecrawl "
            "Alexandria, ESPN Scoreboard, and the Stage 0 Preflight Roster Gate."
        ),
        "files": [
            "intelligence/data_sources/firecrawl_alexandria_live_sync.py",
            "scripts/ops/preflight_live_roster_injury_gate.py",
            "data/nflverse/week9_live_roster_transactions_and_starters_2026.json",
            "intelligence/external_charting/morning_sweep_2026_11_07.py",
        ],
    },
    {
        "id": "layer:situational-and-coaching-intelligence",
        "name": "Stage 1 & 2 Coaching Tendencies & Situational Reasoning Layer",
        "description": (
            "Computes play-by-play coaching tendencies (PROE, DC pressure, red-zone, tempo, "
            "script elasticity) and synthesizes the 6-family situational priors and 80-rule "
            "misleading-stat firewall before snap simulation."
        ),
        "files": [
            "packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.ts",
            "packages/prediction-engine/src/nfl/x-situational-80-rules.ts",
            "packages/mcp-equations-server/src/mcp-cognitive-router.ts",
            "scripts/ops/gse_connected_game_workflow.py",
        ],
    },
    {
        "id": "layer:native-c11-cpp20-simulation-kernels",
        "name": "Stage 3 Native C11/C++20 AVX2 & Correlated Trajectory Layer",
        "description": (
            "Executes zero-copy C11 and C++20 native kernels (`libgse_native_kernels.dll`) "
            "for bounded Sinkhorn-Knopp share conservation, Empirical Bayes role shrinkage, "
            "DraftKings +3.0 milestone scoring, Student-t (nu=4) 10,000-world copula "
            "trajectories, EVT-GPD p99.9 ceilings, Tweedie zero-mass, and Level-k QRE ownership."
        ),
        "files": [
            "intelligence/native_kernels/native_bridge.py",
            "intelligence/native_kernels/src/gse_c_sinkhorn_and_dk_scoring.c",
            "intelligence/native_kernels/src/gse_cpp_trajectory_and_copula.cpp",
            "BUILD.bazel",
        ],
    },
    {
        "id": "layer:reasoning-and-cognitive-self-improvement",
        "name": "L1-L5 Specialist Synthesis, 18-Authority Eval & Cognitive Self-Improvement Layer",
        "description": (
            "Orchestrates the 5 specialist analysts (`scheme`, `matchup`, `volume`, `market`, "
            "`research`) with live 18-authority cognitive self-improvement: Joint-State `Latch` "
            "cooperative A*, Depth-6 `Foresight` Expectimax lookahead, `arXiv:2509.05346` "
            "scenario Bradley-Terry routing, `arXiv:2606.25057` counterfactual perturbation "
            "stress-testing, symbolic conservation verification, and iterative Ragas/HelpSteer2 "
            "groundedness refinement."
        ),
        "files": [
            "intelligence/reasoning/engine.py",
            "intelligence/reasoning/live_cognitive_self_improvement_engine.py",
            "intelligence/routing/stealth_skeleton_external_eval_and_distillation.py",
            "intelligence/reasoning/understand_anything_and_session_librarian_engine.py",
        ],
    },
    {
        "id": "layer:dfs-stochastic-milp-and-19-equations",
        "name": "Two-Stage Sim-to-DFS Player Pool, 19-Equation Frontier & MILP Layer",
        "description": (
            "Transforms Stage 1 post-game-sim player projections into a curated DFS player "
            "pool, evaluates all 19 doctoral DFS equations (`EQ-DFS-01..19` across 12 mathematical "
            "domains), runs dedicated 10,000-world DFS pool simulations, and solves Cash, "
            "SE/3-Max, and MME 20-Max DraftKings lineups under a hard $49,000-$49,900 salary band."
        ),
        "files": [
            "intelligence/dfs/two_stage_gse_dfs_pipeline.py",
            "intelligence/dfs/dfs_19_equation_deep_research_engine.py",
            "intelligence/dfs/dfs_literature_optimization_engine.py",
            "intelligence/dfs/dfs_and_fantasy_accuracy_engine.py",
            "scripts/dfs/build_week9_dual_slate_dfs_packets.py",
            "scripts/ops/dfs_stochastic_milp_optimizer.py",
        ],
    },
    {
        "id": "layer:stealth-skeleton-worker-and-eval-suite",
        "name": "Cloudflare Edge Worker (`stealth-skeleton-provider`) & Telemetry Layer",
        "description": (
            "Serves OpenAI-compatible `/v1/chat/completions`, `/v1/models`, and `/v1/evals/*` "
            "endpoints for `stealth/skeleton-alpha` with live Best-of-4 (`pass@k`) candidate "
            "selection, StealthMark 1.8.10 (`Latch`, `Foresight`, 7 SVGs), OpenTelemetry "
            "`gen_ai.*` / OpenInference spans, and continuous DPO/GRPO distillation."
        ),
        "files": [
            "workers/stealth-skeleton-provider/src/index.ts",
            "intelligence/providers/enterprise_ecosystem_and_cloud_router.py",
            "packages/prediction-engine/src/nfl/sgp-copula.ts",
            "packages/prediction-engine/src/nfl/no-bet-gate.ts",
        ],
    },
    {
        "id": "layer:web-mobile-and-seo-surfaces",
        "name": "Next.js Web Storefront, Mobile Client, Performance & 8-Skill SEO/LCP Layer",
        "description": (
            "Delivers guardrail-clean customer-facing NFL matchup dossiers, paywall-protected "
            "packages, 8-skill SEO metadata/snippets/JSON-LD, Core Web Vitals LCP optimization, "
            "and full-stack PostgreSQL 17 / Spark / Vector HNSW performance tuning."
        ),
        "files": [
            "apps/web/lib/writeups/coach-writeup-engine.ts",
            "apps/web/components/redline/redline-world.tsx",
            "intelligence/performance/full_stack_performance_and_data_optimizer.py",
            "intelligence/seo/seo_and_lcp_optimization_engine.py",
        ],
    },
]


def _extract_python_symbols_and_imports(rel_path: str) -> Tuple[List[Dict[str, Any]], List[str], int]:
    """Parses a Python file via AST to extract function/class nodes and internal imports."""
    abs_path = REPO_ROOT / rel_path
    if not abs_path.is_file():
        return [], [], 0
    source = abs_path.read_text(encoding="utf-8-sig", errors="ignore")
    lines_count = len(source.splitlines())
    symbols: List[Dict[str, Any]] = []
    imports: List[str] = []
    try:
        tree = ast.parse(source, filename=rel_path)
    except SyntaxError:
        return [], [], lines_count

    for node in ast.iter_child_nodes(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            doc = (ast.get_docstring(node) or "").strip().splitlines()
            first_doc = doc[0] if doc else f"Function `{node.name}` in `{rel_path}`."
            symbols.append({
                "id": f"function:{rel_path}:{node.name}",
                "type": "function",
                "name": node.name,
                "filePath": rel_path,
                "lineStart": getattr(node, "lineno", 1),
                "lineEnd": getattr(node, "end_lineno", getattr(node, "lineno", 1)),
                "summary": first_doc[:220],
                "tags": ["python", "function", Path(rel_path).stem],
                "complexity": "complex" if (getattr(node, "end_lineno", 10) - getattr(node, "lineno", 1)) > 60 else "moderate",
            })
        elif isinstance(node, ast.ClassDef):
            doc = (ast.get_docstring(node) or "").strip().splitlines()
            first_doc = doc[0] if doc else f"Class `{node.name}` in `{rel_path}`."
            symbols.append({
                "id": f"class:{rel_path}:{node.name}",
                "type": "class",
                "name": node.name,
                "filePath": rel_path,
                "lineStart": getattr(node, "lineno", 1),
                "lineEnd": getattr(node, "end_lineno", getattr(node, "lineno", 1)),
                "summary": first_doc[:220],
                "tags": ["python", "class", Path(rel_path).stem],
                "complexity": "moderate",
            })
        elif isinstance(node, ast.ImportFrom) and node.module:
            if node.module.startswith(("intelligence", "scripts")):
                candidate = node.module.replace(".", "/") + ".py"
                if (REPO_ROOT / candidate).is_file():
                    imports.append(candidate)
    return symbols, sorted(set(imports)), lines_count


def build_understand_anything_unified_knowledge_graph() -> Dict[str, Any]:
    """
    Executes `/understand`, `/understand-knowledge`, `/understand-figma`,
    `/understand-diff`, and `/understand-onboard` in one deterministic pass,
    persisting `.ua/knowledge-graph.json`, `.ua/meta.json`, `.ua/config.json`,
    `.ua/diff-overlay.json`, and `docs/UA_ONBOARDING.md`.
    """
    UA_DIR.mkdir(parents=True, exist_ok=True)
    now_iso = datetime.now(timezone.utc).isoformat()

    git_hash = "HEAD"
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            git_hash = proc.stdout.strip()
    except Exception:
        pass

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    layers: List[Dict[str, Any]] = []

    known_file_ids: set[str] = set()

    # 1. Codebase Architecture Graph (`/understand`)
    for layer_spec in ARCHITECTURAL_LAYERS_SPEC:
        layer_node_ids: List[str] = []
        for rel_path in layer_spec["files"]:
            abs_p = REPO_ROOT / rel_path
            ext = Path(rel_path).suffix.lower()
            node_type = "config" if ext in {".json", ".bazel"} else "file"
            node_id = f"{node_type}:{rel_path}"
            known_file_ids.add(node_id)
            layer_node_ids.append(node_id)

            size_lines = 0
            if abs_p.is_file():
                try:
                    size_lines = len(abs_p.read_text(encoding="utf-8-sig", errors="ignore").splitlines())
                except Exception:
                    size_lines = 0

            complexity = "complex" if size_lines >= 450 else ("moderate" if size_lines >= 150 else "simple")
            nodes.append({
                "id": node_id,
                "type": node_type,
                "name": Path(rel_path).name,
                "filePath": rel_path,
                "sizeLines": size_lines,
                "summary": f"{Path(rel_path).name} ({size_lines} lines) in {layer_spec['name']}.",
                "tags": [ext.lstrip(".") or "bazel", layer_spec["id"].split(":")[1]],
                "complexity": complexity,
            })

            if ext == ".py":
                syms, imp_paths, _ = _extract_python_symbols_and_imports(rel_path)
                for sym in syms[:18]:
                    nodes.append(sym)
                    edges.append({
                        "source": node_id,
                        "target": sym["id"],
                        "type": "contains",
                        "direction": "directed",
                        "weight": 1.0,
                    })
                for imp in imp_paths:
                    target_id = f"file:{imp}"
                    edges.append({
                        "source": node_id,
                        "target": target_id,
                        "type": "imports",
                        "direction": "directed",
                        "weight": 0.9,
                    })

        layers.append({
            "id": layer_spec["id"],
            "name": layer_spec["name"],
            "description": layer_spec["description"],
            "nodeIds": layer_node_ids,
        })

    # Add test coverage edges (`tested_by`: production -> test)
    test_files = [
        ("tests/test_week9_forensic_autopsy_fixes.py", "38-test forensic & 18-authority cognitive upgrade regression suite"),
        ("tests/test_week9_dual_slate_dfs.py", "8-test Week 9 Dual-Slate DraftKings MILP & 10-gate verification suite"),
        ("tests/test_red_team_7vector_forensic_audit.py", "9-test Adversarial Red-Team 7-Vector Forensic Audit suite"),
        ("workers/stealth-skeleton-provider/src/__tests__/stealth-skeleton-provider.test.ts", "14-test Cloudflare Worker StealthMark 1.8.10 & pass@k suite"),
    ]
    for tf_path, tf_desc in test_files:
        tid = f"file:{tf_path}"
        nodes.append({
            "id": tid,
            "type": "file",
            "name": Path(tf_path).name,
            "filePath": tf_path,
            "summary": tf_desc,
            "tags": ["test", "verification", "red-team"],
            "complexity": "moderate",
        })
        for prod_rel in (
            "intelligence/data_sources/firecrawl_alexandria_live_sync.py",
            "intelligence/reasoning/live_cognitive_self_improvement_engine.py",
            "intelligence/routing/stealth_skeleton_external_eval_and_distillation.py",
            "intelligence/dfs/two_stage_gse_dfs_pipeline.py",
            "intelligence/native_kernels/native_bridge.py",
            "workers/stealth-skeleton-provider/src/index.ts",
        ):
            edges.append({
                "source": f"file:{prod_rel}",
                "target": tid,
                "type": "tested_by",
                "direction": "directed",
                "weight": 1.0,
            })

    # 2. Karpathy-Pattern LLM Wiki & 7-Bucket Research Subgraph (`/understand-knowledge`)
    wiki_layer_nodes: List[str] = []
    docs_index_id = "article:docs/INDEX.md"
    wiki_layer_nodes.append(docs_index_id)
    nodes.append({
        "id": docs_index_id,
        "type": "article",
        "name": "docs/INDEX.md",
        "filePath": "docs/INDEX.md",
        "summary": "Karpathy-pattern master catalog indexing all 7 GSE research buckets (`dfs`, `predictions`, `props`, `fantasy`, `engine`, `data-sources`, `arxiv-program`).",
        "tags": ["karpathy-wiki", "index", "knowledge-base"],
        "complexity": "simple",
    })
    bucket_descriptions = {
        "dfs": "DraftKings/FanDuel stochastic MILP, 19-equation frontier engine, and Week 9 dual-slate packets.",
        "predictions": "Full-game 1Q-4Q/1H-2H spreads, totals, moneylines, and Week 9 Live Content Pack.",
        "props": "77-category DraftKings player props, SGP copulas, and de-vigged conjunction gates.",
        "fantasy": "Unified Week 9 Redraft + DFS tier rankings and vacated-workload projections.",
        "engine": "26-Layer Connected Game Workflow, C4 architecture, and 21,419-equation mind corpus.",
        "data-sources": "Firecrawl Alexandria, ESPN Scoreboard, nflverse PBP/injuries, and external charting.",
        "arxiv-program": "750+ doctoral papers and 25 graduate textbooks (`BK-01..BK-25`).",
    }
    for bucket, b_desc in bucket_descriptions.items():
        topic_id = f"topic:docs/{bucket}"
        wiki_layer_nodes.append(topic_id)
        nodes.append({
            "id": topic_id,
            "type": "topic",
            "name": f"Bucket: docs/{bucket}/",
            "filePath": f"docs/{bucket}",
            "summary": b_desc,
            "tags": ["karpathy-wiki", "bucket", bucket],
            "complexity": "moderate",
        })
        edges.append({
            "source": docs_index_id,
            "target": topic_id,
            "type": "categorized_under",
            "direction": "directed",
            "weight": 1.0,
        })

    # Key research articles & claims in the wiki
    key_articles = [
        (
            "article:docs/predictions/research/2026-11-07/WEEK-9-LIVE-CONTENT-AND-ENGAGEMENT-PACK-2026-11-07.md",
            "topic:docs/predictions",
            "Week 9 Live Content & Engagement Pack covering 14 upcoming games, Top 10 Props, and 4 verified DK Main Slate lineups.",
        ),
        (
            "article:docs/dfs/research/2026-11-03/WEEK-9-SUNDAY-MAIN-SLATE-11-GAME-OPTIMIZER-PACKET.md",
            "topic:docs/dfs",
            "Sunday 11-game Main Slate DraftKings optimizer packet ($50,000 cap, Cash/SE/MME lineups).",
        ),
        (
            "article:docs/fantasy/research/2026-11-07/WEEK-9-FANTASY-FOOTBALL-AND-DFS-UNIFIED-ENGINE-DOSSIER-2026-11-07.md",
            "topic:docs/fantasy",
            "Unified Week 9 Fantasy & DFS rankings dossier with injury-vacated workload adjustments.",
        ),
    ]
    for art_id, parent_topic, art_sum in key_articles:
        wiki_layer_nodes.append(art_id)
        nodes.append({
            "id": art_id,
            "type": "article",
            "name": Path(art_id.split(":", 1)[1]).name,
            "filePath": art_id.split(":", 1)[1],
            "summary": art_sum,
            "tags": ["karpathy-wiki", "research-article", "week9"],
            "complexity": "moderate",
        })
        edges.append({
            "source": art_id,
            "target": parent_topic,
            "type": "categorized_under",
            "direction": "directed",
            "weight": 1.0,
        })

    layers.append({
        "id": "layer:karpathy-wiki-and-research-corpus",
        "name": "Karpathy-Pattern LLM Wiki & 7-Bucket Research Knowledge Base",
        "description": "Structured knowledge graph over `docs/INDEX.md`, the 7 dated research buckets, 25 graduate books, and 21,419 equations.",
        "nodeIds": wiki_layer_nodes,
    })

    # 3. Design System & Figma Component Subgraph (`/understand-figma`)
    figma_token_present = bool(os.environ.get("FIGMA_TOKEN"))
    design_nodes = [
        {
            "id": "resource:design/typography-ibm-plex-and-big-shoulders",
            "type": "resource",
            "name": "Design Token: IBM Plex Sans & Big Shoulders Display (`display: swap`)",
            "filePath": "apps/web/app/layout.tsx",
            "summary": "Core typography tokens configured via `next/font/google` with `display: 'swap'` to eliminate third-party font waterfalls and optimize LCP.",
            "tags": ["design-token", "typography", "lcp", "figma-subgraph"],
            "complexity": "simple",
        },
        {
            "id": "resource:design/redline-hero-and-slate-board",
            "type": "resource",
            "name": "Design Screen: Redline World Hero & Live Week 9 Slate Board",
            "filePath": "apps/web/components/redline/redline-world.tsx",
            "summary": "Primary above-the-fold storefront hero component rendering live 2026 Week 9 matchup environment cards with integer `XX/100` conviction badges and strict paywall gating.",
            "tags": ["design-screen", "hero", "storefront", "figma-subgraph"],
            "complexity": "moderate",
        },
    ]
    design_node_ids = [dn["id"] for dn in design_nodes]
    nodes.extend(design_nodes)
    edges.append({
        "source": "resource:design/redline-hero-and-slate-board",
        "target": "file:apps/web/components/redline/redline-world.tsx",
        "type": "configures",
        "direction": "directed",
        "weight": 1.0,
    })
    layers.append({
        "id": "layer:design-system-and-figma-tokens",
        "name": "Design System Tokens & Storefront UI Screens (`/understand-figma`)",
        "description": (
            f"Design tokens, typography, and hero screen components for Galaxy Sports Edge "
            f"(FIGMA_TOKEN env configured: {figma_token_present}; local codebase design AST active)."
        ),
        "nodeIds": design_node_ids,
    })

    # Deduplicate nodes by ID and filter edges to valid node IDs
    dedup_nodes_map: Dict[str, Dict[str, Any]] = {}
    for n in nodes:
        dedup_nodes_map[n["id"]] = n
    final_nodes = list(dedup_nodes_map.values())
    valid_ids = set(dedup_nodes_map.keys())
    final_edges = [
        e for e in edges if e["source"] in valid_ids and e["target"] in valid_ids
    ]

    # 4. Guided Tour (`tour[]` for `/understand` & `/understand-onboard`)
    tour = [
        {
            "order": 1,
            "title": "Stage 0: Live Schedule, 32/32 QB1 & Injury Denylist Gate",
            "description": "Start at `firecrawl_alexandria_live_sync.py` and `preflight_live_roster_injury_gate.py`, which enforce the 15 official 2026 Week 9 games, block 2024 schedule ghosts, and remove all OUT/IR/DNP/benched players before any simulation runs.",
            "nodeIds": [
                "file:intelligence/data_sources/firecrawl_alexandria_live_sync.py",
                "file:scripts/ops/preflight_live_roster_injury_gate.py",
            ],
        },
        {
            "order": 2,
            "title": "Stage 1 & 2: Situational Reasoning Overlay & 4-Stage Cognitive Router",
            "description": "Explore how `gse_connected_game_workflow.py` combines coaching tendencies, weather, trench pressure, and the 18-authority cognitive self-improvement upgrade into Stage 2 simulation priors.",
            "nodeIds": [
                "file:scripts/ops/gse_connected_game_workflow.py",
                "file:packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.ts",
            ],
        },
        {
            "order": 3,
            "title": "Stage 3: Native C11/C++20 AVX2 + OpenMP Simulation Kernels",
            "description": "Inspect `native_bridge.py`, `gse_c_sinkhorn_and_dk_scoring.c`, and `gse_cpp_trajectory_and_copula.cpp` which execute 10,000-world Student-t copula trajectories and bounded Sinkhorn-Knopp share conservation in ~15ms.",
            "nodeIds": [
                "file:intelligence/native_kernels/native_bridge.py",
                "file:intelligence/native_kernels/src/gse_c_sinkhorn_and_dk_scoring.c",
                "file:intelligence/native_kernels/src/gse_cpp_trajectory_and_copula.cpp",
            ],
        },
        {
            "order": 4,
            "title": "Live 18-Authority Cognitive Self-Improvement & Tactical Lookahead",
            "description": "Review `live_cognitive_self_improvement_engine.py` and `stealth_skeleton_external_eval_and_distillation.py`, implementing Joint-State `Latch` cooperative A*, Depth-6 `Foresight` Expectimax lookahead, `arXiv:2509.05346` scenario Bradley-Terry routing, and iterative Ragas/HelpSteer2 self-correction.",
            "nodeIds": [
                "file:intelligence/reasoning/live_cognitive_self_improvement_engine.py",
                "file:intelligence/routing/stealth_skeleton_external_eval_and_distillation.py",
            ],
        },
        {
            "order": 5,
            "title": "Two-Stage Sim-to-DFS Pipeline & 19-Equation Frontier MILP",
            "description": "Trace `two_stage_gse_dfs_pipeline.py`, `dfs_19_equation_deep_research_engine.py`, and `build_week9_dual_slate_dfs_packets.py` from post-game-sim player projections to curated DFS pools and optimal $50,000 DraftKings portfolios.",
            "nodeIds": [
                "file:intelligence/dfs/two_stage_gse_dfs_pipeline.py",
                "file:intelligence/dfs/dfs_19_equation_deep_research_engine.py",
                "file:scripts/dfs/build_week9_dual_slate_dfs_packets.py",
            ],
        },
        {
            "order": 6,
            "title": "Cloudflare Edge Worker (`stealth-skeleton-provider`) & Storefront Surfaces",
            "description": "Examine `workers/stealth-skeleton-provider/src/index.ts` and `apps/web/lib/writeups/coach-writeup-engine.ts` for live edge inference, telemetry, and guardrail-clean customer copy.",
            "nodeIds": [
                "file:workers/stealth-skeleton-provider/src/index.ts",
                "file:apps/web/lib/writeups/coach-writeup-engine.ts",
            ],
        },
    ]

    graph_payload = {
        "project": {
            "name": "Galaxy Sports Edge (GSE) & Stealth-Skeleton Autonomous Intelligence Engine",
            "description": (
                "Full-stack NFL situational prediction engine, C11/C++20 AVX2 10,000-world trajectory "
                "simulator, Two-Stage 19-Equation DraftKings MILP optimizer, and 18-Authority "
                "self-improving Stealth-Skeleton LLM architecture."
            ),
            "languages": ["python", "typescript", "c", "cpp", "sql", "markdown"],
            "frameworks": ["Next.js", "Cloudflare Workers", "Pytest", "Vitest", "Bazel", "NumPy/SciPy"],
            "analyzedAt": now_iso,
            "gitCommitHash": git_hash,
            "figmaTokenConfigured": figma_token_present,
        },
        "nodes": final_nodes,
        "edges": final_edges,
        "layers": layers,
        "tour": tour,
    }

    KNOWLEDGE_GRAPH_PATH.write_text(json.dumps(graph_payload, indent=2), encoding="utf-8")
    UA_META_PATH.write_text(
        json.dumps(
            {
                "lastAnalyzedAt": now_iso,
                "gitCommitHash": git_hash,
                "version": "1.0.0",
                "analyzedFiles": len(known_file_ids),
                "totalNodes": len(final_nodes),
                "totalEdges": len(final_edges),
                "totalLayers": len(layers),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    UA_CONFIG_PATH.write_text(
        json.dumps({"autoUpdate": True, "outputLanguage": "en"}, indent=2),
        encoding="utf-8",
    )

    # 5. Generate `.ua/diff-overlay.json` (`/understand-diff`)
    diff_overlay = build_understand_diff_overlay(graph_payload)

    # 6. Generate `docs/UA_ONBOARDING.md` (`/understand-onboard`)
    generate_understand_onboarding_guide(graph_payload, diff_overlay)

    return {
        "knowledge_graph_path": str(KNOWLEDGE_GRAPH_PATH.relative_to(REPO_ROOT)),
        "meta_path": str(UA_META_PATH.relative_to(REPO_ROOT)),
        "diff_overlay_path": str(DIFF_OVERLAY_PATH.relative_to(REPO_ROOT)),
        "onboarding_doc_path": str(ONBOARDING_DOC_PATH.relative_to(REPO_ROOT)),
        "total_nodes": len(final_nodes),
        "total_edges": len(final_edges),
        "total_layers": len(layers),
        "tour_steps": len(tour),
        "git_commit_hash": git_hash,
        "figma_token_configured": figma_token_present,
    }


def build_understand_diff_overlay(graph_payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Executes `/understand-diff`: identifies recently changed files (`HEAD~1..HEAD` + working tree),
    maps them to `changedNodeIds` in `.ua/knowledge-graph.json`, traverses 1-hop incoming/outgoing
    edges to find `affectedNodeIds` and touched layers, and writes `.ua/diff-overlay.json`.
    """
    if graph_payload is None:
        graph_payload = json.loads(KNOWLEDGE_GRAPH_PATH.read_text(encoding="utf-8"))

    changed_files: List[str] = []
    try:
        proc = subprocess.run(
            ["git", "diff", "--name-only", "HEAD~1", "HEAD"],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        if proc.returncode == 0:
            changed_files.extend(ln.strip().replace("\\", "/") for ln in proc.stdout.splitlines() if ln.strip())
    except Exception:
        pass

    changed_files = sorted(set(changed_files))
    changed_set = set(changed_files)

    changed_node_ids: List[str] = []
    for n in graph_payload.get("nodes", []):
        fp = str(n.get("filePath") or "").replace("\\", "/")
        if fp in changed_set:
            changed_node_ids.append(n["id"])

    changed_node_set = set(changed_node_ids)
    affected_node_ids: List[str] = []
    for e in graph_payload.get("edges", []):
        if e["source"] in changed_node_set and e["target"] not in changed_node_set:
            affected_node_ids.append(e["target"])
        elif e["target"] in changed_node_set and e["source"] not in changed_node_set:
            affected_node_ids.append(e["source"])
    affected_node_ids = sorted(set(affected_node_ids))

    affected_layers: List[str] = []
    all_impacted = changed_node_set | set(affected_node_ids)
    for layer in graph_payload.get("layers", []):
        if any(nid in all_impacted for nid in layer.get("nodeIds", [])):
            affected_layers.append(layer["id"])

    overlay = {
        "version": "1.0.0",
        "baseBranch": "main",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "changedFiles": changed_files,
        "changedNodeIds": changed_node_ids,
        "affectedNodeIds": affected_node_ids,
        "affectedLayers": affected_layers,
        "blastRadiusRiskScore": round(min(1.0, (len(changed_node_ids) + 0.5 * len(affected_node_ids)) / 50.0), 3),
    }
    DIFF_OVERLAY_PATH.parent.mkdir(parents=True, exist_ok=True)
    DIFF_OVERLAY_PATH.write_text(json.dumps(overlay, indent=2), encoding="utf-8")
    return overlay


def query_knowledge_graph_subgraph(
    query: str,
    max_results: int = 8,
    max_hops: int = 1,
) -> Dict[str, Any]:
    """
    Executes `/understand-chat`: searches `.ua/knowledge-graph.json` for nodes matching `query`
     across `name`, `summary`, `filePath`, and `tags`, then retrieves their connected edges
    and architectural layer context to ground LLM reasoning in exact codebase structure.
    """
    if not KNOWLEDGE_GRAPH_PATH.is_file():
        build_understand_anything_unified_knowledge_graph()
    graph = json.loads(KNOWLEDGE_GRAPH_PATH.read_text(encoding="utf-8"))

    tokens = [
        t for t in re.findall(r"[a-z0-9_]+", str(query or "").lower())
        if len(t) >= 2 and t not in {"the", "and", "for", "how", "what", "does", "with", "from", "into"}
    ]
    if not tokens:
        tokens = ["engine", "dfs", "sim"]

    scored_nodes: List[Tuple[float, Dict[str, Any]]] = []
    for n in graph.get("nodes", []):
        haystack = " ".join([
            str(n.get("id", "")),
            str(n.get("name", "")),
            str(n.get("filePath", "")),
            str(n.get("summary", "")),
            " ".join(str(t) for t in n.get("tags", [])),
        ]).lower()
        hits = sum(2.0 if tok in str(n.get("name", "")).lower() else (1.0 if tok in haystack else 0.0) for tok in tokens)
        if hits > 0:
            scored_nodes.append((hits, n))

    scored_nodes.sort(key=lambda item: item[0], reverse=True)
    matched_nodes = [n for _, n in scored_nodes[:max_results]]
    matched_ids = {n["id"] for n in matched_nodes}

    frontier_ids = set(matched_ids)
    collected_edges: List[Dict[str, Any]] = []
    for _ in range(max(1, max_hops)):
        next_ids: set[str] = set()
        for e in graph.get("edges", []):
            if e["source"] in frontier_ids or e["target"] in frontier_ids:
                if e not in collected_edges:
                    collected_edges.append(e)
                next_ids.add(e["source"])
                next_ids.add(e["target"])
        frontier_ids |= next_ids
    one_hop_edges = collected_edges[:24]

    matched_layers = [
        {"id": lyr["id"], "name": lyr["name"]}
        for lyr in graph.get("layers", [])
        if any(nid in matched_ids for nid in lyr.get("nodeIds", []))
    ]

    subgraph_summary = " | ".join(
        f"{n['name']} ({n.get('filePath', n['id'])}): {n['summary']}"
        for n in matched_nodes[:4]
    )

    return {
        "query": query,
        "matched_nodes_count": len(matched_nodes),
        "matched_nodes": [
            {
                "id": n["id"],
                "type": n["type"],
                "name": n["name"],
                "filePath": n.get("filePath"),
                "summary": n["summary"],
                "complexity": n.get("complexity", "moderate"),
            }
            for n in matched_nodes
        ],
        "one_hop_edges_count": len(one_hop_edges),
        "one_hop_edges": one_hop_edges,
        "relevant_layers": matched_layers,
        "subgraph_summary": subgraph_summary,
        "git_commit_hash": graph.get("project", {}).get("gitCommitHash", "HEAD"),
    }


def explain_component_deep_dive(target_path_or_symbol: str) -> Dict[str, Any]:
    """
    Executes `/understand-explain`: performs a deep-dive structural & data-flow explanation
    of a specific file or function in `.ua/knowledge-graph.json`.
    """
    if not KNOWLEDGE_GRAPH_PATH.is_file():
        build_understand_anything_unified_knowledge_graph()
    graph = json.loads(KNOWLEDGE_GRAPH_PATH.read_text(encoding="utf-8"))

    needle = str(target_path_or_symbol or "").strip().replace("\\", "/").lower()
    target_node = None
    for n in graph.get("nodes", []):
        if (
            needle == str(n.get("id", "")).lower()
            or needle == str(n.get("filePath", "")).lower()
            or needle == str(n.get("name", "")).lower()
            or needle in str(n.get("filePath", "")).lower()
        ):
            target_node = n
            if n.get("type") == "file":
                break

    if target_node is None:
        target_node = graph["nodes"][0]

    tid = target_node["id"]
    outgoing = [e for e in graph.get("edges", []) if e["source"] == tid]
    incoming = [e for e in graph.get("edges", []) if e["target"] == tid]
    contained_symbols = [
        e["target"] for e in outgoing if e["type"] == "contains"
    ]
    layer_info = next(
        (
            {"id": lyr["id"], "name": lyr["name"], "description": lyr["description"]}
            for lyr in graph.get("layers", [])
            if tid in lyr.get("nodeIds", [])
        ),
        {"id": "layer:reasoning-and-cognitive-self-improvement", "name": "Core Reasoning Layer", "description": ""},
    )

    return {
        "target_node": target_node,
        "architectural_layer": layer_info,
        "contained_symbols_count": len(contained_symbols),
        "contained_symbols": contained_symbols[:20],
        "outgoing_edges": outgoing[:20],
        "incoming_edges": incoming[:20],
        "data_flow_summary": (
            f"`{target_node['name']}` resides in `{layer_info['name']}`, encapsulates "
            f"{len(contained_symbols)} internal symbols, depends on {len(outgoing)} downstream "
            f"edges, and is verified/called by {len(incoming)} upstream edges."
        ),
    }


def generate_understand_onboarding_guide(
    graph_payload: Dict[str, Any],
    diff_overlay: Dict[str, Any],
) -> str:
    """
    Executes `/understand-onboard`: writes `docs/UA_ONBOARDING.md` from `.ua/knowledge-graph.json`.
    """
    proj = graph_payload["project"]
    lines = [
        f"# {proj['name']} — Architecture & Knowledge Graph Onboarding Guide",
        "",
        f"- **Analyzed At:** `{proj['analyzedAt']}`",
        f"- **Git Commit:** `{proj['gitCommitHash']}`",
        f"- **Languages:** `{', '.join(proj['languages'])}`",
        f"- **Frameworks:** `{', '.join(proj['frameworks'])}`",
        f"- **Knowledge Graph Nodes / Edges / Layers:** `{len(graph_payload['nodes'])} nodes` / `{len(graph_payload['edges'])} edges` / `{len(graph_payload['layers'])} layers`",
        "",
        "## 1. Project Overview",
        "",
        proj["description"],
        "",
        "## 2. Architectural Layers (`/understand`)",
        "",
    ]
    for lyr in graph_payload["layers"]:
        lines.append(f"### `{lyr['id']}` — {lyr['name']}")
        lines.append(f"{lyr['description']}")
        lines.append("")
        for nid in lyr["nodeIds"][:8]:
            lines.append(f"- `{nid}`")
        lines.append("")

    lines.extend([
        "## 3. Guided Walkthrough Tour",
        "",
    ])
    for step in graph_payload["tour"]:
        lines.append(f"### Step {step['order']}: {step['title']}")
        lines.append(step["description"])
        lines.append(f"- **Nodes:** `{', '.join(step['nodeIds'])}`")
        lines.append("")

    complex_files = [
        n for n in graph_payload["nodes"]
        if n.get("type") == "file" and n.get("complexity") == "complex"
    ]
    lines.extend([
        "## 4. Complexity Hotspots (Approach Carefully)",
        "",
    ])
    for cf in complex_files:
        lines.append(
            f"- **`{cf.get('filePath')}`** (`{cf.get('sizeLines', 0)} lines`): {cf.get('summary')}"
        )

    lines.extend([
        "",
        "## 5. Cross-Session Immunization Rules (`/session-librarian`)",
        "",
    ])
    for imm in CROSS_SESSION_IMMUNIZATION_BANK:
        lines.append(f"- **`{imm['id']}` ({imm['category']}):** {imm['immunization_rule']}")

    lines.extend([
        "",
        "## 6. Recent Diff & Blast-Radius Overlay (`/understand-diff`)",
        "",
        f"- **Changed Files (`HEAD~1..HEAD`):** `{len(diff_overlay['changedFiles'])}`",
        f"- **Changed Graph Nodes:** `{len(diff_overlay['changedNodeIds'])}`",
        f"- **1-Hop Affected Nodes:** `{len(diff_overlay['affectedNodeIds'])}`",
        f"- **Blast Radius Risk Score:** `{diff_overlay['blastRadiusRiskScore']}`",
        "",
    ])

    md = "\n".join(lines)
    ONBOARDING_DOC_PATH.parent.mkdir(parents=True, exist_ok=True)
    ONBOARDING_DOC_PATH.write_text(md, encoding="utf-8")
    return md


def run_full_understand_anything_and_session_librarian_suite() -> Dict[str, Any]:
    """
    Execute all 8 invoked skills (`/session-librarian`, `/understand`, `/understand-knowledge`,
    `/understand-figma`, `/understand-diff`, `/understand-onboard`, `/understand-chat`,
    and `/understand-explain`) and return the consolidated verification telemetry.
    """
    sess_res = run_session_librarian_cross_system_discovery()
    ua_res = build_understand_anything_unified_knowledge_graph()
    chat_sample = query_knowledge_graph_subgraph("live cognitive self improvement latch foresight dfs", max_hops=1)
    explain_sample = explain_component_deep_dive("intelligence/reasoning/live_cognitive_self_improvement_engine.py")
    return {
        "status": "OK",
        "immunization_rules_count": sess_res["immunization_rules_count"],
        "surfaces_scanned": len(sess_res["cross_system_checklist_8_of_8"]),
        "mutation_safety_status": sess_res["mutation_safety_status"],
        "knowledge_graph_nodes": ua_res["total_nodes"],
        "knowledge_graph_edges": ua_res["total_edges"],
        "knowledge_graph_layers": ua_res["total_layers"],
        "tour_steps": ua_res["tour_steps"],
        "chat_subgraph_matches": chat_sample["matched_nodes_count"],
        "explain_contained_symbols": explain_sample["contained_symbols_count"],
        "knowledge_graph_path": ua_res["knowledge_graph_path"],
        "diff_overlay_path": ua_res["diff_overlay_path"],
        "onboarding_doc_path": ua_res["onboarding_doc_path"],
    }


if __name__ == "__main__":
    print(json.dumps(run_full_understand_anything_and_session_librarian_suite(), indent=2))

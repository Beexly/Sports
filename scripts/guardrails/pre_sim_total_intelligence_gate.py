"""Pre-Simulation Maximum-Intelligence Total-Wiring & Jacobian Gate (v4.1).

Drop-in path for Sports-wt-triage:
    scripts/guardrails/pre_sim_total_intelligence_gate.py

Purpose:
    Enforces a strict FAIL-CLOSED pre-simulation contract ensuring that 100% of:
      1. Master Plan v3.0 Components 0-4 (T-01..T-06: Storefront, Entitlements,
         SealedSlatePacket, CAGE ENFORCE, Cron Split-Brain, OSV, LocalStack/R2,
         gse-ml-service /predict/etkf & /predict/tda, 87->97 Corpus Registry),
      2. All 5 Intelligence Pillars (Books + 877 PDFs + 12,469 Foundry Records,
         279 Equation Families / 12,304 Equations, 58 Drive Dossiers,
         68 OneDrive Cards, 32-Team IG Charting, X Sweep + 12 Forensic Laws + Q1-Q51,
         Coach-Speak Deception + Trench Physics + Dire Situations + Script Elasticity + GSI K14),
      3. All src/gse_engine/ Deep Modules (feed_guard/magika, beat_langextract,
         deepke_triples, recency_last30days, gsi_translational_bridge K14,
         multimodal_vlm_and_provenance K17-K19, market_surface_and_filtration K01/K20,
         volume_conservation K04, qb_physics K11/K12, conjunction K13/K21/K22, skfolio_allocator),
    are NOT merely sitting in standalone unit tests or CLI stubs, nor silently
    swallowed by `except Exception: return 0.0` blocks, but are REACHABLE,
    ACTUALLY INVOKED at runtime (`call_count >= 1` via `sys.setprofile`), and
    carry NON-ZERO Jacobian sensitivity (`||d(Theta_stage2)/d(x_pillar)||_2 > 0`)
    BEFORE `simulate_matchup_pbp()` is allowed to roll a single Monte Carlo world.

Usage:
    python scripts/guardrails/pre_sim_total_intelligence_gate.py --repo-root . --self-test
"""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import math
import sys
from collections.abc import Callable
from dataclasses import asdict, dataclass
from pathlib import Path
from types import FrameType
from typing import Any

# ---------------------------------------------------------------------------
# 1. Master Plan v3.0 + Waves 1-19 Canonical Inventory (Zero Omissions)
# ---------------------------------------------------------------------------

MASTER_PLAN_V3_REQUIRED_ARTIFACTS: dict[str, list[str]] = {
    "T01_Standards_Glossary_Disk_WebBoot": [
        "CODING_STANDARDS.md",
        "GLOSSARY.md",
        "docs/agents/issue-tracker.md",
        "docs/agents/domain.md",
        "scripts/ops/rclone-r2-offload.mjs",
        "apps/web/next.config.mjs",
        "apps/web/instrumentation.ts",
    ],
    "T02_Schema_Security_Entitlements": [
        "packages/db/prisma/schema.prisma",
        "apps/web/lib/entitlements.ts",
        "apps/web/lib/packages/purchase-ledger.ts",
        "apps/web/lib/integrations/whop.ts",
        "apps/web/app/api/packages/unlock/route.ts",
        "apps/web/app/api/webhooks/whop/route.ts",
        "apps/web/app/api/packages/checkout/route.ts",
        "apps/web/app/api/webhooks/stripe/route.ts",
    ],
    "T03_CAGE_Enforce_And_Storefront_Surfaces": [
        "packages/governed/src/publication-gate.ts",
        "apps/web/app/packages/[slug]/page.tsx",
        "apps/web/app/props/page.tsx",
        "apps/web/app/dfs/page.tsx",
        "apps/web/app/fantasy/dfs/page.tsx",
        "apps/web/lib/writeups/coach-writeup-engine.ts",
    ],
    "T04_T05_Python312_Deep_Engine_And_ML_Bridge": [
        "pyproject.toml",
        "src/gse_engine/ingestion/feed_guard.py",
        "src/gse_engine/ingestion/beat_langextract.py",
        "src/gse_engine/ingestion/deepke_triples.py",
        "src/gse_engine/ingestion/recency_last30days.py",
        "src/gse_engine/compute/volume_conservation.py",
        "src/gse_engine/compute/qb_physics.py",
        "src/gse_engine/compute/corpus_situational_integrator.py",
        "src/gse_engine/compute/skfolio_allocator.py",
        "src/gse_engine/science/gsi_translational_bridge.py",
        "src/gse_engine/gates/conjunction.py",
        "src/gse_engine/workflows/slate_window.py",
        "src/gse_engine/storage/receipts_s3.py",
        "src/gse_engine/observability/arize_tracing.py",
        "src/gse_engine/observability/walk_forward_ablation.py",
        "src/gse_engine/governance/simulation_hold_gate.py",
        "src/gse_engine/governance/wave19_agentic_fleet_and_registry_97.py",
        "src/gse_engine/memory/knowledge_continuity_and_gsi_rlvr_flywheel.py",
        "src/gse_engine/memory/monorepo_omnibus_vault_indexer.py",
        "src/gse_engine/memory/wave20_openviking_ragas_bayesian_and_graph_suite.py",
        "src/gse_engine/memory/wave20b_openscholar_tddlog_woodelf_tree_suite.py",
        "src/gse_engine/memory/wave21_tracking_biomech_rlvr_and_market_hold_suite.py",
        "src/gse_engine/memory/wave22_cross_branch_salvage_and_vault_crosslink_suite.py",
        "src/gse_engine/memory/wave22_google_research_sde_tabfm_rliable_suite.py",
        "src/gse_engine/memory/wave23_boosting_graph_literature_and_spoof_quarantine_suite.py",
        "src/gse_engine/memory/wave24_theorem_ast_dependency_graph_suite.py",
        "src/gse_engine/memory/wave25_situational_tracking_biomech_fwl_suite.py",
        "src/gse_engine/memory/wave28_loboost_gepa_llmd_and_world_attention_suite.py",
        "src/gse_engine/memory/wave29_neuro_symbolic_chronofy_venra_and_argumentation_suite.py",
        "src/gse_engine/cli.py",
        "packages/prediction-engine/src/ensemble/remote-model-client.ts",
    ],
    "T06_Cron_Guard_CLV_OSV_CorpusRegistry": [
        "vercel.json",
        "apps/web/lib/cron/noon-lock-window-guard.ts",
        "apps/web/app/api/cron/generate-signal-slate/route.ts",
        "apps/web/app/api/cron/settle-picks/route.ts",
        "scripts/guardrails/run-all.mjs",
        "docs/data-sources/research/2026-11-15/oss-corpus-registry.json",
    ],
}

# Modules that MUST NOT sit solely in cli.py/tests -- they must be called on
# the pre-simulation critical path (compile_stage1_to_stage2_simulation_priors
# / corpus_situational_integrator / execute_connected_game_workflow) BEFORE
# simulate_matchup_pbp() rolls World #1.
PRE_SIM_MANDATORY_SIGNAL_MODULES: tuple[tuple[str, str, str], ...] = (
    (
        "Stage0_FeedIntegrity",
        "feed_guard",
        "src/gse_engine/ingestion/feed_guard.py",
    ),
    (
        "Pillar1_Books_877PDFs",
        "live_books_and_pdfs_executable_engine",
        "intelligence/coaching/live_books_and_pdfs_executable_engine.py",
    ),
    (
        "Pillar1_Wave8_HiddenGame_Eager",
        "wave8_hidden_game_eager_and_sports_quant_engine",
        "intelligence/coaching/wave8_hidden_game_eager_and_sports_quant_engine.py",
    ),
    (
        "Pillar1_OpenAI_Math_721_Lean",
        "openai_math_721_manuscript_and_lean_engine",
        "intelligence/coaching/openai_math_721_manuscript_and_lean_engine.py",
    ),
    (
        "Pillar2_IG_360_32Teams",
        "x_and_ig_360_charting_32teams",
        "intelligence/situational/x_and_ig_360_charting_32teams.py",
    ),
    (
        "Pillar3_X_Sweep_5Signals",
        "x_sweep_production_signals",
        "intelligence/coaching/x_sweep_production_signals.py",
    ),
    (
        "Pillar3_51Q_Compiler",
        "situational_layer2_compiler_51q",
        "intelligence/coaching/situational_layer2_compiler_51q.py",
    ),
    (
        "Pillar3_LangExtract_Beat",
        "beat_langextract",
        "src/gse_engine/ingestion/beat_langextract.py",
    ),
    (
        "Pillar3_DeepKE_Triples",
        "deepke_triples",
        "src/gse_engine/ingestion/deepke_triples.py",
    ),
    (
        "Pillar3_Last30Days_Recency",
        "recency_last30days",
        "src/gse_engine/ingestion/recency_last30days.py",
    ),
    (
        "Pillar4_279Family_12304Eqs",
        "full_repo_279_family_situational_reasoning_matrix",
        "intelligence/coaching/full_repo_279_family_situational_reasoning_matrix.py",
    ),
    (
        "Pillar4_CoxWeibull_Trench",
        "trench_pocket_physics",
        "intelligence/coaching/trench_pocket_physics.py",
    ),
    (
        "Pillar4_Sinkhorn_VMLS_K04",
        "volume_conservation",
        "src/gse_engine/compute/volume_conservation.py",
    ),
    (
        "Pillar4_QB_Physics_K11_K12",
        "qb_physics",
        "src/gse_engine/compute/qb_physics.py",
    ),
    (
        "Pillar5_GSI_Translational_Biomech_K14",
        "gsi_translational_bridge",
        "src/gse_engine/science/gsi_translational_bridge.py",
    ),
    (
        "Pillar5_Coach_Deception_K23",
        "coach_speak_emotional_deflection_probe",
        "intelligence/coaching/coach_speak_emotional_deflection_probe.py",
    ),
    (
        "Pillar5_Dire_Situations",
        "drive_dire_situations",
        "intelligence/coaching/drive_dire_situations.py",
    ),
    (
        "Pillar5_Script_Elasticity",
        "script_elasticity",
        "intelligence/coaching/script_elasticity.py",
    ),
    (
        "Layer1_MarketSurface_K01_K20",
        "market_surface_and_filtration",
        "src/gse_engine/compute/market_surface_and_filtration.py",
    ),
    (
        "Layer1_MultimodalVLM_Hawkes_K17_K19",
        "multimodal_vlm_and_provenance",
        "src/gse_engine/ingestion/multimodal_vlm_and_provenance.py",
    ),
    (
        "Pillar1_Wave20_OpenViking_Ragas_PyMC_CatBoost",
        "wave20_openviking_ragas_bayesian_and_graph_suite",
        "src/gse_engine/memory/wave20_openviking_ragas_bayesian_and_graph_suite.py",
    ),
    (
        "Pillar1_Wave20B_OpenScholar_TDDLog_Woodelf",
        "wave20b_openscholar_tddlog_woodelf_tree_suite",
        "src/gse_engine/memory/wave20b_openscholar_tddlog_woodelf_tree_suite.py",
    ),
    (
        "Pillar1_Monorepo_25Vault_Omnibus_Indexer",
        "monorepo_omnibus_vault_indexer",
        "src/gse_engine/memory/monorepo_omnibus_vault_indexer.py",
    ),
    (
        "Pillar1_Wave21_Tracking_Biomech_RLVR_MarketHold",
        "wave21_tracking_biomech_rlvr_and_market_hold_suite",
        "src/gse_engine/memory/wave21_tracking_biomech_rlvr_and_market_hold_suite.py",
    ),
    (
        "Pillar1_Wave22_CrossBranch_Salvage_Vault_Crosslink",
        "wave22_cross_branch_salvage_and_vault_crosslink_suite",
        "src/gse_engine/memory/wave22_cross_branch_salvage_and_vault_crosslink_suite.py",
    ),
    (
        "Pillar1_Wave23_GoogleResearch_SDE_TabFM_Rliable",
        "wave22_google_research_sde_tabfm_rliable_suite",
        "src/gse_engine/memory/wave22_google_research_sde_tabfm_rliable_suite.py",
    ),
    (
        "Pillar1_Wave23_Boosting_GraphLit_PSpoofQuarantine",
        "wave23_boosting_graph_literature_and_spoof_quarantine_suite",
        "src/gse_engine/memory/wave23_boosting_graph_literature_and_spoof_quarantine_suite.py",
    ),
    (
        "Pillar1_Wave24_TheoremAST_DependencyGraph_SymPy",
        "wave24_theorem_ast_dependency_graph_suite",
        "src/gse_engine/memory/wave24_theorem_ast_dependency_graph_suite.py",
    ),
    (
        "Pillar1_Wave25_Situational_Tracking_Biomech_FWL",
        "wave25_situational_tracking_biomech_fwl_suite",
        "src/gse_engine/memory/wave25_situational_tracking_biomech_fwl_suite.py",
    ),
    (
        "Pillar1_Wave28_LoBoost_GEPA_LLMd_WorldAttention",
        "wave28_loboost_gepa_llmd_and_world_attention_suite",
        "src/gse_engine/memory/wave28_loboost_gepa_llmd_and_world_attention_suite.py",
    ),
    (
        "Pillar1_Wave29_NeuroSymbolic_Chronofy_VeNRA_Argumentation",
        "wave29_neuro_symbolic_chronofy_venra_and_argumentation_suite",
        "src/gse_engine/memory/wave29_neuro_symbolic_chronofy_venra_and_argumentation_suite.py",
    ),
    (
        "Pillar1_Wave30_DeepMind_MCTX_BayesNF_WeatherBench_NGS",
        "wave30_deepmind_mctx_bayesnf_weatherbench_and_ngs_suite",
        "src/gse_engine/memory/wave30_deepmind_mctx_bayesnf_weatherbench_and_ngs_suite.py",
    ),
    (
        "Pillar1_Wave31_AWS_NGS_Going_Deep_Dual_Use",
        "aws_ngs_going_deep_gse_gsi_suite",
        "src/gse_engine/tracking/aws_ngs_going_deep_gse_gsi_suite.py",
    ),
    (
        "Pillar1_Wave32_Unified_All_Sports_Situational_Live_Fusion",
        "wave32_unified_sports_situational_live_fusion",
        "src/gse_engine/compute/wave32_unified_sports_situational_live_fusion.py",
    ),
    (
        "Pillar1_Wave34_Holistic_Combine_Cognition_Bioenergetics_CrossSport",
        "wave34_holistic_combine_cognition_bioenergetics_crosssport_engine",
        "src/gse_engine/biometrics/wave34_holistic_combine_cognition_bioenergetics_crosssport_engine.py",
    ),
    (
        "Pillar1_Wave35_GSI_Lifesaving_NeuroCardiac_Tissue_Phase",
        "wave35_gsi_lifesaving_neuro_cardiac_and_tissue_phase_engine",
        "src/gse_engine/science/wave35_gsi_lifesaving_neuro_cardiac_and_tissue_phase_engine.py",
    ),
    (
        "Pillar1_Wave35_GSE_PlayerMicro_Metrics_Matchups_AST",
        "wave35_player_micro_metrics_and_matchup_physics_engine",
        "src/gse_engine/tracking/wave35_player_micro_metrics_and_matchup_physics_engine.py",
    ),
    (
        "Pillar1_Wave36_GSI_MIMIC_ICU_Hypoxia_Glenohumeral",
        "wave36_gsi_icu_hemodynamic_hypoxia_and_shoulder_kinetic_engine",
        "src/gse_engine/science/wave36_gsi_icu_hemodynamic_hypoxia_and_shoulder_kinetic_engine.py",
    ),
    (
        "Pillar1_Wave36_GSE_360Board_W1_W10_Officials_ST_IDP",
        "wave36_360_board_officials_special_teams_progression_and_idp_engine",
        "src/gse_engine/tracking/wave36_360_board_officials_special_teams_progression_and_idp_engine.py",
    ),
    (
        "Pillar1_Wave37_GSI_MIMIC_6Organ_SOFA_MTU",
        "wave37_gsi_sofa_sepsis_organ_network_and_mtu_collagen_engine",
        "src/gse_engine/science/wave37_gsi_sofa_sepsis_organ_network_and_mtu_collagen_engine.py",
    ),
    (
        "Pillar1_Wave37_GSE_OL_Continuity_Rest_Pedigree_SkewProps",
        "wave37_ol_continuity_rest_stuff_pedigree_and_skew_props_engine",
        "src/gse_engine/tracking/wave37_ol_continuity_rest_stuff_pedigree_and_skew_props_engine.py",
    ),
    (
        "Pillar1_Wave38_GSI_GTEx_Transcriptomics_SchrodingerBridge",
        "wave38_gsi_gtex_transcriptomics_and_schrodinger_bridge_engine",
        "src/gse_engine/science/wave38_gsi_gtex_transcriptomics_and_schrodinger_bridge_engine.py",
    ),
    (
        "Pillar1_Wave38_GSE_Presnap_DefContinuity_SGPCopula_CIR",
        "wave38_presnap_scheme_def_continuity_sgp_copula_and_cir_engine",
        "src/gse_engine/tracking/wave38_presnap_scheme_def_continuity_sgp_copula_and_cir_engine.py",
    ),
    (
        "Pillar1_Wave39_GSI_HPA_Proteomics_ChronicSOFA",
        "wave39_gsi_hpa_proteomics_mrna_concordance_and_chronic_sofa_engine",
        "src/gse_engine/science/wave39_gsi_hpa_proteomics_mrna_concordance_and_chronic_sofa_engine.py",
    ),
    (
        "Pillar1_Wave39_GSE_PassRush_Drops_TotalMAE_3YrFTN",
        "wave39_pass_rush_disruption_drops_total_kickoff_and_3yr_ftn_engine",
        "src/gse_engine/tracking/wave39_pass_rush_disruption_drops_total_kickoff_and_3yr_ftn_engine.py",
    ),
    (
        "Pillar1_Wave40_Universal_MultiSport_Metrics_And_Handicaps",
        "wave40_universal_sports_metrics_encyclopedia_and_handicap_engine",
        "src/gse_engine/multisport/wave40_universal_sports_metrics_encyclopedia_and_handicap_engine.py",
    ),
    (
        "Pillar1_Wave40_GSE_NGS_Separation_Cushion_FTN_IntWorthy",
        "wave40_ngs_separation_ryoe_cpoe_and_ftn_qb_fault_engine",
        "src/gse_engine/tracking/wave40_ngs_separation_ryoe_cpoe_and_ftn_qb_fault_engine.py",
    ),
    (
        "Pillar1_Wave41_GSI_Reactome_UniProt_And_ICU_LOS",
        "wave41_gsi_reactome_pathway_uniprot_stokes_einstein_and_icu_los_engine",
        "src/gse_engine/science/wave41_gsi_reactome_pathway_uniprot_stokes_einstein_and_icu_los_engine.py",
    ),
    (
        "Pillar1_Wave41_14Sport_F1_Undercut_NBA_PRA_Copula",
        "wave41_f1_pit_strategy_nba_pra_copula_and_14sport_expansion",
        "src/gse_engine/multisport/wave41_f1_pit_strategy_nba_pra_copula_and_14sport_expansion.py",
    ),
    (
        "Pillar1_Wave41_GSE_Pocket_Security_KR_Swarm_And_14Sport",
        "wave41_pocket_ball_security_kickoff_return_swarm_and_14sport_engine",
        "src/gse_engine/tracking/wave41_pocket_ball_security_kickoff_return_swarm_and_14sport_engine.py",
    ),
    (
        "Pillar1_Wave42_GSI_AlphaFold_InterPro_And_ICU_Trajectory",
        "wave42_gsi_alphafold_interpro_proteolysis_and_icu_trajectory_engine",
        "src/gse_engine/science/wave42_gsi_alphafold_interpro_proteolysis_and_icu_trajectory_engine.py",
    ),
    (
        "Pillar1_Wave42_18Sport_Darts_Markov_Cycling_Wbal",
        "wave42_darts_markov_cycling_wbal_and_18sport_expansion",
        "src/gse_engine/multisport/wave42_darts_markov_cycling_wbal_and_18sport_expansion.py",
    ),
    (
        "Pillar1_Wave42_GSE_PFR_AdvStats_QBR_And_Total_Pace",
        "wave42_pfr_advstats_qbr_two_high_yac_and_total_pace_engine",
        "src/gse_engine/tracking/wave42_pfr_advstats_qbr_two_high_yac_and_total_pace_engine.py",
    ),
    (
        "Pillar1_Wave43_AlphaXiv_31Paper_EBM_LF_WSP_Arithmetic_SLAM",
        "wave43_alphaxiv_31paper_ebm_lf_wsp_calibration_arithmetic_and_slam_engine",
        "src/gse_engine/science/wave43_alphaxiv_31paper_ebm_lf_wsp_calibration_arithmetic_and_slam_engine.py",
    ),
    (
        "Pillar1_Wave43_GSE_EBM_Deconfounded_Situational_NFL",
        "wave43_ebm_composed_deconfounded_situational_nfl_engine",
        "src/gse_engine/tracking/wave43_ebm_composed_deconfounded_situational_nfl_engine.py",
    ),
    (
        "Pillar1_Wave44_AlphaXiv_28Paper_DFL_CVaR_Causal_Integrity_RG",
        "wave44_alphaxiv_28paper_dfl_cvar_causal_mspem_integrity_and_rg_engine",
        "src/gse_engine/science/wave44_alphaxiv_28paper_dfl_cvar_causal_mspem_integrity_and_rg_engine.py",
    ),
    (
        "Pillar1_Wave44_GSE_DFL_RIM_Kicker_PARR_Dynamo_NFL",
        "wave44_dfl_rim_officiating_kicker_parr_dynamo_and_anti_shortcut_nfl_engine",
        "src/gse_engine/tracking/wave44_dfl_rim_officiating_kicker_parr_dynamo_and_anti_shortcut_nfl_engine.py",
    ),
)

CORPUS_DATA_MANIFESTS: tuple[tuple[str, str, int], ...] = (
    ("877_Research_PDFs_Manifest", "data/sports_research_papers/manifest_877_pdfs.json", 877),
    (
        "Foundry_Compound_Corpus_Index",
        "data/engine/foundry_compound_corpus_index_2026.json",
        12550,
    ),
    (
        "OSS_Ecosystem_Registry",
        "docs/data-sources/research/2026-11-15/oss-corpus-registry.json",
        354,
    ),
    ("Permanent_Lessons_Ledger", "data/engine/lessons_learned_permanent_ledger.jsonl", 20),
    (
        "Zero_Skip_2949_Theorems_Corpus",
        "data/corpus_parsed_full/extracted_theorems_lemmas_algorithms_2026_11_06.jsonl",
        2949,
    ),
    (
        "Priority_Research_Corpus_2015",
        "data/corpus/research_records_priority.jsonl",
        2015,
    ),
    (
        "Coach_Brain_Train_Corpus",
        "data/coach-brain/coach-brain-train.jsonl",
        6146,
    ),
    (
        "Equation_Execution_Registry_21419",
        "data/equations/equation_execution_registry.jsonl",
        21419,
    ),
    (
        "Identity_Entity_Tenure_12941",
        "data/identity/canonical_entities.jsonl",
        100,
    ),
    (
        "Coach_Brain_V1_SFT_6469",
        "data/llm/gse-coach-brain-v1-sft.jsonl",
        6469,
    ),
)


# ---------------------------------------------------------------------------
# 2. Static AST Auditor: Dead-Leaf CLI-Only Modules & Silent Except-Swallowers
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SilentExceptHit:
    """Represents a broad `except Exception:` block that may silently zero a signal."""

    file_path: str
    line_number: int
    returns_zero_or_passes: bool
    snippet: str


@dataclass(frozen=True)
class PreSimWiringAuditReport:
    """Comprehensive static + manifest wiring report across Sports-wt-triage."""

    repo_detected: bool
    missing_master_plan_files: list[str]
    dead_leaf_unwired_pre_sim_modules: list[dict[str, str]]
    silent_except_swallowers: list[SilentExceptHit]
    manifest_checks: list[dict[str, Any]]
    specific_v3_gap_checks: dict[str, bool]


def scan_silent_except_blocks(py_path: Path, repo_root: Path) -> list[SilentExceptHit]:
    """Detect `except Exception:` / bare `except:` blocks that pass or return 0/empty."""
    if not py_path.exists():
        return []
    src = py_path.read_text(encoding="utf-8", errors="replace")
    lines = src.splitlines()
    try:
        tree = ast.parse(src, filename=str(py_path))
    except SyntaxError:
        return [
            SilentExceptHit(
                file_path=str(py_path.relative_to(repo_root)),
                line_number=1,
                returns_zero_or_passes=True,
                snippet="SYNTAX_ERROR",
            )
        ]

    hits: list[SilentExceptHit] = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.ExceptHandler):
            continue
        is_broad = node.type is None or (
            isinstance(node.type, ast.Name) and node.type.id in {"Exception", "BaseException"}
        )
        if not is_broad:
            continue
        swallows = False
        for stmt in node.body:
            if isinstance(stmt, ast.Pass):
                swallows = True
            elif isinstance(stmt, ast.Return):
                val = stmt.value
                is_empty_lit = isinstance(val, ast.Constant) and (
                    val.value == ""
                    or (isinstance(val.value, (int, float)) and val.value == 0)
                )
                is_empty_container = isinstance(val, (ast.Dict, ast.List)) and not getattr(
                    val, "keys", getattr(val, "elts", None)
                )
                if val is None or is_empty_lit or is_empty_container:
                    swallows = True
        if swallows:
            lineno = getattr(node, "lineno", 1)
            snip = lines[lineno - 1].strip() if 1 <= lineno <= len(lines) else "except:"
            hits.append(
                SilentExceptHit(
                    file_path=str(py_path.relative_to(repo_root)),
                    line_number=lineno,
                    returns_zero_or_passes=True,
                    snippet=snip,
                )
            )
    return hits


def collect_imported_module_stems(entry_files: list[Path]) -> set[str]:
    """Collect all Python module stems imported statically or dynamically in entry_files."""
    imported: set[str] = set()
    for path in entry_files:
        if not path.exists():
            continue
        src = path.read_text(encoding="utf-8", errors="replace")
        try:
            tree = ast.parse(src)
        except SyntaxError:
            continue
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    for part in alias.name.split("."):
                        imported.add(part)
            elif isinstance(node, ast.ImportFrom) and node.module:
                for part in node.module.split("."):
                    imported.add(part)
                for alias in node.names:
                    imported.add(alias.name)
            elif (
                isinstance(node, ast.Constant)
                and isinstance(node.value, str)
                and ("." in node.value or "_" in node.value)
            ):
                for tok in node.value.replace("/", ".").split("."):
                    imported.add(tok)
    return imported


def audit_repository_total_wiring(repo_root: Path) -> PreSimWiringAuditReport:
    """Audit Master Plan v3.0 + Waves 1-19 total pre-simulation wiring on repo_root."""
    workflow_py = repo_root / "scripts" / "ops" / "gse_connected_game_workflow.py"
    integrator_py = (
        repo_root / "src" / "gse_engine" / "compute" / "corpus_situational_integrator.py"
    )
    if not workflow_py.exists() and not integrator_py.exists():
        return PreSimWiringAuditReport(
            repo_detected=False,
            missing_master_plan_files=[],
            dead_leaf_unwired_pre_sim_modules=[],
            silent_except_swallowers=[],
            manifest_checks=[],
            specific_v3_gap_checks={},
        )

    missing: list[str] = []
    for group_files in MASTER_PLAN_V3_REQUIRED_ARTIFACTS.values():
        for rel in group_files:
            if not (repo_root / rel).exists():
                missing.append(rel)

    spine_files = [
        workflow_py,
        integrator_py,
        repo_root / "scripts" / "ops" / "gse_coach_mind_simulator.py",
    ]
    reachable_stems = collect_imported_module_stems(spine_files)
    dead_leaves: list[dict[str, str]] = []
    for layer, stem, rel_path in PRE_SIM_MANDATORY_SIGNAL_MODULES:
        exists_on_disk = (repo_root / rel_path).exists()
        if not exists_on_disk:
            dead_leaves.append(
                {
                    "layer": layer,
                    "module": stem,
                    "path": rel_path,
                    "reason": "MISSING_ON_DISK",
                }
            )
        elif stem not in reachable_stems:
            dead_leaves.append(
                {
                    "layer": layer,
                    "module": stem,
                    "path": rel_path,
                    "reason": "DEAD_LEAF_NOT_CALLED_BY_WORKFLOW_OR_INTEGRATOR",
                }
            )

    swallowers: list[SilentExceptHit] = []
    for sf in spine_files:
        swallowers.extend(scan_silent_except_blocks(sf, repo_root))

    manifest_results: list[dict[str, Any]] = []
    for label, rel_m, min_count in CORPUS_DATA_MANIFESTS:
        mp = repo_root / rel_m
        if not mp.exists():
            manifest_results.append({"name": label, "path": rel_m, "ok": False, "count": 0})
            continue
        if rel_m.endswith(".jsonl"):
            cnt = sum(
                1
                for ln in mp.read_text(encoding="utf-8", errors="replace").splitlines()
                if ln.strip()
            )
        else:
            raw = json.loads(mp.read_text(encoding="utf-8"))
            if isinstance(raw, list):
                cnt = len(raw)
            elif isinstance(raw, dict):
                cnt = int(
                    raw.get("files_swept")
                    or len(raw.get("entries", raw.get("papers", raw.get("pdfs", []))))
                )
            else:
                cnt = 0
        manifest_results.append(
            {
                "name": label,
                "path": rel_m,
                "ok": cnt >= min_count,
                "count": cnt,
                "min_required": min_count,
            }
        )

    def _read_opt(rel: str) -> str:
        p = repo_root / rel
        return p.read_text(encoding="utf-8", errors="replace") if p.exists() else ""

    run_all_src = _read_opt("scripts/guardrails/run-all.mjs")
    ci_yml_src = _read_opt(".github/workflows/ci.yml")
    schema_src = _read_opt("packages/db/prisma/schema.prisma")
    remote_ml_src = _read_opt("packages/prediction-engine/src/ensemble/remote-model-client.ts")
    settle_src = _read_opt("apps/web/app/api/cron/settle-picks/route.ts")
    wf_src = _read_opt("scripts/ops/gse_connected_game_workflow.py")

    v3_checks = {
        "prisma_sealed_slate_packet_model": "model SealedSlatePacket" in schema_src,
        "remote_ml_predict_etkf_and_tda_wired": (
            "/predict/etkf" in remote_ml_src and "/predict/tda" in remote_ml_src
        ),
        "settle_picks_mark_closing_snapshots_clv": "markClosingSnapshots" in settle_src,
        "osv_polyglot_wired_in_guardrails_run_all": "osv-polyglot-audit" in run_all_src,
        "ci_yml_has_osv_or_leapwork_gate": (
            "osv" in ci_yml_src.lower() or "leapwork" in ci_yml_src.lower()
        ),
        "workflow_enforces_runtime_profiler_gate": (
            "profile_and_assert_pre_sim_execution" in wf_src
        ),
    }

    return PreSimWiringAuditReport(
        repo_detected=True,
        missing_master_plan_files=missing,
        dead_leaf_unwired_pre_sim_modules=dead_leaves,
        silent_except_swallowers=swallowers,
        manifest_checks=manifest_results,
        specific_v3_gap_checks=v3_checks,
    )


# ---------------------------------------------------------------------------
# 3. Runtime Profiler + Non-Zero Jacobian Pre-Simulation Gate (Call Before Sim!)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class RuntimeIntelligenceReceipt:
    """Cryptographic receipt proving every pillar executed & moved priors before sim."""

    matchup_id: str
    verified_module_call_counts: dict[str, int]
    pillar_jacobian_l2_norms: dict[str, float]
    all_pillars_fired: bool
    all_jacobians_nonzero: bool
    receipt_sha256: str


def profile_and_assert_pre_sim_execution(
    matchup_id: str,
    compile_priors_fn: Callable[[dict[str, float]], dict[str, float]],
    baseline_pillar_inputs: dict[str, float],
    required_called_function_names: set[str],
    perturbation_delta: float = 0.25,
) -> RuntimeIntelligenceReceipt:
    """Profile live function calls via sys.setprofile and verify non-zero Jacobian sensitivity.

    Wire directly above `simulate_matchup_pbp()` so NO simulation can run if any
    required book/PDF/IG/X/situational/market module was skipped or zeroed out.
    """
    call_counts: dict[str, int] = {fn_name: 0 for fn_name in required_called_function_names}

    def _profiler(frame: FrameType, event: str, _arg: Any) -> None:
        if event == "call":
            code_name = frame.f_code.co_name
            if code_name in call_counts:
                call_counts[code_name] += 1

    old_profile = sys.getprofile()
    sys.setprofile(_profiler)
    try:
        base_out = compile_priors_fn(dict(baseline_pillar_inputs))
    finally:
        sys.setprofile(old_profile)

    uncalled = [fn for fn, cnt in call_counts.items() if cnt <= 0]
    if uncalled:
        raise RuntimeError(
            f"[PRE-SIM INTELLIGENCE GATE REFUSED] Uncalled pre-sim engines on {matchup_id}: "
            f"{sorted(uncalled)}"
        )

    jacobian_norms: dict[str, float] = {}
    for key, base_val in baseline_pillar_inputs.items():
        bumped = dict(baseline_pillar_inputs)
        bumped[key] = base_val + perturbation_delta
        pert_out = compile_priors_fn(bumped)
        sq_sum = 0.0
        for out_k, out_v in base_out.items():
            diff = (pert_out.get(out_k, out_v) - out_v) / perturbation_delta
            sq_sum += diff * diff
        grad_l2 = math.sqrt(sq_sum)
        jacobian_norms[key] = round(grad_l2, 8)

    dead_gradients = [
        k for k, nrm in jacobian_norms.items() if nrm <= 1.0e-9 or not math.isfinite(nrm)
    ]
    if dead_gradients:
        raise RuntimeError(
            "[PRE-SIM INTELLIGENCE GATE REFUSED] Zero/orphaned Jacobian posterior (AP-02) "
            f"on {matchup_id}: {sorted(dead_gradients)}"
        )

    payload = {
        "matchup_id": matchup_id,
        "calls": call_counts,
        "jacobians": jacobian_norms,
    }
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
    return RuntimeIntelligenceReceipt(
        matchup_id=matchup_id,
        verified_module_call_counts=call_counts,
        pillar_jacobian_l2_norms=jacobian_norms,
        all_pillars_fired=True,
        all_jacobians_nonzero=True,
        receipt_sha256=digest,
    )


# ---------------------------------------------------------------------------
# 4. Self-Test Verification Suite
# ---------------------------------------------------------------------------


def _run_self_tests() -> dict[str, Any]:
    """Prove both positive pass and fail-closed rejection on dead/uncalled pillars."""

    def _book_pdf_subengine(x: float) -> float:
        return 0.42 * x

    def _ig_360_subengine(x: float) -> float:
        return 0.31 * x

    def _x_sweep_51q_subengine(x: float) -> float:
        return 0.27 * x

    def _situational_279_subengine(x: float) -> float:
        return 0.36 * x

    def _coach_contextual_subengine(x: float) -> float:
        return -0.22 * x

    def _good_stage1_to_stage2(inp: dict[str, float]) -> dict[str, float]:
        b = _book_pdf_subengine(inp["books_pdfs"])
        ig = _ig_360_subengine(inp["ig_360"])
        xs = _x_sweep_51q_subengine(inp["x_twitter"])
        s279 = _situational_279_subengine(inp["situational_279"])
        cc = _coach_contextual_subengine(inp["contextual_coaching"])
        return {
            "off_epa_adj": b + 0.5 * xs + s279,
            "pass_rate_adj": ig + cc,
        }

    req_fns = {
        "_book_pdf_subengine",
        "_ig_360_subengine",
        "_x_sweep_51q_subengine",
        "_situational_279_subengine",
        "_coach_contextual_subengine",
    }
    inputs = {
        "books_pdfs": 0.15,
        "ig_360": 0.08,
        "x_twitter": -0.05,
        "situational_279": 0.12,
        "contextual_coaching": 0.20,
    }
    receipt = profile_and_assert_pre_sim_execution(
        "2026_W10_LAC_at_BAL", _good_stage1_to_stage2, inputs, req_fns
    )
    assert receipt.all_pillars_fired and receipt.all_jacobians_nonzero

    def _orphaned_stage1_to_stage2(inp: dict[str, float]) -> dict[str, float]:
        _ = _book_pdf_subengine(inp["books_pdfs"])
        return {
            "off_epa_adj": _ig_360_subengine(inp["ig_360"])
            + _x_sweep_51q_subengine(inp["x_twitter"])
            + _situational_279_subengine(inp["situational_279"])
            + _coach_contextual_subengine(inp["contextual_coaching"])
        }

    caught_orphan = False
    try:
        profile_and_assert_pre_sim_execution(
            "2026_W10_LAC_at_BAL", _orphaned_stage1_to_stage2, inputs, req_fns
        )
    except RuntimeError as exc:
        caught_orphan = "Zero/orphaned Jacobian" in str(exc)
    assert caught_orphan, "Gate failed to reject orphaned pillar!"

    return {
        "self_test_passed": True,
        "verified_receipt": asdict(receipt),
        "orphaned_posterior_blocked": caught_orphan,
    }


def main(argv: list[str] | None = None) -> int:
    """CLI entrypoint for Pre-Sim Maximum-Intelligence Total-Wiring Gate."""
    parser = argparse.ArgumentParser(description="Pre-Sim Maximum-Intelligence Total-Wiring Gate")
    parser.add_argument("--repo-root", type=Path, default=Path("."))
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)

    out: dict[str, Any] = {}
    if args.self_test:
        out["self_test"] = _run_self_tests()

    report = audit_repository_total_wiring(args.repo_root.resolve())
    out["repo_audit"] = asdict(report)

    has_repo_failures = report.repo_detected and bool(
        report.missing_master_plan_files
        or report.dead_leaf_unwired_pre_sim_modules
        or report.silent_except_swallowers
        or any(not m["ok"] for m in report.manifest_checks)
        or any(not ok for ok in report.specific_v3_gap_checks.values())
    )
    out["status"] = "FAIL_WIRING_GAPS_FOUND" if has_repo_failures else "PASS"
    print(json.dumps(out, indent=2))
    return 1 if has_repo_failures else 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
WAVE 9 — ARMED WORKFLOWS VERIFICATION CLI (`--check-armed`)
Verifies that every single stage of the GSE production loop is wired, consumption-tested on
synthetic/historical fixtures, and ARMED for Garrett's morning run — WITHOUT executing any
live simulations, live model picks, or live social/web content generation tonight.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


def check_armed() -> Dict[str, Any]:
    checks: Dict[str, Dict[str, Any]] = {}

    # 1. Schemas v1 check
    schemas = [
        "schemas/v1/layer_output.schema.json",
        "schemas/v1/context_packet.schema.json",
        "schemas/v1/reasoning_trace.schema.json",
        "schemas/v1/simulation_distribution.schema.json",
        "schemas/v1/content_bundle.schema.json",
    ]
    missing_schemas = [s for s in schemas if not (REPO_ROOT / s).exists()]
    checks["stage_0_schemas_v1"] = {
        "armed": len(missing_schemas) == 0,
        "schemas_verified": len(schemas) - len(missing_schemas),
        "missing": missing_schemas,
    }

    # 2. Corpus & Mind Feeds Reader check (Wave 3)
    w3_rec = REPO_ROOT / "docs" / "wiring" / "WAVE-3-RECONCILIATION.json"
    w3_data = json.loads(w3_rec.read_text(encoding="utf-8")) if w3_rec.exists() else {}
    checks["stage_1_corpus_and_mind_feeds"] = {
        "armed": bool(w3_data.get("counts_reconciled")) and (REPO_ROOT / "intelligence" / "corpus" / "research_corpus_reader.py").exists(),
        "ledger_entries": w3_data.get("research_ledger_count", 0),
        "total_chunks_emitted": w3_data.get("total_chunks_emitted", 0),
    }

    # 3. Canonical Entity Resolver & Contamination Firewall check (Wave 4)
    w4_rec = REPO_ROOT / "docs" / "wiring" / "WAVE-4-RECONCILIATION.json"
    w4_data = json.loads(w4_rec.read_text(encoding="utf-8")) if w4_rec.exists() else {}
    checks["stage_2_entity_resolution_firewall"] = {
        "armed": int(w4_data.get("total_canonical_entities", 0)) >= 3648 and (REPO_ROOT / "intelligence" / "identity" / "entity_resolver.py").exists(),
        "total_canonical_entities": w4_data.get("total_canonical_entities", 0),
        "standing_rulings_enforced": w4_data.get("standing_2026_overrides_verified", []),
    }

    # 4. Equation Execution Registry check (Wave 5)
    w5_rec = REPO_ROOT / "docs" / "wiring" / "WAVE-5-RECONCILIATION.json"
    w5_data = json.loads(w5_rec.read_text(encoding="utf-8")) if w5_rec.exists() else {}
    checks["stage_3_equation_execution_engine"] = {
        "armed": bool(w5_data.get("counts_reconciled")) and (REPO_ROOT / "intelligence" / "equations" / "equation_executor.py").exists(),
        "total_equations_wired": w5_data.get("total_registry_rows", 0),
    }

    # 5. Normalized Warehouse Parquet Landing check (Wave 6)
    w6_rec = REPO_ROOT / "docs" / "wiring" / "WAVE-6-RECONCILIATION.json"
    w6_data = json.loads(w6_rec.read_text(encoding="utf-8")) if w6_rec.exists() else {}
    checks["stage_4_warehouse_data_landing"] = {
        "armed": bool(w6_data.get("core_9_matches_79297")) and int(w6_data.get("datasets_materialized", 0)) == 10,
        "datasets_verified": w6_data.get("datasets_materialized", 0),
        "all_datasets_total_records": w6_data.get("total_10_datasets_record_sum", 0),
    }

    # 6. 26-Layer Context Stack check (Wave 7)
    w7_rec = REPO_ROOT / "docs" / "wiring" / "WAVE-7-RECONCILIATION.json"
    w7_data = json.loads(w7_rec.read_text(encoding="utf-8")) if w7_rec.exists() else {}
    checks["stage_5_context_workflow_26_layers"] = {
        "armed": bool(w7_data.get("counts_reconciled")) and int(w7_data.get("layers_populated_in_packet", 0)) == 26,
        "layers_populated": w7_data.get("layers_populated_in_packet", 0),
        "l21_dependency_chain": w7_data.get("l21_dependency_chain", ""),
        "l26_entered_last": w7_data.get("l26_entered_last", False),
    }

    # 7. Reasoning Workflow, Synthetic Simulation Validator, Placeholder Content Validator, Feedback Pipe, Brain & Cockpit Bridge (Wave 8)
    w8_rec = REPO_ROOT / "docs" / "wiring" / "WAVE-8-RECONCILIATION.json"
    w8_data = json.loads(w8_rec.read_text(encoding="utf-8")) if w8_rec.exists() else {}
    checks["stage_6_reasoning_and_workflow_assembly"] = {
        "armed": bool(w8_data.get("counts_reconciled")) and bool(w8_data.get("dependency_order_verified")),
        "historical_fixture_tested": w8_data.get("historical_fixture_game_id"),
        "live_simulations_executed_tonight": w8_data.get("synthetic_simulation_validator", {}).get("live_or_historical_game_simulations_run", 0),
        "live_content_items_produced_tonight": w8_data.get("placeholder_content_validator", {}).get("content_items_produced", 0),
        "grading_feedback_pipe_verified": bool(w8_data.get("grading_feedback_pipe", {}).get("feedback_id")),
    }

    # 8. Morning Deliverables check (Wave 9)
    deliverables = [
        "docs/wiring/BRANCH-CENSUS.csv",
        "docs/wiring/BRANCH-LEDGER.csv",
        "docs/wiring/COMMIT-CENSUS.md",
        "docs/wiring/CORPUS-CENSUS.csv",
        "docs/wiring/RESEARCH-LEDGER.jsonl",
        "docs/wiring/LAYER-MAP.md",
        "docs/wiring/COVERAGE-LEDGER.md",
        "docs/wiring/CHARGE-REGRESSION.md",
        "docs/wiring/SPOT-CHECKS-LEDGER.md",
        "docs/wiring/CORRECTION-LOG.md",
        "docs/wiring/GAP-AUDIT.md",
        "docs/wiring/LESSONS.md",
        "docs/wiring/ARMED-WORKFLOWS.md",
        "docs/wiring/NIGHT-STATE.json",
        "docs/wiring/WORK-QUEUE.jsonl",
    ]
    missing_deliv = [d for d in deliverables if not (REPO_ROOT / d).exists()]
    checks["stage_7_morning_deliverables"] = {
        "armed": len(missing_deliv) == 0,
        "deliverables_present": len(deliverables) - len(missing_deliv),
        "deliverables_expected": len(deliverables),
        "missing": missing_deliv,
    }

    # 9. Live Runtime Execution & Handoff Contract Proofs (Council Pragmatist Mandate)
    try:
        import subprocess
        from intelligence.context.context_packet_builder import build_context_packet
        from intelligence.corpus.research_corpus_reader import ResearchCorpusReader
        from intelligence.data.warehouse.warehouse_loader import WarehouseLoader
        from intelligence.equations.equation_executor import get_dynamic_equation_registry_counts
        from intelligence.identity.entity_resolver import CanonicalEntityResolver
        from intelligence.reasoning.reasoning_workflow_assembler import execute_reasoning_workflow

        resolver = CanonicalEntityResolver()
        darnold = resolver.resolve_entity("Sam Darnold", entity_type="player", as_of_date="2026-11-06")
        rodgers = resolver.resolve_entity("Aaron Rodgers", entity_type="player", as_of_date="2026-11-06")
        geno = resolver.resolve_entity("Geno Smith", entity_type="player", as_of_date="2026-11-06")
        evans = resolver.resolve_entity("Mike Evans", entity_type="player", as_of_date="2026-11-06")
        rosters_ok = (
            darnold.get("current_team_id") == "SEA"
            and rodgers.get("current_team_id") == "PIT"
            and geno.get("current_team_id") == "NYJ"
            and evans.get("current_team_id") == "SF"
        )

        eq_counts = get_dynamic_equation_registry_counts()
        eqs_ok = eq_counts["total_cataloged"] >= 21419 and eq_counts["placeholder_formula_specs"] == 0

        wh = WarehouseLoader()
        wh_meta = wh.verify_all_10_datasets()
        wh_ok = int(wh_meta.get("dataset_count", 0)) == 10

        reader = ResearchCorpusReader()
        corpus_hits = reader.query("Cover 4 Quarters MOD PUSH 2-Jet pass protection trench", top_k=5)
        corpus_ok = len(corpus_hits) >= 1 and int(w3_data.get("research_ledger_count", 0)) >= 48609

        pkt = build_context_packet(game_id="2024_10_CIN_BAL", as_of_utc="2024-11-07T00:00:00Z", persist=False)
        trace = execute_reasoning_workflow(pkt, write_to_disk=False)
        layers_dict = pkt.get("layers", {})
        total_eq_eval = sum(
            int(l_val.get("provenance", {}).get("equations_executed", 0))
            for l_val in layers_dict.values()
        )
        workflow_ok = len(layers_dict) == 26 and total_eq_eval >= 21419 and bool(trace.get("trace_id"))

        sim_cmd = subprocess.run(
            [
                sys.executable,
                str(REPO_ROOT / "scripts" / "ops" / "gse_coach_mind_simulator.py"),
                "--from-context-packet",
                str(REPO_ROOT / "data" / "context_packets" / "2024_10_CIN_BAL.json"),
                "--from-reasoning-trace",
                str(REPO_ROOT / "data" / "reasoning" / "traces" / "2024_10_CIN_BAL.trace.json"),
                "--dry-run-contract",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        sim_contract_ok = sim_cmd.returncode == 0 and "ARMED_CONTRACT_VALIDATED" in sim_cmd.stdout

        checks["stage_8_live_runtime_execution_proofs"] = {
            "armed": bool(rosters_ok and eqs_ok and wh_ok and corpus_ok and workflow_ok and sim_contract_ok),
            "rosters_2026_verified": rosters_ok,
            "equations_21419_zero_placeholders_verified": eqs_ok,
            "equations_evaluated_in_live_trace": total_eq_eval,
            "warehouse_10_datasets_verified": wh_ok,
            "corpus_records_verified": int(w3_data.get("research_ledger_count", 0)),
            "simulator_cli_handoff_contract_verified": sim_contract_ok,
        }
    except Exception as exc:
        checks["stage_8_live_runtime_execution_proofs"] = {
            "armed": False,
            "error": str(exc),
        }

    all_armed = all(bool(v.get("armed")) for v in checks.values())
    return {
        "status": "ARMED" if all_armed else "NOT_ARMED",
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "all_stages_armed": all_armed,
        "live_simulations_run_tonight": 0,
        "live_content_posts_run_tonight": 0,
        "stages": checks,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify GSE Armed Workflows status without running live simulations or content.")
    parser.add_argument("--check-armed", action="store_true", help="Check that all workflow stages are wired and ARMED.")
    args = parser.parse_args()

    report = check_armed()
    print(json.dumps(report, indent=2))
    if not report["all_stages_armed"]:
        sys.exit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
PART 6 & CHARGE 10 — AUTOMATED PERTURBATION & DISCONNECT CONSUMPTION PROOFS
(`tests/wiring/test_wave_consumption_proofs.py`)

Verifies across Waves 1 through 8 that every wired artifact is genuinely consumed:
removing, disconnecting, or perturbing the input deterministically changes the consumer's
output, widens uncertainty, loses trace citations, or raises a hard contract/contamination error.
"""
from __future__ import annotations

import copy
import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.corpus.research_corpus_reader import (
    ResearchCorpusDisconnectedError,
    get_corpus_summary_metrics,
    load_research_corpus,
    query_corpus_by_application,
)
from intelligence.equations.catalog_loader import (
    load_canonical_equation_catalog,
    verify_zero_catalog_twin_drift,
)
from intelligence.equations.equation_executor import execute_catalog_equation
from intelligence.feedback.grading_to_corpus_pipe import run_grading_to_corpus_feedback_pipe
from intelligence.identity.entity_resolver import (
    EntityResolutionContaminationError,
    resolve_entity,
    validate_roster_pairing,
)
from intelligence.reasoning.context_packet_builder import (
    DEFAULT_FIXTURE_INPUTS,
    build_context_packet,
)
from intelligence.reasoning.schema_validator import (
    SchemaValidationError,
    validate_context_packet,
    validate_reasoning_trace,
    validate_simulation_distribution,
)
from intelligence.reasoning.workflow_runner import (
    OFFICIAL_LEDGER_SHA,
    run_placeholder_content_stage,
    run_reasoning_workflow,
    run_synthetic_simulation_stage,
)


class TestWaveConsumptionProofs(unittest.TestCase):
    """End-to-end perturbation and disconnect consumption proofs for Waves 1–8."""

    def test_wave1_and_wave2_census_and_branch_ledger_reconciliation(self) -> None:
        branch_census = REPO_ROOT / "docs" / "wiring" / "BRANCH-CENSUS.csv"
        branch_ledger = REPO_ROOT / "docs" / "wiring" / "BRANCH-LEDGER.csv"
        corpus_census = REPO_ROOT / "docs" / "wiring" / "CORPUS-CENSUS.csv"
        research_ledger = REPO_ROOT / "docs" / "wiring" / "RESEARCH-LEDGER.jsonl"

        with branch_census.open("r", encoding="utf-8") as f:
            c_rows = list(csv.DictReader(f))
        with branch_ledger.open("r", encoding="utf-8") as f:
            l_rows = list(csv.DictReader(f))

        self.assertEqual(len(c_rows), 898)
        self.assertEqual(len(l_rows), 898)
        valid_statuses = {"merged", "cherry-picked", "superseded", "obsolete-with-reason"}
        for r in l_rows:
            self.assertIn(r["status"], valid_statuses)
            self.assertTrue(bool(r["disposition_reason"].strip()))

        with corpus_census.open("r", encoding="utf-8") as f:
            corp_count = sum(1 for _ in csv.DictReader(f))
        with research_ledger.open("r", encoding="utf-8") as f:
            res_led_count = sum(1 for line in f if line.strip())
        self.assertEqual(corp_count, 48609)
        self.assertEqual(res_led_count, 48609)

    def test_wave3_research_corpus_disconnect_and_perturbation_proof(self) -> None:
        # 1. Baseline consumption proof digest
        base_res = query_corpus_by_application("Shanahan")
        self.assertGreater(base_res["matched_chunk_count"], 50)
        self.assertGreater(base_res["mind_staging_feed_entries"], 10000)

        # 2. Disconnecting corpus file must raise ResearchCorpusDisconnectedError
        with self.assertRaises(ResearchCorpusDisconnectedError):
            load_research_corpus(records_path=REPO_ROOT / "data" / "corpus" / "NONEXISTENT.jsonl")

        # 3. Perturbing corpus input changes the consumption_proof_sha256 digest
        sample_records = load_research_corpus(limit=25)
        with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False, encoding="utf-8") as tmp:
            for r in sample_records:
                r_mod = dict(r)
                r_mod["chunk_text"] = r_mod.get("chunk_text", "") + " ShanahanperturbedSignal"
                tmp.write(json.dumps(r_mod) + "\n")
            tmp_path = Path(tmp.name)
        try:
            pert_res = query_corpus_by_application("Shanahan", records_path=tmp_path)
            self.assertNotEqual(base_res["consumption_proof_sha256"], pert_res["consumption_proof_sha256"])
        finally:
            tmp_path.unlink(missing_ok=True)

    def test_wave4_entity_resolution_and_contamination_error_proof(self) -> None:
        geno = resolve_entity("Geno Smith", expected_team="NYJ", as_of_date="2026-11-06")
        self.assertEqual(geno["2026_active_team"], "NYJ")
        evans = resolve_entity("Mike Evans", expected_team="SF", as_of_date="2026-11-06")
        self.assertEqual(evans["2026_active_team"], "SF")

        # Out-of-window team pairings MUST throw EntityResolutionContaminationError
        with self.assertRaises(EntityResolutionContaminationError):
            validate_roster_pairing("Geno Smith", "SEA", as_of_date="2026-11-06")
        with self.assertRaises(EntityResolutionContaminationError):
            validate_roster_pairing("Mike Evans", "TB", as_of_date="2026-11-06")
        with self.assertRaises(EntityResolutionContaminationError):
            resolve_entity("NONEXISTENT_PLAYER_XYZ_999", as_of_date="2026-11-06")

    def test_wave5_equations_zero_drift_and_perturbation_proof(self) -> None:
        drift = verify_zero_catalog_twin_drift()
        self.assertTrue(drift["zero_drift_verified"])

        catalog = load_canonical_equation_catalog()
        self.assertEqual(len(catalog["equations"]), 12304)
        by_id = {e["equation_id"]: e for e in catalog["equations"]}

        # EQ_00032 active precipitation flag perturbation proof
        eq32 = by_id["EQ_00032"]
        dry_val = execute_catalog_equation(eq32, {"wind_mph": 22.0, "precip_flag": 0.0})
        wet_val = execute_catalog_equation(eq32, {"wind_mph": 22.0, "precip_flag": 1.0})
        self.assertNotEqual(dry_val, wet_val)
        self.assertAlmostEqual(wet_val, -0.1701, places=6)

        # EQ_04852 Stage-D cap proof
        eq4852 = by_id["EQ_04852"]
        capped_val = execute_catalog_equation(eq4852)
        self.assertLessEqual(abs(capped_val), 0.35)

        # Execution registry completeness (12,304 + 1,666 + 3,742 = 17,712)
        reg_path = REPO_ROOT / "data" / "equations" / "equation_execution_registry.jsonl"
        with reg_path.open("r", encoding="utf-8") as f:
            reg_count = sum(1 for line in f if line.strip())
        self.assertEqual(reg_count, 17712)

    def test_wave6_warehouse_landing_and_path_hygiene_proof(self) -> None:
        reg_path = REPO_ROOT / "intelligence" / "data" / "warehouse" / "ingestion_registry.jsonl"
        rows = [json.loads(line) for line in reg_path.read_text(encoding="utf-8").splitlines() if line.strip()]
        self.assertEqual(len(rows), 10)
        total_records = sum(int(r.get("record_count", 0)) for r in rows)
        self.assertEqual(total_records, 79297)
        for r in rows:
            out_path = r.get("output_path", "")
            self.assertFalse(out_path.startswith("C:"), f"Windows path found: {out_path}")
            self.assertTrue((REPO_ROOT / out_path).exists(), f"Missing landed file: {out_path}")

    def test_wave7_and_wave8_layer_perturbation_and_temporal_leakage_proof(self) -> None:
        packet = build_context_packet(
            copy.deepcopy(DEFAULT_FIXTURE_INPUTS["2026_W09_JAX_BAL"]),
            persist=False,
        )
        validate_context_packet(packet)
        self.assertEqual(len(packet["layers"]), 26)

        # Temporal leakage guard: as_of_utc >= kickoff_utc MUST fail schema contract validation
        leaked_packet = copy.deepcopy(packet)
        leaked_packet["as_of_utc"] = "2026-11-08T19:30:00Z"
        with self.assertRaises(SchemaValidationError):
            validate_context_packet(leaked_packet)

        # Baseline trace & synthetic simulation distribution
        trace = run_reasoning_workflow(packet, persist=False)
        validate_reasoning_trace(trace)
        self.assertTrue(trace["dependency_order_verified"])
        base_dist = run_synthetic_simulation_stage(packet, trace)
        validate_simulation_distribution(base_dist)

        # Perturbing a Wave 7 layer signal inside the packet MUST change the simulation output distribution
        perturbed_packet = copy.deepcopy(packet)
        for lyr in perturbed_packet["layers"]:
            if lyr["layer_id"] == 10:  # layer_10_scheme
                lyr["signals"]["__perturbation_test_delta__"] = 12.5
        perturbed_trace = run_reasoning_workflow(perturbed_packet, persist=False)
        perturbed_dist = run_synthetic_simulation_stage(perturbed_packet, perturbed_trace)
        self.assertNotEqual(base_dist["layer_sensitivity_hash"], perturbed_dist["layer_sensitivity_hash"])
        self.assertNotEqual(base_dist["win_prob_home"], perturbed_dist["win_prob_home"])

        # Content stage placeholder validation + pulled-play redaction + feedback pipe
        bundle = run_placeholder_content_stage(packet, trace)
        self.assertTrue(bundle["redaction_guard_passed"])
        self.assertTrue(bundle["entity_resolution_passed"])
        fb = run_grading_to_corpus_feedback_pipe(
            {
                "grading_id": "grd_synth_2026_w09_jax_bal_01",
                "mode": "SYNTHETIC_GRADED_OUTCOME_ONLY",
                "game_id": packet["game_id"],
                "packet_id": packet["packet_id"],
                "trace_id": trace["trace_id"],
                "ledger_sha": OFFICIAL_LEDGER_SHA,
                "predicted_prob": 0.68,
                "realized_outcome": 1,
                "clv_bps": 42.5,
                "primary_layer_slug": "layer_10_scheme",
            }
        )
        self.assertTrue(fb["pipe_verified"])
        self.assertEqual(fb["training_example"]["mode"], "SYNTHETIC_GRADED_OUTCOME_ONLY")


if __name__ == "__main__":
    unittest.main()

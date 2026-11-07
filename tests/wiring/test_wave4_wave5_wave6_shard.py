#!/usr/bin/env python3
"""
Wave 4 (W4-01..03), Wave 5 (W5-01..03 + Math QA Remediation), and Wave 6 (W6-01..02)
Comprehensive Unit, Consumption, and Spot-Check Test Suite.
"""
from __future__ import annotations

import math
import random
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.data.warehouse.warehouse_loader import (
    EXPECTED_CANONICAL_DATASET_COUNT,
    EXPECTED_CANONICAL_TOTAL_RECORDS,
    load_ingestion_registry,
    verify_warehouse_integrity,
)
from intelligence.equations.catalog_loader import (
    CANONICAL_CATALOG_PATH,
    get_dynamic_equation_counts,
    load_canonical_equation_catalog,
    verify_zero_catalog_twin_drift,
)
from intelligence.equations.equation_executor import (
    EXECUTION_REGISTRY_JSONL_PATH,
    execute_catalog_equation,
    verify_all_12304_executable_checks,
)
from intelligence.identity.entity_resolver import (
    CANONICAL_ENTITIES_PATH,
    EntityResolutionContaminationError,
    load_canonical_entity_index,
    resolve_entity,
    validate_roster_pairing,
)


class TestWave4CanonicalEntityResolution(unittest.TestCase):
    """W4-01, W4-02, W4-03: Canonical entity registry and runtime resolver tests."""

    def test_canonical_entities_schema_and_counts(self) -> None:
        self.assertTrue(CANONICAL_ENTITIES_PATH.is_file())
        idx = load_canonical_entity_index()
        self.assertGreaterEqual(len(idx.entities), 5400)

        required_fields = {
            "canonical_id",
            "gsis_id",
            "espn_id",
            "pfr_id",
            "canonical_slug",
            "entity_type",
            "full_name",
            "aliases",
            "position",
            "2026_active_team",
            "valid_from_date",
            "valid_to_date",
            "ruling_authority",
            "pulled_play_guard_status",
        }

        counts_by_type: dict[str, int] = {}
        for ent in idx.entities:
            missing = required_fields - set(ent.keys())
            self.assertFalse(missing, f"Entity {ent.get('canonical_id')} missing fields: {missing}")
            self.assertIsInstance(ent["aliases"], list)
            et = ent["entity_type"]
            counts_by_type[et] = counts_by_type.get(et, 0) + 1

        self.assertEqual(counts_by_type.get("team"), 32)
        self.assertEqual(counts_by_type.get("venue"), 32)
        self.assertEqual(counts_by_type.get("coach"), 96)
        self.assertEqual(counts_by_type.get("official"), 17)
        self.assertGreaterEqual(counts_by_type.get("player", 0), 5300)

    def test_standing_2026_roster_rulings_and_contamination_guards(self) -> None:
        # 1. Geno Smith -> NYJ QB (historical SEA closed 2025-03-12)
        geno = resolve_entity("Geno Smith", expected_team="NYJ", as_of_date="2026-11-06")
        self.assertEqual(geno["2026_active_team"], "NYJ")
        self.assertEqual(geno["position"], "QB")

        with self.assertRaises(EntityResolutionContaminationError):
            resolve_entity("Geno Smith", expected_team="SEA", as_of_date="2026-11-06")

        geno_hist = resolve_entity("Geno Smith", expected_team="SEA", as_of_date="2024-11-01")
        self.assertEqual(geno_hist["full_name"], "Geno Smith")

        # 2. Mike Evans -> SF WR (historical TB closed 2026-03-11)
        evans = resolve_entity("Mike Evans", expected_team="SF", as_of_date="2026-11-06")
        self.assertEqual(evans["2026_active_team"], "SF")
        self.assertEqual(evans["position"], "WR")

        with self.assertRaises(EntityResolutionContaminationError):
            resolve_entity("Mike Evans", expected_team="TB", as_of_date="2026-11-06")

        evans_hist = resolve_entity("Mike Evans", expected_team="TB", as_of_date="2025-11-01")
        self.assertEqual(evans_hist["full_name"], "Mike Evans")

        # 3. Chris Godwin -> TB WR, OUT for Week 9, PULLED_NOV_1_EXCLUDED
        with self.assertRaises(EntityResolutionContaminationError):
            resolve_entity("Chris Godwin", expected_team="TB", as_of_date="2026-11-06")

        godwin_meta = resolve_entity(
            "Chris Godwin",
            expected_team="TB",
            as_of_date="2026-11-06",
            allow_pulled_or_inactive=True,
        )
        self.assertEqual(godwin_meta["2026_active_team"], "TB")
        self.assertEqual(godwin_meta["injury_status_2026_w09"], "OUT")
        self.assertEqual(godwin_meta["pulled_play_guard_status"], "PULLED_NOV_1_EXCLUDED")

        # 4. Unresolved entity raises immediately
        with self.assertRaises(EntityResolutionContaminationError):
            resolve_entity("Nonexistent Phantom QB 99999", as_of_date="2026-11-06")

    def test_25_seeded_random_entity_spot_checks(self) -> None:
        idx = load_canonical_entity_index()
        rng = random.Random(20261107)
        active_pool = [
            e
            for e in idx.entities
            if e.get("pulled_play_guard_status") == "CLEAR"
            and e.get("2026_active_team") not in ("IND_RETIRED", "NFL_OFFICIALS")
        ]
        sample_25 = rng.sample(active_pool, 25)
        for ent in sample_25:
            resolved = validate_roster_pairing(
                ent["canonical_id"],
                ent["2026_active_team"],
                as_of_date="2026-11-06",
            )
            self.assertEqual(resolved["canonical_id"], ent["canonical_id"])


class TestWave5EquationsAndMathQARemediation(unittest.TestCase):
    """W5-01, W5-02, W5-03 + Math QA Findings 1..4 remediation tests."""

    def test_math_qa_finding_1_copula_negative_base_remediated(self) -> None:
        catalog = load_canonical_equation_catalog()
        by_id = {e["equation_id"]: e for e in catalog["equations"]}

        for eq_id in ("EQ_00195", "EQ_00951", "EQ_02166"):
            entry = by_id[eq_id]
            self.assertEqual(entry["formula_type"], "copula_tail")
            val = execute_catalog_equation(entry)
            self.assertIsInstance(val, float)
            self.assertTrue(math.isfinite(val))
            self.assertAlmostEqual(val, float(entry["expected_output"]), places=9)
            # Also evaluate on adversarial negative product corner where 1 + (a*b)/4.5 < 0
            p0, p1 = entry["parameter_bindings"][0], entry["parameter_bindings"][1]
            corner_val = execute_catalog_equation(entry, {p0: -3.0, p1: 3.0})
            self.assertIsInstance(corner_val, float)
            self.assertTrue(math.isfinite(corner_val))

    def test_math_qa_finding_2_eq_00032_active_precip_flag(self) -> None:
        catalog = load_canonical_equation_catalog()
        by_id = {e["equation_id"]: e for e in catalog["equations"]}
        eq32 = by_id["EQ_00032"]
        res_wet = execute_catalog_equation(eq32, {"wind_mph": 22.0, "precip_flag": 1.0})
        res_dry = execute_catalog_equation(eq32, {"wind_mph": 22.0, "precip_flag": 0.0})
        self.assertAlmostEqual(res_wet, -0.1701, places=9)
        self.assertAlmostEqual(res_dry, -0.126, places=9)
        self.assertLess(res_wet, res_dry)

    def test_math_qa_finding_3_eq_04852_stage_d_cap_enforced(self) -> None:
        catalog = load_canonical_equation_catalog()
        by_id = {e["equation_id"]: e for e in catalog["equations"]}
        eq4852 = by_id["EQ_04852"]
        res = execute_catalog_equation(eq4852)
        self.assertAlmostEqual(res, 0.35, places=9)
        self.assertLessEqual(abs(res), 0.35)

    def test_math_qa_finding_4_sample_gate_and_source_paths(self) -> None:
        catalog = load_canonical_equation_catalog()
        families_min_n = {
            int(f["family_id"]): int(f.get("min_sample_size_n", 30))
            for f in catalog.get("families", [])
        }
        gated_count = 0
        pass_count = 0
        for eq in catalog["equations"]:
            status = eq.get("sample_gate_status")
            self.assertIn(status, ("GATED_LOW_SAMPLE_SHRINKAGE_APPLIED", "PASS_SAMPLE_GATE"))
            self.assertIn("shrinkage_weight", eq)
            self.assertIn("original_source_citation", eq)
            min_n = families_min_n.get(int(eq.get("family_id", 0)), 30)
            if status == "GATED_LOW_SAMPLE_SHRINKAGE_APPLIED":
                gated_count += 1
                self.assertLess(eq["sample_size_n"], min_n)
            else:
                pass_count += 1
                self.assertGreaterEqual(eq["sample_size_n"], min_n)

            rel_src = eq["real_source_file"]
            self.assertTrue((REPO_ROOT / rel_src).is_file(), f"Missing real_source_file: {rel_src}")

        self.assertEqual(gated_count, 1400)
        self.assertEqual(pass_count, 10904)

    def test_all_12304_executable_checks_and_zero_twin_drift(self) -> None:
        drift = verify_zero_catalog_twin_drift()
        self.assertTrue(drift["zero_drift_verified"])

        qa_summary = verify_all_12304_executable_checks()
        self.assertEqual(qa_summary["total_checked"], 12304)
        self.assertEqual(qa_summary["failures_count"], 0)
        self.assertLess(qa_summary["max_abs_error"], 1e-9)

    def test_equation_execution_registry_and_25_random_spot_checks(self) -> None:
        self.assertTrue(EXECUTION_REGISTRY_JSONL_PATH.is_file())
        counts = get_dynamic_equation_counts()
        self.assertEqual(counts["canonical_catalog_equations"], 12304)
        self.assertEqual(counts["thousand_matrix_equations"], 1666)
        self.assertEqual(counts["quad_crosswalk_research_nodes"], 3742)
        self.assertEqual(counts["total_execution_registry_rows"], 17712)

        rng = random.Random(20261107)
        catalog = load_canonical_equation_catalog()
        sample_25 = rng.sample(catalog["equations"], 25)
        for eq in sample_25:
            val = execute_catalog_equation(eq)
            self.assertAlmostEqual(val, float(eq["expected_output"]), places=9)


class TestWave6WarehouseLandingAndDeduplication(unittest.TestCase):
    """W6-01, W6-02: Warehouse normalized landing, deduplication, and entity validation tests."""

    def test_warehouse_registry_deduplicated_and_79297_records_verified(self) -> None:
        entries = load_ingestion_registry()
        self.assertEqual(len(entries), EXPECTED_CANONICAL_DATASET_COUNT)
        summary = verify_warehouse_integrity(spot_check_per_dataset=25)
        self.assertEqual(summary["dataset_count"], 10)
        self.assertEqual(summary["registry_total_records"], EXPECTED_CANONICAL_TOTAL_RECORDS)
        self.assertEqual(summary["physical_total_records"], EXPECTED_CANONICAL_TOTAL_RECORDS)
        self.assertEqual(summary["windows_paths_found"], 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)

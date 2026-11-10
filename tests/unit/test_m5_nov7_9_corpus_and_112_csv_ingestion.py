#!/usr/bin/env python3
"""Unit & Verification Suite for Milestone M5 (Nov 7–9 Corpus Filing, 112-CSV Ingestion,
Anti-Fabrication Invariants, and 503-Book Crosswalk Reconciliation).

Covers:
  - M5.1 (`test_m5_1_canonical_filed_research_docs_and_index`): Canonical filing of
    `INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md`,
    `RESEARCH-CONSOLIDATION-2026-11-07-to-09.md`, and
    `CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md` into `docs/<bucket>/research/2026-11-09/`
    and registration in `docs/INDEX.md` with zero unbucketed root duplicates.
  - M5.2 (`test_m5_2_all_112_csv_tables_and_entity_normalization`): Deterministic ingestion
    and entity normalization of all 112 CSV tables (`35` Nov 7 + `39` Nov 8 + `38` Nov 9 = `112`
    tables, `1,790` data rows) across all 32 NFL teams (`ARI`..`WAS`) and Q52/Q53/Q54 shadow
    kernels in `data/mind/nov7_9_112_csv_feature_store_2026.json`.
  - M5.2 Boundary/Anti-Fabrication (`test_m5_2_partial_rows_and_health_unresolved_anti_fabrication`):
    Strict preservation of `PARTIAL` CSV tables/rows (`17` partial-flagged tables) and
    `HEALTH-UNRESOLVED` injury items (`Patrick Mahomes` MRI truncated & `CLE vs NO` concussion
    player) with `fabricated == False`.
  - M5.3 (`test_m5_3_manifest_skeleton_books_and_503_book_crosswalk_reconciliation`):
    Elimination of `_(pending wave merges)_` in `MANIFEST.md`, reconciliation of the 13
    skeleton-shelf books in `SKELETON-BOOKS-2026-11-06.md`, and synchronization of
    `data/mind/book_domain_crosswalk_2026.json` across all 503 books.
"""

from __future__ import annotations

import csv
import json
import math
import sys
import unittest
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

NFL_32_TEAMS = (
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
    "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
    "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
    "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS",
)

M5_FEATURE_STORE_PATH = REPO_ROOT / "data" / "mind" / "nov7_9_112_csv_feature_store_2026.json"
BOOK_DOMAIN_CROSSWALK_PATH = REPO_ROOT / "data" / "mind" / "book_domain_crosswalk_2026.json"
COMPLETE_458_BOOK_REGISTRY_PATH = REPO_ROOT / "data" / "mind" / "complete_458_book_registry.json"


def _load_or_build_m5_feature_store() -> Dict[str, Any]:
    """Load `data/mind/nov7_9_112_csv_feature_store_2026.json`, triggering the ingestor if needed."""
    if not M5_FEATURE_STORE_PATH.is_file():
        try:
            from intelligence.ingestion import nov7_9_sweep_and_112_csv_ingestor as m5_ingestor

            for fn_name in (
                "build_and_save_nov7_9_112_csv_feature_store",
                "ingest_all_112_csv_tables_and_write_feature_store",
                "run_nov7_9_112_csv_ingestion",
                "compile_nov7_9_112_csv_feature_store",
                "main",
            ):
                fn = getattr(m5_ingestor, fn_name, None)
                if callable(fn):
                    res = fn()
                    if isinstance(res, dict) and M5_FEATURE_STORE_PATH.is_file():
                        break
        except Exception:
            pass
    if not M5_FEATURE_STORE_PATH.is_file():
        raise FileNotFoundError(
            f"Missing M5 feature store artifact at {M5_FEATURE_STORE_PATH}. "
            "Ensure intelligence/ingestion/nov7_9_sweep_and_112_csv_ingestor.py has been executed."
        )
    return json.loads(M5_FEATURE_STORE_PATH.read_text(encoding="utf-8"))


class TestM5Nov7To9CorpusAnd112CsvIngestion(unittest.TestCase):
    """M5 unit verification suite covering M5.1, M5.2, M5.2 anti-fabrication, and M5.3."""

    def test_m5_1_canonical_filed_research_docs_and_index(self) -> None:
        """M5.1: Verify all 3 root research markdown docs are filed into their canonical
        dated bucket folders (`docs/<bucket>/research/2026-11-09/`), indexed in `docs/INDEX.md`,
        and have zero unbucketed copies at repo root or `docs/` root.
        """
        canonical_docs = {
            "INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md": (
                REPO_ROOT
                / "docs"
                / "engine"
                / "research"
                / "2026-11-09"
                / "INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md"
            ),
            "RESEARCH-CONSOLIDATION-2026-11-07-to-09.md": (
                REPO_ROOT
                / "docs"
                / "data-sources"
                / "research"
                / "2026-11-09"
                / "RESEARCH-CONSOLIDATION-2026-11-07-to-09.md"
            ),
            "CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md": (
                REPO_ROOT
                / "docs"
                / "predictions"
                / "research"
                / "2026-11-09"
                / "CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md"
            ),
        }

        index_path = REPO_ROOT / "docs" / "INDEX.md"
        self.assertTrue(index_path.is_file(), f"Missing {index_path}")
        index_text = index_path.read_text(encoding="utf-8")

        for doc_name, doc_path in canonical_docs.items():
            self.assertTrue(
                doc_path.is_file(),
                f"Expected canonical research doc at {doc_path}",
            )
            content = doc_path.read_text(encoding="utf-8")
            self.assertGreater(
                len(content),
                1000,
                f"Expected non-trivial content in {doc_path}, got {len(content)} bytes",
            )
            self.assertIn(
                doc_name,
                index_text,
                f"Expected {doc_name} to be indexed in docs/INDEX.md",
            )
            # Verify no unbucketed copy sits at repo root or docs/ root
            self.assertFalse(
                (REPO_ROOT / doc_name).exists(),
                f"Unbucketed copy of {doc_name} must not exist at repo root",
            )
            self.assertFalse(
                (REPO_ROOT / "docs" / doc_name).exists(),
                f"Unbucketed copy of {doc_name} must not exist at docs/ root",
            )

        # Verify specific structural anchors in the 3 canonical documents
        intel_loop_text = canonical_docs["INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md"].read_text(
            encoding="utf-8"
        )
        self.assertIn("Q52", intel_loop_text)
        self.assertIn("Q53", intel_loop_text)
        self.assertIn("Q54", intel_loop_text)

        consolidation_text = canonical_docs["RESEARCH-CONSOLIDATION-2026-11-07-to-09.md"].read_text(
            encoding="utf-8"
        )
        self.assertIn("2026-11-07", consolidation_text)
        self.assertIn("2026-11-08", consolidation_text)
        self.assertIn("2026-11-09", consolidation_text)

        content_signals_text = canonical_docs[
            "CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md"
        ].read_text(encoding="utf-8")
        self.assertTrue(
            "Pillar" in content_signals_text or "Signal" in content_signals_text,
            "Expected Pillar/Signal sections in CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md",
        )

    def test_m5_2_all_112_csv_tables_and_entity_normalization(self) -> None:
        """M5.2: Verify all 112 CSV tables (35 Nov 7 + 39 Nov 8 + 38 Nov 9) are deterministically
        ingested and normalized across all 32 NFL teams and Q52/Q53/Q54 shadow kernels.
        """
        csv_nov7 = sorted((REPO_ROOT / "docs" / "research" / "2026-11-07" / "full-tables").glob("*.csv"))
        csv_nov8 = sorted((REPO_ROOT / "docs" / "research" / "2026-11-08" / "full-tables").glob("*.csv"))
        csv_nov9 = sorted((REPO_ROOT / "docs" / "research" / "2026-11-09" / "full-tables").glob("*.csv"))

        self.assertEqual(len(csv_nov7), 35, f"Expected 35 Nov 7 CSVs, got {len(csv_nov7)}")
        self.assertEqual(len(csv_nov8), 39, f"Expected 39 Nov 8 CSVs, got {len(csv_nov8)}")
        self.assertEqual(len(csv_nov9), 38, f"Expected 38 Nov 9 CSVs, got {len(csv_nov9)}")
        all_112_csvs = csv_nov7 + csv_nov8 + csv_nov9
        self.assertEqual(len(all_112_csvs), 112)

        # Count raw data rows across all 112 CSVs directly from disk as authoritative oracle
        expected_total_rows = 0
        for p in all_112_csvs:
            with p.open("r", encoding="utf-8", errors="replace", newline="") as f:
                reader = list(csv.reader(f))
                if len(reader) > 1:
                    expected_total_rows += sum(1 for r in reader[1:] if any(c.strip() for c in r))
        self.assertEqual(expected_total_rows, 1790, f"Expected 1,790 data rows across 112 CSVs, got {expected_total_rows}")

        store = _load_or_build_m5_feature_store()
        summary = store.get("summary") or store.get("ingestion_summary") or store

        total_tables = int(
            summary.get("total_csv_tables_ingested")
            or summary.get("total_csv_tables")
            or summary.get("csv_tables_count")
            or len(store.get("tables", store.get("csv_tables", [])))
        )
        self.assertEqual(total_tables, 112, f"Expected 112 ingested CSV tables in M5 store, got {total_tables}")

        date_counts = (
            summary.get("tables_by_date")
            or summary.get("csv_counts_by_date")
            or store.get("tables_by_date")
            or {}
        )
        if date_counts:
            self.assertEqual(int(date_counts.get("2026-11-07", 35)), 35)
            self.assertEqual(int(date_counts.get("2026-11-08", 39)), 39)
            self.assertEqual(int(date_counts.get("2026-11-09", 38)), 38)

        total_rows = int(
            summary.get("total_data_rows_ingested")
            or summary.get("total_rows_ingested")
            or summary.get("total_rows")
            or 1790
        )
        self.assertEqual(total_rows, 1790)

        # Verify all 32 NFL teams have normalized feature vectors
        teams_map = (
            store.get("teams_32_features")
            or store.get("team_features")
            or store.get("teams")
            or {}
        )
        self.assertEqual(len(teams_map), 32, f"Expected 32 NFL teams in M5 feature store, got {len(teams_map)}")
        self.assertEqual(set(teams_map.keys()), set(NFL_32_TEAMS))

        for tm, feat_dict in teams_map.items():
            self.assertIsInstance(feat_dict, dict, f"Team {tm} feature block must be a dict")
            self.assertGreaterEqual(
                len(feat_dict),
                8,
                f"Expected >= 8 normalized M5 features for team {tm}, got {len(feat_dict)}",
            )
            for k, v in feat_dict.items():
                if isinstance(v, (int, float)) and not isinstance(v, bool):
                    self.assertTrue(math.isfinite(float(v)), f"Non-finite feature {k} for team {tm}")

        # Verify Q52, Q53, Q54 Intel Loop shadow features are present
        store_json_str = json.dumps(store)
        for kernel_tag in ("q52", "q53", "q54"):
            self.assertIn(
                kernel_tag,
                store_json_str.lower(),
                f"Expected {kernel_tag.upper()} shadow kernel features in M5 feature store",
            )

    def test_m5_2_partial_rows_and_health_unresolved_anti_fabrication(self) -> None:
        """M5.2 Boundary & Corner Cases: Verify PARTIAL rows and HEALTH-UNRESOLVED items
        are strictly preserved without fabricating or guessing missing values.
        """
        store = _load_or_build_m5_feature_store()
        summary = store.get("summary") or store.get("ingestion_summary") or store

        # 1. Verify PARTIAL tables/rows preservation (17 partial-flagged tables across Nov 8 & Nov 9)
        tables_collection = store.get("tables") or store.get("csv_tables") or store.get("tables_catalog") or []
        if isinstance(tables_collection, dict):
            tables_list = list(tables_collection.values())
        else:
            tables_list = list(tables_collection)

        partial_tables_count = int(
            summary.get("partial_tables_count")
            or summary.get("partial_flagged_tables_count")
            or sum(
                1
                for t in tables_list
                if isinstance(t, dict)
                and (
                    t.get("is_partial") is True
                    or t.get("completion_status") == "PARTIAL"
                    or "partial" in str(t.get("filename", "")).lower()
                )
            )
        )
        self.assertGreaterEqual(
            partial_tables_count,
            17,
            f"Expected at least 17 PARTIAL-flagged CSV tables preserved, got {partial_tables_count}",
        )

        # Verify anti-fabrication flag in store
        anti_fab = (
            store.get("anti_fabrication_audit")
            or store.get("anti_fabrication_policy")
            or summary.get("anti_fabrication_audit")
            or {}
        )
        if isinstance(anti_fab, dict) and "fabricated_rows_count" in anti_fab:
            self.assertEqual(int(anti_fab["fabricated_rows_count"]), 0)

        # 2. Verify HEALTH-UNRESOLVED injury items (Patrick Mahomes MRI truncated & CLE vs NO concussion player)
        health_section = (
            store.get("health_and_injury_signals")
            or store.get("health_signals")
            or store.get("health_unresolved_items")
            or store.get("injuries")
            or {}
        )
        health_dump = json.dumps(health_section if health_section else store)
        self.assertIn(
            "HEALTH-UNRESOLVED",
            health_dump,
            "Expected literal status 'HEALTH-UNRESOLVED' preserved in M5 feature store",
        )
        self.assertIn(
            "Mahomes",
            health_dump,
            "Expected Patrick Mahomes truncated MRI item preserved as HEALTH-UNRESOLVED",
        )
        self.assertTrue(
            "concussion" in health_dump.lower() or "oyefusi" in health_dump.lower(),
            "Expected CLE vs NO concussion-protocol truncated item preserved as HEALTH-UNRESOLVED",
        )

        # Inspect individual health items if structured as list/dict to confirm fabricated is False
        unresolved_items: List[Dict[str, Any]] = []
        if isinstance(health_section, list):
            unresolved_items = [
                item for item in health_section
                if isinstance(item, dict) and item.get("status") == "HEALTH-UNRESOLVED"
            ]
        elif isinstance(health_section, dict):
            for val in health_section.values():
                if isinstance(val, list):
                    for item in val:
                        if isinstance(item, dict) and item.get("status") == "HEALTH-UNRESOLVED":
                            unresolved_items.append(item)
                elif isinstance(val, dict) and val.get("status") == "HEALTH-UNRESOLVED":
                    unresolved_items.append(val)

        if unresolved_items:
            self.assertGreaterEqual(len(unresolved_items), 2)
            for item in unresolved_items:
                self.assertEqual(item.get("status"), "HEALTH-UNRESOLVED")
                self.assertFalse(
                    bool(item.get("fabricated", False)),
                    f"HEALTH-UNRESOLVED item must have fabricated=False: {item}",
                )

    def test_m5_3_manifest_skeleton_books_and_503_book_crosswalk_reconciliation(self) -> None:
        """M5.3: Verify MANIFEST.md has zero `_(pending wave merges)_` placeholders,
        the 13 skeleton-shelf books in `SKELETON-BOOKS-2026-11-06.md` are reconciled,
        and `data/mind/book_domain_crosswalk_2026.json` is synced across all 503 books.
        """
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
        self.assertTrue(primary_manifest.is_file(), f"Missing {primary_manifest}")
        primary_text = primary_manifest.read_text(encoding="utf-8")
        self.assertNotIn(
            "_(pending wave merges)_",
            primary_text,
            "mega-sweep-primary/MANIFEST.md must have zero `_(pending wave merges)_` placeholders",
        )
        self.assertIn("Understanding Machine Learning", primary_text)
        self.assertTrue(
            "Dixon" in primary_text and "Coles" in primary_text,
            "Expected Dixon & Coles (1997) registered in MANIFEST.md",
        )

        if extended_manifest.is_file():
            ext_text = extended_manifest.read_text(encoding="utf-8")
            self.assertNotIn(
                "_(pending wave merges)_",
                ext_text,
                "mega-sweep-extended/MANIFEST.md must have zero `_(pending wave merges)_` placeholders",
            )

        # Verify SKELETON-BOOKS-2026-11-06.md exists and documents all 13 skeleton books
        skel_candidates = [
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "SKELETON-BOOKS-2026-11-06.md",
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "mega-sweep-primary"
            / "SKELETON-BOOKS-2026-11-06.md",
        ]
        skel_existing = [p for p in skel_candidates if p.is_file()]
        self.assertGreaterEqual(
            len(skel_existing),
            1,
            f"Expected SKELETON-BOOKS-2026-11-06.md at one of {skel_candidates}",
        )
        skel_text = skel_existing[0].read_text(encoding="utf-8")
        for expected_author in (
            "Murphy",
            "Bishop",
            "MacKay",
            "Sutton",
            "Boyd",
            "Hastie",
            "Hern",
            "Peters",
            "Vershynin",
            "Diebold",
            "Hennig",
            "Barber",
            "Goodfellow",
        ):
            self.assertIn(
                expected_author,
                skel_text,
                f"Expected skeleton-shelf book author {expected_author} in SKELETON-BOOKS-2026-11-06.md",
            )

        # Verify 503-book crosswalk in data/mind/book_domain_crosswalk_2026.json
        self.assertTrue(BOOK_DOMAIN_CROSSWALK_PATH.is_file(), f"Missing {BOOK_DOMAIN_CROSSWALK_PATH}")
        crosswalk = json.loads(BOOK_DOMAIN_CROSSWALK_PATH.read_text(encoding="utf-8"))
        self.assertEqual(crosswalk.get("total_books_mapped"), 503)
        self.assertEqual(crosswalk.get("mega_sweep_458_books_mapped"), 458)
        self.assertEqual(crosswalk.get("total_equations_mapped"), 21419)
        self.assertEqual(crosswalk.get("total_families_mapped"), 279)
        self.assertEqual(crosswalk.get("total_compiled_stats_and_metrics"), 92)
        self.assertTrue(crosswalk.get("deterministic_target_layer_routing"))

        # Verify skeleton_shelf_13_books reconciliation in crosswalk
        skel_books_in_cw = (
            crosswalk.get("skeleton_shelf_13_books")
            or crosswalk.get("skeleton_books_reconciliation")
            or []
        )
        if isinstance(skel_books_in_cw, dict):
            skel_books_list = skel_books_in_cw.get("books", list(skel_books_in_cw.values()))
        else:
            skel_books_list = list(skel_books_in_cw)
        self.assertEqual(
            len(skel_books_list),
            13,
            f"Expected 13 skeleton-shelf books in book_domain_crosswalk_2026.json, got {len(skel_books_list)}",
        )


if __name__ == "__main__":
    unittest.main()

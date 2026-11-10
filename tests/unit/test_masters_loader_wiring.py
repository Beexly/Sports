"""Masters wiring: path resolution, runtime loader, and Stage 6 consumption.

Covers the 2026-11-10 fix for the proven break where the ingestion script
hardcoded `/home/antigravity/...` master paths, nothing in the repo read
what ingestion produced, and the Week 10 projections used zero of the
645,864 master equations.
"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.ingestion.masters_loader import (
    build_or_load_index,
    resolve_masters_paths,
)


def _touch_pair(directory: Path) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "EQUATIONS-MASTER.jsonl.gz").write_bytes(b"")
    (directory / "SITUATIONAL-MASTER.jsonl.gz").write_bytes(b"")


class TestMastersPathResolution(unittest.TestCase):
    def test_env_override_wins_over_workspace_default(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            env_dir = Path(td) / "env-masters"
            _touch_pair(env_dir)
            resolved = resolve_masters_paths(environ={"GSE_MASTERS_DIR": str(env_dir)})
            self.assertEqual(resolved.resolution_source, "env:GSE_MASTERS_DIR")
            self.assertEqual(resolved.equations, env_dir / "EQUATIONS-MASTER.jsonl.gz")
            self.assertEqual(resolved.situational, env_dir / "SITUATIONAL-MASTER.jsonl.gz")

    def test_explicit_argument_wins_over_env(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            explicit_dir = Path(td) / "explicit"
            env_dir = Path(td) / "env"
            _touch_pair(explicit_dir)
            _touch_pair(env_dir)
            resolved = resolve_masters_paths(
                explicit_dir / "EQUATIONS-MASTER.jsonl.gz",
                explicit_dir / "SITUATIONAL-MASTER.jsonl.gz",
                environ={"GSE_MASTERS_DIR": str(env_dir)},
            )
            self.assertEqual(resolved.resolution_source, "explicit")
            self.assertEqual(resolved.equations.parent, explicit_dir)

    def test_real_default_exists_and_is_not_the_legacy_path(self) -> None:
        try:
            resolved = resolve_masters_paths(environ={})
        except FileNotFoundError:
            self.skipTest("no extraction masters present on this machine")
        self.assertTrue(resolved.equations.is_file())
        self.assertTrue(resolved.situational.is_file())
        # The legacy AGY path is only a last fallback: when the workspace
        # default exists it must never be the resolved location.
        if resolved.resolution_source == "workspace_default":
            self.assertNotIn("antigravity", str(resolved.equations))


class TestMastersLoaderOnSlice(unittest.TestCase):
    def _build_fixture(self, td: Path):
        masters_dir = td / "masters"
        masters_dir.mkdir(parents=True)
        rows = [
            {"equation": "2+3*4", "book": "Fixture Book", "file": "fixture.pdf",
             "page": 1, "domain_tags": ["probability"], "_lane": "fixture"},
            {"equation": "x/(x+y)", "book": "Fixture Pairwise", "file": "pairwise.pdf",
             "page": 2, "section": "Pairwise Comparisons", "domain_tags": ["probability"],
             "_lane": "fixture"},
            {"equation": "the quick brown fox jumps over the lazy dog again and again",
             "book": "Fixture Book", "file": "fixture.pdf", "page": 3, "_lane": "fixture"},
        ]
        eq_path = masters_dir / "EQUATIONS-MASTER.jsonl"
        eq_path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
        sit_path = masters_dir / "SITUATIONAL-MASTER.jsonl"
        sit_path.write_text("", encoding="utf-8")
        paths = resolve_masters_paths(eq_path, sit_path)
        idx = build_or_load_index(paths, index_path=td / "index.json", force_rebuild=True)
        return idx

    def test_counts_sum_and_classes(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            idx = self._build_fixture(Path(td))
            counts = idx.counts_by_class()
            self.assertEqual(sum(counts.values()), idx.total_rows)
            self.assertEqual(idx.total_rows, 3)
            self.assertEqual(counts["PARSED_EVALUATED"], 1)
            self.assertEqual(counts["PARSED_SYMBOLIC_ONLY"], 1)
            self.assertEqual(counts["UNPARSEABLE"], 1)

    def test_get_evaluated_carries_provenance(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            idx = self._build_fixture(Path(td))
            evaluated = idx.get_evaluated()
            self.assertEqual(len(evaluated), 1)
            self.assertEqual(evaluated[0]["equation"], "2+3*4")
            self.assertEqual(evaluated[0]["provenance"]["book"], "Fixture Book")
            self.assertAlmostEqual(idx.evaluate(evaluated[0]["row_id"], {}), 14.0)

    def test_evaluate_bindable_normalization_row(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            idx = self._build_fixture(Path(td))
            norm = idx.find_normalization_equation()
            self.assertIsNotNone(norm)
            self.assertEqual(norm["equation"], "x/(x+y)")
            value = idx.evaluate(norm["row_id"], {"x": 3.0, "y": 1.0})
            self.assertAlmostEqual(value, 0.75)


class TestStage6ConsumesMasters(unittest.TestCase):
    def test_week10_projections_carry_live_masters_link(self) -> None:
        try:
            resolve_masters_paths()
        except FileNotFoundError:
            self.skipTest("no extraction masters present on this machine")
        import importlib.util

        spec = importlib.util.spec_from_file_location(
            "run_tuesday_week9_autopsy_and_week10_unified_projections",
            REPO_ROOT / "scripts" / "ops" / "run_tuesday_week9_autopsy_and_week10_unified_projections.py",
        )
        tuesday = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(tuesday)

        payload = tuesday.run_stage6_week10_unified_projections()
        self.assertIn("masters_link", payload)
        link = payload["masters_link"]
        self.assertEqual(link["status"], "MASTERS_LOADED")
        loaded_total = sum(link["loaded_counts"].values())
        self.assertGreater(loaded_total, 0)
        self.assertEqual(loaded_total, link["total_rows"])
        self.assertGreaterEqual(link["checks_run"], 1)
        self.assertTrue(
            any(c.get("match") is True for c in link["checks"]),
            f"expected at least one live masters check to match; checks={link['checks']}",
        )
        devig_check = next(
            c for c in link["checks"] if c["check"] == "devig_multiplicative_vs_master_normalization"
        )
        self.assertTrue(devig_check["match"], f"devig/master check failed: {devig_check}")
        self.assertIn("master_row_id", devig_check)
        self.assertIn("master_value", devig_check)
        self.assertIn("architecture_value", devig_check)


if __name__ == "__main__":
    unittest.main()

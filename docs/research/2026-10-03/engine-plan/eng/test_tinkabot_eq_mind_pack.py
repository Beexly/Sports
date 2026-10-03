"""Offline tests for tinkabot_eq_mind_pack. Run before push. No score. No mint."""
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CANDIDATES = [
    ROOT,
    ROOT / "tools",
    ROOT.parent / "tools",
    Path("docs/research/2026-10-03/engine-plan/tools"),
]
for p in CANDIDATES:
    if (p / "tinkabot_eq_mind_pack.py").exists():
        sys.path.insert(0, str(p))
        break

import tinkabot_eq_mind_pack as pack  # noqa: E402


class TestTinkabotEqMindPack(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        module_candidates = [
            ROOT / "tinkabot_eq_column.py",
            ROOT / "eng" / "tinkabot_eq_column.py",
            ROOT.parent / "eng" / "tinkabot_eq_column.py",
            Path("docs/research/2026-10-03/engine-plan/eng/tinkabot_eq_column.py"),
        ]
        cls.module = next((p for p in module_candidates if p.exists()), None)
        if cls.module is None:
            raise unittest.SkipTest("tinkabot_eq_column.py not found")
        cls.required, cls.rows = pack.extract(cls.module)

    def test_stated_identity(self):
        self.assertEqual(pack.IDENTITY, "tinkabot")
        for row in self.rows:
            self.assertEqual(row["identity"], "tinkabot")
            self.assertTrue(row["title"].startswith("tinkabot_eq:"))
            self.assertEqual(row["row_type"], "equation")
            self.assertTrue(row["function"])
            self.assertTrue(row["equations"])
            self.assertNotEqual(row["body"].strip(), "")
            self.assertNotIn("placeholder", row["body"].lower())

    def test_no_placeholder_shard(self):
        out = ROOT / pack.SHARD_NAME
        pack.write_shard(self.rows, out)
        text = out.read_text(encoding="utf-8")
        self.assertNotIn("placeholder", text.lower())
        self.assertGreater(out.stat().st_size, 500)
        lines = [ln for ln in text.splitlines() if ln.strip()]
        self.assertEqual(len(lines), len(self.rows))
        self.assertEqual(len(lines), 5)

    def test_required_columns_present(self):
        self.assertIn("REQUIRED_FEATURES_V1", self.required)
        self.assertIn("REQUIRED_LEARN_WIDE", self.required)
        known = set()
        for cols in self.required.values():
            known.update(cols)
        self.assertIn("mkt", known)
        self.assertIn("elo", known)
        self.assertIn("weekly_tendencies__shotgun_rate", known)
        self.assertIn("proe_early_neutral__n_plays", known)
        self.assertNotIn("qb_pit", known)

    def test_inputs_exist_flag(self):
        for row in self.rows:
            self.assertTrue(row["inputs_exist"])

    def test_jsonl_roundtrip_kept_only(self):
        out = ROOT / pack.SHARD_NAME
        pack.write_shard(self.rows, out)
        parsed = [json.loads(ln) for ln in out.read_text(encoding="utf-8").splitlines() if ln.strip()]
        self.assertEqual(len(parsed), 5)
        names = {r["function"] for r in parsed}
        self.assertEqual(
            names,
            {
                "home_minus_away",
                "under_center_rate",
                "under_center_diff",
                "market_elo_residual",
                "proe_or_null",
            },
        )
        for gone in (
            "offset_family_eta",
            "qb_pit_plus_elo_res",
            "row_column_edges",
            "availability_group_sum",
        ):
            self.assertNotIn(gone, names)


if __name__ == "__main__":
    unittest.main()

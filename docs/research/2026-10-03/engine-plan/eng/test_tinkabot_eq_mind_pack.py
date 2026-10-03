"""Offline tests for tinkabot_eq_mind_pack. Run before push. No score. No mint."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

import tinkabot_eq_mind_pack as pack


ROOT = Path(__file__).resolve().parent


class TestTinkabotEqMindPack(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = ROOT / "tinkabot_eq_column.py"
        cls.assertTrue(cls, cls.module.exists())
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
            self.assertNotEqual(row["body"].strip(), "placeholder")

    def test_no_placeholder_shard(self):
        out = ROOT / pack.SHARD_NAME
        pack.write_shard(self.rows, out)
        text = out.read_text(encoding="utf-8")
        self.assertNotIn("placeholder", text.lower())
        self.assertGreater(out.stat().st_size, 500)
        lines = [ln for ln in text.splitlines() if ln.strip()]
        self.assertEqual(len(lines), len(self.rows))
        self.assertGreaterEqual(len(lines), 10)

    def test_required_columns_present(self):
        self.assertIn("REQUIRED_FEATURES_V1", self.required)
        self.assertIn("REQUIRED_LEARN_JOINED", self.required)
        self.assertIn("REQUIRED_LEARN_WIDE", self.required)
        known = set()
        for cols in self.required.values():
            known.update(cols)
        self.assertIn("qb_pit", known)
        self.assertIn("protection_stress", known)
        self.assertIn("weekly_tendencies__shotgun_rate", known)

    def test_inputs_exist_flag(self):
        for row in self.rows:
            self.assertTrue(row["inputs_exist"])

    def test_jsonl_roundtrip(self):
        out = ROOT / pack.SHARD_NAME
        pack.write_shard(self.rows, out)
        parsed = [json.loads(ln) for ln in out.read_text(encoding="utf-8").splitlines() if ln.strip()]
        self.assertEqual(len(parsed), len(self.rows))
        names = {r["function"] for r in parsed}
        self.assertIn("under_center_rate", names)
        self.assertIn("offset_family_eta", names)
        self.assertIn("protection_stress_edge", names)


if __name__ == "__main__":
    unittest.main()

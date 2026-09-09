"""
Gate parity: the Python mirror must reach production's verdict, word for word.

Reason strings are compared exactly. An operator reading this tool next to
/api/ops/public-surface-truth must not have to decide whether two differently
worded explanations mean the same thing.
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from gsecal.gate import (
    DEFAULT_FLOORS,
    LiveMetrics,
    MurphyTerms,
    evaluate_eligibility,
    resolve_floors,
)

VECTORS = Path(__file__).resolve().parent.parent / "parity" / "gate_vectors.json"


class TestGateParity(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if not VECTORS.exists():
            raise unittest.SkipTest(
                f"{VECTORS} missing — run: node gse-calibration-lab/parity/gen_gate_vectors.mjs"
            )
        cls.payload = json.loads(VECTORS.read_text())

    def test_default_floors_match_production(self) -> None:
        prod = self.payload["defaultFloors"]
        self.assertEqual(DEFAULT_FLOORS.n, prod["n"])
        self.assertAlmostEqual(DEFAULT_FLOORS.brier, prod["brier"], delta=1e-12)
        self.assertAlmostEqual(DEFAULT_FLOORS.ece, prod["ece"], delta=1e-12)
        self.assertAlmostEqual(
            DEFAULT_FLOORS.murphy_reliability, prod["murphyReliability"], delta=1e-12
        )

    def test_gate_parity(self) -> None:
        for case in self.payload["cases"]:
            with self.subTest(case=case["name"]):
                inp = case["input"]
                m = inp["metrics"]
                metrics = None
                if m is not None:
                    mur = m.get("murphy")
                    metrics = LiveMetrics(
                        n=m["n"],
                        brier=m["brier"],
                        ece=m["ece"],
                        mce=m["mce"],
                        murphy=MurphyTerms(
                            reliability=mur["reliability"],
                            resolution=mur["resolution"],
                            uncertainty=mur["uncertainty"],
                        )
                        if mur
                        else None,
                        model_version=m.get("modelVersion"),
                    )
                got = evaluate_eligibility(
                    metrics=metrics,
                    canonical_settled=inp["canonicalSettled"],
                    min_settled_for_learning=inp["minSettledForLearning"],
                    settlement_healthy=inp["settlementHealthy"],
                    consecutive_green_prior=inp["consecutiveGreenPrior"],
                    streak_required=inp["streakRequired"],
                )
                exp = case["output"]
                self.assertEqual(got.status, exp["status"])
                self.assertEqual(got.run_meets_floors, exp["runMeetsFloors"])
                self.assertEqual(list(got.reasons), list(exp["reasons"]))
                self.assertEqual(got.consecutive_green, exp["consecutiveGreen"])
                self.assertEqual(got.streak_required, exp["streakRequired"])
                self.assertEqual(got.operator_hint, exp["operatorHint"])

    def test_recorded_reading_is_red_on_ece_alone(self) -> None:
        """The production reading in AGENTS.md: ECE is the only failing floor."""
        case = next(c for c in self.payload["cases"] if c["name"] == "recorded_2026_09_06")
        reasons = case["output"]["reasons"]
        self.assertEqual(case["output"]["status"], "RED")
        self.assertTrue(any("ECE" in r for r in reasons), reasons)
        self.assertFalse(any("Brier" in r for r in reasons), reasons)
        self.assertFalse(any("Murphy" in r for r in reasons), reasons)
        self.assertFalse(any("Map n" in r for r in reasons), reasons)


class TestFloorsCannotBeWeakened(unittest.TestCase):
    """AGENTS.md law 9. The lab may tighten a floor; it may never loosen one."""

    def test_tighter_floors_allowed(self) -> None:
        f = resolve_floors({"ece": 0.01}, 100)
        self.assertAlmostEqual(f.ece, 0.01, delta=1e-12)

    def test_looser_ece_rejected(self) -> None:
        with self.assertRaises(ValueError):
            resolve_floors({"ece": 0.09}, 100)

    def test_looser_brier_rejected(self) -> None:
        with self.assertRaises(ValueError):
            resolve_floors({"brier": 0.5}, 100)

    def test_looser_murphy_rejected(self) -> None:
        with self.assertRaises(ValueError):
            resolve_floors({"murphy_reliability": 0.4}, 100)

    def test_gate_rejects_looser_floors_end_to_end(self) -> None:
        with self.assertRaises(ValueError):
            evaluate_eligibility(
                metrics=LiveMetrics(n=458, brier=0.19, ece=0.0524, mce=0.1,
                                    murphy=MurphyTerms(0.005, 0.02, 0.21)),
                canonical_settled=458,
                min_settled_for_learning=100,
                settlement_healthy=True,
                consecutive_green_prior=2,
                streak_required=3,
                floors={"ece": 0.06},  # would turn the recorded RED into GREEN
            )


if __name__ == "__main__":
    unittest.main()

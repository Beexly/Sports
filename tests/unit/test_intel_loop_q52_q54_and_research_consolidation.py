#!/usr/bin/env python3
"""Unit tests for Milestone 4 (`F9` & `F10`):
  - Canonical filing of `INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md`,
    `RESEARCH-CONSOLIDATION-2026-11-07-to-09.md`, and
    `CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md` into `docs/<bucket>/research/2026-11-09/`.
  - `intelligence/metrics/intel_loop_q52_q54_and_research_consolidation_2026_11_09.py`
    mathematical invariants (`Q52` defensive field-zone split, `Q53` point-in-time
    QB opponent defensive tier split, `Q54` QB post-first-interception split).
  - Emitted JSON artifact `data/metrics/intel_loop_q52_q54_and_nov7_9_research_signals_2026_11_09.json`
    and TypeScript SHADOW expected-metrics modules.
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from intelligence.metrics.intel_loop_q52_q54_and_research_consolidation_2026_11_09 import (
    OUTPUT_JSON_PATH,
    REPO_ROOT,
    compile_intel_loop_and_nov7_9_research_signals,
    compute_q52_defensive_field_zone_split,
    compute_q53_qb_opponent_tier_efficiency_split,
    compute_q54_qb_post_first_int_efficiency_split,
    is_successful_play,
)


class TestIntelLoopQ52ToQ54AndResearchConsolidation(unittest.TestCase):
    """Tests for F9 research filing and F10 Q52-Q54 expected metrics + research signals."""

    def test_f9_canonical_docs_bucket_filings_exist_and_are_complete(self) -> None:
        """Verify all three Nov 7-9 research docs are filed under dated docs/<bucket>/research/2026-11-09/."""
        engine_doc = (
            REPO_ROOT
            / "docs"
            / "engine"
            / "research"
            / "2026-11-09"
            / "INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md"
        )
        data_sources_doc = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-09"
            / "RESEARCH-CONSOLIDATION-2026-11-07-to-09.md"
        )
        predictions_doc = (
            REPO_ROOT
            / "docs"
            / "predictions"
            / "research"
            / "2026-11-09"
            / "CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md"
        )
        founder_packet = (
            REPO_ROOT
            / "docs"
            / "predictions"
            / "research"
            / "2026-11-09"
            / "MNF-BUF-MIN-FOUNDER-COMMAND-AND-MONETIZATION-PACKET.md"
        )

        self.assertTrue(engine_doc.is_file(), f"Missing {engine_doc}")
        self.assertTrue(data_sources_doc.is_file(), f"Missing {data_sources_doc}")
        self.assertTrue(predictions_doc.is_file(), f"Missing {predictions_doc}")
        self.assertTrue(founder_packet.is_file(), f"Missing {founder_packet}")

        engine_txt = engine_doc.read_text(encoding="utf-8")
        self.assertGreater(len(engine_txt), 80000)
        self.assertIn("Q52", engine_txt)
        self.assertIn("Defensive field-zone split", engine_txt)
        self.assertIn("Q53", engine_txt)
        self.assertIn("QB efficiency split by opponent defensive tier", engine_txt)
        self.assertIn("Q54", engine_txt)
        self.assertIn("QB efficiency split before vs after first interception", engine_txt)

        ds_txt = data_sources_doc.read_text(encoding="utf-8")
        self.assertGreater(len(ds_txt), 85000)
        self.assertIn("LANE 1", ds_txt)
        self.assertIn("LANE 2", ds_txt)
        self.assertIn("LANE 3", ds_txt)
        self.assertIn("LANE 4", ds_txt)
        self.assertIn("1,068,463,692", ds_txt)

        pred_txt = predictions_doc.read_text(encoding="utf-8")
        self.assertIn("Joe Brady", pred_txt)
        self.assertIn("Brian Flores", pred_txt)
        self.assertIn("62.4%", pred_txt)
        self.assertIn("34.79", pred_txt)
        self.assertIn("95.5%", pred_txt)

        pkt_txt = founder_packet.read_text(encoding="utf-8")
        self.assertIn("Q52", pkt_txt)
        self.assertIn("Q53", pkt_txt)
        self.assertIn("Q54", pkt_txt)
        self.assertIn("Joe Brady +0.07", pkt_txt)
        self.assertIn("Brian Flores -0.11", pkt_txt)

    def test_f10_q52_defensive_field_zone_split_invariants(self) -> None:
        """Verify Q52 Python evaluator enforces zone boundary (20 vs 21), pick-six exclusion
        from redZoneTdRateAllowed, floors (30 RZ, 100 OF, 30 RZ EPA), and Seattle direction.
        """
        plays = []
        # SEA: 30 RZ plays at yardline_100=20 (epa=+0.45, 7 offensive TDs, 1 pick-six)
        for i in range(30):
            plays.append(
                {
                    "playId": f"sea-rz-{i}",
                    "week": 1,
                    "defteam": "SEA",
                    "posteam": "OPP",
                    "playType": "pass",
                    "yardline100": 20,
                    "down": 1,
                    "ydstogo": 10,
                    "yardsGained": 6 if i < 20 else 0,
                    "touchdown": 1 if i < 8 else 0,
                    "turnover": 1 if i == 7 else 0,  # i==7 is pick-six (must not count as TD allowed)
                    "epa": 0.45,
                }
            )
        # 100 Open-Field plays at yardline_100=21 (epa=-0.15)
        for i in range(100):
            plays.append(
                {
                    "playId": f"sea-of-{i}",
                    "week": 1,
                    "defteam": "SEA",
                    "posteam": "OPP",
                    "playType": "run",
                    "yardline100": 21,
                    "down": 1,
                    "ydstogo": 10,
                    "yardsGained": 5 if i < 35 else 1,
                    "touchdown": 0,
                    "turnover": 0,
                    "epa": -0.15,
                }
            )
        # Non-finite yardline play + Week 2 play (excluded when target_week=2)
        plays.append(
            {
                "playId": "nf-1",
                "week": 1,
                "defteam": "SEA",
                "posteam": "OPP",
                "playType": "pass",
                "yardline100": float("nan"),
                "down": 1,
                "ydstogo": 10,
                "yardsGained": 10,
                "touchdown": 0,
                "turnover": 0,
                "epa": 3.0,
            }
        )

        res = compute_q52_defensive_field_zone_split(plays, target_week=2, window="season-to-date")
        self.assertEqual(res["diagnostics"]["excludedNonFiniteYardlinePlays"], 1)
        self.assertEqual(len(res["defenses"]), 1)
        sea = res["defenses"][0]
        self.assertEqual(sea["redZone"]["plays"], 30)
        self.assertEqual(sea["openField"]["plays"], 100)
        self.assertEqual(sea["redZone"]["touchdownsAllowed"], 7)  # pick-six excluded
        self.assertAlmostEqual(sea["redZoneTdRateAllowed"], round(7 / 30, 4))
        self.assertGreater(sea["epaSplit"], 0.0)
        self.assertGreater(sea["successSplit"], 0.0)

    def test_f10_q53_point_in_time_qb_opponent_tier_split_invariants(self) -> None:
        """Verify Q53 Python evaluator enforces >=100 prior ratable dropbacks for defense rank,
        no lookahead, ordinal 1..10 TOP-10 vs 11+ REST, and n/(n+20) shrinkage.
        """
        plays = []
        # Seed 11 defenses in Week 1 with 100 dropbacks each; DEF_99 has only 99 -> unranked
        for d in range(1, 12):
            defteam = f"DEF_{d:02d}"
            for i in range(100):
                plays.append(
                    {
                        "playId": f"w1-{defteam}-{i}",
                        "week": 1,
                        "passerPlayerId": "00-SEED",
                        "posteam": "SEED",
                        "defteam": defteam,
                        "playType": "pass",
                        "qbSpike": 0,
                        "epa": -0.30 + d * 0.01,
                    }
                )
        for i in range(99):
            plays.append(
                {
                    "playId": f"w1-def99-{i}",
                    "week": 1,
                    "passerPlayerId": "00-SEED",
                    "posteam": "SEED",
                    "defteam": "DEF_99",
                    "playType": "pass",
                    "qbSpike": 0,
                    "epa": -0.99,
                }
            )

        # Week 2: Maye has 30 dropbacks vs DEF_01 (TOP-10) at -0.12 and 30 vs DEF_11 (REST) at +0.30
        for i in range(30):
            plays.append(
                {
                    "playId": f"w2-maye-t10-{i}",
                    "week": 2,
                    "passerPlayerId": "00-MAYE",
                    "posteam": "NE",
                    "defteam": "DEF_01",
                    "playType": "pass",
                    "qbSpike": 0,
                    "epa": -0.12,
                }
            )
            plays.append(
                {
                    "playId": f"w2-maye-rest-{i}",
                    "week": 2,
                    "passerPlayerId": "00-MAYE",
                    "posteam": "NE",
                    "defteam": "DEF_11",
                    "playType": "pass",
                    "qbSpike": 0,
                    "epa": 0.30,
                }
            )

        res = compute_q53_qb_opponent_tier_efficiency_split(plays, target_week=3)
        self.assertEqual(len(res["defenseRanksByWeek"][1]), 0)
        self.assertEqual(len(res["defenseRanksByWeek"][2]), 11)
        maye = next(q for q in res["qbs"] if q["passerPlayerId"] == "00-MAYE")
        self.assertLess(maye["sensitivityDelta"], 0.0)
        self.assertAlmostEqual(maye["rawSensitivityDelta"], -0.42, places=4)

    def test_f10_q54_qb_post_first_int_efficiency_split_invariants(self) -> None:
        """Verify Q54 Python evaluator excludes the boundary INT play and INT-less games,
        keeps 2nd+ INTs in the after arm, and enforces the 25-dropback aggregate floor.
        """
        plays = []
        # Game 1 (INT game): 25 before (+0.10), first INT (-4.0), 25 after (+0.26)
        for i in range(25):
            plays.append(
                {
                    "playId": f"g1-pre-{i}",
                    "gameId": "G1",
                    "numericPlayId": i + 1,
                    "week": 1,
                    "passerPlayerId": "00-ALLEN",
                    "posteam": "BUF",
                    "playType": "pass",
                    "qbSpike": 0,
                    "interception": 0,
                    "epa": 0.10,
                }
            )
        plays.append(
            {
                "playId": "g1-int",
                "gameId": "G1",
                "numericPlayId": 30,
                "week": 1,
                "passerPlayerId": "00-ALLEN",
                "posteam": "BUF",
                "playType": "pass",
                "qbSpike": 0,
                "interception": 1,
                "epa": -4.0,
            }
        )
        for i in range(25):
            plays.append(
                {
                    "playId": f"g1-post-{i}",
                    "gameId": "G1",
                    "numericPlayId": 31 + i,
                    "week": 1,
                    "passerPlayerId": "00-ALLEN",
                    "posteam": "BUF",
                    "playType": "pass",
                    "qbSpike": 0,
                    "interception": 0,
                    "epa": 0.26,
                }
            )
        # Game 2 (INT-less game): 30 plays at +0.90 -> must be excluded
        for i in range(30):
            plays.append(
                {
                    "playId": f"g2-clean-{i}",
                    "gameId": "G2",
                    "numericPlayId": i + 1,
                    "week": 2,
                    "passerPlayerId": "00-ALLEN",
                    "posteam": "BUF",
                    "playType": "pass",
                    "qbSpike": 0,
                    "interception": 0,
                    "epa": 0.90,
                }
            )

        res = compute_q54_qb_post_first_int_efficiency_split(plays, target_week=3)
        self.assertEqual(res["diagnostics"]["excludedFirstIntBoundaryPlays"], 1)
        self.assertEqual(res["diagnostics"]["excludedIntLessQbGames"], 1)
        self.assertEqual(res["diagnostics"]["excludedIntLessGameDropbacks"], 30)
        allen = res["qbs"][0]
        self.assertEqual(allen["beforeFirstIntArm"]["ratableDropbacks"], 25)
        self.assertEqual(allen["afterFirstIntArm"]["ratableDropbacks"], 25)
        self.assertEqual(allen["quadrant"], "bounce-back")

    def test_f10_compiled_signals_json_artifact_and_ts_modules_exist(self) -> None:
        """Verify data/metrics/intel_loop_q52_q54_and_nov7_9_research_signals_2026_11_09.json
        and the TypeScript Q52-Q54 modules exist and contain complete structured outputs.
        """
        payload = compile_intel_loop_and_nov7_9_research_signals(write_artifact=False)
        self.assertTrue(OUTPUT_JSON_PATH.is_file(), f"Missing {OUTPUT_JSON_PATH}")
        disk_payload = json.loads(OUTPUT_JSON_PATH.read_text(encoding="utf-8"))
        self.assertEqual(disk_payload["schema_version"], payload["schema_version"])

        evals = disk_payload["expected_metrics_evaluations"]
        q52_defs = {
            d["defteam"]: d
            for d in evals["Q52_defensive_field_zone_split"]["season_to_date"]["defenses"]
        }
        self.assertIn("SEA", q52_defs)
        self.assertIn("MIN", q52_defs)
        self.assertIn("BUF", q52_defs)
        self.assertGreater(q52_defs["SEA"]["epaSplit"], 0.0)
        self.assertLess(q52_defs["BUF"]["epaSplit"], 0.0)

        q53_qbs = {
            q["passerPlayerId"]: q
            for q in evals["Q53_qb_opponent_tier_efficiency_split"]["season_to_date"]["qbs"]
        }
        self.assertIn("00-0039851_DRAKE_MAYE", q53_qbs)
        self.assertIn("00-0034857_JOSH_ALLEN", q53_qbs)
        self.assertIn("00-0032950_CARSON_WENTZ", q53_qbs)
        self.assertLess(
            q53_qbs["00-0039851_DRAKE_MAYE"]["sensitivityDelta"],
            q53_qbs["00-0034857_JOSH_ALLEN"]["sensitivityDelta"],
        )

        q54_qbs = {
            q["passerPlayerId"]: q
            for q in evals["Q54_qb_post_first_int_efficiency_split"]["season_to_date"]["qbs"]
        }
        self.assertIn("00-0034857_JOSH_ALLEN", q54_qbs)
        self.assertIn("00-0032950_CARSON_WENTZ", q54_qbs)
        self.assertEqual(q54_qbs["00-0034857_JOSH_ALLEN"]["quadrant"], "bounce-back")
        self.assertEqual(q54_qbs["00-0032950_CARSON_WENTZ"]["quadrant"], "downward-spiral")
        # Goff and Williams had < 25 post-INT dropbacks -> afterFirstIntArm is None
        self.assertIsNone(q54_qbs["00-0033106_JARED_GOFF"]["afterFirstIntArm"])
        self.assertIsNone(q54_qbs["00-0039918_CALEB_WILLIAMS"]["afterFirstIntArm"])


if __name__ == "__main__":
    unittest.main()

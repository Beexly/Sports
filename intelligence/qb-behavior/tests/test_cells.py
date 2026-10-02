# PROVENANCE — qb-behavior / tests / test_cells.py
# Tests the c02 cell definitions (situational/cells.py): bucket boundaries,
# floor naming, trust-situation membership. Hermetic: no data, no network.
"""Cell-definition unit tests (pure python)."""
import os
import sys

import pytest

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(BUILD_ROOT, "qb-behavior", "src"))

from qb_behavior.situational.cells import (
    TRUST_SITUATIONS,
    downdist4,
    int_cell_from_play,
    int_cell_key,
    pressure_floor,
    qtr_group,
    script3,
    trust_situation,
    zone3,
)


class TestPressureFloor:
    def test_hit_or_sack_is_pressured(self):
        assert pressure_floor(1, 0) == 1
        assert pressure_floor(0, 1) == 1
        assert pressure_floor(1, 1) == 1

    def test_neither_is_clean(self):
        assert pressure_floor(0, 0) == 0

    def test_nulls_are_clean_not_crash(self):
        assert pressure_floor(None, None) == 0
        assert pressure_floor(None, 0) == 0


class TestBuckets:
    def test_qtr_group_pools_ot(self):
        assert qtr_group(1) == 1 and qtr_group(3) == 3
        assert qtr_group(4) == 4 and qtr_group(5) == 4 and qtr_group(None) == 4

    def test_script3(self):
        assert script3(-7) == 0 and script3(0) == 1 and script3(7) == 2
        assert script3(None) == 1

    def test_zone3_boundaries(self):
        assert zone3(80) == 0 and zone3(51) == 0
        assert zone3(50) == 1 and zone3(21) == 1
        assert zone3(20) == 2 and zone3(1) == 2

    def test_downdist4(self):
        assert downdist4(1, 10) == 0 and downdist4(2, 5) == 0
        assert downdist4(3, 2) == 1 and downdist4(4, 3) == 1
        assert downdist4(3, 5) == 2 and downdist4(3, 7) == 2
        assert downdist4(3, 8) == 3 and downdist4(4, 15) == 3

    def test_cell_key_format(self):
        assert int_cell_key(1, 4, 0, 2, 3) == "p1_q4_s0_z2_d3"

    def test_cell_from_play(self):
        play = {"qb_hit": 1, "sack": 0, "qtr": 4, "score_differential": -3,
                "yardline_100": 15, "down": 3, "ydstogo": 9}
        assert int_cell_from_play(play) == "p1_q4_s0_z2_d3"

    def test_cell_from_play_missing_keys_never_raises(self):
        assert int_cell_from_play({}) == "p0_q4_s1_z1_d0"


class TestTrustSituations:
    def test_all_memberships(self):
        assert set(TRUST_SITUATIONS) == {"all", "rz", "third", "twomin", "trailing", "press"}

    def test_multilabel(self):
        play = {"yardline_100": 10, "down": 3, "qtr": 4,
                "game_seconds_remaining": 60, "score_differential": -4,
                "qb_hit": 1, "sack": 0}
        hits = [s for s in TRUST_SITUATIONS if trust_situation(s, play)]
        assert set(hits) == {"all", "rz", "third", "twomin", "trailing", "press"}

    def test_twomin_boundary(self):
        assert trust_situation("twomin", {"qtr": 4, "game_seconds_remaining": 120})
        assert not trust_situation("twomin", {"qtr": 4, "game_seconds_remaining": 121})
        assert not trust_situation("twomin", {"qtr": 3, "game_seconds_remaining": 60})

    def test_unknown_situation_raises(self):
        with pytest.raises(ValueError):
            trust_situation("nope", {})

"""Identity tests for lingxi_eq_tempo_gaps."""
from __future__ import annotations

import unittest

from lingxi_eq_tempo_gaps import tempo_pace_lower_gap, tempo_pace_upper_gap


class TestTempoGaps(unittest.TestCase):
    def test_gaps(self) -> None:
        row = {"tempo__pace_p25": 20.0, "tempo__pace_med": 26.0, "tempo__pace_p75": 34.0}
        self.assertAlmostEqual(tempo_pace_upper_gap(row), 8.0)
        self.assertAlmostEqual(tempo_pace_lower_gap(row), 6.0)

    def test_missing(self) -> None:
        self.assertIsNone(tempo_pace_upper_gap({"tempo__pace_p75": 1.0}))
        self.assertIsNone(tempo_pace_lower_gap({}))


if __name__ == "__main__":
    unittest.main()
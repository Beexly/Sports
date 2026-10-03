"""Identity tests for lingxi_eq_sequencing_contrast."""
from __future__ import annotations

import unittest

from lingxi_eq_sequencing_contrast import sequencing_2_contrast, sequencing_3_contrast


class TestSequencingContrast(unittest.TestCase):
    def test_lag2(self) -> None:
        row = {
            "sequencing__2__p_pass_after_fail_run": 0.70,
            "sequencing__2__p_pass_after_succ_run": 0.40,
        }
        self.assertAlmostEqual(sequencing_2_contrast(row), 0.30)

    def test_lag3(self) -> None:
        row = {
            "sequencing__3__p_pass_after_fail_run": 0.55,
            "sequencing__3__p_pass_after_succ_run": 0.55,
        }
        self.assertAlmostEqual(sequencing_3_contrast(row), 0.0)

    def test_null(self) -> None:
        self.assertIsNone(sequencing_2_contrast({"sequencing__2__p_pass_after_fail_run": 0.5}))
        self.assertIsNone(sequencing_3_contrast({}))


if __name__ == "__main__":
    unittest.main()
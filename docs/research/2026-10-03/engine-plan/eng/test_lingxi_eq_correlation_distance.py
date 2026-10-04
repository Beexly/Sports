"""Kill test for lingxi_eq_correlation_distance.

Fails if Pearson r, if cosine distance, or if angular distance.
"""
from __future__ import annotations

import unittest

import lingxi_eq_correlation_distance as m


class TestCorrelationDistance(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("correlation_distance",))

    def test_printed(self) -> None:
        # perfect positive corr → d=0; r would be 1
        self.assertAlmostEqual(m.correlation_distance([1.0, 2.0, 3.0], [2.0, 4.0, 6.0]), 0.0)
        # perfect negative → d=2; r=-1
        got = m.correlation_distance([1.0, 2.0, 3.0], [6.0, 4.0, 2.0])
        self.assertAlmostEqual(got, 2.0)
        self.assertNotAlmostEqual(got, -1.0)  # not Pearson r
        # orthogonal-ish after center: x=[0,1,-1], y=[1,0,0] wait
        # cosine distance on raw [1,0]/[0,1] = 1; correlation needs n>=2 with variance

    def test_identical_zero(self) -> None:
        self.assertAlmostEqual(m.correlation_distance([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]), 0.0)

    def test_uncorrelated(self) -> None:
        # x = [-1,0,1], y = [1,0,-1] wait that's negative corr
        # x=[-1,0,1], y=[1,-2,1]: mean0; dot=-1+0+1=0 → d=1
        got = m.correlation_distance([-1.0, 0.0, 1.0], [1.0, -2.0, 1.0])
        self.assertAlmostEqual(got, 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.correlation_distance(None, [1.0, 2.0]))
        self.assertIsNone(m.correlation_distance([1.0], [1.0]))
        self.assertIsNone(m.correlation_distance([1.0, 1.0], [2.0, 3.0]))  # zero var x
        self.assertIsNone(m.correlation_distance([1.0, 2.0], [1.0, 2.0, 3.0]))


if __name__ == "__main__":
    unittest.main()
"""Off-by-one tests for the inflated empirical quantile on printed pages 5 and 18."""
import math
import unittest

from conformalized_quantile_interval import (
    conformalized_quantile_interval,
    conformity_quantile,
)


class CqrIntervalTests(unittest.TestCase):
    def test_inflated_index_not_the_uninflated_one(self):
        # n=4, alpha=0.3. ceil((1-0.3)*(4+1)) = ceil(3.5) = 4.
        # ceil(n*(1-alpha)) = ceil(2.8) = 3 would return 30.
        self.assertEqual(conformity_quantile([10, 40, 20, 30], 0.3), 40.0)

    def test_index_past_n_is_not_clamped(self):
        # n=4, alpha=0.1. ceil(0.9*5) = 5, which is not in 1..4.
        # Clamping to n would return 40.
        self.assertIsNone(conformity_quantile([10, 20, 30, 40], 0.1))

    def test_interval_uses_that_correction(self):
        # Q is the 4th score, 3. Endpoints are 5-3 and 7+3.
        # The 3rd score is 2 and would give (3, 9).
        interval = conformalized_quantile_interval(
            5.0, 7.0, 0.3, conformity_scores=[-1.0, 0.5, 2.0, 3.0]
        )
        self.assertEqual(interval, (2.0, 10.0))

    def test_caller_supplied_correction(self):
        self.assertEqual(
            conformalized_quantile_interval(5.0, 7.0, 0.3, correction=1.5),
            (3.5, 8.5),
        )

    def test_negative_conformity_score_allowed(self):
        # n=1, alpha=0.5. ceil(0.5*2)=1. Q=-2. Interval [1-(-2), 4+(-2)].
        self.assertEqual(
            conformalized_quantile_interval(
                1.0, 4.0, 0.5, conformity_scores=[-2.0]
            ),
            (3.0, 2.0),
        )

    def test_empty_and_bounds(self):
        self.assertIsNone(conformity_quantile([], 0.2))
        self.assertIsNone(conformity_quantile([1.0], 0.0))
        self.assertIsNone(conformity_quantile([1.0], 1.0))
        self.assertIsNone(
            conformalized_quantile_interval(1.0, 2.0, 0.2, conformity_scores=[])
        )

    def test_nonfinite(self):
        self.assertIsNone(conformity_quantile([1.0, math.nan], 0.2))
        self.assertIsNone(conformity_quantile([1.0, math.inf], 0.2))
        self.assertIsNone(
            conformalized_quantile_interval(
                math.nan, 2.0, 0.2, conformity_scores=[1.0]
            )
        )
        self.assertIsNone(
            conformalized_quantile_interval(1.0, 2.0, 0.2, correction=math.inf)
        )

    def test_both_or_neither_correction_input(self):
        self.assertIsNone(
            conformalized_quantile_interval(
                1.0, 2.0, 0.2, conformity_scores=[1.0], correction=1.0
            )
        )
        self.assertIsNone(conformalized_quantile_interval(1.0, 2.0, 0.2))


if __name__ == "__main__":
    unittest.main()

"""Off-by-one tests for the printed page-385 inclusion rule."""
import math
import unittest

from conformal_shafer_vovk import (
    empirical_nonconformity_quantile,
    prediction_set,
)


class ShaferVovkTests(unittest.TestCase):
    def test_quantile_index_not_one_high(self):
        # n=4, epsilon=0.25. p for 4 is 1/4, which is not > 0.25.
        # p for 3 is 2/4 > 0.25. Index k+1 would return 4.
        self.assertEqual(
            empirical_nonconformity_quantile([1, 2, 3, 4], 0.25), 3.0
        )

    def test_quantile_index_not_one_low(self):
        # n=5, epsilon=0.4. p for 4 is 2/5, not > 0.4. p for 3 is 3/5.
        # Index k-1 would return 2.
        self.assertEqual(
            empirical_nonconformity_quantile([5, 1, 4, 2, 3], 0.4), 3.0
        )

    def test_ties_use_count_not_position(self):
        # Three copies of 5. p for 5 is 3/4 > 0.4, so the threshold is 5,
        # not the first copy's position.
        self.assertEqual(
            empirical_nonconformity_quantile([1, 5, 5, 5], 0.4), 5.0
        )

    def test_empty_scores(self):
        self.assertIsNone(empirical_nonconformity_quantile([], 0.25))
        self.assertIsNone(empirical_nonconformity_quantile(None, 0.25))

    def test_epsilon_outside_unit_interval(self):
        self.assertIsNone(empirical_nonconformity_quantile([1.0, 2.0], 0.0))
        self.assertIsNone(empirical_nonconformity_quantile([1.0, 2.0], 1.0))
        self.assertIsNone(empirical_nonconformity_quantile([1.0, 2.0], -0.1))
        self.assertIsNone(empirical_nonconformity_quantile([1.0, 2.0], 1.1))

    def test_nonfinite_score(self):
        self.assertIsNone(
            empirical_nonconformity_quantile([1.0, math.nan], 0.25)
        )
        self.assertIsNone(
            empirical_nonconformity_quantile([1.0, math.inf], 0.25)
        )
        self.assertIsNone(empirical_nonconformity_quantile([1.0, 2.0], math.nan))

    def test_prediction_set_includes_candidate_in_the_bag(self):
        # Old scores 1,2,3. Candidate 4. Bag size 4, p=1/4=0.25.
        # Included at 0.2, excluded at 0.25. Dropping the candidate from
        # the count would give p=0 and exclude it at 0.2.
        scores = [1.0, 2.0, 3.0]
        self.assertEqual(
            prediction_set(scores, [("a", 4.0), ("b", 3.0)], 0.2),
            ["a", "b"],
        )
        self.assertEqual(
            prediction_set(scores, [("a", 4.0), ("b", 3.0)], 0.25),
            ["b"],
        )

    def test_prediction_set_bad_input(self):
        self.assertIsNone(prediction_set([], [("a", 1.0)], 0.2))
        self.assertIsNone(prediction_set([1.0], [("a", math.nan)], 0.2))
        self.assertIsNone(prediction_set([1.0], [("a", 1.0)], 0.0))
        self.assertEqual(prediction_set([1.0, 2.0], [], 0.2), [])


if __name__ == "__main__":
    unittest.main()

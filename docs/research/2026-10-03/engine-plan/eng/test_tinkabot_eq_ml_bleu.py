"""Offline identity tests for tinkabot_eq_ml_bleu. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_bleu as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("bleu_score",))
        self.assertTrue(callable(m.bleu_score))

    def test_no_forbidden_copies(self):
        for name in (
            "matthews_corrcoef",
            "jensen_shannon_divergence",
            "margin_ranking_loss",
            "dice_coefficient",
            "f_beta_score",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestBleu(unittest.TestCase):
    def test_stated_form(self):
        # c == r, p=1 → BP=1, BLEU=1
        self.assertAlmostEqual(m.bleu_score([1.0], [1.0], 10.0, 10.0), 1.0)
        # c == r, p=0.5, w=1 → exp(log 0.5) = 0.5
        self.assertAlmostEqual(m.bleu_score([0.5], [1.0], 10.0, 10.0), 0.5)
        # c < r, perfect precision → BP = e^(1-r/c)
        self.assertAlmostEqual(
            m.bleu_score([1.0], [1.0], 5.0, 10.0), math.exp(-1.0)
        )
        # c > r → no brevity penalty (printed BP = 1)
        self.assertAlmostEqual(m.bleu_score([0.25], [1.0], 8.0, 5.0), 0.25)
        # geometric mean of two precisions, c == r
        # exp(0.5 ln 0.5 + 0.5 ln 0.25) = sqrt(0.125)
        self.assertAlmostEqual(
            m.bleu_score([0.5, 0.25], [0.5, 0.5], 12.0, 12.0),
            math.sqrt(0.125),
        )
        # log form on the same page: min(1-r/c, 0) + sum w ln p
        got = m.bleu_score([0.5], [1.0], 4.0, 8.0)
        log_bleu = min(1.0 - (8.0 / 4.0), 0.0) + math.log(0.5)
        self.assertAlmostEqual(got, math.exp(log_bleu))

    def test_null_missing(self):
        self.assertIsNone(m.bleu_score(None, [1.0], 1.0, 1.0))
        self.assertIsNone(m.bleu_score([1.0], None, 1.0, 1.0))
        self.assertIsNone(m.bleu_score([1.0], [1.0], None, 1.0))
        self.assertIsNone(m.bleu_score([1.0], [1.0], 1.0, None))
        self.assertIsNone(m.bleu_score([None], [1.0], 1.0, 1.0))

    def test_null_bad(self):
        self.assertIsNone(m.bleu_score([], [], 1.0, 1.0))
        self.assertIsNone(m.bleu_score([1.0], [1.0, 0.0], 1.0, 1.0))
        self.assertIsNone(m.bleu_score([0.0], [1.0], 1.0, 1.0))
        self.assertIsNone(m.bleu_score([1.1], [1.0], 1.0, 1.0))
        self.assertIsNone(m.bleu_score([-0.1], [1.0], 1.0, 1.0))
        self.assertIsNone(m.bleu_score([1.0], [0.0], 1.0, 1.0))
        self.assertIsNone(m.bleu_score([1.0], [-0.2], 1.0, 1.0))
        self.assertIsNone(m.bleu_score([0.5, 0.5], [0.4, 0.4], 1.0, 1.0))
        self.assertIsNone(m.bleu_score([1.0], [1.0], 0.0, 1.0))
        self.assertIsNone(m.bleu_score([1.0], [1.0], 1.0, -1.0))
        self.assertIsNone(m.bleu_score("1", "1", 1.0, 1.0))


if __name__ == "__main__":
    unittest.main()

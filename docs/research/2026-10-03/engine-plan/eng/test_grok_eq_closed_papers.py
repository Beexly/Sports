import math
import unittest
from grok_eq_closed_papers import (
    batch_norm,
    distill_logit_grad,
    residual_block,
    simple_noise_loss,
    temperature_softmax,
)


class ClosedPaperTest(unittest.TestCase):
    def test_identity_shortcut(self):
        self.assertEqual(residual_block(2.0, 3.0), 5.0)

    def test_projection_shortcut(self):
        self.assertEqual(residual_block(2.0, 3.0, 2.0), 8.0)

    def test_residual_rejects_nan(self):
        self.assertIsNone(residual_block(math.nan, 1.0))

    def test_batch_norm_scale_shift(self):
        self.assertAlmostEqual(batch_norm(3.0, 1.0, 3.0, 1.0, 2.0, 0.5), 2.5)

    def test_batch_norm_rejects_bad_var(self):
        self.assertIsNone(batch_norm(1.0, 0.0, -1.0, 1e-5, 1.0, 0.0))

    def test_temperature_softmax_sums_to_one(self):
        p = temperature_softmax([0.0, 0.0], 2.0)
        self.assertAlmostEqual(sum(p), 1.0)
        self.assertAlmostEqual(p[0], 0.5)

    def test_higher_t_flattens(self):
        sharp = temperature_softmax([2.0, 0.0], 0.5)
        flat = temperature_softmax([2.0, 0.0], 4.0)
        self.assertGreater(sharp[0], flat[0])

    def test_distill_grad(self):
        self.assertAlmostEqual(distill_logit_grad(0.8, 0.4, 2.0), 0.2)
        self.assertIsNone(distill_logit_grad(1.2, 0.4, 2.0))

    def test_simple_noise_loss(self):
        self.assertAlmostEqual(simple_noise_loss([1.0, 0.0], [0.0, 0.0]), 0.5)
        self.assertIsNone(simple_noise_loss([1.0], [1.0, 0.0]))


if __name__ == "__main__":
    unittest.main()

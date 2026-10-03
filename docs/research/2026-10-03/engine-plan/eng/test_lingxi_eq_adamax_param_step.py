"""Kill test for lingxi_eq_adamax_param_step.

Fails if replaced by Adam adam_step α·m̂/(√v̂+ε), by α·m/u without
bias-corrected LR, or by infinity-norm update alone.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_adamax_param_step as m


class TestAdamaxParamStep(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("adamax_param_step",))

    def test_printed_bias_corrected_lr(self) -> None:
        # θ=1, α=0.002, β1=0.9, t=1, m=0.5, u=2
        # lr = 0.002/(1-0.9)=0.02; Δ=0.02*0.5/2=0.005; θ'=0.995
        got = m.adamax_param_step(1.0, 0.002, 0.9, 1, 0.5, 2.0)
        self.assertAlmostEqual(got, 1.0 - (0.002 / 0.1) * 0.5 / 2.0)
        # Kill: plain α·m/u (no 1/(1−β₁^t))
        self.assertNotAlmostEqual(got, 1.0 - 0.002 * 0.5 / 2.0)
        # Kill: Adam-style α·m/(√v+ε) with v=u^2 decoy
        adamish = 1.0 - 0.002 * 0.5 / (math.sqrt(4.0) + 1e-8)
        self.assertNotAlmostEqual(got, adamish)
        # Kill: returning u alone
        self.assertNotAlmostEqual(got, 2.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.adamax_param_step(None, 0.002, 0.9, 1, 0.5, 2.0))
        self.assertIsNone(m.adamax_param_step(1.0, None, 0.9, 1, 0.5, 2.0))
        self.assertIsNone(m.adamax_param_step(1.0, 0.002, None, 1, 0.5, 2.0))
        self.assertIsNone(m.adamax_param_step(1.0, 0.002, 0.9, None, 0.5, 2.0))
        self.assertIsNone(m.adamax_param_step(1.0, 0.002, 0.9, 1, None, 2.0))
        self.assertIsNone(m.adamax_param_step(1.0, 0.002, 0.9, 1, 0.5, None))
        self.assertIsNone(m.adamax_param_step(1.0, 0.0, 0.9, 1, 0.5, 2.0))
        self.assertIsNone(m.adamax_param_step(1.0, 0.002, 1.0, 1, 0.5, 2.0))
        self.assertIsNone(m.adamax_param_step(1.0, 0.002, 0.9, 0, 0.5, 2.0))
        self.assertIsNone(m.adamax_param_step(1.0, 0.002, 0.9, 1, 0.5, 0.0))
        self.assertIsNone(m.adamax_param_step(1.0, 0.002, 0.9, 1.5, 0.5, 2.0))


if __name__ == "__main__":
    unittest.main()
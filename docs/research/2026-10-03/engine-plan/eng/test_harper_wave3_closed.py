"""Fail-closed tests for harper_wave3_closed. Run count is the close."""
import math
import unittest

from harper_wave3_closed import (
    accuracy,
    bradley_terry,
    ddpm_squared_error,
    distillation_soft_targets,
    dpo_loss,
    event_context,
    kalman_state_update,
    lora_forward,
    mechanical_power,
    murphy_identity,
    pairrank_step,
    platt_scaling,
    ppo_clip,
    prospect_value,
    timesoccer_token_nll,
    vae_bound,
)


class Wave3ClosedTests(unittest.TestCase):
    def test_distill_sums_to_one(self):
        q = distillation_soft_targets([0.0, 0.0], 2.0)
        self.assertIsNotNone(q)
        self.assertAlmostEqual(sum(q), 1.0)
        self.assertAlmostEqual(q[0], 0.5)

    def test_distill_zero_temperature(self):
        self.assertIsNone(distillation_soft_targets([1.0], 0.0))

    def test_distill_nonfinite(self):
        self.assertIsNone(distillation_soft_targets([math.inf], 1.0))

    def test_ddpm_zero_and_unit(self):
        self.assertEqual(ddpm_squared_error([1.0, 2.0], [1.0, 2.0]), 0.0)
        self.assertEqual(ddpm_squared_error([0.0], [1.0]), 1.0)

    def test_ddpm_nonfinite(self):
        self.assertIsNone(ddpm_squared_error([math.nan], [0.0]))

    def test_platt_center(self):
        self.assertAlmostEqual(platt_scaling(0.0, 1.0, 0.0), 0.5)

    def test_platt_nonfinite(self):
        self.assertIsNone(platt_scaling(math.inf, 1.0, 0.0))

    def test_murphy_identity(self):
        self.assertAlmostEqual(murphy_identity(0.1, 0.2, 0.3), 0.2)

    def test_murphy_negative_rel(self):
        self.assertIsNone(murphy_identity(-0.1, 0.2, 0.3))

    def test_vae_bound(self):
        self.assertAlmostEqual(vae_bound(-1.0, 0.2), -1.2)

    def test_vae_kill(self):
        self.assertIsNone(vae_bound(-1.0, 0.2, marginal=-1.3))

    def test_bradley_terry(self):
        self.assertAlmostEqual(bradley_terry(1.0, 3.0), 0.25)
        self.assertIsNone(bradley_terry(0.0, 1.0))
        self.assertAlmostEqual(bradley_terry(1.0, 3.0) + bradley_terry(3.0, 1.0), 1.0)

    def test_prospect(self):
        self.assertAlmostEqual(prospect_value(4.0, 0.5, 0.5, 2.25), 2.0)
        self.assertAlmostEqual(prospect_value(-2.0, 1.0, 1.0, 2.25), -4.5)
        self.assertIsNone(prospect_value(4.0, 1.5, 0.5, 2.25))

    def test_dpo(self):
        self.assertAlmostEqual(dpo_loss(0.0, 0.0, 1.0), math.log(2))
        self.assertIsNone(dpo_loss(1.0, 0.0, 0.0))

    def test_ppo(self):
        self.assertAlmostEqual(ppo_clip(1.1, 2.0, 0.2), 2.2)
        self.assertAlmostEqual(ppo_clip(1.5, 2.0, 0.2), 2.4)
        self.assertIsNone(ppo_clip(math.nan, 1.0, 0.2))

    def test_lora(self):
        self.assertAlmostEqual(lora_forward(3.0, 0.5), 3.5)
        self.assertAlmostEqual(lora_forward(1.0, 2.0, alpha=4.0, r=2.0), 5.0)

    def test_kalman(self):
        self.assertAlmostEqual(kalman_state_update(1.5, -0.25), 1.25)
        self.assertIsNone(kalman_state_update(math.inf, 1.0))

    def test_timesoccer(self):
        self.assertAlmostEqual(
            timesoccer_token_nll([-math.log(2), -math.log(2)]), 2 * math.log(2)
        )
        self.assertIsNone(timesoccer_token_nll([]))
        self.assertIsNone(timesoccer_token_nll([0.1]))
        self.assertIsNone(timesoccer_token_nll([math.nan]))

    def test_note_1593(self):
        self.assertEqual(event_context(["a", "b", "c"], 2), ["c", "b"])
        self.assertIsNone(event_context(["a"], 2))

    def test_note_1594(self):
        self.assertAlmostEqual(accuracy(3, 4), 0.75)
        self.assertIsNone(accuracy(1, 0))

    def test_note_1595(self):
        self.assertAlmostEqual(pairrank_step(0.4, 0.8, 0.5), 0.6)

    def test_mechanical_power_nonfinite(self):
        self.assertAlmostEqual(mechanical_power(10.0, 2.0), 5.0)
        self.assertIsNone(mechanical_power(math.inf, 1.0))
        self.assertIsNone(mechanical_power(1.0, math.nan))
        self.assertIsNone(mechanical_power(1.0, 0.0))


if __name__ == "__main__":
    unittest.main()

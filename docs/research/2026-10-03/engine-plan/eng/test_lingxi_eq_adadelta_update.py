"""Kill test for lingxi_eq_adadelta_update.

Fails if plain −ηg, −g/RMS[g] (RMSProp step without η), or
+ (RMS[Δx]/RMS[g]) g (sign flip) is returned.
"""
from __future__ import annotations

import unittest

import lingxi_eq_adadelta_update as m


class TestAdadeltaUpdate(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("adadelta_update",))

    def test_printed_update(self) -> None:
        # RMS[Δx]=0.4, RMS[g]=2.0, g=1.0 → −(0.4/2.0)*1 = −0.2
        got = m.adadelta_update(0.4, 2.0, 1.0)
        self.assertAlmostEqual(got, -0.2)
        self.assertNotAlmostEqual(got, -0.01 * 1.0)  # not −ηg
        self.assertNotAlmostEqual(got, -1.0 / 2.0)  # not −g/RMS[g]
        self.assertNotAlmostEqual(got, 0.2)  # not sign-flipped

    def test_nulls(self) -> None:
        self.assertIsNone(m.adadelta_update(None, 2.0, 1.0))
        self.assertIsNone(m.adadelta_update(0.4, 0.0, 1.0))
        self.assertIsNone(m.adadelta_update(0.4, -1.0, 1.0))
        self.assertIsNone(m.adadelta_update(0.4, 2.0, float("nan")))


if __name__ == "__main__":
    unittest.main()
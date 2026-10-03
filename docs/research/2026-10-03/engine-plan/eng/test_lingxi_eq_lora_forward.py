"""Kill test for lingxi_eq_lora_forward. Fails if either product term is dropped."""
from __future__ import annotations

import unittest

import lingxi_eq_lora_forward as m


class TestLoraForward(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("lora_forward",))

    def test_frozen_term_when_adapter_is_zero(self) -> None:
        got = m.lora_forward(2.0, 3.0, 0.0, 5.0)
        self.assertEqual(got, 6.0)
        self.assertNotEqual(got, 0.0)

    def test_adapter_term_when_frozen_is_zero(self) -> None:
        got = m.lora_forward(0.0, 4.0, 2.0, 3.0)
        self.assertEqual(got, 24.0)
        self.assertNotEqual(got, 0.0)
        self.assertNotEqual(got, 4.0)

    def test_both_terms(self) -> None:
        self.assertEqual(m.lora_forward(1.0, 2.0, 1.0, 1.0), 4.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.lora_forward(None, 1.0, 1.0, 1.0))
        self.assertIsNone(m.lora_forward(1.0, None, 1.0, 1.0))
        self.assertIsNone(m.lora_forward(1.0, 1.0, None, 1.0))
        self.assertIsNone(m.lora_forward(1.0, 1.0, 1.0, None))
        self.assertIsNone(m.lora_forward(float("nan"), 1.0, 1.0, 1.0))


if __name__ == "__main__":
    unittest.main()
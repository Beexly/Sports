"""Kill test for lingxi_eq_de_broglie. Fails if h and p are multiplied."""
from __future__ import annotations

import unittest

import lingxi_eq_de_broglie as m


class TestDeBroglie(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("de_broglie_wavelength",))

    def test_ratio_not_product(self) -> None:
        got = m.de_broglie_wavelength(2.0, 4.0)
        self.assertEqual(got, 0.5)
        self.assertNotEqual(got, 8.0)

    def test_scales(self) -> None:
        self.assertEqual(m.de_broglie_wavelength(6.0, 2.0), 3.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.de_broglie_wavelength(None, 1.0))
        self.assertIsNone(m.de_broglie_wavelength(1.0, None))
        self.assertIsNone(m.de_broglie_wavelength(1.0, 0.0))
        self.assertIsNone(m.de_broglie_wavelength(0.0, 1.0))
        self.assertIsNone(m.de_broglie_wavelength(-1.0, 1.0))
        self.assertIsNone(m.de_broglie_wavelength(1.0, -1.0))


if __name__ == "__main__":
    unittest.main()
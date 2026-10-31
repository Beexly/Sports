from __future__ import annotations

import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from reasoning.interfaces import DataContext
from context.signal_pack_wire import load_signal_pack, apply_signal_pack

class TestSignalPackWiring(unittest.TestCase):
    def test_signal_pack_wiring_success(self):
        # We explicitly trace back to computed values from the real data files.
        ctx = DataContext()
        apply_signal_pack(ctx)

        # RZ xTD share (ATL RB share should be roughly 0.367 based on outputs)
        self.assertIn("matchups.ATL.rz_xtd_share_RB", ctx.observations)
        self.assertAlmostEqual(ctx.observations["matchups.ATL.rz_xtd_share_RB"], 0.367, places=3)

        # Missed tackles (DET should be 12.0)
        self.assertIn("matchups.DET.missed_tackles", ctx.observations)
        self.assertEqual(ctx.observations.get("matchups.DET.missed_tackles"), 12.0)

        # QB Throwaway
        self.assertIn("matchups.Bo Nix.throwaway_rate", ctx.observations)
        self.assertAlmostEqual(ctx.observations["matchups.Bo Nix.throwaway_rate"], 0.0969, places=4)

        # Quadrant (BUF is Q1)
        self.assertEqual(ctx.profiles.get("matchups.BUF.big_play_quadrant"), "Q1: efficient + explosive")

        # Check that provenance stamps exist in profiles
        self.assertIn("matchups.rz_xtd_share.provenance", ctx.profiles)
        self.assertIn("01_red_zone", ctx.profiles["matchups.rz_xtd_share.provenance"])

    @mock.patch("context.signal_pack_wire.SIGNAL_PACK_SRC", new="/nonexistent_path_xyz")
    def test_signal_pack_wiring_gap(self):
        # By mocking SIGNAL_PACK_SRC, it will fail to import the modules
        # which will correctly raise a DataGapError
        from integration.providers import DataGapError

        ctx = DataContext()
        with self.assertRaises(DataGapError) as cm:
            apply_signal_pack(ctx)

        self.assertEqual(cm.exception.track, "signal_pack")

        # Verify no signal pack data was leaked into observations
        for k in ctx.observations:
            self.assertFalse(k.startswith("matchups.") and "rz_xtd_share" in k)

if __name__ == "__main__":
    unittest.main()

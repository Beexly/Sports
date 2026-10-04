"""
test_gsis_inactive_gate.py
==========================
Unit tests for Python GSIS Inactive Gate.
Verifies alias resolution, suffix immunity (Marvin Harrison vs Jr), and fail-closed behavior.
"""

import unittest
from intelligence.roster.gsis_inactive_gate import (
    PlayerIdentity,
    resolve_gsis_id,
    evaluate_inactive_gate
)


class TestGsisInactiveGate(unittest.TestCase):

    def setUp(self):
        self.inactive_feed = {"00-0034844"} # Saquon Barkley inactive

    def test_barkley_alias_resolution(self):
        """Verifies Barkley, Saquon and S. Barkley resolve to 00-0034844 and are blocked."""
        p1 = PlayerIdentity(player_id="p1", name="Saquon Barkley", team="PHI")
        p2 = PlayerIdentity(player_id="p2", name="Barkley, Saquon", team="PHI")
        p3 = PlayerIdentity(player_id="p3", name="S. Barkley", team="PHI")

        self.assertEqual(resolve_gsis_id(p1), "00-0034844")
        self.assertEqual(resolve_gsis_id(p2), "00-0034844")
        self.assertEqual(resolve_gsis_id(p3), "00-0034844")

        self.assertFalse(evaluate_inactive_gate(p1, self.inactive_feed).is_eligible)
        self.assertFalse(evaluate_inactive_gate(p2, self.inactive_feed).is_eligible)
        self.assertFalse(evaluate_inactive_gate(p3, self.inactive_feed).is_eligible)

    def test_suffix_collision_immunity(self):
        """Verifies Marvin Harrison Jr does not collide with Senior."""
        mh_jr = PlayerIdentity(player_id="mhj", name="Marvin Harrison Jr.", team="ARI")
        mh_sr = PlayerIdentity(player_id="mhsr", name="Marvin Harrison", team="IND")

        gsis_jr = resolve_gsis_id(mh_jr)
        gsis_sr = resolve_gsis_id(mh_sr)

        self.assertEqual(gsis_jr, "00-0039912")
        self.assertEqual(gsis_sr, "00-0007137")
        self.assertNotEqual(gsis_jr, gsis_sr)

        # Inactivate Senior: Junior must remain ACTIVE
        res = evaluate_inactive_gate(mh_jr, {"00-0007137"})
        self.assertTrue(res.is_eligible)
        self.assertEqual(res.status, "ACTIVE")

    def test_unresolved_id_fails_closed(self):
        """Unknown or unresolvable ID fails closed to INACTIVE."""
        phantom = PlayerIdentity(player_id="phantom_1", name="Phantom Nonexistent", team="FA")
        res = evaluate_inactive_gate(phantom, self.inactive_feed)
        self.assertFalse(res.is_eligible)
        self.assertEqual(res.status, "UNRESOLVED_ID_FAIL_CLOSED")


if __name__ == "__main__":
    unittest.main()

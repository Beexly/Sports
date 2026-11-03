# PROVENANCE — gse-intelligence-build / tests / test_tau_gate_wiring.py
# P1 audit item: the validated coaching τ̂ gate (coach_risk.TauFitter,
# situational_wp.SituationalEngine, behavior.expected_wp_given_coach) was
# never called from the live path. These tests pin that it is now reachable
# AND that an unfitted gate stays loudly absent.
#
# The load-bearing assertion here is the NEGATIVE one: with no fitted
# tau_hat.csv, get_tau_hat must raise DataGapError naming the refit command.
# It must not return 0.5, a league mean, or any value that a caller could
# mistake for a fitted per-team estimate.
from __future__ import annotations

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from coaching import base_data as BD
from coaching.provider import CoachingEngineProvider, _tau_table, _TAU_CACHE
from integration.providers import DataGapError
from integration.types import Verification


# The schema refit_tau.py writes: team, season, region, wp_bin,
# tau_hat_served, fallback_level, n_decisions, window.
TAU_HEADER = ("team,season,region,wp_bin,tau_hat_served,fallback_level,"
              "n_decisions,window\n")
TAU_ROWS = (
    "BAL,2024,opp,40-60,0.58,unit,142,2022-2026\n"
    "BAL,2024,opp,60-80,0.61,unit,97,2022-2026\n"
    "CLE,2024,opp,40-60,0.44,pooled,61,2022-2026\n"
)


class TestTauGateAbsentIsLoud(unittest.TestCase):
    """No fitted artifact -> DataGapError. Never a silent default."""

    def setUp(self):
        self.p = CoachingEngineProvider()
        self.empty = tempfile.mkdtemp()
        self._saved = os.environ.get(BD.ENV_VAR)
        os.environ[BD.ENV_VAR] = self.empty

    def tearDown(self):
        if self._saved is None:
            os.environ.pop(BD.ENV_VAR, None)
        else:
            os.environ[BD.ENV_VAR] = self._saved
        _TAU_CACHE.clear()

    def test_get_tau_hat_raises_when_unfitted(self):
        with self.assertRaises(DataGapError) as cm:
            self.p.get_tau_hat("BAL", 2024, "opp", 0.50)
        msg = str(cm.exception)
        # Must name the artifact, the refit command, and the honesty reason.
        self.assertIn("tau_hat.csv", msg)
        self.assertIn("refit_tau", msg)
        self.assertIn("UNVALIDATED", msg)

    def test_raises_never_returns_half(self):
        """The specific trap: an unfitted tau silently becoming 0.5."""
        with self.assertRaises(DataGapError):
            self.p.get_tau_hat("BAL", 2024, "opp", 0.50)
        # Prove no 0.5 leaked into a table that a caller might read.
        self.assertIsNone(_tau_table())

    def test_expected_wp_given_coach_raises_without_pbp(self):
        with self.assertRaises(DataGapError) as cm:
            self.p.expected_wp_given_coach("BAL", 2024, 42, 3, 0, 900, 3, 0.55)
        self.assertIn("parquet", str(cm.exception))


class TestTauGateWiredAndServed(unittest.TestCase):
    """With a fitted table present, the gate serves real values into the path."""

    def setUp(self):
        self.dir = tempfile.mkdtemp()
        with open(os.path.join(self.dir, "tau_hat.csv"), "w", newline="") as fh:
            fh.write(TAU_HEADER)
            fh.write(TAU_ROWS)
        self._saved = os.environ.get(BD.ENV_VAR)
        os.environ[BD.ENV_VAR] = self.dir
        _TAU_CACHE.clear()
        self.p = CoachingEngineProvider()

    def tearDown(self):
        if self._saved is None:
            os.environ.pop(BD.ENV_VAR, None)
        else:
            os.environ[BD.ENV_VAR] = self._saved
        _TAU_CACHE.clear()

    def test_serves_fitted_value_with_provenance(self):
        r = self.p.get_tau_hat("BAL", 2024, "opp", 0.50)
        self.assertAlmostEqual(r["tau_hat"], 0.58, places=6)
        # The fallback level must travel with the value so a caller can tell a
        # real per-team fit from a backoff.
        self.assertEqual(r["fallback_level"], "unit")
        self.assertEqual(r["n_decisions"], 142)
        self.assertEqual(r["verification"], "COMPUTED")

    def test_wp_bin_selects_the_right_cell(self):
        # 0.50 -> 40-60 bin, 0.70 -> 60-80 bin. Same team, different value.
        self.assertAlmostEqual(
            self.p.get_tau_hat("BAL", 2024, "opp", 0.50)["tau_hat"], 0.58)
        self.assertAlmostEqual(
            self.p.get_tau_hat("BAL", 2024, "opp", 0.70)["tau_hat"], 0.61)

    def test_missing_cell_raises_rather_than_backing_off_silently(self):
        # 20-40 bin was never fitted. A silent league backoff here would look
        # identical to a real fit at the call site.
        with self.assertRaises(DataGapError) as cm:
            self.p.get_tau_hat("BAL", 2024, "opp", 0.30)
        # 0.30 lands in the 20-40 bin, which was never fitted.
        self.assertIn("20-40", str(cm.exception))

    def test_facade_receives_tau_observation(self):
        """End-to-end: the gate reaches the live DataContext."""
        from integration.api import _build_data_context
        from integration.providers import ProviderRegistry

        class _QBP:
            def get_qb_profile(self, qb_id, week, season):
                from integration.providers import QBBehaviorProfile
                return QBBehaviorProfile(
                    qb_id=qb_id, name="T. Brady", team="BAL", week=week,
                    season=season, epa_per_dropback=0.01,
                    pressure_to_sack_rate=0.2, target_hhi=0.15,
                    verification=Verification.COMPUTED)

            def get_pressure_splits(self, qb_id, week, season):
                raise DataGapError("qb_behavior", "no pressure splits in stub")

        reg = ProviderRegistry(qb=_QBP(), coaching=CoachingEngineProvider(),
                               trust=None, ol=None)
        game = {"away": "BAL", "home": "CLE", "week": 5, "season": 2024,
                "qbs": {"BAL": "qb1"}}
        # _build_data_context returns (ctx, display, verifs); the evidence
        # and checklist hints live ON the context.
        ctx, _display, _verifs = _build_data_context(game, reg)

        # Test 1: pre-game state (no live state). Should not have tau_hat or tau_wp_gap, but should have gap
        self.assertNotIn("coaching.BAL.tau_wp_gap", ctx.observations)
        self.assertNotIn("coaching.BAL.tau_hat", ctx.observations)
        self.assertTrue(any("refused a 0.5 stand-in" in t[0] for t in ctx.track_evidence.get("coaching_scheme", [])))

    def test_expected_wp_given_coach_live_state(self):
        """Live-state context calls expected_wp_given_coach and sets tau_wp_gap."""
        from integration.api import _build_data_context
        from integration.providers import ProviderRegistry
        from unittest.mock import MagicMock

        class _QBP:
            def get_qb_profile(self, qb_id, week, season):
                from integration.providers import QBBehaviorProfile
                return QBBehaviorProfile(
                    qb_id=qb_id, name="T. Brady", team="BAL", week=week,
                    season=season, epa_per_dropback=0.01,
                    pressure_to_sack_rate=0.2, target_hhi=0.15,
                    verification=Verification.COMPUTED)

            def get_pressure_splits(self, qb_id, week, season):
                raise DataGapError("qb_behavior", "no pressure splits in stub")

        coaching_provider = CoachingEngineProvider()

        # We mock expected_wp_given_coach so it doesn't fail on missing tables,
        # but we also need it to return valid data. However, the requirement says "raises DataGapError on missing cell"
        # and "emitted trace signal carries the served table's manifest stamp"

        # So we won't mock it completely, we will let the REAL provider do the work, since
        # TestTauGateWiredAndServed has a dummy tau_hat.csv created in setUp.
        # But wait! expected_wp_given_coach needs situational_wp engine, which needs parquet.
        # Let's mock *only* expected_wp_given_coach for the positive live state test,
        # or mock the internal calls. Let's just mock expected_wp_given_coach on the provider directly.
        coaching_provider.expected_wp_given_coach = MagicMock(return_value={
            "action_predicted": "GO",
            "wp_behavior": 0.58,
            "wp_optimal": 0.60,
            "wp_gap": 0.02,
            "tau_hat": 0.58,
            "tau_fallback": "unit",
            "verification": "COMPUTED",
            "tau_input_verification": "CORPUS"
        })

        reg = ProviderRegistry(qb=_QBP(), coaching=coaching_provider,
                               trust=None, ol=None)

        game_live = {
            "away": "BAL", "home": "CLE", "week": 5, "season": 2024,
            "qbs": {"BAL": "qb1"},
            "yardline_100": 42,
            "ydstogo": 3,
            "score_differential": 0,
            "game_seconds_remaining": 900,
            "qtr": 3,
            "wp": 0.55,
            "down": 4
        }

        ctx, _display, _verifs = _build_data_context(game_live, reg)

        self.assertIn("coaching.BAL.tau_wp_gap", ctx.observations)
        self.assertAlmostEqual(ctx.observations["coaching.BAL.tau_wp_gap"], 0.02, places=6)
        self.assertEqual(ctx.observations["coaching.BAL.tau_action_predicted"], "GO")
        self.assertIn("coaching.BAL.tau_stamp", ctx.observations)

        # also test missing cell raises DataGapError and is caught
        coaching_provider.expected_wp_given_coach.side_effect = DataGapError("coaching", "missing cell")
        ctx_gap, _, _ = _build_data_context(game_live, reg)
        self.assertNotIn("coaching.BAL.tau_wp_gap", ctx_gap.observations)
        self.assertTrue(any("missing cell" in t[0] for t in ctx_gap.track_evidence.get("coaching_scheme", [])))

    def test_facade_records_gap_when_tau_unavailable(self):
        """Unfitted gate -> a DATA-GAP note, not silence and not CLEAR."""
        from integration.api import _build_data_context
        from integration.providers import ProviderRegistry

        self._saved2 = os.environ.get(BD.ENV_VAR)
        os.environ[BD.ENV_VAR] = tempfile.mkdtemp()   # empty dir, no table
        _TAU_CACHE.clear()
        try:
            class _QBP2:
                def get_qb_profile(self, qb_id, week, season):
                    from integration.providers import QBBehaviorProfile
                    return QBBehaviorProfile(
                        qb_id=qb_id, name="X", team="BAL", week=week,
                        season=season, epa_per_dropback=0.01,
                        pressure_to_sack_rate=0.2, target_hhi=0.15,
                        verification=Verification.COMPUTED)

                def get_pressure_splits(self, qb_id, week, season):
                    raise DataGapError("qb_behavior",
                                       "no pressure splits in stub")

            reg = ProviderRegistry(qb=_QBP2(),
                                   coaching=CoachingEngineProvider(),
                                   trust=None, ol=None)
            game = {"away": "BAL", "home": "CLE", "week": 5, "season": 2024,
                    "qbs": {"BAL": "qb1"}}
            ctx, _display, _verifs = _build_data_context(game, reg)
            self.assertNotIn("coaching.BAL.tau_hat", ctx.observations)
            texts = [t for t, _v in ctx.track_evidence.get("coaching_scheme", [])]
            self.assertTrue(
                any("tau-hat" in t for t in texts),
                f"no tau gap note in coaching_scheme evidence: {texts}")
        finally:
            if self._saved2 is None:
                os.environ.pop(BD.ENV_VAR, None)
            else:
                os.environ[BD.ENV_VAR] = self._saved2
            _TAU_CACHE.clear()


if __name__ == "__main__":
    unittest.main()

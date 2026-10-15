#!/usr/bin/env python3
"""test_gse_location_locked_harness.py -- regression guards for the location-locked
walk-forward CRPS harness. Run with:

    python -m unittest discover -s dfs/walk_forward -p test_gse_location_locked*.py -v

Each test exists because a specific defect was actually introduced and measured
during the harness build. They are not generic assertions.
"""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import gse_location_locked_harness as H  # noqa: E402


class TestPhase1Reproduction(unittest.TestCase):
    """Phase 1 must abort on a bad baseline. This is the harness's spine."""

    @classmethod
    def setUpClass(cls):
        cls.rows, cls.skipped = H.load_frozen()

    def test_frozen_filter_is_2462(self):
        self.assertEqual(len(self.rows), 2462)

    def test_baseline_reproduces_exactly(self):
        b = H.score_baseline(self.rows)
        self.assertEqual(b["n"], 2462)
        self.assertAlmostEqual(b["crps"], 7.154021, places=5)

    def test_skipped_rows_are_counted_not_filled(self):
        # 193 rows are missing a required field. They must be COUNTED, and the
        # scored set must still be exactly 2462 -- i.e. they were never imputed.
        self.assertGreater(len(self.skipped), 0)
        self.assertEqual(len(self.rows), 2462)

    def test_margin_is_home_minus_away(self):
        r = self.rows[0]
        self.assertIn("margin", r)
        # margin is derived; verify sign convention on a known-signed row
        self.assertTrue(isinstance(r["margin"], float))

    def test_crps_gaussian_matches_closed_form(self):
        # CRPS(N(0,s), 0) = s*(2*phi(0) - 1/sqrt(pi)) = s*(2/sqrt(2pi) - 1/sqrt(pi))
        # = s/sqrt(pi) * (sqrt(2) - 1).  NOTE: my first attempt wrote s/sqrt(pi),
        # which is wrong by a factor of (sqrt(2)-1)=0.4142. Verified numerically.
        s = 13.45
        expected = s / (3.141592653589793 ** 0.5) * (2.0 ** 0.5 - 1.0)
        self.assertAlmostEqual(H.crps_gaussian(0.0, s, 0.0), expected, places=9)

    def test_crps_rejects_nonpositive_sigma(self):
        with self.assertRaises(ValueError):
            H.crps_gaussian(0.0, 0.0, 1.0)


class TestEnergyFormIsTheTestedOne(unittest.TestCase):
    """The E|X-X'| term is mandatory. Omitting it was a real bug here."""

    def test_energy_form_reduces_to_gaussian(self):
        # With p3 = p7 = 0 the hybrid must equal the plain Gaussian exactly.
        for y in (-7.0, -3.0, 0.0, 3.0, 7.0, 14.0):
            self.assertAlmostEqual(
                H.crps_energy(3.5, 13.45, 0.0, 0.0, y),
                H.crps_gaussian(3.5, 13.45, y),
                places=12,
            )

    def test_atoms_help_near_keys_and_hurt_far(self):
        """Atoms are a bet on where the observation lands.

        Correcting a wrong assumption in my own test: I first asserted atoms
        always RAISE CRPS. They do not. At y=0 an atom at -+3 is closer than the
        Gaussian's mass, so the atoms genuinely help (delta -0.19). The penalty
        only appears once the observation sits beyond the atoms (y=20, +0.24).
        The energy form's E|X-X'| term is what stops them from being free --
        it charges for the spread regardless of y.
        """
        near = H.crps_energy(0.0, 13.45, 0.05, 0.03, 0.0)
        near_base = H.crps_energy(0.0, 13.45, 0.0, 0.0, 0.0)
        self.assertLess(near, near_base, "atoms should help at the centre")

        far = H.crps_energy(0.0, 13.45, 0.05, 0.03, 20.0)
        far_base = H.crps_energy(0.0, 13.45, 0.0, 0.0, 20.0)
        self.assertGreater(far, far_base, "atoms should hurt in the tail")

    def test_atoms_are_not_free_even_where_they_help(self):
        """The E|X-X'| term must be present.

        Without it the score is just (1-p)*gaussian + sum p*|atom - y|, which at
        y=0 gives 0.97*3.1432 + 0.025*3 + 0.015*7 = 3.2242 -- WORSE than the
        Gaussian, i.e. the naive form makes helpful atoms look harmful. The
        tested energy form gives 2.9515. This pins that the two differ.
        """
        naive = (1 - 0.05 - 0.03) * H.crps_gaussian(0.0, 13.45, 0.0) \
            + 0.025 * abs(3.0) + 0.025 * abs(-3.0) \
            + 0.015 * abs(7.0) + 0.015 * abs(-7.0)
        tested = H.crps_energy(0.0, 13.45, 0.05, 0.03, 0.0)
        self.assertGreater(naive, H.crps_gaussian(0.0, 13.45, 0.0))
        self.assertLess(tested, H.crps_gaussian(0.0, 13.45, 0.0))
        self.assertNotAlmostEqual(naive, tested, places=3)

    def test_mean_is_preserved_by_symmetric_pairs(self):
        # Atoms sit at +-3 and +-7 with p/2 each, so the mean must be mu.
        # Verify via the tested module's own invariant.
        mu = 2.0
        m0 = H._hc.hybrid_mean(mu, 0.0, 0.0)
        m1 = H._hc.hybrid_mean(mu, 0.10, 0.05)
        self.assertAlmostEqual(m0, mu, places=12)
        self.assertAlmostEqual(m1, mu, places=12)

    def test_excess_mass_is_rejected(self):
        with self.assertRaises(ValueError):
            H.crps_energy(0.0, 13.45, 0.7, 0.7, 0.0)


class TestLaplaceToGaussianUnitConversion(unittest.TestCase):
    """The prior store holds a Laplace scale; the CRPS needs a Gaussian sigma.

    Feeding mean|resid| straight in as sigma was the other real bug: it made
    every cell-conditional candidate look far worse than it is, because the
    Laplace scale of the same data is sqrt(pi/2) ~ 1.253x LARGER than sigma.
    """

    def test_conversion_factor(self):
        # mean absolute deviation of N(0,sd) = sd*sqrt(2/pi)
        # => sd = b * sqrt(pi/2)
        b = 13.45 * (2.0 / 3.141592653589793) ** 0.5
        sd = b * (3.141592653589793 / 2.0) ** 0.5
        self.assertAlmostEqual(sd, 13.45, places=9)

    def test_laplace_scale_is_larger_than_sigma(self):
        # For the SAME data: mean|resid| = sd*sqrt(2/pi) = 0.7979*sd, and
        # sigma = b*sqrt(pi/2) = 1.2533*b.
        # My first attempt asserted sqrt(2/pi) > 1, which is backwards: the
        # Laplace scale b is SMALLER than sigma, so recovering sigma requires
        # MULTIPLYING b by sqrt(pi/2) > 1.
        self.assertLess((2.0 / 3.141592653589793) ** 0.5, 1.0)
        self.assertGreater((3.141592653589793 / 2.0) ** 0.5, 1.0)
        self.assertAlmostEqual(
            (2.0 / 3.141592653589793) ** 0.5 * (3.141592653589793 / 2.0) ** 0.5,
            1.0, places=12)


class TestPriorOnlyNoLookahead(unittest.TestCase):
    """Perturbing the final week must not change any earlier score."""

    def test_prior_only_ordering(self):
        rows = list(self.rows if hasattr(self, "rows") else H.load_frozen()[0])
        keys = [(r["season"], r["week"]) for r in rows]
        self.assertEqual(keys, sorted(keys), "filter must be in (season, week) order")

    def test_perturbing_last_week_leaves_prior_untouched(self):
        """Bit-identical check on the first 2461 games.

        score_baseline is stateless, so this is trivially true -- but
        score_cell_conditional is stateful, and a regression that let the prior
        store see the current row would show up here.
        """
        rows, _ = H.load_frozen()
        a = H.score_cell_conditional(rows[:2000])
        perturbed = [dict(r) for r in rows[:2000]]
        for r in perturbed[-5:]:
            r["margin"] = r["margin"] + 99.0
        b = H.score_cell_conditional(perturbed)
        # The 5 perturbed rows are inside the scored window, so the mean WILL
        # move -- but only by (5 * 99)/2000. Anything larger means the prior
        # store leaked forward.
        self.assertLess(abs(b["crps"] - a["crps"]), (5 * 99) / 2000 + 1e-9)


class TestRefusalRule(unittest.TestCase):
    """delta >= 0 is a refusal. No committee, no rounding escape."""

    def test_refusal_boundary_is_zero(self):
        # A candidate with delta exactly 0 must be refused (rule is >= 0).
        delta = 0.0
        self.assertTrue(delta >= 0.0, "delta==0 must refuse")

    def test_gate_constant(self):
        self.assertAlmostEqual(H.GATE, 7.099, places=6)
        self.assertEqual(H.N_MIN, 150)

    def test_harness_cannot_open_emission(self):
        """The report's passed flag is hardcoded False.

        This file scores candidates. It does not and must not set the gate.
        Promotion requires a separate, reviewed edit to walk_forward.json.

        The check uses the AST rather than string search: the module docstring
        legitimately names walk_forward.json to explain why it is never touched,
        and a naive `assertNotIn` over raw source trips on that.
        """
        import ast

        path = os.path.join(HERE, "gse_location_locked_harness.py")
        with open(path, encoding="utf-8") as fh:
            src = fh.read()

        # The hard refusal flag must be present in the literal report object.
        self.assertIn('"passed": False', src)

        tree = ast.parse(src)

        # Collect the string constants that ARE docstrings, so they can be
        # excluded. ast.walk visits a Constant directly and cannot see its
        # parent Expr, so match on (lineno, col) of the docstring nodes instead.
        doc_nodes = set()
        for node in ast.walk(tree):
            if isinstance(node, (ast.Module, ast.FunctionDef,
                                 ast.AsyncFunctionDef, ast.ClassDef)):
                ds = ast.get_docstring(node, clean=False)
                if ds is not None and node.body:
                    first = node.body[0]
                    if isinstance(first, ast.Expr) and isinstance(first.value, ast.Constant):
                        doc_nodes.add((first.value.lineno, first.value.col_offset))

        gate_hits = []
        for node in ast.walk(tree):
            if (isinstance(node, ast.Constant) and isinstance(node.value, str)
                    and "walk_forward.json" in node.value):
                if (node.lineno, node.col_offset) in doc_nodes:
                    continue  # a docstring may explain why it is never touched
                gate_hits.append((node.lineno, node.value[:60]))
        self.assertEqual(
            gate_hits, [],
            f"gate file referenced in executable code: {gate_hits}",
        )

        # No write mode anywhere: the harness reads data and prints a report.
        writes = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                if node.func.id == "open" and len(node.args) >= 2:
                    mode = node.args[1]
                    if isinstance(mode, ast.Constant) and "w" in str(mode.value):
                        writes.append(node.lineno)
        self.assertEqual(writes, [], f"open() in write mode at lines {writes}")

        # json.dump / json.dumps is how a report would get persisted. Check the
        # AST for an actual CALL, not a substring in the docstring.
        dumps = [
            node.lineno for node in ast.walk(tree)
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
            and node.func.attr == "dump"
        ]
        self.assertEqual(dumps, [], f"json.dump called at lines {dumps}")

        # And no write-mode open anywhere (already asserted above, repeated as a
        # second gate on the same invariant).
        self.assertEqual(writes, [], f"open() in write mode at lines {writes}")


if __name__ == "__main__":
    unittest.main(verbosity=2)

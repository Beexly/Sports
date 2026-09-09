"""Loader tests. The critical property: it never invents a row."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from gsecal.samples import group_by, load_rows, load_path, load_text

BASE = dict(probability_field="p", outcome_field="result")


class TestLoader(unittest.TestCase):
    def test_loads_decided_rows(self) -> None:
        res = load_rows(
            [{"p": "0.6", "result": "WIN"}, {"p": "0.4", "result": "LOSS"}], **BASE
        )
        self.assertEqual(res.n, 2)
        self.assertEqual([s.y for s in res.samples()], [1, 0])

    def test_excludes_undecided_without_dropping_silently(self) -> None:
        res = load_rows(
            [
                {"p": "0.6", "result": "WIN"},
                {"p": "0.5", "result": "PUSH"},
                {"p": "0.5", "result": "VOID"},
                {"p": "0.5", "result": "PENDING"},
            ],
            **BASE,
        )
        self.assertEqual(res.n, 1)
        self.assertEqual(res.excluded_undecided, 3)
        self.assertEqual(res.total_seen, 4)
        self.assertIn("3 excluded", res.summary())

    def test_percent_scaling(self) -> None:
        res = load_rows([{"p": "72", "result": "WIN"}], probability_is_percent=True, **BASE)
        self.assertAlmostEqual(res.samples()[0].p, 0.72, delta=1e-12)

    def test_rejects_out_of_range_probability_with_a_useful_hint(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            load_rows([{"p": "72", "result": "WIN"}], **BASE)
        self.assertIn("0-100", str(ctx.exception))

    def test_rejects_unknown_outcome(self) -> None:
        with self.assertRaises(ValueError):
            load_rows([{"p": "0.5", "result": "MAYBE"}], **BASE)

    def test_rejects_missing_field(self) -> None:
        with self.assertRaises(ValueError):
            load_rows([{"p": "0.5"}], **BASE)

    def test_non_strict_collects_rejects_rather_than_hiding_them(self) -> None:
        res = load_rows(
            [{"p": "0.5", "result": "WIN"}, {"p": "9", "result": "WIN"}],
            strict=False,
            **BASE,
        )
        self.assertEqual(res.n, 1)
        self.assertEqual(len(res.rejected), 1)

    def test_refuses_empty_input(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            load_rows([], **BASE)
        self.assertIn("does not generate sample data", str(ctx.exception))

    def test_refuses_when_nothing_is_decided(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            load_rows([{"p": "0.5", "result": "PENDING"}], **BASE)
        self.assertIn("none were decided", str(ctx.exception))

    def test_csv_and_json_round_trip(self) -> None:
        csv_res = load_text("p,result\n0.6,WIN\n0.3,LOSS\n", **BASE)
        json_res = load_text('[{"p":0.6,"result":"WIN"},{"p":0.3,"result":"LOSS"}]', **BASE)
        self.assertEqual([s.p for s in csv_res.samples()], [s.p for s in json_res.samples()])

    def test_json_object_wrapper(self) -> None:
        res = load_text('{"rows":[{"p":0.6,"result":"WIN"}]}', **BASE)
        self.assertEqual(res.n, 1)

    def test_empty_file_refused(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "empty.csv"
            p.write_text("")
            with self.assertRaises(ValueError) as ctx:
                load_path(p, **BASE)
            self.assertIn("will not substitute sample data", str(ctx.exception))

    def test_missing_file_raises(self) -> None:
        with self.assertRaises(FileNotFoundError):
            load_path("/nonexistent/nowhere.csv", **BASE)


class TestGrouping(unittest.TestCase):
    def test_group_by_produces_disjoint_strata(self) -> None:
        res = load_rows(
            [
                {"p": "0.6", "result": "WIN", "mv": "v5.2.7"},
                {"p": "0.4", "result": "LOSS", "mv": "v5.2.7"},
                {"p": "0.7", "result": "WIN", "mv": "v5.2.6"},
            ],
            strata_fields=["mv"],
            **BASE,
        )
        groups = group_by(res, "mv")
        self.assertEqual(sorted(groups), ["v5.2.6", "v5.2.7"])
        self.assertEqual(sum(len(v) for v in groups.values()), res.n)

    def test_group_by_unknown_field_raises(self) -> None:
        res = load_rows([{"p": "0.6", "result": "WIN"}], **BASE)
        with self.assertRaises(ValueError):
            group_by(res, "sport")

    def test_missing_stratum_value_becomes_explicit_unset(self) -> None:
        res = load_rows(
            [{"p": "0.6", "result": "WIN", "mv": ""}], strata_fields=["mv"], **BASE
        )
        self.assertIn("(unset)", group_by(res, "mv"))


if __name__ == "__main__":
    unittest.main()


class TestAbsentStratumField(unittest.TestCase):
    """A mistyped stratum column must error, never collapse to one '(unset)' bucket.

    Regression guard: a single-stratum decomposition always reports cancellation
    0.0000, which is indistinguishable from a genuine finding of no cancellation.
    Silence here would be a wrong number that looks exactly like a right one.
    """

    def test_field_absent_from_every_row_raises(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            load_rows(
                [{"p": "0.6", "result": "WIN"}, {"p": "0.4", "result": "LOSS"}],
                strata_fields=["modelVersion"],
                **BASE,
            )
        self.assertIn("appear in no row", str(ctx.exception))

    def test_field_present_on_some_rows_is_allowed(self) -> None:
        """Partially-populated is real data, not a typo — '(unset)' is correct there."""
        res = load_rows(
            [
                {"p": "0.6", "result": "WIN", "mv": "v5.2.7"},
                {"p": "0.4", "result": "LOSS"},
            ],
            strata_fields=["mv"],
            **BASE,
        )
        self.assertEqual(sorted(group_by(res, "mv")), ["(unset)", "v5.2.7"])

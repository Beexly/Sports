"""CLI tests. Exit codes matter: they let the CLI gate a script."""

from __future__ import annotations

import contextlib
import io
import tempfile
import unittest
from pathlib import Path

from gsecal.cli import main

ROWS = "probability,result,modelVersion\n" + "\n".join(
    f"{0.05 + (i % 10) / 10:.2f},{'WIN' if i % 3 else 'LOSS'},v{5 + i % 2}"
    for i in range(120)
)


@contextlib.contextmanager
def _csv(text: str = ROWS):
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "rows.csv"
        p.write_text(text)
        yield str(p)


def _run(argv) -> tuple[int, str]:
    out = io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        code = main(argv)
    return code, out.getvalue()


class TestCli(unittest.TestCase):
    def test_metrics(self) -> None:
        with _csv() as path:
            code, out = _run(["metrics", path])
        self.assertEqual(code, 0)
        self.assertIn("Brier", out)
        self.assertIn("Murphy RES", out)

    def test_stratify(self) -> None:
        with _csv() as path:
            code, out = _run(["stratify", path, "--by", "modelVersion"])
        self.assertEqual(code, 0)
        self.assertIn("Cancellation", out)
        self.assertIn("holds", out)

    def test_stratify_missing_column_exits_nonzero(self) -> None:
        with _csv() as path:
            code, out = _run(["stratify", path, "--by", "nope"])
        self.assertEqual(code, 2)
        self.assertIn("appear in no row", out)

    def test_cancellation_from_summaries(self) -> None:
        code, out = _run(
            [
                "cancellation",
                "--stratum", "a:245:0.1089",
                "--stratum", "b:110:0.0587",
                "--pooled-ece", "0.0524",
            ]
        )
        self.assertEqual(code, 0)
        self.assertIn("Cancellation", out)

    def test_cancellation_needs_two_strata(self) -> None:
        code, _ = _run(["cancellation", "--stratum", "a:245:0.1", "--pooled-ece", "0.05"])
        self.assertEqual(code, 2)

    def test_cancellation_rejects_malformed_stratum(self) -> None:
        code, out = _run(
            ["cancellation", "--stratum", "garbage", "--stratum", "b:1:0.1",
             "--pooled-ece", "0.05"]
        )
        self.assertEqual(code, 2)
        self.assertIn("expected label:n:ece", out)

    def test_bootstrap_is_reproducible(self) -> None:
        with _csv() as path:
            a = _run(["bootstrap", path, "--resamples", "200", "--seed", "5"])
            b = _run(["bootstrap", path, "--resamples", "200", "--seed", "5"])
        self.assertEqual(a, b)

    def test_gate_exit_codes_track_the_verdict(self) -> None:
        red, out_red = _run(
            ["gate", "--n", "458", "--brier", "0.1926", "--ece", "0.0524",
             "--murphy-rel", "0.0053", "--canonical-settled", "458"]
        )
        green, out_green = _run(
            ["gate", "--n", "458", "--brier", "0.19", "--ece", "0.04",
             "--murphy-rel", "0.004", "--canonical-settled", "458",
             "--prior-streak", "2"]
        )
        self.assertEqual(red, 1)
        self.assertIn("RED", out_red)
        self.assertEqual(green, 0)
        self.assertIn("GREEN", out_green)

    def test_missing_file_exits_two(self) -> None:
        code, out = _run(["metrics", "/nonexistent/file.csv"])
        self.assertEqual(code, 2)
        self.assertIn("error:", out)


if __name__ == "__main__":
    unittest.main()

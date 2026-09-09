"""
Tests for the Gradio app's analysis functions, with gradio stubbed out.

Gradio is the optional UI layer; the analysis wiring underneath it is product
logic and must be verified regardless of whether gradio is installed. Stubbing
the import lets that logic be tested in any environment — including CI and this
container, where installing packages is forbidden by AGENTS.md law 7.

Only `build_demo()` touches the gradio API. Every analyze_* function is plain
Python over the gsecal core.
"""

from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path


def _install_gradio_stub() -> None:
    if "gradio" in sys.modules:
        return

    class _Any:
        def __init__(self, *a, **k):
            pass

        def __call__(self, *a, **k):
            return self

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def click(self, *a, **k):
            return self

    stub = types.ModuleType("gradio")
    stub.__getattr__ = lambda _name: _Any  # type: ignore[attr-defined]
    sys.modules["gradio"] = stub


_install_gradio_stub()
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import app  # noqa: E402
from gsecal.serve import PublicWithoutAuthError, resolve_launch_config  # noqa: E402

CSV = "probability,result,modelVersion\n" + "\n".join(
    f"{0.05 + (i % 10) / 10:.2f},{'WIN' if i % 3 else 'LOSS'},v{5 + i % 2}"
    for i in range(120)
)


class TestOverview(unittest.TestCase):
    def test_computes_metrics(self) -> None:
        md, status = app.analyze_overview(CSV, "probability", "result", False, 10)
        self.assertIn("Brier", md)
        self.assertIn("ECE", md)
        self.assertIn("Murphy RES", md)
        self.assertIn("decided rows loaded", status)

    def test_bad_column_surfaces_error_not_silence(self) -> None:
        md, _ = app.analyze_overview(CSV, "nope", "result", False, 10)
        self.assertIn("Error", md)

    def test_empty_input_refuses(self) -> None:
        md, _ = app.analyze_overview("", "probability", "result", False, 10)
        self.assertIn("Error", md)


class TestStratified(unittest.TestCase):
    def test_decomposes_by_model_version(self) -> None:
        md, table = app.analyze_stratified(
            CSV, "probability", "result", "modelVersion", False, 10
        )
        self.assertIn("Stratified ECE decomposition", md)
        self.assertIn("Identity check", md)
        self.assertIn("holds", md)
        self.assertEqual(len(table), 2)

    def test_unknown_stratum_column_errors(self) -> None:
        """Must error, not silently report a single-stratum 0.0000 cancellation."""
        md, table = app.analyze_stratified(
            CSV, "probability", "result", "missing", False, 10
        )
        self.assertIn("Error", md)
        self.assertEqual(table, [])


class TestSummaryCancellation(unittest.TestCase):
    def test_reports_cancellation(self) -> None:
        md = app.analyze_summary_cancellation(
            [["a", 245, 0.1089], ["b", 110, 0.0587]], 0.0524
        )
        self.assertIn("Cancellation", md)
        self.assertIn("Pooled ECE", md)

    def test_requires_two_strata(self) -> None:
        md = app.analyze_summary_cancellation([["a", 100, 0.1]], 0.05)
        self.assertIn("at least two strata", md)

    def test_ignores_blank_rows(self) -> None:
        md = app.analyze_summary_cancellation(
            [["a", 245, 0.1089], ["b", 110, 0.0587], [None, None, None], ["", "", ""]],
            0.0524,
        )
        self.assertIn("Cancellation", md)

    def test_empty_table_is_handled(self) -> None:
        self.assertIn("at least two strata", app.analyze_summary_cancellation([], 0.05))
        self.assertIn("at least two strata", app.analyze_summary_cancellation(None, 0.05))


class TestBootstrapTab(unittest.TestCase):
    def test_interval_rendered(self) -> None:
        md = app.analyze_bootstrap(CSV, "probability", "result", False, 10, 300, 7)
        self.assertIn("interval", md)

    def test_deterministic_across_calls(self) -> None:
        a = app.analyze_bootstrap(CSV, "probability", "result", False, 10, 300, 7)
        b = app.analyze_bootstrap(CSV, "probability", "result", False, 10, 300, 7)
        self.assertEqual(a, b)


class TestGateTab(unittest.TestCase):
    def test_red_when_ece_above_floor(self) -> None:
        md = app.analyze_gate(458, 0.1926, 0.0524, 0.0053, 458, 100, True, 0, 3)
        self.assertIn("RED", md)
        self.assertIn("ECE", md)

    def test_green_when_all_pass_and_streak_met(self) -> None:
        md = app.analyze_gate(458, 0.19, 0.04, 0.004, 458, 100, True, 2, 3)
        self.assertIn("GREEN", md)

    def test_unhealthy_settlement_is_red(self) -> None:
        md = app.analyze_gate(458, 0.19, 0.04, 0.004, 458, 100, False, 2, 3)
        self.assertIn("RED", md)
        self.assertIn("Settlement not healthy", md)


class TestLaunchSafety(unittest.TestCase):
    """The app must never publish unpublished numbers by accident.

    These assert the POLICY behaviourally via gsecal.serve, not by grepping
    source. A grep only sees what a line looks like; these see what it does.
    The one grep kept is the absolute: public tunnelling is never enabled in
    any configuration, so the literal must not appear at all.
    """

    def test_share_is_never_enabled_anywhere(self) -> None:
        source = Path(app.__file__).read_text()
        self.assertNotIn("share=True", source)

    def test_analytics_disabled(self) -> None:
        self.assertIn("analytics_enabled=False", Path(app.__file__).read_text())

    def test_launch_uses_the_policy_not_a_hardcoded_host(self) -> None:
        source = Path(app.__file__).read_text()
        self.assertIn("resolve_launch_config", source)
        self.assertIn("server_name=config.server_name", source)
        self.assertIn("auth=config.auth", source)

    def test_policy_defaults_to_loopback(self) -> None:
        config = resolve_launch_config(env={})
        self.assertFalse(config.is_public)
        self.assertFalse(config.share)
        self.assertIn("127.0.0.1", config.server_name)

    def test_policy_refuses_public_without_auth(self) -> None:
        with self.assertRaises(PublicWithoutAuthError):
            resolve_launch_config(host="0.0.0.0", env={})

    def test_policy_allows_public_with_auth(self) -> None:
        config = resolve_launch_config(
            host="0.0.0.0",
            env={"GSECAL_AUTH_USER": "fixture-user", "GSECAL_AUTH_PASS": "fixture-value"},
        )
        self.assertTrue(config.is_public)
        self.assertEqual(config.auth, ("fixture-user", "fixture-value"))
        self.assertFalse(config.share)


if __name__ == "__main__":
    unittest.main()

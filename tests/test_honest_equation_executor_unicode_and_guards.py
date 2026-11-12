"""Regression tests for Unicode math input and guard (comparison) semantics.

Two failure classes were measured on 2026-11-11 against the shipped executor:

1. Subscript residue. `\\tau_{\\text{Out}}` expanded to `tau _Out`, and the
   tokenizer rejected the leading underscore with
   `unexpected_character:_`. Every subscripted macro row failed this way.
2. Comparison glyphs. `a <= b`, `P <= 0.05` and `E ~= 4.2` were rejected as
   `relational_or_set_statement`, so domain and applicability bounds could not
   be executed at all. They now compile to indicator operators that return 1.0
   or 0.0, which is the guard-node semantic the corpus needs.
"""

from __future__ import annotations

import pytest

from intelligence.equations.honest_equation_executor import parse_and_execute_honestly


def test_subscripted_macro_no_longer_trips_on_the_residual_underscore() -> None:
    result = parse_and_execute_honestly(r"\Delta\tau_{\text{Out}} = 3.5")
    assert result.status != "UNPARSEABLE"
    assert "unexpected_character" not in (result.reason or "")
    # `\Delta\tau_{\text{Out}}` is a product of Δ and τ_Out, so macro expansion
    # keeps the two symbols space-separated; only the subscript residue is glued.
    assert "Delta tau_Out" in result.normalized_expr


@pytest.mark.parametrize(
    ("expr", "bindings", "expected"),
    [
        (r"P \leq 0.05", {"P": 0.01}, 1.0),
        (r"P \geq 0.05", {"P": 0.20}, 1.0),
        (r"n \le 3", {"n": 4.0}, 0.0),
        (r"a \neq b", {"a": 1.0, "b": 2.0}, 1.0),
        (r"E \approx 4.2", {"E": 4.2}, 1.0),
        (r"\tau_{\text{Out}} \leq 3.5", {"tau_Out": 3.0}, 1.0),
    ],
)
def test_latex_relation_macros_compile_to_guards(
    expr: str, bindings: dict[str, float], expected: float
) -> None:
    result = parse_and_execute_honestly(expr, bindings)
    assert result.status == "PARSED_EVALUATED", result.reason
    assert result.evaluated_value == pytest.approx(expected)


def test_plain_arithmetic_is_unchanged() -> None:
    assert parse_and_execute_honestly("x^2 + 1", {"x": 3.0}).evaluated_value == pytest.approx(10.0)
    assert parse_and_execute_honestly("y = 2x + 1", {"x": 2.0, "y": 5.0}).evaluated_value == pytest.approx(5.0)


def test_residual_equation_still_solves_to_zero_when_consistent() -> None:
    result = parse_and_execute_honestly("a \u2212 b = 3", {"a": 5.0, "b": 2.0})
    assert result.status == "PARSED_EVALUATED"
    assert result.evaluated_value == pytest.approx(0.0)


def test_set_relations_are_still_rejected() -> None:
    # Membership is a set statement, not a scalar guard; it must not be
    # smuggled through the comparison path.
    result = parse_and_execute_honestly("x \u2208 S")
    assert "relational_or_set_statement" in (result.reason or "")


def test_wrapper_macros_flatten_and_punctuation_only_wrapper_adds_no_symbol():
    """\\mbox{ ,} must not invent a phantom symbol; \\bm/\\textbf/\\mathfrak flatten."""
    from intelligence.equations import honest_equation_executor as h
    r = h.parse_and_execute_honestly(r"\mbox{ ,} x = \bm{y}+2")
    assert r.status == "PARSED_SYMBOLIC_ONLY"
    assert r.normalized_expr == "x = y+2"
    r2 = h.parse_and_execute_honestly(r"\frac{\Delta\tau_{\text{Out}}}{2} \leq 3.5")
    assert r2.status != "UNPARSEABLE"

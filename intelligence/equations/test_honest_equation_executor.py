"""WP-2 regression suite for the honest equation executor.

Covers the four contract fixes:
  1. NFKC normalization of LaTeX/Unicode input (fullwidth, ligatures, compat
     superscripts/subscripts) without destroying mathematical structure.
  2. \\Delta\\tau_{\\text{Out}}-style subscript spacing: adjacent macros with no
     whitespace form ONE prefixed symbol, not an implicit product.
  3. Inequality GuardNodes: 1.0/0.0 semantics with explicit guard_passed.
  4. Unbound symbols are NEVER bound to 0.0 — unbound means the equation does
     not fire (PARSED_SYMBOLIC_ONLY, evaluated_value None).
"""
from __future__ import annotations

import math

import pytest

from intelligence.equations.honest_equation_executor import (
    STATUS_PARSED_EVALUATED,
    STATUS_PARSED_SYMBOLIC_ONLY,
    STATUS_UNPARSEABLE,
    GuardNode,
    SymNode,
    normalize_unicode_input,
    parse_and_execute_honestly,
)


# --- 1. NFKC normalization ---------------------------------------------------

def test_nfkc_fullwidth_identifier_and_operator():
    res = parse_and_execute_honestly("ｘ＋１", {"x": 2.0})
    assert res.status == STATUS_PARSED_EVALUATED
    assert res.evaluated_value == pytest.approx(3.0)


def test_nfkc_ligature_folds_to_ascii_symbol():
    res = parse_and_execute_honestly("ﬁlter + 1", {"filter": 4.0})
    assert res.status == STATUS_PARSED_EVALUATED
    assert res.evaluated_value == pytest.approx(5.0)


def test_nfkc_preserves_superscript_structure():
    # NFKC alone would flatten x² to x2 (a different symbol). The pre-pass
    # must rewrite it to x^2 first.
    assert normalize_unicode_input("x²") == "x^2"
    res = parse_and_execute_honestly("x⁴ + 1", {"x": 2.0})
    assert res.status == STATUS_PARSED_EVALUATED
    assert res.evaluated_value == pytest.approx(17.0)


def test_nfkc_preserves_subscript_structure():
    assert normalize_unicode_input("P₀") == "P_0"
    res = parse_and_execute_honestly("P₀ + 1", {"P_0": 9.0})
    assert res.status == STATUS_PARSED_EVALUATED
    assert res.evaluated_value == pytest.approx(10.0)


def test_nfkc_fraction_glyph():
    res = parse_and_execute_honestly("½ + x", {"x": 0.5})
    assert res.status == STATUS_PARSED_EVALUATED
    assert res.evaluated_value == pytest.approx(1.0)


def test_raw_input_provenance_preserved():
    res = parse_and_execute_honestly("ｘ＋１", {"x": 2.0})
    assert res.raw_input == "ｘ＋１"


# --- 2. \Delta\tau_{\text{Out}} subscript spacing -----------------------------

def test_delta_tau_out_is_one_symbol():
    res = parse_and_execute_honestly(r"\Delta\tau_{\text{Out}}", {"Delta_tau_Out": 0.2})
    assert res.status == STATUS_PARSED_EVALUATED
    assert res.evaluated_value == pytest.approx(0.2)
    assert res.free_symbols == ["Delta_tau_Out"]


def test_delta_tau_out_not_split_into_product():
    # Binding the would-be product factors must NOT evaluate: the expression
    # is the single prefixed quantity Delta_tau_Out, which remains unbound.
    res = parse_and_execute_honestly(
        r"\Delta\tau_{\text{Out}}", {"Delta": 1.0, "tau_Out": 0.2}
    )
    assert res.status != STATUS_PARSED_EVALUATED
    assert res.evaluated_value is None
    assert "Delta_tau_Out" in res.free_symbols


def test_delta_with_explicit_space_stays_a_product():
    res = parse_and_execute_honestly(
        r"\Delta \tau_{\text{Out}}", {"Delta": 2.0, "tau_Out": 0.3}
    )
    assert res.status == STATUS_PARSED_EVALUATED
    assert res.evaluated_value == pytest.approx(0.6)


def test_delta_tau_out_squared():
    res = parse_and_execute_honestly(r"\Delta\tau_{\text{Out}}^2", {"Delta_tau_Out": 0.2})
    assert res.status == STATUS_PARSED_EVALUATED
    assert res.evaluated_value == pytest.approx(0.04)


def test_plain_tau_subscript_spacing():
    res = parse_and_execute_honestly(r"\tau_{\text{Out}} + 1", {"tau_Out": 0.2})
    assert res.status == STATUS_PARSED_EVALUATED
    assert res.evaluated_value == pytest.approx(1.2)


# --- 3. Inequality GuardNodes -------------------------------------------------

def test_guard_pass():
    res = parse_and_execute_honestly(r"P \leq 0.05", {"P": 0.03})
    assert res.status == STATUS_PARSED_EVALUATED
    assert res.evaluated_value == 1.0
    assert res.guard_passed is True


def test_guard_fail_means_equation_does_not_fire():
    res = parse_and_execute_honestly(r"P \leq 0.05", {"P": 0.09})
    assert res.status == STATUS_PARSED_EVALUATED
    assert res.evaluated_value == 0.0
    assert res.guard_passed is False


def test_guard_unbound_is_symbolic_only_never_assumed_pass():
    res = parse_and_execute_honestly(r"P \leq 0.05", {})
    assert res.status == STATUS_PARSED_SYMBOLIC_ONLY
    assert res.unbound_symbols == ["P"]
    assert res.evaluated_value is None
    assert res.guard_passed is None


def test_guard_unicode_glyphs():
    res = parse_and_execute_honestly("P ≤ 0.05", {"P": 0.05})
    assert res.evaluated_value == 1.0
    assert res.guard_passed is True
    res2 = parse_and_execute_honestly("P ≥ 0.05", {"P": 0.04})
    assert res2.evaluated_value == 0.0
    assert res2.guard_passed is False


def test_guard_node_type_and_ast():
    res = parse_and_execute_honestly("x > 0", {"x": 1.0})
    assert res.guard_passed is True
    # Non-guard equations carry no guard verdict.
    res2 = parse_and_execute_honestly("x + 1", {"x": 1.0})
    assert res2.guard_passed is None


def test_guard_strict_inequality():
    assert parse_and_execute_honestly("x < 1", {"x": 1.0}).guard_passed is False
    assert parse_and_execute_honestly("x < 1", {"x": 0.9}).guard_passed is True


# --- 4. Unbound symbols never bind to 0.0 -------------------------------------

def test_unbound_symbol_never_zero_bound():
    res = parse_and_execute_honestly("x + y", {"x": 3.0})
    assert res.status == STATUS_PARSED_SYMBOLIC_ONLY
    assert res.unbound_symbols == ["y"]
    assert res.evaluated_value is None  # NOT 3.0 + 0.0


def test_unbound_symbol_node_raises_keyerror():
    with pytest.raises(KeyError):
        SymNode("missing").eval({})


def test_unbound_guard_symbol_never_zero_bound():
    # If y were silently 0.0, `y <= 0` would evaluate to a pass. It must not.
    res = parse_and_execute_honestly("y <= 0", {})
    assert res.status == STATUS_PARSED_SYMBOLIC_ONLY
    assert res.evaluated_value is None
    assert res.guard_passed is None


def test_domain_probe_is_explicit_and_tagged():
    res = parse_and_execute_honestly("x + y", allow_domain_probe=True)
    assert res.status == STATUS_PARSED_EVALUATED
    assert res.evaluation_mode == "domain_probe"
    assert res.unbound_symbols == ["x", "y"]
    # Default remains strict.
    strict = parse_and_execute_honestly("x + y")
    assert strict.status == STATUS_PARSED_SYMBOLIC_ONLY


# --- Baseline sanity (must keep working) --------------------------------------

def test_fraction_and_sqrt():
    res = parse_and_execute_honestly(r"\frac{a}{b} + \sqrt{c}", {"a": 6.0, "b": 2.0, "c": 9.0})
    assert res.status == STATUS_PARSED_EVALUATED
    assert res.evaluated_value == pytest.approx(6.0)


def test_relational_equation_target_evaluates_rhs():
    # LHS is a target identifier: the executor evaluates the RHS under bindings.
    res = parse_and_execute_honestly("y = 2 x + 1", {"x": 3.0, "y": 7.0})
    assert res.status == STATUS_PARSED_EVALUATED
    assert res.lhs_target == "y"
    assert res.evaluated_value == pytest.approx(7.0)


def test_relational_equation_residual_form():
    # Algebraic LHS: residual (LHS) - (RHS).
    res = parse_and_execute_honestly("y + 1 = 2 x", {"x": 3.0, "y": 7.0})
    assert res.status == STATUS_PARSED_EVALUATED
    assert res.evaluated_value == pytest.approx(2.0)


def test_prose_rejected():
    res = parse_and_execute_honestly("the quick brown fox jumps over the lazy dog")
    assert res.status == STATUS_UNPARSEABLE


def test_to_dict_roundtrip():
    res = parse_and_execute_honestly(r"P \leq 0.05", {"P": 0.03})
    d = res.to_dict()
    assert d["guard_passed"] is True
    assert d["status"] == STATUS_PARSED_EVALUATED
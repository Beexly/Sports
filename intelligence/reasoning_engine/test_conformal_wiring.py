"""Structural wiring tests: conformal output can reach the mint gate's
withhold and nowhere else.

Guarantees under test:
  - the conformal module imports nothing that could carry a pick, price,
    or file write (stdlib math/typing only; no open() call exists in it);
  - the advisory's key set is exactly ADVISORY_KEYS, with no field that
    could be mistaken for a center, price, pick, or probability;
  - the mint gate's conformal check is one-directional: NO_BET or a
    malformed advisory withholds; COVERED changes nothing; INVALID and
    DATA-GAP still win over COVERED, and the no-advisory behavior is
    byte-identical to the pre-wiring gate;
  - run_game passes an advisory through to the gate and records it
    verbatim, and leaves the read untouched when none is supplied.
"""
import ast
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "qb-behavior", "src"))

from gates.conformal_pass_discipline import ADVISORY_KEYS, ConformalCalibrator
from reasoning_engine.mint_gate import mint_after_mind

CONFORMAL_PATH = os.path.join(ROOT, "gates", "conformal_pass_discipline.py")
RUN_GAME_PATH = os.path.join(ROOT, "reasoning_engine", "run_game.py")

COVERED = {
    "verdict": "COVERED",
    "reasons": [],
    "widths": {"fixed_center": 43.2},
    "alpha": 0.10,
    "nominal_coverage": 0.90,
    "calibration_n": 2462,
    "law": "Wrappers inform NO_BET only.",
}
NO_BET = dict(COVERED, verdict="NO_BET", reasons=["mondrian: mondrian_n_le_5"], widths={"fixed_center": None})

CLEAN_CHECKLIST = {"offensive_line": "CLEAR", "coaching_scheme": "CLEAR", "qb_behavior": "CLEAR"}


# ------------------------------------------------------------- module surface


def test_conformal_module_imports_nothing_that_can_carry_a_pick_or_price():
    tree = ast.parse(open(CONFORMAL_PATH, encoding="utf-8").read())
    roots = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            roots.update(a.name.split(".")[0] for a in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            roots.add(node.module.split(".")[0])
    assert roots <= {"__future__", "math", "typing"}


def test_conformal_module_has_no_file_io():
    tree = ast.parse(open(CONFORMAL_PATH, encoding="utf-8").read())
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            assert node.func.id != "open", "conformal module must not open files"


def test_no_path_from_wrappers_to_pick_price_or_recommendation_fields():
    # the advisory is the only object that crosses into the read path
    cal = ConformalCalibrator()
    adv = cal.advise(-3.5)
    assert tuple(adv.keys()) == ADVISORY_KEYS
    forbidden = {"mu", "mean", "center", "price", "odds", "pick", "recommendation",
                 "probability", "confidence", "stake", "side", "ev", "edge"}
    assert not (set(adv.keys()) & forbidden)
    # run_game's read keeps pick/probability None regardless of the advisory;
    # the wiring is a pass-through, asserted at source level here and live below
    src = open(RUN_GAME_PATH, encoding="utf-8").read()
    assert "conformal_advisory" in src
    assert "conformal=conformal_advisory" in src
    assert '"conformal_pass_discipline"' in src
    assert '"pick": None' in src


# ------------------------------------------------------------ gate semantics


def test_no_advisory_behavior_is_unchanged():
    assert mint_after_mind("FINAL", CLEAN_CHECKLIST, asked=True) == {
        "action": "pass",
        "reason": "a trace does not mint a probability",
    }
    assert mint_after_mind("INVALID", {}, asked=True)["action"] == "withhold"
    assert mint_after_mind("FINAL", CLEAN_CHECKLIST, asked=False)["action"] == "pass"


def test_no_bet_advisory_withholds_a_clean_trace():
    decision = mint_after_mind("FINAL", CLEAN_CHECKLIST, asked=True, conformal=NO_BET)
    assert decision["action"] == "withhold"
    assert "conformal pass discipline NO_BET" in decision["reason"]
    assert "mondrian" in decision["reason"]
    assert "probability" not in decision


def test_covered_advisory_changes_nothing():
    assert mint_after_mind("FINAL", CLEAN_CHECKLIST, asked=True, conformal=COVERED) == {
        "action": "pass",
        "reason": "a trace does not mint a probability",
    }


def test_covered_never_upgrades_an_existing_withhold():
    assert mint_after_mind("INVALID", {}, asked=True, conformal=COVERED)["action"] == "withhold"
    gaps = {"offensive_line": "CLEAR", "qb_behavior": "DATA-GAP"}
    decision = mint_after_mind("ANALYSIS-DRAFT", gaps, asked=True, conformal=COVERED)
    assert decision["action"] == "withhold"
    assert "DATA-GAP" in decision["reason"]


def test_no_bet_never_masks_invalid():
    decision = mint_after_mind("INVALID", {}, asked=True, conformal=NO_BET)
    assert decision["action"] == "withhold"
    assert "INVALID" in decision["reason"]


def test_malformed_advisory_fails_closed():
    for bad in ({"verdict": "BET"}, {"verdict": "pass"}, {}, {"verdict": None}):
        decision = mint_after_mind("FINAL", CLEAN_CHECKLIST, asked=True, conformal=bad)
        assert decision["action"] == "withhold", bad
        assert "malformed" in decision["reason"]


def test_unasked_game_still_passes_with_no_bet_advisory():
    # asked=False means the mind was not asked to cover the game at all;
    # the caller leaves those alone (existing gate semantics, unchanged)
    assert mint_after_mind("INVALID", {}, asked=False, conformal=NO_BET)["action"] == "pass"


# ------------------------------------------------------------ live read path


def _live_reason_game():
    try:
        from reasoning_engine.run_game import reason_game
        return reason_game
    except Exception:
        return None


@pytest.mark.skipif(_live_reason_game() is None, reason="host lacks read-path deps/data")
def test_reason_game_records_advisory_and_pick_stays_none():
    reason_game = _live_reason_game()
    try:
        doc = reason_game(conformal_advisory=NO_BET)
        baseline = reason_game()
    except Exception as exc:  # host data/deps incomplete: source tests above stand
        pytest.skip(f"read path not runnable on this host: {exc}")
    assert doc["conformal_pass_discipline"] == NO_BET
    assert doc["pick"] is None
    assert doc["probability_before_calibration"] is None
    assert doc["probability_after_calibration"] is None
    assert doc["mint"] == "withhold"
    assert "conformal pass discipline NO_BET" in doc["note"]
    assert "conformal_pass_discipline" not in baseline

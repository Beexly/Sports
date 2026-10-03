"""Production qb ids are GSIS ids. A slug is a gap, not a lookup miss."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src")
for p in (ROOT, SRC):
    if p not in sys.path:
        sys.path.insert(0, p)

from integration.providers import DataGapError
from qb_behavior.identity import is_gsis_id
from qb_behavior.situational.provider import SituationalQBProvider


def test_gsis_shape():
    assert is_gsis_id("00-0033537") is True
    assert is_gsis_id("deshaun-watson") is False
    assert is_gsis_id("00-33537") is False
    assert is_gsis_id(None) is False


def test_slug_is_a_named_gap_before_the_store():
    provider = SituationalQBProvider()
    try:
        provider.get_qb_profile("deshaun-watson", 4, 2026)
    except DataGapError as exc:
        assert "not an nflverse GSIS id" in str(exc)
        assert "0.5" not in str(exc)
    else:
        raise AssertionError("a slug must not resolve")

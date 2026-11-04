"""Tests for the corpus manifest data contract."""

from __future__ import annotations

import json

from intelligence.research import corpus_contract as cc

GOOD = {
    "source": "arxiv",
    "source_id": "2603.25901",
    "title": "Decoding Defensive Coverage Responsibilities",
    "abstract": "We model per-defender coverage assignment.",
    "year": 2026,
    "topics": ["coverage_scheme"],
}


def _manifest(tmp_path, lines):
    p = tmp_path / "manifest.jsonl"
    p.write_text("\n".join(lines), encoding="utf-8")
    return p


# --- the two failure modes measured in corpus_index ------------------------

def test_int_title_is_an_error():
    """A non-str title crashed build_index; the contract must catch it first."""
    row = dict(GOOD, title=12345)
    report = cc.validate_record(row)
    assert not report.ok
    assert [i.field for i in report.errors] == ["title"]
    assert "string" in report.errors[0].message


def test_list_abstract_is_an_error():
    row = dict(GOOD, abstract=["pressure", "disguise"])
    report = cc.validate_record(row)
    assert not report.ok
    assert [i.field for i in report.errors] == ["abstract"]


def test_missing_title_is_an_error():
    row = {k: v for k, v in GOOD.items() if k != "title"}
    report = cc.validate_record(row)
    assert not report.ok
    assert "unretrievable" in report.errors[0].message


def test_empty_title_is_an_error():
    report = cc.validate_record(dict(GOOD, title="   "))
    assert not report.ok


# --- accepted shapes ------------------------------------------------------

def test_well_formed_record_passes():
    report = cc.validate_record(GOOD)
    assert report.ok
    assert report.issues == []


def test_explicit_nulls_are_accepted_as_absent():
    row = dict(GOOD, doi=None, url=None, pdf_url=None, venue=None)
    assert cc.validate_record(row).ok


def test_numeric_string_year_is_accepted():
    # Targets vary on whether year arrives as "2026" or 2026.
    assert cc.validate_record(dict(GOOD, year="2026")).ok


def test_bool_year_is_rejected():
    # isinstance(True, int) is True in Python, so this needs an explicit guard.
    report = cc.validate_record(dict(GOOD, year=True))
    assert not report.ok


def test_non_numeric_string_year_is_rejected():
    report = cc.validate_record(dict(GOOD, year="recent"))
    assert not report.ok


# --- topics ---------------------------------------------------------------

def test_string_topics_is_an_error():
    """A bare string would index per character, not per topic."""
    report = cc.validate_record(dict(GOOD, topics="coverage_scheme"))
    assert not report.ok
    assert [i.field for i in report.errors] == ["topics"]


def test_topics_with_non_string_member_is_an_error():
    report = cc.validate_record(dict(GOOD, topics=["ok", 7]))
    assert not report.ok
    assert "str" in report.errors[0].message


# --- provenance -----------------------------------------------------------

def test_missing_source_is_a_warning_not_an_error():
    row = {k: v for k, v in GOOD.items() if k != "source"}
    report = cc.validate_record(row)
    assert report.ok, "a sourceless row is still indexable"
    assert any(i.field == "source" for i in report.warnings)


def test_unregistered_source_warns():
    report = cc.validate_record(dict(GOOD, source="mystery_feed"))
    assert report.ok
    assert any("not a registered source" in i.message for i in report.warnings)


# --- data preservation ----------------------------------------------------

def test_unknown_keys_are_preserved():
    row = dict(GOOD, custom_field="keep me", nested={"a": 1})
    report = cc.validate_record(row)
    assert report.ok
    assert report.record["custom_field"] == "keep me"
    assert report.record["nested"] == {"a": 1}


def test_validation_does_not_mutate_the_input():
    row = dict(GOOD, tags=[1, 2])
    before = json.dumps(row, sort_keys=True)
    cc.validate_record(row)
    assert json.dumps(row, sort_keys=True) == before


# --- non-dict rows --------------------------------------------------------

def test_non_dict_row_is_an_error():
    for bad in (["a", "list"], "a string", 42, None):
        report = cc.validate_record(bad)
        assert not report.ok, bad
        assert report.errors[0].field == "<record>"


# --- manifest audit -------------------------------------------------------

def test_audit_counts_valid_and_invalid(tmp_path):
    good = json.dumps(GOOD)
    bad_type = json.dumps(dict(GOOD, title=999))
    p = _manifest(tmp_path, [good, bad_type, "{not json", "", good])
    report = cc.audit_manifest(p)
    assert report.total_lines == 4, "blank lines are not rows"
    assert report.valid == 2
    assert report.invalid == 1
    assert report.rows_with_errors == 1
    assert report.error_count >= 2
    assert not report.ok
    assert report.by_field["title"] == 1


def test_audit_reports_line_numbers(tmp_path):
    p = _manifest(tmp_path, [json.dumps(GOOD), "{oops"])
    report = cc.audit_manifest(p)
    assert any("line 2" in s for s in report.samples)


def test_audit_of_clean_manifest_is_ok(tmp_path):
    p = _manifest(tmp_path, [json.dumps(GOOD)] * 3)
    report = cc.audit_manifest(p)
    assert report.ok
    assert report.valid == 3


# --- the fix this contract guards -----------------------------------------

def test_contract_catches_what_used_to_crash_the_index(tmp_path):
    """Regression tie-in: every row the contract rejects is one that used to
    either crash build_index or silently index as an empty document."""
    from intelligence.research import corpus_index as ci

    crashing = [
        dict(GOOD, source_id="int_title", title=12345),
        dict(GOOD, source_id="list_abstract", abstract=["a", "b"]),
    ]
    for row in crashing:
        assert not cc.validate_record(row).ok, row["source_id"]

    # And after the coercion fix, the indexer survives them rather than dying.
    p = _manifest(tmp_path, [json.dumps(r) for r in crashing])
    idx = ci.build_index(p)
    assert idx["n"] == 2

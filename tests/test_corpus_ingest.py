"""Tests for validated batch ingestion with a dead letter queue."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
_MOD = REPO / "scripts" / "ops" / "corpus_ingest.py"

_spec = importlib.util.spec_from_file_location("corpus_ingest", _MOD)
ci = importlib.util.module_from_spec(_spec)
sys.modules["corpus_ingest"] = ci
_spec.loader.exec_module(ci)  # type: ignore[union-attr]


GOOD = {
    "source": "arxiv",
    "source_id": "2603.25901",
    "title": "Decoding Defensive Coverage Responsibilities",
    "abstract": "We model per-defender coverage assignment.",
    "year": 2026,
    "topics": ["coverage_scheme"],
}


def _manifest(tmp_path, rows, name="m.jsonl"):
    p = tmp_path / name
    lines = [r if isinstance(r, str) else json.dumps(r) for r in rows]
    p.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return p


def _run(tmp_path, rows, name="m.jsonl"):
    src = _manifest(tmp_path, rows, name)
    out = tmp_path / "clean.jsonl"
    dlq = tmp_path / "dlq.jsonl"
    m = ci.ingest([src], out, dlq)
    clean = [json.loads(l) for l in out.read_text(encoding="utf-8").splitlines() if l.strip()]
    dead = [json.loads(l) for l in dlq.read_text(encoding="utf-8").splitlines() if l.strip()]
    return m, clean, dead


# --- routing --------------------------------------------------------------

def test_valid_rows_reach_the_sink(tmp_path):
    m, clean, dead = _run(tmp_path, [GOOD, GOOD])
    assert m["accepted"] == 2
    assert m["rejected"] == 0
    assert len(clean) == 2
    assert dead == []


def test_invalid_rows_reach_the_dlq(tmp_path):
    m, clean, dead = _run(tmp_path, [GOOD, dict(GOOD, title=12345)])
    assert m["accepted"] == 1
    assert m["rejected"] == 1
    assert len(clean) == 1
    assert len(dead) == 1
    assert dead[0]["stage"] == "schema_validation"


def test_one_bad_row_does_not_abort_the_batch(tmp_path):
    """The whole reason this stage exists: per-row isolation.

    Before it, a single int title crashed build_index and the entire 6,495-row
    corpus produced nothing.
    """
    rows = [GOOD, dict(GOOD, title=999), GOOD, dict(GOOD, abstract=["a"]), GOOD]
    m, clean, dead = _run(tmp_path, rows)
    assert m["accepted"] == 3, "rows after the bad ones must still be processed"
    assert m["rejected"] == 2
    assert len(clean) == 3
    assert len(dead) == 2


def test_unparseable_line_goes_to_dlq_not_nowhere(tmp_path):
    m, clean, dead = _run(tmp_path, [GOOD, "{not json", GOOD])
    assert m["unparseable"] == 1
    assert m["accepted"] == 2
    assert len(dead) == 1
    assert dead[0]["issues"][0]["field"] == "<json>"


def test_blank_lines_are_not_rows(tmp_path):
    src = _manifest(tmp_path, [GOOD])
    src.write_text(src.read_text(encoding="utf-8") + "\n\n\n", encoding="utf-8")
    m = ci.ingest([src], tmp_path / "c.jsonl", tmp_path / "d.jsonl")
    assert m["rows_read"] == 1


# --- DLQ record shape -----------------------------------------------------

def test_dlq_record_is_repairable_and_carries_context(tmp_path):
    _, _, dead = _run(tmp_path, [dict(GOOD, source_id="bad1", title=None)])
    rec = dead[0]
    assert rec["source_id"] == "bad1"
    assert rec["stage"] == "schema_validation"
    assert rec["raw"], "raw row must be preserved so quarantine is repairable"
    assert rec["raw"]["source_id"] == "bad1"
    assert rec["attempted_at"]
    assert rec["issues"] and rec["error"]


def test_dlq_uses_the_backfill_failure_field_names(tmp_path):
    """So one tool can read both fulltext_backfill_failures and this DLQ."""
    _, _, dead = _run(tmp_path, [dict(GOOD, title=None)])
    for field in ("source_id", "title", "error", "attempted_at"):
        assert field in dead[0], field


def test_dlq_records_the_line_number(tmp_path):
    _, _, dead = _run(tmp_path, [GOOD, dict(GOOD, title=None)])
    assert dead[0]["line"] == 2


# --- metadata -------------------------------------------------------------

def test_accepted_rows_carry_provenance_metadata(tmp_path):
    _, clean, _ = _run(tmp_path, [GOOD])
    assert clean[0]["_validated_at"]
    assert clean[0]["_ingest_source"] == "m.jsonl"


def test_metadata_does_not_clobber_producer_fields(tmp_path):
    _, clean, _ = _run(tmp_path, [GOOD])
    assert clean[0]["title"] == GOOD["title"]
    assert clean[0]["source_id"] == GOOD["source_id"]


# --- metrics --------------------------------------------------------------

def test_metrics_report_by_field_and_by_file(tmp_path):
    m, _, _ = _run(tmp_path, [GOOD, dict(GOOD, title=1), dict(GOOD, title=2)])
    assert m["by_field"]["title"] == 2
    assert m["by_file"]["m.jsonl"] == {"accepted": 1, "rejected": 2}
    assert m["accept_rate"] == 33.3


def test_accept_rate_is_zero_for_empty_input(tmp_path):
    src = tmp_path / "empty.jsonl"
    src.write_text("", encoding="utf-8")
    m = ci.ingest([src], None, None)
    assert m["rows_read"] == 0
    assert m["accept_rate"] == 0.0


# --- append semantics -----------------------------------------------------

def test_sink_is_append_only_across_runs(tmp_path):
    src = _manifest(tmp_path, [GOOD])
    out, dlq = tmp_path / "c.jsonl", tmp_path / "d.jsonl"
    ci.ingest([src], out, dlq)
    ci.ingest([src], out, dlq)
    assert len(out.read_text(encoding="utf-8").strip().splitlines()) == 2


def test_dry_run_writes_nothing(tmp_path):
    src = _manifest(tmp_path, [GOOD, dict(GOOD, title=None)])
    m = ci.ingest([src], None, None)
    assert m["accepted"] == 1 and m["rejected"] == 1
    assert not list(tmp_path.glob("*.jsonl"))[1:], "no sink files should be created"


# --- input handling -------------------------------------------------------

def test_expand_inputs_deduplicates_overlapping_patterns(tmp_path):
    p = _manifest(tmp_path, [GOOD])
    paths = ci.expand_inputs([str(p), str(tmp_path / "*.jsonl")])
    assert len(paths) == 1


def test_missing_input_is_skipped_not_fatal(tmp_path):
    m = ci.ingest([tmp_path / "nope.jsonl"], tmp_path / "c.jsonl", tmp_path / "d.jsonl")
    assert m["files"] == 0
    assert m["rows_read"] == 0

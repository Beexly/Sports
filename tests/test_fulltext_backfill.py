"""Tests for scripts/research/fulltext_backfill.py — pure functions only, no network."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts" / "research"))

import fulltext_backfill as fb


# -- extract_arxiv_id ------------------------------------------------------

def test_extracts_new_style_from_arxiv_source_id():
    rec = {"source": "arxiv", "source_id": "2403.14769v2"}
    assert fb.extract_arxiv_id(rec) == "2403.14769"


def test_extracts_new_style_from_arxiv_url():
    rec = {"source": "openalex", "source_id": "W4414938691",
           "url": "https://openalex.org/W4414938691",
           "pdf_url": "https://arxiv.org/pdf/2511.09455"}
    assert fb.extract_arxiv_id(rec) == "2511.09455"


def test_extracts_from_abs_url_with_version():
    rec = {"source": "openalex", "source_id": "W1",
           "url": "http://arxiv.org/abs/2403.14769v2",
           "pdf_url": None}
    assert fb.extract_arxiv_id(rec) == "2403.14769"


def test_extracts_old_style_from_arxiv_source_id():
    rec = {"source": "arxiv", "source_id": "math/9705204"}
    assert fb.extract_arxiv_id(rec) == "math/9705204"


def test_extracts_old_style_with_version_suffix():
    rec = {"source": "arxiv", "source_id": "hep-th/9901001v3"}
    assert fb.extract_arxiv_id(rec) == "hep-th/9901001"


def test_returns_none_for_openalex_only_record():
    rec = {"source": "openalex", "source_id": "W3208195064",
           "url": "https://openalex.org/W3208195064",
           "pdf_url": None}
    assert fb.extract_arxiv_id(rec) is None


def test_doi_numeric_suffix_is_not_an_arxiv_id():
    rec = {"source": "openalex", "source_id": "W4403471494",
           "url": "https://openalex.org/W4403471494",
           "doi": "https://doi.org/10.12996/gmj.2023.4000",
           "pdf_url": None}
    assert fb.extract_arxiv_id(rec) is None


def test_non_arxiv_pdf_path_is_not_an_arxiv_id():
    rec = {"source": "openalex", "source_id": "W2750121529",
           "url": "https://openalex.org/W2750121529",
           "pdf_url": "https://jamanetwork.com/journals/jama/articlepdf/2645104/x.pdf"}
    assert fb.extract_arxiv_id(rec) is None


def test_returns_none_for_bare_openalex_style_id():
    assert fb.extract_arxiv_id({"source": "arxiv", "source_id": "W123"}) is None
    assert fb.extract_arxiv_id({}) is None
    assert fb.extract_arxiv_id({"source": None, "source_id": None}) is None


# -- is_eligible / iter_eligible / count_eligible ----------------------------

def test_eligible_requires_missing_full_text_and_arxiv_id():
    ok = {"source": "arxiv", "source_id": "2403.14769v2", "full_text": ""}
    assert fb.is_eligible(ok) is True
    assert fb.is_eligible({**ok, "full_text": "already here"}) is False
    assert fb.is_eligible({"source": "openalex", "source_id": "W1", "url": "https://openalex.org/W1"}) is False
    assert fb.is_eligible({"source": "arxiv", "source_id": "bad-id", "full_text": ""}) is False


def test_iter_eligible_skips_done_ids():
    rows = [
        {"source": "arxiv", "source_id": "2403.14769v2", "full_text": ""},
        {"source": "arxiv", "source_id": "1906.01760v3", "full_text": ""},
        {"source": "openalex", "source_id": "W9", "url": "https://openalex.org/W9", "full_text": ""},
    ]
    out = list(fb.iter_eligible(rows, {"2403.14769"}))
    assert [aid for _, aid in out] == ["1906.01760"]


def test_count_eligible_counts_rows_and_unique_ids():
    rows = [
        {"source": "arxiv", "source_id": "2403.14769v2", "full_text": ""},
        {"source": "openalex", "source_id": "W1", "url": "https://openalex.org/W1",
         "pdf_url": "https://arxiv.org/pdf/2403.14769", "full_text": ""},  # dup arxiv id
        {"source": "arxiv", "source_id": "1906.01760v3", "full_text": ""},
        {"source": "arxiv", "source_id": "2211.00001v1", "full_text": "has text"},
    ]
    rows_count, unique = fb.count_eligible(rows)
    assert rows_count == 3
    assert unique == {"2403.14769", "1906.01760"}


# -- resume: load_done_ids ----------------------------------------------------

def test_load_done_ids_reads_existing_output(tmp_path):
    out = tmp_path / "backfill.jsonl"
    out.write_text(
        json.dumps({"arxiv_id": "2403.14769", "full_text": "x"}) + "\n"
        + json.dumps({"arxiv_id": "1906.01760", "full_text": "y"}) + "\n"
        + "\n",
        encoding="utf-8",
    )
    assert fb.load_done_ids(out) == {"2403.14769", "1906.01760"}


def test_load_done_ids_missing_file_is_empty_set(tmp_path):
    assert fb.load_done_ids(tmp_path / "does-not-exist.jsonl") == set()


def test_load_done_ids_tolerates_bad_lines(tmp_path):
    out = tmp_path / "backfill.jsonl"
    out.write_text("not json\n" + json.dumps({"arxiv_id": "1.2.3"}) + "\n", encoding="utf-8")
    assert fb.load_done_ids(out) == {"1.2.3"}


# -- extract_text: normalise bridge payloads ---------------------------------

def test_extract_text_from_plain_string():
    assert fb.extract_text("hello") == "hello"


def test_extract_text_from_common_dict_keys():
    assert fb.extract_text({"full_text": "abc"}) == "abc"
    assert fb.extract_text({"text": "def"}) == "def"
    assert fb.extract_text({"content": "ghi"}) == "ghi"


def test_extract_text_from_nested_dict():
    assert fb.extract_text({"paper": {"full_text": "nested"}}) == "nested"


def test_extract_text_empty_on_unknown_shape():
    assert fb.extract_text({"unrelated": 1}) == ""


# -- make_output_record -------------------------------------------------------

def test_make_output_record_preserves_manifest_fields():
    rec = {"source": "arxiv", "source_id": "2403.14769v2", "title": "T",
           "abstract": "A", "full_text": "", "topics": ["x"]}
    out = fb.make_output_record(rec, "2403.14769", "FULL", "download", now="2026-11-04T00:00:00+00:00")
    assert out["title"] == "T"
    assert out["full_text"] == "FULL"
    assert out["arxiv_id"] == "2403.14769"
    assert out["backfill_method"] == "download"
    assert out["backfilled_at"] == "2026-11-04T00:00:00+00:00"
    assert rec["full_text"] == ""  # input untouched

"""Tests for the --min-priority filter in scripts/ops/build_corpus_index.py.

Semantics under test: _merge_prio is an inverted priority (1 is best, 9 is
worst). ``--min-priority T`` drops records with _merge_prio >= T *before*
indexing, so ``--min-priority 9`` keeps 1-8 and drops the 9 v1 contamination.

No network, no real manifest -- all fixtures are tiny temp JSONL files.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from intelligence.research import corpus_index as ci  # noqa: E402

BUILDER_PATH = REPO / "scripts" / "ops" / "build_corpus_index.py"


def _load_builder():
    spec = importlib.util.spec_from_file_location(
        "build_corpus_index", BUILDER_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


builder = _load_builder()


def _rec(source_id: str, prio, title: str | None = None) -> dict:
    """Minimal manifest record; prio=None means the field is omitted."""
    record = {
        "source": "arxiv",
        "source_id": source_id,
        "title": title or f"Paper {source_id}",
        "abstract": f"Abstract for paper {source_id} about coverage",
        "year": 2026,
        "topics": ["coverage_scheme"],
    }
    if prio is not None:
        record["_merge_prio"] = prio
    return record


def _write_manifest(tmp_path: Path, records: list[dict],
                    name: str = "manifest.jsonl") -> Path:
    path = tmp_path / name
    path.write_text("\n".join(json.dumps(r) for r in records) + "\n",
                    encoding="utf-8")
    return path


def test_threshold_9_keeps_1_to_8_drops_9_and_above(tmp_path):
    records = [
        _rec("p1", 1),
        _rec("p2", 2),
        _rec("p3", 3),
        _rec("p4", 4),
        _rec("p8", 8),
        _rec("p9a", 9),
        _rec("p9b", 9),
        _rec("p10", 10),
    ]
    src = _write_manifest(tmp_path, records)
    dest = tmp_path / "filtered.jsonl"

    kept, dropped = builder.write_filtered_manifest(src, 9, dest)

    assert (kept, dropped) == (5, 3)
    surviving = [json.loads(line) for line in
                 dest.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert [r["source_id"] for r in surviving] == ["p1", "p2", "p3", "p4", "p8"]
    assert all(r["_merge_prio"] < 9 for r in surviving)
    # The filter runs before indexing: the filtered manifest indexes to 5.
    assert ci.build_index(dest)["n"] == 5


def test_no_filter_keeps_everything(tmp_path):
    records = [_rec("a", 9), _rec("b", 1), _rec("c", None)]
    src = _write_manifest(tmp_path, records)
    dest = tmp_path / "filtered.jsonl"

    kept, dropped = builder.write_filtered_manifest(src, None, dest)

    assert (kept, dropped) == (3, 0)
    surviving = [json.loads(line) for line in
                 dest.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert [r["source_id"] for r in surviving] == ["a", "b", "c"]
    assert builder._should_keep({"_merge_prio": 9}, None) is True


def test_missing_and_nonnumeric_prio_are_kept(tmp_path):
    records = [
        _rec("missing", None),          # field absent -> keep
        _rec("bad", "not-a-number"),    # unparseable -> keep
        _rec("str9", "9"),              # numeric string -> honour it, drop
        _rec("good", 2),
    ]
    src = _write_manifest(tmp_path, records)
    dest = tmp_path / "filtered.jsonl"

    kept, dropped = builder.write_filtered_manifest(src, 9, dest)

    assert (kept, dropped) == (3, 1)
    surviving_ids = [json.loads(line)["source_id"] for line in
                     dest.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert surviving_ids == ["missing", "bad", "good"]


def test_threshold_is_exclusive_upper_bound():
    # --min-priority 2 keeps only priority 1; equality means dropped.
    assert builder._should_keep({"_merge_prio": 1}, 2) is True
    assert builder._should_keep({"_merge_prio": 2}, 2) is False
    assert builder._should_keep({"_merge_prio": 8}, 9) is True
    assert builder._should_keep({"_merge_prio": 9}, 9) is False


def test_builder_main_applies_flag_and_reports_stats(tmp_path):
    records = [
        _rec("keep1", 1),
        _rec("keep2", 2),
        _rec("keep3", 3),
        _rec("keep8", 8),
        _rec("drop9a", 9),
        _rec("drop9b", 9),
    ]
    manifest = _write_manifest(tmp_path, records)

    out = tmp_path / "out_filtered"
    rc = builder.main(["--manifest", str(manifest), "--out", str(out),
                       "--min-priority", "9"])
    assert rc == 0
    stats = json.loads((out / "corpus_index_stats.json").read_text(
        encoding="utf-8"))
    assert stats["min_priority"] == 9
    assert stats["records_excluded_by_priority"] == 2
    assert stats["raw_records"] == 4
    assert stats["deduped_records"] == 4
    feed_lines = (out / "corpus_mindfeed.jsonl").read_text(
        encoding="utf-8").splitlines()
    assert len(feed_lines) == 4


def test_builder_main_default_behavior_unchanged(tmp_path):
    records = [
        _rec("k1", 1),
        _rec("k2", 2),
        _rec("d9a", 9),
        _rec("d9b", 9),
    ]
    manifest = _write_manifest(tmp_path, records)

    out = tmp_path / "out_default"
    rc = builder.main(["--manifest", str(manifest), "--out", str(out)])
    assert rc == 0
    stats = json.loads((out / "corpus_index_stats.json").read_text(
        encoding="utf-8"))
    assert stats["min_priority"] is None
    assert stats["records_excluded_by_priority"] == 0
    assert stats["raw_records"] == 4
    assert stats["deduped_records"] == 4

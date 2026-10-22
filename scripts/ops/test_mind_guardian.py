"""
Tests for the Mind Guardian ingestion daemon.

Written BEFORE the implementation (TDD). Every test here must fail first for the
reason the feature is missing, then pass.

Run from the repo root:
    python -m pytest scripts/ops/test_mind_guardian.py -o pythonpath=. -o addopts=""
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import sys
import zipfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

from mind_guardian_daemon import (  # noqa: E402
    BUCKETS,
    MindGuardian,
    categorize,
    extract_text,
    is_sensitive,
    sha256_file,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_docx(path: Path, text: str) -> None:
    """A minimal but VALID .docx, built by hand so the test needs no python-docx."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w") as z:
        z.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-'
            'officedocument.wordprocessingml.document.main+xml"/></Types>',
        )
        z.writestr(
            "word/document.xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            f"<w:body><w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:body></w:document>",
        )


def _make_pdf(path: Path, text: str) -> None:
    import fitz  # pymupdf

    path.parent.mkdir(parents=True, exist_ok=True)
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    doc.save(str(path))
    doc.close()


@pytest.fixture()
def repo(tmp_path: Path) -> Path:
    """A miniature repo root with the three watched directories."""
    root = tmp_path / "repo"
    for d in ("Downloads", "data/snapshots", ".hermes", "brain/feeds"):
        (root / d).mkdir(parents=True, exist_ok=True)
    return root


@pytest.fixture()
def guardian(repo: Path) -> MindGuardian:
    return MindGuardian(
        repo_root=repo,
        watch_dirs=[repo / "Downloads", repo / "data" / "snapshots", repo / ".hermes"],
        today="2026-10-12",
    )


# ---------------------------------------------------------------------------
# Hashing
# ---------------------------------------------------------------------------

def test_sha256_matches_hashlib(tmp_path: Path):
    f = tmp_path / "a.txt"
    f.write_bytes(b"hello world")
    assert sha256_file(f) == hashlib.sha256(b"hello world").hexdigest()


def test_sha256_differs_for_different_content(tmp_path: Path):
    a, b = tmp_path / "a.txt", tmp_path / "b.txt"
    a.write_text("one", encoding="utf-8")
    b.write_text("two", encoding="utf-8")
    assert sha256_file(a) != sha256_file(b)


# ---------------------------------------------------------------------------
# Extraction — one format at a time
# ---------------------------------------------------------------------------

def test_extract_plain_text(tmp_path: Path):
    f = tmp_path / "note.txt"
    f.write_text("engine research on EPA", encoding="utf-8")
    assert "EPA" in (extract_text(f) or "")


def test_extract_markdown(tmp_path: Path):
    f = tmp_path / "note.md"
    f.write_text("# Title\n\nbody text", encoding="utf-8")
    assert "body text" in (extract_text(f) or "")


def test_extract_json(tmp_path: Path):
    f = tmp_path / "d.json"
    f.write_text(json.dumps({"metric": "shin_devig", "value": 0.53}), encoding="utf-8")
    out = extract_text(f) or ""
    assert "shin_devig" in out


def test_extract_csv_preserves_headers_and_rows(tmp_path: Path):
    f = tmp_path / "t.csv"
    f.write_text("player,line\nAllen,265.5\n", encoding="utf-8")
    out = extract_text(f) or ""
    assert "player" in out and "Allen" in out and "265.5" in out


def test_extract_docx(tmp_path: Path):
    f = tmp_path / "memo.docx"
    _make_docx(f, "DVOA regression findings 2026")
    out = extract_text(f) or ""
    assert "DVOA regression findings" in out


def test_extract_pdf(tmp_path: Path):
    f = tmp_path / "paper.pdf"
    _make_pdf(f, "Tail risk in same game parlays")
    out = extract_text(f) or ""
    assert "same game parlays" in out


def test_extract_returns_none_for_an_unsupported_extension(tmp_path: Path):
    f = tmp_path / "blob.xyz"
    f.write_bytes(b"\x00\x01\x02")
    assert extract_text(f) is None


def test_extract_returns_none_for_a_corrupt_docx_rather_than_raising(tmp_path: Path):
    """A half-downloaded zip must not take the daemon down."""
    f = tmp_path / "broken.docx"
    f.write_bytes(b"not a zip at all")
    assert extract_text(f) is None


def test_extract_returns_none_for_a_corrupt_pdf(tmp_path: Path):
    f = tmp_path / "broken.pdf"
    f.write_bytes(b"%PDF-1.4 truncated")
    assert extract_text(f) is None


# ---------------------------------------------------------------------------
# Categorization into the canonical buckets
# ---------------------------------------------------------------------------

def test_buckets_are_the_seven_canonical_dated_buckets():
    assert set(BUCKETS) == {
        "dfs", "predictions", "props", "fantasy",
        "engine", "data-sources", "arxiv-program",
    }


@pytest.mark.parametrize(
    "text,expected",
    [
        ("DraftKings lineup optimizer salary cap showdown", "dfs"),
        ("moneyline spread total closing line value opening line", "predictions"),
        ("player prop receiving yards over 72.5 anytime touchdown", "props"),
        ("season-long projections rankings waivers redraft league", "fantasy"),
        ("spectral solver Navier-Stokes operator eigenfunction", "engine"),
        ("nflverse play-by-play ingest feed source registry", "data-sources"),
        ("arxiv paper corpus of 1000 valuable papers literature", "arxiv-program"),
    ],
)
def test_categorize_routes_to_the_right_bucket(text, expected):
    assert categorize("doc.md", text) == expected


def test_categorize_is_deterministic_and_always_returns_a_known_bucket():
    text = "some ambiguous content about a game"
    first = categorize("x.md", text)
    assert first in BUCKETS
    assert categorize("x.md", text) == first


def test_categorize_falls_back_rather_than_raising_on_empty_text():
    assert categorize("empty.txt", "") in BUCKETS


# ---------------------------------------------------------------------------
# Sensitivity routing
# ---------------------------------------------------------------------------

def test_detects_openai_style_key():
    assert is_sensitive("c.txt", "OPENAI_API_KEY=sk-proj-abc123def456ghi789")


def test_detects_a_postgres_connection_string():
    assert is_sensitive("c.txt", "postgresql://user:hunter2@db.internal:5432/db")  # scan_sensitive: allow db.url.with-password


def test_detects_an_assignment_style_password():
    assert is_sensitive("c.txt", "password = correct-horse-battery")


def test_ordinary_research_text_is_not_sensitive():
    assert not is_sensitive("r.md", "The EPA per play regression shows a 0.42 correlation.")


def test_sensitivity_is_triggered_by_the_filename_too():
    assert is_sensitive("credentials.txt", "nothing obviously secret in here")


def test_detects_google_client_secret_filename():
    assert is_sensitive("client_secret_868513040414.apps.googleusercontent.com.json", "{}")


def test_detects_env_filename_variants():
    assert is_sensitive("env (2).txt", "foo=bar")
    assert is_sensitive("env.txt", "foo=bar")
    assert is_sensitive("hf_env.txt", "foo=bar")


def test_detects_pgpassword_and_neon_token():
    dummy_neon = "npg_" + "a1B2c3D4e5F6g7H8"
    assert is_sensitive("note.txt", f"PGPASSWORD={dummy_neon}")


def test_detects_huggingface_token():
    dummy_hf = "hf_" + "a" * 34
    assert is_sensitive("note.txt", dummy_hf)


# ---------------------------------------------------------------------------
# The full drop: hash -> extract -> route -> index
# ---------------------------------------------------------------------------

def test_scan_once_ingests_a_dropped_file_end_to_end(repo: Path, guardian: MindGuardian):
    drop = repo / "Downloads" / "epa-notes.md"
    drop.write_text("engine research: EPA per play opponent adjustment", encoding="utf-8")

    results = guardian.scan_once()

    assert len(results) == 1
    r = results[0]
    assert r.duplicate is False
    assert r.sensitive is False
    assert r.sha256 == hashlib.sha256(drop.read_bytes()).hexdigest()
    assert r.bucket == "engine"
    # filed into the canonical dated bucket
    assert Path(r.target_path) == repo / "docs" / "engine" / "research" / "2026-10-12" / drop.name
    assert Path(r.target_path).exists(), "the document must land in the bucket"
    # appended to the dated trainer feed
    assert Path(r.feed_path) == repo / "brain" / "feeds" / "2026-10-12" / "trainer_feed.jsonl"
    rows = [json.loads(l) for l in Path(r.feed_path).read_text(encoding="utf-8").splitlines() if l.strip()]
    assert len(rows) == 1
    assert "EPA per play" in rows[0]["text"]
    assert rows[0]["path"]


def test_second_scan_of_the_same_file_is_a_no_op(repo: Path, guardian: MindGuardian):
    (repo / "Downloads" / "once.txt").write_text("engine operator paper", encoding="utf-8")

    first = guardian.scan_once()
    assert [r.duplicate for r in first] == [False]

    second = guardian.scan_once()
    assert len(second) == 1 and second[0].duplicate is True

    # exactly one feed row survives: dedupe is by content hash, not by filename
    feed = repo / "brain" / "feeds" / "2026-10-12" / "trainer_feed.jsonl"
    rows = [l for l in feed.read_text(encoding="utf-8").splitlines() if l.strip()]
    assert len(rows) == 1


def test_the_same_content_under_a_new_name_is_still_a_duplicate(repo: Path, guardian: MindGuardian):
    """Rename must not defeat dedupe; only new CONTENT is new work."""
    body = "engine research: identical body text"
    (repo / "Downloads" / "a.md").write_text(body, encoding="utf-8")
    guardian.scan_once()
    (repo / "Downloads" / "b.md").write_text(body, encoding="utf-8")
    results = guardian.scan_once()
    assert results[0].duplicate is True


def test_sensitive_files_go_to_the_vault_and_never_to_docs_or_the_feed(repo: Path, guardian: MindGuardian):
    (repo / "Downloads" / "creds.txt").write_text(
        "AWS_SECRET_ACCESS_KEY=abcd1234efgh5678", encoding="utf-8"
    )

    results = guardian.scan_once()
    r = results[0]
    assert r.sensitive is True
    assert "local_vault" in Path(r.target_path).parts
    assert Path(r.target_path).exists()
    # and nothing leaked into the tracked tree
    assert not (repo / "docs").exists() or not any((repo / "docs").rglob("creds.txt"))
    feed = repo / "brain" / "feeds" / "2026-10-12" / "trainer_feed.jsonl"
    if feed.exists():
        assert "abcd1234efgh5678" not in feed.read_text(encoding="utf-8")


def test_scan_once_covers_all_three_watched_directories(repo: Path, guardian: MindGuardian):
    (repo / "Downloads" / "d.md").write_text("dfs optimizer lineup", encoding="utf-8")
    (repo / "data" / "snapshots" / "s.json").write_text('{"metric":"epa"}', encoding="utf-8")
    (repo / ".hermes" / "h.txt").write_text("engine physics solver", encoding="utf-8")

    results = guardian.scan_once()
    assert len(results) == 3
    assert {r.bucket for r in results} >= {"dfs", "engine"}


def test_mixed_batch_reports_each_file_independently(repo: Path, guardian: MindGuardian):
    (repo / "Downloads" / "good.md").write_text("engine research", encoding="utf-8")
    (repo / "Downloads" / "bad.xyz").write_bytes(b"\x00\x01")

    results = guardian.scan_once()
    by_name = {Path(r.source_path).name: r for r in results}
    assert by_name["good.md"].skipped_reason is None
    assert by_name["bad.xyz"].skipped_reason is not None
    assert Path(by_name["bad.xyz"].target_path or ".").exists() is False


def test_ledger_persists_across_guardian_instances(repo: Path):
    (repo / "Downloads" / "x.md").write_text("engine solver", encoding="utf-8")
    g1 = MindGuardian(repo_root=repo, watch_dirs=[repo / "Downloads"], today="2026-10-12")
    assert g1.scan_once()[0].duplicate is False
    g2 = MindGuardian(repo_root=repo, watch_dirs=[repo / "Downloads"], today="2026-10-12")
    assert g2.scan_once()[0].duplicate is True


# ---------------------------------------------------------------------------
# Memory indexing
# ---------------------------------------------------------------------------

def test_ingest_writes_a_fact_into_the_memory_database(repo: Path):
    db = repo / "memory.db"
    g = MindGuardian(
        repo_root=repo,
        watch_dirs=[repo / "Downloads"],
        today="2026-10-12",
        memory_db=db,
    )
    (repo / "Downloads" / "finding.md").write_text(
        "engine research: spectral decay ratio measured", encoding="utf-8"
    )
    g.scan_once()

    conn = sqlite3.connect(str(db))
    try:
        rows = list(conn.execute("SELECT key, value, domain, source FROM facts"))
    finally:
        conn.close()
    assert rows, "the ingest must index at least one fact"
    key, value, domain, source = rows[0]
    assert key.startswith("ingested:")
    assert domain == "ingest"
    assert len(source) == 64, "source should be the sha256"
    assert "finding.md" in value


def test_indexed_facts_are_searchable_by_full_text(repo: Path):
    """The whole point of FTS: a later session can FIND what was ingested."""
    db = repo / "memory.db"
    g = MindGuardian(repo_root=repo, watch_dirs=[repo / "Downloads"],
                     today="2026-10-12", memory_db=db)
    (repo / "Downloads" / "shin.md").write_text(
        "engine research: Shin devig on Pinnacle two way lines", encoding="utf-8"
    )
    g.scan_once()

    sys.path.insert(0, str(repo.parent))
    conn = sqlite3.connect(str(db))
    try:
        hits = list(conn.execute(
            "SELECT f.key FROM facts f JOIN facts_fts ON f.rowid = facts_fts.rowid "
            "WHERE facts_fts MATCH ?", ("shin",)
        ))
    finally:
        conn.close()
    assert hits, "the FTS index must find the ingested document"


def test_a_sensitive_file_is_not_indexed_into_memory(repo: Path):
    db = repo / "memory.db"
    g = MindGuardian(repo_root=repo, watch_dirs=[repo / "Downloads"],
                     today="2026-10-12", memory_db=db)
    (repo / "Downloads" / "secret.txt").write_text(
        "postgresql://u:p@h:5432/db", encoding="utf-8"  # scan_sensitive: allow db.url.with-password
    )
    g.scan_once()
    conn = sqlite3.connect(str(db))
    try:
        n = list(conn.execute("SELECT COUNT(*) FROM facts"))[0][0]
    finally:
        conn.close()
    assert n == 0, "credentials must never be searchable in the memory index"

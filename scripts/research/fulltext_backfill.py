"""Backfill full text for corpus records that only carry title+abstract.

Loads the research-corpus manifest (read-only) and, for every record with no
``full_text`` but a recoverable arXiv id, fetches the paper body through the
working stdio bridge (``scripts/research/arxiv_bridge.py`` -> ``uvx
arxiv-mcp-server``). ``download()`` is tried first; ``abstract()`` is the
fallback when the PDF body is unavailable.

Output goes to a SEPARATE jsonl (never the manifest, which is treated as
read-only). Resumable: ids already present in the output file are skipped, so
an interrupted run can be re-launched safely. Per-record failures are appended
to a failures jsonl instead of aborting the run. A ``--delay`` (default 1s)
keeps calls polite; note arXiv's own API guidance is ~1 request / 3s, so
raise ``--delay`` for long runs.

Text-extraction gap: the arxiv server performs its own HTML-first extraction.
Neither ``markitdown`` nor ``MinerU`` is installed in this environment
(checked; both absent), and no heavy packages are installed by this script.
Where the server falls back to HTML, equations, tables and figure captions
may be degraded or missing compared to a PDF-native extractor.

Usage:
    python scripts/research/fulltext_backfill.py --dry-run
    python scripts/research/fulltext_backfill.py --max-records 5
    python scripts/research/fulltext_backfill.py  # full run, resumable
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator

# Imported lazily inside main()/run so the pure helpers below stay importable
# (and testable) without starting the MCP server.
if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

DEFAULT_CORPUS_DIR = Path(
    r"C:/Users/Garrett/AppData/Local/hermes/cache/scratch/research_corpus"
)
DEFAULT_MANIFEST = DEFAULT_CORPUS_DIR / "manifest.jsonl"
DEFAULT_OUT = DEFAULT_CORPUS_DIR / "fulltext_backfill.jsonl"
DEFAULT_FAILURES = DEFAULT_CORPUS_DIR / "fulltext_backfill_failures.jsonl"

_NEW_ID = re.compile(r"(\d{4}\.\d{4,5})(?:v\d+)?")
_OLD_ID = re.compile(r"([a-zA-Z][a-zA-Z\-]*(?:\.[a-zA-Z]+)?\/\d{7,8})(?:v\d+)?")
_ARX_URL = re.compile(r"arxiv\.org/(?:abs|pdf)/([^\s\"'?#]+)", re.IGNORECASE)
_TEXT_KEYS = ("full_text", "extracted_text", "text", "content", "abstract")
_NESTED_KEYS = ("paper", "result", "data")


def _norm(arxiv_id: str) -> str:
    """Strip a trailing .pdf / version suffix and URL punctuation."""
    aid = arxiv_id.strip().rstrip(".,;:)\"'/")
    if aid.lower().endswith(".pdf"):
        aid = aid[:-4]
    return re.sub(r"v\d+$", "", aid)


def extract_arxiv_id(record: dict) -> str | None:
    """Recover an arXiv id from a manifest record, or ``None``.

    Accepted shapes: new-style ``2403.14769`` and old-style ``math/9705204``
    appears, but only in trusted places -- ``source_id`` when
    ``source == "arxiv"``, or inside an ``arxiv.org/abs|pdf`` URL in
    ``url``/``pdf_url``. DOI suffixes like ``10.12996/gmj.2023.4000`` and
    non-arXiv PDF paths (e.g. ``.../articlepdf/2645104/...``) are NOT
    arXiv ids and return ``None`` -- matching them would send non-arXiv
    papers to the arXiv server.
    """
    if not isinstance(record, dict):
        return None
    if record.get("source") == "arxiv":
        sid = record.get("source_id")
        if isinstance(sid, str):
            m = _NEW_ID.fullmatch(sid.strip()) or _OLD_ID.fullmatch(sid.strip())
            if m:
                return _norm(m.group(1))
    for field in ("url", "pdf_url", "source_id"):
        value = record.get(field)
        if isinstance(value, str) and "arxiv.org" in value:
            m = _ARX_URL.search(value)
            if m:
                return _norm(m.group(1))
    return None


def is_eligible(record: dict) -> bool:
    """True when a record has no full text but an id we can fetch by."""
    return bool(record) and not record.get("full_text") and extract_arxiv_id(record) is not None


def iter_eligible(records: Iterable[dict], done_ids: set[str]) -> Iterator[tuple[dict, str]]:
    """Yield ``(record, arxiv_id)`` for eligible rows not already done."""
    for rec in records:
        if not isinstance(rec, dict) or rec.get("full_text"):
            continue
        aid = extract_arxiv_id(rec)
        if aid is None or aid in done_ids:
            continue
        yield rec, aid


def count_eligible(records: Iterable[dict]) -> tuple[int, set[str]]:
    """Count eligible rows and the set of unique arXiv ids (dry-run helper)."""
    rows = 0
    ids: set[str] = set()
    for _rec, aid in iter_eligible(records, set()):
        rows += 1
        ids.add(aid)
    return rows, ids


def load_done_ids(out_path: Path | str) -> set[str]:
    """Read ids already written to the output jsonl (resume support)."""
    path = Path(out_path)
    done: set[str] = set()
    if not path.exists():
        return done
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        aid = rec.get("arxiv_id") or extract_arxiv_id(rec)
        if aid:
            done.add(str(aid))
    return done


def extract_text(payload: Any) -> str:
    """Pull paper text out of an arxiv-bridge payload of unknown shape.

    The bridge returns parsed JSON when the MCP tool emits JSON, else raw
    text. Handle both, plus one level of nesting (``paper``/``result``/``data``).
    Returns ``''`` when nothing text-shaped is found (caller then falls back
    to ``abstract()`` / records a failure).
    """
    if payload is None:
        return ""
    if isinstance(payload, str):
        return payload
    if isinstance(payload, dict):
        for key in _TEXT_KEYS:
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value
        for key in _NESTED_KEYS:
            value = payload.get(key)
            if isinstance(value, dict):
                text = extract_text(value)
                if text:
                    return text
    return ""


def make_output_record(record: dict, arxiv_id: str, text: str, method: str,
                       now: str | None = None) -> dict:
    """Manifest row + fetched text + backfill provenance (input untouched)."""
    out = dict(record)
    out["full_text"] = text
    out["arxiv_id"] = arxiv_id
    out["backfill_method"] = method
    out["backfilled_at"] = now or datetime.now(timezone.utc).isoformat()
    return out


def iter_manifest(manifest: Path | str) -> Iterator[dict]:
    """Stream manifest records; blank / malformed lines are skipped."""
    with Path(manifest).open("r", encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(rec, dict):
                yield rec


def run(args: argparse.Namespace) -> int:
    manifest = Path(args.manifest)
    out_path = Path(args.out)
    failures_path = Path(args.failures)
    if out_path.resolve() == manifest.resolve():
        raise SystemExit("refusing: --out must differ from --manifest (manifest is read-only)")
    if not manifest.exists():
        raise SystemExit(f"manifest not found: {manifest}")

    rows = list(iter_manifest(manifest))
    eligible = list(iter_eligible(rows, set()))
    if args.dry_run:
        rows_count, unique = count_eligible(rows)
        print(f"dry-run: manifest={manifest}")
        print(f"eligible_rows={rows_count} unique_arxiv_ids={len(unique)}")
        for aid in sorted(unique)[:10]:
            print(f"  {aid}")
        return 0

    done = load_done_ids(out_path)
    todo = [(rec, aid) for rec, aid in eligible if aid not in done]
    if args.max_records is not None:
        todo = todo[: args.max_records]
    print(f"selected={len(todo)} already_done={len(done)} output={out_path}")

    from arxiv_bridge import ArxivBridge  # lazy: keeps pure helpers server-free

    out_path.parent.mkdir(parents=True, exist_ok=True)
    failures_path.parent.mkdir(parents=True, exist_ok=True)
    ok = failed = 0
    with ArxivBridge() as ax, out_path.open("a", encoding="utf-8") as out_fh, \
            failures_path.open("a", encoding="utf-8") as fail_fh:
        for rec, aid in todo:
            if aid in done:  # duplicate row for an id finished earlier in this run
                continue
            text, method, err = "", None, None
            try:
                text = extract_text(ax.download(aid, max_chars=args.max_chars))
                if text:
                    method = "download"
            except Exception as exc:  # noqa: BLE001 - record and move on
                err = str(exc)
            if not text:
                try:
                    text = extract_text(ax.abstract(aid))
                    if text:
                        method, err = "abstract", None
                except Exception as exc:  # noqa: BLE001
                    err = str(exc)
            if text:
                out_fh.write(json.dumps(make_output_record(rec, aid, text, method)) + "\n")
                out_fh.flush()
                done.add(aid)
                ok += 1
                print(f"OK {aid} method={method} chars={len(text)} "
                      f"title={(rec.get('title') or '')[:100]}")
            else:
                failed += 1
                fail_fh.write(json.dumps({
                    "arxiv_id": aid,
                    "source_id": rec.get("source_id"),
                    "title": rec.get("title", ""),
                    "error": err or "empty payload from download() and abstract()",
                    "attempted_at": datetime.now(timezone.utc).isoformat(),
                }) + "\n")
                fail_fh.flush()
                print(f"FAIL {aid} title={(rec.get('title') or '')[:100]} error={err}")
            time.sleep(args.delay)
    print(f"DONE selected={len(todo)} ok={ok} failed={failed}")
    return 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    ap = argparse.ArgumentParser(
        description="Backfill full text for corpus records missing it, via the arxiv bridge.")
    ap.add_argument("--manifest", default=str(DEFAULT_MANIFEST),
                    help="manifest jsonl (read-only; default: corpus scratch manifest)")
    ap.add_argument("--out", default=str(DEFAULT_OUT),
                    help="output jsonl to append (default: scratch fulltext_backfill.jsonl)")
    ap.add_argument("--failures", default=str(DEFAULT_FAILURES),
                    help="failures jsonl (default: scratch fulltext_backfill_failures.jsonl)")
    ap.add_argument("--max-records", type=int, default=None,
                    help="cap how many records to fetch this run")
    ap.add_argument("--max-chars", type=int, default=20000,
                    help="max_chars passed to bridge download()")
    ap.add_argument("--delay", type=float, default=1.0,
                    help="seconds between bridge calls (raise toward 3s for full runs)")
    ap.add_argument("--dry-run", action="store_true",
                    help="report eligible counts without fetching")
    return ap.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    return run(parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())

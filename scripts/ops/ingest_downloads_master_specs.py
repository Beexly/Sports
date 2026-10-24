#!/usr/bin/env python3
"""Ingest the Downloads master specs and oversize workspace summaries (14A / RT-07).

Default set: the 7 highest-relevance .docx specs, 6 .pdf specs, and the 37
largest .md workspace summaries in Downloads/. Selection is deterministic:
spec-relevance keyword score first, byte size second. Every selected file is
extracted in full, sanitized for credential-shaped tokens, hashed, and written
one JSONL line at a time to brain/feeds/2026-10-22/downloads_master_specs.jsonl.
A manifest records the selection, counts, bytes, and hashes.

--verify re-reads the manifest and feed, checks the line count, and confirms
every extracted text hash still matches.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DOWNLOADS = Path(r"C:/Users/Garrett/Downloads")
FEED_PATH = REPO / "brain" / "feeds" / "2026-10-22" / "downloads_master_specs.jsonl"
MANIFEST_PATH = (
    REPO / "docs" / "engine" / "research" / "2026-10-22" / "downloads-master-specs"
    / "DOWNLOADS_INGEST_MANIFEST.json"
)

SPEC_WORDS = (
    "gse", "hermes", "master", "stream", "plan", "spec", "corpus", "context",
    "architecture", "omni", "causal", "frontier", "dossier", "handoff", "engine",
)

PATTERNS = [
    (re.compile(r"\bsk-[A-Za-z0-9_-]{16,}\b"), "[REDACTED_API_KEY]"),
    (re.compile(r"\bghp_[A-Za-z0-9]{20,}\b"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "[REDACTED_AWS_KEY]"),
    (re.compile(r"\bBearer\s+[A-Za-z0-9._-]{20,}\b", re.I), "Bearer [REDACTED_BEARER]"),
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"), "[REDACTED_EMAIL]"),
    (re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b"), "[REDACTED_PHONE]"),
    (re.compile(r"\bpostgres(?:ql)?://[^\s\"']+", re.I), "[REDACTED_CONNECTION_STRING]"),
    (re.compile(r"\bLTAI[A-Za-z0-9]{16,24}\b"), "[REDACTED_ALIBABA_KEY]"),
    (re.compile(r"\b[a-f0-9]{32,}\b"), "[REDACTED_HEX]"),
]


def sanitize(text: str) -> tuple[str, int]:
    out, total = text, 0
    for pattern, replacement in PATTERNS:
        out, n = pattern.subn(replacement, out)
        total += n
    return out, total


def relevance(path: Path) -> int:
    low = path.name.lower()
    return sum(1 for word in SPEC_WORDS if word in low)


def rank(files: list[Path]) -> list[Path]:
    return sorted(files, key=lambda p: (-relevance(p), -p.stat().st_size, p.name.lower()))


def extract_docx(path: Path) -> str:
    import docx
    document = docx.Document(str(path))
    parts = [p.text for p in document.paragraphs if p.text.strip()]
    for table in document.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                parts.append(" | ".join(cells))
    return "\n".join(parts)


def extract_pdf(path: Path) -> str:
    from pypdf import PdfReader
    reader = PdfReader(str(path))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def extract_md(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def select() -> dict[str, list[Path]]:
    docx = rank([p for p in DOWNLOADS.glob("*.docx") if not p.name.startswith("~$")])
    pdf = rank(list(DOWNLOADS.glob("*.pdf")))
    md = sorted(
        [p for p in DOWNLOADS.glob("*.md") if p.stat().st_size >= 50_000],
        key=lambda p: -p.stat().st_size,
    )
    return {"docx": docx[:7], "pdf": pdf[:6], "summary": md[:37]}


def ingest(kind: str, path: Path) -> dict:
    text = extract_docx(path) if kind == "docx" else extract_pdf(path) if kind == "pdf" else extract_md(path)
    clean, red = sanitize(text)
    return {
        "recordType": "downloads_master_spec",
        "kind": kind,
        "sourcePath": str(path),
        "sourceBytes": path.stat().st_size,
        "textChars": len(clean),
        "sha256": hashlib.sha256(clean.encode("utf-8")).hexdigest(),
        "redactions": red,
        "text": clean,
    }


def run() -> dict:
    FEED_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    FEED_PATH.unlink(missing_ok=True)
    selected = select()
    counts, failures, bytes_in, chars_out, redactions = {}, [], 0, 0, 0
    records = []
    for kind, files in selected.items():
        counts[kind] = len(files)
        for path in files:
            try:
                record = ingest(kind, path)
            except Exception as exc:
                failures.append({"kind": kind, "path": str(path), "error": f"{type(exc).__name__}: {exc}"})
                continue
            with FEED_PATH.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(record, ensure_ascii=False) + "\n")
            bytes_in += record["sourceBytes"]
            chars_out += record["textChars"]
            redactions += record["redactions"]
            records.append({k: v for k, v in record.items() if k != "text"})
    manifest = {
        "generatedUtc": datetime.now(timezone.utc).isoformat(),
        "selection": {k: [str(p) for p in v] for k, v in selected.items()},
        "counts": counts,
        "recordsWritten": len(records),
        "sourceBytes": bytes_in,
        "textChars": chars_out,
        "redactions": redactions,
        "failures": failures,
        "feedPath": str(FEED_PATH.relative_to(REPO)),
        "records": records,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def verify() -> int:
    if not FEED_PATH.is_file() or not MANIFEST_PATH.is_file():
        print("VERIFY FAIL: feed or manifest missing")
        return 1
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    lines = [l for l in FEED_PATH.read_text(encoding="utf-8").splitlines() if l.strip()]
    if len(lines) != manifest["recordsWritten"]:
        print(f"VERIFY FAIL: feed lines {len(lines)} != manifest {manifest['recordsWritten']}")
        return 1
    mismatches = 0
    for line in lines:
        rec = json.loads(line)
        if hashlib.sha256(rec["text"].encode("utf-8")).hexdigest() != rec["sha256"]:
            mismatches += 1
    if mismatches:
        print(f"VERIFY FAIL: {mismatches} text hash mismatches")
        return 1
    counts = manifest["counts"]
    if counts.get("docx") != 7 or counts.get("pdf") != 6 or counts.get("summary") != 37:
        print(f"VERIFY FAIL: selection count drift {counts}")
        return 1
    print(
        "VERIFY OK docx={} pdf={} summaries={} records={} failures={} text_chars={}".format(
            counts["docx"], counts["pdf"], counts["summary"],
            manifest["recordsWritten"], len(manifest["failures"]), manifest["textChars"],
        )
    )
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--verify", action="store_true")
    args = ap.parse_args()
    if args.verify:
        return verify()
    m = run()
    print(json.dumps({
        "counts": m["counts"],
        "records": m["recordsWritten"],
        "failures": len(m["failures"]),
        "source_mb": round(m["sourceBytes"] / 1e6, 1),
        "text_chars": m["textChars"],
        "redactions": m["redactions"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

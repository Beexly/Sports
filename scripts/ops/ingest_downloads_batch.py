#!/usr/bin/env python3
"""Ingest an explicit Downloads batch: zips, docx, markdown, python, images.

Everything is accounted for. Text-bearing entries are extracted full-length,
sanitized, hashed, and written one JSONL line each to
brain/feeds/2026-10-22/user_batch_ingest.jsonl. Binary zip entries and PNGs
are recorded with size, sha256, and image dimensions where parseable; no text
is invented for them.

--verify re-reads the feed and checks every record's sha256.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
FEED_PATH = REPO / "brain" / "feeds" / "2026-10-22" / "user_batch_ingest.jsonl"
MANIFEST_PATH = (
    REPO / "docs" / "engine" / "research" / "2026-10-22" / "user-batch-ingest"
    / "USER_BATCH_INGEST_MANIFEST.json"
)

DEFAULT_PATHS = [
    r"C:\Users\Garrett\Downloads\gse_brain.zip",
    r"C:\Users\Garrett\Downloads\aggressive_ingest.zip",
    r"C:\Users\Garrett\Downloads\GSE Omni-Cognitive World Model Architecture.docx",
    r"C:\Users\Garrett\Downloads\X-SITUATIONAL-TRAINING-CORPUS-2026-10-21 (2).md",
    r"C:\Users\Garrett\Downloads\HERMES-AUTONOMOUS-CODING-HANDOFF-STREAMS-12-TO-14-2026-10-22.md",
    r"C:\Users\Garrett\Downloads\GSE-MASTER-IMPLEMENTATION-PLAN-STREAMS-0-TO-14-RED-TEAM-2026-10-22.md",
    r"C:\Users\Garrett\Downloads\X-SITUATIONAL-TRAINING-CORPUS-2026-10-21 (3).md",
    r"C:\Users\Garrett\Downloads\NGSAWS.png",
    r"C:\Users\Garrett\Downloads\browsed_files.zip",
    r"C:\Users\Garrett\Downloads\ngs_coords.zip",
    r"C:\Users\Garrett\Downloads\skeletrack_system.zip",
    r"C:\Users\Garrett\Downloads\all_odds_sources.py",
    r"C:\Users\Garrett\Downloads\gse_sequence.zip",
    r"C:\Users\Garrett\Downloads\gse_integrations.zip",
    r"C:\Users\Garrett\Downloads\gse_improved.zip",
    r"C:\Users\Garrett\Downloads\X-SITUATIONAL-TRAINING-CORPUS-2026-10-21.md",
    r"C:\Users\Garrett\Downloads\X-SITUATIONAL-TRAINING-CORPUS-2026-10-21 (1).md",
    r"C:\Users\Garrett\Downloads\census-gse58-addendum-2026-10-15 (1).md",
    r"C:\Users\Garrett\Downloads\SITUATIONAL-CONTEXT-V2-2026-10-21.md",
    r"C:\Users\Garrett\Downloads\CONTEXT-LOCATOR-2026-10-21.md",
    r"C:\Users\Garrett\Downloads\Continuous-Time Benchmarks.png",
    r"C:\Users\Garrett\Downloads\Dual-Speed Synaptic Plasticity and ReHarness Continual Memory Architecture.png",
]

TEXT_SUFFIXES = {".md", ".txt", ".py", ".json", ".jsonl", ".csv", ".ts", ".js", ".sql", ".yaml", ".yml", ".toml", ".html", ".css", ".sh", ".ps1", ".ipynb"}

PATTERNS = [
    (re.compile(r"\bghp_[A-Za-z0-9]{20,}\b"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "[REDACTED_AWS_KEY]"),
    (re.compile(r"\bLTAI[A-Za-z0-9]{16,24}\b"), "[REDACTED_ALIBABA_KEY]"),
    (re.compile(r"\bBearer\s+[A-Za-z0-9._-]{20,}\b", re.I), "Bearer [REDACTED_BEARER]"),
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"), "[REDACTED_EMAIL]"),
    (re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b"), "[REDACTED_PHONE]"),
    (re.compile(r"\bpostgres(?:ql)?://[^\s\"']+", re.I), "[REDACTED_CONNECTION_STRING]"),
    (re.compile(r"\bsk_live_[A-Za-z0-9]{20,}\b"), "[REDACTED_STRIPE_KEY]"),
    (re.compile(r"\brk_live_[A-Za-z0-9]{20,}\b"), "[REDACTED_STRIPE_KEY]"),
    (re.compile(r"\bwhsec_[A-Za-z0-9]{24,}\b"), "[REDACTED_STRIPE_WEBHOOK]"),
    (re.compile(r"\bsk-proj-[A-Za-z0-9_\-]{20,}\b"), "[REDACTED_OPENAI_KEY]"),
    (re.compile(r"\bsk-ant-[A-Za-z0-9_\-]{20,}\b"), "[REDACTED_ANTHROPIC_KEY]"),
    (re.compile(r"\bsk-[A-Za-z0-9_-]{16,}\b"), "[REDACTED_API_KEY]"),
    (re.compile(r"\bAIza[0-9A-Za-z_\-]{30,}\b"), "[REDACTED_GOOGLE_KEY]"),
    (re.compile(r"\bxox[baprs]-[A-Za-z0-9\-]{20,}\b"), "[REDACTED_SLACK_TOKEN]"),
    (re.compile(r"https://discord(?:app)?\.com/api/webhooks/\d+/[A-Za-z0-9_\-]+"), "[REDACTED_DISCORD_WEBHOOK]"),
    (re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----"), "[REDACTED_PRIVATE_KEY]"),
    (re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b"), "[REDACTED_JWT]"),
    (re.compile(r"\b[a-f0-9]{32,}\b"), "[REDACTED_HEX]"),
]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sanitize(text: str) -> tuple[str, int]:
    out, total = text, 0
    for pattern, repl in PATTERNS:
        out, n = pattern.subn(repl, out)
        total += n
    return out, total


def decode(data: bytes) -> str:
    for enc in ("utf-8", "utf-16", "latin-1"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def png_size(data: bytes) -> tuple[int, int] | None:
    if len(data) >= 24 and data[:8] == b"\x89PNG\r\n\x1a\n":
        width, height = struct.unpack(">II", data[16:24])
        return int(width), int(height)
    return None


def docx_text(path: Path) -> str:
    import docx
    document = docx.Document(str(path))
    parts = [p.text for p in document.paragraphs if p.text.strip()]
    for table in document.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                parts.append(" | ".join(cells))
    return "\n".join(parts)


def record(kind: str, source: str, entry: str | None, data: bytes, text: str | None, redactions: int, note: str = "") -> dict:
    return {
        "recordType": "user_batch_ingest",
        "kind": kind,
        "sourcePath": source,
        "zipEntry": entry,
        "bytes": len(data),
        "sha256": sha256_bytes(data),
        "textSha256": None if text is None else sha256_bytes(text.encode("utf-8")),
        "textChars": 0 if text is None else len(text),
        "redactions": redactions,
        "note": note,
        "text": text,
    }


def ingest_file(path: Path) -> list[dict]:
    suffix = path.suffix.lower()
    out: list[dict] = []
    if suffix == ".zip":
        with zipfile.ZipFile(path) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                data = zf.read(info)
                entry_suffix = Path(info.filename).suffix.lower()
                if entry_suffix in TEXT_SUFFIXES:
                    text, red = sanitize(decode(data))
                    out.append(record("zip-text", str(path), info.filename, data, text, red))
                elif entry_suffix == ".png":
                    dims = png_size(data)
                    out.append(record("zip-image", str(path), info.filename, data, None, 0,
                                      f"png {dims[0]}x{dims[1]}" if dims else "png (dimensions unparsed)"))
                else:
                    out.append(record("zip-binary", str(path), info.filename, data, None, 0, "binary entry, text not invented"))
        return out
    data = path.read_bytes()
    if suffix == ".docx":
        text, red = sanitize(docx_text(path))
        return [record("docx", str(path), None, data, text, red)]
    if suffix in TEXT_SUFFIXES:
        text, red = sanitize(decode(data))
        return [record("text", str(path), None, data, text, red)]
    if suffix == ".png":
        dims = png_size(data)
        return [record("image", str(path), None, data, None, 0,
                       f"png {dims[0]}x{dims[1]}" if dims else "png (dimensions unparsed)")]
    return [record("binary", str(path), None, data, None, 0, "binary file, text not invented")]


def run(paths: list[str]) -> dict:
    FEED_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    FEED_PATH.unlink(missing_ok=True)
    records, failures = [], []
    for raw in paths:
        path = Path(raw)
        if not path.is_file():
            failures.append({"path": raw, "error": "missing"})
            continue
        try:
            recs = ingest_file(path)
        except Exception as exc:
            failures.append({"path": raw, "error": f"{type(exc).__name__}: {exc}"})
            continue
        with FEED_PATH.open("a", encoding="utf-8") as fh:
            for rec in recs:
                fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
        records.extend(recs)
    manifest = {
        "generatedUtc": datetime.now(timezone.utc).isoformat(),
        "paths": paths,
        "sourceFiles": len(paths),
        "records": len(records),
        "kinds": {k: sum(1 for r in records if r["kind"] == k) for k in sorted({r["kind"] for r in records})},
        "bytes": sum(r["bytes"] for r in records),
        "textChars": sum(r["textChars"] for r in records),
        "redactions": sum(r["redactions"] for r in records),
        "failures": failures,
        "feedPath": str(FEED_PATH.relative_to(REPO)),
        "index": [{k: v for k, v in r.items() if k != "text"} for r in records],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def verify() -> int:
    if not FEED_PATH.is_file() or not MANIFEST_PATH.is_file():
        print("VERIFY FAIL: feed or manifest missing")
        return 1
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    lines = [l for l in FEED_PATH.read_text(encoding="utf-8").split("\n") if l.strip()]
    if len(lines) != manifest["records"]:
        print(f"VERIFY FAIL: feed lines {len(lines)} != manifest {manifest['records']}")
        return 1
    bad = 0
    for line in lines:
        rec = json.loads(line)
        if rec.get("textSha256") is not None:
            if sha256_bytes(rec["text"].encode("utf-8")) != rec["textSha256"]:
                bad += 1
    if bad:
        print(f"VERIFY FAIL: {bad} text sha mismatches")
        return 1
    if manifest["failures"]:
        print(f"VERIFY FAIL: {len(manifest['failures'])} source failures")
        return 1
    print(
        "VERIFY OK sources={} records={} text_chars={} redactions={} kinds={}".format(
            manifest["sourceFiles"], manifest["records"], manifest["textChars"],
            manifest["redactions"], manifest["kinds"],
        )
    )
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--paths", nargs="*", default=None)
    args = ap.parse_args()
    if args.verify:
        return verify()
    m = run(args.paths if args.paths is not None else DEFAULT_PATHS)
    print(json.dumps({
        "sources": m["sourceFiles"], "records": m["records"],
        "kinds": m["kinds"], "text_chars": m["textChars"],
        "redactions": m["redactions"], "failures": len(m["failures"]),
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

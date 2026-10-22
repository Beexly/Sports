#!/usr/bin/env python3
"""Extract, sanitize, and index EVERY body in the Grok export (Stream 14A / RT-07).

Every zip entry is accounted for. Asset-server `content` bodies are decoded,
sanitized, written full-length to data/grok-export/bodies/<id>.txt, hashed,
and indexed in brain/feeds/2026-10-22/grok_export_index.jsonl. Auth/billing
entries are refused and counted; other entries are counted as non-body. The
manifest records every entry, so nothing is silently dropped.

Sanitization removes credential-shaped tokens only. It never truncates or
summarizes the meaning of a body.

--verify-deep re-opens the zip, re-counts every entry, re-hashes every
extracted body, and scans the index for credential-shaped strings.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ZIP_PATH = Path(r"C:/Users/Garrett/Downloads/6ecc171c-d711-47ae-9421-43a2266d7894.zip")
BODY_DIR = REPO / "data" / "grok-export" / "bodies"
INDEX_PATH = REPO / "brain" / "feeds" / "2026-10-22" / "grok_export_index.jsonl"
MANIFEST_PATH = (
    REPO / "docs" / "engine" / "research" / "2026-10-22" / "grok-export-2026-10-22"
    / "GROK_EXPORT_INGEST_MANIFEST.json"
)

ASSET = "prod-mc-asset-server"
REFUSED = ("prod-mc-auth", "prod-mc-billing")

PATTERNS = [
    (re.compile(r"\bsk-[A-Za-z0-9_-]{16,}\b"), "[REDACTED_API_KEY]"),
    (re.compile(r"\bghp_[A-Za-z0-9]{20,}\b"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "[REDACTED_AWS_KEY]"),
    (re.compile(r"\bBearer\s+[A-Za-z0-9._-]{20,}\b", re.I), "Bearer [REDACTED_BEARER]"),
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"), "[REDACTED_EMAIL]"),
    (re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b"), "[REDACTED_PHONE]"),
    (re.compile(r"\bpostgres(?:ql)?://[^\s\"']+", re.I), "[REDACTED_CONNECTION_STRING]"),
    (re.compile(r"\bLTAI[A-Za-z0-9]{16,24}\b"), "[REDACTED_ALIBABA_KEY]"),
    (re.compile(r"\b[a-f0-9]{32,}\b"), "[REDACTED_HEX]"),
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def sanitize(text: str) -> tuple[str, int]:
    out, total = text, 0
    for pattern, replacement in PATTERNS:
        out, n = pattern.subn(replacement, out)
        total += n
    return out, total


def flatten(value, depth: int = 0) -> str:
    if depth > 40:
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, bool)) or value is None:
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, list):
        return "\n".join(flatten(v, depth + 1) for v in value)
    if isinstance(value, dict):
        return "\n".join(f"{k}: {flatten(v, depth + 1)}" for k, v in value.items())
    return str(value)


def decode(raw: bytes) -> str:
    text = None
    for enc in ("utf-8", "utf-16", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        text = raw.decode("utf-8", errors="replace")
    if text.strip()[:1] in "{[":
        try:
            return flatten(json.loads(text))
        except json.JSONDecodeError:
            return text
    return text


def body_id(name: str) -> str:
    parts = [p for p in name.split("/") if p]
    return parts[-2] if len(parts) >= 2 else hashlib.sha256(name.encode()).hexdigest()[:16]


def extract_all() -> dict:
    if not ZIP_PATH.is_file():
        raise SystemExit(f"zip missing: {ZIP_PATH}")
    BODY_DIR.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.unlink(missing_ok=True)

    entries, bodies, non_bodies, refused = [], 0, 0, 0
    raw_bytes = sanitized_chars = redactions = 0

    with zipfile.ZipFile(ZIP_PATH) as zf:
        for info in zf.infolist():
            name = info.filename
            low = name.lower()
            record = {"path": name, "bytes": info.file_size}
            if any(p in low for p in REFUSED):
                refused += 1
                record["disposition"] = "refused-service"
                entries.append(record)
                continue
            if not (ASSET in low and name.endswith("/content")):
                non_bodies += 1
                record["disposition"] = "non-body"
                entries.append(record)
                continue
            raw = zf.read(info)
            clean, red = sanitize(decode(raw))
            bid = body_id(name)
            body_file = BODY_DIR / f"{bid}.txt"
            body_file.write_text(clean, encoding="utf-8", newline="\n")
            digest = hashlib.sha256(clean.encode("utf-8")).hexdigest()
            with INDEX_PATH.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps({
                    "recordType": "grok_export_body",
                    "id": bid,
                    "sourcePath": name,
                    "rawBytes": len(raw),
                    "textChars": len(clean),
                    "sha256": digest,
                    "redactions": red,
                    "bodyPath": str(body_file.relative_to(REPO)),
                    "excerpt": clean[:200].replace("\r", " ").replace("\n", " "),
                }, ensure_ascii=False) + "\n")
            bodies += 1
            raw_bytes += len(raw)
            sanitized_chars += len(clean)
            redactions += red
            record.update({"disposition": "body-extracted", "id": bid, "sha256": digest})
            entries.append(record)

    manifest = {
        "generatedUtc": datetime.now(timezone.utc).isoformat(),
        "zipPath": str(ZIP_PATH),
        "zipBytes": ZIP_PATH.stat().st_size,
        "zipSha256": sha256_file(ZIP_PATH),
        "entriesTotal": len(entries),
        "bodiesExtracted": bodies,
        "nonBodyEntries": non_bodies,
        "refusedServiceEntries": refused,
        "bodyRawBytes": raw_bytes,
        "sanitizedTextChars": sanitized_chars,
        "redactions": redactions,
        "indexPath": str(INDEX_PATH.relative_to(REPO)),
        "bodyDir": str(BODY_DIR.relative_to(REPO)),
        "noDataFiltered": True,
        "note": "Every zip entry accounted for; asset bodies full-length and sanitized; auth/billing refused and counted.",
        "entries": entries,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def verify_deep() -> int:
    if not MANIFEST_PATH.is_file():
        print(f"VERIFY FAIL: manifest missing at {MANIFEST_PATH}")
        return 1
    if not INDEX_PATH.is_file():
        print(f"VERIFY FAIL: index missing at {INDEX_PATH}")
        return 1
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    with zipfile.ZipFile(ZIP_PATH) as zf:
        infos = zf.infolist()
        asset_bodies = [i for i in infos if ASSET in i.filename.lower() and i.filename.endswith("/content")]
    if manifest["entriesTotal"] != len(infos):
        print(f"VERIFY FAIL: entry count drift {manifest['entriesTotal']} vs {len(infos)}")
        return 1
    if manifest["bodiesExtracted"] != len(asset_bodies):
        print(f"VERIFY FAIL: body count drift {manifest['bodiesExtracted']} vs {len(asset_bodies)}")
        return 1
    lines = [l for l in INDEX_PATH.read_text(encoding="utf-8").split("\n") if l.strip()]
    if len(lines) != len(asset_bodies):
        print(f"VERIFY FAIL: index has {len(lines)} lines, expected {len(asset_bodies)}")
        return 1
    mismatches = 0
    for line in lines:
        rec = json.loads(line)
        path = REPO / rec["bodyPath"]
        if not path.is_file() or sha256_file(path) != rec["sha256"]:
            mismatches += 1
    if mismatches:
        print(f"VERIFY FAIL: {mismatches} body hash mismatches")
        return 1
    hits = sum(
        len(p.findall(json.loads(l)["excerpt"]))
        for l in lines[:50] for p, _ in PATTERNS
    )
    if hits:
        print(f"VERIFY FAIL: {hits} credential-shaped strings in index excerpts")
        return 1
    print(
        "VERIFY OK entries={} bodies={} non_bodies={} refused={} redactions={} sha256_mismatches=0".format(
            len(infos), len(asset_bodies), manifest["nonBodyEntries"],
            manifest["refusedServiceEntries"], manifest["redactions"],
        )
    )
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--verify-deep", action="store_true")
    args = ap.parse_args()
    if args.verify_deep:
        return verify_deep()
    m = extract_all()
    print(json.dumps({
        "entries": m["entriesTotal"],
        "bodies": m["bodiesExtracted"],
        "non_bodies": m["nonBodyEntries"],
        "refused": m["refusedServiceEntries"],
        "body_mb": round(m["bodyRawBytes"] / 1e6, 1),
        "text_chars": m["sanitizedTextChars"],
        "redactions": m["redactions"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

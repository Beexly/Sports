#!/usr/bin/env python3
"""
Constant-RAM Drive Master JSONL Corpus Streamer (`ingest_drive_master_jsonl_streams.py`)
========================================================================================
Streams `EQUATIONS-MASTER-2026-11-10.jsonl.gz` and `SITUATIONAL-MASTER-2026-11-10.jsonl.gz`
(`~1,042,184` combined rows) from Google Drive line-by-line in constant RAM with:
  1. OWASP ASI06 corpus poisoning & prompt-injection quarantine scanner.
  2. Constant-memory on-disk SQLite SHA-256 deduplication index (zero unbounded RAM set).
  3. Fail-closed <80% disk-usage ceiling (`shutil.disk_usage` check before & during write).
  4. Never writes `brain/mind.jsonl` (single-writer doctrine: emits trainer-ready staging
     shards in `artifacts/corpus_staging/`).
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import re
import shutil
import sqlite3
from pathlib import Path
from typing import Any, Iterator

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DRIVE_DIR = Path(r"G:\My Drive\GSE-GSI-Mega-Sweep-2026-11-06")
DEFAULT_OUT_DIR = REPO_ROOT / "data" / "corpus_staging" / "drive_master_2026_11_20"

ASI06_INJECTION_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bignore\s+(?:all\s+)?(?:previous|prior)\s+instructions\b", re.IGNORECASE),
    re.compile(r"\byou\s+are\s+now\s+(?:a|an|in)\s+(?:developer|jailbreak|unrestricted)\b", re.IGNORECASE),
    re.compile(r"<\s*/?\s*script\b", re.IGNORECASE),
    re.compile(r"\b(?:system\s+prompt|BEGIN\s+SYSTEM\s+PROMPT|exfiltrate|subprocess\.Popen)\b", re.IGNORECASE),
)


def _check_disk_headroom(target_dir: Path, max_used_frac: float = 0.80, *, enforce: bool = True) -> dict[str, Any]:
    target_dir.mkdir(parents=True, exist_ok=True)
    usage = shutil.disk_usage(target_dir)
    used_frac = (usage.total - usage.free) / max(1, usage.total)
    exceeded = used_frac >= max_used_frac
    if exceeded and enforce:
        raise RuntimeError(
            f"STORAGE_CAP_EXCEEDED: {target_dir} disk usage {used_frac:.2%} >= {max_used_frac:.0%} threshold."
        )
    return {
        "used_frac": round(used_frac, 4),
        "free_gb": round(usage.free / (1024**3), 2),
        "exceeded_80pct_cap": exceeded,
    }


def _scan_asi06_quarantine(row: dict[str, Any]) -> str | None:
    fields = ("book", "section", "equation", "description", "statement", "kind", "situation")
    joined = " | ".join(str(row.get(k) or "") for k in fields)
    for pat in ASI06_INJECTION_PATTERNS:
        m = pat.search(joined)
        if m:
            return f"ASI06_PATTERN:{m.group(0)[:64]}"
    if len(joined) > 65536:
        return "ASI06_OVERSIZED_ROW"
    return None


def _row_sha256_bytes(stream_kind: str, row: dict[str, Any]) -> bytes:
    core = row.get("equation") or row.get("statement") or ""
    meta = f"{stream_kind}|{row.get('book','')}|{row.get('page','')}|{core}"
    return hashlib.sha256(meta.encode("utf-8", errors="ignore")).digest()


def _stream_gz_jsonl(gz_path: Path) -> Iterator[dict[str, Any]]:
    with gzip.open(gz_path, mode="rt", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            s = line.strip()
            if not s:
                continue
            try:
                obj = json.loads(s)
            except json.JSONDecodeError:
                continue
            if isinstance(obj, dict):
                yield obj


def run_drive_master_stream(
    *,
    drive_dir: Path = DEFAULT_DRIVE_DIR,
    out_dir: Path = DEFAULT_OUT_DIR,
    limit: int | None = None,
    dry_run: bool = False,
    max_disk_used_frac: float = 0.80,
) -> dict[str, Any]:
    eq_gz = drive_dir / "EQUATIONS-MASTER-2026-11-10.jsonl.gz"
    sit_gz = drive_dir / "SITUATIONAL-MASTER-2026-11-10.jsonl.gz"
    sources = [("equations", eq_gz), ("situational", sit_gz)]
    missing = [str(p) for _, p in sources if not p.is_file()]
    if missing:
        raise FileNotFoundError(f"Missing Drive master gz streams: {missing}")

    disk_info = _check_disk_headroom(
        out_dir if not dry_run else REPO_ROOT,
        max_used_frac=max_disk_used_frac,
        enforce=not dry_run,
    )

    db_path = out_dir / "_dedupe_tmp.sqlite3"
    if dry_run:
        conn = sqlite3.connect(":memory:")
    else:
        out_dir.mkdir(parents=True, exist_ok=True)
        if db_path.exists():
            db_path.unlink()
        conn = sqlite3.connect(str(db_path))
    conn.execute("CREATE TABLE IF NOT EXISTS seen (digest BLOB PRIMARY KEY)")

    stats = {
        "dry_run": dry_run,
        "limit": limit,
        "disk_headroom_initial": disk_info,
        "rows_read": 0,
        "rows_accepted": 0,
        "rows_duplicate": 0,
        "rows_quarantined": 0,
        "per_stream": {"equations": 0, "situational": 0},
    }

    clean_fh = None if dry_run else (out_dir / "trainer_ready_drive_corpus_stage.jsonl").open("w", encoding="utf-8")
    quar_fh = None if dry_run else (out_dir / "asi06_quarantine.jsonl").open("w", encoding="utf-8")

    try:
        per_file_cap = limit
        for kind, gz_p in sources:
            processed_this = 0
            for row in _stream_gz_jsonl(gz_p):
                if per_file_cap is not None and processed_this >= per_file_cap:
                    break
                processed_this += 1
                stats["rows_read"] += 1
                stats["per_stream"][kind] += 1

                if stats["rows_read"] % 25_000 == 0 and not dry_run:
                    _check_disk_headroom(out_dir, max_used_frac=max_disk_used_frac)

                q_reason = _scan_asi06_quarantine(row)
                if q_reason is not None:
                    stats["rows_quarantined"] += 1
                    if quar_fh is not None:
                        quar_fh.write(json.dumps({"stream": kind, "reason": q_reason, "row": row}, ensure_ascii=False) + "\n")
                    continue

                dig = _row_sha256_bytes(kind, row)
                try:
                    conn.execute("INSERT INTO seen (digest) VALUES (?)", (dig,))
                except sqlite3.IntegrityError:
                    stats["rows_duplicate"] += 1
                    continue

                stats["rows_accepted"] += 1
                if clean_fh is not None:
                    out_rec = {
                        "stream": kind,
                        "sha256_prefix": dig[:8].hex(),
                        "book": row.get("book"),
                        "author": row.get("author"),
                        "year": row.get("year"),
                        "page": row.get("page"),
                        "section": row.get("section") or row.get("kind"),
                        "payload": row.get("equation") or row.get("statement"),
                        "context": row.get("description") or row.get("situation"),
                    }
                    clean_fh.write(json.dumps(out_rec, ensure_ascii=False) + "\n")
        conn.commit()
    finally:
        if clean_fh is not None:
            clean_fh.close()
        if quar_fh is not None:
            quar_fh.close()
        conn.close()

    if not dry_run:
        (out_dir / "manifest.json").write_text(json.dumps(stats, indent=2) + "\n", encoding="utf-8")
    return stats


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Stream Drive Master JSONL.gz files with ASI06 quarantine & SHA-256 dedupe")
    parser.add_argument("--drive-dir", type=Path, default=DEFAULT_DRIVE_DIR)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    parser.add_argument("--limit", type=int, default=None, help="Max rows per gz stream")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max-disk-used-frac", type=float, default=0.80)
    args = parser.parse_args(argv)

    summary = run_drive_master_stream(
        drive_dir=args.drive_dir,
        out_dir=args.out_dir,
        limit=args.limit,
        dry_run=args.dry_run,
        max_disk_used_frac=args.max_disk_used_frac,
    )
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

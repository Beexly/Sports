"""Build a read-only SHA256 & provenance manifest of C:/Users/Garrett/Downloads.

Never reads or hashes sensitive personal/credential files (SSN Passport.pdf,
Statement 10_26_26 (449K, PDF).pdf, gbaxleyID.jpeg, gbpassport.jpeg,
galaxysportsedge-f506d7991177.json), and explicitly flags retracted papers
(e.g., Wang 2022/2023 Retracted Hindawi paper) as `rejected-retracted-paper`.
"""
from __future__ import annotations

import hashlib
import json
import re
import socket
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DOWNLOADS = Path("C:/Users/Garrett/Downloads")
DEFAULT_FEED = ROOT / "brain" / "feeds" / "2026-11-02" / "nov02_multidomain_corpus_and_equations_feed.jsonl"
DEFAULT_OUT = ROOT / "data" / "engine" / "INGESTION-MANIFEST-2026-11-02.json"

SENSITIVE_PATTERNS = [
    r"SSN Passport",
    r"Statement 10_26_26",
    r"gbaxleyID",
    r"gbpassport",
    r"Passport",
    r"SSN",
    r"galaxysportsedge-f506d7991177",
]

RETRACTED_PATTERNS = [
    r"Retracted\s+",
    r"Wang - Retracted",
    r"Song - Retracted",
    r"Li - Retracted",
    r"9830141",
]


def is_sensitive_filename(name: str) -> bool:
    return any(re.search(pat, name, flags=re.IGNORECASE) for pat in SENSITIVE_PATTERNS)


def is_retracted_filename(name: str) -> bool:
    return any(re.search(pat, name, flags=re.IGNORECASE) for pat in RETRACTED_PATTERNS)


def classify_extension(name: str) -> str:
    if is_sensitive_filename(name):
        return "sensitive-excluded"
    if is_retracted_filename(name):
        return "rejected-retracted-paper"
    ext = Path(name).suffix.lower().lstrip(".")
    if ext in {"pdf", "docx", "md", "json", "ipynb", "ris", "html"}:
        return ext
    return "other"


def scan(downloads_root: str | Path = DEFAULT_DOWNLOADS) -> List[Dict[str, Any]]:
    root = Path(downloads_root)
    rows: List[Dict[str, Any]] = []
    if not root.exists():
        return rows
    for entry in sorted(root.iterdir(), key=lambda p: p.name.lower()):
        if entry.is_dir():
            continue
        name = entry.name
        cls = classify_extension(name)
        if cls == "sensitive-excluded":
            rows.append(
                {
                    "rel_path": name,
                    "class": "sensitive-excluded",
                    "size_bytes": None,
                    "sha256": None,
                }
            )
            continue
        size_b = entry.stat().st_size
        h = hashlib.sha256()
        with entry.open("rb") as fh:
            for chunk in iter(lambda: fh.read(65536), b""):
                h.update(chunk)
        rows.append(
            {
                "rel_path": name,
                "class": cls,
                "size_bytes": size_b,
                "sha256": h.hexdigest(),
            }
        )
    return rows


def match_feed_sources(
    feed_rows: List[Dict[str, Any]],
    manifest_files: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    by_lower = {f["rel_path"].lower(): f["rel_path"] for f in manifest_files if f["class"] != "sensitive-excluded"}
    by_stem = {Path(f["rel_path"]).stem.lower(): f["rel_path"] for f in manifest_files if f["class"] != "sensitive-excluded"}

    matched_out: List[Dict[str, Any]] = []
    for row in feed_rows:
        rid = str(row.get("id") or row.get("equation_id") or "")
        src = str(row.get("source") or row.get("source_file") or "").strip()
        if not src:
            matched_out.append({"id": rid, "source": None, "status": "unmatched", "rel_path": None})
            continue
        if src.startswith("http://") or src.startswith("https://"):
            matched_out.append({"id": rid, "source": src, "status": "external_url", "rel_path": src})
            continue
        base = Path(src).name.lower()
        stem = Path(src).stem.lower()
        hit = by_lower.get(base) or by_stem.get(stem)
        if not hit:
            for k_low, orig in by_lower.items():
                if stem and stem in k_low:
                    hit = orig
                    break
        matched_out.append(
            {
                "id": rid,
                "source": src,
                "status": "matched" if hit else "unmatched",
                "rel_path": hit,
            }
        )
    return matched_out


def build_manifest(
    downloads_root: str | Path = DEFAULT_DOWNLOADS,
    feed_path: str | Path = DEFAULT_FEED,
    out_path: str | Path = DEFAULT_OUT,
) -> Dict[str, Any]:
    files = scan(downloads_root)
    feed_rows: List[Dict[str, Any]] = []
    fp = Path(feed_path)
    if fp.exists():
        for line in fp.read_text(encoding="utf-8").splitlines():
            if line.strip():
                feed_rows.append(json.loads(line))
    feed_matches = match_feed_sources(feed_rows, files)
    try:
        git_sha = (
            subprocess.check_output(["git", "-C", str(ROOT), "rev-parse", "HEAD"], text=True)
            .strip()
        )
    except Exception:
        git_sha = "unknown"

    sens_count = sum(1 for f in files if f["class"] == "sensitive-excluded")
    retracted_count = sum(1 for f in files if f["class"] == "rejected-retracted-paper")
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "host": socket.gethostname(),
        "git_sha": git_sha,
        "downloads_root": str(downloads_root).replace("\\", "/"),
        "total_files": len(files),
        "sensitive_excluded": sens_count,
        "rejected_retracted_papers": retracted_count,
        "files": files,
        "feed_source_matches": feed_matches,
    }
    op = Path(out_path)
    op.parent.mkdir(parents=True, exist_ok=True)
    op.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


if __name__ == "__main__":
    m = build_manifest()
    print(
        f"Manifest built: {m['total_files']} files, "
        f"{m['sensitive_excluded']} sensitive-excluded, "
        f"{m['rejected_retracted_papers']} rejected-retracted-paper"
    )

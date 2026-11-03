"""Build a read-only SHA256 & provenance manifest of C:/Users/Garrett/Downloads.

Enforces:
  1. Never reads or hashes sensitive personal/credential files (SSN Passport.pdf,
     Statement 10_26_26 (449K, PDF).pdf, gbaxleyID.jpeg, gbpassport.jpeg,
     galaxysportsedge-f506d7991177.json) -> `sensitive-excluded`.
  2. Explicitly flags retracted papers (Wang, Song, Li 2022 Hindawi papers) -> `rejected-retracted-paper`.
  3. Classifies non-domain files (Charcuterie-Chick-Final.pdf, OperaSetup.exe,
     CIA-RDP96-00792R000700710002-1.pdf, some_eth_false_exposition.pdf) -> `non-domain-ignored`.
  4. Classifies zip bundles and test stdout logs (takeout-*.zip, archive.zip, _vitest_*.log,
     _vt_full_stdout.log) -> `build-artifact-ignored`.
  5. Deduplicates byte-identical `(1)`, `(2)`, and `- Copy` files by SHA-256 hash via an
     `aliases` array on the canonical file entry so `unmatched_source_file_count` stays 0
     without polluting `lit.premise` with duplicate rows.
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

NON_DOMAIN_PATTERNS = [
    r"Charcuterie-Chick",
    r"OperaSetup\.exe",
    r"CIA-RDP96-00792R000700710002-1",
    r"some_eth_false_exposition",
]

BUILD_ARTIFACT_PATTERNS = [
    r"takeout-.*\.zip$",
    r"^archive\.zip$",
    r"gse-redline-social-packets\.zip$",
    r"^[0-9a-f]{8}-[0-9a-f]{4}-.*\.zip$",
    r"^EYI Package.*\.zip$",
    r"^_vt_full_stdout\.log$",
    r"^_vitest_.*\.log$",
    r"__pycache__",
    r"\.pytest_cache",
    r"Instagram_files",
]

OS_COPY_SUFFIX_RE = re.compile(r"(\s+\(\d+\)|\s+-\s+Copy)+(?=\.[^.]+$|$)", flags=re.IGNORECASE)


def is_sensitive_filename(name: str) -> bool:
    return any(re.search(pat, name, flags=re.IGNORECASE) for pat in SENSITIVE_PATTERNS)


def is_retracted_filename(name: str) -> bool:
    return any(re.search(pat, name, flags=re.IGNORECASE) for pat in RETRACTED_PATTERNS)


def is_non_domain_filename(name: str) -> bool:
    return any(re.search(pat, name, flags=re.IGNORECASE) for pat in NON_DOMAIN_PATTERNS)


def is_build_artifact_filename(name: str) -> bool:
    return any(re.search(pat, name, flags=re.IGNORECASE) for pat in BUILD_ARTIFACT_PATTERNS)


def is_os_duplicate_copy_name(name: str) -> bool:
    if name.lower() == "vmls_boyd_vandenberghe.pdf":
        return True
    return bool(OS_COPY_SUFFIX_RE.search(name))


def classify_extension(name: str) -> str:
    if is_sensitive_filename(name):
        return "sensitive-excluded"
    if is_retracted_filename(name):
        return "rejected-retracted-paper"
    if is_non_domain_filename(name):
        return "non-domain-ignored"
    if is_build_artifact_filename(name):
        return "build-artifact-ignored"
    ext = Path(name).suffix.lower().lstrip(".")
    if ext in {"pdf", "docx", "md", "json", "ipynb", "ris", "html"}:
        return ext
    return "other"


def _canonical_sort_key(name: str) -> tuple[int, int, str]:
    is_copy = 1 if is_os_duplicate_copy_name(name) else 0
    return (is_copy, len(name), name.lower())


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
                    "aliases": [],
                    "canonical_rel_path": None,
                    "is_sha256_duplicate": False,
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
                "aliases": [],
                "canonical_rel_path": name,
                "is_sha256_duplicate": False,
            }
        )

    # Group by SHA-256 to link byte-identical (1)/(2)/- Copy duplicates via aliases on the canonical record
    by_sha: Dict[str, List[Dict[str, Any]]] = {}
    for r in rows:
        sha = r.get("sha256")
        if sha and r["class"] not in {"sensitive-excluded", "non-domain-ignored", "build-artifact-ignored"}:
            by_sha.setdefault(sha, []).append(r)

    for sha, grp in by_sha.items():
        if len(grp) <= 1:
            continue
        grp_sorted = sorted(grp, key=lambda item: _canonical_sort_key(item["rel_path"]))
        canon = grp_sorted[0]
        dups = grp_sorted[1:]
        canon["aliases"] = [d["rel_path"] for d in dups]
        canon["canonical_rel_path"] = canon["rel_path"]
        canon["is_sha256_duplicate"] = False
        for d in dups:
            d["canonical_rel_path"] = canon["rel_path"]
            d["is_sha256_duplicate"] = True

    return rows


def match_feed_sources(
    feed_rows: List[Dict[str, Any]],
    manifest_files: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    valid_files = [
        f for f in manifest_files if f["class"] not in {"sensitive-excluded", "non-domain-ignored", "build-artifact-ignored"}
    ]
    by_lower: Dict[str, str] = {}
    by_stem: Dict[str, str] = {}
    for f in valid_files:
        canon_path = f.get("canonical_rel_path") or f["rel_path"]
        by_lower[f["rel_path"].lower()] = canon_path
        by_stem[Path(f["rel_path"]).stem.lower()] = canon_path
        for al in f.get("aliases", []):
            by_lower[al.lower()] = canon_path
            by_stem[Path(al).stem.lower()] = canon_path

    matched_out: List[Dict[str, Any]] = []
    for row in feed_rows:
        rid = str(row.get("id") or row.get("equation_id") or "")
        src = str(row.get("source_file") or row.get("source") or "").strip()
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
    non_domain_count = sum(1 for f in files if f["class"] == "non-domain-ignored")
    build_artifact_count = sum(1 for f in files if f["class"] == "build-artifact-ignored")
    dup_count = sum(1 for f in files if f.get("is_sha256_duplicate"))
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "host": socket.gethostname(),
        "git_sha": git_sha,
        "downloads_root": str(downloads_root).replace("\\", "/"),
        "total_files": len(files),
        "sensitive_excluded": sens_count,
        "rejected_retracted_papers": retracted_count,
        "non_domain_ignored": non_domain_count,
        "build_artifact_ignored": build_artifact_count,
        "sha256_duplicates_aliased": dup_count,
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
        f"{m['rejected_retracted_papers']} rejected-retracted-paper, "
        f"{m['non_domain_ignored']} non-domain-ignored, "
        f"{m['build_artifact_ignored']} build-artifact-ignored, "
        f"{m['sha256_duplicates_aliased']} sha256-duplicates-aliased"
    )

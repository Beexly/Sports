"""Measure which files in C:\\Users\\Garrett\\Downloads reached the reasoning corpus.

WHY THIS EXISTS

"Everything in Downloads is in the engine" has been asserted repeatedly and never
measured. The corpus records carry a `pdf_path` field holding the absolute source
path, so coverage is exactly computable: enumerate Downloads, enumerate the
manifest's paths, take the difference.

That matters because the ingest stage only ever understood text and PDF. Downloads
is 368 files spanning .docx, .xlsx, .ipynb, .csv, .db, .py, .ts, .html, .eml, .ris,
.zip, .png, .log. Any claim of completeness that does not name those formats is
describing a subset and calling it the whole.

The audit is a measurement, not a repair. It reports four buckets:

  INGESTED          the manifest holds a record whose pdf_path matches this file
  INGESTED-AS-DUP   the content is in the corpus, under a different filename;
                    matched by sha256, so "absent" by path is not a gap
  ARCHIVED-ONLY     a byte copy exists inside the repo but no corpus record does
  ABSENT            neither path nor content; the text is outside the engine

The path/content split matters: Downloads holds the same document under several
names (`X.md`, `X (1).md`, `X - Copy.md`), and the ingest stage dedupes by sha256.
Counting only paths overstates the gap -- it reports a file as missing when every
word of it is already indexed.

USAGE
    python scripts/ops/downloads_coverage_audit.py
    python scripts/ops/downloads_coverage_audit.py --json
    python scripts/ops/downloads_coverage_audit.py --report docs/engine/research/2026-11-04/DOWNLOADS-COVERAGE.md

Exit: 0 always (this is an audit; a gap is a finding, not a failure).
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import sys
from pathlib import Path

DOWNLOADS = Path(os.path.expanduser("~")) / "Downloads"
MANIFEST = Path(os.path.expanduser("~")) / "AppData" / "Local" / "hermes" / "cache" / "scratch" / "research_corpus" / "merged_manifest_2026-11-04.clean.jsonl"
REPO = Path(__file__).resolve().parents[2]

# Directories that are tooling debris, not content.
SKIP_DIRS = {"__pycache__", ".pytest_cache", ".git", "node_modules"}

# Files that are absent from the corpus ON PURPOSE, with the reason. Without
# this table an auditor cannot tell a refusal from an oversight, and "absent"
# reads as a gap when it is a decision.
KNOWN_EXCLUSIONS = {
    "ssn passport.pdf":
        "identity document (passport scan) - PII; ingesting it into a searchable corpus is a liability",
    "statement 10_26_26 (449k, pdf).pdf":
        "bank statement - PII; same reason",
    "f.txt":
        "Chrome runtime bundle (Object.create polyfill), no editorial content",
    "f(1).txt":
        "duplicate of f.txt",
    "js":
        "Google JS runtime bundle ('Copyright 2012 Google Inc.'), no editorial content",
    "referer_frame.html":
        "saved from instagram.com/paid_ads/generete_pixels/ - ad-pixel frame",
    "saved_resource.html":
        "saved from facebook.com/instagram/login_sync/ - login-page scaffolding, 70 script tags",
    "saved_resource(1).html":
        "saved from fbsbx.com/paid_ads_pixel/iframe/ - ad-pixel iframe",
}


def exclusion_reason(name: str) -> str | None:
    return KNOWN_EXCLUSIONS.get(name.strip().lower())


# Extensions whose content could plausibly be a corpus document. Images and
# partial downloads are excluded from hashing by design, not by oversight.
HASHABLE = {".md", ".txt", ".docx", ".pdf", ".html", ".htm", ".ts", ".py",
            ".json", ".csv", ".ipynb", ".zip", ".log", ".eml", ".ris", ".xlsx"}


def norm(p: str) -> str:
    """Windows paths compare case-insensitively, and the manifest mixes separators."""
    return str(p).replace("/", "\\").strip().lower()


def sha256_of(p: Path) -> str | None:
    """Content identity, so a renamed duplicate is not counted as a gap."""
    import hashlib
    h = hashlib.sha256()
    try:
        with p.open("rb") as fh:
            for chunk in iter(lambda: fh.read(1 << 20), b""):
                h.update(chunk)
    except OSError:
        return None
    return h.hexdigest()


def enumerate_downloads() -> list[Path]:
    """Every regular file under Downloads, recursively, minus tooling debris."""
    out: list[Path] = []
    for root, dirs, files in os.walk(DOWNLOADS):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            out.append(Path(root) / f)
    return out


def load_manifest_paths(path: Path) -> tuple[dict[str, dict], list[dict]]:
    """Index manifest records by normalised pdf_path, and return all records.

    A record may legitimately lack pdf_path (arxiv/openalex records do), so the
    index is sparse by design.
    """
    by_path: dict[str, dict] = {}
    by_sha: dict[str, dict] = {}
    records: list[dict] = []
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
            except json.JSONDecodeError:
                continue
            records.append(d)
            src = d.get("pdf_path")
            if src:
                # First record wins; later duplicates of the same file add nothing.
                by_path.setdefault(norm(src), d)
            sha = d.get("sha256")
            if sha:
                by_sha.setdefault(str(sha).lower(), d)
    return by_path, by_sha, records


def repo_basenames() -> set[str]:
    """Basenames present anywhere in the repo, for the ARCHIVED-ONLY bucket.

    Cheap and slightly generous: a file whose name appears in the repo counts as
    archived even if it is a different revision. The report says so.
    """
    names: set[str] = set()
    for root, dirs, files in os.walk(REPO):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and d != ".git"]
        for f in files:
            names.add(f.lower())
    return names


def audit() -> dict:
    if not DOWNLOADS.is_dir():
        raise SystemExit(f"no Downloads directory at {DOWNLOADS}")
    if not MANIFEST.is_file():
        raise SystemExit(f"no corpus manifest at {MANIFEST}")

    files = enumerate_downloads()
    by_path, by_sha, records = load_manifest_paths(MANIFEST)
    archived = repo_basenames()

    ingested, ingested_dup, archived_only, absent = [], [], [], []
    for f in files:
        key = norm(str(f))
        if key in by_path:
            ingested.append(f)
            continue
        # Only hash plausible content: hashing 85 screenshots and 42 partial
        # downloads to prove they are irrelevant is wasted work.
        if f.suffix.lower() in HASHABLE:
            sha = sha256_of(f)
            if sha and sha.lower() in by_sha:
                ingested_dup.append(f)
                continue
        if f.name.lower() in archived:
            archived_only.append(f)
        else:
            absent.append(f)

    excluded = [(p.name, exclusion_reason(p.name)) for p in absent if exclusion_reason(p.name)]
    unexplained = [p.name for p in absent if not exclusion_reason(p.name)]

    def by_ext(paths: list[Path]) -> dict[str, int]:
        c = collections.Counter(p.suffix.lower() or "(none)" for p in paths)
        return dict(c.most_common())

    # Which record sources actually cover Downloads? Only local_* can, by design.
    local_records = [r for r in records if str(r.get("source", "")).startswith("local")]

    # A file can be present, indexed, and still incomplete: the ingest stage
    # capped documents at 200,000 chars. A record sitting exactly at that cap
    # was cut, not finished. Presence is not completeness.
    LEGACY_CAP = 200_000
    at_cap, no_text, text_chars = [], [], 0
    for r in local_records:
        ft = r.get("full_text") or ""
        ce = r.get("chars_extracted")
        if ce is None:
            ce = len(ft)
        text_chars += ce
        name = Path(str(r.get("pdf_path", ""))).name
        if ce == LEGACY_CAP:
            at_cap.append(name)
        elif ce == 0:
            no_text.append(name)

    return {
        "downloads_dir": str(DOWNLOADS),
        "manifest": str(MANIFEST),
        "downloads_files": len(files),
        "manifest_records": len(records),
        "manifest_paths_indexed": len(by_path),
        "local_records": len(local_records),
        "ingested": len(ingested),
        "ingested_dup": len(ingested_dup),
        "archived_only": len(archived_only),
        "absent": len(absent),
        "coverage_pct": round(100.0 * len(ingested) / len(files), 1) if files else 0.0,
        "content_pct": round(100.0 * (len(ingested) + len(ingested_dup)) / len(files), 1) if files else 0.0,
        "ingested_dup_files": sorted(p.name for p in ingested_dup),
        "local_records": len(local_records),
        "truncated_at_cap": sorted(at_cap),
        "empty_records": sorted(no_text),
        "total_chars_held": text_chars,
        "absent_by_ext": by_ext(absent),
        "archived_only_by_ext": by_ext(archived_only),
        "absent_files": sorted(p.name for p in absent),
        "excluded": sorted(excluded),
        "unexplained_count": len(unexplained),
        "unexplained_files": sorted(unexplained),
        "archived_only_files": sorted(p.name for p in archived_only),
    }


def to_markdown(a: dict) -> str:
    L = []
    L.append("# Downloads → corpus coverage")
    L.append("")
    L.append(f"Measured {a['downloads_dir']} against `{Path(a['manifest']).name}`.")
    L.append("")
    L.append("## Headline")
    L.append("")
    L.append(f"- Downloads files: **{a['downloads_files']}**")
    L.append(f"- Ingested (manifest holds the path): **{a['ingested']}** ({a['coverage_pct']}%)")
    L.append(f"- Same content under another name (sha256 match): **{a['ingested_dup']}**")
    L.append(f"- Content coverage: **{a['content_pct']}%**")
    L.append(f"- Archived in repo, not in corpus: **{a['archived_only']}**")
    L.append(f"- Absent entirely: **{a['absent']}**")
    L.append("")
    L.append(f"The manifest has {a['manifest_records']} records, of which {a['local_records']} are")
    L.append("`local_*` — the only sources that can carry a Downloads path. So the ceiling on")
    L.append(f"Downloads coverage from this manifest is {a['local_records']}, not {a['manifest_records']}.")
    L.append("")
    L.append("## Content completeness")
    L.append("")
    L.append("Presence is not completeness. The ingest stage capped documents at")
    L.append("200,000 chars, so a record sitting exactly at that cap was cut, not")
    L.append("finished. This section is the check the path count cannot make.")
    L.append("")
    L.append(f"- local records: **{a['local_records']}**")
    L.append(f"- still at the 200,000 cap: **{len(a['truncated_at_cap'])}**")
    L.append(f"- records with no text (need OCR): **{len(a['empty_records'])}**")
    L.append(f"- total characters held: **{a['total_chars_held']:,}**")
    L.append("")
    if a["truncated_at_cap"]:
        L.append("At cap: " + ", ".join(f"`{n}`" for n in a["truncated_at_cap"]))
        L.append("")
    if a["empty_records"]:
        L.append("No text: " + ", ".join(f"`{n}`" for n in a["empty_records"]))
        L.append("")
    L.append("## Absent, by extension")
    L.append("")
    L.append("| ext | count |")
    L.append("|---|---|")
    for ext, n in a["absent_by_ext"].items():
        L.append(f"| `{ext}` | {n} |")
    L.append("")
    L.append("## Deliberate exclusions")
    L.append("")
    L.append("Absent by decision, not by oversight. Each carries its reason.")
    L.append("")
    for name, reason in a["excluded"]:
        L.append(f"- `{name}` — {reason}")
    L.append("")
    L.append(f"Unexplained absences: **{a['unexplained_count']}** "
             f"(these are debris: screenshots and partial downloads).")
    L.append("")
    L.append("## Absent files")
    L.append("")
    for name in a["absent_files"]:
        L.append(f"- {name}")
    L.append("")
    L.append("## Archived-only files")
    L.append("")
    L.append("A same-named file exists in the repo, but no corpus record references it.")
    L.append("Name match is generous: it may be a different revision.")
    L.append("")
    for name in a["archived_only_files"]:
        L.append(f"- {name}")
    L.append("")
    return "\n".join(L)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Measure Downloads coverage in the corpus")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--report", type=Path, default=None)
    args = ap.parse_args(argv)

    a = audit()

    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(to_markdown(a), encoding="utf-8")
        print(f"report: {args.report}")

    if args.json:
        print(json.dumps(a, indent=2))
        return 0

    print(f"Downloads files      : {a['downloads_files']}")
    print(f"  ingested           : {a['ingested']} ({a['coverage_pct']}%)")
    print(f"  ingested as dup    : {a['ingested_dup']}  (content already indexed)")
    print(f"  content coverage   : {a['content_pct']}%")
    print(f"  archived only      : {a['archived_only']}")
    print(f"  absent             : {a['absent']}")
    print(f"    deliberately out : {len(a['excluded'])}")
    print(f"    unexplained      : {a['unexplained_count']}")
    print(f"content completeness : {a['local_records'] - len(a['truncated_at_cap']) - len(a['empty_records'])}"
          f"/{a['local_records']} complete"
          f" (at cap: {len(a['truncated_at_cap'])}, no text: {len(a['empty_records'])})")
    print(f"chars held           : {a['total_chars_held']:,}")
    print(f"manifest records     : {a['manifest_records']} "
          f"({a['local_records']} local_*, the only ones that can match)")
    if a["absent_by_ext"]:
        print("absent by extension  :")
        for ext, n in a["absent_by_ext"].items():
            print(f"    {ext:<10} {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

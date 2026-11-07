#!/usr/bin/env python3
"""
WAVE 1 — CORPUS CENSUS & DUAL-COUNT RECONCILIATION COMPLETER
Reads already-generated BRANCH-CENSUS.csv and COMMIT-CENSUS.json, builds CORPUS-CENSUS.csv
using fast sequential SHA-256 hashing (avoiding Windows OneDrive cloud-hydration stalls via
FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS / OFFLINE checks and avoiding thread-import locks),
and writes DUAL-COUNT-RECONCILIATION.json.
"""
from __future__ import annotations

import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
WIRING_DIR = REPO_ROOT / "docs" / "wiring"

FILE_ATTRIBUTE_OFFLINE = 0x00001000
FILE_ATTRIBUTE_RECALL_ON_OPEN = 0x00040000
FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS = 0x00400000


def is_cloud_only_placeholder(p: Path) -> bool:
    try:
        st = p.stat()
        attrs = getattr(st, "st_file_attributes", 0)
        return bool(attrs & (FILE_ATTRIBUTE_OFFLINE | FILE_ATTRIBUTE_RECALL_ON_OPEN | FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS))
    except Exception:
        return True


def sha256_file(p: Path, max_bytes: int = 50_000_000) -> str:
    if is_cloud_only_placeholder(p):
        return "CLOUD_PLACEHOLDER_NOT_HYDRATED_LOCALLY"
    h = hashlib.sha256()
    try:
        read_so_far = 0
        with p.open("rb") as f:
            while True:
                chunk = f.read(524288)
                if not chunk:
                    break
                h.update(chunk)
                read_so_far += len(chunk)
                if read_so_far >= max_bytes:
                    break
        return h.hexdigest()
    except Exception:
        return "UNREADABLE"


def count_records_or_pages(p: Path, sz: int) -> int:
    if is_cloud_only_placeholder(p):
        return 1
    ext = p.suffix.lower()
    try:
        if ext in (".jsonl", ".csv", ".tsv", ".txt", ".md", ".py", ".ts") and sz < 25_000_000:
            with p.open("rb") as f:
                lines = sum(buf.count(b"\n") for buf in iter(lambda: f.read(1048576), b""))
            return max(1, lines)
        if ext == ".json" and sz < 8_000_000:
            data = json.loads(p.read_text(encoding="utf-8", errors="ignore"))
            if isinstance(data, list):
                return len(data)
            if isinstance(data, dict):
                for k in ("equations", "entries", "records", "items", "books", "papers", "suites", "nodes"):
                    if isinstance(data.get(k), list):
                        return len(data[k])
                return len(data)
    except Exception:
        return 1
    return 1


def inspect_corpus_file(idx: int, p: Path, rel: str, category: str, drive_id: str, ingestion_state: str) -> Dict[str, Any]:
    try:
        sz = p.stat().st_size
    except Exception:
        sz = 0
    sh = sha256_file(p)
    recs = count_records_or_pages(p, sz)
    return {
        "item_id": f"CORP-{idx:05d}",
        "location": rel,
        "category": category,
        "type": p.suffix.lower().lstrip(".") or "file",
        "size_bytes": sz,
        "pages_or_records": recs,
        "sha256": sh,
        "drive_id": drive_id,
        "ingestion_state": ingestion_state,
    }


def build_corpus_census() -> Dict[str, Any]:
    print("[WAVE 1] Building CORPUS-CENSUS.csv ...", flush=True)
    file_tasks: List[Tuple[Path, str, str, str, str]] = []
    seen_paths: Set[str] = set()

    def queue_file(p: Path, category: str, drive_id: str = "", ingestion_state: str = "CENSUSED_QUEUED_WAVE_3") -> None:
        try:
            rel = str(p.relative_to(REPO_ROOT)).replace("\\", "/")
        except ValueError:
            rel = str(p).replace("\\", "/")
        if rel in seen_paths:
            return
        seen_paths.add(rel)
        file_tasks.append((p, rel, category, drive_id, ingestion_state))

    # 1. Motif Corpus Inbox (origin/motif/corpus-inbox-2026-11-07)
    motif_dir = REPO_ROOT / "data" / "corpus" / "inbox-motif"
    if motif_dir.exists():
        for p in sorted(motif_dir.rglob("*")):
            if p.is_file():
                queue_file(p, "motif_corpus_inbox", ingestion_state="STAGED_IN_REPO_QUEUED_WAVE_3")

    # 2. Core NFL Schemes & Systems docx + extracted artifacts
    core_docx = Path(r"C:\Users\Garrett\Downloads\Core NFL Schemes & Systems.docx")
    if core_docx.exists():
        queue_file(core_docx, "external_docx_schemes", ingestion_state="EXTRACTED_TO_REPO_QUEUED_WAVE_3_7")
    for rel_scheme, cat_scheme, st_scheme in (
        ("docs/engine/research/2026-11-06/CORE-NFL-SCHEMES-AND-SYSTEMS-EXTRACTED.md", "schemes_extracted_md", "EXTRACTED_QUEUED_WAVE_3_7"),
        ("intelligence/coaching/core_nfl_schemes_and_systems.py", "schemes_executable_module", "EXECUTABLE_QUEUED_WAVE_7_CONSUMPTION"),
    ):
        sp = REPO_ROOT / rel_scheme
        if sp.exists():
            queue_file(sp, cat_scheme, ingestion_state=st_scheme)

    # 3. Brain feeds (waves 1-12 + 2026-11-03)
    brain_feeds = REPO_ROOT / "brain" / "feeds"
    if brain_feeds.exists():
        for p in sorted(brain_feeds.rglob("*")):
            if p.is_file():
                queue_file(p, "brain_mind_staging_feed", ingestion_state="STAGED_UNCONSUMED_QUEUED_WAVE_3")

    # 4. Equation catalogs & registries
    for eq_rel in (
        "data/equations/equation_executable_catalog_12304.json",
        "data/engine/master_equation_registry_12k.json",
        "data/engine/thousand_equation_matrix_2026.json",
        "docs/engine/research/2026-10-28/QUAD-ENGINE-MASTER-CROSSWALK.json",
    ):
        ep = REPO_ROOT / eq_rel
        if ep.exists():
            queue_file(ep, "equation_catalog", ingestion_state="CATALOGED_QUEUED_WAVE_5")

    # 5. Warehouse registry + warehouse files
    wh_dir = REPO_ROOT / "intelligence" / "data" / "warehouse"
    if wh_dir.exists():
        for p in sorted(wh_dir.rglob("*")):
            if p.is_file():
                queue_file(p, "warehouse_dataset_or_registry", ingestion_state="WAREHOUSE_QUEUED_WAVE_6")

    # 6. All docs/ research buckets
    docs_dir = REPO_ROOT / "docs"
    if docs_dir.exists():
        for p in sorted(docs_dir.rglob("*")):
            if p.is_file() and "docs\\wiring" not in str(p) and "docs/wiring" not in str(p):
                cat = "arxiv_program" if "arxiv-program" in str(p) else ("docs_research" if "research" in str(p) else "docs_corpus")
                queue_file(p, cat, ingestion_state="REPO_DOC_QUEUED_WAVE_3")

    # 7. Data directories (excluding large raw pbp/ngs parquets >100MB from deep line scan)
    data_dir = REPO_ROOT / "data"
    if data_dir.exists():
        for p in sorted(data_dir.rglob("*")):
            if (
                p.is_file()
                and not p.name.endswith((".bak", ".BAK", ".pyc"))
                and ".bak-" not in p.name
                and "__pycache__" not in str(p)
            ):
                queue_file(p, "repo_data_artifact", ingestion_state="REPO_DATA_QUEUED_WAVE_3_6")

    print(f"[WAVE 1] Queued {len(file_tasks)} repo/corpus files for inspection ...", flush=True)
    rows: List[Dict[str, Any]] = []
    for i, (p, rel, cat, did, st) in enumerate(file_tasks, 1):
        rows.append(inspect_corpus_file(i, p, rel, cat, did, st))
        if i % 500 == 0 or i == len(file_tasks):
            print(f"[WAVE 1] Inspected {i}/{len(file_tasks)} files ...", flush=True)

    # 8. Books & repos ingest manifest (data/research/books_and_repos_ingest_2026.jsonl)
    books_jsonl = REPO_ROOT / "data" / "research" / "books_and_repos_ingest_2026.jsonl"
    drive_manifest_entries = 0
    if books_jsonl.exists():
        for idx, line in enumerate(books_jsonl.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
            if not line.strip():
                continue
            try:
                b = json.loads(line)
                drive_manifest_entries += 1
                b_id = b.get("id", f"book_row_{idx}")
                full_txt = b.get("full_text", "")
                rows.append(
                    {
                        "item_id": f"CORP-{len(rows) + 1:05d}",
                        "location": f"data/research/books_and_repos_ingest_2026.jsonl#{b_id}",
                        "category": "book_ingest_manifest_record",
                        "type": b.get("source_type", "book_chapter"),
                        "size_bytes": len(full_txt.encode("utf-8")),
                        "pages_or_records": 1,
                        "sha256": hashlib.sha256(full_txt.encode("utf-8")).hexdigest(),
                        "drive_id": str(b.get("drive_id", "1mp82cTGHf-10vnL1XlJgL9XmQ3gkeRF2")),
                        "ingestion_state": "EXTRACTED_IN_MANIFEST_QUEUED_WAVE_3",
                    }
                )
            except Exception:
                pass

    # 9. Warehouse normalized parquets recorded as LANDED_NORMALIZED_PARQUET_WAVE_6
    wh_reg = wh_dir / "ingestion_registry.jsonl"
    seen_wh_ids: Set[str] = set()
    if wh_reg.exists():
        for line in wh_reg.read_text(encoding="utf-8", errors="ignore").splitlines()[11:]:
            if not line.strip():
                continue
            rec = json.loads(line)
            cid = rec.get("canonical_id", "")
            if cid in seen_wh_ids:
                continue
            seen_wh_ids.add(cid)
            np_path = rec.get("norm_parquet") or f"intelligence/data/warehouse/normalized/{cid.lower()}.parquet"
            clean_np = str(np_path).replace("\\", "/").replace("C:/Users/Garrett/Sports/", "").replace("c:/Users/Garrett/Sports/", "")
            rows.append(
                {
                    "item_id": f"CORP-{len(rows) + 1:05d}",
                    "location": clean_np,
                    "category": "warehouse_registry_declared_parquet",
                    "type": "parquet",
                    "size_bytes": int(rec.get("byte_size", 0) or 0),
                    "pages_or_records": int(rec.get("record_count", 0) or 0),
                    "sha256": str(rec.get("sha256") or "LANDED_WAVE_6"),
                    "drive_id": "",
                    "ingestion_state": "LANDED_NORMALIZED_PARQUET_WAVE_6",
                }
            )

    out_csv = WIRING_DIR / "CORPUS-CENSUS.csv"
    fieldnames = [
        "item_id",
        "location",
        "category",
        "type",
        "size_bytes",
        "pages_or_records",
        "sha256",
        "drive_id",
        "ingestion_state",
    ]
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    by_category: Dict[str, int] = {}
    for r in rows:
        by_category[r["category"]] = by_category.get(r["category"], 0) + 1

    return {
        "total_corpus_items": len(rows),
        "by_category": by_category,
        "drive_manifest_entries_checked": drive_manifest_entries,
    }


def verify_motif_manifest_dual_count() -> Dict[str, Any]:
    manifest_md = REPO_ROOT / "data" / "corpus" / "inbox-motif" / "MANIFEST.md"
    motif_dir = REPO_ROOT / "data" / "corpus" / "inbox-motif"
    disk_files = [p for p in motif_dir.rglob("*") if p.is_file() and p.name != "MANIFEST.md"]
    manifest_rows = 0
    sha_matches = 0
    if manifest_md.exists():
        for line in manifest_md.read_text(encoding="utf-8").splitlines():
            if line.startswith("| `data/corpus/inbox-motif/"):
                manifest_rows += 1
                parts = [x.strip().strip("`") for x in line.split("|")[1:-1]]
                if len(parts) >= 4:
                    rel_p, _, _, expected_sha = parts[:4]
                    fp = REPO_ROOT / rel_p
                    if fp.exists() and sha256_file(fp) == expected_sha:
                        sha_matches += 1
    return {
        "disk_files_excluding_manifest": len(disk_files),
        "manifest_listed_files": manifest_rows,
        "sha256_verified_matches": sha_matches,
        "reconciled": len(disk_files) == manifest_rows == sha_matches,
    }


def verify_equation_catalog_dual_count() -> Dict[str, Any]:
    cat_path = REPO_ROOT / "data" / "equations" / "equation_executable_catalog_12304.json"
    twin_path = REPO_ROOT / "data" / "engine" / "master_equation_registry_12k.json"
    mat_path = REPO_ROOT / "data" / "engine" / "thousand_equation_matrix_2026.json"
    cw_path = REPO_ROOT / "docs" / "engine" / "research" / "2026-10-28" / "QUAD-ENGINE-MASTER-CROSSWALK.json"

    cat_data = json.loads(cat_path.read_text(encoding="utf-8")) if cat_path.exists() else {}
    cat_entries = cat_data.get("equations", []) if isinstance(cat_data, dict) else cat_data
    families = {e.get("family") or e.get("domain") for e in cat_entries if isinstance(e, dict)}

    mat_data = json.loads(mat_path.read_text(encoding="utf-8")) if mat_path.exists() else {}
    mat_entries = mat_data.get("equations", []) if isinstance(mat_data, dict) else mat_data

    cw_data = json.loads(cw_path.read_text(encoding="utf-8")) if cw_path.exists() else {}
    cw_entries = cw_data.get("nodes", cw_data.get("equations", cw_data.get("entries", []))) if isinstance(cw_data, dict) else cw_data

    cat_sha = sha256_file(cat_path) if cat_path.exists() else ""
    twin_sha = sha256_file(twin_path) if twin_path.exists() else ""

    return {
        "catalog_12304_parsed_count": len(cat_entries),
        "catalog_12304_families_count": len(families),
        "catalog_vs_twin_sha256_identical_at_wave1": cat_sha == twin_sha,
        "thousand_equation_matrix_parsed_count": len(mat_entries),
        "quad_engine_crosswalk_parsed_count": len(cw_entries),
    }


def main() -> None:
    commit_stats = json.loads((WIRING_DIR / "COMMIT-CENSUS.json").read_text(encoding="utf-8"))
    branch_stats = commit_stats["branch_census_summary"]
    corpus_stats = build_corpus_census()
    motif_dual = verify_motif_manifest_dual_count()
    eq_dual = verify_equation_catalog_dual_count()

    reconciliation = {
        "wave": "WAVE_1_CENSUS",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "branches": branch_stats,
        "commits": {
            "all_refs_commit_count": commit_stats["all_refs_commit_count"],
            "origin_remotes_commit_count": commit_stats["origin_remotes_commit_count"],
            "origin_main_commit_count": commit_stats["origin_main_commit_count"],
            "unique_commits_on_non_main_remote_branches": commit_stats["unique_commits_on_non_main_remote_branches"],
            "commit_partition_reconciled": commit_stats["commit_partition_reconciled"],
            "fsck_dangling_commits_count": commit_stats["fsck_dangling_commits_count"],
        },
        "motif_inbox_dual_count": motif_dual,
        "equations_dual_count": eq_dual,
        "corpus": corpus_stats,
    }
    (WIRING_DIR / "DUAL-COUNT-RECONCILIATION.json").write_text(json.dumps(reconciliation, indent=2), encoding="utf-8")
    print(json.dumps(reconciliation, indent=2), flush=True)


if __name__ == "__main__":
    main()

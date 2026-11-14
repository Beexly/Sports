#!/usr/bin/env python3
"""
Shard B (gcp_sync 6,300+ XML Markdown Extractions) & Google Drive Master Compiler (Track 2A).

Deep-parses:
  1. All XML-structured Markdown files under `C:\\Users\\Garrett\\Sports\\foundry\\artifacts\\gcp_sync`
     supporting uppercase and lowercase tags (`THINK_TRACE`/`think`, `SOURCE_OPERATORS_AND_EQUATIONS`,
     `RETROCAUSAL_GENEALOGY`, `RECURSIVE_THEORY_OF_MIND`, `CROSS_LAYER_VETO_ADJUDICATION`,
     `RLVR_COUNTERFACTUAL_VETOES`, `SOURCE_ANCHOR`, `SYNTHESIS`).
  2. Google Drive Master Archives:
     - `G:\\My Drive\\GSE-GSI-Mega-Sweep-2026-11-06\\EQUATIONS-MASTER-2026-11-10.jsonl.gz`
     - `G:\\My Drive\\GSE-GSI-Mega-Sweep-2026-11-06\\SITUATIONAL-MASTER-2026-11-10.jsonl.gz`
     - `G:\\My Drive\\GSE-Ultra-30TB-Vault\\**\\*.jsonl` (.jsonl.gz)

Writes canonical outputs to:
  - `docs/engine/research/2026-11-13/corpus_compilation/shard_b_operators_and_vetoes_catalog.json`
  - `docs/engine/research/2026-11-13/corpus_compilation/drive_master_equations_and_situational_index.json`
  - `brain/feeds/2026-11-13/corpus_sovereign_shard_b_and_drive_trainer_feed.jsonl`
    (trainer-ready feed only; NEVER mutates `brain/mind.jsonl`).
"""

from __future__ import annotations

import argparse
import datetime as dt
import gzip
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, Mapping, Optional, Sequence, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_GCP_SYNC_DIR = Path(r"C:\Users\Garrett\Sports\foundry\artifacts\gcp_sync")
DEFAULT_EQUATIONS_GZ = Path(
    r"G:\My Drive\GSE-GSI-Mega-Sweep-2026-11-06\EQUATIONS-MASTER-2026-11-10.jsonl.gz"
)
DEFAULT_SITUATIONAL_GZ = Path(
    r"G:\My Drive\GSE-GSI-Mega-Sweep-2026-11-06\SITUATIONAL-MASTER-2026-11-10.jsonl.gz"
)
DEFAULT_VAULT_DIR = Path(r"G:\My Drive\GSE-Ultra-30TB-Vault")

DEFAULT_COMPILATION_DIR = (
    REPO_ROOT
    / "docs"
    / "engine"
    / "research"
    / "2026-11-13"
    / "corpus_compilation"
)
DEFAULT_FEED_PATH = (
    REPO_ROOT
    / "brain"
    / "feeds"
    / "2026-11-13"
    / "corpus_sovereign_shard_b_and_drive_trainer_feed.jsonl"
)

SITUATIONAL_FAMILY_KEYWORDS: Dict[str, Tuple[str, ...]] = {
    "pressure": (
        "pressure",
        "blitz",
        "sack",
        "pass rush",
        "blitz rate",
        "trench",
        "pocket",
        "stunt",
        "time to throw",
        "hurry",
    ),
    "weather": (
        "weather",
        "wind",
        "rain",
        "snow",
        "temperature",
        "cold",
        "precipitation",
        "dome",
        "turf",
        "humid",
    ),
    "restFatigue": (
        "fatigue",
        "rest",
        "short week",
        "bye",
        "circadian",
        "travel",
        "elevation",
        "tired",
        "recovery",
        "workload",
    ),
    "coveragePersonnel": (
        "coverage",
        "man",
        "zone",
        "two-high",
        "cover-1",
        "cover-3",
        "personnel",
        "nickel",
        "slot",
        "alignment",
        "separation",
    ),
    "qbSkillScript": (
        "quarterback",
        "qb",
        "cpoe",
        "epa",
        "play-action",
        "motion",
        "early down",
        "red zone",
        "fourth down",
        "script",
        "trailing",
        "leading",
    ),
    "marketMicrostructure": (
        "market",
        "calibration",
        "conformal",
        "wasserstein",
        "sinkhorn",
        "entropy",
        "kl",
        "bregman",
        "kelly",
        "clv",
        "brier",
        "posterior",
        "likelihood",
        "poisson",
    ),
}

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.S)
XML_TAG_NAMES = (
    "NATIVE_REASONING",
    "THINK_TRACE",
    "think",
    "SOURCE_OPERATORS_AND_EQUATIONS",
    "sovereign_extraction",
    "RETROCAUSAL_GENEALOGY",
    "retrocausal_genealogy",
    "RECURSIVE_THEORY_OF_MIND",
    "theory_of_mind",
    "CROSS_LAYER_VETO_ADJUDICATION",
    "cross_layer_veto",
    "RLVR_COUNTERFACTUAL_VETOES",
    "SOURCE_ANCHOR",
    "SYNTHESIS",
    "GSE_GSI_FRONTIER_REASONING",
)
TAG_REGEXES = {
    tag: re.compile(rf"<{tag}>(.*?)</{tag}>", re.S | re.I) for tag in XML_TAG_NAMES
}
LATEX_BLOCK_RE = re.compile(r"\$\$(.+?)\$\$|\\\[(.+?)\\\]", re.S)
PAGE_REF_RE = re.compile(r"\[PAGE\s+(\d+)\]", re.I)


def _compile_family_patterns() -> Dict[str, Tuple[re.Pattern[str], ...]]:
    """Compile case-insensitive word-boundary patterns for each situational family."""
    compiled: Dict[str, Tuple[re.Pattern[str], ...]] = {}
    for fam, kws in SITUATIONAL_FAMILY_KEYWORDS.items():
        compiled[fam] = tuple(
            re.compile(r"(?<!\w)" + re.escape(kw.strip()) + r"(?!\w)", re.I)
            for kw in kws
            if kw.strip()
        )
    return compiled


SITUATIONAL_FAMILY_PATTERNS = _compile_family_patterns()
_SITUATIONAL_FAMILY_MATCHERS: Dict[str, Tuple[Tuple[str, re.Pattern[str]], ...]] = {
    fam: tuple(
        (kw.strip().lower(), pat)
        for kw, pat in zip(
            (k for k in SITUATIONAL_FAMILY_KEYWORDS[fam] if k.strip()),
            patterns,
        )
    )
    for fam, patterns in SITUATIONAL_FAMILY_PATTERNS.items()
}


def classify_situational_family(text: str) -> str:
    """Assign primary situational/theoretical family based on domain vocabulary."""
    src = text or ""
    src_lower = src.lower()
    best_family = "marketMicrostructure"
    best_score = 0
    for fam, matchers in _SITUATIONAL_FAMILY_MATCHERS.items():
        score = sum(1 for kw_l, pat in matchers if kw_l in src_lower and pat.search(src))
        if score > best_score:
            best_score = score
            best_family = fam
    return best_family


def parse_frontmatter(text: str) -> Tuple[Dict[str, str], str]:
    """Extract YAML-style key: value header and return (meta, body)."""
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    meta: Dict[str, str] = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip().strip('"').strip("'")
    return meta, text[m.end() :]


def extract_xml_blocks(body: str) -> Dict[str, str]:
    """Extract canonical logical sections across uppercase and lowercase XML conventions."""
    raw_hits: Dict[str, str] = {}
    for tag, rx in TAG_REGEXES.items():
        matches = rx.findall(body)
        if matches:
            # Prefer last non-empty match (skipping `<NATIVE_REASONING>` instructional recap if present)
            cleaned = [m.strip() for m in matches if m.strip()]
            if cleaned:
                raw_hits[tag] = cleaned[-1]

    canonical: Dict[str, str] = {}
    canonical["think"] = raw_hits.get("THINK_TRACE") or raw_hits.get("think") or ""
    canonical["operators"] = (
        raw_hits.get("SOURCE_OPERATORS_AND_EQUATIONS")
        or raw_hits.get("sovereign_extraction")
        or ""
    )
    canonical["retrocausal_genealogy"] = (
        raw_hits.get("RETROCAUSAL_GENEALOGY")
        or raw_hits.get("retrocausal_genealogy")
        or ""
    )
    canonical["theory_of_mind"] = (
        raw_hits.get("RECURSIVE_THEORY_OF_MIND")
        or raw_hits.get("theory_of_mind")
        or ""
    )
    canonical["cross_layer_veto"] = (
        raw_hits.get("CROSS_LAYER_VETO_ADJUDICATION")
        or raw_hits.get("cross_layer_veto")
        or ""
    )
    canonical["rlvr_vetoes"] = raw_hits.get("RLVR_COUNTERFACTUAL_VETOES") or ""
    canonical["synthesis"] = raw_hits.get("SYNTHESIS") or ""
    canonical["source_anchor"] = raw_hits.get("SOURCE_ANCHOR") or ""
    return {k: v for k, v in canonical.items() if v}


def extract_latex_expressions(text: str, limit: int = 8) -> List[str]:
    """Extract display LaTeX expressions cleanly without fabricating content."""
    out: List[str] = []
    seen = set()
    for a, b in LATEX_BLOCK_RE.findall(text or ""):
        expr = re.sub(r"\s+", " ", (a or b).strip())
        if len(expr) < 6 or len(expr) > 260:
            continue
        if expr not in seen:
            seen.add(expr)
            out.append(expr)
            if len(out) >= limit:
                break
    return out


def parse_shard_b_markdown_file(path: Path) -> Dict[str, Any]:
    """Deep-parse one Shard B GCP extraction Markdown file."""
    text = path.read_text(encoding="utf-8", errors="ignore")
    meta, body = parse_frontmatter(text)
    sections = extract_xml_blocks(body)
    op_text = sections.get("operators", "")
    veto_text = sections.get("cross_layer_veto", "")
    rlvr_text = sections.get("rlvr_vetoes", "")
    think_text = sections.get("think", "")
    combined = "\n".join(
        s for s in (op_text, veto_text, rlvr_text, think_text, sections.get("synthesis", "")) if s
    )
    equations = extract_latex_expressions(op_text or combined, limit=6)
    page_refs = sorted({int(p) for p in PAGE_REF_RE.findall(combined)})
    family = classify_situational_family(f"{meta.get('source', '')} {op_text} {veto_text}")

    stem = path.stem
    doc_hash = stem.split("_", 1)[0] if "_" in stem else hashlib.sha256(stem.encode()).hexdigest()[:10]
    word_count = len(body.split())

    return {
        "file_name": path.name,
        "rel_key": stem,
        "doc_hash": doc_hash,
        "source": meta.get("source") or stem,
        "folder": meta.get("folder") or "",
        "pages": meta.get("pages") or "",
        "model": meta.get("model") or "unknown",
        "word_count": word_count,
        "sections_present": sorted(sections.keys()),
        "think_words": len(think_text.split()),
        "operators_words": len(op_text.split()),
        "veto_words": len(veto_text.split()),
        "rlvr_words": len(rlvr_text.split()),
        "family": family,
        "page_refs": page_refs[:20],
        "equations": equations,
        "veto_excerpt": (veto_text or rlvr_text or op_text)[:420].strip(),
        "operator_excerpt": (op_text or think_text)[:420].strip(),
    }


def compile_shard_b_directory(
    sync_dir: Path = DEFAULT_GCP_SYNC_DIR,
    limit: Optional[int] = None,
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """Compile all `.md` files in `sync_dir` and return (catalog_summary, trainer_records)."""
    if not sync_dir.exists():
        return (
            {
                "exists": False,
                "sync_dir": str(sync_dir),
                "total_markdown_files": 0,
                "files_with_xml_sections": 0,
                "family_counts": {},
                "model_counts": {},
                "entries": [],
            },
            [],
        )

    top_level_md = sorted(sync_dir.glob("*.md"))
    seen_names = {p.name for p in top_level_md}
    md_files = list(top_level_md)
    for p in sorted(sync_dir.rglob("*.md")):
        if p.name not in seen_names:
            seen_names.add(p.name)
            md_files.append(p)
    if limit is not None:
        md_files = md_files[:limit]

    family_counts: Counter[str] = Counter()
    model_counts: Counter[str] = Counter()
    section_counts: Counter[str] = Counter()
    xml_ok = 0
    total_equations = 0
    compact_entries: List[Dict[str, Any]] = []
    trainer_records: List[Dict[str, Any]] = []

    for p in md_files:
        rec = parse_shard_b_markdown_file(p)
        if rec["sections_present"]:
            xml_ok += 1
        for sec in rec["sections_present"]:
            section_counts[sec] += 1
        family_counts[rec["family"]] += 1
        model_counts[rec["model"]] += 1
        total_equations += len(rec["equations"])

        # Keep every document in compact index (metadata + equations + bounded excerpts)
        compact_entries.append(
            {
                "doc_hash": rec["doc_hash"],
                "file_name": rec["file_name"],
                "source": rec["source"],
                "model": rec["model"],
                "family": rec["family"],
                "sections_present": rec["sections_present"],
                "think_words": rec["think_words"],
                "equations": rec["equations"],
                "veto_excerpt": rec["veto_excerpt"] if rec["equations"] or rec["veto_words"] > 20 else "",
            }
        )

        if rec["sections_present"]:
            trainer_records.append(
                {
                    "schema": "gse.trainer.shard_b.v1",
                    "doc_hash": rec["doc_hash"],
                    "source": rec["source"],
                    "model": rec["model"],
                    "family": rec["family"],
                    "sections": rec["sections_present"],
                    "equations": rec["equations"],
                    "operator_excerpt": rec["operator_excerpt"],
                    "veto_excerpt": rec["veto_excerpt"],
                    "page_refs": rec["page_refs"],
                }
            )

    summary = {
        "schema": "gse.shard_b_operators_and_vetoes_catalog.v1",
        "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "sync_dir": str(sync_dir),
        "total_markdown_files": len(md_files),
        "files_with_xml_sections": xml_ok,
        "total_extracted_equations": total_equations,
        "family_counts": dict(family_counts),
        "section_counts": dict(section_counts),
        "model_counts": dict(model_counts.most_common(25)),
        "entries": compact_entries,
    }
    return summary, trainer_records


def iter_jsonl_or_gz(path: Path) -> Iterator[Dict[str, Any]]:
    """Stream JSON objects line-by-line from `.jsonl` or `.jsonl.gz` without blowing RAM."""
    if not path.exists():
        return
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                if isinstance(obj, dict):
                    yield obj
            except json.JSONDecodeError:
                continue


def compile_drive_masters(
    *,
    equations_gz: Path = DEFAULT_EQUATIONS_GZ,
    situational_gz: Path = DEFAULT_SITUATIONAL_GZ,
    vault_dir: Path = DEFAULT_VAULT_DIR,
    max_samples_per_family: int = 40,
    max_trainer_records_drive: int = 2500,
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """Stream Drive equations & situational master archives and compile clean indexes."""
    eq_rows = 0
    eq_books = set()
    eq_domain_counts: Counter[str] = Counter()
    eq_family_counts: Counter[str] = Counter()
    eq_samples: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    trainer_drive: List[Dict[str, Any]] = []

    for row in iter_jsonl_or_gz(equations_gz):
        eq_rows += 1
        book = str(row.get("book") or row.get("file") or "unknown")
        eq_books.add(book)
        tags = row.get("domain_tags") or []
        if isinstance(tags, list):
            for t in tags:
                eq_domain_counts[str(t)] += 1
        eq_txt = str(row.get("equation") or "")
        desc = str(row.get("description") or "")
        fam = classify_situational_family(f"{book} {row.get('section', '')} {desc} {' '.join(map(str, tags))}")
        eq_family_counts[fam] += 1

        if len(eq_samples[fam]) < max_samples_per_family and len(eq_txt) >= 5:
            eq_samples[fam].append(
                {
                    "book": book,
                    "author": str(row.get("author") or ""),
                    "year": row.get("year"),
                    "page": row.get("page"),
                    "section": str(row.get("section") or ""),
                    "equation": eq_txt[:300],
                    "description": desc[:320],
                    "domain_tags": tags[:6] if isinstance(tags, list) else [],
                }
            )
        if len(trainer_drive) < max_trainer_records_drive // 2 and len(eq_txt) >= 8:
            trainer_drive.append(
                {
                    "schema": "gse.trainer.drive_equation.v1",
                    "book": book,
                    "page": row.get("page"),
                    "family": fam,
                    "equation": eq_txt[:300],
                    "description": desc[:320],
                }
            )

    sit_rows = 0
    sit_books = set()
    sit_kind_counts: Counter[str] = Counter()
    sit_family_counts: Counter[str] = Counter()
    sit_samples: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    for row in iter_jsonl_or_gz(situational_gz):
        sit_rows += 1
        book = str(row.get("book") or row.get("file") or "unknown")
        sit_books.add(book)
        kind = str(row.get("kind") or "unknown")
        sit_kind_counts[kind] += 1
        stmt = str(row.get("statement") or "")
        sit_txt = str(row.get("situation") or "")
        fam = classify_situational_family(f"{book} {sit_txt} {stmt}")
        sit_family_counts[fam] += 1

        if len(sit_samples[fam]) < max_samples_per_family and len(stmt) >= 15:
            sit_samples[fam].append(
                {
                    "book": book,
                    "author": str(row.get("author") or ""),
                    "year": row.get("year"),
                    "page": row.get("page"),
                    "kind": kind,
                    "situation": sit_txt[:220],
                    "statement": stmt[:360],
                }
            )
        if len(trainer_drive) < max_trainer_records_drive and len(stmt) >= 20:
            trainer_drive.append(
                {
                    "schema": "gse.trainer.drive_situational.v1",
                    "book": book,
                    "page": row.get("page"),
                    "kind": kind,
                    "family": fam,
                    "situation": sit_txt[:220],
                    "statement": stmt[:360],
                }
            )

    vault_jsonl_stats: List[Dict[str, Any]] = []
    if vault_dir.exists():
        for vp in sorted(list(vault_dir.rglob("*.jsonl")) + list(vault_dir.rglob("*.jsonl.gz"))):
            v_count = 0
            for _ in iter_jsonl_or_gz(vp):
                v_count += 1
            vault_jsonl_stats.append(
                {
                    "file": str(vp.relative_to(vault_dir)),
                    "rows": v_count,
                    "bytes": vp.stat().st_size,
                }
            )

    index_doc = {
        "schema": "gse.drive_master_equations_and_situational_index.v1",
        "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "sources": {
            "equations_master_gz": {"path": str(equations_gz), "exists": equations_gz.exists(), "rows": eq_rows, "unique_books": len(eq_books)},
            "situational_master_gz": {"path": str(situational_gz), "exists": situational_gz.exists(), "rows": sit_rows, "unique_books": len(sit_books)},
            "vault_jsonl_files": vault_jsonl_stats,
        },
        "equations_family_counts": dict(eq_family_counts),
        "equations_top_domain_tags": dict(eq_domain_counts.most_common(30)),
        "situational_family_counts": dict(sit_family_counts),
        "situational_kind_counts": dict(sit_kind_counts),
        "equations_by_family": dict(eq_samples),
        "situational_by_family": dict(sit_samples),
    }
    return index_doc, trainer_drive


def run_compile(
    *,
    sync_dir: Path = DEFAULT_GCP_SYNC_DIR,
    equations_gz: Path = DEFAULT_EQUATIONS_GZ,
    situational_gz: Path = DEFAULT_SITUATIONAL_GZ,
    vault_dir: Path = DEFAULT_VAULT_DIR,
    compilation_dir: Path = DEFAULT_COMPILATION_DIR,
    feed_path: Path = DEFAULT_FEED_PATH,
    shard_b_limit: Optional[int] = None,
) -> Dict[str, Any]:
    """Execute full deep compilation of Shard B + Drive Master archives."""
    shard_b_summary, shard_b_trainer = compile_shard_b_directory(
        sync_dir=sync_dir, limit=shard_b_limit
    )
    drive_index, drive_trainer = compile_drive_masters(
        equations_gz=equations_gz,
        situational_gz=situational_gz,
        vault_dir=vault_dir,
    )

    compilation_dir.mkdir(parents=True, exist_ok=True)
    shard_b_out = compilation_dir / "shard_b_operators_and_vetoes_catalog.json"
    drive_out = compilation_dir / "drive_master_equations_and_situational_index.json"
    shard_b_out.write_text(
        json.dumps(shard_b_summary, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    drive_out.write_text(
        json.dumps(drive_index, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    feed_path.parent.mkdir(parents=True, exist_ok=True)
    total_feed_rows = 0
    with feed_path.open("w", encoding="utf-8") as f:
        for row in shard_b_trainer:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
            total_feed_rows += 1
        for row in drive_trainer:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
            total_feed_rows += 1

    return {
        "ok": True,
        "shard_b_files_parsed": shard_b_summary["total_markdown_files"],
        "shard_b_files_with_xml": shard_b_summary["files_with_xml_sections"],
        "shard_b_equations": shard_b_summary["total_extracted_equations"],
        "drive_equations_rows": drive_index["sources"]["equations_master_gz"]["rows"],
        "drive_situational_rows": drive_index["sources"]["situational_master_gz"]["rows"],
        "trainer_feed_rows": total_feed_rows,
        "outputs": {
            "shard_b_catalog": str(shard_b_out),
            "drive_index": str(drive_out),
            "trainer_feed": str(feed_path),
        },
    }


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Deep Compiler for Shard B (gcp_sync .md) and Google Drive Master Archives"
    )
    parser.add_argument("--shard-b-limit", type=int, default=None)
    args = parser.parse_args(argv)
    res = run_compile(shard_b_limit=args.shard_b_limit)
    print(json.dumps(res, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

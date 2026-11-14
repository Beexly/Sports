#!/usr/bin/env python3
r"""ArXiv Program + Sovereign Tier-A/Tier-B Equation & Trainer-Feed Synthesizer.

Implements `META-CORPUS-ARXIV-TIERB-01` under MIND-FIRST + WIRE-FIRST SEQUENCING:
  - Reads `C:\\Users\\Garrett\\Sports\\foundry\\foundry.db` strictly in URI read-only mode
    (`?mode=ro`) to audit Shard A `0..3`, `4..7`, and `8..f` across Tier-A and Tier-B.
  - Reads all Gatekeeper-validated Sovereign primitive artifacts (`COMPLETE` + fail-closed
    `INSUFFICIENT_SOURCE_ACCESS` stub receipts) across the worktree (precedence) and shared
    Foundry store (read-only).
  - Cross-indexes `docs/arxiv-program/` research catalogs (`arXiv:\d{4}\.\d{4,5}`) with
    extracted Sovereign primitives, MIT Sloan / NESSIS / JQAS / Wharton papers, NFL WAR /
    4th-down models, graduate textbooks, 2026 NFL Rulebook, and sports psychology books.
  - Emits:
      1. `docs/arxiv-program/research/2026-11-14/arxiv_and_tier_a_sovereign_equation_synthesis.json`
      2. `brain/feeds/2026-11-14/arxiv_sovereign_and_shard_b_trainer_feed.jsonl`
         (strictly under `brain/feeds/2026-11-14/`, NEVER writing `brain/mind.jsonl`).
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import re
import sqlite3
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.foundry_bridge.sovereign_to_cognitive_router_wiring import (
    SITUATIONAL_FAMILIES,
    classify_text_to_family,
    compute_family_bit_index,
    encode_288bit_mask,
    positive_part_james_stein_shrink,
)

SHARED_FOUNDRY_DB = Path(r"C:\Users\Garrett\Sports\foundry\foundry.db")
SHARED_GATEKEEPER_PY = Path(r"C:\Users\Garrett\Sports\foundry\gatekeeper.py")
SHARED_PRIMITIVES_DIR = Path(r"C:\Users\Garrett\Sports\foundry\artifacts\primitives")
WT_PRIMITIVES_DIR = REPO_ROOT / "foundry" / "artifacts" / "primitives"

DEFAULT_ARXIV_DOCS_DIR = REPO_ROOT / "docs" / "arxiv-program"
DEFAULT_SYNTHESIS_JSON = (
    REPO_ROOT
    / "docs"
    / "arxiv-program"
    / "research"
    / "2026-11-14"
    / "arxiv_and_tier_a_sovereign_equation_synthesis.json"
)
DEFAULT_TRAINER_FEED_JSONL = (
    REPO_ROOT
    / "brain"
    / "feeds"
    / "2026-11-14"
    / "arxiv_sovereign_and_shard_b_trainer_feed.jsonl"
)

ARXIV_ID_RE = re.compile(r"\b(\d{4}\.\d{4,5})(?:v\d+)?\b")


def _load_gatekeeper(gatekeeper_py: Path = SHARED_GATEKEEPER_PY) -> Optional[Any]:
    if not gatekeeper_py.is_file():
        return None
    spec = importlib.util.spec_from_file_location("foundry_gatekeeper_ro", gatekeeper_py)
    if spec is None or spec.loader is None:
        return None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def classify_corpus_track(title: str, file_name: str, domain: str) -> str:
    blob = f"{title} {file_name} {domain}".lower()
    if ARXIV_ID_RE.search(blob) or "arxiv" in blob:
        return "arxiv_and_preprints"
    if any(k in blob for k in ("sloan", "nessis", "jqas", "wharton", "statsbomb", "hudl")):
        return "mit_sloan_jqas_nessis_conferences"
    if any(k in blob for k in ("4th down", "fourth down", "nflwar", "pff war", "wins above replacement")):
        return "nfl_war_and_fourth_down_decision"
    if any(k in blob for k in ("rulebook", "coaching", "progression", "split-field", "split field", "draft guide", "hidden game")):
        return "football_coaching_rules_and_scouting"
    if any(k in blob for k in ("psych", "mental game", "mind gym", "arousal", "cognition", "habit")):
        return "sports_psychology_and_cognition"
    return "graduate_math_stats_physics_textbooks"


def _shard_bucket(sha256_hex: str) -> str:
    if not sha256_hex:
        return "unknown"
    first = sha256_hex[0].lower()
    if first in {"0", "1", "2", "3"}:
        return "0..3"
    if first in {"4", "5", "6", "7"}:
        return "4..7"
    if first in {"8", "9", "a", "b", "c", "d", "e", "f"}:
        return "8..f"
    return "unknown"


def audit_foundry_db_readonly(
    db_path: Path,
    completed_book_ids: Sequence[str],
) -> Dict[str, Any]:
    """Audit `corpus_queue` in strict read-only URI mode (`?mode=ro`)."""
    if not db_path.is_file():
        return {
            "db_available": False,
            "total_rows": 0,
            "partition_tier_summary": {},
            "shard_4to7_tier_a_remaining_with_file": 0,
            "shard_4to7_tier_b_pending_candidates": [],
        }

    done_set = set(completed_book_ids)
    uri = f"file:///{db_path.as_posix()}?mode=ro"
    conn = sqlite3.connect(uri, uri=True, timeout=5.0)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT book_id, file_path, sha256, file_name, title, year, primary_domain, tier, status, pages_total, file_size
            FROM corpus_queue
            ORDER BY tier ASC, COALESCE(file_size, 0) ASC, book_id ASC
            """
        ).fetchall()
    finally:
        conn.close()

    matrix: Dict[str, Counter[str]] = defaultdict(Counter)
    shard_4to7_tier_a_remaining: List[Dict[str, Any]] = []
    shard_4to7_tier_b_candidates: List[Dict[str, Any]] = []

    for r in rows:
        bid = str(r["book_id"] or "")
        sha = str(r["sha256"] or "")
        tier = str(r["tier"] or "UNKNOWN")
        status = str(r["status"] or "UNKNOWN")
        bucket = _shard_bucket(sha)
        fpath = str(r["file_path"] or "")
        file_exists = bool(fpath and Path(fpath).is_file())
        effective_done = (bid in done_set) or (status == "COMPLETE")

        key = f"{bucket}|tier_{tier}"
        matrix[key]["total"] += 1
        if effective_done:
            matrix[key]["completed_or_extracted"] += 1
        elif status == "PENDING":
            matrix[key]["pending_unextracted"] += 1
            if file_exists:
                matrix[key]["pending_with_local_file"] += 1

        if bucket == "4..7" and not effective_done and status == "PENDING" and file_exists:
            entry = {
                "book_id": bid,
                "title": str(r["title"] or r["file_name"] or bid),
                "file_name": str(r["file_name"] or ""),
                "primary_domain": str(r["primary_domain"] or "other"),
                "tier": tier,
                "file_size_mb": round(float(r["file_size"] or 0) / (1024 * 1024), 3),
            }
            if tier == "A":
                shard_4to7_tier_a_remaining.append(entry)
            elif tier == "B" and len(shard_4to7_tier_b_candidates) < 40:
                shard_4to7_tier_b_candidates.append(entry)

    return {
        "db_available": True,
        "total_rows": len(rows),
        "partition_tier_summary": {k: dict(v) for k, v in sorted(matrix.items())},
        "shard_4to7_tier_a_remaining_with_file": len(shard_4to7_tier_a_remaining),
        "shard_4to7_tier_a_remaining_preview": shard_4to7_tier_a_remaining[:10],
        "shard_4to7_tier_b_pending_candidates_count": matrix["4..7|tier_B"]["pending_with_local_file"],
        "shard_4to7_tier_b_pending_candidates": shard_4to7_tier_b_candidates,
    }


def scan_arxiv_program_ids(arxiv_docs_dir: Path) -> Dict[str, Any]:
    """Scan `docs/arxiv-program/` for distinct arXiv IDs and catalog files."""
    if not arxiv_docs_dir.is_dir():
        return {"files_scanned": 0, "unique_arxiv_ids_count": 0, "sample_arxiv_ids": []}
    found_ids = set()
    files_scanned = 0
    for p in sorted(arxiv_docs_dir.rglob("*")):
        if not p.is_file() or p.suffix.lower() not in {".md", ".json", ".jsonl", ".txt", ".csv"}:
            continue
        if p.resolve() == DEFAULT_SYNTHESIS_JSON.resolve():
            continue
        files_scanned += 1
        try:
            text = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for m in ARXIV_ID_RE.finditer(text):
            found_ids.add(m.group(1))
    sorted_ids = sorted(found_ids)
    return {
        "files_scanned": files_scanned,
        "unique_arxiv_ids_count": len(sorted_ids),
        "sample_arxiv_ids": sorted_ids[:50],
    }


def load_merged_sovereign_docs(
    wt_primitives_dir: Path = WT_PRIMITIVES_DIR,
    shared_primitives_dir: Path = SHARED_PRIMITIVES_DIR,
    gatekeeper_py: Path = SHARED_GATEKEEPER_PY,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], int]:
    """Load deduplicated Sovereign artifacts (worktree precedence) and validate via Gatekeeper."""
    gatekeeper_mod = _load_gatekeeper(gatekeeper_py)
    by_book_id: Dict[str, Tuple[Path, Dict[str, Any]]] = {}

    for directory in (shared_primitives_dir, wt_primitives_dir):
        if not directory.is_dir():
            continue
        for json_path in sorted(directory.glob("*.json")):
            try:
                doc = json.loads(json_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            bid = str(doc.get("book_id") or json_path.stem)
            by_book_id[bid] = (json_path, doc)

    complete_docs: List[Dict[str, Any]] = []
    refused_docs: List[Dict[str, Any]] = []
    gatekeeper_failures = 0

    for bid in sorted(by_book_id.keys()):
        _, doc = by_book_id[bid]
        if gatekeeper_mod is not None:
            errs = gatekeeper_mod.validate(doc)
            if errs:
                gatekeeper_failures += 1
                continue
        status = str(doc.get("source_status") or "COMPLETE")
        if status == "INSUFFICIENT_SOURCE_ACCESS":
            refused_docs.append(doc)
        elif status == "COMPLETE":
            complete_docs.append(doc)

    return complete_docs, refused_docs, gatekeeper_failures


def synthesize_arxiv_and_sovereign_corpus(
    *,
    wt_primitives_dir: Path = WT_PRIMITIVES_DIR,
    shared_primitives_dir: Path = SHARED_PRIMITIVES_DIR,
    foundry_db_path: Path = SHARED_FOUNDRY_DB,
    gatekeeper_py: Path = SHARED_GATEKEEPER_PY,
    arxiv_docs_dir: Path = DEFAULT_ARXIV_DOCS_DIR,
    synthesis_out_path: Path = DEFAULT_SYNTHESIS_JSON,
    trainer_feed_out_path: Path = DEFAULT_TRAINER_FEED_JSONL,
) -> Dict[str, Any]:
    """Run full read-only synthesis and emit dated ArXiv/Sovereign JSON + trainer feed JSONL."""
    # Guardrail: never allow writing directly to brain/mind.jsonl
    if trainer_feed_out_path.name == "mind.jsonl":
        raise ValueError("Forbidden target: single-writer rule prohibits writing brain/mind.jsonl directly.")

    complete_docs, refused_docs, gk_failures = load_merged_sovereign_docs(
        wt_primitives_dir=wt_primitives_dir,
        shared_primitives_dir=shared_primitives_dir,
        gatekeeper_py=gatekeeper_py,
    )
    all_valid_ids = [str(d["book_id"]) for d in complete_docs] + [str(d["book_id"]) for d in refused_docs]

    db_audit = audit_foundry_db_readonly(foundry_db_path, all_valid_ids)
    arxiv_scan = scan_arxiv_program_ids(arxiv_docs_dir)

    track_counts: Counter[str] = Counter()
    family_primitive_counts: Counter[str] = Counter()
    active_bits: set[int] = set()
    trainer_records: List[Dict[str, Any]] = []
    track_catalog: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    arxiv_matched_books: List[Dict[str, Any]] = []

    total_primitives = 0
    total_traces = 0
    total_pages_read = 0

    for doc in complete_docs:
        bid = str(doc.get("book_id") or "")
        title = str(doc.get("title") or bid)
        fname = str(doc.get("file_name") or "")
        domain = str(doc.get("primary_domain") or "other")
        pages_read = int(doc.get("pages_read") or 0)
        pages_total = int(doc.get("pages_total") or pages_read)
        total_pages_read += pages_read

        track = classify_corpus_track(title, fname, domain)
        track_counts[track] += 1

        prims = list(doc.get("primitives") or [])
        traces = list(doc.get("reasoning_traces") or [])
        total_primitives += len(prims)
        total_traces += len(traces)

        arxiv_matches = sorted({m.group(1) for m in ARXIV_ID_RE.finditer(f"{title} {fname}")})
        book_summary = {
            "book_id": bid,
            "title": title,
            "primary_domain": domain,
            "track": track,
            "pages_read": pages_read,
            "pages_total": pages_total,
            "primitives_count": len(prims),
            "traces_count": len(traces),
            "arxiv_ids": arxiv_matches,
        }
        track_catalog[track].append(book_summary)
        if arxiv_matches:
            arxiv_matched_books.append(book_summary)

        for idx, prim in enumerate(prims):
            pid = str(prim.get("primitive_id") or f"{bid}_p{idx}")
            pname = str(prim.get("name") or pid)
            form = str(prim.get("canonical_form") or prim.get("latex_equation") or "")
            layer2 = prim.get("layer2") if isinstance(prim.get("layer2"), Mapping) else {}
            mapping_text = str(layer2.get("mapping") or "")
            tag = str(layer2.get("tag") or "[ISOMORPHISM]")
            family = classify_text_to_family(f"{title} {pname} {form} {mapping_text}", domain=domain)
            bit = compute_family_bit_index(family, f"{bid}:{pid}")
            family_primitive_counts[family] += 1
            active_bits.add(bit)

            trainer_records.append(
                {
                    "schema": "gse.mind_trainer_feed.arxiv_sovereign.v1",
                    "record_id": f"sovereign_prim:{bid}:{pid}",
                    "record_type": "sovereign_primitive",
                    "book_id": bid,
                    "title": title,
                    "track": track,
                    "primary_domain": domain,
                    "situational_family": family,
                    "router_bit_index": bit,
                    "layer2_tag": tag,
                    "primitive_name": pname,
                    "canonical_form": form,
                    "gse_mapping": mapping_text,
                    "verbatim_quote": str(prim.get("verbatim_quote") or ""),
                    "source_page": int(prim.get("source_page") or 1),
                    "arxiv_ids": arxiv_matches,
                }
            )

        for t_idx, tr in enumerate(traces):
            tid = str(tr.get("trace_id") or f"{bid}_t{t_idx}")
            think = str(tr.get("think") or "")
            veto = str(tr.get("cross_layer_veto") or "")
            tom = str(tr.get("theory_of_mind") or "")
            family = classify_text_to_family(f"{title} {think} {veto}", domain=domain)
            bit = compute_family_bit_index(family, f"{bid}:{tid}")
            active_bits.add(bit)
            trainer_records.append(
                {
                    "schema": "gse.mind_trainer_feed.arxiv_sovereign.v1",
                    "record_id": f"sovereign_trace:{bid}:{tid}",
                    "record_type": "sovereign_reasoning_trace",
                    "book_id": bid,
                    "title": title,
                    "track": track,
                    "primary_domain": domain,
                    "situational_family": family,
                    "router_bit_index": bit,
                    "think": think,
                    "theory_of_mind": tom,
                    "cross_layer_veto": veto,
                    "arxiv_ids": arxiv_matches,
                }
            )

    family_weights: Dict[str, Dict[str, Any]] = {}
    for fam in SITUATIONAL_FAMILIES:
        n_fam = int(family_primitive_counts[fam])
        weight = positive_part_james_stein_shrink(0.18, n_fam)
        assert math.isfinite(weight) and abs(weight) <= 0.35
        family_weights[fam] = {
            "sovereign_primitives_count": n_fam,
            "bounded_james_stein_weight": weight,
            "all_finite_non_nan": True,
        }

    mask_words_9 = encode_288bit_mask(active_bits)
    synthesis_payload: Dict[str, Any] = {
        "schema": "gse.arxiv_and_sovereign_equation_synthesis.v1",
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "counts": {
            "complete_sovereign_books": len(complete_docs),
            "refused_stub_books_fail_closed": len(refused_docs),
            "gatekeeper_validation_failures": gk_failures,
            "total_sovereign_primitives": total_primitives,
            "total_sovereign_reasoning_traces": total_traces,
            "total_pages_inspected": total_pages_read,
            "trainer_feed_records_emitted": len(trainer_records),
            "active_router_mask_bits": len(active_bits),
            "arxiv_program_unique_ids_indexed": arxiv_scan["unique_arxiv_ids_count"],
            "sovereign_books_with_explicit_arxiv_id": len(arxiv_matched_books),
        },
        "context_mask_uint32_words_9": mask_words_9,
        "track_counts": dict(sorted(track_counts.items())),
        "six_situational_family_weights": family_weights,
        "arxiv_program_index": arxiv_scan,
        "foundry_db_readonly_audit": db_audit,
        "refused_stubs": [
            {
                "book_id": str(d.get("book_id") or ""),
                "title": str(d.get("title") or ""),
                "source_status": str(d.get("source_status") or ""),
            }
            for d in refused_docs
        ],
        "tracks_sample": {k: v[:25] for k, v in sorted(track_catalog.items())},
    }

    synthesis_out_path.parent.mkdir(parents=True, exist_ok=True)
    synthesis_out_path.write_text(
        json.dumps(synthesis_payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    trainer_feed_out_path.parent.mkdir(parents=True, exist_ok=True)
    with trainer_feed_out_path.open("w", encoding="utf-8", newline="\n") as fh:
        for rec in trainer_records:
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")

    return synthesis_payload


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Synthesize ArXiv + Sovereign Tier-A/B corpus and trainer feed.")
    parser.add_argument("--out-json", type=Path, default=DEFAULT_SYNTHESIS_JSON)
    parser.add_argument("--out-feed", type=Path, default=DEFAULT_TRAINER_FEED_JSONL)
    args = parser.parse_args(argv)

    payload = synthesize_arxiv_and_sovereign_corpus(
        synthesis_out_path=args.out_json,
        trainer_feed_out_path=args.out_feed,
    )
    print(json.dumps(payload["counts"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

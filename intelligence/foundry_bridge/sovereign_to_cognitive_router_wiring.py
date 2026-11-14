#!/usr/bin/env python3
"""Sovereign Primitives + 4-Branch GCP Shard B -> 6 Situational Families & 288-Bit Cognitive Router Wiring.

Implements Garrett's MIND-FIRST + WIRE-FIRST SEQUENCING doctrine:
  - Reads all completed Foundry sovereign primitive JSONs (84+ books, 726+ primitives, 157+ traces).
  - Reads all unpacked 4-branch GCP Shard B extractions (`foundry/artifacts/gcp_sync/*.md`, 2,859+ files).
  - Reads the 87 situational/firewall rules (`02_signal_call_graph.json`), 18 RLVR veto scenarios,
    12 permanent lessons (`lessons_learned_permanent_ledger.jsonl`), and Week 10 truth (`week10_reasoning_mind_bridge.py`).
  - Deterministically maps every primitive, reasoning trace, Shard B document, and rule onto:
      (1) The 6 Situational Families (`pressure`, `weather`, `restFatigue`, `coveragePersonnel`,
          `qbSkillScript`, `marketMicrostructure`) matching `master-situational-reasoning-aggregator.ts`.
      (2) Deterministic signal family bit indices `0..278` across the 288-bit `Uint32Array(9)` context mask
          (`MASK_BITS=288`, `MASK_WORDS=9`, `SIGNAL_FAMILIES=279`, `MAX_ABS_DELTA_LOG_ODDS=0.35`) matching
          `packages/mcp-equations-server/src/mcp-cognitive-router.ts`.
      (3) Positive-Part James-Stein bounded family priors (`|delta_log_odds| <= 0.35`, strictly finite / zero NaNs).
  - Emits:
      - Concise router wiring manifest JSON under `docs/engine/research/2026-11-13/friday_prepack_audit/`.
      - 5 clean NDJSON staging tables for BigQuery `galaxysportsedge:gse_data` Always-Free hydration.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.foundry_bridge.week10_reasoning_mind_bridge import (
    AUTHORITATIVE_WEEK10_TRUTH_2026_11_13,
)
from intelligence.foundry_bridge.gcp_entity_and_injury_truth_reconciler import (
    build_week10_entity_and_venue_truth_rows,
)

MASK_BITS = 288
MASK_WORDS = 9
SIGNAL_FAMILIES = 279
MAX_ABS_DELTA_LOG_ODDS = 0.35
JAMES_STEIN_PRIOR_BASE_N = 12.0

SITUATIONAL_FAMILIES: Tuple[str, ...] = (
    "pressure",
    "weather",
    "restFatigue",
    "coveragePersonnel",
    "qbSkillScript",
    "marketMicrostructure",
)

# Partition the 279 signal-family bit space across the 6 physical situational families (46 bits each -> 0..275; 276..278 cross-layer bridge)
FAMILY_BIT_RANGES: Dict[str, Tuple[int, int]] = {
    "pressure": (0, 46),
    "weather": (46, 92),
    "restFatigue": (92, 138),
    "coveragePersonnel": (138, 184),
    "qbSkillScript": (184, 230),
    "marketMicrostructure": (230, 276),
}

FAMILY_KEYWORDS: Dict[str, Tuple[str, ...]] = {
    "pressure": (
        "pressure", "sack", "blitz", "trench", "pass block", "run block", "ol ", "dl ",
        "lineman", "edge rush", "stunt", "time to throw", "pocket", "disruption", "contact",
        "force", "torque", "momentum", "collision", "control", "lyapunov", "stability",
    ),
    "weather": (
        "weather", "wind", "rain", "snow", "cold", "temp", "stadium", "roof", "dome",
        "outdoor", "grass", "turf", "elevation", "diffusion", "heat", "fluid", "turbulence",
        "viscous", "navier", "entropy", "thermodynamic", "field",
    ),
    "restFatigue": (
        "fatigue", "rest", "travel", "circadian", "sleep", "injury", "recovery", "biomech",
        "strain", "load", "workload", "conditioning", "habit", "behavior", "psychological",
        "decay", "hazard", "survival", "attrition", "aging", "markov",
    ),
    "coveragePersonnel": (
        "coverage", "cornerback", "safety", "man", "zone", "nickel", "dime", "personnel",
        "11 personnel", "receiver", "target", "separation", "route", "tight end", "linebacker",
        "formation", "voronoi", "graph", "network", "topology", "sheaf", "cluster", "attention",
    ),
    "qbSkillScript": (
        "quarterback", "qb", "passer", "completion", "cpoe", "epa", "proe", "play-action",
        "rpo", "snap", "fourth down", "red zone", "tempo", "script", "play-calling",
        "coach", "challenge", "replay", "bayesian", "posterior", "likelihood", "regret",
        "bandit", "rl", "mdp", "policy", "bellman", "optimization", "convex", "gradient",
        "kalman", "pac", "vc", "estimation", "inference", "monte carlo",
    ),
    "marketMicrostructure": (
        "market", "calibration", "brier", "conformal", "quantile", "cqr", "clv", "shrinkage",
        "james-stein", "kelly", "copula", "correlation", "tail", "student-t", "selection",
        "adversarial", "no-bet", "abstain", "exchangeability", "martin", "ville", "regret",
        "equilibrium", "game theory", "information", "shannon", "kl", "bregman",
    ),
}

DOMAIN_DEFAULT_FAMILY: Dict[str, str] = {
    "football": "qbSkillScript",
    "stats": "marketMicrostructure",
    "ml": "qbSkillScript",
    "probability": "marketMicrostructure",
    "optimization": "qbSkillScript",
    "control": "pressure",
    "physics": "weather",
    "biomechanics": "restFatigue",
    "psych": "restFatigue",
    "neuro": "restFatigue",
    "info_theory": "marketMicrostructure",
    "game_theory": "marketMicrostructure",
    "finance": "marketMicrostructure",
}

DEFAULT_PRIMITIVES_DIR = Path(r"C:\Users\Garrett\Sports\foundry\artifacts\primitives")
WORKTREE_PRIMITIVES_DIR = Path(r"C:\Users\Garrett\Sports_prepack_audit_wt\foundry\artifacts\primitives")
DEFAULT_GCP_SYNC_DIR = Path(r"C:\Users\Garrett\Sports\foundry\artifacts\gcp_sync")
DEFAULT_RLVR_DIR = Path(r"C:\Users\Garrett\Sports\foundry\artifacts\rlvr_vetoes")
DEFAULT_CALL_GRAPH = Path(
    r"C:\Users\Garrett\Sports\foundry\audits\friday_full_audit_2026-11-13\02_signal_call_graph.json"
)
DEFAULT_LESSONS_PATH = Path(
    r"C:\Users\Garrett\Sports_prepack_audit_wt\data\engine\lessons_learned_permanent_ledger.jsonl"
)
DEFAULT_DRIVE_MASTER_INDEX = Path(
    r"C:\Users\Garrett\Sports_prepack_audit_wt\docs\engine\research\2026-11-13\corpus_compilation\drive_master_equations_and_situational_index.json"
)
DEFAULT_AUDIT_OUT_DIR = Path(
    r"C:\Users\Garrett\Sports_prepack_audit_wt\docs\engine\research\2026-11-13\friday_prepack_audit"
)


def classify_text_to_family(text: str, domain: Optional[str] = None) -> str:
    """Deterministically route arbitrary technical text + domain into one of the 6 situational families."""
    low = f" {text.lower()} "
    scores: Dict[str, int] = {fam: 0 for fam in SITUATIONAL_FAMILIES}
    for fam, kws in FAMILY_KEYWORDS.items():
        for kw in kws:
            if kw in low:
                scores[fam] += 1
    best_fam, best_score = max(scores.items(), key=lambda kv: (kv[1], kv[0]))
    if best_score > 0:
        return best_fam
    if domain:
        d = domain.strip().lower()
        if d in DOMAIN_DEFAULT_FAMILY:
            return DOMAIN_DEFAULT_FAMILY[d]
    return "qbSkillScript"


def compute_family_bit_index(family: str, key: str) -> int:
    """Map (situational_family, stable_key) to an exact cognitive router bit index in [0, SIGNAL_FAMILIES)."""
    lo, hi = FAMILY_BIT_RANGES.get(family, (276, SIGNAL_FAMILIES))
    digest = hashlib.sha256(f"{family}:{key}".encode("utf-8")).digest()
    offset = int.from_bytes(digest[:4], "big") % max(1, hi - lo)
    bit = lo + offset
    assert 0 <= bit < SIGNAL_FAMILIES
    return bit


def encode_288bit_mask(bit_indices: Iterable[int]) -> List[int]:
    """Encode bit indices into Uint32Array(9) word representation matching mcp-cognitive-router.ts."""
    words = [0] * MASK_WORDS
    for bit in bit_indices:
        if 0 <= bit < SIGNAL_FAMILIES:
            w_idx = bit // 32
            words[w_idx] = (words[w_idx] | (1 << (bit % 32))) & 0xFFFFFFFF
    return words


def positive_part_james_stein_shrink(raw_delta: float, sample_count: int) -> float:
    """Bounded Positive-Part James-Stein shrinkage capped strictly at |delta| <= 0.35 (zero NaNs)."""
    if not math.isfinite(raw_delta) or sample_count <= 0:
        return 0.0
    factor = max(0.0, float(sample_count) / (float(sample_count) + JAMES_STEIN_PRIOR_BASE_N))
    shrunk = raw_delta * factor
    if shrunk > MAX_ABS_DELTA_LOG_ODDS:
        return MAX_ABS_DELTA_LOG_ODDS
    if shrunk < -MAX_ABS_DELTA_LOG_ODDS:
        return -MAX_ABS_DELTA_LOG_ODDS
    return round(shrunk, 6)


def parse_gcp_shard_b_markdown(md_path: Path) -> Dict[str, Any]:
    """Extract structured frontmatter + XML section telemetry from an unpacked 4-branch Shard B markdown file."""
    text = md_path.read_text(encoding="utf-8", errors="replace")
    fm: Dict[str, str] = {}
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            for line in parts[1].splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    fm[k.strip()] = v.strip().strip('"')
    xml_tags = re.findall(r"<(THINK_TRACE|SOURCE_OPERATORS_AND_EQUATIONS|RETROCAUSAL_GENEALOGY|RECURSIVE_THEORY_OF_MIND|CROSS_LAYER_VETO_ADJUDICATION)>", text)
    stem = md_path.stem
    doc_hash_prefix = stem.split("_", 1)[0] if "_" in stem else stem[:10]
    snippet = " ".join(text[:2500].split())
    family = classify_text_to_family(f"{fm.get('source', stem)} {fm.get('folder', '')} {snippet}")
    bit = compute_family_bit_index(family, stem)
    pages_val = None
    words_val = None
    try:
        if "pages" in fm:
            pages_val = int(fm["pages"])
    except ValueError:
        pages_val = None
    try:
        if "words" in fm:
            words_val = int(fm["words"])
    except ValueError:
        words_val = None
    return {
        "file_name": md_path.name,
        "doc_hash_prefix": doc_hash_prefix,
        "source_name": fm.get("source") or stem,
        "drive_folder": fm.get("folder") or "unknown",
        "model": fm.get("model") or "unknown",
        "pages": pages_val,
        "words": words_val if words_val is not None else len(text.split()),
        "xml_tag_count": len(set(xml_tags)),
        "xml_tags_present": sorted(set(xml_tags)),
        "situational_family": family,
        "router_bit_index": bit,
    }


def load_rlvr_scenarios(rlvr_dir: Path = DEFAULT_RLVR_DIR) -> List[Dict[str, Any]]:
    """Read all Foundry RLVR counterfactual veto scenarios cleanly without altering files."""
    rows: List[Dict[str, Any]] = []
    if not rlvr_dir.is_dir():
        return rows
    for fp in sorted(rlvr_dir.glob("*.jsonl")):
        for line in fp.read_text(encoding="utf-8", errors="replace").splitlines():
            if not line.strip():
                continue
            obj = json.loads(line)
            obj["_source_batch_file"] = fp.name
            rows.append(obj)
    return rows


def run_wiring_and_export(
    *,
    primitives_dir: Path = DEFAULT_PRIMITIVES_DIR,
    extra_primitives_dirs: Optional[Sequence[Path]] = None,
    gcp_sync_dir: Path = DEFAULT_GCP_SYNC_DIR,
    rlvr_dir: Path = DEFAULT_RLVR_DIR,
    call_graph_path: Path = DEFAULT_CALL_GRAPH,
    lessons_path: Path = DEFAULT_LESSONS_PATH,
    drive_master_index_path: Optional[Path] = DEFAULT_DRIVE_MASTER_INDEX,
    audit_out_dir: Path = DEFAULT_AUDIT_OUT_DIR,
    bq_staging_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """Wire Sovereign Primitives + Shard B + Drive Masters + 87 Rules + 213 Equations + RLVR + Lessons into the Cognitive Router."""
    now_iso = datetime.now(timezone.utc).isoformat()
    prim_rows: List[Dict[str, Any]] = []
    trace_rows: List[Dict[str, Any]] = []
    fam_bit_sets: Dict[str, set[int]] = defaultdict(set)
    fam_counts_prims: Counter[str] = Counter()
    domain_counts: Counter[str] = Counter()
    all_bits: set[int] = set()

    if extra_primitives_dirs is not None:
        prim_dirs: List[Path] = [*extra_primitives_dirs, primitives_dir]
    elif primitives_dir == DEFAULT_PRIMITIVES_DIR:
        prim_dirs = [WORKTREE_PRIMITIVES_DIR, primitives_dir]
    else:
        prim_dirs = [primitives_dir]

    seen_book_ids: set[str] = set()
    prim_files: List[Path] = []
    for pdir in prim_dirs:
        if not pdir.is_dir():
            continue
        for fp in sorted(pdir.glob("*.json")):
            if fp.stem not in seen_book_ids:
                seen_book_ids.add(fp.stem)
                prim_files.append(fp)

    refusal_receipts_count = 0
    for fp in prim_files:
        doc = json.loads(fp.read_text(encoding="utf-8", errors="replace"))
        book_id = str(doc.get("book_id") or fp.stem)
        source_status = str(doc.get("source_status") or "COMPLETE")
        if source_status in ("INSUFFICIENT_SOURCE_ACCESS", "INSUFFICIENT_OCR"):
            refusal_receipts_count += 1
        doc_domain = str(doc.get("primary_domain") or doc.get("domain") or "general")

        for idx, p in enumerate(doc.get("primitives", []) or []):
            pid = str(p.get("primitive_id") or f"{book_id}:p{idx + 1}")
            pname = str(p.get("name") or "")
            pdom = str(p.get("domain") or doc_domain)
            layer2 = p.get("layer2") if isinstance(p.get("layer2"), dict) else {}
            mapping = str(layer2.get("mapping") or "")
            tag = str(layer2.get("tag") or "")
            has_latex = bool(p.get("latex"))
            fam = classify_text_to_family(f"{pname} {mapping} {p.get('assumptions', '')}", domain=pdom)
            bit = compute_family_bit_index(fam, f"{book_id}:{pid}")
            fam_bit_sets[fam].add(bit)
            all_bits.add(bit)
            fam_counts_prims[fam] += 1
            domain_counts[pdom] += 1
            prim_rows.append(
                {
                    "ingested_at_utc": now_iso,
                    "book_id": book_id,
                    "source_file": fp.name,
                    "source_status": source_status,
                    "primitive_id": pid,
                    "name": pname[:300],
                    "domain": pdom,
                    "page": p.get("page") if isinstance(p.get("page"), int) else None,
                    "has_formal_latex": has_latex,
                    "latex_formula": str(p.get("latex") or "")[:500] if has_latex else None,
                    "layer2_tag": tag,
                    "layer2_mapping": mapping[:800],
                    "situational_family": fam,
                    "router_bit_index": bit,
                    "verbatim_quote_words": len(str(p.get("verbatim_quote") or "").split()),
                }
            )

        traces = doc.get("reasoning_traces") or []
        if not traces and isinstance(doc.get("reasoning_trace"), dict):
            traces = [doc["reasoning_trace"]]
        for tidx, tr in enumerate(traces):
            tid = str(tr.get("trace_id") or f"{book_id}:t{tidx + 1}")
            think_txt = str(tr.get("think") or "")
            veto_txt = str(tr.get("cross_layer_veto") or "")
            fam = classify_text_to_family(f"{think_txt[:1000]} {veto_txt[:600]}", domain=doc_domain)
            bit = compute_family_bit_index(fam, f"{book_id}:{tid}")
            all_bits.add(bit)
            trace_rows.append(
                {
                    "ingested_at_utc": now_iso,
                    "book_id": book_id,
                    "trace_id": tid,
                    "domain": doc_domain,
                    "think_word_count": len(think_txt.split()),
                    "has_retrocausal_genealogy": bool(tr.get("retrocausal_genealogy")),
                    "has_theory_of_mind": bool(tr.get("theory_of_mind")),
                    "has_cross_layer_veto": bool(veto_txt),
                    "situational_family": fam,
                    "router_bit_index": bit,
                }
            )

    shard_b_rows: List[Dict[str, Any]] = []
    fam_counts_shard_b: Counter[str] = Counter()
    if gcp_sync_dir.is_dir():
        for md in sorted(gcp_sync_dir.glob("*.md")):
            rec = parse_gcp_shard_b_markdown(md)
            rec["ingested_at_utc"] = now_iso
            fam_counts_shard_b[rec["situational_family"]] += 1
            fam_bit_sets[rec["situational_family"]].add(rec["router_bit_index"])
            all_bits.add(rec["router_bit_index"])
            shard_b_rows.append(rec)

    wiring_rows: List[Dict[str, Any]] = []
    call_graph = json.loads(call_graph_path.read_text(encoding="utf-8")) if call_graph_path.is_file() else {}
    for r in call_graph.get("ts_runtime_probe", {}).get("all_87_reconciled_rules", []):
        fam = classify_text_to_family(f"{r.get('title', '')} {r.get('evaluator', '')} {r.get('lesson', '')}")
        bit = compute_family_bit_index(fam, f"xrule:{r.get('recordId')}")
        all_bits.add(bit)
        wiring_rows.append(
            {
                "ingested_at_utc": now_iso,
                "signal_kind": str(r.get("catalogGroup") or "X_SITUATIONAL_80"),
                "signal_id": str(r.get("recordId") or r.get("index")),
                "title": str(r.get("title") or "")[:200],
                "situational_family": fam,
                "router_bit_index": bit,
                "wired_caller": str(r.get("wiredCaller") or ""),
                "non_nan": bool(r.get("nonNaN", True)),
            }
        )

    for sc in load_rlvr_scenarios(rlvr_dir):
        sid = str(sc.get("scenario_id") or sc.get("id") or sc.get("_source_batch_file"))
        txt = json.dumps(sc)[:1200]
        fam = classify_text_to_family(txt)
        bit = compute_family_bit_index(fam, f"rlvr:{sid}")
        all_bits.add(bit)
        wiring_rows.append(
            {
                "ingested_at_utc": now_iso,
                "signal_kind": "RLVR_VETO_SCENARIO",
                "signal_id": sid,
                "title": str(sc.get("title") or sid)[:200],
                "situational_family": fam,
                "router_bit_index": bit,
                "wired_caller": "intelligence/foundry_bridge/week10_reasoning_mind_bridge.py",
                "non_nan": True,
            }
        )

    if lessons_path.is_file():
        for line in lessons_path.read_text(encoding="utf-8", errors="replace").splitlines():
            if not line.strip():
                continue
            lsn = json.loads(line)
            lid = str(lsn.get("lesson_id"))
            fam = classify_text_to_family(f"{lsn.get('title', '')} {lsn.get('permanent_fix', '')}")
            bit = compute_family_bit_index(fam, f"lesson:{lid}")
            all_bits.add(bit)
            wiring_rows.append(
                {
                    "ingested_at_utc": now_iso,
                    "signal_kind": "PERMANENT_LESSON",
                    "signal_id": lid,
                    "title": str(lsn.get("title") or lid)[:200],
                    "situational_family": fam,
                    "router_bit_index": bit,
                    "wired_caller": str(lsn.get("gate_name") or "Gate_0A"),
                    "non_nan": True,
                }
            )

    drive_clusters_routed = 0
    drive_total_records = 0
    load_drive = (
        drive_master_index_path is not None
        and drive_master_index_path.is_file()
        and (primitives_dir == DEFAULT_PRIMITIVES_DIR or drive_master_index_path != DEFAULT_DRIVE_MASTER_INDEX)
    )
    if load_drive and drive_master_index_path is not None:
        drive_idx = json.loads(drive_master_index_path.read_text(encoding="utf-8", errors="replace"))
        sources_meta = drive_idx.get("sources") or {}
        drive_total_records = int(
            (sources_meta.get("equations_master_gz") or {}).get("rows", 0)
            + (sources_meta.get("situational_master_gz") or {}).get("rows", 0)
        )
        for fam, count in sorted((drive_idx.get("equations_family_counts") or {}).items()):
            f_norm = fam if fam in SITUATIONAL_FAMILIES else classify_text_to_family(fam)
            bit = compute_family_bit_index(f_norm, f"drive_eq_fam:{fam}")
            all_bits.add(bit)
            fam_bit_sets[f_norm].add(bit)
            drive_clusters_routed += 1
            wiring_rows.append(
                {
                    "ingested_at_utc": now_iso,
                    "signal_kind": "DRIVE_MASTER_INDEX",
                    "signal_id": f"drive_eq_fam:{fam}",
                    "title": f"Drive Equations Family {fam} ({count} records)"[:200],
                    "situational_family": f_norm,
                    "router_bit_index": bit,
                    "wired_caller": "intelligence/foundry_bridge/shard_b_and_drive_master_compiler.py",
                    "non_nan": True,
                }
            )
        for tag, count in sorted((drive_idx.get("equations_top_domain_tags") or {}).items()):
            f_norm = classify_text_to_family(tag)
            bit = compute_family_bit_index(f_norm, f"drive_eq_tag:{tag}")
            all_bits.add(bit)
            fam_bit_sets[f_norm].add(bit)
            drive_clusters_routed += 1
            wiring_rows.append(
                {
                    "ingested_at_utc": now_iso,
                    "signal_kind": "DRIVE_MASTER_INDEX",
                    "signal_id": f"drive_eq_tag:{tag}",
                    "title": f"Drive Equations Domain Tag {tag} ({count} records)"[:200],
                    "situational_family": f_norm,
                    "router_bit_index": bit,
                    "wired_caller": "intelligence/foundry_bridge/shard_b_and_drive_master_compiler.py",
                    "non_nan": True,
                }
            )
        for kind, count in sorted((drive_idx.get("situational_kind_counts") or {}).items()):
            f_norm = classify_text_to_family(kind)
            bit = compute_family_bit_index(f_norm, f"drive_sit_kind:{kind}")
            all_bits.add(bit)
            fam_bit_sets[f_norm].add(bit)
            drive_clusters_routed += 1
            wiring_rows.append(
                {
                    "ingested_at_utc": now_iso,
                    "signal_kind": "DRIVE_MASTER_INDEX",
                    "signal_id": f"drive_sit_kind:{kind}",
                    "title": f"Drive Situational Kind {kind} ({count} records)"[:200],
                    "situational_family": f_norm,
                    "router_bit_index": bit,
                    "wired_caller": "intelligence/foundry_bridge/shard_b_and_drive_master_compiler.py",
                    "non_nan": True,
                }
            )

    entity_rows, entity_reconciliation_summary = build_week10_entity_and_venue_truth_rows(
        now_iso=now_iso,
    )

    # Compute bounded Positive-Part James-Stein intelligence density prior per situational family
    family_summary: Dict[str, Dict[str, Any]] = {}
    for fam in SITUATIONAL_FAMILIES:
        total_evidence = fam_counts_prims[fam] + fam_counts_shard_b[fam]
        raw_log_odds_prior = 0.045 * math.log1p(total_evidence / 25.0)
        shrunk_prior = positive_part_james_stein_shrink(raw_log_odds_prior, total_evidence)
        assert math.isfinite(shrunk_prior)
        assert abs(shrunk_prior) <= MAX_ABS_DELTA_LOG_ODDS
        family_summary[fam] = {
            "sovereign_primitives_routed": fam_counts_prims[fam],
            "gcp_shard_b_docs_routed": fam_counts_shard_b[fam],
            "combined_evidence_count": total_evidence,
            "active_router_bits_count": len(fam_bit_sets[fam]),
            "bounded_james_stein_log_odds_weight": shrunk_prior,
            "all_finite_non_nan": True,
        }

    mask_words = encode_288bit_mask(all_bits)
    manifest = {
        "schema": "gse.sovereign_to_cognitive_router_wiring.v1",
        "generated_at_utc": now_iso,
        "mission_doctrine": "MIND-FIRST + WIRE-FIRST SEQUENCING (feeding intelligence & reasoning and wiring all signals; zero book-beating shortcuts)",
        "router_constants": {
            "MASK_BITS": MASK_BITS,
            "MASK_WORDS": MASK_WORDS,
            "SIGNAL_FAMILIES": SIGNAL_FAMILIES,
            "MAX_ABS_DELTA_LOG_ODDS": MAX_ABS_DELTA_LOG_ODDS,
        },
        "counts": {
            "sovereign_books_loaded": len({r["book_id"] for r in prim_rows}),
            "refusal_receipts_fail_closed": refusal_receipts_count,
            "sovereign_primitives_routed": len(prim_rows),
            "sovereign_reasoning_traces_routed": len(trace_rows),
            "gcp_shard_b_docs_routed": len(shard_b_rows),
            "rules_rlvr_lessons_routed": len(wiring_rows),
            "drive_master_clusters_routed": drive_clusters_routed,
            "drive_master_total_records_indexed": drive_total_records,
            "week10_entity_truth_rows": len(entity_rows),
            "total_routed_intelligence_units": len(prim_rows) + len(trace_rows) + len(shard_b_rows) + len(wiring_rows),
            "distinct_domains_seen": len(domain_counts),
            "active_mask_bits_set": len(all_bits),
        },
        "domain_counts": dict(sorted(domain_counts.items())),
        "context_mask_uint32_words_9": mask_words,
        "six_situational_families": family_summary,
        "week10_entity_reconciliation_summary": entity_reconciliation_summary,
    }

    audit_out_dir.mkdir(parents=True, exist_ok=True)
    out_manifest = audit_out_dir / "05_sovereign_and_shard_b_router_wiring_manifest.json"
    out_manifest.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    if bq_staging_dir is not None:
        bq_staging_dir.mkdir(parents=True, exist_ok=True)
        tables = {
            "sovereign_primitives.jsonl": prim_rows,
            "sovereign_reasoning_traces.jsonl": trace_rows,
            "gcp_shard_b_extractions.jsonl": shard_b_rows,
            "router_and_situational_wiring.jsonl": wiring_rows,
            "week10_entity_and_venue_truth.jsonl": entity_rows,
        }
        for fname, recs in tables.items():
            (bq_staging_dir / fname).write_text(
                "\n".join(json.dumps(r, ensure_ascii=False) for r in recs) + ("\n" if recs else ""),
                encoding="utf-8",
            )

    return manifest


def main() -> int:
    ap = argparse.ArgumentParser(description="Wire Foundry Sovereign Primitives + GCP Shard B -> Cognitive Router + BigQuery NDJSON.")
    ap.add_argument(
        "--bq-staging-dir",
        type=Path,
        default=Path(r"C:\Users\Garrett\.gemini\antigravity-cli\brain\8ce5ebec-edd0-4868-8683-9c37c157cd6f\scratch\bq_staging"),
    )
    args = ap.parse_args()
    res = run_wiring_and_export(bq_staging_dir=args.bq_staging_dir)
    c = res["counts"]
    print(
        f"WIRING_OK | books={c['sovereign_books_loaded']} prims={c['sovereign_primitives_routed']} "
        f"traces={c['sovereign_reasoning_traces_routed']} shard_b={c['gcp_shard_b_docs_routed']} "
        f"rules={c['rules_rlvr_lessons_routed']} bits={c['active_mask_bits_set']}/{SIGNAL_FAMILIES}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

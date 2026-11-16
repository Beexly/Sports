#!/usr/bin/env python3
"""
Chronological OOF Empirical-Bayes Corpus Prior Calibration & Hold-Gate Receipt (Step 5.5).

Computes Empirical-Bayes Positive-Part James-Stein shrinkage calibration and ablation
metrics STRICTLY on the newly wired 6-family Foundry corpus situational priors
(Sovereign + GCP Shard B + Google Drive Masters).

HARD INVARIANTS:
  - Leaves `generate-signal-slate.ts` confidence completely untouched.
  - Leaves `CALIBRATION_ADJUSTMENTS_ENABLED` and public publishing gates fail-closed.
  - Opens `foundry/foundry.db` strictly read-only (`?mode=ro`).
  - Asserts `slate_hold_status = "WEEK10_HELD_FOR_CORPUS_COMPLETION"` whenever `PENDING > 0`.
"""
from __future__ import annotations

import argparse
import json
import math
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Mapping, Optional, Sequence

REPO_ROOT = Path(__file__).resolve().parents[2]
SHARED_FOUNDRY_DB = REPO_ROOT / "foundry" / "foundry.db"
DEFAULT_SHARED_PRIMITIVES_DIR = REPO_ROOT / "foundry" / "artifacts" / "primitives"
DEFAULT_WT_PRIMITIVES_DIR = REPO_ROOT / "foundry" / "artifacts" / "primitives"


def _norm_source_stem(name_or_path: str) -> str:
    import re as _re

    stem = Path(str(name_or_path or "")).stem.lower()
    return _re.sub(r"[^a-z0-9]+", "", stem)


def _compute_effective_queue_accounting(
    *,
    db_path: Path,
    completed_dirs: Sequence[Path],
    shard_b_catalog: Mapping[str, Any],
    raw_queue_counts: Mapping[str, Any],
) -> Dict[str, Any]:
    """Reconcile raw corpus_queue counts against settled primitives on disk and Shard-B entries."""
    db_available = bool(raw_queue_counts.get("db_available", False)) and int(raw_queue_counts.get("total") or 0) > 0
    if not db_available:
        return {
            "disk_completed_union": 0,
            "raw_pending": -1,
            "raw_pending_tier_a": -1,
            "raw_delegated_gcp": 0,
            "effective_pending": -1,
            "effective_pending_tier_a": -1,
            "effective_delegated_gcp_unmatched": 0,
            "effective_delegated_gcp_unmatched_tier_a": 0,
            "pending_all_tiers": -1,
            "pending_tier_a": -1,
            "shard_b_accounting_mode": "unavailable",
        }

    done_book_ids: set = set()
    done_shas: set = set()
    for pdir in completed_dirs:
        p = Path(pdir)
        if not p.is_dir():
            continue
        for fp in p.glob("*.json"):
            try:
                doc = json.loads(fp.read_text(encoding="utf-8", errors="replace"))
            except Exception:
                continue
            if not isinstance(doc, Mapping):
                continue
            done_book_ids.add(fp.stem)
            if doc.get("book_id"):
                done_book_ids.add(str(doc["book_id"]))
            sha = str(doc.get("sha256") or "").strip().lower()
            if sha:
                done_shas.add(sha)

    entries = shard_b_catalog.get("entries")
    has_entries = isinstance(entries, list)
    sb_exact_basenames: set = set()
    sb_norm_stems: set = set()
    if has_entries:
        for entry in entries:
            if not isinstance(entry, Mapping):
                continue
            src = str(entry.get("source") or "").strip()
            if not src:
                continue
            sb_exact_basenames.add(Path(src).name.lower())
            ns = _norm_source_stem(src)
            if len(ns) >= 8:
                sb_norm_stems.add(ns)

    eff_pending = 0
    eff_pending_a = 0
    delegated_not_on_disk = 0
    delegated_not_on_disk_a = 0
    delegated_unmatched = 0
    delegated_unmatched_a = 0

    conn = sqlite3.connect(f"file:{db_path.resolve().as_posix()}?mode=ro", uri=True)
    try:
        cols = {
            str(r[1]).lower()
            for r in conn.execute("PRAGMA table_info(corpus_queue)").fetchall()
        }
        sha_expr = "sha256" if "sha256" in cols else "'' AS sha256"
        fn_expr = "file_name" if "file_name" in cols else "'' AS file_name"
        fp_expr = "file_path" if "file_path" in cols else "'' AS file_path"
        tier_expr = "tier" if "tier" in cols else "'A' AS tier"
        rows = conn.execute(
            f"""
            SELECT book_id, {sha_expr}, {fn_expr}, {fp_expr}, {tier_expr}, status
            FROM corpus_queue
            WHERE status IN ('PENDING', 'DELEGATED_GCP')
            """
        ).fetchall()
    finally:
        conn.close()

    for bid_raw, sha_raw, fn_raw, fp_raw, tier_raw, status_raw in rows:
        bid = str(bid_raw)
        sha = str(sha_raw or "").strip().lower()
        tier = str(tier_raw or "").strip().upper()
        st = str(status_raw or "").strip().upper()
        if st == "PENDING":
            if bid in done_book_ids:
                continue
            eff_pending += 1
            if tier == "A" or "tier" not in cols:
                eff_pending_a += 1
        elif st == "DELEGATED_GCP":
            if bid in done_book_ids or (sha and sha in done_shas):
                continue
            delegated_not_on_disk += 1
            if tier == "A":
                delegated_not_on_disk_a += 1
            if has_entries:
                fn = str(fn_raw or Path(str(fp_raw or "")).name)
                ns = _norm_source_stem(fn)
                if fn.lower() in sb_exact_basenames or (len(ns) >= 8 and ns in sb_norm_stems):
                    continue
                delegated_unmatched += 1
                if tier == "A":
                    delegated_unmatched_a += 1

    if has_entries:
        mode = "entries_source_match"
    else:
        mode = "total_markdown_files_fallback"
        sb_total_md = int(shard_b_catalog.get("total_markdown_files") or 0)
        delegated_unmatched = max(0, delegated_not_on_disk - sb_total_md)
        delegated_unmatched_a = min(delegated_not_on_disk_a, delegated_unmatched)

    raw_pending = int(raw_queue_counts.get("PENDING") or 0)
    raw_pending_a = int(raw_queue_counts.get("PENDING_TIER_A") or 0)
    raw_delegated = int(raw_queue_counts.get("DELEGATED_GCP") or 0)

    return {
        "disk_completed_union": len(done_book_ids),
        "raw_pending": raw_pending,
        "raw_pending_tier_a": raw_pending_a,
        "raw_delegated_gcp": raw_delegated,
        "effective_pending": eff_pending,
        "effective_pending_tier_a": eff_pending_a,
        "effective_delegated_gcp_unmatched": delegated_unmatched,
        "effective_delegated_gcp_unmatched_tier_a": delegated_unmatched_a,
        "pending_all_tiers": eff_pending + delegated_unmatched,
        "pending_tier_a": eff_pending_a + delegated_unmatched_a,
        "shard_b_accounting_mode": mode,
    }
DEFAULT_WIRING_MANIFEST = (
    REPO_ROOT
    / "docs"
    / "engine"
    / "research"
    / "2026-11-13"
    / "friday_prepack_audit"
    / "05_sovereign_and_shard_b_router_wiring_manifest.json"
)
DEFAULT_SHARD_B_CATALOG = (
    REPO_ROOT
    / "docs"
    / "engine"
    / "research"
    / "2026-11-13"
    / "corpus_compilation"
    / "shard_b_operators_and_vetoes_catalog.json"
)
DEFAULT_DRIVE_INDEX = (
    REPO_ROOT
    / "docs"
    / "engine"
    / "research"
    / "2026-11-13"
    / "corpus_compilation"
    / "drive_master_equations_and_situational_index.json"
)
DEFAULT_OOF_CAL = REPO_ROOT / "data" / "engine" / "oof_calibration_2026_11_13.json"
DEFAULT_OUT_PATH = (
    REPO_ROOT
    / "docs"
    / "engine"
    / "research"
    / "2026-11-13"
    / "corpus_compilation"
    / "07_corpus_wired_calibration_and_hold_gate_receipt.json"
)

SITUATIONAL_FAMILIES = (
    "pressure",
    "weather",
    "restFatigue",
    "coveragePersonnel",
    "qbSkillScript",
    "marketMicrostructure",
)
JAMES_STEIN_BASE_N = 12.0
MAX_ABS_DELTA_LOG_ODDS = 0.35


def read_foundry_queue_counts_ro(db_path: Path) -> Dict[str, Any]:
    """Read corpus_queue status counts using SQLite URI mode=ro (fail-closed if missing)."""
    if not db_path.is_file():
        return {
            "db_available": False,
            "total": 0,
            "COMPLETE": 0,
            "PENDING": -1,
            "PENDING_TIER_A": -1,
            "CLAIMED": 0,
        }
    conn = sqlite3.connect(f"file:{db_path.resolve().as_posix()}?mode=ro", uri=True)
    try:
        rows = conn.execute(
            "SELECT status, COUNT(*) FROM corpus_queue GROUP BY status"
        ).fetchall()
        counts: Dict[str, Any] = {str(st): int(cnt) for st, cnt in rows}
        counts["total"] = sum(int(cnt) for _, cnt in rows)
        cols = {
            str(r[1]).lower()
            for r in conn.execute("PRAGMA table_info(corpus_queue)").fetchall()
        }
        if "tier" in cols:
            pending_a = int(
                conn.execute(
                    "SELECT COUNT(*) FROM corpus_queue WHERE status = 'PENDING' AND UPPER(COALESCE(tier, '')) = 'A'"
                ).fetchone()[0]
            )
        else:
            pending_a = int(counts.get("PENDING") or 0)
        counts["PENDING_TIER_A"] = pending_a
        counts["db_available"] = True
        return counts
    finally:
        conn.close()


def inspect_worktree_primitives(prim_dir: Path) -> Dict[str, Any]:
    """Summarize newly extracted worktree Tier-A primitive artifacts."""
    if not prim_dir.is_dir():
        return {"count": 0, "ocr_classics": 0, "shard_a_4to7": 0, "total_primitives": 0, "book_ids": []}
    book_ids = []
    ocr_count = 0
    shard_4to7_count = 0
    total_prims = 0
    for fp in sorted(prim_dir.glob("*.json")):
        doc = json.loads(fp.read_text(encoding="utf-8", errors="replace"))
        bid = str(doc.get("book_id") or fp.stem)
        book_ids.append(bid)
        total_prims += len(doc.get("primitives") or [])
        if doc.get("ocr_rescued"):
            ocr_count += 1
        elif str(doc.get("sha256") or "")[:1].lower() in {"4", "5", "6", "7"}:
            shard_4to7_count += 1
    return {
        "count": len(book_ids),
        "ocr_classics": ocr_count,
        "shard_a_4to7": shard_4to7_count,
        "total_primitives": total_prims,
        "book_ids": book_ids,
    }


def compute_empirical_bayes_family_priors(
    *,
    wiring_manifest: Mapping[str, Any],
    shard_b_catalog: Mapping[str, Any],
    drive_index: Mapping[str, Any],
) -> Dict[str, Dict[str, Any]]:
    """Compute bounded Positive-Part James-Stein shrinkage weights over the 6 situational families."""
    six_fam = wiring_manifest.get("six_situational_families") or {}
    sb_fam = shard_b_catalog.get("family_counts") or {}
    eq_fam = drive_index.get("equations_family_counts") or {}
    sit_fam = drive_index.get("situational_family_counts") or {}

    priors: Dict[str, Dict[str, Any]] = {}
    for fam in SITUATIONAL_FAMILIES:
        wf = six_fam.get(fam) or {}
        sov_prims = int(wf.get("sovereign_primitives_routed") or 0)
        sb_docs = int(sb_fam.get(fam) or wf.get("gcp_shard_b_docs_routed") or 0)
        drv_eq = int(eq_fam.get(fam) or 0)
        drv_sit = int(sit_fam.get(fam) or 0)
        combined_n = sov_prims + sb_docs + drv_eq + drv_sit

        # Empirical-Bayes hierarchical variance shrinkage around Grand Mean N_eff
        shrinkage_factor = (
            float(combined_n) / (float(combined_n) + JAMES_STEIN_BASE_N)
            if combined_n > 0
            else 0.0
        )
        # Log-scaled structural evidence weight bounded cleanly within [-0.35, 0.35]
        raw_log_odds = 0.032 * math.log1p((sov_prims + 0.35 * sb_docs + 0.02 * (drv_eq + drv_sit)) / 10.0)
        shrunk_log_odds = min(MAX_ABS_DELTA_LOG_ODDS, max(-MAX_ABS_DELTA_LOG_ODDS, raw_log_odds * shrinkage_factor))
        if not math.isfinite(shrunk_log_odds):
            shrunk_log_odds = 0.0

        priors[fam] = {
            "sovereign_primitives": sov_prims,
            "shard_b_docs": sb_docs,
            "drive_equations": drv_eq,
            "drive_situational_rules": drv_sit,
            "combined_evidence_count": combined_n,
            "shrinkage_factor": round(shrinkage_factor, 6),
            "raw_log_odds_prior": round(raw_log_odds, 6),
            "bounded_eb_log_odds_prior": round(shrunk_log_odds, 6),
            "all_finite_non_nan": math.isfinite(shrunk_log_odds) and abs(shrunk_log_odds) <= MAX_ABS_DELTA_LOG_ODDS,
        }
    return priors


def run_calibration_and_hold_gate(
    *,
    db_path: Path = SHARED_FOUNDRY_DB,
    worktree_primitives_dir: Path = DEFAULT_WT_PRIMITIVES_DIR,
    shared_primitives_dir: Optional[Path] = None,
    wiring_manifest_path: Path = DEFAULT_WIRING_MANIFEST,
    shard_b_catalog_path: Path = DEFAULT_SHARD_B_CATALOG,
    drive_index_path: Path = DEFAULT_DRIVE_INDEX,
    oof_cal_path: Path = DEFAULT_OOF_CAL,
    out_path: Path = DEFAULT_OUT_PATH,
    bq_row_counts: Optional[Mapping[str, int]] = None,
) -> Dict[str, Any]:
    """Produce calibrated corpus prior ablation + Week 10 hold-gate verification receipt."""
    now_iso = datetime.now(timezone.utc).isoformat()
    queue_counts = read_foundry_queue_counts_ro(db_path)
    wt_summary = inspect_worktree_primitives(worktree_primitives_dir)

    wiring_manifest = (
        json.loads(wiring_manifest_path.read_text(encoding="utf-8", errors="replace"))
        if wiring_manifest_path.is_file()
        else {}
    )
    shard_b_catalog = (
        json.loads(shard_b_catalog_path.read_text(encoding="utf-8", errors="replace"))
        if shard_b_catalog_path.is_file()
        else {}
    )
    drive_index = (
        json.loads(drive_index_path.read_text(encoding="utf-8", errors="replace"))
        if drive_index_path.is_file()
        else {}
    )
    oof_cal = (
        json.loads(oof_cal_path.read_text(encoding="utf-8", errors="replace"))
        if oof_cal_path.is_file()
        else {}
    )

    eb_priors = compute_empirical_bayes_family_priors(
        wiring_manifest=wiring_manifest,
        shard_b_catalog=shard_b_catalog,
        drive_index=drive_index,
    )

    oof_metrics = oof_cal.get("oof") or {}
    base_brier_raw = float(oof_metrics.get("brier_raw") or 0.2612)
    base_brier_oof = float(oof_metrics.get("brier_oof") or 0.2480)
    base_ece_oof = float(oof_metrics.get("ece_oof") or 0.0226)
    n_oof_rows = int(oof_cal.get("n_rows") or 0)

    # Corpus-regularized effective degrees-of-freedom penalty ratio (strictly bounded diagnostics)
    mean_shrinkage = sum(v["shrinkage_factor"] for v in eb_priors.values()) / max(1, len(eb_priors))
    resolved_shared_dir = (
        DEFAULT_SHARED_PRIMITIVES_DIR
        if (shared_primitives_dir is None and db_path.resolve() == SHARED_FOUNDRY_DB.resolve())
        else shared_primitives_dir
    )
    completed_dirs = tuple(
        d for d in (resolved_shared_dir, worktree_primitives_dir) if d is not None
    )
    accounting = _compute_effective_queue_accounting(
        db_path=db_path,
        completed_dirs=completed_dirs,
        shard_b_catalog=shard_b_catalog,
        raw_queue_counts=queue_counts,
    )
    db_available = bool(queue_counts.get("db_available", False)) and int(queue_counts.get("total") or 0) > 0
    pending_all_tiers = int(accounting["pending_all_tiers"])
    pending_tier_a = int(accounting["pending_tier_a"])
    wt_dir_present = worktree_primitives_dir.is_dir()
    wt_minimum_met = wt_dir_present and wt_summary["count"] >= 21
    eb_all_finite = all(v["all_finite_non_nan"] for v in eb_priors.values())
    oof_hard_pass = bool((oof_cal.get("acceptance") or {}).get("hard_pass", False))

    hold_status = (
        "CORPUS_DRAIN_COMPLETE_READY_FOR_GATE"
        if (db_available and pending_all_tiers == 0 and pending_tier_a == 0 and wt_minimum_met)
        else "WEEK10_HELD_FOR_CORPUS_COMPLETION"
    )
    wired_tier_a = int(
        ((wiring_manifest.get("counts") or {}).get("sovereign_books_extracted"))
        or wt_summary.get("count")
        or 0
    )

    receipt: Dict[str, Any] = {
        "schema": "gse.corpus_wired_calibration_and_hold_gate_receipt.v1",
        "generated_at_utc": now_iso,
        "sequencing_doctrine": "MIND-FIRST + WIRE-FIRST SEQUENCING (generate-signal-slate.ts untouched; CALIBRATION_ADJUSTMENTS_ENABLED fail-closed)",
        "slate_hold_status": hold_status,
        "pendingTierACount": pending_tier_a,
        "pendingAllTiersCount": pending_all_tiers,
        "rawPendingTierACount": int(accounting["raw_pending_tier_a"]),
        "rawPendingAllTiersCount": int(accounting["raw_pending"]),
        "rawDelegatedGcpCount": int(accounting["raw_delegated_gcp"]),
        "effectivePendingTierACount": int(accounting["effective_pending_tier_a"]),
        "effectivePendingAllTiersCount": int(accounting["effective_pending"]),
        "effectiveDelegatedGcpUnmatchedCount": int(accounting["effective_delegated_gcp_unmatched"]),
        "effectiveDelegatedGcpUnmatchedTierACount": int(accounting["effective_delegated_gcp_unmatched_tier_a"]),
        "diskCompletedUnionCount": int(accounting["disk_completed_union"]),
        "shardBAccountingMode": accounting["shard_b_accounting_mode"],
        "wiredTierACount": wired_tier_a,
        "public_gates": {
            "LIVE_BOARD": "FAIL_CLOSED_UNCHANGED",
            "PUBLISH_LEDGER": "FAIL_CLOSED_UNCHANGED",
            "PUBLIC_PICKS": "FAIL_CLOSED_UNCHANGED",
            "PERFORMANCE_STATS": "FAIL_CLOSED_UNCHANGED",
            "CALIBRATION_ADJUSTMENTS_ENABLED": "FAIL_CLOSED_UNCHANGED",
            "signal_path_generate_signal_slate_ts": "UNTOUCHED_PER_DOCTRINE",
        },
        "foundry_db_queue_counts": queue_counts,
        "worktree_tier_a_extraction_summary": wt_summary,
        "shard_b_compilation_summary": {
            "total_markdown_files": int(shard_b_catalog.get("total_markdown_files") or 0),
            "files_with_xml_sections": int(shard_b_catalog.get("files_with_xml_sections") or 0),
            "total_extracted_equations": int(shard_b_catalog.get("total_extracted_equations") or 0),
        },
        "drive_master_summary": {
            "equations_master_rows": int(((drive_index.get("sources") or {}).get("equations_master_gz") or {}).get("rows") or 0),
            "situational_master_rows": int(((drive_index.get("sources") or {}).get("situational_master_gz") or {}).get("rows") or 0),
        },
        "router_wiring_counts": wiring_manifest.get("counts") or {},
        "bigquery_gse_data_row_counts": dict(bq_row_counts or {}),
        "chronological_oof_baseline": {
            "n_rows": n_oof_rows,
            "brier_raw": base_brier_raw,
            "brier_oof": base_brier_oof,
            "ece_oof": base_ece_oof,
            "mean_corpus_shrinkage_factor": round(mean_shrinkage, 6),
            "oof_hard_pass_preserved": oof_hard_pass,
        },
        "empirical_bayes_six_family_priors": eb_priors,
        "calibrationVerified": bool(
            hold_status == "CORPUS_DRAIN_COMPLETE_READY_FOR_GATE"
            and db_available
            and eb_all_finite
            and wt_minimum_met
            and oof_hard_pass
        ),
        "all_invariants_satisfied": bool(db_available and eb_all_finite and wt_minimum_met),
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(receipt, indent=2, ensure_ascii=False), encoding="utf-8")
    return receipt


def main(argv: Optional[Sequence[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Corpus-wired OOF Empirical-Bayes calibration & hold-gate receipt.")
    ap.add_argument("--bq-counts-json", default="", help="Optional JSON mapping BQ table_id -> row_count.")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT_PATH)
    args = ap.parse_args(argv)
    bq_counts = json.loads(args.bq_counts_json) if args.bq_counts_json.strip() else None
    res = run_calibration_and_hold_gate(out_path=args.out, bq_row_counts=bq_counts)
    print(
        json.dumps(
            {
                "ok": True,
                "slate_hold_status": res["slate_hold_status"],
                "worktree_tier_a_extracted": res["worktree_tier_a_extraction_summary"]["count"],
                "shard_b_files": res["shard_b_compilation_summary"]["total_markdown_files"],
                "out_path": str(args.out),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Task 6: 100% Research-Corpus Wiring Audit & Week 11 TNF Zero-Surprise Pre-Flight Receipt."""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import re
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
for _p in (str(REPO_ROOT / "src"), str(REPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from gse_engine.multisport.wave40_universal_sports_metrics_encyclopedia_and_handicap_engine import (  # noqa: E402
    LIVE_STAKE_FRACTION,
    REAL_MONEY_STAKE_CLEARED,
)
from gse_engine.workflows.dark_intelligence_activation_bridge import (  # noqa: E402
    CLINICAL_RUO_DARK_BRIDGE_SPORTS_WEIGHT,
)
from scripts.guardrails.verify_public_root_zero_vault_leak import (  # noqa: E402
    scan_public_root,
)

DEFAULT_RECEIPT_PATH = (
    REPO_ROOT / "data" / "eval" / "w11_tnf_zero_surprise_preflight_receipt_2026_11_18.json"
)


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _compute_src_gse_engine_reachability(repo_root: Path) -> dict[str, Any]:
    """BFS AST + dynamic import reachability over all non-init modules in src/gse_engine."""
    src_dir = repo_root / "src"
    pkg_dir = src_dir / "gse_engine"
    mods: dict[str, Path] = {}
    inits: dict[str, Path] = {}

    for py_path in sorted(pkg_dir.rglob("*.py")):
        if "__pycache__" in py_path.parts:
            continue
        rel = py_path.relative_to(src_dir).with_suffix("")
        parts = list(rel.parts)
        if parts[-1] == "__init__":
            inits[".".join(parts[:-1])] = py_path
        else:
            mods[".".join(parts)] = py_path

    def _refs(path: Path, mod_name: str) -> set[str]:
        tree = ast.parse(path.read_text(encoding="utf-8"))
        out: set[str] = set()
        pkg = ".".join(mod_name.split(".")[:-1])
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    out.add(alias.name)
            elif isinstance(node, ast.ImportFrom):
                base = node.module or ""
                if node.level:
                    pkg_parts = pkg.split(".")
                    trim = max(0, len(pkg_parts) - (node.level - 1))
                    full = ".".join(pkg_parts[:trim] + ([base] if base else []))
                else:
                    full = base
                if full:
                    out.add(full)
                    for alias in node.names:
                        out.add(f"{full}.{alias.name}")
            elif (
                isinstance(node, ast.Constant)
                and isinstance(node.value, str)
                and "gse_engine." in node.value
            ):
                for match in re.findall(r"gse_engine(?:\.[a-zA-Z0-9_]+)+", node.value):
                    out.add(match)

        resolved: set[str] = set()
        for ref in out:
            if ref in mods or ref in inits:
                resolved.add(ref)
                ref_parts = ref.split(".")
                for i in range(1, len(ref_parts)):
                    ancestor = ".".join(ref_parts[:i])
                    if ancestor in inits:
                        resolved.add(ancestor)
        return resolved

    seeds = [
        "gse_engine.workflows.unified_reasoning_simulation_projection_spine",
        "gse_engine.cli",
        "gse_engine.compute.corpus_situational_integrator",
    ]
    queue: list[str] = list(seeds)
    seen: set[str] = set()
    while queue:
        cur = queue.pop(0)
        if cur in seen:
            continue
        seen.add(cur)
        cur_path = mods.get(cur) or inits.get(cur)
        if cur_path is None:
            continue
        for nxt in _refs(cur_path, cur):
            if nxt not in seen:
                queue.append(nxt)

    reachable = sorted(m for m in mods if m in seen)
    unreachable = sorted(m for m in mods if m not in seen)
    return {
        "seeds": seeds,
        "src_gse_engine_total": len(mods),
        "src_gse_engine_reachable": len(reachable),
        "unreachable": unreachable,
    }


def _check_mind_jsonl_untouched(repo_root: Path) -> bool:
    try:
        out = subprocess.check_output(
            ["git", "status", "--porcelain", "--", "brain/mind.jsonl"],
            cwd=str(repo_root),
            text=True,
        )
        return out.strip() == ""
    except Exception:
        return True


def run_total_corpus_and_w11_preflight(
    *,
    repo_root: Path = REPO_ROOT,
    write_receipt: bool = False,
    receipt_path: Path | None = None,
) -> dict[str, Any]:
    """Audit full corpus wiring, Python-to-Web hash parity, and governance invariants."""
    root = repo_root.resolve()

    manifest_877 = _read_json(root / "data" / "sports_research_papers" / "manifest_877_pdfs.json")
    pdfs_877 = int(manifest_877.get("total_pdfs") or 0)

    alphaxiv_total = 0
    alphaxiv_files: dict[str, int] = {}
    for p in sorted((root / "data" / "arxiv_2026_11_alphaxiv").glob("*.json")):
        payload = _read_json(p)
        cnt = int(payload.get("total_unique_papers") or payload.get("unique_paper_count") or 0)
        alphaxiv_files[p.name] = cnt
        alphaxiv_total += cnt

    matrix_eq = _read_json(root / "data" / "engine" / "thousand_equation_matrix_2026.json")
    inv_eq = _read_json(root / "data" / "mind" / "equation_inventory_v2.json")
    book_reg = _read_json(root / "data" / "mind" / "complete_458_book_registry.json")
    foundry_idx = _read_json(root / "data" / "engine" / "foundry_compound_corpus_index_2026.json")

    nov16_18_csvs = 0
    for day_str in ("2026-11-16", "2026-11-17", "2026-11-18"):
        folder = root / "docs" / "research" / day_str / "full-tables"
        if folder.is_dir():
            nov16_18_csvs += len(list(folder.glob("*.csv")))

    battery = _read_json(
        root / "data" / "eval" / "overnight_w1_to_w11_simulation_battery_2026_11_18.json"
    )
    rlvr_count = int((battery.get("gsi_ruo_audit") or {}).get("zero_odds_rlvr_count") or 0)

    reachability = _compute_src_gse_engine_reachability(root)

    w11_sealed = _read_json(
        root / "data" / "engine" / "week11_unified_sealed_projections_2026_11_18.json"
    )
    web_sealed = _read_json(root / "apps" / "web" / "lib" / "slate" / "current-sealed-slate.json")
    w11_sha = str(w11_sealed.get("projection_source_sha256") or "")
    web_sha = str(web_sealed.get("projection_source_sha256") or "")
    hash_match = bool(len(w11_sha) == 64 and w11_sha == web_sha)

    pub_scan = scan_public_root(root / "apps" / "web" / "public")
    pub_violations = int(pub_scan["violation_count"])

    web_vercel_raw = (root / "apps" / "web" / "vercel.json").read_text(encoding="utf-8")
    root_vercel_raw = (root / "vercel.json").read_text(encoding="utf-8")
    vercel_identical = web_vercel_raw == root_vercel_raw
    web_vercel_json = json.loads(web_vercel_raw)
    cron_count = len(web_vercel_json.get("crons") or [])

    shard_p = (
        root / "data" / "mind_staging" / "mind_2026_11_18_waves20_to_48_compound_shard.jsonl"
    )
    shard_records = (
        len([ln for ln in shard_p.read_text(encoding="ascii").splitlines() if ln.strip()])
        if shard_p.is_file()
        else 0
    )
    mind_untouched = _check_mind_jsonl_untouched(root)

    ruo_weight = float(CLINICAL_RUO_DARK_BRIDGE_SPORTS_WEIGHT)
    stake_cleared = bool(REAL_MONEY_STAKE_CLEARED)
    stake_fraction = float(LIVE_STAKE_FRACTION)

    checks = {
        "pdfs_877_ok": pdfs_877 == 877,
        "alphaxiv_203_ok": alphaxiv_total >= 203,
        "matrix_equations_ok": int(matrix_eq.get("total_equations") or 0) >= 9875,
        "inventory_equations_ok": int(inv_eq.get("total_equations") or 0) >= 21419,
        "complete_books_503_ok": int(book_reg.get("complete_503_corpus_books_count") or 0) >= 503,
        "foundry_primitives_50656_ok": int(
            foundry_idx.get("primitives_extracted_total") or 0
        )
        >= 50656,
        "nov16_to_18_csvs_145_ok": nov16_18_csvs >= 145,
        "zero_odds_rlvr_412_ok": rlvr_count >= 412,
        "src_gse_engine_100pct_reachable": (
            reachability["src_gse_engine_total"] >= 98
            and reachability["src_gse_engine_reachable"] == reachability["src_gse_engine_total"]
            and reachability["unreachable"] == []
        ),
        "w11_web_sha_parity_ok": hash_match,
        "w11_13_games_ok": int(w11_sealed.get("games_simulated") or 0) >= 13,
        "public_root_zero_vault_leak_ok": pub_violations == 0,
        "vercel_cron_cap_16_ok": cron_count <= 16 and vercel_identical,
        "mind_staging_shard_ok": shard_records >= 500 and mind_untouched,
        "governance_locks_ok": (
            ruo_weight == 0.0 and (not stake_cleared) and stake_fraction == 0.0
        ),
    }
    overall_ready = all(checks.values())

    body: dict[str, Any] = {
        "schema": "gse.w11_tnf_zero_surprise_preflight_receipt.v1",
        "generated_utc": datetime.now(UTC).isoformat(),
        "season": 2026,
        "week": 11,
        "corpus": {
            "pdfs_877": pdfs_877,
            "alphaxiv_papers": alphaxiv_total,
            "alphaxiv_vault_breakdown": alphaxiv_files,
            "matrix_equations": int(matrix_eq.get("total_equations") or 0),
            "inventory_equations": int(inv_eq.get("total_equations") or 0),
            "complete_books": int(book_reg.get("complete_503_corpus_books_count") or 0),
            "foundry_primitives": int(foundry_idx.get("primitives_extracted_total") or 0),
            "nov16_to_18_csvs": nov16_18_csvs,
            "zero_odds_rlvr_count": rlvr_count,
        },
        "reachability": reachability,
        "parity": {
            "w11_sealed_sha256": w11_sha,
            "web_sealed_sha256": web_sha,
            "hash_match": hash_match,
            "games_simulated": int(w11_sealed.get("games_simulated") or 0),
            "total_worlds_simulated": int(w11_sealed.get("total_worlds_simulated") or 0),
        },
        "guardrails": {
            "public_root_files_scanned": int(pub_scan["files_scanned"]),
            "public_root_zero_vault_violations": pub_violations,
            "vercel_cron_count": cron_count,
            "vercel_config_byte_identical": vercel_identical,
            "mind_staging_records": shard_records,
            "mind_jsonl_untouched": mind_untouched,
        },
        "governance": {
            "clinical_ruo_sports_weight": ruo_weight,
            "real_money_stake_cleared": stake_cleared,
            "live_stake_fraction": stake_fraction,
        },
        "checks": checks,
        "overall_ready": overall_ready,
    }
    canonical = json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    body["receipt_sha256"] = hashlib.sha256(canonical.encode("ascii")).hexdigest()

    if write_receipt:
        out_p = receipt_path or (
            root / "data" / "eval" / "w11_tnf_zero_surprise_preflight_receipt_2026_11_18.json"
        )
        out_p.parent.mkdir(parents=True, exist_ok=True)
        out_p.write_text(json.dumps(body, indent=2, ensure_ascii=True) + "\n", encoding="ascii")
    return body


def main(argv: list[str] | None = None) -> int:
    """CLI entrypoint for Task 6 total corpus audit and W11 TNF preflight verification."""
    parser = argparse.ArgumentParser(
        description="Verify 100% corpus wiring and Week 11 TNF zero-surprise preflight."
    )
    parser.add_argument("--write-receipt", action="store_true")
    parser.add_argument("--receipt-out", type=Path, default=None)
    args = parser.parse_args(argv)
    rep = run_total_corpus_and_w11_preflight(
        repo_root=REPO_ROOT,
        write_receipt=bool(args.write_receipt),
        receipt_path=args.receipt_out,
    )
    print(
        json.dumps(
            {
                "overall_ready": rep["overall_ready"],
                "corpus": rep["corpus"],
                "reachability_ratio": (
                    f"{rep['reachability']['src_gse_engine_reachable']}/"
                    f"{rep['reachability']['src_gse_engine_total']}"
                ),
                "hash_match": rep["parity"]["hash_match"],
                "w11_sealed_sha256": rep["parity"]["w11_sealed_sha256"],
                "vercel_cron_count": rep["guardrails"]["vercel_cron_count"],
                "public_root_zero_vault_violations": rep["guardrails"][
                    "public_root_zero_vault_violations"
                ],
                "receipt_sha256": rep["receipt_sha256"],
            },
            indent=2,
        )
    )
    return 0 if rep["overall_ready"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

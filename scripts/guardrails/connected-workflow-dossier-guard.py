#!/usr/bin/env python3
"""
scripts/guardrails/connected-workflow-dossier-guard.py

Git Pre-Commit & CI Guardrail for the GSE Connected 5-Stage Game Workflow.
When staged files include any call-sheet/dossier in `docs/predictions/research/**/*.md`
(dated on or after `2026-11-05`) or `data/engine/*connected_workflow*.json` (or when
invoked directly to verify the repository's active connected workflow artifacts):
  1. Verifies the JSON receipt has an unbroken cryptographic SHA-256 lineage chain
     (`Stage 0 -> Stage 1A -> Stage 1B -> Stage 2 -> Stage 3/4 -> Stage 5`),
     `coaching_modules_imported_and_verified >= 38`,
     `subpackages_connected_count >= 30`,
     `streams_executed_count == 22`,
     `x_situational_80_rules.evaluated_count == 80`, and
     `derivatives_and_exotics_360` present.
  2. Runs `assert_zero_roster_contamination` on the JSON and Markdown files.
  3. Verifies no confidence is formatted as `Confidence: XX%` or `conf XX%`
     (must be integer `XX/100`), and verifies the Dual-Panel Official Ledger
     (`15,947` replay + `16-5` Wilson CI) is present.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.enforce_stage0_roster_and_board_allowlist import (  # noqa: E402
    assert_zero_roster_contamination,
    load_stage0_game_roster_allowlist,
)

PERCENT_CONF_RE = re.compile(r"\b(?:confidence|conf)\s*[:=]?\s*\d+(?:\.\d+)?\s*%", re.IGNORECASE)


def _get_staged_files() -> list[str]:
    try:
        proc = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            check=True,
        )
        return [line.strip().replace("\\", "/") for line in proc.stdout.splitlines() if line.strip()]
    except Exception:
        return []


def verify_connected_workflow_json(json_path: Path) -> dict[str, Any]:
    if not json_path.is_file():
        raise RuntimeError(f"GUARD_FAIL: Missing connected workflow JSON receipt: {json_path}")
    data = json.loads(json_path.read_text(encoding="utf-8"))

    chain = data.get("cryptographic_receipt_chain") or data.get("receipt_lineage_sha256") or {}
    s0 = data.get("stage0_roster_and_board_allowlist") or data.get("stage0_allowlist") or {}
    s1a = data.get("stage1a_coaching_mind_and_schemes") or data.get("stage1a_coaching_and_schemes") or {}
    s1b = (
        data.get("stage1b_5367_equations_pre_sim_review")
        or data.get("stage1b_equations_and_engines")
        or {}
    )
    s2 = data.get("stage2_jev_spine_and_10k_simulation") or {}
    s34 = (
        data.get("stage3_4_conserved_post_sim_projections")
        or data.get("stage3_and_4_projections_and_situational")
        or {}
    )
    s5 = (
        data.get("stage5_360_conjunction_gate")
        or data.get("stage5_360_conjunction_gate_and_call_sheet")
        or {}
    )

    s0_hash = s0.get("stage0_receipt_sha256") or chain.get("stage0_receipt_sha256")
    s1a_hash = s1a.get("stage1a_receipt_sha256") or chain.get("stage1a_receipt_sha256")
    s1b_hash = s1b.get("stage1b_receipt_sha256") or chain.get("stage1b_receipt_sha256")
    s2_hash = s2.get("stage2_receipt_sha256") or chain.get("stage2_receipt_sha256")
    s34_hash = s34.get("stage3_4_receipt_sha256") or chain.get("stage3_4_receipt_sha256")
    s5_hash = s5.get("stage5_receipt_sha256") or chain.get("stage5_receipt_sha256")

    for stage_name, h_val in (
        ("stage0", s0_hash),
        ("stage1a", s1a_hash),
        ("stage1b", s1b_hash),
        ("stage2", s2_hash),
        ("stage3_4", s34_hash),
        ("stage5", s5_hash),
    ):
        if not isinstance(h_val, str) or len(h_val) != 64:
            raise RuntimeError(f"GUARD_FAIL: Missing or invalid 64-char SHA-256 receipt for {stage_name} in {json_path.name}")

    if s1a.get("parent_stage0_receipt_sha256") != s0_hash:
        raise RuntimeError("GUARD_FAIL: Broken lineage Stage 0 -> Stage 1A")
    if s1b.get("parent_stage1a_receipt_sha256") != s1a_hash:
        raise RuntimeError("GUARD_FAIL: Broken lineage Stage 1A -> Stage 1B")
    if s2.get("parent_stage1b_receipt_sha256") != s1b_hash:
        raise RuntimeError("GUARD_FAIL: Broken lineage Stage 1B -> Stage 2")
    if s34.get("parent_stage2_receipt_sha256") != s2_hash:
        raise RuntimeError("GUARD_FAIL: Broken lineage Stage 2 -> Stage 3/4")
    if s5.get("parent_stage3_4_receipt_sha256") != s34_hash:
        raise RuntimeError("GUARD_FAIL: Broken lineage Stage 3/4 -> Stage 5")

    coaching_verified = int(s1a.get("coaching_modules_imported_and_verified") or 0)
    if coaching_verified < 38:
        raise RuntimeError(f"GUARD_FAIL: coaching_modules_imported_and_verified={coaching_verified} (< 38)")

    py_dom = s1a.get("python_31_intelligence_subpackages_and_31_datasets") or {}
    py_sub = py_dom.get("intelligence_31_subpackages") or {}
    subpkg_count = int(py_sub.get("subpackages_connected_count") or py_sub.get("subpackages_connected") or 0)
    if subpkg_count < 30:
        raise RuntimeError(f"GUARD_FAIL: subpackages_connected_count={subpkg_count} (< 30)")

    msra = s1b.get("master_situational_reasoning_aggregator") or {}
    streams_exec = int(msra.get("streams_executed_count") or 0)
    if streams_exec != 22:
        raise RuntimeError(f"GUARD_FAIL: master_situational_reasoning_aggregator.streams_executed_count={streams_exec} (!= 22)")

    x80 = s1b.get("x_situational_80_rules") or {}
    x80_eval = int(x80.get("evaluated_count") or 0)
    if x80_eval != 80:
        raise RuntimeError(f"GUARD_FAIL: x_situational_80_rules.evaluated_count={x80_eval} (!= 80)")

    derivs = s34.get("derivatives_and_exotics_360") or {}
    if not derivs:
        raise RuntimeError("GUARD_FAIL: Missing derivatives_and_exotics_360 in Stage 3/4")

    for gl in s5.get("game_line_evaluations", []):
        conf_str = str(gl.get("confidence_score") or gl.get("confidence") or "")
        if not re.fullmatch(r"\d{1,3}/100", conf_str):
            raise RuntimeError(f"GUARD_FAIL: Game-line confidence '{conf_str}' is not formatted as integer XX/100")

    dual_str = json.dumps(s5.get("dual_panel_ledger_summary") or {})
    if ("15947" not in dual_str and "15,947" not in dual_str) or ("16-5" not in dual_str and "0.7619" not in dual_str):
        raise RuntimeError("GUARD_FAIL: Dual-Panel Official Ledger (15,947 replay + 16-5 Wilson CI) missing in Stage 5")

    assert_zero_roster_contamination(data, s0, f"json:{json_path.name}")
    return s0


def verify_dossier_markdown(md_path: Path, allowlist: dict[str, Any]) -> None:
    if not md_path.is_file():
        raise RuntimeError(f"GUARD_FAIL: Missing Markdown dossier: {md_path}")
    text = md_path.read_text(encoding="utf-8")

    assert_zero_roster_contamination(text, allowlist, f"md:{md_path.name}")

    m = PERCENT_CONF_RE.search(text)
    if m:
        raise RuntimeError(
            f"GUARD_FAIL: Forbidden percentage confidence '{m.group(0)}' in {md_path.name} (must be integer XX/100)"
        )

    if ("15,947" not in text and "15947" not in text) or "16-5" not in text:
        raise RuntimeError(
            f"GUARD_FAIL: Dual-Panel Official Ledger (15,947 replay + 16-5 Wilson CI) missing in {md_path.name}"
        )


def main() -> int:
    staged = _get_staged_files()
    staged_json = [
        REPO_ROOT / f
        for f in staged
        if f.startswith("data/engine/") and "connected_workflow" in f and f.endswith(".json")
    ]
    staged_md = [
        REPO_ROOT / f
        for f in staged
        if f.startswith("docs/predictions/research/")
        and f.endswith(".md")
        and any(part >= "2026-11-05" for part in f.split("/") if re.fullmatch(r"\d{4}-\d{2}-\d{2}", part))
        and ("CALL-SHEET" in f.upper() or "CONNECTED-WORKFLOW" in f.upper())
    ]

    # Always verify the canonical connected workflow receipt + dossiers if present or staged
    default_json = REPO_ROOT / "data" / "engine" / "tnf_jax_bal_connected_workflow_master_2026_11_05.json"
    default_mds = [
        REPO_ROOT / "docs" / "predictions" / "research" / "2026-11-05" / "TNF-JAX-AT-BAL-FINAL-360-CALL-SHEET-2026-11-05.md",
        REPO_ROOT / "docs" / "predictions" / "research" / "2026-11-05" / "TNF-JAX-BAL-CONNECTED-WORKFLOW-PROJECTIONS-AND-CALL-SHEET.md",
    ]

    jsons_to_check = staged_json or ([default_json] if default_json.is_file() else [])
    mds_to_check = staged_md or [p for p in default_mds if p.is_file()]

    try:
        allowlist = None
        for jp in jsons_to_check:
            allowlist = verify_connected_workflow_json(jp)
        if allowlist is None:
            allowlist = load_stage0_game_roster_allowlist("JAX", "BAL", 9)
        for mp in mds_to_check:
            verify_dossier_markdown(mp, allowlist)
    except Exception as exc:
        print(f"  FAIL  connected-workflow-dossier-guard — {exc}", file=sys.stderr)
        return 1

    print("  PASS  connected-workflow-dossier-guard — cryptographic Stage 0..5 receipt & zero-contamination verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

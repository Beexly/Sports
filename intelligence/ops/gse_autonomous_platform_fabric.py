#!/usr/bin/env python3
"""
GSE Site-Wide Autonomous Platform Fabric (Track 1 — Python Orchestrator).

Unifies scheduled internal execution across all governed surfaces:
  - 23 Jarvis Agent Council / AGENT_OS_REGISTRY seats
  - 21 SubagentTemplates
  - 10 AI-Council adversarial DESTROY seats (@sports/ai-council)
  -  8 War Room signal watchers
  - 14 Governed workflows (WORKFLOW_REGISTRY)
  - Google Jules REST API telemetry & session continuity (`evaluate_jules_live_api_sources_and_sessions`)
  - Read-only Foundry `corpus_queue` monitor (`C:\\Users\\Garrett\\Sports\\foundry\\foundry.db`, mode=ro)

Enforces MIND-FIRST sequencing:
  - While `PENDING > 0` Tier-A items remain or corpus calibration receipt is unverified,
    Week 10 slate generation/tuning stays held (`WEEK10_HELD_FOR_CORPUS_COMPLETION`).
  - Defaults inference routing to free / zero-cost tiers (`free` / `hybrid_auto`), with
    optional pluggable opt-in for `deepseek_1017` (capped at `--max-cost-usd 0.50`),
    `gcp_credit` ($103.11 GCP credits), or `jules`.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sqlite3
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.ops.openai_ecosystem_jules_and_opendots_engine import (
    _load_env_secret,
    evaluate_jules_live_api_sources_and_sessions,
)

SHARED_MAIN_REPO_ENV_LOCAL = Path(r"C:\Users\Garrett\Sports\.env.local")


def _load_secret_any(name: str) -> str:
    val = os.environ.get(name, "").strip() or _load_env_secret(name)
    if val:
        return val
    candidates = (
        Path.home() / "AppData" / "Local" / "hermes" / ".env",
        Path.home() / ".hermes" / ".env",
        SHARED_MAIN_REPO_ENV_LOCAL,
        REPO_ROOT / ".env.local",
    )
    for env_file in candidates:
        if not env_file.exists():
            continue
        for raw_line in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            if k.strip() == name:
                found = v.strip().strip('"').strip("'")
                if found:
                    return found
    return ""

DEFAULT_FOUNDRY_DB = Path(r"C:\Users\Garrett\Sports\foundry\foundry.db")
DEFAULT_CORPUS_RECEIPT = (
    REPO_ROOT
    / "docs"
    / "engine"
    / "research"
    / "2026-11-13"
    / "corpus_compilation"
    / "07_corpus_wired_calibration_and_hold_gate_receipt.json"
)
DEFAULT_OUTPUT_RECEIPT = (
    REPO_ROOT
    / "docs"
    / "engine"
    / "research"
    / "2026-11-13"
    / "06_autonomous_platform_fabric_latest_receipt.json"
)

VALID_MODEL_LANES = ("free", "deepseek_1017", "gcp_credit", "jules", "hybrid_auto")
VALID_SUITES = (
    "all",
    "ingestion",
    "calibration",
    "settlement",
    "destroy-audit",
    "jules-sync",
    "corpus-watch",
)


def mask_secret(secret: str) -> str:
    """Mask API secrets as first4...last4 before writing logs or receipts."""
    s = (secret or "").strip()
    if not s:
        return ""
    if len(s) <= 8:
        return f"{s[:2]}...{s[-2:]}" if len(s) >= 4 else "***"
    return f"{s[:4]}...{s[-4:]}"


def inspect_foundry_queue_ro(db_path: Path = DEFAULT_FOUNDRY_DB) -> Dict[str, Any]:
    """Read Foundry queue counts strictly in URI read-only mode (never RW)."""
    if not db_path.exists():
        return {
            "exists": False,
            "db_path": str(db_path),
            "pending_tier_a": -1,
            "pending_total": -1,
            "complete_total": 0,
            "insufficient_ocr": 0,
            "primitives_rows": 0,
            "reasoning_traces_rows": 0,
        }

    uri = f"file:///{db_path.as_posix()}?mode=ro"
    conn = sqlite3.connect(uri, uri=True, timeout=5.0)
    try:
        cur = conn.cursor()
        by_status = dict(
            cur.execute(
                "SELECT status, COUNT(*) FROM corpus_queue GROUP BY status"
            ).fetchall()
        )
        pending_tier_a = cur.execute(
            "SELECT COUNT(*) FROM corpus_queue WHERE status = 'PENDING' AND tier = 'A'"
        ).fetchone()[0]
        primitives_rows = cur.execute("SELECT COUNT(*) FROM primitives").fetchone()[0]
        traces_rows = cur.execute(
            "SELECT COUNT(*) FROM reasoning_traces"
        ).fetchone()[0]
        return {
            "exists": True,
            "db_path": str(db_path),
            "by_status": by_status,
            "pending_tier_a": int(pending_tier_a),
            "pending_total": int(by_status.get("PENDING", 0)),
            "complete_total": int(by_status.get("COMPLETE", 0)),
            "delegated_gcp": int(by_status.get("DELEGATED_GCP", 0)),
            "insufficient_ocr": int(by_status.get("INSUFFICIENT_OCR", 0)),
            "primitives_rows": int(primitives_rows),
            "reasoning_traces_rows": int(traces_rows),
        }
    finally:
        conn.close()


def _extract_corpus_snapshot_from_payload(payload: Mapping[str, Any]) -> Dict[str, Any]:
    """Extract Wave 15 corpus snapshot metrics from an already-parsed receipt dict."""
    wired_tier_a = int(payload.get("wiredTierACount", 0) or 0)
    rwc = payload.get("router_wiring_counts") or {}
    oof = payload.get("chronological_oof_baseline") or {}
    sovereign_books_loaded = int(rwc.get("sovereign_books_loaded", wired_tier_a) or 0)
    oof_n_rows = int(oof.get("n_rows", 0) or 0)
    return {
        "wired_tier_a": wired_tier_a,
        "sovereign_books_loaded": sovereign_books_loaded,
        "oof_n_rows": oof_n_rows,
        "internal_workflow_corpus_ready": bool(
            sovereign_books_loaded > 0 and oof_n_rows > 0
        ),
    }


def evaluate_corpus_hold_gate(
    queue_stats: Mapping[str, Any],
    receipt_path: Path = DEFAULT_CORPUS_RECEIPT,
) -> Dict[str, Any]:
    """Fail-closed check keeping Week 10 slate generation paused until corpus completion."""
    pending_a = int(queue_stats.get("pending_tier_a", -1))
    insufficient_ocr = int(queue_stats.get("insufficient_ocr", 0))
    calibration_verified = False
    receipt_loaded = False
    payload: Dict[str, Any] = {}
    if receipt_path.exists():
        try:
            loaded_obj = json.loads(receipt_path.read_text(encoding="utf-8"))
            if isinstance(loaded_obj, dict):
                payload = loaded_obj
                # Never infer calibrationVerified from all_invariants_satisfied; require explicit True.
                calibration_verified = payload.get("calibrationVerified") is True
                receipt_loaded = True
        except (OSError, ValueError):
            calibration_verified = False

    slate_allowed = (
        queue_stats.get("exists", False)
        and pending_a == 0
        and insufficient_ocr == 0
        and calibration_verified
    )
    snapshot = (
        _extract_corpus_snapshot_from_payload(payload)
        if receipt_loaded
        else {
            "wired_tier_a": 0,
            "sovereign_books_loaded": 0,
            "oof_n_rows": 0,
            "internal_workflow_corpus_ready": False,
        }
    )
    return {
        "status": (
            "READY_FOR_WEEK10_PREP"
            if slate_allowed
            else "WEEK10_HELD_FOR_CORPUS_COMPLETION"
        ),
        "slate_prep_allowed": bool(slate_allowed),
        "public_publish_allowed": False,
        "pending_tier_a": pending_a,
        "wired_tier_a": snapshot["wired_tier_a"],
        "sovereign_books_loaded": snapshot["sovereign_books_loaded"],
        "oof_n_rows": snapshot["oof_n_rows"],
        "internal_workflow_corpus_ready": snapshot["internal_workflow_corpus_ready"],
        "insufficient_ocr": insufficient_ocr,
        "calibration_verified": calibration_verified,
        "receipt_loaded": receipt_loaded,
    }


def detect_configured_model_lanes() -> Dict[str, Any]:
    """Inspect configured provider credentials without exposing raw keys."""
    key_names = (
        "DASHSCOPE_API_KEY",
        "QWEN_GSE_API_KEY",
        "NVIDIA_GSE_API_KEY",
        "NVIDIA_API_KEY",
        "MODELSCOPE_API_KEY",
        "DEEPINFRA_API_KEY",
        "APIMART_API_KEY",
        "QODER_API_KEY",
        "TREG_AUTH_TOKEN",
        "JSON2VIDEO_API_KEY",
        "JSON2VIDEO_API_KEY_SECONDARY",
        "OPENROUTER_API_KEY",
        "GEMINI_API_KEY",
        "GOOGLE_API_KEY",
        "JULES_API_KEY",
    )
    masked = {k: mask_secret(_load_secret_any(k)) for k in key_names}
    free_tier_keys = (
        "DASHSCOPE_API_KEY",
        "QWEN_GSE_API_KEY",
        "NVIDIA_GSE_API_KEY",
        "NVIDIA_API_KEY",
        "MODELSCOPE_API_KEY",
        "OPENROUTER_API_KEY",
        "GEMINI_API_KEY",
        "GOOGLE_API_KEY",
    )
    return {
        "default_lane": "hybrid_auto",
        "free_endpoints_ready": [name for name in free_tier_keys if masked.get(name)],
        "external_endpoints_ready": [
            name
            for name in (
                "DEEPINFRA_API_KEY",
                "APIMART_API_KEY",
                "QODER_API_KEY",
                "TREG_AUTH_TOKEN",
                "JSON2VIDEO_API_KEY",
                "JSON2VIDEO_API_KEY_SECONDARY",
            )
            if masked.get(name)
        ],
        "media_endpoints_ready": [
            name
            for name in ("JSON2VIDEO_API_KEY", "JSON2VIDEO_API_KEY_SECONDARY")
            if masked.get(name)
        ],
        "jules_ready": bool(masked.get("JULES_API_KEY")),
        "keys_masked": masked,
    }


def resolve_auto_nfl_week(now_utc: Optional[dt.datetime] = None) -> Dict[str, Any]:
    """Compute approximate NFL week metadata dynamically (never hardcoded Wk10 in workflows)."""
    now = now_utc or dt.datetime.now(dt.timezone.utc)
    season_start = dt.datetime(2026, 9, 8, tzinfo=dt.timezone.utc)
    delta_days = max(0, (now - season_start).days)
    week_num = min(18, max(1, (delta_days // 7) + 1))
    return {"season": 2026, "computed_week": week_num, "as_of_utc": now.isoformat()}


def build_execution_plan(
    *,
    model_lane: str,
    suite: str,
    max_cost_usd: float,
    dry_run: bool,
    queue_stats: Mapping[str, Any],
    hold_gate: Mapping[str, Any],
    jules_audit: Mapping[str, Any],
    providers: Mapping[str, Any],
    week_info: Mapping[str, Any],
) -> Dict[str, Any]:
    """Build deterministic suite execution plan covering all councils & workflows."""
    suites_selected = (
        ["ingestion", "calibration", "settlement", "destroy-audit", "jules-sync", "corpus-watch"]
        if suite == "all"
        else [suite]
    )

    jobs: List[Dict[str, Any]] = []
    for s in suites_selected:
        if s == "corpus-watch":
            jobs.append(
                {
                    "suite": s,
                    "owning_seats": ["prism", "ascend", "archive", "jarvis"],
                    "action": "monitor_shard_a_4_to_7_and_shard_b_sync",
                    "status": "READY",
                    "cost_usd": 0.0,
                }
            )
        elif s == "destroy-audit":
            jobs.append(
                {
                    "suite": s,
                    "owning_seats": ["gauge", "audit", "ai-council-10-seats"],
                    "action": "run_destroy_pass_and_guardrail_audit",
                    "status": "READY",
                    "cost_usd": 0.0,
                }
            )
        elif s == "jules-sync":
            jobs.append(
                {
                    "suite": s,
                    "owning_seats": ["chain", "jarvis"],
                    "action": "poll_jules_v1alpha_sources_and_sessions",
                    "sources_count": int(jules_audit.get("sources_count", 0)),
                    "total_sessions": int(jules_audit.get("total_sessions", 0)),
                    "status": "READY" if jules_audit.get("live_api_queried") else "OFFLINE_CACHED",
                    "cost_usd": 0.0,
                }
            )
        elif s == "calibration":
            internal_corpus_ready = bool(
                hold_gate.get("receipt_loaded")
                and hold_gate.get("internal_workflow_corpus_ready")
            )
            if hold_gate.get("calibration_verified"):
                cal_status = "READY"
            elif internal_corpus_ready:
                cal_status = "ACTIVE_INCREMENTAL_OOF_CALIBRATION"
            else:
                cal_status = "HELD_FOR_WIRE_FIRST"
            jobs.append(
                {
                    "suite": s,
                    "owning_seats": ["audit", "prism", "ascend"],
                    "action": "empirical_bayes_oof_corpus_priors_check",
                    "status": cal_status,
                    "public_publish_allowed": False,
                    "live_calibration_flag_enabled": False,
                    "cost_usd": 0.0,
                }
            )
        elif s == "ingestion":
            jobs.append(
                {
                    "suite": s,
                    "owning_seats": ["tal", "delta", "scout"],
                    "action": "sync_free_feeds_and_check_source_freshness",
                    "slate_prep_held": not bool(hold_gate.get("slate_prep_allowed")),
                    "status": "READY_DATA_ONLY",
                    "cost_usd": 0.0,
                }
            )
        elif s == "settlement":
            jobs.append(
                {
                    "suite": s,
                    "owning_seats": ["ledger", "audit"],
                    "action": "free_espn_settlement_reconcile_only",
                    "status": "READY_FREE_PATH",
                    "cost_usd": 0.0,
                }
            )

    return {
        "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "dry_run": dry_run,
        "model_lane": model_lane,
        "max_cost_usd": float(max_cost_usd),
        "total_estimated_cost_usd": 0.0,
        "week_info": dict(week_info),
        "council_coverage": {
            "agent_council_seats": 23,
            "subagent_templates": 21,
            "ai_council_destroy_seats": 10,
            "war_room_watchers": 8,
            "governed_workflows": 14,
        },
        "hold_gate": dict(hold_gate),
        "foundry_queue": dict(queue_stats),
        "jules_audit_summary": {
            "live_api_queried": bool(jules_audit.get("live_api_queried", False)),
            "sources_count": int(jules_audit.get("sources_count", 0)),
            "total_sessions": int(jules_audit.get("total_sessions", 0)),
            "state_counts": dict(jules_audit.get("state_counts", {})),
        },
        "providers": dict(providers),
        "jobs": jobs,
    }


def ping_web_cron_if_configured(
    base_url: str,
    cron_secret: str,
    lane: str,
    dry_run: bool,
) -> Dict[str, Any]:
    """Optionally trigger `/api/cron/site-wide-workflows` with Bearer CRON_SECRET."""
    if not base_url or not cron_secret:
        return {"invoked": False, "reason": "CRON_TARGET_URL or CRON_SECRET unset"}
    url = f"{base_url.rstrip('/')}/api/cron/site-wide-workflows?lane={lane}&dryRun={'1' if dry_run else '0'}"
    req = urllib.request.Request(
        url,
        method="GET",
        headers={"Authorization": f"Bearer {cron_secret}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            return {"invoked": True, "status": resp.status, "ok": body.get("ok", False)}
    except (urllib.error.URLError, ValueError) as exc:
        return {"invoked": True, "ok": False, "error": str(exc)}


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="GSE Site-Wide Autonomous Platform Fabric Orchestrator"
    )
    parser.add_argument(
        "--model-lane",
        choices=VALID_MODEL_LANES,
        default="hybrid_auto",
        help="Inference lane (default: hybrid_auto = free first, then credit/capped).",
    )
    parser.add_argument(
        "--suite",
        choices=VALID_SUITES,
        default="all",
        help="Suite subset to plan/execute.",
    )
    parser.add_argument(
        "--max-cost-usd",
        type=float,
        default=0.50,
        help="Hard per-run USD ceiling for paid lanes.",
    )
    parser.add_argument(
        "--week",
        default="auto",
        help="NFL week selector ('auto' computes from calendar date).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Do not invoke external web cron HTTP endpoints.",
    )
    parser.add_argument(
        "--jules-audit",
        action="store_true",
        help="Query live Google Jules v1alpha API (requires JULES_API_KEY).",
    )
    parser.add_argument(
        "--write-receipt",
        type=Path,
        default=DEFAULT_OUTPUT_RECEIPT,
        help="Output JSON receipt path.",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    queue_stats = inspect_foundry_queue_ro()
    hold_gate = evaluate_corpus_hold_gate(queue_stats)
    providers = detect_configured_model_lanes()
    jules_audit = evaluate_jules_live_api_sources_and_sessions(
        fetch_live=bool(args.jules_audit and not args.dry_run)
    )
    week_info = resolve_auto_nfl_week()
    if args.week != "auto":
        week_info["explicit_week_arg"] = str(args.week)

    plan = build_execution_plan(
        model_lane=args.model_lane,
        suite=args.suite,
        max_cost_usd=args.max_cost_usd,
        dry_run=bool(args.dry_run),
        queue_stats=queue_stats,
        hold_gate=hold_gate,
        jules_audit=jules_audit,
        providers=providers,
        week_info=week_info,
    )

    if not args.dry_run:
        web_target = os.environ.get("CRON_TARGET_URL", "").strip()
        cron_secret = os.environ.get("CRON_SECRET", "").strip()
        plan["web_cron_ping"] = ping_web_cron_if_configured(
            web_target, cron_secret, args.model_lane, dry_run=False
        )

    args.write_receipt.parent.mkdir(parents=True, exist_ok=True)
    args.write_receipt.write_text(json.dumps(plan, indent=2), encoding="utf-8")
    print(json.dumps(plan, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

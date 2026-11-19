#!/usr/bin/env python3
"""Task 7 Hygiene Audit: 16-Cron Cap, Offload Mapping, and gse-ml-service Contract.

Checks (read-only):
  1. Both `apps/web/vercel.json` and root `vercel.json` exist, are byte-identical,
     declare <= 16 crons (exact 16 canonical schedules), and match `CRON_MANIFEST`
     in `apps/web/lib/ops/cron-schedule-manifest.ts` in exact order.
  2. Every kept cron resolves to an existing Next.js App Router `route.ts` handler.
  3. All 24 offloaded cron routes are accounted for with explicit offload targets
     (`GitHub Actions`, `Cloudflare Workers`, or `Upstash QStash`).
  4. `docs/ops/CRON_MATRIX.generated.md` reports count 16 and zero drift.
  5. Standalone `gse-ml-service` sibling repo checklist and `/health`, `/predict/etkf`,
     and `/predict/tda` FastAPI contracts are verified read-only WITHOUT ever invoking
     `git` inside `gse-ml-service`.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
for _p in (str(REPO_ROOT / "src"), str(REPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

MAX_VERCEL_CRONS = 16

EXPECTED_16_CRONS: tuple[tuple[str, str], ...] = (
    ("/api/cron/refresh-odds", "*/15 * * * *"),
    ("/api/cron/board-fill", "2,17,32,47 * * * *"),
    ("/api/cron/settle-picks", "20 * * * *"),
    ("/api/cron/deliver-settlement-alerts", "15 */3 * * *"),
    ("/api/cron/generate-signal-slate", "5,20,35,50 * * * *"),
    ("/api/cron/reconcile-entitlements", "45 * * * *"),
    ("/api/cron/prune-rate-limits", "30 6 * * *"),
    ("/api/cron/repair-checkout-attempts", "50 * * * *"),
    ("/api/cron/free-spine-health", "0 */2 * * *"),
    ("/api/cron/health-alert", "*/15 * * * *"),
    ("/api/cron/autonomy-cycle", "7,22,37,52 * * * *"),
    ("/api/cron/calibration-metrics", "40 */6 * * *"),
    ("/api/cron/refresh-player-stats", "0,30 * * * *"),
    ("/api/ops/daily-truth", "5 12 * * *"),
    ("/api/cron/arbiter-adjudication", "41 * * * *"),
    ("/api/cron/site-wide-workflows", "12 0,3,6,13,16,19,22 * * *"),
)

OFFLOADED_24_CRON_TARGETS: dict[str, dict[str, str]] = {
    "/api/cron/generate-drafts": {
        "target": "GitHub Actions",
        "runner": "gse-site-wide-autonomous-fabric (free-lane content drafts)",
    },
    "/api/cron/ingest-player-stats": {
        "target": "GitHub Actions",
        "runner": "scheduled nflverse batch ingest",
    },
    "/api/cron/hydrate-cold-plane": {
        "target": "GitHub Actions",
        "runner": "daily cold-plane hydration workflow",
    },
    "/api/cron/run-formal-receipt": {
        "target": "GitHub Actions",
        "runner": "daily formal receipt audit workflow",
    },
    "/api/cron/backfill-independent-trueprob": {
        "target": "GitHub Actions",
        "runner": "external-cron / manual backfill dispatch",
    },
    "/api/cron/backfill-team-efficiency": {
        "target": "GitHub Actions",
        "runner": "daily team-efficiency backfill workflow",
    },
    "/api/cron/ngs-ingest": {
        "target": "GitHub Actions",
        "runner": "weekly Tuesday/Wednesday NGS ingest workflow",
    },
    "/api/cron/backfill-player-data": {
        "target": "GitHub Actions",
        "runner": "weekly Tuesday player-data backfill",
    },
    "/api/cron/backfill-historical-games": {
        "target": "GitHub Actions",
        "runner": "weekly Tuesday historical games backfill",
    },
    "/api/cron/backtest-calibration": {
        "target": "GitHub Actions",
        "runner": "weekly Sunday calibration backtest",
    },
    "/api/cron/feature-recipe-backtest": {
        "target": "GitHub Actions",
        "runner": "weekly Sunday feature-recipe backtest",
    },
    "/api/cron/microstructure-report": {
        "target": "GitHub Actions",
        "runner": "daily microstructure summary job",
    },
    "/api/cron/refresh-wire": {
        "target": "Cloudflare Workers",
        "runner": "workers/airwave-listener RSS/wire poller",
    },
    "/api/cron/gamma": {
        "target": "Cloudflare Workers",
        "runner": "workers/data-refresh Polymarket Gamma feed",
    },
    "/api/cron/prediction-market-snapshot": {
        "target": "Cloudflare Workers",
        "runner": "workers/data-refresh prediction-market snapshot",
    },
    "/api/cron/game-weather-capture": {
        "target": "Cloudflare Workers",
        "runner": "workers/data-refresh gameday weather poll",
    },
    "/api/cron/drain-ai-telemetry-recovery": {
        "target": "Cloudflare Workers",
        "runner": "workers/immortal-orchestrator telemetry drain",
    },
    "/api/cron/jarvis-snapshot": {
        "target": "Cloudflare Workers",
        "runner": "workers/immortal-orchestrator snapshot poller",
    },
    "/api/cron/watch-scheduler": {
        "target": "Upstash QStash",
        "runner": "game-window active scheduler trigger",
    },
    "/api/cron/watch-warm": {
        "target": "Upstash QStash",
        "runner": "game-window Space warm-ping schedule",
    },
    "/api/cron/signal-ledger-write": {
        "target": "Upstash QStash",
        "runner": "post-slate signal ledger event trigger",
    },
    "/api/cron/signal-ledger-census": {
        "target": "Upstash QStash",
        "runner": "post-write signal census trigger",
    },
    "/api/cron/props-slate-shadow": {
        "target": "Upstash QStash",
        "runner": "props shadow slate schedule trigger",
    },
    "/api/cron/engine-dfs-slate": {
        "target": "Upstash QStash",
        "runner": "DFS engine slate build trigger",
    },
}


def _route_handler_exists(cron_path: str) -> bool:
    rel = cron_path.lstrip("/")
    candidates = (
        REPO_ROOT / "apps" / "web" / "app" / rel / "route.ts",
        REPO_ROOT / "apps" / "web" / "app" / rel / "route.tsx",
        REPO_ROOT / "apps" / "web" / "app" / rel / "route.js",
    )
    return any(p.is_file() for p in candidates)


def _locate_gse_ml_service() -> Path | None:
    env_dir = os.environ.get("GSE_ML_SERVICE_DIR", "").strip()
    candidates: list[Path] = []
    if env_dir:
        candidates.append(Path(env_dir))
    candidates.extend(
        [
            REPO_ROOT / "gse-ml-service",
            REPO_ROOT.parent / "gse-ml-service",
            REPO_ROOT.parent.parent / "gse-ml-service",
        ]
    )
    for cand in candidates:
        if cand.is_dir() and (cand / "app" / "main.py").is_file():
            return cand
    return None


def _audit_gse_ml_service_readonly(ml_dir: Path | None) -> dict[str, Any]:
    """Inspect gse-ml-service files read-only; NEVER invoke git inside it."""
    checklist = [
        (
            "Initialize standalone git repo at gse-ml-service root "
            "(git init && git branch -M main)"
        ),
        "Verify .gitignore excludes .venv, __pycache__, .pytest_cache, *.pyc",
        "Build and pin Docker image from gse-ml-service/Dockerfile (--no-deps requirements.txt)",
        "Verify GET /health reports consensus_eligible=['etkf'] and 5 model cards",
        (
            "Verify POST /predict/etkf returns probability in (0,1) "
            "and POST /predict/tda omits probability"
        ),
    ]
    if ml_dir is None:
        return {
            "found": False,
            "git_initialized": False,
            "endpoints_verified": [],
            "standalone_git_init_checklist": checklist,
            "errors": ["gse-ml-service sibling directory not found"],
        }

    main_py = ml_dir / "app" / "main.py"
    req_txt = ml_dir / "requirements.txt"
    dockerfile = ml_dir / "Dockerfile"
    tests_dir = ml_dir / "app" / "tests"
    src = main_py.read_text(encoding="utf-8")

    endpoints_verified: list[str] = []
    for ep, pattern in (
        ("/health", r'@app\.get\("/health"'),
        ("/predict/etkf", r'@app\.post\("/predict/etkf"'),
        ("/predict/tda", r'@app\.post\("/predict/tda"'),
    ):
        if re.search(pattern, src):
            endpoints_verified.append(ep)

    etkf_has_prob = "class EtkfResponse" in src and "probability: float" in src
    tda_omits_prob = "class TdaResponse" in src and "no ``probability`` field" in src
    irl_pinned_none = "probability: None = None" in src
    errors: list[str] = []
    if len(endpoints_verified) != 3:
        errors.append(f"Missing required gse-ml-service endpoints: {endpoints_verified}")
    if not (etkf_has_prob and tda_omits_prob and irl_pinned_none):
        errors.append("gse-ml-service probability isolation contract check failed")
    if not (req_txt.is_file() and dockerfile.is_file() and tests_dir.is_dir()):
        errors.append("gse-ml-service missing requirements.txt, Dockerfile, or app/tests")

    return {
        "found": True,
        "git_initialized": (ml_dir / ".git").exists(),
        "endpoints_verified": endpoints_verified,
        "etkf_probability_contract": etkf_has_prob,
        "tda_no_probability_contract": tda_omits_prob,
        "irl_null_probability_contract": irl_pinned_none,
        "has_dockerfile": dockerfile.is_file(),
        "has_requirements": req_txt.is_file(),
        "has_tests_dir": tests_dir.is_dir(),
        "standalone_git_init_checklist": checklist,
        "errors": errors,
    }


def run_hygiene_audit() -> dict[str, Any]:
    """Run all Task 7 cron-cap, manifest, offload-map, and gse-ml-service checks."""
    errors: list[str] = []

    app_vercel = REPO_ROOT / "apps" / "web" / "vercel.json"
    root_vercel = REPO_ROOT / "vercel.json"
    manifest_path = REPO_ROOT / "apps" / "web" / "lib" / "ops" / "cron-schedule-manifest.ts"
    matrix_path = REPO_ROOT / "docs" / "ops" / "CRON_MATRIX.generated.md"

    if not app_vercel.is_file():
        errors.append("Missing apps/web/vercel.json")
    if not root_vercel.is_file():
        errors.append("Missing root vercel.json")

    app_bytes = app_vercel.read_bytes() if app_vercel.is_file() else b""
    root_bytes = root_vercel.read_bytes() if root_vercel.is_file() else b""
    vercel_byte_identical = bool(app_bytes) and app_bytes == root_bytes
    if not vercel_byte_identical:
        errors.append("apps/web/vercel.json and vercel.json are not byte-identical")

    crons_raw = json.loads(app_bytes.decode("utf-8")).get("crons", []) if app_bytes else []
    cron_tuples = tuple((str(c["path"]), str(c["schedule"])) for c in crons_raw)
    cron_count = len(cron_tuples)
    if cron_count > MAX_VERCEL_CRONS:
        errors.append(f"Cron count {cron_count} exceeds cap {MAX_VERCEL_CRONS}")
    if cron_tuples != EXPECTED_16_CRONS:
        errors.append("vercel.json crons do not match canonical 16-cron order and schedules")

    for path, _ in cron_tuples:
        if not _route_handler_exists(path):
            errors.append(f"Missing route handler for kept cron: {path}")

    manifest_entries: tuple[tuple[str, str], ...] = ()
    if manifest_path.is_file():
        manifest_src = manifest_path.read_text(encoding="utf-8")
        manifest_entries = tuple(re.findall(r'cronEntry\("([^"]+)",\s*"([^"]+)"\)', manifest_src))
        if manifest_entries != EXPECTED_16_CRONS:
            errors.append("CRON_MANIFEST does not match canonical 16 crons in order")
    else:
        errors.append("Missing apps/web/lib/ops/cron-schedule-manifest.ts")

    if matrix_path.is_file():
        matrix_txt = matrix_path.read_text(encoding="utf-8")
        if "**Count:** 16 scheduled routes in apps/web/vercel.json." not in matrix_txt:
            errors.append("CRON_MATRIX.generated.md does not report Count: 16")
        if "**DRIFT:** none" not in matrix_txt:
            errors.append("CRON_MATRIX.generated.md reports drift")
    else:
        errors.append("Missing docs/ops/CRON_MATRIX.generated.md")

    # Verify all 24 offloaded routes are explicitly mapped and still exist on disk
    kept_paths = {p for p, _ in cron_tuples}
    overlap = kept_paths & set(OFFLOADED_24_CRON_TARGETS)
    if overlap:
        errors.append(f"Overlap between kept 16 and offloaded 24 crons: {sorted(overlap)}")
    for offloaded_path, meta in OFFLOADED_24_CRON_TARGETS.items():
        if meta["target"] not in {"GitHub Actions", "Cloudflare Workers", "Upstash QStash"}:
            errors.append(f"Invalid offload target for {offloaded_path}: {meta['target']}")
        if not _route_handler_exists(offloaded_path):
            errors.append(f"Missing route handler for offloaded cron: {offloaded_path}")

    ml_report = _audit_gse_ml_service_readonly(_locate_gse_ml_service())
    errors.extend(ml_report.get("errors", []))

    return {
        "ok": len(errors) == 0,
        "cron_count": cron_count,
        "max_vercel_crons": MAX_VERCEL_CRONS,
        "offloaded_count": len(OFFLOADED_24_CRON_TARGETS),
        "vercel_byte_identical": vercel_byte_identical,
        "manifest_count": len(manifest_entries),
        "offload_targets_summary": {
            target: sum(1 for v in OFFLOADED_24_CRON_TARGETS.values() if v["target"] == target)
            for target in ("GitHub Actions", "Cloudflare Workers", "Upstash QStash")
        },
        "offloaded_routes": OFFLOADED_24_CRON_TARGETS,
        "gse_ml_service": ml_report,
        "errors": errors,
    }


def main(argv: list[str] | None = None) -> int:
    """CLI entrypoint for Task 7 cron and gse-ml-service hygiene verification."""
    parser = argparse.ArgumentParser(
        description="Audit 16-cron consolidation, offload targets, and gse-ml-service hygiene."
    )
    parser.add_argument("--json", action="store_true", help="Print JSON report to stdout.")
    args = parser.parse_args(argv)

    report = run_hygiene_audit()
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        status = "PASS" if report["ok"] else "FAIL"
        print(
            f"[audit_cron_and_ml_service_hygiene] {status}: "
            f"crons={report['cron_count']}/{report['max_vercel_crons']}, "
            f"offloaded={report['offloaded_count']}, "
            f"byte_identical={report['vercel_byte_identical']}, "
            f"ml_endpoints={report['gse_ml_service']['endpoints_verified']}"
        )
        if report["errors"]:
            for err in report["errors"]:
                print(f"  ERROR: {err}")
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

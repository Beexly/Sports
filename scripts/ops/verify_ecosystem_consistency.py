"""Ecosystem Structure, Entity, Copy, Safety-Gate & Workflow Consistency Auditor."""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class ConsistencyCheckResult:
    """Single named consistency probe outcome."""

    name: str
    passed: bool
    detail: str


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def check_ledger_single_source_parity(root: Path) -> ConsistencyCheckResult:
    """Ensure ledger & AI discovery routes derive cleanly without stale 62-23-1 banners."""
    targets = [
        root / "apps" / "web" / "lib" / "ledger" / "public-record.ts",
        root / "apps" / "web" / "lib" / "engine" / "engine-live-bridge.ts",
        root / "apps" / "web" / "app" / "llms.txt" / "route.ts",
        root / "apps" / "web" / "app" / "llms-full.txt" / "route.ts",
    ]
    missing = [str(p.relative_to(root)) for p in targets if not p.is_file()]
    if missing:
        return ConsistencyCheckResult(
            "ledger_single_source_parity",
            False,
            f"Missing files: {missing}",
        )

    pr_src = _read_text(targets[0])
    if "verified-ledger-view" not in pr_src:
        return ConsistencyCheckResult(
            "ledger_single_source_parity",
            False,
            "public-record.ts must derive from verified-ledger-view",
        )

    offenders = [str(p.relative_to(root)) for p in targets if "62-23-1" in _read_text(p)]
    if offenders:
        return ConsistencyCheckResult(
            "ledger_single_source_parity",
            False,
            f"Stale 62-23-1 reference found in {offenders}",
        )

    return ConsistencyCheckResult(
        "ledger_single_source_parity",
        True,
        "All 4 ledger/discovery surfaces derive cleanly without stale 62-23-1 banner",
    )


def check_no_legacy_entity_placeholders(root: Path) -> ConsistencyCheckResult:
    """Verify no legacy placeholder company names linger across active directories."""
    scan_roots = [
        root / "apps" / "web",
        root / "packages",
        root / "src",
        root / "docs" / "ops",
    ]
    skip_dirs = {"node_modules", ".next", "__pycache__", ".venv", "dist", "build"}
    banned_phrases = ("Golden Ratio Technologies", "Golden State Insights")
    hits: list[str] = []

    for base in scan_roots:
        if not base.exists():
            continue
        for p in base.rglob("*"):
            if not p.is_file():
                continue
            if any(part in skip_dirs for part in p.parts):
                continue
            if p.suffix.lower() not in {".ts", ".tsx", ".py", ".md", ".json", ".mjs", ".js"}:
                continue
            txt = _read_text(p)
            for phrase in banned_phrases:
                if phrase in txt:
                    hits.append(f"{p.relative_to(root).as_posix()}:{phrase}")

    if hits:
        return ConsistencyCheckResult(
            "no_legacy_entity_placeholders",
            False,
            f"Legacy entity placeholders found: {hits[:10]}",
        )
    return ConsistencyCheckResult(
        "no_legacy_entity_placeholders",
        True,
        "Zero Golden Ratio / Golden State placeholders across apps/web, packages, src, docs/ops",
    )


def check_public_copy_boundary(root: Path) -> ConsistencyCheckResult:
    """Confirm customer pages omit banned internal simulation/matrix jargon."""
    pages = [
        root / "apps" / "web" / "app" / "packages" / "page.tsx",
        root / "apps" / "web" / "app" / "pricing" / "page.tsx",
        root / "apps" / "web" / "app" / "dfs" / "page.tsx",
        root / "apps" / "web" / "app" / "props" / "page.tsx",
        root / "apps" / "web" / "app" / "record" / "page.tsx",
    ]
    banned = ("22,750,000 snap", "10,000 worlds", "Sinkhorn", "Cholesky")
    hits: list[str] = []
    for p in pages:
        if not p.is_file():
            hits.append(f"missing:{p.relative_to(root).as_posix()}")
            continue
        low = _read_text(p).lower()
        for phrase in banned:
            if phrase.lower() in low:
                hits.append(f"{p.relative_to(root).as_posix()}:{phrase}")
    if hits:
        return ConsistencyCheckResult(
            "public_copy_boundary",
            False,
            f"Internal math jargon on public page(s): {hits}",
        )
    return ConsistencyCheckResult(
        "public_copy_boundary",
        True,
        "5/5 core public pages free of internal simulation/math jargon",
    )


def check_hard_safety_gates_fail_closed(root: Path) -> ConsistencyCheckResult:
    """Pin fail-closed PUBLIC_PICKS_ENABLED and zero live-stake autonomous defaults."""
    cfg = root / "packages" / "prediction-engine" / "src" / "platform-config.ts"
    fabric = root / ".github" / "workflows" / "gse-site-wide-autonomous-fabric.yml"
    if not cfg.is_file() or not fabric.is_file():
        return ConsistencyCheckResult(
            "hard_safety_gates_fail_closed",
            False,
            "Missing platform-config.ts or autonomous-fabric workflow",
        )

    cfg_txt = _read_text(cfg)
    matched_line = [
        ln
        for ln in cfg_txt.splitlines()
        if 'process.env["PUBLIC_PICKS_ENABLED"]' in ln and "parseBool(" in ln
    ]
    if not matched_line or "false" not in matched_line[0]:
        return ConsistencyCheckResult(
            "hard_safety_gates_fail_closed",
            False,
            f"PUBLIC_PICKS_ENABLED default not false: {matched_line}",
        )

    fabric_yaml = yaml.safe_load(_read_text(fabric))
    env = fabric_yaml.get("jobs", {}).get("run-autonomous-fabric", {}).get("env", {})
    expected = {
        "PUBLIC_PICKS_ENABLED": "false",
        "LIVE_STAKE_FRACTION": "0.0",
        "REAL_MONEY_STAKE_CLEARED": "false",
        "DRAFT_ONLY_MODE": "true",
    }
    bad = {k: env.get(k) for k, v in expected.items() if str(env.get(k)).lower() != v}
    if bad:
        return ConsistencyCheckResult(
            "hard_safety_gates_fail_closed",
            False,
            f"Autonomous fabric safety env drift: {bad}",
        )
    return ConsistencyCheckResult(
        "hard_safety_gates_fail_closed",
        True,
        "platform-config PUBLIC_PICKS_ENABLED=false and autonomous-fabric safety env locked",
    )


def check_workflows_valid_and_no_stub_bounds(root: Path) -> ConsistencyCheckResult:
    """Validate all GitHub workflow YAMLs and ensure gsi-frontier-bounds is non-stub."""
    wf_dir = root / ".github" / "workflows"
    files = sorted(wf_dir.glob("*.yml")) + sorted(wf_dir.glob("*.yaml"))
    if not files:
        return ConsistencyCheckResult(
            "workflows_valid_and_no_stub_bounds",
            False,
            "No workflow YAML files found",
        )

    for wf in files:
        try:
            yaml.safe_load(_read_text(wf))
        except yaml.YAMLError as exc:
            return ConsistencyCheckResult(
                "workflows_valid_and_no_stub_bounds",
                False,
                f"Invalid YAML in {wf.name}: {exc}",
            )

    bounds_txt = _read_text(wf_dir / "gsi-frontier-bounds.yml")
    if "print('Verifying" in bounds_txt or 'print("Verifying' in bounds_txt:
        return ConsistencyCheckResult(
            "workflows_valid_and_no_stub_bounds",
            False,
            "gsi-frontier-bounds.yml still contains print('Verifying...') stub steps",
        )
    has_bench = "run_gsi_upte_reproducible_benchmark.py" in bounds_txt
    has_audit = "verify_ecosystem_consistency.py" in bounds_txt
    if not has_bench or not has_audit:
        return ConsistencyCheckResult(
            "workflows_valid_and_no_stub_bounds",
            False,
            "gsi-frontier-bounds.yml must run benchmark runner and consistency auditor",
        )

    return ConsistencyCheckResult(
        "workflows_valid_and_no_stub_bounds",
        True,
        f"All {len(files)} workflow YAMLs valid; gsi-frontier-bounds executes real checks",
    )


def run_ecosystem_consistency_audit(repo_root: Path | None = None) -> dict[str, Any]:
    """Execute all 5 structural consistency probes and build signed summary payload."""
    root = repo_root if repo_root is not None else _repo_root()
    checks = [
        check_ledger_single_source_parity(root),
        check_no_legacy_entity_placeholders(root),
        check_public_copy_boundary(root),
        check_hard_safety_gates_fail_closed(root),
        check_workflows_valid_and_no_stub_bounds(root),
    ]
    all_passed = all(c.passed for c in checks)
    payload: dict[str, Any] = {
        "schema": "gse_gsi.ecosystem_consistency_receipt.v1",
        "overall_passed": all_passed,
        "checks_passed": sum(1 for c in checks if c.passed),
        "checks_total": len(checks),
        "checks": [
            {"name": c.name, "passed": c.passed, "detail": c.detail} for c in checks
        ],
    }
    payload["receipt_sha256"] = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return payload


def main(argv: list[str] | None = None) -> int:
    """CLI entrypoint to write and/or validate the ecosystem consistency receipt."""
    parser = argparse.ArgumentParser(
        description="Verify GSE/GSI ecosystem structure and safety consistency.",
    )
    parser.add_argument(
        "--write-receipt",
        action="store_true",
        help="Write receipt JSON to data/eval.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero on any failed check.",
    )
    args = parser.parse_args(argv)

    root = _repo_root()
    report = run_ecosystem_consistency_audit(root)
    receipt_path = root / "data" / "eval" / "ecosystem_consistency_receipt_2026_11_19.json"

    if args.write_receipt:
        receipt_path.parent.mkdir(parents=True, exist_ok=True)
        receipt_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"[ECOSYSTEM CONSISTENCY] Wrote {receipt_path}")

    for chk in report["checks"]:
        status = "PASS" if chk["passed"] else "FAIL"
        print(f"  [{status}] {chk['name']}: {chk['detail']}")

    if args.check and not report["overall_passed"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

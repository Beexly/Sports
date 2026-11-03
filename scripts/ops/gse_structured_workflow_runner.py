"""GSE standard-operating six-seat workflow runner.

Seats (contract: GSE-STANDARD-OPERATING-WORKFLOW-CONTRACT.md)
  0  cleanup_and_doctor        cleanup first, then doctor invariants
  1  ingest_and_provenance     6 Nov-2/3 downloads indexed in the ingestion manifest
  2  vision_and_simulation     replay-page catalogue + Weeks 1-8 replay trainer
  3  equations_and_situational out-of-sample calibration gate (--enforce-gate)
  4  market_and_dfs_gate       Week 9 dual-slate DFS packets
  5  audit_and_voice_briefing  spoken digest + pytest

Contract semantics
  * Seat 0 cleans BEFORE it doctors: free space under 6 GB is a trigger to clean,
    not an abort. Stale worktrees are pruned only when `git status --porcelain` is
    empty AND HEAD is an ancestor of origin/main or the working branch.
  * Every seat returns {seat, name, status: PASS|FAIL|SKIP|ERROR, passed, checks,
    details, elapsed_s}. A checkpoint JSON is rewritten after each seat.
  * The process exits 0 when the run completes; seat failures are data, not a
    crash. A seat that raises is recorded as ERROR and the run continues.
  * --dry-run performs every read-only check and skips every subprocess.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNS_DIR = ROOT / "data" / "engine" / "workflow_runs"
LEDGER = ROOT / "data" / "engine" / "new_engine_official_ledger_2026.json"
MANIFEST = ROOT / "data" / "engine" / "INGESTION-MANIFEST-2026-11-02.json"
DOWNLOADS = Path("C:/Users/Garrett/Downloads")
WORKTREE_ROOT = Path("C:/c")

FREE_SPACE_TRIGGER_GB = 6.0
WORKING_BRANCH = "hermes/week8-forensic-tracks-1-3"
PROTECTED_WORKTREE = "wt-week8-forensic"

LEDGER_VERIFIED_RECORD = "36-13-1"
LEDGER_VERIFIED_UNITS = "+20.14u"
LEDGER_SECONDARY_KEY = "pre_oct29_4_2_continuity_plus_week8_22_7_1"
LEDGER_SECONDARY_RECORD = "38-13-1"

SEAT1_TARGETS = [
    "DKSalaries (2).csv",
    "DKSalaries (3).csv",
    "2026-11-02-PM.md",
    "2026-11-02-PM (1).md",
    "2026-11-03-AM.md",
    "FUNDING-MASTER-2026-11-03.md",
]
STALE_WORKTREES = [
    "wt-ci-fix", "wt-ledger", "wt-not-for-sale",
    "wt-tree-red", "wt-week8-fail-remediation",
]


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def _run(cmd, timeout=600, cwd=ROOT, env=None) -> dict:
    started = time.time()
    try:
        proc = subprocess.run(
            cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, env=env
        )
        return {
            "cmd": cmd if isinstance(cmd, str) else " ".join(map(str, cmd)),
            "returncode": proc.returncode,
            "stdout_tail": (proc.stdout or "")[-3000:],
            "stderr_tail": (proc.stderr or "")[-1500:],
            "elapsed_s": round(time.time() - started, 2),
        }
    except subprocess.TimeoutExpired:
        return {"cmd": cmd, "returncode": None, "error": f"timeout after {timeout}s",
                "elapsed_s": round(time.time() - started, 2)}
    except Exception as exc:  # noqa: BLE001
        return {"cmd": cmd, "returncode": None, "error": f"{type(exc).__name__}: {exc}",
                "elapsed_s": round(time.time() - started, 2)}


def _rel(path: Path) -> str:
    try:
        return str(Path(path).relative_to(ROOT))
    except ValueError:
        return str(path)


def _seat(seat: int, name: str, checks: dict, details: dict, started: float) -> dict:
    passed = all(bool(v) for v in checks.values()) if checks else False
    return {
        "seat": seat,
        "name": name,
        "status": "PASS" if passed else "FAIL",
        "passed": passed,
        "checks": checks,
        "details": details,
        "elapsed_s": round(time.time() - started, 2),
    }


def _skipped(seat: int, name: str, reason: str, started: float) -> dict:
    return {
        "seat": seat,
        "name": name,
        "status": "SKIP",
        "passed": True,
        "checks": {},
        "details": {"reason": reason},
        "elapsed_s": round(time.time() - started, 2),
    }


# ---------------------------------------------------------------------------
# seat 0 — cleanup then doctor
# ---------------------------------------------------------------------------
def _free_gb() -> float:
    return shutil.disk_usage("C:/").free / 1e9


def _cleanup_npm(dry_run: bool) -> dict:
    cache = Path(os.environ.get("LOCALAPPDATA", "")) / "npm-cache"
    info = {"path": str(cache), "exists": cache.exists()}
    if not cache.exists():
        info["action"] = "no_cache"
        return info
    try:
        info["size_gb"] = round(
            sum(p.stat().st_size for p in cache.rglob("*") if p.is_file()) / 1e9, 2
        )
    except Exception:
        info["size_gb"] = None
    if dry_run:
        info["action"] = "would_clean"
        return info
    npm = shutil.which("npm.cmd") or shutil.which("npm") or shutil.which("npm.bat")
    if not npm:
        info["action"] = "npm_not_found"
        return info
    info["run"] = _run([npm, "cache", "clean", "--force"], timeout=240)
    info["action"] = "cleaned" if info["run"].get("returncode") == 0 else "clean_failed"
    return info


def _prune_worktrees(dry_run: bool) -> list[dict]:
    results = []
    for name in STALE_WORKTREES:
        wt = WORKTREE_ROOT / name
        row = {"worktree": str(wt), "exists": wt.exists()}
        if not wt.exists():
            results.append(row)
            continue
        status = _run(["git", "-C", str(wt), "status", "--porcelain"], timeout=120)
        row["dirty"] = bool((status.get("stdout_tail") or "").strip())
        row["clean"] = not row["dirty"]
        if row["dirty"]:
            row["action"] = "kept_dirty"
            results.append(row)
            continue
        merged = False
        for ref in ("origin/main", WORKING_BRANCH):
            anc = _run(["git", "-C", str(wt), "merge-base", "--is-ancestor", "HEAD", ref], timeout=120)
            if anc.get("returncode") == 0:
                merged = True
                row["ancestor_of"] = ref
                break
        row["merged"] = merged
        if not merged:
            row["action"] = "kept_unmerged"
            results.append(row)
            continue
        if dry_run:
            row["action"] = "would_remove"
            results.append(row)
            continue
        row["remove"] = _run(["git", "-C", str(ROOT), "worktree", "remove", str(wt)], timeout=300)
        row["action"] = "removed" if row["remove"].get("returncode") == 0 else "remove_failed"
        results.append(row)
    return results


def seat0_cleanup_and_doctor(dry_run: bool = False) -> dict:
    started = time.time()
    free_before = _free_gb()
    details = {
        "free_gb_before": round(free_before, 2),
        "trigger_gb": FREE_SPACE_TRIGGER_GB,
        "cleanup_triggered": free_before < FREE_SPACE_TRIGGER_GB,
        "npm": None,
        "worktrees": [],
    }
    if details["cleanup_triggered"]:
        details["npm"] = _cleanup_npm(dry_run)
        details["worktrees"] = _prune_worktrees(dry_run)
    details["free_gb_after"] = round(_free_gb(), 2)

    head = _run(["git", "rev-parse", "--short", "HEAD"], timeout=60)
    branch = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"], timeout=60)
    details["git"] = {
        "head": (head.get("stdout_tail") or "").strip(),
        "branch": (branch.get("stdout_tail") or "").strip(),
        "reachable": head.get("returncode") == 0,
    }

    ledger = {"path": _rel(LEDGER), "exists": LEDGER.exists()}
    if LEDGER.exists():
        data = json.loads(LEDGER.read_text(encoding="utf-8"))
        vr = data.get("verified_record") or {}
        secondary = data.get("secondary_views") or {}
        entry = secondary.get(LEDGER_SECONDARY_KEY) if isinstance(secondary, dict) else None
        if entry is None and isinstance(secondary, list):
            for view in secondary:
                if isinstance(view, dict) and view.get("record") == LEDGER_SECONDARY_RECORD:
                    entry = view
                    break
        ledger.update({
            "verified_record": vr.get("record"),
            "verified_net_units": vr.get("net_units"),
            "verified_record_ok": vr.get("record") == LEDGER_VERIFIED_RECORD,
            "verified_units_ok": vr.get("net_units") == LEDGER_VERIFIED_UNITS,
            "secondary_key": LEDGER_SECONDARY_KEY,
            "secondary_key_present": LEDGER_SECONDARY_KEY in secondary
            if isinstance(secondary, dict) else False,
            "secondary_record": (entry or {}).get("record"),
            "secondary_record_ok": (entry or {}).get("record") == LEDGER_SECONDARY_RECORD,
        })
    details["ledger"] = ledger

    env_path = ROOT / ".env"
    present = set()
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                present.add(line.split("=", 1)[0].strip())
    details["env"] = {
        "env_file": "PRESENT" if env_path.exists() else "MISSING",
        "OPENROUTER_API_KEY": "SET" if "OPENROUTER_API_KEY" in present else "MISSING",
        "DATABASE_URL": "SET" if "DATABASE_URL" in present else "MISSING",
    }

    checks = {
        "git_head_reachable": details["git"]["reachable"],
        "ledger_verified_record": ledger.get("verified_record_ok", False),
        "ledger_verified_units": ledger.get("verified_units_ok", False),
        "ledger_secondary_record": ledger.get("secondary_record_ok", False),
        "free_space_positive": details["free_gb_after"] > 0.5,
    }
    return _seat(0, "cleanup_and_doctor", checks, details, started)


# ---------------------------------------------------------------------------
# seat 1 — ingest and provenance
# ---------------------------------------------------------------------------
def seat1_ingest_and_provenance(dry_run: bool = False) -> dict:
    started = time.time()
    indexed = set()
    manifest_note = None
    if MANIFEST.exists():
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        files = data.get("files") or data.get("entries") or []
        for f in files:
            name = f.get("rel_path") or f.get("name") or f.get("path")
            if name:
                indexed.add(Path(str(name)).name)
        manifest_note = {
            "path": _rel(MANIFEST),
            "files": len(indexed),
            "total_files": data.get("total_files"),
            "generated_at": data.get("generated_at"),
        }
    rows = []
    for name in SEAT1_TARGETS:
        on_disk = (DOWNLOADS / name).exists()
        rows.append({"file": name, "on_disk": on_disk, "indexed": name in indexed})
    missing_disk = [r["file"] for r in rows if not r["on_disk"]]
    not_indexed = [r["file"] for r in rows if not r["indexed"]]
    checks = {
        "manifest_exists": MANIFEST.exists(),
        "all_on_disk": not missing_disk,
        "all_indexed": not not_indexed,
    }
    details = {
        "manifest": manifest_note,
        "targets": rows,
        "missing_on_disk": missing_disk,
        "not_indexed": not_indexed,
        "remediation": (
            "python scripts/ingest/build_downloads_manifest.py" if not_indexed else None
        ),
    }
    return _seat(1, "ingest_and_provenance", checks, details, started)


# ---------------------------------------------------------------------------
# seat 2 — vision catalogue and replay trainer
# ---------------------------------------------------------------------------
def seat2_vision_and_simulation(dry_run: bool = False, epochs: int = 5) -> dict:
    started = time.time()
    catalog = ROOT / "intelligence" / "vision" / "data" / "nfl_video_2026_catalog.json"
    harvester = ROOT / "intelligence" / "vision" / "nfl_video_2026_harvester.py"
    trainer = ROOT / "scripts" / "ops" / "replay_weeks_1_to_8_trainer.py"
    details = {
        "harvester": _rel(harvester),
        "trainer": _rel(trainer),
        "catalog_exists_before": catalog.exists(),
    }
    if dry_run:
        return _skipped(2, "vision_and_simulation", "dry-run", started)
    env = dict(os.environ)
    env.update({"CUDA_VISIBLE_DEVICES": "", "OMP_NUM_THREADS": "4", "MKL_NUM_THREADS": "4"})
    details["crawl"] = _run([sys.executable, str(harvester), "--pages", "2"], timeout=600, env=env)
    details["trainer_run"] = _run([sys.executable, str(trainer), "--epochs", str(epochs)], timeout=900, env=env)
    details["catalog_exists_after"] = catalog.exists()
    checks = {
        "crawl_exit_zero": details["crawl"].get("returncode") == 0,
        "trainer_exit_zero": details["trainer_run"].get("returncode") == 0,
        "catalog_written": details["catalog_exists_after"],
    }
    return _seat(2, "vision_and_simulation", checks, details, started)


# ---------------------------------------------------------------------------
# seat 3 — equations and situational calibration gate
# ---------------------------------------------------------------------------
def seat3_equations_and_situational(dry_run: bool = False, enforce: bool = True) -> dict:
    started = time.time()
    script = ROOT / "tests" / "verify_out_of_sample_calibration.py"
    details = {"script": _rel(script), "exists": script.exists(), "enforce_gate": enforce}
    if not script.exists():
        return _skipped(3, "equations_and_situational", "calibration script missing", started)
    if dry_run:
        return _skipped(3, "equations_and_situational", "dry-run", started)
    cmd = [sys.executable, str(script)] + (["--enforce-gate"] if enforce else [])
    details["run"] = _run(cmd, timeout=1200)
    checks = {"gate_exit_zero": details["run"].get("returncode") == 0}
    return _seat(3, "equations_and_situational", checks, details, started)


# ---------------------------------------------------------------------------
# seat 4 — market and DFS gate
# ---------------------------------------------------------------------------
def seat4_market_and_dfs_gate(dry_run: bool = False, lineups: int = 2,
                              sims: int = 120, opponents: int = 60) -> dict:
    started = time.time()
    script = ROOT / "scripts" / "dfs" / "build_week9_dual_slate_dfs_packets.py"
    details = {
        "script": _rel(script),
        "exists": script.exists(),
        "params": {"lineups": lineups, "sims": sims, "opponents": opponents},
    }
    if not script.exists():
        return _skipped(4, "market_and_dfs_gate", "DFS builder missing", started)
    if dry_run:
        return _skipped(4, "market_and_dfs_gate", "dry-run", started)
    details["run"] = _run(
        [sys.executable, str(script), "--lineups", str(lineups),
         "--sims", str(sims), "--opponents", str(opponents)],
        timeout=1800,
    )
    packets_dir = ROOT / "data" / "dfs"
    packets = sorted(p.name for p in packets_dir.glob("*_packet_2026_11_03.json")) if packets_dir.exists() else []
    details["packets"] = packets
    checks = {"builder_exit_zero": details["run"].get("returncode") == 0, "packets_written": bool(packets)}
    return _seat(4, "market_and_dfs_gate", checks, details, started)


# ---------------------------------------------------------------------------
# seat 5 — audit and voice briefing
# ---------------------------------------------------------------------------
def seat5_audit_and_voice_briefing(dry_run: bool = False, speak: bool = False) -> dict:
    started = time.time()
    digest_mod = "intelligence.voice_brain.morning_digest"
    details = {"digest_module": digest_mod}
    if dry_run:
        return _skipped(5, "audit_and_voice_briefing", "dry-run", started)
    cmd = [sys.executable, "-m", digest_mod, "--json"]
    if speak:
        cmd.append("--speak")
    details["digest"] = _run(cmd, timeout=300)
    details["pytest"] = _run([sys.executable, "-m", "pytest", "tests", "-q"], timeout=1800)
    tail = (details["pytest"].get("stdout_tail") or "").strip().splitlines()
    details["pytest_summary"] = tail[-1] if tail else ""
    checks = {
        "digest_exit_zero": details["digest"].get("returncode") == 0,
        "pytest_exit_zero": details["pytest"].get("returncode") == 0,
    }
    return _seat(5, "audit_and_voice_briefing", checks, details, started)


SEATS = {
    0: seat0_cleanup_and_doctor,
    1: seat1_ingest_and_provenance,
    2: seat2_vision_and_simulation,
    3: seat3_equations_and_situational,
    4: seat4_market_and_dfs_gate,
    5: seat5_audit_and_voice_briefing,
}


# ---------------------------------------------------------------------------
# runner
# ---------------------------------------------------------------------------
def _checkpoint_path() -> Path:
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    return RUNS_DIR / f"run_{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}.json"


def _write(state: dict, path: Path) -> None:
    state["updated_at_utc"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    path.write_text(json.dumps(state, indent=1), encoding="utf-8")


def _last_checkpoint() -> Path | None:
    if not RUNS_DIR.exists():
        return None
    runs = sorted(RUNS_DIR.glob("run_*.json"))
    return runs[-1] if runs else None


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--run-all", action="store_true")
    ap.add_argument("--stage", type=int, default=None, help="run seats 0..N")
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--speak", action="store_true", help="speak the seat-5 digest")
    ap.add_argument("--epochs", type=int, default=5)
    args = ap.parse_args(argv)

    if args.status:
        last = _last_checkpoint()
        if not last:
            print("no workflow runs found")
            return 0
        print(last.read_text(encoding="utf-8"))
        return 0

    if not args.run_all and args.stage is None:
        ap.print_help()
        return 2

    stage = 5 if args.run_all else max(0, min(5, int(args.stage)))
    path = _checkpoint_path()
    state = {
        "run_id": path.stem,
        "started_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "dry_run": args.dry_run,
        "stage_limit": stage,
        "seats": [],
        "summary": {},
    }
    _write(state, path)
    print(f"checkpoint: {_rel(path)}")

    for idx in range(stage + 1):
        fn = SEATS[idx]
        try:
            if idx == 2:
                res = fn(dry_run=args.dry_run, epochs=args.epochs)
            elif idx == 5:
                res = fn(dry_run=args.dry_run, speak=args.speak)
            else:
                res = fn(dry_run=args.dry_run)
        except Exception as exc:  # noqa: BLE001
            res = {
                "seat": idx, "name": fn.__name__, "status": "ERROR", "passed": False,
                "checks": {}, "details": {"error": f"{type(exc).__name__}: {exc}"}, "elapsed_s": 0.0,
            }
        state["seats"].append(res)
        _write(state, path)
        print(f"seat {idx} {res['name']}: {res['status']}")

    passed = sum(1 for s in state["seats"] if s["status"] == "PASS")
    failed = [s["name"] for s in state["seats"] if s["status"] in {"FAIL", "ERROR"}]
    skipped = [s["name"] for s in state["seats"] if s["status"] == "SKIP"]
    state["summary"] = {
        "seats_run": len(state["seats"]),
        "passed": passed,
        "failed": failed,
        "skipped": skipped,
        "finished_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    _write(state, path)
    print(f"\n{passed}/{len(state['seats'])} seats PASS | failed={failed} | skipped={skipped}")
    print(f"checkpoint: {_rel(path)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

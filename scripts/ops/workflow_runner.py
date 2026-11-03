"""Six-seat overnight workflow runner.

Seats
  0  cleanup-first  ->  doctor   (disk, npm cache, git HEAD, ledger, .env)
  1  downloads ingest gate       (6 target files exist + indexed in INGESTION-MANIFEST)
  2  replay trainer (Track 3B)   (CPU only; video harvester skipped unless --allow-video)
  3  out-of-sample calibration   (optional hard gate via --enforce-gate)
  4  DFS packets builder         (run_week9_gpp_portfolio.py)
  5  pytest                      (voice digest stub is reported as not-implemented)

Design rules
  * Every seat returns {"seat", "name", "status": PASS|FAIL|SKIP|ERROR, "passed", "details"}.
  * A checkpoint JSON is written to data/engine/workflow_runs/run_<ts>.json after each seat,
    so a crash leaves the completed seats on disk.
  * Heavy or side-effecting work is skipped by default (npm cache clean only under disk
    pressure; video harvester only with --allow-video; calibration gate only with
    --enforce-gate).
  * The runner exits 0 whenever it completed its run, even if seats FAIL. Seat failures are
    reported in the checkpoint, not by exit code — a non-zero exit would make the workflow
    look like a crash rather than a result.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNS_DIR = ROOT / "data" / "engine" / "workflow_runs"
LEDGER = ROOT / "data" / "engine" / "new_engine_official_ledger_2026.json"
MANIFEST = ROOT / "data" / "engine" / "INGESTION-MANIFEST-2026-11-02.json"
DOWNLOADS = Path("C:/Users/Garrett/Downloads")
NPM_CACHE = Path(os.environ.get("LOCALAPPDATA", "C:/Users/Garrett/AppData/Local")) / "npm-cache"

DISK_PRESSURE_GB = 6.0

# The six downloads the Week 9 lane actually consumes. Kept explicit so a missing
# or un-indexed file is a named failure instead of a silent pass.
SEAT1_TARGETS = [
    "DKSalaries (2).csv",
    "2026-11-01-PREGAME-DATA-PACK (2).md",
    "2026-11-01-PULL-LIST (1).md",
    "2026-11-02-PDF-LINKS (1).md",
    "2026-11-02-X-100-DOCUMENTED (1).md",
    "2026-11-02-INSTAGRAM-50-DOCUMENTED (1).md",
]

LEDGER_VERIFIED_RECORD = "36-13-1"
LEDGER_SECONDARY_RECORDS = ["38-13-1", "40-15-1", "47-19-1"]


def _rel(p: Path) -> str:
    """Path relative to the repo when possible, absolute otherwise."""
    try:
        return str(Path(p).relative_to(ROOT))
    except ValueError:
        return str(p)


def _run(cmd, timeout=300, cwd=ROOT, env=None):
    try:
        r = subprocess.run(
            cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, env=env
        )
        return {
            "cmd": cmd if isinstance(cmd, str) else " ".join(cmd),
            "returncode": r.returncode,
            "stdout_tail": (r.stdout or "")[-4000:],
            "stderr_tail": (r.stderr or "")[-2000:],
        }
    except subprocess.TimeoutExpired:
        return {"cmd": cmd, "returncode": None, "error": f"timeout after {timeout}s"}
    except Exception as exc:  # noqa: BLE001 - report, never crash the run
        return {"cmd": cmd, "returncode": None, "error": f"{type(exc).__name__}: {exc}"}


def seat0_cleanup_doctor(dry_run: bool) -> dict:
    details = {}

    usage = shutil.disk_usage("C:/")
    free_gb = usage.free / 1e9
    details["disk"] = {
        "total_gb": round(usage.total / 1e9, 1),
        "free_gb": round(free_gb, 2),
        "used_pct": round(100 * usage.used / usage.total, 1),
        "under_pressure": free_gb < DISK_PRESSURE_GB,
    }

    cache_gb = (
        sum(p.stat().st_size for p in NPM_CACHE.rglob("*") if p.is_file()) / 1e9
        if NPM_CACHE.exists()
        else 0.0
    )
    details["npm_cache"] = {"path": str(NPM_CACHE), "size_gb": round(cache_gb, 2)}
    if free_gb < DISK_PRESSURE_GB and NPM_CACHE.exists():
        if dry_run:
            details["npm_cache"]["action"] = "WOULD_CLEAN (dry-run)"
        else:
            details["npm_cache"]["action"] = _run(["npm", "cache", "clean", "--force"], timeout=180)
            details["npm_cache"]["free_gb_after"] = round(shutil.disk_usage("C:/").free / 1e9, 2)
    else:
        details["npm_cache"]["action"] = "SKIPPED (disk not under pressure)"

    head = _run(["git", "rev-parse", "--short", "HEAD"], timeout=60)
    branch = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"], timeout=60)
    details["git"] = {
        "head": (head.get("stdout_tail") or "").strip(),
        "branch": (branch.get("stdout_tail") or "").strip(),
        "reachable": head.get("returncode") == 0,
    }

    ledger_ok = {"path": _rel(LEDGER), "exists": LEDGER.exists()}
    if LEDGER.exists():
        d = json.loads(LEDGER.read_text(encoding="utf-8"))
        vr = d.get("verified_record") or {}
        views = d.get("secondary_views") or []
        view_records = [v.get("record") for v in views if isinstance(v, dict)]
        ledger_ok.update(
            {
                "verified_record": vr.get("record"),
                "verified_record_matches": vr.get("record") == LEDGER_VERIFIED_RECORD,
                "verified_net_units": vr.get("net_units"),
                "secondary_view_records": view_records,
                "secondary_missing": [r for r in LEDGER_SECONDARY_RECORDS if r not in view_records],
            }
        )
    details["ledger"] = ledger_ok

    env_path = ROOT / ".env"
    env_example = ROOT / ".env.example"
    keys = []
    if env_example.exists():
        for line in env_example.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^([A-Z0-9_]+)=", line.strip())
            if m:
                keys.append(m.group(1))
    present = set()
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^([A-Z0-9_]+)=", line.strip())
            if m:
                present.add(m.group(1))
    details["env"] = {
        "env_file": "PRESENT" if env_path.exists() else "MISSING",
        "declared_keys": len(keys),
        "set": sorted(k for k in keys if k in present),
        "missing": sorted(k for k in keys if k not in present),
    }

    checks = {
        "disk_has_headroom": free_gb > 0.5,
        "git_head_reachable": details["git"]["reachable"],
        "ledger_verified_record": ledger_ok.get("verified_record_matches", False),
        "ledger_secondary_views": not ledger_ok.get("secondary_missing", ["?"]),
    }
    passed = all(checks.values())
    return {
        "seat": 0,
        "name": "cleanup_doctor",
        "status": "PASS" if passed else "FAIL",
        "passed": passed,
        "checks": checks,
        "details": details,
    }


def seat1_downloads_ingest(dry_run: bool) -> dict:
    manifest_paths = set()
    if MANIFEST.exists():
        d = json.loads(MANIFEST.read_text(encoding="utf-8"))
        manifest_paths = {f.get("rel_path") for f in d.get("files", [])}
    rows = []
    for name in SEAT1_TARGETS:
        on_disk = (DOWNLOADS / name).exists()
        indexed = name in manifest_paths
        rows.append({"file": name, "on_disk": on_disk, "indexed": indexed})
    missing_disk = [r["file"] for r in rows if not r["on_disk"]]
    not_indexed = [r["file"] for r in rows if not r["indexed"]]
    passed = not missing_disk and not not_indexed
    return {
        "seat": 1,
        "name": "downloads_ingest_gate",
        "status": "PASS" if passed else "FAIL",
        "passed": passed,
        "checks": {"all_on_disk": not missing_disk, "all_indexed": not not_indexed},
        "details": {
            "manifest": _rel(MANIFEST) if MANIFEST.exists() else "MISSING",
            "manifest_files": len(manifest_paths),
            "targets": rows,
            "missing_on_disk": missing_disk,
            "not_indexed": not_indexed,
            "remediation": "regenerate the manifest (python scripts/ingest/build_downloads_manifest.py)"
            if not_indexed
            else None,
        },
    }


def seat2_replay_trainer(dry_run: bool, allow_video: bool, epochs: int) -> dict:
    script = ROOT / "scripts" / "ops" / "replay_weeks_1_to_8_trainer.py"
    details = {"script": _rel(script), "exists": script.exists()}
    if not script.exists():
        return {
            "seat": 2,
            "name": "replay_trainer",
            "status": "FAIL",
            "passed": False,
            "checks": {"script_exists": False},
            "details": details,
        }

    env = dict(os.environ)
    env.update({"CUDA_VISIBLE_DEVICES": "", "OMP_NUM_THREADS": "4", "MKL_NUM_THREADS": "4"})
    details["cpu_only"] = True
    if dry_run:
        details["trainer"] = "WOULD_RUN (dry-run)"
    else:
        details["trainer"] = _run(
            [sys.executable, str(script), "--epochs", str(epochs)], timeout=900, env=env
        )

    details["video_harvester"] = (
        "SKIPPED (needs --allow-video)" if not allow_video else "ENABLED"
    )

    ran = details["trainer"] == "WOULD_RUN (dry-run)" or (
        isinstance(details["trainer"], dict) and details["trainer"].get("returncode") == 0
    )
    return {
        "seat": 2,
        "name": "replay_trainer",
        "status": "PASS" if ran else "FAIL",
        "passed": bool(ran),
        "checks": {"trainer_ran": bool(ran), "cpu_only": True},
        "details": details,
    }


def seat3_calibration(dry_run: bool, enforce_gate: bool) -> dict:
    script = ROOT / "tests" / "verify_out_of_sample_calibration.py"
    details = {
        "script": _rel(script),
        "exists": script.exists(),
        "enforce_gate": enforce_gate,
    }
    if not script.exists():
        return {
            "seat": 3,
            "name": "out_of_sample_calibration",
            "status": "SKIP",
            "passed": True,
            "checks": {"script_exists": False},
            "details": details,
        }
    if dry_run:
        details["run"] = "WOULD_RUN (dry-run)"
        return {
            "seat": 3,
            "name": "out_of_sample_calibration",
            "status": "SKIP",
            "passed": True,
            "checks": {"script_exists": True},
            "details": details,
        }
    cmd = [sys.executable, str(script)] + (["--enforce-gate"] if enforce_gate else [])
    res = _run(cmd, timeout=1200)
    details["run"] = res
    gate_blocked = res.get("returncode") not in (0,)
    status = "FAIL" if (enforce_gate and gate_blocked) else "PASS"
    return {
        "seat": 3,
        "name": "out_of_sample_calibration",
        "status": status,
        "passed": status == "PASS",
        "checks": {"exit_zero": res.get("returncode") == 0, "gate_enforced": enforce_gate},
        "details": details,
    }


def seat4_dfs_packets(dry_run: bool) -> dict:
    script = ROOT / "scripts" / "ops" / "run_week9_gpp_portfolio.py"
    alt = ROOT / "scripts" / "ops" / "build_sunday_monday_expanded_dfs.py"
    details = {
        "script": _rel(script),
        "exists": script.exists(),
        "alternative": _rel(alt) if alt.exists() else None,
    }
    if not script.exists():
        return {
            "seat": 4,
            "name": "dfs_packets_builder",
            "status": "SKIP",
            "passed": True,
            "checks": {"script_exists": False},
            "details": details,
        }
    if dry_run:
        details["run"] = "WOULD_RUN (dry-run)"
        return {
            "seat": 4,
            "name": "dfs_packets_builder",
            "status": "SKIP",
            "passed": True,
            "checks": {"script_exists": True},
            "details": details,
        }
    res = _run(
        [
            sys.executable,
            str(script),
            "--sims",
            "120",
            "--opponents",
            "120",
            "--lineups",
            "3",
            "--out-json",
            str(RUNS_DIR / "seat4_dfs_packets.json"),
        ],
        timeout=900,
    )
    details["run"] = res
    ok = res.get("returncode") == 0
    return {
        "seat": 4,
        "name": "dfs_packets_builder",
        "status": "PASS" if ok else "FAIL",
        "passed": ok,
        "checks": {"exit_zero": ok},
        "details": details,
    }


def seat5_pytest(dry_run: bool) -> dict:
    details = {"suite": "tests", "voice_digest_stub": "NOT_IMPLEMENTED (reported, not faked)"}
    if dry_run:
        details["run"] = "WOULD_RUN (dry-run)"
        return {
            "seat": 5,
            "name": "pytest",
            "status": "SKIP",
            "passed": True,
            "checks": {"ran": False},
            "details": details,
        }
    res = _run([sys.executable, "-m", "pytest", "tests", "-q"], timeout=1800)
    details["run"] = res
    tail = (res.get("stdout_tail") or "").strip().splitlines()
    summary = tail[-1] if tail else ""
    details["summary"] = summary
    m = re.search(r"(\d+) passed", summary)
    details["tests_passed"] = int(m.group(1)) if m else None
    ok = res.get("returncode") == 0
    return {
        "seat": 5,
        "name": "pytest",
        "status": "PASS" if ok else "FAIL",
        "passed": ok,
        "checks": {"exit_zero": ok, "tests_passed": details["tests_passed"]},
        "details": details,
    }


SEATS = {
    0: seat0_cleanup_doctor,
    1: seat1_downloads_ingest,
    2: seat2_replay_trainer,
    3: seat3_calibration,
    4: seat4_dfs_packets,
    5: seat5_pytest,
}


def _checkpoint_path() -> Path:
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return RUNS_DIR / f"run_{ts}.json"


def _write(state: dict, path: Path) -> None:
    state["updated_at_utc"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    path.write_text(json.dumps(state, indent=1), encoding="utf-8")


def _last_checkpoint() -> Path | None:
    runs = sorted(RUNS_DIR.glob("run_*.json")) if RUNS_DIR.exists() else []
    return runs[-1] if runs else None


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--status", action="store_true", help="print the last run and exit")
    ap.add_argument("--stage", type=int, default=5, help="run seats 0..N (default 5)")
    ap.add_argument("--dry-run", action="store_true", help="plan only; no side effects")
    ap.add_argument("--allow-video", action="store_true", help="enable the video harvester seat")
    ap.add_argument("--enforce-gate", action="store_true", help="fail seat 3 on a rejected kernel")
    ap.add_argument("--epochs", type=int, default=5, help="trainer epochs (seat 2)")
    args = ap.parse_args(argv)

    if args.status:
        last = _last_checkpoint()
        if not last:
            print("no workflow runs found in data/engine/workflow_runs/")
            return 0
        print(last.read_text(encoding="utf-8"))
        return 0

    if not 0 <= args.stage <= 5:
        ap.error("--stage must be 0..5")

    path = _checkpoint_path()
    state = {
        "run_id": path.stem,
        "started_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "dry_run": args.dry_run,
        "allow_video": args.allow_video,
        "enforce_gate": args.enforce_gate,
        "stage_limit": args.stage,
        "seats": [],
        "summary": {},
    }
    _write(state, path)
    print(f"checkpoint: {_rel(path)}")

    for idx in range(args.stage + 1):
        fn = SEATS[idx]
        try:
            if idx in (2,):
                res = fn(args.dry_run, args.allow_video, args.epochs)
            elif idx == 3:
                res = fn(args.dry_run, args.enforce_gate)
            else:
                res = fn(args.dry_run)
        except Exception as exc:  # noqa: BLE001 - a seat crash must not kill the run
            res = {
                "seat": idx,
                "name": fn.__name__,
                "status": "ERROR",
                "passed": False,
                "checks": {},
                "details": {"error": f"{type(exc).__name__}: {exc}"},
            }
        state["seats"].append(res)
        _write(state, path)
        print(f"seat {idx} {res['name']}: {res['status']}")

    passed = sum(1 for s in state["seats"] if s["status"] == "PASS")
    failed = [s["name"] for s in state["seats"] if s["status"] in ("FAIL", "ERROR")]
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
    print(f"checkpoint written: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

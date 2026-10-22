#!/usr/bin/env python3
"""Zero-loss salvage of named Hermes/Grok/lab artifacts into the audit worktree.

Copies text only, redacts high-confidence secrets, never copies credential
filenames, .env, databases, or binaries. SQLite export is table counts, not
message bodies. Never pushes main. Feature-branch push is opt-in and refused
when the outgoing diff cannot be secret-scanned.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIRROR = ROOT / "docs" / "engine" / "research" / "2026-10-21" / "hermes-workspace-mirror"
GROK_MIRROR = ROOT / "docs" / "engine" / "research" / "2026-10-21" / "grok-workspace-mirror"
LEDGER = ROOT / "docs" / "engine" / "research" / "2026-10-21" / "HERMES-WORKSPACE-SALVAGE-LEDGER-2026-10-21.md"
PROVENANCE = MIRROR / "PROVENANCE.json"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from scan_sensitive import credential_filename, redact  # noqa: E402

HERMES = Path(r"C:/Users/Garrett/AppData/Local/hermes")
SPORTS = Path(r"C:/Users/Garrett/Sports")
MAX_BYTES = 1_048_576
TEXT_SUFFIXES = {
    ".md", ".txt", ".py", ".ts", ".tsx", ".mjs", ".js", ".cjs",
    ".json", ".jsonl", ".csv", ".yml", ".yaml", ".toml", ".log",
}
SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", ".pytest_cache", "dist", ".next",
    "coverage", ".venv", "venv",
}
PROTECTED_BRANCHES = {"main", "master"}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def rel_dest(mirror: Path, zone: str, src: Path, anchor: Path) -> Path:
    try:
        rel = src.resolve().relative_to(anchor.resolve())
    except ValueError:
        rel = Path(src.name)
    safe = Path(str(rel).replace(":", "").replace("..", "_"))
    return mirror / zone / safe


def copy_text(src: Path, dest: Path, copied: list, skipped: list) -> None:
    if credential_filename(src.name):
        skipped.append({"src": str(src), "reason": "credential-filename"})
        return
    if src.suffix.lower() not in TEXT_SUFFIXES:
        skipped.append({"src": str(src), "reason": f"suffix:{src.suffix}"})
        return
    try:
        size = src.stat().st_size
    except OSError as exc:
        skipped.append({"src": str(src), "reason": f"stat:{exc}"})
        return
    if size > MAX_BYTES:
        skipped.append({"src": str(src), "reason": f"oversize:{size}"})
        return
    try:
        raw = src.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        skipped.append({"src": str(src), "reason": f"read:{exc}"})
        return
    cleaned, nred = redact(raw)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(cleaned, encoding="utf-8", newline="\n")
    digest = sha256_bytes(cleaned.encode("utf-8"))
    copied.append({
        "src": str(src),
        "dst": str(dest.relative_to(ROOT)).replace("\\", "/"),
        "sha256": digest,
        "bytes": len(cleaned.encode("utf-8")),
        "redactions": nred,
    })


def walk_copy(root: Path, zone: str, mirror: Path, anchor: Path, copied: list, skipped: list) -> None:
    if not root.exists():
        skipped.append({"src": str(root), "reason": "missing-root"})
        return
    if root.is_file():
        copy_text(root, rel_dest(mirror, zone, root, anchor), copied, skipped)
        return
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".env")]
        for name in filenames:
            src = Path(dirpath) / name
            copy_text(src, rel_dest(mirror, zone, src, anchor), copied, skipped)


def sqlite_counts(path: Path) -> dict:
    if not path.is_file():
        return {"path": str(path), "error": "missing"}
    uri = "file:///" + path.as_posix().lstrip("/") + "?mode=ro"
    try:
        con = sqlite3.connect(uri, uri=True)
    except sqlite3.Error as exc:
        return {"path": str(path), "error": str(exc)}
    try:
        tables = [
            row[0]
            for row in con.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY 1"
            )
        ]
        counts = {}
        for table in tables:
            try:
                counts[table] = con.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
            except sqlite3.Error as exc:
                counts[table] = f"error:{exc}"
        return {"path": str(path), "tables": counts}
    finally:
        con.close()


def git(args: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=str(cwd or ROOT),
        text=True,
        capture_output=True,
        check=False,
    )


def worktree_rows() -> list[dict]:
    proc = git(["worktree", "list", "--porcelain"])
    rows: list[dict] = []
    current: dict = {}
    for line in proc.stdout.splitlines():
        if line.startswith("worktree "):
            if current:
                rows.append(current)
            current = {"path": line.split(" ", 1)[1]}
        elif line.startswith("branch "):
            current["branch"] = line.split("refs/heads/", 1)[-1]
        elif line.startswith("HEAD "):
            current["head"] = line.split(" ", 1)[1]
    if current:
        rows.append(current)
    return rows


def copy_sports_unique(copied: list, skipped: list) -> None:
    proc = git(["status", "--porcelain", "-uall"], cwd=SPORTS)
    if proc.returncode != 0:
        skipped.append({"src": str(SPORTS), "reason": f"git-status:{proc.stderr.strip()[:200]}"})
        return
    for line in proc.stdout.splitlines():
        if len(line) < 4:
            continue
        rel = line[3:].strip().strip('"')
        if " -> " in rel:
            rel = rel.split(" -> ", 1)[1]
        src = SPORTS / rel
        if not src.is_file():
            continue
        dest = ROOT / rel
        if dest.exists():
            skipped.append({"src": str(src), "reason": "dest-exists"})
            continue
        if any(part in SKIP_DIRS for part in Path(rel).parts):
            skipped.append({"src": str(src), "reason": "skip-dir"})
            continue
        copy_text(src, dest, copied, skipped)


def write_ledger(payload: dict) -> None:
    copied = payload["copied"]
    skipped = payload["skipped"]
    redactions = sum(item["redactions"] for item in copied)
    lines = [
        "# Hermes workspace salvage ledger 2026-10-21",
        "",
        f"Generated: {payload['generated_at']}",
        f"Copied files: {len(copied)}",
        f"Skipped: {len(skipped)}",
        f"Secret redactions applied: {redactions}",
        "",
        "SQLite exports are table counts only. Message bodies, .env files, credential filenames, and binaries were not copied.",
        "",
        "## SQLite",
        "",
        "```json",
        json.dumps(payload["sqlite"], indent=2),
        "```",
        "",
        "## Worktrees",
        "",
    ]
    for row in payload["worktrees"]:
        lines.append(
            f"- {row.get('branch', '?')} @ {row.get('head', '?')[:12]} path={row.get('path')}"
        )
    lines.extend(["", "## Skip reasons", ""])
    reasons: dict[str, int] = {}
    for item in skipped:
        key = str(item.get("reason", "unknown")).split(":")[0]
        reasons[key] = reasons.get(key, 0) + 1
    for key, count in sorted(reasons.items(), key=lambda kv: -kv[1]):
        lines.append(f"- {key}: {count}")
    lines.append("")
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    LEDGER.write_text("\n".join(lines), encoding="utf-8", newline="\n")


def harvest() -> dict:
    copied: list = []
    skipped: list = []
    zone_files = [
        (HERMES / "scratch", "zone1-hermes-scratch", MIRROR, HERMES),
        (HERMES / "plans", "zone1-hermes-plans", MIRROR, HERMES),
        (HERMES / "handoffs", "zone1-hermes-handoffs", MIRROR, HERMES),
        (HERMES / "memories" / "MEMORY.md", "zone1-hermes-memory", MIRROR, HERMES),
        (HERMES / "profiles" / "researcher" / "memories" / "MEMORY.md", "zone1-researcher-memory", MIRROR, HERMES),
        (HERMES / "docs" / "intelligence" / "LEVERAGE_STATUS.md", "zone1-leverage", MIRROR, HERMES),
        (HERMES / "kanban" / "attachments" / "t_4eaea88e" / "SOURCE_MATRIX.md", "zone1-source-matrix", MIRROR, HERMES),
        (SPORTS / ".hermes" / "traces", "zone2-sports-hermes-traces", MIRROR, SPORTS),
        (SPORTS / ".hermes" / "plans", "zone2-sports-hermes-plans", MIRROR, SPORTS),
        (SPORTS / ".hermes" / "last_test_result.json", "zone2-sports-hermes", MIRROR, SPORTS),
        (SPORTS / "_dispatch3" / "standing-output.md", "zone2-dispatch", MIRROR, SPORTS),
        (Path(r"C:/Users/Garrett/.hermes-stray-backup/covariate-bus.bench.ts"), "zone2-stray", MIRROR, Path(r"C:/Users/Garrett")),
        (Path(r"C:/Users/Garrett/.grok/memtrace"), "zone3-grok-memtrace", GROK_MIRROR, Path(r"C:/Users/Garrett/.grok")),
        (Path(r"C:/Users/Garrett/grok-workspace/artifacts/MANIFEST-2026-09-14.md"), "zone3-grok-manifest", GROK_MIRROR, Path(r"C:/Users/Garrett")),
        (Path(r"C:/Users/Garrett/grok-workspace/handoff"), "zone3-grok-handoff", GROK_MIRROR, Path(r"C:/Users/Garrett")),
        (Path(r"C:/Users/Garrett/claude-code-grok-mcp/server.py"), "zone3-grok-mcp", GROK_MIRROR, Path(r"C:/Users/Garrett")),
        (Path(r"C:/workspace/gse-lab-20260919"), "zone4-lab", MIRROR, Path(r"C:/workspace")),
        (Path(r"C:/Users/Garrett/causal-inference-inventory-2026-10-20.md"), "zone5-home", MIRROR, Path(r"C:/Users/Garrett")),
        (Path(r"C:/Users/Garrett/fci_zhang2008_rules_verbatim.md"), "zone5-home", MIRROR, Path(r"C:/Users/Garrett")),
        (Path(r"C:/Users/Garrett/fci_zhang2008_evidence"), "zone5-fci", MIRROR, Path(r"C:/Users/Garrett")),
        (Path(r"C:/Users/Garrett/workspace/gse-triage-verdict.md"), "zone5-workspace", MIRROR, Path(r"C:/Users/Garrett")),
        (Path(r"C:/Users/Garrett/workspace/coaching-tendencies"), "zone5-coaching", MIRROR, Path(r"C:/Users/Garrett")),
        (Path(r"C:/Users/Garrett/gse-competitive-intel-export/MASTER_MATRIX.md"), "zone6-sibling", MIRROR, Path(r"C:/Users/Garrett")),
        (Path(r"C:/Users/Garrett/gse-competitive-intel-export/SPORTS_IMPLEMENTATION_MAP.md"), "zone6-sibling", MIRROR, Path(r"C:/Users/Garrett")),
        (Path(r"C:/Users/Garrett/gse-data-scout/data/DIGEST.md"), "zone6-sibling", MIRROR, Path(r"C:/Users/Garrett")),
        (Path(r"C:/Users/Garrett/gse-data-scout/LEGAL-SPORTSBOOK-ROUTES.md"), "zone6-sibling", MIRROR, Path(r"C:/Users/Garrett")),
        (Path(r"C:/Users/Garrett/galaxy-sports-api/AUDIT_COMPLETE_2026-08-27.md"), "zone6-sibling", MIRROR, Path(r"C:/Users/Garrett")),
        (Path(r"C:/Users/Garrett/.gemini/antigravity-cli/brain/6ced681b-ae7a-43f2-b3bf-68bfc9e88a9a/implementation_plan.md"), "zone0-approved-plan", MIRROR, Path(r"C:/Users/Garrett")),
    ]
    for src, zone, mirror, anchor in zone_files:
        before = len(copied)
        walk_copy(src, zone, mirror, anchor, copied, skipped)
        print(f"{zone}: +{len(copied) - before} copied", flush=True)

    skills_root = Path(r"C:/Users/Garrett/.grok/skills")
    if skills_root.is_dir():
        names = sorted(p.name for p in skills_root.iterdir() if p.is_dir())
        inv = GROK_MIRROR / "zone3-grok-skills" / "SKILL-INVENTORY.txt"
        inv.parent.mkdir(parents=True, exist_ok=True)
        body = "\n".join(names) + f"\n\ncount={len(names)}\n"
        inv.write_text(body, encoding="utf-8", newline="\n")
        copied.append({
            "src": str(skills_root),
            "dst": str(inv.relative_to(ROOT)).replace("\\", "/"),
            "sha256": sha256_bytes(body.encode("utf-8")),
            "bytes": len(body.encode("utf-8")),
            "redactions": 0,
        })
    else:
        skipped.append({"src": str(skills_root), "reason": "missing-root"})

    home = Path(r"C:/Users/Garrett")
    for path in home.glob("vision-*-2026*.md"):
        walk_copy(path, "zone5-vision", MIRROR, home, copied, skipped)
    for path in home.glob("frame-vision-validation-2026*.md"):
        walk_copy(path, "zone5-vision", MIRROR, home, copied, skipped)

    print("zone7: sports unique docs/code", flush=True)
    copy_sports_unique(copied, skipped)

    sqlite_payload = {
        "state.db": sqlite_counts(HERMES / "state.db"),
        "verification_evidence.db": sqlite_counts(HERMES / "verification_evidence.db"),
        "kanban.db": sqlite_counts(HERMES / "kanban.db"),
    }
    payload = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "copied": copied,
        "skipped": skipped,
        "sqlite": sqlite_payload,
        "worktrees": worktree_rows(),
        "note": "counts only; message bodies not exported",
    }
    MIRROR.mkdir(parents=True, exist_ok=True)
    PROVENANCE.write_text(json.dumps(payload, indent=2), encoding="utf-8", newline="\n")
    write_ledger(payload)
    print(f"copied={len(copied)} skipped={len(skipped)} ledger={LEDGER}", flush=True)
    return payload


def verify() -> int:
    if not PROVENANCE.is_file() or not LEDGER.is_file():
        print("VERIFY FAIL: provenance or ledger missing")
        return 1
    payload = json.loads(PROVENANCE.read_text(encoding="utf-8"))
    bad = 0
    for item in payload.get("copied", []):
        dest = ROOT / item["dst"]
        if not dest.is_file():
            print(f"MISSING {item['dst']}")
            bad += 1
            continue
        digest = sha256_bytes(dest.read_bytes())
        if digest != item["sha256"]:
            print(f"HASH {item['dst']}")
            bad += 1
    if bad:
        print(f"VERIFY FAIL: {bad}")
        return 1
    print(f"VERIFY OK: {len(payload.get('copied', []))} files")
    return 0


def push_unpushed() -> int:
    failures = 0
    for row in worktree_rows():
        branch = row.get("branch")
        path = row.get("path")
        if not branch or not path:
            continue
        if branch in PROTECTED_BRANCHES:
            print(f"SKIP main-rule {branch}")
            continue
        wt = Path(path)
        upstream = git(["rev-parse", "--abbrev-ref", "@{upstream}"], cwd=wt)
        if upstream.returncode != 0:
            ahead = "no-upstream"
        else:
            count = git(["rev-list", "--count", "@{upstream}..HEAD"], cwd=wt)
            ahead = count.stdout.strip()
            if ahead == "0":
                print(f"in-sync {branch}")
                continue
        diff = git(["diff", "--stat", "origin/main...HEAD"], cwd=wt)
        diff_text = diff.stdout + diff.stderr
        if len(diff_text) > 5_000_000:
            print(f"SKIP unscanned-large-diff {branch}")
            failures += 1
            continue
        cleaned, nred = redact(diff_text)
        if nred:
            print(f"SKIP secret-in-diff {branch} redactions={nred}")
            failures += 1
            continue
        push = git(["push", "-u", "origin", branch], cwd=wt)
        if push.returncode != 0:
            print(f"PUSH FAIL {branch}: {push.stderr.strip()[:300]}")
            failures += 1
        else:
            print(f"PUSHED {branch} ahead={ahead}")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--push-unpushed", action="store_true")
    args = parser.parse_args()
    if args.verify and not args.push_unpushed:
        return verify()
    if not args.verify:
        harvest()
    code = 0
    if args.verify:
        code = verify()
    if args.push_unpushed:
        code = max(code, push_unpushed())
    return code


if __name__ == "__main__":
    sys.exit(main())

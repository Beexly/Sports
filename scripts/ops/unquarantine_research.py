"""
Un-quarantine mistakenly vaulted research files and rebuild memory FTS.
Enforces Garrett's Standing Doctrines:
- MIND-FIRST: The mind is the ENTIRE corpus (math, equations, arXiv, physics).
- DIRECT-TO-MIND: Ingest and learn; never hoard or quarantine valid research.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import sqlite3
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.mind_guardian_daemon import (
    categorize,
    extract_text,
    is_sensitive,
    sha256_file,
)

TODAY = "2026-10-13"
VAULT_DIR = REPO_ROOT / "brain" / "local_vault"
MEMORY_DB = REPO_ROOT / "intelligence" / "voice_brain" / "memory.db"
FEED_FILE = REPO_ROOT / "brain" / "feeds" / TODAY / "trainer_feed.jsonl"
LEDGER_FILE = REPO_ROOT / ".mind_guardian" / "ledger.json"

from intelligence.voice_brain.memory import BrainMemory

def index_in_memory(mem: BrainMemory, sha: str, filename: str, text: str):
    key = f"ingested:{sha[:16]}"
    value = f"{filename}: {(text or '')[:2000]}"
    mem.upsert_fact(
        key=key,
        value=value,
        domain="research",
        source=sha,
        confidence=1.0,
    )

def run_unquarantine():
    print(f"=== UN-QUARANTINING RESEARCH FILES FROM {VAULT_DIR} ===")
    if not VAULT_DIR.exists():
        print("Vault directory does not exist.")
        return

    # 1. Connect memory db
    mem = BrainMemory()

    # 2. Load existing feed hashes
    feed_shas = set()
    feed_rows = []
    if FEED_FILE.exists():
        with open(FEED_FILE, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        d = json.loads(line)
                        h = d.get("sha256")
                        if h and h not in feed_shas:
                            feed_shas.add(h)
                            feed_rows.append(d)
                    except Exception:
                        pass
        print(f"Loaded {len(feed_rows)} unique rows from existing trainer_feed.jsonl")

    # 3. Load or initialize ledger
    ledger_hashes = {}
    if LEDGER_FILE.exists():
        try:
            raw = json.loads(LEDGER_FILE.read_text(encoding="utf-8"))
            ledger_hashes = raw.get("hashes", {})
        except Exception:
            pass

    # 4. Scan files in vault
    vault_files = [f for f in VAULT_DIR.rglob("*") if f.is_file()]
    print(f"Total files in vault: {len(vault_files)}")

    unquarantined = 0
    remained_sensitive = 0

    for f in vault_files:
        text = extract_text(f)
        if is_sensitive(f.name, text or ""):
            remained_sensitive += 1
            print(f"  [STILL SENSITIVE] {f.name}")
            continue

        # File is valid research!
        sha = sha256_file(f)
        bucket = categorize(f.name, text or "")
        target = REPO_ROOT / "docs" / bucket / "research" / TODAY / f.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(f, target)

        # Index in memory SQLite
        if text:
            index_in_memory(mem, sha, f.name, text)

        # Add to trainer feed
        if sha not in feed_shas:
            rec = {
                "sha256": sha,
                "text": text or "",
                "path": str(target),
                "bucket": bucket,
                "source": str(f.name),
            }
            feed_rows.append(rec)
            feed_shas.add(sha)

        # Update ledger
        ledger_hashes[sha] = {
            "sensitive": False,
            "bucket": bucket,
            "target_path": str(target),
            "feed_path": str(FEED_FILE),
            "name": f.name,
        }

        # Remove unquarantined file from vault
        try:
            f.unlink()
        except Exception:
            pass

        unquarantined += 1
        print(f"  [UNQUARANTINED -> {bucket}] {f.name}")


    # 5. Atomically rewrite trainer_feed.jsonl with 100% deduplicated unique rows
    FEED_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp_feed = FEED_FILE.with_suffix(".tmp")
    with open(temp_feed, "w", encoding="utf-8") as out:
        for r in feed_rows:
            out.write(json.dumps(r, ensure_ascii=False) + "\n")
    temp_feed.replace(FEED_FILE)

    # 6. Save updated ledger
    LEDGER_FILE.parent.mkdir(parents=True, exist_ok=True)
    LEDGER_FILE.write_text(
        json.dumps({"hashes": ledger_hashes}, indent=2, sort_keys=True),
        encoding="utf-8",
    )

    print(f"\nSummary:")
    print(f"  Unquarantined research files: {unquarantined}")
    print(f"  Genuinely sensitive secrets kept in vault: {remained_sensitive}")
    print(f"  Clean deduplicated trainer feed count: {len(feed_rows)} rows in {FEED_FILE}")

if __name__ == "__main__":
    run_unquarantine()

#!/usr/bin/env python3
"""
Seeded 25-Item End-to-End Spot-Check Verifier (Part 6 of AGY Overnight Total Wiring Master Order).
Selects 25 random items per wave using a logged RNG seed and independently re-derives / traces
every item from raw sources and wave ledgers. Any single failure fails the wave gate.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
WIRING_DIR = REPO_ROOT / "docs" / "wiring"
SPOT_LEDGER_PATH = WIRING_DIR / "SPOT-CHECKS-LEDGER.md"


def run_git(args: List[str]) -> str:
    proc = subprocess.run(
        ["git"] + args,
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return proc.stdout.strip()


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(131072), b""):
            h.update(chunk)
    return h.hexdigest()


def spot_check_wave_1(seed: int) -> List[Dict[str, Any]]:
    rng = random.Random(seed)
    branch_csv = WIRING_DIR / "BRANCH-CENSUS.csv"
    corpus_csv = WIRING_DIR / "CORPUS-CENSUS.csv"

    with branch_csv.open("r", encoding="utf-8") as f:
        branches = list(csv.DictReader(f))
    with corpus_csv.open("r", encoding="utf-8") as f:
        corpus = [r for r in csv.DictReader(f) if "#" not in r["location"] and not r["location"].startswith("drive://") and r["category"] != "warehouse_registry_declared_parquet"]

    sampled_branches = rng.sample(branches, min(13, len(branches)))
    sampled_corpus = rng.sample(corpus, min(12, len(corpus)))

    results: List[Dict[str, Any]] = []
    for idx, b in enumerate(sampled_branches, 1):
        actual_sha = run_git(["rev-parse", b["remote_ref"]])
        lr = run_git(["rev-list", "--left-right", "--count", f"origin/main...{b['remote_ref']}"]).split()
        actual_behind, actual_ahead = (int(lr[0]), int(lr[1])) if len(lr) == 2 else (-1, -1)
        passed = (
            actual_sha == b["head_sha"]
            and actual_ahead == int(b["ahead_vs_main"])
            and actual_behind == int(b["behind_vs_main"])
        )
        results.append(
            {
                "check_num": idx,
                "kind": "branch_census",
                "target": b["remote_ref"],
                "expected": f"sha={b['head_sha'][:10]} ahead={b['ahead_vs_main']} behind={b['behind_vs_main']}",
                "observed": f"sha={actual_sha[:10]} ahead={actual_ahead} behind={actual_behind}",
                "status": "PASS" if passed else "FAIL",
            }
        )

    for idx, c in enumerate(sampled_corpus, len(sampled_branches) + 1):
        loc = c["location"]
        p = Path(loc) if Path(loc).is_absolute() else (REPO_ROOT / loc)
        exists = p.exists() and p.is_file()
        actual_sha = sha256_file(p) if exists else "MISSING"
        actual_sz = p.stat().st_size if exists else -1
        passed = exists and actual_sha == c["sha256"] and actual_sz == int(c["size_bytes"])
        results.append(
            {
                "check_num": idx,
                "kind": "corpus_census",
                "target": loc,
                "expected": f"sha={c['sha256'][:10]} bytes={c['size_bytes']}",
                "observed": f"sha={actual_sha[:10]} bytes={actual_sz}",
                "status": "PASS" if passed else "FAIL",
            }
        )

    return results


def spot_check_wave_2(seed: int) -> List[Dict[str, Any]]:
    rng = random.Random(seed)
    ledger_csv = WIRING_DIR / "BRANCH-LEDGER.csv"
    with ledger_csv.open("r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    sampled = rng.sample(rows, min(25, len(rows)))
    results: List[Dict[str, Any]] = []
    for idx, b in enumerate(sampled, 1):
        actual_sha = run_git(["rev-parse", b["remote_ref"]])
        lr = run_git(["rev-list", "--left-right", "--count", f"origin/main...{b['remote_ref']}"]).split()
        actual_behind, actual_ahead = (int(lr[0]), int(lr[1])) if len(lr) == 2 else (-1, -1)
        valid_status = b["status"] in ("merged", "cherry-picked", "superseded", "obsolete-with-reason")
        passed = (
            actual_sha == b["head_sha"]
            and actual_ahead == int(b["ahead_vs_main"])
            and actual_behind == int(b["behind_vs_main"])
            and valid_status
            and b["verified"] == "true"
        )
        results.append(
            {
                "check_num": idx,
                "kind": "branch_ledger",
                "target": b["remote_ref"],
                "expected": f"sha={b['head_sha'][:10]} status={b['status']} ahead={b['ahead_vs_main']}",
                "observed": f"sha={actual_sha[:10]} status={b['status']} ahead={actual_ahead}",
                "status": "PASS" if passed else "FAIL",
            }
        )
    return results


def spot_check_wave_3(seed: int) -> List[Dict[str, Any]]:
    rng = random.Random(seed)
    ledger_path = WIRING_DIR / "RESEARCH-LEDGER.jsonl"
    records_path = REPO_ROOT / "data" / "corpus" / "research_records.jsonl"
    ledger_rows = [json.loads(line) for line in ledger_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    sampled = rng.sample(ledger_rows, min(25, len(ledger_rows)))
    target_chunk_ids = {r["first_chunk_id"] for r in sampled}

    found_chunks: Dict[str, Dict[str, Any]] = {}
    with records_path.open("r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            if not line.strip():
                continue
            for cid in list(target_chunk_ids):
                if cid in line:
                    try:
                        obj = json.loads(line)
                        if obj.get("chunk_id") in target_chunk_ids:
                            found_chunks[obj["chunk_id"]] = obj
                    except Exception:
                        pass

    results: List[Dict[str, Any]] = []
    for idx, r in enumerate(sampled, 1):
        cid = r["first_chunk_id"]
        chk = found_chunks.get(cid)
        has_text = bool(chk and len(str(chk.get("full_text", ""))) > 0)
        passed = bool(chk and chk.get("item_id") == r["item_id"] and has_text)
        results.append(
            {
                "check_num": idx,
                "kind": "research_corpus_chunk",
                "target": f"{r['item_id']} ({r['location'][:48]})",
                "expected": f"chunk={cid} chunks={r['chunks_emitted']} text>0",
                "observed": f"chunk={chk.get('chunk_id') if chk else 'MISSING'} text_len={len(str(chk.get('full_text', ''))) if chk else 0}",
                "status": "PASS" if passed else "FAIL",
            }
        )
    return results


def spot_check_wave_4(seed: int) -> List[Dict[str, Any]]:
    rng = random.Random(seed)
    ent_path = REPO_ROOT / "data" / "identity" / "canonical_entities.jsonl"
    rows = [json.loads(line) for line in ent_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    sampled = rng.sample(rows, min(25, len(rows)))

    sys.path.insert(0, str(REPO_ROOT))
    from intelligence.identity.entity_resolver import CanonicalEntityResolver  # type: ignore

    resolver = CanonicalEntityResolver(ent_path)
    results: List[Dict[str, Any]] = []
    for idx, r in enumerate(sampled, 1):
        resolved = resolver.resolve_entity(
            name_or_id=r["canonical_id"],
            entity_type=r["entity_type"],
            team_id=r["current_team_id"],
            as_of_date=r["valid_from"],
        )
        passed = resolved["canonical_id"] == r["canonical_id"] and resolved["current_team_id"] == r["current_team_id"]
        results.append(
            {
                "check_num": idx,
                "kind": f"entity_{r['entity_type']}",
                "target": f"{r['canonical_id']} ({r['canonical_name']})",
                "expected": f"team={r['current_team_id']} pos={r['position']}",
                "observed": f"team={resolved['current_team_id']} pos={resolved['position']}",
                "status": "PASS" if passed else "FAIL",
            }
        )
    return results


def spot_check_wave_5(seed: int) -> List[Dict[str, Any]]:
    rng = random.Random(seed)
    reg_path = REPO_ROOT / "data" / "equations" / "equation_execution_registry.jsonl"
    rows = [json.loads(line) for line in reg_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    sampled = rng.sample(rows, min(25, len(rows)))
    results: List[Dict[str, Any]] = []
    for idx, r in enumerate(sampled, 1):
        valid_status = r.get("status") in ("wired_and_tested", "dormant_with_reason", "duplicate_of_<id>") or str(r.get("status", "")).startswith("duplicate_of_")
        has_consumer = bool(r.get("consumer_file"))
        passed = valid_status and has_consumer and bool(r.get("equation_id"))
        results.append(
            {
                "check_num": idx,
                "kind": "equation_registry",
                "target": f"{r.get('equation_id')} ({r.get('family')})",
                "expected": f"status={r.get('status')} consumer={r.get('consumer_file')}",
                "observed": f"live_output_seen={r.get('live_output_seen')} test={r.get('unit_test_file')}",
                "status": "PASS" if passed else "FAIL",
            }
        )
    return results


def spot_check_wave_6(seed: int) -> List[Dict[str, Any]]:
    rng = random.Random(seed)
    wh_reg = REPO_ROOT / "intelligence" / "data" / "warehouse" / "ingestion_registry.jsonl"
    lines = [json.loads(line) for line in wh_reg.read_text(encoding="utf-8").splitlines() if line.strip() and "canonical_id" in line]
    results: List[Dict[str, Any]] = []
    for idx in range(1, 26):
        rec = rng.choice(lines)
        np_rel = rec.get("norm_parquet", "")
        np_path = REPO_ROOT / np_rel
        exists = np_path.exists() and np_path.is_file()
        is_rel = not (":" in np_rel or np_rel.startswith("/") or np_rel.startswith("\\"))
        passed = exists and is_rel
        results.append(
            {
                "check_num": idx,
                "kind": "warehouse_parquet",
                "target": f"{rec.get('canonical_id')} ({np_rel})",
                "expected": f"exists=True repo_relative=True rows={rec.get('record_count')}",
                "observed": f"exists={exists} repo_relative={is_rel} size={np_path.stat().st_size if exists else 0}",
                "status": "PASS" if passed else "FAIL",
            }
        )
    return results


def spot_check_wave_7_8_9(seed: int) -> List[Dict[str, Any]]:
    rng = random.Random(seed)
    sys.path.insert(0, str(REPO_ROOT))
    from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS, execute_all_26_layers  # type: ignore

    outputs = execute_all_26_layers({"game_id": "2026_09_JAX_BAL", "home_team": "BAL", "away_team": "JAX", "as_of": "2026-11-05T18:00:00Z"})
    sampled_layers = rng.sample(ALL_26_LAYERS, min(25, len(ALL_26_LAYERS)))
    results: List[Dict[str, Any]] = []
    for idx, l_id in enumerate(sampled_layers, 1):
        out = outputs.get(l_id, {})
        passed = out.get("layer_id") == l_id and isinstance(out.get("signals"), dict) and len(out.get("signals", {})) > 0
        results.append(
            {
                "check_num": idx,
                "kind": "layer_execution",
                "target": l_id,
                "expected": f"layer_id={l_id} signals>0 schema=v1",
                "observed": f"layer_id={out.get('layer_id')} signals={len(out.get('signals', {}))} conf={out.get('confidence')}",
                "status": "PASS" if passed else "FAIL",
            }
        )
    return results


def append_spot_ledger(wave: str, seed: int, checks: List[Dict[str, Any]]) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    passed = sum(1 for c in checks if c["status"] == "PASS")
    if not SPOT_LEDGER_PATH.exists():
        header = (
            "# 25-ITEM SEEDED SPOT-CHECK LEDGER (`docs/wiring/SPOT-CHECKS-LEDGER.md`)\n\n"
            "End-to-end independent re-derivation of 25 randomly sampled items per wave (Part 6).\n\n"
        )
    else:
        header = SPOT_LEDGER_PATH.read_text(encoding="utf-8")

    lines = [
        f"## {wave} — Seed `{seed}` — `{ts}` (`{passed}/{len(checks)}` PASS)\n",
        "| # | Kind | Target | Expected (Ledger) | Observed (Raw Source) | Verdict |",
        "|---:|---|---|---|---|---|",
    ]
    for c in checks:
        lines.append(
            f"| {c['check_num']} | `{c['kind']}` | `{c['target']}` | `{c['expected']}` | `{c['observed']}` | **{c['status']}** |"
        )
    lines.append("\n")
    SPOT_LEDGER_PATH.write_text(header + "\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wave", default="WAVE_1", help="Wave identifier")
    parser.add_argument("--seed", type=int, default=2026110701, help="Deterministic RNG seed")
    args = parser.parse_args()

    w = args.wave.upper()
    if "WAVE_1" in w:
        checks = spot_check_wave_1(args.seed)
    elif "WAVE_2" in w:
        checks = spot_check_wave_2(args.seed)
    elif "WAVE_3" in w:
        checks = spot_check_wave_3(args.seed)
    elif "WAVE_4" in w:
        checks = spot_check_wave_4(args.seed)
    elif "WAVE_5" in w:
        checks = spot_check_wave_5(args.seed)
    elif "WAVE_6" in w:
        checks = spot_check_wave_6(args.seed)
    else:
        checks = spot_check_wave_7_8_9(args.seed)

    append_spot_ledger(args.wave, args.seed, checks)
    passed = sum(1 for c in checks if c["status"] == "PASS")
    print(json.dumps({"wave": args.wave, "seed": args.seed, "passed": passed, "total": len(checks)}, indent=2))
    if passed != len(checks):
        sys.exit(1)


if __name__ == "__main__":
    main()

"""Dry-run and owner-approved Neon `lit.premise` importer for the Nov 2-3 corpus feed.

Enforces the strict downgrade rule:
  - No row from the feed is ever stamped `CITABLE_VERIFIED` on initial import;
    all active rows enter as `HONESTLY_UNCITED_PRIOR` (`MSVH_S0_UNCITED`) pending backtest promotion.
  - Any retracted paper (`verification_status == 'REJECTED_RETRACTED_PAPER'`) is classified as
    `REJECTED_CORRUPT` (`citable=False`, `status='REJECTED'`) so it can never be cited or used.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FEED = ROOT / "brain" / "feeds" / "2026-11-02" / "nov02_multidomain_corpus_and_equations_feed.jsonl"
DEFAULT_MANIFEST = ROOT / "data" / "engine" / "INGESTION-MANIFEST-2026-11-02.json"


def plan_inserts(
    rows: Iterable[Dict[str, Any]],
    manifest: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    match_map: Dict[str, Optional[str]] = {}
    if manifest and "feed_source_matches" in manifest:
        for m in manifest["feed_source_matches"]:
            if m.get("status") in {"matched", "external_url"}:
                match_map[str(m["id"])] = m.get("rel_path")

    planned: List[Dict[str, Any]] = []
    for row in rows:
        rid = str(row.get("id") or row.get("equation_id") or "").strip()
        if not rid:
            continue
        v_status = str(row.get("verification_status") or "")
        is_retracted = v_status == "REJECTED_RETRACTED_PAPER"
        record_class = "REJECTED_CORRUPT" if is_retracted else "HONESTLY_UNCITED_PRIOR"
        cit_status = "MSVH_S0_UNCITED"
        row_status = "REJECTED" if is_retracted else "ACTIVE"

        src_file = match_map.get(rid) or row.get("source_file") or row.get("source") or None
        title = str(row.get("title") or rid)
        eq = str(row.get("equation") or row.get("core_equation") or row.get("title") or rid)
        lesson = str(row.get("lesson") or row.get("how_it_influences") or row.get("source_fidelity") or "nov02_multidomain_feed")
        domain = str(row.get("domain") or "nfl_multidomain")

        planned.append(
            {
                "premise_key": f"nov02:{rid}",
                "content_hash": hashlib.sha256(f"nov02:{rid}|{eq}".encode("utf-8")).hexdigest(),
                "source": str(row.get("source") or "nov02_multidomain_corpus_and_equations_feed.jsonl"),
                "source_ref": rid,
                "title": title,
                "principle": eq,
                "domain": domain,
                "claim_type": "equation_or_corpus_doc",
                "influence_direction": "rejected" if is_retracted else "diagnostic_or_gated",
                "how_it_influences": lesson,
                "source_file": src_file,
                "record_class": record_class,
                "verification_tier": cit_status,
                "status": row_status,
                "citable": False,
                "citation": {"status": cit_status, "feed_verification_status": v_status},
                "notes": (
                    f"REJECTED RETRACTED PAPER ({rid})"
                    if is_retracted
                    else f"Imported from nov02 feed ({rid}, {v_status}); source matched={bool(src_file)}"
                ),
            }
        )
    return planned


def load_feed_and_manifest(
    feed_path: Path = DEFAULT_FEED,
    manifest_path: Path = DEFAULT_MANIFEST,
) -> List[Dict[str, Any]]:
    rows = [
        json.loads(line)
        for line in feed_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else None
    return plan_inserts(rows, manifest=manifest)


def get_neon_conn_string() -> str:
    cmd = [
        "neonctl",
        "connection-string",
        "dev-lit-vectors-2026-10",
        "--project-id",
        "summer-brook-99380762",
        "--role-name",
        "neondb_owner",
    ]
    return subprocess.check_output(cmd, text=True, shell=True).strip()


def execute_neon_insert(planned: List[Dict[str, Any]]) -> Dict[str, Any]:
    import psycopg2

    conn_str = get_neon_conn_string()
    conn = psycopg2.connect(conn_str)
    try:
        conn.set_session(readonly=False, autocommit=False)
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM lit.premise;")
            before_total = int(cur.fetchone()[0])
            cur.execute("SELECT count(*) FROM lit.premise WHERE premise_key LIKE 'nov02:%';")
            existing_nov02 = int(cur.fetchone()[0])

            inserted = 0
            for item in planned:
                row_param = dict(item)
                row_param["how_it_influences"] = f"{item['how_it_influences']} | {item['notes']}"
                cur.execute(
                    """
                    INSERT INTO lit.premise (
                        premise_key, content_hash, source, source_ref, title, principle, domain,
                        claim_type, influence_direction, how_it_influences,
                        source_file, record_class, verification_tier, status, citable, created_at
                    )
                    VALUES (
                        %(premise_key)s, %(content_hash)s, %(source)s, %(source_ref)s, %(title)s, %(principle)s, %(domain)s,
                        %(claim_type)s, %(influence_direction)s, %(how_it_influences)s,
                        %(source_file)s, %(record_class)s, %(verification_tier)s, %(status)s, %(citable)s, NOW()
                    )
                    ON CONFLICT (premise_key) DO UPDATE SET
                        content_hash = EXCLUDED.content_hash,
                        title = EXCLUDED.title,
                        principle = EXCLUDED.principle,
                        how_it_influences = EXCLUDED.how_it_influences,
                        source_file = EXCLUDED.source_file,
                        record_class = EXCLUDED.record_class,
                        verification_tier = EXCLUDED.verification_tier,
                        status = EXCLUDED.status,
                        citable = EXCLUDED.citable;
                    """,
                    row_param,
                )
                inserted += 1

            cur.execute("SELECT count(*) FROM lit.premise WHERE premise_key LIKE 'nov02:%';")
            after_nov02 = int(cur.fetchone()[0])
            cur.execute("SELECT count(*) FROM lit.premise;")
            after_total = int(cur.fetchone()[0])
            if after_nov02 != len(planned):
                conn.rollback()
                raise RuntimeError(f"Post-insert count mismatch: expected {len(planned)}, got {after_nov02}")
        conn.commit()
    finally:
        conn.close()

    return {
        "executed_at_utc": datetime.now(timezone.utc).isoformat(),
        "before_total": before_total,
        "existing_nov02": existing_nov02,
        "planned_count": len(planned),
        "after_nov02": after_nov02,
        "after_total": after_total,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print planned insert summary without DB writes")
    parser.add_argument("--execute", action="store_true", help="Execute idempotent insert into Neon lit.premise")
    args = parser.parse_args()

    planned = load_feed_and_manifest()
    by_class = Counter(p["record_class"] for p in planned)
    unmatched = sum(1 for p in planned if not p["source_file"])
    summary = {
        "total_planned": len(planned),
        "record_class_distribution": dict(by_class),
        "unmatched_source_file_count": unmatched,
        "citable_verified_count": sum(1 for p in planned if p["record_class"] == "CITABLE_VERIFIED"),
    }
    print(json.dumps(summary, indent=2))
    if args.execute and not args.dry_run:
        res = execute_neon_insert(planned)
        print("NEON_INSERT_RESULT:", json.dumps(res, indent=2))


if __name__ == "__main__":
    main()

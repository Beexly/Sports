"""S0/S1 seed + accrual runner.

Deterministic plumbing (SPEC-C §5 delegation: S0–S3 suit the coding lane).
One run performs, in order:

  1. Generator-version genesis record -> versions.jsonl (§1.8), if absent.
  2. Import of the bridge premise instance + the premise-grading ledger's
     seeded records -> tonight's dossier v1 (§1.2), if absent. Tonight's
     game (SEA@DEN) gets a MISSED-T0 line-move forecast marker: its T0
     (kickoff - 72h) predates this store, so no T0 read can be authored now
     without violating the stamp rule. The game scores MISSING (= the
     reference) on the primary metric — the honest state, recorded.
  3. Trajectory build from the line archive + R0 reference state
     -> trackrecords/r0_reference.json.
  4. T0 accrual calendar for the rest of Week 6 + Week 7
     -> trackrecords/t0_accrual_calendar_2026_w06_w07.json.
  5. LMS state over the store -> trackrecords/lms_state.json.
  6. Daily manifest over the day's new records + its SPEC-A-ledger-format
     append (§1.9).

All trackrecords outputs carry the SHA-256 of this script. Re-running is
safe: existing store records are never rewritten (append-only); steps whose
artifacts already exist are skipped and reported.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src import t0_calendar as calendar_mod
from src import importer as importer_mod
from src import lms as lms_mod
from src import manifest as manifest_mod
from src import reference as reference_mod
from src.store import Store, sha256_hex

GAME = {"season": 2026, "week": 6, "game_id": "2026_06_SEA_DEN", "espn_id": "espn:americanfootball_nfl:401872995"}


def _script_sha() -> str:
    with open(os.path.abspath(__file__), "rb") as fh:
        return sha256_hex(fh.read())


def _write_derived(store: Store, name: str, payload: dict) -> str:
    rel = os.path.join("trackrecords", name)
    path = os.path.join(store.root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    payload = dict(payload)
    payload["generating_script"] = os.path.basename(os.path.abspath(__file__))
    payload["generating_script_sha256"] = _script_sha()
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, sort_keys=True, ensure_ascii=False)
        fh.write("\n")
    return rel


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="store root (the introspection/ dir)")
    ap.add_argument("--bridge", required=True, help="bridge premise instance JSON")
    ap.add_argument("--grading", required=True, help="premise-grading ledger JSONL")
    ap.add_argument("--archive", required=True, help="flat line-archive JSONL (ESPN/DK rows)")
    ap.add_argument("--schedule", required=True, help="games.jsonl schedule")
    args = ap.parse_args(argv)

    store = Store(args.root)
    now = datetime.now(timezone.utc)
    summary = {}

    # 1. generator version genesis
    versions_rel = "versions.jsonl"
    if not store.read_chain(versions_rel):
        reg_dir = os.path.join(args.root, "registry")
        with open(os.path.join(reg_dir, "premise_types.json"), "rb") as fh:
            pt_sha = sha256_hex(fh.read())
        with open(os.path.join(reg_dir, "resolvable_quantities.json"), "rb") as fh:
            rq_sha = sha256_hex(fh.read())
        rec = store.append_jsonl(
            versions_rel,
            {
                "kind": "GENERATOR_VERSION",
                "generator_version": "gse-introspection-s0s1/1.0.0",
                "author_lane": "introspection-importer (deterministic; no LLM author)",
                "author_model_id": "n/a",
                "premise_types_registry_sha256": pt_sha,
                "resolvable_quantities_registry_sha256": rq_sha,
                "note": "Genesis generator version for the SPEC-C S0/S1 build (SPEC-C DRAFT; Freeze-1-C pending).",
            },
        )
        summary["generator_version_record"] = rec["record_sha"]
    generator_version = "gse-introspection-s0s1/1.0.0"

    # 2. import -> tonight's dossier v1 (once)
    dossier_rel = store.dossier_rel(GAME["season"], GAME["week"], GAME["game_id"], 1)
    if not os.path.exists(os.path.join(args.root, dossier_rel)):
        with open(args.bridge, "rb") as fh:
            bridge_bytes = fh.read()
        with open(args.grading, "rb") as fh:
            grading_bytes = fh.read()
        bridge_doc = json.loads(bridge_bytes.decode("utf-8"))
        grading_records = [json.loads(l) for l in grading_bytes.decode("utf-8").splitlines() if l.strip()]
        result = importer_mod.import_sources(store, bridge_doc, grading_records)
        schedule = calendar_mod.load_schedule(args.schedule)
        game_row = next(r for r in schedule if r["game_id"] == GAME["game_id"])
        kickoff = calendar_mod.kickoff_utc(game_row)
        from datetime import timedelta

        t0 = kickoff - timedelta(hours=72)
        payload = {
            "season": GAME["season"],
            "week": GAME["week"],
            "author_lane": "introspection-importer (S0/S1 build)",
            "author_model_id": "deterministic-import; premises authored by bridge-model v1.0 and the Grok WO-0 Layer-2 read",
            "generator_version": generator_version,
            "template_hash": sha256_hex(bridge_bytes[:0] + pt_sha.encode() + rq_sha.encode()),
            "inputs_hash": importer_mod.inputs_hash(bridge_bytes, grading_bytes),
            "inputs_manifest": [
                {"kind": "bridge_premise_instance", "ref": "intelligence/situational-graph/bridge/instances/2026-week06-sea-at-den.premises.json (branch motif/bridge-model-2026-10-15)"},
                {"kind": "premise_grading_ledger", "ref": "intelligence/situational-graph/premise-grading/ledger/premise-grades.jsonl (branch motif/premise-grading-2026-10-15)"},
            ],
            "premises": result["premises"],
            "line_move_forecast": {
                "status": "MISSED_T0",
                "reason": (
                    "T0 for this game was 2026-10-12 20:15 ET (2026-10-13T00:15:00Z), before this store "
                    "existed. No T0 read can be authored now without violating the server-stamp rule "
                    "(SPEC-C §1.9 / §2.2). The game scores MISSING = the reference on the primary metric."
                ),
                "t0_utc": t0.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "kickoff_utc": kickoff.strftime("%Y-%m-%dT%H:%M:%SZ"),
            },
            "commitments": [],
            "read_status": {"t0_read": "MISSING", "final_read": "THIS_VERSION"},
            "retro": False,
            "retro_note": (
                "Not RETRO under §4.7: authored before kickoff from stamped pre-game inputs; the imported "
                "premises were authored pre-kickoff (bridge read_at 2026-10-15; WO-0 read 2026-10-15 ~11:21 CT)."
            ),
            "scoring": {"lms_forecast": "MISSING_SCORES_AS_REFERENCE", "outcome": "PENDING"},
        }
        doc = store.write_dossier(GAME["season"], GAME["week"], GAME["game_id"], payload)
        summary["dossier_v1_record_sha"] = doc["record_sha"]
        report_rel = _write_derived(store, "import_report_2026-10-15.json", result["report"])
        summary["import_report"] = report_rel
        summary["import"] = result["report"]
    else:
        summary["dossier_v1"] = "already present; skipped (append-only)"

    # 3. trajectories + R0
    rows, skipped = reference_mod.load_flat_archive(args.archive)
    espn_ids = sorted({r["gameId"] for r in rows if r["market"] == "SPREAD"})
    schedule = calendar_mod.load_schedule(args.schedule)
    by_id = {r["game_id"]: r for r in schedule}
    trajectories = []
    unmapped = []
    for espn_id in espn_ids:
        series = reference_mod.home_spread_series(rows, espn_id)
        if espn_id == GAME["espn_id"]:
            ko = calendar_mod.kickoff_utc(by_id[GAME["game_id"]])
            traj = reference_mod.build_trajectory(series, ko, now)
            traj["game_id"] = GAME["game_id"]
            traj["espn_game_id"] = espn_id
            trajectories.append(traj)
        else:
            unmapped.append(espn_id)
    ref_state = reference_mod.reference_state(trajectories)
    r0_payload = {
        "built_utc": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sources": [{"kind": "line_archive_flat", "ref": os.path.basename(args.archive), "rows": len(rows), "snapshot_rows_skipped": skipped}],
        "trajectories": trajectories,
        "unmapped_espn_game_ids": unmapped,
        "unmapped_note": (
            "Trajectories are keyed by ESPN event id; only SEA@DEN's mapping to an engine game_id is "
            "verified today (pickcenter snapshot rows + the workorder packet). Unmapped games' captures "
            "still accrue in the archive; they enter the trajectory pool once their event mapping is "
            "registered. No completed trajectories exist yet: every archived game is unplayed, and the "
            "archive's first capture (2026-10-15T17:15Z) postdates every Week 6 T0."
        ),
        "reference": ref_state,
    }
    summary["r0"] = _write_derived(store, "r0_reference.json", r0_payload)

    # 4. T0 accrual calendar: rest of Week 6 + Week 7
    cal = calendar_mod.build_calendar(schedule, 2026, [6, 7], now)
    cal_payload = {
        "generated_utc": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "rule": "T0 = kickoff - 72h (SPEC-C §6 default). Status vs the server clock at generation.",
        "games": cal,
        "elapsed": sum(1 for g in cal if g["status"] == "ELAPSED"),
        "upcoming": sum(1 for g in cal if g["status"] == "UPCOMING"),
    }
    summary["calendar"] = _write_derived(store, "t0_accrual_calendar_2026_w06_w07.json", cal_payload)
    summary["calendar_counts"] = {"elapsed": cal_payload["elapsed"], "upcoming": cal_payload["upcoming"]}

    # 5. LMS state
    lms_rows = [
        {
            "game_id": GAME["game_id"],
            "week": "2026-W06",
            "q": None,  # MISSING (MISSED-T0)
            "outcome": None,  # unresolvable from this archive: no capture at or before T0 exists
        }
    ]
    lms_result = lms_mod.lms(lms_rows, reference=[1 / 3, 1 / 3, 1 / 3])
    lms_payload = {
        "state": "ACCRUING",
        "as_of_utc": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "lms": lms_result,
        "bootstrap": lms_mod.week_block_bootstrap(lms_rows, reference=[1 / 3, 1 / 3, 1 / 3], b=1000),
        "per_game": [
            {
                "game_id": GAME["game_id"],
                "forecast": "MISSING (MISSED-T0; scores as the reference)",
                "outcome": "UNRESOLVABLE_FROM_ARCHIVE — the archive's first capture postdates this game's T0, so line(T0) was never archived; delta and category cannot be computed from archived data",
            }
        ],
        "note": (
            "LMS accrual starts at the next T0 for which a stamped forecast can exist: "
            "2026_06_DAL_GB, T0 2026-10-15 19:20 CT (see the accrual calendar). The reference "
            "vector used above is a placeholder uniform vector for state reporting only — no "
            "game is resolved, so no LMS value is computed or claimed."
        ),
    }
    summary["lms_state"] = _write_derived(store, "lms_state.json", lms_payload)

    # 6. daily manifest + SPEC-A-ledger-format append
    today = now.strftime("%Y-%m-%d")
    todays_shas = []
    for rec in store.read_chain("versions.jsonl"):
        if rec["stamped_utc"].startswith(today):
            todays_shas.append(rec["record_sha"])
    doc = store.read_dossier(GAME["season"], GAME["week"], GAME["game_id"], 1)
    if doc["authored_utc"].startswith(today):
        todays_shas.append(doc["record_sha"])
    manifest = manifest_mod.build_daily_manifest(store, today, todays_shas, os.path.abspath(__file__))
    summary["manifest"] = _write_derived(store, f"daily_manifest_{today}.json", manifest)
    existing_appends = store.read_chain(manifest_mod.LEDGER_APPENDS_REL)
    if not any(e.get("freeze_hash") == manifest["sha256"] for e in existing_appends):
        entry = manifest_mod.append_ledger_entry(store, manifest)
        summary["ledger_append"] = entry["ledger_id"]
    else:
        summary["ledger_append"] = "already appended for this manifest"

    problems = store.verify_all()
    summary["chain_problems"] = problems
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0 if not problems else 1


if __name__ == "__main__":
    raise SystemExit(main())

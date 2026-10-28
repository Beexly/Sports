#!/usr/bin/env python3
"""scripts/feeds/delta_telemetry.py — GSE Daily Telemetry Delta Writer & Context Retriever.

Contract:
  - artifacts/telemetry-schema-2026-10-27.md
  - artifacts/rag-telemetry-wiring-2026-10-27.md

Strictly isolated from sealed baseline mutation: this module never writes, mutates,
or re-estimates tau, costMatrixC, team ratings, or the SealedEpaDropoffTable. It only
appends validated Class A/Class B claim records to a daily JSONL delta log and reads
prior claims back as read-only context.

Seal resolution (important — two environments exist):
  The sealed hash is resolved at runtime, in this order:
    1. $GSE_SEALED_HASH               (explicit override, e.g. sandbox faab2827...)
    2. <repo>/candidates/sealed-center.json  -> "merkle" field  (authoritative on disk)
    3. DOCUMENTED_FIXTURE_HASH        (the plan's canonical verification fixture)

  On the Windows workstation the seal center carries 23245bcb...; the architecture
  plan's 85b5cd33... is the canonical verification fixture from the plan author's
  environment. Hard-coding either value would break the other machine, so neither is
  hard-coded as the only truth.

Usage:
    python3 scripts/feeds/delta_telemetry.py --selftest
    python3 scripts/feeds/delta_telemetry.py --append <record.json>
    python3 scripts/feeds/delta_telemetry.py --retrieve --subject player:CLE:Dillon_Gabriel
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import sys
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

# --------------------------------------------------------------------------------------
# Seal + frozen-condition constants
# --------------------------------------------------------------------------------------

# The plan's canonical verification fixture. Kept for contract compatibility and for
# environments where no seal center is mounted. NOT treated as the only valid seal.
DOCUMENTED_FIXTURE_HASH = "85b5cd3303c540492b23019d913aabd9179945a72c490579124e6e57dcad68b8"

FROZEN_TAU = 0.42
FROZEN_QB_QUESTIONABLE_EPA = 0.0947
FROZEN_VERSION = "v1.0"

FROZEN_CONDITIONS_ON: Dict[str, Any] = {
    "version": FROZEN_VERSION,
    "tau": FROZEN_TAU,
    "qb_questionable_epa": FROZEN_QB_QUESTIONABLE_EPA,
}

VALID_SOURCE_TYPES = {
    "injury_note",
    "practice_report",
    "dk_line",
    "beat_writer",
    "form4",
    "arxiv",
    "other",
}

# Class B = Zone 3 only. These may never enter applyInjuryOverlay / sinkhornTargetAllocation.
CLASS_B_SOURCE_TYPES = {"dk_line", "form4"}

VALID_STATUSES = {"ingested", "retrieved", "used_in_overlay", "rejected"}

REQUIRED_TOP_KEYS = (
    "id",
    "timestamp",
    "source",
    "claim",
    "confidence",
    "sealed_hash",
    "conditions_on",
    "status",
    "notes",
)

REQUIRED_SOURCE_KEYS = ("type", "url", "raw_excerpt")
REQUIRED_CLAIM_KEYS = ("subject", "predicate", "object", "game_id", "week")


def _repo_root() -> Path:
    """Best-effort repo root: walk up from this file until a candidates/ dir appears."""
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        if (parent / "candidates" / "sealed-center.json").is_file():
            return parent
    # Fall back to CWD so callers running from the repo root still work.
    return Path.cwd()


def resolve_sealed_hash(explicit: Optional[str] = None) -> str:
    """Resolve the active sealed hash without hard-coding one environment's value."""
    if explicit:
        return explicit
    env = os.environ.get("GSE_SEALED_HASH")
    if env:
        return env.strip()

    seal_center = _repo_root() / "candidates" / "sealed-center.json"
    if seal_center.is_file():
        try:
            data = json.loads(seal_center.read_text(encoding="utf-8"))
            merkle = str(data.get("merkle") or "").strip()
            if merkle:
                return merkle
        except (OSError, ValueError):
            pass

    return DOCUMENTED_FIXTURE_HASH


# --------------------------------------------------------------------------------------
# Validation (fail-closed)
# --------------------------------------------------------------------------------------

def validate_delta_record(
    rec: Dict[str, Any],
    active_sealed_hash: Optional[str] = None,
) -> None:
    """Raise ValueError on any schema or seal violation. Never mutates `rec`."""
    active_sealed_hash = active_sealed_hash or resolve_sealed_hash()

    for key in REQUIRED_TOP_KEYS:
        if key not in rec:
            raise ValueError(f"SCHEMA_VIOLATION: Missing required key '{key}'")

    src = rec["source"]
    if not isinstance(src, dict):
        raise ValueError("SCHEMA_VIOLATION: source must be an object")
    for key in REQUIRED_SOURCE_KEYS:
        if key not in src:
            raise ValueError(f"SCHEMA_VIOLATION: Missing source.{key}")

    if src["type"] not in VALID_SOURCE_TYPES:
        raise ValueError(f"SCHEMA_VIOLATION: Invalid source.type '{src['type']}'")

    url = src.get("url")
    if not isinstance(url, str) or not url.startswith("http"):
        raise ValueError("SCHEMA_VIOLATION: source.url must be a valid http(s) URL")

    excerpt = src.get("raw_excerpt")
    if not isinstance(excerpt, str) or not excerpt.strip():
        raise ValueError("SCHEMA_VIOLATION: source.raw_excerpt must be non-empty verbatim text")

    clm = rec["claim"]
    if not isinstance(clm, dict):
        raise ValueError("SCHEMA_VIOLATION: claim must be an object")
    for key in REQUIRED_CLAIM_KEYS:
        if key not in clm:
            raise ValueError(f"SCHEMA_VIOLATION: Missing claim.{key}")

    week = clm.get("week")
    if not isinstance(week, int) or not (1 <= week <= 22):
        raise ValueError(f"SCHEMA_VIOLATION: claim.week must be an integer in [1, 22], got {week!r}")

    conf = rec["confidence"]
    if not isinstance(conf, (int, float)) or isinstance(conf, bool):
        raise ValueError(f"SCHEMA_VIOLATION: confidence must be numeric, got {type(conf).__name__}")
    if not (0.0 <= float(conf) <= 1.0):
        raise ValueError(f"SCHEMA_VIOLATION: confidence {conf} outside [0.0, 1.0]")

    if rec["sealed_hash"] != active_sealed_hash:
        raise ValueError(
            "SEAL_HASH_MISMATCH: record sealed_hash "
            f"{rec['sealed_hash']} != active seal {active_sealed_hash}"
        )

    cond = rec["conditions_on"]
    if not isinstance(cond, dict):
        raise ValueError("SCHEMA_VIOLATION: conditions_on must be an object")
    if cond.get("version") != FROZEN_VERSION:
        raise ValueError(f"CONDITIONS_ON_VIOLATION: version {cond.get('version')!r} != {FROZEN_VERSION!r}")
    try:
        tau_ok = abs(float(cond.get("tau", -1.0)) - FROZEN_TAU) < 1e-9
        qb_ok = abs(float(cond.get("qb_questionable_epa", -1.0)) - FROZEN_QB_QUESTIONABLE_EPA) < 1e-9
    except (TypeError, ValueError):
        tau_ok = qb_ok = False
    if not (tau_ok and qb_ok):
        raise ValueError(
            f"CONDITIONS_ON_VIOLATION: {cond} does not match frozen Tuesday v1.0 parameters "
            f"(tau={FROZEN_TAU}, qb_questionable_epa={FROZEN_QB_QUESTIONABLE_EPA})"
        )

    if rec["status"] not in VALID_STATUSES:
        raise ValueError(f"SCHEMA_VIOLATION: Invalid status '{rec['status']}'")

    # Epistemic routing guard: Class B records may never be admitted as overlay inputs.
    if src["type"] in CLASS_B_SOURCE_TYPES and rec["status"] == "used_in_overlay":
        raise ValueError(
            "EPISTEMIC_ROUTING_VIOLATION: source.type "
            f"'{src['type']}' is Class B (Zone 3) and cannot carry status 'used_in_overlay'"
        )


# --------------------------------------------------------------------------------------
# Append-only writer
# --------------------------------------------------------------------------------------

def append_delta_record(
    delta_file_path: str,
    record: Dict[str, Any],
    active_sealed_hash: Optional[str] = None,
) -> str:
    """Validate, then append one JSON line. Rejects duplicate ids. Returns the path."""
    active_sealed_hash = active_sealed_hash or resolve_sealed_hash()
    validate_delta_record(record, active_sealed_hash)

    path_obj = Path(delta_file_path)
    path_obj.parent.mkdir(parents=True, exist_ok=True)

    if path_obj.exists():
        with open(path_obj, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    existing = json.loads(line)
                except ValueError:
                    continue
                if existing.get("id") == record["id"]:
                    raise RuntimeError(
                        f"NO_OVERWRITE_VIOLATION: Record id {record['id']} "
                        f"already exists in {delta_file_path}"
                    )

    with open(path_obj, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, separators=(",", ":"), sort_keys=True) + "\n")

    return str(path_obj)


# --------------------------------------------------------------------------------------
# Read-only retrieval
# --------------------------------------------------------------------------------------

def retrieve_prior_claims(
    delta_file_path: str,
    sealed_hash: Optional[str] = None,
    subject: Optional[str] = None,
    game_id: Optional[str] = None,
    allowed_source_types: Optional[set] = None,
) -> List[Dict[str, Any]]:
    """Read-only retrieval of prior claims matching seal hash + subject (+ optional game_id).

    Used as context before a Sinkhorn overlay or a Step N residual evaluation.
    Never mutates sealed state.
    """
    sealed_hash = sealed_hash or resolve_sealed_hash()
    path_obj = Path(delta_file_path)
    if not path_obj.exists():
        return []

    matches: List[Dict[str, Any]] = []
    with open(path_obj, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except ValueError:
                continue
            if rec.get("sealed_hash") != sealed_hash:
                continue
            if rec.get("status") == "rejected":
                continue
            claim = rec.get("claim") or {}
            if subject and claim.get("subject") != subject:
                continue
            if game_id and claim.get("game_id") != game_id:
                continue
            if allowed_source_types and (rec.get("source") or {}).get("type") not in allowed_source_types:
                continue
            matches.append(rec)

    matches.sort(key=lambda r: r.get("timestamp", ""))
    return matches


# --------------------------------------------------------------------------------------
# Selftest
# --------------------------------------------------------------------------------------

def _build_selftest_records(seal: str) -> Dict[str, Dict[str, Any]]:
    """Two real Week 8 records: one Class A injury note, one Class B line move."""
    injury_rec: Dict[str, Any] = {
        "id": str(
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                "https://www.clevelandbrowns.com/news/injury-report-wk8|gabriel_out",
            )
        ),
        "timestamp": "2026-10-27T17:40:00-05:00",
        "source": {
            "type": "injury_note",
            "url": "https://www.clevelandbrowns.com/news/injury-report-wk8",
            "author": "Official Team Report",
            "raw_excerpt": "CLE QB Dillon Gabriel ruled OUT for Week 8 at Pittsburgh.",
        },
        "claim": {
            "subject": "player:CLE:Dillon_Gabriel",
            "predicate": "out",
            "object": "QB1",
            "game_id": "2026_08_CLE_PIT",
            "week": 8,
        },
        "confidence": 1.0,
        "sealed_hash": seal,
        "conditions_on": dict(FROZEN_CONDITIONS_ON),
        "status": "ingested",
        "notes": "Verified official injury designation; maps to sealed QB1 drop-off.",
    }

    dk_rec: Dict[str, Any] = {
        "id": str(
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                "https://sportsbook.draftkings.com/leagues/football/nfl|lv_nyj_flip",
            )
        ),
        "timestamp": "2026-10-27T17:41:00-05:00",
        "source": {
            "type": "dk_line",
            "url": "https://sportsbook.draftkings.com/leagues/football/nfl",
            "author": None,
            "raw_excerpt": (
                "LV @ NYJ spread moved to NYJ -1.5 on DraftKings vs Pinnacle LV +1.0 "
                "(2.5 pt favorite flip)."
            ),
        },
        "claim": {
            "subject": "game:2026_08_LV_NYJ",
            "predicate": "line_move",
            "object": -1.5,
            "game_id": "2026_08_LV_NYJ",
            "week": 8,
        },
        "confidence": 0.95,
        "sealed_hash": seal,
        "conditions_on": dict(FROZEN_CONDITIONS_ON),
        "status": "ingested",
        "notes": "Step N cross-book dispersion favorite flip; never enters Class A simulation.",
    }
    return {"injury": injury_rec, "dk": dk_rec}


def _selftest_simulator_leg(seal: str, prior_inj: List[Dict[str, Any]]) -> str:
    """Optional leg: prove coachMindsetHash + tau invariance through the simulator.

    The simulator module (gse_coach_mind_simulator) lives in the sandbox build, not in
    every checkout. When it is absent we report SKIP rather than failing the whole
    selftest — the append/retrieve invariants are still exercised.
    """
    try:
        import sys as _sys

        _ops = Path(__file__).resolve().parent.parent / "ops"
        if _ops.is_dir() and str(_ops) not in _sys.path:
            _sys.path.insert(0, str(_ops))
        from gse_coach_mind_simulator import (  # type: ignore[import-not-found]
            load_sealed_object_readonly,
            canonical_hash,
            simulate_matchup_pbp,
        )
    except Exception as exc:  # noqa: BLE001 - optional dependency by design
        return f"SKIP (simulator unavailable: {type(exc).__name__}: {exc})"

    sealed_obj, before_hash = load_sealed_object_readonly()
    # The active seal is a projection merkle (coachMindsetHash + tau + scoreMean +
    # marginMean + winProbHome). The simulator hashes its baseline config, which is a
    # different object, so the two digests legitimately differ. The invariant this leg
    # actually proves is that an injury overlay does not mutate the seal, so run it and
    # name the divergence rather than skipping.
    seal_note = "" if before_hash == seal else f" (baseline hash {before_hash[:16]}… != projection merkle {seal[:16]}…)"

    sim_res = simulate_matchup_pbp(
        "CLE",
        "PIT",
        [prior_inj[-1]["claim"]["object"], "WR2"],
        [],
        sealed_obj,
        before_hash,
        n_sims=1000,
        seed=42,
    )
    after_hash = canonical_hash(sealed_obj)
    assert after_hash == before_hash, "SEAL_MUTATION: simulator changed coachMindsetHash"
    assert sim_res.get("coachMindsetHash") == before_hash, "SEAL_MUTATION: sim result hash drifted"
    assert float(sealed_obj.get("tau", -1)) == FROZEN_TAU, "TAU_MUTATION: tau changed during overlay"
    return f"PASS (coachMindsetHash={after_hash[:16]}… tau={sealed_obj['tau']}){seal_note}"


def selftest() -> int:
    seal = resolve_sealed_hash()
    print(f"[selftest] active seal = {seal}")

    with tempfile.TemporaryDirectory() as tmpdir:
        delta_path = os.path.join(tmpdir, "delta-2026-10-27.jsonl")
        records = _build_selftest_records(seal)

        # 1-2. Append both records.
        append_delta_record(delta_path, records["injury"], seal)
        append_delta_record(delta_path, records["dk"], seal)

        # 2b. Duplicate id must be rejected.
        try:
            append_delta_record(delta_path, records["injury"], seal)
        except RuntimeError as exc:
            assert "NO_OVERWRITE_VIOLATION" in str(exc), exc
        else:
            raise AssertionError("NO_OVERWRITE_VIOLATION did not fire on duplicate id")

        # 2c. A wrong seal must be rejected.
        bad = dict(records["dk"])
        bad["id"] = str(uuid.uuid4())
        bad["sealed_hash"] = "0" * 64
        try:
            append_delta_record(delta_path, bad, seal)
        except ValueError as exc:
            assert "SEAL_HASH_MISMATCH" in str(exc), exc
        else:
            raise AssertionError("SEAL_HASH_MISMATCH did not fire on wrong seal")

        # 2d. A Class B record cannot claim used_in_overlay.
        bad_b = dict(records["dk"])
        bad_b["id"] = str(uuid.uuid4())
        bad_b["status"] = "used_in_overlay"
        try:
            append_delta_record(delta_path, bad_b, seal)
        except ValueError as exc:
            assert "EPISTEMIC_ROUTING_VIOLATION" in str(exc), exc
        else:
            raise AssertionError("EPISTEMIC_ROUTING_VIOLATION did not fire on Class B overlay")

        # 3. Retrieve prior Class A injury claims by seal + game_id.
        prior_inj = retrieve_prior_claims(
            delta_path,
            sealed_hash=seal,
            subject="player:CLE:Dillon_Gabriel",
            game_id="2026_08_CLE_PIT",
            allowed_source_types={"injury_note", "practice_report", "beat_writer"},
        )
        assert len(prior_inj) == 1, f"expected 1 prior injury claim, got {len(prior_inj)}"
        assert prior_inj[-1]["claim"]["object"] == "QB1"

        # 3b. Class B record must NOT appear in a Class A retrieval.
        class_a_only = retrieve_prior_claims(
            delta_path,
            sealed_hash=seal,
            allowed_source_types={"injury_note", "practice_report", "beat_writer"},
        )
        assert len(class_a_only) == 1, f"Class B leaked into Class A retrieval ({len(class_a_only)} rows)"

        # 4. Optional simulator invariance leg.
        sim_status = _selftest_simulator_leg(seal, prior_inj)

        print(
            "[DELTA TELEMETRY SELFTEST PASS] 2 records written & retrieved | "
            f"duplicate/wrong-seal/Class-B-overlay guards fired | seal={seal[:16]}… | "
            f"simulator={sim_status}"
        )
    return 0


# --------------------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------------------

def _cmd_append(args: argparse.Namespace) -> int:
    rec = json.loads(Path(args.append).read_text(encoding="utf-8"))
    path = append_delta_record(args.file, rec, resolve_sealed_hash(args.seal))
    print(f"[append] wrote to {path}")
    return 0


def _cmd_retrieve(args: argparse.Namespace) -> int:
    rows = retrieve_prior_claims(
        args.file,
        sealed_hash=resolve_sealed_hash(args.seal),
        subject=args.subject,
        game_id=args.game_id,
        allowed_source_types=set(args.source_type) if args.source_type else None,
    )
    print(json.dumps(rows, indent=2))
    print(f"[retrieve] {len(rows)} matching claim(s)", file=sys.stderr)
    return 0


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="GSE daily telemetry delta writer & retriever")
    ap.add_argument(
        "--file",
        default=f"artifacts/delta-{_dt.date.today().isoformat()}.jsonl",
        help="delta JSONL path (default: artifacts/delta-<today>.jsonl)",
    )
    ap.add_argument("--seal", default=None, help="explicit sealed hash override")
    ap.add_argument("--selftest", action="store_true", help="run the built-in selftest")
    ap.add_argument("--append", metavar="RECORD_JSON", help="append the given JSON record file")
    ap.add_argument("--retrieve", action="store_true", help="retrieve prior claims")
    ap.add_argument("--subject", default=None, help="claim.subject filter for retrieval")
    ap.add_argument("--game-id", default=None, help="claim.game_id filter for retrieval")
    ap.add_argument(
        "--source-type",
        action="append",
        default=None,
        help="allowed source.type filter for retrieval (repeatable)",
    )
    args = ap.parse_args(argv)

    if args.selftest:
        return selftest()
    if args.append:
        return _cmd_append(args)
    if args.retrieve:
        return _cmd_retrieve(args)

    ap.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

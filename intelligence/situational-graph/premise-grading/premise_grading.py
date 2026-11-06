#!/usr/bin/env python3
"""
premise_grading.py — premise-grading ledger + introspection scorer v1
(stdlib only).

What this is
------------
WO-8 Build 2 (Grok's frontier brief, 2026-10-15, section 4): the reasoning
layer grades its own past reads. Every Layer 2 premise — a directional
premise or a NO_BET — is recorded with its stated uncertainty and stamped
evidence BEFORE the game, and graded AFTER the game against an outcome
artifact: was the premise SUPPORTED, REFUTED, or is the evidence honestly
UNRESOLVED? The scorer is scored on the correctness of stated premises and
the honesty of stated uncertainty, never on the residual or the close.

Ledger discipline
-----------------
- Append-only JSONL. A premise enters as one PENDING record. Grading
  APPENDS a second record for the same premise_id; the premise fields are
  copied verbatim (grading never rewrites a premise) and only the grading
  fields change. The current state of a premise is its LAST record.
- A premise is graded ONLY on what it actually claimed. Friction premises
  grade on friction evidence in the outcome artifact, never retrofitted
  into point claims. The final score alone is not an outcome artifact for
  a friction premise. See README.md for per-type grading rules.
- UNRESOLVED is a first-class outcome: it says the outcome artifact does
  not carry the evidence either way. It is not a failure and it is not
  smoothed away in the calibration table.
- No premise may be graded from memory or prose: every grading field is
  transcribed from a structured outcome artifact file whose game_key must
  match the premise's game. Absent artifact -> refusal.

Commands
--------
  ingest  --bridge FILE --reads FILE --out LEDGER
  validate LEDGER
  grade   LEDGER --premise-id ID --outcome-artifact FILE --grader-id ID
  report  LEDGER [--json]

Schema: schema/premise-grade.schema.json (the validator implements the
subset of JSON Schema used there, plus the cross-field grading rules).
"""

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCHEMA_PATH = HERE / "schema" / "premise-grade.schema.json"

RECORD_VERSION = "1.0"
DIRECTIONS = {"FAVORS_HOME", "FAVORS_AWAY", "AGAINST_HOME", "AGAINST_AWAY",
              "FRICTION", "NEUTRAL", "NO_BET"}
MAGNITUDE_BANDS = {"STRONG", "MODERATE", "WEAK", "NEUTRAL"}
CONFIDENCE_CLASSES = {"CORROBORATED", "STAMPED", "STRUCTURAL", "QUALITATIVE"}
VERDICTS = {"PENDING", "SUPPORTED", "REFUTED", "UNRESOLVED"}
GRADED_VERDICTS = {"SUPPORTED", "REFUTED", "UNRESOLVED"}
MISS_CLASSES = {"NONE", "SMALL", "MODERATE", "LARGE"}
REFUTED_MISS_CLASSES = {"SMALL", "MODERATE", "LARGE"}

# Fields that define the premise itself. Across a premise's chain these
# must be byte-identical from record to record; only grading fields move.
IMMUTABLE_FIELDS = ["premise_id", "game_key", "premise_type", "subject",
                    "statement", "direction", "magnitude_band",
                    "confidence_class", "stated_uncertainty", "evidence",
                    "sources", "as_of"]

# The bridge model's confidence classes are mechanical; these phrases are
# the bridge package README's own definitions, used so a bridge premise's
# stated_uncertainty is recorded in the source's own terms.
BRIDGE_CLASS_MEANING = {
    "CORROBORATED": "evidence spans >= 2 edge types",
    "STAMPED": ">= 1 stamped edge",
    "STRUCTURAL": "timeless facts only",
}


class Refusal(Exception):
    """A grading/ingest/validation refusal. Fail closed, always."""


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------

def load_schema():
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def _type_ok(value, types):
    for t in types:
        if t == "string" and isinstance(value, str):
            return True
        if t == "integer" and isinstance(value, int) and not isinstance(value, bool):
            return True
        if t == "object" and isinstance(value, dict):
            return True
        if t == "array" and isinstance(value, list):
            return True
        if t == "null" and value is None:
            return True
    return False


def validate_record(rec, schema):
    """Validate one record against the schema subset + grading rules.
    Returns a list of error strings (empty = valid)."""
    errs = []
    if not isinstance(rec, dict):
        return ["record is not a JSON object"]
    props = schema["properties"]
    for field in schema["required"]:
        if field not in rec:
            errs.append(f"missing required field: {field}")
    for field in rec:
        if field not in props:
            errs.append(f"unexpected field: {field}")
    if errs:
        return errs

    def types_of(field):
        t = props[field]["type"]
        return t if isinstance(t, list) else [t]

    for field, spec in props.items():
        if field not in rec:
            continue
        value = rec[field]
        if "type" in spec and not _type_ok(value, types_of(field)):
            errs.append(f"{field}: wrong type (got {type(value).__name__})")
            continue
        if "enum" in spec and value not in spec["enum"]:
            errs.append(f"{field}: {value!r} not in enum {spec['enum']}")
        if "const" in spec and value != spec["const"]:
            errs.append(f"{field}: must equal {spec['const']!r}")
        if spec.get("type") == "string" and spec.get("minLength") == 1 \
                and isinstance(value, str) and not value.strip():
            errs.append(f"{field}: must be a non-empty string")
        if spec.get("type") == "integer" and "minimum" in spec \
                and isinstance(value, int) and value < spec["minimum"]:
            errs.append(f"{field}: below minimum {spec['minimum']}")

    for coll in ("evidence", "sources"):
        items = rec.get(coll)
        if isinstance(items, list):
            if len(items) < 1:
                errs.append(f"{coll}: must contain at least one link")
            item_props = props[coll]["items"]["properties"]
            for i, item in enumerate(items):
                if not isinstance(item, dict):
                    errs.append(f"{coll}[{i}]: not an object")
                    continue
                for req in props[coll]["items"]["required"]:
                    if req not in item:
                        errs.append(f"{coll}[{i}]: missing {req}")
                for key in item:
                    if key not in item_props:
                        errs.append(f"{coll}[{i}]: unexpected key {key}")
                for key in ("kind", "ref"):
                    if key in item and (not isinstance(item[key], str)
                                       or not item[key].strip()):
                        errs.append(f"{coll}[{i}].{key}: must be non-empty")
    outcome = rec.get("outcome")
    if isinstance(outcome, dict):
        for req in ("verdict", "realized_fact", "outcome_artifact"):
            if req not in outcome:
                errs.append(f"outcome: missing {req}")
        for key in outcome:
            if key not in ("verdict", "realized_fact", "outcome_artifact"):
                errs.append(f"outcome: unexpected key {key}")

    # Cross-field grading discipline.
    status, verdict = rec.get("status"), (outcome or {}).get("verdict")
    if isinstance(outcome, dict) and verdict is not None:
        if status == "PENDING":
            if verdict != "PENDING":
                errs.append("status PENDING but outcome.verdict is not PENDING")
            for f in ("graded_at", "grader_id", "miss_magnitude_class"):
                if rec.get(f) is not None:
                    errs.append(f"PENDING record must have {f} = null")
            for f in ("realized_fact", "outcome_artifact"):
                if outcome.get(f) is not None:
                    errs.append(f"PENDING record must have outcome.{f} = null")
        elif status == "GRADED":
            if verdict not in GRADED_VERDICTS:
                errs.append("GRADED record verdict must be SUPPORTED, "
                            "REFUTED, or UNRESOLVED")
            if not (isinstance(outcome.get("realized_fact"), str)
                    and outcome["realized_fact"].strip()):
                errs.append("GRADED record needs a non-empty "
                            "outcome.realized_fact (the realized fact from "
                            "the outcome artifact)")
            if not (isinstance(outcome.get("outcome_artifact"), str)
                    and outcome["outcome_artifact"].strip()):
                errs.append("GRADED record needs outcome.outcome_artifact "
                            "(no grading from memory or prose)")
            if rec.get("graded_at") is None:
                errs.append("GRADED record needs graded_at")
            if rec.get("grader_id") is None:
                errs.append("GRADED record needs grader_id")
            miss = rec.get("miss_magnitude_class")
            if verdict == "REFUTED" and miss not in REFUTED_MISS_CLASSES:
                errs.append("REFUTED record needs miss_magnitude_class in "
                            "SMALL/MODERATE/LARGE")
            if verdict == "SUPPORTED" and miss != "NONE":
                errs.append("SUPPORTED record needs miss_magnitude_class "
                            "= NONE")
            if verdict == "UNRESOLVED" and miss is not None:
                errs.append("UNRESOLVED record needs miss_magnitude_class "
                            "= null (no miss is established)")
    return errs


def read_ledger(path):
    records = []
    for lineno, line in enumerate(Path(path).read_text(encoding="utf-8")
                                  .splitlines(), start=1):
        if not line.strip():
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError as e:
            raise Refusal(f"{path}:{lineno}: invalid JSON: {e}")
    return records


def validate_ledger(path):
    """Full-ledger validation: per-record schema + chain integrity.
    Returns a list of error strings (empty = valid)."""
    schema = load_schema()
    try:
        records = read_ledger(path)
    except Refusal as e:
        return [str(e)]
    errs = []
    seqs = [r.get("ledger_seq") for r in records]
    if seqs != list(range(1, len(records) + 1)):
        errs.append("ledger_seq must run 1..N in file order "
                    "(append-only chain broken)")
    chains = {}
    for rec in records:
        errs.extend(f"{rec.get('premise_id', '?')} seq "
                    f"{rec.get('ledger_seq')}: {e}"
                    for e in validate_record(rec, schema))
        chains.setdefault(rec.get("premise_id"), []).append(rec)
    for premise_id, chain in chains.items():
        if len(chain) > 2:
            errs.append(f"{premise_id}: {len(chain)} records — v1 allows a "
                        "PENDING record plus at most one GRADED record "
                        "(no re-grading)")
            continue
        if chain[0].get("status") != "PENDING":
            errs.append(f"{premise_id}: first record must be PENDING")
        if len(chain) == 2:
            if chain[1].get("status") != "GRADED":
                errs.append(f"{premise_id}: second record must be GRADED")
            for f in IMMUTABLE_FIELDS:
                if chain[0].get(f) != chain[1].get(f):
                    errs.append(f"{premise_id}: grading rewrote immutable "
                                f"field {f} — a grade never rewrites a "
                                "premise")
    return errs


def fold(records):
    """Current state: the last record per premise_id, in first-seen order."""
    state, order = {}, []
    for rec in records:
        pid = rec["premise_id"]
        if pid not in state:
            order.append(pid)
        state[pid] = rec
    return [state[pid] for pid in order]


# --------------------------------------------------------------------------
# Ingest: bridge premises + read extractions -> PENDING ledger records
# --------------------------------------------------------------------------

def _pending_record(**fields):
    rec = {
        "record_version": RECORD_VERSION,
        "status": "PENDING",
        "outcome": {"verdict": "PENDING", "realized_fact": None,
                    "outcome_artifact": None},
        "miss_magnitude_class": None,
        "graded_at": None,
        "grader_id": None,
    }
    rec.update(fields)
    return rec


def bridge_records(doc):
    out = []
    game = doc["game"]
    for p in doc["premises"]:
        cc = p["confidence_class"]
        stated = (
            f"Bridge confidence class {cc} (mechanical: "
            f"{BRIDGE_CLASS_MEANING.get(cc, 'as defined by the bridge')}); "
            f"magnitude band {p['magnitude_band']} bands the scalar's own "
            "extremity, not a fitted effect size."
        )
        evidence = [{
            "kind": "graph_edge",
            "ref": ev["edge_id"],
            "as_of": ev["as_of"],
            "detail": f"edge_type {ev['edge_type']}; source "
                      f"{ev['source']['kind']}: {ev['source']['ref']}",
        } for ev in p["evidence"]]
        notes = (f"Produced by bridge rule {p['trace']['rule_id']} "
                 f"v{p['trace']['rule_version']}; registered signals: "
                 f"{', '.join(p['trace']['registered_signals'])}.")
        if p["as_of"] is None:
            notes += (" Source as_of is null: every evidence edge is "
                      "timeless (venue static); the premise was visible at "
                      f"the bridge's read_at {doc['read_at']}.")
        out.append(_pending_record(
            premise_id=p["premise_id"],
            game_key=game,
            premise_type=p["trace"]["rule_id"],
            subject=p["subject"],
            statement=p["statement"],
            direction=p["direction"],
            magnitude_band=p["magnitude_band"],
            confidence_class=cc,
            stated_uncertainty=stated,
            evidence=evidence,
            sources=[{
                "kind": "bridge_model",
                "ref": "intelligence/situational-graph/bridge/instances/"
                       "2026-week06-sea-at-den.premises.json "
                       "(branch motif/bridge-model-2026-10-15 @ 330b758; "
                       "vendored copy at inputs/"
                       "2026-week06-sea-at-den.bridge-premises.json)",
                "source_premise_id": p["premise_id"],
            }],
            as_of=p["as_of"],
            notes=notes,
        ))
    return out


def read_records(doc):
    out = []
    game = doc["source"]["game"]
    for p in doc["premises"]:
        out.append(_pending_record(
            premise_id=p["source_premise_id"],
            game_key=game,
            premise_type=p["type"],
            subject=p["subject"],
            statement=p["statement"],
            direction=p["direction"],
            magnitude_band=p["magnitude_band"],
            confidence_class=p["confidence_class"],
            stated_uncertainty=p["stated_uncertainty"],
            evidence=p["evidence"],
            sources=[{
                "kind": doc["source"]["kind"],
                "ref": doc["source"]["ref"],
                "source_premise_id": p["source_premise_id"],
            }],
            as_of=p["as_of"],
            notes=p["notes"],
        ))
    return out


def merge_records(primary, extra):
    """Link a read-extracted premise onto the bridge record for the same
    (game_key, premise_type): one record, two sources — never two rows."""
    if primary["direction"] != extra["direction"]:
        raise Refusal(
            f"dedupe conflict on ({primary['game_key']}, "
            f"{primary['premise_type']}): bridge direction "
            f"{primary['direction']} vs read direction "
            f"{extra['direction']} — a human resolves this, not the scorer")
    merged = dict(primary)
    merged["sources"] = primary["sources"] + extra["sources"]
    merged["evidence"] = primary["evidence"] + extra["evidence"]
    merged["stated_uncertainty"] = (
        primary["stated_uncertainty"]
        + " || Corroborating Layer 2 read, in its own words: "
        + extra["stated_uncertainty"])
    merged["notes"] = (
        primary["notes"]
        + f" DEDUPED: the Layer 2 read's {extra['premise_type']} premise "
          f"({extra['premise_id']}) states the same premise for this game; "
          "it is linked here as a second source, not double-counted. "
        + extra["notes"])
    return merged


def ingest(bridge_path, reads_path, out_path):
    bridge_doc = json.loads(Path(bridge_path).read_text(encoding="utf-8"))
    records = bridge_records(bridge_doc)
    if reads_path:
        read_doc = json.loads(Path(reads_path).read_text(encoding="utf-8"))
        by_key = {(r["game_key"], r["premise_type"]): r for r in records}
        for extra in read_records(read_doc):
            key = (extra["game_key"], extra["premise_type"])
            if key in by_key:
                merged = merge_records(by_key[key], extra)
                records[records.index(by_key[key])] = merged
                by_key[key] = merged
            else:
                records.append(extra)
                by_key[key] = extra
    records.sort(key=lambda r: r["premise_id"])
    for i, rec in enumerate(records, start=1):
        rec["ledger_seq"] = i
    schema = load_schema()
    for rec in records:
        errs = validate_record(rec, schema)
        if errs:
            raise Refusal(f"ingest produced an invalid record "
                          f"{rec['premise_id']}: {errs}")
    with open(out_path, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, sort_keys=True, ensure_ascii=False)
                    + "\n")
    return records


# --------------------------------------------------------------------------
# Grade: append a GRADED record transcribed from an outcome artifact
# --------------------------------------------------------------------------

def grade(ledger_path, premise_id, artifact_path, grader_id):
    artifact_file = Path(artifact_path)
    if not artifact_file.exists():
        raise Refusal(f"outcome artifact absent: {artifact_path} — a "
                      "premise cannot be graded without the game's "
                      "outcome artifact")
    try:
        artifact = json.loads(artifact_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise Refusal(f"outcome artifact is not valid JSON: {e}")
    records = read_ledger(ledger_path)
    current = {r["premise_id"]: r for r in fold(records)}
    if premise_id not in current:
        raise Refusal(f"premise not in ledger: {premise_id}")
    base = current[premise_id]
    if base["status"] == "GRADED":
        raise Refusal(f"{premise_id} is already graded — v1 does not "
                      "re-grade; corrections are a new premise")
    if artifact.get("game_key") != base["game_key"]:
        raise Refusal(f"outcome artifact game_key "
                      f"{artifact.get('game_key')!r} does not match the "
                      f"premise's game {base['game_key']!r}")
    verdict = artifact.get("verdict")
    if verdict not in GRADED_VERDICTS:
        raise Refusal(f"outcome artifact verdict must be one of "
                      f"{sorted(GRADED_VERDICTS)}, got {verdict!r}")
    realized = artifact.get("realized_fact")
    if not (isinstance(realized, str) and realized.strip()):
        raise Refusal("outcome artifact needs a non-empty realized_fact")
    miss = artifact.get("miss_magnitude_class")
    if verdict == "REFUTED" and miss not in REFUTED_MISS_CLASSES:
        raise Refusal("a REFUTED grade needs miss_magnitude_class in "
                      "SMALL/MODERATE/LARGE, from the outcome artifact")
    if verdict == "SUPPORTED":
        miss = "NONE"
    if verdict == "UNRESOLVED":
        miss = None
    graded = dict(base)
    graded["ledger_seq"] = len(records) + 1
    graded["status"] = "GRADED"
    graded["outcome"] = {
        "verdict": verdict,
        "realized_fact": realized,
        "outcome_artifact": str(artifact_path),
    }
    graded["miss_magnitude_class"] = miss
    graded["graded_at"] = artifact.get("graded_at")
    graded["grader_id"] = grader_id
    extra_notes = artifact.get("notes")
    graded["notes"] = base["notes"] + (
        f" GRADED from outcome artifact {artifact_path}: {extra_notes}"
        if extra_notes else f" GRADED from outcome artifact {artifact_path}.")
    errs = validate_record(graded, load_schema())
    if errs:
        raise Refusal(f"graded record would be invalid: {errs}")
    with open(ledger_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(graded, sort_keys=True, ensure_ascii=False)
                + "\n")
    return graded


# --------------------------------------------------------------------------
# Report: the ledger's standing aggregates
# --------------------------------------------------------------------------

def report(records):
    state = fold(records)
    by_type, by_class = {}, {}
    totals = {"premises": len(state), "PENDING": 0, "SUPPORTED": 0,
              "REFUTED": 0, "UNRESOLVED": 0}
    for rec in state:
        verdict = rec["outcome"]["verdict"]
        key = verdict if rec["status"] == "GRADED" else "PENDING"
        totals[key] += 1
        t = by_type.setdefault(rec["premise_type"],
                               {"PENDING": 0, "SUPPORTED": 0, "REFUTED": 0,
                                "UNRESOLVED": 0})
        t[verdict if rec["status"] == "GRADED" else "PENDING"] += 1
        c = by_class.setdefault(rec["confidence_class"],
                                {"PENDING": 0, "SUPPORTED": 0, "REFUTED": 0,
                                 "UNRESOLVED": 0})
        c[verdict if rec["status"] == "GRADED" else "PENDING"] += 1
    calibration = {}
    for cc, counts in sorted(by_class.items()):
        decisive = counts["SUPPORTED"] + counts["REFUTED"]
        calibration[cc] = {
            **counts,
            "decisive": decisive,
            # Empty cells stay empty: with no decisive grades the support
            # rate is null, never smoothed, never imputed.
            "support_rate": (counts["SUPPORTED"] / decisive
                             if decisive else None),
        }
    return {"totals": totals,
            "by_premise_type": dict(sorted(by_type.items())),
            "calibration_by_confidence_class": calibration}


def report_text(rep):
    lines = ["Premise-grading ledger — standing aggregates", ""]
    t = rep["totals"]
    lines.append(f"Premises: {t['premises']}  |  PENDING {t['PENDING']}  "
                 f"SUPPORTED {t['SUPPORTED']}  REFUTED {t['REFUTED']}  "
                 f"UNRESOLVED {t['UNRESOLVED']}")
    lines.append("")
    lines.append("By premise type (PENDING / SUPPORTED / REFUTED / "
                 "UNRESOLVED):")
    for ptype, c in rep["by_premise_type"].items():
        lines.append(f"  {ptype}: {c['PENDING']} / {c['SUPPORTED']} / "
                     f"{c['REFUTED']} / {c['UNRESOLVED']}")
    lines.append("")
    lines.append("Calibration — stated confidence class vs realized "
                 "support rate")
    lines.append("(support rate = SUPPORTED / (SUPPORTED + REFUTED); "
                 "UNRESOLVED excluded; — = no decisive grades yet, the "
                 "cell stays empty):")
    for cc, c in rep["calibration_by_confidence_class"].items():
        rate = f"{c['support_rate']:.3f}" if c["support_rate"] is not None \
            else "—"
        lines.append(f"  {cc}: support rate {rate}  (supported "
                     f"{c['SUPPORTED']}, refuted {c['REFUTED']}, "
                     f"unresolved {c['UNRESOLVED']}, pending "
                     f"{c['PENDING']})")
    return "\n".join(lines)


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    sub = ap.add_subparsers(dest="cmd", required=True)
    p_in = sub.add_parser("ingest")
    p_in.add_argument("--bridge", required=True)
    p_in.add_argument("--reads")
    p_in.add_argument("--out", required=True)
    p_v = sub.add_parser("validate")
    p_v.add_argument("ledger")
    p_g = sub.add_parser("grade")
    p_g.add_argument("ledger")
    p_g.add_argument("--premise-id", required=True)
    p_g.add_argument("--outcome-artifact", required=True)
    p_g.add_argument("--grader-id", required=True)
    p_r = sub.add_parser("report")
    p_r.add_argument("ledger")
    p_r.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    try:
        if args.cmd == "ingest":
            records = ingest(args.bridge, args.reads, args.out)
            pending = sum(1 for r in records if r["status"] == "PENDING")
            print(f"ingested {len(records)} premise records "
                  f"({pending} PENDING) -> {args.out}")
        elif args.cmd == "validate":
            errs = validate_ledger(args.ledger)
            if errs:
                for e in errs:
                    print(f"INVALID: {e}")
                return 1
            records = read_ledger(args.ledger)
            print(f"valid: {len(records)} records, "
                  f"{len(fold(records))} premises")
        elif args.cmd == "grade":
            graded = grade(args.ledger, args.premise_id,
                           args.outcome_artifact, args.grader_id)
            print(f"graded {graded['premise_id']}: "
                  f"{graded['outcome']['verdict']}")
        elif args.cmd == "report":
            rep = report(read_ledger(args.ledger))
            print(json.dumps(rep, indent=2, sort_keys=True) if args.json
                  else report_text(rep))
    except Refusal as e:
        print(f"REFUSAL: {e}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())

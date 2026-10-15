"""
grammar.py — GSE Adjustment Layer v1: the Layer-2 adjustment grammar
(stdlib only).

Implements the Total-Signal Wiring Spec's rule shape, kept literally:

    TRIGGER -> AFFECTED -> DIRECTION -> MAGNITUDE -> LOG

Source spec: docs/research/2026-09-27/total-signal-wiring-spec.md,
"Signal taxonomy v1 — adjustment rules" (7 families). The machine-readable
family definitions live in families.json beside this file; every trigger
number that the spec does not state is a named parameter in that file
carrying its provenance and a SPEC_GAP flag. Nothing here invents a
magnitude: the spec fixes the shape and leaves the numbers to backtests
(build-order step 6), so every emitted record carries a qualitative
magnitude BAND from the spec's own words, `magnitude: None`, and
`calibrated: False`.

What this engine is
-------------------
A reasoning-layer (Layer 2) grammar. It consumes STAMPED situational
inputs — situational-graph edges (branch motif/situational-graph-v1-2026-10-15,
intelligence/situational-graph/) plus stamped template rows (injury reports,
depth-chart movements, weather, market lines, travel) — evaluates each
family's TRIGGER point-in-time, and emits adjustment RECORDS into a shadow
adjustment ledger (see ledger.py). Records are reasoning artifacts at
weight 0. They do NOT modify any distribution, price, projection, or
emission, and this module contains no application path: the seam where a
cleared gate would one day let adjustments touch a candidate is a named,
unconnected interface in apply_seam.py, which this module never imports.

PIT (point-in-time) semantics
-----------------------------
Every input carries `source` and `as_of` (when the fact became knowable).
An input can fire a pregame adjustment only if it was knowable at the
read time AND stamped strictly before kickoff. Inputs stamped at/after
kickoff, or after the read time, are REFUSED (fail-closed) and reported
in the run's `refused` list — the same discipline the situational graph
applies (graph.visible_at; the walk-forward diagnostics'
ril_injury_after_kickoff precedent). Timestamps compare as instants;
date-only stamps read as the start of that UTC date.

Emission fence
--------------
Records are validated before emission against the same forbidden-key set
the situational graph enforces (crps / pick / probability / emission / …),
plus `projection` (the spec's affected vocabulary uses the word; record
targets are renamed so the fence can be absolute). A record also pins
weight == 0, magnitude is None, calibrated is False. Any violation raises
instead of emitting.
"""

import hashlib
import json
import os
from datetime import datetime, timezone

SCHEMA = "gse-adjustment-record/1.0"
FAMILIES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "families.json")

# The graph's forbidden set (intelligence/situational-graph/graph.py),
# extended with the words this layer must never carry either.
FORBIDDEN_KEYS = {
    "crps", "pick", "picks", "parlay", "parlays", "emission",
    "win_probability", "probability", "ev", "expected_value", "bet",
    "projection", "price", "adjusted_value",
}

DIRECTIONS = {"UP", "DOWN", "VARIANCE"}
BANDS = {"SLIGHT", "TICK", "PLAIN", "UNSPECIFIED"}


# --------------------------------------------------------------------------
# time handling
# --------------------------------------------------------------------------

def parse_time(value):
    """ISO date or datetime -> aware datetime (UTC). Date-only reads as
    the start of that UTC date; naive datetimes are read as UTC."""
    if value is None:
        return None
    text = str(value).strip()
    if len(text) == 10 and text[4] == "-" and text[7] == "-":
        dt = datetime.fromisoformat(text)
        return dt.replace(tzinfo=timezone.utc)
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    dt = datetime.fromisoformat(text)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def iso_z(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# --------------------------------------------------------------------------
# families
# --------------------------------------------------------------------------

def load_families(path=FAMILIES_FILE):
    with open(path) as f:
        doc = json.load(f)
    return {fam["id"]: fam for fam in doc["families"]}


# --------------------------------------------------------------------------
# fence
# --------------------------------------------------------------------------

def _walk_keys(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield k
            yield from _walk_keys(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from _walk_keys(item)


def fence_problems(record):
    """Return a list of fence violations for a candidate record."""
    problems = []
    for key in _walk_keys(record):
        if key in FORBIDDEN_KEYS:
            problems.append("record carries forbidden key %r" % key)
    if record.get("weight") != 0:
        problems.append("record weight is not 0")
    if record.get("magnitude") is not None:
        problems.append("record magnitude is not null (numbers are backtest work, not grammar work)")
    if record.get("calibrated") is not False:
        problems.append("record calibrated flag is not false")
    if record.get("direction") not in DIRECTIONS:
        problems.append("record direction %r is not in the grammar vocabulary" % record.get("direction"))
    if record.get("magnitude_band") not in BANDS:
        problems.append("record magnitude_band %r is not in the grammar vocabulary" % record.get("magnitude_band"))
    return problems


# --------------------------------------------------------------------------
# input visibility (PIT)
# --------------------------------------------------------------------------

def _pit_classify(item, kind_label, read_at_dt, kickoff_dt, refused):
    """Return True if the item may be used by this pregame read.
    Refusals are recorded, never silent."""
    as_of = item.get("as_of")
    if as_of is None:
        return True  # timeless reference data (e.g. venue elevation)
    as_of_dt = parse_time(as_of)
    if as_of_dt >= kickoff_dt:
        refused.append({
            "input": kind_label,
            "ref": item.get("id") or item.get("player") or item.get("kind"),
            "as_of": as_of,
            "reason": "stamped at/after kickoff; a pregame adjustment cannot use it (fail-closed)",
        })
        return False
    if as_of_dt > read_at_dt:
        refused.append({
            "input": kind_label,
            "ref": item.get("id") or item.get("player") or item.get("kind"),
            "as_of": as_of,
            "reason": "stamped after the read time; not yet knowable at read_at",
        })
        return False
    return True


def visible_inputs(bundle, refused):
    """Split the input bundle into what this read may use."""
    read_at_dt = parse_time(bundle["read_at"])
    kickoff_dt = parse_time(bundle["game"]["kickoff_utc"])
    edges, templates = [], []
    for edge in bundle.get("graph_edges", []):
        if _pit_classify(edge, "graph_edge", read_at_dt, kickoff_dt, refused):
            edges.append(edge)
    for row in bundle.get("templates", []):
        if _pit_classify(row, "template:" + str(row.get("kind")), read_at_dt, kickoff_dt, refused):
            templates.append(row)
    return edges, templates


# --------------------------------------------------------------------------
# record construction
# --------------------------------------------------------------------------

def _record_id(game_id, family_id, trigger_key, target):
    basis = "|".join([game_id, family_id, trigger_key, target])
    return "adj:" + hashlib.sha256(basis.encode("utf-8")).hexdigest()[:16]


def make_record(bundle, family, trigger_key, trigger_summary, evidence,
                input_ref, input_as_of, affected, direction, band,
                log_text, extra_flags=None):
    record = {
        "record_id": _record_id(bundle["game"]["game_id"], family["id"], trigger_key, affected["target"]),
        "schema": SCHEMA,
        "layer": 2,
        "weight": 0,
        "game_id": bundle["game"]["game_id"],
        "family": family["id"],
        "family_name": family["name"],
        "trigger": {
            "summary": trigger_summary,
            "evidence": evidence,
            "input_ref": input_ref,
            "as_of": input_as_of,
        },
        "affected": affected,
        "direction": direction,
        "magnitude_band": band,
        "magnitude": None,
        "calibrated": False,
        "log": log_text,
        "pit": {
            "read_at": bundle["read_at"],
            "kickoff_utc": bundle["game"]["kickoff_utc"],
            "input_as_of": input_as_of,
        },
        "emitted_at": bundle["read_at"],
    }
    if extra_flags:
        record["flags"] = extra_flags
    problems = fence_problems(record)
    if problems:
        raise ValueError("adjustment record failed the fence: %s" % problems)
    return record


def _emit_family(bundle, family, trigger_key, trigger_summary, evidence,
                 input_ref, input_as_of, affected_rows, log_text):
    """One record per affected item in the family's spec list."""
    out = []
    for aff in family["affected"]:
        affected = dict(affected_rows)
        affected["target"] = aff["target"]
        affected["scope"] = aff["scope"]
        if aff.get("note"):
            affected["note"] = aff["note"]
        out.append(make_record(
            bundle, family, trigger_key, trigger_summary, evidence,
            input_ref, input_as_of, affected, aff["direction"], aff["band"],
            log_text, extra_flags=aff.get("flags")))
    return out


def _opponent(game, team):
    if team == game["home_team"]:
        return game["away_team"]
    if team == game["away_team"]:
        return game["home_team"]
    return None


# --------------------------------------------------------------------------
# family evaluators — each returns (records, diagnostics)
# --------------------------------------------------------------------------

def _eval_injury_family(bundle, family, templates, position_match):
    """Shared evaluator for the three injury families (rules 1-3).

    position_match(row) -> bool decides whether a row is in the family's
    position group."""
    trig = family["trigger"]
    records, diagnostics = [], []
    rows = [r for r in templates if r.get("kind") == "injury_report"]
    qualifying = []
    for row in rows:
        if row.get("position") is None:
            continue  # reported once at engine level, not per family
        if not position_match(row):
            continue
        if trig.get("starter_required") and not row.get("starter"):
            diagnostics.append({
                "family": family["id"], "outcome": "not_fired",
                "detail": "%s (%s) is not a designated starter in the source; spec trigger requires a starter" % (row.get("player"), row.get("position")),
            })
            continue
        if row.get("status") not in trig["statuses"]:
            diagnostics.append({
                "family": family["id"], "outcome": "not_fired",
                "detail": "%s (%s) status %s is outside this family's trigger statuses %s" % (
                    row.get("player"), row.get("position"), row.get("status"), trig["statuses"]),
            })
            continue
        qualifying.append(row)
    if not qualifying and not any(d["family"] == family["id"] for d in diagnostics):
        diagnostics.append({
            "family": family["id"], "outcome": "not_fired",
            "detail": "no qualifying %s injury rows among the visible stamped inputs" % "/".join(trig.get("positions", [])),
        })
    for row in qualifying:
        team = row["team"]
        opp = _opponent(bundle["game"], team)
        trigger_key = "injury:%s:%s" % (team, row.get("player"))
        summary = "%s (%s, %s) %s — %s" % (
            row.get("player"), row.get("position"),
            row.get("depth_role") or "starter", row.get("status"),
            row.get("detail") or "per stamped injury report")
        evidence = {
            "player": row.get("player"), "position": row.get("position"),
            "depth_role": row.get("depth_role"), "status": row.get("status"),
            "detail": row.get("detail"), "team": team,
            "replacement": row.get("replacement"),
        }
        log_text = "%s LOG (fields per spec: %s) — %s" % (
            family["name"], ", ".join(family["log_fields"]), summary)
        for aff in family["affected"]:
            aff_team = row["team"] if aff["scope"].startswith("trigger_team") else opp
            affected = {
                "team": aff_team,
                "scope": aff["scope"],
                "target": aff["target"],
                "trigger_team": team,
                "opponent": opp,
            }
            if aff.get("note"):
                affected["note"] = aff["note"]
            records.append(make_record(
                bundle, family, trigger_key, summary, evidence,
                row.get("source"), row.get("as_of"), affected,
                aff["direction"], aff["band"], log_text,
                extra_flags=aff.get("flags")))
    return records, diagnostics


def eval_ol_injury(bundle, family, templates):
    trig = family["trigger"]
    return _eval_injury_family(
        bundle, family, templates,
        lambda row: row.get("position") in trig["positions"])


def eval_secondary_injury(bundle, family, templates):
    trig = family["trigger"]
    return _eval_injury_family(
        bundle, family, templates,
        lambda row: row.get("position") in trig["positions"])


def eval_pass_rush_injury(bundle, family, templates):
    trig = family["trigger"]
    return _eval_injury_family(
        bundle, family, templates,
        lambda row: row.get("position") in trig["positions"])


def eval_depth_chart(bundle, family, templates):
    trig = family["trigger"]
    records, diagnostics = [], []
    rows = [r for r in templates
            if r.get("kind") == "depth_chart"
            and r.get("position") in trig["positions"]
            and r.get("event") in trig["events"]]
    if not rows:
        diagnostics.append({
            "family": family["id"], "outcome": "not_fired",
            "detail": "no stamped depth-chart movement rows (elevation / snap jump / bellcow / consolidation) among the visible inputs",
        })
    for row in rows:
        beneficiary = row.get("beneficiary") or {}
        trigger_key = "depth:%s:%s:%s" % (row["team"], row.get("position"), row.get("event"))
        cause = row.get("cause") or {}
        summary = "%s %s — %s (cause: %s, %s, %s)" % (
            row["team"], row.get("position"), row.get("event"),
            cause.get("player"), cause.get("role"), cause.get("status"))
        evidence = {
            "team": row["team"], "position": row.get("position"),
            "event": row.get("event"), "beneficiary": beneficiary, "cause": cause,
        }
        log_text = "Skill-position depth chart movement LOG — %s: %s." % (
            ", ".join(family["log_fields"]), summary)
        affected_rows = {
            "team": row["team"],
            "beneficiary_slot": beneficiary.get("slot"),
            "beneficiary_player": beneficiary.get("player"),
        }
        records.extend(_emit_family(
            bundle, family, trigger_key, summary, evidence,
            row.get("source"), row.get("as_of"), affected_rows, log_text))
    return records, diagnostics


def eval_weather(bundle, family, templates):
    trig = family["trigger"]
    th = trig["thresholds"]
    records, diagnostics = [], []
    rows = [r for r in templates if r.get("kind") == "weather"]
    if not rows:
        diagnostics.append({
            "family": family["id"], "outcome": "not_fired",
            "detail": "no stamped weather row among the visible inputs (honest-empty: the family was not evaluated against invented weather)",
        })
        return records, diagnostics
    for row in rows:
        tripped = []
        wind = row.get("sustained_wind_mph")
        if wind is not None and wind >= th["wind_mph"]:
            tripped.append("sustained wind %s mph >= %s" % (wind, th["wind_mph"]))
        temp = row.get("temp_f")
        if temp is not None and (temp <= th["temp_low_f"] or temp >= th["temp_high_f"]):
            tripped.append("temperature %sF outside [%s, %s]" % (temp, th["temp_low_f"], th["temp_high_f"]))
        if not tripped:
            diagnostics.append({
                "family": family["id"], "outcome": "not_fired",
                "detail": "stamped weather evaluated: sustained wind %s, temp %sF, precip %s — no armed threshold tripped (precipitation sub-trigger is unarmed: no threshold in spec or registry)" % (
                    wind if wind is not None else "not reported (gusts %s mph)" % row.get("wind_gust_mph"),
                    temp, row.get("precip_probability")),
            })
            continue
        summary = "weather extreme: " + "; ".join(tripped)
        evidence = {
            "sustained_wind_mph": wind, "wind_gust_mph": row.get("wind_gust_mph"),
            "temp_f": temp, "precip_probability": row.get("precip_probability"),
            "thresholds": {"wind_mph": th["wind_mph"], "temp_low_f": th["temp_low_f"], "temp_high_f": th["temp_high_f"]},
        }
        log_text = "Weather LOG — %s: %s." % (", ".join(family["log_fields"]), summary)
        records.extend(_emit_family(
            bundle, family, "weather:" + bundle["game"]["game_id"], summary,
            evidence, row.get("source"), row.get("as_of"),
            {"team": None, "scope": "game"}, log_text))
    return records, diagnostics


def eval_game_script(bundle, family, templates):
    trig = family["trigger"]
    threshold = trig["thresholds"]["large_spread_abs"]
    records, diagnostics = [], []
    rows = [r for r in templates if r.get("kind") == "market_line"]
    if not rows:
        diagnostics.append({
            "family": family["id"], "outcome": "not_fired",
            "detail": "no stamped market-line row among the visible inputs",
        })
        return records, diagnostics
    game = bundle["game"]
    for row in rows:
        spread_home = row.get("spread_home")
        if spread_home is None or abs(spread_home) < threshold:
            diagnostics.append({
                "family": family["id"], "outcome": "not_fired",
                "detail": "stamped line evaluated: spread_home %s (|.| < %s large-spread parameter); total %s — totals sub-trigger unarmed (no threshold in spec or fleet encode)" % (
                    spread_home, threshold, row.get("total")),
            })
            continue
        if spread_home < 0:
            leading, trailing = game["home_team"], game["away_team"]
        else:
            leading, trailing = game["away_team"], game["home_team"]
        summary = "large spread: %s %+0.1f (home line) — %s leads, %s trails" % (
            game["home_team"], spread_home, leading, trailing)
        evidence = {
            "spread_home": spread_home, "total": row.get("total"),
            "leading_team": leading, "trailing_team": trailing,
            "large_spread_abs": threshold,
        }
        log_text = "Game script / Vegas LOG — %s: %s." % (", ".join(family["log_fields"]), summary)
        for aff in family["affected"]:
            affected = {
                "team": trailing if aff["scope"] == "trailing_team" else leading,
                "target": aff["target"], "scope": aff["scope"],
            }
            records.append(make_record(
                bundle, family, "script:%s" % game["game_id"], summary,
                evidence, row.get("source"), row.get("as_of"), affected,
                aff["direction"], aff["band"], log_text,
                extra_flags=aff.get("flags")))
    return records, diagnostics


def eval_off_field(bundle, family, edges, templates):
    records, diagnostics = [], []
    game = bundle["game"]
    fired = False
    # Sub-lane 1: altitude_short_week composite edge.
    for edge in edges:
        if edge.get("type") != "altitude_short_week":
            continue
        fired = True
        visitor = (edge.get("from") or "").replace("team:", "")
        value = edge.get("value") or {}
        summary = ("altitude + short week composite: visitor %s at %s ft on %s days rest (%s)"
                   % (visitor, value.get("venue_elevation_ft"),
                      value.get("visitor_rest_days"), value.get("basis")))
        evidence = {
            "lane": "altitude_short_week_composite",
            "edge_id": edge.get("id"), "edge_value": value,
            "direction_source": "fleet authored Layer-2 read of this composite (Grok WO-0, SEA@DEN, 2026-10-15): variance/friction vs the visitor, explicitly NOT a mean shift. The spec (rule 7) states no direction; this is recorded, not hidden.",
        }
        log_text = ("Off-field intake LOG — measurable: altitude_short_week composite; value: %s ft, visitor rest %s d; source + stamp: situational-graph edge %s, as_of %s."
                    % (value.get("venue_elevation_ft"), value.get("visitor_rest_days"),
                       edge.get("id"), edge.get("as_of")))
        records.extend(_emit_family(
            bundle, family, "offfield:altitude_short_week:%s" % visitor,
            summary, evidence, edge.get("source"), edge.get("as_of"),
            {"team": visitor, "subject": "visitor"}, log_text))
    # Sub-lane 2: rest differential.
    for edge in edges:
        if edge.get("type") != "rest_differential":
            continue
        value = edge.get("value") or {}
        diff = value.get("rest_diff_home_minus_away")
        if not diff:
            diagnostics.append({
                "family": family["id"], "outcome": "not_fired",
                "detail": "rest_differential edge evaluated: rest is symmetric (%s/%s days, diff 0); no rest record fires" % (
                    value.get("rest_home_days"), value.get("rest_away_days")),
            })
            continue
        fired = True
        shorter = game["home_team"] if diff < 0 else game["away_team"]
        summary = "rest differential: %s has %s fewer rest days (%s vs %s)" % (
            shorter, abs(diff), value.get("rest_home_days"), value.get("rest_away_days"))
        evidence = {"lane": "rest_differential", "edge_id": edge.get("id"), "edge_value": value}
        log_text = "Off-field intake LOG — measurable: rest days; value: diff %s; source + stamp: situational-graph edge %s, as_of %s." % (
            diff, edge.get("id"), edge.get("as_of"))
        records.extend(_emit_family(
            bundle, family, "offfield:rest:%s" % shorter, summary, evidence,
            edge.get("source"), edge.get("as_of"),
            {"team": shorter, "subject": "shorter_rest_team"}, log_text))
    # Sub-lane 3: travel distance rows.
    travel_rows = [r for r in templates if r.get("kind") == "travel"]
    if not travel_rows:
        diagnostics.append({
            "family": family["id"], "outcome": "not_fired",
            "detail": "travel-distance lane: no stamped travel row supplied; the lane honestly does not fire (no distance is invented)",
        })
    for row in travel_rows:
        fired = True
        summary = "travel: %s travels %s miles" % (row.get("team"), row.get("distance_miles"))
        evidence = {"lane": "travel_distance", "distance_miles": row.get("distance_miles"), "team": row.get("team")}
        log_text = "Off-field intake LOG — measurable: travel distance; value: %s miles; source + stamp: %s." % (
            row.get("distance_miles"), row.get("as_of"))
        records.extend(_emit_family(
            bundle, family, "offfield:travel:%s" % row.get("team"), summary,
            evidence, row.get("source"), row.get("as_of"),
            {"team": row.get("team"), "subject": "traveling_team"}, log_text))
    if not fired and not diagnostics:
        diagnostics.append({
            "family": family["id"], "outcome": "not_fired",
            "detail": "no measurable off-field lane fired",
        })
    return records, diagnostics


EVALUATORS = {
    "OL_INJURY": eval_ol_injury,
    "SECONDARY_INJURY": eval_secondary_injury,
    "PASS_RUSH_INJURY": eval_pass_rush_injury,
    "DEPTH_CHART": eval_depth_chart,
    "WEATHER": eval_weather,
    "GAME_SCRIPT": eval_game_script,
}


# --------------------------------------------------------------------------
# engine entry point
# --------------------------------------------------------------------------

def evaluate(bundle, families=None):
    """Run the grammar over one game's stamped inputs.

    bundle: {game: {game_id, home_team, away_team, kickoff_utc, gameday},
             read_at, graph_edges: [...], templates: [...]}
    Returns {records, diagnostics, refused}."""
    if families is None:
        families = load_families()
    refused = []
    edges, templates = visible_inputs(bundle, refused)
    records, diagnostics = [], []
    for row in templates:
        if row.get("kind") == "injury_report" and row.get("position") is None:
            diagnostics.append({
                "family": "INPUT", "outcome": "not_fired",
                "detail": "injury row for %s (%s, %s) carries no position in the source; carried as a non-triggering input and matched to no family" % (
                    row.get("player"), row.get("team"), row.get("status")),
            })
    for family_id, family in families.items():
        if family_id == "OFF_FIELD":
            recs, diags = eval_off_field(bundle, family, edges, templates)
        else:
            recs, diags = EVALUATORS[family_id](bundle, family, templates)
        records.extend(recs)
        diagnostics.extend(diags)
        if recs:
            diagnostics.append({
                "family": family_id, "outcome": "fired",
                "detail": "%d adjustment record(s) emitted at weight 0" % len(recs),
            })
    records.sort(key=lambda r: r["record_id"])
    return {"records": records, "diagnostics": diagnostics, "refused": refused}

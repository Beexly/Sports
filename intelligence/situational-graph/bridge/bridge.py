"""
bridge.py — GSE reasoning bridge v1 (census C-224). Stdlib only.

WHAT THIS IS
------------
The bridge the 2026-10-07 Comprehensive Architecture Audit named as missing:
the 47 registered signals produce descriptive context, and the pipeline had
no functional bridge converting their context scalars into directional
premises for the Layer 2 reasoning layer. This module is that bridge, built
to the fleet's current doctrine.

Inputs are STAMPED context scalars living in stamped homes — in v1, the
situational graph v1 (edge records {id, type, from, to, game, value, source,
as_of}). Outputs are directional premises:

    {premise_id, game, subject, kind, direction, magnitude_band,
     confidence_class, statement, evidence[], as_of,
     trace{rule_id, rule_version, registered_signals[]}}

A premise is a REASONING artifact. It is not a probability, not a pick, not
a score, and it feeds no emission: this package walks every input and every
output with the situational graph's forbidden-key rule (probability / pick /
crps / emission / ... at any depth) and refuses, fail-closed, on contact.
ZERO_OBJECT is untouched by anything here.

DIVERGENCE FROM THE 2026-10-07 AUDIT TEXT — recorded, not hidden
---------------------------------------------------------------
The audit's premise shape was {outcome, probability, sample_count,
homeSign}: it asked the bridge to emit directional win probabilities. The
fleet's standing Reasoning-Engine Doctrine (2026-10-15) supersedes that
shape: gates rule emission, the reasoning layer carries premises, and a
probability in a premise would be an emission wearing a premise's clothes.
This build therefore follows the audit on FUNCTION (registered signals'
context scalars in, directional premises out, no premise usable without an
active reasoning trace) and the doctrine on SHAPE (direction + magnitude
band + confidence class + evidence links + as_of; no probability field
exists anywhere in the output, and the fence rejects one if injected).

The audit's trace rule is implemented as select_premises(): a premise with
an empty evidence list, or citing an edge that is not in the source graph,
is REFUSED, never silently passed.

MAGNITUDE BANDS ARE NOT EFFECT SIZES
------------------------------------
A band describes the extremity of the input scalar on its own scale (days
of rest differential; feet above the graph's own altitude threshold), per
the versioned tables in rules.json. No band encodes a fitted win effect,
and no premise claims one. Bands exist so a read can weigh a 3-day rest
edge differently from a 0-day one without inventing a number.

PIT DISCIPLINE
--------------
build_premises(graph, read_at) sees only edges visible at read_at (the
graph's visible_at semantics: as_of null, or as_of <= read_at). An edge
stamped after read_at is EXCLUDED and NAMED in the output's pit_excluded
list — rejected, never consumed, never silently dropped. The premise
constructor enforces the same rule a second time: hand it a future-stamped
evidence edge and it raises BridgeRefusal (defense in depth).

GRAPH MODULE
------------
When the situational-graph package (graph.py @ motif/situational-graph-v1-
2026-10-15, db0ef37) is importable, this module uses its FORBIDDEN_VALUE_KEYS
and visible_at directly. On branches where the graph package has not landed
yet, it falls back to mirrors below; the mirrors are byte-equal copies of
graph.py's constants/semantics and the test-suite pins the local set.
"""

import json
import sys
from pathlib import Path

BRIDGE_NAME = "gse-bridge-model"
BRIDGE_VERSION = "1.1"  # 1.1 (branch motif/bridge-injury-rule-2026-10-15): injury_burden_differential rule,
# unlocked by the feed stamp fix (intelligence/providers/injury_stamps.py,
# branch motif/injury-feed-stamps-2026-10-15). v1 rules unchanged.

# --- situational graph constants: import the real module when present ----
try:  # pragma: no cover - exercised once the graph package shares the tree
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    import graph as _graph_mod  # type: ignore

    FORBIDDEN_VALUE_KEYS = set(_graph_mod.FORBIDDEN_VALUE_KEYS)

    def _visible_at(graph, at):
        return _graph_mod.visible_at(graph, at)

except Exception:  # graph package not on this branch yet: use the mirror
    FORBIDDEN_VALUE_KEYS = {
        "crps", "pick", "picks", "parlay", "parlays", "emission",
        "win_probability", "probability", "ev", "expected_value", "bet",
    }

    def _visible_at(graph, at):
        out = dict(graph)
        out["edges"] = [
            e for e in graph.get("edges", [])
            if e.get("as_of") is None or e["as_of"] <= at
        ]
        return out


class BridgeRefusal(Exception):
    """Fail-closed refusal: the bridge will not build on this input."""


def _walk_keys(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield k
            yield from _walk_keys(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from _walk_keys(item)


def assert_no_forbidden_keys(obj, where):
    """Raise BridgeRefusal if obj carries an emission-shaped key at depth."""
    for key in _walk_keys(obj):
        if key in FORBIDDEN_VALUE_KEYS:
            raise BridgeRefusal("%s carries forbidden emission key %r" % (where, key))


def load_rules(path):
    with open(path) as f:
        doc = json.load(f)
    return {rule["rule_id"]: rule for rule in doc["rules"]}


def _team_of(node_id):
    return node_id.split(":", 1)[1] if ":" in node_id else node_id


def _evidence(edge):
    return {
        "edge_id": edge["id"],
        "edge_type": edge["type"],
        "as_of": edge.get("as_of"),
        "source": edge.get("source"),
    }


def make_premise(*, premise_id, game, subject, kind, direction, magnitude_band,
                 statement, evidence_edges, rule, read_at):
    """Construct one premise, enforcing trace + PIT + fence a second time.

    evidence_edges are full edge records from the source graph. Every one
    must be visible at read_at: a future-stamped edge here is a hard
    refusal, not a filter decision.
    """
    if not evidence_edges:
        raise BridgeRefusal("premise %s has no evidence: no trace, no premise" % premise_id)
    for edge in evidence_edges:
        if edge.get("as_of") is not None and edge["as_of"] > read_at:
            raise BridgeRefusal(
                "premise %s cites edge %s stamped %s, after read_at %s"
                % (premise_id, edge["id"], edge["as_of"], read_at))
    evidence = sorted((_evidence(e) for e in evidence_edges), key=lambda e: e["edge_id"])
    edge_types = {e["edge_type"] for e in evidence}
    stamped = [e["as_of"] for e in evidence if e["as_of"] is not None]
    if len(edge_types) >= 2:
        confidence = "CORROBORATED"
    elif stamped:
        confidence = "STAMPED"
    else:
        confidence = "STRUCTURAL"
    premise = {
        "premise_id": premise_id,
        "game": game,
        "subject": subject,
        "kind": kind,
        "direction": direction,
        "magnitude_band": magnitude_band,
        "confidence_class": confidence,
        "statement": statement,
        "evidence": evidence,
        "as_of": max(stamped) if stamped else None,
        "trace": {
            "rule_id": rule["rule_id"],
            "rule_version": rule["rule_version"],
            "registered_signals": list(rule.get("registered_signals", [])),
        },
    }
    assert_no_forbidden_keys(premise, "premise %s" % premise_id)
    return premise


def select_premises(premises, graph):
    """The audit's trace rule, enforced: a premise is selectable only with
    an active reasoning trace — non-empty evidence, every cited edge
    present in the source graph. Returns (selected, refused)."""
    edge_ids = {e["id"] for e in graph.get("edges", [])}
    selected, refused = [], []
    for premise in premises:
        evidence = premise.get("evidence") or []
        if not evidence:
            refused.append({"premise_id": premise.get("premise_id"),
                            "reason": "empty evidence: no reasoning trace"})
            continue
        missing = [e["edge_id"] for e in evidence if e["edge_id"] not in edge_ids]
        if missing:
            refused.append({"premise_id": premise.get("premise_id"),
                            "reason": "evidence cites edges not in the source graph: %s" % missing})
            continue
        selected.append(premise)
    return selected, refused


# ---------------------------------------------------------------- rules ---

def _edges(graph, edge_type):
    return [e for e in graph.get("edges", []) if e["type"] == edge_type]


def _instance_game(graph):
    for node in graph.get("nodes", []):
        if node.get("kind") == "game":
            return node["id"].split(":", 1)[1]
    return None


def _state_edges(graph, team_id, state):
    return [e for e in graph.get("edges", [])
            if e["type"] == "has_state" and e.get("from") == team_id
            and e.get("to") == "state:%s" % state]


def _rule_rest(graph, game, rule, read_at, out):
    for edge in _edges(graph, "rest_differential"):
        v = edge["value"]
        diff = v["rest_diff_home_minus_away"]
        band = "NEUTRAL"
        for row in rule["bands"]:
            if "abs_days" in row and abs(diff) == row["abs_days"]:
                band = row["band"]
            if "abs_days_min" in row and abs(diff) >= row["abs_days_min"]:
                band = row["band"]
        direction = "NEUTRAL" if diff == 0 else ("FAVORS_HOME" if diff > 0 else "FAVORS_AWAY")
        home = _team_of(edge["from"])
        away = _team_of(edge["to"])
        evidence = [edge]
        evidence += _state_edges(graph, edge["from"], "SHORT_WEEK")
        evidence += _state_edges(graph, edge["to"], "SHORT_WEEK")
        statement = (
            "Rest is level: both teams on %d days (diff %+d, home perspective)."
            % (v["rest_home_days"], diff) if diff == 0 else
            "Rest differential %+d days (home perspective): %s %d days, %s %d days."
            % (diff, home, v["rest_home_days"], away, v["rest_away_days"]))
        out.append(make_premise(
            premise_id="premise:%s:rest_differential" % game,
            game=game, subject="game:%s" % game, kind=rule["kind"],
            direction=direction, magnitude_band=band, statement=statement,
            evidence_edges=evidence, rule=rule, read_at=read_at))


def _rule_altitude(graph, game, rule, read_at, out):
    for edge in _edges(graph, "altitude"):
        v = edge["value"]
        if not v.get("at_altitude"):
            continue
        exposure = v["venue_elevation_ft"] - v["threshold_ft"]
        band = "WEAK"
        for row in rule["bands"]:
            if "exposure_ft_min" in row and exposure >= row["exposure_ft_min"]:
                band = row["band"]
            elif "exposure_ft_max" in row and exposure <= row["exposure_ft_max"]:
                band = row["band"]
        visitor = edge["from"]
        evidence = [edge] + _state_edges(graph, visitor, "ALTITUDE_VISIT")
        out.append(make_premise(
            premise_id="premise:%s:altitude_exposure:%s" % (game, _team_of(visitor)),
            game=game, subject=visitor, kind=rule["kind"],
            direction="AGAINST_AWAY", magnitude_band=band,
            statement=("Visitor %s plays at %d ft, %d ft above the graph's %d ft "
                       "altitude threshold: an altitude-exposure burden on the visitor."
                       % (_team_of(visitor), v["venue_elevation_ft"], exposure, v["threshold_ft"])),
            evidence_edges=evidence, rule=rule, read_at=read_at))


def _rule_composite(graph, game, rule, read_at, out):
    for edge in _edges(graph, "altitude_short_week"):
        v = edge["value"]
        band = "WEAK"
        for row in rule["bands"]:  # ordered strongest-first; first match wins
            cond = row["condition"]
            if ">= 5000" in cond and v["venue_elevation_ft"] >= 5000 and v["visitor_rest_days"] <= 4:
                band = row["band"]
                break
            if ">= 4000" in cond and v["venue_elevation_ft"] >= 4000 and v["visitor_rest_days"] <= 5:
                band = row["band"]
                break
        visitor = edge["from"]
        evidence = [edge]
        for other in graph.get("edges", []):
            if other["type"] == "altitude" and other.get("from") == visitor:
                evidence.append(other)
        evidence += _state_edges(graph, visitor, "SHORT_WEEK")
        evidence += _state_edges(graph, visitor, "ALTITUDE_VISIT")
        out.append(make_premise(
            premise_id="premise:%s:altitude_short_week:%s" % (game, _team_of(visitor)),
            game=game, subject=visitor, kind=rule["kind"],
            direction="FRICTION", magnitude_band=band,
            statement=("Composite friction on visitor %s: at altitude (%d ft) on a short "
                       "week (%d days rest). Recorded as variance/friction on the "
                       "visitor, not as a mean shift."
                       % (_team_of(visitor), v["venue_elevation_ft"], v["visitor_rest_days"])),
            evidence_edges=evidence, rule=rule, read_at=read_at))


def _rule_short_week_game(graph, game, rule, read_at, out):
    teams = [n["id"] for n in graph.get("nodes", []) if n.get("kind") == "team"]
    per_team = {t: _state_edges(graph, t, "SHORT_WEEK") for t in teams}
    if len(teams) < 2 or not all(per_team[t] for t in teams):
        return
    rests = {t: per_team[t][0]["value"]["rest_days"] for t in teams}
    days = list(rests.values())
    if max(days) > 5:
        return
    band = "WEAK"
    for row in rule["bands"]:
        if "<= 4" in row["condition"] and max(days) <= 4:
            band = row["band"]
        elif "== 5" in row["condition"] and max(days) == 5:
            band = row["band"]
    evidence = [per_team[t][0] for t in teams]
    for t in teams:
        evidence += _state_edges(graph, t, "THURSDAY_GAME")
    out.append(make_premise(
        premise_id="premise:%s:short_week_game_context" % game,
        game=game, subject="game:%s" % game, kind=rule["kind"],
        direction="NEUTRAL", magnitude_band=band,
        statement=("Both teams play on a short week (%s): preparation is compressed "
                   "on both sides; the context takes no side."
                   % ", ".join("%s %d days" % (_team_of(t), rests[t]) for t in teams)),
        evidence_edges=evidence, rule=rule, read_at=read_at))


def _rule_coaching(graph, game, rule, read_at, out):
    for edge in _edges(graph, "coaching_change"):
        v = edge["value"]
        team = edge["from"]
        seasons = len(v.get("seasons_with_team", []))
        if not v.get("changed_this_season") and seasons >= 3:
            home = _home_team(graph)
            direction = "FAVORS_HOME" if team == home else "FAVORS_AWAY"
            out.append(make_premise(
                premise_id="premise:%s:coaching_continuity:%s" % (game, _team_of(team)),
                game=game, subject=team, kind=rule["kind"],
                direction=direction, magnitude_band="WEAK",
                statement=("%s continuity: %s %s has held the role since %s "
                           "(%d seasons with the team), no change this season — "
                           "a stability context premise, unweighted."
                           % (_team_of(team), v["role"], v["name"],
                              v["seasons_with_team"][0], seasons)),
                evidence_edges=[edge], rule=rule, read_at=read_at))
        elif v.get("changed_this_season"):
            out.append(make_premise(
                premise_id="premise:%s:coaching_change_friction:%s" % (game, _team_of(team)),
                game=game, subject=team, kind=rule["kind"],
                direction="FRICTION", magnitude_band="MODERATE",
                statement=("%s changed its %s this season (%s): a scheme-transition "
                           "friction premise on %s."
                           % (_team_of(team), v["role"], v["name"], _team_of(team))),
                evidence_edges=[edge], rule=rule, read_at=read_at))


def _rule_injury_burden(graph, game, rule, read_at, out):
    """Injury burden differential (v1.1). The scalar is the graph's RIL
    burden per team; the premise is the DIFFERENTIAL, banded on the
    differential's own extremity on the RIL scale (one starting CB Out is
    0.8; a QB Out is 2.5). Fires only when BOTH teams carry a stamped
    burden edge — a differential against an honest-empty is not a
    differential, and the missing side stays in not_consumed with its
    reason. The premise reports what the scalar says: it counts
    designated availability and does not see positional concentration,
    which the statement says out loud."""
    edges = _edges(graph, "injury_burden")
    if len(edges) < 2:
        return
    home = _home_team(graph)
    by_team = {e["from"]: e for e in edges}
    if home is None or home not in by_team:
        return
    others = [t for t in by_team if t != home]
    if len(others) != 1:
        return
    away = others[0]
    b_home = by_team[home]["value"]["burden"]
    b_away = by_team[away]["value"]["burden"]
    diff = round(b_home - b_away, 3)
    adiff = abs(diff)
    band = "NEUTRAL"
    for row in rule["bands"]:  # ordered strongest-first; first match wins
        cond = row["condition"]
        if "> 2.0" in cond and adiff > 2.0:
            band = row["band"]
            break
        if "0.75 <" in cond and 0.75 < adiff <= 2.0:
            band = row["band"]
            break
        if "0 <" in cond and 0 < adiff <= 0.75:
            band = row["band"]
            break
        if "== 0" in cond and adiff == 0:
            band = row["band"]
            break
    direction = "NEUTRAL" if diff == 0 else ("AGAINST_HOME" if diff > 0 else "AGAINST_AWAY")
    out.append(make_premise(
        premise_id="premise:%s:injury_burden_differential" % game,
        game=game, subject="game:%s" % game, kind=rule["kind"],
        direction=direction, magnitude_band=band,
        statement=("Injury burden differential %+.2f (home perspective): %s burden %.2f, "
                   "%s burden %.2f over designated players (RIL weights). The scalar "
                   "counts designated availability; it does not see positional concentration."
                   % (diff, _team_of(home), b_home, _team_of(away), b_away)),
        evidence_edges=[by_team[home], by_team[away]], rule=rule, read_at=read_at))


def _home_team(graph):
    for edge in graph.get("edges", []):
        if edge["type"] == "participates_in" and (edge.get("value") or {}).get("role") == "home":
            return edge["from"]
    return None


RULE_FUNCS = {
    "rest_differential": _rule_rest,
    "altitude_exposure": _rule_altitude,
    "altitude_short_week_composite": _rule_composite,
    "short_week_game_context": _rule_short_week_game,
    "coaching_continuity": _rule_coaching,
    "injury_burden_differential": _rule_injury_burden,
}


# ------------------------------------------------------------- assembly ---

def build_premises(graph, rules, read_at, input_ref):
    """Convert a situational graph instance into a premise document.

    read_at: ISO date/datetime of the read. Only edges visible at read_at
    are consumed; future-stamped edges are named in pit_excluded.
    """
    assert_no_forbidden_keys(graph, "input graph")
    game = _instance_game(graph)
    if game is None:
        raise BridgeRefusal("input graph has no game node")

    visible = _visible_at(graph, read_at)
    pit_excluded = [
        {"edge_id": e["id"], "edge_type": e["type"], "as_of": e["as_of"],
         "reason": "stamped after read_at %s: not knowable at the read" % read_at}
        for e in graph.get("edges", [])
        if e.get("as_of") is not None and e["as_of"] > read_at
    ]

    premises = []
    for rule_id in sorted(rules):
        RULE_FUNCS[rule_id](visible, game, rules[rule_id], read_at, premises)
    premises.sort(key=lambda p: p["premise_id"])

    selected, refused = select_premises(premises, visible)
    if refused:  # builder invariant: its own premises must always trace
        raise BridgeRefusal("bridge built an untraceable premise: %s" % refused)

    consumed_types = {r["primary_edge_type"] for r in rules.values()}
    not_consumed = []
    for entry in visible.get("honest_empty", []):
        not_consumed.append({
            "edge_type": entry["edge_type"],
            "team": entry.get("team"),
            "reason": "graph honest_empty: %s (missing: %s)"
                      % (entry.get("reason", ""), "; ".join(entry.get("missing", []))),
        })
    present_types = {e["type"] for e in visible.get("edges", [])}
    for edge_type in sorted(present_types - consumed_types - {
            "has_state", "participates_in", "hosted_at", "in_week"}):
        not_consumed.append({
            "edge_type": edge_type, "team": None,
            "reason": "edges present but no scalar rule in bridge v1 consumes this type",
        })

    doc = {
        "bridge": BRIDGE_NAME,
        "version": BRIDGE_VERSION,
        "game": game,
        "read_at": read_at,
        "input": input_ref,
        "emission_state": "ZERO_OBJECT",
        "premises": selected,
        "not_consumed": sorted(not_consumed, key=lambda n: (n["edge_type"], n["team"] or "")),
        "pit_excluded": sorted(pit_excluded, key=lambda n: n["edge_id"]),
    }
    assert_no_forbidden_keys(doc, "premise document")
    return doc


def main(argv=None):
    import argparse

    parser = argparse.ArgumentParser(description="GSE reasoning bridge v1")
    parser.add_argument("--graph", required=True, help="situational graph instance JSON")
    parser.add_argument("--rules", default=str(Path(__file__).with_name("rules.json")))
    parser.add_argument("--read-at", required=True, help="ISO date/datetime of the read")
    parser.add_argument("--out", required=True)
    args = parser.parse_args(argv)

    with open(args.graph) as f:
        graph = json.load(f)
    rules = load_rules(args.rules)
    doc = build_premises(graph, rules, args.read_at,
                         {"kind": "situational_graph_instance", "ref": args.graph})
    with open(args.out, "w") as f:
        json.dump(doc, f, indent=2, sort_keys=True)
        f.write("\n")
    print("premises: %d | not_consumed: %d | pit_excluded: %d"
          % (len(doc["premises"]), len(doc["not_consumed"]), len(doc["pit_excluded"])))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

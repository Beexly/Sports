"""
graph.py — GSE Situational Graph v1 core (stdlib only).

A situational graph is a DATA STRUCTURE: typed nodes and stamped edges that
record what was knowable about a game, from what source, from when. It is
not a model. It computes no probabilities, no CRPS, no picks, and it feeds
no emission. ZERO_OBJECT is structurally preserved: validation rejects any
edge value carrying an emission-shaped field (see FORBIDDEN_VALUE_KEYS).

PIT (point-in-time) semantics
-----------------------------
Every edge carries `source` (where the fact came from) and `as_of` (the
ISO date/datetime from which the fact was knowable). An edge is visible to
a read at time T iff `as_of` is None (timeless reference data, e.g. venue
elevation) or `as_of <= T` under ISO string comparison. Reads therefore
never see facts stamped in their future — the same fail-closed discipline
the Hermes walk-forward diagnostics applied (e.g. injury rows stamped
after kickoff were refused: ril_injury_after_kickoff).

Honest-empty
------------
When a required input is missing, the builder emits NO edge and instead
records an `honest_empty` entry naming the missing inputs. Absence is
data; it is never silently filled. (Precedent in the repo's own data:
data/gse-dataset/current/week3-situational.jsonl carries
"coaching_signed": null on every row rather than a fabricated number.)
"""

import json

GRAPH_NAME = "gse-situational-graph"
GRAPH_VERSION = "1.0"

NODE_KINDS = {"team", "player", "venue", "week", "game", "state"}

# Edge types that are graph structure rather than situational claims.
STRUCTURAL_EDGE_TYPES = {"participates_in", "hosted_at", "in_week", "has_state"}

STATE_KINDS = {
    "SHORT_WEEK",        # team plays on <= 5 days between games
    "ALTITUDE_VISIT",    # visiting team at a venue >= 4,000 ft
    "THURSDAY_GAME",     # game played on a Thursday
    "POST_BYE",          # team returns from a bye (>= 12 days between games)
    "REVENGE_GAME",      # entered only via a layered_revenge read
    "DISRUPTION",        # entered only via a logistical_disruption read
}

# The graph must never become an emission surface. Any edge value carrying
# one of these keys fails validation, at any nesting depth.
FORBIDDEN_VALUE_KEYS = {
    "crps", "pick", "picks", "parlay", "parlays", "emission",
    "win_probability", "probability", "ev", "expected_value", "bet",
}


def load_registry(path):
    with open(path) as f:
        reg = json.load(f)
    return {entry["type"]: entry for entry in reg["edge_types"]}


def _walk_keys(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield k
            yield from _walk_keys(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from _walk_keys(item)


def visible_at(graph, at):
    """Return a copy of the graph containing only edges visible at time `at`.

    `at` is an ISO date or datetime string. Timeless edges (as_of None) are
    always visible. Stamped edges are visible iff as_of <= at.
    """
    out = dict(graph)
    out["edges"] = [
        e for e in graph.get("edges", [])
        if e.get("as_of") is None or e["as_of"] <= at
    ]
    return out


def validate_graph(graph, registry):
    """Validate a graph document against the registry. Returns a list of
    problems (empty list == valid). Never raises on bad data; reports."""
    problems = []
    if graph.get("graph") != GRAPH_NAME:
        problems.append("graph name is not %r" % GRAPH_NAME)

    node_ids = set()
    for node in graph.get("nodes", []):
        if node.get("kind") not in NODE_KINDS:
            problems.append("node %r has unknown kind %r" % (node.get("id"), node.get("kind")))
        if node.get("id") in node_ids:
            problems.append("duplicate node id %r" % node.get("id"))
        node_ids.add(node.get("id"))
        if node.get("kind") == "state" and node.get("state") not in STATE_KINDS:
            problems.append("state node %r has unknown state %r" % (node.get("id"), node.get("state")))

    known_types = set(registry) | STRUCTURAL_EDGE_TYPES
    seen_edge_ids = set()
    for edge in graph.get("edges", []):
        eid = edge.get("id")
        if eid in seen_edge_ids:
            problems.append("duplicate edge id %r" % eid)
        seen_edge_ids.add(eid)
        etype = edge.get("type")
        if etype not in known_types:
            problems.append("edge %r has unregistered type %r" % (eid, etype))
        for endpoint in ("from", "to"):
            if edge.get(endpoint) not in node_ids:
                problems.append("edge %r %s endpoint %r is not a node" % (eid, endpoint, edge.get(endpoint)))
        src = edge.get("source") or {}
        if not src.get("kind") or not src.get("ref"):
            problems.append("edge %r is missing source kind/ref" % eid)
        if etype in registry:
            for key in registry[etype].get("value_required_keys", []):
                if key not in (edge.get("value") or {}):
                    problems.append("edge %r (%s) value is missing required key %r" % (eid, etype, key))
        for key in _walk_keys(edge.get("value") or {}):
            if key in FORBIDDEN_VALUE_KEYS:
                problems.append("edge %r value carries forbidden emission key %r" % (eid, key))

    for entry in graph.get("honest_empty", []):
        if entry.get("edge_type") not in known_types:
            problems.append("honest_empty entry has unregistered type %r" % entry.get("edge_type"))
        if not entry.get("missing"):
            problems.append("honest_empty entry for %r names no missing inputs" % entry.get("edge_type"))

    return problems

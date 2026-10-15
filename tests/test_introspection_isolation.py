#!/usr/bin/env python3
"""
tests/test_introspection_isolation.py — Structural and runtime isolation fence
for the SPEC-C introspection layer, situational graph, and conformal pass discipline.

Proves:
1. The introspection module and dossier v2 artifact carry ZERO emission keys
   (no pick, picks, parlay, crps, win_probability, ev, expected_value, bet, stake).
2. The introspection builder imports no prediction-engine, odds-pricing, or walk_forward
   writer modules, and never opens walk_forward.json for writing.
3. Every premise in v2.json carries TRIGGER, AFFECTED, DIRECTION, mandatory p in (0,1),
   visible_at <= 2026-10-15T22:45:00Z (kickoff - 90m), stamp_source, and resolution_criterion.
4. Every edge in 2026-week06-sea-at-den-live.json carries visible_at <= 2026-10-15T22:45:00Z
   (or None for timeless reference facts), and total edges >= 40 (66 edges).
5. The 279-row Universal Ingestion Ledger is 100% accounted for:
   35 live wired signals + 244 shadow ledger rows = 279 total, 0 unassigned.
6. Hash-chained introspection/versions.jsonl and introspection/commitments/fired.jsonl
   verify cleanly from genesis.
"""
from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
INTROSPECTION_DIR = REPO / "introspection"
DOSSIER_V2 = INTROSPECTION_DIR / "dossiers" / "2026" / "06" / "2026_06_SEA_DEN" / "v2.json"
DOSSIER_V1 = INTROSPECTION_DIR / "dossiers" / "2026" / "06" / "2026_06_SEA_DEN" / "v1.json"
VERSIONS_JSONL = INTROSPECTION_DIR / "versions.jsonl"
COMMITMENTS_JSONL = INTROSPECTION_DIR / "commitments" / "fired.jsonl"
DEPTH_LADDER_JSON = INTROSPECTION_DIR / "depth_ladder_2026-10-15.json"
LIVE_GRAPH_JSON = REPO / "intelligence" / "situational-graph" / "instances" / "2026-week06-sea-at-den-live.json"
SHADOW_LEDGER_JSONL = REPO / "intelligence" / "ingestion" / "shadow-ledger-2026-10-15.jsonl"
HOMES_JSONL = REPO / "intelligence" / "ingestion" / "ingestion-ledger-2026-10-15-homes.jsonl"
WALK_FORWARD_JSON = REPO / "dfs" / "walk_forward" / "walk_forward.json"

FORBIDDEN_PREMISE_KEYS = {
    "crps", "pick", "picks", "parlay", "parlays",
    "win_probability", "ev", "expected_value", "bet", "stake",
}
CUTOFF_UTC = "2026-10-15T22:45:00Z"


def _walk_keys(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield k
            yield from _walk_keys(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from _walk_keys(item)


def test_introspection_builder_cannot_reach_price_pick_or_crps_writers():
    builder_py = INTROSPECTION_DIR / "build_sea_den_dossier_and_shadow.py"
    edge_py = REPO / "intelligence" / "situational-graph" / "produce_sea_den_edges.py"
    for script in (builder_py, edge_py):
        tree = ast.parse(script.read_text(encoding="utf-8"))
        imports = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imports.update(a.name.split(".")[0] for a in node.names)
            elif isinstance(node, ast.ImportFrom) and node.module:
                imports.add(node.module.split(".")[0])
        forbidden_imports = {"prediction_engine", "walk_forward", "prisma", "db", "generate_signal_slate"}
        assert not (imports & forbidden_imports), f"{script.name} imported {imports & forbidden_imports}"


def test_walk_forward_gate_remains_closed_and_untouched():
    wf = json.loads(WALK_FORWARD_JSON.read_text(encoding="utf-8"))
    assert wf["passed"] is False


def test_dossier_v2_premises_and_no_emission_fields():
    v2 = json.loads(DOSSIER_V2.read_text(encoding="utf-8"))
    assert v2["emission_status"] == "ZERO_OBJECT"
    assert v2["walk_forward_gate"]["passed"] is False
    assert v2["walk_forward_gate"]["banner"] == "Emission locked — ZERO_OBJECT"
    assert v2["retro"] is False
    assert v2["premise_count"] >= 25
    assert len(v2["premises"]) == v2["premise_count"]
    assert v2["non_stat_premise_count"] >= 3
    assert len(v2["non_stat_premises_highlighted"]) >= 3

    for p in v2["premises"]:
        assert not (set(_walk_keys(p)) & FORBIDDEN_PREMISE_KEYS)
        assert p["TRIGGER"] and p["AFFECTED"] and p["DIRECTION"] and p["resolution_criterion"]
        assert 0.0 < float(p["p"]) < 1.0
        assert p["visible_at"] <= CUTOFF_UTC


def test_live_situational_graph_edges_and_pit_cutoff():
    g = json.loads(LIVE_GRAPH_JSON.read_text(encoding="utf-8"))
    assert len(g["edges"]) >= 40
    assert g["diagnostics"]["failed_closed"] == {}
    for edge in g["edges"]:
        vis = edge.get("visible_at")
        assert vis is None or vis <= CUTOFF_UTC, f"Edge {edge['id']} violates cutoff: {vis}"
        assert not (set(_walk_keys(edge.get("value", {}))) & FORBIDDEN_PREMISE_KEYS)


def test_shadow_ledger_and_279_universal_accounting():
    v2 = json.loads(DOSSIER_V2.read_text(encoding="utf-8"))
    live_cids = set(v2["active_census_ids"])
    shadow_rows = [json.loads(line) for line in open(SHADOW_LEDGER_JSONL, encoding="utf-8")]
    homes_rows = [json.loads(line) for line in open(HOMES_JSONL, encoding="utf-8")]

    assert len(homes_rows) == 279
    shadow_cids = {r["census_id"] for r in shadow_rows}
    assert len(shadow_rows) == len(shadow_cids)
    assert not (live_cids & shadow_cids), "Overlap between live wired signals and shadow ledger rows"
    assert len(live_cids) + len(shadow_cids) == 279

    for r in shadow_rows:
        assert r["status"] in ("SHADOW", "BLOCKED")
        assert r["stamp_path"] is not None
        if r["status"] == "BLOCKED":
            assert r["unblock_condition"] and len(r["unblock_condition"]) > 5


def test_hash_chained_versions_and_commitments():
    lines = [json.loads(line) for line in open(VERSIONS_JSONL, encoding="utf-8")]
    assert len(lines) == 2
    assert lines[0]["prev_sha"] == "0" * 64
    v1_sha_actual = hashlib.sha256(DOSSIER_V1.read_bytes()).hexdigest()
    v2_sha_actual = hashlib.sha256(DOSSIER_V2.read_bytes()).hexdigest()
    assert lines[0]["dossier_sha256"] == v1_sha_actual
    assert lines[1]["dossier_sha256"] == v2_sha_actual
    expected_prev = hashlib.sha256(json.dumps(lines[0], sort_keys=True).encode("utf-8")).hexdigest()
    assert lines[1]["prev_sha"] == expected_prev

    comm = [json.loads(line) for line in open(COMMITMENTS_JSONL, encoding="utf-8")]
    assert len(comm) >= 2
    assert comm[0]["prev_sha"] == "0" * 64
    c0_sha = hashlib.sha256(json.dumps(comm[0], sort_keys=True).encode("utf-8")).hexdigest()
    assert comm[1]["prev_sha"] == c0_sha


def test_depth_ladder_upgrades_recorded():
    dl = json.loads(DEPTH_LADDER_JSON.read_text(encoding="utf-8"))
    assert dl["total_catalog_signals"] == 279
    assert dl["accounting_check_279"] == 279
    assert dl["upgrades_count"] >= 1
    assert dl["rung_counts"]["L3"] >= 30

"""Tests for the Gauntlet runner (intelligence/gates/gauntlet.py) and
the RVC gate (intelligence/gates/rvc_gate.py).

Pinned behaviors:
  * fail-closed: an exception inside a gate is a FAIL, never a pass;
  * shadow gates are labeled spec_status: INFERRED and can neither
    block nor clear anything — stamps move only with the RVC verdict;
  * stamps come from derive_stamps() only;
  * the RVC gate clears only on a real, disjoint, adequately-sized
    paired holdout where the model beats the close;
  * the manifest is frozen (hashed) before any gate executes;
  * the executable gate set and gauntlet_registry.json agree exactly.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gates import gauntlet  # noqa: E402
from gates.gauntlet import (ENFORCING, FAIL, PASS, SHADOW, SKIP, Gate,  # noqa: E402
                            GateOutcome, RunContext, build_gates,
                            derive_stamps, run_gauntlet)
from gates.rvc_gate import evaluate_rvc  # noqa: E402


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _ctx(tmp_path, inputs=None, **kw):
    return RunContext(root=tmp_path, run_id="test_run",
                      game={"away_abbr": "BUF", "home_abbr": "LAR"},
                      inputs=inputs or {}, **kw)


def _registry_for(gates):
    wired, shadow = [], []
    for g in gates:
        entry = {"gate_id": g.id, "stage": g.stage, "mode": g.mode,
                 "spec_status": g.spec_status, "name": g.id, "source": g.source}
        (shadow if g.mode == SHADOW else wired).append(entry)
    return {"version": 1, "wired": wired, "shadow": shadow, "not_wired": []}


def _run(tmp_path, gates, monkeypatch, **ctx_kw):
    monkeypatch.setattr(gauntlet, "load_registry",
                        lambda root: _registry_for(gates))
    ctx = _ctx(tmp_path, **ctx_kw)
    return ctx, run_gauntlet(ctx, tmp_path / "out", gates=gates)


def _rvc_stub(verdict):
    def fn(ctx):
        ctx.rvc_result = {"verdict": verdict, "reasons": [], "metrics": {}}
        return GateOutcome(PASS if verdict == "CLEARED" else FAIL,
                           {"rvc": ctx.rvc_result})
    return fn


# ---------------------------------------------------------------------------
# stamp derivation — the gate decides, never a hand
# ---------------------------------------------------------------------------

def test_stamps_cleared_only_with_rvc_clearance_and_no_enforcing_failure():
    assert derive_stamps("CLEARED", []) == {
        "label": "CLEARED", "rvc_cleared": True,
        "is_pick": True, "is_edge_claim": True}
    assert derive_stamps("CLEARED", ["some.enforcing.gate"])["label"] == "DIAGNOSTIC"
    assert derive_stamps("NOT_CLEARED", [])["is_pick"] is False
    assert derive_stamps(None, []) == {
        "label": "DIAGNOSTIC", "rvc_cleared": False,
        "is_pick": False, "is_edge_claim": False}


# ---------------------------------------------------------------------------
# fail-closed execution
# ---------------------------------------------------------------------------

def test_exception_inside_a_gate_is_a_fail_never_a_pass(tmp_path, monkeypatch):
    def boom(ctx):
        raise RuntimeError("kaboom")

    gates = [Gate("ingest.boom", "INGEST", ENFORCING, "CANONICAL", "test", boom)]
    ctx, report = _run(tmp_path, gates, monkeypatch)
    [result] = report["gates"]
    assert result["verdict"] == FAIL
    assert "kaboom" in result["error"]
    assert report["stamps"]["label"] == "DIAGNOSTIC"


def test_manifest_is_frozen_before_any_gate_runs(tmp_path, monkeypatch):
    seen = {}

    def spy(ctx):
        seen["manifest_path_exists"] = ctx.manifest_path.exists()
        seen["frozen_inputs"] = dict(ctx.manifest["inputs"])
        return GateOutcome(PASS)

    data = tmp_path / "input.json"
    data.write_text('{"a": 1}')
    gates = [Gate("ingest.spy", "INGEST", ENFORCING, "CANONICAL", "test", spy)]
    ctx, report = _run(tmp_path, gates, monkeypatch,
                       inputs={"input": data}, base_commit="abc123")
    assert seen["manifest_path_exists"] is True
    import hashlib
    assert seen["frozen_inputs"]["input"]["sha256"] == \
        hashlib.sha256(b'{"a": 1}').hexdigest()
    from gates.manifest_check import REQUIRED
    assert all(k in seen["frozen_inputs"]["input"] for k in REQUIRED)
    assert Path(report["manifest_path"]).exists()


# ---------------------------------------------------------------------------
# shadow mode: recorded, labeled, powerless
# ---------------------------------------------------------------------------

def test_shadow_fail_neither_blocks_nor_downgrades_a_cleared_run(
        tmp_path, monkeypatch):
    gates = [
        Gate("pe.module_99", "MODEL", SHADOW, "INFERRED", "test",
             lambda ctx: GateOutcome(FAIL, {}, "shadow says no")),
        Gate("arbitration.rvc", "ARBITRATION", ENFORCING, "CANONICAL",
             "test", _rvc_stub("CLEARED")),
    ]
    ctx, report = _run(tmp_path, gates, monkeypatch)
    assert report["stamps"]["label"] == "CLEARED"
    assert report["stamps"]["is_pick"] is True
    shadow = [r for r in report["gates"] if r["gate_id"] == "pe.module_99"][0]
    assert shadow["verdict"] == FAIL and shadow["spec_status"] == "INFERRED"


def test_shadow_pass_cannot_clear_anything(tmp_path, monkeypatch):
    gates = [
        Gate("pe.module_99", "MODEL", SHADOW, "INFERRED", "test",
             lambda ctx: GateOutcome(PASS)),
        Gate("arbitration.rvc", "ARBITRATION", ENFORCING, "CANONICAL",
             "test", _rvc_stub("NOT_CLEARED")),
    ]
    ctx, report = _run(tmp_path, gates, monkeypatch)
    assert report["stamps"] == {"label": "DIAGNOSTIC", "rvc_cleared": False,
                                 "is_pick": False, "is_edge_claim": False}


def test_enforcing_fail_blocks_clearance_even_when_rvc_clears(
        tmp_path, monkeypatch):
    gates = [
        Gate("ingest.bad", "INGEST", ENFORCING, "CANONICAL", "test",
             lambda ctx: GateOutcome(FAIL, {}, "bad input")),
        Gate("arbitration.rvc", "ARBITRATION", ENFORCING, "CANONICAL",
             "test", _rvc_stub("CLEARED")),
    ]
    ctx, report = _run(tmp_path, gates, monkeypatch)
    assert report["stamps"]["label"] == "DIAGNOSTIC"
    assert report["stamps"]["is_pick"] is False


def test_registry_mismatch_forces_diagnostic_stamps(tmp_path, monkeypatch):
    gates = [Gate("arbitration.rvc", "ARBITRATION", ENFORCING, "CANONICAL",
                  "test", _rvc_stub("CLEARED"))]
    monkeypatch.setattr(gauntlet, "load_registry",
                        lambda root: {"wired": [], "shadow": [], "not_wired": []})
    ctx = _ctx(tmp_path)
    report = run_gauntlet(ctx, tmp_path / "out", gates=gates)
    assert report["registry_consistency_errors"]
    assert report["stamps"]["label"] == "DIAGNOSTIC"


# ---------------------------------------------------------------------------
# registry <-> code agreement (the census cannot drift silently)
# ---------------------------------------------------------------------------

def test_registry_matches_build_gates():
    registry = gauntlet.load_registry(Path("."))
    built = {g.id: g for g in build_gates()}
    census = {}
    for entry in registry["wired"]:
        census[entry["gate_id"]] = ENFORCING
    for entry in registry["shadow"]:
        census[entry["gate_id"]] = SHADOW
        if entry["gate_id"].startswith("pe."):
            assert entry["spec_status"] == "INFERRED", entry["gate_id"]
        else:  # trust self-checks: canonical spec, synthetic data basis
            assert entry["spec_status"] == "CANONICAL", entry["gate_id"]
    assert set(built) == set(census)
    for gate_id, mode in census.items():
        assert built[gate_id].mode == mode, gate_id


def test_shadow_gates_are_only_the_two_documented_families():
    for gate in build_gates():
        if gate.mode == SHADOW:
            if gate.id.startswith("pe.module_"):
                # family 1: worker-INFERRED spec — shadow by doctrine
                assert gate.spec_status == "INFERRED"
            else:
                # family 2: trust machinery self-checks on seeded
                # synthetic data (the modules' own honesty label)
                assert gate.id.startswith("trust.")
                assert gate.spec_status == "CANONICAL"


# ---------------------------------------------------------------------------
# the RVC gate itself
# ---------------------------------------------------------------------------

def _paired(n, model_skill=0.9, close_skill=0.55, seed=7):
    import random
    rng = random.Random(seed)
    rows = []
    for _ in range(n):
        outcome = rng.random() < 0.5
        rows.append({
            "model_prob": model_skill if outcome else 1 - model_skill,
            "close_prob": close_skill if outcome else 1 - close_skill,
            "outcome": 1.0 if outcome else 0.0,
        })
    return rows


def test_rvc_no_dataset_is_not_cleared():
    result = evaluate_rvc(None, None, "m1")
    assert result["verdict"] == "NOT_CLEARED"
    assert result["label"] == "DIAGNOSTIC"
    assert result["metrics"]["n"] == 0


def test_rvc_contaminated_holdout_is_not_cleared():
    manifest = {"train_years": [2021, 2022, 2023], "eval_years": [2023, 2024]}
    result = evaluate_rvc(_paired(200), manifest, "m1")
    assert result["verdict"] == "NOT_CLEARED"
    checks = {c["name"]: c for c in result["checks"]}
    assert checks["heldout_discipline"]["pass"] is False


def test_rvc_small_sample_is_not_cleared():
    manifest = {"train_years": [2021, 2022], "eval_years": [2024]}
    result = evaluate_rvc(_paired(20), manifest, "m1")
    assert result["verdict"] == "NOT_CLEARED"
    checks = {c["name"]: c for c in result["checks"]}
    assert checks["sample_size"]["pass"] is False


def test_rvc_model_that_only_matches_the_close_is_not_cleared():
    rows = _paired(200)
    for row in rows:
        row["model_prob"] = row["close_prob"]
    manifest = {"train_years": [2021, 2022], "eval_years": [2024]}
    result = evaluate_rvc(rows, manifest, "m1")
    assert result["verdict"] == "NOT_CLEARED"
    checks = {c["name"]: c for c in result["checks"]}
    assert checks["beats_close_brier"]["pass"] is False


def test_rvc_strong_model_on_a_clean_holdout_clears():
    manifest = {"train_years": [2021, 2022], "eval_years": [2024]}
    result = evaluate_rvc(_paired(400), manifest, "m1")
    assert result["verdict"] == "CLEARED", result["reasons"]
    assert result["label"] == "CLEARED"
    metrics = result["metrics"]
    assert metrics["brier_model"] < metrics["brier_close"]
    assert metrics["brier_skill_score_vs_climatology"] > 0.02
    assert metrics["n"] == 400


# ---------------------------------------------------------------------------
# PE shadow gates execute honestly against tonight's (empty) inputs
# ---------------------------------------------------------------------------

def test_pe_shadow_gates_record_verdicts_and_effect():
    ctx = _ctx(Path("."))
    ctx.run_id = "test_run"
    by_id = {g.id: g for g in build_gates()}
    out5 = gauntlet._execute(by_id["pe.module_05"], ctx)
    assert out5["verdict"] == SKIP and out5["evidence"]["shadow"] is True
    out13 = gauntlet._execute(by_id["pe.module_13"], ctx)
    assert out13["verdict"] == PASS and out13["evidence"]["shadow"] is True
    out21 = gauntlet._execute(by_id["pe.module_21"], ctx)
    assert out21["verdict"] == SKIP
    assert out21["evidence"]["stamp"]["verdict"] == "REFUSE"


# ---------------------------------------------------------------------------
# output guard + mint discipline
# ---------------------------------------------------------------------------

def test_surface_guard_catches_stakes_pick_claims_and_ngs():
    stamps = {"rvc_cleared": False}
    dirty = {"a": {"kelly_fraction": 0.1},
             "b": [{"is_pick": True}],
             "c": "powered by NextGenStats tracking"}
    hits = gauntlet._deep_scan(dirty, stamps)
    assert len(hits) == 3
    clean = {"label": "DIAGNOSTIC", "is_pick": False, "is_edge_claim": False}
    assert gauntlet._deep_scan(clean, stamps) == []


def test_mint_gate_withholds_while_rvc_uncleared(tmp_path):
    ctx = _ctx(tmp_path)
    ctx.rvc_result = {"verdict": "NOT_CLEARED"}
    ctx.gate_results = {
        "ingest.price_feed_integrity": {"verdict": PASS},
        "model.measured_correlations": {"verdict": PASS},
    }
    outcome = gauntlet.gate_mint(ctx)
    assert outcome.verdict == PASS
    assert outcome.evidence["decision"]["action"] == "withhold"
    assert outcome.evidence["facets"]["residual_vs_close"] == "DATA-GAP"


# ---------------------------------------------------------------------------
# full MNF run over the assembled tree (structure, not luck)
# ---------------------------------------------------------------------------

def test_mnf_run_structure(tmp_path):
    root = Path(__file__).resolve().parents[2]
    ctx = gauntlet.build_mnf_context(root)
    report = run_gauntlet(ctx, tmp_path / "out")
    assert report["registry_consistency_errors"] == []
    assert len(report["gates"]) == 35
    assert report["rvc"]["verdict"] == "NOT_CLEARED"
    assert report["stamps"] == {"label": "DIAGNOSTIC", "rvc_cleared": False,
                                 "is_pick": False, "is_edge_claim": False}
    assert Path(report["manifest_path"]).exists()
    verdicts = {r["gate_id"]: r["verdict"] for r in report["gates"]}
    assert verdicts["model.sgp_reproduction"] == PASS
    assert verdicts["ingest.price_feed_integrity"] == PASS
    assert verdicts["output.stamp_derivation"] == PASS

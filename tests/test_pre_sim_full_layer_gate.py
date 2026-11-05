#!/usr/bin/env python3
"""
test_pre_sim_full_layer_gate.py
Pytest suite asserting that pre_sim_gate_passed is True, all 5 layers are 100% present,
and any missing layer raises a hard RuntimeError blocking simulation execution.
"""

import os
import json
import pathlib
import pytest

# Ensure clean PYTHONPATH
os.environ["PYTHONPATH"] = ""

GATE_PATH = pathlib.Path("C:/c/wt-week8-forensic/data/engine/tnf_pre_sim_full_layer_verification_gate_2026_11_05.json")

def test_gate_manifest_exists():
    from scripts.ops.verify_and_wire_all_layers_before_sim import assert_all_layers_wired_before_simulation
    manifest = assert_all_layers_wired_before_simulation()
    assert manifest["pre_sim_gate_passed"] is True
    assert GATE_PATH.exists()

def test_gate_json_content():
    assert GATE_PATH.exists(), "Gate output JSON file must exist"
    with open(GATE_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    assert data.get("pre_sim_gate_passed") is True
    layers = data.get("layers", {})
    assert "layer_1_coaching" in layers
    assert "layer_2_injuries_and_gp" in layers
    assert "layer_3_external_charting" in layers
    assert "layer_4_equations_and_operators" in layers
    assert "layer_5_situational_overlay" in layers

def test_missing_layer_raises_runtime_error(monkeypatch):
    import scripts.ops.verify_and_wire_all_layers_before_sim as gate_mod
    
    # Monkeypatch verify_layer_1_coaching to raise RuntimeError
    def mock_fail():
        raise RuntimeError("Simulated missing layer failure")
        
    monkeypatch.setattr(gate_mod, "verify_layer_1_coaching", mock_fail)
    
    with pytest.raises(RuntimeError) as excinfo:
        gate_mod.assert_all_layers_wired_before_simulation()
    assert "Simulated missing layer failure" in str(excinfo.value)

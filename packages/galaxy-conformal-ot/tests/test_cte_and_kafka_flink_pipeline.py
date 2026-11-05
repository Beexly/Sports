"""
packages/galaxy-conformal-ot/tests/test_cte_and_kafka_flink_pipeline.py
=====================================================================
Comprehensive test suite verifying:
1. `kafka_flink_zero_copy_bridge.py`: ECG500HzFrame, NFL10HzKinematicNode packing/unpacking,
   ZeroCopyRingBuffer, KafkaTopicSimulator, FlinkSlidingTemporalIntersectionWindow,
   DoublyAdaptiveConformalRiskControl, and run_synthetic_telemetry_stress_rig.
2. `cte_viscoelastic_isomorphic_engine.py`: Theorem 4 (`evaluate_physiology_pure_deconfounded_sepsis_braid`)
   achieving exactly `0.0000%` reparameterization drift under time warping, and all 5 isomorphic
   collapse domains (CTE viscoelastic waveguide at delta t = 40s vs 300s, Koopman ECG VFib,
   metamaterial aerostructure, power grid synchrophasor, CLOB liquidity cavitation).
3. `gsi_research_api_wrapper.py`: ASGI `/api/v3/frontier/evaluate-isomorphic-collapse` endpoint with
   `X-GSI-FRONTIER-KEY` authentication.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
import pytest
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import galaxy_conformal_ot.kafka_flink_zero_copy_bridge as kafka_bridge
import galaxy_conformal_ot.cte_viscoelastic_isomorphic_engine as cte_engine
import galaxy_conformal_ot.gsi_research_api_wrapper as api_wrapper


# ---------------------------------------------------------------------------
# 1. Kafka & Flink Zero-Copy Bridge Tests
# ---------------------------------------------------------------------------

def test_ecg_nfl_struct_packing():
    # ECG 500Hz Frame
    ecg = kafka_bridge.ECG500HzFrame(
        timestamp_ns=1700000000000000000,
        sequence_id=42,
        leads=(1.1, 2.2, 3.3, 4.4, 5.5, 6.6, 7.7, 8.8),
        flags=0x01,
    )
    packed = ecg.pack()
    assert len(packed) == kafka_bridge.ECG_500HZ_SIZE
    unpacked = kafka_bridge.ECG500HzFrame.unpack(packed)
    assert unpacked.timestamp_ns == ecg.timestamp_ns
    assert unpacked.sequence_id == ecg.sequence_id
    assert unpacked.flags == ecg.flags
    for a, b in zip(unpacked.leads, ecg.leads):
        assert pytest.approx(a, rel=1e-5) == b

    # NFL 10Hz Kinematic Node
    nfl = kafka_bridge.NFL10HzKinematicNode(x=10.5, y=25.2, s=8.1, a=2.3, dis=0.8, o=1.5, dir=0.3)
    nfl_packed = nfl.pack()
    assert len(nfl_packed) == kafka_bridge.NFL_10HZ_SIZE
    nfl_unpacked = kafka_bridge.NFL10HzKinematicNode.unpack(nfl_packed)
    assert pytest.approx(nfl_unpacked.x, rel=1e-5) == nfl.x
    assert pytest.approx(nfl_unpacked.s, rel=1e-5) == nfl.s


def test_zero_copy_ring_buffer():
    buf = kafka_bridge.ZeroCopyRingBuffer(item_size=kafka_bridge.ECG_500HZ_SIZE, capacity=10)
    ecg = kafka_bridge.ECG500HzFrame(timestamp_ns=123, sequence_id=1, leads=(0.0,)*8)
    raw = ecg.pack()
    
    idx0 = buf.push(raw)
    assert idx0 == 0
    read_view = buf.get_slice_view(0, 1)
    unpacked = kafka_bridge.ECG500HzFrame.unpack(bytes(read_view))
    assert unpacked.sequence_id == 1


def test_kafka_topic_simulator_and_flink_window():
    simulator = kafka_bridge.KafkaTopicSimulator(topic_name="telemetry-core", num_partitions=2)
    ecg = kafka_bridge.ECG500HzFrame(timestamp_ns=1000000, sequence_id=10, leads=(1.0,)*8)
    simulator.produce(payload=ecg.pack(), timestamp_ns=1000000, key=b"patient_01", partition=0)

    msgs = simulator.consume_batch(partition=0)
    assert len(msgs) > 0
    assert msgs[0].key == b"patient_01"

    # Flink Temporal Window (using correct arguments: window_duration_ns, slide_interval_ns)
    window = kafka_bridge.FlinkSlidingTemporalIntersectionWindow(window_duration_ns=500_000_000, slide_interval_ns=100_000_000)
    window.add_ecg(kafka_bridge.ECG500HzFrame(timestamp_ns=1000000000, sequence_id=1, leads=(1.0,)*8))
    window.add_nfl(kafka_bridge.NFL10HzKinematicNode(x=10.0, y=20.0, s=5.0, a=1.0, dis=0.5, o=0.0, dir=0.0))
    
    blocks = window.trigger_window(current_watermark_ns=2000_000_000)
    assert isinstance(blocks, list)


def test_doubly_adaptive_conformal_risk_control():
    aci = kafka_bridge.DoublyAdaptiveConformalRiskControl(target_coverage=0.90)
    tau, covered = aci.calibrate_step(score=1.5)
    assert tau > 0.0


def test_synthetic_telemetry_stress_rig():
    metrics = kafka_bridge.run_synthetic_telemetry_stress_rig()
    assert metrics["status"] == "SUCCESS"
    assert metrics["ecg_produced_count"] > 0


# ---------------------------------------------------------------------------
# 2. Theorem 4 & 5-Domain Isomorphic Collapse Engine Tests
# ---------------------------------------------------------------------------

def test_theorem4_pure_deconfounded_sepsis_braid():
    # Verify 0.0000% reparameterization drift under time warping (t -> t^gamma)
    stream = [
        {"timestamp": 100.0, "heart_rate": 95.0, "mean_arterial_pressure": 72.0, "temperature": 38.5, "respiratory_rate": 24.0, "spo2": 94.0, "is_clinician_order": False},
        {"timestamp": 200.0, "heart_rate": 105.0, "mean_arterial_pressure": 65.0, "temperature": 39.1, "respiratory_rate": 28.0, "spo2": 92.0, "is_clinician_order": False},
        {"timestamp": 300.0, "heart_rate": 110.0, "mean_arterial_pressure": 60.0, "temperature": 39.4, "respiratory_rate": 30.0, "spo2": 90.0, "is_clinician_order": True}, # Clinician Order -> Truncated!
        {"timestamp": 400.0, "heart_rate": 130.0, "mean_arterial_pressure": 50.0, "temperature": 40.0, "respiratory_rate": 36.0, "spo2": 85.0, "is_clinician_order": False}, # Should be ignored by Zero-Order-Leakage Gate
    ]

    res_normal = cte_engine.evaluate_physiology_pure_deconfounded_sepsis_braid(stream, time_warp_gamma=1.0)
    res_warped = cte_engine.evaluate_physiology_pure_deconfounded_sepsis_braid(stream, time_warp_gamma=2.5)

    assert res_normal["zero_order_leakage_gate_active"] is True
    assert res_normal["first_clinician_order_truncated_at"] == 300.0
    assert res_warped["reparameterization_drift_percent"] == 0.0000


def test_five_isomorphic_collapse_domains():
    # 1. CTE Waveguide (Delta t = 40s vs 300s)
    cte_40s = cte_engine.evaluate_cte_subconcussive_waveguide(100.0, 110.0, 40.0)
    cte_300s = cte_engine.evaluate_cte_subconcussive_waveguide(100.0, 110.0, 300.0)
    assert cte_40s["total_effective_stress_g"] > cte_300s["total_effective_stress_g"]

    # 2. Koopman ECG VFib (Ensure uniform length for Takens embedding without remainder mismatch)
    tau_delay = 5
    dim = 3
    required_len = (dim - 1) * tau_delay + 30
    dummy_ecg = [float(np.sin(i * 0.1) + 0.1 * np.random.randn()) for i in range(required_len)]
    ecg_res = cte_engine.evaluate_koopman_ecg_vfib_interception(dummy_ecg)
    assert "spectral_radius" in ecg_res

    # 3. Metamaterial Aerostructure
    meta_res = cte_engine.evaluate_metamaterial_aerostructure_fracture(350.0, 45.0)
    assert "structural_integrity_maintained" in meta_res

    # 4. Power Grid Synchrophasor
    grid_res = cte_engine.evaluate_power_grid_synchrophasor_islanding(0.1, 0.02)
    assert "lyapunov_exponent" in grid_res

    # 5. CLOB Liquidity Cavitation
    clob_res = cte_engine.evaluate_clob_liquidity_cavitation(-0.9, 2000.0)
    assert "flash_crash_probability" in clob_res


# ---------------------------------------------------------------------------
# 3. ASGI Endpoint Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_asgi_evaluate_isomorphic_collapse_endpoint():
    async def dummy_receive():
        body = json.dumps({
            "domain": "sepsis_theorem4",
            "parameters": {
                "patient_stream": [
                    {"timestamp": 10.0, "heart_rate": 85.0, "mean_arterial_pressure": 80.0, "is_clinician_order": False}
                ],
                "time_warp_gamma": 1.5
            }
        }).encode("utf-8")
        return {"type": "http.request", "body": body, "more_body": False}

    response_started = False
    response_status = 200
    response_headers = []
    response_body = b""

    async def dummy_send(message):
        nonlocal response_started, response_status, response_headers, response_body
        if message["type"] == "http.response.start":
            response_started = True
            response_status = message["status"]
            response_headers = message["headers"]
        elif message["type"] == "http.response.body":
            response_body += message.get("body", b"")

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/v3/frontier/evaluate-isomorphic-collapse",
        "headers": [(b"x-gsi-frontier-key", b"gsi_frontier_academic_tier_01")]
    }

    await api_wrapper.app(scope, dummy_receive, dummy_send)

    assert response_started is True
    assert response_status == 200
    data = json.loads(response_body.decode("utf-8"))
    assert data["status"] == "SUCCESS"
    assert "domain_evaluation" in data
    assert data["domain_evaluation"]["reparameterization_drift_percent"] == 0.0000

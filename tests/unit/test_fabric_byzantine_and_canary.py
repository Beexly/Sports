"""Byzantine node quarantine, canary spot-checks & math invariant gate tests."""

from __future__ import annotations

from gse_engine.fabric.coordinator import BrokerlessMicrotaskCoordinator
from gse_engine.fabric.invariants import (
    verify_frechet_hoeffding_bounds,
    verify_markov_row_stochastic,
    verify_proper_scoring_and_conformal,
    verify_sinkhorn_marginals,
)
from gse_engine.fabric.worker_daemon import execute_deterministic_microtask_kernel


def test_invariant_gatekeepers_catch_frechet_sinkhorn_markov_and_nan() -> None:
    """Hard invariant gates must fail-closed on every mathematical violation."""
    assert verify_frechet_hoeffding_bounds([0.6, 0.7], 0.45).ok is True
    assert verify_frechet_hoeffding_bounds([0.6, 0.7], 0.65).ok is False
    assert verify_frechet_hoeffding_bounds([0.8, 0.8], 0.50).ok is False
    assert verify_frechet_hoeffding_bounds([0.5, 0.5], float("nan")).ok is False

    assert verify_markov_row_stochastic([[0.5, 0.5], [0.2, 0.8]]).ok is True
    assert verify_markov_row_stochastic([[0.5, 0.6], [0.2, 0.8]]).ok is False

    assert verify_sinkhorn_marginals([[0.5, 0.0], [0.0, 0.5]], [0.5, 0.5], [0.5, 0.5]).ok is True
    assert verify_sinkhorn_marginals([[0.4, 0.0], [0.0, 0.5]], [0.5, 0.5], [0.5, 0.5]).ok is False

    assert verify_proper_scoring_and_conformal(0.18, [0.2, 0.5, 0.8]).ok is True
    assert verify_proper_scoring_and_conformal(0.18, [0.6, 0.5, 0.8]).ok is False
    assert verify_proper_scoring_and_conformal(float("nan"), [0.2, 0.5]).ok is False


def test_byzantine_canary_spoof_and_invariant_poisoning_quarantines_rogue() -> None:
    """Canary dual-dispatch + oracle spot-check isolate and quarantine Byzantine workers."""
    coord = BrokerlessMicrotaskCoordinator(
        db_target=":memory:",
        default_canary_rate=0.0,
        quarantine_trust_threshold=0.50,
        spot_check_oracle=execute_deterministic_microtask_kernel,
    )
    coord.register_worker("honest-node", "python_cpu", trust_score=0.90)
    coord.register_worker("rogue-node", "ts_webworker", trust_score=0.80)

    # 1. Poisoned Frechet-Hoeffding output submitted directly -> immediate QUARANTINED + slash.
    coord.enqueue_microtask(
        campaign_id="byz-1",
        island_id="copula_tail",
        task_type="COPULA_STRESS",
        payload={"task_label": "poison-fh"},
        deterministic_seed=777,
        task_id="poison-fh",
    )
    r_claim = coord.claim_batch("rogue-node", now_ms=100, max_tasks=1)[0]
    poison_rec = coord.submit_result(
        r_claim.task_id,
        "rogue-node",
        r_claim.fencing_token,
        {
            "task_type": "COPULA_STRESS",
            "copula_checks": [
                {"marginals": [0.7, 0.8], "joint_prob": 0.79},
            ],
            "crps": 0.15,
            "conformal_quantiles": [0.1, 0.5, 0.9],
        },
        now_ms=200,
    )
    assert poison_rec.accepted is False
    assert "frechet_hoeffding_upper_violation" in poison_rec.reason
    rogue_after_inv = coord.get_worker("rogue-node")
    assert rogue_after_inv is not None
    assert rogue_after_inv.trust_score < 0.80

    # 2. Force Canary Dual-Dispatch with spoofed Monte Carlo mean (passes local bounds,
    #    fails independent canary + spot-check oracle parity).
    coord.enqueue_microtask(
        campaign_id="byz-1",
        island_id="biomech_fatigue",
        task_type="MONTE_CARLO_SLATE",
        payload={"task_label": "canary-spoof", "n_paths": 32},
        deterministic_seed=888,
        task_id="canary-spoof",
        force_canary=True,
    )
    h_claim = coord.claim_batch("honest-node", now_ms=300, max_tasks=1)[0]
    r_canary_claim = coord.claim_batch("rogue-node", now_ms=300, max_tasks=1)[0]
    # Twin constraint guarantees two different workers got the two twins.
    assert h_claim.task_id != r_canary_claim.task_id

    honest_out = execute_deterministic_microtask_kernel(
        "MONTE_CARLO_SLATE",
        {"task_label": "canary-spoof", "n_paths": 32},
        888,
    )
    spoofed_out = dict(honest_out)
    spoofed_out["mean_pts"] = float(honest_out["mean_pts"]) + 11.5

    h_rec = coord.submit_result(
        h_claim.task_id, "honest-node", h_claim.fencing_token, honest_out, now_ms=400
    )
    assert h_rec.accepted is True

    r_rec = coord.submit_result(
        r_canary_claim.task_id, "rogue-node", r_canary_claim.fencing_token, spoofed_out, now_ms=450
    )
    assert r_rec.accepted is False
    assert "CANARY_DIVERGENCE" in r_rec.reason
    assert r_rec.status == "QUARANTINED"

    # Honest node stays VERIFIED and trusted; rogue node is downgraded/quarantined.
    honest_state = coord.get_worker("honest-node")
    rogue_state = coord.get_worker("rogue-node")
    h_slice = coord.get_slice(h_claim.task_id)
    assert h_slice is not None and h_slice.status == "VERIFIED"
    assert honest_state is not None and honest_state.trust_score > 0.85
    assert rogue_state is not None and rogue_state.quarantined is True
    # Quarantined rogue node can no longer claim new tasks.
    assert coord.claim_batch("rogue-node", now_ms=500, max_tasks=1) == []
    coord.close()

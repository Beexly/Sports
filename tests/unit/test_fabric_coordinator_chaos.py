"""Concurrency chaos and fencing-token safety tests for Coordinator."""

from __future__ import annotations

import threading

from gse_engine.fabric.coordinator import BrokerlessMicrotaskCoordinator
from gse_engine.fabric.worker_daemon import execute_deterministic_microtask_kernel


def test_concurrent_claims_and_zombie_fencing_rejection() -> None:
    """Prove zero lost tasks, zero double-commits & strict zombie rejection."""
    coord = BrokerlessMicrotaskCoordinator(
        db_target=":memory:",
        default_canary_rate=0.0,
        spot_check_oracle=execute_deterministic_microtask_kernel,
    )
    coord.register_worker("worker-fast", "python_cpu", initial_throughput=400.0, load_factor=0.1)
    coord.register_worker("worker-busy", "python_cpu", initial_throughput=100.0, load_factor=0.9)

    for i in range(12):
        coord.enqueue_microtask(
            campaign_id="chaos-1",
            island_id="copula_tail",
            task_type="COPULA_STRESS",
            payload={"task_label": f"chaos-{i}"},
            deterministic_seed=1000 + i,
            task_id=f"chaos-task-{i}",
        )

    # Adaptive quantum sizing respects 3.0s-to-8.0s execution window.
    w_fast = coord.get_worker("worker-fast")
    w_busy = coord.get_worker("worker-busy")
    assert w_fast is not None and w_busy is not None
    q_fast = coord.compute_adaptive_quantum_units(w_fast)
    q_busy = coord.compute_adaptive_quantum_units(w_busy)
    assert 2_800 <= q_fast <= 3_200
    assert 300 <= q_busy <= 400
    assert q_fast > q_busy

    # Claim on worker-busy at t=1000ms (expires at t=11_000ms).
    zombie_claims = coord.claim_batch("worker-busy", now_ms=1_000, max_tasks=4, lease_ttl_ms=10_000)
    assert len(zombie_claims) == 4
    zombie_task = zombie_claims[0]
    stale_token = zombie_task.fencing_token

    # Force lease expiration at t=15_000ms so worker-fast reclaims with higher fencing token.
    reaped = coord.reap_expired_leases(now_ms=15_000)
    assert reaped == 4

    healthy_claims = coord.claim_batch(
        "worker-fast", now_ms=15_001, max_tasks=4, lease_ttl_ms=15_000
    )
    reclaimed = next(c for c in healthy_claims if c.task_id == zombie_task.task_id)
    assert reclaimed.fencing_token > stale_token

    # Healthy worker commits valid result with current fencing token.
    valid_res = execute_deterministic_microtask_kernel(
        "COPULA_STRESS",
        {"task_label": reclaimed.task_id},
        reclaimed.deterministic_seed,
    )
    ok_receipt = coord.submit_result(
        reclaimed.task_id,
        "worker-fast",
        reclaimed.fencing_token,
        valid_res,
        worker_epoch=0,
        current_epoch=1,
        now_ms=16_000,
    )
    assert ok_receipt.accepted is True
    assert ok_receipt.status == "VERIFIED"
    # Epoch staleness decay exp(-0.15 * 1) < 1 reduces weight cleanly.
    assert 0.0 < ok_receipt.result_weight < 1.0

    # Delayed zombie attempts commit with old token -> strictly rejected!
    zombie_receipt = coord.submit_result(
        zombie_task.task_id,
        "worker-busy",
        stale_token,
        {"task_type": "COPULA_STRESS", "crps": 9.99, "conformal_quantiles": [0.1, 0.2, 0.3]},
        now_ms=16_500,
    )
    assert zombie_receipt.accepted is False
    assert zombie_receipt.reason == "STALE_FENCING_TOKEN"

    # Healthy result remains intact and uncorrupted.
    verified = coord.collect_verified_results("chaos-1")
    assert any(v["task_id"] == reclaimed.task_id for v in verified)
    coord.close()


def test_multithreaded_racing_workers_zero_double_claim() -> None:
    """Simultaneous threads claiming must never lease the same slice twice."""
    coord = BrokerlessMicrotaskCoordinator(db_target=":memory:", default_canary_rate=0.0)
    for w_i in range(4):
        coord.register_worker(f"thr-{w_i}", "python_cpu")
    for t_i in range(20):
        coord.enqueue_microtask(
            campaign_id="race",
            island_id="markov_sinkhorn",
            task_type="SINKHORN_CALIBRATION",
            payload={"task_label": f"r-{t_i}"},
            deterministic_seed=500 + t_i,
            task_id=f"race-{t_i}",
        )

    claimed_by_worker: dict[str, list[str]] = {f"thr-{i}": [] for i in range(4)}

    def _claim_all(nid: str) -> None:
        while True:
            batch = coord.claim_batch(nid, now_ms=1_000, max_tasks=2)
            if not batch:
                break
            claimed_by_worker[nid].extend(b.task_id for b in batch)

    threads = [threading.Thread(target=_claim_all, args=(f"thr-{i}",)) for i in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    all_ids = [tid for tids in claimed_by_worker.values() for tid in tids]
    assert len(all_ids) == 20
    assert len(set(all_ids)) == 20
    coord.close()

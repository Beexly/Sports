"""Property & integration tests for E-Process safety, MAP-Elites, HotSwap & Miner."""

from __future__ import annotations

import dataclasses
import random

from gse_engine.fabric.e_process import SequentialEProcessGate
from gse_engine.fabric.foundry_compound_miner import sweep_foundry_and_corpus_primitives
from gse_engine.fabric.registry_hotswap import (
    ChampionBundle,
    HotSwapInferenceEngine,
    default_champion_bundle,
)
from gse_engine.fabric.worker_daemon import (
    HostResourceMonitor,
    run_evolutionary_campaign,
)


def test_e_process_martingale_null_safety_and_true_positive_power() -> None:
    """Under H0 noise false-promotion rate <= alpha across arbitrary stopping times."""
    rng = random.Random(20261116)
    alpha = 0.05
    n_trials = 2_000
    horizon = 60
    false_promotions = 0

    for _ in range(n_trials):
        gate = SequentialEProcessGate(alpha=alpha, score_scale=0.25)
        for _step in range(horizon):
            # Exact symmetric H0 null noise: champion_loss - challenger_loss ~ Rademacher * U
            noise = rng.choice([-1.0, 1.0]) * rng.uniform(0.01, 0.14)
            gate.step(champion_loss=0.25 + noise, challenger_loss=0.25)
            if gate.can_promote():
                false_promotions += 1
                break

    false_rate = false_promotions / float(n_trials)
    assert false_rate <= alpha, f"False promotion rate {false_rate:.4f} exceeded alpha={alpha}"

    # Under true positive CRPS improvement, sequential wealth promotes reliably.
    true_promotions = 0
    for _ in range(200):
        gate_h1 = SequentialEProcessGate(alpha=alpha, score_scale=0.25)
        for _step in range(80):
            drift = 0.065 + rng.gauss(0.0, 0.05)
            gate_h1.step(champion_loss=0.25 + drift, challenger_loss=0.25)
            if gate_h1.can_promote():
                true_promotions += 1
                break
    assert true_promotions / 200.0 >= 0.90


def test_e_process_blocks_promotion_on_invariant_failure() -> None:
    """High wealth must NEVER promote if even one invariant violation occurred."""
    gate = SequentialEProcessGate(alpha=0.05, score_scale=0.20)
    gate.step(champion_loss=0.40, challenger_loss=0.10, invariants_ok=False)
    for _ in range(50):
        gate.step(champion_loss=0.40, challenger_loss=0.10, invariants_ok=True)
    assert gate.wealth > 20.0
    assert gate.can_promote() is False


def test_hot_swap_sub_5ms_inference_sha_tamper_and_rollback() -> None:
    """Verify <5ms p99 inference, SHA-256 tamper rejection, and O(1) auto-rollback."""
    engine = HotSwapInferenceEngine()
    latencies = [
        engine.query(p1=0.56, p2=0.51, pairing="QB-WR", market_fair_prob=0.24).latency_ms
        for _ in range(200)
    ]
    latencies.sort()
    p99 = latencies[int(0.99 * len(latencies))]
    assert p99 < 5.0

    # Tampered SHA-256 must fail closed without altering active pointer.
    base = default_champion_bundle()
    tampered = dataclasses.replace(
        base, copula_params={**base.copula_params, "theta_qb_wr": 1.25}
    )
    ok_swap, reason = engine.hot_swap(tampered)
    assert ok_swap is False
    assert reason == "bundle_sha256_mismatch"

    # Non-stochastic Markov row must also fail closed.
    bad_markov = ChampionBundle.build(
        version_tag="v-bad-markov",
        island_origin="markov_sinkhorn",
        copula_params=base.copula_params,
        markov_drive_matrix=((0.9, 0.9), (0.5, 0.5)),
        sinkhorn_params=base.sinkhorn_params,
        conformal_offsets=base.conformal_offsets,
        corpus_pillar_weights=base.corpus_pillar_weights,
    )
    ok_m, r_m = engine.hot_swap(bad_markov)
    assert ok_m is False
    assert "markov_invariant" in r_m

    # Valid swap + health degradation triggers instant automatic rollback.
    valid_v2 = ChampionBundle.build(
        version_tag="v2.0.0-valid",
        island_origin="copula_tail",
        copula_params={**base.copula_params, "theta_qb_wr": 0.92},
        markov_drive_matrix=base.markov_drive_matrix,
        sinkhorn_params=base.sinkhorn_params,
        conformal_offsets=base.conformal_offsets,
        corpus_pillar_weights=base.corpus_pillar_weights,
    )
    ok_v2, _ = engine.hot_swap(valid_v2)
    assert ok_v2 is True
    assert engine.active_bundle.version_tag == "v2.0.0-valid"

    assert engine.record_health_sample(ok=False, latency_ms=12.0) is False
    assert engine.record_health_sample(ok=False, latency_ms=12.0) is False
    assert engine.record_health_sample(ok=False, latency_ms=12.0) is True
    assert engine.active_bundle.version_tag == "v1.0.0-baseline"


def test_opportunistic_throttling_campaign_and_foundry_shard_sweep() -> None:
    """Verify idle/load throttling, 5-island ETTC campaign, and Foundry miner."""
    mon = HostResourceMonitor()
    b_idle, s_idle = mon.throttle_policy(0.15)
    b_busy, s_busy = mon.throttle_policy(0.90)
    assert b_idle > b_busy
    assert s_idle < s_busy

    camp = run_evolutionary_campaign(generations=2)
    assert camp["tasks_completed"] >= 10
    assert len(camp["leaderboard"]) == 5
    assert camp["sample_query_latency_ms"] < 5.0

    shard = sweep_foundry_and_corpus_primitives(
        shard_index=0, num_shards=16, batch_limit=40, output_path=None, include_ro_db_stats=False
    )
    assert shard["files_swept"] > 0
    assert shard["primitives_extracted_total"] >= shard["files_swept"]
    assert len(shard["router_288bit_mask_hex"]) == 9

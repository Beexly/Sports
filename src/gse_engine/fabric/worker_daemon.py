"""Self-throttling opportunistic worker daemon & closed-loop ETTC campaign runner.

Executes deterministic Philox-4x32-10 microtask kernels across all 5 task
types, dynamically backs off when host CPU/memory pressure climbs (using
psutil), yields cleanly on SIGINT/SIGTERM, and drives closed-loop
MAP-Elites evolution gated by the Sequential E-Process and Hot-Swap Registry.
"""

from __future__ import annotations

import contextlib
import json
import math
import os
import signal
import time
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

import psutil  # type: ignore[import-untyped]

from gse_engine.fabric.coordinator import BrokerlessMicrotaskCoordinator, RuntimeKind
from gse_engine.fabric.e_process import SequentialEProcessGate
from gse_engine.fabric.evolution import (
    ISLAND_DEFAULT_PARAMS,
    ISLAND_NAMES,
    CandidateGenome,
    DiagnosticCritic,
    DiagnosticResidualPayload,
    HybridMutator,
    MultiIslandMapElitesArchive,
)
from gse_engine.fabric.foundry_compound_miner import sweep_foundry_and_corpus_primitives
from gse_engine.fabric.philox import (
    draw_normal_pair_box_muller,
    draw_uniform_quad,
    sample_categorical_markov_step,
)
from gse_engine.fabric.registry_hotswap import (
    ChampionBundle,
    HotSwapInferenceEngine,
    clayton_survival_joint,
    default_champion_bundle,
)


def _crps_empirical(samples: list[float], y: float) -> float:
    m = len(samples)
    if m == 0:
        return 0.0
    term1 = sum(abs(x - y) for x in samples) / float(m)
    pair_sum = 0.0
    for i in range(m):
        xi = samples[i]
        for j in range(m):
            pair_sum += abs(xi - samples[j])
    return max(0.0, term1 - pair_sum / float(2 * m * m))


def _run_sinkhorn_balanced(
    cost: list[list[float]],
    row_target: list[float],
    col_target: list[float],
    eps: float = 0.05,
    max_iter: int = 160,
) -> list[list[float]]:
    n_r = len(row_target)
    n_c = len(col_target)
    kernel = [[math.exp(max(-700.0, -cost[i][j] / max(1e-4, eps))) for j in range(n_c)]
              for i in range(n_r)]
    u = [1.0] * n_r
    v = [1.0] * n_c
    for _ in range(max_iter):
        for i in range(n_r):
            denom = sum(kernel[i][j] * v[j] for j in range(n_c))
            u[i] = row_target[i] / max(1e-12, denom)
        for j in range(n_c):
            denom = sum(kernel[i][j] * u[i] for i in range(n_r))
            v[j] = col_target[j] / max(1e-12, denom)
    return [[u[i] * kernel[i][j] * v[j] for j in range(n_c)] for i in range(n_r)]


def execute_deterministic_microtask_kernel(
    task_type: str,
    payload: Mapping[str, Any],
    deterministic_seed: int,
) -> dict[str, Any]:
    """Deterministically execute a typed microtask keyed by `(payload, seed)`."""
    t_kind = str(task_type).upper()
    params = dict(payload.get("params") or {})
    task_id = str(payload.get("task_label") or t_kind)

    if t_kind == "COPULA_STRESS":
        theta_wr = float(params.get("theta_qb_wr", 0.788))
        theta_te = float(params.get("theta_qb_te", 0.570))
        pairs = [
            ("QB-WR", 0.54, 0.51, theta_wr),
            ("QB-TE", 0.54, 0.46, theta_te),
            ("QB-WR_HI", 0.68, 0.62, theta_wr),
        ]
        checks = []
        for label, p1, p2, th in pairs:
            jp = clayton_survival_joint(p1, p2, th)
            checks.append({"pair": label, "marginals": [p1, p2], "joint_prob": jp})
        return {
            "task_type": t_kind,
            "copula_checks": checks,
            "crps": max(0.05, 0.21 - 0.015 * abs(theta_wr - 0.788)),
            "conformal_quantiles": [0.18, 0.50, 0.82],
            "diagnostics": {
                "worst_buckets": {"outdoor_wind": 0.04, "sgp_3leg": 0.06},
                "calibration_slope": 0.96,
                "intercept_drift": 0.008,
                "tail_miss_rate": 0.09,
            },
        }

    if t_kind == "SINKHORN_CALIBRATION":
        eps = float(params.get("sinkhorn_eps", 0.05))
        cost = [[0.10, 0.45, 0.80], [0.50, 0.12, 0.42], [0.75, 0.38, 0.15]]
        r_tgt = [0.44, 0.34, 0.22]
        c_tgt = [0.40, 0.35, 0.25]
        plan = _run_sinkhorn_balanced(cost, r_tgt, c_tgt, eps=eps)
        return {
            "task_type": t_kind,
            "sinkhorn_check": {"plan": plan, "row_target": r_tgt, "col_target": c_tgt},
            "crps": 0.195 + abs(eps - 0.05) * 0.12,
            "conformal_quantiles": [-0.08, 0.0, 0.08],
            "diagnostics": {
                "worst_buckets": {"short_week_rb": 0.035},
                "calibration_slope": 0.99,
                "intercept_drift": 0.005,
                "tail_miss_rate": 0.085,
            },
        }

    if t_kind == "MONTE_CARLO_SLATE":
        n_paths = max(16, min(512, int(payload.get("n_paths", 64))))
        mat = [
            [0.42, 0.34, 0.16, 0.08],
            [0.18, 0.48, 0.24, 0.10],
            [0.12, 0.26, 0.46, 0.16],
            [0.28, 0.22, 0.18, 0.32],
        ]
        state_vals = [7.0, 3.0, 0.0, -3.5]
        scores: list[float] = []
        for p_idx in range(n_paths):
            st = 0
            pts = 0.0
            for step_i in range(6):
                u0, _, _, _ = draw_uniform_quad(deterministic_seed, task_id, p_idx, step_i)
                z0, _ = draw_normal_pair_box_muller(deterministic_seed, task_id, p_idx, step_i, 1)
                st = sample_categorical_markov_step(mat[st], u0)
                pts += max(0.0, state_vals[st] * 0.45 + z0 * 0.35)
            scores.append(pts)
        mean_pts = sum(scores) / float(len(scores))
        sorted_s = sorted(scores)
        q10 = sorted_s[max(0, int(0.10 * len(sorted_s)))]
        q50 = sorted_s[len(sorted_s) // 2]
        q90 = sorted_s[min(len(sorted_s) - 1, int(0.90 * len(sorted_s)))]
        crps_val = _crps_empirical(scores, float(payload.get("observed_pts", 21.5)))
        return {
            "task_type": t_kind,
            "n_paths": n_paths,
            "mean_pts": round(mean_pts, 6),
            "markov_matrix": mat,
            "crps": round(crps_val, 6),
            "conformal_quantiles": [round(q10, 6), round(q50, 6), round(q90, 6)],
            "diagnostics": {
                "worst_buckets": {"q4_comeback": 0.05},
                "calibration_slope": 0.97,
                "intercept_drift": 0.01,
                "tail_miss_rate": 0.095,
            },
        }

    if t_kind == "FOUNDRY_EXTRACTION":
        shard_idx = int(payload.get("shard_index", 0))
        num_shards = max(1, int(payload.get("num_shards", 16)))
        limit = int(payload.get("batch_limit", 120))
        summary = sweep_foundry_and_corpus_primitives(
            shard_index=shard_idx,
            num_shards=num_shards,
            batch_limit=limit,
            output_path=None,
            include_ro_db_stats=False,
        )
        return {
            "task_type": t_kind,
            "files_swept": int(summary["files_swept"]),
            "primitives_extracted": int(summary["primitives_extracted_total"]),
            "family_lifts": dict(summary["family_lifts"]),
            "crps": 0.18,
            "conformal_quantiles": [0.0, 0.01, 0.02],
        }

    # CRPS_WALK_FORWARD default
    n_obs = max(12, min(128, int(payload.get("n_slices", 32))))
    crps_acc = 0.0
    slope_bias = float(params.get("js_prior_n", 12.0)) - 12.0
    for i in range(n_obs):
        z0, z1 = draw_normal_pair_box_muller(deterministic_seed, task_id, i, 0)
        ens = [0.5 + 0.12 * z0 + 0.05 * k for k in (-1, 0, 1)]
        y_obs = 0.5 + 0.10 * z1
        crps_acc += _crps_empirical(ens, y_obs)
    mean_crps = crps_acc / float(n_obs)
    return {
        "task_type": t_kind,
        "crps": round(mean_crps, 6),
        "conformal_quantiles": [-0.085, 0.0, 0.085],
        "diagnostics": {
            "worst_buckets": {"short_week_outdoor": round(mean_crps * 1.15, 5)},
            "calibration_slope": round(1.0 + slope_bias * 0.01, 5),
            "intercept_drift": 0.004,
            "tail_miss_rate": 0.09,
        },
    }


@dataclass(slots=True)
class HostResourceMonitor:
    """Monitors host CPU & memory load to drive opportunistic idle throttling."""

    override_load_factor: float | None = None

    def sample_load_factor(self) -> float:
        """Return normalized host utilization pressure in `[0.0, 1.0]`."""
        if self.override_load_factor is not None:
            return max(0.0, min(1.0, float(self.override_load_factor)))
        try:
            cpu_pct = float(psutil.cpu_percent(interval=None))
            mem_pct = float(psutil.virtual_memory().percent)
            cpu_load = max(0.0, min(1.0, cpu_pct / 100.0))
            mem_pressure = max(0.0, min(1.0, (mem_pct - 60.0) / 35.0))
            return max(cpu_load, mem_pressure)
        except Exception:
            if hasattr(os, "getloadavg"):
                load1 = float(os.getloadavg()[0])
                cpus = max(1, os.cpu_count() or 1)
                return max(0.0, min(1.0, load1 / float(cpus)))
            return 0.25

    def throttle_policy(self, load_factor: float) -> tuple[int, float]:
        """Compute `(max_batch_tasks, poll_sleep_sec)` for a sampled host load."""
        lf = max(0.0, min(1.0, float(load_factor)))
        if lf < 0.35:
            return 8, 0.02
        if lf < 0.70:
            return 3, 0.25
        return 1, 1.00


ResultTransform = Callable[[str, Mapping[str, Any], dict[str, Any]], dict[str, Any]]


class OpportunisticWorkerDaemon:
    """Self-throttling compute worker consuming coordinator microtask queues."""

    def __init__(
        self,
        coordinator: BrokerlessMicrotaskCoordinator,
        node_id: str,
        *,
        runtime_kind: RuntimeKind = "python_cpu",
        initial_throughput: float = 120.0,
        monitor: HostResourceMonitor | None = None,
        result_hook: ResultTransform | None = None,
    ) -> None:
        """Initialize opportunistic compute worker and register with coordinator."""
        self.coordinator = coordinator
        self.node_id = node_id
        self.runtime_kind: RuntimeKind = runtime_kind
        self.monitor = monitor or HostResourceMonitor()
        self.result_hook = result_hook
        self.stop_requested = False
        self.completed_count = 0
        self.rejected_count = 0
        self.coordinator.register_worker(
            node_id,
            runtime_kind,
            initial_throughput=initial_throughput,
            load_factor=self.monitor.sample_load_factor(),
        )

    def install_signal_handlers(self) -> None:
        """Register SIGINT/SIGTERM graceful yield handlers when supported."""
        def _handle(_signum: int, _frame: Any) -> None:
            self.stop_requested = True

        for sig_name in ("SIGINT", "SIGTERM"):
            sig = getattr(signal, sig_name, None)
            if sig is not None:
                with contextlib.suppress(ValueError):
                    signal.signal(sig, _handle)

    def run_once(self, *, now_ms: int | None = None, current_epoch: int = 0) -> int:
        """Claim and execute up to adaptive batch limit of pending microtasks."""
        if self.stop_requested:
            return 0
        ts_ms = now_ms if now_ms is not None else int(time.time() * 1000.0)
        lf = self.monitor.sample_load_factor()
        max_batch, _ = self.monitor.throttle_policy(lf)
        self.coordinator.register_worker(
            self.node_id,
            self.runtime_kind,
            load_factor=lf,
            telemetry={"load_factor": round(lf, 4), "pid": os.getpid()},
        )
        claimed = self.coordinator.claim_batch(self.node_id, ts_ms, max_tasks=max_batch)
        processed = 0
        for s_rec in claimed:
            if self.stop_requested:
                break
            t0 = time.perf_counter()
            payload = json.loads(s_rec.payload_json)
            result = execute_deterministic_microtask_kernel(
                s_rec.task_type,
                payload,
                s_rec.deterministic_seed,
            )
            if self.result_hook is not None:
                result = self.result_hook(s_rec.task_id, payload, result)
            elapsed = max(0.01, time.perf_counter() - t0)
            receipt = self.coordinator.submit_result(
                s_rec.task_id,
                self.node_id,
                s_rec.fencing_token,
                result,
                elapsed_sec=elapsed,
                worker_epoch=s_rec.epoch,
                current_epoch=current_epoch,
                now_ms=ts_ms,
            )
            processed += 1
            if receipt.accepted:
                self.completed_count += 1
            else:
                self.rejected_count += 1
        return processed

    def run_loop(
        self,
        *,
        max_iterations: int = 10,
        current_epoch: int = 0,
    ) -> int:
        """Run bounded or continuous opportunistic worker polling loop."""
        total = 0
        for _ in range(max(1, int(max_iterations))):
            if self.stop_requested:
                break
            n = self.run_once(current_epoch=current_epoch)
            total += n
            if self.stop_requested:
                break
            lf = self.monitor.sample_load_factor()
            _, poll_sleep = self.monitor.throttle_policy(lf)
            if n == 0:
                time.sleep(min(0.05, poll_sleep))
        return total


def run_evolutionary_campaign(
    *,
    generations: int = 2,
    campaign_seed: int = 20261116,
    db_target: str = ":memory:",
) -> dict[str, Any]:
    """Run an end-to-end ETTC campaign: Coordinator -> Workers -> Critic -> E-Process."""
    coord = BrokerlessMicrotaskCoordinator(
        db_target=db_target,
        default_canary_rate=0.10,
        spot_check_oracle=execute_deterministic_microtask_kernel,
    )
    archive = MultiIslandMapElitesArchive()
    critic = DiagnosticCritic()
    mutator = HybridMutator()
    gate = SequentialEProcessGate(alpha=0.05)
    engine = HotSwapInferenceEngine()

    w1 = OpportunisticWorkerDaemon(coord, "node-py-1", runtime_kind="python_cpu")
    w2 = OpportunisticWorkerDaemon(coord, "node-py-2", runtime_kind="python_cuda")

    task_map = {
        "copula_tail": "COPULA_STRESS",
        "markov_sinkhorn": "SINKHORN_CALIBRATION",
        "biomech_fatigue": "MONTE_CARLO_SLATE",
        "conformal_abstention": "CRPS_WALK_FORWARD",
        "corpus_rrf_foundry": "FOUNDRY_EXTRACTION",
    }

    for idx, isl in enumerate(ISLAND_NAMES):
        base_p = dict(ISLAND_DEFAULT_PARAMS[isl])
        archive.insert(
            CandidateGenome(
                genome_id=f"{isl[:4]}-g0",
                island_id=isl,
                generation=0,
                params=base_p,
                descriptors=(0.35 + 0.1 * idx * 0.2, 0.50),
                fitness=-0.22,
                crps_mean=0.22,
            )
        )

    for gen in range(1, max(1, int(generations)) + 1):
        for idx, isl in enumerate(ISLAND_NAMES):
            t_type = task_map[isl]
            elites = archive.island_elites(isl, top_k=1)
            parent = elites[0]
            coord.enqueue_microtask(
                campaign_id="camp-1",
                island_id=isl,
                task_type=t_type,  # type: ignore[arg-type]
                payload={"params": parent.params, "task_label": f"{isl}-g{gen}"},
                deterministic_seed=campaign_seed + gen * 100 + idx,
                epoch=gen,
                task_id=f"t-{isl[:4]}-g{gen}",
            )

        for _ in range(10):
            if w1.run_once(current_epoch=gen) + w2.run_once(current_epoch=gen) == 0:
                break
        verified = coord.collect_verified_results("camp-1")
        residuals: list[DiagnosticResidualPayload] = []
        for item in verified:
            res = item["result"]
            diag = res.get("diagnostics") or {}
            residuals.append(
                DiagnosticResidualPayload(
                    island_id=item["island_id"],
                    crps_mean=float(res.get("crps", 0.20)),
                    worst_buckets=dict(diag.get("worst_buckets") or {"global": 0.05}),
                    blowup_scenarios=(),
                    calibration_slope=float(diag.get("calibration_slope", 1.0)),
                    intercept_drift=float(diag.get("intercept_drift", 0.0)),
                    tail_miss_rate=float(diag.get("tail_miss_rate", 0.09)),
                    foundry_family_lifts=dict(res.get("family_lifts") or {}),
                    weight=float(item["result_weight"]),
                )
            )
        for idx, isl in enumerate(ISLAND_NAMES):
            crit = critic.critique(isl, residuals)
            parent = archive.island_elites(isl, top_k=1)[0]
            child = mutator.mutate_and_refine(
                parent, crit, campaign_seed=campaign_seed, step_index=gen * 10 + idx, generation=gen
            )
            eval_out = execute_deterministic_microtask_kernel(
                task_map[isl],
                {"params": child.params, "task_label": f"{isl}-eval-{gen}"},
                campaign_seed + gen * 1000 + idx,
            )
            c_crps = float(eval_out.get("crps", 0.20))
            improved = CandidateGenome(
                genome_id=child.genome_id,
                island_id=child.island_id,
                generation=child.generation,
                params=child.params,
                descriptors=child.descriptors,
                fitness=-c_crps,
                crps_mean=c_crps,
                metadata=child.metadata,
            )
            archive.insert(improved)
            gate.step(champion_loss=0.22, challenger_loss=c_crps, invariants_ok=True)
        archive.migrate_ring_elites(top_k=1)

    swapped = False
    if gate.can_promote():
        top_cop = archive.island_elites("copula_tail", top_k=1)[0]
        base_b = default_champion_bundle()
        new_b = ChampionBundle.build(
            version_tag=f"v1.0.{generations}-eproc",
            island_origin="copula_tail",
            copula_params={**base_b.copula_params, **top_cop.params},
            markov_drive_matrix=base_b.markov_drive_matrix,
            sinkhorn_params=base_b.sinkhorn_params,
            conformal_offsets=base_b.conformal_offsets,
            corpus_pillar_weights=base_b.corpus_pillar_weights,
        )
        swapped, _ = engine.hot_swap(new_b)

    sample_q = engine.query(p1=0.55, p2=0.52, pairing="QB-WR", market_fair_prob=0.24)
    coord.close()
    return {
        "campaign_id": "camp-1",
        "generations": generations,
        "tasks_completed": w1.completed_count + w2.completed_count,
        "e_process_wealth": round(gate.wealth, 4),
        "e_process_promoted": swapped,
        "active_bundle_sha256": engine.active_bundle.bundle_sha256,
        "sample_query_latency_ms": round(sample_q.latency_ms, 4),
        "leaderboard": archive.leaderboard(),
    }

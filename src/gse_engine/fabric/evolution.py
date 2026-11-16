"""Multi-island MAP-Elites archive, diagnostic critic, and hybrid mutator.

Transforms distributed microtask workers into a closed-loop Evolutionary
Test-Time Compute (ETTC) system across 5 isolated islands with structured
residual diagnostics, Philox-4x32-10 reproducible mutations, ring migration,
and bounded L-BFGS-B local numerical refinement via scipy.optimize.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any

from scipy.optimize import minimize  # type: ignore[import-untyped]

from gse_engine.fabric.philox import draw_uniform_quad

ISLAND_NAMES: tuple[str, ...] = (
    "copula_tail",
    "markov_sinkhorn",
    "biomech_fatigue",
    "conformal_abstention",
    "corpus_rrf_foundry",
)

PARAM_BOUNDS: dict[str, tuple[float, float]] = {
    "theta_qb_wr": (0.20, 1.80),
    "theta_qb_te": (0.15, 1.40),
    "student_t_nu": (3.0, 24.0),
    "clayton_mix": (0.05, 0.95),
    "sinkhorn_eps": (0.015, 0.20),
    "vmls_kkt_lambda": (0.01, 0.40),
    "dirichlet_conc_base": (12.0, 34.0),
    "proe_script_gain": (0.20, 1.25),
    "cox_weibull_k": (1.10, 2.80),
    "short_week_q4_decay": (-0.06, -0.002),
    "wind_drag_mult": (0.40, 1.80),
    "qb_vcl_slope": (0.05, 0.45),
    "barber_decay_rho": (0.72, 0.96),
    "cqr_alpha": (0.05, 0.25),
    "min_edge_threshold": (0.008, 0.055),
    "js_prior_n": (6.0, 24.0),
    "rrf_k": (20.0, 100.0),
    "foundry_primitive_boost": (0.02, 0.35),
    "authority_prior_weight": (0.20, 1.50),
    "ig360_blend": (0.15, 0.85),
}

ISLAND_DEFAULT_PARAMS: dict[str, dict[str, float]] = {
    "copula_tail": {
        "theta_qb_wr": 0.788,
        "theta_qb_te": 0.570,
        "student_t_nu": 6.0,
        "clayton_mix": 0.65,
    },
    "markov_sinkhorn": {
        "sinkhorn_eps": 0.05,
        "vmls_kkt_lambda": 0.08,
        "dirichlet_conc_base": 20.0,
        "proe_script_gain": 0.65,
    },
    "biomech_fatigue": {
        "cox_weibull_k": 1.65,
        "short_week_q4_decay": -0.018,
        "wind_drag_mult": 1.0,
        "qb_vcl_slope": 0.18,
    },
    "conformal_abstention": {
        "barber_decay_rho": 0.89,
        "cqr_alpha": 0.10,
        "min_edge_threshold": 0.020,
        "js_prior_n": 12.0,
    },
    "corpus_rrf_foundry": {
        "rrf_k": 60.0,
        "foundry_primitive_boost": 0.14,
        "authority_prior_weight": 0.85,
        "ig360_blend": 0.45,
    },
}


@dataclass(frozen=True, slots=True)
class CandidateGenome:
    """Immutable candidate parameterization residing inside an island cell."""

    genome_id: str
    island_id: str
    generation: int
    params: dict[str, float]
    descriptors: tuple[float, float]
    fitness: float
    crps_mean: float
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class DiagnosticResidualPayload:
    """Structured out-of-sample error diagnostics emitted by walk-forward slices."""

    island_id: str
    crps_mean: float
    worst_buckets: dict[str, float]
    blowup_scenarios: tuple[str, ...]
    calibration_slope: float
    intercept_drift: float
    tail_miss_rate: float
    foundry_family_lifts: dict[str, float] = field(default_factory=dict)
    weight: float = 1.0


@dataclass(frozen=True, slots=True)
class CritiqueSummary:
    """Structured failure synthesis and targeted directional nudges for the mutator."""

    island_id: str
    dominant_failure_regime: str
    weighted_crps: float
    weighted_slope: float
    weighted_intercept: float
    weighted_tail_miss: float
    worst_bucket: str
    parameter_nudges: dict[str, float]
    recommended_op: str


def clip_param(key: str, val: float) -> float:
    """Clamp parameter strictly within physical/mathematical domain bounds."""
    lo, hi = PARAM_BOUNDS.get(key, (-10.0, 10.0))
    if not math.isfinite(val):
        return 0.5 * (lo + hi)
    return max(lo, min(hi, float(val)))


class MultiIslandMapElitesArchive:
    """5-island 2D behavioral MAP-Elites archive with periodic ring migration."""

    def __init__(
        self,
        *,
        islands: Sequence[str] = ISLAND_NAMES,
        bins_per_axis: int = 6,
    ) -> None:
        """Initialize isolated behavioral grids across all evolutionary islands."""
        self.islands = tuple(islands)
        self.bins_per_axis = max(2, int(bins_per_axis))
        self._grids: dict[str, dict[tuple[int, int], CandidateGenome]] = {
            isl: {} for isl in self.islands
        }

    def _cell_index(self, descriptors: tuple[float, float]) -> tuple[int, int]:
        b0 = max(0.0, min(0.999999, float(descriptors[0])))
        b1 = max(0.0, min(0.999999, float(descriptors[1])))
        return (int(b0 * self.bins_per_axis), int(b1 * self.bins_per_axis))

    def insert(self, candidate: CandidateGenome) -> bool:
        """Insert candidate if its behavioral cell is empty or beaten in fitness."""
        if candidate.island_id not in self._grids:
            self._grids[candidate.island_id] = {}
        cell = self._cell_index(candidate.descriptors)
        grid = self._grids[candidate.island_id]
        existing = grid.get(cell)
        if existing is None or candidate.fitness > existing.fitness:
            grid[cell] = candidate
            return True
        return False

    def island_elites(self, island_id: str, top_k: int = 3) -> list[CandidateGenome]:
        """Return top-k elites in a given island ordered by descending fitness."""
        grid = self._grids.get(island_id, {})
        ranked = sorted(grid.values(), key=lambda c: (-c.fitness, c.crps_mean, c.genome_id))
        return ranked[:top_k]

    def migrate_ring_elites(self, top_k: int = 2) -> int:
        """Cross-pollinate elites along an island ring without overwriting specialists."""
        moved = 0
        if len(self.islands) < 2:
            return 0
        snapshots = [self.island_elites(isl, top_k=top_k) for isl in self.islands]
        for idx, dst_isl in enumerate(self.islands):
            src_elites = snapshots[(idx - 1) % len(self.islands)]
            dst_defaults = ISLAND_DEFAULT_PARAMS.get(dst_isl, {})
            for rank_i, src in enumerate(src_elites):
                blended: dict[str, float] = {}
                for k, base_v in dst_defaults.items():
                    if k in src.params:
                        blended[k] = clip_param(k, 0.5 * base_v + 0.5 * src.params[k])
                    else:
                        blended[k] = clip_param(k, base_v)
                for k, v in src.params.items():
                    if k not in blended:
                        blended[k] = clip_param(k, v)
                migrant = CandidateGenome(
                    genome_id=f"{src.genome_id}-mig-{dst_isl[:4]}-{rank_i}",
                    island_id=dst_isl,
                    generation=src.generation + 1,
                    params=blended,
                    descriptors=(
                        max(0.0, min(1.0, src.descriptors[0] * 0.9 + 0.05)),
                        max(0.0, min(1.0, src.descriptors[1] * 0.9 + 0.05)),
                    ),
                    fitness=src.fitness - 1e-4,
                    crps_mean=src.crps_mean,
                    metadata={**src.metadata, "migrated_from": src.island_id},
                )
                if self.insert(migrant):
                    moved += 1
        return moved

    def leaderboard(self) -> list[dict[str, Any]]:
        """Summarize per-island coverage, best fitness, and lowest CRPS."""
        rows: list[dict[str, Any]] = []
        total_cells = self.bins_per_axis * self.bins_per_axis
        for isl in self.islands:
            grid = self._grids.get(isl, {})
            elites = self.island_elites(isl, top_k=1)
            best = elites[0] if elites else None
            rows.append(
                {
                    "island_id": isl,
                    "occupied_cells": len(grid),
                    "total_cells": total_cells,
                    "coverage_pct": round(100.0 * len(grid) / float(total_cells), 2),
                    "best_genome_id": best.genome_id if best else None,
                    "best_fitness": round(best.fitness, 6) if best else None,
                    "best_crps": round(best.crps_mean, 6) if best else None,
                    "best_params": dict(best.params) if best else {},
                }
            )
        return rows


class DiagnosticCritic:
    """Aggregates weighted walk-forward residuals into targeted parameter critiques."""

    def critique(
        self,
        island_id: str,
        residuals: Sequence[DiagnosticResidualPayload],
    ) -> CritiqueSummary:
        """Synthesize worst buckets, calibration drift & tail misses into nudges."""
        filtered = [r for r in residuals if r.island_id == island_id and r.weight > 0.0]
        if not filtered:
            filtered = [r for r in residuals if r.weight > 0.0]
        if not filtered:
            return CritiqueSummary(
                island_id=island_id,
                dominant_failure_regime="NO_DATA",
                weighted_crps=0.25,
                weighted_slope=1.0,
                weighted_intercept=0.0,
                weighted_tail_miss=0.10,
                worst_bucket="none",
                parameter_nudges={},
                recommended_op="explore",
            )

        w_sum = sum(r.weight for r in filtered) or 1.0
        w_crps = sum(r.weight * r.crps_mean for r in filtered) / w_sum
        w_slope = sum(r.weight * r.calibration_slope for r in filtered) / w_sum
        w_inter = sum(r.weight * r.intercept_drift for r in filtered) / w_sum
        w_tail = sum(r.weight * r.tail_miss_rate for r in filtered) / w_sum

        bucket_totals: dict[str, float] = {}
        for r in filtered:
            for b_name, b_err in r.worst_buckets.items():
                bucket_totals[b_name] = bucket_totals.get(b_name, 0.0) + r.weight * float(b_err)
        worst_bucket = (
            max(bucket_totals.items(), key=lambda kv: kv[1])[0] if bucket_totals else "global"
        )

        nudges: dict[str, float] = {}
        regime = "WELL_CALIBRATED"
        if w_tail > 0.14:
            regime = "TAIL_UNDER_COVERAGE"
            nudges["student_t_nu"] = -1.2
            nudges["barber_decay_rho"] = -0.025
            nudges["cqr_alpha"] = -0.015
            nudges["theta_qb_wr"] = 0.05
        elif w_slope < 0.85:
            regime = "OVERCONFIDENT_SLOPE"
            nudges["js_prior_n"] = 2.0
            nudges["vmls_kkt_lambda"] = 0.02
            nudges["min_edge_threshold"] = 0.004
        elif w_slope > 1.15:
            regime = "UNDERCONFIDENT_SLOPE"
            nudges["js_prior_n"] = -1.5
            nudges["proe_script_gain"] = 0.05
        elif abs(w_inter) > 0.03:
            regime = "INTERCEPT_BIAS"
            nudges["ig360_blend"] = 0.05 if w_inter > 0 else -0.05
            nudges["foundry_primitive_boost"] = 0.03
        else:
            nudges["authority_prior_weight"] = 0.03

        if "wind" in worst_bucket.lower() or "outdoor" in worst_bucket.lower():
            nudges["wind_drag_mult"] = nudges.get("wind_drag_mult", 0.0) + 0.08
        if "short_week" in worst_bucket.lower() or "q4" in worst_bucket.lower():
            nudges["short_week_q4_decay"] = nudges.get("short_week_q4_decay", 0.0) - 0.003

        op = "local_refine" if w_crps < 0.22 and abs(w_slope - 1.0) < 0.12 else "critique_mutate"
        return CritiqueSummary(
            island_id=island_id,
            dominant_failure_regime=regime,
            weighted_crps=round(w_crps, 6),
            weighted_slope=round(w_slope, 6),
            weighted_intercept=round(w_inter, 6),
            weighted_tail_miss=round(w_tail, 6),
            worst_bucket=worst_bucket,
            parameter_nudges=nudges,
            recommended_op=op,
        )


class HybridMutator:
    """Combines Critique-guided mutation, elite crossover, and scipy L-BFGS-B polish."""

    def mutate_and_refine(
        self,
        parent: CandidateGenome,
        critique: CritiqueSummary,
        *,
        partner: CandidateGenome | None = None,
        campaign_seed: int = 20261116,
        step_index: int = 0,
        surrogate_loss: Callable[[Mapping[str, float]], float] | None = None,
        generation: int | None = None,
    ) -> CandidateGenome:
        """Produce a bounded offspring genome using critique, crossover & L-BFGS-B."""
        new_params: dict[str, float] = {}
        keys = sorted(parent.params.keys())

        for k_idx, k in enumerate(keys):
            lo, hi = PARAM_BOUNDS.get(k, (-10.0, 10.0))
            span = max(1e-6, hi - lo)
            u0, u1, u2, _ = draw_uniform_quad(
                campaign_seed,
                parent.genome_id,
                k_idx,
                step_index,
            )
            base_val = float(parent.params[k])
            if partner is not None and k in partner.params and u0 < 0.35:
                base_val = (0.5 + 0.5 * (u1 - 0.5)) * base_val + (
                    0.5 - 0.5 * (u1 - 0.5)
                ) * float(partner.params[k])
            nudge = float(critique.parameter_nudges.get(k, 0.0))
            jitter = (u2 - 0.5) * 0.08 * span
            new_params[k] = clip_param(k, base_val + nudge + jitter)

        if surrogate_loss is not None and keys:
            x0 = [new_params[k] for k in keys]
            bounds = [PARAM_BOUNDS.get(k, (-10.0, 10.0)) for k in keys]

            def _obj(vec: Any) -> float:
                cand = {k: float(vec[i]) for i, k in enumerate(keys)}
                return float(surrogate_loss(cand))

            res = minimize(
                _obj,
                x0,
                method="L-BFGS-B",
                bounds=bounds,
                options={"maxiter": 18, "ftol": 1e-6},
            )
            if res.x is not None:
                for i, k in enumerate(keys):
                    new_params[k] = clip_param(k, float(res.x[i]))

        # Compute normalized 2D behavioral descriptors in [0, 1] x [0, 1].
        norm_coords: list[float] = []
        for k in keys:
            lo, hi = PARAM_BOUNDS.get(k, (-1.0, 1.0))
            norm_coords.append((new_params[k] - lo) / max(1e-6, hi - lo))
        b0 = sum(norm_coords[::2]) / max(1, len(norm_coords[::2])) if norm_coords else 0.5
        b1 = sum(norm_coords[1::2]) / max(1, len(norm_coords[1::2])) if norm_coords else 0.5
        next_gen = generation if generation is not None else parent.generation + 1

        return CandidateGenome(
            genome_id=f"{parent.island_id[:4]}-g{next_gen}-s{step_index}",
            island_id=parent.island_id,
            generation=next_gen,
            params=new_params,
            descriptors=(max(0.0, min(1.0, b0)), max(0.0, min(1.0, b1))),
            fitness=parent.fitness,
            crps_mean=parent.crps_mean,
            metadata={
                "parent": parent.genome_id,
                "critique_regime": critique.dominant_failure_regime,
            },
        )

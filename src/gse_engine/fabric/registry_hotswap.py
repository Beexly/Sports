"""SHA-256 content-addressed Champion registry and <5ms hot-swap inference.

Maintains immutable verified ChampionBundles and performs O(1) atomic pointer
swaps with pre-swap invariant checks (Frechet-Hoeffding bounds, Markov row
stochasticity, monotonic conformal quantiles, and SHA-256 content verification)
plus instant one-pointer rollback when live health telemetry degrades.
"""

from __future__ import annotations

import hashlib
import json
import math
import time
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field

from gse_engine.fabric.invariants import (
    verify_frechet_hoeffding_bounds,
    verify_markov_row_stochastic,
    verify_proper_scoring_and_conformal,
)


@dataclass(frozen=True, slots=True)
class ChampionBundle:
    """Immutable content-addressed model parameter bundle for live serving."""

    version_tag: str
    island_origin: str
    copula_params: dict[str, float]
    markov_drive_matrix: tuple[tuple[float, ...], ...]
    sinkhorn_params: dict[str, float]
    conformal_offsets: dict[str, float]
    corpus_pillar_weights: dict[str, float]
    bundle_sha256: str = ""

    @staticmethod
    def build(
        *,
        version_tag: str,
        island_origin: str,
        copula_params: Mapping[str, float],
        markov_drive_matrix: Sequence[Sequence[float]],
        sinkhorn_params: Mapping[str, float],
        conformal_offsets: Mapping[str, float],
        corpus_pillar_weights: Mapping[str, float],
    ) -> ChampionBundle:
        """Construct an immutable bundle sealed with deterministic SHA-256."""
        mat = tuple(tuple(float(v) for v in row) for row in markov_drive_matrix)
        core = {
            "version_tag": version_tag,
            "island_origin": island_origin,
            "copula_params": {str(k): float(v) for k, v in sorted(copula_params.items())},
            "markov_drive_matrix": [list(r) for r in mat],
            "sinkhorn_params": {str(k): float(v) for k, v in sorted(sinkhorn_params.items())},
            "conformal_offsets": {str(k): float(v) for k, v in sorted(conformal_offsets.items())},
            "corpus_pillar_weights": {
                str(k): float(v) for k, v in sorted(corpus_pillar_weights.items())
            },
        }
        digest = hashlib.sha256(
            json.dumps(core, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        return ChampionBundle(
            version_tag=version_tag,
            island_origin=island_origin,
            copula_params=core["copula_params"],  # type: ignore[arg-type]
            markov_drive_matrix=mat,
            sinkhorn_params=core["sinkhorn_params"],  # type: ignore[arg-type]
            conformal_offsets=core["conformal_offsets"],  # type: ignore[arg-type]
            corpus_pillar_weights=core["corpus_pillar_weights"],  # type: ignore[arg-type]
            bundle_sha256=digest,
        )


def compute_bundle_sha256(bundle: ChampionBundle) -> str:
    """Recompute expected SHA-256 content address of a ChampionBundle."""
    core = {
        "version_tag": bundle.version_tag,
        "island_origin": bundle.island_origin,
        "copula_params": {str(k): float(v) for k, v in sorted(bundle.copula_params.items())},
        "markov_drive_matrix": [list(r) for r in bundle.markov_drive_matrix],
        "sinkhorn_params": {str(k): float(v) for k, v in sorted(bundle.sinkhorn_params.items())},
        "conformal_offsets": {
            str(k): float(v) for k, v in sorted(bundle.conformal_offsets.items())
        },
        "corpus_pillar_weights": {
            str(k): float(v) for k, v in sorted(bundle.corpus_pillar_weights.items())
        },
    }
    return hashlib.sha256(
        json.dumps(core, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def clayton_survival_joint(p1: float, p2: float, theta: float) -> float:
    """Compute pairing-dependent Clayton survival copula joint exceedance probability."""
    a = min(1.0, max(0.0, float(p1)))
    b = min(1.0, max(0.0, float(p2)))
    ind = a * b
    if not math.isfinite(theta) or theta <= 1e-6:
        return ind
    u = 1.0 - a
    v = 1.0 - b
    if u <= 0.0 or v <= 0.0:
        return min(a, b)
    c = (u ** (-theta) + v ** (-theta) - 1.0) ** (-1.0 / theta)
    joint = 1.0 - u - v + c
    return float(min(min(a, b), max(ind, joint)))


def verify_champion_bundle(bundle: ChampionBundle) -> tuple[bool, str]:
    """Verify SHA-256 integrity and hard mathematical invariants before serving."""
    if bundle.bundle_sha256 != compute_bundle_sha256(bundle):
        return False, "bundle_sha256_mismatch"

    mv = verify_markov_row_stochastic(bundle.markov_drive_matrix, tol=1e-6)
    if not mv.ok:
        return False, f"markov_invariant:{mv.reason}"

    eps = float(bundle.sinkhorn_params.get("sinkhorn_eps", 0.0))
    if not math.isfinite(eps) or eps <= 0.0:
        return False, "invalid_sinkhorn_eps"

    q_lo = float(bundle.conformal_offsets.get("q_lo_delta", -0.08))
    q_mid = float(bundle.conformal_offsets.get("q_mid_delta", 0.0))
    q_hi = float(bundle.conformal_offsets.get("q_hi_delta", 0.08))
    cv = verify_proper_scoring_and_conformal(0.0, [0.5 + q_lo, 0.5 + q_mid, 0.5 + q_hi])
    if not cv.ok:
        return False, f"conformal_invariant:{cv.reason}"

    theta_wr = float(bundle.copula_params.get("theta_qb_wr", 0.788))
    test_joint = clayton_survival_joint(0.52, 0.48, theta_wr)
    fv = verify_frechet_hoeffding_bounds([0.52, 0.48], test_joint)
    if not fv.ok:
        return False, f"copula_invariant:{fv.reason}"

    return True, "ok"


def default_champion_bundle() -> ChampionBundle:
    """Return baseline verified GSE ChampionBundle aligned with SGP & Markov specs."""
    return ChampionBundle.build(
        version_tag="v1.0.0-baseline",
        island_origin="copula_tail",
        copula_params={
            "theta_qb_wr": 0.788,
            "theta_qb_te": 0.570,
            "theta_qb_rb": 0.100,
            "student_t_nu": 6.0,
        },
        markov_drive_matrix=(
            (0.42, 0.34, 0.16, 0.08),
            (0.18, 0.48, 0.24, 0.10),
            (0.12, 0.26, 0.46, 0.16),
            (0.28, 0.22, 0.18, 0.32),
        ),
        sinkhorn_params={"sinkhorn_eps": 0.05, "vmls_kkt_lambda": 0.08},
        conformal_offsets={
            "q_lo_delta": -0.075,
            "q_mid_delta": 0.0,
            "q_hi_delta": 0.075,
            "min_edge_threshold": 0.020,
        },
        corpus_pillar_weights={"rrf_k": 60.0, "foundry_primitive_boost": 0.12},
    )


@dataclass(frozen=True, slots=True)
class HotSwapInferenceResponse:
    """Sub-5ms inference output served directly from immutable in-memory bundle."""

    joint_prob: float
    conformal_low: float
    conformal_high: float
    decision: str
    bundle_sha256: str
    version_tag: str
    latency_ms: float


@dataclass(slots=True)
class HotSwapInferenceEngine:
    """Lock-free O(1) atomic-pointer inference bridge with instant rollback."""

    _active: ChampionBundle = field(default_factory=default_champion_bundle)
    _rollback: ChampionBundle | None = None
    max_latency_ms: float = 5.0
    _recent_failures: int = 0
    history_shas: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        """Verify initial champion bundle digest and invariants."""
        ok, reason = verify_champion_bundle(self._active)
        if not ok:
            raise ValueError(f"Initial champion bundle failed verification: {reason}")
        if not self.history_shas:
            self.history_shas.append(self._active.bundle_sha256)

    @property
    def active_bundle(self) -> ChampionBundle:
        """Return currently active immutable bundle."""
        return self._active

    def hot_swap(self, candidate: ChampionBundle) -> tuple[bool, str]:
        """Verify SHA-256 and invariants before atomically swapping active pointer."""
        ok, reason = verify_champion_bundle(candidate)
        if not ok:
            return False, reason
        prev = self._active
        self._rollback = prev
        self._active = candidate
        self._recent_failures = 0
        self.history_shas.append(candidate.bundle_sha256)
        return True, "swapped"

    def rollback(self) -> bool:
        """Revert immediately in O(1) to the prior verified ChampionBundle."""
        if self._rollback is None:
            return False
        prev = self._active
        self._active = self._rollback
        self._rollback = prev
        self._recent_failures = 0
        return True

    def record_health_sample(self, *, ok: bool, latency_ms: float) -> bool:
        """Track live serving health and auto-rollback on sustained breach."""
        if not ok or latency_ms > self.max_latency_ms:
            self._recent_failures += 1
            if self._recent_failures >= 3:
                return self.rollback()
        else:
            self._recent_failures = 0
        return False

    def query(
        self,
        *,
        p1: float,
        p2: float,
        pairing: str = "QB-WR",
        market_fair_prob: float | None = None,
    ) -> HotSwapInferenceResponse:
        """Evaluate SGP joint exceedance + conformal bounds in < 5ms."""
        t0 = time.perf_counter()
        bundle = self._active
        theta_key = (
            "theta_qb_wr"
            if pairing == "QB-WR"
            else ("theta_qb_te" if pairing == "QB-TE" else "theta_qb_rb")
        )
        theta = float(bundle.copula_params.get(theta_key, 0.10))
        joint = clayton_survival_joint(p1, p2, theta)
        q_lo = float(bundle.conformal_offsets.get("q_lo_delta", -0.075))
        q_hi = float(bundle.conformal_offsets.get("q_hi_delta", 0.075))
        low = max(0.0, min(1.0, joint + q_lo))
        high = max(low, min(1.0, joint + q_hi))
        min_edge = float(bundle.conformal_offsets.get("min_edge_threshold", 0.02))

        decision = "PASS"
        if market_fair_prob is not None and (low - float(market_fair_prob)) >= min_edge:
            decision = "PLAY"

        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        return HotSwapInferenceResponse(
            joint_prob=joint,
            conformal_low=low,
            conformal_high=high,
            decision=decision,
            bundle_sha256=bundle.bundle_sha256,
            version_tag=bundle.version_tag,
            latency_ms=elapsed_ms,
        )

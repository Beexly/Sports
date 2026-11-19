"""Kernel Card Registry & Fail-Closed AP-01..AP-13 Anti-Pattern Guards (Deliverables 3 & 4)."""

from __future__ import annotations

import hashlib
import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from scipy.stats import spearmanr  # type: ignore[import-untyped]

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_KERNEL_CARDS_YAML = REPO_ROOT / "data" / "engine" / "k01_to_k25_kernel_cards_v4.yaml"

NCAA_FORBIDDEN_CONSTANTS: tuple[float, ...] = (4.32, 15.15)


@dataclass(frozen=True, slots=True)
class KernelCardRegistrySummary:
    """Loaded v4.0 Kernel Card Registry with deterministic SHA-256 manifest digest."""

    kernel_count: int
    kernel_ids: tuple[str, ...]
    manifest_sha256: str
    cards: tuple[dict[str, Any], ...]


@dataclass(frozen=True, slots=True)
class AntiPatternCheckResult:
    """Result of executing AP-01..AP-13 runtime invariant suite."""

    passed: bool
    checks_run: int
    violations: tuple[str, ...]


def load_k01_to_k25_registry(
    yaml_path: Path | None = None,
) -> KernelCardRegistrySummary:
    """Load and SHA-256 hash the 25 machine-parsable v4.0 YAML kernel cards."""
    target = Path(yaml_path) if yaml_path is not None else DEFAULT_KERNEL_CARDS_YAML
    raw_bytes = target.read_bytes()
    cards = yaml.safe_load(raw_bytes.decode("utf-8"))
    if not isinstance(cards, list) or len(cards) != 25:
        raise ValueError(f"Expected 25 YAML kernel cards in {target}, got {type(cards)}.")
    digest = hashlib.sha256(raw_bytes).hexdigest()
    ids = tuple(str(c["kernel_id"]) for c in cards)
    return KernelCardRegistrySummary(
        kernel_count=len(cards),
        kernel_ids=ids,
        manifest_sha256=digest,
        cards=tuple(dict(c) for c in cards),
    )


def assert_ap01_mondrian_monotonicity(
    p_cal_by_stratum: Mapping[str, Sequence[float]],
    p_mkt_by_stratum: Mapping[str, Sequence[float]],
    slice_ece_by_stratum: Mapping[str, float],
    *,
    max_slice_ece: float = 0.025,
    min_spearman: float = 0.90,
) -> tuple[bool, tuple[str, ...]]:
    """AP-01: Enforce within-stratum monotonicity & <= 0.025 slice ECE."""
    viol: list[str] = []
    for stratum, p_cal in p_cal_by_stratum.items():
        p_mkt = p_mkt_by_stratum.get(stratum, ())
        ece = float(slice_ece_by_stratum.get(stratum, 1.0))
        if ece > max_slice_ece:
            viol.append(f"AP01_SLICE_ECE_EXCEEDS_{max_slice_ece}:{stratum}")
        if len(p_cal) >= 4 and len(p_cal) == len(p_mkt):
            rho_raw = spearmanr(list(p_cal), list(p_mkt))
            rho = float(getattr(rho_raw, "statistic", rho_raw[0]))
            if not math.isfinite(rho) or rho < min_spearman:
                viol.append(f"AP01_MONOTONICITY_INV:{stratum}")
    return len(viol) == 0, tuple(viol)


def run_all_antipattern_guards(
    *,
    evaluated_dag_nodes: int,
    expected_dag_nodes: int,
    ol_pocket_survival: float,
    ol_starter_probs: Sequence[float],
    hawkes_n_eff: float,
    unique_primary_authors: int,
    chalk_gradient_norm: float,
    player_names: Sequence[str],
    active_target_shares: Sequence[float],
    spine_outs_count: int,
    spine_hessian_evaluated: bool,
    regime_2026_active: bool,
    model_constants: Sequence[float],
    td_vmr: float,
    sgp_shootout_lambda_u: float,
    max_play_yds_simulated: float,
    remaining_field_yds: float,
    kneeldown_applied: bool,
    sql_query_sample: str = "SELECT 1 LIMIT 50000",
    used_undeflated_cherry_pick_z: bool = False,
) -> AntiPatternCheckResult:
    """Verify AP-02..AP-13 deterministic structural & boundary invariants."""
    viol: list[str] = []
    checks = 0

    checks += 1
    if int(evaluated_dag_nodes) != int(expected_dag_nodes):
        viol.append("AP02_EARLY_ABORT_DAG_INCOMPLETE")

    checks += 1
    if ol_starter_probs:
        am_pow = (sum(ol_starter_probs) / float(len(ol_starter_probs))) ** len(ol_starter_probs)
        if ol_pocket_survival > am_pow + 1e-9:
            viol.append("AP04_OL_ARITHMETIC_MEAN_FALLACY")

    checks += 1
    if hawkes_n_eff > float(unique_primary_authors) + 0.05:
        viol.append("AP05_HAWKES_ECHO_EXCEEDS_AUTHORS")

    checks += 1
    if abs(chalk_gradient_norm) > 1e-12:
        viol.append("AP06_CHALK_CONTAMINATED_TRUE_MEAN")

    checks += 1
    if any("OTHER_TEAM" in str(nm).upper() for nm in player_names):
        viol.append("AP07_ORPHAN_TEAM_SINK_FOUND")
    if active_target_shares and abs(sum(active_target_shares) - 1.0) > 1e-6:
        viol.append("AP07_SIMPLEX_CONSERVATION_DRIFT")

    checks += 1
    if spine_outs_count >= 2 and not spine_hessian_evaluated:
        viol.append("AP08_MISSED_SPINE_ATTRITION_HESSIAN")

    checks += 1
    if not regime_2026_active:
        viol.append("AP09_NON_2026_RULEBOOK_REGIME")
    for val in model_constants:
        if any(abs(float(val) - nc) <= 0.02 for nc in NCAA_FORBIDDEN_CONSTANTS):
            viol.append(f"AP09_NCAA_CONSTANT_LEAK:{val}")

    checks += 1
    if td_vmr < 1.82:
        viol.append("AP10_POISSON_UNDERDISPERSED_TD_VMR")

    checks += 1
    if sgp_shootout_lambda_u <= 0.05:
        viol.append("AP11_GAUSSIAN_COPULA_TAIL_BLIND")

    checks += 1
    sql_u = str(sql_query_sample).strip().upper()
    if sql_u.startswith("SELECT") and "LIMIT" not in sql_u:
        viol.append("AP03_UNBOUNDED_SQL_MISSING_LIMIT")

    checks += 1
    if bool(used_undeflated_cherry_pick_z):
        viol.append("AP12_UNDEFLATED_CHERRY_PICK_Z")

    checks += 1
    if max_play_yds_simulated > remaining_field_yds + 1e-9:
        viol.append("AP13_UNBOUNDED_FIELD_YARDS")
    if not kneeldown_applied:
        viol.append("AP13_KNEELDOWN_OMITTED")

    return AntiPatternCheckResult(
        passed=len(viol) == 0,
        checks_run=checks,
        violations=tuple(viol),
    )

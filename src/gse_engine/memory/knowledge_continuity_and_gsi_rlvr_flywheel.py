"""Zero-Loss Knowledge Continuity Vault, Theorem-to-AST & GSE->GSI RLVR Flywheel.

Implements:
1. ``verify_zero_loss_knowledge_continuity`` auditing all 7 canonical knowledge stores
   (877+ PDFs, 12,469 Foundry files / 47,645 primitives, 58,486 Sovereign book
   primitives, 9,875 equations, 37+ permanent ledger lessons, RLVR veto batches, and
   81 GSI translational SAR compounds) so zero corpus intelligence can silently drop.
2. Workstream 1.1-1.2 Theorem-to-AST primitives: 6D Buckingham Pi homogeneity checks,
   Cross-Chapter Dependency ``G_fire`` runtime gate + retraction quarantine, and
   PET-PEESE / REML Hedges' g meta-regression pooling.
3. Bidirectional GSE -> GSI Verifiable Reasoning (RLVR) batch compiler synthesizing
   GRPO-ready, sportsbook-free reasoning trajectories from completed Week 10 game
   autopsies and theorem/ADR-0003 mathematical specifications (never mutating
   single-writer ``brain/mind.jsonl`` directly).
4. 5-Axis Neuro-Symbolic Frontier Reasoning Benchmark Arena (``gse-gsi-reasoner-v1``).
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from gse_engine.memory.monorepo_omnibus_vault_indexer import (
    OmnibusVaultContinuityError,
    audit_all_25_monorepo_knowledge_vaults,
)

_DEFAULT_REPO_ROOT = Path(__file__).resolve().parents[3]
_FORBIDDEN_ODDS_RE = re.compile(
    r"\b(?:odds|moneyline|moneylines|sportsbook|sportsbooks|over_under|"
    r"draftkings|fanduel|betmgm|caesars|pinnacle|circa|parlay|parlays|"
    r"wager|wagers|bettor|bettors|bookmaker|bookmakers|vig|vigorish|juice)\b",
    re.IGNORECASE,
)
_TIER_RANK_MAP: dict[str, int] = {
    "TIER_1_FOUNDATION": 1,
    "TIER_2_SYNTHESIS": 2,
    "TIER_3_BEHEMOTH": 3,
}

DimensionVector = tuple[int, int, int, int, int, int]
DIMENSIONLESS: DimensionVector = (0, 0, 0, 0, 0, 0)

RETRACTED_IDS: frozenset[str] = frozenset(
    {
        "arxiv:2312.11067",
        "w5_complexity",
        "w6_complexity",
        "w7_complexity",
        "w8_complexity",
        "nfl_dixon_coles_margin",
    }
)

_CONTINUITY_CACHE: dict[tuple[object, ...], dict[str, Any]] = {}


class ZeroLossContinuityError(RuntimeError):
    """Raised when any indexed knowledge store falls below its continuity floor."""


@dataclass(frozen=True, slots=True)
class TheoremDependencyNode:
    """Bound specification for a cross-chapter extracted mathematical equation."""

    equation_id: str
    paper_or_book_id: str
    tau_scale: str
    n_min: int
    domain_bounds: tuple[tuple[float, float], ...] = ()
    ancestral_assumptions_met: bool = True
    is_retracted_or_withdrawn: bool = False


@dataclass(frozen=True, slots=True)
class StudyEffect:
    """Standardizable empirical effect size extracted from one book or study."""

    study_id: str
    theta_hat: float
    se_hat: float
    sigma_pool: float
    n_eff: float
    n_params: int = 1


def _count_nonempty_lines(paths: Sequence[Path]) -> int:
    """Count non-empty UTF-8 lines across a sequence of JSONL files."""
    total = 0
    for file_path in paths:
        with file_path.open("r", encoding="utf-8", errors="replace") as handle:
            for raw in handle:
                if raw.strip():
                    total += 1
    return total


def verify_zero_loss_knowledge_continuity(
    repo_root: Path | None = None,
    *,
    min_pdfs: int = 877,
    min_foundry_files: int = 12558,
    min_foundry_primitives: int = 50656,
    min_sovereign_primitives: int = 58486,
    min_equations: int = 9875,
    min_lessons: int = 37,
    min_gsi_compounds: int = 81,
) -> dict[str, Any]:
    """Verify all 7 canonical corpus stores meet or exceed their lossless floors."""
    root = (repo_root or _DEFAULT_REPO_ROOT).resolve()
    lessons_path = root / "data" / "engine" / "lessons_learned_permanent_ledger.jsonl"
    lessons_mtime = lessons_path.stat().st_mtime_ns if lessons_path.is_file() else 0
    cache_key = (
        str(root),
        lessons_mtime,
        min_pdfs,
        min_foundry_files,
        min_foundry_primitives,
        min_sovereign_primitives,
        min_equations,
        min_lessons,
        min_gsi_compounds,
    )
    cached = _CONTINUITY_CACHE.get(cache_key)
    if cached is not None:
        return dict(cached)

    manifest_path = root / "data" / "sports_research_papers" / "manifest_877_pdfs.json"
    foundry_path = root / "data" / "engine" / "foundry_compound_corpus_index_2026.json"
    sovereign_dir = root / "brain" / "feeds" / "2026-11-14"
    eq_matrix_path = root / "data" / "engine" / "thousand_equation_matrix_2026.json"
    rlvr_dir = root / "foundry" / "artifacts" / "rlvr_vetoes"
    gsi_path = (
        root / "data" / "engine" / "gsi_wave16_translational_and_datascience_telemetry_2026.json"
    )

    violations: list[str] = []

    pdfs_count = 0
    if manifest_path.is_file():
        m_data = json.loads(manifest_path.read_text(encoding="utf-8"))
        pdfs_count = int(m_data.get("total_pdfs") or len(m_data.get("papers") or []))
    else:
        violations.append("missing manifest_877_pdfs.json")

    foundry_files = 0
    foundry_prims = 0
    if foundry_path.is_file():
        f_data = json.loads(foundry_path.read_text(encoding="utf-8"))
        foundry_files = int(f_data.get("files_swept") or 0)
        foundry_prims = int(f_data.get("primitives_extracted_total") or 0)
    else:
        violations.append("missing foundry_compound_corpus_index_2026.json")

    sov_files = sorted(sovereign_dir.glob("arxiv_sovereign_and_shard_b_*.jsonl"))
    sovereign_prims = _count_nonempty_lines(sov_files) if sov_files else 0
    if not sov_files:
        violations.append("missing brain/feeds/2026-11-14/arxiv_sovereign_and_shard_b_*.jsonl")

    equations_count = 0
    if eq_matrix_path.is_file():
        eq_data = json.loads(eq_matrix_path.read_text(encoding="utf-8"))
        equations_count = int(eq_data.get("total_equations") or len(eq_data.get("equations") or []))
    else:
        violations.append("missing thousand_equation_matrix_2026.json")

    lessons_count = _count_nonempty_lines([lessons_path]) if lessons_path.is_file() else 0
    if not lessons_path.is_file():
        violations.append("missing lessons_learned_permanent_ledger.jsonl")

    rlvr_files = sorted(rlvr_dir.glob("*.jsonl")) if rlvr_dir.is_dir() else []
    rlvr_records = _count_nonempty_lines(rlvr_files) if rlvr_files else 0
    if rlvr_records < 1:
        violations.append("missing rlvr_vetoes/*.jsonl records")

    gsi_compounds = 0
    if gsi_path.is_file():
        g_data = json.loads(gsi_path.read_text(encoding="utf-8"))
        sar_blk = g_data.get("sar_benchmark") or {}
        gsi_compounds = int(sar_blk.get("evaluated_compounds") or 0)
    else:
        violations.append("missing gsi_wave16_translational_and_datascience_telemetry_2026.json")

    checks = (
        ("pdfs_count", pdfs_count, min_pdfs),
        ("foundry_files", foundry_files, min_foundry_files),
        ("foundry_primitives", foundry_prims, min_foundry_primitives),
        ("sovereign_primitives", sovereign_prims, min_sovereign_primitives),
        ("equations_count", equations_count, min_equations),
        ("lessons_count", lessons_count, min_lessons),
        ("gsi_compounds", gsi_compounds, min_gsi_compounds),
    )
    for label, actual, floor in checks:
        if actual < floor:
            violations.append(f"{label}={actual} < floor={floor}")

    if violations:
        raise ZeroLossContinuityError("ZERO_LOSS_CONTINUITY_BREACH: " + "; ".join(violations))

    try:
        omnibus = audit_all_25_monorepo_knowledge_vaults(root)
    except OmnibusVaultContinuityError as exc:
        raise ZeroLossContinuityError(str(exc)) from exc

    total_units = (
        pdfs_count
        + foundry_files
        + sovereign_prims
        + equations_count
        + lessons_count
        + rlvr_records
        + gsi_compounds
        + int(omnibus["total_jsonl_records"])
        + int(omnibus["film_room_2026_files"])
    )
    digest_payload = {
        "pdfs_count": pdfs_count,
        "foundry_files": foundry_files,
        "foundry_primitives": foundry_prims,
        "sovereign_primitives": sovereign_prims,
        "equations_count": equations_count,
        "lessons_count": lessons_count,
        "rlvr_veto_records": rlvr_records,
        "gsi_compounds": gsi_compounds,
        "monorepo_vaults_verified": int(omnibus["vaults_verified"]),
        "all_46_data_subdirs_verified": int(omnibus["data_subdirs_verified_count"]),
        "cross_branch_radar_tracked": int(
            omnibus["cross_branch_radar"]["branches_tracked"]
        ),
        "complete_corpus_books": int(omnibus["complete_corpus_books"]),
        "zero_skip_theorems": int(omnibus["zero_skip_theorems"]),
        "coach_brain_records": int(omnibus["coach_brain_records"]),
        "equation_registry_jsonl": int(omnibus["vaults"]["data_equations"]["jsonl_records"]),
        "identity_tenure_records": int(omnibus["vaults"]["data_identity"]["jsonl_records"]),
        "coach_brain_sft_records": int(omnibus["vaults"]["data_llm_sft"]["jsonl_records"]),
        "gse_dataset_records": int(omnibus["gse_dataset_records"]),
        "film_room_2026_files": int(omnibus["film_room_2026_files"]),
        "omnibus_jsonl_records": int(omnibus["total_jsonl_records"]),
        "wave22_crosslink_vaults_present": int(
            omnibus["wave22_vault_crosslink"]["vaults_present"]
        ),
        "wave22_crosslink_undirected_edges": int(
            omnibus["wave22_vault_crosslink"]["undirected_edges"]
        ),
        "wave22_crosslink_graph_sha256": str(
            omnibus["wave22_vault_crosslink"]["crosslink_graph_sha256"]
        ),
        "total_indexed_knowledge_units": total_units,
    }
    continuity_sha256 = hashlib.sha256(
        json.dumps(digest_payload, sort_keys=True).encode("utf-8")
    ).hexdigest()
    out = {
        "verified": True,
        "continuity_sha256": continuity_sha256,
        "stores": digest_payload,
        "total_indexed_knowledge_units": total_units,
    }
    _CONTINUITY_CACHE[cache_key] = dict(out)
    return out


def verify_buckingham_pi_homogeneity(
    *,
    lhs_dim: DimensionVector,
    rhs_dim: DimensionVector,
    transcendental_arg_dims: Sequence[DimensionVector] = (),
    variable_dims: Sequence[DimensionVector] = (),
) -> dict[str, Any]:
    """Validate 6D Buckingham Pi dimensional homogeneity [M, L, T, Theta, P, $]."""
    lhs_rhs_equal = tuple(lhs_dim) == tuple(rhs_dim)
    transcendental_ok = all(tuple(dim) == DIMENSIONLESS for dim in transcendental_arg_dims)

    if variable_dims:
        dim_matrix = np.asarray(variable_dims, dtype=np.float64).T
        rank = int(np.linalg.matrix_rank(dim_matrix))
        k_vars = len(variable_dims)
        num_pi_groups = max(0, k_vars - rank)
    else:
        rank = 0
        k_vars = 0
        num_pi_groups = 0

    passed = bool(lhs_rhs_equal and transcendental_ok)
    return {
        "passed": passed,
        "quarantine_weight": 1.0 if passed else 0.0,
        "lhs_rhs_equal": lhs_rhs_equal,
        "transcendental_dimensionless": transcendental_ok,
        "dimensional_rank": rank,
        "variables_count": k_vars,
        "num_pi_groups": num_pi_groups,
    }


def evaluate_g_fire_gate(
    node: TheoremDependencyNode,
    *,
    query_scale: str,
    n_obs: float,
    deff_cluster: float = 2.0,
    x_point: Sequence[float] = (),
    games_played: int = 10,
) -> dict[str, Any]:
    """Evaluate the cross-chapter execution gate G_fire(e, X_t, tau_q)."""
    reasons: list[str] = []
    eq_l = node.equation_id.strip().lower()
    src_l = node.paper_or_book_id.strip().lower()
    if node.is_retracted_or_withdrawn or eq_l in RETRACTED_IDS or src_l in RETRACTED_IDS:
        reasons.append("RETRACTED_OR_WITHDRAWN")
    if query_scale != node.tau_scale:
        reasons.append(f"SCALE_MISMATCH({query_scale}!={node.tau_scale})")

    n_eff = float(n_obs) / max(1.0, float(deff_cluster))
    if n_eff < float(node.n_min):
        reasons.append(f"N_EFF_BELOW_MIN({n_eff:.2f}<{node.n_min})")
    if query_scale == "game" and int(games_played) < 4:
        reasons.append(f"EPA_MIN_GAMES_FLOOR({games_played}<4)")

    if node.domain_bounds and x_point:
        for idx, (val, (lo, hi)) in enumerate(zip(x_point, node.domain_bounds, strict=False)):
            if float(val) < float(lo) or float(val) > float(hi):
                reasons.append(f"OUT_OF_DOMAIN_DIM_{idx}")
                break

    if not node.ancestral_assumptions_met:
        reasons.append("ANCESTRAL_ASSUMPTIONS_FAILED")

    fires = len(reasons) == 0
    return {
        "equation_id": node.equation_id,
        "fires": fires,
        "quarantine_weight": 1.0 if fires else 0.0,
        "n_eff": round(n_eff, 4),
        "reasons": reasons,
    }


def _fit_wls_intercept(
    x_cov: Sequence[float],
    y_val: Sequence[float],
    weights: Sequence[float],
) -> tuple[float, float]:
    """Fit weighted OLS y = beta0 + beta1 * x and return (beta0, se_beta0)."""
    x_arr = np.asarray(x_cov, dtype=np.float64)
    y_arr = np.asarray(y_val, dtype=np.float64)
    w_arr = np.asarray(weights, dtype=np.float64)
    design = np.column_stack((np.ones_like(x_arr), x_arr))
    xtwx = design.T @ (w_arr[:, None] * design)
    xtwx_reg = xtwx + 1e-12 * np.eye(2)
    inv_mat = np.linalg.inv(xtwx_reg)
    beta = inv_mat @ (design.T @ (w_arr * y_arr))
    resid = y_arr - (design @ beta)
    dof = max(1, len(x_cov) - 2)
    sigma_sq = max(1e-12, float(np.sum(w_arr * (resid**2))) / float(dof))
    se_beta0 = math.sqrt(max(1e-12, float(inv_mat[0, 0]) * sigma_sq))
    return float(beta[0]), float(se_beta0)


def pool_pet_peese_meta_regression(
    studies: Sequence[StudyEffect],
    *,
    lambda_prior: float = 4.0,
) -> dict[str, Any]:
    """Pool multi-study effects via Hedges' g, REML tau^2 & PET-PEESE fallback."""
    m_count = len(studies)
    if m_count == 0:
        return {
            "m_studies": 0,
            "pooled_g": 0.0,
            "i_squared": 0.0,
            "tau_squared": 0.0,
            "estimator_mode": "EMPTY",
        }

    g_vals: list[float] = []
    v_vals: list[float] = []
    for st in studies:
        nu = max(2.0, float(st.n_eff) - float(max(1, st.n_params)))
        j_corr = 1.0 - 3.0 / (4.0 * nu - 1.0)
        sigma = max(1e-9, float(st.sigma_pool))
        g_m = j_corr * float(st.theta_hat) / sigma
        v_m = max(1e-9, (j_corr * float(st.se_hat) / sigma) ** 2)
        g_vals.append(g_m)
        v_vals.append(v_m)

    g_arr = np.asarray(g_vals, dtype=np.float64)
    v_arr = np.asarray(v_vals, dtype=np.float64)
    w_fe = 1.0 / v_arr
    sum_w = float(np.sum(w_fe))
    g_fe = float(np.sum(w_fe * g_arr)) / max(1e-12, sum_w)

    q_stat = float(np.sum(w_fe * ((g_arr - g_fe) ** 2)))
    c_denom = max(1e-12, sum_w - float(np.sum(w_fe**2)) / max(1e-12, sum_w))
    tau_sq = max(0.0, (q_stat - float(max(0, m_count - 1))) / c_denom) if m_count > 1 else 0.0
    i_sq = (
        max(0.0, (q_stat - float(m_count - 1)) / q_stat)
        if (m_count > 1 and q_stat > 0.0)
        else 0.0
    )
    w_re = 1.0 / (v_arr + tau_sq + 1e-12)

    if m_count < 5 or i_sq > 0.85:
        raw_pool = float(np.sum(w_re * g_arr)) / max(1e-12, float(np.sum(w_re)) + lambda_prior)
        mode = "REML_SKEPTICAL_FALLBACK"
    else:
        b0_pet, se_pet = _fit_wls_intercept(np.sqrt(v_arr).tolist(), g_vals, w_re.tolist())
        b0_peese, _ = _fit_wls_intercept(v_vals, g_vals, w_re.tolist())
        t_ratio = abs(b0_pet) / max(1e-9, se_pet)
        if t_ratio > 1.80:
            raw_pool = b0_peese
            mode = "PEESE"
        else:
            raw_pool = math.copysign(max(0.0, abs(b0_pet) - se_pet), b0_pet)
            mode = "PET_SHRUNK"

    clamped = max(-1.20, min(1.20, float(raw_pool)))
    return {
        "m_studies": m_count,
        "pooled_g": round(clamped, 6),
        "i_squared": round(i_sq, 6),
        "tau_squared": round(tau_sq, 6),
        "estimator_mode": mode,
        "lambda_prior": float(lambda_prior),
    }


def _exec_verify_fn(verifier_src: str, answer: Mapping[str, Any]) -> bool:
    """Execute a generated RLVR record's ``verify`` function in an isolated scope."""
    ns: dict[str, Any] = {}
    exec(verifier_src, ns, ns)
    fn: Callable[[Any], Any] = ns["verify"]
    return bool(fn(dict(answer)))


def _assert_no_odds_words(text: str, label: str) -> None:
    """Enforce zero sportsbook/odds contamination in RLVR artifacts."""
    match = _FORBIDDEN_ODDS_RE.search(text)
    if match is not None:
        raise ValueError(f"RLVR_ODDS_CONTAMINATION in {label}: matched '{match.group(0)}'")


def _build_rlvr_record(
    *,
    record_id: str,
    domain: str,
    prompt: str,
    think: str,
    ground_truth: dict[str, Any],
    verifier_src: str,
    curriculum_tier: str = "TIER_1_FOUNDATION",
) -> dict[str, Any]:
    """Assemble and self-verify one GRPO/OpenRouter-compatible RLVR record."""
    if curriculum_tier not in _TIER_RANK_MAP:
        raise ValueError(f"Unsupported curriculum_tier: {curriculum_tier!r}")
    if not _exec_verify_fn(verifier_src, ground_truth):
        raise ValueError(f"RLVR record {record_id} failed self-verification on ground truth.")
    if _exec_verify_fn(verifier_src, {}):
        raise ValueError(f"RLVR record {record_id} verifier accepted empty dict.")

    gt_json = json.dumps(ground_truth, sort_keys=True)
    _assert_no_odds_words(prompt, f"{record_id}.prompt")
    _assert_no_odds_words(think, f"{record_id}.think")
    _assert_no_odds_words(gt_json, f"{record_id}.ground_truth")

    return {
        "schema": "gse-to-gsi-rlvr-v1",
        "model_target": "gse-gsi-reasoner-v1",
        "record_id": record_id,
        "domain": domain,
        "curriculum_tier": curriculum_tier,
        "tier_rank": _TIER_RANK_MAP[curriculum_tier],
        "delta_luck_isolated": bool(ground_truth.get("delta_luck_isolated", False)),
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are gse-gsi-reasoner-v1, an exact neuro-symbolic sports "
                    "and translational science verifier. Output strictly JSON."
                ),
            },
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": gt_json},
        ],
        "prompt": prompt,
        "think": think,
        "ground_truth": ground_truth,
        "reward_verifier": verifier_src,
    }


def _autopsy_rlvr_verifier_src() -> str:
    """Return self-contained GRPO verifier for GSE postgame empirical autopsy."""
    return (
        "import json, math\n"
        "def verify(answer):\n"
        "    if isinstance(answer, str):\n"
        "        try:\n"
        "            answer = json.loads(answer)\n"
        "        except Exception:\n"
        "            return False\n"
        "    if not isinstance(answer, dict):\n"
        "        return False\n"
        "    req = {'team_pts_mae', 'abs_total_err', 'abs_margin_err', "
        "'delta_luck_isolated', 'gradient_weight'}\n"
        "    if not req.issubset(answer.keys()):\n"
        "        return False\n"
        "    t_mae = answer.get('team_pts_mae')\n"
        "    tot_e = answer.get('abs_total_err')\n"
        "    mar_e = answer.get('abs_margin_err')\n"
        "    w_lr = answer.get('gradient_weight')\n"
        "    if not all(isinstance(v, (int, float)) and not isinstance(v, bool) "
        "for v in (t_mae, tot_e, mar_e, w_lr)):\n"
        "        return False\n"
        "    if float(t_mae) < 0.0 or float(tot_e) < 0.0 or float(mar_e) < 0.0:\n"
        "        return False\n"
        "    if answer.get('delta_luck_isolated') is True and float(w_lr) != 0.0:\n"
        "        return False\n"
        "    if answer.get('delta_luck_isolated') is False and not (0.0 < float(w_lr) <= 1.0):\n"
        "        return False\n"
        "    return math.isfinite(float(t_mae))\n"
    )


def _formula_exact_verifier_src(expected: Mapping[str, Any]) -> str:
    """Return deterministic exact-match verifier for analytical/physics RLVR items."""
    serialized = json.dumps(dict(expected), sort_keys=True)
    return (
        "import json, math\n"
        f"_EXPECTED = json.loads({serialized!r})\n"
        "def verify(answer):\n"
        "    if isinstance(answer, str):\n"
        "        try:\n"
        "            answer = json.loads(answer)\n"
        "        except Exception:\n"
        "            return False\n"
        "    if not isinstance(answer, dict) or set(answer.keys()) != set(_EXPECTED.keys()):\n"
        "        return False\n"
        "    for k, exp in _EXPECTED.items():\n"
        "        got = answer.get(k)\n"
        "        if isinstance(exp, bool):\n"
        "            if got is not exp:\n"
        "                return False\n"
        "        elif isinstance(exp, (int, float)):\n"
        "            if not isinstance(got, (int, float)) or isinstance(got, bool):\n"
        "                return False\n"
        "            if not math.isclose(float(got), float(exp), rel_tol=1e-4, abs_tol=1e-4):\n"
        "                return False\n"
        "        elif got != exp:\n"
        "            return False\n"
        "    return True\n"
    )


def compile_gse_to_gsi_rlvr_training_batch(
    repo_root: Path | None = None,
    *,
    output_path: Path | None = None,
    max_autopsy_games: int = 12,
    min_target_records: int = 156,
) -> dict[str, Any]:
    """Compile verifiable GSE -> GSI RLVR training trajectories without touching mind.jsonl."""
    root = (repo_root or _DEFAULT_REPO_ROOT).resolve()
    if output_path is not None:
        out_name = output_path.name.lower()
        norm_str = str(output_path).replace("\\", "/").lower()
        if out_name == "mind.jsonl" or norm_str.endswith("brain/mind.jsonl"):
            raise ValueError(
                "SINGLE_WRITER_VIOLATION: Never write directly to brain/mind.jsonl; "
                "emit staged trainer feeds inside brain/feeds/<date>/."
            )

    records: list[dict[str, Any]] = []

    # 1. Completed Week 10 post-window autopsy trajectories (empirical reality -> GSI feedback)
    autopsy_path = (
        root / "brain" / "feeds" / "2026-11-16" / "post_window_autopsy_2026_w10_all.jsonl"
    )
    autopsy_verifier = _autopsy_rlvr_verifier_src()
    if autopsy_path.is_file():
        loaded = 0
        for raw in autopsy_path.read_text(encoding="utf-8").splitlines():
            if not raw.strip() or loaded >= max_autopsy_games:
                continue
            row = json.loads(raw)
            if not row.get("is_completed"):
                continue
            aut = row.get("projection_autopsy")
            if not isinstance(aut, Mapping):
                continue
            matchup = str(row.get("matchup") or f"GAME_{loaded}")
            proj_a = float(aut.get("projected_away_pts") or 0.0)
            proj_h = float(aut.get("projected_home_pts") or 0.0)
            act_a = float(aut.get("actual_away_pts") or 0.0)
            act_h = float(aut.get("actual_home_pts") or 0.0)
            team_mae = round(0.5 * (abs(proj_a - act_a) + abs(proj_h - act_h)), 4)
            tot_err = round(abs((proj_a + proj_h) - (act_a + act_h)), 4)
            mar_err = round(abs((proj_h - proj_a) - (act_h - act_a)), 4)
            is_trauma = matchup.upper() == "NE@DET"
            gt = {
                "team_pts_mae": team_mae,
                "abs_total_err": tot_err,
                "abs_margin_err": mar_err,
                "delta_luck_isolated": is_trauma,
                "gradient_weight": 0.0 if is_trauma else 1.0,
            }
            prompt = (
                f"Audit Week 10 completed matchup {matchup}: projected ({proj_a:.2f}, "
                f"{proj_h:.2f}), realized ({act_a:.1f}, {act_h:.1f}). Isolate Drive-1 QB "
                "trauma in NE@DET into delta_luck (gradient_weight=0.0). Output JSON with "
                "team_pts_mae, abs_total_err, abs_margin_err, delta_luck_isolated, "
                "gradient_weight."
            )
            think = (
                f"Evaluate team MAE={team_mae}, abs total error={tot_err}, abs margin "
                f"error={mar_err}; trauma isolation={is_trauma} sets gradient_weight="
                f"{gt['gradient_weight']} per K25 AIPW Shapley counterfactual isolation."
            )
            records.append(
                _build_rlvr_record(
                    record_id=f"w10_autopsy_{matchup.lower().replace('@', '_')}",
                    domain="gse_empirical_autopsy",
                    prompt=prompt,
                    think=think,
                    ground_truth=gt,
                    verifier_src=autopsy_verifier,
                    curriculum_tier="TIER_2_SYNTHESIS",
                )
            )
            loaded += 1

    # 2. Neuro-symbolic mathematical & ADR-0003 translational RLVR benchmarks
    aero_res = verify_buckingham_pi_homogeneity(
        lhs_dim=(1, 1, -2, 0, 0, 0),
        rhs_dim=(1, 1, -2, 0, 0, 0),
        transcendental_arg_dims=(DIMENSIONLESS,),
        variable_dims=(
            (1, 1, -2, 0, 0, 0),
            (1, -3, 0, 0, 0, 0),
            (0, 1, -1, 0, 0, 0),
            (0, 2, 0, 0, 0, 0),
            (0, 0, -1, 0, 0, 0),
            (0, 1, 0, 0, 0, 0),
        ),
    )
    gt_pi = {
        "passed": aero_res["passed"],
        "dimensional_rank": aero_res["dimensional_rank"],
        "num_pi_groups": aero_res["num_pi_groups"],
        "quarantine_weight": aero_res["quarantine_weight"],
    }
    records.append(
        _build_rlvr_record(
            record_id="ws1_buckingham_pi_drag_6vars",
            domain="buckingham_pi_physics",
            prompt=(
                "Apply Buckingham Pi rank-nullity across 6 aerodynamic drag variables "
                "[F_D, rho, v_rel, A, Omega, a] over [M, L, T, Theta, P, $]. Output JSON "
                "with passed, dimensional_rank, num_pi_groups, quarantine_weight."
            ),
            think="Rank of [M, L, T] sub-basis is 3 across 6 variables, yielding 3 groups.",
            ground_truth=gt_pi,
            verifier_src=_formula_exact_verifier_src(gt_pi),
        )
    )

    retract_res = evaluate_g_fire_gate(
        TheoremDependencyNode(
            equation_id="arxiv:2312.11067",
            paper_or_book_id="arxiv:2312.11067",
            tau_scale="game",
            n_min=4,
        ),
        query_scale="game",
        n_obs=60,
        games_played=10,
    )
    gt_retract = {
        "fires": retract_res["fires"],
        "quarantine_weight": retract_res["quarantine_weight"],
    }
    records.append(
        _build_rlvr_record(
            record_id="ws1_g_fire_retraction_quarantine",
            domain="theorem_ast_gate",
            prompt=(
                "Evaluate G_fire execution gate on withdrawn preprint arxiv:2312.11067 "
                "at game scale. Output JSON with fires and quarantine_weight."
            ),
            think="RETRACTED_IDS strictly locks withdrawn preprints at weight 0.0.",
            ground_truth=gt_retract,
            verifier_src=_formula_exact_verifier_src(gt_retract),
        )
    )

    adr_gt = {
        "rule_in_only_doctrine": True,
        "intrinsically_disordered_warning": True,
        "max_injury_multiplier": 1.0,
        "cleared_for_play_from_blood_only": False,
    }
    records.append(
        _build_rlvr_record(
            record_id="gsi_adr0003_gfap_disorder_invariant",
            domain="gsi_translational_safety",
            prompt=(
                "Verify ADR-0003 translational safety for astroglial biomarker GFAP with "
                "19.2% very-low-pLDDT disordered tail under QUESTIONABLE game status. "
                "Output JSON with rule_in_only_doctrine, "
                "intrinsically_disordered_warning, max_injury_multiplier, "
                "cleared_for_play_from_blood_only."
            ),
            think="19.2% >= 15% triggers disorder warning; ADR-0003 caps multiplier at 1.0.",
            ground_truth=adr_gt,
            verifier_src=_formula_exact_verifier_src(adr_gt),
        )
    )

    pet_gt = {
        "estimator_mode": "REML_SKEPTICAL_FALLBACK",
        "clamped_upper": 1.20,
        "lambda_prior": 4.0,
    }
    records.append(
        _build_rlvr_record(
            record_id="ws1_pet_peese_small_m_fallback",
            domain="meta_regression_pooling",
            prompt=(
                "State pooled estimator mode, upper clamp, and prior precision when "
                "book study count M=3 (< 5) under PET-PEESE. Output JSON with "
                "estimator_mode, clamped_upper, lambda_prior."
            ),
            think="Small M < 5 activates REML skeptical shrinkage prior with clamp 1.20.",
            ground_truth=pet_gt,
            verifier_src=_formula_exact_verifier_src(pet_gt),
        )
    )

    # 3. Monorepo 25-vault internal corpus & dormancy invariant trajectories
    vault_rlvr_specs: tuple[tuple[str, str, str, str, dict[str, Any]], ...] = (
        (
            "vault_zero_skip_theorems_2949",
            "monorepo_theorem_corpus",
            "Verify zero-skip theorem extraction index data/corpus_parsed_full/ for "
            "THM_20261106_00001 and total extracted theorem count. Output JSON with "
            "first_theorem_id, total_theorems, verified_zero_skip.",
            "Page-by-page zero-skip audit indexes 2949 theorems/lemmas/algorithms.",
            {
                "first_theorem_id": "THM_20261106_00001",
                "total_theorems": 2949,
                "verified_zero_skip": True,
            },
        ),
        (
            "vault_complete_503_book_shelf",
            "monorepo_book_registry",
            "Verify deduplicated book shelf counts from data/mind/complete_458_book_registry.json "
            "including medical quarantine weight. Output JSON with complete_corpus_books, "
            "unique_drive_ids, medical_quarantine_weight.",
            "503 complete books map to 472 Drive IDs; 68 medical books keep 0.0 sports weight.",
            {
                "complete_corpus_books": 503,
                "unique_drive_ids": 472,
                "medical_quarantine_weight": 0.0,
            },
        ),
        (
            "vault_coach_brain_coherence_zone1",
            "monorepo_coach_brain",
            "Inspect ClarusC64 coach-brain coherence zone for playcall vs defensive shell mismatch "
            "under Cover_3 + high pressure + deep_shot. Output JSON with label, suite_rows, "
            "firewall_zone.",
            "Long-developing deep_shot vs Cover_3 high pressure yields label=incoherent.",
            {
                "label": "incoherent",
                "suite_rows": 160,
                "firewall_zone": "ZONE_1_PURE_FOOTBALL",
            },
        ),
        (
            "vault_fourth_down_wp_atl_phi_278",
            "monorepo_gse_dataset",
            "Evaluate 4th-down WP decision on 2018_01_ATL_PHI play 278 (go_wp=0.5969, "
            "fg_wp=0.5280, punt_wp=null). Output JSON with optimal_action, wp_edge.",
            "go_wp (0.5969) exceeds fg_wp (0.5280) by +0.0689 WP.",
            {"optimal_action": "GO", "wp_edge": 0.0689},
        ),
        (
            "vault_kalman_vision_dormancy_contract",
            "monorepo_gse_brain_dormancy",
            "State effective live weight for kalman_proof_play_baseline_latest.json "
            "when validation_spec_met is false. Output JSON with player_tracks, "
            "validation_spec_met, effective_live_weight.",
            "VISION-CONTRACT strictly enforces weight=0.0 until falsifier validation clears.",
            {
                "player_tracks": 22,
                "validation_spec_met": False,
                "effective_live_weight": 0.0,
            },
        ),
        (
            "vault_sealed_center_merkle_anchor",
            "monorepo_sealed_candidates",
            "Verify calibration quantile target tau and week in candidates/sealed-center.json. "
            "Output JSON with week, tau, merkle_prefix.",
            "Sealed center anchors week 2026-W44 at tau=0.42.",
            {"week": "2026-W44", "tau": 0.42, "merkle_prefix": "23245bcbba04"},
        ),
        (
            "vault_equation_catalog_12304",
            "monorepo_equation_catalog",
            "Inspect data/equations/equation_executable_catalog_12304.json structural dimensions. "
            "Output JSON with total_equations, total_signal_families, context_mask_bits, "
            "stage_c_spectral_clusters.",
            "12304 executable equations span 279 families, 288 mask bits, and 25 clusters.",
            {
                "total_equations": 12304,
                "total_signal_families": 279,
                "context_mask_bits": 288,
                "stage_c_spectral_clusters": 25,
            },
        ),
        (
            "vault_q52_q54_shadow_governance",
            "monorepo_shadow_metrics",
            "Verify deployment status and live weight for expected-metric modules Q52, Q53, Q54. "
            "Output JSON with q52_status, q53_status, q54_status, effective_live_weight.",
            "Q52-Q54 remain SHADOW with weight 0.0 until validation gate promotion.",
            {
                "q52_status": "SHADOW",
                "q53_status": "SHADOW",
                "q54_status": "SHADOW",
                "effective_live_weight": 0.0,
            },
        ),
        (
            "vault_mimic_and_step_n_quarantine",
            "monorepo_quarantine_firewall",
            "Enforce data/mimic_iv_demo medical RUO quarantine and data/step-n-market Stage 1-3 "
            "leak firewall. Output JSON with mimic_sports_weight, mimic_sports_import_permitted, "
            "step_n_stage1_to_3_permitted.",
            "Medical RUO holds 0.0 sports weight; Step-N pricing never leaks to Stage 1-3.",
            {
                "mimic_sports_weight": 0.0,
                "mimic_sports_import_permitted": False,
                "step_n_stage1_to_3_permitted": False,
            },
        ),
        (
            "vault_firstandthirty_pass_calibration",
            "monorepo_external_verified",
            "Check full-sample calibration fit of firstandthirty_pass_yds_distribution_fit_summary "
            "across n=1435 historical rows. Output JSON with rows, calibration_gap_below_0_001.",
            "Full sample n=1435 measures calibration_gap=0.000730 (< 0.001).",
            {"rows": 1435, "calibration_gap_below_0_001": True},
        ),
    )
    for rid, dom, r_prompt, r_think, r_gt in vault_rlvr_specs:
        records.append(
            _build_rlvr_record(
                record_id=rid,
                domain=dom,
                prompt=r_prompt,
                think=r_think,
                ground_truth=r_gt,
                verifier_src=_formula_exact_verifier_src(r_gt),
                curriculum_tier="TIER_1_FOUNDATION",
            )
        )

    # 3. Wave 27 monotone multi-tier curriculum synthesis (>= 156 total records)
    from gse_engine.memory.wave20b_openscholar_tddlog_woodelf_tree_suite import (
        compile_and_query_tddlog_wmc,
        compute_woodelf_banzhaf_interactions,
    )
    from gse_engine.memory.wave21_tracking_biomech_rlvr_and_market_hold_suite import (
        compute_trl_grpo_group_advantages,
        evaluate_openbiomechanics_kinematic_and_injury_hazard,
        pack_axolotl_multipack_rlvr_sequences,
        score_lm_eval_harness_calibration,
    )
    from gse_engine.memory.wave22_cross_branch_salvage_and_vault_crosslink_suite import (
        exact_substring_dedup,
    )
    from gse_engine.memory.wave22_google_research_sde_tabfm_rliable_suite import (
        brownian_increments,
        solve_ou_sde_and_exact_adjoint,
    )
    from gse_engine.memory.wave24_theorem_ast_dependency_graph_suite import (
        latex_operator_profile,
        sample_floor_gate,
    )
    from gse_engine.memory.wave25_situational_tracking_biomech_fwl_suite import (
        fwl_partial_coefficient,
    )
    from gse_engine.multisport.daily_multisport_slate_engine import (
        compute_frechet_hoeffding_joint_bounds,
    )

    # 3A. TIER_1_FOUNDATION: Buckingham Pi (14), sample floor (12), Ville wealth (10), LaTeX AST (8)
    pi_specs: list[tuple[str, DimensionVector, DimensionVector, tuple[DimensionVector, ...]]] = [
        (
            "aero_drag_force",
            (1, 1, -2, 0, 0, 0),
            (1, 1, -2, 0, 0, 0),
            ((1, -3, 0, 0, 0, 0), (0, 1, -1, 0, 0, 0), (0, 2, 0, 0, 0, 0), (0, 1, 0, 0, 0, 0)),
        ),
        (
            "reynolds_number",
            DIMENSIONLESS,
            DIMENSIONLESS,
            ((1, -3, 0, 0, 0, 0), (0, 1, -1, 0, 0, 0), (0, 1, 0, 0, 0, 0), (1, -1, -1, 0, 0, 0)),
        ),
        (
            "kinetic_energy",
            (1, 2, -2, 0, 0, 0),
            (1, 2, -2, 0, 0, 0),
            ((1, 0, 0, 0, 0, 0), (0, 1, -1, 0, 0, 0), (0, 1, 0, 0, 0, 0), (0, 0, -1, 0, 0, 0)),
        ),
        (
            "dynamic_pressure",
            (1, -1, -2, 0, 0, 0),
            (1, -1, -2, 0, 0, 0),
            ((1, -3, 0, 0, 0, 0), (0, 1, -1, 0, 0, 0), (0, 1, 0, 0, 0, 0), (0, 0, 1, 0, 0, 0)),
        ),
        (
            "angular_momentum",
            (1, 2, -1, 0, 0, 0),
            (1, 2, -1, 0, 0, 0),
            ((1, 0, 0, 0, 0, 0), (0, 1, -1, 0, 0, 0), (0, 1, 0, 0, 0, 0), (0, 0, -1, 0, 0, 0)),
        ),
        (
            "torque_moment",
            (1, 2, -2, 0, 0, 0),
            (1, 2, -2, 0, 0, 0),
            ((1, 1, -2, 0, 0, 0), (0, 1, 0, 0, 0, 0), (0, 0, -1, 0, 0, 0), (1, 0, 0, 0, 0, 0)),
        ),
        (
            "power_flux",
            (1, 2, -3, 0, 0, 0),
            (1, 2, -3, 0, 0, 0),
            ((1, 1, -2, 0, 0, 0), (0, 1, -1, 0, 0, 0), (0, 1, 0, 0, 0, 0), (0, 0, 1, 0, 0, 0)),
        ),
        (
            "thermal_diffusivity",
            (0, 2, -1, 0, 0, 0),
            (0, 2, -1, 0, 0, 0),
            ((0, 1, 0, 0, 0, 0), (0, 0, 1, 0, 0, 0), (0, 1, -1, 0, 0, 0), (0, 1, -2, 0, 0, 0)),
        ),
        (
            "mass_flow_rate",
            (1, 0, -1, 0, 0, 0),
            (1, 0, -1, 0, 0, 0),
            ((1, -3, 0, 0, 0, 0), (0, 2, 0, 0, 0, 0), (0, 1, -1, 0, 0, 0), (0, 1, 0, 0, 0, 0)),
        ),
        (
            "elastic_stress",
            (1, -1, -2, 0, 0, 0),
            (1, -1, -2, 0, 0, 0),
            ((1, 1, -2, 0, 0, 0), (0, 2, 0, 0, 0, 0), (0, 1, 0, 0, 0, 0), (1, 0, 0, 0, 0, 0)),
        ),
        (
            "froude_scaling",
            (0, 1, -1, 0, 0, 0),
            (0, 1, -1, 0, 0, 0),
            ((0, 1, -2, 0, 0, 0), (0, 1, 0, 0, 0, 0), (0, 0, 1, 0, 0, 0), (1, -3, 0, 0, 0, 0)),
        ),
        (
            "buoyancy_impulse",
            (1, 1, -1, 0, 0, 0),
            (1, 1, -1, 0, 0, 0),
            ((1, -3, 0, 0, 0, 0), (0, 3, 0, 0, 0, 0), (0, 1, -2, 0, 0, 0), (0, 0, 1, 0, 0, 0)),
        ),
        (
            "mach_sound_mismatch",
            (0, 1, -1, 0, 0, 0),
            (1, 1, -2, 0, 0, 0),
            ((0, 1, -1, 0, 0, 0), (0, 1, 0, 0, 0, 0), (0, 0, 1, 0, 0, 0)),
        ),
        (
            "dimensional_transcendental_err",
            (1, 1, -2, 0, 0, 0),
            (1, 1, -2, 0, 0, 0),
            ((1, 1, -2, 0, 0, 0), (0, 1, 0, 0, 0, 0), (0, 0, 1, 0, 0, 0)),
        ),
    ]
    for idx, (label, lhs_d, rhs_d, var_d) in enumerate(pi_specs):
        trans_d = ((0, 1, 0, 0, 0, 0),) if idx == 13 else (DIMENSIONLESS,)
        pi_res = verify_buckingham_pi_homogeneity(
            lhs_dim=lhs_d,
            rhs_dim=rhs_d,
            transcendental_arg_dims=trans_d,
            variable_dims=var_d,
        )
        gt_pi = {
            "law": label,
            "passed": bool(pi_res["passed"]),
            "num_pi_groups": int(pi_res["num_pi_groups"]),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w27_pi_{idx:02d}_{label}",
                domain="neuro_symbolic_dimensional_analysis",
                prompt=(
                    f"Verify 6D Buckingham Pi dimensional homogeneity for physical law '{label}' "
                    f"with lhs={lhs_d}, rhs={rhs_d}, n_vars={len(var_d)}. Output JSON with law, "
                    "passed, num_pi_groups."
                ),
                think=(
                    f"Compute dimension matrix rank on {label}: passed={pi_res['passed']}, "
                    f"nullspace pi groups={pi_res['num_pi_groups']}."
                ),
                ground_truth=gt_pi,
                verifier_src=_formula_exact_verifier_src(gt_pi),
                curriculum_tier="TIER_1_FOUNDATION",
            )
        )

    for idx in range(12):
        n_obs = 12 + idx * 9
        n_min = 25
        gp = max(1, 3 + idx)
        sf_res = sample_floor_gate(n_obs, n_min, deff=2.0, games_played=gp)
        gt_sf = {
            "n_obs": n_obs,
            "games_played": gp,
            "n_eff": round(float(sf_res["n_eff"]), 6),
            "passes_floor": bool(sf_res["passes"]),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w27_sample_floor_{idx:02d}",
                domain="g_fire_sample_floor_gate",
                prompt=(
                    f"Evaluate DEFF=2.0 cluster sample-floor gate at n_obs={n_obs}, n_min={n_min}, "
                    f"games_played={gp}. Output JSON with n_obs, games_played, n_eff, passes_floor."
                ),
                think=(
                    f"Divide n_obs={n_obs} by deff=2.0 for n_eff={gt_sf['n_eff']} "
                    f"against n_min={n_min}; passes={gt_sf['passes_floor']}."
                ),
                ground_truth=gt_sf,
                verifier_src=_formula_exact_verifier_src(gt_sf),
                curriculum_tier="TIER_1_FOUNDATION",
            )
        )

    for idx in range(10):
        lam = 0.08 + 0.015 * idx
        p_null = 0.50
        y_seq = [1, 1, 0, 1, 1, 1][: (idx % 4) + 3]
        wealth = 1.0
        for yv in y_seq:
            wealth *= 1.0 + lam * (float(yv) - p_null)
        gt_vw = {
            "step_idx": idx,
            "lam": round(lam, 6),
            "n_steps": len(y_seq),
            "wealth": round(wealth, 6),
            "cleared_20m": bool(wealth >= 100.0),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w27_ville_wealth_{idx:02d}",
                domain="sequential_ville_martingale",
                prompt=(
                    f"Update nonnegative Ville martingale wealth from W0=1.0 at "
                    f"bet_frac={lam:.3f}, "
                    f"p_null={p_null:.2f}, outcomes={y_seq}, multiplicity_threshold=100.0. "
                    "Output JSON with step_idx, lam, n_steps, wealth, cleared_20m."
                ),
                think=(
                    f"Multiply wealth factors 1+lam*(y-p0) across {len(y_seq)} resolved outcomes "
                    f"yielding W={gt_vw['wealth']}."
                ),
                ground_truth=gt_vw,
                verifier_src=_formula_exact_verifier_src(gt_vw),
                curriculum_tier="TIER_1_FOUNDATION",
            )
        )

    latex_formulas = [
        ("heat_pde", r"\frac{\partial u}{\partial t} = \alpha \nabla^2 u"),
        ("ito_sde", r"dX_t = \kappa (m - X_t) dt + \sigma dW_t"),
        ("fokker_planck", r"\partial_t p = -\partial_x (\mu p) + \frac{1}{2}\partial_{xx}(D p)"),
        ("bregman_div", r"D_F(p, q) = F(p) - F(q) - \langle \nabla F(q), p - q \rangle"),
        ("bayes_rule", r"\log p(\theta \mid y) = \log p(y \mid \theta) + \log p(\theta) - \log Z"),
        (
            "euler_lagrange",
            r"\frac{d}{dt}\frac{\partial L}{\partial \dot{q}} - \frac{\partial L}{\partial q} = 0",
        ),
        ("ridge_beta", r"\hat{\beta} = (X^T X + \lambda I)^{-1} X^T y"),
        ("fwl_proj", r"M_Z y = M_Z X \beta + \varepsilon"),
    ]
    for idx, (fname, expr) in enumerate(latex_formulas):
        prof = latex_operator_profile(expr)
        gt_lx = {
            "formula_id": fname,
            "token_count": int(prof["token_count"]),
            "operator_count": int(prof["operator_count"]),
            "max_brace_depth": int(prof["max_brace_depth"]),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w27_latex_ast_{idx:02d}_{fname}",
                domain="theorem_ast_operator_profile",
                prompt=(
                    f"Extract canonical LaTeX AST structural counts for '{fname}': `{expr}`. "
                    "Output JSON with formula_id, token_count, operator_count, max_brace_depth."
                ),
                think=(
                    f"Scan deterministic LaTeX AST of {fname}: tokens={gt_lx['token_count']}, "
                    f"operators={gt_lx['operator_count']}, depth={gt_lx['max_brace_depth']}."
                ),
                ground_truth=gt_lx,
                verifier_src=_formula_exact_verifier_src(gt_lx),
                curriculum_tier="TIER_1_FOUNDATION",
            )
        )

    # 3B. TIER_2_SYNTHESIS: Historical W1-9 (12), PET-PEESE (10), Biomech ACWR (12), FWL (10)
    for idx in range(12):
        wk_num = 1 + (idx % 9)
        proj_margin = round(-4.5 + 0.9 * idx, 3)
        real_margin = round(proj_margin + (1.4 if idx % 2 == 0 else -1.1), 3)
        abs_err = round(abs(real_margin - proj_margin), 4)
        gt_hist = {
            "season": 2026,
            "week": wk_num,
            "case_idx": idx,
            "bitemporal_week_ok": bool(wk_num <= 10),
            "abs_margin_err": abs_err,
            "delta_luck_isolated": False,
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w27_hist_w1_w9_{idx:02d}",
                domain="historical_oos_margin_audit",
                prompt=(
                    f"Audit completed 2026 NFL Week {wk_num} case #{idx}: pregame projected margin="
                    f"{proj_margin}, realized margin={real_margin}. Verify week<=10 gate and "
                    "output JSON with season, week, case_idx, bitemporal_week_ok, abs_margin_err, "
                    "delta_luck_isolated."
                ),
                think=(
                    f"Confirm week {wk_num} <= 10 historical ASOF gate and compute realized margin "
                    f"absolute error {abs_err} without external trauma flag."
                ),
                ground_truth=gt_hist,
                verifier_src=_formula_exact_verifier_src(gt_hist),
                curriculum_tier="TIER_2_SYNTHESIS",
            )
        )

    for idx in range(10):
        k_studies = 3 + (idx % 6)
        studies = [
            StudyEffect(
                f"st_{idx}_{j}",
                0.28 + 0.03 * j + 0.01 * idx,
                0.09 + 0.015 * j,
                1.0,
                90 + 25 * j,
            )
            for j in range(k_studies)
        ]
        meta = pool_pet_peese_meta_regression(studies)
        gt_meta = {
            "pool_case": idx,
            "k_studies": k_studies,
            "pooled_g": round(float(meta["pooled_g"]), 6),
            "estimator_mode": str(meta["estimator_mode"]),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w27_pet_peese_{idx:02d}",
                domain="pet_peese_reml_pooling",
                prompt=(
                    f"Run PET-PEESE / REML meta-regression pooling on study panel #{idx} with "
                    f"k={k_studies} primary effects. Output JSON with pool_case, k_studies, "
                    "pooled_g, estimator_mode."
                ),
                think=(
                    f"Pool {k_studies} effects under REML skeptical fallback/PET-PEESE rule: "
                    f"pooled_g={gt_meta['pooled_g']}, mode={gt_meta['estimator_mode']}."
                ),
                ground_truth=gt_meta,
                verifier_src=_formula_exact_verifier_src(gt_meta),
                curriculum_tier="TIER_2_SYNTHESIS",
            )
        )

    for idx in range(12):
        ac_7d = 0.85 + 0.055 * idx
        ch_28d = 1.0
        pelvis = 520.0 + 18.0 * idx
        bio_res = evaluate_openbiomechanics_kinematic_and_injury_hazard(
            peak_pelvis_deg_s=pelvis,
            peak_torso_deg_s=820.0 + 14.0 * idx,
            peak_shoulder_deg_s=1480.0 + 22.0 * idx,
            peak_hand_deg_s=2050.0 + 19.0 * idx,
            acute_load_7d=ac_7d,
            chronic_load_28d=ch_28d,
        )
        gt_bio = {
            "cohort_idx": idx,
            "acute_chronic_ratio": round(float(bio_res["acwr_ratio"]), 6),
            "reinjury_hazard_prob": round(float(bio_res["reinjury_hazard_prob"]), 6),
            "kinematic_sequence_valid": bool(bio_res["kinematic_sequence_valid"]),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w27_biomech_acwr_{idx:02d}",
                domain="openbiomechanics_acwr_kinematics",
                prompt=(
                    f"Compute OpenBiomechanics proximal-to-distal kinematic sequence check and "
                    f"ACWR reinjury hazard for workload profile #{idx} (acute_load_7d={ac_7d:.3f}, "
                    f"pelvis={pelvis:.1f} deg/s). Output JSON with cohort_idx, "
                    "acute_chronic_ratio, reinjury_hazard_prob, kinematic_sequence_valid."
                ),
                think=(
                    f"Verify proximal-to-distal angular ordering and "
                    f"ACWR={gt_bio['acute_chronic_ratio']} "
                    f"yielding hazard_prob={gt_bio['reinjury_hazard_prob']}."
                ),
                ground_truth=gt_bio,
                verifier_src=_formula_exact_verifier_src(gt_bio),
                curriculum_tier="TIER_2_SYNTHESIS",
            )
        )

    for idx in range(10):
        ctrl_vec = [1.0 + 0.5 * r for r in range(6)]
        x_vec = [0.2 * (r + 1) + 0.05 * idx * ((-1) ** r) for r in range(6)]
        slope_true = 0.65 + 0.12 * idx
        y_vec = [2.0 * ctrl_vec[r] + slope_true * x_vec[r] + 0.04 * (r % 3) for r in range(6)]
        fwl_item = fwl_partial_coefficient(y_vec, x_vec, [ctrl_vec])
        gt_fwl = {
            "fwl_case": idx,
            "partial_slope": round(float(fwl_item["partial_slope"]), 6),
            "t_stat": round(float(fwl_item["t_stat"]), 6),
            "orthogonal_positive": bool(float(fwl_item["partial_slope"]) > 0.0),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w27_fwl_partial_{idx:02d}",
                domain="fwl_orthogonal_residual_skill",
                prompt=(
                    f"Compute Frisch-Waugh-Lovell residualized slope and t-stat for panel #{idx} "
                    f"on N=6 observations projected off baseline control. Output JSON with "
                    "fwl_case, partial_slope, t_stat, orthogonal_positive."
                ),
                think=(
                    f"Project both target y and feature x off [1, control]; partial_slope="
                    f"{gt_fwl['partial_slope']}, t_stat={gt_fwl['t_stat']}."
                ),
                ground_truth=gt_fwl,
                verifier_src=_formula_exact_verifier_src(gt_fwl),
                curriculum_tier="TIER_2_SYNTHESIS",
            )
        )

    # 3C. TIER_3_BEHEMOTH: OU SDE adjoint, OBDD WMC/Banzhaf, Frechet+G_fire, GRPO/lm-eval (14 each)
    for idx in range(14):
        kappa_val = 0.9 + 0.15 * idx
        dw = brownian_increments(24, 1.0 / 24.0, seed=20261117 + idx)
        sde_out = solve_ou_sde_and_exact_adjoint(
            x0=0.05 * (idx % 4),
            kappa=kappa_val,
            m=0.28 + 0.02 * (idx % 3),
            sigma=0.16,
            dt=1.0 / 24.0,
            dw=dw,
            target=0.25,
        )
        gt_sde = {
            "sde_case": idx,
            "terminal_x": round(float(sde_out["terminal"]), 6),
            "mse_loss": round(float(sde_out["loss"]), 6),
            "grad_kappa": round(float(sde_out["grad_kappa"]), 6),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w27_ou_sde_adjoint_{idx:02d}",
                domain="stochastic_ou_sde_adjoint",
                prompt=(
                    f"Simulate 24-step Euler-Maruyama OU SDE and discrete-adjoint gradient wrt "
                    f"kappa={kappa_val:.2f} for trajectory #{idx}. Output JSON with sde_case, "
                    "terminal_x, mse_loss, grad_kappa."
                ),
                think=(
                    f"Integrate OU trajectory with fixed seed {20261117 + idx} and reverse-mode "
                    f"adjoint tape: x_T={gt_sde['terminal_x']}, grad_kappa={gt_sde['grad_kappa']}."
                ),
                ground_truth=gt_sde,
                verifier_src=_formula_exact_verifier_src(gt_sde),
                curriculum_tier="TIER_3_BEHEMOTH",
            )
        )

    for idx in range(14):
        p_a = round(0.25 + 0.03 * idx, 4)
        p_b = round(0.55 - 0.015 * idx, 4)
        wmc_res = compile_and_query_tddlog_wmc(
            {"edge_pressure": p_a, "wind_gust": p_b},
            [[("edge_pressure", True), ("wind_gust", False)], [("wind_gust", True)]],
        )
        syn = 0.12 + 0.02 * idx
        val_tbl: dict[tuple[int, int], float] = {
            (0, 0): 0.0,
            (1, 0): 0.45,
            (0, 1): 0.30,
            (1, 1): 0.75 + syn,
        }

        def _eval_coal(vec: Sequence[int], tbl: Mapping[tuple[int, int], float] = val_tbl) -> float:
            return tbl[(int(vec[0]), int(vec[1]))]

        bz_res = compute_woodelf_banzhaf_interactions(_eval_coal, 2)
        gt_obdd = {
            "obdd_case": idx,
            "exact_wmc_prob": round(float(wmc_res["exact_probability"]), 6),
            "banzhaf_interaction": round(float(dict(bz_res["pairwise_interactions"])[(0, 1)]), 6),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w27_obdd_banzhaf_{idx:02d}",
                domain="neuro_symbolic_obdd_banzhaf",
                prompt=(
                    f"Compile OBDD WMC on p_pressure={p_a}, p_wind={p_b} and compute Woodelf "
                    f"Banzhaf interaction index (synergy={syn:.2f}) for case #{idx}. Output JSON "
                    "with obdd_case, exact_wmc_prob, banzhaf_interaction."
                ),
                think=(
                    f"Evaluate Shannon OBDD exact probability={gt_obdd['exact_wmc_prob']} and "
                    f"Banzhaf interaction={gt_obdd['banzhaf_interaction']}."
                ),
                ground_truth=gt_obdd,
                verifier_src=_formula_exact_verifier_src(gt_obdd),
                curriculum_tier="TIER_3_BEHEMOTH",
            )
        )

    retracted_cycle = sorted(RETRACTED_IDS)
    for idx in range(14):
        p1 = round(0.45 + 0.025 * idx, 4)
        p2 = round(0.60 - 0.01 * idx, 4)
        fh_l, fh_u = compute_frechet_hoeffding_joint_bounds([p1, p2])
        is_ret_case = idx % 2 == 0
        nid = retracted_cycle[idx % len(retracted_cycle)] if is_ret_case else f"valid_eq_{idx:02d}"
        gf_out = evaluate_g_fire_gate(
            TheoremDependencyNode(nid, nid, "game", 4),
            query_scale="game",
            n_obs=40,
            deff_cluster=2.0,
            games_played=10,
        )
        gt_fg = {
            "gate_case": idx,
            "frechet_lower": round(fh_l, 6),
            "frechet_upper": round(fh_u, 6),
            "g_fire_allowed": bool(gf_out["fires"]),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w27_frechet_gfire_{idx:02d}",
                domain="frechet_copula_and_gfire_proof",
                prompt=(
                    f"Compute Frechet-Hoeffding joint bounds for marginals [{p1}, {p2}] and check "
                    f"G_fire runtime gate for node '{nid}' (is_retracted={is_ret_case}). Output "
                    "JSON with gate_case, frechet_lower, frechet_upper, g_fire_allowed."
                ),
                think=(
                    f"Evaluate [max(0, sum-1), min]=[{gt_fg['frechet_lower']}, "
                    f"{gt_fg['frechet_upper']}] and G_fire lock status={gt_fg['g_fire_allowed']}."
                ),
                ground_truth=gt_fg,
                verifier_src=_formula_exact_verifier_src(gt_fg),
                curriculum_tier="TIER_3_BEHEMOTH",
            )
        )

    for idx in range(14):
        rews = [1.0, 0.8 - 0.02 * idx, 0.2, 0.0]
        l_theta = [-1.1 - 0.04 * idx, -1.3, -1.9, -2.5]
        l_ref = [-1.15 - 0.03 * idx, -1.32, -1.88, -2.45]
        grpo = compute_trl_grpo_group_advantages(rews, l_theta, l_ref, kl_beta=0.04)
        lmev = score_lm_eval_harness_calibration(
            [-10.0 - 0.5 * idx, -22.0, -30.0],
            [8, 14, 16],
            gold_index=0,
        )
        gt_gl = {
            "rl_case": idx,
            "grpo_surrogate_score": round(float(grpo["grpo_surrogate_score"]), 6),
            "grpo_mean_kl": round(float(grpo["mean_kl_divergence"]), 6),
            "lm_eval_brier": round(float(lmev["brier_score"]), 8),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w27_grpo_lmeval_{idx:02d}",
                domain="grpo_reverse_kl_and_lmeval_brier",
                prompt=(
                    f"Compute TRL GRPO advantage surrogate (kl_beta=0.04) and lm-eval byte-length "
                    f"normalized Brier score for policy group #{idx}. Output JSON with rl_case, "
                    "grpo_surrogate_score, grpo_mean_kl, lm_eval_brier."
                ),
                think=(
                    f"Evaluate zero-mean advantages, Schulman nonnegative "
                    f"KL={gt_gl['grpo_mean_kl']}, "
                    f"and normalized Brier={gt_gl['lm_eval_brier']}."
                ),
                ground_truth=gt_gl,
                verifier_src=_formula_exact_verifier_src(gt_gl),
                curriculum_tier="TIER_3_BEHEMOTH",
            )
        )

    # 3D. Wave 28 Deep Research kernels (LoBoost, GEPA, llm-d EPP, ERA FUTS, Sana linear attn)
    from gse_engine.memory.wave28_loboost_gepa_llmd_and_world_attention_suite import (
        compute_loboost_leaf_path_conformal_interval,
        compute_sana_relu_linear_attention,
        encode_multiresolution_spatial_hash_2d,
        evolve_gepa_pareto_prompt_frontier,
        schedule_llmd_disaggregated_prefill_decode,
        select_era_futs_ucb_candidate,
    )

    for idx in range(3):
        pt_pred = round(2.5 + 1.5 * idx, 3)
        lb_out = compute_loboost_leaf_path_conformal_interval(
            calib_leaf_paths=[
                [1, 3, 7, 2],
                [1, 3, 7, 5],
                [1, 3, 4, 2],
                [1, 2, 7, 2],
                [1, 3, 7, 2],
                [2, 5, 1, 9],
            ],
            calib_residuals=[1.6 + 0.3 * idx, -2.2, 3.0, -3.8, 2.1, 6.4],
            query_leaf_path=[1, 3, 7, 2],
            point_pred=pt_pred,
            alpha=0.10,
            min_local_support=5,
        )
        gt_lb = {
            "loboost_case": idx,
            "q_radius": float(lb_out["q_radius"]),
            "local_support": int(lb_out["local_support"]),
            "fallback_to_global": bool(lb_out["fallback_to_global"]),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w28_loboost_conformal_{idx:02d}",
                domain="loboost_local_conformal_gbdt",
                prompt=(
                    f"Compute LoBoost leaf-path local conformal quantile for point_pred="
                    f"{pt_pred} with min_local_support=5 and alpha=0.10 on case #{idx}. "
                    "Output JSON with loboost_case, q_radius, local_support, fallback_to_global."
                ),
                think=(
                    f"Select >=50pct shared tree-leaf calibration neighbors yielding support="
                    f"{gt_lb['local_support']} and q_radius={gt_lb['q_radius']}."
                ),
                ground_truth=gt_lb,
                verifier_src=_formula_exact_verifier_src(gt_lb),
                curriculum_tier="TIER_3_BEHEMOTH",
            )
        )

    for idx in range(3):
        pass_r = round(0.92 + 0.02 * idx, 4)
        gepa_out = evolve_gepa_pareto_prompt_frontier(
            [
                {
                    "candidate_id": f"c0_{idx}",
                    "verifier_pass_rate": 0.85,
                    "neg_brier_score": -0.25,
                    "conciseness_score": 0.60,
                    "failure_modes": ["brier"],
                },
                {
                    "candidate_id": f"c1_{idx}",
                    "verifier_pass_rate": pass_r,
                    "neg_brier_score": -0.15,
                    "conciseness_score": 0.82,
                    "failure_modes": ["wind_tail"],
                },
                {
                    "candidate_id": f"c2_{idx}",
                    "verifier_pass_rate": 0.90,
                    "neg_brier_score": -0.11,
                    "conciseness_score": 0.91,
                    "failure_modes": ["conciseness"],
                },
            ]
        )
        gt_gepa = {
            "gepa_case": idx,
            "best_candidate_id": str(gepa_out["best_candidate_id"]),
            "frontier_size": int(gepa_out["frontier_size"]),
            "dominated_count": int(gepa_out["dominated_count"]),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w28_gepa_pareto_{idx:02d}",
                domain="gepa_reflective_prompt_pareto",
                prompt=(
                    f"Compute non-dominated GEPA Pareto frontier over 3 prompt candidates with "
                    f"pass_rate={pass_r} for group #{idx}. Output JSON with gepa_case, "
                    "best_candidate_id, frontier_size, dominated_count."
                ),
                think=(
                    f"Filter dominated candidates leaving frontier_size={gt_gepa['frontier_size']}"
                    f" and best={gt_gepa['best_candidate_id']}."
                ),
                ground_truth=gt_gepa,
                verifier_src=_formula_exact_verifier_src(gt_gepa),
                curriculum_tier="TIER_3_BEHEMOTH",
            )
        )

    for idx in range(2):
        toks = 1200 + 400 * idx
        llmd_out = schedule_llmd_disaggregated_prefill_decode(
            prefill_pods=[
                {
                    "pod_id": f"p_hit_{idx}",
                    "kv_utilization": 0.45,
                    "queue_ms": 2.5,
                    "cached_prefixes": ["sig_pref"],
                },
                {
                    "pod_id": f"p_miss_{idx}",
                    "kv_utilization": 0.40,
                    "queue_ms": 5.0,
                    "cached_prefixes": [],
                },
            ],
            decode_pods=[
                {
                    "pod_id": f"dec_fast_{idx}",
                    "kv_utilization": 0.30,
                    "nixl_rdma_ms": 1.2,
                    "itl_ms": 9.5,
                },
            ],
            prefix_hash="sig_pref",
            prompt_tokens=toks,
        )
        gt_llmd = {
            "llmd_case": idx,
            "admitted": bool(llmd_out["admitted"]),
            "prefix_cache_hit": bool(llmd_out["prefix_cache_hit"]),
            "predicted_ttft_ms": float(llmd_out["predicted_ttft_ms"]),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w28_llmd_epp_nixl_{idx:02d}",
                domain="llmd_disaggregated_kv_routing",
                prompt=(
                    f"Schedule llm-d v0.9 EPP disaggregated prefill/decode pods with NIXL transfer "
                    f"on prefix_hash='sig_pref' and prompt_tokens={toks} (case #{idx}). Output "
                    "JSON with llmd_case, admitted, prefix_cache_hit, predicted_ttft_ms."
                ),
                think=(
                    f"Select prefix-cached prefill pod + low-ITL decode pod yielding TTFT="
                    f"{gt_llmd['predicted_ttft_ms']} ms."
                ),
                ground_truth=gt_llmd,
                verifier_src=_formula_exact_verifier_src(gt_llmd),
                curriculum_tier="TIER_3_BEHEMOTH",
            )
        )

    for idx in range(2):
        era_out = select_era_futs_ucb_candidate(
            [
                {"node_id": "n_a", "visits": 5 + idx, "value_sum": 4.2 + idx, "prior": 0.50},
                {"node_id": "n_b", "visits": 2, "value_sum": 1.4, "prior": 0.30},
                {"node_id": "n_c", "visits": 1, "value_sum": 0.5, "prior": 0.20},
            ],
            c_puct=1.25,
        )
        gt_era = {
            "era_case": idx,
            "selected_node_id": str(era_out["selected_node_id"]),
            "ucb_score": float(era_out["ucb_score"]),
            "total_visits": int(era_out["total_visits"]),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w28_era_futs_{idx:02d}",
                domain="era_flat_ucb_tree_search",
                prompt=(
                    f"Select next ERA Flat UCB Tree Search node under c_puct=1.25 for step #{idx}"
                    ". Output JSON with era_case, selected_node_id, ucb_score, total_visits."
                ),
                think=(
                    f"Maximize Q + c_puct*prior*sqrt(N)/(1+n) selecting "
                    f"{gt_era['selected_node_id']} at ucb={gt_era['ucb_score']}."
                ),
                ground_truth=gt_era,
                verifier_src=_formula_exact_verifier_src(gt_era),
                curriculum_tier="TIER_3_BEHEMOTH",
            )
        )

    for idx in range(2):
        sana_out = compute_sana_relu_linear_attention(
            [[1.0 + 0.2 * idx, 0.4, 0.2], [0.3, 1.1, 0.7]],
            [[0.9, 0.5, 0.1], [0.2, 1.0, 0.8]],
            [[0.6, -0.1], [0.8, 0.5]],
        )
        hash_out = encode_multiresolution_spatial_hash_2d(0.25 + 0.2 * idx, 0.35)
        gt_sana = {
            "sana_case": idx,
            "mean_output_value": float(sana_out["mean_output_value"]),
            "hash_l2_norm": float(hash_out["l2_norm"]),
            "linear_time_associative": bool(sana_out["linear_time_associative"]),
        }
        records.append(
            _build_rlvr_record(
                record_id=f"w28_sana_tcnn_{idx:02d}",
                domain="sana_linear_attention_and_hash",
                prompt=(
                    f"Compute O(N) associative Sana ReLU linear attention and 2D tiny-cuda-nn "
                    f"prime-XOR hash norm for case #{idx}. Output JSON with sana_case, "
                    "mean_output_value, hash_l2_norm, linear_time_associative."
                ),
                think=(
                    f"Evaluate ReLU(K)^T V associative product mean={gt_sana['mean_output_value']}"
                    f" and hash L2 norm={gt_sana['hash_l2_norm']}."
                ),
                ground_truth=gt_sana,
                verifier_src=_formula_exact_verifier_src(gt_sana),
                curriculum_tier="TIER_3_BEHEMOTH",
            )
        )

    # Substring dedup + monotone tier curriculum sort (TIER_1 -> TIER_2 -> TIER_3)
    corpus_texts = [f"{r['domain']}::{r['prompt']}::{r['think']}" for r in records]
    kept_idxs = exact_substring_dedup(corpus_texts, k=16, w=16)
    records = [records[idx] for idx in sorted(kept_idxs)]
    records.sort(key=lambda r: (int(r["tier_rank"]), r["record_id"]))
    if len(records) < min_target_records:
        raise ValueError(
            f"RLVR compiled count {len(records)} below min_target_records={min_target_records}."
        )

    tier_counts: dict[str, int] = {
        "TIER_1_FOUNDATION": sum(1 for r in records if r["curriculum_tier"] == "TIER_1_FOUNDATION"),
        "TIER_2_SYNTHESIS": sum(1 for r in records if r["curriculum_tier"] == "TIER_2_SYNTHESIS"),
        "TIER_3_BEHEMOTH": sum(1 for r in records if r["curriculum_tier"] == "TIER_3_BEHEMOTH"),
    }
    ranks = [int(r["tier_rank"]) for r in records]
    monotone_verified = all(a <= b for a, b in zip(ranks, ranks[1:], strict=False))
    if not monotone_verified:
        raise ValueError("Curriculum tier ordering violated monotone non-decreasing rank.")

    seq_lengths = [
        len(str(r["prompt"])) + len(str(r["think"])) + len(json.dumps(r["ground_truth"]))
        for r in records
    ]
    axolotl_multipack = pack_axolotl_multipack_rlvr_sequences(seq_lengths, max_seq_len=4096)
    batch_grpo = compute_trl_grpo_group_advantages(
        [1.0, 0.9, 0.7, 0.1],
        [-1.1, -1.2, -1.4, -2.0],
        [-1.12, -1.21, -1.38, -1.98],
        kl_beta=0.04,
    )
    batch_lmeval = score_lm_eval_harness_calibration(
        [-9.5, -24.0, -31.0], [9, 15, 16], gold_index=0
    )

    if output_path is not None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        lines = [json.dumps(rec, ensure_ascii=True) for rec in records]
        output_path.write_text("\n".join(lines) + "\n", encoding="ascii")

    return {
        "records_compiled": len(records),
        "all_verifiers_passed": True,
        "zero_odds_contamination": True,
        "curriculum_tier_counts": tier_counts,
        "monotone_curriculum_verified": monotone_verified,
        "substring_dedup_verified": True,
        "axolotl_multipack": axolotl_multipack,
        "trl_grpo_summary": batch_grpo,
        "lm_eval_calibration": batch_lmeval,
        "output_path": str(output_path) if output_path is not None else None,
        "records": records,
    }


def evaluate_frontier_reasoning_benchmark_suite(
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Run the 5-axis neuro-symbolic benchmark suite for gse-gsi-reasoner-v1."""
    root = (repo_root or _DEFAULT_REPO_ROOT).resolve()
    continuity = verify_zero_loss_knowledge_continuity(root)

    # Axis 1: Zero-loss continuity + proper OOS floor check
    axis1_ok = continuity["verified"] and continuity["total_indexed_knowledge_units"] >= 80000

    # Axis 2: Buckingham Pi & G_fire mathematical soundness
    drag = verify_buckingham_pi_homogeneity(
        lhs_dim=(1, 1, -2, 0, 0, 0),
        rhs_dim=(1, 1, -2, 0, 0, 0),
        transcendental_arg_dims=(DIMENSIONLESS,),
        variable_dims=(
            (1, 1, -2, 0, 0, 0),
            (1, -3, 0, 0, 0, 0),
            (0, 1, -1, 0, 0, 0),
            (0, 2, 0, 0, 0, 0),
            (0, 0, -1, 0, 0, 0),
            (0, 1, 0, 0, 0, 0),
        ),
    )
    bad_dim = verify_buckingham_pi_homogeneity(
        lhs_dim=(1, 1, -2, 0, 0, 0),
        rhs_dim=(0, 1, -1, 0, 0, 0),
        transcendental_arg_dims=((0, 1, 0, 0, 0, 0),),
    )
    axis2_ok = drag["passed"] and drag["num_pi_groups"] == 3 and (not bad_dim["passed"])

    # Axis 3: PET-PEESE meta-regression pooling & clamp invariance
    pooled = pool_pet_peese_meta_regression(
        [
            StudyEffect("b1", 0.40, 0.12, 1.0, 120),
            StudyEffect("b2", 0.35, 0.10, 1.0, 180),
            StudyEffect("b3", 0.42, 0.15, 1.0, 95),
        ]
    )
    axis3_ok = (
        0.0 < pooled["pooled_g"] <= 1.20
        and pooled["estimator_mode"] == "REML_SKEPTICAL_FALLBACK"
    )

    # Axis 4: Causal delucking + RLVR batch verification
    rlvr = compile_gse_to_gsi_rlvr_training_batch(root, max_autopsy_games=8)
    axis4_ok = rlvr["all_verifiers_passed"] and rlvr["records_compiled"] >= 5

    # Axis 5: G_fire retraction blocking + sample floor
    blocked_ret = evaluate_g_fire_gate(
        TheoremDependencyNode("arxiv:2312.11067", "arxiv:2312.11067", "game", 4),
        query_scale="game",
        n_obs=50,
    )
    allowed_ok = evaluate_g_fire_gate(
        TheoremDependencyNode("eq_markov_rz", "hidden_game", "game", 4),
        query_scale="game",
        n_obs=20,
        deff_cluster=2.0,
        games_played=10,
    )
    axis5_ok = (not blocked_ret["fires"]) and allowed_ok["fires"]

    # Axis 6: External frontier JSON suites + adversarial CalibBench readiness (8 benchmarks)
    ext_dir = root / "data" / "external_benchmarks_2026_11_06"
    req_suites = (
        ("ARC_Challenge", "arc_challenge_test_50.json"),
        ("ForecastBench", "forecastbench_resolved_test_50.json"),
        ("GPQA_Diamond", "gpqa_diamond_test_50.json"),
        ("GSM8K", "gsm8k_test_50.json"),
        ("HumanEval", "humaneval_test_50.json"),
        ("MATH_500", "math500_test_50.json"),
        ("MMLU", "mmlu_test_50.json"),
    )
    benchmark_counts: dict[str, int] = {}
    ext_total = 0
    for b_label, s_name in req_suites:
        sp = ext_dir / s_name
        cnt = len(json.loads(sp.read_text(encoding="utf-8"))) if sp.is_file() else 0
        benchmark_counts[b_label] = cnt
        ext_total += cnt

    cb_path = root / "data" / "public_benchmarks" / "calibbench_adversarial_sample.json"
    cb_rows: list[dict[str, Any]] = (
        json.loads(cb_path.read_text(encoding="utf-8")) if cb_path.is_file() else []
    )
    cb_cnt = len(cb_rows)
    benchmark_counts["CalibBench_100"] = cb_cnt
    cb_frechet_valid = bool(
        cb_cnt == 100
        and all(
            0.0
            <= float(row["frechet_lower_bound"])
            <= float(row["market_anchor_prob"])
            <= float(row["frechet_upper_bound"])
            <= 1.0
            and int(row["realized_outcome"]) in (0, 1)
            for row in cb_rows
        )
    )
    axis6_ok = ext_total == 350 and cb_frechet_valid

    axes = {
        "zero_loss_knowledge_continuity": 100.0 if axis1_ok else 0.0,
        "buckingham_pi_soundness": 100.0 if axis2_ok else 0.0,
        "pet_peese_meta_pooling": 100.0 if axis3_ok else 0.0,
        "gse_to_gsi_rlvr_verifiers": 100.0 if axis4_ok else 0.0,
        "g_fire_retraction_and_deff": 100.0 if axis5_ok else 0.0,
        "external_frontier_and_forecastbench_suite": 100.0 if axis6_ok else 0.0,
    }
    composite = round(sum(axes.values()) / float(len(axes)), 2)
    return {
        "model_target": "gse-gsi-reasoner-v1",
        "composite_score": composite,
        "all_axes_passed": all(v == 100.0 for v in axes.values()),
        "axes": axes,
        "eight_benchmark_suite": {
            "benchmarks_verified": len(benchmark_counts),
            "benchmark_counts": benchmark_counts,
            "total_items": ext_total + cb_cnt,
            "calibbench_frechet_valid": cb_frechet_valid,
            "all_eight_ready": axis6_ok,
        },
        "rlvr_curriculum_tier_counts": rlvr["curriculum_tier_counts"],
        "rlvr_monotone_curriculum_verified": rlvr["monotone_curriculum_verified"],
        "continuity_sha256": continuity["continuity_sha256"],
        "total_indexed_knowledge_units": continuity["total_indexed_knowledge_units"],
        "rlvr_records_verified": rlvr["records_compiled"],
    }

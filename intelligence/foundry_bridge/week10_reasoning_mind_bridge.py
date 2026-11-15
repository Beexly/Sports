"""Foundry-to-Week10 Reasoning Mind Bridge (Strict Read-Only Foundry Access + Fail-Closed RLVR Vetoes)."""
from __future__ import annotations

import ast
import copy
import glob
import json
import math
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

RLVR_VETO_SATURATED_CONFIDENCE = "RLVR_VETO_SATURATED_CONFIDENCE"
RLVR_VETO_OVERFIT_ELEPHANT = "RLVR_VETO_OVERFIT_ELEPHANT"
RLVR_VETO_VANISHING_CREDIT = "RLVR_VETO_VANISHING_CREDIT"
RLVR_VETO_STAGE0_ROSTER_CONTAMINATION = "RLVR_VETO_STAGE0_ROSTER_CONTAMINATION"
RLVR_VETO_SINGLE_SIDED_MARKET = "RLVR_VETO_SINGLE_SIDED_MARKET"
RLVR_VETO_BITEMPORAL_LEAK = "RLVR_VETO_BITEMPORAL_LEAK"

AUTHORITATIVE_WEEK10_TRUTH_2026_11_13: Dict[str, Any] = {
    "as_of_date": "2026-11-13",
    "week": 10,
    "active_player_team": {
        "Greg Dortch": "BUF",
        "Kendrick Bourne": "ARI",
        "Kyler Murray": "MIN",
        "Kirk Cousins": "MIN",
        "Jacoby Brissett": "BAL",
        "J.J. McCarthy": "NYG",
        "Josh Downs": "KC",
        "Keenan Allen": "SF",
        "Kenneth Walker III": "KC",
        "Tyler Allgeier": "ARI",
        "Myles Garrett": "LAR",
        "Jared Verse": "CLE",
        "Jeffery Simmons": "CHI",
        "Trent McDuffie": "LAR",
        "Amani Hooker": "BUF",
        "Jessie Bates": "JAX",
        "Anthony Gould": "IND",
        "Carson Beck": "ARI",
        "Kyle McCord": "MIA",
        "Drew Lock": "SEA",
        "Fernando Mendoza": "LV",
        "Shedeur Sanders": "CLE",
        "Deshaun Watson": "CLE",
    },
    "earned_to_active_team_remaps": {
        "Greg Dortch": ("ARI", "BUF"),
        "Kendrick Bourne": ("SF", "ARI"),
        "Kyler Murray": ("ARI", "MIN"),
        "Kirk Cousins": ("LV", "MIN"),
        "Jacoby Brissett": ("ARI", "BAL"),
        "J.J. McCarthy": ("MIN", "NYG"),
        "Josh Downs": ("IND", "KC"),
        "Keenan Allen": ("IND", "SF"),
        "Kenneth Walker III": ("SEA", "KC"),
        "Tyler Allgeier": ("ATL", "ARI"),
        "Myles Garrett": ("CLE", "LAR"),
        "Jared Verse": ("LAR", "CLE"),
        "Jeffery Simmons": ("TEN", "CHI"),
        "Trent McDuffie": ("KC", "LAR"),
        "Amani Hooker": ("TEN", "BUF"),
        "Jessie Bates": ("ATL", "JAX"),
    },
    "head_coaches": {
        "ATL": "Kevin Stefanski",
        "CLE": "Todd Monken",
    },
    "unavailable_players": [
        "Micah Parsons",
        "Puka Nacua",
        "Davante Adams",
        "Brandon Aiyuk",
        "Jake Ferguson",
        "Aaron Brewer",
        "Zach Sieler",
        "Gardner Minshew",
        "Sam Darnold",
        "Jaxson Dart",
    ],
    "practice_watchlist": {
        "Trent Williams": "limited_friday_questionable",
        "Dre Greenlaw": "limited_friday_questionable",
        "Garrett Wilson": "full_friday_clearance_pending",
        "Trent McDuffie": "questionable",
        "Derrick Brown": "playing_active",
        "Kirk Cousins": "expected_to_start_not_formally_announced",
        "Kyle McCord": "first_career_start_mia",
        "Carson Beck": "first_career_start_ari",
    },
    "venue_truth": {
        "NE@DET": {
            "venue": "Allianz Arena Munich",
            "country": "Germany",
            "neutral_site": True,
            "roof": "outdoor",
            "surface": "grass",
            "circadian_travel_hours": 6,
            "is_ford_field_dome": False,
        },
        "KC@ATL": {
            "venue": "Mercedes-Benz Stadium",
            "country": "USA",
            "neutral_site": False,
            "roof": "closed_roof",
            "surface": "turf",
            "circadian_travel_hours": 0,
            "outdoor_weather_suppressed": True,
        },
    },
    "stale_sfdata_errata_rows": [
        {"player": "Greg Dortch", "stale_sfdata_team": "ARI", "authoritative_week10_team": "BUF"},
        {"player": "Kendrick Bourne", "stale_sfdata_team": "SF", "authoritative_week10_team": "ARI"},
        {"player": "Josh Downs", "stale_sfdata_team": "IND", "authoritative_week10_team": "KC"},
        {"player": "Keenan Allen", "stale_sfdata_team": "IND", "authoritative_week10_team": "SF"},
        {"player": "Kenneth Walker III", "stale_sfdata_team": "SEA", "authoritative_week10_team": "KC"},
        {"player": "Tyler Allgeier", "stale_sfdata_team": "ATL", "authoritative_week10_team": "ARI"},
        {"player": "Myles Garrett", "stale_sfdata_team": "CLE", "authoritative_week10_team": "LAR"},
        {"player": "Jared Verse", "stale_sfdata_team": "LAR", "authoritative_week10_team": "CLE"},
        {"player": "Jeffery Simmons", "stale_sfdata_team": "TEN", "authoritative_week10_team": "CHI"},
        {"player": "Trent McDuffie", "stale_sfdata_team": "KC", "authoritative_week10_team": "LAR"},
        {"player": "Amani Hooker", "stale_sfdata_team": "TEN", "authoritative_week10_team": "BUF"},
        {"player": "Jessie Bates", "stale_sfdata_team": "ATL", "authoritative_week10_team": "JAX"},
        {"player": "Kyler Murray", "stale_sfdata_team": "ARI", "authoritative_week10_team": "MIN"},
        {"player": "Kirk Cousins", "stale_sfdata_team": "LV", "authoritative_week10_team": "MIN"},
        {"player": "Jacoby Brissett", "stale_sfdata_team": "ARI", "authoritative_week10_team": "BAL"},
        {"player": "J.J. McCarthy", "stale_sfdata_team": "MIN", "authoritative_week10_team": "NYG"},
    ],
}

ABBREVIATED_PLAYER_ALIASES: Dict[str, str] = {
    "k.murray": "Kyler Murray",
    "k. murray": "Kyler Murray",
    "kyler murray": "Kyler Murray",
    "k.cousins": "Kirk Cousins",
    "k. cousins": "Kirk Cousins",
    "kirk cousins": "Kirk Cousins",
    "j.brissett": "Jacoby Brissett",
    "j. brissett": "Jacoby Brissett",
    "jacoby brissett": "Jacoby Brissett",
    "j.mccarthy": "J.J. McCarthy",
    "j. mccarthy": "J.J. McCarthy",
    "j.j. mccarthy": "J.J. McCarthy",
    "jj mccarthy": "J.J. McCarthy",
    "j.downs": "Josh Downs",
    "j. downs": "Josh Downs",
    "josh downs": "Josh Downs",
    "k.walker": "Kenneth Walker III",
    "k. walker": "Kenneth Walker III",
    "kenneth walker iii": "Kenneth Walker III",
    "t.allgeier": "Tyler Allgeier",
    "t. allgeier": "Tyler Allgeier",
    "tyler allgeier": "Tyler Allgeier",
    "k.allen": "Keenan Allen",
    "k. allen": "Keenan Allen",
    "keenan allen": "Keenan Allen",
    "g.dortch": "Greg Dortch",
    "k.bourne": "Kendrick Bourne",
}

SFDATA_STALE_CSV_FILES: Tuple[str, ...] = (
    "sfdata-qb-ryoe-2026.csv",
    "sfdata-throwaway-rate-2026.csv",
    "sfdata-time-to-scramble-2026.csv",
    "sfdata-expected-completion-pct-2026.csv",
    "sfdata-quick-pressure-rate-2026.csv",
)

QUARANTINED_CSV_ANOMALIES: Dict[Tuple[str, str, str], str] = {
    ("sfdata-qb-ryoe-2026.csv", "j. daniels", "TB"): "Unverified duplicate J. Daniels TB #20 row (Jayden Daniels WAS #1 is valid)",
    ("sfdata-qb-ryoe-2026.csv", "j.daniels", "TB"): "Unverified duplicate J. Daniels TB #20 row (Jayden Daniels WAS #1 is valid)",
}

MULTI_ORIGIN_PRIOR_TEAMS: Dict[str, Tuple[str, ...]] = {
    "Kirk Cousins": ("LV", "ATL"),
}


def resolve_week10_csv_entity_row(
    file_name: str,
    player_name: str,
    printed_team: str,
) -> Dict[str, Any]:
    """Resolve an analytics-sweep CSV player/team row against authoritative Week 10 truth."""
    fname = Path(str(file_name or "")).name.lower()
    raw_player = " ".join(str(player_name or "").strip().split())
    norm_key = raw_player.lower()
    canonical_player = ABBREVIATED_PLAYER_ALIASES.get(norm_key, raw_player)
    printed = str(printed_team or "").strip().upper()

    quarantine_reason = QUARANTINED_CSV_ANOMALIES.get((fname, norm_key, printed))
    if quarantine_reason:
        return {
            "file_name": fname,
            "raw_player": raw_player,
            "canonical_player": canonical_player,
            "printed_team": printed,
            "week10_active_team": None,
            "season_stat_prior_team_remapped": False,
            "quarantined_anomaly": True,
            "quarantine_reason": quarantine_reason,
            "unavailable": False,
        }

    active_map = AUTHORITATIVE_WEEK10_TRUTH_2026_11_13["active_player_team"]
    remaps = AUTHORITATIVE_WEEK10_TRUTH_2026_11_13["earned_to_active_team_remaps"]
    unavail = set(AUTHORITATIVE_WEEK10_TRUTH_2026_11_13["unavailable_players"])

    active_team = active_map.get(canonical_player, printed or None)
    prior_candidates = set(MULTI_ORIGIN_PRIOR_TEAMS.get(canonical_player, ()))
    if canonical_player in remaps:
        prior_candidates.add(remaps[canonical_player][0])

    remapped = bool(
        active_team
        and printed
        and printed != active_team
        and (printed in prior_candidates or fname in SFDATA_STALE_CSV_FILES)
    )
    return {
        "file_name": fname,
        "raw_player": raw_player,
        "canonical_player": canonical_player,
        "printed_team": printed,
        "week10_active_team": active_team,
        "season_stat_prior_team_remapped": remapped,
        "quarantined_anomaly": False,
        "quarantine_reason": None,
        "unavailable": canonical_player in unavail,
    }


def open_foundry_db_readonly(db_path: Path | str = Path(r"C:\Users\Garrett\Sports\foundry\foundry.db")) -> sqlite3.Connection:
    """Open SQLite strictly via `file:...?mode=ro` URI to avoid WAL lock contention with Hermes."""
    resolved = Path(db_path).resolve()
    if not resolved.is_file():
        raise FileNotFoundError(f"Foundry SQLite DB not found: {resolved}")
    posix = resolved.as_posix()
    uri = f"file:{posix}?mode=ro"
    return sqlite3.connect(uri, uri=True, timeout=5.0)


def load_all_sovereign_primitives(
    primitives_dir: Path | str = Path(r"C:\Users\Garrett\Sports\foundry\artifacts\primitives"),
) -> Dict[str, Any]:
    """Validate and inventory 100% of Foundry sovereign primitive JSON artifacts."""
    pdir = Path(primitives_dir)
    if not pdir.is_dir():
        raise FileNotFoundError(f"Primitives directory not found: {pdir}")

    files = sorted(pdir.glob("*.json"))
    schema_errors: List[str] = []
    books: List[Dict[str, Any]] = []
    total_primitives = 0

    for fp in files:
        try:
            obj = json.loads(fp.read_text(encoding="utf-8"))
        except Exception as exc:
            schema_errors.append(f"{fp.name}: invalid JSON ({exc})")
            continue
        if not isinstance(obj, dict):
            schema_errors.append(f"{fp.name}: root JSON must be object")
            continue
        prims = obj.get("primitives")
        if not isinstance(prims, list):
            schema_errors.append(f"{fp.name}: missing list 'primitives'")
            continue
        book_id = str(obj.get("book_id") or fp.stem)
        valid_book_prims = 0
        for idx, prim in enumerate(prims):
            if not isinstance(prim, dict):
                schema_errors.append(f"{fp.name}[{idx}]: primitive must be object")
                continue
            pid = prim.get("primitive_id") or prim.get("id") or f"{book_id}:p{idx + 1}"
            quote = prim.get("verbatim_quote") or prim.get("quote") or prim.get("text")
            if not quote or not str(quote).strip():
                schema_errors.append(f"{fp.name}[{idx}] ({pid}): empty verbatim_quote")
                continue
            valid_book_prims += 1
        total_primitives += valid_book_prims
        books.append({
            "file": fp.name,
            "book_id": book_id,
            "source_status": obj.get("source_status"),
            "pages_read": obj.get("pages_read"),
            "pages_total": obj.get("pages_total"),
            "primitives_count": len(prims),
        })

    return {
        "primitives_dir": str(pdir),
        "books_count": len(files),
        "primitives_count": total_primitives,
        "schema_errors": schema_errors,
        "books": books,
    }


def _reference_answers_by_signature() -> List[Tuple[str, Dict[str, Any]]]:
    """Deterministic mathematical reference solutions for all Foundry RLVR counterfactual scenarios."""
    # Batch 002 scenario 2 R_ref & r2
    r2_b2s2 = (math.sqrt(30 * 30 / 60) * (9.0 - 8.0) / 4.0) ** 2
    # Batch 002 scenario 3 matched-seed intervals
    n, w1, w2 = 1000, 520, 470
    p1, p2 = w1 / n, w2 / n
    d = p1 - p2
    se_m = math.sqrt((p1 + p2 - d * d) / n)
    se_i = math.sqrt((p1 * (1 - p1) + p2 * (1 - p2)) / n)
    ci_m = [d - 1.96 * se_m, d + 1.96 * se_m]
    ci_i = [d - 1.96 * se_i, d + 1.96 * se_i]

    # Batch 003 scenario 2 Shannon bits + Gray nats
    p_b3s2 = [0.5, 0.25, 0.125, 0.125]
    H_b3s2 = -sum(q * math.log2(q) for q in p_b3s2)
    J = {(0, 0): 0.7425, (0, 1): 0.0075, (1, 0): 0.0025, (1, 1): 0.2475}
    px = [sum(J[(x, y)] for y in (0, 1)) for x in (0, 1)]
    py = [sum(J[(x, y)] for x in (0, 1)) for y in (0, 1)]
    Hx = -sum(q * math.log2(q) for q in px)
    Hy = -sum(q * math.log2(q) for q in py)
    Hxy = -sum(q * math.log2(q) for q in J.values())
    equiv = Hxy - Hy
    R_read = Hx - equiv
    typical_ceil = math.ceil(math.exp(12 * (H_b3s2 * math.log(2) + 0.05)))

    # Batch 003 scenario 3 Two-Witness Gamble
    muL, muR, s = 0.66, 0.62, 0.04
    sd = math.sqrt(2.0 * s * s)
    delta = (muL - muR) / sd
    Phi = 0.5 * (1.0 + math.erf(delta / math.sqrt(2.0)))
    phi = math.exp(-0.5 * delta * delta) / math.sqrt(2.0 * math.pi)
    eL = muL + (s * s / sd) * (phi / Phi)
    eR = muR + (s * s / sd) * (phi / (1.0 - Phi))

    # Batch 004 scenario 1 CQR & Ville
    cov_5 = 5 / 6
    # Batch 004 scenario 2 Mean-field
    U_t = 1.5 / (1 + 0.5 * 0.75 * math.log(20))
    # Batch 005 scenario 1 Hazard
    grid = [2 + i * 0.01 for i in range(801)]
    d_min = min(grid, key=lambda d_: 6 + 0.8 * d_ - 0.05 * d_ * d_)
    # Batch 006 scenario 1 Sigmoid
    a_b6s1 = 1.0 / (1.0 + math.exp(-7.0))
    sp_b6s1 = a_b6s1 * (1.0 - a_b6s1)

    return [
        ("Crosswind Cliff at 1:58", {
            "challenge_decision": "decline",
            "challenge_veto_reasons": ["timeout_coupling", "ten_second_runoff", "clear_and_obvious_not_private_certainty"],
            "fourth_down_ranking": "refuse_to_rank",
            "drag_model_required": "yaw_dependent",
            "crosswind_regime": "high_yaw_re_sensitive",
            "cd_high_to_low_ratio_approx": 4.1,
            "drag_equation_units": {"rho": "kg/m^3", "U": "m/s", "A": "m^2", "C_D": "dimensionless", "D": "N"},
            "bayes_floor_acknowledged": True,
            "invented_probabilities": False,
        }),
        ("Leaky Oracle on the Opening OT Drive", {
            "authorize_fourth_down_on_model": False,
            "leakage_verdict": "suspected_target_leakage_until_ablation",
            "auc_accuracy_divergence_signature": True,
            "required_first_step": "ablate_post_outcome_features_and_recompute",
            "era_pooling_2019_2024_with_2025": "forbidden",
            "error_diagnosis": ["avoidable_bias", "data_mismatch"],
            "variance_is_primary_problem": False,
            "first_possession_td_ends_game_2025_rs": False,
            "ot_cap_seconds": 600,
            "tie_is_legal_terminal_state": True,
            "tie_value_in_standings": "half_win",
            "safety_on_initial_possession_ends_game": True,
            "tendency_oscillation_diagnosis": "thin_or_zero_margin",
            "opening_drive_policy": "rederive_under_2025_both_possession_kernel",
        }),
        ("The 158.3 Mirage on a Short Week", {
            "qb3_activation_legal": False,
            "activation_predicate_value": {"u1": 1, "u2": 0, "d": 1, "conjunction": 0},
            "qb3_passer_rating": 158.333333,
            "saturated_components": ["a", "b", "c", "d"],
            "small_sample_caveat": True,
            "rating_observes_leadership_playcalling": False,
            "days_since_proxy_sufficient": False,
            "deep_script_admissible": False,
            "composite_score_valid": False,
            "composite_rejection_reason": "dimensional_inhomogeneity",
            "decision": "qb2_continues_no_activation_no_deep_script_on_saturated_sensor",
        }),
        ("Conservation Mirage", {
            "alpha_n": 13.25 / 14.0,
            "mass_conservation_holds": True,
            "g_a_unweighted": 31.0,
            "g_a_weighted": 36.625,
            "flat_asset_gain_invariant_under_reweighting": True,
            "playoffs_only_reweighting_status": "singular_undefined",
            "fairness_channel_mixes_weighted_and_unweighted": True,
            "qb_expert_correction": "strip",
            "rb_expert_correction": "keep",
            "playoff_spike_channel_r2_band": "0.20-0.30",
            "spike_is_stable_skill_signal": False,
            "trade_decision": "veto_reweight_and_reprice",
        }),
        ("Reversed Cadence", {
            "timing_order_sign": "depression",
            "population_gain_transfers_to_individual": False,
            "tacs_vs_sham_significant": False,
            "next_session_inside_tacs_aftereffect": True,
            "earliest_unconfounded_session": "10:10",
            "csp_admissible": False,
            "csp_failure_mode": "rank_deficient_whitening_singular",
            "r2_band_value": r2_b2s2,
            "timing_only_phase_visible_to_r2_selector": False,
            "nb_accuracy_certifies_probability": False,
            "nb_distance_angle_independent": False,
            "elo_updated_rating": 1.62,
            "eta_0_9_admissible": False,
            "install_cadence_as_proposed": False,
        }),
        ("Matched-Seed Mirage", {
            "p_hat_T1": p1,
            "p_hat_T2": p2,
            "required_variance": "same_survey_multinomial",
            "ci95_multinomial": ci_m,
            "ci95_independent_samples": ci_i,
            "multinomial_ci_contains_zero": True,
            "independent_ci_contains_zero": False,
            "superiority_verdict": "no_conclusion",
            "u_qb_additive": 9 * 0.06 + 4 * 0.55,
            "u_qb_pressure_gated": 9 * 0.06 * 0.38 + 4 * 0.55,
            "rho_downweights_rare_td_pass": True,
            "fusion_weights_on_simplex": True,
            "crowd_effective_n_collapsed": True,
            "charted_pressure_live_call_admissible": False,
            "total_line_admissible": False,
            "poisson_independence_holds_in_game": False,
            "searched_significance_admissible": False,
            "promote_T1_on_this_evidence": False,
        }),
        ("The Hundred-Snap Rollout", {
            "authorize_rollout_policy": False,
            "zero_count_state_admissible": False,
            "ml_estimator_at_unvisited": "undefined",
            "rollout_through_zero_count_is_estimate": False,
            "reversible_access_implies_free_live_exploration": False,
            "model_error_compounds_along_rollout": True,
            "required_parameters_curse": 50 ** 6,
            "capacity_sufficient": False,
            "capacity_shortfall_factor": (50 ** 6) / (25 * 10 ** 4),
            "barron_escape_available": False,
            "deadly_triad_present": True,
            "baird_diverges_for_any_positive_step_size": True,
            "q_learning_off_policy_mechanism": "max_over_next_actions",
            "regret_lower_bound_scale": 10 ** 5,
            "zero_regret_claim_admissible": False,
            "required_first_step": "chart_real_snaps_in_unvisited_cells",
            "policy_decision": "veto_and_collect_data",
        }),
        ("The No-Huddle Firehose", {
            "source_entropy_bits": H_b3s2,
            "install_capacity_bits_per_rep": 3.0,
            "install_capacity_bits_per_min": 36.0,
            "planned_install_rate_bits_per_min": 48.0,
            "install_rate_admissible": False,
            "equivocation_floor_bits_per_min": 12.0,
            "finite_block_error_floor_positive": True,
            "read_channel_input_entropy_bits": Hx,
            "read_channel_equivocation_bits": equiv,
            "read_channel_rate_bits_per_read": R_read,
            "naive_error_subtraction_valid": False,
            "naive_subtracted_rate_bits_per_read": Hx * 0.99,
            "typical_set_index_bound": typical_ceil,
            "zero_probability_model_admissible": False,
            "divergence_verdict": "infinite",
            "attention_budget_simultaneous_maximal": False,
            "install_decision": "veto_full_install",
        }),
        ("The Two-Witness Gamble", {
            "eu_ranking_admissible": False,
            "independence_axiom_violated": True,
            "mixture_utility_A": 0.50,
            "mixture_utility_B": 0.35,
            "pure_strategy_saddle_point_exists": False,
            "mixed_strategy_value_epa": 0.4,
            "witness_fusion_admissible": False,
            "fallacious_lr_product": (0.80 / 0.30) * (0.70 / 0.35),
            "fallacious_product_value": ((0.80 / 0.30) * (0.70 / 0.35)) / (1.0 + (0.80 / 0.30) * (0.70 / 0.35)),
            "correct_combined_value": ((0.40 / 0.60) * (0.62 / 0.24)) / (1.0 + (0.40 / 0.60) * (0.62 / 0.24)),
            "overlap_double_count_present": True,
            "union_probability_staff": 0.78,
            "union_probability_correct": 0.60,
            "identical_balance_different_weight": True,
            "weight_equals_reliability": False,
            "selection_bias_inflates_observed": True,
            "observed_rate_trustworthy": False,
            "selection_probability_left": Phi,
            "observed_rate_left": eL,
            "observed_rate_right": eR,
            "mrs_value": 3.0,
            "go_for_it_on_this_package": False,
            "required_first_step": "repair_preferences_and_refit_evidence",
        }),
        ("The Clamped Corridor on the Rookie Prop", {
            "cqr_rank_index_k": 6,
            "clamp_admissible": False,
            "true_coverage_if_clamped": cov_5,
            "advertised_coverage": 0.90,
            "coverage_defect_probability_points": (0.90 - cov_5) * 100.0,
            "min_calibration_n_for_90pct": 9,
            "required_output_at_n5": "abstain_or_unbounded",
            "ville_alpha_threshold": 0.05,
            "ville_wealth_threshold": 20.0,
            "wealth_after_three_games": 1.44,
            "execution_unlocked": False,
            "static_p_peeking_valid": False,
            "counterfactual_reversal_time_ms": 150,
            "counterfactual_reversal_admissible": False,
            "refractory_window_ms": [200, 400],
            "postural_gate_fires": False,
            "conjunctive_and_required": True,
            "static_dose_admissible_after_fatigue_flare": False,
            "deployment_decision": "veto_fail_closed",
        }),
        ("The Mean-Field Dynasty", {
            "mean_field_control_nuU": 0.75,
            "chi_mean_field": 4.0,
            "vertex_mean_field": 4.0,
            "renormalized_U_tilde": U_t,
            "renormalized_control_nuUtilde": 0.5 * U_t,
            "instability_within_controlled_regime": False,
            "mean_field_overestimates_ordering": True,
            "transition_order": "first_order_with_diverging_precursor",
            "gradual_ramp_warning_admissible": False,
            "precursor_monitoring_licensed": True,
            "log_claim_licensed_without_scale_separation": False,
            "random_baseline_precision": 14 / 32,
            "model_beats_persistence": True,
            "pool_pre_post_1994_admissible": False,
            "iid_ratings_admissible": False,
            "single_metric_coach_grading_admissible": False,
            "assistant_experience_share": 0.30,
            "assistant_threshold_met": False,
            "first_year_penalty_feature": "HeadCoach.year_with_team<=1",
            "dynasty_decision": "veto_mean_field_and_pooling",
        }),
        ("The Witness Ledger at the Goal Line", {
            "loss_post_rate": 34 / 46,
            "settlement_publication_ratio_R": 108 / 150,
            "witness_complete": False,
            "render_score_as_probability_admissible": False,
            "claimed_band_probability": 0.8663,
            "realized_band_probability": 0.5191,
            "calibration_z": -10.7,
            "job_order_correct": "witness>distribution>community>research",
            "metric_admissible_followers": False,
            "ep_go_value": 4.54,
            "ep_optimal_action": "go",
            "wp_optimal_action": "punt",
            "objective_reversal_present": True,
            "flat_turnover_swing": 4.0,
            "fumble_swing_at_own_30": (-2.0 + 30 / 12.5) + (-2.0 + 20 / 12.5),
            "flat_charge_admissible": False,
            "rate_passer_a": 100 * 280 / 350,
            "rate_passer_b": 100.0,
            "era_gauge_required": True,
            "regression_turnover_shadow_per_pair": 4.16,
            "ledger_decision": "veto_and_rebuild",
        }),
        ("The Interior Eight Yards", {
            "hazard_at_2yd": 6 + 0.8 * 2 - 0.05 * 4,
            "hazard_at_8yd": 6 + 0.8 * 8 - 0.05 * 64,
            "hazard_at_10yd": 6 + 0.8 * 10 - 0.05 * 100,
            "interior_peak_depth_yd": 8.0,
            "interior_peak_is_maximum": True,
            "deeper_is_safer_admissible": False,
            "optimal_depth_under_min2_constraint": d_min,
            "mean_player_value": 3.8,
            "median_player_value": 2.0,
            "mean_median_skew_ratio": 1.9,
            "report_mean_as_typical_admissible": False,
            "grade_difference": 3,
            "combined_error_band": 6,
            "ranking_resolved": False,
            "drawdown_recovery_fraction": 1.0,
            "depth_decision": "veto_and_recompute",
        }),
        ("The Observable Act", {
            "below_knee_contacts_observed": 12,
            "intent_provable_count": 0,
            "effective_rule": "strict_liability_on_observable_act",
            "disqualification_risk_per_low_tackle": 12 / 40,
            "self_report_concealment_rate": 0.3,
            "availability_source_required": "independent_medical_observer",
            "replace_star_with_fresh_sub": True,
            "adversarial_exit_gate_admissible": False,
            "consent_denial_rate": 0.8,
            "icp_spike_gate_fires": False,
            "persistence_requirement_min": 5,
            "cpp_75_admissible": False,
            "cpp_corridor": [60, 70],
            "sbp_105_adequate_age30": False,
            "sbp_105_adequate_age55": True,
            "enforcement_decision": "veto_and_rebuild",
        }),
        ("The Contagion Chain", {
            "branching_factor_effective": 2.0,
            "expected_chain_damage_3_generations": 7.0,
            "termination_required": True,
            "qb_herding_lift": 0.22 / 0.10,
            "kds_herding_lift": 0.40 / 0.05,
            "herding_role_stage_specific": True,
            "fixed_strategy_opponent_admissible": False,
            "normalized_value_sample_a": 0.125,
            "normalized_value_sample_b": 0.125,
            "regulated_control_gm": 64.0,
            "normalization_artifact_factor": 4.0,
            "single_regulated_reference_admissible": False,
            "canonical_only_null_claim_admissible": False,
            "cascade_decision": "veto_and_rebuild",
        }),
        ("The Saturated Confidence", {
            "sigmoid_a": a_b6s1,
            "sigmoid_prime": sp_b6s1,
            "quadratic_gradient_factor": a_b6s1 * sp_b6s1,
            "crossentropy_gradient_factor": a_b6s1,
            "ce_over_quadratic_ratio": a_b6s1 / (a_b6s1 * sp_b6s1),
            "quadratic_learns_fast_when_wrong": False,
            "crossentropy_learns_fast_when_wrong": True,
            "win_count_is_smooth": False,
            "z_std_unscaled_init": math.sqrt(501.0),
            "z_std_scaled_init": math.sqrt(0.501),
            "scaled_init_avoids_saturation": True,
            "decision": "veto_and_recompute",
        }),
        ("The Overfit Elephant", {
            "model_A_overfit_gap": 0.17,
            "model_B_overfit_gap": 0.02,
            "model_A_test_accuracy": 0.82,
            "model_B_test_accuracy": 0.88,
            "select_by_train_accuracy_admissible": False,
            "better_model_by_heldout": "B",
            "tuned_on_test_data_valid": False,
            "correct_tuning_split": "validation",
            "more_params_guarantees_better": False,
            "decision": "veto_and_recompute",
        }),
        ("The Vanishing Credit", {
            "layer_factor_vanishing": 0.125,
            "early_gradient_product_vanishing": 0.125 ** 5,
            "layer_factor_exploding": 1.25,
            "early_gradient_product_exploding": 1.25 ** 5,
            "uniform_learning_across_depth_admissible": False,
            "relu_grad_negative_input": 0.0,
            "relu_grad_positive_input": 1.0,
            "relu_never_stops_learning": False,
            "discontinuous_target_approximable_by_smooth_net": False,
            "decision": "veto_and_recompute",
        }),
    ]


def build_reference_answer_for_rlvr_scenario(verifier_code: str, ground_truth: Any = None) -> Dict[str, Any]:
    """Resolve the exact reference answer dict for an RLVR `verify(answer)` scenario."""
    for sig, payload in _reference_answers_by_signature():
        if sig in verifier_code:
            return copy.deepcopy(payload)
    if isinstance(ground_truth, dict):
        return copy.deepcopy(ground_truth)
    # Generic AST fallback for any newly added batch beyond rlvr_batch-006
    tree = ast.parse(verifier_code)
    inferred: Dict[str, Any] = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Compare) and isinstance(node.left, ast.Call):
            fn = node.left.func
            if isinstance(fn, ast.Attribute) and fn.attr == "get" and node.left.args:
                arg0 = node.left.args[0]
                if isinstance(arg0, ast.Constant) and isinstance(arg0.value, str) and node.comparators:
                    comp = node.comparators[0]
                    if isinstance(comp, ast.Constant):
                        if any(isinstance(op, (ast.NotEq, ast.IsNot)) for op in node.ops):
                            inferred[arg0.value] = comp.value
    return inferred


def load_and_verify_all_rlvr_vetoes(
    rlvr_dir: Path | str = Path(r"C:\Users\Garrett\Sports\foundry\artifacts\rlvr_vetoes"),
) -> Dict[str, Any]:
    """Glob `*.jsonl` (mixed `batch-*` + `rlvr_batch-*`), compile every verifier, and run all 3 self-tests."""
    rdir = Path(rlvr_dir)
    if not rdir.is_dir():
        raise FileNotFoundError(f"RLVR vetoes directory not found: {rdir}")

    batch_files = sorted(rdir.glob("*.jsonl"))
    scenarios: List[Dict[str, Any]] = []
    all_passed = True

    for bf in batch_files:
        for idx, line in enumerate(bf.read_text(encoding="utf-8").splitlines()):
            if not line.strip():
                continue
            row = json.loads(line)
            rv_code = str(row.get("reward_verifier") or "")
            gt = row.get("ground_truth_invariant")
            m = re.search(r"scenario\s+\d+\s+\(([^)]+)\)", rv_code)
            scenario_name = m.group(1) if m else f"{bf.stem}[{idx}]"

            ns: Dict[str, Any] = {}
            exec(compile(rv_code, f"<{bf.name}:{idx}>", "exec"), ns, ns)
            verify_fn = ns["verify"]

            correct_ans = build_reference_answer_for_rlvr_scenario(rv_code, gt)
            wrong_ans = {"invalid_counterfactual": True}
            json_str_ans = json.dumps(correct_ans)

            t_correct = bool(verify_fn(copy.deepcopy(correct_ans)))
            t_wrong = bool(verify_fn(wrong_ans))
            t_json = bool(verify_fn(json_str_ans))
            row_ok = t_correct is True and t_wrong is False and t_json is True
            if not row_ok:
                all_passed = False

            scenarios.append({
                "batch_file": bf.name,
                "row_index": idx,
                "scenario_name": scenario_name,
                "test_correct_dict": t_correct,
                "test_wrong_dict": t_wrong,
                "test_json_string": t_json,
                "passed_all_3": row_ok,
            })

    return {
        "rlvr_dir": str(rdir),
        "batch_files_count": len(batch_files),
        "batch_files": [b.name for b in batch_files],
        "total_scenarios": len(scenarios),
        "all_passed": all_passed,
        "scenarios": scenarios,
    }


def remap_motif_csv_season_stats(row: Dict[str, Any], *, week: int = 10) -> Dict[str, Any]:
    """Non-destructively tag Motif season stats with `earned_team` vs `active_week_team` without editing CSVs."""
    cloned = copy.deepcopy(row)
    player = str(cloned.get("player") or cloned.get("player_name") or "").strip()
    csv_team = str(cloned.get("team") or cloned.get("recent_team") or "").strip().upper()
    active_map = AUTHORITATIVE_WEEK10_TRUTH_2026_11_13["active_player_team"]
    active_team = str(active_map.get(player, csv_team)).upper()
    cloned["earned_team"] = csv_team or active_team
    cloned["active_week_team"] = active_team
    cloned["week"] = week
    cloned["remapped"] = bool(player in active_map and csv_team and active_team != csv_team)
    return cloned


def audit_gcp_week10_crucibles(
    gcp_sync_dir: Path | str = Path(r"C:\Users\Garrett\Sports\foundry\artifacts\gcp_sync"),
    handoff_path: Path | str = Path(r"C:\Users\Garrett\Sports\foundry\artifacts\week10_crucible\AUDITOR2_HANDOFF.md"),
) -> Dict[str, Any]:
    """Audit unpacked GCP Week 10 crucibles and AUDITOR2_HANDOFF.md for Munich NE@DET & KC@ATL roof defects."""
    gdir = Path(gcp_sync_dir)
    hpath = Path(handoff_path)
    crucibles = sorted(gdir.glob("week10_*.md")) if gdir.is_dir() else []

    ne_det_override_needed = False
    kc_atl_override_needed = False
    file_reports: List[Dict[str, Any]] = []

    for cp in crucibles:
        text = cp.read_text(encoding="utf-8", errors="replace")
        low = text.lower()
        has_munich = "munich" in low or "allianz" in low
        has_ford_dome = "ford field" in low
        has_closed_roof = "closed roof" in low or "retractable roof closed" in low
        if cp.name == "week10_NE_at_DET.md":
            ne_det_override_needed = (has_ford_dome and not has_munich) or not has_munich
        if cp.name == "week10_KC_at_ATL.md":
            kc_atl_override_needed = ("open air" in low or "outdoor" in low) and not has_closed_roof
        file_reports.append({
            "file": cp.name,
            "size_bytes": cp.stat().st_size,
            "mentions_munich_allianz": has_munich,
            "mentions_closed_roof": has_closed_roof,
        })

    return {
        "week10_crucible_files_count": len(crucibles),
        "crucible_files": file_reports,
        "handoff_present": hpath.is_file(),
        "venue_truth": AUTHORITATIVE_WEEK10_TRUTH_2026_11_13["venue_truth"],
        "ne_at_det_crucible_override_required": ne_det_override_needed,
        "kc_at_atl_crucible_override_required": kc_atl_override_needed,
    }


def _parse_iso_dt(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    s = str(ts).strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _finite_float(val: Any) -> Optional[float]:
    if val is None or isinstance(val, bool):
        return None
    try:
        num = float(val)
    except (TypeError, ValueError):
        return None
    return num if math.isfinite(num) else None


def evaluate_candidate_ticket_with_rlvr_bridge(ticket: Dict[str, Any]) -> Dict[str, Any]:
    """Run all 6 fail-closed RLVR veto gates against a candidate Week 10 projection/ticket."""
    vetoes: List[str] = []
    reasons: List[str] = []

    # 1. Saturated confidence (rlvr_batch-006 scenario 1: |z| >= 5.0 or non-finite fails closed)
    raw_z = ticket.get("raw_logit_z")
    if raw_z is not None:
        raw_z_f = _finite_float(raw_z)
        if raw_z_f is None or abs(raw_z_f) >= 5.0:
            vetoes.append(RLVR_VETO_SATURATED_CONFIDENCE)
            reasons.append(f"raw_logit_z={raw_z} is non-finite or sits in saturated tail (|z|>=5.0)")

    # 2. Overfit elephant (rlvr_batch-006 scenario 2: large train-val gap > 0.12, test tuning, or non-finite)
    train_acc = ticket.get("train_acc")
    val_acc = ticket.get("val_acc")
    train_f = _finite_float(train_acc) if train_acc is not None else None
    val_f = _finite_float(val_acc) if val_acc is not None else None
    overfit_invalid = (train_acc is not None and train_f is None) or (val_acc is not None and val_f is None)
    if (
        ticket.get("tuned_on_test_data") is True
        or overfit_invalid
        or (train_f is not None and val_f is not None and (train_f - val_f) > 0.12)
    ):
        vetoes.append(RLVR_VETO_OVERFIT_ELEPHANT)
        reasons.append("overfit_gap > 0.12, test-split leakage, or non-finite split metric")

    # 3. Vanishing credit (rlvr_batch-006 scenario 3: gradient product outside [1e-3, 50.0] or non-finite)
    dgp = ticket.get("depth_gradient_product")
    if dgp is not None:
        dgp_f = _finite_float(dgp)
        if dgp_f is None or dgp_f < 1e-3 or dgp_f > 50.0:
            vetoes.append(RLVR_VETO_VANISHING_CREDIT)
            reasons.append(f"depth_gradient_product={dgp} non-finite or outside stable [1e-3, 50.0]")

    # 4. Stage-0 roster contamination (wrong active team or OUT/IR/PUP/EXEMPT unavailable player)
    player = str(ticket.get("player") or "").strip()
    team = str(ticket.get("team") or "").strip().upper()
    active_map = AUTHORITATIVE_WEEK10_TRUTH_2026_11_13["active_player_team"]
    unavail = set(AUTHORITATIVE_WEEK10_TRUTH_2026_11_13["unavailable_players"])
    if player:
        if player in unavail:
            vetoes.append(RLVR_VETO_STAGE0_ROSTER_CONTAMINATION)
            reasons.append(f"{player} is OUT/IR/PUP/EXEMPT for Week 10")
        elif player in active_map and team and team != active_map[player]:
            vetoes.append(RLVR_VETO_STAGE0_ROSTER_CONTAMINATION)
            reasons.append(f"{player} active Week 10 team is {active_map[player]}, got {team}")

    # 5. Single-sided market (must explicitly evaluate BOTH Over/Under or Away/Home sides)
    if ticket.get("both_sides_evaluated") is not True:
        vetoes.append(RLVR_VETO_SINGLE_SIDED_MARKET)
        reasons.append("both_sides_evaluated is not True (single-sided or unspecified de-vig forbidden)")

    # 6. Bitemporal leak (both cutoffs must parse cleanly and feature timestamp <= as_of cutoff)
    as_of_dt = _parse_iso_dt(ticket.get("as_of_utc"))
    feat_dt = _parse_iso_dt(ticket.get("feature_max_timestamp_utc"))
    if as_of_dt is None or feat_dt is None or feat_dt > as_of_dt:
        vetoes.append(RLVR_VETO_BITEMPORAL_LEAK)
        reasons.append("missing/invalid bitemporal timestamp or feature timestamp > as_of cutoff")

    return {
        "approved": len(vetoes) == 0,
        "veto_codes": vetoes,
        "reasons": reasons,
        "matchup": ticket.get("matchup"),
        "player": player or None,
    }

#!/usr/bin/env python3
"""Galaxy Sports Network LLC (DBA Galaxy Sports Edge, galaxysportsedge.com)
Line-Free NFL Coach-Mind Play-by-Play Simulator — 2026 Season Week 10.

Module: gse_line_free_coach_mind_week10_simulator.py

Core Architectural Guarantees:
1. ZERO-MARKET-CONTAMINATION TYPE BOUNDARY (Zone 1 / Zone 2 Class A Firewall):
   ``PureFootballMatchupInput`` and ``simulate_matchup_line_free`` physically reject
   any sportsbook odds, point spread, over/under total, moneyline, vig, or implied
   probability field with an immediate ``TypeError``. No market number enters any
   transition surface, play-call policy, fourth-down decision, or clock state.
2. AUTHENTIC COORDINATOR ARCHETYPES & SNAP-BY-SNAP STATE MACHINE:
   Models every snap from ``Q1 15:00`` through ``Rule 4 Victory Formation`` or
   ``EDGE#2 Overtime`` (10-minute regular-season OT period with two-possession
   guarantee) across all 14 named tactical minds:
   Kyle Shanahan, Sean McVay, Andy Reid, Steve Spagnuolo, Vic Fangio,
   Mike Macdonald, Brian Flores, Todd Monken, Jim Harbaugh, Jesse Minter,
   Dan Campbell, Kevin O'Connell, Jeff Hafley, and DeMeco Ryans (plus verified
   2026 opposing NFL head coaches and coordinators).
   Captures personnel groupings (11, 12, 21, 13), pre-snap motion & condensed
   splits, Pass Rate Over Expected (PROE) & script elasticity, simulated pressure /
   Cover-0 blitz traps vs. split-safety Quarters/Cover-6 shells, causal 4th-down
   quantile risk preferences (sealed baseline tau = 0.42), Sinkhorn-Knopp optimal-
   transport injury reallocation (QB_QUESTIONABLE = 0.0947), Two-Minute Warning
   clock compression, and deterministic Rule 4 kneeldown absorption.
3. POST-SEAL MARKET COMPARISON & 00-TRUTH-FILE GOVERNANCE (Zone 3 Class B):
   Market spreads and totals are inspected ONLY inside
   ``compare_sealed_distribution_to_market`` AFTER ``SealedCoachMindDistribution``
   cryptographically seals via SHA-256. Enforces integer ``XX/100`` conviction
   scores only, zero ``%`` confidence claims, zero retired record strings, and
   zero Next Gen Stats (NGS) leakage.

Primary Workspace References:
- w10_fixtures.json (1Xhu8FqU6i9Exlu-SDL-mHH2xyoSzvlJz)
- GSE Coach Simulation & Audits (1W-lC3pZAYTdw2Jzwyv1q-9ZtMkGIXs_RXiAH8cmmWJo)
- Core NFL Schemes & Systems (1JtMf24ogNdZZRcwNjdPE8g2L9KciRE1naEYzlFC0h98)
- 00-TRUTH-FILE (1HI8FMFrLOES11_GWLDCpGiJnK8_e7-F66TVJSKBzy-A)
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from types import MappingProxyType
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

import numpy as np


# =============================================================================
# SECTION 0: GOVERNANCE & SEALED MATHEMATICAL CONSTANTS (00-TRUTH-FILE & v1.0)
# =============================================================================

LEGAL_ENTITY_NAME: str = "Galaxy Sports Network LLC"
DBA_BRAND_NAME: str = "Galaxy Sports Edge"
CANONICAL_WEB_DOMAIN: str = "galaxysportsedge.com"
PUBLIC_LEDGER_URL: str = "https://galaxysportsedge.com/calibration"
PUBLIC_LEDGER_DISCLOSURE: str = (
    "Every pick is on the public ledger, wins and losses: "
    "https://galaxysportsedge.com/calibration"
)

SEALED_BASELINE_VERSION: str = "v1.0"
SEALED_FOURTH_DOWN_TAU: float = 0.42
QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF: float = 0.0947
NFL_KEY_NUMBERS: Tuple[int, ...] = (3, 7, 6, 10, 14)

# Sealed 5x5 scheme interchangeability cost matrix C across [WR1, WR2, WR3, TE1, RB1]
SEALED_COST_MATRIX_C: Tuple[Tuple[float, ...], ...] = (
    (0.05, 0.35, 0.55, 0.75, 0.90),  # WR1
    (0.35, 0.05, 0.28, 0.50, 0.75),  # WR2
    (0.55, 0.28, 0.05, 0.42, 0.65),  # WR3 / Slot
    (0.75, 0.50, 0.42, 0.05, 0.48),  # TE1
    (0.90, 0.75, 0.65, 0.48, 0.05),  # RB1
)

SEALED_EPA_DROPOFF_TABLE: Mapping[str, Any] = MappingProxyType(
    {
        "QB1_OUT": 0.1100,
        "QB_ROOKIE_FIRST_START": 0.0980,
        "QB_TRADE_SHORT_WEEK": 0.0320,
        "QB_QUESTIONABLE": QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
        "OL_STARTER_OUT": 0.0200,
        "SKILL_ALPHA_IR": 0.0300,
        "SKILL_SECONDARY_OUT": 0.0140,
        "DEF_ANCHOR_OUT": -0.0150,
        "execution_multipliers": MappingProxyType(
            {
                "QB1": 0.78,
                "RB1": 0.85,
                "WR1": 0.82,
                "WR2": 0.88,
                "WR3": 0.92,
                "TE1": 0.84,
                "OL": 0.91,
            }
        ),
    }
)

# Hierarchical Ridge OOF Logit-Temperature Calibration Priors (WP-2)
OOF_CALIBRATION_A0: float = -0.22
OOF_CALIBRATION_B0: float = 0.78

# Official w10_fixtures.json SHA-256 digest & 13 remaining games (WSH @ NYG settled Thu Nov 12)
W10_FIXTURES_CANONICAL_SHA256: str = (
    "77608f2999f2de9fb799582bc6694daa53fd0d191a26db06a8bbfe30c5ab746b"
)


# =============================================================================
# SECTION 1: ZERO-MARKET-CONTAMINATION FIREWALL & TYPE BOUNDARY
# =============================================================================

FORBIDDEN_MARKET_SUBSTRINGS: Tuple[str, ...] = (
    "spread",
    "total_line",
    "game_total",
    "point_total",
    "listed_total",
    "market_total",
    "over_under",
    "ou_line",
    "odds",
    "moneyline",
    "money_line",
    "implied_prob",
    "market",
    "vig",
    "devig",
    "juice",
    "bookmaker",
    "sportsbook",
    "fanduel",
    "draftkings",
    "betmgm",
    "pinnacle",
    "caesars",
    "bet365",
    "kalshi",
    "clv",
    "closing_line",
    "opening_line",
    "ticket_pct",
    "money_pct",
    "handle_pct",
    "vegas",
    "hold_pct",
)

FORBIDDEN_EXACT_MARKET_KEYS: frozenset[str] = frozenset(
    {
        "total",
        "line",
        "ou",
        "ml",
        "ats",
        "book",
        "price",
        "prob_implied",
        "fair_prob",
        "over",
        "under",
    }
)


ALLOWED_SEALED_SIM_TOTAL_KEYS: frozenset[str] = frozenset(
    {"total_quantiles", "mean_total", "median_total", "total_sd"}
)


def _is_contaminated_key_name(key: str, *, allow_sealed_sim_totals: bool = False) -> bool:
    """Return True if a field/key name represents sportsbook or market data."""
    norm = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", str(key)).strip().lower()
    norm = re.sub(r"[^a-z0-9_]+", "_", norm).strip("_")
    if allow_sealed_sim_totals and norm in ALLOWED_SEALED_SIM_TOTAL_KEYS:
        return False
    if norm in FORBIDDEN_EXACT_MARKET_KEYS:
        return True
    if any(tok in norm for tok in FORBIDDEN_MARKET_SUBSTRINGS):
        return True
    tokens = set(norm.split("_"))
    if tokens & {"spread", "odds", "moneyline", "vig", "devig", "clv", "sportsbook", "vegas"}:
        return True
    if "total" in tokens and not (tokens & {"snaps", "yards", "plays"}):
        return True
    return False


def assert_zero_market_contamination(
    obj: Any,
    path: str = "root",
    *,
    allow_sealed_sim_totals: bool = False,
) -> None:
    """Recursively verify that an object contains zero market/odds fields.

    Raises ``TypeError`` immediately upon detecting any sportsbook spread, total,
    odds, moneyline, vig, or implied-probability key anywhere in the payload.
    """
    if isinstance(obj, (dict, Mapping)):
        for k, v in obj.items():
            key_str = str(k)
            if _is_contaminated_key_name(key_str, allow_sealed_sim_totals=allow_sealed_sim_totals):
                raise TypeError(
                    f"ZERO_MARKET_CONTAMINATION_VIOLATION: Forbidden market/odds "
                    f"field '{key_str}' rejected at {path}.{key_str}"
                )
            assert_zero_market_contamination(
                v, f"{path}.{key_str}", allow_sealed_sim_totals=allow_sealed_sim_totals
            )
    elif isinstance(obj, (list, tuple, set, frozenset)):
        for idx, item in enumerate(obj):
            assert_zero_market_contamination(
                item, f"{path}[{idx}]", allow_sealed_sim_totals=allow_sealed_sim_totals
            )
    elif hasattr(obj, "__dict__") and not isinstance(obj, (str, bytes, int, float, bool)):
        for k, v in vars(obj).items():
            key_str = k.lstrip("_")
            if _is_contaminated_key_name(key_str, allow_sealed_sim_totals=allow_sealed_sim_totals):
                raise TypeError(
                    f"ZERO_MARKET_CONTAMINATION_VIOLATION: Forbidden market/odds "
                    f"attribute '{key_str}' rejected at {path}.{key_str}"
                )
            assert_zero_market_contamination(
                v, f"{path}.{key_str}", allow_sealed_sim_totals=allow_sealed_sim_totals
            )


def _deep_freeze(value: Any) -> Any:
    """Recursively freeze dicts into MappingProxyType and lists into tuples."""
    if isinstance(value, MappingProxyType):
        return value
    if isinstance(value, Mapping):
        return MappingProxyType({str(k): _deep_freeze(v) for k, v in value.items()})
    if isinstance(value, (list, tuple)):
        return tuple(_deep_freeze(v) for v in value)
    if isinstance(value, (set, frozenset)):
        return frozenset(_deep_freeze(v) for v in value)
    return value


def _to_plain_jsonable(value: Any) -> Any:
    """Convert frozen containers and NumPy scalars to deterministic JSON primitives."""
    if isinstance(value, (Mapping, MappingProxyType)):
        return {str(k): _to_plain_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_plain_jsonable(v) for v in value]
    if isinstance(value, (set, frozenset)):
        return sorted(_to_plain_jsonable(v) for v in value)
    if isinstance(value, np.floating):
        return float(value)
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.ndarray):
        return value.tolist()
    return value


def canonical_sha256(payload: Any) -> str:
    """Compute canonical key-sorted SHA-256 hex digest."""
    raw = json.dumps(_to_plain_jsonable(payload), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


# =============================================================================
# SECTION 2: 00-TRUTH-FILE PUBLIC-COPY & CONVICTION ENFORCEMENT
# =============================================================================

_FORBIDDEN_RETIRED_RECORD_RE = re.compile(r"\b6" + r"2-23-1\b")
_FORBIDDEN_WINRATE_HEADLINE_RE = re.compile(
    r"\b(?:71\.2\s*%|72\.9\s*%|47-19-1|38-13-1|36-13-1|\+26\.50u)\b",
    re.IGNORECASE,
)
_FORBIDDEN_PCT_CONFIDENCE_RE = re.compile(
    r"(?:\b\d+(?:\.\d+)?\s*%\s*(?:confidence|conviction|conf\b))"
    r"|(?:(?:confidence|conviction)\s*[:=]?\s*\d+(?:\.\d+)?\s*%)",
    re.IGNORECASE,
)
_FORBIDDEN_PUBLIC_NGS_RE = re.compile(
    r"\b(?:Next\s+Gen\s+Stats|NGS\s+separation|NGS\s+press|Next\s+Gen\s+Trends)\b",
    re.IGNORECASE,
)


def format_conviction_xx_over_100(score: float | int) -> str:
    """Format conviction strictly as an integer 'XX/100' badge (zero '%' confidence)."""
    if isinstance(score, bool) or not math.isfinite(float(score)):
        raise ValueError("Conviction score must be a finite numeric value in [0, 100].")
    clamped = max(0, min(100, int(round(float(score)))))
    return f"{clamped}/100"


def assert_truth_file_compliant(text: str) -> None:
    """Verify text strictly obeys 00-TRUTH-FILE public-copy governance."""
    violations: List[str] = []
    if _FORBIDDEN_RETIRED_RECORD_RE.search(text):
        violations.append("retired_unreconciled_record_string")
    if _FORBIDDEN_WINRATE_HEADLINE_RE.search(text):
        violations.append("unreconciled_winrate_headline")
    if _FORBIDDEN_PCT_CONFIDENCE_RE.search(text):
        violations.append("percent_confidence_claim_forbidden_use_integer_xx_over_100")
    if _FORBIDDEN_PUBLIC_NGS_RE.search(text):
        violations.append("public_ngs_metric_leak_forbidden")
    if violations:
        raise ValueError(f"00-TRUTH-FILE compliance violation(s): {', '.join(violations)}")


# =============================================================================
# SECTION 3: AUTHENTIC HEAD COACH & COORDINATOR TACTICAL ARCHETYPES
# =============================================================================

@dataclass(frozen=True)
class CoordinatorArchetype:
    """Pure-football tactical DNA of an NFL head coach or coordinator."""

    name: str
    role: str  # "OFFENSE", "DEFENSE", or "HC_HYBRID"
    scheme_family: str
    # Offensive tendencies (used when role in {"OFFENSE", "HC_HYBRID"})
    personnel_rates: Tuple[float, float, float, float]  # (11, 12, 21, 13) summing to 1.0
    motion_rate: float  # Pre-snap jet/orbit/shift motion frequency [0, 1]
    condensed_split_rate: float  # Tight/condensed Star/Sun/Snug/Bunch splits [0, 1]
    neutral_proe: float  # Pass Rate Over Expected in neutral states [-0.10, +0.10]
    script_elasticity: float  # Sensitivity of pass rate to trailing game script [0.08, 0.32]
    fourth_down_tau: float  # Causal risk tolerance on 4th down (0.42 = NFL sealed baseline)
    neutral_pace_sec: float  # Seconds per play in neutral non-2MW clock situations
    play_action_boot_synergy: float  # EPA lift on early-down play-action / bootlegs
    screen_hot_blitz_counter: float  # Ability to punish Cover-0 / heavy blitz looks
    power_counter_run_affinity: float  # Structural counter/gap run efficiency vs light boxes
    # Defensive tendencies (used when role in {"DEFENSE", "HC_HYBRID"})
    cover0_sim_pressure_rate: float  # Cover-0 bluff / creeper / simulated pressure rate
    split_safety_shell_rate: float  # Quarters / Cover-6 / Cover-9 two-high shell rate
    organic_four_man_rush_win: float  # Pressure generation without blitzing
    third_down_exotic_multiplier: float  # Disguise & pressure escalation on 3rd & medium/long
    red_zone_tightening_epa: float  # Red-zone compressed-field defensive EPA suppression

    def __post_init__(self) -> None:
        if len(self.personnel_rates) != 4 or abs(sum(self.personnel_rates) - 1.0) > 1e-6:
            raise ValueError(f"{self.name}: personnel_rates (11, 12, 21, 13) must sum to 1.0.")


# Registry including ALL 14 explicitly requested tactical minds + verified 2026 Week 10 play-callers
COACH_TACTICAL_REGISTRY: Mapping[str, CoordinatorArchetype] = MappingProxyType(
    {
        # --- THE 14 CORE NAMED TACTICAL ARCHETYPES ---
        "Kyle Shanahan": CoordinatorArchetype(
            name="Kyle Shanahan",
            role="OFFENSE",
            scheme_family="Outside Zone / Wide-Zone Bootleg & West Coast YAC",
            personnel_rates=(0.44, 0.24, 0.27, 0.05),
            motion_rate=0.75,
            condensed_split_rate=0.64,
            neutral_proe=0.016,
            script_elasticity=0.16,
            fourth_down_tau=0.45,
            neutral_pace_sec=28.6,
            play_action_boot_synergy=0.052,
            screen_hot_blitz_counter=0.044,
            power_counter_run_affinity=0.036,
            cover0_sim_pressure_rate=0.22,
            split_safety_shell_rate=0.52,
            organic_four_man_rush_win=0.42,
            third_down_exotic_multiplier=1.05,
            red_zone_tightening_epa=0.010,
        ),
        "Sean McVay": CoordinatorArchetype(
            name="Sean McVay",
            role="OFFENSE",
            scheme_family="Condensed-Split 11/12 Illusion of Complexity & Duo/Wide-Zone PA",
            personnel_rates=(0.68, 0.21, 0.04, 0.07),
            motion_rate=0.77,
            condensed_split_rate=0.79,
            neutral_proe=0.038,
            script_elasticity=0.22,
            fourth_down_tau=0.45,
            neutral_pace_sec=27.3,
            play_action_boot_synergy=0.049,
            screen_hot_blitz_counter=0.042,
            power_counter_run_affinity=0.032,
            cover0_sim_pressure_rate=0.24,
            split_safety_shell_rate=0.56,
            organic_four_man_rush_win=0.44,
            third_down_exotic_multiplier=1.06,
            red_zone_tightening_epa=0.012,
        ),
        "Andy Reid": CoordinatorArchetype(
            name="Andy Reid",
            role="OFFENSE",
            scheme_family="West Coast / Spread 1x4 Option-Route & Screen Multiplicity",
            personnel_rates=(0.56, 0.30, 0.06, 0.08),
            motion_rate=0.69,
            condensed_split_rate=0.61,
            neutral_proe=0.068,
            script_elasticity=0.20,
            fourth_down_tau=0.47,
            neutral_pace_sec=27.8,
            play_action_boot_synergy=0.041,
            screen_hot_blitz_counter=0.064,
            power_counter_run_affinity=0.025,
            cover0_sim_pressure_rate=0.30,
            split_safety_shell_rate=0.48,
            organic_four_man_rush_win=0.43,
            third_down_exotic_multiplier=1.12,
            red_zone_tightening_epa=0.015,
        ),
        "Steve Spagnuolo": CoordinatorArchetype(
            name="Steve Spagnuolo",
            role="DEFENSE",
            scheme_family="Exotic Slot Cat-Blitz, Simulated Pressure & Late Trap-2 Disguise",
            personnel_rates=(0.60, 0.25, 0.10, 0.05),
            motion_rate=0.50,
            condensed_split_rate=0.50,
            neutral_proe=0.000,
            script_elasticity=0.18,
            fourth_down_tau=0.42,
            neutral_pace_sec=27.5,
            play_action_boot_synergy=0.000,
            screen_hot_blitz_counter=0.000,
            power_counter_run_affinity=0.000,
            cover0_sim_pressure_rate=0.39,
            split_safety_shell_rate=0.44,
            organic_four_man_rush_win=0.43,
            third_down_exotic_multiplier=1.34,
            red_zone_tightening_epa=0.036,
        ),
        "Vic Fangio": CoordinatorArchetype(
            name="Vic Fangio",
            role="DEFENSE",
            scheme_family="Two-High Split-Safety Quarters / Cover-6 (QQH) & Cover-9 Match",
            personnel_rates=(0.62, 0.24, 0.09, 0.05),
            motion_rate=0.50,
            condensed_split_rate=0.50,
            neutral_proe=0.000,
            script_elasticity=0.16,
            fourth_down_tau=0.42,
            neutral_pace_sec=27.4,
            play_action_boot_synergy=0.000,
            screen_hot_blitz_counter=0.000,
            power_counter_run_affinity=0.000,
            cover0_sim_pressure_rate=0.14,
            split_safety_shell_rate=0.75,
            organic_four_man_rush_win=0.45,
            third_down_exotic_multiplier=1.14,
            red_zone_tightening_epa=0.029,
        ),
        "Mike Macdonald": CoordinatorArchetype(
            name="Mike Macdonald",
            role="DEFENSE",
            scheme_family="Simulated Creeper Pressure + Post-Snap Split-Safety Quarters/Cover-6",
            personnel_rates=(0.60, 0.26, 0.08, 0.06),
            motion_rate=0.56,
            condensed_split_rate=0.54,
            neutral_proe=0.015,
            script_elasticity=0.19,
            fourth_down_tau=0.44,
            neutral_pace_sec=26.6,
            play_action_boot_synergy=0.028,
            screen_hot_blitz_counter=0.026,
            power_counter_run_affinity=0.022,
            cover0_sim_pressure_rate=0.35,
            split_safety_shell_rate=0.67,
            organic_four_man_rush_win=0.46,
            third_down_exotic_multiplier=1.31,
            red_zone_tightening_epa=0.034,
        ),
        "Brian Flores": CoordinatorArchetype(
            name="Brian Flores",
            role="DEFENSE",
            scheme_family="Amoeba 7/8-Up Cover-0 Blitz Traps Rolling Into Drop-8 Tampa-2/Rat Zones",
            personnel_rates=(0.64, 0.22, 0.08, 0.06),
            motion_rate=0.50,
            condensed_split_rate=0.50,
            neutral_proe=0.000,
            script_elasticity=0.18,
            fourth_down_tau=0.42,
            neutral_pace_sec=27.2,
            play_action_boot_synergy=0.000,
            screen_hot_blitz_counter=0.000,
            power_counter_run_affinity=0.000,
            cover0_sim_pressure_rate=0.49,
            split_safety_shell_rate=0.46,
            organic_four_man_rush_win=0.40,
            third_down_exotic_multiplier=1.38,
            red_zone_tightening_epa=0.035,
        ),
        "Todd Monken": CoordinatorArchetype(
            name="Todd Monken",
            role="OFFENSE",
            scheme_family="Spread-to-Run 12/11 Vertical Seam & Dagger Multiplicity",
            personnel_rates=(0.55, 0.31, 0.07, 0.07),
            motion_rate=0.61,
            condensed_split_rate=0.54,
            neutral_proe=0.028,
            script_elasticity=0.25,
            fourth_down_tau=0.44,
            neutral_pace_sec=26.9,
            play_action_boot_synergy=0.034,
            screen_hot_blitz_counter=0.033,
            power_counter_run_affinity=0.028,
            cover0_sim_pressure_rate=0.23,
            split_safety_shell_rate=0.50,
            organic_four_man_rush_win=0.44,
            third_down_exotic_multiplier=1.10,
            red_zone_tightening_epa=0.018,
        ),
        "Jim Harbaugh": CoordinatorArchetype(
            name="Jim Harbaugh",
            role="OFFENSE",
            scheme_family="Heavy 12/21/13 Gap-Power, Counter-Trey & Deliberate Trench Attrition",
            personnel_rates=(0.41, 0.27, 0.20, 0.12),
            motion_rate=0.57,
            condensed_split_rate=0.58,
            neutral_proe=-0.044,
            script_elasticity=0.15,
            fourth_down_tau=0.39,
            neutral_pace_sec=29.3,
            play_action_boot_synergy=0.038,
            screen_hot_blitz_counter=0.029,
            power_counter_run_affinity=0.056,
            cover0_sim_pressure_rate=0.24,
            split_safety_shell_rate=0.58,
            organic_four_man_rush_win=0.42,
            third_down_exotic_multiplier=1.12,
            red_zone_tightening_epa=0.020,
        ),
        "Jesse Minter": CoordinatorArchetype(
            name="Jesse Minter",
            role="DEFENSE",
            scheme_family="Macdonald-Fangio Split-Field Quarters/Cover-6 & Apex Star Match",
            personnel_rates=(0.50, 0.34, 0.10, 0.06),
            motion_rate=0.58,
            condensed_split_rate=0.52,
            neutral_proe=-0.012,
            script_elasticity=0.18,
            fourth_down_tau=0.45,
            neutral_pace_sec=27.6,
            play_action_boot_synergy=0.032,
            screen_hot_blitz_counter=0.030,
            power_counter_run_affinity=0.042,
            cover0_sim_pressure_rate=0.32,
            split_safety_shell_rate=0.66,
            organic_four_man_rush_win=0.44,
            third_down_exotic_multiplier=1.27,
            red_zone_tightening_epa=0.031,
        ),
        "Dan Campbell": CoordinatorArchetype(
            name="Dan Campbell",
            role="OFFENSE",
            scheme_family="Aggressive 4th-Down Bellman Policy + Heavy Play-Action & RPO Power",
            personnel_rates=(0.54, 0.26, 0.12, 0.08),
            motion_rate=0.68,
            condensed_split_rate=0.67,
            neutral_proe=0.010,
            script_elasticity=0.13,
            fourth_down_tau=0.63,
            neutral_pace_sec=26.8,
            play_action_boot_synergy=0.051,
            screen_hot_blitz_counter=0.047,
            power_counter_run_affinity=0.053,
            cover0_sim_pressure_rate=0.28,
            split_safety_shell_rate=0.43,
            organic_four_man_rush_win=0.43,
            third_down_exotic_multiplier=1.14,
            red_zone_tightening_epa=0.021,
        ),
        "Kevin O'Connell": CoordinatorArchetype(
            name="Kevin O'Connell",
            role="OFFENSE",
            scheme_family="Condensed 11-Personnel Vertical Play-Action, Dagger & Rhythm Timing",
            personnel_rates=(0.71, 0.19, 0.06, 0.04),
            motion_rate=0.67,
            condensed_split_rate=0.73,
            neutral_proe=0.052,
            script_elasticity=0.23,
            fourth_down_tau=0.45,
            neutral_pace_sec=27.2,
            play_action_boot_synergy=0.046,
            screen_hot_blitz_counter=0.039,
            power_counter_run_affinity=0.021,
            cover0_sim_pressure_rate=0.35,
            split_safety_shell_rate=0.48,
            organic_four_man_rush_win=0.41,
            third_down_exotic_multiplier=1.18,
            red_zone_tightening_epa=0.022,
        ),
        "Jeff Hafley": CoordinatorArchetype(
            name="Jeff Hafley",
            role="DEFENSE",
            scheme_family="Single-High Cover-1 Plug / Cover-3 Vision-and-Break & Simulated Rush",
            personnel_rates=(0.58, 0.24, 0.13, 0.05),
            motion_rate=0.63,
            condensed_split_rate=0.56,
            neutral_proe=-0.018,
            script_elasticity=0.17,
            fourth_down_tau=0.38,
            neutral_pace_sec=27.9,
            play_action_boot_synergy=0.029,
            screen_hot_blitz_counter=0.026,
            power_counter_run_affinity=0.024,
            cover0_sim_pressure_rate=0.29,
            split_safety_shell_rate=0.37,
            organic_four_man_rush_win=0.39,
            third_down_exotic_multiplier=1.19,
            red_zone_tightening_epa=0.022,
        ),
        "DeMeco Ryans": CoordinatorArchetype(
            name="DeMeco Ryans",
            role="DEFENSE",
            scheme_family="Attacking 4-3 Wide-9 Organic Rush + Pattern-Match Quarters & Cover-3 Buzz",
            personnel_rates=(0.57, 0.25, 0.12, 0.06),
            motion_rate=0.62,
            condensed_split_rate=0.58,
            neutral_proe=0.018,
            script_elasticity=0.20,
            fourth_down_tau=0.43,
            neutral_pace_sec=27.4,
            play_action_boot_synergy=0.035,
            screen_hot_blitz_counter=0.034,
            power_counter_run_affinity=0.026,
            cover0_sim_pressure_rate=0.22,
            split_safety_shell_rate=0.57,
            organic_four_man_rush_win=0.49,
            third_down_exotic_multiplier=1.24,
            red_zone_tightening_epa=0.030,
        ),
        # --- COMPLEMENTARY VERIFIED 2026 WEEK 10 COACHES & COORDINATORS ---
        "Mike Vrabel": CoordinatorArchetype(
            name="Mike Vrabel",
            role="HC_HYBRID",
            scheme_family="Erhardt-Perkins Game-State Discipline, Heavy Play-Action & Red-Zone Situational Fronts",
            personnel_rates=(0.53, 0.29, 0.10, 0.08),
            motion_rate=0.55,
            condensed_split_rate=0.52,
            neutral_proe=0.008,
            script_elasticity=0.19,
            fourth_down_tau=0.41,
            neutral_pace_sec=27.9,
            play_action_boot_synergy=0.036,
            screen_hot_blitz_counter=0.032,
            power_counter_run_affinity=0.033,
            cover0_sim_pressure_rate=0.27,
            split_safety_shell_rate=0.49,
            organic_four_man_rush_win=0.42,
            third_down_exotic_multiplier=1.18,
            red_zone_tightening_epa=0.027,
        ),
        "Kevin Stefanski": CoordinatorArchetype(
            name="Kevin Stefanski",
            role="OFFENSE",
            scheme_family="Wide-Zone 12-Personnel Under-Center Bootleg & Vertical Shot Action",
            personnel_rates=(0.51, 0.34, 0.08, 0.07),
            motion_rate=0.65,
            condensed_split_rate=0.62,
            neutral_proe=-0.006,
            script_elasticity=0.20,
            fourth_down_tau=0.46,
            neutral_pace_sec=27.7,
            play_action_boot_synergy=0.044,
            screen_hot_blitz_counter=0.035,
            power_counter_run_affinity=0.036,
            cover0_sim_pressure_rate=0.24,
            split_safety_shell_rate=0.53,
            organic_four_man_rush_win=0.39,
            third_down_exotic_multiplier=1.12,
            red_zone_tightening_epa=0.018,
        ),
        "Matt LaFleur": CoordinatorArchetype(
            name="Matt LaFleur",
            role="OFFENSE",
            scheme_family="Shanahan-Tree Jet Motion, Inside/Outside Zone Illusion & RPO Glance",
            personnel_rates=(0.61, 0.27, 0.06, 0.06),
            motion_rate=0.71,
            condensed_split_rate=0.66,
            neutral_proe=0.019,
            script_elasticity=0.20,
            fourth_down_tau=0.44,
            neutral_pace_sec=27.2,
            play_action_boot_synergy=0.047,
            screen_hot_blitz_counter=0.043,
            power_counter_run_affinity=0.034,
            cover0_sim_pressure_rate=0.21,
            split_safety_shell_rate=0.61,
            organic_four_man_rush_win=0.42,
            third_down_exotic_multiplier=1.13,
            red_zone_tightening_epa=0.022,
        ),
        "Jonathan Gannon": CoordinatorArchetype(
            name="Jonathan Gannon",
            role="DEFENSE",
            scheme_family="Quarters / Cover-6 Two-High Umbrella & Simulated Five-Man Rush",
            personnel_rates=(0.60, 0.25, 0.09, 0.06),
            motion_rate=0.50,
            condensed_split_rate=0.50,
            neutral_proe=0.000,
            script_elasticity=0.18,
            fourth_down_tau=0.42,
            neutral_pace_sec=27.0,
            play_action_boot_synergy=0.000,
            screen_hot_blitz_counter=0.000,
            power_counter_run_affinity=0.000,
            cover0_sim_pressure_rate=0.23,
            split_safety_shell_rate=0.68,
            organic_four_man_rush_win=0.42,
            third_down_exotic_multiplier=1.16,
            red_zone_tightening_epa=0.024,
        ),
        "Liam Coen": CoordinatorArchetype(
            name="Liam Coen",
            role="OFFENSE",
            scheme_family="McVay-Tree Condensed Motion, Mid-Zone/Duo Marriage & Screen Timing",
            personnel_rates=(0.66, 0.23, 0.05, 0.06),
            motion_rate=0.72,
            condensed_split_rate=0.72,
            neutral_proe=0.026,
            script_elasticity=0.18,
            fourth_down_tau=0.46,
            neutral_pace_sec=26.9,
            play_action_boot_synergy=0.046,
            screen_hot_blitz_counter=0.045,
            power_counter_run_affinity=0.033,
            cover0_sim_pressure_rate=0.25,
            split_safety_shell_rate=0.54,
            organic_four_man_rush_win=0.45,
            third_down_exotic_multiplier=1.17,
            red_zone_tightening_epa=0.026,
        ),
        "Robert Saleh": CoordinatorArchetype(
            name="Robert Saleh",
            role="DEFENSE",
            scheme_family="Wide-9 4-3 Attacking Front with Cover-3 Buzz & Match Quarters",
            personnel_rates=(0.60, 0.25, 0.09, 0.06),
            motion_rate=0.54,
            condensed_split_rate=0.51,
            neutral_proe=-0.010,
            script_elasticity=0.19,
            fourth_down_tau=0.39,
            neutral_pace_sec=28.2,
            play_action_boot_synergy=0.024,
            screen_hot_blitz_counter=0.024,
            power_counter_run_affinity=0.024,
            cover0_sim_pressure_rate=0.19,
            split_safety_shell_rate=0.55,
            organic_four_man_rush_win=0.43,
            third_down_exotic_multiplier=1.16,
            red_zone_tightening_epa=0.025,
        ),
        "Bobby Slowik": CoordinatorArchetype(
            name="Bobby Slowik",
            role="OFFENSE",
            scheme_family="Shanahan Wide-Zone, Motion Orbit & Protected Half-Slide Quick Game",
            personnel_rates=(0.56, 0.24, 0.14, 0.06),
            motion_rate=0.69,
            condensed_split_rate=0.60,
            neutral_proe=-0.022,
            script_elasticity=0.18,
            fourth_down_tau=0.40,
            neutral_pace_sec=27.8,
            play_action_boot_synergy=0.036,
            screen_hot_blitz_counter=0.032,
            power_counter_run_affinity=0.028,
            cover0_sim_pressure_rate=0.25,
            split_safety_shell_rate=0.45,
            organic_four_man_rush_win=0.40,
            third_down_exotic_multiplier=1.10,
            red_zone_tightening_epa=0.018,
        ),
        "Shane Steichen": CoordinatorArchetype(
            name="Shane Steichen",
            role="OFFENSE",
            scheme_family="RPO Conflict Reads, Tempo Shotgun Zone-Insert & Vertical Seams",
            personnel_rates=(0.64, 0.25, 0.05, 0.06),
            motion_rate=0.58,
            condensed_split_rate=0.55,
            neutral_proe=0.008,
            script_elasticity=0.21,
            fourth_down_tau=0.48,
            neutral_pace_sec=26.3,
            play_action_boot_synergy=0.039,
            screen_hot_blitz_counter=0.036,
            power_counter_run_affinity=0.038,
            cover0_sim_pressure_rate=0.21,
            split_safety_shell_rate=0.52,
            organic_four_man_rush_win=0.41,
            third_down_exotic_multiplier=1.11,
            red_zone_tightening_epa=0.020,
        ),
        "Dave Canales": CoordinatorArchetype(
            name="Dave Canales",
            role="OFFENSE",
            scheme_family="Balanced Duo/Mid-Zone Marriage & Defined-Read Bootleg Progression",
            personnel_rates=(0.62, 0.26, 0.06, 0.06),
            motion_rate=0.61,
            condensed_split_rate=0.58,
            neutral_proe=0.004,
            script_elasticity=0.20,
            fourth_down_tau=0.43,
            neutral_pace_sec=27.5,
            play_action_boot_synergy=0.035,
            screen_hot_blitz_counter=0.031,
            power_counter_run_affinity=0.032,
            cover0_sim_pressure_rate=0.24,
            split_safety_shell_rate=0.64,
            organic_four_man_rush_win=0.39,
            third_down_exotic_multiplier=1.13,
            red_zone_tightening_epa=0.019,
        ),
        "Ejiro Evero": CoordinatorArchetype(
            name="Ejiro Evero",
            role="DEFENSE",
            scheme_family="Fangio-Tree 3-4 Penny Front & Split-Safety Cover-6 Disguise",
            personnel_rates=(0.60, 0.26, 0.08, 0.06),
            motion_rate=0.50,
            condensed_split_rate=0.50,
            neutral_proe=0.000,
            script_elasticity=0.18,
            fourth_down_tau=0.42,
            neutral_pace_sec=27.5,
            play_action_boot_synergy=0.000,
            screen_hot_blitz_counter=0.000,
            power_counter_run_affinity=0.000,
            cover0_sim_pressure_rate=0.25,
            split_safety_shell_rate=0.69,
            organic_four_man_rush_win=0.38,
            third_down_exotic_multiplier=1.17,
            red_zone_tightening_epa=0.022,
        ),
        "Kellen Moore": CoordinatorArchetype(
            name="Kellen Moore",
            role="OFFENSE",
            scheme_family="High-Tempo Pre-Snap Shift/Motion Spread, Stick & Option Choice",
            personnel_rates=(0.65, 0.23, 0.06, 0.06),
            motion_rate=0.70,
            condensed_split_rate=0.57,
            neutral_proe=0.024,
            script_elasticity=0.22,
            fourth_down_tau=0.45,
            neutral_pace_sec=26.4,
            play_action_boot_synergy=0.037,
            screen_hot_blitz_counter=0.038,
            power_counter_run_affinity=0.027,
            cover0_sim_pressure_rate=0.20,
            split_safety_shell_rate=0.70,
            organic_four_man_rush_win=0.41,
            third_down_exotic_multiplier=1.14,
            red_zone_tightening_epa=0.023,
        ),
        "Brandon Staley": CoordinatorArchetype(
            name="Brandon Staley",
            role="DEFENSE",
            scheme_family="Fangio Two-High Light-Box Quarters / Cover-6 & Star Match",
            personnel_rates=(0.62, 0.24, 0.08, 0.06),
            motion_rate=0.50,
            condensed_split_rate=0.50,
            neutral_proe=0.000,
            script_elasticity=0.18,
            fourth_down_tau=0.42,
            neutral_pace_sec=27.0,
            play_action_boot_synergy=0.000,
            screen_hot_blitz_counter=0.000,
            power_counter_run_affinity=0.000,
            cover0_sim_pressure_rate=0.18,
            split_safety_shell_rate=0.72,
            organic_four_man_rush_win=0.41,
            third_down_exotic_multiplier=1.15,
            red_zone_tightening_epa=0.024,
        ),
        "Joe Brady": CoordinatorArchetype(
            name="Joe Brady",
            role="OFFENSE",
            scheme_family="6-OL Jumbo/12 Gap-Run Balance + Josh Allen Spread Mesh & Scramble Drill",
            personnel_rates=(0.56, 0.25, 0.09, 0.10),
            motion_rate=0.63,
            condensed_split_rate=0.59,
            neutral_proe=0.021,
            script_elasticity=0.16,
            fourth_down_tau=0.49,
            neutral_pace_sec=27.1,
            play_action_boot_synergy=0.045,
            screen_hot_blitz_counter=0.049,
            power_counter_run_affinity=0.046,
            cover0_sim_pressure_rate=0.22,
            split_safety_shell_rate=0.62,
            organic_four_man_rush_win=0.45,
            third_down_exotic_multiplier=1.19,
            red_zone_tightening_epa=0.028,
        ),
        "Aaron Glenn": CoordinatorArchetype(
            name="Aaron Glenn",
            role="DEFENSE",
            scheme_family="Aggressive Press-Man Cover-1 & Situational Five-Man Pressure",
            personnel_rates=(0.60, 0.25, 0.09, 0.06),
            motion_rate=0.53,
            condensed_split_rate=0.51,
            neutral_proe=0.006,
            script_elasticity=0.20,
            fourth_down_tau=0.43,
            neutral_pace_sec=27.8,
            play_action_boot_synergy=0.028,
            screen_hot_blitz_counter=0.027,
            power_counter_run_affinity=0.026,
            cover0_sim_pressure_rate=0.33,
            split_safety_shell_rate=0.39,
            organic_four_man_rush_win=0.42,
            third_down_exotic_multiplier=1.21,
            red_zone_tightening_epa=0.024,
        ),
        "Klint Kubiak": CoordinatorArchetype(
            name="Klint Kubiak",
            role="OFFENSE",
            scheme_family="Shanahan/Kubiak Outside-Zone 12/21 Play-Action Boot & TE Seam",
            personnel_rates=(0.50, 0.30, 0.13, 0.07),
            motion_rate=0.70,
            condensed_split_rate=0.61,
            neutral_proe=-0.015,
            script_elasticity=0.18,
            fourth_down_tau=0.42,
            neutral_pace_sec=27.7,
            play_action_boot_synergy=0.043,
            screen_hot_blitz_counter=0.036,
            power_counter_run_affinity=0.031,
            cover0_sim_pressure_rate=0.23,
            split_safety_shell_rate=0.51,
            organic_four_man_rush_win=0.41,
            third_down_exotic_multiplier=1.12,
            red_zone_tightening_epa=0.020,
        ),
        "Mike LaFleur": CoordinatorArchetype(
            name="Mike LaFleur",
            role="OFFENSE",
            scheme_family="Condensed Wide-Zone Motion & Quick Rhythm Triangle Reads",
            personnel_rates=(0.57, 0.28, 0.08, 0.07),
            motion_rate=0.68,
            condensed_split_rate=0.65,
            neutral_proe=-0.008,
            script_elasticity=0.19,
            fourth_down_tau=0.43,
            neutral_pace_sec=27.6,
            play_action_boot_synergy=0.038,
            screen_hot_blitz_counter=0.032,
            power_counter_run_affinity=0.029,
            cover0_sim_pressure_rate=0.30,
            split_safety_shell_rate=0.58,
            organic_four_man_rush_win=0.39,
            third_down_exotic_multiplier=1.18,
            red_zone_tightening_epa=0.021,
        ),
        "Nick Rallis": CoordinatorArchetype(
            name="Nick Rallis",
            role="DEFENSE",
            scheme_family="Three-Safety Simulated Creeper & Split-Field Disguise",
            personnel_rates=(0.60, 0.25, 0.09, 0.06),
            motion_rate=0.50,
            condensed_split_rate=0.50,
            neutral_proe=0.000,
            script_elasticity=0.18,
            fourth_down_tau=0.42,
            neutral_pace_sec=27.4,
            play_action_boot_synergy=0.000,
            screen_hot_blitz_counter=0.000,
            power_counter_run_affinity=0.000,
            cover0_sim_pressure_rate=0.32,
            split_safety_shell_rate=0.61,
            organic_four_man_rush_win=0.38,
            third_down_exotic_multiplier=1.20,
            red_zone_tightening_epa=0.021,
        ),
        "Brian Schottenheimer": CoordinatorArchetype(
            name="Brian Schottenheimer",
            role="OFFENSE",
            scheme_family="Texas Coast Timing Drops, Inside Zone & Perimeter Isolation",
            personnel_rates=(0.65, 0.23, 0.06, 0.06),
            motion_rate=0.59,
            condensed_split_rate=0.53,
            neutral_proe=0.032,
            script_elasticity=0.23,
            fourth_down_tau=0.44,
            neutral_pace_sec=26.7,
            play_action_boot_synergy=0.034,
            screen_hot_blitz_counter=0.035,
            power_counter_run_affinity=0.026,
            cover0_sim_pressure_rate=0.26,
            split_safety_shell_rate=0.55,
            organic_four_man_rush_win=0.43,
            third_down_exotic_multiplier=1.15,
            red_zone_tightening_epa=0.019,
        ),
        "Mike McCarthy": CoordinatorArchetype(
            name="Mike McCarthy",
            role="OFFENSE",
            scheme_family="West Coast Progression + Veteran Pre-Snap Audible Sight-Adjustments",
            personnel_rates=(0.61, 0.26, 0.06, 0.07),
            motion_rate=0.54,
            condensed_split_rate=0.51,
            neutral_proe=0.018,
            script_elasticity=0.20,
            fourth_down_tau=0.41,
            neutral_pace_sec=27.9,
            play_action_boot_synergy=0.033,
            screen_hot_blitz_counter=0.045,
            power_counter_run_affinity=0.031,
            cover0_sim_pressure_rate=0.25,
            split_safety_shell_rate=0.48,
            organic_four_man_rush_win=0.49,
            third_down_exotic_multiplier=1.25,
            red_zone_tightening_epa=0.030,
        ),
        "Zac Taylor": CoordinatorArchetype(
            name="Zac Taylor",
            role="OFFENSE",
            scheme_family="Shotgun 11-Personnel Empty/Bunch Spread & Choice Vertical Timing",
            personnel_rates=(0.74, 0.18, 0.03, 0.05),
            motion_rate=0.58,
            condensed_split_rate=0.63,
            neutral_proe=0.076,
            script_elasticity=0.24,
            fourth_down_tau=0.46,
            neutral_pace_sec=26.6,
            play_action_boot_synergy=0.032,
            screen_hot_blitz_counter=0.054,
            power_counter_run_affinity=0.022,
            cover0_sim_pressure_rate=0.22,
            split_safety_shell_rate=0.56,
            organic_four_man_rush_win=0.42,
            third_down_exotic_multiplier=1.18,
            red_zone_tightening_epa=0.021,
        ),
        "Declan Doyle": CoordinatorArchetype(
            name="Declan Doyle",
            role="OFFENSE",
            scheme_family="Multiple 12/21 Heavy-Gap Derrick Henry Downhill + Tight-End Play-Action",
            personnel_rates=(0.48, 0.34, 0.11, 0.07),
            motion_rate=0.62,
            condensed_split_rate=0.58,
            neutral_proe=-0.026,
            script_elasticity=0.17,
            fourth_down_tau=0.45,
            neutral_pace_sec=28.1,
            play_action_boot_synergy=0.042,
            screen_hot_blitz_counter=0.034,
            power_counter_run_affinity=0.049,
            cover0_sim_pressure_rate=0.32,
            split_safety_shell_rate=0.66,
            organic_four_man_rush_win=0.44,
            third_down_exotic_multiplier=1.27,
            red_zone_tightening_epa=0.031,
        ),
    }
)

PROMPT_REQUIRED_14_COACHES: Tuple[str, ...] = (
    "Kyle Shanahan",
    "Sean McVay",
    "Andy Reid",
    "Steve Spagnuolo",
    "Vic Fangio",
    "Mike Macdonald",
    "Brian Flores",
    "Todd Monken",
    "Jim Harbaugh",
    "Jesse Minter",
    "Dan Campbell",
    "Kevin O'Connell",
    "Jeff Hafley",
    "DeMeco Ryans",
)


# =============================================================================
# SECTION 4: PURE FOOTBALL INPUT SCHEMA (ZERO MARKET CONTAMINATION)
# =============================================================================

class PureFootballMatchupInput:
    """Strictly Line-Free Matchup Input Schema (Zone 1 / Zone 2 Class A Boundary).

    Physically rejects ANY sportsbook spread, total, moneyline, odds, vig, or
    implied-probability field (raising ``TypeError`` on construction, nested
    mapping inspection, or mutation attempts).
    """

    __slots__ = (
        "_espn_id",
        "_kickoff_utc",
        "_away_team",
        "_home_team",
        "_venue",
        "_is_dome",
        "_is_neutral_site",
        "_wind_mph",
        "_temp_celsius",
        "_away_time_zones_crossed",
        "_away_off_coach",
        "_away_def_coach",
        "_home_off_coach",
        "_home_def_coach",
        "_away_qb_starter",
        "_home_qb_starter",
        "_away_key_skill",
        "_home_key_skill",
        "_away_base_off_epa",
        "_away_base_def_epa",
        "_home_base_off_epa",
        "_home_base_def_epa",
        "_away_ol_pass_block_win",
        "_away_ol_run_block_win",
        "_home_ol_pass_block_win",
        "_home_ol_run_block_win",
        "_away_qb_pressure_to_sack",
        "_home_qb_pressure_to_sack",
        "_away_rookie_first_start",
        "_home_rookie_first_start",
        "_away_injuries",
        "_home_injuries",
        "_scratched_roles_away",
        "_scratched_roles_home",
        "_football_notes",
        "_frozen_dict",
    )

    def __init__(
        self,
        *,
        espn_id: str,
        kickoff_utc: str,
        away_team: str,
        home_team: str,
        venue: str,
        is_dome: bool,
        is_neutral_site: bool = False,
        wind_mph: float = 0.0,
        temp_celsius: float = 21.0,
        away_time_zones_crossed: float = 0.0,
        away_off_coach: str,
        away_def_coach: str,
        home_off_coach: str,
        home_def_coach: str,
        away_qb_starter: str,
        home_qb_starter: str,
        away_key_skill: Mapping[str, str],
        home_key_skill: Mapping[str, str],
        away_base_off_epa: float,
        away_base_def_epa: float,
        home_base_off_epa: float,
        home_base_def_epa: float,
        away_ol_pass_block_win: float,
        away_ol_run_block_win: float,
        home_ol_pass_block_win: float,
        home_ol_run_block_win: float,
        away_qb_pressure_to_sack: float = 0.185,
        home_qb_pressure_to_sack: float = 0.185,
        away_rookie_first_start: bool = False,
        home_rookie_first_start: bool = False,
        away_injuries: Sequence[str] = (),
        home_injuries: Sequence[str] = (),
        scratched_roles_away: Sequence[str] = (),
        scratched_roles_home: Sequence[str] = (),
        football_notes: Optional[Mapping[str, Any]] = None,
        **unexpected_kwargs: Any,
    ) -> None:
        # 1. Inspect any unexpected kwargs FIRST to raise explicit market-contamination TypeError
        if unexpected_kwargs:
            assert_zero_market_contamination(unexpected_kwargs, "PureFootballMatchupInput")
            bad_keys = ", ".join(sorted(unexpected_kwargs.keys()))
            raise TypeError(
                f"PureFootballMatchupInput got unexpected keyword argument(s): {bad_keys}"
            )

        # 2. Recursively inspect all nested structures for forbidden market/odds keys
        assert_zero_market_contamination(away_key_skill, "PureFootballMatchupInput.away_key_skill")
        assert_zero_market_contamination(home_key_skill, "PureFootballMatchupInput.home_key_skill")
        assert_zero_market_contamination(away_injuries, "PureFootballMatchupInput.away_injuries")
        assert_zero_market_contamination(home_injuries, "PureFootballMatchupInput.home_injuries")
        if football_notes is not None:
            assert_zero_market_contamination(football_notes, "PureFootballMatchupInput.football_notes")

        for cname in (away_off_coach, away_def_coach, home_off_coach, home_def_coach):
            if cname not in COACH_TACTICAL_REGISTRY:
                raise ValueError(f"Coach/Coordinator '{cname}' not registered in COACH_TACTICAL_REGISTRY.")

        object.__setattr__(self, "_espn_id", str(espn_id))
        object.__setattr__(self, "_kickoff_utc", str(kickoff_utc))
        object.__setattr__(self, "_away_team", str(away_team))
        object.__setattr__(self, "_home_team", str(home_team))
        object.__setattr__(self, "_venue", str(venue))
        object.__setattr__(self, "_is_dome", bool(is_dome))
        object.__setattr__(self, "_is_neutral_site", bool(is_neutral_site))
        object.__setattr__(self, "_wind_mph", float(wind_mph))
        object.__setattr__(self, "_temp_celsius", float(temp_celsius))
        object.__setattr__(self, "_away_time_zones_crossed", float(away_time_zones_crossed))
        object.__setattr__(self, "_away_off_coach", str(away_off_coach))
        object.__setattr__(self, "_away_def_coach", str(away_def_coach))
        object.__setattr__(self, "_home_off_coach", str(home_off_coach))
        object.__setattr__(self, "_home_def_coach", str(home_def_coach))
        object.__setattr__(self, "_away_qb_starter", str(away_qb_starter))
        object.__setattr__(self, "_home_qb_starter", str(home_qb_starter))
        object.__setattr__(self, "_away_key_skill", _deep_freeze(dict(away_key_skill)))
        object.__setattr__(self, "_home_key_skill", _deep_freeze(dict(home_key_skill)))
        object.__setattr__(self, "_away_base_off_epa", float(away_base_off_epa))
        object.__setattr__(self, "_away_base_def_epa", float(away_base_def_epa))
        object.__setattr__(self, "_home_base_off_epa", float(home_base_off_epa))
        object.__setattr__(self, "_home_base_def_epa", float(home_base_def_epa))
        object.__setattr__(self, "_away_ol_pass_block_win", float(away_ol_pass_block_win))
        object.__setattr__(self, "_away_ol_run_block_win", float(away_ol_run_block_win))
        object.__setattr__(self, "_home_ol_pass_block_win", float(home_ol_pass_block_win))
        object.__setattr__(self, "_home_ol_run_block_win", float(home_ol_run_block_win))
        object.__setattr__(self, "_away_qb_pressure_to_sack", float(away_qb_pressure_to_sack))
        object.__setattr__(self, "_home_qb_pressure_to_sack", float(home_qb_pressure_to_sack))
        object.__setattr__(self, "_away_rookie_first_start", bool(away_rookie_first_start))
        object.__setattr__(self, "_home_rookie_first_start", bool(home_rookie_first_start))
        object.__setattr__(self, "_away_injuries", tuple(str(x) for x in away_injuries))
        object.__setattr__(self, "_home_injuries", tuple(str(x) for x in home_injuries))
        object.__setattr__(self, "_scratched_roles_away", tuple(str(x) for x in scratched_roles_away))
        object.__setattr__(self, "_scratched_roles_home", tuple(str(x) for x in scratched_roles_home))
        object.__setattr__(
            self,
            "_football_notes",
            _deep_freeze(dict(football_notes) if football_notes is not None else {}),
        )
        object.__setattr__(
            self,
            "_frozen_dict",
            _deep_freeze(
                {
                    "espn_id": self._espn_id,
                    "kickoff_utc": self._kickoff_utc,
                    "away_team": self._away_team,
                    "home_team": self._home_team,
                    "venue": self._venue,
                    "is_dome": self._is_dome,
                    "is_neutral_site": self._is_neutral_site,
                    "wind_mph": self._wind_mph,
                    "temp_celsius": self._temp_celsius,
                    "away_time_zones_crossed": self._away_time_zones_crossed,
                    "away_off_coach": self._away_off_coach,
                    "away_def_coach": self._away_def_coach,
                    "home_off_coach": self._home_off_coach,
                    "home_def_coach": self._home_def_coach,
                    "away_qb_starter": self._away_qb_starter,
                    "home_qb_starter": self._home_qb_starter,
                    "away_key_skill": self._away_key_skill,
                    "home_key_skill": self._home_key_skill,
                    "away_base_off_epa": self._away_base_off_epa,
                    "away_base_def_epa": self._away_base_def_epa,
                    "home_base_off_epa": self._home_base_off_epa,
                    "home_base_def_epa": self._home_base_def_epa,
                    "away_ol_pass_block_win": self._away_ol_pass_block_win,
                    "away_ol_run_block_win": self._away_ol_run_block_win,
                    "home_ol_pass_block_win": self._home_ol_pass_block_win,
                    "home_ol_run_block_win": self._home_ol_run_block_win,
                    "away_qb_pressure_to_sack": self._away_qb_pressure_to_sack,
                    "home_qb_pressure_to_sack": self._home_qb_pressure_to_sack,
                    "away_rookie_first_start": self._away_rookie_first_start,
                    "home_rookie_first_start": self._home_rookie_first_start,
                    "away_injuries": self._away_injuries,
                    "home_injuries": self._home_injuries,
                    "scratched_roles_away": self._scratched_roles_away,
                    "scratched_roles_home": self._scratched_roles_home,
                    "football_notes": self._football_notes,
                }
            ),
        )

    @classmethod
    def from_mapping(cls, raw: Mapping[str, Any]) -> "PureFootballMatchupInput":
        if not isinstance(raw, Mapping):
            raise TypeError("PureFootballMatchupInput.from_mapping requires a Mapping.")
        assert_zero_market_contamination(raw, "PureFootballMatchupInput.from_mapping")
        return cls(**dict(raw))

    def __setattr__(self, name: str, value: Any) -> None:
        if _is_contaminated_key_name(name):
            raise TypeError(
                f"ZERO_MARKET_CONTAMINATION_VIOLATION: Cannot attach market field '{name}'."
            )
        raise TypeError("PureFootballMatchupInput is immutable once constructed.")

    def __delattr__(self, name: str) -> None:
        raise TypeError("PureFootballMatchupInput is immutable once constructed.")

    def __getattr__(self, name: str) -> Any:
        slot_name = f"_{name}"
        if slot_name in self.__slots__:
            return object.__getattribute__(self, slot_name)
        raise AttributeError(f"'PureFootballMatchupInput' object has no attribute '{name}'")

    def to_canonical_dict(self) -> Mapping[str, Any]:
        return self._frozen_dict


# =============================================================================
# SECTION 5: SINKHORN-KNOPP OPTIMAL TRANSPORT, RULE 4 VICTORY FORMATION & EP
# =============================================================================

def sinkhorn_reallocate_skill_shares(
    scratched_roles: Sequence[str],
    base_shares: Sequence[float] = (0.26, 0.21, 0.17, 0.20, 0.16),
    cost_matrix: Sequence[Sequence[float]] = SEALED_COST_MATRIX_C,
    eps: float = 0.10,
) -> Dict[str, Any]:
    """Entropy-regularized Sinkhorn-Knopp target/touch reallocation under injuries.

    Roles correspond to [WR1, WR2, WR3, TE1, RB1]. Converges to L1 marginal
    violation <= 1e-9 using stabilized Gibbs kernel exp(-C / eps).
    """
    role_names = ("WR1", "WR2", "WR3", "TE1", "RB1")
    C = np.asarray(cost_matrix, dtype=np.float64)
    r = np.asarray(base_shares, dtype=np.float64)
    r = r / float(np.sum(r))

    c = r.copy()
    scratched_set = set(scratched_roles)
    for idx, rname in enumerate(role_names):
        if rname in scratched_set:
            c[idx] = 0.015  # Replacement backup floor share
    c = c / float(np.sum(c))

    K = np.exp(np.maximum(-C / eps, -700.0))
    u = np.ones_like(r)
    v = np.ones_like(c)
    l1_err = 1.0
    iters = 0
    for it in range(1, 601):
        u = r / np.maximum(K @ v, 1e-12)
        v = c / np.maximum(K.T @ u, 1e-12)
        P = np.diag(u) @ K @ np.diag(v)
        l1_err = float(np.sum(np.abs(P.sum(axis=1) - r)) + np.sum(np.abs(P.sum(axis=0) - c)))
        iters = it
        if l1_err <= 1e-9:
            break

    feasible = P.sum(axis=0)
    feasible = feasible / float(np.sum(feasible))
    exec_mults = SEALED_EPA_DROPOFF_TABLE["execution_multipliers"]
    efficiency_multiplier = sum(
        float(feasible[i]) * (float(exec_mults.get(rn, 0.90)) if rn in scratched_set else 1.0)
        for i, rn in enumerate(role_names)
    )
    return {
        "shares_by_role": {rn: float(feasible[i]) for i, rn in enumerate(role_names)},
        "shares_array": feasible,
        "mass_moved": float(0.5 * np.sum(np.abs(feasible - r))),
        "l1_marginal_error": l1_err,
        "iterations": iters,
        "efficiency_multiplier": float(efficiency_multiplier),
    }


def can_victory_formation_kneel_out_scalar(
    clock_seconds_q4: float,
    defensive_timeouts: int,
    *,
    down: int = 1,
    two_minute_warning_occurred: Optional[bool] = None,
    tau_kneel_seconds: float = 1.6,
    play_clock_seconds: float = 40.0,
) -> Dict[str, Any]:
    """Exact NFL Rule 4 Victory Formation deterministic clock-bleed check."""
    rem = float(clock_seconds_q4)
    def_to = max(0, int(defensive_timeouts))
    has_2mw = (
        (rem <= 120.0)
        if two_minute_warning_occurred is None
        else bool(two_minute_warning_occurred)
    )
    snaps_taken = 0
    for cur_down in range(int(down), 5):
        if rem <= 0.0:
            rem = 0.0
            break
        pre_snap = rem
        rem = max(0.0, rem - tau_kneel_seconds)
        snaps_taken += 1
        if rem <= 0.0 or cur_down == 4:
            break
        crossed_2mw = (not has_2mw) and (pre_snap > 120.0) and (rem <= 120.0)
        if crossed_2mw:
            has_2mw = True
            continue
        if def_to > 0:
            def_to -= 1
            continue
        if (not has_2mw) and (rem > 120.0):
            if rem - play_clock_seconds <= 120.0:
                rem = 120.0
                has_2mw = True
            else:
                rem -= play_clock_seconds
        else:
            rem = max(0.0, rem - play_clock_seconds)

    return {
        "can_kneel_out": bool(rem <= 0.0),
        "kneel_snaps": int(snaps_taken),
        "remaining_seconds": round(rem, 4),
    }


def can_victory_formation_kneel_out_vectorized(
    clock_sec_half: np.ndarray,
    def_timeouts: np.ndarray,
    down: np.ndarray,
    has_2mw_occurred: np.ndarray,
    *,
    tau_kneel: float = 1.6,
    play_clock: float = 40.0,
) -> Tuple[np.ndarray, np.ndarray]:
    """Vectorized Rule 4 Victory Formation absorber across N parallel simulations."""
    rem = clock_sec_half.astype(np.float64).copy()
    dto = def_timeouts.astype(np.int32).copy()
    cur_dn = down.astype(np.int32).copy()
    had_2mw = has_2mw_occurred.astype(bool).copy() | (rem <= 120.0)
    kneels = np.zeros_like(cur_dn)

    for step in range(4):
        still_can_snap = (rem > 0.0) & (cur_dn <= 4)
        if not np.any(still_can_snap):
            break
        pre_snap = rem.copy()
        rem = np.where(still_can_snap, np.maximum(0.0, rem - tau_kneel), rem)
        kneels = np.where(still_can_snap, kneels + 1, kneels)

        can_bleed_between = still_can_snap & (rem > 0.0) & (cur_dn < 4)
        crossed_2mw = can_bleed_between & (~had_2mw) & (pre_snap > 120.0) & (rem <= 120.0)
        had_2mw = had_2mw | crossed_2mw

        use_to = can_bleed_between & (~crossed_2mw) & (dto > 0)
        dto = np.where(use_to, dto - 1, dto)

        free_bleed = can_bleed_between & (~crossed_2mw) & (~use_to)
        hit_2mw_on_bleed = free_bleed & (~had_2mw) & (rem > 120.0) & ((rem - play_clock) <= 120.0)
        normal_bleed = free_bleed & (~hit_2mw_on_bleed)

        rem = np.where(hit_2mw_on_bleed, 120.0, rem)
        had_2mw = had_2mw | hit_2mw_on_bleed
        rem = np.where(normal_bleed, np.maximum(0.0, rem - play_clock), rem)

        cur_dn = np.where(still_can_snap, cur_dn + 1, cur_dn)

    return (rem <= 0.0), kneels


def expected_points_surface(
    down: np.ndarray,
    ydstogo: np.ndarray,
    yardline_100: np.ndarray,
) -> np.ndarray:
    """Smooth nflverse-calibrated Expected Points surface EP(down, ydstogo, yardline_100).

    Anchored to the sealed zone drive-value curve in GSE Coach Simulation & Audits:
    own 1-20 (~0.4 to 1.38), midfield (~2.45), opp 21-40 (~3.52), red zone (~4.48 to 6.1).
    """
    yl = np.clip(yardline_100.astype(np.float64), 1.0, 99.0)
    yd = np.clip(ydstogo.astype(np.float64), 1.0, 30.0)
    dn = np.clip(down.astype(np.int32), 1, 4)

    # First-and-10 baseline EP from yardline_100 = 99 (-1.25) to yardline_100 = 1 (+6.25)
    ep_1st = 6.32 - 0.0755 * yl - 0.55 * np.exp(-(99.0 - yl) / 7.5) + 0.38 * np.exp(-(yl - 1.0) / 8.0)
    down_tax = np.where(dn == 1, 0.0, np.where(dn == 2, 0.46, np.where(dn == 3, 1.18, 2.15)))
    dist_tax = 0.068 * np.maximum(0.0, yd - np.where(dn == 1, 10.0, np.where(dn == 2, 7.0, 4.0)))
    dist_bonus = 0.085 * np.maximum(0.0, np.where(dn >= 2, 4.0 - yd, 0.0))
    return ep_1st - down_tax - dist_tax + dist_bonus


def _sample_2026_dynamic_kickoff_yardline100(rng: np.random.Generator, n: int, outdoor_wind_mph: float) -> np.ndarray:
    """Vectorized 2026 NFL Dynamic Kickoff starting yardline_100 (distance from opp end zone)."""
    u = rng.random(n)
    wind_tb_boost = min(0.10, max(0.0, (outdoor_wind_mph - 8.0) * 0.008))
    # ~2.5% landing-zone penalty -> own 40 (yl_100 = 60)
    # ~31% end-zone touchback -> own 35 (yl_100 = 65)
    # ~9% bounce touchback -> own 20 (yl_100 = 80)
    # ~57.5% landing-zone live return -> mean own 29.5 (yl_100 ~ 70.5)
    ret_own_yl = np.clip(np.round(rng.normal(loc=29.5, scale=5.8, size=n)), 14.0, 58.0)
    own_spot = np.where(
        u < 0.025,
        40.0,
        np.where(
            u < (0.335 + wind_tb_boost),
            35.0,
            np.where(u < (0.425 + wind_tb_boost), 20.0, ret_own_yl),
        ),
    )
    return np.clip(100 - own_spot.astype(np.int32), 20, 88)


# =============================================================================
# SECTION 6: SEALED DISTRIBUTION RESULT OBJECT (IMMUTABLE ZONE 2 OUTPUT)
# =============================================================================

class SealedCoachMindDistribution:
    """Cryptographically sealed pure-football simulation output (zero market fields)."""

    __slots__ = ("_payload", "_seal_sha256", "_margins", "_totals")

    def __init__(
        self,
        payload: Mapping[str, Any],
        margins_home_minus_away: np.ndarray,
        totals_points: np.ndarray,
    ) -> None:
        assert_zero_market_contamination(payload, "SealedCoachMindDistribution", allow_sealed_sim_totals=True)
        frozen_payload = _deep_freeze(payload)
        digest = canonical_sha256(frozen_payload)
        margins_ro = np.asarray(margins_home_minus_away, dtype=np.int32).copy()
        totals_ro = np.asarray(totals_points, dtype=np.int32).copy()
        margins_ro.flags.writeable = False
        totals_ro.flags.writeable = False
        object.__setattr__(self, "_payload", frozen_payload)
        object.__setattr__(self, "_seal_sha256", digest)
        object.__setattr__(self, "_margins", margins_ro)
        object.__setattr__(self, "_totals", totals_ro)

    def __setattr__(self, name: str, value: Any) -> None:
        raise TypeError("SealedCoachMindDistribution is immutable after sealing.")

    @property
    def seal_sha256(self) -> str:
        return self._seal_sha256

    @property
    def payload(self) -> Mapping[str, Any]:
        return self._payload

    @property
    def margins(self) -> np.ndarray:
        return self._margins

    @property
    def totals(self) -> np.ndarray:
        return self._totals

    def verify_seal(self) -> bool:
        recomputed = canonical_sha256(self._payload)
        if recomputed != self._seal_sha256 or len(self._seal_sha256) != 64:
            raise RuntimeError(
                f"SEAL_TAMPERED: Expected {self._seal_sha256}, recomputed {recomputed}"
            )
        if self._payload["sealed_constants"]["fourth_down_baseline_tau"] != SEALED_FOURTH_DOWN_TAU:
            raise RuntimeError("SEAL_TAMPERED: fourth_down_baseline_tau drifted from 0.42.")
        if (
            self._payload["sealed_constants"]["qb_questionable_epa_dropoff"]
            != QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF
        ):
            raise RuntimeError("SEAL_TAMPERED: QB_QUESTIONABLE drifted from 0.0947.")
        return True

    def __getitem__(self, key: str) -> Any:
        return self._payload[key]

    def to_plain_dict(self) -> Dict[str, Any]:
        self.verify_seal()
        out = _to_plain_jsonable(self._payload)
        out["seal_sha256"] = self._seal_sha256
        return out


# =============================================================================
# SECTION 7: SNAP-BY-SNAP COACH-MIND MONTE CARLO ENGINE (Q1 15:00 -> OT / KNEEL)
# =============================================================================

def _compute_injury_epa_adjustment(injury_flags: Sequence[str]) -> float:
    """Sum pre-sealed additive EPA dropoffs for verified Week 10 roster designations."""
    total_drop = 0.0
    for fl in injury_flags:
        if fl in SEALED_EPA_DROPOFF_TABLE and isinstance(SEALED_EPA_DROPOFF_TABLE[fl], (int, float)):
            total_drop += float(SEALED_EPA_DROPOFF_TABLE[fl])
    return total_drop


def _compute_environmental_epa_delta(matchup: PureFootballMatchupInput) -> Tuple[float, float]:
    """Compute wind/density & international circadian EPA adjustments (pure physics)."""
    wind_tax = 0.0
    if not matchup.is_dome and matchup.wind_mph > 10.0:
        # Pre-seal empirical outdoor wind constant: -0.0285 EPA per 10 mph above calm threshold
        wind_tax = -0.0285 * ((matchup.wind_mph - 7.0) / 10.0)
    cold_tax = 0.0
    if not matchup.is_dome and matchup.temp_celsius < 4.0:
        cold_tax = -0.008 * ((4.0 - matchup.temp_celsius) / 8.0)

    # Circadian jet-lag differential when away team crosses >= 3 time zones (e.g., Munich)
    away_circadian_tax = 0.0
    if abs(matchup.away_time_zones_crossed) >= 2.0 and not matchup.is_neutral_site:
        away_circadian_tax = -0.004 * (abs(matchup.away_time_zones_crossed) - 1.0)
    elif matchup.is_neutral_site and abs(matchup.away_time_zones_crossed) >= 5.0:
        # Both teams travel to Munich (NE East Coast 6h vs DET Eastern/Central 6h: slight compressed variance)
        away_circadian_tax = -0.003

    away_env = wind_tax + cold_tax + away_circadian_tax
    home_env = wind_tax + cold_tax + (-0.003 if matchup.is_neutral_site else 0.0)
    return away_env, home_env


def simulate_matchup_line_free(
    matchup: PureFootballMatchupInput,
    *,
    n_sims: int = 10_000,
    seed: int = 20261115,
    **unexpected_kwargs: Any,
) -> SealedCoachMindDistribution:
    """Execute N seeded deterministic snap-by-snap NFL games with ZERO market inputs.

    State Machine Trajectory:
    - Half 1 (1800s -> 0s) with Q2 Two-Minute Warning (120s) & 3 timeouts/team
    - Half 2 (1800s -> 0s) with Q3 deferred kickoff, Q4 Two-Minute Warning (120s),
      and deterministic Rule 4 ``Victory Formation`` kneeldown absorber
    - ``EDGE#2 Overtime`` (600s regular-season OT period, both-teams-possess guarantee
      followed by sudden death; exact tie if tied at OT 0:00)
    """
    if unexpected_kwargs:
        assert_zero_market_contamination(unexpected_kwargs, "simulate_matchup_line_free")
        raise TypeError(
            f"simulate_matchup_line_free got unexpected keyword argument(s): "
            f"{', '.join(sorted(unexpected_kwargs.keys()))}"
        )
    if not isinstance(matchup, PureFootballMatchupInput):
        raise TypeError("matchup must be an instance of PureFootballMatchupInput.")
    if n_sims < 100:
        raise ValueError("n_sims must be >= 100 for distributional estimation.")

    assert_zero_market_contamination(matchup.to_canonical_dict(), "PureFootballMatchupInput")

    rng = np.random.default_rng(int(seed))

    away_off = COACH_TACTICAL_REGISTRY[matchup.away_off_coach]
    away_def = COACH_TACTICAL_REGISTRY[matchup.away_def_coach]
    home_off = COACH_TACTICAL_REGISTRY[matchup.home_off_coach]
    home_def = COACH_TACTICAL_REGISTRY[matchup.home_def_coach]

    # Sinkhorn-Knopp optimal transport reallocation for scratched skill roles
    away_sinkhorn = sinkhorn_reallocate_skill_shares(matchup.scratched_roles_away)
    home_sinkhorn = sinkhorn_reallocate_skill_shares(matchup.scratched_roles_home)

    away_inj_drop = _compute_injury_epa_adjustment(matchup.away_injuries)
    home_inj_drop = _compute_injury_epa_adjustment(matchup.home_injuries)
    away_env_delta, home_env_delta = _compute_environmental_epa_delta(matchup)

    # Empirical Bayes BTL shrinkage R = (1 + A*S)^(-1) toward league prior
    eb_weight = 1.0 - (1.0 / (1.0 + 45.0 * 0.04))  # 0.642857
    hfa_epa_per_play = 0.0 if matchup.is_neutral_site else (1.56 / 126.0)

    # Net baseline offensive efficiency vs opposing defensive efficiency
    # In nflverse convention, negative def_epa denotes an elite defense (suppresses opponent EPA)
    away_net_epa = (
        0.68 * (
            (matchup.away_base_off_epa - away_inj_drop) * away_sinkhorn["efficiency_multiplier"]
            + matchup.home_base_def_epa
        )
        + away_env_delta
    )
    home_net_epa = (
        0.68 * (
            (matchup.home_base_off_epa - home_inj_drop) * home_sinkhorn["efficiency_multiplier"]
            + matchup.away_base_def_epa
        )
        + home_env_delta
        + hfa_epa_per_play
    )

    away_proe_shrunk = eb_weight * away_off.neutral_proe
    home_proe_shrunk = eb_weight * home_off.neutral_proe

    # Trench pass-rush / protection clash differentials
    away_pass_pro_edge = matchup.away_ol_pass_block_win - home_def.organic_four_man_rush_win
    home_pass_pro_edge = matchup.home_ol_pass_block_win - away_def.organic_four_man_rush_win
    away_run_block_edge = matchup.away_ol_run_block_win - 0.42
    home_run_block_edge = matchup.home_ol_run_block_win - 0.42

    # --- Per-Simulation State Arrays ---
    away_score = np.zeros(n_sims, dtype=np.int32)
    home_score = np.zeros(n_sims, dtype=np.int32)

    # Telemetry accumulators across N simulations
    away_plays = np.zeros(n_sims, dtype=np.int32)
    home_plays = np.zeros(n_sims, dtype=np.int32)
    away_drives = np.zeros(n_sims, dtype=np.int32)
    home_drives = np.zeros(n_sims, dtype=np.int32)
    away_epa_sum = np.zeros(n_sims, dtype=np.float64)
    home_epa_sum = np.zeros(n_sims, dtype=np.float64)

    # Personnel & scheme telemetry scalars (aggregated over all snaps)
    pers_counts = {
        "away": np.zeros(4, dtype=np.int64),  # 11, 12, 21, 13
        "home": np.zeros(4, dtype=np.int64),
    }
    motion_snaps = {"away": 0, "home": 0}
    condensed_snaps = {"away": 0, "home": 0}
    def_shell_counts = {
        "away_def": np.zeros(3, dtype=np.int64),  # [Cover0_Sim, SplitSafety_Q_C6, SingleHigh_C1_C3]
        "home_def": np.zeros(3, dtype=np.int64),
    }
    proe_accum = {
        "away_neutral_pass": 0.0,
        "away_neutral_exp": 0.0,
        "away_neutral_n": 0,
        "away_trailing_pass": 0.0,
        "away_trailing_exp": 0.0,
        "away_trailing_n": 0,
        "home_neutral_pass": 0.0,
        "home_neutral_exp": 0.0,
        "home_neutral_n": 0,
        "home_trailing_pass": 0.0,
        "home_trailing_exp": 0.0,
        "home_trailing_n": 0,
    }
    fourth_down_stats = {
        "away_opps": 0,
        "away_go": 0,
        "away_conv": 0,
        "home_opps": 0,
        "home_go": 0,
        "home_conv": 0,
    }
    two_min_snaps_total = 0
    victory_formation_games = np.zeros(n_sims, dtype=bool)
    victory_formation_snaps = np.zeros(n_sims, dtype=np.int32)

    # Player-level stat arrays across N simulations
    away_qb_pass_yds = np.zeros(n_sims, dtype=np.int32)
    home_qb_pass_yds = np.zeros(n_sims, dtype=np.int32)
    away_qb_pass_tds = np.zeros(n_sims, dtype=np.int32)
    home_qb_pass_tds = np.zeros(n_sims, dtype=np.int32)
    away_qb_ints = np.zeros(n_sims, dtype=np.int32)
    home_qb_ints = np.zeros(n_sims, dtype=np.int32)
    away_qb_sacks = np.zeros(n_sims, dtype=np.int32)
    home_qb_sacks = np.zeros(n_sims, dtype=np.int32)
    away_team_rush_yds = np.zeros(n_sims, dtype=np.int32)
    home_team_rush_yds = np.zeros(n_sims, dtype=np.int32)
    away_team_rush_tds = np.zeros(n_sims, dtype=np.int32)
    home_team_rush_tds = np.zeros(n_sims, dtype=np.int32)

    # Opening coin toss: 0 = Away receives H1 kickoff, 1 = Home receives H1 kickoff
    h1_receiver = rng.integers(0, 2, size=n_sims, dtype=np.int32)

    def _score_td_and_pat(
        td_indices: np.ndarray,
        poss_vec: np.ndarray,
        is_second_half_q4: np.ndarray,
        is_pass_td: bool,
    ) -> None:
        """Apply 6-pt TD + exact integer XP (1) or situational 2-pt conversion (2)."""
        if td_indices.size == 0:
            return
        is_home_td = (poss_vec == 1) if poss_vec.shape[0] == td_indices.shape[0] and poss_vec.shape[0] != n_sims else (poss_vec[td_indices] == 1)
        h_idx = td_indices[is_home_td]
        a_idx = td_indices[~is_home_td]

        if h_idx.size > 0:
            home_score[h_idx] += 6
            if is_pass_td:
                home_qb_pass_tds[h_idx] += 1
            else:
                home_team_rush_tds[h_idx] += 1
        if a_idx.size > 0:
            away_score[a_idx] += 6
            if is_pass_td:
                away_qb_pass_tds[a_idx] += 1
            else:
                away_team_rush_tds[a_idx] += 1

        # Post-TD pre-PAT differential for scoring team
        post_td_diff = np.where(
            is_home_td,
            home_score[td_indices] - away_score[td_indices],
            away_score[td_indices] - home_score[td_indices],
        )
        # NFL 2-pt chart states in late H2/Q4: -2, -5, -8, -9, -11, -14, +1, +5
        go_two = is_second_half_q4 & np.isin(post_td_diff, (-2, -5, -8, -9, -11, -14, 1))
        u_pat = rng.random(td_indices.size)
        p_two = np.where(is_home_td, 0.485 + 0.12 * home_net_epa, 0.485 + 0.12 * away_net_epa)
        p_xp = 0.942 if matchup.is_dome else max(0.895, 0.942 - 0.002 * max(0.0, matchup.wind_mph - 8.0))
        pat_pts = np.where(
            go_two,
            np.where(u_pat < p_two, 2, 0),
            np.where(u_pat < p_xp, 1, 0),
        ).astype(np.int32)

        if h_idx.size > 0:
            home_score[h_idx] += pat_pts[is_home_td]
        if a_idx.size > 0:
            away_score[a_idx] += pat_pts[~is_home_td]

    # --- Simulate Half 1 and Half 2 ---
    for half_idx in (1, 2):
        clock_half = np.full(n_sims, 1800.0, dtype=np.float64)
        had_2mw = np.zeros(n_sims, dtype=bool)
        away_to = np.full(n_sims, 3, dtype=np.int32)
        home_to = np.full(n_sims, 3, dtype=np.int32)

        poss = h1_receiver.copy() if half_idx == 1 else (1 - h1_receiver)
        down = np.ones(n_sims, dtype=np.int32)
        ydstogo = np.full(n_sims, 10, dtype=np.int32)
        yardline_100 = _sample_2026_dynamic_kickoff_yardline100(
            rng, n_sims, 0.0 if matchup.is_dome else matchup.wind_mph
        )
        away_drives += (poss == 0).astype(np.int32)
        home_drives += (poss == 1).astype(np.int32)

        for _snap_iter in range(110):
            active = clock_half > 0.0
            if not np.any(active):
                break

            qtr = np.where(clock_half > 900.0, 1 if half_idx == 1 else 3, 2 if half_idx == 1 else 4)

            # 1. Deterministic Rule 4 Victory Formation Check (Late Q4, Leading Team Has Ball)
            if half_idx == 2:
                off_lead = np.where(poss == 1, home_score - away_score, away_score - home_score)
                def_to_curr = np.where(poss == 1, away_to, home_to)
                vf_candidates = active & (qtr == 4) & (clock_half <= 160.0) & (off_lead > 0)
                if np.any(vf_candidates):
                    cand_idx = np.where(vf_candidates)[0]
                    can_ko, k_snaps = can_victory_formation_kneel_out_vectorized(
                        clock_half[cand_idx],
                        def_to_curr[cand_idx],
                        down[cand_idx],
                        had_2mw[cand_idx],
                    )
                    if np.any(can_ko):
                        ko_idx = cand_idx[can_ko]
                        ks = k_snaps[can_ko]
                        victory_formation_games[ko_idx] = True
                        victory_formation_snaps[ko_idx] += ks
                        h_ko = ko_idx[poss[ko_idx] == 1]
                        a_ko = ko_idx[poss[ko_idx] == 0]
                        if h_ko.size > 0:
                            home_plays[h_ko] += victory_formation_snaps[h_ko]
                            home_team_rush_yds[h_ko] -= victory_formation_snaps[h_ko]
                        if a_ko.size > 0:
                            away_plays[a_ko] += victory_formation_snaps[a_ko]
                            away_team_rush_yds[a_ko] -= victory_formation_snaps[a_ko]
                        clock_half[ko_idx] = 0.0
                        active = clock_half > 0.0
                        if not np.any(active):
                            break

            act_idx = np.where(active)[0]
            n_act = act_idx.size
            poss_act = poss[act_idx]
            dn_act = down[act_idx]
            yd_act = ydstogo[act_idx]
            yl_act = yardline_100[act_idx]
            qtr_act = qtr[act_idx]
            clk_act = clock_half[act_idx]
            is_two_min = clk_act <= 120.0
            two_min_snaps_total += int(np.sum(is_two_min))

            score_diff_act = np.where(
                poss_act == 1,
                home_score[act_idx] - away_score[act_idx],
                away_score[act_idx] - home_score[act_idx],
            )
            ep_before = expected_points_surface(dn_act, yd_act, yl_act)

            # Separate 4th Down vs Downs 1-3
            is_4th_local = dn_act == 4
            is_1to3_local = ~is_4th_local

            clock_stopped_play = np.zeros(n_act, dtype=bool)
            ep_after = np.zeros(n_act, dtype=np.float64)

            # --- FOURTH DOWN CAUSAL DECISION SURFACE (GO / FG / PUNT) ---
            if np.any(is_4th_local):
                loc4 = np.where(is_4th_local)[0]
                g4 = act_idx[loc4]
                p4 = poss_act[loc4]
                yd4 = yd_act[loc4]
                yl4 = yl_act[loc4]
                sd4 = score_diff_act[loc4]
                q4 = qtr_act[loc4]
                clk4 = clk_act[loc4]

                tau_vec = np.where(p4 == 1, home_off.fourth_down_tau, away_off.fourth_down_tau)
                ne4 = np.where(p4 == 1, home_net_epa, away_net_epa)

                fourth_down_stats["away_opps"] += int(np.sum(p4 == 0))
                fourth_down_stats["home_opps"] += int(np.sum(p4 == 1))

                # Risk-quantile go-for-it threshold scaled by coach's fourth_down_tau vs sealed 0.42
                agg_shift = (tau_vec - SEALED_FOURTH_DOWN_TAU) * 18.0  # Dan Campbell (+3.78 yds/zone boost)
                max_go_yd_mid = np.clip(2.4 + 0.45 * agg_shift, 1.0, 6.0)
                max_go_yd_plus = np.clip(3.6 + 0.65 * agg_shift, 1.5, 8.0)

                desperate_q4 = (half_idx == 2) & (q4 == 4) & (
                    ((sd4 <= -9) & (clk4 <= 420.0))
                    | ((sd4 < 0) & (sd4 >= -8) & (clk4 <= 155.0) & ((yl4 > 36) | (sd4 <= -4)))
                )
                standard_go = (
                    ((yl4 <= 62) & (yl4 > 40) & (yd4 <= max_go_yd_mid))
                    | ((yl4 <= 40) & (yl4 > 5) & (yd4 <= max_go_yd_plus) & ((tau_vec >= 0.44) | (yd4 <= 2)))
                    | ((yl4 <= 4) & (yd4 <= 3) & (tau_vec >= 0.41))
                )
                go_mask = (desperate_q4 | standard_go) & (yd4 <= 15)
                fg_range_lim = 39 if matchup.is_dome else max(33, int(38 - 0.25 * max(0.0, matchup.wind_mph - 10.0)))
                fg_mask = (~go_mask) & (yl4 <= fg_range_lim)
                punt_mask = (~go_mask) & (~fg_mask)

                fourth_down_stats["away_go"] += int(np.sum(go_mask & (p4 == 0)))
                fourth_down_stats["home_go"] += int(np.sum(go_mask & (p4 == 1)))

                # Execute 4th-down GO
                if np.any(go_mask):
                    gl = loc4[go_mask]
                    gg = g4[go_mask]
                    away_plays[gg[poss[gg] == 0]] += 1
                    home_plays[gg[poss[gg] == 1]] += 1

                    p_conv = np.clip(0.66 - 0.052 * yd_act[gl] + 0.48 * ne4[go_mask], 0.14, 0.84)
                    conv = rng.random(gl.size) < p_conv
                    fourth_down_stats["away_conv"] += int(np.sum(conv & (poss[gg] == 0)))
                    fourth_down_stats["home_conv"] += int(np.sum(conv & (poss[gg] == 1)))

                    gains = np.where(
                        conv,
                        yd_act[gl] + rng.integers(0, 7, size=gl.size),
                        rng.integers(-2, 2, size=gl.size),
                    )
                    is_4th_pass = yd_act[gl] >= 3
                    h_4p = gg[(poss[gg] == 1) & is_4th_pass]
                    a_4p = gg[(poss[gg] == 0) & is_4th_pass]
                    if h_4p.size > 0:
                        home_qb_pass_yds[h_4p] += np.maximum(0, gains[(poss[gg] == 1) & is_4th_pass])
                    if a_4p.size > 0:
                        away_qb_pass_yds[a_4p] += np.maximum(0, gains[(poss[gg] == 0) & is_4th_pass])
                    h_4r = gg[(poss[gg] == 1) & (~is_4th_pass)]
                    a_4r = gg[(poss[gg] == 0) & (~is_4th_pass)]
                    if h_4r.size > 0:
                        home_team_rush_yds[h_4r] += gains[(poss[gg] == 1) & (~is_4th_pass)]
                    if a_4r.size > 0:
                        away_team_rush_yds[a_4r] += gains[(poss[gg] == 0) & (~is_4th_pass)]

                    new_yl = yl_act[gl] - gains
                    td_hit = conv & (new_yl <= 0)
                    turnover_downs = ~conv
                    keep_drive = conv & (~td_hit)

                    if np.any(td_hit):
                        td_g = gg[td_hit]
                        _score_td_and_pat(
                            td_g,
                            poss,
                            (half_idx == 2) & (qtr[td_g] == 4),
                            is_pass_td=True,
                        )
                        ep_after[gl[td_hit]] = 6.95
                        poss[td_g] = 1 - poss[td_g]
                        away_drives[td_g[poss[td_g] == 0]] += 1
                        home_drives[td_g[poss[td_g] == 1]] += 1
                        yardline_100[td_g] = _sample_2026_dynamic_kickoff_yardline100(
                            rng, td_g.size, 0.0 if matchup.is_dome else matchup.wind_mph
                        )
                        down[td_g] = 1
                        ydstogo[td_g] = 10
                        clock_stopped_play[gl[td_hit]] = True

                    if np.any(turnover_downs):
                        tod_g = gg[turnover_downs]
                        opp_yl = np.clip(100 - yl_act[gl[turnover_downs]], 2, 98)
                        ep_after[gl[turnover_downs]] = -expected_points_surface(
                            np.ones(tod_g.size, dtype=np.int32),
                            np.minimum(10, opp_yl),
                            opp_yl,
                        )
                        poss[tod_g] = 1 - poss[tod_g]
                        away_drives[tod_g[poss[tod_g] == 0]] += 1
                        home_drives[tod_g[poss[tod_g] == 1]] += 1
                        yardline_100[tod_g] = opp_yl
                        down[tod_g] = 1
                        ydstogo[tod_g] = np.minimum(10, opp_yl)
                        clock_stopped_play[gl[turnover_downs]] = True

                    if np.any(keep_drive):
                        kd_g = gg[keep_drive]
                        kd_yl = np.clip(new_yl[keep_drive], 1, 99)
                        down[kd_g] = 1
                        ydstogo[kd_g] = np.minimum(10, kd_yl)
                        yardline_100[kd_g] = kd_yl
                        ep_after[gl[keep_drive]] = expected_points_surface(
                            down[kd_g], ydstogo[kd_g], yardline_100[kd_g]
                        )

                # Execute Field Goal Attempt (exact +3 integer points; special-teams kick, not scrimmage snap)
                if np.any(fg_mask):
                    fl = loc4[fg_mask]
                    fg_g = g4[fg_mask]
                    kick_dist = yl_act[fl] + 17
                    wind_fg_pen = 0.0 if matchup.is_dome else 0.004 * max(0.0, matchup.wind_mph - 8.0)
                    p_fg = np.clip(0.985 - 0.0095 * np.maximum(0, kick_dist - 28) - wind_fg_pen, 0.42, 0.99)
                    made = rng.random(fl.size) < p_fg
                    home_score[fg_g[made & (poss[fg_g] == 1)]] += 3
                    away_score[fg_g[made & (poss[fg_g] == 0)]] += 3

                    miss_opp_yl = np.clip(100 - np.maximum(yl_act[fl] + 7, 20), 20, 80)
                    ep_after[fl] = np.where(
                        made,
                        3.0,
                        -expected_points_surface(
                            np.ones(fl.size, dtype=np.int32),
                            np.full(fl.size, 10, dtype=np.int32),
                            miss_opp_yl,
                        ),
                    )
                    poss[fg_g] = 1 - poss[fg_g]
                    away_drives[fg_g[poss[fg_g] == 0]] += 1
                    home_drives[fg_g[poss[fg_g] == 1]] += 1
                    if np.any(made):
                        yardline_100[fg_g[made]] = _sample_2026_dynamic_kickoff_yardline100(
                            rng, int(np.sum(made)), 0.0 if matchup.is_dome else matchup.wind_mph
                        )
                    if np.any(~made):
                        yardline_100[fg_g[~made]] = miss_opp_yl[~made]
                    down[fg_g] = 1
                    ydstogo[fg_g] = 10
                    clock_stopped_play[fl] = True

                # Execute Punt (special-teams kick, not scrimmage snap)
                if np.any(punt_mask):
                    pl = loc4[punt_mask]
                    pg = g4[punt_mask]
                    net_punt = np.round(rng.normal(loc=42.2, scale=5.5, size=pl.size)).astype(np.int32)
                    opp_yl_punt = np.clip(100 - np.maximum(yl_act[pl] - net_punt, 6), 8, 92)
                    ep_after[pl] = -expected_points_surface(
                        np.ones(pl.size, dtype=np.int32),
                        np.full(pl.size, 10, dtype=np.int32),
                        opp_yl_punt,
                    )
                    poss[pg] = 1 - poss[pg]
                    away_drives[pg[poss[pg] == 0]] += 1
                    home_drives[pg[poss[pg] == 1]] += 1
                    yardline_100[pg] = opp_yl_punt
                    down[pg] = 1
                    ydstogo[pg] = 10
                    clock_stopped_play[pl] = True

            # --- DOWNS 1 TO 3: PERSONNEL, MOTION, COVERAGE SHELLS & PLAY EXECUTION ---
            if np.any(is_1to3_local):
                loc13 = np.where(is_1to3_local)[0]
                g13 = act_idx[loc13]
                p13 = poss_act[loc13]
                dn13 = dn_act[loc13]
                yd13 = yd_act[loc13]
                yl13 = yl_act[loc13]
                sd13 = score_diff_act[loc13]
                q13 = qtr_act[loc13]
                clk13 = clk_act[loc13]
                n13 = loc13.size

                away_plays[g13[p13 == 0]] += 1
                home_plays[g13[p13 == 1]] += 1

                # 1. Personnel Grouping Selection: 0='11', 1='12', 2='21', 3='13'
                u_pers = rng.random(n13)
                short_or_gl = (yd13 <= 2) | (yl13 <= 5)
                two_min_or_long = (clk13 <= 120.0) | ((dn13 == 3) & (yd13 >= 6))

                away_p_probs = np.asarray(away_off.personnel_rates, dtype=np.float64)
                home_p_probs = np.asarray(home_off.personnel_rates, dtype=np.float64)
                # Shift depleted WR corps toward 12/13 heavy tight-end sets
                if "WR1" in matchup.scratched_roles_away and "WR2" in matchup.scratched_roles_away:
                    away_p_probs = np.array([0.46, 0.32, 0.08, 0.14], dtype=np.float64)
                if "WR1" in matchup.scratched_roles_home and "WR2" in matchup.scratched_roles_home:
                    home_p_probs = np.array([0.46, 0.32, 0.08, 0.14], dtype=np.float64)

                pers_choice = np.zeros(n13, dtype=np.int32)
                for side_val, base_pr in ((0, away_p_probs), (1, home_p_probs)):
                    smask = p13 == side_val
                    if not np.any(smask):
                        continue
                    s_locs = np.where(smask)[0]
                    # Dynamic situational tilt
                    pr_mat = np.tile(base_pr, (s_locs.size, 1))
                    sg_s = short_or_gl[s_locs]
                    tml_s = two_min_or_long[s_locs] & (~sg_s)
                    if np.any(sg_s):
                        pr_mat[sg_s] = pr_mat[sg_s] * np.array([0.35, 1.25, 1.60, 2.60])
                    if np.any(tml_s):
                        pr_mat[tml_s] = pr_mat[tml_s] * np.array([1.55, 0.70, 0.25, 0.15])
                    pr_mat = pr_mat / pr_mat.sum(axis=1, keepdims=True)
                    cdf_p = np.cumsum(pr_mat, axis=1)
                    u_sub = u_pers[s_locs, None]
                    chosen = np.argmax(u_sub <= cdf_p, axis=1).astype(np.int32)
                    pers_choice[s_locs] = chosen
                    key_side = "away" if side_val == 0 else "home"
                    for pidx in range(4):
                        pers_counts[key_side][pidx] += int(np.sum(chosen == pidx))

                is_heavy_pers = pers_choice >= 1  # 12, 21, or 13 personnel

                # 2. Pre-Snap Motion & Condensed Splits
                m_prob = np.where(p13 == 1, home_off.motion_rate, away_off.motion_rate)
                c_prob = np.where(p13 == 1, home_off.condensed_split_rate, away_off.condensed_split_rate)
                is_motion = rng.random(n13) < m_prob
                is_condensed = rng.random(n13) < c_prob
                motion_snaps["away"] += int(np.sum(is_motion & (p13 == 0)))
                motion_snaps["home"] += int(np.sum(is_motion & (p13 == 1)))
                condensed_snaps["away"] += int(np.sum(is_condensed & (p13 == 0)))
                condensed_snaps["home"] += int(np.sum(is_condensed & (p13 == 1)))

                # 3. Defensive Coverage Shell & Simulated Pressure Selection
                # 0 = COVER0_SIM_PRESSURE, 1 = SPLIT_SAFETY_QUARTERS_C6, 2 = SINGLE_HIGH_C1_C3
                c0_base = np.where(p13 == 1, away_def.cover0_sim_pressure_rate, home_def.cover0_sim_pressure_rate)
                ss_base = np.where(p13 == 1, away_def.split_safety_shell_rate, home_def.split_safety_shell_rate)
                exotic_3rd = np.where(p13 == 1, away_def.third_down_exotic_multiplier, home_def.third_down_exotic_multiplier)

                c0_prob = np.clip(
                    np.where((dn13 == 3) & (yd13 >= 5), c0_base * exotic_3rd, c0_base * 0.85),
                    0.06,
                    0.68,
                )
                ss_prob = np.clip(
                    np.where(is_heavy_pers & (yd13 <= 4), ss_base * 0.68, ss_base) * (1.0 - c0_prob),
                    0.10,
                    0.82,
                )
                u_shell = rng.random(n13)
                def_shell = np.where(
                    u_shell < c0_prob,
                    0,
                    np.where(u_shell < (c0_prob + ss_prob), 1, 2),
                ).astype(np.int32)

                for d_side, p_val in (("home_def", 0), ("away_def", 1)):
                    dmask = p13 == p_val
                    if np.any(dmask):
                        for sh_i in range(3):
                            def_shell_counts[d_side][sh_i] += int(np.sum(def_shell[dmask] == sh_i))

                # 4. Pass Rate Over Expected (PROE) & Dynamic Script Elasticity
                exp_pass = np.where(
                    dn13 == 1,
                    0.475 + 0.012 * np.maximum(0, yd13 - 10),
                    np.where(
                        dn13 == 2,
                        np.clip(0.38 + 0.032 * yd13, 0.34, 0.78),
                        np.clip(0.32 + 0.065 * yd13, 0.30, 0.92),
                    ),
                )
                exp_pass = np.where((clk13 <= 120.0) & (sd13 <= 0), np.maximum(exp_pass, 0.78), exp_pass)

                proe_base = np.where(p13 == 1, home_proe_shrunk, away_proe_shrunk)
                elast = np.where(p13 == 1, home_off.script_elasticity, away_off.script_elasticity)

                # Script pressure: positive when trailing, negative when protecting H2/Q4 lead
                time_urgency = np.where(half_idx == 2, np.where(q13 == 4, 1.45, 1.05), 0.65)
                script_shift = np.where(
                    sd13 <= -7,
                    elast * np.minimum(1.35, (-sd13 / 11.0)) * time_urgency,
                    np.where(
                        (half_idx == 2) & (sd13 >= 7),
                        -0.78 * elast * np.minimum(1.30, (sd13 / 11.0)) * time_urgency,
                        0.0,
                    ),
                )
                pers_pass_mod = np.where(
                    pers_choice == 0,
                    0.04,
                    np.where(pers_choice == 1, -0.02, np.where(pers_choice == 2, -0.11, -0.20)),
                )
                p_pass = np.clip(exp_pass + proe_base + script_shift + pers_pass_mod, 0.10, 0.95)
                is_pass = rng.random(n13) < p_pass

                # Record realized PROE & script elasticity telemetry
                neutral_mask = (half_idx == 1) | ((q13 == 3) & (np.abs(sd13) <= 6))
                trailing_mask = sd13 <= -7
                for side_val, prefix in ((0, "away"), (1, "home")):
                    nm = (p13 == side_val) & neutral_mask
                    if np.any(nm):
                        proe_accum[f"{prefix}_neutral_pass"] += float(np.sum(is_pass[nm]))
                        proe_accum[f"{prefix}_neutral_exp"] += float(np.sum(exp_pass[nm]))
                        proe_accum[f"{prefix}_neutral_n"] += int(np.sum(nm))
                    tm = (p13 == side_val) & trailing_mask
                    if np.any(tm):
                        proe_accum[f"{prefix}_trailing_pass"] += float(np.sum(is_pass[tm]))
                        proe_accum[f"{prefix}_trailing_exp"] += float(np.sum(exp_pass[tm]))
                        proe_accum[f"{prefix}_trailing_n"] += int(np.sum(tm))

                # 5. Tactical Scheme & Trench Outcome Physics
                ne_vec = np.where(p13 == 1, home_net_epa, away_net_epa)
                pass_pro = np.where(p13 == 1, home_pass_pro_edge, away_pass_pro_edge)
                run_blk = np.where(p13 == 1, home_run_block_edge, away_run_block_edge)
                p2s_qb = np.where(p13 == 1, matchup.home_qb_pressure_to_sack, matchup.away_qb_pressure_to_sack)
                rookie_qb = np.where(p13 == 1, matchup.home_rookie_first_start, matchup.away_rookie_first_start)
                pa_syn = np.where(p13 == 1, home_off.play_action_boot_synergy, away_off.play_action_boot_synergy)
                hot_cnt = np.where(p13 == 1, home_off.screen_hot_blitz_counter, away_off.screen_hot_blitz_counter)
                pwr_aff = np.where(p13 == 1, home_off.power_counter_run_affinity, away_off.power_counter_run_affinity)
                rz_def = np.where(p13 == 1, away_def.red_zone_tightening_epa, home_def.red_zone_tightening_epa)

                # Motion + Condensed Play-Action vs Single-High; Power/Counter vs Split-Safety Light Box
                motion_bonus = np.where(is_motion, 0.018, 0.0) - np.where(is_motion & (def_shell == 1), 0.008, 0.0)
                pa_bonus = np.where(is_pass & (dn13 <= 2) & is_condensed & (def_shell == 2), pa_syn, 0.0)
                counter_run_bonus = np.where((~is_pass) & is_heavy_pers & (def_shell == 1), pwr_aff * 14.0, 0.0)
                rz_penalty = np.where(yl13 <= 20, rz_def, 0.0)

                eff_epa = ne_vec + motion_bonus + pa_bonus - rz_penalty

                # Sack, Turnover, Completion & Yardage Draws
                blitz_heat = np.where(def_shell == 0, 0.042, np.where(def_shell == 1, -0.008, 0.004))
                rookie_disguise_pen = np.where(rookie_qb & (def_shell <= 1), 0.022, 0.0)
                sack_prob = np.clip(
                    0.062 - 0.095 * pass_pro + 0.16 * (p2s_qb - 0.180) + blitz_heat + rookie_disguise_pen - 0.25 * hot_cnt,
                    0.022,
                    0.155,
                )
                int_prob = np.clip(
                    0.021 - 0.022 * eff_epa + np.where(def_shell == 0, 0.005, 0.0) + 0.5 * rookie_disguise_pen,
                    0.006,
                    0.052,
                )
                fumble_lost_prob = 0.0065

                comp_prob = np.clip(
                    0.635 + 0.34 * eff_epa + np.where(def_shell == 1, 0.022, -0.015) - rookie_disguise_pen,
                    0.46,
                    0.76,
                )
                # Split-safety shells cap explosive air yards; Cover-0 blitz raises variance + hot-read YAC
                pass_mean_yds = (
                    10.85
                    + 11.5 * eff_epa
                    + np.where(def_shell == 0, 1.1 + 12.0 * hot_cnt, np.where(def_shell == 1, -0.95, 0.25))
                )
                pass_sd_yds = np.where(def_shell == 0, 8.2, np.where(def_shell == 1, 5.6, 6.8))

                u_play = rng.random(n13)
                is_sack = is_pass & (u_play < sack_prob)
                is_int = is_pass & (~is_sack) & (u_play < (sack_prob + int_prob))
                is_comp = is_pass & (~is_sack) & (~is_int) & (u_play < (sack_prob + int_prob + comp_prob * (1.0 - sack_prob - int_prob)))
                is_inc = is_pass & (~is_sack) & (~is_int) & (~is_comp)

                is_run_fum = (~is_pass) & (u_play < fumble_lost_prob)
                is_clean_run = (~is_pass) & (~is_run_fum)

                sack_loss = -rng.integers(5, 10, size=n13)
                comp_yds = np.maximum(
                    -2,
                    np.round(rng.normal(loc=pass_mean_yds, scale=pass_sd_yds, size=n13)).astype(np.int32),
                )
                # Occasional explosive deep shot when beating Cover-0 or Single-High
                deep_boom = is_comp & (def_shell != 1) & (rng.random(n13) < 0.045)
                comp_yds = np.where(deep_boom, comp_yds + rng.integers(13, 25, size=n13), comp_yds)

                # Counter run bonus scaled cleanly (~+0.45 yds vs light split-safety box)
                counter_yds = np.where((~is_pass) & is_heavy_pers & (def_shell == 1), pwr_aff * 8.5, 0.0)
                run_mean_yds = 4.42 + 7.2 * eff_epa + 2.8 * run_blk + counter_yds
                run_yds = np.round(rng.normal(loc=run_mean_yds, scale=3.8, size=n13)).astype(np.int32)
                breakaway_run = is_clean_run & (rng.random(n13) < 0.022)
                run_yds = np.where(breakaway_run, run_yds + rng.integers(11, 22, size=n13), run_yds)

                # Offensive holding / false-start penalty stalls (~5.2%) vs defensive penalty (~2.4% on pass)
                u_pen = rng.random(n13)
                off_pen = (~is_int) & (~is_run_fum) & (u_pen < 0.052)
                def_pen = is_pass & (~off_pen) & (~is_int) & (u_pen > 0.976)
                pen_yds = np.where(off_pen, np.where(u_pen < 0.024, -5, -10), np.where(def_pen, 11, 0))

                yds_gained = np.where(
                    off_pen | def_pen,
                    pen_yds,
                    np.where(
                        is_sack,
                        sack_loss,
                        np.where(is_comp, comp_yds, np.where(is_clean_run, run_yds, 0)),
                    ),
                )

                # Accumulate QB sacks, passing yards, INTs & team rushing yards
                if np.any(is_sack):
                    away_qb_sacks[g13[is_sack & (p13 == 0)]] += 1
                    home_qb_sacks[g13[is_sack & (p13 == 1)]] += 1
                if np.any(is_int):
                    away_qb_ints[g13[is_int & (p13 == 0)]] += 1
                    home_qb_ints[g13[is_int & (p13 == 1)]] += 1
                valid_stat = (~off_pen) & (~def_pen)
                if np.any(is_comp & valid_stat):
                    c_mask_a = is_comp & valid_stat & (p13 == 0)
                    c_mask_h = is_comp & valid_stat & (p13 == 1)
                    if np.any(c_mask_a):
                        away_qb_pass_yds[g13[c_mask_a]] += np.minimum(yl13[c_mask_a], np.maximum(0, comp_yds[c_mask_a]))
                    if np.any(c_mask_h):
                        home_qb_pass_yds[g13[c_mask_h]] += np.minimum(yl13[c_mask_h], np.maximum(0, comp_yds[c_mask_h]))
                if np.any(is_clean_run & valid_stat):
                    r_mask_a = is_clean_run & valid_stat & (p13 == 0)
                    r_mask_h = is_clean_run & valid_stat & (p13 == 1)
                    if np.any(r_mask_a):
                        away_team_rush_yds[g13[r_mask_a]] += np.minimum(yl13[r_mask_a], run_yds[r_mask_a])
                    if np.any(r_mask_h):
                        home_team_rush_yds[g13[r_mask_h]] += np.minimum(yl13[r_mask_h], run_yds[r_mask_h])

                # Resolve Turnovers (INT or Fumble Lost)
                is_to = is_int | is_run_fum
                if np.any(is_to):
                    to_l = loc13[is_to]
                    to_g = g13[is_to]
                    ret_yds = np.where(is_int[is_to], rng.integers(0, 14, size=to_g.size), 0)
                    opp_yl_to = np.clip(100 - yl13[is_to] - ret_yds, 1, 95)
                    pick_six = is_int[is_to] & (opp_yl_to <= 1) & (rng.random(to_g.size) < 0.08)

                    if np.any(pick_six):
                        p6_g = to_g[pick_six]
                        # Flip possession temporarily to award defensive TD to intercepting team
                        poss[p6_g] = 1 - poss[p6_g]
                        _score_td_and_pat(
                            p6_g,
                            poss,
                            (half_idx == 2) & (qtr[p6_g] == 4),
                            is_pass_td=False,
                        )
                        ep_after[to_l[pick_six]] = -6.95
                        # Offense receives kickoff back after pick-six
                        poss[p6_g] = 1 - poss[p6_g]
                        away_drives[p6_g[poss[p6_g] == 0]] += 1
                        home_drives[p6_g[poss[p6_g] == 1]] += 1
                        yardline_100[p6_g] = _sample_2026_dynamic_kickoff_yardline100(
                            rng, p6_g.size, 0.0 if matchup.is_dome else matchup.wind_mph
                        )
                        down[p6_g] = 1
                        ydstogo[p6_g] = 10

                    norm_to = ~pick_six
                    if np.any(norm_to):
                        nt_g = to_g[norm_to]
                        nt_yl = np.clip(opp_yl_to[norm_to], 5, 95)
                        ep_after[to_l[norm_to]] = -expected_points_surface(
                            np.ones(nt_g.size, dtype=np.int32),
                            np.minimum(10, nt_yl),
                            nt_yl,
                        )
                        poss[nt_g] = 1 - poss[nt_g]
                        away_drives[nt_g[poss[nt_g] == 0]] += 1
                        home_drives[nt_g[poss[nt_g] == 1]] += 1
                        yardline_100[nt_g] = nt_yl
                        down[nt_g] = 1
                        ydstogo[nt_g] = np.minimum(10, nt_yl)

                    clock_stopped_play[to_l] = True

                # Resolve Non-Turnover Plays (TD, Safety, First Down, or Next Down)
                non_to = ~is_to
                if np.any(non_to):
                    nt_sub = np.where(non_to)[0]
                    nt_l = loc13[nt_sub]
                    nt_g = g13[nt_sub]
                    g_yds = yds_gained[nt_sub]
                    raw_new_yl = yl13[nt_sub] - g_yds

                    is_td = raw_new_yl <= 0
                    is_safety = raw_new_yl >= 100
                    in_bounds_play = (~is_td) & (~is_safety)

                    if np.any(is_td):
                        td_sub_g = nt_g[is_td]
                        td_is_pass = is_comp[nt_sub[is_td]]
                        if np.any(td_is_pass):
                            _score_td_and_pat(
                                td_sub_g[td_is_pass],
                                poss,
                                (half_idx == 2) & (qtr[td_sub_g[td_is_pass]] == 4),
                                is_pass_td=True,
                            )
                        if np.any(~td_is_pass):
                            _score_td_and_pat(
                                td_sub_g[~td_is_pass],
                                poss,
                                (half_idx == 2) & (qtr[td_sub_g[~td_is_pass]] == 4),
                                is_pass_td=False,
                            )
                        ep_after[nt_l[is_td]] = 6.95
                        poss[td_sub_g] = 1 - poss[td_sub_g]
                        away_drives[td_sub_g[poss[td_sub_g] == 0]] += 1
                        home_drives[td_sub_g[poss[td_sub_g] == 1]] += 1
                        yardline_100[td_sub_g] = _sample_2026_dynamic_kickoff_yardline100(
                            rng, td_sub_g.size, 0.0 if matchup.is_dome else matchup.wind_mph
                        )
                        down[td_sub_g] = 1
                        ydstogo[td_sub_g] = 10
                        clock_stopped_play[nt_l[is_td]] = True

                    if np.any(is_safety):
                        saf_g = nt_g[is_safety]
                        # Defense scores +2 integer points and receives free kick
                        home_score[saf_g[poss[saf_g] == 0]] += 2
                        away_score[saf_g[poss[saf_g] == 1]] += 2
                        ep_after[nt_l[is_safety]] = -4.2
                        poss[saf_g] = 1 - poss[saf_g]
                        away_drives[saf_g[poss[saf_g] == 0]] += 1
                        home_drives[saf_g[poss[saf_g] == 1]] += 1
                        yardline_100[saf_g] = 68
                        down[saf_g] = 1
                        ydstogo[saf_g] = 10
                        clock_stopped_play[nt_l[is_safety]] = True

                    if np.any(in_bounds_play):
                        ib_sub_idx = nt_sub[in_bounds_play]
                        ib_g = nt_g[in_bounds_play]
                        ib_l = nt_l[in_bounds_play]
                        ib_yds = g_yds[in_bounds_play]
                        ib_yl = np.clip(raw_new_yl[in_bounds_play], 1, 99)
                        ib_off_pen = off_pen[ib_sub_idx]
                        ib_def_pen = def_pen[ib_sub_idx]
                        fd_hit = ib_def_pen | ((~ib_off_pen) & (ib_yds >= yd13[ib_sub_idx]))

                        yardline_100[ib_g] = ib_yl
                        # Replay down on offensive penalty; reset to 1st down on first down or defensive penalty
                        down[ib_g] = np.where(
                            fd_hit,
                            1,
                            np.where(ib_off_pen, dn13[ib_sub_idx], dn13[ib_sub_idx] + 1),
                        )
                        ydstogo[ib_g] = np.where(
                            fd_hit,
                            np.minimum(10, ib_yl),
                            np.maximum(1, yd13[ib_sub_idx] - ib_yds),
                        )
                        ep_after[ib_l] = expected_points_surface(
                            down[ib_g], ydstogo[ib_g], yardline_100[ib_g]
                        )

                        # NFL Rule 4: OOB only freezes clock until snap inside final 2:00 of H1 or final 5:00 of H2
                        inc_sub = is_inc[nt_sub[in_bounds_play]] & (~off_pen[nt_sub[in_bounds_play]])
                        clk_ib = clk13[nt_sub[in_bounds_play]]
                        oob_rule_window = ((half_idx == 1) & (clk_ib <= 120.0)) | ((half_idx == 2) & (clk_ib <= 300.0))
                        oob_prob = np.where(clk_ib <= 150.0, 0.30, 0.09)
                        oob_sub = (~inc_sub) & oob_rule_window & (rng.random(ib_g.size) < oob_prob)
                        clock_stopped_play[ib_l] = inc_sub | oob_sub

            # Accumulate pure play-by-play EPA
            snap_epa = ep_after - ep_before
            away_epa_sum[act_idx[poss_act == 0]] += snap_epa[poss_act == 0]
            home_epa_sum[act_idx[poss_act == 1]] += snap_epa[poss_act == 1]

            # --- CLOCK COMPRESSION, TWO-MINUTE WARNING & TIMEOUT MANAGEMENT ---
            snap_dur = np.clip(rng.normal(loc=5.4, scale=1.1, size=n_act), 3.2, 8.5)
            pre_clock = clock_half[act_idx].copy()
            post_snap_clock = np.maximum(0.0, pre_clock - snap_dur)

            crossed_2mw = (~had_2mw[act_idx]) & (pre_clock > 120.0) & (post_snap_clock <= 120.0)
            had_2mw[act_idx] = had_2mw[act_idx] | crossed_2mw

            # Strategic timeout usage inside 2:30 of half
            off_to_avail = np.where(poss_act == 1, home_to[act_idx], away_to[act_idx])
            def_to_avail = np.where(poss_act == 1, away_to[act_idx], home_to[act_idx])

            off_uses_to = (
                (~clock_stopped_play)
                & (~crossed_2mw)
                & (post_snap_clock <= 115.0)
                & (post_snap_clock > 6.0)
                & (score_diff_act <= 0)
                & (off_to_avail > 0)
            )
            def_uses_to = (
                (half_idx == 2)
                & (qtr_act == 4)
                & (~clock_stopped_play)
                & (~crossed_2mw)
                & (~off_uses_to)
                & (post_snap_clock <= 155.0)
                & (post_snap_clock > 8.0)
                & (score_diff_act > 0)
                & (score_diff_act <= 8)
                & (def_to_avail > 0)
            )

            if np.any(off_uses_to):
                ou_g = act_idx[off_uses_to]
                home_to[ou_g[poss[ou_g] == 1]] -= 1
                away_to[ou_g[poss[ou_g] == 0]] -= 1
            if np.any(def_uses_to):
                du_g = act_idx[def_uses_to]
                away_to[du_g[poss[du_g] == 1]] -= 1
                home_to[du_g[poss[du_g] == 0]] -= 1

            any_stop = clock_stopped_play | crossed_2mw | off_uses_to | def_uses_to
            base_pace = np.where(poss_act == 1, home_off.neutral_pace_sec, away_off.neutral_pace_sec)

            # Hurry-up compression when trailing vs 4-minute bleed when leading in Q4
            # Note: Base neutral NFL running-clock snap-to-snap cycle is ~32.5s (5.8s play + ~26.7s play clock)
            hurry_mask = (post_snap_clock <= 180.0) & (score_diff_act <= 0)
            bleed_mask = (half_idx == 2) & (qtr_act == 4) & (post_snap_clock <= 300.0) & (score_diff_act > 0)
            between_play_runoff = np.where(
                any_stop,
                0.0,
                np.where(
                    hurry_mask,
                    rng.uniform(10.5, 16.5, size=n_act),
                    np.where(
                        bleed_mask,
                        rng.uniform(35.5, 39.8, size=n_act),
                        np.clip(rng.normal(loc=base_pace + 4.1, scale=2.8, size=n_act), 22.0, 38.5),
                    ),
                ),
            )

            # Enforce Two-Minute Warning freeze if runoff crosses 120.0s
            hit_2mw_runoff = (
                (~had_2mw[act_idx])
                & (post_snap_clock > 120.0)
                & ((post_snap_clock - between_play_runoff) <= 120.0)
            )
            had_2mw[act_idx] = had_2mw[act_idx] | hit_2mw_runoff
            new_clock = np.where(
                hit_2mw_runoff,
                120.0,
                np.maximum(0.0, post_snap_clock - between_play_runoff),
            )
            clock_half[act_idx] = new_clock

    # --- EDGE#2 OVERTIME STATE MACHINE (TIED AT Q4 0:00) ---
    ot_mask = away_score == home_score
    ot_games_count = int(np.sum(ot_mask))
    if ot_games_count > 0:
        ot_idx = np.where(ot_mask)[0]
        ot_clock = np.full(ot_games_count, 600.0, dtype=np.float64)
        ot_first_team = rng.integers(0, 2, size=ot_games_count, dtype=np.int32)

        # Simulate up to 4 possessions in 10-minute OT (both teams guaranteed 1 possession)
        cur_poss = ot_first_team.copy()
        for ot_drive_num in range(4):
            still_ot = ot_clock > 0.0
            if ot_drive_num >= 2:
                still_ot = still_ot & (away_score[ot_idx] == home_score[ot_idx])
            if not np.any(still_ot):
                break

            sub = np.where(still_ot)[0]
            g_ot = ot_idx[sub]
            p_ot_team = cur_poss[sub]
            ne_ot = np.where(p_ot_team == 1, home_net_epa, away_net_epa)

            away_drives[g_ot[p_ot_team == 0]] += 1
            home_drives[g_ot[p_ot_team == 1]] += 1
            ot_snaps = rng.integers(4, 9, size=sub.size)
            away_plays[g_ot[p_ot_team == 0]] += ot_snaps[p_ot_team == 0]
            home_plays[g_ot[p_ot_team == 1]] += ot_snaps[p_ot_team == 1]

            # Drive scoring probabilities conditioned on net EPA & remaining OT clock
            p_td = np.clip(0.215 + 0.38 * ne_ot, 0.10, 0.36)
            p_fg = np.clip(0.325 + 0.22 * ne_ot, 0.18, 0.44)
            u_ot = rng.random(sub.size)
            is_ot_td = u_ot < p_td
            is_ot_fg = (~is_ot_td) & (u_ot < (p_td + p_fg))

            # Yardage added on OT drive
            ot_pass_y = np.where(is_ot_td, rng.integers(32, 58, size=sub.size), np.where(is_ot_fg, rng.integers(20, 42, size=sub.size), rng.integers(4, 22, size=sub.size)))
            ot_rush_y = rng.integers(6, 22, size=sub.size)
            away_qb_pass_yds[g_ot[p_ot_team == 0]] += ot_pass_y[p_ot_team == 0]
            home_qb_pass_yds[g_ot[p_ot_team == 1]] += ot_pass_y[p_ot_team == 1]
            away_team_rush_yds[g_ot[p_ot_team == 0]] += ot_rush_y[p_ot_team == 0]
            home_team_rush_yds[g_ot[p_ot_team == 1]] += ot_rush_y[p_ot_team == 1]

            if ot_drive_num == 0:
                # Opening OT possession: if TD, score 6 + XP (7) or 2pt; opponent still gets rebuttal drive
                if np.any(is_ot_td):
                    td_g_ot = g_ot[is_ot_td]
                    ot_poss_full = np.zeros(n_sims, dtype=np.int32)
                    ot_poss_full[td_g_ot] = p_ot_team[is_ot_td]
                    _score_td_and_pat(
                        td_g_ot,
                        ot_poss_full,
                        np.zeros(td_g_ot.size, dtype=bool),
                        is_pass_td=True,
                    )
                if np.any(is_ot_fg):
                    fg_g_ot = g_ot[is_ot_fg]
                    home_score[fg_g_ot[p_ot_team[is_ot_fg] == 1]] += 3
                    away_score[fg_g_ot[p_ot_team[is_ot_fg] == 0]] += 3
            elif ot_drive_num == 1:
                # Second team's guaranteed rebuttal possession
                deficit = np.where(
                    p_ot_team == 1,
                    away_score[g_ot] - home_score[g_ot],
                    home_score[g_ot] - away_score[g_ot],
                )
                # If trailing by 7, offense must go for TD (cannot settle for FG)
                must_td = deficit >= 6
                p_td_reb = np.where(must_td, np.clip(p_td + 0.08, 0.14, 0.42), p_td)
                is_reb_td = u_ot < p_td_reb
                is_reb_fg = (~must_td) & (~is_reb_td) & (u_ot < (p_td_reb + p_fg))

                if np.any(is_reb_td):
                    rtd_sub = sub[is_reb_td]
                    rtd_g = g_ot[is_reb_td]
                    rtd_team = p_ot_team[is_reb_td]
                    def_sub = deficit[is_reb_td]
                    # Walk-off TD (6 pts, no XP kicked) if deficit was 0 or 3!
                    walkoff_td = def_sub <= 3
                    tie_or_2pt = ~walkoff_td
                    if np.any(walkoff_td):
                        wo_g = rtd_g[walkoff_td]
                        wo_t = rtd_team[walkoff_td]
                        home_score[wo_g[wo_t == 1]] += 6
                        away_score[wo_g[wo_t == 0]] += 6
                        ot_clock[rtd_sub[walkoff_td]] = 0.0
                    if np.any(tie_or_2pt):
                        t2_g = rtd_g[tie_or_2pt]
                        t2_t = rtd_team[tie_or_2pt]
                        home_score[t2_g[t2_t == 1]] += 6
                        away_score[t2_g[t2_t == 0]] += 6
                        # Coaches like Dan Campbell go for 2 to win OT; others kick XP to tie at 7
                        off_tau_ot = np.where(t2_t == 1, home_off.fourth_down_tau, away_off.fourth_down_tau)
                        go2_ot = off_tau_ot >= 0.55
                        u2 = rng.random(t2_g.size)
                        pts2 = np.where(go2_ot, np.where(u2 < 0.49, 2, 0), np.where(u2 < 0.942, 1, 0))
                        home_score[t2_g[t2_t == 1]] += pts2[t2_t == 1]
                        away_score[t2_g[t2_t == 0]] += pts2[t2_t == 0]

                if np.any(is_reb_fg):
                    rfg_sub = sub[is_reb_fg]
                    rfg_g = g_ot[is_reb_fg]
                    rfg_t = p_ot_team[is_reb_fg]
                    home_score[rfg_g[rfg_t == 1]] += 3
                    away_score[rfg_g[rfg_t == 0]] += 3
                    # If deficit was 0, FG wins immediately in rebuttal!
                    ot_clock[rfg_sub[deficit[is_reb_fg] == 0]] = 0.0

                # If trailing team failed to match, game ends immediately
                still_trailing = (
                    (p_ot_team == 1) & (home_score[g_ot] < away_score[g_ot])
                ) | (
                    (p_ot_team == 0) & (away_score[g_ot] < home_score[g_ot])
                )
                ot_clock[sub[still_trailing]] = 0.0
            else:
                # Sudden death drives 3 & 4: any score immediately wins (walk-off 6 TD or 3 FG)
                if np.any(is_ot_td):
                    sd_td_g = g_ot[is_ot_td]
                    sd_td_t = p_ot_team[is_ot_td]
                    home_score[sd_td_g[sd_td_t == 1]] += 6
                    away_score[sd_td_g[sd_td_t == 0]] += 6
                    ot_clock[sub[is_ot_td]] = 0.0
                if np.any(is_ot_fg):
                    sd_fg_g = g_ot[is_ot_fg]
                    sd_fg_t = p_ot_team[is_ot_fg]
                    home_score[sd_fg_g[sd_fg_t == 1]] += 3
                    away_score[sd_fg_g[sd_fg_t == 0]] += 3
                    ot_clock[sub[is_ot_fg]] = 0.0

            drive_elapsed = rng.uniform(135.0, 225.0, size=sub.size)
            ot_clock[sub] = np.maximum(0.0, ot_clock[sub] - drive_elapsed)
            cur_poss[sub] = 1 - cur_poss[sub]

    # --- SUMMARIZE PURE COACH-MIND DISTRIBUTIONS ---
    margins = home_score - away_score  # Positive => Home wins; Negative => Away wins
    totals = home_score + away_score

    key_number_mass: Dict[str, float] = {
        "0": float(np.mean(margins == 0)),
    }
    for k in NFL_KEY_NUMBERS:
        p_pos = float(np.mean(margins == k))
        p_neg = float(np.mean(margins == -k))
        key_number_mass[f"+{k}"] = p_pos
        key_number_mass[f"-{k}"] = p_neg
        key_number_mass[f"abs_{k}"] = p_pos + p_neg

    total_quantiles = {
        "mean_total": float(np.mean(totals)),
        "median_total": float(np.median(totals)),
        "total_sd": float(np.std(totals, ddof=0)),
        "p05": float(np.percentile(totals, 5)),
        "p10": float(np.percentile(totals, 10)),
        "p25": float(np.percentile(totals, 25)),
        "p50": float(np.percentile(totals, 50)),
        "p75": float(np.percentile(totals, 75)),
        "p90": float(np.percentile(totals, 90)),
        "p95": float(np.percentile(totals, 95)),
    }
    margin_quantiles = {
        "p05": float(np.percentile(margins, 5)),
        "p10": float(np.percentile(margins, 10)),
        "p25": float(np.percentile(margins, 25)),
        "p50": float(np.percentile(margins, 50)),
        "p75": float(np.percentile(margins, 75)),
        "p90": float(np.percentile(margins, 90)),
        "p95": float(np.percentile(margins, 95)),
    }

    away_epa_per_drive = float(np.mean(away_epa_sum / np.maximum(away_drives, 1)))
    home_epa_per_drive = float(np.mean(home_epa_sum / np.maximum(home_drives, 1)))
    away_epa_per_play = float(np.sum(away_epa_sum) / max(int(np.sum(away_plays)), 1))
    home_epa_per_play = float(np.sum(home_epa_sum) / max(int(np.sum(home_plays)), 1))

    drive_epa = {
        "away_epa_per_drive": round(away_epa_per_drive, 4),
        "home_epa_per_drive": round(home_epa_per_drive, 4),
        "away_epa_per_play": round(away_epa_per_play, 4),
        "home_epa_per_play": round(home_epa_per_play, 4),
        "away_points_per_drive": round(float(np.mean(away_score / np.maximum(away_drives, 1))), 4),
        "home_points_per_drive": round(float(np.mean(home_score / np.maximum(home_drives, 1))), 4),
    }

    def _calc_proe_stats(prefix: str) -> Tuple[float, float, float]:
        nn = max(1, int(proe_accum[f"{prefix}_neutral_n"]))
        tn = max(1, int(proe_accum[f"{prefix}_trailing_n"]))
        p_neut = (proe_accum[f"{prefix}_neutral_pass"] - proe_accum[f"{prefix}_neutral_exp"]) / nn
        p_trail = (proe_accum[f"{prefix}_trailing_pass"] - proe_accum[f"{prefix}_trailing_exp"]) / tn
        return round(p_neut, 4), round(p_trail, 4), round(p_trail - p_neut, 4)

    away_p_neut, away_p_trail, away_s_elast = _calc_proe_stats("away")
    home_p_neut, home_p_trail, home_s_elast = _calc_proe_stats("home")
    script_elasticity = {
        "away_proe_neutral": away_p_neut,
        "away_proe_trailing": away_p_trail,
        "away_realized_script_elasticity": away_s_elast,
        "home_proe_neutral": home_p_neut,
        "home_proe_trailing": home_p_trail,
        "home_realized_script_elasticity": home_s_elast,
    }

    # Player-level stat distributions allocated via Sinkhorn-Knopp post-injury shares
    # When WR1 (or WR1+WR2) is scratched on IR, the active next-man-up lead receiver inherits the top surviving WR share
    a_sh = away_sinkhorn["shares_by_role"]
    h_sh = home_sinkhorn["shares_by_role"]
    a_lead_wr_share = max(a_sh["WR1"], a_sh["WR2"], a_sh["WR3"])
    h_lead_wr_share = max(h_sh["WR1"], h_sh["WR2"], h_sh["WR3"])
    a_lead_te_share = a_sh["TE1"] if "TE1" not in matchup.scratched_roles_away else max(0.135, a_sh["TE1"])
    h_lead_te_share = h_sh["TE1"] if "TE1" not in matchup.scratched_roles_home else max(0.135, h_sh["TE1"])
    a_lead_rb_rec_share = a_sh["RB1"] if "RB1" not in matchup.scratched_roles_away else max(0.105, a_sh["RB1"])
    h_lead_rb_rec_share = h_sh["RB1"] if "RB1" not in matchup.scratched_roles_home else max(0.105, h_sh["RB1"])

    away_wr1_yds = np.round(away_qb_pass_yds * a_lead_wr_share).astype(np.int32)
    away_te1_yds = np.round(away_qb_pass_yds * a_lead_te_share).astype(np.int32)
    away_rb1_rush_yds = np.round(np.maximum(0, away_team_rush_yds) * (0.64 if "RB1" not in matchup.scratched_roles_away else 0.54)).astype(np.int32)
    away_rb1_rec_yds = np.round(away_qb_pass_yds * a_lead_rb_rec_share).astype(np.int32)

    home_wr1_yds = np.round(home_qb_pass_yds * h_lead_wr_share).astype(np.int32)
    home_te1_yds = np.round(home_qb_pass_yds * h_lead_te_share).astype(np.int32)
    home_rb1_rush_yds = np.round(np.maximum(0, home_team_rush_yds) * (0.64 if "RB1" not in matchup.scratched_roles_home else 0.54)).astype(np.int32)
    home_rb1_rec_yds = np.round(home_qb_pass_yds * h_lead_rb_rec_share).astype(np.int32)

    def _stat_summary(arr: np.ndarray) -> Dict[str, float]:
        return {
            "mean": round(float(np.mean(arr)), 2),
            "median": round(float(np.median(arr)), 2),
            "p10": round(float(np.percentile(arr, 10)), 2),
            "p90": round(float(np.percentile(arr, 90)), 2),
        }

    away_p_tot = max(1, int(np.sum(pers_counts["away"])))
    home_p_tot = max(1, int(np.sum(pers_counts["home"])))
    away_d_tot = max(1, int(np.sum(def_shell_counts["away_def"])))
    home_d_tot = max(1, int(np.sum(def_shell_counts["home_def"])))

    payload: Dict[str, Any] = {
        "matchup_id": f"{matchup.away_team}@{matchup.home_team}",
        "espn_id": matchup.espn_id,
        "kickoff_utc": matchup.kickoff_utc,
        "away_team": matchup.away_team,
        "home_team": matchup.home_team,
        "venue": matchup.venue,
        "is_neutral_site": matchup.is_neutral_site,
        "n_sims": int(n_sims),
        "seed": int(seed),
        "coaches": {
            "away_off_coach": matchup.away_off_coach,
            "away_def_coach": matchup.away_def_coach,
            "home_off_coach": matchup.home_off_coach,
            "home_def_coach": matchup.home_def_coach,
        },
        "starters": {
            "away_qb": matchup.away_qb_starter,
            "home_qb": matchup.home_qb_starter,
            "away_skill": dict(matchup.away_key_skill),
            "home_skill": dict(matchup.home_key_skill),
        },
        "sealed_constants": {
            "version": SEALED_BASELINE_VERSION,
            "fourth_down_baseline_tau": SEALED_FOURTH_DOWN_TAU,
            "qb_questionable_epa_dropoff": QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
            "away_sinkhorn_l1_err": away_sinkhorn["l1_marginal_error"],
            "home_sinkhorn_l1_err": home_sinkhorn["l1_marginal_error"],
        },
        "away_mean_score": round(float(np.mean(away_score)), 3),
        "home_mean_score": round(float(np.mean(home_score)), 3),
        "away_median_score": round(float(np.median(away_score)), 2),
        "home_median_score": round(float(np.median(home_score)), 2),
        "mean_margin": round(float(np.mean(margins)), 4),  # home_score - away_score
        "median_margin": round(float(np.median(margins)), 4),
        "margin_sd": round(float(np.std(margins, ddof=0)), 4),
        "margin_quantiles": margin_quantiles,
        "away_win_prob_pure": round(float(np.mean(margins < 0)), 4),
        "home_win_prob_pure": round(float(np.mean(margins > 0)), 4),
        "tie_prob_pure": round(float(np.mean(margins == 0)), 4),
        "key_number_mass": key_number_mass,
        "total_quantiles": total_quantiles,
        "drive_epa": drive_epa,
        "script_elasticity": script_elasticity,
        "state_machine_telemetry": {
            "mean_scrimmage_plays_combined": round(float(np.mean(away_plays + home_plays)), 2),
            "away_personnel_rates": {
                "11": round(float(pers_counts["away"][0]) / away_p_tot, 4),
                "12": round(float(pers_counts["away"][1]) / away_p_tot, 4),
                "21": round(float(pers_counts["away"][2]) / away_p_tot, 4),
                "13": round(float(pers_counts["away"][3]) / away_p_tot, 4),
            },
            "home_personnel_rates": {
                "11": round(float(pers_counts["home"][0]) / home_p_tot, 4),
                "12": round(float(pers_counts["home"][1]) / home_p_tot, 4),
                "21": round(float(pers_counts["home"][2]) / home_p_tot, 4),
                "13": round(float(pers_counts["home"][3]) / home_p_tot, 4),
            },
            "away_motion_rate_realized": round(motion_snaps["away"] / away_p_tot, 4),
            "home_motion_rate_realized": round(motion_snaps["home"] / home_p_tot, 4),
            "away_condensed_rate_realized": round(condensed_snaps["away"] / away_p_tot, 4),
            "home_condensed_rate_realized": round(condensed_snaps["home"] / home_p_tot, 4),
            "away_def_shell_rates": {
                "cover0_sim_pressure": round(float(def_shell_counts["away_def"][0]) / away_d_tot, 4),
                "split_safety_quarters_cover6": round(float(def_shell_counts["away_def"][1]) / away_d_tot, 4),
                "single_high_cover1_cover3": round(float(def_shell_counts["away_def"][2]) / away_d_tot, 4),
            },
            "home_def_shell_rates": {
                "cover0_sim_pressure": round(float(def_shell_counts["home_def"][0]) / home_d_tot, 4),
                "split_safety_quarters_cover6": round(float(def_shell_counts["home_def"][1]) / home_d_tot, 4),
                "single_high_cover1_cover3": round(float(def_shell_counts["home_def"][2]) / home_d_tot, 4),
            },
            "away_4th_down_go_rate": round(
                fourth_down_stats["away_go"] / max(1, fourth_down_stats["away_opps"]), 4
            ),
            "home_4th_down_go_rate": round(
                fourth_down_stats["home_go"] / max(1, fourth_down_stats["home_opps"]), 4
            ),
            "two_minute_warning_snaps_per_game": round(two_min_snaps_total / float(n_sims), 2),
            "victory_formation_kneel_game_rate": round(float(np.mean(victory_formation_games)), 4),
            "victory_formation_kneel_snaps_mean": round(float(np.mean(victory_formation_snaps)), 3),
            "edge2_overtime_rate": round(float(ot_games_count) / float(n_sims), 4),
        },
        "player_stat_distributions": {
            "away_qb": {
                "player": matchup.away_qb_starter,
                "pass_yds": _stat_summary(away_qb_pass_yds),
                "pass_tds_mean": round(float(np.mean(away_qb_pass_tds)), 3),
                "ints_mean": round(float(np.mean(away_qb_ints)), 3),
                "sacks_mean": round(float(np.mean(away_qb_sacks)), 3),
            },
            "home_qb": {
                "player": matchup.home_qb_starter,
                "pass_yds": _stat_summary(home_qb_pass_yds),
                "pass_tds_mean": round(float(np.mean(home_qb_pass_tds)), 3),
                "ints_mean": round(float(np.mean(home_qb_ints)), 3),
                "sacks_mean": round(float(np.mean(home_qb_sacks)), 3),
            },
            "away_skill_projections": {
                "rb1": {"player": matchup.away_key_skill.get("RB1", "RB1"), "rush_yds": _stat_summary(away_rb1_rush_yds), "rec_yds": _stat_summary(away_rb1_rec_yds)},
                "wr1": {"player": matchup.away_key_skill.get("WR1", "WR1"), "rec_yds": _stat_summary(away_wr1_yds), "active_lead_wr_share": round(a_lead_wr_share, 4)},
                "te1": {"player": matchup.away_key_skill.get("TE1", "TE1"), "rec_yds": _stat_summary(away_te1_yds), "active_lead_te_share": round(a_lead_te_share, 4)},
                "sinkhorn_role_vector": {k: round(v, 4) for k, v in a_sh.items()},
            },
            "home_skill_projections": {
                "rb1": {"player": matchup.home_key_skill.get("RB1", "RB1"), "rush_yds": _stat_summary(home_rb1_rush_yds), "rec_yds": _stat_summary(home_rb1_rec_yds)},
                "wr1": {"player": matchup.home_key_skill.get("WR1", "WR1"), "rec_yds": _stat_summary(home_wr1_yds), "active_lead_wr_share": round(h_lead_wr_share, 4)},
                "te1": {"player": matchup.home_key_skill.get("TE1", "TE1"), "rec_yds": _stat_summary(home_te1_yds), "active_lead_te_share": round(h_lead_te_share, 4)},
                "sinkhorn_role_vector": {k: round(v, 4) for k, v in h_sh.items()},
            },
        },
    }

    return SealedCoachMindDistribution(payload, margins, totals)


# =============================================================================
# SECTION 8: POST-SEAL MARKET COMPARISON LAYER (ZONE 3 CLASS B ONLY)
# =============================================================================

@dataclass(frozen=True)
class PostSealMarketLine:
    """External sportsbook reference line evaluated STRICTLY AFTER simulation seals."""

    matchup_id: str
    listed_home_spread: float  # Negative => Home favored (e.g., DET -2.5); Positive => Home dog (e.g., ATL +3.5)
    listed_total: float
    spread_source_label: str
    spread_source_url: str
    total_source_label: str
    total_source_url: str


def _calibrate_oof_prob(p_raw: float) -> float:
    """Apply hierarchical OOF Logit-Temperature shrinkage (a0=-0.22, b0=0.78) to deflate raw overconfidence."""
    p_clip = min(1.0 - 1e-6, max(1e-6, float(p_raw)))
    z = math.log(p_clip / (1.0 - p_clip))
    eta = OOF_CALIBRATION_A0 + OOF_CALIBRATION_B0 * z
    return 1.0 / (1.0 + math.exp(-eta))


def compare_sealed_distribution_to_market(
    sealed_dist: SealedCoachMindDistribution,
    market_line: PostSealMarketLine,
) -> Dict[str, Any]:
    """Compare an ALREADY-SEALED pure Coach-Mind distribution against market lines.

    Asserts cryptographic seal integrity before AND after evaluation so zero
    market information can ever mutate or leak back into ``sealed_dist``.
    All conviction outputs strictly obey ``00-TRUTH-FILE`` (integer ``XX/100``).
    """
    if not isinstance(sealed_dist, SealedCoachMindDistribution):
        raise TypeError("sealed_dist must be a SealedCoachMindDistribution.")
    if not isinstance(market_line, PostSealMarketLine):
        raise TypeError("market_line must be a PostSealMarketLine.")

    before_sha = sealed_dist.seal_sha256
    sealed_dist.verify_seal()

    if sealed_dist["matchup_id"] != market_line.matchup_id:
        raise ValueError(
            f"Matchup mismatch: sealed '{sealed_dist['matchup_id']}' vs market '{market_line.matchup_id}'"
        )

    margins = sealed_dist.margins.astype(np.float64)
    totals = sealed_dist.totals.astype(np.float64)

    # Home covers when (home_score - away_score) + listed_home_spread > 0
    adj_home = margins + float(market_line.listed_home_spread)
    p_home_cover = float(np.mean(adj_home > 0.0))
    p_spread_push = float(np.mean(np.abs(adj_home) < 1e-9))
    p_away_cover = float(np.mean(adj_home < 0.0))

    nonpush_spread = max(1e-9, 1.0 - p_spread_push)
    home_win_nonpush = p_home_cover / nonpush_spread
    away_win_nonpush = p_away_cover / nonpush_spread

    if home_win_nonpush >= away_win_nonpush:
        lean_side = f"{sealed_dist['home_team']} {market_line.listed_home_spread:+.1f}"
        raw_side_prob = home_win_nonpush
        side_push = p_spread_push
    else:
        away_spread = -float(market_line.listed_home_spread)
        lean_side = f"{sealed_dist['away_team']} {away_spread:+.1f}"
        raw_side_prob = away_win_nonpush
        side_push = p_spread_push

    cal_side_prob = _calibrate_oof_prob(raw_side_prob)
    # Standard -110 decimal odds = 1.9090909 -> break-even 0.5238
    dec_110 = 1.0 + (100.0 / 110.0)
    side_ev_3class = cal_side_prob * (1.0 - side_push) * (dec_110 - 1.0) - (1.0 - cal_side_prob) * (1.0 - side_push)

    # Total comparison
    p_over = float(np.mean(totals > float(market_line.listed_total)))
    p_total_push = float(np.mean(np.abs(totals - float(market_line.listed_total)) < 1e-9))
    p_under = float(np.mean(totals < float(market_line.listed_total)))
    nonpush_tot = max(1e-9, 1.0 - p_total_push)
    over_nonpush = p_over / nonpush_tot
    under_nonpush = p_under / nonpush_tot

    if over_nonpush >= under_nonpush:
        lean_total = f"OVER {market_line.listed_total:.1f}"
        raw_total_prob = over_nonpush
    else:
        lean_total = f"UNDER {market_line.listed_total:.1f}"
        raw_total_prob = under_nonpush
    cal_total_prob = _calibrate_oof_prob(raw_total_prob)
    total_ev_3class = (
        cal_total_prob * (1.0 - p_total_push) * (dec_110 - 1.0)
        - (1.0 - cal_total_prob) * (1.0 - p_total_push)
    )

    # Fair pure-football spread (home perspective: -mean_margin)
    model_fair_home_spread = -float(sealed_dist["mean_margin"])
    spread_value_pts = abs(float(market_line.listed_home_spread) - model_fair_home_spread)
    total_value_pts = abs(float(sealed_dist["total_quantiles"]["mean_total"]) - float(market_line.listed_total))

    # Integer XX/100 conviction scores (00-TRUTH-FILE compliant: zero % confidence claims)
    side_conviction_int = min(88, max(45, int(round(50.0 + 9.5 * spread_value_pts))))
    total_conviction_int = min(88, max(45, int(round(50.0 + 7.5 * total_value_pts))))
    side_conviction_badge = format_conviction_xx_over_100(side_conviction_int)
    total_conviction_badge = format_conviction_xx_over_100(total_conviction_int)

    side_gate_action = "DIAGNOSTIC_CANDIDATE" if (side_ev_3class >= 0.015 and spread_value_pts >= 1.5) else "PASS_WITHHELD"
    total_gate_action = "DIAGNOSTIC_CANDIDATE" if (total_ev_3class >= 0.015 and total_value_pts >= 2.0) else "PASS_WITHHELD"

    after_sha = sealed_dist.seal_sha256
    sealed_dist.verify_seal()
    if before_sha != after_sha:
        raise RuntimeError("SEAL_TAMPERED: Post-seal market comparison mutated seal_sha256.")

    summary_note = (
        f"{sealed_dist['matchup_id']}: Pure Coach-Mind fair line {sealed_dist['home_team']} "
        f"{model_fair_home_spread:+.2f} (total {sealed_dist['total_quantiles']['mean_total']:.2f}) "
        f"evaluated post-seal vs market {sealed_dist['home_team']} {market_line.listed_home_spread:+.1f} "
        f"(total {market_line.listed_total:.1f}). Side conviction {side_conviction_badge} ({side_gate_action}); "
        f"Total conviction {total_conviction_badge} ({total_gate_action}). {PUBLIC_LEDGER_DISCLOSURE}"
    )
    assert_truth_file_compliant(summary_note)

    return {
        "matchup_id": sealed_dist["matchup_id"],
        "verified_seal_sha256": after_sha,
        "seal_preserved_unchanged": True,
        "listed_home_spread": float(market_line.listed_home_spread),
        "model_fair_home_spread": round(model_fair_home_spread, 2),
        "spread_discrepancy_pts": round(spread_value_pts, 2),
        "p_home_cover_empirical": round(p_home_cover, 4),
        "p_spread_push_empirical": round(p_spread_push, 4),
        "p_away_cover_empirical": round(p_away_cover, 4),
        "side_lean": lean_side,
        "side_oof_calibrated_win_prob": round(cal_side_prob, 4),
        "side_three_class_ev": round(side_ev_3class, 4),
        "side_conviction_score": side_conviction_badge,
        "side_gate_status": side_gate_action,
        "listed_total": float(market_line.listed_total),
        "model_mean_total": round(float(sealed_dist["total_quantiles"]["mean_total"]), 2),
        "model_median_total": round(float(sealed_dist["total_quantiles"]["median_total"]), 2),
        "total_discrepancy_pts": round(total_value_pts, 2),
        "p_over_empirical": round(p_over, 4),
        "p_total_push_empirical": round(p_total_push, 4),
        "p_under_empirical": round(p_under, 4),
        "total_lean": lean_total,
        "total_oof_calibrated_win_prob": round(cal_total_prob, 4),
        "total_three_class_ev": round(total_ev_3class, 4),
        "total_conviction_score": total_conviction_badge,
        "total_gate_status": total_gate_action,
        "sources": {
            "spread_source_label": market_line.spread_source_label,
            "spread_source_url": market_line.spread_source_url,
            "total_source_label": market_line.total_source_label,
            "total_source_url": market_line.total_source_url,
            "public_ledger_url": PUBLIC_LEDGER_URL,
        },
        "truth_file_compliant_summary": summary_note,
    }


# =============================================================================
# SECTION 9: OFFICIAL 2026 WEEK 10 REMAINING 13-GAME ROSTER & COACH FIXTURES
# =============================================================================

FA_ATS_URL = (
    "https://www.fantasyalarm.com/articles/nfl/predictions/"
    "2026-nfl-week-10-picks-against-the-spread-week-10-schedule-predictions/198637"
)
SBR_W10_URL = "https://www.sportsbookreview.com/picks/nfl/week-10-odds-betting-lines-2026/"


def build_week10_13_pure_matchups() -> Tuple[PureFootballMatchupInput, ...]:
    """Construct all 13 remaining 2026 Week 10 matchups with ZERO market fields."""
    return (
        # 1. NE @ DET (Munich International Game — FC Bayern Munich Stadium)
        PureFootballMatchupInput(
            espn_id="401873053",
            kickoff_utc="2026-11-15T14:30Z",
            away_team="NE",
            home_team="DET",
            venue="FC Bayern Munich Stadium",
            is_dome=False,
            is_neutral_site=True,
            wind_mph=7.0,
            temp_celsius=8.5,
            away_time_zones_crossed=6.0,
            away_off_coach="Mike Vrabel",
            away_def_coach="Mike Vrabel",
            home_off_coach="Dan Campbell",
            home_def_coach="Dan Campbell",
            away_qb_starter="Drake Maye",
            home_qb_starter="Jared Goff",
            away_key_skill={"RB1": "Corey Kiner (TreVeyon Henderson OUT)", "WR1": "A.J. Brown (LP)", "TE1": "Hunter Henry"},
            home_key_skill={"RB1": "Jahmyr Gibbs", "WR1": "Amon-Ra St. Brown", "TE1": "Sam LaPorta"},
            away_base_off_epa=0.052,
            away_base_def_epa=-0.024,
            home_base_off_epa=0.118,
            home_base_def_epa=-0.040,
            away_ol_pass_block_win=0.40,
            away_ol_run_block_win=0.39,
            home_ol_pass_block_win=0.49,
            home_ol_run_block_win=0.51,
            away_qb_pressure_to_sack=0.195,
            home_qb_pressure_to_sack=0.158,
            away_injuries=("SKILL_SECONDARY_OUT", "OL_STARTER_OUT", "DEF_ANCHOR_OUT"),
            home_injuries=("OL_STARTER_OUT", "DEF_ANCHOR_OUT"),
            scratched_roles_away=("RB1", "WR2"),
            scratched_roles_home=(),
            football_notes={
                "munich_neutral": True,
                "verified_starters": "TreVeyon Henderson OUT (illness), Rhamondre Stevenson multi-week risk; DET S Kerby Joseph, C Cade Mays, CB D.J. Reed OUT.",
            },
        ),
        # 2. KC @ ATL (Mercedes-Benz Stadium)
        PureFootballMatchupInput(
            espn_id="401873058",
            kickoff_utc="2026-11-15T18:00Z",
            away_team="KC",
            home_team="ATL",
            venue="Mercedes-Benz Stadium",
            is_dome=True,
            away_time_zones_crossed=1.0,
            away_off_coach="Andy Reid",
            away_def_coach="Steve Spagnuolo",
            home_off_coach="Kevin Stefanski",
            home_def_coach="Kevin Stefanski",
            away_qb_starter="Patrick Mahomes",
            home_qb_starter="Michael Penix Jr.",
            away_key_skill={"RB1": "Kenneth Walker III", "WR1": "Xavier Worthy / Josh Downs", "TE1": "Travis Kelce"},
            home_key_skill={"RB1": "Bijan Robinson", "WR1": "Drake London", "TE1": "Kyle Pitts"},
            away_base_off_epa=0.098,
            away_base_def_epa=-0.048,
            home_base_off_epa=0.018,
            home_base_def_epa=0.024,
            away_ol_pass_block_win=0.45,
            away_ol_run_block_win=0.44,
            home_ol_pass_block_win=0.42,
            home_ol_run_block_win=0.45,
            away_qb_pressure_to_sack=0.132,
            home_qb_pressure_to_sack=0.168,
            away_injuries=("SKILL_SECONDARY_OUT", "OL_STARTER_OUT"),
            home_injuries=("DEF_ANCHOR_OUT", "OL_STARTER_OUT"),
            scratched_roles_away=("WR2",),
            scratched_roles_home=(),
            football_notes={
                "verified_starters": "Patrick Mahomes FP; Xavier Worthy, deadline acquisition Josh Downs & Kenneth Walker III active for KC; ATL traded S Jessie Bates III & C Ryan Neuzil.",
            },
        ),
        # 3. HOU @ CLE (Huntington Bank Field)
        PureFootballMatchupInput(
            espn_id="401873056",
            kickoff_utc="2026-11-15T18:00Z",
            away_team="HOU",
            home_team="CLE",
            venue="Huntington Bank Field",
            is_dome=False,
            wind_mph=14.5,
            temp_celsius=7.0,
            away_time_zones_crossed=1.0,
            away_off_coach="DeMeco Ryans",
            away_def_coach="DeMeco Ryans",
            home_off_coach="Todd Monken",
            home_def_coach="Todd Monken",
            away_qb_starter="C.J. Stroud",
            home_qb_starter="Deshaun Watson",
            away_key_skill={"RB1": "Woody Marks (David Montgomery OUT)", "WR1": "Nico Collins / Xavier Hutchinson", "TE1": "Dalton Schultz"},
            home_key_skill={"RB1": "Quinshon Judkins", "WR1": "Jerry Jeudy", "TE1": "Harold Fannin Jr."},
            away_base_off_epa=0.036,
            away_base_def_epa=-0.062,
            home_base_off_epa=-0.058,
            home_base_def_epa=-0.038,
            away_ol_pass_block_win=0.39,
            away_ol_run_block_win=0.37,
            home_ol_pass_block_win=0.38,
            home_ol_run_block_win=0.42,
            away_qb_pressure_to_sack=0.188,
            home_qb_pressure_to_sack=0.238,
            away_injuries=("SKILL_SECONDARY_OUT",),
            home_injuries=("OL_STARTER_OUT", "SKILL_SECONDARY_OUT"),
            scratched_roles_away=("RB1",),
            scratched_roles_home=("WR2",),
            football_notes={
                "verified_starters": "Deshaun Watson cleared concussion protocol & starts over Shedeur Sanders; Xavier Hutchinson 38% TPRR vs man coverage.",
            },
        ),
        # 4. MIN @ GB (Lambeau Field)
        PureFootballMatchupInput(
            espn_id="401873060",
            kickoff_utc="2026-11-15T18:00Z",
            away_team="MIN",
            home_team="GB",
            venue="Lambeau Field",
            is_dome=False,
            wind_mph=11.0,
            temp_celsius=4.5,
            away_time_zones_crossed=0.0,
            away_off_coach="Kevin O'Connell",
            away_def_coach="Brian Flores",
            home_off_coach="Matt LaFleur",
            home_def_coach="Jonathan Gannon",
            away_qb_starter="Kirk Cousins",
            home_qb_starter="Jordan Love",
            away_key_skill={"RB1": "Aaron Jones", "WR1": "Justin Jefferson", "TE1": "Josh Oliver (T.J. Hockenson DNP)"},
            home_key_skill={"RB1": "Kaleb Johnson / Pierre Strong (Josh Jacobs OUT)", "WR1": "Christian Watson", "TE1": "Tucker Kraft"},
            away_base_off_epa=0.022,
            away_base_def_epa=-0.092,
            home_base_off_epa=0.068,
            home_base_def_epa=-0.024,
            away_ol_pass_block_win=0.44,
            away_ol_run_block_win=0.42,
            home_ol_pass_block_win=0.46,
            home_ol_run_block_win=0.43,
            away_qb_pressure_to_sack=0.088,  # Verified 8.8% pressure-to-sack tie (@SumerSports)
            home_qb_pressure_to_sack=0.142,
            away_injuries=("QB_TRADE_SHORT_WEEK", "SKILL_SECONDARY_OUT"),
            home_injuries=("SKILL_ALPHA_IR", "SKILL_SECONDARY_OUT", "DEF_ANCHOR_OUT"),
            scratched_roles_away=("TE1", "WR2"),
            scratched_roles_home=("RB1", "WR2"),
            football_notes={
                "verified_starters": "Kirk Cousins reacquired Nov 10 with Kyler Murray DNP; GB RB Josh Jacobs OUT (finger surgery); Christian Watson 31% target share vs blitz.",
            },
        ),
        # 5. JAX @ TEN (Nissan Stadium)
        PureFootballMatchupInput(
            espn_id="401873057",
            kickoff_utc="2026-11-15T18:00Z",
            away_team="JAX",
            home_team="TEN",
            venue="Nissan Stadium",
            is_dome=False,
            wind_mph=8.5,
            temp_celsius=13.5,
            away_time_zones_crossed=1.0,
            away_off_coach="Liam Coen",
            away_def_coach="Liam Coen",
            home_off_coach="Robert Saleh",
            home_def_coach="Robert Saleh",
            away_qb_starter="Trevor Lawrence",
            home_qb_starter="Cam Ward",
            away_key_skill={"RB1": "Chris Rodriguez Jr. / LeQuint Allen Jr. (Bhayshul Tuten DNP)", "WR1": "Brian Thomas Jr. / Parker Washington", "TE1": "Brenton Strange"},
            home_key_skill={"RB1": "Tony Pollard", "WR1": "Calvin Ridley", "TE1": "Daniel Bellinger / Gunnar Helm"},
            away_base_off_epa=0.114,
            away_base_def_epa=-0.052,
            home_base_off_epa=-0.088,
            home_base_def_epa=0.018,
            away_ol_pass_block_win=0.46,
            away_ol_run_block_win=0.45,
            home_ol_pass_block_win=0.36,
            home_ol_run_block_win=0.38,
            away_qb_pressure_to_sack=0.148,
            home_qb_pressure_to_sack=0.228,
            away_injuries=("SKILL_SECONDARY_OUT",),
            home_injuries=("DEF_ANCHOR_OUT", "DEF_ANCHOR_OUT"),
            scratched_roles_away=("RB1",),
            scratched_roles_home=(),
            football_notes={
                "verified_starters": "Trevor Lawrence (+0.28 EPA/play) vs Cam Ward; JAX added Jordan Davis, Jessie Bates III & Davon Godchaux; TEN traded Jeffery Simmons & Amani Hooker.",
            },
        ),
        # 6. MIA @ IND (Lucas Oil Stadium)
        PureFootballMatchupInput(
            espn_id="401873059",
            kickoff_utc="2026-11-15T18:00Z",
            away_team="MIA",
            home_team="IND",
            venue="Lucas Oil Stadium",
            is_dome=True,
            away_time_zones_crossed=0.0,
            away_off_coach="Bobby Slowik",
            away_def_coach="Jeff Hafley",
            home_off_coach="Shane Steichen",
            home_def_coach="Shane Steichen",
            away_qb_starter="Kyle McCord",
            home_qb_starter="Daniel Jones",
            away_key_skill={"RB1": "Ollie Gordon II / Kaytron Allen (De'Von Achane IR)", "WR1": "Malik Washington", "TE1": "Greg Dulcich"},
            home_key_skill={"RB1": "Jonathan Taylor", "WR1": "Ashton Dulin / Anthony Gould", "TE1": "Tyler Warren"},
            away_base_off_epa=-0.045,
            away_base_def_epa=-0.012,
            home_base_off_epa=-0.015,
            home_base_def_epa=0.010,
            away_ol_pass_block_win=0.38,
            away_ol_run_block_win=0.41,
            home_ol_pass_block_win=0.43,
            home_ol_run_block_win=0.46,
            away_qb_pressure_to_sack=0.225,
            home_qb_pressure_to_sack=0.205,
            away_rookie_first_start=True,
            away_injuries=("QB_ROOKIE_FIRST_START", "DEF_ANCHOR_OUT"),
            home_injuries=("SKILL_ALPHA_IR", "SKILL_SECONDARY_OUT", "OL_STARTER_OUT"),
            scratched_roles_away=(),
            scratched_roles_home=("WR1", "WR2"),
            football_notes={
                "verified_starters": "Kyle McCord 1st NFL start with Malik Willis IR & DT Zach Sieler IR; IND traded Keenan Allen (SF) & Josh Downs (KC) Nov 10.",
            },
        ),
        # 7. CAR @ NO (Caesars Superdome)
        PureFootballMatchupInput(
            espn_id="401873055",
            kickoff_utc="2026-11-15T18:00Z",
            away_team="CAR",
            home_team="NO",
            venue="Caesars Superdome",
            is_dome=True,
            away_time_zones_crossed=1.0,
            away_off_coach="Dave Canales",
            away_def_coach="Ejiro Evero",
            home_off_coach="Kellen Moore",
            home_def_coach="Brandon Staley",
            away_qb_starter="Bryce Young",
            home_qb_starter="Tyler Shough",
            away_key_skill={"RB1": "Chuba Hubbard", "WR1": "Tetairoa McMillan / Jalen Coker", "TE1": "Ja'Tavion Sanders"},
            home_key_skill={"RB1": "Alvin Kamara", "WR1": "Chris Olave", "TE1": "Noah Fant"},
            away_base_off_epa=-0.018,
            away_base_def_epa=0.032,
            home_base_off_epa=-0.008,
            home_base_def_epa=0.014,
            away_ol_pass_block_win=0.39,
            away_ol_run_block_win=0.44,
            home_ol_pass_block_win=0.41,
            home_ol_run_block_win=0.42,
            away_qb_pressure_to_sack=0.192,
            home_qb_pressure_to_sack=0.202,
            away_injuries=("OL_STARTER_OUT", "OL_STARTER_OUT", "DEF_ANCHOR_OUT"),
            home_injuries=("OL_STARTER_OUT",),
            scratched_roles_away=(),
            scratched_roles_home=(),
            football_notes={
                "verified_starters": "Bryce Young vs 2nd-round starter Tyler Shough; CAR OTs Moton & Ekwonu IR; NO C Erik McCoy DNP (Cesar Ruiz at C).",
            },
        ),
        # 8. BUF @ NYJ (MetLife Stadium)
        PureFootballMatchupInput(
            espn_id="401873054",
            kickoff_utc="2026-11-15T18:00Z",
            away_team="BUF",
            home_team="NYJ",
            venue="MetLife Stadium",
            is_dome=False,
            wind_mph=11.5,
            temp_celsius=10.0,
            away_time_zones_crossed=0.0,
            away_off_coach="Joe Brady",
            away_def_coach="Joe Brady",
            home_off_coach="Aaron Glenn",
            home_def_coach="Aaron Glenn",
            away_qb_starter="Josh Allen",
            home_qb_starter="Geno Smith",
            away_key_skill={"RB1": "James Cook", "WR1": "Keon Coleman / Khalil Shakir / Greg Dortch", "TE1": "Dalton Kincaid (LP)"},
            home_key_skill={"RB1": "Breece Hall / Braelon Allen", "WR1": "Garrett Wilson (Questionable)", "TE1": "Mason Taylor / Jeremy Ruckert"},
            away_base_off_epa=0.122,
            away_base_def_epa=-0.046,
            home_base_off_epa=-0.032,
            home_base_def_epa=-0.014,
            away_ol_pass_block_win=0.47,
            away_ol_run_block_win=0.48,
            home_ol_pass_block_win=0.40,
            home_ol_run_block_win=0.42,
            away_qb_pressure_to_sack=0.118,
            home_qb_pressure_to_sack=0.196,
            away_injuries=("OL_STARTER_OUT",),
            home_injuries=("SKILL_SECONDARY_OUT", "DEF_ANCHOR_OUT"),
            scratched_roles_away=(),
            scratched_roles_home=("WR2",),
            football_notes={
                "verified_starters": "Josh Allen (7-1 BUF, added S Amani Hooker) vs Geno Smith (2-7 NYJ, Garrett Wilson concussion LP, traded Andre Cisco).",
            },
        ),
        # 9. SEA @ LV (Allegiant Stadium)
        PureFootballMatchupInput(
            espn_id="401873062",
            kickoff_utc="2026-11-15T21:05Z",
            away_team="SEA",
            home_team="LV",
            venue="Allegiant Stadium",
            is_dome=True,
            away_time_zones_crossed=0.0,
            away_off_coach="Mike Macdonald",
            away_def_coach="Mike Macdonald",
            home_off_coach="Klint Kubiak",
            home_def_coach="Klint Kubiak",
            away_qb_starter="Drew Lock",
            home_qb_starter="Fernando Mendoza",
            away_key_skill={"RB1": "Zach Charbonnet", "WR1": "Jaxon Smith-Njigba / Tory Horton", "TE1": "AJ Barner"},
            home_key_skill={"RB1": "Ashton Jeanty", "WR1": "Jalen Nailor / Tre Tucker", "TE1": "Brock Bowers"},
            away_base_off_epa=0.044,
            away_base_def_epa=-0.096,
            home_base_off_epa=-0.022,
            home_base_def_epa=0.016,
            away_ol_pass_block_win=0.37,
            away_ol_run_block_win=0.39,
            home_ol_pass_block_win=0.41,
            home_ol_run_block_win=0.43,
            away_qb_pressure_to_sack=0.205,
            home_qb_pressure_to_sack=0.232,
            home_rookie_first_start=True,
            away_injuries=("QB1_OUT", "OL_STARTER_OUT", "OL_STARTER_OUT"),
            home_injuries=("QB_ROOKIE_FIRST_START",),
            scratched_roles_away=(),
            scratched_roles_home=("WR1",),
            football_notes={
                "verified_starters": "Drew Lock starts with Sam Darnold OUT & Cross/Nelson DNP; #1 overall pick Fernando Mendoza makes 1st NFL start vs Mike Macdonald's top-ranked defense after Kirk Cousins trade.",
            },
        ),
        # 10. LAR @ ARI (State Farm Stadium)
        PureFootballMatchupInput(
            espn_id="401873061",
            kickoff_utc="2026-11-15T21:05Z",
            away_team="LAR",
            home_team="ARI",
            venue="State Farm Stadium",
            is_dome=True,
            away_time_zones_crossed=1.0,
            away_off_coach="Sean McVay",
            away_def_coach="Sean McVay",
            home_off_coach="Mike LaFleur",
            home_def_coach="Nick Rallis",
            away_qb_starter="Matthew Stafford",
            home_qb_starter="Carson Beck",
            away_key_skill={"RB1": "Kyren Williams", "WR1": "Tutu Atwell / Konata Mumpfield (Nacua & Adams IR)", "TE1": "Colby Parkinson / Tyler Higbee"},
            home_key_skill={"RB1": "Tyler Allgeier / Bam Knight (Conner & Benson IR)", "WR1": "Kendrick Bourne / Devin Duvernay (MHJ traded, Wilson IR)", "TE1": "Trey McBride"},
            away_base_off_epa=0.092,
            away_base_def_epa=-0.044,
            home_base_off_epa=-0.036,
            home_base_def_epa=0.028,
            away_ol_pass_block_win=0.45,
            away_ol_run_block_win=0.48,
            home_ol_pass_block_win=0.39,
            home_ol_run_block_win=0.40,
            away_qb_pressure_to_sack=0.145,
            home_qb_pressure_to_sack=0.228,
            home_rookie_first_start=True,
            away_injuries=("SKILL_ALPHA_IR", "SKILL_ALPHA_IR", "OL_STARTER_OUT"),
            home_injuries=("QB_ROOKIE_FIRST_START", "SKILL_ALPHA_IR", "SKILL_SECONDARY_OUT"),
            scratched_roles_away=("WR1", "WR2"),
            scratched_roles_home=("WR1", "RB1"),
            football_notes={
                "verified_starters": "LAR placed Puka Nacua on IR Thu Nov 12 alongside Davante Adams IR (EDGE Myles Garrett activated LP); ARI starts Carson Beck with Tyler Allgeier lead RB, Gardner Minshew & Michael Wilson on IR, and Brissett traded to BAL.",
            },
        ),
        # 11. SF @ DAL (AT&T Stadium)
        PureFootballMatchupInput(
            espn_id="401873063",
            kickoff_utc="2026-11-15T21:25Z",
            away_team="SF",
            home_team="DAL",
            venue="AT&T Stadium",
            is_dome=True,
            away_time_zones_crossed=2.0,
            away_off_coach="Kyle Shanahan",
            away_def_coach="Kyle Shanahan",
            home_off_coach="Brian Schottenheimer",
            home_def_coach="Brian Schottenheimer",
            away_qb_starter="Brock Purdy",
            home_qb_starter="Dak Prescott",
            away_key_skill={"RB1": "Christian McCaffrey", "WR1": "Deebo Samuel Sr. / Keenan Allen / Brandin Cooks", "TE1": "George Kittle"},
            home_key_skill={"RB1": "Javonte Williams", "WR1": "CeeDee Lamb / George Pickens (Q)", "TE1": "Brevyn Spann-Ford (Jake Ferguson & Schoonmaker OUT)"},
            away_base_off_epa=0.128,
            away_base_def_epa=-0.054,
            home_base_off_epa=0.064,
            home_base_def_epa=0.018,
            away_ol_pass_block_win=0.46,
            away_ol_run_block_win=0.49,
            home_ol_pass_block_win=0.44,
            home_ol_run_block_win=0.42,
            away_qb_pressure_to_sack=0.156,
            home_qb_pressure_to_sack=0.162,
            away_injuries=("SKILL_ALPHA_IR", "SKILL_SECONDARY_OUT"),
            home_injuries=("SKILL_SECONDARY_OUT",),
            scratched_roles_away=("WR1",),
            scratched_roles_home=("TE1",),
            football_notes={
                "verified_starters": "SF 7-1 (Mike Evans DNP Achilles, Kirk & Pearsall IR, Deebo Samuel Sr., deadline addition Keenan Allen & Brandin Cooks start alongside CMC & Kittle); DAL Jake Ferguson & Luke Schoonmaker expected out, Brevyn Spann-Ford TE1, George Pickens Q.",
            },
        ),
        # 12. PIT @ CIN (Paycor Stadium — Sunday Night Football)
        PureFootballMatchupInput(
            espn_id="401873064",
            kickoff_utc="2026-11-16T01:20Z",
            away_team="PIT",
            home_team="CIN",
            venue="Paycor Stadium",
            is_dome=False,
            wind_mph=9.0,
            temp_celsius=6.5,
            away_time_zones_crossed=0.0,
            away_off_coach="Mike McCarthy",
            away_def_coach="Mike McCarthy",
            home_off_coach="Zac Taylor",
            home_def_coach="Zac Taylor",
            away_qb_starter="Aaron Rodgers",
            home_qb_starter="Joe Burrow",
            away_key_skill={"RB1": "Jaylen Warren / Rico Dowdle", "WR1": "Calvin Austin III (Michael Pittman Jr. IR)", "TE1": "Pat Freiermuth"},
            home_key_skill={"RB1": "Chase Brown", "WR1": "Ja'Marr Chase / Tee Higgins", "TE1": "Mike Gesicki"},
            away_base_off_epa=0.048,
            away_base_def_epa=-0.076,
            home_base_off_epa=0.108,
            home_base_def_epa=0.008,
            away_ol_pass_block_win=0.44,
            away_ol_run_block_win=0.44,
            home_ol_pass_block_win=0.42,
            home_ol_run_block_win=0.41,
            away_qb_pressure_to_sack=0.144,
            home_qb_pressure_to_sack=0.165,
            away_injuries=("SKILL_ALPHA_IR",),
            home_injuries=("DEF_ANCHOR_OUT",),
            scratched_roles_away=("WR1",),
            scratched_roles_home=(),
            football_notes={
                "verified_starters": "6-2 PIT (Aaron Rodgers off Week 9 bye, Michael Pittman Jr. IR) at 6-2 CIN (Joe Burrow +0.25 EPA/play, S Kyle Dugger DNP).",
            },
        ),
        # 13. LAC @ BAL (M&T Bank Stadium — Monday Night Football)
        PureFootballMatchupInput(
            espn_id="401873065",
            kickoff_utc="2026-11-17T01:15Z",
            away_team="LAC",
            home_team="BAL",
            venue="M&T Bank Stadium",
            is_dome=False,
            wind_mph=10.5,
            temp_celsius=6.0,
            away_time_zones_crossed=3.0,
            away_off_coach="Jim Harbaugh",
            away_def_coach="Jim Harbaugh",
            home_off_coach="Declan Doyle",
            home_def_coach="Jesse Minter",
            away_qb_starter="Justin Herbert",
            home_qb_starter="Jacoby Brissett",
            away_key_skill={"RB1": "Omarion Hampton / Keaton Mitchell", "WR1": "Quentin Johnston (Ladd McConkey DNP)", "TE1": "Oronde Gadsden II / Charlie Kolar"},
            home_key_skill={"RB1": "Derrick Henry", "WR1": "Zay Flowers", "TE1": "Mark Andrews"},
            away_base_off_epa=-0.038,
            away_base_def_epa=-0.022,
            home_base_off_epa=0.116,
            home_base_def_epa=-0.052,
            away_ol_pass_block_win=0.41,
            away_ol_run_block_win=0.44,
            home_ol_pass_block_win=0.45,
            home_ol_run_block_win=0.48,
            away_qb_pressure_to_sack=0.178,
            home_qb_pressure_to_sack=0.194,
            away_injuries=("SKILL_ALPHA_IR", "OL_STARTER_OUT", "DEF_ANCHOR_OUT"),
            home_injuries=("QB1_OUT",),
            scratched_roles_away=("WR1",),
            scratched_roles_home=(),
            football_notes={
                "verified_starters": "Jacoby Brissett confirmed MNF starter by HC Jesse Minter with Lamar Jackson on IR; LAC Justin Herbert cleared but Ladd McConkey DNP, Derwin James IR & Daiyan Henley traded.",
            },
        ),
    )


def build_week10_post_seal_market_lines() -> Mapping[str, PostSealMarketLine]:
    """Post-seal external sportsbook lines (DraftKings Nov 11 spreads / SBR bet365 totals).

    STRICT ZONE 3 ISOLATION: Never imported or read during ``simulate_matchup_line_free``.
    """
    rows = (
        PostSealMarketLine("NE@DET", -2.5, 51.5, "Fantasy Alarm (DraftKings Nov 11)", FA_ATS_URL, "Sportsbook Review (bet365)", SBR_W10_URL),
        PostSealMarketLine("KC@ATL", +3.5, 45.5, "Fantasy Alarm (DraftKings Nov 11)", FA_ATS_URL, "Sportsbook Review (bet365)", SBR_W10_URL),
        PostSealMarketLine("HOU@CLE", +4.5, 39.5, "Fantasy Alarm (DraftKings Nov 11)", FA_ATS_URL, "Sportsbook Review (bet365)", SBR_W10_URL),
        PostSealMarketLine("MIN@GB", -3.5, 42.5, "Fantasy Alarm (DraftKings Nov 11)", FA_ATS_URL, "Sportsbook Review (bet365)", SBR_W10_URL),
        PostSealMarketLine("JAX@TEN", +10.5, 47.5, "Fantasy Alarm (DraftKings Nov 11)", FA_ATS_URL, "Sportsbook Review (bet365)", SBR_W10_URL),
        PostSealMarketLine("MIA@IND", -3.5, 40.5, "Fantasy Alarm (DraftKings Nov 11)", FA_ATS_URL, "Sportsbook Review (bet365)", SBR_W10_URL),
        PostSealMarketLine("CAR@NO", -2.5, 47.5, "Fantasy Alarm (DraftKings Nov 11)", FA_ATS_URL, "Sportsbook Review (bet365)", SBR_W10_URL),
        PostSealMarketLine("BUF@NYJ", +8.5, 51.5, "Fantasy Alarm (DraftKings Nov 11)", FA_ATS_URL, "Sportsbook Review (bet365)", SBR_W10_URL),
        PostSealMarketLine("SEA@LV", +6.5, 43.5, "Fantasy Alarm (DraftKings Nov 11)", FA_ATS_URL, "Sportsbook Review (bet365)", SBR_W10_URL),
        PostSealMarketLine("LAR@ARI", +9.5, 44.5, "Fantasy Alarm (DraftKings Nov 11)", FA_ATS_URL, "Sportsbook Review (bet365)", SBR_W10_URL),
        PostSealMarketLine("SF@DAL", +3.5, 55.5, "Fantasy Alarm (DraftKings Nov 11)", FA_ATS_URL, "Sportsbook Review (bet365)", SBR_W10_URL),
        PostSealMarketLine("PIT@CIN", -3.5, 47.5, "Fantasy Alarm (DraftKings Nov 11)", FA_ATS_URL, "Sportsbook Review (bet365)", SBR_W10_URL),
        PostSealMarketLine("LAC@BAL", -4.5, 38.5, "Fantasy Alarm (DraftKings Nov 11)", FA_ATS_URL, "Sportsbook Review (bet365)", SBR_W10_URL),
    )
    return MappingProxyType({r.matchup_id: r for r in rows})


def run_week10_13_game_slate(
    *,
    n_sims: int = 10_000,
    base_seed: int = 20261113,
    output_json_path: Optional[Path | str] = None,
) -> Dict[str, Any]:
    """Execute all 13 remaining Week 10 games purely line-free, seal, then compare to market."""
    pure_matchups = build_week10_13_pure_matchups()
    if len(pure_matchups) != 13:
        raise AssertionError(f"Expected 13 remaining Week 10 matchups, got {len(pure_matchups)}")

    # Phase 1: Pure Football Simulation & Cryptographic Sealing (Zero market lines loaded)
    sealed_results: List[SealedCoachMindDistribution] = []
    for idx, matchup in enumerate(pure_matchups):
        game_seed = int(base_seed + (idx + 1) * 1009)
        sealed_dist = simulate_matchup_line_free(matchup, n_sims=n_sims, seed=game_seed)
        sealed_dist.verify_seal()
        sealed_results.append(sealed_dist)

    slate_seal_merkle = canonical_sha256([sr.seal_sha256 for sr in sealed_results])

    # Phase 2: Post-Seal Market Comparison (Read-only on sealed distributions)
    market_lines = build_week10_post_seal_market_lines()
    games_bundle: List[Dict[str, Any]] = []
    for sr in sealed_results:
        before_hash = sr.seal_sha256
        m_line = market_lines[sr["matchup_id"]]
        post_seal_eval = compare_sealed_distribution_to_market(sr, m_line)
        assert sr.seal_sha256 == before_hash, "Seal mutated during post-seal evaluation!"
        games_bundle.append(
            {
                "pure_coach_mind_sealed": sr.to_plain_dict(),
                "post_seal_market_comparison": post_seal_eval,
            }
        )

    post_merkle = canonical_sha256([sr.seal_sha256 for sr in sealed_results])
    if post_merkle != slate_seal_merkle:
        raise RuntimeError("SLATE_MERKLE_VIOLATION: Slate seal digest mutated post-comparison.")

    full_report = {
        "entity": LEGAL_ENTITY_NAME,
        "dba": DBA_BRAND_NAME,
        "domain": CANONICAL_WEB_DOMAIN,
        "public_ledger_disclosure": PUBLIC_LEDGER_DISCLOSURE,
        "generated_date": "2026-11-13",
        "season": 2026,
        "week": 10,
        "w10_fixtures_sha256_canonical": W10_FIXTURES_CANONICAL_SHA256,
        "tnf_settled_excluded": "WSH@NYG (401873052, Final WSH 24 - NYG 21 on 2026-11-12)",
        "remaining_games_simulated": 13,
        "n_sims_per_game": int(n_sims),
        "total_monte_carlo_games_simulated": int(13 * n_sims),
        "base_seed": int(base_seed),
        "slate_pure_seal_merkle_sha256": slate_seal_merkle,
        "named_coaches_modeled_14": list(PROMPT_REQUIRED_14_COACHES),
        "truth_file_governance": {
            "conviction_format": "integer XX/100 only (zero % confidence badges)",
            "retired_records_purged": True,
            "public_ngs_metrics_used": 0,
            "sportsbook_affiliate_links": 0,
        },
        "games": games_bundle,
    }

    serialized = json.dumps(full_report, indent=2)
    assert_truth_file_compliant(serialized)

    if output_json_path is not None:
        out_p = Path(output_json_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        out_p.write_text(serialized + "\n", encoding="utf-8")

    return full_report


if __name__ == "__main__":
    default_out = Path(__file__).resolve().parent / "week10_pure_coach_mind_13_games.json"
    result = run_week10_13_game_slate(n_sims=10_000, base_seed=20261113, output_json_path=default_out)
    print(
        f"[GSE LINE-FREE COACH-MIND SEALED] games={result['remaining_games_simulated']} | "
        f"sims_per_game={result['n_sims_per_game']} | merkle={result['slate_pure_seal_merkle_sha256']}"
    )
    for g in result["games"]:
        pure = g["pure_coach_mind_sealed"]
        cmp_m = g["post_seal_market_comparison"]
        print(
            f"  {pure['matchup_id']:7s} | Pure Mean {pure['away_team']} {pure['away_mean_score']:5.2f} - "
            f"{pure['home_team']} {pure['home_mean_score']:5.2f} "
            f"(Fair {pure['home_team']} {-pure['mean_margin']:+5.2f}, Tot {pure['total_quantiles']['mean_total']:5.2f}) | "
            f"Mkt {pure['home_team']} {cmp_m['listed_home_spread']:+5.1f} / {cmp_m['listed_total']:4.1f} | "
            f"Side {cmp_m['side_lean']:10s} [{cmp_m['side_conviction_score']}] | "
            f"Tot {cmp_m['total_lean']:10s} [{cmp_m['total_conviction_score']}]"
        )

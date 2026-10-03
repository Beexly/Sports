# Provenance: newregime module — QB Phase-2 rusty-backup archetype,
# SYS-31 (keenum + qb-pipeline).
#
# Rule (buildable-systems.md SYS-31):
#   layoff-return = >=10 targeted attempts after a >=8-week gap.
#   Blanket = the INDIVIDUAL player with the most separation-friendly role
#   (slot / receiving RB / WR1) — NOT a positional checkdown lean. Return
#   games skew slightly MORE WR-heavy and LESS RB-heavy than the QB's career
#   baseline, so the blanket is a named player, not "throw to RBs".
#
# Source docs: fantasy/research/2026-09-24/keenum-target-splits.md:23,97,99-159;
#               reasoning-layer/drafts/qb-pipeline-spec.md:5,17,25;
#               ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md
#               (SYS-31).
#
# Acceptance gate: backtest on 2024-2025 backup-QB returns before the archetype
# enters the 8-dim vector (n=323 targets / 10 games is suggestive, not
# predictive — keenum:167). No real 2024-2025 return data exists in this
# sandbox, so the RULE is implemented for real and the GATE is UNTESTED —
# QUEUED FOR EVALUATION (INGEST-AND-LEARN doctrine: never SKIP/DEAD).

"""QB Phase-2 rusty-backup archetype (SYS-31)."""

STATUS_UNTESTED = "UNTESTED — QUEUED FOR EVALUATION"

LAYOFF_WEEKS_MIN = 8
RETURN_ATTEMPTS_MIN = 10

# Separation-friendly roles eligible for the blanket designation.
BLANKET_ROLES = ("slot", "receiving_rb", "wr1")


def is_layoff_return(layoff_weeks, targeted_attempts):
    """True iff this is a layoff-return game: >=10 targeted attempts after a
    >=8-week gap (SYS-31 rule). Pure rule — no data needed."""
    return layoff_weeks >= LAYOFF_WEEKS_MIN and targeted_attempts >= RETURN_ATTEMPTS_MIN


def blanket_candidate(player_targets, player_roles):
    """Pick the blanket: the INDIVIDUAL player with the most separation-friendly
    role, by targets, among slot / receiving-RB / WR1.

    player_targets: {player_id: targets}; player_roles: {player_id: role}.
    Returns the player_id with max targets among BLANKET_ROLES, or None.

    NOT a positional checkdown lean: return games skew MORE WR-heavy and LESS
    RB-heavy than career baseline, so we name a player — we never emit
    "lean RB checkdowns".
    """
    best, best_t = None, -1
    for player, targets in player_targets.items():
        role = player_roles.get(player)
        if role not in BLANKET_ROLES:
            continue
        if targets > best_t:
            best, best_t = player, targets
    return best


def archetype_flag(qb_id, layoff_weeks, targeted_attempts,
                   player_targets, player_roles):
    """Full SYS-31 archetype output for the 8-dim vector input.

    Returns dict with the layoff-return flag and the blanket candidate.
    The acceptance gate (2024-2025 backtest) is UNTESTED — the flag is
    computed, but vector entry is gated.
    """
    layoff = is_layoff_return(layoff_weeks, targeted_attempts)
    return {
        "qb_id": qb_id,
        "is_layoff_return": layoff,
        "blanket_candidate": blanket_candidate(player_targets, player_roles) if layoff else None,
        "rule": (f"layoff-return = >={RETURN_ATTEMPTS_MIN} targeted attempts "
                 f"after >={LAYOFF_WEEKS_MIN}-week gap"),
        "blanket_rule": ("individual player, most separation-friendly role "
                         f"{BLANKET_ROLES}; NOT a positional checkdown lean"),
        "acceptance_gate": ("backtest on 2024-2025 backup-QB returns before "
                            "entering the vector (n=323 targets/10 games is "
                            "suggestive, not predictive)"),
        "gate_status": STATUS_UNTESTED,
        "gate_cleared": False,
        "provenance": "SYS-31 (keenum + qb-pipeline); buildable-systems.md",
    }


def research_lane_status():
    """SYS-31 gate status for research_lanes_status()."""
    return {
        "name": "QB Phase-2 rusty-backup archetype",
        "sys_id": "SYS-31",
        "summary": ("layoff-return rule + individual-player blanket "
                    "designation for the 8-dim vector"),
        "gate": ("backtest on 2024-2025 backup-QB returns before entering "
                 "the vector"),
        "status": STATUS_UNTESTED,
        "gate_cleared": False,
        "research_grade": False,  # the RULE is implemented; the GATE is pending
        "production_use": "gated: rule implemented, vector entry pending backtest",
    }

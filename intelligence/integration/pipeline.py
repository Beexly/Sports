# PROVENANCE: implements reasoning-depth-spec.md §4 L2 (cross-stat correlation) and L3
# (causal chains, every link sourced, breaking conditions listed), §3 (the worked 5-step chain:
# stat retrieval → cross-signal correlation → causal chain → adversarial verification → synthesis).
# Research basis:
# - c09-map.md #2 (QB vs-blitz/pressure/coverage splits as matchup features), #5 (scheme
#   fingerprints + OL injury flags as projection priors), #11 (EPA repair kit — team-quality
#   bias: never compare raw rates across teams without adjustment), #14 (game-clustered
#   uncertainty — correlations are COMPUTED only on stated samples, never asserted)
# - tnf-intelligence-program-2026-10-01.md §2 (OL → scheme → QB hierarchy gates the chains)
"""Level-by-level reasoning construction: L1 claims -> L2 correlations -> L3 causal chains."""
from __future__ import annotations

from typing import Any, Optional

from .providers import DataGapError, ProviderRegistry
from .types import (
    BreakingCondition,
    CausalChain,
    CausalLink,
    Claim,
    Correlation,
    SpecialistOutput,
    Verification,
    VERIFICATION_PRECEDENCE,
)

# Thresholds from the reasoning-depth spec's worked example (spec §3 step 4, §6.1).
# A quick-game rate at/above this with a sub-threshold TTT neutralizes a pass rush:
# the breaking conditions of any "pressure lands" thesis.
QUICKGAME_NEUTRALIZE_THRESHOLD = 0.60
TTT_NEUTRALIZE_THRESHOLD_S = 2.3
# Falsifiers of the neutralization chain itself (spec §6.1 example L3 link).
CHAIN_BREAK_TTT_S = 2.6
CHAIN_BREAK_QUICKGAME = 0.55
TOP_PASS_RUSH_CUTOFF = 10


def weakest_verification(*vs: Verification) -> Verification:
    """A chain is only as strong as its weakest link (spec §4 L3, §8 T5)."""
    return min(vs, key=lambda v: VERIFICATION_PRECEDENCE[v])


def build_l1(outputs: dict[str, SpecialistOutput]) -> list[Claim]:
    claims: list[Claim] = []
    for agent in ("stat", "scheme", "behavior", "signal"):
        out = outputs.get(agent)
        if out:
            claims.extend(out.claims)
    return claims


def build_l2_correlations(outputs: dict[str, SpecialistOutput],
                          league_avgs: Optional[dict[str, float]] = None
                          ) -> list[Correlation]:
    """Cross-stat correlations (spec §4 L2). Only COMPUTED on stated samples — never
    asserted (map #14: play-level resampling lies; same discipline for correlations)."""
    league_avgs = league_avgs or {}
    correlations: list[Correlation] = []
    scheme_claims = {c.text: c for c in outputs.get("scheme", SpecialistOutput(agent="scheme")).claims}

    for text, claim in scheme_claims.items():
        if "quick-game rate" in text and claim.value is not None:
            team = text.split(" quick-game")[0]
            lg = league_avgs.get("quickgame_rate")
            if lg is not None:
                delta = claim.value - lg
                correlations.append(Correlation(
                    signals=(f"{team}_quickgame_{claim.value:.3f}", f"league_avg_{lg:.3f}"),
                    method=Verification.COMPUTED,
                    note=f"{team} quick-game rate {delta:+.3f} vs league average"))
            else:
                correlations.append(Correlation(
                    signals=(f"{team}_quickgame_{claim.value:.3f}",),
                    method=Verification.SINGLE_SOURCE,
                    note="no league-average baseline available; delta not computed"))
        if "avg air yards" in text and claim.value is not None:
            team = text.split(" avg air")[0]
            correlations.append(Correlation(
                signals=(f"{team}_avg_air_yards_{claim.value:.2f}",),
                method=claim.verification,
                note="depth-of-target proxy for time-to-throw until TTT is sourced"))
    return correlations


def build_causal_chains(game: dict[str, Any], providers: ProviderRegistry,
                        league_avgs: Optional[dict[str, float]] = None
                        ) -> tuple[list[CausalChain], dict[str, list[BreakingCondition]]]:
    """Build L3 causal chains from provider data (spec §4 L3).

    Pattern (spec §3): OL deficiency -> scheme adjustment -> pressure neutralization.
    Returns (chains, link_id -> thesis breaking conditions).

    The thesis being tested is "{RUSH}_pressure_lands" — e.g. "pit_pressure_lands".
    Its breaking conditions (spec §3 step 4): quick-game >= 0.60 AND TTT <= 2.3s
    => sacks don't materialize => the pressure thesis is dead.
    """
    chains: list[CausalChain] = []
    link_conditions: dict[str, list[BreakingCondition]] = {}
    away, home = game.get("away"), game.get("home")
    defense = game.get("defense", {}) or {}
    playcallers = game.get("playcallers", {}) or {}
    week, season = game.get("week", 0), game.get("season", 0)

    for team, opp in ((home, away), (away, home)):
        if not team or not opp or providers.ol is None or providers.coaching is None:
            continue
        try:
            ol = providers.ol.get_ol_state(team, week, season)
        except DataGapError:
            continue
        try:
            fp = providers.coaching.get_scheme_fingerprint(team, week, season)
        except DataGapError:
            continue
        if not ol.starters_out:
            continue
        if fp.quickgame_rate is None or fp.quickgame_rate < QUICKGAME_NEUTRALIZE_THRESHOLD:
            continue
        rush_rank = (defense.get(opp) or {}).get("pass_rush_rank")
        if rush_rank is None or rush_rank > TOP_PASS_RUSH_CUTOFF:
            continue

        n_out = len(ol.starters_out)
        out_list = ", ".join(ol.starters_out)
        caller = playcallers.get(team, f"{team} playcaller")
        ay = f", {fp.avg_air_yards:.2f} air yards" if fp.avg_air_yards is not None else ""
        link_id = f"{opp.lower()}_pressure_lands"
        link = CausalLink(
            cause=f"{team} missing {n_out} interior OL starter(s) ({out_list})",
            mechanism=f"{caller} compensates with quick game "
                      f"({fp.quickgame_rate:.3f} rate W1-3{ay})",
            outcome=f"{opp} pressure rate projects below season avg",
            verification=weakest_verification(ol.verification, fp.verification,
                                              Verification.INFERENCE),
            breaking_condition=f"TTT > {CHAIN_BREAK_TTT_S}s or quick-game < {CHAIN_BREAK_QUICKGAME}",
            id=link_id,
        )
        chains.append(CausalChain(
            links=(link,),
            conclusion=f"{opp}'s pass rush is neutralized by {team}'s quick-game adjustment; "
                       f"any 'pressure lands' thesis on this game is suspect."))

        conditions = [BreakingCondition(
            description="quick game fast enough to beat the rush (spec §3 step 4)",
            metric="quickgame_rate", operator=">=",
            threshold=QUICKGAME_NEUTRALIZE_THRESHOLD,
            observed=fp.quickgame_rate, verification=Verification.COMPUTED)]
        ttt = fp.ttt_seconds
        conditions.append(BreakingCondition(
            description="time-to-throw under the pressure-conversion threshold",
            metric="ttt_seconds", operator="<=",
            threshold=TTT_NEUTRALIZE_THRESHOLD_S,
            observed=ttt,
            verification=Verification.COMPUTED if ttt is not None else Verification.INFERENCE))
        link_conditions.setdefault(link_id, []).extend(conditions)

    return chains, link_conditions


def detect_scheme_matchup_conflict(chains: list[CausalChain],
                                   outputs: dict[str, SpecialistOutput]) -> bool:
    """CONFLICT when the stat track asserts a strength the scheme track neutralizes
    (spec §5: track disagreement escalates to L4 automatically)."""
    if not chains:
        return False
    stat_text = " ".join(c.text for c in outputs.get("stat", SpecialistOutput(agent="stat")).claims)
    # A neutralization chain exists while the stat track still prices the raw strength.
    return "pass rush" in stat_text.lower() or "pressure" in stat_text.lower()

# Provenance: reasoning-depth-spec.md §6.1 (the Week 4 Steelers–Browns pre-kickoff
# worked example), §8 T1 (the pressure-funnel stack must die). Pre-kickoff
# observed values: quickgame_rate 0.639, ttt_seconds 2.31.
#
# Thesis falsifiers (the observable facts that kill the recommended card):
#   quickgame_rate >= 0.55  → 0.639 MET → the funnel is neutralized
#   ttt_seconds   <= 2.6    → 2.31  MET → the funnel is neutralized
# Either met falsifies the shared link `pit_pressure_lands` (OR semantics).

from reasoning.enums import Verification
from reasoning.interfaces import AnalysisRequest, DataContext, GameRequest
from reasoning.schemas import BetLeg, BreakingCondition, CausalChain, CausalLink
from reasoning.enums import Exposure, ReasoningDepth

QUICKGAME_RATE = 0.639
TTT_SECONDS = 2.31

SHARED_LINK = "pit_pressure_lands"


def funnel_chain() -> CausalChain:
    return CausalChain(
        id="pit_pressure_chain",
        links=[
            CausalLink(
                id="pit_edge_wins",
                cause="PIT edge rushers win vs CLE tackles",
                mechanism="Garrett-less CLE line allows pressure at league-worst rate",
                outcome="pressure generated on >35% of CLE dropbacks",
                verification=Verification.CORPUS,
            ),
            CausalLink(
                id=SHARED_LINK,
                cause="PIT pressure arrives",
                mechanism="CLE protection breaks down; QB forced off schedule",
                outcome="CLE offense collapses → PIT covers, total stays under",
                verification=Verification.INFERENCE,  # load-bearing inference → weak link (T5)
                breaking_conditions=[
                    BreakingCondition(
                        id="cond_quickgame_neutralizes",
                        text="CLE quick-game rate >= 0.55 neutralizes the pressure funnel",
                        metric="quickgame_rate",
                        op=">=",
                        threshold=0.55,
                    ),
                    BreakingCondition(
                        id="cond_ttt_neutralizes",
                        text="CLE TTT <= 2.6s neutralizes the pressure funnel",
                        metric="ttt_seconds",
                        op="<=",
                        threshold=2.6,
                    ),
                ],
            ),
        ],
    )


def funnel_legs() -> list[BetLeg]:
    sides = ["PIT -2.5", "PIT moneyline", "CLE team total under 17.5", "game total under 41.5"]
    return [
        BetLeg(id=f"funnel_leg_{i + 1}", description=side, exposure=1.0,
               causal_link_ids=[SHARED_LINK, "pit_edge_wins"])
        for i, side in enumerate(sides)
    ]


def pre_kickoff_observations() -> dict[str, float]:
    return {"quickgame_rate": QUICKGAME_RATE, "ttt_seconds": TTT_SECONDS}


def t1_request() -> AnalysisRequest:
    return AnalysisRequest(
        game=GameRequest(away="PIT", home="CLE", week=4, season=2026),
        question="Does the PIT pressure-funnel stack survive pre-kickoff adversary review?",
        exposure=Exposure.CARD,          # a multi-leg card is on the line → L5 required
        requested_depth=ReasoningDepth.L5,
        legs=funnel_legs(),
    )


def t1_context() -> DataContext:
    return DataContext(
        observations=pre_kickoff_observations(),
        chains=[funnel_chain()],
        market={"spread": "PIT -2.5", "total": 41.5},
        checklist_hints={
            "offensive_line": "CLEAR",
            "coaching_scheme": "CLEAR",
            "qb_behavior": "CLEAR",
            "trust_signals": "CLEAR",
            "scheme_matchup": "CLEAR",
        },
    )

"""Adversarial self-critique: the counter-thesis generator.

Doctrine: every thesis publishes with its strongest counter ON THE CARD.
If the engine cannot articulate the counter, it does not understand the
thesis. The counter must be as specific as the thesis - a named mechanism,
not a doubt.

The counter is DERIVED from the thesis's mechanism entries: for each named
mechanism there is a structural opposite (the mechanism's own prerequisites
failing, or the replacement being better than the population). Where the
catalog cannot supply one, the counter says so as a named gap instead of
inventing confidence.
"""

from __future__ import annotations

from typing import Any

# mechanism name -> counter-mechanism builder
COUNTERS: dict[str, dict[str, Any]] = {
    "Interior Vacuum": {
        "name": "Plus-Replacement Absorption",
        "mechanism": (
            "the backup interior defender is not a replacement but a platoon piece who "
            "absorbs the double-team role at 85-95% of the incumbent's function; the vacuum "
            "is a rotation narrative, not a production narrative"
        ),
        "condition": "backup has started 6+ games this season OR played 40%+ of snaps",
        "counter_breaks_thesis": "backup snap share < 50% or a clearly sub-replacement PFF/grade delta",
        "thesis_breaks_counter": "backup visibly graded below replacement level in prior starts",
    },
    "Pre-snap Declaration Leak": {
        "name": "Elite Pre-snap Processing",
        "mechanism": (
            "the opposing QB is elite at pre-snap recognition; the declaration penalty is "
            "smaller for him than for the population - he hot-raises into the declaration "
            "and the defense loses the disguise advantage it never had vs him"
        ),
        "condition": "opposing QB ranks top-6 in play-action/quick-game efficiency or TTT < 2.4s",
        "counter_breaks_thesis": "QB's TTT rises above 2.6s or blitz rate > 30% disrupts the reads",
        "thesis_breaks_counter": "QB's quick-game success rate falls vs four-man rushes this season",
    },
    "Disguise Displacement": {
        "name": "Four-Man Sufficiency",
        "mechanism": (
            "the opposing protection does not slide - it uses max/hot protection, so the "
            "disguise package was never going to work; the EDGE's rush alone was the whole "
            "threat and it is genuinely weakened"
        ),
        "condition": "opponent faces max-protection rates above league average",
        "counter_breaks_thesis": "opponent slides on 60%+ of pass sets (then Disguise Displacement applies)",
        "thesis_breaks_counter": "opposing QB's first-read window already extends past 2.8s",
    },
    "Shadow Loss": {
        "name": "Bracket Over Talent",
        "mechanism": (
            "the defense answers the shadow loss with a paid bracket: safety help over the "
            "top of the WR1 at all times; WR1's targets rise but his efficiency falls - the "
            "offense's SECOND option becomes the actual beneficiary"
        ),
        "condition": "defense has safety depth to pay for brackets",
        "counter_breaks_thesis": "WR1 efficiency RISES despite doubled volume (bracket not paid)",
        "thesis_breaks_counter": "WR2/TE target share rises materially while WR1 aDoT falls",
    },
    "Role Redistribution": {
        "name": "Formation Continuity",
        "mechanism": (
            "the offense changes formation, not roles: the motion piece's job is absorbed by "
            "pre-snap shifts the QB commands himself, and target concentration does not "
            "materialize - the distribution stays flat"
        ),
        "condition": "offense runs shift/motion at top-5 rates",
        "counter_breaks_thesis": "one receiver's target share jumps 8+ points",
        "thesis_breaks_counter": "target distribution variance stays within 3 points of baseline",
    },
    "Identification Debt": {
        "name": "Silent Count Mastery",
        "mechanism": (
            "the center's communication loss is mitigated by a veteran guard who has called "
            "protections before, plus silent counts at home; the debt is paid down by experience"
        ),
        "condition": "replacement OL experience >= 2 seasons of starts",
        "counter_breaks_thesis": "disguised-pressure success rate vs this offense stays league-average",
        "thesis_breaks_counter": "protection grade drops a full tier vs pressure-heavy looks",
    },
    "Underneath Exposure": {
        "name": "Five-Up Structural Answer",
        "mechanism": (
            "the defense plays five-underneath with four straight rushers by design - the "
            "'exposure' IS the plan: concede checkdowns, kill YAC with tackling, force 8+ "
            "play drives into mistakes"
        ),
        "condition": "defense ranks top-10 in YAC allowed per completion",
        "counter_breaks_thesis": "checkdowns convert drives at a top-10 rate",
        "thesis_breaks_counter": "defense's checkdown YAC allowed rises materially",
    },
    "Deep-Half Rotation Gap": {
        "name": "Box Safety Range",
        "mechanism": (
            "the replacement safety is a genuine range player moved from box; the rotation "
            "gap is filled by a different athlete, not a downgrade - the disguise loss is "
            "real but the coverage loss is not"
        ),
        "condition": "replacement's prior free-safety reps > 200 snaps",
        "counter_breaks_thesis": "opponent explosive pass rate stays flat",
        "thesis_breaks_counter": "replacement's range metrics grade plus in prior deep-half reps",
    },
}


def build_counter(mechanisms: list[dict[str, Any]]) -> dict[str, Any]:
    """Derive the strongest counter to a composed mechanism list.

    Returns {mechanism, steelman, condition, counter_breaks_thesis,
    thesis_breaks_counter, named_gap?}. If no counter exists for any
    mechanism, the counter states that honestly.
    """
    for m in mechanisms:
        name = m.get("mechanism") or ""
        c = COUNTERS.get(name)
        if c:
            return {
                "against_mechanism": name,
                "counter_mechanism": c["name"],
                "steelman": c["mechanism"],
                "condition": c["condition"],
                "counter_breaks_thesis": c["counter_breaks_thesis"],
                "thesis_breaks_counter": c["thesis_breaks_counter"],
            }
    return {
        "against_mechanism": mechanisms[0]["mechanism"] if mechanisms else "(none)",
        "counter_mechanism": None,
        "steelman": "No structural counter is catalogued for this mechanism pair; the counter-thesis must come from the data (precedent), not the catalog.",
        "condition": "precedent section supplies the counter evidence",
        "counter_breaks_thesis": "(precedent-dependent)",
        "thesis_breaks_counter": "(precedent-dependent)",
        "named_gap": "counter catalog has no entry for this mechanism",
    }

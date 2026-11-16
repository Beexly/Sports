"""Declarative agent org chart & cross-model consensus rail (agent-org-chart + clowder-ai)."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

ModelLane = Literal["FREE_WORKHORSE", "FRONTIER_REASONING"]


@dataclass(frozen=True, slots=True)
class AgentOrgNode:
    """Single role in GSE's hierarchical multi-agent roster."""

    agent_id: str
    role: str
    reports_to: str | None
    model_lane: ModelLane
    schedule_window: str


@dataclass(frozen=True, slots=True)
class ModelVote:
    """Independent model family probability estimate for multi-model consensus."""

    model_id: str
    source_family: str
    prob: float
    confidence_rank: int = 1


@dataclass(frozen=True, slots=True)
class ClowderConsensusVerdict:
    """Outcome of the multi-agent consensus rail blocking solo-source publication."""

    approved: bool
    blended_prob: float
    agreement_count: int
    effective_edge: float
    reason: str


DEFAULT_GSE_ORG_CHART: tuple[AgentOrgNode, ...] = (
    AgentOrgNode(
        agent_id="jarvis-ceo",
        role="Executive Coordinator & Final Gate Authority",
        reports_to=None,
        model_lane="FRONTIER_REASONING",
        schedule_window="THREE_NOON_AND_T90M",
    ),
    AgentOrgNode(
        agent_id="stage0-feed-auditor",
        role="Magika & LangExtract Injury/IR Feed Inspector",
        reports_to="jarvis-ceo",
        model_lane="FREE_WORKHORSE",
        schedule_window="CONTINUOUS_15M",
    ),
    AgentOrgNode(
        agent_id="stage2-situational-parser",
        role="Coaching Tendency & Weather Parser",
        reports_to="jarvis-ceo",
        model_lane="FREE_WORKHORSE",
        schedule_window="PRE_SIM_DAILY",
    ),
    AgentOrgNode(
        agent_id="jev-snap-synthesizer",
        role="Full-Game Snap-by-Snap Situational Reasoner",
        reports_to="jarvis-ceo",
        model_lane="FRONTIER_REASONING",
        schedule_window="THREE_NOON_AND_T90M",
    ),
    AgentOrgNode(
        agent_id="osv-guardrail-verifier",
        role="Polyglot Security & Test-Wall Verifier",
        reports_to="jarvis-ceo",
        model_lane="FREE_WORKHORSE",
        schedule_window="PRE_COMMIT_AND_CI",
    ),
)


def validate_agent_org_chart(
    nodes: Sequence[AgentOrgNode],
    min_free_workhorse_share: float = 0.60,
) -> tuple[bool, tuple[str, ...]]:
    """Validates single root, acyclic reporting tree, and Zero-Waste model-lane mix."""
    if not nodes:
        return False, ("empty_org_chart",)

    errors: list[str] = []
    by_id: dict[str, AgentOrgNode] = {}
    for node in nodes:
        if node.agent_id in by_id:
            errors.append(f"duplicate_agent_id:{node.agent_id}")
        by_id[node.agent_id] = node

    roots = [n for n in nodes if n.reports_to is None]
    if len(roots) != 1:
        errors.append(f"expected_single_root_got_{len(roots)}")

    for node in nodes:
        if node.reports_to is not None and node.reports_to not in by_id:
            errors.append(f"missing_supervisor:{node.agent_id}->{node.reports_to}")

    for node in nodes:
        seen: set[str] = set()
        cursor: AgentOrgNode | None = node
        while cursor is not None and cursor.reports_to is not None:
            if cursor.agent_id in seen:
                errors.append(f"reporting_cycle:{node.agent_id}")
                break
            seen.add(cursor.agent_id)
            cursor = by_id.get(cursor.reports_to)

    workhorse_count = sum(1 for n in nodes if n.model_lane == "FREE_WORKHORSE")
    workhorse_share = workhorse_count / len(nodes)
    if workhorse_share < min_free_workhorse_share:
        errors.append(
            f"frontier_cost_overweight:{workhorse_share:.2f}<{min_free_workhorse_share:.2f}"
        )

    return len(errors) == 0, tuple(errors)


def evaluate_clowder_consensus_rail(
    votes: Sequence[ModelVote],
    market_fair_prob: float,
    min_agreement: int = 2,
    solo_shrinkage: float = 0.35,
    min_edge: float = 0.015,
) -> ClowderConsensusVerdict:
    """Enforces cross-model agreement >= 2 and shrinks solo-source edges cleanly."""
    if not votes:
        return ClowderConsensusVerdict(
            approved=False,
            blended_prob=market_fair_prob,
            agreement_count=0,
            effective_edge=0.0,
            reason="no_model_votes",
        )

    clamped_market = max(0.01, min(0.99, market_fair_prob))
    families = {v.source_family.strip().lower() for v in votes if v.source_family.strip()}
    agreement_count = len(families)

    raw_probs = [max(0.01, min(0.99, v.prob)) for v in votes]
    mean_prob = sum(raw_probs) / len(raw_probs)

    if agreement_count < min_agreement:
        shrunk_prob = clamped_market + (mean_prob - clamped_market) * solo_shrinkage
        effective_edge = shrunk_prob - clamped_market
        return ClowderConsensusVerdict(
            approved=False,
            blended_prob=round(shrunk_prob, 6),
            agreement_count=agreement_count,
            effective_edge=round(effective_edge, 6),
            reason=f"solo_source_requires_agreement>={min_agreement}",
        )

    effective_edge = mean_prob - clamped_market
    approved = abs(effective_edge) >= min_edge
    reason = "consensus_edge_cleared" if approved else "edge_below_minimum_threshold"
    return ClowderConsensusVerdict(
        approved=approved,
        blended_prob=round(mean_prob, 6),
        agreement_count=agreement_count,
        effective_edge=round(effective_edge, 6),
        reason=reason,
    )


@dataclass(frozen=True, slots=True)
class AgentBudgetLedger:
    """Token and spend accounting entry modeled after paperclipai/paperclip."""

    agent_id: str
    tokens_used: int
    token_limit: int
    paid_usd_delta: float = 0.0
    max_paid_usd: float = 0.0


@dataclass(frozen=True, slots=True)
class PaperclipBudgetVerdict:
    """Budget guardrail evaluation halting any overspending or runaway agent."""

    within_budget: bool
    total_tokens: int
    total_paid_usd: float
    halted_agents: tuple[str, ...]


def evaluate_paperclip_budget_guard(
    ledgers: Sequence[AgentBudgetLedger],
) -> PaperclipBudgetVerdict:
    """Enforces per-agent token ceilings and zero-waste paid-spend limits."""
    halted: list[str] = []
    total_tokens = 0
    total_paid = 0.0

    for entry in ledgers:
        total_tokens += max(0, entry.tokens_used)
        total_paid += max(0.0, entry.paid_usd_delta)
        if entry.tokens_used > entry.token_limit or entry.paid_usd_delta > entry.max_paid_usd:
            halted.append(entry.agent_id)

    return PaperclipBudgetVerdict(
        within_budget=len(halted) == 0,
        total_tokens=total_tokens,
        total_paid_usd=round(total_paid, 6),
        halted_agents=tuple(halted),
    )

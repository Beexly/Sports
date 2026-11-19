"""Teammate roster routines (OpenMausBot + rakazo) and OpenCode/Stitch preflight."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

RoutineCadence = Literal["CONTINUOUS_15M", "THREE_NOON", "T90M_WINDOW"]


@dataclass(frozen=True, slots=True)
class TeammateContactCard:
    """Persistent teammate profile with isolated sandbox root & scheduled routine."""

    handle: str
    display_name: str
    workspace_dir: str
    cadence: RoutineCadence
    memory_namespace: str


@dataclass(frozen=True, slots=True)
class PreflightContractReport:
    """Preflight gate validating OpenCode LSP cleanliness, Stitch WCAG & RAG citations."""

    passed: bool
    warnings: tuple[str, ...]


def verify_lsp_and_stitch_contract(
    teammates: Sequence[TeammateContactCard],
    lsp_error_count: int,
    rag_citation_count: int,
    wcag_violations: int,
) -> PreflightContractReport:
    """Checks teammate workspace uniqueness alongside LSP, RAG, and WCAG health."""
    warnings: list[str] = []
    seen_workspaces: set[str] = set()

    for card in teammates:
        normalized_ws = card.workspace_dir.strip().lower()
        if not normalized_ws:
            warnings.append(f"empty_workspace:{card.handle}")
        elif normalized_ws in seen_workspaces:
            warnings.append(f"shared_workspace_conflict:{card.handle}")
        seen_workspaces.add(normalized_ws)

    if lsp_error_count > 0:
        warnings.append(f"opencode_lsp_errors:{lsp_error_count}")
    if rag_citation_count < 1:
        warnings.append("missing_rag_grounding_citations")
    if wcag_violations > 0:
        warnings.append(f"stitch_wcag_violations:{wcag_violations}")

    return PreflightContractReport(
        passed=len(warnings) == 0,
        warnings=tuple(warnings),
    )

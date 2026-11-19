"""Deterministic multi-tier agent skill evaluator inspired by NVIDIA SkillEvaluator."""

from __future__ import annotations

import re
from collections.abc import Sequence
from dataclasses import dataclass

_UNSAFE_SKILL_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("destructive_rm_rf", re.compile(r"\brm\s+-rf\s+/(?:\s|$)")),
    ("bypass_dod_hook", re.compile(r"\bGSE_DOD_SKIP\s*=\s*1\b")),
    ("hardcoded_stripe_secret", re.compile(r"\bsk_(?:live|test)_[A-Za-z0-9]{12,}\b")),
    ("curl_pipe_shell", re.compile(r"curl\s+[^|]+\|\s*(?:ba)?sh\b")),
)

_TOKEN_RE = re.compile(r"[a-z0-9_]{3,}")


@dataclass(frozen=True, slots=True)
class SkillSpec:
    """Metadata and instruction body for a registered GSE/agent skill."""

    name: str
    description: str
    instructions: str
    allowed_tools: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class SkillEvalResult:
    """Validation scorecard for a single SkillSpec."""

    name: str
    passed: bool
    rubric_score: float
    security_violations: tuple[str, ...]
    overlap_warnings: tuple[str, ...]


def _tokenize(text: str) -> set[str]:
    return set(_TOKEN_RE.findall(text.lower()))


def evaluate_skill_catalog(
    skills: Sequence[SkillSpec],
    max_jaccard_overlap: float = 0.65,
) -> list[SkillEvalResult]:
    """Evaluates skill clarity, security hygiene, and pairwise instruction overlap."""
    if not 0.0 < max_jaccard_overlap <= 1.0:
        raise ValueError("max_jaccard_overlap must fall in (0, 1].")

    token_sets = [_tokenize(f"{s.description} {s.instructions}") for s in skills]
    results: list[SkillEvalResult] = []

    for idx, skill in enumerate(skills):
        violations: list[str] = []
        body = f"{skill.description}\n{skill.instructions}"
        for label, pattern in _UNSAFE_SKILL_PATTERNS:
            if pattern.search(body):
                violations.append(label)

        score = 0.0
        if skill.name.strip():
            score += 0.25
        if len(skill.description.strip()) >= 20:
            score += 0.25
        if len(skill.instructions.strip()) >= 40:
            score += 0.30
        if skill.allowed_tools:
            score += 0.20

        overlaps: list[str] = []
        own_tokens = token_sets[idx]
        if own_tokens:
            for other_idx, other in enumerate(skills):
                if other_idx == idx:
                    continue
                other_tokens = token_sets[other_idx]
                union = own_tokens | other_tokens
                if not union:
                    continue
                jaccard = len(own_tokens & other_tokens) / len(union)
                if jaccard > max_jaccard_overlap:
                    overlaps.append(f"{other.name}:{jaccard:.2f}")

        passed = len(violations) == 0 and score >= 0.70
        results.append(
            SkillEvalResult(
                name=skill.name,
                passed=passed,
                rubric_score=round(score, 4),
                security_violations=tuple(violations),
                overlap_warnings=tuple(overlaps),
            )
        )

    return results

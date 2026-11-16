"""Character-span grounded football knowledge graph extractor inspired by DeepKE."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

RelationKind = Literal[
    "VACATES_VOLUME_TO",
    "SHADOWED_BY",
    "DEPLOYS_SHELL",
    "WEATHER_IMPACT",
]

_VACATES_RE = re.compile(
    r"\b([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,2})\s+(?:ruled\s+out|inactive|out)\b"
    r"[^.\n]{0,80}?\bvacates\s+(?:targets|carries|volume)\s+to\s+"
    r"([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,2})\b"
)

_SHADOW_RE = re.compile(
    r"\b([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,2})\s+shadowed\s+by\s+"
    r"([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,2})\b"
)

_SHELL_RE = re.compile(
    r"\b([A-Z]{2,4}|[A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+)?)\s+deploys\s+"
    r"(Cover-1|Cover-2|Cover-3|Two-High|Man Blitz)\b"
)


@dataclass(frozen=True, slots=True)
class KnowledgeTriple:
    """Grounded relation/attribute triple mapped strictly to source char offsets."""

    subject: str
    relation: RelationKind
    object_entity: str
    attribute: str
    char_start: int
    char_end: int
    source_quote: str


def extract_football_knowledge_triples(text: str) -> list[KnowledgeTriple]:
    """Extracts source-grounded player, coverage, and scheme triples from notes."""
    triples: list[KnowledgeTriple] = []

    for match in _VACATES_RE.finditer(text):
        triples.append(
            KnowledgeTriple(
                subject=match.group(1),
                relation="VACATES_VOLUME_TO",
                object_entity=match.group(2),
                attribute="injury_redistribution",
                char_start=match.start(),
                char_end=match.end(),
                source_quote=text[match.start() : match.end()],
            )
        )

    for match in _SHADOW_RE.finditer(text):
        triples.append(
            KnowledgeTriple(
                subject=match.group(1),
                relation="SHADOWED_BY",
                object_entity=match.group(2),
                attribute="primary_cb_shadow",
                char_start=match.start(),
                char_end=match.end(),
                source_quote=text[match.start() : match.end()],
            )
        )

    for match in _SHELL_RE.finditer(text):
        triples.append(
            KnowledgeTriple(
                subject=match.group(1),
                relation="DEPLOYS_SHELL",
                object_entity=match.group(2),
                attribute="defensive_scheme",
                char_start=match.start(),
                char_end=match.end(),
                source_quote=text[match.start() : match.end()],
            )
        )

    triples.sort(key=lambda item: (item.char_start, item.char_end))
    return triples

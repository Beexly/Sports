"""Deterministic coverage classifier over detected player geometry.

The YOLO extraction step is represented by a small ``Detector`` protocol so
this module can run in the sidecar with a real model or in tests with synthetic
All-22 boxes. The classifier itself is transparent and auditable: geometry maps
to safety depth, corner leverage, box count, and then one of the handoff's
coverage labels.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal, Protocol, Sequence

Coverage = Literal["Cover 0", "Cover 1", "Cover 2", "Cover 3", "Cover 4/Quarters", "Cover 6", "Man"]


@dataclass(frozen=True)
class PlayerBox:
    x: float
    y: float
    team: Literal["offense", "defense"]
    confidence: float = 1.0


@dataclass(frozen=True)
class Frame:
    time: float
    players: Sequence[PlayerBox]


class Detector(Protocol):
    def detect(self, frame: Frame) -> Sequence[PlayerBox]: ...


@dataclass(frozen=True)
class Geometry:
    safety_depth: float
    corner_leverage: float
    box_count: int
    high_safety_count: int


def geometry(players: Sequence[PlayerBox], field_width: float = 100.0, field_depth: float = 60.0) -> Geometry:
    defense = [player for player in players if player.team == "defense"]
    if not defense:
        raise ValueError("at least one defensive player is required")
    safeties = [player for player in defense if player.y < field_depth * 0.30]
    high_safeties = [player for player in safeties if player.y < field_depth * 0.18]
    corners = [player for player in defense if player.x < field_width * 0.25 or player.x > field_width * 0.75]
    corner_leverage = 0.0 if not corners else sum(abs(player.x - (field_width / 2 if player.x < field_width / 2 else field_width)) for player in corners) / len(corners)
    box_count = sum(1 for player in defense if player.y < field_depth * 0.45)
    return Geometry(
        safety_depth=min(1.0, max(0.0, (field_depth * 0.30 - min((p.y for p in safeties), default=field_depth * 0.30)) / max(field_depth * 0.30, 1e-9))),
        corner_leverage=min(1.0, corner_leverage / max(field_width / 2, 1e-9)),
        box_count=box_count,
        high_safety_count=len(high_safeties),
    )


def classify_geometry(value: Geometry) -> Coverage:
    if value.high_safety_count >= 2 and value.box_count <= 7:
        return "Cover 3"
    if value.high_safety_count == 1 and value.box_count <= 6 and value.corner_leverage > 0.45:
        return "Cover 1 Man"
    if value.high_safety_count >= 2:
        return "Cover 2"
    if value.high_safety_count == 1 and value.box_count <= 7:
        return "Cover 1 Man"
    if value.box_count >= 8:
        return "Cover 0"
    if value.corner_leverage > 0.65:
        return "Cover 4/Quarters"
    return "Cover 6"


def classify_players(players: Sequence[PlayerBox]) -> Coverage:
    return classify_geometry(geometry(players))


@dataclass(frozen=True)
class PlayCoverage:
    preSnap: Coverage
    postSnap: Coverage
    disguised: bool


@dataclass(frozen=True)
class TeamCoverageSummary:
    coverage_distribution: dict[str, int]
    disguise_rate: float
    tendency_by_down_distance: dict[str, Coverage]


def analyze_play(frames: Sequence[Frame], detector: Detector | None = None) -> PlayCoverage:
    if len(frames) < 2:
        raise ValueError("a play needs pre-snap and post-snap frames")
    pre_players = detector.detect(frames[0]) if detector else frames[0].players
    post_players = detector.detect(frames[1]) if detector else frames[1].players
    pre = classify_players(pre_players)
    post = classify_players(post_players)
    return PlayCoverage(preSnap=pre, postSnap=post, disguised=pre != post)


def summarize_plays(plays: Sequence[tuple[PlayCoverage, int, int]]) -> TeamCoverageSummary:
    distribution: dict[str, int] = {}
    disguised = 0
    tendency: dict[str, Coverage] = {}
    for play, down, distance in plays:
        distribution[play.preSnap] = distribution.get(play.preSnap, 0) + 1
        disguised += int(play.disguised)
        tendency[f"{down}-{distance}"] = play.preSnap
    return TeamCoverageSummary(
        coverage_distribution=distribution,
        disguise_rate=disguised / len(plays) if plays else 0.0,
        tendency_by_down_distance=tendency,
    )


__all__ = [
    "Coverage",
    "Frame",
    "Geometry",
    "PlayerBox",
    "PlayCoverage",
    "TeamCoverageSummary",
    "analyze_play",
    "classify_geometry",
    "classify_players",
    "geometry",
    "summarize_plays",
]

"""Defensive coverage classification from player geometry (All-22 / broadcast).

What this module IS
-------------------
A deterministic, rule-based coverage classifier. It accepts player geometry
(either All-22 or broadcast-derived field coordinates), derives defensive
structure features (safety depth, corner leverage/cushion, box count), and
labels the look as one of::

    Cover 0 | Cover 1 | Cover 2 | Cover 3 | Cover 4-Quarters | Cover 6 | 1-Man

Both a **pre-snap** and a **post-snap** label are produced per play;
``disguised`` is true exactly when the two differ. Aggregation reports the
coverage distribution, the disguise rate, and down/distance tendencies.

What this module IS NOT
-----------------------
* It is **not** a trained coverage model. The labels come from transparent
  geometric thresholds (documented below), not from learned weights. They are
  a structured reading of the picture, not a calibrated posterior.
* It is **not** a probability. No field here is a win rate or an edge.
* It does **not** invent detections. The detector interface is injected; when
  the caller supplies no detector and no pre-computed geometry, the module
  raises :class:`CoverageDependencyError` (missing YOLO/OpenCV must produce a
  clear failure, never fabricated player positions).

Geometry contract
-----------------
Coordinates are **field coordinates in yards** after view normalisation:

* ``x``: lateral position, ``0`` at the left sideline (offense facing the
  right), field width 53.3.
* ``y``: downfield position, ``0`` at the line of scrimmage, positive toward
  the defense's end zone.

Both All-22 and broadcast pixel inputs are accepted by
:func:`normalize_geometry`, which maps them into this frame using the
supplied homography / sideline anchors. The classifier itself only ever sees
the normalised frame.

Derived features (thresholds are named constants)
-------------------------------------------------
* **safety_depth** — depth of identified safeties past the LOS.
* **corner leverage** — ``inside`` / ``outside`` / ``head_up`` plus a
  ``press`` / ``off`` / ``bail`` technique tag from the cushion.
* **box count** — defenders within ``BOX_YARDS`` of the LOS and between the
  tight-end widths.

Injection
---------
``PlayerDetector`` is the YOLO/OpenCV seam. Production wires a real detector;
tests inject a stub or pass geometry lists directly. A missing detector raises
:class:`CoverageDependencyError` rather than silently classifying an empty
field.
"""

from __future__ import annotations

import math
from collections import Counter
from dataclasses import dataclass, field
from typing import Literal, Protocol, Sequence, TypedDict

__all__ = [
    "BOX_YARDS",
    "COVER_LABELS",
    "CoverageDependencyError",
    "CoverageFeatures",
    "CoverageLabel",
    "CoveragePlayResult",
    "CoveragePlayResultDict",
    "CornerLeverage",
    "DEEP_YARDS",
    "OFF_YARDS",
    "PlayerDetector",
    "PlayerGeometry",
    "PRESS_YARDS",
    "ViewKind",
    "aggregate_coverages",
    "classify_coverage",
    "derive_features",
    "normalize_geometry",
    "split_play",
]

# ── Tunables ───────────────────────────────────────────────────────────────────

FIELD_WIDTH_YARDS = 53.3
#: Depth past the LOS at which a defender counts as "deep".
DEEP_YARDS = 12.0
#: Cushion at or below which a corner is "press".
PRESS_YARDS = 3.0
#: Cushion at or above which a corner is "off".
OFF_YARDS = 5.0
#: Depth past the LOS for a defender to count in the box.
BOX_YARDS = 5.0
#: Half-width of the "box" laterally (roughly TE-to-TE).
BOX_HALF_WIDTH_YARDS = 10.0
#: Lateral band (from midfield) that counts as the deep middle.
MIDDLE_HALF_WIDTH_YARDS = 8.0
#: Depth past the LOS at which a defender is safety-eligible for role tagging.
SAFETY_MIN_DEPTH_YARDS = 8.0

CoverageLabel = Literal[
    "Cover 0",
    "Cover 1",
    "Cover 2",
    "Cover 3",
    "Cover 4-Quarters",
    "Cover 6",
    "1-Man",
]

COVER_LABELS: tuple[CoverageLabel, ...] = (
    "Cover 0",
    "Cover 1",
    "Cover 2",
    "Cover 3",
    "Cover 4-Quarters",
    "Cover 6",
    "1-Man",
)

ViewKind = Literal["all22", "broadcast"]


# ── Errors ─────────────────────────────────────────────────────────────────────


class CoverageDependencyError(RuntimeError):
    """Raised when the player detector (YOLO/OpenCV) is required but absent.

    An empty geometry list from a missing detector would be indistinguishable
    from a defence that left the field; this error keeps those cases separate.
    """

    def __init__(self, dependency: str, detail: str) -> None:
        super().__init__(f"{dependency} unavailable: {detail}")
        self.dependency = dependency
        self.detail = detail


# ── Geometry ───────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class PlayerGeometry:
    """One player in normalised field coordinates (yards)."""

    player_id: str
    team: Literal["offense", "defense"]
    x: float
    y: float


class PlayerDetector(Protocol):
    """Injected detector seam (YOLO/OpenCV). Must return player geometry."""

    def detect(self, frame: object) -> list[PlayerGeometry]:
        """Return normalised player geometry for one frame."""
        ...


def normalize_geometry(
    players: Sequence[PlayerGeometry],
    *,
    view: ViewKind,
    line_of_scrimmage_y: float = 0.0,
) -> tuple[PlayerGeometry, ...]:
    """Normalise raw geometry into the field frame.

    Broadcast and All-22 differ in scale and origin; callers supply players
    already expressed in yard space (broadcast pipelines run a homography
    first). This function re-bases ``y`` so the LOS sits at 0 and rejects
    non-finite coordinates — it never invents players.
    """
    if view not in ("all22", "broadcast"):
        raise ValueError(f"unknown view {view!r}")
    out: list[PlayerGeometry] = []
    for p in players:
        if not (math.isfinite(p.x) and math.isfinite(p.y)):
            raise ValueError(f"non-finite coordinate for player {p.player_id}")
        out.append(
            PlayerGeometry(
                player_id=p.player_id,
                team=p.team,
                x=p.x,
                y=p.y - line_of_scrimmage_y,
            )
        )
    return tuple(out)


# ── Derived features ───────────────────────────────────────────────────────────


@dataclass(frozen=True)
class CornerLeverage:
    """Corner technique read from cushion and alignment."""

    side: Literal["left", "right"]
    technique: Literal["press", "off", "bail"]
    leverage: Literal["inside", "outside", "head_up"]


@dataclass(frozen=True)
class CoverageFeatures:
    """Everything the coverage rules read. Pure geometry, no labels."""

    safety_depths: tuple[float, ...]
    corner_cushions: tuple[float, ...]
    corner_leverage: tuple[CornerLeverage, ...]
    box_count: int
    n_deep: int
    n_deep_corners: int
    n_high_safeties: int
    corners_press: bool
    corners_off: bool
    deep_left: int
    deep_right: int
    deep_middle: int


def _midfield_x() -> float:
    return FIELD_WIDTH_YARDS / 2.0


def derive_features(
    players: Sequence[PlayerGeometry],
    *,
    deep_yards: float = DEEP_YARDS,
    press_yards: float = PRESS_YARDS,
    off_yards: float = OFF_YARDS,
    box_yards: float = BOX_YARDS,
) -> CoverageFeatures:
    """Derive safety depth, corner leverage, and box count from geometry.

    Role assignment (deterministic, documented):
    * **Corners** are the two defenders closest to each sideline.
    * **Safeties** are the remaining defenders with depth >=
      ``SAFETY_MIN_DEPTH_YARDS`` (deep middle / deep halves).
    * **Box** = defenders within ``box_yards`` of the LOS and
      ``BOX_HALF_WIDTH_YARDS`` of midfield.
    * **Deep** = any defender with depth >= ``deep_yards``.
    """
    defenders = [p for p in players if p.team == "defense"]
    if not defenders:
        return CoverageFeatures(
            safety_depths=(),
            corner_cushions=(),
            corner_leverage=(),
            box_count=0,
            n_deep=0,
            n_deep_corners=0,
            n_high_safeties=0,
            corners_press=True,
            corners_off=False,
            deep_left=0,
            deep_right=0,
            deep_middle=0,
        )

    cx = _midfield_x()
    # Corners: outermost defender on each sideline.
    left_corner = min(defenders, key=lambda p: p.x)
    right_corner = max(defenders, key=lambda p: p.x)
    corner_ids = {left_corner.player_id, right_corner.player_id}
    corners = [left_corner, right_corner] if left_corner.player_id != right_corner.player_id else [left_corner]

    safety_candidates = [
        p
        for p in defenders
        if p.player_id not in corner_ids and p.y >= SAFETY_MIN_DEPTH_YARDS
    ]
    # Prefer the deepest 1-2 as the high safeties; the rest are underneath help.
    safety_candidates.sort(key=lambda p: p.y, reverse=True)
    safeties = safety_candidates[:2]

    safety_depths = tuple(float(p.y) for p in safeties)
    corner_cushions = tuple(float(p.y) for p in corners)

    def _leverage(corner: PlayerGeometry) -> CornerLeverage:
        side: Literal["left", "right"] = "left" if corner.x < cx else "right"
        cushion = corner.y
        if cushion <= press_yards:
            technique: Literal["press", "off", "bail"] = "press"
        elif cushion >= off_yards:
            technique = "off"
        else:
            technique = "bail"
        # Outside leverage = aligned toward the sideline relative to midfield.
        # With only defensive geometry we approximate: corner wider than the
        # next-outermost defender plays outside; otherwise head-up/inside.
        others = [p for p in defenders if p.player_id != corner.player_id]
        if others:
            if side == "left":
                next_widest = min(others, key=lambda p: p.x)
                outside = corner.x < next_widest.x
                inside = corner.x > next_widest.x + 2.0
            else:
                next_widest = max(others, key=lambda p: p.x)
                outside = corner.x > next_widest.x
                inside = corner.x < next_widest.x - 2.0
        else:
            outside = True
            inside = False
        leverage: Literal["inside", "outside", "head_up"]
        if inside:
            leverage = "inside"
        elif outside:
            leverage = "outside"
        else:
            leverage = "head_up"
        return CornerLeverage(side=side, technique=technique, leverage=leverage)

    corner_leverage = tuple(_leverage(c) for c in corners)

    box_count = sum(
        1
        for p in defenders
        if p.y <= box_yards and abs(p.x - cx) <= BOX_HALF_WIDTH_YARDS
    )

    def _is_deep(p: PlayerGeometry) -> bool:
        return p.y >= deep_yards

    deep_players = [p for p in defenders if _is_deep(p)]
    n_deep = len(deep_players)
    n_deep_corners = sum(1 for c in corners if _is_deep(c))
    n_high_safeties = sum(1 for s in safeties if _is_deep(s))

    corner_cushion_vals = [float(c.y) for c in corners]
    avg_cushion = sum(corner_cushion_vals) / len(corner_cushion_vals)
    corners_press = avg_cushion <= press_yards
    corners_off = avg_cushion >= off_yards

    deep_left = sum(1 for p in deep_players if p.x < cx - MIDDLE_HALF_WIDTH_YARDS)
    deep_right = sum(1 for p in deep_players if p.x > cx + MIDDLE_HALF_WIDTH_YARDS)
    deep_middle = n_deep - deep_left - deep_right

    return CoverageFeatures(
        safety_depths=safety_depths,
        corner_cushions=corner_cushions,
        corner_leverage=corner_leverage,
        box_count=box_count,
        n_deep=n_deep,
        n_deep_corners=n_deep_corners,
        n_high_safeties=n_high_safeties,
        corners_press=corners_press,
        corners_off=corners_off,
        deep_left=deep_left,
        deep_right=deep_right,
        deep_middle=deep_middle,
    )


# ── Classification rules ───────────────────────────────────────────────────────


def classify_coverage(features: CoverageFeatures) -> CoverageLabel:
    """Label the defensive look from derived features.

    Rule table (first match wins):

    =========================  ===========================================
    Condition                  Label
    =========================  ===========================================
    n_deep == 0                Cover 0
    n_deep == 1, press corners 1-Man
    n_deep == 1, otherwise     Cover 1
    n_deep == 2, off corners,  Cover 3   (deep safeties + off corners)
           no deep corners
    n_deep == 2, both corners  Cover 3
           deep
    n_deep == 2, otherwise     Cover 2
    n_deep == 3, asymmetric    Cover 6
    n_deep == 3, otherwise     Cover 3
    n_deep >= 4, asymmetric    Cover 6
    n_deep >= 4, otherwise     Cover 4-Quarters
    =========================  ===========================================

    ``asymmetric`` means one side of the field carries two or more deep
    defenders while the other carries at most one (quarters-to-one-side
    structure rather than balanced thirds).
    """
    asymmetric = (features.deep_left >= 2 and features.deep_right <= 1) or (
        features.deep_right >= 2 and features.deep_left <= 1
    )

    if features.n_deep == 0:
        return "Cover 0"
    if features.n_deep == 1:
        return "1-Man" if features.corners_press else "Cover 1"
    if features.n_deep == 2:
        if features.n_deep_corners == 0 and features.corners_off:
            return "Cover 3"
        if features.n_deep_corners >= 2:
            return "Cover 3"
        return "Cover 2"
    if features.n_deep == 3:
        return "Cover 6" if asymmetric else "Cover 3"
    return "Cover 6" if asymmetric else "Cover 4-Quarters"


# ── Per-play result ────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class CoveragePlayResult:
    """Pre-snap and post-snap labels plus the features that produced them."""

    pre_snap: CoverageLabel
    post_snap: CoverageLabel
    disguised: bool
    safety_depth: float
    corner_leverage: tuple[CornerLeverage, ...]
    box_count: int
    pre_features: CoverageFeatures
    post_features: CoverageFeatures


class CornerLeverageDict(TypedDict):
    side: Literal["left", "right"]
    technique: Literal["press", "off", "bail"]
    leverage: Literal["inside", "outside", "head_up"]


class CoveragePlayResultDict(TypedDict):
    preSnap: CoverageLabel
    postSnap: CoverageLabel
    disguised: bool
    safetyDepth: float
    cornerLeverage: list[CornerLeverageDict]
    boxCount: int


def split_play(
    pre_snap_players: Sequence[PlayerGeometry],
    post_snap_players: Sequence[PlayerGeometry],
    *,
    view: ViewKind = "all22",
) -> CoveragePlayResult:
    """Classify one play from pre-snap and post-snap geometry.

    ``disguised`` is true exactly when the pre-snap label differs from the
    post-snap label — the whole point of showing two pictures.
    """
    pre_norm = normalize_geometry(pre_snap_players, view=view)
    post_norm = normalize_geometry(post_snap_players, view=view)
    pre_features = derive_features(pre_norm)
    post_features = derive_features(post_norm)
    pre_label = classify_coverage(pre_features)
    post_label = classify_coverage(post_features)
    safety_depth = (
        sum(post_features.safety_depths) / len(post_features.safety_depths)
        if post_features.safety_depths
        else 0.0
    )
    return CoveragePlayResult(
        pre_snap=pre_label,
        post_snap=post_label,
        disguised=pre_label != post_label,
        safety_depth=round(safety_depth, 3),
        corner_leverage=post_features.corner_leverage,
        box_count=post_features.box_count,
        pre_features=pre_features,
        post_features=post_features,
    )


def play_result_to_dict(result: CoveragePlayResult) -> CoveragePlayResultDict:
    """Public camelCase serialisation of a play result."""
    return CoveragePlayResultDict(
        preSnap=result.pre_snap,
        postSnap=result.post_snap,
        disguised=result.disguised,
        safetyDepth=result.safety_depth,
        cornerLeverage=[
            CornerLeverageDict(
                side=lv.side,
                technique=lv.technique,
                leverage=lv.leverage,
            )
            for lv in result.corner_leverage
        ],
        boxCount=result.box_count,
    )


# ── Aggregation ────────────────────────────────────────────────────────────────


class DownDistanceTendencyDict(TypedDict):
    down: int
    distanceBand: Literal["short", "medium", "long"]
    coverage: CoverageLabel
    rate: float


class CoverageAggregateDict(TypedDict):
    coverageDistribution: dict[str, float]
    disguiseRate: float
    downDistanceTendency: list[DownDistanceTendencyDict]


def _distance_band(distance: int) -> Literal["short", "medium", "long"]:
    if distance <= 3:
        return "short"
    if distance <= 7:
        return "medium"
    return "long"


def aggregate_coverages(
    plays: Sequence[tuple[CoveragePlayResult, int, int]],
) -> CoverageAggregateDict:
    """Aggregate play results into distribution / disguise rate / tendency.

    Each input is ``(result, down, distance)``. Distribution rates are over
    **post-snap** labels (what the defence actually played). Disguise rate is
    the fraction of plays where pre ≠ post. Down/distance tendency lists each
    ``(down, band, coverage)`` cell's rate within that cell.
    """
    if not plays:
        return CoverageAggregateDict(
            coverageDistribution={},
            disguiseRate=0.0,
            downDistanceTendency=[],
        )

    post_counts: Counter[str] = Counter()
    disguised = 0
    cell_counts: Counter[tuple[int, str, str]] = Counter()
    cell_totals: Counter[tuple[int, str]] = Counter()

    for result, down, distance in plays:
        post_counts[result.post_snap] += 1
        if result.disguised:
            disguised += 1
        band = _distance_band(distance)
        cell_totals[(down, band)] += 1
        cell_counts[(down, band, result.post_snap)] += 1

    n = len(plays)
    distribution = {
        label: round(count / n, 4)
        for label, count in sorted(post_counts.items())
    }
    tendency = [
        DownDistanceTendencyDict(
            down=down,
            distanceBand=band,  # type: ignore[arg-type]
            coverage=coverage,  # type: ignore[arg-type]
            rate=round(count / cell_totals[(down, band)], 4),
        )
        for (down, band, coverage), count in sorted(cell_counts.items())
    ]
    return CoverageAggregateDict(
        coverageDistribution=distribution,
        disguiseRate=round(disguised / n, 4),
        downDistanceTendency=tendency,
    )


def require_detector(detector: PlayerDetector | None) -> PlayerDetector:
    """Return an injected detector or fail closed.

    A missing YOLO/OpenCV detector must raise a clear error — never a
    silent empty field that would be classified as Cover 0.
    """
    if detector is None:
        raise CoverageDependencyError(
            "YOLO/OpenCV",
            "no player detector injected. Provide a PlayerDetector (YOLO or "
            "OpenCV) or pass pre-computed geometry; refusing to fabricate "
            "player positions.",
        )
    return detector

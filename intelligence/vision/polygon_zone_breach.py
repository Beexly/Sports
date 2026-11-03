"""SiteGuard polygon zone-breach primitive.

Point-in-polygon via ray casting (even-odd) with a winding-number cross-check, plus
per-zone void accounting for NFL coverage shells.

Coordinate convention: field yards, x in [0, 120] sideline-to-sideline,
y in [0, 53.3] sideline-to-sideline. Polygons are closed lists of (x, y) vertices;
closing the ring is implicit.

This module is pure geometry. It does not know what a "seam" or "hook-curl" is —
callers supply the zone polygons, so a coverage-void claim always traces back to a
polygon someone can inspect.
"""

from __future__ import annotations

from typing import Any, Iterable, Sequence

Point = tuple[float, float]
Polygon = Sequence[Point]

FIELD_X = (0.0, 120.0)
FIELD_Y = (0.0, 53.3)


def on_segment(p: Point, a: Point, b: Point, eps: float = 1e-9) -> bool:
    (px, py), (ax, ay), (bx, by) = p, a, b
    cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax)
    if abs(cross) > eps:
        return False
    return (
        min(ax, bx) - eps <= px <= max(ax, bx) + eps
        and min(ay, by) - eps <= py <= max(ay, by) + eps
    )


def point_in_polygon_raycast(point: Point, polygon: Polygon) -> bool:
    """Even-odd ray casting. Boundary points count as inside."""
    if len(polygon) < 3:
        return False
    x, y = point
    verts = list(polygon)
    inside = False
    n = len(verts)
    for i in range(n):
        a = verts[i]
        b = verts[(i + 1) % n]
        if on_segment(point, a, b):
            return True
        (ax, ay), (bx, by) = a, b
        if (ay > y) != (by > y):
            x_cross = ax + (y - ay) * (bx - ax) / (by - ay)
            if x < x_cross:
                inside = not inside
    return inside


def winding_number(point: Point, polygon: Polygon) -> int:
    """Signed winding number; non-zero means inside (handles self-intersections)."""
    x, y = point
    wn = 0
    verts = list(polygon)
    n = len(verts)
    for i in range(n):
        ax, ay = verts[i]
        bx, by = verts[(i + 1) % n]
        if ay <= y:
            if by > y and (bx - ax) * (y - ay) - (x - ax) * (by - ay) > 0:
                wn += 1
        else:
            if by <= y and (bx - ax) * (y - ay) - (x - ax) * (by - ay) < 0:
                wn -= 1
    return wn


def point_in_polygon(point: Point, polygon: Polygon, method: str = "raycast") -> bool:
    if method == "winding":
        return winding_number(point, polygon) != 0
    if method == "both":
        return point_in_polygon_raycast(point, polygon) and winding_number(point, polygon) != 0
    return point_in_polygon_raycast(point, polygon)


def polygon_area(polygon: Polygon) -> float:
    """Shoelace area in square yards (absolute value)."""
    if len(polygon) < 3:
        return 0.0
    s = 0.0
    n = len(polygon)
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


def compute_zone_void_breach(
    player_xy: dict[str, Point] | Iterable[Point],
    zone_polygons: dict[str, Polygon],
    expected_defenders_per_zone: int = 1,
    method: str = "raycast",
) -> dict[str, Any]:
    """Count defenders inside each coverage zone and flag voids.

    A zone is BREACHED when it holds fewer than ``expected_defenders_per_zone``
    defenders. A zone with players inside but no defender within it that is also
    large is reported with its area so the caller can judge whether the void is
    exploitable rather than merely empty.
    """
    if isinstance(player_xy, dict):
        players = list(player_xy.items())
    else:
        players = [(f"p{i}", tuple(p)) for i, p in enumerate(player_xy)]

    zones: dict[str, Any] = {}
    breached: list[str] = []
    for zone_name, poly in zone_polygons.items():
        inside = [name for name, pt in players if point_in_polygon(pt, poly, method=method)]
        n_in = len(inside)
        area = polygon_area(poly)
        is_breach = n_in < expected_defenders_per_zone
        if is_breach:
            breached.append(zone_name)
        zones[zone_name] = {
            "defenders_inside": n_in,
            "occupant_names": inside,
            "area_sq_yds": round(area, 3),
            "void": is_breach,
            "void_area_sq_yds": round(area, 3) if is_breach else 0.0,
        }

    total_area = sum(z["area_sq_yds"] for z in zones.values())
    void_area = sum(z["void_area_sq_yds"] for z in zones.values())
    return {
        "metric": "zone_void_breach",
        "method": method,
        "players_evaluated": len(players),
        "zones": zones,
        "breached_zones": breached,
        "total_zone_area_sq_yds": round(total_area, 3),
        "total_void_area_sq_yds": round(void_area, 3),
        "void_fraction": round(void_area / total_area, 4) if total_area else None,
        "findings": (
            [f"{name}: {zones[name]['defenders_inside']} defender(s) in {zones[name]['area_sq_yds']:.1f} sq yds"
             for name in breached]
            if breached
            else ["no zone void"]
        ),
    }


def rect_zone(x0: float, x1: float, y0: float, y1: float) -> Polygon:
    """Convenience constructor for an axis-aligned zone rectangle."""
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def field_bounds_ok(p: Point) -> bool:
    x, y = p
    return FIELD_X[0] <= x <= FIELD_X[1] and FIELD_Y[0] <= y <= FIELD_Y[1]

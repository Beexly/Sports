"""Unit tests for Plus Code stadium geofencing and pre-snap formation spread."""

from __future__ import annotations

from gse_engine.ingestion.vision_and_geofence import (
    compute_presnap_homography_spread,
    decode_plus_code_center,
    encode_plus_code,
)


def test_plus_code_roundtrip_targets_ford_field() -> None:
    """Round-trips Ford Field coordinates within <0.001 degrees."""
    lat, lon = 42.3400, -83.0456
    code = encode_plus_code(lat, lon, code_length=10)
    assert "+" in code
    dec_lat, dec_lon = decode_plus_code_center(code)
    assert abs(dec_lat - lat) < 0.001
    assert abs(dec_lon - lon) < 0.001


def test_presnap_homography_classifies_light_vs_heavy_box() -> None:
    """Separates light-box vs heavy-box defensive shells around the LOS."""
    offense = [
        (35.0, 26.0),
        (35.0, 28.0),
        (35.0, 30.0),
        (35.0, 10.0),
        (35.0, 44.0),
        (30.0, 26.5),
    ]
    light_def = [
        (36.0, 24.0),
        (36.0, 26.5),
        (36.0, 29.0),
        (39.0, 25.0),
        (39.0, 28.0),
        (40.0, 27.0),
        (48.0, 20.0),
        (49.0, 34.0),
    ]
    metrics = compute_presnap_homography_spread(offense, light_def, line_of_scrimmage_x=35.5)
    assert metrics.offensive_width_yds == 34.0
    assert metrics.offensive_depth_yds == 5.0
    assert metrics.defenders_within_5yds_of_los == 6
    assert metrics.box_classification == "LIGHT_BOX"

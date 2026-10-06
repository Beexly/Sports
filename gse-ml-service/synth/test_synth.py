import os
import json
import numpy as np
import pytest

from synth.camera import Camera
from synth.play import PlaySynthesizer
from synth.renderer import Renderer

def test_camera_projection_math():
    cam = Camera([50, -30, 20], [50, 26, 0])

    # Test looking at the target. Target should be roughly in center of image
    pts, valid = cam.project_points(np.array([[50, 26, 0]]))
    assert valid[0]

    # Image width 1280, height 720. Center is (640, 360)
    # Give it some slack due to orientation/aspect
    u, v = pts[0]
    assert abs(u - 640) < 10
    assert abs(v - 360) < 10

def test_camera_field_homography():
    cam = Camera([50, -30, 20], [50, 26, 0])

    # Point on field
    X, Y = 60.0, 30.0
    field_pt = np.array([X, Y, 1.0])

    # Map using homography
    uv_h = cam.H @ field_pt
    uv_h = uv_h[:2] / uv_h[2]

    # Map using projection matrix
    pts, valid = cam.project_points(np.array([[X, Y, 0]]))
    assert valid[0]
    uv_p = pts[0]

    # Should be identical
    np.testing.assert_allclose(uv_h, uv_p, atol=1e-4)

def test_determinism(tmp_path):
    import subprocess

    out1 = tmp_path / "out1"
    out2 = tmp_path / "out2"

    # Run twice with same seed
    subprocess.run(["python", "-m", "synth.generate", "--num-frames", "2", "--out", str(out1), "--seed", "42"], check=True)
    subprocess.run(["python", "-m", "synth.generate", "--num-frames", "2", "--out", str(out2), "--seed", "42"], check=True)

    # Check JSON identical
    with open(out1 / "annotations.json") as f1, open(out2 / "annotations.json") as f2:
        j1 = json.load(f1)
        j2 = json.load(f2)

    assert j1 == j2

    # Run with different seed
    out3 = tmp_path / "out3"
    subprocess.run(["python", "-m", "synth.generate", "--num-frames", "2", "--out", str(out3), "--seed", "43"], check=True)

    with open(out3 / "annotations.json") as f3:
        j3 = json.load(f3)

    # Should not be identical (e.g. ball velocity, random noise)
    assert j1 != j3

def test_coco_validity_and_track_persistence(tmp_path):
    import subprocess

    out = tmp_path / "out"
    subprocess.run(["python", "-m", "synth.generate", "--num-frames", "5", "--out", str(out), "--seed", "99"], check=True)

    with open(out / "annotations.json") as f:
        data = json.load(f)

    assert "images" in data
    assert "annotations" in data
    assert "categories" in data

    assert len(data["images"]) == 5

    # Track ID check. In each frame, there should be max 22 players + 7 officials + 1 ball = 30 objects
    for i in range(1, 6):
        anns = [a for a in data["annotations"] if a["image_id"] == i]
        assert len(anns) <= 30

        # Ensure track_id is present and bbox is valid
        for a in anns:
            assert "track_id" in a
            assert len(a["bbox"]) == 4
            assert a["bbox"][2] >= 0 # width
            assert a["bbox"][3] >= 0 # height
            assert a["category_id"] in [1, 2, 3, 4]

    # Check camera params exist
    for img in data["images"]:
        assert "camera" in img
        assert "H" in img["camera"]

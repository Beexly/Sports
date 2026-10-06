"""Unit tests for the pure geometry/association logic in app.py.

Runs WITHOUT the YOLO model (no ultralytics import at module import time is
avoided by stubbing). Run: python -m pytest test_app.py -q  (or unittest).
"""

import importlib.util
import math
import sys
import types
import unittest
from pathlib import Path


def load_app():
    # Stub heavy deps so import works without ultralytics/opencv/fastapi.
    for name in ["fastapi", "fastapi.responses", "numpy", "ultralytics", "cv2"]:
        if name not in sys.modules:
            sys.modules[name] = types.ModuleType(name)
    fastapi = sys.modules["fastapi"]
    fastapi.FastAPI = lambda **kw: types.SimpleNamespace(
        get=lambda *a, **k: (lambda f: f), post=lambda *a, **k: (lambda f: f)
    )
    fastapi.File = lambda *a, **k: None
    fastapi.Form = lambda *a, **k: None
    fastapi.UploadFile = object
    fastapi.HTTPException = type("HTTPException", (Exception,), {})
    sys.modules["fastapi.responses"].JSONResponse = object
    np = sys.modules["numpy"]
    np.frombuffer = lambda *a, **k: None

    path = Path(__file__).parent / "app.py"
    spec = importlib.util.spec_from_file_location("watch_app", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


app = load_app()


class TestGeometry(unittest.TestCase):
    def test_iou_identical(self):
        b = {"x": 0, "y": 0, "width": 10, "height": 10}
        self.assertAlmostEqual(app.bbox_iou(b, b), 1.0)

    def test_iou_disjoint(self):
        a = {"x": 0, "y": 0, "width": 10, "height": 10}
        b = {"x": 20, "y": 20, "width": 10, "height": 10}
        self.assertEqual(app.bbox_iou(a, b), 0.0)

    def test_iou_half_overlap(self):
        a = {"x": 0, "y": 0, "width": 10, "height": 10}
        b = {"x": 5, "y": 0, "width": 10, "height": 10}
        # inter=50, union=150
        self.assertAlmostEqual(app.bbox_iou(a, b), 50 / 150)

    def test_foot_point(self):
        det = {"bbox": {"x": 10, "y": 20, "width": 30, "height": 40}}
        self.assertEqual(app.foot_point(det), (25.0, 60.0))

    def test_project_point_identity(self):
        ident = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
        self.assertEqual(app.project_point(3.0, 4.0, ident), (3.0, 4.0))

    def test_project_point_scale(self):
        h = [[2, 0, 10], [0, 2, 20], [0, 0, 1]]
        x, y = app.project_point(5.0, 5.0, h)
        self.assertAlmostEqual(x, 20.0)
        self.assertAlmostEqual(y, 30.0)


class TestAssociation(unittest.TestCase):
    def det(self, x, y, w=20, h=40):
        return {"bbox": {"x": x, "y": y, "width": w, "height": h},
                "confidence": 0.9, "classId": "player"}

    def test_stable_detection_keeps_one_tracklet(self):
        gs = app.GameState()
        for i in range(10):
            # Small drift each frame — high IoU, same identity.
            fin = gs.ingest([self.det(100 + i, 200)], t=float(i))
            self.assertEqual(fin, [])
        self.assertEqual(len(gs.active), 1)
        self.assertEqual(len(gs.active[0]["points"]), 10)

    def test_new_detection_spawns_tracklet(self):
        gs = app.GameState()
        gs.ingest([self.det(100, 200)], t=0.0)
        gs.ingest([self.det(100, 200), self.det(500, 500)], t=1.0)
        self.assertEqual(len(gs.active), 2)

    def test_gap_retires_tracklet(self):
        gs = app.GameState()
        gs.ingest([self.det(100, 200)], t=0.0)
        finished = []
        for i in range(1, 10):
            finished.extend(gs.ingest([], t=float(i)))
        self.assertEqual(len(gs.active), 0)
        # Single-frame tracklet is dropped by MIN_TRACKLET_FRAMES... it had
        # 1 point, so nothing finished; it goes to retired silently.
        self.assertEqual(finished, [])

    def test_long_tracklet_finishes_after_gap(self):
        gs = app.GameState()
        for i in range(5):
            gs.ingest([self.det(100, 200)], t=float(i))
        finished = []
        for i in range(5, 12):
            finished.extend(gs.ingest([], t=float(i)))
        self.assertEqual(len(finished), 1)
        self.assertEqual(finished[0]["n_points"] if "n_points" in finished[0] else len(finished[0]["points"]), 5)


class TestDerivedMetrics(unittest.TestCase):
    def test_separation_proxy(self):
        h = [[0.1, 0, 0], [0, 0.1, 0], [0, 0, 1]]  # 10px = 1yd
        active = [
            {"id": "trk-0001", "points": [{"t": 0, "xPx": 0, "yPx": 0}]},
            {"id": "trk-0002", "points": [{"t": 0, "xPx": 30, "yPx": 40}]},
        ]
        m = app.derive_frame_metrics(active, h)
        self.assertTrue(m["homography_seeded"])
        self.assertEqual(len(m["positions"]), 2)
        # 30px,40px -> 3yd,4yd -> 5yd apart
        seps = {s["tracklet_id"]: s["nearest_other_yd"] for s in m["separations"]}
        self.assertAlmostEqual(seps["trk-0001"], 5.0)
        self.assertAlmostEqual(seps["trk-0002"], 5.0)

    def test_no_homography_nulls_coords(self):
        active = [{"id": "trk-0001", "points": [{"t": 0, "xPx": 0, "yPx": 0}]}]
        m = app.derive_frame_metrics(active, None)
        self.assertFalse(m["homography_seeded"])
        self.assertIsNone(m["positions"][0]["x_yd"])
        self.assertEqual(m["separations"], [])

    def test_break_angle_proxy_straight_line(self):
        # Points along a straight line in yards -> ~0 heading change.
        h = [[0.1, 0, 0], [0, 0.1, 0], [0, 0, 1]]
        pts = [{"t": float(i), "xPx": i * 10.0, "yPx": 0.0} for i in range(6)]
        active = [{"id": "trk-0001", "points": pts}]
        m = app.derive_frame_metrics(active, h)
        self.assertEqual(len(m["break_angles"]), 1)
        self.assertAlmostEqual(m["break_angles"][0]["max_heading_change_deg"], 0.0, places=1)

    def test_break_angle_proxy_right_angle(self):
        h = [[0.1, 0, 0], [0, 0.1, 0], [0, 0, 1]]
        pts = [{"t": 0.0, "xPx": 0, "yPx": 0},
               {"t": 1.0, "xPx": 50, "yPx": 0},
               {"t": 2.0, "xPx": 50, "yPx": 50}]
        active = [{"id": "trk-0001", "points": pts}]
        m = app.derive_frame_metrics(active, h)
        self.assertAlmostEqual(m["break_angles"][0]["max_heading_change_deg"], 90.0, places=0)


if __name__ == "__main__":
    unittest.main()

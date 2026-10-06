"""Tests for the adaptive frame-rate gate (no mss/opencv capture needed)."""

import unittest

import numpy as np

from play_gate import PlayGate, PlayGateConfig, motion_energy, score_bug_present


def gray_frame(value: int, h: int = 180, w: int = 320) -> np.ndarray:
    return np.full((h, w), value, dtype=np.uint8)


class TestMotionEnergy(unittest.TestCase):
    def test_identical_frames_zero_energy(self):
        f = gray_frame(128)
        self.assertAlmostEqual(motion_energy(f, f), 0.0)

    def test_uniform_shift_measures_delta(self):
        a = gray_frame(100)
        b = gray_frame(110)
        self.assertAlmostEqual(motion_energy(a, b), 10.0, places=1)

    def test_localized_motion_counts(self):
        a = gray_frame(100)
        b = gray_frame(100)
        b[80:100, 140:180] = 200  # a moving blob in the field ROI
        e = motion_energy(a, b)
        self.assertGreater(e, 0.0)
        self.assertLess(e, 100.0)

    def test_roi_ignores_borders(self):
        # Motion only in the outer 10% border (outside the field ROI).
        a = gray_frame(100)
        b = gray_frame(100)
        b[0:5, :] = 200
        self.assertAlmostEqual(motion_energy(a, b), 0.0)


class TestScoreBug(unittest.TestCase):
    def test_static_overlay_detected(self):
        # Static high-contrast corner block on an otherwise flat frame.
        base = gray_frame(100)
        prev = base.copy()
        curr = base.copy()
        curr[0:20, 0:60] = 220
        prev[0:20, 0:60] = 220
        # Add texture inside the bug so edge density is high.
        curr[2:18:2, 2:58:2] = 40
        prev[2:18:2, 2:58:2] = 40
        self.assertTrue(score_bug_present(curr, prev))

    def test_moving_corner_not_a_bug(self):
        prev = gray_frame(100)
        curr = gray_frame(100)
        curr[0:20, 0:60] = 220  # corner changed a lot between frames
        self.assertFalse(score_bug_present(curr, prev))


class TestPlayGateHysteresis(unittest.TestCase):
    def _gate(self) -> PlayGate:
        cfg = PlayGateConfig(
            motion_threshold=6.0, burst_min_frames=2, idle_cooldown_frames=3
        )
        return PlayGate(cfg)

    def _jpeg(self, arr: np.ndarray) -> bytes:
        import cv2

        ok, buf = cv2.imencode(".jpg", arr, [cv2.IMWRITE_JPEG_QUALITY, 90])
        assert ok
        return bytes(buf)

    def _live_frame(self, seed: int) -> bytes:
        # High motion energy + static textured corner (bug-like).
        rng = np.random.default_rng(seed)
        base = rng.integers(80, 120, (180, 320), dtype=np.uint8)
        base[0:20, 0:60] = 220
        base[2:18:2, 2:58:2] = 40
        return self._jpeg(base)

    def _quiet_frame(self) -> bytes:
        base = np.full((180, 320), 100, dtype=np.uint8)
        return self._jpeg(base)

    def test_starts_idle(self):
        g = self._gate()
        self.assertFalse(g.observe(self._quiet_frame()))

    def test_bursts_after_sustained_motion(self):
        g = self._gate()
        results = [g.observe(self._live_frame(i)) for i in range(4)]
        self.assertTrue(results[-1])
        self.assertTrue(g.bursting)

    def test_returns_to_idle_after_quiet(self):
        g = self._gate()
        for i in range(4):
            g.observe(self._live_frame(i))
        self.assertTrue(g.bursting)
        results = [g.observe(self._quiet_frame()) for _ in range(5)]
        self.assertFalse(results[-1])
        self.assertFalse(g.bursting)

    def test_observe_idle_resets(self):
        g = self._gate()
        for i in range(4):
            g.observe(self._live_frame(i))
        g.observe_idle(self._quiet_frame())
        self.assertFalse(g.bursting)


if __name__ == "__main__":
    unittest.main()

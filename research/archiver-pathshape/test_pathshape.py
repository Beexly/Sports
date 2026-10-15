#!/usr/bin/env python3
"""Tests for the archiver path-shape extractor (stdlib unittest, no deps).

Run: python3 -m unittest test_pathshape -v   (from this directory)
"""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pathshape as ps

BASE = ps.parse_ts("2026-10-15T00:00:00Z")
MIN = 60.0


def stamps_from(series_spread, series_total, start_min=0, step_min=30):
    """Build [(epoch, iso, spread, total)] from value lists."""
    out = []
    for i, (s, t) in enumerate(zip(series_spread, series_total)):
        ep = BASE + (start_min + i * step_min) * MIN
        out.append((ep, ps.iso_of(ep), s, t))
    return out


def run_game(stamps, event_epoch=None):
    event = None
    if event_epoch is not None:
        event = {"event_time_utc": ps.iso_of(event_epoch), "kind": "test",
                 "label": "test event", "provenance": "TEST",
                 "source": "test"}
    return ps.extract_game("test:game", stamps, event, "test.jsonl",
                           "0" * 64, [])


class ConstantsPinned(unittest.TestCase):
    def test_constants(self):
        self.assertEqual(ps.PATHSHAPE_VERSION, "1.0.0")
        self.assertEqual(ps.NOISE_BAND_POINTS, 0.5)
        self.assertEqual(ps.DRIFT_AFTER_60M_THRESHOLD_POINTS, 0.5)
        self.assertEqual(ps.DRIFT_AFTER_60M_MINUTES, 60)


class StablePath(unittest.TestCase):
    def test_stable_series(self):
        # event at t=0; stamps at 30m intervals, values never move.
        st = stamps_from([2.5] * 6, [40.5] * 6, start_min=10)
        row = run_game(st, event_epoch=BASE)
        sp = row["series"]["spread_home"]
        self.assertEqual(sp["net_drift_points"], 0.0)
        self.assertEqual(sp["path_roughness_reversals"], 0)
        self.assertEqual(sp["stabilization_stamp_index"], 0)
        # TTS measured from event time to first stamp = 10 minutes.
        self.assertEqual(sp["time_to_stabilization_minutes"], 10.0)
        self.assertTrue(row["combined"]["tts_is_upper_bound"])
        # drift-after-60m: reference stamp <= 60m exists, no late movement.
        self.assertEqual(sp["drift_after_60m"]["flag"], False)
        self.assertEqual(row["combined"]["drift_after_60m_flag"], False)


class DriftingPath(unittest.TestCase):
    def test_drift_and_late_flag(self):
        # spread: 2.5 flat until 60m mark, then jumps to 3.5 and holds.
        st = stamps_from([2.5, 2.5, 2.5, 3.5, 3.5, 3.5],
                         [40.5] * 6, start_min=0, step_min=30)
        row = run_game(st, event_epoch=BASE)
        sp = row["series"]["spread_home"]
        self.assertEqual(sp["net_drift_points"], 1.0)
        # stabilizes at index 3 (first 3.5 that holds within band)
        self.assertEqual(sp["stabilization_stamp_index"], 3)
        self.assertEqual(sp["time_to_stabilization_minutes"], 90.0)
        d = sp["drift_after_60m"]
        self.assertEqual(d["flag"], True)
        self.assertEqual(d["max_late_movement_points"], 1.0)
        self.assertEqual(row["combined"]["drift_after_60m_flag"], True)
        # flat total contributes flag False; combined is OR -> True.
        self.assertEqual(row["series"]["total"]["drift_after_60m"]["flag"],
                         False)

    def test_single_hook_late_move_does_not_flag(self):
        # late move of exactly 0.5 is NOT strictly greater than threshold.
        st = stamps_from([2.5, 2.5, 2.5, 3.0, 3.0],
                         [40.5] * 5, start_min=0, step_min=30)
        row = run_game(st, event_epoch=BASE)
        d = row["series"]["spread_home"]["drift_after_60m"]
        self.assertEqual(d["max_late_movement_points"], 0.5)
        self.assertEqual(d["flag"], False)


class ReversingPath(unittest.TestCase):
    def test_roughness_counts_reversals(self):
        st = stamps_from([0.0, 1.0, 0.0, 1.0, 0.0],
                         [40.5, 41.5, 40.5, 41.5, 40.5],
                         start_min=0, step_min=30)
        row = run_game(st, event_epoch=BASE)
        self.assertEqual(row["series"]["spread_home"]
                         ["path_roughness_reversals"], 3)
        self.assertEqual(row["series"]["total"]
                         ["path_roughness_reversals"], 3)
        self.assertEqual(row["combined"]["path_roughness_reversals_total"], 6)

    def test_zeros_dropped_before_counting(self):
        st = stamps_from([2.5, 2.5, 3.5, 3.5, 2.5],
                         [40.5] * 5, start_min=0, step_min=30)
        row = run_game(st, event_epoch=BASE)
        self.assertEqual(row["series"]["spread_home"]
                         ["path_roughness_reversals"], 1)


class NoiseBand(unittest.TestCase):
    def test_hook_wiggle_absorbed(self):
        # a single 0.5 hook wiggle is within the noise band: the series is
        # 'stable' at the first stamp because later values never leave the
        # band around 2.5.
        st = stamps_from([2.5, 3.0, 2.5, 2.5],
                         [40.5] * 4, start_min=0, step_min=30)
        row = run_game(st, event_epoch=BASE)
        self.assertEqual(row["series"]["spread_home"]
                         ["stabilization_stamp_index"], 0)

    def test_two_hook_move_breaks_stability(self):
        st = stamps_from([2.5, 2.5, 3.5, 3.5],
                         [40.5] * 4, start_min=0, step_min=30)
        row = run_game(st, event_epoch=BASE)
        self.assertEqual(row["series"]["spread_home"]
                         ["stabilization_stamp_index"], 2)


class EdgeCases(unittest.TestCase):
    def test_single_stamp(self):
        st = stamps_from([2.5], [40.5], start_min=10)
        row = run_game(st, event_epoch=BASE)
        sp = row["series"]["spread_home"]
        self.assertIsNone(sp["net_drift_points"])
        self.assertIsNone(sp["time_to_stabilization_minutes"])
        self.assertEqual(sp["path_roughness_reversals"], 0)
        self.assertEqual(sp["insufficient_data_reason"],
                         "single_stamp_in_window")

    def test_no_event_null_fields(self):
        st = stamps_from([2.5, 3.5, 3.5], [40.5, 40.5, 41.5],
                         start_min=0, step_min=60)
        row = run_game(st, event_epoch=None)
        self.assertIsNone(row["event"])
        self.assertIsNone(row["series"]["spread_home"]["drift_after_60m"])
        self.assertIsNone(row["combined"]["drift_after_60m_flag"])
        self.assertEqual(row["combined"]["tts_reference"],
                         "window_first_stamp")
        # features still computed over the full window
        self.assertEqual(row["series"]["spread_home"]["net_drift_points"],
                         1.0)

    def test_event_after_all_stamps(self):
        st = stamps_from([2.5, 2.5], [40.5, 40.5], start_min=0, step_min=30)
        row = run_game(st, event_epoch=BASE + 600 * MIN)
        self.assertEqual(row["window"]["stamps_in_window"], 0)
        self.assertEqual(row["series"]["spread_home"]
                         ["insufficient_data_reason"], "no_stamps_in_window")
        self.assertIsNone(row["combined"]["time_to_stabilization_minutes"])

    def test_late_event_no_stamp_within_60m(self):
        # event 100m before first stamp: the 60m comparison is unobservable.
        st = stamps_from([2.5, 2.5, 2.5], [40.5] * 3,
                         start_min=100, step_min=30)
        row = run_game(st, event_epoch=BASE)
        d = row["series"]["spread_home"]["drift_after_60m"]
        self.assertIsNone(d["flag"])
        self.assertEqual(d["reason"], "no_stamp_within_60m_of_event")


class DeterminismAndIO(unittest.TestCase):
    def _write_archive(self, path):
        rows = []
        for i, iso in enumerate(["2026-10-15T17:00:00Z",
                                 "2026-10-15T18:00:00Z",
                                 "2026-10-15T19:00:00Z"]):
            for market, side, line in (("SPREAD", "home", 2.5 + i),
                                       ("TOTAL", "over", 40.5),
                                       ("TOTAL", "under", 40.5)):
                rows.append({"gameId": "g1", "capturedAt": iso,
                             "phase": "OPEN", "book": "espn_public",
                             "market": market, "side": side, "price": -110,
                             "line": line, "source": "espn-public-dk"})
        with open(path, "w") as fh:
            for r in rows:
                fh.write(json.dumps(r) + "\n")

    def test_determinism_and_parse(self):
        with tempfile.TemporaryDirectory() as td:
            ap = os.path.join(td, "a.jsonl")
            self._write_archive(ap)
            r1 = ps.extract(ap, None, {})
            r2 = ps.extract(ap, None, {})
            self.assertEqual(json.dumps(r1, sort_keys=True),
                             json.dumps(r2, sort_keys=True))
            self.assertEqual(len(r1), 1)
            self.assertEqual(r1[0]["series"]["spread_home"]
                             ["net_drift_points"], 2.0)
            self.assertEqual(r1[0]["provenance"]["archive_rows_for_game"], 9)
            self.assertEqual(len(r1[0]["provenance"]["stamps"]), 3)

    def test_cli_end_to_end(self):
        with tempfile.TemporaryDirectory() as td:
            ap = os.path.join(td, "a.jsonl")
            out = os.path.join(td, "out.jsonl")
            self._write_archive(ap)
            self.assertEqual(ps.main(["--archive", ap, "--out", out]), 0)
            lines = open(out).read().strip().split("\n")
            self.assertEqual(len(lines), 1)
            row = json.loads(lines[0])
            self.assertEqual(row["label"], "DESCRIPTIVE")
            self.assertEqual(row["weight"], 0)


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Archiver path-shape / absorption-lag extractor (Grok WO-8, Build 1, Idea 4).

Reads the line archiver's multi-timestamp stamp series per game and computes
descriptive path features for the spread (home line) and total series:

  (a) time-to-stabilization after a declared news-event time,
  (b) post-news drift (signed),
  (c) drift-after-60m flag (movement beyond threshold >60 min after event),
  (d) path roughness (direction reversals).

Features are reasoning-layer inputs at weight 0. Rows are DESCRIPTIVE.
No claim that drift predicts anything is made or implied by this module; the
falsifiable test lives in README.md as a frozen test card and accrues on
FUTURE games only.

========================================================================
PRE-REGISTERED CONSTANTS (v1.0.0, frozen 2026-10-15 for today's data)
Changing any of these = a NEW VERSION of this module, never an edit.
========================================================================
PATHSHAPE_VERSION                  = "1.0.0"
NOISE_BAND_POINTS                  = 0.5   # one hook; movement within +/- this
                                           # of the anchor counts as noise
DRIFT_AFTER_60M_THRESHOLD_POINTS   = 0.5   # flag requires movement STRICTLY
                                           # greater than this (i.e. >= 1.0 pt,
                                           # two hooks) after the 60m mark
DRIFT_AFTER_60M_MINUTES            = 60
========================================================================

Sign conventions:
  spread_home = the HOME team's spread line as archived (e.g. +2.5 means the
  home team receives 2.5 points). Positive spread drift = home line increased.
  total = the game's total line. Positive total drift = total increased.

Stabilization definition (per series, on the analysis window):
  the earliest stamp t_k such that every later stamp's value stays within
  NOISE_BAND_POINTS of the value at t_k. The final stamp trivially qualifies,
  so stabilization is always reached by window end at the latest.
  Time-to-stabilization is measured from the event time when an event is
  declared, else from the window's first stamp (tts_reference says which).
  With hourly archiver cadence the measured TTS is an UPPER BOUND on the true
  stabilization time; tts_is_upper_bound is set when stabilization is already
  present at the first window stamp.

Events are NEVER invented by this module. They come from an events fixture
file; games without a declared event get event fields = null and their
event-relative features = null.
"""

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone

PATHSHAPE_VERSION = "1.0.0"
NOISE_BAND_POINTS = 0.5
DRIFT_AFTER_60M_THRESHOLD_POINTS = 0.5
DRIFT_AFTER_60M_MINUTES = 60

SERIES_NAMES = ("spread_home", "total")


def parse_ts(iso):
    """Parse an ISO-8601 UTC timestamp to epoch seconds (float)."""
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.timestamp()


def iso_of(epoch):
    return datetime.fromtimestamp(epoch, tz=timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%S.") + f"{int(round((epoch % 1) * 1000)):03d}Z"


def load_archive_series(archive_path):
    """Parse the main line archive JSONL into per-game stamp series.

    Returns {game_id: {"stamps": [(epoch, iso, spread_home, total), ...],
                       "rows": int}}
    A stamp is kept only if it carries both a SPREAD home line and a TOTAL
    line; raw row count is preserved in provenance regardless.
    """
    games = {}
    with open(archive_path) as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            g = games.setdefault(r["gameId"], {"by_stamp": {}, "rows": 0})
            g["rows"] += 1
            slot = g["by_stamp"].setdefault(r["capturedAt"], {})
            if r["market"] == "SPREAD" and r["side"] == "home":
                slot["spread_home"] = r["line"]
            elif r["market"] == "TOTAL":
                # over/under rows carry the same line; keep the first seen.
                slot.setdefault("total", r["line"])
    out = {}
    for gid, g in games.items():
        stamps = []
        for iso in sorted(g["by_stamp"]):
            slot = g["by_stamp"][iso]
            if "spread_home" in slot and "total" in slot:
                stamps.append((parse_ts(iso), iso, slot["spread_home"],
                               slot["total"]))
        stamps.sort()
        out[gid] = {"stamps": stamps, "rows": g["rows"]}
    return out


def load_aux_snapshots(oddsapi_path):
    """Summarize the keyed alt-ladder file as auxiliary single-stamp snapshots.

    The oddsapi capture is a single timestamp per game, so it cannot support
    path features; it is recorded as provenance only.
    Returns {game_id: [{"source": ..., "captured_at": ..., "rows": int,
                        "markets": [..]}]}
    """
    aux = {}
    if not oddsapi_path:
        return aux
    per = {}
    with open(oddsapi_path) as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            key = (r["gameId"], r["capturedAt"])
            slot = per.setdefault(key, {"source": r["source"], "rows": 0,
                                        "markets": set()})
            slot["rows"] += 1
            slot["markets"].add(r["market"])
    for (gid, iso), slot in sorted(per.items()):
        aux.setdefault(gid, []).append({
            "source": slot["source"],
            "captured_at": iso,
            "rows": slot["rows"],
            "markets": sorted(slot["markets"]),
            "note": "single-stamp snapshot; not used for path features",
        })
    return aux


def count_reversals(values):
    """Direction reversals in the first differences of a series.

    Zero differences are dropped before counting sign changes.
    """
    diffs = [values[i + 1] - values[i] for i in range(len(values) - 1)]
    signs = [(d > 0) - (d < 0) for d in diffs if d != 0]
    return sum(1 for i in range(1, len(signs)) if signs[i] != signs[i - 1])


def stabilization_index(values):
    """Earliest k such that all later values stay within the noise band of
    values[k]. Returns None for an empty series."""
    n = len(values)
    if n == 0:
        return None
    for k in range(n):
        if all(abs(values[j] - values[k]) <= NOISE_BAND_POINTS
               for j in range(k + 1, n)):
            return k
    return n - 1  # unreachable: last index always qualifies


def series_features(times, values, event_epoch):
    """Path features for one series over the analysis window.

    times/values are the window's stamps (already event-filtered by caller).
    event_epoch is None for games with no declared event.
    """
    n = len(values)
    feat = {
        "stamps_in_window": n,
        "first_value": values[0] if n else None,
        "last_value": values[-1] if n else None,
        "net_drift_points": None,
        "path_roughness_reversals": count_reversals(values) if n else None,
        "time_to_stabilization_minutes": None,
        "stabilization_stamp_index": None,
        "drift_after_60m": None,
    }
    if n == 0:
        feat["insufficient_data_reason"] = "no_stamps_in_window"
        return feat
    if n == 1:
        feat["insufficient_data_reason"] = "single_stamp_in_window"
        return feat
    feat["net_drift_points"] = round(values[-1] - values[0], 6)
    k = stabilization_index(values)
    feat["stabilization_stamp_index"] = k
    ref = event_epoch if event_epoch is not None else times[0]
    feat["time_to_stabilization_minutes"] = round((times[k] - ref) / 60.0, 3)
    feat["stabilized_at_first_window_stamp"] = (k == 0)
    if event_epoch is not None:
        feat["drift_after_60m"] = drift_after_60m(times, values, event_epoch)
    return feat


def drift_after_60m(times, values, event_epoch):
    """Flag: movement strictly beyond threshold occurring >60m after event.

    Reference value = the series value at the last stamp at or before
    event+60m. Late movement = max |value - reference| over stamps after
    event+60m. Returns None (with reason) when the comparison is
    unobservable (no stamp on either side of the 60m mark).
    """
    mark = event_epoch + DRIFT_AFTER_60M_MINUTES * 60
    ref_idx = None
    for i, t in enumerate(times):
        if t <= mark:
            ref_idx = i
    late = [i for i, t in enumerate(times) if t > mark]
    if ref_idx is None:
        return {"flag": None, "reason": "no_stamp_within_60m_of_event"}
    if not late:
        return {"flag": None, "reason": "no_stamps_after_60m_mark"}
    late_move = max(abs(values[i] - values[ref_idx]) for i in late)
    return {
        "flag": late_move > DRIFT_AFTER_60M_THRESHOLD_POINTS,
        "max_late_movement_points": round(late_move, 6),
        "reference_stamp_index": ref_idx,
    }


def extract_game(game_id, stamps, event, archive_name, archive_sha256,
                 aux_snapshots):
    """Build one feature row for a game.

    stamps: [(epoch, iso, spread_home, total), ...] sorted.
    event: dict with event_time_utc/kind/label/provenance/source, or None.
    """
    event_epoch = parse_ts(event["event_time_utc"]) if event else None
    if event_epoch is not None:
        window = [s for s in stamps if s[0] >= event_epoch]
    else:
        window = list(stamps)
    times = [s[0] for s in window]
    per_series = {}
    for idx, name in ((2, "spread_home"), (3, "total")):
        per_series[name] = series_features(
            times, [s[idx] for s in window], event_epoch)
    # Combined time-to-stabilization: both series stable -> max of the two.
    tts_vals = [per_series[nm]["time_to_stabilization_minutes"]
                for nm in SERIES_NAMES]
    combined_tts = (max(tts_vals)
                    if all(v is not None for v in tts_vals) else None)
    flags = [per_series[nm]["drift_after_60m"] for nm in SERIES_NAMES]
    known_flags = [f["flag"] for f in flags
                   if f is not None and f["flag"] is not None]
    combined = {
        "time_to_stabilization_minutes": combined_tts,
        "tts_reference": "event_time" if event_epoch is not None
                         else "window_first_stamp",
        "stabilized_at_first_window_stamp": all(
            per_series[nm].get("stabilized_at_first_window_stamp", False)
            for nm in SERIES_NAMES) if combined_tts is not None else None,
        "drift_after_60m_flag": (any(known_flags) if known_flags else None),
        "path_roughness_reversals_total": sum(
            per_series[nm]["path_roughness_reversals"] or 0
            for nm in SERIES_NAMES),
    }
    combined["tts_is_upper_bound"] = bool(
        combined["stabilized_at_first_window_stamp"])
    return {
        "game_id": game_id,
        "extractor": "archiver-pathshape",
        "extractor_version": PATHSHAPE_VERSION,
        "label": "DESCRIPTIVE",
        "weight": 0,
        "event": (None if event is None else {
            "event_time_utc": event["event_time_utc"],
            "kind": event["kind"],
            "label": event["label"],
            "provenance": event["provenance"],
            "source": event["source"],
        }),
        "window": {
            "first_stamp_utc": window[0][1] if window else None,
            "last_stamp_utc": window[-1][1] if window else None,
            "stamps_in_window": len(window),
            "stamps_total": len(stamps),
        },
        "series": per_series,
        "combined": combined,
        "provenance": {
            "archive_file": archive_name,
            "archive_sha256": archive_sha256,
            "archive_rows_for_game": None,  # filled by caller
            "stamps": [
                {"captured_at": s[1], "spread_home": s[2], "total": s[3]}
                for s in stamps
            ],
            "aux_snapshots": aux_snapshots,
        },
    }


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def extract(archive_path, oddsapi_path, events):
    """Run the extractor. events: {game_id: event-dict}."""
    games = load_archive_series(archive_path)
    aux = load_aux_snapshots(oddsapi_path)
    import os
    archive_name = os.path.basename(archive_path)
    sha = file_sha256(archive_path)
    rows = []
    for gid in sorted(games):
        row = extract_game(gid, games[gid]["stamps"], events.get(gid),
                           archive_name, sha, aux.get(gid, []))
        row["provenance"]["archive_rows_for_game"] = games[gid]["rows"]
        rows.append(row)
    return rows


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--archive", required=True,
                    help="main line archive JSONL (multi-stamp series)")
    ap.add_argument("--oddsapi", default=None,
                    help="keyed alt-ladder JSONL (aux provenance only)")
    ap.add_argument("--events", default=None,
                    help="events fixture JSON: {\"events\": [ {game_id, "
                         "event_time_utc, kind, label, provenance, source} ]}")
    ap.add_argument("--out", required=True, help="output JSONL path")
    args = ap.parse_args(argv)
    events = {}
    if args.events:
        with open(args.events) as fh:
            for ev in json.load(fh)["events"]:
                events[ev["game_id"]] = ev
    rows = extract(args.archive, args.oddsapi, events)
    with open(args.out, "w") as fh:
        for row in rows:
            fh.write(json.dumps(row, sort_keys=True) + "\n")
    print(f"wrote {len(rows)} rows to {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

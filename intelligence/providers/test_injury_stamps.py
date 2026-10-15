"""Tests for the injury feed stamp discipline (injury_stamps.py) and its
application at the source in the G-02 pull caller (pull_nfl_injuries.py).

Proves: rows are stamped at the source (reported_at from the payload's own
per-item date, pulled_at = the pull clock, source = the feed name); stamps
survive a JSON round-trip; a record missing stamps reads UNSTAMPED at every
time — never silently as current; reported_at alone never stamps a record;
the digest->report-row conversion carries stamps and never invents them;
the declared status mapping (Injured Reserve -> Out, raw preserved).

Run from intelligence/:  python3 -m pytest providers/test_injury_stamps.py -q
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import providers.injury_stamps as stamps  # noqa: E402
import providers.pull_nfl_injuries as caller  # noqa: E402

ET = ZoneInfo("America/New_York")

PAYLOAD = {
    "injuries": [
        {
            "team": {"abbreviation": "DEN", "displayName": "Denver Broncos"},
            "injuries": [
                {
                    "athlete": {"displayName": "Stamped Corner", "position": {"abbreviation": "CB"}},
                    "status": "Out",
                    "date": "2026-10-14",
                    "details": {"type": "Ankle", "side": "Right", "returnDate": "2026-11-01"},
                },
                {
                    "athlete": {"displayName": "Dateless Safety", "position": {"abbreviation": "S"}},
                    "status": "Injured Reserve",
                    # no "date": the source published no per-item date
                    "details": {"type": "Ankle"},
                },
            ],
        }
    ]
}


class FrozenDateTime(datetime):
    frozen: datetime | None = None

    @classmethod
    def now(cls, tz=None):
        assert cls.frozen is not None
        return cls.frozen if tz is None else cls.frozen.astimezone(tz)


def _digest_with_frozen_clock(monkeypatch, moment):
    FrozenDateTime.frozen = moment
    monkeypatch.setattr(caller, "datetime", FrozenDateTime)
    return caller.digest(PAYLOAD)


def test_digest_stamps_every_row_at_the_source(monkeypatch):
    d = _digest_with_frozen_clock(monkeypatch, datetime(2026, 10, 15, 11, 36, tzinfo=ET))
    rows = d["teams"][0]["injuries"]
    assert len(rows) == 2
    for r in rows:
        assert r["pulled_at"] == "2026-10-15T11:36:00-04:00"
        assert r["source"] == stamps.FEED_ESPN_NFL_INJURIES
        assert stamps.stamp_state(r) == "STAMPED"
    # reported_at comes from the payload's own per-item date when present
    assert rows[0]["reported_at"] == "2026-10-14"
    # ...and is honestly None when the source published none
    assert rows[1]["reported_at"] is None
    # pre-stamp fields are untouched (additive only)
    assert rows[0]["date"] == "2026-10-14" and rows[0]["status"] == "Out"


def test_digest_is_deterministic_under_one_pull_clock(monkeypatch):
    moment = datetime(2026, 10, 15, 11, 36, tzinfo=ET)
    assert _digest_with_frozen_clock(monkeypatch, moment) == _digest_with_frozen_clock(monkeypatch, moment)


def test_stamps_survive_json_round_trip(monkeypatch):
    d = _digest_with_frozen_clock(monkeypatch, datetime(2026, 10, 15, 11, 36, tzinfo=ET))
    back = json.loads(json.dumps(d))
    r = back["teams"][0]["injuries"][0]
    assert r["pulled_at"] == "2026-10-15T11:36:00-04:00"
    assert r["reported_at"] == "2026-10-14"
    assert stamps.stamp_state(r) == "STAMPED"
    assert stamps.status_as_of(r, "2026-10-15T12:00:00-04:00") == "Out"


def test_unstamped_record_reads_unstamped_at_every_time():
    legacy = {"athlete": "Old Row", "status": "Out", "date": "2026-10-14"}
    assert stamps.stamp_state(legacy) == "UNSTAMPED"
    # never silently as current: no time makes an unstamped record knowable
    assert stamps.status_as_of(legacy, "2026-10-14") is None
    assert stamps.status_as_of(legacy, "2027-01-01T00:00:00-05:00") is None


def test_reported_at_alone_never_stamps_a_record():
    r = {"status": "Out", "reported_at": "2026-10-01", "source": "espn-nfl-injuries"}
    assert stamps.stamp_state(r) == "UNSTAMPED"
    assert stamps.status_as_of(r, "2026-10-15") is None


def test_status_as_of_is_point_in_time():
    r = {"report_status": "Questionable", "pulled_at": "2026-10-15T11:36:00-04:00",
         "reported_at": "2026-10-15", "source": "espn-nfl-injuries"}
    assert stamps.status_as_of(r, "2026-10-15T11:35:00-04:00") is None  # before the pull
    assert stamps.status_as_of(r, "2026-10-15T11:36:00-04:00") == "Questionable"
    assert stamps.status_as_of(r, "2026-10-16T00:00:00-04:00") == "Questionable"


def test_status_mapping_is_declared_and_keeps_raw():
    assert stamps.map_report_status("Injured Reserve") == ("Out", "Injured Reserve")
    assert stamps.map_report_status("Questionable") == ("Questionable", "Questionable")
    assert stamps.map_report_status("Day-To-Day") == ("Day-To-Day", "Day-To-Day")  # unmapped passes through
    assert stamps.map_report_status(None) == ("", "")


def test_conversion_carries_stamps_and_never_invents_them(monkeypatch, tmp_path):
    d = _digest_with_frozen_clock(monkeypatch, datetime(2026, 10, 15, 11, 36, tzinfo=ET))
    doc = {"source": caller.ESPN_INJURIES_URL, "pulled_at": "2026-10-15T11:36:00-04:00",
           "week": 6, "teams": d["teams"]}
    rows = stamps.digest_to_report_rows(doc, season=2026)
    assert len(rows) == 2
    assert all(stamps.stamp_state(r) == "STAMPED" for r in rows)
    assert rows[0]["report_status"] == "Out" and rows[0]["team"] == "DEN" and rows[0]["week"] == 6
    assert rows[1]["report_status"] == "Out" and rows[1]["report_status_raw"] == "Injured Reserve"

    # a pre-stamp digest flattens to UNSTAMPED rows: conversion invents nothing
    legacy_doc = {"week": 6, "teams": [{"team": "DEN", "injuries": [
        {"athlete": "Old Row", "position": "CB", "status": "Out", "detail": "Ankle"}]}]}
    legacy_rows = stamps.digest_to_report_rows(legacy_doc, season=2026)
    assert legacy_rows[0]["pulled_at"] is None
    assert stamps.stamp_state(legacy_rows[0]) == "UNSTAMPED"

    # CSV round-trip keeps the stamp columns and values
    out = stamps.write_report_csv(rows, tmp_path / "rows.csv")
    text = out.read_text()
    assert "pulled_at" in text.splitlines()[0]
    assert "2026-10-15T11:36:00-04:00" in text

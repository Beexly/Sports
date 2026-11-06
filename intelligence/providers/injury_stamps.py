"""Injury record stamp discipline — the feed-level PIT contract.

WHY THIS EXISTS
---------------
Until 2026-10-15 the engine's injury feed carried NO per-record stamp. The
situational graph (intelligence/situational-graph) therefore honest-emptied
the whole `injury_burden` family for every game: without a stamp, a row
cannot be proven knowable before kickoff, and unstamped facts are never
silently treated as current (the fleet's fail-closed PIT discipline; the
walk-forward precedent is `ril_injury_after_kickoff`). The reasoning bridge
in turn minted no injury premise, even for games whose injury asymmetry was
the structural fact of the matchup.

This module is the stamp discipline every injury record in the feed now
carries. It is applied at the source — `pull_nfl_injuries.py` stamps each
digested row as it lands — and it defines how records are read back.

THE THREE FIELDS (additive; nothing pre-existing is renamed or removed)
-----------------------------------------------------------------------
reported_at : ISO date/datetime the SOURCE published the status, taken from
    the source payload's own per-item field when present (ESPN: the injury
    item's `date`). None when the source published no per-item date. This is
    provenance, NOT the PIT stamp: it says when the source spoke, not when
    we could have known it.
pulled_at   : ISO datetime OUR pull observed the record (the pull's clock,
    America/New_York at the G-02 caller). THIS is the PIT stamp of record:
    the earliest moment the engine can honestly claim to know the fact.
source      : the feed name (e.g. "espn-nfl-injuries"), not a URL. The URL
    lives on the pull document; the record names the feed it came through.

status_as_of(record, at) SEMANTICS
----------------------------------
The status knowable at time `at` is the record's status iff the record is
STAMPED (pulled_at present) and pulled_at <= at (ISO string comparison,
the same lexical discipline graph.py's visible_at uses). Otherwise the
record says NOTHING at `at` — status_as_of returns None. In particular:

  * A record missing stamps reads as UNSTAMPED at every time: never
    silently as current, never backdated by reported_at alone.
  * reported_at never substitutes for pulled_at. A source may have
    published on Monday; if our pull first observed it Thursday, the
    engine knows it Thursday.

BACKWARD COMPATIBILITY
----------------------
Stamping is additive. Legacy records (nflverse-shaped rows, unstamped
digests) parse and flow exactly as before; they simply carry stamp_state
UNSTAMPED, and stamp-aware consumers (the graph builder) keep
honest-emptying them byte-for-byte as they did before this module existed.

CONVERSION
----------
`digest_to_report_rows` flattens a stamped pull digest into the report-row
shape the graph builder eats (team / week / report_status / position /
full_name + the three stamp fields + source), and `write_report_csv` lands
it as CSV. Status normalization into the weekly-report vocabulary is a
DECLARED mapping (see STATUS_MAP): weekly reports designate players on
injured reserve as Out, so ESPN's "Injured Reserve" maps to "Out"; every
other status passes through title-cased and unmapped statuses keep weight
0.0 downstream, exactly as unknown statuses always have.

This module computes nothing about games. No probabilities, no scores, no
picks; it stamps facts. Emission state is untouched: ZERO_OBJECT.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

FEED_ESPN_NFL_INJURIES = "espn-nfl-injuries"

STAMP_FIELDS = ("reported_at", "pulled_at", "source")

# Declared status mapping into the weekly-report vocabulary the situational
# graph's injury_burden weight table keys on. Rationale for the one real
# mapping: a player on injured reserve is designated Out on the weekly
# report (he cannot play), so the feed records the report designation, and
# the raw source status is preserved alongside as report_status_raw.
STATUS_MAP = {
    "out": "Out",
    "questionable": "Questionable",
    "doubtful": "Doubtful",
    "probable": "Probable",
    "injured reserve": "Out",
}

REPORT_CSV_COLUMNS = [
    "season", "season_type", "game_type", "team", "week", "gsis_id",
    "position", "full_name", "report_primary_injury", "report_status",
    "report_status_raw", "reported_at", "pulled_at", "source",
]


def stamp_row(row: dict, *, reported_at, pulled_at, source) -> dict:
    """Return a copy of `row` carrying the three stamp fields.

    Pure: the caller supplies every value (the pull caller reads its own
    module clock, so tests that freeze that clock see identical stamps on
    every path). Never mutates the input.
    """
    out = dict(row)
    out["reported_at"] = reported_at
    out["pulled_at"] = pulled_at
    out["source"] = source
    return out


def stamp_state(record: dict) -> str:
    """'STAMPED' iff the record carries the PIT stamp of record (pulled_at).

    reported_at alone does NOT stamp a record: provenance is not
    knowability.
    """
    return "STAMPED" if record.get("pulled_at") else "UNSTAMPED"


def status_as_of(record: dict, at: str):
    """The record's status as knowable at ISO time `at`, or None.

    Knowable iff STAMPED and pulled_at <= at. UNSTAMPED records are
    knowable at no time — None for every `at`, never silently current.
    The status field name follows the record's own shape: report rows use
    `report_status`, digest rows use `status`.
    """
    pulled = record.get("pulled_at")
    if not pulled or pulled > at:
        return None
    if "report_status" in record:
        return record.get("report_status")
    return record.get("status")


def normalize_reported_at(value):
    """Normalize a source per-item date to an ISO string or None.

    Accepts 'YYYY-MM-DD' and full ISO datetimes; anything else (missing,
    empty, non-string) is None — the source published no usable date.
    """
    if not isinstance(value, str):
        return None
    v = value.strip()
    return v or None


def map_report_status(raw):
    """Map a source status into the weekly-report vocabulary (STATUS_MAP).

    Returns (report_status, report_status_raw). Unmapped statuses pass
    through stripped, verbatim — downstream weight tables give them 0.0,
    the same treatment unknown statuses have always had.
    """
    if raw is None:
        return "", ""
    raw = str(raw).strip()
    return STATUS_MAP.get(raw.lower(), raw), raw


def digest_to_report_rows(digest_doc: dict, *, season: int) -> list[dict]:
    """Flatten a stamped pull digest into graph-shaped report rows.

    Input is the G-02 caller's landed document: {source, pulled_at, week,
    teams: [{team, injuries: [rows]}]} where each row already carries
    reported_at / pulled_at / source from the pull (see stamp_row). Rows
    from a pre-stamp digest carry no stamps; they flatten with pulled_at
    None and therefore read UNSTAMPED downstream — the conversion never
    invents a stamp the pull did not make.
    """
    week = digest_doc.get("week")
    rows = []
    for team_block in digest_doc.get("teams", []):
        team = team_block.get("team")
        for item in team_block.get("injuries", []):
            status, status_raw = map_report_status(item.get("status"))
            rows.append({
                "season": season,
                "season_type": "REG",
                "game_type": "REG",
                "team": team,
                "week": week,
                "gsis_id": "",
                "position": item.get("position") or "",
                "full_name": item.get("athlete") or "",
                "report_primary_injury": item.get("detail") or "",
                "report_status": status,
                "report_status_raw": status_raw,
                "reported_at": item.get("reported_at"),
                "pulled_at": item.get("pulled_at"),
                # feed name only — never the document's source URL
                "source": item.get("source"),
            })
    return rows


def write_report_csv(rows: list[dict], out_path) -> Path:
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=REPORT_CSV_COLUMNS)
        w.writeheader()
        for r in rows:
            w.writerow({c: ("" if r.get(c) is None else r.get(c)) for c in REPORT_CSV_COLUMNS})
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        description="Convert a stamped injury pull digest to graph-shaped report CSV.")
    ap.add_argument("digest", help="espn_nfl_injuries_week<N>.json (stamped digest document)")
    ap.add_argument("--season", type=int, required=True)
    ap.add_argument("--out", required=True, help="output CSV path")
    args = ap.parse_args(argv)

    doc = json.loads(Path(args.digest).read_text(encoding="utf-8"))
    rows = digest_to_report_rows(doc, season=args.season)
    stamped = sum(1 for r in rows if stamp_state(r) == "STAMPED")
    write_report_csv(rows, args.out)
    print("wrote %s: %d rows (%d STAMPED, %d UNSTAMPED)"
          % (args.out, len(rows), stamped, len(rows) - stamped))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

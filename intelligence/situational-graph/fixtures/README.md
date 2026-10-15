# Situational graph fixtures — stamped injury feed

- `espn-injuries-sea-den-week06.fixture.json` — a **fixture** in the G-02
  pull caller's digest shape. Facts are the WORK ORDER 0 INPUT PACKET's
  SEA@DEN injury designations (Motif's ESPN pull, 2026-10-15); declared
  provenance lives in the file's `fixture_provenance` block. It is NOT
  live data and no pull was performed to make it.
- `injuries-sea-den-week06-stamped.csv` — the fixture converted to the
  graph builder's report shape by the feed converter:
  `python3 intelligence/providers/injury_stamps.py <fixture.json> --season 2026 --out <csv>`
  Every row carries `reported_at` / `pulled_at` / `source` per the stamp
  discipline in `intelligence/providers/injury_stamps.py`.

Used by `instances/2026-week06-sea-at-den-stamped.json` (the same game as
the v1 instance, with the injury family populated from these stamped rows)
and by `tests/test_injury_feed.py`.

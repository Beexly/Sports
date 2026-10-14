#!/usr/bin/env python3
"""nflverse release puller (CC-BY-4.0, cleared-with-attribution in packages/data-ingestion source-registry).
Datasets: injuries, snap_counts, depth_charts, players.  DIAGNOSTIC.

Each pull writes the raw CSV plus <name>.manifest.json {observed_at (UTC pull time), url, sha256,
license, rows_total, rows_accepted, rows_rejected, asof_field}.  Point-in-time field per row:
  injuries      -> date_modified (UTC); rows without it are REJECTED (cannot prove observed_at <= t)
  snap_counts   -> game_id (known only after that game; use for strictly prior games only)
  depth_charts  -> dt (2025+ schema) ; legacy (<=2024) rows carry no timestamp -> rows_asof_proven = 0
  players       -> crosswalk only (gsis_id <-> pfr_id), no as-of semantics
No imputation: missing required fields reject the row; a missing required COLUMN fails the pull."""
import csv, io, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _stamp import fetch, utcnow, sha256, FailClosed  # noqa: E402

BASE = "https://github.com/nflverse/nflverse-data/releases/download"
LICENSE = "nflverse/nflverse-data CC-BY-4.0 -- Data via nflverse (nflverse-data), licensed CC BY 4.0."
SPEC = {
    "injuries": {"req": ["season", "week", "team", "gsis_id", "position", "full_name", "report_status",
                          "practice_status", "report_primary_injury", "date_modified"],
                 "row_req": ["season", "week", "team", "gsis_id", "date_modified"], "asof": "date_modified"},
    "snap_counts": {"req": ["game_id", "season", "week", "pfr_player_id", "position", "team", "opponent",
                            "defense_snaps", "defense_pct"],
                    "row_req": ["game_id", "pfr_player_id", "team", "defense_pct"], "asof": "game_id (post-game)"},
    "depth_charts": {"req": [], "row_req": ["gsis_id"], "asof": "dt (2025+) else none"},
    "players": {"req": ["gsis_id", "pfr_id"], "row_req": ["gsis_id"], "asof": None},
}


def url_for(ds, season=None):
    return f"{BASE}/players/players.csv" if ds == "players" else f"{BASE}/{ds}/{ds}_{season}.csv"


def parse(ds, raw):
    rd = csv.DictReader(io.StringIO(raw.decode("utf-8")))
    cols = rd.fieldnames or []
    miss = [c for c in SPEC[ds]["req"] if c not in cols]
    if ds == "injuries" and miss == ["date_modified"]:
        pass  # seasons without the column: every row is rejected below (fail closed), pull still recorded
    elif miss:
        raise FailClosed(f"{ds}: required columns missing {miss}")
    acc, rej = [], 0
    for r in rd:
        if any(r.get(k) in (None, "", "NA") for k in SPEC[ds]["row_req"]):
            rej += 1; continue
        acc.append(r)
    return cols, acc, rej


def pull(ds, season, out_dir, raw=None):
    url = url_for(ds, season)
    obs = utcnow()
    raw = raw if raw is not None else fetch(url, timeout=120)
    cols, acc, rej = parse(ds, raw)
    name = "players" if ds == "players" else f"{ds}_{season}"
    os.makedirs(out_dir, exist_ok=True)
    open(os.path.join(out_dir, name + ".csv"), "wb").write(raw)
    asof_proven = len(acc)
    if ds == "depth_charts":
        asof_proven = sum(1 for r in acc if r.get("dt"))
    man = {"observed_at": obs, "url": url, "sha256": sha256(raw), "license": LICENSE, "dataset": ds,
           "season": season, "columns": cols, "rows_total": len(acc) + rej, "rows_accepted": len(acc),
           "rows_rejected": rej, "rows_asof_proven": asof_proven, "asof_field": SPEC[ds]["asof"],
           "label": "DIAGNOSTIC ingest artifact"}
    json.dump(man, open(os.path.join(out_dir, name + ".manifest.json"), "w"), indent=1)
    return man, acc


def write_sample(man, rows, sample_dir, k=25):
    os.makedirs(sample_dir, exist_ok=True)
    name = "players" if man["dataset"] == "players" else f"{man['dataset']}_{man['season']}"
    json.dump({**{k2: v for k2, v in man.items() if k2 != "columns"}, "sample_rows": rows[:k]},
              open(os.path.join(sample_dir, name + ".sample.json"), "w"), indent=1)


if __name__ == "__main__":
    ds = sys.argv[1]; seasons = [None] if ds == "players" else [int(x) for x in sys.argv[2].split(",")]
    out = os.environ.get("NFLVERSE_CACHE", "/workspace/nflverse_cache")
    for s in seasons:
        local = os.path.join(out, ("players" if ds == "players" else f"{ds}_{s}") + ".csv")
        raw = open(local, "rb").read() if os.environ.get("USE_CACHE") and os.path.exists(local) else None
        m, rows = pull(ds, s, out, raw)
        print(ds, s, "accepted", m["rows_accepted"], "rejected", m["rows_rejected"], "asof_proven", m["rows_asof_proven"])
        if os.environ.get("SAMPLE_DIR"):
            write_sample(m, rows, os.environ["SAMPLE_DIR"])

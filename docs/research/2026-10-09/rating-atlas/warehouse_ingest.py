#!/usr/bin/env python3
"""Point-in-time warehouse ingest — Phase 1, research.db (stdlib sqlite3).

Tables are append-only and keyed so a feature row is legal at decision time t
only if observed_at <= t:

    line_snapshots   (game_id, book, market, observed_at, ...)  Pinnacle trees
    prop_snapshots   (game_id, book, market, observed_at, ...)  DK board + PrizePicks
    injury_snapshots (game_id, book, observed_at, ...)          ESPN injuries

Leakage rule (the only join rule): observed_at <= decision time. The leakage
test shifts the decision time back ("kickoff moves forward" from the row's
point of view); any row stamped after the shifted time must disappear. The
test FAILS if a post-t row ever joins — fail closed.

Research only: no prediction is written here, no production schema is touched,
no live trading, no spend. Duplicates are ignored (INSERT OR IGNORE), so
re-ingesting the same pack is safe.

Commands:
    python3 warehouse_ingest.py ingest --snapshots-dir <dir> [--db research.db]
    python3 warehouse_ingest.py leaktest [--db research.db] [--snapshots-dir <dir>]
    python3 warehouse_ingest.py crps-baseline [--games data/gse-dataset/games.jsonl]
    python3 warehouse_ingest.py all --snapshots-dir <dir>
"""

import argparse
import csv
import datetime
import glob
import json
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB = os.path.join(HERE, "research.db")

SCALE_SD = 13.45          # margin ladder sd (production constant, unchanged)
TOTALS_SD = 13.19         # Pinnacle total sigma recovered in the 2026-10-10 pack
FROZEN_SEASON, FROZEN_WEEKS = 2025, range(1, 7)

DDL = """
CREATE TABLE IF NOT EXISTS line_snapshots (
    game_id TEXT NOT NULL,
    book TEXT NOT NULL,
    market TEXT NOT NULL,
    observed_at TEXT NOT NULL,
    price_home REAL,
    price_away REAL,
    line REAL,
    version INTEGER,
    cutoff_at TEXT,
    raw_key TEXT NOT NULL,
    source_file TEXT NOT NULL,
    PRIMARY KEY (game_id, book, market, observed_at, raw_key)
);
CREATE TABLE IF NOT EXISTS prop_snapshots (
    game_id TEXT NOT NULL,
    book TEXT NOT NULL,
    market TEXT NOT NULL,
    observed_at TEXT NOT NULL,
    player TEXT,
    player_id TEXT,
    side TEXT,
    line REAL,
    price_american INTEGER,
    stat_baseline REAL,
    raw_key TEXT NOT NULL,
    source_file TEXT NOT NULL,
    PRIMARY KEY (game_id, book, market, observed_at, raw_key)
);
CREATE TABLE IF NOT EXISTS injury_snapshots (
    observed_at TEXT NOT NULL,
    game_id TEXT,
    book TEXT NOT NULL,
    team TEXT,
    player TEXT,
    player_id TEXT,
    status TEXT,
    injury_type TEXT,
    return_date TEXT,
    comment TEXT,
    raw_key TEXT NOT NULL,
    source_file TEXT NOT NULL,
    PRIMARY KEY (observed_at, book, team, player_id, raw_key)
);
CREATE TABLE IF NOT EXISTS novig_snapshots (
    observed_at TEXT NOT NULL,
    market_id TEXT NOT NULL,
    book TEXT NOT NULL,
    market TEXT NOT NULL,
    league TEXT,
    market_type TEXT,
    contract_series TEXT,
    open REAL, high REAL, low REAL, close REAL, mid REAL,
    daily_volume REAL, open_interest REAL, status TEXT,
    raw_key TEXT NOT NULL,
    source_file TEXT NOT NULL,
    PRIMARY KEY (observed_at, market_id, market)
);
"""


def norm_ts(ts):
    """Normalize any timestamp to ISO-8601 UTC 'YYYY-MM-DDTHH:MM:SSZ' so TEXT
    ordering equals time ordering. ESPN emits '2026-10-10T01:19Z' (no seconds);
    PrizePicks emits offset-local times."""
    if ts is None:
        return None
    s = str(ts).strip().replace("Z", "+00:00")
    m = re.match(r"^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?", s)
    if not m:
        raise ValueError("unparseable timestamp: %r" % ts)
    hms = m.group(3) or ":00"
    dt = datetime.datetime.fromisoformat(m.group(1) + "T" + m.group(2) + hms + "+00:00")
    if "+00:00" not in s and re.search(r"[+-]\d{2}:\d{2}$", s):
        dt = datetime.datetime.fromisoformat(s)
    return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def file_observed_at(path):
    """Snapshot capture time = file mtime (UTC). The pack ships the capture
    time nowhere inside the Pinnacle filenames; mtime is the honest clock and
    is minute-precision. Documented in WAREHOUSE_SCHEMA.md."""
    return datetime.datetime.fromtimestamp(
        os.path.getmtime(path), datetime.timezone.utc
    ).strftime("%Y-%m-%dT%H:%M:%SZ")


def connect(db):
    con = sqlite3.connect(db)
    con.executescript(DDL)
    return con


# ---------------- parsers (pack formats, 2026-10-10) ----------------

def parse_pinnacle(path, con):
    observed = file_observed_at(path)
    try:
        data = json.load(open(path, encoding="utf-8"))
    except Exception:
        return 0
    if not isinstance(data, list):
        # 401/404 flake body ("No authorization token provided") — the pack's
        # known issue (3 of 17 tonight). Skipped; retry on the next cadence.
        return 0
    rows = []
    for m in data:
        if not isinstance(m, dict):
            continue
        prices = m.get("prices")
        pdict = {}
        if isinstance(prices, list):
            for p in prices:
                if isinstance(p, dict) and p.get("designation"):
                    pdict[p["designation"]] = p.get("price")
        key = m.get("key", "")
        line = None
        parts = key.split(";")
        if m.get("type") in ("spread", "total", "team_total") and len(parts) >= 5:
            try:
                line = float(parts[3])
            except ValueError:
                line = None
        rows.append((
            str(m.get("matchupId")), "pinnacle",
            "%s|%s|p%s" % (m.get("type"), key, m.get("period", 0)),
            observed, pdict.get("home"), pdict.get("away"), line,
            m.get("version"), norm_ts(m.get("cutoffAt")) if m.get("cutoffAt") else None,
            key, os.path.basename(path),
        ))
    con.executemany(
        "INSERT OR IGNORE INTO line_snapshots VALUES (?,?,?,?,?,?,?,?,?,?,?)", rows)
    return len(rows)


def parse_dk(path, con, observed=None):
    rows = []
    with open(path, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            rows.append((
                r.get("ev"), "dk", r.get("market"), observed, r.get("player"),
                r.get("playerId"), r.get("side"),
                float(r["points"]) if r.get("points") else None,
                int(r["american"]) if r.get("american") else None,
                float(r["statBaseline"]) if r.get("statBaseline") else None,
                "|".join([r.get("ev") or "", r.get("sub") or "", r.get("mktTypeId") or "",
                          r.get("side") or "", r.get("points") or "", r.get("american") or "",
                          r.get("statBaseline") or ""]),
                os.path.basename(path),
            ))
    con.executemany(
        "INSERT OR IGNORE INTO prop_snapshots VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", rows)
    return len(rows)


def parse_prizepicks(path, con):
    rows = []
    with open(path, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            rows.append((
                r.get("game_id"), "prizepicks", r.get("stat_name"),
                norm_ts(r.get("updated")), None, r.get("player_id"), r.get("wager_type"),
                float(r["line"]) if r.get("line") else None,
                None, None,
                "|".join([r.get("player_id") or "", r.get("stat_id") or "",
                          r.get("wager_type") or "", r.get("line") or "",
                          r.get("start") or ""]),
                os.path.basename(path),
            ))
    con.executemany(
        "INSERT OR IGNORE INTO prop_snapshots VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", rows)
    return len(rows)


def parse_injuries(path, con):
    d = json.load(open(path, encoding="utf-8"))
    rows = []
    for team in d.get("injuries", []):
        tname = team.get("displayName")
        for inj in team.get("injuries", []):
            athlete = inj.get("athlete", {}) or {}
            pid = athlete.get("id")
            if pid is None:
                for link in athlete.get("links", []) or []:
                    m = re.search(r"/id/(\d+)/", link.get("href", ""))
                    if m:
                        pid = m.group(1)
                        break
            details = inj.get("details", {}) or {}
            rows.append((
                norm_ts(inj.get("date") or d.get("timestamp")), None, "espn",
                tname, athlete.get("displayName"), str(pid) if pid else None,
                (inj.get("status") or {}).get("name") if isinstance(inj.get("status"), dict)
                else inj.get("status"),
                details.get("type"), details.get("returnDate"),
                (inj.get("shortComment") or "")[:400],
                str(inj.get("id")), os.path.basename(path),
            ))
    con.executemany(
        "INSERT OR IGNORE INTO injury_snapshots VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", rows)
    return len(rows)


def ingest(snapshots_dir, db=DEFAULT_DB):
    con = connect(db)
    counts = {}
    for path in sorted(glob.glob(os.path.join(snapshots_dir, "pinnacle_mkt_*.json"))):
        counts[path] = parse_pinnacle(path, con)
    for path in sorted(glob.glob(os.path.join(snapshots_dir, "dk_*props*.tsv")) +
                       glob.glob(os.path.join(snapshots_dir, "dk_*board*.tsv"))):
        stamp = re.search(r"(\d{4}-\d{2}-\d{2})", os.path.basename(path))
        observed = stamp.group(1) + "T23:59:59Z" if stamp else file_observed_at(path)
        counts[path] = parse_dk(path, con, observed=observed)
    for path in sorted(glob.glob(os.path.join(snapshots_dir, "prizepicks*nfl*.tsv"))):
        counts[path] = parse_prizepicks(path, con)
    for path in sorted(glob.glob(os.path.join(snapshots_dir, "espn_injuries*.json"))):
        counts[path] = parse_injuries(path, con)
    con.commit()
    summary = {
        "db": db,
        "files": {os.path.basename(k): v for k, v in counts.items()},
        "line_rows": con.execute("SELECT COUNT(*) FROM line_snapshots").fetchone()[0],
        "prop_rows": con.execute("SELECT COUNT(*) FROM prop_snapshots").fetchone()[0],
        "injury_rows": con.execute("SELECT COUNT(*) FROM injury_snapshots").fetchone()[0],
    }
    con.close()
    return summary


# ---------------- point-in-time join + leakage test (fail closed) ----------------

def rows_at(table, t, db=DEFAULT_DB, **eq):
    """Legal rows at decision time t: observed_at <= t ONLY. The WHERE clause is
    the join rule; anything stamped after t cannot pass it."""
    con = sqlite3.connect(db)
    q = "SELECT * FROM %s WHERE observed_at <= ?" % table
    args = [t]
    for k, v in eq.items():
        q += " AND %s = ?" % k
        args.append(v)
    out = con.execute(q, args).fetchall()
    con.close()
    return out


def leaktest(db=DEFAULT_DB, snapshots_dir=None):
    """Fails closed: if any post-t row joins at t, this raises.

    1. Synthetic: a row stamped strictly after t must never join; moving the
       decision time earlier must drop rows that were legal at the later t.
    2. Real pack: injury rows observed 2026-10-10 are legal at the Sunday
       cutoff (2026-10-11T13:30Z) and must vanish when the decision time is
       moved back to 2026-10-10T02:00:00Z."""
    con = connect(db)
    con.execute("INSERT OR IGNORE INTO line_snapshots VALUES "
                "('synthetic','test','ml|s;0;m|p0','2026-10-11T14:00:00Z',"
                "-110,-110,NULL,1,'2026-10-11T13:30:00Z','syn1','test')")
    con.commit()
    con.close()

    if rows_at("line_snapshots", "2026-10-11T13:30:00Z", db, book="test"):
        raise AssertionError("LEAK: a row stamped after t joined at t")
    if not rows_at("line_snapshots", "2026-10-11T15:00:00Z", db, book="test"):
        raise AssertionError("broken: a row stamped before t did not join at t")
    if rows_at("line_snapshots", "2026-10-11T13:00:00Z", db, book="test"):
        raise AssertionError("LEAK: row joined after the decision time moved earlier")
    con = sqlite3.connect(db)
    con.execute("DELETE FROM line_snapshots WHERE book='test'")
    con.commit()
    con.close()

    real = {"at_kickoff": None, "at_early": None}
    if snapshots_dir:
        ing = ingest(snapshots_dir, db)
        real["ingested"] = ing["line_rows"], ing["prop_rows"], ing["injury_rows"]
    kickoff = "2026-10-11T13:30:00Z"
    early = "2026-10-10T02:00:00Z"
    real["at_kickoff"] = len(rows_at("injury_snapshots", kickoff, db, book="espn"))
    real["at_early"] = len(rows_at("injury_snapshots", early, db, book="espn"))
    if real["at_early"] >= real["at_kickoff"] and real["at_kickoff"] > 0:
        raise AssertionError(
            "LEAK: moving the decision time earlier did not drop injury rows "
            "(at_kickoff=%d at_early=%d)" % (real["at_kickoff"], real["at_early"]))
    return {"synthetic": "pass", "real_pack": real}


# ---------------- Gaussian-close CRPS baseline (frozen week list) ----------------

# ---------------- Novig public CSV harvest (keyless, warehouse-compatible) ----------------

NOVIG_INDEX = "https://data.novig.com/reporting/trade-data/index.json"
NOVIG_BASE = "https://data.novig.com/reporting/trade-data"
NOVIG_SNAP = os.path.join(HERE, "snapshots", "novig")


def _http_get(url, dest, timeout=300):
    import urllib.request
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with urllib.request.urlopen(url, timeout=timeout) as r, open(dest, "wb") as f:
        f.write(r.read())
    return dest


def novig_harvest(date=None, db=DEFAULT_DB):
    """Keyless harvest of Novig's public daily trade-data reports.

    Downloads the latest published day's trades.csv (execution tape; recorded
    as a count + sample, the tape itself stays in snapshots/novig/) and
    markets.csv (per-market daily OHLC), parsed into append-only rows keyed
    (market_id, 'novig', ticker, observed_at) where observed_at = the trading
    day END (T23:59:59Z). Diagnostic price = OHLC mid (mean of open/high/low/
    close when all four print; else NULL). No de-vig: these are matched-trade
    pregame prices, not a two-sided book. No signed endpoint, no key, no spend.

    Fails CLEANLY when the requested day is not yet published (prints and
    returns instead of raising). Leakage rule unchanged: observed_at <= t.
    """
    import urllib.request
    os.makedirs(NOVIG_SNAP, exist_ok=True)
    try:
        with urllib.request.urlopen(NOVIG_INDEX, timeout=60) as r:
            index = json.load(r)
    except Exception as e:
        return {"status": "clean-fail", "reason": "index unreachable: %s" % e}
    days = index.get("dates") or []
    if not days:
        return {"status": "clean-fail", "reason": "index has no dates"}
    day = date or days[-1]
    if day not in days:
        return {"status": "clean-fail", "reason": "%s not published (latest %s)" % (day, days[-1])}
    markets_csv = _http_get("%s/%s/markets.csv" % (NOVIG_BASE, day),
                            os.path.join(NOVIG_SNAP, "markets_%s.csv" % day))
    trades_csv = _http_get("%s/%s/trades.csv" % (NOVIG_BASE, day),
                           os.path.join(NOVIG_SNAP, "trades_%s.csv" % day))
    observed_at = day + "T23:59:59Z"
    con = connect(db)
    rows, tape_n, tape_first = [], 0, None
    with open(trades_csv, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            tape_n += 1
            if tape_first is None:
                tape_first = {k: r.get(k) for k in ("timestamp", "marketId", "marketType", "cost")}
    # marketId -> league/marketType/contractSeries from the tape (first seen)
    meta = {}
    with open(trades_csv, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            mid = r.get("marketId")
            if mid and mid not in meta:
                meta[mid] = (r.get("league"), r.get("marketType"), r.get("contractSeries"))
    with open(markets_csv, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            def num(k):
                v = r.get(k)
                try:
                    return float(v) if v not in (None, "") else None
                except ValueError:
                    return None
            o, h, l, c = num("open"), num("high"), num("low"), num("close")
            mid = sum(v for v in (o, h, l, c) if v is not None) / \
                len([v for v in (o, h, l, c) if v is not None]) \
                if all(v is not None for v in (o, h, l, c)) else None
            lg, mt, cs = meta.get(r.get("marketId"), (None, None, None))
            rows.append((
                observed_at, r.get("marketId"), "novig", r.get("reportTicker"),
                lg, mt, cs, o, h, l, c, mid,
                num("dailyVolume"), num("openInterest"), r.get("status"),
                str(r.get("marketId")), os.path.basename(markets_csv),
            ))
    con.executemany(
        "INSERT OR IGNORE INTO novig_snapshots VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", rows)
    con.commit()
    total = con.execute("SELECT COUNT(*) FROM novig_snapshots").fetchone()[0]
    at_latest = con.execute(
        "SELECT COUNT(*) FROM novig_snapshots WHERE observed_at <= ?",
        (observed_at,)).fetchone()[0]
    con.close()
    if at_latest != total:
        raise AssertionError("LEAK: novig rows exist with observed_at > t")
    return {"status": "ok", "day": day, "observed_at": observed_at,
            "rows_this_day": len(rows), "novig_rows_total": total,
            "tape_rows": tape_n, "tape_first_row": tape_first,
            "markets_csv": os.path.basename(markets_csv),
            "trades_csv": os.path.basename(trades_csv)}


def crps_baseline(games_path, con=None):
    """Gaussian-close baseline on the FROZEN week list (2025 wks 1-6, settled,
    spread_line and total_line present). No model change: the close is the
    prediction. mu_margin = -listed (favorite negative). Margin sd = 13.45
    ladder; totals sd = 13.19 (Pinnacle total sigma from the pack)."""
    sys.path.insert(0, HERE)
    from engine_math import crps_gaussian

    rows = []
    with open(games_path, encoding="utf-8") as f:
        for line in f:
            g = json.loads(line)
            if (g.get("season") == FROZEN_SEASON and g.get("week") in FROZEN_WEEKS
                    and g.get("settled") and g.get("spread_line") is not None
                    and g.get("total_line") is not None):
                rows.append(g)
    margins, totals = [], []
    for g in rows:
        mu_m = -float(g["spread_line"])
        y_m = float(g["home_score"]) - float(g["away_score"])
        margins.append(crps_gaussian(mu_m, SCALE_SD, y_m))
        mu_t = float(g["total_line"])
        y_t = float(g["home_score"]) + float(g["away_score"])
        totals.append(crps_gaussian(mu_t, TOTALS_SD, y_t))
    out = {
        "frozen_list": "season %d weeks %d-%d, settled, both lines present" % (
            FROZEN_SEASON, FROZEN_WEEKS[0], FROZEN_WEEKS[-1]),
        "n_games": len(rows),
        "margin_crps_mean": round(sum(margins) / len(margins), 4) if margins else None,
        "margin_sd": SCALE_SD,
        "total_crps_mean": round(sum(totals) / len(totals), 4) if totals else None,
        "total_sd": TOTALS_SD,
        "definition": "CRPS of the Gaussian close (Gneiting closed form), "
                      "mean over the frozen list. The pack's bar 7.109 is its "
                      "production definition; this frozen list is the "
                      "checkout's honest reproduction, reported before any "
                      "model change.",
    }
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["ingest", "leaktest", "crps-baseline", "novig", "all"])
    ap.add_argument("--snapshots-dir", default=None)
    ap.add_argument("--db", default=DEFAULT_DB)
    ap.add_argument("--games", default=os.path.join(
        HERE, "..", "..", "..", "..", "data", "gse-dataset", "games.jsonl"))
    ap.add_argument("--date", default=None, help="Novig report day (YYYY-MM-DD); default latest published")
    a = ap.parse_args()
    if a.mode in ("ingest", "all"):
        if not a.snapshots_dir:
            ap.error("--snapshots-dir required for ingest/all")
        print(json.dumps(ingest(a.snapshots_dir, a.db), indent=1))
    if a.mode in ("leaktest", "all"):
        print(json.dumps(leaktest(a.db, a.snapshots_dir), indent=1))
    if a.mode in ("crps-baseline", "all"):
        print(json.dumps(crps_baseline(a.games), indent=1))
    if a.mode == "novig":
        print(json.dumps(novig_harvest(a.date, a.db), indent=1))


if __name__ == "__main__":
    main()
